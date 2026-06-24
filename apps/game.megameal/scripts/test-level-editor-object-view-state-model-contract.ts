import {
	buildLevelEditorObjectViewStateModel,
	buildLevelEditorObjectViewStateStorageKey,
	clearLevelEditorObjectIsolation,
	clearLevelEditorObjectViewStateForStableId,
	levelEditorObjectViewStateForStableId,
	parseLevelEditorObjectViewStatePersistence,
	resetLevelEditorObjectViewState,
	serializeLevelEditorObjectViewStatePersistence,
	setLevelEditorObjectIsolated,
	setLevelEditorObjectLocked,
	setLevelEditorObjectVisible,
} from "../src/app/editor/levelEditorObjectViewStateModel.js";
import type {
	LevelEditorObjectViewStateObject,
	LevelEditorObjectViewStatePatch,
} from "../src/app/editor/levelEditorObjectViewStateModel.js";
import {
	assertDeepEqual,
	assertDefined,
	assertEqual,
} from "./contractTestHelpers.js";

const objects = [
	viewStateObject("player", "projected-pickable"),
	viewStateObject("portal-arena:portal:observatory", "projected-pickable"),
	viewStateObject("observatory:terrain", "outliner-only"),
	viewStateObject("portal-arena:prop:crate", "projected-pickable"),
] satisfies readonly LevelEditorObjectViewStateObject[];

const defaultModel = buildLevelEditorObjectViewStateModel({ objects });

assertEqual(
	defaultModel.schemaVersion,
	1,
	"Expected object view-state schema version to be explicit.",
);
assertEqual(
	defaultModel.contract,
	"LevelEditorObjectViewStateModelContract",
	"Expected object view-state model to name the owning contract.",
);
assertEqual(
	defaultModel.stateSource,
	"editor-memory",
	"Expected object view-state to stay editor-memory owned.",
);
assertEqual(
	defaultModel.key,
	"stableId",
	"Expected object view-state to be keyed by stable ID.",
);
assertEqual(
	defaultModel.runtimeOwnership.editorOnly,
	true,
	"Expected object view-state to be editor-only.",
);
assertEqual(
	defaultModel.runtimeOwnership.writesRuntimeData,
	false,
	"Expected object view-state not to write runtime data.",
);
assertEqual(
	defaultModel.runtimeOwnership.writesOwnerFiles,
	false,
	"Expected object view-state not to write owner files.",
);
assertEqual(
	defaultModel.runtimeOwnership.persistsOwnerWrites,
	false,
	"Expected object view-state not to persist owner writes.",
);
assertDeepEqual(
	defaultModel.visibleStableIds,
	[
		"player",
		"portal-arena:portal:observatory",
		"observatory:terrain",
		"portal-arena:prop:crate",
	],
	"Expected all known objects to be visible by default.",
);
assertDeepEqual(
	defaultModel.pickableStableIds,
	["player", "portal-arena:portal:observatory", "portal-arena:prop:crate"],
	"Expected pickable IDs to include visible projected-pickable objects only.",
);
assertEqual(
	levelEditorObjectViewStateForStableId(defaultModel, "missing").reason,
	"Object is not present in the current editor view-state model.",
	"Expected missing stable IDs to use the model-owned fallback projection.",
);

let stateByStableId: Readonly<Record<string, LevelEditorObjectViewStatePatch>> =
	resetLevelEditorObjectViewState();
stateByStableId = setLevelEditorObjectVisible(
	stateByStableId,
	"portal-arena:prop:crate",
	false,
);
stateByStableId = setLevelEditorObjectLocked(stateByStableId, "player", true);
stateByStableId = setLevelEditorObjectIsolated(
	stateByStableId,
	"portal-arena:portal:observatory",
	true,
);
stateByStableId = setLevelEditorObjectLocked(
	stateByStableId,
	"missing:future-object",
	true,
);

const filteredModel = buildLevelEditorObjectViewStateModel({
	objects,
	stateByStableId,
});

assertEqual(
	filteredModel.hasIsolation,
	true,
	"Expected object view-state to report active isolation.",
);
assertDeepEqual(
	filteredModel.isolatedStableIds,
	["portal-arena:portal:observatory"],
	"Expected isolation to be stable-ID keyed.",
);
assertDeepEqual(
	filteredModel.visibleStableIds,
	["portal-arena:portal:observatory"],
	"Expected isolation to filter visible object IDs without owner writes.",
);
assertDeepEqual(
	filteredModel.pickableStableIds,
	["portal-arena:portal:observatory"],
	"Expected pickable IDs to respect isolation, visibility, lock state, and source pickability.",
);
assertDeepEqual(
	filteredModel.lockedStableIds,
	["player"],
	"Expected known locked IDs to be listed without including unknown future state.",
);
assertDeepEqual(
	filteredModel.hiddenStableIds,
	["portal-arena:prop:crate"],
	"Expected hidden IDs to report explicit editor-only hidden state.",
);
assertDeepEqual(
	filteredModel.unknownStateStableIds,
	["missing:future-object"],
	"Expected unknown keyed state to be reported for cleanup without affecting projections.",
);
const filteredPlayerState = assertDefined(
	filteredModel.stateByStableId.player,
	"Expected player view state to exist after normalization.",
);
const filteredCrateState = assertDefined(
	filteredModel.stateByStableId["portal-arena:prop:crate"],
	"Expected crate view state to exist after normalization.",
);
assertEqual(
	filteredPlayerState.locked,
	true,
	"Expected normalized state entries to preserve locked state by stable ID.",
);
assertEqual(
	filteredCrateState.visible,
	false,
	"Expected normalized state entries to preserve hidden state by stable ID.",
);

const playerProjection = filteredModel.objects.find(
	(object) => object.stableId === "player",
);
assertEqual(
	playerProjection?.hiddenByIsolation,
	true,
	"Expected non-isolated objects to be hidden by active isolation.",
);
assertEqual(
	playerProjection?.pickable,
	false,
	"Expected locked and isolated-away objects not to be pickable.",
);

const clearedIsolationModel = buildLevelEditorObjectViewStateModel({
	objects,
	stateByStableId: clearLevelEditorObjectIsolation(stateByStableId),
});
assertEqual(
	clearedIsolationModel.hasIsolation,
	false,
	"Expected clear isolation helper to remove isolation state.",
);
assertDeepEqual(
	clearedIsolationModel.visibleStableIds,
	["player", "portal-arena:portal:observatory", "observatory:terrain"],
	"Expected clearing isolation to restore visible, non-hidden IDs.",
);
assertDeepEqual(
	clearedIsolationModel.pickableStableIds,
	["portal-arena:portal:observatory"],
	"Expected clearing isolation to keep locked and hidden IDs out of picking.",
);

const clearedPlayerModel = buildLevelEditorObjectViewStateModel({
	objects,
	stateByStableId: clearLevelEditorObjectViewStateForStableId(
		clearLevelEditorObjectIsolation(stateByStableId),
		"player",
	),
});
assertDeepEqual(
	clearedPlayerModel.pickableStableIds,
	["player", "portal-arena:portal:observatory"],
	"Expected clearing one stable ID to restore that object's default editor view state.",
);

const resetModel = buildLevelEditorObjectViewStateModel({
	objects,
	stateByStableId: resetLevelEditorObjectViewState(),
});
assertDeepEqual(
	resetModel.visibleStableIds,
	defaultModel.visibleStableIds,
	"Expected reset helper to restore default visible object IDs.",
);
assertDeepEqual(
	resetModel.pickableStableIds,
	defaultModel.pickableStableIds,
	"Expected reset helper to restore default pickable object IDs.",
);

const serialized = serializeLevelEditorObjectViewStatePersistence({
	runtimeSceneId: "portal_arena_runtime",
	stateByStableId,
	savedAtIso: "2026-06-24T00:00:00.000Z",
});
const parsed = parseLevelEditorObjectViewStatePersistence({
	serialized,
	expectedRuntimeSceneId: "portal_arena_runtime",
});
assertEqual(
	buildLevelEditorObjectViewStateStorageKey("portal_arena_runtime"),
	"megameal:level-editor:object-view-state:v1:portal_arena_runtime",
	"Expected browser-local object view-state storage to be runtime-scene scoped.",
);
assertEqual(
	parsed.ok,
	true,
	"Expected serialized browser-local object view-state to parse.",
);
if (!parsed.ok) {
	throw new Error(parsed.reason);
}
assertEqual(
	parsed.envelope.runtimeOwnership.writesRuntimeData,
	false,
	"Expected persisted object view-state not to write runtime data.",
);
assertEqual(
	parsed.envelope.runtimeOwnership.writesOwnerFiles,
	false,
	"Expected persisted object view-state not to write owner files.",
);
assertEqual(
	parsed.envelope.runtimeOwnership.persistsOwnerWrites,
	false,
	"Expected persisted object view-state not to persist owner writes.",
);
assertDeepEqual(
	parsed.envelope.stateByStableId,
	stateByStableId,
	"Expected persisted object view-state to preserve non-default visibility, lock, and isolation state.",
);
const restoredModel = buildLevelEditorObjectViewStateModel({
	objects,
	stateByStableId: parsed.envelope.stateByStableId,
	stateSource: parsed.envelope.stateSource,
});
assertEqual(
	restoredModel.stateSource,
	"browser-local-editor-workspace",
	"Expected restored object view-state model to identify browser-local persistence.",
);
assertDeepEqual(
	restoredModel.pickableStableIds,
	filteredModel.pickableStableIds,
	"Expected restored browser-local object view-state to project the same pickability as the parsed state.",
);
const reorderedRestoredModel = buildLevelEditorObjectViewStateModel({
	objects: [
		viewStateObject("portal-arena:prop:crate", "projected-pickable"),
		viewStateObject("observatory:terrain", "outliner-only"),
		viewStateObject("portal-arena:portal:observatory", "projected-pickable"),
		viewStateObject("player", "projected-pickable"),
	],
	stateByStableId: parsed.envelope.stateByStableId,
	stateSource: parsed.envelope.stateSource,
});
assertEqual(
	levelEditorObjectViewStateForStableId(reorderedRestoredModel, "player")
		.locked,
	true,
	"Expected restored browser-local object view-state to reapply locked state by stable ID across reordered objects.",
);
assertEqual(
	levelEditorObjectViewStateForStableId(
		reorderedRestoredModel,
		"portal-arena:prop:crate",
	).visible,
	false,
	"Expected restored browser-local object view-state to reapply hidden state by stable ID across reordered objects.",
);
assertEqual(
	levelEditorObjectViewStateForStableId(
		reorderedRestoredModel,
		"portal-arena:portal:observatory",
	).isolated,
	true,
	"Expected restored browser-local object view-state to reapply isolation by stable ID across reordered objects.",
);

const staleRuntimeParse = parseLevelEditorObjectViewStatePersistence({
	serialized,
	expectedRuntimeSceneId: "observatory_runtime",
});
assertEqual(
	staleRuntimeParse.ok,
	false,
	"Expected parser to reject object view-state saved for a different runtime scene.",
);
const runtimeWritingParse = parseLevelEditorObjectViewStatePersistence({
	serialized: serialized.replace(
		'"writesRuntimeData":false',
		'"writesRuntimeData":true',
	),
	expectedRuntimeSceneId: "portal_arena_runtime",
});
assertEqual(
	runtimeWritingParse.ok,
	false,
	"Expected parser to reject persisted object view-state that claims runtime writes.",
);
const ownerFileWritingParse = parseLevelEditorObjectViewStatePersistence({
	serialized: serialized.replace(
		'"writesOwnerFiles":false',
		'"writesOwnerFiles":true',
	),
	expectedRuntimeSceneId: "portal_arena_runtime",
});
assertEqual(
	ownerFileWritingParse.ok,
	false,
	"Expected parser to reject persisted object view-state that claims owner-file writes.",
);
const ownerWritePersistenceParse = parseLevelEditorObjectViewStatePersistence({
	serialized: serialized.replace(
		'"persistsOwnerWrites":false',
		'"persistsOwnerWrites":true',
	),
	expectedRuntimeSceneId: "portal_arena_runtime",
});
assertEqual(
	ownerWritePersistenceParse.ok,
	false,
	"Expected parser to reject persisted object view-state that claims persisted owner writes.",
);

console.log(
	`Level editor object view-state model contract passed for ${defaultModel.objectCount} objects.`,
);

function viewStateObject(
	stableId: string,
	pickability: "projected-pickable" | "outliner-only",
): LevelEditorObjectViewStateObject {
	return {
		stableId,
		outliner: {
			pickability: {
				state: pickability,
			},
		},
	};
}
