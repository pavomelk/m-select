import { describe, expect, it, vi } from 'vitest';
import './teardown.js';
import { MSelect } from '../src/m-select.js';

/**
 * Behavioural spec for m-select — the runtime tree API (REQ-7-14).
 *
 * Items can be added at a chosen place and removed with their subtree after
 * instantiation. What is locked here is that every structure the component keeps
 * stays in agreement with the tree that changed: the child list and its keys, the
 * maintained flat order and `definitionIndex`, the Group counters, the visible
 * list, the Chips and the reported selection.
 */

describe('1. MSelect', () => {
  const host = () => document.createElement('div');
  const labels = (control) => control.allItems.map((item) => item.label);
  const indexes = (control) => control.allItems.map((item) => item.definitionIndex);

  describe('49. Runtime tree changes', () => {
    const twoLeaves = () => [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ];

    it('1.49.1 addItem appends a top-level Item and numbers it', () => {
      const control = new MSelect(host(), { items: [{ value: 'a', label: 'A' }] });

      const added = control.addItem({ value: 'b', label: 'B' });

      expect(added.label).toBe('B');
      expect(labels(control)).toEqual(['A', 'B']);
      expect(control.items.length).toBe(2);
      expect(control.items[1]).toBe(added);
      expect(added.childIndex).toBe(1);
      expect(indexes(control)).toEqual([0, 1]);
      expect(control.items.recountOrder()).toEqual(control.allItems);
    });

    it('1.49.2 addItem places an Item in front of a named sibling', () => {
      const control = new MSelect(host(), { items: twoLeaves() });

      control.addItem({ value: 'ab', label: 'AB' }, { before: 'b' });

      expect(labels(control)).toEqual(['A', 'AB', 'B']);
      expect([...control.items].map((item) => item.value)).toEqual(['a', 'ab', 'b']);
      expect([...control.items].map((item) => item.childIndex)).toEqual([0, 1, 2]);
      expect(indexes(control)).toEqual([0, 1, 2]);
    });

    it('1.49.3 addItem nests an Item under a named Group, at the end of its children', () => {
      const control = new MSelect(host(), {
        items: [
          {
            value: 'cities',
            label: 'Cities',
            items: [{ value: 'paris', label: 'Paris' }],
          },
        ],
      });
      const group = control.items[0];

      control.addItem({ value: 'london', label: 'London' }, { parent: 'cities' });

      expect(group.length).toBe(2);
      expect(group[1].label).toBe('London');
      expect(group[1].parent).toBe(group);
      // The new child goes at the end of its Group's subtree, not at the end of
      // the whole tree.
      expect(labels(control)).toEqual(['Cities', 'Paris', 'London']);
      expect(indexes(control)).toEqual([0, 1, 2]);
    });

    it('1.49.4 addItem nests an Item in front of a named child', () => {
      const control = new MSelect(host(), {
        items: [
          {
            value: 'cities',
            label: 'Cities',
            items: [
              { value: 'paris', label: 'Paris' },
              { value: 'oslo', label: 'Oslo' },
            ],
          },
        ],
      });
      const group = control.items[0];

      control.addItem({ value: 'lyon', label: 'Lyon' }, { parent: 'cities', before: 'oslo' });

      expect([...group].map((item) => item.value)).toEqual(['paris', 'lyon', 'oslo']);
      expect(group[1].childIndex).toBe(1);
      expect(labels(control)).toEqual(['Cities', 'Paris', 'Lyon', 'Oslo']);
    });

    it('1.49.5 an Item added with selected: true arrives as a Chip, reported once', () => {
      const control = new MSelect(host(), { items: twoLeaves() });
      const seen = [];
      control.el.addEventListener('cm-selection-change', (event) => seen.push(event.detail));

      control.addItem({ value: 'c', label: 'C', selected: true });

      expect(control.selectedValues).toEqual(['c']);
      expect(control.selectionBox.items).toEqual([control.items[2]]);
      expect(seen).toEqual([{ values: ['c'], added: ['c'], removed: [] }]);
    });

    it('1.49.6 a selected Group spec selects its descendants and chips them all', () => {
      const control = new MSelect(host(), { items: twoLeaves() });

      control.addItem({
        value: 'letters',
        label: 'Letters',
        selected: true,
        items: [
          { value: 'x', label: 'X' },
          { value: 'y', label: 'Y' },
        ],
      });

      expect(control.selectedValues).toEqual(['x', 'y']);
      expect(control.items[2].selectionState).toBe('all');
      expect(control.items[2].selectedCount).toBe(2);
      expect(control.items[2].selectableCount).toBe(2);
    });

    it('1.49.7 a duplicate value is refused before anything is attached', () => {
      const control = new MSelect(host(), { items: twoLeaves() });

      expect(() => control.addItem({ value: 'a', label: 'Another A' })).toThrow(/Duplicate/);
      expect(labels(control)).toEqual(['A', 'B']);
      expect(control.allItems).toHaveLength(2);
      expect(control.dropDown.itemsEl.children).toHaveLength(2);

      // A subtree of its own may not repeat a value either, nor itself.
      expect(() =>
        control.addItem({
          label: 'Group',
          items: [{ value: 'c', label: 'C' }, { value: 'c', label: 'C again' }],
        })
      ).toThrow(/Duplicate/);
      expect(labels(control)).toEqual(['A', 'B']);
    });

    it('1.49.8 a place naming nothing, a Leaf parent, or another parent\'s child is refused', () => {
      const control = new MSelect(host(), {
        items: [
          { value: 'a', label: 'A' },
          { value: 'g', label: 'Group', items: [{ value: 'x', label: 'X' }] },
        ],
      });

      expect(() => control.addItem({ value: 'n', label: 'N' }, { parent: 'a' })).toThrow(
        /Group Item/
      );
      expect(() => control.addItem({ value: 'n', label: 'N' }, { parent: 'nope' })).toThrow(
        /no Item/
      );
      expect(() => control.addItem({ value: 'n', label: 'N' }, { before: 'nope' })).toThrow(
        /no Item/
      );
      expect(() =>
        control.addItem({ value: 'n', label: 'N' }, { parent: 'g', before: 'a' })
      ).toThrow(/not a child/);
      expect(labels(control)).toEqual(['A', 'Group', 'X']);
    });

    it('1.49.9 a new Item obeys the query that is active when it arrives', () => {
      const control = new MSelect(host(), {
        items: [
          { value: 'alpha', label: 'Alpha' },
          { value: 'beta', label: 'Beta' },
        ],
      });
      control.selectionBox.filter.query = 'alp';

      control.addItem({ value: 'alps', label: 'Alps' });
      control.addItem({ value: 'brick', label: 'Brick' });

      expect(control.items[2].visible).toBe(true);
      expect(control.items[3].visible).toBe(false);
    });

    it('1.49.10 a new Item obeys the selected-Items restriction', () => {
      const control = new MSelect(host(), {
        items: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      });
      control.items[0].toggle(true);
      control.selectionBox.filter.displaySelected = true;

      control.addItem({ value: 'c', label: 'C' });
      control.addItem({ value: 'd', label: 'D', selected: true });

      expect(control.items[2].visible).toBe(false);
      expect(control.items[3].visible).toBe(true);
      expect(control.selectionBox.filter.displaySelected).toBe(true);
      expect(control.selectedValues).toEqual(['a', 'd']);
    });

    it('1.49.11 removeItem drops a leaf, its Chip, and renumbers what follows', () => {
      const control = new MSelect(host(), {
        items: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
          { value: 'c', label: 'C' },
        ],
      });
      control.items[1].toggle(true);
      const seen = [];
      control.el.addEventListener('cm-selection-change', (event) => seen.push(event.detail));

      expect(control.removeItem('b')).toBe(true);

      expect(labels(control)).toEqual(['A', 'C']);
      expect(control.items.length).toBe(2);
      expect(control.items[1].childIndex).toBe(1);
      expect(indexes(control)).toEqual([0, 1]);
      expect(control.selectedValues).toEqual([]);
      expect(control.selectionBox.items).toEqual([]);
      expect(seen).toEqual([{ values: [], added: [], removed: ['b'] }]);
    });

    it('1.49.12 removeItem drops a Group with its whole subtree and unselects it', () => {
      const control = new MSelect(host(), {
        items: [
          {
            value: 'g',
            label: 'Group',
            items: [
              { value: 'x', label: 'X' },
              { value: 'y', label: 'Y' },
            ],
          },
          { value: 'z', label: 'Z' },
        ],
      });
      control.items[0][0].toggle(true);

      expect(control.removeItem('g')).toBe(true);

      expect(labels(control)).toEqual(['Z']);
      expect(indexes(control)).toEqual([0]);
      expect(control.items[0].childIndex).toBe(0);
      expect(control.selectedValues).toEqual([]);
      expect(control.allItems).toHaveLength(1);
    });

    it('1.49.13 removing a value that names nothing reports false and changes nothing', () => {
      const control = new MSelect(host(), { items: twoLeaves() });

      expect(control.removeItem('nope')).toBe(false);
      expect(labels(control)).toEqual(['A', 'B']);
    });

    it('1.49.14 removing the Current Item clears the marker instead of stranding it', () => {
      const control = new MSelect(host(), { items: twoLeaves() });
      control.dropDown.setCurrent(control.items[0]);

      control.removeItem('a');

      expect(control.dropDown.currentItem).toBeNull();
    });

    it('1.49.15 removing under the selected-Items restriction keeps the restriction and re-filters', () => {
      const control = new MSelect(host(), {
        items: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
          { value: 'c', label: 'C' },
        ],
      });
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      control.selectionBox.filter.displaySelected = true;

      control.removeItem('a');

      expect(control.selectionBox.filter.displaySelected).toBe(true);
      expect(control.selectedValues).toEqual(['b']);
      expect(control.items[0].visible).toBe(true);
      expect(control.items[1].visible).toBe(false);
    });

    it('1.49.16 removing the last selected Item returns the control to its default state', () => {
      const control = new MSelect(host(), {
        items: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      });
      control.items[0].toggle(true);
      control.selectionBox.filter.displaySelected = true;

      control.removeItem('a');

      expect(control.mode).toBe('filter');
      expect(control.selectionBox.filter.displaySelected).toBe(false);
      expect(control.selectedValues).toEqual([]);
      expect(control.items[0].visible).toBe(true);
    });

    it('1.49.17 addItem refuses a control whose tree was never instantiated', () => {
      const control = new MSelect(host(), {
        items: [],
        options: { delayedLoad: true },
      });

      expect(() => control.addItem({ value: 'a', label: 'A' })).toThrow(/setItems/);
      // Never instantiated, so the registry cannot have seen it render.
      control.destroy();
    });

    it('1.49.18 a Group keeps its counters and tri-state across a runtime addition', () => {
      const control = new MSelect(host(), {
        items: [
          {
            value: 'g',
            label: 'Group',
            items: [{ value: 'a', label: 'A' }],
          },
        ],
      });
      const group = control.items[0];
      control.items[0][0].toggle(true);
      expect(group.selectionState).toBe('all');

      control.addItem({ value: 'b', label: 'B' }, { parent: 'g' });

      expect(group.selectableCount).toBe(2);
      expect(group.selectedCount).toBe(1);
      expect(group.selectionState).toBe('partial');
      expect(group.visibleSelectableCount).toBe(2);

      // The tri-state act now completes the Group rather than clearing it.
      group.toggle();
      expect(control.selectedValues).toEqual(['a', 'b']);
      expect(group.selectionState).toBe('all');
    });

    it('1.49.19 removing the unselected half of a Group settles its counters', () => {
      const control = new MSelect(host(), {
        items: [
          {
            value: 'g',
            label: 'Group',
            items: [
              { value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
            ],
          },
        ],
      });
      const group = control.items[0];
      control.items[0][0].toggle(true);
      expect(group.selectionState).toBe('partial');

      control.removeItem('b');

      expect(group.selectableCount).toBe(1);
      expect(group.visibleSelectableCount).toBe(1);
      expect(group.selectedCount).toBe(1);
      expect(group.selectionState).toBe('all');
    });

    it('1.49.20 the form mirror follows an addition and a removal without duplicating entries', () => {
      const control = new MSelect(host(), {
        options: { name: 'mselect' },
        items: [{ value: 'a', label: 'A' }],
      });
      const form = () => control.el.children.find((el) => el.classList.contains('cm-form'));
      const pairs = () => form().children.map((input) => [input.name, input.value]);

      control.addItem({ value: 'b', label: 'B', selected: true });
      expect(pairs()).toEqual([['mselect', 'b']]);

      control.addItem({ value: 'c', label: 'C' }, { before: 'b' });
      control.items[1].toggle(true);
      expect(pairs()).toEqual([
        ['mselect', 'b'],
        ['mselect', 'c'],
      ]);

      control.removeItem('b');
      expect(pairs()).toEqual([['mselect', 'c']]);
    });
  });
});
