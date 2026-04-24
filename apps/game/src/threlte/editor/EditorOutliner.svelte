<script lang="ts">
import type {
  OutlinerDisplayMode,
  OutlinerModeOption,
  OutlinerRow,
  OutlinerRowActionState,
} from './editorOutlinerTypes'

export let subtitle = ''
export let mode: OutlinerDisplayMode = 'view-layer'
export let modeOptions: OutlinerModeOption[] = []
export let filter = ''
export let filterPlaceholder = 'Search scene objects'
export let rows: OutlinerRow[] = []
export let dragEnabled = false
export let currentDropTargetId: string | null = null

export let onModeChange: (mode: OutlinerDisplayMode) => void = () => {}
export let onFilterChange: (value: string) => void = () => {}
export let onRowDisclosure: (row: OutlinerRow, event: MouseEvent) => void =
  () => {}
export let onRowSelect: (row: OutlinerRow, event: MouseEvent) => void = () => {}
export let onRowVisibility: (row: OutlinerRow, event: MouseEvent) => void =
  () => {}
export let onRowSelectable: (row: OutlinerRow, event: MouseEvent) => void =
  () => {}
export let onRowIsolation: (row: OutlinerRow, event: MouseEvent) => void =
  () => {}
export let onRowDragStart: (row: OutlinerRow, event: DragEvent) => void =
  () => {}
export let onRowDragEnd: () => void = () => {}
export let onRowDragEnter: (row: OutlinerRow, event: DragEvent) => void =
  () => {}
export let onRowDragOver: (row: OutlinerRow, event: DragEvent) => void =
  () => {}
export let onRowDragLeave: (row: OutlinerRow) => void = () => {}
export let onRowDrop: (row: OutlinerRow, event: DragEvent) => void = () => {}
export let isRowSelected: (row: OutlinerRow) => boolean = () => false
export let getRowActionState: (row: OutlinerRow) => OutlinerRowActionState =
  () => ({
    allVisible: false,
    allSelectable: false,
    allIsolated: false,
  })

function handleFilterInput(event: Event) {
  onFilterChange((event.currentTarget as HTMLInputElement).value)
}
</script>

<div class="outliner-panel">
  <div class="outliner-topbar">
    {#if subtitle}
      <div class="outliner-subtitle">{subtitle}</div>
    {/if}
    <div class="outliner-mode-strip">
      {#each modeOptions as option (option.id)}
        <button
          class="outliner-mode-button"
          class:active={mode === option.id}
          title={option.label}
          on:click={() => onModeChange(option.id)}
        >
          {option.shortLabel}
        </button>
      {/each}
    </div>
    <div class="outliner-search-row">
      <input class="outliner-search" value={filter} placeholder={filterPlaceholder} on:input={handleFilterInput} />
    </div>
  </div>

  <div class="outliner-browser">
    <div class="outliner-column-header">
      <div class="outliner-column-name">Name</div>
      <div class="outliner-column-actions">
        <span title="Viewport visibility">👁</span>
        <span title="Selection/editability">🖱</span>
        <span title="Isolation">◎</span>
      </div>
    </div>

    <div class="outliner-tree" role="tree">
      {#if rows.length === 0}
        <div class="outliner-empty">No scene items match the current filter.</div>
      {/if}

      {#each rows as row (row.id)}
        {@const actionState = getRowActionState(row)}
        <div
          class="outliner-row"
          class:selected={isRowSelected(row)}
          class:dimmed={row.dimmed ?? false}
          class:drop-target={dragEnabled && !!row.nodeId && currentDropTargetId === row.nodeId}
          role="treeitem"
          aria-selected={isRowSelected(row)}
          draggable={dragEnabled && !!row.nodeId && !!row.draggable}
          on:dragstart={(event) => { if (dragEnabled && row.nodeId) onRowDragStart(row, event) }}
          on:dragend={onRowDragEnd}
          on:dragenter={(event) => { if (dragEnabled && row.nodeId) onRowDragEnter(row, event) }}
          on:dragover={(event) => { if (dragEnabled && row.nodeId) onRowDragOver(row, event) }}
          on:dragleave={() => { if (dragEnabled && row.nodeId) onRowDragLeave(row) }}
          on:drop={(event) => { if (dragEnabled && row.nodeId) onRowDrop(row, event) }}
        >
          <div class="outliner-row-main" style={`padding-left:${row.depth * 0.82}rem`}>
            <button
              class="outliner-disclosure"
              class:placeholder={!row.hasChildren}
              aria-label={row.expanded ? 'Collapse entry' : 'Expand entry'}
              on:click={(event) => { if (row.hasChildren) onRowDisclosure(row, event) }}
            >
              {#if row.hasChildren}
                {row.expanded ? '▾' : '▸'}
              {/if}
            </button>
            <button class="outliner-name-button" on:click={(event) => onRowSelect(row, event)}>
              <span class="outliner-icon">{row.icon}</span>
              <span class="outliner-label">{row.label}</span>
              {#if row.value}
                <span class="outliner-value">{row.value}</span>
              {:else if row.detail}
                <span class="outliner-detail">{row.detail}</span>
              {/if}
            </button>
          </div>
          <div class="outliner-row-actions">
            {#if row.nodeId || (row.nodeIds?.length ?? 0) > 0}
              <button class:active={actionState.allVisible} title={actionState.allVisible ? 'Hide' : 'Show'} on:click={(event) => onRowVisibility(row, event)}>
                {actionState.allVisible ? '👁' : '◌'}
              </button>
              <button class:active={actionState.allSelectable} title={actionState.allSelectable ? 'Disable selection' : 'Enable selection'} on:click={(event) => onRowSelectable(row, event)}>
                {actionState.allSelectable ? '🖱' : '×'}
              </button>
              <button class:active={actionState.allIsolated} title={actionState.allIsolated ? 'Clear isolate' : 'Isolate'} on:click={(event) => onRowIsolation(row, event)}>
                ◎
              </button>
            {:else}
              <span class="outliner-empty-column">·</span>
              <span class="outliner-empty-column">·</span>
              <span class="outliner-empty-column">·</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .outliner-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  }
  .outliner-topbar {
    display: grid;
    gap: 0.3rem;
    padding: 0.45rem 0.55rem 0.42rem;
    border-bottom: 1px solid rgba(126, 203, 255, 0.12);
  }
  .outliner-subtitle {
    font-size: 0.66rem;
    color: #9bc7e4;
  }
  .outliner-mode-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.18rem;
  }
  .outliner-mode-button {
    min-width: 0;
    padding: 0.22rem 0.2rem;
    font-size: 0.62rem;
  }
  .outliner-mode-button.active {
    background: rgba(86, 148, 192, 0.24);
    border-color: rgba(126, 203, 255, 0.36);
  }
  .outliner-search-row {
    display: block;
  }
  .outliner-search {
    width: 100%;
    min-width: 0;
  }
  .outliner-browser {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1 1 auto;
    margin: 0.44rem 0.55rem 0.55rem;
    padding: 0.3rem;
    border: 1px solid rgba(126, 203, 255, 0.14);
    border-radius: 0.62rem;
    background: rgba(4, 8, 14, 0.58);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  }
  .outliner-column-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.3rem;
    align-items: center;
    margin-bottom: 0.24rem;
    padding: 0 0.18rem;
    color: #8fb7d4;
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .outliner-column-actions {
    display: grid;
    grid-template-columns: repeat(3, 1.1rem);
    gap: 0.14rem;
    justify-content: end;
    text-align: center;
  }
  .outliner-tree {
    display: grid;
    align-content: start;
    gap: 0.12rem;
    min-height: 0;
    flex: 1 1 auto;
    overflow: auto;
    padding: 0.16rem;
    border: 1px solid rgba(126, 203, 255, 0.1);
    border-radius: 0.48rem;
    background: rgba(3, 6, 11, 0.76);
    scrollbar-width: thin;
    scrollbar-color: rgba(126, 203, 255, 0.35) rgba(5, 9, 16, 0.28);
  }
  .outliner-tree::-webkit-scrollbar {
    width: 0.5rem;
  }
  .outliner-tree::-webkit-scrollbar-thumb {
    background: rgba(126, 203, 255, 0.32);
    border-radius: 999px;
  }
  .outliner-tree::-webkit-scrollbar-track {
    background: rgba(5, 9, 16, 0.24);
  }
  .outliner-empty {
    padding: 0.4rem;
    color: #9bc7e4;
    font-size: 0.68rem;
  }
  .outliner-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.18rem;
    align-items: center;
    border-radius: 0.4rem;
  }
  .outliner-row.selected {
    background: rgba(86, 148, 192, 0.16);
  }
  .outliner-row.dimmed {
    opacity: 0.45;
  }
  .outliner-row.drop-target {
    outline: 1px solid rgba(126, 203, 255, 0.7);
    background: rgba(86, 148, 192, 0.2);
  }
  .outliner-row-main {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 0.05rem;
  }
  .outliner-disclosure {
    width: 0.85rem;
    min-width: 0.85rem;
    padding: 0.1rem 0.04rem;
    border: none;
    background: transparent;
    color: #a7d3ef;
    box-shadow: none;
    font-size: 0.7rem;
  }
  .outliner-disclosure.placeholder {
    opacity: 0.16;
    pointer-events: none;
  }
  .outliner-name-button {
    display: flex;
    align-items: center;
    gap: 0.24rem;
    min-width: 0;
    width: 100%;
    padding: 0.16rem 0.28rem;
    text-align: left;
  }
  .outliner-icon {
    width: 0.8rem;
    min-width: 0.8rem;
    text-align: center;
    color: #9fd4f4;
    font-size: 0.68rem;
  }
  .outliner-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.72rem;
  }
  .outliner-detail,
  .outliner-value {
    margin-left: auto;
    max-width: 6rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.62rem;
    color: #8fb7d4;
  }
  .outliner-row-actions {
    display: grid;
    grid-template-columns: repeat(3, 1.1rem);
    gap: 0.14rem;
    justify-content: end;
  }
  .outliner-row-actions button {
    min-width: 1.1rem;
    width: 1.1rem;
    padding: 0.14rem 0.06rem;
    justify-content: center;
    font-size: 0.62rem;
  }
  .outliner-empty-column {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.1rem;
    color: rgba(143, 183, 212, 0.38);
    font-size: 0.62rem;
  }
</style>
