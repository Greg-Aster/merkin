<script lang="ts">
import type { EditorPanelTab, EditorPanelTabItem } from './editorPanelTabs'

export let tabs: EditorPanelTabItem[] = []
export let activeTab: EditorPanelTab = 'scene'
export let onTabSelect: (tab: EditorPanelTab) => void = () => {}
</script>

<div class="editor-tab-rail" role="tablist" aria-label="Editor workspaces">
  {#each tabs as tab (tab.id)}
    <button
      type="button"
      class="editor-tab-button"
      class:active={activeTab === tab.id}
      role="tab"
      title={tab.description ?? tab.label}
      aria-selected={activeTab === tab.id}
      aria-current={activeTab === tab.id ? 'page' : undefined}
      on:click={() => onTabSelect(tab.id)}
    >
      <span class="tab-icon">{tab.icon}</span>
      <span class="tab-label">{tab.label}</span>
    </button>
  {/each}
</div>

<style>
  .editor-tab-rail {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.35rem;
    align-content: stretch;
    padding: 0.55rem;
    border-bottom: 1px solid rgba(126, 203, 255, 0.08);
    background: rgba(5, 9, 16, 0.55);
    min-height: auto;
    min-width: 0;
    overflow: visible;
  }

  .editor-tab-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.32rem;
    min-width: 0;
    min-height: 2rem;
    padding: 0.38rem 0.42rem;
    border: 1px solid rgba(126, 203, 255, 0.14);
    border-radius: 0.45rem;
    background: rgba(13, 24, 36, 0.72);
    color: #d9efff;
    font: inherit;
    cursor: pointer;
  }

  .editor-tab-button:hover,
  .editor-tab-button.active {
    border-color: rgba(126, 203, 255, 0.42);
    background: rgba(29, 63, 91, 0.88);
    color: #ffffff;
  }

  .tab-icon {
    font-size: 0.92rem;
    line-height: 1;
  }

  .tab-label {
    font-size: 0.78rem;
    line-height: 1.1;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 900px) {
    .editor-tab-rail {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.32rem;
      padding: 0.45rem 0.5rem;
    }

    .editor-tab-button {
      padding: 0.38rem 0.42rem;
    }
  }

  @media (max-width: 680px) {
    .editor-tab-rail {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
