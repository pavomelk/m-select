import { describe, expect, it } from 'vitest';
import './teardown.js';
import { MSelect, Item, Filter, MSELECT_INTERNALS } from '../src/m-select.js';

/**
 * Behavioural spec for m-select — levels, axes and structural movement.
 *
 * Areas 38-40: per-level align configuration, structural navigation over
 * Groups and rows, and moving Items between levels.
 */

describe('1. MSelect — Layout and structure', () => {
  describe('38. Layout - per-level align configuration', () => {
    const build = (options = {}) => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          {
            label: 'Cities',
            items: [
              { value: 'paris', label: 'Paris' },
              { value: 'london', label: 'London' },
            ],
          },
        ],
        options,
      });
    };
    const isRow = (el) => el.classList.contains('cm-item__children--row');

    it('1.38.1 align is keyed by the depth of the Items being laid out', () => {
      const control = build({ align: { 1: 'row' } });

      expect(control.items[1].depth).toBe(0);
      expect(isRow(control.items[1].element)).toBe(true);
      expect(control.dropDown.itemsEl.classList.contains('cm-items--row')).toBe(false);
    });

    it('1.38.2 the object form and the bare-string shorthand resolve identically', () => {
      const control = build({ align: { 1: { flow: 'row' } } });

      expect(control.items[1].childrenConfig).toEqual({ flow: 'row' });
      expect(isRow(control.items[1].element)).toBe(true);
    });

    it('1.38.3 a level with no config lays out in a column', () => {
      const control = build();

      expect(control.items[1].childrenConfig).toEqual({ flow: 'column' });
      expect(isRow(control.items[1].element)).toBe(false);
    });

    it('1.38.4 align: { 0: "row" } lays out the top-level Items in a row', () => {
      const control = build({ align: { 0: 'row' } });

      expect(control.dropDown.itemsEl.classList.contains('cm-items--row')).toBe(true);
      expect(control.items[0].inRow).toBe(true);
      expect(control.items[1].childrenConfig.flow).toBe('column');
    });

    it('1.38.5 levelConfig describes the level an Item stands in, childrenConfig the one below', () => {
      const control = build({ align: { 1: { flow: 'row' } } });
      const cities = control.items[1];

      expect(cities[0].depth).toBe(1);
      expect(cities.levelConfig).toEqual({ flow: 'column' });
      expect(cities.childrenConfig).toEqual({ flow: 'row' });
      expect(cities.inRow).toBe(false);
      expect(cities[0].inRow).toBe(true);
    });

    it('1.38.7 an unrecognised flow value falls back to a column', () => {
      const control = build({ align: { 1: { flow: 'diagonal' } } });

      expect(control.items[1].childrenConfig.flow).toBe('column');
      expect(isRow(control.items[1].element)).toBe(false);
    });

  });

  // requires: structural Item movement (group 40): arrow keys answer from where
  // the Current Item sits. The walk is one document-order walk; alignment only
  // picks which keys drive it, so a row level is walked with ArrowLeft/ArrowRight
  // and a column level with ArrowUp/ArrowDown
  describe('39. Keyboard - structural navigation over groups and rows', () => {
    const ITEM_SPECS = [
      { value: 'alpha', label: 'Alpha' },
      { value: 'beta', label: 'Beta', selectable: 'false' },
      { value: 'kappa', label: 'Kappa' },
      {
        label: 'Cities',
        items: [
          { value: 'paris', label: 'Paris' },
          { value: 'london', label: 'London' },
          { value: 'new-york', label: 'New-York' },
        ],
      },
      {
        value: 'sandwich',
        label: 'Sandwich',
        items: [
          { value: 'tuna', label: 'Tuna' },
          { value: 'vegetables', label: 'Vegetables' },
          { value: 'egg', label: 'Egg' },
        ],
      },
    ];
    const build = (options = {}) => {
      const host = document.createElement('div');
      const control = new MSelect(host, { items: ITEM_SPECS, options });
      const [alpha, , kappa, cities, sandwich] = control.items;
      return {
        control,
        alpha,
        kappa,
        cities,
        sandwich,
        paris: cities[0],
        london: cities[1],
        newYork: cities[2],
      };
    };
    /** Cities' children are a row that ArrowDown never descends into. */
    const rowSetup = () => build({ align: { 1: { flow: 'row' } } });
    /** A row level made of Groups, with a Group holding a row of its own. */
    const nestedSetup = () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Select All',
            items: [
              {
                label: 'Level 2',
                items: [
                  { value: 'l2.1', label: 'Level 2.1' },
                  {
                    label: 'Level 2.4',
                    items: [
                      { value: 'l2.4.1', label: 'Level 2.4.1' },
                      { value: 'l2.4.2', label: 'Level 2.4.2' },
                    ],
                  },
                  { value: 'l2.5', label: 'Level 2.5' },
                ],
              },
              { label: 'Level 3', items: [{ value: 'l3.1', label: 'Level 3.1' }] },
            ],
          },
        ],
        options: { align: { 1: { flow: 'row' }, 3: 'row' } },
      });
      const [selectAll] = control.items;
      const [level2, level3] = selectAll;
      const [l21, l24, l25] = level2;
      return {
        control,
        selectAll,
        level2,
        level3,
        l21,
        l24,
        l25,
        l241: l24[0],
        l242: l24[1],
      };
    };
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
    const open = (control) => key(control, 'ArrowDown');
    const current = (control) => control.dropDown.currentItem;

    it('1.39.1 ArrowDown into the DropDown marks the first navigable top-level Item Current', () => {
      const { control, alpha, kappa } = rowSetup();

      open(control);

      expect(current(control)).toBe(alpha);
      expect(current(control)).not.toBe(kappa);
    });

    it('1.39.2 ArrowDown skips a non-toggleable Item', () => {
      const { control, alpha, kappa } = rowSetup();
      open(control);
      expect(current(control)).toBe(alpha);

      key(control, 'ArrowDown');

      expect(current(control)).toBe(kappa);
    });

    it('1.39.3 ArrowDown marks a Group Item Current', () => {
      const { control, kappa, cities } = rowSetup();
      open(control);
      control.dropDown.setCurrent(kappa);

      key(control, 'ArrowDown');

      expect(current(control)).toBe(cities);
    });

    it('1.39.4 ArrowDown on a Group enters it even when the level below is a row', () => {
      const { control, cities, sandwich, paris } = rowSetup();
      open(control);
      control.dropDown.setCurrent(cities);

      const prevented = key(control, 'ArrowDown');

      expect(current(control)).toBe(paris);
      expect(current(control)).not.toBe(sandwich);
      expect(prevented.value).toBe(true);
    });

    it('1.39.5 the last Item of the tree keeps the marker and is still consumed', () => {
      const { control, sandwich } = rowSetup();
      open(control);
      const last = sandwich[sandwich.length - 1];
      control.dropDown.setCurrent(last);

      const prevented = key(control, 'ArrowRight');

      expect(current(control)).toBe(last);
      expect(prevented.value).toBe(true);
    });

    it('1.39.6 ArrowRight on a top-level leaf has no children and no parent, and is consumed', () => {
      const { control, kappa, cities } = rowSetup();
      open(control);
      control.dropDown.setCurrent(kappa);

      const prevented = key(control, 'ArrowRight');

      expect(current(control)).toBe(kappa);
      expect(current(control)).not.toBe(cities);
      expect(prevented.value).toBe(true);
    });

    it('1.39.7 ArrowRight and ArrowLeft walk a row level and leave it at its edges', () => {
      const { control, kappa, cities, paris, london, newYork, sandwich } = rowSetup();
      open(control);
      control.dropDown.setCurrent(paris);

      expect(key(control, 'ArrowRight').value).toBe(true);
      expect(current(control)).toBe(london);
      key(control, 'ArrowRight');
      expect(current(control)).toBe(newYork);

      // The right edge of a row is not a wall: the walk carries on out of it.
      const atRightEdge = key(control, 'ArrowRight');
      expect(current(control)).toBe(sandwich);
      expect(atRightEdge.value).toBe(true);

      // Sandwich sits on the column level above, where ArrowUp is the backward
      // key and ArrowLeft the outward one, which has no parent to go to.
      key(control, 'ArrowUp');
      expect(current(control)).toBe(cities);
      key(control, 'ArrowUp');
      expect(current(control)).toBe(kappa);

      expect(control.items[3]).toBe(cities);
    });

    it('1.39.8 ArrowUp from a row Item goes to the parent Group', () => {
      const { control, cities, london } = rowSetup();
      open(control);
      control.dropDown.setCurrent(london);

      key(control, 'ArrowUp');

      expect(current(control)).toBe(cities);
    });

    it('1.39.9 ArrowRight on the last Item of a row leaves the level for the parent next sibling', () => {
      const { control, sandwich, newYork } = rowSetup();
      open(control);
      control.dropDown.setCurrent(newYork);

      const prevented = key(control, 'ArrowRight');

      expect(current(control)).toBe(sandwich);
      expect(prevented.value).toBe(true);
    });

    it('1.39.10 Home and End move within the row the marker stands in', () => {
      const { control, paris, newYork } = rowSetup();
      open(control);
      control.dropDown.setCurrent(paris);

      key(control, 'End');
      expect(current(control)).toBe(newYork);

      key(control, 'Home');
      expect(current(control)).toBe(paris);
    });

    it('1.39.11 Home and End on a top-level Item move within the top level', () => {
      const { control, alpha, sandwich } = rowSetup();
      open(control);

      key(control, 'End');
      expect(current(control)).toBe(sandwich);

      key(control, 'Home');
      expect(current(control)).toBe(alpha);
    });

    it('1.39.12 ArrowDown descends into a Group when its level does not skip children', () => {
      const { control, cities, paris } = build({ align: { 1: 'row' } });
      open(control);
      control.dropDown.setCurrent(cities);

      key(control, 'ArrowDown');

      expect(current(control)).toBe(paris);
    });

    it('1.39.13 a filtered-out row sibling is skipped', () => {
      const { control, paris, london, newYork } = rowSetup();
      open(control);
      control.dropDown.setCurrent(paris);
      london.visible = false;

      key(control, 'ArrowRight');

      expect(current(control)).toBe(newYork);
    });

    it('1.39.14 SpaceBar on a Group toggles every child of its row', () => {
      const { control, cities, paris, london, newYork } = rowSetup();
      open(control);
      control.dropDown.setCurrent(cities);

      key(control, ' ');

      expect([paris, london, newYork].map((item) => item.selected)).toEqual([true, true, true]);
      expect(control.dropDown.open).toBe(true);
    });

    it('1.39.15 Enter on a Group toggles it, closes the DropDown and returns to Filter mode', () => {
      const { control, cities, sandwich } = rowSetup();
      open(control);
      control.dropDown.setCurrent(cities);

      key(control, 'Enter');

      expect(cities.selectionState).toBe('all');
      expect(sandwich[0].selected).toBe(false);
      expect(control.dropDown.open).toBe(false);
      expect(control[MSELECT_INTERNALS].modes.mode).toBe('filter');
    });

    it('1.39.16 ArrowLeft on the first Item of a row is the parent, not a wall', () => {
      const { control, cities, paris } = rowSetup();
      open(control);
      control.dropDown.setCurrent(paris);

      const prevented = key(control, 'ArrowLeft');

      expect(current(control)).toBe(cities);
      expect(current(control)).not.toBe(paris);
      expect(prevented.value).toBe(true);
    });

    it('1.39.17 ArrowLeft on a top-level Group is consumed and keeps the marker', () => {
      const { control, cities } = rowSetup();
      open(control);
      control.dropDown.setCurrent(cities);

      const prevented = key(control, 'ArrowLeft');

      expect(current(control)).toBe(cities);
      expect(prevented.value).toBe(true);
    });

    it('1.39.18 ArrowLeft and ArrowRight with no Current Item are not consumed', () => {
      const { control } = rowSetup();
      open(control);
      control.dropDown.clearCurrent();

      expect(key(control, 'ArrowRight').value).toBe(false);
      expect(key(control, 'ArrowLeft').value).toBe(false);
      expect(current(control)).toBe(null);
    });

    it('1.39.19 every Item of a row level is reachable along the row own axis', () => {
      const { control, selectAll, level2, level3, l21 } = nestedSetup();
      open(control);
      control.dropDown.setCurrent(selectAll);

      key(control, 'ArrowDown');
      expect(current(control)).toBe(level2);
      key(control, 'ArrowRight');
      expect(current(control)).toBe(level3);
      key(control, 'ArrowLeft');
      expect(current(control)).toBe(level2);
      // Walking back off the front of the row lands on its parent.
      key(control, 'ArrowLeft');
      expect(current(control)).toBe(selectAll);
      key(control, 'ArrowDown');
      expect(current(control)).toBe(level2);
      // and the key across the row axis is the one that opens a Group.
      key(control, 'ArrowDown');
      expect(current(control)).toBe(l21);
    });

    it('1.39.20 ArrowRight on a Group of a row level steps along the row instead of opening it', () => {
      const { control, level2, level3, l21 } = nestedSetup();
      open(control);
      control.dropDown.setCurrent(level2);
      expect(level2.inRow).toBe(true);

      key(control, 'ArrowRight');

      expect(current(control)).toBe(level3);
      expect(current(control)).not.toBe(l21);
    });

    it('1.39.21 ArrowDown is the key that opens a Group standing in a row', () => {
      const { control, level2, l21 } = nestedSetup();
      open(control);
      control.dropDown.setCurrent(level2);

      expect(key(control, 'ArrowDown').value).toBe(true);
      expect(current(control)).toBe(l21);

      // A leaf standing in a row has nothing to open, so the very same key steps
      // out of the level instead - to the parent's next sibling, not to the
      // parent it came from.
      const { control: other, sandwich: group, paris: leaf } = rowSetup();
      open(other);
      other.dropDown.setCurrent(leaf);
      expect(key(other, 'ArrowDown').value).toBe(true);
      expect(other.dropDown.currentItem).toBe(group);
      expect(other.dropDown.currentItem).not.toBe(leaf);
    });

    it('1.39.22 a column Group whose children are a row opens on either axis', () => {
      const { control, level2, l21, l24, l241, l242, l25 } = nestedSetup();
      open(control);
      expect(l24.inRow).toBe(false);
      expect(l241.inRow).toBe(true);

      // The column's own axis walks the column and opens the Group in one step.
      control.dropDown.setCurrent(l24);
      expect(key(control, 'ArrowDown').value).toBe(true);
      expect(current(control)).toBe(l241);
      // Inside a row child level both backward keys land on the parent, and from
      // there the column's own axis carries on up the column.
      key(control, 'ArrowUp');
      expect(current(control)).toBe(l24);
      key(control, 'ArrowUp');
      expect(current(control)).toBe(l21);

      // The axis across it opens the Group too, and goes to the parent on the way back.
      control.dropDown.setCurrent(l24);
      key(control, 'ArrowRight');
      expect(current(control)).toBe(l241);
      control.dropDown.setCurrent(l24);
      key(control, 'ArrowLeft');
      expect(current(control)).toBe(level2);
      expect(current(control)).not.toBe(l241);
    });

    it('1.39.23 a row of children of a column Group is walked along its own axis', () => {
      const { control, l24, l241, l242, l25 } = nestedSetup();
      open(control);
      control.dropDown.setCurrent(l241);

      key(control, 'ArrowRight');
      expect(current(control)).toBe(l242);
      // off the back of the row, out to the parent's next sibling
      const atEnd = key(control, 'ArrowRight');
      expect(current(control)).toBe(l25);
      expect(atEnd.value).toBe(true);

      // across the row: back to the parent, or out past it
      control.dropDown.setCurrent(l241);
      key(control, 'ArrowUp');
      expect(current(control)).toBe(l24);
      control.dropDown.setCurrent(l241);
      key(control, 'ArrowDown');
      expect(current(control)).toBe(l25);
      expect(current(control)).not.toBe(l241);
    });

    it('1.39.24 ArrowLeft on the first Group of a row level is its parent', () => {
      const { control, selectAll, level2, l21 } = nestedSetup();
      open(control);
      control.dropDown.setCurrent(level2);

      const prevented = key(control, 'ArrowLeft');

      expect(current(control)).toBe(selectAll);
      expect(current(control)).not.toBe(level2);
      expect(current(control)).not.toBe(l21);
      expect(prevented.value).toBe(true);
    });

    it('1.39.25 ArrowUp lands on the previous Group itself, not on its first child', () => {
      const { control, l25, l241, l242, l24 } = nestedSetup();
      open(control);
      control.dropDown.setCurrent(l25);

      key(control, 'ArrowUp');

      expect(current(control)).toBe(l24);
      expect(current(control)).not.toBe(l241);
      expect(current(control)).not.toBe(l242);
    });

    it('1.39.26 ArrowUp stops at a previous sibling whose level skips children', () => {
      const { control, cities, sandwich } = rowSetup();
      open(control);
      control.dropDown.setCurrent(sandwich);

      key(control, 'ArrowUp');

      expect(current(control)).toBe(cities);
    });

  });

  // requires: the per-level align configuration (group 38). The walk answers
  // from an Item's own placement in the tree; flow only selects the arrow axis
  describe('40. Item structural movement', () => {
    const build = (options = {}) => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'alpha', label: 'Alpha' },
          { value: 'beta', label: 'Beta', selectable: 'false' },
          { value: 'kappa', label: 'Kappa' },
          {
            label: 'Cities',
            items: [
              { value: 'paris', label: 'Paris' },
              { value: 'london', label: 'London' },
              { value: 'new-york', label: 'New-York' },
            ],
          },
          {
            value: 'sandwich',
            label: 'Sandwich',
            items: [{ value: 'tuna', label: 'Tuna' }],
          },
        ],
        options,
      });
      const [alpha, beta, kappa, cities, sandwich] = control.items;
      return {
        alpha,
        beta,
        kappa,
        cities,
        sandwich,
        paris: cities[0],
        london: cities[1],
        newYork: cities[2],
        tuna: sandwich[0],
      };
    };
    const rowSetup = () => build({ align: { 1: { flow: 'row' } } });
    /** A row level made of Groups, to tell a row member from an entrance. */
    const nestedRow = () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Select All',
            items: [
              {
                label: 'Level 2',
                items: [
                  { value: 'l2.1', label: 'Level 2.1' },
                  { value: 'l2.5', label: 'Level 2.5' },
                ],
              },
              { label: 'Level 3', items: [{ value: 'l3.1', label: 'Level 3.1' }] },
            ],
          },
        ],
        options: { align: { 1: 'row' } },
      });
      const [selectAll] = control.items;
      const [level2, level3] = selectAll;
      return { selectAll, level2, level3, l21: level2[0], l25: level2[1] };
    };
    it('1.40.1 navigable excludes hidden and non-toggleable Items but keeps Groups', () => {
      const { alpha, beta, cities, london } = build();

      expect(alpha.navigable).toBe(true);
      expect(beta.navigable).toBe(false);
      expect(cities.navigable).toBe(true);
      london.visible = false;
      expect(london.navigable).toBe(false);
    });

    it('1.40.2 an Item iterates its own children, and its parent is the level it steps along', () => {
      const { alpha, beta, kappa, cities, sandwich, paris, london, newYork } = build();

      expect([...cities]).toEqual([paris, london, newYork]);
      expect([...paris]).toEqual([]);
      expect([...kappa.parent]).toEqual([alpha, beta, kappa, cities, sandwich]);
      expect([...paris.parent]).toEqual([paris, london, newYork]);
    });

    it('1.40.3 next steps over a non-selectable Item to the next sibling', () => {
      const { alpha, kappa, cities } = build();

      expect(alpha.next()).toBe(kappa);
      expect(kappa.next()).toBe(cities);
    });

    it('1.40.4 next descends into a Group at its first navigable child', () => {
      const { cities, sandwich, paris, tuna } = build();

      expect(cities.next()).toBe(paris);
      expect(sandwich.next()).toBe(tuna);
    });

    it('1.40.5 next leaves a finished subtree for the closest ancestor with a next sibling', () => {
      const { newYork, sandwich, tuna } = build();

      expect(newYork.next()).toBe(sandwich);
      expect(tuna.next()).toBeNull();
    });

    it('1.40.6 next is the same walk whatever the level is laid out as', () => {
      const column = build();
      const row = rowSetup();

      // The walk is decided per Item, so alignment cannot redirect it.
      for (const [a, b] of [[column, row]]) {
        expect(a.cities.next()).toBe(a.paris);
        expect(a.paris.next()).toBe(a.london);
        expect(a.newYork.next()).toBe(a.sandwich);
        expect(a.tuna.next()).toBeNull();
      }
    });

    it('1.40.7 next returns null past the last Item of the tree', () => {
      const { newYork, sandwich, tuna } = build();

      expect(tuna.next()).toBeNull();
      expect(sandwich.next()).toBe(tuna);
      expect(newYork.next()).toBe(sandwich);
    });

    it('1.40.8 previous steps back to the previous sibling', () => {
      const { alpha, kappa, cities, paris, london } = build();

      expect(kappa.previous()).toBe(alpha);
      expect(cities.previous()).toBe(kappa);
      expect(london.previous()).toBe(paris);
    });

    it('1.40.9 previous from the first Item of a level is its parent, and null at the top', () => {
      const { alpha, cities, paris } = build();

      expect(paris.previous()).toBe(cities);
      expect(alpha.previous()).toBeNull();
    });

    it('1.40.10 previous never descends, so the two walks are deliberately not mirrors', () => {
      const { kappa, cities, paris, newYork, sandwich } = build();

      // next steps into the Group, previous climbs straight back out of it.
      expect(cities.next()).toBe(paris);
      expect(paris.previous()).toBe(cities);

      // A level boundary is reached from one side and left from the other.
      expect(newYork.next()).toBe(sandwich);
      expect(sandwich.previous()).toBe(cities);
      expect(sandwich.previous()).not.toBe(newYork);
      expect(kappa.next()).toBe(cities);
    });

    it('1.40.11 parentNext steps over the Item own subtree to its parent next sibling', () => {
      const { kappa, cities, sandwich, paris, newYork, tuna } = build();

      expect(paris.parentNext()).toBe(sandwich);
      expect(newYork.parentNext()).toBe(sandwich);
      expect(kappa.parentNext()).toBeNull();
      expect(tuna.parentNext()).toBeNull();
    });

    it('1.40.12 parentNext is null with no parent to step out of', () => {
      const { alpha, cities } = build();

      expect(alpha.parentItem).toBeNull();
      expect(alpha.parentNext()).toBeNull();
      expect(cities.parentItem).toBeNull();
    });

    it('1.40.13 parentItem names the enclosing Item and stops at the top level', () => {
      const { cities, paris } = build();

      expect(paris.parentItem).toBe(cities);
      expect(cities.parentItem).toBeNull();
    });

    it('1.40.14 the walk starts from an Item that has itself left the visible list', () => {
      const { cities, paris, kappa, sandwich } = build();

      // A Group whose own value was unselected loses its children too, so the
      // walk starts from an Item that is itself no longer navigable.
      for (const item of [cities, ...cities]) item.visible = false;

      expect(cities.navigable).toBe(false);
      expect(cities.navigableChildren).toEqual([]);
      expect(cities.next()).toBe(sandwich);
      expect(cities.previous()).toBe(kappa);
      expect(paris.next()).toBe(sandwich);
    });

    it('1.40.16 nextInLevel steps over the Item own subtree where next descends into it', () => {
      const { cities, sandwich, paris, london, newYork } = build();

      expect(cities.nextInLevel()).toBe(sandwich);
      expect(cities.next()).toBe(paris);
      expect(paris.nextInLevel()).toBe(london);
      expect(newYork.nextInLevel()).toBe(sandwich);
    });

    it('1.40.19 previousInAxis steps into the previous sibling on a column and not on a row', () => {
      const { cities, sandwich, paris, london, newYork, alpha } = build();

      // A column: cities' children share its line, so the Item before sandwich is
      // the last of them rather than cities itself.
      expect(sandwich.inRow).toBe(false);
      expect(sandwich.previousInAxis()).toBe(newYork);
      expect(sandwich.previousInAxis()).not.toBe(cities);
      expect(sandwich.previous()).toBe(cities);
      // A previous sibling with nothing under it is that sibling, stepped into
      // or not, so the two agree there.
      expect(london.previousInAxis()).toBe(paris);
      expect(london.previousInAxis()).toBe(london.previous());
      // Nothing before it on the level: the parent, as previous() also does.
      expect(paris.previousInAxis()).toBe(cities);
      expect(alpha.previousInAxis()).toBeNull();
      expect(alpha.previousInAxis()).toBe(alpha.previous());
    });

    it('1.40.20 previousInAxis does not step into a row member, unlike the column', () => {
      const { level2, level3, l25 } = nestedRow();

      // Level 2 and Level 3 are members of a row, so their children stand off
      // that row's line and Level 3's predecessor on it is Level 2 itself -
      // which is what previous() answers, so on a row the two are the same Item.
      expect(level3.inRow).toBe(true);
      expect(level3.previousInAxis()).toBe(level2);
      expect(level3.previousInAxis()).toBe(level3.previous());
      expect(level3.previousInAxis()).not.toBe(l25);
    });

    it('1.40.21 lastNavigableDescendant is the mirror of descend', () => {
      const { cities, sandwich, paris, london, newYork, tuna } = build();

      expect(cities.lastNavigableDescendant()).toBe(newYork);
      expect(cities.descend()).toBe(paris);
      expect(sandwich.lastNavigableDescendant()).toBe(tuna);
      expect(paris.lastNavigableDescendant()).toBeNull();
      expect(london.lastNavigableDescendant()).toBeNull();
      expect(newYork.lastNavigableDescendant()).toBeNull();
    });

    it('1.40.18 the sibling walk a toggled Group is answered with is unaffected by its own children', () => {
      const { cities, sandwich, paris, london } = build();

      // A collapsed Group and an expanded one are answered identically, because
      // the walk steps over the subtree rather than looking inside it.
      cities.expanded = false;
      expect(cities.nextInLevel()).toBe(sandwich);
      cities.expanded = true;
      expect(cities.nextInLevel()).toBe(sandwich);
      expect(cities.nextInLevel()).not.toBe(paris);
      expect(paris.nextInLevel()).toBe(london);
    });

    it('1.40.17 descend opens a Group at its first navigable child, and is null for a leaf', () => {
      const { cities, sandwich, paris, london, newYork, tuna, alpha } = build();

      expect(cities.descend()).toBe(paris);
      expect(sandwich.descend()).toBe(tuna);
      expect(paris.descend()).toBeNull();
      expect(alpha.descend()).toBeNull();

      paris.visible = false;
      expect(cities.descend()).toBe(london);
      london.visible = false;
      expect(cities.descend()).toBe(newYork);
      newYork.visible = false;
      expect(cities.descend()).toBeNull();
    });

    it('1.40.15 next and previous only ever return rendered, toggleable Items', () => {
      const { cities, paris, london, newYork, kappa } = build();
      london.visible = false;

      expect(paris.next()).toBe(newYork);
      expect(paris.previous()).toBe(cities);
      expect(cities.previous()).toBe(kappa);
    });
  });
});
