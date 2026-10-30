import { describe, expect, it } from 'vitest';
import './teardown.js';
import { MSelect, Item, Filter, MSELECT_INTERNALS } from '../src/m-select.js';

/**
 * Behavioural spec for m-select — Collapsed mode from the keyboard.
 *
 * Area 30: leaving Collapsed mode, the restricted list the DropDown shows,
 * the handover into DropDown mode, and the restore to the default state.
 */

describe('1. MSelect — Keyboard in Collapsed mode', () => {
  describe('30. Keyboard - Collapsed mode navigation', () => {
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
    const selectAll = (control) => {
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      control.items[2].toggle(true);
      expect(control.selectionBox.isCollapsed).toBe(true);
    };
    const groupSetup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
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
    };
    /** Selects the group as a whole (which selects both of its children). */
    const selectAllOfGroup = (control) => {
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      expect(control.selectionBox.isCollapsed).toBe(true);
    };

    it('1.30.1 ArrowRight in Collapsed mode exits to Filter and clears the Collapsed Chip selection marker', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(modes(control).mode).toBe('collapsed');
      expect(control.selectionBox.collapsedChip.current).toBe(true);

      const handled = keydown(control.selectionBox.filter.el, 'ArrowRight');

      expect(handled.value).toBe(true);
      expect(modes(control).mode).toBe('filter');
      expect(control.selectionBox.collapsedChip.current).toBe(false);
      expect(
        control.selectionBox.collapsedChip.chipView.classList.contains('cm-chip--current')
      ).toBe(false);
      expect(control.selectionBox.filter.displaySelected).toBe(false);
    });

    it('1.30.2 ArrowDown in Collapsed mode opens the DropDown and stays in Collapsed', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(modes(control).mode).toBe('collapsed');

      const handled = keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(handled.value).toBe(true);
      expect(control.dropDown.open).toBe(true);
      expect(modes(control).mode).toBe('collapsed');
      expect(control.selectionBox.collapsedChip.current).toBe(true);
    });

    it('1.30.3 the opening ArrowDown starts no Item marker, so the Collapsed Chip is the only Current', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(control.dropDown.currentItem).toBe(null);

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(modes(control).mode).toBe('collapsed');
      expect(control.dropDown.currentItem).toBe(null);
      expect(
        control.allItems.some((item) => item.itemView.classList.contains('cm-item--current'))
      ).toBe(false);
      expect(control.selectionBox.collapsedChip.current).toBe(true);
    });

    it('1.30.4 a repeated ArrowDown moves on to DropDown mode, still restricted to the selected Items', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(modes(control).mode).toBe('collapsed');
      expect(control.selectionBox.filter.displaySelected).toBe(true);

      const handled = keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(handled.value).toBe(true);
      expect(control.dropDown.open).toBe(true);
      expect(modes(control).mode).toBe('dropdown');
      expect(control.selectionBox.filter.displaySelected).toBe(true);
      expect(control.selectionBox.collapsedChip.current).toBe(false);
    });

    it('1.30.5 the selected-Items list navigated after the handover holds only selected Items', () => {
      const control = setup();
      selectAll(control);
      control.items[2].toggle(false);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(modes(control).mode).toBe('dropdown');
      expect(control.selectionBox.filter.displaySelected).toBe(true);
      expect(control.items[2].visible).toBe(false);
      // The handover seeds the marker itself, so there is something to act on
      // without a further keypress, and a further ArrowDown moves along the
      // restricted list rather than starting the marker.
      expect(control.dropDown.currentItem).toBe(control.items[0]);

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.30.6 the handover marker starts on the first navigable Item, skipping unselected ones', () => {
      const control = setup();
      selectAll(control);
      control.items[0].toggle(false);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');

      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(modes(control).mode).toBe('collapsed');
      expect(control.dropDown.currentItem).toBe(null);

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(modes(control).mode).toBe('dropdown');
      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.30.7 unselecting an Item while the DropDown shows only the selected removes it from the list', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(control.selectionBox.filter.displaySelected).toBe(true);
      expect(control.items[1].visible).toBe(true);

      control.unselectItem(control.items[1]);

      expect(control.items[1].selected).toBe(false);
      expect(control.items[1].visible).toBe(false);
      expect(control.items[1].itemView.classList.contains('cm-item--hidden')).toBe(true);
      expect(control.items[0].visible).toBe(true);
      expect(control.items[2].visible).toBe(true);
      expect(control.selectionBox.filter.displaySelected).toBe(true);
    });

    it('1.30.8 toggling an Item off with SpaceBar also removes it from the restricted list', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      control.dropDown.setCurrent(control.items[1]);

      keydown(control.selectionBox.filter.el, ' ');

      expect(control.items[1].selected).toBe(false);
      expect(control.items[1].visible).toBe(false);
      expect(control.items[1].itemView.classList.contains('cm-item--hidden')).toBe(true);
      expect(modes(control).mode).toBe('dropdown');
    });

    it('1.30.9 a selection change leaves the text-filtered list alone', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.selectionBox.filter.query = 'Al';
      expect(control.items[0].visible).toBe(true);
      expect(control.items[1].visible).toBe(false);

      control.items[1].toggle(true);

      expect(control.selectionBox.filter.displaySelected).toBe(false);
      expect(control.items[0].visible).toBe(true);
      expect(control.items[1].visible).toBe(false);
      expect(control.items[2].visible).toBe(false);
    });

    it('1.30.10 leaving Collapsed mode through the Filter clears the marker and shows the chip unselected in Filter', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(control.selectionBox.collapsedChip.current).toBe(true);

      control.selectionBox.el.dispatchEvent({
        type: 'click',
        target: control.selectionBox.filter.el,
      });

      expect(modes(control).mode).toBe('filter');
      expect(control.selectionBox.collapsedChip.current).toBe(false);
      expect(
        control.selectionBox.collapsedChip.chipView.classList.contains('cm-chip--current')
      ).toBe(false);
    });

    it('1.30.11 a collapsed selection sitting in Filter mode shows the Collapsed Chip without the marker', () => {
      const control = setup();
      selectAll(control);
      expect(modes(control).mode).toBe('filter');

      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(control.selectionBox.collapsedChip.current).toBe(false);
      expect(
        control.selectionBox.collapsedChip.chipView.classList.contains('cm-chip--current')
      ).toBe(false);
    });

    it('1.30.12 a Group without a value leaves the restricted list once its children are all off', () => {
      const control = groupSetup();
      selectAllOfGroup(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(control.selectionBox.filter.displaySelected).toBe(true);
      const [lyon, nice] = control.items[1];
      expect(control.items[1].visible).toBe(true);

      control.unselectItem(lyon);
      expect(control.items[1].visible).toBe(true);

      control.unselectItem(nice);

      // The Group's flag is derived from what it holds, so it cannot be left
      // standing at "selected" over an empty subtree - which is what used to keep
      // the Group in the restricted list after its last child went.
      expect(control.items[1].selected).toBe(false);
      expect(control.items[1].selectedCount).toBe(0);
      expect(control.items[1].selectionState).toBe('none');
      expect(control.items[1].visible).toBe(false);
      expect(control.items[1].itemView.classList.contains('cm-item--hidden')).toBe(true);
    });

    it('1.30.13 a Group holding a selected child stays in the restricted list', () => {
      const control = groupSetup();
      selectAllOfGroup(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      const [lyon] = control.items[1];

      control.unselectItem(lyon);

      expect(control.items[1].selectedCount).toBe(1);
      expect(control.items[1].selectionState).toBe('partial');
      expect(control.items[1].visible).toBe(true);
    });

    it('1.30.14 a DropDown entered from Collapsed mode holds the collapse below max', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(modes(control).mode).toBe('dropdown');

      control.unselectItem(control.items[2]);
      expect(control.selectedItems.length).toBe(2);
      expect(control.selectionBox.isCollapsed).toBe(true);

      control.unselectItem(control.items[1]);

      expect(control.selectedItems.length).toBe(1);
      expect(control.holdsCollapse).toBe(true);
      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(Array.from(control.selectionBox.chipsEl.children)).toEqual([
        control.selectionBox.collapsedChip.chipView,
      ]);
      expect(modes(control).mode).toBe('dropdown');
    });

    it('1.30.15 a DropDown entered from Chip mode leaves the collapse to the count', () => {
      const control = setup();
      control.items[0].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(modes(control).mode).toBe('chip');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(modes(control).mode).toBe('dropdown');
      expect(control.holdsCollapse).toBe(false);
      expect(control.selectionBox.filter.displaySelected).toBe(false);

      control.items[2].toggle(true);
      expect(control.selectedItems.length).toBe(2);
      expect(control.selectionBox.isCollapsed).toBe(true);

      control.items[2].toggle(false);

      expect(control.selectedItems.length).toBe(1);
      expect(control.holdsCollapse).toBe(false);
      expect(control.selectionBox.isCollapsed).toBe(false);
      expect(control.selectionBox.items).toEqual([control.items[0]]);
    });

    it('1.30.16 the collapse is released once nothing is selected', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');

      control.unselectItem(control.items[2]);
      control.unselectItem(control.items[1]);
      control.unselectItem(control.items[0]);

      expect(control.selectedItems.length).toBe(0);
      expect(control.selectionBox.isCollapsed).toBe(false);
    });

    it('1.30.17 Collapsed mode holds the collapse and releases it on leaving', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(modes(control).mode).toBe('collapsed');
      expect(control.holdsCollapse).toBe(true);

      control.unselectItem(control.items[2]);
      control.unselectItem(control.items[1]);

      expect(control.selectedItems.length).toBe(1);
      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(control.selectionBox.collapsedChip.current).toBe(true);

      keydown(control.selectionBox.filter.el, 'ArrowRight');

      expect(modes(control).mode).toBe('filter');
      expect(control.holdsCollapse).toBe(false);
      expect(control.selectionBox.isCollapsed).toBe(false);
      expect(control.selectionBox.items).toEqual([control.items[0]]);
    });

    it('1.30.18 the count at maxVisibleChips shows individual Chips, not a summary', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { maxVisibleChips: 2 },
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
        ],
      });
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      expect(control.selectionBox.isCollapsed).toBe(false);

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(modes(control).mode).toBe('dropdown');
      expect(control.holdsCollapse).toBe(false);
      expect(control.selectionBox.isCollapsed).toBe(false);
      expect(control.selectionBox.items).toEqual([control.items[0], control.items[1]]);
    });

    it('1.30.19 emptying the selection returns the control to its default state', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      control.dropDown.setCurrent(control.items[0]);
      expect(control.selectionBox.filter.displaySelected).toBe(true);
      control.unselectItem(control.items[2]);
      control.unselectItem(control.items[1]);
      expect(modes(control).mode).toBe('dropdown');

      control.unselectItem(control.items[0]);

      expect(control.selectedItems.length).toBe(0);
      expect(modes(control).mode).toBe('filter');
      expect(control.selectionBox.filter.displaySelected).toBe(false);
      // The Item just unselected is still in the restored full list, so the
      // marker stays on it rather than being dropped with the restriction.
      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(control.items[0].current).toBe(true);
      expect(control.holdsCollapse).toBe(false);
      expect(control.selectionBox.isCollapsed).toBe(false);
      expect(control.selectionBox.filter.el.readOnly).toBe(false);
      [...control.items].forEach((item) => {
        expect(item.visible).toBe(true);
        expect(item.itemView.classList.contains('cm-item--hidden')).toBe(false);
      });
    });

    it('1.30.20 the restored default state navigates the full list again', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      control.unselectItem(control.items[2]);
      control.unselectItem(control.items[1]);
      control.unselectItem(control.items[0]);
      expect(modes(control).mode).toBe('filter');

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(modes(control).mode).toBe('dropdown');
      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.30.21 a Chip/Collapsed normalize that already reached Filter does not re-run it', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(modes(control).mode).toBe('collapsed');

      control.unselectItem(control.items[2]);
      control.unselectItem(control.items[1]);
      control.unselectItem(control.items[0]);

      expect(modes(control).mode).toBe('filter');
      expect(control.selectionBox.filter.displaySelected).toBe(false);
      expect(control.selectionBox.filter.el.readOnly).toBe(false);
    });

    it('1.30.22 clicking an Item in the restricted DropDown keeps the restriction', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(control.selectionBox.filter.displaySelected).toBe(true);

      control.items[0].itemView.click();

      expect(control.selectedItems).toHaveLength(2);
      expect(modes(control).mode).toBe('dropdown');
      expect(control.selectionBox.filter.displaySelected).toBe(true);
      expect(control.items[0].visible).toBe(false);
      expect(control.items[1].visible).toBe(true);
      expect(control.items[2].visible).toBe(true);
    });

    it('1.30.23 the restriction survives clicks down to a single selected Item', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');

      control.items[0].itemView.click();
      control.items[1].itemView.click();

      expect(control.selectedItems).toHaveLength(1);
      expect(control.selectionBox.filter.displaySelected).toBe(true);
      expect(control.items[2].visible).toBe(true);
      [...control.items].forEach((item, index) => {
        expect(item.visible).toBe(index === 2);
      });
    });

    it('1.30.24 the last click emptying the selection still restores the full list', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');

      control.items[0].itemView.click();
      control.items[1].itemView.click();
      control.items[2].itemView.click();

      expect(control.selectedItems).toHaveLength(0);
      expect(control.selectionBox.filter.displaySelected).toBe(false);
      expect(control.selectionBox.isCollapsed).toBe(false);
      [...control.items].forEach((item) => {
        expect(item.visible).toBe(true);
        expect(item.itemView.classList.contains('cm-item--hidden')).toBe(false);
      });
      // The click itself re-enters DropDown mode after the emptying, so the
      // full list is what is navigated from there, marked at its first Item.
      expect(modes(control).mode).toBe('dropdown');
      expect(control.dropDown.currentItem).toBe(control.items[0]);
    });

    it('1.30.25 a click that empties the selection marks the first visible Item Current', () => {
      const control = groupSetup();
      selectAllOfGroup(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(control.selectionBox.filter.displaySelected).toBe(true);

      control.items[0].itemView.click();
      control.items[1][0].itemView.click();
      control.items[1][1].itemView.click();

      expect(control.selectedItems).toHaveLength(0);
      expect(control.selectionBox.filter.displaySelected).toBe(false);
      expect(modes(control).mode).toBe('dropdown');
      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(control.items[0].itemView.classList.contains('cm-item--current')).toBe(true);
    });

    it('1.30.26 a click that does not empty the selection keeps the clicked Item Current', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(control.selectionBox.filter.displaySelected).toBe(true);

      control.items[1].itemView.click();

      expect(control.selectedItems).toHaveLength(2);
      expect(control.selectionBox.filter.displaySelected).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.30.27 a click in an unrestricted list still marks the clicked Item Current', () => {
      const control = setup();
      control.items[0].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(control.selectionBox.filter.displaySelected).toBe(false);

      control.items[1].itemView.click();

      expect(control.selectionBox.filter.displaySelected).toBe(false);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    // A valueless Group owns no Chip, so unselecting it while Current gives
    // `SelectionBox#remove` nothing to promote from and would strand the marker
    // on an Item the restricted list has just stopped showing.
    const strandedSetup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        options: { maxVisibleChips: 1 },
        items: [
          { value: 'a', label: 'Alpha' },
          { label: 'Cities', items: [{ value: 'lyon', label: 'Lyon' }] },
          { value: 'c', label: 'Charlie' },
        ],
      });
    };
    const enterRestrictedFromCollapsed = (control) => {
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(control.selectionBox.filter.displaySelected).toBe(true);
    };
    const visibleLabels = (control) =>
      control.allItems.filter((item) => item.navigable).map((item) => item.label);

    it('1.30.28 Space on the Current valueless Group moves Current to the Groups next sibling', () => {
      const control = strandedSetup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      control.items[2].toggle(true);
      enterRestrictedFromCollapsed(control);
      const cities = control.items[1];
      expect(visibleLabels(control)).toEqual(['Alpha', 'Cities', 'Lyon', 'Charlie']);
      control.dropDown.setCurrent(cities);

      keydown(control.selectionBox.filter.el, ' ');

      expect(cities.selected).toBe(false);
      expect(visibleLabels(control)).toEqual(['Alpha', 'Charlie']);
      // The Group took its child out of the list with it, so the walk that lands
      // on the sibling is not choosing over the child: the child is not there to
      // be chosen. The rule asks for the sibling either way.
      expect(cities[0].navigable).toBe(false);
      expect(cities.nextInLevel()).toBe(control.items[2]);
      expect(control.dropDown.currentItem).toBe(control.items[2]);
      expect(control.dropDown.currentItem).not.toBe(cities[0]);
      expect(cities.current).toBe(false);
      expect(
        control.items[2].itemView.classList.contains('cm-item--current')
      ).toBe(true);
    });

    it('1.30.29 Space on the Current valueless Group with nothing after it falls back to the last visible Item', () => {
      const control = strandedSetup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      enterRestrictedFromCollapsed(control);
      const cities = control.items[1];
      expect(visibleLabels(control)).toEqual(['Alpha', 'Cities', 'Lyon']);
      control.dropDown.setCurrent(cities);

      keydown(control.selectionBox.filter.el, ' ');

      expect(visibleLabels(control)).toEqual(['Alpha']);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(cities.current).toBe(false);
    });

    // G1[X, Y] then G2[Z]. On a column the children share their Group's line, so
    // the axis is G1, X, Y, G2, Z and removing the last Group leaves Y as the
    // last Item on it. On a row the children stand off the line, so the axis is
    // G1, G2 and removing the last Group leaves G1.
    const axisSetup = (align) => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { maxVisibleChips: 1, ...align },
        items: [
          { label: 'G1', items: [{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }] },
          { label: 'G2', items: [{ value: 'z', label: 'Z' }] },
        ],
      });
      const [g1, g2] = control.items;
      const [x, y] = g1;
      const [z] = g2;
      g1.toggle(true);
      g2.toggle(true);
      enterRestrictedFromCollapsed(control);
      expect(control.selectionBox.filter.displaySelected).toBe(true);
      return { control, g1, g2, x, y, z };
    };

    it('1.30.30 removing the last Group on a column leaves Current on the last Item of the axis', () => {
      const { control, g1, g2, y } = axisSetup();
      expect(visibleLabels(control)).toEqual(['G1', 'X', 'Y', 'G2', 'Z']);
      control.dropDown.setCurrent(g2);

      g2.toggle(false);

      // Y, not G1: the column's children share their Group's line, so G1's last
      // child is the Item that stood before G2, exactly as the Chip-side answer
      // would be. G1 is the answer previous() gives, and is the wrong one here.
      expect(control.dropDown.currentItem).toBe(y);
      expect(control.dropDown.currentItem).not.toBe(g1);
      expect(visibleLabels(control)).toEqual(['G1', 'X', 'Y']);
    });

    it('1.30.31 the same removal on a row leaves Current on the previous member of the row', () => {
      // Depth 0 is the level G1 and G2 stand on, so it is this that is laid out
      // as a row; their own children stay a column underneath it.
      const { control, g1, g2 } = axisSetup({ align: { 0: 'row' } });
      control.dropDown.setCurrent(g2);

      g2.toggle(false);

      expect(control.dropDown.currentItem).toBe(g1);
    });

    it('1.30.32 a column Group removed from the front of the axis steps out to the next sibling', () => {
      const { control, g1, g2 } = axisSetup();
      control.dropDown.setCurrent(g1);

      g1.toggle(false);

      // Forward is answered by the next sibling, not the last Item of the axis:
      // toggling the Group already settles the children under it.
      expect(control.dropDown.currentItem).toBe(g2);
    });

    // Leaving a DropDown entered from Collapsed mode, with maxVisibleChips 1 so
    // that unselecting one of the two selected Items brings the count back to the
    // limit and the box has Chips to show again.
    const leaveSetup = () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      expect(control.selectionBox.isCollapsed).toBe(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(modes(control).mode).toBe('dropdown');
      return control;
    };

    it('1.30.33 a DropDown entered from Collapsed mode starts with the first navigable Item marked', () => {
      const control = leaveSetup();

      expect(control.selectionBox.filter.displaySelected).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(control.items[0].current).toBe(true);
    });

    it('1.30.34 Space in a DropDown entered from Collapsed mode unselects and the Item leaves the list', () => {
      const control = leaveSetup();
      expect(control.dropDown.currentItem).toBe(control.items[0]);

      keydown(control.selectionBox.filter.el, ' ');

      expect(control.items[0].selected).toBe(false);
      expect(control.items[0].visible).toBe(false);
      // The restricted list holds only the selected, so the marker moves to the
      // Item that took the vacated place in it.
      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(modes(control).mode).toBe('dropdown');
      expect(control.dropDown.open).toBe(true);
    });

    it('1.30.35 Escape from a DropDown entered from Collapsed mode drops to Filter mode', () => {
      const control = leaveSetup();

      keydown(control.selectionBox.filter.el, 'Escape');

      // Commits nothing, and the restricted list existed only to keep a selection
      // navigable that the Collapsed chip hides, so there is nothing to hand back
      // to: the restriction goes with the DropDown.
      expect(modes(control).mode).toBe('filter');
      expect(control.dropDown.open).toBe(false);
      expect(control.selectionBox.filter.displaySelected).toBe(false);
      expect(control.selectionBox.collapsedChip.current).toBe(false);
      expect(control.dropDown.currentItem).toBeNull();
      expect(control.items[0].selected).toBe(true);
    });

    it('1.30.36 Enter from a DropDown entered from Collapsed mode returns to Collapsed while the collapse holds', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(control.dropDown.currentItem).toBe(control.items[0]);

      keydown(control.selectionBox.filter.el, 'Enter');

      // Two of three are still selected, so the collapse holds and the Collapsed
      // chip is what the marker belongs on.
      expect(modes(control).mode).toBe('collapsed');
      expect(control.dropDown.open).toBe(false);
      expect(control.selectionBox.filter.displaySelected).toBe(true);
      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(control.selectionBox.collapsedChip.current).toBe(true);
      expect(control.items[0].selected).toBe(false);
    });

    it('1.30.37 Enter that brings the count back within maxVisibleChips ends in Chip mode on the elected Chip', () => {
      const control = leaveSetup();
      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(control.selectionBox.isCollapsed).toBe(true);

      keydown(control.selectionBox.filter.el, 'Enter');

      // The box is no longer collapsed, so there are Chips to navigate and the
      // Collapsed chip has nothing to stand for.
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.open).toBe(false);
      expect(control.selectionBox.isCollapsed).toBe(false);
      expect(control.selectionBox.chipsEl.children).toHaveLength(1);
      expect(control.selectionBox.chipsEl.children[0]).toBe(
        control.items[1].ensureChipView()
      );
      // The marker is the chip the toggle elected - the one that took the
      // vacated slot - which is the same answer Space gives in this DropDown.
      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.30.38 the elected Chip on that Enter is the last one when the vacated chip was last', () => {
      const control = leaveSetup();
      control.dropDown.setCurrent(control.items[1]);

      keydown(control.selectionBox.filter.el, 'Enter');

      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[0]);
    });

    it('1.30.39 a Group toggled off by that Enter hands the marker to a Chip', () => {
      // Cities[Lyon, Nice] then Sandwich[Tuna]: unselecting Cities leaves only
      // Tuna selected, so the count comes back within maxVisibleChips and the
      // list has to end in Chip mode. The marker settles on Sandwich, which owns
      // no Chip, so the Chip rule answers for it instead.
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { maxVisibleChips: 1 },
        items: [
          { label: 'Cities', items: [{ value: 'lyon', label: 'Lyon' }, { value: 'nice', label: 'Nice' }] },
          { label: 'Sandwich', items: [{ value: 'tuna', label: 'Tuna' }] },
        ],
      });
      const cities = control.items[0];
      const sandwich = control.items[1];
      const tuna = sandwich[0];
      cities.toggle(true);
      sandwich.toggle(true);
      expect(control.selectionBox.isCollapsed).toBe(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(control.dropDown.currentItem).toBe(cities);

      keydown(control.selectionBox.filter.el, 'Enter');

      expect(modes(control).mode).toBe('chip');
      expect(control.selectionBox.isCollapsed).toBe(false);
      expect(control.dropDown.currentItem).toBe(tuna);
      // The marker stands on a Chip, so Chip mode has something to move between.
      expect(control.orderedChips()).toContain(control.dropDown.currentItem);
    });

    it('1.30.40 returning to Collapsed mode forgets the marker the list left behind', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'Escape');

      // Escape drops to Filter, which clears it; going back down to Collapsed
      // must not leave the Collapsed Chip and an Item both marked current.
      expect(modes(control).mode).toBe('filter');
      expect(control.dropDown.currentItem).toBeNull();

      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(modes(control).mode).toBe('collapsed');
      expect(control.selectionBox.collapsedChip.current).toBe(true);
      expect(control.dropDown.currentItem).toBeNull();
      expect([...control.items].some((item) => item.current)).toBe(false);
    });

    it('1.30.41 the list is re-marked from the top after a Collapsed round trip, not resumed', () => {
      const control = setup();
      selectAll(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      // Space unselects items[0], so it leaves the restricted list, and ArrowDown
      // moves the marker on to items[2].
      keydown(control.selectionBox.filter.el, ' ');
      expect(control.dropDown.currentItem).toBe(control.items[1]);
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(control.dropDown.currentItem).toBe(control.items[2]);
      keydown(control.selectionBox.filter.el, 'Escape');
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(modes(control).mode).toBe('collapsed');

      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');

      // Back at the top of the restricted list rather than where it was left:
      // items[0] is no longer navigable, so the first one is items[1].
      expect(modes(control).mode).toBe('dropdown');
      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(control.dropDown.currentItem).not.toBe(control.items[2]);
    });

    it('1.30.42 the Current marker is left alone when the DropDown is not restricted', () => {
      const control = groupSetup();
      selectAllOfGroup(control);
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(control.selectionBox.filter.displaySelected).toBe(false);
      const cities = control.items[1];
      control.dropDown.setCurrent(cities);

      keydown(control.selectionBox.filter.el, ' ');

      // An unrestricted list keeps the unselected Item visible, so the marker
      // has somewhere valid to stay.
      expect(cities.visible).toBe(true);
      expect(control.dropDown.currentItem).toBe(cities);
    });
  });
});
