<script lang="ts">
  import './editor-ui.css'
  import { onDestroy, onMount } from 'svelte'
  import { get } from 'svelte/store'
  import * as THREE from 'three'
  import { gameActions } from '../stores/gameStateStore'
  import {
    addEmptyNode,
    addNode,
    canRedoStore,
    canUndoStore,
    clearSelection,
    clearIsolatedNodes,
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
    reparentNodes,
    removeNodes,
    saveSceneToLocalStorage,
    selectedEditorNodeStore,
    selectedEditorNodesStore,
    selectEditorNode,
    setSelectedNodes,
    setIsolatedNodes,
    setCollisionOverlayEnabled,
    setEditorInteractionMode,
    setEditorViewportLightingMode,
    setEditorScene,
    setSurfaceSnapEnabled,
    setSurfaceSnapOffset,
    setSnappingEnabled,
    setTranslateSnap,
    setRotateSnap,
    setScaleSnap,
    setTerrainBrushFalloff,
    setTerrainBrushMode,
    setTerrainBrushSize,
    setTerrainBrushStrength,
    setTransformAxis,
    setTransformMode,
    setTransformSpace,
    togglePanelOpen,
    toggleIsolatedNode,
    undoScene,
    ungroupNodes,
    updateLevelSceneSettings,
    updateObservatorySceneSettings,
    updateSolitudeSceneSettings,
    redoScene,
    type EditorMaterialData,
    type EditorStylePreset,
    type EditorPrefabType,
    type EditorSceneNode,
    patchNode,
    patchNodes,
  } from './editorStore'
  import { createDefaultSceneForLevel } from './defaultScenes'
  import { createWorldMatrixResolver, getLocalTransformForWorldMatrix } from './editorHierarchyUtils'
  import {
    resolveObservatoryPresetSettings,
    resolveSolitudePresetSettings,
  } from './editorLevelPresets'
  import EditorAssetPreview from './EditorAssetPreview.svelte'
  import { canBakeSceneNode, exportSceneNodeToGlb, getPrefabAssetUrl } from './editorBakeSource'
  import { EDITOR_PREFAB_GENERATION_LABELS, inferNodeGenerationDescriptor } from './editorGeneration'
  import { mergeLevelSettings } from './editorLevelSetup'
  import EditorEnvironmentPanel from './EditorEnvironmentPanel.svelte'
  import {
    clearStyleBatchSessionFromLocalStorage,
    loadStyleBatchSessionFromLocalStorage,
    saveEditorSceneToLocalStorage,
    saveStyleBatchSessionToLocalStorage,
    type PersistedStyleBatchEntry,
    type PersistedStyleBatchSession,
  } from './editorPersistence'
  import {
    reportRuntimeAssetFailure,
    setRuntimeDiagnostic,
  } from '../stores/runtimeDiagnosticsStore'
  import {
    levelRegistryStore,
    sanitizeLevelId,
    setLevelRegistry,
    type LevelLifecycleStatus,
    type LevelRegistryEntry,
  } from '../levels/levelRegistry'
  import { EDITOR_API_BASE } from '@config/editorApi'

  export let levelId: string

  type EditorPanelTab = 'workflow' | 'scene' | 'environment' | 'create' | 'hierarchy' | 'inspect' | 'style' | 'ai' | 'save'

  let editorState
  let editorNodes: EditorSceneNode[] = []
  let editorScene = null
  let levelRegistryEntries: LevelRegistryEntry[] = []
  let nodeViewportStateById = new Map<string, { effectiveVisible: boolean; isolated: boolean; dimmed: boolean; locked: boolean }>()
  let selectedNode: EditorSceneNode | null = null
  let selectedNodes: EditorSceneNode[] = []
  let canUndo = false
  let canRedo = false
  let importBuffer = ''
  let saveMessage = 'Local only'
  const ASSET_LIBRARY_ROOT_MODELS = 'apps/megameal/public/models'
  const ASSET_LIBRARY_ROOT_GENERATED = 'apps/megameal/public/generated/hunyuan3d'
  const COMFY_WORKFLOW_LIBRARY_ROOT = 'apps/game/public/ref-image'
  const DEFAULT_COMFY_WORKFLOW_PATH = 'apps/game/public/ref-image/Hunyaun example.json'
  let assetBrowserPath = ASSET_LIBRARY_ROOT_MODELS
  let assetBrowserItems: Array<{ name: string, path: string, isDirectory: boolean }> = []
  let assetBrowserFilter = ''
  let assetBrowserError = ''
  let assetBrowserLoading = false
  let selectedLibraryItem: { name: string, path: string, isDirectory: boolean } | null = null
  let assetPickerTargetNodeId = ''
  let textureBrowserPath = 'apps/game/public'
  let textureBrowserItems: Array<{ name: string, path: string, isDirectory: boolean }> = []
  let textureBrowserError = ''
  let textureBrowserLoading = false
  let activeTextureMaterialField: 'mapUrl' | 'normalMapUrl' | 'roughnessMapUrl' | 'metalnessMapUrl' | 'emissiveMapUrl' | 'alphaMapUrl' | null = null
  let workflowBrowserPath = COMFY_WORKFLOW_LIBRARY_ROOT
  let workflowBrowserItems: Array<{ name: string, path: string, isDirectory: boolean }> = []
  let workflowBrowserError = ''
  let workflowBrowserLoading = false
  let selectedComfyWorkflowPath = DEFAULT_COMFY_WORKFLOW_PATH
  let comfyUiApiUrl = 'http://127.0.0.1:8188'
  let comfyUiStatus = 'ComfyUI powers local mesh workflows and can be started here.'
  let comfyUiBusy = false
  let comfyUiReady = false
  let comfyUiStatusKey = ''
  let comfyWorkflowEditorStatus = ''
  let hunyuanApiUrl = 'http://127.0.0.1:8080'
  let hunyuanPrompt = ''
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
  let metadataSourceComponentKey: 'observatory' | 'sci-fi-room' | 'miranda' | 'solitude' = 'observatory'
  let loadedMetadataLevelId = ''
  let activeEditorTab: EditorPanelTab = 'workflow'
  let hierarchyFilter = ''
  let editorTabContentElement: HTMLDivElement | null = null
  let lastScrolledTab: EditorPanelTab | null = null
  let editorAIMeshStudioComponent: typeof import('./EditorAIMeshStudio.svelte').default | null = null
  let editorAIMeshStudioPromise: Promise<void> | null = null
  let editorStyleStudioComponent: typeof import('./EditorStyleStudio.svelte').default | null = null
  let editorStyleStudioPromise: Promise<void> | null = null
  let hunyuanApplyToSimilarNodes = false
  let styleSelectionKey = ''
  let styleProfileName = 'Painterly Storybook'
  let stylePrompt = ''
  let styleNegativePrompt = 'photorealistic, noisy texture detail, harsh speculars, mismatched material finish'
  let styleLoraNotes = ''
  let styleControlNetNotes = 'Preserve silhouette and major surface breakup from the source asset.'
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
  let styleBatchSelectionIds: string[] = []
  let styleBatchSelectionInitialized = false
  let styleLevelDefaultsAppliedFor = ''
  let styleBatchNodeStatusById: Record<string, string> = {}
  let styleBatchSession: PersistedStyleBatchSession | null = null
  let styleBatchResumePromise: Promise<void> | null = null
  let styleSceneCandidates: Array<{
    id: string
    name: string
    kindLabel: string
    descriptor: string
    selected: boolean
    status: string
  }> = []

  const unsubState = editorStateStore.subscribe((value) => {
    editorState = value
  })
  const unsubNodes = editorNodesStore.subscribe((value) => {
    editorNodes = value
  })
  const unsubScene = editorSceneStore.subscribe((value) => {
    editorScene = value
  })
  const unsubRegistry = levelRegistryStore.subscribe((value) => {
    levelRegistryEntries = value
  })
  const unsubViewportState = editorNodeViewportStateStore.subscribe((value) => {
    nodeViewportStateById = value
  })
  const unsubSelected = selectedEditorNodeStore.subscribe((value) => {
    selectedNode = value
  })
  const unsubSelectedNodes = selectedEditorNodesStore.subscribe((value) => {
    selectedNodes = value
  })
  const unsubCanUndo = canUndoStore.subscribe((value) => {
    canUndo = value
  })
  const unsubCanRedo = canRedoStore.subscribe((value) => {
    canRedo = value
  })

  const assetOptions = [
    { label: 'Hanging Light', url: '/models/polyhaven/caged_hanging_light/caged_hanging_light_1k.gltf' },
    { label: 'Aircon Unit', url: '/models/polyhaven/exterior_aircon_unit/exterior_aircon_unit_1k.gltf' },
    { label: 'Barrel', url: '/models/polyhaven/Barrel_01/Barrel_01_1k.gltf' },
    { label: 'Concrete Barrier', url: '/models/polyhaven/concrete_road_barrier_02/concrete_road_barrier_02_1k.gltf' },
  ]

  function getNodeDepth(node: EditorSceneNode, allNodes: EditorSceneNode[]) {
    let depth = 0
    let currentParentId = node.parentId ?? null
    while (currentParentId) {
      const parent = allNodes.find((candidate) => candidate.id === currentParentId)
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
      const children = nodes.filter((node) => (node.parentId ?? null) === parentId)
      for (const child of children) {
        result.push({ ...child, __depth: depth } as EditorSceneNode & { __depth: number })
        visit(child.id, depth + 1)
      }
    }
    visit(null, 0)
    return result as Array<EditorSceneNode & { __depth: number }>
  }

  $: flattenedNodes = flattenNodes(editorNodes)
  $: filteredFlattenedNodes = flattenedNodes.filter((node) => {
    const query = hierarchyFilter.trim().toLowerCase()
    if (!query) return true

    const prefabType = node.prefab?.type?.toLowerCase() ?? ''
    const gameplayType = node.gameplay?.type?.toLowerCase() ?? ''
    const assetUrl = node.asset?.url?.toLowerCase() ?? ''

    return node.name.toLowerCase().includes(query)
      || node.kind.toLowerCase().includes(query)
      || prefabType.includes(query)
      || gameplayType.includes(query)
      || assetUrl.includes(query)
  })
  $: hasGroupSelection = selectedNodes.some((node) => node.kind === 'group')
  $: levelSettings = editorScene?.settings?.level ?? {}
  $: observatorySettings = editorScene?.settings?.observatory ?? {}
  $: solitudeSettings = editorScene?.settings?.solitude ?? {}
  $: effectiveObservatorySettings = resolveObservatoryPresetSettings(
    mergeLevelSettings(levelSettings, observatorySettings)
  ) ?? {}
  $: effectiveSolitudeSettings = resolveSolitudePresetSettings(
    mergeLevelSettings(levelSettings, solitudeSettings)
  ) ?? {}
  $: selectedNodeMaterial = getSelectedNodeMaterialDefaults(selectedNode)
  $: dragSelectionIds = selectedNodes.map((node) => node.id)
  $: pendingLevelId = levelId
  $: activeSceneLevelId = editorScene?.levelId ?? levelId
  $: editorLevelOptions = levelRegistryEntries.map((entry) => ({
    id: entry.id,
    label: entry.title,
    status: entry.status,
    deployed: entry.deployed,
  }))
  $: activeLevelRegistryEntry = levelRegistryEntries.find((entry) => entry.id === activeSceneLevelId) ?? null

  $: if (activeSceneLevelId && loadedMetadataLevelId !== activeSceneLevelId) {
    const entry = activeLevelRegistryEntry
    metadataTitle = entry?.title ?? activeSceneLevelId
    metadataStatus = entry?.status ?? 'draft'
    metadataDeployed = entry?.deployed ?? false
    metadataStarMapEnabled = entry?.starMap?.enabled ?? false
    metadataStarMapYear = entry?.starMap?.year ?? 2100
    metadataStarMapDescription = entry?.starMap?.description ?? `Enter ${entry?.title ?? activeSceneLevelId}`
    metadataSourceKind = entry?.source.kind ?? 'scene'
    metadataSourceComponentKey = entry?.source.kind === 'component' ? entry.source.componentKey : 'observatory'
    loadedMetadataLevelId = activeSceneLevelId
  }

  let draggedHierarchyNodeIds: string[] = []
  let hierarchyDropTargetId: string | null = null
  let hierarchyRootDropActive = false

  const observatoryStylePresets: EditorStylePreset[] = ['ghibli', 'alto', 'monument', 'retro']
  const ambientAudioLibrary = [
    { label: 'Portal Deck', src: '/audio/ambient/portal-deck.mp3' },
    { label: 'Wicked Shadows Whisper', src: '/audio/ambient/Wicked Shadows Whisper.mp3' },
    { label: 'Shadow Waltz', src: '/audio/ambient/Shadow Waltz.mp3' },
    { label: 'Dark Shadows of Delight', src: '/audio/ambient/Dark Shadows of Delight.mp3' },
    { label: 'Meta 3', src: '/audio/ambient/meta_3.mp3' },
    { label: 'Retro Video Game', src: '/audio/ambient/retro video game, new age, electric guitar fake.mp3' },
    { label: 'Untitled', src: '/audio/ambient/Untitled.mp3' },
  ]

  const editorPanelTabs: Array<{ id: EditorPanelTab, icon: string, label: string }> = [
    { id: 'workflow', icon: '→', label: 'Workflow' },
    { id: 'scene', icon: '◫', label: 'Scene' },
    { id: 'environment', icon: '☼', label: 'Environment' },
    { id: 'create', icon: '+', label: 'Create' },
    { id: 'hierarchy', icon: '≣', label: 'Hierarchy' },
    { id: 'inspect', icon: '◎', label: 'Inspect' },
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
      editorAIMeshStudioPromise = import('./EditorAIMeshStudio.svelte').then((module) => {
        editorAIMeshStudioComponent = module.default
      })
    }

    await editorAIMeshStudioPromise
  }

  async function ensureEditorStyleStudio() {
    if (editorStyleStudioComponent) return

    if (!editorStyleStudioPromise) {
      editorStyleStudioPromise = import('./EditorStyleStudio.svelte').then((module) => {
        editorStyleStudioComponent = module.default
      })
    }

    await editorStyleStudioPromise
  }

  $: if (editorState?.panelOpen && editorTabContentElement && activeEditorTab !== lastScrolledTab) {
    lastScrolledTab = activeEditorTab
    requestAnimationFrame(() => {
      editorTabContentElement?.scrollTo({ top: 0, behavior: 'auto' })
    })
  }

  const createQuickNodeActions = [
    { label: 'Empty', action: () => addEmpty() },
    { label: 'Box', action: () => addRawPrimitive() },
    { label: 'Light', action: () => addPrimitivePrefab('light') },
    { label: 'Marker', action: () => addPrimitivePrefab('marker') },
    { label: 'NPC Firefly', action: () => addPrimitivePrefab('firefly') },
    { label: 'Audio Region', action: () => addPrimitivePrefab('audio-region') },
    { label: 'Fog Volume', action: () => addPrimitivePrefab('fog-volume') },
  ]

  const createPrefabGroups = [
    {
      label: 'Sci-Fi / Tech',
      items: [
        { label: 'Anomaly Cluster', type: 'anomaly-cluster' as const, position: [0, 2, 0] as [number, number, number] },
        { label: 'Command Console', type: 'command-console' as const, position: [0, 0, 0] as [number, number, number] },
        { label: 'Command Fin', type: 'command-fin' as const, position: [0, 0, 0] as [number, number, number] },
        { label: 'Support Column', type: 'support-column' as const, position: [0, 0, 0] as [number, number, number] },
        { label: 'Hanging Light', type: 'hanging-light' as const, position: [0, 0, 0] as [number, number, number] },
      ],
    },
    {
      label: 'Architecture / World',
      items: [
        { label: 'Interior Archway', type: 'interior-archway' as const, position: [0, 0, 0] as [number, number, number] },
        { label: 'Courtyard Pylon', type: 'courtyard-pylon' as const, position: [0, 0, 0] as [number, number, number] },
        { label: 'Wasteland Archway', type: 'wasteland-archway' as const, position: [0, 0, 0] as [number, number, number] },
        { label: 'Portal Apparatus', type: 'portal-apparatus' as const, position: [0, 0, 0] as [number, number, number] },
      ],
    },
    {
      label: 'Ruins / Nature / Story',
      items: [
        { label: 'Story Marker', type: 'story-marker' as const, position: [0, 0, 0] as [number, number, number] },
        { label: 'Courtyard Fountain', type: 'courtyard-fountain' as const, position: [0, 0, 0] as [number, number, number] },
        { label: 'Observation Rig', type: 'observation-rig' as const, position: [0, 0, 0] as [number, number, number] },
        { label: 'Bench Growth', type: 'bench-growth' as const, position: [0, 0, 0] as [number, number, number] },
        { label: 'Growth Planter', type: 'growth-planter' as const, position: [0, 0, 0] as [number, number, number] },
        { label: 'Monolith', type: 'wasteland-monolith' as const, position: [0, 0, 0] as [number, number, number] },
        { label: 'Broken Ring', type: 'broken-ring' as const, position: [0, 0, 0] as [number, number, number] },
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
    if (node.prefab?.type) return EDITOR_PREFAB_GENERATION_LABELS[node.prefab.type] ?? node.name
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
    const node = editorNodes.find((candidate) => candidate.id === nodeId)
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
      .filter((node) => canBakeSceneNode(node))
      .map((node) => ({
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

  function getCuratedStyleBatchCandidateIds(levelId: string, nodes: EditorSceneNode[]) {
    const bakeableNodes = nodes.filter((node) => canBakeSceneNode(node))
    if (levelId !== 'yggdrasil') {
      return bakeableNodes.map((node) => node.id)
    }

    return bakeableNodes
      .filter((node) => {
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
      .map((node) => node.id)
  }

  function getSelectedParentId() {
    return selectedNode?.parentId ?? ''
  }

  function handleHierarchySelection(nodeId: string, event: MouseEvent) {
    const additive = event.shiftKey
    const toggle = event.metaKey || event.ctrlKey
    const order = filteredFlattenedNodes.map((node) => node.id)
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
        .filter((candidate) => candidate.prefab?.type === node.prefab?.type)
        .map((candidate) => candidate.id)
    }

    if (node.asset?.url) {
      return editorNodes
        .filter((candidate) => candidate.asset?.url === node.asset?.url)
        .map((candidate) => candidate.id)
    }

    if (node.gameplay?.type) {
      return editorNodes
        .filter((candidate) => candidate.gameplay?.type === node.gameplay?.type)
        .map((candidate) => candidate.id)
    }

    return editorNodes
      .filter((candidate) => candidate.kind === node.kind)
      .map((candidate) => candidate.id)
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
  $: styleSceneCandidates = getStyleSceneCandidates(editorNodes)
  $: {
    const candidateIds = styleSceneCandidates.map((candidate) => candidate.id)
    const retained = styleBatchSelectionIds.filter((id) => candidateIds.includes(id))
    if ((!styleBatchSelectionInitialized || (candidateIds.length > 0 && retained.length === 0 && styleBatchSelectionIds.length > 0)) && candidateIds.length > 0) {
      styleBatchSelectionIds = getCuratedStyleBatchCandidateIds(activeSceneLevelId, editorNodes)
      styleBatchSelectionInitialized = true
    } else if (retained.length !== styleBatchSelectionIds.length) {
      styleBatchSelectionIds = retained
    } else if (candidateIds.length === 0) {
      styleBatchSelectionInitialized = false
    }
  }

  $: if (activeSceneLevelId === 'yggdrasil' && styleLevelDefaultsAppliedFor !== activeSceneLevelId && !styleBatchSession) {
    styleProfileName = 'Mythic Norse World-Tree'
    stylePrompt = 'ancient Norse mythic environment, Yggdrasil world-tree shrine, sacred wells, weathered cosmic wood, rune-carved stone, moss, lichen, cold mist, restrained gold accents, monumental scale, painterly but grounded, cohesive mythic material language, sacred age, reverence, carved history'
    styleNegativePrompt = 'photorealistic, modern architecture, sci-fi panels, cyberpunk neon, plastic materials, glossy synthetic surfaces, busy microdetail, random decals, toy-like fantasy, bright cluttered rainbow gradients'
    styleLoraNotes = 'Lean toward mythic Scandinavian sacred landscape rather than generic high fantasy.'
    styleControlNetNotes = 'Preserve silhouette, climbability, collision readability, path readability, sacred landmark hierarchy, and the overwhelming scale of the world-tree.'
    styleBatchSelectionIds = getCuratedStyleBatchCandidateIds(activeSceneLevelId, editorNodes)
    styleBatchSelectionInitialized = true
    styleLevelDefaultsAppliedFor = activeSceneLevelId
  } else if (styleLevelDefaultsAppliedFor && styleLevelDefaultsAppliedFor !== activeSceneLevelId) {
    styleLevelDefaultsAppliedFor = ''
  }

  function selectAllStyleBatchCandidates() {
    styleBatchSelectionIds = styleSceneCandidates.map((candidate) => candidate.id)
  }

  function clearStyleBatchCandidates() {
    styleBatchSelectionIds = []
  }

  function toggleStyleBatchCandidate(candidateId: string, selected: boolean) {
    if (selected) {
      if (!styleBatchSelectionIds.includes(candidateId)) {
        styleBatchSelectionIds = [...styleBatchSelectionIds, candidateId]
      }
      return
    }

    styleBatchSelectionIds = styleBatchSelectionIds.filter((id) => id !== candidateId)
  }

  function selectSimilarNodes() {
    if (!selectedNode) return

    const ids = getSimilarNodeIds(selectedNode)
    if (ids.length === 0) return

    const anchorId = ids.includes(selectedNode.id) ? selectedNode.id : ids[0] ?? null
    setSelectedNodes(ids, anchorId)
    saveMessage = `Selected ${ids.length} ${getSimilarNodeLabel(selectedNode)}`
  }

  function getAiReplacementTargetIds(node: EditorSceneNode | null) {
    if (!node) return []
    if (!hunyuanApplyToSimilarNodes) return [node.id]

    const ids = getSimilarNodeIds(node)
    return ids.length > 0 ? ids : [node.id]
  }

  function updateParent(nextParentId: string) {
    if (selectedNodes.length === 0) return
    const applied = reparentNodes(selectedNodes.map((node) => node.id), nextParentId || null)
    saveMessage = applied ? 'Hierarchy updated' : 'Invalid parent relationship'
  }

  function setNestedValue<T>(source: T, path: Array<string | number>, value: unknown): T {
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

  function updateObservatorySetting(path: Array<string | number>, value: unknown) {
    updateObservatorySceneSettings((settings) => setNestedValue(settings, path, value))
  }

  function updateObservatoryNumericSetting(path: Array<string | number>, value: string) {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    updateObservatorySetting(path, numeric)
  }

  function updateLevelSetting(path: Array<string | number>, value: unknown) {
    updateLevelSceneSettings((settings) => setNestedValue(settings, path, value))
  }

  function updateLevelNumericSetting(path: Array<string | number>, value: string) {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    updateLevelSetting(path, numeric)
  }

  function updateSolitudeSetting(path: Array<string | number>, value: unknown) {
    updateSolitudeSceneSettings((settings) => setNestedValue(settings, path, value))
  }

  function updateSolitudeNumericSetting(path: Array<string | number>, value: string) {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    updateSolitudeSetting(path, numeric)
  }

  function startHierarchyDrag(nodeId: string, event: DragEvent) {
    const ids = editorState.selectedNodeIds.includes(nodeId) && dragSelectionIds.length > 0
      ? dragSelectionIds
      : [nodeId]

    draggedHierarchyNodeIds = ids
    if (!editorState.selectedNodeIds.includes(nodeId)) {
      selectEditorNode(nodeId)
    }

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', ids.join(','))
    }
  }

  function clearHierarchyDragState() {
    draggedHierarchyNodeIds = []
    hierarchyDropTargetId = null
    hierarchyRootDropActive = false
  }

  function allowHierarchyDrop(event: DragEvent, targetId: string | null) {
    event.preventDefault()
    hierarchyDropTargetId = targetId
    hierarchyRootDropActive = targetId === null
  }

  function dropHierarchy(event: DragEvent, targetId: string | null) {
    event.preventDefault()
    const ids = draggedHierarchyNodeIds.length > 0
      ? draggedHierarchyNodeIds
      : (event.dataTransfer?.getData('text/plain') ?? '').split(',').filter(Boolean)

    if (ids.length === 0) {
      clearHierarchyDragState()
      return
    }

    const applied = reparentNodes(ids, targetId)
    saveMessage = applied
      ? (targetId ? 'Hierarchy moved under parent' : 'Hierarchy moved to root')
      : 'Invalid hierarchy drop'
    clearHierarchyDragState()
  }

  async function loadAssetBrowser(path: string) {
    assetBrowserLoading = true
    assetBrowserError = ''
    selectedLibraryItem = null
    setRuntimeDiagnostic('toolsBridge', {
      level: 'loading',
      message: `Browsing assets from ${path}…`,
    })
    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/browse?path=${encodeURIComponent(path)}`)
      const payload = await response.json()
      if (!payload?.success) {
        assetBrowserError = payload?.message ?? 'Failed to browse assets'
        setRuntimeDiagnostic('toolsBridge', {
          level: 'warning',
          message: assetBrowserError,
        })
        return []
      }
      assetBrowserPath = path
      const nextItems = payload.items
        .filter((item: any) => item.isDirectory || /\.(gltf|glb)$/i.test(item.name))
        .sort((a: any, b: any) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name))
      assetBrowserItems = nextItems
      setRuntimeDiagnostic('toolsBridge', {
        level: 'ready',
        message: `Asset browser connected. Loaded ${nextItems.length} entries from ${path}.`,
      })
      return nextItems
    } catch (error) {
      console.error('Asset browser load failed:', error)
      assetBrowserError = 'Asset browser unavailable'
      reportRuntimeAssetFailure('asset-browser', assetBrowserError)
      setRuntimeDiagnostic('toolsBridge', {
        level: 'error',
        message: `Asset browser unavailable at ${EDITOR_API_BASE}.`,
      })
      return []
    } finally {
      assetBrowserLoading = false
    }
  }

  const textureFilePattern = /\.(png|jpe?g|webp|gif|bmp|tga|avif)$/i

  function resolvePublicAssetUrl(path: string, fallbackName: string) {
    const publicPrefixes = ['apps/game/public/', 'apps/megameal/public/']
    const matchedPrefix = publicPrefixes.find((prefix) => path.startsWith(prefix))
    if (matchedPrefix) {
      return `/${path.slice(matchedPrefix.length)}`
    }

    return `/${fallbackName}`
  }

  async function loadTextureBrowser(path: string) {
    textureBrowserLoading = true
    textureBrowserError = ''
    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/browse?path=${encodeURIComponent(path)}`)
      const payload = await response.json()
      if (!payload?.success) {
        textureBrowserError = payload?.message ?? 'Failed to browse textures'
        return
      }
      textureBrowserPath = path
      textureBrowserItems = payload.items
        .filter((item: any) => item.isDirectory || textureFilePattern.test(item.name))
        .sort((a: any, b: any) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name))
    } catch (error) {
      console.error('Texture browser load failed:', error)
      textureBrowserError = 'Texture browser unavailable'
    } finally {
      textureBrowserLoading = false
    }
  }

  async function loadWorkflowBrowser(path: string) {
    workflowBrowserLoading = true
    workflowBrowserError = ''

    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/browse?path=${encodeURIComponent(path)}`)
      const payload = await response.json()
      if (!payload?.success) {
        workflowBrowserError = payload?.message ?? 'Failed to browse workflows'
        return
      }

      workflowBrowserPath = path
      workflowBrowserItems = payload.items
        .filter((item: any) => item.isDirectory || /\.json$/i.test(item.name))
        .sort((a: any, b: any) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name))
    } catch (error) {
      console.error('Workflow browser load failed:', error)
      workflowBrowserError = 'Workflow browser unavailable'
    } finally {
      workflowBrowserLoading = false
    }
  }

  function selectWorkflowPath(item: { name: string, path: string, isDirectory: boolean }) {
    if (item.isDirectory) {
      void loadWorkflowBrowser(item.path)
      return
    }

    selectedComfyWorkflowPath = item.path
    saveMessage = `Selected workflow: ${item.name}`
  }

  function resetSelectedWorkflowPath() {
    selectedComfyWorkflowPath = DEFAULT_COMFY_WORKFLOW_PATH
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('merkin:selected-comfy-workflow-path', DEFAULT_COMFY_WORKFLOW_PATH)
    }
    saveMessage = 'Reset Comfy workflow to the built-in default'
  }

  function goUpWorkflowBrowser() {
    const parts = workflowBrowserPath.split('/').filter(Boolean)
    if (parts.length <= 1) return
    parts.pop()
    void loadWorkflowBrowser(parts.join('/'))
  }

  $: if (typeof window !== 'undefined' && selectedComfyWorkflowPath) {
    window.localStorage.setItem('merkin:selected-comfy-workflow-path', selectedComfyWorkflowPath)
  }

  function goUpTextureBrowser() {
    const parts = textureBrowserPath.split('/').filter(Boolean)
    if (parts.length <= 1) return
    parts.pop()
    void loadTextureBrowser(parts.join('/'))
  }

  function openTexturePicker(field: 'mapUrl' | 'normalMapUrl' | 'roughnessMapUrl' | 'metalnessMapUrl' | 'emissiveMapUrl' | 'alphaMapUrl') {
    activeTextureMaterialField = field
    if (textureBrowserItems.length === 0 && !textureBrowserLoading) {
      void loadTextureBrowser(textureBrowserPath)
    }
  }

  function applyTextureFromBrowser(item: { name: string, path: string }) {
    if (!activeTextureMaterialField) return
    updateNodeMaterialTextureField(activeTextureMaterialField, resolvePublicAssetUrl(item.path, item.name))
    activeTextureMaterialField = null
  }

  function goUpAssetBrowser() {
    const parts = assetBrowserPath.split('/').filter(Boolean)
    if (parts.length <= 1) return
    parts.pop()
    void loadAssetBrowser(parts.join('/'))
  }

  function selectAssetLibraryRoot(path: string) {
    selectedLibraryItem = null
    void loadAssetBrowser(path)
  }

  function selectLibraryItem(item: { name: string, path: string, isDirectory: boolean }) {
    if (item.isDirectory) {
      selectedLibraryItem = null
      void loadAssetBrowser(item.path)
      return
    }

    selectedLibraryItem = item
    hunyuanSelectionKey = item.path
    lastInspectedHunyuanAsset = ''
    const publicUrl = resolvePublicAssetUrl(item.path, item.name)
    void inspectSelectedAssetForHunyuan(publicUrl, item.path)
  }

  function getSelectedLibraryItemUrl() {
    if (!selectedLibraryItem || selectedLibraryItem.isDirectory) return ''
    return resolvePublicAssetUrl(selectedLibraryItem.path, selectedLibraryItem.name)
  }

  function getSelectedLibraryItemName() {
    if (!selectedLibraryItem) return ''
    return selectedLibraryItem.name.replace(/\.(gltf|glb)$/i, '')
  }

  function getAssetBrowserDefaultScale(item: { name: string, path: string }) {
    return item.path.startsWith(ASSET_LIBRARY_ROOT_GENERATED)
      ? [1, 1, 1] as [number, number, number]
      : [0.001, 0.001, 0.001] as [number, number, number]
  }

  function addSelectedLibraryAssetToScene() {
    if (!selectedLibraryItem || selectedLibraryItem.isDirectory) return
    addAssetFromBrowser(selectedLibraryItem)
  }

  async function refreshGeneratedAssetLibrary(selectAssetUrl?: string) {
    const rootItems = await loadAssetBrowser(ASSET_LIBRARY_ROOT_GENERATED)

    if (!selectAssetUrl) return
    const normalizedUrl = selectAssetUrl.replace(/^\/+/, '')
    const workspaceCandidates = [
      `apps/megameal/public/${normalizedUrl}`,
      `apps/game/public/${normalizedUrl}`,
    ]
    const selectedDirectory = workspaceCandidates[0].replace(/\/[^/]+$/, '')
    const directoryItems = selectedDirectory === ASSET_LIBRARY_ROOT_GENERATED
      ? rootItems
      : await loadAssetBrowser(selectedDirectory)
    const foundItem = directoryItems.find((item) => workspaceCandidates.includes(item.path))
    if (foundItem) {
      selectedLibraryItem = foundItem
      hunyuanSelectionKey = foundItem.path
      assetBrowserPath = selectedDirectory
      assetBrowserFilter = foundItem.name.replace(/\.(gltf|glb)$/i, '')
    }
  }

  function getApplicableSelectionNodeIds() {
    if (selectedNodes.length > 0) {
      return selectedNodes
        .filter((node) => canUseAiMeshStudio(node))
        .map((node) => node.id)
    }

    if (selectedNode && canUseAiMeshStudio(selectedNode)) {
      return [selectedNode.id]
    }

    return []
  }

  $: canApplyGeneratedAssetToSelection = hunyuanLastOutputUrl !== '' && getApplicableSelectionNodeIds().length > 0

  async function openGeneratedAssetInLibrary() {
    if (!hunyuanLastOutputUrl) return
    activeEditorTab = 'create'
    await refreshGeneratedAssetLibrary(hunyuanLastOutputUrl)
    saveMessage = `Opened generated asset in library: ${hunyuanLastOutputUrl}`
  }

  async function applyGeneratedAssetToSelection() {
    if (!hunyuanLastOutputUrl) {
      saveMessage = 'No generated asset available to apply'
      return
    }

    const targetNodeIds = getApplicableSelectionNodeIds()
    if (targetNodeIds.length === 0) {
      saveMessage = 'Select one or more prefab or asset nodes to apply the generated asset'
      return
    }

    const replacementPatch = {
      kind: 'asset' as const,
      asset: { url: hunyuanLastOutputUrl },
      prefab: undefined,
      primitive: undefined,
    }

    if (targetNodeIds.length > 1) {
      patchNodes(targetNodeIds, replacementPatch)
    } else {
      patchNode(targetNodeIds[0], replacementPatch)
    }

    hunyuanStatus = `Applied generated asset to ${targetNodeIds.length} node${targetNodeIds.length === 1 ? '' : 's'}.`
    hunyuanLastResultSummary = hunyuanStatus
    setRuntimeDiagnostic('hunyuan', {
      level: 'ready',
      message: hunyuanStatus,
    })
    saveMessage = `AI asset applied: ${hunyuanLastOutputUrl}`

    if (selectedNode && targetNodeIds.includes(selectedNode.id)) {
      void inspectSelectedAssetForHunyuan(hunyuanLastOutputUrl, selectedNode.id)
    }
  }

  async function saveCurrentSceneToDisk() {
    await overwriteLevelScene()
  }

  async function openComfyUiWorkflowEditor(mode: 'generate' | 'texture') {
    const sourceNode = selectedNode
    const assetUrl = mode === 'texture' ? (sourceNode?.asset?.url ?? '') : (sourceNode?.asset?.url ?? '')
    const sourceName = sourceNode ? getAiSourceName(sourceNode) : (hunyuanScratchName.trim() || 'Generated Asset')
    const referenceImageUrl = sourceNode
      ? (hunyuanReferenceImageUrl || hunyuanDetectedReferenceImageUrl)
      : hunyuanScratchReferenceImageUrl

    try {
      const response = await fetch(
        `${EDITOR_API_BASE}/api/comfyui/workflow-template?mode=${encodeURIComponent(mode)}&apiUrl=${encodeURIComponent(hunyuanApiUrl)}&comfyUiApiUrl=${encodeURIComponent(comfyUiApiUrl)}&assetUrl=${encodeURIComponent(assetUrl)}&sourceName=${encodeURIComponent(sourceName)}&referenceImageUrl=${encodeURIComponent(referenceImageUrl)}&workflowPath=${encodeURIComponent(selectedComfyWorkflowPath)}`,
      )
      const payload = await response.json()

      if (!payload?.success || !payload?.workflow) {
        throw new Error(payload?.message ?? 'Could not build a ComfyUI workflow template.')
      }

      const workflowJson = JSON.stringify(payload.workflow, null, 2)
      await navigator.clipboard.writeText(workflowJson)
      if (typeof window !== 'undefined') {
        window.open(payload.editorUrl || comfyUiApiUrl, '_blank', 'noopener,noreferrer')
      }

      comfyWorkflowEditorStatus = payload.message ?? 'Workflow copied to clipboard and ComfyUI opened.'
      saveMessage = comfyWorkflowEditorStatus
    } catch (error) {
      console.error('Open ComfyUI workflow editor failed:', error)
      comfyWorkflowEditorStatus = error instanceof Error
        ? error.message
        : 'Failed to open the ComfyUI workflow editor.'
      saveMessage = comfyWorkflowEditorStatus
    }
  }

  async function refreshHunyuanRecentJobs(limit = 10) {
    hunyuanJobsLoading = true
    hunyuanJobsError = ''

    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/hunyuan3d/jobs?limit=${encodeURIComponent(String(limit))}`)
      const payload = await response.json()

      if (!payload?.success || !Array.isArray(payload.jobs)) {
        recentHunyuanJobs = []
        hunyuanJobsError = payload?.message ?? 'Could not load recent Hunyuan jobs.'
        return
      }

      recentHunyuanJobs = payload.jobs
      if (!selectedHunyuanJobId || !recentHunyuanJobs.some((job) => job.id === selectedHunyuanJobId)) {
        selectedHunyuanJobId = recentHunyuanJobs.find((job) => job.status === 'failed')?.id
          ?? recentHunyuanJobs[0]?.id
          ?? ''
      }
    } catch (error) {
      console.error('Recent Hunyuan jobs load failed:', error)
      recentHunyuanJobs = []
      hunyuanJobsError = `Job history unavailable at ${EDITOR_API_BASE}.`
    } finally {
      hunyuanJobsLoading = false
    }
  }

  $: selectedHunyuanJob = recentHunyuanJobs.find((job) => job.id === selectedHunyuanJobId) ?? null
  $: workflowSelectionSummary = selectedNodes.length > 1
    ? `${selectedNodes.length} objects selected`
    : selectedNode
      ? `${selectedNode.name} selected`
      : 'No selection yet'
  $: workflowCanGenerateSelection = !!selectedNode && selectedNodes.length <= 1 && canUseAiMeshStudio(selectedNode) && hunyuanBackendCanGenerate && hunyuanSupportsReplacement
  $: workflowCanRetextureSelection = !!selectedNode && selectedNodes.length <= 1 && canRetextureSelection(selectedNode) && hunyuanBackendCanRetexture && hunyuanSupportsTextureWrap

  $: {
    const shouldPollHunyuanJobs = activeEditorTab === 'ai'
    if (typeof window !== 'undefined' && shouldPollHunyuanJobs && hunyuanJobsPollInterval === null) {
      void refreshHunyuanRecentJobs()
      hunyuanJobsPollInterval = window.setInterval(() => {
        void refreshHunyuanRecentJobs()
      }, 4000)
    } else if ((!shouldPollHunyuanJobs || typeof window === 'undefined') && hunyuanJobsPollInterval !== null) {
      window.clearInterval(hunyuanJobsPollInterval)
      hunyuanJobsPollInterval = null
    }
  }

  function addAssetFromBrowser(item: { name: string, path: string }) {
    const url = resolvePublicAssetUrl(item.path, item.name)
    addAssetPrefab(item.name.replace(/\.(gltf|glb)$/i, ''), url, getAssetBrowserDefaultScale(item))
    saveMessage = item.path.startsWith(ASSET_LIBRARY_ROOT_GENERATED)
      ? `Added generated asset at scene scale: ${url}`
      : `Added imported asset: ${url}`
  }

  function openAssetPickerForSelectedNode(preferredRoot: string = ASSET_LIBRARY_ROOT_GENERATED) {
    if (!selectedNode?.asset) {
      saveMessage = 'Select an asset node before choosing a replacement asset'
      return
    }

    assetPickerTargetNodeId = selectedNode.id
    selectedLibraryItem = null
    assetBrowserFilter = ''
    void loadAssetBrowser(preferredRoot)
    saveMessage = `Choose a replacement asset for ${selectedNode.name}`
  }

  function applySelectedLibraryAssetToTargetNode() {
    if (!assetPickerTargetNodeId) {
      saveMessage = 'No target object is waiting for an asset replacement'
      return
    }
    if (!selectedLibraryItem || selectedLibraryItem.isDirectory) {
      saveMessage = 'Select an asset file from the library first'
      return
    }

    const targetNode = editorNodes.find((node) => node.id === assetPickerTargetNodeId)
    if (!targetNode?.asset) {
      saveMessage = 'The target object is no longer available for asset replacement'
      assetPickerTargetNodeId = ''
      return
    }

    const url = resolvePublicAssetUrl(selectedLibraryItem.path, selectedLibraryItem.name)
    patchNode(targetNode.id, {
      asset: {
        ...targetNode.asset,
        url,
      },
    })

    selectEditorNode(targetNode.id)
    assetPickerTargetNodeId = ''
    saveMessage = `Replaced ${targetNode.name} with ${selectedLibraryItem.name}`
    void inspectSelectedAssetForHunyuan(url, targetNode.id)
  }

  function cancelAssetPickerTarget() {
    assetPickerTargetNodeId = ''
    saveMessage = 'Asset replacement picker closed'
  }

  function addLatestGeneratedAssetToScene() {
    if (!hunyuanLastOutputUrl) {
      saveMessage = 'No generated asset available yet'
      return
    }

    const assetName = hunyuanLastOutputUrl.split('/').pop()?.replace(/\.(gltf|glb)$/i, '') || 'Generated Asset'
    addAssetPrefab(assetName, hunyuanLastOutputUrl, [1, 1, 1])
    saveMessage = `Added latest generated asset at scene scale: ${hunyuanLastOutputUrl}`
  }

  async function inspectSelectedAssetForHunyuan(assetUrl: string, selectionKey: string) {
    const inspectToken = ++hunyuanInspectToken
    hunyuanStatus = 'Inspecting selected asset for Hunyuan compatibility…'
    hunyuanDetectedReferenceImageUrl = ''
    hunyuanReferenceImageUrl = ''
    hunyuanSupportsReplacement = false
    hunyuanSupportsTextureWrap = false
    hunyuanLastOutputUrl = ''

    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/hunyuan3d/inspect?assetUrl=${encodeURIComponent(assetUrl)}`)
      const payload = await response.json()

      if (inspectToken !== hunyuanInspectToken || selectionKey !== hunyuanSelectionKey) return

      if (!payload?.success || !payload.inspection) {
        hunyuanStatus = payload?.message ?? 'Could not inspect this asset for AI generation.'
        return
      }

      hunyuanDetectedReferenceImageUrl = payload.inspection.detectedReferenceImageUrl ?? ''
      hunyuanReferenceImageUrl = payload.inspection.detectedReferenceImageUrl ?? ''
      hunyuanSupportsReplacement = !!payload.inspection.supportsReplacementGeneration
      hunyuanSupportsTextureWrap = !!payload.inspection.supportsTextureWrap
      hunyuanStatus = payload.inspection.message ?? 'Selected asset is ready for Hunyuan.'
      setRuntimeDiagnostic('hunyuan', {
        level: 'ready',
        message: hunyuanStatus,
      })
    } catch (error) {
      if (inspectToken !== hunyuanInspectToken || selectionKey !== hunyuanSelectionKey) return
      console.error('Hunyuan asset inspect failed:', error)
      hunyuanStatus = `Hunyuan bridge unavailable at ${EDITOR_API_BASE}.`
      setRuntimeDiagnostic('hunyuan', {
        level: 'error',
        message: hunyuanStatus,
      })
    }
  }

  async function runHunyuanForSelection(mode: 'generate' | 'texture') {
    if (!selectedNode || !canUseAiMeshStudio(selectedNode)) {
      hunyuanStatus = 'Select a single geometry node before running Hunyuan.'
      return
    }

    const targetNodeId = selectedNode.id
    const targetNodeIds = getAiReplacementTargetIds(selectedNode)
    const targetSourceName = getAiSourceName(selectedNode)
    const source = await ensureSceneNodeSourceAsset(selectedNode)
    const targetAssetUrl = source.assetUrl

    if (mode === 'texture' && !targetAssetUrl) {
      hunyuanStatus = 'Texture wrapping needs an imported mesh asset. Generate a replacement mesh first for prefabs.'
      return
    }
    if (mode === 'generate' && !hunyuanBackendCanGenerate) {
      await refreshHunyuanServiceStatus(true)
      if (!hunyuanBackendCanGenerate) {
        hunyuanStatus = hunyuanBackendStatus
        return
      }
    }
    if (mode === 'texture' && !hunyuanBackendCanRetexture) {
      await refreshHunyuanServiceStatus(true)
      if (!hunyuanBackendCanRetexture) {
        hunyuanStatus = hunyuanBackendStatus
        return
      }
    }

    hunyuanBusy = true
    hunyuanStatus =
      mode === 'texture'
        ? 'Preparing Hunyuan and generating a UV-style texture wrap from the selected mesh…'
        : targetAssetUrl
          ? 'Preparing Hunyuan and generating a replacement mesh from the selected reference…'
          : 'Preparing Hunyuan and generating a new mesh from the selected prefab and prompt…'

    try {
      const payload = await queueAndWaitForHunyuanJob({
        apiUrl: hunyuanApiUrl,
        comfyUiApiUrl,
        assetUrl: targetAssetUrl || undefined,
        sourceName: targetSourceName,
        mode,
        prompt: (hunyuanPrompt || targetSourceName).trim(),
        referenceImageUrl: hunyuanReferenceImageUrl,
        workflowPath: selectedComfyWorkflowPath,
      })

      const replacementPatch = {
        kind: 'asset' as const,
        asset: {
          url: payload.assetUrl,
        },
        prefab: undefined,
        primitive: undefined,
        generation: {
          ...(selectedNode.generation ?? {}),
          descriptor: getDefaultStyleDescriptor(selectedNode),
          lastBakedAssetUrl: payload.assetUrl,
          lastBakedAt: new Date().toISOString(),
        },
      }

      if (targetNodeIds.length > 1) {
        patchNodes(targetNodeIds, replacementPatch)
      } else {
        patchNode(targetNodeId, replacementPatch)
      }

      hunyuanLastOutputUrl = payload.assetUrl
      hunyuanLastResultSummary = targetNodeIds.length > 1
        ? `Generated and replaced ${targetNodeIds.length} matching nodes.`
        : 'Generated and replaced the selected node.'
      hunyuanServiceReady = true
      hunyuanStatus = payload.message
        ?? (targetNodeIds.length > 1
          ? `Generated asset applied to ${targetNodeIds.length} matching nodes.`
          : 'Generated asset imported into the selected node.')
      setRuntimeDiagnostic('hunyuan', {
        level: 'ready',
        message: hunyuanStatus,
      })
      saveMessage = targetNodeIds.length > 1
        ? `AI asset applied to ${targetNodeIds.length} nodes: ${payload.assetUrl}`
        : `AI asset applied: ${payload.assetUrl}`
      await refreshGeneratedAssetLibrary(payload.assetUrl)
      if (selectedNode?.id === targetNodeId) {
        void inspectSelectedAssetForHunyuan(payload.assetUrl, targetNodeId)
      }
    } catch (error) {
      console.error('Hunyuan generation failed:', error)
      hunyuanStatus = error instanceof Error
        ? error.message
        : 'Hunyuan generation failed. Check the local server and Hunyuan API process.'
      setRuntimeDiagnostic('hunyuan', {
        level: 'error',
        message: hunyuanStatus,
      })
    } finally {
      hunyuanActiveJobId = ''
      hunyuanBusy = false
    }
  }

  async function refreshHunyuanServiceStatus(ensure = false) {
    try {
      const response = await fetch(
        `${EDITOR_API_BASE}/api/hunyuan3d/status?apiUrl=${encodeURIComponent(hunyuanApiUrl)}&comfyUiApiUrl=${encodeURIComponent(comfyUiApiUrl)}${ensure ? '&ensure=1' : ''}`,
      )
      const payload = await response.json()

      if (!payload?.success || !payload?.status) {
        hunyuanServiceReady = false
        hunyuanBackendCanGenerate = false
        hunyuanBackendCanRetexture = false
        hunyuanBackendStatus = payload?.message ?? 'Mesh backend unavailable.'
        setRuntimeDiagnostic('hunyuan', {
          level: 'warning',
          message: hunyuanBackendStatus,
        })
        return
      }

      hunyuanServiceReady = !!payload.status.available
      hunyuanBackendCanGenerate = !!payload.status.supportsReplacementGeneration
      hunyuanBackendCanRetexture = !!payload.status.supportsTextureWrap
      hunyuanBackendStatus = payload.status.message ?? hunyuanBackendStatus
      setRuntimeDiagnostic('hunyuan', {
        level: hunyuanServiceReady ? 'ready' : 'warning',
        message: hunyuanBackendStatus,
      })
    } catch {
      hunyuanServiceReady = false
      hunyuanBackendCanGenerate = false
      hunyuanBackendCanRetexture = false
      hunyuanBackendStatus = `Mesh backend unavailable at ${EDITOR_API_BASE}.`
      setRuntimeDiagnostic('hunyuan', {
        level: 'error',
        message: hunyuanBackendStatus,
      })
    }
  }

  async function refreshComfyUiServiceStatus(ensure = false) {
    comfyUiBusy = ensure
    try {
      const response = await fetch(
        `${EDITOR_API_BASE}/api/comfyui/status?apiUrl=${encodeURIComponent(comfyUiApiUrl)}${ensure ? '&ensure=1' : ''}`,
      )
      const payload = await response.json()

      if (!payload?.success || !payload?.status) {
        comfyUiReady = false
        comfyUiStatus = payload?.message ?? 'ComfyUI status unavailable.'
        setRuntimeDiagnostic('comfyUi', {
          level: 'warning',
          message: comfyUiStatus,
        })
        return
      }

      comfyUiReady = !!payload.status.available
      comfyUiStatus = payload.status.message ?? comfyUiStatus
      setRuntimeDiagnostic('comfyUi', {
        level: comfyUiReady ? 'ready' : 'warning',
        message: comfyUiStatus,
      })
    } catch {
      comfyUiReady = false
      comfyUiStatus = `ComfyUI bridge unavailable at ${EDITOR_API_BASE}.`
      setRuntimeDiagnostic('comfyUi', {
        level: 'error',
        message: comfyUiStatus,
      })
    } finally {
      comfyUiBusy = false
    }
  }

  function createGeneratedAssetNode(assetUrl: string, name: string) {
    const fallbackName = name.trim() || 'Generated Asset'
    const parentId = selectedNode?.kind === 'group' ? selectedNode.id : (selectedNode?.parentId ?? null)
    const anchorPosition = selectedNode?.position ?? [0, 0, 0]
    const nextPosition: [number, number, number] = [anchorPosition[0] + (selectedNode ? 2 : 0), anchorPosition[1], anchorPosition[2]]

    addNode({
      id: `asset-${Date.now()}`,
      name: fallbackName,
      kind: 'asset',
      parentId,
      position: nextPosition,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      asset: { url: assetUrl },
    })
  }

  async function runHunyuanToLibrary(options?: { addToScene?: boolean }) {
    const sourceName = hunyuanScratchName.trim() || 'Generated Artifact'
    const prompt = hunyuanScratchPrompt.trim()
    const referenceImageUrl = hunyuanScratchReferenceImageUrl.trim()

    if (!prompt && !referenceImageUrl) {
      hunyuanStatus = 'Enter a prompt or reference image before generating a new asset.'
      return
    }
    if (!hunyuanBackendCanGenerate) {
      await refreshHunyuanServiceStatus(true)
      if (!hunyuanBackendCanGenerate) {
        hunyuanStatus = hunyuanBackendStatus
        return
      }
    }

    hunyuanBusy = true
    hunyuanStatus = `Preparing Hunyuan and generating ${sourceName} into the asset library…`

    try {
      const payload = await queueAndWaitForHunyuanJob({
        apiUrl: hunyuanApiUrl,
        comfyUiApiUrl,
        sourceName,
        mode: 'generate',
        prompt,
        referenceImageUrl,
        workflowPath: selectedComfyWorkflowPath,
      })

      hunyuanLastOutputUrl = payload.assetUrl
      hunyuanLastResultSummary = options?.addToScene
        ? 'Generated a new asset, added it to the scene, and stored it in the library.'
        : 'Generated a new asset in the library. It has not been applied to the current selection.'
      hunyuanServiceReady = true
      hunyuanStatus = payload.message ?? `Generated ${sourceName} into the asset library.`
      setRuntimeDiagnostic('hunyuan', {
        level: 'ready',
        message: hunyuanStatus,
      })
      saveMessage = `AI asset created: ${payload.assetUrl}`

      await refreshGeneratedAssetLibrary(payload.assetUrl)

      if (options?.addToScene) {
        createGeneratedAssetNode(payload.assetUrl, sourceName)
      }
    } catch (error) {
      console.error('Hunyuan generation failed:', error)
      hunyuanStatus = error instanceof Error
        ? error.message
        : 'Hunyuan generation failed. Check the local server and Hunyuan API process.'
      setRuntimeDiagnostic('hunyuan', {
        level: 'error',
        message: hunyuanStatus,
      })
    } finally {
      hunyuanActiveJobId = ''
      hunyuanBusy = false
    }
  }

  async function runHunyuanForLibraryAsset(mode: 'generate' | 'texture') {
    if (!selectedLibraryItem || selectedLibraryItem.isDirectory) {
      hunyuanStatus = 'Select a library asset before using AI reimagine tools.'
      return
    }

    const assetUrl = getSelectedLibraryItemUrl()
    const sourceName = getSelectedLibraryItemName()
    if (!assetUrl || !sourceName) {
      hunyuanStatus = 'Could not resolve the selected library asset.'
      return
    }

    if (mode === 'texture') {
      if (!hunyuanBackendCanRetexture) {
        await refreshHunyuanServiceStatus(true)
        if (!hunyuanBackendCanRetexture) {
          hunyuanStatus = hunyuanBackendStatus
          return
        }
      }
      if (!hunyuanSupportsTextureWrap) {
        await inspectSelectedAssetForHunyuan(assetUrl, selectedLibraryItem.path)
        if (!hunyuanSupportsTextureWrap) {
          hunyuanStatus = 'Texture wrapping currently supports only compatible mesh assets.'
          return
        }
      }
    } else {
      if (!hunyuanBackendCanGenerate) {
        await refreshHunyuanServiceStatus(true)
        if (!hunyuanBackendCanGenerate) {
          hunyuanStatus = hunyuanBackendStatus
          return
        }
      }
    }

    hunyuanBusy = true
    hunyuanStatus = mode === 'texture'
      ? `Retexturing ${sourceName} into a new library asset…`
      : `Reimagining ${sourceName} into a new library asset…`

    try {
      const payload = await queueAndWaitForHunyuanJob({
        apiUrl: hunyuanApiUrl,
        comfyUiApiUrl,
        assetUrl,
        sourceName,
        mode,
        prompt: (hunyuanPrompt || sourceName).trim(),
        referenceImageUrl: hunyuanReferenceImageUrl,
        workflowPath: selectedComfyWorkflowPath,
      })

      hunyuanLastOutputUrl = payload.assetUrl
      hunyuanLastResultSummary = `${sourceName} generated into the library as a new asset.`
      hunyuanServiceReady = true
      hunyuanStatus = payload.message ?? `${sourceName} generated into the asset library.`
      setRuntimeDiagnostic('hunyuan', {
        level: 'ready',
        message: hunyuanStatus,
      })
      saveMessage = `AI asset created: ${payload.assetUrl}`

      await refreshGeneratedAssetLibrary(payload.assetUrl)
    } catch (error) {
      console.error('Hunyuan generation failed:', error)
      hunyuanStatus = error instanceof Error
        ? error.message
        : 'Hunyuan generation failed. Check the local server and Hunyuan API process.'
      setRuntimeDiagnostic('hunyuan', {
        level: 'error',
        message: hunyuanStatus,
      })
    } finally {
      hunyuanActiveJobId = ''
      hunyuanBusy = false
    }
  }

  async function runHunyuanFromScratch() {
    await runHunyuanToLibrary({ addToScene: true })
  }

  async function queueHunyuanJob(requestBody: Record<string, unknown>) {
    const queueResponse = await fetch(`${EDITOR_API_BASE}/api/hunyuan3d/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })
    const queuePayload = await queueResponse.json()

    if (!queuePayload?.success || !queuePayload?.job?.id) {
      throw new Error(queuePayload?.message ?? 'Could not queue the Hunyuan job.')
    }

    return queuePayload.job
  }

  async function getHunyuanJobStatus(jobId: string) {
    const statusResponse = await fetch(`${EDITOR_API_BASE}/api/hunyuan3d/jobs?jobId=${encodeURIComponent(jobId)}`)
    const statusPayload = await statusResponse.json()

    if (!statusPayload?.success || !statusPayload?.job) {
      throw new Error(statusPayload?.message ?? 'Lost track of the Hunyuan job.')
    }

    return statusPayload.job
  }

  async function waitForQueuedHunyuanJob(
    jobId: string,
    options?: {
      onQueued?: (job: any) => void
      onRunning?: (job: any) => void
      onSucceeded?: (job: any) => void
    },
  ) {
    hunyuanActiveJobId = jobId
    void refreshHunyuanRecentJobs()

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const job = await getHunyuanJobStatus(jobId)
      void refreshHunyuanRecentJobs()
      const queuePosition = Number(job.queuePosition ?? 0)

      if (job.status === 'queued') {
        options?.onQueued?.(job)
        hunyuanStatus = queuePosition > 1
          ? `Queued for AI generation. Position ${queuePosition} in line.`
          : 'Queued for AI generation. Starting shortly…'
        setRuntimeDiagnostic('hunyuan', {
          level: 'loading',
          message: hunyuanStatus,
        })
        continue
      }

      if (job.status === 'running') {
        options?.onRunning?.(job)
        hunyuanStatus = 'Generating asset with ComfyUI + Hunyuan… this can take a while.'
        setRuntimeDiagnostic('hunyuan', {
          level: 'loading',
          message: hunyuanStatus,
        })
        continue
      }

      if (job.status === 'failed') {
        const result = job.result
        hunyuanServiceReady = !!result?.status?.available
        hunyuanBackendCanGenerate = !!result?.status?.supportsReplacementGeneration
        hunyuanBackendCanRetexture = !!result?.status?.supportsTextureWrap
        if (result?.status?.message) {
          hunyuanBackendStatus = result.status.message
        }
        throw new Error(job.error || result?.message || 'Hunyuan job failed.')
      }

      if (job.status === 'succeeded') {
        options?.onSucceeded?.(job)
        const result = job.result
        if (result?.status?.message) {
          hunyuanBackendStatus = result.status.message
        }
        if (!result?.assetUrl) {
          throw new Error(result?.message ?? 'Hunyuan job completed without an asset URL.')
        }
        return result
      }
    }
  }

  async function queueAndWaitForHunyuanJob(requestBody: Record<string, unknown>) {
    const queuedJob = await queueHunyuanJob(requestBody)
    hunyuanActiveJobId = queuedJob.id
    void refreshHunyuanRecentJobs()
    const initialQueuePosition = Number(queuedJob.queuePosition ?? 0)
    hunyuanStatus = initialQueuePosition > 1
      ? `Queued for AI generation. Position ${initialQueuePosition} in line.`
      : 'Queued for AI generation. Starting shortly…'
    setRuntimeDiagnostic('hunyuan', {
      level: 'loading',
      message: hunyuanStatus,
    })
    return waitForQueuedHunyuanJob(queuedJob.id)
  }

  async function arrayBufferToBase64(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunkSize = 0x8000
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
    }
    return btoa(binary)
  }

  async function stageSceneNodeSourceAsset(node: EditorSceneNode) {
    const exported = await exportSceneNodeToGlb(node)
    if (exported.kind === 'asset') {
      return {
        assetUrl: exported.assetUrl,
        sourceName: getAiSourceName(node),
      }
    }

    const glbBase64 = await arrayBufferToBase64(await exported.blob.arrayBuffer())
    const response = await fetch(`${EDITOR_API_BASE}/api/style/source-asset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: exported.fileName,
        glbBase64,
        sourceName: getAiSourceName(node),
        sourceKind: exported.kind,
        descriptor: getDefaultStyleDescriptor(node),
        levelId: activeSceneLevelId,
        nodeId: node.id,
      }),
    })
    const payload = await response.json()

    if (!payload?.success || !payload?.assetUrl) {
      throw new Error(payload?.message ?? `Could not stage a source mesh for ${node.name}.`)
    }

    return {
      assetUrl: payload.assetUrl as string,
      sourceName: getAiSourceName(node),
    }
  }

  async function ensureSceneNodeSourceAsset(node: EditorSceneNode) {
    if (node.asset?.url) {
      return {
        assetUrl: node.asset.url,
        sourceName: getAiSourceName(node),
      }
    }

    const prefabAssetUrl = getPrefabAssetUrl(node.prefab?.type)
    if (prefabAssetUrl) {
      return {
        assetUrl: prefabAssetUrl,
        sourceName: getAiSourceName(node),
      }
    }

    return stageSceneNodeSourceAsset(node)
  }

  function buildNodeStylePrompt(node: EditorSceneNode) {
    const descriptor = getDefaultStyleDescriptor(node)
    const promptSegments = [
      descriptor,
      styleProfileName.trim() ? `style family: ${styleProfileName.trim()}` : '',
      stylePrompt.trim(),
      styleNegativePrompt.trim() ? `avoid: ${styleNegativePrompt.trim()}` : '',
    ].filter((segment) => segment.trim().length > 0)

    return promptSegments.join('. ')
  }

  function persistStyleBatchSession(session: PersistedStyleBatchSession | null) {
    styleBatchSession = session
    if (typeof window === 'undefined') return

    if (session) {
      saveStyleBatchSessionToLocalStorage(activeSceneLevelId, session)
      return
    }

    clearStyleBatchSessionFromLocalStorage(activeSceneLevelId)
  }

  function updatePersistedStyleBatchSession(mutator: (session: PersistedStyleBatchSession) => PersistedStyleBatchSession) {
    if (!styleBatchSession) return null
    const next = mutator(structuredClone(styleBatchSession) as PersistedStyleBatchSession)
    persistStyleBatchSession(next)
    return next
  }

  function createStyleBatchSession(mode: 'texture' | 'generate', candidateIds: string[]) {
    const entries: PersistedStyleBatchEntry[] = candidateIds
      .map((nodeId) => editorNodes.find((node) => node.id === nodeId))
      .filter((node): node is EditorSceneNode => !!node && canBakeSceneNode(node))
      .map((node) => ({
        nodeId: node.id,
        nodeName: node.name,
        descriptor: getDefaultStyleDescriptor(node),
        mode,
        sourceName: getAiSourceName(node),
        status: 'pending',
      }))

    return {
      levelId: activeSceneLevelId,
      mode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      styleProfileName,
      stylePrompt,
      styleNegativePrompt,
      styleLoraNotes,
      styleControlNetNotes,
      styleReferenceImageUrl,
      comfyUiApiUrl,
      hunyuanApiUrl,
      workflowPath: selectedComfyWorkflowPath,
      entries,
    } satisfies PersistedStyleBatchSession
  }

  async function inspectSelectedAssetForStyle() {
    if (!selectedNode || !canUseStyleStudio(selectedNode)) {
      styleStatus = 'Select a single geometry node to inspect it.'
      return
    }

    styleBusy = true
    styleStatus = `Inspecting ${selectedNode.name}…`

    try {
      const source = await ensureSceneNodeSourceAsset(selectedNode)
      const response = await fetch(`${EDITOR_API_BASE}/api/style/inspect?assetUrl=${encodeURIComponent(source.assetUrl)}`)
      const payload = await response.json()

      if (!payload?.success) {
        styleStatus = payload?.message ?? 'Style inspection failed.'
        return
      }

      if (!styleReferenceImageUrl && payload.inspection?.detectedReferenceImageUrl) {
        styleReferenceImageUrl = payload.inspection.detectedReferenceImageUrl
      }

      styleInspectReport = payload.analysis?.inspectReport ?? ''
      styleSourceSummary = `${payload.analysis?.sizeFormatted ?? 'Unknown size'} · ${payload.analysis?.modifiedAt ?? 'Unknown date'}`
      styleStatus = `Source analyzed. Next step: describe the target look, then package the style workspace for ${selectedNode.name}.`
    } catch (error) {
      console.error('Style inspection failed:', error)
      styleStatus = error instanceof Error
        ? error.message
        : 'Style inspection failed. Check the local tools bridge.'
    } finally {
      styleBusy = false
    }
  }

  async function restoreLatestStyleWorkspaceForSelection(assetUrl: string, selectionKey: string) {
    const restoreToken = ++styleWorkspaceRestoreToken

    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/style/workspace/latest?assetUrl=${encodeURIComponent(assetUrl)}`)
      const payload = await response.json()

      if (restoreToken !== styleWorkspaceRestoreToken || selectionKey !== styleSelectionKey) return false
      if (!payload?.success || !payload?.workspace) return false

      const workspace = payload.workspace
      styleWorkspaceManifestUrl = workspace.manifestUrl ?? ''
      styleWorkspaceSourceAssetUrl = workspace.sourceAssetUrl ?? ''
      styleGeneratedReferenceImageUrl = workspace.generatedReferenceImageUrl ?? ''
      styleReferenceImageUrl = workspace.referenceImageUrl || styleReferenceImageUrl
      styleProfileName = workspace.styleProfileName || styleProfileName
      stylePrompt = workspace.prompt || stylePrompt
      styleNegativePrompt = workspace.negativePrompt || styleNegativePrompt
      styleLoraNotes = workspace.loraNotes || styleLoraNotes
      styleControlNetNotes = workspace.controlNetNotes || styleControlNetNotes
      styleStatus = `Restored the latest style workspace for ${selectedNode?.name ?? 'the selected asset'}.`
      return true
    } catch (error) {
      if (restoreToken !== styleWorkspaceRestoreToken || selectionKey !== styleSelectionKey) return false
      console.error('Style workspace restore failed:', error)
      return false
    }
  }

  async function prepareStyleWorkspace() {
    if (!selectedNode || !canUseStyleStudio(selectedNode)) {
      styleStatus = 'Select a single geometry node to prepare a style workspace.'
      return false
    }

    styleBusy = true
    styleStatus = `Packaging ${selectedNode.name} into a style workspace…`

    try {
      const source = await ensureSceneNodeSourceAsset(selectedNode)
      const response = await fetch(`${EDITOR_API_BASE}/api/style/workspace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetUrl: source.assetUrl,
          sourceName: selectedNode.name,
          styleProfileName: styleProfileName.trim(),
          prompt: stylePrompt.trim(),
          negativePrompt: styleNegativePrompt.trim(),
          loraNotes: styleLoraNotes.trim(),
          controlNetNotes: styleControlNetNotes.trim(),
          referenceImageUrl: styleReferenceImageUrl.trim(),
          comfyUiApiUrl,
          hunyuanApiUrl,
          generateReferenceIfMissing: true,
        }),
      })
      const payload = await response.json()

      if (!payload?.success) {
        styleStatus = payload?.message ?? 'Style workspace generation failed.'
        return false
      }

      if (payload.referenceImageUrl) {
        styleReferenceImageUrl = payload.referenceImageUrl
      }

      styleWorkspaceManifestUrl = payload.manifestUrl ?? ''
      styleWorkspaceSourceAssetUrl = payload.sourceAssetUrl ?? ''
      styleGeneratedReferenceImageUrl = payload.generatedReferenceImageUrl ?? ''
      styleStatus = `Style workspace ready. Next step: use "Keep Shape, Bake New Style" to restyle ${selectedNode.name} without replacing its form.`
      saveMessage = `Style workspace prepared for ${selectedNode.name}`
      return true
    } catch (error) {
      console.error('Style workspace generation failed:', error)
      styleStatus = error instanceof Error
        ? error.message
        : 'Style workspace generation failed. Check ComfyUI and the tools bridge.'
      return false
    } finally {
      styleBusy = false
    }
  }

  async function ensureStyleWorkspaceReady() {
    if (!selectedNode || !canUseStyleStudio(selectedNode)) {
      styleStatus = 'Select a single geometry node before running a style bake.'
      return false
    }

    if (styleWorkspaceManifestUrl.trim()) {
      return true
    }

    if (selectedNode.asset?.url) {
      const restored = await restoreLatestStyleWorkspaceForSelection(selectedNode.asset.url, selectedNode.id)
      if (restored && styleWorkspaceManifestUrl.trim()) {
        return true
      }
    }

    return prepareStyleWorkspace()
  }

  async function simplifySelectedAssetForStyle() {
    if (!selectedNode || !canUseStyleStudio(selectedNode)) {
      styleStatus = 'Select a single geometry node before simplifying.'
      return
    }

    styleBusy = true
    styleStatus = `Simplifying ${selectedNode.name}…`

    try {
      const source = await ensureSceneNodeSourceAsset(selectedNode)
      const response = await fetch(`${EDITOR_API_BASE}/api/style/simplify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetUrl: source.assetUrl,
          outputName: `${selectedNode.name}-style`,
          ratio: styleSimplifyRatio,
          error: styleSimplifyError,
          lockBorder: true,
        }),
      })
      const payload = await response.json()

      if (!payload?.success) {
        styleStatus = payload?.message ?? 'Mesh simplification failed.'
        return
      }

      styleSimplifiedAssetUrl = payload.assetUrl ?? ''
      styleInspectReport = payload.inspectReport ?? styleInspectReport
      styleStatus = `Low-poly variant created. Review the generated asset or use it as the source for Blender cleanup.`
      saveMessage = `Simplified asset created: ${payload.assetUrl}`
      await refreshGeneratedAssetLibrary(payload.assetUrl)
    } catch (error) {
      console.error('Style simplify failed:', error)
      styleStatus = error instanceof Error
        ? error.message
        : 'Mesh simplification failed. Check the local tools bridge.'
    } finally {
      styleBusy = false
    }
  }

  async function exportSelectedAssetForBlender() {
    if (!selectedNode || !canUseStyleStudio(selectedNode)) {
      styleStatus = 'Select a single geometry node before exporting to Blender.'
      return
    }

    styleBusy = true
    styleStatus = `Exporting ${selectedNode.name} for Blender…`

    try {
      const source = await ensureSceneNodeSourceAsset(selectedNode)
      const response = await fetch(`${EDITOR_API_BASE}/api/style/export-blender`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetUrl: source.assetUrl,
          exportName: selectedNode.name,
          referenceImageUrl: styleReferenceImageUrl.trim(),
        }),
      })
      const payload = await response.json()

      if (!payload?.success) {
        styleStatus = payload?.message ?? 'Blender export failed.'
        return
      }

      styleBlenderExportPath = payload.exportedGlbPath ?? payload.exportDirectory ?? ''
      styleBlenderOpenCommand = payload.openCommand ?? ''
      styleStatus = `Blender package ready. Open the exported GLB for manual line work, mesh cleanup, or painted texture passes.`
    } catch (error) {
      console.error('Blender export failed:', error)
      styleStatus = error instanceof Error
        ? error.message
        : 'Blender export failed. Check the local tools bridge.'
    } finally {
      styleBusy = false
    }
  }

  async function runStyleBake(mode: 'generate' | 'texture') {
    if (!selectedNode || !canUseStyleStudio(selectedNode)) {
      styleStatus = 'Select a single geometry node before running AI style bake.'
      return
    }

    if (!stylePrompt.trim() && !styleReferenceImageUrl.trim()) {
      styleStatus = 'Enter a style prompt or reference image before running the AI bake.'
      return
    }

    const workspaceReady = await ensureStyleWorkspaceReady()
    if (!workspaceReady) {
      return
    }

    hunyuanPrompt = buildNodeStylePrompt(selectedNode)
    hunyuanReferenceImageUrl = styleReferenceImageUrl.trim()
    const previousOutputUrl = hunyuanLastOutputUrl
    styleStatus = mode === 'texture'
      ? `Submitting a texture-only style bake for ${selectedNode.name}…`
      : `Submitting a mesh-replacement AI generation for ${selectedNode.name}…`
    await runHunyuanForSelection(mode)
    styleStatus = hunyuanLastOutputUrl && hunyuanLastOutputUrl !== previousOutputUrl
      ? mode === 'texture'
        ? `Style bake finished. The selected node now points to a newly styled asset.`
        : `Mesh replacement finished. The selected node now points to a new AI-generated asset variant.`
      : hunyuanStatus
  }

  async function applyStyleBatchEntryResult(entry: PersistedStyleBatchEntry, assetUrl: string) {
    const node = editorNodes.find((candidate) => candidate.id === entry.nodeId)
    if (!node) {
      throw new Error(`Could not find ${entry.nodeName} in the current scene.`)
    }

    patchNode(entry.nodeId, {
      kind: 'asset',
      asset: { url: assetUrl },
      prefab: undefined,
      primitive: undefined,
      generation: {
        ...(node.generation ?? {}),
        descriptor: entry.descriptor,
        lastBakedAssetUrl: assetUrl,
        lastBakedAt: new Date().toISOString(),
      },
    })

    const scene = get(editorSceneStore)
    if (scene && typeof window !== 'undefined') {
      saveEditorSceneToLocalStorage(activeSceneLevelId, scene)
    }
  }

  async function resumeStyleBatchSession(session: PersistedStyleBatchSession) {
    styleBatchBusy = true
    persistStyleBatchSession(session)
    styleBatchStatus = `Resuming ${session.mode === 'texture' ? 'texture style' : 'mesh reimagine'} batch for ${session.entries.length} scene object${session.entries.length === 1 ? '' : 's'}…`
    styleBatchSelectionIds = session.entries.map((entry) => entry.nodeId)
    styleProfileName = session.styleProfileName
    stylePrompt = session.stylePrompt
    styleNegativePrompt = session.styleNegativePrompt
    styleLoraNotes = session.styleLoraNotes
    styleControlNetNotes = session.styleControlNetNotes
    styleReferenceImageUrl = session.styleReferenceImageUrl

    try {
      for (const entry of session.entries) {
        if (entry.status === 'applied') {
          styleBatchNodeStatusById = {
            ...styleBatchNodeStatusById,
            [entry.nodeId]: `Finished. Scene now uses ${entry.outputAssetUrl ?? 'the generated asset'}.`,
          }
          continue
        }

        if (entry.status === 'failed') {
          styleBatchNodeStatusById = {
            ...styleBatchNodeStatusById,
            [entry.nodeId]: entry.error || 'This batch item failed earlier and was not resumed.',
          }
          continue
        }

        const node = editorNodes.find((candidate) => candidate.id === entry.nodeId)
        if (!node || !canBakeSceneNode(node)) {
          const message = `Skipped ${entry.nodeName}; the node is missing or no longer geometry-backed.`
          styleBatchNodeStatusById = {
            ...styleBatchNodeStatusById,
            [entry.nodeId]: message,
          }
          updatePersistedStyleBatchSession((current) => ({
            ...current,
            entries: current.entries.map((candidate) => candidate.nodeId === entry.nodeId
              ? { ...candidate, status: 'failed', error: message }
              : candidate),
          }))
          continue
        }

        const prompt = buildNodeStylePrompt(node)
        let sourceAssetUrl = entry.sourceAssetUrl ?? ''

        if (!entry.jobId && entry.status === 'pending') {
          styleBatchStatus = session.mode === 'texture'
            ? `Baking style onto ${entry.nodeName}…`
            : `Reimagining ${entry.nodeName}…`
          styleBatchNodeStatusById = {
            ...styleBatchNodeStatusById,
            [entry.nodeId]: 'Preparing source asset…',
          }

          const source = await ensureSceneNodeSourceAsset(node)
          sourceAssetUrl = source.assetUrl

          await fetch(`${EDITOR_API_BASE}/api/style/workspace`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assetUrl: source.assetUrl,
              sourceName: node.name,
              styleProfileName: session.styleProfileName.trim(),
              prompt,
              negativePrompt: session.styleNegativePrompt.trim(),
              loraNotes: session.styleLoraNotes.trim(),
              controlNetNotes: session.styleControlNetNotes.trim(),
              referenceImageUrl: session.styleReferenceImageUrl.trim(),
              comfyUiApiUrl: session.comfyUiApiUrl,
              hunyuanApiUrl: session.hunyuanApiUrl,
              generateReferenceIfMissing: true,
            }),
          })

          const queuedJob = await queueHunyuanJob({
            apiUrl: session.hunyuanApiUrl,
            comfyUiApiUrl: session.comfyUiApiUrl,
            assetUrl: source.assetUrl,
            sourceName: entry.sourceName,
            mode: session.mode,
            prompt,
            referenceImageUrl: session.styleReferenceImageUrl.trim(),
            workflowPath: session.workflowPath,
          })

          selectedHunyuanJobId = queuedJob.id
          updatePersistedStyleBatchSession((current) => ({
            ...current,
            entries: current.entries.map((candidate) => candidate.nodeId === entry.nodeId
              ? {
                ...candidate,
                sourceAssetUrl: source.assetUrl,
                jobId: queuedJob.id,
                status: 'queued',
                error: undefined,
              }
              : candidate),
          }))
          styleBatchNodeStatusById = {
            ...styleBatchNodeStatusById,
            [entry.nodeId]: 'Queued in ComfyUI + Hunyuan…',
          }
          entry.jobId = queuedJob.id
          entry.status = 'queued'
        }

        if (!entry.jobId) {
          throw new Error(`Missing queued job id for ${entry.nodeName}.`)
        }

        const payload = await waitForQueuedHunyuanJob(entry.jobId, {
          onQueued: () => {
            styleBatchNodeStatusById = {
              ...styleBatchNodeStatusById,
              [entry.nodeId]: 'Queued in ComfyUI + Hunyuan…',
            }
            updatePersistedStyleBatchSession((current) => ({
              ...current,
              entries: current.entries.map((candidate) => candidate.nodeId === entry.nodeId
                ? { ...candidate, status: 'queued' }
                : candidate),
            }))
          },
          onRunning: () => {
            styleBatchNodeStatusById = {
              ...styleBatchNodeStatusById,
              [entry.nodeId]: 'Generating with ComfyUI + Hunyuan…',
            }
            updatePersistedStyleBatchSession((current) => ({
              ...current,
              entries: current.entries.map((candidate) => candidate.nodeId === entry.nodeId
                ? { ...candidate, status: 'running' }
                : candidate),
            }))
          },
        })

        updatePersistedStyleBatchSession((current) => ({
          ...current,
          entries: current.entries.map((candidate) => candidate.nodeId === entry.nodeId
            ? {
              ...candidate,
              sourceAssetUrl: sourceAssetUrl || candidate.sourceAssetUrl,
              outputAssetUrl: payload.assetUrl,
              status: 'succeeded',
              error: undefined,
            }
            : candidate),
        }))

        await applyStyleBatchEntryResult(entry, payload.assetUrl)

        updatePersistedStyleBatchSession((current) => ({
          ...current,
          entries: current.entries.map((candidate) => candidate.nodeId === entry.nodeId
            ? { ...candidate, outputAssetUrl: payload.assetUrl, status: 'applied' }
            : candidate),
        }))

        styleBatchNodeStatusById = {
          ...styleBatchNodeStatusById,
          [entry.nodeId]: `Finished. Scene now uses ${payload.assetUrl}.`,
        }
      }

      await saveSceneDocumentToDisk(activeSceneLevelId)
      const finalSession = styleBatchSession
      const hasIncompleteEntries = !!finalSession?.entries.some((entry) => entry.status !== 'applied')
      styleBatchStatus = hasIncompleteEntries
        ? 'Scene batch stopped with incomplete items. Generated assets that finished were applied, and the remaining session was kept for inspection or recovery.'
        : session.mode === 'texture'
          ? `Texture style batch finished for ${session.entries.length} object${session.entries.length === 1 ? '' : 's'}. The scene file was saved to disk.`
          : `Scene regeneration finished for ${session.entries.length} object${session.entries.length === 1 ? '' : 's'}. The scene file was saved to disk.`
      saveMessage = styleBatchStatus
      if (!hasIncompleteEntries) {
        persistStyleBatchSession(null)
      }
    } catch (error) {
      console.error('Scene style batch failed:', error)
      styleBatchStatus = error instanceof Error
        ? error.message
        : 'Scene style batch failed. Check the tools bridge and local AI services.'
      updatePersistedStyleBatchSession((current) => ({
        ...current,
        entries: current.entries.map((candidate) => candidate.jobId === hunyuanActiveJobId && (candidate.status === 'queued' || candidate.status === 'running')
          ? { ...candidate, status: 'failed', error: styleBatchStatus }
          : candidate),
      }))
    } finally {
      hunyuanActiveJobId = ''
      styleBatchBusy = false
      styleBatchResumePromise = null
    }
  }

  async function runStyleBatch(mode: 'texture' | 'generate') {
    const candidateIds = styleBatchSelectionIds.filter((id) => styleSceneCandidates.some((candidate) => candidate.id === id))
    if (candidateIds.length === 0) {
      styleBatchStatus = 'Select at least one scene object before running a scene batch.'
      return
    }

    if (mode === 'generate' && !stylePrompt.trim()) {
      styleBatchStatus = 'Write the shared style brief before running a full mesh scene reimagine.'
      return
    }

    if (mode === 'texture' && !stylePrompt.trim() && !styleReferenceImageUrl.trim()) {
      styleBatchStatus = 'Texture-only batch needs a shared style brief or a reference image.'
      return
    }

    styleBatchNodeStatusById = Object.fromEntries(candidateIds.map((id) => [id, 'Queued for style regeneration.']))
    const session = createStyleBatchSession(mode, candidateIds)
    persistStyleBatchSession(session)
    styleBatchResumePromise = resumeStyleBatchSession(session)
    await styleBatchResumePromise
  }

  function updateTupleField(field: 'position' | 'rotation' | 'scale', index: number, value: string) {
    if (!selectedNode) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return

    const next = [...selectedNode[field]] as [number, number, number]
    next[index] = numeric
    patchNode(selectedNode.id, { [field]: next })
  }

  function updateNodeName(value: string) {
    if (!selectedNode) return
    patchNode(selectedNode.id, { name: value })
  }

  function updateVisible(value: boolean) {
    if (!selectedNode) return
    patchNode(selectedNode.id, { visible: value })
  }

  function toggleNodeVisibility(nodeId: string, event?: MouseEvent) {
    event?.preventDefault()
    event?.stopPropagation()
    const node = editorNodes.find((candidate) => candidate.id === nodeId)
    if (!node) return
    patchNode(nodeId, { visible: !node.visible })
  }

  function toggleNodeLocked(nodeId: string, event?: MouseEvent) {
    event?.preventDefault()
    event?.stopPropagation()
    const node = editorNodes.find((candidate) => candidate.id === nodeId)
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
    setIsolatedNodes(selectedNodes.map((node) => node.id))
  }

  function soloNode(nodeId: string, event?: MouseEvent) {
    event?.preventDefault()
    event?.stopPropagation()
    setIsolatedNodes([nodeId])
  }

  function unhideAllNodes() {
    const hiddenNodeIds = editorNodes.filter((node) => !node.visible).map((node) => node.id)
    if (hiddenNodeIds.length === 0) return
    patchNodes(hiddenNodeIds, { visible: true })
  }

  function hideSelectedNodes() {
    const selectedIds = selectedNodes.map((node) => node.id)
    if (selectedIds.length === 0) return
    patchNodes(selectedIds, { visible: false })
    clearSelection()
  }

  function unlockAllNodes() {
    const lockedNodeIds = editorNodes.filter((node) => node.locked ?? false).map((node) => node.id)
    if (lockedNodeIds.length === 0) return
    patchNodes(lockedNodeIds, { locked: false })
  }

  function updatePrefabVariant(value: string) {
    if (!selectedNode?.prefab) return
    patchNode(selectedNode.id, {
      prefab: {
        ...selectedNode.prefab,
        variant: value || undefined,
      },
    })
  }

  function getSelectedNodeMaterialDefaults(node: EditorSceneNode | null): EditorMaterialData {
    if (!node) return {}

    if (node.primitive) {
      return {
        color: node.material?.color ?? node.primitive.color,
        mapUrl: node.material?.mapUrl,
        emissive: node.material?.emissive ?? node.primitive.emissive,
        emissiveMapUrl: node.material?.emissiveMapUrl,
        emissiveIntensity: node.material?.emissiveIntensity ?? node.primitive.emissiveIntensity,
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

  function getNodeVisualColliderSize(node: EditorSceneNode | null): [number, number, number] {
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

  function updatePrimitiveField(field: 'geometry', value: string) {
    if (!selectedNode?.primitive) return
    patchNode(selectedNode.id, {
      primitive: {
        ...selectedNode.primitive,
        [field]: value,
      },
    })
  }

  function updateNodeMaterialField(field: 'color' | 'emissive', value: string) {
    if (!selectedNode) return
    patchNode(selectedNode.id, {
      material: {
        ...(selectedNode.material ?? {}),
        [field]: value || undefined,
      },
    })
  }

  function updateNodeMaterialTextureField(
    field: 'mapUrl' | 'normalMapUrl' | 'roughnessMapUrl' | 'metalnessMapUrl' | 'emissiveMapUrl' | 'alphaMapUrl',
    value: string
  ) {
    if (!selectedNode) return
    patchNode(selectedNode.id, {
      material: {
        ...(selectedNode.material ?? {}),
        [field]: value.trim() || undefined,
      },
    })
  }

  function updateNodeMaterialNumericField(
    field: 'emissiveIntensity' | 'metalness' | 'roughness' | 'opacity' | 'envMapIntensity' | 'transmission' | 'ior' | 'clearcoat' | 'clearcoatRoughness' | 'thickness' | 'reflectivity',
    value: string
  ) {
    if (!selectedNode) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    patchNode(selectedNode.id, {
      material: {
        ...(selectedNode.material ?? {}),
        [field]: numeric,
      },
    })
  }

  function updateNodeMaterialBooleanField(
    field: 'transparent' | 'wireframe' | 'doubleSided' | 'flatShading',
    value: boolean
  ) {
    if (!selectedNode) return
    patchNode(selectedNode.id, {
      material: {
        ...(selectedNode.material ?? {}),
        [field]: value,
      },
    })
  }

  function clearNodeMaterialOverrides() {
    if (!selectedNode) return
    patchNode(selectedNode.id, { material: undefined })
  }

  function updateCollisionEnabled(value: boolean) {
    if (!selectedNode) return

    patchNode(selectedNode.id, {
      collision: value
        ? {
            shape: 'cuboid',
            size: selectedNode.collision?.size ?? getNodeVisualColliderSize(selectedNode),
            friction: selectedNode.collision?.friction ?? 0.7,
            restitution: selectedNode.collision?.restitution ?? 0,
            sensor: selectedNode.collision?.sensor ?? false,
          }
        : undefined,
    })
  }

  function updateCollisionNumericField(field: 'friction' | 'restitution', value: string) {
    if (!selectedNode?.collision) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return

    patchNode(selectedNode.id, {
      collision: {
        ...selectedNode.collision,
        [field]: numeric,
      },
    })
  }

  function updateCollisionSize(index: number, value: string) {
    if (!selectedNode?.collision) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    const size = [...(selectedNode.collision.size ?? [1, 1, 1])] as [number, number, number]
    size[index] = Math.max(0.05, numeric)

    patchNode(selectedNode.id, {
      collision: {
        ...selectedNode.collision,
        size,
      },
    })
  }

  function updateCollisionBooleanField(field: 'sensor', value: boolean) {
    if (!selectedNode?.collision) return
    patchNode(selectedNode.id, {
      collision: {
        ...selectedNode.collision,
        [field]: value,
      },
    })
  }

  function recalculateCollisionFromVisual() {
    if (!selectedNode) return

    patchNode(selectedNode.id, {
      collision: {
        ...(selectedNode.collision ?? { shape: 'cuboid' as const }),
        shape: 'cuboid',
        size: getNodeVisualColliderSize(selectedNode),
        friction: selectedNode.collision?.friction ?? 0.7,
        restitution: selectedNode.collision?.restitution ?? 0,
        sensor: selectedNode.collision?.sensor ?? false,
      },
    })
  }

  function updatePhysicsField(field: 'bodyType', value: string) {
    if (!selectedNode) return
    patchNode(selectedNode.id, {
      physics: {
        ...(selectedNode.physics ?? {}),
        [field]: value,
      },
    })
  }

  function updatePhysicsNumericField(field: 'gravityScale' | 'linearDamping' | 'angularDamping', value: string) {
    if (!selectedNode) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    patchNode(selectedNode.id, {
      physics: {
        ...(selectedNode.physics ?? {}),
        [field]: numeric,
      },
    })
  }

  function updatePhysicsBooleanField(field: 'canSleep' | 'ccd' | 'lockRotations' | 'lockTranslations', value: boolean) {
    if (!selectedNode) return
    patchNode(selectedNode.id, {
      physics: {
        ...(selectedNode.physics ?? {}),
        [field]: value,
      },
    })
  }

  function updatePrimitiveArg(index: number, value: string) {
    if (!selectedNode?.primitive) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    const args = [...selectedNode.primitive.args]
    args[index] = numeric
    patchNode(selectedNode.id, {
      primitive: {
        ...selectedNode.primitive,
        args,
      }
    })
  }

  function updateAssetUrl(value: string) {
    if (!selectedNode?.asset) return
    patchNode(selectedNode.id, {
      asset: {
        ...selectedNode.asset,
        url: value,
      },
    })
  }

  function updateLightField(field: 'color', value: string) {
    if (!selectedNode?.light) return
    patchNode(selectedNode.id, {
      light: {
        ...selectedNode.light,
        [field]: value,
      },
    })
  }

  function updateLightNumericField(field: 'intensity' | 'distance' | 'decay', value: string) {
    if (!selectedNode?.light) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    patchNode(selectedNode.id, {
      light: {
        ...selectedNode.light,
        [field]: numeric,
      },
    })
  }

  function updateGameplayField(field: 'title' | 'author' | 'location' | 'excerpt' | 'body' | 'targetLevelId' | 'markerColor' | 'audioTrack' | 'fogColor', value: string) {
    if (!selectedNode?.gameplay) return
    patchNode(selectedNode.id, {
      gameplay: {
        ...selectedNode.gameplay,
        [field]: value,
      },
    })
  }

  function updateGameplayBooleanField(field: 'wanderEnabled', value: boolean) {
    if (!selectedNode?.gameplay) return
    patchNode(selectedNode.id, {
      gameplay: {
        ...selectedNode.gameplay,
        [field]: value,
      },
    })
  }

  function updateGameplayNumericField(field: 'markerSize' | 'audioVolume' | 'regionFalloff' | 'fogDensity' | 'wanderRadius' | 'wanderSpeed' | 'hoverHeight' | 'bobAmplitude' | 'bobSpeed' | 'twinkleSpeed' | 'lightIntensity' | 'lightDistance' | 'lightDecay' | 'spriteIntensity', value: string) {
    if (!selectedNode?.gameplay) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    patchNode(selectedNode.id, {
      gameplay: {
        ...selectedNode.gameplay,
        [field]: numeric,
      },
    })
  }

  async function refreshLevelRegistryFromDisk() {
    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/level-registry`)
      const payload = await response.json()
      if (payload?.success && Array.isArray(payload.entries)) {
        setLevelRegistry(payload.entries)
      }
    } catch (error) {
      console.warn('Level registry disk load unavailable, using in-memory registry.', error)
    }
  }

  async function persistLevelRegistryEntries(entries: LevelRegistryEntry[]) {
    setLevelRegistry(entries)

    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/level-registry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      })
      const payload = await response.json()
      if (!payload?.success) {
        throw new Error(payload?.message ?? 'Registry save failed')
      }
    } catch (error) {
      console.error('Level registry save failed:', error)
      saveMessage = 'Registry save failed locally'
      throw error
    }
  }

  function createScenePayload(targetLevelId: string, sourceScene = get(editorSceneStore) ?? createDefaultSceneForLevel(targetLevelId) ?? createEmptyScene(targetLevelId)) {
    return {
      ...structuredClone(sourceScene),
      levelId: targetLevelId,
      updatedAt: new Date().toISOString(),
    }
  }

  function hasMeaningfulSceneContent(scene: any) {
    if (!scene) return false
    if (Array.isArray(scene.nodes) && scene.nodes.length > 0) return true
    if (scene.settings && typeof scene.settings === 'object' && Object.keys(scene.settings).length > 0) return true
    return false
  }

  function replaceRegistryEntry(nextEntry: LevelRegistryEntry) {
    const remainingEntries = levelRegistryEntries.filter((entry) => entry.id !== nextEntry.id)
    return [...remainingEntries, nextEntry].sort((left, right) => left.title.localeCompare(right.title))
  }

  function buildMetadataEntry(targetLevelId: string): LevelRegistryEntry {
    const existingEntry = levelRegistryEntries.find((entry) => entry.id === targetLevelId)
    const nextTitle = metadataTitle.trim() || existingEntry?.title || targetLevelId

    return {
      id: targetLevelId,
      title: nextTitle,
      status: metadataStatus,
      deployed: metadataDeployed,
      aliases: existingEntry?.aliases ?? [],
      source: metadataSourceKind === 'component'
        ? { kind: 'component', componentKey: metadataSourceComponentKey }
        : { kind: 'scene', sceneId: targetLevelId },
      starMap: {
        enabled: metadataStarMapEnabled,
        year: Number.isFinite(Number(metadataStarMapYear)) ? Number(metadataStarMapYear) : 2100,
        era: existingEntry?.starMap?.era ?? 'unknown',
        description: metadataStarMapDescription.trim() || `Enter ${nextTitle}`,
      },
    }
  }

  async function saveSceneDocumentToDisk(targetLevelId: string, sourceScene = get(editorSceneStore)) {
    if (!sourceScene) {
      throw new Error('Cannot save scene to disk because no scene document is loaded.')
    }

    const payloadScene = createScenePayload(targetLevelId, sourceScene)

    if (!hasMeaningfulSceneContent(payloadScene)) {
      throw new Error('Refusing to save an empty scene document to disk.')
    }

    saveEditorSceneToLocalStorage(targetLevelId, payloadScene)

    const response = await fetch(`${EDITOR_API_BASE}/api/editor-scene/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levelId: targetLevelId, scene: payloadScene }),
    })
    const payload = await response.json()
    if (!payload?.success) {
      throw new Error(payload?.message ?? 'Disk save failed')
    }
    return payload
  }

  function saveScene() {
    const saved = saveSceneToLocalStorage(activeSceneLevelId)
    saveMessage = saved ? `Saved ${saved.updatedAt}` : 'Save failed'
  }

  async function overwriteLevelScene() {
    const scene = get(editorSceneStore)
    if (!scene) {
      saveMessage = 'Nothing to overwrite'
      return
    }

    try {
      const nextEntry = buildMetadataEntry(activeSceneLevelId)
      await saveSceneDocumentToDisk(activeSceneLevelId, scene)
      await persistLevelRegistryEntries(replaceRegistryEntry(nextEntry))
      saveMessage = `Overwrote level ${nextEntry.title}`
    } catch (error) {
      console.error('Overwrite level failed:', error)
      saveMessage = 'Overwrite failed'
    }
  }

  async function saveAsNewLevel() {
    const targetLevelId = sanitizeLevelId(saveAsLevelId)
    const title = saveAsTitle.trim() || metadataTitle.trim() || targetLevelId

    if (!targetLevelId) {
      saveMessage = 'Enter a level ID for Save As'
      return
    }

    if (levelRegistryEntries.some((entry) => entry.id === targetLevelId)) {
      saveMessage = 'That level ID already exists'
      return
    }

    const scene = get(editorSceneStore)
    if (!scene) {
      saveMessage = 'Nothing to save as a new level'
      return
    }

    const nextEntry: LevelRegistryEntry = {
      id: targetLevelId,
      title,
      status: 'draft',
      deployed: false,
      aliases: [],
      source: { kind: 'scene', sceneId: targetLevelId },
      starMap: {
        enabled: false,
        year: Number(metadataStarMapYear) || 2100,
        era: 'unknown',
        description: `Enter ${title}`,
      },
    }

    try {
      await saveSceneDocumentToDisk(targetLevelId, scene)
      await persistLevelRegistryEntries(replaceRegistryEntry(nextEntry))
      saveMessage = `Saved new level ${title}`
      saveAsLevelId = ''
      saveAsTitle = ''
      clearSelection()
      gameActions.transitionToLevel(targetLevelId)
    } catch (error) {
      console.error('Save As new level failed:', error)
      saveMessage = 'Save As failed'
    }
  }

  async function createNewLevel() {
    const targetLevelId = sanitizeLevelId(newLevelIdInput)
    const title = newLevelTitle.trim() || targetLevelId

    if (!targetLevelId) {
      saveMessage = 'Enter a level ID'
      return
    }

    if (levelRegistryEntries.some((entry) => entry.id === targetLevelId)) {
      saveMessage = 'That level ID already exists'
      return
    }

    const templateScene = newLevelTemplateId === activeSceneLevelId
      ? get(editorSceneStore) ?? createDefaultSceneForLevel(newLevelTemplateId) ?? createEmptyScene(newLevelTemplateId)
      : createDefaultSceneForLevel(newLevelTemplateId) ?? createEmptyScene(newLevelTemplateId)
    const scenePayload = createScenePayload(targetLevelId, templateScene)
    const nextEntry: LevelRegistryEntry = {
      id: targetLevelId,
      title,
      status: 'draft',
      deployed: false,
      aliases: [],
      source: { kind: 'scene', sceneId: targetLevelId },
      starMap: {
        enabled: false,
        year: 2100,
        era: 'unknown',
        description: `Enter ${title}`,
      },
    }

    try {
      await saveSceneDocumentToDisk(targetLevelId, scenePayload)
      await persistLevelRegistryEntries(replaceRegistryEntry(nextEntry))
      newLevelTitle = ''
      newLevelIdInput = ''
      newLevelTemplateId = targetLevelId
      saveMessage = `Created level ${title}`
      clearSelection()
      gameActions.transitionToLevel(targetLevelId)
    } catch (error) {
      console.error('Create level failed:', error)
      saveMessage = 'Create level failed'
    }
  }

  async function saveLevelMetadata() {
    try {
      const nextEntry = buildMetadataEntry(activeSceneLevelId)
      await persistLevelRegistryEntries(replaceRegistryEntry(nextEntry))
      saveMessage = `Updated ${nextEntry.title} metadata`
    } catch (error) {
      console.error('Save level metadata failed:', error)
      saveMessage = 'Metadata save failed'
    }
  }

  function copySceneJson() {
    navigator.clipboard.writeText(exportSceneJson())
    saveMessage = 'Scene JSON copied'
  }

  function applyImport() {
    if (!importBuffer.trim()) return
    importSceneJson(importBuffer)
    saveMessage = 'Scene JSON imported'
  }

  function addPrimitivePrefab(type: 'anomaly' | 'marker' | 'light' | 'firefly' | 'audio-region' | 'fog-volume') {
    if (type === 'anomaly') editorPrefabs.addAnomaly(selectedNode?.id ?? null)
    else if (type === 'marker') editorPrefabs.addMarker(selectedNode?.id ?? null)
    else if (type === 'firefly') editorPrefabs.addFireflyDialogue(selectedNode?.id ?? null)
    else if (type === 'audio-region') editorPrefabs.addAmbientAudioRegion(selectedNode?.id ?? null)
    else if (type === 'fog-volume') editorPrefabs.addFogVolume(selectedNode?.id ?? null)
    else editorPrefabs.addPointLight(selectedNode?.id ?? null)
  }

  function addFireflyToSelection() {
    const targetNodes = selectedNodes.filter((node) => !node.gameplay)
    if (targetNodes.length === 0) {
      saveMessage = 'Select one or more scene objects before adding fireflies'
      return
    }

    const getWorldMatrix = createWorldMatrixResolver(editorNodes)
    const createdIds: string[] = []

    for (const targetNode of targetNodes) {
      const worldMatrix = getWorldMatrix(targetNode.id)
      const worldPosition = new THREE.Vector3()
      const worldQuaternion = new THREE.Quaternion()
      const worldScale = new THREE.Vector3()
      worldMatrix.decompose(worldPosition, worldQuaternion, worldScale)

      const targetWorldMatrix = new THREE.Matrix4().compose(
        new THREE.Vector3(
          worldPosition.x,
          worldPosition.y + Math.abs(worldScale.y) * 0.5 + 0.8,
          worldPosition.z,
        ),
        new THREE.Quaternion(),
        new THREE.Vector3(1, 1, 1),
      )

      const localTransform = getLocalTransformForWorldMatrix(editorNodes, targetNode.parentId ?? null, targetWorldMatrix)
      const fireflyId = `firefly-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

      addNode({
        id: fireflyId,
        name: `${targetNode.name} Firefly`,
        kind: 'group',
        parentId: targetNode.parentId ?? null,
        position: localTransform.position,
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        gameplay: {
          type: 'firefly',
          markerColor: '#f5f1a8',
          markerSize: 0.52,
          title: targetNode.name,
          author: 'Pillar Firefly',
          location: activeSceneLevelId,
          excerpt: `A patient glow hovers above ${targetNode.name}.`,
          body: `A solitary firefly keeps watch above ${targetNode.name}.`,
        },
      })

      createdIds.push(fireflyId)
    }

    if (createdIds.length > 0) {
      setSelectedNodes(createdIds, createdIds[0] ?? null)
      saveMessage = `Added ${createdIds.length} firefl${createdIds.length === 1 ? 'y' : 'ies'} to selection`
    }
  }

  function addPrefabWithParent(name: string, type: EditorPrefabType, position: [number, number, number] = [0, 0, 0]) {
    editorPrefabs.addPrefab(name, type, position, selectedNode?.id ?? null)
  }

  function addAssetPrefab(name: string, url: string, scale: [number, number, number] = [0.001, 0.001, 0.001]) {
    editorPrefabs.addAsset(name, url, selectedNode?.id ?? null, scale)
  }

  function addEmpty() {
    addEmptyNode('Empty', selectedNode?.id ?? null)
  }

  function groupSelection() {
    const ids = selectedNodes.map((node) => node.id)
    if (ids.length < 1) return
    groupNodes(ids, ids.length > 1 ? 'Group' : 'Empty Group')
  }

  function ungroupSelection() {
    const ids = selectedNodes.map((node) => node.id)
    if (ids.length === 0) return
    ungroupNodes(ids)
  }

  function duplicateSelection() {
    const ids = selectedNodes.map((node) => node.id)
    if (ids.length === 0 && selectedNode) {
      duplicateNodes([selectedNode.id])
      return
    }
    if (ids.length > 0) {
      duplicateNodes(ids)
    }
  }

  function deleteSelection() {
    const ids = selectedNodes.map((node) => node.id)
    if (ids.length === 0 && selectedNode) {
      removeNodes([selectedNode.id])
      return
    }
    if (ids.length > 0) {
      removeNodes(ids)
    }
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
    level:
      selectedNodes.length > 1
        ? 'warning'
        : selectedNode
          ? 'ready'
          : 'idle',
    message:
      selectedNodes.length > 1
        ? `${selectedNodes.length} nodes selected. AI tools require a single node.`
        : selectedNode
          ? `Selected node: ${selectedNode.name} (${selectedNode.kind}).`
          : 'No editor selection active.',
  })

  $: {
    const nextAssetUrl = getAiSourceAssetUrl(selectedNode)
    const inspectionKey = selectedNode?.id && nextAssetUrl ? `${selectedNode.id}:${nextAssetUrl}` : ''

    if (inspectionKey && inspectionKey !== lastInspectedHunyuanAsset) {
      lastInspectedHunyuanAsset = inspectionKey
      void inspectSelectedAssetForHunyuan(nextAssetUrl, selectedNode?.id ?? '')
      void refreshHunyuanServiceStatus(false)
    } else if (!inspectionKey) {
      lastInspectedHunyuanAsset = ''
      if (selectedNode?.prefab || selectedNode?.primitive) {
        hunyuanDetectedReferenceImageUrl = ''
        hunyuanReferenceImageUrl = ''
        hunyuanSupportsReplacement = true
        hunyuanSupportsTextureWrap = false
        hunyuanLastOutputUrl = ''
        void refreshHunyuanServiceStatus(false)
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
        if (getAiSourceAssetUrl(selectedNode) && hunyuanDetectedReferenceImageUrl) {
          styleReferenceImageUrl = hunyuanDetectedReferenceImageUrl
        }
        if (!stylePrompt.trim()) {
          stylePrompt = 'hand-painted storybook environment art, unified surface language, stylized materials, painterly wear, broad readable forms'
        }
        if (selectedNode.asset?.url) {
          void restoreLatestStyleWorkspaceForSelection(selectedNode.asset.url, selectedNode.id)
        }
      } else {
        styleStatus = 'Select a single geometry node to open the style toolchain.'
        styleReferenceImageUrl = ''
      }
    }
  }

  $: if (selectedNode && canUseStyleStudio(selectedNode) && !styleReferenceImageUrl && hunyuanDetectedReferenceImageUrl) {
    styleReferenceImageUrl = hunyuanDetectedReferenceImageUrl
  }

  $: {
    const nextComfyUiStatusKey = activeEditorTab === 'ai' || activeEditorTab === 'style' ? comfyUiApiUrl : ''
    if (nextComfyUiStatusKey && nextComfyUiStatusKey !== comfyUiStatusKey) {
      comfyUiStatusKey = nextComfyUiStatusKey
      void refreshComfyUiServiceStatus(false)
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
      const response = await fetch(`${EDITOR_API_BASE}/api/editor-scene/load?levelId=${encodeURIComponent(activeSceneLevelId)}`)
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

  function resetToDefaultScene() {
    setEditorScene(createDefaultSceneForLevel(activeSceneLevelId) ?? createEmptyScene(activeSceneLevelId))
    saveMessage = 'Reset to default scene'
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
    saveMessage = `Switching to ${editorLevelOptions.find((option) => option.id === pendingLevelId)?.label ?? pendingLevelId}`
    gameActions.transitionToLevel(pendingLevelId)
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      const savedWorkflowPath = window.localStorage.getItem('merkin:selected-comfy-workflow-path') || ''
      if (savedWorkflowPath) {
        selectedComfyWorkflowPath = savedWorkflowPath
      }
    }
    void loadAssetBrowser(assetBrowserPath)
    void loadWorkflowBrowser(workflowBrowserPath)
    void refreshLevelRegistryFromDisk()
    void refreshHunyuanRecentJobs()

    if (typeof window !== 'undefined') {
      const persistedStyleBatch = loadStyleBatchSessionFromLocalStorage(activeSceneLevelId)
      if (persistedStyleBatch) {
        styleBatchSelectionIds = persistedStyleBatch.entries.map((entry) => entry.nodeId)
        styleBatchNodeStatusById = Object.fromEntries(
          persistedStyleBatch.entries.map((entry) => [entry.nodeId, entry.error || entry.status])
        )
        if (persistedStyleBatch.entries.every((entry) => entry.status === 'applied')) {
          persistStyleBatchSession(null)
        } else {
          styleBatchResumePromise = resumeStyleBatchSession(persistedStyleBatch)
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
  })
</script>

{#if editorState?.enabled}
  <div class="editor-shell" class:collapsed={!editorState.panelOpen}>
    <div class="editor-header">
      <div>
        <div class="editor-title">Level Editor</div>
        <div class="editor-subtitle">{levelId} · {editorState.dirty ? 'Unsaved' : 'Synced'}</div>
      </div>
      <button class="collapse-btn" on:click={togglePanelOpen}>{editorState.panelOpen ? '⟩' : '⟨'}</button>
    </div>

    {#if editorState.panelOpen}
      <div class="editor-body">
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

        <div class="editor-tab-content" bind:this={editorTabContentElement}>
      {#if activeEditorTab === 'workflow'}
      <div class="editor-section">
        <div class="label">Workflow Template</div>
        <div class="save-message">Selected workflow becomes the default for generate/retexture runs and for the Edit Workflow buttons.</div>
        <div class="tuple-group editor-mt-sm">
          <div class="tuple-label">Current Workflow</div>
          <input class="text-input" value={selectedComfyWorkflowPath} readonly />
        </div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={resetSelectedWorkflowPath}>Use Built-In Default</button>
          <button on:click={goUpWorkflowBrowser}>Up</button>
          <button on:click={() => loadWorkflowBrowser(workflowBrowserPath)}>Refresh</button>
        </div>
        <div class="save-message path-label">{workflowBrowserPath}</div>
        {#if workflowBrowserError}
          <div class="save-message error-message">{workflowBrowserError}</div>
        {/if}
        <div class="hierarchy-list asset-browser-list">
          {#if workflowBrowserLoading}
            <div class="save-message">Loading workflows…</div>
          {:else}
            {#each workflowBrowserItems as item (item.path)}
              <button class:active={selectedComfyWorkflowPath === item.path} on:click={() => selectWorkflowPath(item)}>
                <span class="node-label">{item.isDirectory ? '📁' : '🧠'} {item.name}</span>
                <span class="kind">{item.isDirectory ? 'dir' : 'workflow'}</span>
              </button>
            {/each}
          {/if}
        </div>
      </div>

      <div class="editor-section">
        <div class="label">Selection</div>
        <div class="save-message">{workflowSelectionSummary}</div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={() => setActiveEditorTab('hierarchy')}>Open Hierarchy</button>
          <button on:click={selectSimilarNodes} disabled={!selectedNode || similarNodeCount <= 1}>Select Similar</button>
        </div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={addFireflyToSelection} disabled={selectedNodes.length === 0}>Add Firefly To Selection</button>
          <button on:click={clearSelection} disabled={selectedNodes.length === 0}>Clear Selection</button>
        </div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={hideSelectedNodes} disabled={selectedNodes.length === 0}>Hide Selected</button>
          <button on:click={isolateSelection} disabled={selectedNodes.length === 0}>Hide Unselected</button>
          <button on:click={() => { unhideAllNodes(); clearIsolatedNodes() }} disabled={!editorNodes.some((node) => !node.visible) && editorState.isolatedNodeIds.length === 0}>Show All</button>
        </div>
        <div class="save-message">Blender-style shortcuts: `H` hides selected, `Shift+H` hides unselected, `Alt+H` shows all.</div>
      </div>

      <div class="editor-section">
        <div class="label">Reimagine</div>
        <div class="save-message">Generate a replacement for the selected object, or re-texture an existing mesh-backed asset.</div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={() => runHunyuanForSelection('generate')} disabled={!workflowCanGenerateSelection || hunyuanBusy}>
            {hunyuanBusy ? 'Working…' : selectedNode?.asset ? 'Generate Replacement Mesh' : 'Generate From Prefab'}
          </button>
          <button on:click={() => runHunyuanForSelection('texture')} disabled={!workflowCanRetextureSelection || hunyuanBusy}>
            {hunyuanBusy ? 'Working…' : 'Re-Texture Selected'}
          </button>
        </div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={() => setActiveEditorTab('ai')}>Open AI Details</button>
          <button on:click={() => refreshHunyuanServiceStatus(true)} disabled={hunyuanBusy}>Refresh Backend</button>
        </div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={() => void openComfyUiWorkflowEditor('generate')} disabled={hunyuanBusy}>Edit Generate Workflow</button>
          <button on:click={() => void openComfyUiWorkflowEditor('texture')} disabled={!selectedNode?.asset || hunyuanBusy}>Edit Texture Workflow</button>
        </div>
        {#if comfyWorkflowEditorStatus}
          <div class="save-message">{comfyWorkflowEditorStatus}</div>
        {/if}
        <div class="save-message">{hunyuanStatus}</div>
      </div>

      <div class="editor-section">
        <div class="label">Reuse</div>
        <div class="save-message">Use the last generated asset immediately, or jump straight into the generated asset library.</div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={openGeneratedAssetInLibrary} disabled={!hunyuanLastOutputUrl}>Open Generated Assets</button>
          <button on:click={addLatestGeneratedAssetToScene} disabled={!hunyuanLastOutputUrl}>Add Latest Generated</button>
        </div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={applyGeneratedAssetToSelection} disabled={!canApplyGeneratedAssetToSelection}>Apply Latest To Selection</button>
          <button on:click={() => setActiveEditorTab('create')}>Open Asset Library</button>
        </div>
        {#if hunyuanLastOutputUrl}
          <div class="tuple-group editor-mt-sm">
            <div class="tuple-label">Latest Generated</div>
            <input class="text-input" value={hunyuanLastOutputUrl} readonly />
          </div>
        {/if}
      </div>

      <div class="editor-section">
        <div class="label">Save</div>
        <div class="save-message">Persist your work explicitly after a good generation pass.</div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={saveScene}>Save Local</button>
          <button on:click={saveCurrentSceneToDisk}>Overwrite Level</button>
        </div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={reloadFromDisk}>Reload Disk</button>
          <button on:click={() => setActiveEditorTab('save')}>Open Save Tools</button>
        </div>
      </div>

      <div class="editor-section">
        <div class="label">Recent AI Jobs</div>
        <div class="save-message">Latest queue status and failures without digging through logs.</div>
        <div class="button-row compact editor-mt-sm">
          <button disabled={hunyuanJobsLoading} on:click={() => void refreshHunyuanRecentJobs()}>{hunyuanJobsLoading ? 'Refreshing…' : 'Refresh Jobs'}</button>
          <button on:click={() => setActiveEditorTab('ai')}>Open AI Jobs Panel</button>
        </div>
        {#if selectedHunyuanJob}
          <div class="tuple-group editor-mt-sm">
            <div class="tuple-label">Latest Job</div>
            <input class="text-input" value={`${selectedHunyuanJob.status} · ${selectedHunyuanJob.sourceName || selectedHunyuanJob.id}`} readonly />
          </div>
          {#if selectedHunyuanJob.error || selectedHunyuanJob.result?.message}
            <div class="save-message">{selectedHunyuanJob.error || selectedHunyuanJob.result?.message}</div>
          {/if}
        {:else}
          <div class="save-message">No recent jobs yet.</div>
        {/if}
      </div>

      {/if}

      {#if activeEditorTab === 'scene'}
      <div class="editor-section">
        <div class="label">History</div>
        <div class="button-row compact">
          <button disabled={!canUndo} on:click={() => { if (undoScene()) saveMessage = 'Undo' }}>Undo</button>
          <button disabled={!canRedo} on:click={() => { if (redoScene()) saveMessage = 'Redo' }}>Redo</button>
        </div>
      </div>

      <div class="editor-section">
        <div class="label">Level</div>
        <div class="button-row level-switch-row">
          <select class="text-input" bind:value={pendingLevelId}>
            {#each editorLevelOptions as option (option.id)}
              <option value={option.id}>{option.label} {option.deployed ? '• deployed' : '• stored'} {option.status !== 'active' ? `• ${option.status}` : ''}</option>
            {/each}
          </select>
          <button on:click={switchEditorLevel} disabled={pendingLevelId === levelId}>Go</button>
        </div>
        <div class="save-message">Switching autosaves the current editor scene locally first.</div>
      </div>

      <div class="editor-section">
        <div class="label">New Level</div>
        <input class="text-input" bind:value={newLevelTitle} placeholder="Display name" />
        <input class="text-input editor-mt-input" bind:value={newLevelIdInput} placeholder="level-id" />
        <select class="text-input editor-mt-input" bind:value={newLevelTemplateId}>
          <option value={activeSceneLevelId}>Current Scene</option>
          {#each editorLevelOptions as option (option.id)}
            <option value={option.id}>{option.label}</option>
          {/each}
        </select>
        <button class="full editor-mt-md" on:click={createNewLevel}>Create Level</button>
        <div class="save-message">Creates a new scene-backed level file, adds it to the registry, and opens it in the editor.</div>
      </div>

      <div class="editor-section">
        <div class="label">Workflow</div>
        <div class="button-row compact-two-columns">
          <button class:active={editorState.interactionMode === 'objects'} on:click={() => setEditorInteractionMode('objects')}>Objects</button>
          <button class:active={editorState.interactionMode === 'terrain'} on:click={() => setEditorInteractionMode('terrain')} disabled={levelId !== 'observatory'}>Terrain</button>
        </div>
        <div class="button-row compact-two-columns editor-mt-sm">
          <button class:active={editorState.viewportLightingMode === 'authored'} on:click={() => setEditorViewportLightingMode('authored')}>Rendered</button>
          <button class:active={editorState.viewportLightingMode === 'workbench'} on:click={() => setEditorViewportLightingMode('workbench')}>Workbench</button>
        </div>
        <label class="checkbox"><input type="checkbox" checked={editorState.collisionOverlayEnabled} on:change={(event) => setCollisionOverlayEnabled((event.currentTarget as HTMLInputElement).checked)} /> Collision Overlay</label>
        {#if levelId !== 'observatory'}
          <div class="save-message">Terrain sculpting is currently wired for the observatory terrain.</div>
        {/if}
      </div>

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
      />

      {/if}

      {#if activeEditorTab === 'scene'}

      {#if levelId === 'observatory'}
        <div class="editor-section">
          <div class="label">Terrain Sculpt</div>
          <div class="button-row">
            <button class:active={editorState.terrainBrushMode === 'raise'} on:click={() => setTerrainBrushMode('raise')}>Raise / Lower</button>
            <button class:active={editorState.terrainBrushMode === 'smooth'} on:click={() => setTerrainBrushMode('smooth')}>Smooth</button>
            <button class:active={editorState.terrainBrushMode === 'flatten'} on:click={() => setTerrainBrushMode('flatten')}>Flatten</button>
          </div>
          <div class="tuple-group">
            <div class="tuple-label">Brush Size</div>
            <input class="tuple-input" type="number" min="1" step="1" value={editorState.terrainBrushSize} on:change={(event) => setTerrainBrushSize(Number((event.currentTarget as HTMLInputElement).value))} />
          </div>
          <div class="tuple-group">
            <div class="tuple-label">Brush Strength</div>
            <input class="tuple-input" type="number" min="0.01" step="0.05" value={editorState.terrainBrushStrength} on:change={(event) => setTerrainBrushStrength(Number((event.currentTarget as HTMLInputElement).value))} />
          </div>
          <div class="tuple-group">
            <div class="tuple-label">Brush Falloff</div>
            <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={editorState.terrainBrushFalloff} on:change={(event) => setTerrainBrushFalloff(Number((event.currentTarget as HTMLInputElement).value))} />
          </div>
          <div class="save-message">LMB drags terrain. Hold Shift while sculpting to lower with the raise brush.</div>
        </div>
      {/if}

      <div class="editor-section">
        <div class="label">Transform</div>
        <div class="button-row">
          <button class:active={editorState.transformMode === 'translate'} on:click={() => setTransformMode('translate')}>Move</button>
          <button class:active={editorState.transformMode === 'rotate'} on:click={() => setTransformMode('rotate')}>Rotate</button>
          <button class:active={editorState.transformMode === 'scale'} on:click={() => setTransformMode('scale')}>Scale</button>
        </div>
        <div class="button-row compact">
          <button class:active={editorState.transformSpace === 'world'} on:click={() => setTransformSpace('world')}>World</button>
          <button class:active={editorState.transformSpace === 'local'} on:click={() => setTransformSpace('local')}>Local</button>
        </div>
        <div class="button-row compact">
          <button class:active={editorState.transformAxis === 'all'} on:click={() => setTransformAxis('all')}>All</button>
          <button class:active={editorState.transformAxis === 'x'} on:click={() => setTransformAxis('x')}>X</button>
          <button class:active={editorState.transformAxis === 'y'} on:click={() => setTransformAxis('y')}>Y</button>
        </div>
        <div class="button-row compact">
          <button class:active={editorState.transformAxis === 'z'} on:click={() => setTransformAxis('z')}>Z</button>
        </div>
        <label class="checkbox"><input type="checkbox" checked={editorState.snappingEnabled} on:change={(e) => setSnappingEnabled((e.currentTarget as HTMLInputElement).checked)} /> Snapping</label>
        <div class="tuple-group">
          <div class="tuple-label">Move Snap</div>
          <input class="tuple-input" type="number" min="0.01" step="0.05" value={editorState.translateSnap} on:change={(e) => setTranslateSnap(Number((e.currentTarget as HTMLInputElement).value))} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Rotate Snap</div>
          <input class="tuple-input" type="number" min="0.1" step="1" value={editorState.rotateSnap} on:change={(e) => setRotateSnap(Number((e.currentTarget as HTMLInputElement).value))} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Scale Snap</div>
          <input class="tuple-input" type="number" min="0.01" step="0.05" value={editorState.scaleSnap} on:change={(e) => setScaleSnap(Number((e.currentTarget as HTMLInputElement).value))} />
        </div>
        <label class="checkbox"><input type="checkbox" checked={editorState.surfaceSnapEnabled} on:change={(e) => setSurfaceSnapEnabled((e.currentTarget as HTMLInputElement).checked)} /> Ground Snap</label>
        <div class="tuple-group">
          <div class="tuple-label">Ground Offset</div>
          <input class="tuple-input" type="number" step="0.05" value={editorState.surfaceSnapOffset} on:change={(e) => setSurfaceSnapOffset(Number((e.currentTarget as HTMLInputElement).value))} />
        </div>
        <div class="save-message">Blender-style: G move, R rotate, S scale, X/Y/Z axis lock. Snap values now apply to gizmo drags and modal transforms. End ground snap.</div>
      </div>

      {/if}

      {#if activeEditorTab === 'create'}
      <div class="editor-section">
        <div class="label">Quick Create</div>
        <div class="button-grid">
          {#each createQuickNodeActions as item (item.label)}
            <button on:click={item.action}>{item.label}</button>
          {/each}
        </div>
        <div class="save-message">Quick-create helpers and gameplay markers. Use the organized prefab and asset sections below for everything else.</div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={addFireflyToSelection} disabled={selectedNodes.length === 0}>Add Firefly To Selection</button>
        </div>
        <div class="save-message">Places one firefly above each selected object without parenting it into the object's scale.</div>
      </div>

      <div class="editor-section">
        <div class="label">Prefab Library</div>
        {#each createPrefabGroups as group (group.label)}
          <div class="editor-subsection">
            <div class="tuple-label">{group.label}</div>
            <div class="asset-list prefab-list">
              {#each group.items as item (item.label)}
                <button on:click={() => addPrefabWithParent(item.label, item.type, item.position)}>{item.label}</button>
              {/each}
            </div>
          </div>
        {/each}
        <div class="editor-subsection">
          <div class="tuple-label">Curated Imports</div>
          <div class="asset-list">
            {#each assetOptions as asset}
              <button on:click={() => addAssetPrefab(asset.label, asset.url)}>{asset.label}</button>
            {/each}
          </div>
        </div>
      </div>

      <div class="editor-section">
        <div class="label">AI Generate To Library</div>
        <div class="save-message">Use the same Hunyuan workflow here to create new library assets without replacing scene nodes.</div>
        <div class="tuple-group">
          <div class="tuple-label">New Asset Name</div>
          <input class="text-input" value={hunyuanScratchName} on:input={(e) => { hunyuanScratchName = (e.currentTarget as HTMLInputElement).value }} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Reference Image</div>
          <input class="text-input" value={hunyuanScratchReferenceImageUrl} on:input={(e) => { hunyuanScratchReferenceImageUrl = (e.currentTarget as HTMLInputElement).value }} placeholder="/generated/hunyuan3d/references/example.png" />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Prompt</div>
          <textarea rows="4" placeholder="Describe the new mesh you want in the library." value={hunyuanScratchPrompt} on:input={(e) => { hunyuanScratchPrompt = (e.currentTarget as HTMLTextAreaElement).value }}></textarea>
        </div>
        <div class="button-row compact-two-columns">
          <button disabled={hunyuanBusy || !hunyuanBackendCanGenerate} on:click={() => runHunyuanToLibrary()}>{hunyuanBusy ? 'Working…' : 'Generate To Library'}</button>
          <button disabled={hunyuanBusy || !hunyuanBackendCanGenerate} on:click={() => runHunyuanToLibrary({ addToScene: true })}>{hunyuanBusy ? 'Working…' : 'Generate + Add'}</button>
        </div>
        <div class="save-message">{hunyuanStatus}</div>
      </div>

      <div class="editor-section">
        <div class="label">Generated Quick Access</div>
        <div class="save-message">Generated assets can now be opened or added directly here, and they spawn at full scene scale.</div>
        <div class="button-row compact editor-mb-sm">
          <button on:click={() => selectAssetLibraryRoot(ASSET_LIBRARY_ROOT_GENERATED)}>Open Generated Assets</button>
          <button disabled={!hunyuanLastOutputUrl} on:click={addLatestGeneratedAssetToScene}>Add Latest Generated</button>
        </div>
        {#if hunyuanLastOutputUrl}
          <div class="tuple-group">
            <div class="tuple-label">Latest Generated</div>
            <input class="text-input" value={hunyuanLastOutputUrl} readonly />
          </div>
        {/if}
      </div>

      <div class="editor-section">
        <div class="label">Asset Library</div>
        <div class="button-row compact-two-columns">
          <button class:active={assetBrowserPath.startsWith(ASSET_LIBRARY_ROOT_MODELS)} on:click={() => selectAssetLibraryRoot(ASSET_LIBRARY_ROOT_MODELS)}>Imported Models</button>
          <button class:active={assetBrowserPath.startsWith(ASSET_LIBRARY_ROOT_GENERATED)} on:click={() => selectAssetLibraryRoot(ASSET_LIBRARY_ROOT_GENERATED)}>Generated Assets</button>
        </div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={goUpAssetBrowser}>Up</button>
          <button on:click={() => loadAssetBrowser(assetBrowserPath)}>Refresh</button>
        </div>
        <div class="save-message path-label">{assetBrowserPath}</div>
        <div class="save-message">Browse imported or generated meshes. Click a file to select it, then place it, inspect it, or reimagine it with AI.</div>
        {#if assetPickerTargetNodeId}
          <div class="save-message">Asset picker is active for {editorNodes.find((node) => node.id === assetPickerTargetNodeId)?.name ?? 'selected object'}.</div>
          <div class="button-row compact editor-mb-sm">
            <button on:click={cancelAssetPickerTarget}>Cancel Picker</button>
          </div>
        {/if}
        <div class="tuple-group editor-mb-sm">
          <div class="tuple-label">Filter</div>
          <input class="text-input" bind:value={assetBrowserFilter} placeholder="Filter asset names" />
        </div>
        {#if assetBrowserError}
          <div class="save-message error-message">{assetBrowserError}</div>
        {/if}
        <div class="hierarchy-list asset-browser-list">
          {#if assetBrowserLoading}
            <div class="save-message">Loading assets…</div>
          {:else}
            {#each assetBrowserItems.filter((item) => !assetBrowserFilter.trim() || item.name.toLowerCase().includes(assetBrowserFilter.trim().toLowerCase())) as item (item.path)}
              <button class:active={selectedLibraryItem?.path === item.path} on:click={() => selectLibraryItem(item)}>
                <span class="node-label">{item.isDirectory ? '📁' : '📦'} {item.name}</span>
                <span class="kind">{item.isDirectory ? 'dir' : 'asset'}</span>
              </button>
            {/each}
          {/if}
        </div>
        {#if selectedLibraryItem && !selectedLibraryItem.isDirectory}
          <div class="editor-subsection">
            <div class="tuple-label">Selected Asset</div>
            <input class="text-input" value={selectedLibraryItem.name} readonly />
            <input class="text-input" value={getSelectedLibraryItemUrl()} readonly />
            <EditorAssetPreview
              assetUrl={getSelectedLibraryItemUrl()}
              label="Selected Asset Preview"
              hint={selectedLibraryItem.path.startsWith(ASSET_LIBRARY_ROOT_GENERATED)
                ? 'Generated asset preview. This will add to the scene at full scale.'
                : 'Imported asset preview. This will add using compatibility scale.'}
            />
            <div class="save-message">{selectedLibraryItem.path.startsWith(ASSET_LIBRARY_ROOT_GENERATED) ? 'Generated assets add at full scene scale.' : 'Imported models add with compatibility scale.'}</div>
            <div class="button-row compact-two-columns editor-mt-sm">
              <button on:click={addSelectedLibraryAssetToScene}>Add To Scene</button>
              <button disabled={hunyuanBusy || !getSelectedLibraryItemUrl()} on:click={() => void inspectSelectedAssetForHunyuan(getSelectedLibraryItemUrl(), selectedLibraryItem.path)}>Inspect AI</button>
            </div>
            {#if assetPickerTargetNodeId}
              <div class="button-row compact editor-mt-sm">
                <button on:click={applySelectedLibraryAssetToTargetNode}>Use For Selected Object</button>
              </div>
            {/if}
            <div class="tuple-group">
              <div class="tuple-label">AI Prompt / Style Note</div>
              <textarea rows="3" placeholder="Describe how to reimagine this asset." value={hunyuanPrompt} on:input={(e) => { hunyuanPrompt = (e.currentTarget as HTMLTextAreaElement).value }}></textarea>
            </div>
            <div class="tuple-group">
              <div class="tuple-label">Reference Image</div>
              <input class="text-input" value={hunyuanReferenceImageUrl} on:input={(e) => { hunyuanReferenceImageUrl = (e.currentTarget as HTMLInputElement).value }} placeholder="Optional override reference image" />
            </div>
            {#if hunyuanDetectedReferenceImageUrl}
              <div class="save-message">Detected reference: {hunyuanDetectedReferenceImageUrl}</div>
            {/if}
            <div class="button-grid editor-mt-sm">
              <button disabled={hunyuanBusy || !hunyuanBackendCanGenerate} on:click={() => runHunyuanForLibraryAsset('generate')}>
                {hunyuanBusy ? 'Working…' : 'Reimagine To New Asset'}
              </button>
              <button disabled={hunyuanBusy || !hunyuanBackendCanRetexture} on:click={() => runHunyuanForLibraryAsset('texture')}>
                {hunyuanBusy ? 'Working…' : 'Retexture To New Asset'}
              </button>
            </div>
            <div class="save-message">AI actions never overwrite the original file. They create a new generated asset in the library.</div>
          </div>
        {/if}
      </div>

      {/if}

      {#if activeEditorTab === 'hierarchy'}
      <div class="editor-section">
        <div class="label">Hierarchy</div>
        <div class="save-message">{selectedNodes.length > 1 ? `${selectedNodes.length} selected` : selectedNodes.length === 1 ? '1 selected' : 'Nothing selected'}</div>
        <div class="tuple-group editor-mb-sm">
          <div class="tuple-label">Filter</div>
          <input class="text-input" bind:value={hierarchyFilter} placeholder="Search by name, kind, prefab, gameplay, or asset path" />
        </div>
        <div class="button-row compact editor-mb-sm">
          <button on:click={isolateSelection} disabled={selectedNodes.length === 0}>Isolate</button>
          <button on:click={clearIsolatedNodes} disabled={editorState.isolatedNodeIds.length === 0}>Show All</button>
        </div>
        <div class="button-row compact editor-mb-sm">
          <button on:click={selectSimilarNodes} disabled={!selectedNode || similarNodeCount <= 1}>Select Similar</button>
          <button on:click={() => { hierarchyFilter = '' }} disabled={!hierarchyFilter.trim()}>Clear Filter</button>
        </div>
        <div class="button-row compact editor-mb-sm">
          <button on:click={unhideAllNodes} disabled={!editorNodes.some((node) => !node.visible)}>Unhide All</button>
          <button on:click={unlockAllNodes} disabled={!editorNodes.some((node) => node.locked ?? false)}>Unlock All</button>
        </div>
        <div
          class="hierarchy-root-drop"
          role="button"
          tabindex="-1"
          aria-label="Drop selection on scene root"
          class:active={hierarchyRootDropActive}
          on:dragenter={(event) => allowHierarchyDrop(event, null)}
          on:dragover={(event) => allowHierarchyDrop(event, null)}
          on:dragleave={() => { hierarchyRootDropActive = false; if (hierarchyDropTargetId === null) hierarchyDropTargetId = null }}
          on:drop={(event) => dropHierarchy(event, null)}
        >
          Drop here to parent to Scene Root
        </div>
        <div class="hierarchy-list">
          {#if filteredFlattenedNodes.length === 0}
            <div class="save-message">No nodes match the current filter.</div>
          {/if}
          {#each filteredFlattenedNodes as node (node.id)}
            <div
              draggable={true}
              class="hierarchy-item"
              role="treeitem"
              tabindex="-1"
              aria-selected={editorState.selectedNodeIds.includes(node.id)}
              class:selected={editorState.selectedNodeIds.includes(node.id)}
              class:drop-target={hierarchyDropTargetId === node.id}
              class:dimmed={nodeViewportStateById.get(node.id)?.dimmed ?? false}
              on:dragstart={(event) => startHierarchyDrag(node.id, event)}
              on:dragend={clearHierarchyDragState}
              on:dragenter={(event) => allowHierarchyDrop(event, node.id)}
              on:dragover={(event) => allowHierarchyDrop(event, node.id)}
              on:dragleave={() => { if (hierarchyDropTargetId === node.id) hierarchyDropTargetId = null }}
              on:drop={(event) => dropHierarchy(event, node.id)}
            >
              <button class="hierarchy-entry" on:click={(event) => handleHierarchySelection(node.id, event)}>
                <span class="node-label" style={`padding-left:${node.__depth * 0.85}rem`}>{node.name}</span>
                <span class="kind">{node.kind}</span>
              </button>
              <div class="hierarchy-actions">
                <button class:active={node.visible} title={node.visible ? 'Hide node' : 'Show node'} on:click={(event) => toggleNodeVisibility(node.id, event)}>
                  {node.visible ? '👁' : '🚫'}
                </button>
                <button class:active={node.locked ?? false} title={node.locked ? 'Unlock node' : 'Lock node'} on:click={(event) => toggleNodeLocked(node.id, event)}>
                  {node.locked ? '🔒' : '🔓'}
                </button>
                <button title="Solo node" on:click={(event) => soloNode(node.id, event)}>
                  S
                </button>
                <button class:active={nodeViewportStateById.get(node.id)?.isolated ?? false} title={(nodeViewportStateById.get(node.id)?.isolated ?? false) ? 'Remove isolate' : 'Isolate node'} on:click={(event) => toggleNodeIsolation(node.id, event)}>
                  ⦿
                </button>
              </div>
            </div>
          {/each}
        </div>
        <div class="button-row compact editor-mt-md">
          <button on:click={groupSelection} disabled={selectedNodes.length === 0}>Group</button>
          <button on:click={ungroupSelection} disabled={!hasGroupSelection}>Ungroup</button>
        </div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={duplicateSelection} disabled={selectedNodes.length === 0}>Duplicate</button>
          <button class="danger" on:click={deleteSelection} disabled={selectedNodes.length === 0}>Delete</button>
        </div>
        <div class="button-row compact editor-mt-sm">
          <button on:click={clearSelection} disabled={selectedNodes.length === 0}>Clear</button>
        </div>
      </div>

      {/if}

      {#if activeEditorTab === 'inspect' && selectedNode && selectedNodes.length <= 1}
        <div class="editor-section">
          <div class="label">Inspector</div>
          <input class="text-input" value={selectedNode.name} on:input={(e) => updateNodeName((e.currentTarget as HTMLInputElement).value)} />
          <label class="checkbox"><input type="checkbox" checked={selectedNode.visible} on:change={(e) => updateVisible((e.currentTarget as HTMLInputElement).checked)} /> Visible</label>

          <div class="tuple-group">
            <div class="tuple-label">Parent</div>
            <select class="text-input" value={getSelectedParentId()} on:change={(e) => updateParent((e.currentTarget as HTMLSelectElement).value)}>
              <option value="">Scene Root</option>
              {#each editorNodes.filter((node) => node.id !== selectedNode.id) as candidate (candidate.id)}
                <option value={candidate.id}>{candidate.name}</option>
              {/each}
            </select>
          </div>

          {#if selectedNode.prefab}
            <div class="tuple-group">
              <div class="tuple-label">Prefab Type</div>
              <input class="text-input" value={selectedNode.prefab.type} readonly />
            </div>
            <div class="tuple-group">
              <div class="tuple-label">Prefab Variant</div>
              <input class="text-input" value={selectedNode.prefab.variant ?? ''} on:input={(e) => updatePrefabVariant((e.currentTarget as HTMLInputElement).value)} />
            </div>
          {/if}

          {#if selectedNode.asset}
            <div class="tuple-group">
              <div class="tuple-label">Asset URL</div>
              <input class="text-input" value={selectedNode.asset.url} on:input={(e) => updateAssetUrl((e.currentTarget as HTMLInputElement).value)} />
            </div>
            <EditorAssetPreview
              assetUrl={selectedNode.asset.url}
              label="Inspector Mesh Preview"
              hint="Live preview of the asset currently assigned to this node."
            />
            <div class="button-row compact-two-columns editor-mt-sm">
              <button on:click={() => openAssetPickerForSelectedNode(ASSET_LIBRARY_ROOT_GENERATED)}>Pick Generated Asset</button>
              <button on:click={() => openAssetPickerForSelectedNode(ASSET_LIBRARY_ROOT_MODELS)}>Pick Imported Asset</button>
            </div>
            <div class="save-message">Use the picker buttons to swap this object to another asset from the library instead of typing paths manually.</div>
            {#if assetPickerTargetNodeId === selectedNode.id}
              <div class="editor-subsection editor-mt-sm">
                <div class="tuple-label">Replacement Asset Picker</div>
                <div class="button-row compact editor-mb-sm">
                  <button class:active={assetBrowserPath.startsWith(ASSET_LIBRARY_ROOT_GENERATED)} on:click={() => selectAssetLibraryRoot(ASSET_LIBRARY_ROOT_GENERATED)}>Generated Assets</button>
                  <button class:active={assetBrowserPath.startsWith(ASSET_LIBRARY_ROOT_MODELS)} on:click={() => selectAssetLibraryRoot(ASSET_LIBRARY_ROOT_MODELS)}>Imported Models</button>
                  <button on:click={goUpAssetBrowser}>Up</button>
                  <button on:click={() => loadAssetBrowser(assetBrowserPath)}>Refresh</button>
                </div>
                <div class="save-message path-label">{assetBrowserPath}</div>
                <div class="tuple-group editor-mb-sm">
                  <div class="tuple-label">Filter</div>
                  <input class="text-input" bind:value={assetBrowserFilter} placeholder="Filter asset names" />
                </div>
                {#if assetBrowserError}
                  <div class="save-message error-message">{assetBrowserError}</div>
                {/if}
                <div class="hierarchy-list asset-browser-list">
                  {#if assetBrowserLoading}
                    <div class="save-message">Loading assets…</div>
                  {:else}
                    {#each assetBrowserItems.filter((item) => !assetBrowserFilter.trim() || item.name.toLowerCase().includes(assetBrowserFilter.trim().toLowerCase())) as item (item.path)}
                      <button class:active={selectedLibraryItem?.path === item.path} on:click={() => selectLibraryItem(item)}>
                        <span class="node-label">{item.isDirectory ? '📁' : '📦'} {item.name}</span>
                        <span class="kind">{item.isDirectory ? 'dir' : 'asset'}</span>
                      </button>
                    {/each}
                  {/if}
                </div>
                <div class="button-row compact editor-mt-sm">
                  <button on:click={applySelectedLibraryAssetToTargetNode} disabled={!selectedLibraryItem || selectedLibraryItem.isDirectory}>Replace With Selected Asset</button>
                  <button on:click={cancelAssetPickerTarget}>Cancel</button>
                </div>
              </div>
            {/if}
          {/if}

          {#if selectedNode.primitive}
            <div class="tuple-group">
              <div class="tuple-label">Primitive Geometry</div>
              <input class="text-input" value={selectedNode.primitive.geometry} on:input={(e) => updatePrimitiveField('geometry', (e.currentTarget as HTMLInputElement).value)} />
            </div>
            <div class="tuple-group">
              <div class="tuple-label">Primitive Args</div>
              <div class="tuple-row dynamic-grid">
                {#each selectedNode.primitive.args as arg, index}
                  <input class="tuple-input" type="number" step="0.05" value={arg} on:change={(e) => updatePrimitiveArg(index, (e.currentTarget as HTMLInputElement).value)} />
                {/each}
              </div>
            </div>
          {/if}

          {#if selectedNode.asset || selectedNode.prefab || selectedNode.primitive}
            <div class="tuple-group">
              <div class="tuple-label">Physics</div>
              <label class="checkbox"><input type="checkbox" checked={!!selectedNode.collision} on:change={(e) => updateCollisionEnabled((e.currentTarget as HTMLInputElement).checked)} /> Solid / Collider</label>
              <select class="text-input" value={selectedNode.physics?.bodyType ?? 'fixed'} on:change={(e) => updatePhysicsField('bodyType', (e.currentTarget as HTMLSelectElement).value)}>
                <option value="fixed">Fixed</option>
                <option value="dynamic">Dynamic</option>
                <option value="kinematicPosition">Kinematic</option>
              </select>
              <div class="tuple-row">
                <input class="tuple-input" type="number" step="0.1" value={selectedNode.physics?.gravityScale ?? 1} on:change={(e) => updatePhysicsNumericField('gravityScale', (e.currentTarget as HTMLInputElement).value)} />
                <input class="tuple-input" type="number" step="0.05" value={selectedNode.physics?.linearDamping ?? 0} on:change={(e) => updatePhysicsNumericField('linearDamping', (e.currentTarget as HTMLInputElement).value)} />
                <input class="tuple-input" type="number" step="0.05" value={selectedNode.physics?.angularDamping ?? 0} on:change={(e) => updatePhysicsNumericField('angularDamping', (e.currentTarget as HTMLInputElement).value)} />
              </div>
              <div class="tuple-row">
                <label class="checkbox"><input type="checkbox" checked={selectedNode.physics?.canSleep ?? true} on:change={(e) => updatePhysicsBooleanField('canSleep', (e.currentTarget as HTMLInputElement).checked)} /> Sleep</label>
                <label class="checkbox"><input type="checkbox" checked={selectedNode.physics?.ccd ?? false} on:change={(e) => updatePhysicsBooleanField('ccd', (e.currentTarget as HTMLInputElement).checked)} /> CCD</label>
              </div>
              <div class="tuple-row">
                <label class="checkbox"><input type="checkbox" checked={selectedNode.physics?.lockRotations ?? false} on:change={(e) => updatePhysicsBooleanField('lockRotations', (e.currentTarget as HTMLInputElement).checked)} /> Lock Rotations</label>
                <label class="checkbox"><input type="checkbox" checked={selectedNode.physics?.lockTranslations ?? false} on:change={(e) => updatePhysicsBooleanField('lockTranslations', (e.currentTarget as HTMLInputElement).checked)} /> Lock Translations</label>
              </div>
              {#if selectedNode.collision}
                <div class="tuple-label">Collider Size</div>
                <div class="tuple-row">
                  {#each [0, 1, 2] as index}
                    <input class="tuple-input" type="number" min="0.05" step="0.05" value={selectedNode.collision.size?.[index] ?? getNodeVisualColliderSize(selectedNode)[index]} on:change={(e) => updateCollisionSize(index, (e.currentTarget as HTMLInputElement).value)} />
                  {/each}
                </div>
                <div class="tuple-row">
                  <input class="tuple-input" type="number" min="0" step="0.05" value={selectedNode.collision.friction ?? 0.7} on:change={(e) => updateCollisionNumericField('friction', (e.currentTarget as HTMLInputElement).value)} />
                  <input class="tuple-input" type="number" min="0" step="0.05" value={selectedNode.collision.restitution ?? 0} on:change={(e) => updateCollisionNumericField('restitution', (e.currentTarget as HTMLInputElement).value)} />
                </div>
                <label class="checkbox"><input type="checkbox" checked={selectedNode.collision.sensor ?? false} on:change={(e) => updateCollisionBooleanField('sensor', (e.currentTarget as HTMLInputElement).checked)} /> Sensor Only</label>
                <button on:click={recalculateCollisionFromVisual}>Match Collider To Visual</button>
              {/if}
            </div>

            <div class="tuple-group">
              <div class="tuple-label">Material Color</div>
              <input class="text-input" type="color" value={selectedNodeMaterial.color ?? '#ffffff'} on:input={(e) => updateNodeMaterialField('color', (e.currentTarget as HTMLInputElement).value)} />
            </div>
            <div class="tuple-group">
              <div class="tuple-label">Emissive</div>
              <input class="text-input" type="color" value={selectedNodeMaterial.emissive ?? '#000000'} on:input={(e) => updateNodeMaterialField('emissive', (e.currentTarget as HTMLInputElement).value)} />
            </div>
            <div class="tuple-row">
              <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.emissiveIntensity ?? 0} on:change={(e) => updateNodeMaterialNumericField('emissiveIntensity', (e.currentTarget as HTMLInputElement).value)} />
              <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.metalness ?? 0.5} on:change={(e) => updateNodeMaterialNumericField('metalness', (e.currentTarget as HTMLInputElement).value)} />
              <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.roughness ?? 0.5} on:change={(e) => updateNodeMaterialNumericField('roughness', (e.currentTarget as HTMLInputElement).value)} />
            </div>
            <div class="tuple-row">
              <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={selectedNodeMaterial.opacity ?? 1} on:change={(e) => updateNodeMaterialNumericField('opacity', (e.currentTarget as HTMLInputElement).value)} />
              <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.envMapIntensity ?? 1} on:change={(e) => updateNodeMaterialNumericField('envMapIntensity', (e.currentTarget as HTMLInputElement).value)} />
            </div>
            <div class="tuple-row">
              <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={selectedNodeMaterial.transmission ?? 0} on:change={(e) => updateNodeMaterialNumericField('transmission', (e.currentTarget as HTMLInputElement).value)} />
              <input class="tuple-input" type="number" min="1" max="2.5" step="0.05" value={selectedNodeMaterial.ior ?? 1.5} on:change={(e) => updateNodeMaterialNumericField('ior', (e.currentTarget as HTMLInputElement).value)} />
              <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={selectedNodeMaterial.reflectivity ?? 0.5} on:change={(e) => updateNodeMaterialNumericField('reflectivity', (e.currentTarget as HTMLInputElement).value)} />
            </div>
            <div class="tuple-row">
              <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={selectedNodeMaterial.clearcoat ?? 0} on:change={(e) => updateNodeMaterialNumericField('clearcoat', (e.currentTarget as HTMLInputElement).value)} />
              <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={selectedNodeMaterial.clearcoatRoughness ?? 0} on:change={(e) => updateNodeMaterialNumericField('clearcoatRoughness', (e.currentTarget as HTMLInputElement).value)} />
              <input class="tuple-input" type="number" min="0" step="0.05" value={selectedNodeMaterial.thickness ?? 0} on:change={(e) => updateNodeMaterialNumericField('thickness', (e.currentTarget as HTMLInputElement).value)} />
            </div>
            <div class="tuple-row">
              <label class="checkbox"><input type="checkbox" checked={selectedNodeMaterial.transparent ?? false} on:change={(e) => updateNodeMaterialBooleanField('transparent', (e.currentTarget as HTMLInputElement).checked)} /> Transparent</label>
              <label class="checkbox"><input type="checkbox" checked={selectedNodeMaterial.wireframe ?? false} on:change={(e) => updateNodeMaterialBooleanField('wireframe', (e.currentTarget as HTMLInputElement).checked)} /> Wireframe</label>
            </div>
            <div class="tuple-row">
              <label class="checkbox"><input type="checkbox" checked={selectedNodeMaterial.doubleSided ?? false} on:change={(e) => updateNodeMaterialBooleanField('doubleSided', (e.currentTarget as HTMLInputElement).checked)} /> Double Sided</label>
              <label class="checkbox"><input type="checkbox" checked={selectedNodeMaterial.flatShading ?? false} on:change={(e) => updateNodeMaterialBooleanField('flatShading', (e.currentTarget as HTMLInputElement).checked)} /> Flat Shading</label>
            </div>
            <div class="tuple-group">
              <div class="tuple-label">Base Color Map</div>
              <div class="button-row level-switch-row">
                <input class="text-input" placeholder="/textures/stone/albedo.jpg" value={selectedNodeMaterial.mapUrl ?? ''} on:input={(e) => updateNodeMaterialTextureField('mapUrl', (e.currentTarget as HTMLInputElement).value)} />
                <button on:click={() => openTexturePicker('mapUrl')}>Pick</button>
              </div>
            </div>
            <div class="tuple-group">
              <div class="tuple-label">Normal Map</div>
              <div class="button-row level-switch-row">
                <input class="text-input" placeholder="/textures/stone/normal.jpg" value={selectedNodeMaterial.normalMapUrl ?? ''} on:input={(e) => updateNodeMaterialTextureField('normalMapUrl', (e.currentTarget as HTMLInputElement).value)} />
                <button on:click={() => openTexturePicker('normalMapUrl')}>Pick</button>
              </div>
            </div>
            <div class="tuple-group">
              <div class="tuple-label">Roughness Map</div>
              <div class="button-row level-switch-row">
                <input class="text-input" placeholder="/textures/stone/roughness.jpg" value={selectedNodeMaterial.roughnessMapUrl ?? ''} on:input={(e) => updateNodeMaterialTextureField('roughnessMapUrl', (e.currentTarget as HTMLInputElement).value)} />
                <button on:click={() => openTexturePicker('roughnessMapUrl')}>Pick</button>
              </div>
            </div>
            <div class="tuple-group">
              <div class="tuple-label">Metalness Map</div>
              <div class="button-row level-switch-row">
                <input class="text-input" placeholder="/textures/stone/metalness.jpg" value={selectedNodeMaterial.metalnessMapUrl ?? ''} on:input={(e) => updateNodeMaterialTextureField('metalnessMapUrl', (e.currentTarget as HTMLInputElement).value)} />
                <button on:click={() => openTexturePicker('metalnessMapUrl')}>Pick</button>
              </div>
            </div>
            <div class="tuple-group">
              <div class="tuple-label">Emissive Map</div>
              <div class="button-row level-switch-row">
                <input class="text-input" placeholder="/textures/signs/emissive.png" value={selectedNodeMaterial.emissiveMapUrl ?? ''} on:input={(e) => updateNodeMaterialTextureField('emissiveMapUrl', (e.currentTarget as HTMLInputElement).value)} />
                <button on:click={() => openTexturePicker('emissiveMapUrl')}>Pick</button>
              </div>
            </div>
            <div class="tuple-group">
              <div class="tuple-label">Alpha Map</div>
              <div class="button-row level-switch-row">
                <input class="text-input" placeholder="/textures/fabric/alpha.png" value={selectedNodeMaterial.alphaMapUrl ?? ''} on:input={(e) => updateNodeMaterialTextureField('alphaMapUrl', (e.currentTarget as HTMLInputElement).value)} />
                <button on:click={() => openTexturePicker('alphaMapUrl')}>Pick</button>
              </div>
            </div>
            {#if activeTextureMaterialField}
              <div class="tuple-group">
                <div class="tuple-label">Texture Browser</div>
                <div class="button-row compact">
                  <button on:click={goUpTextureBrowser}>Up</button>
                  <button on:click={() => loadTextureBrowser(textureBrowserPath)}>Refresh</button>
                </div>
                <div class="save-message path-label">{textureBrowserPath}</div>
                <div class="save-message">Picking for `{activeTextureMaterialField}`. Click any image below to apply it.</div>
                {#if textureBrowserError}
                  <div class="save-message error-message">{textureBrowserError}</div>
                {/if}
                <div class="hierarchy-list asset-browser-list">
                  {#if textureBrowserLoading}
                    <div class="save-message">Loading textures…</div>
                  {:else}
                    {#each textureBrowserItems as item (item.path)}
                      <button on:click={() => item.isDirectory ? loadTextureBrowser(item.path) : applyTextureFromBrowser(item)}>
                        <span class="node-label">{item.isDirectory ? '📁' : '🖼️'} {item.name}</span>
                        <span class="kind">{item.isDirectory ? 'dir' : 'texture'}</span>
                      </button>
                    {/each}
                  {/if}
                </div>
              </div>
            {/if}
            <button on:click={clearNodeMaterialOverrides}>Reset Material Overrides</button>
          {/if}

          {#if selectedNode.light}
            <div class="tuple-group">
              <div class="tuple-label">Light Color</div>
              <input class="text-input" value={selectedNode.light.color} on:input={(e) => updateLightField('color', (e.currentTarget as HTMLInputElement).value)} />
            </div>
            <div class="tuple-group"><div class="tuple-label">Light Intensity</div><input class="tuple-input" type="number" step="0.1" value={selectedNode.light.intensity} on:change={(e) => updateLightNumericField('intensity', (e.currentTarget as HTMLInputElement).value)} /></div>
            <div class="tuple-group"><div class="tuple-label">Light Distance</div><input class="tuple-input" type="number" step="0.1" value={selectedNode.light.distance} on:change={(e) => updateLightNumericField('distance', (e.currentTarget as HTMLInputElement).value)} /></div>
            <div class="tuple-group"><div class="tuple-label">Light Decay</div><input class="tuple-input" type="number" step="0.1" value={selectedNode.light.decay} on:change={(e) => updateLightNumericField('decay', (e.currentTarget as HTMLInputElement).value)} /></div>
          {/if}

          {#if selectedNode.gameplay}
            <div class="tuple-group">
              <div class="tuple-label">Gameplay Type</div>
              <input class="text-input" value={selectedNode.gameplay.type} readonly />
            </div>
            <div class="tuple-group">
              <div class="tuple-label">Marker Color</div>
              <input class="text-input" value={selectedNode.gameplay.markerColor ?? ''} on:input={(e) => updateGameplayField('markerColor', (e.currentTarget as HTMLInputElement).value)} />
            </div>
            <div class="tuple-group">
              <div class="tuple-label">Marker Size</div>
              <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.markerSize ?? 0.7} on:change={(e) => updateGameplayNumericField('markerSize', (e.currentTarget as HTMLInputElement).value)} />
            </div>
            {#if selectedNode.gameplay.type === 'portal'}
              <div class="tuple-group">
                <div class="tuple-label">Target Level</div>
                <input class="text-input" value={selectedNode.gameplay.targetLevelId ?? ''} on:input={(e) => updateGameplayField('targetLevelId', (e.currentTarget as HTMLInputElement).value)} />
              </div>
            {:else if selectedNode.gameplay.type === 'firefly'}
              <div class="tuple-group"><div class="tuple-label">Title</div><input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => updateGameplayField('title', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Author</div><input class="text-input" value={selectedNode.gameplay.author ?? ''} on:input={(e) => updateGameplayField('author', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Location</div><input class="text-input" value={selectedNode.gameplay.location ?? ''} on:input={(e) => updateGameplayField('location', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Excerpt</div><textarea rows="3" value={selectedNode.gameplay.excerpt ?? ''} on:input={(e) => updateGameplayField('excerpt', (e.currentTarget as HTMLTextAreaElement).value)}></textarea></div>
              <div class="tuple-group"><div class="tuple-label">Body</div><textarea rows="5" value={selectedNode.gameplay.body ?? ''} on:input={(e) => updateGameplayField('body', (e.currentTarget as HTMLTextAreaElement).value)}></textarea></div>
              <label class="checkbox"><input type="checkbox" checked={selectedNode.gameplay.wanderEnabled ?? false} on:change={(e) => updateGameplayBooleanField('wanderEnabled', (e.currentTarget as HTMLInputElement).checked)} /> Wander</label>
              <div class="tuple-group"><div class="tuple-label">Wander Radius</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.wanderRadius ?? 0.35} on:change={(e) => updateGameplayNumericField('wanderRadius', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Wander Speed</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.wanderSpeed ?? 0.45} on:change={(e) => updateGameplayNumericField('wanderSpeed', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Glow Intensity</div><input class="tuple-input" type="number" step="0.1" value={selectedNode.gameplay.lightIntensity ?? 2.8} on:change={(e) => updateGameplayNumericField('lightIntensity', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Glow Distance</div><input class="tuple-input" type="number" step="0.1" value={selectedNode.gameplay.lightDistance ?? 6} on:change={(e) => updateGameplayNumericField('lightDistance', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Glow Decay</div><input class="tuple-input" type="number" step="0.1" value={selectedNode.gameplay.lightDecay ?? 1.6} on:change={(e) => updateGameplayNumericField('lightDecay', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Sprite Intensity</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.spriteIntensity ?? 0.95} on:change={(e) => updateGameplayNumericField('spriteIntensity', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Hover Height</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.hoverHeight ?? 0.36} on:change={(e) => updateGameplayNumericField('hoverHeight', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Bob Amplitude</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.bobAmplitude ?? 0.14} on:change={(e) => updateGameplayNumericField('bobAmplitude', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Bob Speed</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.bobSpeed ?? 1.4} on:change={(e) => updateGameplayNumericField('bobSpeed', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Twinkle Speed</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.twinkleSpeed ?? 1.6} on:change={(e) => updateGameplayNumericField('twinkleSpeed', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="save-message">Adjust luminance with the glow controls and motion with wander/hover/bob/twinkle controls.</div>
            {:else if selectedNode.gameplay.type === 'note'}
              <div class="tuple-group"><div class="tuple-label">Title</div><input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => updateGameplayField('title', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Author</div><input class="text-input" value={selectedNode.gameplay.author ?? ''} on:input={(e) => updateGameplayField('author', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Location</div><input class="text-input" value={selectedNode.gameplay.location ?? ''} on:input={(e) => updateGameplayField('location', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Excerpt</div><textarea rows="3" value={selectedNode.gameplay.excerpt ?? ''} on:input={(e) => updateGameplayField('excerpt', (e.currentTarget as HTMLTextAreaElement).value)}></textarea></div>
              <div class="tuple-group"><div class="tuple-label">Body</div><textarea rows="5" value={selectedNode.gameplay.body ?? ''} on:input={(e) => updateGameplayField('body', (e.currentTarget as HTMLTextAreaElement).value)}></textarea></div>
            {:else if selectedNode.gameplay.type === 'audio-region'}
              <div class="tuple-group"><div class="tuple-label">Region Label</div><input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => updateGameplayField('title', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group">
                <div class="tuple-label">Ambient Track</div>
                <select class="text-input" value={selectedNode.gameplay.audioTrack ?? ambientAudioLibrary[0].src} on:change={(e) => updateGameplayField('audioTrack', (e.currentTarget as HTMLSelectElement).value)}>
                  {#each ambientAudioLibrary as track}
                    <option value={track.src}>{track.label}</option>
                  {/each}
                </select>
              </div>
              <div class="tuple-row compact-two editor-mt-sm">
                <input class="tuple-input" type="number" step="0.01" value={selectedNode.gameplay.audioVolume ?? 0.24} on:change={(e) => updateGameplayNumericField('audioVolume', (e.currentTarget as HTMLInputElement).value)} />
                <input class="tuple-input" type="number" step="0.1" value={selectedNode.gameplay.regionFalloff ?? 12} on:change={(e) => updateGameplayNumericField('regionFalloff', (e.currentTarget as HTMLInputElement).value)} />
              </div>
              <div class="save-message">Use node position + scale to shape the region. Scale controls the box volume; falloff softens the edge.</div>
            {:else if selectedNode.gameplay.type === 'fog-volume'}
              <div class="tuple-group"><div class="tuple-label">Volume Label</div><input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => updateGameplayField('title', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Fog Color</div><input class="text-input" type="color" value={selectedNode.gameplay.fogColor ?? '#9ba9bb'} on:input={(e) => updateGameplayField('fogColor', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-row compact-two editor-mt-sm">
                <input class="tuple-input" type="number" step="0.0001" value={selectedNode.gameplay.fogDensity ?? 0.0025} on:change={(e) => updateGameplayNumericField('fogDensity', (e.currentTarget as HTMLInputElement).value)} />
                <input class="tuple-input" type="number" step="0.1" value={selectedNode.gameplay.regionFalloff ?? 8} on:change={(e) => updateGameplayNumericField('regionFalloff', (e.currentTarget as HTMLInputElement).value)} />
              </div>
              <div class="save-message">Use node position + scale to shape the fog box. Density and falloff control how strongly it blends.</div>
            {/if}
          {/if}

          {#each ['position', 'rotation', 'scale'] as field}
            <div class="tuple-group">
              <div class="tuple-label">{field}</div>
              <div class="tuple-row">
                {#each [0, 1, 2] as index}
                  <input
                    class="tuple-input"
                    type="number"
                    step={field === 'rotation' ? 0.01 : 0.1}
                    value={selectedNode[field][index]}
                    on:change={(e) => updateTupleField(field as 'position' | 'rotation' | 'scale', index, (e.currentTarget as HTMLInputElement).value)}
                  />
                {/each}
              </div>
            </div>
          {/each}

          <div class="button-row compact">
            <button on:click={() => duplicateNode(selectedNode.id)}>Duplicate</button>
            <button class="danger" on:click={() => removeNode(selectedNode.id)}>Delete</button>
          </div>
        </div>
      {:else if activeEditorTab === 'inspect' && selectedNodes.length > 1}
        <div class="editor-section">
          <div class="label">Inspector</div>
          <div class="save-message">Multi-selection active. Transform, duplicate, delete, reparent, and save are available. Detailed property editing is limited to single selection for now.</div>
          <div class="tuple-group">
            <div class="tuple-label">Parent</div>
            <select class="text-input" value="" on:change={(e) => updateParent((e.currentTarget as HTMLSelectElement).value)}>
              <option value="">Scene Root</option>
              {#each editorNodes.filter((node) => !selectedNodes.some((selected) => selected.id === node.id)) as candidate (candidate.id)}
                <option value={candidate.id}>{candidate.name}</option>
              {/each}
            </select>
          </div>
        </div>
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
          {styleSceneCandidates}
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
          on:startComfyUi={() => refreshComfyUiServiceStatus(true)}
          on:refreshComfyUi={() => refreshComfyUiServiceStatus(false)}
          on:startHunyuan={() => refreshHunyuanServiceStatus(true)}
          on:refreshHunyuan={() => refreshHunyuanServiceStatus(false)}
          on:inspectAsset={() => inspectSelectedAssetForStyle()}
          on:prepareWorkspace={() => prepareStyleWorkspace()}
          on:simplifyAsset={() => simplifySelectedAssetForStyle()}
          on:exportBlender={() => exportSelectedAssetForBlender()}
          on:runRetexture={() => runStyleBake('texture')}
          on:runReimagine={() => runStyleBake('generate')}
          on:selectAllBatchCandidates={selectAllStyleBatchCandidates}
          on:clearBatchCandidates={clearStyleBatchCandidates}
          on:runBatchRetexture={() => void runStyleBatch('texture')}
          on:runBatchReimagine={() => void runStyleBatch('generate')}
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
          {hunyuanSupportsReplacement}
          {hunyuanSupportsTextureWrap}
          {canApplyGeneratedAssetToSelection}
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
          on:startComfyUi={() => refreshComfyUiServiceStatus(true)}
          on:refreshComfyUi={() => refreshComfyUiServiceStatus(false)}
          on:startHunyuan={() => refreshHunyuanServiceStatus(true)}
          on:refreshHunyuan={() => refreshHunyuanServiceStatus(false)}
          on:generateScratch={() => runHunyuanFromScratch()}
          on:inspectSelection={() => selectedNode?.asset && void inspectSelectedAssetForHunyuan(selectedNode.asset.url, selectedNode.id)}
          on:generateSelection={() => runHunyuanForSelection('generate')}
          on:textureSelection={() => runHunyuanForSelection('texture')}
          on:openWorkflowTab={() => setActiveEditorTab('workflow')}
          on:resetWorkflowPath={resetSelectedWorkflowPath}
          on:editGenerateWorkflow={() => void openComfyUiWorkflowEditor('generate')}
          on:editTextureWorkflow={() => void openComfyUiWorkflowEditor('texture')}
          on:openGeneratedAsset={() => void openGeneratedAssetInLibrary()}
          on:applyGeneratedAsset={() => void applyGeneratedAssetToSelection()}
          on:saveGeneratedResult={() => void saveCurrentSceneToDisk()}
          on:refreshRecentJobs={() => void refreshHunyuanRecentJobs()}
        />
      {:else}
        <div class="editor-section">
          <div class="save-message">Loading AI mesh tools…</div>
        </div>
      {/if}
      {/if}

      {#if activeEditorTab === 'save'}
      <div class="editor-section">
        <div class="label">Level File</div>
        <div class="tuple-group">
          <div class="tuple-label">Title</div>
          <input class="text-input" bind:value={metadataTitle} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Status</div>
          <select class="text-input" bind:value={metadataStatus}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <label class="checkbox"><input type="checkbox" bind:checked={metadataDeployed} /> Deploy for gameplay</label>
        <label class="checkbox"><input type="checkbox" bind:checked={metadataStarMapEnabled} disabled={!metadataDeployed} /> Show on star map</label>
        <div class="tuple-group">
          <div class="tuple-label">Runtime Source</div>
          <select class="text-input" bind:value={metadataSourceKind}>
            <option value="scene">Scene File</option>
            <option value="component">Built-In Runtime</option>
          </select>
        </div>
        {#if metadataSourceKind === 'component'}
          <div class="tuple-group">
            <div class="tuple-label">Built-In Level</div>
            <select class="text-input" bind:value={metadataSourceComponentKey}>
              <option value="observatory">Observatory</option>
              <option value="sci-fi-room">Sci Fi Room</option>
              <option value="miranda">Miranda Wreck</option>
              <option value="solitude">Solitude</option>
            </select>
          </div>
        {/if}
        <div class="tuple-group">
          <div class="tuple-label">Star Year</div>
          <input class="tuple-input" type="number" bind:value={metadataStarMapYear} disabled={!metadataStarMapEnabled || !metadataDeployed} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Star Description</div>
          <input class="text-input" bind:value={metadataStarMapDescription} disabled={!metadataStarMapEnabled || !metadataDeployed} />
        </div>
        <button class="full" on:click={saveLevelMetadata}>Save Level Metadata</button>
        <div class="save-message">Levels can exist as drafts or archives without being deployed to players. Only deployed star-map levels get navigation stars.</div>
      </div>

      <div class="editor-section">
        <div class="label">Persistence</div>
        <div class="button-grid">
          <button on:click={saveScene}>Save Local</button>
          <button on:click={overwriteLevelScene}>Overwrite Level</button>
          <button on:click={copySceneJson}>Copy JSON</button>
          <button on:click={reloadFromDisk}>Reload Disk</button>
          <button on:click={resetToDefaultScene}>Reset Default</button>
        </div>
        <div class="tuple-group editor-mt-lg">
          <div class="tuple-label">Save As Title</div>
          <input class="text-input" bind:value={saveAsTitle} placeholder="Display name" />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Save As Level ID</div>
          <input class="text-input" bind:value={saveAsLevelId} placeholder="new-level-id" />
        </div>
        <button class="full" on:click={saveAsNewLevel}>Save As New Level</button>
        <textarea bind:value={importBuffer} rows="6" placeholder="Paste scene JSON here"></textarea>
        <button class="full" on:click={applyImport}>Import JSON</button>
        <div class="save-message">{saveMessage}</div>
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
    width: 28rem;
    max-height: calc(100vh - 2rem);
    overflow: hidden;
    background: rgba(9, 14, 24, 0.92);
    color: #e8f5ff;
    border: 1px solid rgba(126, 203, 255, 0.28);
    border-radius: 0.75rem;
    z-index: 80;
    backdrop-filter: blur(10px);
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.35);
  }
  .editor-shell.collapsed { width: 4.5rem; overflow: hidden; }
  .editor-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.9rem 1rem; border-bottom: 1px solid rgba(126, 203, 255, 0.16);
  }
  .editor-body {
    flex: 1 1 auto;
    display: grid;
    grid-template-columns: 4.25rem minmax(0, 1fr);
    min-height: 18rem;
    height: calc(100vh - 6rem);
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
  .hierarchy-list { display: grid; gap: 0.35rem; max-height: 12rem; overflow: auto; }
  .hierarchy-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.35rem; align-items: center; }
  .hierarchy-item.dimmed { opacity: 0.45; }
  .hierarchy-entry { display: flex; justify-content: space-between; align-items: center; text-align: left; width: 100%; }
  .hierarchy-actions { display: flex; gap: 0.25rem; }
  .hierarchy-actions button { min-width: 2.1rem; padding: 0.35rem 0.4rem; }
  .node-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .kind { font-size: 0.7rem; color: #8fb7d4; text-transform: uppercase; }
  .path-label { word-break: break-all; }
  .asset-browser-list { max-height: 14rem; }

  @media (max-width: 900px) {
    .editor-shell {
      width: min(95vw, 28rem);
    }
  }
</style>
