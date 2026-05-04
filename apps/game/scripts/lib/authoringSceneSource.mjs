import { existsSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { readDeployedSceneLevels } from './levelRegistry.mjs'

function stripBom(source) {
  return source.replace(/^\uFEFF/, '')
}

function readJson(filePath) {
  return JSON.parse(stripBom(readFileSync(filePath, 'utf8')))
}

export function createAuthoringSceneSourceContext({
  appRoot,
  repoRoot = join(appRoot, '..', '..'),
  sceneDir = join(appRoot, 'src/threlte/editor/scenes'),
} = {}) {
  if (!appRoot) {
    throw new Error('appRoot is required for authoring scene source discovery')
  }

  return {
    appRoot,
    repoRoot,
    sceneDir,
    levelRegistryPath: join(appRoot, 'src/threlte/levels/level-registry.json'),
  }
}

function validateAuthoringSceneRecord(record) {
  const errors = []

  if (!record.levelId) {
    errors.push('levelId is required')
  }
  if (!record.sceneId) {
    errors.push('sceneId is required')
  }
  if (!record.document || typeof record.document !== 'object') {
    errors.push('scene document must be an object')
  }
  if (!Array.isArray(record.document?.nodes)) {
    errors.push('scene document nodes must be an array')
  }

  return errors
}

export function readDeployedAuthoringScenes(context) {
  const levels = readDeployedSceneLevels({ appRoot: context.appRoot })
  return levels.map(level => {
    const sceneId = level.source?.sceneId ?? level.id
    const scenePath = join(context.sceneDir, `${sceneId}.scene.json`)
    if (!existsSync(scenePath)) {
      throw new Error(
        `Missing deployed scene document: ${relative(context.repoRoot, scenePath)}`,
      )
    }

    const document = readJson(scenePath)
    const record = {
      levelId: level.id,
      sceneId,
      sourcePath: scenePath,
      sourceRelativePath: relative(context.repoRoot, scenePath),
      document,
    }
    const errors = validateAuthoringSceneRecord(record)
    if (errors.length > 0) {
      throw new Error(
        `${record.sourceRelativePath}: invalid authoring scene source: ${errors.join('; ')}`,
      )
    }

    return record
  })
}

export function getAuthoringSceneSourceMetadata(context) {
  return {
    sourceLevelRegistry: relative(context.repoRoot, context.levelRegistryPath),
    sourceSceneDirectory: relative(context.repoRoot, context.sceneDir),
  }
}
