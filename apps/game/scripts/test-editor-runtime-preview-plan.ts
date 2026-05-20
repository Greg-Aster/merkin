import assert from 'node:assert/strict'
import {
  createEditorRuntimePreviewPlan,
  resolveEditorRuntimeCameraControl,
  resolveEditorRuntimePlayerLevelReady,
} from '../src/threlte/engine/editorRuntimePreviewPlan.ts'

const disabled = createEditorRuntimePreviewPlan({
  editorEnabled: false,
  playtestEnabled: false,
  collisionOverlayEnabled: false,
})
assert.equal(disabled.mode, 'disabled')
assert.equal(disabled.levelRuntime.ownsRuntimeActors, false)
assert.equal(disabled.levelRuntime.ownsReadiness, false)
assert.equal(disabled.runtimeActors.mount, false)
assert.equal(disabled.authoring.mount, false)
assert.equal(disabled.player.cameraEnabled, true)

const edit = createEditorRuntimePreviewPlan({
  editorEnabled: true,
  playtestEnabled: false,
  collisionOverlayEnabled: false,
})
assert.equal(edit.mode, 'edit')
assert.equal(edit.levelRuntime.ownsRuntimeActors, false)
assert.equal(edit.levelRuntime.ownsReadiness, false)
assert.equal(edit.runtimeActors.mount, false)
assert.equal(edit.authoring.renderVisuals, true)
assert.equal(edit.authoring.renderGameplay, true)
assert.equal(edit.authoring.interactive, false)
assert.equal(edit.player.mount, false)

const collisionOverlay = createEditorRuntimePreviewPlan({
  editorEnabled: true,
  playtestEnabled: false,
  collisionOverlayEnabled: true,
})
assert.equal(collisionOverlay.mode, 'collision-overlay')
assert.equal(collisionOverlay.levelRuntime.ownsRuntimeActors, false)
assert.equal(collisionOverlay.levelRuntime.ownsReadiness, false)
assert.equal(collisionOverlay.runtimeActors.mount, true)
assert.equal(collisionOverlay.runtimeActors.collisionOnly, true)
assert.equal(collisionOverlay.runtimeActors.interactive, false)
assert.equal(collisionOverlay.authoring.renderVisuals, true)
assert.equal(collisionOverlay.player.gameplayInputEnabled, false)

const runtimePreview = createEditorRuntimePreviewPlan({
  editorEnabled: true,
  playtestEnabled: true,
  collisionOverlayEnabled: true,
})
assert.equal(runtimePreview.mode, 'runtime-preview')
assert.equal(runtimePreview.levelRuntime.ownsRuntimeActors, true)
assert.equal(runtimePreview.levelRuntime.ownsReadiness, true)
assert.equal(runtimePreview.runtimeActors.mount, false)
assert.equal(runtimePreview.runtimeActors.collisionOnly, false)
assert.equal(runtimePreview.runtimeActors.interactive, true)
assert.equal(runtimePreview.runtimeActors.ownsVisuals, true)
assert.equal(runtimePreview.runtimeActors.ownsGameplay, true)
assert.equal(runtimePreview.authoring.renderVisuals, false)
assert.equal(runtimePreview.authoring.renderGameplay, false)
assert.equal(runtimePreview.authoring.transformOverlay, true)
assert.equal(runtimePreview.player.mount, true)
assert.equal(runtimePreview.player.cameraEnabled, true)
assert.equal(runtimePreview.player.gameplayInputEnabled, true)

assert.equal(
  resolveEditorRuntimePlayerLevelReady({
    editorEnabled: false,
    playerMounted: false,
    staticWorldReady: true,
    editorRuntimeReady: false,
  }),
  true,
)
assert.equal(
  resolveEditorRuntimePlayerLevelReady({
    editorEnabled: true,
    playerMounted: false,
    staticWorldReady: true,
    editorRuntimeReady: false,
  }),
  true,
)
assert.equal(
  resolveEditorRuntimePlayerLevelReady({
    editorEnabled: true,
    playerMounted: true,
    staticWorldReady: true,
    editorRuntimeReady: false,
  }),
  false,
)
assert.equal(
  resolveEditorRuntimePlayerLevelReady({
    editorEnabled: true,
    playerMounted: true,
    staticWorldReady: false,
    editorRuntimeReady: true,
  }),
  true,
)
assert.equal(
  resolveEditorRuntimePlayerLevelReady({
    editorEnabled: true,
    playerMounted: true,
    staticWorldReady: true,
    editorRuntimeReady: false,
    levelRuntimeOwnsReadiness: true,
  }),
  true,
)

assert.deepEqual(
  resolveEditorRuntimeCameraControl({
    editorEnabled: true,
    playerCameraRequested: true,
    playerLevelReady: false,
  }),
  {
    playerCameraEnabled: false,
    editorUsesActiveCamera: false,
  },
)
assert.deepEqual(
  resolveEditorRuntimeCameraControl({
    editorEnabled: true,
    playerCameraRequested: true,
    playerLevelReady: true,
  }),
  {
    playerCameraEnabled: true,
    editorUsesActiveCamera: true,
  },
)
assert.deepEqual(
  resolveEditorRuntimeCameraControl({
    editorEnabled: false,
    playerCameraRequested: false,
    playerLevelReady: false,
  }),
  {
    playerCameraEnabled: true,
    editorUsesActiveCamera: false,
  },
)

console.log('editor runtime preview plan contract ok')
