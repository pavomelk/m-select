import { describe, expect, it } from 'vitest';
import './teardown.js';
import { MSelect, Item, RootContainer } from '../src/m-select.js';

/**
 * Behavioural spec for m-select — the Chips in the Selection Box.
 *
 * Areas 8-11: Chip placement order, movement of the Current marker across
 * Chips, scrolling the Current Item into view, and navigation over the Item
 * tree as a structure.
 */

describe('1. MSelect — Chips', () => {
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
});
