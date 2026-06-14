import { boundsCenter } from "./plan.js";
import {
	cloneValue,
	hashStableValue,
	hashString,
	serializeStableValue,
} from "./stableValue.js";
import type { TerrainCookRuntimeValidationResult } from "./types.js";
import type {
	TerrainCookCollisionChunkArtifactData,
	TerrainCookCollisionChunkPlanData,
	TerrainCookLevelInstanceArtifactData,
	TerrainCookPlan,
	TerrainCookReadinessArtifactData,
	TerrainCookRuntimeModuleData,
	TerrainCookRuntimeWriteSafetyResult,
	TerrainCookVisualOutputArtifactData,
	TerrainCookWriteArtifact,
	TerrainCookWriteArtifactPayload,
	TerrainCookWriteArtifactPurpose,
	TerrainCookWritePlan,
} from "./types.js";

export function buildTerrainCookWritePlan(
	planInput: TerrainCookPlan,
): TerrainCookWritePlan {
	const plan = cloneValue(planInput);
	const sourcePlanHash = hashStableValue(plan);
	const provenance = {
		sourcePlanHash,
		hashAlgorithm: "fnv1a32" as const,
		contract: "TerrainImportCookContract" as const,
	};
	const visualOutput = {
		schemaVersion: 1,
		manifestId: plan.manifestId,
		runtimeSceneId: plan.runtimeSceneId,
		entries: plan.visualOutputs,
	} satisfies TerrainCookVisualOutputArtifactData;
	const collisionOutput = {
		schemaVersion: 1,
		manifestId: plan.manifestId,
		runtimeSceneId: plan.runtimeSceneId,
		entries: plan.collisionChunks,
	} satisfies TerrainCookCollisionChunkArtifactData;
	const levelOutput = {
		schemaVersion: 1,
		manifestId: plan.manifestId,
		runtimeSceneId: plan.runtimeSceneId,
		levelId: plan.levelId,
		entries: buildTerrainLevelInstanceEntries(plan),
	} satisfies TerrainCookLevelInstanceArtifactData;
	const readinessOutput = {
		schemaVersion: 1,
		manifestId: plan.manifestId,
		runtimeSceneId: plan.runtimeSceneId,
		requiredAssetIds: plan.requiredAssetIds,
		requiredCollisionStableIds: plan.requiredCollisionStableIds,
		requiredWalkableStableIds: plan.requiredWalkableStableIds,
		requiredTerrainPackageIds: plan.requiredTerrainPackageIds,
	} satisfies TerrainCookReadinessArtifactData;
	const artifacts: TerrainCookWriteArtifact[] = [
		createWriteArtifact({
			id: `${plan.manifestId}:visual-terrain-outputs`,
			targetFile: plan.targetFiles.assetManifestModule,
			purpose: "visual-terrain-outputs",
			payload: visualOutput,
		}),
		createWriteArtifact({
			id: `${plan.manifestId}:collision-chunks`,
			targetFile: plan.targetFiles.prefabModule,
			purpose: "collision-chunks",
			payload: collisionOutput,
		}),
		createWriteArtifact({
			id: `${plan.manifestId}:level-terrain-instances`,
			targetFile: plan.targetFiles.levelModule,
			purpose: "level-terrain-instances",
			payload: levelOutput,
		}),
		createWriteArtifact({
			id: `${plan.manifestId}:runtime-readiness`,
			targetFile: plan.targetFiles.runtimeSceneManifestModule,
			purpose: "runtime-readiness",
			payload: readinessOutput,
		}),
	];

	if (plan.targetFiles.generatedTerrainRuntimeModule !== undefined) {
		const runtimeModule = buildTerrainCookRuntimeModuleData({
			plan,
			sourcePlanHash,
			readinessOutput,
		});

		artifacts.push(
			createWriteArtifact({
				id: `${plan.manifestId}:terrain-runtime-module`,
				targetFile: plan.targetFiles.generatedTerrainRuntimeModule,
				purpose: "terrain-runtime-module",
				format: "typescript",
				payload: runtimeModule,
				serializedPayload:
					serializeTerrainCookRuntimeModuleSource(runtimeModule),
			}),
		);
	}

	const contentHash = hashStableValue({
		artifacts: artifacts.map((artifact) => ({
			id: artifact.id,
			targetFile: artifact.targetFile,
			purpose: artifact.purpose,
			contentHash: artifact.contentHash,
		})),
		provenance,
	});

	return {
		schemaVersion: 1,
		generator: "terrainCook.writePlan.v1",
		writeMode: "dry-run",
		writesFiles: false,
		manifestId: plan.manifestId,
		runtimeSceneId: plan.runtimeSceneId,
		levelId: plan.levelId,
		targetFiles: plan.targetFiles,
		provenance,
		artifacts,
		contentHash,
	};
}

export function getTerrainCookRuntimeModuleArtifact(
	writePlan: TerrainCookWritePlan,
): TerrainCookWriteArtifact<TerrainCookRuntimeModuleData> | undefined {
	const artifact = writePlan.artifacts.find(
		(item) => item.purpose === "terrain-runtime-module",
	);

	return artifact as
		| TerrainCookWriteArtifact<TerrainCookRuntimeModuleData>
		| undefined;
}

export function serializeTerrainCookRuntimeModule(
	writePlan: TerrainCookWritePlan,
): string {
	const artifact = getTerrainCookRuntimeModuleArtifact(writePlan);

	if (!artifact) {
		throw new Error(
			`terrain cook write plan "${writePlan.manifestId}" does not include a terrain runtime module target.`,
		);
	}

	return artifact.serializedPayload;
}

export function serializeTerrainCookWritePlan(
	writePlan: TerrainCookWritePlan,
): string {
	return serializeStableValue(writePlan);
}

export function validateTerrainCookRuntimeWriteSafety(options: {
	readonly writePlan: TerrainCookWritePlan;
	readonly allowedTargetFiles: readonly string[];
	readonly dirtyFiles?: readonly string[];
	readonly runtimeValidation?: TerrainCookRuntimeValidationResult;
	readonly existingRuntimeModuleSource?: string;
}): TerrainCookRuntimeWriteSafetyResult {
	const errors: string[] = [];
	const allowedTargetFiles = new Set(options.allowedTargetFiles);
	const runtimeArtifact = getTerrainCookRuntimeModuleArtifact(
		options.writePlan,
	);

	if (!runtimeArtifact) {
		errors.push(
			`terrain cook write plan "${options.writePlan.manifestId}" is missing the terrain-runtime-module artifact.`,
		);
	} else if (!allowedTargetFiles.has(runtimeArtifact.targetFile)) {
		errors.push(
			`terrain runtime module target "${runtimeArtifact.targetFile}" is not in the allowed target file list.`,
		);
	}

	for (const artifact of options.writePlan.artifacts) {
		if (!allowedTargetFiles.has(artifact.targetFile)) {
			errors.push(
				`terrain cook artifact "${artifact.id}" targets unexpected file "${artifact.targetFile}".`,
			);
		}
	}

	for (const dirtyFile of options.dirtyFiles ?? []) {
		if (!allowedTargetFiles.has(dirtyFile)) {
			errors.push(`write mode refuses dirty unexpected target "${dirtyFile}".`);
		}
	}

	if (options.runtimeValidation?.ok === false) {
		errors.push(
			[
				`write mode refuses invalid runtime drift for terrain cook manifest "${options.writePlan.manifestId}".`,
				...options.runtimeValidation.errors,
			].join("\n"),
		);
	}

	if (
		options.existingRuntimeModuleSource !== undefined &&
		options.existingRuntimeModuleSource.trim().length > 0 &&
		!options.existingRuntimeModuleSource.includes(
			"terrainCook.runtimeModule.v1",
		)
	) {
		errors.push(
			"write mode refuses to overwrite an existing terrain runtime module without the terrainCook.runtimeModule.v1 generated marker.",
		);
	}

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return { ok: true };
}

function buildTerrainLevelInstanceEntries(
	plan: TerrainCookPlan,
): TerrainCookLevelInstanceArtifactData["entries"] {
	return [
		...plan.visualOutputs.map((output) => ({
			id: `${output.id}:instance`,
			stableId: output.stableId,
			prefabId: output.prefabId,
		})),
		...plan.collisionChunks.map((chunk) =>
			terrainChunkLevelInstanceEntry(chunk, plan),
		),
	];
}

function terrainChunkLevelInstanceEntry(
	chunk: TerrainCookCollisionChunkPlanData,
	plan: TerrainCookPlan,
): TerrainCookLevelInstanceArtifactData["entries"][number] {
	const isStreamable =
		plan.terrainPackage !== undefined &&
		plan.streamableChunkStableIds.includes(chunk.stableId);

	return {
		id: `${chunk.id}:instance`,
		stableId: chunk.stableId,
		prefabId: chunk.prefabId,
		colliderTarget: chunk.colliderTarget,
		...(chunk.shape.type === "box"
			? {
					transform: {
						position: boundsCenter(chunk.bounds),
					},
				}
			: {}),
		...(isStreamable
			? { terrainChunkCellComponent: { packageId: plan.terrainPackage.id } }
			: {}),
		...(!isStreamable && chunk.colliderTarget === "level-instance"
			? { colliderComponent: chunk.colliderComponent }
			: {}),
	};
}

function buildTerrainCookRuntimeModuleData(options: {
	readonly plan: TerrainCookPlan;
	readonly sourcePlanHash: string;
	readonly readinessOutput: TerrainCookReadinessArtifactData;
}): TerrainCookRuntimeModuleData {
	const runtimeModule = {
		schemaVersion: 1,
		generator: "terrainCook.runtimeModule.v1",
		contract: "TerrainImportCookContract",
		writesRuntimeData: true,
		manifestId: options.plan.manifestId,
		runtimeSceneId: options.plan.runtimeSceneId,
		levelId: options.plan.levelId,
		sourcePlanHash: options.sourcePlanHash,
		targetFiles: cloneValue(options.plan.targetFiles),
		visualOutputs: cloneValue(options.plan.visualOutputs),
		visualBindings: cloneValue(options.plan.visualBindings),
		materialSets: cloneValue(options.plan.materialSets),
		collisionChunks: cloneValue(options.plan.collisionChunks),
		levelInstances: cloneValue(buildTerrainLevelInstanceEntries(options.plan)),
		...(options.plan.terrainPackage === undefined
			? {}
			: { terrainPackage: cloneValue(options.plan.terrainPackage) }),
		readiness: cloneValue(options.readinessOutput),
	} satisfies Omit<TerrainCookRuntimeModuleData, "contentHash">;

	return {
		...runtimeModule,
		contentHash: hashStableValue(runtimeModule),
	};
}

function serializeTerrainCookRuntimeModuleSource(
	runtimeModule: TerrainCookRuntimeModuleData,
): string {
	const serializedModule = serializeStableValue(runtimeModule).trimEnd();

	return [
		"// @generated by terrainCook.runtimeModule.v1",
		"// Source: TerrainImportCookContract. Do not edit by hand.",
		'import type { LevelPrefabInstanceData, TerrainCookRuntimeModuleData } from "../../engine/data/index.js";',
		"",
		`export const terrainRuntimeModule = ${serializedModule} satisfies TerrainCookRuntimeModuleData;`,
		"",
		"export const terrainLevelInstances = terrainRuntimeModule.levelInstances satisfies readonly LevelPrefabInstanceData[];",
		"",
		"export const terrainPackage = terrainRuntimeModule.terrainPackage;",
		"",
		"export const terrainReadiness = terrainRuntimeModule.readiness;",
		"",
	].join("\n");
}

function createWriteArtifact<
	TPayload extends TerrainCookWriteArtifactPayload,
>(options: {
	readonly id: string;
	readonly targetFile: string;
	readonly purpose: TerrainCookWriteArtifactPurpose;
	readonly format?: "json" | "typescript";
	readonly payload: TPayload;
	readonly serializedPayload?: string;
}): TerrainCookWriteArtifact<TPayload> {
	const payload = cloneValue(options.payload);
	const serializedPayload =
		options.serializedPayload ?? serializeStableValue(payload);

	return {
		id: options.id,
		targetFile: options.targetFile,
		purpose: options.purpose,
		format: options.format ?? "json",
		payload,
		serializedPayload,
		contentHash: hashString(serializedPayload),
	};
}
