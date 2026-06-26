import {
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { buildLevelEditorAiApplyPlanQueueEntry } from "../src/app/editor/levelEditorAiAssetLabModel.js";
import { buildAuthoringSaveTransaction } from "../src/app/editor/levelEditorAuthoringClient.js";
import { buildLevelEditorWorkspaceModel } from "../src/app/editor/levelEditorWorkspaceModel.js";
import type { EditorAiApplyToSelectionPlan } from "../src/game/editor/ai/index.js";
import {
	LEVEL_EDITOR_MISSING_FILE_HASH,
	type LevelEditorAuthoringOperationData,
	type LevelEditorAuthoringSaveTargetData,
	type LevelEditorAuthoringSaveTransactionData,
	PUBLISHED_LEVEL_TRANSFORMS_TARGET_FILE,
	buildLevelEditorAuthoringSaveWritePlan,
	buildLevelEditorOwnerRegistry,
	hashLevelEditorAuthoringFileContent,
	mergePublishedLevelInstanceComponentOverrides,
	mergePublishedLevelInstanceComponentRemovals,
	mergePublishedLevelInstanceInsertions,
	mergePublishedLevelInstancePrefabOverrides,
	mergePublishedLevelInstanceRemovals,
	mergePublishedTransformOverrides,
	parsePublishedLevelInstanceComponentOverrides,
	parsePublishedLevelInstanceComponentRemovals,
	parsePublishedLevelInstanceInsertions,
	parsePublishedLevelInstancePrefabOverrides,
	parsePublishedLevelInstanceRemovals,
	parsePublishedLevelTransformOverrides,
	publishLevelEditorTransformTransaction,
	rollbackLevelEditorPublishChangeset,
	serializePublishedLevelTransformOverridesSource,
} from "../src/game/editor/authoring/index.js";
import { saveLevelEditorAuthoringTransaction } from "../src/game/editor/authoring/persistence.js";
import { defaultRuntimeSceneManifests } from "../src/game/levels/index.js";
import {
	authoringTargetStatus,
	handleLevelEditorAuthoringPersistenceRequest,
	handleLevelEditorLevelOwnerWriteRequest,
	handleLevelEditorLocalPublishRequest,
} from "../src/pages/api/editor/authoring/_shared.js";
import { prerender as dryRunRoutePrerender } from "../src/pages/api/editor/authoring/dry-run.json.js";
import { prerender as publishLocalRoutePrerender } from "../src/pages/api/editor/authoring/publish-local.json.js";
import { prerender as saveLevelRoutePrerender } from "../src/pages/api/editor/authoring/save-level.json.js";
import { prerender as saveRoutePrerender } from "../src/pages/api/editor/authoring/save.json.js";
import {
	GET as getLevelEditorAuthoringStatusRoute,
	POST as postLevelEditorAuthoringStatusRoute,
	prerender as statusRoutePrerender,
} from "../src/pages/api/editor/authoring/status.json.js";

const registry = buildLevelEditorOwnerRegistry();
for (const [routeName, prerender] of [
	["status", statusRoutePrerender],
	["dry-run", dryRunRoutePrerender],
	["save", saveRoutePrerender],
	["save-level", saveLevelRoutePrerender],
	["publish-local", publishLocalRoutePrerender],
] as const) {
	assertEqual(
		prerender,
		false,
		`Expected authoring ${routeName} API route to opt out of static prerendering.`,
	);
}
assertEqual(
	registry.runtimeSceneIds.length,
	defaultRuntimeSceneManifests.length,
	"Expected owner registry to be derived from the runtime scene catalog.",
);

for (const manifest of defaultRuntimeSceneManifests) {
	const targets = registry.targets.filter(
		(target) => target.runtimeSceneId === manifest.id,
	);

	for (const ownerKind of [
		"level",
		"prefab",
		"asset",
		"render-profile",
		"generated-module",
	] as const) {
		assert(
			targets.some((target) => target.ownerKind === ownerKind),
			`Expected ${manifest.id} to have a ${ownerKind} owner target.`,
		);
	}

	assert(
		targets.some(
			(target) =>
				target.generatedOwnerKind === "authoring-save" &&
				target.writableByAuthoringSave,
		),
		`Expected ${manifest.id} to have a writable generated authoring-save target.`,
	);
	assert(
		targets.some(
			(target) =>
				target.generatedOwnerKind === "published-transforms" &&
				target.targetFile === PUBLISHED_LEVEL_TRANSFORMS_TARGET_FILE &&
				target.writableByAuthoringSave === false,
		),
		`Expected ${manifest.id} to register the generated published-transform runtime owner.`,
	);
}

let inspectedSceneSaveCount = 0;

for (const manifest of defaultRuntimeSceneManifests) {
	const workspace = buildLevelEditorWorkspaceModel({
		selectedRuntimeSceneId: manifest.id,
	});
	const object = workspace.objects.find((candidate) =>
		candidate.fields.some((field) => !field.readOnly),
	);
	const field = object?.fields.find((candidate) => !candidate.readOnly);

	if (!object || !field) {
		throw new Error(
			`Expected ${manifest.id} to expose at least one editable inspector field.`,
		);
	}

	const inspectorTransaction = buildAuthoringSaveTransaction({
		workspace,
		edits: [
			{
				stableId: object.stableId,
				path: field.path,
				label: field.label,
				before: field.value,
				after: nextInspectorFieldValue(field.value),
			},
		],
		baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
	});
	const operation = inspectorTransaction.targets[0]?.operations[0];

	if (!operation) {
		throw new Error(
			`Expected ${manifest.id} inspector save to emit an operation.`,
		);
	}

	assertEqual(
		operation.kind,
		"replace-level-instance",
		`Expected ${manifest.id} inspector field edits to save as level-instance operations.`,
	);
	assertEqual(
		operation.ownerKind,
		"level",
		`Expected ${manifest.id} inspector field edits to target the level owner.`,
	);
	assertEqual(
		operation.ownerTargetId,
		`${manifest.id}:level`,
		`Expected ${manifest.id} inspector field edits to target the selected scene level owner.`,
	);
	inspectedSceneSaveCount += 1;
}

assertEqual(
	inspectedSceneSaveCount,
	defaultRuntimeSceneManifests.length,
	"Expected inspector save coverage for every runtime scene.",
);

const transaction = createTransaction({
	runtimeSceneId: "portal_arena_runtime",
	saveTargetId: "portal_arena_runtime:generated:authoring-save",
	baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
	ownerTargetId: "portal_arena_runtime:level",
});
const transactionTarget = requireSaveTarget(transaction);
const transactionOperation = requireSaveOperation(transactionTarget);
const writePlan = buildLevelEditorAuthoringSaveWritePlan({
	transaction,
	ownerRegistry: registry,
});
const artifact = writePlan.artifacts[0];

if (!artifact) {
	throw new Error("Expected save write plan to contain one artifact.");
}

assertEqual(
	artifact.targetFile,
	"src/game/editor/authoring/generated/portal_arena_runtime.authoringSave.ts",
	"Expected authoring save to target the scoped generated authoring module.",
);
assertIncludes(
	artifact.serializedPayload,
	"@generated by levelEditorAuthoringSave.v1",
	"Expected generated save module to include the bounded writer marker.",
);
assertEqual(
	artifact.payload.writesRuntimeData,
	false,
	"Expected authoring save module to preserve runtime/editor separation.",
);
assertIncludes(
	artifact.payload.affectedOwnerTargets.map((target) => target.id),
	"portal_arena_runtime:level",
	"Expected generated save module to record affected owner provenance.",
);

const aiApplyQueueEntry = buildLevelEditorAiApplyPlanQueueEntry(
	createAiApplyPlan(),
);
const aiApplySaveOperations = aiApplyQueueEntry.saveOperations ?? [];
assertEqual(
	aiApplySaveOperations.length,
	2,
	"Expected AI apply plans to emit generated save operations for the authoring queue.",
);
assertIncludes(
	aiApplySaveOperations.map((operation) => operation.ownerTargetId),
	"portal_arena_runtime:assets",
	"Expected AI apply generated save operations to affect the asset owner target.",
);
assertEqual(
	aiApplySaveOperations.find(
		(operation) => operation.kind === "replace-level-instance",
	)?.ownerTargetId,
	"portal_arena_runtime:level",
	"Expected AI generated save operations to affect the level owner target.",
);

const aiApplyWritePlan = buildLevelEditorAuthoringSaveWritePlan({
	transaction: {
		schemaVersion: 1,
		transactionId: "save-contract-ai-apply",
		runtimeSceneId: "portal_arena_runtime",
		authoringValidation: {
			status: "valid",
			contract: "LevelEditorAuthoringContract",
			contentHash: "fnv1a32:bbbbbbbb",
		},
		targets: [
			{
				targetId: "portal_arena_runtime:generated:authoring-save",
				baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
				operations: aiApplySaveOperations,
			},
		],
	},
	ownerRegistry: registry,
});
const aiApplyArtifact = aiApplyWritePlan.artifacts[0];

if (!aiApplyArtifact) {
	throw new Error("Expected AI apply save write plan to contain one artifact.");
}

assertIncludes(
	aiApplyArtifact.payload.affectedOwnerTargets.map((target) => target.id),
	"portal_arena_runtime:level",
	"Expected AI apply generated save module to record affected level owner provenance.",
);
assertIncludes(
	aiApplyArtifact.payload.affectedOwnerTargets.map((target) => target.id),
	"portal_arena_runtime:assets",
	"Expected AI apply generated save module to record affected asset owner provenance.",
);
assertIncludes(
	JSON.stringify(aiApplyArtifact.payload.operations),
	"editor-ai-apply-selection",
	"Expected AI apply generated save payload to preserve its source plan.",
);

assertValidationFailure(
	{
		...transaction,
		targets: [
			{
				...transactionTarget,
				targetId: "portal_arena_runtime:level",
			},
		],
	},
	"is not writable by the level editor save command",
);

assertValidationFailure(
	{
		...transaction,
		targets: [
			{
				...transactionTarget,
				operations: [
					{
						...transactionOperation,
						previewOnly: true,
					} as unknown as LevelEditorAuthoringOperationData,
				],
			},
		],
	},
	"preview-only and cannot be saved",
);

assertValidationFailure(
	{
		...transaction,
		targets: [
			{
				...transactionTarget,
				operations: [
					{
						...transactionOperation,
						ownerTargetId: "portal_arena_runtime:assets",
					},
				],
			},
		],
	},
	"does not match owner target",
);

const publishedTransformTransaction = createTransaction({
	runtimeSceneId: "portal_arena_runtime",
	saveTargetId: "portal_arena_runtime:generated:authoring-save",
	baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
	ownerTargetId: "portal_arena_runtime:level",
	transactionId: "publish-contract-player-transform",
});
const mergedPublishedOverrides = mergePublishedTransformOverrides({
	existingOverrides: [],
	transaction: publishedTransformTransaction,
});
const nonPlayerPublishedTransformTransaction = createTransaction({
	runtimeSceneId: "portal_arena_runtime",
	saveTargetId: "portal_arena_runtime:generated:authoring-save",
	baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
	ownerTargetId: "portal_arena_runtime:level",
	transactionId: "publish-contract-non-player-transform",
	subjectId: "portal-arena:portal:observatory",
	position: [2, 0, -6],
});
const mergedNonPlayerPublishedOverrides = mergePublishedTransformOverrides({
	existingOverrides: mergedPublishedOverrides,
	transaction: nonPlayerPublishedTransformTransaction,
});
const publishedPlacementTransaction = createPlacementTransaction({
	runtimeSceneId: "portal_arena_runtime",
	saveTargetId: "portal_arena_runtime:generated:authoring-save",
	baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
	ownerTargetId: "portal_arena_runtime:level",
	transactionId: "publish-contract-portal-placement",
	stableId: "portal_arena:portal_gate:draft-save-contract",
	prefabId: "portal_gate",
	position: [4, 0, -8],
});
const mergedPublishedInsertions = mergePublishedLevelInstanceInsertions({
	existingInsertions: [],
	transaction: publishedPlacementTransaction,
});
assertEqual(
	mergedPublishedInsertions[0]?.instance.stableId,
	"portal_arena:portal_gate:draft-save-contract",
	"Expected generated insertion merge to preserve the placed stable ID.",
);
const publishedPrefabReplacementTransaction =
	createPrefabReplacementTransaction({
		runtimeSceneId: "prototype_arena_runtime",
		saveTargetId: "prototype_arena_runtime:generated:authoring-save",
		baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
		ownerTargetId: "prototype_arena_runtime:level",
		transactionId: "publish-contract-ingredient-prefab-replacement",
		stableId: "ingredient:north",
		prefabId: "arena_floor",
	});
const mergedPublishedPrefabOverrides =
	mergePublishedLevelInstancePrefabOverrides({
		existingPrefabOverrides: [],
		transaction: publishedPrefabReplacementTransaction,
	});
assertEqual(
	mergedPublishedPrefabOverrides[0]?.stableId,
	"ingredient:north",
	"Expected prefab replacement merge to preserve the target stable ID.",
);
assertEqual(
	mergedPublishedPrefabOverrides[0]?.prefabId,
	"arena_floor",
	"Expected prefab replacement merge to preserve the replacement prefab ID.",
);
const generatedInsertionRemovalTransaction = createRemovalTransaction({
	runtimeSceneId: "portal_arena_runtime",
	saveTargetId: "portal_arena_runtime:generated:authoring-save",
	baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
	ownerTargetId: "portal_arena_runtime:level",
	transactionId: "publish-contract-generated-placement-removal",
	stableId: "portal_arena:portal_gate:draft-save-contract",
});
const mergedInsertionsAfterGeneratedRemoval =
	mergePublishedLevelInstanceInsertions({
		existingInsertions: mergedPublishedInsertions,
		transaction: generatedInsertionRemovalTransaction,
	});
const mergedRemovalsAfterGeneratedRemoval = mergePublishedLevelInstanceRemovals(
	{
		existingRemovals: [],
		existingInsertions: mergedPublishedInsertions,
		transaction: generatedInsertionRemovalTransaction,
	},
);
assertEqual(
	mergedInsertionsAfterGeneratedRemoval.some(
		(insertion) =>
			insertion.instance.stableId ===
			"portal_arena:portal_gate:draft-save-contract",
	),
	false,
	"Expected removing a generated insertion to clear the generated insertion record.",
);
assertEqual(
	mergedRemovalsAfterGeneratedRemoval.length,
	0,
	"Expected removing a generated insertion to avoid a runtime tombstone for generated-only data.",
);
const publishedComponentTransaction = createComponentTransaction({
	runtimeSceneId: "portal_arena_runtime",
	saveTargetId: "portal_arena_runtime:generated:authoring-save",
	baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
	ownerTargetId: "portal_arena_runtime:level",
	transactionId: "publish-contract-portal-component",
	stableId: "portal-arena:portal:observatory",
	componentName: "Portal",
	value: {
		targetRuntimeSceneId: "observatory_runtime",
		label: "Observatory Contract Portal",
	},
});
const mergedPublishedComponentOverrides =
	mergePublishedLevelInstanceComponentOverrides({
		existingComponentOverrides: [],
		transaction: publishedComponentTransaction,
	});
assertEqual(
	mergedPublishedComponentOverrides[0]?.componentName,
	"Portal",
	"Expected generated component merge to preserve the component name.",
);
const publishedRenderableComponentTransaction = createComponentTransaction({
	runtimeSceneId: "portal_arena_runtime",
	saveTargetId: "portal_arena_runtime:generated:authoring-save",
	baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
	ownerTargetId: "portal_arena_runtime:level",
	transactionId: "publish-contract-renderable-component",
	stableId: "player",
	componentName: "Renderable",
	value: {
		meshId: "mesh_portal_gate",
		materialId: "material_player",
	},
});
const mergedPublishedRenderableComponentOverrides =
	mergePublishedLevelInstanceComponentOverrides({
		existingComponentOverrides: mergedPublishedComponentOverrides,
		transaction: publishedRenderableComponentTransaction,
	});
const mergedRenderableComponentOverride =
	mergedPublishedRenderableComponentOverrides.find(
		(override) =>
			override.stableId === "player" && override.componentName === "Renderable",
	);

assertEqual(
	mergedRenderableComponentOverride?.value.meshId,
	"mesh_portal_gate",
	"Expected generated Renderable component merge to preserve the mesh reference.",
);
assertEqual(
	mergedRenderableComponentOverride?.value.materialId,
	"material_player",
	"Expected generated Renderable component merge to preserve the material reference.",
);
const publishedComponentRemovalTransaction = createComponentRemovalTransaction({
	runtimeSceneId: "portal_arena_runtime",
	saveTargetId: "portal_arena_runtime:generated:authoring-save",
	baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
	ownerTargetId: "portal_arena_runtime:level",
	transactionId: "publish-contract-portal-component-removal",
	stableId: "portal-arena:portal:observatory",
	componentName: "Portal",
});
const mergedPublishedComponentRemovals =
	mergePublishedLevelInstanceComponentRemovals({
		existingComponentRemovals: [],
		transaction: publishedComponentRemovalTransaction,
	});
assertEqual(
	mergedPublishedComponentRemovals[0]?.componentName,
	"Portal",
	"Expected generated component removal merge to preserve the component name.",
);
const publishedInstanceRemovalTransaction = createRemovalTransaction({
	runtimeSceneId: "prototype_arena_runtime",
	saveTargetId: "prototype_arena_runtime:generated:authoring-save",
	baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
	ownerTargetId: "prototype_arena_runtime:level",
	transactionId: "publish-contract-ingredient-removal",
	stableId: "ingredient:north",
});
const mergedPublishedInstanceRemovals = mergePublishedLevelInstanceRemovals({
	existingRemovals: [],
	transaction: publishedInstanceRemovalTransaction,
});
assertEqual(
	mergedPublishedInstanceRemovals[0]?.stableId,
	"ingredient:north",
	"Expected generated instance removal merge to preserve the removed stable ID.",
);
assertEqual(
	mergedPublishedInstanceRemovals[0]?.runtimeSceneId,
	"prototype_arena_runtime",
	"Expected generated instance removal merge to preserve the runtime scene ID.",
);
const readinessRequiredRemovalTransaction = createRemovalTransaction({
	runtimeSceneId: "portal_arena_runtime",
	saveTargetId: "portal_arena_runtime:generated:authoring-save",
	baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
	ownerTargetId: "portal_arena_runtime:level",
	transactionId: "publish-contract-rejects-required-removal",
	stableId: "portal-arena:portal:observatory",
});
assertThrows(
	() =>
		mergePublishedLevelInstanceRemovals({
			existingRemovals: [],
			transaction: readinessRequiredRemovalTransaction,
		}),
	"cannot remove readiness-required stable ID",
	"Expected generated owner writes to reject removal of readiness-required level instances.",
);
const readinessRequiredPrefabReplacementTransaction =
	createPrefabReplacementTransaction({
		runtimeSceneId: "portal_arena_runtime",
		saveTargetId: "portal_arena_runtime:generated:authoring-save",
		baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
		ownerTargetId: "portal_arena_runtime:level",
		transactionId: "publish-contract-rejects-required-prefab-replacement",
		stableId: "portal-arena:portal:observatory",
		prefabId: "portal_gate",
	});
assertThrows(
	() =>
		mergePublishedLevelInstancePrefabOverrides({
			existingPrefabOverrides: [],
			transaction: readinessRequiredPrefabReplacementTransaction,
		}),
	"cannot replace prefab for readiness-required stable ID",
	"Expected generated owner writes to reject prefab replacement for readiness-required level instances.",
);
const mixedUnsupportedPublishTransaction: LevelEditorAuthoringSaveTransactionData =
	{
		...publishedTransformTransaction,
		transactionId: "publish-contract-rejects-asset-operation",
		targets: [
			{
				...requireSaveTarget(publishedTransformTransaction),
				operations: [
					requireSaveOperation(
						requireSaveTarget(publishedTransformTransaction),
					),
					{
						kind: "replace-asset",
						ownerKind: "asset",
						ownerTargetId: "portal_arena_runtime:assets",
						subjectId: "asset:texture_portal_arena_equirectangular_sky",
						payload: {
							operation: {
								kind: "replace-component-asset-reference",
								stableId: "player",
								fieldPath: "Renderable.materialId",
							},
						},
					},
				],
			},
		],
	};

assertEqual(
	mergedPublishedOverrides[0]?.stableId,
	"player",
	"Expected publish proof to create a player transform override.",
);
assertEqual(
	mergedPublishedOverrides[0]?.transform.position?.join(","),
	"0,1.5,0",
	"Expected publish proof to preserve the typed set-transform position.",
);
assertEqual(
	mergedNonPlayerPublishedOverrides
		.find((override) => override.stableId === "portal-arena:portal:observatory")
		?.transform.position?.join(","),
	"2,0,-6",
	"Expected publish proof to accept a non-player stable level instance.",
);

assertPublishFailure(
	() =>
		mergePublishedTransformOverrides({
			existingOverrides: [],
			transaction: createTransaction({
				runtimeSceneId: "portal_arena_runtime",
				saveTargetId: "portal_arena_runtime:generated:authoring-save",
				baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
				ownerTargetId: "portal_arena_runtime:level",
				subjectId: "missing-stable-id",
			}),
		}),
	'does not contain stable ID "missing-stable-id"',
);
assertPublishFailure(
	() =>
		mergePublishedTransformOverrides({
			existingOverrides: [],
			transaction: mixedUnsupportedPublishTransaction,
		}),
	"Object Library Replacement",
);
assertPublishFailure(
	() =>
		mergePublishedTransformOverrides({
			existingOverrides: [],
			transaction: mixedUnsupportedPublishTransaction,
		}),
	"draft-only",
);

const tempRoot = await mkdtemp(join(tmpdir(), "level-editor-save-contract-"));

try {
	const dryRun = await saveLevelEditorAuthoringTransaction({
		appRoot: tempRoot,
		transaction,
		dryRun: true,
	});

	assertEqual(dryRun.dryRun, true, "Expected dry run result to be marked.");
	assertEqual(
		dryRun.artifacts[0]?.wroteFile,
		false,
		"Expected dry run to avoid file writes.",
	);

	const saveResult = await saveLevelEditorAuthoringTransaction({
		appRoot: tempRoot,
		transaction,
	});
	const savedArtifact = saveResult.artifacts[0];

	if (!savedArtifact) {
		throw new Error("Expected save result to include an artifact.");
	}

	const savedSource = await readFile(savedArtifact.absolutePath, "utf8");
	assertIncludes(
		savedSource,
		"levelEditorAuthoringSaveModule",
		"Expected save command to write the generated authoring module export.",
	);

	await assertPersistenceFailure(
		saveLevelEditorAuthoringTransaction({
			appRoot: tempRoot,
			transaction,
		}),
		"base hash mismatch",
	);

	const currentHash = hashLevelEditorAuthoringFileContent(savedSource);
	const updateTransaction = createTransaction({
		runtimeSceneId: "portal_arena_runtime",
		saveTargetId: "portal_arena_runtime:generated:authoring-save",
		baseHash: currentHash,
		ownerTargetId: "portal_arena_runtime:level",
		transactionId: "save-contract-update",
		subjectId: "portal-arena:portal:observatory",
	});
	const updateResult = await saveLevelEditorAuthoringTransaction({
		appRoot: tempRoot,
		transaction: updateTransaction,
	});

	assertEqual(
		updateResult.artifacts[0]?.currentHash,
		currentHash,
		"Expected update to verify the current base hash before writing.",
	);

	const nonGeneratedTransaction = createTransaction({
		runtimeSceneId: "prototype_arena_runtime",
		saveTargetId: "prototype_arena_runtime:generated:authoring-save",
		baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
		ownerTargetId: "prototype_arena_runtime:level",
		transactionId: "save-contract-non-generated",
	});
	const nonGeneratedTransactionTarget = requireSaveTarget(
		nonGeneratedTransaction,
	);
	const nonGeneratedTarget = registry.targets.find(
		(target) =>
			target.id === "prototype_arena_runtime:generated:authoring-save",
	);

	if (!nonGeneratedTarget) {
		throw new Error("Expected prototype generated authoring-save target.");
	}

	const nonGeneratedPath = resolve(tempRoot, nonGeneratedTarget.targetFile);
	const nonGeneratedSource = "export const handwritten = true;\n";
	await mkdir(dirname(nonGeneratedPath), { recursive: true });
	await writeFile(nonGeneratedPath, nonGeneratedSource, "utf8");

	await assertPersistenceFailure(
		saveLevelEditorAuthoringTransaction({
			appRoot: tempRoot,
			transaction: {
				...nonGeneratedTransaction,
				targets: [
					{
						...nonGeneratedTransactionTarget,
						baseHash: hashLevelEditorAuthoringFileContent(nonGeneratedSource),
					},
				],
			},
		}),
		"is not marked as a level editor generated save module",
	);
} finally {
	await rm(tempRoot, { recursive: true, force: true });
}

const publishedTransformTempRoot = await mkdtemp(
	join(tmpdir(), "level-editor-published-transform-contract-"),
);

try {
	const publishedTransformPath = resolve(
		publishedTransformTempRoot,
		PUBLISHED_LEVEL_TRANSFORMS_TARGET_FILE,
	);
	const initialPublishedTransformSource =
		serializePublishedLevelTransformOverridesSource([]);
	const initialPublishedTransformHash = hashLevelEditorAuthoringFileContent(
		initialPublishedTransformSource,
	);
	await mkdir(dirname(publishedTransformPath), { recursive: true });
	await writeFile(
		publishedTransformPath,
		initialPublishedTransformSource,
		"utf8",
	);

	const publishDryRun = await publishLevelEditorTransformTransaction({
		appRoot: publishedTransformTempRoot,
		transaction: publishedTransformTransaction,
		baseHash: initialPublishedTransformHash,
		dryRun: true,
	});

	assertEqual(
		publishDryRun.wroteFile,
		false,
		"Expected publish dry run to avoid generated runtime owner writes.",
	);
	assertIncludes(
		publishDryRun.publishedStableIds,
		"player",
		"Expected publish dry run to report the changed stable player instance.",
	);
	assertEqual(
		await readFile(publishedTransformPath, "utf8"),
		initialPublishedTransformSource,
		"Expected publish dry run to leave the generated runtime owner unchanged.",
	);

	const publishSave = await publishLevelEditorTransformTransaction({
		appRoot: publishedTransformTempRoot,
		transaction: publishedTransformTransaction,
		baseHash: initialPublishedTransformHash,
	});
	const updatedPublishedTransformSource = await readFile(
		publishedTransformPath,
		"utf8",
	);
	const updatedPublishedTransformOverrides =
		parsePublishedLevelTransformOverrides(updatedPublishedTransformSource);

	assertEqual(
		publishSave.wroteFile,
		true,
		"Expected publish to write the generated runtime owner file.",
	);
	assertEqual(
		publishSave.changeset.entries[0]?.priorContent,
		initialPublishedTransformSource,
		"Expected publish changeset to retain the full prior generated owner contents.",
	);
	assertEqual(
		publishSave.changeset.entries[0]?.priorHash,
		initialPublishedTransformHash,
		"Expected publish changeset to record the prior generated owner hash.",
	);
	assertEqual(
		publishSave.changeset.entries[0]?.currentContent,
		updatedPublishedTransformSource,
		"Expected publish changeset to stage the full generated owner contents before writing.",
	);
	assertEqual(
		publishSave.changeset.entries[0]?.currentHash,
		hashLevelEditorAuthoringFileContent(updatedPublishedTransformSource),
		"Expected publish changeset to record the staged generated owner content hash.",
	);
	assertEqual(
		updatedPublishedTransformOverrides[0]?.stableId,
		"player",
		"Expected publish to persist the player transform in generated runtime owner data.",
	);

	const noOpPublish = await publishLevelEditorTransformTransaction({
		appRoot: publishedTransformTempRoot,
		transaction: publishedTransformTransaction,
		baseHash: hashLevelEditorAuthoringFileContent(
			updatedPublishedTransformSource,
		),
	});

	assertEqual(
		noOpPublish.wroteFile,
		false,
		"Expected publishing identical generated runtime owner bytes to report a no-op write.",
	);
	assertEqual(
		noOpPublish.changeset.entries[0]?.noOp,
		true,
		"Expected publish changeset to identify byte-identical generated owner output.",
	);
	assertEqual(
		await readFile(publishedTransformPath, "utf8"),
		updatedPublishedTransformSource,
		"Expected no-op publish to leave generated runtime owner bytes unchanged.",
	);

	const nonPlayerPublishSave = await publishLevelEditorTransformTransaction({
		appRoot: publishedTransformTempRoot,
		transaction: nonPlayerPublishedTransformTransaction,
		baseHash: hashLevelEditorAuthoringFileContent(
			updatedPublishedTransformSource,
		),
	});
	const updatedNonPlayerPublishedTransformSource = await readFile(
		publishedTransformPath,
		"utf8",
	);
	const updatedNonPlayerPublishedTransformOverrides =
		parsePublishedLevelTransformOverrides(
			updatedNonPlayerPublishedTransformSource,
		);

	assertEqual(
		nonPlayerPublishSave.wroteFile,
		true,
		"Expected non-player publish to write the generated runtime owner file.",
	);
	assertIncludes(
		nonPlayerPublishSave.publishedStableIds,
		"portal-arena:portal:observatory",
		"Expected non-player publish to report the portal stable ID.",
	);
	assertEqual(
		updatedNonPlayerPublishedTransformOverrides
			.find(
				(override) => override.stableId === "portal-arena:portal:observatory",
			)
			?.transform.position?.join(","),
		"2,0,-6",
		"Expected publish to persist the non-player portal transform in generated runtime owner data.",
	);

	const placementPublishSave = await publishLevelEditorTransformTransaction({
		appRoot: publishedTransformTempRoot,
		transaction: publishedPlacementTransaction,
		baseHash: hashLevelEditorAuthoringFileContent(
			updatedNonPlayerPublishedTransformSource,
		),
	});
	const updatedPlacementPublishedSource = await readFile(
		publishedTransformPath,
		"utf8",
	);
	const updatedPlacementInsertions = parsePublishedLevelInstanceInsertions(
		updatedPlacementPublishedSource,
	);

	assertEqual(
		placementPublishSave.wroteFile,
		true,
		"Expected placement publish to write the generated runtime owner file.",
	);
	assertIncludes(
		placementPublishSave.publishedStableIds,
		"portal_arena:portal_gate:draft-save-contract",
		"Expected placement publish to report the inserted stable ID.",
	);
	assertEqual(
		placementPublishSave.insertions[0]?.instance.prefabId,
		"portal_gate",
		"Expected placement publish to return generated insertion data.",
	);
	assertEqual(
		updatedPlacementInsertions[0]?.instance.stableId,
		"portal_arena:portal_gate:draft-save-contract",
		"Expected placement publish to persist the inserted level instance.",
	);
	assertEqual(
		updatedPlacementInsertions[0]?.instance.transform?.position?.join(","),
		"4,0,-8",
		"Expected placement publish to persist the authored placement transform.",
	);

	const prefabReplacementPublishSave =
		await publishLevelEditorTransformTransaction({
			appRoot: publishedTransformTempRoot,
			transaction: publishedPrefabReplacementTransaction,
			baseHash: hashLevelEditorAuthoringFileContent(
				updatedPlacementPublishedSource,
			),
		});
	const updatedPrefabReplacementPublishedSource = await readFile(
		publishedTransformPath,
		"utf8",
	);
	const updatedPrefabOverrides = parsePublishedLevelInstancePrefabOverrides(
		updatedPrefabReplacementPublishedSource,
	);

	assertEqual(
		prefabReplacementPublishSave.wroteFile,
		true,
		"Expected prefab replacement publish to write the generated runtime owner file.",
	);
	assertIncludes(
		prefabReplacementPublishSave.publishedStableIds,
		"ingredient:north",
		"Expected prefab replacement publish to report the replaced stable ID.",
	);
	assertEqual(
		prefabReplacementPublishSave.prefabOverrides[0]?.prefabId,
		"arena_floor",
		"Expected prefab replacement publish to return generated prefab override data.",
	);
	assertEqual(
		updatedPrefabOverrides[0]?.stableId,
		"ingredient:north",
		"Expected prefab replacement publish to persist the target stable ID.",
	);
	assertEqual(
		updatedPrefabOverrides[0]?.prefabId,
		"arena_floor",
		"Expected prefab replacement publish to persist the replacement prefab ID.",
	);

	const generatedInsertionComponentPublishSave =
		await publishLevelEditorTransformTransaction({
			appRoot: publishedTransformTempRoot,
			transaction: createComponentTransaction({
				runtimeSceneId: "portal_arena_runtime",
				saveTargetId: "portal_arena_runtime:generated:authoring-save",
				baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
				ownerTargetId: "portal_arena_runtime:level",
				transactionId: "publish-contract-generated-portal-component",
				stableId: "portal_arena:portal_gate:draft-save-contract",
				componentName: "Portal",
				value: {
					targetRuntimeSceneId: "prototype_arena_runtime",
					label: "Generated Portal Override",
				},
			}),
			baseHash: hashLevelEditorAuthoringFileContent(
				updatedPrefabReplacementPublishedSource,
			),
		});
	const updatedGeneratedInsertionComponentPublishedSource = await readFile(
		publishedTransformPath,
		"utf8",
	);
	const updatedGeneratedInsertionComponentOverrides =
		parsePublishedLevelInstanceComponentOverrides(
			updatedGeneratedInsertionComponentPublishedSource,
		);

	assertEqual(
		generatedInsertionComponentPublishSave.wroteFile,
		true,
		"Expected generated insertion component publish to write the generated runtime owner file.",
	);
	assertIncludes(
		generatedInsertionComponentPublishSave.publishedStableIds,
		"portal_arena:portal_gate:draft-save-contract",
		"Expected generated insertion component publish to report the inserted stable ID.",
	);
	assertEqual(
		updatedGeneratedInsertionComponentOverrides[0]?.stableId,
		"portal_arena:portal_gate:draft-save-contract",
		"Expected component publish to accept an existing generated insertion stable ID.",
	);
	assertEqual(
		updatedGeneratedInsertionComponentOverrides[0]?.value.label,
		"Generated Portal Override",
		"Expected component publish to persist an override for a generated insertion.",
	);

	const generatedInsertionRemovalPublishSave =
		await publishLevelEditorTransformTransaction({
			appRoot: publishedTransformTempRoot,
			transaction: generatedInsertionRemovalTransaction,
			baseHash: hashLevelEditorAuthoringFileContent(
				updatedGeneratedInsertionComponentPublishedSource,
			),
		});
	const updatedGeneratedInsertionRemovalPublishedSource = await readFile(
		publishedTransformPath,
		"utf8",
	);
	const updatedGeneratedInsertionRemovalInsertions =
		parsePublishedLevelInstanceInsertions(
			updatedGeneratedInsertionRemovalPublishedSource,
		);
	const updatedGeneratedInsertionRemovalComponentOverrides =
		parsePublishedLevelInstanceComponentOverrides(
			updatedGeneratedInsertionRemovalPublishedSource,
		);
	const updatedGeneratedInsertionRemovalInstanceRemovals =
		parsePublishedLevelInstanceRemovals(
			updatedGeneratedInsertionRemovalPublishedSource,
		);

	assertEqual(
		generatedInsertionRemovalPublishSave.wroteFile,
		true,
		"Expected generated insertion removal publish to write the generated runtime owner file.",
	);
	assertIncludes(
		generatedInsertionRemovalPublishSave.publishedStableIds,
		"portal_arena:portal_gate:draft-save-contract",
		"Expected generated insertion removal publish to report the removed stable ID.",
	);
	assertEqual(
		updatedGeneratedInsertionRemovalInsertions.some(
			(insertion) =>
				insertion.instance.stableId ===
				"portal_arena:portal_gate:draft-save-contract",
		),
		false,
		"Expected generated insertion removal publish to clear the insertion record.",
	);
	assertEqual(
		updatedGeneratedInsertionRemovalComponentOverrides.some(
			(override) =>
				override.stableId === "portal_arena:portal_gate:draft-save-contract",
		),
		false,
		"Expected generated insertion removal publish to clear dependent component overrides.",
	);
	assertEqual(
		updatedGeneratedInsertionRemovalInstanceRemovals.some(
			(removal) =>
				removal.stableId === "portal_arena:portal_gate:draft-save-contract",
		),
		false,
		"Expected generated insertion removal publish to avoid a runtime tombstone for generated-only data.",
	);

	const componentPublishSave = await publishLevelEditorTransformTransaction({
		appRoot: publishedTransformTempRoot,
		transaction: publishedComponentTransaction,
		baseHash: hashLevelEditorAuthoringFileContent(
			updatedGeneratedInsertionRemovalPublishedSource,
		),
	});
	const updatedComponentPublishedSource = await readFile(
		publishedTransformPath,
		"utf8",
	);
	const updatedComponentOverrides =
		parsePublishedLevelInstanceComponentOverrides(
			updatedComponentPublishedSource,
		);
	const updatedPortalComponentOverride = updatedComponentOverrides.find(
		(override) => override.stableId === "portal-arena:portal:observatory",
	);

	assertEqual(
		componentPublishSave.wroteFile,
		true,
		"Expected component publish to write the generated runtime owner file.",
	);
	assertIncludes(
		componentPublishSave.publishedStableIds,
		"portal-arena:portal:observatory",
		"Expected component publish to report the component override stable ID.",
	);
	assertEqual(
		componentPublishSave.componentOverrides[0]?.componentName,
		"Portal",
		"Expected component publish to return generated component override data.",
	);
	assertEqual(
		updatedPortalComponentOverride?.stableId,
		"portal-arena:portal:observatory",
		"Expected component publish to persist the target stable ID.",
	);
	assertEqual(
		updatedPortalComponentOverride?.value.label,
		"Observatory Contract Portal",
		"Expected component publish to persist the authored component value.",
	);

	const renderableComponentPublishSave =
		await publishLevelEditorTransformTransaction({
			appRoot: publishedTransformTempRoot,
			transaction: publishedRenderableComponentTransaction,
			baseHash: hashLevelEditorAuthoringFileContent(
				updatedComponentPublishedSource,
			),
		});
	const updatedRenderableComponentPublishedSource = await readFile(
		publishedTransformPath,
		"utf8",
	);
	const updatedRenderableComponentOverrides =
		parsePublishedLevelInstanceComponentOverrides(
			updatedRenderableComponentPublishedSource,
		);
	const updatedRenderableComponentOverride =
		updatedRenderableComponentOverrides.find(
			(override) =>
				override.stableId === "player" &&
				override.componentName === "Renderable",
		);

	assertEqual(
		renderableComponentPublishSave.wroteFile,
		true,
		"Expected Renderable component publish to write the generated runtime owner file.",
	);
	assertIncludes(
		renderableComponentPublishSave.publishedStableIds,
		"player",
		"Expected Renderable component publish to report the selected stable ID.",
	);
	assertEqual(
		renderableComponentPublishSave.componentOverrides.find(
			(override) =>
				override.stableId === "player" &&
				override.componentName === "Renderable",
		)?.componentName,
		"Renderable",
		"Expected Renderable component publish to return generated component override data.",
	);
	assertEqual(
		updatedRenderableComponentOverride?.value.meshId,
		"mesh_portal_gate",
		"Expected Renderable component publish to persist the mesh reference.",
	);
	assertEqual(
		updatedRenderableComponentOverride?.value.materialId,
		"material_player",
		"Expected Renderable component publish to persist the material reference.",
	);

	await assertPersistenceFailure(
		publishLevelEditorTransformTransaction({
			appRoot: publishedTransformTempRoot,
			transaction: createComponentTransaction({
				runtimeSceneId: "portal_arena_runtime",
				saveTargetId: "portal_arena_runtime:generated:authoring-save",
				baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
				ownerTargetId: "portal_arena_runtime:level",
				transactionId: "publish-contract-renderable-unknown-mesh",
				stableId: "player",
				componentName: "Renderable",
				value: {
					meshId: "mesh_missing_contract",
					materialId: "material_player",
				},
			}),
			baseHash: hashLevelEditorAuthoringFileContent(
				updatedRenderableComponentPublishedSource,
			),
		}),
		'operation.value.Renderable.meshId references unknown asset "mesh_missing_contract".',
	);
	await assertPersistenceFailure(
		publishLevelEditorTransformTransaction({
			appRoot: publishedTransformTempRoot,
			transaction: createComponentTransaction({
				runtimeSceneId: "portal_arena_runtime",
				saveTargetId: "portal_arena_runtime:generated:authoring-save",
				baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
				ownerTargetId: "portal_arena_runtime:level",
				transactionId: "publish-contract-renderable-wrong-mesh-kind",
				stableId: "player",
				componentName: "Renderable",
				value: {
					meshId: "material_player",
					materialId: "material_player",
				},
			}),
			baseHash: hashLevelEditorAuthoringFileContent(
				updatedRenderableComponentPublishedSource,
			),
		}),
		'operation.value.Renderable.meshId references material asset "material_player", expected mesh.',
	);
	await assertPersistenceFailure(
		publishLevelEditorTransformTransaction({
			appRoot: publishedTransformTempRoot,
			transaction: createComponentTransaction({
				runtimeSceneId: "portal_arena_runtime",
				saveTargetId: "portal_arena_runtime:generated:authoring-save",
				baseHash: LEVEL_EDITOR_MISSING_FILE_HASH,
				ownerTargetId: "portal_arena_runtime:level",
				transactionId: "publish-contract-renderable-wrong-material-kind",
				stableId: "player",
				componentName: "Renderable",
				value: {
					meshId: "mesh_portal_gate",
					materialId: "mesh_portal_gate",
				},
			}),
			baseHash: hashLevelEditorAuthoringFileContent(
				updatedRenderableComponentPublishedSource,
			),
		}),
		'operation.value.Renderable.materialId references mesh asset "mesh_portal_gate", expected material.',
	);

	const componentRemovalPublishSave =
		await publishLevelEditorTransformTransaction({
			appRoot: publishedTransformTempRoot,
			transaction: publishedComponentRemovalTransaction,
			baseHash: hashLevelEditorAuthoringFileContent(
				updatedRenderableComponentPublishedSource,
			),
		});
	const updatedComponentRemovalPublishedSource = await readFile(
		publishedTransformPath,
		"utf8",
	);
	const updatedComponentRemovalOverrides =
		parsePublishedLevelInstanceComponentOverrides(
			updatedComponentRemovalPublishedSource,
		);
	const updatedComponentRemovals = parsePublishedLevelInstanceComponentRemovals(
		updatedComponentRemovalPublishedSource,
	);

	assertEqual(
		componentRemovalPublishSave.wroteFile,
		true,
		"Expected component removal publish to write the generated runtime owner file.",
	);
	assertIncludes(
		componentRemovalPublishSave.publishedStableIds,
		"portal-arena:portal:observatory",
		"Expected component removal publish to report the component removal stable ID.",
	);
	assertEqual(
		componentRemovalPublishSave.componentRemovals[0]?.componentName,
		"Portal",
		"Expected component removal publish to return generated component removal data.",
	);
	assertEqual(
		updatedComponentRemovals[0]?.stableId,
		"portal-arena:portal:observatory",
		"Expected component removal publish to persist the target stable ID.",
	);
	assertEqual(
		updatedComponentRemovals[0]?.componentName,
		"Portal",
		"Expected component removal publish to persist the removed component name.",
	);
	assertEqual(
		updatedComponentRemovalOverrides.some(
			(override) =>
				override.stableId === "portal-arena:portal:observatory" &&
				override.componentName === "Portal",
		),
		false,
		"Expected component removal publish to clear a stale generated component override for the same component.",
	);

	const instanceRemovalPublishSave =
		await publishLevelEditorTransformTransaction({
			appRoot: publishedTransformTempRoot,
			transaction: publishedInstanceRemovalTransaction,
			baseHash: hashLevelEditorAuthoringFileContent(
				updatedComponentRemovalPublishedSource,
			),
		});
	const updatedInstanceRemovalPublishedSource = await readFile(
		publishedTransformPath,
		"utf8",
	);
	const updatedInstanceRemovals = parsePublishedLevelInstanceRemovals(
		updatedInstanceRemovalPublishedSource,
	);

	assertEqual(
		instanceRemovalPublishSave.wroteFile,
		true,
		"Expected instance removal publish to write the generated runtime owner file.",
	);
	assertIncludes(
		instanceRemovalPublishSave.publishedStableIds,
		"ingredient:north",
		"Expected instance removal publish to report the removed stable ID.",
	);
	assertEqual(
		instanceRemovalPublishSave.removals[0]?.stableId,
		"ingredient:north",
		"Expected instance removal publish to return generated instance removal data.",
	);
	assertEqual(
		updatedInstanceRemovals[0]?.stableId,
		"ingredient:north",
		"Expected instance removal publish to persist the checked-in target stable ID.",
	);
	assertEqual(
		updatedInstanceRemovals[0]?.runtimeSceneId,
		"prototype_arena_runtime",
		"Expected instance removal publish to persist the owning runtime scene ID.",
	);

	await assertPersistenceFailure(
		publishLevelEditorTransformTransaction({
			appRoot: publishedTransformTempRoot,
			transaction: readinessRequiredRemovalTransaction,
			baseHash: hashLevelEditorAuthoringFileContent(
				updatedInstanceRemovalPublishedSource,
			),
		}),
		"cannot remove readiness-required stable ID",
	);

	await assertPersistenceFailure(
		publishLevelEditorTransformTransaction({
			appRoot: publishedTransformTempRoot,
			transaction: readinessRequiredPrefabReplacementTransaction,
			baseHash: hashLevelEditorAuthoringFileContent(
				updatedInstanceRemovalPublishedSource,
			),
		}),
		"cannot replace prefab for readiness-required stable ID",
	);

	await assertPersistenceFailure(
		publishLevelEditorTransformTransaction({
			appRoot: publishedTransformTempRoot,
			transaction: publishedTransformTransaction,
			baseHash: initialPublishedTransformHash,
		}),
		"base hash mismatch",
	);

	await rollbackLevelEditorPublishChangeset(publishSave.changeset);
	assertEqual(
		await readFile(publishedTransformPath, "utf8"),
		initialPublishedTransformSource,
		"Expected publish rollback to restore the prior generated runtime owner contents.",
	);
} finally {
	await rm(publishedTransformTempRoot, { recursive: true, force: true });
}

const routeTempRoot = await mkdtemp(
	join(tmpdir(), "level-editor-save-route-contract-"),
);
const originalNodeEnv = process.env.NODE_ENV;
const levelOwnerSource = await readFile(
	"src/game/levels/portalArenaLevel.ts",
	"utf8",
);
const levelOwnerBaseHash =
	hashLevelEditorAuthoringFileContent(levelOwnerSource);

try {
	process.env.NODE_ENV = "development";

	const initialRouteStatus = await authoringTargetStatus(
		"portal_arena_runtime",
		"authoring-save",
		routeTempRoot,
	);

	assertEqual(
		initialRouteStatus.baseHash,
		LEVEL_EDITOR_MISSING_FILE_HASH,
		"Expected authoring status to report missing generated save modules.",
	);

	const routeLevelOwnerPath = resolve(
		routeTempRoot,
		"src/game/levels/portalArenaLevel.ts",
	);
	await mkdir(dirname(routeLevelOwnerPath), { recursive: true });
	await writeFile(routeLevelOwnerPath, levelOwnerSource, "utf8");

	const initialLevelRouteStatus = await authoringTargetStatus(
		"portal_arena_runtime",
		"level",
		routeTempRoot,
	);

	assertEqual(
		initialLevelRouteStatus.baseHash,
		levelOwnerBaseHash,
		"Expected level authoring status to report the checked-in level owner hash.",
	);

	const routeDryRunResponse =
		await handleLevelEditorAuthoringPersistenceRequest({
			appRoot: routeTempRoot,
			mode: "dry-run",
			request: jsonRequest({ transaction }),
		});

	assertEqual(routeDryRunResponse.status, 200, "Expected dry-run HTTP 200.");
	const routeDryRun = (await routeDryRunResponse.json()) as ApiResultBody;
	assertEqual(routeDryRun.ok, true, "Expected dry-run API result to succeed.");
	assertEqual(
		routeDryRun.dryRun,
		true,
		"Expected dry-run API result to be marked as a dry run.",
	);
	assertEqual(
		routeDryRun.artifacts?.[0]?.wroteFile,
		false,
		"Expected dry-run API result to avoid writes.",
	);
	assertEqual(
		routeDryRun.artifacts?.[0]?.targetFile,
		"src/game/editor/authoring/generated/portal_arena_runtime.authoringSave.ts",
		"Expected dry-run API result to report the generated authoring-save target.",
	);

	const routeSaveEndpointDryRunResponse =
		await handleLevelEditorAuthoringPersistenceRequest({
			appRoot: routeTempRoot,
			mode: "save",
			request: jsonRequest({
				mode: "dry-run",
				transaction,
			}),
		});

	assertEqual(
		routeSaveEndpointDryRunResponse.status,
		200,
		"Expected save endpoint to honor a dry-run request body mode.",
	);
	const routeSaveEndpointDryRun =
		(await routeSaveEndpointDryRunResponse.json()) as ApiResultBody;
	assertEqual(
		routeSaveEndpointDryRun.dryRun,
		true,
		"Expected save endpoint dry-run request to avoid writes.",
	);

	const routeSaveResponse = await handleLevelEditorAuthoringPersistenceRequest({
		appRoot: routeTempRoot,
		mode: "save",
		request: jsonRequest(transaction),
	});

	assertEqual(routeSaveResponse.status, 201, "Expected save HTTP 201.");
	const routeSave = (await routeSaveResponse.json()) as ApiResultBody;
	assertEqual(routeSave.ok, true, "Expected save API result to succeed.");
	assertEqual(
		routeSave.artifacts?.[0]?.wroteFile,
		true,
		"Expected save API result to write the generated authoring module.",
	);

	const routeConflictResponse =
		await handleLevelEditorAuthoringPersistenceRequest({
			appRoot: routeTempRoot,
			mode: "save",
			request: jsonRequest(transaction),
		});

	assertEqual(
		routeConflictResponse.status,
		409,
		"Expected stale save API request to return HTTP 409.",
	);
	const routeConflict = (await routeConflictResponse.json()) as ApiResultBody;
	assertIncludes(
		routeConflict.error?.message ?? "",
		"base hash mismatch",
		"Expected stale save API response to explain the base hash mismatch.",
	);

	const initialPublishedTransformRouteStatus = await authoringTargetStatus(
		"portal_arena_runtime",
		"published-transforms",
		routeTempRoot,
	);

	assertEqual(
		initialPublishedTransformRouteStatus.baseHash,
		LEVEL_EDITOR_MISSING_FILE_HASH,
		"Expected published transform status to report a missing generated runtime owner before Save Level.",
	);
	assertEqual(
		initialPublishedTransformRouteStatus.targetId,
		"portal_arena_runtime:generated:published-transforms",
		"Expected published transform status to resolve through the owner registry.",
	);

	const statusRouteResponse = await getLevelEditorAuthoringStatusRoute({
		request: new Request(
			"http://127.0.0.1:4322/api/editor/authoring/status.json?runtimeSceneId=portal_arena_runtime&target=published-transforms",
		),
		url: new URL("http://127.0.0.1:4322/api/editor/authoring/status.json"),
	} as Parameters<typeof getLevelEditorAuthoringStatusRoute>[0]);

	assertEqual(
		statusRouteResponse.status,
		200,
		"Expected status route to read query params from request.url for the Astro dev server.",
	);
	const statusRoute = (await statusRouteResponse.json()) as ApiResultBody & {
		readonly targetId?: string;
	};
	assertEqual(
		statusRoute.targetId,
		"portal_arena_runtime:generated:published-transforms",
		"Expected status route to return the published transform owner target.",
	);

	const postStatusRouteResponse = await postLevelEditorAuthoringStatusRoute({
		request: new Request(
			"http://127.0.0.1:4322/api/editor/authoring/status.json",
			{
				method: "POST",
				headers: {
					"x-megameal-runtime-scene-id": "portal_arena_runtime",
					"x-megameal-authoring-target": "published-transforms",
				},
			},
		),
		url: new URL("http://127.0.0.1:4322/api/editor/authoring/status.json"),
	} as Parameters<typeof postLevelEditorAuthoringStatusRoute>[0]);

	assertEqual(
		postStatusRouteResponse.status,
		200,
		"Expected status POST route to accept runtime scene and target from the request body.",
	);
	const postStatusRoute =
		(await postStatusRouteResponse.json()) as ApiResultBody & {
			readonly targetId?: string;
		};
	assertEqual(
		postStatusRoute.targetId,
		"portal_arena_runtime:generated:published-transforms",
		"Expected status POST route to return the published transform owner target.",
	);

	const routeLevelDryRunResponse =
		await handleLevelEditorLevelOwnerWriteRequest({
			appRoot: routeTempRoot,
			request: jsonRequest({
				mode: "dry-run",
				transaction: publishedTransformTransaction,
				baseHash: initialPublishedTransformRouteStatus.baseHash,
			}),
		});

	assertEqual(
		routeLevelDryRunResponse.status,
		200,
		"Expected Save Level dry-run API request to return HTTP 200.",
	);
	const routeLevelDryRun =
		(await routeLevelDryRunResponse.json()) as ApiResultBody;
	assertEqual(
		routeLevelDryRun.artifacts?.[0]?.wroteFile,
		false,
		"Expected Save Level API dry run to avoid writes.",
	);
	assertIncludes(
		routeLevelDryRun.artifacts?.[0]?.changedStableIds ?? [],
		"player",
		"Expected Save Level API dry run to report the changed player stable ID.",
	);

	const routeLevelSaveResponse = await handleLevelEditorLevelOwnerWriteRequest({
		appRoot: routeTempRoot,
		request: jsonRequest({
			mode: "save-level",
			transaction: publishedTransformTransaction,
			baseHash: initialPublishedTransformRouteStatus.baseHash,
		}),
	});

	assertEqual(
		routeLevelSaveResponse.status,
		201,
		"Expected Save Level API request to return HTTP 201.",
	);
	const routeLevelSave = (await routeLevelSaveResponse.json()) as ApiResultBody;
	assertEqual(
		routeLevelSave.artifacts?.[0]?.wroteFile,
		true,
		"Expected Save Level API request to write the generated runtime owner.",
	);
	assertIncludes(
		routeLevelSave.artifacts?.[0]?.changedStableIds ?? [],
		"player",
		"Expected Save Level API save to report the changed player stable ID.",
	);

	const routeLevelConflictResponse =
		await handleLevelEditorLevelOwnerWriteRequest({
			appRoot: routeTempRoot,
			request: jsonRequest({
				mode: "save-level",
				transaction: publishedTransformTransaction,
				baseHash: initialPublishedTransformRouteStatus.baseHash,
			}),
		});

	assertEqual(
		routeLevelConflictResponse.status,
		409,
		"Expected stale Save Level API request to return HTTP 409.",
	);

	const routeValidationResponse =
		await handleLevelEditorAuthoringPersistenceRequest({
			appRoot: routeTempRoot,
			mode: "dry-run",
			request: jsonRequest({
				...transaction,
				runtimeSceneId: "missing_runtime_scene",
			}),
		});

	assertEqual(
		routeValidationResponse.status,
		400,
		"Expected invalid save transaction to return HTTP 400.",
	);
	const routeValidation =
		(await routeValidationResponse.json()) as ApiResultBody;
	assertIncludes(
		routeValidation.error?.message ?? "",
		"not in the runtime scene catalog",
		"Expected invalid save transaction response to explain registry failure.",
	);

	process.env.NODE_ENV = "production";

	const routeDisabledResponse =
		await handleLevelEditorAuthoringPersistenceRequest({
			appRoot: routeTempRoot,
			mode: "save",
			request: jsonRequest(transaction),
		});

	assertEqual(
		routeDisabledResponse.status,
		403,
		"Expected authoring API save route to be disabled in production.",
	);
	const routeDisabled = (await routeDisabledResponse.json()) as ApiResultBody;
	assertEqual(
		routeDisabled.error?.code,
		"LEVEL_EDITOR_AUTHORING_API_DISABLED",
		"Expected disabled authoring API response to use a stable error code.",
	);
} finally {
	restoreNodeEnv(originalNodeEnv);
	await rm(routeTempRoot, { recursive: true, force: true });
}

const publishRouteTempRoot = await mkdtemp(
	join(tmpdir(), "level-editor-publish-route-contract-"),
);

try {
	process.env.NODE_ENV = "development";

	const initialPublishRouteStatus = await authoringTargetStatus(
		"portal_arena_runtime",
		"published-transforms",
		publishRouteTempRoot,
	);
	const publishDryRunResponse = await handleLevelEditorLocalPublishRequest({
		appRoot: publishRouteTempRoot,
		request: jsonRequest({
			mode: "dry-run",
			transaction: publishedTransformTransaction,
			baseHash: initialPublishRouteStatus.baseHash,
		}),
		runValidationGate: async (scriptName) => ({
			scriptName,
			ok: true,
			output: "dry-run gate should not execute",
		}),
	});

	assertEqual(
		publishDryRunResponse.status,
		200,
		"Expected Publish dry-run API request to return HTTP 200.",
	);
	const publishDryRun = (await publishDryRunResponse.json()) as ApiResultBody;
	assertEqual(
		publishDryRun.artifacts?.[0]?.wroteFile,
		false,
		"Expected Publish dry run to avoid writes.",
	);
	assertEqual(
		publishDryRun.validationGates?.length ?? 0,
		0,
		"Expected Publish dry run not to execute validation gates.",
	);

	const executedGates: string[] = [];
	const publishResponse = await handleLevelEditorLocalPublishRequest({
		appRoot: publishRouteTempRoot,
		request: jsonRequest({
			mode: "publish-local",
			transaction: publishedTransformTransaction,
			baseHash: initialPublishRouteStatus.baseHash,
		}),
		runValidationGate: async (scriptName) => {
			executedGates.push(scriptName);
			return {
				scriptName,
				ok: true,
				output: `passed ${scriptName}`,
			};
		},
	});

	assertEqual(
		publishResponse.status,
		201,
		"Expected Publish API request to return HTTP 201 after validation gates pass.",
	);
	const publishResult = (await publishResponse.json()) as ApiResultBody;
	assertEqual(
		publishResult.artifacts?.[0]?.wroteFile,
		true,
		"Expected Publish API request to write the generated runtime owner.",
	);
	assertIncludes(
		executedGates,
		"build",
		"Expected Publish API request to run the production build gate.",
	);
	assertEqual(
		publishResult.validationGates?.every((gate) => gate.ok),
		true,
		"Expected Publish API response to report passing validation gates.",
	);
} finally {
	restoreNodeEnv(originalNodeEnv);
	await rm(publishRouteTempRoot, { recursive: true, force: true });
}

const failingPublishRouteTempRoot = await mkdtemp(
	join(tmpdir(), "level-editor-publish-rollback-contract-"),
);

try {
	process.env.NODE_ENV = "development";
	const initialFailingPublishStatus = await authoringTargetStatus(
		"portal_arena_runtime",
		"published-transforms",
		failingPublishRouteTempRoot,
	);
	const failingPublishPath = resolve(
		failingPublishRouteTempRoot,
		PUBLISHED_LEVEL_TRANSFORMS_TARGET_FILE,
	);
	const failingPublishResponse = await handleLevelEditorLocalPublishRequest({
		appRoot: failingPublishRouteTempRoot,
		request: jsonRequest({
			mode: "publish-local",
			transaction: publishedTransformTransaction,
			baseHash: initialFailingPublishStatus.baseHash,
		}),
		runValidationGate: async (scriptName) => ({
			scriptName,
			ok: scriptName !== "type-check",
			output:
				scriptName === "type-check"
					? "simulated type-check failure"
					: `passed ${scriptName}`,
		}),
	});

	assertEqual(
		failingPublishResponse.status,
		400,
		"Expected Publish API request to fail when a validation gate fails.",
	);
	await assertFileMissing(
		failingPublishPath,
		"Expected failing Publish API request to roll back the generated runtime owner.",
	);
} finally {
	restoreNodeEnv(originalNodeEnv);
	await rm(failingPublishRouteTempRoot, { recursive: true, force: true });
}

await assertRuntimeDoesNotImportEditorDrafts();

console.log(
	`Level editor save contract passed for ${registry.runtimeSceneIds.length} runtime scene owner sets.`,
);

type ApiResultBody = {
	readonly ok?: boolean;
	readonly dryRun?: boolean;
	readonly artifacts?: readonly {
		readonly targetFile?: string;
		readonly wroteFile?: boolean;
		readonly changedStableIds?: readonly string[];
	}[];
	readonly validationGates?: readonly {
		readonly scriptName?: string;
		readonly ok?: boolean;
		readonly output?: string;
	}[];
	readonly error?: {
		readonly code?: string;
		readonly message?: string;
	};
};

async function assertRuntimeDoesNotImportEditorDrafts(): Promise<void> {
	const appRoot = resolve(".");
	const sourceRoots = [
		resolve(appRoot, "src/game"),
		resolve(appRoot, "src/engine"),
	];
	const sourceFiles = (
		await Promise.all(sourceRoots.map((root) => collectSourceFiles(root)))
	).flat();
	const offenders: string[] = [];

	for (const file of sourceFiles) {
		if (isInsidePath(file, resolve(appRoot, "src/game/editor"))) {
			continue;
		}

		const source = await readFile(file, "utf8");

		for (const [index, line] of source.split("\n").entries()) {
			const specifier = importSpecifier(line);

			if (specifier === undefined || !specifier.startsWith(".")) {
				continue;
			}

			const absoluteImportPath = resolve(dirname(file), specifier);
			const relativeImportPath = normalizePath(
				relative(appRoot, absoluteImportPath),
			);

			if (
				relativeImportPath.startsWith("src/game/editor/") ||
				relativeImportPath.includes("/editor/authoring/generated")
			) {
				offenders.push(
					`${normalizePath(relative(appRoot, file))}:${index + 1} imports ${specifier}`,
				);
			}
		}
	}

	if (offenders.length > 0) {
		throw new Error(
			`Runtime source must not import editor drafts or generated authoring saves:\n${offenders.join(
				"\n",
			)}`,
		);
	}
}

async function collectSourceFiles(root: string): Promise<readonly string[]> {
	const entries = await readdir(root, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const path = resolve(root, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await collectSourceFiles(path)));
			continue;
		}

		if (entry.isFile() && /\.(?:astro|svelte|ts)$/.test(entry.name)) {
			files.push(path);
		}
	}

	return files;
}

function importSpecifier(line: string): string | undefined {
	const match =
		/^\s*(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/.exec(
			line,
		);

	return match?.[1];
}

function isInsidePath(path: string, parent: string): boolean {
	const relativePath = relative(parent, path);

	return (
		relativePath !== "" &&
		!relativePath.startsWith("..") &&
		!relativePath.split(sep).includes("..")
	);
}

function normalizePath(path: string): string {
	return path.split(sep).join("/");
}

function createTransaction(options: {
	readonly runtimeSceneId: string;
	readonly saveTargetId: string;
	readonly baseHash: string;
	readonly ownerTargetId: string;
	readonly transactionId?: string;
	readonly subjectId?: string;
	readonly position?: readonly [number, number, number];
}): LevelEditorAuthoringSaveTransactionData {
	return {
		schemaVersion: 1,
		transactionId: options.transactionId ?? "save-contract-insert",
		runtimeSceneId: options.runtimeSceneId,
		authoringValidation: {
			status: "valid",
			contract: "LevelEditorAuthoringContract",
			contentHash: "fnv1a32:aaaaaaaa",
		},
		targets: [
			{
				targetId: options.saveTargetId,
				baseHash: options.baseHash,
				operations: [
					{
						kind: "replace-level-instance",
						ownerKind: "level",
						ownerTargetId: options.ownerTargetId,
						subjectId: options.subjectId ?? "player",
						payload: {
							operation: {
								id: `${options.transactionId ?? "save-contract-insert"}:${
									options.subjectId ?? "player"
								}:transform`,
								kind: "set-transform",
								stableId: options.subjectId ?? "player",
								persistence: "saved",
								transform: {
									position: options.position ?? [0, 1.5, 0],
								},
							},
						},
					},
				],
			},
		],
	};
}

function createPlacementTransaction(options: {
	readonly runtimeSceneId: string;
	readonly saveTargetId: string;
	readonly baseHash: string;
	readonly ownerTargetId: string;
	readonly transactionId: string;
	readonly stableId: string;
	readonly prefabId: string;
	readonly position: readonly [number, number, number];
}): LevelEditorAuthoringSaveTransactionData {
	return {
		schemaVersion: 1,
		transactionId: options.transactionId,
		runtimeSceneId: options.runtimeSceneId,
		authoringValidation: {
			status: "valid",
			contract: "LevelEditorAuthoringContract",
			contentHash: "fnv1a32:cccccccc",
		},
		targets: [
			{
				targetId: options.saveTargetId,
				baseHash: options.baseHash,
				operations: [
					{
						kind: "insert-level-instance",
						ownerKind: "level",
						ownerTargetId: options.ownerTargetId,
						subjectId: options.stableId,
						payload: {
							sourceOperationKind: "insert-level-instance",
							entryId: `prefab:${options.prefabId}`,
							sourceOwner: `runtime-scene-manifest-catalog:prefabs:${options.prefabId}`,
							placementSource: "save-contract",
							instance: {
								id: options.stableId,
								stableId: options.stableId,
								prefabId: options.prefabId,
								components: {},
								transform: {
									position: options.position,
									rotation: [0, 0, 0, 1],
									scale: [1, 1, 1],
								},
							},
						},
					},
				],
			},
		],
	};
}

function createPrefabReplacementTransaction(options: {
	readonly runtimeSceneId: string;
	readonly saveTargetId: string;
	readonly baseHash: string;
	readonly ownerTargetId: string;
	readonly transactionId: string;
	readonly stableId: string;
	readonly prefabId: string;
}): LevelEditorAuthoringSaveTransactionData {
	return {
		schemaVersion: 1,
		transactionId: options.transactionId,
		runtimeSceneId: options.runtimeSceneId,
		authoringValidation: {
			status: "valid",
			contract: "LevelEditorAuthoringContract",
			contentHash: "fnv1a32:abababab",
		},
		targets: [
			{
				targetId: options.saveTargetId,
				baseHash: options.baseHash,
				operations: [
					{
						kind: "replace-level-instance",
						ownerKind: "level",
						ownerTargetId: options.ownerTargetId,
						subjectId: options.stableId,
						payload: {
							operation: {
								id: `${options.transactionId}:${options.stableId}:prefab`,
								kind: "replace-prefab",
								stableId: options.stableId,
								prefabId: options.prefabId,
								persistence: "saved",
							},
						},
					},
				],
			},
		],
	};
}

function createComponentTransaction(options: {
	readonly runtimeSceneId: string;
	readonly saveTargetId: string;
	readonly baseHash: string;
	readonly ownerTargetId: string;
	readonly transactionId: string;
	readonly stableId: string;
	readonly componentName: string;
	readonly value: Record<string, unknown>;
}): LevelEditorAuthoringSaveTransactionData {
	return {
		schemaVersion: 1,
		transactionId: options.transactionId,
		runtimeSceneId: options.runtimeSceneId,
		authoringValidation: {
			status: "valid",
			contract: "LevelEditorAuthoringContract",
			contentHash: "fnv1a32:dddddddd",
		},
		targets: [
			{
				targetId: options.saveTargetId,
				baseHash: options.baseHash,
				operations: [
					{
						kind: "replace-level-instance",
						ownerKind: "level",
						ownerTargetId: options.ownerTargetId,
						subjectId: options.stableId,
						payload: {
							operation: {
								id: `${options.transactionId}:${options.stableId}:component`,
								kind: "set-component",
								stableId: options.stableId,
								target: "level-instance",
								componentName: options.componentName,
								persistence: "saved",
								value: options.value,
							},
						},
					},
				],
			},
		],
	};
}

function createComponentRemovalTransaction(options: {
	readonly runtimeSceneId: string;
	readonly saveTargetId: string;
	readonly baseHash: string;
	readonly ownerTargetId: string;
	readonly transactionId: string;
	readonly stableId: string;
	readonly componentName: string;
}): LevelEditorAuthoringSaveTransactionData {
	return {
		schemaVersion: 1,
		transactionId: options.transactionId,
		runtimeSceneId: options.runtimeSceneId,
		authoringValidation: {
			status: "valid",
			contract: "LevelEditorAuthoringContract",
			contentHash: "fnv1a32:eeeeeeee",
		},
		targets: [
			{
				targetId: options.saveTargetId,
				baseHash: options.baseHash,
				operations: [
					{
						kind: "replace-level-instance",
						ownerKind: "level",
						ownerTargetId: options.ownerTargetId,
						subjectId: options.stableId,
						payload: {
							operation: {
								id: `${options.transactionId}:${options.stableId}:component-removal`,
								kind: "remove-component",
								stableId: options.stableId,
								target: "level-instance",
								componentName: options.componentName,
								persistence: "saved",
							},
						},
					},
				],
			},
		],
	};
}

function createRemovalTransaction(options: {
	readonly runtimeSceneId: string;
	readonly saveTargetId: string;
	readonly baseHash: string;
	readonly ownerTargetId: string;
	readonly transactionId: string;
	readonly stableId: string;
}): LevelEditorAuthoringSaveTransactionData {
	return {
		schemaVersion: 1,
		transactionId: options.transactionId,
		runtimeSceneId: options.runtimeSceneId,
		authoringValidation: {
			status: "valid",
			contract: "LevelEditorAuthoringContract",
			contentHash: "fnv1a32:ffffffff",
		},
		targets: [
			{
				targetId: options.saveTargetId,
				baseHash: options.baseHash,
				operations: [
					{
						kind: "remove-level-instance",
						ownerKind: "level",
						ownerTargetId: options.ownerTargetId,
						subjectId: options.stableId,
						payload: {
							operation: {
								id: `${options.transactionId}:${options.stableId}:instance-removal`,
								kind: "remove-instance",
								stableId: options.stableId,
								persistence: "saved",
							},
						},
					},
				],
			},
		],
	};
}

function assertValidationFailure(
	transaction: LevelEditorAuthoringSaveTransactionData,
	expectedMessage: string,
): void {
	try {
		buildLevelEditorAuthoringSaveWritePlan({
			transaction,
			ownerRegistry: registry,
		});
	} catch (error) {
		assertIncludes(
			String(error instanceof Error ? error.message : error),
			expectedMessage,
			`Expected validation failure to mention "${expectedMessage}".`,
		);
		return;
	}

	throw new Error(`Expected validation failure for ${expectedMessage}.`);
}

function assertThrows(
	action: () => unknown,
	expectedMessage: string,
	message: string,
): void {
	try {
		action();
	} catch (error) {
		assertIncludes(
			String(error instanceof Error ? error.message : error),
			expectedMessage,
			message,
		);
		return;
	}

	throw new Error(message);
}

async function assertPersistenceFailure(
	promise: Promise<unknown>,
	expectedMessage: string,
): Promise<void> {
	try {
		await promise;
	} catch (error) {
		assertIncludes(
			String(error instanceof Error ? error.message : error),
			expectedMessage,
			`Expected persistence failure to mention "${expectedMessage}".`,
		);
		return;
	}

	throw new Error(`Expected persistence failure for ${expectedMessage}.`);
}

async function assertFileMissing(path: string, message: string): Promise<void> {
	try {
		await readFile(path, "utf8");
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			return;
		}

		throw error;
	}

	throw new Error(message);
}

function assertPublishFailure(
	callback: () => unknown,
	expectedMessage: string,
): void {
	try {
		callback();
	} catch (error) {
		assertIncludes(
			String(error instanceof Error ? error.message : error),
			expectedMessage,
			`Expected publish failure to mention "${expectedMessage}".`,
		);
		return;
	}

	throw new Error(`Expected publish failure for ${expectedMessage}.`);
}

function requireSaveTarget(
	transaction: LevelEditorAuthoringSaveTransactionData,
): LevelEditorAuthoringSaveTargetData {
	const target = transaction.targets[0];

	if (!target) {
		throw new Error("Expected test transaction to include a save target.");
	}

	return target;
}

function requireSaveOperation(
	target: LevelEditorAuthoringSaveTargetData,
): LevelEditorAuthoringOperationData {
	const operation = target.operations[0];

	if (!operation) {
		throw new Error("Expected test save target to include an operation.");
	}

	return operation;
}

function nextInspectorFieldValue(value: string | number | boolean) {
	if (typeof value === "number") {
		return value + 1;
	}

	if (typeof value === "boolean") {
		return !value;
	}

	return `${value}-edited`;
}

function assert(value: unknown, message: string): asserts value {
	if (!value) {
		throw new Error(message);
	}
}

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message: string,
): void {
	if (actual !== expected) {
		throw new Error(`${message} Expected ${expected}, received ${actual}.`);
	}
}

function assertIncludes(
	values: readonly string[] | string,
	expected: string,
	message: string,
): void {
	if (!values.includes(expected)) {
		throw new Error(`${message} Missing ${expected}.`);
	}
}

function jsonRequest(body: unknown): Request {
	return new Request("http://localhost/api/editor/authoring/save.json", {
		body: JSON.stringify(body),
		headers: {
			"content-type": "application/json",
		},
		method: "POST",
	});
}

function restoreNodeEnv(value: string | undefined): void {
	if (value === undefined) {
		process.env.NODE_ENV = undefined;
		return;
	}

	process.env.NODE_ENV = value;
}

function createAiApplyPlan(): EditorAiApplyToSelectionPlan {
	return {
		schemaVersion: 1,
		runtimeSceneId: "portal_arena_runtime",
		generatedAssetId: "generated_asset_portal_crate",
		operation: "replace-selection-renderable",
		previewOnly: false,
		mutatesRuntimeDirectly: false,
		ownerManifestStatus: "requires-generated-manifest-record",
		editOperations: [
			{
				type: "patch-level-instance-renderable",
				runtimeSceneId: "portal_arena_runtime",
				targetStableId: "portal-arena:portal:observatory",
				generatedAssetId: "generated_asset_portal_crate",
				preserveStableId: true,
				componentPatch: {
					Renderable: {
						meshAssetId: "mesh_ai_portal_crate",
					},
				},
				ownerWritePlanStatus: "requires-save",
			},
		],
		fitReport: {
			status: "fit-to-selection",
			sourceStableId: null,
			targetStableIds: ["portal-arena:portal:observatory"],
			transformPolicy: "fit-to-source-bounds",
		},
	};
}
