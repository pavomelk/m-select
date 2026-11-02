import { describe, expect, it, vi } from 'vitest';
import './teardown.js';
import { MSelect, Item, Filter, MSELECT_INTERNALS, specLog } from '../src/m-select.js';

/**
 * Behavioural spec for m-select — the selected set as the outside sees it.
 *
 * Areas 41-48: clearing from Collapsed mode, value normalization, the form
 * mirror, runtime selection and teardown, Enter in Filter mode, selection
 * change events, Tab containment, and document-level listeners.
 */

describe('1. MSelect — Selection, form and events', () => {
  describe('41. Keyboard - Delete and Backspace in Collapsed mode unselect everything', () => {
    const setup = () => {
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
    /** Selects every Item, collapsing the box, and enters Collapsed mode. */
    const enterCollapsed = (control) => {
      for (const item of control.items) item.toggle(true);
      expect(control.selectionBox.isCollapsed).toBe(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(modes(control).mode).toBe('collapsed');
    };

    it('1.41.1 Delete in Collapsed mode unselects every selected Item', () => {
      const control = setup();
      enterCollapsed(control);

      const handled = keydown(control.selectionBox.filter.el, 'Delete');

      expect(handled.value).toBe(true);
      expect(control.selectedItems).toHaveLength(0);
      expect(control.orderedChips()).toHaveLength(0);
    });

    it('1.41.2 Backspace in Collapsed mode unselects every selected Item', () => {
      const control = setup();
      enterCollapsed(control);

      const handled = keydown(control.selectionBox.filter.el, 'Backspace');

      // The Chip-mode key for the Chip left of the marker meets one Chip standing
      // for everything, so it answers like Delete does.
      expect(handled.value).toBe(true);
      expect(control.selectedItems).toHaveLength(0);
      expect(control.orderedChips()).toHaveLength(0);
    });

    it('1.41.3 the emptied box hands back to Filter mode and expands', () => {
      const control = setup();
      enterCollapsed(control);

      keydown(control.selectionBox.filter.el, 'Delete');

      expect(modes(control).mode).toBe('filter');
      expect(control.selectionBox.collapsedChip.current).toBe(false);
      expect(control.selectionBox.isCollapsed).toBe(false);
      expect(control.selectionBox.filter.displaySelected).toBe(false);
    });

    it('1.41.4 a Group selection is cleared whole, children included', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { maxVisibleChips: 1 },
        items: [
          { value: 'a', label: 'Alpha' },
          {
            label: 'Cities',
            items: [
              { value: 'lyon', label: 'Lyon' },
              { value: 'nice', label: 'Nice' },
            ],
          },
        ],
      });
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(modes(control).mode).toBe('collapsed');

      keydown(control.selectionBox.filter.el, 'Delete');

      const [lyon, nice] = [...control.items[1]];
      expect(lyon.selected).toBe(false);
      expect(nice.selected).toBe(false);
      expect(control.selectedItems).toHaveLength(0);
      // A valueless Group owns no Chip, so what it owns of the selection is read
      // off its children - and a Group toggled as a whole keeps its own flag after
      // its children go, which is why the children are the state asked for here.
      expect(control.items[1].selectionState).toBe('none');
      expect(control.items[1].inSelection).toBe(false);
    });

    it('1.41.5 the collapse is left in a single mode transition, straight to Filter', () => {
      const control = setup();
      enterCollapsed(control);
      const seen = [];
      control.el.addEventListener('cm-mode-change', (e) => seen.push(e.detail));

      keydown(control.selectionBox.filter.el, 'Delete');

      // Not through Chip mode: the summary Chip has just removed the selection,
      // so there is nothing left to navigate between Chips.
      expect(seen).toEqual([{ from: 'collapsed', to: 'filter' }]);
    });

    it('1.41.6 Escape is not a removal key: it changes neither the selection nor the mode', () => {
      const control = setup();
      enterCollapsed(control);

      const handled = keydown(control.selectionBox.filter.el, 'Escape');

      expect(handled.value).toBe(true);
      expect(control.selectedItems).toHaveLength(3);
      expect(modes(control).mode).toBe('collapsed');
    });
  });

  // requires: Item value normalization (null / '' / undefined are absence) and
  // the specLog warnings for a non-boolean `selectable` or one set without a value
  describe('42. Item value and selectable normalization', () => {
    const build = (itemSpec) => {
      const host = document.createElement('div');
      return new MSelect(host, { items: [itemSpec] });
    };

    it('1.42.1 value: "" is an absence of value, so the Item is not selectable and owns no Chip', () => {
      const control = build({ value: '', label: 'Empty' });
      const item = control.items[0];

      expect(item.value).toBeUndefined();
      expect(item.isSelectable).toBe(false);

      item.toggle(true);
      expect(item.selected).toBe(false);
      expect(control.selectionBox.items).toHaveLength(0);
    });

    it('1.42.2 value: null is an absence of value', () => {
      const control = build({ value: null, label: 'Null' });
      const item = control.items[0];

      expect(item.value).toBeUndefined();
      expect(item.isSelectable).toBe(false);
    });

    it('1.42.3 an absent value is an absence of value', () => {
      const control = build({ label: 'Absent' });
      expect(control.items[0].value).toBeUndefined();
      expect(control.items[0].isSelectable).toBe(false);
    });

    it('1.42.4 0 and false are real values, not absences', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 0, label: 'Zero' },
          { value: false, label: 'False' },
        ],
      });

      expect(control.items[0].isSelectable).toBe(true);
      expect(control.items[1].isSelectable).toBe(true);
      control.items[0].toggle(true);
      expect(control.selectionBox.items).toHaveLength(1);
    });

    it('1.42.5 selectable: false is honoured', () => {
      const control = build({ value: 'a', label: 'A', selectable: false });
      expect(control.items[0].isSelectable).toBe(false);
    });

    it('1.42.6 the string "false" is still read as false, and does not warn', () => {
      const warn = vi.spyOn(specLog, 'warn').mockImplementation(() => {});
      const control = build({ value: 'a', label: 'A', selectable: 'false' });

      expect(control.items[0].isSelectable).toBe(false);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('1.42.7 a non-boolean selectable read as true warns, without changing the reading', () => {
      for (const spelling of ['FALSE', 0, 1, 'yes', '']) {
        const warn = vi.spyOn(specLog, 'warn').mockImplementation(() => {});
        const control = build({ value: 'a', label: 'A', selectable: spelling });

        expect(control.items[0].isSelectable).toBe(true);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain('selectable');
        warn.mockRestore();
      }
    });

    it('1.42.8 an absent selectable never warns', () => {
      const warn = vi.spyOn(specLog, 'warn').mockImplementation(() => {});
      build({ value: 'a', label: 'A' });
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('1.42.9 selectable set on an Item without a value warns, since there is nothing to select', () => {
      const warn = vi.spyOn(specLog, 'warn').mockImplementation(() => {});
      const control = build({ label: 'Valueless', selectable: true });

      expect(control.items[0].isSelectable).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('value');
      warn.mockRestore();
    });

    it('1.42.10 duplicate detection treats null, "" and undefined alike as no value', () => {
      const host = document.createElement('div');
      // Three valueless Items: none of them is a duplicate of another, since
      // none of them carries a value to collide on.
      expect(() =>
        new MSelect(host, {
          items: [
            { label: 'One' },
            { label: 'Two', value: '' },
            { label: 'Three', value: null },
          ],
        })
      ).not.toThrow();
    });

    it('1.42.11 a real value still collides with itself', () => {
      const host = document.createElement('div');
      expect(() =>
        new MSelect(host, {
          items: [
            { value: 'a', label: 'A' },
            { value: 'a', label: 'A again' },
          ],
        })
      ).toThrow(/Duplicate item value/);
    });
  });

  // requires: options.name, the cm-form container on MSelect#el, and
  // #syncFormValues() run from the selection settle, render and setItems
  describe('43. Form submission', () => {
    const formEl = (control) =>
      control.el.children.find((el) => el.classList.contains('cm-form'));
    const formInputs = (control) => {
      const el = formEl(control);
      return el ? el.children : [];
    };
    const formPairs = (control) => formInputs(control).map((i) => [i.name, i.value]);

    const build = (options, items) => {
      const host = document.createElement('div');
      return new MSelect(host, {
        options,
        items: items || [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
          { value: 'c', label: 'C' },
        ],
      });
    };

    it('1.43.1 without a name the control contributes no form field', () => {
      const control = build({});
      control.items[0].toggle(true);

      expect(formEl(control)).toBeUndefined();
      expect(formInputs(control)).toHaveLength(0);
    });

    it('1.43.2 a selected Item becomes one hidden input named verbatim by options.name', () => {
      const control = build({ name: 'mselect' });
      control.items[0].toggle(true);

      expect(formPairs(control)).toEqual([['mselect', 'a']]);
      expect(formInputs(control)[0].type).toBe('hidden');
    });

    it('1.43.3 one input per selected Item, in selectedValues (arrival) order', () => {
      const control = build({ name: 'mselect' });
      control.items[1].toggle(true);
      control.items[0].toggle(true);

      expect(formPairs(control)).toEqual([
        ['mselect', 'b'],
        ['mselect', 'a'],
      ]);
    });

    it('1.43.4 unselecting an Item removes its input', () => {
      const control = build({ name: 'mselect' });
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      control.items[0].toggle(false);

      expect(formPairs(control)).toEqual([['mselect', 'b']]);
    });

    it('1.43.5 unselectItem (the Chip "x") updates the submitted values', () => {
      const control = build({ name: 'mselect' });
      control.items[0].toggle(true);
      control.items[1].toggle(true);

      control.unselectItem(control.items[0]);

      expect(formPairs(control)).toEqual([['mselect', 'b']]);
    });

    it('1.43.6 clearAll empties the form fields', () => {
      const control = build({ name: 'mselect' });
      control.items[0].toggle(true);
      control.items[1].toggle(true);

      control.clearAll();

      expect(formInputs(control)).toHaveLength(0);
    });

    it('1.43.7 toggleAll submits every selectable Item', () => {
      const control = build({ name: 'mselect' });
      control.toggleAll();

      expect(formPairs(control)).toEqual([
        ['mselect', 'a'],
        ['mselect', 'b'],
        ['mselect', 'c'],
      ]);
    });

    it('1.43.8 a delayed setItems seed populates the fields in seed order', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { name: 'mselect', delayedLoad: true },
      });

      control.setItems(
        [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
        ['b', 'a']
      );

      expect(formPairs(control)).toEqual([
        ['mselect', 'b'],
        ['mselect', 'a'],
      ]);
    });

    it('1.43.9 a collapsed selection still submits every selected value, not just the summary', () => {
      const control = build({ name: 'mselect', maxVisibleChips: 1 });
      control.items[0].toggle(true);
      control.items[1].toggle(true);

      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(formPairs(control)).toEqual([
        ['mselect', 'a'],
        ['mselect', 'b'],
      ]);
    });

    it('1.43.10 the Filter input carries no name, so it is not submitted', () => {
      const control = build({ name: 'mselect' });
      expect(control.selectionBox.filter.el.name).toBeFalsy();
    });

    it('1.43.11 a comma in a value is submitted verbatim and warned about once', () => {
      const warn = vi.spyOn(specLog, 'warn').mockImplementation(() => {});
      const control = build({ name: 'mselect' }, [{ value: 'a,b', label: 'Comma' }]);

      control.items[0].toggle(true);

      expect(formPairs(control)).toEqual([['mselect', 'a,b']]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('comma');

      control.render();
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });

    it('1.43.12 without a name, a comma in a value does not warn (there is no submission to corrupt)', () => {
      const warn = vi.spyOn(specLog, 'warn').mockImplementation(() => {});
      const control = build({}, [{ value: 'a,b', label: 'Comma' }]);

      control.items[0].toggle(true);

      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  // requires: a selectedValues setter (batched re-selection, the runtime
  // counterpart of the setItems seed), a public mode getter, and destroy()
  describe('44. Runtime selection, mode read and teardown', () => {
    const build = (config = {}, options) => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: config.items || [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
          { value: 'c', label: 'C' },
        ],
        options,
      });
    };

    it('1.44.1 the selectedValues setter states the selection in the array order', () => {
      const control = build();
      control.items[2].toggle(true);

      control.selectedValues = ['b', 'a'];

      expect(control.selectedValues).toEqual(['b', 'a']);
      expect(control.items[2].selected).toBe(false);
    });

    it('1.44.2 the setter is lenient: unknown values are skipped with a warning', () => {
      const warn = vi.spyOn(specLog, 'warn').mockImplementation(() => {});
      const control = build();

      control.selectedValues = ['a', 'nope'];

      expect(control.selectedValues).toEqual(['a']);
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });

    it('1.44.3 a non-array seed throws and leaves the selection untouched', () => {
      const control = build();
      control.items[0].toggle(true);

      expect(() => {
        control.selectedValues = 'a';
      }).toThrow(/array/);
      expect(control.selectedValues).toEqual(['a']);
    });

    it('1.44.4 mode reports the active input mode', () => {
      const control = build();
      expect(control.mode).toBe('filter');

      control.dropDown.open = true;
      control.onKeyDown({ key: 'ArrowDown', preventDefault() {} });

      expect(control.mode).toBe('dropdown');
    });

    it('1.44.5 destroy detaches the document listeners it registered', () => {
      const control = build();
      control.dropDown.open = true;
      document.dispatchEvent({ type: 'mousedown', target: document.body });
      expect(control.dropDown.open).toBe(false);

      control.dropDown.open = true;
      control.destroy();
      document.dispatchEvent({ type: 'mousedown', target: document.body });
      expect(control.dropDown.open).toBe(true);
    });

    it('1.44.6 destroy detaches the element once and is idempotent', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, { items: [{ value: 'a', label: 'A' }] });
      expect(host.children).toContain(control.el);

      control.destroy();

      expect(host.children).not.toContain(control.el);
      expect(() => control.destroy()).not.toThrow();
    });
  });

  // requires: Filter-mode Enter/ArrowDown handing the same key to DropDown mode
  // after switching, so the commit and movement rules are shared, not copied.
  describe('45. Keyboard - Enter in Filter mode commits the Current Item', () => {
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
    const modes = (control) => control[MSELECT_INTERNALS].modes.mode;
    const key = (control, keyName) => {
      const prevented = { value: false };
      control.selectionBox.filter.el.dispatchEvent({
        type: 'keydown',
        key: keyName,
        target: control.selectionBox.filter.el,
        preventDefault() {
          prevented.value = true;
        },
      });
      return prevented;
    };

    it('1.45.1 Enter with a Current Item toggles it, closes the DropDown and returns to Filter mode', () => {
      const control = setup();
      control.dropDown.open = true;
      control.dropDown.setCurrent(control.items[1]);

      const prevented = key(control, 'Enter');

      expect(control.items[1].selected).toBe(true);
      expect(control.dropDown.open).toBe(false);
      expect(modes(control)).toBe('filter');
      expect(control.dropDown.currentItem).toBeNull();
      expect(prevented.value).toBe(true);
    });

    it('1.45.2 Enter after typing toggles the first match the query left Current and clears the query', () => {
      const control = setup();
      vi.useFakeTimers();
      try {
        const el = control.selectionBox.filter.el;
        el.value = 'r';
        el.dispatchEvent({ type: 'input' });
        vi.advanceTimersByTime(300);

        expect(control.dropDown.open).toBe(true);
        expect(control.dropDown.currentItem).toBe(control.items[1]);

        const prevented = key(control, 'Enter');

        expect(control.items[1].selected).toBe(true);
        expect(control.dropDown.open).toBe(false);
        expect(modes(control)).toBe('filter');
        expect(control.selectionBox.filter.query).toBe('');
        expect(prevented.value).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it('1.45.3 Enter with no Current Item closes the DropDown and selects nothing', () => {
      const control = setup();
      control.dropDown.open = true;
      control.dropDown.clearCurrent();

      const prevented = key(control, 'Enter');

      expect(control.selectionBox.items).toHaveLength(0);
      expect(control.dropDown.open).toBe(false);
      expect(modes(control)).toBe('filter');
      expect(prevented.value).toBe(true);
    });

    it('1.45.4 Enter is consumed even with no Current Item and a closed DropDown, so a surrounding form does not submit', () => {
      const control = setup();
      expect(control.dropDown.open).toBe(false);

      const prevented = key(control, 'Enter');

      expect(prevented.value).toBe(true);
      expect(control.selectionBox.items).toHaveLength(0);
      expect(control.dropDown.open).toBe(false);
      expect(modes(control)).toBe('filter');
    });
  });

  // requires: a settled selection change emits once after the Chips, the list
  // and the form mirror are up to date, with the values that entered and left.
  describe('46. Selection change events', () => {
    const DEFAULT_ITEMS = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Bravo' },
      { value: 'c', label: 'Charlie' },
    ];
    const setup = (items, options) => {
      const host = document.createElement('div');
      return new MSelect(host, { items: items || DEFAULT_ITEMS, options });
    };
    const collect = (control) => {
      const seen = [];
      control.el.addEventListener('cm-selection-change', (e) =>
        seen.push({ type: e.type, detail: e.detail })
      );
      return seen;
    };
    const xOf = (item) =>
      item.chipView.children.find((el) => el.classList.contains('cm-chip__x'));

    it('1.46.1 toggling an Item emits one cm-selection-change with the value that entered', () => {
      const control = setup();
      const seen = collect(control);

      control.items[1].itemView.click();

      expect(seen).toEqual([
        {
          type: 'cm-selection-change',
          detail: { values: ['b'], added: ['b'], removed: [] },
        },
      ]);
    });

    it('1.46.2 toggling it off reports the value that left', () => {
      const control = setup();
      control.items[1].toggle(true);
      const seen = collect(control);

      control.items[1].itemView.click();

      expect(seen).toEqual([
        {
          type: 'cm-selection-change',
          detail: { values: [], added: [], removed: ['b'] },
        },
      ]);
    });

    it('1.46.3 removing a Chip reports the removed value', () => {
      const control = setup();
      control.items[0].toggle(true);
      const seen = collect(control);

      xOf(control.items[0]).click();

      expect(seen).toEqual([
        {
          type: 'cm-selection-change',
          detail: { values: [], added: [], removed: ['a'] },
        },
      ]);
    });

    it('1.46.4 a settle that changes nothing emits nothing', () => {
      const control = setup();
      const seen = collect(control);

      control.unselectItem(control.items[0]);
      control.clearAll();

      expect(seen).toEqual([]);
    });

    it('1.46.5 toggleAll emits once for the whole bulk change', () => {
      const control = setup();
      const seen = collect(control);

      control.toggleAll();

      expect(seen).toEqual([
        {
          type: 'cm-selection-change',
          detail: { values: ['a', 'b', 'c'], added: ['a', 'b', 'c'], removed: [] },
        },
      ]);
    });

    it('1.46.6 clearAll emits once with every value that left', () => {
      const control = setup();
      control.toggleAll();
      const seen = collect(control);

      control.clearAll();

      expect(seen).toEqual([
        {
          type: 'cm-selection-change',
          detail: { values: [], added: [], removed: ['a', 'b', 'c'] },
        },
      ]);
    });

    it('1.46.7 the selectedValues setter reports the values that entered', () => {
      const control = setup();
      control.items[0].toggle(true);
      const seen = collect(control);

      control.selectedValues = ['c', 'a'];

      expect(seen).toEqual([
        {
          type: 'cm-selection-change',
          detail: { values: ['c', 'a'], added: ['c'], removed: [] },
        },
      ]);
    });

    it('1.46.8 setItems reports the resolved seed in its own order', () => {
      const control = setup(undefined, { delayedLoad: true });
      const seen = collect(control);

      control.setItems(
        [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
        ],
        ['b', 'a']
      );

      expect(seen).toEqual([
        {
          type: 'cm-selection-change',
          detail: { values: ['b', 'a'], added: ['b', 'a'], removed: [] },
        },
      ]);
    });

    it('1.46.9 a Group toggle settles once for the whole cascade', () => {
      const control = setup([
        {
          label: 'Group',
          items: [
            { value: 'x', label: 'X' },
            { value: 'y', label: 'Y' },
          ],
        },
      ]);
      const seen = collect(control);

      control.items[0].itemView.click();

      expect(seen).toEqual([
        {
          type: 'cm-selection-change',
          detail: { values: ['x', 'y'], added: ['x', 'y'], removed: [] },
        },
      ]);

      control.items[0].itemView.click();

      expect(seen).toHaveLength(2);
      expect(seen[1].detail).toEqual({
        values: [],
        added: [],
        removed: ['x', 'y'],
      });
    });

    it('1.46.10 a reported values array is a snapshot, not a live view', () => {
      const control = setup();
      const seen = collect(control);

      control.items[0].toggle(true);
      const first = seen[0].detail.values;
      control.items[1].toggle(true);

      expect(first).toEqual(['a']);
      expect(seen[1].detail.values).toEqual(['a', 'b']);
    });

    it('1.46.11 a reorder-only change reports the new order and nothing entering or leaving', () => {
      const control = setup();
      control.selectedValues = ['a', 'b'];
      const seen = collect(control);

      control.selectedValues = ['b', 'a'];

      expect(seen).toEqual([
        {
          type: 'cm-selection-change',
          detail: { values: ['b', 'a'], added: [], removed: [] },
        },
      ]);
    });
  });

  // requires: REQ-3.11-01, REQ-3.11-03, REQ-3.11-13 — the Filter holds the focus
  // for the whole session, and an open DropDown is part of the interaction in
  // progress whether it was opened by a key or a mouse click. Tab is the
  // browser's own focus walk, so leaving it to the browser while the list is open
  // walks the page out from under the user; it is consumed instead and the focus
  // stays on the Filter. Leaving the list is Escape's and Enter's job, and with
  // the DropDown closed Tab still does what a single Tab stop promises.
  describe('47. Keyboard - Tab does not walk the page while the DropDown is open', () => {
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
    const mode = (control) => control[MSELECT_INTERNALS].modes.mode;
    const keydown = (element, key, extra = {}) => {
      const prevented = { value: false };
      element.dispatchEvent({
        type: 'keydown',
        key,
        target: element,
        ...extra,
        preventDefault() {
          prevented.value = true;
        },
      });
      return prevented;
    };
    // Focus the Filter the way the browser would, so "the focus did not move" is
    // an assertion about this control's own element.
    const focusFilter = (control) => {
      control.selectionBox.filter.el.focus();
      control.selectionBox.filter.el.dispatchEvent({ type: 'focus' });
      return control.selectionBox.filter.el;
    };

    it('1.47.1 Tab in DropDown mode is consumed, leaving the focus on the Filter', () => {
      const control = setup();
      const el = focusFilter(control);
      keydown(el, 'ArrowDown');
      expect(mode(control)).toBe('dropdown');
      expect(control.dropDown.currentItem).toBe(control.items[0]);

      const prevented = keydown(el, 'Tab');

      expect(prevented.value).toBe(true);
      expect(document.activeElement).toBe(el);
      expect(mode(control)).toBe('dropdown');
      expect(control.dropDown.open).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
    });

    it('1.47.2 Shift+Tab is consumed the same way, so neither direction walks the page', () => {
      const control = setup();
      const el = focusFilter(control);
      keydown(el, 'ArrowDown');

      const prevented = keydown(el, 'Tab', { shiftKey: true });

      expect(prevented.value).toBe(true);
      expect(document.activeElement).toBe(el);
      expect(mode(control)).toBe('dropdown');
    });

    it('1.47.3 Tab in Filter mode with the DropDown closed is left to the browser, so the component can still be left by Tab', () => {
      const control = setup();
      const el = focusFilter(control);
      expect(mode(control)).toBe('filter');
      expect(control.dropDown.open).toBe(false);

      const prevented = keydown(el, 'Tab');

      expect(prevented.value).toBe(false);
    });

    it('1.47.4 Escape out of a DropDown entered from Chip mode with a selected Current returns to Chip, keeping the Filter read-only and focused', () => {
      const control = setup();
      const el = focusFilter(control);
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      keydown(el, 'ArrowLeft');
      expect(mode(control)).toBe('chip');
      expect(el.readOnly).toBe(true);
      keydown(el, 'ArrowDown');
      keydown(el, 'ArrowDown');
      expect(mode(control)).toBe('dropdown');
      expect(control.dropDown.currentItem).toBe(control.items[1]);

      keydown(el, 'Escape');

      expect(mode(control)).toBe('chip');
      expect(control.dropDown.open).toBe(false);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(el.readOnly).toBe(true);
      expect(document.activeElement).toBe(el);
    });

    it('1.47.8 Escape out of a DropDown entered from Chip mode with an unselected Current returns to an editable, focused Filter', () => {
      const control = setup();
      const el = focusFilter(control);
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      keydown(el, 'ArrowLeft');
      keydown(el, 'ArrowDown');
      keydown(el, 'ArrowDown');
      expect(mode(control)).toBe('dropdown');
      keydown(el, 'ArrowDown');
      expect(control.dropDown.currentItem).toBe(control.items[2]);
      expect(control.items[2].selected).toBe(false);

      keydown(el, 'Escape');

      expect(mode(control)).toBe('filter');
      expect(control.dropDown.open).toBe(false);
      expect(control.dropDown.currentItem).toBeNull();
      expect(el.readOnly).toBe(false);
      expect(document.activeElement).toBe(el);
    });

    it('1.47.5 Escape out of a DropDown entered from Filter mode leaves an editable, focused Filter', () => {
      const control = setup();
      const el = focusFilter(control);
      keydown(el, 'ArrowDown');
      expect(mode(control)).toBe('dropdown');

      keydown(el, 'Escape');

      expect(mode(control)).toBe('filter');
      expect(el.readOnly).toBe(false);
      expect(document.activeElement).toBe(el);
    });

    it('1.47.6 Tab after a mouse click opened the DropDown is consumed and leaves the focus on the Filter', () => {
      const control = setup();
      const el = focusFilter(control);

      control.selectionBox.filter.el.click();
      expect(mode(control)).toBe('filter');
      expect(control.dropDown.open).toBe(true);

      const prevented = keydown(el, 'Tab');

      expect(prevented.value).toBe(true);
      expect(document.activeElement).toBe(el);
      expect(mode(control)).toBe('filter');
      expect(control.dropDown.open).toBe(true);
    });

    it('1.47.7 Shift+Tab in Chip mode with an open DropDown is consumed too', () => {
      const control = setup();
      const el = focusFilter(control);
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      keydown(el, 'ArrowLeft');
      expect(mode(control)).toBe('chip');
      keydown(el, 'ArrowDown');
      expect(control.dropDown.open).toBe(true);

      const prevented = keydown(el, 'Tab', { shiftKey: true });

      expect(prevented.value).toBe(true);
      expect(document.activeElement).toBe(el);
      expect(mode(control)).toBe('chip');
      expect(control.dropDown.open).toBe(true);
    });
  });

  // requires: a control mounted in the page, so an event dispatched on one of its
  // nodes bubbles to the document listeners the way the browser runs it - the
  // outside-click rule (REQ-3.10-10) decided by where the pointer landed, with no
  // document event dispatched by hand. Every other area builds a detached host,
  // where the stub correctly delivers to nothing above the control itself.
  describe('48. Mounted - mouse events reach the document listeners by bubbling', () => {
    const build = () => {
      const host = document.createElement('div');
      document.body.append(host);
      const control = new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
        ],
      });
      return { host, control };
    };

    const mousedown = (element) =>
      element.dispatchEvent({ type: 'mousedown', preventDefault() {} });

    it('1.48.1 a mousedown on an Item bubbles to the document listener and is not an outside click', () => {
      const { host, control } = build();
      try {
        control.items[0].toggle(true);
        control.items[0].chipView.click();
        expect(control.dropDown.open).toBe(true);
        expect(control.mode).toBe('chip');

        mousedown(control.items[1].itemView);

        expect(control.dropDown.open).toBe(true);
        expect(control.mode).toBe('chip');
        expect(control.dropDown.currentItem).toBe(control.items[0]);
      } finally {
        control.destroy();
        host.remove();
      }
    });

    it('1.48.2 a mousedown outside the control bubbles to the document listener and closes the list', () => {
      const { host, control } = build();
      try {
        control.items[0].toggle(true);
        control.items[0].chipView.click();
        expect(control.dropDown.open).toBe(true);

        mousedown(document.body);

        expect(control.dropDown.open).toBe(false);
        expect(control.mode).toBe('filter');
        expect(control.selectionBox.filter.el.readOnly).toBe(true);
      } finally {
        control.destroy();
        host.remove();
      }
    });
  });
});
