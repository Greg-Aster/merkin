<script lang="ts">
import type { LevelEditorAuthoringOperationData } from "../../game/editor/authoring/saveTransaction.js";
import type {
	EnvironmentAuthoringControl,
	EnvironmentAuthoringModel,
	EnvironmentAuthoringOperationDraft,
} from "../../game/editor/environmentAuthoring/index.js";
import type { LevelEditorQueuedAuthoringOperation } from "./levelEditorAuthoringStore.js";
import { parseEnvironmentAuthoringModel } from "./levelEditorEnvironmentPanels.js";

type StageAuthoringOperationsCallback = (
	entry: LevelEditorQueuedAuthoringOperation,
) => void;

type Props = {
	readonly serializedEnvironmentModel: string;
	readonly onStageAuthoringOperations?: StageAuthoringOperationsCallback;
};

const { serializedEnvironmentModel, onStageAuthoringOperations }: Props =
	$props();
const model: EnvironmentAuthoringModel = parseEnvironmentAuthoringModel(
	serializedEnvironmentModel,
);
let stagedDrafts: readonly EnvironmentAuthoringOperationDraft[] = $state([]);

function stageControlDraft(
	control: EnvironmentAuthoringControl,
	event: Event,
): void {
	const value = controlValue(control, event);
	const draft =
		control.operationDraft.operation === "set-audio-track-id"
			? {
					...control.operationDraft,
					trackId: String(value),
				}
			: {
					...control.operationDraft,
					value,
				};

	stageDraft(draft);
}

function stageAudioTrackDraft(trackIndex: number, event: Event): void {
	const select = event.currentTarget as HTMLSelectElement;
	const control = model.audio.trackControls.find(
		(candidate) => candidate.trackIndex === trackIndex,
	);

	if (!control) {
		return;
	}

	stageDraft({
		...control.operationDraft,
		trackId: select.value,
	});
}

function stageDraft(draft: EnvironmentAuthoringOperationDraft): void {
	const key = draftKey(draft);
	const nextDrafts = [
		...stagedDrafts.filter((candidate) => draftKey(candidate) !== key),
		draft,
	].sort((left, right) => draftKey(left).localeCompare(draftKey(right)));

	stagedDrafts = nextDrafts;
	emitStagedAuthoringOperations(nextDrafts);
}

function controlValue(
	control: EnvironmentAuthoringControl,
	event: Event,
): string | number | boolean {
	const target = event.currentTarget as HTMLInputElement | HTMLSelectElement;

	if (control.input === "boolean" && target instanceof HTMLInputElement) {
		return target.checked;
	}

	if (control.input === "number") {
		const value = Number(target.value);
		return Number.isFinite(value) ? value : Number(control.value) || 0;
	}

	return target.value;
}

function draftKey(draft: EnvironmentAuthoringOperationDraft): string {
	switch (draft.operation) {
		case "set-authored-light-field":
			return `${draft.operation}:${draft.stableId}:${draft.path}`;
		case "set-audio-track-id":
			return `${draft.operation}:${draft.trackIndex}`;
		case "set-render-profile-environment":
			return `${draft.operation}:${draft.path}`;
	}
}

function emitStagedAuthoringOperations(
	drafts: readonly EnvironmentAuthoringOperationDraft[],
): void {
	onStageAuthoringOperations?.({
		id: `environment:${model.runtimeSceneId}`,
		label: "Environment authoring",
		saveOperations: drafts.map(authoringOperationForEnvironmentDraft),
	});
}

function authoringOperationForEnvironmentDraft(
	draft: EnvironmentAuthoringOperationDraft,
): LevelEditorAuthoringOperationData {
	switch (draft.operation) {
		case "set-authored-light-field":
			return {
				kind: "replace-level-instance",
				ownerKind: "level",
				ownerTargetId: `${draft.runtimeSceneId}:level`,
				subjectId: draft.stableId,
				payload: {
					operation: draft.operation,
					sourceOwner: draft.sourceOwner,
					path: draft.path,
					value: draft.value,
				},
			} satisfies LevelEditorAuthoringOperationData;
		case "set-audio-track-id":
			return {
				kind: "replace-asset",
				ownerKind: "asset",
				ownerTargetId: `${draft.runtimeSceneId}:assets`,
				subjectId: `sceneMusic:${draft.trackIndex}`,
				payload: {
					operation: draft.operation,
					sourceOwner: draft.sourceOwner,
					trackIndex: draft.trackIndex,
					trackId: draft.trackId,
				},
			} satisfies LevelEditorAuthoringOperationData;
		case "set-render-profile-environment":
			return {
				kind: "replace-render-profile",
				ownerKind: "render-profile",
				ownerTargetId: `${draft.runtimeSceneId}:render-profile`,
				subjectId: draft.path,
				payload: {
					operation: draft.operation,
					sourceOwner: draft.sourceOwner,
					path: draft.path,
					value: draft.value,
				},
			} satisfies LevelEditorAuthoringOperationData;
	}
}
</script>

<section class="editor-panel" aria-label="Environment authoring">
	<header class="editor-panel-header">
		<div>
			<h2>Environment</h2>
			<p>{model.runtimeSceneId}</p>
		</div>
		<span>{model.environment.kind}</span>
	</header>

	<div class="editor-inspector-fields">
		{#each model.environment.controls as control}
			<label class="editor-field">
				<span>{control.label}</span>
				{#if control.input === "select" || control.input === "asset-id"}
					<select onchange={(event) => stageControlDraft(control, event)}>
						{#each control.options ?? [] as option}
							<option value={option.value} selected={option.value === String(control.value)}>
								{option.label}
							</option>
						{/each}
					</select>
				{:else if control.input === "boolean"}
					<input
						type="checkbox"
						checked={Boolean(control.value)}
						onchange={(event) => stageControlDraft(control, event)}
					/>
				{:else}
					<input
						type={control.input}
						value={String(control.value)}
						min={control.min}
						max={control.max}
						step={control.step}
						oninput={(event) => stageControlDraft(control, event)}
					/>
				{/if}
			</label>
		{/each}
	</div>
</section>

<section class="editor-panel" aria-label="Lighting authoring">
	<header class="editor-panel-header">
		<h2>Lighting</h2>
		<span>{model.lighting.lightControls.length}</span>
	</header>
	{#each model.lighting.lightControls as light}
		<section class="editor-outliner-group">
			<h3>{light.stableId}</h3>
			<div class="editor-inspector-fields">
				{#each light.controls as control}
					<label class="editor-field">
						<span>{control.label}</span>
						{#if control.input === "select"}
							<select onchange={(event) => stageControlDraft(control, event)}>
								{#each control.options ?? [] as option}
									<option value={option.value} selected={option.value === String(control.value)}>
										{option.label}
									</option>
								{/each}
							</select>
						{:else if control.input === "boolean"}
							<input
								type="checkbox"
								checked={Boolean(control.value)}
								onchange={(event) => stageControlDraft(control, event)}
							/>
						{:else}
							<input
								type={control.input}
								value={String(control.value)}
								min={control.min}
								max={control.max}
								step={control.step}
								oninput={(event) => stageControlDraft(control, event)}
							/>
						{/if}
					</label>
				{/each}
			</div>
		</section>
	{/each}
</section>

<section class="editor-panel" aria-label="Audio authoring">
	<header class="editor-panel-header">
		<h2>Audio</h2>
		<span>{model.audio.sceneMusicTrackIds.length}</span>
	</header>
	<div class="editor-inspector-fields">
		{#each model.audio.trackControls as control}
			<label class="editor-field">
				<span>Track {control.trackIndex + 1}</span>
				<select onchange={(event) => stageAudioTrackDraft(control.trackIndex, event)}>
					{#each control.options as option}
						<option value={option.value} selected={option.value === control.trackId}>
							{option.label}
						</option>
					{/each}
				</select>
			</label>
		{/each}
	</div>
	<dl class="editor-facts editor-facts-compact">
		<div>
			<dt>Mixer Buses</dt>
			<dd>{model.audio.mixerBusIds.join(", ") || "none"}</dd>
		</div>
		<div>
			<dt>Event Maps</dt>
			<dd>{model.audio.eventMappingIds.length}</dd>
		</div>
		<div>
			<dt>Drafts</dt>
			<dd>{stagedDrafts.length}</dd>
		</div>
	</dl>
</section>
