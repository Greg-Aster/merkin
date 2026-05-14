<script lang="ts">
import EditorPanelTabRail from './EditorPanelTabRail.svelte'
import type { EditorPanelTab, EditorPanelTabItem } from './editorPanelTabs'

export let tabs: EditorPanelTabItem[] = []
export let activeTab: EditorPanelTab = 'scene'
export let contentElement: HTMLDivElement | null = null
export let onTabSelect: (tab: EditorPanelTab) => void = () => {}
</script>

<div class="editor-tools-panel">
  <EditorPanelTabRail {tabs} {activeTab} {onTabSelect} />

  <div class="editor-tab-panel">
    <div class="editor-tab-content" bind:this={contentElement}>
      <slot />
    </div>
  </div>
</div>

<style>
  .editor-tools-panel {
    min-height: 0;
    overflow: hidden;
    background: rgba(9, 14, 24, 0.92);
    border: 1px solid rgba(126, 203, 255, 0.28);
    border-radius: 0.75rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.35);
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    width: 100%;
    height: 100%;
    max-height: 100%;
  }

  .editor-tab-panel {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  .editor-tab-content {
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: rgba(126, 203, 255, 0.4) rgba(5, 9, 16, 0.35);
  }

  .editor-tab-content::-webkit-scrollbar {
    width: 0.65rem;
  }

  .editor-tab-content::-webkit-scrollbar-track {
    background: rgba(5, 9, 16, 0.35);
  }

  .editor-tab-content::-webkit-scrollbar-thumb {
    background: rgba(126, 203, 255, 0.35);
    border-radius: 999px;
    border: 2px solid rgba(5, 9, 16, 0.35);
  }

  .editor-tools-panel :global(.editor-section) {
    padding: 0.62rem 0.72rem;
  }
</style>
