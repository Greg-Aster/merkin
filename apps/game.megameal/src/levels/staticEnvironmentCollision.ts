import type { LevelData, PrefabData } from "../engine/data/index.js";

export type StaticEnvironmentCollisionVector3 = readonly [
	number,
	number,
	number,
];

export type StaticEnvironmentCollisionBounds = {
	readonly min: StaticEnvironmentCollisionVector3;
	readonly max: StaticEnvironmentCollisionVector3;
};

export type StaticEnvironmentCollisionSettings = {
	readonly profile: "mobile" | "mobile-dense" | "desktop";
	readonly chunkSizeMeters: number;
	readonly sampleSpacingMeters: number;
	readonly walkableSlopeDegrees: number;
	readonly maxTrianglesPerChunk: number;
	readonly maxTotalTriangles: number;
};

export type StaticEnvironmentCollisionSource = {
	readonly kind: "automatic-glb" | "manual-collision-glb";
	readonly visualAssetId: string;
	readonly visualAssetUrl: string;
	readonly collisionAssetUrl?: string;
	readonly sourceHash: string;
};

export type StaticEnvironmentCollisionChunk = {
	readonly id: string;
	readonly stableId: string;
	readonly chunkKey: readonly [number, number];
	readonly bounds: StaticEnvironmentCollisionBounds;
	readonly collider: {
		readonly intent: "walkable";
		readonly channel: "worldStatic";
		readonly shape: {
			readonly type: "mesh";
			readonly vertices: readonly StaticEnvironmentCollisionVector3[];
			readonly indices: readonly number[];
		};
	};
};

export type StaticEnvironmentCollisionProduct = {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly levelId: string;
	readonly runtimeSceneId: string;
	readonly generatedAt: string;
	readonly generator: "staticEnvironmentCollisionCook.v1";
	readonly source: StaticEnvironmentCollisionSource;
	readonly settings: StaticEnvironmentCollisionSettings;
	readonly summary: {
		readonly bounds: StaticEnvironmentCollisionBounds;
		readonly chunkCount: number;
		readonly sourceBounds?: StaticEnvironmentCollisionBounds;
		readonly walkableBounds?: StaticEnvironmentCollisionBounds;
		readonly vertexCount: number;
		readonly triangleCount: number;
		readonly sourceTriangleCount: number;
		readonly walkableTriangleCount?: number;
		readonly sampledPointCount: number;
		readonly metersPerSample?: number;
	};
	readonly chunks: readonly StaticEnvironmentCollisionChunk[];
};

export type StaticEnvironmentCollisionPackage = {
	readonly products?: readonly unknown[];
};

export type ResolvedStaticEnvironmentCollisionPackage = {
	readonly prefabs: readonly PrefabData[];
	readonly instances: readonly LevelData["instances"][number][];
	readonly requiredCollisionStableIds: readonly string[];
	readonly requiredWalkableStableIds: readonly string[];
};

const staticEnvironmentCollisionChunkPrefabId =
	"static_environment_collision_chunk";

export function resolveStaticEnvironmentCollisionPackage(
	data: StaticEnvironmentCollisionPackage = {},
): ResolvedStaticEnvironmentCollisionPackage {
	const products = (data.products ?? []).map(
		parseStaticEnvironmentCollisionProduct,
	);

	if (products.length === 0) {
		return {
			prefabs: [],
			instances: [],
			requiredCollisionStableIds: [],
			requiredWalkableStableIds: [],
		};
	}

	return {
		prefabs: [staticEnvironmentCollisionChunkPrefab],
		instances: products.flatMap((product) =>
			product.chunks.map((chunk) => ({
				id: chunk.id,
				prefabId: staticEnvironmentCollisionChunkPrefabId,
				stableId: chunk.stableId,
				transform: {
					position: [0, 0, 0] as const,
				},
				components: {
					Collider: chunk.collider,
					StaticEnvironmentCollisionChunk: {
						productId: product.id,
						levelId: product.levelId,
						runtimeSceneId: product.runtimeSceneId,
						chunkKey: chunk.chunkKey,
						bounds: chunk.bounds,
						sourceHash: product.source.sourceHash,
						profile: product.settings.profile,
					},
				},
			})),
		),
		requiredCollisionStableIds: products.flatMap((product) =>
			product.chunks.map((chunk) => chunk.stableId),
		),
		requiredWalkableStableIds: products.flatMap((product) =>
			product.chunks.map((chunk) => chunk.stableId),
		),
	};
}

export function parseStaticEnvironmentCollisionProduct(
	data: unknown,
): StaticEnvironmentCollisionProduct {
	if (!isRecord(data)) {
		throw new Error("Static environment collision product must be an object.");
	}

	if (data.schemaVersion !== 1) {
		throw new Error(
			"Static environment collision product schemaVersion must be 1.",
		);
	}

	if (data.generator !== "staticEnvironmentCollisionCook.v1") {
		throw new Error(
			"Static environment collision product generator must be staticEnvironmentCollisionCook.v1.",
		);
	}

	for (const key of ["id", "levelId", "runtimeSceneId", "generatedAt"]) {
		if (typeof data[key] !== "string" || data[key].length === 0) {
			throw new Error(`Static environment collision product requires ${key}.`);
		}
	}

	if (!isRecord(data.source)) {
		throw new Error("Static environment collision product requires source.");
	}

	if (!isRecord(data.settings)) {
		throw new Error("Static environment collision product requires settings.");
	}

	if (!isRecord(data.summary)) {
		throw new Error("Static environment collision product requires summary.");
	}

	if (!Array.isArray(data.chunks) || data.chunks.length === 0) {
		throw new Error("Static environment collision product requires chunks.");
	}

	for (const [index, chunk] of data.chunks.entries()) {
		validateChunk(chunk, `chunks.${index}`);
	}

	return data as unknown as StaticEnvironmentCollisionProduct;
}

const staticEnvironmentCollisionChunkPrefab = {
	id: staticEnvironmentCollisionChunkPrefabId,
	tags: ["world", "collision", "static-environment", "generated"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
	},
} satisfies PrefabData;

function validateChunk(data: unknown, path: string): void {
	if (!isRecord(data)) {
		throw new Error(`Static environment collision ${path} must be an object.`);
	}

	if (typeof data.id !== "string" || data.id.length === 0) {
		throw new Error(`Static environment collision ${path}.id is required.`);
	}

	if (typeof data.stableId !== "string" || data.stableId.length === 0) {
		throw new Error(
			`Static environment collision ${path}.stableId is required.`,
		);
	}

	if (!isRecord(data.collider) || !isRecord(data.collider.shape)) {
		throw new Error(
			`Static environment collision ${path}.collider is required.`,
		);
	}

	if (data.collider.intent !== "walkable") {
		throw new Error(
			`Static environment collision ${path}.collider.intent must be walkable.`,
		);
	}

	if (data.collider.channel !== "worldStatic") {
		throw new Error(
			`Static environment collision ${path}.collider.channel must be worldStatic.`,
		);
	}

	if (data.collider.shape.type !== "mesh") {
		throw new Error(
			`Static environment collision ${path}.collider.shape.type must be mesh.`,
		);
	}

	if (
		!Array.isArray(data.collider.shape.vertices) ||
		data.collider.shape.vertices.length < 3
	) {
		throw new Error(
			`Static environment collision ${path}.collider.shape.vertices must contain at least 3 vertices.`,
		);
	}

	if (
		!Array.isArray(data.collider.shape.indices) ||
		data.collider.shape.indices.length < 3 ||
		data.collider.shape.indices.length % 3 !== 0
	) {
		throw new Error(
			`Static environment collision ${path}.collider.shape.indices must be triangle indices.`,
		);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
