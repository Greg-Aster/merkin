import type { RuntimeSnapshot } from "../engine/client-api/index.js";
import type { PerformanceDiagnosticsState } from "../game/performance/index.js";

const CHANNEL_NAME = "megameal:game-dev-bridge:v1";
const SNAPSHOT_STORAGE_KEY = "megameal.gameDevBridge.latestSnapshot.v1";
const HEARTBEAT_INTERVAL_MS = 1000;

export type GameDevBridgeRuntimeScene = {
	readonly id: string;
	readonly levelId: string;
	readonly label: string;
	readonly sourceId: string;
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
	readonly availableRuntimeScenes: readonly GameDevBridgeRuntimeScene[];
	readonly gameState: Record<string, unknown>;
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
	publishSnapshot(): void;
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
	dispose(): void;
};

export function createGameDevBridgeGameEndpoint(options: {
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
	readonly onLog?: (entry: GameDevBridgeLogEntry) => void;
}): GameDevBridgeGameEndpoint {
	const sessionId = createSessionId();

	if (!import.meta.env.DEV) {
		return {
			sessionId,
			publishSnapshot() {},
			dispose() {},
		};
	}

	const channel = createBroadcastChannel();
	let disposed = false;

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

	const publishSnapshot = (): void => {
		if (disposed) {
			return;
		}

		const snapshot = toPlainSnapshot(options.snapshot(sessionId));
		writeCachedSnapshot(snapshot);
		channel?.postMessage({
			type: "game:snapshot",
			snapshot,
		} satisfies GameDevBridgeMessage);
	};

	const onMessage = (event: MessageEvent<GameDevBridgeMessage>) => {
		const message = event.data;

		if (message.type !== "editor:command") {
			return;
		}

		const { command } = message;

		if (command.targetSessionId && command.targetSessionId !== sessionId) {
			return;
		}

		const result =
			command.type === "loadRuntimeScene"
				? {
						...options.loadRuntimeScene(command.runtimeSceneId),
						runtimeSceneId: command.runtimeSceneId,
					}
				: options.setCollisionOverlay?.(command.enabled) ?? {
						accepted: false,
						enabled: !command.enabled,
						message: "Collision overlay diagnostics are not available.",
					};
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
			...("diagnostics" in result && result.diagnostics
				? { diagnostics: result.diagnostics }
				: {}),
		};

		channel?.postMessage({
			type: "game:command-result",
			result: response,
		} satisfies GameDevBridgeMessage);
		publishLog(result.accepted ? "info" : "warn", result.message);
		publishSnapshot();
	};

	channel?.addEventListener("message", onMessage);
	const heartbeat = window.setInterval(publishSnapshot, HEARTBEAT_INTERVAL_MS);
	publishLog("info", `Game dev bridge session ${sessionId} connected.`);
	publishSnapshot();

	return {
		sessionId,
		publishSnapshot,
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			window.clearInterval(heartbeat);
			channel?.removeEventListener("message", onMessage);
			channel?.close();
		},
	};
}

export function createGameDevBridgeEditorEndpoint(options: {
	readonly onSnapshot: (snapshot: GameDevBridgeSnapshot) => void;
	readonly onCommandResult?: (result: GameDevBridgeCommandResult) => void;
	readonly onLog?: (entry: GameDevBridgeLogEntry) => void;
}): GameDevBridgeEditorEndpoint {
	const channel = import.meta.env.DEV ? createBroadcastChannel() : undefined;

	const cachedSnapshot = readCachedSnapshot();

	if (cachedSnapshot) {
		options.onSnapshot(cachedSnapshot);
	}

	const onMessage = (event: MessageEvent<GameDevBridgeMessage>) => {
		const message = event.data;

		if (message.type === "game:snapshot") {
			writeCachedSnapshot(message.snapshot);
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
		dispose() {
			channel?.removeEventListener("message", onMessage);
			channel?.close();
		},
	};
}

function createBroadcastChannel(): BroadcastChannel | undefined {
	if (typeof BroadcastChannel === "undefined") {
		return undefined;
	}

	return new BroadcastChannel(CHANNEL_NAME);
}

function writeCachedSnapshot(snapshot: GameDevBridgeSnapshot): void {
	try {
		localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
	} catch {
		// The live channel still works if storage is blocked.
	}
}

function readCachedSnapshot(): GameDevBridgeSnapshot | undefined {
	try {
		const rawSnapshot = localStorage.getItem(SNAPSHOT_STORAGE_KEY);

		if (!rawSnapshot) {
			return undefined;
		}

		const snapshot = JSON.parse(rawSnapshot) as GameDevBridgeSnapshot;

		return typeof snapshot.sessionId === "string" ? snapshot : undefined;
	} catch {
		return undefined;
	}
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
