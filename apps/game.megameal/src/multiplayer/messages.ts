import type { NetworkPeerId } from "../engine/modules/networking/index.js";

export type MultiplayerMode = "idle" | "host" | "client";

export type MultiplayerConnectionStatus =
	| "disabled"
	| "idle"
	| "connecting"
	| "connected"
	| "disconnected"
	| "error";

export type MultiplayerPlayerPose = {
	readonly position: readonly [number, number, number];
	readonly rotation?: readonly [number, number, number, number];
	readonly tick: number;
};

export type MultiplayerRemotePlayer = {
	readonly peerId: NetworkPeerId;
	readonly pose: MultiplayerPlayerPose;
	readonly updatedAt: number;
};

export type MultiplayerChatMessage = {
	readonly id: string;
	readonly senderId: NetworkPeerId;
	readonly text: string;
	readonly timestamp: string;
};

export type MultiplayerLogEntry = {
	readonly message: string;
	readonly type: "info" | "success" | "error" | "warn";
	readonly timestamp: string;
};

export type MultiplayerWireMessage =
	| {
			readonly type: "multiplayer:player-pose";
			readonly peerId: NetworkPeerId;
			readonly pose: MultiplayerPlayerPose;
	  }
	| {
			readonly type: "multiplayer:full-state";
			readonly players: readonly MultiplayerRemotePlayer[];
	  }
	| {
			readonly type: "multiplayer:chat";
			readonly message: MultiplayerChatMessage;
	  };

export type MultiplayerSnapshot = {
	readonly enabled: boolean;
	readonly mode: MultiplayerMode;
	readonly status: MultiplayerConnectionStatus;
	readonly localPeerId?: NetworkPeerId;
	readonly roomName?: string;
	readonly connectedPeers: readonly NetworkPeerId[];
	readonly remotePlayers: readonly MultiplayerRemotePlayer[];
	readonly chatMessages: readonly MultiplayerChatMessage[];
	readonly logs: readonly MultiplayerLogEntry[];
	readonly error?: string;
};

export function isMultiplayerWireMessage(
	value: unknown,
): value is MultiplayerWireMessage {
	if (!isRecord(value) || typeof value.type !== "string") {
		return false;
	}

	return (
		value.type === "multiplayer:player-pose" ||
		value.type === "multiplayer:full-state" ||
		value.type === "multiplayer:chat"
	);
}

export function normalizeRoomName(roomName: string): string {
	return roomName
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
