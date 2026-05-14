import { isEditorProxyCollision } from '../engine/editorProxyCollision'
import { createLevelBuildReport } from '../engine/levelValidation'
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

function isAuthoringOnlyCollisionError(error: string) {
  return error.includes(
    'must use baked trimesh collision instead of primitive collision',
  )
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
  }

  return errors
}

function getEditorProxyCollisionIssues(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.nodes)) return []

  const issues: string[] = []
  for (const node of value.nodes) {
    if (!isRecord(node) || !isRecord(node.collision)) continue
    const collision = node.collision
    if (isEditorProxyCollision(collision)) {
      const nodeId = typeof node.id === 'string' ? node.id : 'unknown'
      issues.push(
        `Actor "${nodeId}" uses editor proxy collision; bake or assign a runtime collider before publishing.`,
      )
    }
  }
  return issues
}

export function validateEditorSceneDocument(
  value: unknown,
): EditorSceneDocumentValidationResult {
  const errors = validateSceneShape(value)
  const warnings: string[] = []

  if (errors.length === 0) {
    const buildReport = getLevelBuildReportForScene(value)
    for (const error of buildReport.errors) {
      if (isAuthoringOnlyCollisionError(error)) {
        warnings.push(`LevelDefinition: ${error}`)
      } else {
        errors.push(`LevelDefinition: ${error}`)
      }
    }
    warnings.push(
      ...buildReport.warnings.map(warning => `LevelDefinition: ${warning}`),
    )
    warnings.push(
      ...getEditorProxyCollisionIssues(value).map(
        warning => `SceneDocument: ${warning}`,
      ),
    )
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
    const buildReport = getLevelBuildReportForScene(value)
    errors.push(...buildReport.errors.map(error => `LevelDefinition: ${error}`))
    warnings.push(
      ...buildReport.warnings.map(warning => `LevelDefinition: ${warning}`),
    )
    errors.push(
      ...getEditorProxyCollisionIssues(value).map(
        error => `SceneDocument: ${error}`,
      ),
    )
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
      `${operation} validation failed: ${validation.errors.join(' ')}`,
    )
  }

  return withEditorSceneEngineData(value as EditorSceneDocument)
}

export function assertPublishableEditorSceneDocument(
  value: unknown,
  operation: string,
): EditorSceneDocument {
  const validation = validatePublishableEditorSceneDocument(value)
  if (!validation.valid) {
    throw new Error(
      `${operation} validation failed: ${validation.errors.join(' ')}`,
    )
  }

  return withEditorSceneEngineData(value as EditorSceneDocument)
}
