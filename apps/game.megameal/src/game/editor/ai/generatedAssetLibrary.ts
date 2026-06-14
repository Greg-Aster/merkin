import {
	EDITOR_AI_ASSET_CONTRACT_VERSION,
	type EditorAiAssetJob,
	type EditorAiAssetKind,
	type EditorAiGeneratedAssetLibraryRecord,
	type EditorAiGeneratedAssetMetadata,
	type EditorAiOwnerManifestStatus,
} from "./contracts.js";

export type CreateEditorAiGeneratedAssetRecordOptions = {
	readonly id: string;
	readonly assetId: string;
	readonly kind: EditorAiAssetKind;
	readonly label: string;
	readonly url: string;
	readonly metadataUrl: string;
	readonly createdAt: string;
	readonly generatedAssetSha256?: string;
	readonly ownerManifestStatus?: EditorAiOwnerManifestStatus;
};

export function createEditorAiGeneratedAssetLibraryRecord(
	job: EditorAiAssetJob,
	options: CreateEditorAiGeneratedAssetRecordOptions,
): EditorAiGeneratedAssetLibraryRecord {
	const ownerManifestStatus =
		options.ownerManifestStatus ?? "requires-generated-manifest-record";
	const metadata: EditorAiGeneratedAssetMetadata = {
		schemaVersion: EDITOR_AI_ASSET_CONTRACT_VERSION,
		id: `${options.id}:metadata`,
		jobId: job.id,
		backend: job.backend,
		kind: options.kind,
		runtimeSceneId: job.runtimeSceneId,
		url: options.url,
		metadataUrl: options.metadataUrl,
		sourceStableId: job.sourceStableId,
		sourceAssetId: job.sourceAssetId,
		prompt: job.prompt,
		fingerprints: {
			...job.fingerprints,
			generatedAssetSha256:
				options.generatedAssetSha256 ?? job.fingerprints.generatedAssetSha256,
		},
		createdAt: options.createdAt,
	};

	return {
		schemaVersion: EDITOR_AI_ASSET_CONTRACT_VERSION,
		id: options.id,
		assetId: options.assetId,
		label: options.label,
		kind: options.kind,
		runtimeSceneId: job.runtimeSceneId,
		sourceJobId: job.id,
		url: options.url,
		metadataUrl: options.metadataUrl,
		tags: buildGeneratedAssetTags(job, options.kind),
		metadata,
		ownerManifestStatus,
	};
}

export function buildGeneratedAssetTags(
	job: Pick<EditorAiAssetJob, "backend" | "mode" | "sourceStableId">,
	kind: EditorAiAssetKind,
): readonly string[] {
	return [
		"generated",
		"ai-asset-lab",
		job.backend,
		job.mode,
		kind,
		...(job.sourceStableId === null ? [] : [`source:${job.sourceStableId}`]),
	];
}
