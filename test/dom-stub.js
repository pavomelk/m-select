/**
 * Minimal DOM stub for node-environment unit tests.
 * The component under test only needs light element construction;
 * a full browser DOM (happy-dom/jsdom) is not required here.
 */

const noop = () => {};

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
      this.children = [];
    }
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  appendChild(node) {
    this.children.push(node);
  }

  removeChild(node) {
    const i = this.children.indexOf(node);
    if (i >= 0) this.children.splice(i, 1);
    return node;
  }

  addEventListener() {}

  removeEventListener() {}

  contains() {
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
  addEventListener: noop,
  removeEventListener: noop,
  body: new ElementStub('body'),
};

globalThis.ElementStub = ElementStub;