import {
	type LevelEditorAuthoringDocument,
	type LevelEditorAuthoringDocumentProvenance,
	type LevelEditorAuthoringTransaction,
	buildLevelEditorAuthoringOwnerWritePlan,
	buildLevelEditorAuthoringWritePlan,
	projectRuntimeSceneManifestToAuthoringDocument,
	serializeLevelEditorAuthoringOwnerWritePlan,
	serializeLevelEditorAuthoringWritePlan,
	validateLevelEditorAuthoringDocument,
	validateLevelEditorAuthoringTransaction,
} from "../src/engine/data/levelAuthoring/index.js";
import type { RuntimeSceneManifestData } from "../src/engine/data/schemas/index.js";
import {
	defaultRuntimeSceneManifests,
	portalArenaRuntimeSceneManifest,
} from "../src/game/levels/index.js";

const catalogIds = defaultRuntimeSceneManifests.map((manifest) => manifest.id);
const document = projectRuntimeSceneManifestToAuthoringDocument(
	portalArenaRuntimeSceneManifest,
	{
		provenance: createProvenance(portalArenaRuntimeSceneManifest),
		runtimeSceneCatalogIds: catalogIds,
	},
);

expectValidDocument(document);
assertEqual(
	document.runtimeSceneId,
	portalArenaRuntimeSceneManifest.id,
	"Expected authoring projection to preserve runtime scene ID.",
);
assertEqual(
	document.levelId,
	portalArenaRuntimeSceneManifest.level.id,
	"Expected authoring projection to preserve level ID.",
);
assertAtLeast(
	document.records.length,
	portalArenaRuntimeSceneManifest.level.instances.length,
	"Expected authoring projection to expose level instance records.",
);
assertIncludes(
	document.records.map((record) => record.stableId),
	"player",
	"Expected authoring projection to expose the player stable ID.",
);

const playerRecord = requiredRecord(document, "player");
const playerRenderable = asRecord(playerRecord.components.Renderable);
const validTransaction = {
	schemaVersion: 1,
	id: "test-authoring-transaction",
	runtimeSceneId: document.runtimeSceneId,
	baseDocumentHash: document.contentHash,
	createdAt: "2026-06-11T00:00:00.000Z",
	persistence: "saved",
	operations: [
		{
			id: "move-player-spawn",
			kind: "set-transform",
			stableId: "player",
			persistence: "saved",
			transform: {
				position: [1, 2, 3],
			},
		},
		{
			id: "retune-player-light",
			kind: "set-component",
			stableId: "player",
			target: "level-instance",
			componentName: "Light",
			persistence: "saved",
			value: {
				kind: "point",
				color: "#ffffff",
				intensity: 2,
				distance: 12,
				decay: 2,
				visible: true,
			},
		},
		{
			id: "touch-player-prefab-renderable",
			kind: "set-component",
			stableId: "player",
			target: "prefab",
			componentName: "Renderable",
			persistence: "saved",
			value: {
				meshId: String(playerRenderable.meshId),
				materialId: String(playerRenderable.materialId),
			},
		},
	],
} satisfies LevelEditorAuthoringTransaction;

expectValidTransaction(document, validTransaction);

const writePlan = buildLevelEditorAuthoringWritePlan(
	document,
	validTransaction,
);
const repeatedWritePlan = buildLevelEditorAuthoringWritePlan(
	document,
	validTransaction,
);

assertEqual(
	writePlan.writeMode,
	"dry-run",
	"Expected authoring write plan to be dry-run only.",
);
assertEqual(
	writePlan.writesFiles,
	false,
	"Expected authoring write plan to avoid writing files directly.",
);
assertEqual(
	serializeLevelEditorAuthoringWritePlan(writePlan),
	serializeLevelEditorAuthoringWritePlan(repeatedWritePlan),
	"Expected authoring write plan serialization to be deterministic.",
);
expectWriteArtifact(
	writePlan,
	"level-instances",
	document.provenance.level.targetFile,
);
expectWriteArtifact(
	writePlan,
	"prefab-components",
	document.provenance.prefabs.targetFile,
);

const transformOnlyTransaction = {
	...validTransaction,
	id: "test-authoring-owner-write-transaction",
	operations: [
		{
			id: "move-player-spawn",
			kind: "set-transform",
			stableId: "player",
			persistence: "saved",
			transform: {
				position: [1, 2, 3],
			},
		},
	],
} satisfies LevelEditorAuthoringTransaction;
const ownerWritePlan = buildLevelEditorAuthoringOwnerWritePlan(
	document,
	transformOnlyTransaction,
	{
		sourceSnapshot: createSourceSnapshot(portalArenaRuntimeSceneManifest),
		currentOwnerContentHashes: {
			[document.provenance.level.ownerId]:
				document.provenance.level.contentHash,
		},
	},
);
const repeatedOwnerWritePlan = buildLevelEditorAuthoringOwnerWritePlan(
	document,
	transformOnlyTransaction,
	{
		sourceSnapshot: createSourceSnapshot(portalArenaRuntimeSceneManifest),
		currentOwnerContentHashes: {
			[document.provenance.level.ownerId]:
				document.provenance.level.contentHash,
		},
	},
);

assertEqual(
	ownerWritePlan.writeMode,
	"bounded-owner-write-plan",
	"Expected owner write plan to use the bounded owner-write mode.",
);
assertEqual(
	ownerWritePlan.writesRuntimeData,
	true,
	"Expected owner write plan to describe runtime owner data writes.",
);
assertEqual(
	ownerWritePlan.writesFiles,
	false,
	"Expected owner write plan to avoid writing files directly.",
);
assertEqual(
	serializeLevelEditorAuthoringOwnerWritePlan(ownerWritePlan),
	serializeLevelEditorAuthoringOwnerWritePlan(repeatedOwnerWritePlan),
	"Expected owner write plan serialization to be deterministic.",
);
assertIncludes(
	ownerWritePlan.report.changedStableIds,
	"player",
	"Expected owner write report to include the player stable ID.",
);
assertIncludes(
	ownerWritePlan.report.changedFiles,
	document.provenance.level.targetFile,
	"Expected owner write report to include the level owner file.",
);

const ownerWriteTarget = ownerWritePlan.ownerTargets[0];

if (!ownerWriteTarget) {
	throw new Error("Expected owner write plan to include a level owner target.");
}

assertEqual(
	ownerWriteTarget.expectedBaseHash,
	document.provenance.level.contentHash,
	"Expected owner write target to keep the level owner base hash.",
);
assertEqual(
	ownerWritePlan.artifacts[0]?.purpose,
	"level-instances",
	"Expected owner write artifact to target level instances.",
);

const publishedPlayer =
	ownerWritePlan.artifacts[0]?.payload.level.instances.find(
		(instance) => instance.stableId === "player",
	);

if (!publishedPlayer) {
	throw new Error(
		"Expected owner write artifact to include the player instance.",
	);
}

assertEqual(
	JSON.stringify(publishedPlayer.transform?.position),
	JSON.stringify([1, 2, 3]),
	"Expected owner write artifact to contain the moved player transform.",
);

const nonPlayerTransformTransaction = {
	...validTransaction,
	id: "test-authoring-non-player-owner-write-transaction",
	operations: [
		{
			id: "move-observatory-portal",
			kind: "set-transform",
			stableId: "portal-arena:portal:observatory",
			persistence: "saved",
			transform: {
				position: [2, 0, -6],
				scale: [1.1, 1.1, 1.1],
			},
		},
	],
} satisfies LevelEditorAuthoringTransaction;
const nonPlayerOwnerWritePlan = buildLevelEditorAuthoringOwnerWritePlan(
	document,
	nonPlayerTransformTransaction,
	{
		sourceSnapshot: createSourceSnapshot(portalArenaRuntimeSceneManifest),
		currentOwnerContentHashes: {
			[document.provenance.level.ownerId]:
				document.provenance.level.contentHash,
		},
	},
);
const publishedNonPlayer =
	nonPlayerOwnerWritePlan.artifacts[0]?.payload.level.instances.find(
		(instance) => instance.stableId === "portal-arena:portal:observatory",
	);

if (!publishedNonPlayer) {
	throw new Error(
		"Expected owner write artifact to include the non-player portal instance.",
	);
}

assertIncludes(
	nonPlayerOwnerWritePlan.report.changedStableIds,
	"portal-arena:portal:observatory",
	"Expected owner write report to include the non-player stable ID.",
);
assertEqual(
	JSON.stringify(publishedNonPlayer.transform?.position),
	JSON.stringify([2, 0, -6]),
	"Expected owner write artifact to contain the moved non-player transform.",
);
assertEqual(
	JSON.stringify(publishedNonPlayer.transform?.scale),
	JSON.stringify([1.1, 1.1, 1.1]),
	"Expected owner write artifact to contain the non-player scale transform.",
);

expectOwnerWriteFailure(
	document,
	transformOnlyTransaction,
	{
		sourceSnapshot: createSourceSnapshot(portalArenaRuntimeSceneManifest),
		currentOwnerContentHashes: {
			[document.provenance.level.ownerId]: "fnv1a32:ffffffff",
		},
	},
	"base hash mismatch",
);

expectOwnerWriteFailure(
	document,
	validTransaction,
	{
		sourceSnapshot: createSourceSnapshot(portalArenaRuntimeSceneManifest),
	},
	"Initial owner writes support set-transform only",
);

expectOwnerWriteFailure(
	document,
	{
		...transformOnlyTransaction,
		id: "unknown-stable-id-owner-write",
		operations: [
			{
				id: "move-missing-instance",
				kind: "set-transform",
				stableId: "missing-stable-id",
				persistence: "saved",
				transform: {
					position: [1, 2, 3],
				},
			},
		],
	},
	{
		sourceSnapshot: createSourceSnapshot(portalArenaRuntimeSceneManifest),
	},
	"is not present in the authoringDoc",
);

expectInvalidDocument(
	{
		...cloneDocument(document),
		provenance: {
			...cloneDocument(document).provenance,
			level: undefined,
		},
	} as unknown as LevelEditorAuthoringDocument,
	"provenance.level must declare owner provenance",
);

const firstRecord = document.records[0];
const secondRecord = document.records[1];

if (!firstRecord || !secondRecord) {
	throw new Error("Expected projected authoring document to contain records.");
}

expectInvalidDocument(
	{
		...cloneDocument(document),
		records: [
			firstRecord,
			{
				...secondRecord,
				stableId: firstRecord.stableId,
			},
			...document.records.slice(2),
		],
	} satisfies LevelEditorAuthoringDocument,
	"is duplicated",
);

expectInvalidDocument(
	{
		...cloneDocument(document),
		runtimeSceneId: "missing_runtime_scene",
	} satisfies LevelEditorAuthoringDocument,
	"is not present in runtimeSceneCatalogIds",
);

expectInvalidTransaction(
	document,
	{
		...validTransaction,
		id: "unknown-portal-target",
		operations: [
			{
				id: "bad-portal-target",
				kind: "set-portal-target",
				stableId: "portal-arena:portal:observatory",
				target: "level-instance",
				persistence: "saved",
				targetRuntimeSceneId: "missing_runtime_scene",
			},
		],
	},
	'targetRuntimeSceneId "missing_runtime_scene" is not present',
);

expectInvalidTransaction(
	document,
	{
		...validTransaction,
		id: "invalid-component-edit",
		operations: [
			{
				id: "bad-light-edit",
				kind: "set-component",
				stableId: "player",
				target: "level-instance",
				componentName: "Light",
				persistence: "saved",
				value: {
					kind: "point",
					color: "white",
					intensity: -1,
				},
			},
		],
	},
	"value.Light.color must be a #rgb or #rrggbb color string",
);

expectInvalidTransaction(
	document,
	{
		...validTransaction,
		id: "preview-operation-marked-saved",
		operations: [
			{
				id: "preview-move-player",
				kind: "set-transform",
				stableId: "player",
				persistence: "preview-only",
				transform: {
					position: [0, 2, 0],
				},
			},
		],
	},
	'cannot be committed as transaction persistence "saved"',
);

const previewOnlyTransaction = {
	...validTransaction,
	id: "preview-only-transaction",
	persistence: "preview-only",
	operations: [
		{
			id: "preview-move-player",
			kind: "set-transform",
			stableId: "player",
			persistence: "preview-only",
			transform: {
				position: [0, 2, 0],
			},
		},
	],
} satisfies LevelEditorAuthoringTransaction;

expectValidTransaction(document, previewOnlyTransaction);

try {
	buildLevelEditorAuthoringWritePlan(document, previewOnlyTransaction);
	throw new Error("Expected preview-only transaction write plan to fail.");
} catch (error) {
	if (
		!(error instanceof Error) ||
		!error.message.includes("require saved transactions")
	) {
		throw error;
	}
}

console.log(
	`Level editor authoring contract passed for ${document.records.length} projected records and ${writePlan.artifacts.length} write artifacts.`,
);

function createProvenance(
	manifest: RuntimeSceneManifestData,
): LevelEditorAuthoringDocumentProvenance {
	return {
		runtimeSceneManifest: owner(
			"runtime-scene-manifest",
			"src/game/levels/runtimeSceneManifests.ts",
			`${manifest.id}ManifestExport`,
		),
		level: owner(
			"level",
			"src/game/levels/portalArenaLevel.ts",
			"portalArenaLevel",
		),
		prefabs: owner(
			"prefabs",
			"src/game/prefabs/portalPrefabs.ts",
			"portalArenaPrefabs",
		),
		assetManifest: owner(
			"asset-manifest",
			"src/game/assets/portalArenaAssets.ts",
			"portalArenaAssetManifest",
		),
		renderProfile: owner(
			"render-profile",
			"src/game/levels/renderProfiles.ts",
			"portalArenaRenderProfile",
		),
		generatedModules: [
			owner(
				"generated-module",
				"src/game/generated/terrainRuntime.ts",
				"terrainPackagesForRuntimeScene",
			),
		],
	};
}

function createSourceSnapshot(manifest: RuntimeSceneManifestData) {
	return {
		manifest,
		level: manifest.level,
		prefabs: manifest.prefabs,
		assets: manifest.assets,
		renderProfile: manifest.renderProfile,
		terrainPackages: manifest.terrainPackages ?? [],
	};
}

function owner(
	kind: LevelEditorAuthoringDocumentProvenance[keyof Omit<
		LevelEditorAuthoringDocumentProvenance,
		"generatedModules"
	>]["kind"],
	targetFile: string,
	exportName: string,
): LevelEditorAuthoringDocumentProvenance["level"] {
	return {
		ownerId: `${kind}:${exportName}`,
		kind,
		targetFile,
		exportName,
		contentHash: `fnv1a32:${exportName.length.toString(16).padStart(8, "0")}`,
	};
}

function requiredRecord(
	document: LevelEditorAuthoringDocument,
	stableId: string,
): LevelEditorAuthoringDocument["records"][number] {
	const record = document.records.find((item) => item.stableId === stableId);

	if (!record) {
		throw new Error(`Expected authoring record "${stableId}".`);
	}

	return record;
}

function expectValidDocument(document: LevelEditorAuthoringDocument): void {
	const result = validateLevelEditorAuthoringDocument(document);

	if (!result.ok) {
		throw new Error(
			`Expected authoring document to validate:\n${result.errors.join("\n")}`,
		);
	}
}

function expectInvalidDocument(
	document: LevelEditorAuthoringDocument,
	expectedError: string,
): void {
	const result = validateLevelEditorAuthoringDocument(document);

	if (result.ok) {
		throw new Error("Expected authoring document to be invalid.");
	}

	assertIncludes(result.errors, expectedError, "Expected document error.");
}

function expectValidTransaction(
	document: LevelEditorAuthoringDocument,
	transaction: LevelEditorAuthoringTransaction,
): void {
	const result = validateLevelEditorAuthoringTransaction(document, transaction);

	if (!result.ok) {
		throw new Error(
			`Expected authoring transaction to validate:\n${result.errors.join("\n")}`,
		);
	}
}

function expectInvalidTransaction(
	document: LevelEditorAuthoringDocument,
	transaction: LevelEditorAuthoringTransaction,
	expectedError: string,
): void {
	const result = validateLevelEditorAuthoringTransaction(document, transaction);

	if (result.ok) {
		throw new Error("Expected authoring transaction to be invalid.");
	}

	assertIncludes(result.errors, expectedError, "Expected transaction error.");
}

function expectOwnerWriteFailure(
	document: LevelEditorAuthoringDocument,
	transaction: LevelEditorAuthoringTransaction,
	options: Parameters<typeof buildLevelEditorAuthoringOwnerWritePlan>[2],
	expectedError: string,
): void {
	try {
		buildLevelEditorAuthoringOwnerWritePlan(document, transaction, options);
		throw new Error("Expected owner write plan to fail.");
	} catch (error) {
		if (!(error instanceof Error) || !error.message.includes(expectedError)) {
			throw error;
		}
	}
}

function expectWriteArtifact(
	writePlan: ReturnType<typeof buildLevelEditorAuthoringWritePlan>,
	purpose: string,
	targetFile: string,
): void {
	const artifact = writePlan.artifacts.find((item) => item.purpose === purpose);

	if (!artifact) {
		throw new Error(`Expected write plan artifact "${purpose}".`);
	}

	assertEqual(
		artifact.targetFile,
		targetFile,
		`Expected ${purpose} artifact to target the owner file.`,
	);

	if (!artifact.serializedPayload.endsWith("\n")) {
		throw new Error(
			`Expected ${purpose} artifact serialization to end with newline.`,
		);
	}
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
	if (actual !== expected) {
		throw new Error(
			`${message} Expected ${String(expected)}, received ${String(actual)}.`,
		);
	}
}

function assertAtLeast(
	actual: number,
	expected: number,
	message: string,
): void {
	if (actual < expected) {
		throw new Error(
			`${message} Expected at least ${expected}, received ${actual}.`,
		);
	}
}

function assertIncludes(
	items: readonly string[],
	expected: string,
	message: string,
): void {
	if (!items.some((item) => item.includes(expected))) {
		throw new Error(`${message} Missing ${expected}.`);
	}
}

function asRecord(value: unknown): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error("Expected record value.");
	}

	return value as Record<string, unknown>;
}

function cloneDocument(
	document: LevelEditorAuthoringDocument,
): LevelEditorAuthoringDocument {
	return JSON.parse(JSON.stringify(document)) as LevelEditorAuthoringDocument;
}
