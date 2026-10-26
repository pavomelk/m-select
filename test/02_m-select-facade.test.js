import { describe, expect, it, vi } from 'vitest';
import { MSelectFacade } from '../src/m-select-facade.js';
import { specLog } from '../src/m-select.js';

/**
 * Behavioural spec for the value-based facade.
 *
 * The facade is the public surface: only primitives and plain values cross it.
 * These tests assert the contract from the outside — no Item, DropDown or
 * SelectionBox is reachable through the facade.
 */

describe('2. MSelectFacade', () => {
  const build = (config = {}, options) => {
    const host = document.createElement('div');
    const facade = new MSelectFacade(host, {
      items: config.items || [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C' },
      ],
      options,
    });
    return { host, facade };
  };

  const keydown = (facade, key) =>
    document.dispatchEvent({
      type: 'keydown',
      key,
      target: facade.el,
      preventDefault() {},
    });

  describe('2.1 Construction and mounting', () => {
    it('2.1.1 mounts the control element into the given root and exposes it', () => {
      const { host, facade } = build();

      expect(host.children).toContain(facade.el);
      expect(facade.el.classList.contains('cm-select')).toBe(true);
      expect(facade.root).toBe(host);
    });

    it('2.1.2 reads the selection preset in config', () => {
      const { facade } = build({
        items: [
          { value: 'a', label: 'A', selected: true },
          { value: 'b', label: 'B' },
        ],
      });

      expect(facade.values).toEqual(['a']);
    });

    it('2.1.3 isEmpty reflects a delayed-load control before setItems', () => {
      const { facade } = build({}, { delayedLoad: true });

      expect(facade.isEmpty).toBe(true);
      facade.setItems([{ value: 'a', label: 'A' }]);
      expect(facade.isEmpty).toBe(false);
    });
  });

  describe('2.2 Reads', () => {
    it('2.2.1 values are in arrival order and a defensive copy', () => {
      const { facade } = build();
      facade.select('b');
      facade.select('a');

      expect(facade.values).toEqual(['b', 'a']);

      facade.values.push('c');
      expect(facade.values).toEqual(['b', 'a']);
    });

    it('2.2.2 count reports the number selected', () => {
      const { facade } = build();

      expect(facade.count).toBe(0);
      facade.selectAll();
      expect(facade.count).toBe(3);
    });

    it('2.2.3 isOpen follows open() and close()', () => {
      const { facade } = build();

      expect(facade.isOpen).toBe(false);
      facade.open();
      expect(facade.isOpen).toBe(true);
      facade.close();
      expect(facade.isOpen).toBe(false);
    });

    it('2.2.4 mode reports the active input mode', () => {
      const { facade } = build();

      expect(facade.mode).toBe('filter');
      facade.open();
      keydown(facade, 'ArrowDown');
      expect(facade.mode).toBe('dropdown');
    });

    it('2.2.5 isCollapsed reports the summary Chip', () => {
      const { facade } = build({}, { maxVisibleChips: 1 });

      expect(facade.isCollapsed).toBe(false);
      facade.select('a');
      facade.select('b');
      expect(facade.isCollapsed).toBe(true);
    });
  });

  describe('2.3 Writes', () => {
    it('2.3.1 select() picks a leaf by value and reports whether the selection changed', () => {
      const { facade } = build();

      expect(facade.select('b')).toBe(true);
      expect(facade.values).toEqual(['b']);
      expect(facade.select('b')).toBe(false);
      expect(facade.select('nope')).toBe(false);
    });

    it('2.3.2 unselect() drops a selected leaf', () => {
      const { facade } = build();
      facade.select('a');

      expect(facade.unselect('a')).toBe(true);
      expect(facade.values).toEqual([]);
      expect(facade.unselect('a')).toBe(false);
    });

    it('2.3.3 toggle() flips a leaf', () => {
      const { facade } = build();

      expect(facade.toggle('a')).toBe(true);
      expect(facade.values).toEqual(['a']);
      expect(facade.toggle('a')).toBe(true);
      expect(facade.values).toEqual([]);
    });

    it('2.3.4 selectAll() selects every leaf; clear() empties', () => {
      const { facade } = build();

      facade.selectAll();
      expect(facade.values).toEqual(['a', 'b', 'c']);

      facade.clear();
      expect(facade.values).toEqual([]);
    });

    it('2.3.5 assigning values states the selection authoritatively, in the given order', () => {
      const { facade } = build();
      facade.select('c');

      facade.values = ['b', 'a'];

      expect(facade.values).toEqual(['b', 'a']);
    });

    it('2.3.6 assigning values skips values that name nothing, with a warning', () => {
      const warn = vi.spyOn(specLog, 'warn').mockImplementation(() => {});
      const { facade } = build();

      facade.values = ['a', 'nope', 'c'];

      expect(facade.values).toEqual(['a', 'c']);
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });

    it('2.3.7 assigning a non-array throws', () => {
      const { facade } = build();

      expect(() => {
        facade.values = 'a';
      }).toThrow(/array/);
    });

    it('2.3.8 setItems() seeds a delayed-load control and stays one-time', () => {
      const { facade } = build({}, { delayedLoad: true });

      facade.setItems(
        [
          { value: 'x', label: 'X' },
          { value: 'y', label: 'Y' },
        ],
        ['y']
      );

      expect(facade.values).toEqual(['y']);
      expect(() => facade.setItems([{ value: 'z', label: 'Z' }])).toThrow();
    });
  });

  describe('2.4 Events', () => {
    it('2.4.1 on() receives the control events', () => {
      const { facade } = build();
      const seen = [];
      facade.on('cm-dropdown-open', () => seen.push('open'));

      facade.open();

      expect(seen).toEqual(['open']);
    });

    it('2.4.2 on() returns an unsubscribe that stops delivery', () => {
      const { facade } = build();
      const seen = [];
      const off = facade.on('cm-dropdown-open', () => seen.push('open'));

      off();
      facade.open();

      expect(seen).toEqual([]);
    });

    it('2.4.3 off() removes a previously added handler', () => {
      const { facade } = build();
      const seen = [];
      const handler = () => seen.push('open');
      facade.on('cm-dropdown-open', handler);

      facade.off('cm-dropdown-open', handler);
      facade.open();

      expect(seen).toEqual([]);
    });

    it('2.4.4 mode changes are observable', () => {
      const { facade } = build();
      const seen = [];
      facade.on('cm-mode-change', (e) => seen.push(e.detail));

      facade.open();
      keydown(facade, 'ArrowDown');

      expect(seen).toEqual([{ from: 'filter', to: 'dropdown' }]);
    });
  });

  describe('2.5 Teardown', () => {
    it('2.5.1 destroy detaches the control element from the root', () => {
      const { host, facade } = build();
      const el = facade.el;

      facade.destroy();

      expect(host.children).not.toContain(el);
    });

    it('2.5.2 destroy detaches the document listeners', () => {
      const { facade } = build();

      facade.open();
      document.dispatchEvent({ type: 'mousedown', target: document.body });
      expect(facade.isOpen).toBe(false);

      facade.open();
      facade.destroy();
      document.dispatchEvent({ type: 'mousedown', target: document.body });
      expect(facade.isOpen).toBe(true);
    });

    it('2.5.3 destroy is idempotent', () => {
      const { facade } = build();

      expect(() => {
        facade.destroy();
        facade.destroy();
      }).not.toThrow();
    });

    it('2.5.4 the API refuses to act after destroy', () => {
      const { facade } = build();
      facade.destroy();

      expect(() => facade.select('a')).toThrow(/destroyed/);
    });
  });
});
