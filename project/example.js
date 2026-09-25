/**
	 * Handles key input and keeps instances of  DropDown, SelectionBox and Filter 
	 * coherent depending on the mode the control is in
	 */
	class OpreationMode {
		#previous = null;
		dropDownEngaged = false;
		/**
		 * 
		 * @param {NSelectInstance} owner 
		 */
		constructor(owner){
			this.owner = owner;
		}

		get previous(){
			return this.#previous?.name; 
		}
		get current(){
			return this.#current.name;
		}

		/**
		 * funciton that is handling current key press
		 */
		set current(name) {
			if(!(this.#modes[name] && this.#modes[name].name == name)){
				throw(`Trying to switch to unexisting operation mode: ${name}`);
			}
			if(this.#current.name === name){
				return;
			}
			this.#current.onLeave();
			this.#previous = this.#current;
			this.#current = this.#modes[name];
   		    this.#current.onEntry();
			this.owner?.logger?.debug(`switched input mode to ${name}`);
			return this;
		}

		changeToPrevious(){
			this.current = this.previous;
		}
		/**
		 * Handless key press events in filtering mode. Filter mode is default selection
		 * mode where use is offered to enter filtering phrase to narrow down selection range
		 * of items or go straight to selection in DropDown mode by pressing 'ArrowDown' key.
		 * @param {string} key 
		 * @returns {OpreationMode} 
		 */
		processKey(event) {
			this.owner?.logger?.debug(`mode: ${this.#current.name} key: ${event.key}`);
			this.#current.process(event);
			return this;
		}


		#modes = {
			filter: {
						name: 'filter',
						onEntry: (event)=>{
							this.owner.filter.inputElement.focus();
							this.owner.filter.clear();
							//when coming from collapsed mode
							if(
									this.owner.selectionBox.isCollapsed()
								&&	this.#previous.name === 'dropDown'									
							){
								this.owner.selectionBox.setMaxVisibleChips
									(this.owner.options.maxVisibleChips);
							}
// 							if(this.owner.dropDown.isOpen){
// 								if(this.owner.currentItem ){
// 									this.owner.scrollCurrentIntoView();
// //									this.owner.setCurrentItem(this.owner.firstVisibleItem);
// 								} 
// 							}
						},
						onLeave: ()=>{
							
						},
						process: (event)=>{
							const key = event?.key;
							switch(key){
								case 'ArrowDown': 
									this.owner.openDropDown();
									if(!this.owner.currentItem){
										this.owner.setCurrentItem(this.owner.firstVisibleItem);
									} 
									this.current = 'dropDown';
									break;
								case 'ArrowLeft':
//console.log(`TRYING filterElement: ${this.owner.filter.inputElement.selectionStart}`);		
									const caretAtStart = 
										this.owner.filter.inputElement.selectionStart === 0
									&&	this.owner.filter.inputElement.selectionEnd === 0;
									if( caretAtStart 
										&& this.owner.selectionBox.selectedItems.size > 0) {
											if(this.owner.selectionBox.isCollapsed()){
												this.owner.chipNavigationActive = true;
//												this.owner.selectionBox?.summaryChipElement?.classList?.add('mul-chip--current');
//												if(!this.owner.dropDown.isOpen){
//													this.owner.cancelCurrent();
//												}
												this.owner.modes.current = 'collapsed'
											} else {
												const rightmost = this.owner.selectionBox.rightmostChip();
												if (rightmost) {
													this.owner.chipNavigationActive = true;
													this.owner.modes.current = 'chip';
													this.owner.setCurrentItem(rightmost);
												}
											}
											break;
										}
									return;
									break;
								case 'ArrowUp':
									break;
								case 'ArrowRight':
									return;
									break;
								case 'Backspace':
									if(this.owner.filter.inputElement.value === '') {
										if( this.owner.selectionBox.isCollapsed()){
											this.owner.removeAll();
											break;
										}
										// Plain case (use-cases.md scenario 7): removes the
										// rightmost Chip directly, no need to have entered
										// Chip Navigation Mode first.

										const rightmost = this.owner.selectionBox.rightmostChip();
										if (rightmost) {
											this.owner.selectionBox.removeSelection(rightmost);
										}
										break
									}
									return;
									break;
								case 'Escape': 
									this.owner.filter.setQuery('');
									break;
								case ' ':
								case 'Spacebar':
									return;
								default:
									return;
									break;
							}
							event?.preventDefault?.();
						}
					},
			dropDown:{
						name: 'dropDown',
						onEntry: (event)=>{

						},
						onLeave: ()=>{
							this.dropDownEngaged = false;
						},
						process: (event)=>{
							const key = event?.key;
							switch(key){
								case 'ArrowDown': 
									this.owner.moveDown();
									break;
								case 'ArrowUp':
									this.owner.moveUp();
									break;
								case 'ArrowRight':
									this.owner.moveRight();
									break;
								case 'ArrowLeft':
//if drop down was open earlier from Filter mode, but was not yet touched for navigation
//and selection is collapsed then we swithc to collapsed mode which implies displaying 
//only selected items 
//console.log(`this.dropDownEngaged: ${this.dropDownEngaged} , this.selectionBox.isCollapsed(): ${this.owner.selectionBox.isCollapsed()}, this.previousMode: ${this.#previous.name}`);
									if( !(this.dropDownEngaged)
									&&	this.#previous.name == 'filter'	
									&&	this.owner.selectionBox.isCollapsed()){
										this.owner.chipNavigationActive = true;
										this.current = 'collapsed';
									} else {
										this.owner.moveLeft();	
									}
									break;
								
								case 'Enter':
									this.owner.dropDown.close();
									this.owner.selectCurrent();
									// const sb = this.owner.selectionBox;
									// sb.setMaxVisibleChips(this.owner.options.maxVisibleChips);
									// if(this.previous === 'collapsed' 
									// 	&& this.owner.selectionBox.selectedItems.size <= this.owner.options.maxVisibleChips)
									// 	{
									// 		console.log(`is Collapsed: ${this.owner.selectionBox.isCollapsed()}`);
									// 	}
									this.current = 'filter';
									this.owner.cancelCurrent();	
									break;
									//we transfer control to 'Escape'
								case 'Escape':
									this.owner.dropDown.close();
									this.owner.cancelCurrent();
									//this.current = 'filter';
									this.changeToPrevious();
									break;
								case ' ':
								case 'Spacebar':
									if(this.owner.filter.hasSelectedOnly){
										const next = 
											this.owner.selectionBox
											.deleteSelectionAndProposeNext(this.owner.currentItem, 'asDefined');

										if(next){
											this.owner.setCurrentItem(next);
											this.owner.filter.reapply();
										} else {
											this.owner.filter.includeSelectedOnly(false);
										}
										break;
									}
									if(this.owner.currentItem){
										this.owner.selectCurrent();
									}
									break;
								default:
									return;
									break;
							}
							this.dropDownEngaged = true; 
							event?.preventDefault?.();
						}
					},
			chip: 	{
						name: 'chip',
						onEntry: (event)=>{

						},
						onLeave: ()=>{
							
						},
						process: (event)=>{
							const key = event?.key;
							switch(key){
								case 'ArrowDown': 
									if(!this.owner.dropDown.isOpen) {
										this.owner.openDropDown();
									} else {
										this.owner.chipNavigationActive = false;
				//						this.owner.dropDown.toggle(); //revisit mechanism of indicating that DropDown is in focus
										this.current = 'dropDown';
									}
									this.owner.scrollCurrentIntoView();
									break;
								case 'ArrowUp':
									break;
								case 'ArrowRight':
									// Chip render order (KEYBOARD-INTERACTION-PLAN.md
									// Stage 5), not tree order.
									const rightNeighbor = this.owner.selectionBox.neighborChip(this.owner.currentItem, 'right');
									if (rightNeighbor) {
										this.owner.setCurrentItem(rightNeighbor);
									} else {
										// Off the rightmost chip: exit back to plain
										// Filter text-edit mode, clearing the chip
										// Current highlight (use-cases.md scenario 7).
										this.owner.chipNavigationActive = false;
										this.current = 'filter'
										//this.modes.current = 'filter';
										//this.#exitChipNavigation();
									}
								

									break;
								case 'ArrowLeft': {
									const leftNeighbor = this.owner.selectionBox.neighborChip(this.owner.currentItem, 'left');
									if (leftNeighbor) {
										this.owner.setCurrentItem(leftNeighbor);
									}
								} 	break;
								case 'Delete':
									if (this.owner.currentItem) {
										const next = this.owner.selectionBox.deleteSelectionAndProposeNext(this.owner.currentItem);
										if (next) {
											this.owner.setCurrentItem(next);
										} else {
											this.owner.chipNavigationActive = false;
											this.owner.cancelCurrent();
											this.current = 'filter';
										}
									}
									break;
								case 'Backspace': {
									const leftNeighbor = this.owner.selectionBox.neighborChip(this.owner.currentItem, 'left');
									if (leftNeighbor) {
										const current = this.owner.currentItem;
										this.owner.selectionBox.removeSelection(leftNeighbor);
										
										// A Group's removal can cascade into its own
										// descendants (see `removeSelection`'s doc
										// comment) — if that swept Current itself away
										// (Current was one of that Group's children),
										// fall back to whatever chip is now rightmost,
										// or exit the mode entirely if none remain.
										
										if (!this.owner.selectionBox.selectedItems.has(current.value)) {
											const fallback = this.owner.selectionBox.rightmostChip();
											if (fallback) {
												this.owner.setCurrentItem(fallback);
											} else {
												this.owner.chipNavigationActive = false;
												this.current = 'filter';
												//this.cancelCurrent();
											}
										}
									}
								} 	break;
								case 'Enter':
									this.owner.chipNavigationActive = false;
									this.owner.cancelCurrent();
									break;
								case 'Escape':
									if(this.owner.dropDown.isOpen){
										this.owner.closeDropDown();
									} else {
										this.owner.chipNavigationActive = false;
										this.owner.cancelCurrent();
									}
									break;
								case ' ':
								case 'Spacebar':
									this.owner.chipNavigationActive = false;
									this.owner.cancelCurrent();
									return;
									break;
								default:
									if(
										typeof key === 'string' &&
										key.length === 1 &&
										!event?.ctrlKey &&
										!event?.altKey &&
										!event?.metaKey
									)
									{
										this.owner.chipNavigationActive = false;
										this.owner.cancelCurrent();
										this.current = 'filter';
										this.processKey(event);
										return;
									}
									break;
							}
							event?.preventDefault?.();
						}
					},
			collapsed:{
						name: 'collapsed',
						onEntry: (event)=>{
//console.log("ON ENTRY collapsed");				
							this.owner.filter.includeSelectedOnly(true);
							this.owner.selectionBox?.summaryChipElement?.classList?.add('mul-chip--current');
						},
						onLeave: ()=>{
//console.log(`ON LEAVE collapsed ${new Error().stack}`);
							//this.owner.filter.includeSelectedOnly(false);
							this.owner.setMaxVisibleChips(this.owner.options.maxVisibleChips);
							this.owner.selectionBox?.summaryChipElement?.classList?.remove('mul-chip--current');
						},
						process: (event)=>{
//console.log("PROCESS collapsed");				
						const key = event?.key;
						switch(key){
							case 'ArrowDown': 
								if(!this.owner.dropDown.isOpen) {
									this.owner.cancelCurrent();
									this.owner.openDropDown();
								} else {
									this.owner.chipNavigationActive = false;
									this.owner.setCurrentItem(this.owner.firstVisibleItem);

			//						this.owner.dropDown.toggle(); //revisit mechanism of indicating that DropDown is in focus
									this.current = 'dropDown';
								}
								this.owner.scrollCurrentIntoView();
								break;
							case 'ArrowUp':
								break;
							case 'ArrowRight':
								this.owner.chipNavigationActive = false;
								this.owner.cancelCurrent();
								this.current = 'filter';
								break;
							case 'Delete':
								this.owner.removeAll();
								break;
							case ' ':
							case 'Spacebar':
								break;
							case 'Escape':
								if(this.owner.dropDown.isOpen){
									this.owner.closeDropDown();
								} else {
									this.owner.chipNavigationActive = false;
									this.owner.cancelCurrent();
								}
								break;
								default:
									if(
										typeof key === 'string' &&
										key.length === 1 &&
										!event?.ctrlKey &&
										!event?.altKey &&
										!event?.metaKey
									)
									{
										this.owner.chipNavigationActive = false;
										this.owner.cancelCurrent();
										this.current = 'filter';
										this.processKey(event);
										return;
									}
								break;
							}
							event?.preventDefault?.();
						}
					}
		}
		#current = this.#modes.filter;
	}

