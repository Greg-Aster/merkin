import {
	createLevelEditorSelectionState,
	selectLevelEditorObject,
	selectLevelEditorObjects,
} from "../src/app/editor/levelEditorSelectionModel.js";
import { assertDeepEqual, assertEqual } from "./contractTestHelpers.js";

const selectableObjects = [
	{
		stableId: "portal-arena:spawn",
		label: "Player Spawn",
		category: "spawn",
		componentNames: ["Transform", "SpawnPoint"],
	},
	{
		stableId: "portal-arena:portal-a",
		label: "Portal A",
		category: "portals",
		componentNames: ["Transform", "Portal"],
	},
	{
		stableId: "portal-arena:portal-b",
		label: "Portal B",
		category: "portals",
		componentNames: ["Transform", "Portal"],
	},
	{
		stableId: "portal-arena:light-key",
		label: "Key Light",
		category: "lights",
		componentNames: ["Transform", "Light"],
	},
] as const;

const singleSelection = createLevelEditorSelectionState({
	objects: selectableObjects,
	selectedStableIds: ["portal-arena:portal-a"],
});

assertEqual(
	singleSelection.mode,
	"single",
	"Expected a one-item selection to expose single-selection mode.",
);
assertEqual(
	singleSelection.primaryStableId,
	"portal-arena:portal-a",
	"Expected the first selected stable ID to remain the primary inspector selection.",
);
assertEqual(
	singleSelection.canBulkStageOperations,
	false,
	"Expected selection state not to enable bulk owner-write operations.",
);

const additiveSelection = selectLevelEditorObject({
	state: singleSelection,
	stableId: "portal-arena:portal-b",
	additive: true,
});

assertEqual(
	additiveSelection.mode,
	"multi",
	"Expected additive selection to expose multi-selection mode.",
);
assertDeepEqual(
	additiveSelection.selectedStableIds,
	["portal-arena:portal-a", "portal-arena:portal-b"],
	"Expected additive selection to preserve order and append the selected object.",
);
assertEqual(
	additiveSelection.primaryStableId,
	"portal-arena:portal-a",
	"Expected multi-select to keep the first selected object as the primary inspector subject.",
);
assertEqual(
	additiveSelection.selectedCount,
	2,
	"Expected selectedCount to match the normalized selected object list.",
);
assertEqual(
	additiveSelection.canBulkStageOperations,
	false,
	"Expected multi-select to remain editor-side context only until bulk owner-write contracts exist.",
);
assertDeepEqual(
	additiveSelection.categorySummaries,
	[{ category: "portals", count: 2 }],
	"Expected multi-select to summarize selected object categories.",
);
assertDeepEqual(
	additiveSelection.commonComponentNames,
	["Portal", "Transform"],
	"Expected multi-select to expose common component names for a multi-object inspector summary.",
);

const toggledSelection = selectLevelEditorObject({
	state: additiveSelection,
	stableId: "portal-arena:portal-a",
	additive: true,
});

assertDeepEqual(
	toggledSelection.selectedStableIds,
	["portal-arena:portal-b"],
	"Expected additive selection to toggle an already-selected stable ID off.",
);
assertEqual(
	toggledSelection.primaryStableId,
	"portal-arena:portal-b",
	"Expected the next selected object to become primary after toggling the previous primary off.",
);

const replacedSelection = selectLevelEditorObject({
	state: additiveSelection,
	stableId: "portal-arena:light-key",
});

assertDeepEqual(
	replacedSelection.selectedStableIds,
	["portal-arena:light-key"],
	"Expected non-additive selection to replace the previous multi-selection.",
);
assertEqual(
	replacedSelection.mode,
	"single",
	"Expected replacement selection to return to single-selection mode.",
);

const normalizedSelection = createLevelEditorSelectionState({
	objects: selectableObjects,
	selectedStableIds: [
		"portal-arena:missing",
		"portal-arena:portal-b",
		"portal-arena:portal-b",
		"",
		"portal-arena:spawn",
	],
});

assertDeepEqual(
	normalizedSelection.selectedStableIds,
	["portal-arena:portal-b", "portal-arena:spawn"],
	"Expected missing, duplicate, and empty stable IDs to be removed from editor selection state.",
);
assertEqual(
	normalizedSelection.mode,
	"multi",
	"Expected normalized multi-selection to retain multi-selection mode.",
);

const marqueeReplacementSelection = selectLevelEditorObjects({
	state: singleSelection,
	stableIds: ["portal-arena:portal-b", "portal-arena:light-key"],
});

assertDeepEqual(
	marqueeReplacementSelection.selectedStableIds,
	["portal-arena:portal-b", "portal-arena:light-key"],
	"Expected projected marquee replacement to select the provided stable-ID list.",
);
assertEqual(
	marqueeReplacementSelection.primaryStableId,
	"portal-arena:portal-b",
	"Expected projected marquee replacement to keep the first stable ID as primary.",
);
assertEqual(
	marqueeReplacementSelection.canBulkStageOperations,
	false,
	"Expected projected marquee multi-select not to enable bulk owner writes.",
);
assertDeepEqual(
	marqueeReplacementSelection.categorySummaries,
	[
		{ category: "lights", count: 1 },
		{ category: "portals", count: 1 },
	],
	"Expected selection-set category summaries to cover mixed object categories.",
);
assertDeepEqual(
	marqueeReplacementSelection.commonComponentNames,
	["Transform"],
	"Expected mixed selection sets to expose only common component names.",
);

const marqueeAdditiveSelection = selectLevelEditorObjects({
	state: singleSelection,
	stableIds: ["portal-arena:portal-b", "portal-arena:spawn"],
	additive: true,
});

assertDeepEqual(
	marqueeAdditiveSelection.selectedStableIds,
	["portal-arena:portal-a", "portal-arena:portal-b", "portal-arena:spawn"],
	"Expected additive projected marquee selection to append normalized stable IDs without losing primary selection.",
);

const filteredAdditiveSelection = selectLevelEditorObjects({
	state: marqueeAdditiveSelection,
	stableIds: ["portal-arena:portal-b", "portal-arena:light-key"],
	additive: true,
});

assertDeepEqual(
	filteredAdditiveSelection.selectedStableIds,
	[
		"portal-arena:portal-a",
		"portal-arena:portal-b",
		"portal-arena:spawn",
		"portal-arena:light-key",
	],
	"Expected additive filtered outliner selection to append without duplicating stable IDs.",
);

const clearedSelection = selectLevelEditorObjects({
	state: filteredAdditiveSelection,
	stableIds: [],
});

assertEqual(
	clearedSelection.mode,
	"empty",
	"Expected clearing a selection set to return empty-selection mode.",
);
assertEqual(
	clearedSelection.primaryStableId,
	null,
	"Expected clearing a selection set to remove the primary selected object.",
);

console.log(
	"Level editor selection model contract passed: editor multi-select keeps a primary object and does not enable bulk owner writes.",
);
