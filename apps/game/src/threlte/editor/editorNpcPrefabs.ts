import { createDefaultFireflyNpc } from './editorNpcControls'
import type { EditorSceneNode } from './editorTypes'

export function createEditorFireflyNpcNode(options: {
  id: string
  name?: string
  parentId?: string | null
  position?: [number, number, number]
  displayName?: string
  title?: string
  excerpt?: string
  body?: string
  color?: string
  secondaryColor?: string
}): EditorSceneNode {
  const name = options.name ?? 'Firefly NPC'
  const npc = createDefaultFireflyNpc({
    id: options.id,
    displayName: options.displayName ?? name,
    title: options.title ?? name,
    excerpt: options.excerpt,
    body: options.body,
  })

  return {
    id: options.id,
    name,
    kind: 'group',
    parentId: options.parentId ?? null,
    position: options.position ?? [0, 2.4, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    npc: {
      ...npc,
      presentation:
        npc.presentation.type === 'firefly'
          ? {
              ...npc.presentation,
              color: options.color ?? npc.presentation.color,
              secondaryColor:
                options.secondaryColor ?? npc.presentation.secondaryColor,
            }
          : npc.presentation,
    },
  }
}
