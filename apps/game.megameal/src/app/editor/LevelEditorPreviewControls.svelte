<script lang="ts">
import { onDestroy, onMount } from "svelte";
import {
	type CollisionCookPreviewPatch,
	type LevelEditorCameraLiveEditModeRequest,
	type LevelEditorRuntimeReloadAckPayload,
	parseCollisionCookPreviewPatch,
	parseLevelEditorDevPreviewMessage,
} from "../../engine/data/index.js";
import {
	type LevelEditorPreviewChannelPort,
	createBrowserLevelEditorPreviewChannel,
} from "../devPreview/index.js";
import {
	type StageCollisionAuthoringOperationsCallback,
	buildCollisionPreviewGeneratedSaveQueueEntry,
} from "./levelEditorCollisionAuthoring.js";
import {
	buildCameraLiveEditModeMessage,
	buildCollisionPreviewClearRequestMessage,
	buildCollisionPreviewPatchMessage,
	buildRuntimeReloadRequestMessage,
	sendLevelEditorDevPreviewMessage,
} from "./levelEditorPreviewSender.js";

type Props = {
	readonly selectedRuntimeSceneId: string;
	readonly serializedPreviewPatch: string | null;
	readonly previewStatus: "ready" | "missing-draft";
	readonly missingReason: string | null;
	readonly cameraEditPose?: LevelEditorCameraLiveEditModeRequest["pose"] | null;
	readonly onStageAuthoringOperations?: StageCollisionAuthoringOperationsCallback;
};

type PreviewStatus = {
	readonly kind: "idle" | "ready" | "sent" | "error";
	readonly label: string;
};

type Mutable<TValue> = {
	-readonly [TKey in keyof TValue]: TValue[TKey] extends object
		? Mutable<TValue[TKey]>
		: TValue[TKey];
};

const {
	selectedRuntimeSceneId,
	serializedPreviewPatch,
	previewStatus,
	missingReason,
	cameraEditPose = null,
	onStageAuthoringOperations,
}: Props = $props();
let channel: LevelEditorPreviewChannelPort | undefined = $state();
let status: PreviewStatus = $state({
	kind: "idle",
	label: "Initializing preview channel",
});
let lastReloadAck: LevelEditorRuntimeReloadAckPayload | undefined = $state();
let unsubscribePreviewMessages: (() => void) | undefined;
const collisionEditorPatch = $derived(selectedCollisionPreviewPatch());
const vectorAxes = ["x", "y", "z"] as const;
const collisionIntentOptions = ["solid", "trigger", "walkable"] as const;
const collisionChannelOptions = ["worldStatic", "trigger", "player"] as const;

onMount(() => {
	channel = createBrowserLevelEditorPreviewChannel();
	status = channel
		? { kind: "ready", label: "Preview channel ready" }
		: { kind: "error", label: "Preview channel unavailable" };

	if (channel) {
		unsubscribePreviewMessages = channel.subscribe(handlePreviewChannelMessage);
	}
});

onDestroy(() => {
	unsubscribePreviewMessages?.();
	channel?.close();
});

function sendPreviewPatch(): void {
	if (!channel) {
		status = { kind: "error", label: "Preview channel unavailable" };
		return;
	}

	if (previewStatus !== "ready") {
		status = { kind: "error", label: missingCollisionDraftLabel() };
		return;
	}

	const basePatch = selectedCollisionPreviewPatch();

	if (basePatch === undefined) {
		status = { kind: "error", label: missingCollisionDraftLabel() };
		return;
	}

	const patch = buildEditedPreviewPatch(basePatch);
	const message = buildCollisionPreviewPatchMessage(
		createRequestId("collision-preview"),
		patch,
	);
	sendLevelEditorDevPreviewMessage(channel, message);
	stageCollisionAuthoringOperations(patch);
	status = {
		kind: "sent",
		label: `Sent ${message.payload.entries.length} collision preview entries`,
	};
}

function sendReloadRequest(): void {
	if (!channel) {
		status = { kind: "error", label: "Preview channel unavailable" };
		return;
	}

	const basePatch = selectedCollisionPreviewPatch();
	const message = buildRuntimeReloadRequestMessage({
		requestId: createRequestId("runtime-reload"),
		runtimeSceneId: basePatch?.runtimeSceneId ?? selectedRuntimeSceneId,
		...(previewStatus !== "ready" || basePatch === undefined
			? {}
			: { sourcePlanHash: basePatch.sourcePlanHash }),
	});
	sendLevelEditorDevPreviewMessage(channel, message);
	status = {
		kind: "sent",
		label: `Requested reload for ${basePatch?.runtimeSceneId ?? selectedRuntimeSceneId}`,
	};
}

function sendCameraEditRequest(): void {
	if (cameraEditPose === null) {
		status = { kind: "error", label: "Camera edit pose unavailable" };
		return;
	}

	sendCameraModeRequest("edit", cameraEditPose);
}

function sendGameplayCameraRequest(): void {
	sendCameraModeRequest("gameplay");
}

function sendCameraModeRequest(
	mode: LevelEditorCameraLiveEditModeRequest["mode"],
	pose?: LevelEditorCameraLiveEditModeRequest["pose"],
): void {
	if (!channel) {
		status = { kind: "error", label: "Preview channel unavailable" };
		return;
	}

	const message = buildCameraLiveEditModeMessage({
		requestId: createRequestId(`camera-${mode}`),
		runtimeSceneId: selectedRuntimeSceneId,
		mode,
		...(pose === undefined ? {} : { pose }),
	});
	sendLevelEditorDevPreviewMessage(channel, message);
	status = {
		kind: "sent",
		label:
			mode === "edit"
				? `Requested camera edit mode for ${selectedRuntimeSceneId}`
				: `Restored gameplay camera for ${selectedRuntimeSceneId}`,
	};
}

function sendClearPreviewRequest(): void {
	if (!channel) {
		status = { kind: "error", label: "Preview channel unavailable" };
		return;
	}

	if (previewStatus !== "ready") {
		status = { kind: "error", label: missingCollisionDraftLabel() };
		return;
	}

	const basePatch = selectedCollisionPreviewPatch();

	if (basePatch === undefined) {
		status = { kind: "error", label: missingCollisionDraftLabel() };
		return;
	}

	const message = buildCollisionPreviewClearRequestMessage(
		createRequestId("clear-preview"),
		basePatch,
	);
	sendLevelEditorDevPreviewMessage(channel, message);
	status = {
		kind: "sent",
		label: `Cleared ${basePatch.entries.length} collision preview entries`,
	};
}

function selectedCollisionPreviewPatch():
	| CollisionCookPreviewPatch
	| undefined {
	if (serializedPreviewPatch === null) {
		return undefined;
	}

	return parseCollisionCookPreviewPatch(JSON.parse(serializedPreviewPatch));
}

function missingCollisionDraftLabel(): string {
	return missingReason ?? "No collision draft registered for selected scene";
}

function stageCollisionAuthoringOperations(
	patch: CollisionCookPreviewPatch,
): void {
	const entry = buildCollisionPreviewGeneratedSaveQueueEntry(patch);

	if (entry === null) {
		return;
	}

	onStageAuthoringOperations?.(entry);
}

function handlePreviewChannelMessage(messageData: unknown): void {
	let message: ReturnType<typeof parseLevelEditorDevPreviewMessage>;

	try {
		message = parseLevelEditorDevPreviewMessage(messageData);
	} catch {
		return;
	}

	if (
		message.type !== "runtime-reload-ack" ||
		message.payload.runtimeSceneId !== selectedRuntimeSceneId
	) {
		return;
	}

	lastReloadAck = message.payload;
}

function reloadAckLabel(ack: LevelEditorRuntimeReloadAckPayload): string {
	const activeLabel =
		ack.activeRuntimeSceneId === undefined
			? ""
			: `, active ${ack.activeRuntimeSceneId}`;
	return `${ack.status}: ${ack.reason}${activeLabel}`;
}

function createRequestId(prefix: string): string {
	return `${prefix}:${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

function buildEditedPreviewPatch(basePatch: CollisionCookPreviewPatch) {
	const patch = mutableClone(basePatch);

	for (const entry of patch.entries) {
		for (const field of document.querySelectorAll<HTMLElement>(
			`[data-stable-id="${cssEscape(entry.stableId)}"][data-collision-field]`,
		)) {
			applyFieldValue(entry, field);
		}
	}

	return parseCollisionCookPreviewPatch(patch);
}

function applyFieldValue(
	entry: Mutable<CollisionCookPreviewPatch>["entries"][number],
	field: HTMLElement,
): void {
	const fieldName = field.dataset.collisionField;

	if (field instanceof HTMLSelectElement && fieldName === "intent") {
		entry.colliderComponent.intent =
			field.value as typeof entry.colliderComponent.intent;
		entry.colliderComponent.sensor =
			field.value === "trigger" ? true : undefined;
		return;
	}

	if (field instanceof HTMLSelectElement && fieldName === "channel") {
		entry.colliderComponent.channel = field.value;
		return;
	}

	if (!(field instanceof HTMLInputElement)) {
		return;
	}

	if (fieldName === "channel") {
		entry.colliderComponent.channel = field.value;
		return;
	}

	if (fieldName === "position") {
		entry.transform ??= {};
		entry.transform.position ??= [0, 0, 0];
		entry.transform.position[axisIndex(field.dataset.axis)] =
			numberValue(field);
		return;
	}

	if (fieldName === "scale") {
		entry.transform ??= {};
		entry.transform.scale ??= [1, 1, 1];
		entry.transform.scale[axisIndex(field.dataset.axis)] = numberValue(field);
		return;
	}

	if (
		fieldName === "halfExtents" &&
		entry.colliderComponent.shape.type === "box"
	) {
		const index = Number(field.dataset.axisIndex ?? 0);
		entry.colliderComponent.shape.halfExtents[index] = Math.max(
			0.01,
			numberValue(field),
		);
	}
}

function axisIndex(axis: string | undefined): 0 | 1 | 2 {
	return axis === "y" ? 1 : axis === "z" ? 2 : 0;
}

function numberValue(input: HTMLInputElement): number {
	const value = Number(input.value);
	return Number.isFinite(value) ? value : 0;
}

function cssEscape(value: string): string {
	return globalThis.CSS?.escape?.(value) ?? value.replace(/["\\]/g, "\\$&");
}

function mutableClone<TValue>(value: TValue): Mutable<TValue> {
	return JSON.parse(JSON.stringify(value)) as Mutable<TValue>;
}
</script>

{#if previewStatus === "ready" && collisionEditorPatch}
	<section class="editor-collision-authoring" aria-label="Collision authoring">
		{#each collisionEditorPatch.entries as entry}
			<section class="editor-outliner-group">
				<h3>{entry.stableId}</h3>
				<dl class="editor-facts editor-facts-compact">
					<div>
						<dt>Target</dt>
						<dd>{entry.colliderTarget}</dd>
					</div>
					<div>
						<dt>Shape</dt>
						<dd>{entry.colliderComponent.shape.type}</dd>
					</div>
				</dl>
				<div class="editor-inspector-fields">
					<label class="editor-field">
						<span>Intent</span>
						<select
							data-stable-id={entry.stableId}
							data-collision-field="intent"
						>
							{#each collisionIntentOptions as intent}
								<option
									value={intent}
									selected={intent === entry.colliderComponent.intent}
								>
									{intent}
								</option>
							{/each}
						</select>
					</label>
					<label class="editor-field">
						<span>Channel</span>
						<select
							data-stable-id={entry.stableId}
							data-collision-field="channel"
						>
							{#if !collisionChannelOptions.includes(entry.colliderComponent.channel)}
								<option value={entry.colliderComponent.channel} selected>
									{entry.colliderComponent.channel}
								</option>
							{/if}
							{#each collisionChannelOptions as channelOption}
								<option
									value={channelOption}
									selected={channelOption === entry.colliderComponent.channel}
								>
									{channelOption}
								</option>
							{/each}
						</select>
					</label>
					{#each vectorAxes as axis, axisIndex}
						<label class="editor-field">
							<span>Position {axis}</span>
							<input
								type="number"
								step="0.1"
								value={entry.transform?.position?.[axisIndex] ?? 0}
								data-stable-id={entry.stableId}
								data-collision-field="position"
								data-axis={axis}
							/>
						</label>
					{/each}
					{#each vectorAxes as axis, axisIndex}
						<label class="editor-field">
							<span>Scale {axis}</span>
							<input
								type="number"
								step="0.1"
								value={entry.transform?.scale?.[axisIndex] ?? 1}
								data-stable-id={entry.stableId}
								data-collision-field="scale"
								data-axis={axis}
							/>
						</label>
					{/each}
					{#if entry.colliderComponent.shape.type === "box"}
						{#each vectorAxes as axis, axisIndex}
							<label class="editor-field">
								<span>Half Extents {axis}</span>
								<input
									type="number"
									min="0.01"
									step="0.05"
									value={entry.colliderComponent.shape.halfExtents[axisIndex]}
									data-stable-id={entry.stableId}
									data-collision-field="halfExtents"
									data-axis-index={axisIndex}
								/>
							</label>
						{/each}
					{/if}
				</div>
			</section>
		{/each}
	</section>
{/if}

<div class="editor-actions">
	<button
		type="button"
		disabled={!channel || previewStatus !== "ready"}
		onclick={sendPreviewPatch}
	>
		Preview Collision
	</button>
	<button
		type="button"
		disabled={!channel || previewStatus !== "ready"}
		onclick={sendClearPreviewRequest}
	>
		Clear Preview
	</button>
	<button type="button" disabled={!channel} onclick={sendReloadRequest}>
		Reload Game Window
	</button>
	<button
		type="button"
		disabled={!channel || cameraEditPose === null}
		onclick={sendCameraEditRequest}
	>
		Edit Camera
	</button>
	<button type="button" disabled={!channel} onclick={sendGameplayCameraRequest}>
		Gameplay Camera
	</button>
</div>
<p
	class="editor-status"
	data-state={previewStatus === "missing-draft" ? "idle" : status.kind}
>
	{previewStatus === "missing-draft" ? missingCollisionDraftLabel() : status.label}
</p>
{#if lastReloadAck}
	<p
		class="editor-status"
		data-state={lastReloadAck.status === "accepted" ? "sent" : "error"}
	>
		Reload {reloadAckLabel(lastReloadAck)}
	</p>
{/if}
