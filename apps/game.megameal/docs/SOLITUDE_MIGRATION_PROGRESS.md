# Solitude Migration Progress

Status: playable foundation admitted on 2026-06-06; full legacy parity remains
future work.

Scope: migrate the legacy `solitude` level into `apps/game.megameal` as a new
target-engine runtime scene, without importing the old runtime, editor, generated
runtime JSON, or world-partition data as executable inputs.

## Contract Owner

`SolitudeLevelContract` is the owner for this packet.

Current source-of-truth documents:

- `ENGINE_CONTRACT_REGISTER.md`
- `docs/GAME_ENGINE_MIGRATION_PLAN.md`
- `docs/SOLITUDE_MIGRATION_PROGRESS.md`
- `docs/SOLITUDE_MIGRATION_PROVENANCE.md`

Legacy source evidence is provenance only:

- `apps/game/src/threlte/editor/scenes/solitude.scene.json`
- `apps/megameal/public/generated/runtime-game-assets/scenes/solitude.runtime-scene.json`
- `apps/megameal/public/runtime-world-partitions/solitude.partition.json`

Target runtime IDs used by the admitted foundation packet:

- Runtime scene: `solitude_runtime`
- Level: `solitude`

The admitted implementation is a target-owned playable foundation, not full
old-scene parity. Solitude uses checked-in target assets, prefabs, level data,
render profile, audio/environment data, runtime scene manifest data, explicit
readiness entries, and a portal-arena transition. The legacy files listed above
remain provenance only.

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
- Portal-arena transition to `solitude_runtime` is allowed only while the
  target runtime scene manifest, readiness checks, content-graph validation,
  and runtime-scene negative tests remain green.
- Do not mark Solitude full legacy parity until generated GLB/cooked collision,
  particle/firefly population, post-processing/reflection, production lighting,
  and partition/streaming work have their own target-owned contracts.

## Implementation Tasks

- [x] Capture source evidence from the legacy Solitude scene, old generated
      runtime scene, old partition, and old registry metadata as provenance
      notes only.
- [x] Create target-owned Solitude asset manifest data using primitive/current
      target assets first. Old generated GLBs remain future import/cook
      candidates until `GeneratedGlbImportParityContract` admits them.
- [x] Create target-owned Solitude prefab definitions with manifest IDs that
      exactly match the asset manifest.
- [x] Create target-owned Solitude level data with the stable old-source player
      spawn rewritten into the new level contract.
- [x] Define the Solitude render profile and environment/post-processing policy.
      Only schema-supported profile data may be authored now; old shadows,
      static reflections, bloom, ambient occlusion, color grading, and vignette
      requests remain future renderer/quality work unless the target contract
      supports them.
- [x] Use a no-streaming playable foundation for the first packet and keep the
      old one-cell world partition as provenance only. Any future streaming or
      partition product needs a target-owned cook/import contract.
- [x] Implement explicit ownership for the two old required walkable/collision
      surfaces, including stable IDs and readiness requirements.
- [x] Resolve the old `solitude-ground-plateau` missing-collision blocker as
      target-owned collider data in the foundation, with future cooked
      collision parity tracked separately.
- [x] Define ambient particle/firefly policy through existing particle/firefly
      contracts or mark it explicitly future. A small authored firefly/story
      marker may be part of the playable foundation, but the old twelve NPC
      groups and large ambient particle field are not parity-complete.
- [x] Migrate the old `lonely-wind`/`Wicked Shadows Whisper` evidence through
      `AudioManifestAndEvents` as manifest-owned scene music or a spatial
      emitter, not direct playback.
- [x] Add runtime-scene manifest data for `solitude_runtime`.
- [x] Add content-graph and runtime-scene validation, including negative tests
      for missing required walkable/collision data.
- [x] Add the portal-arena transition to `solitude_runtime` only after
      validation passes.
- [x] Document remaining full-parity work: generated GLB art/collision import,
      cooked collision products, old particle/firefly population parity,
      post-processing/reflection rendering, production light tuning, and any
      future partition/streaming ownership.

## Implementation Evidence

Source inspection on 2026-06-06 confirms:

- `src/game/assets/solitudeAssets.ts` owns Solitude primitive/current mesh,
  material, cubemap, SFX, and ambient music assets plus the Solitude audio
  content manifest.
- `src/game/prefabs/solitudePrefabs.ts` owns Solitude plateau, dais, pillar,
  ring-fragment, firefly/story marker, and wind-emitter prefabs. The plateau
  and dais declare explicit `walkable/worldStatic` collider data.
- `src/game/levels/solitudeLevel.ts` owns the no-streaming `solitude` level,
  player spawn, portal return, story marker, spatial wind emitter, pillar/ring
  blockers, required collision stable IDs, and exactly two required walkable
  stable IDs: `solitude:ground:plateau` and `solitude:ground:dais`.
- `src/game/levels/runtimeSceneManifests.ts` admits
  `solitudeRuntimeSceneManifest` as `solitude_runtime` in the checked-in runtime
  scene catalog.
- `src/game/levels/portalArenaLevel.ts` points the Solitude portal slot at
  `solitude_runtime`.
- `src/game/assets/defaultAssets.ts` routes `solitude_runtime` to the Solitude
  audio content manifest.

## Validation Checklist

Expected implementation validation for future Solitude code changes:

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

The Solitude playable foundation is admitted as `solitude_runtime` and linked
from the portal arena. It is a compact target-owned foundation with explicit
plateau/dais walkable collision, a return portal, a story/firefly marker,
manifest-owned audio, and checked-in runtime manifest data. Do not claim full
legacy parity. Remaining Solitude work is generated GLB art/collision import,
cooked collision products, old particle/firefly population parity,
post-processing/reflection rendering, production light tuning, and any future
partition/streaming ownership.

Validation recorded during admission:

- `pnpm --dir apps/game.megameal test:runtime-scene-contract` passed.
- `pnpm --dir apps/game.megameal test:level-authoring-contract` passed for 6
  runtime scene manifests.
- `pnpm --dir apps/game.megameal test:audio-contract` passed.
- `pnpm --dir apps/game.megameal test:scene-environment-contract` passed.
