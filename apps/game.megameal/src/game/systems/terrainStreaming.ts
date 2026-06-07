import type { Entity, System, World } from "../../engine/core/index.js";
import type {
	ColliderComponent,
	RenderTransform,
	RenderableComponent,
	RigidBodyComponent,
	TerrainChunkPackageChunkData,
	TerrainChunkPackageData,
	TerrainVisualBindingData,
} from "../../engine/index.js";
import {
	COLLIDER_COMPONENT,
	RENDERABLE_COMPONENT,
	RIGID_BODY_COMPONENT,
	TRANSFORM_COMPONENT,
} from "../../engine/index.js";
import { STABLE_ID_COMPONENT } from "../prefabs/index.js";
import { PLAYER_ENTITY_RESOURCE } from "./components.js";

export const TERRAIN_CHUNK_PACKAGES_RESOURCE = "game:terrainChunkPackages";
export const TERRAIN_STREAMING_STATUS_RESOURCE = "game:terrainStreamingStatus";

export type TerrainChunkPackageSpawnReport = {
	readonly entity: Entity;
	readonly stableId: string;
};

export type TerrainChunkPackageActivationReport = {
	readonly activatedPackageIds: readonly string[];
	readonly startupChunkStableIds: readonly string[];
	readonly errors: readonly string[];
};

export type TerrainStreamingStatus = {
	readonly packageIds: readonly string[];
	readonly activeCollisionChunkStableIds: readonly string[];
	readonly protectedChunkStableIds: readonly string[];
	readonly nearVisualStableIds: readonly string[];
	readonly farVisualStableIds: readonly string[];
	readonly visibleVisualStableIds: readonly string[];
	readonly lastActivatedChunkStableIds: readonly string[];
	readonly lastDeactivatedChunkStableIds: readonly string[];
	readonly pendingCollisionChunkStableIds: readonly string[];
	readonly errors: readonly string[];
};

export type TerrainChunkStreamingOperation = {
	readonly stableId: string;
	readonly action: "activate-collision" | "deactivate-collision";
};

export type TerrainChunkStreamingPlan = {
	readonly operations: readonly TerrainChunkStreamingOperation[];
	readonly desiredActiveCollisionStableIds: readonly string[];
	readonly protectedChunkStableIds: readonly string[];
	readonly nearVisualStableIds: readonly string[];
	readonly farVisualStableIds: readonly string[];
	readonly visibleVisualStableIds: readonly string[];
	readonly pendingCollisionChunkStableIds: readonly string[];
};

type TerrainChunkRuntimeRecord = {
	readonly packageId: string;
	readonly chunk: TerrainChunkPackageChunkData;
	readonly policy: TerrainChunkPackageData["policy"];
};

type TerrainVisualRuntimeRecord = {
	readonly packageId: string;
	readonly binding: TerrainVisualBindingData;
	readonly policy: TerrainChunkPackageData["policy"];
};

const TERRAIN_CHUNK_CELL_COMPONENT = "TerrainChunkCell";

export function activateTerrainChunkPackages(options: {
	readonly world: World;
	readonly terrainPackages: readonly TerrainChunkPackageData[];
	readonly spawned: readonly TerrainChunkPackageSpawnReport[];
}): TerrainChunkPackageActivationReport {
	const spawnedByStableId = new Map(
		options.spawned.map((spawned) => [spawned.stableId, spawned] as const),
	);
	const activatedPackageIds: string[] = [];
	const startupChunkStableIds: string[] = [];
	const errors: string[] = [];

	for (const terrainPackage of options.terrainPackages) {
		const chunksByStableId = new Map(
			terrainPackage.chunks.map((chunk) => [chunk.stableId, chunk] as const),
		);
		let packageReady = true;

		if (terrainPackage.startupChunkStableIds.length === 0) {
			errors.push(
				`Terrain package "${terrainPackage.id}" has no startup chunks to activate.`,
			);
			packageReady = false;
		}

		for (const stableId of terrainPackage.startupChunkStableIds) {
			const chunk = chunksByStableId.get(stableId);
			const spawned = spawnedByStableId.get(stableId);

			if (!chunk) {
				errors.push(
					`Terrain package "${terrainPackage.id}" startup chunk "${stableId}" is not in package chunks.`,
				);
				packageReady = false;
				continue;
			}

			if (!spawned) {
				errors.push(
					`Terrain package "${terrainPackage.id}" startup chunk "${stableId}" was not spawned.`,
				);
				packageReady = false;
				continue;
			}

			const cell = options.world.getComponent<{ readonly packageId?: unknown }>(
				spawned.entity,
				TERRAIN_CHUNK_CELL_COMPONENT,
			);

			if (cell?.packageId !== terrainPackage.id) {
				errors.push(
					`Terrain package "${terrainPackage.id}" startup chunk "${stableId}" is missing matching TerrainChunkCell state.`,
				);
				packageReady = false;
				continue;
			}

			activateTerrainChunk(options.world, spawned.entity, chunk);
			startupChunkStableIds.push(stableId);
		}

		if (packageReady) {
			activatedPackageIds.push(terrainPackage.id);
		}
	}

	const status = statusFromWorld(options.world, options.terrainPackages, {
		lastActivatedChunkStableIds: startupChunkStableIds,
		lastDeactivatedChunkStableIds: [],
		errors,
	});
	options.world.setResource(TERRAIN_STREAMING_STATUS_RESOURCE, status);

	return {
		activatedPackageIds: sortedUnique(activatedPackageIds),
		startupChunkStableIds: sortedUnique(startupChunkStableIds),
		errors,
	};
}

export function createTerrainStreamingSystem<
	TContext extends { readonly world: World },
>(): System<TContext> {
	return {
		id: "terrain-streaming",
		reads: [
			PLAYER_ENTITY_RESOURCE,
			TERRAIN_CHUNK_PACKAGES_RESOURCE,
			TRANSFORM_COMPONENT,
			STABLE_ID_COMPONENT,
			TERRAIN_CHUNK_CELL_COMPONENT,
		],
		writes: [
			RIGID_BODY_COMPONENT,
			COLLIDER_COMPONENT,
			RENDERABLE_COMPONENT,
			TERRAIN_STREAMING_STATUS_RESOURCE,
		],
		update(context) {
			const packages =
				context.world.getResource<readonly TerrainChunkPackageData[]>(
					TERRAIN_CHUNK_PACKAGES_RESOURCE,
				) ?? [];

			if (packages.length === 0) {
				return;
			}

			const player = context.world.getResource<Entity>(PLAYER_ENTITY_RESOURCE);
			const playerTransform =
				player === undefined
					? undefined
					: context.world.getComponent<RenderTransform>(
							player,
							TRANSFORM_COMPONENT,
						);

			if (playerTransform === undefined) {
				return;
			}

			const entitiesByStableId = stableIdEntityMap(context.world);
			const activeStableIds = activeTerrainChunkStableIds(context.world);
			const plan = planTerrainChunkStreamingOperations({
				packages,
				playerPosition: [
					playerTransform.position.x,
					playerTransform.position.y,
					playerTransform.position.z,
				] as const,
				activeCollisionChunkStableIds: activeStableIds,
			});
			const activated: string[] = [];
			const deactivated: string[] = [];
			const errors: string[] = [];
			const chunksByStableId = terrainChunksByStableId(packages);

			for (const operation of plan.operations) {
				const entity = entitiesByStableId.get(operation.stableId);
				const record = chunksByStableId.get(operation.stableId);

				if (entity === undefined || record === undefined) {
					errors.push(
						`Terrain streaming could not resolve chunk "${operation.stableId}".`,
					);
					continue;
				}

				if (operation.action === "activate-collision") {
					activateTerrainChunk(context.world, entity, record.chunk);
					activated.push(operation.stableId);
				} else {
					deactivateTerrainChunk(context.world, entity);
					deactivated.push(operation.stableId);
				}
			}

			applyTerrainVisualVisibility(
				context.world,
				entitiesByStableId,
				packages.flatMap((terrainPackage) =>
					terrainPackage.visualBindings.map((binding) => binding.stableId),
				),
				plan.visibleVisualStableIds,
			);
			context.world.setResource(TERRAIN_STREAMING_STATUS_RESOURCE, {
				packageIds: packages.map((terrainPackage) => terrainPackage.id).sort(),
				activeCollisionChunkStableIds: activeTerrainChunkStableIds(
					context.world,
				),
				protectedChunkStableIds: plan.protectedChunkStableIds,
				nearVisualStableIds: plan.nearVisualStableIds,
				farVisualStableIds: plan.farVisualStableIds,
				visibleVisualStableIds: plan.visibleVisualStableIds,
				lastActivatedChunkStableIds: sortedUnique(activated),
				lastDeactivatedChunkStableIds: sortedUnique(deactivated),
				pendingCollisionChunkStableIds: plan.pendingCollisionChunkStableIds,
				errors,
			} satisfies TerrainStreamingStatus);
		},
	};
}

export function planTerrainChunkStreamingOperations(options: {
	readonly packages: readonly TerrainChunkPackageData[];
	readonly playerPosition: readonly [number, number, number];
	readonly activeCollisionChunkStableIds: readonly string[];
}): TerrainChunkStreamingPlan {
	const active = new Set(options.activeCollisionChunkStableIds);
	const chunkRecords = terrainChunkRecords(options.packages);
	const visualRecords = terrainVisualRecords(options.packages);
	const containingChunks = chunkRecords.filter((record) =>
		pointInsideBounds(options.playerPosition, record.chunk.bounds),
	);
	const protectedChunkStableIds = protectedChunks(
		chunkRecords,
		containingChunks,
	);
	const protectedStableIds = new Set(protectedChunkStableIds);
	const desiredActive = new Set<string>();
	const pendingActive = new Set<string>();

	for (const record of chunkRecords) {
		const distance = distanceToBoundsXZ(
			options.playerPosition,
			record.chunk.bounds,
		);
		const activationRadius = record.policy.activeCollisionRadiusMeters;
		const keepRadius =
			record.policy.unloadRadiusMeters + record.policy.hysteresisMeters;
		const shouldActivate =
			protectedStableIds.has(record.chunk.stableId) ||
			distance <= activationRadius ||
			(active.has(record.chunk.stableId) && distance <= keepRadius);

		if (shouldActivate) {
			desiredActive.add(record.chunk.stableId);
		} else if (distance <= record.policy.unloadRadiusMeters) {
			pendingActive.add(record.chunk.stableId);
		}
	}

	const activationCandidates = chunkRecords
		.filter(
			(record) =>
				desiredActive.has(record.chunk.stableId) &&
				!active.has(record.chunk.stableId),
		)
		.sort(compareChunkRecords(options.playerPosition));
	const deactivationCandidates = chunkRecords
		.filter(
			(record) =>
				active.has(record.chunk.stableId) &&
				!desiredActive.has(record.chunk.stableId) &&
				!protectedStableIds.has(record.chunk.stableId),
		)
		.sort(compareChunkRecords(options.playerPosition));
	const maxOperations = maxChunkOperationsPerTick(options.packages);
	const operations = [
		...activationCandidates.map((record) => ({
			stableId: record.chunk.stableId,
			action: "activate-collision" as const,
		})),
		...deactivationCandidates.map((record) => ({
			stableId: record.chunk.stableId,
			action: "deactivate-collision" as const,
		})),
	].slice(0, maxOperations);
	const nearVisualStableIds = visualRecords
		.filter(
			(record) =>
				distanceToBoundsXZ(options.playerPosition, record.binding.bounds) <=
				record.policy.nearVisualRadiusMeters,
		)
		.map((record) => record.binding.stableId);
	const farVisualStableIds = visualRecords
		.filter(
			(record) =>
				distanceToBoundsXZ(options.playerPosition, record.binding.bounds) <=
				record.policy.farVisualRadiusMeters,
		)
		.map((record) => record.binding.stableId);
	const visibleVisualStableIds = visualRecords
		.filter(
			(record) =>
				distanceToBoundsXZ(options.playerPosition, record.binding.bounds) <=
				record.policy.unloadRadiusMeters,
		)
		.map((record) => record.binding.stableId);

	return {
		operations,
		desiredActiveCollisionStableIds: sortedUnique([...desiredActive]),
		protectedChunkStableIds,
		nearVisualStableIds: sortedUnique(nearVisualStableIds),
		farVisualStableIds: sortedUnique(farVisualStableIds),
		visibleVisualStableIds: sortedUnique(visibleVisualStableIds),
		pendingCollisionChunkStableIds: sortedUnique([...pendingActive]),
	};
}

function activateTerrainChunk(
	world: World,
	entity: Entity,
	chunk: TerrainChunkPackageChunkData,
): void {
	world.addComponent<RigidBodyComponent>(
		entity,
		RIGID_BODY_COMPONENT,
		cloneValue(chunk.rigidBodyComponent) as RigidBodyComponent,
	);
	world.addComponent<ColliderComponent>(
		entity,
		COLLIDER_COMPONENT,
		cloneValue(chunk.colliderComponent) as ColliderComponent,
	);
}

function deactivateTerrainChunk(world: World, entity: Entity): void {
	world.removeComponent(entity, COLLIDER_COMPONENT);
	world.removeComponent(entity, RIGID_BODY_COMPONENT);
}

function applyTerrainVisualVisibility(
	world: World,
	entitiesByStableId: ReadonlyMap<string, Entity>,
	terrainVisualStableIds: readonly string[],
	visibleVisualStableIds: readonly string[],
): void {
	const terrainVisuals = new Set(terrainVisualStableIds);
	const visible = new Set(visibleVisualStableIds);

	for (const [stableId, entity] of entitiesByStableId) {
		const renderable = world.getComponent<RenderableComponent>(
			entity,
			RENDERABLE_COMPONENT,
		);

		if (renderable === undefined || !terrainVisuals.has(stableId)) {
			continue;
		}

		const nextVisible = visible.has(stableId);

		if ((renderable.visible !== false) !== nextVisible) {
			world.addComponent<RenderableComponent>(entity, RENDERABLE_COMPONENT, {
				...renderable,
				visible: nextVisible,
			});
		}
	}
}

function statusFromWorld(
	world: World,
	packages: readonly TerrainChunkPackageData[],
	options: {
		readonly lastActivatedChunkStableIds: readonly string[];
		readonly lastDeactivatedChunkStableIds: readonly string[];
		readonly errors: readonly string[];
	},
): TerrainStreamingStatus {
	return {
		packageIds: packages.map((terrainPackage) => terrainPackage.id).sort(),
		activeCollisionChunkStableIds: activeTerrainChunkStableIds(world),
		protectedChunkStableIds: [],
		nearVisualStableIds: [],
		farVisualStableIds: [],
		visibleVisualStableIds: packages.flatMap((terrainPackage) =>
			terrainPackage.visualBindings.map((binding) => binding.stableId),
		),
		lastActivatedChunkStableIds: sortedUnique(
			options.lastActivatedChunkStableIds,
		),
		lastDeactivatedChunkStableIds: sortedUnique(
			options.lastDeactivatedChunkStableIds,
		),
		pendingCollisionChunkStableIds: [],
		errors: [...options.errors],
	};
}

function activeTerrainChunkStableIds(world: World): readonly string[] {
	return world
		.query([STABLE_ID_COMPONENT, TERRAIN_CHUNK_CELL_COMPONENT])
		.filter(
			(entity) =>
				world.hasComponent(entity, COLLIDER_COMPONENT) &&
				world.hasComponent(entity, RIGID_BODY_COMPONENT),
		)
		.map((entity) =>
			world.getComponent<{ readonly id?: unknown }>(
				entity,
				STABLE_ID_COMPONENT,
			),
		)
		.flatMap((stableId) =>
			typeof stableId?.id === "string" ? [stableId.id] : [],
		)
		.sort();
}

function stableIdEntityMap(world: World): ReadonlyMap<string, Entity> {
	const entities = new Map<string, Entity>();

	for (const entity of world.query([STABLE_ID_COMPONENT])) {
		const stableId = world.getComponent<{ readonly id?: unknown }>(
			entity,
			STABLE_ID_COMPONENT,
		);

		if (typeof stableId?.id === "string") {
			entities.set(stableId.id, entity);
		}
	}

	return entities;
}

function terrainChunksByStableId(
	packages: readonly TerrainChunkPackageData[],
): ReadonlyMap<string, TerrainChunkRuntimeRecord> {
	return new Map(
		terrainChunkRecords(packages).map(
			(record) => [record.chunk.stableId, record] as const,
		),
	);
}

function terrainChunkRecords(
	packages: readonly TerrainChunkPackageData[],
): readonly TerrainChunkRuntimeRecord[] {
	return packages.flatMap((terrainPackage) =>
		terrainPackage.chunks.map((chunk) => ({
			packageId: terrainPackage.id,
			chunk,
			policy: terrainPackage.policy,
		})),
	);
}

function terrainVisualRecords(
	packages: readonly TerrainChunkPackageData[],
): readonly TerrainVisualRuntimeRecord[] {
	return packages.flatMap((terrainPackage) =>
		terrainPackage.visualBindings.map((binding) => ({
			packageId: terrainPackage.id,
			binding,
			policy: terrainPackage.policy,
		})),
	);
}

function protectedChunks(
	records: readonly TerrainChunkRuntimeRecord[],
	containing: readonly TerrainChunkRuntimeRecord[],
): readonly string[] {
	const protectedStableIds = new Set<string>();

	for (const containingRecord of containing) {
		for (const record of records) {
			if (
				record.packageId === containingRecord.packageId &&
				record.chunk.groupId === containingRecord.chunk.groupId &&
				Math.abs(
					record.chunk.chunkKey[0] - containingRecord.chunk.chunkKey[0],
				) <= 1 &&
				Math.abs(
					record.chunk.chunkKey[1] - containingRecord.chunk.chunkKey[1],
				) <= 1
			) {
				protectedStableIds.add(record.chunk.stableId);
			}
		}
	}

	return [...protectedStableIds].sort();
}

function compareChunkRecords(
	playerPosition: readonly [number, number, number],
) {
	return (
		left: TerrainChunkRuntimeRecord,
		right: TerrainChunkRuntimeRecord,
	): number => {
		const leftDistance = distanceToBoundsXZ(playerPosition, left.chunk.bounds);
		const rightDistance = distanceToBoundsXZ(
			playerPosition,
			right.chunk.bounds,
		);

		if (leftDistance !== rightDistance) {
			return leftDistance - rightDistance;
		}

		return left.chunk.stableId.localeCompare(right.chunk.stableId);
	};
}

function maxChunkOperationsPerTick(
	packages: readonly TerrainChunkPackageData[],
): number {
	return Math.max(
		1,
		Math.min(
			...packages.map(
				(terrainPackage) => terrainPackage.policy.maxChunkOperationsPerTick,
			),
		),
	);
}

function pointInsideBounds(
	point: readonly [number, number, number],
	bounds: TerrainChunkPackageChunkData["bounds"],
): boolean {
	return (
		point[0] >= bounds.min[0] &&
		point[0] <= bounds.max[0] &&
		point[1] >= bounds.min[1] &&
		point[1] <= bounds.max[1] &&
		point[2] >= bounds.min[2] &&
		point[2] <= bounds.max[2]
	);
}

function distanceToBoundsXZ(
	point: readonly [number, number, number],
	bounds:
		| TerrainChunkPackageChunkData["bounds"]
		| TerrainVisualBindingData["bounds"],
): number {
	const dx =
		point[0] < bounds.min[0]
			? bounds.min[0] - point[0]
			: point[0] > bounds.max[0]
				? point[0] - bounds.max[0]
				: 0;
	const dz =
		point[2] < bounds.min[2]
			? bounds.min[2] - point[2]
			: point[2] > bounds.max[2]
				? point[2] - bounds.max[2]
				: 0;

	return Math.hypot(dx, dz);
}

function sortedUnique(values: readonly string[]): readonly string[] {
	return [...new Set(values)].sort();
}

function cloneValue<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}
