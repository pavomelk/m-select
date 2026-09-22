
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



Implementation Notes:
	*Focus*: 
		Each part of the *Control* may receive mouse input and keyboard input. 
		Keyboard input is received through a single element which is the only tab stop of the Component. 
		 and is passed for handling to the part of the *Control* which currently has *Focus*.
		For this, each part of the control exposes its own handler of key press event. 
	

