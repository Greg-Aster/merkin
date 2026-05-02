<script lang="ts" context="module">
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Texture } from 'three'

let sharedReflectionTexture: Texture | null = null

function getReflectionTexture() {
  if (sharedReflectionTexture) return sharedReflectionTexture
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (!context) return null

  const gradient = context.createLinearGradient(0, 0, canvas.width, 0)
  gradient.addColorStop(0, 'rgb(255 255 255 / 0)')
  gradient.addColorStop(0.28, 'rgb(125 211 252 / 0.12)')
  gradient.addColorStop(0.5, 'rgb(255 255 255 / 0.82)')
  gradient.addColorStop(0.72, 'rgb(217 70 239 / 0.16)')
  gradient.addColorStop(1, 'rgb(255 255 255 / 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const verticalFade = context.createLinearGradient(0, 0, 0, canvas.height)
  verticalFade.addColorStop(0, 'rgb(0 0 0 / 0)')
  verticalFade.addColorStop(0.48, 'rgb(0 0 0 / 1)')
  verticalFade.addColorStop(1, 'rgb(0 0 0 / 0)')
  context.globalCompositeOperation = 'destination-in'
  context.fillStyle = verticalFade
  context.fillRect(0, 0, canvas.width, canvas.height)

  sharedReflectionTexture = new CanvasTexture(canvas)
  sharedReflectionTexture.colorSpace = SRGBColorSpace
  sharedReflectionTexture.needsUpdate = true

  return sharedReflectionTexture
}
</script>

<script lang="ts">
import { T, useTask } from '@threlte/core'
import { AdditiveBlending } from 'three'
import type { Group, SpriteMaterial } from 'three'

export let atmosphereReveal = 1

let group: Group | null = null
let cyanMaterial: SpriteMaterial | null = null
let violetMaterial: SpriteMaterial | null = null
let amberMaterial: SpriteMaterial | null = null

const additiveBlending = AdditiveBlending
const reflectionTexture = getReflectionTexture()

useTask(() => {
  const time = performance.now() * 0.001
  const pulse = 0.72 + Math.sin(time * 1.35) * 0.18

  if (group) {
    group.rotation.z = Math.sin(time * 0.34) * 0.035
  }

  if (cyanMaterial) cyanMaterial.opacity = atmosphereReveal * 0.24 * pulse
  if (violetMaterial) violetMaterial.opacity = atmosphereReveal * 0.18 * pulse
  if (amberMaterial) amberMaterial.opacity = atmosphereReveal * 0.14 * pulse
})
</script>

<T.Group bind:ref={group} position={[0, 0.02, 0.32]}>
  <T.Sprite position={[-0.82, 0.26, 0]} scale={[2.45, 0.22, 1]} rotation={[0, 0, -0.16]}>
    <T.SpriteMaterial
      bind:ref={cyanMaterial}
      map={reflectionTexture}
      color="#67e8f9"
      transparent={true}
      opacity={0}
      blending={additiveBlending}
      depthWrite={false}
      depthTest={false}
    />
  </T.Sprite>
  <T.Sprite position={[0.48, -0.1, 0.01]} scale={[2.05, 0.18, 1]} rotation={[0, 0, 0.18]}>
    <T.SpriteMaterial
      bind:ref={violetMaterial}
      map={reflectionTexture}
      color="#a78bfa"
      transparent={true}
      opacity={0}
      blending={additiveBlending}
      depthWrite={false}
      depthTest={false}
    />
  </T.Sprite>
  <T.Sprite position={[0.06, 0.58, 0.02]} scale={[1.7, 0.16, 1]} rotation={[0, 0, -0.08]}>
    <T.SpriteMaterial
      bind:ref={amberMaterial}
      map={reflectionTexture}
      color="#f97316"
      transparent={true}
      opacity={0}
      blending={additiveBlending}
      depthWrite={false}
      depthTest={false}
    />
  </T.Sprite>
</T.Group>
