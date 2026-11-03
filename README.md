# m-select

Vanilla JS multi-select combobox/listbox with hierarchical items, filtering, keyboard navigation, chips, and form integration. No production dependencies.

## Features

- **Hierarchical items** - Forest-like tree of groups and selectable leaves
- **Multi-select with chips** - Selected items appear as removable chips in the always-visible Selection Box
- **Filtering** - Type to narrow the dropdown list with live re-filtering, with an optional custom matching function
- **Keyboard navigation** - Full keyboard support across modes (Filter, Dropdown, Chip, Collapsed)
- **Select All / Clear All** - Bulk actions over visible selectable items
- **Collapsed chips** - Summarizes large selections into a single chip with configurable threshold
- **Form integration** - Hidden inputs mirror selection for standard form submission
- **Programmatic control** - Rich API via `MSelect` or value-based `MSelectFacade`
- **Declarative HTML** - Mount with `<m-select>` and an inline JSON config, no bootstrap script
- **Events** - Custom `cm-*` events for open/close, mode changes, and selection changes
- **Lazy loading** - Optional `delayedLoad` with `cm-items-request`/`setItems` flow
- **Tooltips** - Per-item and group tooltips
- **Customizable layout** - Row/column flow per hierarchy level
- **No DOM transformation** - Vite serves source directly in dev; build uses standard bundling

## Demo

The demo is driven entirely from `demo/index.html`: it declares an `<m-select>` element with its item tree and options in an inline JSON config, and imports `src/m-select-element.js` to register the element. To run it locally:

```bash
npm install
npm run dev
```

Open [http://localhost:5173/demo/index.html](http://localhost:5173/demo/index.html). The demo shows declarative mounting, form submission, and live mode/selection readout.

## Installation

This project is currently not published to npm as a package. You can use it by importing from source or building locally:

```bash
npm install
npm run build
```

Built assets go to `dist/`. For integration, you can copy `src/m-select.js`, `src/m-select-facade.js`, `src/m-select-element.js`, `src/modes.js`, and `src/m-select.css` into your project, or import them directly in a bundler that supports ES modules.

## Quick Start

### Using the `<m-select>` element

```html
<link rel="stylesheet" href="./src/m-select.css" />
<script type="module" src="./src/m-select-element.js"></script>

<m-select>
  <script type="application/json">
    {
      "items": [
        { "label": "Viewer", "value": "viewer" },
        { "label": "Editor", "value": "editor" },
        { "label": "Admin", "value": "admin" }
      ],
      "options": { "name": "permissions", "placeholder": "Select roles..." }
    }
  </script>
</m-select>
```

The element reads `{ items, options }` from its child JSON script and fires `cm-ready` with `{ control }` once mounted. `element.control` is the live `MSelectFacade`. Form submission works through the enclosing `<form>` when `options.name` is set.

### Using MSelectFacade (recommended for programmatic control)

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
| `get filterFn()` / `set filterFn(fn)` | Custom query matcher; assign to replace, `null` to restore the built-in label match |
| `get query()` / `set query(text)` | The Filter's text; assigning re-filters the list without opening it |
| `addItem(spec, place?)` | Add an item at runtime; `place` = `{ before?, parent? }` naming values |
| `removeItem(value)` | Remove an item with its subtree and its chips; returns whether it was found |
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
| `get filterFn()` / `set filterFn(fn)` | Get/replace the query matcher at runtime |
| `addItem(spec, place?)` / `removeItem(value)` | Change the tree after instantiation, returning the added Item / whether one was removed |
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
| `align` | `object` | — | Layout per hierarchy depth (0 = top level): `'row'`/`'column'`, or `{ flow }` |
| `groupItems.toggleScope` | `'visible'\|'all'` | `'visible'` | What a group toggle affects |
| `groupItems.filterScope` | `'matching'\|'all'` | `'matching'` | What remains visible when group label matches filter |
| `filterFn` | `(item, query) => boolean` | — | Custom matcher replacing the built-in label match |

### Layout per level

`align` sets the flow for each hierarchy depth. Depths are zero-based: `0` is the top-level item list, `1` is the children of a top-level group, and so on. Unlisted depths lay out in a column. Row levels are navigated with `ArrowLeft`/`ArrowRight`; columns use `ArrowUp`/`ArrowDown`.

```js
const facade = new MSelectFacade(host, {
  items,
  options: {
    align: {
      1: 'row', // group children in a row
      2: { flow: 'row' }, // and their children too
    },
  },
});
```

### Custom filtering

By default an item matches when its `label` contains the query, case-insensitively. `filterFn` replaces that decision. It is called with the internal `Item` (read `label`, `value`, position in the tree) and the query exactly as typed, and is asked about groups too — a group that matches reveals its children per `groupItems.filterScope`. An empty query always shows every item and does not call the function.

```js
const synonyms = { paris: ['france', 'fr'], london: ['uk', 'england'] };
const facade = new MSelectFacade(host, {
  items,
  options: {
    filterFn: (item, query) => {
      const q = query.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        (synonyms[item.value] || []).some((word) => word.includes(q))
      );
    },
  },
});

// Replace it at runtime, or drop back to the built-in label match.
facade.filterFn = (item, query) => item.value.startsWith(query);
facade.filterFn = null;
```

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

### Changing the tree at runtime

`setItems` instantiates the tree once; after that, `addItem`/`removeItem` adjust it.
The place is given by value, so no internal object crosses the API.

```js
facade.addItem({ value: 'paris', label: 'Paris' }, { parent: 'cities' });
facade.addItem({ value: 'lyon', label: 'Lyon' }, { parent: 'cities', before: 'oslo' });
facade.removeItem('oslo'); // the subtree and its chips go with it
```

An added item obeys the query and the selected-items restriction that are active
when it arrives; a removed item takes its chips with it and the change is
reported once. A duplicate value, or a place naming no item, a non-group parent,
or another parent's child, throws before anything is attached.

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
| **Filter** | Type to filter; every query change moves the Current marker to the first selectable match (a group header is skipped, and a query matching nothing clears the marker). `ArrowDown` opens dropdown and navigates. `ArrowLeft` on empty query enters Chip/Collapsed mode. `Backspace` at start removes rightmost chip. `Enter` toggles current item and clears filter. `Escape` closes an open dropdown; pressed again with it closed, it clears the query. |
| **Dropdown** | `ArrowUp/Down/Left/Right` navigate hierarchy (direction depends on level layout). `Home/End/PageUp/PageDown` move within level. `Space` toggles current item (stays open). `Enter` toggles and closes dropdown. `Ctrl-A` performs Select All while that button is visible. `Escape` closes and returns to the previous mode; from Chip mode it returns to Filter when the current item is not selected, and from Collapsed mode it always returns to Filter. |
| **Chip** | `ArrowLeft/Right` navigate chips. `Delete`/`Backspace` remove chips. `ArrowDown` opens dropdown. `ArrowRight` at end returns to Filter. |
| **Collapsed** | Navigate collapsed summary. `ArrowDown` opens restricted dropdown of selected items. `ArrowRight` returns to Filter. |

Clicking the Selection Box outside a chip or button toggles the dropdown. While the dropdown is open, `Tab` and `Shift+Tab` are consumed so focus stays in the control; close it with `Escape`, `Enter`, or by clicking the Selection Box again.

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
│   ├── m-select-element.js   # <m-select> custom element wrapper
│   ├── modes.js              # Mode definitions and handlers
│   └── m-select.css
├── test/                     # one file per area (see Testing)
│   ├── 01_items-and-selection.test.js
│   ├── 02_m-select-facade.test.js
│   ├── 03_filtering-and-groups.test.js … 12_selection-form-and-events.test.js
│   ├── 13_numbering-guard.test.js
│   ├── teardown.js           # destroys controls a test leaves alive
│   └── dom-stub.js           # minimal DOM stub
├── demo/
│   ├── index.html            # declarative <m-select> demo (Vite build entry)
│   └── favicon.svg
├── project/                  # Requirements, use cases, specs
└── vite.config.js
```

## Testing

Tests use Vitest with Node environment and a custom DOM stub (`test/dom-stub.js`). Run all tests:

```bash
npx vitest run
```

Current test suite: **525 tests passing** across 13 test files.

The suite is split by area: each file covers a numbered group of behaviours
(`01_items-and-selection`, `03_filtering-and-groups`, `04_chips`, `05_modes`, …),
and every `it` carries the project-wide hierarchical number
(`<describe>.<area>.<test>`). `13_numbering-guard.test.js` enforces that
convention — unique ids, correctly prefixed, files numbered without gaps — so a
new test cannot quietly reuse a number.

Every test file imports `test/teardown.js`, which destroys any control its test
left alive and fails the test if a document listener would otherwise outlive it.
Tests that build a `delayedLoad` control and never give it items destroy it
themselves, since there is nothing for the registry to observe.

## Browser Support

Modern browsers with ES module support (Chrome, Firefox, Safari, Edge). Uses standard DOM APIs and CustomEvent.

## License

See repository for license details.