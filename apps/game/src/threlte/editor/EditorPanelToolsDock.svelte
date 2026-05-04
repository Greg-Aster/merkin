<script lang="ts">
import EditorPanelTabRail from './EditorPanelTabRail.svelte'
import type { EditorPanelTab, EditorPanelTabItem } from './editorPanelTabs'

export let tabs: EditorPanelTabItem[] = []
export let activeTab: EditorPanelTab = 'workflow'
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
    position: fixed;
    top: calc(4.15rem + min(25vh, 14rem) + 0.7rem);
    right: 1rem;
    display: grid;
    grid-template-columns: 4.25rem minmax(0, 1fr);
    width: 23rem;
    min-width: 23rem;
    height: calc(100vh - (4.15rem + min(25vh, 14rem) + 1.7rem));
    max-height: calc(100vh - (4.15rem + min(25vh, 14rem) + 1.7rem));
    z-index: 78;
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

  @media (max-width: 1280px) {
    .editor-tools-panel {
      position: static;
      width: auto;
      min-width: 0;
      height: auto;
      max-height: none;
    }
  }

  @media (max-width: 900px) {
    .editor-tools-panel {
      grid-template-columns: 3.7rem minmax(0, 1fr);
    }
  }
</style>
