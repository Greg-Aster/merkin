import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
	type GeneratedGlbImportEntry,
	type GeneratedGlbImportManifest,
	type RuntimeSceneManifestData,
	validateGeneratedGlbImportManifest,
} from "../src/engine/index.js";
import { generatedGlbImportParityManifests } from "../src/game/assets/index.js";
import { defaultRuntimeSceneManifests } from "../src/game/levels/index.js";

const importManifests =
	generatedGlbImportParityManifests as readonly GeneratedGlbImportManifest[];

for (const importManifest of importManifests) {
	const result = validateGeneratedGlbImportManifest({
		importManifest,
		runtimeSceneManifests: defaultRuntimeSceneManifests,
	});

	if (!result.ok) {
		throw new Error(
			`Expected ${importManifest.id} generated GLB import manifest to validate:\n${result.errors.join("\n")}`,
		);
	}
}

const mirandaImportManifest = importManifests[0];

if (!mirandaImportManifest) {
	throw new Error("Expected at least one generated GLB import manifest.");
}

const commandConsoleEntry = requireEntry(
	mirandaImportManifest,
	"miranda-command-console-glb",
);
const portalApparatusEntry = requireEntry(
	mirandaImportManifest,
	"miranda-portal-apparatus-glb",
);

expectInvalid(
	{
		...mirandaImportManifest,
		entries: [
			...mirandaImportManifest.entries,
			{
				...commandConsoleEntry,
				id: "miranda-wasteland-monolith-glb",
			},
		],
	},
	'generated GLB import entry "miranda-wasteland-monolith-glb" is duplicated',
);

expectInvalid(
	{
		...mirandaImportManifest,
		entries: [
			{
				...commandConsoleEntry,
				target: {
					...requireTarget(commandConsoleEntry),
					prefabIds: ["missing_target_prefab"],
				},
			},
		],
	},
	'targets unknown referenced prefab ID "missing_target_prefab"',
);

expectInvalid(
	{
		...mirandaImportManifest,
		entries: [
			{
				...commandConsoleEntry,
				runtimeSceneId: "missing_runtime",
			},
		],
	},
	'references unknown runtime scene "missing_runtime"',
);

expectInvalid(
	{
		...mirandaImportManifest,
		entries: [
			{
				...commandConsoleEntry,
				sourceUrl: "/assets/game/miranda/not-generated.glb",
			},
		],
	},
	"sourceUrl must be a generated .glb or .gltf URL",
);

expectInvalid(
	{
		...mirandaImportManifest,
		entries: [
			{
				...commandConsoleEntry,
				owner: "",
			},
		],
	},
	"is missing owner",
);

expectInvalid(
	{
		...mirandaImportManifest,
		entries: [
			{
				...commandConsoleEntry,
				evidence: [],
			},
		],
	},
	"is missing evidence",
);

const { planned: _planned, ...plannedWithoutMetadata } = portalApparatusEntry;
const invalidArtifact = {
	generatorId: "engine:data:generated-glb-import-pipeline",
	metadataPath: "public/assets/generated/game/synthetic/terrain.json",
	glbSha256: "0".repeat(64),
};

expectInvalid(
	{
		...mirandaImportManifest,
		entries: [plannedWithoutMetadata],
	},
	"must include planned contract metadata",
);

expectInvalid(
	{
		...mirandaImportManifest,
		entries: [
			{
				...commandConsoleEntry,
				artifact: invalidArtifact,
			},
		],
	},
	"artifact metadata is only allowed for imported target-generated assets",
);

for (const importManifest of importManifests) {
	for (const entry of importManifest.entries) {
		if (entry.status === "imported") {
			await assertImportedArtifactProvenance(entry);
		}
	}
}

console.log(
	`Generated GLB import contract passed for ${importManifests.length} manifest(s).`,
);

function expectInvalid(
	importManifest: GeneratedGlbImportManifest,
	expectedError: string,
): void {
	const result = validateGeneratedGlbImportManifest({
		importManifest,
		runtimeSceneManifests: defaultRuntimeSceneManifests,
	});

	if (result.ok) {
		throw new Error(
			`Expected ${importManifest.id} generated GLB import manifest to fail with ${JSON.stringify(expectedError)}.`,
		);
	}

	if (!result.errors.some((error) => error.includes(expectedError))) {
		throw new Error(
			`Expected ${importManifest.id} generated GLB import errors to include ${JSON.stringify(expectedError)}, received:\n${result.errors.join("\n")}`,
		);
	}
}

function requireEntry(
	importManifest: GeneratedGlbImportManifest,
	entryId: string,
): GeneratedGlbImportEntry {
	const entry = importManifest.entries.find(
		(candidate) => candidate.id === entryId,
	);

	if (!entry) {
		throw new Error(
			`Expected generated GLB import entry "${entryId}" to exist.`,
		);
	}

	return entry;
}

function requireArtifact(
	entry: GeneratedGlbImportEntry,
): NonNullable<GeneratedGlbImportEntry["artifact"]> {
	if (!entry.artifact) {
		throw new Error(
			`Expected generated GLB import entry "${entry.id}" to include artifact provenance.`,
		);
	}

	return entry.artifact;
}

function requireTarget(
	entry: GeneratedGlbImportEntry,
): NonNullable<GeneratedGlbImportEntry["target"]> {
	if (!entry.target) {
		throw new Error(
			`Expected generated GLB import entry "${entry.id}" to target current content.`,
		);
	}

	return entry.target;
}

async function assertImportedArtifactProvenance(
	entry: GeneratedGlbImportEntry,
): Promise<void> {
	const artifact = requireArtifact(entry);
	const target = requireTarget(entry);
	const metadata = assertRecord(
		JSON.parse(await readFile(gameAppFileUrl(artifact.metadataPath), "utf8")),
		`${entry.id}.artifact metadata`,
	);
	const output = assertRecord(metadata.output, `${entry.id}.metadata.output`);
	const source = assertOptionalRecord(
		metadata.source,
		`${entry.id}.metadata.source`,
	);
	const glbPath = generatedAssetUrlToPublicPath(entry.sourceUrl);
	const glb = await readFile(gameAppFileUrl(glbPath));
	const glbSha256 = createHash("sha256").update(glb).digest("hex");
	const runtimeManifest = runtimeManifestForId(entry.runtimeSceneId);

	assertEqual(
		assertString(metadata.owner, `${entry.id}.metadata.owner`),
		entry.owner,
	);
	assertIncludes(entry.evidence, artifact.generatorId);
	assertIncludes(entry.evidence, artifact.metadataPath);
	assertEqual(
		assertString(output.glbUrl, `${entry.id}.metadata.output.glbUrl`),
		entry.sourceUrl,
	);
	assertEqual(
		assertString(output.glbPath, `${entry.id}.metadata.output.glbPath`),
		glbPath,
	);
	assertEqual(
		assertString(
			output.metadataPath,
			`${entry.id}.metadata.output.metadataPath`,
		),
		artifact.metadataPath,
	);
	assertEqual(
		assertString(output.glbSha256, `${entry.id}.metadata.output.glbSha256`),
		artifact.glbSha256,
	);
	assertEqual(glbSha256, artifact.glbSha256);
	assertIncludes(
		target.assetIds ?? [],
		assertString(output.meshAssetId, `${entry.id}.metadata.output.meshAssetId`),
	);
	assertIncludes(
		target.prefabIds ?? [],
		assertString(output.prefabId, `${entry.id}.metadata.output.prefabId`),
	);
	assertIncludes(
		target.stableIds ?? [],
		assertString(output.stableId, `${entry.id}.metadata.output.stableId`),
	);
	assertImportedRuntimeReferences({
		entry,
		metadata,
		output,
		source,
		runtimeManifest,
	});
	assertTerrainChunkMetadataIfPresent(metadata, entry.id);
}

function assertImportedRuntimeReferences(input: {
	readonly entry: GeneratedGlbImportEntry;
	readonly metadata: Record<string, unknown>;
	readonly output: Record<string, unknown>;
	readonly source: Record<string, unknown> | undefined;
	readonly runtimeManifest: RuntimeSceneManifestData;
}): void {
	const { entry, metadata, output, source, runtimeManifest } = input;
	const target = requireTarget(entry);
	const meshAssetId = assertString(
		output.meshAssetId,
		`${entry.id}.metadata.output.meshAssetId`,
	);
	const prefabId = assertString(
		output.prefabId,
		`${entry.id}.metadata.output.prefabId`,
	);
	const stableId = assertString(
		output.stableId,
		`${entry.id}.metadata.output.stableId`,
	);
	const asset = runtimeManifest.assets.assets.find(
		(candidate) => candidate.id === meshAssetId,
	);
	const prefab = prefabForId(runtimeManifest, prefabId);
	const components = componentsForStableId(runtimeManifest, stableId);
	const renderable = assertRecord(
		components.Renderable,
		`${entry.id}.${stableId}.Renderable`,
	);

	assertIncludes(target.assetIds ?? [], meshAssetId);
	assertIncludes(target.prefabIds ?? [], prefabId);
	assertIncludes(target.stableIds ?? [], stableId);
	assertIncludes(runtimeManifest.readiness.requiredAssetIds ?? [], meshAssetId);
	assertIncludes(runtimeManifest.level.preload ?? [], meshAssetId);
	assertAnyPreloadGroupIncludes(runtimeManifest, meshAssetId);
	assertEqual(asset?.kind, "mesh");
	assertEqual(asset?.url, entry.sourceUrl);
	assertIncludes(asset?.tags ?? [], "generated");
	assertIncludes(prefab.assetIds ?? [], meshAssetId);
	assertEqual(renderable.meshId, meshAssetId);
	assertEqual(
		components.Collider,
		undefined,
		`Imported generated asset "${entry.id}" must not create implicit collision on "${stableId}".`,
	);
	assertEqual(
		components.RigidBody,
		undefined,
		`Imported generated asset "${entry.id}" must not create an implicit physics body on "${stableId}".`,
	);
	assertExcludes(
		runtimeManifest.readiness.requiredCollisionStableIds ?? [],
		stableId,
		`Imported generated visual stable ID "${stableId}" must not be a required collision ID.`,
	);
	assertExcludes(
		runtimeManifest.readiness.requiredWalkableStableIds ?? [],
		stableId,
		`Imported generated visual stable ID "${stableId}" must not be a required walkable ID.`,
	);

	if (source?.runtimeSceneId !== undefined) {
		assertEqual(
			assertString(
				source.runtimeSceneId,
				`${entry.id}.metadata.source.runtimeSceneId`,
			),
			entry.runtimeSceneId,
		);
	}

	if (source?.collisionStableId !== undefined) {
		const collisionStableId = assertString(
			source.collisionStableId,
			`${entry.id}.metadata.source.collisionStableId`,
		);

		assertRuntimeCollisionSourceCoverage(
			runtimeManifest.readiness.requiredCollisionStableIds ?? [],
			collisionStableId,
		);
		assertRuntimeCollisionSourceCoverage(
			runtimeManifest.readiness.requiredWalkableStableIds ?? [],
			collisionStableId,
		);
		assertEqual(
			stableId === collisionStableId,
			false,
			`Imported generated terrain "${entry.id}" must link to separate collision data, not reuse the visual stable ID.`,
		);
	}

	if (source?.collisionStableIds !== undefined) {
		const collisionStableIds = assertArray(
			source.collisionStableIds,
			`${entry.id}.metadata.source.collisionStableIds`,
		).map((collisionStableId, index) =>
			assertString(
				collisionStableId,
				`${entry.id}.metadata.source.collisionStableIds.${index}`,
			),
		);

		if (collisionStableIds.length === 0) {
			throw new Error(
				`Imported generated terrain "${entry.id}" must link to at least one explicit collision stable ID.`,
			);
		}

		for (const collisionStableId of collisionStableIds) {
			assertIncludes(
				runtimeManifest.readiness.requiredCollisionStableIds ?? [],
				collisionStableId,
			);
			assertIncludes(
				runtimeManifest.readiness.requiredWalkableStableIds ?? [],
				collisionStableId,
			);
			assertEqual(
				stableId === collisionStableId,
				false,
				`Imported generated terrain "${entry.id}" must link to separate collision data, not reuse the visual stable ID.`,
			);
		}
	}

	if (source?.collisionPrefabId !== undefined) {
		assertIncludes(
			runtimeManifest.readiness.requiredCollisionPrefabIds ?? [],
			assertString(
				source.collisionPrefabId,
				`${entry.id}.metadata.source.collisionPrefabId`,
			),
		);
	}

	if (isTerrainMetadata(metadata)) {
		assertIncludes(asset?.tags ?? [], "terrain");
	}
}

function assertRuntimeCollisionSourceCoverage(
	runtimeStableIds: readonly string[],
	sourceStableId: string,
): void {
	if (runtimeStableIds.includes(sourceStableId)) {
		return;
	}

	const chunkStableIds = runtimeStableIds.filter((stableId) =>
		stableId.startsWith(`${sourceStableId}:chunk:`),
	);

	if (chunkStableIds.length === 0) {
		throw new Error(
			`Expected runtime readiness to include "${sourceStableId}" or explicit chunks derived from it.`,
		);
	}
}

function runtimeManifestForId(
	runtimeSceneId: string,
): RuntimeSceneManifestData {
	const runtimeManifest = defaultRuntimeSceneManifests.find(
		(candidate) => candidate.id === runtimeSceneId,
	);

	if (!runtimeManifest) {
		throw new Error(
			`Expected runtime scene manifest "${runtimeSceneId}" to be registered.`,
		);
	}

	return runtimeManifest;
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

function assertAnyPreloadGroupIncludes(
	runtimeSceneManifest: RuntimeSceneManifestData,
	assetId: string,
): void {
	const preloadGroups = runtimeSceneManifest.assets.preloadGroups ?? {};

	if (
		!Object.values(preloadGroups).some((preloadGroup) =>
			preloadGroup.includes(assetId),
		)
	) {
		throw new Error(
			`Expected a preload group in "${runtimeSceneManifest.id}" to include "${assetId}".`,
		);
	}
}

function assertTerrainChunkMetadataIfPresent(
	metadata: Record<string, unknown>,
	entryId: string,
): void {
	const alignment = assertOptionalRecord(
		metadata.alignment,
		`${entryId}.metadata.alignment`,
	);
	const chunkCollections = [
		[`${entryId}.metadata.chunks`, metadata.chunks],
		[`${entryId}.metadata.visualChunks`, metadata.visualChunks],
		[`${entryId}.metadata.terrainChunks`, metadata.terrainChunks],
		[`${entryId}.metadata.alignment.visualChunks`, alignment?.visualChunks],
		[
			`${entryId}.metadata.alignment.collisionChunks`,
			alignment?.collisionChunks,
		],
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

function isTerrainMetadata(metadata: Record<string, unknown>): boolean {
	const id = typeof metadata.id === "string" ? metadata.id : "";
	const output = assertOptionalRecord(metadata.output, "metadata.output");
	const stableId = typeof output?.stableId === "string" ? output.stableId : "";

	return id.includes("terrain") || stableId.includes(":terrain:");
}

function generatedAssetUrlToPublicPath(sourceUrl: string): string {
	if (!sourceUrl.startsWith("/assets/generated/")) {
		throw new Error(
			`Expected imported generated source URL ${JSON.stringify(sourceUrl)} to be under /assets/generated/.`,
		);
	}

	return `public${sourceUrl}`;
}

function gameAppFileUrl(relativePath: string): URL {
	if (relativePath.startsWith("/") || relativePath.includes("..")) {
		throw new Error(
			`Expected app-relative generated artifact path, received ${JSON.stringify(relativePath)}.`,
		);
	}

	return new URL(`../${relativePath}`, import.meta.url);
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`Expected ${label} to be an object.`);
	}

	return value as Record<string, unknown>;
}

function assertOptionalRecord(
	value: unknown,
	label: string,
): Record<string, unknown> | undefined {
	if (value === undefined) {
		return undefined;
	}

	return assertRecord(value, label);
}

function assertArray(value: unknown, label: string): readonly unknown[] {
	if (!Array.isArray(value)) {
		throw new Error(`Expected ${label} to be an array.`);
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

function assertNumber(value: unknown, label: string): number {
	if (typeof value !== "number") {
		throw new Error(`Expected ${label} to be a number.`);
	}

	return value;
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

function assertEqual(
	actual: unknown,
	expected: unknown,
	message?: string,
): void {
	if (actual !== expected) {
		throw new Error(
			message ??
				`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}.`,
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
