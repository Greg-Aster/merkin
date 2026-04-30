<script lang="ts">
import type { EditorPanelTab, EditorPanelTabItem } from './editorPanelTabs'

export let tabs: EditorPanelTabItem[] = []
export let activeTab: EditorPanelTab = 'workflow'
export let onTabSelect: (tab: EditorPanelTab) => void = () => {}
</script>

<div class="editor-tab-rail" aria-label="Editor sections">
  {#each tabs as tab (tab.id)}
    <button
      class="editor-tab"
      class:active={activeTab === tab.id}
      title={tab.label}
      aria-label={tab.label}
      on:click={() => onTabSelect(tab.id)}
    >
      <span class="editor-tab-icon">{tab.icon}</span>
      <span class="editor-tab-label">{tab.label}</span>
    </button>
  {/each}
</div>

<style>
  .editor-tab-rail {
    display: grid;
    align-content: start;
    gap: 0.45rem;
    padding: 0.9rem 0.65rem;
    border-right: 1px solid rgba(126, 203, 255, 0.08);
    background: rgba(5, 9, 16, 0.55);
  }

  .editor-tab {
    display: grid;
    justify-items: center;
    gap: 0.18rem;
    padding: 0.5rem 0.35rem;
    font-size: 0.68rem;
    line-height: 1.1;
  }

  .editor-tab-icon {
    font-size: 1rem;
  }

  .editor-tab-label {
    display: block;
    text-align: center;
  }
</style>
