import type { EditorSceneDocument } from './sceneDocumentTypes'

const sceneModules = import.meta.glob('../editor/scenes/*.scene.json', {
  eager: true,
  import: 'default',
}) as Record<string, EditorSceneDocument>

export interface RuntimeSceneDocumentLoadResult {
  scene: EditorSceneDocument
  source: 'packaged'
}

function cloneScene(scene: EditorSceneDocument) {
  return structuredClone(scene) as EditorSceneDocument
}

export async function loadRuntimeSceneDocument(
  levelId: string,
): Promise<RuntimeSceneDocumentLoadResult> {
  const match = Object.entries(sceneModules).find(([path]) =>
    path.endsWith(`/${levelId}.scene.json`),
  )

  if (!match) {
    throw new Error(`${levelId}: packaged runtime scene document not found.`)
  }

  return {
    scene: cloneScene(match[1]),
    source: 'packaged',
  }
}
