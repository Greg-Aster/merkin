<script lang="ts">
export let panelOpen = false
export let propertiesShelfOpen = false
export let onTogglePropertiesShelf: () => void = () => {}
export let onTogglePanel: () => void = () => {}
</script>

<div class="editor-header">
  <div class="editor-header-actions">
    <button
      class="collapse-btn"
      on:click={onTogglePropertiesShelf}
      disabled={!panelOpen}
    >
      {propertiesShelfOpen ? 'Hide Shelf' : 'Show Shelf'}
    </button>
    <button class="collapse-btn" on:click={onTogglePanel}>
      {panelOpen ? 'Collapse' : 'Open'}
    </button>
  </div>
</div>

<style>
  .editor-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 0;
    margin-bottom: 0.5rem;
    width: auto;
    background: transparent;
    border: none;
    border-radius: 0;
    backdrop-filter: none;
    box-shadow: none;
  }

  .editor-header-actions {
    display: flex;
    gap: 0.35rem;
    padding: 0.35rem;
    background: rgba(9, 14, 24, 0.92);
    border: 1px solid rgba(126, 203, 255, 0.24);
    border-radius: 0.7rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 1280px) {
    .editor-header {
      width: auto;
    }
  }

  @media (max-width: 900px) {
    .editor-header-actions {
      padding: 0.28rem;
    }
  }
</style>
