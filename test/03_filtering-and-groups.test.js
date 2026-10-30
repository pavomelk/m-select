import { describe, expect, it, vi } from 'vitest';
import './teardown.js';
import { MSelect, Item, Filter, specLog } from '../src/m-select.js';

/**
 * Behavioural spec for m-select — the Filter query and Group toggling.
 *
 * Areas 6-7: which Items a query leaves visible, the selected-Items
 * restriction, the application matcher, and the tri-state of a Group that
 * follows its descendants.
 */

describe('1. MSelect — Filtering and Groups', () => {
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

    it('1.6.8 options.filterFn replaces the built-in label match for the whole list', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { filterFn: (item) => item.value.startsWith('par') },
        items: [
          { value: 'paris', label: 'Paris' },
          { value: 'london', label: 'London' },
        ],
      });

      // The matcher answers for itself: the query names nothing in either label.
      control.dropDown.filter('zzz');

      expect(control.items[0].visible).toBe(true);
      expect(control.items[1].visible).toBe(false);
    });

    it('1.6.9 a custom matcher is given the Item and the query as typed, case and all', () => {
      const seen = [];
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: {
          filterFn: (item, query) => {
            seen.push([item.value, query]);
            return item.label.startsWith(query);
          },
        },
        items: [
          { value: 'paris', label: 'Paris' },
          { value: 'london', label: 'London' },
        ],
      });

      control.dropDown.filter('Pa');

      expect(seen).toEqual([
        ['paris', 'Pa'],
        ['london', 'Pa'],
      ]);
      expect(control.items[0].visible).toBe(true);
      expect(control.items[1].visible).toBe(false);

      // A case-folded query would still match here; the one typed does not.
      control.dropDown.filter('pa');
      expect(control.items[0].visible).toBe(false);
    });

    it('1.6.10 an empty query filters nothing and does not consult the custom matcher', () => {
      const matcher = vi.fn(() => false);
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { filterFn: matcher },
        items: [
          { value: 'paris', label: 'Paris' },
          { value: 'london', label: 'London' },
        ],
      });

      control.dropDown.filter('');

      expect(matcher).not.toHaveBeenCalled();
      expect(control.items[0].visible).toBe(true);
      expect(control.items[1].visible).toBe(true);
    });

    it('1.6.11 filterScope "all" applies to a custom matcher: a matching Group reveals its children', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: {
          groupItems: { filterScope: 'all' },
          filterFn: (item, query) => item.value === query,
        },
        items: [
          {
            label: 'Alpha Group',
            value: 'group',
            items: [
              { value: 'alpha', label: 'Alpha' },
              { value: 'beta', label: 'Beta' },
            ],
          },
        ],
      });

      control.dropDown.filter('group');

      expect(control.items[0].visible).toBe(true);
      expect(control.items[0][0].visible).toBe(true);
      expect(control.items[0][1].visible).toBe(true);
    });

    it('1.6.12 filterScope "matching" applies to a custom matcher: only matching children stay', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: {
          groupItems: { filterScope: 'matching' },
          filterFn: (item, query) => item.value === query || item.value === 'beta',
        },
        items: [
          {
            label: 'Alpha Group',
            value: 'group',
            items: [
              { value: 'alpha', label: 'Alpha' },
              { value: 'beta', label: 'Beta' },
            ],
          },
        ],
      });

      control.dropDown.filter('group');

      expect(control.items[0].visible).toBe(true);
      expect(control.items[0][0].visible).toBe(false);
      expect(control.items[0][1].visible).toBe(true);
    });

    it('1.6.13 assigning filterFn at runtime re-applies the current query and re-homes the marker', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        items: [
          { value: 'paris', label: 'Paris' },
          { value: 'london', label: 'London' },
        ],
      });

      control.selectionBox.filter.query = 'on';
      expect(control.dropDown.currentItem).toBe(control.items[1]);

      control.filterFn = (item) => item.value === 'paris';

      expect(typeof control.filterFn).toBe('function');
      expect(control.items[0].visible).toBe(true);
      expect(control.items[1].visible).toBe(false);
      expect(control.dropDown.currentItem).toBe(control.items[0]);

      control.filterFn = null;

      // The built-in match is back, over the query the Filter still holds.
      expect(control.filterFn).toBeUndefined();
      expect(control.items[1].visible).toBe(true);
      expect(control.items[0].visible).toBe(false);
    });

    it('1.6.14 a filterFn that is not a function is reported and the built-in match stays', () => {
      const warn = vi.spyOn(specLog, 'warn').mockImplementation(() => {});
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { filterFn: 'label' },
        items: [
          { value: 'paris', label: 'Paris' },
          { value: 'london', label: 'London' },
        ],
      });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(control.filterFn).toBeUndefined();

      control.dropDown.filter('on');
      expect(control.items[0].visible).toBe(false);
      expect(control.items[1].visible).toBe(true);

      warn.mockRestore();
    });

    it('1.6.15 a custom matcher does not reach the selected-Items restriction', () => {
      const host = document.createElement('div');
      const control = new MSelect(host, {
        options: { filterFn: () => true },
        items: [
          { value: 'paris', label: 'Paris' },
          { value: 'london', label: 'London' },
        ],
      });
      control.items[1].toggle(true);

      control.selectionBox.filter.displaySelected = true;

      // The restricted list is a population, not a query: it is answered by
      // `inSelection` whatever matcher the application supplied for text.
      expect(control.items[0].visible).toBe(false);
      expect(control.items[1].visible).toBe(true);
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
});
