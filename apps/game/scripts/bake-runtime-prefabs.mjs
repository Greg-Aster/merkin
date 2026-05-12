import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import ts from 'typescript'
import {
  authorSourceGlbPbrMaps,
  channel,
  seededNoise,
  writePng,
} from './lib/authoredPbrGlb.mjs'

const appRoot = join(import.meta.dirname, '..')
const repoRoot = join(appRoot, '..', '..')
const publicRoot = join(repoRoot, 'apps/megameal/public')
const engineRoot = join(appRoot, 'src/threlte/engine')
const prefabBakeSourceRoot = join(
  appRoot,
  'scripts/lib/runtimePrefabBakeSources',
)
const outputRoot = join(publicRoot, 'generated/runtime-game-assets/prefabs')
const manifestPath = join(outputRoot, 'manifest.json')
const catalogPath = join(engineRoot, 'runtimePrefabCatalog.json')
const bakeCommand = 'pnpm --dir apps/game bake:runtime-prefabs'
const auditCommand = 'pnpm --dir apps/game audit:runtime-prefabs'
const generatedUrlRoot = '/generated/runtime-game-assets/prefabs'
const anomalyClusterVariants = ['magenta', 'green', 'cyan', 'rose']
const storyMarkerVariants = ['cyan', 'amber', 'green', 'red', 'magenta']
const authoredPbrPrefabTypes = new Set(['anomaly-cluster', 'story-marker'])
const prefabPbrTextureSize = 64
const prefabPbrAuthoredAt = '2026-05-11'
const defaultVariantByType = {
  'anomaly-cluster': 'magenta',
  'story-marker': 'cyan',
}

const transpiledBakeSourceFiles = [
  'runtimePrefabBakeTypes.ts',
  'runtimePrefabMeshFactory.ts',
  'runtimePrefabAnomalyMeshes.ts',
  'runtimePrefabCourtyardMeshes.ts',
  'runtimePrefabGrowthMeshes.ts',
  'runtimePrefabTechMeshes.ts',
  'runtimePrefabWastelandMeshes.ts',
  'runtimePrefabProceduralMeshes.ts',
]

const transpiledEngineFiles = [
  'primitiveGeometry.ts',
]

const bakePlan = [
  ...anomalyClusterVariants.map(variant => ({
    type: 'anomaly-cluster',
    variant,
    preserveSourceMeshes: true,
    reason: `animation-ready anomaly cluster ${variant} variant with named baked mesh parts`,
  })),
  {
    type: 'bench-growth',
    preserveSourceMeshIds: [
      'growth-0',
      'growth-1',
      'growth-2',
      'growth-3',
      'growth-halo',
    ],
    reason:
      'animation-ready organic bench growth with named tendril and halo parts',
  },
  {
    type: 'growth-planter',
    preserveSourceMeshIds: [
      'rim',
      'spoke-0',
      'spoke-1',
      'spoke-2',
      'spoke-3',
      'spoke-4',
      'spoke-5',
    ],
    animationReadyMeshNames: ['growth-planter-emissive'],
    reason:
      'animation-ready growth planter with static pot merged, leaf layers batched, and named rim and spoke parts',
  },
  {
    type: 'command-console',
    preserveSourceMeshIds: [
      'screen--0.5',
      'screen-0.5',
    ],
    reason:
      'animation-ready command console with static body and antennae merged and named screen VFX parts',
  },
  {
    type: 'command-fin',
    reason: 'static sci-fi-room fixture repeated in set dressing',
  },
  {
    type: 'portal-apparatus',
    preserveSourceMeshIds: [
      'outer-ring',
      'inner-ring',
      'core',
    ],
    reason:
      'animation-ready portal apparatus with static base and struts merged and named ring and core VFX parts',
  },
  {
    type: 'observation-rig',
    reason: 'static multi-part rig repeated in Yggdrasil and sci-fi-room',
  },
  {
    type: 'support-column',
    reason: 'static structural prop repeated heavily across migrated scenes',
  },
  {
    type: 'interior-archway',
    reason: 'static portal frame with multiple primitive pieces',
  },
  {
    type: 'courtyard-pylon',
    reason: 'static courtyard detail repeated as runtime prefab',
  },
  {
    type: 'courtyard-fountain',
    preserveSourceMeshIds: [
      'water-ring',
      'water-surface',
      'core',
      'upper-halo',
    ],
    reason:
      'animation-ready courtyard fountain with named water, core, and halo VFX parts',
  },
  ...storyMarkerVariants.map(variant => ({
    type: 'story-marker',
    variant,
    reason: `static story marker ${variant} variant; root pulse uses runtime animation descriptor`,
  })),
  {
    type: 'wasteland-archway',
    reason: 'static exterior archway with multiple primitive pieces',
  },
  {
    type: 'wasteland-monolith',
    reason: 'static monolith repeated in sci-fi-room and Miranda',
  },
  {
    type: 'broken-ring',
    reason: 'static ring fragments repeated in Yggdrasil set dressing',
  },
]
const allowedProceduralModes = new Set(['time-driven-procedural'])
const allowedProceduralStatuses = new Set(['temporary-runtime-contract'])
const allowedAssetAnimationModes = new Set([
  'root-loop-transform',
  'node-loop-transform',
])
const allowedAssetAnimationStatuses = new Set(['runtime-animation-descriptor'])
const allowedAssetVfxStatuses = new Set(['runtime-vfx-descriptor'])

class NodeFileReader {
  result = null
  error = null
  onloadend = null
  onerror = null

  async readAsArrayBuffer(blob) {
    try {
      this.result = await blob.arrayBuffer()
      this.onloadend?.({ target: this })
    } catch (error) {
      this.error = error
      this.onerror?.(error)
    }
  }

  async readAsDataURL(blob) {
    try {
      const buffer = Buffer.from(await blob.arrayBuffer())
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${buffer.toString('base64')}`
      this.onloadend?.({ target: this })
    } catch (error) {
      this.error = error
      this.onerror?.(error)
    }
  }
}

if (!globalThis.FileReader) {
  globalThis.FileReader = NodeFileReader
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function formatBytes(bytes) {
  return `${Math.round((bytes / 1024) * 10) / 10}KB`
}

function getPrefabFileBase(entry) {
  const type = typeof entry === 'string' ? entry : entry.type
  const variant = typeof entry === 'string' ? null : entry.variant
  return variant ? `${type}-${variant}` : type
}

function getPrefabManifestKey(entry) {
  return entry.variant ? `${entry.type}:${entry.variant}` : entry.type
}

function getPrefabUrl(entry) {
  const type = typeof entry === 'string' ? entry : entry.type
  return `${generatedUrlRoot}/${type}/${getPrefabFileBase(entry)}.glb`
}

function getPrefabPath(entry) {
  const type = typeof entry === 'string' ? entry : entry.type
  return join(outputRoot, type, `${getPrefabFileBase(entry)}.glb`)
}

function resolvePublicPath(url) {
  return join(publicRoot, url.replace(/^\//, ''))
}

function rewriteRelativeImports(source) {
  return source.replace(
    /(from\s+['"])(\.\/[^'"]+)(['"])/g,
    (match, prefix, specifier, suffix) => {
      if (specifier.endsWith('.mjs') || specifier.endsWith('.js')) return match
      if (specifier.endsWith('.json')) return match
      return `${prefix}${specifier}.mjs${suffix}`
    },
  )
}

function transpileTsModules({ files, outputDir, sourceRoot }) {
  mkdirSync(outputDir, { recursive: true })

  for (const file of files) {
    const sourcePath = join(sourceRoot, file)
    const outputPath = join(outputDir, basename(file, '.ts') + '.mjs')
    const source = readFileSync(sourcePath, 'utf8')
    const result = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        verbatimModuleSyntax: false,
        sourceMap: false,
      },
      fileName: sourcePath,
      reportDiagnostics: true,
    })

    const diagnostics = result.diagnostics ?? []
    if (diagnostics.length > 0) {
      const messages = diagnostics.map(diagnostic =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      )
      throw new Error(
        `${file}: TypeScript transpile failed: ${messages.join('; ')}`,
      )
    }

    writeFileSync(outputPath, rewriteRelativeImports(result.outputText))
  }
}

async function loadRuntimePrefabModules() {
  const tempDir = mkdtempSync(join(appRoot, '.runtime-prefab-bake-'))
  transpileTsModules({
    files: transpiledBakeSourceFiles,
    outputDir: tempDir,
    sourceRoot: prefabBakeSourceRoot,
  })
  transpileTsModules({
    files: transpiledEngineFiles,
    outputDir: tempDir,
    sourceRoot: engineRoot,
  })

  try {
    const [{ resolveRuntimePrefabMeshes }, { createPrimitiveGeometry }] =
      await Promise.all([
        import(
          pathToFileURL(join(tempDir, 'runtimePrefabProceduralMeshes.mjs')).href
        ),
        import(pathToFileURL(join(tempDir, 'primitiveGeometry.mjs')).href),
      ])

    return {
      createPrimitiveGeometry,
      resolveRuntimePrefabMeshes,
      cleanup: () => rmSync(tempDir, { force: true, recursive: true }),
    }
  } catch (error) {
    rmSync(tempDir, { force: true, recursive: true })
    throw error
  }
}

function createMaterial(descriptor) {
  const material = new THREE.MeshStandardMaterial({
    color: descriptor.color ?? '#ffffff',
    emissive: descriptor.emissive ?? '#000000',
    emissiveIntensity: descriptor.emissiveIntensity ?? 0,
    metalness: descriptor.metalness ?? 0.5,
    roughness: descriptor.roughness ?? 0.5,
    transparent: descriptor.transparent ?? false,
    opacity: descriptor.opacity ?? 1,
  })
  material.name = `${descriptor.id}-material`
  if (material.transparent || material.opacity < 1) {
    material.depthWrite = false
  }
  return material
}

function getMaterialSignature(descriptor) {
  return [
    descriptor.color,
    descriptor.emissive,
    descriptor.emissiveIntensity,
    descriptor.metalness,
    descriptor.roughness,
    descriptor.transparent,
    descriptor.opacity,
  ].join('|')
}

function getMaterialBucketKey(descriptor) {
  const opacity = descriptor.opacity ?? 1
  if (descriptor.transparent || opacity < 0.99) {
    return [
      'transparent',
      descriptor.color,
      descriptor.emissive,
      descriptor.emissiveIntensity,
      descriptor.metalness,
      descriptor.roughness,
      opacity,
    ].join('|')
  }

  return (descriptor.emissiveIntensity ?? 0) >= 0.4 ? 'emissive' : 'body'
}

function createTransformedGeometry({ createPrimitiveGeometry, descriptor }) {
  const geometry = createPrimitiveGeometry(descriptor.geometry, descriptor.args)
  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3().fromArray(descriptor.position)
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(...descriptor.rotation),
  )
  const scale = new THREE.Vector3().fromArray(descriptor.scale)
  matrix.compose(position, quaternion, scale)
  geometry.applyMatrix4(matrix)
  if (!geometry.getIndex()) return geometry

  const nonIndexedGeometry = geometry.toNonIndexed()
  geometry.dispose()
  return nonIndexedGeometry
}

function getCachedMaterial({ descriptor, materialCache }) {
  if (!materialCache) return createMaterial(descriptor)

  const key = getMaterialSignature(descriptor)
  const cached = materialCache.get(key)
  if (cached) return cached

  const material = createMaterial(descriptor)
  materialCache.set(key, material)
  return material
}

function createSourceMesh({
  createPrimitiveGeometry,
  descriptor,
  materialCache,
}) {
  const geometry = createPrimitiveGeometry(descriptor.geometry, descriptor.args)
  const material = getCachedMaterial({ descriptor, materialCache })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = descriptor.id
  mesh.position.fromArray(descriptor.position)
  mesh.rotation.set(...descriptor.rotation)
  mesh.scale.fromArray(descriptor.scale)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData = {
    sourcePrimitiveId: descriptor.id,
  }
  return mesh
}

function createPrefabScene({
  createPrimitiveGeometry,
  meshes,
  prefabKey,
  type,
  variant,
  preserveSourceMeshes = false,
  preserveSourceMeshIds = [],
  generatedAt,
}) {
  const group = new THREE.Group()
  group.name = prefabKey
  group.userData = {
    merkinRuntimePrefab: {
      type,
      variant: variant ?? null,
      generatedAt,
      source: 'procedural-descriptor',
    },
  }

  const preservedSourceMeshIds = new Set(preserveSourceMeshIds)
  const preserveAllSourceMeshes =
    preserveSourceMeshes && preservedSourceMeshIds.size === 0
  const materialCache = new Map()

  if (preserveAllSourceMeshes) {
    for (const descriptor of meshes) {
      group.add(
        createSourceMesh({
          createPrimitiveGeometry,
          descriptor,
          materialCache,
        }),
      )
    }
    return group
  }

  const buckets = new Map()
  for (const descriptor of meshes) {
    if (preservedSourceMeshIds.has(descriptor.id)) {
      group.add(
        createSourceMesh({
          createPrimitiveGeometry,
          descriptor,
          materialCache,
        }),
      )
      continue
    }

    const key = getMaterialBucketKey(descriptor)
    const bucket = buckets.get(key) ?? {
      descriptor,
      geometries: [],
      ids: [],
    }
    bucket.geometries.push(
      createTransformedGeometry({ createPrimitiveGeometry, descriptor }),
    )
    bucket.ids.push(descriptor.id)
    buckets.set(key, bucket)
  }

  for (const [key, bucket] of buckets) {
    const geometry = mergeGeometries(bucket.geometries, false)
    bucket.geometries.forEach(sourceGeometry => sourceGeometry.dispose())
    if (!geometry) {
      throw new Error(`${type}: failed to merge geometry bucket "${key}"`)
    }

    const material = createMaterial(bucket.descriptor)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `${prefabKey}-${key}`
    mesh.userData = {
      sourcePrimitiveIds: bucket.ids,
    }
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }

  return group
}

function getAnimationReadySourceMeshNames({ planEntry, meshes }) {
  const animationReadyMeshNames = planEntry.animationReadyMeshNames ?? []

  if (
    Array.isArray(planEntry.preserveSourceMeshIds) &&
    planEntry.preserveSourceMeshIds.length > 0
  ) {
    const preservedSourceMeshIds = new Set(planEntry.preserveSourceMeshIds)
    return [
      ...meshes
        .filter(mesh => preservedSourceMeshIds.has(mesh.id))
        .map(mesh => mesh.id),
      ...animationReadyMeshNames,
    ]
  }

  return planEntry.preserveSourceMeshes
    ? [...meshes.map(mesh => mesh.id), ...animationReadyMeshNames]
    : animationReadyMeshNames
}

function assertPreservedSourceMeshIds({ planEntry, meshes }) {
  const preservedSourceMeshIds = planEntry.preserveSourceMeshIds ?? []
  if (preservedSourceMeshIds.length === 0) return

  const meshIds = new Set(meshes.map(mesh => mesh.id))
  const missingMeshIds = preservedSourceMeshIds.filter(id => !meshIds.has(id))
  if (missingMeshIds.length === 0) return

  throw new Error(
    `${planEntry.type}: preserveSourceMeshIds references unknown mesh id(s): ${missingMeshIds.join(', ')}`,
  )
}

function countTriangles(group) {
  let triangleCount = 0

  group.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return
    const geometry = child.geometry
    const index = geometry.getIndex()
    const position = geometry.getAttribute('position')
    triangleCount += index
      ? Math.floor(index.count / 3)
      : Math.floor((position?.count ?? 0) / 3)
  })

  return triangleCount
}

function countDescriptorTriangles({ createPrimitiveGeometry, meshes }) {
  return meshes.reduce((sum, descriptor) => {
    const geometry = createPrimitiveGeometry(
      descriptor.geometry,
      descriptor.args,
    )
    const index = geometry.getIndex()
    const position = geometry.getAttribute('position')
    const triangles = index
      ? Math.floor(index.count / 3)
      : Math.floor((position?.count ?? 0) / 3)
    geometry.dispose()
    return sum + triangles
  }, 0)
}

function disposePrefabScene(group) {
  group.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return
    child.geometry?.dispose()
    if (Array.isArray(child.material)) {
      child.material.forEach(material => material.dispose())
    } else {
      child.material?.dispose()
    }
  })
}

async function exportGlb(group, { preserveTransforms = false } = {}) {
  const exporter = new GLTFExporter()
  const output = await new Promise((resolve, reject) => {
    exporter.parse(group, resolve, reject, {
      binary: true,
      onlyVisible: true,
      trs: preserveTransforms,
    })
  })

  return Buffer.from(output)
}

function writeBufferIfChanged(path, buffer) {
  if (existsSync(path)) {
    const current = readFileSync(path)
    if (current.equals(buffer)) return false
  }

  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, buffer)
  return true
}

function getSha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function getFileStats(path) {
  const buffer = readFileSync(path)
  return {
    sizeBytes: buffer.byteLength,
    sha256: getSha256(buffer),
  }
}

function storyMarkerHeight(x, y, seed) {
  const u = x / prefabPbrTextureSize - 0.5
  const v = y / prefabPbrTextureSize - 0.5
  const radius = Math.hypot(u, v)
  const angle = Math.atan2(v, u)
  const ring = Math.max(0, 1 - Math.abs(radius - 0.32) * 22)
  const spokes = Math.max(0, Math.cos(angle * 3 + seed * 0.23))
  const glyph = Math.max(0, 1 - Math.abs((u - v) * 4))
  const grain = seededNoise(x, y, seed) * 2 - 1
  return ring * 0.55 + spokes * 0.16 + glyph * 0.18 + grain * 0.11
}

function createStoryMarkerBaseColorTexture({ baseColor, alpha }, seed) {
  const pixels = Buffer.alloc(prefabPbrTextureSize * prefabPbrTextureSize * 4)
  for (let y = 0; y < prefabPbrTextureSize; y += 1) {
    for (let x = 0; x < prefabPbrTextureSize; x += 1) {
      const height = storyMarkerHeight(x, y, seed)
      const spark = seededNoise(x, y, seed + 41) > 0.94 ? 0.18 : 0
      const shade = 0.72 + height * 0.28 + spark
      const offset = (y * prefabPbrTextureSize + x) * 4
      pixels[offset] = channel(baseColor[0] * shade)
      pixels[offset + 1] = channel(baseColor[1] * shade)
      pixels[offset + 2] = channel(baseColor[2] * (shade + 0.04))
      pixels[offset + 3] = channel(alpha)
    }
  }
  return writePng({
    width: prefabPbrTextureSize,
    height: prefabPbrTextureSize,
    channels: 4,
    pixels,
  })
}

function createStoryMarkerMetallicRoughnessTexture(
  { metallic, roughness },
  seed,
) {
  const pixels = Buffer.alloc(prefabPbrTextureSize * prefabPbrTextureSize * 3)
  for (let y = 0; y < prefabPbrTextureSize; y += 1) {
    for (let x = 0; x < prefabPbrTextureSize; x += 1) {
      const height = storyMarkerHeight(x, y, seed)
      const edgePolish = Math.max(0, height - 0.62) * 0.45
      const pitting = seededNoise(x, y, seed + 73) * 0.08
      const offset = (y * prefabPbrTextureSize + x) * 3
      pixels[offset] = 0
      pixels[offset + 1] = channel(roughness + pitting - edgePolish)
      pixels[offset + 2] = channel(metallic)
    }
  }
  return writePng({
    width: prefabPbrTextureSize,
    height: prefabPbrTextureSize,
    channels: 3,
    pixels,
  })
}

function createStoryMarkerNormalTexture(seed) {
  const pixels = Buffer.alloc(prefabPbrTextureSize * prefabPbrTextureSize * 3)
  const strength = 0.22
  for (let y = 0; y < prefabPbrTextureSize; y += 1) {
    for (let x = 0; x < prefabPbrTextureSize; x += 1) {
      const left = storyMarkerHeight(Math.max(0, x - 1), y, seed)
      const right = storyMarkerHeight(
        Math.min(prefabPbrTextureSize - 1, x + 1),
        y,
        seed,
      )
      const down = storyMarkerHeight(x, Math.max(0, y - 1), seed)
      const up = storyMarkerHeight(
        x,
        Math.min(prefabPbrTextureSize - 1, y + 1),
        seed,
      )
      const dx = (right - left) * strength
      const dy = (up - down) * strength
      const dz = 1
      const length = Math.hypot(dx, dy, dz) || 1
      const offset = (y * prefabPbrTextureSize + x) * 3
      pixels[offset] = channel((dx / length) * 0.5 + 0.5)
      pixels[offset + 1] = channel((dy / length) * 0.5 + 0.5)
      pixels[offset + 2] = channel((dz / length) * 0.5 + 0.5)
    }
  }
  return writePng({
    width: prefabPbrTextureSize,
    height: prefabPbrTextureSize,
    channels: 3,
    pixels,
  })
}

function createStoryMarkerTextureSet({ label, pbr, seed }) {
  const baseColor = pbr.baseColorFactor ?? [1, 1, 1, 1]
  const alpha = baseColor[3] ?? 1
  const metallic = pbr.metallicFactor ?? 0.9
  const roughness = pbr.roughnessFactor ?? 0.08

  return {
    baseColor: {
      name: `${label}-story-marker-basecolor`,
      imageBytes: createStoryMarkerBaseColorTexture({ baseColor, alpha }, seed),
      factor: [1, 1, 1, alpha],
    },
    metallicRoughness: {
      name: `${label}-story-marker-metalrough`,
      imageBytes: createStoryMarkerMetallicRoughnessTexture(
        { metallic, roughness },
        seed,
      ),
      metallicFactor: 1,
      roughnessFactor: 1,
    },
    normal: {
      name: `${label}-story-marker-normal`,
      imageBytes: createStoryMarkerNormalTexture(seed),
      scale: 0.65,
    },
  }
}

function anomalyClusterHeight(x, y, seed, textureSize) {
  const u = x / textureSize - 0.5
  const v = y / textureSize - 0.5
  const radius = Math.hypot(u, v)
  const angle = Math.atan2(v, u)
  const core = Math.max(0, 1 - radius * 2.6)
  const facets = Math.max(0, Math.cos(angle * 8 + seed * 0.37)) * 0.22
  const fracture = Math.max(0, 1 - Math.abs(Math.sin((u - v) * 18 + seed)) * 1.4)
  const grain = seededNoise(x, y, seed + 191) * 2 - 1
  return core * 0.58 + facets + fracture * 0.16 + grain * 0.08
}

function createAnomalyClusterBaseColorTexture(
  { baseColor, alpha },
  seed,
  textureSize,
) {
  const pixels = Buffer.alloc(textureSize * textureSize * 4)
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const height = anomalyClusterHeight(x, y, seed, textureSize)
      const spark = seededNoise(x, y, seed + 229) > 0.965 ? 0.32 : 0
      const shade = 0.66 + height * 0.34 + spark
      const offset = (y * textureSize + x) * 4
      pixels[offset] = channel(baseColor[0] * shade)
      pixels[offset + 1] = channel(baseColor[1] * (shade + 0.03))
      pixels[offset + 2] = channel(baseColor[2] * (shade + 0.08))
      pixels[offset + 3] = channel(alpha)
    }
  }
  return writePng({
    width: textureSize,
    height: textureSize,
    channels: 4,
    pixels,
  })
}

function createAnomalyClusterMetallicRoughnessTexture(
  { metallic, roughness },
  seed,
  textureSize,
) {
  const pixels = Buffer.alloc(textureSize * textureSize * 3)
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const height = anomalyClusterHeight(x, y, seed, textureSize)
      const polishedEdge = Math.max(0, height - 0.5) * 0.36
      const microScratches = seededNoise(x, y, seed + 313) * 0.06
      const offset = (y * textureSize + x) * 3
      pixels[offset] = 0
      pixels[offset + 1] = channel(roughness + microScratches - polishedEdge)
      pixels[offset + 2] = channel(metallic)
    }
  }
  return writePng({
    width: textureSize,
    height: textureSize,
    channels: 3,
    pixels,
  })
}

function createAnomalyClusterNormalTexture(seed, textureSize) {
  const pixels = Buffer.alloc(textureSize * textureSize * 3)
  const strength = 0.34
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const left = anomalyClusterHeight(Math.max(0, x - 1), y, seed, textureSize)
      const right = anomalyClusterHeight(
        Math.min(textureSize - 1, x + 1),
        y,
        seed,
        textureSize,
      )
      const down = anomalyClusterHeight(x, Math.max(0, y - 1), seed, textureSize)
      const up = anomalyClusterHeight(
        x,
        Math.min(textureSize - 1, y + 1),
        seed,
        textureSize,
      )
      const dx = (right - left) * strength
      const dy = (up - down) * strength
      const dz = 1
      const length = Math.hypot(dx, dy, dz) || 1
      const offset = (y * textureSize + x) * 3
      pixels[offset] = channel((dx / length) * 0.5 + 0.5)
      pixels[offset + 1] = channel((dy / length) * 0.5 + 0.5)
      pixels[offset + 2] = channel((dz / length) * 0.5 + 0.5)
    }
  }
  return writePng({
    width: textureSize,
    height: textureSize,
    channels: 3,
    pixels,
  })
}

function createAnomalyClusterEmissiveTexture(
  { emissiveColor },
  seed,
  textureSize,
) {
  const pixels = Buffer.alloc(textureSize * textureSize * 3)
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const height = anomalyClusterHeight(x, y, seed, textureSize)
      const pulse = 0.42 + Math.max(0, height) * 0.58
      const arc = seededNoise(x, y, seed + 467) > 0.9 ? 0.34 : 0
      const offset = (y * textureSize + x) * 3
      pixels[offset] = channel(emissiveColor[0] * (pulse + arc))
      pixels[offset + 1] = channel(emissiveColor[1] * (pulse + arc))
      pixels[offset + 2] = channel(emissiveColor[2] * (pulse + arc))
    }
  }
  return writePng({
    width: textureSize,
    height: textureSize,
    channels: 3,
    pixels,
  })
}

function createAnomalyClusterTextureSet({
  label,
  material,
  pbr,
  seed,
  textureSize,
}) {
  const baseColor = pbr.baseColorFactor ?? [1, 1, 1, 1]
  const alpha = baseColor[3] ?? 1
  const metallic = pbr.metallicFactor ?? 1
  const roughness = pbr.roughnessFactor ?? 0.04
  const emissiveColor = material.emissiveFactor ?? baseColor.slice(0, 3)

  return {
    baseColor: {
      name: `${label}-anomaly-basecolor`,
      imageBytes: createAnomalyClusterBaseColorTexture(
        { baseColor, alpha },
        seed,
        textureSize,
      ),
      factor: [1, 1, 1, alpha],
    },
    metallicRoughness: {
      name: `${label}-anomaly-metalrough`,
      imageBytes: createAnomalyClusterMetallicRoughnessTexture(
        { metallic, roughness },
        seed,
        textureSize,
      ),
      metallicFactor: 1,
      roughnessFactor: 1,
    },
    normal: {
      name: `${label}-anomaly-normal`,
      imageBytes: createAnomalyClusterNormalTexture(seed, textureSize),
      scale: 0.72,
    },
    emissive: {
      name: `${label}-anomaly-emissive`,
      imageBytes: createAnomalyClusterEmissiveTexture(
        { emissiveColor },
        seed,
        textureSize,
      ),
      factor: [1, 1, 1],
    },
  }
}

function authorPrefabPbrMaps(planEntry) {
  if (!authoredPbrPrefabTypes.has(planEntry.type)) return false

  if (planEntry.type === 'anomaly-cluster') {
    return authorSourceGlbPbrMaps({
      publicRoot,
      assetUrl: getPrefabUrl(planEntry),
      workflow: 'apps/game/scripts/bake-runtime-prefabs.mjs#anomaly-cluster-pbr',
      authoredAt: prefabPbrAuthoredAt,
      textureSize: prefabPbrTextureSize,
      slotsAuthored: [
        'baseColorTexture',
        'metallicRoughnessTexture',
        'normalTexture',
        'emissiveTexture',
      ],
      materialPrefix: getPrefabFileBase(planEntry),
      description:
        'Embedded procedural anomaly-cluster base color, metallic-roughness, normal, and emissive maps for sci-fi-room cluster prefabs.',
      sidecarProvenance:
        'Procedural PBR and emissive maps authored from the runtime prefab material palette during prefab baking so anomaly-cluster prefabs no longer rely on approved material-factor fallbacks.',
      createTextureSet: createAnomalyClusterTextureSet,
    }).changed
  }

  if (planEntry.type === 'story-marker') {
    return authorSourceGlbPbrMaps({
      publicRoot,
      assetUrl: getPrefabUrl(planEntry),
      workflow: 'apps/game/scripts/bake-runtime-prefabs.mjs#story-marker-pbr',
      authoredAt: prefabPbrAuthoredAt,
      textureSize: prefabPbrTextureSize,
      materialPrefix: getPrefabFileBase(planEntry),
      description:
        'Embedded procedural story-marker base color, metallic-roughness, and normal maps for hero-visible first-playable marker prefabs.',
      sidecarProvenance:
        'Procedural PBR maps authored from the runtime prefab material palette during prefab baking so story-marker prefabs no longer rely on approved material-factor fallbacks.',
      createTextureSet: createStoryMarkerTextureSet,
    }).changed
  }

  return false
}

async function bakePrefabAssets() {
  const generatedAt = new Date().toISOString()
  const catalog = readJson(catalogPath)
  const registeredTypes = new Set(catalog.types ?? [])
  const missingTypes = bakePlan
    .map(entry => entry.type)
    .filter(type => !registeredTypes.has(type))

  if (missingTypes.length > 0) {
    throw new Error(
      `Bake plan references unregistered prefab type(s): ${missingTypes.join(', ')}`,
    )
  }

  const runtimeModules = await loadRuntimePrefabModules()

  try {
    const prefabs = []
    let writtenCount = 0

    for (const planEntry of bakePlan) {
      const prefabData = {
        type: planEntry.type,
        ...(planEntry.variant ? { variant: planEntry.variant } : {}),
      }
      const prefabKey = getPrefabFileBase(planEntry)
      const meshes = runtimeModules.resolveRuntimePrefabMeshes(prefabData, 0)
      assertPreservedSourceMeshIds({ planEntry, meshes })
      const scene = createPrefabScene({
        createPrimitiveGeometry: runtimeModules.createPrimitiveGeometry,
        meshes,
        type: planEntry.type,
        variant: planEntry.variant,
        prefabKey,
        preserveSourceMeshes: planEntry.preserveSourceMeshes,
        preserveSourceMeshIds: planEntry.preserveSourceMeshIds,
        generatedAt,
      })
      const triangleCount = countTriangles(scene)
      const buffer = await exportGlb(scene, {
        preserveTransforms:
          planEntry.preserveSourceMeshes ||
          (planEntry.preserveSourceMeshIds?.length ?? 0) > 0,
      })
      const outputPath = getPrefabPath(planEntry)
      const changed = writeBufferIfChanged(outputPath, buffer)
      const pbrChanged = authorPrefabPbrMaps(planEntry)
      if (changed || pbrChanged) writtenCount += 1
      const fileStats = getFileStats(outputPath)
      disposePrefabScene(scene)

      const sourceMeshNames = getAnimationReadySourceMeshNames({
        planEntry,
        meshes,
      })
      prefabs.push({
        type: planEntry.type,
        variant: planEntry.variant ?? null,
        source: 'procedural-prefab-descriptor',
        reason: planEntry.reason,
        animationReady: sourceMeshNames.length > 0,
        url: getPrefabUrl(planEntry),
        file: relative(repoRoot, outputPath),
        sourceMeshCount: meshes.length,
        meshCount: scene.children.length,
        sourceMeshNames,
        triangleCount,
        sizeBytes: fileStats.sizeBytes,
        sha256: fileStats.sha256,
      })
    }

    const manifest = {
      schemaVersion: 1,
      generatedAt,
      builder: {
        name: 'bake-runtime-prefabs',
        command: bakeCommand,
      },
      source: {
        prefabCatalog: relative(repoRoot, catalogPath),
        descriptorModule:
          'apps/game/scripts/lib/runtimePrefabBakeSources/runtimePrefabProceduralMeshes.ts',
      },
      outputRoot: relative(repoRoot, outputRoot),
      summary: {
        prefabCount: prefabs.length,
        meshCount: prefabs.reduce((sum, prefab) => sum + prefab.meshCount, 0),
        sourceMeshCount: prefabs.reduce(
          (sum, prefab) => sum + prefab.sourceMeshCount,
          0,
        ),
        triangleCount: prefabs.reduce(
          (sum, prefab) => sum + prefab.triangleCount,
          0,
        ),
        sizeBytes: prefabs.reduce((sum, prefab) => sum + prefab.sizeBytes, 0),
      },
      prefabs,
    }

    writeJson(manifestPath, manifest)
    writeCatalogAssetUrls(catalog, prefabs)

    return { manifest, writtenCount }
  } finally {
    runtimeModules.cleanup()
  }
}

function writeCatalogAssetUrls(catalog, prefabs) {
  const nextAssetUrls = {
    ...(catalog.assetUrls ?? {}),
  }
  const nextAssetVariants = Object.fromEntries(
    Object.entries(catalog.assetVariants ?? {}).map(([type, variants]) => [
      type,
      { ...variants },
    ]),
  )

  for (const prefab of prefabs) {
    if (prefab.variant) {
      nextAssetVariants[prefab.type] = {
        ...(nextAssetVariants[prefab.type] ?? {}),
        [prefab.variant]: prefab.url,
      }
      const defaultVariant = defaultVariantByType[prefab.type]
      if (!nextAssetUrls[prefab.type] || prefab.variant === defaultVariant) {
        nextAssetUrls[prefab.type] = prefab.url
      }
      continue
    }

    nextAssetUrls[prefab.type] = prefab.url
  }

  const orderedAssetUrls = {}
  for (const type of catalog.types ?? []) {
    if (typeof nextAssetUrls[type] === 'string') {
      orderedAssetUrls[type] = nextAssetUrls[type]
    }
  }

  for (const type of Object.keys(nextAssetUrls).sort()) {
    if (!(type in orderedAssetUrls))
      orderedAssetUrls[type] = nextAssetUrls[type]
  }

  const orderedAssetVariants = {}
  for (const type of catalog.types ?? []) {
    const variants = nextAssetVariants[type]
    if (!variants || typeof variants !== 'object') continue

    const orderedVariants = {}
    for (const variant of Object.keys(variants).sort()) {
      if (typeof variants[variant] === 'string') {
        orderedVariants[variant] = variants[variant]
      }
    }
    if (Object.keys(orderedVariants).length > 0) {
      orderedAssetVariants[type] = orderedVariants
    }
  }

  for (const type of Object.keys(nextAssetVariants).sort()) {
    if (type in orderedAssetVariants) continue
    const variants = nextAssetVariants[type]
    if (!variants || typeof variants !== 'object') continue
    const orderedVariants = {}
    for (const variant of Object.keys(variants).sort()) {
      if (typeof variants[variant] === 'string') {
        orderedVariants[variant] = variants[variant]
      }
    }
    if (Object.keys(orderedVariants).length > 0) {
      orderedAssetVariants[type] = orderedVariants
    }
  }

  writeJson(catalogPath, {
    ...catalog,
    assetUrls: orderedAssetUrls,
    assetVariants: orderedAssetVariants,
  })
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0
}

function validateProceduralContractShape({ contract, failures, type }) {
  if (!contract || typeof contract !== 'object') {
    failures.push(`${type}: procedural runtime contract is missing`)
    return
  }
  if (!allowedProceduralModes.has(contract.mode)) {
    failures.push(`${type}: procedural runtime contract has invalid mode`)
  }
  if (!allowedProceduralStatuses.has(contract.status)) {
    failures.push(`${type}: procedural runtime contract has invalid status`)
  }
  for (const field of ['reason', 'migrationTarget']) {
    if (
      typeof contract[field] !== 'string' ||
      contract[field].trim().length < 12
    ) {
      failures.push(
        `${type}: procedural runtime contract must include ${field}`,
      )
    }
  }
  if (
    !Array.isArray(contract.animationChannels) ||
    contract.animationChannels.length === 0 ||
    !contract.animationChannels.every(channel => typeof channel === 'string')
  ) {
    failures.push(
      `${type}: procedural runtime contract must list animationChannels`,
    )
  }
  if (!isPositiveInteger(contract.runtimeBudget?.maxSourceMeshes)) {
    failures.push(
      `${type}: procedural runtime contract must budget maxSourceMeshes`,
    )
  }
  if (!isPositiveInteger(contract.runtimeBudget?.maxTriangles)) {
    failures.push(
      `${type}: procedural runtime contract must budget maxTriangles`,
    )
  }
}

function hasCatalogAsset(catalog, type) {
  if (typeof catalog.assetUrls?.[type] === 'string') return true
  const variants = catalog.assetVariants?.[type]
  return (
    variants &&
    typeof variants === 'object' &&
    Object.values(variants).some(url => typeof url === 'string')
  )
}

function getCatalogAssetUrl(catalog, type, variant) {
  if (variant && typeof catalog.assetVariants?.[type]?.[variant] === 'string') {
    return catalog.assetVariants[type][variant]
  }
  return typeof catalog.assetUrls?.[type] === 'string'
    ? catalog.assetUrls[type]
    : ''
}

function getManifestPrefabsByType({ manifest, type }) {
  return (manifest?.prefabs ?? []).filter(prefab => prefab.type === type)
}

function getManifestSourceMeshNames({ manifest, type }) {
  return new Set(
    getManifestPrefabsByType({ manifest, type }).flatMap(prefab =>
      Array.isArray(prefab.sourceMeshNames) ? prefab.sourceMeshNames : [],
    ),
  )
}

function validateNumericChannel({
  value,
  failures,
  type,
  path,
  label = 'asset animation contract',
}) {
  if (!value || typeof value !== 'object') {
    failures.push(`${type}: ${label} missing ${path}`)
    return
  }

  for (const [key, entry] of Object.entries(value)) {
    if (!Number.isFinite(entry)) {
      failures.push(`${type}: ${label} ${path}.${key} must be a finite number`)
    }
  }
}

function validateAssetAnimationContractShape({ contract, failures, type }) {
  if (!contract || typeof contract !== 'object') {
    failures.push(`${type}: asset animation contract is missing`)
    return
  }
  if (!allowedAssetAnimationModes.has(contract.mode)) {
    failures.push(`${type}: asset animation contract has invalid mode`)
  }
  if (!allowedAssetAnimationStatuses.has(contract.status)) {
    failures.push(`${type}: asset animation contract has invalid status`)
  }
  if (
    typeof contract.reason !== 'string' ||
    contract.reason.trim().length < 12
  ) {
    failures.push(`${type}: asset animation contract must include reason`)
  }
  if (
    !Array.isArray(contract.animationChannels) ||
    contract.animationChannels.length === 0 ||
    !contract.animationChannels.every(channel => typeof channel === 'string')
  ) {
    failures.push(
      `${type}: asset animation contract must list animationChannels`,
    )
  }
  if (
    contract.mode === 'root-loop-transform' &&
    (!contract.root || typeof contract.root !== 'object')
  ) {
    failures.push(`${type}: asset animation contract must include root`)
    return
  }
  if (contract.root?.rotationY) {
    validateNumericChannel({
      value: contract.root.rotationY,
      failures,
      type,
      path: 'root.rotationY',
    })
  }
  if (contract.root?.scale) {
    validateNumericChannel({
      value: contract.root.scale,
      failures,
      type,
      path: 'root.scale',
    })
  }
  if (contract.root?.positionY) {
    validateNumericChannel({
      value: contract.root.positionY,
      failures,
      type,
      path: 'root.positionY',
    })
  }
  if (contract.mode === 'node-loop-transform') {
    if (!Array.isArray(contract.nodes) || contract.nodes.length === 0) {
      failures.push(`${type}: node animation contract must include nodes`)
      return
    }
    for (const [index, node] of contract.nodes.entries()) {
      if (typeof node?.name !== 'string' || node.name.trim().length === 0) {
        failures.push(
          `${type}: node animation contract nodes[${index}] must include name`,
        )
      }
      for (const axis of ['x', 'y', 'z']) {
        if (node?.rotation?.[axis]) {
          validateNumericChannel({
            value: node.rotation[axis],
            failures,
            type,
            path: `nodes[${index}].rotation.${axis}`,
          })
        }
        if (node?.position?.[axis]) {
          validateNumericChannel({
            value: node.position[axis],
            failures,
            type,
            path: `nodes[${index}].position.${axis}`,
          })
        }
        if (node?.scale?.[axis]) {
          validateNumericChannel({
            value: node.scale[axis],
            failures,
            type,
            path: `nodes[${index}].scale.${axis}`,
          })
        }
      }
      if (node?.scale?.uniform) {
        validateNumericChannel({
          value: node.scale.uniform,
          failures,
          type,
          path: `nodes[${index}].scale.uniform`,
        })
      }
    }
  }
}

function auditAssetAnimationContracts({ catalog, failures, manifest }) {
  const registeredTypes = new Set(catalog.types ?? [])
  const assetAnimations = catalog.assetAnimations ?? {}
  let assetAnimationCount = 0

  for (const [type, contract] of Object.entries(assetAnimations)) {
    assetAnimationCount += 1
    if (!registeredTypes.has(type)) {
      failures.push(`${type}: asset animation contract is not registered`)
    }
    if (!hasCatalogAsset(catalog, type)) {
      failures.push(
        `${type}: asset animation contract must target a baked asset prefab`,
      )
    }
    validateAssetAnimationContractShape({ contract, failures, type })
    if (contract?.mode !== 'node-loop-transform') continue

    const manifestPrefabs = getManifestPrefabsByType({ manifest, type })
    const sourceMeshNames = getManifestSourceMeshNames({ manifest, type })
    if (manifestPrefabs.length > 0) {
      const animationReadyCount = manifestPrefabs.filter(
        prefab => prefab.animationReady,
      ).length
      if (animationReadyCount !== manifestPrefabs.length) {
        failures.push(
          `${type}: node animation contract requires animation-ready baked prefab output`,
        )
      }
    }
    if (sourceMeshNames.size === 0) {
      failures.push(
        `${type}: node animation contract needs baked sourceMeshNames; run ${bakeCommand}`,
      )
      continue
    }
    for (const node of contract.nodes ?? []) {
      if (typeof node?.name !== 'string') continue
      if (sourceMeshNames.has(node.name)) continue
      failures.push(
        `${type}: node animation target "${node.name}" is not present in baked source mesh names`,
      )
    }
  }

  return assetAnimationCount
}

function validateVfxAxisChannels({ channels, failures, type, path }) {
  if (!channels || typeof channels !== 'object') return
  for (const axis of ['x', 'y', 'z']) {
    if (!channels[axis]) continue
    validateNumericChannel({
      value: channels[axis],
      failures,
      type,
      path: `${path}.${axis}`,
      label: 'asset VFX contract',
    })
  }
}

function validateAssetVfxContractShape({ contract, failures, type }) {
  if (!contract || typeof contract !== 'object') {
    failures.push(`${type}: asset VFX contract is missing`)
    return
  }
  if (!allowedAssetVfxStatuses.has(contract.status)) {
    failures.push(`${type}: asset VFX contract has invalid status`)
  }
  if (
    typeof contract.reason !== 'string' ||
    contract.reason.trim().length < 12
  ) {
    failures.push(`${type}: asset VFX contract must include reason`)
  }
  if (!Array.isArray(contract.targets) || contract.targets.length === 0) {
    failures.push(`${type}: asset VFX contract must include targets`)
    return
  }

  for (const [index, target] of contract.targets.entries()) {
    if (typeof target?.name !== 'string' || target.name.trim().length === 0) {
      failures.push(
        `${type}: asset VFX contract targets[${index}] must include name`,
      )
    }
    if (!target?.material && !target?.transform && !target?.visibility) {
      failures.push(
        `${type}: asset VFX contract targets[${index}] must include material, transform, or visibility`,
      )
    }
    if (target?.material?.opacity) {
      validateNumericChannel({
        value: target.material.opacity,
        failures,
        type,
        path: `targets[${index}].material.opacity`,
        label: 'asset VFX contract',
      })
    }
    if (target?.material?.emissiveIntensity) {
      validateNumericChannel({
        value: target.material.emissiveIntensity,
        failures,
        type,
        path: `targets[${index}].material.emissiveIntensity`,
        label: 'asset VFX contract',
      })
    }
    validateVfxAxisChannels({
      channels: target?.transform?.rotation,
      failures,
      type,
      path: `targets[${index}].transform.rotation`,
    })
    validateVfxAxisChannels({
      channels: target?.transform?.position,
      failures,
      type,
      path: `targets[${index}].transform.position`,
    })
    validateVfxAxisChannels({
      channels: target?.transform?.scale,
      failures,
      type,
      path: `targets[${index}].transform.scale`,
    })
    if (target?.transform?.scale?.uniform) {
      validateNumericChannel({
        value: target.transform.scale.uniform,
        failures,
        type,
        path: `targets[${index}].transform.scale.uniform`,
        label: 'asset VFX contract',
      })
    }
    if (target?.visibility) {
      validateNumericChannel({
        value: target.visibility,
        failures,
        type,
        path: `targets[${index}].visibility`,
        label: 'asset VFX contract',
      })
    }
  }
}

function auditAssetVfxContracts({ catalog, failures, manifest }) {
  const registeredTypes = new Set(catalog.types ?? [])
  const assetVfx = catalog.assetVfx ?? {}
  let assetVfxCount = 0

  for (const [type, contract] of Object.entries(assetVfx)) {
    assetVfxCount += 1
    if (!registeredTypes.has(type)) {
      failures.push(`${type}: asset VFX contract is not registered`)
    }
    if (!hasCatalogAsset(catalog, type)) {
      failures.push(
        `${type}: asset VFX contract must target a baked asset prefab`,
      )
    }
    validateAssetVfxContractShape({ contract, failures, type })

    const sourceMeshNames = getManifestSourceMeshNames({ manifest, type })
    if (sourceMeshNames.size === 0) {
      failures.push(
        `${type}: asset VFX contract needs baked sourceMeshNames; run ${bakeCommand}`,
      )
      continue
    }
    for (const target of contract?.targets ?? []) {
      if (typeof target?.name !== 'string') continue
      if (sourceMeshNames.has(target.name)) continue
      failures.push(
        `${type}: VFX target "${target.name}" is not present in baked source mesh names`,
      )
    }
  }

  return assetVfxCount
}

function auditProceduralRuntimeContracts({
  catalog,
  failures,
  runtimeModules,
}) {
  const registeredTypes = new Set(catalog.types ?? [])
  const proceduralRuntime = catalog.proceduralRuntime ?? {}
  const proceduralContractTypes = new Set(Object.keys(proceduralRuntime))
  let proceduralContractCount = 0

  if (proceduralContractTypes.size > 0) {
    failures.push(
      `runtime prefab catalog must not contain proceduralRuntime entries after runtime/authoring separation: ${[...proceduralContractTypes].join(', ')}`,
    )
  }

  for (const type of catalog.types ?? []) {
    const hasAsset = hasCatalogAsset(catalog, type)
    if (!hasAsset) {
      failures.push(
        `${type}: registered prefab must have an assetUrl or asset variant URL`,
      )
    }
  }

  for (const [type, contract] of Object.entries(proceduralRuntime)) {
    proceduralContractCount += 1
    if (!registeredTypes.has(type)) {
      failures.push(`${type}: procedural runtime contract is not registered`)
    }
    if (hasCatalogAsset(catalog, type)) {
      failures.push(
        `${type}: prefab cannot be both baked asset and procedural runtime`,
      )
    }

    validateProceduralContractShape({ contract, failures, type })

    if (!registeredTypes.has(type)) continue
    const meshes = runtimeModules.resolveRuntimePrefabMeshes({ type }, 0)
    const triangleCount = countDescriptorTriangles({
      createPrimitiveGeometry: runtimeModules.createPrimitiveGeometry,
      meshes,
    })
    if (meshes.length > contract.runtimeBudget?.maxSourceMeshes) {
      failures.push(
        `${type}: source mesh count ${meshes.length} exceeds procedural budget ${contract.runtimeBudget.maxSourceMeshes}`,
      )
    }
    if (triangleCount > contract.runtimeBudget?.maxTriangles) {
      failures.push(
        `${type}: triangle count ${triangleCount} exceeds procedural budget ${contract.runtimeBudget.maxTriangles}`,
      )
    }
  }

  return proceduralContractCount
}

async function auditPrefabBakeOutputs() {
  const failures = []
  const catalog = readJson(catalogPath)
  const manifest = existsSync(manifestPath) ? readJson(manifestPath) : null
  const manifestPrefabs = new Map(
    (manifest?.prefabs ?? []).map(prefab => [
      getPrefabManifestKey(prefab),
      prefab,
    ]),
  )

  if (!manifest) {
    failures.push(
      `${relative(repoRoot, manifestPath)} is missing; run ${bakeCommand}`,
    )
  } else if (manifest.schemaVersion !== 1) {
    failures.push(
      `${relative(repoRoot, manifestPath)} has invalid schemaVersion`,
    )
  }

  for (const planEntry of bakePlan) {
    const expectedUrl = getPrefabUrl(planEntry)
    const catalogUrl = getCatalogAssetUrl(
      catalog,
      planEntry.type,
      planEntry.variant,
    )
    const manifestEntry = manifestPrefabs.get(getPrefabManifestKey(planEntry))
    const outputPath = getPrefabPath(planEntry)

    if (catalogUrl !== expectedUrl) {
      failures.push(
        `${getPrefabManifestKey(planEntry)}: prefab catalog asset URL must be ${expectedUrl}`,
      )
    }
    if (!manifestEntry) {
      failures.push(
        `${getPrefabManifestKey(planEntry)}: missing from runtime prefab manifest`,
      )
    } else if (manifestEntry.url !== expectedUrl) {
      failures.push(
        `${getPrefabManifestKey(planEntry)}: manifest URL must be ${expectedUrl}`,
      )
    }
    if (!existsSync(outputPath)) {
      failures.push(
        `${getPrefabManifestKey(planEntry)}: baked GLB is missing at ${expectedUrl}`,
      )
      continue
    }

    const sizeBytes = statSync(outputPath).size
    if (sizeBytes <= 0) {
      failures.push(`${getPrefabManifestKey(planEntry)}: baked GLB is empty`)
    }
    if (manifestEntry && manifestEntry.sizeBytes !== sizeBytes) {
      failures.push(
        `${getPrefabManifestKey(planEntry)}: manifest sizeBytes ${manifestEntry.sizeBytes} does not match file size ${sizeBytes}`,
      )
    }
  }

  let proceduralContractCount = 0
  let assetAnimationCount = 0
  let assetVfxCount = 0
  const hasProceduralContracts =
    Object.keys(catalog.proceduralRuntime ?? {}).length > 0

  if (hasProceduralContracts) {
    const runtimeModules = await loadRuntimePrefabModules()
    try {
      proceduralContractCount = auditProceduralRuntimeContracts({
        catalog,
        failures,
        runtimeModules,
      })
    } finally {
      runtimeModules.cleanup()
    }
  } else {
    proceduralContractCount = auditProceduralRuntimeContracts({
      catalog,
      failures,
    })
  }
  assetAnimationCount = auditAssetAnimationContracts({
    catalog,
    failures,
    manifest,
  })
  assetVfxCount = auditAssetVfxContracts({
    catalog,
    failures,
    manifest,
  })

  return {
    failures,
    manifest,
    proceduralContractCount,
    assetAnimationCount,
    assetVfxCount,
  }
}

function printAuditResult({
  failures,
  manifest,
  proceduralContractCount,
  assetAnimationCount,
  assetVfxCount,
}) {
  const summary = manifest?.summary
  console.log('Runtime prefab bake audit')
  console.log('=========================')
  console.log(`prefabs=${summary?.prefabCount ?? 0}`)
  console.log(`meshes=${summary?.meshCount ?? 0}`)
  console.log(`triangles=${summary?.triangleCount ?? 0}`)
  console.log(`proceduralContracts=${proceduralContractCount ?? 0}`)
  console.log(`assetAnimations=${assetAnimationCount ?? 0}`)
  console.log(`assetVfx=${assetVfxCount ?? 0}`)
  console.log(`payload=${formatBytes(summary?.sizeBytes ?? 0)}`)
  console.log(`command=${failures.length === 0 ? auditCommand : bakeCommand}`)

  if (failures.length === 0) return

  console.error('')
  console.error('Runtime prefab bake audit failed')
  console.error('================================')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exitCode = 1
}

if (hasFlag('--write')) {
  const { manifest, writtenCount } = await bakePrefabAssets()
  console.log('Runtime prefab bake')
  console.log('===================')
  console.log(`prefabs=${manifest.summary.prefabCount}`)
  console.log(`meshes=${manifest.summary.meshCount}`)
  console.log(`triangles=${manifest.summary.triangleCount}`)
  console.log(`payload=${formatBytes(manifest.summary.sizeBytes)}`)
  console.log(`changedFiles=${writtenCount}`)
  console.log(`manifest=${relative(repoRoot, manifestPath)}`)
  console.log(`catalog=${relative(repoRoot, catalogPath)}`)
}

printAuditResult(await auditPrefabBakeOutputs())
