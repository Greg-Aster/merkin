import {
	LEVEL_EDITOR_RENDERED_HIT_TEST_SELECTION_CONTRACT,
	buildLevelEditorRenderedBoxSelectSelectionRequest,
	buildLevelEditorRenderedHitTestSelectionRequest,
	consumeLevelEditorRenderedBoxSelectSelectionResult,
	consumeLevelEditorRenderedHitTestSelectionResult,
} from "../src/app/editor/levelEditorRenderedHitTestSelection.js";
import { assertDeepEqual, assertEqual } from "./contractTestHelpers.js";

const objects = [
	{ stableId: "portal-arena:portal:a" },
	{ stableId: "portal-arena:portal:b" },
	{ stableId: "portal-arena:spawn" },
] as const;
const pickableStableIds = [
	"portal-arena:portal:a",
	"portal-arena:portal:b",
] as const;

assertEqual(
	LEVEL_EDITOR_RENDERED_HIT_TEST_SELECTION_CONTRACT,
	"LevelEditorRenderedHitTestSelectionContract",
	"Expected a named editor-side rendered hit-test selection contract.",
);

const request = buildLevelEditorRenderedHitTestSelectionRequest({
	runtimeSceneId: "portal_arena_runtime",
	viewport: { width: 1280, height: 720, devicePixelRatio: 2 },
	screenPoint: { x: 640, y: 360 },
	pickableStableIds,
	sourcePlanHash: "workspace:rendered-hit-test:portal_arena_runtime",
});

assertDeepEqual(
	request,
	{
		runtimeSceneId: "portal_arena_runtime",
		coordinateSpace: "viewport-css-pixels",
		viewport: { width: 1280, height: 720, devicePixelRatio: 2 },
		screenPoint: { x: 640, y: 360 },
		pickableStableIds,
		objectViewStateGate: "visible-and-pickable-only",
		writesRuntimeData: false,
		sourcePlanHash: "workspace:rendered-hit-test:portal_arena_runtime",
	},
	"Expected editor rendered hit-test requests to stay CSS-pixel, stable-ID gated, and runtime read-only.",
);

const selected = consumeLevelEditorRenderedHitTestSelectionResult({
	requestId: "pick:1",
	pendingRequestId: "pick:1",
	expectedRuntimeSceneId: "portal_arena_runtime",
	payload: {
		runtimeSceneId: "portal_arena_runtime",
		status: "hit",
		source: "runtime-rendered-scene-hit-test",
		writesRuntimeData: false,
		hit: {
			stableId: "portal-arena:portal:a",
			objectKind: "portal",
			distance: 3,
			worldPosition: [1, 2, 3],
		},
	},
	objects,
	pickableStableIds,
	additive: true,
});

assertEqual(
	selected.status,
	"selected",
	"Expected hit results for known pickable stable IDs to select.",
);

if (selected.status !== "selected") {
	throw new Error("Expected selected result.");
}

assertEqual(
	selected.stableId,
	"portal-arena:portal:a",
	"Expected rendered hit selection to preserve the runtime stable ID.",
);
assertEqual(
	selected.additive,
	true,
	"Expected rendered hit selection to preserve additive click intent.",
);

const staleRequest = consumeLevelEditorRenderedHitTestSelectionResult({
	requestId: "pick:old",
	pendingRequestId: "pick:new",
	expectedRuntimeSceneId: "portal_arena_runtime",
	payload: missPayload("portal_arena_runtime"),
	objects,
	pickableStableIds,
});

assertEqual(
	staleRequest.status,
	"stale",
	"Expected mismatched request IDs to be ignored as stale.",
);
assertEqual(
	staleRequest.reason,
	"request-id-mismatch",
	"Expected stale request IDs to keep a precise reason.",
);

const wrongRuntimeScene = consumeLevelEditorRenderedHitTestSelectionResult({
	requestId: "pick:1",
	pendingRequestId: "pick:1",
	expectedRuntimeSceneId: "portal_arena_runtime",
	payload: missPayload("observatory_runtime"),
	objects,
	pickableStableIds,
});

assertEqual(
	wrongRuntimeScene.status,
	"stale",
	"Expected results from another runtime scene to be stale.",
);
assertEqual(
	wrongRuntimeScene.reason,
	"runtime-scene-mismatch",
	"Expected runtime scene mismatches to keep a precise reason.",
);

const miss = consumeLevelEditorRenderedHitTestSelectionResult({
	requestId: "pick:1",
	pendingRequestId: "pick:1",
	expectedRuntimeSceneId: "portal_arena_runtime",
	payload: missPayload("portal_arena_runtime"),
	objects,
	pickableStableIds,
});

assertEqual(miss.status, "miss", "Expected miss payloads not to select.");
assertEqual(
	miss.reason,
	"no-rendered-hit",
	"Expected miss payloads to preserve a no-rendered-hit reason.",
);

const ignored = consumeLevelEditorRenderedHitTestSelectionResult({
	requestId: "pick:1",
	pendingRequestId: "pick:1",
	expectedRuntimeSceneId: "portal_arena_runtime",
	payload: {
		runtimeSceneId: "portal_arena_runtime",
		status: "ignored",
		source: "runtime-rendered-scene-hit-test",
		writesRuntimeData: false,
		reason: "rendered-hit-test-unavailable",
	},
	objects,
	pickableStableIds,
});

assertEqual(
	ignored.status,
	"ignored",
	"Expected runtime ignored payloads not to select.",
);
assertEqual(
	ignored.reason,
	"runtime-ignored",
	"Expected ignored payloads to keep a runtime-ignored reason.",
);

const unknownStableId = consumeLevelEditorRenderedHitTestSelectionResult({
	requestId: "pick:1",
	pendingRequestId: "pick:1",
	expectedRuntimeSceneId: "portal_arena_runtime",
	payload: hitPayload("portal-arena:portal:missing"),
	objects,
	pickableStableIds,
});

assertEqual(
	unknownStableId.status,
	"ignored",
	"Expected hits for unknown workspace objects not to select.",
);
assertEqual(
	unknownStableId.reason,
	"unknown-stable-id",
	"Expected unknown workspace objects to keep a precise reason.",
);

const nonPickableStableId = consumeLevelEditorRenderedHitTestSelectionResult({
	requestId: "pick:1",
	pendingRequestId: "pick:1",
	expectedRuntimeSceneId: "portal_arena_runtime",
	payload: hitPayload("portal-arena:spawn"),
	objects,
	pickableStableIds,
});

assertEqual(
	nonPickableStableId.status,
	"ignored",
	"Expected hits for editor-hidden or locked objects not to select.",
);
assertEqual(
	nonPickableStableId.reason,
	"not-pickable",
	"Expected editor view-state to gate rendered hit-test selection.",
);

const boxRequest = buildLevelEditorRenderedBoxSelectSelectionRequest({
	runtimeSceneId: "portal_arena_runtime",
	viewport: { width: 1280, height: 720, devicePixelRatio: 2 },
	rect: { x: 320, y: 180, width: 640, height: 360 },
	pickableStableIds,
	sourcePlanHash: "workspace:rendered-box-select:portal_arena_runtime",
});

assertDeepEqual(
	boxRequest,
	{
		runtimeSceneId: "portal_arena_runtime",
		coordinateSpace: "viewport-css-pixels",
		viewport: { width: 1280, height: 720, devicePixelRatio: 2 },
		rect: { x: 320, y: 180, width: 640, height: 360 },
		pickableStableIds,
		objectViewStateGate: "visible-and-pickable-only",
		writesRuntimeData: false,
		sourcePlanHash: "workspace:rendered-box-select:portal_arena_runtime",
	},
	"Expected editor rendered box-select requests to stay CSS-pixel, stable-ID gated, and runtime read-only.",
);

const boxSelected = consumeLevelEditorRenderedBoxSelectSelectionResult({
	requestId: "box:1",
	pendingRequestId: "box:1",
	expectedRuntimeSceneId: "portal_arena_runtime",
	payload: {
		runtimeSceneId: "portal_arena_runtime",
		status: "hit",
		source: "runtime-rendered-scene-box-select",
		writesRuntimeData: false,
		hits: [
			{
				stableId: "portal-arena:portal:a",
				objectKind: "portal",
				distance: 3,
				worldPosition: [1, 2, 3],
			},
			{
				stableId: "portal-arena:portal:b",
				objectKind: "portal",
				distance: 5,
				worldPosition: [4, 5, 6],
			},
			{
				stableId: "portal-arena:spawn",
				objectKind: "level-instance",
				distance: 7,
				worldPosition: [7, 8, 9],
			},
			{
				stableId: "portal-arena:portal:missing",
				objectKind: "portal",
				distance: 9,
				worldPosition: [9, 10, 11],
			},
		],
	},
	objects,
	pickableStableIds,
	additive: true,
});

assertEqual(
	boxSelected.status,
	"selected",
	"Expected box-select hit results for known pickable stable IDs to select.",
);

if (boxSelected.status !== "selected") {
	throw new Error("Expected box-selected result.");
}

assertDeepEqual(
	boxSelected.stableIds,
	["portal-arena:portal:a", "portal-arena:portal:b"],
	"Expected box selection to keep only known editor-pickable stable IDs.",
);
assertEqual(
	boxSelected.additive,
	true,
	"Expected rendered box selection to preserve additive marquee intent.",
);

const staleBoxRequest = consumeLevelEditorRenderedBoxSelectSelectionResult({
	requestId: "box:old",
	pendingRequestId: "box:new",
	expectedRuntimeSceneId: "portal_arena_runtime",
	payload: boxMissPayload("portal_arena_runtime"),
	objects,
	pickableStableIds,
});

assertEqual(
	staleBoxRequest.status,
	"stale",
	"Expected mismatched box-select request IDs to be ignored as stale.",
);
assertEqual(
	staleBoxRequest.reason,
	"request-id-mismatch",
	"Expected stale box-select request IDs to keep a precise reason.",
);

const boxMiss = consumeLevelEditorRenderedBoxSelectSelectionResult({
	requestId: "box:1",
	pendingRequestId: "box:1",
	expectedRuntimeSceneId: "portal_arena_runtime",
	payload: boxMissPayload("portal_arena_runtime"),
	objects,
	pickableStableIds,
});

assertEqual(
	boxMiss.status,
	"miss",
	"Expected box miss payloads not to select.",
);
assertEqual(
	boxMiss.reason,
	"no-rendered-hit",
	"Expected box miss payloads to preserve a no-rendered-hit reason.",
);

console.log(
	"Level editor rendered hit-test selection contract passed: editor point and box requests are stable-ID gated and runtime results only select known pickable workspace objects.",
);

function missPayload(runtimeSceneId: string) {
	return {
		runtimeSceneId,
		status: "miss" as const,
		source: "runtime-rendered-scene-hit-test" as const,
		writesRuntimeData: false as const,
		reason: "no-rendered-hit" as const,
	};
}

function hitPayload(stableId: string) {
	return {
		runtimeSceneId: "portal_arena_runtime",
		status: "hit" as const,
		source: "runtime-rendered-scene-hit-test" as const,
		writesRuntimeData: false as const,
		hit: {
			stableId,
			objectKind: "portal" as const,
			distance: 3,
			worldPosition: [1, 2, 3] as const,
		},
	};
}

function boxMissPayload(runtimeSceneId: string) {
	return {
		runtimeSceneId,
		status: "miss" as const,
		source: "runtime-rendered-scene-box-select" as const,
		writesRuntimeData: false as const,
		reason: "no-rendered-hit" as const,
	};
}
