<script lang="ts">
  import { onDestroy } from 'svelte'
  import { T } from '@threlte/core'
  import { editorStateStore } from './editorStore'

  let editorState

  const unsub = editorStateStore.subscribe((value) => {
    editorState = value
  })

  $: workbenchEnabled = !!editorState?.enabled && editorState.viewportLightingMode === 'workbench'

  onDestroy(() => {
    unsub()
  })
</script>

{#if workbenchEnabled}
  <T.Group name="editor-workbench-lighting">
    <T.AmbientLight color="#ffffff" intensity={2.2} />
    <T.HemisphereLight skyColor="#f4f8ff" groundColor="#b7c3d8" intensity={1.6} />
    <T.DirectionalLight position={[24, 36, 18]} color="#ffffff" intensity={1.5} castShadow={false} />
    <T.DirectionalLight position={[-22, 18, -16]} color="#d8e7ff" intensity={1.15} castShadow={false} />
    <T.DirectionalLight position={[0, 12, 24]} color="#fff2dd" intensity={0.9} castShadow={false} />
  </T.Group>
{/if}
