import type {
	CollisionChannelData,
	CollisionIntentData,
	LevelPrefabInstanceData,
	PrefabData,
	RuntimeSceneManifestData,
} from "../schemas/index.js";
import {
	SchemaValidationError,
	createSchemaValidator,
} from "../schemas/index.js";

export type CollisionCookVector3Data = readonly [number, number, number];
export type CollisionCookQuaternionData = readonly [
	number,
	number,
	number,
	number,
];

export type CollisionCookTransformData = {
	readonly position?: CollisionCookVector3Data;
	readonly rotation?: CollisionCookQuaternionData;
	readonly scale?: CollisionCookVector3Data;
};

export type CollisionCookShapeData =
	| {
			readonly type: "box";
			readonly halfExtents: CollisionCookVector3Data;
	  }
	| {
			readonly type: "sphere";
			readonly radius: number;
	  }
	| {
			readonly type: "capsule";
			readonly halfHeight: number;
			readonly radius: number;
	  }
	| {
			readonly type: "cylinder";
			readonly halfHeight: number;
			readonly radius: number;
	  }
	| {
			readonly type: "mesh";
			readonly vertices: readonly CollisionCookVector3Data[];
			readonly indices: readonly number[];
	  };

export type CollisionCookColliderData = {
	readonly intent: CollisionIntentData;
	readonly channel: CollisionChannelData;
	readonly sensor?: boolean;
	readonly shape: CollisionCookShapeData;
};

export type CollisionCookDraftEntryData = {
	readonly id: string;
	readonly stableId: string;
	readonly prefabId: string;
	readonly colliderTarget: "prefab" | "level-instance";
	readonly transform?: CollisionCookTransformData;
	readonly collider: CollisionCookColliderData;
	readonly readiness: {
		readonly requiredCollision: boolean;
		readonly requiredWalkable?: boolean;
	};
	readonly notes?: string;
};

export type CollisionCookTargetFilesData = {
	readonly prefabModule: string;
	readonly levelModule: string;
	readonly runtimeSceneManifestModule: string;
	readonly generatedRuntimeCollisionModule?: string;
};

export type CollisionCookDraftData = {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly targetFiles: CollisionCookTargetFilesData;
	readonly entries: readonly CollisionCookDraftEntryData[];
};

export type CollisionCookPlanEntry = CollisionCookDraftEntryData & {
	readonly colliderComponent: CollisionCookColliderData;
};

export type CollisionCookPlan = {
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly targetFiles: CollisionCookDraftData["targetFiles"];
	readonly entries: readonly CollisionCookPlanEntry[];
	readonly requiredCollisionPrefabIds: readonly string[];
	readonly requiredCollisionStableIds: readonly string[];
	readonly requiredWalkableStableIds: readonly string[];
};

export type CollisionCookRuntimeValidationResult =
	| {
			readonly ok: true;
			readonly plan: CollisionCookPlan;
	  }
	| {
			readonly ok: false;
			readonly plan: CollisionCookPlan;
			readonly errors: readonly string[];
	  };

export type CollisionCookPrefabOutputData = {
	readonly schemaVersion: 1;
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly entries: readonly {
		readonly id: string;
		readonly stableId: string;
		readonly prefabId: string;
		readonly colliderComponent: CollisionCookColliderData;
	}[];
};

export type CollisionCookLevelOutputData = {
	readonly schemaVersion: 1;
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly entries: readonly {
		readonly id: string;
		readonly stableId: string;
		readonly prefabId: string;
		readonly colliderTarget: CollisionCookDraftEntryData["colliderTarget"];
		readonly transform?: CollisionCookTransformData;
		readonly colliderComponent?: CollisionCookColliderData;
	}[];
};

export type CollisionCookReadinessOutputData = {
	readonly schemaVersion: 1;
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly requiredCollisionPrefabIds: readonly string[];
	readonly requiredCollisionStableIds: readonly string[];
	readonly requiredWalkableStableIds: readonly string[];
};

export type CollisionCookWriteArtifactPayload =
	| CollisionCookPrefabOutputData
	| CollisionCookLevelOutputData
	| CollisionCookReadinessOutputData
	| CollisionCookRuntimeModuleData;

export type CollisionCookWriteArtifactPurpose =
	| "prefab-colliders"
	| "level-instances"
	| "runtime-readiness"
	| "runtime-collision-module";

export type CollisionCookWriteArtifact<
	TPayload extends
		CollisionCookWriteArtifactPayload = CollisionCookWriteArtifactPayload,
> = {
	readonly id: string;
	readonly targetFile: string;
	readonly purpose: CollisionCookWriteArtifactPurpose;
	readonly format: "json" | "typescript";
	readonly payload: TPayload;
	readonly serializedPayload: string;
	readonly contentHash: string;
};

export type CollisionCookWritePlan = {
	readonly schemaVersion: 1;
	readonly generator: "collisionCook.writePlan.v1";
	readonly writeMode: "dry-run";
	readonly writesFiles: false;
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly targetFiles: CollisionCookDraftData["targetFiles"];
	readonly provenance: {
		readonly sourcePlanHash: string;
		readonly hashAlgorithm: "fnv1a32";
		readonly contract: "LevelEditorCollisionCookContract";
	};
	readonly artifacts: readonly CollisionCookWriteArtifact[];
	readonly contentHash: string;
};

export type CollisionCookPreviewPatchEntry = {
	readonly id: string;
	readonly stableId: string;
	readonly prefabId: string;
	readonly colliderTarget: CollisionCookDraftEntryData["colliderTarget"];
	readonly transform?: CollisionCookTransformData;
	readonly colliderComponent: CollisionCookColliderData;
	readonly readiness: CollisionCookDraftEntryData["readiness"];
};

export type CollisionCookPreviewPatch = {
	readonly schemaVersion: 1;
	readonly channel: "level-editor-collision-preview";
	readonly mode: "temporary-preview";
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly sourcePlanHash: string;
	readonly entries: readonly CollisionCookPreviewPatchEntry[];
	readonly requiredCollisionStableIds: readonly string[];
	readonly requiredWalkableStableIds: readonly string[];
};

export const LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL =
	"level-editor-dev-preview.v1" as const;

export const LEVEL_EDITOR_DEV_PREVIEW_BROADCAST_CHANNEL =
	"megameal:level-editor-dev-preview:v1" as const;

export type LevelEditorCollisionPreviewPatchMessage = {
	readonly schemaVersion: 1;
	readonly protocol: typeof LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL;
	readonly type: "collision-preview-patch";
	readonly requestId: string;
	readonly payload: CollisionCookPreviewPatch;
};

export type LevelEditorRuntimeReloadReason =
	| "collision-bake-applied"
	| "manual";

export type LevelEditorRuntimeReloadRequest = {
	readonly runtimeSceneId: string;
	readonly reason: LevelEditorRuntimeReloadReason;
	readonly sourcePlanHash?: string;
};

export type LevelEditorCollisionPreviewClearRequest = {
	readonly runtimeSceneId: string;
	readonly sourcePlanHash?: string;
	readonly stableIds?: readonly string[];
};

export type LevelEditorRuntimeReloadRequestMessage = {
	readonly schemaVersion: 1;
	readonly protocol: typeof LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL;
	readonly type: "reload-runtime-scene";
	readonly requestId: string;
	readonly request: LevelEditorRuntimeReloadRequest;
};

export type LevelEditorCollisionPreviewClearRequestMessage = {
	readonly schemaVersion: 1;
	readonly protocol: typeof LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL;
	readonly type: "clear-collision-preview";
	readonly requestId: string;
	readonly request: LevelEditorCollisionPreviewClearRequest;
};

export type LevelEditorDevPreviewMessage =
	| LevelEditorCollisionPreviewPatchMessage
	| LevelEditorRuntimeReloadRequestMessage
	| LevelEditorCollisionPreviewClearRequestMessage;

export type CollisionCookBakeFileData = {
	readonly schemaVersion: 1;
	readonly generator: "collisionCook.bake.v1";
	readonly contract: "LevelEditorCollisionCookContract";
	readonly writesRuntimeData: false;
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly writePlan: CollisionCookWritePlan;
	readonly previewPatch: CollisionCookPreviewPatch;
	readonly contentHash: string;
};

export type CollisionCookRuntimeModuleData = {
	readonly schemaVersion: 1;
	readonly generator: "collisionCook.runtimeModule.v1";
	readonly contract: "LevelEditorCollisionCookContract";
	readonly writesRuntimeData: true;
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly sourcePlanHash: string;
	readonly targetFiles: CollisionCookTargetFilesData;
	readonly prefabColliders: CollisionCookPrefabOutputData["entries"];
	readonly levelInstances: CollisionCookLevelOutputData["entries"];
	readonly readiness: CollisionCookReadinessOutputData;
	readonly contentHash: string;
};

export type CollisionCookRuntimeWriteSafetyResult =
	| {
			readonly ok: true;
	  }
	| {
			readonly ok: false;
			readonly errors: readonly string[];
	  };

export const collisionCookDraftValidator =
	createSchemaValidator<CollisionCookDraftData>(
		"CollisionCookDraft",
		validateCollisionCookDraft,
	);

export const collisionCookPreviewPatchValidator =
	createSchemaValidator<CollisionCookPreviewPatch>(
		"CollisionCookPreviewPatch",
		validateCollisionCookPreviewPatch,
	);

export const levelEditorDevPreviewMessageValidator =
	createSchemaValidator<LevelEditorDevPreviewMessage>(
		"LevelEditorDevPreviewMessage",
		validateLevelEditorDevPreviewMessage,
	);

export function parseCollisionCookDraft(data: unknown): CollisionCookDraftData {
	return collisionCookDraftValidator.parse(data);
}

export function parseCollisionCookPreviewPatch(
	data: unknown,
): CollisionCookPreviewPatch {
	return collisionCookPreviewPatchValidator.parse(data);
}

export function parseLevelEditorDevPreviewMessage(
	data: unknown,
): LevelEditorDevPreviewMessage {
	return levelEditorDevPreviewMessageValidator.parse(data);
}

export function createCollisionPreviewPatchMessage(options: {
	readonly requestId: string;
	readonly patch: unknown;
}): LevelEditorCollisionPreviewPatchMessage {
	return levelEditorDevPreviewMessageValidator.parse({
		schemaVersion: 1,
		protocol: LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		type: "collision-preview-patch",
		requestId: options.requestId,
		payload: parseCollisionCookPreviewPatch(options.patch),
	}) as LevelEditorCollisionPreviewPatchMessage;
}

export function createRuntimeSceneReloadRequestMessage(options: {
	readonly requestId: string;
	readonly runtimeSceneId: string;
	readonly reason: LevelEditorRuntimeReloadReason;
	readonly sourcePlanHash?: string;
}): LevelEditorRuntimeReloadRequestMessage {
	return levelEditorDevPreviewMessageValidator.parse({
		schemaVersion: 1,
		protocol: LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		type: "reload-runtime-scene",
		requestId: options.requestId,
		request: {
			runtimeSceneId: options.runtimeSceneId,
			reason: options.reason,
			...(options.sourcePlanHash === undefined
				? {}
				: { sourcePlanHash: options.sourcePlanHash }),
		},
	}) as LevelEditorRuntimeReloadRequestMessage;
}

export function createCollisionPreviewClearRequestMessage(options: {
	readonly requestId: string;
	readonly runtimeSceneId: string;
	readonly sourcePlanHash?: string;
	readonly stableIds?: readonly string[];
}): LevelEditorCollisionPreviewClearRequestMessage {
	return levelEditorDevPreviewMessageValidator.parse({
		schemaVersion: 1,
		protocol: LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		type: "clear-collision-preview",
		requestId: options.requestId,
		request: {
			runtimeSceneId: options.runtimeSceneId,
			...(options.sourcePlanHash === undefined
				? {}
				: { sourcePlanHash: options.sourcePlanHash }),
			...(options.stableIds === undefined
				? {}
				: { stableIds: [...options.stableIds] }),
		},
	}) as LevelEditorCollisionPreviewClearRequestMessage;
}

export function buildCollisionCookPlan(draftInput: unknown): CollisionCookPlan {
	const draft = parseCollisionCookDraft(draftInput);
	const requiredEntries = draft.entries.filter(
		(entry) => entry.readiness.requiredCollision,
	);

	return {
		draftId: draft.id,
		runtimeSceneId: draft.runtimeSceneId,
		levelId: draft.levelId,
		targetFiles: draft.targetFiles,
		entries: draft.entries.map((entry) => ({
			...cloneValue(entry),
			colliderComponent: cloneValue(entry.collider),
		})),
		requiredCollisionPrefabIds: sortedUnique(
			requiredEntries.map((entry) => entry.prefabId),
		),
		requiredCollisionStableIds: sortedUnique(
			requiredEntries.map((entry) => entry.stableId),
		),
		requiredWalkableStableIds: sortedUnique(
			draft.entries
				.filter((entry) => entry.readiness.requiredWalkable === true)
				.map((entry) => entry.stableId),
		),
	};
}

export function buildCollisionCookPreviewPatch(
	planInput: CollisionCookPlan,
): CollisionCookPreviewPatch {
	const plan = cloneValue(planInput);

	return {
		schemaVersion: 1,
		channel: "level-editor-collision-preview",
		mode: "temporary-preview",
		draftId: plan.draftId,
		runtimeSceneId: plan.runtimeSceneId,
		levelId: plan.levelId,
		sourcePlanHash: hashStableValue(plan),
		entries: plan.entries.map((entry) => ({
			id: entry.id,
			stableId: entry.stableId,
			prefabId: entry.prefabId,
			colliderTarget: entry.colliderTarget,
			...(entry.transform === undefined
				? {}
				: { transform: cloneValue(entry.transform) }),
			colliderComponent: cloneValue(entry.colliderComponent),
			readiness: cloneValue(entry.readiness),
		})),
		requiredCollisionStableIds: plan.requiredCollisionStableIds,
		requiredWalkableStableIds: plan.requiredWalkableStableIds,
	};
}

export function buildCollisionCookBakeFile(
	planInput: CollisionCookPlan,
): CollisionCookBakeFileData {
	const plan = cloneValue(planInput);
	const writePlan = buildCollisionCookWritePlan(plan);
	const previewPatch = buildCollisionCookPreviewPatch(plan);
	const bakeFile = {
		schemaVersion: 1,
		generator: "collisionCook.bake.v1",
		contract: "LevelEditorCollisionCookContract",
		writesRuntimeData: false,
		draftId: plan.draftId,
		runtimeSceneId: plan.runtimeSceneId,
		levelId: plan.levelId,
		writePlan,
		previewPatch,
	} satisfies Omit<CollisionCookBakeFileData, "contentHash">;

	return {
		...bakeFile,
		contentHash: hashStableValue(bakeFile),
	};
}

export function validateCollisionCookPlanAgainstRuntimeScene(options: {
	readonly plan: CollisionCookPlan;
	readonly manifest: RuntimeSceneManifestData;
}): CollisionCookRuntimeValidationResult {
	const { plan, manifest } = options;
	const errors: string[] = [];
	const prefabs = mapPrefabsById(manifest.prefabs);
	const instances = mapInstancesByStableId(manifest.level.instances);
	const requiredCollisionPrefabIds = new Set(
		manifest.readiness.requiredCollisionPrefabIds ?? [],
	);
	const requiredCollisionStableIds = new Set(
		manifest.readiness.requiredCollisionStableIds ?? [],
	);
	const requiredWalkableStableIds = new Set(
		manifest.readiness.requiredWalkableStableIds ?? [],
	);

	if (manifest.id !== plan.runtimeSceneId) {
		errors.push(
			`collision cook plan "${plan.draftId}" targets runtime scene "${plan.runtimeSceneId}", but manifest is "${manifest.id}".`,
		);
	}

	if (manifest.level.id !== plan.levelId) {
		errors.push(
			`collision cook plan "${plan.draftId}" targets level "${plan.levelId}", but manifest level is "${manifest.level.id}".`,
		);
	}

	for (const entry of plan.entries) {
		const instance = instances.get(entry.stableId);
		const prefab = prefabs.get(entry.prefabId);

		if (!instance) {
			errors.push(
				`collision cook entry "${entry.id}" stableId "${entry.stableId}" is not present in manifest "${manifest.id}".`,
			);
			continue;
		}

		if (instance.prefabId !== entry.prefabId) {
			errors.push(
				`collision cook entry "${entry.id}" stableId "${entry.stableId}" expects prefab "${entry.prefabId}", but runtime instance uses "${instance.prefabId}".`,
			);
		}

		if (!prefab) {
			errors.push(
				`collision cook entry "${entry.id}" references missing prefab "${entry.prefabId}" in manifest "${manifest.id}".`,
			);
			continue;
		}

		validateCookTarget(entry, prefab, instance, errors);
		validateCookedRuntimeCollider(entry, prefab, instance, errors);
		validateCookedRuntimeTransform(entry, instance, errors);
		validateCookedRuntimeReadiness(entry, {
			requiredCollisionPrefabIds,
			requiredCollisionStableIds,
			requiredWalkableStableIds,
			errors,
		});
	}

	for (const prefabId of plan.requiredCollisionPrefabIds) {
		if (!requiredCollisionPrefabIds.has(prefabId)) {
			errors.push(
				`collision cook plan "${plan.draftId}" required collision prefab "${prefabId}" is missing from runtime readiness.`,
			);
		}
	}

	if (errors.length === 0) {
		return { ok: true, plan };
	}

	return { ok: false, plan, errors };
}

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

export function validateCollisionCookDraft(data: unknown): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["collision cook draft must be an object."];
	}

	if (data.schemaVersion !== 1) {
		errors.push("collisionCookDraft.schemaVersion must be 1.");
	}

	requireString(data.id, "collisionCookDraft.id", errors);
	requireString(
		data.runtimeSceneId,
		"collisionCookDraft.runtimeSceneId",
		errors,
	);
	requireString(data.levelId, "collisionCookDraft.levelId", errors);
	validateTargetFiles(
		data.targetFiles,
		"collisionCookDraft.targetFiles",
		errors,
	);

	if (!Array.isArray(data.entries) || data.entries.length === 0) {
		errors.push("collisionCookDraft.entries must contain at least one entry.");
		return errors;
	}

	const entryIds = new Set<string>();
	const stableIds = new Set<string>();

	for (const [index, entry] of data.entries.entries()) {
		validateCollisionCookDraftEntry(
			entry,
			`collisionCookDraft.entries.${index}`,
			{ entryIds, stableIds },
			errors,
		);
	}

	return errors;
}

export function validateCollisionCookPreviewPatch(
	data: unknown,
): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["collision preview patch must be an object."];
	}

	if (data.schemaVersion !== 1) {
		errors.push("collisionPreviewPatch.schemaVersion must be 1.");
	}

	if (data.channel !== "level-editor-collision-preview") {
		errors.push(
			"collisionPreviewPatch.channel must be level-editor-collision-preview.",
		);
	}

	if (data.mode !== "temporary-preview") {
		errors.push("collisionPreviewPatch.mode must be temporary-preview.");
	}

	requireString(data.draftId, "collisionPreviewPatch.draftId", errors);
	requireString(
		data.runtimeSceneId,
		"collisionPreviewPatch.runtimeSceneId",
		errors,
	);
	requireString(data.levelId, "collisionPreviewPatch.levelId", errors);
	requireString(
		data.sourcePlanHash,
		"collisionPreviewPatch.sourcePlanHash",
		errors,
	);

	if (!Array.isArray(data.entries) || data.entries.length === 0) {
		errors.push(
			"collisionPreviewPatch.entries must contain at least one entry.",
		);
		return errors;
	}

	const entryIds = new Set<string>();
	const stableIds = new Set<string>();

	for (const [index, entry] of data.entries.entries()) {
		validateCollisionCookPreviewEntry(
			entry,
			`collisionPreviewPatch.entries.${index}`,
			{ entryIds, stableIds },
			errors,
		);
	}

	validateStringArray(
		data.requiredCollisionStableIds,
		"collisionPreviewPatch.requiredCollisionStableIds",
		errors,
	);
	validateStringArray(
		data.requiredWalkableStableIds,
		"collisionPreviewPatch.requiredWalkableStableIds",
		errors,
	);

	return errors;
}

export function validateLevelEditorDevPreviewMessage(
	data: unknown,
): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["level editor dev preview message must be an object."];
	}

	if (data.schemaVersion !== 1) {
		errors.push("levelEditorDevPreviewMessage.schemaVersion must be 1.");
	}

	if (data.protocol !== LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL) {
		errors.push(
			`levelEditorDevPreviewMessage.protocol must be ${LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL}.`,
		);
	}

	requireString(
		data.requestId,
		"levelEditorDevPreviewMessage.requestId",
		errors,
	);

	switch (data.type) {
		case "collision-preview-patch":
			for (const error of validateCollisionCookPreviewPatch(data.payload)) {
				errors.push(`levelEditorDevPreviewMessage.payload: ${error}`);
			}
			return errors;
		case "reload-runtime-scene":
			validateRuntimeReloadRequest(
				data.request,
				"levelEditorDevPreviewMessage.request",
				errors,
			);
			return errors;
		case "clear-collision-preview":
			validateCollisionPreviewClearRequest(
				data.request,
				"levelEditorDevPreviewMessage.request",
				errors,
			);
			return errors;
		default:
			errors.push(
				"levelEditorDevPreviewMessage.type must be collision-preview-patch, reload-runtime-scene, or clear-collision-preview.",
			);
			return errors;
	}
}

function validateRuntimeReloadRequest(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data.runtimeSceneId, `${path}.runtimeSceneId`, errors);

	if (data.reason !== "collision-bake-applied" && data.reason !== "manual") {
		errors.push(`${path}.reason must be collision-bake-applied or manual.`);
	}

	if (
		data.sourcePlanHash !== undefined &&
		typeof data.sourcePlanHash !== "string"
	) {
		errors.push(`${path}.sourcePlanHash must be a string when provided.`);
	}
}

function validateCollisionPreviewClearRequest(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data.runtimeSceneId, `${path}.runtimeSceneId`, errors);

	if (
		data.sourcePlanHash !== undefined &&
		typeof data.sourcePlanHash !== "string"
	) {
		errors.push(`${path}.sourcePlanHash must be a string when provided.`);
	}

	if (data.stableIds !== undefined) {
		validateStringArray(data.stableIds, `${path}.stableIds`, errors);
	}
}

function validateTargetFiles(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data.prefabModule, `${path}.prefabModule`, errors);
	requireString(data.levelModule, `${path}.levelModule`, errors);
	requireString(
		data.runtimeSceneManifestModule,
		`${path}.runtimeSceneManifestModule`,
		errors,
	);

	if (
		data.generatedRuntimeCollisionModule !== undefined &&
		typeof data.generatedRuntimeCollisionModule !== "string"
	) {
		errors.push(`${path}.generatedRuntimeCollisionModule must be a string.`);
	}
}

function validateCollisionCookDraftEntry(
	data: unknown,
	path: string,
	seen: {
		readonly entryIds: Set<string>;
		readonly stableIds: Set<string>;
	},
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(data.id, `${path}.id`, seen.entryIds, errors);
	requireUniqueString(
		data.stableId,
		`${path}.stableId`,
		seen.stableIds,
		errors,
	);
	requireString(data.prefabId, `${path}.prefabId`, errors);

	if (
		data.colliderTarget !== "prefab" &&
		data.colliderTarget !== "level-instance"
	) {
		errors.push(`${path}.colliderTarget must be prefab or level-instance.`);
	}

	validateTransform(data.transform, `${path}.transform`, errors);
	validateCollider(data.collider, `${path}.collider`, errors);
	validateReadiness(data.readiness, `${path}.readiness`, data.collider, errors);

	if (data.notes !== undefined && typeof data.notes !== "string") {
		errors.push(`${path}.notes must be a string when provided.`);
	}
}

function validateCollisionCookPreviewEntry(
	data: unknown,
	path: string,
	seen: {
		readonly entryIds: Set<string>;
		readonly stableIds: Set<string>;
	},
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(data.id, `${path}.id`, seen.entryIds, errors);
	requireUniqueString(
		data.stableId,
		`${path}.stableId`,
		seen.stableIds,
		errors,
	);
	requireString(data.prefabId, `${path}.prefabId`, errors);

	if (
		data.colliderTarget !== "prefab" &&
		data.colliderTarget !== "level-instance"
	) {
		errors.push(`${path}.colliderTarget must be prefab or level-instance.`);
	}

	validateTransform(data.transform, `${path}.transform`, errors);
	validateCollider(data.colliderComponent, `${path}.colliderComponent`, errors);
	validateReadiness(
		data.readiness,
		`${path}.readiness`,
		data.colliderComponent,
		errors,
	);
}

function validateTransform(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (data === undefined) {
		return;
	}

	if (!isRecord(data)) {
		errors.push(`${path} must be an object when provided.`);
		return;
	}

	validateOptionalNumberTuple(data.position, 3, `${path}.position`, errors);
	validateOptionalNumberTuple(data.rotation, 4, `${path}.rotation`, errors);
	validateOptionalNumberTuple(data.scale, 3, `${path}.scale`, errors);
}

function validateCollider(data: unknown, path: string, errors: string[]): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateCollisionIntent(data.intent, `${path}.intent`, errors);
	requireString(data.channel, `${path}.channel`, errors);

	if (data.sensor !== undefined && typeof data.sensor !== "boolean") {
		errors.push(`${path}.sensor must be a boolean when provided.`);
	}

	if (data.intent === "trigger" && data.sensor !== true) {
		errors.push(`${path}.sensor must be true for trigger collision.`);
	}

	if (
		(data.intent === "solid" || data.intent === "walkable") &&
		data.sensor === true
	) {
		errors.push(
			`${path}.sensor cannot be true for solid or walkable collision.`,
		);
	}

	validateShape(data.shape, `${path}.shape`, errors);
}

function validateReadiness(
	data: unknown,
	path: string,
	collider: unknown,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (typeof data.requiredCollision !== "boolean") {
		errors.push(`${path}.requiredCollision must be a boolean.`);
	}

	if (
		data.requiredWalkable !== undefined &&
		typeof data.requiredWalkable !== "boolean"
	) {
		errors.push(`${path}.requiredWalkable must be a boolean when provided.`);
	}

	if (data.requiredWalkable === true) {
		if (data.requiredCollision !== true) {
			errors.push(`${path}.requiredWalkable requires requiredCollision true.`);
		}

		if (isRecord(collider) && collider.intent !== "walkable") {
			errors.push(
				`${path}.requiredWalkable requires collider.intent walkable.`,
			);
		}
	}
}

function validateShape(data: unknown, path: string, errors: string[]): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	switch (data.type) {
		case "box":
			validateRequiredPositiveNumberTuple(
				data.halfExtents,
				3,
				`${path}.halfExtents`,
				errors,
			);
			return;
		case "sphere":
			validateRequiredPositiveNumber(data.radius, `${path}.radius`, errors);
			return;
		case "capsule":
			validateRequiredPositiveNumber(
				data.halfHeight,
				`${path}.halfHeight`,
				errors,
			);
			validateRequiredPositiveNumber(data.radius, `${path}.radius`, errors);
			return;
		case "cylinder":
			validateRequiredPositiveNumber(
				data.halfHeight,
				`${path}.halfHeight`,
				errors,
			);
			validateRequiredPositiveNumber(data.radius, `${path}.radius`, errors);
			return;
		case "mesh":
			validateMeshShape(data, path, errors);
			return;
		default:
			errors.push(
				`${path}.type must be box, sphere, capsule, cylinder, or mesh.`,
			);
	}
}

function validateMeshShape(
	data: Record<string, unknown>,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(data.vertices) || data.vertices.length < 3) {
		errors.push(`${path}.vertices must contain at least 3 vertices.`);
		return;
	}

	for (const [index, vertex] of data.vertices.entries()) {
		validateRequiredNumberTuple(vertex, 3, `${path}.vertices.${index}`, errors);
	}

	if (!Array.isArray(data.indices) || data.indices.length < 3) {
		errors.push(`${path}.indices must contain at least 3 indices.`);
		return;
	}

	if (data.indices.length % 3 !== 0) {
		errors.push(`${path}.indices length must be divisible by 3.`);
	}

	for (const [index, item] of data.indices.entries()) {
		if (
			typeof item !== "number" ||
			!Number.isInteger(item) ||
			item < 0 ||
			item >= data.vertices.length
		) {
			errors.push(`${path}.indices.${index} must be an integer vertex index.`);
		}
	}
}

function validateCookTarget(
	entry: CollisionCookPlanEntry,
	prefab: PrefabData,
	instance: LevelPrefabInstanceData,
	errors: string[],
): void {
	const targetCollider =
		entry.colliderTarget === "prefab"
			? prefab.components.Collider
			: instance.components?.Collider;

	if (!isRecord(targetCollider)) {
		errors.push(
			`collision cook entry "${entry.id}" targets ${entry.colliderTarget} collider output, but that target has no Collider component.`,
		);
		return;
	}

	if (!sameValue(targetCollider, entry.colliderComponent)) {
		errors.push(
			`collision cook entry "${entry.id}" target ${entry.colliderTarget} Collider does not match the authored draft.`,
		);
	}
}

function validateCookedRuntimeCollider(
	entry: CollisionCookPlanEntry,
	prefab: PrefabData,
	instance: LevelPrefabInstanceData,
	errors: string[],
): void {
	const runtimeCollider = effectiveCollider(prefab, instance);

	if (!isRecord(runtimeCollider)) {
		errors.push(
			`collision cook entry "${entry.id}" stableId "${entry.stableId}" has no effective runtime Collider.`,
		);
		return;
	}

	if (!sameValue(runtimeCollider, entry.colliderComponent)) {
		errors.push(
			`collision cook entry "${entry.id}" effective runtime Collider does not match the authored draft.`,
		);
	}
}

function validateCookedRuntimeTransform(
	entry: CollisionCookPlanEntry,
	instance: LevelPrefabInstanceData,
	errors: string[],
): void {
	if (entry.transform === undefined) {
		return;
	}

	if (!sameValue(instance.transform, entry.transform)) {
		errors.push(
			`collision cook entry "${entry.id}" runtime transform does not match the authored draft.`,
		);
	}
}

function validateCookedRuntimeReadiness(
	entry: CollisionCookPlanEntry,
	state: {
		readonly requiredCollisionPrefabIds: ReadonlySet<string>;
		readonly requiredCollisionStableIds: ReadonlySet<string>;
		readonly requiredWalkableStableIds: ReadonlySet<string>;
		readonly errors: string[];
	},
): void {
	if (!entry.readiness.requiredCollision) {
		return;
	}

	if (!state.requiredCollisionPrefabIds.has(entry.prefabId)) {
		state.errors.push(
			`collision cook entry "${entry.id}" prefab "${entry.prefabId}" is missing from readiness.requiredCollisionPrefabIds.`,
		);
	}

	if (!state.requiredCollisionStableIds.has(entry.stableId)) {
		state.errors.push(
			`collision cook entry "${entry.id}" stableId "${entry.stableId}" is missing from readiness.requiredCollisionStableIds.`,
		);
	}

	if (
		entry.readiness.requiredWalkable === true &&
		!state.requiredWalkableStableIds.has(entry.stableId)
	) {
		state.errors.push(
			`collision cook entry "${entry.id}" stableId "${entry.stableId}" is missing from readiness.requiredWalkableStableIds.`,
		);
	}
}

function effectiveCollider(
	prefab: PrefabData,
	instance: LevelPrefabInstanceData,
): unknown {
	return isRecord(instance.components?.Collider)
		? instance.components.Collider
		: prefab.components.Collider;
}

function mapPrefabsById(
	prefabs: readonly PrefabData[],
): ReadonlyMap<string, PrefabData> {
	return new Map(prefabs.map((prefab) => [prefab.id, prefab] as const));
}

function mapInstancesByStableId(
	instances: readonly LevelPrefabInstanceData[],
): ReadonlyMap<string, LevelPrefabInstanceData> {
	return new Map(
		instances.map((instance) => [instance.stableId, instance] as const),
	);
}

function requireString(value: unknown, path: string, errors: string[]): void {
	if (typeof value !== "string" || value.length === 0) {
		errors.push(`${path} must be a non-empty string.`);
	}
}

function requireUniqueString(
	value: unknown,
	path: string,
	seen: Set<string>,
	errors: string[],
): void {
	if (typeof value !== "string" || value.length === 0) {
		errors.push(`${path} must be a non-empty string.`);
		return;
	}

	if (seen.has(value)) {
		errors.push(`${path} contains duplicate value "${value}".`);
	}

	seen.add(value);
}

function validateCollisionIntent(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (value !== "solid" && value !== "trigger" && value !== "walkable") {
		errors.push(`${path} must be solid, trigger, or walkable.`);
	}
}

function validateOptionalNumberTuple(
	value: unknown,
	size: number,
	path: string,
	errors: string[],
): void {
	if (value === undefined) {
		return;
	}

	validateRequiredNumberTuple(value, size, path, errors);
}

function validateRequiredNumberTuple(
	value: unknown,
	size: number,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(value) || value.length !== size) {
		errors.push(`${path} must be a ${size}-item number tuple.`);
		return;
	}

	for (const [index, item] of value.entries()) {
		if (typeof item !== "number" || !Number.isFinite(item)) {
			errors.push(`${path}.${index} must be a finite number.`);
		}
	}
}

function validateRequiredPositiveNumberTuple(
	value: unknown,
	size: number,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(value) || value.length !== size) {
		errors.push(`${path} must be a ${size}-item positive number tuple.`);
		return;
	}

	for (const [index, item] of value.entries()) {
		if (typeof item !== "number" || !Number.isFinite(item) || item <= 0) {
			errors.push(`${path}.${index} must be a finite positive number.`);
		}
	}
}

function validateRequiredPositiveNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		errors.push(`${path} must be a finite positive number.`);
	}
}

function validateStringArray(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(data)) {
		errors.push(`${path} must be an array.`);
		return;
	}

	for (const [index, item] of data.entries()) {
		if (typeof item !== "string" || item.length === 0) {
			errors.push(`${path}.${index} must be a non-empty string.`);
		}
	}
}

function sortedUnique(values: readonly string[]): readonly string[] {
	return [...new Set(values)].sort();
}

function cloneValue<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}

function sameValue(left: unknown, right: unknown): boolean {
	return serializeStableValue(left) === serializeStableValue(right);
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

function hashStableValue(value: unknown): string {
	return hashString(serializeStableValue(value));
}

function hashString(value: string): string {
	let hash = 0x811c9dc5;

	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}

	return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

function serializeStableValue(value: unknown): string {
	return `${JSON.stringify(normalizeStableValue(value), null, "\t")}\n`;
}

function normalizeStableValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => normalizeStableValue(item));
	}

	if (!isRecord(value)) {
		return value;
	}

	const result: Record<string, unknown> = {};

	for (const key of Object.keys(value).sort()) {
		const item = value[key];

		if (item !== undefined) {
			result[key] = normalizeStableValue(item);
		}
	}

	return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export { SchemaValidationError as CollisionCookDraftValidationError };
