import { describe, expect, it, vi } from 'vitest';
import { MSelect, Item, RootContainer, Filter, MSELECT_INTERNALS, specLog } from '../src/m-select.js';

/**
 * Behavioural spec for m-select.
 *
 * Each test locks one unit of behaviour and is written red-first. Groups are
 * ordered roughly from primitives to composite behaviours, but the suite is
 * NOT a strict build plan — the first checks of a group may rely on pieces
 * added later. Use it as an executable roadmap.
 *
 * FOUNDATION SKELETON (must exist before group 1.1 can run):
 *   - Item            construction, selected/toggle, chipView + itemView,
 *                     current (view classes), definitionIndex
 *   - RootContainer   owner interface (element, depth = -1, array-like over
 *                     top-level Items) via Item.root()/RootContainer.build()
 *   - SelectionBox    chips bookkeeping (items/chips arrays, add/remove)
 *   - DropDown        itemsEl, item tree, open/close, currentItem/setCurrent
 *   - Filter          input element, query/displaySelected
 *   - MSelect         constructor composing the above, options handling,
 *                     selectedItems/allItems/orderedChips, clearAll
 *   - test/dom-stub.js  ElementStub: children array, append/insertBefore/
 *                     removeChild, classList.toggle, innerHTML = '', dataset
 */

describe('1. MSelect', () => {
  // requires: foundation + value uniqueness (reject duplicate non-empty values)
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
        const settle = vi.spyOn(control, 'render');
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
      const settle = vi.spyOn(control, 'render');

      control.items[0].toggle(true);

      expect(control.selectionBox.items).toContain(control.items[0]);
      expect(settle).toHaveBeenCalled();
      expect(control.batching).toBe(false);
    });
  });

  // requires: DropDown.filter(query) -> Filter -> item.visible + hidden class
  describe('6. DropDown filtering', () => {
    it('1.6.1 DropDown#filter(textValue) defaults to matching Items whose label contains textValue', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'paris', label: 'Paris' },
          { value: 'london', label: 'London' },
        ],
      });

      const dropDown = control.dropDown;
      expect(typeof dropDown.filter).toBe('function');

      dropDown.filter('on');
      expect(control.items[0].visible).toBe(false);
      expect(control.items[1].visible).toBe(true);

      dropDown.filter('LON');
      expect(control.items[0].visible).toBe(false);
      expect(control.items[1].visible).toBe(true);

      dropDown.filter('');
      expect(control.items[0].visible).toBe(true);
      expect(control.items[1].visible).toBe(true);
    });

    it('1.6.2 filterScope "matching": a matching Group Item keeps only matching children visible', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { filterScope: 'matching' } },
        items: [
          {
            label: 'Alpha Group',
            items: [
              { value: 'alpha', label: 'Alpha' },
              { value: 'beta', label: 'Beta' },
            ],
          },
        ],
      });

      const dropDown = control.dropDown;
      const group = control.items[0];

      dropDown.filter('alpha');

      expect(group.visible).toBe(true);
      expect(group[0].visible).toBe(true);
      expect(group[1].visible).toBe(false);
    });

    it('1.6.3 filterScope "all": a matching Group Item makes all children visible', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { filterScope: 'all' } },
        items: [
          {
            label: 'Alpha Group',
            items: [
              { value: 'alpha', label: 'Alpha' },
              { value: 'beta', label: 'Beta' },
            ],
          },
        ],
      });

      const dropDown = control.dropDown;
      const group = control.items[0];

      dropDown.filter('alpha');

      expect(group.visible).toBe(true);
      expect(group[0].visible).toBe(true);
      expect(group[1].visible).toBe(true);
    });

    it('1.6.5 filterScope defaults to "all", a matching Group Item revealing its children whatever their own labels say', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Alpha Group',
            items: [
              { value: 'alpha', label: 'Alpha' },
              { value: 'beta', label: 'Beta' },
            ],
          },
        ],
      });

      control.dropDown.filter('alpha');

      expect(control.items[0][0].visible).toBe(true);
      expect(control.items[0][1].visible).toBe(true);
    });

    it('1.6.6 the two scopes are read independently: filterScope does not reach the toggle cascade', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { filterScope: 'matching' } },
        items: [
          {
            label: 'Alpha Group',
            items: [
              { value: 'alpha', label: 'Alpha' },
              { value: 'beta', label: 'Beta' },
            ],
          },
        ],
      });

      const group = control.items[0];
      group[1].visible = false;

      group.toggle(true);

      // "matching" is a filtering word. The toggle keeps its own default of
      // reaching only what is visible, so the hidden child is left alone.
      expect(group[0].selected).toBe(true);
      expect(group[1].selected).toBe(false);
    });

    it('1.6.7 toggleScope does not reach filtering: "visible" is not a filtering value', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'visible' } },
        items: [
          {
            label: 'Alpha Group',
            items: [
              { value: 'alpha', label: 'Alpha' },
              { value: 'beta', label: 'Beta' },
            ],
          },
        ],
      });

      control.dropDown.filter('alpha');

      // The toggle scope says nothing about how a match reveals children, so
      // filtering keeps its own default of "all".
      expect(control.items[0][1].visible).toBe(true);
    });

    it('1.6.4 a matching child keeps all of its parent Items visible', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Root Group',
            items: [
              {
                label: 'Sub Group',
                items: [
                  { value: 'alpha', label: 'Alpha' },
                  { value: 'beta', label: 'Beta' },
                ],
              },
              { value: 'gamma', label: 'Gamma' },
            ],
          },
        ],
      });

      const dropDown = control.dropDown;
      const root = control.items[0];
      const sub = root[0];

      dropDown.filter('alpha');

      expect(sub[0].visible).toBe(true);
      expect(sub.visible).toBe(true);
      expect(root.visible).toBe(true);

      dropDown.filter('gamma');

      expect(root[1].visible).toBe(true);
      expect(root.visible).toBe(true);
      expect(sub.visible).toBe(false);
    });
  });

  // requires: group toggle propagation to children, partiallySelected state
  describe('7. Group Item toggling', () => {
    it('1.7.1 toggleScope "all": toggling a Group toggles all children into the same state regardless of visibility', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'all' } },
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
      group[1].visible = false;

      group.toggle(true);

      expect(group.selected).toBe(true);
      expect(group[0].selected).toBe(true);
      expect(group[1].selected).toBe(true);

      group.toggle(false);

      expect(group.selected).toBe(false);
      expect(group[0].selected).toBe(false);
      expect(group[1].selected).toBe(false);
    });

    it('1.7.2 toggleScope "visible": toggling a Group toggles only visible children; the Group is partially selected', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'visible' } },
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
      group[1].visible = false;

      group.toggle(true);

      expect(group[0].selected).toBe(true);
      expect(group[1].selected).toBe(false);
      expect(group.selectionState).toBe('partial');
    });

    it('1.7.3 toggleScope "visible": un-selecting the Group un-selects only its visible children', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'visible' } },
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
      group[0].selected = true;
      group[0].visible = true;
      group[1].selected = true;
      group[1].visible = false;

      group.toggle(false);

      expect(group[0].selected).toBe(false);
      expect(group[1].selected).toBe(true);
    });

    it('1.7.4 toggleScope "all": un-selecting the Group un-selects all children regardless of visibility', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'all' } },
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
      group[0].selected = true;
      group[1].selected = true;
      group[1].visible = false;

      group.toggle(false);

      expect(group[0].selected).toBe(false);
      expect(group[1].selected).toBe(false);
    });

    it('1.7.5 Item.visible setter toggles the itemView hidden class', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ value: 'a', label: 'A' }],
      });

      const item = control.items[0];
      expect(item.itemView.classList.contains('cm-item--hidden')).toBe(false);

      item.visible = false;
      expect(item.itemView.classList.contains('cm-item--hidden')).toBe(true);

      item.visible = true;
      expect(item.itemView.classList.contains('cm-item--hidden')).toBe(false);
    });

    it('1.7.6 a visible child Item handed its parent\'s state by toggle() adopts it (toggleScope "visible")', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'visible' } },
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
      const a = group[0];
      const b = group[1];
      b.visible = false;

      a.toggle(true);

      expect(a.selected).toBe(true);
      expect(control.selectionBox.chips).toContain(a.chipView);
      expect(b.selected).toBe(false);
    });

    it('1.7.7 a hidden child Item handed its parent\'s state by toggle() decides not to follow (toggleScope "visible")', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'visible' } },
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
      const b = group[1];
      b.visible = false;

      b.toggle(true);

      expect(b.selected).toBe(false);
      expect(control.selectionBox.chips).not.toContain(b.chipView);
    });

    it('1.7.8 a child Item follows the state handed down by its parent regardless of visibility (toggleScope "all")', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'all' } },
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
      const a = group[0];
      const b = group[1];
      b.visible = false;

      a.toggle(true);
      b.toggle(true);

      expect(a.selected).toBe(true);
      expect(b.selected).toBe(true);
      expect(control.selectionBox.chips.length).toBe(2);
    });

    it('1.7.9 a Group Item reaches the "all" selection state when every selectable child is selected, ignoring children that cannot be selected', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Group',
            items: [
              { value: 'a', label: 'A' },
              { label: 'No value', selected: true },
              { value: 'b', label: 'B' },
            ],
          },
        ],
      });

      const group = control.items[0];
      expect(group[1].isSelectable).toBe(false);
      expect(group[1].selected).toBe(true);

      group[0].toggle(true);
      group[2].toggle(true);

      expect(group.selectableCount).toBe(2);
      expect(group.selectedCount).toBe(2);
      expect(group.selectionState).toBe('all');

      group[0].toggle(false);

      expect(group.selectableCount).toBe(2);
      expect(group.selectedCount).toBe(1);
      expect(group.selectionState).toBe('partial');
    });

    it('1.7.10 a Group\'s own selected flag is derived from what it holds, not set on it', () => {
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
      expect(group.selected).toBe(false);

      // The children are toggled one by one and the Group is never touched...
      group[0].toggle(true);
      expect(group.selected).toBe(true);
      expect(group.selectedCount).toBe(1);

      group[1].toggle(true);
      expect(group.selectedCount).toBe(2);

      // ...so the flag follows them back down and cannot outlive the selection.
      group[0].toggle(false);
      group[1].toggle(false);
      expect(group.selected).toBe(false);
      expect(group.selectedCount).toBe(0);
    });

    it('1.7.11 a Group holding no selected descendant is out of the selected-Items list, whatever value it carries', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
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
      group.selected = true; // ignored: the Group is not a selection of its own

      expect(group.inSelection).toBe(false);

      group[0].toggle(true);
      expect(group.inSelection).toBe(true);
    });

    it('1.7.12 a Group is a container, not a selection of its own: it owns no Chip, whatever value it carries', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
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
      group.toggle(true);

      expect(group.selected).toBe(true);
      expect(control.selectionBox.items.map((i) => i.value)).toEqual(['a', 'b']);
      expect(control.selectedItems.map((i) => i.value)).toEqual(['a', 'b']);
    });

    it('1.7.13 a selected descendant marks every enclosing Group, at any depth', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Outer',
            items: [
              {
                label: 'Inner',
                items: [
                  { value: 'a', label: 'A' },
                  { value: 'b', label: 'B' },
                ],
              },
            ],
          },
        ],
      });

      const outer = control.items[0];
      const inner = outer[0];
      expect(outer.selected).toBe(false);
      expect(inner.selected).toBe(false);

      inner[1].toggle(true);

      expect(inner.selected).toBe(true);
      expect(outer.selected).toBe(true);
      expect(inner.selectedCount).toBe(1);
      expect(outer.selectedCount).toBe(1);
      expect(outer.selectableCount).toBe(2);

      inner[1].toggle(false);

      expect(inner.selected).toBe(false);
      expect(outer.selected).toBe(false);
      expect(outer.selectedCount).toBe(0);
    });

    it('1.7.14 toggling a partly selected Group selects the rest of it', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Group',
            items: [
              { value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
              { value: 'c', label: 'C' },
            ],
          },
        ],
      });

      const group = control.items[0];
      group[0].toggle(true);

      expect(group.selectionState).toBe('partial');

      group.toggle();

      expect(group.selectionState).toBe('all');
      expect(control.selectionBox.items.map((i) => i.value)).toEqual(['a', 'b', 'c']);
    });

    it('1.7.15 toggling a fully selected Group clears it', () => {
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
      group.toggle(true);
      expect(group.selectionState).toBe('all');

      group.toggle();

      expect(group.selectionState).toBe('none');
      expect(group.selected).toBe(false);
      expect(control.selectionBox.items).toHaveLength(0);
    });

    it('1.7.16 what the toggle reads is the population it acts on: a hidden selected child does not make the visible ones read as done (toggleScope "visible")', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'visible' } },
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
      group[1].toggle(true); // selected while still reachable
      group[1].visible = false; // then filtered out of reach

      expect(group[1].selected).toBe(true);
      expect(group[0].selected).toBe(false);

      group.toggle();

      // The visible child is the one the cascade reaches, and it is not selected
      // yet, so this is a request to select rather than a request to clear.
      expect(group[0].selected).toBe(true);
      expect(group[1].selected).toBe(true);
    });

    it('1.7.17 a Leaf Item is binary: toggling it flips its own flag, nothing being derived from it', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ value: 'a', label: 'A' }],
      });

      const item = control.items[0];
      expect(item.toggle()).toBe(true);
      expect(item.toggle()).toBe(false);
    });

    it('1.7.18 visibleSelectableCount counts the selectable Leaf descendants currently visible, whatever their selection', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Group',
            items: [
              { value: 'a', label: 'Alpha' },
              { value: 'b', label: 'Beta' },
            ],
          },
        ],
      });

      const group = control.items[0];
      expect(group.visibleSelectableCount).toBe(2);

      group[1].visible = false;
      expect(group.visibleSelectableCount).toBe(1);

      // Selection is not part of this count - it answers what a toggle reaches.
      group[0].selected = true;
      expect(group.visibleSelectableCount).toBe(1);
    });

    it('1.7.19 a Leaf Item answers visibleSelectableCount for itself and its own state', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
          { label: 'Plain', selectable: false },
        ],
      });

      const [a, b, plain] = [...control.items];
      expect(a.visibleSelectableCount).toBe(1);
      expect(b.visibleSelectableCount).toBe(1);

      // A Leaf that cannot be selected is not reachable by a toggle either.
      expect(plain.visibleSelectableCount).toBe(0);

      b.visible = false;
      expect(b.visibleSelectableCount).toBe(0);
    });

    it('1.7.20 hidden-ness propagates up the chain of parents, so every ancestor answers it', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Outer',
            items: [
              {
                label: 'Inner',
                items: [
                  { value: 'a', label: 'Alpha' },
                  { value: 'b', label: 'Beta' },
                ],
              },
            ],
          },
        ],
      });

      const outer = control.items[0];
      const inner = outer[0];

      inner[0].visible = false;
      expect(inner.visibleSelectableCount).toBe(1);
      expect(outer.visibleSelectableCount).toBe(1);

      // Restoring it restores both counters.
      inner[0].visible = true;
      expect(inner.visibleSelectableCount).toBe(2);
      expect(outer.visibleSelectableCount).toBe(2);
    });

    it('1.7.21 a Group hides its own descendants without changing their own visibility', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Group',
            items: [
              { value: 'a', label: 'Alpha' },
              { value: 'b', label: 'Beta' },
            ],
          },
        ],
      });

      const group = control.items[0];
      group.visible = false;

      // The count answers per-Item visibility, which is what a toggle reads: a
      // hidden Group does not reach down and hide the children it still holds.
      expect(group.visibleSelectableCount).toBe(2);
      expect(group[0].visible).toBe(true);
    });

    it('1.7.22 the count survives a round of filtering, which is what drives it', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Alpha Group',
            items: [
              { value: 'alpha', label: 'Alpha' },
              { value: 'beta', label: 'Beta' },
            ],
          },
          {
            label: 'Gamma Group',
            items: [{ value: 'gamma', label: 'Gamma' }],
          },
        ],
      });

      const [alphaGroup, gammaGroup] = [...control.items];

      control.dropDown.filter('alpha');
      expect(alphaGroup.visibleSelectableCount).toBe(2);
      expect(gammaGroup.visibleSelectableCount).toBe(0);

      control.dropDown.filter('bet');
      expect(alphaGroup.visibleSelectableCount).toBe(1);
      expect(gammaGroup.visibleSelectableCount).toBe(0);

      control.dropDown.filter('');
      expect(alphaGroup.visibleSelectableCount).toBe(2);
      expect(gammaGroup.visibleSelectableCount).toBe(1);
    });

    it('1.7.23 an Item constructed with visible: false starts out uncounted', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          {
            label: 'Group',
            items: [
              { value: 'a', label: 'Alpha' },
              { value: 'b', label: 'Beta', visible: false },
            ],
          },
        ],
      });

      const group = control.items[0];
      expect(group.visibleSelectableCount).toBe(1);

      group[1].visible = true;
      expect(group.visibleSelectableCount).toBe(2);
    });

    it('1.7.24 the tri-state tick of a Group reads the count rather than walking the subtree', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'visible' } },
        items: [
          {
            label: 'Group',
            items: [
              { value: 'a', label: 'Alpha' },
              { value: 'b', label: 'Beta' },
              { value: 'c', label: 'Gamma' },
            ],
          },
        ],
      });

      const group = control.items[0];
      let walks = 0;
      const realFlatten = group.flatten.bind(group);
      group.flatten = () => {
        walks += 1;
        return realFlatten();
      };

      group[0].selected = true;
      expect(group.selectionState).toBe('partial');

      // 'partial' is a count read: nothing was walked to learn it.
      expect(walks).toBe(0);
    });

    it('1.7.25 the visible count keeps the tick O(1) under a large tree where a walk would show', () => {
      const host = document.createElement('div');
      const specs = [];
      for (let g = 0; g < 40; g += 1) {
        const children = [];
        for (let c = 0; c < 50; c += 1) {
          children.push({ value: `v${g}-${c}`, label: `Item ${g}-${c}` });
        }
        specs.push({ label: `Group ${g}`, items: children });
      }
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'visible' } },
        items: specs,
      });

      const groups = [...control.items];
      groups.forEach((group) => {
        for (let c = 1; c < 50; c += 1) group[c].visible = false;
      });

      let walks = 0;
      groups.forEach((group) => {
        const realFlatten = group.flatten.bind(group);
        group.flatten = () => {
          walks += 1;
          return realFlatten();
        };
      });

      groups.forEach((group) => expect(group.selectionState).toBe('none'));
expect(walks).toBe(0);

      // Each Group still knows it has one survivor left to pick, and picks it.
      groups.forEach((group) => group.toggle());
      groups.forEach((group) => {
        expect(group[0].selected).toBe(true);
        expect(group[49].selected).toBe(false);

        // The tick indicator keeps counting every selectable descendant, so one
        // of fifty reads as partial - that is REQ-5-05, visibility aside. The
        // tri-state is the separate question, and it is the one that reads the
        // visible population: with the survivor picked, a second toggle clears
        // rather than re-selecting it.
        expect(group.selectionState).toBe('partial');
        group.toggle();
        expect(group[0].selected).toBe(false);
        expect(group.visibleSelectedCount).toBe(0);
      });
      expect(walks).toBe(0);
    });

    it('1.7.26 the tick and the tri-state answer different questions and both hold at once', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'visible' } },
        items: [
          {
            label: 'Group',
            items: [
              { value: 'a', label: 'Alpha' },
              { value: 'b', label: 'Beta' },
              { value: 'c', label: 'Gamma' },
            ],
          },
        ],
      });

      const group = control.items[0];

      // Everything visible is picked, but one selectable child is filtered out
      // and left alone. The tick reports the Group as a whole and so is not
      // fully selected yet...
      group[0].selected = true;
      group[1].selected = true;
      group[2].visible = false;
      expect(group.visibleSelectableCount).toBe(2);
      expect(group.visibleSelectedCount).toBe(2);
      expect(group.selectableCount).toBe(3);
      expect(group.selectedCount).toBe(2);
      expect(group.selectionState).toBe('partial');

      // ...while the tri-state is about what a click can reach, which is done,
      // so the click clears rather than selecting anything again.
      group.toggle();
      expect(group[0].selected).toBe(false);
      expect(group[1].selected).toBe(false);

      // The hidden child is untouched throughout: out of the cascade's reach.
      expect(group[2].selected).toBe(false);

      // The Group is only 'all' once every selectable descendant is selected, the
      // one behind the filter included - it is counted even though the user
      // cannot see it.
      group[0].selected = true;
      group[1].selected = true;
      group[2].selected = true;
      expect(group.selectionState).toBe('all');
    });

    it('1.7.27 the maintained counters agree with a walk at every step of a mixed run of edits', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'visible' } },
        items: [
          {
            label: 'Outer',
            items: [
              {
                label: 'Inner',
                items: [
                  { value: 'a', label: 'Alpha' },
                  { value: 'b', label: 'Beta', visible: false },
                  { label: 'Note', selectable: false },
                ],
              },
              { value: 'c', label: 'Gamma' },
            ],
          },
          { value: 'd', label: 'Delta' },
        ],
      });

      const outer = control.items[0];
      const inner = outer[0];

      // Every step is checked against the definition, so a counter that drifts
      // is caught at the step that drifted rather than by a later symptom.
      const agrees = () => {
        for (const group of control.items.flatten().filter((item) => item.isGroup)) {
          const walked = group.recountVisibility();
          expect(group.visibleSelectableCount).toBe(walked.visibleSelectable);
          expect(group.visibleSelectedCount).toBe(walked.visibleSelected);
        }
      };

      agrees();

      inner[0].visible = false;
      agrees();

      inner[0].visible = true;
      inner[0].selected = true;
      agrees();

      // Selected while hidden: counted as selected, not as visible-and-selected.
      inner[1].selected = true;
      agrees();

      inner[1].visible = true;
      agrees();

      // A pick and a hide in one step, the order filter() uses.
      inner[2].selected = true;
      inner[0].visible = false;
      agrees();

      // Writes that change nothing must not move a count. A no-op only follows
      // a real change, so the leaf is first hidden (the last real change above
      // did that), then re-assigned the value it already holds.
      inner[0].visible = false;
      const before = inner.visibleSelectableCount;
      inner[0].visible = false;
      inner[0].visible = false;
      inner.visible = inner.visible;
      inner[1].visible = inner[1].visible;
      inner[2].visible = inner[2].visible;
      expect(inner.visibleSelectableCount).toBe(before);
      agrees();

      outer[1].visible = false;
      agrees();

      control.dropDown.filter('a');
      agrees();

      control.dropDown.filter('');
      agrees();
    });

    it('1.7.28 repeated filtering leaves the counters where they started', () => {
      const host = document.createElement('div');
      const specs = [
        {
          label: 'Group',
          items: [
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
            { value: 'c', label: 'Gamma' },
          ],
        },
      ];
      const control = new MSelect(host, { items: specs });
      const group = control.items[0];
      const start = group.visibleSelectableCount;

      for (let i = 0; i < 5; i += 1) {
        control.dropDown.filter('al');
        control.dropDown.filter('be');
        control.dropDown.filter('');
      }

      // A filter pass assigns visibility to every Item in the tree; counting
      // only real changes is what keeps that from inflating anything.
      expect(group.visibleSelectableCount).toBe(start);
      expect(group.recountVisibility().visibleSelectable).toBe(start);
    });
  });

  // requires: options.chipPlaceOrder (unsorted/asDefined/alphabetical),
  // orderedChips, setChipPlaceOrder, SelectionBox.add ordered insertion
  describe('8. Chip placement order', () => {
    const items = [
      { value: 'c', label: 'Charlie' },
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Bravo' },
    ];

    it('1.8.1 chipPlaceOrder "unsorted": chips appear in the order items were selected', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, { items });
      const [c, a, b] = [...control.items];

      b.toggle(true);
      a.toggle(true);
      c.toggle(true);
      control.selectionBox.render();

      const labels = control.selectionBox.chipsEl.children.map((el) => el._item.label);
      expect(labels).toEqual(['Bravo', 'Alpha', 'Charlie']);
    });

    it('1.8.2 chipPlaceOrder "asDefined": chips appear in the order items were defined', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { chipPlaceOrder: 'asDefined' },
        items,
      });
      const [c, a, b] = [...control.items];

      b.toggle(true);
      a.toggle(true);
      c.toggle(true);
      control.selectionBox.render();

      const labels = control.selectionBox.chipsEl.children.map((el) => el._item.label);
      expect(labels).toEqual(['Charlie', 'Alpha', 'Bravo']);
    });

    it('1.8.3 chipPlaceOrder "alphabetical": chips appear alphabetically by label', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { chipPlaceOrder: 'alphabetical' },
        items,
      });
      const [c, a, b] = [...control.items];

      b.toggle(true);
      c.toggle(true);
      a.toggle(true);
      control.selectionBox.render();

      const labels = control.selectionBox.chipsEl.children.map((el) => el._item.label);
      expect(labels).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('1.8.4 chipPlaceOrder can be changed at runtime', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, { items });
      const [c, a, b] = [...control.items];

      expect(control.options.chipPlaceOrder ?? 'unsorted').toBe('unsorted');

      b.toggle(true);
      c.toggle(true);
      a.toggle(true);
      control.selectionBox.render();
      expect(control.selectionBox.chipsEl.children.map((el) => el._item.label)).toEqual(['Bravo', 'Charlie', 'Alpha']);

      control.setChipPlaceOrder('alphabetical');
      control.selectionBox.render();
      expect(control.selectionBox.chipsEl.children.map((el) => el._item.label)).toEqual(['Alpha', 'Bravo', 'Charlie']);

      control.setChipPlaceOrder('asDefined');
      control.selectionBox.render();
      expect(control.selectionBox.chipsEl.children.map((el) => el._item.label)).toEqual(['Charlie', 'Alpha', 'Bravo']);
    });

    it('1.8.5 add() appends chipViews in "unsorted" (arrival) order', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, { items });
      const [c, a, b] = [...control.items];

      b.selected = true;
      control.selectionBox.add(b);
      a.selected = true;
      control.selectionBox.add(a);
      c.selected = true;
      control.selectionBox.add(c);

      expect(control.selectionBox.chipsEl.children.map((el) => el._item.label)).toEqual(['Bravo', 'Alpha', 'Charlie']);
    });

    it('1.8.6 add() inserts chipViews in "alphabetical" position', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { chipPlaceOrder: 'alphabetical' },
        items,
      });
      const [c, a, b] = [...control.items];

      c.selected = true;
      control.selectionBox.add(c);
      a.selected = true;
      control.selectionBox.add(a);
      b.selected = true;
      control.selectionBox.add(b);

      expect(control.selectionBox.chipsEl.children.map((el) => el._item.label)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('1.8.7 add() inserts chipViews in "asDefined" position', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { chipPlaceOrder: 'asDefined' },
        items,
      });
      const [c, a, b] = [...control.items];

      b.selected = true;
      control.selectionBox.add(b);
      a.selected = true;
      control.selectionBox.add(a);
      c.selected = true;
      control.selectionBox.add(c);

      expect(control.selectionBox.chipsEl.children.map((el) => el._item.label)).toEqual(['Charlie', 'Alpha', 'Bravo']);
    });

    it('1.8.8 after a runtime switch, add() respects the new order for subsequent chips', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [...items, { value: 'd', label: 'Delta' }],
      });
      const [c, a, b, d] = [...control.items];

      d.selected = true;
      control.selectionBox.add(d);
      b.selected = true;
      control.selectionBox.add(b);
      control.selectionBox.render();

      control.setChipPlaceOrder('alphabetical');
      control.selectionBox.render();
      expect(control.selectionBox.chipsEl.children.map((el) => el._item.label)).toEqual(['Bravo', 'Delta']);

      a.selected = true;
      control.selectionBox.add(a);
      expect(control.selectionBox.chipsEl.children.map((el) => el._item.label)).toEqual(['Alpha', 'Bravo', 'Delta']);
    });

    it('1.8.9 "asDefined" orders nested Items by their place in the whole tree, not their own level', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { chipPlaceOrder: 'asDefined' },
        items: [
          { label: 'Cities', items: [
            { value: 'lyon', label: 'Lyon' },
            { value: 'nice', label: 'Nice' },
          ] },
          { value: 'rome', label: 'Rome' },
          { label: 'Rivers', items: [
            { value: 'seine', label: 'Seine' },
          ] },
        ],
      });

      // Selected deepest-last, so only a real tree order can produce this.
      ['rome', 'nice', 'seine', 'lyon'].forEach((value) => {
        control.items.flatten().find((i) => i.value === value).toggle(true);
      });
      control.selectionBox.render();

      expect(control.selectionBox.chipsEl.children.map((el) => el._item.label)).toEqual([
        'Lyon', 'Nice', 'Rome', 'Seine',
      ]);
    });

    it('1.8.10 a nested Item is not put ahead of its own Group by the flat order', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { chipPlaceOrder: 'asDefined' },
        items: [
          { value: 'rome', label: 'Rome' },
          { label: 'Cities', items: [
            { value: 'lyon', label: 'Lyon' },
          ] },
        ],
      });

      const lyon = control.items[1][0];
      control.items[0].toggle(true);
      lyon.toggle(true);
      control.selectionBox.render();

      // Rome is defined first, so it stays first even though it sits at the top
      // level and Lyon is nested below a Group defined after it.
      expect(control.selectionBox.chipsEl.children.map((el) => el._item.label)).toEqual(['Rome', 'Lyon']);
    });

    it('1.8.11 the flat order is the array the whole component reads, and it holds every Item in tree order', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { label: 'Cities', items: [
            { value: 'lyon', label: 'Lyon' },
            { label: 'Deeper', items: [{ value: 'x', label: 'X' }] },
          ] },
          { value: 'rome', label: 'Rome' },
        ],
      });

      const flat = control.allItems;
      expect(flat.map((i) => i.label)).toEqual(['Cities', 'Lyon', 'Deeper', 'X', 'Rome']);

      // Reading it twice gives the same order: it is maintained, not rebuilt to
      // an equal-but-different array each time.
      expect(control.allItems.map((i) => i.label)).toEqual(flat.map((i) => i.label));
    });

    it('1.8.12 an Item added to the tree afterwards joins the flat order in its place', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'rome', label: 'Rome' },
          { value: 'oslo', label: 'Oslo' },
        ],
      });

      expect(control.allItems.map((i) => i.label)).toEqual(['Rome', 'Oslo']);

      const added = new Item({ value: 'lima', label: 'Lima' }, control.options, 0, control.items);
      control.items.add(added);

      expect(control.allItems.map((i) => i.label)).toEqual(['Rome', 'Oslo', 'Lima']);
    });

    it('1.8.13 a subtree inserted between siblings joins the flat order in that place, renumbering what follows', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'rome', label: 'Rome' },
          { value: 'oslo', label: 'Oslo' },
          { value: 'lima', label: 'Lima' },
        ],
      });

      const oslo = control.items[1];
      const inserted = new Item(
        { label: 'Rivers', items: [{ value: 'seine', label: 'Seine' }] },
        control.options,
        0,
        control.items
      );

      control.items.insertBefore(inserted, oslo);

      // The new Group goes ahead of Oslo, its child right after it, and the
      // Items that moved carry their new positions rather than their old ones.
      expect(control.allItems.map((i) => i.label)).toEqual([
        'Rome', 'Rivers', 'Seine', 'Oslo', 'Lima',
      ]);
      expect(control.allItems.map((i) => i.definitionIndex)).toEqual([0, 1, 2, 3, 4]);

      // The numeric keys follow the child list, so Oslo is now the third
      // top-level Item and carries the position the renumbering gave it.
      expect(control.items[2]).toBe(oslo);
      expect(oslo.definitionIndex).toBe(3);
      expect(control.items[3].label).toBe('Lima');
      expect(control.items[3].definitionIndex).toBe(4);
    });

    it('1.8.14 the maintained flat order agrees with a walk at every step', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { label: 'Cities', items: [
            { value: 'lyon', label: 'Lyon' },
            { label: 'Deeper', items: [{ value: 'x', label: 'X' }] },
          ] },
          { value: 'rome', label: 'Rome' },
        ],
      });

      const agrees = () => {
        const walked = control.items.recountOrder();
        expect(control.allItems).toEqual(walked);
        expect(control.allItems.map((i) => i.definitionIndex)).toEqual(
          walked.map((_, index) => index)
        );
      };

      agrees();

      // Appending to the nested Group renumbers everything after it, including the
      // top-level Rome that follows the Group.
      const nested = new Item(
        { value: 'nice', label: 'Nice' },
        control.options,
        0,
        control.items[0]
      );
      control.items.insertBefore(nested, control.items[1]);
      agrees();
      expect(control.allItems.map((i) => i.label)).toEqual([
        'Cities', 'Lyon', 'Deeper', 'X', 'Nice', 'Rome',
      ]);

      control.items.insertBefore(
        new Item({ value: 'oslo', label: 'Oslo' }, control.options, 0, control.items),
        control.items[1]
      );
      agrees();
    });

    it('1.8.15 "asDefined" reads the maintained order, so a nested Item cannot jump its Group', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { chipPlaceOrder: 'asDefined' },
        items: [
          { value: 'rome', label: 'Rome' },
          { label: 'Cities', items: [{ value: 'lyon', label: 'Lyon' }] },
        ],
      });

      // Append a third Item after the Group, then select everything. The chip
      // order has to match the tree, not the order the chips were picked in.
      control.items.add(
        new Item({ value: 'oslo', label: 'Oslo' }, control.options, 0, control.items)
      );
      control.allItems.forEach((item) => {
        if (!item.isGroup) item.toggle(true);
      });
      control.selectionBox.render();

      expect(control.selectionBox.chipsEl.children.map((el) => el._item.label)).toEqual([
        'Rome', 'Lyon', 'Oslo',
      ]);
    });
  });

  // requires: dropDown.setCurrent/currentItem, Item.current reflected on
  // itemView/chipView (cm-*-current), SelectionBox.selectFirst/Last/Next/Prev
  describe('9. Chip movement - Current marker', () => {
    const setup = () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { chipPlaceOrder: 'asDefined' },
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
        ],
      });
      for (const item of control.items) item.toggle(true);
      control.selectionBox.render();
      return control;
    };

    const currentItems = (control) => control.items.selectableItems.filter((i) => i.current);

    it('1.9.1 selectFirst marks the first chip Item as current (itemView + chipView)', () => {
      const control = setup();
      control.selectionBox.selectFirst();

      expect(control.items[0].current).toBe(true);
      expect(control.items[0].itemView.classList.contains('cm-item--current')).toBe(true);
      expect(control.items[0].chipView.classList.contains('cm-chip--current')).toBe(true);
      expect(control.items[1].current).toBe(false);
      expect(control.items[2].current).toBe(false);
    });

    it('1.9.2 selectLast marks the last chip Item as current', () => {
      const control = setup();
      control.selectionBox.selectLast();

      expect(control.items[2].current).toBe(true);
      expect(control.items[2].itemView.classList.contains('cm-item--current')).toBe(true);
      expect(control.items[2].chipView.classList.contains('cm-chip--current')).toBe(true);
    });

    it('1.9.3 selectNext moves current from the previous marker to the next chip Item', () => {
      const control = setup();
      control.selectionBox.selectFirst();
      control.selectionBox.selectNext();

      expect(control.items[0].current).toBe(false);
      expect(control.items[1].current).toBe(true);
      expect(control.items[1].chipView.classList.contains('cm-chip--current')).toBe(true);

      control.selectionBox.selectNext();
      expect(control.items[1].current).toBe(false);
      expect(control.items[2].current).toBe(true);
    });

    it('1.9.4 selectPrevious moves current from the previous marker to the previous chip Item', () => {
      const control = setup();
      control.selectionBox.selectLast();
      control.selectionBox.selectPrevious();

      expect(control.items[2].current).toBe(false);
      expect(control.items[1].current).toBe(true);
      expect(control.items[1].itemView.classList.contains('cm-item--current')).toBe(true);
    });

    it('1.9.5 selectNext after the last chip wraps to the first chip Item', () => {
      const control = setup();
      control.selectionBox.selectLast();
      control.selectionBox.selectNext();

      expect(control.items[0].current).toBe(true);
      expect(control.items[2].current).toBe(false);
    });

    it('1.9.6 selectPrevious before the first chip wraps to the last chip Item', () => {
      const control = setup();
      control.selectionBox.selectFirst();
      control.selectionBox.selectPrevious();

      expect(control.items[2].current).toBe(true);
      expect(control.items[0].current).toBe(false);
    });

    it('1.9.7 only one Item is current at a time', () => {
      const control = setup();
      control.selectionBox.selectNext();
      control.selectionBox.selectNext();
      control.selectionBox.selectPrevious();

      expect(currentItems(control)).toHaveLength(1);
    });

    it('1.9.8 removing a chip clears the current marker if it pointed at the removed Item', () => {
      const control = setup();
      const item = control.items[0];
      control.selectionBox.selectFirst();
      expect(item.current).toBe(true);

      control.selectionBox.remove(item);
      expect(item.current).toBe(false);
    });

    it('1.9.9 no Item is current when the control is created', () => {
      const control = setup();

      expect(currentItems(control)).toHaveLength(0);
      expect(control.dropDown.currentItem).toBe(null);
    });

    it('1.9.10 reassigning DropDown.currentItem marks only the new Item as current', () => {
      const control = setup();
      control.dropDown.currentItem = control.items[0];

      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(control.items[0].current).toBe(true);

      control.dropDown.currentItem = control.items[1];

      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(control.items[1].current).toBe(true);
      expect(control.items[0].current).toBe(false);
      expect(control.items[2].current).toBe(false);
    });
  });

  // requires: open()/close(), setCurrent scrolls into view while open
  describe('10. DropDown - scroll current into view', () => {
    const setup = () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
          { value: 'd', label: 'Delta' },
        ],
      });
      return control;
    };

    it('1.10.1 assigning currentItem while open scrolls its itemView into view', () => {
      const control = setup();
      control.dropDown.open = true;

      control.dropDown.currentItem = control.items[2];

      expect(control.dropDown.currentItem).toBe(control.items[2]);
      expect(control.items[2].itemView.scrollIntoViewCalls).toBe(1);
    });

    it('1.10.2 assigning currentItem while closed does not scroll', () => {
      const control = setup();
      control.dropDown.open = false;

      control.dropDown.currentItem = control.items[1];

      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(control.items[1].itemView.scrollIntoViewCalls).toBe(0);
    });

    it('1.10.3 changing currentItem while open scrolls only the newly current itemView', () => {
      const control = setup();
      control.dropDown.open = true;

      control.dropDown.currentItem = control.items[0];
      control.dropDown.currentItem = control.items[2];

      expect(control.items[0].itemView.scrollIntoViewCalls).toBe(1);
      expect(control.items[2].itemView.scrollIntoViewCalls).toBe(1);
      expect(control.items[1].itemView.scrollIntoViewCalls).toBe(0);
    });

    it('1.10.4 opening the DropDown scrolls the already assigned currentItem into view', () => {
      const control = setup();
      control.dropDown.currentItem = control.items[3];

      control.dropDown.open = true;

      expect(control.items[3].itemView.scrollIntoViewCalls).toBe(1);
    });
  });

  // requires: RootContainer depth/flatten, dropDown tree navigation
  describe('11. Item tree navigation', () => {
    const setup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [
          { label: 'Fruit', items: [{ value: 'apple', label: 'Apple' }, { value: 'pear', label: 'Pear' }] },
          { value: 'meat', label: 'Meat' },
          { value: 'veggie', label: 'Vegetables' },
        ],
      });
    };

    it('1.11.1 Item.parent points to the containing Item: the root Item at the top level, the Group Item below', () => {
      const control = setup();

      const fruit = control.items[0];
      const meat = control.items[1];

      expect(fruit.parent).toBe(control.items);
      expect(meat.parent).toBe(control.items);
      expect(control.items.parent.length).toBe(0);
      expect(control.items.depth).toBe(-1);
      expect(fruit[0].parent).toBe(fruit);
      expect(fruit[1].parent).toBe(fruit);
    });

    it('1.11.2 Item.nextSibling returns the next sibling or null for the last', () => {
      const control = setup();

      const fruit = control.items[0];
      const meat = control.items[1];
      const veggie = control.items[2];

      expect(fruit.nextSibling).toBe(meat);
      expect(meat.nextSibling).toBe(veggie);
      expect(veggie.nextSibling).toBe(null);

      const apple = fruit[0];
      const pear = fruit[1];
      expect(apple.nextSibling).toBe(pear);
      expect(pear.nextSibling).toBe(null);
    });

    it('1.11.3 Item.previousSibling returns the previous sibling or null for the first', () => {
      const control = setup();

      const fruit = control.items[0];
      const veggie = control.items[2];

      expect(fruit.previousSibling).toBe(null);
      expect(veggie.previousSibling).toBe(control.items[1]);
    });

    it('1.11.4 Item.firstSibling / lastSibling return the boundaries of the sibling set', () => {
      const control = setup();

      const fruit = control.items[0];
      const meat = control.items[1];
      const veggie = control.items[2];

      expect(fruit.firstSibling).toBe(fruit);
      expect(meat.firstSibling).toBe(fruit);
      expect(veggie.firstSibling).toBe(fruit);

      expect(veggie.lastSibling).toBe(veggie);
      expect(fruit.lastSibling).toBe(veggie);
    });

    it('1.11.5 sibling navigation reflects the tree order including Group children', () => {
      const control = setup();
      const fruit = control.items[0];

      expect(fruit[0].firstSibling).toBe(fruit[0]);
      expect(fruit[1].lastSibling).toBe(fruit[1]);
      expect(fruit.lastSibling).toBe(control.items[2]);
    });

    it('1.11.6 the RootContainer is the only root: every Item has a parent', () => {
      const control = setup();

      for (const item of control.allItems) {
        expect(item.parent).toBeTruthy();
      }
      expect(control.items.isRoot).toBe(true);
      expect(control.items.depth).toBe(-1);
    });

    it('1.11.7 depth grows from 0 and every Item names the RootContainer or an Item as parent', () => {
      const control = setup();
      const fruit = control.items[0];

      expect(control.items.isRoot).toBe(true);
      expect(control.items.depth).toBe(-1);

      expect(fruit.parent).toBe(control.items);
      expect(fruit.parentItem).toBeNull();
      expect(fruit.depth).toBe(0);
      expect(fruit[0].depth).toBe(1);
      expect(fruit[0].parentItem).toBe(fruit);
    });
  });

  // requires: MSelect.toggleAll, DropDown.selectAllBtn
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

    it('1.12.5 toggling select-all again with everything selected unselects all and removes every chip', () => {
      const control = triple();
      control.toggleAll();

      control.toggleAll();

      expect(states(control)).toEqual([false, false, false]);
      expect(control.selectionBox.items).toHaveLength(0);
    });

    it('1.12.6 a manually picked Item is not exempt: select-all unselects it and later reselects it with the rest', () => {
      const control = triple();
      control.items[0].toggle();
      expect(control.selectionBox.items.map((i) => i.value)).toEqual(['a']);

      control.toggleAll();

      expect(states(control)).toEqual([false, false, false]);
      expect(control.selectionBox.items).toHaveLength(0);

      control.toggleAll();

      expect(states(control)).toEqual([true, true, true]);
      expect(control.selectionBox.items.map((i) => i.value).sort()).toEqual(['a', 'b', 'c']);
    });

    it('1.12.7 toggling all over a value-bearing Group selects its descendants, the Group itself never becoming a selection of its own', () => {
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

      expect(group.selectionState).toBe('none');
      expect(group.selected).toBe(false);
      expect(control.selectionBox.items).toHaveLength(0);
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

      control.selectionBox.filter.query = 'alp';

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

    it('1.12.11 with a filter active, toggling all leaves hidden Items exactly as they are', () => {
      const control = triple();
      control.items[2].toggle();
      control.selectionBox.filter.query = 'al';
      expect(states(control)).toEqual([false, false, true]);

      control.toggleAll();

      expect(states(control)).toEqual([true, false, true]);
      expect(control.selectionBox.items.map((i) => i.value).sort()).toEqual(['a', 'c']);

      control.selectionBox.filter.query = 'al';
      control.toggleAll();

      expect(states(control)).toEqual([false, false, true]);
      expect(control.selectionBox.items.map((i) => i.value)).toEqual(['c']);
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
      control.selectionBox.filter.query = 'al';
      expect(control.dropDown.showSelectAllButton).toBe(true);
      expect(control.items[0].visible).toBe(true);
      expect(control.items[1].visible).toBe(false);
      expect(control.items[2].visible).toBe(false);

      control.dropDown.selectAllBtn.click();

      expect(control.selectionBox.filter.query).toBe('');
      expect(control.dropDown.showSelectAllButton).toBe(false);
      expect([...control.items].map((i) => i.visible)).toEqual([true, true, true]);
      expect(states(control)).toEqual([true, false, false]);
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

        vi.advanceTimersByTime(299);
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

    // A text query re-filters the list, and that is also the moment the Current
    // marker is re-homed: an Item the query hid cannot stay marked, one it kept
    // visible keeps the marker, and with no marker at all the first visible Item
    // takes it. The selected-Items restriction is a re-filter too, but it has a
    // rule of its own for the marker and is deliberately left out of this.
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

    it('1.13.14 typing into the Filter marks the first visible Item Current when none is set', () => {
      const control = triple();
      control.selectionBox.filter.el.click();
      expect(control.dropDown.currentItem).toBeNull();

      control.selectionBox.filter.query = 'al';

      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(control.items[0].itemView.classList.contains('cm-item--current')).toBe(true);
    });

    it('1.13.15 the marker starts on the first visible Item, stepping over the ones the query hid', () => {
      const control = triple();
      expect(control.items[0].visible).toBe(true);

      control.selectionBox.filter.query = 'ra';

      expect(control.items[0].visible).toBe(false);
      expect(control.items[1].visible).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(control.items[0].itemView.classList.contains('cm-item--current')).toBe(false);
    });

    it('1.13.16 a marker standing on a still visible Item survives the re-filter', () => {
      const control = triple();
      control.dropDown.setCurrent(control.items[2]);
      expect(control.dropDown.currentItem).toBe(control.items[2]);

      control.selectionBox.filter.query = 'a';

      expect(control.items[0].visible).toBe(true);
      expect(control.items[2].visible).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[2]);
    });

    it('1.13.17 a marker on an Item the query hides moves to the first visible Item', () => {
      const control = triple();
      control.dropDown.setCurrent(control.items[2]);

      control.selectionBox.filter.query = 'al';

      expect(control.items[2].visible).toBe(false);
      expect(control.items[2].itemView.classList.contains('cm-item--current')).toBe(false);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
    });

    it('1.13.18 a query matching nothing leaves the marker on nothing', () => {
      const control = triple();
      control.dropDown.setCurrent(control.items[0]);

      control.selectionBox.filter.query = 'zz';

      expect(control.allItems.every((item) => !item.visible)).toBe(true);
      expect(control.dropDown.currentItem).toBeNull();
    });

    it('1.13.19 the debounced typing path re-homes the marker just as the query setter does', () => {
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

    it('1.13.20 the selected-Items re-filter leaves the Current marker to its own rule', () => {
      const control = triple();
      control.dropDown.setCurrent(control.items[1]);
      control.items[2].toggle(true);

      control.selectionBox.filter.displaySelected = true;

      expect(control.items[1].visible).toBe(false);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
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

  // requires: per-view click wiring in Item#createDOM (itemView/chipView/"x"),
  // MSelect.onItemViewClick (toggle + Current) and onChipViewClick (x removal,
  // body -> Current + Chip mode), ElementStub.click()
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

    it('1.19.3 ArrowDown with the DropDown already open enters DropDown mode with the marker left as-is', () => {
      const control = setup();
      control.dropDown.open = true;
      control.items[1].toggle(true);
      control.dropDown.setCurrent(control.items[1]);

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(isOpen(control)).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(modes(control).mode).toBe('dropdown');
    });

    it('1.19.4 ArrowDown respects the filter and enters DropDown mode: with only matching Items visible, the first visible one is Current', () => {
      const control = setup();
      control.selectionBox.filter.query = 'a'; // visible: Alpha, Charlie

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(isOpen(control)).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
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
    });

    it('1.21.4 with delayedLoad:true the cm-items-request event also fires on first DropDown open, but not again on re-open', () => {
      const control = setup({ delayedLoad: true });
      const seen = collect(control, 'cm-items-request');

      control.dropDown.open = true;
      control.dropDown.open = true;

      expect(seen).toHaveLength(1);
    });

    it('1.21.5 with delayedLoad:true a toggleAll/clearAll attempt against the empty tree raises the request, once across all triggers', () => {
      const viaToggle = (() => {
        const control = setup({ delayedLoad: true });
        const seen = collect(control, 'cm-items-request');
        control.toggleAll();
        expect(seen).toHaveLength(1);
        control.clearAll();
        expect(seen).toHaveLength(1);
        return seen;
      })();
      expect(viaToggle).toHaveLength(1);

      const viaClear = (() => {
        const control = setup({ delayedLoad: true });
        const seen = collect(control, 'cm-items-request');
        control.clearAll();
        expect(seen).toHaveLength(1);
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
    describe('21a. setItems with a selectedValues array', () => {
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

  // requires: mode handlers returning handled=truthy (preventDefault),
  // filterMode ArrowLeft → CHIP / COLLAPSED, "passed down to the filter"
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

  // requires: REQ-3.11-12, REQ-3.11-20, REQ-3.11-21 — collapsedMode ArrowRight
  // exiting to Filter, ArrowDown opening the DropDown and a repeated press
  // handing over to DropDown mode with the selected-only restriction kept, the
  // CollapsedChip "current" marker living in the mode lifecycle (onEntry/onLeave)
  // so the chip only looks selected there, and a selection change re-filtering a
  // restricted list
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

    it('1.30.2a the opening ArrowDown starts no Item marker, so the Collapsed Chip is the only Current', () => {
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

    it('1.30.3 a repeated ArrowDown moves on to DropDown mode, still restricted to the selected Items', () => {
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

    it('1.30.4 the selected-Items list navigated after the handover holds only selected Items', () => {
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

    it('1.30.4a the handover marker starts on the first navigable Item, skipping unselected ones', () => {
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

    it('1.30.5 unselecting an Item while the DropDown shows only the selected removes it from the list', () => {
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

    it('1.30.6 toggling an Item off with SpaceBar also removes it from the restricted list', () => {
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

    it('1.30.7 a selection change leaves the text-filtered list alone', () => {
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

    it('1.30.8 leaving Collapsed mode through the Filter clears the marker and shows the chip unselected in Filter', () => {
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

    it('1.30.9 a collapsed selection sitting in Filter mode shows the Collapsed Chip without the marker', () => {
      const control = setup();
      selectAll(control);
      expect(modes(control).mode).toBe('filter');

      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(control.selectionBox.collapsedChip.current).toBe(false);
      expect(
        control.selectionBox.collapsedChip.chipView.classList.contains('cm-chip--current')
      ).toBe(false);
    });

    it('1.30.10 a Group without a value leaves the restricted list once its children are all off', () => {
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

    it('1.30.11 a Group holding a selected child stays in the restricted list', () => {
      const control = groupSetup();
      selectAllOfGroup(control);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      const [lyon] = control.items[1];

      control.unselectItem(lyon);

      expect(control.items[1].selectedCount).toBe(1);
      expect(control.items[1].selectionState).toBe('partial');
      expect(control.items[1].visible).toBe(true);
    });

    it('1.30.12 a DropDown entered from Collapsed mode holds the collapse below max', () => {
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

    it('1.30.12.1 a DropDown entered from Chip mode leaves the collapse to the count', () => {
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

    it('1.30.13 the collapse is released once nothing is selected', () => {
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

    it('1.30.14 Collapsed mode holds the collapse and releases it on leaving', () => {
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

    it('1.30.15 the count at maxVisibleChips shows individual Chips, not a summary', () => {
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

    it('1.30.16 emptying the selection returns the control to its default state', () => {
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

    it('1.30.17 the restored default state navigates the full list again', () => {
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
      expect(control.dropDown.currentItem).toBe(control.items[0]);
    });

    it('1.30.18 a Chip/Collapsed normalize that already reached Filter does not re-run it', () => {
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

    it('1.30.19 clicking an Item in the restricted DropDown keeps the restriction', () => {
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

    it('1.30.20 the restriction survives clicks down to a single selected Item', () => {
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

    it('1.30.21 the last click emptying the selection still restores the full list', () => {
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

    it('1.30.22 a click that empties the selection marks the first visible Item Current', () => {
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

    it('1.30.23 a click that does not empty the selection keeps the clicked Item Current', () => {
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

    it('1.30.24 a click in an unrestricted list still marks the clicked Item Current', () => {
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

    it('1.30.25 Space on the Current valueless Group moves Current to the Groups next sibling', () => {
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

    it('1.30.26 Space on the Current valueless Group with nothing after it falls back to the last visible Item', () => {
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

    it('1.30.27 removing the last Group on a column leaves Current on the last Item of the axis', () => {
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

    it('1.30.28 the same removal on a row leaves Current on the previous member of the row', () => {
      // Depth 0 is the level G1 and G2 stand on, so it is this that is laid out
      // as a row; their own children stay a column underneath it.
      const { control, g1, g2 } = axisSetup({ align: { 0: 'row' } });
      control.dropDown.setCurrent(g2);

      g2.toggle(false);

      expect(control.dropDown.currentItem).toBe(g1);
    });

    it('1.30.29 a column Group removed from the front of the axis steps out to the next sibling', () => {
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

    it('1.30.31 a DropDown entered from Collapsed mode starts with the first navigable Item marked', () => {
      const control = leaveSetup();

      expect(control.selectionBox.filter.displaySelected).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(control.items[0].current).toBe(true);
    });

    it('1.30.32 Space in a DropDown entered from Collapsed mode unselects and the Item leaves the list', () => {
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

    it('1.30.33 Escape from a DropDown entered from Collapsed mode drops to Filter mode', () => {
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

    it('1.30.34 Enter from a DropDown entered from Collapsed mode returns to Collapsed while the collapse holds', () => {
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

    it('1.30.35 Enter that brings the count back within maxVisibleChips ends in Chip mode on the elected Chip', () => {
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

    it('1.30.36 the elected Chip on that Enter is the last one when the vacated chip was last', () => {
      const control = leaveSetup();
      control.dropDown.setCurrent(control.items[1]);

      keydown(control.selectionBox.filter.el, 'Enter');

      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[0]);
    });

    it('1.30.37 a Group toggled off by that Enter hands the marker to a Chip', () => {
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

    it('1.30.38 returning to Collapsed mode forgets the marker the list left behind', () => {
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

    it('1.30.39 the list is re-marked from the top after a Collapsed round trip, not resumed', () => {
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

    it('1.30.40 the Current marker is left alone when the DropDown is not restricted', () => {
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

  // requires: the document-level keydown routing (#onDocumentKeyDown) serving
  // the component as the keyboard surface while the DropDown is open, with the
  // per-event dedupe marker in onKeyDown
  describe('31. Keyboard - the open DropDown makes the component the keyboard surface', () => {
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
        target: document.body,
        preventDefault() {
          preventDefaultCalled.value = true;
        },
      });
      return preventDefaultCalled;
    };

    it('1.31.1 Escape routed via the document closes the open DropDown and returns to Filter', () => {
      const control = setup();
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(modes(control).mode).toBe('dropdown');
      expect(control.dropDown.open).toBe(true);

      const handled = keydown(document, 'Escape');

      expect(handled.value).toBe(true);
      expect(control.dropDown.open).toBe(false);
      expect(modes(control).mode).toBe('filter');
    });

    it('1.31.2 keys from outside the control are ignored while the DropDown is closed', () => {
      const control = setup();

      const handled = keydown(document, 'ArrowDown');

      expect(handled.value).toBe(false);
      expect(control.dropDown.open).toBe(false);
      expect(modes(control).mode).toBe('filter');
    });

    it('1.31.3 a key already handled by the Filter listener is not processed again at the document level', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      const event = {
        type: 'keydown',
        key: 'ArrowLeft',
        target: control.selectionBox.filter.el,
        preventDefault() {},
      };

      control.selectionBox.filter.el.dispatchEvent(event);
      expect(modes(control).mode).toBe('chip');
      expect(control.dropDown.currentItem).toBe(control.items[1]);

      document.dispatchEvent(event);

      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(control.selectionBox.filter.control).toBe(control);
    });
  });

  // requires: the in-control mousedown listener (#onControlMouseDown) keeping
  // focus on the Filter input when the mouse interacts with the control
  // (DropDown Items, chips) — a real browser would otherwise move focus to a
  // non-focusable element / body and detach the keyboard surface
  describe('32. Mouse - the Filter input stays the keyboard surface', () => {
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
    const mousedown = (element) => {
      const preventDefaultCalled = { value: false };
      element.dispatchEvent({
        type: 'mousedown',
        target: element,
        preventDefault() {
          preventDefaultCalled.value = true;
        },
      });
      return preventDefaultCalled;
    };
    const keydown = (element, key) => {
      element.dispatchEvent({
        type: 'keydown',
        key,
        target: document.body,
        preventDefault() {},
      });
    };

    it('1.32.1 a mousedown on a DropDown Item is prevented so the input keeps focus', () => {
      const control = setup();
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      control.selectionBox.filter.el.focus();
      expect(document.activeElement).toBe(control.selectionBox.filter.el);

      const handled = mousedown(control.items[1].itemView);

      expect(handled.value).toBe(true);
      expect(document.activeElement).toBe(control.selectionBox.filter.el);
    });

    it('1.32.2 a mousedown on the Filter input itself is not prevented', () => {
      const control = setup();

      const handled = mousedown(control.selectionBox.filter.el);

      expect(handled.value).toBe(false);
    });

    it('1.32.3 the control stays responsive after a mouse-selected Item and Escape', () => {
      const control = setup();
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(modes(control).mode).toBe('dropdown');
      expect(control.dropDown.open).toBe(true);

      mousedown(control.items[1].itemView);
      keydown(document, 'Escape');
      expect(control.dropDown.open).toBe(false);
      expect(modes(control).mode).toBe('filter');

      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(control.dropDown.open).toBe(true);
      expect(modes(control).mode).toBe('dropdown');
    });

    it('1.32.4 a mousedown on a chip keeps the Filter input focused', () => {
      const control = setup();
      control.items[0].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowLeft');
      expect(modes(control).mode).toBe('chip');
      control.selectionBox.filter.el.focus();

      const handled = mousedown(control.selectionBox.chipsEl.children[0]);

      expect(handled.value).toBe(true);
      expect(document.activeElement).toBe(control.selectionBox.filter.el);
    });
  });

  // requires: DropDown-mode list navigation over the visible selectable Items
  // (ArrowUp/ArrowDown move, Home/End jump, PageUp/PageDown page by ten, Enter
  // toggles the Current Item while the DropDown stays open)
  describe('33. Keyboard - DropDown mode navigation', () => {
    const setup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
          { value: 'd', label: 'Delta' },
          { value: 'e', label: 'Echo' },
          { value: 'f', label: 'Foxtrot' },
          { value: 'g', label: 'Golf' },
          { value: 'h', label: 'Hotel' },
          { value: 'i', label: 'India' },
          { value: 'j', label: 'Juliett' },
          { value: 'k', label: 'Kilo' },
          { value: 'l', label: 'Lima' },
        ],
      });
    };
    const modes = (control) => control[MSELECT_INTERNALS].modes.mode;
    const open = (control) => {
      control.selectionBox.filter.el.dispatchEvent({
        type: 'keydown',
        key: 'ArrowDown',
        target: control.selectionBox.filter.el,
        preventDefault() {},
      });
    };
    const key = (control, id, keyName) => {
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

    it('1.33.1 ArrowDown moves the Current marker to the next visible Option', () => {
      const control = setup();
      open(control);
      expect(modes(control)).toBe('dropdown');
      expect(control.dropDown.currentItem).toBe(control.items[0]);

      key(control, 0, 'ArrowDown');

      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.33.2 ArrowDown on the last visible Option stays there but is consumed', () => {
      const control = setup();
      open(control);
      control.dropDown.setCurrent(control.items[11]);

      const prevented = key(control, 11, 'ArrowDown');

      expect(control.dropDown.currentItem).toBe(control.items[11]);
      expect(prevented.value).toBe(true);
    });

    it('1.33.3 ArrowUp moves the Current marker to the previous visible Option', () => {
      const control = setup();
      open(control);
      control.dropDown.setCurrent(control.items[2]);

      key(control, 2, 'ArrowUp');

      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.33.4 ArrowUp on the first visible Option stays there but is consumed', () => {
      const control = setup();
      open(control);
      expect(control.dropDown.currentItem).toBe(control.items[0]);

      const prevented = key(control, 0, 'ArrowUp');

      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(prevented.value).toBe(true);
    });

    it('1.33.5 navigation starts at the first Option when no marker is set', () => {
      const control = setup();
      open(control);
      control.dropDown.clearCurrent();

      key(control, 0, 'ArrowDown');

      expect(control.dropDown.currentItem).toBe(control.items[0]);
    });

    it('1.33.6 ArrowUp with no marker set starts at the last Option', () => {
      const control = setup();
      open(control);
      control.dropDown.clearCurrent();

      key(control, 0, 'ArrowUp');

      expect(control.dropDown.currentItem).toBe(control.items[11]);
    });

    it('1.33.7 navigation skips Options hidden by the Filter query', () => {
      const control = setup();
      control.selectionBox.filter.query = 'Bravo';
      open(control);
      expect(control.dropDown.currentItem).toBe(control.items[1]);

      key(control, 1, 'ArrowDown');

      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.33.8 Home jumps to the first visible Option and End to the last', () => {
      const control = setup();
      open(control);
      control.dropDown.setCurrent(control.items[5]);

      key(control, 5, 'Home');
      expect(control.dropDown.currentItem).toBe(control.items[0]);

      key(control, 0, 'End');
      expect(control.dropDown.currentItem).toBe(control.items[11]);
    });

    it('1.33.9 PageDown pages forward and PageUp pages back by ten', () => {
      const control = setup();
      open(control);
      expect(control.dropDown.currentItem).toBe(control.items[0]);

      key(control, 0, 'PageDown');
      expect(control.dropDown.currentItem).toBe(control.items[10]);

      control.dropDown.setCurrent(control.items[2]);
      key(control, 2, 'PageUp');
      expect(control.dropDown.currentItem).toBe(control.items[0]);
    });

    it('1.33.10 Enter toggles the Current Item, closes the DropDown and returns to the previous mode', () => {
      const control = setup();
      open(control);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
      control.items[0].toggle(true);
      control.dropDown.setCurrent(control.items[1]);

      const prevented = key(control, 1, 'Enter');

      expect(control.items[1].selected).toBe(true);
      expect(control.selectionBox.items).toContain(control.items[1]);
      expect(control.dropDown.open).toBe(false);
      expect(modes(control)).toBe('filter');
      expect(prevented.value).toBe(true);
    });

    it('1.33.11 Enter unselects an already selected Current Item and closes the DropDown', () => {
      const control = setup();
      control.items[0].toggle(true);
      open(control);

      key(control, 0, 'Enter');

      expect(control.items[0].selected).toBe(false);
      expect(control.selectionBox.items).not.toContain(control.items[0]);
      expect(control.dropDown.open).toBe(false);
      expect(modes(control)).toBe('filter');
    });

    it('1.33.12 Enter with no Current Item closes the DropDown and returns to the previous mode without changing the selection', () => {
      const control = setup();
      open(control);
      control.dropDown.clearCurrent();

      const prevented = key(control, 0, 'Enter');

      expect(control.selectionBox.items).toHaveLength(0);
      expect(control.dropDown.open).toBe(false);
      expect(modes(control)).toBe('filter');
      expect(prevented.value).toBe(true);
    });
  });

  // requires: clicking the Filter opening the DropDown without setting any
  // Current marker of its own (list navigation starts only from DropDown mode),
  // a marker a re-filter already put in place being left exactly where it stands
  describe('34. Mouse - clicking the Filter opens the DropDown without a Current Item', () => {
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

    it('1.34.1 clicking the Filter opens the DropDown leaving no Item Current', () => {
      const control = setup();
      expect(control.dropDown.open).toBe(false);

      control.selectionBox.filter.el.click();

      expect(control.dropDown.open).toBe(true);
      expect(control.dropDown.currentItem).toBeNull();
    });

    it('1.34.2 clicking the Filter marks nothing of its own, whatever the query marked', () => {
      const control = setup();
      control.selectionBox.filter.query = 'Bravo';
      // The query is what hands the marker over, not the click: a re-filter puts
      // it on the first visible Item, and the click that opens the list must leave
      // exactly that marker alone.
      expect(control.dropDown.currentItem).toBe(control.items[1]);

      control.selectionBox.filter.el.click();

      expect(control.dropDown.open).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.34.3 clicking the Filter while the DropDown is already open leaves the marker', () => {
      const control = setup();
      control.selectionBox.filter.el.click();
      control.dropDown.setCurrent(control.items[2]);

      control.selectionBox.filter.el.click();

      expect(control.dropDown.currentItem).toBe(control.items[2]);
      expect(control.dropDown.open).toBe(true);
    });
  });

  // requires: entering Filter mode clearing the "Current" marker, so a return
  // to Filter (Escape from DropDown, exit from Chip/Collapsed, normalize-mode
  // fallback) never leaves a Chip looking Current
  describe('35. Keyboard - returning to Filter mode clears the Current marker', () => {
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
    const keydown = (element, key) => {
      element.dispatchEvent({
        type: 'keydown',
        key,
        target: document.body,
        preventDefault() {},
      });
    };

    it('1.35.1 returning from DropDown to Filter via Escape clears the marker from a selected Item and its Chip', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.items[1].toggle(true);
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(modes(control)).toBe('dropdown');
      expect(control.dropDown.currentItem).toBe(control.items[0]);
      expect(control.items[0].current).toBe(true);
      expect(control.items[0].chipView.classList.contains('cm-chip--current')).toBe(true);

      keydown(control.selectionBox.filter.el, 'Escape');

      expect(modes(control)).toBe('filter');
      expect(control.dropDown.currentItem).toBeNull();
      expect(control.items[0].current).toBe(false);
      expect(control.items[0].chipView.classList.contains('cm-chip--current')).toBe(false);
      expect(control.items[0].itemView.classList.contains('cm-item--current')).toBe(false);
    });

    it('1.35.2 returning from DropDown to Filter via Escape clears a marker on an unselected Item too', () => {
      const control = setup();
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      expect(control.dropDown.currentItem).toBe(control.items[0]);

      keydown(control.selectionBox.filter.el, 'Escape');

      expect(modes(control)).toBe('filter');
      expect(control.dropDown.currentItem).toBeNull();
      expect(control.items[0].itemView.classList.contains('cm-item--current')).toBe(false);
    });
  });

  // requires: Filter-mode ArrowDown marking the first visible Item Current when
  // no marker is set, even when the DropDown is already open (the mouse-open
  // path), so list navigation starts on the very first ArrowDown
  describe('36. Keyboard - after a mouse-open the first ArrowDown enters DropDown mode on the first visible Item', () => {
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
    const keydown = (element, key) => {
      element.dispatchEvent({
        type: 'keydown',
        key,
        target: element,
        preventDefault() {},
      });
    };

    it('1.36.1 clicking the Filter opens the DropDown; the first ArrowDown enters DropDown mode with the first visible Item Current', () => {
      const control = setup();
      control.selectionBox.filter.el.click();
      expect(modes(control)).toBe('filter');
      expect(control.dropDown.open).toBe(true);
      expect(control.dropDown.currentItem).toBeNull();

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(modes(control)).toBe('dropdown');
      expect(control.dropDown.open).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
    });

    it('1.36.2 the following ArrowDown moves on to the next visible Item', () => {
      const control = setup();
      control.selectionBox.filter.el.click();
      keydown(control.selectionBox.filter.el, 'ArrowDown');
      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(modes(control)).toBe('dropdown');
      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });
  });

  // requires: DropDown-mode SpaceBar toggling the Current Item while staying in
  // DropDown mode with the DropDown open, and Enter committing (toggle +
  // close + return to the previous mode)
  describe('37. Keyboard - DropDown mode SpaceBar toggles, Enter commits and closes', () => {
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
    const open = (control) => {
      control.selectionBox.filter.el.dispatchEvent({
        type: 'keydown',
        key: 'ArrowDown',
        target: control.selectionBox.filter.el,
        preventDefault() {},
      });
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

    it('1.37.1 SpaceBar toggles the Current Item and stays in DropDown mode with the DropDown open', () => {
      const control = setup();
      open(control);
      expect(control.dropDown.currentItem).toBe(control.items[0]);

      const prevented = key(control, ' ');

      expect(control.items[0].selected).toBe(true);
      expect(control.selectionBox.items).toContain(control.items[0]);
      expect(control.dropDown.open).toBe(true);
      expect(modes(control)).toBe('dropdown');
      expect(prevented.value).toBe(true);
    });

    it('1.37.2 SpaceBar again unselects the Current Item, still in DropDown mode', () => {
      const control = setup();
      open(control);
      key(control, ' ');
      key(control, ' ');

      expect(control.items[0].selected).toBe(false);
      expect(control.dropDown.open).toBe(true);
      expect(modes(control)).toBe('dropdown');
    });

    it('1.37.3 SpaceBar keeps the Current Item marked Current', () => {
      const control = setup();
      open(control);
      control.dropDown.setCurrent(control.items[1]);

      key(control, ' ');

      expect(control.items[1].selected).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.37.4 SpaceBar with no Current Item is consumed without selecting anything', () => {
      const control = setup();
      open(control);
      control.dropDown.clearCurrent();

      const prevented = key(control, ' ');

      expect(control.selectionBox.items).toHaveLength(0);
      expect(control.dropDown.open).toBe(true);
      expect(modes(control)).toBe('dropdown');
      expect(prevented.value).toBe(true);
    });
  });

  // requires: the Item tree (group 1.1) and the DropDown items container
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

    it('1.39.22a a column Group whose children are a row opens on either axis', () => {
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

    it('1.39.22b a row of children of a column Group is walked along its own axis', () => {
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

    it('1.39.22 ArrowLeft on the first Group of a row level is its parent', () => {
      const { control, selectAll, level2, l21 } = nestedSetup();
      open(control);
      control.dropDown.setCurrent(level2);

      const prevented = key(control, 'ArrowLeft');

      expect(current(control)).toBe(selectAll);
      expect(current(control)).not.toBe(level2);
      expect(current(control)).not.toBe(l21);
      expect(prevented.value).toBe(true);
    });

    it('1.39.23 ArrowUp lands on the previous Group itself, not on its first child', () => {
      const { control, l25, l241, l242, l24 } = nestedSetup();
      open(control);
      control.dropDown.setCurrent(l25);

      key(control, 'ArrowUp');

      expect(current(control)).toBe(l24);
      expect(current(control)).not.toBe(l241);
      expect(current(control)).not.toBe(l242);
    });

    it('1.39.24 ArrowUp stops at a previous sibling whose level skips children', () => {
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

  // requires: REQ-3.7-05 - the summary Chip handled as any other Chip, so the
  // removal keys act on it as they would on a Chip of its own. It stands for the
  // whole selection rather than for one Item, so acting on it unselects all of it,
  // and the emptied box hands the keyboard back to Filter mode in one transition.
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
});