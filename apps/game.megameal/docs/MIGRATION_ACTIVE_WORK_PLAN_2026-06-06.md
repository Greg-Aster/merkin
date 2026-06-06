# Game Megameal Active Migration Work Plan - 2026-06-06

## Purpose

This file records the active plan for continuing the `apps/game` to
`apps/game.megameal` migration. It is meant to survive chat context loss and to
give the next agent a concrete checklist for what is being done, why it is
being done, and how completion must be verified.

This is not a replacement for:

- `GAME_ENGINE_MIGRATION_PLAN.md`
- `ENGINE_CONTRACT_REGISTER.md`
- `GAME_ENGINE_DESIGN_DOCUMENT.md`
- `ARCHITECTURE.md`
- `docs/CLEANUP_REMINDER.md`

Those files remain the source of truth for architecture, contracts, and cleanup
standards.

## Current Packet

Status: implementation complete and validated

Current packet goal:

1. Stabilize and validate the Miranda portal plus walkable-readiness migration
   packet already in the dirty tree.
2. Use sidecar agent findings to catch architecture drift, stale docs, or
   missing migration evidence.
3. If the current packet validates cleanly, continue with the next small
   Miranda migration slice: a clean Cargo Hold floor/bounds extension.

The full migration is not complete. Do not mark the migration complete.

## Active Sidecar Agents

Two read-only sidecar agents assisted the work:

- `Feynman`: audit the current dirty Miranda portal plus walkable-readiness
  packet for architecture drift, stale documentation, missing validation, and
  cleanup issues.
- `Aristotle`: gather old-engine evidence for the next Miranda Cargo Hold
  floor/bounds packet, especially floor extents, cargo positions, player
  bounds, and old assumptions that must not be copied blindly.

Agent findings must be treated as evidence, not automatic implementation
instructions. Any implementation still has to follow the target-engine
contracts.

Sidecar findings used:

- `Feynman` found no blocking architecture drift in the current portal plus
  walkable-readiness packet and recommended rerunning the full cleanup gate
  before commit.
- `Aristotle` confirmed the old authored main and upper floor footprints, found
  `miranda:cargo:stack:c` and the `miranda:brig:desk` collider extent past the
  old main-floor max Z, and recommended a checked-in Cargo Hold walkable floor
  before broadening character bounds.

## Current Dirty Packet To Verify

Expected completed behavior in the current dirty packet:

- Shared portal asset ownership lives in `src/game/assets/portalAssets.ts`.
- Shared portal prefab ownership lives in
  `src/game/prefabs/navigationPrefabs.ts`.
- Portal arena and Miranda reuse shared portal owners instead of duplicating
  scene-local portal data.
- Miranda has a checked-in airlock return portal instance targeting
  `observatory_runtime`.
- `Collider.intent: "walkable"` exists as an engine/data contract.
- `RuntimeSceneManifest.readiness.requiredWalkableStableIds` exists.
- Miranda main and upper deck floor instances are explicit
  `walkable/worldStatic` collision surfaces.
- Runtime readiness fails when required walkable instances are missing.
- Physics pre-sync readiness fails when required walkable stable IDs do not
  have synced colliders.
- `scripts/test-runtime-scene-contract.ts` owns the durable test extension.
- No old `apps/game` runtime code, generated runtime JSON, generated collider
  products, or Svelte/Threlte runtime behavior was copied.

## Validation Gate Before Continuing

Run this gate before treating the current packet as stable:

```bash
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal lint
pnpm --dir apps/game.megameal test:input-contract
pnpm --dir apps/game.megameal test:charged-action-contract
pnpm --dir apps/game.megameal test:story-note-contract
pnpm --dir apps/game.megameal test:scene-environment-contract
pnpm --dir apps/game.megameal test:runtime-scene-contract
pnpm --dir apps/game.megameal build
git diff --check -- apps/game.megameal pnpm-lock.yaml
```

If the `test:*` package scripts hit sandbox-specific `tsx` pipe errors, rerun
the same focused contract scripts through the approved direct form:

```bash
pnpm --dir apps/game.megameal exec tsx ./scripts/test-input-contract.ts
pnpm --dir apps/game.megameal exec tsx ./scripts/test-charged-action-contract.ts
pnpm --dir apps/game.megameal exec tsx ./scripts/test-story-note-contract.ts
pnpm --dir apps/game.megameal exec tsx ./scripts/test-scene-environment-contract.ts
pnpm --dir apps/game.megameal exec tsx ./scripts/test-runtime-scene-contract.ts
```

Do not run a dev server, browser smoke check, or full app smoke harness unless
the user explicitly asks.

## Next Packet: Miranda Cargo Hold Floor/Bounds Extension

Status: implemented and validated

Problem:

- The current migrated Cargo Hold includes content whose old-world position
  extends beyond the currently checked-in walkable deck footprint.
- Evidence so far shows `miranda:cargo:stack:c` sits beyond the current
  character bounds on the positive Z side.
- Expanding player movement bounds without explicit authored walkable collision
  would violate `WalkableCollisionContract`.

Implementation intent:

1. Use old `apps/game` only as read-only evidence.
2. Author the extension as checked-in target-engine level, prefab, and
   readiness data.
3. Add or extend explicit walkable collision coverage before broadening any
   player movement bounds.
4. Keep runtime systems generic. No level-ID branches and no runtime repair of
   missing floor data.
5. Extend durable validation only in an existing focused owner file unless a
   new owner is clearly justified.
6. Update `GAME_ENGINE_MIGRATION_PLAN.md`,
   `GAME_ENGINE_DESIGN_DOCUMENT.md`, `ENGINE_CONTRACT_REGISTER.md`, and this
   work-plan file if the contract or implementation status changes.

Implemented data changes:

- Added `miranda_floor_cargo_hold` as a reusable target-engine prefab with an
  explicit `walkable/worldStatic` box collider.
- Added `miranda:floor:cargo-hold` as a checked-in Miranda level instance.
- Added the Cargo Hold floor to Miranda runtime readiness through
  `requiredCollisionPrefabIds`, `requiredCollisionStableIds`, and
  `requiredWalkableStableIds`.
- Extended Miranda `game:characterBounds.maxZ` from `42` to `48` only after the
  matching walkable floor coverage was authored.
- Extended `scripts/test-runtime-scene-contract.ts` as the existing durable
  runtime-scene owner for the new walkable stable ID, collider shape, and
  bounds assertion.

Acceptance criteria:

- Cargo Hold content is reachable only over explicit walkable collision.
- Readiness requires the authored walkable stable IDs needed by the expanded
  footprint.
- Player bounds match the authored walkable area and do not silently exceed it.
- Runtime loading still fails loudly if required walkable floor data is missing.
- Boundary audit, type-check, lint, contract tests, build, and diff check pass.
- No temporary probes, one-off scripts, duplicate docs, stale TODOs, dead
  exports, or orphan generated files remain.

## Cleanup Requirements

Before handoff:

- Inspect `git status --short --branch --untracked-files=normal`.
- Confirm every dirty file is part of this packet.
- Remove temporary diagnostics and scratch files.
- Confirm no package scripts point to deleted files.
- Confirm no docs claim completed work that is only planned.
- Report any new docs, tests, scripts, dependencies, generated artifacts, or
  CSS surface area.

## Progress Log

- 2026-06-06: Created this active work-plan file so the continuation plan is
  tracked in the repo instead of only in chat context.
- 2026-06-06: Full cleanup gate passed for the pre-existing portal plus
  walkable-readiness packet. `test:scene-environment-contract` hit a
  sandbox-only `tsx` `/tmp` pipe `EPERM` once and passed through the approved
  direct rerun.
- 2026-06-06: Implemented the Cargo Hold floor/bounds extension as checked-in
  target-engine data.
- 2026-06-06: Final focused validation passed after the Cargo Hold packet:
  `audit:engine-boundaries`, `type-check`, `lint`, `test:input-contract`,
  `test:charged-action-contract`, `test:story-note-contract`,
  `test:scene-environment-contract`, `test:runtime-scene-contract`, `build`,
  and `git diff --check -- apps/game.megameal pnpm-lock.yaml`. The
  scene-environment package-script run hit the same sandbox-only `tsx` `/tmp`
  pipe `EPERM` once and passed through the approved direct rerun.
