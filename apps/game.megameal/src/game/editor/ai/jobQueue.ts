import {
	EDITOR_AI_ASSET_CONTRACT_VERSION,
	type EditorAiAssetJob,
	type EditorAiAssetJobMode,
	type EditorAiAssetJobRequest,
	type EditorAiGeneratedAssetLibraryRecord,
	type EditorAiServiceCapability,
	type EditorAiServiceStatusReport,
	isEditorAiAssetJobMode,
	isEditorAiBackendId,
} from "./contracts.js";
import {
	type CreateEditorAiGeneratedAssetRecordOptions,
	createEditorAiGeneratedAssetLibraryRecord,
} from "./generatedAssetLibrary.js";
import { findEditorAiServiceStatus } from "./serviceStatus.js";

export type EditorAiJobQueueSnapshot = {
	readonly schemaVersion: typeof EDITOR_AI_ASSET_CONTRACT_VERSION;
	readonly jobs: readonly EditorAiAssetJob[];
	readonly recentJobs: readonly EditorAiAssetJob[];
	readonly generatedAssets: readonly EditorAiGeneratedAssetLibraryRecord[];
};

export type EditorAiJobQueueStore = {
	jobs: EditorAiAssetJob[];
	generatedAssets: EditorAiGeneratedAssetLibraryRecord[];
	nextJobSequence: number;
	now: () => string;
};

export type EditorAiCancelJobResult =
	| {
			readonly status: "canceled";
			readonly job: EditorAiAssetJob;
	  }
	| {
			readonly status: "not-found";
			readonly job: null;
	  }
	| {
			readonly status: "unchanged";
			readonly job: EditorAiAssetJob;
	  };

export function createEditorAiJobQueueStore(
	options: {
		readonly now?: () => string;
	} = {},
): EditorAiJobQueueStore {
	return {
		jobs: [],
		generatedAssets: [],
		nextJobSequence: 1,
		now: options.now ?? (() => new Date().toISOString()),
	};
}

export function queueEditorAiAssetJob(
	store: EditorAiJobQueueStore,
	request: EditorAiAssetJobRequest,
	services: EditorAiServiceStatusReport,
): EditorAiAssetJob {
	const service = findEditorAiServiceStatus(services, request.backend);
	const now = store.now();
	const serviceAvailable = service?.status === "available";
	const requestedCapability = capabilityForJobMode(request.mode);
	const modeSupported =
		service?.capabilities.includes(requestedCapability) ?? false;
	const queueable = serviceAvailable && modeSupported;
	const id = `editor-ai-job-${store.nextJobSequence.toString().padStart(4, "0")}`;
	store.nextJobSequence += 1;

	const job: EditorAiAssetJob = {
		schemaVersion: EDITOR_AI_ASSET_CONTRACT_VERSION,
		id,
		backend: request.backend,
		mode: request.mode,
		runtimeSceneId: request.runtimeSceneId,
		sourceStableId: request.sourceStableId ?? null,
		sourceAssetId: request.sourceAssetId ?? null,
		prompt: request.prompt.trim(),
		referenceImageUrl: request.referenceImageUrl ?? null,
		status: queueable ? "queued" : "blocked",
		statusReason: queueable
			? null
			: blockedJobReason(request, {
					modeSupported,
					serviceAvailable,
					serviceReason: service?.reason ?? null,
				}),
		generatedAssetUrl: null,
		metadataUrl: null,
		fingerprints: {
			promptHash: stableEditorAiHash(request.prompt),
			sourceAssetFingerprint:
				request.sourceAssetId ?? request.sourceStableId ?? null,
			generatedAssetSha256: null,
		},
		fitReport: {
			status: request.fitToSelection ? "pending" : "not-requested",
			sourceStableId: request.sourceStableId ?? null,
			targetStableIds:
				request.sourceStableId === undefined ? [] : [request.sourceStableId],
			transformPolicy: request.fitToSelection
				? "fit-to-source-bounds"
				: "preserve-selection",
		},
		ownerManifestStatus: "preview-only",
		createdAt: now,
		updatedAt: now,
	};

	store.jobs = [job, ...store.jobs];

	return job;
}

export function cancelEditorAiAssetJob(
	store: EditorAiJobQueueStore,
	jobId: string,
): EditorAiCancelJobResult {
	const job = getEditorAiAssetJob(store, jobId);

	if (!job) {
		return { status: "not-found", job: null };
	}

	if (
		job.status === "completed" ||
		job.status === "failed" ||
		job.status === "canceled"
	) {
		return { status: "unchanged", job };
	}

	const updatedJob: EditorAiAssetJob = {
		...job,
		status: "canceled",
		statusReason: "Canceled by the level editor AI Asset Lab.",
		updatedAt: store.now(),
	};
	replaceEditorAiAssetJob(store, updatedJob);

	return { status: "canceled", job: updatedJob };
}

export function completeEditorAiAssetJob(
	store: EditorAiJobQueueStore,
	jobId: string,
	options: Omit<
		CreateEditorAiGeneratedAssetRecordOptions,
		"id" | "createdAt"
	> & {
		readonly id?: string;
	},
): EditorAiGeneratedAssetLibraryRecord {
	const job = getEditorAiAssetJob(store, jobId);

	if (!job) {
		throw new Error(`Cannot complete unknown AI asset job "${jobId}".`);
	}

	const now = store.now();
	const record = createEditorAiGeneratedAssetLibraryRecord(job, {
		id: options.id ?? `generated-${job.id}`,
		assetId: options.assetId,
		kind: options.kind,
		label: options.label,
		url: options.url,
		metadataUrl: options.metadataUrl,
		createdAt: now,
		...(options.generatedAssetSha256 === undefined
			? {}
			: { generatedAssetSha256: options.generatedAssetSha256 }),
		...(options.ownerManifestStatus === undefined
			? {}
			: { ownerManifestStatus: options.ownerManifestStatus }),
	});
	const updatedJob: EditorAiAssetJob = {
		...job,
		status: "completed",
		statusReason: null,
		generatedAssetUrl: record.url,
		metadataUrl: record.metadataUrl,
		fingerprints: record.metadata.fingerprints,
		ownerManifestStatus: record.ownerManifestStatus,
		updatedAt: now,
	};

	replaceEditorAiAssetJob(store, updatedJob);
	store.generatedAssets = [record, ...store.generatedAssets];

	return record;
}

export function getEditorAiAssetJob(
	store: EditorAiJobQueueStore,
	jobId: string,
): EditorAiAssetJob | undefined {
	return store.jobs.find((job) => job.id === jobId);
}

export function getEditorAiGeneratedAssetRecord(
	store: EditorAiJobQueueStore,
	generatedAssetId: string,
): EditorAiGeneratedAssetLibraryRecord | undefined {
	return store.generatedAssets.find((record) => record.id === generatedAssetId);
}

export function snapshotEditorAiJobQueue(
	store: EditorAiJobQueueStore,
	options: { readonly recentLimit?: number } = {},
): EditorAiJobQueueSnapshot {
	const recentLimit = options.recentLimit ?? 10;

	return {
		schemaVersion: EDITOR_AI_ASSET_CONTRACT_VERSION,
		jobs: store.jobs,
		recentJobs: store.jobs.slice(0, recentLimit),
		generatedAssets: store.generatedAssets,
	};
}

export function parseEditorAiAssetJobRequest(
	input: unknown,
): EditorAiAssetJobRequest {
	const record = asRecord(input, "AI job request");
	const backend = stringField(record, "backend");

	if (!isEditorAiBackendId(backend)) {
		throw new Error(`Unsupported AI backend "${backend}".`);
	}

	const mode = stringField(record, "mode").trim();

	if (!isEditorAiAssetJobMode(mode)) {
		throw new Error(`Unsupported AI job mode "${mode}".`);
	}

	const prompt = stringField(record, "prompt").trim();

	if (prompt.length === 0) {
		throw new Error("AI job prompt is required.");
	}

	return {
		backend,
		mode,
		runtimeSceneId: requiredTrimmedStringField(record, "runtimeSceneId"),
		prompt,
		...optionalTrimmedStringField(record, "sourceStableId"),
		...optionalTrimmedStringField(record, "sourceAssetId"),
		...optionalTrimmedStringField(record, "referenceImageUrl"),
		...(typeof record.fitToSelection === "boolean"
			? { fitToSelection: record.fitToSelection }
			: {}),
	};
}

function capabilityForJobMode(
	mode: EditorAiAssetJobMode,
): EditorAiServiceCapability {
	return mode;
}

function blockedJobReason(
	request: EditorAiAssetJobRequest,
	options: {
		readonly serviceAvailable: boolean;
		readonly modeSupported: boolean;
		readonly serviceReason: string | null;
	},
): string {
	if (!options.serviceAvailable) {
		return (
			options.serviceReason ??
			`${request.backend} service is unavailable; job was not dispatched.`
		);
	}

	if (!options.modeSupported) {
		return `${request.backend} does not support ${request.mode} jobs.`;
	}

	return "AI job was blocked by the editor asset contract.";
}

export function stableEditorAiHash(value: string): string {
	let hash = 0x811c9dc5;

	for (const char of value) {
		hash ^= char.charCodeAt(0);
		hash = Math.imul(hash, 0x01000193);
	}

	return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function replaceEditorAiAssetJob(
	store: EditorAiJobQueueStore,
	job: EditorAiAssetJob,
): void {
	store.jobs = store.jobs.map((entry) => (entry.id === job.id ? job : entry));
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`${label} must be a JSON object.`);
	}

	return value as Record<string, unknown>;
}

function stringField(record: Record<string, unknown>, field: string): string {
	const value = record[field];

	if (typeof value !== "string") {
		throw new Error(`${field} must be a string.`);
	}

	return value;
}

function requiredTrimmedStringField(
	record: Record<string, unknown>,
	field: string,
): string {
	const value = stringField(record, field).trim();

	if (value.length === 0) {
		throw new Error(`${field} is required.`);
	}

	return value;
}

function optionalTrimmedStringField(
	record: Record<string, unknown>,
	field: string,
): Record<string, string> {
	const value = record[field];

	if (value === undefined) {
		return {};
	}

	if (typeof value !== "string") {
		throw new Error(`${field} must be a string when provided.`);
	}

	const trimmed = value.trim();

	return trimmed.length === 0 ? {} : { [field]: trimmed };
}
