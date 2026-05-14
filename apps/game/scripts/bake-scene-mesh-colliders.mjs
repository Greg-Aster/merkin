import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const appRoot = resolve(repoRoot, 'apps/game')
const defaultSceneRoot = resolve(appRoot, 'src/threlte/editor/scenes')
const defaultPublicRoot = resolve(repoRoot, 'apps/megameal/public')
const bakeScript = resolve(appRoot, 'scripts/bake-mesh-collider.mjs')

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

function hasBakedTrimeshCollision(node) {
  return (
    node.collision?.enabled !== false &&
    node.collision?.shape === 'trimesh' &&
    node.collision?.proxy !== true &&
    !['needsBake', 'stale'].includes(node.collision?.bakeStatus) &&
    typeof node.collision?.colliderUrl === 'string' &&
    node.collision.colliderUrl.trim().length > 0
  )
}

function shouldBakeNode(node, visualOnlyActorIds, force) {
  if (node.kind !== 'asset' || !node.asset?.url) return false
  if (node.visible === false) return false
  if (visualOnlyActorIds.has(node.id)) return false
  if (node.collision?.enabled === false || node.collision?.intent === 'none') {
    return false
  }
  if (!force && hasBakedTrimeshCollision(node)) return false
  return true
}

function runBake({ scenePath, scene, node, args, defaultTriangleBudget }) {
  const intent = getCollisionIntent(node)
  const triangleBudget = Number(
    node.collision?.triangleBudget ?? defaultTriangleBudget,
  )
  const commandArgs = [
    bakeScript,
    `--level=${scene.levelId}`,
    `--node=${node.id}`,
    `--scene-path=${scenePath}`,
    `--public-root=${resolve(String(args['public-root'] || defaultPublicRoot))}`,
    `--intent=${intent}`,
    `--channel=${getCollisionChannel(intent, node)}`,
    `--triangle-budget=${Number.isFinite(triangleBudget) ? triangleBudget : defaultTriangleBudget}`,
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
    const candidates = (scene.nodes ?? []).filter(node =>
      shouldBakeNode(node, visualOnlyActorIds, args.force),
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
          triangleBudget: result.payload.collision?.triangleBudget,
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
