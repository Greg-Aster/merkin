import {
	type MultiplayerChatMessage,
	type MultiplayerConnectionStatus,
	type MultiplayerLogEntry,
	type MultiplayerMode,
	type MultiplayerPlayerPose,
	type MultiplayerRemotePlayer,
	type MultiplayerSnapshot,
	type MultiplayerWireMessage,
	type NetworkPeerId,
	isMultiplayerWireMessage,
	normalizeRoomName,
	sanitizeDisplayName,
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
	setDisplayName(name: string): void;
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
		readonly displayName?: string;
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
	let hostLocalPlayer: MultiplayerRemotePlayer | undefined;
	let state: MutableMultiplayerState = {
		enabled,
		mode: "idle",
		status: enabled ? "idle" : "disabled",
		localPeerId: undefined,
		displayName: sanitizeDisplayName(options.displayName ?? ""),
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
		setDisplayName(name) {
			const next = sanitizeDisplayName(name);
			if (next === state.displayName) {
				return;
			}
			state = {
				...state,
				displayName: next,
			};
			notify();
		},
		attachTransport(attachOptions) {
			if (!state.enabled) {
				attachOptions.transport.dispose();
				return;
			}

			cleanupTransport();
			transport = attachOptions.transport;
			hostLocalPlayer = undefined;
			state = {
				...state,
				mode: transport.role,
				status: "connected",
				localPeerId: transport.peerId,
				roomName: attachOptions.roomName
					? normalizeRoomName(attachOptions.roomName)
					: state.roomName,
				connectedPeers: transport.connectedPeers(),
				remotePlayers: new Map(),
				error: undefined,
			};
			addLog(
				transport.role === "host"
					? `Room "${state.roomName ?? ""}" live (host ${transport.peerId})`
					: `Joined room "${state.roomName ?? ""}"`,
				"success",
			);
			removeMessageListener = transport.onMessage(handleTransportMessage);
			removePeerListListener = transport.onPeerListChanged((peerIds) => {
				const activeTransport = transport;
				if (!activeTransport) {
					return;
				}
				// On client, an empty peer list means the host closed or dropped the link.
				if (
					activeTransport.role === "client" &&
					peerIds.length === 0 &&
					state.status === "connected"
				) {
					cleanupTransport();
					state = {
						...state,
						mode: "idle",
						status: "disconnected",
						localPeerId: undefined,
						connectedPeers: [],
						remotePlayers: new Map(),
						error: "Host closed the room or connection was lost.",
					};
					addLog("Connection to room host closed.", "warn");
					notify();
					return;
				}

				const pruned = pruneRemotePlayers(state.remotePlayers, peerIds);
				state = {
					...state,
					connectedPeers: [...peerIds],
					remotePlayers: pruned,
				};
				if (activeTransport.role === "host" && peerIds.length > 0) {
					broadcastFullStateFromHost();
				}
				notify();
			});
			notify();
		},
		markConnecting(mode, roomName) {
			if (!state.enabled) {
				return;
			}
			state = {
				...state,
				mode,
				status: "connecting",
				roomName: roomName ? normalizeRoomName(roomName) : state.roomName,
				error: undefined,
			};
			addLog(
				mode === "host"
					? `Creating room "${state.roomName ?? ""}"...`
					: `Joining room "${state.roomName ?? ""}"...`,
			);
			notify();
		},
		setError(message) {
			cleanupTransport();
			state = {
				...state,
				mode: "idle",
				status: "error",
				localPeerId: undefined,
				connectedPeers: [],
				remotePlayers: new Map(),
				error: message,
			};
			addLog(message, "error");
			notify();
		},
		disconnect(message = "Left multiplayer room.") {
			cleanupTransport();
			hostLocalPlayer = undefined;
			state = {
				...state,
				mode: "idle",
				status: state.enabled ? "disconnected" : "disabled",
				localPeerId: undefined,
				connectedPeers: [],
				remotePlayers: new Map(),
				error: undefined,
			};
			addLog(message, "warn");
			notify();
		},
		publishLocalPose(pose) {
			if (!transport || state.status !== "connected" || !state.localPeerId) {
				return;
			}

			const enrichedPose: MultiplayerPlayerPose = state.displayName
				? {
						...pose,
						displayName: pose.displayName ?? state.displayName,
					}
				: pose;

			if (transport.role === "host") {
				hostLocalPlayer = {
					peerId: state.localPeerId,
					pose: enrichedPose,
					updatedAt: now(),
				};
				if (state.connectedPeers.length > 0) {
					broadcastFullStateFromHost();
				}
				return;
			}

			void transport.send({
				type: "multiplayer:player-pose",
				peerId: state.localPeerId,
				pose: enrichedPose,
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
				...(state.displayName ? { senderName: state.displayName } : {}),
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

	function broadcastFullStateFromHost(): void {
		if (!transport || transport.role !== "host") {
			return;
		}
		const players: MultiplayerRemotePlayer[] = [
			...(hostLocalPlayer ? [hostLocalPlayer] : []),
			...state.remotePlayers.values(),
		];
		void transport.broadcast({
			type: "multiplayer:full-state",
			players,
		});
	}

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
		if (!transport) {
			return;
		}

		if (message.type === "multiplayer:player-pose") {
			const peerId = sourcePeerId ?? message.peerId;
			state.remotePlayers.set(peerId, {
				peerId,
				pose: message.pose,
				updatedAt: now(),
			});
			broadcastFullStateFromHost();
			notify();
			return;
		}

		if (message.type === "multiplayer:chat") {
			if (
				!state.chatMessages.some(
					(existing) => existing.id === message.message.id,
				)
			) {
				state = {
					...state,
					chatMessages: [...state.chatMessages, message.message].slice(-100),
				};
				void transport.broadcast(message);
				notify();
			}
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
			displayName: state.displayName,
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
	readonly displayName: string;
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
