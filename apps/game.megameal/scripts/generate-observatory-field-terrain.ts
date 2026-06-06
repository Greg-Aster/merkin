import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	BufferAttribute,
	BufferGeometry,
	Color,
	DoubleSide,
	Mesh,
	MeshStandardMaterial,
	Scene,
} from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { observatoryCollisionCookDraft } from "../src/game/editor/collisionDrafts/observatoryCollisionDraft.js";

type Vec3 = readonly [number, number, number];

const outputGlbPath =
	"public/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.glb";
const outputMetadataPath =
	"public/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.json";
const outputAssetUrl =
	"/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.glb";
const visualGridSubdivision = 4;
const microDisplacementAmplitude = 0.055;
const generatedAt = "2026-06-06T00:00:00.000Z";

installNodeFileReader();

const sourceMesh = readWalkableMeshFromCollisionDraft();
const sourceGridSize = Math.sqrt(sourceMesh.vertices.length);

if (!Number.isInteger(sourceGridSize)) {
	throw new Error(
		`Observatory walkable mesh vertex count ${sourceMesh.vertices.length} is not a square grid.`,
	);
}

const sourceHalfExtent = Math.max(
	...sourceMesh.vertices.flatMap(([x, _y, z]) => [Math.abs(x), Math.abs(z)]),
);
const sourceCellSize = (sourceHalfExtent * 2) / (sourceGridSize - 1);
const visualGridSize = (sourceGridSize - 1) * visualGridSubdivision + 1;
const visualCellSize = (sourceHalfExtent * 2) / (visualGridSize - 1);
const terrainGeometryData = createVisualTerrainGeometryData();
const scene = createVisualTerrainScene(terrainGeometryData);
const glb = Buffer.from(new Uint8Array(await exportBinaryGlb(scene)));
const glbSha256 = createHash("sha256").update(glb).digest("hex");
const metadata = buildMetadata(glbSha256, terrainGeometryData);

await mkdir(path.dirname(outputGlbPath), { recursive: true });
await writeFile(outputGlbPath, glb);
await writeFile(
	outputMetadataPath,
	`${JSON.stringify(metadata, null, "\t")}\n`,
);

console.log(`Generated ${outputGlbPath}`);
console.log(`Generated ${outputMetadataPath}`);

function installNodeFileReader(): void {
	type FileReaderShim = {
		result: ArrayBuffer | null;
		onloadend: (() => void) | null;
		onerror: ((error: unknown) => void) | null;
		readAsArrayBuffer(blob: Blob): void;
	};
	type GlobalFileReaderTarget = {
		FileReader?: unknown;
	};

	const target = globalThis as unknown as GlobalFileReaderTarget;

	if (target.FileReader !== undefined) {
		return;
	}

	class NodeFileReader implements FileReaderShim {
		result: ArrayBuffer | null = null;
		onloadend: (() => void) | null = null;
		onerror: ((error: unknown) => void) | null = null;

		readAsArrayBuffer(blob: Blob): void {
			blob
				.arrayBuffer()
				.then((buffer) => {
					setTimeout(() => {
						this.result = buffer;
						this.onloadend?.();
					}, 0);
				})
				.catch((error: unknown) => {
					setTimeout(() => {
						this.onerror?.(error);
					}, 0);
				});
		}
	}

	Object.defineProperty(globalThis, "FileReader", {
		configurable: true,
		writable: true,
		value: NodeFileReader,
	});
}

function readWalkableMeshFromCollisionDraft(): {
	readonly vertices: readonly Vec3[];
	readonly indices: readonly number[];
} {
	const entry = observatoryCollisionCookDraft.entries.find(
		(candidate) => candidate.stableId === "observatory:walkable-mesh",
	);

	if (!entry || entry.collider.shape.type !== "mesh") {
		throw new Error(
			'Expected Observatory collision draft to include mesh collider "observatory:walkable-mesh".',
		);
	}

	return {
		vertices: entry.collider.shape.vertices,
		indices: entry.collider.shape.indices,
	};
}

function createVisualTerrainGeometryData(): {
	readonly positions: readonly number[];
	readonly colors: readonly number[];
	readonly uvs: readonly number[];
	readonly indices: readonly number[];
	readonly minHeight: number;
	readonly maxHeight: number;
} {
	const positions: number[] = [];
	const colors: number[] = [];
	const uvs: number[] = [];
	const indices: number[] = [];
	let minHeight = Number.POSITIVE_INFINITY;
	let maxHeight = Number.NEGATIVE_INFINITY;
	const wetPeat = new Color("#0f1713");
	const moonGrass = new Color("#1f3325");
	const moss = new Color("#33462d");
	const heather = new Color("#2a2438");

	for (let zIndex = 0; zIndex < visualGridSize; zIndex += 1) {
		const z = visualCoordinate(zIndex);
		const zRatio = zIndex / (visualGridSize - 1);

		for (let xIndex = 0; xIndex < visualGridSize; xIndex += 1) {
			const x = visualCoordinate(xIndex);
			const xRatio = xIndex / (visualGridSize - 1);
			const baseHeight = sampleCollisionHeight(x, z);
			const microHeight = visualMicroDisplacementAt(x, z);
			const height = round(baseHeight + microHeight);
			const moisture = normalizedWave(x * 0.014 + z * 0.01);
			const tuft = normalizedWave(x * 0.24 - z * 0.19);
			const heatherPatch = normalizedWave(x * 0.025 + z * 0.031 + 1.2);
			const color = wetPeat
				.clone()
				.lerp(moonGrass, 0.5 + moisture * 0.24)
				.lerp(moss, tuft * 0.18)
				.lerp(heather, Math.max(0, heatherPatch - 0.68) * 0.34);

			minHeight = Math.min(minHeight, height);
			maxHeight = Math.max(maxHeight, height);
			positions.push(round(x), height, round(z));
			colors.push(color.r, color.g, color.b);
			uvs.push(xRatio, zRatio);
		}
	}

	for (let zIndex = 0; zIndex < visualGridSize - 1; zIndex += 1) {
		for (let xIndex = 0; xIndex < visualGridSize - 1; xIndex += 1) {
			const topLeft = zIndex * visualGridSize + xIndex;
			const bottomLeft = topLeft + visualGridSize;

			indices.push(
				topLeft,
				bottomLeft,
				topLeft + 1,
				topLeft + 1,
				bottomLeft,
				bottomLeft + 1,
			);
		}
	}

	return {
		positions,
		colors,
		uvs,
		indices,
		minHeight: round(minHeight),
		maxHeight: round(maxHeight),
	};
}

function createVisualTerrainScene(geometryData: {
	readonly positions: readonly number[];
	readonly colors: readonly number[];
	readonly uvs: readonly number[];
	readonly indices: readonly number[];
}): Scene {
	const geometry = new BufferGeometry();

	geometry.setAttribute(
		"position",
		new BufferAttribute(new Float32Array(geometryData.positions), 3),
	);
	geometry.setAttribute(
		"color",
		new BufferAttribute(new Float32Array(geometryData.colors), 3),
	);
	geometry.setAttribute(
		"uv",
		new BufferAttribute(new Float32Array(geometryData.uvs), 2),
	);
	geometry.setIndex([...geometryData.indices]);
	geometry.computeVertexNormals();
	geometry.computeBoundingBox();
	geometry.computeBoundingSphere();

	const material = new MeshStandardMaterial({
		name: "Observatory Night Field",
		color: "#1f3325",
		roughness: 0.98,
		metalness: 0,
		vertexColors: true,
		side: DoubleSide,
	});
	const mesh = new Mesh(geometry, material);
	const scene = new Scene();

	mesh.name = "observatory-field-micro-displacement";
	mesh.receiveShadow = true;
	scene.name = "Observatory Field Micro Displacement";
	scene.add(mesh);

	return scene;
}

function buildMetadata(
	glbSha256: string,
	geometryData: {
		readonly minHeight: number;
		readonly maxHeight: number;
	},
) {
	const anchorSamples = [
		[-320, -320],
		[-120, -40],
		[0, 0],
		[120, 120],
		[320, 320],
	] as const;
	const collisionAnchorSamples = anchorSamples.map(([x, z]) => {
		const collisionHeight = sampleCollisionHeight(x, z);
		const visualHeight = round(
			collisionHeight + visualMicroDisplacementAt(x, z),
		);

		return {
			x,
			z,
			collisionHeight,
			visualHeight,
			error: round(Math.abs(visualHeight - collisionHeight)),
		};
	});
	const maxCollisionSampleError = Math.max(
		...sourceMesh.vertices.map(([x, y, z]) =>
			round(Math.abs(sampleCollisionHeight(x, z) - y)),
		),
	);

	return {
		schemaVersion: 1,
		id: "observatory_visual_terrain_generated_v1",
		generatedAt,
		owner: "Observatory visual terrain generation",
		source: {
			runtimeSceneId: "observatory_runtime",
			collisionDraftId: observatoryCollisionCookDraft.id,
			collisionStableId: "observatory:walkable-mesh",
			collisionPrefabId: "observatory_walkable_mesh",
			sourceVisualAssetId: "mesh_observatory_environment",
			sourceVisualAssetUrl:
				"/assets/game/observatory/observatory-environment.glb",
			sourceVisualStableId: "observatory:terrain",
			sourceVisualScale: [1, 1, 1],
		},
		output: {
			meshAssetId: "mesh_observatory_field_micro_displacement",
			prefabId: "observatory_field_visual_terrain",
			stableId: "observatory:terrain:visual-field",
			glbUrl: outputAssetUrl,
			glbPath: outputGlbPath,
			metadataPath: outputMetadataPath,
			glbSha256,
			scale: [1, 1, 1],
		},
		alignment: {
			renderUsesCollisionAsImplicitCollision: false,
			sourceGlbScale: [1, 1, 1],
			visualTerrainScale: [1, 1, 1],
			collisionGridSize: sourceGridSize,
			collisionHalfExtent: sourceHalfExtent,
			collisionCellSize: sourceCellSize,
			collisionVertexCount: sourceMesh.vertices.length,
			collisionTriangleCount: sourceMesh.indices.length / 3,
			visualGridSize,
			visualHalfExtent: sourceHalfExtent,
			visualCellSize,
			visualVertexCount: visualGridSize * visualGridSize,
			visualTriangleCount: (visualGridSize - 1) * (visualGridSize - 1) * 2,
			microDisplacementAmplitude,
			maxCollisionSampleError,
			collisionAnchorSamples,
			heightRange: {
				min: geometryData.minHeight,
				max: geometryData.maxHeight,
			},
		},
	};
}

function visualCoordinate(index: number): number {
	return round(-sourceHalfExtent + index * visualCellSize);
}

function sampleCollisionHeight(x: number, z: number): number {
	const sourceX = clamp(
		(x + sourceHalfExtent) / sourceCellSize,
		0,
		sourceGridSize - 1,
	);
	const sourceZ = clamp(
		(z + sourceHalfExtent) / sourceCellSize,
		0,
		sourceGridSize - 1,
	);
	const x0 = Math.min(Math.floor(sourceX), sourceGridSize - 2);
	const z0 = Math.min(Math.floor(sourceZ), sourceGridSize - 2);
	const x1 = x0 + 1;
	const z1 = z0 + 1;
	const tx = sourceX - x0;
	const tz = sourceZ - z0;
	const h00 = sourceHeightAt(x0, z0);
	const h10 = sourceHeightAt(x1, z0);
	const h01 = sourceHeightAt(x0, z1);
	const h11 = sourceHeightAt(x1, z1);
	const top = lerp(h00, h10, tx);
	const bottom = lerp(h01, h11, tx);

	return round(lerp(top, bottom, tz));
}

function sourceHeightAt(xIndex: number, zIndex: number): number {
	return sourceMesh.vertices[zIndex * sourceGridSize + xIndex]?.[1] ?? 0;
}

function visualMicroDisplacementAt(x: number, z: number): number {
	const localX = positiveModulo((x + sourceHalfExtent) / sourceCellSize, 1);
	const localZ = positiveModulo((z + sourceHalfExtent) / sourceCellSize, 1);
	const collisionAnchorEnvelope =
		Math.sin(Math.PI * localX) * Math.sin(Math.PI * localZ);
	const hummock =
		Math.sin(x * 0.071 + z * 0.047) * 0.62 +
		Math.sin(x * -0.113 + z * 0.089 + 1.9) * 0.28 +
		Math.sin(x * 0.33 - z * 0.29 + 0.6) * 0.1;

	return round(collisionAnchorEnvelope * hummock * microDisplacementAmplitude);
}

function normalizedWave(value: number): number {
	return (Math.sin(value) + Math.sin(value * 1.91 + 0.37) * 0.5 + 1.5) / 3;
}

function positiveModulo(value: number, divisor: number): number {
	return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function round(value: number): number {
	return Number(value.toFixed(6));
}

async function exportBinaryGlb(object: Scene): Promise<ArrayBuffer> {
	const exporter = new GLTFExporter();

	return new Promise((resolve, reject) => {
		exporter.parse(
			object,
			(result) => {
				if (result instanceof ArrayBuffer) {
					resolve(result);
					return;
				}

				reject(
					new Error("Expected GLTFExporter to produce binary GLB output."),
				);
			},
			reject,
			{
				binary: true,
				onlyVisible: true,
				trs: false,
			},
		);
	});
}
