import type { RuntimeSnapshot } from "../engine/client-api/index.js";
import type { PerformanceDiagnosticsState } from "../game/performance/index.js";
import type { MultiplayerSnapshot } from "../multiplayer/index.js";

export const DEFAULT_GAME_DEV_BRIDGE_BROADCAST_LOCATION =
	"megameal:game-dev-bridge:v1";
const SNAPSHOT_STORAGE_KEY_PREFIX =
	"megameal.gameDevBridge.latestSnapshot.v1";

export type GameDevBridgeChannels = {
	readonly text: boolean;
	readonly location: boolean;
	readonly state: boolean;
	readonly snapshots: boolean;
	readonly levelMap: boolean;
};

export type GameDevBridgeSettings = {
	readonly enabled: boolean;
	readonly broadcastLocation: string;
	readonly channels: GameDevBridgeChannels;
};

export type GameDevBridgeSnapshotReason =
	| "startup"
	| "scene"
	| "multiplayer"
	| "location"
	| "state"
	| "visual"
	| "map"
	| "commandResult"
	| "manual";

export const defaultGameDevBridgeSettings: GameDevBridgeSettings = {
	enabled: false,
	broadcastLocation: DEFAULT_GAME_DEV_BRIDGE_BROADCAST_LOCATION,
	channels: {
		text: true,
		location: true,
		state: true,
		snapshots: false,
		levelMap: false,
	},
};

export type GameDevBridgeCollisionOverlayDiagnostics = {
	readonly enabled: boolean;
	readonly shapeCount: number;
	readonly syncedShapeCount: number;
	readonly unsyncedShapeCount: number;
};

export type GameDevBridgeDiagnostics = {
	readonly collisionOverlay: GameDevBridgeCollisionOverlayDiagnostics;
	readonly performance: PerformanceDiagnosticsState;
};

export type GameDevBridgeSnapshot = {
	readonly sessionId: string;
	readonly timestamp: number;
	readonly runtime: RuntimeSnapshot;
	readonly activeRuntimeSceneId?: string;
	readonly loadingRuntimeSceneId?: string;
	readonly gameState: Record<string, unknown>;
	readonly multiplayer?: MultiplayerSnapshot;
	readonly diagnostics?: GameDevBridgeDiagnostics;
};

type GameDevBridgeCommandBase = {
	readonly id: string;
	readonly issuedAt: number;
	readonly targetSessionId?: string;
};

export type GameDevBridgeCommand =
	| (GameDevBridgeCommandBase & {
			readonly type: "loadRuntimeScene";
			readonly runtimeSceneId: string;
	  })
	| (GameDevBridgeCommandBase & {
			readonly type: "setCollisionOverlay";
			readonly enabled: boolean;
	  })
	| (GameDevBridgeCommandBase & {
			readonly type: "sendChat";
			readonly text: string;
	  })
	| (GameDevBridgeCommandBase & {
			readonly type: "setTouchActionValue";
			readonly touchId: string;
			readonly value: number;
			readonly durationMs?: number;
	  })
	| (GameDevBridgeCommandBase & {
			readonly type: "clearTouchControls";
	  });

export type GameDevBridgeCommandResult = {
	readonly commandId: string;
	readonly sessionId: string;
	readonly timestamp: number;
	readonly commandType: GameDevBridgeCommand["type"];
	readonly accepted: boolean;
	readonly message: string;
	readonly runtimeSceneId?: string;
	readonly enabled?: boolean;
	readonly text?: string;
	readonly touchId?: string;
	readonly value?: number;
	readonly diagnostics?: GameDevBridgeDiagnostics;
};

export type GameDevBridgeLogEntry = {
	readonly id: string;
	readonly timestamp: number;
	readonly level: "info" | "warn" | "error";
	readonly message: string;
};

type GameDevBridgeMessage =
	| {
			readonly type: "game:snapshot";
			readonly snapshot: GameDevBridgeSnapshot;
	  }
	| {
			readonly type: "editor:command";
			readonly command: GameDevBridgeCommand;
	  }
	| {
			readonly type: "game:command-result";
			readonly result: GameDevBridgeCommandResult;
	  }
	| {
			readonly type: "game:log";
			readonly entry: GameDevBridgeLogEntry;
	  };

export type GameDevBridgeGameEndpoint = {
	readonly sessionId: string;
	publishSnapshot(reason?: GameDevBridgeSnapshotReason): void;
	dispose(): void;
};

export type GameDevBridgeEditorEndpoint = {
	sendLoadRuntimeScene(
		runtimeSceneId: string,
		targetSessionId?: string,
	): GameDevBridgeCommand;
	sendSetCollisionOverlay(
		enabled: boolean,
		targetSessionId?: string,
	): GameDevBridgeCommand;
	sendChat(text: string, targetSessionId?: string): GameDevBridgeCommand;
	sendSetTouchActionValue(options: {
		readonly touchId: string;
		readonly value: number;
		readonly durationMs?: number;
		readonly targetSessionId?: string;
	}): GameDevBridgeCommand;
	sendClearTouchControls(targetSessionId?: string): GameDevBridgeCommand;
	dispose(): void;
};

export function createGameDevBridgeGameEndpoint(options: {
	readonly settings?: Partial<GameDevBridgeSettings>;
	readonly snapshot: (sessionId: string) => GameDevBridgeSnapshot;
	readonly loadRuntimeScene: (runtimeSceneId: string) => {
		readonly accepted: boolean;
		readonly message: string;
	};
	readonly setCollisionOverlay?: (enabled: boolean) => {
		readonly accepted: boolean;
		readonly enabled: boolean;
		readonly message: string;
		readonly diagnostics?: GameDevBridgeDiagnostics;
	};
	readonly sendChat?: (text: string) => {
		readonly accepted: boolean;
		readonly message: string;
	};
	readonly setTouchActionValue?: (touchId: string, value: number) => {
		readonly accepted: boolean;
		readonly message: string;
	};
	readonly clearTouchControls?: () => {
		readonly accepted: boolean;
		readonly message: string;
	};
	readonly onLog?: (entry: GameDevBridgeLogEntry) => void;
}): GameDevBridgeGameEndpoint {
	const sessionId = createSessionId();
	const settings = normalizeGameDevBridgeSettings(options.settings);

	if (!import.meta.env.DEV || !settings.enabled) {
		return {
			sessionId,
			publishSnapshot() {},
			dispose() {},
		};
	}

	const channel = createBroadcastChannel(settings.broadcastLocation);
	let disposed = false;
	let lastMultiplayerSignal = "";
	const touchClearTimers = new Map<string, number>();

	const publishLog = (
		level: GameDevBridgeLogEntry["level"],
		message: string,
	): void => {
		const entry = {
			id: createSessionId(),
			timestamp: Date.now(),
			level,
			message,
		};
		options.onLog?.(entry);
		channel?.postMessage({
			type: "game:log",
			entry,
		} satisfies GameDevBridgeMessage);
	};

	const publishSnapshot = (
		reason: GameDevBridgeSnapshotReason = "manual",
	): void => {
		if (disposed) {
			return;
		}
		if (!shouldPublishSnapshot(reason, settings.channels)) {
			return;
		}

		const snapshot = toPlainSnapshot(options.snapshot(sessionId));
		if (reason === "multiplayer") {
			const nextSignal = multiplayerSignalForSnapshot(snapshot);
			if (nextSignal === lastMultiplayerSignal) {
				return;
			}
			lastMultiplayerSignal = nextSignal;
		}

		writeCachedSnapshot(snapshot, settings.broadcastLocation);
		channel?.postMessage({
			type: "game:snapshot",
			snapshot,
		} satisfies GameDevBridgeMessage);
	};

	const executeCommand = (
		command: GameDevBridgeCommand,
	): Omit<GameDevBridgeCommandResult, "commandId" | "sessionId" | "timestamp" | "commandType"> => {
		if (command.type === "loadRuntimeScene") {
			return {
				...options.loadRuntimeScene(command.runtimeSceneId),
				runtimeSceneId: command.runtimeSceneId,
			};
		}

		if (command.type === "setCollisionOverlay") {
			return (
				options.setCollisionOverlay?.(command.enabled) ?? {
					accepted: false,
					enabled: !command.enabled,
					message: "Collision overlay diagnostics are not available.",
				}
			);
		}

		if (command.type === "sendChat") {
			return (
				options.sendChat?.(command.text) ?? {
					accepted: false,
					text: command.text,
					message: "Chat control is not available.",
				}
			);
		}

		if (command.type === "setTouchActionValue") {
			if (!options.setTouchActionValue) {
				return {
					accepted: false,
					touchId: command.touchId,
					value: command.value,
					message: "Touch control is not available.",
				};
			}

			const result = options.setTouchActionValue(command.touchId, command.value);
			if (result.accepted && command.durationMs !== undefined) {
				const existingTimer = touchClearTimers.get(command.touchId);
				if (existingTimer !== undefined) {
					window.clearTimeout(existingTimer);
				}

				const durationMs = Math.max(0, Math.min(5000, command.durationMs));
				const timer = window.setTimeout(() => {
					options.setTouchActionValue?.(command.touchId, 0);
					touchClearTimers.delete(command.touchId);
				}, durationMs);
				touchClearTimers.set(command.touchId, timer);
			}

			return {
				...result,
				touchId: command.touchId,
				value: command.value,
			};
		}

		return (
			options.clearTouchControls?.() ?? {
				accepted: false,
				message: "Touch control clearing is not available.",
			}
		);
	};

	const executeAndPublishCommandResult = (command: GameDevBridgeCommand): void => {
		if (command.targetSessionId && command.targetSessionId !== sessionId) {
			return;
		}

		const result = executeCommand(command);
		const response: GameDevBridgeCommandResult = {
			commandId: command.id,
			sessionId,
			timestamp: Date.now(),
			commandType: command.type,
			accepted: result.accepted,
			message: result.message,
			...(command.type === "loadRuntimeScene"
				? { runtimeSceneId: command.runtimeSceneId }
				: {}),
			...(command.type === "setCollisionOverlay"
				? { enabled: command.enabled }
				: {}),
			...(command.type === "sendChat" ? { text: command.text } : {}),
			...(command.type === "setTouchActionValue"
				? { touchId: command.touchId, value: command.value }
				: {}),
			...("diagnostics" in result && result.diagnostics
				? { diagnostics: result.diagnostics }
				: {}),
		};

		channel?.postMessage({
			type: "game:command-result",
			result: response,
		} satisfies GameDevBridgeMessage);
		publishLog(result.accepted ? "info" : "warn", result.message);
		publishSnapshot("commandResult");
	};

	const onMessage = (event: MessageEvent<GameDevBridgeMessage>) => {
		const message = event.data;

		if (message.type !== "editor:command") {
			return;
		}

		executeAndPublishCommandResult(message.command);
	};

	channel?.addEventListener("message", onMessage);
	publishLog("info", `Game dev bridge session ${sessionId} connected.`);
	publishSnapshot("startup");

	return {
		sessionId,
		publishSnapshot,
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			for (const timer of touchClearTimers.values()) {
				window.clearTimeout(timer);
			}
			touchClearTimers.clear();
			channel?.removeEventListener("message", onMessage);
			channel?.close();
		},
	};
}

export function createGameDevBridgeEditorEndpoint(options: {
	readonly settings?: Partial<GameDevBridgeSettings>;
	readonly onSnapshot: (snapshot: GameDevBridgeSnapshot) => void;
	readonly onCommandResult?: (result: GameDevBridgeCommandResult) => void;
	readonly onLog?: (entry: GameDevBridgeLogEntry) => void;
}): GameDevBridgeEditorEndpoint {
	const settings = normalizeGameDevBridgeSettings(options.settings);
	const channel =
		import.meta.env.DEV && settings.enabled
			? createBroadcastChannel(settings.broadcastLocation)
			: undefined;

	const cachedSnapshot = readCachedSnapshot(settings.broadcastLocation);

	if (cachedSnapshot) {
		options.onSnapshot(cachedSnapshot);
	}

	const onMessage = (event: MessageEvent<GameDevBridgeMessage>) => {
		const message = event.data;

		if (message.type === "game:snapshot") {
			writeCachedSnapshot(message.snapshot, settings.broadcastLocation);
			options.onSnapshot(message.snapshot);
			return;
		}

		if (message.type === "game:command-result") {
			options.onCommandResult?.(message.result);
			return;
		}

		if (message.type === "game:log") {
			options.onLog?.(message.entry);
		}
	};

	channel?.addEventListener("message", onMessage);

	return {
		sendLoadRuntimeScene(runtimeSceneId, targetSessionId) {
			const command: GameDevBridgeCommand = {
				id: createSessionId(),
				issuedAt: Date.now(),
				...(targetSessionId ? { targetSessionId } : {}),
				type: "loadRuntimeScene",
				runtimeSceneId,
			};

			channel?.postMessage({
				type: "editor:command",
				command,
			} satisfies GameDevBridgeMessage);

			return command;
		},
		sendSetCollisionOverlay(enabled, targetSessionId) {
			const command: GameDevBridgeCommand = {
				id: createSessionId(),
				issuedAt: Date.now(),
				...(targetSessionId ? { targetSessionId } : {}),
				type: "setCollisionOverlay",
				enabled,
			};

			channel?.postMessage({
				type: "editor:command",
				command,
			} satisfies GameDevBridgeMessage);

			return command;
		},
		sendChat(text, targetSessionId) {
			const command: GameDevBridgeCommand = {
				id: createSessionId(),
				issuedAt: Date.now(),
				...(targetSessionId ? { targetSessionId } : {}),
				type: "sendChat",
				text,
			};

			channel?.postMessage({
				type: "editor:command",
				command,
			} satisfies GameDevBridgeMessage);

			return command;
		},
		sendSetTouchActionValue(options) {
			const command: GameDevBridgeCommand = {
				id: createSessionId(),
				issuedAt: Date.now(),
				...(options.targetSessionId
					? { targetSessionId: options.targetSessionId }
					: {}),
				type: "setTouchActionValue",
				touchId: options.touchId,
				value: options.value,
				...(options.durationMs !== undefined
					? { durationMs: options.durationMs }
					: {}),
			};

			channel?.postMessage({
				type: "editor:command",
				command,
			} satisfies GameDevBridgeMessage);

			return command;
		},
		sendClearTouchControls(targetSessionId) {
			const command: GameDevBridgeCommand = {
				id: createSessionId(),
				issuedAt: Date.now(),
				...(targetSessionId ? { targetSessionId } : {}),
				type: "clearTouchControls",
			};

			channel?.postMessage({
				type: "editor:command",
				command,
			} satisfies GameDevBridgeMessage);

			return command;
		},
		dispose() {
			channel?.removeEventListener("message", onMessage);
			channel?.close();
		},
	};
}

export function normalizeGameDevBridgeSettings(
	value: Partial<GameDevBridgeSettings> | undefined,
): GameDevBridgeSettings {
	const channels = value?.channels ?? defaultGameDevBridgeSettings.channels;
	const broadcastLocation =
		typeof value?.broadcastLocation === "string" &&
		value.broadcastLocation.trim().length > 0
			? value.broadcastLocation.trim()
			: defaultGameDevBridgeSettings.broadcastLocation;

	return {
		enabled: value?.enabled ?? defaultGameDevBridgeSettings.enabled,
		broadcastLocation,
		channels: {
			text: channels.text ?? defaultGameDevBridgeSettings.channels.text,
			location:
				channels.location ?? defaultGameDevBridgeSettings.channels.location,
			state: channels.state ?? defaultGameDevBridgeSettings.channels.state,
			snapshots:
				channels.snapshots ?? defaultGameDevBridgeSettings.channels.snapshots,
			levelMap: channels.levelMap ?? defaultGameDevBridgeSettings.channels.levelMap,
		},
	};
}

function shouldPublishSnapshot(
	reason: GameDevBridgeSnapshotReason,
	channels: GameDevBridgeChannels,
): boolean {
	if (reason === "multiplayer") {
		return channels.text || channels.state;
	}
	if (reason === "location") {
		return channels.location;
	}
	if (reason === "state" || reason === "scene" || reason === "startup") {
		return channels.state;
	}
	if (reason === "visual") {
		return channels.snapshots;
	}
	if (reason === "map") {
		return channels.levelMap;
	}

	return true;
}

function multiplayerSignalForSnapshot(snapshot: GameDevBridgeSnapshot): string {
	const multiplayer = snapshot.multiplayer;
	if (!multiplayer) {
		return "none";
	}

	const lastChatMessage =
		multiplayer.chatMessages[multiplayer.chatMessages.length - 1];

	return JSON.stringify({
		status: multiplayer.status,
		roomName: multiplayer.roomName,
		mode: multiplayer.mode,
		localPeerId: multiplayer.localPeerId,
		connectedPeers: multiplayer.connectedPeers.length,
		remotePlayers: multiplayer.remotePlayers.length,
		lastChatMessageId: lastChatMessage?.id,
		lastChatMessageText: lastChatMessage?.text,
	});
}

function createBroadcastChannel(
	channelName: string,
): BroadcastChannel | undefined {
	if (typeof BroadcastChannel === "undefined") {
		return undefined;
	}

	return new BroadcastChannel(channelName);
}

function writeCachedSnapshot(
	snapshot: GameDevBridgeSnapshot,
	broadcastLocation: string,
): void {
	try {
		localStorage.setItem(
			snapshotStorageKey(broadcastLocation),
			JSON.stringify(snapshot),
		);
	} catch {
		// The live channel still works if storage is blocked.
	}
}

function readCachedSnapshot(
	broadcastLocation: string,
): GameDevBridgeSnapshot | undefined {
	try {
		const rawSnapshot = localStorage.getItem(
			snapshotStorageKey(broadcastLocation),
		);

		if (!rawSnapshot) {
			return undefined;
		}

		const snapshot = JSON.parse(rawSnapshot) as GameDevBridgeSnapshot;

		return typeof snapshot.sessionId === "string" ? snapshot : undefined;
	} catch {
		return undefined;
	}
}

function snapshotStorageKey(broadcastLocation: string): string {
	return `${SNAPSHOT_STORAGE_KEY_PREFIX}:${broadcastLocation}`;
}

function toPlainSnapshot(
	snapshot: GameDevBridgeSnapshot,
): GameDevBridgeSnapshot {
	return JSON.parse(JSON.stringify(snapshot)) as GameDevBridgeSnapshot;
}

function createSessionId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
