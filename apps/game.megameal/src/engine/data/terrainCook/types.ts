import type {
	AssetManifestEntryData,
	CollisionChannelData,
	CollisionIntentData,
	LevelPrefabInstanceData,
	TerrainChunkPackageData,
	TerrainChunkStreamingPolicyData,
} from "../schemas/index.js";

export type TerrainCookVector3Data = readonly [number, number, number];
export type TerrainCookVector2Data = readonly [number, number];

export type TerrainCookBoundsData = {
	readonly min: TerrainCookVector3Data;
	readonly max: TerrainCookVector3Data;
};

export type TerrainCookGlbSourceData = {
	readonly id: string;
	readonly kind: "glb";
	readonly uri: string;
	readonly contentHash: string;
	readonly unitsPerMeter: number;
	readonly upAxis: "y";
	readonly coordinateSpace: "engine-world";
	readonly bounds: TerrainCookBoundsData;
};

export type TerrainCookAuthoredCollisionDraftSourceData = {
	readonly id: string;
	readonly kind: "authored-collision-draft";
	readonly draftId: string;
	readonly contentHash: string;
	readonly coordinateSpace: "engine-world";
	readonly bounds: TerrainCookBoundsData;
};

export type TerrainCookSourceData =
	| TerrainCookGlbSourceData
	| TerrainCookAuthoredCollisionDraftSourceData;

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

export type TerrainCookVisualBindingData = {
	readonly id: string;
	readonly stableId: string;
	readonly prefabId: string;
	readonly bounds: TerrainCookBoundsData;
	readonly sourceChunkIds: readonly string[];
	readonly sourceChunkStableIds: readonly string[];
	readonly lod: "near" | "far" | "merged-floor";
};

export type TerrainCookHeightfieldShapeData = {
	readonly type: "heightfield";
	readonly rows: number;
	readonly columns: number;
	readonly heights: readonly number[];
	readonly cellSize: TerrainCookVector2Data;
	readonly origin: TerrainCookVector3Data;
};

export type TerrainCookBoxShapeData = {
	readonly type: "box";
	readonly halfExtents: TerrainCookVector3Data;
};

export type TerrainCookMeshShapeData = {
	readonly type: "mesh";
	readonly vertices: readonly TerrainCookVector3Data[];
	readonly indices: readonly number[];
};

export type TerrainCookInputShapeData =
	| TerrainCookHeightfieldShapeData
	| TerrainCookBoxShapeData
	| TerrainCookMeshShapeData;

export type TerrainCookOutputMeshShapeData = {
	readonly type: "mesh";
	readonly vertices: readonly TerrainCookVector3Data[];
	readonly indices: readonly number[];
};

export type TerrainCookOutputShapeData =
	| TerrainCookBoxShapeData
	| TerrainCookOutputMeshShapeData;

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
	readonly lod?: {
		readonly nearVisualStableIds: readonly string[];
		readonly farVisualStableIds: readonly string[];
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
	readonly visualBindings?: readonly TerrainCookVisualBindingData[];
	readonly streamingPolicy?: TerrainChunkStreamingPolicyData;
	readonly startupChunkStableIds?: readonly string[];
	readonly streamableChunkStableIds?: readonly string[];
	readonly collisionChunks: readonly TerrainCookCollisionChunkData[];
};

export type TerrainCookVisualOutputPlanData = TerrainCookVisualOutputData & {
	readonly assetEntry: AssetManifestEntryData;
};

export type TerrainCookColliderComponentData = {
	readonly intent: CollisionIntentData;
	readonly channel: CollisionChannelData;
	readonly sensor?: boolean;
	readonly shape: TerrainCookOutputShapeData;
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
	readonly visualBindings: readonly TerrainCookVisualBindingData[];
	readonly collisionChunks: readonly TerrainCookCollisionChunkPlanData[];
	readonly streamingPolicy?: TerrainChunkStreamingPolicyData;
	readonly startupChunkStableIds: readonly string[];
	readonly streamableChunkStableIds: readonly string[];
	readonly terrainPackage?: TerrainChunkPackageData;
	readonly requiredAssetIds: readonly string[];
	readonly requiredCollisionStableIds: readonly string[];
	readonly requiredWalkableStableIds: readonly string[];
	readonly requiredTerrainPackageIds: readonly string[];
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
		readonly terrainChunkCellComponent?: {
			readonly packageId: string;
		};
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
	readonly requiredTerrainPackageIds: readonly string[];
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
	readonly visualBindings: readonly TerrainCookVisualBindingData[];
	readonly collisionChunks: readonly TerrainCookCollisionChunkPlanData[];
	readonly levelInstances: TerrainCookLevelInstanceArtifactData["entries"];
	readonly terrainPackage?: TerrainChunkPackageData;
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
