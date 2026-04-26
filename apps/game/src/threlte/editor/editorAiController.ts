import { EDITOR_API_BASE } from '@config/editorApi'
import type { EditorSceneNode } from './editorStore'

interface EditorAiControllerDeps {
  state: Record<string, any>
  getSelectedNode: () => EditorSceneNode | null
  getEditorNodes: () => EditorSceneNode[]
  getSelectedLibraryItem: () => {
    name: string
    path: string
    isDirectory: boolean
  } | null
  getActiveSceneLevelId: () => string
  canUseAiMeshStudio: (node: EditorSceneNode | null) => boolean
  getAiReplacementTargetIds: (node: EditorSceneNode | null) => string[]
  getAiSourceName: (node: EditorSceneNode | null) => string
  getDefaultStyleDescriptor: (node: EditorSceneNode | null) => string
  ensureSceneNodeSourceAsset: (
    node: EditorSceneNode,
  ) => Promise<{ assetUrl: string; sourceName: string }>
  getSceneNodeVisualBounds: (
    node: EditorSceneNode,
    sourceAssetUrl?: string,
  ) => Promise<{ size: [number, number, number] }>
  fitGeneratedAssetToSource: (
    nodeId: string,
    sourceVisualBounds: { size: [number, number, number] },
    assetUrl: string,
    baseScale: [number, number, number],
  ) => Promise<{ appliedScale: [number, number, number]; report: string }>
  readJsonPayload: (response: Response, context: string) => Promise<any>
  refreshGeneratedAssetLibrary: (selectAssetUrl?: string) => Promise<void>
  inspectSelectedAssetForHunyuan: (
    assetUrl: string,
    selectionKey: string,
  ) => Promise<void>
  saveSceneDocumentToDisk: (levelId: string) => Promise<any>
  setRuntimeDiagnostic: (
    source: string,
    payload: {
      level: 'ready' | 'warning' | 'error' | 'loading'
      message: string
    },
  ) => void
  appendPipelineLog: (message: string, detail?: unknown) => void
  patchNode: (nodeId: string, patch: Record<string, any>) => void
  addNode: (node: Record<string, any>) => void
  getSelectedLibraryItemUrl: () => string
  getSelectedLibraryItemName: () => string
  getNodeTransformSnapshot: (node: EditorSceneNode | null) => {
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
  } | null
}

export function createEditorAiController(deps: EditorAiControllerDeps) {
  const state = deps.state

  function createGeneratedAssetNode(assetUrl: string, name: string) {
    const selectedNode = deps.getSelectedNode()
    const fallbackName = name.trim() || 'Generated Asset'
    const parentId =
      selectedNode?.kind === 'group'
        ? selectedNode.id
        : selectedNode?.parentId ?? null
    const anchorPosition = selectedNode?.position ?? [0, 0, 0]
    const nextPosition: [number, number, number] = [
      anchorPosition[0] + (selectedNode ? 2 : 0),
      anchorPosition[1],
      anchorPosition[2],
    ]

    deps.addNode({
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

  async function refreshHunyuanServiceStatus(ensure = false) {
    try {
      const response = await fetch(
        `${EDITOR_API_BASE}/api/hunyuan3d/status?apiUrl=${encodeURIComponent(state.hunyuanApiUrl)}&comfyUiApiUrl=${encodeURIComponent(state.comfyUiApiUrl)}${ensure ? '&ensure=1' : ''}`,
      )
      const payload = await response.json()

      if (!payload?.success || !payload?.status) {
        state.hunyuanServiceReady = false
        state.hunyuanBackendCanGenerate = false
        state.hunyuanBackendCanRetexture = false
        state.hunyuanBackendStatus =
          payload?.message ?? 'Mesh backend unavailable.'
        deps.setRuntimeDiagnostic('hunyuan', {
          level: 'warning',
          message: state.hunyuanBackendStatus,
        })
        return
      }

      state.hunyuanServiceReady = !!payload.status.available
      state.hunyuanBackendCanGenerate =
        !!payload.status.supportsReplacementGeneration
      state.hunyuanBackendCanRetexture = !!payload.status.supportsTextureWrap
      state.hunyuanBackendStatus =
        payload.status.message ?? state.hunyuanBackendStatus
      deps.setRuntimeDiagnostic('hunyuan', {
        level: state.hunyuanServiceReady ? 'ready' : 'warning',
        message: state.hunyuanBackendStatus,
      })
    } catch {
      state.hunyuanServiceReady = false
      state.hunyuanBackendCanGenerate = false
      state.hunyuanBackendCanRetexture = false
      state.hunyuanBackendStatus = `Mesh backend unavailable at ${EDITOR_API_BASE}.`
      deps.setRuntimeDiagnostic('hunyuan', {
        level: 'error',
        message: state.hunyuanBackendStatus,
      })
    }
  }

  async function refreshComfyUiServiceStatus(ensure = false) {
    state.comfyUiBusy = ensure
    try {
      const response = await fetch(
        `${EDITOR_API_BASE}/api/comfyui/status?apiUrl=${encodeURIComponent(state.comfyUiApiUrl)}${ensure ? '&ensure=1' : ''}`,
      )
      const payload = await response.json()

      if (!payload?.success || !payload?.status) {
        state.comfyUiReady = false
        state.comfyUiStatus = payload?.message ?? 'ComfyUI status unavailable.'
        deps.setRuntimeDiagnostic('comfyUi', {
          level: 'warning',
          message: state.comfyUiStatus,
        })
        return
      }

      state.comfyUiReady = !!payload.status.available
      state.comfyUiStatus = payload.status.message ?? state.comfyUiStatus
      deps.setRuntimeDiagnostic('comfyUi', {
        level: state.comfyUiReady ? 'ready' : 'warning',
        message: state.comfyUiStatus,
      })
    } catch {
      state.comfyUiReady = false
      state.comfyUiStatus = `ComfyUI bridge unavailable at ${EDITOR_API_BASE}.`
      deps.setRuntimeDiagnostic('comfyUi', {
        level: 'error',
        message: state.comfyUiStatus,
      })
    } finally {
      state.comfyUiBusy = false
    }
  }

  async function openComfyUiWorkflowEditor(mode: 'generate' | 'texture') {
    const sourceNode = deps.getSelectedNode()
    const assetUrl = sourceNode?.asset?.url ?? ''
    const sourceName = sourceNode
      ? deps.getAiSourceName(sourceNode)
      : state.hunyuanScratchName.trim() || 'Generated Asset'
    const referenceImageUrl = sourceNode
      ? state.hunyuanReferenceImageUrl || state.hunyuanDetectedReferenceImageUrl
      : state.hunyuanScratchReferenceImageUrl

    try {
      deps.appendPipelineLog('Opening ComfyUI workflow editor', {
        mode,
        workflowPath: state.selectedComfyWorkflowPath,
        sourceName,
        assetUrl,
      })
      const response = await fetch(
        `${EDITOR_API_BASE}/api/comfyui/workflow-template?mode=${encodeURIComponent(mode)}&apiUrl=${encodeURIComponent(state.hunyuanApiUrl)}&comfyUiApiUrl=${encodeURIComponent(state.comfyUiApiUrl)}&assetUrl=${encodeURIComponent(assetUrl)}&sourceName=${encodeURIComponent(sourceName)}&referenceImageUrl=${encodeURIComponent(referenceImageUrl)}&workflowPath=${encodeURIComponent(state.selectedComfyWorkflowPath)}`,
      )
      const payload = await deps.readJsonPayload(
        response,
        'Workflow template request',
      )

      if (!payload?.success || !payload?.workflow) {
        throw new Error(
          payload?.message ?? 'Could not build a ComfyUI workflow template.',
        )
      }

      const workflowJson = JSON.stringify(payload.workflow, null, 2)
      await navigator.clipboard.writeText(workflowJson)
      if (typeof window !== 'undefined') {
        window.open(
          payload.editorUrl || state.comfyUiApiUrl,
          '_blank',
          'noopener,noreferrer',
        )
      }

      state.comfyWorkflowEditorStatus =
        payload.message ?? 'Workflow copied to clipboard and ComfyUI opened.'
      state.saveMessage = state.comfyWorkflowEditorStatus
    } catch (error) {
      console.error('Open ComfyUI workflow editor failed:', error)
      state.comfyWorkflowEditorStatus =
        error instanceof Error
          ? error.message
          : 'Failed to open the ComfyUI workflow editor.'
      state.saveMessage = state.comfyWorkflowEditorStatus
    }
  }

  async function refreshHunyuanRecentJobs(limit = 10) {
    state.hunyuanJobsLoading = true
    state.hunyuanJobsError = ''

    try {
      const response = await fetch(
        `${EDITOR_API_BASE}/api/hunyuan3d/jobs?limit=${encodeURIComponent(String(limit))}`,
      )
      const payload = await response.json()

      if (!payload?.success || !Array.isArray(payload.jobs)) {
        state.recentHunyuanJobs = []
        state.hunyuanJobsError =
          payload?.message ?? 'Could not load recent Hunyuan jobs.'
        return
      }

      state.recentHunyuanJobs = payload.jobs
      if (
        !state.selectedHunyuanJobId ||
        !state.recentHunyuanJobs.some(
          (job: any) => job.id === state.selectedHunyuanJobId,
        )
      ) {
        state.selectedHunyuanJobId =
          state.recentHunyuanJobs.find((job: any) => job.status === 'failed')
            ?.id ??
          state.recentHunyuanJobs[0]?.id ??
          ''
      }
    } catch (error) {
      console.error('Recent Hunyuan jobs load failed:', error)
      state.recentHunyuanJobs = []
      state.hunyuanJobsError = `Job history unavailable at ${EDITOR_API_BASE}.`
    } finally {
      state.hunyuanJobsLoading = false
    }
  }

  async function queueHunyuanJob(requestBody: Record<string, unknown>) {
    deps.appendPipelineLog('Queueing Hunyuan job', requestBody)
    const queueResponse = await fetch(`${EDITOR_API_BASE}/api/hunyuan3d/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })
    const queuePayload = await deps.readJsonPayload(
      queueResponse,
      'Hunyuan job queue',
    )

    if (!queuePayload?.success || !queuePayload?.job?.id) {
      throw new Error(
        queuePayload?.message ?? 'Could not queue the Hunyuan job.',
      )
    }

    deps.appendPipelineLog('Queued Hunyuan job', {
      jobId: queuePayload.job.id,
      queuePosition: queuePayload.job.queuePosition ?? null,
    })

    return queuePayload.job
  }

  async function getHunyuanJobStatus(jobId: string) {
    const statusResponse = await fetch(
      `${EDITOR_API_BASE}/api/hunyuan3d/jobs?jobId=${encodeURIComponent(jobId)}`,
    )
    const statusPayload = await deps.readJsonPayload(
      statusResponse,
      'Hunyuan job status',
    )

    if (!statusPayload?.success || !statusPayload?.job) {
      throw new Error(
        statusPayload?.message ?? 'Lost track of the Hunyuan job.',
      )
    }

    return statusPayload.job
  }

  async function waitForQueuedHunyuanJob(
    jobId: string,
    options?: {
      onQueued?: (job: any) => void
      onRunning?: (job: any) => void
    },
  ) {
    state.hunyuanActiveJobId = jobId
    void refreshHunyuanRecentJobs()

    while (true) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const job = await getHunyuanJobStatus(jobId)
      void refreshHunyuanRecentJobs()
      const queuePosition = Number(job.queuePosition ?? 0)

      if (job.status === 'queued') {
        options?.onQueued?.(job)
        state.hunyuanStatus =
          queuePosition > 1
            ? `Queued for AI generation. Position ${queuePosition} in line.`
            : 'Queued for AI generation. Starting shortly…'
        deps.setRuntimeDiagnostic('hunyuan', {
          level: 'loading',
          message: state.hunyuanStatus,
        })
        continue
      }

      if (job.status === 'running') {
        options?.onRunning?.(job)
        state.hunyuanStatus =
          'Generating asset with ComfyUI + Hunyuan… this can take a while.'
        deps.setRuntimeDiagnostic('hunyuan', {
          level: 'loading',
          message: state.hunyuanStatus,
        })
        continue
      }

      if (job.status === 'failed') {
        const result = job.result
        state.hunyuanServiceReady = !!result?.status?.available
        state.hunyuanBackendCanGenerate =
          !!result?.status?.supportsReplacementGeneration
        state.hunyuanBackendCanRetexture = !!result?.status?.supportsTextureWrap
        if (result?.status?.message) {
          state.hunyuanBackendStatus = result.status.message
        }
        throw new Error(job.error || result?.message || 'Hunyuan job failed.')
      }

      if (job.status === 'cancelled') {
        throw new Error(job.error || 'Hunyuan job cancelled.')
      }

      if (job.status === 'succeeded') {
        const result = job.result
        if (result?.status?.message) {
          state.hunyuanBackendStatus = result.status.message
        }
        if (!result?.assetUrl) {
          throw new Error(
            result?.message ?? 'Hunyuan job completed without an asset URL.',
          )
        }
        return result
      }
    }
  }

  async function queueAndWaitForHunyuanJob(
    requestBody: Record<string, unknown>,
  ) {
    const queuedJob = await queueHunyuanJob(requestBody)
    state.hunyuanActiveJobId = queuedJob.id
    void refreshHunyuanRecentJobs()
    const initialQueuePosition = Number(queuedJob.queuePosition ?? 0)
    state.hunyuanStatus =
      initialQueuePosition > 1
        ? `Queued for AI generation. Position ${initialQueuePosition} in line.`
        : 'Queued for AI generation. Starting shortly…'
    deps.setRuntimeDiagnostic('hunyuan', {
      level: 'loading',
      message: state.hunyuanStatus,
    })
    return waitForQueuedHunyuanJob(queuedJob.id)
  }

  async function runHunyuanForSelection(mode: 'generate' | 'texture') {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !deps.canUseAiMeshStudio(selectedNode)) {
      state.hunyuanStatus =
        'Select a single geometry node before running Hunyuan.'
      return
    }

    const targetNodeId = selectedNode.id
    const targetNodeIds = deps.getAiReplacementTargetIds(selectedNode)
    const targetSourceName = deps.getAiSourceName(selectedNode)
    const objectDescription = deps.getDefaultStyleDescriptor(selectedNode).trim()
    const stylePrompt = String(state.hunyuanPrompt ?? '').trim()
    const prompt = [
      objectDescription ? `object description: ${objectDescription}` : '',
      stylePrompt ? `style prompt: ${stylePrompt}` : targetSourceName,
    ]
      .filter(Boolean)
      .join('\n')
    const source = await deps.ensureSceneNodeSourceAsset(selectedNode)
    const targetAssetUrl = source.assetUrl
    const editorNodes = deps.getEditorNodes()
    const targetNodeFitData = await Promise.all(
      targetNodeIds.map(async nodeId => {
        const node = editorNodes.find(candidate => candidate.id === nodeId)
        if (!node) return null
        return {
          nodeId,
          sourceVisualBounds: await deps.getSceneNodeVisualBounds(
            node,
            targetAssetUrl,
          ),
          baseScale: [...node.scale] as [number, number, number],
          descriptor: deps.getDefaultStyleDescriptor(node),
        }
      }),
    )

    if (mode === 'texture' && !targetAssetUrl) {
      state.hunyuanStatus =
        'Texture wrapping needs an imported mesh asset. Generate a replacement mesh first for prefabs.'
      return
    }
    if (mode === 'generate' && !state.hunyuanBackendCanGenerate) {
      await refreshHunyuanServiceStatus(true)
      if (!state.hunyuanBackendCanGenerate) {
        state.hunyuanStatus = state.hunyuanBackendStatus
        return
      }
    }
    if (mode === 'texture' && !state.hunyuanBackendCanRetexture) {
      await refreshHunyuanServiceStatus(true)
      if (!state.hunyuanBackendCanRetexture) {
        state.hunyuanStatus = state.hunyuanBackendStatus
        return
      }
    }

    state.hunyuanBusy = true
    state.hunyuanStatus =
      mode === 'texture'
        ? 'Preparing Hunyuan and generating a UV-style texture wrap from the selected mesh…'
        : targetAssetUrl
          ? 'Preparing Hunyuan and generating a replacement mesh from the selected reference…'
          : 'Preparing Hunyuan and generating a new mesh from the selected prefab and prompt…'

    try {
      const payload = await queueAndWaitForHunyuanJob({
        apiUrl: state.hunyuanApiUrl,
        comfyUiApiUrl: state.comfyUiApiUrl,
        assetUrl: targetAssetUrl || undefined,
        sourceName: targetSourceName,
        mode,
        prompt,
        referenceImageUrl: state.hunyuanReferenceImageUrl,
        workflowPath: state.selectedComfyWorkflowPath,
      })

      const fitDataById = new Map(
        targetNodeFitData
          .filter(Boolean)
          .map((entry: any) => [entry.nodeId, entry]),
      )
      const replacementPatches = await Promise.all(
        targetNodeIds.map(async nodeId => {
          const fitData = fitDataById.get(nodeId)
          const fitResult = fitData
            ? await deps.fitGeneratedAssetToSource(
                nodeId,
                fitData.sourceVisualBounds,
                payload.assetUrl,
                fitData.baseScale,
              )
            : null
          if (fitResult?.report) {
            state.hunyuanLastFitReport = fitResult.report
          }
          return {
            nodeId,
            patch: {
              kind: 'asset' as const,
              asset: { url: payload.assetUrl },
              prefab: undefined,
              primitive: undefined,
              scale: fitResult?.appliedScale ?? fitData?.baseScale ?? [1, 1, 1],
              generation: {
                ...(editorNodes.find(candidate => candidate.id === nodeId)
                  ?.generation ?? {}),
                descriptor:
                  fitData?.descriptor ??
                  deps.getDefaultStyleDescriptor(selectedNode),
                sourceVisualSize: fitData?.sourceVisualBounds?.size,
                lastBakedAssetUrl: payload.assetUrl,
                lastBakedAt: new Date().toISOString(),
              },
            },
          }
        }),
      )

      if (replacementPatches.length > 0) {
        for (const entry of replacementPatches) {
          deps.patchNode(entry.nodeId, entry.patch)
        }
        await deps.saveSceneDocumentToDisk(deps.getActiveSceneLevelId())
      }

      deps.appendPipelineLog(
        'Replaced node(s) with generated asset using preserved transform',
        {
          generatedAssetUrl: payload.assetUrl,
          targets: targetNodeIds.map(id => {
            const node = editorNodes.find(candidate => candidate.id === id)
            return {
              id,
              transform: deps.getNodeTransformSnapshot(node ?? null),
            }
          }),
        },
      )
      state.hunyuanLastOutputUrl = payload.assetUrl
      state.hunyuanLastResultSummary =
        targetNodeIds.length > 1
          ? `Generated and replaced ${targetNodeIds.length} matching nodes.`
          : 'Generated and replaced the selected node.'
      state.hunyuanServiceReady = true
      state.hunyuanStatus =
        payload.message ??
        (targetNodeIds.length > 1
          ? `Generated asset applied to ${targetNodeIds.length} matching nodes.`
          : 'Generated asset imported into the selected node.')
      deps.setRuntimeDiagnostic('hunyuan', {
        level: 'ready',
        message: state.hunyuanStatus,
      })
      state.saveMessage =
        targetNodeIds.length > 1
          ? `AI asset applied to ${targetNodeIds.length} nodes and saved: ${payload.assetUrl}`
          : `AI asset applied and saved: ${payload.assetUrl}`
      await deps.refreshGeneratedAssetLibrary(payload.assetUrl)
      if (deps.getSelectedNode()?.id === targetNodeId) {
        void deps.inspectSelectedAssetForHunyuan(payload.assetUrl, targetNodeId)
      }
    } catch (error) {
      console.error('Hunyuan generation failed:', error)
      state.hunyuanStatus =
        error instanceof Error
          ? error.message
          : 'Hunyuan generation failed. Check the local server and Hunyuan API process.'
      deps.setRuntimeDiagnostic('hunyuan', {
        level: 'error',
        message: state.hunyuanStatus,
      })
    } finally {
      state.hunyuanActiveJobId = ''
      state.hunyuanBusy = false
    }
  }

  async function runHunyuanToLibrary(options?: { addToScene?: boolean }) {
    const sourceName = state.hunyuanScratchName.trim() || 'Generated Artifact'
    const prompt = state.hunyuanScratchPrompt.trim()
    const referenceImageUrl = state.hunyuanScratchReferenceImageUrl.trim()

    if (!prompt && !referenceImageUrl) {
      state.hunyuanStatus =
        'Enter a prompt or reference image before generating a new asset.'
      return
    }
    if (!state.hunyuanBackendCanGenerate) {
      await refreshHunyuanServiceStatus(true)
      if (!state.hunyuanBackendCanGenerate) {
        state.hunyuanStatus = state.hunyuanBackendStatus
        return
      }
    }

    state.hunyuanBusy = true
    state.hunyuanStatus = `Preparing Hunyuan and generating ${sourceName} into the asset library…`

    try {
      const payload = await queueAndWaitForHunyuanJob({
        apiUrl: state.hunyuanApiUrl,
        comfyUiApiUrl: state.comfyUiApiUrl,
        sourceName,
        mode: 'generate',
        prompt,
        referenceImageUrl,
        workflowPath: state.selectedComfyWorkflowPath,
      })

      state.hunyuanLastOutputUrl = payload.assetUrl
      state.hunyuanLastResultSummary = options?.addToScene
        ? 'Generated a new asset, added it to the scene, and stored it in the library.'
        : 'Generated a new asset in the library. It has not been applied to the current selection.'
      state.hunyuanServiceReady = true
      state.hunyuanStatus =
        payload.message ?? `Generated ${sourceName} into the asset library.`
      deps.setRuntimeDiagnostic('hunyuan', {
        level: 'ready',
        message: state.hunyuanStatus,
      })
      state.saveMessage = `AI asset created: ${payload.assetUrl}`

      await deps.refreshGeneratedAssetLibrary(payload.assetUrl)

      if (options?.addToScene) {
        createGeneratedAssetNode(payload.assetUrl, sourceName)
      }
    } catch (error) {
      console.error('Hunyuan generation failed:', error)
      state.hunyuanStatus =
        error instanceof Error
          ? error.message
          : 'Hunyuan generation failed. Check the local server and Hunyuan API process.'
      deps.setRuntimeDiagnostic('hunyuan', {
        level: 'error',
        message: state.hunyuanStatus,
      })
    } finally {
      state.hunyuanActiveJobId = ''
      state.hunyuanBusy = false
    }
  }

  async function runHunyuanForLibraryAsset(mode: 'generate' | 'texture') {
    const selectedLibraryItem = deps.getSelectedLibraryItem()
    if (!selectedLibraryItem || selectedLibraryItem.isDirectory) {
      state.hunyuanStatus =
        'Select a library asset before using AI reimagine tools.'
      return
    }

    const assetUrl = deps.getSelectedLibraryItemUrl()
    const sourceName = deps.getSelectedLibraryItemName()
    if (!assetUrl || !sourceName) {
      state.hunyuanStatus = 'Could not resolve the selected library asset.'
      return
    }

    if (mode === 'texture') {
      if (!state.hunyuanBackendCanRetexture) {
        await refreshHunyuanServiceStatus(true)
        if (!state.hunyuanBackendCanRetexture) {
          state.hunyuanStatus = state.hunyuanBackendStatus
          return
        }
      }
      if (!state.hunyuanSupportsTextureWrap) {
        await deps.inspectSelectedAssetForHunyuan(
          assetUrl,
          selectedLibraryItem.path,
        )
        if (!state.hunyuanSupportsTextureWrap) {
          state.hunyuanStatus =
            'Texture wrapping currently supports only compatible mesh assets.'
          return
        }
      }
    } else {
      if (!state.hunyuanBackendCanGenerate) {
        await refreshHunyuanServiceStatus(true)
        if (!state.hunyuanBackendCanGenerate) {
          state.hunyuanStatus = state.hunyuanBackendStatus
          return
        }
      }
    }

    state.hunyuanBusy = true
    state.hunyuanStatus =
      mode === 'texture'
        ? `Retexturing ${sourceName} into a new library asset…`
        : `Reimagining ${sourceName} into a new library asset…`

    try {
      const payload = await queueAndWaitForHunyuanJob({
        apiUrl: state.hunyuanApiUrl,
        comfyUiApiUrl: state.comfyUiApiUrl,
        assetUrl,
        sourceName,
        mode,
        prompt: (state.hunyuanPrompt || sourceName).trim(),
        referenceImageUrl: state.hunyuanReferenceImageUrl,
        workflowPath: state.selectedComfyWorkflowPath,
      })

      state.hunyuanLastOutputUrl = payload.assetUrl
      state.hunyuanLastResultSummary = `${sourceName} generated into the library as a new asset.`
      state.hunyuanServiceReady = true
      state.hunyuanStatus =
        payload.message ?? `${sourceName} generated into the asset library.`
      deps.setRuntimeDiagnostic('hunyuan', {
        level: 'ready',
        message: state.hunyuanStatus,
      })
      state.saveMessage = `AI asset created: ${payload.assetUrl}`

      await deps.refreshGeneratedAssetLibrary(payload.assetUrl)
    } catch (error) {
      console.error('Hunyuan generation failed:', error)
      state.hunyuanStatus =
        error instanceof Error
          ? error.message
          : 'Hunyuan generation failed. Check the local server and Hunyuan API process.'
      deps.setRuntimeDiagnostic('hunyuan', {
        level: 'error',
        message: state.hunyuanStatus,
      })
    } finally {
      state.hunyuanActiveJobId = ''
      state.hunyuanBusy = false
    }
  }

  async function runHunyuanFromScratch() {
    await runHunyuanToLibrary({ addToScene: true })
  }

  return {
    refreshHunyuanServiceStatus,
    refreshComfyUiServiceStatus,
    openComfyUiWorkflowEditor,
    refreshHunyuanRecentJobs,
    runHunyuanForSelection,
    runHunyuanToLibrary,
    runHunyuanForLibraryAsset,
    runHunyuanFromScratch,
    waitForQueuedHunyuanJob,
    queueHunyuanJob,
    queueAndWaitForHunyuanJob,
  }
}
