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
- [ ] `REQ-3.3-05` It can align its children in a column or row, per options for that hierarchy level: `align` is keyed by the depth of the *Items* being laid out (0 = top level), each entry taking either the shorthand `'row'`/`'column'` or an object `{ flow }`. Alignment is presentation, not behaviour: it names the axis that walks the level (`ArrowLeft`/`ArrowRight` on a row, `ArrowUp`/`ArrowDown` on a column) and leaves the other pair to change depth — it never changes *where* a movement goes, only which keys make it — see `REQ-3.11-14.1`. *(P1)*
- [ ] `REQ-3.3-06` It may contain nested group items; notably one "master" group can allow selection of all *Items* in the *Drop Down*. *(P2)*
- [ ] `REQ-3.3-07` Its visual representation includes a "partial selection" state for when only some of its children are selected. *(P0, sentence in source cut off — see 11)*

### 3.4 Chip
- [ ] `REQ-3.4-01` A *Chip* is the visual representation of a selected option in the *Selection Box*. *(P0)*
- [ ] `REQ-3.4-02` It can have states *Current* and *Selected*. *(P0)*
- [ ] `REQ-3.4-03` It contains a visual element for removal by mouse; removal leads to unselection of its corresponding *Item*. *(P0)*
- [ ] `REQ-3.4-04` It has two separate mouse click areas: clicking "x" removes/unselects; clicking anywhere else marks it *Current* and enters Chip Navigation Mode (as if `<ArrowLeft>` had been pressed while hovering it), without removing/unselecting. *(P0)*
- [ ] `REQ-3.4-05` Removing a *Current* *Chip* via its "x" hands *Current* to the *Item* that occupies the removed chip's vacated slot once the *Chip* is gone — the one that slides into it from the right, or, when the removed *Chip* was the last, the one that is then the last; the rule is identical in LTR and RTL flow. The answer is asked of the box as it stands after the removal, not of the sequence before it, so "the previous one" is only shorthand for a *Chip* that has by then become the last. Where the *Current* marker and the *Chips* answer this differently is settled by `REQ-3.11-27`. When no *Chip* is left there is no slot to fill, so the marker stays on the *Item* that was just unselected rather than being dropped; a *Group Item* carrying no value is never a *Chip*, so unselecting it as a whole vacates no slot either and likewise leaves *Current* where it is. *(P0)*
- [ ] `REQ-3.4-06` Clicking the "x" neither opens the *Drop Down* nor changes the input mode. *(P0)*

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
- [ ] `REQ-3.7-06` The *Control* sets no width of its own: it fills the width its containing element gives it, so an application can size it by styling the container. *(P1)*
- [ ] `REQ-3.7-07` The *Selection Box*'s list of *Chips* is derived from the *Items* it holds rather than tracked alongside them, so it cannot fall out of step with the box across an addition, a removal or a re-render. While the box is showing individual *Chips* that list is exactly what is rendered; while the box is collapsed it still lists the *Chips* the *Collapsed Chip* stands for, which is what lets the box expand again without rebuilding its membership. It used to be tracked, and drifted: an *Item* added while the box was collapsed left the list describing a box that no longer existed. A *Group Item* carrying no value owns no *Chip* and is left out of it. *(P1)*
- [ ] `REQ-3.7-06` Allows arrow navigation between chips and selective removal via `BackSpace` and `Delete` keys, as well as mouse clicks in their dedicated removal area. *(P0)*

### 3.8 Drop Down
- [ ] `REQ-3.8-01` Contains selectable *Items*. *(P0)*
- [ ] `REQ-3.8-02` Appears and disappears depending on user actions. *(P0)*
- [ ] `REQ-3.8-03` Allows navigation between selectable *Items* with arrow keys. *(P0)*
- [ ] `REQ-3.8-04` Does not interfere with the appearance of other elements on the page, including other *Control* instances. *(P0)*
- [ ] `REQ-3.8-05` Clicking an *Item* toggles its selection — the same single action as its *Chip* (REQ-3.5-01) — and marks it *Current*. *(P0)*
- [ ] `REQ-3.8-06` The *Drop Down* offers a *Select All* button that toggles the selection of the *visible* selectable *Items* only (including value-bearing *Groups* as units): when any of them is selected it unselects them, otherwise it selects them; *Hidden* (filtered-out) *Items* are left untouched, *Chips* always mirror the resulting selection, and the action clears the *Filter* query. *(P0)*
- [ ] `REQ-3.8-07` The *Select All* button appears only while the *Filter* query is active (non-empty text), i.e. it works together with the *Filter*; clearing the query hides it again. *(P0)*

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
- [ ] `REQ-3.10-08` Clicking *Remove all* clears the selection and the *Current* *Item*, removes every *Chip*, enters *Filter mode* and opens the *Drop Down*. *(P0)*
- [ ] `REQ-3.10-09` Clicking elsewhere inside the *Selection Box* enters *DropDown mode* and opens the *Drop Down*. *(P0)*
- [ ] `REQ-3.10-10` Clicking outside the *Control* closes the *Drop Down*, reverts to the default *Filter mode* and hides the caret. *(P0)*
- [ ] `REQ-3.10-11` *Filter mode* is the default mode; every user action dispatches a mode change. *(P0)*
- [ ] `REQ-3.10-12` The *Modes* object is not part of the public API; tests observe mode switches through an exported symbol. *(P0)*

### 3.11 Keyboard interaction
- [ ] `REQ-3.11-01` The *Control* has exactly one Tab stop: the *Filter* input. Arriving with `Tab` focuses the *Filter*; leaving with `Tab` moves out of the component. *(P0)*
- [ ] `REQ-3.11-02` The following parts are not Tab-reachable (`tabindex="-1"`): *Remove all* button, *Select All* button, and every chip "x". They remain clickable and programmatically focusable. *(P0)*
- [ ] `REQ-3.11-03` After the *Drop Down* opens, the arrow keys move a *Current* pointer between Items/Chips without moving the system focus; the *Filter* keeps the focus for the whole session. *(P0)*
- [ ] `REQ-3.11-04` Filter mode is active when the component receives focus: focusing the *Filter* enters *Filter mode* and enables the input caret. *(P0)*
- [ ] `REQ-3.11-05` In *Filter mode*, `ArrowDown` marks the first visible *Item* as *Current* when none is set (opening the *Drop Down* first when it is closed — so a closed opening and a mouse-open both reach *DropDown mode* on the first `ArrowDown` with the first visible *Item* *Current*) and enters *DropDown mode*; an existing marker is left as-is. *(P0)*
- [ ] `REQ-3.11-06` In *Filter mode*, `ArrowLeft` with an empty Filter and Chips present enters *Chip mode* marking the rightmost *Chip* *Current* (or *Collapsed mode* with the *Collapsed Chip* *Current* when the selection is collapsed); otherwise it is passed down to the input's default text-caret navigation. *(P0)*
- [ ] `REQ-3.11-07` In *Chip mode*, `ArrowLeft`/`ArrowRight` move the *Current* marker between *Chips*; `ArrowLeft` on the leftmost *Chip* is ignored, `ArrowRight` on the rightmost *Chip* marks nothing *Current*, exits to *Filter mode* and clears the marker on the *Item* and its *Chip*. *(P0)*
- [ ] `REQ-3.11-08` In *Chip mode*, editing keys behave as in text-editing insert mode: `Delete` unselects the *Current Chip* (the marker hands to the following *Chip*, or the preceding one when deleting the last), `Backspace` unselects the *Chip* left of the *Current* one and keeps the marker; with the leftmost *Chip Current* `Backspace` is ignored. *(P0)*
- [ ] `REQ-3.11-09` The *Chip* and *Collapsed* modes operate on Chips: with no Chips left they are not active and fall back to the default *Filter mode*. *(P0)*
- [ ] `REQ-3.11-20` In *Chip mode*, `ArrowDown` opens the *Drop Down* (scrolling the *Current Item* into view) while staying in *Chip mode*; a repeated `ArrowDown`, with the *Drop Down* already open, enters *DropDown mode* and leaves the *Current* marker on that same *Item*, so the list continues from the *Chip* the marker came from. *(P0)*
- [ ] `REQ-3.11-10` In *Filter mode*, `Backspace` with the caret at the text's leftmost position unselects the rightmost *Chip* and stays in *Filter mode*; anywhere else it is left to the input's default text editing. *(P0)*
- [ ] `REQ-3.11-11` `Escape` closes the *Drop Down* in every mode; in *DropDown mode* it also returns to the mode that was active before it, which is the mode the *Drop Down* was entered from (falling back to *Filter mode* with a logged warning when no previous mode is recorded, which normal flows cannot trigger). A *Drop Down* entered from *Collapsed mode* is the exception and returns to *Filter mode*: `Escape` commits nothing, and the restriction to the selected *Items* exists only so a selection the *Collapsed Chip* hides stays navigable, which a *Drop Down* on its way out no longer needs. So `Escape` drops the restriction, clears the *Current Item* and unmarks the *Collapsed Chip*. *(P0)*
- [ ] `REQ-3.11-12` In *Collapsed mode*, the *Collapsed Chip* carries the *Current* mark only while the mode is active (set on entry, cleared on leaving, including the exit to *Filter mode* on `ArrowRight`); `ArrowDown` opens the *Drop Down* restricted to the selected *Items*, and a repeated `ArrowDown` moves on to *DropDown mode* with that restriction kept, so the selected *Items* are navigable as a list. That handover also starts the *Current* mark on the first navigable *Item* of the restricted list, which no other origin's needs an `Item` to carry it in from: without it the list would open with nothing *Current* and `Space` and `Enter` would have nothing to act on. Entering the mode is likewise the end of any *Current Item* mark, which is cleared on entry rather than remembered: the *Collapsed Chip* becomes the only current part, and the mark is started afresh from the top of the restricted list each time the list is entered, so a round trip through *Collapsed mode* returns to the top instead of resuming where the mark stood. Carrying it across would mark two parts current at once - the *Collapsed Chip* and an `Item` of a list that is no longer open. *(P0)*
- [ ] `REQ-3.11-21` While the *Drop Down* is restricted to the selected *Items*, a selection change re-filters it: an *Item* that is unselected (toggled off, deleted as a *Chip*, or unselected directly) disappears from the visible list, and a newly selected one shows up. A *Group Item* qualifies through what it holds, not through its own flag, so a *Group* whose selectable children are all unselected leaves the list too. With a text query instead, a selection change does not re-apply the query, so a *Filter* still waiting on its debounce is not cut short. *(P0)*
- [ ] `REQ-3.11-22` A *Drop Down* entered from *Collapsed mode* holds an achieved collapse for as long as it is active, so unselecting *Chips* down below `maxVisibleChips` does not expand the box under the list being navigated; the hold is released when nothing is selected and when *DropDown mode* is left, and it never *creates* a collapse that was not achieved. *Collapsed mode* itself holds the same way for the duration of its own marker. The hold is implied by the mode the interaction is anchored on (`MSelect.holdsCollapse`) rather than tracked as separate state, so it cannot outlive the modes that justify it. A *Drop Down* entered any other way is not held at all, and the count alone decides — see `REQ-3.11-26`. *(P0)*
- [ ] `REQ-3.11-23` Emptying the selection returns the *Control* to its default state: *Filter mode*, the *Drop Down* no longer restricted to the selected *Items* (so every *Item* is listed again), *Current* left on the *Item* that was just unselected (it is still in the restored list, so the marker is not dropped with the restriction), the caret editable again, and no collapse held. It applies to whatever mode the emptying happened in, including a *Drop Down* left restricted by an emptied selection. *(P0)*
- [ ] `REQ-3.11-24` The *Drop Down* restricted to the selected *Items* stays restricted until nothing is selected — not merely until the count falls back to `maxVisibleChips` — and whichever way the restriction was entered from: the `ArrowDown` handover out of *Collapsed mode*, or a click on an *Item* in that list. Entering *Filter mode* is the only thing that drops it. *(P0)*
- [ ] `REQ-3.11-25` A click on an *Item* that empties the selection stays in *DropDown mode* — only the restriction is dropped — but the list it was aimed at is gone, so the *Current* marker restarts on the first navigable *Item* of the restored list instead of following the clicked one. A click that leaves the selection non-empty marks the clicked *Item* as before. *(P0)*
- [ ] `REQ-3.11-25.1` `Enter` in a *Drop Down* entered from *Collapsed mode* toggles the *Current Item*, closes the list, and then lets the *Collapsed Chip* be judged against what the toggle left behind: while the count is still above `maxVisibleChips` it returns to *Collapsed mode* with the *Current* mark back on the *Collapsed Chip*, and once the count is back within `maxVisibleChips` it ends in *Chip mode* instead, because the box is no longer collapsed and the *Collapsed Chip* has nothing left to stand for. The boundary is the same one the box itself draws, and it is deliberately not the box's `isCollapsed`, which holds an achieved collapse through a count that has come back within the limit. The *Current Chip* is the one the toggle already elected — the chip that took the vacated slot, or the one that is then last, per `REQ-3.4-05` and `REQ-3.11-27` — so `Enter` and `Space` answer the same question the same way in one *Drop Down* rather than each having a rule of its own. When what was toggled is a *Group Item* it owns no *Chip* and vacates no slot, so the marker can be left standing on an *Item* that *Chip mode* has nothing to move between; the *Chip* rule answers for it too, as the next *Chip* along the tree and the last one past them all. *(P0)*
- [ ] `REQ-3.11-26` A *Drop Down* entered from *Chip mode* imposes neither of *Collapsed mode*'s carries-over: it is not restricted to the selected *Items*, and the selection is not held collapsed. The *Collapsed Chip* and individual *Chips* there follow `maxVisibleChips` alone, so a selection within the limit is shown as individual *Chips* and only exceeding the limit collapses it — including from inside that *Drop Down*, where a selection grown past the limit collapses and falls back to individual *Chips* again once it fits. The same holds for a *Drop Down* entered from *Filter mode*. *(P0)*
- [ ] `REQ-3.11-13` Mouse interaction inside the *Control* (clicking a *Drop Down* *Item*, a *Chip*, a button) never moves the system focus away from the *Filter*: the *Filter* keeps its focus for the whole session (REQ-3.11-03) and the *Control* keeps responding to keys afterwards. *(P0)*
- [ ] `REQ-3.11-27` While the *Drop Down* is restricted to the selected *Items*, the *Current* marker never outlives the list it is marking. Unselecting the *Current Item* by `Space` moves the marker on by `nextInLevel`, so the answer is always the *Item's* next sibling, and with nothing after it the answer is the *Item* that is then the last on the axis the removed *Item* stood on. That last step is `previousInAxis`, and it is asked of the axis rather than of the level, because the two differ on a **column**: there the children of a *Group Item* share their *Group's* line, so the *Item* before the last *Group* of a level is that *Group's* last child, while on a **row** the children stand off the line and the *Group* itself is the answer. It is the same question the *Chips* are asked in `REQ-3.4-05`, and the two agree wherever both cover the *Item*. Only the fallback turns on the axis: the forward step skips the removed *Group's* own subtree on either, because toggling it settled that already. A *Group Item* is answered the same way as a leaf, and that is the point: toggling a *Group Item* is an act on the *Group Item*, so its whole subtree is already accounted for and is stepped over rather than walked into. A *Group Item* leaving the list takes its children with it — a child is visible only while every *Item* above it is — so the walk is never in fact choosing between the child and the sibling; the sibling is the answer before the question is asked. This covers the case no *Chip*-side promotion can: a valueless *Group Item* owns no *Chip*, so unselecting it used to leave the marker on an *Item* the restricted list had just stopped showing. An unrestricted list keeps the unselected *Item* visible, so the marker stays on it, and an emptied list is settled by `REQ-3.11-23` instead. *(P0)*
- [ ] `REQ-3.11-14` In *DropDown mode*, list navigation is a structural walk over the rendered, togglable *Items* in **document order**, and no *Item* is ever skipped because of how its level is laid out. Four steps are available, each decided by the *Item* alone: `next` is the first navigable child of a *Group Item*, otherwise the next sibling, bubbling out of a finished subtree to the closest ancestor that has one; `nextInLevel` is that same walk with the *Item's* own subtree stepped over; `previous` is the previous sibling, or the parent when there is none; `descend` is the first navigable child, and `parentNext` the next sibling of the closest enclosing *Item*. The walk has a mirror for the step that follows it in the other direction — `previousInAxis`, which asks the axis rather than the level, and so steps into a previous *Group* on a **column** and not on a **row** — while `previous` stays the backward step of a level, stepping out to the parent at its front. Filtered-out and non-selectable *Items* are not part of the walk and are stepped over; *Group Items* stay reachable. The keys are consumed wherever a *Current* marker exists (the *Filter* is not editable in *DropDown mode*, so there is no caret to hand them back to) and fall through when none does. With no marker set, the keys that walk a level start one, at the first or last navigable top-level *Item* per their direction. *(P0)*
- [ ] `REQ-3.11-14.1` Every level is walked by the axis its own `flow` names, and the *other* pair of arrows is the one that changes depth. The keys are therefore read against the level the marker stands on, never against the key: on a **column** level `ArrowDown` walks forward and `ArrowUp` walks back, on a **row** level `ArrowRight` does and `ArrowLeft` does, and the opposite pair changes level in both cases. Which step a key takes is decided by the pair it belongs to, not by its own name. *(P0)*
- [ ] `REQ-3.11-14.2` Walking a level is forward along it and backward along it, and neither end needs a rule of its own: backward from the first *Item* is its parent, and forward from the last is the parent's next sibling, so the keys that walk a level leave it at either end without any special case. Forward is `next` on a column and `nextInLevel` on a row — the children of a row *Item* sit off the row's own axis, so a *Group* standing in a row is a member of that row to be stepped over rather than an entrance, while the children of a column *Item* sit on that axis and are entered by the same keypress that steps forward. Backward is `previous` on both.
- [ ] `REQ-3.11-14.3` The keys **across** the level's own axis change the depth of the next *Current Item* rather than walking the level. Forwards, a *Group Item* is opened at its first navigable child and anything else steps out to the parent's next sibling — `ArrowRight` on a column level, `ArrowDown` on a row level — so a *Group* can be opened on either pair of arrows. Backwards, the marker goes to the parent — `ArrowLeft` on a column level, `ArrowUp` on a row level. At the top level there is no parent to go back to, and the forward step has nothing left to open, so both are consumed no-ops. *(P0)*
- [ ] `REQ-3.11-14.4` A key with no target leaves the *Current* marker where it is and is still consumed. `Home`/`End` and `PageDown`/`PageUp` (a page of ten) move within the marker's own level rather than over the flattened tree. *(P0)*
- [ ] `REQ-3.11-15` In *DropDown mode*, `SpaceBar` toggles the selection of the *Current Item* (a group toggles all its children) while the *Drop Down* stays open and the mode stays active; with no *Current Item* the key is consumed without effect. Unselecting a *Group Item* that carries no value vacates no *Chip* slot, so the *Current* marker stays where it is rather than being handed to a surviving *Chip*; only a *Chip* that leaves the box promotes its successor. *(P0)*
- [ ] `REQ-3.11-18` In *DropDown mode*, `Enter` toggles the selection of the *Current Item*, closes the *Drop Down* and returns to the mode that was active before it (falling back to *Filter mode* as REQ-3.11-11); with no *Current Item* it toggles nothing and still closes the *Drop Down*. *(P0)*
- [ ] `REQ-3.11-16` Clicking the *Filter* opens the *Drop Down* without setting any *Current* marker (list navigation starts only from *DropDown mode* via `ArrowDown`); clicking it again while the *Drop Down* is already open leaves any *Current* marker untouched. *(P0)*
- [ ] `REQ-3.11-17` Entering *Filter mode* clears the *Current* marker: returning to *Filter* from *DropDown mode* (`Escape`), from *Chip*/*Collapsed mode* (`ArrowRight`) or through a normalize fallback never leaves a *Chip* or *Item* marked *Current*. *(P0)*

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
- [ ] `REQ-5-04` Alignment of items on a specific level (each level can be horizontal or vertical toward its siblings). Keyed by the depth of the *Items* being laid out (0 = top level), an entry being the shorthand `'row'`/`'column'` or `{ flow }`. Alignment only selects which arrow keys walk the level; it does not decide where a movement goes — see `REQ-3.11-14`. *(P1)*
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
- [ ] `REQ-7-16` The whole *Control* is one single Tab stop (REQ-3.11): `Tab`/`Shift+Tab` enter and leave the component exactly once, focusing the *Filter*; all other interactive parts (*Remove all*, *Select All*, each chip "x") keep their click/mouse behavior and programming focus but are not Tab-reachable (`tabindex="-1"`). *(P0)*
- [ ] `REQ-7-12` The component respects the order of *Items* in which they were created or passed during instantiation. *(P0)*
- [ ] `REQ-7-13` *Chips* are placed in the order specified by options: selection order (last selected appended to the end) / definition order / alphabetical. *(P1)*
- [ ] `REQ-7-14` The API provides methods for removing *Items* and adding them back at any place within the existing *Items* hierarchy. *(P0)*
- [ ] `REQ-7-15` **Lazy loading of Items.** With `delayedLoad: true` the component constructs empty and stays empty until the application calls `setItems(specs)`; with the default `delayedLoad: false` the constructor instantiates `config.items` immediately. Instantiation happens at most once per component instance. *(P1)*
  - Cross-refs: REQ-6-04 (programmatic selection before first focus — preset `selected: true` specs re-seed the Selection Box via `setItems`), REQ-7-06 (Items created at runtime), REQ-3.7-02 (Selection Box always visible yet Items not yet created).
  - Design agreed in §11 item 1; implemented by group 21 tests.
- [ ] `REQ-7-17` `setItems(specs)` — public one-time instantiation of the whole *Item* tree. When `delayedLoad` is enabled, the component calls it never; the application calls it (typically in response to `cm-items-request`). A second call throws; later tree adjustments happen by adding/removing *Items* (REQ-7-14). It fully replaces any previous tree: rebuilds the *Drop Down*, resets the *Current* marker, and re-seeds the selection from the new specs' `selected: true` flags. *(P1)*
- [ ] `REQ-7-18` Custom events (prefix `cm-`), `CustomEvent` with `detail`, bubbled on the component root: `cm-items-request` (one-shot when the component is empty — first Filter focus, first *Drop Down* open, first toggle-all/clear-all), `cm-items-set` `{count}` (delayed flow only), `cm-dropdown-open`, `cm-dropdown-close`, `cm-mode-change` `{from, to}`. *(P1)*
- [ ] `REQ-7-19` Preset-selection safeguard: instantiating more than 50 already-selected *Items* with `maxVisibleChips` left null enforces `maxVisibleChips = 25`, so the selection collapses to the summary chip instead of flooding the DOM with hundreds of individual chips. The cap applies only at instantiation; a selection of ≤50 stays expanded. *(P1)*

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
- [ ] `REQ-9-05` → *Scale*: the *Control* is meant to be used with several thousand *Items*, so the cost of an interaction has to be judged at that size rather than at the handful a test is convenient with. A selection change made one *Item* at a time settles once; a bulk one — `toggleAll()`, `clearAll()` — settles once for the whole change rather than once per *Item* it touches, so the two differ by a factor of the number of *Items* rather than by its square. What is left out per *Item* is exactly what the settling render would redo anyway, which is why nothing has to be recomputed by hand to make up for it. *(P0)*

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
- **REQ-7-15 (lazy loading) — resolved:**
  - Trigger count: a `delayedLoad` flag (default `false`); with it enabled the component instantiates on the application's `setItems(specs)` call, typically reacting to the one-shot `cm-items-request` event. Instantiation is at most once; a second `setItems` throws.
  - Preset selection (REQ-6-04): preset `selected: true` specs re-seed the Selection Box within `setItems`, so chips appear without any prior focus. When preset selection exceeds 50 (REQ-7-19) the box collapses to the summary chip.
  - Runtime adjustments (REQ-7-06/7-14): additions/removals act on the already-instantiated tree; a future extended `setItems` capable of re-instantiation remains possible.
  - Performance intent: avoid upfront instantiation cost and enable deferred data sources (network/backend → `setItems`).