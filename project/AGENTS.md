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
- Maintain a live demo of the component in index.html.
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
- **Vitest** for unit tests, using happy-dom.
- Write Vitest tests. Use happy-dom.
- Maintain hierarchical test numbering. Numbering scheme to be clarified later.

## Code quality
- ESLint
- Prettier
- Keep code as structured as possible.

## Documentation
- README.md
- AGENTS.md
- requirements.md
- use-cases.md

## Development workflow
Before creating code:
1. Read requirements.md
2. Read use-cases.md
3. Propose a staged implementation plan.
4. Implement the feature.
5. Add tests.
6. Update README.
7. Verify via `npx vitest run`.

## Structure
m-select/
├── src/
│   ├── m-select.js
│   ├── m-select.css
├── test/
├── demo/
├── project/
├── dist/
├── index.html
├── requirements.md
├── use-cases.md
├── AGENTS.md
├── package.json
└── vite.config.js

## Open items to be clarified
- Detailed component requirements (to be added to requirements.md).
- Hierarchical test numbering scheme.