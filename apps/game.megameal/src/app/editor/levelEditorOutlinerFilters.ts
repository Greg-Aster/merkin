import type { LevelEditorObjectViewStateModelObject } from "./levelEditorObjectViewStateModel.js";
import type {
	LevelEditorWorkspaceObject,
	LevelEditorWorkspaceTreeGroup,
} from "./levelEditorWorkspaceModel.js";

export type LevelEditorOutlinerCategoryFilter =
	| "all"
	| LevelEditorWorkspaceObject["category"];
export type LevelEditorOutlinerVisibilityFilter =
	| "all"
	| "source-visible"
	| "editor-visible"
	| "editor-hidden";
export type LevelEditorOutlinerLockFilter =
	| "all"
	| LevelEditorWorkspaceObject["outliner"]["lock"]["state"]
	| "editor-locked"
	| "editor-unlocked";
export type LevelEditorOutlinerPickabilityFilter =
	| "all"
	| LevelEditorWorkspaceObject["outliner"]["pickability"]["state"]
	| "editor-pickable";

export type LevelEditorOutlinerFilters = {
	readonly query: string;
	readonly category: LevelEditorOutlinerCategoryFilter;
	readonly visibility: LevelEditorOutlinerVisibilityFilter;
	readonly lock: LevelEditorOutlinerLockFilter;
	readonly pickability: LevelEditorOutlinerPickabilityFilter;
};

export function matchesLevelEditorOutlinerFilters(options: {
	readonly group: LevelEditorWorkspaceTreeGroup;
	readonly object: LevelEditorWorkspaceObject;
	readonly viewState: LevelEditorObjectViewStateModelObject;
	readonly filters: LevelEditorOutlinerFilters;
}): boolean {
	return (
		(options.filters.category === "all" ||
			options.object.category === options.filters.category) &&
		matchesVisibilityFilter(
			options.object,
			options.viewState,
			options.filters,
		) &&
		matchesLockFilter(options.object, options.viewState, options.filters) &&
		matchesPickabilityFilter(
			options.object,
			options.viewState,
			options.filters,
		) &&
		matchesSearch(options.group, options.object, options.filters.query)
	);
}

function matchesVisibilityFilter(
	object: LevelEditorWorkspaceObject,
	viewState: LevelEditorObjectViewStateModelObject,
	filters: Pick<LevelEditorOutlinerFilters, "visibility">,
): boolean {
	switch (filters.visibility) {
		case "all":
			return viewState.includedInFilteredView;
		case "source-visible":
			return (
				object.outliner.visibility.state === "visible" &&
				viewState.includedInFilteredView
			);
		case "editor-visible":
			return viewState.includedInFilteredView;
		case "editor-hidden":
			return !viewState.includedInFilteredView;
	}
}

function matchesLockFilter(
	object: LevelEditorWorkspaceObject,
	viewState: LevelEditorObjectViewStateModelObject,
	filters: Pick<LevelEditorOutlinerFilters, "lock">,
): boolean {
	switch (filters.lock) {
		case "all":
			return true;
		case "editable":
		case "cook-guarded":
		case "read-only":
			return object.outliner.lock.state === filters.lock;
		case "editor-locked":
			return viewState.locked;
		case "editor-unlocked":
			return !viewState.locked;
	}
}

function matchesPickabilityFilter(
	object: LevelEditorWorkspaceObject,
	viewState: LevelEditorObjectViewStateModelObject,
	filters: Pick<LevelEditorOutlinerFilters, "pickability">,
): boolean {
	switch (filters.pickability) {
		case "all":
			return true;
		case "projected-pickable":
		case "outliner-only":
			return object.outliner.pickability.state === filters.pickability;
		case "editor-pickable":
			return viewState.pickable;
	}
}

function matchesSearch(
	group: LevelEditorWorkspaceTreeGroup,
	object: LevelEditorWorkspaceObject,
	query: string,
): boolean {
	const normalizedQuery = query.trim().toLowerCase();

	if (normalizedQuery.length === 0) {
		return true;
	}

	const searchableText = [
		group.label,
		object.id,
		object.stableId,
		object.label,
		object.category,
		object.prefabId,
		object.sourceOwner,
		object.outliner.categoryLabel,
		object.outliner.visibility.label,
		object.outliner.lock.label,
		object.outliner.pickability.label,
		...object.outliner.objectPath,
		object.workflow.publishability,
		object.workflow.storage,
		...object.assetIds,
		...object.componentNames,
		...object.workflow.labels,
	]
		.filter((value): value is string => typeof value === "string")
		.join(" ")
		.toLowerCase();

	return searchableText.includes(normalizedQuery);
}
