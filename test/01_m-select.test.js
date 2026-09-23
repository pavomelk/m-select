import { describe, expect, it } from 'vitest';
import { MSelect, Item, Items } from '../src/m-select.js';

describe('1. MSelect', () => {
  describe('1. Items', () => {
    it('1.1.1 MSelect.items is an Items composition', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      });

      expect(control.items).toBeInstanceOf(Items);
      expect(control.items).toHaveLength(2);
      control.items.forEach((item) => {
        expect(item).toBeInstanceOf(Item);
      });
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

      const group = control.items.at(0);
      expect(group).toBeInstanceOf(Item);
      expect(group.isGroup).toBe(true);
      expect(group.children).toHaveLength(2);
      group.children.forEach((child) => {
        expect(child).toBeInstanceOf(Item);
        expect(child.parent).toBe(group);
      });
    });

    it('1.1.3 group children are an Items composition (Composite pattern)', () => {
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

      const group = control.items.at(0);
      expect(group.children).toBeInstanceOf(Items);
      expect(group.children).toHaveLength(2);

      const childArray = [];
      group.children.forEach((child) => childArray.push(child));
      expect(childArray).toHaveLength(2);
      childArray.forEach((child) => {
        expect(child).toBeInstanceOf(Item);
        expect(child.parent).toBe(group);
      });
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
      const noValue = control.items.at(0);
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

  describe('3. Items', () => {
    it('1.3.1 Items constructor requires a DOM element', () => {
      const element = document.createElement('div');
      const items = new Items(element, []);
      expect(items.element).toBe(element);
      expect(items.element.nodeType).toBe(1);
    });

    it('1.3.2 Items element holds itemViews of its immediate children', () => {
      const element = document.createElement('div');
      const a = new Item({ value: 'a', label: 'A' });
      const b = new Item({ value: 'b', label: 'B' });
      const items = new Items(element, [a, b]);

      expect(items.element.children).toHaveLength(2);
      expect(items.element.children[0]).toBe(a.itemView);
      expect(items.element.children[1]).toBe(b.itemView);
    });

    it('1.3.3 Items + Item composition accommodates arbitrary hierarchy depth (>= 3 levels)', () => {
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
        items.forEach((item) => {
          expect(item.depth).toBe(expectedDepth);
          expect(item.itemView).toBeTruthy();
          expect(item.itemView.nodeType).toBe(1);
          expect(item.children.element).toBeTruthy();
          if (item.isGroup) {
            expect(item.itemView.children).toContain(item.children.element);
            expect(item.children.element.children.length).toBe(item.children.list.length);
            walk(item.children, expectedDepth + 1, accumulator);
          } else {
            expect(item.children.element.children).toHaveLength(0);
          }
          accumulator.push(item);
        });
        return accumulator;
      };

      const all = walk(control.items, 0, []);
      expect(all).toHaveLength(5);

      const labels = all.map((i) => i.label);
      expect(labels).toContain('Level 3 - B2.1');

      const deepest = control.items.flatten().reduce((a, b) => (b.depth > a.depth ? b : a));
      expect(deepest.depth).toBe(2);
      expect(control.items.at(1).children.at(1).children.at(0).value).toBe('l3-b2.1');
      
    });
  });

  describe('4. SelectionBox', () => {
    it('1.4.1 SelectionBox can add Item.chipView element', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ value: 'a', label: 'A' }],
      });

      const item = control.items.at(0);
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

      const item = control.items.at(0);
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

      const item = control.items.at(0);
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

      const item = control.items.at(0);
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

      const item = control.items.at(0);
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

      const item = control.items.at(0);
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

      const group = control.items.at(0);
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

      const group = control.items.at(0);
      group.toggle(true);

      expect(group.selected).toBe(true);
      expect(control.selectionBox.chips).not.toContain(group.chipView);
    });

    it('1.5.5 Item without children and without value cannot be toggled Selected and is marked non-selectable', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ label: 'No value' }],
      });

      const item = control.items.at(0);
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
      expect(control.items.at(0).visible).toBe(false);
      expect(control.items.at(1).visible).toBe(true);

      dropDown.filter('LON');
      expect(control.items.at(0).visible).toBe(false);
      expect(control.items.at(1).visible).toBe(true);

      dropDown.filter('');
      expect(control.items.at(0).visible).toBe(true);
      expect(control.items.at(1).visible).toBe(true);
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
      const group = control.items.at(0);

      dropDown.filter('alpha');

      expect(group.visible).toBe(true);
      expect(group.children.at(0).visible).toBe(true);
      expect(group.children.at(1).visible).toBe(false);
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
      const group = control.items.at(0);

      dropDown.filter('alpha');

      expect(group.visible).toBe(true);
      expect(group.children.at(0).visible).toBe(true);
      expect(group.children.at(1).visible).toBe(true);
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

      const group = control.items.at(0);
      group.children.at(1).visible = false;

      group.toggle(true);

      expect(group.selected).toBe(true);
      expect(group.children.at(0).selected).toBe(true);
      expect(group.children.at(1).selected).toBe(true);

      group.toggle(false);

      expect(group.selected).toBe(false);
      expect(group.children.at(0).selected).toBe(false);
      expect(group.children.at(1).selected).toBe(false);
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

      const group = control.items.at(0);
      group.children.at(1).visible = false;

      group.toggle(true);

      expect(group.children.at(0).selected).toBe(true);
      expect(group.children.at(1).selected).toBe(false);
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

      const group = control.items.at(0);
      group.children.at(0).selected = true;
      group.children.at(0).visible = true;
      group.children.at(1).selected = true;
      group.children.at(1).visible = false;

      group.toggle(false);

      expect(group.children.at(0).selected).toBe(false);
      expect(group.children.at(1).selected).toBe(true);
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

      const group = control.items.at(0);
      group.children.at(0).selected = true;
      group.children.at(1).selected = true;
      group.children.at(1).visible = false;

      group.toggle(false);

      expect(group.children.at(0).selected).toBe(false);
      expect(group.children.at(1).selected).toBe(false);
    });

    it('1.7.5 Item.visible setter toggles the itemView hidden class', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [{ value: 'a', label: 'A' }],
      });

      const item = control.items.at(0);
      expect(item.itemView.classList.contains('cm-item--hidden')).toBe(false);

      item.visible = false;
      expect(item.itemView.classList.contains('cm-item--hidden')).toBe(true);

      item.visible = true;
      expect(item.itemView.classList.contains('cm-item--hidden')).toBe(false);
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
      const [c, a, b] = control.items.list;

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
      const [c, a, b] = control.items.list;

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
      const [c, a, b] = control.items.list;

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
      const [c, a, b] = control.items.list;

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
});