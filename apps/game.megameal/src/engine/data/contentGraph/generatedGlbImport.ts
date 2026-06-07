import type { RuntimeSceneManifestData } from "../schemas/types.js";
import { buildRuntimeSceneContentGraph } from "./runtimeSceneContentGraph.js";
import type {
	GeneratedGlbImportEntry,
	GeneratedGlbImportManifestValidationInput,
	GeneratedGlbImportManifestValidationResult,
	GeneratedGlbImportTarget,
	RuntimeSceneContentGraph,
} from "./types.js";

export function validateGeneratedGlbImportManifest(
	input: GeneratedGlbImportManifestValidationInput,
): GeneratedGlbImportManifestValidationResult {
	const errors: string[] = [];
	const entryIds = new Set<string>();
	const runtimeSceneGraphs = runtimeSceneGraphsById(
		input.runtimeSceneManifests,
	);

	for (const entry of input.importManifest.entries) {
		validateGeneratedGlbImportEntry(
			entry,
			entryIds,
			runtimeSceneGraphs,
			errors,
		);
	}

	if (errors.length === 0) {
		return { ok: true };
	}

	return {
		ok: false,
		errors,
	};
}

function validateGeneratedGlbImportEntry(
	entry: GeneratedGlbImportEntry,
	entryIds: Set<string>,
	runtimeSceneGraphs: ReadonlyMap<string, RuntimeSceneContentGraph>,
	errors: string[],
): void {
	if (entryIds.has(entry.id)) {
		errors.push(`generated GLB import entry "${entry.id}" is duplicated.`);
	}

	entryIds.add(entry.id);

	if (!isGeneratedGlbSourceUrl(entry.sourceUrl)) {
		errors.push(
			`generated GLB import entry "${entry.id}" sourceUrl must be a generated .glb or .gltf URL.`,
		);
	}

	if (entry.owner.trim().length === 0) {
		errors.push(`generated GLB import entry "${entry.id}" is missing owner.`);
	}

	if (entry.evidence.length === 0) {
		errors.push(
			`generated GLB import entry "${entry.id}" is missing evidence.`,
		);
	}

	const graph = runtimeSceneGraphs.get(entry.runtimeSceneId);

	if (!graph) {
		errors.push(
			`generated GLB import entry "${entry.id}" references unknown runtime scene "${entry.runtimeSceneId}".`,
		);
		return;
	}

	if (entry.status === "planned") {
		validatePlannedGeneratedGlbImportEntry(entry, errors);
		return;
	}

	if (entry.status === "imported") {
		validateImportedGeneratedGlbImportEntry(entry, errors);
	} else if (entry.artifact) {
		errors.push(
			`generated GLB import entry "${entry.id}" artifact metadata is only allowed for imported target-generated assets.`,
		);
	}

	validateResolvedGeneratedGlbImportEntry(entry, graph, errors);
}

function validatePlannedGeneratedGlbImportEntry(
	entry: GeneratedGlbImportEntry,
	errors: string[],
): void {
	if (!entry.planned) {
		errors.push(
			`planned generated GLB import entry "${entry.id}" must include planned contract metadata.`,
		);
		return;
	}

	if (entry.planned.contractId.trim().length === 0) {
		errors.push(
			`planned generated GLB import entry "${entry.id}" is missing planned.contractId.`,
		);
	}

	if (entry.planned.reason.trim().length === 0) {
		errors.push(
			`planned generated GLB import entry "${entry.id}" is missing planned.reason.`,
		);
	}

	if (entry.planned.removalCondition.trim().length === 0) {
		errors.push(
			`planned generated GLB import entry "${entry.id}" is missing planned.removalCondition.`,
		);
	}
}

function validateImportedGeneratedGlbImportEntry(
	entry: GeneratedGlbImportEntry,
	errors: string[],
): void {
	if (!entry.sourceUrl.startsWith("/assets/generated/")) {
		errors.push(
			`imported generated GLB import entry "${entry.id}" sourceUrl must point at a target-engine /assets/generated/ artifact.`,
		);
	}

	if (!entry.artifact) {
		errors.push(
			`imported generated GLB import entry "${entry.id}" must include artifact provenance metadata.`,
		);
		return;
	}

	if (entry.artifact.generatorId.trim().length === 0) {
		errors.push(
			`imported generated GLB import entry "${entry.id}" is missing artifact.generatorId.`,
		);
	}

	if (
		!entry.artifact.metadataPath.startsWith("public/assets/generated/") ||
		!/\.json$/i.test(entry.artifact.metadataPath)
	) {
		errors.push(
			`imported generated GLB import entry "${entry.id}" artifact.metadataPath must be a public/assets/generated JSON path.`,
		);
	}

	if (!/^[a-f0-9]{64}$/.test(entry.artifact.glbSha256)) {
		errors.push(
			`imported generated GLB import entry "${entry.id}" artifact.glbSha256 must be a 64-character lowercase hex SHA-256.`,
		);
	}
}

function validateResolvedGeneratedGlbImportEntry(
	entry: GeneratedGlbImportEntry,
	graph: RuntimeSceneContentGraph,
	errors: string[],
): void {
	if (!entry.target || !hasGeneratedGlbTargetReference(entry.target)) {
		errors.push(
			`resolved generated GLB import entry "${entry.id}" must include at least one target asset, prefab, or stable ID.`,
		);
		return;
	}

	validateTargetIds(
		entry.id,
		"authored asset",
		entry.target.assetIds ?? [],
		new Set(graph.authoredAssetIds),
		errors,
	);
	validateTargetIds(
		entry.id,
		"referenced prefab",
		entry.target.prefabIds ?? [],
		new Set(graph.referencedPrefabIds),
		errors,
	);
	validateTargetIds(
		entry.id,
		"stable",
		entry.target.stableIds ?? [],
		new Set(graph.levelInstanceStableIds),
		errors,
	);
}

function validateTargetIds(
	entryId: string,
	targetKind: "authored asset" | "referenced prefab" | "stable",
	targetIds: readonly string[],
	knownIds: ReadonlySet<string>,
	errors: string[],
): void {
	for (const targetId of targetIds) {
		if (!knownIds.has(targetId)) {
			errors.push(
				`generated GLB import entry "${entryId}" targets unknown ${targetKind} ID "${targetId}".`,
			);
		}
	}
}

function runtimeSceneGraphsById(
	manifests: readonly RuntimeSceneManifestData[],
): ReadonlyMap<string, RuntimeSceneContentGraph> {
	return new Map(
		manifests.map((manifest) => [
			manifest.id,
			buildRuntimeSceneContentGraph({
				manifest,
				runtimeSceneIds: manifests.map((runtimeManifest) => runtimeManifest.id),
			}),
		]),
	);
}

function hasGeneratedGlbTargetReference(
	target: GeneratedGlbImportTarget,
): boolean {
	return (
		(target.assetIds?.length ?? 0) > 0 ||
		(target.prefabIds?.length ?? 0) > 0 ||
		(target.stableIds?.length ?? 0) > 0
	);
}

function isGeneratedGlbSourceUrl(sourceUrl: string): boolean {
	return (
		(sourceUrl.startsWith("/generated/runtime-game-assets/") ||
			sourceUrl.startsWith("/assets/generated/")) &&
		/\.(glb|gltf)(?:[?#].*)?$/i.test(sourceUrl)
	);
}
