# Agent 01: Contract And Types

## Goal

Replace the old scene-authored collider geometry contract with a
mesh-derived collision policy contract.

## Ownership

Primary write scope:

- `apps/game/src/threlte/engine/types.ts`
- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/src/threlte/editor/editorTypes.ts`
- runtime scene manifest schema/type files
- focused tests for type/schema validation

Coordinate before editing:

- `editorCollisionDefaults.ts`
- `collisionPolicy.ts`
- runtime manifest builders
- scene JSON files

## New Source Contract

Scene nodes store policy, not generated geometry:

```ts
type CollisionPolicyMode = 'auto' | 'none' | 'trigger'
type CollisionGenerationQuality =
  | 'primitive'
  | 'convexHull'
  | 'simplifiedMesh'
  | 'trimesh'

type EditorNodeCollisionPolicy = {
  mode: CollisionPolicyMode
  intent?: 'walkable' | 'blocker' | 'trigger' | 'detailMesh'
  channel?: 'worldStatic' | 'worldDynamic' | 'trigger' | 'detail'
  quality?: CollisionGenerationQuality
  lodTier?: 'source' | 'high' | 'medium' | 'low'
  maxTriangles?: number
  walkableSlopeLimitDeg?: number
  friction?: number
  restitution?: number
  sensor?: boolean
}
```

Names may change to match local conventions, but the ownership boundary must not
change:

- policy is authored
- generated geometry is a product
- generated geometry is not scene-node source truth

## Runtime Generated Contract

Define a generated collision product shape:

```ts
type GeneratedCollisionProduct = {
  actorId: string
  sourceMeshUrl?: string
  sourceMeshFingerprint: string
  transformFingerprint: string
  policyFingerprint: string
  shape: 'cuboid' | 'ball' | 'capsule' | 'convexHull' | 'trimesh'
  artifactUrl?: string
  localBounds: {
    min: [number, number, number]
    max: [number, number, number]
    size: [number, number, number]
    center: [number, number, number]
  }
  triangleCount?: number
  generatedAt: string
  generatorVersion: string
}
```

The exact shape can be refined by implementation, but it must support:

- stale detection
- publish validation
- live editor diagnostics
- runtime artifact loading

## Required Removals From Source Truth

These old fields must not remain part of the canonical source contract:

- `collision.size`
- `collision.colliderUrl`
- `collision.colliderMetadataUrl`
- `collision.colliderCacheKey`
- `collision.sourceAssetUrl`
- `collision.sourceAssetFingerprint`
- `collision.assetLocalTransform`
- `generation.originalCollision`
- editor proxy collision metadata
- manual primitive collider preservation fields

If any field must temporarily exist during migration, Agent 06 owns deletion and
must document the exact removal gate.

## Acceptance Criteria

- Types compile with no broad `any` escape hatches.
- New policy fields are the only authored collision source for geometry nodes.
- Runtime generated collision product type exists and is used by at least one
  manager-facing boundary.
- Old source-truth fields are removed from canonical contracts or marked as
  rejected legacy input.
- Scene validation rejects old independent collider geometry in active source
  scenes.

## Tests

Add or update tests that assert:

- `mode: auto` is valid for renderable geometry.
- `mode: none` is valid and explicit.
- missing policy defaults to `auto` only through the agreed normalization path.
- old collider geometry fields are rejected in source documents.
- generated product stale checks can compare source/policy/transform
  fingerprints.
