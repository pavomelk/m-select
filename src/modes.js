/**
 * Input-mode definitions for the MSelect modes machine. Each factory returns
 * the shape `{name, onEntry?, onLeave?, handlers?}` handed to `Modes#define`:
 * the active mode's transition hooks own the DOM side-effects of a mode switch
 * and its `handlers` set processes input events routed by `Modes#processKey`.
 * Factories take the owning MSelect as their only argument so a mode's
 * behaviour lives close to the keys it answers, without adding a private
 * method per handler to the component class.
 */

const MODES = Object.freeze({
  FILTER: 'filter',
  CHIP: 'chip',
  COLLAPSED: 'collapsed',
  DROPDOWN: 'dropdown',
});

/**
 * Number of Items PageDown/PageUp move by within the marker's own level. A
 * fixed approximation until the DropDown exposes viewport metrics.
 * @private
 */
const PAGE_SIZE = 10;

const setDisplaySelected = (control, value) => {
  control.selectionBox.filter.displaySelected = value;
};

const enableCaret = (control) => {
  control.selectionBox.filter.setCaretState({ editable: true });
};

const hideCaret = (control) => {
  control.selectionBox.filter.setCaretState({ editable: false });
};

/** Escape is a universal cancel key: it dismisses the DropDown in every mode. */
const closeDropDown = (control) => {
  control.dropDown.open = false;
  return true;
};

/**
 * Default mode: typing in the Filter narrows the visible Items. Entering it
 * restores the caret; leaving it hides the caret so the input stays a single
 * Tab stop. The input never loses focus on a mode switch — the Filter keeps
 * the focus for the whole session, only its editability toggles.
 *
 * - ArrowLeft is the entry into chip navigation: with the Filter empty and
 *   Chips present it switches to Chip mode with the rightmost Chip marked
 *   Current (or to Collapsed mode with the Collapsed Chip marked Current when
 *   the selection is collapsed). In every other case the key is left to the
 * - ArrowDown enters DropDown mode, marking the first visible Item Current
 *   when no marker is set: a closed DropDown opens first; an already-open
 *   DropDown without a marker (the mouse-open path) gets one here, so list
 *   navigation starts on the very first ArrowDown. An existing marker is
 *   left as-is.
 *
 * - Backspace behaves like text-editing insert mode and only takes over when
 *   the caret sits at the text's leftmost position (nothing left to delete in
 *   the Filter): it then unselects the rightmost Chip, staying in Filter mode.
 *   Anywhere else it is passed down to the input's default text editing.
 *
 * - Escape closes the DropDown.
 *
 * - The "Current" marker never survives a transition here: entering Filter
 *   mode clears it, so a return from DropDown/Chip/Collapsed (or a
 *   normalize-mode fallback) never leaves a Chip or Item looking Current.
 *
 * @param {import('./m-select.js').MSelect} control
 */
export function filterMode(control) {
  return {
    onEntry: () => {
      enableCaret(control);
      setDisplaySelected(control, false);
      control.dropDown.clearCurrent();
    },
    onLeave: () => {
      hideCaret(control);
    },
    handlers: {
      ArrowDown: () => {
        const dd = control.dropDown;
        if (!dd.open) {
          const first = control.navigableTopLevel[0];
          if (first) dd.setCurrent(first);
          dd.open = true;
        } else if (!dd.currentItem) {
          const first = control.navigableTopLevel[0];
          if (first) dd.setCurrent(first);
        }
        control.switchMode(MODES.DROPDOWN);
        return true;
      },
      ArrowLeft: () => {
        if (control.selectionBox.filter.query !== '') return false;
        const chips = control.orderedChips();
        if (chips.length === 0) return false;
        if (control.selectionBox.isCollapsed) {
          control.switchMode(MODES.COLLAPSED);
        } else {
          control.dropDown.setCurrent(chips[chips.length - 1]);
          control.switchMode(MODES.CHIP);
        }
        return true;
      },
      Backspace: () => {
        const caret =
          control.selectionBox.filter.el.selectionStart ??
          control.selectionBox.filter.query.length;
        if (caret !== 0) return false;
        const chips = control.orderedChips();
        if (chips.length === 0) return false;
        control.unselectItem(chips[chips.length - 1]);
        return true;
      },
      Escape: () => closeDropDown(control),
    },
  };
}

/**
 * DropDown mode: navigating the Items list of the open DropDown. Movement is
 * one structural walk in document order over the rendered, togglable Items and
 * does not consult layout. Each level is walked by the axis its own flow names -
 * ArrowUp/ArrowDown on a column, ArrowLeft/ArrowRight on a row - and the other
 * pair changes depth, so a Group is opened at its first navigable child by either
 * pair and anything else steps out to the parent's next sibling. Which pair a key
 * belongs to is read from the level the marker stands on, so no arrow carries a
 * rule of its own. Reaching the edge of a level needs no rule of its own - the
 * walk falls to the parent and out of it from there. A key with
 * no target keeps the marker and is still consumed. With no Current Item yet,
 * ArrowDown starts at the first top-level Item and ArrowUp at the last;
 * Home/End and the page steps move within the marker's own level rather than
 * over a flattened tree. SpaceBar toggles the Current Item's selection and stays
 * in DropDown mode; Enter commits the choice — it toggles the Current Item,
 * closes the DropDown and returns to the mode active before it (see
 * MSelect#changeToPrevious). With no Current Item both keys toggle nothing and
 * are still consumed. Escape closes the DropDown without a toggle, returning to
 * the previous mode as well. This mode holds no state of its own: whether the
 * selection stays shown as the summary chip is MSelect#holdsCollapse, which is
 * true for the DropDown entered from Collapsed mode and false for one entered
 * from Chip or Filter mode.
 * @param {import('./m-select.js').MSelect} control
 */
export function dropdownMode(control) {
  /** @private Marks `item` Current; a `null` target leaves the marker in place. */
  const moveTo = (item) => {
    if (item) control.dropDown.setCurrent(item);
    return true;
  };

  /**
   * @private The Items the marker moves within for Home/End and paging: the
   * row or column it currently stands in, or the top level before it exists.
   */
  const levelList = () => {
    const current = control.dropDown.currentItem;
    return current ? current.navigableSiblings : control.navigableTopLevel;
  };

  /**
   * @private Which arrow key plays which role on a level. The pair along the
   * level's flow walks it, the pair across it leaves it: a column is walked with
   * ArrowUp/ArrowDown and left with ArrowLeft/ArrowRight, a row swaps the two
   * pairs. The operations behind the roles are the same either way, so the
   * layout picks the axis a key drives and never what a movement means.
   */
  const AXES = {
    // Each level is walked by the axis its own flow names; the other pair is the
    // one that changes depth. Which pair is which depends on the level, never on
    // the key, so no arrow key carries a rule of its own.
    column: { ArrowDown: 'walk', ArrowUp: 'back', ArrowRight: 'deeper', ArrowLeft: 'out' },
    row: { ArrowRight: 'walk', ArrowLeft: 'back', ArrowDown: 'deeper', ArrowUp: 'out' },
  };

  /** @private What each role does to the Item it is pressed on. */
  const MOVES = {
    // Along the level's own axis. A column Item's children sit on that axis, so
    // stepping forward can open a Group; a row Item's children sit off it, so
    // the same key only ever moves between the members of the row.
    walk: (item) => (item.inRow ? item.nextInLevel() : item.next()),
    back: (item) => item.previous(),
    // Across it. A Group is opened at its first navigable child, and anything
    // else steps out to the parent's next sibling.
    deeper: (item) => item.descend() ?? item.parentNext(),
    out: (item) => item.parentItem,
  };

  /** @private The roles that walk a level, and so can start a marker with none set. */
  const STARTS = new Set(['walk', 'back']);

  /**
   * @private The role `key` plays on the level `item` stands in, or `null` when
   * it is not one of the four arrows.
   */
  const roleOf = (item, key) => AXES[item.inRow ? 'row' : 'column'][key] ?? null;

  /**
   * @private All four arrows as one movement: the key is read as a role on the
   * marker's own level, and the role decides the target. The Item answers with
   * its next/previous in document order or with the Item outside its level, so
   * no key carries a rule of its own and no arrow can be aimed anywhere the
   * Item structure does not support.
   *
   * The keys are consumed wherever a marker exists — the Filter is not editable
   * in DropDown mode, so there is no caret to hand them back to — and a key with
   * no target leaves the marker in place. With no marker yet there is no level
   * to leave, so only the walking keys start one, at the first and last
   * navigable top-level Item.
   */
  const move = (e) => {
    const key = e?.key;
    const current = control.dropDown.currentItem;
    if (!current) {
      const list = control.navigableTopLevel;
      if (list.length === 0) return true;
      const role = roleOf(list[0], key);
      if (!STARTS.has(role)) return false;
      return moveTo(role === 'back' ? list[list.length - 1] : list[0]);
    }
    const role = roleOf(current, key);
    return role ? moveTo(MOVES[role](current)) : false;
  };

  /** @private Marks the Item at `index` of `list` Current, clamping the ends. */
  const moveToIndex = (list, index) => {
    if (list.length === 0) return true;
    control.dropDown.setCurrent(list[Math.min(Math.max(index, 0), list.length - 1)]);
    return true;
  };

  /** @private Paging by a fixed number of Items within the marker's own level. */
  const step = (delta) => {
    const list = levelList();
    const index = list.indexOf(control.dropDown.currentItem);
    const from = index < 0 ? (delta > 0 ? -1 : list.length) : index;
    return moveToIndex(list, from + delta);
  };

  return {
    handlers: {
      Escape: () => {
        control.dropDown.open = false;
        control.changeToPrevious();
        return true;
      },
      ArrowDown: move,
      ArrowUp: move,
      ArrowRight: move,
      ArrowLeft: move,
      PageDown: () => step(PAGE_SIZE),
      PageUp: () => step(-PAGE_SIZE),
      Home: () => moveToIndex(levelList(), 0),
      End: () => moveToIndex(levelList(), Number.MAX_SAFE_INTEGER),
      Enter: () => {
        const current = control.dropDown.currentItem;
        if (current) current.toggle();
        control.dropDown.open = false;
        control.changeToPrevious();
        return true;
      },
      ' ': () => {
        const current = control.dropDown.currentItem;
        if (current) current.toggle();
        return true;
      },
    },
  };
}

/**
 * Chip mode: navigating the Chips of the selection box with the same key
 * semantics as text-editing insert mode. ArrowLeft/ArrowRight move the Current
 * marker between Chips (ArrowLeft on the leftmost Chip is ignored); ArrowRight
 * on the rightmost Chip hands control back to the default Filter mode and
 * clears the Current marker. Home/End jump the marker to the first/last Chip.
 * Delete unselects the Current Chip, Backspace unselects the Chip left of the
 * Current one. With no Chips left the mode falls back to Filter (see
 * MSelect#normalizeMode). ArrowDown opens the DropDown, scrolling the Current
 * Item into view while staying in Chip mode; a repeated ArrowDown, with the
 * DropDown already open, moves on to DropDown mode and leaves that Current
 * Item in place, so the list continues from the Chip it came from.
 * @param {import('./m-select.js').MSelect} control
 */
export function chipMode(control) {
  const currentIndex = () => {
    const current = control.dropDown.currentItem;
    if (!current) return -1;
    return control.orderedChips().indexOf(current);
  };

  return {
    handlers: {
      ArrowLeft: () => {
        const index = currentIndex();
        if (index <= 0) return true;
        control.dropDown.setCurrent(control.orderedChips()[index - 1]);
        return true;
      },
      ArrowRight: () => {
        const list = control.orderedChips();
        const index = currentIndex();
        if (index < 0) return true;
        if (index >= list.length - 1) {
          control.dropDown.clearCurrent();
          control.switchMode(MODES.FILTER);
          return true;
        }
        control.dropDown.setCurrent(list[index + 1]);
        return true;
      },
      Delete: () => {
        const index = currentIndex();
        if (index < 0) return true;
        control.unselectItem(control.orderedChips()[index]);
        return true;
      },
      Backspace: () => {
        const list = control.orderedChips();
        const index = currentIndex();
        if (index <= 0) return true;
        control.unselectItem(list[index - 1]);
        return true;
      },
      Home: () => {
        const list = control.orderedChips();
        if (list.length === 0) return true;
        control.dropDown.setCurrent(list[0]);
        return true;
      },
      End: () => {
        const list = control.orderedChips();
        if (list.length === 0) return true;
        control.dropDown.setCurrent(list[list.length - 1]);
        return true;
      },
      ArrowDown: () => {
        if (control.dropDown.open) {
          control.switchMode(MODES.DROPDOWN);
        } else {
          control.dropDown.open = true;
        }
        return true;
      },
      Escape: () => closeDropDown(control),
    },
  };
}

/**
 * Collapsed mode: navigating the selected Items while only they are shown.
 * Entering it restricts the DropDown to selected Items and marks the Collapsed
 * Chip Current; leaving it unmarks the chip, so the chip only looks selected
 * while Collapsed mode is active. The restriction itself is not dropped on
 * leaving: Filter mode's entry hook is its single owner, so that a handover to
 * DropDown mode keeps the selected Items listed and navigable. The collapse is
 * held too, but by no code here — MSelect#holdsCollapse is what decides, and it
 * stays true for the DropDown this mode hands over to. ArrowRight exits to the
 * default Filter mode. ArrowDown opens the DropDown, and a repeated ArrowDown
 * moves on to DropDown mode with the DropDown still restricted to the selected
 * Items, so that list is navigable.
 * @param {import('./m-select.js').MSelect} control
 */
export function collapsedMode(control) {
  return {
    onEntry: () => {
      setDisplaySelected(control, true);
      if (control.selectionBox.collapsedChip) {
        control.selectionBox.collapsedChip.current = true;
      }
    },
    onLeave: () => {
      if (control.selectionBox.collapsedChip) {
        control.selectionBox.collapsedChip.current = false;
      }
    },
    handlers: {
      Escape: () => closeDropDown(control),
      ArrowRight: () => {
        control.switchMode(MODES.FILTER);
        return true;
      },
      ArrowDown: () => {
        // The restriction survives the switch on its own — only Filter mode's
        // entry hook drops it — so DropDown mode is entered with the selected
        // Items still listed.
        if (control.dropDown.open) {
          control.switchMode(MODES.DROPDOWN);
        } else {
          control.dropDown.open = true;
        }
        return true;
      },
    },
  };
}

export { MODES };