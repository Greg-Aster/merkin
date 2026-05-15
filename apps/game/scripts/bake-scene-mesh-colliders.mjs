import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import {
  requiresGeneratedCollisionArtifact,
  validateGeneratedCollisionProduct,
} from './lib/meshCollisionProducts.mjs'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const appRoot = resolve(repoRoot, 'apps/game')
const defaultSceneRoot = resolve(appRoot, 'src/threlte/editor/scenes')
const defaultPublicRoot = resolve(repoRoot, 'apps/megameal/public')
const bakeScript = resolve(appRoot, 'scripts/bake-mesh-collider.mjs')
const prefabCatalog = JSON.parse(
  readFileSync(
    resolve(appRoot, 'src/threlte/engine/runtimePrefabCatalog.json'),
    'utf8',
  ),
)
const prefabAssetUrls = prefabCatalog.assetUrls ?? {}
const prefabAssetVariants = prefabCatalog.assetVariants ?? {}

const budgetByTier = {
  mobile: 5000,
  balanced: 10000,
  desktop: 20000,
}

function parseArgs(argv) {
  const parsed = {
    write: true,
    force: false,
    continueOnError: false,
  }

  for (const arg of argv) {
    if (arg === '--dry-run') {
      parsed.write = false
      continue
    }
    if (arg === '--force') {
      parsed.force = true
      continue
    }
    if (arg === '--continue-on-error') {
      parsed.continueOnError = true
      continue
    }
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (match) parsed[match[1]] = match[2]
  }

  return parsed
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
}

function getScenePaths(args) {
  const sceneRoot = resolve(String(args['scene-root'] || defaultSceneRoot))
  if (args['scene-path']) return [resolve(String(args['scene-path']))]
  if (args.level || args.levelId) {
    return [join(sceneRoot, `${args.level || args.levelId}.scene.json`)]
  }
  if (args['all-levels']) {
    return readdirSync(sceneRoot)
      .filter(file => file.endsWith('.scene.json'))
      .sort()
      .map(file => join(sceneRoot, file))
  }
  throw new Error('Pass --level=<id>, --scene-path=<path>, or --all-levels=true.')
}

function stringArray(value) {
  return Array.isArray(value)
    ? value.filter(item => typeof item === 'string' && item.trim())
    : []
}

function getVisualOnlyActorIds(scene) {
  return new Set(
    stringArray(scene.settings?.level?.collision?.roles?.visualOnlyActorIds),
  )
}

function resolvePrefabAssetUrl(type, variant = null) {
  if (
    typeof type === 'string' &&
    typeof variant === 'string' &&
    typeof prefabAssetVariants[type]?.[variant] === 'string'
  ) {
    return prefabAssetVariants[type][variant]
  }
  return typeof type === 'string' && typeof prefabAssetUrls[type] === 'string'
    ? prefabAssetUrls[type]
    : ''
}

function getBakeSourceAssetUrl(node) {
  if (node.kind === 'asset' && node.asset?.url) return node.asset.url
  if (node.kind === 'prefab' && node.prefab?.type) {
    return resolvePrefabAssetUrl(node.prefab.type, node.prefab.variant ?? null)
  }
  return ''
}

function getSceneBudget(scene, args) {
  const explicit = Number(args['triangle-budget'] ?? args['max-triangles'])
  if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit)

  const tier = String(
    scene.settings?.level?.collision?.workflow?.colliderBudget ?? 'mobile',
  )
  return budgetByTier[tier] ?? budgetByTier.mobile
}

function getCollisionIntent(node) {
  const intent = node.collision?.intent
  return typeof intent === 'string' && intent !== 'none' ? intent : 'blocker'
}

function getCollisionChannel(intent, node) {
  if (node.collision?.channel) return node.collision.channel
  if (intent === 'trigger') return 'trigger'
  if (intent === 'detailMesh') return 'detail'
  return 'worldStatic'
}

function getCollisionLodSourceTier(node, args) {
  if (args['lod-source-tier']) return String(args['lod-source-tier'])

  const authoredTier = node.collision?.lodSourceTier ?? node.collision?.lodTier
  return String(authoredTier === 'source' ? 'low' : authoredTier ?? 'low')
}

function hasCurrentGeneratedCollisionArtifact({ scene, node, publicRoot }) {
  if (
    node.collision?.generationStatus === 'dirty' ||
    node.collision?.generationStatus === 'generating' ||
    node.collision?.generationStatus === 'failed'
  ) {
    return false
  }
  if (
    !(
      node.collision?.enabled !== false &&
      typeof node.collision?.colliderUrl === 'string' &&
      node.collision.colliderUrl.trim().length > 0
    )
  ) {
    return false
  }
  const validation = validateGeneratedCollisionProduct({
    levelId: scene.levelId,
    node,
    publicRoot,
    resolvePrefabAssetUrl,
    requireCurrentMetadata: true,
  })
  return (
    validation.product &&
    validation.errors.length === 0
  )
}

function shouldBakeNode({ scene, node, visualOnlyActorIds, force, publicRoot }) {
  if (!getBakeSourceAssetUrl(node)) return false
  if (node.visible === false) return false
  if (visualOnlyActorIds.has(node.id)) return false
  if (node.collision?.enabled === false || node.collision?.intent === 'none') {
    return false
  }
  if (!requiresGeneratedCollisionArtifact(node, { resolvePrefabAssetUrl })) {
    return false
  }
  if (
    !force &&
    hasCurrentGeneratedCollisionArtifact({ scene, node, publicRoot })
  ) {
    return false
  }
  return true
}

function runBake({ scenePath, scene, node, args, defaultTriangleBudget }) {
  const intent = getCollisionIntent(node)
  const triangleBudget = Number(
    node.collision?.maxTriangles ??
      node.collision?.triangleBudget ??
      defaultTriangleBudget,
  )
  const commandArgs = [
    bakeScript,
    `--level=${scene.levelId}`,
    `--node=${node.id}`,
    `--scene-path=${scenePath}`,
    `--public-root=${resolve(String(args['public-root'] || defaultPublicRoot))}`,
    `--asset-url=${getBakeSourceAssetUrl(node)}`,
    `--intent=${intent}`,
    `--channel=${getCollisionChannel(intent, node)}`,
    `--triangle-budget=${Number.isFinite(triangleBudget) ? triangleBudget : defaultTriangleBudget}`,
    `--lod-source-tier=${getCollisionLodSourceTier(node, args)}`,
  ]
  if (args.write === false) commandArgs.push('--dry-run')
  if (args['simplify-error']) {
    commandArgs.push(`--simplify-error=${args['simplify-error']}`)
  }

  const result = spawnSync(process.execPath, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })

  const jsonLine = result.stdout
    .trim()
    .split(/\r?\n/)
    .reverse()
    .find(line => line.trim().startsWith('{'))
  const payload = jsonLine ? JSON.parse(jsonLine) : null
  return {
    ok: result.status === 0 && payload?.success === true,
    nodeId: node.id,
    payload,
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const reports = []

  for (const scenePath of getScenePaths(args)) {
    const scene = readJson(scenePath)
    const visualOnlyActorIds = getVisualOnlyActorIds(scene)
    const defaultTriangleBudget = getSceneBudget(scene, args)
    const publicRoot = resolve(String(args['public-root'] || defaultPublicRoot))
    const candidates = (scene.nodes ?? []).filter(node =>
      shouldBakeNode({
        scene,
        node,
        visualOnlyActorIds,
        force: args.force,
        publicRoot,
      }),
    )
    const sceneReport = {
      scenePath: scenePath.slice(repoRoot.length).replace(/^[\\/]+/, ''),
      levelId: scene.levelId,
      candidates: candidates.length,
      baked: [],
      failed: [],
      skipped: (scene.nodes ?? []).length - candidates.length,
    }

    for (const node of candidates) {
      const result = runBake({ scenePath, scene, node, args, defaultTriangleBudget })
      if (result.ok) {
        sceneReport.baked.push({
          nodeId: node.id,
          colliderUrl: result.payload.colliderUrl,
          triangleCount: result.payload.triangleCount,
          triangleBudget:
            result.payload.collision?.maxTriangles ??
            result.payload.collision?.triangleBudget,
        })
      } else {
        sceneReport.failed.push({
          nodeId: node.id,
          message:
            result.stderr.trim() ||
            result.stdout.trim() ||
            `Bake failed with exit code ${result.status}`,
        })
        if (!args.continueOnError) break
      }
    }

    reports.push(sceneReport)
  }

  const failed = reports.flatMap(report =>
    report.failed.map(failure => `${report.levelId}/${failure.nodeId}: ${failure.message}`),
  )

  console.log(JSON.stringify({ success: failed.length === 0, reports }, null, 2))

  if (failed.length > 0) {
    console.error('Scene mesh collider bake failed')
    for (const failure of failed) console.error(`- ${failure}`)
    process.exitCode = 1
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
