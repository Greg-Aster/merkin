/**
 * Browser-side Virtual Robot Bridge client.
 *
 * Connects the active Megameal 3D scene to the MuJoCo-backed Ainekio V2
 * simulator daemon over `/__megameal-dev-bridge`:
 *   - Receives 50 Hz `robot:state` -> drives `ThreeVirtualRobotV2Rig`
 *   - Receives binary `0x01` ST7789 320x170 RGBA -> updates robot face texture & HUD mirror
 *   - Receives binary `0x03` 16 kHz speaker PCM -> plays via Web Audio
 *   - Captures `OV5647` chin camera JPEGs -> sends binary `0x02` back to Body Control
 *   - Captures browser mic 16 kHz PCM -> sends binary `0x04` + mic gate to Body Control
 *   - Sends player physical interactions (wrenches, joint pins, pose reset, recording)
 */

import type * as THREE from "three";
import { BrowserRobotAudioAdapter } from "../../engine/adapters/browser/index.js";
import {
	type ThreeRendererAdapter,
	ThreeVirtualRobotV2Rig,
	type VirtualRobotCanvasLike,
} from "../../engine/adapters/three/index.js";
import {
	BRIDGE_BIN_FACE_RGBA,
	BRIDGE_BIN_SPEAKER_PCM,
	CAMERA_ORIGIN_STREAM,
	VIRTUAL_ROBOT_V2_MODEL_URL,
	type VirtualRobotCameraRequestMessage,
	type VirtualRobotCameraViewMode,
	type VirtualRobotFaceFrame,
	type VirtualRobotOutboundMessage,
	type VirtualRobotStateMessage,
	type VirtualRobotUiSnapshot,
	cameraResolutionDimensions,
	decodeBridgeFaceRgba,
	decodeBridgeSpeakerPcm,
	encodeBridgeCameraJpeg,
	encodeBridgeMicPcm,
	isVirtualRobotInboundMessage,
} from "../../game/virtual-robot/index.js";
import { GAME_DEV_BRIDGE_RELAY_PATH } from "../dev-bridge/gameDevBridge.js";

export type VirtualRobotBridgeClientOptions = {
	readonly renderer: ThreeRendererAdapter;
	readonly sessionId?: string;
	readonly modelUrl?: string;
	readonly worldScale?: number;
};

export type VirtualRobotBridgeClient = {
	subscribe(listener: (snapshot: VirtualRobotUiSnapshot) => void): () => void;
	subscribeFace(listener: (frame: VirtualRobotFaceFrame) => void): () => void;
	latestFaceFrame(): VirtualRobotFaceFrame | undefined;
	snapshot(): VirtualRobotUiSnapshot;
	applyCameraOverride(): void;
	setCameraViewMode(mode: VirtualRobotCameraViewMode): void;
	nudge(direction: "forward" | "back" | "left" | "right"): void;
	pickupAndShake(): void;
	togglePinJoint(jointIndex: number): void;
	clearPins(): void;
	resetPose(): void;
	capturePreviewSnap(): Promise<void>;
	toggleMicrophone(): Promise<void>;
	startRecording(label?: string): void;
	stopRecording(): void;
	dispose(): void;
};

export function createVirtualRobotBridgeClient(
	options: VirtualRobotBridgeClientOptions,
): VirtualRobotBridgeClient {
	const sessionId =
		options.sessionId ?? `megameal-robot-${Date.now().toString(36)}`;
	const modelUrl = options.modelUrl ?? VIRTUAL_ROBOT_V2_MODEL_URL;
	const audio = new BrowserRobotAudioAdapter();

	const rig = new ThreeVirtualRobotV2Rig({
		scene: options.renderer.scene as unknown as THREE.Scene,
		renderer: options.renderer.renderer as unknown as THREE.WebGLRenderer,
		modelUrl,
		worldScale: options.worldScale ?? 1,
		createCanvas(width, height): VirtualRobotCanvasLike {
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			return canvas;
		},
		async encodeCanvasToJpeg(canvas, quality) {
			const htmlCanvas = canvas as unknown as HTMLCanvasElement;
			const blob = await new Promise<Blob | null>((resolve) =>
				htmlCanvas.toBlob(resolve, "image/jpeg", quality),
			);
			if (!blob) {
				throw new Error(
					"Failed to encode virtual OV5647 camera frame as JPEG.",
				);
			}
			const buffer = await blob.arrayBuffer();
			const dataUrl = htmlCanvas.toDataURL("image/jpeg", quality);
			return { jpeg: new Uint8Array(buffer), dataUrl };
		},
	});

	let socket: WebSocket | undefined;
	let reconnectTimer: number | undefined;
	let disposed = false;
	let cameraStreamTimer: number | undefined;
	let cameraCaptureInFlight = false;
	let currentStreamFps = 0;

	let state: VirtualRobotStateMessage | undefined;
	let relayConnected = false;
	let simConnected = false;
	let cameraViewMode: VirtualRobotCameraViewMode = "free";
	let cameraPreviewDataUrl: string | undefined;
	let lastFaceFrame: VirtualRobotFaceFrame | undefined;
	let lastError: string | undefined;
	let lastSimMessageAt = 0;

	const listeners = new Set<(snapshot: VirtualRobotUiSnapshot) => void>();
	const faceListeners = new Set<(frame: VirtualRobotFaceFrame) => void>();

	const buildSnapshot = (): VirtualRobotUiSnapshot => ({
		relayConnected,
		simConnected,
		...(state ? { state } : {}),
		cameraViewMode,
		...(cameraPreviewDataUrl ? { cameraPreviewDataUrl } : {}),
		micActive: audio.micActive,
		micSupported: audio.micSupported,
		...(lastError ? { lastError } : {}),
	});

	const emit = (): void => {
		const snap = buildSnapshot();
		for (const listener of listeners) {
			listener(snap);
		}
	};

	const sendJson = (message: VirtualRobotOutboundMessage): void => {
		if (socket?.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify(message));
		}
	};

	const sendBinary = (payload: Uint8Array): void => {
		if (socket?.readyState === WebSocket.OPEN) {
			socket.send(payload);
		}
	};

	const captureAndSendCamera = async (
		originCode: number,
		originId: number,
		resName: string,
	): Promise<void> => {
		if (disposed || cameraCaptureInFlight || !rig.loaded) {
			return;
		}
		cameraCaptureInFlight = true;
		try {
			const dims = cameraResolutionDimensions(resName);
			const result = await rig.captureChinCameraJpeg(
				dims.width,
				dims.height,
				0.76,
			);
			if (!result || disposed) {
				return;
			}
			cameraPreviewDataUrl = result.dataUrl;
			sendBinary(
				encodeBridgeCameraJpeg({
					originCode,
					resCode: dims.code,
					originId,
					jpeg: result.jpeg,
				}),
			);
			emit();
		} catch (error) {
			lastError =
				error instanceof Error ? error.message : "Camera capture failed.";
			emit();
		} finally {
			cameraCaptureInFlight = false;
		}
	};

	const syncCameraStreamTimer = (): void => {
		const targetFps =
			state?.camera.enabled && state.camera.fps > 0
				? Math.min(15, state.camera.fps)
				: 0;
		if (targetFps === currentStreamFps) {
			return;
		}
		if (cameraStreamTimer !== undefined) {
			window.clearInterval(cameraStreamTimer);
			cameraStreamTimer = undefined;
		}
		currentStreamFps = targetFps;
		if (targetFps > 0) {
			const intervalMs = Math.max(66, Math.round(1000 / targetFps));
			if (simConnected && rig.loaded && state?.camera.enabled) {
				void captureAndSendCamera(CAMERA_ORIGIN_STREAM, 0, state.camera.res);
			}
			cameraStreamTimer = window.setInterval(() => {
				if (!simConnected || !state?.camera.enabled) {
					return;
				}
				void captureAndSendCamera(CAMERA_ORIGIN_STREAM, 0, state.camera.res);
			}, intervalMs);
		}
	};

	const handleBinary = (buffer: ArrayBuffer): void => {
		if (buffer.byteLength < 1) {
			return;
		}
		const tag = new DataView(buffer).getUint8(0);
		if (tag === BRIDGE_BIN_FACE_RGBA) {
			const face = decodeBridgeFaceRgba(buffer);
			if (!face) {
				return;
			}
			lastFaceFrame = face;
			rig.updateFaceRgba(face.width, face.height, face.rgba);
			for (const listener of faceListeners) {
				listener(face);
			}
		} else if (tag === BRIDGE_BIN_SPEAKER_PCM) {
			const speaker = decodeBridgeSpeakerPcm(buffer);
			if (speaker) {
				audio.playSpeakerPcm(speaker.pcm, speaker.volumePercent);
			}
		}
	};

	const handleText = (raw: string): void => {
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return;
		}
		if (!isVirtualRobotInboundMessage(parsed)) {
			return;
		}
		lastSimMessageAt = Date.now();
		if (!simConnected) {
			simConnected = true;
		}

		if (parsed.type === "robot:state") {
			state = parsed;
			rig.applyPose({
				rootPosMj: parsed.rootPosMj,
				rootQuatMjWxyz: parsed.rootQuatMjWxyz,
				jointsDeg: parsed.jointsDeg,
			});
			syncCameraStreamTimer();
			emit();
			return;
		}

		if (parsed.type === "robot:camera-request") {
			const req = parsed as VirtualRobotCameraRequestMessage;
			void captureAndSendCamera(req.originCode, req.originId, req.res);
			return;
		}

		if (parsed.type === "robot:audio-stop") {
			audio.stopSpeaker();
		}
	};

	const connectRelay = (): void => {
		if (disposed || typeof WebSocket === "undefined") {
			return;
		}
		try {
			const url = new URL(GAME_DEV_BRIDGE_RELAY_PATH, window.location.href);
			url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			const ws = new WebSocket(url);
			ws.binaryType = "arraybuffer";
			socket = ws;

			ws.addEventListener("open", () => {
				if (disposed) {
					ws.close();
					return;
				}
				relayConnected = true;
				lastError = undefined;
				ws.send(
					JSON.stringify({
						type: "bridge:hello",
						role: "game",
						sessionId,
					}),
				);
				emit();
			});

			ws.addEventListener("message", (event) => {
				if (typeof event.data === "string") {
					handleText(event.data);
				} else if (event.data instanceof ArrayBuffer) {
					handleBinary(event.data);
				}
			});

			ws.addEventListener("close", () => {
				relayConnected = false;
				simConnected = false;
				socket = undefined;
				emit();
				if (!disposed) {
					reconnectTimer = window.setTimeout(connectRelay, 1500);
				}
			});

			ws.addEventListener("error", () => {
				lastError = "Bridge relay unavailable (is devBridge enabled?).";
				emit();
			});
		} catch (error) {
			lastError =
				error instanceof Error
					? error.message
					: "Failed to open bridge socket.";
			emit();
		}
	};

	// Detect silent simulator disconnect (> 2.5s without state packets)
	const staleTimer = window.setInterval(() => {
		if (simConnected && Date.now() - lastSimMessageAt > 2500) {
			simConnected = false;
			emit();
		}
	}, 1000);

	// Load V2 GLB immediately so the robot is visible even before Body Control connects
	void rig
		.load(modelUrl)
		.then(() => {
			if (!disposed) {
				if (simConnected && state?.camera.enabled) {
					void captureAndSendCamera(CAMERA_ORIGIN_STREAM, 0, state.camera.res);
				}
				emit();
			}
		})
		.catch((error) => {
			lastError =
				error instanceof Error
					? error.message
					: "Failed to load ainekio-v2.glb.";
			emit();
		});

	connectRelay();

	let savedCameraNear: number | undefined;
	let savedCameraFov: number | undefined;

	return {
		subscribe(listener) {
			listeners.add(listener);
			listener(buildSnapshot());
			return () => {
				listeners.delete(listener);
			};
		},
		subscribeFace(listener) {
			faceListeners.add(listener);
			if (lastFaceFrame) {
				listener(lastFaceFrame);
			}
			return () => {
				faceListeners.delete(listener);
			};
		},
		latestFaceFrame() {
			return lastFaceFrame;
		},
		snapshot: buildSnapshot,
		applyCameraOverride() {
			const cam = options.renderer.camera;
			if (cameraViewMode === "free" || !rig.loaded) {
				if (savedCameraNear !== undefined || savedCameraFov !== undefined) {
					if (savedCameraNear !== undefined) {
						cam.near = savedCameraNear;
					}
					if (savedCameraFov !== undefined) {
						cam.fov = savedCameraFov;
					}
					cam.updateProjectionMatrix?.();
					savedCameraNear = undefined;
					savedCameraFov = undefined;
				}
				return;
			}
			if (savedCameraNear === undefined && cam.near !== undefined) {
				savedCameraNear = cam.near;
			}
			if (savedCameraFov === undefined && cam.fov !== undefined) {
				savedCameraFov = cam.fov;
			}
			if (cameraViewMode === "robot-pov") {
				const pose = rig.getChinCameraPose();
				cam.near = 0.02;
				cam.fov = 55;
				cam.updateProjectionMatrix?.();
				cam.position.set(pose.position[0], pose.position[1], pose.position[2]);
				cam.quaternion.set(
					pose.quaternion[0],
					pose.quaternion[1],
					pose.quaternion[2],
					pose.quaternion[3],
				);
				return;
			}
			// Follow third-person orbit camera right behind/above Ainekio V2
			if (savedCameraNear !== undefined) {
				cam.near = Math.min(savedCameraNear, 0.05);
			}
			if (savedCameraFov !== undefined) {
				cam.fov = savedCameraFov;
			}
			cam.updateProjectionMatrix?.();
			const [rx, ry, rz] = rig.getWorldPosition();
			cam.position.set(rx + 0.45, ry + 0.32, rz - 0.52);
			cam.lookAt?.(rx, ry + 0.06, rz);
		},
		setCameraViewMode(mode) {
			cameraViewMode = mode;
			emit();
		},
		nudge(direction) {
			const magnitude = 5.8;
			const forceMj: [number, number, number] =
				direction === "forward"
					? [magnitude, 0, 0.5]
					: direction === "back"
						? [-magnitude, 0, 0.5]
						: direction === "left"
							? [0, magnitude, 0.5]
							: [0, -magnitude, 0.5];
			const torqueMj: [number, number, number] =
				direction === "forward"
					? [0, 0.12, 0]
					: direction === "back"
						? [0, -0.12, 0]
						: direction === "left"
							? [-0.12, 0, 0]
							: [0.12, 0, 0];
			sendJson({
				type: "robot:interact:wrench",
				forceMj,
				torqueMj,
				durationMs: 220,
			});
		},
		pickupAndShake() {
			// Gentle lift (~1.2x robot weight) + brisk roll/pitch shake torque to trigger real IMU reflex
			sendJson({
				type: "robot:interact:wrench",
				forceMj: [0, 0, 7.8],
				torqueMj: [0.18, -0.14, 0.1],
				durationMs: 320,
			});
		},
		togglePinJoint(jointIndex) {
			const alreadyPinned = state?.pinnedJoints.includes(jointIndex) ?? false;
			sendJson({
				type: "robot:interact:pin-joint",
				jointIndex,
				pinned: !alreadyPinned,
			});
		},
		clearPins() {
			sendJson({ type: "robot:interact:clear-pins" });
		},
		resetPose() {
			sendJson({ type: "robot:interact:reset-pose" });
		},
		async capturePreviewSnap() {
			await captureAndSendCamera(
				CAMERA_ORIGIN_STREAM,
				0,
				state?.camera.snapshotRes ?? "VGA",
			);
		},
		async toggleMicrophone() {
			if (audio.micActive) {
				audio.stopMicrophone();
				sendJson({ type: "robot:interact:mic-gate", capturing: false });
				emit();
				return;
			}
			try {
				const started = await audio.startMicrophone((counter, pcm) => {
					sendBinary(encodeBridgeMicPcm({ counter, flags: 0x01, pcm }));
				});
				if (started) {
					sendJson({ type: "robot:interact:mic-gate", capturing: true });
				}
			} catch (error) {
				lastError =
					error instanceof Error ? error.message : "Microphone access denied.";
			}
			emit();
		},
		startRecording(label) {
			sendJson({
				type: "robot:record:start",
				...(label ? { label } : {}),
			});
		},
		stopRecording() {
			sendJson({ type: "robot:record:stop" });
		},
		dispose() {
			if (disposed) {
				return;
			}
			disposed = true;
			window.clearInterval(staleTimer);
			if (cameraStreamTimer !== undefined) {
				window.clearInterval(cameraStreamTimer);
			}
			if (reconnectTimer !== undefined) {
				window.clearTimeout(reconnectTimer);
			}
			socket?.close();
			audio.dispose();
			rig.dispose();
			listeners.clear();
			faceListeners.clear();
		},
	};
}
