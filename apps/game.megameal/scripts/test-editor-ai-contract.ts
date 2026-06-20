import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildLevelEditorAiApplyPlanQueueEntry,
	buildLevelEditorAiAssetLabOfflineStatus,
} from "../src/app/editor/levelEditorAiAssetLabModel.js";
import {
	buildDisabledEditorAiServiceStatusReport,
	buildEditorAiApplyToSelectionPlan,
	buildEditorAiServiceStatusReport,
	cancelEditorAiAssetJob,
	completeEditorAiAssetJob,
	createEditorAiJobQueueStore,
	defaultEditorAiServiceDefinitions,
	parseEditorAiAssetJobRequest,
	queueEditorAiAssetJob,
	snapshotEditorAiJobQueue,
} from "../src/game/editor/ai/index.js";

const fixedNow = "2026-06-11T12:00:00.000Z";
const appRoot = fileURLToPath(new URL("..", import.meta.url));
const legacyGamePath = ["apps", "game"].join("/");

const disabledStatus = buildDisabledEditorAiServiceStatusReport({
	checkedAt: fixedNow,
	reason: "offline test",
});

assertEqual(
	disabledStatus.availableBackends.length,
	0,
	"Expected disabled AI service report to expose no available backends.",
);
assertEqual(
	disabledStatus.unavailableBackends.length,
	defaultEditorAiServiceDefinitions.length,
	"Expected disabled AI service report to mark every backend unavailable.",
);

const offlineStatus = buildLevelEditorAiAssetLabOfflineStatus(
	"AI Asset Lab API unreachable",
	fixedNow,
);
assertEqual(
	offlineStatus.mode,
	"api-unreachable",
	"Expected client fallback status to distinguish unreachable API from production-disabled mode.",
);
assertEqual(
	offlineStatus.availableBackends.length,
	0,
	"Expected unreachable AI API fallback to expose no available backends.",
);

const store = createEditorAiJobQueueStore({ now: () => fixedNow });
const blockedJob = queueEditorAiAssetJob(
	store,
	{
		backend: "hunyuan3d",
		mode: "text-to-3d",
		runtimeSceneId: "test_runtime",
		prompt: "weathered portal stone",
		sourceStableId: "selected:portal",
		fitToSelection: true,
	},
	disabledStatus,
);

assertEqual(
	blockedJob.status,
	"blocked",
	"Expected missing local Hunyuan service to block the job instead of throwing.",
);
assertEqual(
	blockedJob.ownerManifestStatus,
	"preview-only",
	"Expected queued AI jobs to remain outside saved manifest ownership.",
);

const cancelResult = cancelEditorAiAssetJob(store, blockedJob.id);
assertEqual(
	cancelResult.status,
	"canceled",
	"Expected blocked queued jobs to be cancelable through the queue contract.",
);

const availableStatus = buildEditorAiServiceStatusReport({
	checkedAt: fixedNow,
	probes: defaultEditorAiServiceDefinitions.map((definition) => ({
		backend: definition.backend,
		endpoint: definition.endpoint,
		checkedAt: fixedNow,
		available: true,
		responseMs: 12,
		reason: null,
	})),
});
const unsupportedJob = queueEditorAiAssetJob(
	store,
	{
		backend: "comfyui",
		mode: "text-to-3d",
		runtimeSceneId: "test_runtime",
		prompt: "organic spaceship hull",
	},
	availableStatus,
);
assertEqual(
	unsupportedJob.status,
	"blocked",
	"Expected backend/mode capability mismatches to block instead of dispatch.",
);
assertIncludesText(
	unsupportedJob.statusReason ?? "",
	"does not support",
	"Expected unsupported backend/mode jobs to explain the block reason.",
);

const parsedRequest = parseEditorAiAssetJobRequest({
	backend: "hunyuan3d",
	mode: "image-to-3d",
	runtimeSceneId: " test_runtime ",
	prompt: "  reference-backed prop  ",
	sourceAssetId: " ",
	referenceImageUrl: " /tmp/reference.png ",
});
assertEqual(
	parsedRequest.runtimeSceneId,
	"test_runtime",
	"Expected AI job requests to trim runtime scene IDs.",
);
assertEqual(
	parsedRequest.sourceAssetId,
	undefined,
	"Expected empty optional source asset IDs to be omitted.",
);

const queuedJob = queueEditorAiAssetJob(
	store,
	{
		backend: "hunyuan3d",
		mode: "replacement-mesh",
		runtimeSceneId: "test_runtime",
		prompt: "clean sci-fi crate replacement",
		sourceStableId: "crate:001",
		sourceAssetId: "mesh_crate_source",
		fitToSelection: true,
	},
	availableStatus,
);

assertEqual(
	queuedJob.status,
	"queued",
	"Expected available Hunyuan service to accept queueable jobs.",
);

const generatedAsset = completeEditorAiAssetJob(store, queuedJob.id, {
	assetId: "mesh_generated_crate",
	kind: "mesh",
	label: "Generated Crate",
	url: "/generated/editor-ai/mesh_generated_crate.glb",
	metadataUrl: "/generated/editor-ai/mesh_generated_crate.metadata.json",
	generatedAssetSha256:
		"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
});

assertEqual(
	generatedAsset.ownerManifestStatus,
	"requires-generated-manifest-record",
	"Expected generated assets to require a manifest/library owner before save.",
);
assertIncludes(
	generatedAsset.tags,
	"ai-asset-lab",
	"Expected generated asset library records to carry AI Asset Lab provenance.",
);

const applyPlan = buildEditorAiApplyToSelectionPlan(generatedAsset, {
	runtimeSceneId: "test_runtime",
	generatedAssetId: generatedAsset.id,
	selectedStableIds: ["crate:001"],
	operation: "replace-selection-renderable",
	preserveStableIds: true,
	fitToSelection: true,
});

assertEqual(
	applyPlan.mutatesRuntimeDirectly,
	false,
	"Expected AI apply plans to produce edit operations, not runtime mutation.",
);
assertEqual(
	applyPlan.editOperations[0]?.preserveStableId,
	true,
	"Expected replacement operations to preserve selected stable IDs.",
);
assertEqual(
	applyPlan.editOperations[0]?.componentPatch.Renderable?.meshAssetId,
	"mesh_generated_crate",
	"Expected replacement operations to patch renderable mesh assets.",
);
assertEqual(
	applyPlan.ownerManifestStatus,
	"requires-generated-manifest-record",
	"Expected AI apply plans to stay behind generated manifest ownership.",
);

const applyQueueEntry = buildLevelEditorAiApplyPlanQueueEntry(
	applyPlan,
	generatedAsset,
);
const generatedAssetSaveOperation = applyQueueEntry.saveOperations?.find(
	(operation) => operation.kind === "replace-asset",
);
const levelSaveOperation = applyQueueEntry.saveOperations?.find(
	(operation) => operation.kind === "replace-level-instance",
);
assertEqual(
	applyQueueEntry.id,
	`ai-asset-lab:test_runtime:${applyPlan.generatedAssetId}:replace-selection-renderable`,
	"Expected AI apply plans to stage into a stable authoring queue entry.",
);
assertEqual(
	applyQueueEntry.operations?.[0]?.kind,
	"set-component",
	"Expected AI replacement plans to produce a previewable authoring operation.",
);
assertEqual(
	generatedAssetSaveOperation?.ownerTargetId,
	"test_runtime:assets",
	"Expected AI generated asset records to stage an asset manifest save operation.",
);
assertEqual(
	levelSaveOperation?.kind,
	"replace-level-instance",
	"Expected AI replacement plans to produce generated save operations.",
);
assertEqual(
	levelSaveOperation?.ownerTargetId,
	"test_runtime:level",
	"Expected AI generated save operations to affect the level owner target.",
);

const snapshot = snapshotEditorAiJobQueue(store);
assertEqual(
	snapshot.generatedAssets.length,
	1,
	"Expected completed AI jobs to add generated asset library records.",
);

await assertNoOldGameReferences(join(appRoot, "src/game/editor/ai"));
await assertNoOldGameReferences(join(appRoot, "src/pages/api/editor/ai"));

console.log(
	`Editor AI contract passed for ${availableStatus.services.length} service models, ${snapshot.jobs.length} jobs, and ${snapshot.generatedAssets.length} generated asset record.`,
);

function assertEqual<T>(actual: T, expected: T, message: string): void {
	if (actual !== expected) {
		throw new Error(`${message} Expected ${expected}, received ${actual}.`);
	}
}

function assertIncludes<T>(
	items: readonly T[],
	item: T,
	message: string,
): void {
	if (!items.includes(item)) {
		throw new Error(`${message} Missing ${String(item)}.`);
	}
}

function assertIncludesText(
	actual: string,
	expected: string,
	message: string,
): void {
	if (!actual.includes(expected)) {
		throw new Error(
			`${message} Expected "${actual}" to include "${expected}".`,
		);
	}
}

async function assertNoOldGameReferences(directory: string): Promise<void> {
	const files = await collectFiles(directory);

	for (const file of files) {
		const source = await readFile(file, "utf8");

		if (source.includes(legacyGamePath)) {
			throw new Error(
				`${relative(appRoot, file)} references old legacy game code or routes.`,
			);
		}
	}
}

async function collectFiles(directory: string): Promise<readonly string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const path = join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await collectFiles(path)));
			continue;
		}

		if (entry.name.endsWith(".ts") || entry.name.endsWith(".svelte")) {
			files.push(path);
		}
	}

	return files;
}
