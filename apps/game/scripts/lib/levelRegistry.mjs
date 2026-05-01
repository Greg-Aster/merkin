import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultAppRoot = fileURLToPath(new URL('../..', import.meta.url))

export function readLevelRegistry(options = {}) {
  const appRoot = options.appRoot ?? defaultAppRoot
  const registryPath = join(appRoot, 'src/threlte/levels/level-registry.json')
  return JSON.parse(readFileSync(registryPath, 'utf8').replace(/^\uFEFF/, ''))
}

export function readDeployedSceneLevels(options = {}) {
  const fallback = options.fallback ?? []

  try {
    const levels = readSceneLevels(options).filter(entry => entry?.deployed)

    if (levels.length > 0) return levels
  } catch (error) {
    if (fallback.length === 0) {
      throw error
    }
  }

  return [...fallback]
}

export function readSceneLevels(options = {}) {
  return readLevelRegistry(options).filter(
    entry => entry?.source?.kind === 'scene' && entry?.id,
  )
}

export function readDeployedLevelIds(options = {}) {
  return readDeployedSceneLevels(options)
    .map(level => level.id)
    .filter(Boolean)
}
