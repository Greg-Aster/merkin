import {
  type ApplyEditorNodeCommandsResult,
  type EditorNodeCommand,
  type EditorNodeTransformPatch,
  type EditorSceneNodePatch,
  applyEditorNodeCommand,
} from './editorNodeCommands'
import {
  type ApplyEditorSceneSettingsCommandsResult,
  type EditorSceneSettingsCommand,
  applyEditorSceneSettingsCommand,
} from './editorSceneCommands'
import type { EditorSceneDocument } from './editorTypes'

export type EditorSceneCommand = EditorNodeCommand | EditorSceneSettingsCommand

export type ApplyEditorSceneCommandsResult =
  | ApplyEditorNodeCommandsResult
  | ApplyEditorSceneSettingsCommandsResult

export type { EditorNodeTransformPatch, EditorSceneNodePatch }

export function applyEditorSceneCommand(
  scene: EditorSceneDocument,
  command: EditorSceneCommand,
): ApplyEditorSceneCommandsResult {
  switch (command.type) {
    case 'replace-settings':
      return applyEditorSceneSettingsCommand(scene, command)
    case 'add-node':
    case 'replace-node':
    case 'patch-node':
    case 'remove-nodes':
    case 'reparent-node':
      return applyEditorNodeCommand(scene, command)
  }
}

export function applyEditorSceneCommands(
  scene: EditorSceneDocument,
  commands: EditorSceneCommand[],
): ApplyEditorSceneCommandsResult {
  let nextScene = scene
  let changed = false

  for (const command of commands) {
    const result = applyEditorSceneCommand(nextScene, command)
    nextScene = result.scene
    changed = changed || result.changed
  }

  return {
    scene: nextScene,
    changed,
  }
}
