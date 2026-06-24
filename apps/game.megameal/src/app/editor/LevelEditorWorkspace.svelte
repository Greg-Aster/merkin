<script lang="ts">
import { onDestroy, onMount } from "svelte";
import {
	type LevelEditorRenderedSceneBoxSelectResultPayload,
	type LevelEditorRenderedSceneHitTestResultPayload,
	type LevelEditorRuntimeTelemetryPayload,
	type LevelPrefabInstanceData,
	createCoreObjectPreviewClearRequestMessage,
	createCoreObjectPreviewPatchMessage,
	createRuntimeSceneReloadRequestMessage,
	parseLevelEditorDevPreviewMessage,
} from "../../engine/data/index.js";
import type {
	LevelEditorAuthoringEditOperation,
	LevelEditorAuthoringTransaction,
} from "../../engine/data/levelAuthoring/index.js";
import { buildEnvironmentAuthoringModel } from "../../game/editor/environmentAuthoring/index.js";
import { buildNpcAuthoringCatalog } from "../../game/editor/npcAuthoring/index.js";
import type { EditorObjectLibraryReplacementDraft } from "../../game/editor/objectLibrary/index.js";
import { getRuntimeSceneManifest } from "../../game/levels/index.js";
import {
	type LevelEditorPreviewChannelPort,
	createBrowserLevelEditorPreviewChannel,
} from "../devPreview/index.js";
import LevelEditorAiAssetLab from "./LevelEditorAiAssetLab.svelte";
import LevelEditorCameraPanel from "./LevelEditorCameraPanel.svelte";
import LevelEditorEnvironmentPanel from "./LevelEditorEnvironmentPanel.svelte";
import LevelEditorNpcPanel from "./LevelEditorNpcPanel.svelte";
import LevelEditorObjectLibraryPanel from "./LevelEditorObjectLibraryPanel.svelte";
import LevelEditorPreviewControls from "./LevelEditorPreviewControls.svelte";
import LevelEditorViewportBridgePanel from "./LevelEditorViewportBridgePanel.svelte";
import {
	fetchLevelEditorAuthoringStatus,
	runLevelEditorAuthoringCommand,
} from "./levelEditorAuthoringClient.js";
import {
	type LevelEditorQueuedAuthoringOperation,
	buildLevelEditorAuthoringTransactionFromQueue,
	createLevelEditorAuthoringQueue,
	redoLevelEditorAuthoringQueue,
	removeLevelEditorAuthoringOperationEntry,
	removeLevelEditorStagedFieldEdit,
	stageLevelEditorAuthoringOperations,
	stageLevelEditorFieldEdit,
	undoLevelEditorAuthoringQueue,
} from "./levelEditorAuthoringStore.js";
import {
	buildCoreObjectPreviewEntry,
	objectLibraryComponentSnapshots,
} from "./levelEditorCoreObjectPreviewPatch.js";
import {
	serializeEnvironmentAuthoringModel,
	serializeNpcAuthoringCatalog,
} from "./levelEditorEnvironmentPanels.js";
import {
	type LevelEditorObjectLibraryPanelEntry,
	buildLevelEditorObjectLibraryPanelModel,
	createObjectLibraryReplacementPreviewMessage,
	createObjectLibraryStagedPlacement,
	objectLibrarySubjectFromSelection,
} from "./levelEditorObjectLibrary.js";
import {
	type LevelEditorObjectViewStatePatch,
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
} from "./levelEditorObjectViewStateModel.js";
import {
	type LevelEditorOutlinerCategoryFilter,
	type LevelEditorOutlinerLockFilter,
	type LevelEditorOutlinerPickabilityFilter,
	type LevelEditorOutlinerVisibilityFilter,
	matchesLevelEditorOutlinerFilters,
} from "./levelEditorOutlinerFilters.js";
import { sendLevelEditorDevPreviewMessage } from "./levelEditorPreviewSender.js";
import {
	type LevelEditorRenderedBoxSelectViewportRequestOptions,
	type LevelEditorRenderedHitTestViewportRequestOptions,
	type LevelEditorRenderedSelectionPendingRequest,
	consumeLevelEditorRenderedBoxSelectSelectionResult,
	consumeLevelEditorRenderedHitTestSelectionResult,
	requestLevelEditorRenderedBoxSelectSelection,
	requestLevelEditorRenderedHitTestSelection,
} from "./levelEditorRenderedHitTestSelection.js";
import {
	createLevelEditorSelectionState,
	selectLevelEditorObject,
	selectLevelEditorObjects,
} from "./levelEditorSelectionModel.js";
import type { LevelEditorSessionSummary } from "./levelEditorSession.js";
import {
	type LevelEditorViewportBridgeConnectionStatus,
	type LevelEditorViewportBridgeViewMode,
	type LevelEditorViewportCameraMode,
	type LevelEditorViewportGizmoMode,
	type LevelEditorViewportInteractionTool,
	type LevelEditorViewportNormalizedPoint,
	type LevelEditorViewportOverlayId,
	buildLevelEditorViewportBridgeModel,
	viewportPlacementPositionFromNormalizedPoint,
	viewportProjectedTransformPositionFromNormalizedPoint,
} from "./levelEditorViewportBridgeModel.js";
import type {
	LevelEditorWorkspaceCategory,
	LevelEditorWorkspaceCommand,
	LevelEditorWorkspaceCommandPlan,
	LevelEditorWorkspaceField,
	LevelEditorWorkspaceObject,
} from "./levelEditorWorkspaceModel.js";
import {
	type LevelEditorStagedFieldEdit,
	type LevelEditorStagedPublishReadiness,
	buildStagedPublishReadiness,
	commandPlanOutputMessage,
	createWorkspaceOutputLogEntry,
	findStagedFieldEdit,
	previewTargetsForStagedEdits,
	readEditorInputValue,
} from "./levelEditorWorkspaceUi.js";

type Props = {
	readonly serializedEditorSession: string;
};

type PreviewStatus = {
	readonly kind: "idle" | "ready" | "sent" | "error";
	readonly label: string;
};

type RuntimeTelemetryState = "waiting" | "live" | "stale";

type SelectedInstanceRemovalReadiness = {
	readonly canStage: boolean;
	readonly requiredForReadiness: boolean;
	readonly alreadyStaged: boolean;
	readonly queueEntryId: string | null;
	readonly reason: string;
};

type SelectedInstanceDuplicationReadiness = {
	readonly canStage: boolean;
	readonly sourceStableId: string | null;
	readonly duplicateStableId: string | null;
	readonly queueEntryId: string | null;
	readonly reason: string;
};

const { serializedEditorSession }: Props = $props();
const editorSession = JSON.parse(
	serializedEditorSession,
) as LevelEditorSessionSummary;
const workspace = editorSession.workspace;
const objectViewStateStorageKey = buildLevelEditorObjectViewStateStorageKey(
	workspace.selectedRuntimeSceneId,
);
let selectedStableIds: readonly string[] = $state(initialSelectedStableIds());
let selectedGraphNode: string = $state("authored-level");
let selectedObjectLibraryEntryId: string | null = $state(null);
let objectViewStateByStableId: Readonly<
	Record<string, LevelEditorObjectViewStatePatch>
> = $state(resetLevelEditorObjectViewState());
let objectViewStateSource: "editor-memory" | "browser-local-editor-workspace" =
	$state("editor-memory");
let outlinerSearchQuery = $state("");
let outlinerCategoryFilter: LevelEditorOutlinerCategoryFilter = $state("all");
let outlinerVisibilityFilter: LevelEditorOutlinerVisibilityFilter =
	$state("all");
let outlinerLockFilter: LevelEditorOutlinerLockFilter = $state("all");
let outlinerPickabilityFilter: LevelEditorOutlinerPickabilityFilter =
	$state("all");
const editorSelectionState = $derived(
	createLevelEditorSelectionState({
		objects: workspace.objects,
		selectedStableIds,
	}),
);
const selectedStableId = $derived(editorSelectionState.primaryStableId ?? "");
const selectedWorkspaceObject = $derived(
	workspace.objects.find((object) => object.stableId === selectedStableId),
);
const objectViewStateModel = $derived(
	buildLevelEditorObjectViewStateModel({
		objects: workspace.objects,
		stateByStableId: objectViewStateByStableId,
		stateSource: objectViewStateSource,
	}),
);
const outlinerFiltersActive = $derived(
	outlinerSearchQuery.trim().length > 0 ||
		outlinerCategoryFilter !== "all" ||
		outlinerVisibilityFilter !== "all" ||
		outlinerLockFilter !== "all" ||
		outlinerPickabilityFilter !== "all",
);
const filteredSceneTree = $derived(
	workspace.sceneTree
		.map((group) => ({
			...group,
			objects: group.objects.filter((object) =>
				matchesLevelEditorOutlinerFilters({
					group,
					object,
					viewState: objectViewStateForStableId(object.stableId),
					filters: {
						query: outlinerSearchQuery,
						category: outlinerCategoryFilter,
						visibility: outlinerVisibilityFilter,
						lock: outlinerLockFilter,
						pickability: outlinerPickabilityFilter,
					},
				}),
			),
		}))
		.filter((group) => group.objects.length > 0),
);
const filteredOutlinerObjectCount = $derived(
	filteredSceneTree.reduce((count, group) => count + group.objects.length, 0),
);
const filteredOutlinerStableIds = $derived(
	filteredSceneTree.flatMap((group) =>
		group.objects.map((object) => object.stableId),
	),
);
const objectFocusGroups = $derived(
	workspace.sceneTree.filter((group) => group.objects.length > 0),
);
const selectedObjectFocusGroup = $derived(
	objectFocusGroups.find(
		(group) => group.category === selectedWorkspaceObject?.category,
	) ?? objectFocusGroups[0],
);
const selectedRuntimeSceneManifest = $derived(
	getRuntimeSceneManifest(workspace.selectedRuntimeSceneId),
);
const selectedObjectLibrarySubject = $derived(
	selectedWorkspaceObject
		? objectLibrarySubjectFromSelection({
				stableId: selectedWorkspaceObject.stableId,
				label: selectedWorkspaceObject.label,
				prefabId: selectedWorkspaceObject.prefabId,
				sourceOwner: selectedWorkspaceObject.sourceOwner,
				componentNames: selectedWorkspaceObject.componentNames,
				assetIds: selectedWorkspaceObject.assetIds,
				...objectLibraryComponentSnapshots(selectedWorkspaceObject),
			})
		: null,
);
const objectLibraryPanelModel = $derived(
	buildLevelEditorObjectLibraryPanelModel({
		runtimeSceneId: workspace.selectedRuntimeSceneId,
		levelId: workspace.selectedLevelId,
		selectedObject: selectedObjectLibrarySubject,
		selectedEntryId: selectedObjectLibraryEntryId,
		sceneObjects: workspace.objects,
	}),
);
const viewportPlacementTarget = $derived(buildViewportPlacementTarget());
const serializedEnvironmentModel = $derived(
	serializeEnvironmentAuthoringModel(
		buildEnvironmentAuthoringModel(selectedRuntimeSceneManifest),
	),
);
const serializedNpcCatalog = serializeNpcAuthoringCatalog(
	buildNpcAuthoringCatalog(),
);
let channel: LevelEditorPreviewChannelPort | undefined = $state();
let status: PreviewStatus = $state({
	kind: "idle",
	label: "Preview channel initializing",
});
let liveCoreObjectPreviewStableIds: readonly string[] = $state([]);
let authoringQueue = $state(createLevelEditorAuthoringQueue());
const stagedFieldEdits = $derived(authoringQueue.stagedFieldEdits);
const queuedAuthoringOperationEntries = $derived(
	authoringQueue.queuedOperations,
);
const stagedPublishReadiness = $derived(
	buildStagedPublishReadiness({
		stagedFieldEdits,
		queuedOperations: queuedAuthoringOperationEntries,
	}),
);
const selectedInstanceRemovalReadiness = $derived(
	buildSelectedInstanceRemovalReadiness(),
);
const selectedInstanceDuplicationReadiness = $derived(
	buildSelectedInstanceDuplicationReadiness(),
);
let latestTransaction: LevelEditorAuthoringTransaction | undefined = $state();
let selectedCommandPlanId: "build" | "publish" = $state("build");
const dirtyCount = $derived(authoringQueue.dirtyCount);
const hasDirtyState = $derived(dirtyCount > 0);
const selectedCommandPlan: LevelEditorWorkspaceCommandPlan = $derived(
	selectedCommandPlanId === "publish"
		? workspace.commandPlans.publish
		: workspace.commandPlans.build,
);
let outputLog = $state([...workspace.outputLog]);
let runtimeTelemetry: LevelEditorRuntimeTelemetryPayload | undefined = $state();
let runtimeTelemetryState: RuntimeTelemetryState = $state("waiting");
let lastRuntimeTelemetryReceivedAt: number | undefined = $state();
let pendingRenderedSceneHitTest: LevelEditorRenderedSelectionPendingRequest | null =
	$state(null);
let pendingRenderedSceneBoxSelect: LevelEditorRenderedSelectionPendingRequest | null =
	$state(null);
let activeCommandId: LevelEditorWorkspaceCommand["id"] | null = $state(null);
let viewportBridgeViewMode: LevelEditorViewportBridgeViewMode =
	$state("live-game");
let viewportCameraMode: LevelEditorViewportCameraMode = $state("orbit");
let viewportCameraZoomPercent = $state(100);
let viewportInteractionTool: LevelEditorViewportInteractionTool =
	$state("select");
let viewportTransformMode: LevelEditorViewportGizmoMode = $state("translate");
let viewportTranslateSnapStep = $state(0.1);
let viewportRotateSnapStep = $state(15);
let viewportScaleSnapStep = $state(0.05);
let enabledViewportOverlayIds: readonly LevelEditorViewportOverlayId[] = $state(
	["selection-outline", "object-labels", "transform-origin"],
);
let unsubscribeRuntimeTelemetry: (() => void) | undefined;
let telemetryFreshnessTimer: number | undefined;
const viewportBridgeConnectionStatus: LevelEditorViewportBridgeConnectionStatus =
	$derived(
		runtimeTelemetryState === "live"
			? "live"
			: runtimeTelemetryState === "stale"
				? "unavailable"
				: channel
					? "ready"
					: "inactive",
	);
const renderedSceneSelectionRequestReady = $derived(
	runtimeTelemetryState === "live" &&
		runtimeTelemetry?.runtimeSceneId === workspace.selectedRuntimeSceneId,
);
const viewportBridgeModel = $derived(
	buildLevelEditorViewportBridgeModel({
		workspace,
		selectedStableId: selectedStableId === "" ? null : selectedStableId,
		selectedStableIds: editorSelectionState.selectedStableIds,
		objectViewState: {
			visibleStableIds: objectViewStateModel.visibleStableIds,
			pickableStableIds: objectViewStateModel.pickableStableIds,
			lockedStableIds: objectViewStateModel.lockedStableIds,
		},
		viewMode: viewportBridgeViewMode,
		enabledOverlayIds: enabledViewportOverlayIds,
		connectionStatus: viewportBridgeConnectionStatus,
		liveRuntimeSceneId: runtimeTelemetry?.runtimeSceneId ?? null,
		fieldValueOverrides: stagedFieldEdits,
		transformMode: viewportTransformMode,
		transformSnapSteps: {
			translate: viewportTranslateSnapStep,
			rotate: viewportRotateSnapStep,
			scale: viewportScaleSnapStep,
		},
		cameraMode: viewportCameraMode,
		cameraZoomPercent: viewportCameraZoomPercent,
		interactionTool: viewportInteractionTool,
		renderedHitTestRequestReadiness:
			channel &&
			runtimeTelemetryState === "live" &&
			runtimeTelemetry?.runtimeSceneId === workspace.selectedRuntimeSceneId
				? "available"
				: "unavailable",
	}),
);

onMount(() => {
	restoreObjectViewStateFromBrowserStorage();
	channel = createBrowserLevelEditorPreviewChannel();
	status = channel
		? { kind: "ready", label: "Preview channel ready" }
		: { kind: "error", label: "Preview channel unavailable" };

	if (channel) {
		unsubscribeRuntimeTelemetry = channel.subscribe(handleDevPreviewMessage);
		telemetryFreshnessTimer = globalThis.setInterval(
			updateRuntimeTelemetryState,
			500,
		);
	}
});

onDestroy(() => {
	unsubscribeRuntimeTelemetry?.();
	if (telemetryFreshnessTimer !== undefined) {
		globalThis.clearInterval(telemetryFreshnessTimer);
	}
	channel?.close();
});

function selectedObject(): LevelEditorWorkspaceObject | undefined {
	return selectedWorkspaceObject;
}

function initialSelectedStableIds(): readonly string[] {
	const stableId = workspace.selectedStableId ?? workspace.objects[0]?.stableId;

	return stableId ? [stableId] : [];
}

function openRuntimeScene(event: Event): void {
	const select = event.currentTarget as HTMLSelectElement;
	const url = new URL(globalThis.location.href);
	url.searchParams.set("scene", select.value);
	globalThis.location.assign(url.toString());
}

function selectObject(
	stableId: string,
	options: { readonly additive?: boolean } = {},
): void {
	const nextSelectionState = selectLevelEditorObject({
		state: editorSelectionState,
		stableId,
		additive: options.additive,
	});
	selectedStableIds = nextSelectionState.selectedStableIds;
	const object = nextSelectionState.primaryObject;
	selectedGraphNode = object ? `category:${object.category}` : "authored-level";
}

function selectObjectFromPointer(event: MouseEvent, stableId: string): void {
	selectObject(stableId, { additive: event.ctrlKey || event.metaKey });
}

function selectObjects(
	stableIds: readonly string[],
	options: { readonly additive?: boolean } = {},
): void {
	const nextSelectionState = selectLevelEditorObjects({
		state: editorSelectionState,
		stableIds,
		additive: options.additive,
	});
	selectedStableIds = nextSelectionState.selectedStableIds;
	const object = nextSelectionState.primaryObject;
	selectedGraphNode = object ? `category:${object.category}` : "authored-level";
}

function makePrimarySelection(stableId: string): void {
	selectObjects([
		stableId,
		...editorSelectionState.selectedStableIds.filter(
			(selectedStableId) => selectedStableId !== stableId,
		),
	]);
}

function removeObjectFromSelection(stableId: string): void {
	selectObjects(
		editorSelectionState.selectedStableIds.filter(
			(selectedStableId) => selectedStableId !== stableId,
		),
	);
}

function objectIsSelected(stableId: string): boolean {
	return editorSelectionState.selectedStableIds.includes(stableId);
}

function objectIsPrimarySelection(stableId: string): boolean {
	return editorSelectionState.primaryStableId === stableId;
}

function selectObjectGroup(category: LevelEditorWorkspaceCategory): void {
	const group = objectFocusGroups.find((item) => item.category === category);
	const firstObject = group?.objects[0];

	if (firstObject) {
		selectObject(firstObject.stableId);
	}
}

function resetOutlinerFilters(): void {
	outlinerSearchQuery = "";
	outlinerCategoryFilter = "all";
	outlinerVisibilityFilter = "all";
	outlinerLockFilter = "all";
	outlinerPickabilityFilter = "all";
}

function selectFilteredOutlinerObjects(): void {
	selectObjects(filteredOutlinerStableIds);
}

function addFilteredOutlinerObjectsToSelection(): void {
	selectObjects(filteredOutlinerStableIds, { additive: true });
}

function clearObjectSelection(): void {
	selectObjects([]);
}

function restoreObjectViewStateFromBrowserStorage(): void {
	const storage = browserLocalStorage();
	const serialized = storage?.getItem(objectViewStateStorageKey);

	if (!storage || !serialized) {
		return;
	}

	const result = parseLevelEditorObjectViewStatePersistence({
		serialized,
		expectedRuntimeSceneId: workspace.selectedRuntimeSceneId,
	});

	if (!result.ok) {
		storage.removeItem(objectViewStateStorageKey);
		appendOutputLog({
			level: "warning",
			source: "object-view-state",
			message: `Discarded saved editor object view state: ${result.reason}`,
		});
		return;
	}

	objectViewStateByStableId = result.envelope.stateByStableId;
	objectViewStateSource = "browser-local-editor-workspace";
	appendOutputLog({
		level: "info",
		source: "object-view-state",
		message: `Restored browser-local object view state for ${workspace.selectedRuntimeSceneId}.`,
	});
}

function setObjectViewStateByStableId(
	nextState: Readonly<Record<string, LevelEditorObjectViewStatePatch>>,
): void {
	objectViewStateByStableId = nextState;
	const storage = browserLocalStorage();

	if (!storage) {
		objectViewStateSource = "editor-memory";
		return;
	}

	if (Object.keys(nextState).length === 0) {
		storage.removeItem(objectViewStateStorageKey);
		objectViewStateSource = "editor-memory";
		return;
	}

	try {
		storage.setItem(
			objectViewStateStorageKey,
			serializeLevelEditorObjectViewStatePersistence({
				runtimeSceneId: workspace.selectedRuntimeSceneId,
				stateByStableId: nextState,
			}),
		);
		objectViewStateSource = "browser-local-editor-workspace";
	} catch {
		objectViewStateSource = "editor-memory";
		appendOutputLog({
			level: "warning",
			source: "object-view-state",
			message:
				"Object view state stayed in editor memory because browser-local storage was unavailable.",
		});
	}
}

function browserLocalStorage(): Storage | null {
	try {
		return globalThis.localStorage ?? null;
	} catch {
		return null;
	}
}

function toggleObjectVisible(stableId: string): void {
	const viewState = objectViewStateForStableId(stableId);
	setObjectViewStateByStableId(
		setLevelEditorObjectVisible(
			objectViewStateByStableId,
			stableId,
			!viewState.visible,
		),
	);
}

function toggleObjectLocked(stableId: string): void {
	const viewState = objectViewStateForStableId(stableId);
	setObjectViewStateByStableId(
		setLevelEditorObjectLocked(
			objectViewStateByStableId,
			stableId,
			!viewState.locked,
		),
	);
}

function toggleObjectIsolated(stableId: string): void {
	const viewState = objectViewStateForStableId(stableId);
	setObjectViewStateByStableId(
		setLevelEditorObjectIsolated(
			objectViewStateByStableId,
			stableId,
			!viewState.isolated,
		),
	);
}

function clearObjectViewState(stableId: string): void {
	setObjectViewStateByStableId(
		clearLevelEditorObjectViewStateForStableId(
			objectViewStateByStableId,
			stableId,
		),
	);
}

function clearAllObjectIsolation(): void {
	setObjectViewStateByStableId(
		clearLevelEditorObjectIsolation(objectViewStateByStableId),
	);
}

function resetObjectViewState(): void {
	setObjectViewStateByStableId(resetLevelEditorObjectViewState());
}

function objectViewStateForStableId(stableId: string) {
	return levelEditorObjectViewStateForStableId(objectViewStateModel, stableId);
}

function selectViewportBridgeViewMode(
	mode: LevelEditorViewportBridgeViewMode,
): void {
	viewportBridgeViewMode = mode;
}

function selectViewportCameraMode(mode: LevelEditorViewportCameraMode): void {
	viewportCameraMode = mode;
}

function selectViewportCameraZoomPercent(zoomPercent: number): void {
	if (!Number.isFinite(zoomPercent)) {
		return;
	}

	viewportCameraZoomPercent = Math.max(25, Math.min(400, zoomPercent));
}

function selectViewportInteractionTool(
	tool: LevelEditorViewportInteractionTool,
): void {
	if (tool === "place" && !viewportPlacementTarget?.canStage) {
		return;
	}

	viewportInteractionTool = tool;
}

function selectViewportTransformMode(mode: LevelEditorViewportGizmoMode): void {
	viewportTransformMode = mode;
}

function selectViewportTransformSnapStep(
	mode: LevelEditorViewportGizmoMode,
	step: number,
): void {
	if (!Number.isFinite(step) || step <= 0) {
		return;
	}

	switch (mode) {
		case "translate":
			viewportTranslateSnapStep = step;
			return;
		case "rotate":
			viewportRotateSnapStep = step;
			return;
		case "scale":
			viewportScaleSnapStep = step;
			return;
	}
}

function toggleViewportBridgeOverlay(id: LevelEditorViewportOverlayId): void {
	const activeIds = new Set(enabledViewportOverlayIds);

	if (activeIds.has(id)) {
		activeIds.delete(id);
	} else {
		activeIds.add(id);
	}

	enabledViewportOverlayIds = [...activeIds];
}

function selectObjectLibraryEntry(entryId: string): void {
	selectedObjectLibraryEntryId = entryId;
}

function selectedInstanceRemovalQueueEntryId(stableId: string): string {
	return `selected-instance-removal:${workspace.selectedRuntimeSceneId}:${stableId}`;
}

function selectedInstanceDuplicateQueueEntryId(stableId: string): string {
	return `selected-instance-duplicate:${workspace.selectedRuntimeSceneId}:${stableId}`;
}

function buildSelectedInstanceDuplicationReadiness(): SelectedInstanceDuplicationReadiness {
	const object = selectedWorkspaceObject;

	if (!object) {
		return {
			canStage: false,
			sourceStableId: null,
			duplicateStableId: null,
			queueEntryId: null,
			reason: "Select a level instance before staging duplication.",
		};
	}

	if (!sourceInstanceForSelectedObject(object.stableId)) {
		return {
			canStage: false,
			sourceStableId: object.stableId,
			duplicateStableId: null,
			queueEntryId: null,
			reason:
				"Selected object is not backed by a manifest level instance that can be duplicated.",
		};
	}

	const duplicateStableId = nextDuplicateStableId(object.stableId);

	return {
		canStage: true,
		sourceStableId: object.stableId,
		duplicateStableId,
		queueEntryId: selectedInstanceDuplicateQueueEntryId(duplicateStableId),
		reason:
			"Stages a duplicate as a generated level-instance insertion with a small position offset.",
	};
}

function buildSelectedInstanceRemovalReadiness(): SelectedInstanceRemovalReadiness {
	const object = selectedWorkspaceObject;

	if (!object) {
		return {
			canStage: false,
			requiredForReadiness: false,
			alreadyStaged: false,
			queueEntryId: null,
			reason: "Select a level instance before staging removal.",
		};
	}

	const queueEntryId = selectedInstanceRemovalQueueEntryId(object.stableId);
	const alreadyStaged = authoringQueue.queuedOperations.some(
		(entry) => entry.id === queueEntryId,
	);
	const readinessReason = readinessRequiredStableIdReason(object.stableId);

	if (readinessReason !== null) {
		return {
			canStage: false,
			requiredForReadiness: true,
			alreadyStaged,
			queueEntryId,
			reason: readinessReason,
		};
	}

	if (alreadyStaged) {
		return {
			canStage: false,
			requiredForReadiness: false,
			alreadyStaged,
			queueEntryId,
			reason: "Removal is already staged for this selected instance.",
		};
	}

	return {
		canStage: true,
		requiredForReadiness: false,
		alreadyStaged,
		queueEntryId,
		reason:
			"Stages a bounded level-instance removal through the generated level owner path.",
	};
}

function readinessRequiredStableIdReason(stableId: string): string | null {
	const readiness = selectedRuntimeSceneManifest.readiness;

	if (stableId === readiness.playerStableId) {
		return `Cannot remove "${stableId}" because it is the runtime scene player readiness stable ID.`;
	}

	if ((readiness.requiredCollisionStableIds ?? []).includes(stableId)) {
		return `Cannot remove "${stableId}" because runtime readiness requires it as collision.`;
	}

	if ((readiness.requiredWalkableStableIds ?? []).includes(stableId)) {
		return `Cannot remove "${stableId}" because runtime readiness requires it as walkable ground.`;
	}

	if ((readiness.requiredLightStableIds ?? []).includes(stableId)) {
		return `Cannot remove "${stableId}" because runtime readiness requires it as an authored light.`;
	}

	return null;
}

function sourceInstanceForSelectedObject(
	stableId: string,
): LevelPrefabInstanceData | null {
	return (
		selectedRuntimeSceneManifest.level.instances.find(
			(instance) => instance.stableId === stableId,
		) ?? null
	);
}

function nextDuplicateStableId(sourceStableId: string): string {
	const existingStableIds = new Set([
		...workspace.objects.map((object) => object.stableId),
		...authoringQueue.queuedOperations.flatMap((entry) =>
			(entry.operations ?? []).flatMap((operation) =>
				operation.kind === "insert-instance"
					? [operation.instance.stableId]
					: [],
			),
		),
		...authoringQueue.queuedOperations.flatMap((entry) =>
			(entry.saveOperations ?? []).map((operation) => operation.subjectId),
		),
	]);
	const baseId = `${sourceStableId}:duplicate`;
	let index = 1;
	let candidate = `${baseId}-${index}`;

	while (existingStableIds.has(candidate)) {
		index += 1;
		candidate = `${baseId}-${index}`;
	}

	return candidate;
}

function stageSelectedInstanceRemoval(): void {
	const object = selectedWorkspaceObject;
	const readiness = selectedInstanceRemovalReadiness;

	if (!object || !readiness.canStage || readiness.queueEntryId === null) {
		appendOutputLog({
			level: "warning",
			source: "remove-instance",
			message: readiness.reason,
		});
		return;
	}

	const operation = {
		id: `remove-instance:${workspace.selectedRuntimeSceneId}:${object.stableId}`,
		kind: "remove-instance",
		persistence: "saved",
		stableId: object.stableId,
		note: "Selected level instance removal staged from the workbench.",
	} satisfies LevelEditorAuthoringEditOperation;

	stageAuthoringOperationEntry({
		id: readiness.queueEntryId,
		label: `Remove ${object.label}`,
		operations: [operation],
	});
	status = {
		kind: "ready",
		label: `Staged removal for ${object.stableId}`,
	};
}

function stageSelectedInstanceDuplicate(): void {
	const object = selectedWorkspaceObject;
	const readiness = selectedInstanceDuplicationReadiness;
	const sourceInstance =
		readiness.sourceStableId === null
			? null
			: sourceInstanceForSelectedObject(readiness.sourceStableId);

	if (
		!object ||
		!sourceInstance ||
		!readiness.canStage ||
		readiness.duplicateStableId === null ||
		readiness.queueEntryId === null
	) {
		appendOutputLog({
			level: "warning",
			source: "duplicate-instance",
			message: readiness.reason,
		});
		return;
	}

	const duplicateInstance = duplicateLevelInstance({
		sourceInstance,
		stableId: readiness.duplicateStableId,
		position: selectedViewportPlacementPosition(),
	});
	const operation = {
		id: `duplicate-instance:${workspace.selectedRuntimeSceneId}:${duplicateInstance.stableId}`,
		kind: "insert-instance",
		persistence: "saved",
		instance: duplicateInstance,
		note: "Selected level instance duplicate staged from the workbench.",
	} satisfies LevelEditorAuthoringEditOperation;

	stageAuthoringOperationEntry({
		id: readiness.queueEntryId,
		label: `Duplicate ${object.label}`,
		operations: [operation],
	});
	status = {
		kind: "ready",
		label: `Staged duplicate ${duplicateInstance.stableId}`,
	};
}

function duplicateLevelInstance(options: {
	readonly sourceInstance: LevelPrefabInstanceData;
	readonly stableId: string;
	readonly position: readonly [number, number, number] | null;
}): LevelPrefabInstanceData {
	const sourceTransform = options.sourceInstance.transform;
	const sourcePosition = options.position ?? sourceTransform?.position ?? null;
	const transform =
		sourceTransform === undefined && sourcePosition === null
			? undefined
			: {
					...(sourceTransform === undefined
						? {}
						: cloneEditorValue(sourceTransform)),
					...(sourcePosition === null
						? {}
						: {
								position: [
									roundEditorNumber(sourcePosition[0] + 1),
									roundEditorNumber(sourcePosition[1]),
									roundEditorNumber(sourcePosition[2] + 1),
								] satisfies readonly [number, number, number],
							}),
				};

	return {
		id: options.stableId,
		stableId: options.stableId,
		prefabId: options.sourceInstance.prefabId,
		...(options.sourceInstance.components === undefined
			? {}
			: { components: cloneEditorValue(options.sourceInstance.components) }),
		...(transform === undefined ? {} : { transform }),
	};
}

function cloneEditorValue<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function roundEditorNumber(value: number): number {
	return Math.round(value * 1000) / 1000;
}

function objectLibraryEntryById(
	entryId: string,
): LevelEditorObjectLibraryPanelEntry | null {
	return (
		objectLibraryPanelModel.groups
			.flatMap((group) => group.entries)
			.find((entry) => entry.id === entryId) ?? null
	);
}

function buildViewportPlacementTarget(): {
	readonly entryId: string;
	readonly label: string;
	readonly status: string;
	readonly targetLabel: string;
	readonly canStage: boolean;
	readonly writesFiles: boolean;
	readonly reason: string;
} | null {
	const entry = objectLibraryPanelModel.selectedEntry;
	const draft = entry?.placementReadiness.placementDraft;
	const position = viewportPlacementPosition();
	const selectedPosition = selectedViewportPlacementPosition();

	if (!entry || !draft) {
		return null;
	}

	return {
		entryId: entry.id,
		label: entry.label,
		status: entry.placementReadiness.status,
		targetLabel: position
			? `x ${position[0].toFixed(2)} / y ${position[1].toFixed(2)} / z ${position[2].toFixed(2)}`
			: "viewport placement surface unavailable",
		canStage: entry.canStagePlacementDraft && position !== null,
		writesFiles: entry.placementReadiness.writesFiles,
		reason:
			position === null
				? "The viewport does not expose transform-positioned bounds for placement."
				: selectedPosition === null
					? "Stages a draft placement at the center of the viewport placement surface. Drop onto the viewport to choose a specific X/Z point."
					: "Stages a draft placement at the selected viewport object position. Drop onto the viewport to choose a specific X/Z point.",
	};
}

function viewportPlacementPosition(
	point?: LevelEditorViewportNormalizedPoint,
): readonly [number, number, number] | null {
	if (point) {
		return viewportPlacementPositionFromNormalizedPoint({
			surface: viewportBridgeModel.projection.placementSurface,
			point,
			y: selectedViewportPlacementY(),
		});
	}

	const selectedPosition = selectedViewportPlacementPosition();

	if (selectedPosition !== null) {
		return selectedPosition;
	}

	return viewportPlacementPositionFromNormalizedPoint({
		surface: viewportBridgeModel.projection.placementSurface,
		point: { xPercent: 50, zPercent: 50 },
		y: selectedViewportPlacementY(),
	});
}

function selectedViewportPlacementPosition():
	| readonly [number, number, number]
	| null {
	const object = selectedWorkspaceObject;

	if (!object) {
		return null;
	}

	const x = numberFieldDisplayValue(object, "Transform.position.x");
	const y = numberFieldDisplayValue(object, "Transform.position.y");
	const z = numberFieldDisplayValue(object, "Transform.position.z");

	if (x === null || y === null || z === null) {
		return null;
	}

	return [x, y, z];
}

function selectedViewportPlacementY(): number {
	const object = selectedWorkspaceObject;

	if (!object) {
		return 0;
	}

	return numberFieldDisplayValue(object, "Transform.position.y") ?? 0;
}

function numberFieldDisplayValue(
	object: LevelEditorWorkspaceObject,
	path: string,
): number | null {
	const field = object.fields.find((item) => item.path === path);

	if (!field) {
		return null;
	}

	const value = Number(fieldDisplayValue(object, field));

	return Number.isFinite(value) ? value : null;
}

function stageDroppedObjectLibraryPlacement(
	entryId: string,
	point: LevelEditorViewportNormalizedPoint,
	source: "viewport-click" | "viewport-drop" = "viewport-drop",
): void {
	selectObjectLibraryEntry(entryId);
	stageViewportPlacementAtTarget(entryId, point, source);
}

function stageViewportPlacementAtTarget(
	entryId?: string,
	point?: LevelEditorViewportNormalizedPoint,
	source?: "viewport-click" | "viewport-drop",
): void {
	const entry =
		entryId === undefined
			? objectLibraryPanelModel.selectedEntry
			: objectLibraryEntryById(entryId);
	const draft = entry?.placementReadiness.placementDraft;
	const position = viewportPlacementPosition(point);

	if (!entry || !draft || position === null || !entry.canStagePlacementDraft) {
		return;
	}

	const queuedEntryId = `object-library-viewport-placements:${workspace.selectedRuntimeSceneId}`;
	const existingEntry = authoringQueue.queuedOperations.find(
		(item) => item.id === queuedEntryId,
	);
	const stagedPlacement = createObjectLibraryStagedPlacement({
		runtimeSceneId: workspace.selectedRuntimeSceneId,
		entry,
		draft,
		index: (existingEntry?.saveOperations?.length ?? 0) + 1,
		source:
			point === undefined
				? "viewport-placement-target"
				: source ?? "viewport-drop",
		transform: {
			...draft.transform,
			position,
		},
	});

	stageAuthoringOperationEntry({
		id: queuedEntryId,
		label: "Object library viewport placements",
		operations: [
			...(existingEntry?.operations ?? []),
			stagedPlacement.operation,
		].slice(-8),
		saveOperations: [
			...(existingEntry?.saveOperations ?? []),
			stagedPlacement.saveOperation,
		].slice(-8),
	});
	appendOutputLog({
		level: "success",
		source:
			point === undefined
				? "viewport-placement"
				: source === "viewport-click"
					? "viewport-click"
					: "viewport-drop",
		message:
			point === undefined
				? `Staged ${entry.label} placement at ${stagedPlacement.stableId}.`
				: source === "viewport-click"
					? `Placed ${entry.label} from viewport click at ${stagedPlacement.stableId}.`
					: `Dropped ${entry.label} placement at ${stagedPlacement.stableId}.`,
	});
}

function nudgeViewportTransformField(path: string, delta: number): void {
	const object = selectedWorkspaceObject;
	const field = object?.fields.find((item) => item.path === path);

	if (
		!object ||
		!field ||
		field.input !== "number" ||
		field.readOnly ||
		field.workflow.editability !== "editable"
	) {
		return;
	}

	const currentValue = Number(fieldDisplayValue(object, field));
	const baselineValue = Number(field.value);
	const after = Number(
		(
			(Number.isFinite(currentValue) ? currentValue : baselineValue || 0) +
			delta
		).toFixed(4),
	);
	const nextQueue = stageLevelEditorFieldEdit(authoringQueue, {
		stableId: object.stableId,
		path: field.path,
		label: field.label,
		before: field.value,
		after,
	});

	if (nextQueue === authoringQueue) {
		return;
	}

	authoringQueue = nextQueue;
	latestTransaction = undefined;
}

function stageViewportProjectedTransformDrag(
	point: LevelEditorViewportNormalizedPoint,
): void {
	const object = selectedWorkspaceObject;

	if (!object || viewportInteractionTool !== "transform") {
		return;
	}

	const position = viewportProjectedTransformPositionFromNormalizedPoint({
		surface: viewportBridgeModel.projection.placementSurface,
		point,
		currentY: selectedViewportPlacementY(),
	});

	if (position === null) {
		return;
	}

	const fields = [
		object.fields.find((field) => field.path === "Transform.position.x"),
		object.fields.find((field) => field.path === "Transform.position.z"),
	];

	if (
		fields.some(
			(field) =>
				!field ||
				field.input !== "number" ||
				field.readOnly ||
				field.workflow.editability !== "editable",
		)
	) {
		return;
	}

	const resolvedFields = fields.filter(
		(field): field is LevelEditorWorkspaceField => field !== undefined,
	);
	const values = [position[0], position[2]] as const;
	let nextQueue = authoringQueue;

	for (const [index, field] of resolvedFields.entries()) {
		nextQueue = stageLevelEditorFieldEdit(nextQueue, {
			stableId: object.stableId,
			path: field.path,
			label: field.label,
			before: field.value,
			after: values[index],
		});
	}

	if (nextQueue === authoringQueue) {
		return;
	}

	authoringQueue = nextQueue;
	latestTransaction = undefined;
}

function nudgeViewportRotationYaw(deltaDegrees: number): void {
	const object = selectedWorkspaceObject;

	if (!object || !Number.isFinite(deltaDegrees)) {
		return;
	}

	const fieldPaths = [
		"Transform.rotation.x",
		"Transform.rotation.y",
		"Transform.rotation.z",
		"Transform.rotation.w",
	] as const;
	const fields = fieldPaths.map((path) =>
		object.fields.find((field) => field.path === path),
	);

	if (
		fields.some(
			(field) =>
				!field ||
				field.input !== "number" ||
				field.readOnly ||
				field.workflow.editability !== "editable",
		)
	) {
		return;
	}

	const resolvedFields = fields.filter(
		(field): field is LevelEditorWorkspaceField => field !== undefined,
	);
	const currentRotation = resolvedFields.map((field, index) => {
		const stagedOrStoredValue = Number(fieldDisplayValue(object, field));

		if (Number.isFinite(stagedOrStoredValue)) {
			return stagedOrStoredValue;
		}

		return index === 3 ? 1 : 0;
	}) as [number, number, number, number];
	const nextRotation = quaternionFromYawDegrees(
		yawDegreesFromQuaternion(currentRotation) + deltaDegrees,
	);
	let nextQueue = authoringQueue;

	for (const [index, field] of resolvedFields.entries()) {
		nextQueue = stageLevelEditorFieldEdit(nextQueue, {
			stableId: object.stableId,
			path: field.path,
			label: field.label,
			before: field.value,
			after: nextRotation[index],
		});
	}

	if (nextQueue === authoringQueue) {
		return;
	}

	authoringQueue = nextQueue;
	latestTransaction = undefined;
}

function yawDegreesFromQuaternion(
	rotation: readonly [number, number, number, number],
): number {
	const [x, y, z, w] = rotation;
	const yawRadians = Math.atan2(2 * (w * y + x * z), 1 - 2 * (y * y + z * z));

	return (yawRadians * 180) / Math.PI;
}

function quaternionFromYawDegrees(
	degrees: number,
): readonly [number, number, number, number] {
	const halfRadians = (degrees * Math.PI) / 360;

	return [
		0,
		Number(Math.sin(halfRadians).toFixed(6)),
		0,
		Number(Math.cos(halfRadians).toFixed(6)),
	];
}

function objectFieldValue(
	object: LevelEditorWorkspaceObject,
	path: string,
): string | number | boolean | undefined {
	return object.fields.find((field) => field.path === path)?.value;
}

function objectFieldText(
	object: LevelEditorWorkspaceObject,
	path: string,
): string {
	const value = objectFieldValue(object, path);

	return typeof value === "string" ? value : "";
}

function portalTargetLabel(object: LevelEditorWorkspaceObject): string {
	const targetSceneId = objectFieldText(object, "Portal.targetRuntimeSceneId");

	if (!targetSceneId) {
		return "Unconnected";
	}

	return targetSceneId.replace(/_runtime$/, "").replace(/_/g, " ");
}

function portalPromptLabel(object: LevelEditorWorkspaceObject): string {
	return objectFieldText(object, "Portal.prompt") || "No prompt configured";
}

function objectPosition(
	object: LevelEditorWorkspaceObject,
): { readonly x: number; readonly z: number } | null {
	const x = objectFieldValue(object, "Transform.position.x");
	const z = objectFieldValue(object, "Transform.position.z");

	if (typeof x !== "number" || typeof z !== "number") {
		return null;
	}

	return { x, z };
}

function objectPositionLabel(object: LevelEditorWorkspaceObject): string {
	const position = objectPosition(object);

	if (!position) {
		return "position unavailable";
	}

	return `x ${position.x.toFixed(1)} / z ${position.z.toFixed(1)}`;
}

function objectTargetLabel(object: LevelEditorWorkspaceObject): string {
	if (object.category === "portals") {
		return portalTargetLabel(object);
	}

	const primaryAsset = object.preview.primaryAsset;

	if (primaryAsset) {
		return primaryAsset.assetId;
	}

	return object.prefabId;
}

function objectDescriptor(object: LevelEditorWorkspaceObject): string {
	if (object.category === "portals") {
		return portalPromptLabel(object);
	}

	return object.componentNames.join(", ");
}

function formatWorkflowValue(value: string): string {
	return value
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function objectFocusPinStyle(
	group: LevelEditorWorkspaceTreeGroup,
	object: LevelEditorWorkspaceObject,
): string {
	const position = objectPosition(object);

	if (!position) {
		return "";
	}

	const positionedObjects = group.objects
		.map((item) => objectPosition(item))
		.filter(
			(item): item is { readonly x: number; readonly z: number } =>
				item !== null,
		);
	const xs = positionedObjects.map((item) => item.x);
	const zs = positionedObjects.map((item) => item.z);
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minZ = Math.min(...zs);
	const maxZ = Math.max(...zs);
	const normalizedX = normalizeEditorMapAxis(position.x, minX, maxX);
	const normalizedZ = normalizeEditorMapAxis(position.z, minZ, maxZ);

	return `--object-map-x: ${normalizedX}%; --object-map-z: ${normalizedZ}%`;
}

function normalizeEditorMapAxis(
	value: number,
	min: number,
	max: number,
): number {
	if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
		return 50;
	}

	return Math.round(10 + ((value - min) / (max - min)) * 80);
}

function handleInspectorFieldInput(
	event: Event,
	object: LevelEditorWorkspaceObject,
	field: LevelEditorWorkspaceField,
): void {
	if (!(event.currentTarget instanceof HTMLInputElement)) {
		return;
	}

	const nextQueue = stageLevelEditorFieldEdit(authoringQueue, {
		stableId: object.stableId,
		path: field.path,
		label: field.label,
		before: field.value,
		after: readEditorInputValue(event.currentTarget, field),
	});

	if (nextQueue === authoringQueue) {
		return;
	}

	authoringQueue = nextQueue;
	latestTransaction = undefined;
}

function fieldDisplayValue(
	object: LevelEditorWorkspaceObject,
	field: LevelEditorWorkspaceField,
): string | number | boolean {
	return fieldDisplayValueFromEdits(stagedFieldEdits, object, field);
}

function fieldDisplayValueFromEdits(
	edits: readonly LevelEditorStagedFieldEdit[],
	object: LevelEditorWorkspaceObject,
	field: LevelEditorWorkspaceField,
): string | number | boolean {
	return (
		findStagedFieldEdit(edits, object.stableId, field.path)?.after ??
		field.value
	);
}

function isFieldDirty(
	object: LevelEditorWorkspaceObject,
	field: LevelEditorWorkspaceField,
): boolean {
	return (
		findStagedFieldEdit(stagedFieldEdits, object.stableId, field.path) !==
		undefined
	);
}

function undoStagedEdit(): void {
	const nextQueue = undoLevelEditorAuthoringQueue(authoringQueue);

	if (nextQueue === authoringQueue) {
		return;
	}

	authoringQueue = nextQueue;
	latestTransaction = undefined;
	appendOutputLog({
		level: "info",
		source: "undo",
		message: "Restored previous staged edit state.",
	});
}

function redoStagedEdit(): void {
	const nextQueue = redoLevelEditorAuthoringQueue(authoringQueue);

	if (nextQueue === authoringQueue) {
		return;
	}

	authoringQueue = nextQueue;
	latestTransaction = undefined;
	appendOutputLog({
		level: "info",
		source: "redo",
		message: "Reapplied staged edit state.",
	});
}

function discardStagedEdits(): void {
	if (!hasDirtyState) {
		return;
	}

	const previewTargets = previewTargetsForStagedEdits({
		workspace,
		edits: stagedFieldEdits,
	});

	if (channel && previewTargets.stableIds.length > 0) {
		const message = createCoreObjectPreviewClearRequestMessage({
			requestId: createRequestId("discard-clear-preview"),
			runtimeSceneId: workspace.selectedRuntimeSceneId,
			stableIds: previewTargets.stableIds,
			targetKinds: previewTargets.targetKinds,
		});

		sendLevelEditorDevPreviewMessage(channel, message);
		untrackCoreObjectPreviews(previewTargets.stableIds);
		status = {
			kind: "sent",
			label: `Cleared previews for ${previewTargets.stableIds.length} staged objects`,
		};
	} else if (previewTargets.stableIds.length > 0) {
		status = {
			kind: "error",
			label: "Preview channel unavailable while discarding staged previews",
		};
	}

	authoringQueue = createLevelEditorAuthoringQueue();
	latestTransaction = undefined;
	appendOutputLog({
		level: "success",
		source: "discard",
		message:
			previewTargets.stableIds.length > 0 && channel
				? `Discarded staged editor UI edits and requested preview cleanup for ${previewTargets.stableIds.length} objects.`
				: "Discarded staged editor UI edits.",
	});
}

async function runWorkspaceCommand(
	command: LevelEditorWorkspaceCommand,
): Promise<void> {
	if (activeCommandId !== null) {
		return;
	}

	const blockReason = workspaceCommandBlockReason(command);

	if (blockReason !== null) {
		appendOutputLog({
			level: "warning",
			source: command.id,
			message: blockReason,
		});
		return;
	}

	activeCommandId = command.id;

	try {
		switch (command.operation) {
			case "authoring-transaction":
				await saveStagedAuthoringTransaction();
				return;
			case "owner-write":
				await saveStagedLevelOwnerData();
				return;
			case "publish-owner-write":
				await publishStagedLevelOwnerData();
				return;
			case "clear-staged-preview":
				discardStagedEdits();
				return;
			case "build-plan":
				showCommandPlan("build", command);
				return;
			case "publish-plan":
				showCommandPlan("publish", command);
				return;
		}
	} finally {
		activeCommandId = null;
	}
}

async function publishStagedLevelOwnerData(): Promise<void> {
	try {
		const saveOperationCount = authoringQueue.operationCount;
		const previewTargets = previewTargetsForStagedEdits({
			workspace,
			edits: stagedFieldEdits,
		});
		const saveTarget = await fetchLevelEditorAuthoringStatus(
			workspace.selectedRuntimeSceneId,
			"published-transforms",
		);
		const dryRun = await runLevelEditorAuthoringCommand({
			mode: "dry-run",
			target: "publish",
			workspace,
			edits: stagedFieldEdits,
			queuedOperations: queuedAuthoringOperationEntries,
			baseHash: saveTarget.baseHash,
		});

		if (!dryRun.ok) {
			throw new Error(
				dryRun.errors?.join(" ") ?? dryRun.message ?? "Publish dry run failed.",
			);
		}

		const publishResult = await runLevelEditorAuthoringCommand({
			mode: "save",
			target: "publish",
			workspace,
			edits: stagedFieldEdits,
			queuedOperations: queuedAuthoringOperationEntries,
			baseHash: saveTarget.baseHash,
		});

		if (!publishResult.ok) {
			throw new Error(
				publishResult.errors?.join(" ") ??
					publishResult.message ??
					"Publish failed.",
			);
		}

		authoringQueue = createLevelEditorAuthoringQueue();
		latestTransaction = undefined;
		status = {
			kind: "sent",
			label: `Published level data with ${saveOperationCount} operations to ${saveTarget.targetFile}`,
		};
		appendOutputLog({
			level: "success",
			source: "publish",
			message: `${publishResult.message} ${formatAuthoringArtifacts(publishResult)}${formatValidationGates(publishResult)}.`,
		});

		if (channel) {
			if (previewTargets.stableIds.length > 0) {
				sendLevelEditorDevPreviewMessage(
					channel,
					createCoreObjectPreviewClearRequestMessage({
						requestId: createRequestId("publish-clear-preview"),
						runtimeSceneId: workspace.selectedRuntimeSceneId,
						stableIds: previewTargets.stableIds,
						targetKinds: previewTargets.targetKinds,
					}),
				);
				untrackCoreObjectPreviews(previewTargets.stableIds);
			}

			sendLevelEditorDevPreviewMessage(
				channel,
				createRuntimeSceneReloadRequestMessage({
					requestId: createRequestId("publish-reload"),
					runtimeSceneId: workspace.selectedRuntimeSceneId,
				}),
			);
		}
	} catch (error) {
		status = {
			kind: "error",
			label: "Unable to publish level data",
		};
		appendOutputLog({
			level: "error",
			source: "publish",
			message: error instanceof Error ? error.message : String(error),
		});
	}
}

function formatValidationGates(
	result: Awaited<ReturnType<typeof runLevelEditorAuthoringCommand>>,
): string {
	const gates = result.validationGates ?? [];

	if (gates.length === 0) {
		return "";
	}

	const passed = gates.filter((gate) => gate.ok).length;
	return `; ${passed}/${gates.length} validation gates passed`;
}

async function saveStagedLevelOwnerData(): Promise<void> {
	try {
		const saveOperationCount = authoringQueue.operationCount;
		const previewTargets = previewTargetsForStagedEdits({
			workspace,
			edits: stagedFieldEdits,
		});
		const saveTarget = await fetchLevelEditorAuthoringStatus(
			workspace.selectedRuntimeSceneId,
			"published-transforms",
		);
		const dryRun = await runLevelEditorAuthoringCommand({
			mode: "dry-run",
			target: "level",
			workspace,
			edits: stagedFieldEdits,
			queuedOperations: queuedAuthoringOperationEntries,
			baseHash: saveTarget.baseHash,
		});

		if (!dryRun.ok) {
			throw new Error(
				dryRun.errors?.join(" ") ??
					dryRun.message ??
					"Save Level dry run failed.",
			);
		}

		const saveResult = await runLevelEditorAuthoringCommand({
			mode: "save",
			target: "level",
			workspace,
			edits: stagedFieldEdits,
			queuedOperations: queuedAuthoringOperationEntries,
			baseHash: saveTarget.baseHash,
		});

		if (!saveResult.ok) {
			throw new Error(
				saveResult.errors?.join(" ") ??
					saveResult.message ??
					"Save Level failed.",
			);
		}

		authoringQueue = createLevelEditorAuthoringQueue();
		latestTransaction = undefined;
		status = {
			kind: "sent",
			label: `Saved level data with ${saveOperationCount} operations to ${saveTarget.targetFile}`,
		};
		appendOutputLog({
			level: "success",
			source: "save-level",
			message: `${saveResult.message} ${formatAuthoringArtifacts(saveResult)}.`,
		});

		if (channel) {
			if (previewTargets.stableIds.length > 0) {
				sendLevelEditorDevPreviewMessage(
					channel,
					createCoreObjectPreviewClearRequestMessage({
						requestId: createRequestId("save-level-clear-preview"),
						runtimeSceneId: workspace.selectedRuntimeSceneId,
						stableIds: previewTargets.stableIds,
						targetKinds: previewTargets.targetKinds,
					}),
				);
				untrackCoreObjectPreviews(previewTargets.stableIds);
			}

			sendLevelEditorDevPreviewMessage(
				channel,
				createRuntimeSceneReloadRequestMessage({
					requestId: createRequestId("save-level-reload"),
					runtimeSceneId: workspace.selectedRuntimeSceneId,
				}),
			);
		}
	} catch (error) {
		status = {
			kind: "error",
			label: "Unable to save level data",
		};
		appendOutputLog({
			level: "error",
			source: "save-level",
			message: error instanceof Error ? error.message : String(error),
		});
	}
}

function formatAuthoringArtifacts(
	result: Awaited<ReturnType<typeof runLevelEditorAuthoringCommand>>,
): string {
	const artifacts = result.artifacts ?? [];

	if (artifacts.length === 0) {
		return "No runtime owner artifacts were written";
	}

	return artifacts
		.map((artifact) => {
			const stableIds =
				artifact.changedStableIds === undefined ||
				artifact.changedStableIds.length === 0
					? ""
					: ` for ${artifact.changedStableIds.join(", ")}`;
			return `${artifact.wroteFile ? "wrote" : "checked"} ${artifact.targetFile}${stableIds}`;
		})
		.join("; ");
}

async function saveStagedAuthoringTransaction(): Promise<void> {
	try {
		const saveOperationCount = authoringQueue.operationCount;
		const transaction =
			stagedFieldEdits.length > 0 ||
			queuedAuthoringOperationEntries.some(
				(entry) => (entry.operations?.length ?? 0) > 0,
			)
				? buildLevelEditorAuthoringTransactionFromQueue({
						workspace,
						queue: authoringQueue,
						transactionId: createRequestId("authoring-save"),
						createdAt: new Date().toISOString(),
					})
				: undefined;

		latestTransaction = transaction;
		status = {
			kind: "ready",
			label: `Prepared save transaction with ${authoringQueue.operationCount} operations`,
		};

		const saveTarget = await fetchLevelEditorAuthoringStatus(
			workspace.selectedRuntimeSceneId,
		);
		const dryRun = await runLevelEditorAuthoringCommand({
			mode: "dry-run",
			workspace,
			edits: stagedFieldEdits,
			queuedOperations: queuedAuthoringOperationEntries,
			baseHash: saveTarget.baseHash,
		});

		if (!dryRun.ok) {
			throw new Error(
				dryRun.errors?.join(" ") ??
					dryRun.message ??
					"Authoring dry run failed.",
			);
		}

		const saveResult = await runLevelEditorAuthoringCommand({
			mode: "save",
			workspace,
			edits: stagedFieldEdits,
			queuedOperations: queuedAuthoringOperationEntries,
			baseHash: saveTarget.baseHash,
		});

		if (!saveResult.ok) {
			throw new Error(
				saveResult.errors?.join(" ") ??
					saveResult.message ??
					"Authoring save failed.",
			);
		}

		status = {
			kind: "sent",
			label: `Saved draft with ${saveOperationCount} operations to ${saveTarget.targetFile}`,
		};
		appendOutputLog({
			level: "warning",
			source: "save",
			message: `${saveResult.message} ${saveResult.artifacts?.length ?? 0} draft artifacts checked. Staged edits remain dirty because no bounded level owner write succeeded.`,
		});
	} catch (error) {
		status = {
			kind: "error",
			label: "Unable to save authoring transaction",
		};
		appendOutputLog({
			level: "error",
			source: "save",
			message: error instanceof Error ? error.message : String(error),
		});
	}
}

function showCommandPlan(
	planId: "build" | "publish",
	command: LevelEditorWorkspaceCommand,
): void {
	const blockReason = workspaceCommandBlockReason(command);

	if (blockReason !== null) {
		appendOutputLog({
			level: "warning",
			source: command.id,
			message: blockReason,
		});
		return;
	}

	selectedCommandPlanId = planId;
	const plan =
		planId === "publish"
			? workspace.commandPlans.publish
			: workspace.commandPlans.build;
	status = {
		kind: plan.errors.length === 0 ? "ready" : "error",
		label:
			plan.errors.length === 0
				? `${plan.label} plan selected`
				: `${plan.label} plan has ${plan.errors.length} errors`,
	};
	appendOutputLog({
		level: plan.errors.length === 0 ? "info" : "error",
		source: command.id,
		message:
			plan.errors.length === 0
				? commandPlanOutputMessage(plan)
				: plan.errors.join(" "),
	});
}

function workspaceCommandDisabled(
	command: LevelEditorWorkspaceCommand,
): boolean {
	if (activeCommandId !== null) {
		return true;
	}

	return workspaceCommandBlockReason(command) !== null;
}

function workspaceCommandBlockReason(
	command: LevelEditorWorkspaceCommand,
): string | null {
	if (!command.enabled) {
		return command.reason;
	}

	if (command.requiresDirty && !hasDirtyState) {
		return "No staged edits are available for this command";
	}

	if (command.blocksDirty && hasDirtyState) {
		return "Staged edits are dirty; Save Draft preserves a transaction but does not make them permanent. Discard the staged edits before using this plan view.";
	}

	if (
		(command.operation === "owner-write" ||
			command.operation === "publish-owner-write") &&
		!stagedPublishReadiness.canRunOwnerWrite
	) {
		return stagedPublishReadiness.reasons[0] ?? stagedPublishReadiness.label;
	}

	return null;
}

function workspaceCommandTitle(command: LevelEditorWorkspaceCommand): string {
	if (activeCommandId === command.id) {
		return `${command.label} is running`;
	}

	if (activeCommandId !== null) {
		return "Another editor command is running";
	}

	return workspaceCommandBlockReason(command) ?? command.reason;
}

function appendOutputLog(entry: {
	readonly level: "info" | "success" | "warning" | "error";
	readonly source: string;
	readonly message: string;
}): void {
	outputLog = [createWorkspaceOutputLogEntry(entry), ...outputLog].slice(0, 48);
}

function stageAuthoringOperationEntry(
	entry: LevelEditorQueuedAuthoringOperation,
): void {
	const nextQueue = stageLevelEditorAuthoringOperations(authoringQueue, entry);

	if (nextQueue === authoringQueue) {
		return;
	}

	authoringQueue = nextQueue;
	latestTransaction = undefined;
	appendOutputLog({
		level: "info",
		source: entry.id,
		message: `${entry.label ?? "Authoring operation"} staged with ${
			(entry.operations?.length ?? 0) + (entry.saveOperations?.length ?? 0)
		} operations.`,
	});
}

function removeQueuedAuthoringOperationEntry(entryId: string): void {
	const entry = authoringQueue.queuedOperations.find(
		(candidate) => candidate.id === entryId,
	);
	const nextQueue = removeLevelEditorAuthoringOperationEntry(
		authoringQueue,
		entryId,
	);

	if (nextQueue === authoringQueue) {
		return;
	}

	authoringQueue = nextQueue;
	latestTransaction = undefined;
	appendOutputLog({
		level: "info",
		source: "staged-operations",
		message: `Removed ${entry?.label ?? entryId} from staged operations.`,
	});
}

function removeStagedFieldEdit(stableId: string, path: string): void {
	const edit = stagedFieldEdits.find(
		(candidate) => candidate.stableId === stableId && candidate.path === path,
	);
	const object = workspace.objects.find(
		(candidate) => candidate.stableId === stableId,
	);
	const shouldReconcilePreview =
		object?.previewTargetKind !== undefined &&
		liveCoreObjectPreviewStableIds.includes(stableId);
	const nextQueue = removeLevelEditorStagedFieldEdit(
		authoringQueue,
		stableId,
		path,
	);

	if (nextQueue === authoringQueue) {
		return;
	}

	authoringQueue = nextQueue;
	latestTransaction = undefined;
	if (shouldReconcilePreview && object) {
		reconcileCoreObjectPreviewAfterStagedFieldRemoval(
			object,
			nextQueue.stagedFieldEdits,
		);
	}
	appendOutputLog({
		level: "info",
		source: "staged-fields",
		message: `Reverted ${edit?.label ?? path} on ${stableId}.`,
	});
}

function stagedFieldObjectLabel(stableId: string): string {
	return (
		workspace.objects.find((object) => object.stableId === stableId)?.label ??
		stableId
	);
}

function sendCoreObjectPreview(): void {
	const object = selectedObject();

	if (!channel || !object?.previewTargetKind) {
		status = {
			kind: "error",
			label: object
				? "Selected object is read-only in this packet"
				: "No selected object",
		};
		return;
	}

	const patch = {
		schemaVersion: 1,
		channel: "level-editor-core-object-preview",
		mode: "temporary-preview",
		runtimeSceneId: workspace.selectedRuntimeSceneId,
		levelId: workspace.selectedLevelId,
		sourcePlanHash: previewSourceHash(object),
		entries: [
			buildCoreObjectPreviewEntry({
				object,
				edits: stagedFieldEdits,
			}),
		],
	} as const;
	const message = createCoreObjectPreviewPatchMessage({
		requestId: createRequestId("core-preview"),
		patch,
	});

	sendLevelEditorDevPreviewMessage(channel, message);
	trackCoreObjectPreview(object.stableId);
	status = {
		kind: "sent",
		label: `Previewed ${object.previewTargetKind} ${object.stableId}`,
	};
}

function clearCoreObjectPreview(): void {
	const object = selectedObject();

	if (!channel || !object?.previewTargetKind) {
		status = {
			kind: "error",
			label: object
				? "Selected object has no live preview"
				: "No selected object",
		};
		return;
	}

	const message = createCoreObjectPreviewClearRequestMessage({
		requestId: createRequestId("core-clear"),
		runtimeSceneId: workspace.selectedRuntimeSceneId,
		sourcePlanHash: previewSourceHash(object),
		stableIds: [object.stableId],
		targetKinds: [object.previewTargetKind],
	});

	sendLevelEditorDevPreviewMessage(channel, message);
	untrackCoreObjectPreviews([object.stableId]);
	status = {
		kind: "sent",
		label: `Cleared preview for ${object.stableId}`,
	};
}

function trackCoreObjectPreview(stableId: string): void {
	if (liveCoreObjectPreviewStableIds.includes(stableId)) {
		return;
	}

	liveCoreObjectPreviewStableIds = [
		...liveCoreObjectPreviewStableIds,
		stableId,
	].sort();
}

function untrackCoreObjectPreviews(stableIds: readonly string[]): void {
	if (stableIds.length === 0) {
		return;
	}

	const removedIds = new Set(stableIds);
	liveCoreObjectPreviewStableIds = liveCoreObjectPreviewStableIds.filter(
		(stableId) => !removedIds.has(stableId),
	);
}

function reconcileCoreObjectPreviewAfterStagedFieldRemoval(
	object: LevelEditorWorkspaceObject,
	nextStagedFieldEdits: readonly LevelEditorStagedFieldEdit[],
): void {
	if (!object.previewTargetKind) {
		return;
	}

	if (!channel) {
		status = {
			kind: "error",
			label: "Preview channel unavailable while reconciling reverted edit",
		};
		return;
	}

	const remainingObjectEdits = nextStagedFieldEdits.filter(
		(edit) => edit.stableId === object.stableId,
	);

	if (remainingObjectEdits.length === 0) {
		sendLevelEditorDevPreviewMessage(
			channel,
			createCoreObjectPreviewClearRequestMessage({
				requestId: createRequestId("revert-clear-preview"),
				runtimeSceneId: workspace.selectedRuntimeSceneId,
				sourcePlanHash: previewSourceHash(object),
				stableIds: [object.stableId],
				targetKinds: [object.previewTargetKind],
			}),
		);
		untrackCoreObjectPreviews([object.stableId]);
		status = {
			kind: "sent",
			label: `Cleared preview after reverting ${object.stableId}`,
		};
		return;
	}

	const patch = {
		schemaVersion: 1,
		channel: "level-editor-core-object-preview",
		mode: "temporary-preview",
		runtimeSceneId: workspace.selectedRuntimeSceneId,
		levelId: workspace.selectedLevelId,
		sourcePlanHash: previewSourceHash(object),
		entries: [
			buildCoreObjectPreviewEntry({
				object,
				edits: nextStagedFieldEdits,
			}),
		],
	} as const;

	sendLevelEditorDevPreviewMessage(
		channel,
		createCoreObjectPreviewPatchMessage({
			requestId: createRequestId("revert-refresh-preview"),
			patch,
		}),
	);
	trackCoreObjectPreview(object.stableId);
	status = {
		kind: "sent",
		label: `Refreshed preview after reverting ${object.stableId}`,
	};
}

function stageObjectLibraryReplacement(
	draft: EditorObjectLibraryReplacementDraft,
): void {
	if (!channel) {
		status = {
			kind: "error",
			label: "Preview channel unavailable for object replacement",
		};
		appendOutputLog({
			level: "error",
			source: "object-library",
			message: "Preview channel unavailable for staged replacement.",
		});
		return;
	}

	const message = createObjectLibraryReplacementPreviewMessage({
		requestId: createRequestId("object-library-replace"),
		draft,
	});

	sendLevelEditorDevPreviewMessage(channel, message);
	status = {
		kind: "sent",
		label: `Previewed ${draft.replacement.label} on ${draft.selectedObject.stableId}`,
	};
	appendOutputLog({
		level: "success",
		source: "object-library",
		message: `Staged ${draft.replacementKind} preview for ${draft.selectedObject.stableId}.`,
	});
}

function reloadLiveRuntime(): void {
	if (!channel) {
		status = { kind: "error", label: "Preview channel unavailable" };
		return;
	}

	const message = createRuntimeSceneReloadRequestMessage({
		requestId: createRequestId("runtime-reload"),
		runtimeSceneId: workspace.selectedRuntimeSceneId,
		reason: "manual",
	});

	sendLevelEditorDevPreviewMessage(channel, message);
	status = {
		kind: "sent",
		label: `Requested reload for ${workspace.selectedRuntimeSceneId}`,
	};
}

function readFieldValue(
	object: LevelEditorWorkspaceObject,
	field: LevelEditorWorkspaceField,
	edits: readonly LevelEditorStagedFieldEdit[] = stagedFieldEdits,
): string | number | boolean {
	return fieldDisplayValueFromEdits(edits, object, field);
}

function previewSourceHash(object: LevelEditorWorkspaceObject): string {
	return `workspace:${workspace.selectedRuntimeSceneId}:${object.stableId}:${object.previewTargetKind}`;
}

function createRequestId(prefix: string): string {
	return `${prefix}:${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

function requestRenderedScenePick(
	options: LevelEditorRenderedHitTestViewportRequestOptions,
): boolean {
	if (!channel || !renderedSceneSelectionRequestReady) {
		return false;
	}
	const result = requestLevelEditorRenderedHitTestSelection({
		channel,
		requestId: createRequestId("rendered-hit-test"),
		request: {
			runtimeSceneId: workspace.selectedRuntimeSceneId,
			viewport: options.viewport,
			screenPoint: options.screenPoint,
			pickableStableIds: objectViewStateModel.pickableStableIds,
			sourcePlanHash: `workspace:rendered-hit-test:${workspace.selectedRuntimeSceneId}`,
		},
		additive: options.additive,
	});

	if (result.status === "sent") {
		pendingRenderedSceneHitTest = result.pendingRequest;
		status = { kind: "sent", label: result.label };
		return true;
	}

	status = { kind: "error", label: result.label };
	appendOutputLog({
		level: "error",
		source: "rendered-hit-test",
		message: result.message,
	});
	return false;
}

function requestRenderedSceneBoxSelect(
	options: LevelEditorRenderedBoxSelectViewportRequestOptions,
): boolean {
	if (!channel || !renderedSceneSelectionRequestReady) {
		return false;
	}
	const result = requestLevelEditorRenderedBoxSelectSelection({
		channel,
		requestId: createRequestId("rendered-box-select"),
		request: {
			runtimeSceneId: workspace.selectedRuntimeSceneId,
			viewport: options.viewport,
			rect: options.rect,
			pickableStableIds: objectViewStateModel.pickableStableIds,
			sourcePlanHash: `workspace:rendered-box-select:${workspace.selectedRuntimeSceneId}`,
		},
		additive: options.additive,
	});

	if (result.status === "sent") {
		pendingRenderedSceneBoxSelect = result.pendingRequest;
		status = { kind: "sent", label: result.label };
		return true;
	}

	status = { kind: "error", label: result.label };
	appendOutputLog({
		level: "error",
		source: "rendered-box-select",
		message: result.message,
	});
	return false;
}
function handleDevPreviewMessage(messageData: unknown): void {
	let message: ReturnType<typeof parseLevelEditorDevPreviewMessage>;

	try {
		message = parseLevelEditorDevPreviewMessage(messageData);
	} catch {
		return;
	}

	if (message.type === "runtime-telemetry") {
		if (message.payload.runtimeSceneId !== workspace.selectedRuntimeSceneId) {
			return;
		}

		runtimeTelemetry = message.payload;
		lastRuntimeTelemetryReceivedAt = Date.now();
		runtimeTelemetryState = "live";
		return;
	}

	if (message.type === "rendered-scene-hit-test-result") {
		handleRenderedSceneHitTestResult(message.requestId, message.payload);
	}

	if (message.type === "rendered-scene-box-select-result") {
		handleRenderedSceneBoxSelectResult(message.requestId, message.payload);
	}
}

function handleRenderedSceneHitTestResult(
	requestId: string,
	payload: LevelEditorRenderedSceneHitTestResultPayload,
): void {
	const pendingRequest = pendingRenderedSceneHitTest;
	const result = consumeLevelEditorRenderedHitTestSelectionResult({
		requestId,
		pendingRequestId: pendingRequest?.requestId ?? null,
		expectedRuntimeSceneId: workspace.selectedRuntimeSceneId,
		payload,
		objects: workspace.objects,
		pickableStableIds: objectViewStateModel.pickableStableIds,
		additive: pendingRequest?.additive,
	});

	if (pendingRequest?.requestId === requestId) {
		pendingRenderedSceneHitTest = null;
	}

	if (result.status === "selected") {
		selectObject(result.stableId, { additive: result.additive });
		status = {
			kind: "ready",
			label: `Rendered selection: ${result.stableId}`,
		};
		appendOutputLog({
			level: "success",
			source: "rendered-hit-test",
			message: result.message,
		});
		return;
	}

	if (result.status === "stale" && result.reason === "request-id-mismatch") {
		return;
	}

	status = {
		kind: result.status === "miss" ? "ready" : "error",
		label: result.message,
	};
	appendOutputLog({
		level: result.status === "miss" ? "info" : "warning",
		source: "rendered-hit-test",
		message: result.message,
	});
}

function handleRenderedSceneBoxSelectResult(
	requestId: string,
	payload: LevelEditorRenderedSceneBoxSelectResultPayload,
): void {
	const pendingRequest = pendingRenderedSceneBoxSelect;
	const result = consumeLevelEditorRenderedBoxSelectSelectionResult({
		requestId,
		pendingRequestId: pendingRequest?.requestId ?? null,
		expectedRuntimeSceneId: workspace.selectedRuntimeSceneId,
		payload,
		objects: workspace.objects,
		pickableStableIds: objectViewStateModel.pickableStableIds,
		additive: pendingRequest?.additive,
	});

	if (pendingRequest?.requestId === requestId) {
		pendingRenderedSceneBoxSelect = null;
	}

	if (result.status === "selected") {
		selectObjects(result.stableIds, { additive: result.additive });
		status = {
			kind: "ready",
			label: `Rendered box selection: ${result.stableIds.length} object${
				result.stableIds.length === 1 ? "" : "s"
			}`,
		};
		appendOutputLog({
			level: "success",
			source: "rendered-box-select",
			message: result.message,
		});
		return;
	}

	if (result.status === "stale" && result.reason === "request-id-mismatch") {
		return;
	}

	status = {
		kind: result.status === "miss" ? "ready" : "error",
		label: result.message,
	};
	appendOutputLog({
		level: result.status === "miss" ? "info" : "warning",
		source: "rendered-box-select",
		message: result.message,
	});
}

function updateRuntimeTelemetryState(): void {
	if (
		runtimeTelemetry === undefined ||
		lastRuntimeTelemetryReceivedAt === undefined
	) {
		runtimeTelemetryState = "waiting";
		return;
	}

	runtimeTelemetryState =
		Date.now() - lastRuntimeTelemetryReceivedAt > 2000 ? "stale" : "live";
}

function formatRuntimePosition(): string {
	return (
		runtimeTelemetry?.playerPosition
			.map((value) => value.toFixed(1))
			.join(" / ") ?? "pending"
	);
}

function formatRuntimeHealth(): string {
	return runtimeTelemetry
		? `${runtimeTelemetry.health[0]} / ${runtimeTelemetry.health[1]}`
		: "pending";
}

function formatRuntimeInput(): string {
	if (!runtimeTelemetry) {
		return "pending";
	}

	if (runtimeTelemetry.lookActive) {
		return "looking";
	}

	if (runtimeTelemetry.pointerLocked) {
		return "locked";
	}

	return runtimeTelemetry.inputEnabled ? "ready" : "paused";
}

function formatRuntimeCharge(): string {
	if (!runtimeTelemetry) {
		return "pending";
	}

	return runtimeTelemetry.charging
		? `${Math.round(runtimeTelemetry.chargeAmount * 100)}%`
		: "idle";
}

function runtimeLifecycleLabel(): string {
	return runtimeTelemetry?.lifecycle ?? "waiting";
}
</script>

<section class="editor-header">
	<div>
		<p class="editor-kicker">Dev-only level editor</p>
		<h1>Megameal Level Workspace</h1>
	</div>
	<div class="editor-header-controls">
		<label class="editor-field editor-field-inline">
			<span>Open Level</span>
			<select
				name="runtimeSceneId"
				value={workspace.selectedRuntimeSceneId}
				onchange={openRuntimeScene}
			>
				{#each workspace.levelBrowser as level}
					<option value={level.runtimeSceneId}>
						{level.levelId} / {level.runtimeSceneId}
					</option>
				{/each}
			</select>
		</label>
		<a
			class="editor-live-link"
			href={`/?scene=${encodeURIComponent(workspace.selectedRuntimeSceneId)}`}
			target="_blank"
		>
			Live Game
		</a>
	</div>
</section>

<section class="editor-level-strip" aria-label="Available levels">
	{#each workspace.levelBrowser as level}
		<a
			class:selected-level={level.runtimeSceneId === workspace.selectedRuntimeSceneId}
			class="editor-level-card"
			href={`/editor/?scene=${encodeURIComponent(level.runtimeSceneId)}`}
		>
			<strong>{level.levelId}</strong>
			<span>{level.objectCount} objects</span>
			<span>{level.assetCount} assets / {level.terrainPackageCount} terrain</span>
		</a>
	{/each}
</section>

<section class="editor-command-bar" aria-label="Workspace commands">
	<div class="editor-dirty-state" data-dirty={hasDirtyState}>
		<strong>{hasDirtyState ? "Dirty" : "Clean"}</strong>
		<span>
			{dirtyCount} staged items / {authoringQueue.operationCount} operations /
			{stagedPublishReadiness.label}
		</span>
	</div>
	<div class="editor-command-actions">
		<button type="button" disabled={!authoringQueue.canUndo} onclick={undoStagedEdit}>
			Undo {authoringQueue.undoDepth}
		</button>
		<button type="button" disabled={!authoringQueue.canRedo} onclick={redoStagedEdit}>
			Redo {authoringQueue.redoDepth}
		</button>
		<button type="button" disabled={!hasDirtyState} onclick={discardStagedEdits}>
			Discard Staged
		</button>
		{#each workspace.commands as command}
			<button
				type="button"
				disabled={workspaceCommandDisabled(command)}
				title={workspaceCommandTitle(command)}
				data-command-operation={command.operation}
				data-command-enabled={command.enabled}
				onclick={() => runWorkspaceCommand(command)}
			>
				{activeCommandId === command.id ? `${command.label}...` : command.label}
			</button>
		{/each}
	</div>
</section>

<section class="editor-workbench-main" aria-label="Level editor workbench">
	<aside class="editor-panel editor-outliner" aria-label="Scene outliner">
		<header class="editor-panel-header">
			<h2>Outliner</h2>
			<span>
				{editorSelectionState.selectedCount} selected / {filteredOutlinerObjectCount} shown
			</span>
		</header>
		<div class="editor-inspector-fields" aria-label="Outliner filters">
			<label class="editor-field">
				<span>Search</span>
				<input
					bind:value={outlinerSearchQuery}
					placeholder="Stable ID, prefab, component, owner"
				/>
			</label>
			<label class="editor-field">
				<span>Category</span>
				<select bind:value={outlinerCategoryFilter}>
					<option value="all">All categories</option>
					{#each workspace.sceneTree as group}
						<option value={group.category}>{group.label}</option>
					{/each}
				</select>
			</label>
			<label class="editor-field">
				<span>Lock</span>
				<select bind:value={outlinerLockFilter}>
					<option value="all">All lock states</option>
					<option value="editable">Editable</option>
					<option value="cook-guarded">Cook guarded</option>
					<option value="read-only">Read only</option>
					<option value="editor-locked">Editor locked</option>
					<option value="editor-unlocked">Editor unlocked</option>
				</select>
			</label>
			<label class="editor-field">
				<span>Pickability</span>
				<select bind:value={outlinerPickabilityFilter}>
					<option value="all">All pickability</option>
					<option value="projected-pickable">Projected pickable</option>
					<option value="outliner-only">Outliner only</option>
					<option value="editor-pickable">Editor pickable</option>
				</select>
			</label>
			<label class="editor-field">
				<span>Visibility</span>
				<select bind:value={outlinerVisibilityFilter}>
					<option value="all">All visibility</option>
					<option value="source-visible">Source visible</option>
					<option value="editor-visible">Editor visible</option>
					<option value="editor-hidden">Editor hidden</option>
				</select>
			</label>
			<div class="editor-outliner-filter-actions">
				<span>
					{filteredOutlinerObjectCount} shown of {workspace.objects.length}
				</span>
				<button
					type="button"
					disabled={filteredOutlinerObjectCount === 0}
					onclick={selectFilteredOutlinerObjects}
				>
					Select Shown
				</button>
				<button
					type="button"
					disabled={filteredOutlinerObjectCount === 0}
					onclick={addFilteredOutlinerObjectsToSelection}
				>
					Add Shown
				</button>
				<button
					type="button"
					disabled={editorSelectionState.selectedCount === 0}
					onclick={clearObjectSelection}
				>
					Clear Selection
				</button>
				<button
					type="button"
					disabled={!objectViewStateModel.hasIsolation}
					title="Clears editor-only isolation state without writing owner files."
					onclick={clearAllObjectIsolation}
				>
					Clear Isolation
				</button>
				<button
					type="button"
					disabled={Object.keys(objectViewStateByStableId).length === 0}
					title="Resets editor-only visibility, lock, and isolation state."
					onclick={resetObjectViewState}
				>
					Reset View
				</button>
				<button
					type="button"
					disabled={!outlinerFiltersActive}
					onclick={resetOutlinerFilters}
				>
					Reset
				</button>
			</div>
		</div>
		<div class="editor-outliner-list">
			{#each filteredSceneTree as group}
				<section class="editor-outliner-group">
					<h3>{group.label}</h3>
					{#each group.objects as object}
						{@const objectViewState = objectViewStateForStableId(
							object.stableId,
						)}
						<button
							type="button"
							class:selected-object={objectIsSelected(object.stableId)}
							class:primary-selected-object={objectIsPrimarySelection(
								object.stableId,
							)}
							aria-pressed={objectIsSelected(object.stableId)}
							data-selected-primary={objectIsPrimarySelection(object.stableId)}
							onclick={(event) =>
								selectObjectFromPointer(event, object.stableId)}
						>
							<span class="editor-outliner-row-title">
								<span>{object.label}</span>
								<small>{object.outliner.categoryLabel}</small>
							</span>
							<small class="editor-outliner-path">
								{object.outliner.objectPath.join(" / ")}
							</small>
							<span
								class="editor-outliner-affordances"
								aria-label="Outliner affordances"
							>
								<span
									data-affordance-state={object.outliner.visibility.state}
									title={object.outliner.visibility.reason}
								>
									{object.outliner.visibility.label}
								</span>
								<span
									data-affordance-state={object.outliner.lock.state}
									title={object.outliner.lock.reason}
								>
									{object.outliner.lock.label}
								</span>
								<span
									data-affordance-state={object.outliner.pickability.state}
									title={object.outliner.pickability.reason}
								>
									{object.outliner.pickability.label}
								</span>
							</span>
							<small>{object.prefabId}</small>
						</button>
						<div
							class="editor-outliner-row-tools"
							aria-label={`Editor-only view actions for ${object.label}`}
						>
							<button
								type="button"
								class:active-view-state={!objectViewState.visible}
								aria-pressed={!objectViewState.visible}
								title="Hide or show this object in editor-only outliner and projected viewport state. Does not write runtime or owner files."
								onclick={() => toggleObjectVisible(object.stableId)}
							>
								{objectViewState.visible ? "Hide" : "Show"}
							</button>
							<button
								type="button"
								class:active-view-state={objectViewState.locked}
								aria-pressed={objectViewState.locked}
								title="Lock or unlock editor-only projected picking for this object. Does not write runtime or owner files."
								onclick={() => toggleObjectLocked(object.stableId)}
							>
								{objectViewState.locked ? "Unlock" : "Lock"}
							</button>
							<button
								type="button"
								class:active-view-state={objectViewState.isolated}
								aria-pressed={objectViewState.isolated}
								title="Toggle editor-only isolation. Does not write runtime or owner files."
								onclick={() => toggleObjectIsolated(object.stableId)}
							>
								{objectViewState.isolated ? "Unisolate" : "Isolate"}
							</button>
							<button
								type="button"
								disabled={
									objectViewState.visible &&
									!objectViewState.locked &&
									!objectViewState.isolated
								}
								title="Clear editor-only view state for this object."
								onclick={() => clearObjectViewState(object.stableId)}
							>
								Reset
							</button>
						</div>
					{/each}
				</section>
			{/each}
			{#if filteredSceneTree.length === 0}
				<div class="editor-library-empty-state">
					<strong>No scene objects match</strong>
					<span>
						{outlinerFiltersActive
							? "Adjust the outliner filters."
							: outlinerSearchQuery}
					</span>
				</div>
			{/if}
		</div>
	</aside>

	<main class="editor-workbench-center" aria-label="Viewport and selection">
		<LevelEditorViewportBridgePanel
			model={viewportBridgeModel}
			onViewModeChange={selectViewportBridgeViewMode}
			onCameraModeChange={selectViewportCameraMode}
			onCameraZoomPercentChange={selectViewportCameraZoomPercent}
			onInteractionToolChange={selectViewportInteractionTool}
			onOverlayToggle={toggleViewportBridgeOverlay}
			onSelectObject={selectObject}
			onSelectObjects={selectObjects}
			onRenderedScenePick={requestRenderedScenePick}
			onRenderedSceneBoxSelect={requestRenderedSceneBoxSelect}
			onTransformNudge={nudgeViewportTransformField}
			onTransformProjectedDrag={stageViewportProjectedTransformDrag}
			onRotationYawNudge={nudgeViewportRotationYaw}
			onTransformModeChange={selectViewportTransformMode}
			onTransformSnapStepChange={selectViewportTransformSnapStep}
			placementTarget={viewportPlacementTarget}
			onStagePlacementAtTarget={stageViewportPlacementAtTarget}
			onDropPlacementEntry={stageDroppedObjectLibraryPlacement}
		/>
		<section class="editor-panel editor-live-viewport-actions" aria-label="Live viewport actions">
			<header class="editor-panel-header">
				<div>
					<h2>Live Runtime</h2>
					<p>{workspace.selectedLevelId} / {workspace.selectedRuntimeSceneId}</p>
				</div>
				<span data-telemetry-state={runtimeTelemetryState}>
					{runtimeTelemetryState}
				</span>
			</header>
			<div class="editor-viewport-status-strip">
				<span>Runtime {runtimeLifecycleLabel()}</span>
				<span>Player {formatRuntimePosition()}</span>
				<span>Input {formatRuntimeInput()}</span>
			</div>
			<div class="editor-actions">
				<button
					type="button"
					disabled={!channel || !selectedWorkspaceObject?.previewTargetKind}
					onclick={sendCoreObjectPreview}
				>
					Preview Selected
				</button>
				<button
					type="button"
					disabled={!channel || !selectedWorkspaceObject?.previewTargetKind}
					onclick={clearCoreObjectPreview}
				>
					Clear Preview
				</button>
				<button type="button" disabled={!channel} onclick={reloadLiveRuntime}>
					Reload Runtime
				</button>
			</div>
		</section>

		{#if selectedObjectFocusGroup}
			<section
				class="editor-panel editor-object-focus"
				aria-label="Selection summary"
			>
				<header class="editor-panel-header">
					<div>
						<h2>Selection Summary</h2>
						<p>{workspace.selectedLevelId} / {workspace.selectedRuntimeSceneId}</p>
					</div>
					<span>{workspace.objects.length} objects</span>
				</header>
				<div class="editor-selection-context" aria-live="polite">
					<strong>{editorSelectionState.selectedCount} selected</strong>
					<span>
						{editorSelectionState.mode === "multi"
							? `Primary inspector: ${selectedWorkspaceObject?.label ?? "none"}`
							: "Inspector follows the selected stable-ID object."}
					</span>
					{#if editorSelectionState.mode === "multi"}
						<small>{editorSelectionState.bulkStageReason}</small>
					{/if}
				</div>
				{#if editorSelectionState.selectedCount > 1}
					<div class="editor-selection-set" aria-label="Selection set">
						<div class="editor-selection-set-summary">
							<div>
								<strong>Categories</strong>
								<span>
									{editorSelectionState.categorySummaries
										.map((summary) => `${summary.category}: ${summary.count}`)
										.join(" / ")}
								</span>
							</div>
							<div>
								<strong>Common Components</strong>
								<span>
									{editorSelectionState.commonComponentNames.length > 0
										? editorSelectionState.commonComponentNames.join(", ")
										: "none"}
								</span>
							</div>
						</div>
						<div class="editor-selection-set-list">
							{#each editorSelectionState.selectedObjects as object}
								<div
									class="editor-selection-set-row"
									data-selected-primary={objectIsPrimarySelection(object.stableId)}
								>
									<div>
										<strong>{object.label}</strong>
										<span>{object.category} / {object.stableId}</span>
									</div>
									<div class="editor-selection-set-actions">
										<button
											type="button"
											disabled={objectIsPrimarySelection(object.stableId)}
											onclick={() => makePrimarySelection(object.stableId)}
										>
											Primary
										</button>
										<button
											type="button"
											onclick={() => removeObjectFromSelection(object.stableId)}
										>
											Remove
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
				<div
					class="editor-object-category-rail"
					role="tablist"
					aria-label="Object categories"
				>
					{#each objectFocusGroups as group}
						<button
							type="button"
							role="tab"
							aria-selected={group.category === selectedObjectFocusGroup.category}
							class:selected-category={group.category ===
								selectedObjectFocusGroup.category}
							onclick={() => selectObjectGroup(group.category)}
						>
							<span>{group.label}</span>
							<small>{group.objects.length}</small>
						</button>
					{/each}
				</div>
				<div class="editor-object-focus-grid">
					<div
						class="editor-object-map"
						aria-label={`${selectedObjectFocusGroup.label} spatial layout`}
						data-object-category={selectedObjectFocusGroup.category}
					>
						<div class="editor-object-map-core">
							<strong>{selectedObjectFocusGroup.label}</strong>
							<span>{selectedObjectFocusGroup.objects.length} objects</span>
						</div>
						{#each selectedObjectFocusGroup.objects as object, index}
							<button
								type="button"
								class:selected-map-object={objectIsSelected(object.stableId)}
								class:primary-selected-map-object={objectIsPrimarySelection(
									object.stableId,
								)}
								style={objectFocusPinStyle(selectedObjectFocusGroup, object)}
								aria-pressed={objectIsSelected(object.stableId)}
								data-selected-primary={objectIsPrimarySelection(object.stableId)}
								title={`${object.label}: ${objectTargetLabel(object)}`}
								onclick={(event) =>
									selectObjectFromPointer(event, object.stableId)}
							>
								<span>{index + 1}</span>
							</button>
						{/each}
					</div>
					<div class="editor-object-focus-list">
						{#each selectedObjectFocusGroup.objects as object, index}
							<button
								type="button"
								class:selected-object-row={objectIsSelected(object.stableId)}
								class:primary-selected-object-row={objectIsPrimarySelection(
									object.stableId,
								)}
								aria-pressed={objectIsSelected(object.stableId)}
								data-selected-primary={objectIsPrimarySelection(object.stableId)}
								onclick={(event) =>
									selectObjectFromPointer(event, object.stableId)}
							>
								<span>{index + 1}. {object.label}</span>
								<small>
									{objectTargetLabel(object)} / {objectPositionLabel(object)}
								</small>
							</button>
						{/each}
					</div>
					<div class="editor-object-focus-detail">
						{#if selectedWorkspaceObject}
							<strong>{selectedWorkspaceObject.label}</strong>
							<div
								class="editor-workflow-badges"
								aria-label="Selected object workflow"
							>
								{#each selectedWorkspaceObject.workflow.labels as label}
									<span>{label}</span>
								{/each}
							</div>
							<dl class="editor-facts editor-facts-compact">
								<div>
									<dt>Stable ID</dt>
									<dd>{selectedWorkspaceObject.stableId}</dd>
								</div>
								<div>
									<dt>Category</dt>
									<dd>{selectedWorkspaceObject.category}</dd>
								</div>
								<div>
									<dt>Position</dt>
									<dd>{objectPositionLabel(selectedWorkspaceObject)}</dd>
								</div>
								<div>
									<dt>Reference</dt>
									<dd>{objectTargetLabel(selectedWorkspaceObject)}</dd>
								</div>
								<div>
									<dt>Save</dt>
									<dd>
										{formatWorkflowValue(
											selectedWorkspaceObject.workflow.publishability,
										)}
									</dd>
								</div>
							</dl>
							<p class="editor-note">
								{objectDescriptor(selectedWorkspaceObject)}
							</p>
							<p class="editor-workflow-reason">
								{selectedWorkspaceObject.workflow.reason}
							</p>
							<div class="editor-actions">
								<button
									type="button"
									disabled={!channel || !selectedWorkspaceObject.previewTargetKind}
									onclick={sendCoreObjectPreview}
								>
									Preview Object
								</button>
								<button
									type="button"
									disabled={!channel || !selectedWorkspaceObject.previewTargetKind}
									onclick={clearCoreObjectPreview}
								>
									Clear Preview
								</button>
								<button
									type="button"
									disabled={!selectedInstanceDuplicationReadiness.canStage}
									title={selectedInstanceDuplicationReadiness.reason}
									data-selected-instance-duplicate-ready={selectedInstanceDuplicationReadiness.canStage}
									onclick={stageSelectedInstanceDuplicate}
								>
									Duplicate
								</button>
								<button
									type="button"
									disabled={!selectedInstanceRemovalReadiness.canStage}
									title={selectedInstanceRemovalReadiness.reason}
									data-selected-instance-removal-ready={selectedInstanceRemovalReadiness.canStage}
									onclick={stageSelectedInstanceRemoval}
								>
									Stage Removal
								</button>
							</div>
							<p class="editor-workflow-reason">
								{selectedInstanceDuplicationReadiness.reason}
							</p>
							<p class="editor-workflow-reason">
								{selectedInstanceRemovalReadiness.reason}
							</p>
						{:else}
							<strong>Select an object</strong>
							<p class="editor-note">
								Choose an object to load its inspector fields and preview controls.
							</p>
						{/if}
					</div>
				</div>
			</section>
		{/if}

			<details class="editor-panel editor-graph-panel" aria-label="Engine graph">
				<summary class="editor-panel-header">
					<h2>Engine Map</h2>
					<span>{workspace.persistence.mode}</span>
				</summary>
			<div class="editor-engine-graph">
				{#each workspace.graph.nodes as node}
					<button
						type="button"
						class:selected-graph-node={node.id === selectedGraphNode ||
							node.selected}
						class={`editor-graph-node editor-graph-${node.kind} editor-graph-${node.status}`}
						onclick={() => (selectedGraphNode = node.id)}
					>
						<span>{node.label}</span>
						{#if node.count !== undefined}
							<small>{node.count}</small>
						{/if}
					</button>
				{/each}
			</div>
			<div class="editor-graph-edges">
				{#each workspace.graph.edges as edge}
					<span>{edge.from} -> {edge.to}: {edge.label}</span>
				{/each}
			</div>
			</details>
	</main>

	<section class="editor-panel editor-inspector" aria-label="Inspector">
		{#if selectedWorkspaceObject}
			<header class="editor-panel-header">
				<div>
					<h2>Inspector</h2>
					<p>{selectedWorkspaceObject.stableId}</p>
				</div>
				<span>{selectedWorkspaceObject.category}</span>
			</header>
			<dl class="editor-facts editor-facts-compact">
				<div>
					<dt>Prefab</dt>
					<dd>{selectedWorkspaceObject.prefabId}</dd>
				</div>
				<div>
					<dt>Owner</dt>
					<dd>{selectedWorkspaceObject.sourceOwner}</dd>
				</div>
				<div>
					<dt>Components</dt>
					<dd>{selectedWorkspaceObject.componentNames.join(", ")}</dd>
				</div>
				<div>
					<dt>Capability</dt>
					<dd>{selectedWorkspaceObject.capabilities.join(", ")}</dd>
				</div>
			</dl>
			<div
				class="editor-workflow-summary"
				data-workflow-publishability={selectedWorkspaceObject.workflow.publishability}
			>
				<div class="editor-workflow-badges" aria-label="Inspector workflow">
					{#each selectedWorkspaceObject.workflow.labels as label}
						<span>{label}</span>
					{/each}
				</div>
				<dl class="editor-facts editor-facts-compact">
					<div>
						<dt>Preview</dt>
						<dd>{formatWorkflowValue(selectedWorkspaceObject.workflow.preview)}</dd>
					</div>
					<div>
						<dt>Storage</dt>
						<dd>{formatWorkflowValue(selectedWorkspaceObject.workflow.storage)}</dd>
					</div>
					<div>
						<dt>Publish</dt>
						<dd>
							{formatWorkflowValue(
								selectedWorkspaceObject.workflow.publishability,
							)}
						</dd>
					</div>
					<div>
						<dt>Owners</dt>
						<dd>
							{selectedWorkspaceObject.workflow.featureFamilyIds.join(", ")}
						</dd>
					</div>
				</dl>
				<p class="editor-workflow-reason">
					{selectedWorkspaceObject.workflow.reason}
				</p>
			</div>
			<div class="editor-selected-preview">
				<div
					class="editor-preview-media"
					data-preview-mode={selectedWorkspaceObject.preview.primaryAsset?.mode ??
						"none"}
				>
					{#if selectedWorkspaceObject.preview.primaryAsset?.mode === "image"}
						<img
							src={selectedWorkspaceObject.preview.primaryAsset.url}
							alt=""
							loading="lazy"
						/>
					{:else if selectedWorkspaceObject.preview.primaryAsset?.mode === "audio"}
						<audio
							controls
							src={selectedWorkspaceObject.preview.primaryAsset.url}
						></audio>
					{:else if selectedWorkspaceObject.preview.primaryAsset?.mode === "material"}
						<span
							class="editor-material-swatch"
							style:background-color={selectedWorkspaceObject.preview
								.primaryAsset.swatchColor ?? "#39b7a3"}
						></span>
					{:else}
						<span>
							{selectedWorkspaceObject.preview.primaryAsset?.kind ?? "no asset"}
						</span>
					{/if}
				</div>
				<div class="editor-preview-copy">
					<strong>{selectedWorkspaceObject.preview.title}</strong>
					<span>{selectedWorkspaceObject.preview.subtitle}</span>
					{#if selectedWorkspaceObject.preview.primaryAsset}
						<a
							href={selectedWorkspaceObject.preview.primaryAsset.url}
							target="_blank"
						>
							{selectedWorkspaceObject.preview.primaryAsset.assetId}
						</a>
					{:else}
						<span>{selectedWorkspaceObject.preview.sourceOwner}</span>
					{/if}
				</div>
			</div>
			<div class="editor-inspector-component-groups">
				{#each selectedWorkspaceObject.fieldGroups as fieldGroup}
					<section
						class="editor-inspector-component-group"
						data-workflow-publishability={fieldGroup.workflow.publishability}
						aria-label={`${fieldGroup.label} inspector fields`}
					>
						<header class="editor-inspector-component-header">
							<div>
								<h3>{fieldGroup.label}</h3>
								<p>
									{fieldGroup.editableFieldCount} editable /
									{fieldGroup.readOnlyFieldCount} read-only
								</p>
							</div>
							<span>{formatWorkflowValue(fieldGroup.workflow.publishability)}</span>
						</header>
						<div
							class="editor-workflow-badges"
							aria-label={`${fieldGroup.label} workflow`}
						>
							{#each fieldGroup.workflow.labels as label}
								<span>{label}</span>
							{/each}
						</div>
						<p class="editor-workflow-reason">{fieldGroup.workflow.reason}</p>
						<div class="editor-inspector-fields">
							{#each fieldGroup.fields as field}
								<label
									class="editor-field"
									class:dirty-field={isFieldDirty(selectedWorkspaceObject, field)}
									data-workflow-publishability={field.workflow.publishability}
								>
									<span class="editor-field-title">{field.label}</span>
									{#if field.input === "checkbox"}
										<input
											type="checkbox"
											checked={Boolean(
												fieldDisplayValue(selectedWorkspaceObject, field),
											)}
											disabled={field.readOnly}
											onchange={(event) =>
												handleInspectorFieldInput(
													event,
													selectedWorkspaceObject,
													field,
												)}
											data-editor-inspector-field={field.path}
											data-stable-id={selectedWorkspaceObject.stableId}
										/>
									{:else}
										<input
											type={field.input}
											value={String(
												fieldDisplayValue(selectedWorkspaceObject, field),
											)}
											step={field.step}
											min={field.min}
											readonly={field.readOnly}
											oninput={(event) =>
												handleInspectorFieldInput(
													event,
													selectedWorkspaceObject,
													field,
												)}
											data-editor-inspector-field={field.path}
											data-stable-id={selectedWorkspaceObject.stableId}
										/>
									{/if}
									<small class="editor-field-meta">
										{formatWorkflowValue(field.workflow.publishability)} /
										{formatWorkflowValue(field.workflow.storage)}
									</small>
									<div
										class="editor-workflow-badges"
										aria-label={`${field.label} workflow`}
									>
										{#each field.workflow.labels as label}
											<span>{label}</span>
										{/each}
									</div>
									<small class="editor-field-reason">{field.workflow.reason}</small>
								</label>
							{/each}
						</div>
					</section>
				{/each}
			</div>
			<div class="editor-actions">
				<button
					type="button"
					disabled={!channel || !selectedWorkspaceObject.previewTargetKind}
					onclick={sendCoreObjectPreview}
				>
					Preview Selected
				</button>
				<button
					type="button"
					disabled={!channel || !selectedWorkspaceObject.previewTargetKind}
					onclick={clearCoreObjectPreview}
				>
					Clear Selected
				</button>
				<button type="button" disabled={!channel} onclick={reloadLiveRuntime}>
					Reload Runtime
				</button>
				<button
					type="button"
					disabled={!selectedInstanceDuplicationReadiness.canStage}
					title={selectedInstanceDuplicationReadiness.reason}
					data-selected-instance-duplicate-ready={selectedInstanceDuplicationReadiness.canStage}
					onclick={stageSelectedInstanceDuplicate}
				>
					Duplicate
				</button>
				<button
					type="button"
					disabled={!selectedInstanceRemovalReadiness.canStage}
					title={selectedInstanceRemovalReadiness.reason}
					data-selected-instance-removal-ready={selectedInstanceRemovalReadiness.canStage}
					onclick={stageSelectedInstanceRemoval}
				>
				Stage Removal
				</button>
			</div>
			<p class="editor-workflow-reason">
				{selectedInstanceDuplicationReadiness.reason}
			</p>
			<p class="editor-workflow-reason">
				{selectedInstanceRemovalReadiness.reason}
			</p>
			<p class="editor-note">{selectedWorkspaceObject.capabilityReason}</p>
		{/if}
	</section>
</section>

<section class="editor-bottom-dock" aria-label="Editor bottom dock">
		<details
			class="editor-panel editor-live-runtime"
			aria-label="Live runtime status"
		>
			<summary class="editor-panel-header">
				<h2>Live Runtime</h2>
				<span data-telemetry-state={runtimeTelemetryState}>
					{runtimeTelemetryState}
				</span>
			</summary>
		<div class="editor-runtime-topline">
			<strong>Megameal</strong>
			<span>{runtimeLifecycleLabel()}</span>
		</div>
		<dl class="editor-runtime-grid" aria-live="polite">
			<div>
				<dt>Health</dt>
				<dd>{formatRuntimeHealth()}</dd>
			</div>
			<div>
				<dt>Collected</dt>
				<dd>{runtimeTelemetry?.collectedCount ?? "pending"}</dd>
			</div>
			<div>
				<dt>Remaining</dt>
				<dd>{runtimeTelemetry?.remainingCollectibles ?? "pending"}</dd>
			</div>
			<div>
				<dt>Position</dt>
				<dd>{formatRuntimePosition()}</dd>
			</div>
			<div>
				<dt>Tick</dt>
				<dd>{runtimeTelemetry?.tick ?? "pending"}</dd>
			</div>
			<div>
				<dt>Move</dt>
				<dd>
					{runtimeTelemetry
						? runtimeTelemetry.moving
							? "active"
							: "idle"
						: "pending"}
				</dd>
			</div>
			<div>
				<dt>Input</dt>
				<dd>{formatRuntimeInput()}</dd>
			</div>
			<div>
				<dt>Charge</dt>
				<dd>{formatRuntimeCharge()}</dd>
			</div>
		</dl>
		</details>
	<LevelEditorObjectLibraryPanel
		model={objectLibraryPanelModel}
		selectedEntryId={objectLibraryPanelModel.selectedEntryId}
		onSelectEntry={selectObjectLibraryEntry}
		onStageReplacement={stageObjectLibraryReplacement}
		onStageAuthoringOperations={stageAuthoringOperationEntry}
		onRemoveAuthoringOperations={removeQueuedAuthoringOperationEntry}
	/>
	<LevelEditorEnvironmentPanel
		serializedEnvironmentModel={serializedEnvironmentModel}
		onStageAuthoringOperations={stageAuthoringOperationEntry}
	/>
	<LevelEditorNpcPanel
		serializedNpcCatalog={serializedNpcCatalog}
		selectedRuntimeSceneId={workspace.selectedRuntimeSceneId}
		selectedLevelId={workspace.selectedLevelId}
		onStageAuthoringOperations={stageAuthoringOperationEntry}
	/>
	<LevelEditorCameraPanel
		selectedRuntimeSceneId={workspace.selectedRuntimeSceneId}
	/>
	<LevelEditorAiAssetLab
		runtimeSceneId={workspace.selectedRuntimeSceneId}
		selectedStableIds={editorSelectionState.selectedStableIds}
		onStageAuthoringOperations={stageAuthoringOperationEntry}
	/>
		<details class="editor-panel editor-collision-preview" aria-label="Collision preview">
			<summary class="editor-panel-header">
				<h2>Collision Preview</h2>
				<span>
					{editorSession.preview.status === "ready"
						? editorSession.preview.entryCount
						: "no draft"}
				</span>
			</summary>
		<LevelEditorPreviewControls
			selectedRuntimeSceneId={workspace.selectedRuntimeSceneId}
			serializedPreviewPatch={editorSession.preview.serializedPatch}
			previewStatus={editorSession.preview.status}
			missingReason={editorSession.preview.missingReason}
			onStageAuthoringOperations={stageAuthoringOperationEntry}
		/>
		</details>
		<details class="editor-panel editor-terrain-bake" aria-label="Terrain bake">
			<summary class="editor-panel-header">
				<h2>Terrain / Bake</h2>
				<span>{editorSession.terrain.packageCount} packages</span>
			</summary>
		<dl class="editor-facts editor-facts-compact">
			<div>
				<dt>Scene</dt>
				<dd>{editorSession.terrain.selectedRuntimeSceneId}</dd>
			</div>
			<div>
				<dt>Collision Chunks</dt>
				<dd>{editorSession.terrain.collisionChunkCount}</dd>
			</div>
			<div>
				<dt>Walkable</dt>
				<dd>{editorSession.terrain.walkableChunkCount}</dd>
			</div>
			<div>
				<dt>Bake Hash</dt>
				<dd>{editorSession.bake.derivedBakeHash ?? "not available"}</dd>
			</div>
		</dl>
		</details>
		<details
			class="editor-panel editor-validation-report"
			aria-label="Validation report"
		>
			<summary class="editor-panel-header">
				<h2>Validation Report</h2>
				<span>
					{workspace.validationReport.errorCount} errors / {workspace.validationReport.warningCount} warnings
				</span>
			</summary>
		<div class="editor-status-list">
			{#if workspace.validationReport.items.length === 0}
				<span>no workspace validation findings</span>
			{:else}
				{#each workspace.validationReport.items as item}
					<span title={item.id}>
						{item.severity}: {item.category} / {item.message}
					</span>
				{/each}
			{/if}
		</div>
		<p class="editor-status" data-state={status.kind}>{status.label}</p>
		</details>
		<details class="editor-panel editor-command-plan" aria-label="Command plan">
			<summary class="editor-panel-header">
				<h2>Commands</h2>
				<span>{workspace.authoring.status}</span>
			</summary>
		<dl class="editor-facts editor-facts-compact">
			<div>
				<dt>Draft Target</dt>
				<dd>{workspace.authoring.saveTarget?.targetFile ?? "not registered"}</dd>
			</div>
			<div>
				<dt>Authoring Records</dt>
				<dd>{workspace.authoring.recordCount}</dd>
			</div>
			<div>
				<dt>Document Hash</dt>
				<dd>{workspace.authoring.documentContentHash ?? "blocked"}</dd>
			</div>
			<div>
				<dt>Writable Targets</dt>
				<dd>
					{workspace.authoring.writableTargetCount} / {workspace.authoring.ownerTargetCount}
				</dd>
			</div>
		</dl>
		<div class="editor-plan-switcher" role="tablist" aria-label="Command plans">
			<button
				type="button"
				class:selected-plan={selectedCommandPlanId === "build"}
				onclick={() => (selectedCommandPlanId = "build")}
			>
				Build
			</button>
			<button
				type="button"
				class:selected-plan={selectedCommandPlanId === "publish"}
				onclick={() => (selectedCommandPlanId = "publish")}
			>
				Publish Gates
			</button>
		</div>
		<ol class="editor-plan-list">
			{#each selectedCommandPlan.steps as step}
				<li>
					<strong>{step.phase}</strong>
					<span>{step.label}</span>
					<small>
						{step.command ?? step.action}
						{step.writesAuthoredSource ? " / writes authored source" : ""}
					</small>
				</li>
			{/each}
		</ol>
		{#if latestTransaction}
			<div class="editor-transaction-preview">
				<strong>{latestTransaction.id}</strong>
				<span>
					{latestTransaction.operations.length} operations / {latestTransaction.baseDocumentHash}
				</span>
			</div>
		{/if}
		{#if workspace.authoring.errors.length > 0}
			<div class="editor-status-list">
				{#each workspace.authoring.errors as error}
					<span>{error}</span>
				{/each}
			</div>
		{/if}
		</details>
		<details
			class="editor-panel editor-staged-operations"
			aria-label="Staged operations"
			open={hasDirtyState}
		>
			<summary class="editor-panel-header">
				<h2>Staged Operations</h2>
				<span>{authoringQueue.operationCount}</span>
			</summary>
		<dl class="editor-facts editor-facts-compact">
			<div>
				<dt>Field Edits</dt>
				<dd>{authoringQueue.stagedFieldEditCount}</dd>
			</div>
			<div>
				<dt>Queued Entries</dt>
				<dd>{authoringQueue.queuedOperationEntryCount}</dd>
			</div>
			<div>
				<dt>Total Operations</dt>
				<dd>{authoringQueue.operationCount}</dd>
			</div>
			<div>
				<dt>Owner Write</dt>
				<dd>{stagedPublishReadiness.label}</dd>
			</div>
			<div>
				<dt>Undo / Redo</dt>
				<dd>
					{authoringQueue.undoDepth} / {authoringQueue.redoDepth}
				</dd>
			</div>
			<div>
				<dt>History Limit</dt>
				<dd>{authoringQueue.historyLimit}</dd>
			</div>
		</dl>
		{#if stagedPublishReadiness.reasons.length > 0}
			<div class="editor-status-list" aria-label="Staged publish readiness">
				{#each stagedPublishReadiness.reasons as reason}
					<span>{reason}</span>
				{/each}
			</div>
		{/if}
		{#if stagedFieldEdits.length > 0}
			<ol class="editor-staged-operation-list" aria-label="Staged field edits">
				{#each stagedFieldEdits as edit}
					<li>
						<div>
							<strong>{stagedFieldObjectLabel(edit.stableId)}</strong>
							<span>{edit.label} / {edit.path}</span>
						</div>
						<small>
							{String(edit.before)} -> {String(edit.after)}
						</small>
						<button
							type="button"
							onclick={() => removeStagedFieldEdit(edit.stableId, edit.path)}
						>
							Revert
						</button>
					</li>
				{/each}
			</ol>
		{/if}
		{#if queuedAuthoringOperationEntries.length > 0}
			<ol class="editor-staged-operation-list">
				{#each queuedAuthoringOperationEntries as entry}
					<li>
						<div>
							<strong>{entry.label ?? entry.id}</strong>
							<span>{entry.id}</span>
						</div>
						<small>
							{entry.operations?.length ?? 0} edit operations /
							{entry.saveOperations?.length ?? 0} save operations
						</small>
						<button
							type="button"
							onclick={() => removeQueuedAuthoringOperationEntry(entry.id)}
						>
							Remove
						</button>
					</li>
				{/each}
			</ol>
		{:else if stagedFieldEdits.length === 0}
			<p class="editor-status" data-state="ready">
				No queued object-library, viewport, AI, NPC, environment, or camera
				operations.
			</p>
		{/if}
		</details>
		<details class="editor-panel editor-output-log" aria-label="Output log">
			<summary class="editor-panel-header">
				<h2>Output Log</h2>
				<span>{outputLog.length}</span>
			</summary>
		<ol>
			{#each outputLog as entry}
				<li data-log-level={entry.level}>
					<strong>{entry.source}</strong>
					<span>{entry.message}</span>
				</li>
			{/each}
		</ol>
		</details>
</section>
