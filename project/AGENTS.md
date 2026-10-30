# Agent Rules

## Development principles
- Use vanilla JavaScript for production code. No frameworks.
- Avoid dependencies in production code unless strictly necessary.
- Keep source code vanilla: avoid post-processing such as minification, transpiling, or any other transformation of code or CSS that runs on the demo.
- Use "write test first" approach.
- Keep code as structured as possible.
- Maintain JSDoc comments in the code.
- The component must ship with a simple built-in logger that supports configurable log levels for debugging purposes.

## Demo
- Maintain a live demo of the component in demo/index.html.
- Vite is used ONLY as a dev server for the live demo (reflecting updates) and as the test runner. It must NOT modify the code or CSS that runs on the demo. Styles are served "as is", with no transformation.
- During intermediate stages, provide temporary UI elements for functionality not yet wired to the component's mouse and keyboard handling.

## Styling conventions
- Keep CSS class prefixes short. Prefix class names with "cm-".
- When composing styles, maintain CSS variables for parameters such as border, spacing between items, and colors of current/selected/inactive items.
- Exact CSS variable naming conventions and semantic tokens to be defined.

## Level of verbosity
- Maintain debug logging with changeable level of verbosity.
- Logger design details (levels, API, configuration) to be specified in requirements.md.

## Build tool
- **Vite** – dev server for the live demo (reflection of updates), Vitest test runner. Not used for minifying, transpiling, or otherwise transforming source files served to the demo.

## Language
- JavaScript

## Testing
- **Vitest** for unit tests.
- Use `environment: 'node'` with the minimal DOM stub in `test/dom-stub.js` for speed (happy-dom's import is ~15 s on this machine). Use happy-dom only if a test genuinely needs a full browser DOM.
- Maintain hierarchical test numbering:
  - Test files are numbered by area: `01_<area>.test.js`, `02_<area>.test.js`, …
  - Inside a file, `describe` levels are numbered (`1. …`, `1.1 …`, …) and each `it` gets the full hierarchical number (`1.1.1 …`).
  - Assign a new number whenever a new area or behavior is covered; never reuse a number.
  - The suite is split by topic, not kept in one big file: areas 1-5 live in `01_items-and-selection`, 6-7 in `03_filtering-and-groups`, 8-11 in `04_chips`, 12-15 in `05_modes`, 16-21 in `06_clicks-and-lifecycle`, 22-29 in `07_keyboard-chips`, 30 in `09_keyboard-collapsed`, 31-37 in `10_keyboard-dropdown`, 38-40 in `11_layout-and-structure`, 41-48 in `12_selection-form-and-events`; the facade (prefix 2) is `02`, the tree API (area 49) is `08`.
  - `test/13_numbering-guard.test.js` enforces this: unique ids across the suite, each id prefixed by its file's top-level and area numbers, no letter suffixes or deeper nesting, file prefixes unique and gapless, and each area declared once. Renumbering to fix a mistake is fine; a duplicate is not.
- Every test file imports `test/teardown.js`. It registers the controls a test constructs and destroys the ones still alive after it, then fails the test if a document listener survived — the stub document is shared by the whole file, so a leaked control answers the next test's `mousedown`/`keydown`. A `delayedLoad` control that is never given Items is not observable to the registry; tests that build one destroy it themselves.

## Code quality
- ESLint
- Prettier
- Keep code as structured as possible.

## Documentation
- project/AGENTS.md — this file
- project/requirements.md — earlier requirements, partly superseded; kept for history
- project/requirements2.md — the current requirements
- project/use-cases.md — real-world scenarios; the normative source of the mouse and keyboard interaction (REQ-7-09)
- README.md — the API reference, usage examples and test overview

## Development workflow
Before creating code:
1. Read project/requirements2.md
2. Read project/use-cases.md
3. Propose a staged implementation plan.
4. Implement the feature.
5. Add tests.
6. Update README.
7. Verify via `npx vitest run`.

## Structure
m-select/
├── src/
│   ├── main.js               (demo entry: imports the CSS, instantiates the demo facade)
│   ├── m-select.js           (the component)
│   ├── m-select-facade.js    (value-based public facade the demo and apps use)
│   ├── modes.js              (per-input-mode definitions: onEntry/onLeave/handlers)
│   └── m-select.css
├── test/
│   ├── 01_items-and-selection.test.js
│   ├── 02_m-select-facade.test.js
│   ├── 03_filtering-and-groups.test.js
│   ├── 04_chips.test.js
│   ├── 05_modes.test.js
│   ├── 06_clicks-and-lifecycle.test.js
│   ├── 07_keyboard-chips.test.js
│   ├── 08_m-select-tree-api.test.js
│   ├── 09_keyboard-collapsed.test.js
│   ├── 10_keyboard-dropdown.test.js
│   ├── 11_layout-and-structure.test.js
│   ├── 12_selection-form-and-events.test.js
│   ├── 13_numbering-guard.test.js (enforces the numbering convention)
│   ├── teardown.js           (destroys controls a test leaves alive)
│   └── dom-stub.js           (minimal DOM stub, for environment: 'node')
├── project/
│   ├── AGENTS.md
│   ├── requirements.md
│   ├── requirements2.md
│   ├── use-cases.md
│   ├── example.js
│   └── input.example.js      (the config the demo runs on)
├── demo/
│   ├── index.html            (the live demo page; the Vite build entry)
│   └── favicon.svg
├── dist/                     (build output; ignored)
├── package.json
└── vite.config.js

## Open items to be clarified
- Whatever is still open lives in requirements2.md §11, not here; the requirements themselves are written (169 of them).