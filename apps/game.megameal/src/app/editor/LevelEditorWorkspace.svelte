<script lang="ts">
import { onDestroy, onMount } from "svelte";
import {
	type LevelEditorCoreObjectPreviewPatchEntry,
	type LevelEditorRuntimeTelemetryPayload,
	createCoreObjectPreviewClearRequestMessage,
	createCoreObjectPreviewPatchMessage,
	createRuntimeSceneReloadRequestMessage,
	parseLevelEditorDevPreviewMessage,
} from "../../engine/data/index.js";
import type { LevelEditorAuthoringTransaction } from "../../engine/data/levelAuthoring/index.js";
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
import {
	fetchLevelEditorAuthoringStatus,
	runLevelEditorAuthoringCommand,
} from "./levelEditorAuthoringClient.js";
import {
	type LevelEditorQueuedAuthoringOperation,
	buildLevelEditorAuthoringTransactionFromQueue,
	createLevelEditorAuthoringQueue,
	redoLevelEditorAuthoringQueue,
	stageLevelEditorAuthoringOperations,
	stageLevelEditorFieldEdit,
	undoLevelEditorAuthoringQueue,
} from "./levelEditorAuthoringStore.js";
import {
	serializeEnvironmentAuthoringModel,
	serializeNpcAuthoringCatalog,
} from "./levelEditorEnvironmentPanels.js";
import {
	buildLevelEditorObjectLibraryPanelModel,
	createObjectLibraryReplacementPreviewMessage,
	objectLibrarySubjectFromSelection,
} from "./levelEditorObjectLibrary.js";
import { sendLevelEditorDevPreviewMessage } from "./levelEditorPreviewSender.js";
import type { LevelEditorSessionSummary } from "./levelEditorSession.js";
import type {
	LevelEditorWorkspaceCommand,
	LevelEditorWorkspaceCommandPlan,
	LevelEditorWorkspaceField,
	LevelEditorWorkspaceObject,
} from "./levelEditorWorkspaceModel.js";
import {
	type LevelEditorStagedFieldEdit,
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

const { serializedEditorSession }: Props = $props();
const editorSession = JSON.parse(
	serializedEditorSession,
) as LevelEditorSessionSummary;
const workspace = editorSession.workspace;
let selectedStableId: string = $state(
	workspace.selectedStableId ?? workspace.objects[0]?.stableId ?? "",
);
let selectedGraphNode: string = $state("authored-level");
const selectedWorkspaceObject = $derived(
	workspace.objects.find((object) => object.stableId === selectedStableId),
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
	}),
);
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
let authoringQueue = $state(createLevelEditorAuthoringQueue());
const stagedFieldEdits = $derived(authoringQueue.stagedFieldEdits);
const queuedAuthoringOperationEntries = $derived(
	authoringQueue.queuedOperations,
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
let activeCommandId: LevelEditorWorkspaceCommand["id"] | null = $state(null);
let unsubscribeRuntimeTelemetry: (() => void) | undefined;
let telemetryFreshnessTimer: number | undefined;

onMount(() => {
	channel = createBrowserLevelEditorPreviewChannel();
	status = channel
		? { kind: "ready", label: "Preview channel ready" }
		: { kind: "error", label: "Preview channel unavailable" };

	if (channel) {
		unsubscribeRuntimeTelemetry = channel.subscribe(handleRuntimeTelemetry);
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

function openRuntimeScene(event: Event): void {
	const select = event.currentTarget as HTMLSelectElement;
	const url = new URL(globalThis.location.href);
	url.searchParams.set("scene", select.value);
	globalThis.location.assign(url.toString());
}

function selectObject(stableId: string): void {
	selectedStableId = stableId;
	const object = workspace.objects.find((item) => item.stableId === stableId);
	selectedGraphNode = object ? `category:${object.category}` : "authored-level";
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
	return (
		findStagedFieldEdit(stagedFieldEdits, object.stableId, field.path)?.after ??
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

		authoringQueue = createLevelEditorAuthoringQueue();
		status = {
			kind: "sent",
			label: `Saved ${saveOperationCount} operations to ${saveTarget.targetFile}`,
		};
		appendOutputLog({
			level: "success",
			source: "save",
			message: `${saveResult.message} ${saveResult.artifacts?.length ?? 0} artifacts checked.`,
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
		return "Save or discard staged edits before using this command";
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
		entries: [buildCoreObjectPreviewEntry(object)],
	} as const;
	const message = createCoreObjectPreviewPatchMessage({
		requestId: createRequestId("core-preview"),
		patch,
	});

	sendLevelEditorDevPreviewMessage(channel, message);
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
	status = {
		kind: "sent",
		label: `Cleared preview for ${object.stableId}`,
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

function buildCoreObjectPreviewEntry(
	object: LevelEditorWorkspaceObject,
): LevelEditorCoreObjectPreviewPatchEntry {
	const transform = readTransformPatch(object);

	switch (object.previewTargetKind) {
		case "light":
			return {
				stableId: object.stableId,
				targetKind: "light",
				...(transform === undefined ? {} : { transform }),
				light: readComponentPatch(object, "Light"),
			} as LevelEditorCoreObjectPreviewPatchEntry;
		case "spawn":
			return {
				stableId: object.stableId,
				targetKind: "spawn",
				transform: transform ?? {},
			};
		case "portal":
			return {
				stableId: object.stableId,
				targetKind: "portal",
				...(transform === undefined ? {} : { transform }),
				portal: readComponentPatch(object, "Portal"),
			} as LevelEditorCoreObjectPreviewPatchEntry;
		case "audio-emitter":
			return {
				stableId: object.stableId,
				targetKind: "audio-emitter",
				...(transform === undefined ? {} : { transform }),
				soundEmitter: readComponentPatch(object, "SoundEmitter"),
			} as LevelEditorCoreObjectPreviewPatchEntry;
		default:
			throw new Error("Selected object is not previewable.");
	}
}

function readTransformPatch(object: LevelEditorWorkspaceObject):
	| {
			readonly position?: readonly [number, number, number];
			readonly scale?: readonly [number, number, number];
	  }
	| undefined {
	const position = readVectorField(object, "Transform.position");
	const scale = readVectorField(object, "Transform.scale");
	const transform = {
		...(position === undefined ? {} : { position }),
		...(scale === undefined ? {} : { scale }),
	};

	return Object.keys(transform).length === 0 ? undefined : transform;
}

function readComponentPatch(
	object: LevelEditorWorkspaceObject,
	componentName: "Light" | "Portal" | "SoundEmitter",
): Record<string, unknown> {
	const seedKey =
		componentName === "SoundEmitter"
			? "soundEmitter"
			: componentName === "Portal"
				? "portal"
				: "light";
	const component = cloneRecord(object.previewSeed?.[seedKey]);

	for (const field of object.fields) {
		if (!field.path.startsWith(`${componentName}.`)) {
			continue;
		}

		const property = field.path.slice(componentName.length + 1);
		component[property] = readFieldValue(object, field);
	}

	return component;
}

function readVectorField(
	object: LevelEditorWorkspaceObject,
	path: "Transform.position" | "Transform.scale",
): readonly [number, number, number] | undefined {
	const fields = ["x", "y", "z"].map((axis) =>
		object.fields.find((field) => field.path === `${path}.${axis}`),
	);

	if (fields.some((field) => field === undefined)) {
		return undefined;
	}

	const resolvedFields = fields.filter(
		(field): field is LevelEditorWorkspaceField => field !== undefined,
	);

	return resolvedFields.map((field) =>
		Number(readFieldValue(object, field)),
	) as [number, number, number];
}

function readFieldValue(
	object: LevelEditorWorkspaceObject,
	field: LevelEditorWorkspaceField,
): string | number | boolean {
	const input = document.querySelector<HTMLInputElement>(
		`[data-editor-inspector-field="${cssEscape(field.path)}"][data-stable-id="${cssEscape(object.stableId)}"]`,
	);

	if (!input) {
		return fieldDisplayValue(object, field);
	}

	if (input.type === "checkbox") {
		return input.checked;
	}

	if (field.input === "number") {
		const value = Number(input.value);
		return Number.isFinite(value) ? value : Number(field.value) || 0;
	}

	return input.value;
}

function previewSourceHash(object: LevelEditorWorkspaceObject): string {
	return `workspace:${workspace.selectedRuntimeSceneId}:${object.stableId}:${object.previewTargetKind}`;
}

function createRequestId(prefix: string): string {
	return `${prefix}:${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

function cssEscape(value: string): string {
	return globalThis.CSS?.escape?.(value) ?? value.replace(/["\\]/g, "\\$&");
}

function cloneRecord(value: unknown): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value ?? {})) as Record<string, unknown>;
}

function objectLibraryComponentSnapshots(
	object: LevelEditorWorkspaceObject,
): Pick<
	Parameters<typeof objectLibrarySubjectFromSelection>[0],
	"currentRenderable" | "currentSoundEmitter"
> {
	const renderable =
		object.previewSeed?.renderable &&
		typeof object.previewSeed.renderable === "object"
			? (object.previewSeed.renderable as Record<string, unknown>)
			: undefined;
	const soundEmitter =
		object.previewSeed?.soundEmitter &&
		typeof object.previewSeed.soundEmitter === "object"
			? (object.previewSeed.soundEmitter as Record<string, unknown>)
			: undefined;

	return {
		...(renderable === undefined
			? {}
			: {
					currentRenderable: {
						...(typeof renderable.meshId === "string"
							? { meshId: renderable.meshId }
							: {}),
						...(typeof renderable.materialId === "string"
							? { materialId: renderable.materialId }
							: {}),
					},
				}),
		...(soundEmitter === undefined
			? {}
			: {
					currentSoundEmitter: {
						...(typeof soundEmitter.soundId === "string"
							? { soundId: soundEmitter.soundId }
							: {}),
						...(typeof soundEmitter.volume === "number"
							? { volume: soundEmitter.volume }
							: {}),
					},
				}),
	};
}

function handleRuntimeTelemetry(messageData: unknown): void {
	let message: ReturnType<typeof parseLevelEditorDevPreviewMessage>;

	try {
		message = parseLevelEditorDevPreviewMessage(messageData);
	} catch {
		return;
	}

	if (
		message.type !== "runtime-telemetry" ||
		message.payload.runtimeSceneId !== workspace.selectedRuntimeSceneId
	) {
		return;
	}

	runtimeTelemetry = message.payload;
	lastRuntimeTelemetryReceivedAt = Date.now();
	runtimeTelemetryState = "live";
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
		<span>{dirtyCount} staged items / {authoringQueue.operationCount} operations</span>
	</div>
	<div class="editor-command-actions">
		<button type="button" disabled={!authoringQueue.canUndo} onclick={undoStagedEdit}>
			Undo
		</button>
		<button type="button" disabled={!authoringQueue.canRedo} onclick={redoStagedEdit}>
			Redo
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

<section class="editor-workspace-grid" aria-label="Level editor workspace">
	<aside class="editor-panel editor-outliner" aria-label="Scene outliner">
		<header class="editor-panel-header">
			<h2>Outliner</h2>
			<span>{workspace.objects.length}</span>
		</header>
		<div class="editor-outliner-list">
			{#each workspace.sceneTree as group}
				<section class="editor-outliner-group">
					<h3>{group.label}</h3>
					{#each group.objects as object}
						<button
							type="button"
							class:selected-object={object.stableId === selectedStableId}
							onclick={() => selectObject(object.stableId)}
						>
							<span>{object.label}</span>
							<small>{object.prefabId}</small>
						</button>
					{/each}
				</section>
			{/each}
		</div>
	</aside>

	<section class="editor-panel editor-graph-panel" aria-label="Engine graph">
		<header class="editor-panel-header">
			<h2>Engine Map</h2>
			<span>{workspace.persistence.mode}</span>
		</header>
		<div class="editor-engine-graph">
			{#each workspace.graph.nodes as node}
				<button
					type="button"
					class:selected-graph-node={node.id === selectedGraphNode || node.selected}
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
	</section>

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
			<div class="editor-inspector-fields">
				{#each selectedWorkspaceObject.fields as field}
					<label
						class="editor-field"
						class:dirty-field={isFieldDirty(selectedWorkspaceObject, field)}
					>
						<span>{field.label}</span>
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
					</label>
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
			</div>
			<p class="editor-note">{selectedWorkspaceObject.capabilityReason}</p>
		{/if}
	</section>
</section>

<section class="editor-bottom-grid" aria-label="Editor diagnostics">
	<section
		class="editor-panel editor-live-runtime"
		aria-label="Live runtime status"
	>
		<header class="editor-panel-header">
			<h2>Live Runtime</h2>
			<span data-telemetry-state={runtimeTelemetryState}>
				{runtimeTelemetryState}
			</span>
		</header>
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
	</section>
	<LevelEditorObjectLibraryPanel
		model={objectLibraryPanelModel}
		selectedEntryId={objectLibraryPanelModel.selectedEntryId}
		onStageReplacement={stageObjectLibraryReplacement}
		onStageAuthoringOperations={stageAuthoringOperationEntry}
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
		selectedStableIds={selectedStableId === "" ? [] : [selectedStableId]}
		onStageAuthoringOperations={stageAuthoringOperationEntry}
	/>
	<section class="editor-panel">
		<header class="editor-panel-header">
			<h2>Collision Preview</h2>
			<span>
				{editorSession.preview.status === "ready"
					? editorSession.preview.entryCount
					: "no draft"}
			</span>
		</header>
		<LevelEditorPreviewControls
			selectedRuntimeSceneId={workspace.selectedRuntimeSceneId}
			serializedPreviewPatch={editorSession.preview.serializedPatch}
			previewStatus={editorSession.preview.status}
			missingReason={editorSession.preview.missingReason}
			onStageAuthoringOperations={stageAuthoringOperationEntry}
		/>
	</section>
	<section class="editor-panel">
		<header class="editor-panel-header">
			<h2>Terrain / Bake</h2>
			<span>{editorSession.terrain.packageCount} packages</span>
		</header>
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
	</section>
	<section class="editor-panel">
		<header class="editor-panel-header">
			<h2>Validation</h2>
			<span>{workspace.validation.errors.length} errors</span>
		</header>
		<div class="editor-status-list">
			{#if workspace.validation.errors.length === 0}
				<span>no workspace errors</span>
			{:else}
				{#each workspace.validation.errors as error}
					<span>{error}</span>
				{/each}
			{/if}
			{#each workspace.validation.warnings as warning}
				<span>{warning}</span>
			{/each}
		</div>
		<p class="editor-status" data-state={status.kind}>{status.label}</p>
	</section>
	<section class="editor-panel editor-command-plan" aria-label="Command plan">
		<header class="editor-panel-header">
			<h2>Commands</h2>
			<span>{workspace.authoring.status}</span>
		</header>
		<dl class="editor-facts editor-facts-compact">
			<div>
				<dt>Save Target</dt>
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
				Publish
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
	</section>
	<section class="editor-panel editor-output-log" aria-label="Output log">
		<header class="editor-panel-header">
			<h2>Output Log</h2>
			<span>{outputLog.length}</span>
		</header>
		<ol>
			{#each outputLog as entry}
				<li data-log-level={entry.level}>
					<strong>{entry.source}</strong>
					<span>{entry.message}</span>
				</li>
			{/each}
		</ol>
	</section>
</section>
