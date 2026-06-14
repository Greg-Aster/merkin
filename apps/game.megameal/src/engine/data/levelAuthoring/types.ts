import type {
	AssetManifestData,
	LevelData,
	LevelPrefabInstanceData,
	PrefabData,
	RenderProfileData,
	RuntimeSceneManifestData,
	TerrainChunkPackageData,
} from "../schemas/index.js";

export const LEVEL_EDITOR_AUTHORING_CONTRACT =
	"LevelEditorAuthoringContract" as const;

export type LevelEditorAuthoringOwnerKind =
	| "runtime-scene-manifest"
	| "level"
	| "prefabs"
	| "asset-manifest"
	| "render-profile"
	| "generated-module";

export type LevelEditorAuthoringOwnerProvenance = {
	readonly ownerId: string;
	readonly kind: LevelEditorAuthoringOwnerKind;
	readonly targetFile: string;
	readonly exportName: string;
	readonly contentHash: string;
};

export type LevelEditorAuthoringDocumentProvenance = {
	readonly runtimeSceneManifest: LevelEditorAuthoringOwnerProvenance;
	readonly level: LevelEditorAuthoringOwnerProvenance;
	readonly prefabs: LevelEditorAuthoringOwnerProvenance;
	readonly assetManifest: LevelEditorAuthoringOwnerProvenance;
	readonly renderProfile: LevelEditorAuthoringOwnerProvenance;
	readonly generatedModules?: readonly LevelEditorAuthoringOwnerProvenance[];
};

export type LevelEditorAuthoringProjectionOptions = {
	readonly provenance: LevelEditorAuthoringDocumentProvenance;
	readonly runtimeSceneCatalogIds: readonly string[];
};

export type LevelEditorAuthoringRecord = {
	readonly stableId: string;
	readonly instanceId: string;
	readonly prefabId: string;
	readonly ownerIds: {
		readonly level: string;
		readonly prefabs: string;
	};
	readonly transform?: LevelPrefabInstanceData["transform"];
	readonly components: Record<string, unknown>;
	readonly prefabComponents: Record<string, unknown>;
	readonly instanceComponents?: Record<string, unknown>;
	readonly componentOwnerIds: Record<string, string>;
};

export type LevelEditorAuthoringDocument = {
	readonly schemaVersion: 1;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly sourceManifest: {
		readonly id: string;
		readonly generatedAt: string;
		readonly source: RuntimeSceneManifestData["source"];
		readonly contentHash: string;
	};
	readonly provenance: LevelEditorAuthoringDocumentProvenance;
	readonly runtimeSceneCatalogIds: readonly string[];
	readonly level: Pick<LevelData, "id" | "sceneId">;
	readonly prefabIds: readonly string[];
	readonly assetIds: readonly string[];
	readonly renderProfileId: string;
	readonly terrainPackageIds: readonly string[];
	readonly records: readonly LevelEditorAuthoringRecord[];
	readonly contentHash: string;
};

export type LevelEditorAuthoringOperationPersistence = "saved" | "preview-only";

export type LevelEditorAuthoringOperationTarget = "level-instance" | "prefab";

export type LevelEditorAuthoringBaseOperation = {
	readonly id: string;
	readonly persistence: LevelEditorAuthoringOperationPersistence;
	readonly note?: string;
};

export type LevelEditorAuthoringSetTransformOperation =
	LevelEditorAuthoringBaseOperation & {
		readonly kind: "set-transform";
		readonly stableId: string;
		readonly transform: LevelPrefabInstanceData["transform"];
	};

export type LevelEditorAuthoringSetComponentOperation =
	LevelEditorAuthoringBaseOperation & {
		readonly kind: "set-component";
		readonly stableId: string;
		readonly target: LevelEditorAuthoringOperationTarget;
		readonly componentName: string;
		readonly value: Record<string, unknown>;
	};

export type LevelEditorAuthoringRemoveComponentOperation =
	LevelEditorAuthoringBaseOperation & {
		readonly kind: "remove-component";
		readonly stableId: string;
		readonly target: LevelEditorAuthoringOperationTarget;
		readonly componentName: string;
	};

export type LevelEditorAuthoringInsertInstanceOperation =
	LevelEditorAuthoringBaseOperation & {
		readonly kind: "insert-instance";
		readonly instance: LevelPrefabInstanceData;
	};

export type LevelEditorAuthoringRemoveInstanceOperation =
	LevelEditorAuthoringBaseOperation & {
		readonly kind: "remove-instance";
		readonly stableId: string;
	};

export type LevelEditorAuthoringReplacePrefabOperation =
	LevelEditorAuthoringBaseOperation & {
		readonly kind: "replace-prefab";
		readonly stableId: string;
		readonly prefabId: string;
	};

export type LevelEditorAuthoringSetPortalTargetOperation =
	LevelEditorAuthoringBaseOperation & {
		readonly kind: "set-portal-target";
		readonly stableId: string;
		readonly target: LevelEditorAuthoringOperationTarget;
		readonly targetRuntimeSceneId: string;
	};

export type LevelEditorAuthoringEditOperation =
	| LevelEditorAuthoringSetTransformOperation
	| LevelEditorAuthoringSetComponentOperation
	| LevelEditorAuthoringRemoveComponentOperation
	| LevelEditorAuthoringInsertInstanceOperation
	| LevelEditorAuthoringRemoveInstanceOperation
	| LevelEditorAuthoringReplacePrefabOperation
	| LevelEditorAuthoringSetPortalTargetOperation;

export type LevelEditorAuthoringTransaction = {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly runtimeSceneId: string;
	readonly baseDocumentHash: string;
	readonly createdAt: string;
	readonly persistence: LevelEditorAuthoringOperationPersistence;
	readonly operations: readonly LevelEditorAuthoringEditOperation[];
};

export type LevelEditorAuthoringValidationResult =
	| {
			readonly ok: true;
	  }
	| {
			readonly ok: false;
			readonly errors: readonly string[];
	  };

export type LevelEditorAuthoringWriteArtifactPurpose =
	| "level-instances"
	| "prefab-components"
	| "asset-manifest"
	| "render-profile"
	| "runtime-scene-manifest"
	| "generated-module";

export type LevelEditorAuthoringWriteArtifactPayload = {
	readonly schemaVersion: 1;
	readonly transactionId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly ownerId: string;
	readonly operations: readonly LevelEditorAuthoringEditOperation[];
};

export type LevelEditorAuthoringWriteArtifact = {
	readonly id: string;
	readonly targetFile: string;
	readonly exportName: string;
	readonly ownerId: string;
	readonly purpose: LevelEditorAuthoringWriteArtifactPurpose;
	readonly format: "json";
	readonly payload: LevelEditorAuthoringWriteArtifactPayload;
	readonly serializedPayload: string;
	readonly contentHash: string;
};

export type LevelEditorAuthoringWritePlan = {
	readonly schemaVersion: 1;
	readonly generator: "levelAuthoring.writePlan.v1";
	readonly contract: typeof LEVEL_EDITOR_AUTHORING_CONTRACT;
	readonly writeMode: "dry-run";
	readonly writesFiles: false;
	readonly transactionId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly baseDocumentHash: string;
	readonly provenance: {
		readonly sourceDocumentHash: string;
		readonly sourceTransactionHash: string;
		readonly hashAlgorithm: "fnv1a32";
	};
	readonly artifacts: readonly LevelEditorAuthoringWriteArtifact[];
	readonly contentHash: string;
};

export type LevelEditorAuthoringSourceSnapshot = {
	readonly manifest: RuntimeSceneManifestData;
	readonly level: LevelData;
	readonly prefabs: readonly PrefabData[];
	readonly assets: AssetManifestData;
	readonly renderProfile: RenderProfileData;
	readonly terrainPackages: readonly TerrainChunkPackageData[];
};
