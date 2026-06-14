<script lang="ts">
import { onDestroy, onMount } from "svelte";
import {
	type LevelEditorCameraLiveEditPoseData,
	createCameraLiveEditModeMessage,
} from "../../engine/data/index.js";
import {
	type LevelEditorPreviewChannelPort,
	createBrowserLevelEditorPreviewChannel,
} from "../devPreview/index.js";
import {
	type LevelEditorCameraModeOperationDraft,
	createLevelEditorCameraModeOperationDraft,
} from "./levelEditorEnvironmentPanels.js";
import { sendLevelEditorDevPreviewMessage } from "./levelEditorPreviewSender.js";

type Props = {
	readonly selectedRuntimeSceneId: string;
};

type CameraPanelStatus = {
	readonly kind: "idle" | "ready" | "sent" | "error";
	readonly label: string;
};

const { selectedRuntimeSceneId }: Props = $props();
let channel: LevelEditorPreviewChannelPort | undefined = $state();
let status: CameraPanelStatus = $state({
	kind: "idle",
	label: "Preview channel initializing",
});
let positionX = $state(0);
let positionY = $state(3);
let positionZ = $state(8);
let rotationX = $state(0);
let rotationY = $state(0);
let rotationZ = $state(0);
let rotationW = $state(1);
let fovDegrees = $state(55);
let near = $state(0.1);
let far = $state(250);
let stagedDraft: LevelEditorCameraModeOperationDraft | undefined = $state();

onMount(() => {
	channel = createBrowserLevelEditorPreviewChannel();
	status = channel
		? { kind: "ready", label: "Preview channel ready" }
		: { kind: "error", label: "Preview channel unavailable" };
});

onDestroy(() => {
	channel?.close();
});

function stageCameraEditMode(): void {
	stagedDraft = createLevelEditorCameraModeOperationDraft({
		runtimeSceneId: selectedRuntimeSceneId,
		mode: "edit",
		pose: currentPose(),
	});
}

function stageGameplayMode(): void {
	stagedDraft = createLevelEditorCameraModeOperationDraft({
		runtimeSceneId: selectedRuntimeSceneId,
		mode: "gameplay",
	});
}

function sendCameraMode(): void {
	if (!channel) {
		status = { kind: "error", label: "Preview channel unavailable" };
		return;
	}

	if (!stagedDraft) {
		stageCameraEditMode();
	}

	if (!stagedDraft) {
		status = { kind: "error", label: "No camera draft staged" };
		return;
	}

	const message = createCameraLiveEditModeMessage({
		requestId: createRequestId("camera-live-edit"),
		request: stagedDraft.request,
	});

	sendLevelEditorDevPreviewMessage(channel, message);
	status = {
		kind: "sent",
		label: `Sent ${stagedDraft.mode} camera mode`,
	};
}

function currentPose(): LevelEditorCameraLiveEditPoseData {
	return {
		position: [positionX, positionY, positionZ],
		rotation: [rotationX, rotationY, rotationZ, rotationW],
		fovDegrees,
		near,
		far,
	};
}

function createRequestId(prefix: string): string {
	return `${prefix}:${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

function readNumberInput(event: Event, fallback: number): number {
	const value = Number((event.currentTarget as HTMLInputElement).value);
	return Number.isFinite(value) ? value : fallback;
}

function updatePositionX(event: Event): void {
	positionX = readNumberInput(event, positionX);
}

function updatePositionY(event: Event): void {
	positionY = readNumberInput(event, positionY);
}

function updatePositionZ(event: Event): void {
	positionZ = readNumberInput(event, positionZ);
}

function updateRotationX(event: Event): void {
	rotationX = readNumberInput(event, rotationX);
}

function updateRotationY(event: Event): void {
	rotationY = readNumberInput(event, rotationY);
}

function updateRotationZ(event: Event): void {
	rotationZ = readNumberInput(event, rotationZ);
}

function updateRotationW(event: Event): void {
	rotationW = readNumberInput(event, rotationW);
}

function updateFovDegrees(event: Event): void {
	fovDegrees = readNumberInput(event, fovDegrees);
}

function updateNear(event: Event): void {
	near = readNumberInput(event, near);
}

function updateFar(event: Event): void {
	far = readNumberInput(event, far);
}
</script>

<section class="editor-panel" aria-label="Camera authoring">
	<header class="editor-panel-header">
		<div>
			<h2>Camera</h2>
			<p>{selectedRuntimeSceneId}</p>
		</div>
		<span>{stagedDraft?.mode ?? "live"}</span>
	</header>

	<div class="editor-inspector-fields">
		<label class="editor-field">
			<span>X</span>
				<input
					value={positionX}
					type="number"
					step="0.1"
					oninput={updatePositionX}
				/>
			</label>
		<label class="editor-field">
			<span>Y</span>
				<input
					value={positionY}
					type="number"
					step="0.1"
					oninput={updatePositionY}
				/>
			</label>
		<label class="editor-field">
			<span>Z</span>
				<input
					value={positionZ}
					type="number"
					step="0.1"
					oninput={updatePositionZ}
				/>
			</label>
		<label class="editor-field">
			<span>RX</span>
				<input
					value={rotationX}
					type="number"
					step="0.01"
					oninput={updateRotationX}
				/>
			</label>
		<label class="editor-field">
			<span>RY</span>
				<input
					value={rotationY}
					type="number"
					step="0.01"
					oninput={updateRotationY}
				/>
			</label>
		<label class="editor-field">
			<span>RZ</span>
				<input
					value={rotationZ}
					type="number"
					step="0.01"
					oninput={updateRotationZ}
				/>
			</label>
		<label class="editor-field">
			<span>RW</span>
				<input
					value={rotationW}
					type="number"
					step="0.01"
					oninput={updateRotationW}
				/>
			</label>
		<label class="editor-field">
			<span>FOV</span>
				<input
					value={fovDegrees}
					type="number"
					min="1"
					step="1"
					oninput={updateFovDegrees}
				/>
			</label>
		<label class="editor-field">
			<span>Near</span>
				<input
					value={near}
					type="number"
					min="0.01"
					step="0.01"
					oninput={updateNear}
				/>
			</label>
		<label class="editor-field">
			<span>Far</span>
				<input
					value={far}
					type="number"
					min="1"
					step="1"
					oninput={updateFar}
				/>
			</label>
	</div>

	<div class="editor-actions">
		<button type="button" onclick={stageCameraEditMode}>Stage Edit Mode</button>
		<button type="button" onclick={stageGameplayMode}>Stage Live Mode</button>
		<button type="button" disabled={!channel} onclick={sendCameraMode}>
			Send Camera Mode
		</button>
	</div>

	<dl class="editor-facts editor-facts-compact">
		<div>
			<dt>Draft</dt>
			<dd>{stagedDraft?.operation ?? "none"}</dd>
		</div>
		<div>
			<dt>Writes Files</dt>
			<dd>{stagedDraft ? String(stagedDraft.writesFiles) : "false"}</dd>
		</div>
		<div>
			<dt>Status</dt>
			<dd>{status.label}</dd>
		</div>
	</dl>
</section>
