<script lang="ts">
import type { RuntimeSnapshot } from "../engine/client-api/index.js";
import type { Command } from "../engine/index.js";

type HudState = {
	readonly playerAlive: boolean;
	readonly playerPosition: readonly [number, number, number];
	readonly health: readonly [number, number];
	readonly remainingCollectibles: number;
	readonly collectedCount: number;
	readonly moving: boolean;
	readonly pointerLocked: boolean;
	readonly lookActive: boolean;
	readonly inputEnabled: boolean;
	readonly charging: boolean;
	readonly chargeAmount: number;
	readonly activePortal?: {
		readonly label: string;
		readonly prompt: string;
		readonly canTravel: boolean;
	};
	readonly activeStoryNote?: {
		readonly title: string;
		readonly author: string;
		readonly location: string;
		readonly excerpt: string;
		readonly prompt: string;
	};
	readonly activeNpc?: {
		readonly displayName: string;
		readonly prompt: string;
		readonly excerpt: string;
	};
	readonly openStoryNote?: {
		readonly title: string;
		readonly author: string;
		readonly location: string;
		readonly excerpt: string;
		readonly body: string;
	};
	readonly openNpcDialog?: {
		readonly displayName: string;
		readonly title: string;
		readonly excerpt: string;
		readonly body: string;
	};
};

type Props = {
	readonly visible?: boolean;
	readonly mounted: boolean;
	readonly snapshot: RuntimeSnapshot;
	readonly gameState: HudState;
	readonly startupError?: string;
	readonly dispatch?: (command: Command) => void;
};

const {
	visible = false,
	mounted,
	snapshot,
	gameState,
	startupError,
	dispatch,
}: Props = $props();

const noteParagraphs = () =>
	gameState.openStoryNote?.body
		.split(/\n{2,}/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean) ?? [];

const npcDialogParagraphs = () =>
	gameState.openNpcDialog?.body
		.split(/\n{2,}/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean) ?? [];

function closeStoryNote(): void {
	dispatch?.({ type: "CloseStoryNote" });
}

function hudStatus(): string {
	if (startupError) {
		return startupError;
	}

	return mounted ? snapshot.lifecycle : "loading";
}
</script>

{#if visible || startupError}
	<section class="hud" aria-label="Game status" data-engine-status>
		<div class="hud-row hud-topline">
			<strong>Megameal</strong>
			<span class:error={startupError}>{hudStatus()}</span>
		</div>
		{#if visible && mounted && !startupError}
			<div class="hud-row hud-stats">
				<span>Tick {snapshot.tick}</span>
				<span>Health {gameState.health[0]} / {gameState.health[1]}</span>
				<span>
					Collectibles {gameState.collectedCount} / {gameState.remainingCollectibles}
				</span>
			</div>
		{/if}
	</section>
{/if}

{#if !gameState.openStoryNote && !gameState.openNpcDialog && gameState.activePortal}
	<div
		class:locked={!gameState.activePortal.canTravel}
		class="interaction-prompt"
		aria-live="polite"
	>
		<span>{gameState.activePortal.label}</span>
		<strong>{gameState.activePortal.prompt}</strong>
	</div>
{:else if !gameState.openStoryNote && !gameState.openNpcDialog && gameState.activeStoryNote}
	<div class="interaction-prompt" aria-live="polite">
		<span>{gameState.activeStoryNote.location}</span>
		<strong>{gameState.activeStoryNote.title}: {gameState.activeStoryNote.excerpt}</strong>
	</div>
{:else if !gameState.openStoryNote && !gameState.openNpcDialog && gameState.activeNpc}
	<div class="interaction-prompt" aria-live="polite">
		<span>{gameState.activeNpc.displayName}</span>
		<strong>{gameState.activeNpc.prompt}: {gameState.activeNpc.excerpt}</strong>
	</div>
{/if}

{#if gameState.openStoryNote}
	<section
		class="story-note-reader"
		aria-labelledby="story-note-reader-title"
		aria-modal="false"
	>
		<div class="story-note-heading">
			<span>{gameState.openStoryNote.location}</span>
			<button
				type="button"
				aria-label="Close note"
				onclick={closeStoryNote}
			>
				Close
			</button>
		</div>
		<h2 id="story-note-reader-title">{gameState.openStoryNote.title}</h2>
		<p class="story-note-meta">{gameState.openStoryNote.author}</p>
		<p class="story-note-excerpt">{gameState.openStoryNote.excerpt}</p>
		<div class="story-note-body">
			{#each noteParagraphs() as paragraph}
				<p>{paragraph}</p>
			{/each}
		</div>
	</section>
{/if}

{#if gameState.openNpcDialog}
	<section
		class="story-note-reader"
		aria-labelledby="npc-dialog-title"
		aria-modal="false"
	>
		<div class="story-note-heading">
			<span>{gameState.openNpcDialog.displayName}</span>
			<button
				type="button"
				aria-label="Close dialog"
				onclick={closeStoryNote}
			>
				Close
			</button>
		</div>
		<h2 id="npc-dialog-title">{gameState.openNpcDialog.title}</h2>
		<p class="story-note-excerpt">{gameState.openNpcDialog.excerpt}</p>
		<div class="story-note-body">
			{#each npcDialogParagraphs() as paragraph}
				<p>{paragraph}</p>
			{/each}
		</div>
	</section>
{/if}

<style>
	.hud {
		position: absolute;
		top: 16px;
		left: 16px;
		width: min(360px, calc(100vw - 32px));
		border: 1px solid rgb(232 243 226 / 18%);
		border-radius: 8px;
		background: rgb(18 25 23 / 78%);
		box-shadow: 0 18px 50px rgb(0 0 0 / 24%);
		color: #f7f3e8;
		padding: 14px;
		backdrop-filter: blur(12px);
	}

	.hud-row {
		display: grid;
		gap: 10px;
	}

	.hud-topline {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
	}

	.hud-topline strong {
		font-size: 1rem;
		letter-spacing: 0;
	}

	.hud-topline span {
		border: 1px solid rgb(184 242 207 / 28%);
		border-radius: 999px;
		background: rgb(30 51 45 / 82%);
		color: #b8f2cf;
		padding: 4px 8px;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.hud-topline span.error {
		border-color: rgb(255 176 150 / 36%);
		background: rgb(70 32 26 / 86%);
		color: #ffb096;
	}

	.hud-stats {
		margin-top: 10px;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.hud-stats span {
		overflow-wrap: anywhere;
		border: 1px solid rgb(232 243 226 / 14%);
		border-radius: 6px;
		background: rgb(8 12 11 / 46%);
		padding: 6px;
		font-size: 0.72rem;
		line-height: 1.2;
	}

	@media (max-width: 560px) {
		.hud {
			top: 10px;
			left: 10px;
			width: calc(100vw - 20px);
			padding: 12px;
		}

		.hud-stats {
			grid-template-columns: 1fr;
		}
	}

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

	@media (max-width: 560px) {
		.interaction-prompt {
			bottom: 18px;
			width: calc(100vw - 20px);
			padding: 10px 12px;
		}

		.interaction-prompt strong {
			font-size: 0.9rem;
		}
	}

	@media (pointer: coarse) {
		.interaction-prompt {
			bottom: 154px;
		}
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
		.story-note-reader {
			top: 12px;
			max-height: calc(100vh - 24px);
			transform: translateX(-50%);
			padding: 14px;
		}
	}
</style>
