import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
	type RuntimeSceneManifestData,
	loadRuntimeSceneManifest,
} from "../src/engine/index.js";
import { generatedGlbImportParityManifests } from "../src/game/assets/index.js";
import { observatoryCollisionCookDraft } from "../src/game/editor/collisionDrafts/observatoryCollisionDraft.js";
import { observatoryRuntimeSceneManifest } from "../src/game/levels/index.js";

const metadataUrl = new URL(
	"../public/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.json",
	import.meta.url,
);
const glbUrl = new URL(
	"../public/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.glb",
	import.meta.url,
);
const manifest = loadRuntimeSceneManifest(observatoryRuntimeSceneManifest);
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
const collisionEntry = observatoryCollisionCookDraft.entries.find(
	(entry) => entry.stableId === "observatory:walkable-mesh",
);

if (!collisionEntry || collisionEntry.collider.shape.type !== "mesh") {
	throw new Error(
		'Expected Observatory collision draft to own mesh "observatory:walkable-mesh".',
	);
}

assertEqual(fieldAsset?.kind, "mesh");
assertEqual(fieldAsset?.url, glbAssetUrl);
assertIncludes(fieldAsset?.tags ?? [], "generated");
assertIncludes(fieldAsset?.tags ?? [], "visual-displacement");
assertIncludes(fieldAsset?.tags ?? [], "collision-aligned");
assertIncludes(manifest.level.preload ?? [], fieldAssetId);
assertIncludes(manifest.assets.preloadGroups?.observatory ?? [], fieldAssetId);
assertIncludes(manifest.readiness.requiredAssetIds ?? [], fieldAssetId);
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
assertEqual(source.collisionStableId, "observatory:walkable-mesh");
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
	collisionEntry.collider.shape.vertices.length,
);
assertEqual(
	alignment.collisionTriangleCount,
	collisionEntry.collider.shape.indices.length / 3,
);
assertEqual(alignment.visualVertexCount, 4225);
assertEqual(alignment.visualTriangleCount, 8192);
assertEqual(alignment.maxCollisionSampleError, 0);

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
	const collisionHeight = meshVertexHeight(
		collisionEntry.collider.shape.vertices,
		x,
		z,
	);

	assertEqual(sampleRecord.collisionHeight, collisionHeight);
	assertEqual(sampleRecord.visualHeight, collisionHeight);
	assertEqual(sampleRecord.error, 0);
}

assertGlbProvenance(glb, output.glbSha256);
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

	assertEqual(entry?.runtimeSceneId, "observatory_runtime");
	assertEqual(entry?.status, "imported");
	assertEqual(entry?.sourceUrl, glbAssetUrl);
	assertIncludes(entry?.target?.assetIds ?? [], fieldAssetId);
	assertIncludes(entry?.target?.prefabIds ?? [], fieldPrefabId);
	assertIncludes(entry?.target?.stableIds ?? [], fieldStableId);
}

function assertGlbProvenance(glbBuffer: Buffer, expectedSha256: unknown): void {
	assertEqual(glbBuffer.subarray(0, 4).toString("utf8"), "glTF");
	assertEqual(glbBuffer.readUInt32LE(4), 2);
	assertEqual(glbBuffer.readUInt32LE(8), glbBuffer.length);
	assertEqual(
		createHash("sha256").update(glbBuffer).digest("hex"),
		expectedSha256,
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

function assertRecord(value: unknown, label: string): Record<string, unknown> {
	if (!isRecord(value)) {
		throw new Error(`Expected ${label} to be an object.`);
	}

	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
