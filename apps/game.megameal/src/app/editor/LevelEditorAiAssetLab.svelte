<script lang="ts">
import { onMount } from "svelte";
import type {
	EditorAiApplyOperationKind,
	EditorAiApplyToSelectionPlan,
	EditorAiAssetJob,
	EditorAiAssetJobMode,
	EditorAiBackendId,
	EditorAiGeneratedAssetLibraryRecord,
	EditorAiServiceStatusReport,
} from "../../game/editor/ai/index.js";
import {
	buildLevelEditorAiApplyPlanQueueEntry,
	buildLevelEditorAiAssetLabModel,
	buildLevelEditorAiAssetLabOfflineStatus,
	levelEditorAiAssetLabEndpoints,
} from "./levelEditorAiAssetLabModel.js";
import type { LevelEditorQueuedAuthoringOperation } from "./levelEditorAuthoringStore.js";

type JobSnapshotResponse = {
	readonly jobs?: readonly EditorAiAssetJob[];
	readonly recentJobs?: readonly EditorAiAssetJob[];
};

type LibraryResponse = {
	readonly generatedAssets?: readonly EditorAiGeneratedAssetLibraryRecord[];
};

type ApplySelectionResponse = {
	readonly plan?: EditorAiApplyToSelectionPlan;
};

type StageAuthoringOperationsCallback = (
	entry: LevelEditorQueuedAuthoringOperation,
) => void;

type Props = {
	readonly runtimeSceneId: string;
	readonly selectedStableIds?: readonly string[];
	readonly onStageAuthoringOperations?: StageAuthoringOperationsCallback;
};

const {
	runtimeSceneId,
	selectedStableIds = [],
	onStageAuthoringOperations,
}: Props = $props();
const initialModel = buildLevelEditorAiAssetLabModel();
let selectedBackend: EditorAiBackendId = $state(initialModel.selectedBackend);
let mode: EditorAiAssetJobMode = $state("text-to-3d");
let prompt = $state("");
let sourceAssetId = $state("");
let referenceImageUrl = $state("");
let serviceStatus: EditorAiServiceStatusReport | null = $state(
	initialModel.serviceStatus,
);
let jobs: readonly EditorAiAssetJob[] = $state(initialModel.jobs);
let generatedAssets: readonly EditorAiGeneratedAssetLibraryRecord[] = $state(
	initialModel.generatedAssets,
);
let statusMessage = $state("AI services not checked");
let apiReachable = $state(true);
const selectedStableIdList = $derived(
	selectedStableIds.length > 0 ? selectedStableIds : [],
);
const selectedBackendStatus = $derived(
	serviceStatus?.services.find(
		(service) => service.backend === selectedBackend,
	),
);
const canSubmitJob = $derived(prompt.trim().length > 0 && apiReachable);

onMount(() => {
	void refreshAiAssetLab();
});

async function refreshAiAssetLab(): Promise<void> {
	try {
		const [status, jobSnapshot, library] = await Promise.all([
			fetchJson<EditorAiServiceStatusReport>(
				levelEditorAiAssetLabEndpoints.status,
			),
			fetchJson<JobSnapshotResponse>(levelEditorAiAssetLabEndpoints.jobs),
			fetchJson<LibraryResponse>(levelEditorAiAssetLabEndpoints.library),
		]);

		apiReachable = true;
		serviceStatus = status;
		jobs = jobSnapshot.recentJobs ?? jobSnapshot.jobs ?? [];
		generatedAssets = library.generatedAssets ?? [];
		statusMessage =
			status.mode === "disabled-outside-dev"
				? "AI Asset Lab disabled outside development"
				: `${status.availableBackends.length} AI services available`;
	} catch (error) {
		const message = formatError(error);
		apiReachable = false;
		serviceStatus = buildLevelEditorAiAssetLabOfflineStatus(message);
		jobs = [];
		generatedAssets = [];
		statusMessage = message;
	}
}

async function queueJob(): Promise<void> {
	const body = {
		backend: selectedBackend,
		mode,
		runtimeSceneId,
		prompt,
		...(selectedStableIdList[0] === undefined
			? {}
			: { sourceStableId: selectedStableIdList[0], fitToSelection: true }),
		...(sourceAssetId.trim().length === 0
			? {}
			: { sourceAssetId: sourceAssetId.trim() }),
		...(referenceImageUrl.trim().length === 0
			? {}
			: { referenceImageUrl: referenceImageUrl.trim() }),
	};
	try {
		const response = await fetch(levelEditorAiAssetLabEndpoints.jobs, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			statusMessage = await readErrorMessage(response);
			return;
		}

		const { job } = (await response.json()) as {
			readonly job?: EditorAiAssetJob;
		};

		prompt = "";
		statusMessage =
			job?.status === "blocked"
				? job.statusReason ?? "AI job blocked"
				: "AI job queued";
		await refreshAiAssetLab();
	} catch (error) {
		statusMessage = formatError(error);
		apiReachable = false;
		serviceStatus = buildLevelEditorAiAssetLabOfflineStatus(statusMessage);
	}
}

async function cancelJob(jobId: string): Promise<void> {
	try {
		const response = await fetch(levelEditorAiAssetLabEndpoints.cancel, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ jobId }),
		});

		statusMessage = response.ok
			? "AI job canceled"
			: await readErrorMessage(response);
		await refreshAiAssetLab();
	} catch (error) {
		statusMessage = formatError(error);
	}
}

async function applyGeneratedAsset(
	record: EditorAiGeneratedAssetLibraryRecord,
	operation: EditorAiApplyOperationKind,
): Promise<void> {
	try {
		const response = await fetch(
			levelEditorAiAssetLabEndpoints.applySelection,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					runtimeSceneId,
					generatedAssetId: record.id,
					selectedStableIds: selectedStableIdList,
					operation,
					preserveStableIds: true,
					fitToSelection: true,
				}),
			},
		);

		if (!response.ok) {
			statusMessage = await readErrorMessage(response);
			return;
		}

		const { plan } = (await response.json()) as ApplySelectionResponse;

		if (plan === undefined) {
			statusMessage = "AI apply response did not include a plan";
			return;
		}

		const entry = buildLevelEditorAiApplyPlanQueueEntry(plan, record);
		const saveOperationCount = entry.saveOperations?.length ?? 0;
		onStageAuthoringOperations?.(entry);
		statusMessage =
			onStageAuthoringOperations === undefined
				? formatApplyPlanReadyMessage(saveOperationCount)
				: formatApplyPlanStagedMessage(saveOperationCount);
	} catch (error) {
		statusMessage = formatError(error);
	}
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(await readErrorMessage(response));
	}

	return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as { readonly error?: unknown };

		return typeof body.error === "string"
			? body.error
			: `AI request failed with HTTP ${response.status}`;
	} catch {
		return `AI request failed with HTTP ${response.status}`;
	}
}

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function formatApplyPlanReadyMessage(saveOperationCount: number): string {
	return `AI apply plan ready (${formatSaveOperationCount(saveOperationCount)})`;
}

function formatApplyPlanStagedMessage(saveOperationCount: number): string {
	return `AI apply plan staged (${formatSaveOperationCount(saveOperationCount)})`;
}

function formatSaveOperationCount(count: number): string {
	return `${count} generated save operation${count === 1 ? "" : "s"}`;
}

function handleBackendChange(event: Event): void {
	selectedBackend = (event.currentTarget as HTMLSelectElement)
		.value as EditorAiBackendId;
}

function handleModeChange(event: Event): void {
	mode = (event.currentTarget as HTMLSelectElement)
		.value as EditorAiAssetJobMode;
}

function handlePromptInput(event: Event): void {
	prompt = (event.currentTarget as HTMLInputElement).value;
}

function handleSourceAssetInput(event: Event): void {
	sourceAssetId = (event.currentTarget as HTMLInputElement).value;
}

function handleReferenceImageInput(event: Event): void {
	referenceImageUrl = (event.currentTarget as HTMLInputElement).value;
}
</script>

<section class="editor-panel editor-ai-asset-lab" aria-label="AI Asset Lab">
	<header class="editor-panel-header">
		<div>
			<h2>AI Asset Lab</h2>
			<p>{statusMessage}</p>
		</div>
		<button type="button" onclick={() => void refreshAiAssetLab()}>
			Refresh
		</button>
	</header>

	<div class="editor-status-list">
		{#each serviceStatus?.services ?? [] as service}
			<div class="editor-status" data-state={service.status}>
				<strong>{service.label}</strong>
				<span>{service.status}</span>
				<small>{service.reason ?? `${service.responseMs ?? 0}ms`}</small>
			</div>
		{/each}
	</div>
	{#if selectedBackendStatus?.status === "unavailable"}
		<p class="editor-note">
			{selectedBackendStatus.label}: {selectedBackendStatus.reason ??
				"unavailable"}
		</p>
	{/if}

	<form
		class="editor-inspector-fields"
		onsubmit={(event) => {
			event.preventDefault();
			void queueJob();
		}}
	>
		<label class="editor-field">
			<span>Backend</span>
			<select
				value={selectedBackend}
				onchange={handleBackendChange}
			>
				<option value="hunyuan3d">Hunyuan 3D</option>
				<option value="comfyui">ComfyUI</option>
			</select>
		</label>
		<label class="editor-field">
			<span>Mode</span>
			<select
				value={mode}
				onchange={handleModeChange}
			>
				<option value="text-to-3d">Text to 3D</option>
				<option value="image-to-3d">Image to 3D</option>
				<option value="texture-wrap">Texture Wrap</option>
				<option value="replacement-mesh">Replacement Mesh</option>
			</select>
		</label>
		<label class="editor-field">
			<span>Prompt</span>
			<input
				type="text"
				value={prompt}
				oninput={handlePromptInput}
			/>
		</label>
		<label class="editor-field">
			<span>Source Asset</span>
			<input
				type="text"
				value={sourceAssetId}
				oninput={handleSourceAssetInput}
			/>
		</label>
		<label class="editor-field">
			<span>Reference Image</span>
			<input
				type="url"
				value={referenceImageUrl}
				oninput={handleReferenceImageInput}
			/>
		</label>
		<div class="editor-actions">
			<button type="submit" disabled={!canSubmitJob}>
				Queue
			</button>
		</div>
	</form>

	<section>
		<header class="editor-panel-header">
			<h3>Jobs</h3>
			<span>{jobs.length}</span>
		</header>
		<div class="editor-status-list">
			{#each jobs as job}
				<div class="editor-status" data-state={job.status}>
					<strong>{job.mode}</strong>
					<span>{job.status}</span>
					<small>{job.statusReason ?? job.backend}</small>
					<button type="button" onclick={() => void cancelJob(job.id)}>
						Cancel
					</button>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<header class="editor-panel-header">
			<h3>Generated Assets</h3>
			<span>{generatedAssets.length}</span>
		</header>
		<div class="editor-library-grid">
			{#each generatedAssets as asset}
				<article class="editor-library-detail">
					<strong>{asset.label}</strong>
					<span>{asset.kind}</span>
					<a href={asset.url} target="_blank">{asset.assetId}</a>
					<div class="editor-actions">
						<button
							type="button"
							onclick={() =>
								void applyGeneratedAsset(asset, "insert-generated-asset")}
						>
							Insert
						</button>
						<button
							type="button"
							disabled={selectedStableIdList.length === 0}
							onclick={() =>
								void applyGeneratedAsset(asset, "replace-selection-renderable")}
						>
							Replace
						</button>
					</div>
				</article>
			{/each}
		</div>
	</section>
</section>
