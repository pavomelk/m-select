# m-select Requirements v2

> Restructured consolidation of `requirements.md` and `specification.md`.
> This document proposes a structure for further detailization.
> Every requirement carries a stable ID so it can be referenced from tests, use-cases and code.

---

## 1. Document conventions

### 1.1 Requirement ID scheme
- Each requirement is identified as `REQ-<section>-<nn>` (e.g. `REQ-3.1-01`).
- IDs are stable once assigned; content may change, IDs do not.
- Cross-references use the section number (e.g. "(see 5.1)").

### 1.2 Priority
Each requirement is tagged with one of:
- `P0` – must have for first usable version
- `P1` – should have
- `P2` – nice to have / later
- `TBD` – priority not decided yet

### 1.3 Status
Each requirement may carry a status:
- `Draft` – idea captured, needs detailization
- `Detailed` – acceptance-ready
- `Agreed` – accepted, ready for implementation
- `Implemented`

### 1.4 Glossary (terminology)
> Shared vocabulary used throughout this document. Each term should get a one-paragraph definition when detailed.

| Term | Meaning |
|---|---|
| *Control* | The whole m-select component (`combobox + listbox` extended pattern) |
| *Item* | A single selectable/visible entry in the hierarchy |
| *Group Item* | An *Item* that contains child *Items* |
| *Chip* | Visual representation of a selected *Item* inside the *Selection Box* |
| *Collapsed Chip* | A single chip summarizing the count of selected *Items* |
| *Selection Box* | Always-visible part of the *Control* |
| *Drop Down* | Collapsible part containing *Items* |
| *Filter* | Text input narrowing down the scope of shown *Items* |
| *Mode* | Current interaction mode of the *Control* |
| *Focus* | The part of the *Control* currently handling keyboard input |
| *Current* | The *Item*/*Chip* that is the live navigation target |

---

## 2. Overview

### 2.1 Purpose
- The *Control* provides the possibility to make multiple-choice selection of pre-defined options on a web page (source: `requirements.md` § Component).
- It implements an extended *combobox + listbox* pattern offering various modes of navigation and feedback.

### 2.2 Scope / non-goals
- Plain JavaScript, no frameworks, no build-time transformation or transpilation.
- Not a replacement for a full tree-widget; hierarchy is a convenience for structuring options, not the main feature. *(priority: TBD)*
- Vite is used only as dev/demo server and test runner — it must not alter served code or CSS. *(clarified in AGENTS.md)*

### 2.3 Source documents
- `requirements.md` (initial attempt)
- `specification.md` (second attempt)
- This document supersedes both as the working requirement source.

---



## 3. Component model (architecture-level requirements)





### 3.1 Lower-level parts / separation of concerns


- [ ] `REQ-3.1-01` The *Control* consists of three major parts: *Selection Box*, *Filter* and *Drop Down*. *(P0, agrees with `specification.md` line 49)*
- [ ] `REQ-3.1-02` The *Control* implements an *Items* in a tree-like data structure using the **Composite pattern** over individual *Item* objects. *(P0)*
- [ ] `REQ-3.1-03` Navigation and selection logic must be shared within the composition of *Items*. *(P0)*
- [ ] `REQ-3.1-04` An *Item* object maintains its own representation in the document as both an "*Item*" (in *Drop Down*) and a "*Chip*" (in *Selection Box*). *(P0 — see 3.3 for the Item/Chip entanglement rules)*
- [ ] `REQ-3.1-05` A *Selection Box* handles Chip interaction and also  *Filter* input object exist as distinct parts. *(P0)*
- [ ] `REQ-3.1-06` Lower-level parts must have clear separation of concerns yet be able to interact with each other. *(P1)*


### 3.2 Item model
- [ ] `REQ-3.2-01` An *Item* presents a user selection. *(P0)*
- [ ] `REQ-3.2-02` An *Item* must have a visually identifiable *Label*. *(P0)*
- [ ] `REQ-3.2-03` An *Item* can have a unique *Value*. *(P0)*
- [ ] `REQ-3.2-04` An *Item* can have child *Items*. *(P0)*
- [ ] `REQ-3.2-05` An *Item* can have a *Description* providing additional information about the item. *(P2)*
- [ ] `REQ-3.2-06` An *Item* can be in two mutually non-exclusive states: *Selected* and *Current*. *(P0)*
- [ ] `REQ-3.2-07` An *Item* can be *Hidden*. *(P0)*
- [ ] `REQ-3.2-08` An *Item* that cannot be selected must be visually identifiable as such. *(P1)*
- [ ] `REQ-3.2-09` An *Item* without a value cannot be selected. *(P0)*
- [ ] `REQ-3.2-10` An *Item* can be explicitly set to be non-selectable. *(P1)*
- [ ] `REQ-3.2-11` Every *Item* can be navigated to with mouse and keyboard. *(P0)*
- [ ] `REQ-3.2-12` An *Item* may carry a `title` property rendered as a native tooltip on both its *Item* and *Chip* DOM elements. *(P2)*
- [ ] `REQ-3.2-13` Non-mutually-exclusive states can be combined unless stated otherwise. *(P1)*
- [ ] `REQ-3.2-14` Non-selectable *Items* may be created as visible entries that cannot be selected or focused. *(P2)*

#### 3.2.1 When is a Chip shown?
- [ ] `REQ-3.2-15` An *Item* is visually represented in the *Selection Box* as a *Chip* if it is *Selected* **and** has a *Value*. *(P0)*
- [ ] `REQ-3.2-16` The above is overridden when the *Control* is in *Collapsed* mode (see 5.3): selecting an *Item* increases the count shown by the *Collapsed Chip* instead. *(P0)*

### 3.3 Group Item behavior
- [ ] `REQ-3.3-01` A *Group Item* is an *Item* that contains children; it is visually represented as a group. *(P0)*
- [ ] `REQ-3.3-02` Toggling a *Group Item* toggles its children (selection logic per the `selectVisibleOnly` option — see 6.x). *(P0)*
- [ ] `REQ-3.3-03` If all children are toggled to the same state, the *Group Item* reflects that state. *(P0)*
- [ ] `REQ-3.3-04` If some (not all) children are *Selected*, the *Group Item* visually indicates *Partial Selection*. *(P0)*
- [ ] `REQ-3.3-05` *Partial Selection* does not make the *Group Item* itself a *Selected Item*. *(P1)*
- [ ] `REQ-3.3-06` A *Group Item* can itself have a value; in that case it can be *Selected*. *(P1)*
- [ ] `REQ-3.3-07` A *Group Item* cannot be *Hidden* while at least one of its children is not *Hidden*. *(P1)*
- [ ] `REQ-3.3-08` A *Group Item* may contain nested group items; e.g. a single "master" group allowing selection of all *Items* at once. *(P2)*
- [ ] `REQ-3.3-09` A *Group Item* can align its children in a column or row, depending on options for that hierarchy level. *(P1)*

### 3.4 Item/Chip entanglement (navigation & selection unity)
> Source: `requirements.md` § around line 74.
- [ ] `REQ-3.4-01` Selecting/unselecting an *Item* and its *Chip* is always a single action, regardless of which of the two was interacted with. *(P0)*
- [ ] `REQ-3.4-02` Only one of an *Item*/*Chip* pair is the live keyboard-navigation target at a time, but the highlighted state must not be siloed to one side. *(P0)*
- [ ] `REQ-3.4-03` The component communicates which part (*Item* vs *Chip*, *Selection Box* vs *Drop Down*) currently owns the user's attention. *(P1)*
- [ ] `REQ-3.4-04` Leaving one side (closing *Drop Down* or exiting the chips) transfers navigation context to the other side's matching representation of the same selection, instead of discarding it. *(P0)*
- [ ] `REQ-3.4-05` Having a *Selected Item* as *Current* should also be reflected on its *Chip* (and vice versa). *(P1)*

### 3.5 Chips
- [ ] `REQ-3.5-01` A *Chip* visually represents a selected option in the *Selection Box*. *(P0)*
- [ ] `REQ-3.5-02` A *Chip* can have states *Current* and *Selected*. *(P0)*
- [ ] `REQ-3.5-03` A *Chip* contains a dedicated visual element ("x") for removal by mouse; removal unselects the corresponding *Item*. *(P0)*
- [ ] `REQ-3.5-04` Two separate mouse click areas on a *Chip*: the "x" removes/unselects; clicking anywhere else marks it *Current* and enters Chip Navigation Mode without removing it. *(P0)*
- [ ] `REQ-3.5-05` *Chips* are navigable with the keyboard. *(P0)*
- [ ] `REQ-3.5-06` Arrow navigation between *Chips* plus selective removal via `BackSpace` and `Delete` keys. *(P0)*
- [ ] `REQ-3.5-07` (detail) Exact keyboard behavior of *Chip* removal — to be specified in use-cases.

### 3.6 Selection Box
- [ ] `REQ-3.6-01` The *Selection Box* is the always-visible part of the *Control*. *(P0)*
- [ ] `REQ-3.6-02` It displays currently selected *Items* as *Chips*. *(P0)*
- [ ] `REQ-3.6-03` It captures focus into the *Filter*. *(P0)*
- [ ] `REQ-3.6-04` It contains a visual area to remove all selected *Items*. *(P0)*
- [ ] `REQ-3.6-05` It may "collapse" *Chips* into a single *Collapsed Chip* indicating the number of selected *Items*. *(P1)*

#### 3.6.1 Collapsed mode (`maxVisibleChips`)
- [ ] `REQ-3.6-06` Controlled by `maxVisibleChips`: while selected count ≤ `maxVisibleChips`, each selected *Item* keeps its own *Chip*. *(P1)*
- [ ] `REQ-3.6-07` When the count exceeds `maxVisibleChips`, all individual *Chips* are replaced by a single non-removable summary chip labeled "<Number> items selected". *(P1)*
- [ ] `REQ-3.6-08` `maxVisibleChips` is unset/disabled by default (no collapsing). *(P1)*
- [ ] `REQ-3.6-09` The summary *Chip* does not unselect anything itself (no "x"; keyboard removal while current is a no-op). *(P1)*
- [ ] `REQ-3.6-10` While collapsed, individual *Items* must still be unselectable via the *Drop Down*. *(P1)*
- [ ] `REQ-3.6-11` The summary *Chip* can be made *Current* and navigated to; opening the *Drop Down* while it is *Current* makes the first visible *Item* *Current* instead. *(P1)*

### 3.7 Drop Down
- [ ] `REQ-3.7-01` The *Drop Down* contains selectable *Items*. *(P0)*
- [ ] `REQ-3.7-02` It appears/disappears depending on user actions. *(P0)*
- [ ] `REQ-3.7-03` It supports arrow-key navigation between *Items*. *(P0)*
- [ ] `REQ-3.7-04` It must not interfere with the appearance/position of other elements on the page (including other *Control* instances); render as an overlay. *(P0)*
- [ ] `REQ-3.7-05` It limits its growth to fit an integer number of *Items* specified by an option. *(P1)*
- [ ] `REQ-3.7-06` It offers a "Select All" button (visually upper-right). *(P2)* — position statement file is incomplete at `specification.md` line 37.
- [ ] `REQ-3.7-07` It displays *Items* according to the *Filter* settings. *(P0)*
- [ ] `REQ-3.7-08` It has exactly one *Current Item*. *(P0)*
- [ ] `REQ-3.7-09` Only an *Item* that is not *Hidden* can become *Current Item*. *(P0)*
- [ ] `REQ-3.7-10` When focused, it can process commands *MoveUp, MoveDown, MoveRight, MoveLeft, Toggle*. *(P0)*
- [ ] `REQ-3.7-11` *Items* of the same hierarchy level can be arranged horizontally or vertically (default vertical). *(P1)*

### 3.8 Filter
- [ ] `REQ-3.8-01` The *Filter* is an editable element allowing text input. *(P0)*
- [ ] `REQ-3.8-02` Entered text filters the *Items* available in the *Drop Down*. *(P0)*
- [ ] `REQ-3.8-03` It is constantly present and captures focus. *(P0)*
- [ ] `REQ-3.8-04` Placeholder text configurable via option. *(P1)*
- [ ] `REQ-3.8-05` (detail) Match semantics (prefix/substring/case sensitivity, matching against label/description/value) — to be decided.

### 3.9 Focus model
- [ ] `REQ-3.9-01` Each part of the *Control* may receive mouse and keyboard input. *(P0)*
- [ ] `REQ-3.9-02` Keyboard input is received through a single element and routed to the part that currently has *Focus*. *(P0)*
- [ ] `REQ-3.9-03` Each part of the control exposes its own key-press handler. *(P1)*
- [ ] `REQ-3.9-04` (detail) Focus-traversal rules between parts — to be specified with use-cases.

### 3.10 Modes of interaction
> Source: `requirements.md` lines 18–22.
- [ ] `REQ-3.10-01` The *Control* offers a *Drop Down Mode*: user selects *Items* by navigating the *Drop Down* (open). *(P0)*
- [ ] `REQ-3.10-02` A *Filter Mode*: user types to narrow down selection scope (open). *(P0)*
- [ ] `REQ-3.10-03` A *Chip Mode*: user navigates *Chips* (open or closed). *(P0)*
- [ ] `REQ-3.10-04` A *Collapsed Mode*: user navigates *Items* when a *Collapsed Chip* is present (open or closed). *(P1)*
- [ ] `REQ-3.10-05` (detail) Each mode's entry/exit rules and allowed commands — to be specified in use-cases.

---

## 4. Visual feedback / state styling
- [ ] `REQ-4-01` The *Control* gives distinguishable visual feedback about the state of each part. *(P0)*
- [ ] `REQ-4-02` The *Selection Box* can be *In Focus* or not. *(P0)*
- [ ] `REQ-4-03` The *Chip Section* can be *In Focus* or not. *(P0)*
- [ ] `REQ-4-04` A *Chip* can be `[CurrentChip, SelectedChip, Chip]`, or shown as *Collapsed Chip* (selected/not). *(P0)*
- [ ] `REQ-4-05` The *Filter* text input can be *In Focus* or not; blinks a cursor when in focus. *(P0)*
- [ ] `REQ-4-06` The *Remove All* button can be *In Focus* or not. *(P1)*
- [ ] `REQ-4-07` The *Drop Down* can be *In Focus* or not. *(P1)*
- [ ] `REQ-4-08` *Items* can be `Current`, `Selected`, `Selectable`, `GroupItem`, `PartiallySelected`. *(P0)*
- [ ] `REQ-4-09` *Items* and *Chips* share common style/visual language unless a justified difference exists; each state must be clearly distinguishable. *(P1)*
- [ ] `REQ-4-10` Chip "x" removal element visually similar to "x". *(P1)*
- [ ] `REQ-4-11` Selected *Items* show a "tick"; partial selection uses the same tick at reduced opacity. *(P1)*
- [ ] `REQ-4-12` *Current Item* is visually distinguishable. *(P1)*
- [ ] `REQ-4-13` CSS class prefix `cm-`; style variables for border, spacing, selected/current/inactive colors. *(P1, from AGENTS.md)*

---

## 5. Configuration options
> Each option needs: name, type, default value, effect, and interplay with other options (esp. filter-related toggles).
- [ ] `REQ-5-01` Placeholder text for the *Filter* input. *(P1)*
- [ ] `REQ-5-02` *Chip* placement order: alphabetical / selection order / *Drop Down* order. *(P1)*
- [ ] `REQ-5-03` Maximum *Drop Down* unfold height, specified in Item heights. *(P1)*
- [ ] `REQ-5-04` Alignment of items per level (horizontal/vertical). *(P1)*
- [ ] `REQ-5-05` `selectVisibleOnly` — when filtering, toggling a *Group Item* toggles only the visible (matching) children OR all children regardless of visibility. *(P0)*
- [ ] `REQ-5-06` Child-reveal scope when a *Group Item* matches filter: all children considered matching, or only children that also match. *(P0)*
- [ ] `REQ-5-07` `maxVisibleChips` — threshold for *Collapsed Chip* (default disabled). *(P1)*
- [ ] `REQ-5-08` Log level for the built-in logger. *(P1)*
- [ ] `REQ-5-09` Options readable from `data-*` attributes and/or JS parameters. *(P0)*
- [ ] `REQ-5-10` (detail) Every option's accepted values to be enumerated here.

---

## 6. Programmatic API & events
- [ ] `REQ-6-01` The *Control* can be configured programmatically and updated at runtime. *(P0)*
- [ ] `REQ-6-02` Its values are submittable through form data. *(P0)*
- [ ] `REQ-6-03` Selection can be specified programmatically. *(P0)*
- [ ] `REQ-6-04` The component fires events when its state changes; events provide hooks (e.g. for navigation hints). *(P0)*
- [ ] `REQ-6-05` Events are fired on basic user actions: toggle, leave, opening the *Drop Down*, etc. *(P0)*
- [ ] `REQ-6-06` API provides methods to remove *Items* and to add them back at any place in the existing hierarchy. *(P0)*
- [ ] `REQ-6-07` The component respects the order of *Items* as created/passed during instantiation. *(P0)*
- [ ] `REQ-6-08` (detail) Event names, payloads, and method signatures to be listed here.

---

## 7. Instantiation & integration
- [ ] `REQ-7-01` Multiple *Control* instances can coexist on one page. *(P0)*
- [ ] `REQ-7-02` Each instance can instantiate itself as a child of a specified DOM element. *(P0)*
- [ ] `REQ-7-03` *Items* can be created at runtime or at instantiation from a JSON structure. *(P0)*
- [ ] `REQ-7-04` Selection values are passed as part of form data on submit. *(P0)*
- [ ] `REQ-7-05` `input-example.js` is used as sample item source for the demo. *(P2)*

---

## 8. Logging
- [ ] `REQ-8-01` The component ships with a simple built-in logger. *(P1)*
- [ ] `REQ-8-02` The logger supports configurable (changeable at runtime) verbosity/log levels for debugging. *(P1)*
- [ ] `REQ-8-03` (detail) Levels, API (`log.info/debug/...`), default level, and how it is wired to the `logLevel` option — to be specified.

---

## 9. Non-functional requirements
- [ ] `REQ-9-01` Vanilla JavaScript, no frameworks in production code. *(P0)*
- [ ] `REQ-9-02` No dependencies in production code unless strictly necessary. *(P0)*
- [ ] `REQ-9-03` No minification, transpiling, or any transformation of code/CSS served to the demo. *(P0)*
- [ ] `REQ-9-04` → *Accessibility*: keyboard-only usage must be fully possible (all modes). *(P1)*
- [ ] `REQ-9-05` → *Performance*: reasonable behavior with hundreds of items (define benchmark target later). *(P2)*
- [ ] `REQ-9-06` → *Browser support*: to be defined. *(TBD)*
- [ ] `REQ-9-07` → *Screen reader* roles/announcements (ARIA) to be specified. *(P2)*

---

## 10. Testing requirements
- [ ] `REQ-10-01` Unit tests via Vitest with happy-dom. *(P0)*
- [ ] `REQ-10-02` "Write test first" approach. *(P0)*
- [ ] `REQ-10-03` Hierarchical test numbering (scheme to be clarified). *(P0)*
- [ ] `REQ-10-04` (detail) Per-mode and per-option test matrices to be added here.

---

## 11. Open questions / items to detail
> Everything marked *(TBD)* or *(detail)* above, plus:
- Incomplete sentences to interpret:
  - `requirements.md` line 16: "Items should …" (cut off)
  - `requirements.md` line 125: Chip visuals end with "In this case," (cut off)
  - `specification.md` line 37: "Select All" button position (cut off)
  - `specification.md` line 64: "*Item* should have its visual representation in *Drop Down* and …" (cut off)
- Exact definition of *Focus* traversal into/out of each *Mode*.
- Filter match semantics (3.8).
- The precise behavior of `selectVisibleOnly` interplay with child-reveal scope (5.5/5.6).
- Whether "Select All" is a distinct command from toggling the master group (3.7.6 vs 3.3.8).
- ARIA roles and announcement behavior (9.7).