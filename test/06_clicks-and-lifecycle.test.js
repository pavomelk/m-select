import { describe, expect, it, vi } from 'vitest';
import './teardown.js';
import { MSelect, Item, Filter, MSELECT_INTERNALS, specLog } from '../src/m-select.js';

/**
 * Behavioural spec for m-select — pointer, focus and construction.
 *
 * Areas 16-21: view click handlers, the Chip removal successor, the single
 * Tab stop, keyboard entry into Filter mode, the mode lifecycle, and
 * instantiation with delayed load and events.
 */

describe('1. MSelect — Clicks, focus and lifecycle', () => {
  describe('16. View click handlers', () => {
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

    const modes = (control) => control[MSELECT_INTERNALS].modes;
    const isOpen = (control) =>
      control.dropDown.open;

    it('1.16.1 clicking the Item view toggles its selection, adds its Chip and marks it Current', () => {
      const control = setup();
      const item = control.items[0];
      expect(item.selected).toBe(false);

      item.itemView.click();

      expect(item.selected).toBe(true);
      expect(control.selectedItems).toContain(item);
      expect(control.selectionBox.chipsEl.children).toContain(item.chipView);
      expect(control.dropDown.currentItem).toBe(item);
      expect(modes(control).mode).toBe('dropdown');
    });

    it('1.16.2 clicking the Item view again unselects and removes its Chip', () => {
      const control = setup();
      const item = control.items[0];
      item.itemView.click();
      expect(item.selected).toBe(true);

      item.itemView.click();

      expect(item.selected).toBe(false);
      expect(control.selectionBox.chipsEl.children).not.toContain(item.chipView);
    });

    it('1.16.3 clicking a Chip body marks it Current and enters Chip mode without unselecting', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      const item = control.items[0];

      item.chipView.click();

      expect(item.selected).toBe(true);
      expect(control.dropDown.currentItem).toBe(item);
      expect(item.current).toBe(true);
      expect(item.itemView.classList.contains('cm-item--current')).toBe(true);
      expect(item.itemView.scrollIntoViewCalls).toBe(1);
      expect(modes(control).mode).toBe('chip');
      expect(isOpen(control)).toBe(true);
      expect(control.selectionBox.filter.el.readOnly).toBe(true);
    });

    it('1.16.4 clicking the Chip "x" area unselects without marking it Current or switching modes', () => {
      const control = setup();
      control.items[0].toggle(true);
      const item = control.items[0];
      expect(item.selected).toBe(true);

      const x = item.chipView.children.find((el) =>
        el.classList.contains('cm-chip__x')
      );
      expect(x).toBeTruthy();

      x.click();

      expect(item.selected).toBe(false);
      expect(control.selectedItems).not.toContain(item);
      expect(control.dropDown.currentItem).not.toBe(item);
      expect(modes(control).mode).toBe('filter');
    });

    it('1.16.5 clicking a Group Item view toggles its children and marks the group Current', () => {
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
      const group = control.items[0];
      expect(group.isGroup).toBe(true);

      group.itemView.click();

      expect(group[0].selected).toBe(true);
      expect(group[1].selected).toBe(true);
      expect(control.dropDown.currentItem).toBe(group);
      expect(modes(control).mode).toBe('dropdown');
    });

    it('1.16.6 clicking a child Item view does not bubble into (and toggle) the enclosing Group', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            value: 'g',
            label: 'Group',
            items: [
              { value: 'a', label: 'Alpha' },
              { value: 'b', label: 'Bravo' },
              { value: 'c', label: 'Charlie' },
            ],
          },
        ],
      });
      const group = control.items[0];
      group.toggle(true);
      expect([...group].map((i) => i.selected)).toEqual([true, true, true]);
      expect(group.selected).toBe(true);

      group[1].itemView.click();

      expect(group[1].selected).toBe(false);
      expect(group[0].selected).toBe(true);
      expect(group[2].selected).toBe(true);
      expect(control.dropDown.currentItem).toBe(group[1]);
    });

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
    const collapsed = (control) => {
      for (const item of control.items) item.toggle(true);
      return control.selectionBox.collapsedChip;
    };

    it('1.16.7 clicking the summary Chip opens the DropDown and marks the Chip Current', () => {
      const control = collapsedSetup();
      const chip = collapsed(control);

      chip.chipView.click();

      expect(modes(control).mode).toBe('collapsed');
      expect(isOpen(control)).toBe(true);
      expect(chip.current).toBe(true);
    });

    it('1.16.8 clicking the summary Chip again closes the open DropDown', () => {
      const control = collapsedSetup();
      const chip = collapsed(control);

      chip.chipView.click();
      expect(isOpen(control)).toBe(true);

      chip.chipView.click();

      expect(isOpen(control)).toBe(false);
      expect(modes(control).mode).toBe('collapsed');
      expect(chip.current).toBe(true);
    });

    it('1.16.9 clicking the summary Chip "x" unselects everything and does not toggle the DropDown', () => {
      const control = collapsedSetup();
      const chip = collapsed(control);
      chip.chipView.click();
      expect(isOpen(control)).toBe(true);

      chip.xEl.click();

      expect(control.selectedItems).toHaveLength(0);
      expect(control.selectionBox.isCollapsed).toBe(false);
      // The "x" is inside the Chip, so it must not reach the Chip's own handler.
      expect(isOpen(control)).toBe(true);
    });
  });

  // requires: SelectionBox removal handing "Current" to the Chip that takes
  // the vacated slot; guard so chip/"x" clicks do not reach the SelectionBox
  // delegation's fallback (no DropDown open / no mode change)
  describe('17. Chip removal successor', () => {
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

    const modes = (control) => control[MSELECT_INTERNALS].modes;
    const isOpen = (control) =>
      control.dropDown.open;

    const xOf = (item) =>
      item.chipView.children.find((el) => el.classList.contains('cm-chip__x'));

    it('1.17.1 removing the Current chip hands "Current" to the chip that takes its slot', () => {
      const control = setup();
      for (const item of control.items) item.toggle(true);
      control.dropDown.setCurrent(control.items[1]);
      expect(control.dropDown.currentItem).toBe(control.items[1]);

      xOf(control.items[1]).click();

      expect(control.items[1].selected).toBe(false);
      expect(control.dropDown.currentItem).toBe(control.items[2]);
    });

    it('1.17.2 removing the last Current chip hands "Current" to the previous chip', () => {
      const control = setup();
      for (const item of control.items) item.toggle(true);
      control.dropDown.setCurrent(control.items[2]);

      xOf(control.items[2]).click();

      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.17.3 removing the only remaining Current chip leaves Current on that Item', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.dropDown.setCurrent(control.items[0]);

      xOf(control.items[0]).click();

      // No chip is left to hand "Current" over to, so the marker stays where the
      // user put it rather than being dropped.
      expect(control.selectionBox.items).toHaveLength(0);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(control.items[0].current).toBe(true);
    });

    it('1.17.4 removing a chip that is not Current leaves "Current" untouched', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      control.dropDown.setCurrent(control.items[1]);

      xOf(control.items[0]).click();

      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.17.5 an "x" click bubbling into the Selection Box neither opens the DropDown nor switches mode', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);

      control.selectionBox.el.dispatchEvent({
        type: 'click',
        target: xOf(control.items[0]),
      });

      expect(isOpen(control)).toBe(false);
      expect(modes(control).mode).toBe('filter');
    });

    it('1.17.7 unselecting the last selected Item leaves Current on that Item', () => {
      const control = setup();
      control.items[1].toggle(true);
      control.dropDown.setCurrent(control.items[1]);

      control.unselectItem(control.items[1]);

      expect(control.selectedItems).toHaveLength(0);
      // No chip is left to promote to, and the Item just unselected is still in
      // the list, so the marker stays where the user left it.
      expect(control.selectionBox.items).toHaveLength(0);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(control.items[1].current).toBe(true);
    });
  });

  describe('18. Single Tab stop (keyboard entry)', () => {
    const setup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
        ],
      });
    };

    const tabStops = (root) => {
      const stops = [];
      const walk = (el) => {
        if (el.tabIndex >= 0) stops.push(el);
        (el.children || []).forEach(walk);
      };
      walk(root);
      return stops;
    };

    it('1.18.1 the whole component offers exactly one Tab stop — the Filter input', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ value: 'a', label: 'Alpha' }],
      });

      const stops = tabStops(control.el);

      expect(stops).toEqual([control.selectionBox.filter.el]);
      expect(control.selectionBox.filter.el.tabIndex).toBe(0);
    });

    it('1.18.2 the RemoveAll button is not a Tab stop', () => {
      const control = setup();
      expect(control.selectionBox.clearBtn.tabIndex).toBeLessThan(0);
    });

    it('1.18.3 the select-all button is not a Tab stop', () => {
      const control = setup();
      expect(control.dropDown.selectAllBtn.tabIndex).toBeLessThan(0);
    });

    it('1.18.4 the chip removal "x" buttons are not Tab stops', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);

      for (const item of control.items) {
        const x = item.chipView.children.find((c) => c.className.includes('cm-chip__x'));
        expect(x).toBeTruthy();
        expect(x.tabIndex).toBeLessThan(0);
      }
      expect(tabStops(control.el)).toEqual([control.selectionBox.filter.el]);
    });

    it('1.18.5 item views (leaf and Group) are not Tab stops', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'g', label: 'Group', items: [{ value: 'b', label: 'Bravo' }] },
        ],
      });

      for (const item of control.allItems) {
        expect(item.itemView.tabIndex).toBeLessThan(0);
      }
      expect(tabStops(control.el)).toEqual([control.selectionBox.filter.el]);
    });
  });

  describe('19. Keyboard - focus enters Filter mode, ArrowDown opens the DropDown', () => {
    const setup = (items) => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items:
          items ||
          [
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Bravo' },
            { value: 'c', label: 'Charlie' },
          ],
      });
    };
    const modes = (control) => control[MSELECT_INTERNALS].modes;
    const isOpen = (control) =>
      control.dropDown.open;
    const keydown = (element, key) =>
      element.dispatchEvent({
        type: 'keydown',
        key,
        preventDefault() {},
      });

    it('1.19.1 focusing the Filter enters Filter mode with the caret enabled', () => {
      const control = setup();
      control.dropDown.open = true;
      control.selectionBox.filter.el.dispatchEvent({ type: 'focus' });

      expect(modes(control).mode).toBe('filter');
      expect(control.selectionBox.filter.el.readOnly).toBe(false);
    });

    it('1.19.2 ArrowDown in Filter mode opens a closed DropDown, makes the first visible item Current and enters DropDown mode', () => {
      const control = setup();
      expect(isOpen(control)).toBe(false);
      expect(control.dropDown.currentItem).toBeNull();
      expect(modes(control).mode).toBe('filter');

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(isOpen(control)).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(modes(control).mode).toBe('dropdown');
    });

    it('1.19.3 ArrowDown in Filter mode applies the list movement to an existing marker, entering DropDown mode on the next visible Item', () => {
      const control = setup();
      control.dropDown.open = true;
      control.items[1].toggle(true);
      control.dropDown.setCurrent(control.items[1]);

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(isOpen(control)).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[2]);
      expect(modes(control).mode).toBe('dropdown');
    });

    it('1.19.4 ArrowDown respects the filter and enters DropDown mode: with no marker set, the first visible one is Current', () => {
      const control = setup();
      control.selectionBox.filter.query = 'r'; // visible: Bravo, Charlie
      control.dropDown.clearCurrent();

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(isOpen(control)).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(modes(control).mode).toBe('dropdown');
    });

    it('1.19.5 ArrowDown after a query walks the marker the query left standing on to the next visible Item', () => {
      const control = setup();
      control.selectionBox.filter.query = 'r'; // re-homes the marker to Bravo
      expect(control.dropDown.currentItem).toBe(control.items[1]);

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(isOpen(control)).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[2]);
      expect(modes(control).mode).toBe('dropdown');
    });
  });

  describe('20. Modes lifecycle', () => {
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
    const modes = (control) => control[MSELECT_INTERNALS].modes;

    it('1.20.1 switching via Modes.current runs the transitions: its onLeave/onEntry hooks own the caret and the display state', () => {
      const control = setup();
      const input = control.selectionBox.filter.el;

      modes(control).current = 'collapsed';
      expect(control.selectionBox.filter.displaySelected).toBe(true);
      expect(input.readOnly).toBe(true);

      modes(control).current = 'filter';
      expect(control.selectionBox.filter.displaySelected).toBe(false);
      expect(input.readOnly).toBe(false);
    });

    it('1.20.2 switching to the already active mode is a no-op', () => {
      const control = setup();
      const input = control.selectionBox.filter.el;
      expect(input.readOnly).toBe(true);

      modes(control).current = 'filter';

      expect(modes(control).mode).toBe('filter');
      expect(input.readOnly).toBe(true);
    });

    it('1.20.3 switching to an unknown mode throws', () => {
      const control = setup();
      expect(() => {
        modes(control).current = 'bogus';
      }).toThrow();
    });

    it('1.20.4 changeToPrevious returns to the mode that was active before the transition', () => {
      const control = setup();
      const input = control.selectionBox.filter.el;

      modes(control).current = 'collapsed';
      expect(modes(control).previous).toBe('filter');

      modes(control).changeToPrevious();

      expect(modes(control).mode).toBe('filter');
      expect(control.selectionBox.filter.displaySelected).toBe(false);
      expect(input.readOnly).toBe(false);
    });

    it('1.20.5 previous tracks multi-step transitions so changeToPrevious undoes the last step', () => {
      const control = setup();

      modes(control).current = 'dropdown';
      modes(control).current = 'collapsed';
      expect(modes(control).mode).toBe('collapsed');
      expect(modes(control).previous).toBe('dropdown');

      modes(control).changeToPrevious();
      expect(modes(control).mode).toBe('dropdown');
    });

    it('1.20.6 a transition requested directly on the machine emits cm-mode-change {from, to}', () => {
      const control = setup();
      const seen = [];
      control.el.addEventListener('cm-mode-change', (e) => seen.push(e.detail));

      modes(control).current = 'collapsed';

      expect(seen).toEqual([{ from: 'filter', to: 'collapsed' }]);
    });

    it('1.20.7 same-mode assignment stays silent and changeToPrevious emits the return transition', () => {
      const control = setup();
      const seen = [];
      control.el.addEventListener('cm-mode-change', (e) => seen.push(e.detail));

      modes(control).current = 'collapsed';
      modes(control).current = 'collapsed';
      modes(control).changeToPrevious();

      expect(seen).toEqual([
        { from: 'filter', to: 'collapsed' },
        { from: 'collapsed', to: 'filter' },
      ]);
    });

    it('1.20.8 leaving Filter mode hides the caret but keeps the focus on the Filter for the whole session', () => {
      const control = setup();
      const input = control.selectionBox.filter.el;

      input.focus();
      modes(control).current = 'chip';
      expect(input.readOnly).toBe(true);
      expect(document.activeElement).toBe(input);

      modes(control).current = 'filter';
      expect(input.readOnly).toBe(false);
      expect(document.activeElement).toBe(input);
    });
  });

  // requires: setItems + delayedLoad, cm-* CustomEvents, one-shot items
  // request, preset-selection seeding, lazy chipViews, preset safeguard
  describe('21. Instantiation, delayedLoad and events', () => {
    const DEFAULT_ITEMS = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Bravo' },
      { value: 'c', label: 'Charlie' },
    ];
    const setup = (options, items) => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: items || DEFAULT_ITEMS,
        options,
      });
      return control;
    };
    const collect = (control, ...types) => {
      const seen = [];
      types.forEach((type) =>
        control.el.addEventListener(type, (e) =>
          seen.push({ type: e.type, detail: e.detail })
        )
      );
      return seen;
    };
    const isOpen = (control) =>
      control.dropDown.open;

    it('1.21.1 by default (no delayedLoad) Items are present at construction and a preset selected:true spec already shows its Chip', () => {
      const control = new MSelect(document.createElement('div'), {
        items: [
          { value: 'a', label: 'Alpha', selected: true },
          { value: 'b', label: 'Bravo' },
        ],
      });

      expect(control.dropDown.itemsEl.children.length).toBe(2);
      expect(control.selectedItems).toHaveLength(1);
      expect(Array.from(control.selectionBox.chipsEl.children)).toContain(
        control.items[0].chipView
      );
    });

    it('1.21.2 delayedLoad:true constructs the component empty; setItems later instantiates the tree and the selection', () => {
      const control = setup({ delayedLoad: true });

      expect(control.dropDown.itemsEl.children.length).toBe(0);
      expect(control.selectedItems).toHaveLength(0);

      control.setItems([
        { value: 'a', label: 'Alpha', selected: true },
        { value: 'b', label: 'Bravo' },
      ]);

      expect(control.dropDown.itemsEl.children.length).toBe(2);
      expect(control.selectedItems).toHaveLength(1);
      expect(Array.from(control.selectionBox.chipsEl.children)).toContain(
        control.items[0].chipView
      );
    });

    it('1.21.3 with delayedLoad:true the cm-items-request event fires once when the Filter receives focus', () => {
      const control = setup({ delayedLoad: true });
      const seen = collect(control, 'cm-items-request');

      control.selectionBox.filter.el.dispatchEvent({ type: 'focus' });
      control.selectionBox.filter.el.dispatchEvent({ type: 'focus' });

      expect(seen).toHaveLength(1);
      control.destroy();
    });

    it('1.21.4 with delayedLoad:true the cm-items-request event also fires on first DropDown open, but not again on re-open', () => {
      const control = setup({ delayedLoad: true });
      const seen = collect(control, 'cm-items-request');

      control.dropDown.open = true;
      control.dropDown.open = true;

      expect(seen).toHaveLength(1);
      control.destroy();
    });

    it('1.21.5 with delayedLoad:true a toggleAll/clearAll attempt against the empty tree raises the request, once across all triggers', () => {
      const viaToggle = (() => {
        const control = setup({ delayedLoad: true });
        const seen = collect(control, 'cm-items-request');
        control.toggleAll();
        expect(seen).toHaveLength(1);
        control.clearAll();
        expect(seen).toHaveLength(1);
        control.destroy();
        return seen;
      })();
      expect(viaToggle).toHaveLength(1);

      const viaClear = (() => {
        const control = setup({ delayedLoad: true });
        const seen = collect(control, 'cm-items-request');
        control.clearAll();
        expect(seen).toHaveLength(1);
        control.destroy();
        return seen;
      })();
      expect(viaClear).toHaveLength(1);
    });

    it('1.21.6 without delayedLoad no cm-items-request is ever emitted', () => {
      const control = setup();
      const seen = collect(control, 'cm-items-request');

      control.selectionBox.filter.el.dispatchEvent({ type: 'focus' });
      control.dropDown.open = true;

      expect(seen).toHaveLength(0);
    });

    it('1.21.7 setItems into the empty component emits cm-items-set with the instantiated item count', () => {
      const control = setup({ delayedLoad: true });
      const seen = collect(control, 'cm-items-set');

      control.setItems([
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Bravo' },
      ]);

      expect(seen).toEqual([{ type: 'cm-items-set', detail: { count: 2 } }]);
    });

    it('1.21.8 after setItems there is no further items request', () => {
      const control = setup({ delayedLoad: true });
      control.setItems(DEFAULT_ITEMS);
      const seen = collect(control, 'cm-items-request');

      control.selectionBox.filter.el.dispatchEvent({ type: 'focus' });
      control.dropDown.open = true;

      expect(seen).toHaveLength(0);
    });

    it('1.21.9 a second setItems call throws: the tree can only be instantiated once', () => {
      const control = setup({ delayedLoad: true });
      control.setItems(DEFAULT_ITEMS);
      const first = control.items[0];

      expect(() => control.setItems([{ value: 'x', label: 'Other' }])).toThrow(
        /only be populated once/
      );

      expect(control.items[0]).toBe(first);
      expect(control.dropDown.itemsEl.children.length).toBe(3);
    });

    it('1.21.10 setItems seeds the selection from the new specs and starts with a cleared Current and a collapse state matching the seeded count', () => {
      const control = setup({ delayedLoad: true, maxVisibleChips: 2 });
      control.setItems([
        { value: 'a', label: 'Alpha', selected: true },
        { value: 'b', label: 'Bravo', selected: true },
        { value: 'c', label: 'Charlie', selected: true },
      ]);

      expect(control.dropDown.currentItem).toBeNull();
      expect(control.selectionBox.items).toHaveLength(3);
      expect(control.selectionBox.isCollapsed).toBe(true);
    });

    it('1.21.11 cm-dropdown-open and cm-dropdown-close fire when the DropDown opens and closes', () => {
      const control = setup();
      const seen = collect(control, 'cm-dropdown-open', 'cm-dropdown-close');

      control.dropDown.open = true;
      expect(isOpen(control)).toBe(true);
      control.dropDown.open = false;
      expect(isOpen(control)).toBe(false);

      expect(seen.map((e) => e.type)).toEqual(['cm-dropdown-open', 'cm-dropdown-close']);
    });

    it('1.21.12 cm-mode-change fires with {from, to} on a real mode transition', () => {
      const control = setup({ maxVisibleChips: 2 });
      for (const item of [...control.items].slice(0, 3)) item.toggle(true);
      const seen = collect(control, 'cm-mode-change');

      control.selectionBox.el.dispatchEvent({
        type: 'click',
        target: control.selectionBox.collapsedChip.chipView,
      });

      expect(seen).toEqual([{ type: 'cm-mode-change', detail: { from: 'filter', to: 'collapsed' } }]);
    });

    // The root element carries the active mode as a class so the stylesheet can
    // tell one mode from another. cm-dropdown--open cannot stand in for it: the
    // DropDown is open in Chip and Collapsed mode too, between the press that
    // opens it and the one that hands over to DropDown mode.
    const modeClasses = (control) =>
      ['filter', 'chip', 'collapsed', 'dropdown'].filter((mode) =>
        control.el.classList.contains(`cm-select--mode-${mode}`)
      );

    it('1.21.33 the root element carries the initial mode as a class', () => {
      const control = setup({ maxVisibleChips: 2 });

      expect(control.el.classList.contains('cm-select--mode-filter')).toBe(true);
      expect(modeClasses(control)).toEqual(['filter']);
    });

    it('1.21.34 a mode transition swaps the class over to the new mode', () => {
      const control = setup({ maxVisibleChips: 2 });
      for (const item of [...control.items].slice(0, 3)) item.toggle(true);
      control.selectionBox.el.dispatchEvent({
        type: 'click',
        target: control.selectionBox.collapsedChip.chipView,
      });

      expect(modeClasses(control)).toEqual(['collapsed']);
      expect(control.el.classList.contains('cm-select--mode-filter')).toBe(false);
    });

    it('1.21.35 exactly one mode class is present at a time, over a run of transitions', () => {
      const control = setup({ maxVisibleChips: 2 });
      for (const item of [...control.items].slice(0, 3)) item.toggle(true);
      const filter = control.selectionBox.filter.el;
      const keydown = (key) => filter.dispatchEvent({ type: 'keydown', key, preventDefault() {} });

      keydown('ArrowLeft');
      expect(modeClasses(control)).toEqual(['collapsed']);

      // The DropDown is still closed here, so the first ArrowDown only opens it.
      keydown('ArrowDown');
      expect(control.dropDown.open).toBe(true);
      expect(modeClasses(control)).toEqual(['collapsed']);

      keydown('ArrowDown');
      expect(modeClasses(control)).toEqual(['dropdown']);

      keydown('Escape');
      expect(modeClasses(control)).toEqual(['filter']);

      keydown('ArrowLeft');
      expect(modeClasses(control)).toEqual(['collapsed']);

      keydown('ArrowRight');
      expect(modeClasses(control)).toEqual(['filter']);
    });

    it('1.21.36 the mode class names DropDown mode while the DropDown is open in another mode', () => {
      const control = setup({ maxVisibleChips: 2 });
      for (const item of [...control.items].slice(0, 3)) item.toggle(true);
      const filter = control.selectionBox.filter.el;
      const keydown = (key) => filter.dispatchEvent({ type: 'keydown', key, preventDefault() {} });

      keydown('ArrowLeft');
      keydown('ArrowDown');

      expect(control.dropDown.open).toBe(true);
      expect(control.dropDown.el.classList.contains('cm-dropdown--open')).toBe(true);
      expect(modeClasses(control)).toEqual(['collapsed']);
      expect(control.el.classList.contains('cm-select--mode-dropdown')).toBe(false);
    });

    it('1.21.13 an Item builds its ChipView only when rendered as an individual chip; collapsed-away and unselected Items stay unbuilt', () => {
      const control = setup({ maxVisibleChips: 1 });
      expect(control.items[0].chipView).toBeNull();
      expect(control.items[1].chipView).toBeNull();

      control.items[0].toggle(true);
      expect(control.selectionBox.isCollapsed).toBe(false);
      expect(control.items[0].chipView).toBeTruthy();
      expect(control.items[1].chipView).toBeNull();

      control.items[1].toggle(true);
      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(control.items[1].chipView).toBeNull();

      control.items[2].toggle(true);
      expect(control.items[2].chipView).toBeNull();
    });

    it('1.21.14 preset selection above 50 with maxVisibleChips left null enforces maxVisibleChips=25 and collapses to the summary chip, keeping every selected Item', () => {
      const many = Array.from({ length: 60 }, (_, i) => ({
        value: `v${i}`,
        label: `Item ${i}`,
        selected: true,
      }));
      const control = setup({ delayedLoad: true });
      control.setItems(many);

      expect(control.selectedItems).toHaveLength(60);
      expect(control.options.maxVisibleChips).toBe(25);
      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(
        control.selectionBox.chipsEl.children.includes(
          control.selectionBox.collapsedChip.chipView
        )
      ).toBe(true);
      expect(control.items[0].chipView).toBeNull();
    });

    it('1.21.15 a preset selection of 50 or fewer leaves maxVisibleChips null and renders individual chips', () => {
      const fifty = Array.from({ length: 50 }, (_, i) => ({
        value: `v${i}`,
        label: `Item ${i}`,
        selected: true,
      }));
      const control = setup({ delayedLoad: true });
      control.setItems(fifty);

      expect(control.selectedItems).toHaveLength(50);
      expect(control.options.maxVisibleChips).toBeNull();
      expect(control.selectionBox.isCollapsed).toBe(false);
      expect(control.selectionBox.chips).toHaveLength(50);
    });

    it('1.21.31 a "selected: true" flag on a Group selects its selectable descendants, not the Group itself', () => {
      const control = setup(
        {},
        [
          {
            label: 'Europe',
            selected: true,
            items: [
              { value: 'fr', label: 'France' },
              { value: 'de', label: 'Germany' },
              { label: 'Note' },
            ],
          },
        ]
      );

      const group = control.items[0];
      expect(group[0].selected).toBe(true);
      expect(group[1].selected).toBe(true);
      expect(group[2].selected).toBe(false);
      expect(group.selected).toBe(true);
      expect(control.selectedItems.map((i) => i.value)).toEqual(['fr', 'de']);
    });

    it('1.21.32 such a flag stands for the whole subtree, so it selects a child the spec left unselected', () => {
      const control = setup(
        {},
        [
          {
            label: 'Europe',
            selected: true,
            items: [
              { value: 'fr', label: 'France' },
              { value: 'de', label: 'Germany', selected: false },
            ],
          },
        ]
      );

      const group = control.items[0];
      expect(group[1].selected).toBe(true);
      expect(group.selectionState).toBe('all');
    });

    // requires: setItems(specs, selectedValues) - the array is authoritative and
    // states the selection in the order its Chips are to arrive
    const items = () => [
      { value: 'o', label: 'Oscar' },
      { value: 'r', label: 'Romeo' },
      { value: 'd', label: 'Delta' },
      { value: 'e', label: 'Echo' },
    ];
    const seeded = (values, specs) => {
      const control = setup({ delayedLoad: true });
      control.setItems(specs || items(), values);
      return control;
    };
    const chipLabels = (control) =>
      control.selectionBox.chipsEl.children.map((el) => el._item.label);

    it('1.21.16 the array selects the Items it names, in the order it names them', () => {
      const control = seeded(['e', 'o', 'r']);

      expect(control.selectedItems).toHaveLength(3);
      expect(chipLabels(control)).toEqual(['Echo', 'Oscar', 'Romeo']);
      expect(control.selectionBox.items.map((i) => i.value)).toEqual([
        'e',
        'o',
        'r',
      ]);
    });

    it('1.21.17 the order given is the arrival order, independent of chipPlaceOrder', () => {
      const control = setup({ delayedLoad: true, chipPlaceOrder: 'asDefined' });
      control.setItems(items(), ['e', 'o', 'r']);

      // `asDefined` re-sorts by definitionIndex, so the Chips read Oscar, Romeo, Echo
      // - while the box still holds them in the order the array gave.
      expect(chipLabels(control)).toEqual(['Oscar', 'Romeo', 'Echo']);
      expect(control.selectionBox.items.map((i) => i.value)).toEqual([
        'e',
        'o',
        'r',
      ]);
    });

    it('1.21.18 it is authoritative: a selected:true spec outside the array is not selected', () => {
      const control = seeded(['e'], [
        { value: 'o', label: 'Oscar', selected: true },
        { value: 'e', label: 'Echo' },
      ]);

      expect(control.selectedItems).toHaveLength(1);
      expect(chipLabels(control)).toEqual(['Echo']);
      expect(control.selectionBox.chips).toHaveLength(1);
    });

    it('1.21.19 it selects nested Items by value too', () => {
      const control = seeded(['nice', 'lyon'], [
        {
          label: 'Cities',
          items: [
            { value: 'lyon', label: 'Lyon' },
            { value: 'nice', label: 'Nice' },
          ],
        },
      ]);

      expect(control.selectedItems).toHaveLength(2);
      expect(chipLabels(control)).toEqual(['Nice', 'Lyon']);
    });

    it('1.21.20 it may select an empty selection', () => {
      const control = seeded([], [
        { value: 'o', label: 'Oscar', selected: true },
      ]);

      expect(control.selectedItems).toHaveLength(0);
      expect(chipLabels(control)).toEqual([]);
    });

    it('1.21.21 a value naming no Item is warned about and skipped, the rest still selected', () => {
      const warn = vi.spyOn(specLog, 'warn').mockImplementation(() => {});
      const control = seeded(['e', 'nope', 'o']);

      expect(control.selectedValues).toEqual(['e', 'o']);
      expect(chipLabels(control)).toEqual(['Echo', 'Oscar']);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('nope');
      warn.mockRestore();
    });

    it('1.21.22 a Leaf with no value cannot be named, so the value is unknown and skipped', () => {
      const warn = vi.spyOn(specLog, 'warn').mockImplementation(() => {});
      const control = seeded(['cities'], [
        { label: 'Cities', items: [{ value: 'lyon', label: 'Lyon' }] },
      ]);

      expect(control.selectedItems).toHaveLength(0);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('cities');
      warn.mockRestore();
    });

    it('1.21.23 a repeated value is warned about and skipped, keeping the first occurrence', () => {
      const warn = vi.spyOn(specLog, 'warn').mockImplementation(() => {});
      const control = seeded(['e', 'o', 'e']);

      expect(control.selectedValues).toEqual(['e', 'o']);
      expect(chipLabels(control)).toEqual(['Echo', 'Oscar']);
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });

    it('1.21.24 a non-array second argument throws', () => {
      expect(() => seeded('e')).toThrow();
    });

    it('1.21.25 without the array the selected:true flags seed as before', () => {
      const control = seeded(undefined, [
        { value: 'o', label: 'Oscar', selected: true },
        { value: 'r', label: 'Romeo' },
        { value: 'd', label: 'Delta' },
        { value: 'e', label: 'Echo', selected: true },
      ]);

      expect(chipLabels(control)).toEqual(['Oscar', 'Echo']);
    });

    it('1.21.26 a value naming a Group is warned about and skipped; the Group is selected through its children', () => {
      const warn = vi.spyOn(specLog, 'warn').mockImplementation(() => {});
      const control = seeded(['europe', 'fr'], [
        {
          value: 'europe',
          label: 'Europe',
          items: [
            { value: 'fr', label: 'France' },
            { value: 'de', label: 'Germany' },
          ],
        },
      ]);

      const group = control.items[0];
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('europe');
      expect(control.selectedValues).toEqual(['fr']);
      expect(group.selectionState).toBe('partial');
      warn.mockRestore();
    });

    it('1.21.27 the group value is an accessor only: it never reaches the selection set', () => {
      const control = seeded(['fr', 'de'], [
        {
          value: 'europe',
          label: 'Europe',
          items: [
            { value: 'fr', label: 'France' },
            { value: 'de', label: 'Germany' },
          ],
        },
      ]);

      expect(control.selectedValues).toEqual(['fr', 'de']);
      expect(control.selectedValues).not.toContain('europe');
      expect(control.items[0].selectionState).toBe('all');
    });

    it('1.21.28 selectedValues reads the selection back as leaf values, in Chip order', () => {
      const control = seeded(['e', 'o', 'r']);

      expect(control.selectedValues).toEqual(['e', 'o', 'r']);
    });

    it('1.21.29 a stale list restores what still resolves, warning about the rest', () => {
      const warn = vi.spyOn(specLog, 'warn').mockImplementation(() => {});
      const control = seeded(['gone', 'o', 'e']);

      expect(control.selectedValues).toEqual(['o', 'e']);
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });

    it('1.21.30 the getter round-trips: feeding selectedValues back reproduces the selection', () => {
      const first = seeded(['e', 'o', 'r']);
      const values = first.selectedValues;

      const second = seeded(values);

      expect(second.selectedValues).toEqual(values);
      expect(chipLabels(second)).toEqual(chipLabels(first));
    });
  });
});
