import Peer, { type DataConnection } from "peerjs";
import type { NetworkPeerId } from "./messages.js";
import type { MultiplayerTransportPort } from "./session.js";

type MessageListener = (message: unknown, peerId?: NetworkPeerId) => void;
type PeerListListener = (peerIds: readonly NetworkPeerId[]) => void;

const PEER_CONNECT_TIMEOUT_MS = 12000;

export async function createPeerHostTransport(): Promise<MultiplayerTransportPort> {
	const peer = new Peer();
	let peerId: NetworkPeerId;
	try {
		peerId = await waitForPeerOpen(peer, PEER_CONNECT_TIMEOUT_MS);
	} catch (err) {
		peer.destroy();
		throw err;
	}
	const connections = new Map<NetworkPeerId, DataConnection>();
	const messageListeners = new Set<MessageListener>();
	const peerListListeners = new Set<PeerListListener>();

	const notifyPeerList = () => {
		const peerIds = [...connections.keys()].sort();

		for (const listener of peerListListeners) {
			listener(peerIds);
		}
	};

	const setupConnection = (connection: DataConnection) => {
		connection.on("open", () => {
			connections.set(connection.peer, connection);
			notifyPeerList();
		});
		connection.on("data", (data: unknown) => {
			for (const listener of messageListeners) {
				listener(data, connection.peer);
			}
		});
		connection.on("close", () => {
			connections.delete(connection.peer);
			notifyPeerList();
		});
		connection.on("error", () => {
			connections.delete(connection.peer);
			notifyPeerList();
		});
	};

	peer.on("connection", setupConnection);

	return {
		peerId,
		role: "host",
		send() {},
		broadcast(message) {
			for (const connection of connections.values()) {
				if (connection.open) {
					connection.send(message);
				}
			}
		},
		onMessage(listener) {
			messageListeners.add(listener);

			return () => {
				messageListeners.delete(listener);
			};
		},
		onPeerListChanged(listener) {
			peerListListeners.add(listener);
			listener([...connections.keys()].sort());

			return () => {
				peerListListeners.delete(listener);
			};
		},
		connectedPeers() {
			return [...connections.keys()].sort();
		},
		dispose() {
			for (const connection of connections.values()) {
				connection.close();
			}
			connections.clear();
			peer.destroy();
			messageListeners.clear();
			peerListListeners.clear();
		},
	};
}

export async function createPeerClientTransport(
	hostPeerId: NetworkPeerId,
): Promise<MultiplayerTransportPort> {
	const peer = new Peer();
	let peerId: NetworkPeerId;
	try {
		peerId = await waitForPeerOpen(peer, PEER_CONNECT_TIMEOUT_MS);
	} catch (err) {
		peer.destroy();
		throw err;
	}
	const connection = peer.connect(hostPeerId, { reliable: true });
	try {
		await waitForConnectionOpen(connection, PEER_CONNECT_TIMEOUT_MS);
	} catch (err) {
		connection.close();
		peer.destroy();
		throw err;
	}
	const messageListeners = new Set<MessageListener>();
	const peerListListeners = new Set<PeerListListener>();
	let connected = true;

	const markClosed = () => {
		if (!connected) {
			return;
		}
		connected = false;
		for (const listener of peerListListeners) {
			listener([]);
		}
	};

	connection.on("data", (data: unknown) => {
		for (const listener of messageListeners) {
			listener(data, hostPeerId);
		}
	});
	connection.on("close", markClosed);
	connection.on("error", markClosed);

	return {
		peerId,
		role: "client",
		send(message) {
			if (connection.open) {
				connection.send(message);
			}
		},
		broadcast(message) {
			if (connection.open) {
				connection.send(message);
			}
		},
		onMessage(listener) {
			messageListeners.add(listener);

			return () => {
				messageListeners.delete(listener);
			};
		},
		onPeerListChanged(listener) {
			peerListListeners.add(listener);
			listener(connected ? [hostPeerId] : []);

			return () => {
				peerListListeners.delete(listener);
			};
		},
		connectedPeers() {
			return connected ? [hostPeerId] : [];
		},
		dispose() {
			connected = false;
			connection.close();
			peer.destroy();
			messageListeners.clear();
			peerListListeners.clear();
		},
	};
}

function waitForPeerOpen(
	peer: Peer,
	timeoutMs: number,
): Promise<NetworkPeerId> {
	return new Promise((resolve, reject) => {
		const timer = globalThis.setTimeout(() => {
			reject(new Error("Timed out connecting to PeerJS signaling server."));
		}, timeoutMs);
		peer.once("open", (id: string) => {
			globalThis.clearTimeout(timer);
			resolve(id);
		});
		peer.once("error", (error: Error) => {
			globalThis.clearTimeout(timer);
			reject(error);
		});
	});
}

function waitForConnectionOpen(
	connection: DataConnection,
	timeoutMs: number,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = globalThis.setTimeout(() => {
			reject(
				new Error(
					"Timed out connecting to room host. The room may have closed.",
				),
			);
		}, timeoutMs);
		connection.once("open", () => {
			globalThis.clearTimeout(timer);
			resolve();
		});
		connection.once("error", (error: Error) => {
			globalThis.clearTimeout(timer);
			reject(error);
		});
	});
}
