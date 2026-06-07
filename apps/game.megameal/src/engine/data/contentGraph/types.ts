import type { RuntimeSceneManifestData } from "../schemas/types.js";

export type RuntimeSceneAudioContentGraphData = {
	readonly eventMappings?: readonly unknown[];
	readonly sceneMusic?: unknown;
};

export type RuntimeSceneContentGraphInput = {
	readonly manifest: RuntimeSceneManifestData;
	readonly runtimeSceneIds: readonly string[];
	readonly audioContent?: RuntimeSceneAudioContentGraphData;
};

export type RuntimeSceneContentGraph = {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly assetIds: readonly string[];
	readonly authoredAssetIds: readonly string[];
	readonly declaredPreloadAssetIds: readonly string[];
	readonly prefabIds: readonly string[];
	readonly referencedPrefabIds: readonly string[];
	readonly levelInstanceStableIds: readonly string[];
	readonly duplicateStableIds: readonly string[];
	readonly collisionPrefabIds: readonly string[];
	readonly collisionStableIds: readonly string[];
	readonly walkableStableIds: readonly string[];
	readonly terrainPackageIds: readonly string[];
	readonly terrainChunkStableIds: readonly string[];
	readonly lightStableIds: readonly string[];
	readonly lightBudgetCounts: RuntimeSceneLightBudgetCounts;
	readonly portalTargetRuntimeSceneIds: readonly string[];
};

export type RuntimeSceneLightBudgetCounts = {
	readonly total: number;
	readonly ambient: number;
	readonly directional: number;
	readonly point: number;
	readonly spot: number;
	readonly area: number;
	readonly shadowCasting: number;
};

export type RuntimeSceneContentGraphValidationResult =
	| {
			readonly ok: true;
			readonly graph: RuntimeSceneContentGraph;
	  }
	| {
			readonly ok: false;
			readonly graph: RuntimeSceneContentGraph;
			readonly errors: readonly string[];
	  };

export type GeneratedGlbImportStatus = "imported" | "substituted" | "planned";

export type GeneratedGlbImportTarget = {
	readonly assetIds?: readonly string[];
	readonly prefabIds?: readonly string[];
	readonly stableIds?: readonly string[];
	readonly notes?: string;
};

export type GeneratedGlbImportPlan = {
	readonly contractId: string;
	readonly reason: string;
	readonly removalCondition: string;
};

export type GeneratedGlbImportArtifact = {
	readonly generatorId: string;
	readonly metadataPath: string;
	readonly glbSha256: string;
};

export type GeneratedGlbImportEntry = {
	readonly id: string;
	readonly sourceUrl: string;
	readonly runtimeSceneId: string;
	readonly status: GeneratedGlbImportStatus;
	readonly owner: string;
	readonly evidence: readonly string[];
	readonly target?: GeneratedGlbImportTarget;
	readonly planned?: GeneratedGlbImportPlan;
	readonly artifact?: GeneratedGlbImportArtifact;
};

export type GeneratedGlbImportManifest = {
	readonly id: string;
	readonly generatedAt: string;
	readonly entries: readonly GeneratedGlbImportEntry[];
};

export type GeneratedGlbImportManifestValidationInput = {
	readonly importManifest: GeneratedGlbImportManifest;
	readonly runtimeSceneManifests: readonly RuntimeSceneManifestData[];
};

export type GeneratedGlbImportManifestValidationResult =
	| {
			readonly ok: true;
	  }
	| {
			readonly ok: false;
			readonly errors: readonly string[];
	  };
