/**
 * m-select — extended combobox+listbox basic visual prototype.
 * Vanilla JS only. See project/requirements.md for the full specification.
 */

const LOG_LEVELS = ['silent', 'error', 'warn', 'info', 'debug'];

/**
 * Preset-selection safeguard limits: when a setItems call instantiates more than
 * PRESET_SELECTION_LIMIT already-selected Items while maxVisibleChips is left
 * null, the component enforces maxVisibleChips = PRESET_MAX_VISIBLE_CHIPS so the
 * SelectionBox collapses to the summary Chip instead of flooding the DOM with
 * hundreds of individual Chips. The cap applies only at instantiation.
 */
const PRESET_SELECTION_LIMIT = 50;
const PRESET_MAX_VISIBLE_CHIPS = 25;

import { MODES, filterMode, dropdownMode, chipMode, collapsedMode } from './modes.js';

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
 * Reads an Item's `value`, treating `null`, `undefined` and the empty string as
 * the absence of a value rather than as values in their own right. An Item with
 * no value is not selectable (REQ-3.2-05) and owns no Chip, so it would be wrong
 * for `value: ''` to slip through as a value and produce one; the same absence
 * is what duplicate detection skips (REQ-7-21). `0` and `false` are real values
 * and are kept.
 * @param {*} value
 * @returns {*} the value, or `undefined` when there is none
 */
const normalizeValue = (value) =>
  value === undefined || value === null || value === '' ? undefined : value;

/**
 * Logs warnings for an Item spec that says something the component cannot take
 * literally. Deliberately permissive - a spec is not rejected for a spelling the
 * component can read correctly - but loud enough to catch an author who thinks
 * they have turned a selection off and have not.
 *
 * `selectable` is meant to be a boolean. The string `'false'` is still honoured
 * (an HTML attribute or URL parameter arrives as a string), so it warns no more
 * than `false` does; a value that is neither boolean nor read as false - `0`,
 * `'FALSE'`, `'yes'` - is the case worth reporting, because the author's intent
 * and the component's reading have parted ways. A flag read as true on an Item
 * with no value warns too: there is nothing to select, so the flag promises
 * something the Item cannot deliver. `selectable: false` on a valueless Item is
 * not reported - it says the same thing the missing value already does.
 * @param {object} spec the Item spec as authored
 * @param {*} value the normalized value
 * @param {boolean} selectable the reading the component settled on
 */
const warnOnSpec = (spec, value, selectable) => {
  if (spec.selectable === undefined) return;
  if (typeof spec.selectable !== 'boolean' && selectable) {
    specLog.warn(
      `Item "${spec.label}": "selectable" should be a boolean, but ${JSON.stringify(
        spec.selectable
      )} is being read as true. Use true or false.`
    );
  }
  if (value === undefined && selectable) {
    specLog.warn(
      `Item "${spec.label}": "selectable" is set, but the Item has no value, ` +
        'so there is nothing to select. Give it a value or drop the flag.'
    );
  }
};

/**
 * Logger for spec-authoring warnings, kept separate from a component's own
 * `logger` because an Item is built before its control exists and has no logger
 * to report to. It defaults to `warn`, not `silent`, so a mistake in the spec
 * is visible without having to turn logging on; a component constructed with an
 * explicit `logLevel` sets this to match, so `logLevel: 'silent'` still quiets
 * it. Exported so tests can observe the warnings.
 */
export const specLog = new Logger('warn');

/**
 * Resolves the layout of a single hierarchy level out of the `align` option.
 * Levels are keyed by the depth of the Items they hold (0 = the top-level ones),
 * so `align: { 1: 'row' }` lays out the children of a top-level Group
 * horizontally. An entry is either the shorthand `'row'`/`'column'` or an object
 * `{ flow }`.
 *
 * Layout is presentation. It picks which arrow keys walk the level (see
 * `Item#inRow` and `REQ-3.11-14.1`) and nothing else: no setting here can make
 * an Item unreachable, turn a real move into a no-op, or redirect the walk,
 * because the walk is decided per Item by `Item#next`/`Item#previous`.
 * @param {object} [options] component options
 * @param {number} depth depth of the Items the level holds
 * @returns {{flow: 'row'|'column'}}
 */
const levelConfig = (options, depth) => {
  const entry = (options && options.align && options.align[depth]) || {};
  const config = typeof entry === 'string' ? { flow: entry } : entry;
  return { flow: config.flow === 'row' ? 'row' : 'column' };
};

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

  /**
   * Every Item under this container in tree order, depth-first, maintained
   * rather than recomputed. An Item's place in this array is its `definitionIndex`,
   * which is what `chipPlaceOrder: 'asDefined'` sorts by.
   *
   * It is kept in step at exactly two moments, and both are here: `add()` for a
   * subtree registered at runtime, and `#indexSubtree()` for the build. Anything
   * that changes the shape of the tree later - an `Item.append()` placed between
   * siblings, say - has to splice its subtree in at the right offset and renumber
   * from there, or the array and `definitionIndex` will describe a tree that is no
   * longer the one on screen. That is the one obligation this array creates.
   * @private
   */
  #all = [];

  /**
   * Appends an Item's subtree to the maintained flat order and gives every Item
   * in it its `definitionIndex`.
   * @private
   * @param {Item} item root of the subtree
   * @param {number} [at] position to splice at; appended when omitted
   * @returns {Item[]} the Items added, in the order they now hold
   */
  #indexSubtree(item, at) {
    const added = [];
    const walk = (node) => {
      added.push(node);
      for (const child of node) walk(child);
    };
    walk(item);
    const start = at === undefined ? this.#all.length : at;
    this.#all.splice(start, 0, ...added);
    // Renumbering from the splice point keeps every position before it untouched,
    // which is what makes an insertion at the front as cheap as one at the end.
    for (let i = start; i < this.#all.length; i += 1) {
      this.#all[i].definitionIndex = i;
    }
    return added;
  }

  /** Number of registered top-level Items. */
  get length() {
    return this.#children.length;
  }

  /** Iterates over the registered top-level Items, enabling `for…of` and spread. */
  [Symbol.iterator]() {
    return this.#children[Symbol.iterator]();
  }

  /**
   * Registers the given top-level Item under the next numeric key, and its
   * subtree in the flat order.
   * @param {Item} item
   * @returns {Item} the Item
   */
  add(item) {
    const index = this.#children.length;
    this.#children.push(item);
    Object.defineProperty(this, index, {
      get: () => this.#children[index],
      configurable: true,
      enumerable: true,
    });
    this.#indexSubtree(item);
    return item;
  }

  /**
   * Registers a subtree at a chosen place in the tree instead of at the end,
   * for a tree whose shape is decided after the build. `before` is the top-level
   * Item the new one goes in front of; omitted means the end, which is `add()`.
   *
   * This exists so the one obligation the maintained array creates has a single
   * place to be met: the child list, the flat order and `definitionIndex` are all
   * brought into line in one call, because a tree changed in one of them and not
   * the others is worse than no maintenance at all.
   *
   * Top-level only. Nesting an Item inside an existing Group is a different
   * operation - it also has to recount the visibility and selection counters up
   * the chain of parents - so it belongs to an `Item` method of its own rather
   * than being folded in here.
   * @param {Item} item top-level Item to insert
   * @param {Item} [before] the top-level Item to insert in front of
   * @returns {Item[]} the Items inserted, in their new order
   */
  insertBefore(item, before) {
    if (before === undefined) return this.#indexSubtree(this.add(item));
    const childAt = this.#children.indexOf(before);
    if (childAt < 0) {
      throw new Error('insertBefore: the reference Item is not a top-level Item of this container');
    }
    const flatAt = this.#all.indexOf(before);
    this.#children.splice(childAt, 0, item);
    this.#indexTopLevelKeys();
    // The constructor attached the itemView to the end of the element, so it is
    // moved to where it now belongs in the tree.
    this.element.insertBefore(item.itemView, before.itemView);
    return this.#indexSubtree(item, flatAt);
  }

  /** @private Rebinds the numeric keys after the child list is reordered. */
  #indexTopLevelKeys() {
    this.#children.forEach((child, index) => {
      Object.defineProperty(this, index, {
        get: () => this.#children[index],
        configurable: true,
        enumerable: true,
      });
    });
  }

  /**
   * Walks the tree and returns the flat order it ought to hold, so a test can
   * hold the maintained array against the definition it implements. Not on the
   * hot path - the array exists so that production code never has to do this.
   * @returns {Item[]}
   */
  recountOrder() {
    const result = [];
    const walk = (node) => {
      result.push(node);
      for (const child of node) walk(child);
    };
    for (const child of this.#children) walk(child);
    return result;
  }

  /**
   * Every Item under this container in tree order. The maintained array itself,
   * not a copy of it: reading it is on the hot path of a chip render, and the
   * list it describes cannot disagree with the tree because it is updated by the
   * same calls that change the tree. Callers that need to sort or splice it must
   * copy first - which is why `orderedChips()` does.
   * @returns {Item[]}
   */
  flatten() {
    return this.#all;
  }

  /** All leaf option Items (in tree order) that are selectable and carry a value. */
  get selectableItems() {
    return this.#all.filter((item) => !item.isGroup && item.isSelectable);
  }

  /**
   * Bulk toggle over the visible subtree, mirroring `Item#toggle()`'s calling
   * protocol on the root node: `toggle()` flips the visible selectable Items —
   * unselects them when any is selected, selects them otherwise — and
   * `toggle(state)` forces that state on them. Hidden (filtered-out) Items are
   * left exactly as they are. Notifications flow through each Item's `owner` so
   * Chips stay in sync.
   * @param {boolean} [state]
   * @returns {boolean} the resulting selection state
   */
  toggle(state) {
    const visible = this.selectableItems.filter((item) => item.visible);
    const prompted = state !== undefined;
    const after = prompted ? Boolean(state) : !visible.some((item) => item.selected);
    for (const item of visible) {
      if (item.selected === after) continue;
      item.selected = after;
      item.owner.onItemToggled(item);
    }
    return after;
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
   * @param {string} [spec.tooltip] native tooltip text for the Item and its Chip
   * @param {object} [options] component options (e.g. `align` per level)
   * @param {number} [definitionIndex] position in the owning container's flat
   *   order. Only a starting value: the container renumbers every Item of a
   *   subtree when it registers that subtree, so a nested Item ends up with its
   *   real place in the whole tree rather than the 0 it would otherwise keep.
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
    /**
     * Native tooltip text (REQ-3.2-07). Rendered on the Item view and, when a
     * Chip is built, on the Chip view. Kept separate from the label: without a
     * tooltip there is none, on either view.
     * @type {string|undefined}
     */
    this.tooltip = spec.tooltip;
    this.value = normalizeValue(spec.value);
    this.selectable = normalizeBool(spec.selectable);
    warnOnSpec(spec, this.value, this.selectable);

    this.definitionIndex = definitionIndex;
    this.isGroup = false;
    // Before the flag below, which walks the chain of parents to report itself.
    this.parent = parent;
    this.owner = null;
    this.itemView = null;
    this.chipView = null;
    this.#visible = spec.visible === undefined ? true : Boolean(spec.visible);

    this.element = document.createElement('div');
    this.element.className = 'cm-item__children';

    this.#adopt((spec.items || []).map((child) => new Item(child, options, 0, this)));
    // The flag is authored on the Item it names, and the two kinds read it
    // differently: on a Leaf it is that Item's own selection, while on a Group
    // it stands for the whole subtree and so selects the selectable descendants.
    // Either way the Group's own flag is left to `selectedCount` to answer.
    if (this.isGroup) {
      if (spec.selected) this.#selectSubtree();
    } else {
      this.selected = Boolean(spec.selected);
    }
    this.#createDOM();
    this.attachToParent();
    this.syncView();
  }

  /** @private The flag itself; read through `selected`, which knows its kind. */
  #selected = false;

  /**
   * Selection flag of a Leaf Item - whether this Item is one of the selected
   * ones, and so owns a Chip and counts towards `selectedItems`. Assigning to it
   * is the only way this state changes, which is what lets the enclosing Groups
   * be answered from `selectedCount` rather than from a flag of their own: every
   * write lands here, and every write is reported up the chain.
   *
   * On a Group Item the flag is derived - it says whether anything below is
   * selected - so assigning to it changes nothing. A Group is a container, not a
   * selection of its own: it owns no Chip, `selectedItems` leaves it out, and its
   * `selected: true` spec flag is shorthand for its selectable descendants.
   * @param {boolean} value
   */
  set selected(value) {
    if (this.isGroup) return;
    const after = Boolean(value);
    if (after === this.#selected) return;
    // A Leaf that cannot be selected is not part of any count, so its flag moves
    // nothing above it.
    const delta = this.isSelectable ? (after ? 1 : -1) : 0;
    this.#selected = after;
    // The visible-and-picked count follows the same write, but only while this
    // Leaf is reachable - a pick made behind a filter is not part of what a
    // toggle reads until the filter lets it back in.
    const visibleDelta = delta && this.#visible ? delta : 0;
    for (let group = this.parentItem; group; group = group.parentItem) {
      group.#selectedCount += delta;
      group.#visibleSelectedCount += visibleDelta;
      group.#selected = group.#selectedCount > 0;
    }
  }

  /** @returns {boolean} */
  get selected() {
    return this.#selected;
  }

  /**
   * Selects every selectable descendant, which is what a `selected: true` flag on
   * a Group asks for. Children are already built and have applied their own flags,
   * so the walk only writes the ones left out - and so a nested Group's flag has
   * already been honoured by the time its parent reaches it.
   * @private
   */
  #selectSubtree() {
    for (const child of this.#children) {
      if (child.isGroup) {
        child.#selectSubtree();
      } else if (child.isSelectable) {
        child.selected = true;
      }
    }
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
    this.#selectableCount = this.isGroup
      ? children.reduce((sum, child) => sum + child.selectableCount, 0)
      : this.isSelectable
        ? 1
        : 0;
    // Summing the children's own answers rather than walking the leaves again:
    // a child built from `visible: false` already knows it is hidden, because
    // its flag is read before its parent's `#adopt` runs.
    this.#visibleSelectableCount = this.isGroup
      ? children.reduce((sum, child) => sum + child.visibleSelectableCount, 0)
      : this.isSelectable && this.#visible
        ? 1
        : 0;
    // Both counters are summed from the children rather than walked. The Leaf's
    // own `selected` flag is applied by the constructor only after this runs, and
    // it reports up the chain as it goes, so a preset pick is counted without
    // this needing to know about it.
    this.#visibleSelectedCount = this.isGroup
      ? children.reduce((sum, child) => sum + child.visibleSelectedCount, 0)
      : 0;
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
   * `cm-item--hidden` class of the Item's `itemView`, and reports the change
   * up the chain of parents so `visibleSelectableCount` stays true.
   *
   * Only a write that actually changes the flag reports anything: setting an
   * Item to the visibility it already has moves no count, which is what keeps
   * a filter pass - which assigns to every Item in the tree - from inflating
   * the counters it is meant to be updating.
   * @param {boolean} value
   */
  set visible(value) {
    const after = Boolean(value);
    if (after === this.#visible) {
      if (this.itemView) {
        this.itemView.classList.toggle('cm-item--hidden', !after);
      }
      return;
    }
    this.#visible = after;
    if (this.itemView) {
      this.itemView.classList.toggle('cm-item--hidden', !after);
    }
    // A Group is a container: its own visibility says nothing about what it
    // holds, and its descendants keep the flags they were given. A Leaf that
    // cannot be selected is out of a toggle's reach, so it is out of these
    // counts too - it moves nothing above it.
    if (this.isGroup || !this.isSelectable) return;
    const delta = after ? 1 : -1;
    // A Leaf that was already picked joins the visible-and-picked count as it
    // comes back into reach, and leaves it as it goes out.
    const pickedDelta = this.#selected ? delta : 0;
    for (let group = this.parentItem; group; group = group.parentItem) {
      group.#visibleSelectableCount += delta;
      group.#visibleSelectedCount += pickedDelta;
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

  /**
   * Resolved layout configuration of the level this Item belongs to (its own
   * depth): how the Items around it are laid out and whether ArrowDown enters
   * their children. DOM and keyboard navigation read the same config, so the
   * marker always follows the structure the user actually sees.
   * @returns {{flow: 'row'|'column'}}
   */
  get levelConfig() {
    return levelConfig(this.options, this.depth);
  }

  /**
   * Resolved layout configuration of the level holding this Item's own children
   * (depth + 1), i.e. the level this Item's `element` renders. `options.align`
   * is keyed by the depth of the Items being laid out, so with
   * `align: { 1: 'row' }` a top-level Group renders its children in a row.
   * @returns {{flow: 'row'|'column'}}
   */
  get childrenConfig() {
    return levelConfig(this.options, this.depth + 1);
  }

  /** @returns {boolean} whether this Item's level is laid out horizontally. */
  get inRow() {
    return this.levelConfig.flow === 'row';
  }

  /**
   * Whether keyboard navigation can stand on this Item: it must be rendered and
   * togglable. A Group Item qualifies (its own selection is an indicator),
   * while a non-toggleable leaf does not.
   * @returns {boolean}
   */
  get navigable() {
    return this.visible && this.isSelectable;
  }

  /**
   * The direct children ArrowDown can descend into: the rendered, togglable
   * ones, in tree order.
   * @returns {Item[]}
   */
  get navigableChildren() {
    return [...this].filter((child) => child.navigable);
  }

  /**
   * The Items sharing this Item's container that navigation can stand on — its
   * siblings, or the top-level Items for a root one. Home/End and the page steps
   * walk this list, keeping the marker on the line it currently occupies.
   * @returns {Item[]}
   */
  get navigableSiblings() {
    return [...this.parent].filter((item) => item.navigable);
  }

  /**
   * The enclosing Item, or `null` at the top level. Every top-level Item's parent
   * is the `RootContainer`, which is not an Item and must never be marked
   * Current — the single place that fact is decided, so the root cannot be
   * entered by any movement.
   * @returns {Item|null}
   */
  get parentItem() {
    return this.parent instanceof Item ? this.parent : null;
  }

  /**
   * The next navigable Item of this Item's own level, or `null` when there is
   * none after it. Scans the unfiltered siblings outward rather than asking
   * where this Item sits among the navigable ones, so the walk still works when
   * it starts from an Item that has just left the list itself.
   * @private
   * @returns {Item|null}
   */
  #nextSibling() {
    const siblings = [...this.parent];
    const index = siblings.indexOf(this);
    for (let i = index + 1; i >= 0 && i < siblings.length; i += 1) {
      if (siblings[i].navigable) return siblings[i];
    }
    return null;
  }

  /**
   * The previous navigable Item of this Item's own level, or `null` when there is
   * none before it. The mirror of `#nextSibling`, scanning the unfiltered
   * siblings inward for the same reason it scans them outward.
   * @private
   * @returns {Item|null}
   */
  #previousSibling() {
    const siblings = [...this.parent];
    const index = siblings.indexOf(this);
    for (let i = index - 1; i >= 0; i -= 1) {
      if (siblings[i].navigable) return siblings[i];
    }
    return null;
  }

  /**
   * The Item after this one in document order: the first navigable child of a
   * Group Item, otherwise its next sibling, bubbling out of a finished subtree
   * to the closest ancestor that still has one. Past the last Item in the tree
   * there is no next, and `null` is returned.
   *
   * Pure structure — every hop is decided by what is rendered and togglable, so
   * filtered-out and non-selectable Items are stepped over while Group Items
   * stay part of the walk. How the level is laid out is not consulted, which is
   * what lets an Item leave a level here and be found by the walk, whichever key
   * drives it.
   * @returns {Item|null}
   */
  next() {
    return this.descend() ?? this.nextInLevel();
  }

  /**
   * The next Item of the walk with this Item's own subtree stepped over: its
   * next sibling, or the closest ancestor that still has one. This is what the
   * forward key does on a row level - the row is walked along its own axis, so
   * a Group standing in it is a member of the row and not an entrance - and
   * reaching the end of the row carries the walk out of it with no rule of its
   * own. `null` past the last Item of the tree.
   * @returns {Item|null}
   */
  nextInLevel() {
    for (let item = this; item; item = item.parentItem) {
      const sibling = item.#nextSibling();
      if (sibling) return sibling;
    }
    return null;
  }

  /**
   * The first navigable child of this Group Item, or `null` when it has none.
   * On a row level the children sit off the row's own axis, so opening a Group
   * there is the job of the key across that axis rather than of the forward one.
   * @returns {Item|null}
   */
  descend() {
    const children = this.navigableChildren;
    return this.isGroup && children.length > 0 ? children[0] : null;
  }

  /**
   * The Item before this one in document order: its previous sibling, or the
   * parent when it is the first of its level. It never descends into a Group the
   * way `next()` does, so the two are deliberately not mirrors - a level is
   * stepped into from its parent and climbed out of to it. At the top level
   * there is no parent to fall back to, and `null` is returned.
   * @returns {Item|null}
   */
  previous() {
    return this.#previousSibling() ?? this.parentItem;
  }

  /**
   * The last navigable Item at the bottom of this Group's subtree, or `null` when
   * there is none to stand on. The mirror of `descend`, which takes the first.
   * @returns {Item|null}
   */
  lastNavigableDescendant() {
    const children = this.navigableChildren;
    if (!this.isGroup || children.length === 0) return null;
    const last = children[children.length - 1];
    return last.lastNavigableDescendant() ?? last;
  }

  /**
   * The Item standing before this one along the axis of the level it is on: its
   * previous sibling, stepped into at that sibling's last navigable child when
   * the children sit on the axis, or the previous sibling itself when they sit
   * off it. The parent when there is no previous sibling.
   *
   * This answers "which Item is before me here", which is not the question
   * `previous` answers. On a column the children of the previous Group are
   * members of the same line, so the Item before the last Group of a level is
   * that Group's last child and not the Group. On a row the children sit off the
   * axis, so the two are the same Item.
   * @returns {Item|null}
   */
  previousInAxis() {
    const sibling = this.#previousSibling();
    if (!sibling) return this.parentItem;
    if (this.inRow) return sibling;
    return sibling.lastNavigableDescendant() ?? sibling;
  }

  /**
   * The Item after the level this Item stands on, stepping over whatever is left
   * of its own subtree: the next sibling of its closest enclosing Item. This is
   * the one movement a Group's subtree can hide, and the only way to leave a
   * level that is not an edge of it. `null` at the top level, and past the last
   * Item in the tree.
   * @returns {Item|null}
   */
  parentNext() {
    return this.parentItem ? this.parentItem.nextInLevel() : null;
  }

  /**
   * How many selectable descendants this Item holds. Counted once while the tree
   * is built and read from there on: it answers from the shape of the tree, which
   * `setItems` sets once and nothing changes afterwards.
   * @returns {number}
   */
  get selectableCount() {
    return this.#selectableCount;
  }

  /** @private backing field for selectableCount */
  #selectableCount = 0;

  /**
   * How many selectable descendant Leaves are currently visible - the
   * population a toggle under `groupItems.toggleScope: 'visible'` reaches.
   * Kept up to date by `visible`, which walks up from the Leaf whose flag
   * changed, mirroring how `selected` maintains `selectedCount`.
   *
   * Visibility is per-Item and not inherited: a hidden Group keeps counting the
   * descendants that are themselves visible, because that is the flag a toggle
   * reads when it reaches each child.
   *
   * The count deliberately ignores selection. `visibleSelectedCount` is the
   * other half of the pair, and together they let `#everythingSelected` answer
   * from two reads instead of a walk.
   * @returns {number}
   */
  get visibleSelectableCount() {
    if (!this.isGroup) return this.isSelectable && this.#visible ? 1 : 0;
    return this.#visibleSelectableCount;
  }

  /** @private backing field for visibleSelectableCount */
  #visibleSelectableCount = 0;

  /**
   * How many selectable descendant Leaves are both visible and selected - the
   * part of the population a toggle reaches that is already picked.
   *
   * Paired with `visibleSelectableCount` it answers the tri-state question in
   * two reads, which is why it cannot be read off `selectedCount`: a picked
   * child that the filter has hidden is still in `selectedCount` and is not in
   * what the user can currently see or reach.
   *
   * Maintained by both `visible` and `selected`, since either flag moving a
   * Leaf in or out of the visible population moves it in or out of this one.
   * @returns {number}
   */
  get visibleSelectedCount() {
    if (!this.isGroup) return this.isSelectable && this.#visible && this.#selected ? 1 : 0;
    return this.#visibleSelectedCount;
  }

  /** @private backing field for visibleSelectedCount */
  #visibleSelectedCount = 0;

  /**
   * Walks this subtree and returns what its visibility counters ought to say,
   * so a test can hold the maintained counts against the definition they
   * implement. Not on the hot path: the counters exist so that production code
   * never has to do this.
   * @returns {{visibleSelectable: number, visibleSelected: number}}
   */
  recountVisibility() {
    let visibleSelectable = 0;
    let visibleSelected = 0;
    const walk = (item) => {
      for (const child of item) walk(child);
      if (item.isGroup) return;
      if (!item.isSelectable || !item.visible) return;
      visibleSelectable += 1;
      if (item.selected) visibleSelected += 1;
    };
    walk(this);
    return { visibleSelectable, visibleSelected };
  }

  /**
   * How many selectable descendants of this Item are selected. Kept up to date by
   * `selected`, which walks up from the Leaf whose flag changed, so that reading
   * it - from the group tick, from `inSelection`, from a selection count - costs
   * nothing and a long tree is not walked per read. A Leaf answers for itself.
   * @returns {number}
   */
  get selectedCount() {
    if (!this.isGroup) return this.#selected && this.isSelectable ? 1 : 0;
    return this.#selectedCount;
  }

  /** @private backing field for selectedCount, the count of a Group */
  #selectedCount = 0;

  /**
   * Selection state used for the group tick: none | partial | all.
   *
   * It deliberately ignores visibility, and this is the one place where the
   * tick and the tri-state of `#everythingSelected` answer different questions.
   * The tick reports the Group as a whole: "all" means every selectable
   * descendant is selected, which stays false while any of them is unselected,
   * whether or not it is currently on screen. The tri-state answers what a
   * click would do, and acts only on what the user can reach. So a Group whose
   * visible children are all picked can read *partial* here while a click on it
   * clears rather than selects again. Both are right about their own question.
   *
   * @returns {'none' | 'partial' | 'all'}
   */
  get selectionState() {
    const total = this.selectableCount;
    if (total === 0) return 'none';
    const picked = this.selectedCount;
    if (picked === 0) return 'none';
    if (picked === total) return 'all';
    return 'partial';
  }

  /**
   * Whether this Item belongs to the current selection, and so to a
   * selected-Items-only list. A Group qualifies through what it holds: it is on
   * the list as the path to its selected descendants, and it is off it once the
   * last of them goes. There is no flag of its own to fall back on, so an emptied
   * Group cannot linger.
   */
  get inSelection() {
    if (!this.isGroup) return this.selected;
    return this.#selectedCount > 0;
  }

  /**
   * This Item's children and their descendants, in tree order, computed on the
   * spot. Only a subtree of this Item is meaningful here, and the maintained
   * array on the root holds the whole tree rather than arbitrary slices of it,
   * so this stays a walk - it is the root's `flatten()` that the hot paths use.
   * @returns {Item[]}
   */
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

  /** All selectable descendant leaves, which are the ones that can own a Chip. */
  get selectableItems() {
    return this.flatten().filter((i) => !i.isGroup && i.isSelectable);
  }

  /**
   * Whether every selectable descendant a Group's cascade would reach is
   * selected - which is what makes an unprompted `toggle()` on a Group the
   * tri-state act its tick invites: fully selected clears, anything short of
   * that selects the rest.
   *
   * It is asked over the population the cascade actually acts on rather than
   * over the whole subtree, because `groupItems.toggleScope` decides that
   * population: under `'visible'` a hidden child is out of reach, so it neither
   * needs selecting nor counts towards the whole. The tick is the one answer that
   * speaks for the whole subtree, which is why the two can disagree and why this
   * is not read off the tick.
   *
   * This is the toggle question, not the filtering one: what a click reaches
   * over the population the current filter left visible. Which children the
   * filter leaves visible is `groupItems.filterScope`'s separate answer.
   * @returns {boolean}
   */
  #everythingSelected() {
    const scope = (this.options.groupItems || {}).toggleScope || 'visible';
    if (scope === 'all') {
      return this.selectableCount > 0 && this.selectedCount === this.selectableCount;
    }
    const total = this.visibleSelectableCount;
    return total > 0 && this.visibleSelectedCount === total;
  }

  /**
   * Changes the selection state. Non-selectable Items (leaf without value)
   * cannot be toggled into "Selected".
   *
   * A Group Item is a container, so it has no selection of its own to change:
   * `toggle()` hands the state it decided to its children and answers with what
   * they left behind, which `selectedCount` holds. The state it decides is
   * asked of `#everythingSelected`, so a partly selected Group takes the click
   * as a request for the rest of it rather than as a request to clear.
   *
   * Calling protocol:
   * - `toggle()` flips this Item's own state; a Group Item then hands the
   *   resulting state to each child via `child.toggle(after)`.
   * - `toggle(state)` is the child side of that cascade: this Item decides on
   *   its own whether it follows, per `groupItems.toggleScope`:
   *   - `'all'`: follows regardless of visibility.
   *   - `'visible'` (default): follows only while visible, so a filtered-down
   *     drop down selects the Items that fit the query rather than the whole
   *     subtree. Unrelated to `groupItems.filterScope`, which decides what the
   *     query leaves visible in the first place.
   * An Item that decides to follow cascades the state further down, letting
   * each of its own children decide in turn.
   * @param {boolean} [state] target state handed down by this Item's parent
   * @returns {boolean} the resulting selected state
   */
  toggle(state) {
    if (!this.isSelectable) return this.selected;

    const prompted = state !== undefined;
    let after;
    if (prompted) {
      after = Boolean(state);
      const scope = (this.options.groupItems || {}).toggleScope || 'visible';
      if (!(scope === 'all' || (scope === 'visible' && this.visible))) {
        return this.selected;
      }
    } else {
      after = this.isGroup ? !this.#everythingSelected() : !this.selected;
    }

    if (this.isGroup) {
      for (const child of this) {
        child.toggle(after);
      }
      return this.selected;
    }

    this.selected = after;
    if (this.owner) {
      this.owner.onItemToggled(this);
    }
    return this.selected;
  }

  /**
   * Builds this Item's Item view (`itemView`) without considering the running
   * state (selection, visibility, focus); those are applied by `syncView()`. The
   * Chip view (`chipView`) is deliberately not built here — it is created on
   * demand by `buildChipView()`, so an Item that never shows an individual Chip
   * allocates none. For Group Items the Item view holds only the children
   * container; the rendering of the children is delegated to the child Items
   * (each renders its own `itemView`).
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

    li.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.owner) this.owner.onItemViewClick(this, e);
    });

    if (this.tooltip !== undefined && this.tooltip !== null) {
      li.title = this.tooltip;
    }

    this.itemView = li;
  }

  /**
   * Public: lazily builds this Item's Chip view — the individual "chip" shown in
   * the SelectionBox while the Item is selected and the selection is not
   * collapsed. Cheap in the common case of few selected Items among many, since
   * unselected and collapsed-away Items build no chip at all. Idempotent: the
   * cached Chip view is returned on repeated calls.
   * @returns {HTMLElement}
   */
  buildChipView() {
    if (this.chipView) return this.chipView;

    const chip = document.createElement('span');
    chip.className = 'cm-chip';
    if (this.tooltip !== undefined && this.tooltip !== null) {
      chip.title = this.tooltip;
    }
    chip._item = this;

    const chipLabel = document.createElement('span');
    chipLabel.textContent = this.label;

    const x = document.createElement('button');
    x.className = 'cm-chip__x';
    x.title = 'Remove';
    x.textContent = '\u00d7';
    x.tabIndex = -1;
    x._item = this;

    x.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.owner) this.owner.onChipViewClick(this, e);
    });
    chip.addEventListener('click', (e) => {
      if (this.owner) this.owner.onChipViewClick(this, e);
    });

    chip.append(chipLabel, x);
    this.chipView = chip;
    return chip;
  }

  /** Public: returns this Item's Chip view, creating it when absent. */
  ensureChipView() {
    return this.chipView || this.buildChipView();
  }

  /**
   * Public: applies the current selection/visibility/focus state to the already
   * created DOM parts (`itemView`, `chipView`). Called after `#createDOM()`.
   */
  syncView() {
    this.element.classList.toggle('cm-item__children--row', this.childrenConfig.flow === 'row');
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
    this.el.readOnly = true;
    this.el.tabIndex = 0;
    this.el.addEventListener('input', () => this.onInput());
    this.el.addEventListener('focus', () => this.control.onFilterFocus());
    this.el.addEventListener('keydown', (e) => this.control.onKeyDown(e));
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
    this.refilter();
  }

  /**
   * Re-applies the current restriction: the selected-Items-only one while
   * `displaySelected` is on, the text query otherwise. Assigning
   * `displaySelected` uses this, and a selection change calls it too, so an
   * Item that just lost its selection leaves the visible list instead of
   * lingering there until the next filter run.
   */
  refilter() {
    if (this.#displaySelected) {
      this.control.dropDown.filter('', (item) => item.inSelection);
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
    this.#applyQuery(this.el.value);
  }

  /**
   * Single owner of the text-query path, shared by assigning `query` and by the
   * debounced input handler: re-filters the DropDown by the query and re-homes the
   * Current marker to the list it just produced, so the two cannot drift apart.
   * @param {string} textValue
   */
  #applyQuery(textValue) {
    this.control.dropDown.filter(textValue);
    this.control.dropDown.rehomeCurrent();
  }

  /** Debounced event handler of the input element. */
  onInput() {
    clearTimeout(this.#debounceTimer);
    this.#displaySelected = false;
    this.#debounceTimer = setTimeout(() => {
      this.#applyQuery(this.query);
    }, this.debounceDelay);
  }

  /**
   * Single owner of the input's typing DOM state: toggles the caret's
   * editability (read-only) and, when requested, moves the system focus. Mode
   * transitions and the outside-click handler go through here so caret/blur
   * handling never drifts apart. Only the fields given are touched; omitted
   * fields leave that aspect of the DOM state as-is.
   * @param {{editable?: boolean, focused?: boolean}} state
   */
  setCaretState({ editable, focused } = {}) {
    if (editable !== undefined) {
      this.el.readOnly = !editable;
    }
    if (focused === true && this.el !== document.activeElement) {
      this.el.focus();
    } else if (focused === false) {
      this.el.blur();
    }
  }
}

/** Always-visible part of the control: chips + filter + clear-all. */
/** The summary chip shown when the selection count exceeds `maxVisibleChips`. */
/**
 * The single Chip standing for a collapsed selection: a count of what it stands
 * for, and the same "(x)" removal area any other Chip has, which removes the whole
 * selection rather than one Item.
 *
 * It owns no Item, and so cannot carry the logical Current marker, which only ever
 * stands on an Item. Its `current` is its own: a marking that makes it look like the
 * Current Chip while the interaction is on it, which is why opening the DropDown
 * from here seeds the marker on an Item instead.
 */
class CollapsedChip {
  constructor() {
    this.chipView = document.createElement('span');
    this.chipView.className = 'cm-chip cm-chip--summary';
    this.chipView.title = 'Unselects every selected item';

    // The count sits in a span of its own so that it and the "x" do not share one
    // text node - the same shape an individual Chip's markup has.
    this.labelEl = document.createElement('span');
    this.labelEl.textContent = '0 items selected';

    this.xEl = document.createElement('button');
    this.xEl.className = 'cm-chip__x';
    this.xEl.title = 'Remove';
    this.xEl.textContent = '\u00d7';
    this.xEl.tabIndex = -1;

    this.chipView.append(this.labelEl, this.xEl);
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
    this.labelEl.textContent = `${count} items selected`;
  }
}

class SelectionBox {
  /**
   * @param {MSelect} control
   */
  constructor(control) {
    this.control = control;
    this.items = [];
    this.el = document.createElement('div');
    this.el.className = 'cm-selection';
    this.chipsEl = document.createElement('div');
    this.chipsEl.className = 'cm-chips';
    this.clearBtn = document.createElement('button');
    this.clearBtn.className = 'cm-clear';
    this.clearBtn.title = 'Clear all selection';
    this.clearBtn.textContent = '\u2715';
    this.clearBtn.tabIndex = -1;

    this.filter = new Filter(this.control);

    this.collapsedChip =
      this.control.options.maxVisibleChips != null ? new CollapsedChip() : null;

    this.el.append(this.chipsEl, this.filter.el, this.clearBtn);
  }

  /** @private backing field: whether the selection is shown as a CollapsedChip. */
  #collapsed = false;

  /**
   * Whether the selection is currently shown as a CollapsedChip. Maintained by
   * add()/remove()/render(). The count alone decides, except while the
   * interaction is anchored on the Collapsed chip — Collapsed mode, or the
   * DropDown entered from it — where an achieved collapse is held until the
   * last Item is unselected; see MSelect#holdsCollapse.
   */
  get isCollapsed() {
    return this.#collapsed;
  }

  /**
   * Whether the selection is small enough for the individual Chips to be shown,
   * which is the boundary `#updateCollapsedState` draws: a selection larger than
   * `maxVisibleChips` is collapsed, one of that size or smaller is not.
   *
   * This is deliberately not `isCollapsed`. That one holds an achieved collapse
   * for as long as the interaction is anchored on it, so it stays true through a
   * count that has fallen back within the limit - which is the point of the hold,
   * but makes it useless for asking whether the collapse still applies.
   * @returns {boolean}
   */
  get withinChipLimit() {
    const max = this.control.options.maxVisibleChips;
    return max == null || this.control.selectedItems.length <= max;
  }

  /** Recomputes the displayed collapse state from the selection count. */
  #updateCollapsedState() {
    this.#ensureCollapsedChip();
    if (this.control.options.maxVisibleChips == null) {
      this.#collapsed = false;
      return;
    }
    this.#collapsed =
      !this.withinChipLimit ||
      (this.#collapsed &&
        this.control.selectedItems.length > 0 &&
        this.control.holdsCollapse);
  }

  /**
   * Creates the CollapsedChip on first need. The component instantiates it
   * eagerly when maxVisibleChips is known up front; when a delayed setItems
   * enforces the cap later (preset-selection safeguard) it is created here.
   * @private
   */
  #ensureCollapsedChip() {
    if (this.collapsedChip == null && this.control.options.maxVisibleChips != null) {
      this.collapsedChip = new CollapsedChip();
    }
  }

  /**
   * Adds the given Item's chipView to the selection box.
   * @param {Item} item
   */
  add(item) {
    if (this.items.includes(item)) return;
    this.items.push(item);
    if (this.control.batching) return;
    this.#updateCollapsedState();

    if (this.isCollapsed) {
      this.chipsEl.innerHTML = '';
      this.collapsedChip.update(this.control.selectedItems.length);
      this.chipsEl.append(this.collapsedChip.chipView);
      return;
    }

    item.ensureChipView();
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
    * The chip Views of the Items in the box, in box order, and nothing more.
    *
    * Derived from `items` rather than tracked alongside it: the list of what is
    * in the box is the one thing that cannot disagree with itself, and a mirrored
    * array only has to be updated in every path that adds, removes or re-renders.
    * It used to be, and drifted — a chip added while the box was collapsed took
    * the early return above without ever joining the array, and `render` never
    * consulted it at all, so a collapse followed by an expansion left the array
    * describing a box that no longer existed. A Group Item owns no chip and is
    * left out here for the same reason it owns no Chip.
    * @returns {HTMLElement[]}
    */
  get chips() {
    return this.items.map((item) => item.chipView).filter(Boolean);
  }

  /**
    * Removes the given Item's chipView from the selection box.
    * @param {Item} item
    */
  remove(item) {
    const itemIndex = this.items.indexOf(item);
    if (itemIndex >= 0) this.items.splice(itemIndex, 1);
    // While batching, the chip's place in the box and the collapsed state are the
    // settling render's to redo from `items`; only the membership is kept here.
    if (this.control.batching) return;

    // Read before `#updateCollapsedState`, which may change what it says.
    const wasCollapsed = this.isCollapsed;
    this.#updateCollapsedState();

    if (this.isCollapsed) {
      this.chipsEl.innerHTML = '';
      this.collapsedChip.update(this.control.selectedItems.length);
      this.chipsEl.append(this.collapsedChip.chipView);
    } else if (wasCollapsed) {
      this.chipsEl.innerHTML = '';
      this.control
        .orderedChips()
        .forEach((item) => this.chipsEl.append(item.ensureChipView()));
    } else if (Array.from(this.chipsEl.children).includes(item.chipView)) {
      this.chipsEl.removeChild(item.chipView);
    }

    // Only a chip that was actually in the box vacates a slot to hand over.
    // A Group carrying no value is never added, so removing one (it is
    // unselected as a whole along with its children) leaves itemIndex at -1,
    // which would ask for a successor at position -1 and drop the marker even
    // though other chips are still there.
    if (itemIndex >= 0 && this.control.dropDown.currentItem === item) {
      this.#promoteSuccessor(itemIndex);
    }
  }

  /**
   * After removing the Current chip, hands "Current" to the chip that occupies
   * the vacated slot (the one that slides in from its right; the previous chip
   * when the removed one was last). Same rule in LTR and RTL flow. With no chip
   * left there is nobody to hand over to, so the marker stays on the Item that
   * was just unselected rather than being dropped.
   * @private
   * @param {number} removedIndex position the removed chip held among `items`
   */
  #promoteSuccessor(removedIndex) {
    const remaining = this.items;
    if (remaining.length > removedIndex) {
      this.control.dropDown.setCurrent(remaining[removedIndex]);
    } else if (remaining.length > 0) {
      this.control.dropDown.setCurrent(remaining[remaining.length - 1]);
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

  /**
   * Drops every stored selection state, used when the whole Item tree is
   * replaced via setItems. Individual Chips are re-created lazily.
   */
  clear() {
    this.items = [];
    this.collapsedChip = null;
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

  /**
   * Moves the "Current" marker onto a Chip, for when it has been handed an Item
   * that owns none - a toggled Group Item, say - while the mode it lands in
   * navigates Chips and would have nothing to move between. No Chip was vacated
   * in that case, so there is no slot to point at the way `#promoteSuccessor`
   * does; the answer is the next Chip along the tree, and the last one when the
   * marker stands past all of them.
   * @param {Item} item the Item the marker currently stands on
   * @returns {boolean} whether a Chip was there to move it to
   */
  electChipAfter(item) {
    const list = this.chipItems;
    if (list.length === 0) return false;
    // `definitionIndex` is the place in the flat order, so it orders two Items
    // the same way `indexOf` on that array does - without the repeated scan.
    const from = item.definitionIndex;
    const next = list.find((chip) => chip.definitionIndex > from);
    this.control.dropDown.setCurrent(next ?? list[list.length - 1]);
    return true;
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
      this.control.orderedChips().forEach((item) => this.chipsEl.append(item.ensureChipView()));
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
    this.selectAllBtn.tabIndex = -1;
    this.selectAllBtn.addEventListener('click', () => this.control.toggleAll());

    this.toolbarEl.append(this.selectAllBtn);
    this.selectAllBtn.style.display = 'none';

    this.itemsEl = document.createElement('div');
    this.itemsEl.className = 'cm-items';
    this.itemsEl.classList.toggle('cm-items--row', levelConfig(options, 0).flow === 'row');
    this.el.append(this.toolbarEl, this.itemsEl);

    this.items = Item.root(itemsSpecs || [], options, this.itemsEl);
  }

  /** @private backing field: whether the "Select All" button is displayed. */
  #showSelectAllBtn = false;

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

  /**
   * Re-homes the Current marker after a text query has re-filtered the list: an
   * Item the query just hid cannot stay marked, so the marker moves to the first
   * navigable Item, and a query that left nothing to mark drops it. A marker
   * standing on an Item the query kept visible is left alone, so typing on after
   * navigating does not drag the marker back to the top on every keystroke.
   *
   * This answers for the text query alone. The selected-Items restriction is a
   * re-filter as well, but it has a rule of its own for the marker — the one
   * REQ-3.11-27 gives — so Filter#refilter deliberately does not come through
   * here, and a selection change cannot quietly move the marker this way.
   */
  rehomeCurrent() {
    const current = this.#currentItem;
    if (current && current.visible) return;
    this.setCurrent(this.control.navigableTopLevel[0] || null);
  }

  /**
   * Whether the DropDown is currently visible. Reads return the open state;
   * assigning a boolean shows (open) or hides (close) it. Opening also brings
   * the Current Item into view, fires `cm-dropdown-open`/`cm-dropdown-close`
   * and triggers the one-shot Items request while the component is empty.
   * @param {boolean} [value]
   * @returns {boolean}
   * @fires CmDropdownOpenEvent
   * @fires CmDropdownCloseEvent
   */
  get open() {
    return this.el.classList.contains('cm-dropdown--open');
  }

  set open(openIt) {
    if (Boolean(openIt) === this.open) return;
    if (openIt) {
      this.el.classList.add('cm-dropdown--open');
      if (this.#currentItem) this.#ensureVisible(this.#currentItem);
      this.control.emit('cm-dropdown-open', {});
      this.control.requestItems();
    } else {
      this.el.classList.remove('cm-dropdown--open');
      this.control.emit('cm-dropdown-close', {});
    }
  }

  /**
   * Brings the given Item's `itemView` into the DropDown's visible viewport,
   * but only while the DropDown is open (scrolling a hidden panel is pointless).
   * @param {Item} item
   */
  #ensureVisible(item) {
    if (!this.open) return;
    item.itemView.scrollIntoView({ block: 'nearest' });
  }

/**
   * Filters the Item tree by Item label. The default matching function keeps an
   * Item visible when its label contains `textValue` (case-insensitive). An
   * empty value shows every Item.
   *
   * Visibility of a Group Item's children follows `groupItems.filterScope`:
   * - `'all'` (default): a matching Group Item shows all of its children.
   * - `'matching'`: a matching Group Item keeps only the children that also match.
   * A non-matching Group Item stays visible when at least one of its children
   * is visible.
   *
   * This is its own option, separate from `groupItems.toggleScope`, because the
   * two answer different questions at different moments: this one says what a
   * match reveals, that one says what a toggle reaches. The vocabularies differ
   * to match - a child can be visible because its Group matched without matching
   * the query itself, so "visible" is not a filtering answer the way "matching"
   * is not a toggling one.
   * @param {string} textValue
   * @param {(item: Item, textValue: string) => boolean} [matchFn]
   */
  filter(textValue, matchFn) {
    const query = String(textValue || '');
    this.showSelectAllButton = query !== '';
    const q = query.toLowerCase();
    const customMatcher = typeof matchFn === 'function';
    const matcher = matchFn || ((item) => item.label.toLowerCase().includes(q));
    const scope = this.control.options.groupItems?.filterScope || 'all';

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

  render() {
    this.control.allItems.forEach((item) => item.syncView());
  }
}

/*
 * The MODES constant and the per-mode definitions live in `src/modes.js` and
 * are imported above; MSelect#constructor registers them with the modes
 * machine.
 */

/**
 * Walks up to the nearest element matching `className`, with a bare fallback
 * for stub DOM elements that lack Element.prototype.closest.
 * @param {unknown} el
 * @param {string} className
 * @returns {HTMLElement|null}
 */
function closestByClass(el, className) {
  if (!el) return null;
  const name = String(className).replace(/^\./, '');
  if (typeof el.closest === 'function') {
    return el.closest(`.${name}`);
  }
  return el.classList && el.classList.contains(name) ? el : null;
}

/**
 * Internal input-mode state machine. Holds the active input mode and the
 * registered mode definitions. Switching the active mode through `current`
 * runs the outgoing mode's `onLeave` and the incoming mode's `onEntry`
 * transition hooks, then notifies the injected transition callback (from which
 * the component fires `cm-mode-change`); `changeToPrevious()` routes through
 * the same setter. `processKey()` routes an input event to the active mode's
 * `handlers` set. `leaveDropDown()` asks the mode a DropDown was entered from
 * for its own rule about being left. Not part of the public API — reachable
 * only through the `MSELECT_INTERNALS` symbol exported for tests.
 */
class Modes {
  /** @private name of the mode that was active before the current one, if any */
  #previous = null;
  /** @private name of the active mode */
  #current;
  /** @private registered mode definitions, keyed by mode name */
  #definitions = new Map();
  /** @private `(from, to)` notified after each real transition */
  #onTransition = null;

  /**
   * @param {string} initial the initially active mode name (typically MODES.FILTER)
   * @param {(from: string, to: string) => void} [onTransition] invoked after
   *   every real transition with the previous and the new mode name; same-mode
   *   assignments and unknown-mode errors never notify
   */
  constructor(initial, onTransition) {
    this.#current = initial;
    this.#onTransition = onTransition || null;
  }

  /** The currently active input mode. */
  get mode() {
    return this.#current;
  }

  /** Alias of {@link Modes#mode}, matching the `current` setter's read side. */
  get current() {
    return this.#current;
  }

  /** The mode that was active before the current one, or null. */
  get previous() {
    return this.#previous;
  }

  /**
   * Whether an achieved collapse is held for the interaction as a whole: the
   * Collapsed mode's own marker, or the DropDown mode entered from it. Derived
   * from the transition already recorded here, so it cannot fall out of step
   * with the modes the way a separately maintained flag can.
   */
  get holdsCollapse() {
    return (
      this.#current === MODES.COLLAPSED ||
      (this.#current === MODES.DROPDOWN && this.#previous === MODES.COLLAPSED)
    );
  }

  /**
   * Registers a mode definition. Mode names are unique; re-registering a mode
   * replaces its definition.
   * @param {string} name one of MODES.*
   * @param {{onEntry?: Function, onLeave?: Function, onDropDownLeave?: Function,
   *          handlers?: Record<string, Function>}} cfg
   */
  define(name, cfg = {}) {
    this.#definitions.set(name, { name, ...cfg });
  }

  /**
   * Switches the active input mode, running the outgoing mode's `onLeave` and
   * the incoming mode's `onEntry` transitions, then notifying the transition
   * callback (the component fires `cm-mode-change` from it). Switching to the
   * already active mode is a no-op; switching to an unknown mode throws.
   * @param {string} name
   * @returns {Modes}
   */
  set current(name) {
    const next = this.#definitions.get(name);
    if (!next || next.name !== name) {
      throw new Error(`Trying to switch to unexisting input mode: ${name}`);
    }
    if (this.#current === name) return this;
    const from = this.#current;
    this.#definitions.get(from)?.onLeave?.();
    this.#previous = from;
    this.#current = name;
    next.onEntry?.();
    this.#onTransition?.(from, name);
    return this;
  }

  /**
   * Switches back to the mode that was active before the current one.
   * @returns {Modes}
   */
  changeToPrevious() {
    if (this.#previous) this.current = this.#previous;
    return this;
  }

  /**
   * Hands the keyboard back from a DropDown the active mode opened, by asking
   * the mode that DropDown was entered from how it wants to be left.
   *
   * The origin is the whole of what a DropDown carries over, and only some
   * origins read the closing key differently, so that difference is registered
   * as the origin's own rule and lives with the rest of its behaviour. An origin
   * with no rule is left to the caller, which falls back to `changeToPrevious` —
   * the answer for an origin that simply returns as it was.
   *
   * @param {'Escape'|'Enter'} key the key that closed the DropDown
   * @returns {boolean} whether the origin had a rule of its own
   */
  leaveDropDown(key) {
    const origin = this.#previous && this.#definitions.get(this.#previous);
    if (!origin?.onDropDownLeave) return false;
    origin.onDropDownLeave(key);
    return true;
  }

  /**
   * Routes an input event to the active mode's handler for the event's key.
   * @param {Event} event
   * @returns {unknown} the handler's result, or false when unhandled
   */
  processKey(event) {
    const fn = (this.#definitions.get(this.#current)?.handlers || {})[event?.key];
    return fn ? fn(event) : false;
  }
}

/**
 * Custom events dispatched by the component on its root element (`MSelect#el`).
 * All are `CustomEvent`s with `bubbles: true`; `detail` carries the payload.
 * Event types are prefixed `cm-`.
 *
 * @typedef {CustomEvent} CmItemsRequestEvent
 *   Detail: `{}`. One-shot signal that the component needs its Item tree while
 *   it has none (`delayedLoad: true` and `setItems()` not called yet). Fired on
 *   the first Filter focus, the first DropDown open, and the first
 *   toggleAll()/clearAll() while empty; never more than once. The application
 *   supplies the Items by calling `setItems(specs)` from the listener
 *   (recommended wiring, see `MSelect#emit`).
 *
 * @typedef {CustomEvent<{count: number}>} CmItemsSetEvent
 *   Detail: `{ count }` — how many Items (including children) were
 *   instantiated. Fired by `setItems()` only when `delayedLoad` is enabled,
 *   right after the tree and the preset selection were built.
 *
 * @typedef {CustomEvent} CmDropdownOpenEvent
 *   Detail: `{}`. Fired whenever the DropDown becomes visible (`open = true`).
 *
 * @typedef {CustomEvent} CmDropdownCloseEvent
 *   Detail: `{}`. Fired whenever the DropDown becomes hidden (`open = false`).
 *
 * @typedef {CustomEvent<{from: string, to: string}>} CmModeChangeEvent
 *   Detail: `{ from, to }` — names of the previous and the current input mode
 *   (`MODES.FILTER`, `MODES.DROPDOWN`, `MODES.CHIP`, `MODES.COLLAPSED`). Fired
 *   only for real transitions; assigning the already active mode (e.g.
 *   re-entering Filter while Filter is active) is a no-op and stays silent.
 */

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
    this.options = { maxVisibleChips: null, ...(config.options || {}) };
    this.logger = new Logger(this.options.logLevel || 'silent');
    // Spec warnings are raised while Items are built below, before any of them
    // has a control to report to. An explicit logLevel governs them too, so
    // 'silent' means silent; left unset, they keep their visible default.
    if (this.options.logLevel !== undefined) specLog.setLevel(this.options.logLevel);

    this.#modes = new Modes(MODES.FILTER, (from, to) => {
      this.#markMode(to);
      this.emit('cm-mode-change', { from, to });
    });

    this.dropDown = new DropDown(this, [], this.options);
    this.selectionBox = new SelectionBox(this);

    this.el = document.createElement('div');
    this.el.className = 'cm-select';
    // The machine starts in Filter mode without a transition, so the class that
    // mirrors the active mode is set here rather than by the hook above.
    this.#markMode(this.#modes.mode);
    this.el.append(this.selectionBox.el, this.dropDown.el);
    root.append(this.el);

    this[MSELECT_INTERNALS] = { modes: this.#modes };

    this.#modes.define(MODES.FILTER, filterMode(this));
    this.#modes.define(MODES.DROPDOWN, dropdownMode(this));
    this.#modes.define(MODES.CHIP, chipMode(this));
    this.#modes.define(MODES.COLLAPSED, collapsedMode(this));

    this.selectionBox.el.addEventListener('click', (e) => this.#onSelectionBoxClick(e));
    this.el.addEventListener('mousedown', (e) => this.#onControlMouseDown(e));
    document.addEventListener('mousedown', (e) => this.#onDocumentMouseDown(e));
    document.addEventListener('keydown', (e) => this.#onDocumentKeyDown(e));

    if (!this.options.delayedLoad) this.setItems(config.items);

    this.logger.info('component rendered');
    this.render();
  }

  /** @private internal input-mode state machine, wired in the constructor, exposed only via MSELECT_INTERNALS */
  #modes;

  /** @private Whether the Item tree was already instantiated (setItems one-time). */
  #itemsLoaded = false;

  /** @private Whether the one-shot cm-items-request was already emitted. */
  #itemsRequested = false;

  /**
   * Keeps the Filter input as the control's only keyboard surface while the
   * user works the mouse: the browser's default for a mousedown on a
   * non-focusable element (a DropDown Item, a chip) is to move focus to the
   * clicked element or to the body — silently detaching the keyboard from the
   * control (REQ-3.11-03). Preventing the mousedown default keeps focus on the
   * input. The input itself is exempt so its caret behaves natively, and the
   * action still fires on the subsequent click.
   * @private
   * @param {Event} e
   */
  #onControlMouseDown(e) {
    if (e.target === this.selectionBox.filter.el) return;
    e.preventDefault();
  }

  /**
   * Routes a SelectionBox click to the input mode matching the clicked part.
   * @private
   * @param {Event} e
   */
  #onSelectionBoxClick(e) {
    const target = e.target;

    if (closestByClass(target, 'cm-clear')) {
      this.clearAll();
      this.#activateFilter();
      this.dropDown.open = true;
      return;
    }

    // Checked before the Chip body below, which the "x" is inside of: the two are one
    // Chip as far as a click on the body is concerned, and two different acts as
    // far as what was clicked. An individual Chip's "x" stops its own handler dead
    // and this Chip has no Item of its own to do it for.
    if (
      closestByClass(target, 'cm-chip__x') &&
      closestByClass(target, 'cm-chip--summary')
    ) {
      this.clearAll();
      return;
    }

    if (closestByClass(target, 'cm-chip--summary')) {
      this.#switchMode(MODES.COLLAPSED);
      // A toggle, so the Chip that stands for the selection is also how the
      // selection is closed again - the mouse's answer to Escape, which is what
      // the keyboard uses while the DropDown it opened is up.
      this.dropDown.open = !this.dropDown.open;
      return;
    }

    if (closestByClass(target, 'cm-chip') || closestByClass(target, 'cm-chip__x')) {
      return;
    }

    if (target === this.selectionBox.filter.el) {
      this.#activateFilter();
      this.dropDown.open = true;
      return;
    }

    this.#switchMode(MODES.DROPDOWN);
    this.dropDown.open = true;
  }

  /**
   * Enters the default Filter mode and reasserts the typing DOM state. Unlike a
   * transition via `Modes.current`, this also runs when Filter is already the
   * active mode (its transition hook is then skipped by the machine), so it
   * re-enables the caret and pulls focus onto the input.
   * @private
   */
  #activateFilter() {
    this.#switchMode(MODES.FILTER);
    this.selectionBox.filter.setCaretState({ editable: true, focused: true });
  }

  /**
   * The Filter is the component's keyboard surface: while it has focus, its
   * own keydown listener routes keys here; a document-level listener
   * (`#onDocumentKeyDown`) catches the same keys when a stray focus landed
   * outside the input (e.g. after clicking a DropDown Item in some browsers).
   * The active mode's handler set decides what happens: a handler returning a
   * truthy value consumed the key (its default behaviour, e.g. text-caret
   * navigation, is prevented); returning falsy lets the key fall through to
   * the input's default handling. A per-instance marker dedupes the two paths
   * for this component, so a single key press is never processed twice.
   * @param {Event} e
   */
  onKeyDown(e) {
    if (e.__mselectHandledBy === this) return;
    e.__mselectHandledBy = this;
    if (this.#modes.processKey(e)) {
      e.preventDefault?.();
    }
  }

  /**
   * Routes keys the component owns even when the system focus is no longer on
   * the Filter: while the DropDown is open the component is the keyboard
   * surface, and keys still land here (Escape closes, arrows navigate)
   * regardless of where focus sits. With the DropDown closed, only keys
   * originating inside the control are considered. Events already handled by
   * the Filter's own listener are deduped inside onKeyDown.
   * @private
   * @param {Event} e
   */
  #onDocumentKeyDown(e) {
    if (!this.el.contains(e.target) && !this.dropDown.open) return;
    this.onKeyDown(e);
  }

  /** Focus on the Filter means entering the default Filter mode.
   * @fires CmItemsRequestEvent on first focus while the component is empty
   */
  onFilterFocus() {
    this.#activateFilter();
    this.requestItems();
  }

  /**
   * Switches the input mode and emits the cm-mode-change event for real
   * transitions (same-mode switches are no-ops and stay silent).
   * @private
   * @param {string} mode
   * @returns {boolean} whether a transition actually happened
   * @fires CmModeChangeEvent
   */
  #switchMode(mode) {
    const from = this.#modes.mode;
    if (from === mode) return false;
    if (
      (mode === MODES.CHIP || mode === MODES.COLLAPSED) &&
      this.orderedChips().length === 0
    ) {
      mode = MODES.FILTER;
    }
    this.#modes.current = mode;
    return true;
  }

  /**
   * Mirrors the active mode onto the root element as `cm-select--mode-<mode>`,
   * one class at a time, so the stylesheet can tell one mode from another
   * without the stylesheet having to infer it. It is set here rather than in
   * #switchMode because the machine is the only thing that knows the mode a
   * request actually landed on: #switchMode turns an unreachable Chip/Collapsed
   * into Filter mode, and the class has to follow the outcome.
   *
   * `cm-dropdown--open` cannot stand in for this. The DropDown is open in Chip
   * and Collapsed mode too, between the press that opens it and the one that
   * hands over to DropDown mode, so the open state alone does not say that
   * DropDown mode is the active one.
   * @private
   * @param {string} mode
   */
  #markMode(mode) {
    for (const known of Object.values(MODES)) {
      this.el.classList.toggle(`cm-select--mode-${known}`, known === mode);
    }
  }

  /**
   * The Chip and Collapsed modes navigate the selection's Chips; with no Chips
   * left they have nothing to operate on and fall back to the default Filter
   * mode. An emptied selection also empties a DropDown that was restricted to
   * the selected Items, so that restriction is dropped and the control returns
   * to its default state as well. Runs after any mutation that could have
   * emptied the selection. Reachability of Chip/Collapsed mode is enforced on
   * entry by #switchMode; this is the same rule applied after the fact, to a
   * mode the selection was emptied out from under.
   * @private
   */
  #normalizeMode() {
    const mode = this.#modes.mode;
    if (this.orderedChips().length === 0) {
      if (mode === MODES.CHIP || mode === MODES.COLLAPSED) {
        this.#switchMode(MODES.FILTER);
      }
      // Filter mode's entry hook is what drops the restriction and restores the
      // editable caret, so it runs even when the mode is already Filter and the
      // transition hook would otherwise be skipped. That hook also clears the
      // Current marker, which is right when the list is merely being reopened
      // but wrong here: the Item just unselected is still in the full list
      // taking its place, so the marker is put back on it.
      if (this.selectionBox.filter.displaySelected) {
        const current = this.dropDown.currentItem;
        this.#activateFilter();
        if (current) this.dropDown.setCurrent(current);
      }
    }
  }

  /**
   * Public: switches the active input mode. Mode factories call this to hand
   * control to another mode mid-interaction (e.g. Filter's ArrowDown opening
   * the DropDown and entering DropDown mode). Emits cm-mode-change for real
   * transitions. Same-mode switches are no-ops.
   * @param {string} mode
   * @returns {boolean} whether a transition actually happened
   */
  switchMode(mode) {
    return this.#switchMode(mode);
  }

  /**
   * Whether an achieved collapse is held for the interaction as a whole, so
   * that the count alone does not expand the box mid-navigation. True while
   * Collapsed mode is active and while its DropDown is being navigated, false
   * everywhere else. Read by SelectionBox; see Modes#holdsCollapse.
   */
  get holdsCollapse() {
    return this.#modes.holdsCollapse;
  }

  /**
   * Leaves the current input mode and returns to the one that was active before
   * it. With no previously active mode recorded (not reachable through normal
   * flows — every transition records one) it falls back to the default Filter
   * mode and logs a warning. Emits `cm-mode-change` for real transitions.
   * @returns {boolean} whether a transition actually happened
   */
  changeToPrevious() {
    const previous = this.#modes.previous;
    if (!previous) {
      this.logger.warn('no previous mode recorded; defaulting to "filter"');
      return this.#switchMode(MODES.FILTER);
    }
    return this.#switchMode(previous);
  }

  /**
   * Closes the DropDown and hands the keyboard back to the mode it was entered
   * from. The mode the DropDown was entered from is the whole of what it carries
   * over, and only Collapsed mode reads the closing key differently, so that
   * difference is registered as that mode's own rule and asked for here; every
   * other origin returns as it was, marker and all.
   *
   * With no previously active mode recorded (not reachable through normal flows
   * — every transition records one) there is no origin to ask, and it falls back
   * to the default Filter mode with a logged warning, through `changeToPrevious`.
   *
   * @param {'Escape'|'Enter'} key the key that closed the DropDown
   */
  leaveDropDown(key) {
    this.dropDown.open = false;
    if (!this.#modes.leaveDropDown(key)) this.changeToPrevious();
  }

  /**
   * Dispatches a bubbled CustomEvent of the given type on the component's root
   * element, carrying the provided detail. This is the single dispatcher behind
   * the whole public event surface (prefix `cm-`).
   *
   * Event contract:
   * - `cm-items-request`  — detail `{}`; one-shot, fired only while the
   *   component has no Items (empty `delayedLoad` control): first Filter focus,
   *   first DropDown open, first toggleAll()/clearAll(). See `requestItems()`.
   * - `cm-items-set`      — detail `{ count }`; fired by `setItems()` only in
   *   delayedLoad mode; `count` is the number of instantiated Items.
   * - `cm-dropdown-open`  — detail `{}`; fired on every `open = true` assignment.
   * - `cm-dropdown-close` — detail `{}`; fired on every `open = false` assignment.
   * - `cm-mode-change`    — detail `{ from, to }`; fired on real input-mode
   *   transitions only, from the mode machine itself (the `Modes` transition
   *   notification), so every switch path emits — keyboard, clicks, and
   *   `Modes#current`/`changeToPrevious` alike.
   *
   * Example (recommended delayed-load wiring):
   * ```js
   * const control = new MSelect(host, { items, options: { delayedLoad: true } });
   * control.el.addEventListener('cm-items-request', async () => {
   *   control.setItems(await fetchItems());
   * });
   * control.el.addEventListener('cm-items-set', (e) => {
   *   console.log(`instantiated ${e.detail.count} items`);
   * });
   * control.el.addEventListener('cm-mode-change', ({ detail }) => {
   *   console.log(`mode ${detail.from} -> ${detail.to}`);
   * });
   * control.el.addEventListener('cm-dropdown-open', () => console.log('open'));
   * ```
   * @param {string} type one of the `cm-*` event types listed above
   * @param {object} [detail] payload passed through to the listener via `e.detail`
   * @returns {CustomEvent} the dispatched event, for inspection or chaining
   */
  emit(type, detail = {}) {
    const event = new CustomEvent(type, { detail, bubbles: true });
    this.el.dispatchEvent(event);
    return event;
  }

  /**
   * Signals that the component needs Items while it has none. With delayedLoad
   * enabled the first focus/open/toggleAll/clearAll raises the one-shot
   * "cm-items-request" event so the application can call setItems. A no-op once
   * Items are present or the request was already made.
   * @fires CmItemsRequestEvent (one-shot)
   */
  requestItems() {
    if (this.#itemsLoaded || this.#itemsRequested) return;
    this.#itemsRequested = true;
    this.emit('cm-items-request', {});
  }

  /**
   * Instantiates the whole Item tree, replacing any previous tree. A given
   * component instantiates at most once: with delayedLoad disabled the
   * constructor calls setItems(config.items); with delayedLoad enabled the
   * component stays empty until the application calls setItems (typically in
   * response to the one-shot cm-items-request event). Calling setItems a second
   * time throws; later tree adjustments happen by adding/removing Items.
   *
   * The new tree fully replaces the old one: the DropDown is rebuilt, the
   * Current marker and the stored selection are reset, and the selection is
   * re-seeded. Preset selections beyond PRESET_SELECTION_LIMIT enforce
   * maxVisibleChips.
   *
   * `selectedValues` is the selection stated as an array of *Item* values, and it
   * is authoritative where a spec's own `selected: true` flag is not: given, it
   * alone says which *Items* are selected and in which order, so a flag outside it
   * selects nothing. The order it gives is the order the *Chips* arrive in the
   * box, which is what `chipPlaceOrder: 'unsorted'` shows; the other placement
   * orders re-sort them as usual.
   *
   * Each value must resolve to an *Item* that owns a *Chip*, must not be repeated,
   * and anything else throws with the tree still unpopulated rather than leaving a
   * selection half-stated. Omitting the argument falls back to the `selected: true`
   * flags, which arrive in definition order.
   * @param {object[]} [specs]
   * @param {unknown[]} [selectedValues] the selection, as *Item* values in Chip order
   * @returns {MSelect}
   * @fires CmItemsSetEvent when `delayedLoad` is enabled
   */
  setItems(specs, selectedValues) {
    if (this.#itemsLoaded) {
      throw new Error('setItems() can only be populated once per component instance');
    }
    this.#itemsLoaded = true;

    this.dropDown.itemsEl.innerHTML = '';
    this.dropDown.items = Item.root(specs || [], this.options, this.dropDown.itemsEl);
    this.#assertUniqueValues();
    this.allItems.forEach((item) => {
      item.owner = this;
    });

    // Resolved before anything is rendered. Unknown, Group and repeated values
    // are warned about and skipped, so the tree is populated with whatever the
    // seed still resolves to (REQ-7-20).
    const seeded =
      selectedValues === undefined ? null : this.#resolveSelectedValues(selectedValues);

    // Batched with the Chip seeding below: setting the flags one by one would
    // settle - and re-render the whole tree - once per Item (REQ-9-05).
    if (seeded) this.#inBatch(() => this.#applySeed(seeded));

    this.dropDown.clearCurrent();
    this.selectionBox.clear();
    this.selectionBox.render();

    const selected = this.selectedItems;
    if (
      selected.length > PRESET_SELECTION_LIMIT &&
      this.options.maxVisibleChips == null
    ) {
      this.options.maxVisibleChips = PRESET_MAX_VISIBLE_CHIPS;
      this.logger.warn(
        `preset selection of ${selected.length} Items exceeds ${PRESET_SELECTION_LIMIT}; ` +
          `enforced maxVisibleChips=${PRESET_MAX_VISIBLE_CHIPS}`
      );
    }

    // `selected` is the selection in document order, which is what the count and
    // the safeguard above are about; the box itself is filled in the seed's own
    // order where there is one, and in document order otherwise. Batched, so the
    // chips are placed once by the render below rather than once per Item - the
    // per-Item path re-reads `selectedItems` and re-sorts the box every time.
    this.#inBatch(() => {
      for (const item of seeded || this.selectedItems) {
        this.selectionBox.add(item);
      }
    });
    this.selectionBox.render();
    this.#syncFormValues();
    this.#normalizeMode();

    if (this.options.delayedLoad) {
      this.emit('cm-items-set', { count: this.allItems.length });
    }
    return this;
  }

  /**
   * Closes the DropDown when the pointer lands outside the control and resets
   * the input to the default filter mode.
   * @private
   * @param {Event} e
   */
  #onDocumentMouseDown(e) {
    if (this.el.contains(e.target)) return;
    this.dropDown.open = false;
    this.#switchMode(MODES.FILTER);
    this.selectionBox.filter.setCaretState({ editable: false, focused: false });
    this.selectionBox.filter.displaySelected = false;
  }

  /**
   * @private Resolves the `selectedValues` seed to the Items it names, in the order
   * given. Only selectable leaves own a Chip, so only they can be named. The
   * resolution is lenient, because the seed is a selection remembered from a
   * previous session and a list that no longer matches the tree exactly should
   * restore what still resolves rather than fail the whole control: a value naming
   * no Item, a Group (selected through its children, REQ-3.3-04) or a repeat of an
   * earlier value is warned about and skipped, while the first occurrence of each
   * value fixes the Chip order. A non-array argument is still a type error.
   * @param {unknown[]} values
   * @returns {Item[]}
   */
  #resolveSelectedValues(values) {
    if (!Array.isArray(values)) {
      throw new Error('selectedValues must be an array of Item values');
    }
    const byValue = new Map();
    for (const item of this.allItems) {
      const { value } = item;
      if (value === undefined) continue;
      byValue.set(value, item);
    }
    const seen = new Set();
    const resolved = [];
    for (const value of values) {
      const item = byValue.get(value);
      if (item === undefined) {
        specLog.warn(
          `selectedValues names "${value}", which is no Item's value; ignoring it`
        );
        continue;
      }
      if (item.isGroup) {
        specLog.warn(
          `selectedValues names "${value}", a Group; a Group owns no Chip and is ` +
            'selected through its children, so it is ignored'
        );
        continue;
      }
      if (seen.has(value)) {
        specLog.warn(
          `selectedValues names "${value}" more than once; ignoring the repeat`
        );
        continue;
      }
      seen.add(value);
      resolved.push(item);
    }
    return resolved;
  }

  /**
   * @private States the selection the seed resolves to. The array is the whole
   * selection, so a `selected: true` flag on a spec is a second claim on the same
   * state rather than a fallback: only the named Items end up selected. The flags
   * are written directly rather than through `Item#toggle`, because this is a
   * claim about which Items are selected, not a request to interactively walk the
   * tree and emit toggles - a Group settles from its children's counters, not from
   * a flag of its own (REQ-3.3-04).
   * @param {Item[]} seeded
   */
  #applySeed(seeded) {
    const named = new Set(seeded);
    for (const item of this.allItems) {
      if (item.selected && !named.has(item)) item.selected = false;
    }
    for (const item of seeded) {
      item.selected = true;
    }
  }

  /** @private Throws when more than one Item declares the same value. An Item
   * with no value is skipped: there is nothing to collide on. */
  #assertUniqueValues() {
    const seen = new Set();
    for (const item of this.allItems) {
      const value = item.value;
      if (value === undefined) continue;
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

  /**
   * The top-level Items navigation can start from when no Current Item is set
   * yet: the rendered, togglable ones, in tree order. ArrowDown/ArrowUp begin
   * here so the marker always lands on a level the user can see.
   * @returns {Item[]}
   */
  get navigableTopLevel() {
    return [...this.items].filter((item) => item.navigable);
  }

  /** Items currently selected, i.e. the chips' source. */
  get selectedItems() {
    return this.items.selectableItems.filter((i) => i.selected);
  }

  /**
   * The selection stated as an array of Item values. It is the symmetric read of
   * the `selectedValues` seed accepted by `setItems`: the values are in arrival
   * order, the order the seed fixes and the one order that cannot be derived from
   * the selected state (REQ-5-02), so feeding it back reproduces the same Chips.
   * It contains selectable leaves only: a Group owns no Chip and is selected
   * through its children, so it never appears (REQ-3.2-04).
   * @returns {unknown[]}
   */
  get selectedValues() {
    return this.selectionBox.items.map((item) => item.value);
  }

  /** @private Hidden-input container for form submission; created on first need. */
  #formEl = null;

  /** @private Values already warned about the comma delimiter; warn once each. */
  #commaWarned = new Set();

  /**
   * @private Mirrors the selection into hidden inputs on `MSelect#el`, so the
   * selected values submit with the enclosing `<form>` (REQ-6-03, REQ-7-08). One
   * input per selected Item, named verbatim by `options.name` and emitted in
   * `selectedValues` order, so `FormData`/`URLSearchParams` carry repeated
   * entries (`name=v&name=w`) for the server to join. Without a name the control
   * takes no part in submission.
   *
   * The order matches the Chips, not the document: a seed order survives, so
   * what submits is what `selectedValues` reports. A value containing the comma
   * the server joins on is submitted as-is but warned about once, because it
   * cannot be told apart from a separator once joined.
   */
  #syncFormValues() {
    const name = this.options.name;
    if (!name) return;
    if (!this.#formEl) {
      this.#formEl = document.createElement('div');
      this.#formEl.className = 'cm-form';
      this.el.append(this.#formEl);
    }
    this.#formEl.innerHTML = '';
    for (const item of this.selectionBox.items) {
      const value = String(item.value);
      if (value.includes(',') && !this.#commaWarned.has(value)) {
        this.#commaWarned.add(value);
        specLog.warn(
          `Item "${item.label}": value ${JSON.stringify(value)} contains a comma, ` +
            `but "${name}" submits as repeated entries the server joins with commas, ` +
            'so the value cannot be told apart after the join.'
        );
      }
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      this.#formEl.append(input);
    }
  }

  /**
   * Chips ordered per `chipPlaceOrder`.
   *
   * `unsorted` is the order the Chips arrived in the box, the most recently
   * selected Item at the tail - so an Item unselected and selected again moves
   * to the tail. It is the one order that cannot be derived from the current
   * selected state, which is why it reads the box's own membership rather than
   * `selectedItems`. A selection preset at instantiation arrives in definition
   * order, so it yields the same order as `asDefined`.
   *
   * @returns {Item[]}
   */
  orderedChips() {
    const order = this.options.chipPlaceOrder || 'unsorted';
    let list;
    if (order === 'unsorted') {
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
   * @param {'unsorted'|'asDefined'|'alphabetical'} order
   */
  setChipPlaceOrder(order) {
    this.options.chipPlaceOrder = order;
    this.render();
  }

  /**
   * @param {Item} item
   */
  unselectItem(item) {
    this.#unselect(item);
    this.#settleAfterSelectionChange();
  }

  /**
   * @private Re-renders the list after a selection change. With the DropDown
   * restricted to the selected Items the filter is re-run, so an Item that just
   * lost its selection leaves the visible list instead of lingering there.
   * Otherwise only the selection state changes, so a plain render is enough —
   * re-running the text filter here would drop items the pending debounce has
   * not applied yet.
   */
  #syncVisibleList() {
    if (this.selectionBox.filter.displaySelected) {
      this.selectionBox.filter.refilter();
    } else {
      this.render();
    }
  }

  /**
   * @private Settles the list and the mode after a selection change, then keeps
   * the Current marker on something the user can actually see.
   *
   * The list is re-synced once, at the end of the change: an Item that just lost
   * its selection must leave a selected-Items-only DropDown, and by then the
   * whole unselected subtree is done.
   *
   * A restricted DropDown lists selected Items only, so unselecting the Current
   * Item can strand the marker on an Item that has just left the list — most
   * visibly for a valueless Group, which owns no Chip for
   * `SelectionBox#remove` to promote from. The marker then moves to the next
   * visible Item on its own level, or to the last one when nothing follows.
   *
   * An emptied list is deliberately left alone: by this point `#normalizeMode`
   * has returned the control to its full list, where the Item just unselected is
   * visible again, and keeping the marker on it is the documented behaviour.
   */
  #settleAfterSelectionChange() {
    this.#syncFormValues();
    this.#syncVisibleList();
    this.#normalizeMode();

    if (
      this.#modes.mode !== MODES.DROPDOWN ||
      !this.selectionBox.filter.displaySelected
    ) {
      return;
    }
    const stranded = this.dropDown.currentItem;
    if (!stranded || stranded.navigable) return;

    // The Item just left the list, so the walk is asked for its successor in the
    // list that is left, and it is asked the way a toggled Item is answered: by
    // its next sibling. Toggling a Group is an act on the Group itself, so its
    // subtree is already accounted for and is stepped over rather than walked
    // into. With no next sibling the answer is the Item that is then the last,
    // which is the question the axis is asked - and on a column the children of
    // a Group share its line, so the last one of them is that answer while on a
    // row they stand off the line and the Group itself is. Every hop filters on
    // `navigable`, which is what makes "next visible" the walk's own answer
    // rather than a separate lookup.
    this.dropDown.setCurrent(stranded.nextInLevel() ?? stranded.previousInAxis());
  }

  /**
   * @private Clears the selection of `item` and of everything below it. The
   * list is re-rendered by `unselectItem` once, after the whole subtree is done.
   * A *Group* has no flag to clear and no Chip to drop, so the walk starts at its
   * children and the subtree answers for itself.
   * @param {Item} item
   */
  #unselect(item) {
    if (!item.isGroup) {
      item.selected = false;
      this.selectionBox.remove(item);
    }
    for (const child of item) {
      this.#unselect(child);
    }
  }

  /**
   * Handles an Item's selection state change: adds the Chip for passed/selected
   * Items carrying a value, removes it for unselected ones. Called by Item#toggle.
   * A Group never arrives here - it has no selection of its own, so it owns no
   * Chip, and its children report themselves.
   * @param {Item} item
   */
  onItemToggled(item) {
    if (item.isGroup) return;
    if (item.selected) {
      if (item.value !== undefined) {
        this.selectionBox.add(item);
      }
    } else {
      this.selectionBox.remove(item);
    }
    if (!this.batching) this.#settleAfterSelectionChange();
  }

  /** @private nesting depth of bulk selection changes; see `#inBatch`. */
  #batchDepth = 0;

  /**
   * Whether a bulk selection change is in progress, so the per-Item work that the
   * settling render redoes anyway is left out.
   * @returns {boolean}
   */
  get batching() {
    return this.#batchDepth > 0;
  }

  /**
   * Runs a bulk selection change with the per-Item settling and the SelectionBox's
   * per-Item collapse bookkeeping suspended, leaving one render and settle for the
   * caller to do at the end. Without it a change touching N Items settles N times
   * over, re-rendering the whole tree each time.
   * @template T
   * @param {() => T} fn
   * @returns {T}
   */
  #inBatch(fn) {
    this.#batchDepth++;
    try {
      return fn();
    } finally {
      this.#batchDepth--;
    }
  }

  clearAll() {
    this.logger.info('clear all');
    this.requestItems();
    this.#inBatch(() =>
      this.items.selectableItems.forEach((i) => {
        if (!i.selected) return;
        i.selected = false;
        this.onItemToggled(i);
      })
    );
    this.dropDown.clearCurrent();
    this.render();
    this.#normalizeMode();
  }

  toggleAll() {
    this.logger.info('toggle all');
    this.requestItems();
    this.#inBatch(() => this.dropDown.items.toggle());
    this.selectionBox.filter.query = '';
    this.render();
  }

  /* ---- selection interaction ---- */

  /**
   * Delegated from an Item's Chip view (child-side wiring in Item#createDOM).
   * Clicking the "x" removal area unselects the Item; clicking the Chip body
   * marks the Item Current and enters Chip mode, without unselecting.
   * @param {Item} item
   * @param {Event} e
   */
  onChipViewClick(item, e) {
    if (closestByClass(e.target, 'cm-chip__x')) {
      this.unselectItem(item);
      return;
    }
    this.#switchMode(MODES.CHIP);
    this.dropDown.open = true;
    this.dropDown.setCurrent(item);
  }

  /**
   * Delegated from an Item's view inside the DropDown (child-side wiring in
   * Item#createDOM). Toggling keeps the Item and its Chip entangled (REQ-3.5-01);
   * the Item is then marked Current.
   *
   * A click that empties the selection also drops the selected-Items-only
   * restriction (see #normalizeMode), replacing the restricted list with the
   * full one. The click stays in DropDown mode — the mode is not reverted with
   * it — but the list it was aimed at is gone, so the marker restarts on the
   * first navigable Item of the restored list instead of following the clicked
   * one.
   * @param {Item} item
   * @param {Event} e
   */
  onItemViewClick(item) {
    const restricted = this.selectionBox.filter.displaySelected;
    item.toggle();
    const restored = restricted && !this.selectionBox.filter.displaySelected;
    this.dropDown.setCurrent(restored ? this.navigableTopLevel[0] ?? null : item);
    this.#switchMode(MODES.DROPDOWN);
  }

  render() {
    this.dropDown.render();
    this.selectionBox.render();
    this.#syncFormValues();
  }
}

export const msLog = new Logger();

/**
 * Symbol-keyed access to internal, non-public state. Not part of the public
 * API; exported so tests can observe internals (e.g. the Modes machine).
 */
export const MSELECT_INTERNALS = Symbol('m-select.internals');

export default MSelect;