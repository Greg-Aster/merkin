<script lang="ts">
import { onDestroy } from 'svelte'
import {
  type CollisionReviewActorRow,
  type CollisionReviewFinding,
  reviewCollisionContracts,
} from '../engine/collisionReview'
import { getLevelCollisionWorkflow } from '../engine/levelCollisionWorkflow'
import type {
  EditorSceneDocument,
  LevelCollisionBudget,
  SharedLevelGroundSettings,
} from '../engine/sceneDocumentTypes'
import type { TerrainRuntimeComponentSource } from '../features/terrain'
import {
  clearHeightmapSourcePreviewNodeIds,
  setHeightmapSourcePreviewNodeIds,
} from './editorHeightmapSourcePreview'
import {
  type EditorTerrainStatusSnapshot,
  describeEditorTerrainPipeline,
} from './editorTerrainPipeline'
import type { EditorSceneNode } from './editorTypes'

type GroundSettings = NonNullable<SharedLevelGroundSettings['ground']>

type TerrainCollisionSettings = {
  source?: 'baked-heightmap' | 'source-glb' | 'scene-authored' | 'none'
  runtimeSource?: TerrainRuntimeComponentSource
  manifestUrl?: string
  heightmapUrl?: string
  heightmapResolution?: number
  sourceAssetUrl?: string
  sourceAssetUrls?: string[]
  sourceNodeId?: string
  sourceNodeIds?: string[]
  sourceName?: string
  sourceTriangleCount?: number
  sourceBounds?: {
    min: [number, number, number]
    max: [number, number, number]
  }
  colliderUrl?: string
  metadataUrl?: string
  colliderResolution?: number
  triangleCount?: number
  vertexCount?: number
  dirty?: boolean
  heightmapDirty?: boolean
  lastGeneratedAt?: string
  heightOverrideCount?: number
  chunksPath?: string
  chunkGrid?: number
  chunkCount?: number
  chunkLods?: number[]
  lastChunksGeneratedAt?: string
}

export let levelId = ''
export let editorScene: EditorSceneDocument | null = null
export let collisionOverlayEnabled = false
export let collisionBudget: LevelCollisionBudget = 'mobile'
export let groundSettings: GroundSettings | null = null
export let terrainSculptSettings: {
  enabled?: boolean
  autoBakeCollision?: boolean
} | null = null
export let terrainCollisionSettings: TerrainCollisionSettings | null = null
export let terrainStatus: EditorTerrainStatusSnapshot | null = null
export let terrainCollisionBakePending = false
export let terrainHeightmapGeneratePending = false
export let terrainChunkCookPending = false
export let selectedNode: EditorSceneNode | null = null
export let selectedNodes: EditorSceneNode[] = []
export let heightmapSourceNodes: EditorSceneNode[] = []
export let heightmapCandidateNodes: EditorSceneNode[] = []
export let selectedTerrainSourceName = ''
export let selectedTerrainSourceAssetUrl = ''

export let onSetCollisionOverlayEnabled: (value: boolean) => void = () => {}
export let onSetCollisionBudget: (value: LevelCollisionBudget) => void =
  () => {}
export let onSetTerrainAutoBake: (value: boolean) => void = () => {}
export let onAddSelectedTerrainSources: () => void = () => {}
export let onRemoveTerrainSource: (nodeId: string) => void = () => {}
export let onClearTerrainSources: () => void = () => {}
export let onBakeTerrainCollision: () => void = () => {}
export let onGenerateTerrainHeightmap: () => void = () => {}
export let onCookTerrainChunks: () => void = () => {}
export let onSelectCollisionReviewActor: (actorId: string) => void = () => {}
export let onSetCollisionReviewBlocker: (actorId: string) => void = () => {}
export let onSetCollisionReviewWalkable: (actorId: string) => void = () => {}
export let onSetCollisionReviewTrigger: (actorId: string) => void = () => {}
export let onSetCollisionReviewVisualOnly: (actorId: string) => void = () => {}
export let onDisableCollisionReviewActor: (actorId: string) => void = () => {}
export let onFitCollisionReviewCollider: (actorId: string) => void = () => {}
export let onBakeCollisionReviewMeshCollider: (actorId: string) => void =
  () => {}

type Vec3 = [number, number, number]
type Bounds = { min: Vec3; max: Vec3 }

const VISIBLE_REVIEW_FINDINGS = 5
const VISIBLE_REVIEW_ACTORS = 32

const collisionLegendItems: Array<{
  key: CollisionReviewActorRow['status']
  label: string
}> = [
  { key: 'walkable', label: 'walkable' },
  { key: 'blocker', label: 'blocker' },
  { key: 'trigger', label: 'trigger' },
  { key: 'detailMesh', label: 'detail mesh' },
  { key: 'collisionOnly', label: 'collision-only' },
  { key: 'disabled', label: 'disabled' },
  { key: 'visualOnly', label: 'visual-only' },
  { key: 'missingCollision', label: 'missing collision' },
]

function getHeightmapUrlFromManifestUrl(manifestUrl: string | undefined) {
  if (!manifestUrl) return ''
  const fileName = manifestUrl.split('/').pop() ?? ''
  const terrainId = fileName.replace(/\.manifest\.json$/, '')
  return terrainId ? `/terrain/heightmaps/${terrainId}_heightmap.png` : ''
}

function formatVec3(value: Vec3) {
  return value.map(component => component.toFixed(1)).join(', ')
}

function getPrimitiveTriangleEstimate(node: EditorSceneNode) {
  const geometry = node.primitive?.geometry
  if (geometry === 'box') return 12
  if (geometry === 'cylinder') return 96
  if (geometry === 'tetrahedron') return 4
  if (geometry === 'octahedron') return 8
  if (geometry === 'icosahedron') return 20
  if (geometry === 'dodecahedron') return 36
  if (geometry === 'torus') return 1152
  return 0
}

function getApproximateNodeSize(node: EditorSceneNode): Vec3 {
  const args = node.primitive?.args ?? []
  if (node.primitive?.geometry === 'box') {
    return [
      Math.abs(Number(args[0] ?? 1) * node.scale[0]),
      Math.abs(Number(args[1] ?? 1) * node.scale[1]),
      Math.abs(Number(args[2] ?? 1) * node.scale[2]),
    ]
  }
  if (node.primitive?.geometry === 'cylinder') {
    const radius = Math.abs(Number(args[0] ?? args[1] ?? 1))
    const height = Math.abs(Number(args[2] ?? 1))
    return [
      radius * 2 * Math.abs(node.scale[0]),
      height * Math.abs(node.scale[1]),
      radius * 2 * Math.abs(node.scale[2]),
    ]
  }
  return [
    Math.max(1, Math.abs(node.scale[0])),
    Math.max(1, Math.abs(node.scale[1])),
    Math.max(1, Math.abs(node.scale[2])),
  ]
}

function getApproximateSourceBounds(nodes: EditorSceneNode[]): Bounds | null {
  if (nodes.length === 0) return null
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const node of nodes) {
    const size = getApproximateNodeSize(node)
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], node.position[axis] - size[axis] / 2)
      max[axis] = Math.max(max[axis], node.position[axis] + size[axis] / 2)
    }
  }
  return { min, max }
}

function hasSameSourceIds(nodes: EditorSceneNode[]) {
  const sourceNodeIds = terrainCollisionSettings?.sourceNodeIds ?? []
  if (nodes.length !== sourceNodeIds.length) return false
  const sourceIdSet = new Set(sourceNodeIds)
  return nodes.every(node => sourceIdSet.has(node.id))
}

function getTriangleEstimate(nodes: EditorSceneNode[]) {
  if (
    hasSameSourceIds(nodes) &&
    terrainCollisionSettings?.sourceTriangleCount
  ) {
    return `${terrainCollisionSettings.sourceTriangleCount.toLocaleString()} last generated`
  }
  const primitiveTriangles = nodes.reduce(
    (sum, node) => sum + getPrimitiveTriangleEstimate(node),
    0,
  )
  const assetCount = nodes.filter(node => node.asset?.url || node.prefab).length
  if (assetCount > 0 && primitiveTriangles > 0) {
    return `${primitiveTriangles.toLocaleString()} primitive plus ${assetCount} asset source(s) counted during generation`
  }
  if (assetCount > 0) {
    return `${assetCount} asset source(s) counted during generation`
  }
  return `${primitiveTriangles.toLocaleString()} estimated`
}

function getSelectedHeightmapNodes() {
  const seen = new Set<string>()
  const nodes = heightmapCandidateNodes.length
    ? heightmapCandidateNodes
    : selectedNodes.length
      ? selectedNodes
      : selectedNode
        ? [selectedNode]
        : []
  return nodes.filter(node => {
    if (seen.has(node.id)) return false
    seen.add(node.id)
    return true
  })
}

function getHeightmapSelectionStatus(node: EditorSceneNode) {
  if (heightmapSourceNodes.some(source => source.id === node.id)) {
    if (node.asset?.url) return 'included asset'
    if (node.prefab) return 'included prefab'
    if (node.primitive) return 'included primitive'
    return 'included'
  }
  if (heightmapCandidateNodes.some(candidate => candidate.id === node.id)) {
    return 'candidate'
  }
  if (node.id === selectedNode?.id) return 'not bakeable'
  return 'not in basket'
}

function getHeightmapSourcePreviewIds() {
  return heightmapSourceNodes.map(node => node.id)
}

function selectReviewFinding(finding: CollisionReviewFinding) {
  if (!finding.actorId) return
  onSelectCollisionReviewActor(finding.actorId)
}

function selectReviewActor(actor: CollisionReviewActorRow) {
  onSelectCollisionReviewActor(actor.actorId)
}

function getActorFindingLabel(actor: CollisionReviewActorRow) {
  const parts = [
    actor.findingCounts.error ? `${actor.findingCounts.error} error` : '',
    actor.findingCounts.warning ? `${actor.findingCounts.warning} warning` : '',
    actor.findingCounts.info ? `${actor.findingCounts.info} info` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : 'clear'
}

function canBakeMeshCollider(actor: CollisionReviewActorRow) {
  return actor.actorKind === 'asset' || actor.actorKind === 'prefab'
}

$: levelCollisionWorkflow = getLevelCollisionWorkflow(
  levelId,
  editorScene?.settings,
)
$: terrainCollisionSource =
  terrainCollisionSettings?.source ??
  (levelCollisionWorkflow.terrainCollision === 'heightmap'
    ? 'baked-heightmap'
    : levelCollisionWorkflow.terrainCollision)
$: terrainSculptingAvailable =
  Boolean(terrainSculptSettings?.enabled) ||
  terrainCollisionSource === 'baked-heightmap' ||
  Boolean(terrainCollisionSettings?.manifestUrl)
$: terrainManifestUrl =
  terrainCollisionSettings?.manifestUrl ??
  groundSettings?.terrainManifestUrl ??
  levelCollisionWorkflow.terrainManifestUrl
$: heightmapPreviewUrl =
  terrainCollisionSettings?.heightmapUrl ??
  getHeightmapUrlFromManifestUrl(terrainManifestUrl)
$: heightmapLabel =
  terrainCollisionSettings?.heightmapUrl ||
  heightmapPreviewUrl ||
  'manifest heightmap'
$: heightmapSelectedNodes = getSelectedHeightmapNodes()
$: heightmapIncludedNodeCount = heightmapSourceNodes.length
$: heightmapExcludedSelectedNodes = heightmapCandidateNodes.filter(
  candidate => !heightmapSourceNodes.some(source => source.id === candidate.id),
)
$: sourceBounds =
  terrainCollisionSettings?.sourceBounds ??
  getApproximateSourceBounds(heightmapSourceNodes)
$: sourceBoundsLabel = sourceBounds
  ? `min [${formatVec3(sourceBounds.min)}], max [${formatVec3(sourceBounds.max)}]`
  : 'none'
$: sourceTriangleEstimate = getTriangleEstimate(heightmapSourceNodes)
$: heightmapSourcePreviewNodeIds = getHeightmapSourcePreviewIds()
$: setHeightmapSourcePreviewNodeIds(heightmapSourcePreviewNodeIds)
$: groundActorIds = groundSettings?.groundActorIds ?? []
$: groundContractWarnings = [
  !groundSettings ? 'Ground contract missing.' : '',
  groundSettings?.visualSource === 'scene-actors' && groundActorIds.length === 0
    ? 'Scene-actor ground needs groundActorIds.'
    : '',
  (groundSettings?.collisionSource === 'baked-heightfield' ||
    groundSettings?.collisionSource === 'source-linked-terrain-collision') &&
  !groundSettings?.terrainManifestUrl &&
  !terrainCollisionSettings?.manifestUrl
    ? 'Terrain ground collision needs a terrain manifest.'
    : '',
  groundSettings?.collisionSource === 'baked-heightfield' &&
  groundSettings?.visualSource === 'scene-actors' &&
  groundActorIds.length > 0 &&
  terrainCollisionSettings?.colliderUrl
    ? 'Scene ground actors are visual ground while baked terrain owns physics; keep large blocker collision off those actors.'
    : '',
  groundSettings?.collisionSource === 'baked-heightfield' &&
  !groundSettings?.requiredWalkableSurfaceId
    ? 'Baked-heightfield ground should name a required walkable surface.'
    : '',
].filter(Boolean)
$: collisionReview = reviewCollisionContracts({ scene: editorScene })
$: collisionReviewActors = collisionReview.actors
$: visibleCollisionReviewActors = collisionReviewActors.slice(
  0,
  VISIBLE_REVIEW_ACTORS,
)
$: extraCollisionReviewActors = Math.max(
  0,
  collisionReviewActors.length - visibleCollisionReviewActors.length,
)
$: collisionReviewFindings = collisionReview.findings.slice(0, 12)
$: visibleReviewFindings = collisionReviewFindings.slice(
  0,
  VISIBLE_REVIEW_FINDINGS,
)
$: hiddenReviewFindings = collisionReviewFindings.slice(VISIBLE_REVIEW_FINDINGS)
$: extraReviewFindings = Math.max(
  0,
  collisionReview.findings.length - collisionReviewFindings.length,
)
$: terrainChunksStale =
  Boolean(terrainCollisionSettings?.lastGeneratedAt) &&
  (!terrainCollisionSettings?.lastChunksGeneratedAt ||
    Date.parse(terrainCollisionSettings.lastChunksGeneratedAt) <
      Date.parse(terrainCollisionSettings.lastGeneratedAt ?? ''))
$: terrainRuntimeData =
  terrainCollisionSettings?.runtimeSource ??
  (terrainSculptingAvailable ? 'built-in-manifest' : 'scene-authored')
$: terrainPipeline = describeEditorTerrainPipeline({
  scene: editorScene,
  selectedTerrainSourceName,
  selectedTerrainSourceAssetUrl,
  terrainStatus,
})
$: terrainPipelineSteps = [
  {
    label: 'terrain authority',
    ready: terrainPipeline.publishStatus.state !== 'blocked',
    detail: terrainPipeline.authoritySummary,
  },
  {
    label: 'visual authority',
    ready: terrainPipeline.renderChunkStatus.state !== 'blocked',
    detail: terrainPipeline.renderChunkStatus.detail,
  },
  {
    label: 'collision authority',
    ready: terrainPipeline.collisionStatus.state === 'ready',
    detail: terrainPipeline.collisionStatus.detail,
  },
  {
    label: 'required action',
    ready: terrainPipeline.publishStatus.state === 'ready',
    detail: terrainPipeline.requiredAction,
  },
]
$: selectedCollisionIntent =
  selectedNode?.collision?.intent ??
  (selectedNode?.collision?.enabled ? 'blocker' : 'none')
$: selectedCollisionSummary = selectedNode
  ? `${selectedNode.name}: ${selectedCollisionIntent}`
  : 'Select a scene actor to author or verify collision.'
$: requiredCollisionActions = [
  !collisionOverlayEnabled
    ? 'Enable the collision overlay to verify results.'
    : '',
  collisionReview.summary.error + collisionReview.summary.warning > 0
    ? `${collisionReview.summary.error + collisionReview.summary.warning} blocker/warning item(s) need review.`
    : '',
  terrainCollisionSettings?.dirty
    ? 'Bake terrain collision before publish.'
    : '',
  !selectedNode
    ? 'Select an actor, then choose collision intent in details.'
    : '',
].filter(Boolean)

onDestroy(() => {
  clearHeightmapSourcePreviewNodeIds()
})
</script>

<div class="editor-section">
  <div class="label">Author Walkable Collision</div>
  <div class="editor-status-card">
    <div class="editor-status-title">{requiredCollisionActions[0] ?? 'Collision workflow ready'}</div>
    <div class="editor-chip-row">
      <span class:ready={collisionOverlayEnabled} class:warn={!collisionOverlayEnabled} class="editor-chip">scene overlay {collisionOverlayEnabled ? 'on' : 'off'}</span>
      <span class="editor-chip">authored collision only</span>
      <span class:warn={collisionReview.summary.error + collisionReview.summary.warning > 0} class:ready={collisionReview.summary.error + collisionReview.summary.warning === 0} class="editor-chip">
        {collisionReview.summary.error + collisionReview.summary.warning} blocker/warning item(s)
      </span>
    </div>
    <div class="save-message">Selected actor: {selectedCollisionSummary}</div>
    {#each requiredCollisionActions.slice(1, 4) as action}
      <div class="save-message">Next: {action}</div>
    {/each}
  </div>
</div>

<div class="editor-section">
  <div class="label">Collision View</div>
  <label class="checkbox"><input type="checkbox" checked={collisionOverlayEnabled} data-sfx-click="soft" on:change={(event) => onSetCollisionOverlayEnabled((event.currentTarget as HTMLInputElement).checked)} /> Scene Collision Overlay</label>
  <div class="collision-legend" aria-label="Collision overlay legend">
    {#each collisionLegendItems as item (item.key)}
      <span class={`collision-legend-item ${item.key}`}>
        <span></span>
        {item.label}
      </span>
    {/each}
  </div>
  <div class="collision-sublabel">Performance Budget</div>
  <div class="button-row compact-three-columns">
    <button class:active={collisionBudget === 'mobile'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionBudget('mobile')}>Mobile</button>
    <button class:active={collisionBudget === 'balanced'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionBudget('balanced')}>Balanced</button>
    <button class:active={collisionBudget === 'desktop'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionBudget('desktop')}>Desktop</button>
  </div>
  <div class="save-message">Scene overlay uses authored runtime collision. Terrain heightmap overlay: {terrainCollisionSource === 'baked-heightmap' ? 'heightmap workflow' : 'inactive'}; runtime: {terrainRuntimeData}{terrainCollisionSettings?.dirty ? ' - bake needed' : ''}</div>
</div>

<div class="editor-section">
  <div class="label">Collision Review</div>
  <div class="collision-review-summary">
    <span class:error={collisionReview.summary.error > 0}>Errors {collisionReview.summary.error}</span>
    <span class:warning={collisionReview.summary.warning > 0}>Warnings {collisionReview.summary.warning}</span>
    <span>Info {collisionReview.summary.info}</span>
  </div>
  <div class="collision-review-table" aria-label="Collision review actors">
    <div class="collision-review-table-header">
      <span>Actor</span>
      <span>Status</span>
      <span>Runtime</span>
      <span>Actions</span>
    </div>
    {#if visibleCollisionReviewActors.length}
      {#each visibleCollisionReviewActors as actor (actor.actorId)}
        <div class:selected={selectedNode?.id === actor.actorId} class={`collision-review-actor-row ${actor.status}`}>
          <button
            class="collision-review-actor-name"
            data-sfx-hover="hover-soft"
            data-sfx-click="select"
            title={actor.detail}
            on:click={() => selectReviewActor(actor)}
          >
            <span>{actor.actorName}</span>
            <span>{actor.actorId}</span>
          </button>
          <span class={`collision-review-status ${actor.status}`}>{actor.statusLabel}</span>
          <span class="collision-review-runtime">
            {actor.runtimeCollision ? actor.collisionIntent : 'none'}
            <small>{actor.collisionSource}; {getActorFindingLabel(actor)}</small>
          </span>
          <span class="collision-review-actions">
            <button title="Set blocker collision" data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionReviewBlocker(actor.actorId)}>Blocker</button>
            <button title="Set walkable collision" data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionReviewWalkable(actor.actorId)}>Walkable</button>
            <button title="Set trigger collision" data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionReviewTrigger(actor.actorId)}>Trigger</button>
            <button title="Mark visual-only" data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={() => onSetCollisionReviewVisualOnly(actor.actorId)}>Visual</button>
            <button title="Disable collision without visual-only classification" data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={() => onDisableCollisionReviewActor(actor.actorId)}>Disable</button>
            <button title="Fit collider to visual bounds" data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={() => onFitCollisionReviewCollider(actor.actorId)}>Fit</button>
            <button disabled={!canBakeMeshCollider(actor)} title={canBakeMeshCollider(actor) ? 'Bake mesh collider' : 'Mesh collider bake needs an asset or prefab actor'} data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={() => onBakeCollisionReviewMeshCollider(actor.actorId)}>Bake</button>
          </span>
        </div>
      {/each}
    {:else}
      <div class="save-message">No actors to review.</div>
    {/if}
  </div>
  {#if extraCollisionReviewActors > 0}
    <div class="save-message">{extraCollisionReviewActors} additional actor(s) in scene.</div>
  {/if}
  <div class="collision-sublabel">Findings</div>
  <div class="collision-review-list">
    {#if visibleReviewFindings.length}
      {#each visibleReviewFindings as finding (finding.id)}
        <button
          class="collision-review-row"
          class:selectable={Boolean(finding.actorId)}
          disabled={!finding.actorId}
          data-sfx-hover="hover-soft"
          data-sfx-click="select"
          on:click={() => selectReviewFinding(finding)}
        >
          <span class={`collision-review-severity ${finding.severity}`}>{finding.severity}</span>
          <span class="collision-review-message">{finding.message}</span>
        </button>
      {/each}
    {:else}
      <div class="save-message">No collision review findings.</div>
    {/if}
  </div>
  {#if hiddenReviewFindings.length || extraReviewFindings > 0}
    <details class="editor-disclosure">
      <summary>{hiddenReviewFindings.length + extraReviewFindings} more finding(s)</summary>
      <div class="collision-review-list editor-mt-sm">
        {#each hiddenReviewFindings as finding (finding.id)}
          <button
            class="collision-review-row"
            class:selectable={Boolean(finding.actorId)}
            disabled={!finding.actorId}
            data-sfx-hover="hover-soft"
            data-sfx-click="select"
            on:click={() => selectReviewFinding(finding)}
          >
            <span class={`collision-review-severity ${finding.severity}`}>{finding.severity}</span>
            <span class="collision-review-message">{finding.message}</span>
          </button>
        {/each}
        {#if extraReviewFindings > 0}
          <div class="save-message">{extraReviewFindings} additional finding(s) in audit output.</div>
        {/if}
      </div>
    </details>
  {/if}
</div>

<div class="editor-section">
  <div class="label">Ground Contract</div>
  <div class="editor-chip-row">
    <span class="editor-chip">{terrainPipeline.modeLabel}</span>
    <span class:ready={terrainPipeline.publishStatus.state === 'ready'} class:warn={terrainPipeline.publishStatus.state === 'warning'} class:danger={terrainPipeline.publishStatus.state === 'blocked'} class="editor-chip">publish {terrainPipeline.publishStatus.state}</span>
  </div>
  <div class="save-message">Authoritative visual source: {terrainPipeline.authoritativeVisualSource}</div>
  {#if groundContractWarnings.length}
    {#each groundContractWarnings as warning}
      <div class="save-message warning">{warning}</div>
    {/each}
  {:else}
    <div class="save-message">Mode: {groundSettings?.mode ?? 'unconfigured'} - no contract warnings.</div>
  {/if}
  <details class="editor-disclosure">
    <summary>Configuration details</summary>
    <div class="save-message">Mode: {groundSettings?.mode ?? 'unconfigured'}</div>
    <div class="save-message">Visual source: {groundSettings?.visualSource ?? 'unconfigured'}</div>
    <div class="save-message">Collision source: {groundSettings?.collisionSource ?? 'unconfigured'}</div>
    <div class="save-message">Required surface: {groundSettings?.requiredWalkableSurfaceId ?? 'none'}</div>
    <div class="save-message">Terrain manifest: {terrainManifestUrl ?? 'none'}</div>
    <div class="save-message">Ground actors: {groundActorIds.length ? groundActorIds.join(', ') : 'none'}</div>
  </details>
</div>

<div class="editor-section">
  <div class="label">Terrain Pipeline</div>
  <div class="editor-chip-row" aria-label="Terrain product contract">
    <span class="editor-chip">{terrainPipeline.modeLabel}</span>
    <span class:ready={terrainPipeline.renderChunkStatus.state === 'ready'} class:warn={terrainPipeline.renderChunkStatus.state === 'warning' || terrainPipeline.renderChunkStatus.state === 'inactive'} class:danger={terrainPipeline.renderChunkStatus.state === 'blocked'} class="editor-chip">render {terrainPipeline.renderChunkStatus.state}</span>
    <span class:ready={terrainPipeline.collisionStatus.state === 'ready'} class:warn={terrainPipeline.collisionStatus.state === 'warning' || terrainPipeline.collisionStatus.state === 'inactive'} class:danger={terrainPipeline.collisionStatus.state === 'blocked'} class="editor-chip">collision {terrainPipeline.collisionStatus.state}</span>
  </div>
  <div class="save-message">Source GLB/GLTF: {terrainPipeline.sourceGlbUrls[0] ?? 'none recorded'}</div>
  <div class="save-message">Source provenance: {terrainPipeline.sourceHash || terrainPipeline.sourceProvenance}</div>
  <div class="save-message">Fallback surface: {terrainPipeline.fallbackSurfaceStatus.detail}</div>
  <div class="heightmap-pipeline-list" aria-label="Terrain pipeline state">
    {#each terrainPipelineSteps as step (step.label)}
      <div class:ready={step.ready} class:blocked={!step.ready} class="heightmap-pipeline-row">
        <span>{step.label}</span>
        <span>{step.ready ? 'ready' : 'needs work'} - {step.detail}</span>
      </div>
    {/each}
  </div>
  {#if terrainChunksStale}
    <div class="save-message warning">Visual chunks are older than the heightmap or collision bake; cook chunks before publishing.</div>
  {/if}
  {#if terrainPipeline.mode === 'heightfield-terrain'}
  <button class="full" disabled={terrainHeightmapGeneratePending || !terrainPipeline.commands.find(command => command.id === 'generate-heightmap')?.enabled} title={terrainPipeline.commands.find(command => command.id === 'generate-heightmap')?.reason} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onGenerateTerrainHeightmap}>
    {terrainHeightmapGeneratePending ? 'Generating Heightmap...' : 'Generate Heightmap'}
  </button>
  <button class="full" disabled={terrainCollisionBakePending || !terrainPipeline.commands.find(command => command.id === 'bake-terrain-collision')?.enabled} title={terrainPipeline.commands.find(command => command.id === 'bake-terrain-collision')?.reason} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onBakeTerrainCollision}>
    {terrainCollisionBakePending ? 'Baking Collision...' : 'Bake Terrain Collision'}
  </button>
  <button class="full" disabled={terrainChunkCookPending || !terrainPipeline.commands.find(command => command.id === 'cook-heightfield-chunks')?.enabled} title={terrainPipeline.commands.find(command => command.id === 'cook-heightfield-chunks')?.reason} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onCookTerrainChunks}>
    {terrainChunkCookPending ? 'Cooking Heightfield Chunks...' : 'Cook Heightfield Chunks'}
  </button>
  {:else if terrainPipeline.mode === 'glb-chunk-terrain'}
  <button class="full" disabled={terrainChunkCookPending || !terrainPipeline.commands.find(command => command.id === 'cook-glb-chunks')?.enabled} title={terrainPipeline.commands.find(command => command.id === 'cook-glb-chunks')?.reason} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onCookTerrainChunks}>
    {terrainChunkCookPending ? 'Cooking GLB Chunks...' : 'Cook GLB Chunks'}
  </button>
  <button class="full" disabled={terrainCollisionBakePending || !terrainPipeline.commands.find(command => command.id === 'bake-terrain-collision')?.enabled} title={terrainPipeline.commands.find(command => command.id === 'bake-terrain-collision')?.reason} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onBakeTerrainCollision}>
    {terrainCollisionBakePending ? 'Baking Source-Linked Collision...' : 'Bake Source-Linked Collision'}
  </button>
  {/if}
  {#each terrainPipeline.blockers as blocker}
    <div class="save-message error-message">{blocker}</div>
  {/each}
  {#if terrainPipeline.mode === 'heightfield-terrain'}
    <div class="button-row compact-two-columns editor-mt-sm">
      <button disabled={heightmapCandidateNodes.length === 0} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={onAddSelectedTerrainSources}>Add Selection ({heightmapCandidateNodes.length})</button>
      <button disabled={heightmapSourceNodes.length === 0} data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={onClearTerrainSources}>Clear Basket ({heightmapIncludedNodeCount})</button>
    </div>
    <div class="save-message">
      Source: {selectedTerrainSourceName || terrainCollisionSettings?.sourceName || 'select terrain source objects'}
    </div>

    <details class="editor-disclosure">
    <summary>Source basket ({heightmapIncludedNodeCount} included, {heightmapExcludedSelectedNodes.length} excluded)</summary>
    <div class="heightmap-selection-list editor-mt-sm">
      <div class="heightmap-selection-header">
        <span>Included sources</span>
        <span>{heightmapIncludedNodeCount} included</span>
      </div>
      {#if heightmapSourceNodes.length}
        {#each heightmapSourceNodes as node (node.id)}
          <div class="heightmap-selection-row included">
            <span class="heightmap-selection-name">{node.name}</span>
            <span class="heightmap-selection-meta">{node.kind} - {getHeightmapSelectionStatus(node)}</span>
            <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={() => onRemoveTerrainSource(node.id)}>Remove</button>
          </div>
        {/each}
      {:else}
        <div class="heightmap-selection-empty">Add selected bakeable nodes to define the heightmap sources.</div>
      {/if}
      <div class="save-message">Source bounds: {sourceBoundsLabel}</div>
      <div class="save-message">Triangle estimate: {sourceTriangleEstimate}</div>
      <div class="save-message">Viewport outline: {heightmapSourceNodes.length ? 'included basket while utility open' : 'none'}</div>
    </div>
    <div class="heightmap-selection-list editor-mt-sm">
      <div class="heightmap-selection-header">
        <span>Selected candidates</span>
        <span>{heightmapExcludedSelectedNodes.length} excluded</span>
      </div>
      {#if heightmapSelectedNodes.length}
        {#each heightmapSelectedNodes as node (node.id)}
          <div class:included={heightmapSourceNodes.some(source => source.id === node.id)} class="heightmap-selection-row">
            <span class="heightmap-selection-name">{node.name}</span>
            <span class="heightmap-selection-meta">{node.kind} - {getHeightmapSelectionStatus(node)}</span>
          </div>
        {/each}
      {:else}
        <div class="heightmap-selection-empty">Select a mesh, primitive, prefab, or group to review terrain source candidates.</div>
      {/if}
    </div>
    </details>
  {/if}

  {#if terrainPipeline.mode === 'heightfield-terrain'}
  <details class="editor-disclosure">
    <summary>Bake artifacts &amp; preview</summary>
    <div class="heightmap-preview-window editor-mt-sm">
      {#if heightmapPreviewUrl}
        <img src={heightmapPreviewUrl} alt={`${levelId} heightmap preview`} />
      {:else}
        <div class="heightmap-empty">No heightmap</div>
      {/if}
    </div>
    <label class="checkbox"><input type="checkbox" checked={terrainSculptSettings?.autoBakeCollision ?? false} data-sfx-click="soft" on:change={(event) => onSetTerrainAutoBake((event.currentTarget as HTMLInputElement).checked)} /> Auto Bake Collision</label>
    <div class="save-message">
      Auto-bake runs after sculpt height edits and writes baked terrain artifacts. Source basket changes still require Generate Heightmap.
    </div>
    {#if heightmapPreviewUrl || terrainManifestUrl}
      <div class="save-message">
        Heightmap: {heightmapLabel} {terrainCollisionSettings?.heightmapResolution ? `(${terrainCollisionSettings.heightmapResolution})` : ''}; manifest: {terrainManifestUrl ?? 'none'}
      </div>
    {/if}
    {#if terrainCollisionSettings?.colliderUrl}
      <div class="save-message">Collider {terrainCollisionSettings.colliderResolution ?? 0}, {terrainCollisionSettings.triangleCount ?? 0} triangles, {terrainCollisionSettings.heightOverrideCount ?? 0} height edits</div>
    {:else}
      <div class="save-message">No baked terrain collision artifact recorded for this scene.</div>
    {/if}
    {#if terrainCollisionSettings?.chunksPath}
      <div class="save-message">Chunks: {terrainCollisionSettings.chunkCount ?? 0} files at {terrainCollisionSettings.chunksPath}</div>
    {/if}
    {#if terrainCollisionSettings?.sourceTriangleCount}
      <div class="save-message">Source mesh triangles: {terrainCollisionSettings.sourceTriangleCount}</div>
    {/if}
  </details>
  {/if}
</div>

<style>
  .collision-sublabel {
    margin-top: 0.5rem;
    margin-bottom: 0.22rem;
    font-size: 0.62rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #7fa8c4;
  }

  .collision-legend {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.3rem;
    margin: 0.45rem 0 0.55rem;
  }

  .collision-legend-item {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 0.35rem;
    color: rgba(226, 244, 255, 0.72);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .collision-legend-item span {
    width: 0.55rem;
    height: 0.55rem;
    flex: 0 0 auto;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.32);
    background: rgba(143, 150, 163, 0.72);
  }

  .collision-legend-item.walkable span,
  .collision-review-status.walkable {
    color: #55e68a;
  }

  .collision-legend-item.walkable span {
    background: #55e68a;
  }

  .collision-legend-item.blocker span,
  .collision-review-status.blocker {
    color: #ff8c63;
  }

  .collision-legend-item.blocker span {
    background: #ff8c63;
  }

  .collision-legend-item.trigger span,
  .collision-review-status.trigger {
    color: #63b3ff;
  }

  .collision-legend-item.trigger span {
    background: #63b3ff;
  }

  .collision-legend-item.detailMesh span,
  .collision-review-status.detailMesh {
    color: #d6a3ff;
  }

  .collision-legend-item.detailMesh span {
    background: #d6a3ff;
  }

  .collision-legend-item.collisionOnly span,
  .collision-review-status.collisionOnly {
    color: #ffd27a;
  }

  .collision-legend-item.collisionOnly span {
    background: #ffd27a;
  }

  .collision-legend-item.visualOnly span,
  .collision-review-status.visualOnly {
    color: #90a4c8;
  }

  .collision-legend-item.visualOnly span {
    background: #90a4c8;
  }

  .collision-legend-item.missingCollision span,
  .collision-review-status.missingCollision {
    color: #ff5c70;
  }

  .collision-legend-item.missingCollision span {
    background: #ff5c70;
  }

  .collision-legend-item.disabled span,
  .collision-review-status.disabled {
    color: #8f96a3;
  }

  .editor-disclosure {
    margin-top: 0.55rem;
    border: 1px solid rgba(126, 203, 255, 0.14);
    border-radius: 0.4rem;
    background: rgba(5, 9, 20, 0.32);
  }

  .editor-disclosure > summary {
    cursor: pointer;
    padding: 0.4rem 0.55rem;
    color: rgba(226, 244, 255, 0.78);
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    list-style: none;
  }

  .editor-disclosure > summary::-webkit-details-marker {
    display: none;
  }

  .editor-disclosure > summary::before {
    content: '▸';
    display: inline-block;
    margin-right: 0.4rem;
    color: rgba(126, 203, 255, 0.7);
    transition: transform 120ms ease;
  }

  .editor-disclosure[open] > summary::before {
    transform: rotate(90deg);
  }

  .editor-disclosure[open] > summary {
    border-bottom: 1px solid rgba(126, 203, 255, 0.12);
  }

  .editor-disclosure > :global(*:not(summary)) {
    margin-left: 0.55rem;
    margin-right: 0.55rem;
  }

  .editor-disclosure > :global(*:last-child) {
    margin-bottom: 0.55rem;
  }

  .save-message.warning {
    color: #ffd27a;
  }

  .heightmap-preview-window {
    width: 100%;
    max-height: 160px;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 1px solid rgba(126, 203, 255, 0.28);
    background: #050914;
    border-radius: 0.45rem;
    margin-bottom: 0.55rem;
  }

  .heightmap-preview-window img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .heightmap-empty {
    color: rgba(226, 244, 255, 0.62);
    font-size: 0.78rem;
  }

  .heightmap-selection-list {
    display: grid;
    gap: 0.35rem;
    margin-bottom: 0.55rem;
  }

  .heightmap-pipeline-list {
    display: grid;
    gap: 0.3rem;
    margin-bottom: 0.55rem;
  }

  .heightmap-pipeline-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    border: 1px solid rgba(126, 203, 255, 0.16);
    border-radius: 0.35rem;
    padding: 0.3rem 0.45rem;
    background: rgba(5, 9, 20, 0.42);
    color: rgba(226, 244, 255, 0.68);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .heightmap-pipeline-row.ready {
    border-color: rgba(104, 255, 194, 0.28);
    color: rgba(226, 244, 255, 0.86);
  }

  .heightmap-pipeline-row.blocked {
    border-color: rgba(255, 199, 104, 0.28);
  }

  .heightmap-selection-header,
  .heightmap-selection-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .heightmap-selection-header {
    color: rgba(226, 244, 255, 0.72);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .heightmap-selection-row {
    min-width: 0;
    border: 1px solid rgba(126, 203, 255, 0.16);
    border-radius: 0.35rem;
    padding: 0.38rem 0.45rem;
    background: rgba(5, 9, 20, 0.48);
  }

  .heightmap-selection-row button {
    flex: 0 0 auto;
  }

  .heightmap-selection-row.included {
    border-color: rgba(126, 203, 255, 0.52);
    background: rgba(126, 203, 255, 0.12);
  }

  .heightmap-selection-name,
  .heightmap-selection-meta {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .heightmap-selection-name {
    min-width: 0;
    color: rgba(226, 244, 255, 0.92);
    font-size: 0.78rem;
  }

  .heightmap-selection-meta,
  .heightmap-selection-empty {
    flex: 0 0 auto;
    color: rgba(226, 244, 255, 0.58);
    font-size: 0.7rem;
  }

  .heightmap-selection-empty {
    border: 1px dashed rgba(126, 203, 255, 0.2);
    border-radius: 0.35rem;
    padding: 0.5rem;
  }

  .collision-review-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.35rem;
    margin-bottom: 0.55rem;
    color: rgba(226, 244, 255, 0.7);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .collision-review-table {
    display: grid;
    gap: 0.35rem;
    margin-bottom: 0.65rem;
  }

  .collision-review-table-header,
  .collision-review-actor-row {
    display: grid;
    grid-template-columns: minmax(7rem, 1.25fr) minmax(5rem, 0.7fr) minmax(5rem, 0.75fr) minmax(10rem, 1.35fr);
    gap: 0.45rem;
    align-items: center;
  }

  .collision-review-table-header {
    color: rgba(226, 244, 255, 0.56);
    font-size: 0.62rem;
    text-transform: uppercase;
  }

  .collision-review-actor-row {
    border: 1px solid rgba(126, 203, 255, 0.16);
    border-radius: 0.35rem;
    padding: 0.38rem;
    background: rgba(5, 9, 20, 0.48);
  }

  .collision-review-actor-row.selected {
    border-color: rgba(126, 203, 255, 0.68);
    background: rgba(126, 203, 255, 0.12);
  }

  .collision-review-actor-row.missingCollision {
    border-color: rgba(255, 92, 112, 0.42);
  }

  .collision-review-actor-name {
    display: grid;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: rgba(226, 244, 255, 0.9);
    text-align: left;
  }

  .collision-review-actor-name span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .collision-review-actor-name span + span,
  .collision-review-runtime small {
    color: rgba(226, 244, 255, 0.52);
    font-size: 0.62rem;
  }

  .collision-review-status {
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .collision-review-runtime {
    display: grid;
    min-width: 0;
    color: rgba(226, 244, 255, 0.74);
    font-size: 0.68rem;
  }

  .collision-review-runtime small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .collision-review-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .collision-review-actions button {
    min-height: 1.45rem;
    padding: 0.16rem 0.32rem;
    font-size: 0.58rem;
  }

  .collision-review-summary .error {
    color: #ff8c8c;
  }

  .collision-review-summary .warning {
    color: #ffd27a;
  }

  .collision-review-list {
    display: grid;
    gap: 0.35rem;
  }

  .collision-review-row {
    display: grid;
    grid-template-columns: 4.5rem minmax(0, 1fr);
    gap: 0.45rem;
    width: 100%;
    border: 1px solid rgba(126, 203, 255, 0.16);
    border-radius: 0.35rem;
    padding: 0.42rem 0.45rem;
    background: rgba(5, 9, 20, 0.48);
    color: inherit;
    text-align: left;
  }

  .collision-review-row.selectable {
    cursor: pointer;
  }

  .collision-review-row:disabled {
    cursor: default;
    opacity: 1;
  }

  .collision-review-severity {
    font-size: 0.64rem;
    line-height: 1rem;
    text-transform: uppercase;
  }

  .collision-review-severity.error {
    color: #ff8c8c;
  }

  .collision-review-severity.warning {
    color: #ffd27a;
  }

  .collision-review-severity.info {
    color: rgba(126, 203, 255, 0.86);
  }

  .collision-review-message {
    min-width: 0;
    color: rgba(226, 244, 255, 0.84);
    font-size: 0.72rem;
    line-height: 1.15rem;
  }
</style>
