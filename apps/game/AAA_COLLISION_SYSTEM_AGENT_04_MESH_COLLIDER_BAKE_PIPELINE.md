# AAA Collision System Agent 04 - Mesh Collider Bake Pipeline

## Goal

Create a maintainable pipeline for converting selected visual meshes into
authored collider assets. The engine should not require users to manually type
collider URLs or rely on render meshes as runtime colliders.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/AAA_COLLISION_SYSTEM_AGENT_COORDINATION.md`
- `apps/game/src/threlte/engine/collisionAuthoring.ts`
- `apps/game/src/threlte/collision/AssetTrimeshCollider.svelte`
- `apps/game/scripts/editor-tools/**`
- `apps/game/scripts/cook-runtime-assets.mjs`
- `apps/game/scripts/bake-terrain-collision.mjs`
- `apps/megameal/public/generated/runtime-game-assets/**`

## Primary Ownership

- Collider asset bake scripts/routes
- Collider metadata format
- Generated collider asset placement
- Validation for generated collider artifacts

Avoid changing inspector UX beyond a narrow integration hook. Agent 03 owns the
visible editor controls.

## Current Problem

Trimesh collision for assets expects an authored `collision.colliderUrl`, but
there is no complete editor-facing path that takes a selected mesh, bakes a
collision asset, stores it under the runtime collision directory, writes
metadata, and updates the selected node.

## Work Steps

1. Define the collider artifact contract:
   - source actor id
   - source asset URL
   - generated collider URL
   - generated metadata URL
   - triangle count
   - bounds
   - simplification policy
   - generated timestamp
2. Keep collider assets under the approved runtime collision path:
   - `/generated/runtime-game-assets/collision/.../*.collider.glb`
3. Add or extend an editor tool route/script that can bake a selected asset into
   a collider asset.
4. Do not bake from arbitrary live render state if a deterministic source asset
   is available.
5. Add simplification or budget enforcement before producing a collider:
   - reject oversized collision meshes
   - require explicit `detailMesh` intent for high-triangle colliders
   - prefer simple proxy shapes for blockers/walkables
6. Update node collision data after bake:
   - `shape: "trimesh"`
   - `colliderUrl`
   - `triangleBudget`
   - explicit `intent`
   - explicit `channel`
7. Add generated drift/audit coverage so missing collider artifacts fail loudly.
8. Document how Agent 03 should call this pipeline from the editor.

## Guardrails

- Do not use visible render GLBs as collider assets by default.
- Do not store generated colliders outside the approved runtime collision path.
- Do not allow unbounded triangle counts.
- Do not require a server in the shipped static player runtime.
- Do not make collider generation level-specific.

## Acceptance Criteria

- A selected mesh can be baked into a deterministic collider asset.
- The scene document is updated with a valid collider URL.
- Generated collider metadata exists and is auditable.
- Oversized or invalid collider bakes fail loudly with actionable errors.
- The shipped player consumes only static generated collider assets.

## Validation

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

Run the new bake command or editor route test added by this task and report the
exact command.

## Handoff

Report:

- collider artifact format
- generated paths
- bake command or route
- validation added
- editor integration point for Agent 03
