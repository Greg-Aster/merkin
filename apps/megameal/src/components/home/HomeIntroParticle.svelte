<script lang="ts">
import { T, useTask } from '@threlte/core'
import { AdditiveBlending, NormalBlending } from 'three'
import type { Mesh, MeshBasicMaterial } from 'three'

type IntroInputState = {
  x: number
  y: number
  dragX: number
  dragY: number
  wheel: number
  active: boolean
}

type ParticleConfig = {
  anchorX: number
  anchorY: number
  anchorZ: number
  angle: number
  cluster: number
  clusterStrength: number
  height: number
  radius: number
  phase: number
  radialT: number
  speed: number
  size: number
  hueOffset: number
  zOffset: number
}

export let index: number
export let input: IntroInputState
export let particle: ParticleConfig

let mesh: Mesh | null = null
let material: MeshBasicMaterial | null = null
let outlineMaterial: MeshBasicMaterial | null = null

const additiveBlending = AdditiveBlending
const normalBlending = NormalBlending

useTask(() => {
  const time = performance.now() * 0.001
  const pointerX = Number.isFinite(input.x) ? input.x : 0
  const wheel = Number.isFinite(input.wheel) ? input.wheel : 0
  const spin = particle.angle + time * particle.speed + input.dragX * 0.42
  const pulse = Math.sin(time * 1.25 + index) * 0.22 + 0.78
  const centerWeight = 1 - particle.radialT
  const clusterPulse = Math.sin(time * 0.72 + particle.phase + particle.cluster)
  const clusterOrbit =
    Math.sin(time * 0.36 + particle.cluster * 1.7) *
    particle.clusterStrength *
    0.08
  const reactiveRadius =
    particle.radius * (1 + clusterPulse * particle.clusterStrength * 0.06) +
    clusterOrbit +
    (input.active ? 0.07 : 0.028) * Math.sin(time * 2.2 + index)
  const groupedSpin =
    spin +
    Math.sin(time * 0.42 + particle.phase) * particle.clusterStrength * 0.08

  if (mesh) {
    mesh.position.x =
      particle.anchorX +
      Math.cos(groupedSpin) * reactiveRadius +
      pointerX * 0.08
    mesh.position.y =
      particle.anchorY +
      particle.height +
      wheel * 0.24 +
      Math.sin(time * 1.1 + particle.phase) *
        (0.05 + particle.clusterStrength * 0.11)
    mesh.position.z =
      particle.anchorZ +
      particle.zOffset +
      Math.sin(groupedSpin) * reactiveRadius * 0.72
    mesh.scale.setScalar(particle.size * (1.12 + pulse * 0.42))
  }

  if (material) {
    const hue = particle.hueOffset + Math.sin(time * 0.08 + index) * 0.025
    material.color.setHSL(hue, 0.92, 0.18 + centerWeight * 0.16)
    material.opacity = Math.min(0.72, 0.18 + centerWeight * 0.34 + pulse * 0.03)
  }

  if (outlineMaterial) {
    const hue = particle.hueOffset + 0.04
    outlineMaterial.color.setHSL(hue, 1, 0.5)
    outlineMaterial.opacity = 0.09 + centerWeight * 0.2
  }
})
</script>

<T.Mesh bind:ref={mesh}>
	<T.SphereGeometry args={[1, 8, 6]} />
	<T.MeshBasicMaterial
		bind:ref={material}
		color="#312e81"
		transparent={true}
		opacity={0.76}
		blending={normalBlending}
		depthWrite={false}
	/>
	<T.Mesh scale={[1.92, 1.92, 1.92]}>
		<T.SphereGeometry args={[1, 8, 6]} />
		<T.MeshBasicMaterial
			bind:ref={outlineMaterial}
			color="#2563eb"
			transparent={true}
			opacity={0.28}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>
</T.Mesh>
