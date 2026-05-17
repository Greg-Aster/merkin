import { createLevelBuildReport } from '../engine/levelValidation'
import { validateNpcNodes } from '../engine/npcValidation'
import { withEditorSceneEngineData } from '../engine/sceneDocumentRuntime'
import type { EditorSceneDocument } from './editorTypes'

export interface EditorSceneDocumentValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

function getLevelBuildReportForScene(value: unknown) {
  const scene = withEditorSceneEngineData(value as EditorSceneDocument)
  return createLevelBuildReport(scene.engine!.levelDefinition)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFiniteNumberArray(value: unknown, length: number) {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every(component => Number.isFinite(component))
  )
}

const collisionPolicyModes = new Set(['auto', 'none', 'trigger'])
const collisionGenerationQualities = new Set([
  'primitive',
  'convexHull',
  'simplifiedMesh',
  'trimesh',
])
const collisionGenerationStatuses = new Set([
  'ready',
  'dirty',
  'generating',
  'failed',
])
const legacyCollisionSourceFields = [
  'enabled',
  'size',
  'sourceAssetFingerprint',
  'assetLocalTransformFingerprint',
  'lockToObject',
  'lodSourceTier',
  'triangleBudget',
]
const generatedCollisionProductFields = [
  'colliderUrl',
  'colliderMetadataUrl',
  'colliderCacheKey',
  'sourceAssetUrl',
  'colliderSourceAssetUrl',
  'assetLocalTransform',
  'triangleCount',
  'vertexCount',
]

function getPresentFields(
  value: Record<string, unknown>,
  fields: readonly string[],
) {
  return fields.filter(field => Object.hasOwn(value, field))
}

function validateSceneShape(value: unknown) {
  const errors: string[] = []

  if (!isRecord(value)) {
    return ['Scene document must be an object.']
  }

  if (typeof value.levelId !== 'string' || value.levelId.trim() === '') {
    errors.push('Scene document must declare a non-empty levelId.')
  }

  if (!Number.isFinite(value.version)) {
    errors.push('Scene document must declare a numeric version.')
  }

  if (typeof value.updatedAt !== 'string' || value.updatedAt.trim() === '') {
    errors.push('Scene document must declare an updatedAt timestamp.')
  }

  if (!Array.isArray(value.nodes)) {
    errors.push('Scene document nodes must be an array.')
    return errors
  }

  const levelSettings = isRecord(value.settings)
    ? (value.settings.level as unknown)
    : null
  const spawn = isRecord(levelSettings)
    ? (levelSettings.spawn as unknown)
    : null
  if (isRecord(spawn)) {
    if (
      spawn.position !== undefined &&
      !isFiniteNumberArray(spawn.position, 3)
    ) {
      errors.push('settings.level.spawn.position must be a finite vec3.')
    }
    if (
      spawn.rotation !== undefined &&
      !isFiniteNumberArray(spawn.rotation, 3)
    ) {
      errors.push('settings.level.spawn.rotation must be a finite vec3.')
    }
  }

  const seenNodeIds = new Set<string>()
  for (const [index, node] of value.nodes.entries()) {
    if (!isRecord(node)) {
      errors.push(`Node ${index} must be an object.`)
      continue
    }

    const id = node.id
    if (typeof id !== 'string' || id.trim() === '') {
      errors.push(`Node ${index} must declare a non-empty id.`)
    } else if (seenNodeIds.has(id)) {
      errors.push(`Node id "${id}" is duplicated.`)
    } else {
      seenNodeIds.add(id)
    }

    if (typeof node.name !== 'string' || node.name.trim() === '') {
      errors.push(`Node ${id || index} must declare a non-empty name.`)
    }

    if (typeof node.kind !== 'string' || node.kind.trim() === '') {
      errors.push(`Node ${id || index} must declare a kind.`)
    }

    if (!isFiniteNumberArray(node.position, 3)) {
      errors.push(`Node ${id || index} must declare a vec3 position.`)
    }

    if (!isFiniteNumberArray(node.rotation, 3)) {
      errors.push(`Node ${id || index} must declare a vec3 rotation.`)
    }

    if (!isFiniteNumberArray(node.scale, 3)) {
      errors.push(`Node ${id || index} must declare a vec3 scale.`)
    }

    if (isRecord(node.generation) && 'originalCollision' in node.generation) {
      errors.push(
        `Node ${id || index} uses removed generated collision source truth; delete generation.originalCollision.`,
      )
    }

    if (isRecord(node.collision)) {
      if (
        'proxy' in node.collision ||
        'bakeStatus' in node.collision ||
        'authoring' in node.collision
      ) {
        errors.push(
          `Node ${id || index} uses removed editor proxy collision metadata; delete collision.proxy, collision.bakeStatus, and collision.authoring.`,
        )
      }

      const legacyFields = getPresentFields(
        node.collision,
        legacyCollisionSourceFields,
      )
      if (legacyFields.length > 0) {
        errors.push(
          `Node ${id || index} uses removed authored collider geometry fields: collision.${legacyFields.join(', collision.')}. Author collision policy instead.`,
        )
      }

      if (node.collision.shape !== undefined) {
        const generatedFields = getPresentFields(
          node.collision,
          generatedCollisionProductFields,
        )
        if (
          node.collision.shape !== 'trimesh' ||
          generatedFields.length === 0
        ) {
          errors.push(
            `Node ${id || index} collision.shape is only allowed as generated mesh collision product metadata.`,
          )
        }
      }

      if (
        node.collision.mode !== undefined &&
        !collisionPolicyModes.has(String(node.collision.mode))
      ) {
        errors.push(
          `Node ${id || index} collision.mode must be auto, none, or trigger.`,
        )
      }

      if (
        node.collision.quality !== undefined &&
        !collisionGenerationQualities.has(String(node.collision.quality))
      ) {
        errors.push(
          `Node ${id || index} collision.quality must be primitive, convexHull, simplifiedMesh, or trimesh.`,
        )
      }

      if (
        node.collision.generationStatus !== undefined &&
        !collisionGenerationStatuses.has(
          String(node.collision.generationStatus),
        )
      ) {
        errors.push(
          `Node ${id || index} collision.generationStatus must be ready, dirty, generating, or failed.`,
        )
      }

      if (
        node.collision.maxTriangles !== undefined &&
        (!Number.isFinite(node.collision.maxTriangles) ||
          Number(node.collision.maxTriangles) < 0)
      ) {
        errors.push(
          `Node ${id || index} collision.maxTriangles must be a non-negative finite number.`,
        )
      }
    }
  }

  return errors
}

export function validateEditorSceneDocument(
  value: unknown,
): EditorSceneDocumentValidationResult {
  const errors = validateSceneShape(value)
  const warnings: string[] = []
  if (errors.length === 0 && isRecord(value) && Array.isArray(value.nodes)) {
    const npcValidation = validateNpcNodes(
      value.nodes as EditorSceneDocument['nodes'],
    )
    errors.push(...npcValidation.errors)
    warnings.push(...npcValidation.warnings)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export function validatePublishableEditorSceneDocument(
  value: unknown,
): EditorSceneDocumentValidationResult {
  const errors = validateSceneShape(value)
  const warnings: string[] = []

  if (errors.length === 0) {
    try {
      const buildReport = getLevelBuildReportForScene(value)
      errors.push(...buildReport.errors.map(error => `Publish: ${error}`))
      warnings.push(
        ...buildReport.warnings.map(warning => `Publish: ${warning}`),
      )
    } catch (error) {
      errors.push(
        `Publish: ${error instanceof Error ? error.message : 'Unable to build runtime level definition.'}`,
      )
    }
  }

  if (
    errors.length === 0 &&
    (!isRecord(value) ||
      !Array.isArray(value.nodes) ||
      value.nodes.length === 0)
  ) {
    errors.push('Publish requires at least one authored scene node.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export function assertValidEditorSceneDocument(
  value: unknown,
  operation: string,
): EditorSceneDocument {
  const validation = validateEditorSceneDocument(value)
  if (!validation.valid) {
    throw new Error(
      `${operation} WIP shape validation failed: ${validation.errors.join(' ')}`,
    )
  }

  return value as EditorSceneDocument
}

export function assertPublishableEditorSceneDocument(
  value: unknown,
  operation: string,
): EditorSceneDocument {
  const validation = validatePublishableEditorSceneDocument(value)
  if (!validation.valid) {
    throw new Error(
      `${operation} publish validation failed: ${validation.errors.join(' ')}`,
    )
  }

  return withEditorSceneEngineData(value as EditorSceneDocument)
}
