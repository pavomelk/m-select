# m-select

Vanilla JS multi-select combobox/listbox with hierarchical items, filtering, keyboard navigation, chips, and form integration. No production dependencies.

## Features

- **Hierarchical items** - Forest-like tree of groups and selectable leaves
- **Multi-select with chips** - Selected items appear as removable chips in the always-visible Selection Box
- **Filtering** - Type to narrow the dropdown list with live re-filtering
- **Keyboard navigation** - Full keyboard support across modes (Filter, Dropdown, Chip, Collapsed)
- **Select All / Clear All** - Bulk actions over visible selectable items
- **Collapsed chips** - Summarizes large selections into a single chip with configurable threshold
- **Form integration** - Hidden inputs mirror selection for standard form submission
- **Programmatic control** - Rich API via `MSelect` or value-based `MSelectFacade`
- **Events** - Custom `cm-*` events for open/close, mode changes, and selection changes
- **Lazy loading** - Optional `delayedLoad` with `cm-items-request`/`setItems` flow
- **Tooltips** - Per-item and group tooltips
- **Customizable layout** - Row/column flow per hierarchy level
- **No DOM transformation** - Vite serves source directly in dev; build uses standard bundling

## Demo

The included demo uses a **permissions matrix** example (roles × capabilities). To run it locally:

```bash
npm install
npm run dev
```

Open [http://localhost:5173/demo/index.html](http://localhost:5173/demo/index.html). The demo shows the control wired with `MSelectFacade`, form submission, and live mode/selection readout.

## Installation

This project is currently not published to npm as a package. You can use it by importing from source or building locally:

```bash
npm install
npm run build
```

Built assets go to `dist/`. For integration, you can copy `src/m-select.js`, `src/m-select-facade.js`, `src/modes.js`, and `src/m-select.css` into your project, or import them directly in a bundler that supports ES modules.

## Quick Start

### Using MSelectFacade (recommended)

```js
import MSelectFacade from './src/m-select-facade.js';
import './src/m-select.css';

const host = document.getElementById('host');
const facade = new MSelectFacade(host, {
  items: [
    { label: 'Viewer', value: 'viewer' },
    { label: 'Editor', value: 'editor' },
    { label: 'Admin', value: 'admin' },
  ],
  options: { name: 'permissions', placeholder: 'Select roles...' }
});

// Programmatic API
facade.select('editor');
console.log(facade.values); // ['editor']
facade.on('cm-selection-change', (e) => console.log(e.detail));
```

### Using MSelect directly

```js
import { MSelect } from './src/m-select.js';
import './src/m-select.css';

const host = document.getElementById('host');
const control = new MSelect(host, {
  items: [...],
  options: { name: 'permissions' }
});

control.el.addEventListener('cm-selection-change', (e) => {
  console.log(e.detail.values, e.detail.added, e.detail.removed);
});
```

## API Reference

### MSelectFacade
Value-based public API (no internal objects exposed).

| Method/Property | Description |
|---|---|
| `constructor(root, config)` | Mounts control into `root`. `config` = `{ items, options }` |
| `get values()` | Current selection as array of values (in chip order) |
| `set values(array)` | Programmatically set selection by values |
| `get mode()` | Current input mode (`'filter' \| 'dropdown' \| 'chip' \| 'collapsed'`) |
| `get isEmpty()` | True if no items loaded (useful with `delayedLoad`) |
| `get el()` | Root element of the control |
| `open()` / `close()` | Toggle dropdown visibility |
| `select(value)` / `unselect(value)` / `toggle(value)` | Modify selection |
| `selectAll()` / `clear()` | Bulk operations |
| `setItems(items, selectedValues?)` | Load items (for delayed loading) |
| `on(type, handler)` / `off(type, handler)` | Subscribe/unsubscribe to `cm-*` events |
| `destroy()` | Tear down the control |

### MSelect
Full component API with access to internals.

| Method/Property | Description |
|---|---|
| `constructor(hostElement, config)` | Create and mount control |
| `get selectedValues()` / `set selectedValues(values)` | Get/set selection by values (settles in one pass) |
| `get selectedItems()` | Currently selected Item objects |
| `get mode` / `set mode` | Get/set input mode |
| `setItems(specs, selectedValues?)` | One-time tree instantiation (throws if called twice) |
| `clearAll()` / `toggleAll()` | Bulk selection operations |
| `render()` | Re-render dropdown and selection box |
| `destroy()` | Remove control from DOM |
| `emit(type, detail)` | Dispatch custom event on control root |
| `el` | Control root element |

## Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | — | Name for hidden form inputs (enables form submission) |
| `placeholder` | `string` | — | Placeholder text for the filter input |
| `maxVisibleChips` | `number\|null` | `null` | Max chips shown before collapsing into summary chip |
| `chipPlaceOrder` | `'unsorted'\|'asDefined'\|'alphabetical'` | `'unsorted'` | Chip ordering strategy |
| `logLevel` | `'silent'\|'error'\|'warn'\|'info'\|'debug'` | `'warn'` | Logging verbosity |
| `delayedLoad` | `boolean` | `false` | Defer item instantiation until `setItems()` called |
| `align` | `object` | — | Per-depth layout: `{ depth: { flow: 'row'\|'column' } \| 'row'\|'column' }` |
| `groupItems.toggleScope` | `'visible'\|'all'` | `'visible'` | What a group toggle affects |
| `groupItems.filterScope` | `'matching'\|'all'` | `'matching'` | What remains visible when group label matches filter |

## Item Specification

```js
{
  label: 'Edit Files',      // Display text (required)
  value: 'edit',           // Value for selection/form (omitting makes non-selectable)
  items: [...],            // Child items for groups
  selected: true,          // Pre-select at instantiation
  selectable: true,        // Override selectability
  tooltip: 'Edit files',   // Native tooltip
}
```

Notes:
- Groups don't own values/chips; selection comes from their children
- Items without values cannot be selected
- `selectable: 'false'` (string) is accepted and warned about if misread

## Events

All events bubble from `control.el` as `CustomEvent` with `detail` payloads. Event types are prefixed `cm-`.

| Event | Detail | Description |
|---|---|---|
| `cm-items-request` | `{}` | One-shot; fired when empty and `delayedLoad: true` (on first focus/open/toggleAll/clearAll) |
| `cm-items-set` | `{ count }` | Fired by `setItems()` in delayed-load mode |
| `cm-dropdown-open` | `{}` | Dropdown becomes visible |
| `cm-dropdown-close` | `{}` | Dropdown becomes hidden |
| `cm-mode-change` | `{ from, to }` | Input mode transition (`filter`/`dropdown`/`chip`/`collapsed`) |
| `cm-selection-change` | `{ values, added, removed }` | Selection changed (once per settled change; silent if no change; order reported) |

## Keyboard Navigation

The control maintains a single tab stop (the Filter input). Navigation uses modes:

| Mode | Key Behaviors |
|---|---|
| **Filter** | Type to filter. `ArrowDown` opens dropdown and navigates. `ArrowLeft` on empty query enters Chip/Collapsed mode. `Backspace` at start removes rightmost chip. `Enter` toggles current item and clears filter. |
| **Dropdown** | `ArrowUp/Down/Left/Right` navigate hierarchy (direction depends on level layout). `Home/End/PageUp/PageDown` move within level. `Space` toggles current item (stays open). `Enter` toggles and closes dropdown. `Escape` closes and returns to previous mode. |
| **Chip** | `ArrowLeft/Right` navigate chips. `Delete`/`Backspace` remove chips. `ArrowDown` opens dropdown. `ArrowRight` at end returns to Filter. |
| **Collapsed** | Navigate collapsed summary. `ArrowDown` opens restricted dropdown of selected items. `ArrowRight` returns to Filter. |

## Styling & Theming

Styles are in `src/m-select.css` with `cm-` prefixed classes and CSS variables. Key classes:
- `.cm-select`, `.cm-select--mode-filter|chip|collapsed|dropdown`
- `.cm-selection-box`, `.cm-filter`, `.cm-chip`, `.cm-chip--current`, `.cm-chip--collapsed`
- `.cm-dropdown`, `.cm-dropdown--open`, `.cm-items`, `.cm-item`, `.cm-item--group`, `.cm-item--selected`, `.cm-item--partial`, `.cm-item--current`, `.cm-item--hidden`
- `.cm-select-all`, `.cm-clear-all`
- `.cm-form` (hidden inputs container)

Override CSS variables or target classes for theming. No CSS preprocessors required.

## Development

```bash
npm install
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run preview  # Preview build
npm test         # Run all tests
```

**Project structure:**
```
m-select/
├── src/
│   ├── m-select.js           # Core component
│   ├── m-select-facade.js    # Value-based facade
│   ├── modes.js              # Mode definitions and handlers
│   ├── main.js               # Demo entry
│   └── m-select.css
├── test/
│   ├── 01_m-select.test.js   # Core tests
│   ├── 02-m-select-facade.test.js
│   └── dom-stub.js
├── demo/
│   ├── index.html
│   └── favicon.svg
├── project/                  # Requirements, use cases, specs
└── vite.config.js
```

## Testing

Tests use Vitest with Node environment and a custom DOM stub (`test/dom-stub.js`). Run all tests:

```bash
npx vitest run
```

Current test suite: **475 tests passing** across 2 test files.

## Browser Support

Modern browsers with ES module support (Chrome, Firefox, Safari, Edge). Uses standard DOM APIs and CustomEvent.

## License

See repository for license details.