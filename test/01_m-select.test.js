import { describe, expect, it, vi } from 'vitest';
import { MSelect, Item, Filter } from '../src/m-select.js';

describe('1. MSelect', () => {
  describe('1. Items', () => {
    it('1.1.1 MSelect.items is a root Item acting as an array-like container', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      });

      expect(control.items).toBeInstanceOf(Item);
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
  });

  describe('2. Item', () => {
    it('1.2.1 Item.toggle() changes state to selected', () => {
      const item = new Item({ value: 'a', label: 'A' });
      expect(item.selected).toBe(false);
      item.toggle();
      expect(item.selected).toBe(true);
    });

    it('1.2.2 Item.toggle(true) ensures the item is selected', () => {
      const item = new Item({ value: 'a', label: 'A' });
      item.toggle(true);
      expect(item.selected).toBe(true);
    });

    it('1.2.3 Item.toggle(false) ensures the item is not selected', () => {
      const item = new Item({ value: 'a', label: 'A', selected: true });
      item.toggle(false);
      expect(item.selected).toBe(false);
    });

    it('1.2.4 selected:true instantiates the item in the "selected" state', () => {
      const item = new Item({ value: 'a', label: 'A', selected: true });
      expect(item.selected).toBe(true);
    });

    it('1.2.5 Item instantiation includes an ItemView with a distinct selected class', () => {
      const item = new Item({ value: 'a', label: 'A', selected: true });
      expect(item.itemView).toBeTruthy();
      expect(item.itemView.nodeType).toBe(1);
      expect(item.itemView.classList.contains('cm-item--selected')).toBe(true);
    });

    it('1.2.6 Item instantiation includes ChipView DOM elements', () => {
      const item = new Item({ value: 'a', label: 'A' });
      expect(item.chipView).toBeTruthy();
      expect(item.chipView.nodeType).toBe(1);
      expect(item.chipView.classList.contains('cm-chip')).toBe(true);
    });
  });

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

    it('1.3.2 the root Item element holds the itemViews of its top-level Items', () => {
      const a = new Item({ value: 'a', label: 'A' });
      const b = new Item({ value: 'b', label: 'B' });
      const root = Item.root([a, b]);

      expect(root.element.nodeType).toBe(1);
      expect(root.element.className).toBe('cm-items');
      expect(root.element.children).toHaveLength(2);
      expect(root.element.children[0]).toBe(a.itemView);
      expect(root.element.children[1]).toBe(b.itemView);
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
  });

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
  });

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
  });

  describe('12. DropDown - select all button', () => {
    const setup = () => {
      const host = document.createElement('div');
      return new MSelect(host, {
        items: [{ value: 'a', label: 'A' }],
      });
    };

    it('1.12.1 the select all button is shown by default', () => {
      const control = setup();

      expect(control.dropDown.selectAllBtn).toBeTruthy();
      expect(control.dropDown.showSelectAllButton).toBe(true);
      expect(control.dropDown.selectAllBtn.style.display).not.toBe('none');
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
  });

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
});