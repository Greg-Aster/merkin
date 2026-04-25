<script lang="ts">
import './editor-ui.css'
import { EDITOR_API_BASE } from '@config/editorApi'
import { onDestroy, onMount } from 'svelte'
import { get } from 'svelte/store'
import {
  type LevelLifecycleStatus,
  type LevelRegistryEntry,
  levelRegistryStore,
  sanitizeLevelId,
  setLevelRegistry,
} from '../levels/levelRegistry'
import { gameActions } from '../stores/gameStateStore'
import {
  reportRuntimeAssetFailure,
  runtimeAssetFailuresStore,
  setRuntimeDiagnostic,
} from '../stores/runtimeDiagnosticsStore'
import EditorCreatePanel from './EditorCreatePanel.svelte'
import EditorEnvironmentPanel from './EditorEnvironmentPanel.svelte'
import EditorHierarchyPanel from './EditorHierarchyPanel.svelte'
import EditorInspectorForm from './EditorInspectorForm.svelte'
import EditorOutliner from './EditorOutliner.svelte'
import EditorPlayerPanel from './EditorPlayerPanel.svelte'
import EditorPropertiesShelf from './EditorPropertiesShelf.svelte'
import EditorSavePanel from './EditorSavePanel.svelte'
import EditorSceneToolsPanel from './EditorSceneToolsPanel.svelte'
import EditorWorkflowPanel from './EditorWorkflowPanel.svelte'
import { createDefaultSceneForLevel } from './defaultScenes'
import { createEditorAiController } from './editorAiController'
import { createEditorAssetController } from './editorAssetController'
import { canBakeSceneNode, getPrefabAssetUrl } from './editorBakeSource'
import { createEditorCreateController } from './editorCreateController'
import {
  EDITOR_PREFAB_GENERATION_LABELS,
  inferNodeGenerationDescriptor,
} from './editorGeneration'
import { createEditorInspectorController } from './editorInspectorController'
import { createEditorLevelController } from './editorLevelController'
import {
  resolveObservatoryPresetSettings,
  resolveSolitudePresetSettings,
  solitudeAtmospherePresets,
} from './editorLevelPresets'
import { mergeLevelSettings } from './editorLevelSetup'
import {
  OUTLINER_MODE_OPTIONS,
  buildOutlinerItems,
  flattenOutlinerItems,
  getOutlinerExpandedIds,
  getOutlinerFilterPlaceholder,
  getOutlinerSubtitle,
  isOutlinerRowSelected,
} from './editorOutliner'
import { createEditorOutlinerController } from './editorOutlinerController'
import type {
  OutlinerDisplayMode,
  OutlinerNodeViewportState,
} from './editorOutlinerTypes'
import {
  type PersistedStyleBatchSession,
  loadStyleBatchSessionFromLocalStorage,
  saveEditorSceneToLocalStorage,
} from './editorPersistence'
import {
  type EditorMaterialData,
  type EditorPrefabType,
  type EditorSceneNode,
  type EditorStylePreset,
  addEmptyNode,
  addNode,
  canRedoStore,
  canUndoStore,
  clearIsolatedNodes,
  clearSelection,
  createEmptyScene,
  duplicateNodes,
  editorNodeViewportStateStore,
  editorNodesStore,
  editorPrefabs,
  editorSceneStore,
  editorStateStore,
  exportSceneJson,
  groupNodes,
  importSceneJson,
  patchNode,
  patchNodes,
  redoScene,
  removeNodes,
  reparentNodes,
  saveSceneToLocalStorage,
  selectEditorNode,
  selectedEditorNodeStore,
  selectedEditorNodesStore,
  setCollisionOverlayEnabled,
  setEditorInteractionMode,
  setEditorScene,
  setEditorViewportLightingMode,
  setIsolatedNodes,
  setRotateSnap,
  setScaleSnap,
  setSelectedNodes,
  setSnappingEnabled,
  setSurfaceSnapEnabled,
  setSurfaceSnapOffset,
  setTerrainBrushFalloff,
  setTerrainBrushMode,
  setTerrainBrushSize,
  setTerrainBrushStrength,
  startSceneTransaction,
  endSceneTransaction,
  setTransformAxis,
  setTransformMode,
  setTransformSpace,
  setTranslateSnap,
  toggleIsolatedNode,
  togglePanelOpen,
  togglePropertiesShelfOpen,
  undoScene,
  ungroupNodes,
  updateLevelSceneSettings,
  updateObservatorySceneSettings,
  updateSolitudeSceneSettings,
} from './editorStore'
import { createEditorStyleController } from './editorStyleController'

export let levelId: string

type EditorPanelTab =
  | 'workflow'
  | 'scene'
  | 'environment'
  | 'player'
  | 'create'
  | 'hierarchy'
  | 'inspect'
  | 'style'
  | 'ai'
  | 'save'

let editorState
let editorNodes: EditorSceneNode[] = []
let editorScene = null
let levelRegistryEntries: LevelRegistryEntry[] = []
let nodeViewportStateById = new Map<string, OutlinerNodeViewportState>()
let selectedNode: EditorSceneNode | null = null
let selectedNodes: EditorSceneNode[] = []
let canUndo = false
let canRedo = false
let importBuffer = ''
let saveMessage = 'Local only'
const ASSET_LIBRARY_ROOT_MODELS = 'apps/megameal/public/models'
const ASSET_LIBRARY_ROOT_GENERATED = 'apps/megameal/public/generated/hunyuan3d'
const COMFY_WORKFLOW_LIBRARY_ROOT = 'apps/game/public/ref-image'
const DEFAULT_COMFY_WORKFLOW_PATH =
  'apps/game/public/ref-image/Hunyaun example.json'
let assetBrowserPath = ASSET_LIBRARY_ROOT_MODELS
let assetBrowserItems: Array<{
  name: string
  path: string
  isDirectory: boolean
}> = []
let assetBrowserFilter = ''
let assetBrowserError = ''
let assetBrowserLoading = false
let selectedLibraryItem: {
  name: string
  path: string
  isDirectory: boolean
} | null = null
let assetPickerTargetNodeId = ''
let textureBrowserPath = 'apps/game/public'
let textureBrowserItems: Array<{
  name: string
  path: string
  isDirectory: boolean
}> = []
let textureBrowserError = ''
let textureBrowserLoading = false
let activeTextureMaterialField:
  | 'mapUrl'
  | 'normalMapUrl'
  | 'roughnessMapUrl'
  | 'metalnessMapUrl'
  | 'emissiveMapUrl'
  | 'alphaMapUrl'
  | null = null
let generatedVariantItems: Array<{ name: string; path: string; url: string }> =
  []
let generatedVariantLoading = false
let generatedVariantError = ''
let selectedGeneratedVariantUrl = ''
let generatedVariantSelectionKey = ''
let workflowBrowserPath = COMFY_WORKFLOW_LIBRARY_ROOT
let workflowBrowserItems: Array<{
  name: string
  path: string
  isDirectory: boolean
}> = []
let workflowBrowserError = ''
let workflowBrowserLoading = false
let selectedComfyWorkflowPath = DEFAULT_COMFY_WORKFLOW_PATH
let comfyUiApiUrl = 'http://127.0.0.1:8188'
let comfyUiStatus =
  'ComfyUI powers local mesh workflows and can be started here.'
let comfyUiBusy = false
let comfyUiReady = false
let comfyUiStatusKey = ''
let comfyWorkflowEditorStatus = ''
let hunyuanApiUrl = 'http://127.0.0.1:8080'
let hunyuanPrompt = ''
let mergeDescriptor = ''
let hunyuanReferenceImageUrl = ''
let hunyuanScratchName = 'Generated Artifact'
let hunyuanScratchReferenceImageUrl = ''
let hunyuanScratchPrompt = ''
let hunyuanDetectedReferenceImageUrl = ''
let hunyuanStatus = 'Select a single asset node to generate or texture.'
let hunyuanBackendStatus = 'Mesh backend not checked yet.'
let hunyuanBusy = false
let hunyuanServiceReady = false
let hunyuanBackendCanGenerate = false
let hunyuanBackendCanRetexture = false
let hunyuanLastOutputUrl = ''
let hunyuanLastResultSummary = ''
let canApplyGeneratedAssetToSelection = false
let hunyuanLastFitReport = ''
let recentHunyuanJobs: Array<any> = []
let hunyuanJobsLoading = false
let hunyuanJobsError = ''
let selectedHunyuanJobId = ''
let hunyuanJobsPollInterval: number | null = null
let hunyuanSupportsReplacement = false
let hunyuanSupportsTextureWrap = false
let hunyuanSelectionKey = ''
let hunyuanInspectToken = 0
let lastInspectedHunyuanAsset = ''
let hunyuanActiveJobId = ''
let autoSaveTimeout: number | null = null
let pendingLevelId = levelId
let newLevelTitle = ''
let newLevelIdInput = ''
let newLevelTemplateId = levelId
let saveAsTitle = ''
let saveAsLevelId = ''
let metadataTitle = ''
let metadataStatus: LevelLifecycleStatus = 'draft'
let metadataDeployed = false
let metadataStarMapEnabled = false
let metadataStarMapYear = 2100
let metadataStarMapDescription = ''
let metadataSourceKind: 'component' | 'scene' = 'scene'
let metadataSourceComponentKey:
  | 'observatory'
  | 'sci-fi-room'
  | 'miranda'
  | 'solitude' = 'observatory'
let loadedMetadataLevelId = ''
let activeEditorTab: EditorPanelTab = 'workflow'
let pipelineLogEnabled = false
let pipelineLogEntries: string[] = []
let hierarchyFilter = ''
let outlinerDisplayMode: OutlinerDisplayMode = 'view-layer'
let outlinerExpandedIdsByMode: Record<OutlinerDisplayMode, string[]> = {
  'view-layer': ['outliner:view-layer:scene'],
  collections: ['outliner:collections:scene', 'outliner:collections:smart'],
  'blender-file': [
    'outliner:blender-file:root',
    'outliner:blender-file:scenes',
    'outliner:blender-file:collections',
    'outliner:blender-file:objects',
  ],
  'data-api': [
    'outliner:data-api:root',
    'outliner:data-api:scene',
    'outliner:data-api:selection',
  ],
}
let editorTabContentElement: HTMLDivElement | null = null
let lastScrolledTab: EditorPanelTab | null = null
let editorAIMeshStudioComponent:
  | typeof import('./EditorAIMeshStudio.svelte').default
  | null = null
let editorAIMeshStudioPromise: Promise<void> | null = null
let editorStyleStudioComponent:
  | typeof import('./EditorStyleStudio.svelte').default
  | null = null
let editorStyleStudioPromise: Promise<void> | null = null
let hunyuanApplyToSimilarNodes = false
let styleSelectionKey = ''
let styleProfileName = 'Painterly Storybook'
let stylePrompt = ''
let styleNegativePrompt = ''
let styleLoraNotes = ''
let styleControlNetNotes =
  'Preserve silhouette and major surface breakup from the source asset.'
let styleReferenceImageUrl = ''
let styleStatus = 'Select a single geometry node to open the style toolchain.'
let styleInspectReport = ''
let styleSourceSummary = ''
let styleWorkspaceManifestUrl = ''
let styleWorkspaceSourceAssetUrl = ''
let styleGeneratedReferenceImageUrl = ''
let styleSimplifiedAssetUrl = ''
let styleBlenderExportPath = ''
let styleBlenderOpenCommand = ''
let styleSimplifyRatio = 0.6
let styleSimplifyError = 0.001
let styleBusy = false
let styleWorkspaceRestoreToken = 0
let styleBatchBusy = false
let styleBatchStatus = ''
let styleBatchAbortRequested = false
let styleBatchStopIntent: 'pause' | 'cancel' | null = null
let runtimeAssetFailures: Array<{
  id: string
  source: string
  message: string
  updatedAt: number
}> = []
let styleBatchSelectionIds: string[] = []
let styleBatchSelectionKey = 0
let styleBatchSelectionInitialized = false
let styleLevelDefaultsAppliedFor = ''
let styleBatchNodeStatusById: Record<string, string> = {}
let styleBatchSession: PersistedStyleBatchSession | null = null
let styleBatchResumePromise: Promise<void> | null = null
let styleBatchPendingResume: PersistedStyleBatchSession | null = null
let styleSceneCandidates: Array<{
  id: string
  name: string
  kindLabel: string
  descriptor: string
  selected: boolean
  status: string
}> = []

const PIPELINE_LOG_STORAGE_KEY = 'merkin:editor-pipeline-log'
const PIPELINE_LOG_ENABLED_STORAGE_KEY = 'merkin:editor-pipeline-log-enabled'

function sendPipelineLogToTerminal(message: string, detail?: unknown) {
  void fetch(`${EDITOR_API_BASE}/api/editor/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'pipeline',
      message,
      detail,
    }),
  }).catch(() => {
    // Terminal mirroring is best-effort only.
  })
}

function appendPipelineLog(message: string, detail?: unknown) {
  sendPipelineLogToTerminal(message, detail)
  if (!pipelineLogEnabled) return

  const timestamp = new Date().toISOString()
  const suffix =
    detail === undefined
      ? ''
      : ` :: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`
  pipelineLogEntries = [
    `[${timestamp}] ${message}${suffix}`,
    ...pipelineLogEntries,
  ].slice(0, 400)
}

function clearPipelineLog() {
  pipelineLogEntries = []
  saveMessage = 'Cleared pipeline log'
}

async function copyPipelineLog() {
  const text = pipelineLogEntries.slice().reverse().join('\n')
  await navigator.clipboard.writeText(text)
  saveMessage = 'Copied pipeline log to clipboard'
}

const unsubState = editorStateStore.subscribe(value => {
  editorState = value
})
const unsubNodes = editorNodesStore.subscribe(value => {
  editorNodes = value
})
const unsubScene = editorSceneStore.subscribe(value => {
  editorScene = value
})
const unsubRegistry = levelRegistryStore.subscribe(value => {
  levelRegistryEntries = value
})
const unsubViewportState = editorNodeViewportStateStore.subscribe(value => {
  nodeViewportStateById = value
})
const unsubSelected = selectedEditorNodeStore.subscribe(value => {
  selectedNode = value
})
const unsubSelectedNodes = selectedEditorNodesStore.subscribe(value => {
  selectedNodes = value
})
const unsubCanUndo = canUndoStore.subscribe(value => {
  canUndo = value
})
const unsubCanRedo = canRedoStore.subscribe(value => {
  canRedo = value
})
const unsubRuntimeAssetFailures = runtimeAssetFailuresStore.subscribe(value => {
  runtimeAssetFailures = value
})

const assetOptions = [
  {
    label: 'Hanging Light',
    url: '/models/polyhaven/caged_hanging_light/caged_hanging_light_1k.gltf',
  },
  {
    label: 'Aircon Unit',
    url: '/models/polyhaven/exterior_aircon_unit/exterior_aircon_unit_1k.gltf',
  },
  { label: 'Barrel', url: '/models/polyhaven/Barrel_01/Barrel_01_1k.gltf' },
  {
    label: 'Concrete Barrier',
    url: '/models/polyhaven/concrete_road_barrier_02/concrete_road_barrier_02_1k.gltf',
  },
]

function getNodeDepth(node: EditorSceneNode, allNodes: EditorSceneNode[]) {
  let depth = 0
  let currentParentId = node.parentId ?? null
  while (currentParentId) {
    const parent = allNodes.find(candidate => candidate.id === currentParentId)
    if (!parent) break
    depth += 1
    currentParentId = parent.parentId ?? null
    if (depth > 32) break
  }
  return depth
}

function flattenNodes(nodes: EditorSceneNode[]) {
  const result: EditorSceneNode[] = []
  const visit = (parentId: string | null, depth: number) => {
    const children = nodes.filter(node => (node.parentId ?? null) === parentId)
    for (const child of children) {
      result.push({ ...child, __depth: depth } as EditorSceneNode & {
        __depth: number
      })
      visit(child.id, depth + 1)
    }
  }
  visit(null, 0)
  return result as Array<EditorSceneNode & { __depth: number }>
}

const outlinerModeOptions = OUTLINER_MODE_OPTIONS

const outlinerController = createEditorOutlinerController({
  getEditorNodes: () => editorNodes,
  getEditorState: () => editorState,
  getOutlinerDisplayMode: () => outlinerDisplayMode,
  setOutlinerDisplayMode: mode => {
    outlinerDisplayMode = mode
  },
  getOutlinerExpandedIdsByMode: () => outlinerExpandedIdsByMode,
  setOutlinerExpandedIdsByMode: value => {
    outlinerExpandedIdsByMode = value
  },
  getOutlinerVisibleNodeOrder: () => outlinerVisibleNodeOrder,
  selectEditorNode,
  setSelectedNodes,
  patchNodes,
  clearIsolatedNodes,
  setIsolatedNodes,
  getDraggedHierarchyNodeIds: () => draggedHierarchyNodeIds,
  setDraggedHierarchyNodeIds: nodeIds => {
    draggedHierarchyNodeIds = nodeIds
  },
  getDragSelectionIds: () => dragSelectionIds,
  setHierarchyDropTargetId: nodeId => {
    hierarchyDropTargetId = nodeId
  },
  setHierarchyRootDropActive: active => {
    hierarchyRootDropActive = active
  },
  reparentNodes,
  setSaveMessage: message => {
    saveMessage = message
  },
})

const createController = createEditorCreateController({
  getSelectedNode: () => selectedNode,
  getSelectedNodes: () => selectedNodes,
  getEditorNodes: () => editorNodes,
  getActiveSceneLevelId: () => activeSceneLevelId,
  setSaveMessage: message => {
    saveMessage = message
  },
  addNode,
  addEmptyNode,
  setSelectedNodes,
  groupNodes,
  ungroupNodes,
  duplicateNodes,
  removeNodes,
  editorPrefabs,
})

const levelController = createEditorLevelController({
  getEditorSceneStore: () => editorSceneStore,
  getLevelId: () => levelId,
  getActiveSceneLevelId: () => activeSceneLevelId,
  getLevelRegistryEntries: () => levelRegistryEntries,
  getMetadataState: () => ({
    metadataTitle,
    metadataStatus,
    metadataDeployed,
    metadataStarMapEnabled,
    metadataStarMapYear,
    metadataStarMapDescription,
    metadataSourceKind,
    metadataSourceComponentKey,
    saveAsTitle,
    saveAsLevelId,
    newLevelTitle,
    newLevelIdInput,
    newLevelTemplateId,
    importBuffer,
  }),
  setMetadataState: next => {
    if (next.metadataTitle !== undefined) metadataTitle = next.metadataTitle
    if (next.metadataStatus !== undefined) metadataStatus = next.metadataStatus
    if (next.metadataDeployed !== undefined)
      metadataDeployed = next.metadataDeployed
    if (next.metadataStarMapEnabled !== undefined)
      metadataStarMapEnabled = next.metadataStarMapEnabled
    if (next.metadataStarMapYear !== undefined)
      metadataStarMapYear = next.metadataStarMapYear
    if (next.metadataStarMapDescription !== undefined)
      metadataStarMapDescription = next.metadataStarMapDescription
    if (next.metadataSourceKind !== undefined)
      metadataSourceKind = next.metadataSourceKind
    if (next.metadataSourceComponentKey !== undefined)
      metadataSourceComponentKey = next.metadataSourceComponentKey
    if (next.saveAsTitle !== undefined) saveAsTitle = next.saveAsTitle
    if (next.saveAsLevelId !== undefined) saveAsLevelId = next.saveAsLevelId
    if (next.newLevelTitle !== undefined) newLevelTitle = next.newLevelTitle
    if (next.newLevelIdInput !== undefined)
      newLevelIdInput = next.newLevelIdInput
    if (next.newLevelTemplateId !== undefined)
      newLevelTemplateId = next.newLevelTemplateId
    if (next.importBuffer !== undefined) importBuffer = next.importBuffer
  },
  setSaveMessage: message => {
    saveMessage = message
  },
  setLevelRegistry,
  sanitizeLevelId,
  saveEditorSceneToLocalStorage,
  saveSceneToLocalStorage,
  exportSceneJson,
  importSceneJson,
  clearSelection,
  transitionToLevel: gameActions.transitionToLevel,
  createEmptyScene,
  setEditorScene,
})

const textureFilePattern = /\.(png|jpe?g|webp|gif|bmp|tga|avif)$/i

let styleController: ReturnType<typeof createEditorStyleController>
let aiController: ReturnType<typeof createEditorAiController>

const assetController = createEditorAssetController({
  state: {
    get assetBrowserPath() {
      return assetBrowserPath
    },
    set assetBrowserPath(value) {
      assetBrowserPath = value
    },
    get assetBrowserItems() {
      return assetBrowserItems
    },
    set assetBrowserItems(value) {
      assetBrowserItems = value
    },
    get assetBrowserFilter() {
      return assetBrowserFilter
    },
    set assetBrowserFilter(value) {
      assetBrowserFilter = value
    },
    get assetBrowserError() {
      return assetBrowserError
    },
    set assetBrowserError(value) {
      assetBrowserError = value
    },
    get assetBrowserLoading() {
      return assetBrowserLoading
    },
    set assetBrowserLoading(value) {
      assetBrowserLoading = value
    },
    get selectedLibraryItem() {
      return selectedLibraryItem
    },
    set selectedLibraryItem(value) {
      selectedLibraryItem = value
    },
    get textureBrowserPath() {
      return textureBrowserPath
    },
    set textureBrowserPath(value) {
      textureBrowserPath = value
    },
    get textureBrowserItems() {
      return textureBrowserItems
    },
    set textureBrowserItems(value) {
      textureBrowserItems = value
    },
    get textureBrowserError() {
      return textureBrowserError
    },
    set textureBrowserError(value) {
      textureBrowserError = value
    },
    get textureBrowserLoading() {
      return textureBrowserLoading
    },
    set textureBrowserLoading(value) {
      textureBrowserLoading = value
    },
    get workflowBrowserPath() {
      return workflowBrowserPath
    },
    set workflowBrowserPath(value) {
      workflowBrowserPath = value
    },
    get workflowBrowserItems() {
      return workflowBrowserItems
    },
    set workflowBrowserItems(value) {
      workflowBrowserItems = value
    },
    get workflowBrowserError() {
      return workflowBrowserError
    },
    set workflowBrowserError(value) {
      workflowBrowserError = value
    },
    get workflowBrowserLoading() {
      return workflowBrowserLoading
    },
    set workflowBrowserLoading(value) {
      workflowBrowserLoading = value
    },
    get selectedComfyWorkflowPath() {
      return selectedComfyWorkflowPath
    },
    set selectedComfyWorkflowPath(value) {
      selectedComfyWorkflowPath = value
    },
    get generatedVariantItems() {
      return generatedVariantItems
    },
    set generatedVariantItems(value) {
      generatedVariantItems = value
    },
    get generatedVariantLoading() {
      return generatedVariantLoading
    },
    set generatedVariantLoading(value) {
      generatedVariantLoading = value
    },
    get generatedVariantError() {
      return generatedVariantError
    },
    set generatedVariantError(value) {
      generatedVariantError = value
    },
    get selectedGeneratedVariantUrl() {
      return selectedGeneratedVariantUrl
    },
    set selectedGeneratedVariantUrl(value) {
      selectedGeneratedVariantUrl = value
    },
    get hunyuanStatus() {
      return hunyuanStatus
    },
    set hunyuanStatus(value) {
      hunyuanStatus = value
    },
    get hunyuanDetectedReferenceImageUrl() {
      return hunyuanDetectedReferenceImageUrl
    },
    set hunyuanDetectedReferenceImageUrl(value) {
      hunyuanDetectedReferenceImageUrl = value
    },
    get hunyuanReferenceImageUrl() {
      return hunyuanReferenceImageUrl
    },
    set hunyuanReferenceImageUrl(value) {
      hunyuanReferenceImageUrl = value
    },
    get hunyuanSupportsReplacement() {
      return hunyuanSupportsReplacement
    },
    set hunyuanSupportsReplacement(value) {
      hunyuanSupportsReplacement = value
    },
    get hunyuanSupportsTextureWrap() {
      return hunyuanSupportsTextureWrap
    },
    set hunyuanSupportsTextureWrap(value) {
      hunyuanSupportsTextureWrap = value
    },
    get hunyuanLastOutputUrl() {
      return hunyuanLastOutputUrl
    },
    set hunyuanLastOutputUrl(value) {
      hunyuanLastOutputUrl = value
    },
    get hunyuanLastResultSummary() {
      return hunyuanLastResultSummary
    },
    set hunyuanLastResultSummary(value) {
      hunyuanLastResultSummary = value
    },
    get hunyuanSelectionKey() {
      return hunyuanSelectionKey
    },
    set hunyuanSelectionKey(value) {
      hunyuanSelectionKey = value
    },
    get hunyuanInspectToken() {
      return hunyuanInspectToken
    },
    set hunyuanInspectToken(value) {
      hunyuanInspectToken = value
    },
  },
  assetLibraryRootGenerated: ASSET_LIBRARY_ROOT_GENERATED,
  defaultComfyWorkflowPath: DEFAULT_COMFY_WORKFLOW_PATH,
  textureFilePattern,
  getSelectedNode: () => selectedNode,
  getSelectedNodes: () => selectedNodes,
  getEditorNodes: () => editorNodes,
  getActiveSceneLevelId: () => activeSceneLevelId,
  getCanUseAiMeshStudio: canUseAiMeshStudio,
  getAiSourceName,
  getDefaultStyleDescriptor,
  getNodeTransformSnapshot: node =>
    styleController?.getNodeTransformSnapshot(node) ?? null,
  readJsonPayload,
  setRuntimeDiagnostic,
  reportRuntimeAssetFailure,
  appendPipelineLog,
  patchNode,
  patchNodes,
  addNode,
  removeNodes,
  startSceneTransaction,
  endSceneTransaction,
  addAssetPrefab: createController.addAssetPrefab,
  setActiveEditorTab: tab => {
    activeEditorTab = tab as EditorPanelTab
  },
  setSaveMessage: message => {
    saveMessage = message
  },
})

styleController = createEditorStyleController({
  state: {
    get styleSelectionKey() {
      return styleSelectionKey
    },
    set styleSelectionKey(value) {
      styleSelectionKey = value
    },
    get styleProfileName() {
      return styleProfileName
    },
    set styleProfileName(value) {
      styleProfileName = value
    },
    get stylePrompt() {
      return stylePrompt
    },
    set stylePrompt(value) {
      stylePrompt = value
    },
    get styleNegativePrompt() {
      return styleNegativePrompt
    },
    set styleNegativePrompt(value) {
      styleNegativePrompt = value
    },
    get styleLoraNotes() {
      return styleLoraNotes
    },
    set styleLoraNotes(value) {
      styleLoraNotes = value
    },
    get styleControlNetNotes() {
      return styleControlNetNotes
    },
    set styleControlNetNotes(value) {
      styleControlNetNotes = value
    },
    get styleReferenceImageUrl() {
      return styleReferenceImageUrl
    },
    set styleReferenceImageUrl(value) {
      styleReferenceImageUrl = value
    },
    get styleStatus() {
      return styleStatus
    },
    set styleStatus(value) {
      styleStatus = value
    },
    get styleInspectReport() {
      return styleInspectReport
    },
    set styleInspectReport(value) {
      styleInspectReport = value
    },
    get styleSourceSummary() {
      return styleSourceSummary
    },
    set styleSourceSummary(value) {
      styleSourceSummary = value
    },
    get styleWorkspaceManifestUrl() {
      return styleWorkspaceManifestUrl
    },
    set styleWorkspaceManifestUrl(value) {
      styleWorkspaceManifestUrl = value
    },
    get styleWorkspaceSourceAssetUrl() {
      return styleWorkspaceSourceAssetUrl
    },
    set styleWorkspaceSourceAssetUrl(value) {
      styleWorkspaceSourceAssetUrl = value
    },
    get styleGeneratedReferenceImageUrl() {
      return styleGeneratedReferenceImageUrl
    },
    set styleGeneratedReferenceImageUrl(value) {
      styleGeneratedReferenceImageUrl = value
    },
    get styleSimplifiedAssetUrl() {
      return styleSimplifiedAssetUrl
    },
    set styleSimplifiedAssetUrl(value) {
      styleSimplifiedAssetUrl = value
    },
    get styleBlenderExportPath() {
      return styleBlenderExportPath
    },
    set styleBlenderExportPath(value) {
      styleBlenderExportPath = value
    },
    get styleBlenderOpenCommand() {
      return styleBlenderOpenCommand
    },
    set styleBlenderOpenCommand(value) {
      styleBlenderOpenCommand = value
    },
    get styleSimplifyRatio() {
      return styleSimplifyRatio
    },
    set styleSimplifyRatio(value) {
      styleSimplifyRatio = value
    },
    get styleSimplifyError() {
      return styleSimplifyError
    },
    set styleSimplifyError(value) {
      styleSimplifyError = value
    },
    get styleBusy() {
      return styleBusy
    },
    set styleBusy(value) {
      styleBusy = value
    },
    get styleWorkspaceRestoreToken() {
      return styleWorkspaceRestoreToken
    },
    set styleWorkspaceRestoreToken(value) {
      styleWorkspaceRestoreToken = value
    },
    get styleBatchBusy() {
      return styleBatchBusy
    },
    set styleBatchBusy(value) {
      styleBatchBusy = value
    },
    get styleBatchStatus() {
      return styleBatchStatus
    },
    set styleBatchStatus(value) {
      styleBatchStatus = value
    },
    get styleBatchAbortRequested() {
      return styleBatchAbortRequested
    },
    set styleBatchAbortRequested(value) {
      styleBatchAbortRequested = value
    },
    get styleBatchStopIntent() {
      return styleBatchStopIntent
    },
    set styleBatchStopIntent(value) {
      styleBatchStopIntent = value
    },
    get styleBatchSelectionIds() {
      return styleBatchSelectionIds
    },
    set styleBatchSelectionIds(value) {
      styleBatchSelectionIds = value
    },
    get styleBatchNodeStatusById() {
      return styleBatchNodeStatusById
    },
    set styleBatchNodeStatusById(value) {
      styleBatchNodeStatusById = value
    },
    get styleBatchSession() {
      return styleBatchSession
    },
    set styleBatchSession(value) {
      styleBatchSession = value
    },
    get styleBatchResumePromise() {
      return styleBatchResumePromise
    },
    set styleBatchResumePromise(value) {
      styleBatchResumePromise = value
    },
    get styleBatchPendingResume() {
      return styleBatchPendingResume
    },
    set styleBatchPendingResume(value) {
      styleBatchPendingResume = value
    },
    get comfyUiApiUrl() {
      return comfyUiApiUrl
    },
    set comfyUiApiUrl(value) {
      comfyUiApiUrl = value
    },
    get hunyuanApiUrl() {
      return hunyuanApiUrl
    },
    set hunyuanApiUrl(value) {
      hunyuanApiUrl = value
    },
    get selectedComfyWorkflowPath() {
      return selectedComfyWorkflowPath
    },
    set selectedComfyWorkflowPath(value) {
      selectedComfyWorkflowPath = value
    },
    get hunyuanPrompt() {
      return hunyuanPrompt
    },
    set hunyuanPrompt(value) {
      hunyuanPrompt = value
    },
    get hunyuanReferenceImageUrl() {
      return hunyuanReferenceImageUrl
    },
    set hunyuanReferenceImageUrl(value) {
      hunyuanReferenceImageUrl = value
    },
    get hunyuanLastOutputUrl() {
      return hunyuanLastOutputUrl
    },
    set hunyuanLastOutputUrl(value) {
      hunyuanLastOutputUrl = value
    },
    get hunyuanLastFitReport() {
      return hunyuanLastFitReport
    },
    set hunyuanLastFitReport(value) {
      hunyuanLastFitReport = value
    },
    get hunyuanActiveJobId() {
      return hunyuanActiveJobId
    },
    set hunyuanActiveJobId(value) {
      hunyuanActiveJobId = value
    },
    get hunyuanBackendCanGenerate() {
      return hunyuanBackendCanGenerate
    },
    set hunyuanBackendCanGenerate(value) {
      hunyuanBackendCanGenerate = value
    },
    get hunyuanBackendCanRetexture() {
      return hunyuanBackendCanRetexture
    },
    set hunyuanBackendCanRetexture(value) {
      hunyuanBackendCanRetexture = value
    },
    get hunyuanBackendStatus() {
      return hunyuanBackendStatus
    },
    set hunyuanBackendStatus(value) {
      hunyuanBackendStatus = value
    },
    get hunyuanBusy() {
      return hunyuanBusy
    },
    set hunyuanBusy(value) {
      hunyuanBusy = value
    },
    get hunyuanServiceReady() {
      return hunyuanServiceReady
    },
    set hunyuanServiceReady(value) {
      hunyuanServiceReady = value
    },
    get hunyuanDetectedReferenceImageUrl() {
      return hunyuanDetectedReferenceImageUrl
    },
    set hunyuanDetectedReferenceImageUrl(value) {
      hunyuanDetectedReferenceImageUrl = value
    },
    get selectedGeneratedVariantUrl() {
      return selectedGeneratedVariantUrl
    },
    set selectedGeneratedVariantUrl(value) {
      selectedGeneratedVariantUrl = value
    },
    get selectedHunyuanJobId() {
      return selectedHunyuanJobId
    },
    set selectedHunyuanJobId(value) {
      selectedHunyuanJobId = value
    },
    get saveMessage() {
      return saveMessage
    },
    set saveMessage(value) {
      saveMessage = value
    },
  },
  getSelectedNode: () => selectedNode,
  getSelectedNodes: () => selectedNodes,
  getEditorNodes: () => editorNodes,
  getActiveSceneLevelId: () => activeSceneLevelId,
  getStyleSceneCandidates: () => styleSceneCandidates,
  canUseStyleStudio,
  getDefaultStyleDescriptor,
  getAiSourceName,
  ensureSceneNodeSourceAsset: assetController.ensureSceneNodeSourceAsset,
  readJsonPayload,
  appendPipelineLog,
  refreshGeneratedAssetLibrary: assetController.refreshGeneratedAssetLibrary,
  inspectSelectedAssetForHunyuan:
    assetController.inspectSelectedAssetForHunyuan,
  saveSceneDocumentToDisk: levelController.saveSceneDocumentToDisk,
  getCurrentScene: () => get(editorSceneStore),
  patchNode,
  queueHunyuanJob: (...args) => aiController.queueHunyuanJob(...args),
  waitForQueuedHunyuanJob: (...args) =>
    aiController.waitForQueuedHunyuanJob(...args),
  refreshHunyuanServiceStatus: (...args) =>
    aiController.refreshHunyuanServiceStatus(...args),
  refreshHunyuanRecentJobs: () => aiController.refreshHunyuanRecentJobs(),
  runHunyuanForSelection: (...args) =>
    aiController.runHunyuanForSelection(...args),
})

aiController = createEditorAiController({
  state: {
    get hunyuanApiUrl() {
      return hunyuanApiUrl
    },
    set hunyuanApiUrl(value) {
      hunyuanApiUrl = value
    },
    get comfyUiApiUrl() {
      return comfyUiApiUrl
    },
    set comfyUiApiUrl(value) {
      comfyUiApiUrl = value
    },
    get selectedComfyWorkflowPath() {
      return selectedComfyWorkflowPath
    },
    set selectedComfyWorkflowPath(value) {
      selectedComfyWorkflowPath = value
    },
    get hunyuanStatus() {
      return hunyuanStatus
    },
    set hunyuanStatus(value) {
      hunyuanStatus = value
    },
    get hunyuanBusy() {
      return hunyuanBusy
    },
    set hunyuanBusy(value) {
      hunyuanBusy = value
    },
    get hunyuanServiceReady() {
      return hunyuanServiceReady
    },
    set hunyuanServiceReady(value) {
      hunyuanServiceReady = value
    },
    get hunyuanBackendCanGenerate() {
      return hunyuanBackendCanGenerate
    },
    set hunyuanBackendCanGenerate(value) {
      hunyuanBackendCanGenerate = value
    },
    get hunyuanBackendCanRetexture() {
      return hunyuanBackendCanRetexture
    },
    set hunyuanBackendCanRetexture(value) {
      hunyuanBackendCanRetexture = value
    },
    get hunyuanBackendStatus() {
      return hunyuanBackendStatus
    },
    set hunyuanBackendStatus(value) {
      hunyuanBackendStatus = value
    },
    get hunyuanPrompt() {
      return hunyuanPrompt
    },
    set hunyuanPrompt(value) {
      hunyuanPrompt = value
    },
    get hunyuanReferenceImageUrl() {
      return hunyuanReferenceImageUrl
    },
    set hunyuanReferenceImageUrl(value) {
      hunyuanReferenceImageUrl = value
    },
    get hunyuanScratchName() {
      return hunyuanScratchName
    },
    set hunyuanScratchName(value) {
      hunyuanScratchName = value
    },
    get hunyuanScratchReferenceImageUrl() {
      return hunyuanScratchReferenceImageUrl
    },
    set hunyuanScratchReferenceImageUrl(value) {
      hunyuanScratchReferenceImageUrl = value
    },
    get hunyuanScratchPrompt() {
      return hunyuanScratchPrompt
    },
    set hunyuanScratchPrompt(value) {
      hunyuanScratchPrompt = value
    },
    get hunyuanLastFitReport() {
      return hunyuanLastFitReport
    },
    set hunyuanLastFitReport(value) {
      hunyuanLastFitReport = value
    },
    get hunyuanLastOutputUrl() {
      return hunyuanLastOutputUrl
    },
    set hunyuanLastOutputUrl(value) {
      hunyuanLastOutputUrl = value
    },
    get hunyuanLastResultSummary() {
      return hunyuanLastResultSummary
    },
    set hunyuanLastResultSummary(value) {
      hunyuanLastResultSummary = value
    },
    get hunyuanSupportsReplacement() {
      return hunyuanSupportsReplacement
    },
    set hunyuanSupportsReplacement(value) {
      hunyuanSupportsReplacement = value
    },
    get hunyuanSupportsTextureWrap() {
      return hunyuanSupportsTextureWrap
    },
    set hunyuanSupportsTextureWrap(value) {
      hunyuanSupportsTextureWrap = value
    },
    get hunyuanDetectedReferenceImageUrl() {
      return hunyuanDetectedReferenceImageUrl
    },
    set hunyuanDetectedReferenceImageUrl(value) {
      hunyuanDetectedReferenceImageUrl = value
    },
    get hunyuanActiveJobId() {
      return hunyuanActiveJobId
    },
    set hunyuanActiveJobId(value) {
      hunyuanActiveJobId = value
    },
    get hunyuanJobsLoading() {
      return hunyuanJobsLoading
    },
    set hunyuanJobsLoading(value) {
      hunyuanJobsLoading = value
    },
    get hunyuanJobsError() {
      return hunyuanJobsError
    },
    set hunyuanJobsError(value) {
      hunyuanJobsError = value
    },
    get recentHunyuanJobs() {
      return recentHunyuanJobs
    },
    set recentHunyuanJobs(value) {
      recentHunyuanJobs = value
    },
    get selectedHunyuanJobId() {
      return selectedHunyuanJobId
    },
    set selectedHunyuanJobId(value) {
      selectedHunyuanJobId = value
    },
    get comfyUiBusy() {
      return comfyUiBusy
    },
    set comfyUiBusy(value) {
      comfyUiBusy = value
    },
    get comfyUiReady() {
      return comfyUiReady
    },
    set comfyUiReady(value) {
      comfyUiReady = value
    },
    get comfyUiStatus() {
      return comfyUiStatus
    },
    set comfyUiStatus(value) {
      comfyUiStatus = value
    },
    get comfyWorkflowEditorStatus() {
      return comfyWorkflowEditorStatus
    },
    set comfyWorkflowEditorStatus(value) {
      comfyWorkflowEditorStatus = value
    },
    get saveMessage() {
      return saveMessage
    },
    set saveMessage(value) {
      saveMessage = value
    },
  },
  getSelectedNode: () => selectedNode,
  getEditorNodes: () => editorNodes,
  getSelectedLibraryItem: () => selectedLibraryItem,
  getActiveSceneLevelId: () => activeSceneLevelId,
  canUseAiMeshStudio,
  getAiReplacementTargetIds,
  getAiSourceName,
  getDefaultStyleDescriptor,
  ensureSceneNodeSourceAsset: assetController.ensureSceneNodeSourceAsset,
  getSceneNodeVisualBounds: styleController.getSceneNodeVisualBounds,
  fitGeneratedAssetToSource: styleController.fitGeneratedAssetToSource,
  readJsonPayload,
  refreshGeneratedAssetLibrary: assetController.refreshGeneratedAssetLibrary,
  inspectSelectedAssetForHunyuan:
    assetController.inspectSelectedAssetForHunyuan,
  saveSceneDocumentToDisk: levelController.saveSceneDocumentToDisk,
  setRuntimeDiagnostic,
  appendPipelineLog,
  patchNode,
  addNode,
  getSelectedLibraryItemUrl: assetController.getSelectedLibraryItemUrl,
  getSelectedLibraryItemName: assetController.getSelectedLibraryItemName,
  getNodeTransformSnapshot: styleController.getNodeTransformSnapshot,
})

const inspectorController = createEditorInspectorController({
  getSelectedNode: () => selectedNode,
  getSelectedNodes: () => selectedNodes,
  getEditorNodes: () => editorNodes,
  patchNode,
  reparentNodes,
  selectEditorNode,
  setSaveMessage: message => {
    saveMessage = message
  },
  updateNodeStyleDescriptor,
  getNodeVisualColliderSize,
  getTextureBrowserPath: () => textureBrowserPath,
  getTextureBrowserItems: () => textureBrowserItems,
  getTextureBrowserLoading: () => textureBrowserLoading,
  getActiveTextureMaterialField: () => activeTextureMaterialField,
  setActiveTextureMaterialField: field => {
    activeTextureMaterialField = field
  },
  loadTextureBrowser: assetController.loadTextureBrowser,
  resolvePublicAssetUrl: assetController.resolvePublicAssetUrl,
  getAssetBrowserPath: () => assetBrowserPath,
  getSelectedLibraryItem: () => selectedLibraryItem,
  setSelectedLibraryItem: item => {
    selectedLibraryItem = item
  },
  setAssetBrowserFilter: value => {
    assetBrowserFilter = value
  },
  loadAssetBrowser: assetController.loadAssetBrowser,
  setAssetPickerTargetNodeId: nodeId => {
    assetPickerTargetNodeId = nodeId
  },
  getAssetPickerTargetNodeId: () => assetPickerTargetNodeId,
  setActiveEditorTab: tab => {
    activeEditorTab = tab
  },
  setHunyuanSelectionKey: value => {
    hunyuanSelectionKey = value
  },
  setLastInspectedHunyuanAsset: value => {
    lastInspectedHunyuanAsset = value
  },
  inspectSelectedAssetForHunyuan:
    assetController.inspectSelectedAssetForHunyuan,
  setSelectedGeneratedVariantUrl: assetUrl => {
    selectedGeneratedVariantUrl = assetUrl
  },
  setHunyuanLastOutputUrl: assetUrl => {
    hunyuanLastOutputUrl = assetUrl
  },
})

$: flattenedNodes = flattenNodes(editorNodes)
$: filteredFlattenedNodes = flattenedNodes.filter(node => {
  const query = hierarchyFilter.trim().toLowerCase()
  if (!query) return true

  const prefabType = node.prefab?.type?.toLowerCase() ?? ''
  const gameplayType = node.gameplay?.type?.toLowerCase() ?? ''
  const assetUrl = node.asset?.url?.toLowerCase() ?? ''

  return (
    node.name.toLowerCase().includes(query) ||
    node.kind.toLowerCase().includes(query) ||
    prefabType.includes(query) ||
    gameplayType.includes(query) ||
    assetUrl.includes(query)
  )
})
$: outlinerRootItems = buildOutlinerItems({
  mode: outlinerDisplayMode,
  levelId: activeSceneLevelId,
  nodes: editorNodes,
  scene: editorScene,
  selectedNode,
  nodeViewportStateById,
})
$: if (editorNodes.length > 0) {
  outlinerController.ensureExpandedState('view-layer')
  outlinerController.ensureExpandedState('collections')
}
$: outlinerRows = flattenOutlinerItems(
  outlinerRootItems,
  hierarchyFilter,
  getOutlinerExpandedIds(outlinerExpandedIdsByMode, outlinerDisplayMode),
)
$: outlinerVisibleNodeOrder = Array.from(
  new Set(outlinerRows.map(row => row.nodeId).filter(Boolean) as string[]),
)
$: hasGroupSelection = selectedNodes.some(node => node.kind === 'group')
$: levelSettings = editorScene?.settings?.level ?? {}
$: observatorySettings = editorScene?.settings?.observatory ?? {}
$: solitudeSettings = editorScene?.settings?.solitude ?? {}
$: effectiveObservatorySettings =
  resolveObservatoryPresetSettings(
    mergeLevelSettings(levelSettings, observatorySettings),
  ) ?? {}
$: effectiveSolitudeSettings =
  resolveSolitudePresetSettings(
    mergeLevelSettings(levelSettings, solitudeSettings),
  ) ?? {}
$: selectedNodeMaterial = getSelectedNodeMaterialDefaults(selectedNode)
$: selectedParentCandidates = editorNodes.filter(
  node => node.id !== selectedNode?.id,
)
$: multiSelectionParentCandidates = editorNodes.filter(
  node => !selectedNodes.some(selected => selected.id === node.id),
)
$: selectedNodeStyleDescriptor = getDefaultStyleDescriptor(selectedNode)
$: selectedNodeColliderSize = getNodeVisualColliderSize(selectedNode)
$: canUseStyleStudioSelection = canUseStyleStudio(selectedNode)
$: canUseAiMeshStudioSelection = canUseAiMeshStudio(selectedNode)
$: selectedLibraryItemPath = selectedLibraryItem?.path ?? ''
$: selectedLibraryItemUrl = assetController.getSelectedLibraryItemUrl()
$: assetPickerTargetName =
  editorNodes.find(node => node.id === assetPickerTargetNodeId)?.name ?? ''
$: canWorkflowShowAll =
  editorNodes.some(node => !node.visible) ||
  (editorState?.isolatedNodeIds.length ?? 0) > 0
$: dragSelectionIds = selectedNodes.map(node => node.id)
$: pendingLevelId = levelId
$: activeSceneLevelId = editorScene?.levelId ?? levelId
$: editorLevelOptions = levelRegistryEntries.map(entry => ({
  id: entry.id,
  label: entry.title,
  status: entry.status,
  deployed: entry.deployed,
}))
$: activeLevelRegistryEntry =
  levelRegistryEntries.find(entry => entry.id === activeSceneLevelId) ?? null

$: if (activeSceneLevelId && loadedMetadataLevelId !== activeSceneLevelId) {
  const entry = activeLevelRegistryEntry
  metadataTitle = entry?.title ?? activeSceneLevelId
  metadataStatus = entry?.status ?? 'draft'
  metadataDeployed = entry?.deployed ?? false
  metadataStarMapEnabled = entry?.starMap?.enabled ?? false
  metadataStarMapYear = entry?.starMap?.year ?? 2100
  metadataStarMapDescription =
    entry?.starMap?.description ?? `Enter ${entry?.title ?? activeSceneLevelId}`
  metadataSourceKind = entry?.source.kind ?? 'scene'
  metadataSourceComponentKey =
    entry?.source.kind === 'component'
      ? entry.source.componentKey
      : 'observatory'
  loadedMetadataLevelId = activeSceneLevelId
}

let draggedHierarchyNodeIds: string[] = []
let hierarchyDropTargetId: string | null = null
let hierarchyRootDropActive = false

const observatoryStylePresets: EditorStylePreset[] = [
  'site',
  'surreal-site',
  'ghibli',
  'alto',
  'monument',
  'retro',
]
const ambientAudioLibrary = [
  { label: 'Portal Deck', src: '/audio/ambient/portal-deck.mp3' },
  {
    label: 'Wicked Shadows Whisper',
    src: '/audio/ambient/Wicked Shadows Whisper.mp3',
  },
  { label: 'Shadow Waltz', src: '/audio/ambient/Shadow Waltz.mp3' },
  {
    label: 'Dark Shadows of Delight',
    src: '/audio/ambient/Dark Shadows of Delight.mp3',
  },
  { label: 'Meta 3', src: '/audio/ambient/meta_3.mp3' },
  { label: 'Whistling Dreams', src: '/audio/ambient/Whistling Dreams.mp3' },
  { label: 'Piano Synth', src: '/audio/ambient/piano synth.mp3' },
  { label: 'Faster', src: '/audio/ambient/Faster.mp3' },
  {
    label: 'Retro Video Game',
    src: '/audio/ambient/retro video game, new age, electric guitar fake.mp3',
  },
  { label: 'Untitled', src: '/audio/ambient/Untitled.mp3' },
]

const stylePresetOptions = [
  {
    id: 'yggdrasil-abyssal-neon',
    label: 'Yggdrasil · Abyssal Neon Horror',
    prompt:
      'extremely dark cosmic horror sacred material, blackened ancient, abyssal rune-carved, magenta and violet neon fissures, cold pink-purple emissive veins, starless depth, drowned shrine surfaces, monumental age, painterly but legible, strong silhouette hierarchy, selective luminous accents only, uncanny sacred dread',
    negativePrompt: '',
    loraNotes:
      'Favor blackened, abyssal , violet-magenta rune glow, cosmic dread, monumental sacred architecture, and Norse myth gravitas over generic fantasy prettiness.',
    controlNetNotes:
      'Preserve silhouette, traversal readability, climbability, collision anchors, route legibility, and the overwhelming mass of the world-tree. Keep emissive accents selective so the magenta and violet lights feel rare and ominous.',
  },
  {
    id: 'yggdrasil-sacred-natural',
    label: 'Yggdrasil · Sacred Mythic Natural',
    prompt:
      'ancient sacred material language, weathered cosmic wood, rune-carved stone, moss, lichen, cold mist, restrained gold accents, monumental age, painterly but grounded, cohesive mythic surfaces, reverent atmosphere, carved history, readable forms',
    negativePrompt: '',
    loraNotes:
      'Lean toward mythic Scandinavian sacred landscape and old ritual craft rather than generic high fantasy prettiness.',
    controlNetNotes:
      'Preserve silhouette, climbability, collision readability, path readability, and landmark hierarchy.',
  },
  {
    id: 'painterly-storybook',
    label: 'Painterly Storybook',
    prompt:
      'hand-painted storybook environment art, unified surface language, stylized materials, painterly wear, broad readable forms',
    negativePrompt: '',
    loraNotes: '',
    controlNetNotes:
      'Preserve silhouette and major surface breakup from the source asset.',
  },
  {
    id: 'ruin-cathedral-neon',
    label: 'Ruin Cathedral · Neon Rune',
    prompt:
      'dark ruin cathedral environment, sacred stone, fractured monoliths, magenta and cyan emissive rune channels, cold volumetric haze, monumental forms, restrained sci-fantasy glow, painterly surfaces',
    negativePrompt: '',
    loraNotes: 'Emphasize rune emissives and monumental ruin silhouettes.',
    controlNetNotes:
      'Preserve landmark readability and broad architecture masses.',
  },
]

const editorPanelTabs: Array<{
  id: EditorPanelTab
  icon: string
  label: string
}> = [
  { id: 'workflow', icon: '→', label: 'Workflow' },
  { id: 'scene', icon: '◫', label: 'Scene' },
  { id: 'environment', icon: '☼', label: 'Environment' },
  { id: 'player', icon: '⚑', label: 'Player' },
  { id: 'create', icon: '+', label: 'Create' },
  { id: 'inspect', icon: '⌕', label: 'Inspect' },
  { id: 'style', icon: '✎', label: 'Style' },
  { id: 'ai', icon: '✦', label: 'AI Mesh' },
  { id: 'save', icon: '↧', label: 'Save' },
]

function setActiveEditorTab(tab: EditorPanelTab) {
  activeEditorTab = tab
  if (tab === 'ai') {
    void ensureEditorAIMeshStudio()
  } else if (tab === 'style') {
    void ensureEditorStyleStudio()
  }
  requestAnimationFrame(() => {
    editorTabContentElement?.scrollTo({ top: 0, behavior: 'auto' })
  })
}

async function ensureEditorAIMeshStudio() {
  if (editorAIMeshStudioComponent) return

  if (!editorAIMeshStudioPromise) {
    editorAIMeshStudioPromise = import('./EditorAIMeshStudio.svelte').then(
      module => {
        editorAIMeshStudioComponent = module.default
      },
    )
  }

  await editorAIMeshStudioPromise
}

async function ensureEditorStyleStudio() {
  if (editorStyleStudioComponent) return

  if (!editorStyleStudioPromise) {
    editorStyleStudioPromise = import('./EditorStyleStudio.svelte').then(
      module => {
        editorStyleStudioComponent = module.default
      },
    )
  }

  await editorStyleStudioPromise
}

$: if (
  editorState?.panelOpen &&
  editorTabContentElement &&
  activeEditorTab !== lastScrolledTab
) {
  lastScrolledTab = activeEditorTab
  requestAnimationFrame(() => {
    editorTabContentElement?.scrollTo({ top: 0, behavior: 'auto' })
  })
}

const createQuickNodeActions = [
  { label: 'Empty', action: () => createController.addEmpty() },
  { label: 'Box', action: () => addRawPrimitive() },
  {
    label: 'Light',
    action: () => createController.addPrimitivePrefab('light'),
  },
  {
    label: 'Marker',
    action: () => createController.addPrimitivePrefab('marker'),
  },
  {
    label: 'NPC Firefly',
    action: () => createController.addPrimitivePrefab('firefly'),
  },
  {
    label: 'Audio Region',
    action: () => createController.addPrimitivePrefab('audio-region'),
  },
  {
    label: 'Fog Volume',
    action: () => createController.addPrimitivePrefab('fog-volume'),
  },
  {
    label: 'Mist Region',
    action: () => createController.addPrimitivePrefab('mist-region'),
  },
]

const createPrefabGroups = [
  {
    label: 'Sci-Fi / Tech',
    items: [
      {
        label: 'Anomaly Cluster',
        type: 'anomaly-cluster' as const,
        position: [0, 2, 0] as [number, number, number],
      },
      {
        label: 'Command Console',
        type: 'command-console' as const,
        position: [0, 0, 0] as [number, number, number],
      },
      {
        label: 'Command Fin',
        type: 'command-fin' as const,
        position: [0, 0, 0] as [number, number, number],
      },
      {
        label: 'Support Column',
        type: 'support-column' as const,
        position: [0, 0, 0] as [number, number, number],
      },
      {
        label: 'Hanging Light',
        type: 'hanging-light' as const,
        position: [0, 0, 0] as [number, number, number],
      },
    ],
  },
  {
    label: 'Architecture / World',
    items: [
      {
        label: 'Interior Archway',
        type: 'interior-archway' as const,
        position: [0, 0, 0] as [number, number, number],
      },
      {
        label: 'Courtyard Pylon',
        type: 'courtyard-pylon' as const,
        position: [0, 0, 0] as [number, number, number],
      },
      {
        label: 'Wasteland Archway',
        type: 'wasteland-archway' as const,
        position: [0, 0, 0] as [number, number, number],
      },
      {
        label: 'Portal Apparatus',
        type: 'portal-apparatus' as const,
        position: [0, 0, 0] as [number, number, number],
      },
    ],
  },
  {
    label: 'Ruins / Nature / Story',
    items: [
      {
        label: 'Story Marker',
        type: 'story-marker' as const,
        position: [0, 0, 0] as [number, number, number],
      },
      {
        label: 'Courtyard Fountain',
        type: 'courtyard-fountain' as const,
        position: [0, 0, 0] as [number, number, number],
      },
      {
        label: 'Observation Rig',
        type: 'observation-rig' as const,
        position: [0, 0, 0] as [number, number, number],
      },
      {
        label: 'Bench Growth',
        type: 'bench-growth' as const,
        position: [0, 0, 0] as [number, number, number],
      },
      {
        label: 'Growth Planter',
        type: 'growth-planter' as const,
        position: [0, 0, 0] as [number, number, number],
      },
      {
        label: 'Monolith',
        type: 'wasteland-monolith' as const,
        position: [0, 0, 0] as [number, number, number],
      },
      {
        label: 'Broken Ring',
        type: 'broken-ring' as const,
        position: [0, 0, 0] as [number, number, number],
      },
    ],
  },
]

function getAiSourceAssetUrl(node: EditorSceneNode | null) {
  if (node?.asset?.url) return node.asset.url
  return getPrefabAssetUrl(node?.prefab?.type)
}

function getAiSourceName(node: EditorSceneNode | null) {
  if (!node) return ''
  if (node.asset) return node.name
  if (node.prefab?.type)
    return EDITOR_PREFAB_GENERATION_LABELS[node.prefab.type] ?? node.name
  return node.name
}

function canUseAiMeshStudio(node: EditorSceneNode | null) {
  return canBakeSceneNode(node)
}

function canRetextureSelection(node: EditorSceneNode | null) {
  return !!getAiSourceAssetUrl(node)
}

function canUseStyleStudio(node: EditorSceneNode | null) {
  return canBakeSceneNode(node)
}

function getDefaultStyleDescriptor(node: EditorSceneNode | null) {
  return node ? inferNodeGenerationDescriptor(node) : ''
}

function updateNodeStyleDescriptor(nodeId: string, value: string) {
  const node = editorNodes.find(candidate => candidate.id === nodeId)
  if (!node) return
  patchNode(nodeId, {
    generation: {
      ...(node.generation ?? {}),
      descriptor: value,
    },
  })
}

function getStyleSceneCandidates(nodes: EditorSceneNode[]) {
  return nodes
    .filter(node => canBakeSceneNode(node))
    .map(node => ({
      id: node.id,
      name: node.name,
      kindLabel: node.asset
        ? 'Imported asset'
        : node.prefab
          ? `Prefab · ${node.prefab.type}`
          : node.primitive
            ? `Primitive · ${node.primitive.geometry}`
            : node.kind,
      descriptor: getDefaultStyleDescriptor(node),
      selected: styleBatchSelectionIds.includes(node.id),
      status: styleBatchNodeStatusById[node.id] ?? '',
    }))
}

function getCuratedStyleBatchCandidateIds(
  levelId: string,
  nodes: EditorSceneNode[],
) {
  const bakeableNodes = nodes.filter(node => canBakeSceneNode(node))
  if (levelId !== 'yggdrasil') {
    return bakeableNodes.map(node => node.id)
  }

  return bakeableNodes
    .filter(node => {
      if (node.gameplay) return false
      if (node.id === 'yggdrasil-spawn-pad') return false
      if (node.id.startsWith('yggdrasil-arrival-group')) return false
      if (node.id.startsWith('yggdrasil-crown-perch-group')) return false
      if (node.id.startsWith('yggdrasil-hvergelmir-depth-group')) return false
      if (node.prefab?.type === 'story-marker') return false
      if (node.prefab?.type === 'portal-apparatus') return false
      if (node.prefab?.type === 'observation-rig') return false
      return true
    })
    .map(node => node.id)
}

function handleHierarchySelection(nodeId: string, event: MouseEvent) {
  const additive = event.shiftKey
  const toggle = event.metaKey || event.ctrlKey
  const order = filteredFlattenedNodes.map(node => node.id)
  selectEditorNode(nodeId, {
    additive,
    toggle,
    rangeOrder: additive ? order : undefined,
  })
}

function getSimilarNodeIds(node: EditorSceneNode | null) {
  if (!node) return []

  if (node.prefab?.type) {
    return editorNodes
      .filter(candidate => candidate.prefab?.type === node.prefab?.type)
      .map(candidate => candidate.id)
  }

  if (node.asset?.url) {
    return editorNodes
      .filter(candidate => candidate.asset?.url === node.asset?.url)
      .map(candidate => candidate.id)
  }

  if (node.gameplay?.type) {
    return editorNodes
      .filter(candidate => candidate.gameplay?.type === node.gameplay?.type)
      .map(candidate => candidate.id)
  }

  return editorNodes
    .filter(candidate => candidate.kind === node.kind)
    .map(candidate => candidate.id)
}

function getSimilarNodeLabel(node: EditorSceneNode | null) {
  if (!node) return 'matching nodes'
  if (node.prefab?.type) return `${node.prefab.type} prefabs`
  if (node.asset?.url) return 'matching asset instances'
  if (node.gameplay?.type) return `${node.gameplay.type} helpers`
  return `${node.kind} nodes`
}

$: similarNodeIds = getSimilarNodeIds(selectedNode)
$: similarNodeCount = similarNodeIds.length
$: similarNodeLabel = getSimilarNodeLabel(selectedNode)
$: styleSceneCandidates =
  (styleBatchSelectionKey, getStyleSceneCandidates(editorNodes))

$: {
  const candidateIds = styleSceneCandidates.map(candidate => candidate.id)
  const retained = styleBatchSelectionIds.filter(id =>
    candidateIds.includes(id),
  )
  if (
    (!styleBatchSelectionInitialized ||
      (candidateIds.length > 0 &&
        retained.length === 0 &&
        styleBatchSelectionIds.length > 0)) &&
    candidateIds.length > 0
  ) {
    styleBatchSelectionIds = getCuratedStyleBatchCandidateIds(
      activeSceneLevelId,
      editorNodes,
    )
    styleBatchSelectionInitialized = true
  } else if (retained.length !== styleBatchSelectionIds.length) {
    styleBatchSelectionIds = retained
  } else if (candidateIds.length === 0) {
    styleBatchSelectionInitialized = false
  }
}

$: if (
  activeSceneLevelId === 'yggdrasil' &&
  styleLevelDefaultsAppliedFor !== activeSceneLevelId &&
  !styleBatchSession
) {
  styleProfileName = 'Abyssal Neon Cosmic Horror'
  stylePrompt =
    'extremely dark cosmic horror material, blackened ancient, abyssal rune-carved, magenta and violet neon fissures, cold pink-purple emissive veins, starless depth, drowned shrine surfaces, monumental age, painterly but legible, strong silhouette hierarchy, selective luminous accents only, uncanny sacred dread'
  styleNegativePrompt =
    'daylight, cheerful fantasy, bright saturated rainbow everywhere, literal tree branches replacing everything, photorealistic bark noise, modern clean architecture, sci-fi panels, plastic surfaces, glossy toy materials, cluttered microdetail, cozy forest, warm pastoral fantasy, cute bioluminescence'
  styleLoraNotes =
    'Favor blackened, abyssal, violet-magenta rune glow, cosmic dread, and monumental sacred'
  styleControlNetNotes =
    'Preserve silhouette, traversal readability, climbability, collision anchors, route legibility, and the overwhelming mass of the world-tree. Keep emissive accents selective so the magenta and violet lights feel rare and ominous.'
  styleBatchSelectionIds = getCuratedStyleBatchCandidateIds(
    activeSceneLevelId,
    editorNodes,
  )
  styleBatchSelectionInitialized = true
  styleLevelDefaultsAppliedFor = activeSceneLevelId
} else if (
  styleLevelDefaultsAppliedFor &&
  styleLevelDefaultsAppliedFor !== activeSceneLevelId
) {
  styleLevelDefaultsAppliedFor = ''
}

function selectAllStyleBatchCandidates() {
  styleBatchSelectionIds = styleSceneCandidates.map(candidate => candidate.id)
  styleBatchSelectionKey++
}

function clearStyleBatchCandidates() {
  styleBatchSelectionIds = []
  styleBatchSelectionKey++
}

function toggleStyleBatchCandidate(candidateId: string, selected: boolean) {
  if (selected) {
    if (!styleBatchSelectionIds.includes(candidateId)) {
      styleBatchSelectionIds = [...styleBatchSelectionIds, candidateId]
      styleBatchSelectionKey++
    }
    return
  }

  styleBatchSelectionIds = styleBatchSelectionIds.filter(
    id => id !== candidateId,
  )
  styleBatchSelectionKey++
}

function selectSimilarNodes() {
  if (!selectedNode) return

  const ids = getSimilarNodeIds(selectedNode)
  if (ids.length === 0) return

  const anchorId = ids.includes(selectedNode.id)
    ? selectedNode.id
    : ids[0] ?? null
  setSelectedNodes(ids, anchorId)
  saveMessage = `Selected ${ids.length} ${getSimilarNodeLabel(selectedNode)}`
}

function getAiReplacementTargetIds(node: EditorSceneNode | null) {
  if (!node) return []
  if (!hunyuanApplyToSimilarNodes) return [node.id]

  const ids = getSimilarNodeIds(node)
  return ids.length > 0 ? ids : [node.id]
}

function setNestedValue<T>(
  source: T,
  path: Array<string | number>,
  value: unknown,
): T {
  const next = structuredClone(source ?? {})
  let current: any = next
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index]
    const nextKey = path[index + 1]
    if (current[key] == null) {
      current[key] = typeof nextKey === 'number' ? [] : {}
    }
    current = current[key]
  }
  current[path[path.length - 1]] = value
  return next
}

function updateObservatorySetting(
  path: Array<string | number>,
  value: unknown,
) {
  updateObservatorySceneSettings(settings =>
    setNestedValue(settings, path, value),
  )
}

function updateObservatoryNumericSetting(
  path: Array<string | number>,
  value: string,
) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return
  updateObservatorySetting(path, numeric)
}

function updateLevelSetting(path: Array<string | number>, value: unknown) {
  updateLevelSceneSettings(settings => setNestedValue(settings, path, value))
}

function updateLevelNumericSetting(
  path: Array<string | number>,
  value: string,
) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return
  updateLevelSetting(path, numeric)
}

function applySolitudeAtmospherePreset(presetId: string | undefined) {
  const preset = presetId
    ? solitudeAtmospherePresets.find(entry => entry.id === presetId)
    : null

  updateLevelSceneSettings(settings => {
    if (!preset) {
      return setNestedValue(settings, ['presets', 'atmosphere'], presetId)
    }

    const nextSettings = structuredClone(settings)
    nextSettings.presets = {
      ...(nextSettings.presets ?? {}),
      atmosphere: presetId,
    }

    if (preset.settings.style) {
      nextSettings.style = structuredClone(preset.settings.style)
    }

    if (preset.settings.lighting) {
      nextSettings.lighting = structuredClone(preset.settings.lighting)
    }

    if (preset.settings.water) {
      nextSettings.water = structuredClone(preset.settings.water)
    }

    if (preset.settings.ambientParticles) {
      nextSettings.ambientParticles = structuredClone(
        preset.settings.ambientParticles,
      )
    }

    nextSettings.features = {
      ...(nextSettings.features ?? {}),
      styles:
        preset.settings.style?.enabled ?? nextSettings.features?.styles ?? true,
      water:
        preset.settings.water?.enabled ?? nextSettings.features?.water ?? false,
      ambientParticles:
        preset.settings.ambientParticles?.enabled ??
        nextSettings.features?.ambientParticles ??
        true,
    }

    return nextSettings
  })
}

function updateSolitudeSetting(path: Array<string | number>, value: unknown) {
  updateSolitudeSceneSettings(settings => setNestedValue(settings, path, value))
}

function updateSolitudeNumericSetting(
  path: Array<string | number>,
  value: string,
) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return
  updateSolitudeSetting(path, numeric)
}

function applyStylePreset(presetId: string) {
  const preset = stylePresetOptions.find(entry => entry.id === presetId)
  if (!preset) return

  styleProfileName = preset.label
  stylePrompt = preset.prompt
  styleNegativePrompt = preset.negativePrompt
  styleLoraNotes = preset.loraNotes
  styleControlNetNotes = preset.controlNetNotes
  styleStatus = `Loaded style preset: ${preset.label}`
  saveMessage = styleStatus
}

async function readJsonPayload(response: Response, context: string) {
  const rawText = await response.text()

  try {
    return rawText ? JSON.parse(rawText) : null
  } catch {
    const preview = rawText.trim().slice(0, 180) || '<empty response>'
    appendPipelineLog(`${context} returned non-JSON`, {
      status: response.status,
      preview,
    })
    throw new Error(
      `${context} returned non-JSON data (${response.status}). ${preview}`,
    )
  }
}

$: if (typeof window !== 'undefined' && selectedComfyWorkflowPath) {
  window.localStorage.setItem(
    'merkin:selected-comfy-workflow-path',
    selectedComfyWorkflowPath,
  )
}

$: if (typeof window !== 'undefined') {
  window.localStorage.setItem(
    PIPELINE_LOG_ENABLED_STORAGE_KEY,
    pipelineLogEnabled ? '1' : '0',
  )
  window.localStorage.setItem(
    PIPELINE_LOG_STORAGE_KEY,
    JSON.stringify(pipelineLogEntries),
  )
}

function getApplicableSelectionNodeIds() {
  if (selectedNodes.length > 0) {
    return selectedNodes
      .filter(node => canUseAiMeshStudio(node))
      .map(node => node.id)
  }

  if (selectedNode && canUseAiMeshStudio(selectedNode)) {
    return [selectedNode.id]
  }

  return []
}

$: canApplyGeneratedAssetToSelection =
  hunyuanLastOutputUrl !== '' && getApplicableSelectionNodeIds().length > 0

async function saveCurrentSceneToDisk() {
  await levelController.overwriteLevelScene()
}

$: selectedHunyuanJob =
  recentHunyuanJobs.find(job => job.id === selectedHunyuanJobId) ?? null
$: selectedNodePreviewAssetUrl =
  assetController.getSelectedNodePreviewAssetUrl(selectedNode)
$: workflowSelectionSummary =
  selectedNodes.length > 1
    ? `${selectedNodes.length} objects selected`
    : selectedNode
      ? `${selectedNode.name} selected`
      : 'No selection yet'
$: workflowCanGenerateSelection =
  !!selectedNode &&
  selectedNodes.length <= 1 &&
  canUseAiMeshStudio(selectedNode) &&
  hunyuanBackendCanGenerate &&
  hunyuanSupportsReplacement
$: workflowCanRetextureSelection =
  !!selectedNode &&
  selectedNodes.length <= 1 &&
  canRetextureSelection(selectedNode) &&
  hunyuanBackendCanRetexture &&
  hunyuanSupportsTextureWrap

$: {
  const shouldPollHunyuanJobs = activeEditorTab === 'ai'
  if (
    typeof window !== 'undefined' &&
    shouldPollHunyuanJobs &&
    hunyuanJobsPollInterval === null
  ) {
    void aiController.refreshHunyuanRecentJobs()
    hunyuanJobsPollInterval = window.setInterval(() => {
      void aiController.refreshHunyuanRecentJobs()
    }, 4000)
  } else if (
    (!shouldPollHunyuanJobs || typeof window === 'undefined') &&
    hunyuanJobsPollInterval !== null
  ) {
    window.clearInterval(hunyuanJobsPollInterval)
    hunyuanJobsPollInterval = null
  }
}

$: {
  const nextGeneratedVariantKey =
    selectedNode?.id && selectedNode?.asset?.url?.startsWith('/generated/')
      ? `${selectedNode.id}:${selectedNode.asset.url}`
      : ''

  if (
    nextGeneratedVariantKey &&
    nextGeneratedVariantKey !== generatedVariantSelectionKey
  ) {
    generatedVariantSelectionKey = nextGeneratedVariantKey
    void assetController.loadGeneratedVariantsForSelectedNode(selectedNode)
  } else if (!nextGeneratedVariantKey && generatedVariantSelectionKey) {
    generatedVariantSelectionKey = ''
    assetController.clearGeneratedVariantState()
  }
}

function addAssetFromBrowser(item: { name: string; path: string }) {
  assetController.addAssetFromBrowser(item)
}

function addLatestGeneratedAssetToScene() {
  if (!hunyuanLastOutputUrl) {
    saveMessage = 'No generated asset available yet'
    return
  }

  const assetName =
    hunyuanLastOutputUrl
      .split('/')
      .pop()
      ?.replace(/\.(gltf|glb)$/i, '') || 'Generated Asset'
  createController.addAssetPrefab(assetName, hunyuanLastOutputUrl, [1, 1, 1])
  saveMessage = `Added latest generated asset at scene scale: ${hunyuanLastOutputUrl}`
}

$: styleBatchResumeAvailable = !!styleBatchPendingResume && !styleBatchBusy
$: styleBatchResumeSummary = styleBatchPendingResume
  ? `Saved ${styleBatchPendingResume.mode === 'generate' ? 'mesh reimagine' : 'texture'} batch with ${styleBatchPendingResume.entries.length} objects from ${new Date(styleBatchPendingResume.updatedAt).toLocaleString()}`
  : ''

function updateTupleField(
  field: 'position' | 'rotation' | 'scale',
  index: number,
  value: string,
) {
  if (!selectedNode) return
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return

  const next = [...selectedNode[field]] as [number, number, number]
  next[index] = numeric
  patchNode(selectedNode.id, { [field]: next })
}

function toggleNodeVisibility(nodeId: string, event?: MouseEvent) {
  event?.preventDefault()
  event?.stopPropagation()
  const node = editorNodes.find(candidate => candidate.id === nodeId)
  if (!node) return
  patchNode(nodeId, { visible: !node.visible })
}

function toggleNodeLocked(nodeId: string, event?: MouseEvent) {
  event?.preventDefault()
  event?.stopPropagation()
  const node = editorNodes.find(candidate => candidate.id === nodeId)
  if (!node) return
  patchNode(nodeId, { locked: !(node.locked ?? false) })
}

function toggleNodeIsolation(nodeId: string, event?: MouseEvent) {
  event?.preventDefault()
  event?.stopPropagation()
  toggleIsolatedNode(nodeId)
}

function isolateSelection() {
  if (selectedNodes.length === 0) return
  setIsolatedNodes(selectedNodes.map(node => node.id))
}

function soloNode(nodeId: string, event?: MouseEvent) {
  event?.preventDefault()
  event?.stopPropagation()
  setIsolatedNodes([nodeId])
}

function unhideAllNodes() {
  const hiddenNodeIds = editorNodes
    .filter(node => !node.visible)
    .map(node => node.id)
  if (hiddenNodeIds.length === 0) return
  patchNodes(hiddenNodeIds, { visible: true })
}

function hideSelectedNodes() {
  const selectedIds = selectedNodes.map(node => node.id)
  if (selectedIds.length === 0) return
  patchNodes(selectedIds, { visible: false })
  clearSelection()
}

function unlockAllNodes() {
  const lockedNodeIds = editorNodes
    .filter(node => node.locked ?? false)
    .map(node => node.id)
  if (lockedNodeIds.length === 0) return
  patchNodes(lockedNodeIds, { locked: false })
}

function getSelectedNodeMaterialDefaults(
  node: EditorSceneNode | null,
): EditorMaterialData {
  if (!node) return {}

  if (node.primitive) {
    return {
      color: node.material?.color ?? node.primitive.color,
      mapUrl: node.material?.mapUrl,
      emissive: node.material?.emissive ?? node.primitive.emissive,
      emissiveMapUrl: node.material?.emissiveMapUrl,
      emissiveIntensity:
        node.material?.emissiveIntensity ?? node.primitive.emissiveIntensity,
      metalness: node.material?.metalness ?? node.primitive.metalness,
      metalnessMapUrl: node.material?.metalnessMapUrl,
      roughness: node.material?.roughness ?? node.primitive.roughness,
      roughnessMapUrl: node.material?.roughnessMapUrl,
      normalMapUrl: node.material?.normalMapUrl,
      alphaMapUrl: node.material?.alphaMapUrl,
      opacity: node.material?.opacity ?? node.primitive.opacity,
      transparent: node.material?.transparent ?? node.primitive.transparent,
      wireframe: node.material?.wireframe,
      doubleSided: node.material?.doubleSided,
      flatShading: node.material?.flatShading,
      envMapIntensity: node.material?.envMapIntensity,
      transmission: node.material?.transmission,
      ior: node.material?.ior,
      clearcoat: node.material?.clearcoat,
      clearcoatRoughness: node.material?.clearcoatRoughness,
      thickness: node.material?.thickness,
      reflectivity: node.material?.reflectivity,
    }
  }

  return node.material ?? {}
}

function getNodeVisualColliderSize(
  node: EditorSceneNode | null,
): [number, number, number] {
  if (!node) return [1, 1, 1]

  if (node.primitive?.geometry === 'box') {
    const [width = 1, height = 1, depth = 1] = node.primitive.args
    return [
      Math.max(0.05, Math.abs(width * node.scale[0])),
      Math.max(0.05, Math.abs(height * node.scale[1])),
      Math.max(0.05, Math.abs(depth * node.scale[2])),
    ]
  }

  return [
    Math.max(0.05, Math.abs(node.scale[0])),
    Math.max(0.05, Math.abs(node.scale[1])),
    Math.max(0.05, Math.abs(node.scale[2])),
  ]
}

function addRawPrimitive() {
  addNode({
    id: `primitive-${Date.now()}`,
    name: 'Primitive Box',
    kind: 'primitive',
    parentId: selectedNode?.id ?? null,
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    primitive: {
      geometry: 'box',
      args: [1, 1, 1],
      color: '#7ecbff',
      emissive: '#17384a',
      emissiveIntensity: 0.18,
      metalness: 0.65,
      roughness: 0.35,
    },
  })
}

$: if (selectedNode) {
  importBuffer = ''
}

$: {
  const nextSelectionKey = selectedNode?.id ?? ''

  if (nextSelectionKey !== hunyuanSelectionKey) {
    hunyuanSelectionKey = nextSelectionKey
    hunyuanPrompt = ''
    lastInspectedHunyuanAsset = ''
  }

  if (!canUseAiMeshStudio(selectedNode)) {
    hunyuanInspectToken += 1
    hunyuanDetectedReferenceImageUrl = ''
    hunyuanReferenceImageUrl = ''
    hunyuanSupportsReplacement = false
    hunyuanSupportsTextureWrap = false
    hunyuanLastOutputUrl = ''
    hunyuanServiceReady = false
    hunyuanStatus = selectedNode
      ? 'Hunyuan tools currently target geometry-backed nodes: imported assets, primitives, and prefabs.'
      : 'Select a single geometry node to generate or texture.'
  }
}

$: setRuntimeDiagnostic('selection', {
  level: selectedNodes.length > 1 ? 'warning' : selectedNode ? 'ready' : 'idle',
  message:
    selectedNodes.length > 1
      ? `${selectedNodes.length} nodes selected. AI tools require a single node.`
      : selectedNode
        ? `Selected node: ${selectedNode.name} (${selectedNode.kind}).`
        : 'No editor selection active.',
})

$: {
  const nextAssetUrl = getAiSourceAssetUrl(selectedNode)
  const inspectionKey =
    selectedNode?.id && nextAssetUrl ? `${selectedNode.id}:${nextAssetUrl}` : ''

  if (inspectionKey && inspectionKey !== lastInspectedHunyuanAsset) {
    lastInspectedHunyuanAsset = inspectionKey
    void assetController.inspectSelectedAssetForHunyuan(
      nextAssetUrl,
      selectedNode?.id ?? '',
    )
    void aiController.refreshHunyuanServiceStatus(false)
  } else if (!inspectionKey) {
    lastInspectedHunyuanAsset = ''
    if (selectedNode?.prefab || selectedNode?.primitive) {
      hunyuanDetectedReferenceImageUrl = ''
      hunyuanReferenceImageUrl = ''
      hunyuanSupportsReplacement = true
      hunyuanSupportsTextureWrap = false
      hunyuanLastOutputUrl = ''
      void aiController.refreshHunyuanServiceStatus(false)
      hunyuanStatus = `Ready to generate a new mesh for ${selectedNode.name}. Procedural nodes are exported to a temporary GLB before they enter the AI pipeline.`
    }
  }
}

$: {
  const nextStyleSelectionKey = selectedNode?.id ?? ''
  if (nextStyleSelectionKey !== styleSelectionKey) {
    styleSelectionKey = nextStyleSelectionKey
    styleWorkspaceRestoreToken += 1
    styleInspectReport = ''
    styleSourceSummary = ''
    styleWorkspaceManifestUrl = ''
    styleWorkspaceSourceAssetUrl = ''
    styleGeneratedReferenceImageUrl = ''
    styleSimplifiedAssetUrl = ''
    styleBlenderExportPath = ''
    styleBlenderOpenCommand = ''

    if (selectedNode && canUseStyleStudio(selectedNode)) {
      styleStatus = `Ready to prepare a style workspace for ${selectedNode.name}.`
      if (
        getAiSourceAssetUrl(selectedNode) &&
        hunyuanDetectedReferenceImageUrl
      ) {
        styleReferenceImageUrl = hunyuanDetectedReferenceImageUrl
      }
      if (!stylePrompt.trim()) {
        stylePrompt =
          'hand-painted storybook environment art, unified surface language, stylized materials, painterly wear, broad readable forms'
      }
      if (selectedNode.asset?.url) {
        void styleController.restoreLatestStyleWorkspaceForSelection(
          selectedNode.asset.url,
          selectedNode.id,
        )
      }
    } else {
      styleStatus = 'Select a single geometry node to open the style toolchain.'
      styleReferenceImageUrl = ''
    }
  }
}

$: if (
  selectedNode &&
  canUseStyleStudio(selectedNode) &&
  !styleReferenceImageUrl &&
  hunyuanDetectedReferenceImageUrl
) {
  styleReferenceImageUrl = hunyuanDetectedReferenceImageUrl
}

$: {
  const nextComfyUiStatusKey =
    activeEditorTab === 'ai' || activeEditorTab === 'style' ? comfyUiApiUrl : ''
  if (nextComfyUiStatusKey && nextComfyUiStatusKey !== comfyUiStatusKey) {
    comfyUiStatusKey = nextComfyUiStatusKey
    void aiController.refreshComfyUiServiceStatus(false)
  } else if (!nextComfyUiStatusKey) {
    comfyUiStatusKey = ''
  }
}

$: if (editorState?.dirty) {
  if (autoSaveTimeout !== null) {
    window.clearTimeout(autoSaveTimeout)
  }
  autoSaveTimeout = window.setTimeout(() => {
    saveSceneToLocalStorage(activeSceneLevelId)
    saveMessage = 'Autosaved locally'
    autoSaveTimeout = null
  }, 1200)
}

async function reloadFromDisk() {
  try {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-scene/load?levelId=${encodeURIComponent(activeSceneLevelId)}`,
    )
    const payload = await response.json()
    if (payload?.success && payload.scene) {
      setEditorScene(payload.scene)
      saveMessage = 'Reloaded from disk'
      return
    }
    saveMessage = 'No disk scene found'
  } catch (error) {
    console.error('Reload from disk failed:', error)
    saveMessage = 'Reload failed'
  }
}

function loadPackagedLevelScene() {
  setEditorScene(
    createDefaultSceneForLevel(activeSceneLevelId) ??
      createEmptyScene(activeSceneLevelId),
  )
  saveMessage = 'Loaded packaged scene from repo'
}

async function loadOriginalSnapshot() {
  try {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-scene/load?levelId=${encodeURIComponent(activeSceneLevelId)}&snapshot=original-packaged`,
    )
    const payload = await response.json()
    if (payload?.success && payload.scene) {
      setEditorScene(payload.scene)
      saveMessage = payload.snapshotFile
        ? `Loaded original snapshot ${payload.snapshotFile}`
        : 'Loaded original snapshot'
      return
    }
    saveMessage = `No original snapshot found for ${activeSceneLevelId}`
  } catch (error) {
    console.error('Original snapshot load failed:', error)
    saveMessage = 'Original snapshot load failed'
  }
}

async function loadBackupSnapshot() {
  try {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-scene/load?levelId=${encodeURIComponent(activeSceneLevelId)}&snapshot=latest-backup`,
    )
    const payload = await response.json()
    if (payload?.success && payload.scene) {
      setEditorScene(payload.scene)
      saveMessage = payload.snapshotFile
        ? `Loaded backup snapshot ${payload.snapshotFile}`
        : 'Loaded backup snapshot'
      return
    }
    saveMessage = `No backup snapshot found for ${activeSceneLevelId}`
  } catch (error) {
    console.error('Backup snapshot load failed:', error)
    saveMessage = 'Backup snapshot load failed'
  }
}

function switchEditorLevel() {
  if (!pendingLevelId) {
    saveMessage = 'Select a level'
    return
  }

  if (pendingLevelId === levelId) {
    saveMessage = 'Already on this level'
    return
  }

  if (autoSaveTimeout !== null) {
    window.clearTimeout(autoSaveTimeout)
    autoSaveTimeout = null
  }

  saveSceneToLocalStorage(activeSceneLevelId)
  clearSelection()
  saveMessage = `Switching to ${editorLevelOptions.find(option => option.id === pendingLevelId)?.label ?? pendingLevelId}`
  gameActions.transitionToLevel(pendingLevelId)
}

onMount(() => {
  if (typeof window !== 'undefined') {
    const savedWorkflowPath =
      window.localStorage.getItem('merkin:selected-comfy-workflow-path') || ''
    if (savedWorkflowPath) {
      selectedComfyWorkflowPath = savedWorkflowPath
    }
    pipelineLogEnabled =
      window.localStorage.getItem(PIPELINE_LOG_ENABLED_STORAGE_KEY) === '1'
    try {
      const savedLog = window.localStorage.getItem(PIPELINE_LOG_STORAGE_KEY)
      pipelineLogEntries = savedLog ? JSON.parse(savedLog) : []
    } catch {
      pipelineLogEntries = []
    }
  }
  void assetController.loadAssetBrowser(assetBrowserPath)
  void assetController.loadWorkflowBrowser(workflowBrowserPath)
  void levelController.refreshLevelRegistryFromDisk()
  void aiController.refreshHunyuanRecentJobs()

  if (typeof window !== 'undefined') {
    const persistedStyleBatch =
      loadStyleBatchSessionFromLocalStorage(activeSceneLevelId)
    if (persistedStyleBatch) {
      styleBatchSelectionIds = persistedStyleBatch.entries.map(
        entry => entry.nodeId,
      )
      styleBatchNodeStatusById = Object.fromEntries(
        persistedStyleBatch.entries.map(entry => [
          entry.nodeId,
          entry.error || entry.status,
        ]),
      )
      const hasOnlyTerminalEntries = persistedStyleBatch.entries.every(entry =>
        ['applied', 'failed', 'cancelled'].includes(entry.status),
      )
      if (hasOnlyTerminalEntries) {
        styleController.persistStyleBatchSession(null)
      } else {
        styleBatchPendingResume = persistedStyleBatch
        styleBatchStatus = `Found an interrupted ${persistedStyleBatch.mode === 'generate' ? 'mesh reimagine' : 'texture'} batch for ${persistedStyleBatch.entries.length} objects. Review prompts, then choose resume or discard.`
        saveMessage = styleBatchStatus
      }
    }
  }
})

onDestroy(() => {
  if (autoSaveTimeout !== null) {
    window.clearTimeout(autoSaveTimeout)
  }
  if (hunyuanJobsPollInterval !== null) {
    window.clearInterval(hunyuanJobsPollInterval)
  }
  unsubState()
  unsubNodes()
  unsubScene()
  unsubRegistry()
  unsubViewportState()
  unsubSelected()
  unsubSelectedNodes()
  unsubCanUndo()
  unsubCanRedo()
  unsubRuntimeAssetFailures()
})
</script>

{#if editorState?.enabled}
  <div class="editor-shell" class:collapsed={!editorState.panelOpen}>
    <div class="editor-header">
      <div class="editor-header-actions">
        <button class="collapse-btn" on:click={togglePropertiesShelfOpen} disabled={!editorState.panelOpen}>
          {editorState.propertiesShelfOpen ? 'Hide Shelf' : 'Show Shelf'}
        </button>
        <button class="collapse-btn" on:click={togglePanelOpen}>{editorState.panelOpen ? 'Collapse' : 'Open'}</button>
      </div>
    </div>

    {#if editorState.panelOpen}
      <div class="editor-body">
        <div class="editor-tools-panel">
          <div class="editor-tab-rail" aria-label="Editor sections">
            {#each editorPanelTabs as tab (tab.id)}
              <button
                class="editor-tab"
                class:active={activeEditorTab === tab.id}
                title={tab.label}
                aria-label={tab.label}
                on:click={() => setActiveEditorTab(tab.id)}
              >
                <span class="editor-tab-icon">{tab.icon}</span>
                <span class="editor-tab-label">{tab.label}</span>
              </button>
            {/each}
          </div>

          <div class="editor-tab-panel">
            <div class="editor-tab-content" bind:this={editorTabContentElement}>
      {#if activeEditorTab === 'workflow'}
      <EditorWorkflowPanel
        {workflowBrowserPath}
        {workflowBrowserItems}
        {workflowBrowserError}
        {workflowBrowserLoading}
        {selectedComfyWorkflowPath}
        {workflowSelectionSummary}
        bind:mergeDescriptor
        {selectedNode}
        {selectedNodes}
        {similarNodeCount}
        {comfyWorkflowEditorStatus}
        {hunyuanStatus}
        {hunyuanBusy}
        {workflowCanGenerateSelection}
        {workflowCanRetextureSelection}
        {canApplyGeneratedAssetToSelection}
        {hunyuanLastOutputUrl}
        {selectedHunyuanJob}
        canShowAll={canWorkflowShowAll}
        onResetWorkflowPath={assetController.resetSelectedWorkflowPath}
        onWorkflowBrowserUp={assetController.goUpWorkflowBrowser}
        onWorkflowBrowserRefresh={() => void assetController.loadWorkflowBrowser(workflowBrowserPath)}
        onSelectWorkflowItem={assetController.selectWorkflowPath}
        onOutlinerFocus={() => { hierarchyFilter = ''; saveMessage = 'Use the outliner at the top right for scene hierarchy.' }}
        onSelectSimilar={selectSimilarNodes}
        onAddFireflyToSelection={createController.addFireflyToSelection}
        onClearSelection={clearSelection}
        onHideSelected={hideSelectedNodes}
        onHideUnselected={isolateSelection}
        onShowAll={() => { unhideAllNodes(); clearIsolatedNodes() }}
        onMergeSelectionToAsset={() => void assetController.mergeSelectionToAsset(mergeDescriptor)}
        onGenerateSelection={() => void aiController.runHunyuanForSelection('generate')}
        onTextureSelection={() => void aiController.runHunyuanForSelection('texture')}
        onOpenAiTab={() => setActiveEditorTab('ai')}
        onRefreshBackend={() => void aiController.refreshHunyuanServiceStatus(true)}
        onEditGenerateWorkflow={() => void aiController.openComfyUiWorkflowEditor('generate')}
        onEditTextureWorkflow={() => void aiController.openComfyUiWorkflowEditor('texture')}
        onOpenGeneratedAssets={() => void assetController.openGeneratedAssetInLibrary()}
        onAddLatestGenerated={addLatestGeneratedAssetToScene}
        onApplyLatestToSelection={() => void assetController.applyGeneratedAssetToSelection()}
        onOpenAssetLibrary={() => setActiveEditorTab('create')}
        onSaveLocal={levelController.saveScene}
        onOverwriteLevel={() => void levelController.saveSceneDocumentToDisk(activeSceneLevelId)}
        onReloadDisk={reloadFromDisk}
        onOpenSaveTools={() => setActiveEditorTab('save')}
        onRefreshJobs={() => void aiController.refreshHunyuanRecentJobs()}
      />

      {/if}

      {#if activeEditorTab === 'scene'}
      <EditorSceneToolsPanel
        {levelId}
        bind:pendingLevelId
        {editorLevelOptions}
        bind:newLevelTitle
        bind:newLevelIdInput
        bind:newLevelTemplateId
        {canUndo}
        {canRedo}
        interactionMode={editorState.interactionMode}
        viewportLightingMode={editorState.viewportLightingMode}
        collisionOverlayEnabled={editorState.collisionOverlayEnabled}
        terrainBrushMode={editorState.terrainBrushMode}
        terrainBrushSize={editorState.terrainBrushSize}
        terrainBrushStrength={editorState.terrainBrushStrength}
        terrainBrushFalloff={editorState.terrainBrushFalloff}
        transformMode={editorState.transformMode}
        transformSpace={editorState.transformSpace}
        transformAxis={editorState.transformAxis}
        snappingEnabled={editorState.snappingEnabled}
        translateSnap={editorState.translateSnap}
        rotateSnap={editorState.rotateSnap}
        scaleSnap={editorState.scaleSnap}
        surfaceSnapEnabled={editorState.surfaceSnapEnabled}
        surfaceSnapOffset={editorState.surfaceSnapOffset}
        onUndo={() => { if (undoScene()) saveMessage = 'Undo' }}
        onRedo={() => { if (redoScene()) saveMessage = 'Redo' }}
        onSwitchLevel={switchEditorLevel}
        onCreateLevel={() => void levelController.createNewLevel()}
        onSetInteractionMode={(mode) => setEditorInteractionMode(mode as 'objects' | 'terrain')}
        onSetViewportLightingMode={(mode) => setEditorViewportLightingMode(mode as 'authored' | 'workbench')}
        onSetCollisionOverlayEnabled={setCollisionOverlayEnabled}
        onSetTerrainBrushMode={(mode) => setTerrainBrushMode(mode as 'raise' | 'smooth' | 'flatten')}
        onSetTerrainBrushSize={setTerrainBrushSize}
        onSetTerrainBrushStrength={setTerrainBrushStrength}
        onSetTerrainBrushFalloff={setTerrainBrushFalloff}
        onSetTransformMode={(mode) => setTransformMode(mode as 'translate' | 'rotate' | 'scale')}
        onSetTransformSpace={(mode) => setTransformSpace(mode as 'world' | 'local')}
        onSetTransformAxis={(axis) => setTransformAxis(axis as 'all' | 'x' | 'y' | 'z')}
        onSetSnappingEnabled={setSnappingEnabled}
        onSetTranslateSnap={setTranslateSnap}
        onSetRotateSnap={setRotateSnap}
        onSetScaleSnap={setScaleSnap}
        onSetSurfaceSnapEnabled={setSurfaceSnapEnabled}
        onSetSurfaceSnapOffset={setSurfaceSnapOffset}
      />

      {/if}

      {#if activeEditorTab === 'environment'}
      <EditorEnvironmentPanel
        {levelId}
        {levelSettings}
        {effectiveObservatorySettings}
        {effectiveSolitudeSettings}
        {observatoryStylePresets}
        {ambientAudioLibrary}
        {updateLevelSetting}
        {updateLevelNumericSetting}
        {updateObservatorySetting}
        {updateObservatoryNumericSetting}
        {applySolitudeAtmospherePreset}
      />

      {/if}

      {#if activeEditorTab === 'player'}
      <EditorPlayerPanel
        {levelId}
        {levelSettings}
        {updateLevelSetting}
        {updateLevelNumericSetting}
      />

      {/if}

      {#if activeEditorTab === 'create'}
      <EditorCreatePanel
        {createQuickNodeActions}
        {createPrefabGroups}
        {assetOptions}
        selectedNodesCount={selectedNodes.length}
        {hunyuanBusy}
        {hunyuanBackendCanGenerate}
        {hunyuanBackendCanRetexture}
        bind:hunyuanStatus
        bind:hunyuanPrompt
        bind:hunyuanReferenceImageUrl
        bind:hunyuanScratchName
        bind:hunyuanScratchReferenceImageUrl
        bind:hunyuanScratchPrompt
        {hunyuanDetectedReferenceImageUrl}
        {hunyuanLastOutputUrl}
        {assetBrowserPath}
        {assetBrowserItems}
        bind:assetBrowserFilter
        {assetBrowserError}
        {assetBrowserLoading}
        {selectedLibraryItem}
        selectedLibraryItemUrl={selectedLibraryItemUrl}
        {assetPickerTargetNodeId}
        assetPickerTargetName={assetPickerTargetName}
        generatedRootPath={ASSET_LIBRARY_ROOT_GENERATED}
        modelsRootPath={ASSET_LIBRARY_ROOT_MODELS}
        onAddFireflyToSelection={createController.addFireflyToSelection}
        onAddPrefab={(label, type, position) => createController.addPrefabWithParent(label, type as EditorPrefabType, position)}
        onAddCuratedAsset={createController.addAssetPrefab}
        onGenerateToLibrary={() => void aiController.runHunyuanToLibrary()}
        onGenerateAndAdd={() => void aiController.runHunyuanToLibrary({ addToScene: true })}
        onOpenGeneratedAssets={() => void assetController.openGeneratedAssetInLibrary()}
        onAddLatestGenerated={addLatestGeneratedAssetToScene}
        onSelectAssetLibraryRoot={inspectorController.selectAssetLibraryRoot}
        onAssetBrowserUp={inspectorController.goUpAssetBrowser}
        onAssetBrowserRefresh={() => void assetController.loadAssetBrowser(assetBrowserPath)}
        onCancelAssetPicker={inspectorController.cancelAssetPickerTarget}
        onSelectLibraryItem={inspectorController.selectLibraryItem}
        onAddSelectedLibraryAssetToScene={assetController.addSelectedLibraryAssetToScene}
        onInspectSelectedLibraryAsset={() => void assetController.inspectSelectedAssetForHunyuan(selectedLibraryItemUrl, selectedLibraryItem?.path ?? '')}
        onApplySelectedLibraryAsset={inspectorController.applySelectedLibraryAssetToTargetNode}
        onRunLibraryGenerate={() => void aiController.runHunyuanForLibraryAsset('generate')}
        onRunLibraryTexture={() => void aiController.runHunyuanForLibraryAsset('texture')}
      />

      {/if}

      {#if activeEditorTab === 'hierarchy'}
      <EditorHierarchyPanel
        bind:hierarchyFilter
        {selectedNodes}
        selectedNodeIds={editorState.selectedNodeIds}
        {filteredFlattenedNodes}
        {hierarchyRootDropActive}
        {hierarchyDropTargetId}
        {hasGroupSelection}
        isolatedNodeIds={editorState.isolatedNodeIds}
        hasHiddenNodes={editorNodes.some((node) => !node.visible)}
        hasLockedNodes={editorNodes.some((node) => node.locked ?? false)}
        {nodeViewportStateById}
        onFilterClear={() => { hierarchyFilter = '' }}
        onFilterChange={(value) => { hierarchyFilter = value }}
        onIsolateSelection={isolateSelection}
        onShowAll={clearIsolatedNodes}
        onSelectSimilar={selectSimilarNodes}
        onUnhideAll={unhideAllNodes}
        onUnlockAll={unlockAllNodes}
        onRootDragEnter={(event) => outlinerController.allowDrop(event, null)}
        onRootDragOver={(event) => outlinerController.allowDrop(event, null)}
        onRootDragLeave={() => { hierarchyRootDropActive = false; if (hierarchyDropTargetId === null) hierarchyDropTargetId = null }}
        onRootDrop={(event) => outlinerController.drop(event, null)}
        onNodeDragStart={(nodeId, event) => outlinerController.startDrag(nodeId, event)}
        onNodeDragEnd={outlinerController.clearDragState}
        onNodeDragEnter={(nodeId, event) => outlinerController.allowDrop(event, nodeId)}
        onNodeDragOver={(nodeId, event) => outlinerController.allowDrop(event, nodeId)}
        onNodeDragLeave={(nodeId) => { if (hierarchyDropTargetId === nodeId) hierarchyDropTargetId = null }}
        onNodeDrop={(nodeId, event) => outlinerController.drop(event, nodeId)}
        onNodeSelect={handleHierarchySelection}
        onToggleVisibility={toggleNodeVisibility}
        onToggleLocked={toggleNodeLocked}
        onSoloNode={soloNode}
        onToggleIsolation={toggleNodeIsolation}
        onGroupSelection={createController.groupSelection}
        onUngroupSelection={createController.ungroupSelection}
        onDuplicateSelection={createController.duplicateSelection}
        onDeleteSelection={createController.deleteSelection}
        onClearSelection={clearSelection}
      />

      {/if}

      {#if activeEditorTab === 'inspect'}
        <EditorInspectorForm
          {selectedNode}
          {selectedNodes}
          parentCandidates={selectedParentCandidates}
          multiParentCandidates={multiSelectionParentCandidates}
          {selectedNodeMaterial}
          {selectedNodeColliderSize}
          styleDescriptor={selectedNodeStyleDescriptor}
          {assetPickerTargetNodeId}
          {assetBrowserPath}
          {assetBrowserItems}
          {assetBrowserFilter}
          {assetBrowserError}
          {assetBrowserLoading}
          selectedLibraryItemPath={selectedLibraryItemPath}
          {activeTextureMaterialField}
          {textureBrowserPath}
          {textureBrowserItems}
          {textureBrowserError}
          {textureBrowserLoading}
          {ambientAudioLibrary}
          onNameChange={inspectorController.updateNodeName}
          onVisibleChange={inspectorController.updateVisible}
          onParentChange={inspectorController.updateParent}
          onPrefabVariantChange={inspectorController.updatePrefabVariant}
          onAssetUrlChange={inspectorController.updateAssetUrl}
          onOpenGeneratedAssetPicker={() => inspectorController.openAssetPickerForSelectedNode(ASSET_LIBRARY_ROOT_GENERATED)}
          onOpenImportedAssetPicker={() => inspectorController.openAssetPickerForSelectedNode(ASSET_LIBRARY_ROOT_MODELS)}
          onAssetLibraryRootSelect={inspectorController.selectAssetLibraryRoot}
          onAssetBrowserUp={inspectorController.goUpAssetBrowser}
          onAssetBrowserRefresh={() => void assetController.loadAssetBrowser(assetBrowserPath)}
          onAssetBrowserFilterChange={(value) => { assetBrowserFilter = value }}
          onAssetLibraryItemSelect={inspectorController.selectLibraryItem}
          onApplySelectedLibraryAsset={inspectorController.applySelectedLibraryAssetToTargetNode}
          onCancelAssetPicker={inspectorController.cancelAssetPickerTarget}
          onStyleDescriptorChange={inspectorController.updateSelectedNodeStyleDescriptor}
          onPrimitiveGeometryChange={(value) => inspectorController.updatePrimitiveField('geometry', value)}
          onPrimitiveArgChange={inspectorController.updatePrimitiveArg}
          onCollisionEnabledChange={inspectorController.updateCollisionEnabled}
          onPhysicsBodyTypeChange={(value) => inspectorController.updatePhysicsField('bodyType', value)}
          onPhysicsNumericChange={inspectorController.updatePhysicsNumericField}
          onPhysicsBooleanChange={inspectorController.updatePhysicsBooleanField}
          onCollisionSizeChange={inspectorController.updateCollisionSize}
          onCollisionNumericChange={inspectorController.updateCollisionNumericField}
          onCollisionBooleanChange={inspectorController.updateCollisionBooleanField}
          onRecalculateCollision={inspectorController.recalculateCollisionFromVisual}
          onMaterialColorChange={inspectorController.updateNodeMaterialField}
          onMaterialNumericChange={inspectorController.updateNodeMaterialNumericField}
          onMaterialBooleanChange={inspectorController.updateNodeMaterialBooleanField}
          onMaterialTextureChange={inspectorController.updateNodeMaterialTextureField}
          onOpenTexturePicker={inspectorController.openTexturePicker}
          onTextureBrowserUp={inspectorController.goUpTextureBrowser}
          onTextureBrowserRefresh={() => void assetController.loadTextureBrowser(textureBrowserPath)}
          onTextureBrowserOpenDirectory={(path) => void assetController.loadTextureBrowser(path)}
          onTextureBrowserPick={inspectorController.applyTextureFromBrowser}
          onResetMaterialOverrides={inspectorController.clearNodeMaterialOverrides}
          onLightFieldChange={inspectorController.updateLightField}
          onLightNumericChange={inspectorController.updateLightNumericField}
          onGameplayFieldChange={inspectorController.updateGameplayField}
          onGameplayBooleanChange={inspectorController.updateGameplayBooleanField}
          onGameplayNumericChange={inspectorController.updateGameplayNumericField}
          onTransformChange={updateTupleField}
          onDuplicate={createController.duplicateSelection}
          onDelete={createController.deleteSelection}
        />
      {/if}

      {#if activeEditorTab === 'style'}
      {#if editorStyleStudioComponent}
        <svelte:component
          this={editorStyleStudioComponent}
          bind:styleProfileName
          bind:stylePrompt
          bind:styleNegativePrompt
          bind:styleLoraNotes
          bind:styleControlNetNotes
          stylePresets={stylePresetOptions}
          bind:styleReferenceImageUrl
          bind:styleSimplifyRatio
          bind:styleSimplifyError
          {styleBusy}
          {styleStatus}
          {styleInspectReport}
          {styleSourceSummary}
          {styleWorkspaceManifestUrl}
          {styleWorkspaceSourceAssetUrl}
          {styleGeneratedReferenceImageUrl}
          {styleSimplifiedAssetUrl}
          {styleBlenderExportPath}
          {styleBlenderOpenCommand}
          {styleBatchBusy}
          {styleBatchStatus}
          {hunyuanLastFitReport}
          styleBatchResumeAvailable={styleBatchResumeAvailable}
          styleBatchResumeSummary={styleBatchResumeSummary}
          {styleSceneCandidates}
          {runtimeAssetFailures}
          {comfyUiStatus}
          {comfyUiBusy}
          {comfyUiReady}
          {hunyuanBackendStatus}
          {hunyuanBusy}
          {hunyuanServiceReady}
          {hunyuanDetectedReferenceImageUrl}
          {selectedNode}
          {selectedNodes}
          {canUseStyleStudio}
          on:startComfyUi={() => aiController.refreshComfyUiServiceStatus(true)}
          on:refreshComfyUi={() => aiController.refreshComfyUiServiceStatus(false)}
          on:startHunyuan={() => aiController.refreshHunyuanServiceStatus(true)}
          on:refreshHunyuan={() => aiController.refreshHunyuanServiceStatus(false)}
          on:inspectAsset={() => styleController.inspectSelectedAssetForStyle()}
          on:applyStylePreset={(event) => applyStylePreset(event.detail.presetId)}
          on:prepareWorkspace={() => styleController.prepareStyleWorkspace()}
          on:simplifyAsset={() => styleController.simplifySelectedAssetForStyle()}
          on:exportBlender={() => styleController.exportSelectedAssetForBlender()}
          on:runRetexture={() => styleController.runStyleBake('texture')}
          on:runReimagine={() => styleController.runStyleBake('generate')}
          on:selectAllBatchCandidates={selectAllStyleBatchCandidates}
          on:clearBatchCandidates={clearStyleBatchCandidates}
          on:pauseBatch={() => void styleController.pauseActiveHunyuanJobs()}
          on:cancelBatch={() => void styleController.cancelActiveHunyuanJobs()}
          on:resumeBatch={() => void styleController.resumePendingStyleBatchSession()}
          on:discardBatch={styleController.discardPendingStyleBatchSession}
          on:runBatchRetexture={() => void styleController.runStyleBatch('texture')}
          on:runBatchReimagine={() => void styleController.runStyleBatch('generate')}
          on:toggleBatchCandidate={(event) => toggleStyleBatchCandidate(event.detail.candidateId, event.detail.selected)}
          on:updateBatchDescriptor={(event) => updateNodeStyleDescriptor(event.detail.candidateId, event.detail.descriptor)}
        />
      {:else}
        <div class="editor-section">
          <div class="save-message">Loading Style Studio…</div>
        </div>
      {/if}
      {/if}

      {#if activeEditorTab === 'ai'}
      {#if editorAIMeshStudioComponent}
        <svelte:component
          this={editorAIMeshStudioComponent}
          bind:comfyUiApiUrl
          {comfyUiStatus}
          {comfyUiBusy}
          {comfyUiReady}
          {comfyWorkflowEditorStatus}
          {selectedComfyWorkflowPath}
          bind:hunyuanApiUrl
          {hunyuanStatus}
          {hunyuanBackendStatus}
          {hunyuanBusy}
          {hunyuanServiceReady}
          {hunyuanBackendCanGenerate}
          {hunyuanBackendCanRetexture}
          {hunyuanLastOutputUrl}
          {hunyuanLastResultSummary}
          {hunyuanLastFitReport}
          {hunyuanSupportsReplacement}
          {hunyuanSupportsTextureWrap}
          {canApplyGeneratedAssetToSelection}
          {runtimeAssetFailures}
          {recentHunyuanJobs}
          {hunyuanJobsLoading}
          {hunyuanJobsError}
          bind:selectedHunyuanJobId
          bind:hunyuanReferenceImageUrl
          {hunyuanDetectedReferenceImageUrl}
          bind:hunyuanPrompt
          bind:hunyuanScratchName
          bind:hunyuanScratchReferenceImageUrl
          bind:hunyuanScratchPrompt
          bind:hunyuanApplyToSimilarNodes
          matchingSelectionCount={similarNodeCount}
          similarSelectionLabel={similarNodeLabel}
          {selectedNode}
          {selectedNodes}
          {canUseAiMeshStudio}
          {canRetextureSelection}
          on:selectSimilar={selectSimilarNodes}
          on:startComfyUi={() => aiController.refreshComfyUiServiceStatus(true)}
          on:refreshComfyUi={() => aiController.refreshComfyUiServiceStatus(false)}
          on:startHunyuan={() => aiController.refreshHunyuanServiceStatus(true)}
          on:refreshHunyuan={() => aiController.refreshHunyuanServiceStatus(false)}
          on:generateScratch={() => aiController.runHunyuanFromScratch()}
          on:inspectSelection={() => selectedNode?.asset && void assetController.inspectSelectedAssetForHunyuan(selectedNode.asset.url, selectedNode.id)}
          on:generateSelection={() => aiController.runHunyuanForSelection('generate')}
          on:textureSelection={() => aiController.runHunyuanForSelection('texture')}
          on:openWorkflowTab={() => setActiveEditorTab('workflow')}
          on:resetWorkflowPath={resetSelectedWorkflowPath}
          on:editGenerateWorkflow={() => void aiController.openComfyUiWorkflowEditor('generate')}
          on:editTextureWorkflow={() => void aiController.openComfyUiWorkflowEditor('texture')}
          on:openGeneratedAsset={() => void assetController.openGeneratedAssetInLibrary()}
          on:applyGeneratedAsset={() => void assetController.applyGeneratedAssetToSelection()}
          on:saveGeneratedResult={() => void saveCurrentSceneToDisk()}
          on:refreshRecentJobs={() => void aiController.refreshHunyuanRecentJobs()}
        />
      {:else}
        <div class="editor-section">
          <div class="save-message">Loading AI mesh tools…</div>
        </div>
      {/if}
      {/if}

      {#if activeEditorTab === 'save'}
      <EditorSavePanel
        bind:metadataTitle
        bind:metadataStatus
        bind:metadataDeployed
        bind:metadataStarMapEnabled
        bind:metadataStarMapYear
        bind:metadataStarMapDescription
        bind:metadataSourceKind
        bind:metadataSourceComponentKey
        bind:saveAsTitle
        bind:saveAsLevelId
        bind:importBuffer
        {saveMessage}
        onSaveLevelMetadata={() => void levelController.saveLevelMetadata()}
        onSaveLocal={levelController.saveScene}
        onOverwriteLevel={() => void levelController.overwriteLevelScene()}
        onCopySceneJson={levelController.copySceneJson}
        onReloadDisk={reloadFromDisk}
        onLoadPackagedScene={loadPackagedLevelScene}
        onLoadOriginalSnapshot={() => void loadOriginalSnapshot()}
        onLoadBackupSnapshot={() => void loadBackupSnapshot()}
        onSaveAsNewLevel={() => void levelController.saveAsNewLevel()}
        onApplyImport={levelController.applyImport}
      />
      {/if}

            </div>
          </div>
        </div>

        <div class="editor-side-stack">
          <div class="editor-side-panel editor-outliner-panel">
            <EditorOutliner
              subtitle={getOutlinerSubtitle(outlinerDisplayMode, editorNodes, selectedNodes, selectedNode)}
              mode={outlinerDisplayMode}
              modeOptions={outlinerModeOptions}
              filter={hierarchyFilter}
              filterPlaceholder={getOutlinerFilterPlaceholder(outlinerDisplayMode)}
              rows={outlinerRows}
              dragEnabled={outlinerDisplayMode === 'view-layer'}
              currentDropTargetId={hierarchyDropTargetId}
              onModeChange={outlinerController.setDisplayMode}
              onFilterChange={(value) => { hierarchyFilter = value }}
              onRowDisclosure={(row, event) => { if (row.hasChildren) outlinerController.toggleExpanded(row.id, event) }}
              onRowSelect={outlinerController.handleSelection}
              onRowVisibility={outlinerController.toggleItemVisibility}
              onRowSelectable={outlinerController.toggleItemSelectable}
              onRowIsolation={outlinerController.toggleItemIsolation}
              onRowDragStart={(row, event) => { if (row.nodeId) outlinerController.startDrag(row.nodeId, event) }}
              onRowDragEnd={outlinerController.clearDragState}
              onRowDragEnter={(row, event) => { if (row.nodeId) outlinerController.allowDrop(event, row.nodeId) }}
              onRowDragOver={(row, event) => { if (row.nodeId) outlinerController.allowDrop(event, row.nodeId) }}
              onRowDragLeave={(row) => { if (row.nodeId && hierarchyDropTargetId === row.nodeId) hierarchyDropTargetId = null }}
              onRowDrop={(row, event) => { if (row.nodeId) outlinerController.drop(event, row.nodeId) }}
              isRowSelected={(row) => isOutlinerRowSelected(row, editorState?.selectedNodeIds ?? [])}
              getRowActionState={outlinerController.getRowActionState}
            />
          </div>

        {#if editorState.propertiesShelfOpen}
          <div class="editor-side-panel editor-properties-panel">
            <div class="editor-side-content">
              <EditorPropertiesShelf
                {selectedNode}
                {selectedNodes}
                parentCandidates={selectedParentCandidates}
                {selectedNodeMaterial}
                {selectedNodePreviewAssetUrl}
                {selectedGeneratedVariantUrl}
                styleDescriptor={selectedNodeStyleDescriptor}
                canUseStyleStudioSelection={canUseStyleStudioSelection}
                canUseAiMeshStudioSelection={canUseAiMeshStudioSelection}
                {generatedVariantItems}
                {generatedVariantLoading}
                {generatedVariantError}
                {styleBusy}
                {styleBlenderExportPath}
                {styleBlenderOpenCommand}
                {styleStatus}
                {activeTextureMaterialField}
                {textureBrowserPath}
                {textureBrowserLoading}
                {textureBrowserItems}
                colliderSize={selectedNodeColliderSize}
                onNameChange={inspectorController.updateNodeName}
                onOpenStyleTab={() => setActiveEditorTab('style')}
                onOpenAiTab={() => setActiveEditorTab('ai')}
                onDuplicate={createController.duplicateSelection}
                onDelete={createController.deleteSelection}
                onVisibleChange={inspectorController.updateVisible}
                onTransformChange={updateTupleField}
                onParentChange={inspectorController.updateParent}
                onAssetUrlChange={inspectorController.updateAssetUrl}
                onOpenGeneratedAssetPicker={() => inspectorController.openAssetPickerForSelectedNode(ASSET_LIBRARY_ROOT_GENERATED)}
                onOpenImportedAssetPicker={() => inspectorController.openAssetPickerForSelectedNode(ASSET_LIBRARY_ROOT_MODELS)}
                onPrefabVariantChange={inspectorController.updatePrefabVariant}
                onPrimitiveGeometryChange={(value) => inspectorController.updatePrimitiveField('geometry', value)}
                onPrimitiveArgChange={inspectorController.updatePrimitiveArg}
                onLightColorChange={(value) => inspectorController.updateLightField('color', value)}
                onLightNumericChange={inspectorController.updateLightNumericField}
                onGameplayFieldChange={inspectorController.updateGameplayField}
                onGameplayNumericChange={inspectorController.updateGameplayNumericField}
                onGameplayBooleanChange={inspectorController.updateGameplayBooleanField}
                onStyleDescriptorChange={inspectorController.updateSelectedNodeStyleDescriptor}
                onSelectGeneratedVariant={(url) => { selectedGeneratedVariantUrl = url }}
                onApplyGeneratedVariant={inspectorController.applyGeneratedVariantToSelectedNode}
                onResetGeneratedVariantPreview={() => { selectedGeneratedVariantUrl = selectedNode?.asset?.url ?? '' }}
                onOpenSelectedInBlender={() => void styleController.exportSelectedAssetForBlender({ openInBlender: true })}
                onExportBlenderPackage={() => void styleController.exportSelectedAssetForBlender()}
                onReimportBlenderOutput={() => void styleController.reimportLatestBlenderOutputForSelection()}
                onMaterialColorChange={inspectorController.updateNodeMaterialField}
                onMaterialNumericChange={inspectorController.updateNodeMaterialNumericField}
                onMaterialTextureChange={inspectorController.updateNodeMaterialTextureField}
                onOpenTexturePicker={inspectorController.openTexturePicker}
                onResetMaterialOverrides={inspectorController.clearNodeMaterialOverrides}
                onCollisionEnabledChange={inspectorController.updateCollisionEnabled}
                onPhysicsBodyTypeChange={(value) => inspectorController.updatePhysicsField('bodyType', value)}
                onColliderSizeChange={inspectorController.updateCollisionSize}
                onTextureBrowserUp={inspectorController.goUpTextureBrowser}
                onTextureBrowserRefresh={() => void assetController.loadTextureBrowser(textureBrowserPath)}
                onTextureBrowserOpenDirectory={(path) => void assetController.loadTextureBrowser(path)}
                onTextureBrowserPick={inspectorController.applyTextureFromBrowser}
              />
            </div>
          </div>
        {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .editor-shell {
    position: fixed;
    top: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    width: auto;
    max-width: calc(100vw - 2rem);
    height: calc(100vh - 2rem);
    color: #e8f5ff;
    z-index: 80;
  }
  .editor-shell.collapsed { width: 15rem; height: auto; }
  .editor-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 0;
    margin-bottom: 0.5rem;
    width: auto;
    background: transparent;
    border: none;
    border-radius: 0;
    backdrop-filter: none;
    box-shadow: none;
  }
  .editor-header-actions {
    display: flex;
    gap: 0.35rem;
    padding: 0.35rem;
    background: rgba(9, 14, 24, 0.92);
    border: 1px solid rgba(126, 203, 255, 0.24);
    border-radius: 0.7rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3);
  }
  .editor-body {
    flex: 1 1 auto;
    position: relative;
    width: 23rem;
    height: calc(100vh - 4.5rem);
  }
  .editor-tools-panel,
  .editor-side-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    background: rgba(9, 14, 24, 0.92);
    border: 1px solid rgba(126, 203, 255, 0.28);
    border-radius: 0.75rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.35);
  }
  .editor-tools-panel {
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
  .editor-tab-rail {
    display: grid;
    align-content: start;
    gap: 0.45rem;
    padding: 0.9rem 0.65rem;
    border-right: 1px solid rgba(126, 203, 255, 0.08);
    background: rgba(5, 9, 16, 0.55);
  }
  .editor-side-stack {
    position: fixed;
    top: 4.15rem;
    right: 1rem;
    width: 23rem;
    height: min(25vh, 14rem);
    z-index: 78;
  }
  .editor-outliner-panel {
    height: 100%;
  }
  .editor-outliner-panel .editor-side-content {
    overflow: hidden;
  }
  .editor-side-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.62rem 0.78rem;
    border-bottom: 1px solid rgba(126, 203, 255, 0.12);
  }
  .editor-side-content {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.62rem 0.72rem 0.72rem;
    scrollbar-width: thin;
    scrollbar-color: rgba(126, 203, 255, 0.4) rgba(5, 9, 16, 0.35);
  }
  .editor-side-content::-webkit-scrollbar,
  .editor-tab-content::-webkit-scrollbar,
  .outliner-tree::-webkit-scrollbar {
    width: 0.5rem;
  }
  .editor-side-content::-webkit-scrollbar-thumb,
  .editor-tab-content::-webkit-scrollbar-thumb,
  .outliner-tree::-webkit-scrollbar-thumb {
    background: rgba(126, 203, 255, 0.32);
    border-radius: 999px;
  }
  .editor-side-content::-webkit-scrollbar-track,
  .editor-tab-content::-webkit-scrollbar-track,
  .outliner-tree::-webkit-scrollbar-track {
    background: rgba(5, 9, 16, 0.24);
  }
  .outliner-mode-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
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
  .editor-title { font-weight: 700; }
  .editor-subtitle { font-size: 0.75rem; color: #9bc7e4; }
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
  .editor-subsection {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(126, 203, 255, 0.08);
  }
  .compact-surface {
    margin-bottom: 0.75rem;
  }
  .asset-list { display: grid; gap: 0.45rem; margin-top: 0.55rem; }
  .hierarchy-root-drop {
    margin-bottom: 0.45rem;
    padding: 0.45rem 0.6rem;
    border-radius: 0.45rem;
    border: 1px dashed rgba(126, 203, 255, 0.2);
    color: #9bc7e4;
    font-size: 0.78rem;
    text-align: center;
  }
  .hierarchy-root-drop.active,
  .hierarchy-item.drop-target .hierarchy-entry {
    border-color: rgba(126, 203, 255, 0.8);
    background: rgba(86, 148, 192, 0.18);
  }
  .hierarchy-list { display: grid; gap: 0.28rem; max-height: 12rem; overflow: auto; }
  .outliner-browser-shell {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1 1 auto;
    height: 100%;
    padding: 0.38rem;
    border: 1px solid rgba(126, 203, 255, 0.14);
    border-radius: 0.6rem;
    background: rgba(4, 8, 14, 0.54);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  }
  .outliner-tree {
    max-height: none;
    min-height: 0;
    flex: 1 1 auto;
    padding-right: 0.1rem;
    padding: 0.22rem;
    border: 1px solid rgba(126, 203, 255, 0.1);
    border-radius: 0.48rem;
    background: rgba(3, 6, 11, 0.72);
    overflow: auto;
  }
  .outliner-column-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.3rem;
    align-items: center;
    margin-bottom: 0.35rem;
    padding: 0 0.15rem;
    color: #8fb7d4;
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .outliner-column-header-actions {
    display: grid;
    grid-template-columns: repeat(3, 1.45rem);
    gap: 0.2rem;
    justify-content: end;
    text-align: center;
  }
  .hierarchy-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.35rem; align-items: center; }
  .hierarchy-item.dimmed { opacity: 0.45; }
  .hierarchy-entry { display: flex; justify-content: space-between; align-items: center; text-align: left; width: 100%; }
  .hierarchy-actions { display: flex; gap: 0.25rem; }
  .hierarchy-actions button { min-width: 2.1rem; padding: 0.35rem 0.4rem; }
  .node-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .kind { font-size: 0.7rem; color: #8fb7d4; text-transform: uppercase; }
  .outliner-row {
    gap: 0.28rem;
  }
  .outliner-entry-wrap {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 0.12rem;
  }
  .outliner-disclosure {
    width: 1rem;
    min-width: 1rem;
    padding: 0.18rem 0.1rem;
    border: none;
    background: transparent;
    color: #a7d3ef;
    box-shadow: none;
  }
  .outliner-disclosure.placeholder {
    opacity: 0.18;
    pointer-events: none;
  }
  .outliner-entry {
    justify-content: flex-start;
    gap: 0.32rem;
    min-width: 0;
    padding: 0.28rem 0.4rem;
  }
  .outliner-entry .kind,
  .outliner-entry .outliner-value {
    margin-left: auto;
  }
  .outliner-icon {
    width: 0.95rem;
    min-width: 0.95rem;
    text-align: center;
    color: #9fd4f4;
    font-size: 0.78rem;
  }
  .outliner-value {
    color: #9bc7e4;
    font-size: 0.7rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 7rem;
  }
  .outliner-columns {
    display: grid;
    grid-template-columns: repeat(3, 1.45rem);
    gap: 0.2rem;
    justify-content: end;
  }
  .outliner-columns button {
    min-width: 1.45rem;
    width: 1.45rem;
    padding: 0.26rem 0.12rem;
    justify-content: center;
  }
  .outliner-column-empty {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.45rem;
    color: rgba(143, 183, 212, 0.4);
    font-size: 0.72rem;
  }
  .path-label { word-break: break-all; }
  .asset-browser-list { max-height: 14rem; }
  .variant-list {
    max-height: 9rem;
  }
  .editor-properties-panel :global(.editor-preview-card),
  .editor-outliner-panel :global(.editor-preview-card) {
    margin-top: 0.28rem;
  }
  .editor-properties-panel :global(.editor-preview-card .tuple-label),
  .editor-outliner-panel :global(.editor-preview-card .tuple-label) {
    font-size: 0.64rem;
  }
  .editor-properties-panel :global(.editor-preview-surface) {
    max-height: 12rem;
  }
  .editor-properties-panel .editor-section,
  .editor-outliner-panel .editor-section {
    padding: 0.56rem 0.62rem;
  }
  .editor-properties-panel {
    position: fixed;
    top: 4.15rem;
    right: 24.75rem;
    width: 19rem;
    height: calc(100vh - 5rem);
    max-height: calc(100vh - 5rem);
    z-index: 79;
  }
  .editor-tools-panel .editor-section {
    padding: 0.62rem 0.72rem;
  }

  @media (max-width: 1280px) {
    .editor-shell {
      width: min(96vw, 56rem);
      height: calc(100vh - 2rem);
      align-items: stretch;
    }
    .editor-header {
      width: auto;
    }
    .editor-body {
      width: auto;
      height: calc(100vh - 4.5rem);
    }
    .editor-side-stack {
      position: static;
      width: auto;
      height: auto;
    }
    .editor-tools-panel {
      position: static;
      width: auto;
      min-width: 0;
      height: auto;
      max-height: none;
    }
    .editor-properties-panel {
      position: static;
      width: auto;
      height: auto;
      max-height: none;
    }
  }

  @media (max-width: 900px) {
    .editor-shell {
      width: min(96vw, 32rem);
      height: calc(100vh - 1rem);
      top: 0.5rem;
      right: 0.5rem;
    }
    .editor-header-actions {
      padding: 0.28rem;
    }
    .editor-tools-panel {
      grid-template-columns: 3.7rem minmax(0, 1fr);
    }
  }
</style>
