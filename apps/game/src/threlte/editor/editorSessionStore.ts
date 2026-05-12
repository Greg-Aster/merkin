import { writable } from 'svelte/store'
import type {
  EditorCircleSelectState,
  EditorInteractionMode,
  EditorMarqueeState,
  EditorSpace,
  EditorState,
  EditorTerrainBrushMode,
  EditorTransformAxis,
  EditorTransformMode,
  EditorViewportLightingMode,
  EditorViewportShadingMode,
} from './editorTypes'

const DEFAULT_EDITOR_STATE: EditorState = {
  enabled: false,
  panelOpen: true,
  propertiesShelfOpen: true,
  outlinerOpen: true,
  controlsOverlayOpen: true,
  currentLevelId: null,
  selectedNodeId: null,
  selectedNodeIds: [],
  isolatedNodeIds: [],
  selectionAnchorId: null,
  interactionMode: 'objects',
  viewportLightingMode: 'authored',
  viewportShadingMode: 'rendered',
  transformMode: 'translate',
  transformSpace: 'world',
  transformAxis: 'all',
  modalTransformActive: false,
  collisionOverlayEnabled: false,
  terrainBrushMode: 'raise',
  terrainBrushSize: 12,
  terrainBrushStrength: 0.45,
  terrainBrushFalloff: 0.65,
  orbitEnabled: true,
  snappingEnabled: false,
  translateSnap: 0.5,
  rotateSnap: 15,
  scaleSnap: 0.1,
  surfaceSnapEnabled: false,
  surfaceSnapOffset: 0,
  dirty: false,
  lastSavedAt: null,
}

const DEFAULT_MARQUEE_STATE: EditorMarqueeState = {
  active: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
}

const DEFAULT_CIRCLE_SELECT_STATE: EditorCircleSelectState = {
  active: false,
  x: 0,
  y: 0,
  radius: 48,
  selecting: false,
  subtracting: false,
}

export const editorStateStore = writable<EditorState>(DEFAULT_EDITOR_STATE)
export const editorMarqueeStore = writable<EditorMarqueeState>(
  DEFAULT_MARQUEE_STATE,
)
export const editorCircleSelectStore = writable<EditorCircleSelectState>(
  DEFAULT_CIRCLE_SELECT_STATE,
)
export const editorViewportFocusStore = writable<{
  requestId: number
  position: [number, number, number]
  distance?: number
} | null>(null)

let editorViewportFocusRequestId = 0

export function initializeEditor(enabled: boolean) {
  editorStateStore.update(state => ({
    ...state,
    enabled,
    panelOpen: enabled ? state.panelOpen : false,
  }))
}

export function requestEditorViewportFocus(
  position: [number, number, number],
  distance = 18,
) {
  editorViewportFocusRequestId += 1
  editorViewportFocusStore.set({
    requestId: editorViewportFocusRequestId,
    position: [position[0], position[1], position[2]],
    distance,
  })
}

export function setEditorLevel(levelId: string) {
  editorStateStore.update(state => ({
    ...state,
    currentLevelId: levelId,
    selectedNodeId: null,
    selectedNodeIds: [],
    isolatedNodeIds: [],
    selectionAnchorId: null,
    interactionMode: 'objects',
    transformAxis: 'all',
    modalTransformActive: false,
    dirty: false,
  }))
}

export function markEditorDirty() {
  editorStateStore.update(state => ({ ...state, dirty: true }))
}

export function clearSelection() {
  editorStateStore.update(state => ({
    ...state,
    selectedNodeId: null,
    selectedNodeIds: [],
    selectionAnchorId: null,
  }))
}

export function setIsolatedNodes(nodeIds: string[]) {
  editorStateStore.update(state => ({
    ...state,
    isolatedNodeIds: Array.from(new Set(nodeIds)),
  }))
}

export function clearIsolatedNodes() {
  editorStateStore.update(state => ({
    ...state,
    isolatedNodeIds: [],
  }))
}

export function toggleIsolatedNode(nodeId: string) {
  editorStateStore.update(state => {
    const isolated = new Set(state.isolatedNodeIds)
    if (isolated.has(nodeId)) {
      isolated.delete(nodeId)
    } else {
      isolated.add(nodeId)
    }

    return {
      ...state,
      isolatedNodeIds: Array.from(isolated),
    }
  })
}

export function setSelectedNodes(
  nodeIds: string[],
  anchorId: string | null = nodeIds[0] ?? null,
) {
  editorStateStore.update(state => ({
    ...state,
    selectedNodeId: nodeIds[0] ?? null,
    selectedNodeIds: [...nodeIds],
    selectionAnchorId: anchorId,
  }))
}

export function selectEditorNode(
  nodeId: string | null,
  options?: { additive?: boolean; toggle?: boolean; rangeOrder?: string[] },
) {
  editorStateStore.update(state => {
    if (!nodeId) {
      return {
        ...state,
        selectedNodeId: null,
        selectedNodeIds: [],
        selectionAnchorId: null,
      }
    }

    if (options?.rangeOrder && state.selectionAnchorId && options.additive) {
      const order = options.rangeOrder
      const anchorIndex = order.indexOf(state.selectionAnchorId)
      const targetIndex = order.indexOf(nodeId)
      if (anchorIndex !== -1 && targetIndex !== -1) {
        const [start, end] =
          anchorIndex < targetIndex
            ? [anchorIndex, targetIndex]
            : [targetIndex, anchorIndex]
        const ids = Array.from(
          new Set([...state.selectedNodeIds, ...order.slice(start, end + 1)]),
        )
        return {
          ...state,
          selectedNodeId: nodeId,
          selectedNodeIds: ids,
        }
      }
    }

    if (options?.toggle) {
      const exists = state.selectedNodeIds.includes(nodeId)
      const nextIds = exists
        ? state.selectedNodeIds.filter(id => id !== nodeId)
        : [...state.selectedNodeIds, nodeId]
      return {
        ...state,
        selectedNodeId: nextIds[nextIds.length - 1] ?? null,
        selectedNodeIds: nextIds,
        selectionAnchorId: exists ? state.selectionAnchorId : nodeId,
      }
    }

    if (options?.additive) {
      return {
        ...state,
        selectedNodeId: nodeId,
        selectedNodeIds: Array.from(
          new Set([...state.selectedNodeIds, nodeId]),
        ),
        selectionAnchorId: state.selectionAnchorId ?? nodeId,
      }
    }

    return {
      ...state,
      selectedNodeId: nodeId,
      selectedNodeIds: [nodeId],
      selectionAnchorId: nodeId,
    }
  })
}

export function setTransformMode(mode: EditorTransformMode) {
  editorStateStore.update(state => ({ ...state, transformMode: mode }))
}

export function setEditorInteractionMode(mode: EditorInteractionMode) {
  editorStateStore.update(state => ({
    ...state,
    interactionMode: mode,
    modalTransformActive: false,
  }))
}

export function setEditorViewportLightingMode(
  mode: EditorViewportLightingMode,
) {
  editorStateStore.update(state => ({ ...state, viewportLightingMode: mode }))
}

export function setEditorViewportShadingMode(mode: EditorViewportShadingMode) {
  editorStateStore.update(state => ({ ...state, viewportShadingMode: mode }))
}

export function setTransformSpace(space: EditorSpace) {
  editorStateStore.update(state => ({ ...state, transformSpace: space }))
}

export function setTransformAxis(axis: EditorTransformAxis) {
  editorStateStore.update(state => ({ ...state, transformAxis: axis }))
}

export function setModalTransformActive(active: boolean) {
  editorStateStore.update(state => ({ ...state, modalTransformActive: active }))
}

export function setCollisionOverlayEnabled(enabled: boolean) {
  editorStateStore.update(state => ({
    ...state,
    collisionOverlayEnabled: enabled,
  }))
}

export function setTerrainBrushMode(mode: EditorTerrainBrushMode) {
  editorStateStore.update(state => ({ ...state, terrainBrushMode: mode }))
}

export function setTerrainBrushSize(size: number) {
  editorStateStore.update(state => ({
    ...state,
    terrainBrushSize: Math.max(1, size),
  }))
}

export function setTerrainBrushStrength(strength: number) {
  editorStateStore.update(state => ({
    ...state,
    terrainBrushStrength: Math.max(0.01, strength),
  }))
}

export function setTerrainBrushFalloff(falloff: number) {
  editorStateStore.update(state => ({
    ...state,
    terrainBrushFalloff: Math.min(Math.max(0, falloff), 1),
  }))
}

export function setOrbitEnabled(enabled: boolean) {
  editorStateStore.update(state => ({ ...state, orbitEnabled: enabled }))
}

export function togglePanelOpen() {
  editorStateStore.update(state => ({ ...state, panelOpen: !state.panelOpen }))
}

export function setPanelOpen(open: boolean) {
  editorStateStore.update(state => ({ ...state, panelOpen: open }))
}

export function togglePropertiesShelfOpen() {
  editorStateStore.update(state => ({
    ...state,
    propertiesShelfOpen: !state.propertiesShelfOpen,
  }))
}

export function setPropertiesShelfOpen(open: boolean) {
  editorStateStore.update(state => ({ ...state, propertiesShelfOpen: open }))
}

export function setOutlinerOpen(open: boolean) {
  editorStateStore.update(state => ({ ...state, outlinerOpen: open }))
}

export function setControlsOverlayOpen(open: boolean) {
  editorStateStore.update(state => ({ ...state, controlsOverlayOpen: open }))
}

export function setSnappingEnabled(enabled: boolean) {
  editorStateStore.update(state => ({ ...state, snappingEnabled: enabled }))
}

export function setTranslateSnap(value: number) {
  editorStateStore.update(state => ({
    ...state,
    translateSnap: Number.isFinite(value)
      ? Math.max(0.01, value)
      : state.translateSnap,
  }))
}

export function setRotateSnap(value: number) {
  editorStateStore.update(state => ({
    ...state,
    rotateSnap: Number.isFinite(value)
      ? Math.max(0.1, value)
      : state.rotateSnap,
  }))
}

export function setScaleSnap(value: number) {
  editorStateStore.update(state => ({
    ...state,
    scaleSnap: Number.isFinite(value) ? Math.max(0.01, value) : state.scaleSnap,
  }))
}

export function setSurfaceSnapEnabled(enabled: boolean) {
  editorStateStore.update(state => ({ ...state, surfaceSnapEnabled: enabled }))
}

export function setSurfaceSnapOffset(offset: number) {
  editorStateStore.update(state => ({ ...state, surfaceSnapOffset: offset }))
}

export function beginMarqueeSelection(startX: number, startY: number) {
  editorMarqueeStore.set({
    active: true,
    startX,
    startY,
    currentX: startX,
    currentY: startY,
  })
}

export function updateMarqueeSelection(currentX: number, currentY: number) {
  editorMarqueeStore.update(state => ({
    ...state,
    currentX,
    currentY,
  }))
}

export function endMarqueeSelection() {
  editorMarqueeStore.set(DEFAULT_MARQUEE_STATE)
}

export function activateCircleSelect(x = 0, y = 0) {
  editorCircleSelectStore.update(state => ({
    ...state,
    active: true,
    x,
    y,
    selecting: false,
    subtracting: false,
  }))
}

export function deactivateCircleSelect() {
  editorCircleSelectStore.update(state => ({
    ...state,
    active: false,
    selecting: false,
    subtracting: false,
  }))
}

export function updateCircleSelectPointer(x: number, y: number) {
  editorCircleSelectStore.update(state => ({
    ...state,
    x,
    y,
  }))
}

export function setCircleSelectRadius(radius: number) {
  editorCircleSelectStore.update(state => ({
    ...state,
    radius: Number.isFinite(radius)
      ? Math.min(Math.max(radius, 12), 240)
      : state.radius,
  }))
}

export function setCircleSelectSelecting(
  selecting: boolean,
  subtracting = false,
) {
  editorCircleSelectStore.update(state => ({
    ...state,
    selecting,
    subtracting: selecting ? subtracting : false,
  }))
}
