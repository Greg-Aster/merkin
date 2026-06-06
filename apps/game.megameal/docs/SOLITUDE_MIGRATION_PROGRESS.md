# Solitude Migration Progress

Status: planning/progress packet opened on 2026-06-06.

Scope: migrate the legacy `solitude` level into `apps/game.megameal` as a new
target-engine runtime scene, without importing the old runtime, editor, generated
runtime JSON, or world-partition data as executable inputs.

## Contract Owner

`SolitudeLevelContract` is the owner for this packet.

Current source-of-truth documents:

- `ENGINE_CONTRACT_REGISTER.md`
- `docs/GAME_ENGINE_MIGRATION_PLAN.md`
- `docs/SOLITUDE_MIGRATION_PROGRESS.md`

Legacy source evidence is provenance only:

- `apps/game/src/threlte/editor/scenes/solitude.scene.json`
- `apps/megameal/public/generated/runtime-game-assets/scenes/solitude.runtime-scene.json`
- `apps/megameal/public/runtime-world-partitions/solitude.partition.json`

Target runtime IDs reserved for the implementation packet:

- Runtime scene: `solitude_runtime`
- Level: `solitude`

No `src/` runtime implementation has been added by this docs-only progress
packet.

## Current Evidence

The migration plan records the old Solitude build as:

- 33 actors.
- 16 runtime assets.
- Two required walkable/collision actors.
- Not publish-ready in the old pipeline because
  `solitude-ground-plateau` had no runtime collision manifest.

This evidence is sizing and migration-risk input only. It does not authorize
loading old generated runtime scene data or old world partitions in the new
engine.

## Guardrails

- Do not import from `apps/game`.
- Do not copy old Svelte, Threlte, Three, Rapier, or editor ownership patterns.
- Do not load old generated runtime scene JSON as runtime data.
- Do not load the old Solitude world partition directly.
- Do not infer walkable collision from render meshes.
- Do not add a portal-arena transition to `solitude_runtime` until the target
  runtime scene manifest, readiness checks, content-graph validation, and
  runtime-scene negative tests pass.
- Do not mark Solitude playable or complete until the target-owned packet has
  checked-in assets, prefabs, level data, render profile, runtime manifest,
  collision/walkable IDs, player spawn, audio/environment decisions, and focused
  validation.

## Implementation Tasks

- [ ] Capture source evidence from the legacy Solitude scene, old generated
      runtime scene, old partition, and old registry metadata as provenance
      notes only.
- [ ] Create target-owned Solitude asset manifest data.
- [ ] Create target-owned Solitude prefab definitions.
- [ ] Create target-owned Solitude level data with a stable player spawn.
- [ ] Define the Solitude render profile and environment/post-processing policy.
- [ ] Resolve whether old world partition behavior becomes checked-in
      no-streaming content, a future streaming contract, or a generated/cooked
      import packet.
- [ ] Implement explicit ownership for the two old required walkable/collision
      surfaces, including stable IDs and readiness requirements.
- [ ] Resolve the old `solitude-ground-plateau` missing-collision blocker as
      target-owned collider data or a documented future cooked-collision product.
- [ ] Define ambient particle/firefly policy through existing particle/firefly
      contracts or mark it explicitly future.
- [ ] Migrate any old audio preset evidence through `AudioManifestAndEvents`.
- [ ] Add runtime-scene manifest data for `solitude_runtime`.
- [ ] Add content-graph and runtime-scene validation, including negative tests
      for missing required walkable/collision data.
- [ ] Add the portal-arena transition to `solitude_runtime` only after
      validation passes.

## Validation Checklist

Expected implementation validation:

- `pnpm --dir apps/game.megameal test:runtime-scene-contract`
- `pnpm --dir apps/game.megameal test:level-authoring-contract`
- `pnpm --dir apps/game.megameal test:generated-glb-import-contract`
- `pnpm --dir apps/game.megameal test:audio-contract`
- `pnpm --dir apps/game.megameal test:scene-environment-contract`
- `pnpm --dir apps/game.megameal audit:engine-boundaries`
- `pnpm --dir apps/game.megameal type-check`
- `pnpm --dir apps/game.megameal lint`
- `git diff --check -- apps/game.megameal`

Docs-only validation for this progress packet:

- Check Solitude docs/register references.
- Check docs whitespace.
- Confirm no `src/` files changed.

## Current Stop State

Agent 1 opened the Solitude documentation/progress packet and reserved the
contract owner. Runtime implementation remains unstarted.
