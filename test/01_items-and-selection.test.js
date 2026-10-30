import { describe, expect, it, vi } from 'vitest';
import './teardown.js';
import { MSelect, Item, RootContainer } from '../src/m-select.js';

/**
 * Behavioural spec for m-select — the Item tree and the Selection Box.
 *
 * Areas 1-5: Item construction and lookup, Item view state and chips, the
 * children container, the Selection Box bookkeeping, and the loop between
 * toggling an Item and the Chips that mirror it. Split out of the old
 * 01_m-select.test.js; the numbering is the project-wide area numbering and
 * is unchanged by the split.
 */

describe('1. MSelect — Items and selection', () => {
  describe('1. Items', () => {
    it('1.1.1 MSelect.items is a RootContainer, array-like over the top-level Items', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      });

      expect(control.items).toBeInstanceOf(RootContainer);
      expect(control.items).toHaveLength(2);
      expect(control.items[0]).toBeInstanceOf(Item);
      expect(control.items[1]).toBeInstanceOf(Item);
      for (const item of control.items) {
        expect(item).toBeInstanceOf(Item);
      }
    });

    it('1.1.2 instantiates a group item with two children', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Group',
            items: [
              { value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
            ],
          },
        ],
      });

      const group = control.items[0];
      expect(group).toBeInstanceOf(Item);
      expect(group.isGroup).toBe(true);
      expect(group).toHaveLength(2);
      for (const child of group) {
        expect(child).toBeInstanceOf(Item);
        expect(child.parent).toBe(group);
      }
    });

    it('1.1.3 group children are reachable from their parent Item (Composite pattern)', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Group',
            items: [
              { value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
            ],
          },
        ],
      });

      const group = control.items[0];
      expect(group).toHaveLength(2);

      const childArray = [...group];
      expect(childArray).toHaveLength(2);
      childArray.forEach((child) => {
        expect(child).toBeInstanceOf(Item);
        expect(child.parent).toBe(group);
      });
      expect(group[0].parent).toBe(group);
      expect(group[1].parent).toBe(group);
    });

    it('1.1.4 allows items without a value', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { label: 'No value' },
          { value: 'a', label: 'A' },
        ],
      });

      expect(control.items).toHaveLength(2);
      const noValue = control.items[0];
      expect(noValue.value).toBeUndefined();
      expect(noValue.isGroup).toBe(false);
    });

    it('1.1.5 rejects items without a label', () => {
      const host = document.createElement('div');
      expect(() => {
        new MSelect(host, {
          items: [{ value: 'a' }],
        });
      }).toThrow();
    });

    it('1.1.6 rejects more than one item with the same non-empty value', () => {
      const host = document.createElement('div');
      expect(() => {
        new MSelect(host, {
          items: [
            { value: 'a', label: 'A' },
            { value: 'a', label: 'A2' },
          ],
        });
      }).toThrow();
    });

    it('1.1.7 the RootContainer accepts an optional DOM element at instantiation', () => {
      const el = document.createElement('div');
      const root = new RootContainer(el);
      expect(root.element).toBe(el);

      const viaItemRoot = Item.root([], {}, el);
      expect(viaItemRoot.element).toBe(el);
    });

    it('1.1.8 Items are instantiated inside the DropDown on its itemsEl', () => {
      const host = document.createElement('div');
      const realRoot = Item.root;
      let capturedArgs;
      const rootSpy = vi.spyOn(Item, 'root').mockImplementation((...args) => {
        capturedArgs = args;
        return realRoot.call(Item, ...args);
      });

      const control = new MSelect(host, {
        items: [{ value: 'a', label: 'A' }],
      });
      rootSpy.mockRestore();

      expect(control.dropDown.items).toBeInstanceOf(RootContainer);
      expect(capturedArgs[2]).toBe(control.dropDown.itemsEl);
      expect(control.items).toBe(control.dropDown.items);
      expect(control.dropDown.items.element).toBe(control.dropDown.itemsEl);
      expect(control.dropDown.el.children).toContain(control.dropDown.itemsEl);
      expect(control.dropDown.itemsEl.children).toContain(control.items[0].itemView);
    });
  });

  // requires: Item standalone construction over a scratch RootContainer
  describe('2. Item', () => {
    const root = Item.root([]);

    it('1.2.1 Item.toggle() changes state to selected', () => {
      const item = new Item({ value: 'a', label: 'A' }, {}, 0, root);
      expect(item.selected).toBe(false);
      item.toggle();
      expect(item.selected).toBe(true);
    });

    it('1.2.2 Item.toggle(true) ensures the item is selected', () => {
      const item = new Item({ value: 'a', label: 'A' }, {}, 0, root);
      item.toggle(true);
      expect(item.selected).toBe(true);
    });

    it('1.2.3 Item.toggle(false) ensures the item is not selected', () => {
      const item = new Item({ value: 'a', label: 'A', selected: true }, {}, 0, root);
      item.toggle(false);
      expect(item.selected).toBe(false);
    });

    it('1.2.4 selected:true instantiates the item in the "selected" state', () => {
      const item = new Item({ value: 'a', label: 'A', selected: true }, {}, 0, root);
      expect(item.selected).toBe(true);
    });

    it('1.2.5 Item instantiation includes an ItemView with a distinct selected class', () => {
      const item = new Item({ value: 'a', label: 'A', selected: true }, {}, 0, root);
      expect(item.itemView).toBeTruthy();
      expect(item.itemView.nodeType).toBe(1);
      expect(item.itemView.classList.contains('cm-item--selected')).toBe(true);
    });

    it('1.2.6 Item instantiation does not build a ChipView until it is displayed as an individual Chip (lazy chips)', () => {
      const item = new Item({ value: 'a', label: 'A' }, {}, 0, root);
      expect(item.chipView).toBeNull();

      const chip = item.buildChipView();

      expect(chip).toBe(item.chipView);
      expect(item.chipView.nodeType).toBe(1);
      expect(item.chipView.classList.contains('cm-chip')).toBe(true);
      expect(item.buildChipView()).toBe(item.chipView);
    });

    it('1.2.7 a tooltip is rendered as the native tooltip of the ItemView', () => {
      const item = new Item(
        { value: 'a', label: 'A', tooltip: 'The first letter' },
        {},
        0,
        root
      );
      expect(item.itemView.title).toBe('The first letter');
    });

    it('1.2.8 a tooltip is rendered as the native tooltip of the ChipView', () => {
      const item = new Item(
        { value: 'a', label: 'A', tooltip: 'The first letter' },
        {},
        0,
        root
      );
      expect(item.buildChipView().title).toBe('The first letter');
    });

    it('1.2.9 without a tooltip the ItemView carries no native tooltip', () => {
      const item = new Item({ value: 'a', label: 'A' }, {}, 0, root);
      expect(item.itemView.title).toBe('');
    });

    it('1.2.10 without a tooltip the ChipView carries no native tooltip either; label and tooltip stay separate', () => {
      const item = new Item({ value: 'a', label: 'A' }, {}, 0, root);
      expect(item.buildChipView().title).toBe('');
    });
  });

  // requires: group Items (spec.items), child container element + classes,
  // per-level align (options.align)
  describe('3. Item children container', () => {
    it('1.3.1 a group Item children container holds the itemViews of its immediate children', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Group',
            items: [
              { value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
            ],
          },
        ],
      });

      const group = control.items[0];
      expect(group.element.nodeType).toBe(1);
      expect(group.element.children).toHaveLength(2);
      expect(group.element.children[0]).toBe(group[0].itemView);
      expect(group.element.children[1]).toBe(group[1].itemView);
    });

    it('1.3.2 the RootContainer element holds the itemViews of its top-level Items', () => {
      const root = Item.root([
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ]);

      expect(root.element.nodeType).toBe(1);
      expect(root.element.className).toBe('cm-items');
      expect(root.element.children).toHaveLength(2);
      expect(root.element.children[0]).toBe(root[0].itemView);
      expect(root.element.children[1]).toBe(root[1].itemView);
    });

    it('1.3.3 Item + Item composition accommodates arbitrary hierarchy depth (>= 3 levels)', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { label: 'Level 1 - A', value: 'l1-a' },
          {
            label: 'Level 1 - B',
            items: [
              { label: 'Level 2 - B1', value: 'l2-b1' },
              {
                label: 'Level 2 - B2',
                items: [{ label: 'Level 3 - B2.1', value: 'l3-b2.1' }],
              },
            ],
          },
        ],
      });

      const walk = (items, expectedDepth, accumulator) => {
        for (const item of items) {
          expect(item.depth).toBe(expectedDepth);
          expect(item.itemView).toBeTruthy();
          expect(item.itemView.nodeType).toBe(1);
          expect(item.element).toBeTruthy();
          if (item.isGroup) {
            expect(item.itemView.children).toContain(item.element);
            expect(item.element.children.length).toBe(item.length);
            walk(item, expectedDepth + 1, accumulator);
          } else {
            expect(item.element.children).toHaveLength(0);
          }
          accumulator.push(item);
        }
        return accumulator;
      };

      const all = walk(control.items, 0, []);
      expect(all).toHaveLength(5);

      const labels = all.map((i) => i.label);
      expect(labels).toContain('Level 3 - B2.1');

      const deepest = control.items.flatten().reduce((a, b) => (b.depth > a.depth ? b : a));
      expect(deepest.depth).toBe(2);
      expect(control.items[1][1][0].value).toBe('l3-b2.1');
    });

    it('1.3.4 an Item attaches its own itemView into the element of its parent', () => {
      const root = Item.root([]);
      const parent = new Item({ label: 'Group' }, {}, 0, root);
      const child = new Item({ value: 'a', label: 'A' }, {}, 0, parent);

      expect(parent.element.children).toContain(child.itemView);
      expect(parent.element.children).toHaveLength(1);
      expect(root.element.children).toContain(parent.itemView);
    });
  });

  // requires: SelectionBox add/chip lookup, items/chips arrays, chip placement
  // order (orderedChips), clear/unselect wiring
  describe('4. SelectionBox', () => {
    it('1.4.1 SelectionBox can add Item.chipView element', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ value: 'a', label: 'A' }],
      });

      const item = control.items[0];
      item.toggle(true);
      control.selectionBox.render();

      expect(control.selectionBox.chipsEl.children).toContain(item.chipView);
      expect(item.chipView.classList.contains('cm-chip')).toBe(true);
      expect(item.chipView.children[0].textContent).toBe('A');
    });

    it('1.4.2 SelectionBox has add and remove methods for Items, rendering their chipView', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ value: 'a', label: 'A' }],
      });

      const item = control.items[0];
      expect(typeof control.selectionBox.add).toBe('function');
      expect(typeof control.selectionBox.remove).toBe('function');

      control.selectionBox.add(item);
      expect(control.selectionBox.chipsEl.children).toContain(item.chipView);

      control.selectionBox.remove(item);
      expect(control.selectionBox.chipsEl.children).not.toContain(item.chipView);
    });

    it('1.4.3 SelectionBox allows items to be accessible by their value', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ value: 'a', label: 'A' }],
      });

      const item = control.items[0];
      control.selectionBox.add(item);

      expect(control.selectionBox.chip('a')).toBe(item);
      expect(control.selectionBox.chip('missing')).toBeUndefined();
    });

    it('1.4.4 SelectionBox has a Chips array', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ value: 'a', label: 'A' }],
      });

      expect(control.selectionBox.chips).toBeInstanceOf(Array);
      expect(control.selectionBox.chips).toHaveLength(0);

      const item = control.items[0];
      control.selectionBox.add(item);
      expect(control.selectionBox.chips).toContain(item.chipView);
    });

    it('1.4.5 chips is the chipViews in the box, in step with what is rendered', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { maxVisibleChips: 1 },
        items: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
          { value: 'c', label: 'C' },
        ],
      });
      const [a, b, c] = control.items;
      const box = control.selectionBox;
      /**
       * While the box is showing chips rather than the CollapsedChip, the mirror
       * has to describe exactly those.
       */
      const inStep = () => {
        expect(box.isCollapsed).toBe(false);
        expect(box.chips).toEqual(Array.from(box.chipsEl.children));
      };

      a.toggle(true);
      inStep();
      // B goes in past the limit, where the box shows one CollapsedChip instead
      // and never builds B's chipView. The mirror keeps listing what is in the
      // box, which is the point of holding it apart from the rendering.
      b.toggle(true);
      expect(box.isCollapsed).toBe(true);
      expect(box.chipsEl.children).toHaveLength(1);
      expect(box.chips).toEqual([a.chipView]);
      // Coming back within the limit expands the box, and B's chipView is built
      // as it expands. The mirror has to follow: it used to be tracked alongside
      // `items`, so B - added while the box was collapsed - never joined it, and
      // the mirror was left describing a box that no longer existed.
      control.unselectItem(a);
      inStep();
      expect(box.chipsEl.children).toContain(b.chipView);
      control.unselectItem(c);
      inStep();
      expect(box.chips).toEqual([b.chipView]);
    });

    it('1.4.6 a Group Item owns no chip, so it is left out of the mirror', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { label: 'G', items: [{ value: 'x', label: 'X' }] },
          { value: 'p', label: 'P' },
        ],
      });
      const [group, plain] = control.items;
      const [x] = group;

      group.toggle(true);
      plain.toggle(true);

      // The Group is selected as a whole, so what is in the box is its child and
      // P. The Group never gets a chipView of its own to mirror.
      expect(group.chipView).toBeFalsy();
      expect(control.selectionBox.chips).toEqual([x.chipView, plain.chipView]);
    });
  });

  // requires: Item#toggle -> control.onItemToggled -> SelectionBox.add/remove
  describe('5. Item toggling <-> SelectionBox', () => {
    it('1.5.1 Item toggled to Selected gets a Chip added in SelectionBox', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ value: 'a', label: 'A' }],
      });

      const item = control.items[0];
      item.toggle(true);

      expect(item.selected).toBe(true);
      expect(control.selectionBox.chips).toContain(item.chipView);
      expect(control.selectionBox.chip('a')).toBe(item);
    });

    it('1.5.2 Item toggled to Unselected removes its Chip from SelectionBox', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ value: 'a', label: 'A' }],
      });

      const item = control.items[0];
      item.toggle(true);
      expect(control.selectionBox.chips).toContain(item.chipView);

      item.toggle(false);
      expect(item.selected).toBe(false);
      expect(control.selectionBox.chips).not.toContain(item.chipView);
    });

    it('1.5.3 a Group Item with a value adds no Chip of its own: it is a container, and only its children own Chips', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Group',
            value: 'g',
            items: [{ value: 'a', label: 'A' }],
          },
        ],
      });

      const group = control.items[0];
      group.toggle(true);

      expect(group.selected).toBe(true);
      expect(control.selectionBox.chip('g')).toBeUndefined();
      expect(control.selectionBox.chip('a')).toBe(group[0]);
      expect(control.selectionBox.chips).toHaveLength(1);
    });

    it('1.5.4 Selecting a Group Item without value does not append a Chip', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Group',
            items: [{ value: 'a', label: 'A' }],
          },
        ],
      });

      const group = control.items[0];
      group.toggle(true);

      expect(group.selected).toBe(true);
      expect(control.selectionBox.chips).not.toContain(group.chipView);
    });

    it('1.5.5 Item without children and without value cannot be toggled Selected and is marked non-selectable', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ label: 'No value' }],
      });

      const item = control.items[0];
      item.toggle(true);

      expect(item.selected).toBe(false);
      expect(item.itemView.classList.contains('cm-item--unselectable')).toBe(true);
    });

    // requires: MSelect#batching -> SelectionBox#add/remove + #settleAfterSelectionChange
    it('1.5.6 a bulk selection change settles a number of times that does not grow with the Item count', () => {
      // Counted rather than timed: what the cost is made of is how often the tree
      // is re-rendered, and counting it does not go flaky on a slow machine.
      // `toggleAll` clears the query before its own render, so it settles more
      // than once; what matters is that the number is a constant rather than one
      // per Item, so it is compared across sizes instead of pinned.
      const toggleAllSettles = (n) => {
        const control = new MSelect(document.createElement('div'), {
          options: { maxVisibleChips: 2 },
          items: Array.from({ length: n }, (_, i) => ({ value: 'v' + i, label: 'Item ' + i })),
        });
        const settle = vi.spyOn(control, 'renderSelection');
        control.toggleAll();
        return { settles: settle.mock.calls.length, control };
      };

      const small = toggleAllSettles(10);
      const large = toggleAllSettles(500);

      expect(small.control.selectedItems).toHaveLength(10);
      expect(large.control.selectedItems).toHaveLength(500);
      expect(large.control.selectionBox.isCollapsed).toBe(true);
      expect(small.settles).toBeLessThanOrEqual(2);
      expect(large.settles).toBe(small.settles);
    });

    it('1.5.7 a single Item still settles on its own, so the batch does not leak', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
      });
      const settle = vi.spyOn(control, 'renderSelection');

      control.items[0].toggle(true);

      expect(control.selectionBox.items).toContain(control.items[0]);
      expect(settle).toHaveBeenCalled();
      expect(control.batching).toBe(false);
    });
  });
});
