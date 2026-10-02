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
					items: [
						{ label: 'Level 2.1', value: 'l2.1' },
						{ label: 'Level 2.2', value: 'l2.2' },
						{ label: 'Level 2.3' },
						{
							label: 'Level 2.4',
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
		 * - 'unsorted': in the order the chips arrived in the SelectionBox, the most
		 *   recently selected item at the tail - so an item unselected and selected
		 *   again moves to the tail. Items selected at instantiation arrive in
		 *   definition order, so this yields the same order as 'asDefined' then.
		 * - 'asDefined': in the order items were passed in (definition/DropDown
		 *   order), i.e. by each Item's own `definitionIndex` (pre-order position
		 *   in the original tree), regardless of when each was selected.
		 * - 'alphabetical': sorted by label.
        */
        chipPlaceOrder: 'unsorted',
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
         * The level is walked by the axis this names, and the other pair of
         * arrows changes depth. A Group on a row level is a row member rather
         * than an entrance: ArrowRight/ArrowLeft walk the row - off its front end
         * onto the parent, off its back end onto the parent's next sibling -
         * while ArrowDown opens it and ArrowUp goes to the parent. On a column the
         * same roles are taken by ArrowUp/ArrowDown and ArrowLeft/ArrowRight.
         */
        align: {
			// the children of every top-level Group (Cities, Sandwich, Select All)
			// are a row; level 3 keeps its own row as well
			1: { flow: 'row' },
			3: 'row'
		},
        groupItems: {
            /**
* What a toggle reaches: whether activating a Group Item cascades to
              * every one of its children ('all') or only to the ones currently
              * visible under the active Filter query ('visible', default). Useful
              * when a filter is applied and the user means to select just the
              * Items that fit it. Does not affect a Group's own `selected`/`partial`
              * indicator, which always considers every selectable child regardless
              * of visibility. Read only when the user acts; see `filterScope` for
              * the separate decision about what filtering reveals.
              */
            toggleScope: 'visible',
            /**
             * What filtering reveals: when a Group Item's label matches the query,
             * all of its children remain visible ('all', default) or only the
             * children that match the query themselves do ('matching'). Read only
             * when the query changes; independent of `toggleScope`, so the two can
             * be combined freely - e.g. filter down with 'matching', then let a
             * toggle reach the survivors with 'visible'.
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