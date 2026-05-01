import type { SceneDocument } from './sceneDocumentTypes'

const packagedSceneModules = import.meta.glob('../editor/scenes/*.scene.json', {
  eager: true,
  import: 'default',
}) as Record<string, SceneDocument>

function cloneScene(scene: SceneDocument) {
  return structuredClone(scene) as SceneDocument
}

function getSceneIdFromPath(path: string) {
  return path.split('/').pop()?.replace(/\.scene\.json$/, '') ?? ''
}

const packagedScenes = new Map(
  Object.entries(packagedSceneModules).map(([path, scene]) => [
    getSceneIdFromPath(path),
    scene,
  ]),
)

export function listPackagedSceneIds() {
  return Array.from(packagedScenes.keys()).sort()
}

export function getPackagedSceneDocument(sceneId: string) {
  const scene = packagedScenes.get(sceneId)
  return scene ? cloneScene(scene) : null
}

export function requirePackagedSceneDocument(sceneId: string) {
  const scene = getPackagedSceneDocument(sceneId)

  if (!scene) {
    throw new Error(`${sceneId}: packaged runtime scene document not found.`)
  }

  return scene
}
