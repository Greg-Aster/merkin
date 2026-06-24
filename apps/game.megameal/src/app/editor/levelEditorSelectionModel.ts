export type LevelEditorSelectableObject = {
	readonly stableId: string;
	readonly label?: string;
	readonly category?: string;
	readonly componentNames?: readonly string[];
};

export type LevelEditorSelectionMode = "empty" | "single" | "multi";

export type LevelEditorSelectionCategorySummary = {
	readonly category: string;
	readonly count: number;
};

export type LevelEditorSelectionState<
	TObject extends LevelEditorSelectableObject = LevelEditorSelectableObject,
> = {
	readonly selectableObjects: readonly TObject[];
	readonly selectedStableIds: readonly string[];
	readonly selectedObjects: readonly TObject[];
	readonly primaryStableId: string | null;
	readonly primaryObject: TObject | null;
	readonly selectedCount: number;
	readonly mode: LevelEditorSelectionMode;
	readonly categorySummaries: readonly LevelEditorSelectionCategorySummary[];
	readonly commonComponentNames: readonly string[];
	readonly canBulkStageOperations: false;
	readonly bulkStageReason: string;
};

export function createLevelEditorSelectionState<
	TObject extends LevelEditorSelectableObject,
>(options: {
	readonly objects: readonly TObject[];
	readonly selectedStableIds?: readonly string[];
}): LevelEditorSelectionState<TObject> {
	const objectsByStableId = new Map(
		options.objects.map((object) => [object.stableId, object]),
	);
	const selectedStableIds = dedupeStableIds(
		options.selectedStableIds ?? [],
	).filter((stableId) => objectsByStableId.has(stableId));
	const selectedObjects = selectedStableIds
		.map((stableId) => objectsByStableId.get(stableId))
		.filter((object): object is TObject => object !== undefined);
	const selectedCount = selectedStableIds.length;

	return {
		selectableObjects: options.objects,
		selectedStableIds,
		selectedObjects,
		primaryStableId: selectedStableIds[0] ?? null,
		primaryObject: selectedObjects[0] ?? null,
		selectedCount,
		mode:
			selectedCount === 0 ? "empty" : selectedCount === 1 ? "single" : "multi",
		categorySummaries: summarizeSelectedCategories(selectedObjects),
		commonComponentNames: commonSelectedComponentNames(selectedObjects),
		canBulkStageOperations: false,
		bulkStageReason:
			selectedCount > 1
				? "Multi-select is editor-side selection context only until each bulk owner-write operation is contract registered."
				: "Bulk operations require more than one selected object and a registered owner-write contract.",
	};
}

export function selectLevelEditorObject<
	TObject extends LevelEditorSelectableObject,
>(options: {
	readonly state: LevelEditorSelectionState<TObject>;
	readonly stableId: string;
	readonly additive?: boolean;
}): LevelEditorSelectionState<TObject> {
	const selectedObject = options.state.selectedObjects.find(
		(object) => object.stableId === options.stableId,
	);

	if (!selectedObject) {
		const selectableObject = options.state.selectableObjects.find(
			(object) => object.stableId === options.stableId,
		);

		if (!selectableObject) {
			return options.state;
		}
	}

	if (!options.additive) {
		return createLevelEditorSelectionState({
			objects: options.state.selectableObjects,
			selectedStableIds: [options.stableId],
		});
	}

	const selectedStableIds = options.state.selectedStableIds.includes(
		options.stableId,
	)
		? options.state.selectedStableIds.filter(
				(stableId) => stableId !== options.stableId,
			)
		: [...options.state.selectedStableIds, options.stableId];

	return createLevelEditorSelectionState({
		objects: options.state.selectableObjects,
		selectedStableIds,
	});
}

export function selectLevelEditorObjects<
	TObject extends LevelEditorSelectableObject,
>(options: {
	readonly state: LevelEditorSelectionState<TObject>;
	readonly stableIds: readonly string[];
	readonly additive?: boolean;
}): LevelEditorSelectionState<TObject> {
	const selectedStableIds = options.additive
		? [...options.state.selectedStableIds, ...options.stableIds]
		: options.stableIds;

	return createLevelEditorSelectionState({
		objects: options.state.selectableObjects,
		selectedStableIds,
	});
}

function dedupeStableIds(stableIds: readonly string[]): readonly string[] {
	return [...new Set(stableIds.filter((stableId) => stableId.length > 0))];
}

function summarizeSelectedCategories(
	objects: readonly LevelEditorSelectableObject[],
): readonly LevelEditorSelectionCategorySummary[] {
	const counts = new Map<string, number>();

	for (const object of objects) {
		const category = object.category ?? "uncategorized";
		counts.set(category, (counts.get(category) ?? 0) + 1);
	}

	return [...counts.entries()]
		.map(([category, count]) => ({ category, count }))
		.sort((left, right) => left.category.localeCompare(right.category));
}

function commonSelectedComponentNames(
	objects: readonly LevelEditorSelectableObject[],
): readonly string[] {
	const firstObject = objects[0];

	if (!firstObject) {
		return [];
	}

	const commonNames = new Set(firstObject.componentNames ?? []);

	for (const object of objects.slice(1)) {
		const componentNames = new Set(object.componentNames ?? []);

		for (const name of [...commonNames]) {
			if (!componentNames.has(name)) {
				commonNames.delete(name);
			}
		}
	}

	return [...commonNames].sort((left, right) => left.localeCompare(right));
}
