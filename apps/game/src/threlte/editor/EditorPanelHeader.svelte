<script lang="ts">
import type { EditorCommand } from './editorCommandRegistry'
import { getEditorCommand } from './editorCommandRegistry'
import type { EditorLayoutPreset } from './editorStore'

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
export let layoutPreset: EditorLayoutPreset = 'default'
export let layoutPresetOptions: Array<{
  id: EditorLayoutPreset
  label: string
}> = []
export let responsiveSplitPinned = false
export let canUndo = false
export let canRedo = false
export let selectedNodeCount = 0
export let currentLevelId = ''
export let levelOptions: LevelMenuOption[] = []
export let publishLevelPending = false
export let commands: EditorCommand[] = []
export let onRunCommand: (commandId: string) => void = () => {}
export let onOpenCommandPalette: () => void = () => {}
export let onSaveLevel: CommandHandler = () => {}
export let onSaveAsLevel: CommandHandler = () => {}
export let onNewLevel: CommandHandler = () => {}
export let onLoadLevel: (levelId: string) => void | Promise<void> = () => {}
export let onPublishLevel: CommandHandler = () => {}
export let onMarkDraft: CommandHandler = () => {}
export let onReloadDisk: CommandHandler = () => {}
export let onCopySceneJson: CommandHandler = () => {}
export let onExportLevel: CommandHandler = () => {}
export let onImportLevel: CommandHandler = () => {}
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
export let onApplyLayoutPreset: (preset: EditorLayoutPreset) => void = () => {}
export let onResetLayoutPreset: () => void = () => {}
export let onSetResponsiveSplitPinned: (pinned: boolean) => void = () => {}
export let onResetDockLayout: CommandHandler = () => {}
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

function runRegisteredCommand(commandId: string, fallback: CommandHandler) {
  const command = getEditorCommand(commands, commandId)
  closeMenus()
  if (command?.enabled) {
    onRunCommand(command.id)
    return
  }
  void fallback()
}

function commandDisabled(commandId: string, fallbackDisabled = false) {
  const command = getEditorCommand(commands, commandId)
  return command ? !command.enabled : fallbackDisabled
}

function runCheckedCommand(event: Event, action: (checked: boolean) => void) {
  action((event.currentTarget as HTMLInputElement).checked)
  closeMenus()
}

function runLayoutPresetCommand(preset: EditorLayoutPreset) {
  closeMenus()
  const command = getEditorCommand(commands, `layout-${preset}`)
  if (command?.enabled) {
    onRunCommand(command.id)
    return
  }
  onApplyLayoutPreset(preset)
}

function runLayoutResetCommand() {
  closeMenus()
  const command = getEditorCommand(commands, 'layout-reset')
  if (command?.enabled) {
    onRunCommand(command.id)
    return
  }
  onResetLayoutPreset()
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
          <button class="menu-item" disabled={commandDisabled('save-level')} on:click={() => runRegisteredCommand('save-level', onSaveLevel)}>
            <span class="menu-label">Save</span>
            <span class="menu-shortcut">Ctrl+S</span>
          </button>
          <button class="menu-item" disabled={commandDisabled('save-as-level')} on:click={() => runRegisteredCommand('save-as-level', onSaveAsLevel)}>Save As...</button>
          <button class="menu-item" disabled={commandDisabled('new-level')} on:click={() => runRegisteredCommand('new-level', onNewLevel)}>New Level...</button>
          <button class="menu-item" disabled={commandDisabled('copy-scene-json')} on:click={() => runRegisteredCommand('copy-scene-json', onCopySceneJson)}>Copy Scene JSON</button>
          <button class="menu-item" disabled={commandDisabled('export-level')} on:click={() => runRegisteredCommand('export-level', onExportLevel)}>Export Level...</button>
          <button class="menu-item" disabled={commandDisabled('import-level')} on:click={() => runRegisteredCommand('import-level', onImportLevel)}>Import Level...</button>
          <div class="menu-separator"></div>
          <button class="menu-item" disabled={commandDisabled('publish-level', publishLevelPending)} on:click={() => runRegisteredCommand('publish-level', onPublishLevel)}>
            {publishLevelPending ? 'Publishing Level...' : 'Publish Level...'}
          </button>
          <button class="menu-item" disabled={commandDisabled('mark-level-draft')} on:click={() => runRegisteredCommand('mark-level-draft', onMarkDraft)}>Mark As Draft</button>
          <button class="menu-item" disabled={commandDisabled('reload-current-level')} on:click={() => runRegisteredCommand('reload-current-level', onReloadDisk)}>Reload Current Level</button>
          <button class="menu-item" disabled={commandDisabled('open-save-tools')} on:click={() => runRegisteredCommand('open-save-tools', onOpenSaveTools)}>Level File Tools</button>
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
          <button class="menu-item" disabled={commandDisabled('undo', !canUndo)} on:click={() => runRegisteredCommand('undo', onUndo)}>
            <span class="menu-label">Undo</span>
            <span class="menu-shortcut">Ctrl+Z</span>
          </button>
          <button class="menu-item" disabled={commandDisabled('redo', !canRedo)} on:click={() => runRegisteredCommand('redo', onRedo)}>
            <span class="menu-label">Redo</span>
            <span class="menu-shortcut">Ctrl+Shift+Z</span>
          </button>
          <div class="menu-separator"></div>
          <button class="menu-item" disabled={commandDisabled('select-all')} on:click={() => runRegisteredCommand('select-all', onSelectAll)}>
            <span class="menu-label">Select All</span>
            <span class="menu-shortcut">Ctrl+A</span>
          </button>
          <button class="menu-item" disabled={commandDisabled('clear-selection', selectedNodeCount === 0)} on:click={() => runRegisteredCommand('clear-selection', onClearSelection)}>
            <span class="menu-label">Clear Selection</span>
            <span class="menu-shortcut">Esc</span>
          </button>
          <button class="menu-item" disabled={commandDisabled('duplicate-selection', selectedNodeCount === 0)} on:click={() => runRegisteredCommand('duplicate-selection', onDuplicateSelection)}>
            <span class="menu-label">Duplicate Selection</span>
            <span class="menu-shortcut">Ctrl+D</span>
          </button>
          <button class="menu-item danger" disabled={commandDisabled('delete-selection', selectedNodeCount === 0)} on:click={() => runRegisteredCommand('delete-selection', onDeleteSelection)}>
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
          <div class="menu-heading">Layout Presets</div>
          {#each layoutPresetOptions as option (option.id)}
            <button
              class="menu-item"
              class:active-item={option.id === layoutPreset}
              on:click={() => runLayoutPresetCommand(option.id)}
            >
              <span class="menu-label">{option.label}</span>
              <span class="menu-shortcut">{option.id === layoutPreset ? 'active' : ''}</span>
            </button>
          {/each}
          <button class="menu-item" on:click={runLayoutResetCommand}>Reset Layout Preset</button>
          <div class="menu-separator"></div>
          <label class="menu-check">
            <input type="checkbox" checked={panelOpen} on:change={(event) => runCheckedCommand(event, onSetPanelOpen)} />
            Tool Panel
          </label>
          <label class="menu-check">
            <input type="checkbox" checked={outlinerOpen} on:change={(event) => runCheckedCommand(event, onSetOutlinerOpen)} />
            Outliner
          </label>
          <label class="menu-check">
            <input type="checkbox" checked={propertiesShelfOpen} on:change={(event) => runCheckedCommand(event, onSetPropertiesShelfOpen)} />
            Properties Shelf
          </label>
          <label class="menu-check">
            <input type="checkbox" checked={controlsOverlayOpen} on:change={(event) => runCheckedCommand(event, onSetControlsOverlayOpen)} />
            Controls HUD
          </label>
          <label class="menu-check">
            <input type="checkbox" checked={responsiveSplitPinned} on:change={(event) => runCheckedCommand(event, onSetResponsiveSplitPinned)} />
            Pin Split Layout
          </label>
          <div class="menu-separator"></div>
          <button class="menu-item" disabled={commandDisabled('reset-dock-layout')} on:click={() => runRegisteredCommand('reset-dock-layout', onResetDockLayout)}>
            Reset Dock Layout
          </button>
        </div>
      {/if}
    </div>
  </nav>

  <div class="editor-header-actions">
    <label class="layout-picker">
      <span>Layout</span>
      <select
        value={layoutPreset}
        aria-label="Editor layout preset"
        on:change={(event) => runLayoutPresetCommand((event.currentTarget as HTMLSelectElement).value as EditorLayoutPreset)}
      >
        {#each layoutPresetOptions as option (option.id)}
          <option value={option.id}>{option.label}</option>
        {/each}
      </select>
    </label>
    <button class="collapse-btn command-btn" on:click={onOpenCommandPalette}>
      Commands
      <span class="menu-shortcut">Ctrl+K</span>
    </button>
    <label class="header-check">
      <input
        type="checkbox"
        checked={propertiesShelfOpen}
        disabled={commandDisabled('toggle-details-shelf', !panelOpen)}
        on:change={() => runRegisteredCommand('toggle-details-shelf', onTogglePropertiesShelf)}
      />
      Details
    </label>
    <label class="header-check">
      <input
        type="checkbox"
        checked={panelOpen}
        on:change={() => runRegisteredCommand('toggle-tool-panel', onTogglePanel)}
      />
      Tools
    </label>
  </div>
</div>

<style>
  .editor-header {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 0.5rem;
    padding: 0;
    min-width: 0;
    width: max-content;
    max-width: 100%;
    position: relative;
    z-index: 180;
    overflow: visible;
    background: transparent;
    border: none;
    border-radius: 0;
    backdrop-filter: none;
    box-shadow: none;
    pointer-events: auto;
  }

  .editor-menu-bar,
  .editor-header-actions {
    background: rgba(9, 14, 24, 0.92);
    border: 1px solid rgba(126, 203, 255, 0.24);
    border-radius: 0.55rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3);
  }

  .editor-menu-bar {
    display: flex;
    align-items: center;
    gap: 0.08rem;
    padding: 0.2rem;
    min-width: 0;
    position: relative;
    z-index: 2;
    overflow: visible;
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
    min-width: 2.75rem;
    padding: 0.34rem 0.46rem;
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
    z-index: 40;
    display: grid;
    min-width: 12.5rem;
    padding: 0.35rem;
    border: 1px solid rgba(126, 203, 255, 0.28);
    border-radius: 0.55rem;
    background: rgba(6, 10, 18, 0.98);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.42);
    pointer-events: auto;
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
    padding: 0.22rem;
    min-width: 0;
  }

  .layout-picker {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 1.8rem;
    padding: 0 0.38rem;
    color: rgba(232, 245, 255, 0.72);
    font-size: 0.72rem;
    white-space: nowrap;
  }

  .layout-picker select {
    max-width: 9.5rem;
    border: 1px solid rgba(126, 203, 255, 0.16);
    border-radius: 0.38rem;
    background: rgba(7, 12, 18, 0.88);
    color: #ecf7ff;
    padding: 0.26rem 0.32rem;
    font-size: 0.74rem;
  }

  .header-check {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    min-height: 1.8rem;
    padding: 0 0.36rem;
    color: rgba(232, 245, 255, 0.78);
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .header-check input {
    width: 0.85rem;
    height: 0.85rem;
    accent-color: #7ecbff;
  }

  @media (max-width: 1280px) {
    .editor-header {
      gap: 0.35rem;
    }

    .header-check {
      padding-inline: 0.28rem;
    }
  }

  @media (max-width: 900px) {
    .editor-header {
      flex-wrap: nowrap;
      justify-content: flex-end;
    }

    .editor-menu-bar {
      overflow: visible;
    }

    .editor-header-actions {
      padding: 0.28rem;
      overflow-x: auto;
    }

  }
</style>
