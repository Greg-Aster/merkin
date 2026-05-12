import type { EditorSceneDocument, EditorSceneNode } from './editorTypes'
import mirandaPackagedScene from './scenes/miranda.scene.json'
import observatoryPackagedScene from './scenes/observatory.scene.json'
import sciFiRoomPackagedScene from './scenes/sci-fi-room.scene.json'
import solitudePackagedScene from './scenes/solitude.scene.json'
import yggdrasilPackagedScene from './scenes/yggdrasil.scene.json'

function nowIso() {
  return new Date().toISOString()
}

const SCI_FI_ROOM_SCENE_VERSION = 5
const SCI_FI_PLANTER_B_ASSET_URL =
  '/generated/hunyuan3d/growth-planter-b-generated-2026-04-18t01-36-15-986z/growth-planter-b-generated-2026-04-18t01-36-15-986z-texture-wrap-2026-04-18T01-38-19-536Z.glb'

const PACKAGED_DEFAULT_SCENES: Record<string, EditorSceneDocument> = {
  observatory: observatoryPackagedScene as unknown as EditorSceneDocument,
  'sci-fi-room': sciFiRoomPackagedScene as unknown as EditorSceneDocument,
  miranda: mirandaPackagedScene as unknown as EditorSceneDocument,
  solitude: solitudePackagedScene as unknown as EditorSceneDocument,
  yggdrasil: yggdrasilPackagedScene as unknown as EditorSceneDocument,
}

function getPackagedDefaultScene(levelId: string) {
  const scene = PACKAGED_DEFAULT_SCENES[levelId]
  return scene ? (structuredClone(scene) as EditorSceneDocument) : null
}

// Legacy migration: early sci-fi-room scene documents stored this planter as a
// prefab even though the runtime expects the authored GLB asset.
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

export function upgradeLegacySceneDocument(
  scene: EditorSceneDocument,
): EditorSceneDocument {
  const normalizedScene =
    scene.levelId === 'sci-fi-room' ? normalizeSciFiPlanterB(scene) : scene

  const defaultScene = createDefaultSceneForLevel(normalizedScene.levelId)
  const nextVersion =
    normalizedScene.levelId === 'sci-fi-room'
      ? Math.max(normalizedScene.version, SCI_FI_ROOM_SCENE_VERSION)
      : normalizedScene.version

  if (!defaultScene.nodes.length) {
    return {
      ...normalizedScene,
      version: nextVersion,
    }
  }

  const existingIds = new Set(normalizedScene.nodes.map(node => node.id))
  const missingDefaultNodes = defaultScene.nodes.filter(
    node => !existingIds.has(node.id),
  )

  if (missingDefaultNodes.length === 0) {
    return {
      ...normalizedScene,
      version: nextVersion,
    }
  }

  const defaultNodeCount = defaultScene.nodes.length
  const currentNodeCount = normalizedScene.nodes.length
  const missingRatio =
    missingDefaultNodes.length / Math.max(defaultNodeCount, 1)
  const shouldRepairFromDefaults =
    currentNodeCount === 0 ||
    currentNodeCount < defaultNodeCount * 0.75 ||
    missingRatio > 0.2

  if (!shouldRepairFromDefaults) {
    return {
      ...normalizedScene,
      version: nextVersion,
    }
  }

  return {
    ...normalizedScene,
    version: nextVersion,
    nodes: [...normalizedScene.nodes, ...missingDefaultNodes],
  }
}

export function createDefaultSceneForLevel(
  levelId: string,
): EditorSceneDocument {
  const packagedScene = getPackagedDefaultScene(levelId)
  if (packagedScene) {
    return packagedScene
  }

  return {
    levelId,
    version: 1,
    updatedAt: nowIso(),
    nodes: [],
  }
}
