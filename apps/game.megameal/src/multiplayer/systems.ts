import type { Entity, System, World } from "../engine/core/index.js";
import { quat, vec3 } from "../engine/math/index.js";
import {
	RENDERABLE_COMPONENT,
	type RenderTransform,
	type RenderableComponent,
	TRANSFORM_COMPONENT,
} from "../engine/modules/rendering/index.js";
import { STABLE_ID_COMPONENT } from "../game/prefabs/index.js";
import {
	type GameHudState,
	PLAYER_ENTITY_RESOURCE,
} from "../game/systems/components.js";
import type { MultiplayerSession } from "./session.js";

export const MULTIPLAYER_REMOTE_PLAYER_COMPONENT = "MultiplayerRemotePlayer";
export const MULTIPLAYER_REMOTE_PLAYER_OWNER_RESOURCE =
	"multiplayer:remotePlayerEntities";

export type MultiplayerRemotePlayerComponent = {
	readonly peerId: string;
};

export type MultiplayerRemoteAvatarMeshRenderable = {
	readonly kind?: "mesh";
	readonly meshId: string;
	readonly materialId?: string;
	readonly scale?: readonly [number, number, number];
};

export type MultiplayerRemoteAvatarSpriteRenderable = {
	readonly kind: "sprite";
	readonly spriteId: string;
	readonly color?: string;
	readonly scale?: readonly [number, number, number];
	readonly fallback?: MultiplayerRemoteAvatarMeshRenderable;
};

export type MultiplayerRemoteAvatarRenderable =
	| MultiplayerRemoteAvatarMeshRenderable
	| MultiplayerRemoteAvatarSpriteRenderable;

export function createLocalPlayerPoseBroadcastSystem<
	TContext extends MultiplayerSystemContext,
>(options: {
	readonly multiplayer: MultiplayerSession;
	readonly intervalSeconds?: number;
}): System<TContext> {
	const intervalSeconds = options.intervalSeconds ?? 0.1;
	let elapsedSeconds = 0;

	return {
		id: "multiplayer-local-player-pose-broadcast",
		reads: [TRANSFORM_COMPONENT],
		update(context) {
			elapsedSeconds += context.deltaSeconds;

			if (elapsedSeconds < intervalSeconds) {
				return;
			}

			elapsedSeconds = 0;
			const snapshot = options.multiplayer.snapshot();

			if (!snapshot.enabled || snapshot.status !== "connected") {
				return;
			}

			const player = context.world.getResource<Entity>(PLAYER_ENTITY_RESOURCE);

			if (player === undefined || !context.world.isAlive(player)) {
				return;
			}

			const transform = context.world.getComponent<RenderTransform>(
				player,
				TRANSFORM_COMPONENT,
			);

			if (!transform) {
				return;
			}

			options.multiplayer.publishLocalPose({
				position: [
					transform.position.x,
					transform.position.y,
					transform.position.z,
				],
				rotation: [
					transform.rotation.x,
					transform.rotation.y,
					transform.rotation.z,
					transform.rotation.w,
				],
				tick: context.tick,
			});
		},
	};
}

export function createRemotePlayerReplicationSystem<
	TContext extends MultiplayerSystemContext,
>(options: {
	readonly multiplayer: MultiplayerSession;
	readonly renderable: MultiplayerRemoteAvatarRenderable;
}): System<TContext> {
	return {
		id: "multiplayer-remote-player-replication",
		reads: [MULTIPLAYER_REMOTE_PLAYER_COMPONENT],
		writes: [
			MULTIPLAYER_REMOTE_PLAYER_COMPONENT,
			STABLE_ID_COMPONENT,
			TRANSFORM_COMPONENT,
			RENDERABLE_COMPONENT,
		],
		update(context) {
			const snapshot = options.multiplayer.snapshot();
			const remoteEntities = getRemotePlayerEntityMap(context.world);
			const activePeerIds = new Set(
				snapshot.remotePlayers.map((player) => player.peerId),
			);

			for (const [peerId, entity] of remoteEntities) {
				if (!activePeerIds.has(peerId) || !context.world.isAlive(entity)) {
					context.world.destroyEntity(entity);
					remoteEntities.delete(peerId);
				}
			}

			if (!snapshot.enabled || snapshot.status !== "connected") {
				for (const entity of remoteEntities.values()) {
					context.world.destroyEntity(entity);
				}
				remoteEntities.clear();
				return;
			}

			for (const player of snapshot.remotePlayers) {
				let entity = remoteEntities.get(player.peerId);
				const avatar = resolveRemoteAvatarRenderable(
					options.renderable,
					context.world,
				);

				if (entity === undefined || !context.world.isAlive(entity)) {
					entity = context.world.createEntity();
					remoteEntities.set(player.peerId, entity);
					context.world.addComponent<MultiplayerRemotePlayerComponent>(
						entity,
						MULTIPLAYER_REMOTE_PLAYER_COMPONENT,
						{ peerId: player.peerId },
					);
					context.world.addComponent(entity, STABLE_ID_COMPONENT, {
						id: `multiplayer:remote-player:${player.peerId}`,
					});
				}
				context.world.addComponent<RenderableComponent>(
					entity,
					RENDERABLE_COMPONENT,
					avatar.renderable,
				);

				context.world.addComponent<RenderTransform>(
					entity,
					TRANSFORM_COMPONENT,
					{
						position: vec3(
							player.pose.position[0],
							player.pose.position[1],
							player.pose.position[2],
						),
						rotation: player.pose.rotation
							? quat(
									player.pose.rotation[0],
									player.pose.rotation[1],
									player.pose.rotation[2],
									player.pose.rotation[3],
								)
							: quat(),
						scale: avatar.scale
							? vec3(avatar.scale[0], avatar.scale[1], avatar.scale[2])
							: vec3(0.75, 1.25, 0.75),
					},
				);
			}
		},
	};
}

export function selectMultiplayerHudState(
	multiplayer: MultiplayerSession | undefined,
): GameHudState["multiplayer"] {
	if (!multiplayer) {
		return undefined;
	}

	const snapshot = multiplayer.snapshot();

	return {
		enabled: snapshot.enabled,
		mode: snapshot.mode,
		status: snapshot.status,
		connectedPeers: snapshot.connectedPeers.length,
		remotePlayers: snapshot.remotePlayers.length,
		...(snapshot.roomName ? { roomName: snapshot.roomName } : {}),
		...(snapshot.localPeerId ? { localPeerId: snapshot.localPeerId } : {}),
		...(snapshot.error ? { error: snapshot.error } : {}),
	};
}

type MultiplayerSystemContext = {
	readonly deltaSeconds: number;
	readonly tick: number;
	readonly world: World;
};

function getRemotePlayerEntityMap(world: World): Map<string, Entity> {
	let entities = world.getResource<Map<string, Entity>>(
		MULTIPLAYER_REMOTE_PLAYER_OWNER_RESOURCE,
	);

	if (!entities) {
		entities = new Map<string, Entity>();
		world.setResource(MULTIPLAYER_REMOTE_PLAYER_OWNER_RESOURCE, entities);
	}

	return entities;
}

function resolveRemoteAvatarRenderable(
	renderable: MultiplayerRemoteAvatarRenderable,
	world: World,
): {
	readonly renderable: RenderableComponent;
	readonly scale?: readonly [number, number, number];
} {
	if (renderable.kind === "sprite") {
		if (spriteAssetLoaded(world, renderable.spriteId)) {
			return {
				renderable: {
					kind: "sprite",
					spriteId: renderable.spriteId,
					...(renderable.color ? { color: renderable.color } : {}),
					visible: true,
				},
				...(renderable.scale ? { scale: renderable.scale } : {}),
			};
		}

		return resolveRemoteAvatarRenderable(
			renderable.fallback ?? {
				kind: "mesh",
				meshId: "mesh_player",
				materialId: "material_player",
				scale: [0.75, 1.25, 0.75],
			},
			world,
		);
	}

	return {
		renderable: {
			kind: "mesh",
			meshId: renderable.meshId,
			...(renderable.materialId ? { materialId: renderable.materialId } : {}),
			visible: true,
		},
		...(renderable.scale ? { scale: renderable.scale } : {}),
	};
}

function spriteAssetLoaded(world: World, spriteId: string): boolean {
	const assets = world.getResource<{
		has(id: string): boolean;
		get(id: string): unknown;
	}>("assets");

	return assets?.has(spriteId) === true && assets.get(spriteId) !== undefined;
}
