<script lang="ts">
import { T } from '@threlte/core'
import * as THREE from 'three'
import { levelEditorSettingsStore } from './editorSelectors'

const FALLBACK_POSITION: [number, number, number] = [0, 1, 0]
const FALLBACK_ROTATION: [number, number, number] = [0, 0, 0]

function toVec3(
  value: [number, number, number] | undefined,
  fallback: [number, number, number],
): [number, number, number] {
  if (!value || value.length !== 3 || !value.every(Number.isFinite)) {
    return fallback
  }
  return [value[0], value[1], value[2]]
}

$: spawnPosition = toVec3(
  $levelEditorSettingsStore?.spawn?.position,
  FALLBACK_POSITION,
)
$: spawnRotation = toVec3(
  $levelEditorSettingsStore?.spawn?.rotation,
  FALLBACK_ROTATION,
)
$: spawnYaw = spawnRotation[1] ?? 0
</script>

<T.Group
  name="editor-player-spawn-marker"
  position={spawnPosition}
  rotation={[0, spawnYaw, 0]}
  userData={{ renderStyleSkip: true }}
>
  <T.Mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} renderOrder={32}>
    <T.RingGeometry args={[0.75, 0.82, 48]} />
    <T.MeshBasicMaterial
      color="#54dfff"
      transparent={true}
      opacity={0.88}
      depthTest={false}
      depthWrite={false}
      side={THREE.DoubleSide}
    />
  </T.Mesh>

  <T.Mesh position={[0, 0.9, 0]} renderOrder={33}>
    <T.SphereGeometry args={[0.22, 18, 12]} />
    <T.MeshBasicMaterial
      color="#fff4bf"
      transparent={true}
      opacity={0.95}
      depthTest={false}
      depthWrite={false}
    />
  </T.Mesh>

  <T.Mesh position={[0, 0.45, 0]} renderOrder={33}>
    <T.CylinderGeometry args={[0.18, 0.24, 0.82, 18]} />
    <T.MeshBasicMaterial
      color="#54dfff"
      transparent={true}
      opacity={0.72}
      depthTest={false}
      depthWrite={false}
    />
  </T.Mesh>

  <T.Mesh position={[0, 3.2, 0]} renderOrder={32}>
    <T.CylinderGeometry args={[0.035, 0.035, 4.8, 10]} />
    <T.MeshBasicMaterial
      color="#54dfff"
      transparent={true}
      opacity={0.54}
      depthTest={false}
      depthWrite={false}
    />
  </T.Mesh>

  <T.Mesh position={[0, 5.75, 0]} renderOrder={34}>
    <T.SphereGeometry args={[0.34, 18, 12]} />
    <T.MeshBasicMaterial
      color="#54dfff"
      transparent={true}
      opacity={0.78}
      depthTest={false}
      depthWrite={false}
    />
  </T.Mesh>

  <T.Mesh position={[0, 0.08, -1.1]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={34}>
    <T.ConeGeometry args={[0.25, 0.58, 24]} />
    <T.MeshBasicMaterial
      color="#ffcf70"
      transparent={true}
      opacity={0.94}
      depthTest={false}
      depthWrite={false}
    />
  </T.Mesh>

  <T.Mesh position={[0, 0.08, -0.55]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={33}>
    <T.CylinderGeometry args={[0.055, 0.055, 0.82, 12]} />
    <T.MeshBasicMaterial
      color="#ffcf70"
      transparent={true}
      opacity={0.82}
      depthTest={false}
      depthWrite={false}
    />
  </T.Mesh>
</T.Group>
