<script lang="ts">
import { T } from '@threlte/core'
import { Collider } from '@threlte/rapier'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import { loadCachedGltf } from '../utils/gltfAssetCache'

export let url = ''
export let friction = 0.7
export let restitution = 0
export let sensor = false

type MeshColliderPatch = {
  id: string
  vertices: Float32Array
  indices: Uint32Array
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

let patches: MeshColliderPatch[] = []
let disposed = false
let loadToken = 0
let loadedUrl = ''

function getGeometryPatch(
  mesh: THREE.Mesh,
  index: number,
): MeshColliderPatch | null {
  const geometry = mesh.geometry
  const positionAttribute = geometry?.getAttribute('position')
  if (!positionAttribute || positionAttribute.count < 3) return null

  const vertices = new Float32Array(positionAttribute.count * 3)
  for (let i = 0; i < positionAttribute.count; i += 1) {
    vertices[i * 3] = positionAttribute.getX(i)
    vertices[i * 3 + 1] = positionAttribute.getY(i)
    vertices[i * 3 + 2] = positionAttribute.getZ(i)
  }

  const geometryIndex = geometry.index
  const indices = geometryIndex
    ? new Uint32Array(Array.from(geometryIndex.array))
    : new Uint32Array(
        Array.from({ length: positionAttribute.count }, (_, i) => i),
      )

  if (indices.length < 3) return null

  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  mesh.matrixWorld.decompose(position, quaternion, scale)
  const rotation = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ')

  return {
    id: `${mesh.name || 'mesh'}-${index}`,
    vertices,
    indices,
    position: [position.x, position.y, position.z],
    rotation: [rotation.x, rotation.y, rotation.z],
    scale: [scale.x, scale.y, scale.z],
  }
}

async function loadColliderPatches(nextUrl: string) {
  const token = ++loadToken

  try {
    const gltf = await loadCachedGltf(nextUrl)
    if (disposed || token !== loadToken) return

    const nextPatches: MeshColliderPatch[] = []
    gltf.scene.updateWorldMatrix(true, true)
    gltf.scene.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return
      const patch = getGeometryPatch(child, nextPatches.length)
      if (patch) nextPatches.push(patch)
    })

    patches = nextPatches
  } catch (error) {
    if (!disposed) {
      console.warn('Failed to build asset trimesh collider:', nextUrl, error)
    }
    patches = []
  }
}

$: if (url && url !== loadedUrl) {
  loadedUrl = url
  void loadColliderPatches(url)
}

onDestroy(() => {
  disposed = true
  loadToken += 1
})
</script>

{#each patches as patch (patch.id)}
  <T.Group position={patch.position} rotation={patch.rotation} scale={patch.scale}>
    <Collider
      shape="trimesh"
      args={[patch.vertices, patch.indices]}
      {friction}
      {restitution}
      {sensor}
    />
  </T.Group>
{/each}
