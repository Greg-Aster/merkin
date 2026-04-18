<script lang="ts">
  import { runtimeDiagnosticsSummaryStore } from '../stores/runtimeDiagnosticsStore'

  export let title = 'Runtime Diagnostics'
  export let compact = false

  $: summary = $runtimeDiagnosticsSummaryStore

  function formatTimestamp(timestamp: number) {
    if (!timestamp) return 'never'
    return new Date(timestamp).toLocaleTimeString()
  }
</script>

<div class:compact class="runtime-diagnostics-panel">
  <div class="runtime-diagnostics-header">
    <div>
      <div class="runtime-diagnostics-title">{title}</div>
      <div class="runtime-diagnostics-summary">
        {summary.errors} error{summary.errors === 1 ? '' : 's'} •
        {summary.warnings} warning{summary.warnings === 1 ? '' : 's'}
      </div>
    </div>
  </div>

  <div class="runtime-diagnostics-list">
    {#each summary.diagnostics as entry (entry.key)}
      <div class={`runtime-diagnostics-item level-${entry.level}`}>
        <div class="runtime-diagnostics-item-header">
          <span>{entry.label}</span>
          <span>{formatTimestamp(entry.updatedAt)}</span>
        </div>
        <div class="runtime-diagnostics-message">{entry.message}</div>
      </div>
    {/each}
  </div>

  {#if summary.assetFailures.length}
    <div class="runtime-diagnostics-failures">
      <div class="runtime-diagnostics-subtitle">Recent Asset Failures</div>
      {#each summary.assetFailures as failure (failure.id)}
        <div class="runtime-diagnostics-failure">
          <div class="runtime-diagnostics-item-header">
            <span>{failure.source}</span>
            <span>{formatTimestamp(failure.updatedAt)}</span>
          </div>
          <div class="runtime-diagnostics-message">{failure.message}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .runtime-diagnostics-panel {
    display: grid;
    gap: 0.7rem;
    padding: 0.8rem;
    border: 1px solid rgba(126, 153, 192, 0.18);
    border-radius: 0.9rem;
    background: rgba(7, 13, 22, 0.82);
    color: #dbe9ff;
  }

  .runtime-diagnostics-panel.compact {
    padding: 0.65rem;
    gap: 0.55rem;
  }

  .runtime-diagnostics-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
  }

  .runtime-diagnostics-title,
  .runtime-diagnostics-subtitle {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #96cafc;
  }

  .runtime-diagnostics-summary {
    font-size: 0.75rem;
    color: rgba(219, 233, 255, 0.7);
    margin-top: 0.15rem;
  }

  .runtime-diagnostics-list,
  .runtime-diagnostics-failures {
    display: grid;
    gap: 0.45rem;
  }

  .runtime-diagnostics-item,
  .runtime-diagnostics-failure {
    display: grid;
    gap: 0.2rem;
    padding: 0.5rem 0.6rem;
    border-radius: 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .runtime-diagnostics-item.level-ready {
    border-color: rgba(89, 214, 154, 0.22);
  }

  .runtime-diagnostics-item.level-warning {
    border-color: rgba(244, 193, 96, 0.28);
  }

  .runtime-diagnostics-item.level-error {
    border-color: rgba(255, 107, 129, 0.3);
  }

  .runtime-diagnostics-item.level-loading {
    border-color: rgba(108, 170, 255, 0.24);
  }

  .runtime-diagnostics-item-header {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
    font-size: 0.74rem;
    color: rgba(219, 233, 255, 0.82);
  }

  .runtime-diagnostics-message {
    font-size: 0.78rem;
    line-height: 1.35;
    color: rgba(237, 244, 255, 0.9);
  }
</style>
