<script lang="ts">
import { onDestroy, onMount } from 'svelte'
import { url } from '@utils/url-utils'
import type * as THREEType from 'three'

export type ViewerMode = 'v1' | 'v2' | 'v3' | 'lineup'
export type ShellMode = 'full' | 'xray' | 'core'
export type CameraPreset = 'three-quarter' | 'front' | 'side' | 'rear' | 'top'
type MotionCategory = 'featured' | 'gaits' | 'emotes' | 'poses' | 'all'
type LineupTarget = 'v2' | 'v1' | 'both'

export let initialModel: ViewerMode = 'v2'
export let allowModelSwitch = true
export let compact = false
export let caption = ''
export let pageGeneration: 'v1' | 'v2' | 'v3' | '' = ''

type RobotId = 'v1' | 'v2' | 'v3'
type AnimatableRobotId = 'v1' | 'v2'

interface RobotMeta {
  id: RobotId
  shortLabel: string
  title: string
  badge: string
  glbPath: string
  motionPath?: string
  clipCount: number
  envelope: string
  actuators: string
  compute: string
  guideHref: string
  guideLabel: string
  lineupX: number
}

interface MotionClip {
  id: string
  label: string
  category: 'gaits' | 'poses' | 'emotes'
  featured: boolean
  loop: boolean
  duration: number
  frames: number
  data: string
  decoded?: Int16Array
}

interface MotionLibraryPayload {
  robot: AnimatableRobotId
  version: number
  sampleFps: number
  stride: number
  clips: MotionClip[]
}

interface V1LegRig {
  hip: THREEType.Object3D
  knee: THREEType.Object3D
  standHip: number
  standKnee: number
  kneeSign: number
  kneeAxis: THREEType.Vector3
}

interface V1Rig {
  kind: 'v1'
  root: THREEType.Object3D
  restRootPos: THREEType.Vector3
  legs: Record<'FL' | 'FR' | 'RL' | 'RR', V1LegRig>
}

interface V2LegRig {
  shoulder: THREEType.Object3D
  primary: THREEType.Object3D
  input: THREEType.Object3D
  rod: THREEType.Object3D
  foot: THREEType.Object3D
  restRodPos: THREEType.Vector3
  restFootPos: THREEType.Vector3
  rollSign: number
}

interface V2Rig {
  kind: 'v2'
  root: THREEType.Object3D
  restRootPos: THREEType.Vector3
  legs: Record<'FL' | 'FR' | 'RL' | 'RR', V2LegRig>
}

type RobotRig = V1Rig | V2Rig

const DEG2RAD = Math.PI / 180

// V2 35-20-28-38 four-bar linkage constants (from Blender Wireless CAD)
const V2_A0 = -2.589563330529253
const V2_T0 = -3.7982594562326515
const V2_DX0 = 32.78664016723633
const V2_DZ0 = 51.35725402832031
const V2_BETA0 = 2.615800380706787
const V2_PX0 = 34.24711227416992
const V2_PZ0 = 93.42145538330078
const V2_PHI0 = -2.312775135040283

const V2_TO_V1_FALLBACK: Record<string, string> = {
  walk: 'walk_forward',
  walk_turn_left: 'turn_left',
  walk_turn_right: 'turn_right',
  crawl_forward: 'walk_slow',
  crawl_backward: 'walk_backward',
  crawl_turn_left: 'turn_left',
  crawl_turn_right: 'turn_right',
  crab_right: 'crab',
  crab_forward: 'crab',
  crab_backward: 'crab',
  crab_turn_left: 'turn_left',
  crab_turn_right: 'turn_right',
  turn_left_15: 'turn_left',
  turn_right_15: 'turn_right',
  crouch: 'sit',
  lay_down: 'rest',
  upright: 'stand',
}

const ROBOTS: Record<RobotId, RobotMeta> = {
  v1: {
    id: 'v1',
    shortLabel: 'V1 (Active 8-Servo)',
    title: 'Ainekio V1 · Active 8-Servo Quadruped',
    badge: 'Active Floor Robot + P4 Upgrade · 8 DOF',
    glbPath: '/models/ainekio-v1.glb',
    motionPath: '/models/ainekio-v1-motions.json',
    clipCount: 38,
    envelope: '196.7 × 186.5 × 78.1 mm',
    actuators: '8× 4th-Wire MG90S · 683ZZ Bearings',
    compute: 'ESP32-P4 + PCA9685 · 0.96" OLED (59 faces)',
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
    motionPath: '/models/ainekio-v2-motions.json',
    clipCount: 47,
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
    clipCount: 0,
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

// Motion & Gait Drawer State
let motionOpen = false
let motionCategory: MotionCategory = 'featured'
let motionQuery = ''
let lineupTarget: LineupTarget = 'v2'
let motionLoading = false
let motionError = ''
let motionLibVersion = 0

let activeClipId = ''
let isPlayingMotion = false
let loopMotion = true
let inPlaceMode = true
let playbackSpeed = 1
let playbackTimeSec = 0
let activeClipDurationSec = 0
let lastTickMs = 0

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
const motionLibCache = new Map<AnimatableRobotId, MotionLibraryPayload>()
const motionLibInflight = new Map<AnimatableRobotId, Promise<MotionLibraryPayload>>()

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
let sampleScratch = new Float32Array(20)

let camTween: {
  fromPos: THREEType.Vector3
  toPos: THREEType.Vector3
  fromTarget: THREEType.Vector3
  toTarget: THREEType.Vector3
  startMs: number
  durationMs: number
} | null = null

$: currentMeta = activeMode === 'lineup' ? null : ROBOTS[activeMode]
$: effectiveMotionRobot = (
  activeMode === 'v1'
    ? 'v1'
    : activeMode === 'v2'
      ? 'v2'
      : activeMode === 'lineup'
        ? lineupTarget === 'v1'
          ? 'v1'
          : 'v2'
        : null
) as AnimatableRobotId | null

$: currentMotionLib = (
  motionLibVersion >= 0 && effectiveMotionRobot
    ? motionLibCache.get(effectiveMotionRobot) ?? null
    : null
)

$: allClips = currentMotionLib ? currentMotionLib.clips : []
$: gaitCount = allClips.filter(c => c.category === 'gaits').length
$: emoteCount = allClips.filter(c => c.category === 'emotes').length
$: poseCount = allClips.filter(c => c.category === 'poses').length

$: filteredClips = allClips.filter(clip => {
  if (motionQuery.trim()) {
    const q = motionQuery.trim().toLowerCase()
    return clip.label.toLowerCase().includes(q) || clip.id.toLowerCase().includes(q)
  }
  if (motionCategory === 'featured') return clip.featured
  if (motionCategory === 'all') return true
  return clip.category === motionCategory
})

$: activeClipObj = allClips.find(c => c.id === activeClipId) ?? null

function buildGridFloor(T: typeof THREEType): THREEType.Group {
  const grp = new T.Group()
  grp.name = 'StudioFloor'

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

    const pmrem = new THREE.PMREMGenerator(renderer)
    const roomEnv = new RoomEnvironment()
    roomEnv.rotation.y = Math.PI * 0.75
    envRT = pmrem.fromScene(roomEnv, 0.04)
    scene.environment = envRT.texture
    scene.environmentIntensity = 0.48
    roomEnv.dispose()
    pmrem.dispose()

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
      if (nextBucket !== prevAspectBucket && !isPlayingMotion) {
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

async function fetchMotionLibrary(id: AnimatableRobotId): Promise<MotionLibraryPayload> {
  const cached = motionLibCache.get(id)
  if (cached) return cached

  const existing = motionLibInflight.get(id)
  if (existing) return existing

  const pathStr = ROBOTS[id].motionPath
  if (!pathStr) throw new Error(`No motion library for ${id}`)

  const promise = (async () => {
    const res = await fetch(url(pathStr))
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const payload = (await res.json()) as MotionLibraryPayload
    motionLibCache.set(id, payload)
    motionLibInflight.delete(id)
    motionLibVersion += 1
    return payload
  })().catch(err => {
    motionLibInflight.delete(id)
    throw err
  })

  motionLibInflight.set(id, promise)
  return promise
}

function decodeClipInt16(clip: MotionClip): Int16Array {
  if (clip.decoded) return clip.decoded
  const bin = atob(clip.data)
  const byteLen = bin.length
  const bytes = new Uint8Array(byteLen)
  for (let i = 0; i < byteLen; i++) {
    bytes[i] = bin.charCodeAt(i)
  }
  const view = new DataView(bytes.buffer)
  const count = byteLen >> 1
  const out = new Int16Array(count)
  for (let i = 0; i < count; i++) {
    out[i] = view.getInt16(i * 2, true)
  }
  clip.decoded = out
  return out
}

function isExteriorMesh(obj: THREEType.Object3D): boolean {
  if (!(obj as THREEType.Mesh).isMesh) return false
  if (obj.name.startsWith('Ext_') || obj.name.startsWith('ExteriorShell')) return true
  let cur = obj.parent
  while (cur) {
    if (cur.name === 'ExteriorShell') return true
    cur = cur.parent
  }
  return false
}

function bindRobotRig(instance: THREEType.Group, id: RobotId): RobotRig | null {
  if (!THREE || id === 'v3') return null
  const T = THREE
  const root = instance.getObjectByName('RobotRoot')
  if (!root) return null

  if (id === 'v1') {
    const specs: Record<'FL' | 'FR' | 'RL' | 'RR', [number, number, number, number]> = {
      FL: [45, 0, 45, -1],
      FR: [135, 180, -45, 1],
      RL: [135, 180, 135, 1],
      RR: [45, 0, -135, -1],
    }
    const legs = {} as Record<'FL' | 'FR' | 'RL' | 'RR', V1LegRig>
    for (const leg of ['FL', 'FR', 'RL', 'RR'] as const) {
      const hip = instance.getObjectByName(`${leg}_Hip`)
      const knee = instance.getObjectByName(`${leg}_Knee`)
      if (!hip || !knee) return null
      const [standHip, standKnee, rzStand, kneeSign] = specs[leg]
      const rzRad = rzStand * DEG2RAD
      legs[leg] = {
        hip,
        knee,
        standHip,
        standKnee,
        kneeSign,
        kneeAxis: new T.Vector3(Math.cos(rzRad), 0, -Math.sin(rzRad)),
      }
    }
    return {
      kind: 'v1',
      root,
      restRootPos: root.position.clone(),
      legs,
    }
  }

  const legs = {} as Record<'FL' | 'FR' | 'RL' | 'RR', V2LegRig>
  for (const leg of ['FL', 'FR', 'RL', 'RR'] as const) {
    const shoulder = instance.getObjectByName(`${leg}_Shoulder`)
    const primary = instance.getObjectByName(`${leg}_Primary`)
    const input = instance.getObjectByName(`${leg}_Input`)
    const rod = instance.getObjectByName(`${leg}_Rod`)
    const foot = instance.getObjectByName(`${leg}_Foot`)
    if (!shoulder || !primary || !input || !rod || !foot) return null
    legs[leg] = {
      shoulder,
      primary,
      input,
      rod,
      foot,
      restRodPos: rod.position.clone(),
      restFootPos: foot.position.clone(),
      rollSign: leg === 'FL' || leg === 'RL' ? -1 : 1,
    }
  }
  return {
    kind: 'v2',
    root,
    restRootPos: root.position.clone(),
    legs,
  }
}

function resetRigToNeutral(rig: RobotRig | null | undefined) {
  if (!rig) return
  rig.root.position.copy(rig.restRootPos)
  rig.root.quaternion.identity()
  if (rig.kind === 'v1') {
    for (const leg of ['FL', 'FR', 'RL', 'RR'] as const) {
      rig.legs[leg].hip.quaternion.identity()
      rig.legs[leg].knee.quaternion.identity()
    }
  } else {
    for (const leg of ['FL', 'FR', 'RL', 'RR'] as const) {
      const l = rig.legs[leg]
      l.shoulder.quaternion.identity()
      l.primary.quaternion.identity()
      l.input.quaternion.identity()
      l.rod.position.copy(l.restRodPos)
      l.rod.quaternion.identity()
      l.foot.position.copy(l.restFootPos)
      l.foot.quaternion.identity()
    }
  }
}

function wrapTravelCoord(valMeters: number, halfSpan: number): number {
  const span = halfSpan * 2
  if (Math.abs(valMeters) <= halfSpan) return valMeters
  return ((((valMeters + halfSpan) % span) + span) % span) - halfSpan
}

function sampleClipAtTime(clip: MotionClip, stride: number, sampleFps: number, tSec: number, out: Float32Array) {
  const arr = decodeClipInt16(clip)
  const maxIdx = Math.max(0, clip.frames - 1)
  const fExact = Math.max(0, Math.min(maxIdx, tSec * sampleFps))
  const i0 = Math.min(maxIdx, Math.floor(fExact))
  const i1 = Math.min(maxIdx, i0 + 1)
  const frac = fExact - i0
  const base0 = i0 * stride
  const base1 = i1 * stride
  for (let c = 0; c < stride; c++) {
    const v0 = arr[base0 + c] ?? 0
    const v1 = arr[base1 + c] ?? v0
    out[c] = v0 + (v1 - v0) * frac
  }
}

function applySampleToRig(rig: RobotRig, ch: Float32Array, allowTravel: boolean, isLineup: boolean) {
  const dxMm = ch[0] * 0.2
  const dyMm = ch[1] * 0.2
  const dzMm = ch[2] * 0.2
  const rx = ch[3] * 0.001
  const ry = ch[4] * 0.001
  const rz = ch[5] * 0.001

  let tx = 0
  let tz = 0
  if (allowTravel) {
    const halfX = isLineup ? 0.09 : 0.42
    const halfZ = isLineup ? 0.36 : 0.42
    tx = wrapTravelCoord(dyMm * 0.001, halfX)
    tz = wrapTravelCoord(dxMm * 0.001, halfZ)
  }
  const ty = dzMm * 0.001

  rig.root.position.set(
    rig.restRootPos.x + tx,
    rig.restRootPos.y + ty,
    rig.restRootPos.z + tz,
  )
  rig.root.rotation.set(ry, rz, rx, 'YXZ')

  if (rig.kind === 'v1') {
    const order: Array<['FL' | 'FR' | 'RL' | 'RR', number]> = [
      ['FL', 6],
      ['FR', 8],
      ['RL', 10],
      ['RR', 12],
    ]
    for (const [legKey, base] of order) {
      const leg = rig.legs[legKey]
      const hipDeg = ch[base] * 0.1
      const kneeDeg = ch[base + 1] * 0.1
      leg.hip.rotation.set(0, (hipDeg - leg.standHip) * DEG2RAD, 0)
      leg.knee.quaternion.setFromAxisAngle(
        leg.kneeAxis,
        leg.kneeSign * (kneeDeg - leg.standKnee) * DEG2RAD,
      )
    }
    return
  }

  const order: Array<['FL' | 'FR' | 'RL' | 'RR', number]> = [
    ['FL', 6],
    ['FR', 9],
    ['RL', 12],
    ['RR', 15],
  ]
  for (const [legKey, base] of order) {
    const leg = rig.legs[legKey]
    const hDeg = ch[base] * 0.1
    const aDeg = ch[base + 1] * 0.1
    const tDeg = ch[base + 2] * 0.1

    leg.shoulder.rotation.set(0, 0, leg.rollSign * hDeg * DEG2RAD)

    const a = V2_A0 + aDeg * DEG2RAD
    const t = V2_T0 + tDeg * DEG2RAD
    const dx = 62.58781342006688 + 35 * Math.cos(a)
    const dz = 69.71182170125783 + 35 * Math.sin(a)
    const px = 50.08774121717073 + 20 * Math.cos(t)
    const pz = 81.2118481681196 + 20 * Math.sin(t)
    const wx = px - dx
    const wz = pz - dz
    const d = Math.max(1e-9, Math.hypot(wx, wz))
    const along = Math.min(28, Math.max(-28, (784 - 1444 + d * d) / (2 * d)))
    const height = Math.sqrt(Math.max(0, 784 - along * along))
    const ex = dx + (along * wx - height * wz) / d
    const ez = dz + (along * wz + height * wx) / d
    const beta = Math.atan2(ez - dz, ex - dx)
    const phi = Math.atan2(ez - pz, ex - px)

    leg.primary.rotation.set(-(a - V2_A0), 0, 0)
    leg.input.rotation.set(-(t - V2_T0), 0, 0)
    leg.rod.position.set(
      leg.restRodPos.x,
      leg.restRodPos.y + 0.001 * (pz - V2_PZ0),
      leg.restRodPos.z + 0.001 * (px - V2_PX0),
    )
    leg.rod.rotation.set(-(phi - V2_PHI0), 0, 0)
    leg.foot.position.set(
      leg.restFootPos.x,
      leg.restFootPos.y + 0.001 * (dz - V2_DZ0),
      leg.restFootPos.z + 0.001 * (dx - V2_DX0),
    )
    leg.foot.rotation.set(-(beta - V2_BETA0), 0, 0)
  }
}

function updateSceneMotionPose(tSec: number) {
  if (!modelGroup || !activeClipId) return
  const isLineup = activeMode === 'lineup'

  for (const child of modelGroup.children) {
    const rId = child.userData.robotId as RobotId | undefined
    const rig = child.userData.rig as RobotRig | null | undefined
    if (!rig || !rId || rId === 'v3') continue

    let shouldAnimate = false
    if (!isLineup) {
      shouldAnimate = rId === activeMode
    } else if (lineupTarget === 'both') {
      shouldAnimate = true
    } else {
      shouldAnimate = rId === lineupTarget
    }

    if (!shouldAnimate) {
      resetRigToNeutral(rig)
      continue
    }

    const lib = motionLibCache.get(rId)
    if (!lib) continue
    let clip = lib.clips.find(c => c.id === activeClipId)
    if (!clip && rId === 'v1' && V2_TO_V1_FALLBACK[activeClipId]) {
      clip = lib.clips.find(c => c.id === V2_TO_V1_FALLBACK[activeClipId])
    }
    if (!clip) {
      resetRigToNeutral(rig)
      continue
    }

    const localT = loopMotion && clip.duration > 0 ? tSec % clip.duration : Math.min(tSec, clip.duration)
    sampleClipAtTime(clip, lib.stride, lib.sampleFps, localT, sampleScratch)
    applySampleToRig(rig, sampleScratch, !inPlaceMode, isLineup)
  }
}

function cloneWithIsolatedShellMaterials(source: THREEType.Group, id: RobotId): THREEType.Group {
  if (!THREE) return source
  const instance = source.clone(true)
  const extMeshes: THREEType.Mesh[] = []

  instance.traverse(obj => {
    const mesh = obj as THREEType.Mesh
    if (!mesh.isMesh || !mesh.material) return
    if (!isExteriorMesh(mesh)) return
    extMeshes.push(mesh)
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

  instance.userData.robotId = id
  instance.userData.extMeshes = extMeshes
  instance.userData.rig = bindRobotRig(instance, id)
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
    const extMeshes = (robotInstance.userData.extMeshes as THREEType.Mesh[] | undefined) ?? []
    for (const mesh of extMeshes) {
      if (shellMode === 'core') {
        mesh.visible = false
        continue
      }
      mesh.visible = true
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
    }
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

async function ensureMotionDataForCurrentContext() {
  if (!motionOpen) return
  motionError = ''
  const needed: AnimatableRobotId[] = []
  if (activeMode === 'v1') needed.push('v1')
  else if (activeMode === 'v2') needed.push('v2')
  else if (activeMode === 'lineup') {
    if (lineupTarget === 'both') needed.push('v2', 'v1')
    else needed.push(lineupTarget)
  }
  const missing = needed.filter(id => !motionLibCache.has(id))
  if (missing.length === 0) return

  motionLoading = true
  try {
    await Promise.all(missing.map(id => fetchMotionLibrary(id)))
  } catch (err) {
    console.error('Motion library load error:', err)
    motionError = 'Could not load motion library data.'
  } finally {
    motionLoading = false
  }
}

function resetPose() {
  isPlayingMotion = false
  activeClipId = ''
  playbackTimeSec = 0
  activeClipDurationSec = 0
  lastTickMs = 0
  if (!modelGroup) return
  for (const child of modelGroup.children) {
    resetRigToNeutral(child.userData.rig as RobotRig | null | undefined)
  }
}

async function selectAndPlayClip(clip: MotionClip) {
  if (activeMode === 'lineup' && lineupTarget === 'both' && !motionLibCache.has('v1')) {
    await ensureMotionDataForCurrentContext()
  }
  activeClipId = clip.id
  loopMotion = clip.loop
  playbackTimeSec = 0
  activeClipDurationSec = clip.duration
  isPlayingMotion = true
  lastTickMs = performance.now()

  // Pause turntable auto-orbit so the robot's own gait/emote reads clearly
  if (autoRotate && controls) {
    autoRotate = false
    controls.autoRotate = false
  }
  updateSceneMotionPose(0)
}

function toggleMotionPlayPause() {
  if (!activeClipObj) {
    const first = filteredClips[0] || allClips[0]
    if (first) void selectAndPlayClip(first)
    return
  }
  if (!isPlayingMotion && playbackTimeSec >= activeClipDurationSec - 0.02) {
    playbackTimeSec = 0
  }
  isPlayingMotion = !isPlayingMotion
  lastTickMs = performance.now()
}

function handleScrubInput(e: Event) {
  const val = Number((e.currentTarget as HTMLInputElement).value)
  playbackTimeSec = val
  isPlayingMotion = false
  updateSceneMotionPose(playbackTimeSec)
}

async function toggleMotionDrawer() {
  motionOpen = !motionOpen
  if (motionOpen) {
    await ensureMotionDataForCurrentContext()
  }
}

async function setLineupTarget(next: LineupTarget) {
  lineupTarget = next
  resetPose()
  await ensureMotionDataForCurrentContext()
}

async function switchFromV3AndPreview(targetRobot: AnimatableRobotId) {
  motionOpen = true
  await activateMode(targetRobot)
  await ensureMotionDataForCurrentContext()
  const lib = motionLibCache.get(targetRobot)
  const defaultWalk = lib?.clips.find(c => c.id === 'walk' || c.id === 'walk_forward') ?? lib?.clips[0]
  if (defaultWalk) {
    await selectAndPlayClip(defaultWalk)
  }
}

async function activateMode(mode: ViewerMode, immediateCam = false) {
  const prevMode = activeMode
  activeMode = mode
  if (prevMode !== mode) {
    resetPose()
  }
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
        const inst = cloneWithIsolatedShellMaterials(tpl, id)
        inst.position.set(ROBOTS[id].lineupX, 0, 0)
        modelGroup.add(inst)
      }
    } else {
      loadProgressText = `Loading ${ROBOTS[mode].shortLabel} CAD assembly…`
      const tpl = await fetchRobotTemplate(mode)
      if (token !== requestToken || !modelGroup) return

      disposeInstanceClones(modelGroup)
      modelGroup.clear()

      const inst = cloneWithIsolatedShellMaterials(tpl, mode)
      inst.position.set(0, 0, 0)
      modelGroup.add(inst)
    }

    applyShellModeToScene()
    if (mode === 'lineup' && controls) {
      autoRotate = false
      controls.autoRotate = false
    }
    moveToPreset(activePreset, immediateCam)
    isLoading = false

    if (motionOpen) {
      void ensureMotionDataForCurrentContext()
    }
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

  if (isPlayingMotion && activeClipId && activeClipDurationSec > 0) {
    const dt = lastTickMs > 0 ? Math.min(0.1, (now - lastTickMs) * 0.001) : 0
    lastTickMs = now
    const nextT = playbackTimeSec + dt * playbackSpeed
    if (nextT >= activeClipDurationSec) {
      if (loopMotion) {
        playbackTimeSec = nextT % activeClipDurationSec
      } else {
        playbackTimeSec = activeClipDurationSec
        isPlayingMotion = false
      }
    } else {
      playbackTimeSec = nextT
    }
    updateSceneMotionPose(playbackTimeSec)
  } else {
    lastTickMs = now
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
      lastTickMs = performance.now()
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
  class:has-motion-open={motionOpen}
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

    <div class="rv-topbar-actions">
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

      <button
        type="button"
        class="rv-motion-toggle"
        class:is-open={motionOpen}
        class:is-playing={isPlayingMotion}
        aria-expanded={motionOpen}
        on:click={() => void toggleMotionDrawer()}
      >
        <span class="rv-motion-dot" aria-hidden="true"></span>
        {#if activeClipObj && isPlayingMotion}
          <span>Playing: {activeClipObj.label}</span>
        {:else if activeMode === 'v3'}
          <span>Motions &amp; Gaits</span>
        {:else if activeMode === 'v1'}
          <span>Motions &amp; Gaits (38)</span>
        {:else}
          <span>Motions &amp; Gaits (47)</span>
        {/if}
        <span class="rv-chevron" aria-hidden="true">{motionOpen ? '▾' : '▸'}</span>
      </button>
    </div>
  </div>

  <!-- Split Workspace: 3D WebGL Viewport + Expandable Motion & Gait Side Menu -->
  <div class="rv-workspace" class:is-drawer-open={motionOpen}>
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
            <span><strong>Left:</strong> V1 (197 mm)</span>
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

      <!-- Camera Presets & Zoom -->
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

    <!-- Expandable Motion, Emote & Gait Side Menu -->
    {#if motionOpen}
      <aside class="rv-motion-drawer" aria-label="Motion, gait, and emote playback menu">
        <div class="rv-md-header">
          <div>
            <span class="rv-md-eyebrow">
              {#if activeMode === 'v1'}
                V1 · 8-DOF Spider Kinematics
              {:else if activeMode === 'v2'}
                V2 · 12-DOF 4-Bar Kinematics
              {:else if activeMode === 'lineup'}
                1:1 Lineup Motion Bench
              {:else}
                V3 · DS3235 CAD Status
              {/if}
            </span>
            <h4 class="rv-md-title">
              {#if activeMode === 'v3'}
                Motion Library Pending
              {:else}
                Gaits, Poses &amp; Emotes
              {/if}
            </h4>
          </div>
          <button
            type="button"
            class="rv-md-close"
            aria-label="Collapse motion menu"
            title="Collapse menu"
            on:click={() => {
              motionOpen = false
            }}
          >
            ✕
          </button>
        </div>

        {#if activeMode === 'v3'}
          <div class="rv-md-v3-notice">
            <span class="rv-md-v3-badge">Under Active Development</span>
            <p>
              <strong>Ainekio V3</strong> is currently in mechanical CAD &amp; print-fit development.
              Its 12× DS3235 heavy-servo gait policy and expressive motion library have not been trained yet.
            </p>
            {#if allowModelSwitch}
              <div class="rv-md-v3-actions">
                <button
                  type="button"
                  class="rv-md-cta"
                  on:click={() => void switchFromV3AndPreview('v2')}
                >
                  Walk &amp; Emote on V2 (47 clips) →
                </button>
                <button
                  type="button"
                  class="rv-md-cta is-secondary"
                  on:click={() => void switchFromV3AndPreview('v1')}
                >
                  Walk &amp; Emote on V1 (38 clips) →
                </button>
              </div>
            {/if}
          </div>
        {:else}
          {#if activeMode === 'lineup'}
            <div class="rv-md-lineup-target" role="group" aria-label="Choose robot to animate in lineup">
              <span class="rv-md-sublabel">Animate:</span>
              <button
                type="button"
                class:is-active={lineupTarget === 'v2'}
                on:click={() => void setLineupTarget('v2')}
              >
                V2
              </button>
              <button
                type="button"
                class:is-active={lineupTarget === 'v1'}
                on:click={() => void setLineupTarget('v1')}
              >
                V1
              </button>
              <button
                type="button"
                class:is-active={lineupTarget === 'both'}
                on:click={() => void setLineupTarget('both')}
              >
                V1 + V2
              </button>
            </div>
          {/if}

          <!-- Transport & Bench Controls -->
          <div class="rv-md-transport">
            <div class="rv-md-transport-top">
              <button
                type="button"
                class="rv-md-play-btn"
                class:is-playing={isPlayingMotion}
                disabled={motionLoading || allClips.length === 0}
                on:click={toggleMotionPlayPause}
              >
                {isPlayingMotion ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                type="button"
                class="rv-md-util-btn"
                disabled={!activeClipId}
                on:click={resetPose}
                title="Stop motion and return to neutral CAD stance"
              >
                Reset Stance
              </button>
              <button
                type="button"
                class="rv-md-util-btn"
                class:is-active={loopMotion}
                on:click={() => {
                  loopMotion = !loopMotion
                }}
                title="Loop active clip"
              >
                Loop
              </button>
              <button
                type="button"
                class="rv-md-util-btn"
                class:is-active={!inPlaceMode}
                on:click={() => {
                  inPlaceMode = !inPlaceMode
                  if (activeClipId) updateSceneMotionPose(playbackTimeSec)
                }}
                title="Toggle between centered in-place motion and floor travel across the grid"
              >
                {inPlaceMode ? 'In-Place' : 'Floor Travel'}
              </button>
            </div>

            {#if activeClipObj}
              <div class="rv-md-scrubber-row">
                <input
                  type="range"
                  class="rv-md-scrubber"
                  min="0"
                  max={Math.max(0.05, activeClipDurationSec)}
                  step="0.02"
                  value={playbackTimeSec}
                  aria-label="Motion timeline scrubber"
                  on:input={handleScrubInput}
                />
                <span class="rv-md-time">
                  {playbackTimeSec.toFixed(1)}s / {activeClipDurationSec.toFixed(1)}s
                </span>
              </div>
            {/if}

            <div class="rv-md-speed-row">
              <span class="rv-md-sublabel">Speed:</span>
              {#each [0.5, 1, 2] as spd}
                <button
                  type="button"
                  class="rv-md-speed-chip"
                  class:is-active={playbackSpeed === spd}
                  on:click={() => {
                    playbackSpeed = spd
                  }}
                >
                  {spd}×
                </button>
              {/each}
            </div>
          </div>

          <!-- Category Filter Tabs + Search -->
          <div class="rv-md-filters">
            <div class="rv-md-tabs" role="tablist" aria-label="Motion categories">
              <button
                type="button"
                role="tab"
                aria-selected={motionCategory === 'featured'}
                class:is-active={motionCategory === 'featured' && !motionQuery}
                on:click={() => {
                  motionCategory = 'featured'
                  motionQuery = ''
                }}
              >
                Featured
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={motionCategory === 'gaits'}
                class:is-active={motionCategory === 'gaits' && !motionQuery}
                on:click={() => {
                  motionCategory = 'gaits'
                  motionQuery = ''
                }}
              >
                Gaits ({gaitCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={motionCategory === 'emotes'}
                class:is-active={motionCategory === 'emotes' && !motionQuery}
                on:click={() => {
                  motionCategory = 'emotes'
                  motionQuery = ''
                }}
              >
                Emotes ({emoteCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={motionCategory === 'poses'}
                class:is-active={motionCategory === 'poses' && !motionQuery}
                on:click={() => {
                  motionCategory = 'poses'
                  motionQuery = ''
                }}
              >
                Poses ({poseCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={motionCategory === 'all'}
                class:is-active={motionCategory === 'all' && !motionQuery}
                on:click={() => {
                  motionCategory = 'all'
                  motionQuery = ''
                }}
              >
                All ({allClips.length})
              </button>
            </div>

            <input
              type="search"
              class="rv-md-search"
              placeholder="Filter motions (walk, wave, crab, dance…)"
              bind:value={motionQuery}
              aria-label="Filter motions"
            />
          </div>

          <!-- Clip Grid -->
          <div class="rv-md-list">
            {#if motionLoading}
              <div class="rv-md-status">
                <span class="rv-spinner" aria-hidden="true"></span>
                <span>Loading Blender motion curves…</span>
              </div>
            {:else if motionError}
              <div class="rv-md-status is-error">{motionError}</div>
            {:else if filteredClips.length === 0}
              <div class="rv-md-status">No matching motions found.</div>
            {:else}
              <div class="rv-md-grid">
                {#each filteredClips as clip (clip.id)}
                  <button
                    type="button"
                    class="rv-clip-btn"
                    class:is-selected={activeClipId === clip.id}
                    on:click={() => void selectAndPlayClip(clip)}
                  >
                    <span class="rv-clip-name">
                      {#if activeClipId === clip.id && isPlayingMotion}
                        <span class="rv-clip-live" aria-hidden="true">▶</span>
                      {/if}
                      {clip.label}
                    </span>
                    <span class="rv-clip-meta">
                      {clip.duration.toFixed(1)}s{clip.loop ? ' · ↻' : ''}
                    </span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </aside>
    {/if}
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

  .rv-topbar-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
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

  .rv-motion-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    padding: 0.44rem 0.78rem;
    border-radius: 0.55rem;
    font-size: 0.78rem;
    font-weight: 750;
    color: #e0f2fe;
    background: rgb(14 34 45 / 0.9);
    border: 1px solid rgb(56 189 248 / 0.42);
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    white-space: nowrap;
  }

  .rv-motion-toggle:hover {
    background: rgb(18 46 61 / 0.95);
    border-color: #38bdf8;
    color: #ffffff;
  }

  .rv-motion-toggle.is-open {
    background: rgb(56 189 248 / 0.16);
    border-color: #38bdf8;
    color: #7dd3fc;
  }

  .rv-motion-toggle.is-playing {
    border-color: rgb(52 211 153 / 0.7);
    color: #a7f3d0;
  }

  .rv-motion-dot {
    width: 0.46rem;
    height: 0.46rem;
    border-radius: 999px;
    background: #38bdf8;
    flex-shrink: 0;
  }

  .rv-motion-toggle.is-playing .rv-motion-dot {
    background: #34d399;
    box-shadow: 0 0 8px rgb(52 211 153 / 0.85);
  }

  .rv-chevron {
    font-size: 0.72rem;
    opacity: 0.85;
  }

  .rv-workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .rv-workspace.is-drawer-open {
    grid-template-columns: minmax(0, 1fr) 316px;
  }

  .rv-viewport-wrap {
    position: relative;
    min-width: 0;
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
    flex-shrink: 0;
  }

  @keyframes rv-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Expandable Side Menu Styles */
  .rv-motion-drawer {
    display: flex;
    flex-direction: column;
    height: clamp(340px, 50vw, 500px);
    background: #08131a;
    border-left: 1px solid rgb(255 255 255 / 0.1);
    overflow: hidden;
  }

  .robot-viewer.is-compact .rv-motion-drawer {
    height: clamp(320px, 44vw, 440px);
  }

  .rv-md-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.68rem 0.8rem;
    background: #0b1922;
    border-bottom: 1px solid rgb(255 255 255 / 0.08);
    flex-shrink: 0;
  }

  .rv-md-eyebrow {
    display: block;
    font-size: 0.62rem;
    font-weight: 750;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #38bdf8;
  }

  .rv-md-title {
    margin: 0.08rem 0 0;
    font-size: 0.88rem;
    font-weight: 750;
    color: #f8fafc;
  }

  .rv-md-close {
    width: 1.85rem;
    height: 1.85rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.38rem;
    font-size: 0.8rem;
    color: #94a3b8;
    background: rgb(255 255 255 / 0.05);
    border: 1px solid rgb(255 255 255 / 0.1);
    cursor: pointer;
    flex-shrink: 0;
  }

  .rv-md-close:hover {
    color: #ffffff;
    background: rgb(255 255 255 / 0.12);
  }

  .rv-md-v3-notice {
    padding: 0.95rem 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    font-size: 0.8rem;
    line-height: 1.5;
    color: #cbd5e1;
  }

  .rv-md-v3-notice p {
    margin: 0;
  }

  .rv-md-v3-badge {
    align-self: flex-start;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.66rem;
    font-weight: 750;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #fde68a;
    background: rgb(245 158 11 / 0.16);
    border: 1px solid rgb(251 191 36 / 0.45);
  }

  .rv-md-v3-actions {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    margin-top: 0.2rem;
  }

  .rv-md-cta {
    padding: 0.52rem 0.75rem;
    border-radius: 0.45rem;
    font-size: 0.76rem;
    font-weight: 750;
    text-align: left;
    color: #061015;
    background: #38bdf8;
    border: 0;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .rv-md-cta.is-secondary {
    color: #e0f2fe;
    background: rgb(56 189 248 / 0.14);
    border: 1px solid rgb(56 189 248 / 0.42);
  }

  .rv-md-cta:hover {
    opacity: 0.92;
  }

  .rv-md-lineup-target {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.45rem 0.75rem;
    background: #060e14;
    border-bottom: 1px solid rgb(255 255 255 / 0.07);
    flex-shrink: 0;
  }

  .rv-md-sublabel {
    font-size: 0.68rem;
    font-weight: 700;
    color: #94a3b8;
    margin-right: 0.15rem;
  }

  .rv-md-lineup-target button,
  .rv-md-speed-chip {
    padding: 0.22rem 0.52rem;
    border-radius: 0.34rem;
    font-size: 0.7rem;
    font-weight: 700;
    color: #cbd5e1;
    background: rgb(255 255 255 / 0.05);
    border: 1px solid rgb(255 255 255 / 0.1);
    cursor: pointer;
  }

  .rv-md-lineup-target button.is-active,
  .rv-md-speed-chip.is-active {
    color: #061015;
    background: #38bdf8;
    border-color: #38bdf8;
  }

  .rv-md-transport {
    padding: 0.55rem 0.75rem;
    background: #09151d;
    border-bottom: 1px solid rgb(255 255 255 / 0.08);
    display: flex;
    flex-direction: column;
    gap: 0.42rem;
    flex-shrink: 0;
  }

  .rv-md-transport-top {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .rv-md-play-btn {
    padding: 0.32rem 0.65rem;
    border-radius: 0.38rem;
    font-size: 0.73rem;
    font-weight: 750;
    color: #05130d;
    background: #34d399;
    border: 0;
    cursor: pointer;
  }

  .rv-md-play-btn.is-playing {
    color: #061015;
    background: #fbbf24;
  }

  .rv-md-play-btn:disabled,
  .rv-md-util-btn:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .rv-md-util-btn {
    padding: 0.3rem 0.5rem;
    border-radius: 0.38rem;
    font-size: 0.7rem;
    font-weight: 700;
    color: #cbd5e1;
    background: rgb(255 255 255 / 0.05);
    border: 1px solid rgb(255 255 255 / 0.12);
    cursor: pointer;
  }

  .rv-md-util-btn.is-active {
    color: #fde68a;
    border-color: rgb(251 191 36 / 0.6);
    background: rgb(245 158 11 / 0.16);
  }

  .rv-md-scrubber-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .rv-md-scrubber {
    flex: 1;
    min-width: 0;
    accent-color: #38bdf8;
    height: 4px;
    cursor: pointer;
  }

  .rv-md-time {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.66rem;
    color: #94a3b8;
    white-space: nowrap;
  }

  .rv-md-speed-row {
    display: flex;
    align-items: center;
    gap: 0.28rem;
  }

  .rv-md-filters {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid rgb(255 255 255 / 0.08);
    display: flex;
    flex-direction: column;
    gap: 0.42rem;
    flex-shrink: 0;
  }

  .rv-md-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.24rem;
  }

  .rv-md-tabs button {
    padding: 0.24rem 0.46rem;
    border-radius: 0.34rem;
    font-size: 0.68rem;
    font-weight: 700;
    color: #94a3b8;
    background: rgb(255 255 255 / 0.04);
    border: 1px solid transparent;
    cursor: pointer;
  }

  .rv-md-tabs button:hover {
    color: #f1f5f9;
  }

  .rv-md-tabs button.is-active {
    color: #7dd3fc;
    background: rgb(56 189 248 / 0.14);
    border-color: rgb(56 189 248 / 0.45);
  }

  .rv-md-search {
    width: 100%;
    padding: 0.34rem 0.55rem;
    border-radius: 0.38rem;
    font-size: 0.74rem;
    color: #f1f5f9;
    background: #050b0f;
    border: 1px solid rgb(255 255 255 / 0.13);
    outline: none;
  }

  .rv-md-search:focus {
    border-color: #38bdf8;
  }

  .rv-md-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0.55rem 0.75rem 0.75rem;
  }

  .rv-md-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.5rem 0.5rem;
    font-size: 0.76rem;
    color: #94a3b8;
    text-align: center;
  }

  .rv-md-status.is-error {
    color: #fca5a5;
  }

  .rv-md-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .rv-clip-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.14rem;
    min-height: 2.55rem;
    padding: 0.38rem 0.5rem;
    border-radius: 0.42rem;
    text-align: left;
    color: #e2e8f0;
    background: rgb(255 255 255 / 0.04);
    border: 1px solid rgb(255 255 255 / 0.09);
    cursor: pointer;
    transition: background 0.14s ease, border-color 0.14s ease;
  }

  .rv-clip-btn:hover {
    background: rgb(56 189 248 / 0.1);
    border-color: rgb(56 189 248 / 0.42);
  }

  .rv-clip-btn.is-selected {
    background: rgb(52 211 153 / 0.15);
    border-color: rgb(52 211 153 / 0.65);
    color: #ecfdf5;
  }

  .rv-clip-name {
    font-size: 0.73rem;
    font-weight: 700;
    line-height: 1.2;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .rv-clip-live {
    font-size: 0.62rem;
    color: #34d399;
  }

  .rv-clip-meta {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.62rem;
    color: #94a3b8;
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

  @media (max-width: 860px) {
    .rv-workspace.is-drawer-open {
      grid-template-columns: minmax(0, 1fr);
    }
    .rv-motion-drawer {
      height: auto;
      max-height: 360px;
      border-left: 0;
      border-top: 1px solid rgb(255 255 255 / 0.1);
    }
    .robot-viewer.is-compact .rv-motion-drawer {
      height: auto;
      max-height: 350px;
    }
  }

  @media (max-width: 680px) {
    .rv-topbar {
      padding: 0.7rem 0.85rem;
    }
    .rv-topbar-actions {
      width: 100%;
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
    .rv-motion-toggle {
      width: 100%;
      min-height: 2.35rem;
      justify-content: center;
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
    .rv-md-play-btn,
    .rv-md-util-btn,
    .rv-md-tabs button,
    .rv-md-speed-chip {
      min-height: 2.1rem;
    }
    .rv-hint,
    .rv-lineup-legend {
      display: none;
    }
  }
</style>
