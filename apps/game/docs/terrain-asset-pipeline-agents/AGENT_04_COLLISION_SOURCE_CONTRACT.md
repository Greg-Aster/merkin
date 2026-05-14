# Agent 04: Collision Source Contract

## Mission

Align terrain collision products with the same source asset contract used by
terrain render chunks.

The engine should know whether collision came from:

- source GLB terrain mesh
- dedicated Blender-exported collision mesh
- heightfield projection
- explicit scene-authored collision actors

## Context

The existing terrain collision bake produces a binary heightfield-derived
terrain collider from the heightmap. That is valid for heightfield terrain, but
not always correct for authored GLB terrain with non-heightfield geometry.

## Ownership

Primary files:

- `apps/game/scripts/bake-terrain-collision.mjs`
- `apps/game/src/threlte/features/terrain/bakedTerrainCollider.ts`
- `apps/game/src/threlte/features/terrain/components/TerrainCollider.svelte`
- `apps/game/src/threlte/engine/collisionReview.ts`
- `apps/game/src/threlte/engine/levelValidation.ts`

Secondary files if needed:

- `apps/game/scripts/bake-mesh-collider.mjs`
- `apps/game/scripts/bake-scene-mesh-colliders.mjs`
- `apps/game/docs/collision-mesh-collider-bake.md`
- `apps/megameal/public/terrain/collision/*.meta.json`

## Requirements

Add or prepare metadata that links terrain collision to the same source contract
as render chunks:

- source asset URL
- source asset hash
- source coordinate system and bounds
- collision bake mode
- collision mesh source, if separate
- collision coverage bounds
- triangle/vertex count
- walkable/blocker/detail role

For `heightfield-terrain`, heightfield collision remains valid.

For `glb-chunk-terrain`, support or clearly specify:

- dedicated collision GLB exported from Blender
- simplified source GLB collision bake
- terrain walkable mesh bake from selected mesh parts

The collision metadata must make it impossible to confuse a stale heightmap
collider with a source-GLB terrain render chunk set.

## Validation Rules

Add validation for:

- source hash mismatch between render chunks and collision
- collision coverage not overlapping required visual terrain bounds
- spawn point outside collision coverage
- `glb-chunk-terrain` using heightfield collision without an explicit approved
  exception
- missing collision product for required terrain

## Non-Goals

- Do not create the GLB render chunk cooker.
- Do not replace asset mesh collider baking generally unless needed for terrain
  source contract alignment.
- Do not add primitive terrain collision fallback.

## Acceptance Criteria

- Terrain collision metadata can be traced back to source terrain assets.
- Validation can distinguish heightfield collision from GLB-source collision.
- Runtime collision loading remains stable for existing heightfield levels.
- Publish readiness surfaces stale or incompatible terrain collision clearly.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:collision
```

For terrain artifact changes, run:

```bash
pnpm --dir apps/game bake:terrain-collision -- --level=observatory
```

Report whether any generated collision files changed.
