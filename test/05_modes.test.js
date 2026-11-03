import { describe, expect, it, vi } from 'vitest';
import './teardown.js';
import { MSelect, Item, RootContainer, Filter, MSELECT_INTERNALS } from '../src/m-select.js';

/**
 * Behavioural spec for m-select — input modes and the views they own.
 *
 * Areas 12-15: the select-all button, the Filter input element, the
 * Collapsed Chip, and the four modes (filter, dropdown, chip, collapsed)
 * with their labels and classes.
 */

describe('1. MSelect — Modes', () => {
  describe('12. DropDown - select all button', () => {
    const setup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [{ value: 'a', label: 'A' }],
      });
    };

    it('1.12.1 the select all button is hidden until the filter is engaged', () => {
      const control = setup();

      expect(control.dropDown.selectAllBtn).toBeTruthy();
      expect(control.dropDown.showSelectAllButton).toBe(false);
      expect(control.dropDown.selectAllBtn.style.display).toBe('none');
    });

    it('1.12.2 assigning false to showSelectAllButton hides the select all button', () => {
      const control = setup();

      control.dropDown.showSelectAllButton = false;

      expect(control.dropDown.showSelectAllButton).toBe(false);
      expect(control.dropDown.selectAllBtn.style.display).toBe('none');
    });

    it('1.12.3 assigning true to showSelectAllButton shows the select all button again', () => {
      const control = setup();

      control.dropDown.showSelectAllButton = false;
      control.dropDown.showSelectAllButton = true;

      expect(control.dropDown.showSelectAllButton).toBe(true);
      expect(control.dropDown.selectAllBtn.style.display).not.toBe('none');
    });

    const triple = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
        ],
      });
    };
    const states = (control) => [...control.items].map((i) => i.selected);

    it('1.12.4 toggling select-all with nothing selected selects every selectable Item and shows a chip for each', () => {
      const control = triple();

      control.toggleAll();

      expect(states(control)).toEqual([true, true, true]);
      expect(control.selectionBox.items.map((i) => i.value).sort()).toEqual(['a', 'b', 'c']);
    });

    it('1.12.5 selecting all again with everything selected changes nothing', () => {
      const control = triple();
      control.toggleAll();

      control.toggleAll();

      expect(states(control)).toEqual([true, true, true]);
      expect(control.selectionBox.items).toHaveLength(3);
    });

    it('1.12.6 a manually picked Item stays selected while select-all adds the rest', () => {
      const control = triple();
      control.items[0].toggle();
      expect(control.selectionBox.items.map((i) => i.value)).toEqual(['a']);

      control.toggleAll();

      expect(states(control)).toEqual([true, true, true]);
      expect(control.selectionBox.items.map((i) => i.value).sort()).toEqual(['a', 'b', 'c']);

      control.toggleAll();

      expect(states(control)).toEqual([true, true, true]);
      expect(control.selectionBox.items.map((i) => i.value).sort()).toEqual(['a', 'b', 'c']);
    });

    it('1.12.7 selecting all over a value-bearing Group selects its descendants and keeps them selected on a second pass', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            value: 'g',
            label: 'Group',
            items: [
              { value: 'a', label: 'Alpha' },
              { value: 'b', label: 'Bravo' },
            ],
          },
        ],
      });

      control.toggleAll();

      const group = control.items[0];
      expect(group.selectionState).toBe('all');
      expect(group.selected).toBe(true);
      expect(control.selectionBox.items.map((i) => i.value).sort()).toEqual(['a', 'b']);

      control.toggleAll();

      expect(group.selectionState).toBe('all');
      expect(group.selected).toBe(true);
      expect(control.selectionBox.items.map((i) => i.value).sort()).toEqual(['a', 'b']);
    });

    it('1.12.8 RootContainer.toggle mirrors Item.toggle: an explicit state forces that outcome', () => {
      const control = triple();
      control.items[0].toggle();

      control.items.toggle(true);

      expect(states(control)).toEqual([true, true, true]);
      expect(control.selectionBox.items).toHaveLength(3);

      control.items.toggle(false);

      expect(states(control)).toEqual([false, false, false]);
      expect(control.selectionBox.items).toHaveLength(0);
    });

    it('1.12.9 engaging the filter shows the select all button and clearing it hides it again', () => {
      const control = triple();
      expect(control.dropDown.showSelectAllButton).toBe(false);

      control.selectionBox.filter.query = 'a';

      expect(control.dropDown.showSelectAllButton).toBe(true);
      expect(control.dropDown.selectAllBtn.style.display).not.toBe('none');

      control.selectionBox.filter.query = '';

      expect(control.dropDown.showSelectAllButton).toBe(false);
      expect(control.dropDown.selectAllBtn.style.display).toBe('none');
    });

    it('1.12.10 with a filter active, selecting all touches only the visible Items', () => {
      const control = triple();
      control.selectionBox.filter.query = 'al';

      control.toggleAll();

      expect(states(control)).toEqual([true, false, false]);
      expect(control.selectionBox.items.map((i) => i.value)).toEqual(['a']);
    });

    it('1.12.11 with a filter active, selecting all leaves hidden Items and earlier selections exactly as they are', () => {
      const control = triple();
      control.items[2].toggle();
      control.selectionBox.filter.query = 'al';
      expect(states(control)).toEqual([false, false, true]);

      control.toggleAll();

      expect(states(control)).toEqual([true, false, true]);
      expect(control.selectionBox.items.map((i) => i.value).sort()).toEqual(['a', 'c']);

      control.selectionBox.filter.query = 'al';
      control.toggleAll();

      expect(states(control)).toEqual([true, false, true]);
      expect(control.selectionBox.items.map((i) => i.value).sort()).toEqual(['a', 'c']);
    });

    it('1.12.12 RootContainer.toggle forces the state on the visible Items only', () => {
      const control = triple();
      control.selectionBox.filter.query = 'al';

      control.items.toggle(true);

      expect(states(control)).toEqual([true, false, false]);
      expect(control.selectionBox.items.map((i) => i.value)).toEqual(['a']);
    });

    it('1.12.13 clicking select all clears the filter query and the visibility it imposed', () => {
      const control = triple();
      control.selectionBox.filter.query = 'r';
      expect(control.dropDown.showSelectAllButton).toBe(true);
      expect(control.items[0].visible).toBe(false);
      expect(control.items[1].visible).toBe(true);
      expect(control.items[2].visible).toBe(true);

      control.dropDown.selectAllBtn.click();

      expect(control.selectionBox.filter.query).toBe('');
      expect(control.dropDown.showSelectAllButton).toBe(false);
      expect([...control.items].map((i) => i.visible)).toEqual([true, true, true]);
      expect(states(control)).toEqual([false, true, true]);
    });

    it('1.12.14 a filter leaving a single visible Item hides the select all button', () => {
      const control = triple();

      control.selectionBox.filter.query = 'alp';

      expect(control.dropDown.showSelectAllButton).toBe(false);
      expect(control.dropDown.selectAllBtn.style.display).toBe('none');
    });

    it('1.12.15 a filter leaving two or more visible Items keeps the select all button', () => {
      const control = triple();

      control.selectionBox.filter.query = 'r';

      expect(control.dropDown.showSelectAllButton).toBe(true);
    });

    it('1.12.16 a filter matching nothing hides the select all button', () => {
      const control = triple();

      control.selectionBox.filter.query = 'zzz';

      expect(control.dropDown.showSelectAllButton).toBe(false);
    });

    it('1.12.17 the toolbar is hidden with the select all button and shown with it', () => {
      const control = triple();
      expect(control.dropDown.toolbarEl.style.display).toBe('none');

      control.selectionBox.filter.query = 'r';

      expect(control.dropDown.toolbarEl.style.display).not.toBe('none');

      control.selectionBox.filter.query = '';

      expect(control.dropDown.toolbarEl.style.display).toBe('none');
    });

    it('1.12.18 clicking Select All adds the visible Items and keeps those already selected', () => {
      const control = triple();
      control.items[1].toggle();
      control.selectionBox.filter.query = 'r';
      expect(states(control)).toEqual([false, true, false]);

      control.dropDown.selectAllBtn.click();

      expect(states(control)).toEqual([false, true, true]);
      expect(control.selectionBox.items.map((i) => i.value).sort()).toEqual(['b', 'c']);
    });
  });

  // requires: Filter.el input element, query/displaySelected semantics,
  // input event -> MSelect render
  describe('13. Filter input element', () => {
    const setup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [{ value: 'a', label: 'Alpha' }],
      });
    };

    it('1.13.1 component exposes a Filter object wrapping an <input type="text"> element', () => {
      const control = setup();

      expect(control.selectionBox.filter).toBeInstanceOf(Filter);
      expect(control.selectionBox.filter.el.nodeType).toBe(1);
      expect(control.selectionBox.filter.el.tagName).toBe('INPUT');
      expect(control.selectionBox.filter.el.type).toBe('text');
    });

    it('1.13.2 the Filter wires a debounced event handler to its input that calls DropDown.filter', () => {
      const control = setup();
      const dropDownFilter = vi.spyOn(control.dropDown, 'filter');
      vi.useFakeTimers();

      try {
        control.selectionBox.filter.el.value = 'alp';
        control.selectionBox.filter.el.dispatchEvent({ type: 'input' });

        expect(dropDownFilter).not.toHaveBeenCalled();

        vi.advanceTimersByTime(149);
        expect(dropDownFilter).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(dropDownFilter).toHaveBeenCalledTimes(1);
        expect(dropDownFilter).toHaveBeenCalledWith('alp');
      } finally {
        vi.useRealTimers();
      }
    });

    it('1.13.3 rapid successive input events trigger a single debounced DropDown.filter call with the last value', () => {
      const control = setup();
      const dropDownFilter = vi.spyOn(control.dropDown, 'filter');
      vi.useFakeTimers();

      try {
        const el = control.selectionBox.filter.el;
        el.value = 'a';
        el.dispatchEvent({ type: 'input' });
        el.value = 'al';
        el.dispatchEvent({ type: 'input' });
        el.value = 'alp';
        el.dispatchEvent({ type: 'input' });

        vi.advanceTimersByTime(300);

        expect(dropDownFilter).toHaveBeenCalledTimes(1);
        expect(dropDownFilter).toHaveBeenCalledWith('alp');
      } finally {
        vi.useRealTimers();
      }
    });

    it('1.13.4 displaySelected is a get/set visibility property defaulting to false', () => {
      const control = setup();

      expect(control.selectionBox.filter.displaySelected).toBe(false);

      control.selectionBox.filter.displaySelected = true;
      expect(control.selectionBox.filter.displaySelected).toBe(true);

      control.selectionBox.filter.displaySelected = false;
      expect(control.selectionBox.filter.displaySelected).toBe(false);
    });

    it('1.13.5 setting displaySelected=true calls DropDown.filter with a selected-only matcher', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }],
      });
      control.items[0].toggle(true);

      const dropDownFilter = vi.spyOn(control.dropDown, 'filter');
      control.selectionBox.filter.displaySelected = true;

      expect(dropDownFilter).toHaveBeenCalledTimes(1);
      const [text, matcher] = dropDownFilter.mock.calls[0];
      expect(text).toBe('');
      expect(typeof matcher).toBe('function');

      expect(matcher(control.items[0], '')).toBe(true);
      expect(matcher(control.items[1], '')).toBe(false);
    });

    it('1.13.6 when displaySelected is false the debounced handler passes no matcher to DropDown.filter', () => {
      const control = setup();
      control.selectionBox.filter.displaySelected = false;

      const dropDownFilter = vi.spyOn(control.dropDown, 'filter');
      vi.useFakeTimers();

      try {
        control.selectionBox.filter.el.value = 'alp';
        control.selectionBox.filter.el.dispatchEvent({ type: 'input' });
        vi.advanceTimersByTime(300);

        expect(dropDownFilter).toHaveBeenCalledTimes(1);
        expect(dropDownFilter.mock.calls[0][1]).toBeUndefined();
      } finally {
        vi.useRealTimers();
      }
    });

    it('1.13.7 Filter.query stays in sync with filter.el.value', () => {
      const control = setup();
      const filter = control.selectionBox.filter;

      expect(filter.query).toBe('');

      filter.el.value = 'app';
      expect(filter.query).toBe('app');

      filter.query = 'alp';
      expect(filter.query).toBe('alp');
      expect(filter.el.value).toBe('alp');

      filter.query = '';
      expect(filter.el.value).toBe('');
    });

    it('1.13.8 displaySelected set to true shows only selected Items at once', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
          { value: 'c', label: 'Charlie' },
        ],
      });
      control.items[0].toggle(true);

      control.selectionBox.filter.displaySelected = true;

      expect(control.items[0].visible).toBe(true);
      expect(control.items[1].visible).toBe(false);
      expect(control.items[2].visible).toBe(false);
    });

    it('1.13.9 displaySelected set to false shows every Item again', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
          { value: 'c', label: 'Charlie' },
        ],
      });
      control.items[0].toggle(true);

      control.selectionBox.filter.displaySelected = true;
      control.selectionBox.filter.displaySelected = false;

      expect(control.items[0].visible).toBe(true);
      expect(control.items[1].visible).toBe(true);
      expect(control.items[2].visible).toBe(true);
    });

    it('1.13.10 without displaySelected an empty query shows every Item', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ],
      });

      control.dropDown.filter('');

      expect(control.items[0].visible).toBe(true);
      expect(control.items[1].visible).toBe(true);
    });

    it('1.13.11 assigning query resets displaySelected to false', () => {
      const control = setup();
      control.selectionBox.filter.displaySelected = true;
      expect(control.selectionBox.filter.displaySelected).toBe(true);

      control.selectionBox.filter.query = 'alp';

      expect(control.selectionBox.filter.displaySelected).toBe(false);
    });

    it('1.13.12 typing in the input resets displaySelected to false', () => {
      const control = setup();
      control.selectionBox.filter.displaySelected = true;
      expect(control.selectionBox.filter.displaySelected).toBe(true);

      control.selectionBox.filter.el.value = 'alp';
      control.selectionBox.filter.el.dispatchEvent({ type: 'input' });

      expect(control.selectionBox.filter.displaySelected).toBe(false);
    });

    it('1.13.13 setting displaySelected to false applies the filter imposed by the current query', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
          { value: 'c', label: 'Charlie' },
        ],
      });
      const filter = control.selectionBox.filter;

      filter.query = 'alpha';
      expect(control.items[0].visible).toBe(true);
      expect(control.items[1].visible).toBe(false);
      expect(control.items[2].visible).toBe(false);

      control.items[1].selected = true;
      filter.displaySelected = true;
      expect(control.items[0].visible).toBe(false);
      expect(control.items[1].visible).toBe(true);
      expect(control.items[2].visible).toBe(false);

      filter.displaySelected = false;
      expect(control.items[0].visible).toBe(true);
      expect(control.items[1].visible).toBe(false);
      expect(control.items[2].visible).toBe(false);
    });

    it('1.13.14 the first input event opens a closed Drop Down at once, before the debounce', () => {
      const control = setup();
      vi.useFakeTimers();
      try {
        expect(control.dropDown.open).toBe(false);

        control.selectionBox.filter.el.value = 'a';
        control.selectionBox.filter.el.dispatchEvent({ type: 'input' });

        expect(control.dropDown.open).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it('1.13.15 every further input keeps the Drop Down open', () => {
      const control = setup();

      control.selectionBox.filter.el.value = 'a';
      control.selectionBox.filter.el.dispatchEvent({ type: 'input' });
      control.selectionBox.filter.el.value = 'al';
      control.selectionBox.filter.el.dispatchEvent({ type: 'input' });

      expect(control.dropDown.open).toBe(true);
    });

    it('1.13.16 assigning the query programmatically does not open the Drop Down by itself', () => {
      const control = setup();

      control.selectionBox.filter.query = 'a';

      expect(control.dropDown.open).toBe(false);
    });

    // A text query re-filters the list, and that is also the moment the Current
    // marker is re-homed: every query change puts it on the first navigable Item
    // of the new list, and a query that leaves nothing drops it. The marker is
    // not kept on an Item that happens to survive the query — the list under a
    // new query is a different list from the one it was placed on. The
    // selected-Items restriction is a re-filter too, but it has a rule of its
    // own for the marker and is deliberately left out of this.
    const triple = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
        ],
      });
    };

    it('1.13.17 typing into the Filter marks the first visible Item Current when none is set', () => {
      const control = triple();
      control.selectionBox.filter.el.click();
      expect(control.dropDown.currentItem).toBeNull();

      control.selectionBox.filter.query = 'al';

      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(control.items[0].itemView.classList.contains('cm-item--current')).toBe(true);
    });

    it('1.13.18 the marker starts on the first visible Item, stepping over the ones the query hid', () => {
      const control = triple();
      expect(control.items[0].visible).toBe(true);

      control.selectionBox.filter.query = 'ra';

      expect(control.items[0].visible).toBe(false);
      expect(control.items[1].visible).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(control.items[0].itemView.classList.contains('cm-item--current')).toBe(false);
    });

    it('1.13.19 a marker standing on a still visible Item is re-homed all the same', () => {
      const control = triple();
      control.dropDown.setCurrent(control.items[2]);
      expect(control.dropDown.currentItem).toBe(control.items[2]);

      control.selectionBox.filter.query = 'a';

      expect(control.items[0].visible).toBe(true);
      expect(control.items[2].visible).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(control.items[0].itemView.classList.contains('cm-item--current')).toBe(true);
      expect(control.items[2].itemView.classList.contains('cm-item--current')).toBe(false);
    });

    it('1.13.20 a marker on an Item the query hides moves to the first visible Item', () => {
      const control = triple();
      control.dropDown.setCurrent(control.items[2]);

      control.selectionBox.filter.query = 'al';

      expect(control.items[2].visible).toBe(false);
      expect(control.items[2].itemView.classList.contains('cm-item--current')).toBe(false);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
    });

    it('1.13.21 a query matching nothing leaves the marker on nothing', () => {
      const control = triple();
      control.dropDown.setCurrent(control.items[0]);

      control.selectionBox.filter.query = 'zz';

      expect(control.allItems.every((item) => !item.visible)).toBe(true);
      expect(control.dropDown.currentItem).toBeNull();
    });

    it('1.13.22 the debounced typing path re-homes the marker just as the query setter does', () => {
      const control = triple();
      vi.useFakeTimers();

      try {
        const el = control.selectionBox.filter.el;
        el.value = 'al';
        el.dispatchEvent({ type: 'input' });
        expect(control.dropDown.currentItem).toBeNull();

        vi.advanceTimersByTime(300);

        expect(control.dropDown.currentItem).toBe(control.items[0]);
      } finally {
        vi.useRealTimers();
      }
    });

    it('1.13.23 the selected-Items re-filter leaves the Current marker to its own rule', () => {
      const control = triple();
      control.dropDown.setCurrent(control.items[1]);
      control.items[2].toggle(true);

      control.selectionBox.filter.displaySelected = true;

      expect(control.items[1].visible).toBe(false);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.13.24 replacing the query moves the marker off a surviving Group onto the first selectable Item', () => {
      const control = new MSelect(document.createElement('div'), {
        items: [
          {
            label: 'Cities',
            items: [
              { label: 'Paris', value: 'paris' },
              { label: 'London', value: 'london' },
            ],
          },
          {
            label: 'Sandwich',
            items: [
              { label: 'Tuna', value: 'tuna' },
              { label: 'Vegetables', value: 'just-grass' },
            ],
          },
        ],
      });
      const cities = control.items[0];
      const sandwich = control.items[1];
      control.dropDown.setCurrent(sandwich);

      // "le" leaves Sandwich visible through its Vegetables child, and the marker
      // moves on to that child rather than staying on the Group.
      control.selectionBox.filter.query = 'le';
      expect(sandwich.visible).toBe(true);
      expect(control.dropDown.currentItem).toBe(sandwich[1]);

      // "nd" replaces the query in one edit. Sandwich now matches by its own
      // Label, but the first selectable Item of the new list is London.
      control.selectionBox.filter.query = 'nd';
      expect(sandwich.visible).toBe(true);
      expect(cities.visible).toBe(true);
      expect(control.dropDown.currentItem).toBe(cities[1]);
      expect(cities[1].label).toBe('London');
      expect(sandwich.itemView.classList.contains('cm-item--current')).toBe(false);
    });
  });

  // requires: options.maxVisibleChips, CollapsedChip (chipView, current,
  // update), SelectionBox.isCollapsed state, the holds-collapse anchor
  describe('14. Collapsed Chip', () => {
    const setup = (extraItems) => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { maxVisibleChips: 2 },
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
          ...(extraItems || []),
        ],
      });
      return control;
    };

    it('1.14.1 the CollapsedChip is instantiated in the SelectionBox only when maxVisibleChips is specified', () => {
      const host = document.createElement('div');
      const without = new MSelect(host, { items: [] });
      expect(without.selectionBox.collapsedChip).toBeNull();

      const withMax = setup();
      expect(withMax.selectionBox.collapsedChip).toBeTruthy();
      expect(
        withMax.selectionBox.collapsedChip.chipView.classList.contains('cm-chip--summary')
      ).toBe(true);
    });

    it('1.14.2 the CollapsedChip label shows "<N> items selected" refreshed with the selection count', () => {
      const control = setup([{ value: 'd', label: 'Delta' }]);
      for (const item of control.items) item.toggle(true);
      expect(control.selectionBox.collapsedChip.labelEl.textContent).toBe('4 items selected');

      control.unselectItem(control.items[3]);
      expect(control.selectionBox.collapsedChip.labelEl.textContent).toBe('3 items selected');
    });

    it('1.14.3 once the count exceeds maxVisibleChips, all individual chips are replaced by the single CollapsedChip', () => {
      const control = setup();
      for (const item of control.items) item.toggle(true);

      expect(control.selectionBox.chipsEl.children).toHaveLength(1);
      expect(control.selectionBox.chipsEl.children[0]).toBe(
        control.selectionBox.collapsedChip.chipView
      );
      const hasIndividualChip = [...control.items].some((item) =>
        control.selectionBox.chipsEl.children.includes(item.chipView)
      );
      expect(hasIndividualChip).toBe(false);
    });

    it('1.14.4 while count <= maxVisibleChips the individual chips are shown and the CollapsedChip is not rendered', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);

      expect(control.selectionBox.chipsEl.children).toHaveLength(2);
      expect(control.selectionBox.chipsEl.children).not.toContain(
        control.selectionBox.collapsedChip.chipView
      );
    });

    it('1.14.5 unselecting back to the limit restores the individual chips', () => {
      const control = setup();
      for (const item of control.items) item.toggle(true);
      expect(control.selectionBox.isCollapsed).toBe(true);

      control.unselectItem(control.items[0]);

      expect(control.selectionBox.isCollapsed).toBe(false);
      expect(control.selectionBox.chipsEl.children).toHaveLength(2);
      expect(control.selectionBox.chipsEl.children).toContain(control.items[1].chipView);
      expect(control.selectionBox.chipsEl.children).toContain(control.items[2].chipView);
    });

    it('1.14.6 the CollapsedChip "x" area is built like an individual Chip\'s', () => {
      const control = setup();
      for (const item of control.items) item.toggle(true);

      const chip = control.selectionBox.collapsedChip;
      // The Chip owns no Item, so its "x" is built by the Chip itself; what it has
      // to match is the markup and the affordance, which is what a click acts on.
      expect(chip.xEl.className).toBe('cm-chip__x');
      expect(chip.xEl.title).toBe('Remove');
      expect(chip.xEl.tabIndex).toBe(-1);
    });

    it('1.14.7 the CollapsedChip "current" flag toggles the cm-chip--current class on its view', () => {
      const control = setup();
      const collapsed = control.selectionBox.collapsedChip;

      collapsed.current = true;
      expect(collapsed.chipView.classList.contains('cm-chip--current')).toBe(true);

      collapsed.current = false;
      expect(collapsed.chipView.classList.contains('cm-chip--current')).toBe(false);
    });

    it('1.14.17 a Current summary Chip is marked by the very class a Current individual Chip gets', () => {
      const control = setup();
      const collapsed = control.selectionBox.collapsedChip;
      const individual = control.items[0];
      individual.toggle(true);

      individual.current = true;
      collapsed.current = true;

      // One class answers "this is the Chip the interaction is on", whichever Chip
      // it is, so that one stylesheet rule gives the Current look to all of them.
      // A class of its own here would be a second look to keep in step instead.
      expect(collapsed.chipView.className.split(' ')).toContain('cm-chip--current');
      expect(individual.chipView.className.split(' ')).toContain('cm-chip--current');
      expect(collapsed.chipView.className.split(' ')).not.toContain(
        'cm-chip--summary-current'
      );
    });

    it('1.14.8 while collapsed, the SelectionBox keeps tracking the selection and built chips (state persistence)', () => {
      const control = setup();
      for (const item of control.items) item.toggle(true);

      // The selection itself is fully tracked even while collapsed...
      expect(control.selectionBox.items).toHaveLength(3);
      expect(control.selectionBox.chip('b')).toBe(control.items[1]);
      expect(control.selectionBox.chipsEl.children).toHaveLength(1);

      // ...while individual chips are only kept for the ones actually rendered.
      expect(control.selectionBox.chips).toHaveLength(2);
    });

    it('1.14.9 add() collapses immediately once the count exceeds maxVisibleChips (no render needed)', () => {
      const control = setup();
      const [a, b, c] = [...control.items];

      a.selected = true;
      control.selectionBox.add(a);
      b.selected = true;
      control.selectionBox.add(b);
      expect(control.selectionBox.chipsEl.children).toHaveLength(2);

      c.selected = true;
      control.selectionBox.add(c);

      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(control.selectionBox.chipsEl.children).toHaveLength(1);
      expect(control.selectionBox.chipsEl.children[0]).toBe(
        control.selectionBox.collapsedChip.chipView
      );
      expect(control.selectionBox.collapsedChip.labelEl.textContent).toBe('3 items selected');
    });

    it('1.14.10 remove() expands immediately once the count drops to maxVisibleChips (no render needed)', () => {
      const control = setup();
      const [a, b, c] = [...control.items];

      for (const item of control.items) {
        item.selected = true;
        control.selectionBox.add(item);
      }
      expect(control.selectionBox.isCollapsed).toBe(true);

      c.selected = false;
      control.selectionBox.remove(c);

      expect(control.selectionBox.isCollapsed).toBe(false);
      expect(control.selectionBox.chipsEl.children).toHaveLength(2);
      expect(control.selectionBox.chipsEl.children).toContain(a.chipView);
      expect(control.selectionBox.chipsEl.children).toContain(b.chipView);
      expect(control.selectionBox.chipsEl.children).not.toContain(
        control.selectionBox.collapsedChip.chipView
      );
    });

    it('1.14.11 add()/remove() while still collapsed only refresh the summary label', () => {
      const control = setup([{ value: 'd', label: 'Delta' }]);
      for (const item of control.items) {
        item.selected = true;
        control.selectionBox.add(item);
      }
      expect(control.selectionBox.collapsedChip.labelEl.textContent).toBe('4 items selected');

      control.items[3].selected = false;
      control.selectionBox.remove(control.items[3]);

      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(control.selectionBox.collapsedChip.labelEl.textContent).toBe('3 items selected');
      expect(control.selectionBox.chipsEl.children).toHaveLength(1);
      expect(control.selectionBox.chipsEl.children[0]).toBe(
        control.selectionBox.collapsedChip.chipView
      );
    });

    it('1.14.12 no collapse is held until a Collapsed-mode interaction anchors it', () => {
      const control = setup();
      expect(control.holdsCollapse).toBe(false);
      expect(control.selectionBox.isCollapsed).toBe(false);
    });

    it('1.14.13 while anchored on the Collapsed chip, remove() keeps it while an Item remains', () => {
      const control = setup([{ value: 'd', label: 'Delta' }]);
      for (const item of control.items) {
        item.selected = true;
        control.selectionBox.add(item);
      }
      expect(control.selectionBox.isCollapsed).toBe(true);

      control.switchMode('collapsed');
      expect(control.holdsCollapse).toBe(true);

      control.items[3].selected = false;
      control.selectionBox.remove(control.items[3]);
      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(control.selectionBox.chipsEl.children).toHaveLength(1);
      expect(control.selectionBox.chipsEl.children[0]).toBe(
        control.selectionBox.collapsedChip.chipView
      );
      expect(control.selectionBox.collapsedChip.labelEl.textContent).toBe('3 items selected');

      control.items[2].selected = false;
      control.selectionBox.remove(control.items[2]);
      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(control.selectionBox.chipsEl.children).toHaveLength(1);
      expect(control.selectionBox.collapsedChip.labelEl.textContent).toBe('2 items selected');
    });

    it('1.14.14 while anchored on the Collapsed chip, removing the last Item expands the box', () => {
      const control = setup();
      for (const item of control.items) {
        item.selected = true;
        control.selectionBox.add(item);
      }
      expect(control.selectionBox.isCollapsed).toBe(true);

      control.switchMode('collapsed');
      expect(control.holdsCollapse).toBe(true);

      for (const item of [...control.items].reverse()) {
        item.selected = false;
        control.selectionBox.remove(item);
      }

      expect(control.selectionBox.isCollapsed).toBe(false);
      expect(control.selectionBox.chipsEl.children).toHaveLength(0);
      expect(control.selectionBox.chipsEl.children).not.toContain(
        control.selectionBox.collapsedChip.chipView
      );
    });

    it('1.14.15 removing a Group with no value leaves Current where it is', () => {
      // A Group carrying no value is never added to the box, so unselecting it
      // as a whole must not be mistaken for a chip vacating its slot: other
      // chips are still there and the marker must not be handed to one.
      const control = setup([
        { label: 'Cities', items: [{ value: 'p', label: 'Paris' }] },
      ]);
      const cities = control.items[3];
      const alpha = control.items[0];

      alpha.toggle(true);
      cities.toggle();
      expect(control.selectionBox.items.map((i) => i.label)).toEqual(['Alpha', 'Paris']);
      control.dropDown.setCurrent(cities);

      cities.toggle();

      expect(control.selectionBox.items.map((i) => i.label)).toEqual(['Alpha']);
      expect(control.dropDown.currentItem).toBe(cities);
      expect(alpha.current).toBe(false);
    });

    it('1.14.16 the summary Chip carries its own "x" removal area, like any other Chip', () => {
      const control = setup();
      for (const item of control.items) item.toggle(true);
      const chip = control.selectionBox.collapsedChip;

      // The label sits in a span of its own so that the count and the "x" do not
      // share one text node, which is what an individual Chip's markup does too.
      expect(chip.labelEl.textContent).toBe('3 items selected');
      expect(chip.chipView.children[0]).toBe(chip.labelEl);
      expect(chip.chipView.children[1]).toBe(chip.xEl);
    });
  });

  // requires: Modes state machine + MSELECT_INTERNALS symbol, per-part click
  // routing on the SelectionBox, filter input readOnly/focus toggling,
  // clearAll -> no Current item, document mousedown -> close
  describe('15. Modes', () => {
    const setup = (items) => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items:
          items ||
          [
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Bravo' },
            { value: 'c', label: 'Charlie' },
          ],
      });
      return control;
    };

    const setupCollapsed = () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { maxVisibleChips: 2 },
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
          { value: 'd', label: 'Delta' },
        ],
      });
      return control;
    };

    const modes = (control) => control[MSELECT_INTERNALS].modes;
    const isOpen = (control) =>
      control.dropDown.open;

    it('1.15.1 the internal Modes object is reachable only through the exported symbol and defaults to "filter"', () => {
      const control = setup();
      expect(Object.keys(control)).not.toContain('modes');
      expect(typeof MSELECT_INTERNALS).toBe('symbol');
      expect(control[MSELECT_INTERNALS]).toBeTruthy();
      expect(modes(control).mode).toBe('filter');
      expect(control.selectionBox.filter.el.readOnly).toBe(true);
    });

    it('1.15.2 clicking the Filter enters the filter mode, opens the DropDown and enables the input caret', () => {
      const control = setup();
      const input = control.selectionBox.filter.el;
      expect(input.readOnly).toBe(true);

      control.selectionBox.el.dispatchEvent({ type: 'click', target: input });

      expect(modes(control).mode).toBe('filter');
      expect(isOpen(control)).toBe(true);
      expect(input.readOnly).toBe(false);
      expect(input.focused).toBe(true);
    });

    it('1.15.3 clicking a Chip enters the chip mode, marks it Current, scrolls it into view and hides the caret', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      const item = control.items[0];

      item.chipView.click();

      expect(modes(control).mode).toBe('chip');
      expect(isOpen(control)).toBe(true);
      expect(control.dropDown.currentItem).toBe(item);
      expect(item.current).toBe(true);
      expect(item.itemView.classList.contains('cm-item--current')).toBe(true);
      expect(item.itemView.scrollIntoViewCalls).toBe(1);
      expect(control.selectionBox.filter.el.readOnly).toBe(true);
    });

    it('1.15.4 clicking the CollapsedChip enters the collapsed mode and shows only selected Items in the DropDown', () => {
      const control = setupCollapsed();
      for (const item of [...control.items].slice(0, 3)) item.toggle(true);
      expect(control.selectionBox.isCollapsed).toBe(true);

      control.selectionBox.el.dispatchEvent({
        type: 'click',
        target: control.selectionBox.collapsedChip.chipView,
      });

      expect(modes(control).mode).toBe('collapsed');
      expect(isOpen(control)).toBe(true);
      expect(control.selectionBox.filter.displaySelected).toBe(true);
      expect(control.items[0].visible).toBe(true);
      expect(control.items[3].visible).toBe(false);
      expect(control.selectionBox.filter.el.readOnly).toBe(true);
    });

    it('1.15.5 clicking RemoveAll clears the selection and the Current marker, opens the DropDown and enters the filter mode', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      control.dropDown.setCurrent(control.items[0]);
      expect(control.selectedItems).toHaveLength(2);

      control.selectionBox.el.dispatchEvent({
        type: 'click',
        target: control.selectionBox.clearBtn,
      });

      expect(control.selectedItems).toHaveLength(0);
      expect(control.dropDown.currentItem).toBeNull();
      expect(isOpen(control)).toBe(true);
      expect(modes(control).mode).toBe('filter');
      expect(control.selectionBox.filter.el.readOnly).toBe(false);
    });

    it('1.15.10 clicking RemoveAll also removes every chip from the selection box', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      expect(control.selectionBox.items).toHaveLength(2);

      control.selectionBox.el.dispatchEvent({
        type: 'click',
        target: control.selectionBox.clearBtn,
      });

      expect(control.selectionBox.items).toHaveLength(0);
      expect(control.selectionBox.chips).toHaveLength(0);
    });

    it('1.15.11 a mousedown inside the control leaves the DropDown and the mode alone', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[0].chipView.click();
      expect(isOpen(control)).toBe(true);
      expect(modes(control).mode).toBe('chip');

      // Dispatched at the document, which is where the listener sits, but aimed
      // at a node the control holds: the outside-click handler has to tell a
      // pointer inside the control from one outside it, and that is the one
      // thing this test pins - the source of the event, not its effects.
      document.dispatchEvent({ type: 'mousedown', target: control.items[1].itemView });

      expect(isOpen(control)).toBe(true);
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[0]);
    });

    it('1.15.6 clicking outside the control closes the DropDown and returns to the default filter mode', () => {
      const control = setup();
      control.items[0].toggle(true);

      control.items[0].chipView.click();
      expect(modes(control).mode).toBe('chip');
      expect(isOpen(control)).toBe(true);

      document.dispatchEvent({ type: 'mousedown' });

      expect(isOpen(control)).toBe(false);
      expect(modes(control).mode).toBe('filter');
      expect(control.selectionBox.filter.el.readOnly).toBe(true);
    });

    it('1.15.7 clicking outside the control also resets the "show only selected" display', () => {
      const control = setupCollapsed();
      for (const item of [...control.items].slice(0, 3)) item.toggle(true);

      control.selectionBox.el.dispatchEvent({
        type: 'click',
        target: control.selectionBox.collapsedChip.chipView,
      });
      expect(control.selectionBox.filter.displaySelected).toBe(true);

      document.dispatchEvent({ type: 'mousedown' });

      expect(control.selectionBox.filter.displaySelected).toBe(false);
      expect(control.items[3].visible).toBe(true);
    });

    it('1.15.8 consequent clicks keep switching the active mode (chip -> filter -> chip)', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);

      control.items[0].chipView.click();
      expect(modes(control).mode).toBe('chip');

      control.selectionBox.el.dispatchEvent({
        type: 'click',
        target: control.selectionBox.filter.el,
      });
      expect(modes(control).mode).toBe('filter');

      control.items[1].chipView.click();
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.15.9 clicking the Filter after the CollapsedChip resets the "show only selected" display', () => {
      const control = setupCollapsed();
      for (const item of [...control.items].slice(0, 3)) item.toggle(true);

      control.selectionBox.el.dispatchEvent({
        type: 'click',
        target: control.selectionBox.collapsedChip.chipView,
      });
      expect(control.selectionBox.filter.displaySelected).toBe(true);

      control.selectionBox.el.dispatchEvent({
        type: 'click',
        target: control.selectionBox.filter.el,
      });

      expect(modes(control).mode).toBe('filter');
      expect(control.selectionBox.filter.displaySelected).toBe(false);
      expect(control.items[3].visible).toBe(true);
    });
  });
});
