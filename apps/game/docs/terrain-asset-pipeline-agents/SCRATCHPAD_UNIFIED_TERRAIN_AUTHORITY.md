# Scratchpad: Unified Terrain Authority

## Problem Statement

The terrain pipeline is not finished. The game currently supports multiple
terrain representations, but the broken pattern is mixed authority: visible
ground comes from one system while player collision comes from another system.
That caused the Yggdrasil invisible/misaligned collision bug.

The goal is not to remove every terrain representation. A professional engine
can support multiple representations. The goal is to enforce one terrain
authority contract per level and one editor/publish validation path so render,
collision, spawn, readiness, and diagnostics cannot drift.

## Current Level State

```txt
miranda      mode=scene-authored    visual=scene-actors       collision=scene-colliders              OK
observatory  mode=glb-chunk-terrain visual=source-glb-chunks  collision=source-linked-terrain        OK
sci-fi-room  mode=scene-authored    visual=scene-actors       collision=scene-colliders              OK
solitude     mode=scene-authored    visual=scene-actors       collision=scene-colliders              OK
yggdrasil    mode=scene-authored    visual=scene-actors       collision=scene-colliders              OK
```

## Target Contract

Every level must resolve to exactly one terrain authority mode:

1. `scene-authored`
   - Visual authority: scene actors.
   - Collision authority: scene colliders.
   - No terrain manifest required.
   - No baked heightfield runtime floor.
   - Good for rooms, platforms, modular kits, props, authored ground meshes,
     and levels where walkable geometry is made from discrete objects.

2. `glb-chunk-terrain`
   - Visual authority: source GLB chunks cooked from one authored terrain GLB.
   - Collision authority: source-linked terrain collision derived from the same
     source GLB contract.
   - Terrain manifest required.
   - Good for large terrain authored in Blender or another DCC and exported as
     `.glb` / `.gltf`.

3. `heightfield-terrain`
   - Visual authority: generated heightfield surface/chunks.
   - Collision authority: baked heightfield from the same heightfield source.
   - Terrain manifest required.
   - Allowed only when both render and collision come from the same heightfield
     source. This must not be used as a fallback collision layer under
     scene-authored visuals.

## Non-Negotiable Rule

`scene-authored + baked-heightfield` is no longer an acceptable final state.

It is a migration smell because it means visible geometry and player collision
can drift independently. This combination should become an audit failure once
`sci-fi-room` and `solitude` are migrated.

## Migration Plan

### Phase 1: Lock the Contract

- Add a named helper for terrain authority classification if one does not
  already exist.
- Update audits so they report `scene-authored + baked-heightfield` as a
  blocking issue after the migration flag is enabled.
- Make the audit message actionable:
  - Convert to `scene-colliders`, or
  - Convert the level to true `heightfield-terrain`, or
  - Convert to `glb-chunk-terrain`.

Status: implemented. `classifyTerrainAuthority()` now centralizes the mode,
visual authority, collision authority, and mixed-authority decision. The
terrain contract audit now fails future `scene-authored + baked-heightfield`
levels by default, while the lower-level diagnostics helper can still report
the same condition as a warning for transitional editor/readiness UI.

### Phase 2: Migrate `sci-fi-room`

- Inspect ground actors and spawn support.
- Decide whether it is truly scene-authored. Current classification says yes.
- Convert collision authority to `scene-colliders`.
- Add/verify walkable colliders for required floors/platforms.
- Bake trimesh colliders only for asset actors that need walkable or blocker
  collision. Do not use render meshes directly at runtime.
- Remove `terrainManifestUrl` and baked heightfield runtime references.
- Remove obsolete `sci-fi-room` terrain manifest/heightmap/collider artifacts
  only after no scene/runtime/audit references remain.
- Cook runtime assets.
- Verify spawn is supported by authored walkable collision.

### Phase 3: Migrate `solitude`

- Inspect ground actors and the intended `solitude-plateau` ground object.
- Decide whether `solitude` should be:
  - `scene-authored + scene-colliders`, if the plateau is a placed asset, or
  - `glb-chunk-terrain`, if the plateau should become the authored terrain
    source GLB.
- Do not keep the baked heightfield under scene actors.
- If scene-authored:
  - Bake/verify the plateau as a walkable collider.
  - Add supplemental primitive walkable colliders only where intentionally
    authored.
  - Remove obsolete terrain manifest/heightmap/collider runtime artifacts.
- If glb-chunk-terrain:
  - Define the source GLB in scene settings.
  - Cook chunks from the source GLB.
  - Bake source-linked collision from the same source contract.
  - Validate source hash/fingerprint match.
- Cook runtime assets.
- Verify spawn is supported by the chosen terrain authority.

### Phase 4: Retire Mixed Mode

- Update `terrainContractAudit` and `collisionReview` so
  `scene-authored + baked-heightfield` fails.
- Remove static fallback workflow defaults that silently assign baked terrain
  manifests to scene-authored levels.
- Keep `heightfield-terrain` support only for levels that truly render from
  heightfield output.
- Ensure editor publish readiness exposes the selected authority and blocks
  stale products.

### Phase 5: Editor UX

- The collision/terrain panel should show one authority summary:
  - Terrain mode.
  - Visual authority.
  - Collision authority.
  - Required bake/cook action.
  - Whether runtime is stale.
- For scene-authored levels, hide/disable heightfield bake controls unless the
  user explicitly changes the level authority to `heightfield-terrain`.
- For GLB terrain levels, show GLB chunk cook + source-linked collision bake.
- For heightfield terrain levels, show heightmap bake + collision bake.

Status: in progress. The editor terrain pipeline now exposes one authority
summary plus the required next action. Collision, workflow, and publish
readiness panels surface that summary. Scene-authored levels no longer show
heightfield source-basket or baked-artifact controls in the collision tab;
those controls are reserved for true `heightfield-terrain`. GLB chunk terrain
exposes GLB chunk cook and source-linked collision bake commands.

## Agent Coordination

- Do not add new generic level-id branches.
- Level-specific changes belong in scene documents, level contracts, or
  migration scripts.
- Do not keep dead terrain products as runtime artifacts.
- Do not hand-edit generated runtime scene JSON. Run the cook step.
- If a source scene change creates generated drift, run the relevant bake/cook
  command and report it.

## Acceptance Criteria

The pass is complete when:

- `sci-fi-room` is no longer `scene-authored + baked-heightfield`.
- `solitude` is no longer `scene-authored + baked-heightfield`.
- No runtime scene references `/terrain/sci-fi-room.manifest.json` unless the
  level is true `heightfield-terrain`.
- No runtime scene references `/terrain/solitude.manifest.json` unless the
  level is true `heightfield-terrain`.
- `terrainContractAudit` fails future mixed-authority levels.
- `collisionReview` reports zero errors for all levels.
- `check:generated-drift` passes.
- `type-check` passes.
- `audit:engine` passes.

## Verification Commands

```bash
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
```

## Current Owner Notes

- Yggdrasil has already been migrated to `scene-authored + scene-colliders`.
- Observatory is the GLB chunk terrain model and now identifies its collision
  terrain source as `source-glb`, not `baked-heightmap`.
- `sci-fi-room` and `solitude` have been migrated to scene-authored scene
  colliders.
- `scene-authored + baked-heightfield` is now expected to fail the terrain
  contract audit.
- Latest verification after the authority gate and `source-glb` normalization:
  `type-check`, `test:publish-pipeline`, `audit:engine`, and
  `check:generated-drift` pass.
- Latest tooling-hardening pass:
  - Scene-authored levels ignore stale baked terrain fields in editor publish
    planning.
  - Scene-authored terrain manifest references fail `terrainContractAudit`.
  - Editor terrain status no longer treats stale manifest fields as a baked
    terrain fallback for scene-authored levels.
  - `test:publish-pipeline` passes with 26 tests.
  - `type-check` passes.
  - `audit:engine` passes.
  - `check:generated-drift` passes.
