import { getSceneNodeMeshRenderSource } from './actorRenderSource'
import { clampColliderSize, getCollisionVisualSize } from './colliderGeometry'
import { resolveCollisionPolicy } from './collisionPolicy'
import {
  describeCollisionPolicyIssue,
  getCollisionPolicyIssues,
} from './collisionPolicyIssues'
import {
  actorColliderAabbContainsPoint,
  actorSupportsWalkabilitySample,
} from './collisionSpatialQueries'
import type { WalkableSupportOptions } from './collisionSpatialQueries'
import { requiresExplicitCollisionClassification } from './levelValidation'
import { adaptSceneDocumentToLevelDefinition } from './sceneAdapter'
import type { SceneDocument, SceneNode } from './sceneDocumentTypes'
import { hasTerrainRuntimeCollision } from './terrainRuntimeCollision'
import type {
  ActorDefinition,
  CollisionClassification,
  CollisionIntent,
  LevelDefinition,
  Vec3,
} from './types'

export type CollisionReviewSeverity = 'error' | 'warning' | 'info'
export type CollisionReviewActorStatus =
  | 'ready'
  | 'dirty'
  | 'generating'
  | 'failed'
  | 'walkable'
  | 'blocker'
  | 'trigger'
  | 'detailMesh'
  | 'collisionOnly'
  | 'visualOnly'
  | 'missingCollision'
  | 'disabled'

export interface CollisionReviewActorRow {
  actorId: string
  actorName: string
  actorKind: ActorDefinition['kind']
  visible: boolean
  hasRender: boolean
  runtimeCollision: boolean
  collisionIntent: CollisionIntent | 'none'
  collisionShape?: string
  collisionChannel?: string
  collisionQuality?: string
  collisionLodSourceTier?: string
  generationStatus?: 'ready' | 'dirty' | 'generating' | 'failed'
  generationLastError?: string
  collisionSource: 'authored' | 'default' | 'none' | 'runtime'
  status: CollisionReviewActorStatus
  statusLabel: string
  detail: string
  findingCounts: Record<CollisionReviewSeverity, number>
}

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
  actors: CollisionReviewActorRow[]
  findings: CollisionReviewFinding[]
  classification: Record<CollisionClassification, string[]>
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

function getWalkableSupportOptions(level: LevelDefinition) {
  const policy = (level.settings as any)?.level?.collision?.walkability
  return {
    xzPadding: policy?.supportXzPadding,
    maxDrop: policy?.supportMaxDrop,
    maxPenetration: policy?.supportMaxPenetration,
  } satisfies WalkableSupportOptions
}

function getScenePolicyResult(scene: SceneDocument, node: SceneNode) {
  const renderSource = getSceneNodeMeshRenderSource(node)
  const actorKind =
    renderSource.kind !== 'none'
      ? renderSource.kind
      : node.kind === 'light'
        ? 'light'
        : 'empty'
  return resolveCollisionPolicy({
    levelId: scene.levelId,
    actorId: node.id,
    actorKind,
    visible: node.visible,
    hasGameplay: Boolean(node.gameplay),
    bodyType: node.physics?.bodyType ?? 'fixed',
    primitiveGeometry:
      renderSource.kind === 'primitive'
        ? renderSource.primitive.geometry
        : undefined,
    levelSettings: scene.settings,
    authoredCollision: node.collision
      ? {
          ...node.collision,
          shape: node.collision.shape,
        }
      : null,
  })
}

function getScenePolicySource(scene: SceneDocument, node: SceneNode) {
  return getScenePolicyResult(scene, node).source
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

function createClassificationSummary(
  actors: ActorDefinition[],
): Record<CollisionClassification, string[]> {
  const classification: Record<CollisionClassification, string[]> = {
    collidable: [],
    'visual-only': [],
    disabled: [],
    'missing-collision': [],
    'collision-only-proxy': [],
  }

  for (const actor of actors) {
    if (!actor.collisionClassification) continue
    classification[actor.collisionClassification].push(actor.id)
  }

  for (const actorIds of Object.values(classification)) {
    actorIds.sort()
  }

  return classification
}

function createFindingCounts(
  findings: CollisionReviewFinding[],
  actorId: string,
) {
  return findings.reduce<Record<CollisionReviewSeverity, number>>(
    (counts, finding) => {
      if (finding.actorId === actorId) counts[finding.severity] += 1
      return counts
    },
    { error: 0, warning: 0, info: 0 },
  )
}

function getActorStatus(input: {
  actor: ActorDefinition
  scene?: SceneDocument | null
  sceneNode?: SceneNode
  settings: ReturnType<typeof getReviewSettings>
}): {
  status: CollisionReviewActorStatus
  statusLabel: string
  detail: string
  collisionSource: CollisionReviewActorRow['collisionSource']
} {
  const { actor, scene, sceneNode, settings } = input
  const collision = actor.physics?.collision
  const scenePolicy =
    scene && sceneNode ? getScenePolicyResult(scene, sceneNode) : null
  const collisionSource =
    scenePolicy?.source ?? (collision ? 'runtime' : 'none')

  if (collision) {
    if (
      collision.generationStatus === 'failed' ||
      collision.generationStatus === 'dirty' ||
      collision.generationStatus === 'generating'
    ) {
      return {
        status: collision.generationStatus,
        statusLabel:
          collision.generationStatus === 'dirty'
            ? 'Dirty'
            : collision.generationStatus === 'generating'
              ? 'Generating'
              : 'Failed',
        detail:
          collision.generationLastError ??
          'Mesh-derived collision product is not ready for publish.',
        collisionSource,
      }
    }

    if (
      actor.render?.visible === false ||
      sceneNode?.renderPolicy?.runtimeStyle === 'skip'
    ) {
      return {
        status: 'collisionOnly',
        statusLabel: 'Collision-only',
        detail: `${collision.intent} ${collision.shape} mounts in playtest without visible render geometry.`,
        collisionSource,
      }
    }

    return {
      status: collision.intent as CollisionReviewActorStatus,
      statusLabel:
        collision.intent === 'detailMesh' ? 'Detail mesh' : collision.intent,
      detail: `${collision.intent} ${collision.shape} is active in playtest.`,
      collisionSource,
    }
  }

  if (settings.visualOnlyActorIds.has(actor.id)) {
    return {
      status: 'visualOnly',
      statusLabel: 'Visual-only',
      detail:
        'Visible render geometry is intentionally excluded from runtime collision.',
      collisionSource,
    }
  }

  if (scenePolicy?.warning && actor.render?.visible !== false) {
    return {
      status: 'missingCollision',
      statusLabel: 'Missing collision',
      detail: scenePolicy.warning,
      collisionSource,
    }
  }

  return {
    status: 'disabled',
    statusLabel: 'Disabled',
    detail: 'No runtime collision mounts for this actor.',
    collisionSource,
  }
}

function createActorRows(input: {
  level: LevelDefinition
  scene?: SceneDocument | null
  sceneNodeById: Map<string, SceneNode>
  settings: ReturnType<typeof getReviewSettings>
  findings: CollisionReviewFinding[]
}): CollisionReviewActorRow[] {
  return input.level.actors.map(actor => {
    const sceneNode = input.sceneNodeById.get(actor.id)
    const collision = actor.physics?.collision
    const status = getActorStatus({
      actor,
      scene: input.scene,
      sceneNode,
      settings: input.settings,
    })

    return {
      actorId: actor.id,
      actorName: actor.name,
      actorKind: actor.kind,
      visible: actor.render?.visible !== false,
      hasRender: Boolean(actor.render),
      runtimeCollision: Boolean(collision),
      collisionIntent: collision?.intent ?? 'none',
      collisionShape: collision?.shape,
      collisionChannel: collision?.channel,
      collisionQuality: collision?.quality,
      collisionLodSourceTier: collision?.lodSourceTier,
      generationStatus: collision?.generationStatus,
      generationLastError: collision?.generationLastError,
      collisionSource: status.collisionSource,
      status: status.status,
      statusLabel: status.statusLabel,
      detail: status.detail,
      findingCounts: createFindingCounts(input.findings, actor.id),
    }
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
      actors: [],
      findings: [
        {
          id: 'missing-level-definition',
          code: 'missing-level-definition',
          severity: 'error',
          message: 'Collision review needs a scene document or runtime scene.',
        },
      ],
      classification: {
        collidable: [],
        'visual-only': [],
        disabled: [],
        'missing-collision': [],
        'collision-only-proxy': [],
      },
      summary: { error: 1, warning: 0, info: 0 },
    }
  }

  const sceneNodeById = new Map(
    (input.scene?.nodes ?? []).map(node => [node.id, node]),
  )
  const actorById = new Map(level.actors.map(actor => [actor.id, actor]))
  const settings = getReviewSettings(level)
  const walkableSupportOptions = getWalkableSupportOptions(level)
  const findings: CollisionReviewFinding[] = []
  const classification = createClassificationSummary(level.actors)
  const missingCollisionSeverity: CollisionReviewSeverity =
    requiresExplicitCollisionClassification(level) ? 'error' : 'warning'
  const bakedTerrainActive = hasTerrainRuntimeCollision(level, {
    runtimeTerrainManifestUrl: input.runtimeScene?.runtime?.terrainManifestUrl,
  })
  const terrainSettings = (level.settings as any)?.level?.collision?.terrain
  const groundSettings = (level.settings as any)?.level?.ground
  const terrainRuntimeMode =
    groundSettings?.terrainRuntimeMode ?? terrainSettings?.runtimeMode
  const terrainCollisionSource =
    groundSettings?.collisionSource ??
    (terrainSettings?.source === 'source-glb'
      ? 'source-linked-terrain-collision'
      : undefined)

  if (terrainRuntimeMode === 'glb-chunk-terrain' && !terrainCollisionSource) {
    createFinding(findings, {
      code: 'glb-terrain-source-linked-collision-missing',
      severity: 'error',
      message: 'GLB chunk terrain is missing source-linked collision.',
      recommendation:
        'Bake collision from the same GLB contract, a dedicated collision GLB, a simplified source GLB collider, or a selected walkable mesh collider.',
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
      const scenePolicy =
        input.scene && sceneNode
          ? getScenePolicyResult(input.scene, sceneNode)
          : null
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
      if (
        actor.collisionClassification === 'missing-collision' ||
        (scenePolicy?.warning &&
          actor.render?.visible !== false &&
          !settings.visualOnlyActorIds.has(actor.id))
      ) {
        createFinding(findings, {
          code: 'unclassified-visible-geometry',
          severity: missingCollisionSeverity,
          ...actorMeta,
          message: `Visible actor "${actorName}" has no collision and no explicit visual-only or disabled classification.`,
          recommendation:
            'Author collision, mark it visual-only, or explicitly disable collision before publishing.',
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

    if (
      collision.generationStatus === 'dirty' ||
      collision.generationStatus === 'generating' ||
      collision.generationStatus === 'failed'
    ) {
      createFinding(findings, {
        code: 'collision-generation-not-ready',
        severity: 'error',
        ...actorMeta,
        message: `Actor "${actorName}" collision generation status is ${collision.generationStatus}.`,
        recommendation:
          collision.generationLastError ??
          'Regenerate mesh-derived collision before publishing.',
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
      !collision.colliderUrl &&
      !collision.generatedProduct
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
        code: 'walkable-overlaps-terrain-collision',
        severity: settings.groundActorIds.has(actor.id) ? 'warning' : 'info',
        ...actorMeta,
        message: `Walkable actor "${actorName}" coexists with runtime terrain collision.`,
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
      actorSupportsWalkabilitySample(actor, spawn, walkableSupportOptions),
    )
    if (!hasAuthoredSupport && !bakedTerrainActive) {
      createFinding(findings, {
        code: 'spawn-unsupported-by-walkable',
        severity: 'error',
        message:
          'Player spawn is not supported by authored walkable collision.',
        recommendation:
          'Add a walkable actor beneath the spawn or configure runtime terrain collision.',
      })
    } else if (!hasAuthoredSupport && bakedTerrainActive) {
      createFinding(findings, {
        code: 'spawn-relies-on-terrain-collision',
        severity: 'info',
        message:
          'Player spawn is not supported by primitive walkable collision and relies on runtime terrain collision coverage.',
        recommendation:
          'Verify the terrain manifest covers the spawn point before publishing.',
      })
    }
  }

  return {
    levelId: level.id,
    actors: createActorRows({
      level,
      scene: input.scene,
      sceneNodeById,
      settings,
      findings,
    }),
    findings,
    classification,
    summary: createSummary(findings),
  }
}
