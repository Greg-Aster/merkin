<script lang="ts">
import EditorOutliner from './EditorOutliner.svelte'
import { isOutlinerRowSelected } from './editorOutliner'
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
export let selectedNodeIds: string[] = []
export let hasGroupSelection = false

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
export let onGroupSelection: () => void = () => {}
export let onUngroupSelection: () => void = () => {}
export let getRowActionState: (row: OutlinerRow) => OutlinerRowActionState =
  () => ({
    allVisible: false,
    allSelectable: false,
    allIsolated: false,
  })
</script>

<div class="editor-side-panel editor-outliner-panel">
  <EditorOutliner
    {subtitle}
    {mode}
    {modeOptions}
    {filter}
    {filterPlaceholder}
    {rows}
    {dragEnabled}
    {currentDropTargetId}
    {onModeChange}
    {onFilterChange}
    {onRowDisclosure}
    {onRowSelect}
    {onRowVisibility}
    {onRowSelectable}
    {onRowIsolation}
    {onRowDragStart}
    {onRowDragEnd}
    {onRowDragEnter}
    {onRowDragOver}
    {onRowDragLeave}
    {onRowDrop}
    {onGroupSelection}
    {onUngroupSelection}
    {hasGroupSelection}
    selectedNodeCount={selectedNodeIds.length}
    isRowSelected={(row) => isOutlinerRowSelected(row, selectedNodeIds)}
    {getRowActionState}
  />
</div>

<style>
  .editor-side-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: rgba(9, 14, 24, 0.92);
    border: 1px solid rgba(126, 203, 255, 0.28);
    border-radius: 0.75rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.35);
  }

  .editor-outliner-panel {
    height: 100%;
  }
</style>
