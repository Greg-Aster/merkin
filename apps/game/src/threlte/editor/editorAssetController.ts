import { EDITOR_API_BASE } from '@config/editorApi'
import {
  exportSceneNodeToGlb,
  exportSceneNodesToMergedGlb,
  getPrefabAssetUrl,
} from './editorBakeSource'
import {
  getCenteredGroupTransform,
  getSharedParentId,
  getTopLevelNodeIds,
} from './editorHierarchyUtils'
import type { EditorSceneNode } from './editorStore'

interface EditorAssetControllerDeps {
  state: Record<string, any>
  assetLibraryRootGenerated: string
  defaultComfyWorkflowPath: string
  textureFilePattern: RegExp
  getSelectedNode: () => EditorSceneNode | null
  getSelectedNodes: () => EditorSceneNode[]
  getEditorNodes: () => EditorSceneNode[]
  getActiveSceneLevelId: () => string
  getCanUseAiMeshStudio: (node: EditorSceneNode | null) => boolean
  getAiSourceName: (node: EditorSceneNode | null) => string
  getDefaultStyleDescriptor: (node: EditorSceneNode | null) => string
  getNodeTransformSnapshot: (node: EditorSceneNode | null) => {
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
  } | null
  readJsonPayload: (response: Response, context: string) => Promise<any>
  setRuntimeDiagnostic: (
    source: string,
    payload: { level: string; message: string },
  ) => void
  reportRuntimeAssetFailure: (id: string, message: string) => void
  appendPipelineLog: (message: string, detail?: unknown) => void
  patchNode: (nodeId: string, patch: Record<string, any>) => void
  patchNodes: (nodeIds: string[], patch: Record<string, any>) => void
  addNode: (node: EditorSceneNode) => void
  removeNodes: (nodeIds: string[]) => void
  startSceneTransaction: () => void
  endSceneTransaction: () => void
  addAssetPrefab: (
    label: string,
    url: string,
    scale?: [number, number, number],
  ) => void
  setActiveEditorTab: (tab: string) => void
  setSaveMessage: (message: string) => void
}

export function createEditorAssetController(deps: EditorAssetControllerDeps) {
  const state = deps.state

  async function loadAssetBrowser(path: string) {
    state.assetBrowserLoading = true
    state.assetBrowserError = ''
    state.selectedLibraryItem = null
    deps.setRuntimeDiagnostic('toolsBridge', {
      level: 'loading',
      message: `Browsing assets from ${path}…`,
    })
    try {
      const response = await fetch(
        `${EDITOR_API_BASE}/api/browse?path=${encodeURIComponent(path)}`,
      )
      const payload = await response.json()
      if (!payload?.success) {
        state.assetBrowserError = payload?.message ?? 'Failed to browse assets'
        deps.setRuntimeDiagnostic('toolsBridge', {
          level: 'warning',
          message: state.assetBrowserError,
        })
        return []
      }
      state.assetBrowserPath = path
      const nextItems = payload.items
        .filter(
          (item: any) => item.isDirectory || /\.(gltf|glb)$/i.test(item.name),
        )
        .sort(
          (a: any, b: any) =>
            Number(b.isDirectory) - Number(a.isDirectory) ||
            a.name.localeCompare(b.name),
        )
      state.assetBrowserItems = nextItems
      deps.setRuntimeDiagnostic('toolsBridge', {
        level: 'ready',
        message: `Asset browser connected. Loaded ${nextItems.length} entries from ${path}.`,
      })
      return nextItems
    } catch (error) {
      console.error('Asset browser load failed:', error)
      state.assetBrowserError = 'Asset browser unavailable'
      deps.reportRuntimeAssetFailure('asset-browser', state.assetBrowserError)
      deps.setRuntimeDiagnostic('toolsBridge', {
        level: 'error',
        message: `Asset browser unavailable at ${EDITOR_API_BASE}.`,
      })
      return []
    } finally {
      state.assetBrowserLoading = false
    }
  }

  async function browseWorkspaceEntries(path: string) {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/browse?path=${encodeURIComponent(path)}`,
    )
    const payload = await response.json()
    if (!payload?.success) {
      throw new Error(payload?.message ?? `Failed to browse ${path}`)
    }
    return Array.isArray(payload.items) ? payload.items : []
  }

  function resolvePublicAssetUrl(path: string, fallbackName: string) {
    const publicPrefixes = ['apps/game/public/', 'apps/megameal/public/']
    const matchedPrefix = publicPrefixes.find(prefix => path.startsWith(prefix))
    if (matchedPrefix) {
      return `/${path.slice(matchedPrefix.length)}`
    }

    return `/${fallbackName}`
  }

  function getPublicAssetDirectoryPath(assetUrl: string) {
    if (typeof assetUrl !== 'string' || !assetUrl.startsWith('/')) return ''
    const normalized = assetUrl.replace(/^\/+/, '')
    const workspacePath = `apps/megameal/public/${normalized}`
    return workspacePath.replace(/\/[^/]+$/, '')
  }

  function getSelectedNodePreviewAssetUrl(
    node: EditorSceneNode | null = deps.getSelectedNode(),
  ) {
    if (!node) return ''
    if (node.asset?.url) return node.asset.url
    if (node.generation?.lastBakedAssetUrl)
      return node.generation.lastBakedAssetUrl
    return ''
  }

  function clearGeneratedVariantState() {
    state.generatedVariantItems = []
    state.generatedVariantLoading = false
    state.generatedVariantError = ''
    state.selectedGeneratedVariantUrl = ''
  }

  async function loadGeneratedVariantsForSelectedNode(
    node: EditorSceneNode | null = deps.getSelectedNode(),
  ) {
    const assetUrl = node?.asset?.url ?? ''
    if (!assetUrl.startsWith('/generated/')) {
      clearGeneratedVariantState()
      return
    }

    const directoryPath = getPublicAssetDirectoryPath(assetUrl)
    if (!directoryPath) {
      clearGeneratedVariantState()
      return
    }

    state.generatedVariantLoading = true
    state.generatedVariantError = ''

    try {
      const items = await browseWorkspaceEntries(directoryPath)
      state.generatedVariantItems = items
        .filter(
          (item: any) => !item.isDirectory && /\.(glb|gltf)$/i.test(item.name),
        )
        .sort((left: any, right: any) => right.name.localeCompare(left.name))
        .map((item: any) => ({
          name: item.name,
          path: item.path,
          url: resolvePublicAssetUrl(item.path, item.name),
        }))
      state.selectedGeneratedVariantUrl =
        state.generatedVariantItems.find((item: any) => item.url === assetUrl)
          ?.url ??
        state.generatedVariantItems[0]?.url ??
        ''
    } catch (error) {
      console.error('Generated variant load failed:', error)
      state.generatedVariantItems = []
      state.generatedVariantError =
        error instanceof Error ? error.message : 'Variant browser unavailable'
      state.selectedGeneratedVariantUrl = ''
    } finally {
      state.generatedVariantLoading = false
    }
  }

  async function loadTextureBrowser(path: string) {
    state.textureBrowserLoading = true
    state.textureBrowserError = ''
    try {
      const response = await fetch(
        `${EDITOR_API_BASE}/api/browse?path=${encodeURIComponent(path)}`,
      )
      const payload = await response.json()
      if (!payload?.success) {
        state.textureBrowserError =
          payload?.message ?? 'Failed to browse textures'
        return
      }
      state.textureBrowserPath = path
      state.textureBrowserItems = payload.items
        .filter(
          (item: any) =>
            item.isDirectory || deps.textureFilePattern.test(item.name),
        )
        .sort(
          (a: any, b: any) =>
            Number(b.isDirectory) - Number(a.isDirectory) ||
            a.name.localeCompare(b.name),
        )
    } catch (error) {
      console.error('Texture browser load failed:', error)
      state.textureBrowserError = 'Texture browser unavailable'
    } finally {
      state.textureBrowserLoading = false
    }
  }

  async function loadWorkflowBrowser(path: string) {
    state.workflowBrowserLoading = true
    state.workflowBrowserError = ''

    try {
      const response = await fetch(
        `${EDITOR_API_BASE}/api/browse?path=${encodeURIComponent(path)}`,
      )
      const payload = await response.json()
      if (!payload?.success) {
        state.workflowBrowserError =
          payload?.message ?? 'Failed to browse workflows'
        return
      }

      state.workflowBrowserPath = path
      state.workflowBrowserItems = payload.items
        .filter((item: any) => item.isDirectory || /\.json$/i.test(item.name))
        .sort(
          (a: any, b: any) =>
            Number(b.isDirectory) - Number(a.isDirectory) ||
            a.name.localeCompare(b.name),
        )
    } catch (error) {
      console.error('Workflow browser load failed:', error)
      state.workflowBrowserError = 'Workflow browser unavailable'
    } finally {
      state.workflowBrowserLoading = false
    }
  }

  function selectWorkflowPath(item: {
    name: string
    path: string
    isDirectory: boolean
  }) {
    if (item.isDirectory) {
      void loadWorkflowBrowser(item.path)
      return
    }

    state.selectedComfyWorkflowPath = item.path
    deps.setSaveMessage(`Selected workflow: ${item.name}`)
  }

  function resetSelectedWorkflowPath() {
    state.selectedComfyWorkflowPath = deps.defaultComfyWorkflowPath
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        'merkin:selected-comfy-workflow-path',
        deps.defaultComfyWorkflowPath,
      )
    }
    deps.setSaveMessage('Reset Comfy workflow to the built-in default')
  }

  function goUpWorkflowBrowser() {
    const parts = state.workflowBrowserPath.split('/').filter(Boolean)
    if (parts.length <= 1) return
    parts.pop()
    void loadWorkflowBrowser(parts.join('/'))
  }

  function getSelectedLibraryItemUrl() {
    if (!state.selectedLibraryItem || state.selectedLibraryItem.isDirectory)
      return ''
    return resolvePublicAssetUrl(
      state.selectedLibraryItem.path,
      state.selectedLibraryItem.name,
    )
  }

  function getSelectedLibraryItemName() {
    if (!state.selectedLibraryItem) return ''
    return state.selectedLibraryItem.name.replace(/\.(gltf|glb)$/i, '')
  }

  function getAssetBrowserDefaultScale(item: { name: string; path: string }) {
    return item.path.startsWith(deps.assetLibraryRootGenerated)
      ? ([1, 1, 1] as [number, number, number])
      : ([0.001, 0.001, 0.001] as [number, number, number])
  }

  function addAssetFromBrowser(item: { name: string; path: string }) {
    const url = resolvePublicAssetUrl(item.path, item.name)
    deps.addAssetPrefab(
      item.name.replace(/\.(gltf|glb)$/i, ''),
      url,
      getAssetBrowserDefaultScale(item),
    )
    deps.setSaveMessage(
      item.path.startsWith(deps.assetLibraryRootGenerated)
        ? `Added generated asset at scene scale: ${url}`
        : `Added imported asset: ${url}`,
    )
  }

  function addSelectedLibraryAssetToScene() {
    if (!state.selectedLibraryItem || state.selectedLibraryItem.isDirectory)
      return
    addAssetFromBrowser(state.selectedLibraryItem)
  }

  async function refreshGeneratedAssetLibrary(selectAssetUrl?: string) {
    const rootItems = await loadAssetBrowser(deps.assetLibraryRootGenerated)

    if (!selectAssetUrl) return
    const normalizedUrl = selectAssetUrl.replace(/^\/+/, '')
    const workspaceCandidates = [
      `apps/megameal/public/${normalizedUrl}`,
      `apps/game/public/${normalizedUrl}`,
    ]
    const selectedDirectory = workspaceCandidates[0].replace(/\/[^/]+$/, '')
    const directoryItems =
      selectedDirectory === deps.assetLibraryRootGenerated
        ? rootItems
        : await loadAssetBrowser(selectedDirectory)
    const foundItem = directoryItems.find((item: any) =>
      workspaceCandidates.includes(item.path),
    )
    if (foundItem) {
      state.selectedLibraryItem = foundItem
      state.hunyuanSelectionKey = foundItem.path
      state.assetBrowserPath = selectedDirectory
      state.assetBrowserFilter = foundItem.name.replace(/\.(gltf|glb)$/i, '')
    }
  }

  function getApplicableSelectionNodeIds() {
    const selectedNodes = deps.getSelectedNodes()
    if (selectedNodes.length > 0) {
      return selectedNodes
        .filter(node => deps.getCanUseAiMeshStudio(node))
        .map(node => node.id)
    }

    const selectedNode = deps.getSelectedNode()
    if (selectedNode && deps.getCanUseAiMeshStudio(selectedNode)) {
      return [selectedNode.id]
    }

    return []
  }

  async function openGeneratedAssetInLibrary() {
    if (!state.hunyuanLastOutputUrl) return
    deps.setActiveEditorTab('create')
    await refreshGeneratedAssetLibrary(state.hunyuanLastOutputUrl)
    deps.setSaveMessage(
      `Opened generated asset in library: ${state.hunyuanLastOutputUrl}`,
    )
  }

  async function applyGeneratedAssetToSelection() {
    if (!state.hunyuanLastOutputUrl) {
      deps.setSaveMessage('No generated asset available to apply')
      return
    }

    const targetNodeIds = getApplicableSelectionNodeIds()
    if (targetNodeIds.length === 0) {
      deps.setSaveMessage(
        'Select one or more prefab or asset nodes to apply the generated asset',
      )
      return
    }

    const replacementPatch = {
      kind: 'asset' as const,
      asset: { url: state.hunyuanLastOutputUrl },
      prefab: undefined,
      primitive: undefined,
    }

    if (targetNodeIds.length > 1) {
      deps.patchNodes(targetNodeIds, replacementPatch)
    } else {
      deps.patchNode(targetNodeIds[0], replacementPatch)
    }

    deps.appendPipelineLog(
      'Applied generated asset to selection with preserved transform',
      {
        assetUrl: state.hunyuanLastOutputUrl,
        targets: targetNodeIds.map(id => {
          const node = deps
            .getEditorNodes()
            .find(candidate => candidate.id === id)
          return { id, transform: deps.getNodeTransformSnapshot(node ?? null) }
        }),
      },
    )

    state.hunyuanStatus = `Applied generated asset to ${targetNodeIds.length} node${targetNodeIds.length === 1 ? '' : 's'}.`
    state.hunyuanLastResultSummary = state.hunyuanStatus
    deps.setRuntimeDiagnostic('hunyuan', {
      level: 'ready',
      message: state.hunyuanStatus,
    })
    deps.setSaveMessage(`AI asset applied: ${state.hunyuanLastOutputUrl}`)

    const selectedNode = deps.getSelectedNode()
    if (selectedNode && targetNodeIds.includes(selectedNode.id)) {
      void inspectSelectedAssetForHunyuan(
        state.hunyuanLastOutputUrl,
        selectedNode.id,
      )
    }
  }

  async function inspectSelectedAssetForHunyuan(
    assetUrl: string,
    selectionKey: string,
  ) {
    const inspectToken = ++state.hunyuanInspectToken
    state.hunyuanStatus = 'Inspecting selected asset for Hunyuan compatibility…'
    state.hunyuanDetectedReferenceImageUrl = ''
    state.hunyuanReferenceImageUrl = ''
    state.hunyuanSupportsReplacement = false
    state.hunyuanSupportsTextureWrap = false
    state.hunyuanLastOutputUrl = ''

    try {
      const response = await fetch(
        `${EDITOR_API_BASE}/api/hunyuan3d/inspect?assetUrl=${encodeURIComponent(assetUrl)}`,
      )
      const payload = await response.json()

      if (
        inspectToken !== state.hunyuanInspectToken ||
        selectionKey !== state.hunyuanSelectionKey
      )
        return

      if (!payload?.success || !payload.inspection) {
        state.hunyuanStatus =
          payload?.message ?? 'Could not inspect this asset for AI generation.'
        return
      }

      state.hunyuanDetectedReferenceImageUrl =
        payload.inspection.detectedReferenceImageUrl ?? ''
      state.hunyuanReferenceImageUrl =
        payload.inspection.detectedReferenceImageUrl ?? ''
      state.hunyuanSupportsReplacement =
        !!payload.inspection.supportsReplacementGeneration
      state.hunyuanSupportsTextureWrap =
        !!payload.inspection.supportsTextureWrap
      state.hunyuanStatus =
        payload.inspection.message ?? 'Selected asset is ready for Hunyuan.'
      deps.setRuntimeDiagnostic('hunyuan', {
        level: 'ready',
        message: state.hunyuanStatus,
      })
    } catch (error) {
      if (
        inspectToken !== state.hunyuanInspectToken ||
        selectionKey !== state.hunyuanSelectionKey
      )
        return
      console.error('Hunyuan asset inspect failed:', error)
      state.hunyuanStatus = `Hunyuan bridge unavailable at ${EDITOR_API_BASE}.`
      deps.setRuntimeDiagnostic('hunyuan', {
        level: 'error',
        message: state.hunyuanStatus,
      })
    }
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
        sourceName: deps.getAiSourceName(node),
      }
    }

    const glbBase64 = await arrayBufferToBase64(
      await exported.blob.arrayBuffer(),
    )
    const response = await fetch(`${EDITOR_API_BASE}/api/style/source-asset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: exported.fileName,
        glbBase64,
        sourceName: deps.getAiSourceName(node),
        sourceKind: exported.kind,
        descriptor: deps.getDefaultStyleDescriptor(node),
        levelId: deps.getActiveSceneLevelId(),
        nodeId: node.id,
      }),
    })
    const payload = await deps.readJsonPayload(
      response,
      'Style source asset staging',
    )

    if (!payload?.success || !payload?.assetUrl) {
      throw new Error(
        payload?.message ?? `Could not stage a source mesh for ${node.name}.`,
      )
    }

    return {
      assetUrl: payload.assetUrl as string,
      sourceName: deps.getAiSourceName(node),
    }
  }

  async function ensureSceneNodeSourceAsset(node: EditorSceneNode) {
    if (node.asset?.url) {
      return {
        assetUrl: node.asset.url,
        sourceName: deps.getAiSourceName(node),
      }
    }

    const prefabAssetUrl = getPrefabAssetUrl(node.prefab?.type)
    if (prefabAssetUrl) {
      return {
        assetUrl: prefabAssetUrl,
        sourceName: deps.getAiSourceName(node),
      }
    }

    return stageSceneNodeSourceAsset(node)
  }

  async function mergeSelectionToAsset(mergeDescriptor = '') {
    const selectedNodes = deps.getSelectedNodes()
    if (selectedNodes.length === 0) {
      deps.setSaveMessage('Select one or more nodes before merging')
      return
    }

    const editorNodes = deps.getEditorNodes()
    const selectedIds = selectedNodes.map(node => node.id)
    const topLevelIds = getTopLevelNodeIds(editorNodes, selectedIds)
    if (topLevelIds.length === 0) {
      deps.setSaveMessage('Select one or more nodes before merging')
      return
    }

    const commonParentId = getSharedParentId(editorNodes, topLevelIds)
    const placement =
      getCenteredGroupTransform(editorNodes, topLevelIds, commonParentId) ??
      {
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
      }

    const mergeLabel =
      topLevelIds.length === 1
        ? `${selectedNodes[0]?.name || 'selection'} merged`
        : `${selectedNodes[0]?.name || 'selection'} cluster`
    const normalizedMergeDescriptor =
      mergeDescriptor.trim() ||
      `merged selection asset from ${topLevelIds.length} scene node${topLevelIds.length === 1 ? '' : 's'}`

    try {
      deps.setSaveMessage(`Merging ${topLevelIds.length} node${topLevelIds.length === 1 ? '' : 's'} into one asset…`)
      const exported = await exportSceneNodesToMergedGlb(
        editorNodes,
        topLevelIds,
        `${deps.getActiveSceneLevelId()}-${mergeLabel}`,
      )
      const glbBase64 = await arrayBufferToBase64(
        await exported.blob.arrayBuffer(),
      )
      const response = await fetch(`${EDITOR_API_BASE}/api/style/source-asset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: exported.fileName,
          glbBase64,
          sourceName: mergeLabel,
          sourceKind: 'merged-selection',
          descriptor: normalizedMergeDescriptor,
          levelId: deps.getActiveSceneLevelId(),
          nodeId: topLevelIds.join(','),
        }),
      })
      const payload = await deps.readJsonPayload(
        response,
        'Merged selection asset staging',
      )

      if (!payload?.success || !payload?.assetUrl) {
        throw new Error(
          payload?.message ?? 'Could not stage the merged selection asset.',
        )
      }

      const mergedNode: EditorSceneNode = {
        id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name:
          topLevelIds.length === 1
            ? `${selectedNodes[0]?.name || 'Merged'} Merged`
            : `${selectedNodes[0]?.name || 'Merged'} Cluster`,
        kind: 'asset',
        parentId: commonParentId,
        position: placement.position,
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        asset: {
          url: payload.assetUrl,
        },
        generation: {
          descriptor: normalizedMergeDescriptor,
          family: 'merged-selection',
          lastBakedAssetUrl: payload.assetUrl,
          lastBakedAt: new Date().toISOString(),
        },
      }

      deps.startSceneTransaction()
      try {
        deps.removeNodes(topLevelIds)
        deps.addNode(mergedNode)
      } finally {
        deps.endSceneTransaction()
      }

      deps.appendPipelineLog('Merged selection into a single asset node', {
        assetUrl: payload.assetUrl,
        mergedNodeId: mergedNode.id,
        sourceNodeIds: topLevelIds,
      })
      deps.setSaveMessage(
        `Merged ${topLevelIds.length} node${topLevelIds.length === 1 ? '' : 's'} into ${mergedNode.name}`,
      )
    } catch (error) {
      console.error('Merge selection failed:', error)
      deps.setSaveMessage(
        error instanceof Error ? error.message : 'Merge selection failed',
      )
    }
  }

  return {
    loadAssetBrowser,
    browseWorkspaceEntries,
    resolvePublicAssetUrl,
    getPublicAssetDirectoryPath,
    getSelectedNodePreviewAssetUrl,
    clearGeneratedVariantState,
    loadGeneratedVariantsForSelectedNode,
    loadTextureBrowser,
    loadWorkflowBrowser,
    selectWorkflowPath,
    resetSelectedWorkflowPath,
    goUpWorkflowBrowser,
    getSelectedLibraryItemUrl,
    getSelectedLibraryItemName,
    getAssetBrowserDefaultScale,
    addAssetFromBrowser,
    addSelectedLibraryAssetToScene,
    refreshGeneratedAssetLibrary,
    getApplicableSelectionNodeIds,
    openGeneratedAssetInLibrary,
    applyGeneratedAssetToSelection,
    inspectSelectedAssetForHunyuan,
    stageSceneNodeSourceAsset,
    ensureSceneNodeSourceAsset,
    mergeSelectionToAsset,
  }
}
