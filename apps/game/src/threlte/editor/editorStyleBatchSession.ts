import { canBakeSceneNode } from './editorBakeSource'
import {
  type PersistedStyleBatchEntry,
  type PersistedStyleBatchSession,
  clearStyleBatchSessionFromLocalStorage,
  saveStyleBatchSessionToLocalStorage,
} from './editorPersistence'
import type { EditorSceneNode } from './editorStore'

interface EditorStyleBatchSessionDeps {
  state: Record<string, any>
  getEditorNodes: () => EditorSceneNode[]
  getActiveSceneLevelId: () => string
  getDefaultStyleDescriptor: (node: EditorSceneNode | null) => string
  getAiSourceName: (node: EditorSceneNode | null) => string
}

export function createEditorStyleBatchSessionController(
  deps: EditorStyleBatchSessionDeps,
) {
  const state = deps.state

  function resetQueuedStyleBatchEntriesForResume(
    session: PersistedStyleBatchSession,
  ) {
    return {
      ...session,
      entries: session.entries.map(entry =>
        entry.status === 'queued' ||
        entry.status === 'running' ||
        entry.status === 'failed'
          ? {
              ...entry,
              jobId: undefined,
              status: 'pending' as const,
              previousError: entry.error,
              error: undefined,
            }
          : entry,
      ),
    } satisfies PersistedStyleBatchSession
  }

  function persistStyleBatchSession(
    session: PersistedStyleBatchSession | null,
  ) {
    state.styleBatchSession = session
    if (typeof window === 'undefined') return null

    if (session) {
      return saveStyleBatchSessionToLocalStorage(
        deps.getActiveSceneLevelId(),
        session,
      )
    }

    clearStyleBatchSessionFromLocalStorage(deps.getActiveSceneLevelId())
    return null
  }

  function updatePersistedStyleBatchSession(
    mutator: (
      session: PersistedStyleBatchSession,
    ) => PersistedStyleBatchSession,
  ) {
    if (!state.styleBatchSession) return null
    const next = mutator(
      structuredClone(state.styleBatchSession) as PersistedStyleBatchSession,
    )
    persistStyleBatchSession(next)
    return next
  }

  function createStyleBatchSession(
    mode: 'texture' | 'generate' | 'procedural-material' | 'blender-geometry',
    candidateIds: string[],
    options: {
      scope?: 'batch-selection' | 'selected-objects' | 'visible' | 'level'
      force?: boolean
    } = {},
  ) {
    const entries: PersistedStyleBatchEntry[] = candidateIds
      .map(nodeId => deps.getEditorNodes().find(node => node.id === nodeId))
      .filter(
        (node): node is EditorSceneNode => !!node && canBakeSceneNode(node),
      )
      .map(node => ({
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
      scope: options.scope,
      force: !!options.force,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      styleProfileName: state.styleProfileName,
      stylePrompt: state.stylePrompt,
      styleNegativePrompt: state.styleNegativePrompt,
      styleLoraNotes: state.styleLoraNotes,
      styleControlNetNotes: state.styleControlNetNotes,
      styleReferenceImageUrl: state.styleReferenceImageUrl,
      comfyUiApiUrl: state.comfyUiApiUrl,
      comfyUiLowVramMode: !!state.comfyUiLowVramMode,
      hunyuanApiUrl: state.hunyuanApiUrl,
      workflowPath: state.selectedComfyWorkflowPath,
      entries,
    } satisfies PersistedStyleBatchSession
  }

  return {
    resetQueuedStyleBatchEntriesForResume,
    persistStyleBatchSession,
    updatePersistedStyleBatchSession,
    createStyleBatchSession,
  }
}
