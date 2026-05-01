import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { readDeployedSceneLevels, readSceneLevels } from './levelRegistry.mjs'

const DEFAULT_TARGET_RESOLUTION = 128

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
}

function terrainIdFromManifestPath(path) {
  return basename(path).replace(/\.manifest\.json$/, '')
}

function addAlias(aliases, value) {
  if (typeof value !== 'string') return
  const trimmed = value.trim()
  if (trimmed) aliases.add(trimmed)
}

function terrainAliases({ id, manifest }) {
  const aliases = new Set()
  addAlias(aliases, id)
  addAlias(aliases, manifest.id)
  addAlias(aliases, id.replace(/-environment$/, ''))
  addAlias(aliases, id.replace(/-terrain$/, ''))
  if (typeof manifest.id === 'string') {
    addAlias(aliases, manifest.id.replace(/-environment$/, ''))
    addAlias(aliases, manifest.id.replace(/-terrain$/, ''))
  }
  return aliases
}

function registryAliases(level) {
  const aliases = new Set()
  addAlias(aliases, level.id)
  addAlias(aliases, level.source?.sceneId)
  for (const alias of level.aliases ?? []) {
    addAlias(aliases, alias)
  }
  return aliases
}

function readTerrainManifests(publicRoot) {
  const terrainRoot = join(publicRoot, 'terrain')
  if (!existsSync(terrainRoot)) return []

  return readdirSync(terrainRoot)
    .filter(file => file.endsWith('.manifest.json'))
    .sort((a, b) => a.localeCompare(b))
    .map(file => {
      const manifestPath = join(terrainRoot, file)
      const manifest = readJson(manifestPath)
      const id = terrainIdFromManifestPath(manifestPath)
      return {
        id,
        manifest,
        manifestId: manifest.id ?? id,
        manifestPath,
        aliases: terrainAliases({ id, manifest }),
      }
    })
}

function findManifestForLevel(manifests, level) {
  const aliases = registryAliases(level)
  return manifests.find(manifest =>
    [...manifest.aliases].some(alias => aliases.has(alias)),
  )
}

function resolveSceneSettingsKey(repoRoot, level) {
  const sceneId = level.source?.sceneId ?? level.id
  const scenePath = join(
    repoRoot,
    'apps/game/src/threlte/editor/scenes',
    `${sceneId}.scene.json`,
  )
  if (!existsSync(scenePath)) return 'level'

  const settings = readJson(scenePath).settings ?? {}
  for (const key of [level.id, sceneId, 'level']) {
    if (settings[key]) return key
  }
  return 'level'
}

export function discoverTerrainLevels({
  repoRoot,
  publicRoot,
  deployedOnly = false,
}) {
  const appRoot = join(repoRoot, 'apps/game')
  const registry = deployedOnly
    ? readDeployedSceneLevels({ appRoot })
    : readSceneLevels({ appRoot })
  const manifests = readTerrainManifests(publicRoot)

  return registry
    .map(level => {
      const terrainManifest = findManifestForLevel(manifests, level)
      if (!terrainManifest) return null

      const sceneId = level.source?.sceneId ?? level.id
      return {
        id: terrainManifest.id,
        levelId: level.id,
        sceneId,
        title: level.title ?? level.id,
        manifestId: terrainManifest.manifestId,
        manifestPath: terrainManifest.manifestPath,
        manifestUrl: `/terrain/${terrainManifest.id}.manifest.json`,
        sceneSettingsKey: resolveSceneSettingsKey(repoRoot, level),
        targetResolution:
          terrainManifest.manifest.collision?.terrain?.targetResolution ??
          DEFAULT_TARGET_RESOLUTION,
        aliases: [
          ...new Set([
            ...registryAliases(level),
            ...terrainManifest.aliases,
            terrainManifest.manifestId,
          ]),
        ],
      }
    })
    .filter(Boolean)
}

export function resolveTerrainLevel(levels, requestedLevel) {
  if (!requestedLevel) return null
  return (
    levels.find(level =>
      [
        level.id,
        level.levelId,
        level.sceneId,
        level.manifestId,
        ...level.aliases,
      ].includes(requestedLevel),
    ) ?? null
  )
}

export function formatTerrainLevelList(levels) {
  return levels
    .map(level =>
      level.id === level.levelId ? level.id : `${level.levelId} (${level.id})`,
    )
    .join(', ')
}
