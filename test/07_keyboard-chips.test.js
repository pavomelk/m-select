import { describe, expect, it, vi } from 'vitest';
import './teardown.js';
import { MSelect, Item, Filter, MSELECT_INTERNALS } from '../src/m-select.js';

/**
 * Behavioural spec for m-select — the keyboard inside the Selection Box.
 *
 * Areas 22-29: moving between Filter and Chip mode, walking the Chips,
 * deleting them, Home/End, and the keys that open and close the list.
 */

describe('1. MSelect — Keyboard over the Chips', () => {
  describe('22. Keyboard - ArrowLeft from Filter mode into the Chips', () => {
    const setup = (options) => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
        ],
        options,
      });
    };
    const modes = (control) => control[MSELECT_INTERNALS].modes;
    const keydown = (element, key) => {
      const preventDefaultCalled = { value: false };
      element.dispatchEvent({
        type: 'keydown',
        key,
        preventDefault() {
          preventDefaultCalled.value = true;
        },
      });
      return preventDefaultCalled;
    };

    it('1.22.1 with text in the Filter, ArrowLeft is passed down to the input (default text navigation, no mode switch)', () => {
      const control = setup();
      control.selectionBox.filter.query = 'a';
      control.items[0].toggle(true);

      const handled = keydown(control.selectionBox.filter.el, 'ArrowLeft');

      expect(handled.value).toBe(false);
      expect(modes(control).mode).toBe('filter');
    });

    it('1.22.2 with an empty Filter and individual Chips present, ArrowLeft switches to Chip mode and marks the rightmost Chip Current', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      expect(control.selectionBox.isCollapsed).toBe(false);

      keydown(control.selectionBox.filter.el, 'ArrowLeft');

      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(control.items[1].chipView.classList.contains('cm-chip--current')).toBe(true);
      expect(control.items[0].chipView.classList.contains('cm-chip--current')).toBe(false);
    });

    it('1.22.3 with an empty Filter and no Chips at all, ArrowLeft is passed down to the input', () => {
      const control = setup();
      expect(control.selectedItems).toHaveLength(0);

      const handled = keydown(control.selectionBox.filter.el, 'ArrowLeft');

      expect(handled.value).toBe(false);
      expect(modes(control).mode).toBe('filter');
    });

    it('1.22.4 with the Chips collapsed, ArrowLeft on the empty Filter switches to Collapsed mode and marks the Collapsed Chip Current', () => {
      const control = setup({ maxVisibleChips: 1 });
      for (const item of [...control.items]) item.toggle(true);
      expect(control.selectionBox.isCollapsed).toBe(true);

      keydown(control.selectionBox.filter.el, 'ArrowLeft');

      expect(modes(control).mode).toBe('collapsed');
      expect(control.selectionBox.collapsedChip.current).toBe(true);
      expect(
        control.selectionBox.collapsedChip.chipView.classList.contains('cm-chip--current')
      ).toBe(true);
    });

    it('1.22.5 hovering the caret over text keeps text navigation: ArrowLeft with text and no selection is passed down', () => {
      const control = setup();
      control.selectionBox.filter.query = 'a';

      const handled = keydown(control.selectionBox.filter.el, 'ArrowLeft');

      expect(handled.value).toBe(false);
      expect(modes(control).mode).toBe('filter');
    });
  });

  // requires: chipMode ArrowRight (rightmost chip hands back to Filter),
  // clearCurrent clearing the Current marker on Item and Chip view
  describe('23. Keyboard - ArrowRight from Chip mode back to the Filter', () => {
    const setup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
        ],
      });
    };
    const modes = (control) => control[MSELECT_INTERNALS].modes;
    const keydown = (element, key) => {
      const preventDefaultCalled = { value: false };
      element.dispatchEvent({
        type: 'keydown',
        key,
        preventDefault() {
          preventDefaultCalled.value = true;
        },
      });
      return preventDefaultCalled;
    };
    const enterChipMode = (control) => {
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
    };

    it('1.23.1 ArrowRight with the rightmost Chip Current exits to Filter mode and clears the Current marker on the Item and its Chip view', () => {
      const control = setup();
      enterChipMode(control);
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[1]);

      const handled = keydown(control.selectionBox.filter.el, 'ArrowRight');

      expect(handled.value).toBe(true);
      expect(modes(control).mode).toBe('filter');
      expect(control.dropDown.currentItem).toBeNull();
      expect(control.items[1].chipView.classList.contains('cm-chip--current')).toBe(false);
      expect(control.items[0].chipView.classList.contains('cm-chip--current')).toBe(false);
    });

    it('1.23.2 ArrowRight while a non-rightmost Chip is Current moves the marker to the next Chip, staying in Chip mode', () => {
      const control = setup();
      enterChipMode(control);
      control.dropDown.setCurrent(control.items[0]);

      const handled = keydown(control.selectionBox.filter.el, 'ArrowRight');

      expect(handled.value).toBe(true);
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(control.items[0].chipView.classList.contains('cm-chip--current')).toBe(false);
      expect(control.items[1].chipView.classList.contains('cm-chip--current')).toBe(true);
    });

    it('1.23.3 a selection emptied while in Chip mode defaults back to Filter mode and ArrowRight is left untouched', () => {
      const control = setup();
      enterChipMode(control);

      control.clearAll();
      expect(modes(control).mode).toBe('filter');
      expect(control.orderedChips()).toHaveLength(0);

      const handled = keydown(control.selectionBox.filter.el, 'ArrowRight');

      expect(handled.value).toBe(false);
      expect(modes(control).mode).toBe('filter');
    });
  });

  // requires: chipMode ArrowLeft/ArrowRight moving the Current marker between
  // Chips; leftmost ArrowLeft ignored (consumed, no movement)
  describe('24. Keyboard - ArrowLeft within Chip mode', () => {
    const setup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
        ],
      });
    };
    const modes = (control) => control[MSELECT_INTERNALS].modes;
    const keydown = (element, key) => {
      const preventDefaultCalled = { value: false };
      element.dispatchEvent({
        type: 'keydown',
        key,
        preventDefault() {
          preventDefaultCalled.value = true;
        },
      });
      return preventDefaultCalled;
    };
    const enterChipMode = (control) => {
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      control.items[2].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
    };

    it('1.24.1 ArrowLeft moves the Current marker one Chip to the left', () => {
      const control = setup();
      enterChipMode(control);
      expect(control.dropDown.currentItem).toBe(control.items[2]);

      const handled = keydown(control.selectionBox.filter.el, 'ArrowLeft');

      expect(handled.value).toBe(true);
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(control.items[2].chipView.classList.contains('cm-chip--current')).toBe(false);
      expect(control.items[1].chipView.classList.contains('cm-chip--current')).toBe(true);
    });

    it('1.24.2 ArrowLeft on the leftmost Chip is ignored: the marker stays, mode is kept', () => {
      const control = setup();
      enterChipMode(control);
      control.dropDown.setCurrent(control.items[0]);

      const handled = keydown(control.selectionBox.filter.el, 'ArrowLeft');

      expect(handled.value).toBe(true);
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(control.items[0].chipView.classList.contains('cm-chip--current')).toBe(true);
    });
  });

  // requires: chipMode Delete/Backspace as in text-editing insert mode
  // (Delete unselects the Current Chip, Backspace the one left of it), plus
  // the no-Chips-left fallback to Filter mode
  describe('25. Keyboard - Delete and Backspace within Chip mode', () => {
    const setup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
        ],
      });
    };
    const modes = (control) => control[MSELECT_INTERNALS].modes;
    const keydown = (element, key) => element.dispatchEvent({
      type: 'keydown',
      key,
      preventDefault() {},
    });
    const orderedValues = (control) => control.orderedChips().map((i) => i.value);
    const enterChipMode = (control) => {
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      control.items[2].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
    };

    it('1.25.1 Delete unselects the Current Chip and hands the Current marker to the next Chip', () => {
      const control = setup();
      enterChipMode(control);
      control.dropDown.setCurrent(control.items[1]);

      keydown(control.selectionBox.filter.el, 'Delete');

      expect(control.items[1].selected).toBe(false);
      expect(orderedValues(control)).toEqual(['a', 'c']);
      expect(control.dropDown.currentItem).toBe(control.items[2]);
      expect(modes(control).mode).toBe('chip');
    });

    it('1.25.2 Delete on the last Chip hands the Current marker to the previous Chip', () => {
      const control = setup();
      enterChipMode(control);
      expect(control.dropDown.currentItem).toBe(control.items[2]);

      keydown(control.selectionBox.filter.el, 'Delete');

      expect(control.items[2].selected).toBe(false);
      expect(orderedValues(control)).toEqual(['a', 'b']);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.25.3 Backspace unselects the Chip left of the Current one and keeps the Current marker', () => {
      const control = setup();
      enterChipMode(control);

      keydown(control.selectionBox.filter.el, 'Backspace');

      expect(control.items[1].selected).toBe(false);
      expect(orderedValues(control)).toEqual(['a', 'c']);
      expect(control.dropDown.currentItem).toBe(control.items[2]);
      expect(modes(control).mode).toBe('chip');
    });

    it('1.25.4 Backspace with the leftmost Chip Current is ignored', () => {
      const control = setup();
      enterChipMode(control);
      control.dropDown.setCurrent(control.items[0]);

      keydown(control.selectionBox.filter.el, 'Backspace');

      expect(orderedValues(control)).toEqual(['a', 'b', 'c']);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
    });

    it('1.25.5 unselecting the last Chip exits Chip mode to Filter with no Current', () => {
      const control = setup();
      control.items[0].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[0]);

      keydown(control.selectionBox.filter.el, 'Delete');

      expect(control.orderedChips()).toHaveLength(0);
      expect(modes(control).mode).toBe('filter');
      expect(control.dropDown.currentItem).toBeNull();
    });

    it('1.25.6 emptying the selection while in Collapsed mode defaults back to Filter', () => {
      const control = setup();
      control.options.maxVisibleChips = 1;
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      control.items[2].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(modes(control).mode).toBe('collapsed');

      control.clearAll();

      expect(control.orderedChips()).toHaveLength(0);
      expect(modes(control).mode).toBe('filter');
    });
  });

  // requires: filterMode Backspace taking over at the text's leftmost caret,
  // unselecting the rightmost Chip while staying in Filter mode
  describe('26. Keyboard - Backspace in Filter mode unselects the rightmost Chip', () => {
    const setup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
        ],
      });
    };
    const modes = (control) => control[MSELECT_INTERNALS].modes;
    const keydown = (element, key) => {
      const preventDefaultCalled = { value: false };
      element.dispatchEvent({
        type: 'keydown',
        key,
        preventDefault() {
          preventDefaultCalled.value = true;
        },
      });
      return preventDefaultCalled;
    };
    const selectTwo = (control) => {
      control.items[0].toggle(true);
      control.items[1].toggle(true);
    };
    /** The same three Items under a cap of one, so two of them collapse the box. */
    const collapsedSetup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        options: { maxVisibleChips: 1 },
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
        ],
      });
    };

    it('1.26.1 Backspace with an empty Filter unselects the rightmost Chip, staying in Filter mode', () => {
      const control = setup();
      selectTwo(control);
      expect(control.orderedChips()).toHaveLength(2);

      const handled = keydown(control.selectionBox.filter.el, 'Backspace');

      expect(handled.value).toBe(true);
      expect(modes(control).mode).toBe('filter');
      expect(control.items[1].selected).toBe(false);
      expect(control.orderedChips()).toHaveLength(1);
    });

    it('1.26.2 Backspace with a caret right of the text start is left to the input', () => {
      const control = setup();
      selectTwo(control);
      control.selectionBox.filter.query = 'a';
      control.selectionBox.filter.el.selectionStart = 1;

      const handled = keydown(control.selectionBox.filter.el, 'Backspace');

      expect(handled.value).toBe(false);
      expect(control.orderedChips()).toHaveLength(2);
    });

    it('1.26.3 Backspace with text but the caret at the leftmost position unselects the rightmost Chip', () => {
      const control = setup();
      selectTwo(control);
      control.selectionBox.filter.query = 'a';
      control.selectionBox.filter.el.selectionStart = 0;

      const handled = keydown(control.selectionBox.filter.el, 'Backspace');

      expect(handled.value).toBe(true);
      expect(modes(control).mode).toBe('filter');
      expect(control.items[1].selected).toBe(false);
      expect(control.orderedChips()).toHaveLength(1);
    });

    it('1.26.4 Backspace at the leftmost caret with no Chips left is a no-op', () => {
      const control = setup();

      const handled = keydown(control.selectionBox.filter.el, 'Backspace');

      expect(handled.value).toBe(false);
      expect(modes(control).mode).toBe('filter');
      expect(control.orderedChips()).toHaveLength(0);
    });

    it('1.26.5 Backspace at the leftmost caret with the selection collapsed unselects every selected Item', () => {
      const control = collapsedSetup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      control.items[2].toggle(true);
      expect(control.selectionBox.isCollapsed).toBe(true);

      const handled = keydown(control.selectionBox.filter.el, 'Backspace');

      // The summary Chip stands for the selection as a whole, so the key that
      // removes the rightmost Chip has nothing of its own to single out.
      expect(handled.value).toBe(true);
      expect(modes(control).mode).toBe('filter');
      expect(control.orderedChips()).toHaveLength(0);
      expect(control.selectionBox.isCollapsed).toBe(false);
    });

    it('1.26.6 Backspace at the leftmost caret removes one Chip when the count has fallen back within the limit', () => {
      const control = collapsedSetup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      control.items[2].toggle(true);
      // Leaving Collapsed mode releases the hold on an achieved collapse, so the
      // box expands and the key is back to removing a single Chip.
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowRight');
      control.items[2].toggle(false);
      control.items[1].toggle(false);
      expect(control.selectionBox.isCollapsed).toBe(false);

      const handled = keydown(control.selectionBox.filter.el, 'Backspace');

      expect(handled.value).toBe(true);
      expect(control.orderedChips()).toHaveLength(0);
    });
  });

  // requires: chipMode Home/End jumping the Current marker to the first/last
  // Chip
  describe('27. Keyboard - Home and End within Chip mode', () => {
    const setup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
        ],
      });
    };
    const modes = (control) => control[MSELECT_INTERNALS].modes;
    const keydown = (element, key) => {
      const preventDefaultCalled = { value: false };
      element.dispatchEvent({
        type: 'keydown',
        key,
        preventDefault() {
          preventDefaultCalled.value = true;
        },
      });
      return preventDefaultCalled;
    };
    const enterChipMode = (control) => {
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      control.items[2].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
    };

    it('1.27.1 Home moves the Current marker to the first Chip', () => {
      const control = setup();
      enterChipMode(control);
      expect(control.dropDown.currentItem).toBe(control.items[2]);

      const handled = keydown(control.selectionBox.filter.el, 'Home');

      expect(handled.value).toBe(true);
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(control.items[0].chipView.classList.contains('cm-chip--current')).toBe(true);
      expect(control.items[2].chipView.classList.contains('cm-chip--current')).toBe(false);
    });

    it('1.27.2 End moves the Current marker to the last Chip', () => {
      const control = setup();
      enterChipMode(control);
      control.dropDown.setCurrent(control.items[0]);

      const handled = keydown(control.selectionBox.filter.el, 'End');

      expect(handled.value).toBe(true);
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[2]);
    });

    it('1.27.3 with the selection emptied the mode has already reverted to Filter, where Home/End pass through', () => {
      const control = setup();
      control.items[0].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');

      control.clearAll();
      expect(modes(control).mode).toBe('filter');

      const end = keydown(control.selectionBox.filter.el, 'End');
      const home = keydown(control.selectionBox.filter.el, 'Home');

      expect(end.value).toBe(false);
      expect(home.value).toBe(false);
      expect(control.dropDown.currentItem).toBeNull();
    });
  });

  // requires: REQ-3.11-20, REQ-3.10-03 — chipMode ArrowDown opening the
  // DropDown and scrolling the Current Item into view while staying in Chip
  // mode, and handing over to DropDown mode on a repeated press
  describe('28. Keyboard - ArrowDown from Chip mode opens the DropDown', () => {
    const setup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
        ],
      });
    };
    const modes = (control) => control[MSELECT_INTERNALS].modes;
    const keydown = (element, key) => {
      const preventDefaultCalled = { value: false };
      element.dispatchEvent({
        type: 'keydown',
        key,
        preventDefault() {
          preventDefaultCalled.value = true;
        },
      });
      return preventDefaultCalled;
    };
    const enterChipMode = (control) => {
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      control.items[2].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
    };

    it('1.28.1 ArrowDown opens the DropDown and scrolls the Current Item into view, staying in Chip mode', () => {
      const control = setup();
      enterChipMode(control);
      expect(control.dropDown.currentItem).toBe(control.items[2]);

      const handled = keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(handled.value).toBe(true);
      expect(control.dropDown.open).toBe(true);
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[2]);
      expect(control.items[2].itemView.scrollIntoViewCalls).toBe(1);
      expect(control.items[2].itemView.classList.contains('cm-item--current')).toBe(true);
    });

    it('1.28.2 a repeated ArrowDown moves on to DropDown mode, keeping the Current Item', () => {
      const control = setup();
      enterChipMode(control);
      keydown(control.selectionBox.filter.el, 'ArrowDown');

      const handled = keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(handled.value).toBe(true);
      expect(control.dropDown.open).toBe(true);
      expect(modes(control).mode).toBe('dropdown');
      expect(control.dropDown.currentItem).toBe(control.items[2]);
      expect(control.items[2].itemView.scrollIntoViewCalls).toBe(1);
      expect(control.items[2].itemView.classList.contains('cm-item--current')).toBe(true);
    });

    it('1.28.3 the DropDown continues from the Current Item after the handover', () => {
      const control = setup();
      enterChipMode(control);
      control.selectionBox.selectFirst();
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(modes(control).mode).toBe('dropdown');
      expect(control.dropDown.currentItem).toBe(control.items[0]);

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.28.4 the handover happens only on the repeated press', () => {
      const control = setup();
      enterChipMode(control);

      const handled = keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(handled.value).toBe(true);
      expect(control.dropDown.open).toBe(true);
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[2]);
      expect(control.items[2].itemView.scrollIntoViewCalls).toBe(1);
      expect(control.items[2].itemView.classList.contains('cm-item--current')).toBe(true);
    });
  });

  // requires: Escape handling in every mode (closes the DropDown), in DropDown
  // mode also returning to the previous mode; public MSelect#changeToPrevious
  // with its no-previous fallback to Filter
  describe('29. Keyboard - Escape closes the DropDown in every mode', () => {
    const setup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
        ],
      });
    };
    const modes = (control) => control[MSELECT_INTERNALS].modes;
    const keydown = (element, key) => {
      const preventDefaultCalled = { value: false };
      element.dispatchEvent({
        type: 'keydown',
        key,
        preventDefault() {
          preventDefaultCalled.value = true;
        },
      });
      return preventDefaultCalled;
    };

    it('1.29.1 Escape in Filter mode closes the DropDown and stays in Filter', () => {
      const control = setup();
      control.dropDown.open = true;

      const handled = keydown(control.selectionBox.filter.el, 'Escape');

      expect(handled.value).toBe(true);
      expect(control.dropDown.open).toBe(false);
      expect(modes(control).mode).toBe('filter');
    });

    it('1.29.2 Escape in DropDown mode closes the DropDown and returns to the previous mode', () => {
      const control = setup();
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(modes(control).mode).toBe('dropdown');
      expect(control.dropDown.open).toBe(true);

      const handled = keydown(control.selectionBox.filter.el, 'Escape');

      expect(handled.value).toBe(true);
      expect(control.dropDown.open).toBe(false);
      expect(modes(control).mode).toBe('filter');
    });

    it('1.29.3 Escape in Chip mode closes the DropDown and stays in Chip', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.open).toBe(true);

      const handled = keydown(control.selectionBox.filter.el, 'Escape');

      expect(handled.value).toBe(true);
      expect(control.dropDown.open).toBe(false);
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.29.4 Escape in Collapsed mode closes the DropDown and stays in Collapsed', () => {
      const control = setup();
      control.options.maxVisibleChips = 1;
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      control.items[2].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(modes(control).mode).toBe('collapsed');
      control.dropDown.open = true;

      const handled = keydown(control.selectionBox.filter.el, 'Escape');

      expect(handled.value).toBe(true);
      expect(control.dropDown.open).toBe(false);
      expect(modes(control).mode).toBe('collapsed');
    });

    it('1.29.6 Escape in Filter mode closes the list first, keeping the query for the next press', () => {
      const control = setup();
      const filter = control.selectionBox.filter;
      filter.query = 'br';
      control.dropDown.open = true;
      expect(control.items[0].visible).toBe(false);
      expect(control.dropDown.currentItem).toBe(control.items[1]);

      const handled = keydown(filter.el, 'Escape');

      expect(handled.value).toBe(true);
      expect(control.dropDown.open).toBe(false);
      expect(modes(control).mode).toBe('filter');
      expect(filter.query).toBe('br');
      expect(filter.el.value).toBe('br');
      expect(control.items[0].visible).toBe(false);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.29.7 with the list already closed, Escape clears the query and re-filters the list', () => {
      const control = setup();
      const filter = control.selectionBox.filter;
      filter.query = 'br';
      control.dropDown.open = true;
      keydown(filter.el, 'Escape');
      expect(control.dropDown.open).toBe(false);

      const handled = keydown(filter.el, 'Escape');

      expect(handled.value).toBe(true);
      expect(filter.query).toBe('');
      expect(filter.el.value).toBe('');
      expect(control.allItems.every((item) => item.visible)).toBe(true);
      expect(control.dropDown.open).toBe(false);
      expect(modes(control).mode).toBe('filter');
      // Clearing is a query change, so the marker is re-homed to the first
      // selectable Item of the list the empty query leaves.
      expect(control.dropDown.currentItem).toBe(control.items[0]);
    });

    it('1.29.8 Escape with nothing to clear leaves the marker where it is', () => {
      const control = setup();
      const filter = control.selectionBox.filter;
      control.dropDown.setCurrent(control.items[2]);

      const handled = keydown(filter.el, 'Escape');

      expect(handled.value).toBe(true);
      expect(filter.query).toBe('');
      expect(control.dropDown.currentItem).toBe(control.items[2]);
    });

    it('1.29.5 changeToPrevious without a recorded previous mode falls back to Filter and logs a warning', () => {
      const control = setup();
      const warn = vi.spyOn(control.logger, 'warn');
      expect(control[MSELECT_INTERNALS].modes.previous).toBeNull();

      const transitioned = control.changeToPrevious();

      expect(warn).toHaveBeenCalledTimes(1);
      expect(transitioned).toBe(false);
      expect(modes(control).mode).toBe('filter');
    });
  });
});
