<script lang="ts">
import { createEventDispatcher } from 'svelte'

import type { PendingLevelReturn } from '../core/gameShellUiState'

export let pendingReturn: PendingLevelReturn

const dispatch = createEventDispatcher<{
  cancel: undefined
  confirm: undefined
}>()
</script>

<div class="level-return-overlay">
  <div class="level-return-dialog">
    <h3 class="level-return-title">{pendingReturn.title}</h3>
    <p class="level-return-message">{pendingReturn.message}</p>
    <div class="level-return-actions">
      <button
        class="level-return-button secondary"
        on:click={() => dispatch('cancel')}
      >
        {pendingReturn.cancelLabel}
      </button>
      <button
        class="level-return-button primary"
        on:click={() => dispatch('confirm')}
      >
        {pendingReturn.confirmLabel}
      </button>
    </div>
  </div>
</div>

<style>
  .level-return-overlay {
    position: fixed;
    inset: 0;
    z-index: 55;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
    background: rgba(3, 6, 12, 0.7);
    backdrop-filter: blur(10px);
    pointer-events: auto;
  }

  .level-return-dialog {
    width: min(26rem, calc(100vw - 2rem));
    padding: 1.2rem 1.2rem 1rem;
    border: 1px solid rgba(143, 214, 255, 0.2);
    border-radius: 1rem;
    background: linear-gradient(
      180deg,
      rgba(10, 16, 28, 0.96),
      rgba(5, 9, 16, 0.94)
    );
    box-shadow: 0 22px 70px rgba(0, 0, 0, 0.45);
    color: #eef6ff;
  }

  .level-return-title {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  .level-return-message {
    margin: 0;
    color: rgba(226, 237, 250, 0.78);
    line-height: 1.5;
    font-size: 0.95rem;
  }

  .level-return-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.1rem;
  }

  .level-return-button {
    border: none;
    border-radius: 999px;
    padding: 0.7rem 1rem;
    font: inherit;
    cursor: pointer;
    transition:
      transform 140ms ease,
      opacity 140ms ease,
      background 140ms ease;
  }

  .level-return-button:hover {
    transform: translateY(-1px);
  }

  .level-return-button.secondary {
    background: rgba(118, 136, 164, 0.18);
    color: #d6e4f5;
  }

  .level-return-button.primary {
    background: linear-gradient(135deg, #7fd3ff, #a4b6ff);
    color: #05121d;
    font-weight: 700;
  }

  @media (prefers-reduced-motion: reduce) {
    .level-return-button {
      transition-duration: 0.01ms !important;
    }
  }

  @media (max-width: 768px) {
    .level-return-dialog {
      width: min(100%, 25rem);
    }
  }
</style>
