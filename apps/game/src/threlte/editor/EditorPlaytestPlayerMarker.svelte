<script lang="ts">
import { T } from '@threlte/core'
import * as THREE from 'three'
import type { Vec3 } from '../engine/types'

export let position: Vec3 | null = null
export let rotation: Vec3 | null = null

$: markerPosition = position ?? ([0, 1, 0] as Vec3)
$: markerYaw = rotation?.[1] ?? 0
</script>

{#if position}
  <T.Group
    name="editor-live-playtest-player-marker"
    position={markerPosition}
    rotation={[0, markerYaw, 0]}
    userData={{ renderStyleSkip: true }}
  >
    <T.Mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} renderOrder={42}>
      <T.RingGeometry args={[0.46, 0.54, 42]} />
      <T.MeshBasicMaterial
        color="#7cffb2"
        transparent={true}
        opacity={0.92}
        depthTest={false}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </T.Mesh>

    <T.Mesh position={[0, 0.9, 0]} renderOrder={43}>
      <T.CapsuleGeometry args={[0.32, 1.05, 6, 18]} />
      <T.MeshBasicMaterial
        color="#7cffb2"
        transparent={true}
        opacity={0.56}
        depthTest={false}
        depthWrite={false}
      />
    </T.Mesh>

    <T.Mesh position={[0, 1.78, 0]} renderOrder={44}>
      <T.SphereGeometry args={[0.18, 18, 12]} />
      <T.MeshBasicMaterial
        color="#fff5b8"
        transparent={true}
        opacity={0.94}
        depthTest={false}
        depthWrite={false}
      />
    </T.Mesh>

    <T.Mesh position={[0, 0.1, -0.78]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={44}>
      <T.ConeGeometry args={[0.2, 0.48, 24]} />
      <T.MeshBasicMaterial
        color="#fff5b8"
        transparent={true}
        opacity={0.94}
        depthTest={false}
        depthWrite={false}
      />
    </T.Mesh>

    <T.Mesh position={[0, 0.1, -0.38]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={43}>
      <T.CylinderGeometry args={[0.045, 0.045, 0.58, 12]} />
      <T.MeshBasicMaterial
        color="#7cffb2"
        transparent={true}
        opacity={0.8}
        depthTest={false}
        depthWrite={false}
      />
    </T.Mesh>
  </T.Group>
{/if}
