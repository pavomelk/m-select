/**
 * Input-mode definitions for the MSelect modes machine. Each factory returns
 * the shape `{name, onEntry?, onLeave?, handlers?}` handed to `Modes#define`:
 * the active mode's transition hooks own the DOM side-effects of a mode switch
 * and its `handlers` set processes input events routed by `Modes#processKey`.
 * Factories take the owning MSelect as their only argument so a mode's
 * behaviour lives close to the keys it answers, without adding a private
 * method per handler to the component class.
 */

const MODES = Object.freeze({
  FILTER: 'filter',
  CHIP: 'chip',
  COLLAPSED: 'collapsed',
  DROPDOWN: 'dropdown',
});

const setDisplaySelected = (control, value) => {
  control.selectionBox.filter.displaySelected = value;
};

const enableCaret = (control) => {
  control.selectionBox.filter.el.readOnly = false;
};

const hideCaret = (control) => {
  const input = control.selectionBox.filter.el;
  input.readOnly = true;
  input.blur();
};

/**
 * Default mode: typing in the Filter narrows the visible Items. Entering it
 * restores the caret; leaving it hides the caret so the input stays a single
 * Tab stop. ArrowDown opens the closed DropDown and makes the first visible
 * Item Current (the marker is left alone when the DropDown is already open).
 * @param {import('./m-select.js').MSelect} control
 */
export function filterMode(control) {
  return {
    onEntry: () => {
      enableCaret(control);
      setDisplaySelected(control, false);
    },
    onLeave: () => {
      hideCaret(control);
    },
    handlers: {
      ArrowDown: () => {
        const dd = control.dropDown;
        if (dd.el.classList.contains('cm-dropdown--open')) return;
        const first = control.allItems.find((item) => item.visible);
        if (first) dd.setCurrent(first);
        dd.open();
      },
    },
  };
}

/**
 * DropDown mode: navigating the Items list of the open DropDown. Keyboard
 * navigation (ArrowUp/ArrowDown/Enter/…) is wired here as it is specified.
 * @param {import('./m-select.js').MSelect} control
 */
export function dropdownMode() {
  return {};
}

/**
 * Chip mode: navigating the Chips of the selection box. Keyboard navigation
 * (ArrowLeft/ArrowRight/Backspace/Delete/…) is wired here as it is specified.
 * @param {import('./m-select.js').MSelect} control
 */
export function chipMode() {
  return {};
}

/**
 * Collapsed mode: navigating the selected Items while only they are shown.
 * Entering it restricts the DropDown to selected Items; leaving it restores a
 * regular list.
 * @param {import('./m-select.js').MSelect} control
 */
export function collapsedMode(control) {
  return {
    onEntry: () => {
      setDisplaySelected(control, true);
    },
    onLeave: () => {
      setDisplaySelected(control, false);
    },
  };
}

export { MODES };