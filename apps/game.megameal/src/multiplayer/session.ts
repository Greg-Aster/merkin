import type { NetworkPeerId } from "../engine/modules/networking/index.js";
import {
	type MultiplayerChatMessage,
	type MultiplayerConnectionStatus,
	type MultiplayerLogEntry,
	type MultiplayerMode,
	type MultiplayerPlayerPose,
	type MultiplayerRemotePlayer,
	type MultiplayerSnapshot,
	type MultiplayerWireMessage,
	isMultiplayerWireMessage,
	normalizeRoomName,
} from "./messages.js";

export type MultiplayerTransportPort = {
	readonly peerId: NetworkPeerId;
	readonly role: Exclude<MultiplayerMode, "idle">;
	send(message: MultiplayerWireMessage): void | Promise<void>;
	broadcast(message: MultiplayerWireMessage): void | Promise<void>;
	onMessage(
		handler: (message: unknown, peerId?: NetworkPeerId) => void,
	): () => void;
	onPeerListChanged(
		handler: (peerIds: readonly NetworkPeerId[]) => void,
	): () => void;
	connectedPeers(): readonly NetworkPeerId[];
	dispose(): void;
};

export type RoomDirectoryPort = {
	register(roomName: string, hostId: NetworkPeerId): Promise<void>;
	lookup(roomName: string): Promise<NetworkPeerId>;
};

export type MultiplayerSession = {
	snapshot(): MultiplayerSnapshot;
	subscribe(listener: (snapshot: MultiplayerSnapshot) => void): () => void;
	attachTransport(options: {
		readonly transport: MultiplayerTransportPort;
		readonly roomName?: string;
	}): void;
	markConnecting(
		mode: Exclude<MultiplayerMode, "idle">,
		roomName?: string,
	): void;
	setError(message: string): void;
	disconnect(message?: string): void;
	publishLocalPose(pose: MultiplayerPlayerPose): void;
	sendChat(text: string): void;
};

export function createMultiplayerSession(
	options: {
		readonly enabled?: boolean;
		readonly now?: () => number;
		readonly timestamp?: () => string;
	} = {},
): MultiplayerSession {
	const enabled = options.enabled ?? true;
	const now = options.now ?? (() => Date.now());
	const timestamp = options.timestamp ?? (() => new Date().toISOString());
	const listeners = new Set<(snapshot: MultiplayerSnapshot) => void>();
	let transport: MultiplayerTransportPort | undefined;
	let removeMessageListener: (() => void) | undefined;
	let removePeerListListener: (() => void) | undefined;
	let state: MutableMultiplayerState = {
		enabled,
		mode: "idle",
		status: enabled ? "idle" : "disabled",
		localPeerId: undefined,
		roomName: undefined,
		connectedPeers: [],
		remotePlayers: new Map(),
		chatMessages: [],
		logs: [],
		error: undefined,
	};

	const session: MultiplayerSession = {
		snapshot,
		subscribe(listener) {
			listeners.add(listener);
			listener(snapshot());

			return () => {
				listeners.delete(listener);
			};
		},
		attachTransport(options) {
			if (!state.enabled) {
				options.transport.dispose();
				return;
			}

			cleanupTransport();
			transport = options.transport;
			state = {
				...state,
				mode: transport.role,
				status: "connected",
				localPeerId: transport.peerId,
				roomName: options.roomName
					? normalizeRoomName(options.roomName)
					: state.roomName,
				connectedPeers: transport.connectedPeers(),
				error: undefined,
			};
			addLog(
				transport.role === "host"
					? `Host peer ready: ${transport.peerId}`
					: `Connected as peer: ${transport.peerId}`,
				"success",
			);
			removeMessageListener = transport.onMessage(handleTransportMessage);
			removePeerListListener = transport.onPeerListChanged((peerIds) => {
				state = {
					...state,
					connectedPeers: [...peerIds],
					remotePlayers: pruneRemotePlayers(state.remotePlayers, peerIds),
				};
				notify();
			});
			notify();
		},
		markConnecting(mode, roomName) {
			if (!state.enabled) return;
			state = {
				...state,
				mode,
				status: "connecting",
				roomName: roomName ? normalizeRoomName(roomName) : state.roomName,
				error: undefined,
			};
			addLog(
				mode === "host"
					? "Initializing multiplayer host..."
					: `Joining room "${state.roomName ?? ""}"...`,
			);
			notify();
		},
		setError(message) {
			state = {
				...state,
				status: "error",
				error: message,
			};
			addLog(message, "error");
			notify();
		},
		disconnect(message = "Disconnected from multiplayer.") {
			cleanupTransport();
			state = {
				...state,
				mode: "idle",
				status: state.enabled ? "disconnected" : "disabled",
				localPeerId: undefined,
				connectedPeers: [],
				remotePlayers: new Map(),
			};
			addLog(message, "warn");
			notify();
		},
		publishLocalPose(pose) {
			if (!transport || state.status !== "connected" || !state.localPeerId) {
				return;
			}

			void transport.send({
				type: "multiplayer:player-pose",
				peerId: state.localPeerId,
				pose,
			});
		},
		sendChat(text) {
			const trimmedText = text.trim();

			if (
				!transport ||
				state.status !== "connected" ||
				!state.localPeerId ||
				trimmedText.length === 0
			) {
				return;
			}

			const message: MultiplayerChatMessage = {
				id: `${state.localPeerId}:${timestamp()}:${state.chatMessages.length}`,
				senderId: state.localPeerId,
				text: trimmedText.slice(0, 200),
				timestamp: timestamp(),
			};
			state = {
				...state,
				chatMessages: [...state.chatMessages, message].slice(-100),
			};

			const wireMessage = {
				type: "multiplayer:chat",
				message,
			} satisfies MultiplayerWireMessage;

			if (transport.role === "host") {
				void transport.broadcast(wireMessage);
			} else {
				void transport.send(wireMessage);
			}

			notify();
		},
	};

	function handleTransportMessage(
		message: unknown,
		sourcePeerId?: NetworkPeerId,
	): void {
		if (!isMultiplayerWireMessage(message)) {
			return;
		}

		if (transport?.role === "host") {
			handleHostMessage(message, sourcePeerId);
		} else {
			handleClientMessage(message);
		}
	}

	function handleHostMessage(
		message: MultiplayerWireMessage,
		sourcePeerId?: NetworkPeerId,
	): void {
		if (!transport) return;

		if (message.type === "multiplayer:player-pose") {
			const peerId = sourcePeerId ?? message.peerId;
			state.remotePlayers.set(peerId, {
				peerId,
				pose: message.pose,
				updatedAt: now(),
			});
			void transport.broadcast({
				type: "multiplayer:full-state",
				players: [...state.remotePlayers.values()],
			});
			notify();
			return;
		}

		if (message.type === "multiplayer:chat") {
			state = {
				...state,
				chatMessages: [...state.chatMessages, message.message].slice(-100),
			};
			void transport.broadcast(message);
			notify();
		}
	}

	function handleClientMessage(message: MultiplayerWireMessage): void {
		if (message.type === "multiplayer:full-state") {
			const localPeerId = state.localPeerId;
			const remotePlayers = new Map<NetworkPeerId, MultiplayerRemotePlayer>();

			for (const player of message.players) {
				if (player.peerId !== localPeerId) {
					remotePlayers.set(player.peerId, player);
				}
			}

			state = {
				...state,
				remotePlayers,
			};
			notify();
			return;
		}

		if (message.type === "multiplayer:chat") {
			if (
				!state.chatMessages.some(
					(chatMessage) => chatMessage.id === message.message.id,
				)
			) {
				state = {
					...state,
					chatMessages: [...state.chatMessages, message.message].slice(-100),
				};
				notify();
			}
		}
	}

	function snapshot(): MultiplayerSnapshot {
		const base = {
			enabled: state.enabled,
			mode: state.mode,
			status: state.status,
			connectedPeers: [...state.connectedPeers],
			remotePlayers: [...state.remotePlayers.values()],
			chatMessages: [...state.chatMessages],
			logs: [...state.logs],
		};

		return {
			...base,
			...(state.localPeerId ? { localPeerId: state.localPeerId } : {}),
			...(state.roomName ? { roomName: state.roomName } : {}),
			...(state.error ? { error: state.error } : {}),
		};
	}

	function addLog(
		message: string,
		type: MultiplayerLogEntry["type"] = "info",
	): void {
		state = {
			...state,
			logs: [
				...state.logs,
				{
					message,
					type,
					timestamp: timestamp(),
				},
			].slice(-100),
		};
	}

	function notify(): void {
		const nextSnapshot = snapshot();

		for (const listener of listeners) {
			listener(nextSnapshot);
		}
	}

	function cleanupTransport(): void {
		removeMessageListener?.();
		removePeerListListener?.();
		removeMessageListener = undefined;
		removePeerListListener = undefined;
		transport?.dispose();
		transport = undefined;
	}

	return session;
}

type MutableMultiplayerState = {
	readonly enabled: boolean;
	readonly mode: MultiplayerMode;
	readonly status: MultiplayerConnectionStatus;
	readonly localPeerId: NetworkPeerId | undefined;
	readonly roomName: string | undefined;
	readonly connectedPeers: readonly NetworkPeerId[];
	readonly remotePlayers: Map<NetworkPeerId, MultiplayerRemotePlayer>;
	readonly chatMessages: readonly MultiplayerChatMessage[];
	readonly logs: readonly MultiplayerLogEntry[];
	readonly error: string | undefined;
};

function pruneRemotePlayers(
	players: Map<NetworkPeerId, MultiplayerRemotePlayer>,
	connectedPeers: readonly NetworkPeerId[],
): Map<NetworkPeerId, MultiplayerRemotePlayer> {
	const connectedPeerSet = new Set(connectedPeers);
	const nextPlayers = new Map<NetworkPeerId, MultiplayerRemotePlayer>();

	for (const [peerId, player] of players) {
		if (connectedPeerSet.has(peerId)) {
			nextPlayers.set(peerId, player);
		}
	}

	return nextPlayers;
}
