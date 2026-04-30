<script lang="ts">
import { T } from '@threlte/core'
import HeroProp from '../../../components/HeroProp.svelte'

export let x: number
export let z: number
export let lod: number
export let pathTemplate: string

$: url = pathTemplate
  .replace('{x}', x.toString())
  .replace('{z}', z.toString())
  .replace('{lod}', lod.toString())
</script>

<!-- Place the GLB at world origin; its internal geometry is already in world space -->
<T.Group position={[0, 0, 0]}>
  <!-- Visual only - no collision (terrain physics handled by TriMesh collider) -->
  <HeroProp {url} />
</T.Group>
