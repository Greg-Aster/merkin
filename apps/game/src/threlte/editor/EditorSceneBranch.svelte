<script lang="ts">
import EditorSceneNode from './EditorSceneNode.svelte'
import type { EditorSceneNode as SceneNode } from './editorStore'
import type { EditorSceneSettings } from './editorTypes'

export let node: SceneNode
export let nodes: SceneNode[] = []
export let editorEnabled = false
export let selectedNodeId: string | null = null
export let selectedNodeIds: string[] = []
export let sceneSettings: EditorSceneSettings | null = null
export let interactionSystem: any = null
export let interactiveEnabled = false

$: childNodes = nodes.filter(child => child.parentId === node.id)
</script>

<EditorSceneNode
  {node}
  {editorEnabled}
  selected={selectedNodeIds.includes(node.id)}
  {sceneSettings}
  {interactionSystem}
  {interactiveEnabled}
  on:portalTransition
  on:noteRead
>
  {#each childNodes as child (child.id)}
    <svelte:self
      node={child}
      {nodes}
      {editorEnabled}
      {selectedNodeId}
      {selectedNodeIds}
      {sceneSettings}
      {interactionSystem}
      {interactiveEnabled}
      on:portalTransition
      on:noteRead
    />
  {/each}
</EditorSceneNode>
