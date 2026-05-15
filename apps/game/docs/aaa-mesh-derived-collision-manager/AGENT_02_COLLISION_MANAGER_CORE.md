# Agent 02: Collision Manager Core

## Goal

Create the service/store that owns live collision generation in the editor and
playtest path. This manager replaces manual collider preservation, manual
collider fitting, and stale bake state.

## Ownership

Primary write scope:

- new `src/threlte/collision/CollisionManager*` files
- new manager tests under `scripts/`
- narrow adapter helpers needed by the manager

Coordinate before editing:

- Rapier components with Agent 03
- editor UI with Agent 04
- publish bake APIs with Agent 05
- old collision lifecycle files with Agent 06

## Manager Responsibilities

The manager owns:

- actor registration
- mesh source resolution
- policy normalization
- dirty tracking
- generation queue
- generated product cache
- live collider product state
- errors and warnings
- publish bake requests

It must watch these inputs:

- actor id
- render source kind and URL
- primitive geometry and args
- prefab asset URL
- terrain/chunk mesh URL
- position, rotation, scale
- collision policy
- source asset fingerprint
- generator version

## Dirty Rules

```txt
position changed -> update live collider transform
rotation changed -> update live collider transform
scale changed -> update live collider scale or regenerate local product
primitive args changed -> regenerate
mesh URL changed -> regenerate
prefab variant changed -> regenerate
policy changed -> regenerate or remove
source fingerprint changed -> regenerate
mode none -> remove live collider and generated product from active set
```

The first implementation may regenerate on any transform change if that is
simpler, but it must have one public manager boundary so optimization can happen
inside the manager later.

## Generation Strategy

The manager should support policy-driven generation:

- `primitive`: use primitive geometry or mesh bounds for a simple collider.
- `convexHull`: generate a convex hull from mesh vertices.
- `simplifiedMesh`: use LOD/retopology/simplification tools to create a lower
  triangle collision mesh.
- `trimesh`: use source mesh triangles, within explicit budget.

Default recommendation:

- primitives: `primitive`
- gameplay blockers: `simplifiedMesh`
- terrain/walkable large surfaces: `simplifiedMesh` or source-linked terrain
- detail meshes: `none` unless explicitly enabled

## Cache Keys

Cache keys must include:

```txt
actor id
source mesh URL or primitive descriptor
source fingerprint
policy fingerprint
scale fingerprint when local geometry is baked at scale
generator version
```

Position and rotation should not invalidate a local mesh artifact unless the
generator bakes world-space transforms. Prefer local generated products plus
actor transforms.

## API Sketch

```ts
type CollisionManager = {
  registerActor(actor: CollisionManagedActor): void
  unregisterActor(actorId: string): void
  updateActor(actor: CollisionManagedActor): void
  setPolicy(actorId: string, policy: CollisionPolicy): void
  getState(actorId: string): CollisionActorState | null
  getAllStates(): CollisionActorState[]
  requestRegenerate(actorId: string, reason: string): Promise<void>
  requestRegenerateAll(reason: string): Promise<void>
  getPublishProducts(): GeneratedCollisionProduct[]
}
```

Use local naming conventions, but keep this boundary explicit.

## Acceptance Criteria

- One manager boundary owns all generated collision products.
- Changing mesh URL invalidates the old product.
- Changing scale updates/regenerates collision in the manager, not in the scene
  node.
- `mode: none` removes live collision.
- Manager diagnostics expose stale, generating, ready, failed, disabled.
- No old collision lifecycle helper is needed for mesh replacement.

## Tests

Add manager tests for:

- mesh URL change -> new generation key
- scale change -> dirty/update state
- mode none -> no live/publish product
- primitive args change -> regenerated product
- same actor unchanged -> no needless regeneration
- source fingerprint change -> stale product rejected
