<script lang="ts">
import { onDestroy, onMount } from 'svelte'
import * as THREE from 'three'

import { OnnxStylizer } from '../prototypes/neural-style/OnnxStylizer'
import {
  defaultPrototypePreset,
  prototypePresets,
} from '../prototypes/neural-style/presets'
import { ShaderStylizer } from '../prototypes/neural-style/ShaderStylizer'
import type {
  FrameStylizer,
  InputRangeMode,
  OnnxExecutionProvider,
  OnnxStylizerState,
  OutputRangeMode,
  PrototypePreset,
  StylizerSettings,
} from '../prototypes/neural-style/types'

type DisplayMode = 'stylized' | 'raw'
type StylizerMode = 'shader' | 'onnx'

let container: HTMLDivElement | null = null
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let displayScene: THREE.Scene | null = null
let displayCamera: THREE.OrthographicCamera | null = null
let shaderStylizer: ShaderStylizer | null = null
let onnxStylizer: OnnxStylizer | null = null
let activeStylizer: FrameStylizer | null = null
let sceneTarget: THREE.WebGLRenderTarget | null = null
let stylizedTarget: THREE.WebGLRenderTarget | null = null
let rawDisplayMaterial: THREE.MeshBasicMaterial | null = null
let stylizedDisplayMaterial: THREE.MeshBasicMaterial | null = null
let screenQuad: THREE.Mesh | null = null
let animationFrame = 0
let resizeObserver: ResizeObserver | null = null
let disposeScene = () => {}

let activePresetId = defaultPrototypePreset.id
let stylizerMode: StylizerMode = 'shader'
let processingHeight = 384
let stylizeEvery = defaultPrototypePreset.stylizeEvery
let displayMode: DisplayMode = 'stylized'

let posterizeLevels = defaultPrototypePreset.settings.posterizeLevels
let edgeStrength = defaultPrototypePreset.settings.edgeStrength
let aberration = defaultPrototypePreset.settings.aberration
let glitchAmount = defaultPrototypePreset.settings.glitchAmount
let grainAmount = defaultPrototypePreset.settings.grainAmount
let paletteMix = defaultPrototypePreset.settings.paletteMix

let onnxProvider: OnnxExecutionProvider = 'auto'
let onnxInputRangeMode: InputRangeMode = 'zeroToOne'
let onnxOutputRangeMode: OutputRangeMode = 'auto'
let onnxModelName = 'No model loaded'
let onnxStatus = 'Load an ONNX style-transfer model to begin.'
let onnxInputShape = '—'
let onnxOutputShape = '—'
let onnxLatency = '—'
let onnxIsReady = false
let onnxIsRunning = false
let onnxResolvedProvider: OnnxExecutionProvider = 'auto'

let rendererFps = 0
let stylizerFps = 0
let processingWidth = 0

let statsFrameCount = 0
let statsStylizedCount = 0
let statsStartTime = 0

const clock = new THREE.Clock()

function getPresetById(id: string) {
  return (
    prototypePresets.find(preset => preset.id === id) ?? defaultPrototypePreset
  )
}

function formatShape(shape: readonly (number | string)[]) {
  return shape.length > 0 ? shape.join(' × ') : '—'
}

function applyOnnxState(state: OnnxStylizerState) {
  onnxModelName = state.modelName ?? 'No model loaded'
  onnxStatus = state.status
  onnxInputShape = formatShape(state.inputShape)
  onnxOutputShape = formatShape(state.outputShape)
  onnxLatency = state.lastInferenceMs ? `${state.lastInferenceMs} ms` : '—'
  onnxIsReady = state.isReady
  onnxIsRunning = state.isRunning
  onnxResolvedProvider = state.executionProvider
}

function applyPreset(preset: PrototypePreset) {
  stylizeEvery = preset.stylizeEvery
  posterizeLevels = preset.settings.posterizeLevels
  edgeStrength = preset.settings.edgeStrength
  aberration = preset.settings.aberration
  glitchAmount = preset.settings.glitchAmount
  grainAmount = preset.settings.grainAmount
  paletteMix = preset.settings.paletteMix
  shaderStylizer?.setPalette(preset.palette)
  shaderStylizer?.setSettings(preset.settings)
}

function syncShaderStylizerSettings() {
  const nextSettings: Partial<StylizerSettings> = {
    posterizeLevels,
    edgeStrength,
    aberration,
    glitchAmount,
    grainAmount,
    paletteMix,
  }
  shaderStylizer?.setSettings(nextSettings)
}

function syncOnnxOptions() {
  onnxStylizer?.setPrePostProcessOptions({
    inputRangeMode: onnxInputRangeMode,
    outputRangeMode: onnxOutputRangeMode,
  })
}

function createRenderTarget(width: number, height: number) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    depthBuffer: false,
    stencilBuffer: false,
  })
  target.texture.minFilter = THREE.LinearFilter
  target.texture.magFilter = THREE.LinearFilter
  return target
}

function configureTargets() {
  if (!container || !renderer || !activeStylizer) return

  const bounds = container.getBoundingClientRect()
  const aspect = Math.max(bounds.width, 1) / Math.max(bounds.height, 1)
  processingWidth = Math.max(256, Math.round(processingHeight * aspect))

  sceneTarget?.dispose()
  stylizedTarget?.dispose()

  sceneTarget = createRenderTarget(processingWidth, processingHeight)
  stylizedTarget = createRenderTarget(processingWidth, processingHeight)

  rawDisplayMaterial?.dispose()
  stylizedDisplayMaterial?.dispose()

  rawDisplayMaterial = new THREE.MeshBasicMaterial({
    map: sceneTarget.texture,
  })
  stylizedDisplayMaterial = new THREE.MeshBasicMaterial({
    map: stylizedTarget.texture,
  })

  if (screenQuad) {
    screenQuad.material =
      displayMode === 'raw' ? rawDisplayMaterial : stylizedDisplayMaterial
  }

  shaderStylizer?.resize(processingWidth, processingHeight)
  onnxStylizer?.resize(processingWidth, processingHeight)
  renderer.setSize(bounds.width, bounds.height, false)
}

function updateDisplayMaterial() {
  if (!screenQuad || !rawDisplayMaterial || !stylizedDisplayMaterial) return
  screenQuad.material =
    displayMode === 'raw' ? rawDisplayMaterial : stylizedDisplayMaterial
}

function getRuntimePathLabel() {
  if (stylizerMode === 'shader') {
    return 'GPU-only shader surrogate'
  }

  if (!onnxIsReady) {
    return 'ONNX path waiting for model'
  }

  return `ONNX Runtime Web (${onnxResolvedProvider.toUpperCase()})`
}

async function handleModelSelected(event: Event) {
  const input = event.currentTarget as HTMLInputElement | null
  const file = input?.files?.[0]

  if (!file || !onnxStylizer) {
    return
  }

  stylizerMode = 'onnx'
  activeStylizer = onnxStylizer

  await onnxStylizer.loadModel(file, {
    executionProvider: onnxProvider,
    inputRangeMode: onnxInputRangeMode,
    outputRangeMode: onnxOutputRangeMode,
  })

  applyOnnxState(onnxStylizer.getState())
}

async function reloadOnnxSession() {
  if (!onnxStylizer) {
    return
  }

  await onnxStylizer.reloadModel({
    executionProvider: onnxProvider,
    inputRangeMode: onnxInputRangeMode,
    outputRangeMode: onnxOutputRangeMode,
  })

  applyOnnxState(onnxStylizer.getState())
}

function buildDemoScene() {
  const nextScene = new THREE.Scene()
  nextScene.background = new THREE.Color('#050816')
  nextScene.fog = new THREE.Fog('#050816', 8, 28)

  const ambient = new THREE.AmbientLight('#89a6ff', 0.8)
  const keyLight = new THREE.DirectionalLight('#ffd6b5', 1.9)
  keyLight.position.set(4, 7, 6)

  const rimLight = new THREE.PointLight('#00e5ff', 18, 18)
  rimLight.position.set(-4, 2.5, -2)

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 22, 1, 1),
    new THREE.MeshStandardMaterial({
      color: '#11182f',
      metalness: 0.15,
      roughness: 0.8,
    }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.75

  const hero = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.1, 0.35, 180, 24),
    new THREE.MeshStandardMaterial({
      color: '#8ea8ff',
      emissive: '#18204d',
      metalness: 0.4,
      roughness: 0.28,
    }),
  )

  const orbiters: THREE.Mesh[] = []
  const orbiterGroup = new THREE.Group()

  for (let index = 0; index < 12; index += 1) {
    const geometry =
      index % 2 === 0
        ? new THREE.BoxGeometry(0.45, 0.45, 0.45)
        : new THREE.IcosahedronGeometry(0.32, 0)
    const material = new THREE.MeshStandardMaterial({
      color: index % 3 === 0 ? '#ff7ad9' : '#40e9ff',
      emissive: index % 3 === 0 ? '#3a0c33' : '#052c35',
      metalness: 0.2,
      roughness: 0.42,
    })
    const mesh = new THREE.Mesh(geometry, material)
    const angle = (index / 12) * Math.PI * 2
    mesh.position.set(
      Math.cos(angle) * 3.5,
      -0.3 + Math.sin(angle * 2.0) * 0.7,
      Math.sin(angle) * 3.5,
    )
    mesh.userData.baseY = mesh.position.y
    orbiterGroup.add(mesh)
    orbiters.push(mesh)
  }

  const starGeometry = new THREE.BufferGeometry()
  const starPositions = new Float32Array(240 * 3)

  for (let index = 0; index < 240; index += 1) {
    const stride = index * 3
    starPositions[stride] = (Math.random() - 0.5) * 28
    starPositions[stride + 1] = Math.random() * 15 - 2
    starPositions[stride + 2] = (Math.random() - 0.5) * 28
  }

  starGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(starPositions, 3),
  )

  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: '#e9f4ff',
      size: 0.07,
      sizeAttenuation: true,
    }),
  )

  nextScene.add(ambient, keyLight, rimLight, floor, hero, orbiterGroup, stars)

  disposeScene = () => {
    nextScene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()

        if (Array.isArray(object.material)) {
          for (const material of object.material) {
            material.dispose()
          }
        } else {
          object.material.dispose()
        }
      }

      if (object instanceof THREE.Points) {
        object.geometry.dispose()
        object.material.dispose()
      }
    })
  }

  return {
    nextScene,
    update(elapsed: number) {
      hero.rotation.x = elapsed * 0.35
      hero.rotation.y = elapsed * 0.55
      hero.position.y = Math.sin(elapsed * 1.4) * 0.18

      orbiterGroup.rotation.y = elapsed * 0.22

      orbiters.forEach((mesh, index) => {
        mesh.rotation.x = elapsed * (0.25 + index * 0.02)
        mesh.rotation.y = elapsed * (0.32 + index * 0.018)
        mesh.position.y =
          mesh.userData.baseY + Math.sin(elapsed * 1.7 + index * 0.4) * 0.18
      })

      stars.rotation.y = elapsed * 0.015
    },
  }
}

onMount(() => {
  if (!container) return

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  container.append(renderer.domElement)

  const demo = buildDemoScene()
  scene = demo.nextScene

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(0, 2.2, 8.2)
  camera.aspect =
    Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1)
  camera.updateProjectionMatrix()

  displayScene = new THREE.Scene()
  displayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  shaderStylizer = new ShaderStylizer(
    defaultPrototypePreset.palette,
    defaultPrototypePreset.settings,
  )
  onnxStylizer = new OnnxStylizer(state => {
    applyOnnxState(state)
  })
  activeStylizer = shaderStylizer

  const quadGeometry = new THREE.PlaneGeometry(2, 2)
  stylizedDisplayMaterial = new THREE.MeshBasicMaterial()
  screenQuad = new THREE.Mesh(quadGeometry, stylizedDisplayMaterial)
  displayScene.add(screenQuad)

  applyPreset(defaultPrototypePreset)
  configureTargets()

  statsStartTime = performance.now()
  let lastStylizedFrame = -1

  resizeObserver = new ResizeObserver(() => {
    if (!container || !camera || !renderer) return

    const bounds = container.getBoundingClientRect()
    camera.aspect = Math.max(bounds.width, 1) / Math.max(bounds.height, 1)
    camera.updateProjectionMatrix()
    configureTargets()
  })
  resizeObserver.observe(container)

  renderer.setAnimationLoop(() => {
    if (
      !renderer ||
      !scene ||
      !camera ||
      !displayScene ||
      !displayCamera ||
      !activeStylizer ||
      !sceneTarget ||
      !stylizedTarget
    ) {
      return
    }

    const elapsed = clock.getElapsedTime()
    demo.update(elapsed)

    camera.position.x = Math.sin(elapsed * 0.35) * 1.3
    camera.position.z = 8.2 + Math.cos(elapsed * 0.4) * 0.5
    camera.lookAt(0, 0, 0)

    renderer.setRenderTarget(sceneTarget)
    renderer.render(scene, camera)

    const shouldTriggerStylizer =
      animationFrame % stylizeEvery === 0 || lastStylizedFrame === -1
    const renderResult = activeStylizer.render(
      renderer,
      sceneTarget,
      stylizedTarget,
      elapsed,
      {
        runInference: shouldTriggerStylizer,
      },
    )

    if (renderResult.inferenceTriggered) {
      lastStylizedFrame = animationFrame
      statsStylizedCount += 1
    }

    renderer.setRenderTarget(null)
    renderer.render(displayScene, displayCamera)

    animationFrame += 1
    statsFrameCount += 1

    const now = performance.now()
    const elapsedMs = now - statsStartTime

    if (elapsedMs >= 1000) {
      rendererFps = Number(((statsFrameCount * 1000) / elapsedMs).toFixed(1))
      stylizerFps = Number(((statsStylizedCount * 1000) / elapsedMs).toFixed(1))
      statsFrameCount = 0
      statsStylizedCount = 0
      statsStartTime = now
    }
  })

  updateDisplayMaterial()

  return () => {
    resizeObserver?.disconnect()
    renderer?.setAnimationLoop(null)
    rawDisplayMaterial?.dispose()
    stylizedDisplayMaterial?.dispose()
    screenQuad?.geometry.dispose()
    sceneTarget?.dispose()
    stylizedTarget?.dispose()
    shaderStylizer?.dispose()
    onnxStylizer?.dispose()
    disposeScene()
    renderer?.dispose()
    renderer?.domElement.remove()
  }
})

onDestroy(() => {
  resizeObserver?.disconnect()
})

$: if (shaderStylizer) {
  applyPreset(getPresetById(activePresetId))
}

$: if (shaderStylizer) {
  posterizeLevels
  edgeStrength
  aberration
  glitchAmount
  grainAmount
  paletteMix
  syncShaderStylizerSettings()
}

$: if (onnxStylizer) {
  onnxInputRangeMode
  onnxOutputRangeMode
  syncOnnxOptions()
}

$: if (shaderStylizer && onnxStylizer) {
  activeStylizer = stylizerMode === 'onnx' ? onnxStylizer : shaderStylizer
}

$: if (container && renderer && activeStylizer) {
  processingHeight
  configureTargets()
}

$: if (screenQuad) {
  displayMode
  updateDisplayMaterial()
}
</script>

<div class='prototype-shell'>
  <div class='viewport' bind:this={container}></div>

  <aside class='panel'>
    <div>
      <p class='eyebrow'>Realtime neural stylization prototype</p>
      <h1>Offscreen render → stylizer → fullscreen output</h1>
      <p class='lede'>
        This validates the pipeline shape now with a GPU shader surrogate, so a
        browser ML model can replace the stylizer later without changing the
        scene capture loop.
      </p>
    </div>

    <div class='stats'>
      <div>
        <span>Render FPS</span>
        <strong>{rendererFps || '—'}</strong>
      </div>
      <div>
        <span>Stylizer FPS</span>
        <strong>{stylizerFps || '—'}</strong>
      </div>
      <div>
        <span>Internal buffer</span>
        <strong>{processingWidth || '—'}×{processingHeight}</strong>
      </div>
      <div>
        <span>Path</span>
        <strong>{getRuntimePathLabel()}</strong>
      </div>
    </div>

    <label>
      <span>Stylizer</span>
      <select bind:value={stylizerMode}>
        <option value='shader'>Shader surrogate</option>
        <option value='onnx'>ONNX Runtime Web</option>
      </select>
      <small>
        Keep the shader path for baseline testing, or switch to ONNX for a real
        model-backed stylizer.
      </small>
    </label>

    <label>
      <span>Preset</span>
      <select bind:value={activePresetId}>
        {#each prototypePresets as preset}
          <option value={preset.id}>{preset.label}</option>
        {/each}
      </select>
      <small>{getPresetById(activePresetId).description}</small>
    </label>

    <label>
      <span>Display mode</span>
      <select bind:value={displayMode}>
        <option value='stylized'>Stylized</option>
        <option value='raw'>Raw render</option>
      </select>
    </label>

    <label>
      <span>Processing height: {processingHeight}px</span>
      <input bind:value={processingHeight} min='256' max='512' step='64' type='range' />
    </label>

    <label>
      <span>Stylize every {stylizeEvery} frame{stylizeEvery === 1 ? '' : 's'}</span>
      <input bind:value={stylizeEvery} min='1' max='4' step='1' type='range' />
    </label>

    <div class='notes'>
      <p>
        ONNX path expects a 4D RGB tensor model shaped like `NCHW` or `NHWC`.
        Bring your own `.onnx` feed-forward stylization model for live testing.
      </p>
    </div>

    <label>
      <span>ONNX provider</span>
      <select bind:value={onnxProvider}>
        <option value='auto'>Auto</option>
        <option value='webgpu'>WebGPU</option>
        <option value='wasm'>WASM</option>
      </select>
      <small>
        `Auto` tries WebGPU first, then falls back to WASM when needed.
      </small>
    </label>

    <label>
      <span>Input normalization</span>
      <select bind:value={onnxInputRangeMode}>
        <option value='zeroToOne'>0 → 1</option>
        <option value='minusOneToOne'>-1 → 1</option>
      </select>
    </label>

    <label>
      <span>Output interpretation</span>
      <select bind:value={onnxOutputRangeMode}>
        <option value='auto'>Auto detect</option>
        <option value='zeroToOne'>0 → 1</option>
        <option value='minusOneToOne'>-1 → 1</option>
        <option value='zeroTo255'>0 → 255</option>
      </select>
    </label>

    <label>
      <span>Load `.onnx` model</span>
      <input accept='.onnx' on:change={handleModelSelected} type='file' />
      <small>{onnxStatus}</small>
    </label>

    <button class='action' on:click={reloadOnnxSession} type='button'>
      Reload ONNX session
    </button>

    <div class='stats'>
      <div>
        <span>Model</span>
        <strong>{onnxModelName}</strong>
      </div>
      <div>
        <span>Inference</span>
        <strong>{onnxLatency}</strong>
      </div>
      <div>
        <span>Input tensor</span>
        <strong>{onnxInputShape}</strong>
      </div>
      <div>
        <span>Output tensor</span>
        <strong>{onnxOutputShape}</strong>
      </div>
    </div>

    <div class='notes'>
      <p>
        ONNX status: {onnxIsRunning
          ? 'Running inference on the latest offscreen frame.'
          : onnxIsReady
            ? 'Session ready for realtime testing.'
            : 'Session idle until a model is loaded.'}
      </p>
    </div>

    <label>
      <span>Posterize levels: {posterizeLevels}</span>
      <input bind:value={posterizeLevels} min='3' max='8' step='1' type='range' />
    </label>

    <label>
      <span>Edge strength: {edgeStrength.toFixed(2)}</span>
      <input bind:value={edgeStrength} min='0.6' max='2.2' step='0.05' type='range' />
    </label>

    <label>
      <span>Palette mix: {paletteMix.toFixed(2)}</span>
      <input bind:value={paletteMix} min='0.2' max='1' step='0.01' type='range' />
    </label>

    <label>
      <span>RGB split: {aberration.toFixed(4)}</span>
      <input bind:value={aberration} min='0' max='0.012' step='0.0005' type='range' />
    </label>

    <label>
      <span>Glitch amount: {glitchAmount.toFixed(3)}</span>
      <input bind:value={glitchAmount} min='0' max='0.04' step='0.001' type='range' />
    </label>

    <label>
      <span>Grain amount: {grainAmount.toFixed(3)}</span>
      <input bind:value={grainAmount} min='0' max='0.08' step='0.001' type='range' />
    </label>

    <div class='notes'>
      <p>
        The shader path still provides the baseline look. The ONNX path now
        uses the same captured frame source, so you can compare real model
        inference against the surrogate post-process pass.
      </p>
    </div>
  </aside>
</div>

<style>
  .prototype-shell {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    color: #f7f7fb;
    font-family: Inter, system-ui, sans-serif;
  }

  .viewport {
    position: absolute;
    inset: 0;
  }

  .viewport :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .panel {
    position: absolute;
    top: 1rem;
    left: 1rem;
    width: min(24rem, calc(100vw - 2rem));
    max-height: calc(100dvh - 2rem);
    overflow: auto;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 1rem;
    background: rgba(8, 10, 18, 0.82);
    backdrop-filter: blur(18px);
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35);
    z-index: 1;
  }

  .eyebrow {
    margin-bottom: 0.35rem;
    color: #8bc2ff;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    margin-bottom: 0.5rem;
    font-size: 1.45rem;
    line-height: 1.2;
  }

  .lede,
  .notes p,
  label small {
    color: rgba(236, 239, 255, 0.78);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin: 1rem 0;
  }

  .stats div,
  label,
  .notes {
    padding: 0.75rem;
    border-radius: 0.8rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .stats span,
  label span {
    display: block;
    margin-bottom: 0.4rem;
    color: rgba(215, 222, 255, 0.72);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .stats strong {
    display: block;
    font-size: 1rem;
    line-height: 1.3;
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  select,
  input[type='range'],
  input[type='file'],
  .action {
    width: 100%;
  }

  select {
    padding: 0.65rem 0.7rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.6rem;
    background: rgba(6, 8, 14, 0.95);
    color: #f7f7fb;
  }

  input[type='range'] {
    accent-color: #8bc2ff;
  }

  input[type='file'] {
    color: #f7f7fb;
  }

  .action {
    padding: 0.8rem 0.9rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.7rem;
    background: rgba(139, 194, 255, 0.14);
    color: #f7f7fb;
    cursor: pointer;
  }

  @media (max-width: 768px) {
    .panel {
      top: auto;
      bottom: 0.75rem;
      left: 0.75rem;
      right: 0.75rem;
      width: auto;
      max-height: 55dvh;
    }
  }
</style>
