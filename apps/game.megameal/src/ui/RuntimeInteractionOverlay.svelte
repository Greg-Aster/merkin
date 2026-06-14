<script lang="ts">
import type { Command } from "../engine/index.js";
import type { GameRuntimeUiState } from "../game/index.js";

type Props = {
	readonly runtimeUiState: GameRuntimeUiState;
	readonly dispatch?: (command: Command) => void;
};

const { runtimeUiState, dispatch }: Props = $props();

const noteParagraphs = () =>
	runtimeUiState.openStoryNote?.body
		.split(/\n{2,}/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean) ?? [];

function closeStoryNote(): void {
	dispatch?.({ type: "CloseStoryNote" });
}
</script>

{#if !runtimeUiState.openStoryNote && runtimeUiState.activePortal}
	<div
		class:locked={!runtimeUiState.activePortal.canTravel}
		class="interaction-prompt"
		aria-live="polite"
	>
		<span>{runtimeUiState.activePortal.label}</span>
		<strong>{runtimeUiState.activePortal.prompt}</strong>
	</div>
{:else if !runtimeUiState.openStoryNote && runtimeUiState.activeStoryNote}
	<div class="interaction-prompt" aria-live="polite">
		<span>{runtimeUiState.activeStoryNote.location}</span>
		<strong>
			{runtimeUiState.activeStoryNote.title}: {runtimeUiState.activeStoryNote.excerpt}
		</strong>
	</div>
{/if}

{#if runtimeUiState.openStoryNote}
	<section
		class="story-note-reader"
		aria-labelledby="story-note-reader-title"
		aria-modal="false"
	>
		<div class="story-note-heading">
			<span>{runtimeUiState.openStoryNote.location}</span>
			<button
				type="button"
				aria-label="Close note"
				onclick={closeStoryNote}
			>
				Close
			</button>
		</div>
		<h2 id="story-note-reader-title">{runtimeUiState.openStoryNote.title}</h2>
		<p class="story-note-meta">{runtimeUiState.openStoryNote.author}</p>
		<p class="story-note-excerpt">{runtimeUiState.openStoryNote.excerpt}</p>
		<div class="story-note-body">
			{#each noteParagraphs() as paragraph}
				<p>{paragraph}</p>
			{/each}
		</div>
	</section>
{/if}

<style>
	.interaction-prompt {
		position: absolute;
		left: 50%;
		bottom: 30px;
		width: min(520px, calc(100vw - 32px));
		transform: translateX(-50%);
		border: 1px solid rgb(184 242 207 / 30%);
		border-radius: 8px;
		background: rgb(13 18 17 / 82%);
		box-shadow: 0 16px 46px rgb(0 0 0 / 28%);
		color: #f7f3e8;
		padding: 12px 16px;
		text-align: center;
		backdrop-filter: blur(12px);
	}

	.interaction-prompt.locked {
		border-color: rgb(255 217 168 / 28%);
	}

	.interaction-prompt span {
		display: block;
		color: #b8f2cf;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.interaction-prompt.locked span {
		color: #ffd9a8;
	}

	.interaction-prompt strong {
		display: block;
		overflow-wrap: anywhere;
		font-size: 1rem;
		font-weight: 800;
		line-height: 1.35;
	}

	.story-note-reader {
		position: absolute;
		top: 50%;
		left: 50%;
		z-index: 20;
		width: min(620px, calc(100vw - 32px));
		max-height: min(680px, calc(100vh - 48px));
		transform: translate(-50%, -50%);
		overflow: auto;
		border: 1px solid rgb(232 243 226 / 26%);
		border-radius: 8px;
		background: rgb(13 18 17 / 92%);
		box-shadow: 0 24px 80px rgb(0 0 0 / 42%);
		color: #f7f3e8;
		padding: 18px;
		backdrop-filter: blur(14px);
	}

	.story-note-heading {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 12px;
		align-items: center;
	}

	.story-note-heading span {
		overflow-wrap: anywhere;
		color: #b8f2cf;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.story-note-heading button {
		border: 1px solid rgb(232 243 226 / 24%);
		border-radius: 8px;
		background: rgb(30 51 45 / 84%);
		color: #f7f3e8;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 800;
		letter-spacing: 0;
		padding: 7px 10px;
	}

	.story-note-reader h2 {
		margin: 14px 0 0;
		font-size: clamp(1.25rem, 4vw, 1.8rem);
		line-height: 1.12;
		letter-spacing: 0;
	}

	.story-note-meta,
	.story-note-excerpt {
		margin: 8px 0 0;
		color: #a9bbb5;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.story-note-excerpt {
		color: #ffd9a8;
		font-weight: 700;
	}

	.story-note-body {
		display: grid;
		gap: 12px;
		margin-top: 16px;
		border-top: 1px solid rgb(232 243 226 / 12%);
		padding-top: 14px;
	}

	.story-note-body p {
		margin: 0;
		color: #f7f3e8;
		font-size: 0.96rem;
		line-height: 1.62;
	}

	@media (max-width: 560px) {
		.interaction-prompt {
			bottom: 18px;
			width: calc(100vw - 20px);
			padding: 10px 12px;
		}

		.interaction-prompt strong {
			font-size: 0.9rem;
		}

		.story-note-reader {
			top: 12px;
			max-height: calc(100vh - 24px);
			transform: translateX(-50%);
			padding: 14px;
		}
	}

	@media (pointer: coarse) {
		.interaction-prompt {
			bottom: 154px;
		}
	}
</style>
