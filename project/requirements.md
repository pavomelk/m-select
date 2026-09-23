# Component:
Should provide possibility to make multiple-choices selection of pre-defined options on web page.
It should implement extended combobox+listbox pattern whose flexibility provides various modes of navigation and feedback.


Component should allow creation of multiple instances.
	Each instance of component should:
		- be able to instantiate itself as a child element to specified DOM element.
		- should be able to read options set as data- attributes of the element and/or in the form of javascript parameters. 
		- should have functional equivalent of placeholder text provided as an option.
		- allow configuration options to be passed during its instantiation.
		- allow Items to be created at the runtime or at the time of instantiation from json structure.
		- allow Items to be created as non-selectable entries that are visible but cannot be selected or focused.
		- should pass selection values as part of the form data on submit.

Component should support keyboard and mouse interaction as described in use case scenarios.
DropDown should not interfere with appearance of other elements on the page including other instances of the component.
Component should produce events upon basic user actions: toggle, leave, opening DropDown etc.
Component should respect order of items in which they where created or passed during instantiation.
Component should place Chips in the order specified by options: as they are being selected by user, meaning the last selected item should be added to the end of the list of Chips in Selection Box; or in order how they were defined during instantiation; or alphabetically.
Components API should provide methods for removing Items and adding them back in any place within existing Items hierarchy.
Component should support lazy loading and postpone instantiation of Items to the time of receiving focus first time.




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



# Description:

## Visual representation:

Control should consist from always visible SelectionBox and collapsible DropDown part.
DropDown should offer selection of Items which can be organized in form of forest-like hierarchy.
Items represent user selection options and if selected carry visual indication of their state and maintain their presence as Chips in SelectionBox.
SelectionBox may contain Chips related to one or more Items is that is selected. 
SelectionBox should visually indicate selection by representing selected Items in form of Chips.
SelectionBox box contains Text input whose placement follows all Chips. 
SelectionBox should contain button to clear all selection. It should be placed at the rightmost side.
Chips should be selectable by mouse click and they should contain dedicated area for being removed with the mouse click. 
Chips should be navigable with the keyboard.
Chips and Items should share visual similarities as much as possible and their difference should be justified by functional requirements.
Item's visual indication of being selected should be symbol U+2713 (✓) in front of its label. Partial selection of the GroupItem should be indicated by the same symbol but only being less opaque. Non selected Item should have space symbol as a placeholder.

Styling of parts should be customizable by use of variables. 
HTML element structure should ensure single tabstop position for the entire control.
Items and Chips should contain main uniform elements with visually similar appearance which also share common style options unless there is justified need to introduce new style. However, each state should be clearly distinguishable but have its own class in css "selected", "inactive", "unselectable", "group-item" ... 




## Lover level parts:

The Control consist three major logical parts with clear separation of concerns: SelectionBox, DropDown and Filter

SelectionBox maintains Chips handling such as:
	placement, selection, removal, navigaition etc.
	maintaining of CollapsedChip interaction

DropDown maintains aspects of displaying Items, such as:
	It manages its DOM part, including height, visibility etc.
	It maintains CurrentItem and ensures its visibility.
	Provides programmatic means to put Items into its visible area.

Filter is responsible of handling text input. 

Item maintains user selection aspects:
	It manages its own state, including its visual representation as Item View and Chip View
	It conveys and synchronizes its own state with the state of its child Item oblects.
	It interacts with its parent Item
	It handles transition of *Current* state from itself in accordance to its alinment with its peers





*Control* should offer four modes of user interaction: 
    User is selecting Items by navigating DropDown ("DropDown mode", DropDown is open)
    User is entering text to narrow down selection range of Items ("Filter mode", DropDown is open)
    User navigates Chips ("Chip mode", DropDown can be open or closed)
    User navigates Items when there is CollapsedChip ("Collapsed" mode, DropDown can be open or closed)
    
*Control* should consist of parts that maintain clear separation of concerns yet they should be able to interact with each other.
    - It should have a component *Items* which implements composition pattern of individual *Item* objects
    - *Item* object should maintain its representation in web document as "Item" and "Chip". Selection of *Item* means placement of *Chip* in *SelectionBox* and conversely unselecting *Item* removes *Chip* from the *SelectionBox*
    - *Control* should have *SelectionBox* object which should contain *Filter* element that receives text input.
	- *Filter* should be the only real *Control*'s tab stop.  
	- *SelectionBox* can hold *Chip* elements which represent the current selection. They can be navigated and removed.
	- *Control* should have *DropDown object

*Control* should provide distinguishable visual feedback about state of each of its parts.
    It should clearly distinguish the following parts and provide separate style property when active: 
        SelectionBox: Can be InFocus or not
            Chip Section: Can be InFocus or not
                Chips: can be either [CurrentChip, SelectedChip, Chip] 
                or can be displayed as CollapsedChip and then can be Selected or not
            Filter text input: Can be InFocus or not, Blinking cursor if in focus
            Remove all button: Can be InFocus or not
        DropDown: (Can be InFocus or not)
            Items: Can be Current, Selected, can be Selectable, can be GroupItem, can be Partially Selected as a Group Item. 
            Having Selected Item as Curent should also be visually represented by its Chip made visual appearance of Current and vice versa.

*Control* should provide means for programmatic interaction.
    It should support configurable options which can define details of its behaviour.
    It should provide means for being set up programmatically and to be programmatically updated at the runtime.
    Its values should be submittable through form data.
    It should be possible to specify selection programmatically.
    It should invoke events after it changes its state. The events should provide hooks for i.a. displaying hints to the user on how to navigate the control.

*Control* should offer flexibility by providing customization through the following options:
    - Placeholder text for Filter text input
    - Chip placement order (can be alphabetical, in the order they were selected or in the order their respective Items take in DropDown)
    - Maximum height to which the DropDown unfolds, should be specified in heights of Item rows.
    - Alignment of items on specific level (items on each level can be positioned horizontally or vertically towards their sibling Items)
    - Scope of child Items being toggled when their Group Item gets updated: 
        When filter is applied, toggling GroupItem can toggle either only children that match filter criteria (and are visible) 
            or all child items get toggled regardless of their current visibility in DropDown.
    - Scope of revealing child Items when their GroupItem matches filtering criteria can be one of:
        When GroupItem matches criteria, all its children are considered matching the criterion regardless of their properties.
        When GroupItem matches criteria, only children that also match the criteria are considered (become visible)
    - Maximum amount of Items that can be selected and represented by individual Chips before SelectionBox starts showing CollapsedChip which only indicates number of selected Items.
    - Log level 






*Control*'s purpose is to provide means of selecting *Items*
*Items* are pre-defined options that can be organized hierarchically in the forest-like data structure.
*Items* is implementation of Composition pattern of *Item*
*Item* must have visually identifiable *Label*
*Item* can have unique *Value* 
*Item* can have children *Items* 
*Item* can have *Description* which can be used to provide additional information about the *Item*
*Item* can be in two mutually non-exclusive states: *Selected* and *Current*. 
*Item* can be *Hidden*
*Item* can be visually represented as *GroupItem* if it contains child *Items*
*Item* can be visually represented in *SelectionBox* as *Chip* if its state is *Selected* and if it has *Value*. 
	This behaviour is ovverriden by *Control* being in *Collapsed* *Mode*. 
		In that case selecting *Item* incleases count of selected items 
		in *CollapsedChip*.(See further *SelectionBox*, *Modes*)
*GroupItem* can be used as a medium to convey actions to iths children: 
	Toggling *GroupItem* leads to toggling its children. (The logic of selection is described in *options*: selectVisibleOnly)
*GroupItem* is reflecting selection state of its children:
	Toggling all children in the same state toggles their containg *GroupItem* into the same state of selection. (Either *Selected* or not) 
	If some of children are in *Selected* state the *GroupItem* visually indicates *PartialSelection*
	*PartialSelection* does not mean *GroupItem* has properties of *Selected* *Item*
*GroupItem* itself can have value, in that case it can be *Selected*
*GroupItem* can not be *Hidden* as long as at least one of its children is not *Hidden*
*Item* without value can not be selected
*Item* can be explicitly set to not be selectable
*Item* that can not be selected should be visually identifiable as such


*Chip* is visual representation of Selected *Item* in *SelectionBox*
*Chip* can be in *Current* state which should be in sync with the state of the *Item* representation in *DropDown* 


*DropDown* contains *Items* 
*DropDown* can be *Open* in this case it becomes visible, otherwise not.
*DropDown* should appear as an overlay over rendered elements on the page and it should not interfere with positions of other elements on the page.
*DropDown* should limit its growth to fit integer number of Items specified as an option.
*DropDown* when *Open*, can have *Focus* in which case he can process commands (*MoveUp*, *MoveDown*, *MoveRight*, *MoveLeft*, *Toggle*) (See *Focus* implementation)
*DropDown* displays items according to the settings of *Filter* (See *Filter*)
*DropDown* can have one *CurrentItem*
*DropDown* has "Select All" button which is visually represented in upper right corner but its positioning shoudl not inpair width that can be taken by Items. It is desirable 
Only item that is not *Hidden* can become *CurrentItem* 
*CurrentItem* can be *Toggled*
*Items* of the same level of hierarchy can be positioned horizontally or vertically inside *DropDown*, with default being vertically (See further options)

*SelectionBox* is always visible part of control. 
*SelectionBox* displays currently selected Items in the form of Chips. 
*SelectionBox* captures focus into Filter.
*SelectionBox* contains visual area that allows removal of all selected items.
*SelectionBox* allows arrow navigation between chips and allows their selective removal using keyboard buttons "BackSpace" and "Delete" as well as mouse clicks in their dedicated area.
*SelectionBox* in *CollapsedChips* navigation mode invokes special case for keyboard navigation scenario.

