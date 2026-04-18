<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { get } from 'svelte/store'
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
  import {
    resolveObservatoryPresetSettings,
    resolveSolitudePresetSettings,
  } from './editorLevelPresets'
  import { mergeLevelSettings } from './editorLevelSetup'
  import EditorEnvironmentPanel from './EditorEnvironmentPanel.svelte'

  export let levelId: string

  type EditorPanelTab = 'scene' | 'environment' | 'create' | 'hierarchy' | 'inspect' | 'ai' | 'save'

  const EDITOR_API_BASE = 'http://localhost:3001'
  const editorLevelOptions = [
    { id: 'observatory', label: 'Observatory' },
    { id: 'sci-fi-room', label: 'Sci Fi Room' },
    { id: 'miranda', label: 'Miranda Wreck' },
    { id: 'solitude', label: 'Solitude' },
  ] as const

  let editorState
  let editorNodes: EditorSceneNode[] = []
  let editorScene = null
  let nodeViewportStateById = new Map<string, { effectiveVisible: boolean; isolated: boolean; dimmed: boolean; locked: boolean }>()
  let selectedNode: EditorSceneNode | null = null
  let selectedNodes: EditorSceneNode[] = []
  let canUndo = false
  let canRedo = false
  let importBuffer = ''
  let saveMessage = 'Local only'
  const ASSET_LIBRARY_ROOT_MODELS = 'apps/megameal/public/models'
  const ASSET_LIBRARY_ROOT_GENERATED = 'apps/megameal/public/generated/hunyuan3d'
  let assetBrowserPath = ASSET_LIBRARY_ROOT_MODELS
  let assetBrowserItems: Array<{ name: string, path: string, isDirectory: boolean }> = []
  let assetBrowserError = ''
  let assetBrowserLoading = false
  let selectedLibraryItem: { name: string, path: string, isDirectory: boolean } | null = null
  let textureBrowserPath = 'apps/game/public'
  let textureBrowserItems: Array<{ name: string, path: string, isDirectory: boolean }> = []
  let textureBrowserError = ''
  let textureBrowserLoading = false
  let activeTextureMaterialField: 'mapUrl' | 'normalMapUrl' | 'roughnessMapUrl' | 'metalnessMapUrl' | 'emissiveMapUrl' | 'alphaMapUrl' | null = null
  let comfyUiApiUrl = 'http://127.0.0.1:8188'
  let comfyUiStatus = 'ComfyUI powers local mesh workflows and can be started here.'
  let comfyUiBusy = false
  let comfyUiReady = false
  let comfyUiStatusKey = ''
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
  let hunyuanSupportsReplacement = false
  let hunyuanSupportsTextureWrap = false
  let hunyuanSelectionKey = ''
  let hunyuanInspectToken = 0
  let lastInspectedHunyuanAsset = ''
  let hunyuanActiveJobId = ''
  let autoSaveTimeout: number | null = null
  let pendingLevelId = levelId
  let activeEditorTab: EditorPanelTab = 'scene'
  let editorTabContentElement: HTMLDivElement | null = null
  let lastScrolledTab: EditorPanelTab | null = null

  const unsubState = editorStateStore.subscribe((value) => {
    editorState = value
  })
  const unsubNodes = editorNodesStore.subscribe((value) => {
    editorNodes = value
  })
  const unsubScene = editorSceneStore.subscribe((value) => {
    editorScene = value
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
    { id: 'scene', icon: '◫', label: 'Scene' },
    { id: 'environment', icon: '☼', label: 'Environment' },
    { id: 'create', icon: '+', label: 'Create' },
    { id: 'hierarchy', icon: '≣', label: 'Hierarchy' },
    { id: 'inspect', icon: '◎', label: 'Inspect' },
    { id: 'ai', icon: '✦', label: 'AI Mesh' },
    { id: 'save', icon: '↧', label: 'Save' },
  ]

  function setActiveEditorTab(tab: EditorPanelTab) {
    activeEditorTab = tab
    requestAnimationFrame(() => {
      editorTabContentElement?.scrollTo({ top: 0, behavior: 'auto' })
    })
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

  const prefabPromptLabels: Partial<Record<EditorPrefabType, string>> = {
    'anomaly-cluster': 'anomalous crystalline sculpture',
    'bench-growth': 'overgrown haunted bench',
    'broken-ring': 'broken ancient stone ring ruin',
    'command-console': 'retro-futurist command console',
    'command-fin': 'dark retro-futurist fin pillar',
    'courtyard-fountain': 'strange luminous courtyard fountain',
    'courtyard-pylon': 'weathered courtyard pylon',
    'growth-planter': 'biomechanical growth planter',
    'hanging-light': 'ornate hanging industrial light',
    'interior-archway': 'ancient interior archway ruin',
    'observation-rig': 'cosmic observation rig',
    'portal-apparatus': 'occult portal apparatus',
    'story-marker': 'ritual story marker obelisk',
    'support-column': 'retro-futurist support column',
    'wasteland-archway': 'wasteland stone archway',
    'wasteland-monolith': 'weathered monolith pillar',
  }

  function getAiSourceAssetUrl(node: EditorSceneNode | null) {
    return node?.asset?.url ?? ''
  }

  function getAiSourceName(node: EditorSceneNode | null) {
    if (!node) return ''
    if (node.asset) return node.name
    if (node.prefab?.type) return prefabPromptLabels[node.prefab.type] ?? node.name
    return node.name
  }

  function canUseAiMeshStudio(node: EditorSceneNode | null) {
    return !!(node?.asset || node?.prefab)
  }

  function canRetextureSelection(node: EditorSceneNode | null) {
    return !!node?.asset
  }

  function getSelectedParentId() {
    return selectedNode?.parentId ?? ''
  }

  function handleHierarchySelection(nodeId: string, event: MouseEvent) {
    const additive = event.shiftKey
    const toggle = event.metaKey || event.ctrlKey
    const order = flattenedNodes.map((node) => node.id)
    selectEditorNode(nodeId, {
      additive,
      toggle,
      rangeOrder: additive ? order : undefined,
    })
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
    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/browse?path=${encodeURIComponent(path)}`)
      const payload = await response.json()
      if (!payload?.success) {
        assetBrowserError = payload?.message ?? 'Failed to browse assets'
        return
      }
      assetBrowserPath = path
      assetBrowserItems = payload.items
        .filter((item: any) => item.isDirectory || /\.(gltf|glb)$/i.test(item.name))
        .sort((a: any, b: any) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name))
    } catch (error) {
      console.error('Asset browser load failed:', error)
      assetBrowserError = 'Asset browser unavailable'
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

  function addSelectedLibraryAssetToScene() {
    if (!selectedLibraryItem || selectedLibraryItem.isDirectory) return
    addAssetFromBrowser(selectedLibraryItem)
  }

  async function refreshGeneratedAssetLibrary(selectAssetUrl?: string) {
    await loadAssetBrowser(ASSET_LIBRARY_ROOT_GENERATED)

    if (!selectAssetUrl) return
    const selectedPath = `apps/game/public/${selectAssetUrl.replace(/^\//, '')}`
    const foundItem = assetBrowserItems.find((item) => item.path === selectedPath)
    if (foundItem) {
      selectedLibraryItem = foundItem
      hunyuanSelectionKey = foundItem.path
    }
  }

  function addAssetFromBrowser(item: { name: string, path: string }) {
    const url = resolvePublicAssetUrl(item.path, item.name)
    addAssetPrefab(item.name.replace(/\.(gltf|glb)$/i, ''), url)
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
    } catch (error) {
      if (inspectToken !== hunyuanInspectToken || selectionKey !== hunyuanSelectionKey) return
      console.error('Hunyuan asset inspect failed:', error)
      hunyuanStatus = 'Hunyuan bridge unavailable on localhost:3001.'
    }
  }

  async function runHunyuanForSelection(mode: 'generate' | 'texture') {
    if (!selectedNode || !canUseAiMeshStudio(selectedNode)) {
      hunyuanStatus = 'Select a single asset or prefab node before running Hunyuan.'
      return
    }

    const targetNodeId = selectedNode.id
    const targetAssetUrl = getAiSourceAssetUrl(selectedNode)
    const targetSourceName = getAiSourceName(selectedNode)

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
      })

      patchNode(targetNodeId, {
        kind: 'asset',
        asset: {
          url: payload.assetUrl,
        },
        prefab: undefined,
      })

      hunyuanLastOutputUrl = payload.assetUrl
      hunyuanServiceReady = true
      hunyuanStatus = payload.message ?? 'Generated asset imported into the selected node.'
      saveMessage = `AI asset applied: ${payload.assetUrl}`
      if (selectedNode?.id === targetNodeId) {
        void inspectSelectedAssetForHunyuan(payload.assetUrl, targetNodeId)
      }
    } catch (error) {
      console.error('Hunyuan generation failed:', error)
      hunyuanStatus = error instanceof Error
        ? error.message
        : 'Hunyuan generation failed. Check the local server and Hunyuan API process.'
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
        return
      }

      hunyuanServiceReady = !!payload.status.available
      hunyuanBackendCanGenerate = !!payload.status.supportsReplacementGeneration
      hunyuanBackendCanRetexture = !!payload.status.supportsTextureWrap
      hunyuanBackendStatus = payload.status.message ?? hunyuanBackendStatus
    } catch {
      hunyuanServiceReady = false
      hunyuanBackendCanGenerate = false
      hunyuanBackendCanRetexture = false
      hunyuanBackendStatus = 'Mesh backend unavailable on localhost:3001.'
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
        return
      }

      comfyUiReady = !!payload.status.available
      comfyUiStatus = payload.status.message ?? comfyUiStatus
    } catch {
      comfyUiReady = false
      comfyUiStatus = 'ComfyUI bridge unavailable on localhost:3001.'
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
      })

      hunyuanLastOutputUrl = payload.assetUrl
      hunyuanServiceReady = true
      hunyuanStatus = payload.message ?? `Generated ${sourceName} into the asset library.`
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
      })

      hunyuanLastOutputUrl = payload.assetUrl
      hunyuanServiceReady = true
      hunyuanStatus = payload.message ?? `${sourceName} generated into the asset library.`
      saveMessage = `AI asset created: ${payload.assetUrl}`

      await refreshGeneratedAssetLibrary(payload.assetUrl)
    } catch (error) {
      console.error('Hunyuan generation failed:', error)
      hunyuanStatus = error instanceof Error
        ? error.message
        : 'Hunyuan generation failed. Check the local server and Hunyuan API process.'
    } finally {
      hunyuanActiveJobId = ''
      hunyuanBusy = false
    }
  }

  async function runHunyuanFromScratch() {
    await runHunyuanToLibrary({ addToScene: true })
  }

  async function queueAndWaitForHunyuanJob(requestBody: Record<string, unknown>) {
    const queueResponse = await fetch(`${EDITOR_API_BASE}/api/hunyuan3d/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })
    const queuePayload = await queueResponse.json()

    if (!queuePayload?.success || !queuePayload?.job?.id) {
      throw new Error(queuePayload?.message ?? 'Could not queue the Hunyuan job.')
    }

    hunyuanActiveJobId = queuePayload.job.id
    const initialQueuePosition = Number(queuePayload.job.queuePosition ?? 0)
    hunyuanStatus = initialQueuePosition > 1
      ? `Queued for AI generation. Position ${initialQueuePosition} in line.`
      : 'Queued for AI generation. Starting shortly…'

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const statusResponse = await fetch(`${EDITOR_API_BASE}/api/hunyuan3d/jobs?jobId=${encodeURIComponent(hunyuanActiveJobId)}`)
      const statusPayload = await statusResponse.json()

      if (!statusPayload?.success || !statusPayload?.job) {
        throw new Error(statusPayload?.message ?? 'Lost track of the Hunyuan job.')
      }

      const job = statusPayload.job
      const queuePosition = Number(job.queuePosition ?? 0)

      if (job.status === 'queued') {
        hunyuanStatus = queuePosition > 1
          ? `Queued for AI generation. Position ${queuePosition} in line.`
          : 'Queued for AI generation. Starting shortly…'
        continue
      }

      if (job.status === 'running') {
        hunyuanStatus = 'Generating asset with ComfyUI + Hunyuan… this can take a while.'
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

  function updateGameplayNumericField(field: 'markerSize' | 'audioVolume' | 'regionFalloff' | 'fogDensity', value: string) {
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

  function saveScene() {
    const saved = saveSceneToLocalStorage(activeSceneLevelId)
    saveMessage = saved ? `Saved ${saved.updatedAt}` : 'Save failed'
  }

  async function saveSceneToDisk() {
    const scene = get(editorSceneStore)
    if (!scene) {
      saveMessage = 'Nothing to save'
      return
    }

    const saved = saveSceneToLocalStorage(activeSceneLevelId)
    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/editor-scene/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelId: activeSceneLevelId, scene: saved ?? scene }),
      })
      const payload = await response.json()
      saveMessage = payload?.success ? `Saved to ${payload.path}` : payload?.message ?? 'Disk save failed'
    } catch (error) {
      console.error('Editor disk save failed:', error)
      saveMessage = 'Disk save unavailable; local save kept'
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

  function addPrefabWithParent(name: string, type: EditorPrefabType, position: [number, number, number] = [0, 0, 0]) {
    editorPrefabs.addPrefab(name, type, position, selectedNode?.id ?? null)
  }

  function addAssetPrefab(name: string, url: string) {
    editorPrefabs.addAsset(name, url, selectedNode?.id ?? null)
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
        ? 'Hunyuan tools currently target imported asset nodes and procedural prefab nodes.'
        : 'Select a single asset or prefab node to generate or texture.'
    }
  }

  $: {
    const nextAssetUrl = getAiSourceAssetUrl(selectedNode)
    const inspectionKey = selectedNode?.id && nextAssetUrl ? `${selectedNode.id}:${nextAssetUrl}` : ''

    if (inspectionKey && inspectionKey !== lastInspectedHunyuanAsset) {
      lastInspectedHunyuanAsset = inspectionKey
      void inspectSelectedAssetForHunyuan(nextAssetUrl, selectedNode?.id ?? '')
      void refreshHunyuanServiceStatus(false)
    } else if (!inspectionKey) {
      lastInspectedHunyuanAsset = ''
      if (selectedNode?.prefab) {
        hunyuanDetectedReferenceImageUrl = ''
        hunyuanReferenceImageUrl = ''
        hunyuanSupportsReplacement = true
        hunyuanSupportsTextureWrap = false
        hunyuanLastOutputUrl = ''
        void refreshHunyuanServiceStatus(false)
        hunyuanStatus = `Ready to generate a new mesh for ${selectedNode.name}. Prefabs currently use prompt-driven replacement generation; texture wrapping becomes available after conversion to an imported asset.`
      }
    }
  }

  $: {
    const nextComfyUiStatusKey = activeEditorTab === 'ai' ? comfyUiApiUrl : ''
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
      const response = await fetch(`${EDITOR_API_BASE}/api/editor-scene/load?levelId=${encodeURIComponent(levelId)}`)
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
    setEditorScene(createDefaultSceneForLevel(levelId) ?? createEmptyScene(levelId))
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
    void loadAssetBrowser(assetBrowserPath)
  })

  onDestroy(() => {
    if (autoSaveTimeout !== null) {
      window.clearTimeout(autoSaveTimeout)
    }
    unsubState()
    unsubNodes()
    unsubScene()
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
      {#if activeEditorTab === 'scene' || activeEditorTab === 'environment'}
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
              <option value={option.id}>{option.label}</option>
            {/each}
          </select>
          <button on:click={switchEditorLevel} disabled={pendingLevelId === levelId}>Go</button>
        </div>
        <div class="save-message">Switching autosaves the current editor scene locally first.</div>
      </div>

      <div class="editor-section">
        <div class="label">Workflow</div>
        <div class="button-row compact-two-columns">
          <button class:active={editorState.interactionMode === 'objects'} on:click={() => setEditorInteractionMode('objects')}>Objects</button>
          <button class:active={editorState.interactionMode === 'terrain'} on:click={() => setEditorInteractionMode('terrain')} disabled={levelId !== 'observatory'}>Terrain</button>
        </div>
        <div class="button-row compact-two-columns" style="margin-top:0.45rem;">
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
        <div class="label">Asset Library</div>
        <div class="button-row compact-two-columns">
          <button class:active={assetBrowserPath.startsWith(ASSET_LIBRARY_ROOT_MODELS)} on:click={() => selectAssetLibraryRoot(ASSET_LIBRARY_ROOT_MODELS)}>Imported Models</button>
          <button class:active={assetBrowserPath.startsWith(ASSET_LIBRARY_ROOT_GENERATED)} on:click={() => selectAssetLibraryRoot(ASSET_LIBRARY_ROOT_GENERATED)}>Generated Assets</button>
        </div>
        <div class="button-row compact" style="margin-top:0.45rem;">
          <button on:click={goUpAssetBrowser}>Up</button>
          <button on:click={() => loadAssetBrowser(assetBrowserPath)}>Refresh</button>
        </div>
        <div class="save-message path-label">{assetBrowserPath}</div>
        <div class="save-message">Browse imported or generated meshes. Click a file to select it, then place it, inspect it, or reimagine it with AI.</div>
        {#if assetBrowserError}
          <div class="save-message error-message">{assetBrowserError}</div>
        {/if}
        <div class="hierarchy-list asset-browser-list">
          {#if assetBrowserLoading}
            <div class="save-message">Loading assets…</div>
          {:else}
            {#each assetBrowserItems as item (item.path)}
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
            <div class="button-row compact-two-columns" style="margin-top:0.45rem;">
              <button on:click={addSelectedLibraryAssetToScene}>Add To Scene</button>
              <button disabled={hunyuanBusy || !getSelectedLibraryItemUrl()} on:click={() => void inspectSelectedAssetForHunyuan(getSelectedLibraryItemUrl(), selectedLibraryItem.path)}>Inspect AI</button>
            </div>
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
            <div class="button-grid" style="margin-top:0.45rem;">
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
        <div class="button-row compact" style="margin-bottom:0.45rem;">
          <button on:click={isolateSelection} disabled={selectedNodes.length === 0}>Isolate</button>
          <button on:click={clearIsolatedNodes} disabled={editorState.isolatedNodeIds.length === 0}>Show All</button>
        </div>
        <div class="button-row compact" style="margin-bottom:0.45rem;">
          <button on:click={unhideAllNodes} disabled={!editorNodes.some((node) => !node.visible)}>Unhide All</button>
          <button on:click={unlockAllNodes} disabled={!editorNodes.some((node) => node.locked ?? false)}>Unlock All</button>
        </div>
        <div
          class="hierarchy-root-drop"
          class:active={hierarchyRootDropActive}
          on:dragenter={(event) => allowHierarchyDrop(event, null)}
          on:dragover={(event) => allowHierarchyDrop(event, null)}
          on:dragleave={() => { hierarchyRootDropActive = false; if (hierarchyDropTargetId === null) hierarchyDropTargetId = null }}
          on:drop={(event) => dropHierarchy(event, null)}
        >
          Drop here to parent to Scene Root
        </div>
        <div class="hierarchy-list">
          {#each flattenedNodes as node (node.id)}
            <div
              draggable={true}
              class="hierarchy-item"
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
        <div class="button-row compact" style="margin-top:0.6rem;">
          <button on:click={groupSelection} disabled={selectedNodes.length === 0}>Group</button>
          <button on:click={ungroupSelection} disabled={!hasGroupSelection}>Ungroup</button>
        </div>
        <div class="button-row compact" style="margin-top:0.45rem;">
          <button on:click={duplicateSelection} disabled={selectedNodes.length === 0}>Duplicate</button>
          <button class="danger" on:click={deleteSelection} disabled={selectedNodes.length === 0}>Delete</button>
        </div>
        <div class="button-row compact" style="margin-top:0.45rem;">
          <button on:click={clearSelection} disabled={selectedNodes.length === 0}>Clear</button>
        </div>
      </div>

      {/if}

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
            <div class="tuple-row">
              <input class="tuple-input" type="number" step="0.1" value={selectedNode.light.intensity} on:change={(e) => updateLightNumericField('intensity', (e.currentTarget as HTMLInputElement).value)} />
              <input class="tuple-input" type="number" step="0.1" value={selectedNode.light.distance} on:change={(e) => updateLightNumericField('distance', (e.currentTarget as HTMLInputElement).value)} />
              <input class="tuple-input" type="number" step="0.1" value={selectedNode.light.decay} on:change={(e) => updateLightNumericField('decay', (e.currentTarget as HTMLInputElement).value)} />
            </div>
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
            {:else if selectedNode.gameplay.type === 'firefly' || selectedNode.gameplay.type === 'note'}
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
              <div class="tuple-row compact-two" style="margin-top:0.45rem;">
                <input class="tuple-input" type="number" step="0.01" value={selectedNode.gameplay.audioVolume ?? 0.24} on:change={(e) => updateGameplayNumericField('audioVolume', (e.currentTarget as HTMLInputElement).value)} />
                <input class="tuple-input" type="number" step="0.1" value={selectedNode.gameplay.regionFalloff ?? 12} on:change={(e) => updateGameplayNumericField('regionFalloff', (e.currentTarget as HTMLInputElement).value)} />
              </div>
              <div class="save-message">Use node position + scale to shape the region. Scale controls the box volume; falloff softens the edge.</div>
            {:else if selectedNode.gameplay.type === 'fog-volume'}
              <div class="tuple-group"><div class="tuple-label">Volume Label</div><input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => updateGameplayField('title', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-group"><div class="tuple-label">Fog Color</div><input class="text-input" type="color" value={selectedNode.gameplay.fogColor ?? '#9ba9bb'} on:input={(e) => updateGameplayField('fogColor', (e.currentTarget as HTMLInputElement).value)} /></div>
              <div class="tuple-row compact-two" style="margin-top:0.45rem;">
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

      {#if activeEditorTab === 'ai'}
      <div class="editor-section">
        <div class="label">AI Mesh Studio</div>
        <div class="tuple-group">
          <div class="tuple-label">ComfyUI</div>
          <div class="save-message">{comfyUiStatus}</div>
        </div>
        <div class="button-row compact" style="margin-top:0.45rem;">
          <button disabled={comfyUiBusy} on:click={() => refreshComfyUiServiceStatus(true)}>
            {comfyUiBusy ? 'Working…' : comfyUiReady ? 'ComfyUI Ready' : 'Start ComfyUI'}
          </button>
          <button disabled={comfyUiBusy} on:click={() => refreshComfyUiServiceStatus(false)}>
            Refresh ComfyUI
          </button>
        </div>
        <div class="tuple-group">
          <div class="tuple-label">ComfyUI API</div>
          <input class="text-input" value={comfyUiApiUrl} on:input={(e) => { comfyUiApiUrl = (e.currentTarget as HTMLInputElement).value }} />
        </div>

        <div class="tuple-group">
          <div class="tuple-label">Mesh Backend</div>
          <div class="save-message">{hunyuanBackendStatus}</div>
        </div>
        <div class="button-row compact" style="margin-top:0.45rem;">
          <button disabled={hunyuanBusy} on:click={() => refreshHunyuanServiceStatus(true)}>
            {hunyuanBusy ? 'Working…' : hunyuanServiceReady ? 'Backend Ready' : 'Start Hunyuan'}
          </button>
          <button disabled={hunyuanBusy} on:click={() => refreshHunyuanServiceStatus(false)}>
            Refresh Backend
          </button>
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Hunyuan API</div>
          <input class="text-input" value={hunyuanApiUrl} on:input={(e) => { hunyuanApiUrl = (e.currentTarget as HTMLInputElement).value }} />
        </div>
        <div class="button-row compact">
          <button
            disabled={hunyuanBusy || !hunyuanBackendCanGenerate}
            on:click={() => runHunyuanFromScratch()}
          >
            {hunyuanBusy ? 'Working…' : 'Generate New Mesh Asset'}
          </button>
        </div>
        <div class="tuple-group">
          <div class="tuple-label">New Asset Name</div>
          <input class="text-input" value={hunyuanScratchName} on:input={(e) => { hunyuanScratchName = (e.currentTarget as HTMLInputElement).value }} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Scratch Reference Image</div>
          <input class="text-input" value={hunyuanScratchReferenceImageUrl} on:input={(e) => { hunyuanScratchReferenceImageUrl = (e.currentTarget as HTMLInputElement).value }} placeholder="/models/.../reference.png" />
        </div>
        <div class="save-message">Optional. Leave blank and the editor will generate a reference image from your prompt automatically before running Hunyuan.</div>
        <div class="tuple-group">
          <div class="tuple-label">Scratch Prompt</div>
          <textarea
            rows="4"
            placeholder="Describe the new mesh you want to create. If no reference image is set, this prompt will be used to generate one first."
            value={hunyuanScratchPrompt}
            on:input={(e) => { hunyuanScratchPrompt = (e.currentTarget as HTMLTextAreaElement).value }}
          ></textarea>
        </div>
        <div class="save-message">
          {#if hunyuanBackendCanGenerate}
            The backend is ready for prompt or reference-image generation.
          {:else}
            The mesh backend is online, but generation is currently unavailable. Read the backend status above for the exact limitation.
          {/if}
        </div>
        {#if canUseAiMeshStudio(selectedNode) && selectedNodes.length <= 1}
          <div class="editor-subsection">
          <div class="tuple-group">
            <div class="tuple-label">Selected Source</div>
            <input class="text-input" value={selectedNode.name} readonly />
          </div>
          <div class="tuple-group">
            <div class="tuple-label">{selectedNode?.asset ? 'Asset URL' : 'Source Type'}</div>
            <input class="text-input" value={selectedNode?.asset ? selectedNode.asset.url : `Prefab · ${selectedNode?.prefab?.type ?? ''}`} readonly />
          </div>
          <div class="save-message">{hunyuanStatus}</div>
          <div class="button-row compact" style="margin-top:0.45rem;">
            <button disabled={hunyuanBusy || !selectedNode?.asset} on:click={() => selectedNode?.asset && void inspectSelectedAssetForHunyuan(selectedNode.asset.url, selectedNode.id)}>
              Refresh Asset
            </button>
          </div>
          <div class="tuple-group">
            <div class="tuple-label">Reference Image</div>
            <input class="text-input" value={hunyuanReferenceImageUrl} on:input={(e) => { hunyuanReferenceImageUrl = (e.currentTarget as HTMLInputElement).value }} placeholder="/models/.../textures/basecolor.jpg" />
          </div>
          {#if hunyuanDetectedReferenceImageUrl}
            <div class="save-message">Detected reference: {hunyuanDetectedReferenceImageUrl}</div>
          {:else}
            <div class="save-message">Optional. Leave blank and the editor will generate a reference image from the prompt before generating or re-texturing.</div>
          {/if}
          <div class="tuple-group">
            <div class="tuple-label">Prompt / Style Note</div>
            <textarea
              rows="4"
              placeholder="Describe the mesh or texture treatment you want. If no reference image is set, this prompt will drive automatic reference-image generation."
              value={hunyuanPrompt}
              on:input={(e) => { hunyuanPrompt = (e.currentTarget as HTMLTextAreaElement).value }}
            ></textarea>
          </div>
          <div class="button-grid">
            <button
              disabled={hunyuanBusy || !hunyuanBackendCanGenerate || !hunyuanSupportsReplacement}
              on:click={() => runHunyuanForSelection('generate')}
            >
              {hunyuanBusy ? 'Working…' : selectedNode?.asset ? 'Generate Replacement Mesh' : 'Generate From Prefab'}
            </button>
            <button
              disabled={hunyuanBusy || !hunyuanBackendCanRetexture || !hunyuanSupportsTextureWrap || !canRetextureSelection(selectedNode)}
              on:click={() => runHunyuanForSelection('texture')}
            >
              {hunyuanBusy ? 'Working…' : 'Re-Texture Existing Mesh'}
            </button>
          </div>
          <div class="save-message">{selectedNode?.asset ? 'Generate a new textured GLB from the selected asset, or keep the mesh and ask Hunyuan to regenerate its wrapped texture set.' : 'Generate a brand-new textured GLB from this prefab selection. Once generated, the node will switch from prefab rendering to the imported mesh asset.'}</div>
          {#if hunyuanLastOutputUrl}
            <div class="tuple-group">
              <div class="tuple-label">Generated Asset</div>
              <input class="text-input" value={hunyuanLastOutputUrl} readonly />
            </div>
          {/if}
          </div>
        {:else if selectedNodes.length > 1}
          <div class="save-message">AI mesh tools need a single selected asset node. Multi-selection is not supported here.</div>
        {:else if selectedNode}
          <div class="save-message">The current selection is not an imported asset or supported prefab. Select a mesh-backed asset node or a procedural prefab to open AI mesh generation.</div>
        {:else}
          <div class="save-message">Select a single imported asset or prefab in the hierarchy, then use this panel to generate a new mesh or re-texture it.</div>
        {/if}
      </div>
      {/if}

      {#if activeEditorTab === 'save'}
      <div class="editor-section">
        <div class="label">Persistence</div>
        <div class="button-grid">
          <button on:click={saveScene}>Save Local</button>
          <button on:click={saveSceneToDisk}>Save Disk</button>
          <button on:click={copySceneJson}>Copy JSON</button>
          <button on:click={reloadFromDisk}>Reload Disk</button>
          <button on:click={resetToDefaultScene}>Reset Default</button>
        </div>
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
  .collapse-btn, button {
    background: rgba(30, 52, 73, 0.8); color: #e8f5ff; border: 1px solid rgba(126, 203, 255, 0.2); border-radius: 0.45rem; padding: 0.45rem 0.6rem;
  }
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
  button.active, .hierarchy-item.selected .hierarchy-entry { background: rgba(86, 148, 192, 0.35); }
  button.danger { color: #ffb3c0; border-color: rgba(255, 120, 140, 0.35); }
  .editor-section { padding: 0.9rem 1rem; border-bottom: 1px solid rgba(126, 203, 255, 0.08); }
  .editor-subsection {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(126, 203, 255, 0.08);
  }
  .label { font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; color: #8fb7d4; margin-bottom: 0.55rem; }
  .button-row, .button-grid { display: grid; gap: 0.45rem; }
  .button-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .button-row.compact { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 0.45rem; }
  .button-row.compact-two-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .button-row.level-switch-row { grid-template-columns: minmax(0, 1fr) auto; }
  .button-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
  .text-input, .tuple-input, textarea {
    width: 100%; background: rgba(7, 12, 18, 0.88); color: #ecf7ff; border: 1px solid rgba(126, 203, 255, 0.14); border-radius: 0.45rem; padding: 0.45rem 0.55rem;
  }
  .tuple-group { margin-top: 0.65rem; }
  .tuple-label { font-size: 0.75rem; color: #8fb7d4; margin-bottom: 0.35rem; }
  .tuple-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.4rem; }
  .tuple-row.compact-two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tuple-row.dynamic-grid { grid-template-columns: repeat(auto-fit, minmax(4rem, 1fr)); }
  .checkbox { display: flex; gap: 0.5rem; align-items: center; margin-top: 0.55rem; font-size: 0.9rem; }
  textarea { margin-top: 0.55rem; resize: vertical; }
  .full { width: 100%; margin-top: 0.55rem; }
  .save-message { margin-top: 0.45rem; font-size: 0.78rem; color: #9bc7e4; }
  .path-label { word-break: break-all; }
  .error-message { color: #ffb3c0; }
  .asset-browser-list { max-height: 14rem; }

  @media (max-width: 900px) {
    .editor-shell {
      width: min(95vw, 28rem);
    }
  }
</style>
