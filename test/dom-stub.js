/**
 * Minimal DOM stub for node-environment unit tests.
 * The component under test only needs light element construction;
 * a full browser DOM (happy-dom/jsdom) is not required here.
 */

const noop = () => {};

/** Tag names that are focusable in the real DOM (tabIndex 0 by default). */
const FOCUSABLE_TAGS = new Set(['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA']);

class ClassList {
  constructor() {
    this.set = new Set();
  }

  toString() {
    return [...this.set].join(' ');
  }

  add(...names) {
    names.forEach((n) => n && this.set.add(n));
  }

  remove(...names) {
    names.forEach((n) => this.set.delete(n));
  }

  toggle(name, force) {
    if (force !== undefined) {
      if (force) this.set.add(name);
      else this.set.delete(name);
      return force;
    }
    if (this.set.has(name)) {
      this.set.delete(name);
      return false;
    }
    this.set.add(name);
    return true;
  }

  contains(name) {
    return this.set.has(name);
  }
}

class ElementStub {
  constructor(tag) {
    this.nodeType = 1;
    this.tagName = (tag || 'div').toUpperCase();
    this.classList = new ClassList();
    this.style = {};
    this.children = [];
    this.value = '';
    this.type = '';
    this.placeholder = '';
    this.title = '';
    this._textContent = '';
    this._innerHTML = '';
    this.scrollIntoViewCalls = 0;
  }

  /** @private overrides window into the natural focusability default. */
  #tabIndex = undefined;

  /**
   * Row-mirrors the DOM: naturally focusable tags default to 0, everything
   * else to -1; an explicit assignment always wins.
   */
  get tabIndex() {
    if (this.#tabIndex !== undefined) return this.#tabIndex;
    return FOCUSABLE_TAGS.has(this.tagName) ? 0 : -1;
  }

  set tabIndex(value) {
    this.#tabIndex = Number(value);
  }

  get className() {
    return this.classList.toString();
  }

  set className(value) {
    this.classList.set = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this._innerHTML === '') {
      this.children.forEach((c) => {
        if (c && c._parent === this) c._parent = null;
      });
      this.children = [];
    }
  }

  append(...nodes) {
    for (const node of nodes) {
      if (node && node._parent && node._parent !== this) {
        node._parent.removeChild(node);
      }
      node._parent = this;
      this.children.push(node);
    }
  }

  appendChild(node) {
    this.append(node);
  }

  insertBefore(node, reference) {
    const i = this.children.indexOf(reference);
    if (i >= 0) {
      if (node._parent && node._parent !== this) node._parent.removeChild(node);
      node._parent = this;
      this.children.splice(i, 0, node);
    } else {
      this.append(node);
    }
    return node;
  }

  removeChild(node) {
    const i = this.children.indexOf(node);
    if (i >= 0) this.children.splice(i, 1);
    if (node._parent === this) node._parent = null;
    return node;
  }

  get parentNode() {
    return this._parent || null;
  }

  remove() {
    if (this._parent) this._parent.removeChild(this);
  }

  /**
   * Nearest ancestor (or self) matching a selector. Only single-class
   * selectors like ".cm-chip" are supported; anything else (e.g. a bare class
   * name, a tag name) matches nothing, mirroring the real DOM.
   * @param {string} selector
   */
  closest(selector) {
    const cls = String(selector).startsWith('.') ? selector.slice(1) : null;
    let el = this;
    while (el) {
      if (cls && el.classList && el.classList.contains(cls)) return el;
      el = el._parent || null;
    }
    return null;
  }

addEventListener(type, fn) {
    this._listeners = this._listeners || {};
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  }

  removeEventListener(type, fn) {
    this._listeners = this._listeners || {};
    const list = this._listeners[type] || [];
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }

  /**
   * Dispatches a bare event object to listeners registered for `type`, walking
   * up the `_parent` chain like a real DOM bubble phase. Listeners whose event
   * object defines `stopPropagation` can halt the walk.
   *
   * Two things the browser does that a bare event object does not are supplied
   * here. `target` defaults to the node the event was dispatched on, which is
   * what every listener reads and what the node it started at still reports
   * after the event has bubbled. And an event that bubbles out of a tree whose
   * root is `document.body` is delivered to `document` as well, because that is
   * where the component's outside-click and stray-key listeners live; a detached
   * tree takes its events with it, so a control that was never put on the page
   * cannot answer another control's document listeners.
   */
  dispatchEvent(event) {
    this._listeners = this._listeners || {};
    const type = typeof event === 'string' ? event : event && event.type;
    if (event && typeof event === 'object' && event.target === undefined) {
      event.target = this;
    }
    let el = this;
    while (el) {
      const list = (el._listeners && el._listeners[type]) || [];
      for (const fn of list) fn(event);
      if (event && event._propagationStopped) break;
      if (!el._parent) {
        if (el === document.body) document.dispatchEvent(event);
        break;
      }
      el = el._parent;
    }
  }

  scrollIntoView() {
    this.scrollIntoViewCalls = (this.scrollIntoViewCalls || 0) + 1;
  }

  focus() {
    this.focused = true;
    document.activeElement = this;
  }

  blur() {
    this.focused = false;
    if (document.activeElement === this) document.activeElement = document.body;
  }

  /** Programmatic click, like the browser's element.click(). */
  click() {
    this.dispatchEvent({
      type: 'click',
      target: this,
      stopPropagation() {
        this._propagationStopped = true;
      },
      preventDefault() {},
    });
  }

  /**
   * True for the node itself and for any descendant at any depth, as
   * `Node#contains` is. `other` is followed up its own `_parent` chain rather
   * than searched for among this node's children, so the answer is about the
   * tree the nodes stand in and not about who holds whom directly: a chip's "x"
   * is contained by the control's root, which holds neither of them directly.
   *
   * Anything that is not a node answers false rather than throwing. A real
   * `contains` throws a TypeError for a non-node, but a stub event often carries
   * no `target` at all, and the production code only ever asks this about
   * `event.target` - which the browser guarantees is a node - so false keeps the
   * "the pointer landed outside" reading those events are dispatched for.
   * @param {*} other
   */
  contains(other) {
    if (!other || typeof other !== 'object') return false;
    let el = other;
    while (el) {
      if (el === this) return true;
      el = el._parent || null;
    }
    return false;
  }

  setAttribute() {}

  getAttribute() {
    return null;
  }

  querySelector() {
    return null;
  }

  getElementsByClassName(name) {
    const out = [];
    const walk = (el) => {
      if (el.classList && el.classList.contains(name)) out.push(el);
      (el.children || []).forEach(walk);
    };
    walk(this);
    return out;
  }

  serialize() {
    return (
      `<${this.tagName.toLowerCase()} class="${this.className}">` +
      (Array.isArray(this.children) ? this.children.map((c) => c.serialize?.() ?? '').join('') : '') +
      `</${this.tagName.toLowerCase()}>`
    );
  }
}

globalThis.document = {
  createElement: (tag) => new ElementStub(tag),
  _listeners: {},
  addEventListener(type, fn) {
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  },
  removeEventListener(type, fn) {
    const list = this._listeners[type] || [];
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  },
  dispatchEvent(event) {
    const type = typeof event === 'string' ? event : event && event.type;
    (this._listeners[type] || []).forEach((fn) => fn(event));
  },
  body: new ElementStub('body'),
  activeElement: null,
};

globalThis.ElementStub = ElementStub;