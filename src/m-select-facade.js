import { MSelect } from './m-select.js';

/**
 * Value-based facade over {@link MSelect}.
 *
 * This is the public surface applications build against. Only primitives and
 * plain values cross it — no `Item`, `DropDown`, `SelectionBox` or other
 * internal object is reachable — so a caller cannot reach in and desynchronise
 * the control's bookkeeping. The one object handed to application code is the
 * `Item` a {@link MSelectFacade#filterFn} is asked about, which is there to be
 * read (`label`, `value`), not held or written. It covers construction, reading
 * and writing the selection, the Filter's matching function, the DropDown open
 * state, the active mode, `cm-*` event subscription and teardown.
 *
 * The underlying control stays available for tests and internals; application
 * code should use this facade.
 *
 * ```js
 * const select = new MSelectFacade(host, { items, options: { name: 'city' } });
 * select.on('cm-mode-change', ({ detail }) => console.log(detail.to));
 * select.values = ['paris', 'london'];
 * ```
 */
export class MSelectFacade {
  #control;
  #destroyed = false;

  /**
   * @param {HTMLElement} root element the control mounts itself into
   * @param {{items: object[], options?: object}} config
   */
  constructor(root, config) {
    this.root = root;
    this.#control = new MSelect(root, config);
    this.el = this.#control.el;
  }

  /* ---- reads ---- */

  /** The selected Item values, in Chip (arrival) order. A defensive copy. */
  get values() {
    return this.#control.selectedValues;
  }

  /** How many values are selected. */
  get count() {
    return this.#control.selectedValues.length;
  }

  /** Whether the DropDown is open. */
  get isOpen() {
    return this.#control.dropDown.open;
  }

  /** Whether the Chips are collapsed into the summary Chip. */
  get isCollapsed() {
    return this.#control.selectionBox.isCollapsed;
  }

  /** The active input mode: `filter`, `dropdown`, `chip` or `collapsed`. */
  get mode() {
    return this.#control.mode;
  }

  /** Whether the control holds no Items yet (delayedLoad before `setItems`). */
  get isEmpty() {
    return this.#control.items.length === 0;
  }

  /**
   * The function deciding whether an Item matches the Filter query, or
   * `undefined` while the built-in label match is used. The Item it is asked
   * about is the control's own, so it is for reading, not for keeping or
   * writing.
   * @type {((item: object, query: string) => boolean)|undefined}
   */
  get filterFn() {
    return this.#control.filterFn;
  }

  /* ---- writes ---- */

  /**
   * Replaces the Filter's matching function and re-filters the list by the
   * query already in the Filter, re-homing the Current marker to it. Assigning
   * `null` restores the built-in label match (REQ-5-09).
   * @param {((item: object, query: string) => boolean)|null} fn
   */
  set filterFn(fn) {
    this.#assertAlive();
    this.#control.filterFn = fn;
  }

  /**
   * Selects the Item carrying `value`.
   * @param {unknown} value
   * @returns {boolean} whether the selection changed
   */
  select(value) {
    return this.#setSelected(value, true);
  }

  /**
   * Unselects the Item carrying `value`.
   * @param {unknown} value
   * @returns {boolean} whether the selection changed
   */
  unselect(value) {
    return this.#setSelected(value, false);
  }

  /**
   * Flips the selection of the Item carrying `value`.
   * @param {unknown} value
   * @returns {boolean} whether the selection changed
   */
  toggle(value) {
    this.#assertAlive();
    const item = this.#resolve(value);
    if (!item) return false;
    const before = item.selected;
    item.toggle();
    return item.selected !== before;
  }

  /**
   * States the whole selection from an array of values, in that order. Lenient:
   * values naming no Item, a Group or a repeat are warned about and skipped.
   * @param {unknown[]} values
   */
  set values(values) {
    this.#assertAlive();
    this.#control.selectedValues = values;
  }

  /** Removes every selected value. */
  clear() {
    this.#assertAlive();
    this.#control.clearAll();
  }

  /** Selects every selectable Item. */
  selectAll() {
    this.#assertAlive();
    this.#control.toggleAll();
  }

  /**
   * Instantiates the Item tree, once per control. Delayed-load controls call
   * this in response to `cm-items-request`.
   * @param {object[]} specs
   * @param {unknown[]} [selectedValues]
   * @returns {MSelectFacade} this, for chaining
   */
  setItems(specs, selectedValues) {
    this.#assertAlive();
    this.#control.setItems(specs, selectedValues);
    return this;
  }

  /** Opens the DropDown. */
  open() {
    this.#assertAlive();
    this.#control.dropDown.open = true;
  }

  /** Closes the DropDown. */
  close() {
    this.#assertAlive();
    this.#control.dropDown.open = false;
  }

  /* ---- events ---- */

  /**
   * Subscribes to a control event (`cm-items-request`, `cm-items-set`,
   * `cm-dropdown-open`, `cm-dropdown-close`, `cm-mode-change`,
   * `cm-selection-change`).
   * @param {string} type
   * @param {(event: CustomEvent) => void} handler
   * @returns {() => void} unsubscribe
   */
  on(type, handler) {
    this.#assertAlive();
    this.#control.el.addEventListener(type, handler);
    return () => this.off(type, handler);
  }

  /**
   * Removes a handler previously added with {@link MSelectFacade#on}.
   * @param {string} type
   * @param {(event: CustomEvent) => void} handler
   */
  off(type, handler) {
    this.#control.el.removeEventListener(type, handler);
  }

  /* ---- teardown ---- */

  /**
   * Tears the control down and detaches it from the page. Idempotent; after it,
   * every mutating method and `on`/`off` throw.
   */
  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#control.destroy();
  }

  /* ---- internals ---- */

  #assertAlive() {
    if (this.#destroyed) {
      throw new Error('MSelectFacade has been destroyed');
    }
  }

  #resolve(value) {
    return (
      this.#control.allItems.find(
        (item) => item.isSelectable && item.value === value
      ) || null
    );
  }

  #setSelected(value, selected) {
    this.#assertAlive();
    const item = this.#resolve(value);
    if (!item) return false;
    const before = item.selected;
    item.toggle(selected);
    return item.selected !== before;
  }
}

export default MSelectFacade;
