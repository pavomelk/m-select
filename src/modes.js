/**
 * Input-mode definitions for the MSelect modes machine. Each factory returns the
 * shape `{name, onEntry?, onLeave?, onDropDownLeave?, handlers?}` handed to
 * `Modes#define`: the active mode's transition hooks own the DOM side-effects of
 * a mode switch, its `handlers` set processes input events routed by
 * `Modes#processKey`, and `onDropDownLeave` says how a DropDown the mode opened
 * hands the keyboard back when the closing key means something other than
 * returning as it was.
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
 * Returned by a handler that switched the mode and wants the same key processed
 * again by the new mode's handler. `Modes#processKey` re-reads the handler once
 * after this, so a key can be owned by the mode it hands over to without the two
 * handlers duplicating each other's rule.
 * @private
 */
export const REDISPATCH = Symbol('redispatch');

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
  // Return focus to the filter input so Tab/Escape doesn't leave focus stranded elsewhere
  try {
    control.selectionBox?.filter?.el?.focus?.();
  } catch (e) {}
  return true;
};

/**
 * Marks the first navigable Item Current when the DropDown has none. The
 * navigable top-level Items are read from the list as it stands, so an Item
 * restricted out of it by the selected-only filter is skipped and the marker
 * starts on the first one the user can see.
 * @param {import('./m-select.js').MSelect} control
 */
const startMarker = (control) => {
  if (control.dropDown.currentItem) return;
  const first = control.navigableTopLevel[0];
  if (first) control.dropDown.setCurrent(first);
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
 *   input's default text-caret navigation.
 *
 * - ArrowDown enters DropDown mode and hands the same press to that mode's own
 *   ArrowDown handler: a closed DropDown opens first, and the marker is taken
 *   from where the list stands — started on the first visible Item when none is
 *   set, moved on to the next one when a re-filter left one standing. The first
 *   ArrowDown therefore does what every later one does, instead of marking an
 *   Item and asking for a second press to step off it.
 *
 * - Enter likewise hands the same press to DropDown mode's Enter handler: it
 *   toggles the Current Item when there is one, closes the DropDown and returns
 *   to Filter mode. With no Current Item it selects nothing and still closes;
 *   the key is always consumed, so it cannot submit an enclosing form.
 *
 * - Backspace behaves like text-editing insert mode and only takes over when
 *   the caret sits at the text's leftmost position (nothing left to delete in
 *   the Filter): it then unselects the rightmost Chip, staying in Filter mode.
 *   With the selection collapsed there is no rightmost Chip to name, so it
 *   unselects every selected Item instead. Anywhere else it is passed down to
 *   the input's default text editing.
 *
 * - Escape is a two-step cancel. With the Drop Down open the press closes it
 *   and nothing else — a query the user wants to keep is kept, because they may
 *   only want the list out of the way. With it already closed the press clears
 *   the query (`''`), which re-filters the hidden list back to the unfiltered
 *   one and re-homes the marker by the query rule (REQ-3.11-19); a query that
 *   is already empty leaves the marker alone. The Drop Down is never opened by
 *   the key, and the text is cleared through `Filter#query`, so the input's
 *   value, the list and the marker cannot disagree.
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
        control.dropDown.open = true;
        control.switchMode(MODES.DROPDOWN);
        return REDISPATCH;
      },
      Enter: () => {
        control.switchMode(MODES.DROPDOWN);
        return REDISPATCH;
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
        // A collapsed selection has no rightmost Chip of its own to single out:
        // the summary Chip stands for all of it, so the key removes the summary
        // Chip, and a Chip that stands for the selection is removed as a whole.
        if (control.selectionBox.isCollapsed) {
          control.clearAll();
          return true;
        }
        const chips = control.orderedChips();
        if (chips.length === 0) return false;
        control.unselectItem(chips[chips.length - 1]);
        return true;
      },
      Escape: () => {
        // The list's cancel comes first: while the Drop Down is open the press
        // belongs to it, so the query survives for the next press.
        if (!control.dropDown.open) {
          const filter = control.selectionBox.filter;
          if (filter.query !== '') filter.query = '';
        }
        return closeDropDown(control);
      },
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
 * closes the DropDown and hands back to the mode it was entered from, which for
 * a DropDown entered from Collapsed mode means Chip mode once the toggle has
 * brought the count back within maxVisibleChips (see MSelect#leaveDropDown).
 * With no Current Item both keys toggle nothing and are still consumed. Escape
 * closes the DropDown without a toggle and hands back the same way, to Filter
 * mode from a Collapsed origin. This mode holds no state of its own: whether the
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
        control.leaveDropDown('Escape');
        return true;
      },
      /**
       * Tab is the browser's own focus walk. The Filter is the component's single
       * Tab stop and keeps the focus for the whole session (REQ-3.11-01,
       * REQ-3.11-03), so while the keyboard is navigating the list a Tab would
       * walk the page out from under the navigation and strand the interaction.
       * The key is consumed instead, in both directions, and the focus stays on
       * the Filter where it already is - nothing is moved, so there is nothing to
       * move back. Leaving the list is Escape's and Enter's job (REQ-3.11-11,
       * REQ-3.11-18), and away from this mode Tab still leaves the control as a
       * single Tab stop promises.
       */
      Tab: () => true,
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
        if (control.selectionBox?.filter) {
          control.selectionBox.filter.query = '';
        }
        control.leaveDropDown('Enter');
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
 * stays true for the DropDown this mode hands over to. This origin also hands
 * over a Current marker, started on the first navigable Item of the restricted
 * list, since the Collapsed Chip carries an Item of no value to bring one.
 * ArrowRight exits to the default Filter mode. Delete and Backspace unselect
 * every selected Item, for the reason the key list above gives, and the emptied
 * box leaves through Filter mode by way of MSelect#normalizeMode. ArrowDown opens
 * the DropDown,
 * and a repeated ArrowDown moves on to DropDown mode with the DropDown still
 * restricted to the selected Items, so that list is navigable. Escape and Enter
 * in that DropDown do not come back here; `onDropDownLeave` below says where they
 * go instead, which is this mode's own business and no other origin's.
 * @param {import('./m-select.js').MSelect} control
 */
export function collapsedMode(control) {
  // The Collapsed Chip stands for the selection as a whole, so the keys that
  // remove a Chip remove all of it here. Backspace is Chip mode's key for the Chip
  // left of the marker; with one Chip standing for everything that is the same
  // Chip, so both keys answer alike rather than one of them doing nothing.
  const removeCollapsed = () => {
    control.clearAll();
    return true;
  };

  return {
    onEntry: () => {
      setDisplaySelected(control, true);
      // The Collapsed Chip is what carries "Current" here, so the marker the
      // closed list left on an Item is dropped rather than remembered: two marks
      // at once would show both as current, and a later ArrowDown re-seeds the
      // marker on the first navigable Item of the restricted list anyway.
      control.dropDown.clearCurrent();
      if (control.selectionBox.collapsedChip) {
        control.selectionBox.collapsedChip.current = true;
      }
    },
    onLeave: () => {
      if (control.selectionBox.collapsedChip) {
        control.selectionBox.collapsedChip.current = false;
      }
    },
    /**
     * How this mode is left by the DropDown it handed the keyboard to. It is
     * registered here rather than branched on at the closing key, because it is
     * this origin's rule and belongs beside the rest of its behaviour. No other
     * origin has one: a DropDown opened from Filter or Chip mode returns there as
     * it was, marker and all.
     *
     * - `Escape` drops to Filter mode instead of coming back here. Escape commits
     *   nothing, and the restriction exists only so a selection the Collapsed Chip
     *   hides stays navigable, which a DropDown on its way out no longer needs —
     *   Filter's entry hook drops the restriction and clears the marker.
     * - `Enter` toggles, and the box is then judged on what the toggle left
     *   behind. While the count is still above `maxVisibleChips` the collapse
     *   still holds, so there are no Chips to navigate and the mark goes back to
     *   the Collapsed Chip; once within the limit the box has expanded, so Chip
     *   mode takes over instead, the Collapsed Chip having nothing left to stand
     *   for. Either way the "Current" Chip is the Chip rule's to answer, never a
     *   second rule of its own.
     */
    onDropDownLeave: (key) => {
      if (key === 'Escape') {
        control.switchMode(MODES.FILTER);
        return;
      }
      if (control.selectionBox.withinChipLimit) {
        // Switch first: the collapse is held by `holdsCollapse`, which the mode
        // switch releases, so `render` has to come after it to see the box expand.
        const marker = control.dropDown.currentItem;
        control.switchMode(MODES.CHIP);
        control.selectionBox.render();
        // A toggled Group Item owns no Chip, so the marker the toggle left it on
        // can stand on an Item Chip mode has nothing to move between. The Chip
        // rule answers for it, as it did for the Chip it was elected from.
        if (marker && !control.orderedChips().includes(marker)) {
          control.selectionBox.electChipAfter(marker);
        }
        return;
      }
      control.switchMode(MODES.COLLAPSED);
    },
    handlers: {
      Delete: () => removeCollapsed(),
      Backspace: () => removeCollapsed(),
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
          // The handover press. Unlike the other two origins there is no Item to
          // carry the marker in from, so it is started here, on the first
          // navigable Item of the restricted list — without it DropDown mode
          // would have nothing for Space and Enter to act on.
          startMarker(control);
          control.switchMode(MODES.DROPDOWN);
        } else {
          // The opening press. It only reveals the list, and the Collapsed Chip
          // stays the sole Current while the mode is still Collapsed, so the
          // marker is deliberately left unstarted until the handover.
          control.dropDown.open = true;
        }
        return true;
      },
    },
  };
}

export { MODES };