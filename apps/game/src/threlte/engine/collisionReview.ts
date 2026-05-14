import { clampColliderSize, getCollisionVisualSize } from './colliderGeometry'
import {
  describeCollisionPolicyIssue,
  getCollisionPolicyIssues,
} from './collisionPolicyIssues'
import { resolveCollisionPolicy } from './collisionPolicy'
import { isEditorProxyCollision } from './editorProxyCollision'
import {
  actorColliderAabbContainsPoint,
  actorSupportsWalkabilitySample,
} from './collisionSpatialQueries'
import { adaptSceneDocumentToLevelDefinition } from './sceneAdapter'
import type { SceneDocument, SceneNode } from './sceneDocumentTypes'
import { hasTerrainRuntimeCollision } from './terrainRuntimeCollision'
import type {
  ActorDefinition,
  CollisionIntent,
  LevelDefinition,
  Vec3,
} from './types'

export type CollisionReviewSeverity = 'error' | 'warning' | 'info'

export interface CollisionReviewFinding {
  id: string
  code: string
  severity: CollisionReviewSeverity
  message: string
  actorId?: string
  actorName?: string
  recommendation?: string
}

export interface CollisionReviewReport {
  levelId: string
  findings: CollisionReviewFinding[]
  summary: Record<CollisionReviewSeverity, number>
}

export interface CollisionReviewRuntimeScene {
  levelDefinition: LevelDefinition
  buildReport?: {
    errors?: string[]
    warnings?: string[]
  }
  runtime?: {
    terrainManifestUrl?: string
    ground?: Record<string, unknown> | null
  }
}

const DEFAULT_OVERSIZED_COLLIDER_RATIO = 4

function isFiniteVec3Value(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function getKnownVisualSize(node: SceneNode | undefined): Vec3 | undefined {
  if (!node) return undefined
  if (isFiniteVec3Value(node.generation?.sourceVisualSize)) {
    return [
      clampColliderSize(node.generation.sourceVisualSize[0]),
      clampColliderSize(node.generation.sourceVisualSize[1]),
      clampColliderSize(node.generation.sourceVisualSize[2]),
    ]
  }
  if (node.primitive) {
    return getCollisionVisualSize({
      primitive: node.primitive,
      scale: node.scale,
    })
  }
  return undefined
}

function getReviewSettings(level: LevelDefinition) {
  const collisionSettings = (level.settings as any)?.level?.collision
  const reviewSettings = collisionSettings?.review
  const ratio = Number(reviewSettings?.oversizedColliderRatio)
  const groundActorIds =
    (level.settings as any)?.level?.ground?.groundActorIds ??
    collisionSettings?.roles?.groundActorIds
  return {
    visualOnlyActorIds: new Set<string>(
      Array.isArray(collisionSettings?.roles?.visualOnlyActorIds)
        ? collisionSettings.roles.visualOnlyActorIds.filter(
            (id: unknown): id is string => typeof id === 'string',
          )
        : [],
    ),
    groundActorIds: new Set<string>(
      Array.isArray(groundActorIds)
        ? groundActorIds.filter(
            (id: unknown): id is string => typeof id === 'string',
          )
        : [],
    ),
    oversizedColliderRatio:
      Number.isFinite(ratio) && ratio >= 1.5
        ? ratio
        : DEFAULT_OVERSIZED_COLLIDER_RATIO,
  }
}

function getScenePolicySource(scene: SceneDocument, node: SceneNode) {
  const result = resolveCollisionPolicy({
    levelId: scene.levelId,
    actorId: node.id,
    actorKind:
      node.kind === 'asset' ||
      node.kind === 'primitive' ||
      node.kind === 'prefab' ||
      node.kind === 'light'
        ? node.kind
        : 'empty',
    visible: node.visible,
    hasGameplay: Boolean(node.gameplay),
    bodyType: node.physics?.bodyType ?? 'fixed',
    primitiveGeometry: node.primitive?.geometry,
    levelSettings: scene.settings,
    authoredCollision: node.collision
      ? {
          ...node.collision,
          shape: node.collision.shape,
        }
      : null,
  })
  return result.source
}

function getCollisionLabel(actor: ActorDefinition) {
  return actor.physics?.collision.intent ?? 'none'
}

function isPlayerBlockingIntent(intent: CollisionIntent | undefined) {
  return intent === 'blocker'
}

function createSummary(findings: CollisionReviewFinding[]) {
  return findings.reduce<Record<CollisionReviewSeverity, number>>(
    (summary, finding) => {
      summary[finding.severity] += 1
      return summary
    },
    { error: 0, warning: 0, info: 0 },
  )
}

function createFinding(
  findings: CollisionReviewFinding[],
  finding: Omit<CollisionReviewFinding, 'id'>,
) {
  findings.push({
    ...finding,
    id: `${finding.code}:${finding.actorId ?? findings.length}`,
  })
}

export function reviewCollisionContracts(input: {
  scene?: SceneDocument | null
  levelDefinition?: LevelDefinition | null
  runtimeScene?: CollisionReviewRuntimeScene | null
}): CollisionReviewReport {
  const level =
    input.levelDefinition ??
    (input.scene ? adaptSceneDocumentToLevelDefinition(input.scene) : null) ??
    input.runtimeScene?.levelDefinition
  if (!level) {
    return {
      levelId: 'unknown',
      findings: [
        {
          id: 'missing-level-definition',
          code: 'missing-level-definition',
          severity: 'error',
          message: 'Collision review needs a scene document or runtime scene.',
        },
      ],
      summary: { error: 1, warning: 0, info: 0 },
    }
  }

  const sceneNodeById = new Map(
    (input.scene?.nodes ?? []).map(node => [node.id, node]),
  )
  const actorById = new Map(level.actors.map(actor => [actor.id, actor]))
  const settings = getReviewSettings(level)
  const findings: CollisionReviewFinding[] = []
  const bakedTerrainActive = hasTerrainRuntimeCollision(level, {
    runtimeTerrainManifestUrl: input.runtimeScene?.runtime?.terrainManifestUrl,
  })
  const terrainSettings = (level.settings as any)?.level?.collision?.terrain
  const groundSettings = (level.settings as any)?.level?.ground
  const terrainRuntimeMode =
    groundSettings?.terrainRuntimeMode ?? terrainSettings?.runtimeMode
  const terrainCollisionSource =
    groundSettings?.collisionSource ??
    (terrainSettings?.source === 'baked-heightmap'
      ? 'baked-heightfield'
      : undefined)

  if (
    terrainRuntimeMode === 'glb-chunk-terrain' &&
    terrainCollisionSource === 'baked-heightfield' &&
    terrainSettings?.approvedHeightfieldException !== true
  ) {
    createFinding(findings, {
      code: 'glb-terrain-heightfield-collision',
      severity: 'error',
      message:
        'GLB chunk terrain is configured with heightfield collision without an approved exception.',
      recommendation:
        'Bake a dedicated terrain collision GLB, simplified source GLB collider, or selected walkable mesh collider.',
    })
  }

  for (const actor of level.actors) {
    const collision = actor.physics?.collision
    const sceneNode = sceneNodeById.get(actor.id)
    const actorName = actor.name
    const actorMeta = {
      actorId: actor.id,
      actorName,
    }

    if (!collision) {
      if (
        sceneNode?.collision &&
        settings.visualOnlyActorIds.has(actor.id) &&
        sceneNode.collision.enabled !== false &&
        sceneNode.collision.intent !== 'none'
      ) {
        createFinding(findings, {
          code: 'visual-only-authored-collision',
          severity: 'warning',
          ...actorMeta,
          message: `Visual-only actor "${actorName}" still has authored collision metadata.`,
          recommendation:
            'Remove the authored collision block or move the actor out of visualOnlyActorIds.',
        })
      }
      continue
    }

    if (actor.render?.visible === false) {
      createFinding(findings, {
        code: 'hidden-active-collision',
        severity: 'info',
        ...actorMeta,
        message: `Hidden actor "${actorName}" mounts ${getCollisionLabel(actor)} collision.`,
        recommendation:
          'Keep this only for intentional collision-only proxies and verify it in the overlay.',
      })
    }

    if (isEditorProxyCollision(sceneNode?.collision)) {
      createFinding(findings, {
        code: 'editor-proxy-collision-in-runtime',
        severity: 'error',
        ...actorMeta,
        message: `Actor "${actorName}" uses editor proxy collision.`,
        recommendation:
          'Bake or assign a runtime collider before publishing this scene.',
      })
    }

    if (
      input.scene &&
      sceneNode &&
      getScenePolicySource(input.scene, sceneNode) === 'default'
    ) {
      createFinding(findings, {
        code: 'visible-default-collision',
        severity: 'warning',
        ...actorMeta,
        message: `Visible actor "${actorName}" is using default ${collision.intent} collision.`,
        recommendation:
          'Author an explicit collision intent, mark it visual-only, or disable default actor collision for the level.',
      })
    }

    if (
      actor.kind === 'asset' &&
      collision.shape === 'trimesh' &&
      !collision.colliderUrl
    ) {
      createFinding(findings, {
        code: 'missing-trimesh-collider-url',
        severity: 'error',
        ...actorMeta,
        message: `Trimesh asset actor "${actorName}" is missing collision.colliderUrl.`,
        recommendation:
          'Bake or assign a collider asset instead of deriving collision from the render mesh.',
      })
    }

    if (actor.kind === 'asset' && collision.shape !== 'trimesh') {
      createFinding(findings, {
        code: 'asset-primitive-collision',
        severity: 'error',
        ...actorMeta,
        message: `Asset actor "${actorName}" uses ${collision.shape} collision instead of a baked trimesh collider.`,
        recommendation:
          'Bake a mesh collider asset, mark the actor visual-only, or remove collision. Do not use primitive collision as the automatic fallback for visible asset meshes.',
      })
    }

    for (const issue of getCollisionPolicyIssues({
      collision,
      bodyType: actor.physics?.bodyType,
    })) {
      const description = describeCollisionPolicyIssue(issue, {
        actorId: actor.id,
        actorName,
        collision,
      })
      createFinding(findings, {
        code: description.reviewCode,
        severity: 'error',
        ...actorMeta,
        message: description.reviewMessage,
        recommendation: description.reviewRecommendation,
      })
    }

    const visualSize = getKnownVisualSize(sceneNode)
    if (visualSize && isFiniteVec3Value(collision.size)) {
      const ratios = collision.size.map(
        (size, index) => Math.abs(size) / clampColliderSize(visualSize[index]),
      )
      const largestRatio = Math.max(...ratios)
      if (largestRatio >= settings.oversizedColliderRatio) {
        createFinding(findings, {
          code: 'oversized-collider',
          severity: 'warning',
          ...actorMeta,
          message: `Actor "${actorName}" collider is ${largestRatio.toFixed(1)}x larger than known visual bounds on one axis.`,
          recommendation:
            'Fit the collider to the visual bounds or split large proxy coverage into intentional collision-only actors.',
        })
      }
    }

    if (bakedTerrainActive && collision.intent === 'walkable') {
      createFinding(findings, {
        code: 'walkable-overlaps-baked-terrain',
        severity: settings.groundActorIds.has(actor.id) ? 'warning' : 'info',
        ...actorMeta,
        message: `Walkable actor "${actorName}" coexists with baked terrain collision.`,
        recommendation:
          'Confirm whether this actor is supplemental platform collision or should be visual-only terrain detail.',
      })
    }
  }

  if (isFiniteVec3Value(level.spawn?.player)) {
    const spawn = level.spawn.player
    const containingBlocker = level.actors.find(actor => {
      const collision = actor.physics?.collision
      return (
        collision &&
        !collision.sensor &&
        isPlayerBlockingIntent(collision.intent) &&
        actorColliderAabbContainsPoint(actor, spawn)
      )
    })
    if (containingBlocker) {
      createFinding(findings, {
        code: 'spawn-inside-blocker',
        severity: 'error',
        actorId: containingBlocker.id,
        actorName: containingBlocker.name,
        message: `Player spawn is inside blocker "${containingBlocker.name}".`,
        recommendation:
          'Move the spawn or resize the blocker so activation starts in free space.',
      })
    }

    const hasAuthoredSupport = level.actors.some(actor =>
      actorSupportsWalkabilitySample(actor, spawn),
    )
    if (!hasAuthoredSupport && !bakedTerrainActive) {
      createFinding(findings, {
        code: 'spawn-unsupported-by-walkable',
        severity: 'error',
        message:
          'Player spawn is not supported by authored walkable collision.',
        recommendation:
          'Add a walkable actor beneath the spawn or configure baked terrain collision.',
      })
    } else if (!hasAuthoredSupport && bakedTerrainActive) {
      createFinding(findings, {
        code: 'spawn-relies-on-baked-terrain',
        severity: 'info',
        message:
          'Player spawn is not supported by primitive walkable collision and relies on baked terrain coverage.',
        recommendation:
          'Verify the terrain manifest covers the spawn point before publishing.',
      })
    }
  }

  return {
    levelId: level.id,
    findings,
    summary: createSummary(findings),
  }
}
