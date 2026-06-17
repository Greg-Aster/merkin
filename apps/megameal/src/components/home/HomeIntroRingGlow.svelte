<script lang="ts" context="module">
import { CanvasTexture } from 'three'
import type { Texture } from 'three'
import { configureGeneratedCanvasTexture } from '@/utils/threeTextureUtils'

let sharedStarTexture: Texture | null = null

function getStarTexture() {
  if (sharedStarTexture) return sharedStarTexture
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const context = canvas.getContext('2d')
  if (!context) return null

  const center = canvas.width / 2
  const gradient = context.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center,
  )
  gradient.addColorStop(0, 'rgb(255 255 255 / 1)')
  gradient.addColorStop(0.12, 'rgb(235 252 255 / 0.76)')
  gradient.addColorStop(0.32, 'rgb(125 211 252 / 0.34)')
  gradient.addColorStop(0.68, 'rgb(99 102 241 / 0.11)')
  gradient.addColorStop(1, 'rgb(59 130 246 / 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.save()
  context.translate(center, center)
  context.globalCompositeOperation = 'screen'
  context.strokeStyle = 'rgb(255 255 255 / 0.58)'
  context.lineWidth = 1.4
  context.beginPath()
  context.moveTo(-31, 0)
  context.lineTo(31, 0)
  context.moveTo(0, -31)
  context.lineTo(0, 31)
  context.stroke()
  context.strokeStyle = 'rgb(165 243 252 / 0.28)'
  context.lineWidth = 1
  context.rotate(Math.PI / 4)
  context.beginPath()
  context.moveTo(-18, 0)
  context.lineTo(18, 0)
  context.moveTo(0, -18)
  context.lineTo(0, 18)
  context.stroke()
  context.restore()

  sharedStarTexture = configureGeneratedCanvasTexture(new CanvasTexture(canvas))

  return sharedStarTexture
}
</script>

<script lang="ts">
import { T, useTask } from '@threlte/core'
import { onDestroy } from 'svelte'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
} from 'three'
import type { Group } from 'three'

export let radius = 1
export let color = '#67e8f9'
export let hueCycleBase: number | null = null
export let hueCycleSpeed = 0.01
export let atmosphereReveal = 1
export let ringOpacity = 0.9
export let dotSize = 1.25
export let dotCount = 52
export let motionEnabled = true

let group: Group | null = null
let animatedColor = color
let dotSignature = ''

const starTexture = getStarTexture()
const materialColor = new Color(color)
const dotGeometry = new BufferGeometry()

function createStarRingMaterial(alpha: number, size: number, intensity: number) {
  const starMaterial = new ShaderMaterial({
    uniforms: {
      pointTexture: { value: starTexture },
      pointSize: { value: size },
      pointAlpha: { value: alpha },
      pointColor: { value: materialColor },
      pointIntensity: { value: intensity },
    },
    vertexShader: `
      uniform float pointSize;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = pointSize * (300.0 / max(1.0, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      uniform float pointAlpha;
      uniform float pointIntensity;
      uniform vec3 pointColor;

      void main() {
        vec4 sprite = texture2D(pointTexture, gl_PointCoord);
        gl_FragColor = vec4(pointColor * pointIntensity, sprite.a * pointAlpha);
      }
    `,
    blending: AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    transparent: true,
  })

  starMaterial.toneMapped = false
  return starMaterial
}

const dotMaterial = createStarRingMaterial(ringOpacity, dotSize, 1.8)

$: visibleOpacity = Math.min(1, atmosphereReveal * ringOpacity)
$: syncDotGeometry()
$: {
  materialColor.set(animatedColor)
  dotMaterial.uniforms.pointColor.value = materialColor
  dotMaterial.uniforms.pointAlpha.value = visibleOpacity
  dotMaterial.uniforms.pointSize.value = dotSize
}

function syncDotGeometry() {
  const safeDotCount = Math.max(8, Math.floor(dotCount))
  const nextSignature = `${radius}:${safeDotCount}`
  if (nextSignature === dotSignature) return

  const positions = new Float32Array(safeDotCount * 3)
  for (let index = 0; index < safeDotCount; index += 1) {
    const angle = (index / safeDotCount) * Math.PI * 2
    positions[index * 3] = Math.cos(angle) * radius
    positions[index * 3 + 1] = Math.sin(angle) * radius
    positions[index * 3 + 2] = 0
  }

  const positionAttribute = new BufferAttribute(positions, 3)
  dotGeometry.setAttribute('position', positionAttribute)
  dotSignature = nextSignature
}

useTask(() => {
  if (!group) return

  if (!motionEnabled || hueCycleBase === null) {
    animatedColor = color
    return
  }

  const time = performance.now() * 0.001
  const hue = (((hueCycleBase + time * hueCycleSpeed) % 1) + 1) % 1
  animatedColor = `hsl(${Math.round(hue * 360)} 78% 54%)`
})

onDestroy(() => {
  dotGeometry.dispose()
  dotMaterial.dispose()
})
</script>

<T.Group bind:ref={group}>
  <T.Points args={[dotGeometry, dotMaterial]} />
</T.Group>
