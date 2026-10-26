# m-select Use Cases

The situations the component exists to serve. Each scenario follows one user
session from arrival to leaving, described in the terms the user acts in. The
mouse and keyboard steps in a scenario are the contract the interaction is
specified by, so a change in behaviour is a change here first.

---

## UC-1. Searching a long list and picking several options

### The situation

An editor is tagging an article. The taxonomy is a flat list of some three
hundred topics, the editor needs to attach a handful of them, and the list is far
too long to read past the first screen. The same shape recurs wherever a form
asks for "any number of values from a list that outgrew a dropdown": assigning
skills, choosing recipients, marking inventory categories. Nobody picks all three
hundred, so what matters is finding the few they want and keeping sight of what
they already picked.

The built-in `<select multiple>` matches the wording of the requirement and
little else. It cannot be searched, it shows the selection as a highlighted row
in a scrolling box rather than in the field itself, and once it has focus the
only way out is with a mouse. The session below is the one this component has
to make work with the keyboard alone.

### Arriving

`Tab` from the previous control lands in the Filter, with the caret editable and
the Drop Down still closed. The control is a single Tab stop, so the next `Tab`
leaves it rather than stepping through the chips and the buttons inside it.
Whatever is already selected sits in the Selection Box, one Chip per selected
Item, so the field answers "what is picked" on its own.

### Narrowing

Clicking the Filter opens the Drop Down without marking anything, so a user who
only wants to look has not also moved a highlight. Typing opens the Drop Down the
moment the first character lands — changing the query is itself a wish to see the
list — and narrows it to the matches, settling the Current marker against the list
the query just produced: an Item the query still shows keeps the marker, an Item
it has just hidden cannot hold it and the marker moves to the first one still
standing, and a query that matches nothing clears the marker rather than pointing
at something off-screen.

### Entering the list

`ArrowDown` is the way in. It opens the Drop Down and enters DropDown mode in
the same press, and the press itself is read by the list: with nothing Current it
starts on the first visible Item, and with a marker the query has already left
standing it walks on from there. So the first press after typing does not spend
itself re-marking the Item the query already marked, whether the list was just
opened by a click or is being opened now after a query narrowed it. From then on
the same key simply walks, `ArrowUp` walks back.

From there the arrow keys move the Current Item and do nothing else. They are
consumed by the list rather than by the page, so walking a long list does not
scroll the document out from under the control. The system focus stays in the
Filter for the whole session, so the caret never gets in the way of the list, and
no element inside the control takes part in the Tab sequence.

### Taking options

With an Item Current, `SpaceBar` toggles it and leaves the list open, so a run
of selections is one key repeated over a walk down the list. `Enter` toggles the
Current Item, closes the Drop Down and hands the keyboard back to the Filter,
which is how a user says they are done. `Enter` commits just as well from the
Filter itself, before the user has entered the list: it toggles the Item the
query left Current, closes the Drop Down and stays in the Filter, and the key
never reaches the page, so a form around the control is not submitted by it.
`Escape` closes the Drop Down without toggling anything and returns the same way.

The mouse does the same work without the detour. Clicking an Item's row toggles
it, marks it Current and leaves the list open; clicking the "x" on a Chip removes
that selection. The row and the "x" are separate click areas, so aiming at one
never means hitting the other.

### Undoing and leaving

Removal is as cheap as selection. `ArrowLeft` with an empty Filter and something
selected moves into the Chips themselves: the rightmost Chip becomes Current, and
opening the Drop Down from there continues from that same Item rather than
restarting at the top. From there `ArrowLeft` and `ArrowRight` walk between
Chips, `Delete` removes the Current one and passes Current to the next — or to
the last, when there is no next — and `Backspace` removes the Chip to the left of
the Current one while keeping the marker where it is. `ArrowRight` on the
rightmost Chip leaves chip navigation and returns to the Filter.

"Remove all" is a single click: it clears the selection, empties the Selection
Box and reopens the Drop Down, which is the same starting position as a fresh
arrival with nothing picked.

Throughout the session the Current mark is on one part at a time — on a Chip
while the Drop Down is closed, on an Item once inside the list. The two views are
of the same Item, so the field and the list never disagree about where the user
is.

---

## UC-2. Granting rights grouped by area

### The situation

An administrator is setting a colleague's permissions. The rights belong to
areas — Reporting, Billing, Settings — and each area holds a handful of
individual rights. Granting somebody the whole of one area is the common case;
granting a single right inside an area is the other half of the job. The same
shape appears wherever options are organised into a second level and the user is
expected to work at either level: product categories in a shop, departments in an
org chart, collections in a file picker.

Two things follow from the rights being *grouped* rather than merely listed. An
area is not itself a permission — nobody is granted "Reporting", they are granted
the rights inside it — so the box of granted things is built from the leaves
alone. And an area is worth acting on as a unit, so it has to carry enough
information for the administrator to tell at a glance whether the unit is granted,
half granted, or untouched.

### Reading the areas

Each area is a row in the same list as everything else, with a tick instead of a
chip, and the tick has three states: nothing under it granted, some, or all. The
count behind it is over the whole subtree, not over what the list happens to be
showing — an area whose rights are all granted ticks as fully granted even if a
query is currently hiding some of them. That is deliberate, since the tick is the
answer to "is this area granted?", and an area that is granted should not appear
ungranted because the list is filtered.

The Selection Box is the other half of the same answer, and it is built the same
way: one chip per granted right, none for the area itself. Reading the box tells
you exactly which rights are held, and reading the ticks tells you how the areas
break down; neither ever shows a chip for an area, because there is no area to
hold.

### Acting on a whole area

Entering an area is a keypress rather than a page of its own: with the area
Current, moving right opens it at its first right underneath, and moving left
steps back out to the area itself. Then `SpaceBar` on the area grants everything
under it and leaves the list open, and repeating on a fully granted area clears
it again. The mouse does the same by clicking the area's row.

That double act — grant everything, or clear everything — is what the tick
promises, and it holds only against what the click can actually reach. With no
query on the list those are the same set and there is nothing to notice. Under a
query they can part company, and the session below is where that shows up.

### Acting under a query

The administrator is after one right and types to find it. Two separate things
happen as the query changes, and they are separate on purpose.

A match on an area keeps that area's children on screen, even the ones that do
not match themselves, so the area still reads as an area while the query is
active; an area that does not match stays on screen as long as one of its
children does, so a hit deep in the tree keeps its context. If instead the area's
children are narrowed down to the matching ones, an area that matches stops
being a shortcut to everything it contains and becomes a container for the match
alone.

Then a click is read against what is on screen, not against the whole subtree.
The area is granted what the query left visible under it and nothing else. The two
decisions are independent, and an application picks the combination it means: an
area that keeps its children under a match, together with a click that reaches
what is visible, turns a query into "grant me everything this area offers that
fits"; the same click reaching the whole subtree instead grants the area outright
however the list is filtered.

The administrator is usually better off walking in and picking the two or three
rights actually wanted, and using the area as a shortcut only when the intent
really is all of it.

### The tick and the click can disagree

One consequence is worth stating, because it looks like a fault and is not. An
area whose visible rights are all granted, but which has a right the query is
hiding and that is not granted, ticks as partial — the subtree is not complete.
Clicking it clears what is on screen rather than granting anything back, because
the click's question, "is everything I can reach granted?", is answered over the
visible rights, and there the answer is yes.

Both are right about their own question. The tick reports the subtree, the click
reports what the query leaves on screen, and a right hidden by the query belongs
to the first question only. An application that wants them to agree narrows the
children to the matches, so that the two populations coincide.

### Removing a grant

Removal works at either level too. Clicking the "x" on any chip in the Selection
Box withdraws that single right, and the area's tick moves back toward partial or
untouched as the count changes. Clearing an area wholesale is done in the list —
put Current on the area and press `SpaceBar` — because the box deliberately holds
no chip for the area to withdraw. Under a query restricted to the granted rights,
withdrawing an area takes its rights out of the list with it, since they are no
longer among the rights shown.

---

## UC-3. Walking a tree whose levels run in different directions

### The situation

Someone is picking assets for an article. The top level is a list of collections,
whose names are long and read comfortably down a column. Inside a collection the
entries are short — image names, file extensions, thumbnail labels — and laying
them out across the width shows a whole collection at a glance instead of one
screenful of it. A collection is therefore a column with a row underneath it, and
the deeper levels are rows too.

This is the ordinary reason a picker ends up with levels running in different
directions: a level is arranged for what its entries look like, and long names and
short ones want opposite arrangements. It has one consequence the user feels
constantly, and it is the subject of this scenario — the arrow keys stop meaning
what their names suggest. What a key does is decided by the level the marker is
standing on, never by the key itself.

### Getting into the list

`ArrowDown` from the Filter opens the Drop Down on the first navigable Item at
the top level. With nothing marked yet the walking keys start one: the forward key
starts at the first Item, the backward key at the last, so a user who arrives
wanting the last collection does not have to walk the whole column to reach it.
The keys that change depth have nothing to act on while the marker is unset and
are left to the text caret, as they would be in any other input.

### Walking a column

On a column, the up and down arrows walk it. Down moves to the next entry and
carries on out of the ends of any collection it descends through, so a long walk
does not stall at the bottom of a collection. Up moves back, and where there is no
earlier sibling to land on it goes to the collection itself rather than to its
first entry — which is where the user expects to be told they have come back out.

A collection on the column is also opened by the same key. Down onto a collection
enters it in one step, landing on the first entry inside it, because there is no
separate act of opening on this level: walking forward and going deeper are the
same gesture here.

### Walking a row

Inside a collection the arrangement is the other way round, so left and right walk
the row and up and down change depth. Right moves along the row, and at the far end
the walk does not stop: it carries on out of the row to the next entry at the
level above, which is the next collection along the column. Left walks back and
lands on the collection when it reaches the front of the row.

So the same right arrow that opened a collection from the column is the one that
walks along the entries inside it, and a row is not a place to get stuck in.

### The same key, two meanings

This is the part worth stating plainly, because it is the part users get wrong.
The right arrow opens a collection while the marker is on the column, walks to the
next entry while the marker is inside the collection, and does something else again
while the marker is on a leaf standing in a row — because a leaf has nothing to
open, and the key that opens on a row instead steps out to the next sibling of the
level above. The down arrow walks the column, opens a collection, and steps out
past a leaf inside a row, in the same three situations.

Nothing about the keys is inconsistent; the marker is simply somewhere else each
time. A user who watches where the highlight lands learns the arrangement
quickly, and the same holds for a picker laid out the other way round.

### Groups standing in a row

A collection appearing inside a row is a member of that row rather than a doorway
out of it. Walking along the row passes it by, and the key that opens on this
level is the one that descends into it. That keeps "what is in this row" a
question the row answers on its own, whatever happens to be nested inside it.

### Running out of list

There are very few dead ends. Entries the filter has hidden are stepped over
rather than landed on. At the far end of the whole tree the marker stays where it
is and the key is still consumed, so the last press does not fall through to the
page and scroll it. Where a key has genuinely nothing to do — the parent key at
the top level, which has no parent — it is consumed without effect rather than
being handed on.

`Home` and `End` move to the two ends of the level the marker stands in, not the
two ends of the tree, and `PageDown` and `PageUp` move a page along that level. A
long row is therefore navigable without walking it one entry at a time.

### Choosing at any depth

Choosing works the same at every level and needs no separate handling per depth. On
a leaf it toggles that leaf. On a collection it acts on everything underneath,
which is the same act as in the flat case, and the click that places the marker
does exactly what the key does. Whichever level the marker came in on, the list
behaves the same once a choice is being made.

---

## UC-4. Assigning more people than the box can show

### The situation

An editor is assigning reviewers to a story from a staff directory of some eighty
people, and ends up with nine of them assigned. Every assignee is a chip in the
field, and nine chips do not fit on one line of the form: the field wraps, grows
taller than the row it sits in, and pushes the rest of the form down. Each chip
is also a control that has to be clicked or removed one at a time, and the field
has stopped being a readable answer to "who is on this?".

The count is the problem, not the individual. A handful of chips reads as a list
of names; a dozen reads as a layout accident. So the box needs a second way of
standing for a large selection — one that says how many there are, stays one row
high, and still leads back to the people themselves.

### Standing for the selection

Past a chosen threshold, the individual chips give way to a single summary chip
reading how many are selected, and the field is one line high again however large
the selection grows. This is not a different kind of box: below the threshold
nothing changes at all, and the same chips are there as in the flat case. The
threshold is the only thing that decides, and crossing it is what swaps one
representation for the other.

The summary is deliberately not the same as the chips it replaces. It stands for
the selection as a whole rather than for anything in it, so it carries no identity
of its own, cannot be current in the way an individual chip is, and is not
something the user can remove one piece of by clicking it.

### Getting back to the people

The summary chip is the way back in, and it is a control like any other. Clicking
its body opens the list of exactly the people already assigned — the list is
restricted to them, which is the point: the things the summary stands for are the
things a user who wants to unassign somebody needs to see, and they are the ones
the list shows. Clicking its small × clears the whole assignment in one act, the
same one act the chips would take if they could be taken together.

From the keyboard, `ArrowLeft` with an empty Filter enters the same place once the
selection is collapsed, since a selection that no longer fits on the line is
navigated as one thing rather than as a list of chips.

### Working inside the collapsed selection

In this mode the summary chip is the only thing marked current, and that marking
is its own: it looks like a current chip and it moves nothing, because there is
nothing in the list for it to point at yet. Leaving the mode drops the marking,
and the next time the list is entered the current item starts afresh from the top
of the restricted list — a round trip through this mode returns to the top rather
than resuming where the mark stood.

Unselecting somebody in the list updates the number on the summary immediately, so
the count in the field is never a stale answer to "how many are assigned?". This
is also where the collapse is held: while the interaction is anchored on the
summary, the box stays collapsed even as the count drops back within the limit.
Otherwise the field would spring back to individual chips in the middle of the
edit, and the thing the user was reading from would be replaced under them. Once
the interaction is over — or the selection is emptied — the box expands on its own
terms, and the individual chips return, still in the order they arrived.

Clearing everything from inside is what a reader expects both removal keys to do
here, since there is only one thing standing in the box and both keys in the chip
navigation remove one chip. Either empties the selection, the box expands, and the
keyboard is back at the Filter — the same position as a fresh arrival, ready for
the next assignment.

### Coming back down from the list

Choosing somebody with `Enter` toggles them and closes the list, and where that
leaves the box is the interesting part. While the count is still past the
threshold the box is still collapsed, so the user comes back to the summary chip
with its marking on it, exactly where they were. Once the count has fallen within
the threshold the summary has nothing left to stand for, so the individual chips
take over and the user lands among them instead — in chip navigation, with the
chip that took the vacated slot marked current. The boundary is the one the box
itself draws rather than the count on its own, because of the hold above: a count
back within the threshold while the interaction is still anchored on the summary
does not expand the box under the user.

### Arriving with the selection already made

One case needs no user action at all. A form can arrive with a large selection
already made — an edit screen restoring a saved assignment, say — and building
several hundred chips for it would be as unwelcome as typing them would have been.
So a selection past a sensible size collapses by itself at instantiation even
when no threshold was configured for the field, while a selection of an ordinary
size is left alone. The user who opened the screen sees the count, and can go in
and deal with it, exactly as if they had built the selection themselves.