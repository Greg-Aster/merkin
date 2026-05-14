# AAA Collision System Agent 05 - Terrain Heightmap Workflow

## Goal

Make terrain, ground plane, heightmap generation, baked collision, visual chunk
cooking, and publish state understandable and reliable from the level editor.

The terrain pipeline should feel like an engine workflow:

```txt
choose terrain sources
  -> generate heightmap
  -> bake collision
  -> cook visual chunks
  -> validate ground contract
  -> publish
```

## Read First

- `apps/game/AGENTS.md`
- `apps/game/AAA_COLLISION_SYSTEM_AGENT_COORDINATION.md`
- `apps/game/src/threlte/editor/EditorCollisionTabHost.svelte`
- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/scripts/generate-terrain-heightmap.mjs`
- `apps/game/scripts/bake-terrain-collision.mjs`
- `apps/game/scripts/cook-terrain-chunks.mjs`
- `apps/game/scripts/editor-tools/terrainRoutes.cjs`
- `apps/game/src/threlte/features/terrain/TerrainRuntime.svelte`
- `apps/game/src/threlte/features/terrain/components/TerrainCollider.svelte`

## Primary Ownership

- Terrain/heightmap editor workflow
- Terrain source selection UX
- Bake/cook/publish feedback
- Ground contract clarity

Avoid general collision inspector UX. Agent 03 owns that.
Avoid general validation framework work unless it is terrain-specific. Agent 06
owns broader diagnostics.

## Current Problem

The editor has heightmap and terrain collision tools, but authors still have to
infer which selected objects are source meshes, whether the ground plane is
visual-only or physics-active, whether the baked collider is current, and
whether Publish includes the terrain bake products.

## Work Steps

1. Replace implicit source selection with a clear terrain source basket:
   - included source nodes
   - excluded selected nodes
   - source bounds
   - triangle count estimate
   - remove/clear actions
2. Show the terrain pipeline state as explicit steps:
   - source selected
   - heightmap generated
   - collision baked
   - visual chunks cooked
   - manifest current
   - publish ready
3. Clarify auto-bake behavior:
   - what triggers it
   - what it writes
   - when manual bake is still required
4. Add warnings for common ground problems:
   - visible ground mesh also has large blocker collision while baked terrain is
     active
   - required walkable surface missing
   - terrain manifest missing
   - collider older than heightmap/source
5. Make Publish feedback state whether terrain products were baked/cooked or
   whether publish used stale artifacts.
6. Keep baked terrain collision separate from visual chunks.
7. Use scene settings and manifests as the source of truth. Do not hard-code
   level ids in generic terrain workflow code.

## Guardrails

- Do not make visual terrain chunks into player colliders.
- Do not silently publish stale terrain collision.
- Do not create level-specific terrain buttons.
- Do not weaken existing terrain artifact audits.
- Do not require runtime network/server features for the static player.

## Acceptance Criteria

- Authors can see exactly which objects will generate the terrain heightmap.
- The editor explains whether terrain collision is current.
- Publish state clearly includes or rejects terrain bake/cook state.
- Ground plane versus baked heightmap responsibilities are visible.
- Baked terrain remains the runtime source for terrain physics when configured.

## Validation

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game release:gate:quick
```

If CSS or Megameal-facing UI surfaces are touched, also run:

```bash
pnpm --dir apps/megameal audit:css
```

## Handoff

Report:

- terrain workflow UI changes
- bake/cook/publish state changes
- commands run
- remaining terrain validation gaps
