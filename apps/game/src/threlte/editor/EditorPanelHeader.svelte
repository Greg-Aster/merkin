<script lang="ts">
import type { EditorViewportShadingMode } from './editorStore'

type MenuId = 'file' | 'edit' | 'window'
type CommandHandler = () => void | Promise<void>
type LevelMenuOption = {
  id: string
  label: string
  status: string
  deployed: boolean
}

export let panelOpen = false
export let propertiesShelfOpen = false
export let outlinerOpen = true
export let controlsOverlayOpen = true
export let viewportShadingMode: EditorViewportShadingMode = 'rendered'
export let canUndo = false
export let canRedo = false
export let selectedNodeCount = 0
export let currentLevelId = ''
export let levelOptions: LevelMenuOption[] = []
export let publishLevelPending = false
export let onSetViewportShadingMode: (mode: EditorViewportShadingMode) => void =
  () => {}
export let onSaveLevel: CommandHandler = () => {}
export let onSaveAsLevel: CommandHandler = () => {}
export let onNewLevel: CommandHandler = () => {}
export let onLoadLevel: (levelId: string) => void | Promise<void> = () => {}
export let onPublishLevel: CommandHandler = () => {}
export let onMarkDraft: CommandHandler = () => {}
export let onReloadDisk: CommandHandler = () => {}
export let onCopySceneJson: CommandHandler = () => {}
export let onOpenSaveTools: CommandHandler = () => {}
export let onUndo: CommandHandler = () => {}
export let onRedo: CommandHandler = () => {}
export let onSelectAll: CommandHandler = () => {}
export let onClearSelection: CommandHandler = () => {}
export let onDuplicateSelection: CommandHandler = () => {}
export let onDeleteSelection: CommandHandler = () => {}
export let onSetPanelOpen: (open: boolean) => void = () => {}
export let onSetPropertiesShelfOpen: (open: boolean) => void = () => {}
export let onSetOutlinerOpen: (open: boolean) => void = () => {}
export let onSetControlsOverlayOpen: (open: boolean) => void = () => {}
export let onTogglePropertiesShelf: () => void = () => {}
export let onTogglePanel: () => void = () => {}

let openMenu: MenuId | null = null

function toggleMenu(menu: MenuId) {
  openMenu = openMenu === menu ? null : menu
}

function closeMenus() {
  openMenu = null
}

function runCommand(action: CommandHandler) {
  closeMenus()
  void action()
}

function handleMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMenus()
}
</script>

<svelte:window on:click={closeMenus} on:keydown={handleMenuKeydown} />

<div class="editor-header">
  <nav class="editor-menu-bar" aria-label="Editor menu">
    <div class="menu-root">
      <button
        class="menu-trigger"
        class:active={openMenu === 'file'}
        on:click|stopPropagation={() => toggleMenu('file')}
      >
        File
      </button>
      {#if openMenu === 'file'}
        <div class="menu-popover">
          <button class="menu-item" on:click={() => runCommand(onSaveLevel)}>
            <span class="menu-label">Save</span>
            <span class="menu-shortcut">Ctrl+S</span>
          </button>
          <button class="menu-item" on:click={() => runCommand(onSaveAsLevel)}>Save As...</button>
          <button class="menu-item" on:click={() => runCommand(onNewLevel)}>New Level...</button>
          <button class="menu-item" on:click={() => runCommand(onCopySceneJson)}>Copy Scene JSON</button>
          <div class="menu-separator"></div>
          <button class="menu-item" disabled={publishLevelPending} on:click={() => runCommand(onPublishLevel)}>
            {publishLevelPending ? 'Publishing Level...' : 'Publish Level...'}
          </button>
          <button class="menu-item" on:click={() => runCommand(onMarkDraft)}>Mark As Draft</button>
          <button class="menu-item" on:click={() => runCommand(onReloadDisk)}>Reload Current Level</button>
          <button class="menu-item" on:click={() => runCommand(onOpenSaveTools)}>Level File Tools</button>
          <div class="menu-separator"></div>
          <div class="menu-heading">Load Level</div>
          {#each levelOptions as option (option.id)}
            <button
              class="menu-item"
              class:active-item={option.id === currentLevelId}
              on:click={() => runCommand(() => onLoadLevel(option.id))}
            >
              <span class="menu-label">{option.label}</span>
              <span class="menu-shortcut">{option.status === 'active' && option.deployed ? 'published' : option.status}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="menu-root">
      <button
        class="menu-trigger"
        class:active={openMenu === 'edit'}
        on:click|stopPropagation={() => toggleMenu('edit')}
      >
        Edit
      </button>
      {#if openMenu === 'edit'}
        <div class="menu-popover">
          <button class="menu-item" disabled={!canUndo} on:click={() => runCommand(onUndo)}>
            <span class="menu-label">Undo</span>
            <span class="menu-shortcut">Ctrl+Z</span>
          </button>
          <button class="menu-item" disabled={!canRedo} on:click={() => runCommand(onRedo)}>
            <span class="menu-label">Redo</span>
            <span class="menu-shortcut">Ctrl+Shift+Z</span>
          </button>
          <div class="menu-separator"></div>
          <button class="menu-item" on:click={() => runCommand(onSelectAll)}>
            <span class="menu-label">Select All</span>
            <span class="menu-shortcut">Ctrl+A</span>
          </button>
          <button class="menu-item" disabled={selectedNodeCount === 0} on:click={() => runCommand(onClearSelection)}>
            <span class="menu-label">Clear Selection</span>
            <span class="menu-shortcut">Esc</span>
          </button>
          <button class="menu-item" disabled={selectedNodeCount === 0} on:click={() => runCommand(onDuplicateSelection)}>
            <span class="menu-label">Duplicate Selection</span>
            <span class="menu-shortcut">Ctrl+D</span>
          </button>
          <button class="menu-item danger" disabled={selectedNodeCount === 0} on:click={() => runCommand(onDeleteSelection)}>
            <span class="menu-label">Delete Selection</span>
            <span class="menu-shortcut">Del</span>
          </button>
        </div>
      {/if}
    </div>

    <div class="menu-root">
      <button
        class="menu-trigger"
        class:active={openMenu === 'window'}
        on:click|stopPropagation={() => toggleMenu('window')}
      >
        Window
      </button>
      {#if openMenu === 'window'}
        <div class="menu-popover">
          <label class="menu-check">
            <input type="checkbox" checked={panelOpen} on:change={(event) => onSetPanelOpen((event.currentTarget as HTMLInputElement).checked)} />
            Tool Panel
          </label>
          <label class="menu-check">
            <input type="checkbox" checked={outlinerOpen} on:change={(event) => onSetOutlinerOpen((event.currentTarget as HTMLInputElement).checked)} />
            Outliner
          </label>
          <label class="menu-check">
            <input type="checkbox" checked={propertiesShelfOpen} on:change={(event) => onSetPropertiesShelfOpen((event.currentTarget as HTMLInputElement).checked)} />
            Properties Shelf
          </label>
          <label class="menu-check">
            <input type="checkbox" checked={controlsOverlayOpen} on:change={(event) => onSetControlsOverlayOpen((event.currentTarget as HTMLInputElement).checked)} />
            Controls HUD
          </label>
        </div>
      {/if}
    </div>
  </nav>

  <div class="editor-header-actions">
    <div class="shading-controls" aria-label="Viewport shading">
      <button
        class="shading-btn"
        class:active={viewportShadingMode === 'rendered'}
        title="Rendered view"
        on:click={() => onSetViewportShadingMode('rendered')}
      >
        Render
      </button>
      <button
        class="shading-btn"
        class:active={viewportShadingMode === 'solid'}
        title="Solid view"
        on:click={() => onSetViewportShadingMode('solid')}
      >
        Solid
      </button>
      <button
        class="shading-btn"
        class:active={viewportShadingMode === 'wireframe'}
        title="Wireframe view"
        on:click={() => onSetViewportShadingMode('wireframe')}
      >
        Wire
      </button>
    </div>
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
    position: fixed;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    padding: 0;
    margin-bottom: 0.5rem;
    width: auto;
    background: transparent;
    border: none;
    border-radius: 0;
    backdrop-filter: none;
    box-shadow: none;
  }

  .editor-menu-bar,
  .editor-header-actions {
    background: rgba(9, 14, 24, 0.92);
    border: 1px solid rgba(126, 203, 255, 0.24);
    border-radius: 0.7rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3);
  }

  .editor-menu-bar {
    display: flex;
    align-items: center;
    gap: 0.08rem;
    padding: 0.28rem;
  }

  .menu-root {
    position: relative;
  }

  .menu-trigger,
  .menu-item,
  .menu-check {
    font: inherit;
    color: rgba(232, 245, 255, 0.86);
  }

  .menu-trigger {
    min-width: 3.35rem;
    padding: 0.42rem 0.58rem;
    border: 1px solid transparent;
    border-radius: 0.42rem;
    background: transparent;
    font-size: 0.76rem;
    line-height: 1;
  }

  .menu-trigger.active,
  .menu-trigger:hover {
    border-color: rgba(126, 203, 255, 0.28);
    background: rgba(126, 203, 255, 0.12);
  }

  .menu-popover {
    position: absolute;
    top: calc(100% + 0.35rem);
    left: 0;
    z-index: 4;
    display: grid;
    min-width: 12.5rem;
    padding: 0.35rem;
    border: 1px solid rgba(126, 203, 255, 0.28);
    border-radius: 0.55rem;
    background: rgba(6, 10, 18, 0.98);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.42);
  }

  .menu-item,
  .menu-check {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 2rem;
    padding: 0.42rem 0.55rem;
    border: 0;
    border-radius: 0.38rem;
    background: transparent;
    font-size: 0.76rem;
    text-align: left;
  }

  .menu-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .menu-shortcut {
    flex: 0 0 auto;
    color: rgba(232, 245, 255, 0.48);
    font-size: 0.68rem;
  }

  .menu-heading {
    padding: 0.35rem 0.6rem 0.18rem;
    color: rgba(155, 199, 228, 0.78);
    font-size: 0.62rem;
    text-transform: uppercase;
  }

  .menu-item.active-item {
    background: rgba(126, 203, 255, 0.16);
  }

  .menu-item:not(:disabled):hover,
  .menu-check:hover {
    background: rgba(126, 203, 255, 0.12);
  }

  .menu-item:disabled {
    color: rgba(232, 245, 255, 0.36);
  }

  .menu-item.danger:not(:disabled) {
    color: #ffb3b3;
  }

  .menu-check input {
    width: 0.85rem;
    height: 0.85rem;
    accent-color: #7ecbff;
  }

  .menu-separator {
    height: 1px;
    margin: 0.28rem 0;
    background: rgba(126, 203, 255, 0.16);
  }

  .editor-header-actions {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem;
  }

  .shading-controls {
    display: flex;
    gap: 0.18rem;
    padding-right: 0.35rem;
    margin-right: 0.15rem;
    border-right: 1px solid rgba(126, 203, 255, 0.18);
  }

  .shading-btn {
    min-width: 3rem;
    padding: 0.42rem 0.55rem;
    border: 1px solid rgba(126, 203, 255, 0.18);
    border-radius: 0.42rem;
    color: rgba(232, 245, 255, 0.78);
    background: rgba(126, 203, 255, 0.08);
    font-size: 0.72rem;
    line-height: 1;
  }

  .shading-btn.active {
    color: #07101c;
    border-color: rgba(126, 203, 255, 0.72);
    background: #7ecbff;
  }

  @media (max-width: 1280px) {
    .editor-header {
      width: auto;
    }
  }

  @media (max-width: 900px) {
    .editor-header {
      top: 0.5rem;
      left: 0.5rem;
      right: 0.5rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .editor-menu-bar {
      order: 2;
      max-width: 100%;
      overflow-x: auto;
    }

    .editor-header-actions {
      padding: 0.28rem;
    }

    .shading-btn {
      min-width: 2.65rem;
      padding-inline: 0.4rem;
    }
  }
</style>
