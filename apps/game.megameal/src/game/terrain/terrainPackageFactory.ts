import type {
	LevelPrefabInstanceData,
	TerrainBoundsData,
	TerrainChunkPackageChunkData,
	TerrainChunkPackageData,
	TerrainChunkStreamingPolicyData,
	TerrainMaterialSetData,
	TerrainVisualBindingData,
} from "../../engine/data/index.js";

export type TerrainRuntimeSceneData = {
	readonly runtimeSceneId: string;
	readonly levelInstances: readonly LevelPrefabInstanceData[];
	readonly terrainPackages: readonly TerrainChunkPackageData[];
	readonly readiness: {
		readonly requiredTerrainPackageIds: readonly string[];
	};
};

export type BoxTerrainSurfaceSource = {
	readonly id: string;
	readonly stableId: string;
	readonly groupId: string;
	readonly bounds: TerrainBoundsData;
	readonly meshId: string;
	readonly materialId?: string;
	readonly materialSetId: string;
	readonly materialLayerIds: readonly string[];
	readonly chunkSizeMeters: number;
	readonly visualMode: "chunked" | "merged-binding";
	readonly visualBinding?: {
		readonly id: string;
		readonly stableId: string;
		readonly prefabId: string;
	};
};

export type ExistingTerrainChunkSource = {
	readonly id: string;
	readonly stableId: string;
	readonly groupId: string;
	readonly chunkKey: readonly [number, number];
	readonly bounds: TerrainBoundsData;
	readonly transformPosition?: readonly [number, number, number];
	readonly colliderComponent: Record<string, unknown>;
	readonly materialSetId: string;
	readonly materialLayerIds: readonly string[];
};

export type TerrainRuntimePackageOptions = {
	readonly runtimeSceneId: string;
	readonly sourceManifestId: string;
	readonly packageId: string;
	readonly policy: TerrainChunkStreamingPolicyData;
	readonly startupCenter?: readonly [number, number, number];
	readonly materialSets: readonly TerrainMaterialSetData[];
	readonly boxSurfaces?: readonly BoxTerrainSurfaceSource[];
	readonly existingChunks?: readonly ExistingTerrainChunkSource[];
	readonly existingVisualBindings?: readonly TerrainVisualBindingData[];
};

const terrainChunkCellPrefabId = "terrain_chunk_cell";

export function createTerrainRuntimeSceneData(
	options: TerrainRuntimePackageOptions,
): TerrainRuntimeSceneData {
	const chunks: TerrainChunkPackageChunkData[] = [];
	const levelInstances: LevelPrefabInstanceData[] = [];
	const visualBindings: TerrainVisualBindingData[] = [
		...(options.existingVisualBindings ?? []),
	];

	for (const surface of options.boxSurfaces ?? []) {
		const surfaceChunkSources = chunkBoxSurface(surface);

		for (const chunk of surfaceChunkSources) {
			const chunkStableId = `${surface.stableId}:terrain-chunk:x${chunk.chunkKey[0]}-z${chunk.chunkKey[1]}`;
			const visualStableId =
				surface.visualMode === "chunked"
					? `${chunkStableId}:visual`
					: undefined;
			const chunkEntry = terrainPackageChunk({
				stableId: chunkStableId,
				groupId: surface.groupId,
				chunkKey: chunk.chunkKey,
				bounds: chunk.bounds,
				colliderComponent: boxCollider(chunk.bounds),
				materialSetId: surface.materialSetId,
				materialLayerIds: surface.materialLayerIds,
				nearVisualStableIds:
					visualStableId === undefined ? [] : [visualStableId],
				farVisualStableIds: [],
			});

			chunks.push(chunkEntry);
			levelInstances.push(
				terrainCellInstance(
					chunkStableId,
					options.packageId,
					boundsCenter(chunk.bounds),
				),
			);

			if (visualStableId !== undefined) {
				levelInstances.push(
					terrainVisualInstance({
						id: `${surface.id}-terrain-visual-${chunk.chunkKey[0]}-${chunk.chunkKey[1]}`,
						stableId: visualStableId,
						meshId: surface.meshId,
						bounds: chunk.bounds,
						materialSetId: surface.materialSetId,
						materialLayerIds: surface.materialLayerIds,
						...(surface.materialId === undefined
							? {}
							: { materialId: surface.materialId }),
					}),
				);
				visualBindings.push({
					id: `${surface.id}-visual-${chunk.chunkKey[0]}-${chunk.chunkKey[1]}`,
					stableId: visualStableId,
					prefabId: terrainChunkCellPrefabId,
					bounds: chunk.bounds,
					sourceChunkStableIds: [chunkStableId],
					lod: "near",
				});
			}
		}

		if (
			surface.visualMode === "merged-binding" &&
			surface.visualBinding !== undefined
		) {
			visualBindings.push({
				...surface.visualBinding,
				bounds: surface.bounds,
				sourceChunkStableIds: surfaceChunkSources.map(
					(chunk) =>
						`${surface.stableId}:terrain-chunk:x${chunk.chunkKey[0]}-z${chunk.chunkKey[1]}`,
				),
				lod: "merged-floor",
			});
		}
	}

	for (const chunk of options.existingChunks ?? []) {
		chunks.push(
			terrainPackageChunk({
				stableId: chunk.stableId,
				groupId: chunk.groupId,
				chunkKey: chunk.chunkKey,
				bounds: chunk.bounds,
				colliderComponent: chunk.colliderComponent,
				materialSetId: chunk.materialSetId,
				materialLayerIds: chunk.materialLayerIds,
				nearVisualStableIds: visualBindings
					.filter((binding) =>
						binding.sourceChunkStableIds.includes(chunk.stableId),
					)
					.map((binding) => binding.stableId),
				farVisualStableIds: [],
			}),
		);
		levelInstances.push(
			terrainCellInstance(
				chunk.stableId,
				options.packageId,
				chunk.transformPosition ?? boundsCenter(chunk.bounds),
			),
		);
	}

	const startupChunkStableIds = startupChunks(
		chunks,
		options.policy,
		options.startupCenter ?? [0, 0, 0],
	);
	const packageWithoutHash = {
		schemaVersion: 1,
		id: options.packageId,
		runtimeSceneId: options.runtimeSceneId,
		sourceManifestId: options.sourceManifestId,
		policy: options.policy,
		materialSets: options.materialSets,
		chunks,
		visualBindings,
		startupChunkStableIds,
		streamableChunkStableIds: chunks.map((chunk) => chunk.stableId).sort(),
	} satisfies Omit<TerrainChunkPackageData, "driftHash">;
	const terrainPackage = {
		...packageWithoutHash,
		driftHash: stableHash(packageWithoutHash),
	};

	return {
		runtimeSceneId: options.runtimeSceneId,
		levelInstances,
		terrainPackages: [terrainPackage],
		readiness: {
			requiredTerrainPackageIds: [terrainPackage.id],
		},
	};
}

function chunkBoxSurface(surface: BoxTerrainSurfaceSource): readonly {
	readonly chunkKey: readonly [number, number];
	readonly bounds: TerrainBoundsData;
}[] {
	const chunks: {
		readonly chunkKey: readonly [number, number];
		readonly bounds: TerrainBoundsData;
	}[] = [];
	const [minX, minY, minZ] = surface.bounds.min;
	const [maxX, maxY, maxZ] = surface.bounds.max;
	const columns = Math.max(
		1,
		Math.ceil((maxX - minX) / surface.chunkSizeMeters),
	);
	const rows = Math.max(1, Math.ceil((maxZ - minZ) / surface.chunkSizeMeters));

	for (let x = 0; x < columns; x += 1) {
		for (let z = 0; z < rows; z += 1) {
			const chunkMinX = round(minX + x * surface.chunkSizeMeters);
			const chunkMaxX = round(
				Math.min(maxX, minX + (x + 1) * surface.chunkSizeMeters),
			);
			const chunkMinZ = round(minZ + z * surface.chunkSizeMeters);
			const chunkMaxZ = round(
				Math.min(maxZ, minZ + (z + 1) * surface.chunkSizeMeters),
			);

			chunks.push({
				chunkKey: [x, z],
				bounds: {
					min: [chunkMinX, minY, chunkMinZ],
					max: [chunkMaxX, maxY, chunkMaxZ],
				},
			});
		}
	}

	return chunks;
}

function terrainPackageChunk(options: {
	readonly stableId: string;
	readonly groupId: string;
	readonly chunkKey: readonly [number, number];
	readonly bounds: TerrainBoundsData;
	readonly colliderComponent: Record<string, unknown>;
	readonly materialSetId: string;
	readonly materialLayerIds: readonly string[];
	readonly nearVisualStableIds: readonly string[];
	readonly farVisualStableIds: readonly string[];
}): TerrainChunkPackageChunkData {
	return {
		stableId: options.stableId,
		groupId: options.groupId,
		chunkKey: options.chunkKey,
		bounds: options.bounds,
		center: boundsCenter(options.bounds),
		lod: {
			nearVisualStableIds: [...options.nearVisualStableIds].sort(),
			farVisualStableIds: [...options.farVisualStableIds].sort(),
		},
		materialBinding: {
			materialSetId: options.materialSetId,
			layerIds: [...options.materialLayerIds],
		},
		rigidBodyComponent: {
			type: "fixed",
			mass: 0,
		},
		colliderComponent: options.colliderComponent,
	};
}

function terrainCellInstance(
	stableId: string,
	packageId: string,
	position: readonly [number, number, number],
): LevelPrefabInstanceData {
	return {
		id: instanceId(stableId),
		prefabId: terrainChunkCellPrefabId,
		stableId,
		transform: {
			position,
		},
		components: {
			TerrainChunkCell: {
				packageId,
			},
		},
	};
}

function terrainVisualInstance(options: {
	readonly id: string;
	readonly stableId: string;
	readonly meshId: string;
	readonly materialId?: string;
	readonly bounds: TerrainBoundsData;
	readonly materialSetId: string;
	readonly materialLayerIds: readonly string[];
}): LevelPrefabInstanceData {
	const center = boundsCenter(options.bounds);

	return {
		id: options.id,
		prefabId: terrainChunkCellPrefabId,
		stableId: options.stableId,
		transform: {
			position: center,
			scale: [
				round(options.bounds.max[0] - options.bounds.min[0]),
				round(options.bounds.max[1] - options.bounds.min[1]),
				round(options.bounds.max[2] - options.bounds.min[2]),
			],
		},
		components: {
			Renderable: {
				meshId: options.meshId,
				...(options.materialId === undefined
					? {}
					: { materialId: options.materialId }),
				visible: true,
			},
			TerrainSurface: {
				materialSetId: options.materialSetId,
				layerIds: [...options.materialLayerIds],
				blendMode: "single",
			},
		},
	};
}

function boxCollider(bounds: TerrainBoundsData): Record<string, unknown> {
	return {
		intent: "walkable",
		channel: "worldStatic",
		shape: {
			type: "box",
			halfExtents: [
				round((bounds.max[0] - bounds.min[0]) / 2),
				round((bounds.max[1] - bounds.min[1]) / 2),
				round((bounds.max[2] - bounds.min[2]) / 2),
			],
		},
	};
}

function startupChunks(
	chunks: readonly TerrainChunkPackageChunkData[],
	policy: TerrainChunkStreamingPolicyData,
	center: readonly [number, number, number],
): readonly string[] {
	return chunks
		.filter(
			(chunk) =>
				distanceToBoundsXZ(center, chunk.bounds) <= policy.startupRadiusMeters,
		)
		.map((chunk) => chunk.stableId)
		.sort();
}

function distanceToBoundsXZ(
	point: readonly [number, number, number],
	bounds: TerrainBoundsData,
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

function boundsCenter(
	bounds: TerrainBoundsData,
): readonly [number, number, number] {
	return [
		round((bounds.min[0] + bounds.max[0]) / 2),
		round((bounds.min[1] + bounds.max[1]) / 2),
		round((bounds.min[2] + bounds.max[2]) / 2),
	];
}

function instanceId(stableId: string): string {
	return stableId.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function stableHash(value: unknown): string {
	const source = JSON.stringify(sortValue(value));
	let hash = 0x811c9dc5;

	for (let index = 0; index < source.length; index += 1) {
		hash ^= source.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}

	return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

function sortValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(sortValue);
	}

	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, item]) => [key, sortValue(item)]),
		);
	}

	return value;
}

function round(value: number): number {
	return Math.round(value * 1000000) / 1000000;
}
