/**
 * m-select — extended combobox+listbox basic visual prototype.
 * Vanilla JS only. See project/requirements.md for the full specification.
 */

const LOG_LEVELS = ['silent', 'error', 'warn', 'info', 'debug'];

/**
 * Simple built-in logger with configurable verbosity.
 */
export class Logger {
  /**
   * @param {string} level one of LOG_LEVELS
   */
  constructor(level = 'silent') {
    this.level = level;
  }

  setLevel(level) {
    if (LOG_LEVELS.includes(level)) {
      this.level = level;
    }
  }

  /**
   * @param {string} level
   * @param {string} message
   */
  log(level, message) {
    const rank = LOG_LEVELS.indexOf(level);
    if (rank > 0 && rank <= LOG_LEVELS.indexOf(this.level)) {
      // eslint-disable-next-line no-console
      console[level === 'error' ? 'error' : 'log'](`[m-select:${level}] ${message}`);
    }
  }

  error(message) { this.log('error', message); }
  warn(message) { this.log('warn', message); }
  info(message) { this.log('info', message); }
  debug(message) { this.log('debug', message); }
}

const normalizeBool = (value) => value !== false && String(value) !== 'false';

/**
 * The root of an option tree. It is a separate Array-like object used as the
 * parent of every top-level Item and offers the same owner interface an Item
 * does: `element` (where the top-level `itemView`s attach), `depth = -1` (so
 * top-level Items resolve to depth 0) and numeric keys / iteration over its
 * Items. In a component, its `element` is the one managed by the DropDown.
 */
export class RootContainer {
  /**
   * @param {HTMLElement} [element] the node the top-level `itemView`s attach
   * to; the container adopts it as its `element`. When omitted the container
   * creates its own node.
   */
  constructor(element) {
    this.depth = -1;
    this.isRoot = true;
    this.hasParent = false;
    // Sentinel "parent": an empty array can never be a real parent — a real
    // parent holds its children, so it has `length >= 1`.
    this.parent = Object.freeze([]);

    this.element = element || document.createElement('div');
    if (!element) {
      this.element.className = 'cm-items';
    }
  }

  /** @private array of registered top-level Items (mirrored by numeric keys). */
  #children = [];

  /** Number of registered top-level Items. */
  get length() {
    return this.#children.length;
  }

  /** Iterates over the registered top-level Items, enabling `for…of` and spread. */
  [Symbol.iterator]() {
    return this.#children[Symbol.iterator]();
  }

  /** Registers the given top-level Item under the next numeric key. */
  add(item) {
    const index = this.#children.length;
    this.#children.push(item);
    Object.defineProperty(this, index, {
      get: () => this.#children[index],
      configurable: true,
      enumerable: true,
    });
    return item;
  }

  /** Depth-first flattening of all option Items under this container. */
  flatten() {
    const result = [];
    const walk = (node) => {
      result.push(node);
      for (const child of node) {
        walk(child);
      }
    };
    for (const child of this) {
      walk(child);
    }
    return result;
  }

  /** All option Items (in tree order) that are selectable and carry a value. */
  get selectableItems() {
    return this.flatten().filter((item) => item.selectable && item.value !== undefined);
  }

  /**
   * Builds a root container of top-level Items from specs (or pre-built Items).
   * Each top-level Item receives the container as its `parent`.
   * @param {object[]} [specs]
   * @param {object} [options]
   * @param {HTMLElement} [element] node the container adopts as its `element`
   * @returns {RootContainer}
   */
  static build(specs, options, element) {
    const container = new RootContainer(element);
    (specs || []).forEach((spec, index) => {
      const item = spec instanceof Item ? spec : new Item(spec, options, index, container);
      container.add(item);
    });
    return container;
  }
}

/**
 * Single option tree node: either a Leaf Item or a Group Item with children.
 */
export class Item {
  /**
   * @param {object} spec
   * @param {object[]} spec.items child item specs
   * @param {object} [options] component options (e.g. `align` per level)
   * @param {number} [definitionIndex]
   * @param {RootContainer|Item} parent required owning container or Item
   */
  constructor(spec = {}, options = {}, definitionIndex = 0, parent) {
    if (!parent) {
      throw new Error('Item requires a parent (a RootContainer or an owning Item)');
    }
    if (spec.label === undefined || spec.label === null || spec.label === '') {
      throw new Error('Item without label is not allowed');
    }
    this.options = options;
    this.label = spec.label;
    this.value = spec.value;
    this.selectable = normalizeBool(spec.selectable);

    this.definitionIndex = definitionIndex;
    this.isGroup = false;
    this.selected = Boolean(spec.selected);
    this.#visible = spec.visible === undefined ? true : Boolean(spec.visible);
    this.parent = parent;
    this.owner = null;

    this.element = document.createElement('div');
    this.element.className = 'cm-item__children';
    if ((options.align || {})[this.depth] === 'row') {
      this.element.classList.add('cm-item__children--row');
    }

    this.#adopt((spec.items || []).map((child) => new Item(child, options, 0, this)));
    this.#createDOM();
    this.attachToParent();
    this.syncView();
  }

  /**
   * Creates the root container owning the given top-level specs (or pre-built
   * Items). Its `element` holds the top-level `itemView`s.
   * @param {object[]} [specs]
   * @param {object} [options]
   * @param {HTMLElement} [element] node the container adopts as its `element`
   * @returns {RootContainer}
   */
  static root(children, options, element) {
    return RootContainer.build(children, options, element);
  }

  /** @private array of child Items in tree order (mirrored by numeric keys). */
  #children = [];

  /**
   * Adopts the given child Items: marks the Item as a Group when non-empty and
   * stores the children under numeric keys (`item[0]`, `item[1]`, …). Each child
   * knows its parent (passed at construction) and has already attached its own
   * `itemView` to this Item's `element`.
   * @param {Item[]} children
   */
  #adopt(children) {
    this.#children = children;
    this.isGroup = children.length > 0;
    children.forEach((child, index) => {
      Object.defineProperty(this, index, {
        get: () => this.#children[index],
        configurable: true,
        enumerable: true,
      });
    });
  }

  /**
   * Attaches this Item's `itemView` into the `element` of the Item that owns it
   * (`this.parent`). Called during construction.
   * @returns {HTMLElement} the attached `itemView`
   */
  attachToParent() {
    this.parent.element.append(this.itemView);
    return this.itemView;
  }

  /** Number of direct child Items. */
  get length() {
    return this.#children.length;
  }

  /** Iterates over the direct child Items, enabling `for…of` and spread. */
  [Symbol.iterator]() {
    return this.#children[Symbol.iterator]();
  }

  /**
   * Whether the Item is rendered in the DropDown. The setter adjusts the
   * `cm-item--hidden` class of the Item's `itemView`.
   * @param {boolean} value
   */
  set visible(value) {
    this.#visible = Boolean(value);
    if (this.itemView) {
      this.itemView.classList.toggle('cm-item--hidden', !this.#visible);
    }
  }

  /** @returns {boolean} */
  get visible() {
    return this.#visible;
  }

  /** @private backing field for the visible property */
  #visible = true;

  /**
   * "Current" marker, moved across Chips/Items by the SelectionBox navigation
   * (selectFirst/selectPrevious/selectNext/selectLast). The setter reflects the
   * state in both the Item view and the Chip view.
   * @param {boolean} value
   */
  set current(value) {
    this.#current = Boolean(value);
    if (this.itemView) {
      this.itemView.classList.toggle('cm-item--current', this.#current);
    }
    if (this.chipView) {
      this.chipView.classList.toggle('cm-chip--current', this.#current);
    }
  }

  /** @returns {boolean} */
  get current() {
    return this.#current;
  }

  /** @private backing field for the current property */
  #current = false;

  /** The Item owning this Item. */
  get container() {
    return this.parent;
  }

  /**
   * Depth in the tree (0 = root level, i.e. direct Items of the RootContainer,
   * whose own depth is -1).
   */
  get depth() {
    return this.parent.depth + 1;
  }

  /**
   * Whether the Item represents a selectable option: a Group Item (its own
   * selection is an indicator) or a selectable Item carrying a value. A
   * leaf without a value cannot be toggled into "Selected".
   */
  get isSelectable() {
    return this.isGroup || (this.selectable && this.value !== undefined);
  }

  /** The immediately following sibling Item, or null when this is the last. */
  get nextSibling() {
    const siblings = [...this.parent];
    const index = siblings.indexOf(this);
    return index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  }

  /** The immediately preceding sibling Item, or null when this is the first. */
  get previousSibling() {
    const siblings = [...this.parent];
    const index = siblings.indexOf(this);
    return index > 0 ? siblings[index - 1] : null;
  }

  /** The first Item in the same sibling set as this Item. */
  get firstSibling() {
    return this.parent[0];
  }

  /** The last Item in the same sibling set as this Item. */
  get lastSibling() {
    const siblings = [...this.parent];
    return siblings[siblings.length - 1];
  }

  get selectableCount() {
    if (!this.isGroup) {
      return this.isSelectable ? 1 : 0;
    }
    let sum = 0;
    for (const child of this) {
      sum += child.selectableCount;
    }
    return sum;
  }

  get selectedCount() {
    if (!this.isGroup) {
      return this.selected && this.isSelectable ? 1 : 0;
    }
    let sum = 0;
    for (const child of this) {
      sum += child.selectedCount;
    }
    return sum;
  }

  /** Selection state used for the group tick: none | partial | all. */
  get selectionState() {
    const total = this.selectableCount;
    if (total === 0) return 'none';
    const picked = this.selectedCount;
    if (picked === 0) return 'none';
    if (picked === total) return 'all';
    return 'partial';
  }

  /** Depth-first flattening of this Item's children (and their descendants). */
  flatten() {
    const result = [];
    const walk = (node) => {
      result.push(node);
      for (const child of node) {
        walk(child);
      }
    };
    for (const child of this) {
      walk(child);
    }
    return result;
  }

  /** All descendants that are selectable and carry a value. */
  get selectableItems() {
    return this.flatten().filter((i) => i.selectable && i.value !== undefined);
  }

  /**
   * Changes the selection state. Non-selectable Items (leaf without value)
   * cannot be toggled into "Selected".
   *
   * Calling protocol:
   * - `toggle()` flips this Item's own state; a Group Item then hands the
   *   resulting state to each child via `child.toggle(after)`.
   * - `toggle(state)` is the child side of that cascade: this Item decides on
   *   its own whether it follows, per `groupItems.toggleScope`:
   *   - `'all'`: follows regardless of visibility.
   *   - `'visible'` (default): follows only while visible.
   * An Item that decides to follow cascades the state further down, letting
   * each of its own children decide in turn.
   * @param {boolean} [state] target state handed down by this Item's parent
   * @returns {boolean} the resulting selected state
   */
  toggle(state) {
    if (!this.isSelectable) return this.selected;

    const prompted = state !== undefined;
    const after = prompted ? Boolean(state) : !this.selected;

    if (prompted) {
      const scope = (this.options.groupItems || {}).toggleScope || 'visible';
      if (!(scope === 'all' || (scope === 'visible' && this.visible))) {
        return this.selected;
      }
    }

    this.selected = after;

    if (this.isGroup) {
      for (const child of this) {
        child.toggle(after);
      }
    }

    if (this.owner) {
      this.owner.onItemToggled(this);
    }
    return this.selected;
  }

  /**
   * Builds this Item's DOM parts — the Item view (`itemView`) and the Chip view
   * (`chipView`) — without considering the running state (selection, visibility,
   * focus). State-dependent classes and content are applied by `syncView()`.
   * For Group Items it creates only the children container; the rendering of
   * the children is delegated to the child Items (each renders its own `itemView`).
   */
  #createDOM() {
    const li = document.createElement('div');
    li.className = 'cm-item';

    if (this.isGroup) {
      li.classList.add('cm-item--group');
    }
    if (!this.isSelectable) {
      li.classList.add('cm-item--unselectable');
    }

    const row = document.createElement('div');
    row.className = 'cm-item__row';

    const tick = document.createElement('span');
    tick.className = 'cm-item__tick';
    this.tickEl = tick;

    const label = document.createElement('span');
    label.className = 'cm-item__label';
    label.textContent = this.label;

    row.append(tick, label);
    li.append(row);

    if (this.isGroup) {
      li.append(this.element);
    }

    this.itemView = li;

    const chip = document.createElement('span');
    chip.className = 'cm-chip';
    chip.title = this.label;
    chip._item = this;

    const chipLabel = document.createElement('span');
    chipLabel.textContent = this.label;

    const x = document.createElement('button');
    x.className = 'cm-chip__x';
    x.title = 'Remove';
    x.textContent = '\u00d7';
    x._item = this;

    chip.append(chipLabel, x);
    this.chipView = chip;
  }

  /**
   * Public: applies the current selection/visibility/focus state to the already
   * created DOM parts (`itemView`, `chipView`). Called after `#createDOM()`.
   */
  syncView() {
    const li = this.itemView;
    if (!li) return;

    li.classList.toggle('cm-item--hidden', !this.visible);
    if (!this.isGroup) {
      li.classList.toggle('cm-item--selected', this.selected);
    }

    const state = this.isGroup ? this.selectionState : (this.selected ? 'all' : 'none');
    if (this.tickEl) {
      this.tickEl.classList.toggle('cm-item__tick--partial', state === 'partial');
      this.tickEl.textContent = state === 'all' || state === 'partial' ? '\u2713' : '';
    }
    if (this.isGroup) {
      li.classList.toggle('cm-item--selected', state === 'all');
      li.classList.toggle('cm-item--partial', state === 'partial');
    }
  }
}

/**
 * Text input narrowing the visible Items via a debounced `DropDown.filter` call.
 */
export class Filter {
  /**
   * @param {MSelect} control
   * @param {number} [debounceDelay] ms before the filter is applied
   */
  constructor(control, debounceDelay = 300) {
    this.control = control;
    this.debounceDelay = debounceDelay;
    this.el = document.createElement('input');
    this.el.className = 'cm-filter';
    this.el.type = 'text';
    this.el.placeholder = this.control.options.placeholder || '';
    this.el.addEventListener('input', () => this.onInput());
  }

  /** @type {ReturnType<typeof setTimeout>|null} */
  #debounceTimer = null;

  /**
   * Whether the Filter restricts the DropDown to selected Items only.
   * Assigning a value immediately re-filters the DropDown: `true` shows only
   * selected Items, `false` shows every Item again.
   * @param {boolean} [value]
   * @returns {boolean}
   */
  get displaySelected() {
    return this.#displaySelected;
  }

  set displaySelected(value) {
    this.#displaySelected = Boolean(value);
    if (this.#displaySelected) {
      this.control.dropDown.filter('', (item) => item.selected);
    } else {
      this.control.dropDown.filter(this.query);
    }
  }

  /** @private backing field for displaySelected */
  #displaySelected = false;

  /**
   * The current filter query. Reading returns the input element's value;
   * assigning writes it to the element, turns `displaySelected` off and
   * re-filters the DropDown by text.
   * @param {string} [value]
   * @returns {string}
   */
  get query() {
    return this.el.value;
  }

  set query(value) {
    this.el.value = String(value || '');
    this.#displaySelected = false;
    this.control.dropDown.filter(this.el.value);
  }

  /** Debounced event handler of the input element. */
  onInput() {
    clearTimeout(this.#debounceTimer);
    this.#displaySelected = false;
    this.#debounceTimer = setTimeout(() => {
      this.control.dropDown.filter(this.query);
    }, this.debounceDelay);
  }
}

/** Always-visible part of the control: chips + filter + clear-all. */
/** The summary chip shown when the selection count exceeds `maxVisibleChips`. */
class CollapsedChip {
  constructor() {
    this.chipView = document.createElement('span');
    this.chipView.className = 'cm-chip cm-chip--summary';
    this.chipView.title = 'Individual items must be unselected via the dropdown';
  }

  /** @private backing field for the current property */
  #current = false;

  /**
   * Whether this chip is the current navigation target. Reads return the
   * current state; assigning a boolean marks (true) or unmarks (false) it.
   * @param {boolean} [value]
   * @returns {boolean}
   */
  get current() {
    return this.#current;
  }

  set current(value) {
    this.#current = Boolean(value);
    this.chipView.classList.toggle('cm-chip--current', this.#current);
  }

  /** Refreshes the label from the given number of selected Items. */
  update(count) {
    this.chipView.textContent = `${count} items selected`;
  }
}

class SelectionBox {
  /**
   * @param {MSelect} control
   */
  constructor(control) {
    this.control = control;
    this.items = [];
    this.chips = [];
    this.el = document.createElement('div');
    this.el.className = 'cm-selection';
    this.chipsEl = document.createElement('div');
    this.chipsEl.className = 'cm-chips';
    this.clearBtn = document.createElement('button');
    this.clearBtn.className = 'cm-clear';
    this.clearBtn.title = 'Clear all selection';
    this.clearBtn.textContent = '\u2715';

    this.filter = new Filter(this.control);

    this.collapsedChip =
      this.control.options.maxVisibleChips != null ? new CollapsedChip() : null;

    this.keepCollapsed = false;

    this.el.append(this.chipsEl, this.filter.el, this.clearBtn);

    this.clearBtn.addEventListener('click', () => this.control.clearAll());

    this.chipsEl.addEventListener('click', (e) => this.control.onChipClick(e));
  }

  /** @private backing field: whether the selection is shown as a CollapsedChip. */
  #collapsed = false;

  /**
   * Whether the selection is currently shown as a CollapsedChip. Maintained by
   * add()/remove()/render(); with `keepCollapsed`, an achieved collapse is held
   * until the last Item is removed.
   */
  get isCollapsed() {
    return this.#collapsed;
  }

  /** Recomputes the displayed collapse state from the selection count. */
  #updateCollapsedState() {
    const max = this.control.options.maxVisibleChips;
    if (max == null) {
      this.#collapsed = false;
      return;
    }
    const count = this.control.selectedItems.length;
    this.#collapsed = count > max || (this.#collapsed && this.keepCollapsed && count > 0);
  }

  /**
   * Adds the given Item's chipView to the selection box.
   * @param {Item} item
   */
  add(item) {
    this.items.push(item);
    this.chips.push(item.chipView);
    this.#updateCollapsedState();

    if (this.isCollapsed) {
      this.chipsEl.innerHTML = '';
      this.collapsedChip.update(this.control.selectedItems.length);
      this.chipsEl.append(this.collapsedChip.chipView);
      return;
    }

    const list = this.control.orderedChips();
    const index = list.indexOf(item);
    const next = list[index + 1];
    if (next) {
      this.chipsEl.insertBefore(item.chipView, next.chipView);
    } else {
      this.chipsEl.append(item.chipView);
    }
  }

  /**
   * Removes the given Item's chipView from the selection box.
   * @param {Item} item
   */
  remove(item) {
    const wasCollapsed = this.isCollapsed;
    const itemIndex = this.items.indexOf(item);
    if (itemIndex >= 0) this.items.splice(itemIndex, 1);

    const chipIndex = this.chips.indexOf(item.chipView);
    if (chipIndex >= 0) this.chips.splice(chipIndex, 1);

    this.#updateCollapsedState();

    if (this.isCollapsed) {
      this.chipsEl.innerHTML = '';
      this.collapsedChip.update(this.control.selectedItems.length);
      this.chipsEl.append(this.collapsedChip.chipView);
    } else if (wasCollapsed) {
      this.chipsEl.innerHTML = '';
      this.control.orderedChips().forEach((item) => this.chipsEl.append(item.chipView));
    } else if (this.chipsEl.children.includes(item.chipView)) {
      this.chipsEl.removeChild(item.chipView);
    }

    if (this.control.dropDown.currentItem === item) {
      this.control.dropDown.clearCurrent();
    }
  }

  /**
   * Returns the Item previously added for the given Item value.
   * @param {string} value
   * @returns {Item|undefined}
   */
  chip(value) {
    return this.items.find((item) => item.value === value);
  }

  /** The Items currently shown as chips, in the order they are placed. */
  get chipItems() {
    return this.control.orderedChips();
  }

  /** Marks the first chip Item as current. */
  selectFirst() {
    const list = this.chipItems;
    if (list.length > 0) this.control.dropDown.setCurrent(list[0]);
  }

  /** Marks the last chip Item as current. */
  selectLast() {
    const list = this.chipItems;
    if (list.length > 0) this.control.dropDown.setCurrent(list[list.length - 1]);
  }

  /** Moves the "Current" marker to the next chip Item, wrapping at the end. */
  selectNext() {
    const list = this.chipItems;
    if (list.length === 0) return;
    const index = list.indexOf(this.control.dropDown.currentItem);
    this.control.dropDown.setCurrent(list[(index + 1) % list.length]);
  }

  /** Moves the "Current" marker to the previous chip Item, wrapping at the start. */
  selectPrevious() {
    const list = this.chipItems;
    if (list.length === 0) return;
    const index = list.indexOf(this.control.dropDown.currentItem);
    this.control.dropDown.setCurrent(list[(index - 1 + list.length) % list.length]);
  }

  render() {
    this.#updateCollapsedState();
    this.chipsEl.innerHTML = '';
    if (this.isCollapsed) {
      this.collapsedChip.update(this.control.selectedItems.length);
      this.chipsEl.append(this.collapsedChip.chipView);
    } else {
      this.control.orderedChips().forEach((item) => this.chipsEl.append(item.chipView));
    }
  }
}

/** Collapsible part: the filtered item tree and the "select all" button. */
class DropDown {
  constructor(control, itemsSpecs, options) {
    this.control = control;
    this.el = document.createElement('div');
    this.el.className = 'cm-dropdown';

    this.toolbarEl = document.createElement('div');
    this.toolbarEl.className = 'cm-dropdown__toolbar';
    this.selectAllBtn = document.createElement('button');
    this.selectAllBtn.className = 'cm-dropdown__select-all';
    this.selectAllBtn.textContent = 'Select All';
    this.selectAllBtn.addEventListener('click', () => this.control.toggleAll());

    this.toolbarEl.append(this.selectAllBtn);

    this.itemsEl = document.createElement('div');
    this.itemsEl.className = 'cm-items';
    this.el.append(this.toolbarEl, this.itemsEl);

    this.items = Item.root(itemsSpecs || [], options, this.itemsEl);
  }

  /** @private backing field: whether the "Select All" button is displayed. */
  #showSelectAllBtn = true;

  /**
   * Controls whether the "Select All" button is displayed. Reads return the
   * current visibility state; assigning a boolean shows or hides the button.
   * @param {boolean} [value]
   * @returns {boolean}
   */
  get showSelectAllButton() {
    return this.#showSelectAllBtn;
  }

  set showSelectAllButton(value) {
    this.#showSelectAllBtn = Boolean(value);
    this.selectAllBtn.style.display = this.#showSelectAllBtn ? '' : 'none';
  }

  /** The currently marked Item, or null when none is defined. */
  #currentItem = null;

  /**
   * The Item carrying the "Current" marker, or null when no marker is defined.
   * @returns {Item|null}
   */
  get currentItem() {
    return this.#currentItem;
  }

  /**
   * Reassigns the "Current" marker: marks the given Item (or clears the marker
   * when null) while keeping a single marker at a time.
   * @param {Item|null} item
   */
  set currentItem(item) {
    if (this.#currentItem === item) return;
    if (this.#currentItem) this.#currentItem.current = false;
    this.#currentItem = item || null;
    if (this.#currentItem) {
      this.#currentItem.current = true;
      this.#ensureVisible(this.#currentItem);
    }
  }

  /** Clears the "Current" marker, leaving no Item marked. */
  clearCurrent() {
    this.currentItem = null;
  }

  /**
   * Marks the given Item (or clears the marker when given null) while keeping a
   * single "Current" marker at a time.
   * @param {Item|null} item
   */
  setCurrent(item) {
    this.currentItem = item;
  }

  open() {
    this.el.classList.add('cm-dropdown--open');
    if (this.#currentItem) this.#ensureVisible(this.#currentItem);
  }

  close() {
    this.el.classList.remove('cm-dropdown--open');
  }

  /** Whether the DropDown is currently shown. */

  /**
   * Brings the given Item's `itemView` into the DropDown's visible viewport,
   * but only while the DropDown is open (scrolling a hidden panel is pointless).
   * @param {Item} item
   */
  #ensureVisible(item) {
    if (!this.el.classList.contains('cm-dropdown--open')) return;
    item.itemView.scrollIntoView({ block: 'nearest' });
  }

  /**
   * Filters the Item tree by Item label. The default matching function keeps an
   * Item visible when its label contains `textValue` (case-insensitive). An
   * empty value shows every Item.
   *
   * Visibility of a Group Item's children follows `groupItems.toggleScope`:
   * - `'all'`: a matching Group Item shows all of its children.
   * - `'matching'`: a matching Group Item keeps only the children that also match.
   * A non-matching Group Item stays visible when at least one of its children
   * is visible.
   * @param {string} textValue
   * @param {(item: Item, textValue: string) => boolean} [matchFn]
   */
  filter(textValue, matchFn) {
    const query = String(textValue || '');
    const q = query.toLowerCase();
    const customMatcher = typeof matchFn === 'function';
    const matcher = matchFn || ((item) => item.label.toLowerCase().includes(q));
    const scope = this.control.options.groupItems?.toggleScope || 'all';

    const apply = (items) => {
      for (const item of items) {
        if (item.isGroup) {
          const selfMatch = customMatcher ? matcher(item, q) : q === '' || matcher(item, q);
          apply(item);
          if (selfMatch && scope === 'all' && !customMatcher) {
            for (const child of item) {
              child.visible = true;
            }
          }
          item.visible = selfMatch || [...item].some((child) => child.visible);
        } else {
          item.visible = customMatcher ? matcher(item, q) : q === '' || matcher(item, q);
        }
      }
    };

    apply(this.control.items);
    this.control.render();
  }

  toggle() {
    this.el.classList.toggle('cm-dropdown--open');
  }

  render() {
    this.control.allItems.forEach((item) => item.syncView());
  }
}

/**
 * The component.
 */
export class MSelect {
  /**
   * @param {HTMLElement} root
   * @param {{items: object[], options?: object}} config
   */
  constructor(root, config) {
    this.root = root;
    this.options = config.options || {};
    this.logger = new Logger(this.options.logLevel || 'silent');

    this.dropDown = new DropDown(this, config.items, this.options);
    this.#assertUniqueValues();
    this.selectionBox = new SelectionBox(this);
    this.allItems.forEach((item) => {
      item.owner = this;
    });

    this.el = document.createElement('div');
    this.el.className = 'cm-select';
    this.el.append(this.selectionBox.el, this.dropDown.el);
    root.append(this.el);

    this.selectionBox.el.addEventListener('click', (e) => {
      if (!this.dropDown.el.contains(e.target)) {
        this.dropDown.open();
      }
    });
    document.addEventListener('mousedown', (e) => {
      if (!this.el.contains(e.target)) {
        this.dropDown.close();
      }
    });

    this.logger.info('component rendered');
    this.render();
  }

  /** @private Throws when more than one Item declares the same non-empty value. */
  #assertUniqueValues() {
    const seen = new Set();
    for (const item of this.allItems) {
      const value = item.value;
      if (value === undefined || value === null || value === '') continue;
      if (seen.has(value)) {
        throw new Error(`Duplicate item value: "${value}"`);
      }
      seen.add(value);
    }
  }

  /** The root of the Item tree, created inside the DropDown on its itemsEl. */
  get items() {
    return this.dropDown.items;
  }

  get allItems() {
    return this.items.flatten();
  }

  /** Items currently selected, i.e. the chips' source. */
  get selectedItems() {
    return this.items.selectableItems.filter((i) => i.selected);
  }

  /** Chips ordered per `chipPlaceOrder`. */
  orderedChips() {
    const order = this.options.chipPlaceOrder || 'asPicked';
    let list;
    if (order === 'asPicked') {
      list = this.selectionBox.items.slice();
    } else {
      list = this.selectedItems.slice();
      if (order === 'asDefined') {
        list.sort((a, b) => a.definitionIndex - b.definitionIndex);
      } else if (order === 'alphabetical') {
        list.sort((a, b) => a.label.localeCompare(b.label));
      }
    }
    return list;
  }

  /**
   * Changes the chip placement order at runtime and re-renders the chips.
   * @param {'asPicked'|'asDefined'|'alphabetical'} order
   */
  setChipPlaceOrder(order) {
    this.options.chipPlaceOrder = order;
    this.render();
  }

  /**
   * @param {Item} item
   */
  unselectItem(item) {
    item.selected = false;
    this.selectionBox.remove(item);
    if (item.isGroup) {
      for (const child of item) {
        this.unselectItem(child);
      }
    }
    this.render();
  }

  /**
   * Handles an Item's selection state change: adds the Chip for passed/selected
   * Items carrying a value, removes it for unselected ones. Called by Item#toggle.
   * @param {Item} item
   */
  onItemToggled(item) {
    if (item.selected) {
      if (item.value !== undefined) {
        this.selectionBox.add(item);
      }
    } else {
      this.selectionBox.remove(item);
    }
    this.render();
  }

  clearAll() {
    this.logger.info('clear all');
    this.items.selectableItems.forEach((i) => {
      i.selected = false;
    });
    this.render();
  }

  toggleAll() {
    const target = this.allItems.some((i) => i.selected && i.value !== undefined) ? 'unselect' : 'select';
    this.logger.info(`toggle all -> ${target}`);
    for (const item of this.items.selectableItems) {
      item.selected = target === 'select';
    }
    this.render();
  }

  /* ---- selection interaction ---- */

  /**
   * Delegated chip click handler: removal via the chip's "x" element.
   * @param {Event} e
   */
  onChipClick(e) {
    const x = e.target && e.target.closest ? e.target.closest('.cm-chip__x') : null;
    if (x && x._item) {
      e.stopPropagation();
      this.unselectItem(x._item);
    }
  }

  render() {
    this.dropDown.render();
    this.selectionBox.render();
  }
}

export const msLog = new Logger();

export default MSelect;