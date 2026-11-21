/**
 * Canonical framework-neutral contract for the MuJoCo-backed Ainekio V2
 * Virtual Robot Simulator bridged between Body Control (protocol-v1) and
 * Megameal's 3D world.
 *
 * Pure TypeScript: no Three, Rapier, Svelte, Astro, or browser globals.
 */

export const VIRTUAL_ROBOT_BRIDGE_ROLE = "robot-sim";
export const VIRTUAL_ROBOT_V2_MODEL_URL = "/assets/robots/ainekio-v2.glb";
export const VIRTUAL_ROBOT_FACE_WIDTH = 320;
export const VIRTUAL_ROBOT_FACE_HEIGHT = 170;
export const VIRTUAL_ROBOT_AUDIO_SAMPLE_RATE = 16000;
export const VIRTUAL_ROBOT_AUDIO_FRAME_BYTES = 640;

export const BRIDGE_BIN_FACE_RGBA = 0x01;
export const BRIDGE_BIN_CAMERA_JPEG = 0x02;
export const BRIDGE_BIN_SPEAKER_PCM = 0x03;
export const BRIDGE_BIN_MIC_PCM = 0x04;

export const CAMERA_ORIGIN_STREAM = 0;
export const CAMERA_ORIGIN_REQUEST = 1;
export const CAMERA_ORIGIN_AUDIO = 2;

export const V2_JOINT_LABELS = [
	"rear_left_shoulder",
	"rear_left_carrier",
	"rear_left_crank",
	"rear_right_shoulder",
	"rear_right_carrier",
	"rear_right_crank",
	"front_left_shoulder",
	"front_left_carrier",
	"front_left_crank",
	"front_right_shoulder",
	"front_right_carrier",
	"front_right_crank",
] as const;

export const V2_FOOT_LABELS = ["RL", "RR", "FL", "FR"] as const;

export type VirtualRobotCameraResolution =
	| "QVGA"
	| "VGA"
	| "XGA"
	| "960P"
	| "FHD"
	| "AUTO";

export type VirtualRobotCameraViewMode = "free" | "follow" | "robot-pov";

export type VirtualRobotImuState = {
	readonly rollDeg: number;
	readonly pitchDeg: number;
	readonly yawDeg: number;
	readonly accel: readonly [number, number, number];
	readonly gyro: readonly [number, number, number];
};

export type VirtualRobotFaceState = {
	readonly name: string;
	readonly token: string;
	readonly talking: boolean;
	readonly listening: boolean;
};

export type VirtualRobotCameraState = {
	readonly enabled: boolean;
	readonly fps: number;
	readonly res: VirtualRobotCameraResolution;
	readonly snapshotRes: VirtualRobotCameraResolution;
};

export type VirtualRobotMicrophoneState = {
	readonly enabled: boolean;
	readonly gate: "open" | "vad" | "wake";
	readonly capturing: boolean;
	readonly externalSpeech: boolean;
};

export type VirtualRobotSpeakerState = {
	readonly volumePercent: number;
	readonly busy: boolean;
	readonly rms: number;
};

export type VirtualRobotRecordingState = {
	readonly active: boolean;
	readonly episodeId: string;
	readonly steps: number;
	readonly cameraFrames: number;
	readonly path: string;
};

export type VirtualRobotStateMessage = {
	readonly type: "robot:state";
	readonly robotId: string;
	readonly model: string;
	readonly timestampMs: number;
	readonly simTimeS: number;
	readonly gatewayConnected: boolean;
	readonly armed: boolean;
	readonly enabledMask: number;
	readonly stalledMask: number;
	readonly pinnedJoints: readonly number[];
	/** Canonical MuJoCo coordinates (+X fwd, +Y left, +Z up). */
	readonly rootPosMj: readonly [number, number, number];
	/** Canonical MuJoCo quaternion [w, x, y, z]. */
	readonly rootQuatMjWxyz: readonly [number, number, number, number];
	/** 12 measured MuJoCo joint angles in degrees (joints_v2 order). */
	readonly jointsDeg: readonly number[];
	/** 12 firmware-commanded target angles in degrees. */
	readonly commandedDeg: readonly number[];
	/** 12 4th-wire feedback-filtered angles in degrees. */
	readonly measuredDeg: readonly number[];
	/** Ground contact booleans for [RL, RR, FL, FR]. */
	readonly footContacts: readonly [boolean, boolean, boolean, boolean];
	readonly imu: VirtualRobotImuState;
	readonly face: VirtualRobotFaceState;
	readonly camera: VirtualRobotCameraState;
	readonly microphone: VirtualRobotMicrophoneState;
	readonly speaker: VirtualRobotSpeakerState;
	readonly batteryVoltage: number;
	readonly recording: VirtualRobotRecordingState;
};

export type VirtualRobotCameraRequestMessage = {
	readonly type: "robot:camera-request";
	readonly origin: "stream" | "request" | "audio";
	readonly originCode: number;
	readonly originId: number;
	readonly res: VirtualRobotCameraResolution;
};

export type VirtualRobotAudioStopMessage = {
	readonly type: "robot:audio-stop";
};

export type VirtualRobotArenaGeom = {
	readonly id: string;
	readonly kind: "box" | "ellipsoid";
	readonly position_m: readonly [number, number, number];
	readonly size_m: readonly [number, number, number];
	readonly rpy_deg?: readonly [number, number, number];
	readonly color?: string;
	readonly label?: string;
};

export type VirtualRobotArenaMetaMessage = {
	readonly type: "robot:arena-meta";
	readonly arena: {
		readonly id: string;
		readonly friction: number;
		readonly geoms: readonly VirtualRobotArenaGeom[];
	};
};

export type VirtualRobotInboundMessage =
	| VirtualRobotStateMessage
	| VirtualRobotCameraRequestMessage
	| VirtualRobotAudioStopMessage
	| VirtualRobotArenaMetaMessage;

export type VirtualRobotOutboundMessage =
	| {
			readonly type: "robot:interact:wrench";
			readonly forceMj: readonly [number, number, number];
			readonly torqueMj: readonly [number, number, number];
			readonly durationMs: number;
	  }
	| {
			readonly type: "robot:interact:pin-joint";
			readonly jointIndex: number;
			readonly pinned: boolean;
			readonly angleDeg?: number;
	  }
	| {
			readonly type: "robot:interact:clear-pins";
	  }
	| {
			readonly type: "robot:interact:reset-pose";
			readonly positionMj?: readonly [number, number, number];
			readonly yawRad?: number;
	  }
	| {
			readonly type: "robot:interact:mic-gate";
			readonly capturing: boolean;
			readonly wakeWord?: boolean;
	  }
	| {
			readonly type: "robot:record:start";
			readonly label?: string;
	  }
	| {
			readonly type: "robot:record:stop";
	  };

export type VirtualRobotFaceFrame = {
	readonly width: number;
	readonly height: number;
	readonly sequence: number;
	readonly rgba: Uint8Array;
};

export type VirtualRobotSpeakerFrame = {
	readonly counter: number;
	readonly volumePercent: number;
	readonly pcm: Uint8Array;
};

export type VirtualRobotUiSnapshot = {
	readonly relayConnected: boolean;
	readonly simConnected: boolean;
	readonly state?: VirtualRobotStateMessage;
	readonly cameraViewMode: VirtualRobotCameraViewMode;
	readonly cameraPreviewDataUrl?: string;
	readonly micActive: boolean;
	readonly micSupported: boolean;
	readonly lastError?: string;
};

/**
 * Map MuJoCo world coordinates (+X forward, +Y left, +Z up) into Three.js
 * world coordinates (+Z forward, +X left, +Y up) — exact proper SO(3) rotation
 * matching ainekio-v2.glb's Blender-exported RobotRoot axes.
 */
export function mujocoPositionToThree(
	posMj: readonly [number, number, number],
	scale = 1,
): readonly [number, number, number] {
	return [posMj[1] * scale, posMj[2] * scale, posMj[0] * scale];
}

/**
 * Map MuJoCo world quaternion [w, x, y, z] into Three.js quaternion [x, y, z, w].
 */
export function mujocoQuaternionToThreeXyzw(
	quatWxyz: readonly [number, number, number, number],
): readonly [number, number, number, number] {
	return [quatWxyz[2], quatWxyz[3], quatWxyz[1], quatWxyz[0]];
}

export function cameraResolutionDimensions(
	res: VirtualRobotCameraResolution | string,
): { readonly width: number; readonly height: number; readonly code: number } {
	switch (res) {
		case "VGA":
			return { width: 640, height: 480, code: 1 };
		case "XGA":
			return { width: 1024, height: 768, code: 2 };
		case "960P":
			return { width: 1280, height: 960, code: 3 };
		case "FHD":
			return { width: 1280, height: 720, code: 4 };
		case "AUTO":
			return { width: 640, height: 480, code: 5 };
		default:
			return { width: 320, height: 240, code: 0 };
	}
}

export function decodeBridgeFaceRgba(
	buffer: ArrayBuffer,
): VirtualRobotFaceFrame | undefined {
	if (buffer.byteLength < 10) {
		return undefined;
	}
	const view = new DataView(buffer);
	if (view.getUint8(0) !== BRIDGE_BIN_FACE_RGBA) {
		return undefined;
	}
	const width = view.getUint16(1, true);
	const height = view.getUint16(3, true);
	const sequence = view.getUint32(5, true);
	const expectedLength = 10 + width * height * 4;
	if (buffer.byteLength !== expectedLength) {
		return undefined;
	}
	return {
		width,
		height,
		sequence,
		rgba: new Uint8Array(buffer, 10, width * height * 4),
	};
}

export function decodeBridgeSpeakerPcm(
	buffer: ArrayBuffer,
): VirtualRobotSpeakerFrame | undefined {
	if (buffer.byteLength !== 6 + VIRTUAL_ROBOT_AUDIO_FRAME_BYTES) {
		return undefined;
	}
	const view = new DataView(buffer);
	if (view.getUint8(0) !== BRIDGE_BIN_SPEAKER_PCM) {
		return undefined;
	}
	return {
		counter: view.getUint32(1, true),
		volumePercent: view.getUint8(5),
		pcm: new Uint8Array(buffer, 6, VIRTUAL_ROBOT_AUDIO_FRAME_BYTES),
	};
}

export function encodeBridgeCameraJpeg(options: {
	readonly originCode: number;
	readonly resCode: number;
	readonly originId: number;
	readonly jpeg: Uint8Array;
}): Uint8Array {
	const out = new Uint8Array(10 + options.jpeg.byteLength);
	const view = new DataView(out.buffer);
	view.setUint8(0, BRIDGE_BIN_CAMERA_JPEG);
	view.setUint8(1, options.originCode & 0xff);
	view.setUint16(2, options.resCode & 0xffff, true);
	view.setUint16(4, 0, true);
	view.setUint32(6, options.originId >>> 0, true);
	out.set(options.jpeg, 10);
	return out;
}

export function encodeBridgeMicPcm(options: {
	readonly counter: number;
	readonly flags: number;
	readonly pcm: Uint8Array;
}): Uint8Array {
	const out = new Uint8Array(6 + VIRTUAL_ROBOT_AUDIO_FRAME_BYTES);
	const view = new DataView(out.buffer);
	view.setUint8(0, BRIDGE_BIN_MIC_PCM);
	view.setUint32(1, options.counter >>> 0, true);
	view.setUint8(5, options.flags & 0xff);
	out.set(options.pcm.subarray(0, VIRTUAL_ROBOT_AUDIO_FRAME_BYTES), 6);
	return out;
}

export function isVirtualRobotInboundMessage(
	value: unknown,
): value is VirtualRobotInboundMessage {
	if (!value || typeof value !== "object") {
		return false;
	}
	const type = (value as { type?: unknown }).type;
	return (
		type === "robot:state" ||
		type === "robot:camera-request" ||
		type === "robot:audio-stop" ||
		type === "robot:arena-meta"
	);
}
