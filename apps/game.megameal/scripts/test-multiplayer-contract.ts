import assert from "node:assert/strict";
import { World } from "../src/engine/core/index.js";
import { quat, vec3 } from "../src/engine/math/index.js";
import {
	RENDERABLE_COMPONENT,
	type RenderTransform,
	TRANSFORM_COMPONENT,
} from "../src/engine/modules/rendering/index.js";
import { PLAYER_ENTITY_RESOURCE } from "../src/game/systems/components.js";
import {
	MULTIPLAYER_REMOTE_PLAYER_COMPONENT,
	type MultiplayerTransportPort,
	type MultiplayerWireMessage,
	createLocalPlayerPoseBroadcastSystem,
	createMultiplayerSession,
	createRemotePlayerReplicationSystem,
} from "../src/multiplayer/index.js";

async function testHostRelaysPoseAndChatBetweenClients(): Promise<void> {
	const hostSession = createMultiplayerSession({
		timestamp: () => "2026-07-02T00:00:00.000Z",
	});
	const clientA = createMultiplayerSession({
		timestamp: () => "2026-07-02T00:00:01.000Z",
	});
	const clientB = createMultiplayerSession({
		timestamp: () => "2026-07-02T00:00:02.000Z",
	});
	const hostTransport = new MockHostTransport("host-peer");
	const clientATransport = new MockClientTransport("client-a", hostTransport);
	const clientBTransport = new MockClientTransport("client-b", hostTransport);

	hostTransport.connect(clientATransport);
	hostTransport.connect(clientBTransport);
	hostSession.attachTransport({
		transport: hostTransport,
		roomName: "test-room",
	});
	clientA.attachTransport({
		transport: clientATransport,
		roomName: "test-room",
	});
	clientB.attachTransport({
		transport: clientBTransport,
		roomName: "test-room",
	});

	clientA.publishLocalPose({
		position: [1, 2, 3],
		rotation: [0, 0, 0, 1],
		tick: 12,
	});

	assert.equal(clientA.snapshot().remotePlayers.length, 0);
	assert.equal(clientB.snapshot().remotePlayers.length, 1);
	assert.deepEqual(
		clientB.snapshot().remotePlayers[0]?.pose.position,
		[1, 2, 3],
	);

	clientA.sendChat("hello");

	assert.equal(clientB.snapshot().chatMessages.at(-1)?.text, "hello");
	assert.equal(clientB.snapshot().chatMessages.at(-1)?.senderId, "client-a");
}

async function testRuntimeSystemsBroadcastAndSpawnRemotePlayers(): Promise<void> {
	const session = createMultiplayerSession({
		timestamp: () => "2026-07-02T00:00:00.000Z",
	});
	const hostTransport = new MockHostTransport("host-peer");
	const clientTransport = new MockClientTransport("client-a", hostTransport);
	const world = new World();
	const player = world.createEntity();
	const broadcastSystem = createLocalPlayerPoseBroadcastSystem({
		multiplayer: session,
		intervalSeconds: 0.1,
	});
	const replicationSystem = createRemotePlayerReplicationSystem({
		multiplayer: session,
		renderable: {
			meshId: "mesh_player",
			materialId: "material_player",
		},
	});

	hostTransport.connect(clientTransport);
	session.attachTransport({
		transport: clientTransport,
		roomName: "test-room",
	});
	world.setResource(PLAYER_ENTITY_RESOURCE, player);
	world.addComponent<RenderTransform>(player, TRANSFORM_COMPONENT, {
		position: vec3(4, 5, 6),
		rotation: quat(),
		scale: vec3(1, 1, 1),
	});

	broadcastSystem.update({
		deltaSeconds: 0.1,
		tick: 10,
		world,
	});

	assert.equal(hostTransport.receivedMessages.length, 1);
	assert.equal(
		hostTransport.receivedMessages[0]?.type,
		"multiplayer:player-pose",
	);

	clientTransport.receive({
		type: "multiplayer:full-state",
		players: [
			{
				peerId: "client-b",
				pose: {
					position: [7, 8, 9],
					rotation: [0, 0, 0, 1],
					tick: 11,
				},
				updatedAt: 1,
			},
		],
	});
	replicationSystem.update({
		deltaSeconds: 0.016,
		tick: 11,
		world,
	});

	const remotePlayers = world.query([MULTIPLAYER_REMOTE_PLAYER_COMPONENT]);
	assert.equal(remotePlayers.length, 1);
	const remotePlayer = remotePlayers[0];
	assert.ok(remotePlayer);
	assert.ok(world.hasComponent(remotePlayer, RENDERABLE_COMPONENT));
	assert.deepEqual(
		transformTuple(
			world.requireComponent<RenderTransform>(
				remotePlayer,
				TRANSFORM_COMPONENT,
			),
		),
		[7, 8, 9],
	);
}

async function testRemotePlayerCanRenderAsFireflySprite(): Promise<void> {
	const session = createMultiplayerSession({
		timestamp: () => "2026-07-02T00:00:00.000Z",
	});
	const hostTransport = new MockHostTransport("host-peer");
	const clientTransport = new MockClientTransport("client-a", hostTransport);
	const world = new World();
	const replicationSystem = createRemotePlayerReplicationSystem({
		multiplayer: session,
		renderable: {
			kind: "sprite",
			spriteId: "sprite_npc_firefly_outer_halo",
			color: "#66d9ff",
			scale: [1.25, 1.25, 1],
			fallback: {
				meshId: "mesh_player",
				materialId: "material_player",
			},
		},
	});

	hostTransport.connect(clientTransport);
	session.attachTransport({
		transport: clientTransport,
		roomName: "test-room",
	});
	world.setResource(
		"assets",
		new MockAssets(["sprite_npc_firefly_outer_halo"]),
	);

	clientTransport.receive({
		type: "multiplayer:full-state",
		players: [
			{
				peerId: "client-b",
				pose: {
					position: [2, 3, 4],
					rotation: [0, 0, 0, 1],
					tick: 12,
				},
				updatedAt: 1,
			},
		],
	});
	replicationSystem.update({
		deltaSeconds: 0.016,
		tick: 12,
		world,
	});

	const remotePlayer = world.query([MULTIPLAYER_REMOTE_PLAYER_COMPONENT])[0];
	assert.ok(remotePlayer);
	assert.deepEqual(world.requireComponent(remotePlayer, RENDERABLE_COMPONENT), {
		kind: "sprite",
		spriteId: "sprite_npc_firefly_outer_halo",
		color: "#66d9ff",
		visible: true,
	});
}

class MockHostTransport implements MultiplayerTransportPort {
	readonly role = "host";
	readonly clients = new Map<string, MockClientTransport>();
	readonly messageListeners = new Set<
		(message: unknown, peerId?: string) => void
	>();
	readonly peerListListeners = new Set<(peerIds: readonly string[]) => void>();
	readonly receivedMessages: MultiplayerWireMessage[] = [];

	constructor(readonly peerId: string) {}

	send(): void {}

	broadcast(message: MultiplayerWireMessage): void {
		for (const client of this.clients.values()) {
			client.receive(message);
		}
	}

	onMessage(listener: (message: unknown, peerId?: string) => void): () => void {
		this.messageListeners.add(listener);
		return () => this.messageListeners.delete(listener);
	}

	onPeerListChanged(
		listener: (peerIds: readonly string[]) => void,
	): () => void {
		this.peerListListeners.add(listener);
		listener(this.connectedPeers());
		return () => this.peerListListeners.delete(listener);
	}

	connectedPeers(): readonly string[] {
		return [...this.clients.keys()].sort();
	}

	connect(client: MockClientTransport): void {
		this.clients.set(client.peerId, client);
		this.notifyPeerList();
	}

	receive(message: MultiplayerWireMessage, peerId: string): void {
		this.receivedMessages.push(message);
		for (const listener of this.messageListeners) {
			listener(message, peerId);
		}
	}

	dispose(): void {
		this.clients.clear();
		this.messageListeners.clear();
		this.peerListListeners.clear();
	}

	private notifyPeerList(): void {
		for (const listener of this.peerListListeners) {
			listener(this.connectedPeers());
		}
	}
}

class MockClientTransport implements MultiplayerTransportPort {
	readonly role = "client";
	readonly messageListeners = new Set<
		(message: unknown, peerId?: string) => void
	>();
	readonly peerListListeners = new Set<(peerIds: readonly string[]) => void>();

	constructor(
		readonly peerId: string,
		readonly host: MockHostTransport,
	) {}

	send(message: MultiplayerWireMessage): void {
		this.host.receive(message, this.peerId);
	}

	broadcast(message: MultiplayerWireMessage): void {
		this.send(message);
	}

	onMessage(listener: (message: unknown, peerId?: string) => void): () => void {
		this.messageListeners.add(listener);
		return () => this.messageListeners.delete(listener);
	}

	onPeerListChanged(
		listener: (peerIds: readonly string[]) => void,
	): () => void {
		this.peerListListeners.add(listener);
		listener(this.connectedPeers());
		return () => this.peerListListeners.delete(listener);
	}

	connectedPeers(): readonly string[] {
		return [this.host.peerId];
	}

	receive(message: MultiplayerWireMessage): void {
		for (const listener of this.messageListeners) {
			listener(message, this.host.peerId);
		}
	}

	dispose(): void {
		this.messageListeners.clear();
		this.peerListListeners.clear();
	}
}

class MockAssets {
	readonly loadedIds: ReadonlySet<string>;

	constructor(loadedIds: readonly string[]) {
		this.loadedIds = new Set(loadedIds);
	}

	has(id: string): boolean {
		return this.loadedIds.has(id);
	}

	get(id: string): unknown {
		return this.loadedIds.has(id) ? { id } : undefined;
	}
}

function transformTuple(
	transform: RenderTransform,
): readonly [number, number, number] {
	return [transform.position.x, transform.position.y, transform.position.z];
}

await testHostRelaysPoseAndChatBetweenClients();
await testRuntimeSystemsBroadcastAndSpawnRemotePlayers();
await testRemotePlayerCanRenderAsFireflySprite();

console.log("multiplayer contract tests passed");
