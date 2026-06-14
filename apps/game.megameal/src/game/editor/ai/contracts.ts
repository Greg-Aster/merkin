export const EDITOR_AI_ASSET_CONTRACT_VERSION = 1;

export const editorAiBackendIds = ["comfyui", "hunyuan3d"] as const;

export type EditorAiBackendId = (typeof editorAiBackendIds)[number];

export type EditorAiServiceCapability =
	| "service-status"
	| "job-queue"
	| "job-cancel"
	| "text-to-3d"
	| "image-to-3d"
	| "texture-wrap"
	| "replacement-mesh";

export type EditorAiServiceDefinition = {
	readonly backend: EditorAiBackendId;
	readonly label: string;
	readonly endpoint: string;
	readonly healthPath: string;
	readonly capabilities: readonly EditorAiServiceCapability[];
	readonly required: false;
};

export type EditorAiServiceProbeResult = {
	readonly backend: EditorAiBackendId;
	readonly endpoint: string;
	readonly checkedAt: string;
	readonly available: boolean;
	readonly responseMs: number | null;
	readonly reason: string | null;
};

export type EditorAiServiceStatus = EditorAiServiceDefinition & {
	readonly checkedAt: string;
	readonly status: "available" | "unavailable";
	readonly responseMs: number | null;
	readonly reason: string | null;
};

export type EditorAiServiceStatusReportMode =
	| "dev-service-probe"
	| "disabled-outside-dev"
	| "api-unreachable";

export type EditorAiServiceStatusReport = {
	readonly schemaVersion: typeof EDITOR_AI_ASSET_CONTRACT_VERSION;
	readonly mode: EditorAiServiceStatusReportMode;
	readonly checkedAt: string;
	readonly services: readonly EditorAiServiceStatus[];
	readonly unavailableBackends: readonly EditorAiBackendId[];
	readonly availableBackends: readonly EditorAiBackendId[];
};

export const editorAiAssetJobModes = [
	"text-to-3d",
	"image-to-3d",
	"texture-wrap",
	"replacement-mesh",
] as const;

export type EditorAiAssetJobMode = (typeof editorAiAssetJobModes)[number];

export type EditorAiAssetJobStatus =
	| "queued"
	| "running"
	| "completed"
	| "failed"
	| "canceled"
	| "blocked";

export type EditorAiAssetKind = "mesh" | "texture" | "material";

export type EditorAiOwnerManifestStatus =
	| "preview-only"
	| "requires-generated-manifest-record"
	| "ready-for-save"
	| "saved";

export type EditorAiAssetFingerprint = {
	readonly promptHash: string;
	readonly sourceAssetFingerprint: string | null;
	readonly generatedAssetSha256: string | null;
};

export type EditorAiFitReport = {
	readonly status: "not-requested" | "pending" | "fit-to-selection";
	readonly sourceStableId: string | null;
	readonly targetStableIds: readonly string[];
	readonly transformPolicy: "preserve-selection" | "fit-to-source-bounds";
};

export type EditorAiAssetJobRequest = {
	readonly backend: EditorAiBackendId;
	readonly mode: EditorAiAssetJobMode;
	readonly runtimeSceneId: string;
	readonly prompt: string;
	readonly sourceStableId?: string;
	readonly sourceAssetId?: string;
	readonly referenceImageUrl?: string;
	readonly fitToSelection?: boolean;
};

export type EditorAiAssetJob = {
	readonly schemaVersion: typeof EDITOR_AI_ASSET_CONTRACT_VERSION;
	readonly id: string;
	readonly backend: EditorAiBackendId;
	readonly mode: EditorAiAssetJobMode;
	readonly runtimeSceneId: string;
	readonly sourceStableId: string | null;
	readonly sourceAssetId: string | null;
	readonly prompt: string;
	readonly referenceImageUrl: string | null;
	readonly status: EditorAiAssetJobStatus;
	readonly statusReason: string | null;
	readonly generatedAssetUrl: string | null;
	readonly metadataUrl: string | null;
	readonly fingerprints: EditorAiAssetFingerprint;
	readonly fitReport: EditorAiFitReport;
	readonly ownerManifestStatus: EditorAiOwnerManifestStatus;
	readonly createdAt: string;
	readonly updatedAt: string;
};

export type EditorAiGeneratedAssetMetadata = {
	readonly schemaVersion: typeof EDITOR_AI_ASSET_CONTRACT_VERSION;
	readonly id: string;
	readonly jobId: string;
	readonly backend: EditorAiBackendId;
	readonly kind: EditorAiAssetKind;
	readonly runtimeSceneId: string;
	readonly url: string;
	readonly metadataUrl: string;
	readonly sourceStableId: string | null;
	readonly sourceAssetId: string | null;
	readonly prompt: string;
	readonly fingerprints: EditorAiAssetFingerprint;
	readonly createdAt: string;
};

export type EditorAiGeneratedAssetLibraryRecord = {
	readonly schemaVersion: typeof EDITOR_AI_ASSET_CONTRACT_VERSION;
	readonly id: string;
	readonly assetId: string;
	readonly label: string;
	readonly kind: EditorAiAssetKind;
	readonly runtimeSceneId: string;
	readonly sourceJobId: string;
	readonly url: string;
	readonly metadataUrl: string;
	readonly tags: readonly string[];
	readonly metadata: EditorAiGeneratedAssetMetadata;
	readonly ownerManifestStatus: EditorAiOwnerManifestStatus;
};

export type EditorAiApplyOperationKind =
	| "insert-generated-asset"
	| "replace-selection-renderable"
	| "assign-generated-material";

export type EditorAiApplyToSelectionRequest = {
	readonly runtimeSceneId: string;
	readonly generatedAssetId: string;
	readonly selectedStableIds: readonly string[];
	readonly operation: EditorAiApplyOperationKind;
	readonly preserveStableIds?: boolean;
	readonly fitToSelection?: boolean;
};

export type EditorAiLevelEditOperation = {
	readonly type:
		| "insert-level-instance"
		| "patch-level-instance-renderable"
		| "patch-level-instance-material";
	readonly runtimeSceneId: string;
	readonly targetStableId: string | null;
	readonly generatedAssetId: string;
	readonly preserveStableId: boolean;
	readonly componentPatch: {
		readonly Renderable?: {
			readonly meshAssetId?: string;
			readonly materialAssetId?: string;
		};
	};
	readonly ownerWritePlanStatus: "requires-save";
};

export type EditorAiApplyToSelectionPlan = {
	readonly schemaVersion: typeof EDITOR_AI_ASSET_CONTRACT_VERSION;
	readonly runtimeSceneId: string;
	readonly generatedAssetId: string;
	readonly operation: EditorAiApplyOperationKind;
	readonly previewOnly: false;
	readonly mutatesRuntimeDirectly: false;
	readonly ownerManifestStatus: "requires-generated-manifest-record";
	readonly editOperations: readonly EditorAiLevelEditOperation[];
	readonly fitReport: EditorAiFitReport;
};

export const defaultEditorAiServiceDefinitions: readonly EditorAiServiceDefinition[] =
	[
		{
			backend: "comfyui",
			label: "ComfyUI",
			endpoint: "http://127.0.0.1:8188",
			healthPath: "/system_stats",
			capabilities: [
				"service-status",
				"job-queue",
				"job-cancel",
				"texture-wrap",
			],
			required: false,
		},
		{
			backend: "hunyuan3d",
			label: "Hunyuan 3D",
			endpoint: "http://127.0.0.1:7860",
			healthPath: "/",
			capabilities: [
				"service-status",
				"job-queue",
				"job-cancel",
				"text-to-3d",
				"image-to-3d",
				"replacement-mesh",
			],
			required: false,
		},
	];

export function isEditorAiBackendId(value: string): value is EditorAiBackendId {
	return (editorAiBackendIds as readonly string[]).includes(value);
}

export function isEditorAiAssetJobMode(
	value: string,
): value is EditorAiAssetJobMode {
	return (editorAiAssetJobModes as readonly string[]).includes(value);
}
