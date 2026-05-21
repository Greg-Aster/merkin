<script lang="ts">
import { useTask, useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import {
  Color,
  HalfFloatType,
  ShaderMaterial,
  WebGLRenderTarget,
} from 'three'
import type { Object3D } from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'

type IntroInputState = {
  x: number
  y: number
  dragX: number
  dragY: number
  wheel: number
  reveal: number
  introOffsetScreens: number
  active: boolean
}

type SceneQuality = 'high' | 'balanced' | 'lean'
type GlitchUniforms = Record<string, { value: unknown }>
type SceneObject = Object3D & {
  isCamera?: boolean
  isLight?: boolean
  isMesh?: boolean
  isSkinnedMesh?: boolean
}

const HomeIntroGlitchShader = {
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 0 },
    time: { value: 0 },
    blockOffset: { value: 0 },
    scanOffset: { value: 0 },
    colorOffset: { value: 0.006 },
    noiseAmount: { value: 0.12 },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float strength;
    uniform float time;
    uniform float blockOffset;
    uniform float scanOffset;
    uniform float colorOffset;
    uniform float noiseAmount;
    varying vec2 vUv;

    float rand(vec2 value) {
      return fract(sin(dot(value, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      float row = floor(uv.y * 42.0);
      float thinRow = floor(uv.y * 220.0);
      float blockNoise = rand(vec2(row, blockOffset));
      float scanNoise = rand(vec2(thinRow, scanOffset));
      float band = step(0.72, blockNoise) * (blockNoise - 0.72) * 3.55;
      float scanBand = step(0.91, scanNoise) * 0.7;
      float tear = (band + scanBand) * strength;
      float direction = rand(vec2(row + 18.0, blockOffset)) > 0.5 ? 1.0 : -1.0;
      uv.x += direction * tear * 0.085;
      uv.y += sin((uv.x * 28.0) + time * 18.0) * tear * 0.006;

      float channelShift = colorOffset * strength * (1.0 + band * 1.7);
      vec4 red = texture2D(tDiffuse, uv + vec2(channelShift, 0.0));
      vec4 base = texture2D(tDiffuse, uv);
      vec4 blue = texture2D(tDiffuse, uv - vec2(channelShift, 0.0));
      float staticNoise = (rand(gl_FragCoord.xy + vec2(time * 31.0, scanOffset)) - 0.5) * noiseAmount * strength;

      gl_FragColor = vec4(red.r + staticNoise, base.g + staticNoise, blue.b + staticNoise, base.a);
    }
  `,
}

export let input: IntroInputState
export let sceneQuality: SceneQuality = 'high'
export let activeScreenIndex = 0
export let backgroundReady = false

const { autoRender, camera, dpr, renderStage, renderer, scene, size } = useThrelte()

let logoRenderTarget: WebGLRenderTarget | null = null
let glitchMaterial: ShaderMaterial | null = null
let glitchQuad: FullScreenQuad | null = null
let logoGlitchTarget: Object3D | null = null
let previousAutoRender = autoRender.current
let lastWidth = 0
let lastHeight = 0
let lastDpr = 0
let lastActiveScreenIndex = activeScreenIndex
let burstStartedAt = 0
let burstUntil = 0
let burstDuration = 0
let burstIntensity = 0
let nextIdleBurstAt = 0
let prefersReducedMotion = false
let reducedMotionQuery: MediaQueryList | null = null
let lastBackgroundReady = backgroundReady
const previousClearColor = new Color()

function getTimeSeconds() {
  return typeof performance === 'undefined' ? 0 : performance.now() * 0.001
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function scheduleNextIdleBurst(now: number, soon = false) {
  if (soon) {
    nextIdleBurstAt = now + randomRange(2.8, 5.6)
    return
  }

  const quickFollowUp = Math.random() > 0.62
  const baseDelay = quickFollowUp
    ? randomRange(1.3, 3.4)
    : randomRange(
        sceneQuality === 'high' ? 4.6 : 6.2,
        sceneQuality === 'high' ? 10.5 : 13.8,
      )
  const occasionalLongPause = !quickFollowUp && Math.random() > 0.86
    ? randomRange(4, 9)
    : 0

  nextIdleBurstAt = now + baseDelay + occasionalLongPause
}

function getIdleBurstProfile() {
  if (sceneQuality === 'lean') {
    return {
      duration: randomRange(0.16, 0.34),
      intensity: randomRange(0.22, 0.44),
    }
  }

  return {
    duration: randomRange(0.18, 0.48),
    intensity: randomRange(0.34, 0.7),
  }
}

function setGlitchNoiseWidth() {
  if (!glitchMaterial) return

  const uniforms = glitchMaterial.uniforms as GlitchUniforms
  const colorSplit = sceneQuality === 'high'
    ? 0.011
    : sceneQuality === 'balanced'
      ? 0.008
      : 0.006

  if (uniforms.colorOffset) {
    uniforms.colorOffset.value = colorSplit
  }
  if (uniforms.noiseAmount) {
    uniforms.noiseAmount.value = sceneQuality === 'lean' ? 0.08 : 0.12
  }
}

function syncTargetSize() {
  if (!logoRenderTarget) return

  const nextWidth = Math.max(1, size.current.width)
  const nextHeight = Math.max(1, size.current.height)
  const nextDpr = Math.max(1, dpr.current)

  if (
    nextWidth === lastWidth &&
    nextHeight === lastHeight &&
    nextDpr === lastDpr
  ) {
    return
  }

  logoRenderTarget.setSize(
    Math.max(1, Math.ceil(nextWidth * nextDpr)),
    Math.max(1, Math.ceil(nextHeight * nextDpr)),
  )
  lastWidth = nextWidth
  lastHeight = nextHeight
  lastDpr = nextDpr
}

function updateReducedMotionPreference() {
  prefersReducedMotion = reducedMotionQuery?.matches ?? false
}

function triggerBurst(duration: number, intensity: number) {
  const now = getTimeSeconds()
  burstStartedAt = now
  burstDuration = duration
  burstIntensity = intensity
  burstUntil = Math.max(burstUntil, now + duration)
}

function updateGlitchUniforms(strength: number) {
  if (!glitchMaterial || !logoRenderTarget) return

  const uniforms = glitchMaterial.uniforms as GlitchUniforms
  const now = getTimeSeconds()

  if (uniforms.tDiffuse) {
    uniforms.tDiffuse.value = logoRenderTarget.texture
  }
  if (uniforms.strength) {
    uniforms.strength.value = strength
  }
  if (uniforms.time) {
    uniforms.time.value = now
  }
  if (uniforms.blockOffset) {
    uniforms.blockOffset.value = Math.floor(now * 14)
  }
  if (uniforms.scanOffset) {
    uniforms.scanOffset.value = Math.floor(now * 36)
  }
}

function getLogoGlitchTarget() {
  if (logoGlitchTarget?.parent) return logoGlitchTarget

  logoGlitchTarget = null
  logoGlitchTarget = scene.children.find(child => {
    const sceneObject = child as SceneObject
    if (
      sceneObject.isCamera ||
      sceneObject.isLight ||
      child.children.length !== 1
    ) {
      return false
    }

    let hasMesh = false
    child.traverse(descendant => {
      const descendantObject = descendant as SceneObject
      if (descendantObject.isMesh || descendantObject.isSkinnedMesh) {
        hasMesh = true
      }
    })

    return hasMesh
  }) ?? null

  return logoGlitchTarget
}

function isLogoObject(object: Object3D, logoTarget: Object3D) {
  let current: Object3D | null = object

  while (current) {
    if (current === logoTarget) return true
    current = current.parent
  }

  return false
}

function hideObjectsExceptLogo(logoTarget: Object3D) {
  const hiddenObjects: Array<[Object3D, boolean]> = []

  scene.traverse(object => {
    const sceneObject = object as SceneObject
    if (
      object === scene ||
      sceneObject.isCamera ||
      sceneObject.isLight ||
      isLogoObject(object, logoTarget) ||
      !object.visible
    ) {
      return
    }

    hiddenObjects.push([object, object.visible])
    object.visible = false
  })

  return hiddenObjects
}

function restoreVisibility(hiddenObjects: Array<[Object3D, boolean]>) {
  hiddenObjects.forEach(([object, visible]) => {
    object.visible = visible
  })
}

function renderNormalFrame() {
  renderer.setRenderTarget(null)
  renderer.render(scene, camera.current)
}

function renderLogoGlitchFrame(strength: number) {
  if (!logoRenderTarget || !glitchQuad) {
    renderNormalFrame()
    return
  }

  const logoTarget = getLogoGlitchTarget()
  if (!logoTarget) {
    renderNormalFrame()
    return
  }

  const previousRenderTarget = renderer.getRenderTarget()
  const previousClearAlpha = renderer.getClearAlpha()
  const previousAutoClear = renderer.autoClear
  renderer.getClearColor(previousClearColor)

  logoTarget.visible = false
  renderer.setRenderTarget(null)
  renderer.render(scene, camera.current)
  logoTarget.visible = true

  renderer.setRenderTarget(logoRenderTarget)
  renderer.setClearColor(0x000000, 0)
  renderer.clear(true, true, true)

  const hiddenObjects = hideObjectsExceptLogo(logoTarget)
  renderer.render(scene, camera.current)
  restoreVisibility(hiddenObjects)

  renderer.setRenderTarget(null)
  renderer.setClearColor(previousClearColor, previousClearAlpha)
  updateGlitchUniforms(strength)
  renderer.autoClear = false
  glitchQuad.render(renderer)
  renderer.autoClear = previousAutoClear

  renderer.setRenderTarget(previousRenderTarget)
}

function getGlitchStrength() {
  const now = getTimeSeconds()
  const reveal = Number.isFinite(input.reveal) ? input.reveal : 0
  const sceneVisible = backgroundReady || reveal > 0.035
  const canGlitch = !prefersReducedMotion && sceneVisible
  const dragging = canGlitch && input.active

  if (backgroundReady !== lastBackgroundReady) {
    lastBackgroundReady = backgroundReady
    if (backgroundReady && !prefersReducedMotion) {
      triggerBurst(0.55, sceneQuality === 'lean' ? 0.38 : 0.72)
      scheduleNextIdleBurst(now, true)
    }
  }

  if (activeScreenIndex !== lastActiveScreenIndex) {
    lastActiveScreenIndex = activeScreenIndex
    if (canGlitch) {
      triggerBurst(
        sceneQuality === 'lean' ? 0.22 : 0.34,
        sceneQuality === 'lean' ? 0.34 : 0.62,
      )
    }
  }

  if (canGlitch && now >= nextIdleBurstAt) {
    const idleBurst = getIdleBurstProfile()
    triggerBurst(idleBurst.duration, idleBurst.intensity)
    scheduleNextIdleBurst(now)
  }

  const bursting = canGlitch && now < burstUntil
  const burstProgress = bursting && burstDuration > 0
    ? Math.min(1, Math.max(0, (now - burstStartedAt) / burstDuration))
    : 1
  const burstEnvelope = bursting
    ? Math.sin((1 - burstProgress) * Math.PI * 0.5)
    : 0
  const strength = dragging
    ? sceneQuality === 'lean' ? 0.32 : 0.58
    : burstEnvelope * burstIntensity

  setGlitchNoiseWidth()
  return canGlitch && strength > 0.015 ? strength : 0
}

onMount(() => {
  previousAutoRender = autoRender.current
  autoRender.set(false)

  logoRenderTarget = new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
  })
  logoRenderTarget.texture.name = 'HomeIntroLogoGlitch.logo'
  glitchMaterial = new ShaderMaterial({
    uniforms: HomeIntroGlitchShader.uniforms,
    vertexShader: HomeIntroGlitchShader.vertexShader,
    fragmentShader: HomeIntroGlitchShader.fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  glitchQuad = new FullScreenQuad(glitchMaterial)
  syncTargetSize()
  scheduleNextIdleBurst(getTimeSeconds())

  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateReducedMotionPreference()
  reducedMotionQuery.addEventListener('change', updateReducedMotionPreference)
})

useTask(() => {
  if (!logoRenderTarget || !glitchMaterial || !glitchQuad) return

  syncTargetSize()
  const strength = getGlitchStrength()
  if (strength > 0) {
    renderLogoGlitchFrame(strength)
  } else {
    renderNormalFrame()
  }
}, { stage: renderStage })

onDestroy(() => {
  reducedMotionQuery?.removeEventListener('change', updateReducedMotionPreference)
  reducedMotionQuery = null
  glitchQuad?.dispose()
  glitchMaterial?.dispose()
  logoRenderTarget?.dispose()
  glitchQuad = null
  glitchMaterial = null
  logoRenderTarget = null
  logoGlitchTarget = null
  autoRender.set(previousAutoRender)
})
</script>
