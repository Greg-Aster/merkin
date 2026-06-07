# Game Megameal Migration Handoff - 2026-06-06

## Current Packet State

This handoff was continued by
`docs/Done/MIGRATION_ACTIVE_WORK_PLAN_2026-06-06.md` and aligned by
`docs/Done/MIGRATION_AGENT_ALIGNMENT_2026-06-06.md`. Current work is one combined
engine packet using shared contracts, not separate level architectures.

Miranda advanced in three packets:

1. Miranda airlock return portal migration.
2. Miranda walkable floor/readiness contract migration.
3. Miranda Cargo Hold floor/bounds extension.
4. Miranda cockpit command console and Chapel monolith content parity slice.

Observatory advanced in one collision packet:

1. Observatory authored proxy collision foundation using
   `ObservatoryCollisionContract` over `CollisionPolicy`,
   `WalkableCollisionContract`, and `LevelReadinessContract`.

The full migration plan is not complete. Do not mark the migration complete.

## Completed This Session

- Migrated the old Miranda airlock return portal into checked-in target-engine
  data as `miranda:airlock:return-portal`.
- Added shared portal asset ownership in `src/game/assets/portalAssets.ts` for
  `mesh_portal_gate` and `audio_portal_activate`.
- Added shared portal prefab ownership in
  `src/game/prefabs/navigationPrefabs.ts` for `portal_gate`.
- Rewired portal arena and Miranda to reuse shared portal asset/prefab owners
  instead of duplicating scene-local definitions.
- Added Miranda portal preload/readiness coverage for `mesh_portal_gate`,
  `audio_portal_activate`, `portal_gate`, and
  `miranda:airlock:return-portal`.
- Added `Collider.intent: "walkable"` as a framework-neutral collision intent.
- Added `RuntimeSceneManifest.readiness.requiredWalkableStableIds`.
- Converted `miranda_floor_main` and `miranda_floor_upper` to explicit
  `walkable/worldStatic` colliders.
- Added Miranda readiness requirements for `miranda:floor:main` and
  `miranda:floor:upper`.
- Added `miranda_floor_cargo_hold` as a checked-in target-engine
  `walkable/worldStatic` floor extension.
- Added `miranda:floor:cargo-hold` to Miranda level data and required
  collision/walkable readiness.
- Extended Miranda character bounds to `x = -20..20`, `z = -50..48` only after
  the Cargo Hold walkable floor extension was authored.
- Added old Miranda cockpit command console and Chapel monolith A/B as
  checked-in target-engine prefabs and instances with explicit render/collision
  data.
- Added readiness coverage for `miranda:cockpit:console`,
  `miranda:chapel:monolith:a`, and `miranda:chapel:monolith:b`.
- Updated Observatory collision so `observatory:walkable-mesh` is required
  `walkable/worldStatic` floor collision.
- Added four required Observatory boundary blockers through checked-in level and
  prefab data.
- Updated runtime readiness evaluation so missing required walkable instances
  fail before scene activation.
- Updated the game runtime physics pre-sync readiness check so required
  walkable stable IDs must also have synced colliders.
- Extended the existing `scripts/test-runtime-scene-contract.ts`; no new
  one-off scripts were added.
- Updated `ARCHITECTURE.md`, `GAME_ENGINE_DESIGN_DOCUMENT.md`,
  `ENGINE_CONTRACT_REGISTER.md`, and `docs/GAME_ENGINE_MIGRATION_PLAN.md`.

## Validation Run

Passed after the Cargo Hold floor/bounds extension:

- `pnpm --dir apps/game.megameal test:runtime-scene-contract`
- `pnpm --dir apps/game.megameal type-check`
- `pnpm --dir apps/game.megameal lint`
- `pnpm --dir apps/game.megameal audit:engine-boundaries`
- `pnpm --dir apps/game.megameal test:input-contract`
- `pnpm --dir apps/game.megameal test:charged-action-contract`
- `pnpm --dir apps/game.megameal test:story-note-contract`
- `pnpm --dir apps/game.megameal test:scene-environment-contract`
- `pnpm --dir apps/game.megameal build`
- `git diff --check -- apps/game.megameal pnpm-lock.yaml`

`test:scene-environment-contract` hit a sandbox-only `tsx` `/tmp` pipe `EPERM`
once and passed through the approved direct rerun.

No dev server or browser smoke check was run.

## Sidecar Agent Results

- Portal packet audit found no blocking architecture drift. It caught stale
  portal/audio doc wording, which was fixed.
- Docs/register audit found stale wording around migration completion, portal
  arena targets, Observatory audio ownership, charge-release SFX wording, and
  Miranda portal activation in the audio DoD. These were fixed.
- Miranda floor/bounds evidence audit confirmed:
  - old Miranda required `miranda-floor-main` and `miranda-floor-upper` as
    scene-authored walkable floors,
  - old main floor bounds are `x = -20..20`, `z = -50..42`,
  - target Cargo Stack C sat at world `z = 44.2`, outside the old mirrored
    bounds,
  - target Brig Desk collider extent leaked past old max Z,
  - target player still uses fixed `CharacterController.groundY: 4.25`.

## Where To Continue

Next safe packet after combined validation:

1. Continue each level only through checked-in level/prefab/readiness data.
2. Do not import old `apps/game` runtime code.
3. Do not load old generated runtime scene JSON.
4. Do not copy generated collider binaries or old terrain manifest products.
5. Keep shared runtime behavior in engine contracts, not level-local branches.

Remaining known migration gaps:

- Broader Miranda terrain/cooked collision/import coverage beyond the current
  checked-in walkable floor footprint.
- Broader terrain-following or multi-height movement. Observatory now opts
  into engine-owned kinematic collision; levels that have not opted in still
  use scalar `groundY` fallback behavior.
- Expanded/spatial audio, crossfades, and durable audio import/generation.
- Editor/import controls and generated/cooked content pipelines.
- Starmap/timeline behavior as new manifest-owned data.
- Old `apps/game` retirement after useful content is migrated.

## Dirty Files At Stop

Expected modified files:

- `ARCHITECTURE.md`
- `ENGINE_CONTRACT_REGISTER.md`
- `GAME_ENGINE_DESIGN_DOCUMENT.md`
- `docs/GAME_ENGINE_MIGRATION_PLAN.md`
- `docs/Done/MIGRATION_ACTIVE_WORK_PLAN_2026-06-06.md`
- `docs/Done/MIGRATION_AGENT_ALIGNMENT_2026-06-06.md`
- `docs/MIGRATION_HANDOFF_2026-06-06.md`
- `docs/Done/OBSERVATORY_COLLISION_SYSTEM_FINDINGS.md`
- `docs/OBSERVATORY_PLAYABLE_FOUNDATION_PLAN.md`
- `public/audio/sfx/PORTAL_SFX_SOURCES.md`
- `scripts/test-runtime-scene-contract.ts`
- `src/engine/data/manifests/index.ts`
- `src/engine/data/schemas/index.ts`
- `src/engine/modules/physics/index.ts`
- `src/game/assets/defaultAssets.ts`
- `src/game/assets/index.ts`
- `src/game/assets/portalArenaAssets.ts`
- `src/game/levels/defaultLevels.ts`
- `src/game/levels/observatoryLevel.ts`
- `src/game/levels/runtimeSceneManifests.ts`
- `src/game/prefabs/defaultPrefabs.ts`
- `src/game/prefabs/index.ts`
- `src/game/prefabs/observatoryPrefabs.ts`
- `src/game/prefabs/portalPrefabs.ts`
- `src/game/runtime/index.ts`

Expected new files:

- `src/game/assets/portalAssets.ts`
- `src/game/prefabs/navigationPrefabs.ts`

## Architecture Notes

- The new portal files are durable shared owners, not temporary scaffolding.
- The walkable collision changes are engine contracts, not scene-specific
  runtime repairs.
- The current implementation intentionally keeps old generated portal apparatus
  GLB files, old runtime JSON, and generated collision products excluded from
  runtime loading. Generated story-marker parity is now tracked through
  `GeneratedGlbImportParityContract`: used marker candidates are validated as
  target-engine substitutions, while the old green marker remains planned.
- `docs/CLEANUP_REMINDER.md` was read and must not be deleted.
