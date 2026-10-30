import MSelectFacade from './m-select-facade.js';

/**
 * Declarative wrapper that lets a page mount the control without a bootstrap
 * script. The element reads a `{ items, options }` config from a child
 * `<script type="application/json">` and exposes the live facade as `control`.
 *
 * ```html
 * <m-select>
 *   <script type="application/json">
 *     { "items": [{ "label": "Paris", "value": "paris" }], "options": { "name": "city" } }
 *   </script>
 * </m-select>
 * ```
 *
 * Fires `cm-ready` with `{ control }` once the facade is mounted.
 */
export class MSelectElement extends HTMLElement {
  #facade = null;

  connectedCallback() {
    if (this.#facade) return;
    if (!this.querySelector('script[type="application/json"]')) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.#mount(), {
          once: true,
        });
      }
      return;
    }
    this.#mount();
  }

  disconnectedCallback() {
    this.#facade?.destroy();
    this.#facade = null;
  }

  get control() {
    return this.#facade;
  }

  #mount() {
    if (this.#facade || !this.isConnected) return;
    const config = this.#readConfig();
    if (!config) return;
    this.#facade = new MSelectFacade(this, config);
    this.dispatchEvent(
      new CustomEvent('cm-ready', { detail: { control: this.#facade } })
    );
  }

  #readConfig() {
    const script = this.querySelector('script[type="application/json"]');
    if (!script) {
      console.warn('m-select: missing <script type="application/json"> config');
      return null;
    }
    try {
      return JSON.parse(script.textContent);
    } catch (error) {
      console.error('m-select: invalid JSON config', error);
      return null;
    }
  }
}

if (!customElements.get('m-select')) {
  customElements.define('m-select', MSelectElement);
}

export default MSelectElement;
