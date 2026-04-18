import type { EditorSceneDocument, EditorSceneSettings } from './editorTypes'

export type EditorSceneSettingsCommand = {
  type: 'replace-settings'
  settings: EditorSceneSettings
}

export interface ApplyEditorSceneSettingsCommandsResult {
  scene: EditorSceneDocument
  changed: boolean
}

function withUpdatedTimestamp(scene: EditorSceneDocument) {
  return {
    ...scene,
    updatedAt: new Date().toISOString(),
  }
}

export function applyEditorSceneSettingsCommand(
  scene: EditorSceneDocument,
  command: EditorSceneSettingsCommand
): ApplyEditorSceneSettingsCommandsResult {
  switch (command.type) {
    case 'replace-settings':
      return {
        scene: withUpdatedTimestamp({
          ...scene,
          settings: structuredClone(command.settings) as EditorSceneSettings,
        }),
        changed: true,
      }
  }
}

export function applyEditorSceneSettingsCommands(
  scene: EditorSceneDocument,
  commands: EditorSceneSettingsCommand[]
): ApplyEditorSceneSettingsCommandsResult {
  let nextScene = scene
  let changed = false

  for (const command of commands) {
    const result = applyEditorSceneSettingsCommand(nextScene, command)
    nextScene = result.scene
    changed = changed || result.changed
  }

  return {
    scene: nextScene,
    changed,
  }
}
