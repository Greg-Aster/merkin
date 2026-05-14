<script lang="ts">
import { T } from '@threlte/core'
import { createEventDispatcher } from 'svelte'
import HeroProp from '../../../components/HeroProp.svelte'
import type { SceneMaterialData } from '../../../engine/sceneDocumentTypes'

const dispatch = createEventDispatcher()

export let x: number
export let z: number
export let lod: number
export let pathTemplate: string
export let levelId: string | null = null
export let materialOverride: SceneMaterialData | null = null

$: url = pathTemplate
  .replace('{x}', x.toString())
  .replace('{z}', z.toString())
  .replace('{lod}', lod.toString())

function handleLoad(event: CustomEvent) {
  dispatch('load', { ...event.detail, url, x, z, lod })
}

function handleError(event: CustomEvent) {
  dispatch('error', { ...event.detail, url, x, z, lod })
}
</script>

<!-- Place the GLB at world origin; its internal geometry is already in world space -->
<T.Group position={[0, 0, 0]}>
  <!-- Visual only - no collision (terrain physics handled by TriMesh collider) -->
  <HeroProp
    {url}
    {levelId}
    {materialOverride}
    runtimeCulling={false}
    cloneMaterials={true}
    on:load={handleLoad}
    on:error={handleError}
  />
</T.Group>
