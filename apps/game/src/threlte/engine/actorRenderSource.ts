import type { EditorSceneNode } from './sceneDocumentTypes'
import type { ActorDefinition } from './types'

export type MeshRenderSource =
  | {
      kind: 'asset'
      asset: NonNullable<NonNullable<ActorDefinition['render']>['asset']>
    }
  | {
      kind: 'prefab'
      prefab: NonNullable<NonNullable<ActorDefinition['render']>['prefab']>
    }
  | {
      kind: 'primitive'
      primitive: NonNullable<
        NonNullable<ActorDefinition['render']>['primitive']
      >
    }
  | { kind: 'none' }

export function getActorMeshRenderSource(actor: ActorDefinition): MeshRenderSource {
  const render = actor.render
  if (render?.asset) return { kind: 'asset', asset: render.asset }
  if (render?.prefab) return { kind: 'prefab', prefab: render.prefab }
  if (render?.primitive) {
    return { kind: 'primitive', primitive: render.primitive }
  }
  return { kind: 'none' }
}

export function getSceneNodeMeshRenderSource(node: EditorSceneNode): MeshRenderSource {
  if (node.asset) return { kind: 'asset', asset: node.asset }
  if (node.prefab) return { kind: 'prefab', prefab: node.prefab }
  if (node.primitive) return { kind: 'primitive', primitive: node.primitive }
  return { kind: 'none' }
}

export function hasMeshRenderSource(
  actorOrNode: ActorDefinition | EditorSceneNode,
) {
  if ('transform' in actorOrNode) {
    return getActorMeshRenderSource(actorOrNode).kind !== 'none'
  }
  return getSceneNodeMeshRenderSource(actorOrNode).kind !== 'none'
}
