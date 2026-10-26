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

## Code quality
- ESLint
- Prettier
- Keep code as structured as possible.

## Documentation
- project/AGENTS.md — this file
- project/requirements.md — earlier requirements, partly superseded; kept for history
- project/requirements2.md — the current requirements
- project/use-cases.md — real-world scenarios; the normative source of the mouse and keyboard interaction (REQ-7-09)
- README.md — to be written (not present yet)

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
│   ├── 01_m-select.test.js   (hierarchically numbered: `describe` 1. N, `it` 1.N.M)
│   ├── 02_m-select-facade.test.js (hierarchically numbered: `describe` 2. N, `it` 2.N.M)
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
- Whatever is still open lives in requirements2.md §11, not here; the requirements themselves are written (164 of them).