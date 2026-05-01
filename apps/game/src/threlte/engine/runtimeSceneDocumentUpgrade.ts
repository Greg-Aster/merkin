import type {
  EditorSceneDocument,
  EditorSceneNode,
} from './sceneDocumentTypes'

const SCI_FI_ROOM_SCENE_VERSION = 5
const SCI_FI_PLANTER_B_ASSET_URL =
  '/generated/hunyuan3d/growth-planter-b-generated-2026-04-18t01-36-15-986z/growth-planter-b-generated-2026-04-18t01-36-15-986z-texture-wrap-2026-04-18T01-38-19-536Z.glb'

function normalizeSciFiPlanterB(
  scene: EditorSceneDocument,
): EditorSceneDocument {
  const planterIndex = scene.nodes.findIndex(
    node => node.id === 'sci-fi-planter-b',
  )
  if (planterIndex === -1) return scene

  const planter = scene.nodes[planterIndex]
  const nextPlanter: EditorSceneNode = {
    ...planter,
    kind: 'asset',
    position: [3.0, 0, 25.52],
    rotation: [0, 0.6, 0],
    scale: [1, 1, 1],
    visible: true,
    asset: { url: SCI_FI_PLANTER_B_ASSET_URL },
  }

  nextPlanter.prefab = undefined

  const nextNodes = [...scene.nodes]
  nextNodes[planterIndex] = nextPlanter

  return {
    ...scene,
    nodes: nextNodes,
  }
}

export function upgradeRuntimeSceneDocument(
  scene: EditorSceneDocument,
): EditorSceneDocument {
  if (scene.levelId !== 'sci-fi-room') return scene

  const normalizedScene = normalizeSciFiPlanterB(scene)
  return {
    ...normalizedScene,
    version: Math.max(normalizedScene.version, SCI_FI_ROOM_SCENE_VERSION),
  }
}
