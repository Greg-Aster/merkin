import type { EditorSceneDocument } from '../engine/sceneDocumentTypes'
import {
  type EditorPublishReadinessViewModel,
  createEmptyEditorPublishReadinessViewModel,
} from './editorPublishReadinessContracts'
import { loadEditorPublishReadiness } from './editorPublishReadinessDataSource'
import type { EditorTerrainSourceAssetStatus } from './editorTerrainPipeline'

export type EditorPublishReadinessState = EditorPublishReadinessViewModel & {
  loading: boolean
  error: string
}

type RefreshInput = {
  levelId: string
  scene: EditorSceneDocument | null
  terrainSourceAssets?: EditorTerrainSourceAssetStatus[]
  missingTerrainSourceAssets?: EditorTerrainSourceAssetStatus[]
}

type RefreshOptions = {
  force?: boolean
}

type ControllerDeps = {
  onState: (state: EditorPublishReadinessState) => void
}

export function createInitialEditorPublishReadinessState(
  levelId = '',
): EditorPublishReadinessState {
  return {
    ...createEmptyEditorPublishReadinessViewModel(levelId),
    loading: true,
    error: '',
  }
}

function getReadinessInputKey(input: RefreshInput) {
  return `${input.levelId}::${input.scene?.updatedAt ?? ''}::${JSON.stringify(input.missingTerrainSourceAssets ?? [])}`
}

export function createEditorPublishReadinessController(deps: ControllerDeps) {
  let state = createInitialEditorPublishReadinessState()
  let activeInputKey = ''
  let requestId = 0
  let destroyed = false

  function setState(nextState: EditorPublishReadinessState) {
    state = nextState
    deps.onState(state)
  }

  function getState() {
    return state
  }

  async function refresh(input: RefreshInput, options: RefreshOptions = {}) {
    const inputKey = getReadinessInputKey(input)
    if (!options.force && inputKey === activeInputKey) return state

    activeInputKey = inputKey
    const currentRequestId = (requestId += 1)

    if (!input.levelId) {
      const nextState = {
        ...createInitialEditorPublishReadinessState(input.levelId),
        loading: false,
        error: 'No level selected.',
      }
      setState(nextState)
      return nextState
    }

    setState({
      ...state,
      levelId: input.levelId,
      loading: true,
      error: '',
    })

    try {
      const viewModel = await loadEditorPublishReadiness(input)
      if (destroyed || currentRequestId !== requestId) return state

      const nextState = {
        ...viewModel,
        loading: false,
        error: '',
      }
      setState(nextState)
      return nextState
    } catch (error) {
      if (destroyed || currentRequestId !== requestId) return state

      const nextState = {
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : 'manifest fetch failed',
      }
      setState(nextState)
      return nextState
    }
  }

  function destroy() {
    destroyed = true
    requestId += 1
  }

  return {
    destroy,
    getState,
    refresh,
  }
}
