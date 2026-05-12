<script lang="ts">
import { createEventDispatcher } from 'svelte'

import type { ActiveLevelNote } from '../core/gameShellUiState'

export let note: ActiveLevelNote

const dispatch = createEventDispatcher<{
  close: undefined
}>()
</script>

<div class="level-note-overlay">
  <div class="level-note-panel">
    <button
      class="level-note-close"
      aria-label="Close note"
      on:click={() => dispatch('close')}
    >
      &times;
    </button>
    <div class="level-note-kicker">{note.location}</div>
    <h3 class="level-note-title">{note.title}</h3>
    <div class="level-note-author">{note.author}</div>
    <p class="level-note-excerpt">{note.excerpt}</p>
    <div class="level-note-body">{note.body}</div>
  </div>
</div>

<style>
  .level-note-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    padding: 1.25rem;
    z-index: 45;
  }

  .level-note-panel {
    position: relative;
    pointer-events: auto;
    width: min(30rem, calc(100vw - 2rem));
    max-height: min(32rem, 72vh);
    overflow: auto;
    padding: 1rem 1rem 1.1rem;
    border: 1px solid rgba(255, 214, 180, 0.28);
    border-radius: 1rem;
    background:
      linear-gradient(180deg, rgba(33, 20, 19, 0.96), rgba(10, 9, 13, 0.96)),
      rgba(0, 0, 0, 0.86);
    box-shadow:
      0 18px 48px rgba(0, 0, 0, 0.52),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
    color: rgba(255, 244, 232, 0.96);
    backdrop-filter: blur(14px);
  }

  .level-note-kicker {
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255, 180, 138, 0.82);
    margin-bottom: 0.45rem;
  }

  .level-note-title {
    margin: 0;
    font-size: 1.15rem;
    line-height: 1.2;
  }

  .level-note-author {
    margin-top: 0.25rem;
    font-size: 0.8rem;
    color: rgba(196, 215, 255, 0.78);
  }

  .level-note-excerpt {
    margin: 0.8rem 0 0.65rem;
    font-size: 0.95rem;
    color: rgba(255, 219, 196, 0.88);
  }

  .level-note-body {
    white-space: pre-line;
    font-size: 0.9rem;
    line-height: 1.5;
    color: rgba(255, 244, 232, 0.92);
  }

  .level-note-close {
    position: absolute;
    top: 0.6rem;
    right: 0.7rem;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 244, 232, 0.88);
    font-size: 1.2rem;
    cursor: pointer;
  }

  .level-note-close:hover {
    background: rgba(255, 255, 255, 0.16);
  }

  @media (prefers-reduced-motion: reduce) {
    .level-note-close {
      transition-duration: 0.01ms !important;
    }
  }

  @media (max-width: 768px) {
    .level-note-overlay {
      padding: 0.75rem;
    }

    .level-note-panel {
      width: min(100%, 28rem);
      max-height: 58vh;
      padding-bottom: 1rem;
    }
  }
</style>
