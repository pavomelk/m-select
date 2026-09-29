export const inputExample = {
	items: [
		{ label: 'Alpha', value: 'alpha' },
		{ label: 'Beta', value: 'beta', selectable: 'false' },
		{ label: 'Kappa', value: 'kappa' },
		{
			label: 'Cities',
			items: [
				{ label: 'Paris', value: 'paris' },
				{ label: 'London', value: 'london' },
				{ label: 'New-York', value: 'new-york' }
			]
		},
		{
			label: 'Sandwich',
			value: 'sandwich',
			items: [
				{ label: 'Tuna', value: 'tuna' },
				{ label: 'Vegetables', value: 'just-grass' },
				{ label: 'Egg', value: 'egg' }
			]
		},
		{
			label: 'Select All',
			items: [
				{
					label: 'Level 2',
					value: 'l2',
					items: [
						{ label: 'Level 2.1', value: 'l2.1' },
						{ label: 'Level 2.2', value: 'l2.2' },
						{ label: 'Level 2.3' },
						{
							label: 'Level 2.4',
							value: 'l2.4',
							items: [
								{ label: 'Level 2.4.1', value: 'l2.4.1' },
								{ label: 'Level 2.4.2', value: 'l2.4.2' }
							]
						},
						{ label: 'Level 2.5', value: 'l2.5' }
					]
				},
				{
					label: 'Level 3',
					value: 'l3',
					items: [
						{ label: 'Level 3.1', value: 'l3.1' },
						{ label: 'Level 3.2' },
						{ label: 'Level 3.3', value: 'l3.3' }
					]
				}
			]
		}
	],
	options: {
        name: 'mselect',
        placeholder: 'Type to filter...',
        maxVisibleItems: 8,
		/**
		 * Orders the given selected items as chips, according to `chipPlaceOrder`:
		 * - 'asPicked': in the order items were selected by the user.
		 * - 'asDefined': in the order items were passed in (definition/DropDown
		 *   order), i.e. by each Item's own `definitionIndex` (pre-order position
		 *   in the original tree), regardless of when each was selected.
		 * - 'alphabetical': sorted by label.
        */
        chipPlaceOrder: 'asPicked',
        logLevel: 'silent',
        /**
         * Layout of a hierarchy level, keyed by the depth of the *Items* it holds
         * (0 = top level), so `1` describes the children of the top-level Items.
         * An entry is either the shorthand 'row'/'column' or an object
         * `{ flow }`.
         *
         * This is presentation only. The list is navigated as one structural walk
         * in document order, and `flow` just decides which arrow keys drive the
         * level: a column is walked with ArrowUp/ArrowDown and a row with
         * ArrowLeft/ArrowRight, the other two leaving the level for its parent.
         * Defaults: flow 'column'.
         *
         * A Group on a row level is a row member rather than an entrance:
         * ArrowRight/ArrowLeft walk the row - off its front end onto the parent,
         * off its back end onto the parent's next sibling - ArrowDown opens it,
         * and ArrowUp goes to the parent.
         */
        align: {
			// the children of every top-level Group (Cities, Sandwich, Select All)
			// are a row; level 3 keeps its own row as well
			1: { flow: 'row' },
			3: 'row'
		},
        groupItems: {
            /**
             * Whether toggling a Group Item cascades to every one of its children
             * ('all', default) or only to the ones currently visible under the active
             * Filter query ('visible'). Does not affect a Group's own `selected`/
             * `partial` indicator, which always considers every selectable child regardless of
             * visibility.
             */
            toggleScope: 'all',
            /**
             * When Group Item label matches filter criterion all its children remain
             * visible ('all', default) otherwise only Child Items that match 
             * filtering criteria become visible ('matching')
             */
            filterScope: 'matching',
        },
        /**
         * Maximum number of selected Items shown as their own individual Chips
         * before the SelectionBox collapses them all into a single, non-removable
         * summary Chip labeled "<Number> items selected" (requirements.md). `null`
         * (default) disables collapsing entirely. See `SelectionBox#isCollapsed`.
         */
        maxVisibleChips: 4
	}
}