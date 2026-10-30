import { describe, expect, it } from 'vitest';
import './teardown.js';
import { MSelect, Item, Filter, MSELECT_INTERNALS } from '../src/m-select.js';

/**
 * Behavioural spec for m-select — the keyboard in the open list.
 *
 * Areas 31-37: which element is the keyboard surface, the mouse path that
 * keeps the Filter in charge, navigation, the Current marker, and the
 * keys that toggle, commit and close.
 */

describe('1. MSelect — Keyboard in the DropDown', () => {
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

    it('1.31.4 a key from inside the control is handled even with the DropDown closed', () => {
      const control = setup();
      const handled = { value: false };

      // Dispatched at the document, where the listener sits, but aimed at a node
      // inside the control. While the DropDown is closed the document listener
      // considers only keys that came from inside the control, so this is the
      // half of that guard the document path is responsible for - the other half
      // being the Filter's own listener, which this dispatch deliberately skips.
      document.dispatchEvent({
        type: 'keydown',
        key: 'ArrowDown',
        target: control.selectionBox.filter.el,
        preventDefault() {
          handled.value = true;
        },
      });

      expect(handled.value).toBe(true);
      expect(control.dropDown.open).toBe(true);
      expect(modes(control).mode).toBe('dropdown');

      // Closed again before the test ends, and not because this test cares: no
      // test destroys its control, so every control any earlier test built still
      // has its document listener attached. An open DropDown answers document
      // keydowns aimed anywhere, which is what lets a left-over one swallow the
      // next test's keys and move its marker instead. This test is the one that
      // ends with a list open, so it is the one that has to put it back down.
      control.dropDown.open = false;
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
});
