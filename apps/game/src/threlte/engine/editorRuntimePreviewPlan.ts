export type EditorRuntimePreviewMode =
  | 'disabled'
  | 'edit'
  | 'collision-overlay'
  | 'runtime-preview'

export interface EditorRuntimePreviewPlanInput {
  editorEnabled: boolean
  playtestEnabled: boolean
  collisionOverlayEnabled: boolean
}

export interface EditorRuntimePreviewPlan {
  mode: EditorRuntimePreviewMode
  levelRuntime: {
    ownsRuntimeActors: boolean
    ownsReadiness: boolean
  }
  runtimeActors: {
    mount: boolean
    collisionOnly: boolean
    interactive: boolean
    ownsVisuals: boolean
    ownsGameplay: boolean
  }
  authoring: {
    mount: boolean
    renderVisuals: boolean
    renderGameplay: boolean
    interactive: boolean
    transformOverlay: boolean
  }
  player: {
    mount: boolean
    cameraEnabled: boolean
    gameplayInputEnabled: boolean
  }
}

export interface EditorRuntimePlayerLevelReadyInput {
  editorEnabled: boolean
  playerMounted: boolean
  staticWorldReady: boolean
  editorRuntimeReady: boolean
  levelRuntimeOwnsReadiness?: boolean
}

export interface EditorRuntimeCameraControlInput {
  editorEnabled: boolean
  playerCameraRequested: boolean
  playerLevelReady: boolean
}

export function createEditorRuntimePreviewPlan({
  editorEnabled,
  playtestEnabled,
  collisionOverlayEnabled,
}: EditorRuntimePreviewPlanInput): EditorRuntimePreviewPlan {
  if (!editorEnabled) {
    return {
      mode: 'disabled',
      levelRuntime: {
        ownsRuntimeActors: false,
        ownsReadiness: false,
      },
      runtimeActors: {
        mount: false,
        collisionOnly: false,
        interactive: false,
        ownsVisuals: false,
        ownsGameplay: false,
      },
      authoring: {
        mount: false,
        renderVisuals: false,
        renderGameplay: false,
        interactive: false,
        transformOverlay: false,
      },
      player: {
        mount: false,
        cameraEnabled: true,
        gameplayInputEnabled: true,
      },
    }
  }

  if (playtestEnabled) {
    return {
      mode: 'runtime-preview',
      levelRuntime: {
        ownsRuntimeActors: true,
        ownsReadiness: true,
      },
      runtimeActors: {
        mount: false,
        collisionOnly: false,
        interactive: true,
        ownsVisuals: true,
        ownsGameplay: true,
      },
      authoring: {
        mount: true,
        renderVisuals: false,
        renderGameplay: false,
        interactive: false,
        transformOverlay: true,
      },
      player: {
        mount: true,
        cameraEnabled: true,
        gameplayInputEnabled: true,
      },
    }
  }

  if (collisionOverlayEnabled) {
    return {
      mode: 'collision-overlay',
      levelRuntime: {
        ownsRuntimeActors: false,
        ownsReadiness: false,
      },
      runtimeActors: {
        mount: true,
        collisionOnly: true,
        interactive: false,
        ownsVisuals: false,
        ownsGameplay: false,
      },
      authoring: {
        mount: true,
        renderVisuals: true,
        renderGameplay: true,
        interactive: false,
        transformOverlay: true,
      },
      player: {
        mount: false,
        cameraEnabled: false,
        gameplayInputEnabled: false,
      },
    }
  }

  return {
    mode: 'edit',
    levelRuntime: {
      ownsRuntimeActors: false,
      ownsReadiness: false,
    },
    runtimeActors: {
      mount: false,
      collisionOnly: false,
      interactive: false,
      ownsVisuals: false,
      ownsGameplay: false,
    },
    authoring: {
      mount: true,
      renderVisuals: true,
      renderGameplay: true,
      interactive: false,
      transformOverlay: true,
    },
    player: {
      mount: false,
      cameraEnabled: false,
      gameplayInputEnabled: false,
    },
  }
}

export function resolveEditorRuntimePlayerLevelReady({
  editorEnabled,
  playerMounted,
  staticWorldReady,
  editorRuntimeReady,
  levelRuntimeOwnsReadiness = false,
}: EditorRuntimePlayerLevelReadyInput) {
  return editorEnabled && playerMounted && !levelRuntimeOwnsReadiness
    ? editorRuntimeReady
    : staticWorldReady
}

export function resolveEditorRuntimeCameraControl({
  editorEnabled,
  playerCameraRequested,
  playerLevelReady,
}: EditorRuntimeCameraControlInput) {
  const playerCameraEnabled =
    !editorEnabled || (playerCameraRequested && playerLevelReady)

  return {
    playerCameraEnabled,
    editorUsesActiveCamera: editorEnabled && playerCameraEnabled,
  }
}
