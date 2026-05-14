# Agent 03: Runtime Render And Collision Adapter

## Goal

Make runtime visual mounting, runtime collider construction, and collision debug
helpers consume the same asset-local alignment contract.

## Primary Ownership

- `RuntimeActorNode.svelte`
- `RuntimeActorRenderContent.svelte`
- `HeroProp.svelte` only if needed for passing explicit metadata
- `CollisionBody.svelte`
- `AssetTrimeshCollider.svelte`
- `assetTrimeshColliderGeometry.ts`
- collision helper/overlay components that load collider GLBs

## Current Problem

`RuntimeActorNode.svelte` correctly applies the actor transform once, but visual
and collision are mounted as separate children. The visual child loads through
`HeroProp`; the collision child converts collider GLB vertices directly into a
Rapier trimesh. There is no common adapter that says "this cooked collider should
be aligned to this cooked visual in asset-local space."

## Required Work

1. Thread the Agent 01 metadata from actor collision data or collider metadata to
   the runtime collider path.
2. Apply asset-local alignment exactly once.
3. Ensure debug helpers and visible collision overlays use the same transform as
   the actual Rapier collider.
4. Keep actor world transform ownership in `RuntimeActorNode.svelte`.
5. Keep collider-local math in a collision or asset adapter helper, not in random
   UI components.
6. Add clear diagnostics when metadata is missing, malformed, or non-finite.
7. Preserve legacy behavior for assets without metadata while allowing validation
   to flag them.

## Guardrails

- Do not add a Yggdrasil branch.
- Do not apply actor position/rotation/scale inside collider vertex baking at
  runtime.
- Do not apply the same asset-local transform to both the parent group and the
  vertices.
- Do not make `HeroProp` responsible for physics policy.

## Acceptance Criteria

- Render and collision can be aligned through shared metadata.
- Collision debug overlay matches actual runtime Rapier collider placement.
- Legacy colliders still mount.
- A malformed metadata file produces a useful diagnostic instead of silent drift.

## Suggested Verification

```bash
pnpm --dir apps/game type-check
```

If there are focused collision geometry tests, add coverage for identity and
non-identity asset-local transforms.

## Handoff Notes

Report:

- where the transform is applied
- how double application is prevented
- how legacy missing metadata behaves
- whether collision overlays were updated
