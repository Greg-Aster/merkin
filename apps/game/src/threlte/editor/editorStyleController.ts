import * as THREE from 'three'
import { canBakeSceneNode, getPrefabAssetUrl } from './editorBakeSource'
import { applyGeneratedAssetToNode } from './editorGeneratedAssetApplication'
import { cancelHunyuanJobs } from './editorHunyuanApi'
import {
  type PersistedStyleBatchEntry,
  type PersistedStyleBatchSession,
  saveEditorSceneToLocalStorage,
} from './editorPersistence'
import { getEditorObject } from './editorRegistry'
import type { EditorSceneNode } from './editorStore'
import {
  exportStyleAssetForBlender,
  fetchLatestStyleWorkspace,
  inspectStyleAsset,
  packageStyleWorkspace,
  reimportStyleAssetFromBlender,
  simplifyStyleAsset,
} from './editorStyleApi'
import {
  buildProceduralStyleBakeSettings,
  createEditorStyleBakeManager,
} from './editorStyleBakeManager'
import type {
  EditorStyleBakeBatchScope,
  EditorStyleBakePreviewSnapshot,
  EditorStyleBakeProduct,
  EditorStyleBakeRunOptions,
} from './editorStyleBakeTypes'
import { createEditorStyleBatchSessionController } from './editorStyleBatchSession'

interface EditorStyleControllerDeps {
  state: Record<string, any>
  getSelectedNode: () => EditorSceneNode | null
  getSelectedNodes: () => EditorSceneNode[]
  getEditorNodes: () => EditorSceneNode[]
  getActiveSceneLevelId: () => string
  getStyleSceneCandidates: () => Array<{ id: string }>
  canUseStyleStudio: (node: EditorSceneNode | null) => boolean
  getDefaultStyleDescriptor: (node: EditorSceneNode | null) => string
  getAiSourceName: (node: EditorSceneNode | null) => string
  ensureSceneNodeSourceAsset: (
    node: EditorSceneNode,
  ) => Promise<{ assetUrl: string; sourceName: string }>
  readJsonPayload: (response: Response, context: string) => Promise<any>
  appendPipelineLog: (message: string, detail?: unknown) => void
  refreshGeneratedAssetLibrary: (selectAssetUrl?: string) => Promise<void>
  inspectSelectedAssetForHunyuan: (
    assetUrl: string,
    selectionKey: string,
  ) => Promise<void>
  saveSceneDocumentToDisk: (levelId: string) => Promise<any>
  getCurrentScene: () => any
  patchNode: (nodeId: string, patch: Record<string, any>) => void
  queueHunyuanJob: (requestBody: Record<string, unknown>) => Promise<any>
  waitForQueuedHunyuanJob: (
    jobId: string,
    options?: { onQueued?: (job: any) => void; onRunning?: (job: any) => void },
  ) => Promise<any>
  refreshHunyuanServiceStatus: (ensure?: boolean) => Promise<void>
  refreshHunyuanRecentJobs: () => Promise<void>
  runHunyuanForSelection: (mode: 'generate' | 'texture') => Promise<void>
}

export function createEditorStyleController(deps: EditorStyleControllerDeps) {
  const state = deps.state
  const {
    resetQueuedStyleBatchEntriesForResume,
    persistStyleBatchSession,
    updatePersistedStyleBatchSession,
    createStyleBatchSession,
  } = createEditorStyleBatchSessionController({
    state,
    getEditorNodes: deps.getEditorNodes,
    getActiveSceneLevelId: deps.getActiveSceneLevelId,
    getDefaultStyleDescriptor: deps.getDefaultStyleDescriptor,
    getAiSourceName: deps.getAiSourceName,
  })

  function buildNodeStylePrompt(node: EditorSceneNode) {
    const descriptor = deps.getDefaultStyleDescriptor(node)
    const promptSegments = [
      descriptor ? `object: ${descriptor}` : '',
      'preserve the object identity and overall silhouette; do not turn it into a different object class',
      state.styleProfileName.trim()
        ? `style family: ${state.styleProfileName.trim()}`
        : '',
      state.stylePrompt.trim()
        ? `style treatment: ${state.stylePrompt.trim()}`
        : '',
    ].filter((segment: string) => segment.trim().length > 0)

    return promptSegments.join('. ')
  }

  function getNodeTransformSnapshot(node: EditorSceneNode | null) {
    if (!node) return null
    return {
      position: [...node.position] as [number, number, number],
      rotation: [...node.rotation] as [number, number, number],
      scale: [...node.scale] as [number, number, number],
    }
  }

  function cloneStyleBakeValue<T>(value: T): T {
    if (value === undefined || value === null) return value
    if (typeof structuredClone === 'function') return structuredClone(value)
    return JSON.parse(JSON.stringify(value)) as T
  }

  function createStyleBakePreviewSnapshot(
    node: EditorSceneNode,
    previewAssetUrl: string,
  ): EditorStyleBakePreviewSnapshot {
    return {
      nodeId: node.id,
      previousKind: node.kind,
      previousAsset: cloneStyleBakeValue(node.asset),
      previousPrefab: cloneStyleBakeValue(node.prefab),
      previousPrimitive: cloneStyleBakeValue(node.primitive),
      previousScale: [...node.scale] as [number, number, number],
      previousGeneration: cloneStyleBakeValue(node.generation),
      previewAssetUrl,
    }
  }

  function getStyleBakePreviewNode(
    snapshot: EditorStyleBakePreviewSnapshot | null | undefined,
  ) {
    if (!snapshot) return null
    return (
      deps.getEditorNodes().find(node => node.id === snapshot.nodeId) ?? null
    )
  }

  function getStyleBakeNodeAssetUrl(node: EditorSceneNode | null | undefined) {
    return typeof node?.asset?.url === 'string' ? node.asset.url : ''
  }

  function numbersMatch(left: unknown, right: unknown) {
    const leftNumber = Number(left)
    const rightNumber = Number(right)
    return (
      Number.isFinite(leftNumber) &&
      Number.isFinite(rightNumber) &&
      Math.abs(leftNumber - rightNumber) < 0.000001
    )
  }

  function isStyleBakeProductDirtyForCurrentControls(
    product: EditorStyleBakeProduct | null | undefined,
  ) {
    if (!product) return false
    const currentSourceAssetUrl = String(
      state.styleBakeCurrentSourceAssetUrl ?? '',
    ).trim()
    return (
      !numbersMatch(product.settings.textureSize, state.styleBakeTextureSize) ||
      !numbersMatch(
        product.settings.lineStrength,
        state.styleBakeLineStrength,
      ) ||
      !numbersMatch(
        product.settings.brushStrength,
        state.styleBakeBrushStrength,
      ) ||
      !numbersMatch(product.settings.aoStrength, state.styleBakeAoStrength) ||
      !numbersMatch(
        product.settings.cavityStrength,
        state.styleBakeCavityStrength,
      ) ||
      !numbersMatch(
        product.settings.curvatureStrength,
        state.styleBakeCurvatureStrength,
      ) ||
      !numbersMatch(
        product.settings.geometrySimplification,
        state.styleBakeGeometrySimplification,
      ) ||
      product.settings.outputTier !== state.styleBakeOutputTier ||
      (!!currentSourceAssetUrl &&
        product.source.assetUrl !== currentSourceAssetUrl)
    )
  }

  function getStyleBakeManager() {
    return createEditorStyleBakeManager({
      getSelectedNode: deps.getSelectedNode,
      getEditorNodes: deps.getEditorNodes,
      canUseStyleStudio: deps.canUseStyleStudio,
      getActiveSceneLevelId: deps.getActiveSceneLevelId,
      getDefaultStyleDescriptor: deps.getDefaultStyleDescriptor,
      ensureSceneNodeSourceAsset: deps.ensureSceneNodeSourceAsset,
      readJsonPayload: deps.readJsonPayload,
      refreshGeneratedAssetLibrary: deps.refreshGeneratedAssetLibrary,
      saveSceneDocumentToDisk: deps.saveSceneDocumentToDisk,
      patchNode: deps.patchNode,
      appendPipelineLog: deps.appendPipelineLog,
      getSceneNodeVisualBounds,
      inspectGeneratedAssetBounds: inspectAssetBounds,
      getNodeTransformSnapshot,
    })
  }

  function setStyleBatchNodeStatus(nodeId: string, message: string) {
    state.styleBatchNodeStatusById = {
      ...state.styleBatchNodeStatusById,
      [nodeId]: message,
    }
  }

  function updateStyleBatchEntry(
    nodeId: string,
    patch: Partial<PersistedStyleBatchEntry>,
  ) {
    updatePersistedStyleBatchSession(current => ({
      ...current,
      entries: current.entries.map(candidate =>
        candidate.nodeId === nodeId ? { ...candidate, ...patch } : candidate,
      ),
    }))
  }

  function markStyleBatchEntry(
    entry: PersistedStyleBatchEntry,
    patch: Partial<PersistedStyleBatchEntry>,
    message?: string,
  ) {
    Object.assign(entry, patch)
    updateStyleBatchEntry(entry.nodeId, patch)
    if (message) {
      setStyleBatchNodeStatus(entry.nodeId, message)
    }
  }

  function getCompletedStyleBatchMessage(
    session: PersistedStyleBatchSession,
    hasIncompleteEntries: boolean,
  ) {
    if (hasIncompleteEntries) {
      return 'Scene batch stopped with incomplete items. Generated assets that finished were applied, and the remaining session was kept for inspection or recovery.'
    }

    if (
      session.mode === 'procedural-material' ||
      session.mode === 'blender-geometry'
    ) {
      return `${getStyleBatchModeLabel(session.mode)} batch finished for ${session.entries.length} object${session.entries.length === 1 ? '' : 's'}. The scene file was saved to disk.`
    }

    return session.mode === 'texture'
      ? `Texture style batch finished for ${session.entries.length} object${session.entries.length === 1 ? '' : 's'}. The scene file was saved to disk.`
      : `Scene regeneration finished for ${session.entries.length} object${session.entries.length === 1 ? '' : 's'}. The scene file was saved to disk.`
  }

  function getStyleBatchModeLabel(mode: PersistedStyleBatchSession['mode']) {
    if (mode === 'procedural-material') return 'procedural style bake'
    if (mode === 'blender-geometry') return 'Blender geometry style bake'
    return mode === 'texture' ? 'texture style' : 'mesh reimagine'
  }

  async function completeStyleBatchSession(
    session: PersistedStyleBatchSession,
  ) {
    await deps.saveSceneDocumentToDisk(deps.getActiveSceneLevelId())
    const finalSession = state.styleBatchSession
    const hasIncompleteEntries = !!finalSession?.entries.some(
      (entry: PersistedStyleBatchEntry) => entry.status !== 'applied',
    )
    if (hasIncompleteEntries && finalSession) {
      state.styleBatchPendingResume = persistStyleBatchSession(
        resetQueuedStyleBatchEntriesForResume(finalSession),
      )
    }
    state.styleBatchStatus = getCompletedStyleBatchMessage(
      session,
      hasIncompleteEntries,
    )
    state.saveMessage = state.styleBatchStatus
    if (!hasIncompleteEntries) {
      persistStyleBatchSession(null)
      state.styleBatchPendingResume = null
    }
  }

  function setCheckpointedStyleBatchStatus(message: string) {
    state.styleBatchStatus = message
    state.saveMessage = `${state.styleBatchStatus} Local scene state was checkpointed.`
  }

  function markActiveStyleBatchJobFailed(message: string) {
    updatePersistedStyleBatchSession(current => ({
      ...current,
      entries: current.entries.map(candidate =>
        candidate.jobId === state.hunyuanActiveJobId &&
        (candidate.status === 'queued' || candidate.status === 'running')
          ? {
              ...candidate,
              status: 'failed',
              error: message,
            }
          : candidate,
      ),
    }))
  }

  function handleStyleBatchSessionError(error: unknown) {
    if (state.styleBatchStopIntent === 'pause') {
      setCheckpointedStyleBatchStatus(
        'Scene style batch paused. Resume the saved session when you are ready.',
      )
      state.styleBatchPendingResume = state.styleBatchSession
      return
    }

    if (state.styleBatchStopIntent === 'cancel') {
      setCheckpointedStyleBatchStatus(
        'Scene style batch cancelled. Auto-resume was discarded.',
      )
      return
    }

    state.styleBatchStatus =
      error instanceof Error
        ? error.message
        : 'Scene style batch failed. Check the editor API and local AI services.'
    markActiveStyleBatchJobFailed(state.styleBatchStatus)
  }

  async function pauseActiveHunyuanJobs() {
    state.styleBatchAbortRequested = true
    state.styleBatchStopIntent = 'pause'
    state.styleBatchStatus =
      'Pause requested. Interrupting queued and active AI jobs while preserving resume state…'
    deps.appendPipelineLog('Pausing active Hunyuan jobs')

    const pausedSession = state.styleBatchSession
      ? persistStyleBatchSession(
          resetQueuedStyleBatchEntriesForResume(state.styleBatchSession),
        )
      : null
    state.styleBatchResumePromise = null
    state.styleBatchPendingResume = pausedSession

    const scene = deps.getCurrentScene()
    if (scene && typeof window !== 'undefined') {
      saveEditorSceneToLocalStorage(deps.getActiveSceneLevelId(), scene)
    }

    try {
      const payload = await cancelHunyuanJobs(
        deps.readJsonPayload,
        'Hunyuan pause',
      )
      state.styleBatchStatus = `${payload?.message ?? 'Pause requested.'} Resume remains available from the saved batch session.`
      state.saveMessage = `${state.styleBatchStatus} Local scene state was checkpointed.`
      void deps.refreshHunyuanRecentJobs()
    } catch (error) {
      state.styleBatchStatus =
        error instanceof Error ? error.message : 'Failed to pause AI jobs.'
      state.saveMessage = state.styleBatchStatus
    }
  }

  async function cancelActiveHunyuanJobs() {
    state.styleBatchAbortRequested = true
    state.styleBatchStopIntent = 'cancel'
    state.styleBatchStatus =
      'Cancellation requested. Interrupting queued and active AI jobs…'
    deps.appendPipelineLog('Cancelling active Hunyuan jobs')

    const scene = deps.getCurrentScene()
    if (scene && typeof window !== 'undefined') {
      saveEditorSceneToLocalStorage(deps.getActiveSceneLevelId(), scene)
    }
    persistStyleBatchSession(null)
    state.styleBatchResumePromise = null
    state.styleBatchPendingResume = null

    try {
      const payload = await cancelHunyuanJobs(
        deps.readJsonPayload,
        'Hunyuan cancel',
      )
      state.styleBatchStatus = `${payload?.message ?? 'Cancellation requested.'} Auto-resume has been cleared.`
      state.styleBatchNodeStatusById = {}
      state.saveMessage = `${state.styleBatchStatus} Local scene state was checkpointed.`
      void deps.refreshHunyuanRecentJobs()
    } catch (error) {
      state.styleBatchStatus =
        error instanceof Error ? error.message : 'Failed to cancel AI jobs.'
      state.saveMessage = state.styleBatchStatus
    }
  }

  async function resumePendingStyleBatchSession() {
    if (!state.styleBatchPendingResume) return
    const session = state.styleBatchPendingResume
    state.styleBatchPendingResume = null
    state.styleBatchResumePromise = resumeStyleBatchSession(session)
    await state.styleBatchResumePromise
  }

  function discardPendingStyleBatchSession() {
    persistStyleBatchSession(null)
    state.styleBatchPendingResume = null
    state.styleBatchStatus = 'Discarded the saved batch session.'
    state.saveMessage = state.styleBatchStatus
  }

  async function inspectSelectedAssetForStyle() {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !deps.canUseStyleStudio(selectedNode)) {
      state.styleStatus = 'Select a single geometry node to inspect it.'
      return
    }

    state.styleBusy = true
    state.styleStatus = `Inspecting ${selectedNode.name}…`
    deps.appendPipelineLog('Inspecting selected asset for style', {
      nodeId: selectedNode.id,
      sourceName: selectedNode.name,
    })

    try {
      const source = await deps.ensureSceneNodeSourceAsset(selectedNode)
      const payload = await inspectStyleAsset(
        source.assetUrl,
        deps.readJsonPayload,
        'Style inspection',
      )

      if (!payload?.success) {
        state.styleStatus = payload?.message ?? 'Style inspection failed.'
        return
      }

      if (
        !state.styleReferenceImageUrl &&
        payload.inspection?.detectedReferenceImageUrl
      ) {
        state.styleReferenceImageUrl =
          payload.inspection.detectedReferenceImageUrl
      }

      state.styleInspectReport = payload.analysis?.inspectReport ?? ''
      state.styleSourceSummary = `${payload.analysis?.sizeFormatted ?? 'Unknown size'} · ${payload.analysis?.modifiedAt ?? 'Unknown date'}`
      state.styleStatus = `Source analyzed. Next step: describe the target look, then package the style workspace for ${selectedNode.name}.`
    } catch (error) {
      console.error('Style inspection failed:', error)
      state.styleStatus =
        error instanceof Error
          ? error.message
          : 'Style inspection failed. Check the local editor API.'
    } finally {
      state.styleBusy = false
    }
  }

  function parseBoundsFromInspectReport(inspectReport: string) {
    const parseVector = (raw: string) =>
      raw
        .split(',')
        .map(value => Number(value.trim()))
        .filter(value => Number.isFinite(value))

    const sceneRows = inspectReport
      .split('\n')
      .filter(line => /^\|\s*\d+\s*\|/.test(line))

    for (const row of sceneRows) {
      const vectors =
        row.match(/-?\d+(?:\.\d+)?(?:,\s*-?\d+(?:\.\d+)?){2}/g) ?? []
      if (vectors.length < 2) continue

      const bboxMin = parseVector(vectors[0] ?? '')
      const bboxMax = parseVector(vectors[1] ?? '')
      if (bboxMin.length !== 3 || bboxMax.length !== 3) continue

      const size = bboxMax.map((value, index) => value - bboxMin[index]) as [
        number,
        number,
        number,
      ]
      const maxDimension = Math.max(...size.map(value => Math.abs(value)))
      if (!Number.isFinite(maxDimension)) continue

      return {
        bboxMin: bboxMin as [number, number, number],
        bboxMax: bboxMax as [number, number, number],
        size,
        maxDimension,
      }
    }

    return null
  }

  async function inspectAssetBounds(assetUrl: string) {
    const payload = await inspectStyleAsset(
      assetUrl,
      deps.readJsonPayload,
      'Asset bounds inspect',
    )
    if (!payload?.success) return null

    const reportedBounds = payload.analysis?.bounds
    if (
      reportedBounds?.size?.length === 3 &&
      Number.isFinite(Number(reportedBounds?.maxDimension))
    ) {
      return reportedBounds
    }

    const inspectReport = String(payload.analysis?.inspectReport ?? '')
    const parsedBounds = inspectReport
      ? parseBoundsFromInspectReport(inspectReport)
      : null
    if (parsedBounds) {
      deps.appendPipelineLog('Recovered asset bounds from inspect report', {
        assetUrl,
        parsedBounds,
      })
      return parsedBounds
    }

    return null
  }

  function getPrimitiveVisualSize(node: EditorSceneNode) {
    if (!node.primitive) return null
    const [sx, sy, sz] = node.scale
    const args = node.primitive.args
    switch (node.primitive.geometry) {
      case 'box': {
        const [width = 1, height = 1, depth = 1] = args
        return [
          Math.abs(width * sx),
          Math.abs(height * sy),
          Math.abs(depth * sz),
        ] as [number, number, number]
      }
      case 'cylinder': {
        const [radiusTop = 0.5, radiusBottom = 0.5, height = 1] = args
        const radius = Math.max(Math.abs(radiusTop), Math.abs(radiusBottom))
        return [
          Math.abs(radius * 2 * sx),
          Math.abs(height * sy),
          Math.abs(radius * 2 * sz),
        ] as [number, number, number]
      }
      case 'torus': {
        const [radius = 0.5, tube = 0.2] = args
        const outer = (Math.abs(radius) + Math.abs(tube)) * 2
        return [
          Math.abs(outer * sx),
          Math.abs(tube * 2 * sy),
          Math.abs(outer * sz),
        ] as [number, number, number]
      }
      case 'octahedron':
      case 'tetrahedron':
      case 'icosahedron':
      case 'dodecahedron': {
        const [radius = 0.5] = args
        return [
          Math.abs(radius * 2 * sx),
          Math.abs(radius * 2 * sy),
          Math.abs(radius * 2 * sz),
        ] as [number, number, number]
      }
      default:
        return null
    }
  }

  async function getSceneNodeVisualBounds(
    node: EditorSceneNode,
    sourceAssetUrl = '',
  ) {
    const localScale = [
      Math.abs(node.scale[0]),
      Math.abs(node.scale[1]),
      Math.abs(node.scale[2]),
    ] as [number, number, number]
    const prefabAssetUrl = getPrefabAssetUrl(
      node.prefab?.type,
      node.prefab?.variant,
    )
    const sourceBounds = sourceAssetUrl
      ? await inspectAssetBounds(sourceAssetUrl)
      : null

    if (sourceBounds?.size?.length === 3) {
      const sourceSize = [
        Math.abs(Number(sourceBounds.size[0] ?? 0)),
        Math.abs(Number(sourceBounds.size[1] ?? 0)),
        Math.abs(Number(sourceBounds.size[2] ?? 0)),
      ] as [number, number, number]
      const sourceMatchesExistingAsset = !!(
        (node.asset?.url && sourceAssetUrl === node.asset.url) ||
        (prefabAssetUrl && sourceAssetUrl === prefabAssetUrl)
      )
      const size = sourceMatchesExistingAsset
        ? ([
            sourceSize[0] * localScale[0],
            sourceSize[1] * localScale[1],
            sourceSize[2] * localScale[2],
          ] as [number, number, number])
        : sourceSize
      const maxDimension = Math.max(...size)
      if (Number.isFinite(maxDimension) && maxDimension > 0.0001) {
        return { size, maxDimension }
      }
    }

    if (node.generation?.sourceVisualSize?.length === 3) {
      const size = node.generation.sourceVisualSize
      return {
        size,
        maxDimension: Math.max(...size.map(value => Math.abs(value))),
      }
    }

    const object = getEditorObject(node.id)
    if (object) {
      object.updateWorldMatrix(true, true)
      const bounds = new THREE.Box3().setFromObject(object)
      if (!bounds.isEmpty()) {
        const size = bounds.getSize(new THREE.Vector3())
        const sizeVector = [
          Math.abs(size.x),
          Math.abs(size.y),
          Math.abs(size.z),
        ] as [number, number, number]
        const maxDimension = Math.max(...sizeVector)
        if (Number.isFinite(maxDimension) && maxDimension > 0.0001) {
          return { size: sizeVector, maxDimension }
        }
      }
    }

    const primitiveSize = getPrimitiveVisualSize(node)
    if (primitiveSize) {
      return { size: primitiveSize, maxDimension: Math.max(...primitiveSize) }
    }

    return { size: localScale, maxDimension: Math.max(...localScale) }
  }

  async function restoreLatestStyleWorkspaceForSelection(
    assetUrl: string,
    selectionKey: string,
    options?: { restorePromptFields?: boolean },
  ) {
    const restoreToken = ++state.styleWorkspaceRestoreToken

    try {
      const payload = await fetchLatestStyleWorkspace(
        assetUrl,
        deps.readJsonPayload,
      )

      if (
        restoreToken !== state.styleWorkspaceRestoreToken ||
        selectionKey !== state.styleSelectionKey
      )
        return false
      if (!payload?.success || !payload?.workspace) return false

      const workspace = payload.workspace
      state.styleWorkspaceManifestUrl = workspace.manifestUrl ?? ''
      state.styleWorkspaceSourceAssetUrl = workspace.sourceAssetUrl ?? ''
      state.styleGeneratedReferenceImageUrl =
        workspace.generatedReferenceImageUrl ?? ''
      state.styleReferenceImageUrl =
        workspace.referenceImageUrl || state.styleReferenceImageUrl
      if (options?.restorePromptFields) {
        state.styleProfileName =
          workspace.styleProfileName || state.styleProfileName
        state.stylePrompt = workspace.prompt || state.stylePrompt
        state.styleNegativePrompt =
          workspace.negativePrompt || state.styleNegativePrompt
        state.styleLoraNotes = workspace.loraNotes || state.styleLoraNotes
        state.styleControlNetNotes =
          workspace.controlNetNotes || state.styleControlNetNotes
      }
      state.styleStatus = `Restored the latest style workspace for ${deps.getSelectedNode()?.name ?? 'the selected asset'}.`
      return true
    } catch (error) {
      if (
        restoreToken !== state.styleWorkspaceRestoreToken ||
        selectionKey !== state.styleSelectionKey
      )
        return false
      console.error('Style workspace restore failed:', error)
      return false
    }
  }

  async function prepareStyleWorkspace() {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !deps.canUseStyleStudio(selectedNode)) {
      state.styleStatus =
        'Select a single geometry node to prepare a style workspace.'
      return false
    }

    state.styleBusy = true
    state.styleStatus = `Packaging ${selectedNode.name} into a style workspace…`
    deps.appendPipelineLog('Preparing style workspace', {
      nodeId: selectedNode.id,
      nodeName: selectedNode.name,
      workflowPath: state.selectedComfyWorkflowPath,
    })

    try {
      const source = await deps.ensureSceneNodeSourceAsset(selectedNode)
      const payload = await packageStyleWorkspace(
        {
          assetUrl: source.assetUrl,
          sourceName: selectedNode.name,
          styleProfileName: state.styleProfileName.trim(),
          prompt: state.stylePrompt.trim(),
          negativePrompt: state.styleNegativePrompt.trim(),
          loraNotes: state.styleLoraNotes.trim(),
          controlNetNotes: state.styleControlNetNotes.trim(),
          referenceImageUrl: state.styleReferenceImageUrl.trim(),
          comfyUiApiUrl: state.comfyUiApiUrl,
          comfyUiLowVramMode: !!state.comfyUiLowVramMode,
          hunyuanApiUrl: state.hunyuanApiUrl,
          generateReferenceIfMissing: true,
        },
        deps.readJsonPayload,
      )

      if (!payload?.success) {
        state.styleStatus =
          payload?.message ?? 'Style workspace generation failed.'
        return false
      }

      if (payload.referenceImageUrl) {
        state.styleReferenceImageUrl = payload.referenceImageUrl
      }

      state.styleWorkspaceManifestUrl = payload.manifestUrl ?? ''
      state.styleWorkspaceSourceAssetUrl = payload.sourceAssetUrl ?? ''
      state.styleGeneratedReferenceImageUrl =
        payload.generatedReferenceImageUrl ?? ''
      state.styleStatus = `Style workspace ready. Next step: use "Keep Shape, Bake New Style" to restyle ${selectedNode.name} without replacing its form.`
      state.saveMessage = `Style workspace prepared for ${selectedNode.name}`
      return true
    } catch (error) {
      console.error('Style workspace generation failed:', error)
      state.styleStatus =
        error instanceof Error
          ? error.message
          : 'Style workspace generation failed. Check ComfyUI and the editor API.'
      return false
    } finally {
      state.styleBusy = false
    }
  }

  async function ensureStyleWorkspaceReady() {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !deps.canUseStyleStudio(selectedNode)) {
      state.styleStatus =
        'Select a single geometry node before running a style bake.'
      return false
    }

    if (state.styleWorkspaceManifestUrl.trim()) {
      return true
    }

    if (selectedNode.asset?.url) {
      const restored = await restoreLatestStyleWorkspaceForSelection(
        selectedNode.asset.url,
        selectedNode.id,
      )
      if (restored && state.styleWorkspaceManifestUrl.trim()) {
        return true
      }
    }

    return prepareStyleWorkspace()
  }

  async function simplifySelectedAssetForStyle() {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !deps.canUseStyleStudio(selectedNode)) {
      state.styleStatus = 'Select a single geometry node before simplifying.'
      return
    }

    state.styleBusy = true
    state.styleStatus = `Simplifying ${selectedNode.name}…`

    try {
      const source = await deps.ensureSceneNodeSourceAsset(selectedNode)
      const payload = await simplifyStyleAsset(
        {
          assetUrl: source.assetUrl,
          outputName: `${selectedNode.name}-style`,
          ratio: state.styleSimplifyRatio,
          error: state.styleSimplifyError,
          lockBorder: true,
        },
        deps.readJsonPayload,
      )

      if (!payload?.success) {
        state.styleStatus = payload?.message ?? 'Mesh simplification failed.'
        return
      }

      state.styleSimplifiedAssetUrl = payload.assetUrl ?? ''
      state.styleInspectReport =
        payload.inspectReport ?? state.styleInspectReport
      state.styleStatus =
        'Low-poly variant created. Review the generated asset or use it as the source for Blender cleanup.'
      state.saveMessage = `Simplified asset created: ${payload.assetUrl}`
      await deps.refreshGeneratedAssetLibrary(payload.assetUrl)
    } catch (error) {
      console.error('Style simplify failed:', error)
      state.styleStatus =
        error instanceof Error
          ? error.message
          : 'Mesh simplification failed. Check the local editor API.'
    } finally {
      state.styleBusy = false
    }
  }

  async function bakeSelectedAssetProceduralStyle() {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !deps.canUseStyleStudio(selectedNode)) {
      state.styleStatus =
        'Select a single geometry node before running a procedural style bake.'
      return
    }

    const bakeBackend = state.styleBakeBackend
    state.styleBusy = true
    state.styleStatus =
      bakeBackend === 'blender-geometry'
        ? `Baking Blender geometry style for ${selectedNode.name}...`
        : `Baking procedural style preview for ${selectedNode.name}...`
    state.styleBakeLastError = ''
    deps.appendPipelineLog('Starting style bake', {
      nodeId: selectedNode.id,
      nodeName: selectedNode.name,
      backend: bakeBackend,
      styleProfileName: state.styleProfileName,
    })

    try {
      const descriptor = deps.getDefaultStyleDescriptor(selectedNode)
      const styleBakeSettings = buildProceduralStyleBakeSettings({
        styleProfileName: state.styleProfileName,
        prompt: state.stylePrompt,
        fallbackPrompt: descriptor,
        textureSize: state.styleBakeTextureSize,
        lineStrength: state.styleBakeLineStrength,
        brushStrength: state.styleBakeBrushStrength,
        aoStrength: state.styleBakeAoStrength,
        cavityStrength: state.styleBakeCavityStrength,
        curvatureStrength: state.styleBakeCurvatureStrength,
        geometrySimplification: state.styleBakeGeometrySimplification,
        outputTier: state.styleBakeOutputTier,
      })
      const styleBakeManager = getStyleBakeManager()
      const result =
        bakeBackend === 'blender-geometry'
          ? await styleBakeManager.bakeBlenderGeometryStyleForNode(
              selectedNode,
              styleBakeSettings,
              { force: !!state.styleBakeForceRefresh },
            )
          : await styleBakeManager.bakeProceduralStyleForNode(
              selectedNode,
              styleBakeSettings,
              { force: !!state.styleBakeForceRefresh },
            )

      state.styleBakedAssetUrl = result.product.assetUrl
      state.styleBakeCurrentSourceAssetUrl = result.product.source.assetUrl
      state.styleBakeProduct = result.product
      state.styleBakeProductStatus = 'dirty'
      state.styleBakePreviewSnapshot = createStyleBakePreviewSnapshot(
        selectedNode,
        result.product.assetUrl,
      )
      state.styleBakeLastSuccessfulAt = result.product.generatedAt
      state.styleBakeCanApply = true
      state.styleBakeCanRevert = true
      state.hunyuanLastFitReport = result.fitReport
      state.styleInspectReport =
        result.inspectReport ?? state.styleInspectReport
      state.styleStatus = result.cached
        ? 'Clean style bake cache reused. Preview is applied in the editor; apply to save it or revert to the previous asset.'
        : bakeBackend === 'blender-geometry'
          ? 'Blender geometry style bake finished. Preview is applied in the editor; apply to save it or revert to the previous asset.'
          : 'Procedural style bake finished. Preview is applied in the editor; apply to save it or revert to the previous asset.'
      state.saveMessage = state.styleStatus
      state.selectedGeneratedVariantUrl = result.product.assetUrl
    } catch (error) {
      console.error('Style bake failed:', error)
      state.styleBakeLastError =
        error instanceof Error
          ? error.message
          : 'Style bake failed. Check the local editor API.'
      state.styleBakeProductStatus = 'failed'
      state.styleStatus = state.styleBakeLastError
      state.saveMessage = state.styleStatus
    } finally {
      state.styleBusy = false
    }
  }

  async function applyStyleBakePreviewForSelection() {
    const product = state.styleBakeProduct as EditorStyleBakeProduct | null
    const snapshot = state.styleBakePreviewSnapshot as
      | EditorStyleBakePreviewSnapshot
      | null
      | undefined
    const previewNode = getStyleBakePreviewNode(snapshot)

    if (!product?.assetUrl || !state.styleBakeCanApply || !snapshot) {
      state.styleStatus = 'Run a selected-object style bake before applying.'
      return
    }

    if (isStyleBakeProductDirtyForCurrentControls(product)) {
      state.styleBakeProductStatus = 'dirty'
      state.styleBakeLastError =
        'Bake settings changed after this preview was generated. Re-run the bake before applying.'
      state.styleStatus = state.styleBakeLastError
      state.saveMessage = state.styleStatus
      return
    }

    if (
      !previewNode ||
      snapshot.previewAssetUrl !== product.assetUrl ||
      getStyleBakeNodeAssetUrl(previewNode) !== product.assetUrl
    ) {
      state.styleBakeProductStatus = 'dirty'
      state.styleBakeLastError =
        'The preview asset no longer matches the current node. Re-run or revert before applying.'
      state.styleStatus = state.styleBakeLastError
      state.saveMessage = state.styleStatus
      return
    }

    state.styleBusy = true
    state.styleStatus = 'Applying style bake preview to the scene document...'
    try {
      await deps.saveSceneDocumentToDisk(deps.getActiveSceneLevelId())
      state.styleBakeProductStatus = 'clean'
      state.styleBakeCanApply = false
      state.styleBakeLastError = ''
      state.styleStatus = `Applied style bake product ${state.styleBakeProduct.assetUrl}.`
      state.saveMessage = state.styleStatus
    } catch (error) {
      state.styleBakeLastError =
        error instanceof Error
          ? error.message
          : 'Could not save the style bake preview.'
      state.styleBakeProductStatus = 'failed'
      state.styleStatus = state.styleBakeLastError
      state.saveMessage = state.styleStatus
    } finally {
      state.styleBusy = false
    }
  }

  function revertStyleBakePreviewForSelection() {
    const snapshot = state.styleBakePreviewSnapshot as
      | EditorStyleBakePreviewSnapshot
      | null
      | undefined
    if (!snapshot || !state.styleBakeCanRevert) {
      state.styleStatus = 'No style bake preview is available to revert.'
      return
    }

    const previewNode = getStyleBakePreviewNode(snapshot)
    if (
      !previewNode ||
      getStyleBakeNodeAssetUrl(previewNode) !== snapshot.previewAssetUrl
    ) {
      state.styleBakeProductStatus = 'dirty'
      state.styleBakeLastError =
        'The preview asset no longer matches the current node. Revert was skipped to avoid overwriting later edits.'
      state.styleBakeCanApply = false
      state.styleBakeCanRevert = false
      state.styleBakePreviewSnapshot = null
      state.styleStatus = state.styleBakeLastError
      state.saveMessage = state.styleStatus
      return
    }

    deps.patchNode(snapshot.nodeId, {
      kind: snapshot.previousKind,
      asset: snapshot.previousAsset,
      prefab: snapshot.previousPrefab,
      primitive: snapshot.previousPrimitive,
      scale: snapshot.previousScale,
      generation: snapshot.previousGeneration,
    })
    state.styleBakeProductStatus = 'missing'
    state.styleBakeCanApply = false
    state.styleBakeCanRevert = false
    state.styleBakePreviewSnapshot = null
    state.styleStatus = 'Reverted the style bake preview to the previous asset.'
    state.saveMessage = state.styleStatus
  }

  async function exportSelectedAssetForBlender(options?: {
    openInBlender?: boolean
  }) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !deps.canUseStyleStudio(selectedNode)) {
      state.styleStatus =
        'Select a single geometry node before exporting to Blender.'
      return
    }

    state.styleBusy = true
    state.styleStatus = `Exporting ${selectedNode.name} for Blender…`

    try {
      const source = await deps.ensureSceneNodeSourceAsset(selectedNode)
      const payload = await exportStyleAssetForBlender(
        {
          assetUrl: source.assetUrl,
          exportName: selectedNode.name,
          referenceImageUrl: state.styleReferenceImageUrl.trim(),
          openInBlender: options?.openInBlender ?? false,
        },
        deps.readJsonPayload,
      )

      if (!payload?.success) {
        state.styleStatus = payload?.message ?? 'Blender export failed.'
        return
      }

      state.styleBlenderExportPath =
        payload.exportedGlbPath ?? payload.exportDirectory ?? ''
      state.styleBlenderOpenCommand = payload.openCommand ?? ''
      state.styleStatus =
        'Blender package ready. Open the exported GLB for manual line work, mesh cleanup, or painted texture passes.'
    } catch (error) {
      console.error('Blender export failed:', error)
      state.styleStatus =
        error instanceof Error
          ? error.message
          : 'Blender export failed. Check the local editor API.'
    } finally {
      state.styleBusy = false
    }
  }

  async function reimportLatestBlenderOutputForSelection() {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !deps.canUseStyleStudio(selectedNode)) {
      state.styleStatus =
        'Select a single geometry node before reimporting from Blender.'
      return
    }

    state.styleBusy = true
    state.styleStatus = `Reimporting the latest Blender output for ${selectedNode.name}…`

    try {
      const source = await deps.ensureSceneNodeSourceAsset(selectedNode)
      const payload = await reimportStyleAssetFromBlender(
        {
          sourceAssetUrl: source.assetUrl,
          exportPath: state.styleBlenderExportPath.trim(),
          nodeName: selectedNode.name,
        },
        deps.readJsonPayload,
      )

      if (!payload?.success || !payload.assetUrl) {
        state.styleStatus = payload?.message ?? 'Blender reimport failed.'
        return
      }

      deps.patchNode(selectedNode.id, {
        kind: 'asset',
        asset: { url: payload.assetUrl },
        prefab: undefined,
        primitive: undefined,
        generation: {
          ...(selectedNode.generation ?? {}),
          lastBakedAssetUrl: payload.assetUrl,
          lastBakedAt: new Date().toISOString(),
        },
      })
      state.styleBlenderExportPath =
        payload.exportedGlbPath ?? state.styleBlenderExportPath
      state.styleStatus =
        payload.message ?? 'Reimported the latest Blender output.'
      state.saveMessage = state.styleStatus
      await deps.saveSceneDocumentToDisk(deps.getActiveSceneLevelId())
      void deps.inspectSelectedAssetForHunyuan(
        payload.assetUrl,
        selectedNode.id,
      )
      state.selectedGeneratedVariantUrl = payload.assetUrl
    } catch (error) {
      console.error('Blender reimport failed:', error)
      state.styleStatus =
        error instanceof Error
          ? error.message
          : 'Blender reimport failed. Check the local editor API.'
      state.saveMessage = state.styleStatus
    } finally {
      state.styleBusy = false
    }
  }

  async function runStyleBake(mode: 'generate' | 'texture') {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !deps.canUseStyleStudio(selectedNode)) {
      state.styleStatus =
        'Select a single geometry node before running AI style bake.'
      return
    }

    if (!state.stylePrompt.trim() && !state.styleReferenceImageUrl.trim()) {
      state.styleStatus =
        'Enter a style prompt or reference image before running the AI bake.'
      return
    }

    const workspaceReady = await ensureStyleWorkspaceReady()
    if (!workspaceReady) {
      return
    }

    state.hunyuanPrompt = buildNodeStylePrompt(selectedNode)
    state.hunyuanReferenceImageUrl = state.styleReferenceImageUrl.trim()
    const previousOutputUrl = state.hunyuanLastOutputUrl
    state.styleStatus =
      mode === 'texture'
        ? `Submitting a texture-only style bake for ${selectedNode.name}…`
        : `Submitting a mesh-replacement AI generation for ${selectedNode.name}…`
    await deps.runHunyuanForSelection(mode)
    state.styleStatus =
      state.hunyuanLastOutputUrl &&
      state.hunyuanLastOutputUrl !== previousOutputUrl
        ? mode === 'texture'
          ? 'Style bake finished. The selected node now points to a newly styled asset.'
          : 'Mesh replacement finished. The selected node now points to a new AI-generated asset variant.'
        : state.hunyuanStatus
  }

  async function applyStyleBatchEntryResult(
    entry: PersistedStyleBatchEntry,
    assetUrl: string,
  ) {
    const node = deps
      .getEditorNodes()
      .find(candidate => candidate.id === entry.nodeId)
    if (!node) {
      throw new Error(`Could not find ${entry.nodeName} in the current scene.`)
    }

    const applicationResult = await applyGeneratedAssetToNode(
      {
        getSceneNodeVisualBounds,
        inspectGeneratedAssetBounds: inspectAssetBounds,
        patchNode: deps.patchNode,
        appendPipelineLog: deps.appendPipelineLog,
        getNodeTransformSnapshot,
      },
      node,
      assetUrl,
      {
        sourceAssetUrl: entry.sourceAssetUrl,
        descriptor: entry.descriptor,
        logMessage: 'Applied style batch result with preserved transform',
      },
    )
    state.hunyuanLastFitReport = applicationResult.fitReport

    const scene = deps.getCurrentScene()
    if (scene && typeof window !== 'undefined') {
      saveEditorSceneToLocalStorage(deps.getActiveSceneLevelId(), scene)
    }
  }

  async function queueStyleBatchEntryJob(
    session: PersistedStyleBatchSession,
    entry: PersistedStyleBatchEntry,
    node: EditorSceneNode,
    prompt: string,
  ) {
    state.styleBatchStatus =
      session.mode === 'texture'
        ? `Baking style onto ${entry.nodeName}…`
        : `Reimagining ${entry.nodeName}…`
    setStyleBatchNodeStatus(entry.nodeId, 'Preparing source asset…')

    const source = await deps.ensureSceneNodeSourceAsset(node)
    const workspacePayload = await packageStyleWorkspace(
      {
        assetUrl: source.assetUrl,
        sourceName: node.name,
        styleProfileName: session.styleProfileName.trim(),
        prompt,
        negativePrompt: session.styleNegativePrompt.trim(),
        loraNotes: session.styleLoraNotes.trim(),
        controlNetNotes: session.styleControlNetNotes.trim(),
        referenceImageUrl: session.styleReferenceImageUrl.trim(),
        comfyUiApiUrl: session.comfyUiApiUrl,
        comfyUiLowVramMode:
          session.comfyUiLowVramMode ?? !!state.comfyUiLowVramMode,
        hunyuanApiUrl: session.hunyuanApiUrl,
        generateReferenceIfMissing: true,
      },
      deps.readJsonPayload,
    )
    if (!workspacePayload?.success) {
      throw new Error(
        workspacePayload?.message ??
          `Could not package a style workspace for ${entry.nodeName}.`,
      )
    }

    const resolvedWorkspaceReferenceImageUrl =
      (entry.workspaceReferenceImageUrl ||
        workspacePayload.referenceImageUrl ||
        workspacePayload.generatedReferenceImageUrl ||
        session.styleReferenceImageUrl.trim()) as string

    const queuedJob = await deps.queueHunyuanJob({
      apiUrl: session.hunyuanApiUrl,
      comfyUiApiUrl: session.comfyUiApiUrl,
      assetUrl: source.assetUrl,
      sourceName: entry.sourceName,
      mode: session.mode,
      prompt,
      referenceImageUrl: resolvedWorkspaceReferenceImageUrl,
      workflowPath: session.workflowPath,
      comfyUiLowVramMode:
        session.comfyUiLowVramMode ?? !!state.comfyUiLowVramMode,
    })

    state.selectedHunyuanJobId = queuedJob.id
    markStyleBatchEntry(
      entry,
      {
        sourceAssetUrl: source.assetUrl,
        workspaceReferenceImageUrl: resolvedWorkspaceReferenceImageUrl,
        jobId: queuedJob.id,
        status: 'queued',
        error: undefined,
      },
      'Queued in ComfyUI + Hunyuan…',
    )

    return source.assetUrl
  }

  function getProceduralStyleBatchCandidateIds(
    scope: EditorStyleBakeBatchScope,
  ) {
    if (scope === 'selected-objects') {
      const selectedNodes = deps.getSelectedNodes()
      const nodes =
        selectedNodes.length > 0
          ? selectedNodes
          : deps.getSelectedNode()
            ? [deps.getSelectedNode() as EditorSceneNode]
            : []
      return nodes.filter(node => canBakeSceneNode(node)).map(node => node.id)
    }

    if (scope === 'visible') {
      return deps
        .getEditorNodes()
        .filter(node => node.visible !== false && canBakeSceneNode(node))
        .map(node => node.id)
    }

    if (scope === 'level') {
      return deps
        .getEditorNodes()
        .filter(node => canBakeSceneNode(node))
        .map(node => node.id)
    }

    return state.styleBatchSelectionIds.filter((id: string) =>
      deps.getStyleSceneCandidates().some(candidate => candidate.id === id),
    )
  }

  async function runDeterministicStyleBatchEntry(
    session: PersistedStyleBatchSession,
    entry: PersistedStyleBatchEntry,
    node: EditorSceneNode,
  ) {
    const isBlenderBatch = session.mode === 'blender-geometry'
    const descriptor = entry.descriptor || deps.getDefaultStyleDescriptor(node)
    const settings = buildProceduralStyleBakeSettings({
      styleProfileName: session.styleProfileName,
      prompt: session.stylePrompt,
      fallbackPrompt: descriptor,
      textureSize: state.styleBakeTextureSize,
      lineStrength: state.styleBakeLineStrength,
      brushStrength: state.styleBakeBrushStrength,
      aoStrength: state.styleBakeAoStrength,
      cavityStrength: state.styleBakeCavityStrength,
      curvatureStrength: state.styleBakeCurvatureStrength,
      geometrySimplification: state.styleBakeGeometrySimplification,
      outputTier: state.styleBakeOutputTier,
    })

    markStyleBatchEntry(
      entry,
      { status: 'running', error: undefined },
      session.force
        ? `Baking ${getStyleBatchModeLabel(session.mode)} with cache refresh…`
        : `Checking ${getStyleBatchModeLabel(session.mode)} cache…`,
    )

    const styleBakeManager = getStyleBakeManager()
    const result = isBlenderBatch
      ? await styleBakeManager.bakeBlenderGeometryStyleForNode(node, settings, {
          force: !!session.force,
        })
      : await styleBakeManager.bakeProceduralStyleForNode(node, settings, {
          force: !!session.force,
        })

    markStyleBatchEntry(entry, {
      sourceAssetUrl: result.product.source.assetUrl,
      sourceAssetFingerprint: result.product.source.assetFingerprint,
      settingsFingerprint: result.product.settingsFingerprint,
      cacheKey: result.product.cacheKey,
      outputAssetUrl: result.product.assetUrl,
      metadataUrl: result.product.metadataUrl,
      cached: result.cached,
      status: 'succeeded',
      error: undefined,
    })

    state.hunyuanLastFitReport = result.fitReport
    state.styleBakedAssetUrl = result.product.assetUrl
    state.selectedGeneratedVariantUrl = result.product.assetUrl
    state.styleInspectReport = result.inspectReport ?? state.styleInspectReport

    markStyleBatchEntry(
      entry,
      {
        outputAssetUrl: result.product.assetUrl,
        metadataUrl: result.product.metadataUrl,
        cached: result.cached,
        status: 'applied',
      },
      result.cached
        ? `Reused clean cached product ${result.product.assetUrl}.`
        : `Finished. Scene now uses ${result.product.assetUrl}.`,
    )

    const scene = deps.getCurrentScene()
    if (scene && typeof window !== 'undefined') {
      saveEditorSceneToLocalStorage(deps.getActiveSceneLevelId(), scene)
    }
  }

  async function resumeStyleBatchSession(session: PersistedStyleBatchSession) {
    state.styleBatchBusy = true
    state.styleBatchAbortRequested = false
    state.styleBatchStopIntent = null
    persistStyleBatchSession(session)
    state.styleBatchStatus = `Resuming ${getStyleBatchModeLabel(session.mode)} batch for ${session.entries.length} scene object${session.entries.length === 1 ? '' : 's'}…`
    state.styleBatchSelectionIds = session.entries.map(entry => entry.nodeId)
    state.styleProfileName = session.styleProfileName
    state.stylePrompt = session.stylePrompt
    state.styleNegativePrompt = session.styleNegativePrompt
    state.styleLoraNotes = session.styleLoraNotes
    state.styleControlNetNotes = session.styleControlNetNotes
    state.styleReferenceImageUrl = session.styleReferenceImageUrl
    state.comfyUiLowVramMode =
      session.comfyUiLowVramMode ?? !!state.comfyUiLowVramMode

    try {
      for (const entry of session.entries) {
        if (state.styleBatchAbortRequested) {
          throw new Error(
            state.styleBatchStopIntent === 'pause'
              ? 'Scene style batch paused by user.'
              : 'Scene style batch cancelled by user. Reload disk to revert any unapplied local changes.',
          )
        }

        if (entry.status === 'applied') {
          setStyleBatchNodeStatus(
            entry.nodeId,
            `Finished. Scene now uses ${entry.outputAssetUrl ?? 'the generated asset'}.`,
          )
          continue
        }

        if (entry.status === 'failed') {
          setStyleBatchNodeStatus(
            entry.nodeId,
            entry.error ||
              'This batch item failed earlier and was not resumed.',
          )
          continue
        }

        const node = deps
          .getEditorNodes()
          .find(candidate => candidate.id === entry.nodeId)
        if (!node || !canBakeSceneNode(node)) {
          const message = `Skipped ${entry.nodeName}; the node is missing or no longer geometry-backed.`
          markStyleBatchEntry(
            entry,
            { status: 'failed', error: message },
            message,
          )
          continue
        }

        try {
          if (
            session.mode === 'procedural-material' ||
            session.mode === 'blender-geometry'
          ) {
            await runDeterministicStyleBatchEntry(session, entry, node)
            continue
          }

          const prompt = buildNodeStylePrompt(node)
          let sourceAssetUrl = entry.sourceAssetUrl ?? ''

          if (!entry.jobId && entry.status === 'pending') {
            sourceAssetUrl = await queueStyleBatchEntryJob(
              session,
              entry,
              node,
              prompt,
            )
          }

          if (!entry.jobId) {
            throw new Error(`Missing queued job id for ${entry.nodeName}.`)
          }

          const payload = await deps.waitForQueuedHunyuanJob(entry.jobId, {
            onQueued: () => {
              markStyleBatchEntry(
                entry,
                { status: 'queued' },
                'Queued in ComfyUI + Hunyuan…',
              )
            },
            onRunning: () => {
              markStyleBatchEntry(
                entry,
                { status: 'running' },
                'Generating with ComfyUI + Hunyuan…',
              )
            },
          })

          markStyleBatchEntry(entry, {
            sourceAssetUrl: sourceAssetUrl || entry.sourceAssetUrl,
            outputAssetUrl: payload.assetUrl,
            status: 'succeeded',
            error: undefined,
          })

          await applyStyleBatchEntryResult(entry, payload.assetUrl)

          markStyleBatchEntry(
            entry,
            {
              outputAssetUrl: payload.assetUrl,
              status: 'applied',
            },
            `Finished. Scene now uses ${payload.assetUrl}.`,
          )
        } catch (entryError) {
          if (state.styleBatchStopIntent) {
            throw entryError
          }
          const message =
            entryError instanceof Error
              ? entryError.message
              : `Style batch failed for ${entry.nodeName}.`
          markStyleBatchEntry(
            entry,
            { status: 'failed', error: message },
            message,
          )
          deps.appendPipelineLog('Style batch entry failed', {
            nodeId: entry.nodeId,
            nodeName: entry.nodeName,
            message,
          })
        }
      }

      await completeStyleBatchSession(session)
    } catch (error) {
      console.error('Scene style batch failed:', error)
      handleStyleBatchSessionError(error)
    } finally {
      state.hunyuanActiveJobId = ''
      state.styleBatchBusy = false
      state.styleBatchResumePromise = null
      state.styleBatchStopIntent = null
    }
  }

  async function runStyleBatch(mode: 'texture' | 'generate') {
    const candidateIds = state.styleBatchSelectionIds.filter((id: string) =>
      deps.getStyleSceneCandidates().some(candidate => candidate.id === id),
    )
    deps.appendPipelineLog('Starting style batch request', {
      mode,
      candidateCount: candidateIds.length,
      workflowPath: state.selectedComfyWorkflowPath,
      styleProfileName: state.styleProfileName,
      stylePrompt: state.stylePrompt,
    })
    if (candidateIds.length === 0) {
      state.styleBatchStatus =
        'Select at least one scene object before running a scene batch.'
      return
    }

    await deps.refreshHunyuanServiceStatus(true)
    if (mode === 'generate' && !state.hunyuanBackendCanGenerate) {
      state.styleBatchStatus =
        state.hunyuanBackendStatus ||
        'Mesh reimagine is unavailable because the AI backend is not ready.'
      return
    }
    if (mode === 'texture' && !state.hunyuanBackendCanRetexture) {
      state.styleBatchStatus =
        state.hunyuanBackendStatus ||
        'Texture style bake is unavailable because the AI backend is not ready.'
      return
    }

    if (mode === 'generate' && !state.stylePrompt.trim()) {
      state.styleBatchStatus =
        'Write the shared style brief before running a full mesh scene reimagine.'
      return
    }

    if (
      mode === 'texture' &&
      !state.stylePrompt.trim() &&
      !state.styleReferenceImageUrl.trim()
    ) {
      state.styleBatchStatus =
        'Texture-only batch needs a shared style brief or a reference image.'
      return
    }

    state.styleBatchNodeStatusById = Object.fromEntries(
      candidateIds.map((id: string) => [id, 'Queued for style regeneration.']),
    )
    state.styleBatchStatus =
      mode === 'generate'
        ? `Preflighting and queueing ${candidateIds.length} scene object${candidateIds.length === 1 ? '' : 's'} for mesh reimagine…`
        : `Preflighting and queueing ${candidateIds.length} scene object${candidateIds.length === 1 ? '' : 's'} for texture style bake…`
    const session = createStyleBatchSession(mode, candidateIds)
    persistStyleBatchSession(session)
    state.styleBatchResumePromise = resumeStyleBatchSession(session)
    await state.styleBatchResumePromise
  }

  async function runProceduralStyleBatch(
    scope: EditorStyleBakeBatchScope,
    options: EditorStyleBakeRunOptions = {},
  ) {
    const batchMode =
      state.styleBakeBackend === 'blender-geometry'
        ? 'blender-geometry'
        : 'procedural-material'
    const candidateIds = getProceduralStyleBatchCandidateIds(scope)
    deps.appendPipelineLog('Starting deterministic style bake batch request', {
      scope,
      backend: batchMode,
      force: !!options.force,
      candidateCount: candidateIds.length,
      styleProfileName: state.styleProfileName,
      stylePrompt: state.stylePrompt,
    })

    if (candidateIds.length === 0) {
      state.styleBatchStatus =
        scope === 'selected-objects'
          ? 'Select one or more geometry-backed objects before baking the selected scope.'
          : 'No bakeable scene objects were found for this scope.'
      return
    }

    state.styleBatchNodeStatusById = Object.fromEntries(
      candidateIds.map((id: string) => [
        id,
        options.force
          ? `Queued for ${getStyleBatchModeLabel(batchMode)} cache refresh.`
          : `Queued for ${getStyleBatchModeLabel(batchMode)} cache check.`,
      ]),
    )
    state.styleBatchStatus = `Preflighting ${candidateIds.length} object${candidateIds.length === 1 ? '' : 's'} for ${getStyleBatchModeLabel(batchMode)} (${scope.replace('-', ' ')}).`
    const session = createStyleBatchSession(batchMode, candidateIds, {
      scope,
      force: !!options.force,
    })
    persistStyleBatchSession(session)
    state.styleBatchResumePromise = resumeStyleBatchSession(session)
    await state.styleBatchResumePromise
  }

  return {
    buildNodeStylePrompt,
    getNodeTransformSnapshot,
    inspectAssetBounds,
    getSceneNodeVisualBounds,
    pauseActiveHunyuanJobs,
    cancelActiveHunyuanJobs,
    persistStyleBatchSession,
    updatePersistedStyleBatchSession,
    createStyleBatchSession,
    resumePendingStyleBatchSession,
    discardPendingStyleBatchSession,
    inspectSelectedAssetForStyle,
    prepareStyleWorkspace,
    ensureStyleWorkspaceReady,
    simplifySelectedAssetForStyle,
    bakeSelectedAssetProceduralStyle,
    applyStyleBakePreviewForSelection,
    revertStyleBakePreviewForSelection,
    exportSelectedAssetForBlender,
    reimportLatestBlenderOutputForSelection,
    runStyleBake,
    applyStyleBatchEntryResult,
    resumeStyleBatchSession,
    runStyleBatch,
    runProceduralStyleBatch,
    restoreLatestStyleWorkspaceForSelection,
  }
}
