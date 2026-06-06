import type {
	AssetManifestEntryData,
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

export type TerrainCookVector3Data = readonly [number, number, number];
export type TerrainCookVector2Data = readonly [number, number];

export type TerrainCookBoundsData = {
	readonly min: TerrainCookVector3Data;
	readonly max: TerrainCookVector3Data;
};

export type TerrainCookSourceData = {
	readonly id: string;
	readonly kind: "glb";
	readonly uri: string;
	readonly contentHash: string;
	readonly unitsPerMeter: number;
	readonly upAxis: "y";
	readonly coordinateSpace: "engine-world";
	readonly bounds: TerrainCookBoundsData;
};

export type TerrainCookTargetFilesData = {
	readonly assetManifestModule: string;
	readonly prefabModule: string;
	readonly levelModule: string;
	readonly runtimeSceneManifestModule: string;
	readonly generatedTerrainRuntimeModule?: string;
	readonly generatedTerrainMetadata?: string;
};

export type TerrainCookPolicyData = {
	readonly sourceScaleBakedIntoOutputs: true;
	readonly collisionSource: "heightfield" | "mesh" | "mixed";
	readonly chunking: {
		readonly strategy: "grid";
		readonly chunkSizeMeters: number;
	};
};

export type TerrainCookProvenanceData = {
	readonly contract: "TerrainImportCookContract";
	readonly generator: string;
	readonly sourceContentHash: string;
	readonly hashAlgorithm: "fnv1a32";
	readonly generatedAt: string;
	readonly evidence: readonly string[];
};

export type TerrainCookAssetEntryData = AssetManifestEntryData & {
	readonly contentHash?: string;
};

export type TerrainCookVisualOutputData = {
	readonly id: string;
	readonly stableId: string;
	readonly prefabId: string;
	readonly asset: TerrainCookAssetEntryData;
	readonly materialAssetIds: readonly string[];
	readonly bounds: TerrainCookBoundsData;
	readonly sourceChunkIds: readonly string[];
	readonly readiness: {
		readonly requiredAsset: boolean;
	};
};

export type TerrainCookHeightfieldShapeData = {
	readonly type: "heightfield";
	readonly rows: number;
	readonly columns: number;
	readonly heights: readonly number[];
	readonly cellSize: TerrainCookVector2Data;
	readonly origin: TerrainCookVector3Data;
};

export type TerrainCookMeshShapeData = {
	readonly type: "mesh";
	readonly vertices: readonly TerrainCookVector3Data[];
	readonly indices: readonly number[];
};

export type TerrainCookInputShapeData =
	| TerrainCookHeightfieldShapeData
	| TerrainCookMeshShapeData;

export type TerrainCookOutputMeshShapeData = {
	readonly type: "mesh";
	readonly vertices: readonly TerrainCookVector3Data[];
	readonly indices: readonly number[];
};

export type TerrainCookCollisionChunkData = {
	readonly id: string;
	readonly stableId: string;
	readonly prefabId: string;
	readonly colliderTarget: "prefab" | "level-instance";
	readonly chunkKey: TerrainCookVector2Data;
	readonly bounds: TerrainCookBoundsData;
	readonly intent: CollisionIntentData;
	readonly channel: CollisionChannelData;
	readonly sensor?: boolean;
	readonly shape: TerrainCookInputShapeData;
	readonly readiness: {
		readonly requiredCollision: boolean;
		readonly requiredWalkable?: boolean;
	};
	readonly materialId?: string;
};

export type TerrainCookManifestData = {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly targetFiles: TerrainCookTargetFilesData;
	readonly source: TerrainCookSourceData;
	readonly policy: TerrainCookPolicyData;
	readonly provenance: TerrainCookProvenanceData;
	readonly visualOutputs: readonly TerrainCookVisualOutputData[];
	readonly collisionChunks: readonly TerrainCookCollisionChunkData[];
};

export type TerrainCookVisualOutputPlanData = TerrainCookVisualOutputData & {
	readonly assetEntry: AssetManifestEntryData;
};

export type TerrainCookColliderComponentData = {
	readonly intent: CollisionIntentData;
	readonly channel: CollisionChannelData;
	readonly sensor?: boolean;
	readonly shape: TerrainCookOutputMeshShapeData;
};

export type TerrainCookCollisionChunkPlanData =
	TerrainCookCollisionChunkData & {
		readonly colliderComponent: TerrainCookColliderComponentData;
	};

export type TerrainCookPlan = {
	readonly manifestId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly targetFiles: TerrainCookTargetFilesData;
	readonly source: TerrainCookSourceData;
	readonly policy: TerrainCookPolicyData;
	readonly provenance: TerrainCookProvenanceData;
	readonly visualOutputs: readonly TerrainCookVisualOutputPlanData[];
	readonly collisionChunks: readonly TerrainCookCollisionChunkPlanData[];
	readonly requiredAssetIds: readonly string[];
	readonly requiredCollisionStableIds: readonly string[];
	readonly requiredWalkableStableIds: readonly string[];
};

export type TerrainCookRuntimeValidationResult =
	| {
			readonly ok: true;
			readonly plan: TerrainCookPlan;
	  }
	| {
			readonly ok: false;
			readonly plan: TerrainCookPlan;
			readonly errors: readonly string[];
	  };

export type TerrainCookVisualOutputArtifactData = {
	readonly schemaVersion: 1;
	readonly manifestId: string;
	readonly runtimeSceneId: string;
	readonly entries: readonly TerrainCookVisualOutputPlanData[];
};

export type TerrainCookCollisionChunkArtifactData = {
	readonly schemaVersion: 1;
	readonly manifestId: string;
	readonly runtimeSceneId: string;
	readonly entries: readonly TerrainCookCollisionChunkPlanData[];
};

export type TerrainCookLevelInstanceArtifactData = {
	readonly schemaVersion: 1;
	readonly manifestId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly entries: readonly {
		readonly id: string;
		readonly stableId: string;
		readonly prefabId: string;
		readonly colliderTarget?: TerrainCookCollisionChunkData["colliderTarget"];
		readonly transform?: LevelPrefabInstanceData["transform"];
		readonly colliderComponent?: TerrainCookColliderComponentData;
	}[];
};

export type TerrainCookReadinessArtifactData = {
	readonly schemaVersion: 1;
	readonly manifestId: string;
	readonly runtimeSceneId: string;
	readonly requiredAssetIds: readonly string[];
	readonly requiredCollisionStableIds: readonly string[];
	readonly requiredWalkableStableIds: readonly string[];
};

export type TerrainCookRuntimeModuleData = {
	readonly schemaVersion: 1;
	readonly generator: "terrainCook.runtimeModule.v1";
	readonly contract: "TerrainImportCookContract";
	readonly writesRuntimeData: true;
	readonly manifestId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly sourcePlanHash: string;
	readonly targetFiles: TerrainCookTargetFilesData;
	readonly visualOutputs: readonly TerrainCookVisualOutputPlanData[];
	readonly collisionChunks: readonly TerrainCookCollisionChunkPlanData[];
	readonly readiness: TerrainCookReadinessArtifactData;
	readonly contentHash: string;
};

export type TerrainCookWriteArtifactPayload =
	| TerrainCookVisualOutputArtifactData
	| TerrainCookCollisionChunkArtifactData
	| TerrainCookLevelInstanceArtifactData
	| TerrainCookReadinessArtifactData
	| TerrainCookRuntimeModuleData;

export type TerrainCookWriteArtifactPurpose =
	| "visual-terrain-outputs"
	| "collision-chunks"
	| "level-terrain-instances"
	| "runtime-readiness"
	| "terrain-runtime-module";

export type TerrainCookWriteArtifact<
	TPayload extends
		TerrainCookWriteArtifactPayload = TerrainCookWriteArtifactPayload,
> = {
	readonly id: string;
	readonly targetFile: string;
	readonly purpose: TerrainCookWriteArtifactPurpose;
	readonly format: "json" | "typescript";
	readonly payload: TPayload;
	readonly serializedPayload: string;
	readonly contentHash: string;
};

export type TerrainCookWritePlan = {
	readonly schemaVersion: 1;
	readonly generator: "terrainCook.writePlan.v1";
	readonly writeMode: "dry-run";
	readonly writesFiles: false;
	readonly manifestId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly targetFiles: TerrainCookTargetFilesData;
	readonly provenance: {
		readonly sourcePlanHash: string;
		readonly hashAlgorithm: "fnv1a32";
		readonly contract: "TerrainImportCookContract";
	};
	readonly artifacts: readonly TerrainCookWriteArtifact[];
	readonly contentHash: string;
};

export type TerrainCookRuntimeWriteSafetyResult =
	| {
			readonly ok: true;
	  }
	| {
			readonly ok: false;
			readonly errors: readonly string[];
	  };

export const terrainCookManifestValidator =
	createSchemaValidator<TerrainCookManifestData>(
		"TerrainCookManifest",
		validateTerrainCookManifest,
	);

export function parseTerrainCookManifest(
	data: unknown,
): TerrainCookManifestData {
	return terrainCookManifestValidator.parse(data);
}

export function buildTerrainCookPlan(manifestInput: unknown): TerrainCookPlan {
	const manifest = parseTerrainCookManifest(manifestInput);
	const visualOutputs = manifest.visualOutputs.map((output) => ({
		...cloneValue(output),
		assetEntry: toAssetManifestEntry(output.asset),
	}));
	const collisionChunks = manifest.collisionChunks.map((chunk) => ({
		...cloneValue(chunk),
		colliderComponent: {
			intent: chunk.intent,
			channel: chunk.channel,
			...(chunk.sensor === undefined ? {} : { sensor: chunk.sensor }),
			shape: buildColliderMeshShape(chunk.shape),
		},
	}));

	return {
		manifestId: manifest.id,
		runtimeSceneId: manifest.runtimeSceneId,
		levelId: manifest.levelId,
		targetFiles: cloneValue(manifest.targetFiles),
		source: cloneValue(manifest.source),
		policy: cloneValue(manifest.policy),
		provenance: cloneValue(manifest.provenance),
		visualOutputs,
		collisionChunks,
		requiredAssetIds: sortedUnique(
			visualOutputs
				.filter((output) => output.readiness.requiredAsset)
				.map((output) => output.asset.id),
		),
		requiredCollisionStableIds: sortedUnique(
			collisionChunks
				.filter((chunk) => chunk.readiness.requiredCollision)
				.map((chunk) => chunk.stableId),
		),
		requiredWalkableStableIds: sortedUnique(
			collisionChunks
				.filter((chunk) => chunk.readiness.requiredWalkable === true)
				.map((chunk) => chunk.stableId),
		),
	};
}

export function validateTerrainCookPlanAgainstRuntimeScene(options: {
	readonly plan: TerrainCookPlan;
	readonly manifest: RuntimeSceneManifestData;
}): TerrainCookRuntimeValidationResult {
	const { plan, manifest } = options;
	const errors: string[] = [];
	const assets = new Map(
		manifest.assets.assets.map((asset) => [asset.id, asset] as const),
	);
	const prefabs = mapPrefabsById(manifest.prefabs);
	const instances = mapInstancesByStableId(manifest.level.instances);
	const requiredAssetIds = new Set(manifest.readiness.requiredAssetIds ?? []);
	const requiredCollisionStableIds = new Set(
		manifest.readiness.requiredCollisionStableIds ?? [],
	);
	const requiredWalkableStableIds = new Set(
		manifest.readiness.requiredWalkableStableIds ?? [],
	);

	if (manifest.id !== plan.runtimeSceneId) {
		errors.push(
			`terrain cook plan "${plan.manifestId}" targets runtime scene "${plan.runtimeSceneId}", but manifest is "${manifest.id}".`,
		);
	}

	if (manifest.level.id !== plan.levelId) {
		errors.push(
			`terrain cook plan "${plan.manifestId}" targets level "${plan.levelId}", but manifest level is "${manifest.level.id}".`,
		);
	}

	for (const assetId of plan.requiredAssetIds) {
		if (!requiredAssetIds.has(assetId)) {
			errors.push(
				`terrain cook plan "${plan.manifestId}" required asset "${assetId}" is missing from readiness.requiredAssetIds.`,
			);
		}
	}

	for (const output of plan.visualOutputs) {
		validateRuntimeVisualOutput(output, {
			assets,
			instances,
			prefabs,
			errors,
		});
	}

	for (const chunk of plan.collisionChunks) {
		validateRuntimeCollisionChunk(chunk, {
			instances,
			prefabs,
			requiredCollisionStableIds,
			requiredWalkableStableIds,
			errors,
		});
	}

	if (errors.length === 0) {
		return { ok: true, plan };
	}

	return { ok: false, plan, errors };
}

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
		entries: [
			...plan.visualOutputs.map((output) => ({
				id: `${output.id}:instance`,
				stableId: output.stableId,
				prefabId: output.prefabId,
			})),
			...plan.collisionChunks.map((chunk) => ({
				id: `${chunk.id}:instance`,
				stableId: chunk.stableId,
				prefabId: chunk.prefabId,
				colliderTarget: chunk.colliderTarget,
				...(chunk.colliderTarget === "level-instance"
					? { colliderComponent: chunk.colliderComponent }
					: {}),
			})),
		],
	} satisfies TerrainCookLevelInstanceArtifactData;
	const readinessOutput = {
		schemaVersion: 1,
		manifestId: plan.manifestId,
		runtimeSceneId: plan.runtimeSceneId,
		requiredAssetIds: plan.requiredAssetIds,
		requiredCollisionStableIds: plan.requiredCollisionStableIds,
		requiredWalkableStableIds: plan.requiredWalkableStableIds,
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

export function validateTerrainCookManifest(data: unknown): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["terrain cook manifest must be an object."];
	}

	if (data.schemaVersion !== 1) {
		errors.push("terrainCookManifest.schemaVersion must be 1.");
	}

	requireString(data.id, "terrainCookManifest.id", errors);
	requireString(
		data.runtimeSceneId,
		"terrainCookManifest.runtimeSceneId",
		errors,
	);
	requireString(data.levelId, "terrainCookManifest.levelId", errors);
	validateTargetFiles(
		data.targetFiles,
		"terrainCookManifest.targetFiles",
		errors,
	);
	validateSource(data.source, "terrainCookManifest.source", errors);
	validatePolicy(data.policy, "terrainCookManifest.policy", errors);
	validateProvenance(
		data.provenance,
		"terrainCookManifest.provenance",
		data.source,
		errors,
	);

	const stableIds = new Set<string>();

	if (!Array.isArray(data.visualOutputs) || data.visualOutputs.length === 0) {
		errors.push(
			"terrainCookManifest.visualOutputs must contain at least one output.",
		);
	} else {
		const outputIds = new Set<string>();
		const prefabIds = new Set<string>();
		const assetIds = new Set<string>();

		for (const [index, output] of data.visualOutputs.entries()) {
			validateVisualOutput(
				output,
				`terrainCookManifest.visualOutputs.${index}`,
				{ outputIds, stableIds, prefabIds, assetIds },
				errors,
			);
		}
	}

	if (
		!Array.isArray(data.collisionChunks) ||
		data.collisionChunks.length === 0
	) {
		errors.push(
			"terrainCookManifest.collisionChunks must contain at least one chunk.",
		);
	} else {
		const chunkIds = new Set<string>();

		for (const [index, chunk] of data.collisionChunks.entries()) {
			validateCollisionChunk(
				chunk,
				`terrainCookManifest.collisionChunks.${index}`,
				{ chunkIds, stableIds },
				errors,
			);
		}
	}

	return errors;
}

function buildColliderMeshShape(
	shape: TerrainCookInputShapeData,
): TerrainCookOutputMeshShapeData {
	if (shape.type === "mesh") {
		return cloneValue(shape);
	}

	const vertices: TerrainCookVector3Data[] = [];
	const indices: number[] = [];

	for (let row = 0; row < shape.rows; row += 1) {
		for (let column = 0; column < shape.columns; column += 1) {
			const heightIndex = row * shape.columns + column;
			const height = shape.heights[heightIndex] ?? 0;

			vertices.push([
				shape.origin[0] + column * shape.cellSize[0],
				shape.origin[1] + height,
				shape.origin[2] + row * shape.cellSize[1],
			]);
		}
	}

	for (let row = 0; row < shape.rows - 1; row += 1) {
		for (let column = 0; column < shape.columns - 1; column += 1) {
			const topLeft = row * shape.columns + column;
			const topRight = topLeft + 1;
			const bottomLeft = topLeft + shape.columns;
			const bottomRight = bottomLeft + 1;

			indices.push(
				topLeft,
				topRight,
				bottomLeft,
				bottomLeft,
				topRight,
				bottomRight,
			);
		}
	}

	return {
		type: "mesh",
		vertices,
		indices,
	};
}

function toAssetManifestEntry(
	asset: TerrainCookAssetEntryData,
): AssetManifestEntryData {
	const { contentHash: _contentHash, ...assetEntry } = cloneValue(asset);

	return assetEntry as AssetManifestEntryData;
}

function validateRuntimeVisualOutput(
	output: TerrainCookVisualOutputPlanData,
	state: {
		readonly assets: ReadonlyMap<string, AssetManifestEntryData>;
		readonly instances: ReadonlyMap<string, LevelPrefabInstanceData>;
		readonly prefabs: ReadonlyMap<string, PrefabData>;
		readonly errors: string[];
	},
): void {
	const asset = state.assets.get(output.asset.id);
	const instance = state.instances.get(output.stableId);
	const prefab = state.prefabs.get(output.prefabId);

	if (!asset) {
		state.errors.push(
			`terrain visual output "${output.id}" asset "${output.asset.id}" is missing from runtime manifest assets.`,
		);
	} else if (asset.url !== output.asset.url) {
		state.errors.push(
			`terrain visual output "${output.id}" asset URL does not match cooked output.`,
		);
	}

	if (!instance) {
		state.errors.push(
			`terrain visual output "${output.id}" stableId "${output.stableId}" is missing from runtime level instances.`,
		);
	} else if (instance.prefabId !== output.prefabId) {
		state.errors.push(
			`terrain visual output "${output.id}" stableId "${output.stableId}" expects prefab "${output.prefabId}", but runtime instance uses "${instance.prefabId}".`,
		);
	}

	if (!prefab) {
		state.errors.push(
			`terrain visual output "${output.id}" references missing prefab "${output.prefabId}".`,
		);
	}
}

function validateRuntimeCollisionChunk(
	chunk: TerrainCookCollisionChunkPlanData,
	state: {
		readonly instances: ReadonlyMap<string, LevelPrefabInstanceData>;
		readonly prefabs: ReadonlyMap<string, PrefabData>;
		readonly requiredCollisionStableIds: ReadonlySet<string>;
		readonly requiredWalkableStableIds: ReadonlySet<string>;
		readonly errors: string[];
	},
): void {
	const instance = state.instances.get(chunk.stableId);
	const prefab = state.prefabs.get(chunk.prefabId);

	if (!instance) {
		state.errors.push(
			`terrain collision chunk "${chunk.id}" stableId "${chunk.stableId}" is missing from runtime level instances.`,
		);
		return;
	}

	if (instance.prefabId !== chunk.prefabId) {
		state.errors.push(
			`terrain collision chunk "${chunk.id}" stableId "${chunk.stableId}" expects prefab "${chunk.prefabId}", but runtime instance uses "${instance.prefabId}".`,
		);
	}

	if (!prefab) {
		state.errors.push(
			`terrain collision chunk "${chunk.id}" references missing prefab "${chunk.prefabId}".`,
		);
		return;
	}

	const runtimeCollider = effectiveCollider(prefab, instance);

	if (!isRecord(runtimeCollider)) {
		state.errors.push(
			`terrain collision chunk "${chunk.id}" stableId "${chunk.stableId}" has no effective runtime Collider.`,
		);
	} else if (!sameValue(runtimeCollider, chunk.colliderComponent)) {
		state.errors.push(
			`terrain collision chunk "${chunk.id}" effective runtime Collider does not match cooked terrain chunk data.`,
		);
	}

	if (chunk.readiness.requiredCollision) {
		if (!state.requiredCollisionStableIds.has(chunk.stableId)) {
			state.errors.push(
				`terrain collision chunk "${chunk.id}" stableId "${chunk.stableId}" is missing from readiness.requiredCollisionStableIds.`,
			);
		}
	}

	if (
		chunk.readiness.requiredWalkable === true &&
		!state.requiredWalkableStableIds.has(chunk.stableId)
	) {
		state.errors.push(
			`terrain collision chunk "${chunk.id}" stableId "${chunk.stableId}" is missing from readiness.requiredWalkableStableIds.`,
		);
	}
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
		collisionChunks: cloneValue(options.plan.collisionChunks),
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
		'import type { TerrainCookRuntimeModuleData } from "../../engine/data/index.js";',
		"",
		`export const terrainRuntimeModule = ${serializedModule} satisfies TerrainCookRuntimeModuleData;`,
		"",
		"export const terrainReadiness = terrainRuntimeModule.readiness;",
		"",
	].join("\n");
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

	requireString(
		data.assetManifestModule,
		`${path}.assetManifestModule`,
		errors,
	);
	requireString(data.prefabModule, `${path}.prefabModule`, errors);
	requireString(data.levelModule, `${path}.levelModule`, errors);
	requireString(
		data.runtimeSceneManifestModule,
		`${path}.runtimeSceneManifestModule`,
		errors,
	);

	if (
		data.generatedTerrainRuntimeModule !== undefined &&
		typeof data.generatedTerrainRuntimeModule !== "string"
	) {
		errors.push(`${path}.generatedTerrainRuntimeModule must be a string.`);
	}

	if (
		data.generatedTerrainMetadata !== undefined &&
		typeof data.generatedTerrainMetadata !== "string"
	) {
		errors.push(`${path}.generatedTerrainMetadata must be a string.`);
	}
}

function validateSource(data: unknown, path: string, errors: string[]): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data.id, `${path}.id`, errors);

	if (data.kind !== "glb") {
		errors.push(`${path}.kind must be glb.`);
	}

	requireString(data.uri, `${path}.uri`, errors);
	requireString(data.contentHash, `${path}.contentHash`, errors);
	validateRequiredPositiveNumber(
		data.unitsPerMeter,
		`${path}.unitsPerMeter`,
		errors,
	);

	if (data.upAxis !== "y") {
		errors.push(`${path}.upAxis must be y.`);
	}

	if (data.coordinateSpace !== "engine-world") {
		errors.push(`${path}.coordinateSpace must be engine-world.`);
	}

	validateBounds(data.bounds, `${path}.bounds`, errors);
}

function validatePolicy(data: unknown, path: string, errors: string[]): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (data.sourceScaleBakedIntoOutputs !== true) {
		errors.push(`${path}.sourceScaleBakedIntoOutputs must be true.`);
	}

	if (
		data.collisionSource !== "heightfield" &&
		data.collisionSource !== "mesh" &&
		data.collisionSource !== "mixed"
	) {
		errors.push(`${path}.collisionSource must be heightfield, mesh, or mixed.`);
	}

	if (!isRecord(data.chunking)) {
		errors.push(`${path}.chunking must be an object.`);
		return;
	}

	if (data.chunking.strategy !== "grid") {
		errors.push(`${path}.chunking.strategy must be grid.`);
	}

	validateRequiredPositiveNumber(
		data.chunking.chunkSizeMeters,
		`${path}.chunking.chunkSizeMeters`,
		errors,
	);
}

function validateProvenance(
	data: unknown,
	path: string,
	source: unknown,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (data.contract !== "TerrainImportCookContract") {
		errors.push(`${path}.contract must be TerrainImportCookContract.`);
	}

	requireString(data.generator, `${path}.generator`, errors);
	requireString(data.sourceContentHash, `${path}.sourceContentHash`, errors);

	if (
		isRecord(source) &&
		typeof source.contentHash === "string" &&
		data.sourceContentHash !== source.contentHash
	) {
		errors.push(`${path}.sourceContentHash must match source.contentHash.`);
	}

	if (data.hashAlgorithm !== "fnv1a32") {
		errors.push(`${path}.hashAlgorithm must be fnv1a32.`);
	}

	requireString(data.generatedAt, `${path}.generatedAt`, errors);
	validateStringArray(data.evidence, `${path}.evidence`, errors);
}

function validateVisualOutput(
	data: unknown,
	path: string,
	seen: {
		readonly outputIds: Set<string>;
		readonly stableIds: Set<string>;
		readonly prefabIds: Set<string>;
		readonly assetIds: Set<string>;
	},
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(data.id, `${path}.id`, seen.outputIds, errors);
	requireUniqueString(
		data.stableId,
		`${path}.stableId`,
		seen.stableIds,
		errors,
	);
	requireUniqueString(
		data.prefabId,
		`${path}.prefabId`,
		seen.prefabIds,
		errors,
	);
	validateAssetEntry(data.asset, `${path}.asset`, seen.assetIds, errors);
	validateStringArray(
		data.materialAssetIds,
		`${path}.materialAssetIds`,
		errors,
	);
	validateBounds(data.bounds, `${path}.bounds`, errors);
	validateStringArray(data.sourceChunkIds, `${path}.sourceChunkIds`, errors);

	if (!isRecord(data.readiness)) {
		errors.push(`${path}.readiness must be an object.`);
	} else if (typeof data.readiness.requiredAsset !== "boolean") {
		errors.push(`${path}.readiness.requiredAsset must be a boolean.`);
	}
}

function validateCollisionChunk(
	data: unknown,
	path: string,
	seen: {
		readonly chunkIds: Set<string>;
		readonly stableIds: Set<string>;
	},
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(data.id, `${path}.id`, seen.chunkIds, errors);
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

	validateRequiredNumberTuple(data.chunkKey, 2, `${path}.chunkKey`, errors);
	validateBounds(data.bounds, `${path}.bounds`, errors);
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

	validateInputShape(data.shape, `${path}.shape`, errors);
	validateReadiness(data.readiness, `${path}.readiness`, data.intent, errors);

	if (data.materialId !== undefined && typeof data.materialId !== "string") {
		errors.push(`${path}.materialId must be a string when provided.`);
	}
}

function validateAssetEntry(
	data: unknown,
	path: string,
	seenAssetIds: Set<string>,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(data.id, `${path}.id`, seenAssetIds, errors);
	requireString(data.kind, `${path}.kind`, errors);
	requireString(data.url, `${path}.url`, errors);

	if (data.kind !== "mesh") {
		errors.push(`${path}.kind must be mesh.`);
	}

	if (data.tags !== undefined) {
		validateStringArray(data.tags, `${path}.tags`, errors);
	}
}

function validateInputShape(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	switch (data.type) {
		case "heightfield":
			validateHeightfieldShape(data, path, errors);
			return;
		case "mesh":
			validateMeshShape(data, path, errors);
			return;
		default:
			errors.push(`${path}.type must be heightfield or mesh.`);
	}
}

function validateHeightfieldShape(
	data: Record<string, unknown>,
	path: string,
	errors: string[],
): void {
	validateRequiredInteger(data.rows, `${path}.rows`, errors, 2);
	validateRequiredInteger(data.columns, `${path}.columns`, errors, 2);

	if (!Array.isArray(data.heights)) {
		errors.push(`${path}.heights must be an array.`);
	} else {
		for (const [index, item] of data.heights.entries()) {
			if (typeof item !== "number" || !Number.isFinite(item)) {
				errors.push(`${path}.heights.${index} must be a finite number.`);
			}
		}
	}

	if (
		typeof data.rows === "number" &&
		Number.isInteger(data.rows) &&
		typeof data.columns === "number" &&
		Number.isInteger(data.columns) &&
		Array.isArray(data.heights) &&
		data.heights.length !== data.rows * data.columns
	) {
		errors.push(`${path}.heights length must equal rows * columns.`);
	}

	validateRequiredPositiveNumberTuple(
		data.cellSize,
		2,
		`${path}.cellSize`,
		errors,
	);
	validateRequiredNumberTuple(data.origin, 3, `${path}.origin`, errors);
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

function validateReadiness(
	data: unknown,
	path: string,
	intent: unknown,
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

		if (intent !== "walkable") {
			errors.push(`${path}.requiredWalkable requires intent walkable.`);
		}
	}
}

function validateBounds(data: unknown, path: string, errors: string[]): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateRequiredNumberTuple(data.min, 3, `${path}.min`, errors);
	validateRequiredNumberTuple(data.max, 3, `${path}.max`, errors);

	if (
		Array.isArray(data.min) &&
		Array.isArray(data.max) &&
		data.min.length === 3 &&
		data.max.length === 3
	) {
		for (const axis of [0, 1, 2] as const) {
			const min = data.min[axis];
			const max = data.max[axis];

			if (
				typeof min === "number" &&
				typeof max === "number" &&
				Number.isFinite(min) &&
				Number.isFinite(max) &&
				min > max
			) {
				errors.push(`${path}.min.${axis} must be <= ${path}.max.${axis}.`);
			}
		}
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

function validateRequiredInteger(
	value: unknown,
	path: string,
	errors: string[],
	minimum: number,
): void {
	if (
		typeof value !== "number" ||
		!Number.isInteger(value) ||
		value < minimum
	) {
		errors.push(`${path} must be an integer >= ${minimum}.`);
	}
}

function sortedUnique(values: readonly string[]): readonly string[] {
	return [...new Set(values)].sort();
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

function cloneValue<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}

function sameValue(left: unknown, right: unknown): boolean {
	return serializeStableValue(left) === serializeStableValue(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export { SchemaValidationError as TerrainCookManifestValidationError };
