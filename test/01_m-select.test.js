import { describe, expect, it, vi } from 'vitest';
import { MSelect, Item, RootContainer, Filter, MSELECT_INTERNALS } from '../src/m-select.js';

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

    it('1.2.6 Item instantiation includes ChipView DOM elements', () => {
      const item = new Item({ value: 'a', label: 'A' }, {}, 0, root);
      expect(item.chipView).toBeTruthy();
      expect(item.chipView.nodeType).toBe(1);
      expect(item.chipView.classList.contains('cm-chip')).toBe(true);
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
      expect(item.chipView.title).toBe('A');
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

    it('1.5.3 Selecting a Group Item with value adds a Chip to SelectionBox', () => {
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
      expect(control.selectionBox.chips).toContain(group.chipView);
      expect(control.selectionBox.chip('g')).toBe(group);
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

    it('1.6.2 toggleScope "matching": matching Group Item keeps only matching children visible', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'matching' } },
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

    it('1.6.3 toggleScope "all": matching Group Item makes all children visible', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { groupItems: { toggleScope: 'all' } },
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
  });

  // requires: options.chipPlaceOrder (asPicked/asDefined/alphabetical),
  // orderedChips, setChipPlaceOrder, SelectionBox.add ordered insertion
  describe('8. Chip placement order', () => {
    const items = [
      { value: 'c', label: 'Charlie' },
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Bravo' },
    ];

    it('1.8.1 chipPlaceOrder "asPicked": chips appear in the order items were selected', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, { items });
      const [c, a, b] = [...control.items];

      b.toggle(true);
      a.toggle(true);
      c.toggle(true);
      control.selectionBox.render();

      const labels = control.selectionBox.chipsEl.children.map((el) => el.title);
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

      const labels = control.selectionBox.chipsEl.children.map((el) => el.title);
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

      const labels = control.selectionBox.chipsEl.children.map((el) => el.title);
      expect(labels).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('1.8.4 chipPlaceOrder can be changed at runtime', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, { items });
      const [c, a, b] = [...control.items];

      expect(control.options.chipPlaceOrder ?? 'asPicked').toBe('asPicked');

      b.toggle(true);
      c.toggle(true);
      a.toggle(true);
      control.selectionBox.render();
      expect(control.selectionBox.chipsEl.children.map((el) => el.title)).toEqual(['Bravo', 'Charlie', 'Alpha']);

      control.setChipPlaceOrder('alphabetical');
      control.selectionBox.render();
      expect(control.selectionBox.chipsEl.children.map((el) => el.title)).toEqual(['Alpha', 'Bravo', 'Charlie']);

      control.setChipPlaceOrder('asDefined');
      control.selectionBox.render();
      expect(control.selectionBox.chipsEl.children.map((el) => el.title)).toEqual(['Charlie', 'Alpha', 'Bravo']);
    });

    it('1.8.5 add() appends chipViews in "asPicked" (selection) order', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, { items });
      const [c, a, b] = [...control.items];

      b.selected = true;
      control.selectionBox.add(b);
      a.selected = true;
      control.selectionBox.add(a);
      c.selected = true;
      control.selectionBox.add(c);

      expect(control.selectionBox.chipsEl.children.map((el) => el.title)).toEqual(['Bravo', 'Alpha', 'Charlie']);
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

      expect(control.selectionBox.chipsEl.children.map((el) => el.title)).toEqual(['Alpha', 'Bravo', 'Charlie']);
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

      expect(control.selectionBox.chipsEl.children.map((el) => el.title)).toEqual(['Charlie', 'Alpha', 'Bravo']);
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
      expect(control.selectionBox.chipsEl.children.map((el) => el.title)).toEqual(['Bravo', 'Delta']);

      a.selected = true;
      control.selectionBox.add(a);
      expect(control.selectionBox.chipsEl.children.map((el) => el.title)).toEqual(['Alpha', 'Bravo', 'Delta']);
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
      control.dropDown.open();

      control.dropDown.currentItem = control.items[2];

      expect(control.dropDown.currentItem).toBe(control.items[2]);
      expect(control.items[2].itemView.scrollIntoViewCalls).toBe(1);
    });

    it('1.10.2 assigning currentItem while closed does not scroll', () => {
      const control = setup();
      control.dropDown.close();

      control.dropDown.currentItem = control.items[1];

      expect(control.dropDown.currentItem).toBe(control.items[1]);
      expect(control.items[1].itemView.scrollIntoViewCalls).toBe(0);
    });

    it('1.10.3 changing currentItem while open scrolls only the newly current itemView', () => {
      const control = setup();
      control.dropDown.open();

      control.dropDown.currentItem = control.items[0];
      control.dropDown.currentItem = control.items[2];

      expect(control.items[0].itemView.scrollIntoViewCalls).toBe(1);
      expect(control.items[2].itemView.scrollIntoViewCalls).toBe(1);
      expect(control.items[1].itemView.scrollIntoViewCalls).toBe(0);
    });

    it('1.10.4 opening the DropDown scrolls the already assigned currentItem into view', () => {
      const control = setup();
      control.dropDown.currentItem = control.items[3];

      control.dropDown.open();

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
      expect(control.items.hasParent).toBe(false);
      expect(control.items.depth).toBe(-1);
    });

    it('1.11.7 depth grows from 0 and every Item names the RootContainer or an Item as parent', () => {
      const control = setup();
      const fruit = control.items[0];

      expect(control.items.isRoot).toBe(true);
      expect(control.items.hasParent).toBe(false);
      expect(control.items.depth).toBe(-1);

      expect(fruit.parent).toBe(control.items);
      expect(fruit.depth).toBe(0);
      expect(fruit[0].depth).toBe(1);
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

    it('1.12.7 toggling all on a value-bearing Group treats the Group as a selected unit, like clicking it', () => {
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
      expect(control.selectionBox.items.map((i) => i.value).sort()).toEqual(['a', 'b', 'g']);

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
  });

  // requires: options.maxVisibleChips, CollapsedChip (chipView, current,
  // update), SelectionBox.isCollapsed state, keepCollapsed flag
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
      expect(control.selectionBox.collapsedChip.chipView.textContent).toBe('4 items selected');

      control.unselectItem(control.items[3]);
      expect(control.selectionBox.collapsedChip.chipView.textContent).toBe('3 items selected');
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

    it('1.14.6 the CollapsedChip has no removal ("x") element', () => {
      const control = setup();
      for (const item of control.items) item.toggle(true);

      const collapsed = control.selectionBox.collapsedChip.chipView;
      expect(collapsed.children.every((el) => !el.classList.contains('cm-chip__x'))).toBe(true);
    });

    it('1.14.7 the CollapsedChip "current" flag toggles the cm-chip--current class on its view', () => {
      const control = setup();
      const collapsed = control.selectionBox.collapsedChip;

      collapsed.current = true;
      expect(collapsed.chipView.classList.contains('cm-chip--current')).toBe(true);

      collapsed.current = false;
      expect(collapsed.chipView.classList.contains('cm-chip--current')).toBe(false);
    });

    it('1.14.8 while collapsed, the SelectionBox keeps tracking the individual chips (state persistence)', () => {
      const control = setup();
      for (const item of control.items) item.toggle(true);

      expect(control.selectionBox.items).toHaveLength(3);
      expect(control.selectionBox.chips).toHaveLength(3);
      expect(control.selectionBox.chip('b')).toBe(control.items[1]);
      expect(control.selectionBox.chipsEl.children).toHaveLength(1);
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
      expect(control.selectionBox.collapsedChip.chipView.textContent).toBe('3 items selected');
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
      expect(control.selectionBox.collapsedChip.chipView.textContent).toBe('4 items selected');

      control.items[3].selected = false;
      control.selectionBox.remove(control.items[3]);

      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(control.selectionBox.collapsedChip.chipView.textContent).toBe('3 items selected');
      expect(control.selectionBox.chipsEl.children).toHaveLength(1);
      expect(control.selectionBox.chipsEl.children[0]).toBe(
        control.selectionBox.collapsedChip.chipView
      );
    });

    it('1.14.12 the keepCollapsed flag defaults to false', () => {
      const control = setup();
      expect(control.selectionBox.keepCollapsed).toBe(false);
    });

    it('1.14.13 with keepCollapsed, remove() keeps the Collapsed chip while at least one Item remains selected', () => {
      const control = setup([{ value: 'd', label: 'Delta' }]);
      control.selectionBox.keepCollapsed = true;
      for (const item of control.items) {
        item.selected = true;
        control.selectionBox.add(item);
      }
      expect(control.selectionBox.isCollapsed).toBe(true);

      control.items[3].selected = false;
      control.selectionBox.remove(control.items[3]);
      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(control.selectionBox.chipsEl.children).toHaveLength(1);
      expect(control.selectionBox.chipsEl.children[0]).toBe(
        control.selectionBox.collapsedChip.chipView
      );
      expect(control.selectionBox.collapsedChip.chipView.textContent).toBe('3 items selected');

      control.items[2].selected = false;
      control.selectionBox.remove(control.items[2]);
      expect(control.selectionBox.isCollapsed).toBe(true);
      expect(control.selectionBox.chipsEl.children).toHaveLength(1);
      expect(control.selectionBox.collapsedChip.chipView.textContent).toBe('2 items selected');
    });

    it('1.14.14 with keepCollapsed, removing the last Item expands the box', () => {
      const control = setup();
      control.selectionBox.keepCollapsed = true;
      for (const item of control.items) {
        item.selected = true;
        control.selectionBox.add(item);
      }
      expect(control.selectionBox.isCollapsed).toBe(true);

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
      control.dropDown.el.classList.contains('cm-dropdown--open');

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
      control.dropDown.el.classList.contains('cm-dropdown--open');

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
      control.dropDown.el.classList.contains('cm-dropdown--open');

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

    it('1.17.3 removing the only remaining Current chip leaves no chip Current', () => {
      const control = setup();
      control.items[0].toggle(true);
      control.dropDown.setCurrent(control.items[0]);

      xOf(control.items[0]).click();

      expect(control.dropDown.currentItem).toBeNull();
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
      control.dropDown.el.classList.contains('cm-dropdown--open');
    const keydown = (element, key) =>
      element.dispatchEvent({
        type: 'keydown',
        key,
        preventDefault() {},
      });

    it('1.19.1 focusing the Filter enters Filter mode with the caret enabled', () => {
      const control = setup();
      control.dropDown.open();
      control.selectionBox.filter.el.dispatchEvent({ type: 'focus' });

      expect(modes(control).mode).toBe('filter');
      expect(control.selectionBox.filter.el.readOnly).toBe(false);
    });

    it('1.19.2 ArrowDown in Filter mode opens a closed DropDown and makes the first visible item Current', () => {
      const control = setup();
      expect(isOpen(control)).toBe(false);
      expect(control.dropDown.currentItem).toBeNull();

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(isOpen(control)).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
    });

    it('1.19.3 ArrowDown with the DropDown already open keeps the first visible item Current', () => {
      const control = setup();
      control.dropDown.open();
      control.items[1].toggle(true);
      control.dropDown.setCurrent(control.items[1]);

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(isOpen(control)).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[1]);
    });

    it('1.19.4 ArrowDown respects the filter: with only matching Items visible, the first visible one is Current', () => {
      const control = setup();
      control.selectionBox.filter.query = 'a'; // visible: Alpha, Charlie

      keydown(control.selectionBox.filter.el, 'ArrowDown');

      expect(isOpen(control)).toBe(true);
      expect(control.dropDown.currentItem).toBe(control.items[0]);
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
  });
});