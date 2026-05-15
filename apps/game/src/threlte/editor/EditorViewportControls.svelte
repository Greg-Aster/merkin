<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import { tick } from 'svelte'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import {
  getEditorObject,
  getEditorObjects,
  getNodeIdForObject,
  getSelectableEditorObjects,
} from './editorRegistry'
import {
  type EditorInteractionMode,
  type EditorObjectToolMode,
  type EditorSpace,
  type EditorTransformAxis,
  type EditorTransformMode,
  type EditorViewportLightingMode,
  activateCircleSelect,
  beginMarqueeSelection,
  clearIsolatedNodes,
  clearSelection,
  deactivateCircleSelect,
  duplicateNodes,
  editorCircleSelectStore,
  editorNodeViewportStateStore,
  editorNodesStore,
  editorStateStore,
  editorViewportFocusStore,
  endMarqueeSelection,
  endSceneTransaction,
  groupNodes,
  patchNodeTransform,
  patchNodes,
  redoScene,
  removeNodes,
  selectAllNodes,
  selectEditorNode,
  setCircleSelectRadius,
  setCircleSelectSelecting,
  setEditorViewportLightingMode,
  setIsolatedNodes,
  setModalTransformActive,
  setOrbitEnabled,
  setSelectedNodes,
  setTransformAxis,
  setTransformMode,
  startSceneTransaction,
  togglePropertiesShelfOpen,
  undoScene,
  ungroupNodes,
  updateCircleSelectPointer,
  updateMarqueeSelection,
} from './editorStore'

const { scene, renderer, camera: activeThrelteCamera } = useThrelte()

export let enabled = false
export let useActiveCamera = false

let editorCamera: THREE.PerspectiveCamera
let camera: THREE.PerspectiveCamera
let orbitControls: OrbitControls | null = null
let transformControls: TransformControls | null = null
let transformControlsHelper: THREE.Object3D | null = null
let controlsInitialized = false
let selectedNodeId: string | null = null
let selectedNodeIds: string[] = []
let objectToolMode: EditorObjectToolMode = 'translate'
let transformMode: EditorTransformMode = 'translate'
let transformSpace: EditorSpace = 'world'
let transformAxis: EditorTransformAxis = 'all'
let interactionMode: EditorInteractionMode = 'objects'
let viewportLightingMode: EditorViewportLightingMode = 'authored'
let orbitEnabled = true
let snappingEnabled = false
let translateSnap = 0.5
let rotateSnap = 15
let scaleSnap = 0.1
let surfaceSnapEnabled = false
let surfaceSnapOffset = 0
let editorNodes = []
let nodeViewportStateById = new Map<
  string,
  {
    effectiveVisible: boolean
    isolated: boolean
    dimmed: boolean
    locked: boolean
  }
>()
const selectionPivot = new THREE.Group()
let multiSelectionActive = false
let transactionRunning = false
let marqueeSelecting = false
let boxSelectArmed = false
let marqueeStartedFromBoxTool = false
let circleSelectActive = false
let circleSelectRadius = 48
let circleSelectSelecting = false
let circleSelectSubtracting = false
let duplicateDragModifier = false
let viewportFocusRequest: {
  requestId: number
  position: [number, number, number]
  distance?: number
} | null = null
let handledViewportFocusRequestId = 0
const initialObjectMatrices = new Map<
  string,
  { worldMatrix: THREE.Matrix4; parentInverse: THREE.Matrix4 }
>()
const initialPivotMatrix = new THREE.Matrix4()
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const pointerScreen = new THREE.Vector2()
const modalPointerStart = new THREE.Vector2()
const initialPivotPosition = new THREE.Vector3()
const initialPivotQuaternion = new THREE.Quaternion()
const initialPivotScale = new THREE.Vector3(1, 1, 1)
const lastPickScreen = new THREE.Vector2(Number.NaN, Number.NaN)
let lastPickNodeIds: string[] = []

function getActiveCamera() {
  const candidate = (activeThrelteCamera as any)?.current ?? activeThrelteCamera
  return candidate instanceof THREE.PerspectiveCamera ? candidate : null
}

function shouldEnableOrbitControls() {
  return enabled && orbitEnabled && !useActiveCamera
}

type ModalTransformSession = {
  active: boolean
  mode: EditorTransformMode
  axis: EditorTransformAxis
}

let modalSession: ModalTransformSession | null = null

const unsubscribe = editorStateStore.subscribe(state => {
  selectedNodeId = state.selectedNodeId
  selectedNodeIds = state.selectedNodeIds
  interactionMode = state.interactionMode
  objectToolMode = state.objectToolMode
  viewportLightingMode = state.viewportLightingMode
  transformMode = state.transformMode
  transformSpace = state.transformSpace
  transformAxis = state.transformAxis
  orbitEnabled = state.orbitEnabled
  snappingEnabled = state.snappingEnabled
  translateSnap = state.translateSnap
  rotateSnap = state.rotateSnap
  scaleSnap = state.scaleSnap
  surfaceSnapEnabled = state.surfaceSnapEnabled
  surfaceSnapOffset = state.surfaceSnapOffset

  if (transformControls) {
    transformControls.setMode(transformMode)
    transformControls.setSpace(transformSpace)
    transformControls.showX = transformAxis === 'all' || transformAxis === 'x'
    transformControls.showY = transformAxis === 'all' || transformAxis === 'y'
    transformControls.showZ = transformAxis === 'all' || transformAxis === 'z'
    transformControls.setTranslationSnap(snappingEnabled ? translateSnap : null)
    transformControls.setRotationSnap(
      snappingEnabled ? THREE.MathUtils.degToRad(rotateSnap) : null,
    )
    transformControls.setScaleSnap(snappingEnabled ? scaleSnap : null)
  }

  if (orbitControls && !marqueeSelecting) {
    orbitControls.enabled = shouldEnableOrbitControls()
  }

  if (controlsInitialized) {
    syncSelectionAttachment()
  }
})
const unsubscribeViewportState = editorNodeViewportStateStore.subscribe(
  value => {
    nodeViewportStateById = value

    if (controlsInitialized) {
      syncSelectionAttachment()
    }
  },
)
const unsubscribeCircleSelect = editorCircleSelectStore.subscribe(state => {
  circleSelectActive = state.active
  circleSelectRadius = state.radius
  circleSelectSelecting = state.selecting
  circleSelectSubtracting = state.subtracting

  if (orbitControls && !marqueeSelecting) {
    orbitControls.enabled = shouldEnableOrbitControls() && !circleSelectActive
  }
})
const unsubscribeViewportFocus = editorViewportFocusStore.subscribe(request => {
  viewportFocusRequest = request
  handleViewportFocusRequest()
})
const unsubscribeNodes = editorNodesStore.subscribe(value => {
  editorNodes = value
})

$: camera = (useActiveCamera ? getActiveCamera() : null) ?? editorCamera

$: if (controlsInitialized && transformControls && camera) {
  transformControls.camera = camera
}

function isNodeSelectable(nodeId: string | null) {
  if (!nodeId) return false
  const viewportState = nodeViewportStateById.get(nodeId)
  if (!viewportState) return false
  return viewportState.effectiveVisible && !viewportState.locked
}

function isNodeViewportPickable(nodeId: string | null) {
  if (!isNodeSelectable(nodeId)) return false

  const node = editorNodes.find(candidate => candidate.id === nodeId)
  if (!node) return false

  const gameplayType = node.gameplay?.type
  if (gameplayType === 'fog-volume' || gameplayType === 'audio-region') {
    return false
  }

  return true
}

function getTransformableSelectedNodeIds() {
  return selectedNodeIds.filter(nodeId => isNodeSelectable(nodeId))
}

function getSelectableEditorObjectsForViewport() {
  return getSelectableEditorObjects().filter(object =>
    isNodeViewportPickable(getNodeIdForObject(object)),
  )
}

function setOrbitShiftPanMode(enabled: boolean) {
  if (!orbitControls) return
  orbitControls.mouseButtons.LEFT = enabled
    ? THREE.MOUSE.PAN
    : THREE.MOUSE.ROTATE
  orbitControls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY
  orbitControls.mouseButtons.RIGHT = THREE.MOUSE.PAN
}

function isShiftPanEvent(event: MouseEvent | PointerEvent) {
  return (
    enabled &&
    interactionMode === 'objects' &&
    event.button === 0 &&
    event.shiftKey &&
    !boxSelectArmed &&
    !circleSelectActive &&
    !modalSession &&
    !transformControls?.dragging
  )
}

function isAdditiveSelectionEvent(event: MouseEvent | PointerEvent) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.getModifierState('Meta') ||
    event.getModifierState('Control')
  )
}

function getViewportHitNodeIds() {
  const intersects = raycaster.intersectObjects(
    getSelectableEditorObjectsForViewport(),
    true,
  )
  const hitNodeIds: string[] = []
  for (const intersection of intersects) {
    const nodeId = getNodeIdForObject(intersection.object)
    if (nodeId && isNodeSelectable(nodeId) && !hitNodeIds.includes(nodeId)) {
      hitNodeIds.push(nodeId)
    }
  }
  return hitNodeIds
}

function samePickStack(nextNodeIds: string[]) {
  return (
    nextNodeIds.length === lastPickNodeIds.length &&
    nextNodeIds.every((nodeId, index) => nodeId === lastPickNodeIds[index])
  )
}

function getCycledHitNodeId(
  hitNodeIds: string[],
  event: PointerEvent,
  additive: boolean,
) {
  if (hitNodeIds.length === 0) return null
  if (additive) return hitNodeIds[0]

  const sameScreenPoint =
    Number.isFinite(lastPickScreen.x) &&
    Math.hypot(
      event.clientX - lastPickScreen.x,
      event.clientY - lastPickScreen.y,
    ) <= 8
  const canCycle = sameScreenPoint && samePickStack(hitNodeIds)
  lastPickScreen.set(event.clientX, event.clientY)
  lastPickNodeIds = hitNodeIds

  if (!canCycle || hitNodeIds.length === 1) return hitNodeIds[0]

  const currentIndex = selectedNodeId ? hitNodeIds.indexOf(selectedNodeId) : -1
  return hitNodeIds[(currentIndex + 1) % hitNodeIds.length]
}

function hideSelectedNodes() {
  const ids = getTransformableSelectedNodeIds()
  if (ids.length === 0) return
  patchNodes(ids, { visible: false })
  clearSelection()
}

function isolateSelectedNodes() {
  const ids = getTransformableSelectedNodeIds()
  if (ids.length === 0) return
  setIsolatedNodes(ids)
}

function showAllNodes() {
  const hiddenNodeIds = editorNodes
    .filter(node => !node.visible)
    .map(node => node.id)
  if (hiddenNodeIds.length > 0) {
    patchNodes(hiddenNodeIds, { visible: true })
  }
  clearIsolatedNodes()
}

function syncSelectionAttachment() {
  if (!transformControls) return
  if (objectToolMode === 'select') {
    multiSelectionActive = false
    transformControls.detach()
    return
  }

  const transformableSelectedNodeIds = getTransformableSelectedNodeIds()

  if (modalSession) {
    multiSelectionActive = true
    transformControls.attach(selectionPivot)
    return
  }

  const selectedObjects = getEditorObjects(transformableSelectedNodeIds)
  if (
    selectedObjects.length === 1 &&
    transformableSelectedNodeIds.length === 1
  ) {
    multiSelectionActive = false
    transformControls.attach(selectedObjects[0])
  } else if (selectedObjects.length > 1) {
    multiSelectionActive = true
    const center = new THREE.Vector3()
    selectedObjects.forEach(object =>
      center.add(object.getWorldPosition(new THREE.Vector3())),
    )
    center.multiplyScalar(1 / selectedObjects.length)
    selectionPivot.position.copy(center)
    selectionPivot.rotation.set(0, 0, 0)
    selectionPivot.scale.set(1, 1, 1)
    selectionPivot.updateMatrixWorld(true)
    transformControls.attach(selectionPivot)
  } else {
    multiSelectionActive = false
    transformControls.detach()
  }
}

function updateSelectedNodeTransform(commitNodeUpdate = true) {
  const transformableSelectedNodeIds = getTransformableSelectedNodeIds()

  if (multiSelectionActive) {
    const deltaMatrix = new THREE.Matrix4().multiplyMatrices(
      selectionPivot.matrixWorld,
      new THREE.Matrix4().copy(initialPivotMatrix).invert(),
    )
    for (const nodeId of transformableSelectedNodeIds) {
      const selectedObject = getEditorObject(nodeId)
      const initial = initialObjectMatrices.get(nodeId)
      if (!selectedObject || !initial) continue

      const nextWorldMatrix = new THREE.Matrix4().multiplyMatrices(
        deltaMatrix,
        initial.worldMatrix,
      )
      const nextLocalMatrix = new THREE.Matrix4().multiplyMatrices(
        initial.parentInverse,
        nextWorldMatrix,
      )
      const nextPosition = new THREE.Vector3()
      const nextQuaternion = new THREE.Quaternion()
      const nextScale = new THREE.Vector3()
      nextLocalMatrix.decompose(nextPosition, nextQuaternion, nextScale)
      selectedObject.position.copy(nextPosition)
      selectedObject.quaternion.copy(nextQuaternion)
      selectedObject.scale.copy(nextScale)

      if (commitNodeUpdate) {
        patchNodeTransform(nodeId, {
          position: [
            selectedObject.position.x,
            selectedObject.position.y,
            selectedObject.position.z,
          ],
          rotation: [
            selectedObject.rotation.x,
            selectedObject.rotation.y,
            selectedObject.rotation.z,
          ],
          scale: [
            selectedObject.scale.x,
            selectedObject.scale.y,
            selectedObject.scale.z,
          ],
        })
      }
    }
    return
  }

  const activeNodeId =
    selectedNodeId && isNodeSelectable(selectedNodeId) ? selectedNodeId : null
  const selectedObject = getEditorObject(activeNodeId)
  if (!activeNodeId || !selectedObject) return

  if (commitNodeUpdate) {
    patchNodeTransform(activeNodeId, {
      position: [
        selectedObject.position.x,
        selectedObject.position.y,
        selectedObject.position.z,
      ],
      rotation: [
        selectedObject.rotation.x,
        selectedObject.rotation.y,
        selectedObject.rotation.z,
      ],
      scale: [
        selectedObject.scale.x,
        selectedObject.scale.y,
        selectedObject.scale.z,
      ],
    })
  }
}

function snapObjectToSurface(
  object: THREE.Object3D,
  ignoredNodeIds: Set<string>,
) {
  if (!scene) return

  const origin = object.getWorldPosition(new THREE.Vector3())
  origin.y += 50
  raycaster.set(origin, new THREE.Vector3(0, -1, 0))

  const targets = scene.children.filter(
    child => child !== transformControls && child !== selectionPivot,
  )
  const intersections = raycaster.intersectObjects(targets, true)
  const hit = intersections.find(intersection => {
    const nodeId = getNodeIdForObject(intersection.object)
    return !nodeId || !ignoredNodeIds.has(nodeId)
  })
  if (!hit) return

  const worldPosition = object.getWorldPosition(new THREE.Vector3())
  worldPosition.y = hit.point.y + surfaceSnapOffset
  if (object.parent) {
    object.position.copy(object.parent.worldToLocal(worldPosition))
  } else {
    object.position.copy(worldPosition)
  }
}

function snapSelectedNodeToSurface() {
  const transformableSelectedNodeIds = getTransformableSelectedNodeIds()
  if (!surfaceSnapEnabled || transformableSelectedNodeIds.length === 0) return

  const ignored = new Set(transformableSelectedNodeIds)
  for (const nodeId of transformableSelectedNodeIds) {
    const object = getEditorObject(nodeId)
    if (!object) continue
    snapObjectToSurface(object, ignored)
  }
  updateSelectedNodeTransform()
}

function projectObjectToScreen(object: THREE.Object3D) {
  if (!camera || !renderer) return null
  const rect = renderer.domElement.getBoundingClientRect()
  const worldPosition = object.getWorldPosition(new THREE.Vector3())
  const projected = worldPosition.project(camera)
  if (projected.z < -1 || projected.z > 1) return null
  return {
    x: (projected.x * 0.5 + 0.5) * rect.width + rect.left,
    y: (-projected.y * 0.5 + 0.5) * rect.height + rect.top,
  }
}

function getCircleSelectedNodeIds(
  clientX: number,
  clientY: number,
  radius: number,
) {
  const selectedIds: string[] = []

  for (const object of getSelectableEditorObjectsForViewport()) {
    const screen = projectObjectToScreen(object)
    if (!screen) continue

    const distance = Math.hypot(screen.x - clientX, screen.y - clientY)
    if (distance > radius) continue

    const nodeId = getNodeIdForObject(object)
    if (nodeId && !selectedIds.includes(nodeId)) {
      selectedIds.push(nodeId)
    }
  }

  return selectedIds
}

function applyCircleSelection(
  clientX: number,
  clientY: number,
  subtracting = false,
) {
  const hitNodeIds = getCircleSelectedNodeIds(
    clientX,
    clientY,
    circleSelectRadius,
  )
  if (hitNodeIds.length === 0) return

  if (subtracting) {
    const hitSet = new Set(hitNodeIds)
    const nextIds = selectedNodeIds.filter(nodeId => !hitSet.has(nodeId))
    setSelectedNodes(nextIds, nextIds[0] ?? null)
    return
  }

  const nextIds = [...selectedNodeIds]
  for (const nodeId of hitNodeIds) {
    if (!nextIds.includes(nodeId)) {
      nextIds.push(nodeId)
    }
  }

  setSelectedNodes(nextIds, selectedNodeIds[0] ?? hitNodeIds[0] ?? null)
}

function deactivateCircleSelectTool() {
  setCircleSelectSelecting(false)
  deactivateCircleSelect()
}

function activateCircleSelectTool() {
  if (!enabled || interactionMode !== 'objects' || modalSession) return

  boxSelectArmed = false
  const fallbackX = renderer
    ? renderer.domElement.getBoundingClientRect().left +
      renderer.domElement.getBoundingClientRect().width / 2
    : 0
  const fallbackY = renderer
    ? renderer.domElement.getBoundingClientRect().top +
      renderer.domElement.getBoundingClientRect().height / 2
    : 0
  const x = pointerScreen.lengthSq() > 0 ? pointerScreen.x : fallbackX
  const y = pointerScreen.lengthSq() > 0 ? pointerScreen.y : fallbackY
  activateCircleSelect(x, y)
  updateCircleSelectPointer(x, y)
}

function finalizeMarqueeSelection(clientX: number, clientY: number) {
  if (!renderer || !camera) return

  const dragDistance = Math.hypot(
    clientX - marqueeStart.x,
    clientY - marqueeStart.y,
  )
  if (marqueeStartedFromBoxTool && dragDistance < 4) {
    return
  }

  const rectLeft = Math.min(pointer.x, pointer.x)
  const minX = Math.min(marqueeStart.x, clientX)
  const maxX = Math.max(marqueeStart.x, clientX)
  const minY = Math.min(marqueeStart.y, clientY)
  const maxY = Math.max(marqueeStart.y, clientY)
  const selectedIds: string[] = []

  for (const object of getSelectableEditorObjectsForViewport()) {
    const screen = projectObjectToScreen(object)
    if (!screen) continue
    if (
      screen.x >= minX &&
      screen.x <= maxX &&
      screen.y >= minY &&
      screen.y <= maxY
    ) {
      const nodeId = getNodeIdForObject(object)
      if (nodeId && !selectedIds.includes(nodeId)) {
        selectedIds.push(nodeId)
      }
    }
  }

  if (selectedIds.length > 0) {
    selectEditorNode(selectedIds[0])
    for (let index = 1; index < selectedIds.length; index += 1) {
      selectEditorNode(selectedIds[index], { additive: true })
    }
  } else {
    clearSelection()
  }
}

let marqueeStart = { x: 0, y: 0 }

function stopMarqueeSelection() {
  marqueeSelecting = false
  marqueeStartedFromBoxTool = false
  endMarqueeSelection()
  if (orbitControls) {
    orbitControls.enabled = shouldEnableOrbitControls()
  }
  window.removeEventListener('pointerup', handleWindowPointerUp)
}

function handleWindowPointerMove(event: PointerEvent) {
  pointerScreen.set(event.clientX, event.clientY)
  if (modalSession) {
    updateModalTransform(event.clientX, event.clientY)
    return
  }
  if (circleSelectActive) {
    updateCircleSelectPointer(event.clientX, event.clientY)
    if (circleSelectSelecting) {
      applyCircleSelection(
        event.clientX,
        event.clientY,
        circleSelectSubtracting,
      )
    }
  }
  if (!marqueeSelecting) return
  updateMarqueeSelection(event.clientX, event.clientY)
}

function handleWindowPointerUp(event: PointerEvent) {
  setOrbitShiftPanMode(event.shiftKey)
  if (circleSelectActive && event.button === 0 && circleSelectSelecting) {
    setCircleSelectSelecting(false)
  }
  if (!marqueeSelecting) return
  finalizeMarqueeSelection(event.clientX, event.clientY)
  stopMarqueeSelection()
}

function handleCanvasPointerDownCapture(event: PointerEvent) {
  setOrbitShiftPanMode(isShiftPanEvent(event))
}

function handleGlobalPointerDown(event: PointerEvent) {
  pointerScreen.set(event.clientX, event.clientY)
  if (circleSelectActive && event.button === 2) {
    event.preventDefault()
    deactivateCircleSelectTool()
    return
  }
  if (!modalSession) return

  if (event.button === 0) {
    event.preventDefault()
    confirmModalTransform()
    return
  }

  if (event.button === 2) {
    event.preventDefault()
    cancelModalTransform()
  }
}

function handleCanvasPointerMove(event: PointerEvent) {
  pointerScreen.set(event.clientX, event.clientY)
  if (circleSelectActive) {
    updateCircleSelectPointer(event.clientX, event.clientY)
  }
}

function handleContextMenu(event: MouseEvent) {
  if (modalSession || circleSelectActive) {
    event.preventDefault()
  }
}

function handleWindowWheel(event: WheelEvent) {
  if (!circleSelectActive) return

  event.preventDefault()
  const radiusDelta = event.deltaY < 0 ? 8 : -8
  setCircleSelectRadius(circleSelectRadius + radiusDelta)
}

function startMarqueeSelection(
  event: PointerEvent,
  options?: { fromBoxTool?: boolean },
) {
  marqueeSelecting = true
  marqueeStartedFromBoxTool = options?.fromBoxTool ?? false
  marqueeStart = { x: event.clientX, y: event.clientY }
  beginMarqueeSelection(event.clientX, event.clientY)
  if (orbitControls) {
    orbitControls.enabled = false
  }
  window.addEventListener('pointerup', handleWindowPointerUp)
}

function handleCanvasPointerDown(event: PointerEvent) {
  if (!enabled || !renderer || !camera || !orbitControls) return
  if (transformControls?.dragging) return
  if (modalSession) return
  if (interactionMode !== 'objects') return

  if (circleSelectActive) {
    if (event.button === 0) {
      event.preventDefault()
      updateCircleSelectPointer(event.clientX, event.clientY)
      setCircleSelectSelecting(true, event.shiftKey)
      applyCircleSelection(event.clientX, event.clientY, event.shiftKey)
    }
    return
  }

  if (event.button !== 0) return

  if (isShiftPanEvent(event)) {
    return
  }

  if (boxSelectArmed) {
    event.preventDefault()
    startMarqueeSelection(event, { fromBoxTool: boxSelectArmed })
    boxSelectArmed = false
    return
  }

  const canvas = renderer.domElement
  const rect = canvas.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(pointer, camera)
  const additive = isAdditiveSelectionEvent(event)
  const nodeId = getCycledHitNodeId(getViewportHitNodeIds(), event, additive)

  if (!nodeId) {
    lastPickNodeIds = []
    lastPickScreen.set(Number.NaN, Number.NaN)
    clearSelection()
    return
  }

  selectEditorNode(nodeId, {
    additive,
  })
}

async function handleTransformDraggingChanged(event: { value: boolean }) {
  setOrbitEnabled(!event.value)

  if (event.value) {
    let dragNodeIds = getTransformableSelectedNodeIds()

    if (duplicateDragModifier && dragNodeIds.length > 0) {
      const duplicatedIds = duplicateNodes(dragNodeIds, { offset: [0, 0, 0] })
      if (duplicatedIds.length > 0) {
        dragNodeIds = duplicatedIds
        await tick()
        syncSelectionAttachment()
      }
    }

    startSceneTransaction()
    transactionRunning = true
    initialObjectMatrices.clear()
    for (const nodeId of dragNodeIds) {
      const object = getEditorObject(nodeId)
      if (!object) continue
      const worldMatrix = object.matrixWorld.clone()
      const parentInverse = object.parent
        ? object.parent.matrixWorld.clone().invert()
        : new THREE.Matrix4().identity()
      initialObjectMatrices.set(nodeId, { worldMatrix, parentInverse })
    }
    initialPivotMatrix.copy(selectionPivot.matrixWorld)
    return
  }

  if (transactionRunning) {
    endSceneTransaction()
    transactionRunning = false
    initialObjectMatrices.clear()
  }
}

function handleTransformObjectChange() {
  if (transformMode === 'translate') {
    snapSelectedNodeToSurface()
  }
  updateSelectedNodeTransform()
}

function frameSelection() {
  const transformableSelectedNodeIds = getTransformableSelectedNodeIds()
  if (!orbitControls || transformableSelectedNodeIds.length === 0) return
  const objects = getEditorObjects(transformableSelectedNodeIds)
  if (objects.length === 0) return

  const bounds = new THREE.Box3()
  const center = new THREE.Vector3()
  const size = new THREE.Vector3()
  let hasValidBounds = false

  for (const object of objects) {
    object.updateWorldMatrix(true, true)
    const objectBounds = new THREE.Box3().setFromObject(object)
    if (!objectBounds.isEmpty()) {
      bounds.union(objectBounds)
      hasValidBounds = true
    } else {
      const point = object.getWorldPosition(new THREE.Vector3())
      bounds.expandByPoint(point)
    }
  }

  bounds.getCenter(center)
  orbitControls.target.copy(center)

  if (hasValidBounds && camera instanceof THREE.PerspectiveCamera) {
    bounds.getSize(size)
    const radius = Math.max(size.x, size.y, size.z) * 0.5
    const currentDirection = camera.position.clone().sub(orbitControls.target)
    if (currentDirection.lengthSq() < 0.0001) {
      currentDirection.set(0, 0.35, 1)
    }
    currentDirection.normalize()

    const halfFovRadians = THREE.MathUtils.degToRad(camera.fov * 0.5)
    const desiredDistance =
      Math.max(radius / Math.tan(halfFovRadians), 3) * 1.35
    camera.position.copy(
      center.clone().add(currentDirection.multiplyScalar(desiredDistance)),
    )
  }

  orbitControls.update()
}

function framePoint(position: [number, number, number], distance = 18) {
  if (!orbitControls || !(camera instanceof THREE.PerspectiveCamera)) return

  const target = new THREE.Vector3(position[0], position[1] + 1.2, position[2])
  const currentDirection = camera.position.clone().sub(orbitControls.target)
  if (currentDirection.lengthSq() < 0.0001) {
    currentDirection.set(0.45, 0.35, 1)
  }
  currentDirection.normalize()

  orbitControls.target.copy(target)
  camera.position.copy(
    target.clone().add(currentDirection.multiplyScalar(distance)),
  )
  orbitControls.update()
}

function handleViewportFocusRequest() {
  if (
    !controlsInitialized ||
    !viewportFocusRequest ||
    viewportFocusRequest.requestId === handledViewportFocusRequestId
  ) {
    return
  }

  handledViewportFocusRequestId = viewportFocusRequest.requestId
  framePoint(viewportFocusRequest.position, viewportFocusRequest.distance)
}

function cacheInitialSelectionState() {
  initialObjectMatrices.clear()
  for (const nodeId of getTransformableSelectedNodeIds()) {
    const object = getEditorObject(nodeId)
    if (!object) continue
    const worldMatrix = object.matrixWorld.clone()
    const parentInverse = object.parent
      ? object.parent.matrixWorld.clone().invert()
      : new THREE.Matrix4().identity()
    initialObjectMatrices.set(nodeId, { worldMatrix, parentInverse })
  }
}

function prepareModalSelectionPivot() {
  const selectedObjects = getEditorObjects(getTransformableSelectedNodeIds())
  if (selectedObjects.length === 0) return false

  const center = new THREE.Vector3()
  selectedObjects.forEach(object =>
    center.add(object.getWorldPosition(new THREE.Vector3())),
  )
  center.multiplyScalar(1 / selectedObjects.length)

  selectionPivot.position.copy(center)
  selectionPivot.scale.set(1, 1, 1)

  if (selectedObjects.length === 1 && transformSpace === 'local') {
    selectionPivot.quaternion.copy(
      selectedObjects[0].getWorldQuaternion(new THREE.Quaternion()),
    )
  } else {
    selectionPivot.quaternion.identity()
  }

  selectionPivot.updateMatrixWorld(true)
  initialPivotPosition.copy(selectionPivot.position)
  initialPivotQuaternion.copy(selectionPivot.quaternion)
  initialPivotScale.copy(selectionPivot.scale)
  initialPivotMatrix.copy(selectionPivot.matrixWorld)
  multiSelectionActive = true
  transformControls?.attach(selectionPivot)
  return true
}

function getWorldUnitsPerPixel() {
  if (!camera || !renderer) return 0.01
  const rect = renderer.domElement.getBoundingClientRect()
  const distance = camera.position.distanceTo(
    selectionPivot.getWorldPosition(new THREE.Vector3()),
  )
  const fovRadians = THREE.MathUtils.degToRad(camera.fov)
  return (2 * Math.tan(fovRadians / 2) * distance) / Math.max(rect.height, 1)
}

function getWorldAxisVector(axis: Exclude<EditorTransformAxis, 'all'>) {
  const baseAxis =
    axis === 'x'
      ? new THREE.Vector3(1, 0, 0)
      : axis === 'y'
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1)

  if (transformSpace === 'local' && selectedNodeIds.length === 1) {
    return baseAxis.applyQuaternion(initialPivotQuaternion).normalize()
  }

  return baseAxis
}

function getScreenAxisDirection(axis: Exclude<EditorTransformAxis, 'all'>) {
  if (!camera || !renderer) return new THREE.Vector2(1, 0)

  const rect = renderer.domElement.getBoundingClientRect()
  const origin = selectionPivot.getWorldPosition(new THREE.Vector3())
  const target = origin.clone().add(getWorldAxisVector(axis))
  const projectedOrigin = origin.clone().project(camera)
  const projectedTarget = target.project(camera)
  const screenDirection = new THREE.Vector2(
    (projectedTarget.x - projectedOrigin.x) * rect.width * 0.5,
    -(projectedTarget.y - projectedOrigin.y) * rect.height * 0.5,
  )

  if (screenDirection.lengthSq() < 1e-6) return new THREE.Vector2(1, 0)
  return screenDirection.normalize()
}

function quantizeScalar(value: number, increment: number) {
  if (!snappingEnabled || increment <= 0) return value
  return Math.round(value / increment) * increment
}

function getSnappedTranslationPosition(position: THREE.Vector3) {
  if (!snappingEnabled) return position

  const translationDelta = position.clone().sub(initialPivotPosition)

  if (
    transformSpace === 'local' &&
    getTransformableSelectedNodeIds().length === 1
  ) {
    const localDelta = translationDelta.applyQuaternion(
      initialPivotQuaternion.clone().invert(),
    )
    localDelta.set(
      quantizeScalar(localDelta.x, translateSnap),
      quantizeScalar(localDelta.y, translateSnap),
      quantizeScalar(localDelta.z, translateSnap),
    )
    return initialPivotPosition
      .clone()
      .add(localDelta.applyQuaternion(initialPivotQuaternion))
  }

  translationDelta.set(
    quantizeScalar(translationDelta.x, translateSnap),
    quantizeScalar(translationDelta.y, translateSnap),
    quantizeScalar(translationDelta.z, translateSnap),
  )

  return initialPivotPosition.clone().add(translationDelta)
}

function getSnappedRotationAngle(angle: number) {
  if (!snappingEnabled) return angle
  const snapRadians = THREE.MathUtils.degToRad(rotateSnap)
  if (snapRadians <= 0) return angle
  return quantizeScalar(angle, snapRadians)
}

function getSnappedScaleFactor(factor: number) {
  if (!snappingEnabled || scaleSnap <= 0) return factor
  return Math.max(0.05, 1 + quantizeScalar(factor - 1, scaleSnap))
}

function restoreInitialTransforms() {
  selectionPivot.position.copy(initialPivotPosition)
  selectionPivot.quaternion.copy(initialPivotQuaternion)
  selectionPivot.scale.copy(initialPivotScale)
  selectionPivot.updateMatrixWorld(true)

  for (const nodeId of getTransformableSelectedNodeIds()) {
    const object = getEditorObject(nodeId)
    const initial = initialObjectMatrices.get(nodeId)
    if (!object || !initial) continue

    const localMatrix = new THREE.Matrix4().multiplyMatrices(
      initial.parentInverse,
      initial.worldMatrix,
    )
    const nextPosition = new THREE.Vector3()
    const nextQuaternion = new THREE.Quaternion()
    const nextScale = new THREE.Vector3()
    localMatrix.decompose(nextPosition, nextQuaternion, nextScale)
    object.position.copy(nextPosition)
    object.quaternion.copy(nextQuaternion)
    object.scale.copy(nextScale)
  }
}

function applyModalTransform(
  pointerDelta: THREE.Vector2,
  axis: EditorTransformAxis,
) {
  if (!modalSession) return

  selectionPivot.position.copy(initialPivotPosition)
  selectionPivot.quaternion.copy(initialPivotQuaternion)
  selectionPivot.scale.copy(initialPivotScale)

  if (modalSession.mode === 'translate') {
    const unitsPerPixel = getWorldUnitsPerPixel()
    if (axis === 'all') {
      const cameraForward = camera.getWorldDirection(new THREE.Vector3())
      const cameraRight = new THREE.Vector3()
        .crossVectors(cameraForward, camera.up)
        .normalize()
      const cameraUp = camera.up.clone().normalize()
      const translation = cameraRight
        .multiplyScalar(pointerDelta.x * unitsPerPixel)
        .add(cameraUp.multiplyScalar(-pointerDelta.y * unitsPerPixel))
      selectionPivot.position.copy(
        getSnappedTranslationPosition(
          initialPivotPosition.clone().add(translation),
        ),
      )
    } else {
      const axisDirection = getWorldAxisVector(axis)
      const screenAxis = getScreenAxisDirection(axis)
      const projectedDelta = pointerDelta.dot(screenAxis)
      selectionPivot.position.copy(
        getSnappedTranslationPosition(
          initialPivotPosition
            .clone()
            .add(axisDirection.multiplyScalar(projectedDelta * unitsPerPixel)),
        ),
      )
    }
  }

  if (modalSession.mode === 'rotate') {
    if (axis === 'all') {
      const cameraForward = camera.getWorldDirection(new THREE.Vector3())
      const cameraRight = new THREE.Vector3()
        .crossVectors(cameraForward, camera.up)
        .normalize()
      const yaw = new THREE.Quaternion().setFromAxisAngle(
        camera.up.clone().normalize(),
        getSnappedRotationAngle(pointerDelta.x * 0.01),
      )
      const pitch = new THREE.Quaternion().setFromAxisAngle(
        cameraRight,
        getSnappedRotationAngle(pointerDelta.y * 0.01),
      )
      selectionPivot.quaternion
        .copy(initialPivotQuaternion)
        .premultiply(yaw)
        .premultiply(pitch)
    } else {
      const axisDirection = getWorldAxisVector(axis)
      const screenAxis = getScreenAxisDirection(axis)
      const angle = getSnappedRotationAngle(pointerDelta.dot(screenAxis) * 0.01)
      const rotation = new THREE.Quaternion().setFromAxisAngle(
        axisDirection,
        angle,
      )
      selectionPivot.quaternion
        .copy(initialPivotQuaternion)
        .premultiply(rotation)
    }
  }

  if (modalSession.mode === 'scale') {
    const factor = getSnappedScaleFactor(
      Math.max(0.05, Math.exp((pointerDelta.x - pointerDelta.y) * 0.01)),
    )
    if (axis === 'all') {
      selectionPivot.scale.copy(initialPivotScale).multiplyScalar(factor)
    } else {
      selectionPivot.scale.copy(initialPivotScale)
      if (axis === 'x') selectionPivot.scale.x = initialPivotScale.x * factor
      if (axis === 'y') selectionPivot.scale.y = initialPivotScale.y * factor
      if (axis === 'z') selectionPivot.scale.z = initialPivotScale.z * factor
    }
  }

  selectionPivot.updateMatrixWorld(true)
  updateSelectedNodeTransform(false)
}

function updateModalTransform(clientX: number, clientY: number) {
  if (!modalSession) return
  const pointerDelta = new THREE.Vector2(
    clientX - modalPointerStart.x,
    clientY - modalPointerStart.y,
  )
  applyModalTransform(pointerDelta, transformAxis)
}

function beginModalTransform(mode: EditorTransformMode) {
  if (!enabled || getTransformableSelectedNodeIds().length === 0) return
  deactivateCircleSelectTool()
  if (!prepareModalSelectionPivot()) return

  cacheInitialSelectionState()
  if (pointerScreen.lengthSq() === 0 && renderer) {
    const rect = renderer.domElement.getBoundingClientRect()
    pointerScreen.set(rect.left + rect.width / 2, rect.top + rect.height / 2)
  }
  modalSession = {
    active: true,
    mode,
    axis: transformAxis,
  }
  modalPointerStart.set(pointerScreen.x, pointerScreen.y)
  setTransformMode(mode)
  setModalTransformActive(true)
  orbitControls && (orbitControls.enabled = false)
}

function confirmModalTransform() {
  if (!modalSession) return
  startSceneTransaction()
  try {
    updateSelectedNodeTransform(true)
  } finally {
    endSceneTransaction()
  }
  modalSession = null
  setModalTransformActive(false)
  syncSelectionAttachment()
  if (orbitControls && !marqueeSelecting) {
    orbitControls.enabled = shouldEnableOrbitControls()
  }
}

function cancelModalTransform() {
  if (!modalSession) return
  restoreInitialTransforms()
  modalSession = null
  setModalTransformActive(false)
  syncSelectionAttachment()
  if (orbitControls && !marqueeSelecting) {
    orbitControls.enabled = shouldEnableOrbitControls()
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (!enabled) return
  duplicateDragModifier = event.altKey
  if (event.key === 'Shift') {
    setOrbitShiftPanMode(true)
  }
  const target = event.target as HTMLElement | null
  const tag = target?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return

  const mod = event.metaKey || event.ctrlKey
  const key = event.key.toLowerCase()

  if (
    useActiveCamera &&
    !mod &&
    !modalSession &&
    ['w', 'a', 's', 'd'].includes(key)
  ) {
    return
  }

  if (modalSession) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      confirmModalTransform()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      cancelModalTransform()
      return
    }

    if (!mod && key === 'x') {
      event.preventDefault()
      setTransformAxis(transformAxis === 'x' ? 'all' : 'x')
      updateModalTransform(pointerScreen.x, pointerScreen.y)
      return
    }
    if (!mod && key === 'y') {
      event.preventDefault()
      setTransformAxis(transformAxis === 'y' ? 'all' : 'y')
      updateModalTransform(pointerScreen.x, pointerScreen.y)
      return
    }
    if (!mod && key === 'z') {
      event.preventDefault()
      setTransformAxis(transformAxis === 'z' ? 'all' : 'z')
      updateModalTransform(pointerScreen.x, pointerScreen.y)
      return
    }
  }

  if (mod && key === 'z' && !event.shiftKey) {
    event.preventDefault()
    undoScene()
    return
  }
  if ((mod && key === 'z' && event.shiftKey) || (mod && key === 'y')) {
    event.preventDefault()
    redoScene()
    return
  }
  if (mod && key === 'd') {
    event.preventDefault()
    const transformableSelectedNodeIds = getTransformableSelectedNodeIds()
    if (transformableSelectedNodeIds.length > 0)
      duplicateNodes(transformableSelectedNodeIds)
    return
  }
  if (mod && key === 'g') {
    event.preventDefault()
    if (event.shiftKey) {
      if (selectedNodeIds.length > 0) ungroupNodes(selectedNodeIds)
    } else if (getTransformableSelectedNodeIds().length > 0) {
      groupNodes(getTransformableSelectedNodeIds())
    }
    return
  }
  if (mod && key === 'a') {
    event.preventDefault()
    selectAllNodes()
    return
  }

  if (!mod && event.shiftKey && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    setEditorViewportLightingMode(
      viewportLightingMode === 'workbench' ? 'authored' : 'workbench',
    )
    return
  }

  if (!mod && getTransformableSelectedNodeIds().length > 0) {
    if (key === 'b' && interactionMode === 'objects') {
      event.preventDefault()
      boxSelectArmed = true
      return
    }
    if (key === 'x') {
      event.preventDefault()
      setTransformAxis(transformAxis === 'x' ? 'all' : 'x')
      return
    }
    if (key === 'y') {
      event.preventDefault()
      setTransformAxis(transformAxis === 'y' ? 'all' : 'y')
      return
    }
    if (key === 'z') {
      event.preventDefault()
      setTransformAxis(transformAxis === 'z' ? 'all' : 'z')
      return
    }
  }

  switch (key) {
    case 'b':
      if (interactionMode === 'objects') {
        event.preventDefault()
        if (circleSelectActive) deactivateCircleSelectTool()
        boxSelectArmed = true
      }
      break
    case 'c':
      if (interactionMode === 'objects') {
        event.preventDefault()
        if (circleSelectActive) deactivateCircleSelectTool()
        else activateCircleSelectTool()
      }
      break
    case 'a':
      event.preventDefault()
      selectAllNodes()
      break
    case 'h':
      event.preventDefault()
      if (event.altKey) {
        showAllNodes()
      } else if (event.shiftKey) {
        isolateSelectedNodes()
      } else {
        hideSelectedNodes()
      }
      break
    case 'g':
      event.preventDefault()
      if (
        interactionMode === 'objects' &&
        getTransformableSelectedNodeIds().length > 0
      )
        beginModalTransform('translate')
      else setTransformMode('translate')
      break
    case 'r':
      event.preventDefault()
      if (
        interactionMode === 'objects' &&
        getTransformableSelectedNodeIds().length > 0
      )
        beginModalTransform('rotate')
      else setTransformMode('rotate')
      break
    case 's':
      event.preventDefault()
      if (
        interactionMode === 'objects' &&
        getTransformableSelectedNodeIds().length > 0
      )
        beginModalTransform('scale')
      else setTransformMode('scale')
      break
    case 'w':
      event.preventDefault()
      setTransformMode('translate')
      break
    case 'e':
      event.preventDefault()
      setTransformMode('rotate')
      break
    case 'f':
      event.preventDefault()
      frameSelection()
      break
    case 'n':
      event.preventDefault()
      togglePropertiesShelfOpen()
      break
    case '.':
      event.preventDefault()
      frameSelection()
      break
    case 'end':
      event.preventDefault()
      snapSelectedNodeToSurface()
      break
    case 'escape':
      event.preventDefault()
      if (circleSelectActive) deactivateCircleSelectTool()
      else if (boxSelectArmed) boxSelectArmed = false
      else if (transformAxis !== 'all') setTransformAxis('all')
      else clearSelection()
      break
    case 'backspace':
    case 'delete':
      event.preventDefault()
      if (selectedNodeIds.length > 0) removeNodes(selectedNodeIds)
      break
  }
}

function handleKeyUp(event: KeyboardEvent) {
  if (event.key === 'Alt' || !event.altKey) {
    duplicateDragModifier = false
  }
  if (event.key === 'Shift' || !event.shiftKey) {
    setOrbitShiftPanMode(false)
  }
}

function setupControls() {
  if (!enabled || !renderer || !camera || !scene || controlsInitialized) return

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  setOrbitShiftPanMode(false)
  orbitControls.target.set(0, 2, 0)
  orbitControls.update()

  transformControls = new TransformControls(camera, renderer.domElement)
  transformControls.setMode(transformMode)
  transformControls.setSpace(transformSpace)
  transformControls.showX = transformAxis === 'all' || transformAxis === 'x'
  transformControls.showY = transformAxis === 'all' || transformAxis === 'y'
  transformControls.showZ = transformAxis === 'all' || transformAxis === 'z'
  transformControls.addEventListener(
    'dragging-changed',
    handleTransformDraggingChanged,
  )
  transformControls.addEventListener(
    'objectChange',
    handleTransformObjectChange,
  )
  transformControlsHelper = transformControls.getHelper()
  if (transformControlsHelper instanceof THREE.Object3D) {
    transformControlsHelper.traverse(object => {
      object.userData.editorViewportOverlay = true
    })
    scene.add(transformControlsHelper)
  } else {
    if (import.meta.env.DEV) {
      console.warn(
        'EditorViewportControls: TransformControls helper is not a THREE.Object3D; skipping helper attachment.',
      )
    }
    transformControlsHelper = null
  }
  scene.add(selectionPivot)
  renderer.domElement.addEventListener(
    'pointerdown',
    handleCanvasPointerDownCapture,
    { capture: true },
  )
  renderer.domElement.addEventListener('pointerdown', handleCanvasPointerDown)
  renderer.domElement.addEventListener('pointermove', handleCanvasPointerMove)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('pointermove', handleWindowPointerMove)
  window.addEventListener('pointerdown', handleGlobalPointerDown)
  window.addEventListener('wheel', handleWindowWheel, { passive: false })
  window.addEventListener('contextmenu', handleContextMenu)

  controlsInitialized = true
  syncSelectionAttachment()
  handleViewportFocusRequest()
}

$: if (enabled && camera && renderer && scene && !controlsInitialized) {
  setupControls()
}

$: if (controlsInitialized) {
  syncSelectionAttachment()
  handleViewportFocusRequest()
  if (orbitControls && !marqueeSelecting) {
    orbitControls.enabled = shouldEnableOrbitControls() && !circleSelectActive
  }
  if (transformControls) {
    transformControls.enabled = enabled
  }
  if (transformControlsHelper) {
    transformControlsHelper.visible = enabled
  }
}

$: if (!enabled && controlsInitialized) {
  if (marqueeSelecting) stopMarqueeSelection()
  if (circleSelectActive) deactivateCircleSelectTool()
  if (modalSession) cancelModalTransform()
}

$: if (interactionMode !== 'objects' && circleSelectActive) {
  deactivateCircleSelectTool()
}

useTask(() => {
  if (shouldEnableOrbitControls() && orbitControls) {
    orbitControls.update()
  }
})

onDestroy(() => {
  unsubscribe()
  unsubscribeViewportState()
  unsubscribeCircleSelect()
  unsubscribeViewportFocus()
  unsubscribeNodes()
  stopMarqueeSelection()
  deactivateCircleSelectTool()

  if (renderer) {
    renderer.domElement.removeEventListener(
      'pointerdown',
      handleCanvasPointerDownCapture,
      { capture: true },
    )
    renderer.domElement.removeEventListener(
      'pointerdown',
      handleCanvasPointerDown,
    )
    renderer.domElement.removeEventListener(
      'pointermove',
      handleCanvasPointerMove,
    )
  }
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('pointermove', handleWindowPointerMove)
  window.removeEventListener('pointerdown', handleGlobalPointerDown)
  window.removeEventListener('wheel', handleWindowWheel)
  window.removeEventListener('contextmenu', handleContextMenu)

  if (transformControls && scene) {
    transformControls.removeEventListener(
      'dragging-changed',
      handleTransformDraggingChanged,
    )
    transformControls.removeEventListener(
      'objectChange',
      handleTransformObjectChange,
    )
    if (transformControlsHelper) {
      scene.remove(transformControlsHelper)
    }
    scene.remove(selectionPivot)
    transformControls.dispose()
  }

  orbitControls?.dispose()
})
</script>

<T.PerspectiveCamera
  makeDefault={enabled && !useActiveCamera}
  bind:ref={editorCamera}
  position={[8, 6, 12]}
  fov={55}
  near={0.1}
  far={5000}
/>
