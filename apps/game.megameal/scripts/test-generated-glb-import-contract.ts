import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
	type GeneratedGlbImportEntry,
	type GeneratedGlbImportManifest,
	validateGeneratedGlbImportManifest,
} from "../src/engine/index.js";
import { generatedGlbImportParityManifests } from "../src/game/assets/index.js";
import { defaultRuntimeSceneManifests } from "../src/game/levels/index.js";

for (const importManifest of generatedGlbImportParityManifests) {
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

const mirandaImportManifest = generatedGlbImportParityManifests[0];
const commandConsoleEntry = requireEntry(
	mirandaImportManifest,
	"miranda-command-console-glb",
);
const portalApparatusEntry = requireEntry(
	mirandaImportManifest,
	"miranda-portal-apparatus-glb",
);
const observatoryImportManifest = requireImportManifest(
	"observatory-generated-visual-terrain-import",
);
const observatoryFieldEntry = requireEntry(
	observatoryImportManifest,
	"observatory-field-micro-displacement-glb",
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

const { planned: _planned, ...plannedWithoutMetadata } = portalApparatusEntry;
const { artifact: _artifact, ...observatoryFieldWithoutArtifact } =
	observatoryFieldEntry;

expectInvalid(
	{
		...mirandaImportManifest,
		entries: [plannedWithoutMetadata],
	},
	"must include planned contract metadata",
);

expectInvalid(
	{
		...observatoryImportManifest,
		entries: [observatoryFieldWithoutArtifact],
	},
	"must include artifact provenance metadata",
);

expectInvalid(
	{
		...observatoryImportManifest,
		entries: [
			{
				...observatoryFieldEntry,
				sourceUrl: "/generated/runtime-game-assets/prefabs/terrain/field.glb",
			},
		],
	},
	"must point at a target-engine /assets/generated/ artifact",
);

expectInvalid(
	{
		...observatoryImportManifest,
		entries: [
			{
				...observatoryFieldEntry,
				artifact: {
					...requireArtifact(observatoryFieldEntry),
					glbSha256: "not-a-sha",
				},
			},
		],
	},
	"artifact.glbSha256 must be a 64-character lowercase hex SHA-256",
);

expectInvalid(
	{
		...mirandaImportManifest,
		entries: [
			{
				...commandConsoleEntry,
				artifact: requireArtifact(observatoryFieldEntry),
			},
		],
	},
	"artifact metadata is only allowed for imported target-generated assets",
);

for (const importManifest of generatedGlbImportParityManifests) {
	for (const entry of importManifest.entries) {
		if (entry.status === "imported") {
			await assertImportedArtifactProvenance(entry);
		}
	}
}

console.log(
	`Generated GLB import contract passed for ${generatedGlbImportParityManifests.length} manifest(s).`,
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

function requireImportManifest(
	importManifestId: string,
): GeneratedGlbImportManifest {
	const importManifest = generatedGlbImportParityManifests.find(
		(candidate) => candidate.id === importManifestId,
	);

	if (!importManifest) {
		throw new Error(
			`Expected generated GLB import manifest "${importManifestId}" to exist.`,
		);
	}

	return importManifest;
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
	const glbPath = generatedAssetUrlToPublicPath(entry.sourceUrl);
	const glb = await readFile(gameAppFileUrl(glbPath));
	const glbSha256 = createHash("sha256").update(glb).digest("hex");

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

function assertString(value: unknown, label: string): string {
	if (typeof value !== "string") {
		throw new Error(`Expected ${label} to be a string.`);
	}

	return value;
}

function assertEqual(actual: unknown, expected: unknown): void {
	if (actual !== expected) {
		throw new Error(
			`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}.`,
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
