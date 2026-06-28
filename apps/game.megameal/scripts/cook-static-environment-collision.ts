import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { staticEnvironmentCollisionProfiles } from "../src/levels/global/collisionSettings.js";

type Vec3 = readonly [number, number, number];
type Mat4 = readonly number[];
type StaticEnvironmentCollisionProfile =
	keyof typeof staticEnvironmentCollisionProfiles;

type SourceConfig = {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly levelId: string;
	readonly runtimeSceneId: string;
	readonly visualAssetId: string;
	readonly visualAssetUrl: string;
	readonly collisionAssetUrl?: string;
	readonly mode: "automatic-glb" | "manual-collision-glb";
	readonly settings: {
		readonly profile: StaticEnvironmentCollisionProfile;
		readonly chunkSizeMeters: number;
		readonly sampleSpacingMeters: number;
		readonly walkableSlopeDegrees: number;
		readonly maxTrianglesPerChunk: number;
		readonly maxTotalTriangles: number;
	};
};

type Triangle = {
	readonly a: Vec3;
	readonly b: Vec3;
	readonly c: Vec3;
	readonly normalY: number;
	readonly minX: number;
	readonly maxX: number;
	readonly minZ: number;
	readonly maxZ: number;
};

type Sample = {
	readonly x: number;
	readonly y: number;
	readonly z: number;
};

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const levelId = cliValue("--level") ?? "observatory";
const check = process.argv.includes("--check");
const sourceConfigPath = resolve(
	appRoot,
	"src",
	"levels",
	levelId,
	"collision",
	"source.json",
);
const outputPath = resolve(
	appRoot,
	"src",
	"levels",
	levelId,
	"collision",
	"generated.json",
);

if (!existsSync(sourceConfigPath)) {
	throw new Error(
		`Missing static environment collision source ${sourceConfigPath}.`,
	);
}

const sourceConfig = parseSourceConfig(
	JSON.parse(readFileSync(sourceConfigPath, "utf8")),
);
const sourceAssetUrl =
	sourceConfig.mode === "manual-collision-glb" && sourceConfig.collisionAssetUrl
		? sourceConfig.collisionAssetUrl
		: sourceConfig.visualAssetUrl;
const sourceAssetPath = resolvePublicAsset(sourceAssetUrl);
const sourceHash = sha256(readFileSync(sourceAssetPath));
const sourceStat = await stat(sourceAssetPath);
const source = parseGlb(readFileSync(sourceAssetPath));
const walkableTriangles = source.triangles.filter(
	(triangle) =>
		Math.abs(triangle.normalY) >=
		Math.cos((sourceConfig.settings.walkableSlopeDegrees * Math.PI) / 180),
);

if (walkableTriangles.length === 0) {
	throw new Error(
		`Static environment collision cook found no walkable triangles in ${sourceAssetUrl}.`,
	);
}

const sampled = sampleWalkableSurface(
	walkableTriangles,
	sourceConfig.settings.sampleSpacingMeters,
);
const chunks = buildChunks({
	samples: sampled.samples,
	xCount: sampled.xCount,
	zCount: sampled.zCount,
	minX: sampled.minX,
	minZ: sampled.minZ,
	spacing: sourceConfig.settings.sampleSpacingMeters,
	chunkSizeMeters: sourceConfig.settings.chunkSizeMeters,
	productId: sourceConfig.id,
	maxTrianglesPerChunk: sourceConfig.settings.maxTrianglesPerChunk,
});
const triangleCount = chunks.reduce(
	(total, chunk) => total + chunk.collider.shape.indices.length / 3,
	0,
);

if (triangleCount === 0) {
	throw new Error("Static environment collision cook emitted no triangles.");
}

if (triangleCount > sourceConfig.settings.maxTotalTriangles) {
	throw new Error(
		`Static environment collision cook emitted ${triangleCount} triangles, above maxTotalTriangles ${sourceConfig.settings.maxTotalTriangles}.`,
	);
}

const product = sortValue({
	schemaVersion: 1,
	id: sourceConfig.id,
	levelId: sourceConfig.levelId,
	runtimeSceneId: sourceConfig.runtimeSceneId,
	generatedAt: new Date(sourceStat.mtimeMs).toISOString(),
	generator: "staticEnvironmentCollisionCook.v1",
	source: {
		kind: sourceConfig.mode,
		visualAssetId: sourceConfig.visualAssetId,
		visualAssetUrl: sourceConfig.visualAssetUrl,
		...(sourceConfig.collisionAssetUrl
			? { collisionAssetUrl: sourceConfig.collisionAssetUrl }
			: {}),
		sourceHash: `sha256:${sourceHash}`,
	},
	settings: sourceConfig.settings,
	summary: {
		bounds: boundsForChunks(chunks),
		chunkCount: chunks.length,
		sourceBounds: boundsForTriangles(source.triangles),
		walkableBounds: boundsForTriangles(walkableTriangles),
		vertexCount: chunks.reduce(
			(total, chunk) => total + chunk.collider.shape.vertices.length,
			0,
		),
		triangleCount,
		sourceTriangleCount: source.triangles.length,
		walkableTriangleCount: walkableTriangles.length,
		sampledPointCount: sampled.sampledPointCount,
		metersPerSample: sourceConfig.settings.sampleSpacingMeters,
	},
	chunks,
});
const serialized = formatGeneratedJson(
	`${JSON.stringify(product, null, "\t")}\n`,
	outputPath,
);
const current = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "";

if (check) {
	if (current !== serialized) {
		throw new Error(
			`Static environment collision product is stale for ${levelId}. Run pnpm --dir apps/game.megameal cook:static-environment-collision -- --level=${levelId}.`,
		);
	}
	console.log(
		`Static environment collision product is current for ${levelId}.`,
	);
} else {
	writeFileSync(outputPath, serialized);
	console.log(
		`Wrote ${relativeAppPath(outputPath)} with ${chunks.length} chunks and ${triangleCount} triangles from ${source.triangles.length} source triangles.`,
	);
}

function parseSourceConfig(value: unknown): SourceConfig {
	if (!isRecord(value) || value.schemaVersion !== 1) {
		throw new Error(
			"Static environment collision source must be schemaVersion 1.",
		);
	}

	if (
		typeof value.id !== "string" ||
		typeof value.levelId !== "string" ||
		typeof value.runtimeSceneId !== "string" ||
		typeof value.visualAssetId !== "string" ||
		typeof value.visualAssetUrl !== "string" ||
		(value.mode !== "automatic-glb" && value.mode !== "manual-collision-glb") ||
		!isRecord(value.settings)
	) {
		throw new Error("Static environment collision source is incomplete.");
	}

	if (
		value.mode === "manual-collision-glb" &&
		typeof value.collisionAssetUrl !== "string"
	) {
		throw new Error("manual-collision-glb mode requires collisionAssetUrl.");
	}

	validateSourceSettings(value.settings);

	return value as unknown as SourceConfig;
}

function validateSourceSettings(settings: Record<string, unknown>): void {
	if (
		typeof settings.profile !== "string" ||
		!(settings.profile in staticEnvironmentCollisionProfiles)
	) {
		throw new Error(
			"Static environment collision source uses an unknown profile.",
		);
	}

	requirePositiveNumber(settings.chunkSizeMeters, "chunkSizeMeters");
	requirePositiveNumber(settings.sampleSpacingMeters, "sampleSpacingMeters");
	const walkableSlopeDegrees = requirePositiveNumber(
		settings.walkableSlopeDegrees,
		"walkableSlopeDegrees",
	);
	if (walkableSlopeDegrees >= 90) {
		throw new Error("walkableSlopeDegrees must be less than 90.");
	}
	requirePositiveInteger(settings.maxTrianglesPerChunk, "maxTrianglesPerChunk");
	requirePositiveInteger(settings.maxTotalTriangles, "maxTotalTriangles");
}

function requirePositiveInteger(value: unknown, label: string): number {
	const numberValue = requirePositiveNumber(value, label);
	if (!Number.isInteger(numberValue)) {
		throw new Error(
			`Static environment collision ${label} must be an integer.`,
		);
	}
	return numberValue;
}

function requirePositiveNumber(value: unknown, label: string): number {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		throw new Error(
			`Static environment collision ${label} must be a positive number.`,
		);
	}
	return value;
}

function parseGlb(buffer: Buffer): { readonly triangles: readonly Triangle[] } {
	if (buffer.readUInt32LE(0) !== 0x46546c67) {
		throw new Error("Expected GLB magic.");
	}

	const jsonLength = buffer.readUInt32LE(12);
	const jsonType = buffer.readUInt32LE(16);
	if (jsonType !== 0x4e4f534a) {
		throw new Error("Expected first GLB chunk to be JSON.");
	}

	const gltf = JSON.parse(
		buffer.subarray(20, 20 + jsonLength).toString("utf8"),
	);
	let offset = 20 + jsonLength;
	let binaryChunk: Buffer | undefined;

	while (offset < buffer.length) {
		const chunkLength = buffer.readUInt32LE(offset);
		const chunkType = buffer.readUInt32LE(offset + 4);
		const chunk = buffer.subarray(offset + 8, offset + 8 + chunkLength);
		if (chunkType === 0x004e4942) {
			binaryChunk = chunk;
			break;
		}
		offset += 8 + chunkLength;
	}

	if (!binaryChunk) {
		throw new Error("GLB has no binary chunk.");
	}

	const sceneIndex = typeof gltf.scene === "number" ? gltf.scene : 0;
	const scene = gltf.scenes?.[sceneIndex];
	const triangles: Triangle[] = [];

	for (const nodeIndex of scene?.nodes ?? []) {
		collectNodeTriangles(gltf, binaryChunk, nodeIndex, identity(), triangles);
	}

	return { triangles };
}

function collectNodeTriangles(
	gltf: Record<string, unknown>,
	binaryChunk: Buffer,
	nodeIndex: number,
	parentMatrix: Mat4,
	triangles: Triangle[],
): void {
	const nodes = gltf.nodes as readonly Record<string, unknown>[] | undefined;
	const meshes = gltf.meshes as readonly Record<string, unknown>[] | undefined;
	const node = nodes?.[nodeIndex];

	if (!node) {
		return;
	}

	const matrix = multiply(parentMatrix, nodeMatrix(node));
	const meshIndex = typeof node.mesh === "number" ? node.mesh : undefined;

	if (meshIndex !== undefined) {
		const mesh = meshes?.[meshIndex];
		const primitives = Array.isArray(mesh?.primitives) ? mesh.primitives : [];

		for (const primitive of primitives) {
			if (!isRecord(primitive) || (primitive.mode ?? 4) !== 4) {
				continue;
			}

			const attributes = isRecord(primitive.attributes)
				? primitive.attributes
				: {};
			const positionAccessor =
				typeof attributes.POSITION === "number"
					? attributes.POSITION
					: undefined;

			if (positionAccessor === undefined) {
				continue;
			}

			const vertices = readVec3Accessor(
				gltf,
				binaryChunk,
				positionAccessor,
			).map((vertex) => transformPoint(matrix, vertex));
			const indices =
				typeof primitive.indices === "number"
					? readIndexAccessor(gltf, binaryChunk, primitive.indices)
					: vertices.map((_, index) => index);

			for (let index = 0; index + 2 < indices.length; index += 3) {
				const aIndex = indices[index];
				const bIndex = indices[index + 1];
				const cIndex = indices[index + 2];

				if (
					aIndex === undefined ||
					bIndex === undefined ||
					cIndex === undefined
				) {
					continue;
				}

				const a = vertices[aIndex];
				const b = vertices[bIndex];
				const c = vertices[cIndex];

				if (!a || !b || !c) {
					continue;
				}

				const triangle = triangleFromVertices(a, b, c);
				if (triangle) {
					triangles.push(triangle);
				}
			}
		}
	}

	for (const childIndex of Array.isArray(node.children) ? node.children : []) {
		if (typeof childIndex === "number") {
			collectNodeTriangles(gltf, binaryChunk, childIndex, matrix, triangles);
		}
	}
}

function readVec3Accessor(
	gltf: Record<string, unknown>,
	binaryChunk: Buffer,
	accessorIndex: number,
): Vec3[] {
	const { accessor, bufferView, offset, stride } = accessorInfo(
		gltf,
		accessorIndex,
	);

	if (accessor.componentType !== 5126 || accessor.type !== "VEC3") {
		throw new Error("Only FLOAT VEC3 POSITION accessors are supported.");
	}

	const values: Vec3[] = [];
	for (let index = 0; index < accessor.count; index += 1) {
		const byteOffset = offset + index * stride;
		values.push([
			round(binaryChunk.readFloatLE(byteOffset)),
			round(binaryChunk.readFloatLE(byteOffset + 4)),
			round(binaryChunk.readFloatLE(byteOffset + 8)),
		]);
	}

	void bufferView;
	return values;
}

function readIndexAccessor(
	gltf: Record<string, unknown>,
	binaryChunk: Buffer,
	accessorIndex: number,
): number[] {
	const { accessor, offset, stride } = accessorInfo(gltf, accessorIndex);
	const values: number[] = [];

	for (let index = 0; index < accessor.count; index += 1) {
		const byteOffset = offset + index * stride;
		if (accessor.componentType === 5125) {
			values.push(binaryChunk.readUInt32LE(byteOffset));
		} else if (accessor.componentType === 5123) {
			values.push(binaryChunk.readUInt16LE(byteOffset));
		} else if (accessor.componentType === 5121) {
			values.push(binaryChunk.readUInt8(byteOffset));
		} else {
			throw new Error(
				`Unsupported index component type ${String(accessor.componentType)}.`,
			);
		}
	}

	return values;
}

function accessorInfo(gltf: Record<string, unknown>, accessorIndex: number) {
	const accessors = gltf.accessors as
		| readonly Record<string, unknown>[]
		| undefined;
	const bufferViews = gltf.bufferViews as
		| readonly Record<string, unknown>[]
		| undefined;
	const accessor = accessors?.[accessorIndex];

	if (!accessor || typeof accessor.bufferView !== "number") {
		throw new Error(`Missing accessor ${accessorIndex}.`);
	}

	const bufferView = bufferViews?.[accessor.bufferView];
	if (!bufferView) {
		throw new Error(`Missing buffer view ${accessor.bufferView}.`);
	}

	const componentSize = componentSizeBytes(accessor.componentType);
	const componentCount = accessor.type === "VEC3" ? 3 : 1;
	const stride =
		typeof bufferView.byteStride === "number"
			? bufferView.byteStride
			: componentSize * componentCount;
	const offset =
		(typeof bufferView.byteOffset === "number" ? bufferView.byteOffset : 0) +
		(typeof accessor.byteOffset === "number" ? accessor.byteOffset : 0);

	if (typeof accessor.count !== "number") {
		throw new Error(`Accessor ${accessorIndex} has no count.`);
	}

	return {
		accessor: accessor as {
			readonly componentType: number;
			readonly count: number;
			readonly type: string;
		},
		bufferView,
		offset,
		stride,
	};
}

function sampleWalkableSurface(
	triangles: readonly Triangle[],
	spacing: number,
): {
	readonly samples: readonly (Sample | null)[];
	readonly xCount: number;
	readonly zCount: number;
	readonly minX: number;
	readonly minZ: number;
	readonly sampledPointCount: number;
} {
	const bounds = boundsForTriangles(triangles);
	const minX = Math.floor(bounds.min[0] / spacing) * spacing;
	const maxX = Math.ceil(bounds.max[0] / spacing) * spacing;
	const minZ = Math.floor(bounds.min[2] / spacing) * spacing;
	const maxZ = Math.ceil(bounds.max[2] / spacing) * spacing;
	const xCount = Math.floor((maxX - minX) / spacing) + 1;
	const zCount = Math.floor((maxZ - minZ) / spacing) + 1;
	const triangleGrid = new Map<string, number[]>();

	for (const [triangleIndex, triangle] of triangles.entries()) {
		const startX = clampIndex(
			Math.floor((triangle.minX - minX) / spacing),
			xCount,
		);
		const endX = clampIndex(
			Math.ceil((triangle.maxX - minX) / spacing),
			xCount,
		);
		const startZ = clampIndex(
			Math.floor((triangle.minZ - minZ) / spacing),
			zCount,
		);
		const endZ = clampIndex(
			Math.ceil((triangle.maxZ - minZ) / spacing),
			zCount,
		);

		for (let z = startZ; z <= endZ; z += 1) {
			for (let x = startX; x <= endX; x += 1) {
				const key = `${x}:${z}`;
				const bucket = triangleGrid.get(key) ?? [];
				bucket.push(triangleIndex);
				triangleGrid.set(key, bucket);
			}
		}
	}

	const samples: (Sample | null)[] = [];
	let sampledPointCount = 0;

	for (let zIndex = 0; zIndex < zCount; zIndex += 1) {
		const z = minZ + zIndex * spacing;
		for (let xIndex = 0; xIndex < xCount; xIndex += 1) {
			const x = minX + xIndex * spacing;
			const candidateIndices = triangleGrid.get(`${xIndex}:${zIndex}`) ?? [];
			let height: number | undefined;

			for (const triangleIndex of candidateIndices) {
				const triangle = triangles[triangleIndex];
				if (!triangle) {
					continue;
				}
				const candidate = heightAt(triangle, x, z);
				if (
					candidate !== undefined &&
					(height === undefined || candidate > height)
				) {
					height = candidate;
				}
			}

			if (height === undefined) {
				samples.push(null);
			} else {
				samples.push({ x: round(x), y: round(height), z: round(z) });
				sampledPointCount += 1;
			}
		}
	}

	return { samples, xCount, zCount, minX, minZ, sampledPointCount };
}

function buildChunks(options: {
	readonly samples: readonly (Sample | null)[];
	readonly xCount: number;
	readonly zCount: number;
	readonly minX: number;
	readonly minZ: number;
	readonly spacing: number;
	readonly chunkSizeMeters: number;
	readonly productId: string;
	readonly maxTrianglesPerChunk: number;
}) {
	const chunks = new Map<
		string,
		{
			readonly chunkKey: readonly [number, number];
			readonly vertices: Sample[];
			readonly vertexKeys: Map<string, number>;
			readonly indices: number[];
		}
	>();

	for (let zIndex = 0; zIndex < options.zCount - 1; zIndex += 1) {
		for (let xIndex = 0; xIndex < options.xCount - 1; xIndex += 1) {
			const corners = [
				sampleAt(options.samples, options.xCount, xIndex, zIndex),
				sampleAt(options.samples, options.xCount, xIndex + 1, zIndex),
				sampleAt(options.samples, options.xCount, xIndex, zIndex + 1),
				sampleAt(options.samples, options.xCount, xIndex + 1, zIndex + 1),
			] as const;

			if (corners.some((corner) => corner === null)) {
				continue;
			}

			const [cornerA, cornerB, cornerC, cornerD] = corners;

			if (!cornerA || !cornerB || !cornerC || !cornerD) {
				continue;
			}

			const centerX = (cornerA.x + cornerD.x) / 2;
			const centerZ = (cornerA.z + cornerD.z) / 2;
			const chunkX = Math.floor(
				(centerX - options.minX) / options.chunkSizeMeters,
			);
			const chunkZ = Math.floor(
				(centerZ - options.minZ) / options.chunkSizeMeters,
			);
			const key = `${chunkX}:${chunkZ}`;
			const chunk = chunks.get(key) ?? {
				chunkKey: [chunkX, chunkZ] as const,
				vertices: [],
				vertexKeys: new Map<string, number>(),
				indices: [],
			};
			const a = addChunkVertex(chunk, xIndex, zIndex, cornerA);
			const b = addChunkVertex(chunk, xIndex + 1, zIndex, cornerB);
			const c = addChunkVertex(chunk, xIndex, zIndex + 1, cornerC);
			const d = addChunkVertex(chunk, xIndex + 1, zIndex + 1, cornerD);

			chunk.indices.push(a, c, b, b, c, d);
			chunks.set(key, chunk);
		}
	}

	return [...chunks.values()]
		.sort(
			(left, right) =>
				left.chunkKey[1] - right.chunkKey[1] ||
				left.chunkKey[0] - right.chunkKey[0],
		)
		.map((chunk) => {
			const triangleCount = chunk.indices.length / 3;

			if (triangleCount > options.maxTrianglesPerChunk) {
				throw new Error(
					`Static environment collision chunk x${chunk.chunkKey[0]}-z${chunk.chunkKey[1]} has ${triangleCount} triangles, above maxTrianglesPerChunk ${options.maxTrianglesPerChunk}.`,
				);
			}

			const chunkId = `x${chunk.chunkKey[0]}-z${chunk.chunkKey[1]}`;
			const stableId = `static-environment:${options.productId}:chunk:${chunkId}`;
			const vertices = chunk.vertices.map(
				(vertex) => [vertex.x, vertex.y, vertex.z] as const,
			);

			return {
				id: `static-environment-${options.productId}-chunk-${chunkId}`,
				stableId,
				chunkKey: chunk.chunkKey,
				bounds: boundsForVertices(vertices),
				collider: {
					intent: "walkable",
					channel: "worldStatic",
					shape: {
						type: "mesh",
						vertices,
						indices: chunk.indices,
					},
				},
			};
		});
}

function addChunkVertex(
	chunk: {
		readonly vertices: Sample[];
		readonly vertexKeys: Map<string, number>;
	},
	xIndex: number,
	zIndex: number,
	sample: Sample,
): number {
	const key = `${xIndex}:${zIndex}`;
	const existing = chunk.vertexKeys.get(key);

	if (existing !== undefined) {
		return existing;
	}

	const next = chunk.vertices.length;
	chunk.vertices.push(sample);
	chunk.vertexKeys.set(key, next);
	return next;
}

function heightAt(
	triangle: Triangle,
	x: number,
	z: number,
): number | undefined {
	const x1 = triangle.a[0];
	const z1 = triangle.a[2];
	const x2 = triangle.b[0];
	const z2 = triangle.b[2];
	const x3 = triangle.c[0];
	const z3 = triangle.c[2];
	const denominator = (z2 - z3) * (x1 - x3) + (x3 - x2) * (z1 - z3);

	if (Math.abs(denominator) < 1e-8) {
		return undefined;
	}

	const w1 = ((z2 - z3) * (x - x3) + (x3 - x2) * (z - z3)) / denominator;
	const w2 = ((z3 - z1) * (x - x3) + (x1 - x3) * (z - z3)) / denominator;
	const w3 = 1 - w1 - w2;
	const epsilon = 1e-5;

	if (w1 < -epsilon || w2 < -epsilon || w3 < -epsilon) {
		return undefined;
	}

	return w1 * triangle.a[1] + w2 * triangle.b[1] + w3 * triangle.c[1];
}

function triangleFromVertices(a: Vec3, b: Vec3, c: Vec3): Triangle | undefined {
	const ab = subtract(b, a);
	const ac = subtract(c, a);
	const normal = cross(ab, ac);
	const length = Math.hypot(normal[0], normal[1], normal[2]);

	if (length < 1e-8) {
		return undefined;
	}

	return {
		a,
		b,
		c,
		normalY: normal[1] / length,
		minX: Math.min(a[0], b[0], c[0]),
		maxX: Math.max(a[0], b[0], c[0]),
		minZ: Math.min(a[2], b[2], c[2]),
		maxZ: Math.max(a[2], b[2], c[2]),
	};
}

function boundsForTriangles(triangles: readonly Triangle[]) {
	return boundsForVertices(
		triangles.flatMap((triangle) => [triangle.a, triangle.b, triangle.c]),
	);
}

function boundsForChunks(
	chunks: readonly {
		readonly bounds: { readonly min: Vec3; readonly max: Vec3 };
	}[],
) {
	return boundsForVertices(
		chunks.flatMap((chunk) => [chunk.bounds.min, chunk.bounds.max]),
	);
}

function boundsForVertices(vertices: readonly Vec3[]) {
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let minZ = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	let maxZ = Number.NEGATIVE_INFINITY;

	for (const vertex of vertices) {
		minX = Math.min(minX, vertex[0]);
		minY = Math.min(minY, vertex[1]);
		minZ = Math.min(minZ, vertex[2]);
		maxX = Math.max(maxX, vertex[0]);
		maxY = Math.max(maxY, vertex[1]);
		maxZ = Math.max(maxZ, vertex[2]);
	}

	return {
		min: [round(minX), round(minY), round(minZ)] as const,
		max: [round(maxX), round(maxY), round(maxZ)] as const,
	};
}

function nodeMatrix(node: Record<string, unknown>): Mat4 {
	if (Array.isArray(node.matrix) && node.matrix.length === 16) {
		return node.matrix.map(Number);
	}

	const translation = tuple3(node.translation, [0, 0, 0]);
	const rotation = tuple4(node.rotation, [0, 0, 0, 1]);
	const scale = tuple3(node.scale, [1, 1, 1]);
	const [x, y, z, w] = rotation;
	const x2 = x + x;
	const y2 = y + y;
	const z2 = z + z;
	const xx = x * x2;
	const xy = x * y2;
	const xz = x * z2;
	const yy = y * y2;
	const yz = y * z2;
	const zz = z * z2;
	const wx = w * x2;
	const wy = w * y2;
	const wz = w * z2;

	return [
		(1 - (yy + zz)) * scale[0],
		(xy + wz) * scale[0],
		(xz - wy) * scale[0],
		0,
		(xy - wz) * scale[1],
		(1 - (xx + zz)) * scale[1],
		(yz + wx) * scale[1],
		0,
		(xz + wy) * scale[2],
		(yz - wx) * scale[2],
		(1 - (xx + yy)) * scale[2],
		0,
		translation[0],
		translation[1],
		translation[2],
		1,
	];
}

function transformPoint(matrix: Mat4, point: Vec3): Vec3 {
	const x = point[0];
	const y = point[1];
	const z = point[2];
	return [
		round(
			m(matrix, 0) * x + m(matrix, 4) * y + m(matrix, 8) * z + m(matrix, 12),
		),
		round(
			m(matrix, 1) * x + m(matrix, 5) * y + m(matrix, 9) * z + m(matrix, 13),
		),
		round(
			m(matrix, 2) * x + m(matrix, 6) * y + m(matrix, 10) * z + m(matrix, 14),
		),
	];
}

function multiply(left: Mat4, right: Mat4): Mat4 {
	const out = new Array<number>(16).fill(0);

	for (let row = 0; row < 4; row += 1) {
		for (let column = 0; column < 4; column += 1) {
			for (let index = 0; index < 4; index += 1) {
				const outputIndex = column * 4 + row;
				out[outputIndex] =
					(out[outputIndex] ?? 0) +
					m(left, index * 4 + row) * m(right, column * 4 + index);
			}
		}
	}

	return out;
}

function m(matrix: Mat4, index: number): number {
	const value = matrix[index];

	if (value === undefined) {
		throw new Error(`Matrix is missing index ${index}.`);
	}

	return value;
}

function identity(): Mat4 {
	return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function subtract(left: Vec3, right: Vec3): Vec3 {
	return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function cross(left: Vec3, right: Vec3): Vec3 {
	return [
		left[1] * right[2] - left[2] * right[1],
		left[2] * right[0] - left[0] * right[2],
		left[0] * right[1] - left[1] * right[0],
	];
}

function componentSizeBytes(componentType: unknown): number {
	if (componentType === 5126 || componentType === 5125) {
		return 4;
	}
	if (componentType === 5123) {
		return 2;
	}
	if (componentType === 5121) {
		return 1;
	}
	throw new Error(
		`Unsupported accessor component type ${String(componentType)}.`,
	);
}

function sampleAt(
	samples: readonly (Sample | null)[],
	xCount: number,
	x: number,
	z: number,
): Sample | null {
	return samples[z * xCount + x] ?? null;
}

function resolvePublicAsset(url: string): string {
	if (!url.startsWith("/")) {
		throw new Error(`Expected public asset URL to start with "/": ${url}`);
	}
	return resolve(appRoot, "public", url.slice(1));
}

function tuple3(value: unknown, fallback: Vec3): Vec3 {
	return Array.isArray(value)
		? [numberValue(value[0]), numberValue(value[1]), numberValue(value[2])]
		: fallback;
}

function tuple4(
	value: unknown,
	fallback: readonly [number, number, number, number],
) {
	return Array.isArray(value)
		? [
				numberValue(value[0]),
				numberValue(value[1]),
				numberValue(value[2]),
				numberValue(value[3]),
			]
		: fallback;
}

function numberValue(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clampIndex(index: number, count: number): number {
	return Math.max(0, Math.min(count - 1, index));
}

function round(value: number): number {
	return Math.round(value * 1000000) / 1000000;
}

function sha256(buffer: Buffer): string {
	return createHash("sha256").update(buffer).digest("hex");
}

function cliValue(name: string): string | undefined {
	const prefix = `${name}=`;
	return process.argv
		.find((argument) => argument.startsWith(prefix))
		?.slice(prefix.length);
}

function relativeAppPath(path: string): string {
	const normalizedRoot = appRoot.endsWith("/") ? appRoot : `${appRoot}/`;
	return path.replace(normalizedRoot, "");
}

function formatGeneratedJson(source: string, filePath: string): string {
	const biomeBin = resolve(appRoot, "node_modules", ".bin", "biome");

	if (!existsSync(biomeBin)) {
		return source;
	}

	return execFileSync(biomeBin, ["format", "--stdin-file-path", filePath], {
		input: source,
		encoding: "utf8",
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(sortValue);
	}

	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, item]) => [key, sortValue(item)]),
		);
	}

	return value;
}
