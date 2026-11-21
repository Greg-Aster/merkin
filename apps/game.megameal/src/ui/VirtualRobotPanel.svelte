<script lang="ts">
import { onDestroy } from "svelte";
import type { VirtualRobotBridgeClient } from "../app/virtual-robot/virtualRobotBridgeClient.js";
import {
	V2_FOOT_LABELS,
	V2_JOINT_LABELS,
	type VirtualRobotCameraViewMode,
	type VirtualRobotFaceFrame,
	type VirtualRobotUiSnapshot,
} from "../game/virtual-robot/index.js";

const {
	bridge,
	onInputFocusChange,
}: {
	readonly bridge?: VirtualRobotBridgeClient;
	readonly onInputFocusChange?: (focused: boolean) => void;
} = $props();

const panelUi = $state<{
	open: boolean;
	recordingLabel: string;
	faceCanvas: HTMLCanvasElement | undefined;
}>({
	open: false,
	recordingLabel: "v2_lab_walk",
	faceCanvas: undefined,
});
let snapshot: VirtualRobotUiSnapshot = $state({
	relayConnected: false,
	simConnected: false,
	cameraViewMode: "free",
	micActive: false,
	micSupported: false,
});
let unsubscribeState: (() => void) | undefined;
let unsubscribeFace: (() => void) | undefined;

$effect(() => {
	unsubscribeState?.();
	unsubscribeFace?.();
	unsubscribeState = undefined;
	unsubscribeFace = undefined;

	if (!bridge) {
		return;
	}

	unsubscribeState = bridge.subscribe((next) => {
		snapshot = next;
	});
	unsubscribeFace = bridge.subscribeFace((frame) => {
		drawFaceMirror(frame);
	});
});

$effect(() => {
	if (panelUi.open && panelUi.faceCanvas && bridge) {
		const latest = bridge.latestFaceFrame();
		if (latest) {
			drawFaceMirror(latest);
		}
	}
});

onDestroy(() => {
	unsubscribeState?.();
	unsubscribeFace?.();
});

function drawFaceMirror(frame: VirtualRobotFaceFrame): void {
	const canvas = panelUi.faceCanvas;
	if (!canvas) {
		return;
	}
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return;
	}
	const img = ctx.createImageData(frame.width, frame.height);
	img.data.set(frame.rgba);
	ctx.putImageData(img, 0, 0);
}

function setViewMode(mode: VirtualRobotCameraViewMode): void {
	bridge?.setCameraViewMode(mode);
}

function toggleRecording(): void {
	if (snapshot.state?.recording.active) {
		bridge?.stopRecording();
	} else {
		bridge?.startRecording(panelUi.recordingLabel.trim() || "v2_lab");
	}
}
</script>

{#if bridge}
	<div class="v2-dock" data-virtual-robot-panel>
		<button
			type="button"
			class="v2-toggle"
			class:live={snapshot.simConnected}
			onclick={() => {
				panelUi.open = !panelUi.open;
			}}
		>
			<span class="dot" class:ok={snapshot.simConnected}></span>
			<span>Ainekio V2 Sim</span>
			{#if snapshot.state?.recording.active}
				<span class="rec-badge">REC</span>
			{/if}
		</button>

		{#if panelUi.open}
			<section class="v2-panel">
				<header class="v2-header">
					<div>
						<strong>Ainekio V2 · MuJoCo Parity</strong>
						<div class="v2-meta">
							Relay: {snapshot.relayConnected ? "ON" : "OFF"} ·
							Sim: {snapshot.simConnected ? "LIVE" : "WAIT"} ·
							Body Control: {snapshot.state?.gatewayConnected ? "LINKED" : "OFF"}
						</div>
					</div>
					<span class="pill" class:armed={snapshot.state?.armed}>
						{snapshot.state?.armed ? "ARMED" : "DISARMED"}
					</span>
				</header>

				{#if snapshot.lastError}
					<div class="v2-error">{snapshot.lastError}</div>
				{/if}

				<div class="v2-screens">
					<div class="screen-box">
						<div class="screen-label">
							ST7789 Face · {snapshot.state?.face.name ?? "standby"}
						</div>
						<canvas
							bind:this={panelUi.faceCanvas}
							width="320"
							height="170"
							class="face-canvas"
						></canvas>
					</div>
					<div class="screen-box">
						<div class="screen-label">
							OV5647 Chin Cam · {snapshot.state?.camera.enabled ? `${snapshot.state.camera.fps}fps` : "idle"}
						</div>
						{#if snapshot.cameraPreviewDataUrl}
							<img
								src={snapshot.cameraPreviewDataUrl}
								alt="Virtual OV5647 robot chin camera"
								class="cam-preview"
							/>
						{:else}
							<div class="cam-empty">Click Snap or enable Cam in Body Control</div>
						{/if}
					</div>
				</div>

				<div class="v2-telemetry">
					<div class="telem-row">
						<span>IMU (R/P/Y):</span>
						<strong>
							{snapshot.state ? `${snapshot.state.imu.rollDeg.toFixed(1)}° / ${snapshot.state.imu.pitchDeg.toFixed(1)}° / ${snapshot.state.imu.yawDeg.toFixed(1)}°` : "—"}
						</strong>
					</div>
					<div class="telem-row">
						<span>Feet:</span>
						<span class="feet">
							{#each V2_FOOT_LABELS as label, idx}
								<span
									class="foot-pill"
									class:contact={snapshot.state?.footContacts[idx]}
								>{label}</span>
							{/each}
						</span>
					</div>
					<div class="telem-row">
						<span>Battery / Stall:</span>
						<strong>
							{snapshot.state ? `${snapshot.state.batteryVoltage.toFixed(2)}V` : "—"} ·
							mask 0x{(snapshot.state?.stalledMask ?? 0).toString(16)}
						</strong>
					</div>
				</div>

				<div class="v2-group">
					<div class="group-title">Camera & Audio</div>
					<div class="btn-row">
						<button type="button" class:active={snapshot.cameraViewMode === "free"} onclick={() => setViewMode("free")}>Free Cam</button>
						<button type="button" class:active={snapshot.cameraViewMode === "follow"} onclick={() => setViewMode("follow")}>Follow V2</button>
						<button type="button" class:active={snapshot.cameraViewMode === "robot-pov"} onclick={() => setViewMode("robot-pov")}>Robot POV</button>
						<button type="button" onclick={() => void bridge.capturePreviewSnap()}>Snap</button>
						<button
							type="button"
							class:active={snapshot.micActive}
							disabled={!snapshot.micSupported}
							onclick={() => void bridge.toggleMicrophone()}
						>
							{snapshot.micActive ? "Mic Live" : "Tap to Talk"}
						</button>
					</div>
				</div>

				<div class="v2-group">
					<div class="group-title">Physical Interactions (MuJoCo)</div>
					<div class="btn-row">
						<button type="button" onclick={() => bridge.nudge("forward")}>Push +X</button>
						<button type="button" onclick={() => bridge.nudge("left")}>Push +Y</button>
						<button type="button" onclick={() => bridge.nudge("right")}>Push -Y</button>
						<button type="button" onclick={() => bridge.pickupAndShake()}>Pick Up & Shake</button>
						<button type="button" onclick={() => bridge.resetPose()}>Reset Pose</button>
					</div>
				</div>

				<div class="v2-group">
					<div class="group-title">
						Pin / Jam Servo (4th-Wire Stall & I²t Test)
						{#if (snapshot.state?.pinnedJoints.length ?? 0) > 0}
							<button type="button" class="mini-clear" onclick={() => bridge.clearPins()}>Clear</button>
						{/if}
					</div>
					<div class="joint-grid">
						{#each V2_JOINT_LABELS as label, idx}
							{@const pinned = snapshot.state?.pinnedJoints.includes(idx) ?? false}
							{@const stalled = ((snapshot.state?.stalledMask ?? 0) & (1 << idx)) !== 0}
							<button
								type="button"
								class="joint-btn"
								class:pinned
								class:stalled
								title={`${label} (measured ${(snapshot.state?.measuredDeg[idx] ?? 0).toFixed(1)}°)`}
								onclick={() => bridge.togglePinJoint(idx)}
							>
								<span>J{idx}</span>
								<small>{(snapshot.state?.jointsDeg[idx] ?? 0).toFixed(0)}°</small>
							</button>
						{/each}
					</div>
				</div>

				<div class="v2-group">
					<div class="group-title">RL / Gait Rollout Recording (50 Hz)</div>
					<div class="rec-row">
						<input
							type="text"
							bind:value={panelUi.recordingLabel}
							placeholder="episode label"
							onfocus={() => onInputFocusChange?.(true)}
							onblur={() => onInputFocusChange?.(false)}
						/>
						<button
							type="button"
							class:recording={snapshot.state?.recording.active}
							onclick={toggleRecording}
						>
							{snapshot.state?.recording.active
								? `Stop (${snapshot.state.recording.steps})`
								: "Record"}
						</button>
					</div>
				</div>
			</section>
		{/if}
	</div>
{/if}

<style>
	.v2-dock {
		position: fixed;
		top: 12px;
		right: 12px;
		z-index: 30;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 8px;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		color: #e6f1ff;
	}

	.v2-toggle {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 7px 12px;
		border-radius: 999px;
		border: 1px solid rgba(110, 210, 255, 0.35);
		background: rgba(10, 18, 28, 0.88);
		color: #e6f1ff;
		font-size: 12px;
		cursor: pointer;
		backdrop-filter: blur(8px);
	}

	.v2-toggle.live {
		border-color: rgba(51, 239, 203, 0.7);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #64748b;
	}

	.dot.ok {
		background: #33efcb;
		box-shadow: 0 0 8px #33efcb;
	}

	.rec-badge {
		padding: 1px 6px;
		border-radius: 4px;
		background: #ef4444;
		color: #fff;
		font-weight: 700;
		font-size: 10px;
	}

	.v2-panel {
		width: 360px;
		max-height: calc(100vh - 70px);
		overflow-y: auto;
		padding: 12px;
		border-radius: 12px;
		border: 1px solid rgba(120, 200, 255, 0.25);
		background: rgba(8, 14, 22, 0.92);
		backdrop-filter: blur(12px);
		display: flex;
		flex-direction: column;
		gap: 10px;
		font-size: 11px;
	}

	.v2-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 8px;
	}

	.v2-meta {
		color: #93b4d4;
		font-size: 10px;
		margin-top: 2px;
	}

	.pill {
		padding: 2px 7px;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 700;
		background: rgba(148, 163, 184, 0.2);
		color: #cbd5e1;
	}

	.pill.armed {
		background: rgba(34, 197, 94, 0.25);
		color: #4ade80;
	}

	.v2-error {
		padding: 6px 8px;
		border-radius: 6px;
		background: rgba(239, 68, 68, 0.2);
		border: 1px solid rgba(239, 68, 68, 0.45);
		color: #fecaca;
	}

	.v2-screens {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.screen-box {
		border: 1px solid rgba(148, 163, 184, 0.2);
		border-radius: 8px;
		padding: 5px;
		background: #03070c;
	}

	.screen-label {
		font-size: 9px;
		color: #8fb4d9;
		margin-bottom: 4px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.face-canvas,
	.cam-preview {
		display: block;
		width: 100%;
		height: 82px;
		object-fit: cover;
		border-radius: 4px;
		background: #000;
	}

	.cam-empty {
		height: 82px;
		display: grid;
		place-items: center;
		text-align: center;
		color: #64748b;
		font-size: 10px;
		padding: 4px;
	}

	.v2-telemetry {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 7px;
		border-radius: 8px;
		background: rgba(20, 32, 48, 0.55);
	}

	.telem-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.feet {
		display: inline-flex;
		gap: 4px;
	}

	.foot-pill {
		padding: 1px 6px;
		border-radius: 4px;
		background: rgba(100, 116, 139, 0.25);
		color: #94a3b8;
		font-size: 10px;
	}

	.foot-pill.contact {
		background: rgba(32, 207, 255, 0.28);
		color: #7ee8ff;
	}

	.v2-group {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.group-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 10px;
		color: #93b4d4;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.btn-row {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	button {
		padding: 5px 8px;
		border-radius: 6px;
		border: 1px solid rgba(148, 163, 184, 0.3);
		background: rgba(30, 41, 59, 0.75);
		color: #e2e8f0;
		font: inherit;
		font-size: 10px;
		cursor: pointer;
	}

	button:hover:not(:disabled) {
		background: rgba(51, 65, 85, 0.9);
	}

	button.active {
		border-color: #20cfff;
		background: rgba(32, 207, 255, 0.22);
		color: #fff;
	}

	button.recording {
		border-color: #ef4444;
		background: rgba(239, 68, 68, 0.3);
		color: #fff;
	}

	.mini-clear {
		padding: 2px 6px;
		font-size: 9px;
	}

	.joint-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 4px;
	}

	.joint-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 4px 2px;
	}

	.joint-btn.pinned {
		border-color: #f59e0b;
		background: rgba(245, 158, 11, 0.28);
	}

	.joint-btn.stalled {
		border-color: #ef4444;
		background: rgba(239, 68, 68, 0.35);
	}

	.rec-row {
		display: flex;
		gap: 6px;
	}

	.rec-row input {
		flex: 1;
		padding: 5px 8px;
		border-radius: 6px;
		border: 1px solid rgba(148, 163, 184, 0.3);
		background: rgba(15, 23, 42, 0.9);
		color: #f8fafc;
		font: inherit;
		font-size: 11px;
	}
</style>
