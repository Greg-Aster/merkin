import type {
	CollisionCookBakeFileData,
	CollisionCookLevelOutputData,
	CollisionCookPlan,
	CollisionCookPrefabOutputData,
	CollisionCookPreviewPatch,
	CollisionCookReadinessOutputData,
	CollisionCookRuntimeModuleData,
	CollisionCookRuntimeValidationResult,
	CollisionCookRuntimeWriteSafetyResult,
	CollisionCookWriteArtifact,
	CollisionCookWriteArtifactPayload,
	CollisionCookWriteArtifactPurpose,
	CollisionCookWritePlan,
} from "./types.js";
import {
	cloneValue,
	hashStableValue,
	hashString,
	serializeStableValue,
} from "./utils.js";

export function buildCollisionCookWritePlan(
	planInput: CollisionCookPlan,
): CollisionCookWritePlan {
	const plan = cloneValue(planInput);
	const sourcePlanHash = hashStableValue(plan);
	const provenance = {
		sourcePlanHash,
		hashAlgorithm: "fnv1a32" as const,
		contract: "LevelEditorCollisionCookContract" as const,
	};
	const prefabOutput = {
		schemaVersion: 1,
		draftId: plan.draftId,
		runtimeSceneId: plan.runtimeSceneId,
		entries: plan.entries
			.filter((entry) => entry.colliderTarget === "prefab")
			.map((entry) => ({
				id: entry.id,
				stableId: entry.stableId,
				prefabId: entry.prefabId,
				colliderComponent: cloneValue(entry.colliderComponent),
			})),
	} satisfies CollisionCookPrefabOutputData;
	const levelOutput = {
		schemaVersion: 1,
		draftId: plan.draftId,
		runtimeSceneId: plan.runtimeSceneId,
		levelId: plan.levelId,
		entries: plan.entries.map((entry) => ({
			id: entry.id,
			stableId: entry.stableId,
			prefabId: entry.prefabId,
			colliderTarget: entry.colliderTarget,
			...(entry.transform === undefined
				? {}
				: { transform: cloneValue(entry.transform) }),
			...(entry.colliderTarget === "level-instance"
				? { colliderComponent: cloneValue(entry.colliderComponent) }
				: {}),
		})),
	} satisfies CollisionCookLevelOutputData;
	const readinessOutput = {
		schemaVersion: 1,
		draftId: plan.draftId,
		runtimeSceneId: plan.runtimeSceneId,
		requiredCollisionPrefabIds: plan.requiredCollisionPrefabIds,
		requiredCollisionStableIds: plan.requiredCollisionStableIds,
		requiredWalkableStableIds: plan.requiredWalkableStableIds,
	} satisfies CollisionCookReadinessOutputData;
	const artifacts: CollisionCookWriteArtifact[] = [
		createWriteArtifact({
			id: `${plan.draftId}:prefab-colliders`,
			targetFile: plan.targetFiles.prefabModule,
			purpose: "prefab-colliders",
			payload: prefabOutput,
		}),
		createWriteArtifact({
			id: `${plan.draftId}:level-instances`,
			targetFile: plan.targetFiles.levelModule,
			purpose: "level-instances",
			payload: levelOutput,
		}),
		createWriteArtifact({
			id: `${plan.draftId}:runtime-readiness`,
			targetFile: plan.targetFiles.runtimeSceneManifestModule,
			purpose: "runtime-readiness",
			payload: readinessOutput,
		}),
	];

	if (plan.targetFiles.generatedRuntimeCollisionModule !== undefined) {
		const runtimeModule = buildCollisionCookRuntimeModuleData({
			plan,
			sourcePlanHash,
			prefabOutput,
			levelOutput,
			readinessOutput,
		});

		artifacts.push(
			createWriteArtifact({
				id: `${plan.draftId}:runtime-collision-module`,
				targetFile: plan.targetFiles.generatedRuntimeCollisionModule,
				purpose: "runtime-collision-module",
				format: "typescript",
				payload: runtimeModule,
				serializedPayload:
					serializeCollisionCookRuntimeModuleSource(runtimeModule),
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
		generator: "collisionCook.writePlan.v1",
		writeMode: "dry-run",
		writesFiles: false,
		draftId: plan.draftId,
		runtimeSceneId: plan.runtimeSceneId,
		levelId: plan.levelId,
		targetFiles: plan.targetFiles,
		provenance,
		artifacts,
		contentHash,
	};
}

export function getCollisionCookRuntimeModuleArtifact(
	writePlan: CollisionCookWritePlan,
): CollisionCookWriteArtifact<CollisionCookRuntimeModuleData> | undefined {
	const artifact = writePlan.artifacts.find(
		(item) => item.purpose === "runtime-collision-module",
	);

	return artifact as
		| CollisionCookWriteArtifact<CollisionCookRuntimeModuleData>
		| undefined;
}

export function serializeCollisionCookRuntimeModule(
	writePlan: CollisionCookWritePlan,
): string {
	const artifact = getCollisionCookRuntimeModuleArtifact(writePlan);

	if (!artifact) {
		throw new Error(
			`collision cook write plan "${writePlan.draftId}" does not include a runtime collision module target.`,
		);
	}

	return artifact.serializedPayload;
}

export function validateCollisionCookRuntimeWriteSafety(options: {
	readonly writePlan: CollisionCookWritePlan;
	readonly allowedTargetFiles: readonly string[];
	readonly dirtyFiles?: readonly string[];
	readonly runtimeValidation?: CollisionCookRuntimeValidationResult;
	readonly existingRuntimeModuleSource?: string;
}): CollisionCookRuntimeWriteSafetyResult {
	const errors: string[] = [];
	const allowedTargetFiles = new Set(options.allowedTargetFiles);
	const runtimeArtifact = getCollisionCookRuntimeModuleArtifact(
		options.writePlan,
	);

	if (!runtimeArtifact) {
		errors.push(
			`collision cook write plan "${options.writePlan.draftId}" is missing the runtime-collision-module artifact.`,
		);
	} else if (!allowedTargetFiles.has(runtimeArtifact.targetFile)) {
		errors.push(
			`runtime collision module target "${runtimeArtifact.targetFile}" is not in the allowed target file list.`,
		);
	}

	for (const artifact of options.writePlan.artifacts) {
		if (!allowedTargetFiles.has(artifact.targetFile)) {
			errors.push(
				`collision cook artifact "${artifact.id}" targets unexpected file "${artifact.targetFile}".`,
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
				`write mode refuses invalid runtime drift for draft "${options.writePlan.draftId}".`,
				...options.runtimeValidation.errors,
			].join("\n"),
		);
	}

	if (
		options.existingRuntimeModuleSource !== undefined &&
		options.existingRuntimeModuleSource.trim().length > 0 &&
		!options.existingRuntimeModuleSource.includes(
			"collisionCook.runtimeModule.v1",
		)
	) {
		errors.push(
			"write mode refuses to overwrite an existing runtime collision module without the collisionCook.runtimeModule.v1 generated marker.",
		);
	}

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return { ok: true };
}

export function serializeCollisionCookWritePlan(
	writePlan: CollisionCookWritePlan,
): string {
	return serializeStableValue(writePlan);
}

export function serializeCollisionCookPreviewPatch(
	previewPatch: CollisionCookPreviewPatch,
): string {
	return serializeStableValue(previewPatch);
}

export function serializeCollisionCookBakeFile(
	bakeFile: CollisionCookBakeFileData,
): string {
	return serializeStableValue(bakeFile);
}

function buildCollisionCookRuntimeModuleData(options: {
	readonly plan: CollisionCookPlan;
	readonly sourcePlanHash: string;
	readonly prefabOutput: CollisionCookPrefabOutputData;
	readonly levelOutput: CollisionCookLevelOutputData;
	readonly readinessOutput: CollisionCookReadinessOutputData;
}): CollisionCookRuntimeModuleData {
	const runtimeModule = {
		schemaVersion: 1,
		generator: "collisionCook.runtimeModule.v1",
		contract: "LevelEditorCollisionCookContract",
		writesRuntimeData: true,
		draftId: options.plan.draftId,
		runtimeSceneId: options.plan.runtimeSceneId,
		levelId: options.plan.levelId,
		sourcePlanHash: options.sourcePlanHash,
		targetFiles: cloneValue(options.plan.targetFiles),
		prefabColliders: cloneValue(options.prefabOutput.entries),
		levelInstances: cloneValue(options.levelOutput.entries),
		readiness: cloneValue(options.readinessOutput),
	} satisfies Omit<CollisionCookRuntimeModuleData, "contentHash">;

	return {
		...runtimeModule,
		contentHash: hashStableValue(runtimeModule),
	};
}

function serializeCollisionCookRuntimeModuleSource(
	runtimeModule: CollisionCookRuntimeModuleData,
): string {
	const serializedModule = serializeStableValue(runtimeModule).trimEnd();

	return [
		"// @generated by collisionCook.runtimeModule.v1",
		"// Source: LevelEditorCollisionCookContract. Do not edit by hand.",
		'import type { CollisionCookRuntimeModuleData } from "../../engine/data/index.js";',
		'import type { LevelPrefabInstance } from "../levels/index.js";',
		"",
		`export const collisionRuntimeModule = ${serializedModule} satisfies CollisionCookRuntimeModuleData;`,
		"",
		"export const collisionLevelInstances = collisionRuntimeModule.levelInstances.map((entry) => ({",
		"\tid: entry.id,",
		"\tprefabId: entry.prefabId,",
		"\tstableId: entry.stableId,",
		"\t...(entry.transform === undefined ? {} : { transform: entry.transform }),",
		"\t...(entry.colliderComponent === undefined",
		"\t\t? {}",
		"\t\t: { components: { Collider: entry.colliderComponent } }),",
		"})) satisfies readonly LevelPrefabInstance[];",
		"",
		"export const collisionReadiness = collisionRuntimeModule.readiness;",
		"",
		"export function getCollisionPrefabCollider(",
		"\tprefabId: string,",
		'): CollisionCookRuntimeModuleData["prefabColliders"][number]["colliderComponent"] {',
		"\tconst entry = collisionRuntimeModule.prefabColliders.find(",
		"\t\t(item) => item.prefabId === prefabId,",
		"\t);",
		"",
		"\tif (!entry) {",
		"\t\tthrow new Error(",
		'\t\t\t`Generated collision runtime module is missing prefab collider "${prefabId}".`,',
		"\t\t);",
		"\t}",
		"",
		"\treturn entry.colliderComponent;",
		"}",
		"",
	].join("\n");
}

function createWriteArtifact<
	TPayload extends CollisionCookWriteArtifactPayload,
>(options: {
	readonly id: string;
	readonly targetFile: string;
	readonly purpose: CollisionCookWriteArtifactPurpose;
	readonly format?: "json" | "typescript";
	readonly payload: TPayload;
	readonly serializedPayload?: string;
}): CollisionCookWriteArtifact<TPayload> {
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
