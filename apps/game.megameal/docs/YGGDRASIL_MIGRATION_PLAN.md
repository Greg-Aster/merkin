# Yggdrasil Migration Plan

Status: direct primitive-parity playable foundation implemented and admitted to
the portal arena; full old-scene parity remains future work.

Created: 2026-06-06.

Source engine: `/home/greggles/Merkin/apps/game`
Target engine: `/home/greggles/Merkin/apps/game.megameal`

## Intent

Migrate Yggdrasil as a compact, target-owned playable foundation in
`apps/game.megameal` without importing old runtime/editor code, loading old
generated runtime scene JSON, or depending on old generated GLB output.

The first packet produces `yggdrasil_runtime`, linked from the portal arena
only after contract, runtime-scene, content-graph, and cleanup validation pass.

## Source Evidence

Primary provenance source:

- `apps/game/authoring/scene-backups/yggdrasil/yggdrasil.scene.20260418-185617.original-packaged.json`

Reason: this older backup is primitive-heavy and more manageable than the later
generated-asset versions. It contains 248 nodes: 125 primitive nodes, 59 group
nodes, 28 asset nodes, and 36 prefab nodes. It also captures the old source
spawn, observatory skybox preset, ruin-whispers audio preset, water settings,
ambient particle settings, and key Yggdrasil layout IDs such as
`yggdrasil-ground`, `yggdrasil-mound`, `yggdrasil-dais`,
`yggdrasil-bifrost-path`, the root ring, the three wells, and approach stones.

Secondary provenance only:

- `apps/game/src/threlte/editor/scenes/yggdrasil.scene.json`
- `apps/game/authoring/scene-backups/yggdrasil/yggdrasil.2026-05-14T22-06-09-174Z.pre-cli-reimagine.json`
- `apps/megameal/public/generated/runtime-game-assets/scenes/yggdrasil.runtime-scene.json`
- `apps/megameal/public/runtime-world-partitions/yggdrasil.partition.json`

These later files document generated-asset, world-partition, budget, and
runtime-readiness history. They are not runtime inputs for the target engine.

## Contract Owner

`YggdrasilLevelContract` is registered in `ENGINE_CONTRACT_REGISTER.md` and
owns the implemented compact playable foundation plus future parity work.

The contract owns:

- `src/game/assets/yggdrasilAssets.ts`
- `src/game/prefabs/yggdrasilPrefabs.ts`
- `src/game/levels/yggdrasilLevel.ts`
- `src/game/levels/renderProfiles.ts` entry for `yggdrasilRenderProfile`
- `src/game/levels/runtimeSceneManifests.ts` entry for
  `yggdrasilRuntimeSceneManifest`
- Portal-arena transition to `yggdrasil_runtime` only after validation passes
- Focused validation in the existing runtime-scene and level-authoring contract
  tests

Forbidden shortcuts:

- Do not import from `apps/game`.
- Do not load old generated runtime scene JSON or old partition JSON at runtime.
- Do not copy old Svelte, Threlte, Three, editor repair, or scene lifecycle
  code.
- Do not add a Yggdrasil cook script in this packet.
- Do not treat render meshes as walkable collision without explicit
  `walkable/worldStatic` ownership.
- Do not add the portal-arena transition until `yggdrasil_runtime` has passing
  readiness and content-graph validation.

## First Playable Foundation Scope

The first packet is direct primitive parity for the older primitive-heavy
backup, authored in target-engine data:

- Runtime scene ID: `yggdrasil_runtime`
- Level ID: `yggdrasil`
- Scene ID: `yggdrasil_game`
- Player spawn derived from old source evidence, with target-engine
  `CharacterController` kinematic collision.
- Target-owned primitive content data under `PrimitiveSceneContentContract`,
  generated from the old primitive-heavy backup as checked-in source data.
- Target-owned primitive mesh/material assets, prefabs, level instances, and
  readiness data for all `125` old primitive nodes.
- Explicit `walkable/worldStatic` collision stable IDs for the authored
  primitive walkable set, including the basin surfaces, Bifrost approach, path
  stones, crown path ramps/landings, final platform/bridge, and spawn pad.
- Explicit `solid/worldStatic` collision stable IDs for every non-walkable old
  primitive collision node.
- A return portal to `portal_arena_runtime`.
- A small number of story-note or lore markers for Yggdrasil identity.
- Manifest-owned audio using existing target-engine audio assets where possible.
- Manifest-owned cubemap environment using existing observatory skybox support.
- Render profile with honest disabled/off post-processing unless adapter-backed
  behavior already exists.

Deferred future work:

- Full generated GLB parity.
- Old world-partition streaming parity.
- Full water rendering/gameplay-volume behavior.
- Ambient particle and large firefly population parity.
- Production lighting, shadows, post-processing, and reflection tuning.
- Editor import/cook/write tooling for Yggdrasil.

## Implementation Steps

1. Capture provenance in `docs/YGGDRASIL_MIGRATION_PROVENANCE.md` with source
   paths, node counts, selected primitive IDs, spawn/settings evidence, and
   explicit future parity exclusions.
2. Keep `YggdrasilLevelContract` aligned with the main migration plan while
   Yggdrasil foundation and future parity work continue.
3. Add target-owned Yggdrasil assets, prefabs, level data, render profile, audio
   manifest references, and runtime scene manifest.
4. Add fail-closed runtime-scene and level-authoring validation for
   `yggdrasil_runtime`, including negative cases for missing required assets,
   collision stable IDs, walkable stable IDs, lights, and portal targets.
5. Add the portal-arena Yggdrasil slot only after the Yggdrasil runtime manifest
   passes validation.
6. Run focused validation and cleanup checks, then update this plan with the
   final implementation state.

## Validation Plan

Focused commands:

```bash
pnpm --dir apps/game.megameal test:runtime-scene-contract
pnpm --dir apps/game.megameal test:level-authoring-contract
pnpm --dir apps/game.megameal test:audio-contract
pnpm --dir apps/game.megameal test:scene-environment-contract
pnpm --dir apps/game.megameal test:story-note-contract
pnpm --dir apps/game.megameal audit:engine-boundaries
git diff --check -- apps/game.megameal
```

Expected broader checks:

```bash
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal lint
```

Current validation status: the compact Yggdrasil foundation passed the focused
commands above plus type-check and lint on 2026-06-06. Continue to avoid
unrelated terrain or Miranda cook/import work in this packet unless explicitly
redirected.

## Sub-Agent Work Plan

Six agents should assist with disjoint scopes:

1. Provenance agent: inspect old Yggdrasil source files and draft
   `docs/YGGDRASIL_MIGRATION_PROVENANCE.md`.
2. Contract/docs agent: update `ENGINE_CONTRACT_REGISTER.md`,
   `docs/GAME_ENGINE_MIGRATION_PLAN.md`, `ARCHITECTURE.md`, and
   `GAME_ENGINE_DESIGN_DOCUMENT.md` for the Yggdrasil foundation status.
3. Asset/prefab agent: add target-owned assets and prefabs only in
   `src/game/assets` and `src/game/prefabs`.
4. Level/runtime agent: add `yggdrasilLevel`, render profile, runtime manifest,
   exports, and default catalog wiring, but do not add the portal-arena slot
   before validation is ready.
5. Validation agent: update focused runtime-scene, level-authoring, audio,
   environment, and story-note contract coverage for Yggdrasil.
6. Cleanup/review agent: audit final changed scope for architecture violations,
   old-app runtime dependencies, stale docs, unused exports, orphan tests, and
   validation gaps.

## Progress Log

- 2026-06-06: Plan opened. Older primitive-heavy backup selected as primary
  provenance. Implementation not started.
- 2026-06-06: Contract/docs alignment added `YggdrasilLevelContract` as active
  foundation work in the register and main architecture/migration docs.
- 2026-06-06: Compact foundation implemented as `yggdrasil_runtime` with
  target-owned primitive assets/prefabs/level data, explicit basin/mound/dais
  and Bifrost walkable collision, cubemap environment readiness, manifest-owned
  audio, a story marker, return portal, and portal-arena admission after focused
  runtime-scene, content-graph, audio, environment, story-note, boundary,
  type-check, lint, and diff validation passed. Old generated runtime scene and
  partition JSON remain provenance only.
