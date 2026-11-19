<script lang="ts">
import { onDestroy, onMount } from 'svelte'
import { url } from '@utils/url-utils'
import type * as THREEType from 'three'

export type ViewerMode = 'v1' | 'v2' | 'v3' | 'lineup'
export type ShellMode = 'full' | 'xray' | 'core'
export type CameraPreset = 'three-quarter' | 'front' | 'side' | 'rear' | 'top'

export let initialModel: ViewerMode = 'v2'
export let allowModelSwitch = true
export let compact = false
export let caption = ''
export let pageGeneration: 'v1' | 'v2' | 'v3' | '' = ''

type RobotId = 'v1' | 'v2' | 'v3'

interface RobotMeta {
  id: RobotId
  shortLabel: string
  title: string
  badge: string
  glbPath: string
  envelope: string
  actuators: string
  compute: string
  guideHref: string
  guideLabel: string
  lineupX: number
}

const ROBOTS: Record<RobotId, RobotMeta> = {
  v1: {
    id: 'v1',
    shortLabel: 'V1 (8-Servo)',
    title: 'Ainekio V1 · 8-Servo Baseline CAD',
    badge: 'Summer 2026 · 8 DOF',
    glbPath: '/models/ainekio-v1.glb',
    envelope: '187.1 × 193.1 × 100.8 mm',
    actuators: '8× MG90S (2-DOF spider legs)',
    compute: '0.96" OLED · Dual-Buck 2S',
    guideHref: '/posts/ainekio-v1/',
    guideLabel: 'V1 Systems Guide',
    lineupX: -0.323,
  },
  v2: {
    id: 'v2',
    shortLabel: 'V2 (Active 650 g)',
    title: 'Ainekio V2 · 650 g 12-Servo Closed-Loop Body',
    badge: 'Active Floor Robot · 12 DOF',
    glbPath: '/models/ainekio-v2.glb',
    envelope: '244.9 × 141.5 × 103.4 mm',
    actuators: '12× 4th-Wire Feedback MG90S',
    compute: 'ESP32-P4 (50 Hz L2 RL) · 1.9" LCD',
    guideHref: '/posts/ainekio-v2/',
    guideLabel: 'V2 Hardware Guide',
    lineupX: -0.058,
  },
  v3: {
    id: 'v3',
    shortLabel: 'V3 (Armored CAD)',
    title: 'Ainekio V3 · Heavy-Equipment DS3235 CAD',
    badge: 'In Development · 12 DOF',
    glbPath: '/models/ainekio-v3.glb',
    envelope: '436.3 × 236.5 × 381.4 mm (w/ whip)',
    actuators: '12× Waterproof DS3235 (~35 kg·cm)',
    compute: 'Radxa Dragon Q6A + ESP32-P4 · 2.8" Vault TFT',
    guideHref: '/posts/ainekio-v3-preview/',
    guideLabel: 'V3 Armored CAD Guide',
    lineupX: 0.288,
  },
}

let activeMode: ViewerMode = initialModel
let shellMode: ShellMode = 'full'
let activePreset: CameraPreset = 'three-quarter'
let autoRotate = true
let wheelZoomArmed = false
let isTouchDevice = false
let touchInteractive = false
let isLoading = true
let loadProgressText = 'Initializing 3D studio…'
let loadError = ''

let rootEl: HTMLElement | null = null
let stageEl: HTMLDivElement | null = null
let canvasEl: HTMLCanvasElement | null = null

let THREE: typeof THREEType | null = null
let renderer: THREEType.WebGLRenderer | null = null
let scene: THREEType.Scene | null = null
let camera: THREEType.PerspectiveCamera | null = null
let controls: {
  target: THREEType.Vector3
  autoRotate: boolean
  autoRotateSpeed: number
  enableZoom: boolean
  enableDamping: boolean
  dampingFactor: number
  minDistance: number
  maxDistance: number
  maxPolarAngle: number
  update: () => boolean
  dispose: () => void
  addEventListener: (type: string, listener: () => void) => void
} | null = null
let modelGroup: THREEType.Group | null = null
let gridGroup: THREEType.Group | null = null
let envRT: THREEType.WebGLRenderTarget | null = null

const modelTemplateCache = new Map<RobotId, THREEType.Group>()
const modelInflight = new Map<RobotId, Promise<THREEType.Group>>()
let gltfLoaderInstance: {
  loadAsync: (assetUrl: string) => Promise<{ scene: THREEType.Group }>
} | null = null

let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let isInViewport = false
let engineReady = false
let engineInitPromise: Promise<void> | null = null
let rafId = 0
let requestToken = 0

// Smooth camera tween state
let camTween: {
  fromPos: THREEType.Vector3
  toPos: THREEType.Vector3
  fromTarget: THREEType.Vector3
  toTarget: THREEType.Vector3
  startMs: number
  durationMs: number
} | null = null

$: currentMeta = activeMode === 'lineup' ? null : ROBOTS[activeMode]

function buildGridFloor(T: typeof THREEType): THREEType.Group {
  const grp = new T.Group()
  grp.name = 'StudioFloor'

  // Subtle dark matte shadow/reflection disc
  const discGeo = new T.CircleGeometry(1.15, 64)
  discGeo.rotateX(-Math.PI / 2)
  const discMat = new T.MeshStandardMaterial({
    color: new T.Color('#091318'),
    roughness: 0.92,
    metalness: 0.05,
  })
  const disc = new T.Mesh(discGeo, discMat)
  disc.position.y = -0.0006
  disc.receiveShadow = true
  grp.add(disc)

  // 20 mm minor grid (1.2 m × 1.2 m = 60 divisions)
  const minorGrid = new T.GridHelper(1.2, 60, 0x1e3a46, 0x12242c)
  minorGrid.position.y = -0.0003
  const minorMats = Array.isArray(minorGrid.material)
    ? minorGrid.material
    : [minorGrid.material]
  for (const m of minorMats) {
    m.transparent = true
    m.opacity = 0.42
  }
  grp.add(minorGrid)

  // 100 mm (10 cm) major engineering scale grid (1.2 m × 1.2 m = 12 divisions)
  const majorGrid = new T.GridHelper(1.2, 12, 0x38bdf8, 0x244c5c)
  majorGrid.position.y = 0
  const majorMats = Array.isArray(majorGrid.material)
    ? majorGrid.material
    : [majorGrid.material]
  for (const m of majorMats) {
    m.transparent = true
    m.opacity = 0.55
  }
  grp.add(majorGrid)

  return grp
}

async function ensureEngine() {
  if (engineReady) return
  if (engineInitPromise) return engineInitPromise

  engineInitPromise = (async () => {
    if (!canvasEl || !stageEl) return
    loadProgressText = 'Loading Three.js WebGL engine…'

    const [
      threeMod,
      { GLTFLoader },
      { OrbitControls },
      { RoomEnvironment },
      { MeshoptDecoder },
    ] = await Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/controls/OrbitControls.js'),
      import('three/examples/jsm/environments/RoomEnvironment.js'),
      import('three/examples/jsm/libs/meshopt_decoder.module.js'),
    ])

    if (!canvasEl || !stageEl) return
    THREE = threeMod

    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08

    scene = new THREE.Scene()
    scene.background = new THREE.Color('#070f14')
    scene.fog = new THREE.Fog('#070f14', 1.85, 3.6)

    // Procedural studio environment rotated off-axis so front screens never catch white softbox glare
    const pmrem = new THREE.PMREMGenerator(renderer)
    const roomEnv = new RoomEnvironment()
    roomEnv.rotation.y = Math.PI * 0.75
    envRT = pmrem.fromScene(roomEnv, 0.04)
    scene.environment = envRT.texture
    scene.environmentIntensity = 0.48
    roomEnv.dispose()
    pmrem.dispose()

    // Balanced 3-point CAD studio lighting
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.75)
    scene.add(hemi)

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.45)
    keyLight.position.set(0.85, 1.35, 1.15)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.65)
    fillLight.position.set(-1.1, 0.75, 0.65)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xfde68a, 0.55)
    rimLight.position.set(0.15, 0.95, -1.25)
    scene.add(rimLight)

    gridGroup = buildGridFloor(THREE)
    scene.add(gridGroup)

    modelGroup = new THREE.Group()
    modelGroup.name = 'ActiveRobots'
    scene.add(modelGroup)

    const rect = stageEl.getBoundingClientRect()
    const w = Math.max(280, Math.floor(rect.width))
    const h = Math.max(260, Math.floor(rect.height))
    camera = new THREE.PerspectiveCamera(36, w / h, 0.015, 12)
    camera.position.set(0.34, 0.24, 0.42)
    renderer.setSize(w, h, false)

    const orbit = new OrbitControls(camera, canvasEl)
    orbit.enableDamping = true
    orbit.dampingFactor = 0.075
    orbit.enableZoom = isTouchDevice ? true : wheelZoomArmed
    orbit.minDistance = 0.14
    orbit.maxDistance = 3.6
    orbit.maxPolarAngle = Math.PI * 0.495
    orbit.autoRotate = autoRotate
    orbit.autoRotateSpeed = 1.15
    orbit.target.set(0, 0.08, 0)
    orbit.addEventListener('start', () => {
      camTween = null
    })
    controls = orbit

    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    gltfLoaderInstance = loader

    let prevAspectBucket = w < h * 1.35 ? 'narrow' : 'wide'
    resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry || !renderer || !camera) return
      const rw = Math.max(240, Math.floor(entry.contentRect.width))
      const rh = Math.max(240, Math.floor(entry.contentRect.height))
      camera.aspect = rw / rh
      camera.updateProjectionMatrix()
      renderer.setSize(rw, rh, false)
      const nextBucket = rw < rh * 1.35 ? 'narrow' : 'wide'
      if (nextBucket !== prevAspectBucket) {
        prevAspectBucket = nextBucket
        moveToPreset(activePreset, true)
      }
    })
    resizeObserver.observe(stageEl)

    engineReady = true
    syncRenderLoop()
  })()

  return engineInitPromise
}

async function fetchRobotTemplate(id: RobotId): Promise<THREEType.Group> {
  const cached = modelTemplateCache.get(id)
  if (cached) return cached

  const existing = modelInflight.get(id)
  if (existing) return existing

  const promise = (async () => {
    await ensureEngine()
    if (!gltfLoaderInstance) throw new Error('3D loader unavailable')
    const assetUrl = url(ROBOTS[id].glbPath)
    const gltf = await gltfLoaderInstance.loadAsync(assetUrl)
    modelTemplateCache.set(id, gltf.scene)
    modelInflight.delete(id)
    return gltf.scene
  })().catch(err => {
    modelInflight.delete(id)
    throw err
  })

  modelInflight.set(id, promise)
  return promise
}

function cloneWithIsolatedShellMaterials(source: THREEType.Group): THREEType.Group {
  if (!THREE) return source
  const instance = source.clone(true)
  const extNode = instance.getObjectByName('ExteriorShell')
  if (extNode) {
    extNode.traverse(obj => {
      const mesh = obj as THREEType.Mesh
      if (!mesh.isMesh || !mesh.material) return
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(m => {
          const c = m.clone()
          c.userData.__origOpacity = m.opacity
          c.userData.__origTransparent = m.transparent
          return c
        })
      } else {
        const c = mesh.material.clone()
        c.userData.__origOpacity = mesh.material.opacity
        c.userData.__origTransparent = mesh.material.transparent
        mesh.material = c
      }
    })
  }
  return instance
}

function disposeInstanceClones(group: THREEType.Group | null) {
  if (!group) return
  group.traverse(obj => {
    const mesh = obj as THREEType.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      if (m?.userData && '__origOpacity' in m.userData) {
        m.dispose()
      }
    }
  })
}

function applyShellModeToScene() {
  if (!modelGroup || !THREE) return
  const T = THREE
  for (const robotInstance of modelGroup.children) {
    const ext = robotInstance.getObjectByName('ExteriorShell')
    if (!ext) continue
    if (shellMode === 'core') {
      ext.visible = false
      continue
    }
    ext.visible = true
    ext.traverse(obj => {
      const mesh = obj as THREEType.Mesh
      if (!mesh.isMesh || !mesh.material) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) {
        if (shellMode === 'xray') {
          m.transparent = true
          m.opacity = 0.17
          m.depthWrite = false
          m.side = T.DoubleSide
        } else {
          m.transparent = Boolean(m.userData.__origTransparent)
          m.opacity = Number(m.userData.__origOpacity ?? 1)
          m.depthWrite = true
          m.side = T.FrontSide
        }
        m.needsUpdate = true
      }
    })
  }
}

function computeCameraFraming(
  mode: ViewerMode,
  preset: CameraPreset,
): { pos: THREEType.Vector3; target: THREEType.Vector3 } | null {
  if (!THREE || !modelGroup) return null
  const T = THREE
  const box = new T.Box3().setFromObject(modelGroup)
  if (box.isEmpty()) {
    return {
      pos: new T.Vector3(0.35, 0.24, 0.42),
      target: new T.Vector3(0, 0.08, 0),
    }
  }

  const size = box.getSize(new T.Vector3())
  const center = box.getCenter(new T.Vector3())
  const target = new T.Vector3(center.x, center.y * 0.88, center.z)
  const maxDim = Math.max(size.x, size.y, size.z)
  const aspect = Math.max(0.55, camera?.aspect || 1.6)
  // Scale distance up on narrow portrait mobile canvases so horizontal span never clips
  const refAspect = mode === 'lineup' ? 1.65 : 1.25
  const aspectScale = Math.max(1, refAspect / aspect)
  const dist = (mode === 'lineup' ? maxDim * 1.32 : maxDim * 1.72) * aspectScale

  const pos = new T.Vector3()
  if (preset === 'front') {
    pos.set(target.x, target.y + dist * 0.16, target.z + dist * 1.06)
  } else if (preset === 'side') {
    pos.set(target.x + dist * 1.08, target.y + dist * 0.16, target.z + 0.001)
  } else if (preset === 'rear') {
    pos.set(target.x - dist * 0.42, target.y + dist * 0.42, target.z - dist * 0.96)
  } else if (preset === 'top') {
    pos.set(target.x, target.y + dist * 1.28, target.z + 0.04)
  } else {
    // 3/4 workbench hero angle
    if (mode === 'lineup') {
      pos.set(target.x + dist * 0.26, target.y + dist * 0.42, target.z + dist * 0.96)
    } else {
      pos.set(target.x + dist * 0.66, target.y + dist * 0.48, target.z + dist * 0.78)
    }
  }

  return { pos, target }
}

function moveToPreset(preset: CameraPreset, immediate = false) {
  activePreset = preset
  if (!camera || !controls || !THREE) return
  const framing = computeCameraFraming(activeMode, preset)
  if (!framing) return

  if (immediate) {
    camTween = null
    camera.position.copy(framing.pos)
    controls.target.copy(framing.target)
    controls.update()
  } else {
    camTween = {
      fromPos: camera.position.clone(),
      toPos: framing.pos,
      fromTarget: controls.target.clone(),
      toTarget: framing.target,
      startMs: performance.now(),
      durationMs: 420,
    }
  }
}

async function activateMode(mode: ViewerMode, immediateCam = false) {
  activeMode = mode
  const token = ++requestToken
  isLoading = true
  loadError = ''

  try {
    await ensureEngine()
    if (token !== requestToken || !modelGroup || !THREE) return

    if (mode === 'lineup') {
      loadProgressText = 'Loading V1, V2 & V3 1:1 scale lineup…'
      const [v1Tpl, v2Tpl, v3Tpl] = await Promise.all([
        fetchRobotTemplate('v1'),
        fetchRobotTemplate('v2'),
        fetchRobotTemplate('v3'),
      ])
      if (token !== requestToken || !modelGroup) return

      disposeInstanceClones(modelGroup)
      modelGroup.clear()

      for (const [id, tpl] of [
        ['v1', v1Tpl],
        ['v2', v2Tpl],
        ['v3', v3Tpl],
      ] as const) {
        const inst = cloneWithIsolatedShellMaterials(tpl)
        inst.position.set(ROBOTS[id].lineupX, 0, 0)
        modelGroup.add(inst)
      }
    } else {
      loadProgressText = `Loading ${ROBOTS[mode].shortLabel} CAD assembly…`
      const tpl = await fetchRobotTemplate(mode)
      if (token !== requestToken || !modelGroup) return

      disposeInstanceClones(modelGroup)
      modelGroup.clear()

      const inst = cloneWithIsolatedShellMaterials(tpl)
      inst.position.set(0, 0, 0)
      modelGroup.add(inst)
    }

    applyShellModeToScene()
    // Default lineup to non-rotating front-3/4 so scale comparison reads cleanly right away
    if (mode === 'lineup' && controls) {
      autoRotate = false
      controls.autoRotate = false
    }
    moveToPreset(activePreset, immediateCam)
    isLoading = false
  } catch (err) {
    if (token !== requestToken) return
    console.error('RobotModelViewer load error:', err)
    loadError = 'Could not load 3D CAD model. Check WebGL support or reload.'
    isLoading = false
  }
}

function setShellMode(next: ShellMode) {
  shellMode = next
  applyShellModeToScene()
}

function toggleAutoRotate() {
  autoRotate = !autoRotate
  if (controls) {
    controls.autoRotate = autoRotate
  }
}

function zoomBy(factor: number) {
  if (!camera || !controls || !THREE) return
  camTween = null
  const offset = camera.position.clone().sub(controls.target)
  const nextLen = Math.min(3.4, Math.max(0.15, offset.length() * factor))
  offset.setLength(nextLen)
  camera.position.copy(controls.target).add(offset)
  controls.update()
}

function armWheelZoom() {
  if (isTouchDevice) return
  wheelZoomArmed = true
  if (controls) controls.enableZoom = true
}

function disarmWheelZoom() {
  if (isTouchDevice) return
  wheelZoomArmed = false
  if (controls) controls.enableZoom = false
}

function toggleTouchInteractive() {
  touchInteractive = !touchInteractive
  if (controls) {
    controls.enableZoom = true
  }
}

function renderTick(now: number) {
  rafId = 0
  if (!engineReady || !isInViewport || document.hidden || !renderer || !scene || !camera || !controls) {
    return
  }

  if (camTween) {
    const tRaw = (now - camTween.startMs) / camTween.durationMs
    if (tRaw >= 1) {
      camera.position.copy(camTween.toPos)
      controls.target.copy(camTween.toTarget)
      camTween = null
    } else {
      const ease = 1 - Math.pow(1 - tRaw, 3)
      camera.position.lerpVectors(camTween.fromPos, camTween.toPos, ease)
      controls.target.lerpVectors(camTween.fromTarget, camTween.toTarget, ease)
    }
  }

  controls.update()
  renderer.render(scene, camera)
  rafId = requestAnimationFrame(renderTick)
}

function syncRenderLoop() {
  if (!engineReady) return
  if (isInViewport && !document.hidden) {
    if (!rafId) {
      rafId = requestAnimationFrame(renderTick)
    }
  } else if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

function handleVisibilityChange() {
  syncRenderLoop()
}

onMount(() => {
  if (typeof window === 'undefined' || !rootEl) return
  isTouchDevice =
    window.matchMedia('(pointer: coarse)').matches ||
    (navigator.maxTouchPoints ?? 0) > 0
  document.addEventListener('visibilitychange', handleVisibilityChange)

  intersectionObserver = new IntersectionObserver(
    entries => {
      const entry = entries[0]
      if (!entry) return
      isInViewport = entry.isIntersecting
      if (!isInViewport && touchInteractive) {
        touchInteractive = false
      }
      if (isInViewport && !engineInitPromise) {
        void activateMode(activeMode, true)
      }
      syncRenderLoop()
    },
    { rootMargin: '260px 0px' },
  )
  intersectionObserver.observe(rootEl)

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
})

onDestroy(() => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  intersectionObserver?.disconnect()
  resizeObserver?.disconnect()
  controls?.dispose()

  disposeInstanceClones(modelGroup)
  for (const tpl of modelTemplateCache.values()) {
    tpl.traverse(obj => {
      const mesh = obj as THREEType.Mesh
      if (!mesh.isMesh) return
      mesh.geometry?.dispose?.()
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) {
        if (!m) continue
        for (const val of Object.values(m)) {
          if (val && typeof val === 'object' && 'isTexture' in val && val.isTexture) {
            val.dispose()
          }
        }
        m.dispose?.()
      }
    })
  }
  modelTemplateCache.clear()

  if (gridGroup) {
    gridGroup.traverse(obj => {
      const mesh = obj as THREEType.Mesh
      mesh.geometry?.dispose?.()
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) m?.dispose?.()
    })
  }

  envRT?.dispose()
  renderer?.dispose()
})
</script>

<section
  bind:this={rootEl}
  class="robot-viewer not-prose"
  class:is-compact={compact}
  aria-label="Interactive 3D Ainekio CAD model viewer"
  data-robot-viewer
>
  <!-- Top Control Bar -->
  <div class="rv-topbar">
    <div class="rv-title-block">
      <span class="rv-eyebrow">Interactive 3D CAD · 100 mm Major Grid</span>
      {#if activeMode === 'lineup'}
        <h3 class="rv-heading">1:1 True-Scale Lineup: V1 · V2 · V3</h3>
      {:else if currentMeta}
        <h3 class="rv-heading">{currentMeta.title}</h3>
      {/if}
    </div>

    {#if allowModelSwitch}
      <div class="rv-segmented" role="tablist" aria-label="Select robot generation">
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'v1'}
          class:is-active={activeMode === 'v1'}
          on:click={() => void activateMode('v1')}
        >
          V1
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'v2'}
          class:is-active={activeMode === 'v2'}
          on:click={() => void activateMode('v2')}
        >
          V2
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'v3'}
          class:is-active={activeMode === 'v3'}
          on:click={() => void activateMode('v3')}
        >
          V3
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'lineup'}
          class:is-active={activeMode === 'lineup'}
          on:click={() => void activateMode('lineup')}
        >
          1:1 Lineup
        </button>
      </div>
    {:else}
      <div class="rv-segmented" role="group" aria-label="Compare scale">
        <button
          type="button"
          class:is-active={activeMode === initialModel}
          on:click={() => void activateMode(initialModel)}
        >
          {ROBOTS[initialModel === 'lineup' ? 'v2' : initialModel].shortLabel}
        </button>
        <button
          type="button"
          class:is-active={activeMode === 'lineup'}
          on:click={() => void activateMode('lineup')}
        >
          Compare 1:1 Lineup
        </button>
      </div>
    {/if}
  </div>

  <!-- 3D WebGL Viewport + Camera Toolbar -->
  <div class="rv-viewport-wrap">
    <div
      bind:this={stageEl}
      class="rv-stage"
      on:pointerdown={armWheelZoom}
      on:pointerleave={disarmWheelZoom}
    >
      <canvas
        bind:this={canvasEl}
        class="rv-canvas"
        class:is-scroll-passthrough={isTouchDevice && !touchInteractive}
      ></canvas>

      <!-- Shell / Cutaway Mode Pill Overlay (Top-Left) -->
      <div class="rv-hud-top-left" role="group" aria-label="Shell cutaway mode">
        <button
          type="button"
          class="rv-chip"
          class:is-active={shellMode === 'full'}
          on:click={() => setShellMode('full')}
        >
          Full Shell
        </button>
        <button
          type="button"
          class="rv-chip"
          class:is-active={shellMode === 'xray'}
          on:click={() => setShellMode('xray')}
        >
          X-Ray
        </button>
        <button
          type="button"
          class="rv-chip"
          class:is-active={shellMode === 'core'}
          on:click={() => setShellMode('core')}
        >
          Bare Core
        </button>
      </div>

      <!-- Mobile Scroll-Safe 3D Touch Toggle Pill -->
      {#if isTouchDevice && !isLoading && !loadError}
        <button
          type="button"
          class="rv-touch-toggle"
          class:is-active={touchInteractive}
          on:click={toggleTouchInteractive}
        >
          {touchInteractive ? 'Done 3D · Resume Page Scroll' : 'Tap to Orbit & Pinch-Zoom 3D'}
        </button>
      {/if}

      <!-- Lineup Labels Overlay -->
      {#if activeMode === 'lineup' && !isLoading && !loadError}
        <div class="rv-lineup-legend" aria-hidden="true">
          <span><strong>Left:</strong> V1 (187 mm)</span>
          <span><strong>Center:</strong> V2 (245 mm · 650 g)</span>
          <span><strong>Right:</strong> V3 (436 mm · DS3235)</span>
        </div>
      {/if}

      <!-- Interaction Hint (Desktop Bottom-Right) -->
      <div class="rv-hint" aria-hidden="true">
        Drag to orbit · Right-drag to pan · {wheelZoomArmed ? 'Scroll to zoom' : 'Click canvas to scroll-zoom'}
      </div>

      <!-- Loading / Error Overlay -->
      {#if isLoading}
        <div class="rv-overlay" role="status" aria-live="polite">
          <span class="rv-spinner" aria-hidden="true"></span>
          <span>{loadProgressText}</span>
        </div>
      {:else if loadError}
        <div class="rv-overlay is-error" role="alert">
          <span>{loadError}</span>
        </div>
      {/if}
    </div>

    <!-- Camera Presets & Zoom (Top-Right HUD on desktop; clean dedicated strip on mobile) -->
    <div class="rv-camera-bar" role="group" aria-label="Camera views">
      <button
        type="button"
        class="rv-chip"
        class:is-active={activePreset === 'three-quarter'}
        on:click={() => moveToPreset('three-quarter')}
        title="Three-quarter view"
      >
        3/4
      </button>
      <button
        type="button"
        class="rv-chip"
        class:is-active={activePreset === 'front'}
        on:click={() => moveToPreset('front')}
        title="Front elevation"
      >
        Front
      </button>
      <button
        type="button"
        class="rv-chip"
        class:is-active={activePreset === 'side'}
        on:click={() => moveToPreset('side')}
        title="Right-side profile"
      >
        Side
      </button>
      <button
        type="button"
        class="rv-chip"
        class:is-active={activePreset === 'rear'}
        on:click={() => moveToPreset('rear')}
        title="Rear three-quarter view"
      >
        Rear
      </button>
      <button
        type="button"
        class="rv-chip"
        class:is-active={activePreset === 'top'}
        on:click={() => moveToPreset('top')}
        title="Top-down deck layout"
      >
        Top
      </button>
      <button
        type="button"
        class="rv-chip"
        class:is-active={autoRotate}
        on:click={toggleAutoRotate}
        title="Toggle turntable rotation"
      >
        {autoRotate ? 'Pause' : 'Orbit'}
      </button>
      <button
        type="button"
        class="rv-chip rv-zoom-btn"
        on:click={() => zoomBy(0.8)}
        aria-label="Zoom in"
        title="Zoom in"
      >
        +
      </button>
      <button
        type="button"
        class="rv-chip rv-zoom-btn"
        on:click={() => zoomBy(1.25)}
        aria-label="Zoom out"
        title="Zoom out"
      >
        −
      </button>
    </div>
  </div>

  <!-- Bottom Telemetry & Spec Strip -->
  <div class="rv-footer">
    {#if activeMode === 'lineup'}
      <div class="rv-specs">
        <div>
          <span class="rv-spec-label">V1 Envelope</span>
          <span class="rv-spec-val">{ROBOTS.v1.envelope}</span>
        </div>
        <div>
          <span class="rv-spec-label">V2 Envelope (Active)</span>
          <span class="rv-spec-val">{ROBOTS.v2.envelope} · 650 g</span>
        </div>
        <div>
          <span class="rv-spec-label">V3 Envelope (CAD)</span>
          <span class="rv-spec-val">{ROBOTS.v3.envelope}</span>
        </div>
      </div>
      <div class="rv-links">
        {#if pageGeneration !== 'v1'}<a href={url('/posts/ainekio-v1/')}>V1 →</a>{/if}
        {#if pageGeneration !== 'v2'}<a href={url('/posts/ainekio-v2/')}>V2 →</a>{/if}
        {#if pageGeneration !== 'v3'}<a href={url('/posts/ainekio-v3-preview/')}>V3 →</a>{/if}
      </div>
    {:else if currentMeta}
      <div class="rv-specs">
        <div>
          <span class="rv-spec-label">CAD Envelope (L × W × H)</span>
          <span class="rv-spec-val">{currentMeta.envelope}</span>
        </div>
        <div>
          <span class="rv-spec-label">Actuation</span>
          <span class="rv-spec-val">{currentMeta.actuators}</span>
        </div>
        <div>
          <span class="rv-spec-label">Compute &amp; Face</span>
          <span class="rv-spec-val">{currentMeta.compute}</span>
        </div>
      </div>
      {#if allowModelSwitch}
        <div class="rv-links">
          {#if pageGeneration === currentMeta.id}
            <button
              type="button"
              class="rv-link-btn"
              on:click={() => void activateMode('lineup')}
            >
              Compare in 1:1 Lineup →
            </button>
          {:else}
            <a href={url(currentMeta.guideHref)}>{currentMeta.guideLabel} →</a>
          {/if}
        </div>
      {/if}
    {/if}
  </div>

  {#if caption}
    <p class="rv-caption">{caption}</p>
  {/if}
</section>

<style>
  .robot-viewer {
    margin: 1.25rem 0;
    border-radius: 0.8rem;
    overflow: hidden;
    background: #070f14;
    border: 1px solid rgb(255 255 255 / 0.12);
    box-shadow: 0 12px 32px rgb(0 0 0 / 0.28), inset 0 1px 0 rgb(255 255 255 / 0.05);
    color: #e2e8f0;
  }

  .rv-topbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem 1rem;
    padding: 0.8rem 1rem;
    background: linear-gradient(180deg, #0d1a22, #091319);
    border-bottom: 1px solid rgb(255 255 255 / 0.09);
  }

  .rv-eyebrow {
    display: block;
    font-size: 0.67rem;
    font-weight: 750;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #38bdf8;
  }

  .rv-heading {
    margin: 0.12rem 0 0;
    font-size: 0.98rem;
    font-weight: 750;
    line-height: 1.25;
    color: #f8fafc;
  }

  .rv-segmented {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.22rem;
    border-radius: 0.55rem;
    background: #050b0e;
    border: 1px solid rgb(255 255 255 / 0.1);
  }

  .rv-segmented button {
    padding: 0.34rem 0.72rem;
    border-radius: 0.38rem;
    font-size: 0.78rem;
    font-weight: 700;
    color: #94a3b8;
    background: transparent;
    border: 0;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    white-space: nowrap;
  }

  .rv-segmented button:hover {
    color: #f1f5f9;
    background: rgb(255 255 255 / 0.06);
  }

  .rv-segmented button.is-active {
    color: #061015;
    background: #38bdf8;
  }

  .rv-viewport-wrap {
    position: relative;
  }

  .rv-stage {
    position: relative;
    width: 100%;
    height: clamp(340px, 50vw, 500px);
    background: radial-gradient(circle at 50% 42%, #0e1f29 0%, #070f14 74%);
    user-select: none;
  }

  .robot-viewer.is-compact .rv-stage {
    height: clamp(320px, 44vw, 440px);
  }

  .rv-canvas {
    display: block;
    width: 100%;
    height: 100%;
    cursor: grab;
    touch-action: none;
  }

  .rv-canvas.is-scroll-passthrough {
    touch-action: pan-y !important;
    pointer-events: none;
    cursor: default;
  }

  .rv-canvas:active {
    cursor: grabbing;
  }

  .rv-hud-top-left,
  .rv-camera-bar {
    position: absolute;
    top: 0.65rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    z-index: 3;
  }

  .rv-hud-top-left {
    left: 0.7rem;
  }

  .rv-camera-bar {
    right: 0.7rem;
    justify-content: flex-end;
  }

  .rv-touch-toggle {
    position: absolute;
    left: 50%;
    bottom: 0.65rem;
    transform: translateX(-50%);
    min-height: 2.25rem;
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    font-size: 0.76rem;
    font-weight: 750;
    letter-spacing: 0.02em;
    white-space: nowrap;
    color: #e0f2fe;
    background: rgb(8 20 28 / 0.86);
    backdrop-filter: blur(8px);
    border: 1px solid rgb(56 189 248 / 0.55);
    box-shadow: 0 4px 14px rgb(0 0 0 / 0.35);
    cursor: pointer;
    z-index: 3;
  }

  .rv-touch-toggle.is-active {
    color: #061015;
    background: #38bdf8;
    border-color: #7dd3fc;
  }

  .rv-chip {
    padding: 0.28rem 0.56rem;
    border-radius: 0.4rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #cbd5e1;
    background: rgb(7 15 20 / 0.78);
    backdrop-filter: blur(8px);
    border: 1px solid rgb(255 255 255 / 0.14);
    cursor: pointer;
    transition: border-color 0.14s ease, color 0.14s ease, background 0.14s ease;
  }

  .rv-chip:hover {
    color: #ffffff;
    border-color: rgb(56 189 248 / 0.55);
    background: rgb(14 29 38 / 0.88);
  }

  .rv-chip.is-active {
    color: #fde68a;
    border-color: rgb(251 191 36 / 0.65);
    background: rgb(245 158 11 / 0.18);
  }

  .rv-zoom-btn {
    padding: 0.28rem 0.52rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.82rem;
    line-height: 1;
  }

  .rv-lineup-legend {
    position: absolute;
    left: 0.75rem;
    bottom: 0.6rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.85rem;
    padding: 0.3rem 0.6rem;
    border-radius: 0.4rem;
    background: rgb(7 15 20 / 0.78);
    border: 1px solid rgb(255 255 255 / 0.1);
    font-size: 0.71rem;
    color: #cbd5e1;
    pointer-events: none;
    z-index: 2;
  }

  .rv-lineup-legend strong {
    color: #38bdf8;
  }

  .rv-hint {
    position: absolute;
    right: 0.75rem;
    bottom: 0.6rem;
    padding: 0.24rem 0.55rem;
    border-radius: 0.38rem;
    background: rgb(7 15 20 / 0.72);
    font-size: 0.69rem;
    color: #94a3b8;
    pointer-events: none;
    z-index: 2;
  }

  .rv-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    background: rgb(7 15 20 / 0.74);
    backdrop-filter: blur(4px);
    font-size: 0.84rem;
    font-weight: 650;
    color: #e2e8f0;
    z-index: 4;
  }

  .rv-overlay.is-error {
    color: #fca5a5;
  }

  .rv-spinner {
    width: 1.05rem;
    height: 1.05rem;
    border-radius: 999px;
    border: 2px solid rgb(56 189 248 / 0.25);
    border-top-color: #38bdf8;
    animation: rv-spin 0.75s linear infinite;
  }

  @keyframes rv-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .rv-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem 1.2rem;
    padding: 0.72rem 1rem;
    background: #091319;
    border-top: 1px solid rgb(255 255 255 / 0.08);
  }

  .rv-specs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem 1.35rem;
  }

  .rv-spec-label {
    display: block;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #64748b;
  }

  .rv-spec-val {
    display: block;
    font-size: 0.8rem;
    font-weight: 650;
    color: #e2e8f0;
  }

  .rv-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    font-size: 0.82rem;
    font-weight: 700;
  }

  .rv-links a,
  .rv-link-btn {
    color: #38bdf8;
    text-decoration: none;
    white-space: nowrap;
    background: transparent;
    border: 0;
    padding: 0;
    font: inherit;
    cursor: pointer;
  }

  .rv-links a:hover,
  .rv-link-btn:hover {
    text-decoration: underline;
  }

  .rv-caption {
    margin: 0;
    padding: 0.55rem 1rem 0.7rem;
    background: #070f14;
    border-top: 1px solid rgb(255 255 255 / 0.06);
    font-size: 0.78rem;
    line-height: 1.45;
    color: #94a3b8;
  }

  @media (max-width: 680px) {
    .rv-topbar {
      padding: 0.7rem 0.85rem;
    }
    .rv-segmented {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .rv-segmented button {
      min-height: 2.25rem;
      padding: 0.38rem 0.35rem;
      font-size: 0.78rem;
      text-align: center;
    }
    .rv-hud-top-left {
      top: 0.55rem;
      left: 0.55rem;
      right: 0.55rem;
    }
    .rv-chip {
      min-height: 2.25rem;
      padding: 0.36rem 0.68rem;
      font-size: 0.76rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .rv-zoom-btn {
      display: none;
    }
    .rv-camera-bar {
      position: static;
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 0.3rem;
      padding: 0.48rem 0.65rem;
      background: #081218;
      border-top: 1px solid rgb(255 255 255 / 0.08);
    }
    .rv-camera-bar .rv-chip {
      padding: 0.36rem 0.2rem;
      font-size: 0.73rem;
      min-width: 0;
    }
    .rv-hint,
    .rv-lineup-legend {
      display: none;
    }
  }
</style>
