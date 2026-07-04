import Peer, { type DataConnection } from "peerjs";
import type { MultiplayerTransportPort } from "../../../../multiplayer/index.js";
import type { NetworkPeerId } from "../../../modules/networking/index.js";

type MessageListener = (message: unknown, peerId?: NetworkPeerId) => void;
type PeerListListener = (peerIds: readonly NetworkPeerId[]) => void;

export async function createPeerHostTransport(): Promise<MultiplayerTransportPort> {
	const peer = new Peer();
	const peerId = await waitForPeerOpen(peer);
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
	const peerId = await waitForPeerOpen(peer);
	const connection = peer.connect(hostPeerId, { reliable: true });
	await waitForConnectionOpen(connection);
	const messageListeners = new Set<MessageListener>();
	const peerListListeners = new Set<PeerListListener>();
	let connected = true;

	connection.on("data", (data: unknown) => {
		for (const listener of messageListeners) {
			listener(data, hostPeerId);
		}
	});
	connection.on("close", () => {
		connected = false;
		for (const listener of peerListListeners) {
			listener([]);
		}
	});
	connection.on("error", () => {
		connected = false;
		for (const listener of peerListListeners) {
			listener([]);
		}
	});

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
			connection.close();
			peer.destroy();
			messageListeners.clear();
			peerListListeners.clear();
		},
	};
}

function waitForPeerOpen(peer: Peer): Promise<NetworkPeerId> {
	return new Promise((resolve, reject) => {
		peer.once("open", (id: string) => resolve(id));
		peer.once("error", (error: Error) => reject(error));
	});
}

function waitForConnectionOpen(connection: DataConnection): Promise<void> {
	return new Promise((resolve, reject) => {
		connection.once("open", () => resolve());
		connection.once("error", (error: Error) => reject(error));
	});
}
