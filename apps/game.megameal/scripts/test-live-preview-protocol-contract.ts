import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
	type LevelEditorPreviewChannelMessageHandler,
	type LevelEditorPreviewChannelPort,
	applyCollisionPreviewPatchToRuntime,
	applyCoreObjectPreviewPatchToRuntime,
	clearCollisionPreviewPatchFromRuntime,
	clearCoreObjectPreviewPatchFromRuntime,
	connectGameWindowDevPreviewChannel,
	handleGameWindowDevPreviewMessage,
	postLevelEditorDevPreviewMessage,
} from "../src/app/devPreview/index.js";
import {
	buildCameraLiveEditModeMessage as buildEditorCameraLiveEditModeMessage,
	buildObjectEditPreviewClearRequestMessage as buildEditorObjectEditPreviewClearRequestMessage,
	buildObjectEditPreviewPatchMessage as buildEditorObjectEditPreviewPatchMessage,
	buildRenderedSceneBoxSelectRequestMessage as buildEditorRenderedSceneBoxSelectRequestMessage,
	buildRenderedSceneHitTestRequestMessage as buildEditorRenderedSceneHitTestRequestMessage,
	buildRuntimeReloadRequestMessage as buildEditorRuntimeReloadRequestMessage,
	sendCameraLiveEditModeRequest,
	sendObjectEditPreviewClearRequest,
	sendObjectEditPreviewPatch,
	sendRenderedSceneBoxSelectRequest,
	sendRenderedSceneHitTestRequest,
} from "../src/app/editor/levelEditorPreviewSender.js";
import {
	type CollisionCookPreviewPatch,
	LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
	type LevelEditorCameraLiveEditModeRequest,
	type LevelEditorCollisionPreviewClearRequest,
	type LevelEditorCoreObjectPreviewPatch,
	type LevelEditorObjectEditPreviewPatch,
	type LevelEditorRenderedSceneBoxSelectRequest,
	type LevelEditorRenderedSceneBoxSelectResultPayload,
	type LevelEditorRenderedSceneHitTestRequest,
	type LevelEditorRenderedSceneHitTestResultPayload,
	type LevelEditorRuntimeReloadAckPayload,
	type LevelEditorRuntimeReloadRequest,
	type LevelEditorRuntimeTelemetryPayload,
	createCameraLiveEditModeMessage,
	createCollisionPreviewClearRequestMessage,
	createCollisionPreviewPatchMessage,
	createCoreObjectPreviewClearRequestMessage,
	createCoreObjectPreviewPatchMessage,
	createObjectEditPreviewPatchMessage,
	createRenderedSceneBoxSelectRequestMessage,
	createRenderedSceneBoxSelectResultMessage,
	createRenderedSceneHitTestRequestMessage,
	createRenderedSceneHitTestResultMessage,
	createRuntimeReloadAckMessage,
	createRuntimeSceneReloadRequestMessage,
	createRuntimeTelemetryMessage,
	parseLevelEditorDevPreviewMessage,
} from "../src/engine/data/index.js";
import {
	COLLIDER_COMPONENT,
	EngineRuntime,
	LIGHT_COMPONENT,
	PHYSICS_TRANSFORM_COMPONENT,
	SOUND_EMITTER_COMPONENT,
} from "../src/engine/index.js";
import { STABLE_ID_COMPONENT } from "../src/game/prefabs/index.js";
import { PORTAL_COMPONENT } from "../src/game/systems/index.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = normalize(join(scriptDirectory, ".."));
const validPreviewPatch = createValidPreviewPatch();
const validPreviewMessage = createCollisionPreviewPatchMessage({
	requestId: "test-preview:valid",
	patch: validPreviewPatch,
});
const validCoreObjectPreviewPatch = createValidCoreObjectPreviewPatch();
const validCoreObjectPreviewMessage = createCoreObjectPreviewPatchMessage({
	requestId: "test-core-preview:valid",
	patch: validCoreObjectPreviewPatch,
});
const validObjectEditPreviewPatch = createValidObjectEditPreviewPatch();
const validObjectEditPreviewMessage = createObjectEditPreviewPatchMessage({
	requestId: "test-object-edit-preview:valid",
	patch: validObjectEditPreviewPatch,
});
const validCameraLiveEditRequest = createValidCameraLiveEditRequest();
const validCameraLiveEditMessage = createCameraLiveEditModeMessage({
	requestId: "test-camera-live-edit:valid",
	request: validCameraLiveEditRequest,
});
const validRenderedSceneHitTestRequest =
	createValidRenderedSceneHitTestRequest();
const validRenderedSceneHitTestRequestMessage =
	createRenderedSceneHitTestRequestMessage({
		requestId: "test-rendered-hit-test-request:valid",
		request: validRenderedSceneHitTestRequest,
	});
const validRenderedSceneHitTestResult = createValidRenderedSceneHitTestResult();
const validRenderedSceneHitTestResultMessage =
	createRenderedSceneHitTestResultMessage({
		requestId: "test-rendered-hit-test-result:valid",
		result: validRenderedSceneHitTestResult,
	});
const validRenderedSceneBoxSelectRequest =
	createValidRenderedSceneBoxSelectRequest();
const validRenderedSceneBoxSelectRequestMessage =
	createRenderedSceneBoxSelectRequestMessage({
		requestId: "test-rendered-box-select-request:valid",
		request: validRenderedSceneBoxSelectRequest,
	});
const validRenderedSceneBoxSelectResult =
	createValidRenderedSceneBoxSelectResult();
const validRenderedSceneBoxSelectResultMessage =
	createRenderedSceneBoxSelectResultMessage({
		requestId: "test-rendered-box-select-result:valid",
		result: validRenderedSceneBoxSelectResult,
	});
const validRuntimeReloadAck = createValidRuntimeReloadAck();
const validRuntimeReloadAckMessage = createRuntimeReloadAckMessage({
	requestId: "test-runtime-reload-ack:valid",
	ack: validRuntimeReloadAck,
});
const validRuntimeTelemetry = createValidRuntimeTelemetry();
const validRuntimeTelemetryMessage = createRuntimeTelemetryMessage({
	requestId: "test-runtime-telemetry:valid",
	telemetry: validRuntimeTelemetry,
});

function createValidPreviewPatch(): CollisionCookPreviewPatch {
	return {
		schemaVersion: 1,
		channel: "level-editor-collision-preview",
		mode: "temporary-preview",
		draftId: "test_collision_preview_draft",
		runtimeSceneId: "observatory_runtime",
		levelId: "observatory",
		sourcePlanHash: "fnv1a32:test0001",
		entries: [
			{
				id: "test-preview-collider",
				stableId: "observatory:collision:boundary:north",
				prefabId: "observatory_boundary_blocker",
				colliderTarget: "level-instance",
				transform: {
					position: [0, 5.8, -304],
				},
				colliderComponent: {
					intent: "solid",
					channel: "worldStatic",
					shape: {
						type: "box",
						halfExtents: [320, 4, 4],
					},
				},
				readiness: {
					requiredCollision: true,
				},
			},
		],
		requiredCollisionStableIds: ["observatory:collision:boundary:north"],
		requiredWalkableStableIds: [],
	};
}

function createValidCoreObjectPreviewPatch(): LevelEditorCoreObjectPreviewPatch {
	return {
		schemaVersion: 1,
		channel: "level-editor-core-object-preview",
		mode: "temporary-preview",
		runtimeSceneId: "portal_arena_runtime",
		levelId: "portal_arena",
		sourcePlanHash: "workspace:portal:test0001",
		entries: [
			{
				stableId: "player",
				targetKind: "spawn",
				transform: {
					position: [1, 2, 3],
				},
			},
			{
				stableId: "portal-arena:light:test",
				targetKind: "light",
				transform: {
					position: [4, 5, 6],
				},
				light: {
					kind: "point",
					color: "#8adff5",
					intensity: 3.4,
					distance: 18,
					decay: 2,
					visible: true,
				},
			},
			{
				stableId: "portal-arena:portal:test",
				targetKind: "portal",
				portal: {
					id: "portal",
					label: "Preview Portal",
					prompt: "Preview",
					targetRuntimeSceneId: "observatory_runtime",
					activationRadius: 3,
				},
			},
			{
				stableId: "portal-arena:audio:test",
				targetKind: "audio-emitter",
				soundEmitter: {
					soundId: "audio_portal_cycle",
					volume: 0.42,
					loop: true,
					active: true,
					refDistance: 2,
					maxDistance: 16,
					rolloffFactor: 1.2,
					distanceModel: "inverse",
				},
			},
		],
	};
}

function createValidObjectEditPreviewPatch(): LevelEditorObjectEditPreviewPatch {
	return {
		schemaVersion: 1,
		channel: "level-editor-object-edit-preview",
		mode: "temporary-preview",
		runtimeSceneId: "portal_arena_runtime",
		levelId: "portal_arena",
		sourcePlanHash: "workspace:object-edit:test0001",
		entries: [
			{
				stableId: "object-edit:transform",
				operation: "transform",
				transform: {
					position: [10, 2, -3],
					scale: [2, 2, 2],
				},
			},
			{
				stableId: "object-edit:component",
				operation: "component-patch",
				components: {
					Renderable: {
						meshId: "mesh_portal_gate",
						materialId: "material_portal_gate",
					},
				},
				removeComponents: ["SoundEmitter"],
			},
			{
				stableId: "object-edit:inserted",
				operation: "insert",
				prefabId: "preview_insert_prefab",
				transform: {
					position: [4, 5, 6],
				},
				components: {
					Transform: {
						scale: [1, 1, 1],
					},
					Renderable: {
						meshId: "mesh_portal_gate",
					},
				},
			},
			{
				stableId: "object-edit:removed",
				operation: "remove",
				componentNames: ["Renderable", "Collider"],
			},
		],
	};
}

function createValidCameraLiveEditRequest(): LevelEditorCameraLiveEditModeRequest {
	return {
		runtimeSceneId: "portal_arena_runtime",
		mode: "edit",
		sourcePlanHash: "workspace:camera:test0001",
		pose: {
			position: [7, 8, 9],
			rotation: [0, 0, 0, 1],
			fovDegrees: 55,
			near: 0.1,
			far: 250,
		},
	};
}

function createValidRenderedSceneHitTestRequest(): LevelEditorRenderedSceneHitTestRequest {
	return {
		runtimeSceneId: "portal_arena_runtime",
		coordinateSpace: "viewport-css-pixels",
		viewport: {
			width: 1280,
			height: 720,
			devicePixelRatio: 2,
		},
		screenPoint: {
			x: 640,
			y: 360,
		},
		pickableStableIds: ["portal-arena:portal:test"],
		objectViewStateGate: "visible-and-pickable-only",
		writesRuntimeData: false,
		sourcePlanHash: "workspace:rendered-hit-test:test0001",
	};
}

function createValidRenderedSceneHitTestResult(): LevelEditorRenderedSceneHitTestResultPayload {
	return {
		runtimeSceneId: "portal_arena_runtime",
		activeRuntimeSceneId: "portal_arena_runtime",
		status: "hit",
		source: "runtime-rendered-scene-hit-test",
		writesRuntimeData: false,
		hit: {
			stableId: "portal-arena:portal:test",
			objectKind: "portal",
			distance: 12.5,
			worldPosition: [1, 2, 3],
			worldNormal: [0, 1, 0],
			renderableId: "mesh_portal_gate",
			label: "Preview Portal",
		},
	};
}

function createValidRenderedSceneBoxSelectRequest(): LevelEditorRenderedSceneBoxSelectRequest {
	return {
		runtimeSceneId: "portal_arena_runtime",
		coordinateSpace: "viewport-css-pixels",
		viewport: {
			width: 1280,
			height: 720,
			devicePixelRatio: 2,
		},
		rect: {
			x: 320,
			y: 180,
			width: 640,
			height: 360,
		},
		pickableStableIds: ["portal-arena:portal:test"],
		objectViewStateGate: "visible-and-pickable-only",
		writesRuntimeData: false,
		sourcePlanHash: "workspace:rendered-box-select:test0001",
	};
}

function createValidRenderedSceneBoxSelectResult(): LevelEditorRenderedSceneBoxSelectResultPayload {
	return {
		runtimeSceneId: "portal_arena_runtime",
		activeRuntimeSceneId: "portal_arena_runtime",
		status: "hit",
		source: "runtime-rendered-scene-box-select",
		writesRuntimeData: false,
		hits: [
			{
				stableId: "portal-arena:portal:test",
				objectKind: "portal",
				distance: 12.5,
				worldPosition: [1, 2, 3],
				renderableId: "mesh_portal_gate",
				label: "Preview Portal",
			},
		],
	};
}

function createValidRuntimeReloadAck(): LevelEditorRuntimeReloadAckPayload {
	return {
		runtimeSceneId: "portal_arena_runtime",
		activeRuntimeSceneId: "portal_arena_runtime",
		status: "accepted",
		reason: "reload-requested",
		sourcePlanHash: "workspace:reload:test0001",
	};
}

function createValidRuntimeTelemetry(): LevelEditorRuntimeTelemetryPayload {
	return {
		runtimeSceneId: "portal_arena_runtime",
		lifecycle: "started",
		tick: 128,
		playerAlive: true,
		playerPosition: [0, 0.6, 0],
		health: [100, 100],
		remainingCollectibles: 0,
		collectedCount: 0,
		moving: false,
		pointerLocked: false,
		lookActive: false,
		inputEnabled: true,
		charging: false,
		chargeAmount: 0,
		updatedAtMs: 1234,
	};
}

function assertProtocolMessageValidation(): void {
	const parsed = parseLevelEditorDevPreviewMessage(validPreviewMessage);

	assertEqual(
		parsed.protocol,
		LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		"Expected preview message protocol to be explicit.",
	);
	assertEqual(
		parsed.type,
		"collision-preview-patch",
		"Expected preview message type to identify collision patches.",
	);

	if (parsed.type !== "collision-preview-patch") {
		throw new Error("Expected parsed preview message to be a collision patch.");
	}

	assertEqual(
		parsed.payload.channel,
		"level-editor-collision-preview",
		"Expected message payload to carry the collision cook preview channel.",
	);
	assertEqual(
		parsed.payload.entries.length,
		1,
		"Expected fixture preview patch to include 1 entry.",
	);

	createCollisionPreviewPatchMessage({
		requestId: "test-preview:explicit-create",
		patch: parsed.payload,
	});

	const coreParsed = parseLevelEditorDevPreviewMessage(
		validCoreObjectPreviewMessage,
	);

	assertEqual(
		coreParsed.type,
		"core-object-preview-patch",
		"Expected core object preview message type.",
	);

	if (coreParsed.type !== "core-object-preview-patch") {
		throw new Error("Expected parsed core preview message to be a core patch.");
	}

	assertEqual(
		coreParsed.payload.channel,
		"level-editor-core-object-preview",
		"Expected core preview message to carry the core object preview channel.",
	);
	assertEqual(
		coreParsed.payload.entries.length,
		4,
		"Expected core preview fixture to include core editable object classes.",
	);

	createCoreObjectPreviewPatchMessage({
		requestId: "test-core-preview:explicit-create",
		patch: coreParsed.payload,
	});

	const objectEditParsed = parseLevelEditorDevPreviewMessage(
		validObjectEditPreviewMessage,
	);

	assertEqual(
		objectEditParsed.type,
		"object-edit-preview-patch",
		"Expected object edit preview message type.",
	);

	if (objectEditParsed.type !== "object-edit-preview-patch") {
		throw new Error(
			"Expected parsed object edit preview message to be an object edit patch.",
		);
	}

	assertEqual(
		objectEditParsed.payload.entries.length,
		4,
		"Expected object edit fixture to cover transform, component, insert, and remove.",
	);

	createObjectEditPreviewPatchMessage({
		requestId: "test-object-edit-preview:explicit-create",
		patch: objectEditParsed.payload,
	});

	const cameraParsed = parseLevelEditorDevPreviewMessage(
		validCameraLiveEditMessage,
	);

	assertEqual(
		cameraParsed.type,
		"camera-live-edit-mode",
		"Expected camera live edit message type.",
	);

	if (cameraParsed.type !== "camera-live-edit-mode") {
		throw new Error(
			"Expected parsed camera message to be a live edit mode request.",
		);
	}

	assertEqual(
		cameraParsed.request.mode,
		"edit",
		"Expected camera message to enter edit mode.",
	);

	createCameraLiveEditModeMessage({
		requestId: "test-camera-live-edit:explicit-create",
		request: cameraParsed.request,
	});

	const renderedHitTestRequestParsed = parseLevelEditorDevPreviewMessage(
		validRenderedSceneHitTestRequestMessage,
	);

	assertEqual(
		renderedHitTestRequestParsed.type,
		"rendered-scene-hit-test-request",
		"Expected rendered-scene hit-test request message type.",
	);

	if (renderedHitTestRequestParsed.type !== "rendered-scene-hit-test-request") {
		throw new Error(
			"Expected parsed rendered-scene hit-test message to be a request.",
		);
	}

	assertEqual(
		renderedHitTestRequestParsed.request.coordinateSpace,
		"viewport-css-pixels",
		"Expected rendered hit-test request to use viewport CSS-pixel coordinates.",
	);

	const renderedHitTestResultParsed = parseLevelEditorDevPreviewMessage(
		validRenderedSceneHitTestResultMessage,
	);

	assertEqual(
		renderedHitTestResultParsed.type,
		"rendered-scene-hit-test-result",
		"Expected rendered-scene hit-test result message type.",
	);

	if (renderedHitTestResultParsed.type !== "rendered-scene-hit-test-result") {
		throw new Error(
			"Expected parsed rendered-scene hit-test message to be a result.",
		);
	}

	assertEqual(
		renderedHitTestResultParsed.payload.hit?.stableId,
		"portal-arena:portal:test",
		"Expected rendered hit-test result to carry the hit stable ID.",
	);

	const renderedBoxSelectRequestParsed = parseLevelEditorDevPreviewMessage(
		validRenderedSceneBoxSelectRequestMessage,
	);

	assertEqual(
		renderedBoxSelectRequestParsed.type,
		"rendered-scene-box-select-request",
		"Expected rendered-scene box-select request message type.",
	);

	if (
		renderedBoxSelectRequestParsed.type !== "rendered-scene-box-select-request"
	) {
		throw new Error(
			"Expected parsed rendered-scene box-select message to be a request.",
		);
	}

	assertEqual(
		renderedBoxSelectRequestParsed.request.coordinateSpace,
		"viewport-css-pixels",
		"Expected rendered box-select request to use viewport CSS-pixel coordinates.",
	);
	assertEqual(
		renderedBoxSelectRequestParsed.request.rect.width,
		640,
		"Expected rendered box-select request to carry a CSS-pixel rectangle.",
	);

	createRenderedSceneBoxSelectRequestMessage({
		requestId: "test-rendered-box-select-request:explicit-create",
		request: renderedBoxSelectRequestParsed.request,
	});

	const renderedBoxSelectResultParsed = parseLevelEditorDevPreviewMessage(
		validRenderedSceneBoxSelectResultMessage,
	);

	assertEqual(
		renderedBoxSelectResultParsed.type,
		"rendered-scene-box-select-result",
		"Expected rendered-scene box-select result message type.",
	);

	if (
		renderedBoxSelectResultParsed.type !== "rendered-scene-box-select-result"
	) {
		throw new Error(
			"Expected parsed rendered-scene box-select message to be a result.",
		);
	}

	assertEqual(
		renderedBoxSelectResultParsed.payload.hits?.[0]?.stableId,
		"portal-arena:portal:test",
		"Expected rendered box-select result to carry stable-ID hits.",
	);

	createRenderedSceneBoxSelectResultMessage({
		requestId: "test-rendered-box-select-result:explicit-create",
		result: renderedBoxSelectResultParsed.payload,
	});

	const reloadAckParsed = parseLevelEditorDevPreviewMessage(
		validRuntimeReloadAckMessage,
	);

	assertEqual(
		reloadAckParsed.type,
		"runtime-reload-ack",
		"Expected runtime reload ack message type.",
	);

	if (reloadAckParsed.type !== "runtime-reload-ack") {
		throw new Error("Expected parsed reload ack message to be a reload ack.");
	}

	assertEqual(
		reloadAckParsed.payload.status,
		"accepted",
		"Expected reload ack fixture to be accepted.",
	);

	createRuntimeReloadAckMessage({
		requestId: "test-runtime-reload-ack:explicit-create",
		ack: reloadAckParsed.payload,
	});

	const telemetryParsed = parseLevelEditorDevPreviewMessage(
		validRuntimeTelemetryMessage,
	);

	assertEqual(
		telemetryParsed.type,
		"runtime-telemetry",
		"Expected runtime telemetry message type.",
	);

	if (telemetryParsed.type !== "runtime-telemetry") {
		throw new Error(
			"Expected parsed telemetry message to be runtime telemetry.",
		);
	}

	assertEqual(
		telemetryParsed.payload.lifecycle,
		"started",
		"Expected runtime telemetry to carry the game lifecycle.",
	);

	createRuntimeTelemetryMessage({
		requestId: "test-runtime-telemetry:explicit-create",
		telemetry: telemetryParsed.payload,
	});
}

function assertEditorPreviewSenderHelpers(): void {
	const objectEditMessage = buildEditorObjectEditPreviewPatchMessage(
		"test-editor-sender:object-edit",
		validObjectEditPreviewPatch,
	);

	assertEqual(
		objectEditMessage.type,
		"object-edit-preview-patch",
		"Expected editor sender to build object-edit preview messages.",
	);
	assertEqual(
		objectEditMessage.payload.entries.length,
		4,
		"Expected editor sender to preserve transform/component/insert/remove entries.",
	);

	const objectEditClearMessage =
		buildEditorObjectEditPreviewClearRequestMessage({
			requestId: "test-editor-sender:object-edit-clear",
			runtimeSceneId: validObjectEditPreviewPatch.runtimeSceneId,
			sourcePlanHash: validObjectEditPreviewPatch.sourcePlanHash,
			stableIds: validObjectEditPreviewPatch.entries.map(
				(entry) => entry.stableId,
			),
			operations: ["transform", "component-patch", "insert", "remove"],
		});

	assertEqual(
		objectEditClearMessage.request.runtimeSceneId,
		validObjectEditPreviewPatch.runtimeSceneId,
		"Expected object-edit clear request to use the selected runtime scene.",
	);
	assertEqual(
		objectEditClearMessage.request.operations?.length,
		4,
		"Expected object-edit clear request to carry operation filters.",
	);

	const editPose = validCameraLiveEditRequest.pose;

	if (editPose === undefined) {
		throw new Error("Expected camera edit fixture to include a pose.");
	}

	const cameraEditMessage = buildEditorCameraLiveEditModeMessage({
		requestId: "test-editor-sender:camera-edit",
		runtimeSceneId: validCameraLiveEditRequest.runtimeSceneId,
		mode: "edit",
		...(validCameraLiveEditRequest.sourcePlanHash === undefined
			? {}
			: { sourcePlanHash: validCameraLiveEditRequest.sourcePlanHash }),
		pose: editPose,
	});

	assertEqual(
		cameraEditMessage.request.mode,
		"edit",
		"Expected editor sender to build camera edit-mode requests.",
	);
	assertEqual(
		cameraEditMessage.request.runtimeSceneId,
		"portal_arena_runtime",
		"Expected camera edit request to preserve catalog runtimeSceneId.",
	);

	const cameraGameplayMessage = buildEditorCameraLiveEditModeMessage({
		requestId: "test-editor-sender:camera-gameplay",
		runtimeSceneId: "sci_fi_room_runtime",
		mode: "gameplay",
		sourcePlanHash: "workspace:camera:gameplay",
	});

	assertEqual(
		cameraGameplayMessage.request.mode,
		"gameplay",
		"Expected editor sender to build gameplay camera requests.",
	);
	assertEqual(
		cameraGameplayMessage.request.runtimeSceneId,
		"sci_fi_room_runtime",
		"Expected gameplay camera request to avoid scene fallbacks.",
	);

	const renderedHitTestMessage = buildEditorRenderedSceneHitTestRequestMessage({
		requestId: "test-editor-sender:rendered-hit-test",
		request: validRenderedSceneHitTestRequest,
	});

	assertEqual(
		renderedHitTestMessage.request.objectViewStateGate,
		"visible-and-pickable-only",
		"Expected editor rendered hit-test helper to preserve object view-state gating.",
	);
	assertEqual(
		renderedHitTestMessage.request.writesRuntimeData,
		false,
		"Expected editor rendered hit-test helper not to request runtime writes.",
	);

	const renderedBoxSelectMessage =
		buildEditorRenderedSceneBoxSelectRequestMessage({
			requestId: "test-editor-sender:rendered-box-select",
			request: validRenderedSceneBoxSelectRequest,
		});

	assertEqual(
		renderedBoxSelectMessage.request.objectViewStateGate,
		"visible-and-pickable-only",
		"Expected editor rendered box-select helper to preserve object view-state gating.",
	);
	assertEqual(
		renderedBoxSelectMessage.request.writesRuntimeData,
		false,
		"Expected editor rendered box-select helper not to request runtime writes.",
	);

	const manualReloadMessage = buildEditorRuntimeReloadRequestMessage({
		requestId: "test-editor-sender:reload",
		runtimeSceneId: "sci_fi_room_runtime",
	});

	assertEqual(
		manualReloadMessage.request.runtimeSceneId,
		"sci_fi_room_runtime",
		"Expected editor reload helper to use its supplied runtimeSceneId.",
	);
	assertEqual(
		manualReloadMessage.request.reason,
		"manual",
		"Expected editor reload helper without a source hash to stay manual.",
	);

	const channel = new InMemoryPreviewChannel();
	sendObjectEditPreviewPatch(
		channel,
		"test-editor-sender:send-object-edit",
		validObjectEditPreviewPatch,
	);
	sendObjectEditPreviewClearRequest(channel, {
		requestId: "test-editor-sender:send-object-edit-clear",
		runtimeSceneId: validObjectEditPreviewPatch.runtimeSceneId,
		sourcePlanHash: validObjectEditPreviewPatch.sourcePlanHash,
		operations: ["transform"],
	});
	sendCameraLiveEditModeRequest(channel, {
		requestId: "test-editor-sender:send-camera-gameplay",
		runtimeSceneId: "sci_fi_room_runtime",
		mode: "gameplay",
	});
	sendRenderedSceneHitTestRequest(channel, {
		requestId: "test-editor-sender:send-rendered-hit-test",
		request: validRenderedSceneHitTestRequest,
	});
	sendRenderedSceneBoxSelectRequest(channel, {
		requestId: "test-editor-sender:send-rendered-box-select",
		request: validRenderedSceneBoxSelectRequest,
	});

	assertEqual(
		channel.messages.length,
		5,
		"Expected editor sender helpers to post five validated messages.",
	);
}

function assertInvalidPreviewPatchRejection(): void {
	const invalidPreviewMessage = {
		...validPreviewMessage,
		payload: {
			...validPreviewMessage.payload,
			channel: "invalid-preview-channel",
		},
	};
	const fakeChannel = new InMemoryPreviewChannel();

	expectInvalidMessage(invalidPreviewMessage, "collisionPreviewPatch.channel");
	expectInvalidSend(
		fakeChannel,
		invalidPreviewMessage,
		"collisionPreviewPatch.channel",
	);
	expectInvalidPreviewApplication(
		invalidPreviewMessage.payload as CollisionCookPreviewPatch,
		"collisionPreviewPatch.channel",
	);

	let appliedPreview: CollisionCookPreviewPatch | undefined;
	let reloaded: LevelEditorRuntimeReloadRequest | undefined;
	const result = handleGameWindowDevPreviewMessage(invalidPreviewMessage, {
		applyPreview(patch) {
			appliedPreview = patch;
		},
		reload(request) {
			reloaded = request;
		},
	});

	if (result.ok) {
		throw new Error("Expected invalid preview message to be rejected.");
	}

	if (
		!result.errors.some((error) =>
			error.includes("collisionPreviewPatch.channel"),
		)
	) {
		throw new Error(
			`Expected invalid preview rejection to mention collisionPreviewPatch.channel, received:\n${result.errors.join("\n")}`,
		);
	}

	if (appliedPreview !== undefined || reloaded !== undefined) {
		throw new Error("Expected invalid preview message to avoid callbacks.");
	}
}

function assertRuntimeTelemetryValidation(): void {
	expectInvalidMessage(
		{
			...validRuntimeTelemetryMessage,
			payload: {
				...validRuntimeTelemetryMessage.payload,
				tick: -1,
			},
		},
		"payload.tick must be a non-negative safe integer",
	);
	expectInvalidMessage(
		{
			...validRuntimeTelemetryMessage,
			payload: {
				...validRuntimeTelemetryMessage.payload,
				lifecycle: "booting",
			},
		},
		"payload.lifecycle must be created, started, paused, stopped, or disposed",
	);
}

function assertRenderedSceneHitTestValidation(): void {
	expectInvalidMessage(
		{
			...validRenderedSceneHitTestRequestMessage,
			request: {
				...validRenderedSceneHitTestRequest,
				screenPoint: {
					x: 1281,
					y: 360,
				},
			},
		},
		"screenPoint.x must be inside the viewport width",
	);
	expectInvalidMessage(
		{
			...validRenderedSceneHitTestRequestMessage,
			request: {
				...validRenderedSceneHitTestRequest,
				coordinateSpace: "normalized-viewport",
			},
		},
		"coordinateSpace must be viewport-css-pixels",
	);
	expectInvalidMessage(
		{
			...validRenderedSceneHitTestResultMessage,
			payload: {
				...validRenderedSceneHitTestResult,
				status: "hit",
				hit: undefined,
			},
		},
		"payload.hit must be an object when status is hit",
	);
	expectInvalidMessage(
		{
			...validRenderedSceneHitTestResultMessage,
			payload: {
				runtimeSceneId: "portal_arena_runtime",
				status: "miss",
				source: "runtime-rendered-scene-hit-test",
				writesRuntimeData: false,
			},
		},
		"payload.reason is required when status is miss",
	);
	expectInvalidMessage(
		{
			...validRenderedSceneHitTestRequestMessage,
			request: {
				...validRenderedSceneHitTestRequest,
				writesRuntimeData: true,
			},
		},
		"request.writesRuntimeData must be false",
	);
	expectInvalidMessage(
		{
			...validRenderedSceneHitTestRequestMessage,
			request: {
				...validRenderedSceneHitTestRequest,
				objectViewStateGate: "all-rendered-objects",
			},
		},
		"request.objectViewStateGate must be visible-and-pickable-only",
	);
	expectInvalidMessage(
		{
			...validRenderedSceneHitTestResultMessage,
			payload: {
				...validRenderedSceneHitTestResult,
				writesRuntimeData: true,
			},
		},
		"payload.writesRuntimeData must be false",
	);

	parseLevelEditorDevPreviewMessage({
		...validRenderedSceneHitTestResultMessage,
		payload: {
			runtimeSceneId: "portal_arena_runtime",
			status: "ignored",
			source: "runtime-rendered-scene-hit-test",
			writesRuntimeData: false,
			reason: "rendered-hit-test-unavailable",
		},
	});

	expectInvalidMessage(
		{
			...validRenderedSceneBoxSelectRequestMessage,
			request: {
				...validRenderedSceneBoxSelectRequest,
				rect: {
					...validRenderedSceneBoxSelectRequest.rect,
					width: 0,
				},
			},
		},
		"request.rect.width must be a finite positive number",
	);
	expectInvalidMessage(
		{
			...validRenderedSceneBoxSelectRequestMessage,
			request: {
				...validRenderedSceneBoxSelectRequest,
				rect: {
					x: 1200,
					y: 180,
					width: 640,
					height: 360,
				},
			},
		},
		"request.rect must fit inside the viewport width",
	);
	expectInvalidMessage(
		{
			...validRenderedSceneBoxSelectRequestMessage,
			request: {
				...validRenderedSceneBoxSelectRequest,
				writesRuntimeData: true,
			},
		},
		"request.writesRuntimeData must be false",
	);
	expectInvalidMessage(
		{
			...validRenderedSceneBoxSelectResultMessage,
			payload: {
				...validRenderedSceneBoxSelectResult,
				status: "hit",
				hits: [],
			},
		},
		"payload.hits must be a non-empty array when status is hit",
	);
	expectInvalidMessage(
		{
			...validRenderedSceneBoxSelectResultMessage,
			payload: {
				runtimeSceneId: "portal_arena_runtime",
				status: "miss",
				source: "runtime-rendered-scene-box-select",
				writesRuntimeData: false,
			},
		},
		"payload.reason is required when status is miss",
	);
}

function assertReloadRequestShape(): void {
	const reloadMessage = createRuntimeSceneReloadRequestMessage({
		requestId: "test-reload:valid",
		runtimeSceneId: "observatory_runtime",
		reason: "collision-bake-applied",
		sourcePlanHash: validPreviewMessage.payload.sourcePlanHash,
	});
	const parsed = parseLevelEditorDevPreviewMessage(reloadMessage);

	assertEqual(
		parsed.type,
		"reload-runtime-scene",
		"Expected reload request message type.",
	);

	if (parsed.type !== "reload-runtime-scene") {
		throw new Error("Expected parsed reload message to be a reload request.");
	}

	assertEqual(
		parsed.request.runtimeSceneId,
		"observatory_runtime",
		"Expected reload request to target Observatory.",
	);
	assertEqual(
		parsed.request.reason,
		"collision-bake-applied",
		"Expected reload request to record bake-applied reason.",
	);

	expectInvalidMessage(
		{
			...reloadMessage,
			request: {
				...reloadMessage.request,
				runtimeSceneId: undefined,
			},
		},
		"runtimeSceneId must be a non-empty string",
	);
}

function assertClearPreviewRequestShape(): void {
	const clearMessage = createCollisionPreviewClearRequestMessage({
		requestId: "test-clear:valid",
		runtimeSceneId: "observatory_runtime",
		sourcePlanHash: validPreviewMessage.payload.sourcePlanHash,
		stableIds: validPreviewMessage.payload.entries.map(
			(entry) => entry.stableId,
		),
	});
	const parsed = parseLevelEditorDevPreviewMessage(clearMessage);

	assertEqual(
		parsed.type,
		"clear-collision-preview",
		"Expected clear-preview request message type.",
	);

	if (parsed.type !== "clear-collision-preview") {
		throw new Error(
			"Expected parsed clear-preview message to be a clear request.",
		);
	}

	assertEqual(
		parsed.request.runtimeSceneId,
		"observatory_runtime",
		"Expected clear-preview request to target Observatory.",
	);
	assertEqual(
		parsed.request.stableIds?.length,
		1,
		"Expected clear-preview request to target one stable ID.",
	);

	expectInvalidMessage(
		{
			...clearMessage,
			request: {
				...clearMessage.request,
				stableIds: ["valid-id", ""],
			},
		},
		"stableIds.1 must be a non-empty string",
	);

	const clearCoreMessage = createCoreObjectPreviewClearRequestMessage({
		requestId: "test-core-clear:valid",
		runtimeSceneId: "portal_arena_runtime",
		sourcePlanHash: validCoreObjectPreviewPatch.sourcePlanHash,
		stableIds: validCoreObjectPreviewPatch.entries.map(
			(entry) => entry.stableId,
		),
		targetKinds: ["spawn", "light", "portal", "audio-emitter"],
	});
	const parsedCore = parseLevelEditorDevPreviewMessage(clearCoreMessage);

	assertEqual(
		parsedCore.type,
		"clear-core-object-preview",
		"Expected clear-core-object-preview message type.",
	);

	if (parsedCore.type !== "clear-core-object-preview") {
		throw new Error("Expected parsed core clear message to be a core clear.");
	}

	assertEqual(
		parsedCore.request.targetKinds?.length,
		4,
		"Expected core clear request to carry target kind filters.",
	);

	expectInvalidMessage(
		{
			...clearCoreMessage,
			request: {
				...clearCoreMessage.request,
				targetKinds: ["spawn", "bad-kind"],
			},
		},
		"targetKinds.1 must be light, spawn, portal, or audio-emitter",
	);
}

function assertChannelSenderReceiverFlow(): void {
	const channel = new InMemoryPreviewChannel();
	let appliedPreview: CollisionCookPreviewPatch | undefined;
	let appliedCorePreview: LevelEditorCoreObjectPreviewPatch | undefined;
	let reloadRequest: LevelEditorRuntimeReloadRequest | undefined;
	let clearRequest: LevelEditorCollisionPreviewClearRequest | undefined;
	let clearCoreRequest:
		| ReturnType<typeof createCoreObjectPreviewClearRequestMessage>["request"]
		| undefined;
	let renderedHitTestRequest:
		| {
				readonly request: LevelEditorRenderedSceneHitTestRequest;
				readonly requestId: string;
		  }
		| undefined;
	let renderedHitTestResult:
		| {
				readonly payload: LevelEditorRenderedSceneHitTestResultPayload;
				readonly requestId: string;
		  }
		| undefined;
	let renderedBoxSelectRequest:
		| {
				readonly request: LevelEditorRenderedSceneBoxSelectRequest;
				readonly requestId: string;
		  }
		| undefined;
	let renderedBoxSelectResult:
		| {
				readonly payload: LevelEditorRenderedSceneBoxSelectResultPayload;
				readonly requestId: string;
		  }
		| undefined;
	let runtimeTelemetry: LevelEditorRuntimeTelemetryPayload | undefined;
	let rejectedCount = 0;
	const connection = connectGameWindowDevPreviewChannel({
		channel,
		applyPreview(patch) {
			appliedPreview = patch;
		},
		applyCoreObjectPreview(patch) {
			appliedCorePreview = patch;
		},
		clearPreview(request) {
			clearRequest = request;
		},
		clearCoreObjectPreview(request) {
			clearCoreRequest = request;
		},
		receiveRuntimeTelemetry(payload) {
			runtimeTelemetry = payload;
		},
		requestRenderedSceneHitTest(request, requestId) {
			renderedHitTestRequest = { request, requestId };
		},
		receiveRenderedSceneHitTestResult(payload, requestId) {
			renderedHitTestResult = { payload, requestId };
		},
		requestRenderedSceneBoxSelect(request, requestId) {
			renderedBoxSelectRequest = { request, requestId };
		},
		receiveRenderedSceneBoxSelectResult(payload, requestId) {
			renderedBoxSelectResult = { payload, requestId };
		},
		reload(request) {
			reloadRequest = request;
		},
		onRejected() {
			rejectedCount += 1;
		},
	});

	if (!connection.connected) {
		throw new Error("Expected injected preview channel to connect.");
	}

	postLevelEditorDevPreviewMessage(
		channel,
		createCollisionPreviewPatchMessage({
			requestId: "test-preview:through-channel",
			patch: validPreviewPatch,
		}),
	);

	if (!appliedPreview) {
		throw new Error("Expected channel receiver to apply preview callback.");
	}

	assertEqual(
		appliedPreview.sourcePlanHash,
		validPreviewMessage.payload.sourcePlanHash,
		"Expected receiver to apply the validated preview patch.",
	);

	postLevelEditorDevPreviewMessage(
		channel,
		createCoreObjectPreviewPatchMessage({
			requestId: "test-core-preview:through-channel",
			patch: validCoreObjectPreviewPatch,
		}),
	);

	if (!appliedCorePreview) {
		throw new Error(
			"Expected channel receiver to apply core preview callback.",
		);
	}

	assertEqual(
		appliedCorePreview.entries.length,
		4,
		"Expected core preview callback to receive validated patch entries.",
	);

	postLevelEditorDevPreviewMessage(
		channel,
		createRuntimeSceneReloadRequestMessage({
			requestId: "test-reload:through-channel",
			runtimeSceneId: "observatory_runtime",
			reason: "collision-bake-applied",
			sourcePlanHash: validPreviewPatch.sourcePlanHash,
		}),
	);

	if (!reloadRequest) {
		throw new Error("Expected channel receiver to call reload callback.");
	}

	assertEqual(
		reloadRequest.runtimeSceneId,
		"observatory_runtime",
		"Expected reload callback to receive Observatory runtime scene ID.",
	);

	postLevelEditorDevPreviewMessage(
		channel,
		createCollisionPreviewClearRequestMessage({
			requestId: "test-clear:through-channel",
			runtimeSceneId: "observatory_runtime",
			sourcePlanHash: validPreviewPatch.sourcePlanHash,
			stableIds: validPreviewPatch.entries.map((entry) => entry.stableId),
		}),
	);

	if (!clearRequest) {
		throw new Error(
			"Expected channel receiver to call clear-preview callback.",
		);
	}

	assertEqual(
		clearRequest.runtimeSceneId,
		"observatory_runtime",
		"Expected clear-preview callback to receive Observatory runtime scene ID.",
	);

	postLevelEditorDevPreviewMessage(
		channel,
		createCoreObjectPreviewClearRequestMessage({
			requestId: "test-core-clear:through-channel",
			runtimeSceneId: validCoreObjectPreviewPatch.runtimeSceneId,
			sourcePlanHash: validCoreObjectPreviewPatch.sourcePlanHash,
			stableIds: [validCoreObjectPreviewPatch.entries[0]?.stableId ?? "player"],
			targetKinds: ["spawn"],
		}),
	);

	if (!clearCoreRequest) {
		throw new Error(
			"Expected channel receiver to clear core preview callback.",
		);
	}

	assertEqual(
		clearCoreRequest.targetKinds?.[0],
		"spawn",
		"Expected core clear callback to receive target kind filter.",
	);

	postLevelEditorDevPreviewMessage(
		channel,
		createRenderedSceneHitTestRequestMessage({
			requestId: "test-rendered-hit-test:through-channel",
			request: validRenderedSceneHitTestRequest,
		}),
	);

	if (!renderedHitTestRequest) {
		throw new Error(
			"Expected channel receiver to dispatch rendered-scene hit-test request callback.",
		);
	}

	assertEqual(
		renderedHitTestRequest.request.objectViewStateGate,
		"visible-and-pickable-only",
		"Expected rendered hit-test request callback to preserve editor object view-state gating.",
	);
	assertEqual(
		renderedHitTestRequest.requestId,
		"test-rendered-hit-test:through-channel",
		"Expected rendered hit-test request callback to preserve requestId.",
	);

	postLevelEditorDevPreviewMessage(
		channel,
		createRenderedSceneHitTestResultMessage({
			requestId: "test-rendered-hit-test:through-channel",
			result: validRenderedSceneHitTestResult,
		}),
	);

	if (!renderedHitTestResult) {
		throw new Error(
			"Expected channel receiver to dispatch rendered-scene hit-test result callback.",
		);
	}

	assertEqual(
		renderedHitTestResult.payload.hit?.stableId,
		"portal-arena:portal:test",
		"Expected rendered hit-test result callback to preserve stable ID.",
	);
	assertEqual(
		renderedHitTestResult.payload.writesRuntimeData,
		false,
		"Expected rendered hit-test result callback not to write runtime data.",
	);

	postLevelEditorDevPreviewMessage(
		channel,
		createRenderedSceneBoxSelectRequestMessage({
			requestId: "test-rendered-box-select:through-channel",
			request: validRenderedSceneBoxSelectRequest,
		}),
	);

	if (!renderedBoxSelectRequest) {
		throw new Error(
			"Expected channel receiver to dispatch rendered-scene box-select request callback.",
		);
	}

	assertEqual(
		renderedBoxSelectRequest.request.objectViewStateGate,
		"visible-and-pickable-only",
		"Expected rendered box-select request callback to preserve editor object view-state gating.",
	);
	assertEqual(
		renderedBoxSelectRequest.requestId,
		"test-rendered-box-select:through-channel",
		"Expected rendered box-select request callback to preserve requestId.",
	);

	postLevelEditorDevPreviewMessage(
		channel,
		createRenderedSceneBoxSelectResultMessage({
			requestId: "test-rendered-box-select:through-channel",
			result: validRenderedSceneBoxSelectResult,
		}),
	);

	if (!renderedBoxSelectResult) {
		throw new Error(
			"Expected channel receiver to dispatch rendered-scene box-select result callback.",
		);
	}

	assertEqual(
		renderedBoxSelectResult.payload.hits?.[0]?.stableId,
		"portal-arena:portal:test",
		"Expected rendered box-select result callback to preserve stable IDs.",
	);
	assertEqual(
		renderedBoxSelectResult.payload.writesRuntimeData,
		false,
		"Expected rendered box-select result callback not to write runtime data.",
	);

	postLevelEditorDevPreviewMessage(
		channel,
		createRuntimeTelemetryMessage({
			requestId: "test-runtime-telemetry:through-channel",
			telemetry: validRuntimeTelemetry,
		}),
	);

	if (!runtimeTelemetry) {
		throw new Error("Expected channel receiver to accept runtime telemetry.");
	}

	assertEqual(
		runtimeTelemetry.lifecycle,
		"started",
		"Expected runtime telemetry callback to receive lifecycle.",
	);

	channel.post({ type: "invalid" });

	assertEqual(
		rejectedCount,
		1,
		"Expected invalid channel message to be reported once.",
	);

	connection.dispose();
	const messagesBeforeDisposedPost = channel.messages.length;
	postLevelEditorDevPreviewMessage(
		channel,
		createCollisionPreviewPatchMessage({
			requestId: "test-preview:after-dispose",
			patch: validPreviewPatch,
		}),
	);

	assertEqual(
		channel.messages.length,
		messagesBeforeDisposedPost + 1,
		"Expected disposed connection to leave sender posting behavior unchanged.",
	);
	assertEqual(
		appliedPreview.sourcePlanHash,
		validPreviewMessage.payload.sourcePlanHash,
		"Expected disposed connection to stop receiving later preview messages.",
	);
}

function assertRuntimePreviewPatchApplication(): void {
	const runtime = new EngineRuntime();
	const entity = runtime.world.createEntity();
	const sourceEntry = validPreviewPatch.entries[0];

	if (!sourceEntry || sourceEntry.colliderComponent.shape.type !== "box") {
		throw new Error("Expected test preview patch to include a box entry.");
	}

	const patch: CollisionCookPreviewPatch = {
		...validPreviewPatch,
		entries: [
			{
				...sourceEntry,
				transform: {
					position: [1, 2, 3],
					scale: [1, 1, 1],
				},
				colliderComponent: {
					...sourceEntry.colliderComponent,
					shape: {
						type: "box",
						halfExtents: [7, 8, 9],
					},
				},
			},
		],
	};
	const entry = patch.entries[0];

	if (!entry) {
		throw new Error("Expected test preview patch to keep one entry.");
	}

	runtime.world.addComponent(entity, STABLE_ID_COMPONENT, {
		id: entry.stableId,
	});
	runtime.world.addComponent(entity, PHYSICS_TRANSFORM_COMPONENT, {
		position: { x: 0, y: 0, z: 0 },
		rotation: { x: 0, y: 0, z: 0, w: 1 },
		scale: { x: 1, y: 1, z: 1 },
	});
	runtime.world.addComponent(entity, COLLIDER_COMPONENT, {
		intent: "solid",
		channel: "worldStatic",
		shape: {
			type: "box",
			halfExtents: { x: 1, y: 2, z: 3 },
		},
	});

	const result = applyCollisionPreviewPatchToRuntime(runtime, patch);

	if (!result.ok) {
		throw new Error(
			`Expected preview patch application to succeed, missing ${result.missingStableIds.join(", ")}.`,
		);
	}

	assertEqual(
		result.appliedStableIds.length,
		1,
		"Expected preview application to update one preview entry.",
	);

	const collider = runtime.world.requireComponent<{
		readonly shape: { readonly type: string; readonly halfExtents?: unknown };
	}>(entity, COLLIDER_COMPONENT);
	const transform = runtime.world.requireComponent<{
		readonly position: {
			readonly x: number;
			readonly y: number;
			readonly z: number;
		};
	}>(entity, PHYSICS_TRANSFORM_COMPONENT);

	assertEqual(
		collider.shape.type,
		"box",
		"Expected box collider after preview.",
	);
	assertDeepEqual(
		collider.shape.halfExtents,
		{ x: 7, y: 8, z: 9 },
		"Expected preview to convert box half extents into runtime Vec3 data.",
	);
	assertDeepEqual(
		transform.position,
		{ x: 1, y: 2, z: 3 },
		"Expected preview to update runtime transform position.",
	);

	const clearResult = clearCollisionPreviewPatchFromRuntime(runtime, {
		runtimeSceneId: patch.runtimeSceneId,
		sourcePlanHash: patch.sourcePlanHash,
		stableIds: [entry.stableId],
	});

	assertEqual(
		clearResult.clearedStableIds.length,
		1,
		"Expected clear-preview request to restore one preview snapshot.",
	);

	const restoredCollider = runtime.world.requireComponent<{
		readonly shape: { readonly type: string; readonly halfExtents?: unknown };
	}>(entity, COLLIDER_COMPONENT);
	const restoredTransform = runtime.world.requireComponent<{
		readonly position: {
			readonly x: number;
			readonly y: number;
			readonly z: number;
		};
	}>(entity, PHYSICS_TRANSFORM_COMPONENT);

	assertDeepEqual(
		restoredCollider.shape.halfExtents,
		{ x: 1, y: 2, z: 3 },
		"Expected clear preview to restore original collider half extents.",
	);
	assertDeepEqual(
		restoredTransform.position,
		{ x: 0, y: 0, z: 0 },
		"Expected clear preview to restore original transform position.",
	);

	const missingRuntime = new EngineRuntime();
	const missingResult = applyCollisionPreviewPatchToRuntime(
		missingRuntime,
		patch,
	);

	if (missingResult.ok) {
		throw new Error("Expected preview application to report missing entities.");
	}

	assertEqual(
		missingResult.missingStableIds.length,
		1,
		"Expected missing runtime preview application to report missing stable ID.",
	);
}

function assertCoreObjectRuntimePreviewApplication(): void {
	const runtime = new EngineRuntime();
	const player = createStableEntity(runtime, "player");
	const light = createStableEntity(runtime, "portal-arena:light:test");
	const portal = createStableEntity(runtime, "portal-arena:portal:test");
	const audio = createStableEntity(runtime, "portal-arena:audio:test");

	runtime.world.addComponent(player, PHYSICS_TRANSFORM_COMPONENT, {
		position: { x: 0, y: 0, z: 0 },
		rotation: { x: 0, y: 0, z: 0, w: 1 },
		scale: { x: 1, y: 1, z: 1 },
	});
	runtime.world.addComponent(light, LIGHT_COMPONENT, {
		kind: "point",
		color: "#ffffff",
		intensity: 1,
		distance: 4,
		decay: 2,
	});
	runtime.world.addComponent(portal, PORTAL_COMPONENT, {
		id: "portal",
		label: "Original Portal",
		targetRuntimeSceneId: "miranda_deck_runtime",
		activationRadius: 2,
	});
	runtime.world.addComponent(audio, SOUND_EMITTER_COMPONENT, {
		soundId: "audio_portal_cycle",
		volume: 0.1,
		loop: true,
	});

	const result = applyCoreObjectPreviewPatchToRuntime(
		runtime,
		validCoreObjectPreviewPatch,
	);

	if (!result.ok) {
		throw new Error(
			`Expected core preview application to succeed, missing ${result.missingStableIds.join(", ")}.`,
		);
	}

	assertEqual(
		result.appliedStableIds.length,
		4,
		"Expected core preview application to update four entries.",
	);
	assertDeepEqual(
		runtime.world.requireComponent<{
			readonly position: {
				readonly x: number;
				readonly y: number;
				readonly z: number;
			};
		}>(player, PHYSICS_TRANSFORM_COMPONENT).position,
		{ x: 1, y: 2, z: 3 },
		"Expected spawn preview to update player transform.",
	);
	assertEqual(
		runtime.world.requireComponent<{ readonly intensity: number }>(
			light,
			LIGHT_COMPONENT,
		).intensity,
		3.4,
		"Expected light preview to update light intensity.",
	);
	assertEqual(
		runtime.world.requireComponent<{ readonly targetRuntimeSceneId?: string }>(
			portal,
			PORTAL_COMPONENT,
		).targetRuntimeSceneId,
		"observatory_runtime",
		"Expected portal preview to update portal target.",
	);
	assertEqual(
		runtime.world.requireComponent<{ readonly volume?: number }>(
			audio,
			SOUND_EMITTER_COMPONENT,
		).volume,
		0.42,
		"Expected audio preview to update emitter volume.",
	);

	const clearResult = clearCoreObjectPreviewPatchFromRuntime(runtime, {
		runtimeSceneId: validCoreObjectPreviewPatch.runtimeSceneId,
		sourcePlanHash: validCoreObjectPreviewPatch.sourcePlanHash,
		stableIds: validCoreObjectPreviewPatch.entries.map(
			(entry) => entry.stableId,
		),
		targetKinds: ["spawn", "light", "portal", "audio-emitter"],
	});

	assertEqual(
		clearResult.clearedStableIds.length,
		4,
		"Expected core clear request to restore four snapshots.",
	);
	assertDeepEqual(
		runtime.world.requireComponent<{
			readonly position: {
				readonly x: number;
				readonly y: number;
				readonly z: number;
			};
		}>(player, PHYSICS_TRANSFORM_COMPONENT).position,
		{ x: 0, y: 0, z: 0 },
		"Expected core clear to restore player transform.",
	);
	assertEqual(
		runtime.world.requireComponent<{ readonly intensity: number }>(
			light,
			LIGHT_COMPONENT,
		).intensity,
		1,
		"Expected core clear to restore original light.",
	);
	assertEqual(
		runtime.world.requireComponent<{ readonly targetRuntimeSceneId?: string }>(
			portal,
			PORTAL_COMPONENT,
		).targetRuntimeSceneId,
		"miranda_deck_runtime",
		"Expected core clear to restore original portal target.",
	);
	assertEqual(
		runtime.world.requireComponent<{ readonly volume?: number }>(
			audio,
			SOUND_EMITTER_COMPONENT,
		).volume,
		0.1,
		"Expected core clear to restore original audio emitter.",
	);

	const missingRuntime = new EngineRuntime();
	const missingResult = applyCoreObjectPreviewPatchToRuntime(
		missingRuntime,
		validCoreObjectPreviewPatch,
	);

	if (missingResult.ok) {
		throw new Error(
			"Expected core preview application to report missing entities.",
		);
	}

	assertEqual(
		missingResult.missingStableIds.length,
		validCoreObjectPreviewPatch.entries.length,
		"Expected missing core preview application to report all missing stable IDs.",
	);
}

async function assertNoEditorModuleLeak(): Promise<void> {
	const scanRoots = [
		"src/app/devPreview",
		"src/app/GameClient.svelte",
		"src/app/browserGameClient.ts",
		"src/app/mountGameClient.ts",
	];
	const files = (
		await Promise.all(
			scanRoots.map((path) => collectSourceFiles(join(appRoot, path))),
		)
	).flat();
	const violations: string[] = [];

	for (const file of files) {
		const source = await readFile(file, "utf8");
		const rel = relative(appRoot, file).replaceAll(sep, "/");

		for (const specifier of extractImportSpecifiers(source)) {
			const resolved = resolveImportSpecifier(rel, specifier);

			if (
				resolved !== undefined &&
				(isEditorModulePath(resolved) || isGameEditorModulePath(resolved))
			) {
				violations.push(`${rel} imports editor module ${specifier}`);
			}
		}
	}

	if (violations.length > 0) {
		throw new Error(
			`Expected game-window preview modules to avoid editor imports:\n${violations.join("\n")}`,
		);
	}
}

function expectInvalidMessage(message: unknown, expectedError: string): void {
	try {
		parseLevelEditorDevPreviewMessage(message);
	} catch (error) {
		const errors = extractSchemaErrors(error);

		if (errors.some((item) => item.includes(expectedError))) {
			return;
		}

		throw new Error(
			`Expected preview protocol errors to include ${JSON.stringify(expectedError)}, received:\n${errors.join("\n")}`,
		);
	}

	throw new Error(
		`Expected preview protocol message to fail with ${JSON.stringify(expectedError)}.`,
	);
}

function expectInvalidSend(
	channel: LevelEditorPreviewChannelPort,
	message: unknown,
	expectedError: string,
): void {
	const messageCount =
		channel instanceof InMemoryPreviewChannel ? channel.messages.length : 0;

	try {
		postLevelEditorDevPreviewMessage(channel, message);
	} catch (error) {
		const errors = extractSchemaErrors(error);

		if (!errors.some((item) => item.includes(expectedError))) {
			throw new Error(
				`Expected sender validation errors to include ${JSON.stringify(expectedError)}, received:\n${errors.join("\n")}`,
			);
		}

		if (
			channel instanceof InMemoryPreviewChannel &&
			channel.messages.length !== messageCount
		) {
			throw new Error("Expected invalid preview send to avoid posting.");
		}

		return;
	}

	throw new Error(
		`Expected invalid preview send to fail with ${JSON.stringify(expectedError)}.`,
	);
}

function expectInvalidPreviewApplication(
	patch: CollisionCookPreviewPatch,
	expectedError: string,
): void {
	try {
		applyCollisionPreviewPatchToRuntime(new EngineRuntime(), patch);
	} catch (error) {
		const errors = extractSchemaErrors(error);

		if (errors.some((item) => item.includes(expectedError))) {
			return;
		}

		throw new Error(
			`Expected preview application errors to include ${JSON.stringify(expectedError)}, received:\n${errors.join("\n")}`,
		);
	}

	throw new Error(
		`Expected invalid preview application to fail with ${JSON.stringify(expectedError)}.`,
	);
}

async function collectSourceFiles(path: string): Promise<readonly string[]> {
	const pathStat = await stat(path);

	if (!pathStat.isDirectory()) {
		return isSourceFile(path) ? [path] : [];
	}

	const entries = await readdir(path, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const entryPath = join(path, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await collectSourceFiles(entryPath)));
			continue;
		}

		if (isSourceFile(entry.name)) {
			files.push(entryPath);
		}
	}

	return files;
}

function isSourceFile(path: string): boolean {
	return /\.(astro|svelte|ts)$/.test(path);
}

function extractImportSpecifiers(source: string): readonly string[] {
	const specifiers = new Set<string>();
	const patterns = [
		/\bfrom\s*["']([^"']+)["']/g,
		/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
		/^\s*import\s*["']([^"']+)["']/gm,
	];

	for (const pattern of patterns) {
		for (const match of source.matchAll(pattern)) {
			const specifier = match[1];

			if (specifier !== undefined) {
				specifiers.add(specifier);
			}
		}
	}

	return [...specifiers];
}

function resolveImportSpecifier(
	relativeFile: string,
	specifier: string,
): string | undefined {
	if (!specifier.startsWith(".")) {
		return undefined;
	}

	return stripSourceSuffix(
		normalize(join(dirname(relativeFile), specifier)).replaceAll(sep, "/"),
	);
}

function stripSourceSuffix(path: string): string {
	return path.replace(/\.(astro|svelte|ts|js|mjs|mts)$/, "");
}

function isEditorModulePath(path: string): boolean {
	return path === "src/app/editor" || path.startsWith("src/app/editor/");
}

function isGameEditorModulePath(path: string): boolean {
	return path === "src/game/editor" || path.startsWith("src/game/editor/");
}

function extractSchemaErrors(error: unknown): readonly string[] {
	if (error instanceof Error && "errors" in error) {
		const errors = (error as Error & { readonly errors?: readonly string[] })
			.errors;

		if (Array.isArray(errors)) {
			return errors;
		}
	}

	return [error instanceof Error ? error.message : "Invalid preview message."];
}

function createStableEntity(runtime: EngineRuntime, stableId: string) {
	const entity = runtime.world.createEntity();
	runtime.world.addComponent(entity, STABLE_ID_COMPONENT, { id: stableId });
	return entity;
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
	if (actual !== expected) {
		throw new Error(`${message} Expected ${expected}, received ${actual}.`);
	}
}

function assertDeepEqual<T>(actual: T, expected: T, message: string): void {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(
			`${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
		);
	}
}

class InMemoryPreviewChannel implements LevelEditorPreviewChannelPort {
	readonly name = "test-preview-channel";
	readonly messages: unknown[] = [];
	private readonly handlers =
		new Set<LevelEditorPreviewChannelMessageHandler>();
	private closed = false;

	post(message: unknown): void {
		if (this.closed) {
			throw new Error("Cannot post to a closed preview channel.");
		}

		this.messages.push(message);

		for (const handler of this.handlers) {
			handler(message);
		}
	}

	subscribe(handler: LevelEditorPreviewChannelMessageHandler): () => void {
		if (this.closed) {
			throw new Error("Cannot subscribe to a closed preview channel.");
		}

		this.handlers.add(handler);

		return () => {
			this.handlers.delete(handler);
		};
	}

	close(): void {
		this.handlers.clear();
	}
}

assertProtocolMessageValidation();
assertEditorPreviewSenderHelpers();
assertInvalidPreviewPatchRejection();
assertRuntimeTelemetryValidation();
assertRenderedSceneHitTestValidation();
assertReloadRequestShape();
assertClearPreviewRequestShape();
assertChannelSenderReceiverFlow();
assertRuntimePreviewPatchApplication();
assertCoreObjectRuntimePreviewApplication();
await assertNoEditorModuleLeak();

console.log("Live preview protocol contract passed.");
