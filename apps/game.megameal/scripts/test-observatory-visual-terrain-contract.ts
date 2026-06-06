import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
	type RuntimeSceneManifestData,
	loadRuntimeSceneManifest,
} from "../src/engine/index.js";
import { generatedGlbImportParityManifests } from "../src/game/assets/index.js";
import { observatoryCollisionCookDraft } from "../src/game/editor/collisionDrafts/observatoryCollisionDraft.js";
import {
	defaultRuntimeSceneManifests,
	getRuntimeSceneManifest,
} from "../src/game/levels/index.js";

const metadataPath =
	"public/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.json";
const glbPath =
	"public/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.glb";
const metadataUrl = new URL(`../${metadataPath}`, import.meta.url);
const glbUrl = new URL(`../${glbPath}`, import.meta.url);
const catalogManifest = getRuntimeSceneManifest("observatory_runtime");

if (!catalogManifest) {
	throw new Error(
		'Expected default runtime scene catalog to include "observatory_runtime".',
	);
}

const manifest = loadRuntimeSceneManifest(catalogManifest);
const metadata = assertRecord(
	JSON.parse(await readFile(metadataUrl, "utf8")),
	"Observatory visual terrain metadata",
);
const glb = await readFile(glbUrl);
const fieldAssetId = "mesh_observatory_field_micro_displacement";
const fieldPrefabId = "observatory_field_visual_terrain";
const fieldStableId = "observatory:terrain:visual-field";
const glbAssetUrl =
	"/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.glb";
const fieldAsset = manifest.assets.assets.find(
	(asset) => asset.id === fieldAssetId,
);
const fieldPrefab = prefabForId(manifest, fieldPrefabId);
const fieldRenderable = componentForStableId(
	manifest,
	fieldStableId,
	"Renderable",
);
const fieldTransform = componentForStableId(
	manifest,
	fieldStableId,
	"Transform",
);
const sourceTransform = componentForStableId(
	manifest,
	"observatory:terrain",
	"Transform",
);
const output = assertRecord(metadata.output, "metadata.output");
const source = assertRecord(metadata.source, "metadata.source");
const alignment = assertRecord(metadata.alignment, "metadata.alignment");
const collisionEntries = observatoryCollisionCookDraft.entries.filter(
	(entry) =>
		entry.stableId.startsWith("observatory:walkable-mesh:chunk:") &&
		entry.collider.shape.type === "mesh",
);
const collisionStableIds = collisionEntries
	.map((entry) => entry.stableId)
	.sort();
const collisionVertices = collisionEntries.flatMap((entry) => {
	if (entry.collider.shape.type !== "mesh") {
		return [];
	}

	return entry.collider.shape.vertices;
});

assertIncludes(
	defaultRuntimeSceneManifests.map((runtimeManifest) => runtimeManifest.id),
	"observatory_runtime",
);
if (collisionEntries.length !== 16) {
	throw new Error(
		`Expected Observatory collision draft to own 16 chunked mesh colliders, received ${collisionEntries.length}.`,
	);
}

assertEqual(metadata.schemaVersion, 1);
assertEqual(metadata.id, "observatory_visual_terrain_generated_v1");
assertNonEmptyString(metadata.generatedAt, "metadata.generatedAt");
assertEqual(metadata.owner, "Observatory visual terrain generation");
assertEqual(source.runtimeSceneId, manifest.id);
assertEqual(output.glbPath, glbPath);
assertEqual(output.metadataPath, metadataPath);
assertEqual(fieldAsset?.kind, "mesh");
assertEqual(fieldAsset?.url, glbAssetUrl);
assertIncludes(fieldAsset?.tags ?? [], "terrain");
assertIncludes(fieldAsset?.tags ?? [], "observatory");
assertIncludes(fieldAsset?.tags ?? [], "generated");
assertIncludes(fieldAsset?.tags ?? [], "visual-displacement");
assertIncludes(fieldAsset?.tags ?? [], "collision-aligned");
assertIncludes(manifest.level.preload ?? [], fieldAssetId);
assertIncludes(manifest.assets.preloadGroups?.observatory ?? [], fieldAssetId);
assertIncludes(manifest.readiness.requiredAssetIds ?? [], fieldAssetId);
assertExcludes(
	manifest.readiness.requiredCollisionStableIds ?? [],
	fieldStableId,
	"Generated visual terrain stable ID must not be listed as required collision.",
);
assertExcludes(
	manifest.readiness.requiredWalkableStableIds ?? [],
	fieldStableId,
	"Generated visual terrain stable ID must not be listed as required walkable collision.",
);
assertIncludes(fieldPrefab.assetIds ?? [], fieldAssetId);
assertEqual(fieldRenderable.meshId, fieldAssetId);
assertEqual(fieldRenderable.materialId, undefined);
assertEqual(fieldRenderable.visible, true);
assertDeepEqual(fieldTransform.scale, [1, 1, 1]);
assertEqual(
	componentsForStableId(manifest, fieldStableId).Collider,
	undefined,
	"Generated Observatory visual terrain must not be collision.",
);
assertEqual(
	componentsForStableId(manifest, fieldStableId).RigidBody,
	undefined,
	"Generated Observatory visual terrain must not own a physics body.",
);

assertDeepEqual(sourceTransform.scale, [1, 1, 1]);
assertEqual(source.sourceVisualAssetId, "mesh_observatory_environment");
assertEqual(
	source.sourceVisualAssetUrl,
	"/assets/game/observatory/observatory-environment.glb",
);
assertDeepEqual(source.sourceVisualScale, [1, 1, 1]);
assertEqual(source.collisionDraftId, observatoryCollisionCookDraft.id);
if (source.collisionStableId !== undefined) {
	assertEqual(source.collisionStableId, "observatory:walkable-mesh");
} else {
	assertDeepEqual(source.collisionStableIds, collisionStableIds);
}
assertIncludes(
	manifest.readiness.requiredCollisionPrefabIds ?? [],
	assertString(source.collisionPrefabId, "metadata.source.collisionPrefabId"),
);
assertRuntimeCollisionChunks(
	manifest.readiness.requiredCollisionStableIds ?? [],
	collisionStableIds,
);
assertRuntimeCollisionChunks(
	manifest.readiness.requiredWalkableStableIds ?? [],
	collisionStableIds,
);
assertEqual(output.meshAssetId, fieldAssetId);
assertEqual(output.prefabId, fieldPrefabId);
assertEqual(output.stableId, fieldStableId);
assertEqual(output.glbUrl, glbAssetUrl);
assertDeepEqual(output.scale, [1, 1, 1]);
assertEqual(alignment.renderUsesCollisionAsImplicitCollision, false);
assertDeepEqual(alignment.sourceGlbScale, [1, 1, 1]);
assertDeepEqual(alignment.visualTerrainScale, [1, 1, 1]);
assertEqual(alignment.collisionGridSize, 17);
assertEqual(alignment.visualGridSize, 65);
assertEqual(
	alignment.collisionVertexCount,
	uniqueMeshVertexCount(collisionVertices),
);
assertEqual(
	alignment.collisionTriangleCount,
	collisionEntries.reduce((total, entry) => {
		if (entry.collider.shape.type !== "mesh") {
			return total;
		}

		return total + entry.collider.shape.indices.length / 3;
	}, 0),
);
assertEqual(alignment.visualVertexCount, 4225);
assertEqual(alignment.visualTriangleCount, 8192);
assertEqual(alignment.microDisplacementAmplitude, 0.055);
assertEqual(alignment.maxCollisionSampleError, 0);
assertTerrainChunkMetadataIfPresent(metadata);

const collisionAnchorSamples = assertArray(
	alignment.collisionAnchorSamples,
	"metadata.alignment.collisionAnchorSamples",
);

for (const sample of collisionAnchorSamples) {
	const sampleRecord = assertRecord(
		sample,
		"metadata.alignment.collisionAnchorSamples[]",
	);
	const x = assertNumber(sampleRecord.x, "sample.x");
	const z = assertNumber(sampleRecord.z, "sample.z");
	const collisionHeight = meshVertexHeight(collisionVertices, x, z);

	assertEqual(sampleRecord.collisionHeight, collisionHeight);
	assertEqual(sampleRecord.visualHeight, collisionHeight);
	assertEqual(sampleRecord.error, 0);
}

assertNoCollisionHintsInGltf(assertGlbProvenance(glb, output.glbSha256));
assertGeneratedGlbImportRegistration();

console.log(
	`Observatory visual terrain contract passed for generated asset ${fieldAssetId}.`,
);

function assertGeneratedGlbImportRegistration(): void {
	const importManifest = generatedGlbImportParityManifests.find(
		(candidate) =>
			candidate.id === "observatory-generated-visual-terrain-import",
	);
	const entry = importManifest?.entries.find(
		(candidate) => candidate.id === "observatory-field-micro-displacement-glb",
	);
	const entryRecord = assertRecord(
		entry,
		"observatory generated visual terrain import entry",
	);
	const artifact = assertRecord(
		entryRecord.artifact,
		"observatory generated visual terrain import artifact",
	);
	const target = assertRecord(
		entryRecord.target,
		"observatory generated visual terrain import target",
	);

	assertEqual(entryRecord.runtimeSceneId, "observatory_runtime");
	assertEqual(entryRecord.status, "imported");
	assertEqual(entryRecord.owner, metadata.owner);
	assertEqual(entryRecord.sourceUrl, glbAssetUrl);
	assertIncludes(
		assertStringArray(entryRecord.evidence, "import entry evidence"),
		"scripts/generate-observatory-field-terrain.ts",
	);
	assertIncludes(
		assertStringArray(entryRecord.evidence, "import entry evidence"),
		metadataPath,
	);
	assertEqual(
		artifact.generatorScript,
		"scripts/generate-observatory-field-terrain.ts",
	);
	assertEqual(artifact.metadataPath, metadataPath);
	assertEqual(artifact.glbSha256, output.glbSha256);
	assertIncludes(
		assertStringArray(target.assetIds, "import target assetIds"),
		fieldAssetId,
	);
	assertIncludes(
		assertStringArray(target.prefabIds, "import target prefabIds"),
		fieldPrefabId,
	);
	assertIncludes(
		assertStringArray(target.stableIds, "import target stableIds"),
		fieldStableId,
	);
}

function assertGlbProvenance(
	glbBuffer: Buffer,
	expectedSha256: unknown,
): Record<string, unknown> {
	assertEqual(glbBuffer.subarray(0, 4).toString("utf8"), "glTF");
	assertEqual(glbBuffer.readUInt32LE(4), 2);
	assertEqual(glbBuffer.readUInt32LE(8), glbBuffer.length);
	assertEqual(
		createHash("sha256").update(glbBuffer).digest("hex"),
		expectedSha256,
	);

	const chunks = readGlbChunks(glbBuffer);
	const jsonChunk = chunks[0];

	assertEqual(jsonChunk?.type, "JSON");
	assertEqual(chunks[1]?.type, "BIN");
	assertEqual(chunks.length, 2);

	if (!jsonChunk) {
		throw new Error(
			"Expected generated Observatory GLB to include a JSON chunk.",
		);
	}

	return assertRecord(
		JSON.parse(jsonChunk.data.toString("utf8").trimEnd()),
		"generated Observatory GLB JSON chunk",
	);
}

function prefabForId(
	runtimeSceneManifest: RuntimeSceneManifestData,
	prefabId: string,
) {
	const prefab = runtimeSceneManifest.prefabs.find(
		(candidate) => candidate.id === prefabId,
	);

	if (!prefab) {
		throw new Error(`Expected prefab "${prefabId}" to exist.`);
	}

	return prefab;
}

function componentsForStableId(
	runtimeSceneManifest: RuntimeSceneManifestData,
	stableId: string,
): Record<string, unknown> {
	const instance = runtimeSceneManifest.level.instances.find(
		(candidate) => candidate.stableId === stableId,
	);

	if (!instance) {
		throw new Error(`Expected level instance "${stableId}" to exist.`);
	}

	const prefab = prefabForId(runtimeSceneManifest, instance.prefabId);

	return {
		...prefab.components,
		...(instance.components ?? {}),
		Transform: {
			...assertRecord(prefab.components.Transform, `${stableId}.Transform`),
			...(instance.transform ? { ...instance.transform } : {}),
		},
	};
}

function componentForStableId(
	runtimeSceneManifest: RuntimeSceneManifestData,
	stableId: string,
	componentName: string,
): Record<string, unknown> {
	const component = componentsForStableId(runtimeSceneManifest, stableId)[
		componentName
	];

	if (!isRecord(component)) {
		throw new Error(
			`Expected level instance "${stableId}" to include component "${componentName}".`,
		);
	}

	return component;
}

function assertRuntimeCollisionChunks(
	runtimeStableIds: readonly string[],
	expectedChunkStableIds: readonly string[],
): void {
	const chunkStableIds = runtimeStableIds.filter((stableId) =>
		stableId.startsWith("observatory:walkable-mesh:chunk:"),
	);

	if (chunkStableIds.length === 0) {
		throw new Error(
			"Expected runtime readiness to include Observatory walkable mesh chunks.",
		);
	}

	for (const expectedChunkStableId of expectedChunkStableIds) {
		assertIncludes(chunkStableIds, expectedChunkStableId);
	}
}

function uniqueMeshVertexCount(vertices: readonly unknown[]): number {
	const uniqueVertices = new Set<string>();

	for (const vertex of vertices) {
		if (!Array.isArray(vertex) || vertex.length !== 3) {
			continue;
		}

		uniqueVertices.add(JSON.stringify(vertex));
	}

	return uniqueVertices.size;
}

function meshVertexHeight(
	vertices: readonly unknown[],
	x: number,
	z: number,
): number {
	for (const vertex of vertices) {
		if (!Array.isArray(vertex) || vertex.length !== 3) {
			continue;
		}

		const [vertexX, vertexY, vertexZ] = vertex;

		if (vertexX === x && vertexZ === z && typeof vertexY === "number") {
			return vertexY;
		}
	}

	throw new Error(`Expected collision draft to include vertex ${x}, ${z}.`);
}

function readGlbChunks(glbBuffer: Buffer): readonly {
	readonly type: string;
	readonly data: Buffer;
}[] {
	const chunks: { type: string; data: Buffer }[] = [];
	let offset = 12;

	while (offset < glbBuffer.length) {
		const byteLength = glbBuffer.readUInt32LE(offset);
		const type = glbChunkTypeName(glbBuffer.readUInt32LE(offset + 4));
		const dataStart = offset + 8;
		const dataEnd = dataStart + byteLength;

		if (dataEnd > glbBuffer.length) {
			throw new Error(
				`Generated Observatory GLB chunk "${type}" overruns file.`,
			);
		}

		chunks.push({
			type,
			data: glbBuffer.subarray(dataStart, dataEnd),
		});
		offset = dataEnd;
	}

	assertEqual(offset, glbBuffer.length);

	return chunks;
}

function glbChunkTypeName(chunkType: number): string {
	if (chunkType === 0x4e4f534a) {
		return "JSON";
	}

	if (chunkType === 0x004e4942) {
		return "BIN";
	}

	return `0x${chunkType.toString(16)}`;
}

function assertNoCollisionHintsInGltf(gltfJson: Record<string, unknown>): void {
	const serialized = JSON.stringify(gltfJson).toLowerCase();
	const forbiddenTerms = [
		"collider",
		"rigidbody",
		"rigid_body",
		"physics",
		"collision",
	];

	for (const forbidden of forbiddenTerms) {
		if (serialized.includes(forbidden)) {
			throw new Error(
				`Generated Observatory visual terrain GLB must not include implicit ${forbidden} metadata.`,
			);
		}
	}
}

function assertTerrainChunkMetadataIfPresent(
	metadataRecord: Record<string, unknown>,
): void {
	const alignmentRecord = assertRecord(
		metadataRecord.alignment,
		"metadata.alignment",
	);
	const chunkCollections = [
		["metadata.chunks", metadataRecord.chunks],
		["metadata.visualChunks", metadataRecord.visualChunks],
		["metadata.terrainChunks", metadataRecord.terrainChunks],
		["metadata.alignment.visualChunks", alignmentRecord.visualChunks],
		["metadata.alignment.collisionChunks", alignmentRecord.collisionChunks],
	] as const;

	for (const [label, value] of chunkCollections) {
		if (value !== undefined) {
			assertTerrainChunks(value, label);
		}
	}
}

function assertTerrainChunks(value: unknown, label: string): void {
	const chunks = assertArray(value, label);

	if (chunks.length === 0) {
		throw new Error(`Expected ${label} to include at least one terrain chunk.`);
	}

	const chunkIds = new Set<string>();

	for (const [index, chunk] of chunks.entries()) {
		const chunkLabel = `${label}[${index}]`;
		const chunkRecord = assertRecord(chunk, chunkLabel);
		const chunkId = assertNonEmptyString(chunkRecord.id, `${chunkLabel}.id`);

		if (chunkIds.has(chunkId)) {
			throw new Error(`Expected ${label} terrain chunk IDs to be unique.`);
		}

		chunkIds.add(chunkId);

		if (chunkRecord.bounds !== undefined) {
			assertBounds(chunkRecord.bounds, `${chunkLabel}.bounds`);
		}

		if (chunkRecord.heightRange !== undefined) {
			assertHeightRange(chunkRecord.heightRange, `${chunkLabel}.heightRange`);
		}

		if (chunkRecord.vertexCount !== undefined) {
			assertPositiveInteger(
				chunkRecord.vertexCount,
				`${chunkLabel}.vertexCount`,
			);
		}

		if (chunkRecord.triangleCount !== undefined) {
			assertPositiveInteger(
				chunkRecord.triangleCount,
				`${chunkLabel}.triangleCount`,
			);
		}

		if (chunkRecord.glbSha256 !== undefined) {
			assertSha256(chunkRecord.glbSha256, `${chunkLabel}.glbSha256`);
		}

		if (chunkRecord.contentHash !== undefined) {
			assertNonEmptyString(
				chunkRecord.contentHash,
				`${chunkLabel}.contentHash`,
			);
		}
	}
}

function assertBounds(value: unknown, label: string): void {
	const bounds = assertRecord(value, label);
	const min = assertNumberTuple3(bounds.min, `${label}.min`);
	const max = assertNumberTuple3(bounds.max, `${label}.max`);

	for (const axis of [0, 1, 2] as const) {
		if (min[axis] > max[axis]) {
			throw new Error(`Expected ${label}.min <= ${label}.max on axis ${axis}.`);
		}
	}
}

function assertHeightRange(value: unknown, label: string): void {
	const heightRange = assertRecord(value, label);
	const min = assertNumber(heightRange.min, `${label}.min`);
	const max = assertNumber(heightRange.max, `${label}.max`);

	if (min > max) {
		throw new Error(`Expected ${label}.min <= ${label}.max.`);
	}
}

function assertIncludes(
	values: readonly string[],
	expected: string,
	message?: string,
): void {
	if (!values.includes(expected)) {
		throw new Error(
			message ??
				`Expected ${JSON.stringify(values)} to include ${JSON.stringify(expected)}.`,
		);
	}
}

function assertExcludes(
	values: readonly string[],
	unexpected: string,
	message?: string,
): void {
	if (values.includes(unexpected)) {
		throw new Error(
			message ??
				`Expected ${JSON.stringify(values)} not to include ${JSON.stringify(unexpected)}.`,
		);
	}
}

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message?: string,
): void {
	if (actual !== expected) {
		throw new Error(
			message ?? `Expected ${String(expected)}, received ${String(actual)}.`,
		);
	}
}

function assertDeepEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message?: string,
): void {
	const actualJson = JSON.stringify(actual);
	const expectedJson = JSON.stringify(expected);

	if (actualJson !== expectedJson) {
		throw new Error(
			message ?? `Expected ${expectedJson}, received ${actualJson}.`,
		);
	}
}

function assertArray(value: unknown, label: string): readonly unknown[] {
	if (!Array.isArray(value)) {
		throw new Error(`Expected ${label} to be an array.`);
	}

	return value;
}

function assertNumber(value: unknown, label: string): number {
	if (typeof value !== "number") {
		throw new Error(`Expected ${label} to be a number.`);
	}

	return value;
}

function assertNumberTuple3(
	value: unknown,
	label: string,
): [number, number, number] {
	const tuple = assertArray(value, label);

	if (tuple.length !== 3) {
		throw new Error(`Expected ${label} to contain three numbers.`);
	}

	return [
		assertNumber(tuple[0], `${label}[0]`),
		assertNumber(tuple[1], `${label}[1]`),
		assertNumber(tuple[2], `${label}[2]`),
	];
}

function assertPositiveInteger(value: unknown, label: string): number {
	const numberValue = assertNumber(value, label);

	if (!Number.isInteger(numberValue) || numberValue <= 0) {
		throw new Error(`Expected ${label} to be a positive integer.`);
	}

	return numberValue;
}

function assertString(value: unknown, label: string): string {
	if (typeof value !== "string") {
		throw new Error(`Expected ${label} to be a string.`);
	}

	return value;
}

function assertStringArray(value: unknown, label: string): readonly string[] {
	const array = assertArray(value, label);

	for (const [index, item] of array.entries()) {
		assertString(item, `${label}[${index}]`);
	}

	return array as readonly string[];
}

function assertNonEmptyString(value: unknown, label: string): string {
	const stringValue = assertString(value, label);

	if (stringValue.trim().length === 0) {
		throw new Error(`Expected ${label} to be a non-empty string.`);
	}

	return stringValue;
}

function assertSha256(value: unknown, label: string): string {
	const sha256 = assertString(value, label);

	if (!/^[a-f0-9]{64}$/.test(sha256)) {
		throw new Error(`Expected ${label} to be a lowercase SHA-256 hash.`);
	}

	return sha256;
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
	if (!isRecord(value)) {
		throw new Error(`Expected ${label} to be an object.`);
	}

	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
