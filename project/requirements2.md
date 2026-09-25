# m-select Requirements v2

> Restructured, consolidated version of `requirements.md`.
> Each requirement carries a stable ID for reference from tests, use-cases and code.

---

## 1. Document conventions

### 1.1 Requirement ID scheme
- ID: `REQ-<section>-<nn>` (e.g. `REQ-3.1-01`).
- IDs are stable once assigned.
- Cross-references use section numbers.

### 1.2 Priority
- `P0` – must have | `P1` – should have | `P2` – nice to have | `TBD` – undecided

### 1.3 Status
`Draft` → `Detailed` → `Agreed` → `Implemented`

### 1.4 Glossary
| Term | Meaning |
|---|---|
| *Selection Box* | Always-visible part of the control |
| *Drop Down* | Collapsible part containing the *Items* |
| *Item* | A selectable option / entry in the hierarchy |
| *Root Container* | The single root of the *Items* hierarchy — a separate Array-like object (not an *Item*) that is the parent of all top-level *Items* |
| *Chip* | Visual representation of a selected *Item* in the *Selection Box* |
| *Collapsed Chip* | A single chip that indicates the number of selected *Items* |
| *Filter* | Text input narrowing the scope of shown *Items* |

---

## 2. Overview / purpose
- The component provides the possibility to make multiple-choice selection of pre-defined options on a web page.
- It implements an extended combobox + listbox pattern whose flexibility provides various modes of navigation and feedback.

---

## 3. Component model

### 3.1 Architecture / lower-level parts
- [ ] `REQ-3.1-01` The component consists of an always-visible *Selection Box* and a collapsible *Drop Down*. *(P0)*
- [ ] `REQ-3.1-02` It has an *Items* component implementing the Composite pattern over individual *Item* objects. *(P0)*
- [ ] `REQ-3.1-03` Each *Item* object maintains its representation in the document as both "Item" and "Chip". *(P0)*
- [ ] `REQ-3.1-04` It has a *Selection Box* object and a *Text* input object. *(P0)*
- [ ] `REQ-3.1-05` Lower-level parts provide clear separation of concerns yet interact with each other. *(P1)*
- [ ] `REQ-3.1-06` *Items* are implemented with the Composite pattern; navigation and selection logic is shared within the composition. *(P1)*
- [ ] `REQ-3.1-07` The *Items* hierarchy is rooted in a *Root Container* — a separate Array-like object (not an *Item*) that serves as the parent of all top-level *Items*. *(P0)*
- [ ] `REQ-3.1-08` The *Root Container* is the only node without a parent; every *Item*'s parent is either the *Root Container* (top-level) or an owning *Group Item*. *(P0)*
- [ ] `REQ-3.1-09` The *Root Container* provides the owner interface its *Items* require: an `element` (the node the top-level *Item* views attach to), `depth = -1`, and array-like access (numeric keys, `length`, iteration) over its top-level *Items*. *(P0)*

### 3.2 Item
- [ ] `REQ-3.2-01` An *Item* presents a user selection. *(P0)*
- [ ] `REQ-3.2-02` *Item* states (mutually exclusive): `[unselected – selected]`. If selected → a *Chip* is placed in the *Selection Box*. *(P0)*
- [ ] `REQ-3.2-03` *Item* kinds (mutually exclusive): `Group Item` (contains children) or `Leaf Item`. *(P0)*
- [ ] `REQ-3.2-04` *Item* value (mutually exclusive): `has value` or `has no value`. An item with a value can be selected; otherwise it is visually present and, if it has children, mediates toggle action to them. *(P0)*
- [ ] `REQ-3.2-05` Non-mutually-exclusive states can be combined unless stated otherwise. *(P1)*
- [ ] `REQ-3.2-06` Every item can be navigated to with mouse and keyboard. *(P0)*
- [ ] `REQ-3.2-07` An item may optionally be given a `title` property; when present it is rendered as a native tooltip (HTML `title`) on both the *Item* DOM element and its *Chip* DOM element. Default: omitted, no tooltip. *(P2)*
- [ ] `REQ-3.2-08` *Item* `parent` is a required constructor argument, fixed at construction: the *Root Container* for top-level *Items*, an owning *Group Item* otherwise. There is no parent-less *Item* inside a component. *(P0)*
- [ ] `REQ-3.2-09` An *Item* attaches its own view into `parent.element` by itself during construction (child-side attach); the parent does not append its children. *(P0)*
- [ ] `REQ-3.2-10` *Item* depth = `parent.depth + 1`; top-level *Items* are at depth 0 because the *Root Container* reports depth −1. *(P0)*

### 3.3 Group Item
- [ ] `REQ-3.3-01` A *Group Item* contains other items (Child Items). *(P0)*
- [ ] `REQ-3.3-02` It toggles selection of the items it contains. *(P0)*
- [ ] `REQ-3.3-03` Depending on config, when filtering is applied it toggles either all items it contains or only those not filtered out. *(P0, ties to option in 5.5)*
- [ ] `REQ-3.3-04` If it has a value it is selected together with its children, otherwise it is not. *(P0)*
- [ ] `REQ-3.3-05` It can align its children in a column or row, per options for that hierarchy level. *(P1)*
- [ ] `REQ-3.3-06` It may contain nested group items; notably one "master" group can allow selection of all *Items* in the *Drop Down*. *(P2)*
- [ ] `REQ-3.3-07` Its visual representation includes a "partial selection" state for when only some of its children are selected. *(P0, sentence in source cut off — see 11)*

### 3.4 Chip
- [ ] `REQ-3.4-01` A *Chip* is the visual representation of a selected option in the *Selection Box*. *(P0)*
- [ ] `REQ-3.4-02` It can have states *Current* and *Selected*. *(P0)*
- [ ] `REQ-3.4-03` It contains a visual element for removal by mouse; removal leads to unselection of its corresponding *Item*. *(P0)*
- [ ] `REQ-3.4-04` It has two separate mouse click areas: clicking "x" removes/unselects; clicking anywhere else marks it *Current* and enters Chip Navigation Mode (as if `<ArrowLeft>` had been pressed while hovering it), without removing/unselecting. *(P0)*

### 3.5 Item/Chip entanglement
- [ ] `REQ-3.5-01` Selecting/unselecting an *Item* and its *Chip* is always the same single action, regardless of which of the two the user interacted with. *(P0)*
- [ ] `REQ-3.5-02` Only one of the two is ever the live keyboard-navigation target at a time, but the highlighted state should not be effectively siloed to one side — the component communicates which of an *Item*/*Chip* pair, and which of *Selection Box*/*Drop Down*, currently owns the user's attention. *(P0)*
- [ ] `REQ-3.5-03` Navigation lets the user move fluidly between acting on *Chips* and acting on *Items* without losing their place: leaving one side (closing *Drop Down*, or exiting the list of *Chips*) while the underlying selection is still relevant hands control to the other side's matching representation of that same selection. *(P0)*

### 3.6 Visual similarity
- [ ] `REQ-3.6-01` *Items* and *Chips* contain main uniform elements with visually similar appearance, sharing common style options unless there is justified need for a new style; each state must be clearly distinguishable. *(P1)*
- [ ] `REQ-3.6-02` *Items* and *Chips* share visual similarities as much as possible; their differences are justified by functional requirements. *(P1)*
- [ ] `REQ-3.6-03` Example state styles: "selected", "inactive", "unselectable", "group-item", … *(P2)*
- [ ] `REQ-3.6-04` *Chip* removal element is visually similar to "x". *(P1)*
- [ ] `REQ-3.6-05` Selected *Items* show a "tick"; for *Group Items*, partial selection is the same tick with reduced opacity. *(P1)*
- [ ] `REQ-3.6-06` *Current Item* is visually distinguishable. *(P1)*
- [ ] `REQ-3.6-07` *Chip Items* are navigable and visually distinguishable. *(P1)*

### 3.7 Selection Box
- [ ] `REQ-3.7-01` Always-visible part of the control. *(P0)*
- [ ] `REQ-3.7-02` Displays currently selected *Items* in the form of *Chip Items*. *(P0)*
- [ ] `REQ-3.7-03` Captures focus into the *Filter*. *(P0)*
- [ ] `REQ-3.7-04` Contains a visual area that allows removal of all selected items. *(P0)*
- [ ] `REQ-3.7-05` May "collapse" *Chips* into a single *Collapsed Chip* indicating the number of selected *Items* (details via `maxVisibleChips`):
  - If option disabled → all *Chips* are shown as usual. *(P1)*
  - If enabled by `maxVisibleChips`: individual *Chips* are shown while count ≤ `maxVisibleChips`; once count exceeds it, all are replaced by one non-removable summary chip labeled "<Number> items selected". *(P1)*
  - The summary chip has no "x" and keyboard removal while it is Current is a no-op; individual *Items* must still be unselected via the *Drop Down*. *(P1)*
  - The summary chip can still be made *Current* and navigated to, but opening the *Drop Down* while it is Current makes the first visible *Item* Current instead. *(P1)*
- [ ] `REQ-3.7-06` Allows arrow navigation between chips and selective removal via `BackSpace` and `Delete` keys, as well as mouse clicks in their dedicated removal area. *(P0)*

### 3.8 Drop Down
- [ ] `REQ-3.8-01` Contains selectable *Items*. *(P0)*
- [ ] `REQ-3.8-02` Appears and disappears depending on user actions. *(P0)*
- [ ] `REQ-3.8-03` Allows navigation between selectable *Items* with arrow keys. *(P0)*
- [ ] `REQ-3.8-04` Does not interfere with the appearance of other elements on the page, including other *Control* instances. *(P0)*

### 3.9 Filter
- [ ] `REQ-3.9-01` Editable element that allows text input. *(P0)*
- [ ] `REQ-3.9-02` Entered text is used to filter available *Items* in the *Drop Down*. *(P0)*

### 3.10 Modes of interaction
- [ ] `REQ-3.10-01` *DropDown mode* — user selects *Items* by navigating the *Drop Down* (open). *(P0)*
- [ ] `REQ-3.10-02` *Filter mode* — user enters text to narrow down the selection range (open). *(P0)*
- [ ] `REQ-3.10-03` *Chip mode* — user navigates *Chips* (open or closed). *(P0)*
- [ ] `REQ-3.10-04` *Collapsed mode* — user navigates *Items* when there is a *Collapsed Chip* (open or closed). *(P1)*
- [ ] `REQ-3.10-05` Clicking the *Filter* input enters *Filter mode* and opens the *Drop Down*; the input caret is enabled. *(P0)*
- [ ] `REQ-3.10-06` Clicking a *Chip* enters *Chip mode*, marks that *Item* *Current* (reflected in the *Drop Down* and scrolled into view) and opens the *Drop Down*; the caret is hidden. *(P0)*
- [ ] `REQ-3.10-07` Clicking the *Collapsed Chip* enters *Collapsed mode*, restricts the *Drop Down* to the selected *Items* and opens it; the caret is hidden. *(P0)*
- [ ] `REQ-3.10-08` Clicking *Remove all* clears the selection and the *Current* *Item*, enters *Filter mode* and opens the *Drop Down*. *(P0)*
- [ ] `REQ-3.10-09` Clicking elsewhere inside the *Selection Box* enters *DropDown mode* and opens the *Drop Down*. *(P0)*
- [ ] `REQ-3.10-10` Clicking outside the *Control* closes the *Drop Down*, reverts to the default *Filter mode* and hides the caret. *(P0)*
- [ ] `REQ-3.10-11` *Filter mode* is the default mode; every user action dispatches a mode change. *(P0)*
- [ ] `REQ-3.10-12` The *Modes* object is not part of the public API; tests observe mode switches through an exported symbol. *(P0)*

---

## 4. Visual feedback per part
- [ ] `REQ-4-01` The component provides distinguishable visual feedback about the state of each of its parts. *(P0)*
- [ ] `REQ-4-02` *Selection Box*: can be *InFocus* or not. *(P0)*
- [ ] `REQ-4-03` *Chip Section*: can be *InFocus* or not. *(P0)*
- [ ] `REQ-4-04` *Chips*: `CurrentChip | SelectedChip | Chip`, or displayed as *CollapsedChip* (selected or not). *(P0)*
- [ ] `REQ-4-05` *Filter* input: *InFocus* or not; blinking cursor when in focus. *(P0)*
- [ ] `REQ-4-06` *Remove all* button: *InFocus* or not. *(P1)*
- [ ] `REQ-4-07` *Drop Down*: *InFocus* or not. *(P1)*
- [ ] `REQ-4-08` *Items*: `Current | Selected | Selectable | GroupItem | PartiallySelected (as Group)`. *(P0)*
- [ ] `REQ-4-09` A *Selected Item* that is *Current* is also represented visually by its *Chip* as *Current*, and vice versa. *(P1)*

---

## 5. Configuration options
- [ ] `REQ-5-01` Placeholder text for the *Filter* input. *(P1)*
- [ ] `REQ-5-02` *Chip* placement order: alphabetical / in the order selected (last selected appended to end) / in the order their *Items* take in the *Drop Down*. *(P1)*
- [ ] `REQ-5-03` Maximum height the *Drop Down* unfolds to, specified in heights of *Item*. *(P1)*
- [ ] `REQ-5-04` Alignment of items on a specific level (each level can be horizontal or vertical toward its siblings). *(P1)*
- [ ] `REQ-5-05` Scope of child toggling when a *Group Item* is updated under filter: toggle only visible (matching) children, or all children regardless of visibility. *(P0)*
- [ ] `REQ-5-06` Scope of revealing child *Items* when a *Group Item* matches filtering: all children considered matching, or only children that also match become visible. *(P0)*
- [ ] `REQ-5-07` `maxVisibleChips` — max number of *Items* selectable and represented by individual *Chips* before a *Collapsed Chip* is shown (default: disabled). *(P1)*
- [ ] `REQ-5-08` Log level — feed for the internal logging (see 8). *(P1)*

---

## 6. Programmatic interaction
- [ ] `REQ-6-01` The component supports configurable options defining details of its behaviour. *(P0)*
- [ ] `REQ-6-02` It can be set up programmatically and updated at runtime. *(P0)*
- [ ] `REQ-6-03` Its values are submittable through form data. *(P0)*
- [ ] `REQ-6-04` Selection can be specified programmatically. *(P0)*
- [ ] `REQ-6-05` It invokes events when its state changes; events provide hooks (e.g. for hinting the user how to navigate the control). *(P0)*

---

## 7. Functional requirements
- [ ] `REQ-7-01` Multiple *Control* instances can be created. *(P0)*
- [ ] `REQ-7-02` Each instance instantiates itself as a child element of a specified DOM element. *(P0)*
- [ ] `REQ-7-03` Each instance reads options set as `data-` attributes of the element and/or as JavaScript parameters. *(P0)*
- [ ] `REQ-7-04` Each instance has a functional equivalent of placeholder text provided as an option. *(P1)*
- [ ] `REQ-7-05` Configuration options can be passed during instantiation. *(P0)*
- [ ] `REQ-7-06` *Items* can be created at runtime or at instantiation time from a JSON structure. *(P0)*
- [ ] `REQ-7-07` *Items* can be created as non-selectable entries that are visible but cannot be selected or focused. *(P2)*
- [ ] `REQ-7-08` Selection values are passed as part of the form data on submit. *(P0)*
- [ ] `REQ-7-09` The component supports keyboard and mouse interaction as described in use-case scenarios. *(P0)*
- [ ] `REQ-7-10` The *Drop Down* does not interfere with the appearance of other elements on the page, including other instances. *(P0)*
- [ ] `REQ-7-11` Events are produced upon basic user actions: toggle, leave, opening *Drop Down*, etc. *(P0)*
- [ ] `REQ-7-12` The component respects the order of *Items* in which they were created or passed during instantiation. *(P0)*
- [ ] `REQ-7-13` *Chips* are placed in the order specified by options: selection order (last selected appended to the end) / definition order / alphabetical. *(P1)*
- [ ] `REQ-7-14` The API provides methods for removing *Items* and adding them back at any place within the existing *Items* hierarchy. *(P0)*
- [ ] `REQ-7-15` **Lazy loading of Items.** The component must not instantiate the *Item* tree eagerly at construction. *Items* are instantiated upon the component receiving focus for the first time; this happens at most once per component instance (subsequent focus does not re-instantiate). *(TBD — new requirement)*
  - Cross-refs: REQ-6-04 (programmatic selection before first focus), REQ-7-06 (Items created at runtime), REQ-3.7-02 (Selection Box always visible yet Items not yet created).
  - Detail needed: see section 11.

---

## 8. Logging
- [ ] `REQ-8-01` The component includes a simple built-in logger supporting configurable/changeable log levels for debugging. *(P1, per AGENTS.md)*
- [ ] `REQ-8-02` Log level is feedable via the `logLevel` option (see 5.8). *(P1)*
- [ ] `REQ-8-03` (detail) Levels, message API, and output destination — to be specified.

---

## 9. Non-functional
- [ ] `REQ-9-01` Vanilla JavaScript, no frameworks. *(P0, per AGENTS.md)*
- [ ] `REQ-9-02` No unnecessary dependencies in production code. *(P0, per AGENTS.md)*
- [ ] `REQ-9-03` No minification, transpiling, or other transformation of code/CSS delivered to the demo. *(P0, per AGENTS.md)*
- [ ] `REQ-9-04` → *Accessibility*: full keyboard operation; remaining a11y specifics to be detailed later. *(P1)*

---

## 10. Testing
- [ ] `REQ-10-01` Vitest unit tests with happy-dom. *(P0)*
- [ ] `REQ-10-02` "Write test first" approach. *(P0)*
- [ ] `REQ-10-03` Hierarchical test numbering (scheme to be clarified later). *(P0)*

---

## 11. Open questions / items to detail
- Incomplete source sentences to interpret:
  - `requirements.md` line 16: "Items should …" — cut off.
  - `requirements.md` line 125: "…In this case," — sentence incomplete after describing partial-selection state.
- Options 5.5 / 5.6 interplay (toggle scope vs reveal scope under filtering) needs a decision matrix.
- `REQ-3.4-04` mentions `<ArrowLeft>` entering Chip Navigation Mode — confirm semantics.
- Herarchical numbering scheme for tests (TBD).
- Detailed logger design (8).
- Additional requirements promised by author ("More detailed requirements will come").
- **REQ-7-15 (lazy loading) — detail before implementing:**
  - What exactly counts as "component receiving focus": DOM `focus`/`focusin` on the control root, on the *Filter* input, or any interactive part? Does *Drop Down* opening (click on *Selection Box*) count if it happens without a prior focus event?
  - What is instantiated: only the tree of *Item* objects (model), or also the *Drop Down* DOM? Is instantiation once, or once per branch (children built when a *Group Item* is first expanded)?
  - How does the always-visible *Selection Box* display chips for pre-set values (REQ-6-04) before first focus, given chips are derived from *Items*? Options: (a) preset selection triggers instantiation, (b) chips built from raw config values until first focus, (c) no chips until first focus (likely wrong).
  - Where are programmatic calls made before first focus buffered (add/remove/select) and when are they flushed — at instantiation, or does calling them force instantiation?
  - Interaction with REQ-7-06: are runtime-added *Items* applied to the lazy structure (create-on-demand or post-instantiation), and does adding an item before first focus force instantiation?
  - Performance intent: is this for many items (avoid upfront cost on page load), or for deferred network/data source? Affects whether the source may be a lazy `resolveItems()` callback rather than a static array.