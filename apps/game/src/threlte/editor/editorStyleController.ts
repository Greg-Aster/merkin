import * as THREE from 'three'
import { canBakeSceneNode, getPrefabAssetUrl } from './editorBakeSource'
import { getEditorObject } from './editorRegistry'
import {
  clearStyleBatchSessionFromLocalStorage,
  saveEditorSceneToLocalStorage,
  saveStyleBatchSessionToLocalStorage,
  type PersistedStyleBatchEntry,
  type PersistedStyleBatchSession,
} from './editorPersistence'
import type { EditorSceneNode } from './editorStore'
import { EDITOR_API_BASE } from '@config/editorApi'

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
  ensureSceneNodeSourceAsset: (node: EditorSceneNode) => Promise<{ assetUrl: string, sourceName: string }>
  readJsonPayload: (response: Response, context: string) => Promise<any>
  appendPipelineLog: (message: string, detail?: unknown) => void
  refreshGeneratedAssetLibrary: (selectAssetUrl?: string) => Promise<void>
  inspectSelectedAssetForHunyuan: (assetUrl: string, selectionKey: string) => Promise<void>
  saveSceneDocumentToDisk: (levelId: string) => Promise<any>
  getCurrentScene: () => any
  patchNode: (nodeId: string, patch: Record<string, any>) => void
  queueHunyuanJob: (requestBody: Record<string, unknown>) => Promise<any>
  waitForQueuedHunyuanJob: (jobId: string, options?: { onQueued?: (job: any) => void, onRunning?: (job: any) => void }) => Promise<any>
  refreshHunyuanServiceStatus: (ensure?: boolean) => Promise<void>
  refreshHunyuanRecentJobs: () => Promise<void>
  runHunyuanForSelection: (mode: 'generate' | 'texture') => Promise<void>
}

export function createEditorStyleController(deps: EditorStyleControllerDeps) {
  const state = deps.state

  function buildNodeStylePrompt(node: EditorSceneNode) {
    const descriptor = deps.getDefaultStyleDescriptor(node)
    const promptSegments = [
      descriptor ? `object: ${descriptor}` : '',
      'preserve the object identity and overall silhouette; do not turn it into a different object class',
      state.styleProfileName.trim() ? `style family: ${state.styleProfileName.trim()}` : '',
      state.stylePrompt.trim() ? `style treatment: ${state.stylePrompt.trim()}` : '',
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

  function resetQueuedStyleBatchEntriesForResume(session: PersistedStyleBatchSession) {
    return {
      ...session,
      entries: session.entries.map((entry) => (
        entry.status === 'queued' || entry.status === 'running'
          ? {
            ...entry,
            jobId: undefined,
            status: 'pending' as const,
            error: undefined,
          }
          : entry
      )),
    } satisfies PersistedStyleBatchSession
  }

  function persistStyleBatchSession(session: PersistedStyleBatchSession | null) {
    state.styleBatchSession = session
    if (typeof window === 'undefined') return null

    if (session) {
      return saveStyleBatchSessionToLocalStorage(deps.getActiveSceneLevelId(), session)
    }

    clearStyleBatchSessionFromLocalStorage(deps.getActiveSceneLevelId())
    return null
  }

  function updatePersistedStyleBatchSession(mutator: (session: PersistedStyleBatchSession) => PersistedStyleBatchSession) {
    if (!state.styleBatchSession) return null
    const next = mutator(structuredClone(state.styleBatchSession) as PersistedStyleBatchSession)
    persistStyleBatchSession(next)
    return next
  }

  function createStyleBatchSession(mode: 'texture' | 'generate', candidateIds: string[]) {
    const entries: PersistedStyleBatchEntry[] = candidateIds
      .map((nodeId) => deps.getEditorNodes().find((node) => node.id === nodeId))
      .filter((node): node is EditorSceneNode => !!node && canBakeSceneNode(node))
      .map((node) => ({
        nodeId: node.id,
        nodeName: node.name,
        descriptor: deps.getDefaultStyleDescriptor(node),
        mode,
        sourceName: deps.getAiSourceName(node),
        status: 'pending',
      }))

    return {
      levelId: deps.getActiveSceneLevelId(),
      mode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      styleProfileName: state.styleProfileName,
      stylePrompt: state.stylePrompt,
      styleNegativePrompt: state.styleNegativePrompt,
      styleLoraNotes: state.styleLoraNotes,
      styleControlNetNotes: state.styleControlNetNotes,
      styleReferenceImageUrl: state.styleReferenceImageUrl,
      comfyUiApiUrl: state.comfyUiApiUrl,
      hunyuanApiUrl: state.hunyuanApiUrl,
      workflowPath: state.selectedComfyWorkflowPath,
      entries,
    } satisfies PersistedStyleBatchSession
  }

  async function pauseActiveHunyuanJobs() {
    state.styleBatchAbortRequested = true
    state.styleBatchStopIntent = 'pause'
    state.styleBatchStatus = 'Pause requested. Interrupting queued and active AI jobs while preserving resume state…'
    deps.appendPipelineLog('Pausing active Hunyuan jobs')

    const pausedSession = state.styleBatchSession
      ? persistStyleBatchSession(resetQueuedStyleBatchEntriesForResume(state.styleBatchSession))
      : null
    state.styleBatchResumePromise = null
    state.styleBatchPendingResume = pausedSession

    const scene = deps.getCurrentScene()
    if (scene && typeof window !== 'undefined') {
      saveEditorSceneToLocalStorage(deps.getActiveSceneLevelId(), scene)
    }

    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/hunyuan3d/jobs/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      const payload = await deps.readJsonPayload(response, 'Hunyuan pause')
      state.styleBatchStatus = `${payload?.message ?? 'Pause requested.'} Resume remains available from the saved batch session.`
      state.saveMessage = `${state.styleBatchStatus} Local scene state was checkpointed.`
      void deps.refreshHunyuanRecentJobs()
    } catch (error) {
      state.styleBatchStatus = error instanceof Error ? error.message : 'Failed to pause AI jobs.'
      state.saveMessage = state.styleBatchStatus
    }
  }

  async function cancelActiveHunyuanJobs() {
    state.styleBatchAbortRequested = true
    state.styleBatchStopIntent = 'cancel'
    state.styleBatchStatus = 'Cancellation requested. Interrupting queued and active AI jobs…'
    deps.appendPipelineLog('Cancelling active Hunyuan jobs')

    const scene = deps.getCurrentScene()
    if (scene && typeof window !== 'undefined') {
      saveEditorSceneToLocalStorage(deps.getActiveSceneLevelId(), scene)
    }
    persistStyleBatchSession(null)
    state.styleBatchResumePromise = null
    state.styleBatchPendingResume = null

    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/hunyuan3d/jobs/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      const payload = await deps.readJsonPayload(response, 'Hunyuan cancel')
      state.styleBatchStatus = `${payload?.message ?? 'Cancellation requested.'} Auto-resume has been cleared.`
      state.styleBatchNodeStatusById = {}
      state.saveMessage = `${state.styleBatchStatus} Local scene state was checkpointed.`
      void deps.refreshHunyuanRecentJobs()
    } catch (error) {
      state.styleBatchStatus = error instanceof Error ? error.message : 'Failed to cancel AI jobs.'
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
    deps.appendPipelineLog('Inspecting selected asset for style', { nodeId: selectedNode.id, sourceName: selectedNode.name })

    try {
      const source = await deps.ensureSceneNodeSourceAsset(selectedNode)
      const response = await fetch(`${EDITOR_API_BASE}/api/style/inspect?assetUrl=${encodeURIComponent(source.assetUrl)}`)
      const payload = await deps.readJsonPayload(response, 'Style inspection')

      if (!payload?.success) {
        state.styleStatus = payload?.message ?? 'Style inspection failed.'
        return
      }

      if (!state.styleReferenceImageUrl && payload.inspection?.detectedReferenceImageUrl) {
        state.styleReferenceImageUrl = payload.inspection.detectedReferenceImageUrl
      }

      state.styleInspectReport = payload.analysis?.inspectReport ?? ''
      state.styleSourceSummary = `${payload.analysis?.sizeFormatted ?? 'Unknown size'} · ${payload.analysis?.modifiedAt ?? 'Unknown date'}`
      state.styleStatus = `Source analyzed. Next step: describe the target look, then package the style workspace for ${selectedNode.name}.`
    } catch (error) {
      console.error('Style inspection failed:', error)
      state.styleStatus = error instanceof Error
        ? error.message
        : 'Style inspection failed. Check the local tools bridge.'
    } finally {
      state.styleBusy = false
    }
  }

  function parseBoundsFromInspectReport(inspectReport: string) {
    const parseVector = (raw: string) => raw
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value))

    const sceneRows = inspectReport
      .split('\n')
      .filter((line) => /^\|\s*\d+\s*\|/.test(line))

    for (const row of sceneRows) {
      const vectors = row.match(/-?\d+(?:\.\d+)?(?:,\s*-?\d+(?:\.\d+)?){2}/g) ?? []
      if (vectors.length < 2) continue

      const bboxMin = parseVector(vectors[0] ?? '')
      const bboxMax = parseVector(vectors[1] ?? '')
      if (bboxMin.length !== 3 || bboxMax.length !== 3) continue

      const size = bboxMax.map((value, index) => value - bboxMin[index]) as [number, number, number]
      const maxDimension = Math.max(...size.map((value) => Math.abs(value)))
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
    const response = await fetch(`${EDITOR_API_BASE}/api/style/inspect?assetUrl=${encodeURIComponent(assetUrl)}`)
    const payload = await deps.readJsonPayload(response, 'Asset bounds inspect')
    if (!payload?.success) return null

    const reportedBounds = payload.analysis?.bounds
    if (reportedBounds?.size?.length === 3 && Number.isFinite(Number(reportedBounds?.maxDimension))) {
      return reportedBounds
    }

    const inspectReport = String(payload.analysis?.inspectReport ?? '')
    const parsedBounds = inspectReport ? parseBoundsFromInspectReport(inspectReport) : null
    if (parsedBounds) {
      deps.appendPipelineLog('Recovered asset bounds from inspect report', { assetUrl, parsedBounds })
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
        return [Math.abs(width * sx), Math.abs(height * sy), Math.abs(depth * sz)] as [number, number, number]
      }
      case 'cylinder': {
        const [radiusTop = 0.5, radiusBottom = 0.5, height = 1] = args
        const radius = Math.max(Math.abs(radiusTop), Math.abs(radiusBottom))
        return [Math.abs(radius * 2 * sx), Math.abs(height * sy), Math.abs(radius * 2 * sz)] as [number, number, number]
      }
      case 'torus': {
        const [radius = 0.5, tube = 0.2] = args
        const outer = (Math.abs(radius) + Math.abs(tube)) * 2
        return [Math.abs(outer * sx), Math.abs(tube * 2 * sy), Math.abs(outer * sz)] as [number, number, number]
      }
      case 'octahedron':
      case 'tetrahedron':
      case 'icosahedron':
      case 'dodecahedron': {
        const [radius = 0.5] = args
        return [Math.abs(radius * 2 * sx), Math.abs(radius * 2 * sy), Math.abs(radius * 2 * sz)] as [number, number, number]
      }
      default:
        return null
    }
  }

  async function getSceneNodeVisualBounds(node: EditorSceneNode, sourceAssetUrl = '') {
    const localScale = [Math.abs(node.scale[0]), Math.abs(node.scale[1]), Math.abs(node.scale[2])] as [number, number, number]
    const prefabAssetUrl = getPrefabAssetUrl(node.prefab?.type)
    const sourceBounds = sourceAssetUrl ? await inspectAssetBounds(sourceAssetUrl) : null

    if (sourceBounds?.size?.length === 3) {
      const sourceSize = [
        Math.abs(Number(sourceBounds.size[0] ?? 0)),
        Math.abs(Number(sourceBounds.size[1] ?? 0)),
        Math.abs(Number(sourceBounds.size[2] ?? 0)),
      ] as [number, number, number]
      const sourceMatchesExistingAsset = !!(
        (node.asset?.url && sourceAssetUrl === node.asset.url)
        || (prefabAssetUrl && sourceAssetUrl === prefabAssetUrl)
      )
      const size = sourceMatchesExistingAsset
        ? [
            sourceSize[0] * localScale[0],
            sourceSize[1] * localScale[1],
            sourceSize[2] * localScale[2],
          ] as [number, number, number]
        : sourceSize
      const maxDimension = Math.max(...size)
      if (Number.isFinite(maxDimension) && maxDimension > 0.0001) {
        return { size, maxDimension }
      }
    }

    if (node.generation?.sourceVisualSize?.length === 3) {
      const size = node.generation.sourceVisualSize
      return { size, maxDimension: Math.max(...size.map((value) => Math.abs(value))) }
    }

    const object = getEditorObject(node.id)
    if (object) {
      object.updateWorldMatrix(true, true)
      const bounds = new THREE.Box3().setFromObject(object)
      if (!bounds.isEmpty()) {
        const size = bounds.getSize(new THREE.Vector3())
        const sizeVector = [Math.abs(size.x), Math.abs(size.y), Math.abs(size.z)] as [number, number, number]
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

  async function fitGeneratedAssetToSource(
    nodeId: string,
    sourceVisualBounds: { size: [number, number, number], maxDimension: number },
    generatedAssetUrl: string,
    fallbackScale: [number, number, number],
  ) {
    const generatedBounds = await inspectAssetBounds(generatedAssetUrl)
    const sourceSize = sourceVisualBounds?.size ?? [0, 0, 0]
    const sourceMax = Number(sourceVisualBounds?.maxDimension ?? 0)
    const generatedMax = Number(generatedBounds?.maxDimension ?? 0)
    if (!Number.isFinite(sourceMax) || !Number.isFinite(generatedMax) || sourceMax <= 0.0001 || generatedMax <= 0.0001) {
      const report = `Fit fallback for ${nodeId}: source bounds ${Number.isFinite(sourceMax) ? sourceMax.toFixed(4) : 'invalid'}, generated bounds ${Number.isFinite(generatedMax) ? generatedMax.toFixed(4) : 'invalid'}. Keeping existing scale [${fallbackScale.map((v) => v.toFixed(3)).join(', ')}].`
      deps.appendPipelineLog('Generated asset fit fallback', {
        nodeId,
        generatedAssetUrl,
        sourceSize,
        sourceMax,
        generatedBounds,
        fallbackScale,
      })
      return { appliedScale: fallbackScale, report, usedFallback: true }
    }

    const generatedSize = Array.isArray(generatedBounds?.size) && generatedBounds.size.length === 3
      ? [
          Math.abs(Number(generatedBounds.size[0] ?? 0)),
          Math.abs(Number(generatedBounds.size[1] ?? 0)),
          Math.abs(Number(generatedBounds.size[2] ?? 0)),
        ] as [number, number, number]
      : [generatedMax, generatedMax, generatedMax] as [number, number, number]

    const axisRatios = sourceSize.map((value, index) => {
      const generatedAxis = generatedSize[index]
      if (!Number.isFinite(value) || !Number.isFinite(generatedAxis) || value <= 0.0001 || generatedAxis <= 0.0001) {
        return sourceMax / generatedMax
      }
      return value / generatedAxis
    }) as [number, number, number]

    const clampedRatios = axisRatios.map((ratio) => Math.min(Math.max(ratio, 0.05), 500)) as [number, number, number]
    const appliedScale = [...clampedRatios] as [number, number, number]
    const report = `Source [${sourceSize.map((v) => v.toFixed(2)).join(', ')}]u → Generated [${generatedSize.map((v) => v.toFixed(2)).join(', ')}]u → Applied ×[${clampedRatios.map((v) => v.toFixed(3)).join(', ')}] → Final scale [${appliedScale.map((v) => v.toFixed(3)).join(', ')}]`
    deps.appendPipelineLog('Computed generated asset fit', { nodeId, generatedAssetUrl, sourceSize, generatedSize, ratios: clampedRatios, appliedScale })
    return { appliedScale, report, usedFallback: false }
  }

  async function restoreLatestStyleWorkspaceForSelection(assetUrl: string, selectionKey: string, options?: { restorePromptFields?: boolean }) {
    const restoreToken = ++state.styleWorkspaceRestoreToken

    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/style/workspace/latest?assetUrl=${encodeURIComponent(assetUrl)}`)
      const payload = await deps.readJsonPayload(response, 'Latest style workspace lookup')

      if (restoreToken !== state.styleWorkspaceRestoreToken || selectionKey !== state.styleSelectionKey) return false
      if (!payload?.success || !payload?.workspace) return false

      const workspace = payload.workspace
      state.styleWorkspaceManifestUrl = workspace.manifestUrl ?? ''
      state.styleWorkspaceSourceAssetUrl = workspace.sourceAssetUrl ?? ''
      state.styleGeneratedReferenceImageUrl = workspace.generatedReferenceImageUrl ?? ''
      state.styleReferenceImageUrl = workspace.referenceImageUrl || state.styleReferenceImageUrl
      if (options?.restorePromptFields) {
        state.styleProfileName = workspace.styleProfileName || state.styleProfileName
        state.stylePrompt = workspace.prompt || state.stylePrompt
        state.styleNegativePrompt = workspace.negativePrompt || state.styleNegativePrompt
        state.styleLoraNotes = workspace.loraNotes || state.styleLoraNotes
        state.styleControlNetNotes = workspace.controlNetNotes || state.styleControlNetNotes
      }
      state.styleStatus = `Restored the latest style workspace for ${deps.getSelectedNode()?.name ?? 'the selected asset'}.`
      return true
    } catch (error) {
      if (restoreToken !== state.styleWorkspaceRestoreToken || selectionKey !== state.styleSelectionKey) return false
      console.error('Style workspace restore failed:', error)
      return false
    }
  }

  async function prepareStyleWorkspace() {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !deps.canUseStyleStudio(selectedNode)) {
      state.styleStatus = 'Select a single geometry node to prepare a style workspace.'
      return false
    }

    state.styleBusy = true
    state.styleStatus = `Packaging ${selectedNode.name} into a style workspace…`
    deps.appendPipelineLog('Preparing style workspace', { nodeId: selectedNode.id, nodeName: selectedNode.name, workflowPath: state.selectedComfyWorkflowPath })

    try {
      const source = await deps.ensureSceneNodeSourceAsset(selectedNode)
      const response = await fetch(`${EDITOR_API_BASE}/api/style/workspace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetUrl: source.assetUrl,
          sourceName: selectedNode.name,
          styleProfileName: state.styleProfileName.trim(),
          prompt: state.stylePrompt.trim(),
          negativePrompt: state.styleNegativePrompt.trim(),
          loraNotes: state.styleLoraNotes.trim(),
          controlNetNotes: state.styleControlNetNotes.trim(),
          referenceImageUrl: state.styleReferenceImageUrl.trim(),
          comfyUiApiUrl: state.comfyUiApiUrl,
          hunyuanApiUrl: state.hunyuanApiUrl,
          generateReferenceIfMissing: true,
        }),
      })
      const payload = await deps.readJsonPayload(response, 'Style workspace packaging')

      if (!payload?.success) {
        state.styleStatus = payload?.message ?? 'Style workspace generation failed.'
        return false
      }

      if (payload.referenceImageUrl) {
        state.styleReferenceImageUrl = payload.referenceImageUrl
      }

      state.styleWorkspaceManifestUrl = payload.manifestUrl ?? ''
      state.styleWorkspaceSourceAssetUrl = payload.sourceAssetUrl ?? ''
      state.styleGeneratedReferenceImageUrl = payload.generatedReferenceImageUrl ?? ''
      state.styleStatus = `Style workspace ready. Next step: use "Keep Shape, Bake New Style" to restyle ${selectedNode.name} without replacing its form.`
      state.saveMessage = `Style workspace prepared for ${selectedNode.name}`
      return true
    } catch (error) {
      console.error('Style workspace generation failed:', error)
      state.styleStatus = error instanceof Error
        ? error.message
        : 'Style workspace generation failed. Check ComfyUI and the tools bridge.'
      return false
    } finally {
      state.styleBusy = false
    }
  }

  async function ensureStyleWorkspaceReady() {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !deps.canUseStyleStudio(selectedNode)) {
      state.styleStatus = 'Select a single geometry node before running a style bake.'
      return false
    }

    if (state.styleWorkspaceManifestUrl.trim()) {
      return true
    }

    if (selectedNode.asset?.url) {
      const restored = await restoreLatestStyleWorkspaceForSelection(selectedNode.asset.url, selectedNode.id)
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
      const response = await fetch(`${EDITOR_API_BASE}/api/style/simplify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetUrl: source.assetUrl,
          outputName: `${selectedNode.name}-style`,
          ratio: state.styleSimplifyRatio,
          error: state.styleSimplifyError,
          lockBorder: true,
        }),
      })
      const payload = await deps.readJsonPayload(response, 'Style simplify')

      if (!payload?.success) {
        state.styleStatus = payload?.message ?? 'Mesh simplification failed.'
        return
      }

      state.styleSimplifiedAssetUrl = payload.assetUrl ?? ''
      state.styleInspectReport = payload.inspectReport ?? state.styleInspectReport
      state.styleStatus = 'Low-poly variant created. Review the generated asset or use it as the source for Blender cleanup.'
      state.saveMessage = `Simplified asset created: ${payload.assetUrl}`
      await deps.refreshGeneratedAssetLibrary(payload.assetUrl)
    } catch (error) {
      console.error('Style simplify failed:', error)
      state.styleStatus = error instanceof Error
        ? error.message
        : 'Mesh simplification failed. Check the local tools bridge.'
    } finally {
      state.styleBusy = false
    }
  }

  async function exportSelectedAssetForBlender(options?: { openInBlender?: boolean }) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !deps.canUseStyleStudio(selectedNode)) {
      state.styleStatus = 'Select a single geometry node before exporting to Blender.'
      return
    }

    state.styleBusy = true
    state.styleStatus = `Exporting ${selectedNode.name} for Blender…`

    try {
      const source = await deps.ensureSceneNodeSourceAsset(selectedNode)
      const response = await fetch(`${EDITOR_API_BASE}/api/style/export-blender`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetUrl: source.assetUrl,
          exportName: selectedNode.name,
          referenceImageUrl: state.styleReferenceImageUrl.trim(),
          openInBlender: options?.openInBlender ?? false,
        }),
      })
      const payload = await deps.readJsonPayload(response, 'Blender export packaging')

      if (!payload?.success) {
        state.styleStatus = payload?.message ?? 'Blender export failed.'
        return
      }

      state.styleBlenderExportPath = payload.exportedGlbPath ?? payload.exportDirectory ?? ''
      state.styleBlenderOpenCommand = payload.openCommand ?? ''
      state.styleStatus = 'Blender package ready. Open the exported GLB for manual line work, mesh cleanup, or painted texture passes.'
    } catch (error) {
      console.error('Blender export failed:', error)
      state.styleStatus = error instanceof Error
        ? error.message
        : 'Blender export failed. Check the local tools bridge.'
    } finally {
      state.styleBusy = false
    }
  }

  async function reimportLatestBlenderOutputForSelection() {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !deps.canUseStyleStudio(selectedNode)) {
      state.styleStatus = 'Select a single geometry node before reimporting from Blender.'
      return
    }

    state.styleBusy = true
    state.styleStatus = `Reimporting the latest Blender output for ${selectedNode.name}…`

    try {
      const source = await deps.ensureSceneNodeSourceAsset(selectedNode)
      const response = await fetch(`${EDITOR_API_BASE}/api/style/reimport-blender`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAssetUrl: source.assetUrl,
          exportPath: state.styleBlenderExportPath.trim(),
          nodeName: selectedNode.name,
        }),
      })
      const payload = await deps.readJsonPayload(response, 'Blender reimport packaging')

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
      state.styleBlenderExportPath = payload.exportedGlbPath ?? state.styleBlenderExportPath
      state.styleStatus = payload.message ?? 'Reimported the latest Blender output.'
      state.saveMessage = state.styleStatus
      await deps.saveSceneDocumentToDisk(deps.getActiveSceneLevelId())
      void deps.inspectSelectedAssetForHunyuan(payload.assetUrl, selectedNode.id)
      state.selectedGeneratedVariantUrl = payload.assetUrl
    } catch (error) {
      console.error('Blender reimport failed:', error)
      state.styleStatus = error instanceof Error
        ? error.message
        : 'Blender reimport failed. Check the local tools bridge.'
      state.saveMessage = state.styleStatus
    } finally {
      state.styleBusy = false
    }
  }

  async function runStyleBake(mode: 'generate' | 'texture') {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !deps.canUseStyleStudio(selectedNode)) {
      state.styleStatus = 'Select a single geometry node before running AI style bake.'
      return
    }

    if (!state.stylePrompt.trim() && !state.styleReferenceImageUrl.trim()) {
      state.styleStatus = 'Enter a style prompt or reference image before running the AI bake.'
      return
    }

    const workspaceReady = await ensureStyleWorkspaceReady()
    if (!workspaceReady) {
      return
    }

    state.hunyuanPrompt = buildNodeStylePrompt(selectedNode)
    state.hunyuanReferenceImageUrl = state.styleReferenceImageUrl.trim()
    const previousOutputUrl = state.hunyuanLastOutputUrl
    state.styleStatus = mode === 'texture'
      ? `Submitting a texture-only style bake for ${selectedNode.name}…`
      : `Submitting a mesh-replacement AI generation for ${selectedNode.name}…`
    await deps.runHunyuanForSelection(mode)
    state.styleStatus = state.hunyuanLastOutputUrl && state.hunyuanLastOutputUrl !== previousOutputUrl
      ? mode === 'texture'
        ? 'Style bake finished. The selected node now points to a newly styled asset.'
        : 'Mesh replacement finished. The selected node now points to a new AI-generated asset variant.'
      : state.hunyuanStatus
  }

  async function applyStyleBatchEntryResult(entry: PersistedStyleBatchEntry, assetUrl: string) {
    const node = deps.getEditorNodes().find((candidate) => candidate.id === entry.nodeId)
    if (!node) {
      throw new Error(`Could not find ${entry.nodeName} in the current scene.`)
    }

    const sourceVisualBounds = await getSceneNodeVisualBounds(node, entry.sourceAssetUrl || '')
    const baseScale = [...node.scale] as [number, number, number]
    const fitResult = await fitGeneratedAssetToSource(entry.nodeId, sourceVisualBounds, assetUrl, baseScale)
    state.hunyuanLastFitReport = fitResult.report

    deps.patchNode(entry.nodeId, {
      kind: 'asset',
      asset: { url: assetUrl },
      scale: fitResult.appliedScale,
      prefab: undefined,
      primitive: undefined,
      generation: {
        ...(node.generation ?? {}),
        descriptor: entry.descriptor,
        sourceVisualSize: sourceVisualBounds.size,
        lastBakedAssetUrl: assetUrl,
        lastBakedAt: new Date().toISOString(),
      },
    })

    deps.appendPipelineLog('Applied style batch result with preserved transform', {
      nodeId: entry.nodeId,
      assetUrl,
      transform: getNodeTransformSnapshot(node),
    })

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
    state.styleBatchStatus = `Resuming ${session.mode === 'texture' ? 'texture style' : 'mesh reimagine'} batch for ${session.entries.length} scene object${session.entries.length === 1 ? '' : 's'}…`
    state.styleBatchSelectionIds = session.entries.map((entry) => entry.nodeId)
    state.styleProfileName = session.styleProfileName
    state.stylePrompt = session.stylePrompt
    state.styleNegativePrompt = session.styleNegativePrompt
    state.styleLoraNotes = session.styleLoraNotes
    state.styleControlNetNotes = session.styleControlNetNotes
    state.styleReferenceImageUrl = session.styleReferenceImageUrl

    try {
      for (const entry of session.entries) {
        if (state.styleBatchAbortRequested) {
          throw new Error(
            state.styleBatchStopIntent === 'pause'
              ? 'Scene style batch paused by user.'
              : 'Scene style batch cancelled by user. Reload disk to revert any unapplied local changes.'
          )
        }

        if (entry.status === 'applied') {
          state.styleBatchNodeStatusById = {
            ...state.styleBatchNodeStatusById,
            [entry.nodeId]: `Finished. Scene now uses ${entry.outputAssetUrl ?? 'the generated asset'}.`,
          }
          continue
        }

        if (entry.status === 'failed') {
          state.styleBatchNodeStatusById = {
            ...state.styleBatchNodeStatusById,
            [entry.nodeId]: entry.error || 'This batch item failed earlier and was not resumed.',
          }
          continue
        }

        const node = deps.getEditorNodes().find((candidate) => candidate.id === entry.nodeId)
        if (!node || !canBakeSceneNode(node)) {
          const message = `Skipped ${entry.nodeName}; the node is missing or no longer geometry-backed.`
          state.styleBatchNodeStatusById = {
            ...state.styleBatchNodeStatusById,
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
          state.styleBatchStatus = session.mode === 'texture'
            ? `Baking style onto ${entry.nodeName}…`
            : `Reimagining ${entry.nodeName}…`
          state.styleBatchNodeStatusById = {
            ...state.styleBatchNodeStatusById,
            [entry.nodeId]: 'Preparing source asset…',
          }

          const source = await deps.ensureSceneNodeSourceAsset(node)
          sourceAssetUrl = source.assetUrl

          const workspaceResponse = await fetch(`${EDITOR_API_BASE}/api/style/workspace`, {
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
          const workspacePayload = await deps.readJsonPayload(workspaceResponse, 'Style workspace packaging')
          if (!workspacePayload?.success) {
            throw new Error(workspacePayload?.message ?? `Could not package a style workspace for ${entry.nodeName}.`)
          }

          const resolvedWorkspaceReferenceImageUrl = (
            entry.workspaceReferenceImageUrl
            || workspacePayload.referenceImageUrl
            || workspacePayload.generatedReferenceImageUrl
            || session.styleReferenceImageUrl.trim()
          ) as string

          const queuedJob = await deps.queueHunyuanJob({
            apiUrl: session.hunyuanApiUrl,
            comfyUiApiUrl: session.comfyUiApiUrl,
            assetUrl: source.assetUrl,
            sourceName: entry.sourceName,
            mode: session.mode,
            prompt,
            referenceImageUrl: resolvedWorkspaceReferenceImageUrl,
            workflowPath: session.workflowPath,
          })

          state.selectedHunyuanJobId = queuedJob.id
          updatePersistedStyleBatchSession((current) => ({
            ...current,
            entries: current.entries.map((candidate) => candidate.nodeId === entry.nodeId
              ? {
                ...candidate,
                sourceAssetUrl: source.assetUrl,
                workspaceReferenceImageUrl: resolvedWorkspaceReferenceImageUrl,
                jobId: queuedJob.id,
                status: 'queued',
                error: undefined,
              }
              : candidate),
          }))
          state.styleBatchNodeStatusById = {
            ...state.styleBatchNodeStatusById,
            [entry.nodeId]: 'Queued in ComfyUI + Hunyuan…',
          }
          entry.jobId = queuedJob.id
          entry.status = 'queued'
        }

        if (!entry.jobId) {
          throw new Error(`Missing queued job id for ${entry.nodeName}.`)
        }

        const payload = await deps.waitForQueuedHunyuanJob(entry.jobId, {
          onQueued: () => {
            state.styleBatchNodeStatusById = {
              ...state.styleBatchNodeStatusById,
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
            state.styleBatchNodeStatusById = {
              ...state.styleBatchNodeStatusById,
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

        state.styleBatchNodeStatusById = {
          ...state.styleBatchNodeStatusById,
          [entry.nodeId]: `Finished. Scene now uses ${payload.assetUrl}.`,
        }
      }

      await deps.saveSceneDocumentToDisk(deps.getActiveSceneLevelId())
      const finalSession = state.styleBatchSession
      const hasIncompleteEntries = !!finalSession?.entries.some((entry: PersistedStyleBatchEntry) => entry.status !== 'applied')
      state.styleBatchStatus = hasIncompleteEntries
        ? 'Scene batch stopped with incomplete items. Generated assets that finished were applied, and the remaining session was kept for inspection or recovery.'
        : session.mode === 'texture'
          ? `Texture style batch finished for ${session.entries.length} object${session.entries.length === 1 ? '' : 's'}. The scene file was saved to disk.`
          : `Scene regeneration finished for ${session.entries.length} object${session.entries.length === 1 ? '' : 's'}. The scene file was saved to disk.`
      state.saveMessage = state.styleBatchStatus
      if (!hasIncompleteEntries) {
        persistStyleBatchSession(null)
      }
    } catch (error) {
      console.error('Scene style batch failed:', error)
      if (state.styleBatchStopIntent === 'pause') {
        state.styleBatchStatus = 'Scene style batch paused. Resume the saved session when you are ready.'
        state.styleBatchPendingResume = state.styleBatchSession
        state.saveMessage = `${state.styleBatchStatus} Local scene state was checkpointed.`
      } else if (state.styleBatchStopIntent === 'cancel') {
        state.styleBatchStatus = 'Scene style batch cancelled. Auto-resume was discarded.'
        state.saveMessage = `${state.styleBatchStatus} Local scene state was checkpointed.`
      } else {
        state.styleBatchStatus = error instanceof Error
          ? error.message
          : 'Scene style batch failed. Check the tools bridge and local AI services.'
        updatePersistedStyleBatchSession((current) => ({
          ...current,
          entries: current.entries.map((candidate) => candidate.jobId === state.hunyuanActiveJobId && (candidate.status === 'queued' || candidate.status === 'running')
            ? { ...candidate, status: 'failed', error: state.styleBatchStatus }
            : candidate),
        }))
      }
    } finally {
      state.hunyuanActiveJobId = ''
      state.styleBatchBusy = false
      state.styleBatchResumePromise = null
      state.styleBatchStopIntent = null
    }
  }

  async function runStyleBatch(mode: 'texture' | 'generate') {
    const candidateIds = state.styleBatchSelectionIds.filter((id: string) => deps.getStyleSceneCandidates().some((candidate) => candidate.id === id))
    deps.appendPipelineLog('Starting style batch request', { mode, candidateCount: candidateIds.length, workflowPath: state.selectedComfyWorkflowPath, styleProfileName: state.styleProfileName, stylePrompt: state.stylePrompt })
    if (candidateIds.length === 0) {
      state.styleBatchStatus = 'Select at least one scene object before running a scene batch.'
      return
    }

    await deps.refreshHunyuanServiceStatus(true)
    if (mode === 'generate' && !state.hunyuanBackendCanGenerate) {
      state.styleBatchStatus = state.hunyuanBackendStatus || 'Mesh reimagine is unavailable because the AI backend is not ready.'
      return
    }
    if (mode === 'texture' && !state.hunyuanBackendCanRetexture) {
      state.styleBatchStatus = state.hunyuanBackendStatus || 'Texture style bake is unavailable because the AI backend is not ready.'
      return
    }

    if (mode === 'generate' && !state.stylePrompt.trim()) {
      state.styleBatchStatus = 'Write the shared style brief before running a full mesh scene reimagine.'
      return
    }

    if (mode === 'texture' && !state.stylePrompt.trim() && !state.styleReferenceImageUrl.trim()) {
      state.styleBatchStatus = 'Texture-only batch needs a shared style brief or a reference image.'
      return
    }

    state.styleBatchNodeStatusById = Object.fromEntries(candidateIds.map((id: string) => [id, 'Queued for style regeneration.']))
    state.styleBatchStatus = mode === 'generate'
      ? `Preflighting and queueing ${candidateIds.length} scene object${candidateIds.length === 1 ? '' : 's'} for mesh reimagine…`
      : `Preflighting and queueing ${candidateIds.length} scene object${candidateIds.length === 1 ? '' : 's'} for texture style bake…`
    const session = createStyleBatchSession(mode, candidateIds)
    persistStyleBatchSession(session)
    state.styleBatchResumePromise = resumeStyleBatchSession(session)
    await state.styleBatchResumePromise
  }

  return {
    buildNodeStylePrompt,
    getNodeTransformSnapshot,
    getSceneNodeVisualBounds,
    fitGeneratedAssetToSource,
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
    exportSelectedAssetForBlender,
    reimportLatestBlenderOutputForSelection,
    runStyleBake,
    applyStyleBatchEntryResult,
    resumeStyleBatchSession,
    runStyleBatch,
    restoreLatestStyleWorkspaceForSelection,
  }
}
