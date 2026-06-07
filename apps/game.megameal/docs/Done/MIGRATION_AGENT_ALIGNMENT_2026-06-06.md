# Migration Agent Alignment - 2026-06-06

## Purpose

This file aligns concurrent migration work in `apps/game.megameal` when more
than one agent is touching runtime scenes, level data, shared contracts, or
validation. It is a coordination document, not a replacement for:

- `ARCHITECTURE.md`
- `GAME_ENGINE_DESIGN_DOCUMENT.md`
- `ENGINE_CONTRACT_REGISTER.md`
- `docs/GAME_ENGINE_MIGRATION_PLAN.md`
- `docs/Done/MIGRATION_ACTIVE_WORK_PLAN_2026-06-06.md`
- `docs/MIGRATION_HANDOFF_2026-06-06.md`
- `docs/CLEANUP_REMINDER.md`

The goal is one engine, one contract model, and multiple small level packets
that can be validated independently before a combined branch validation.

## Current Situation

There are at least two active migration streams:

| Stream | Primary goal | Primary ownership |
| --- | --- | --- |
| Miranda migration | Continue extracting old Miranda content into checked-in target-engine level, prefab, readiness, portal, audio, and collision data. | `src/game/levels/defaultLevels.ts`, Miranda prefab data in `src/game/prefabs/defaultPrefabs.ts`, shared portal owners when the packet specifically requires them, and Miranda rows in runtime manifests and migration docs. |
| Observatory playable foundation | Build the target-engine Observatory foundation with visual level data, authored collision proxies, shared water/environment use, light readiness, and portal reachability. | `src/game/levels/observatoryLevel.ts`, `src/game/prefabs/observatoryPrefabs.ts`, Observatory assets, Observatory rows in runtime manifests, Observatory-specific docs, and reusable environmental contracts only when intentionally shared. |

These streams are allowed to proceed in parallel only if they do not make
conflicting assumptions about shared engine contracts. A per-stream validation
pass is not the same thing as a clean combined branch validation when the dirty
tree contains work from both streams.

## Shared Objective

Both agents are contributing to the same migration:

1. Move useful authored content from old `apps/game` into the new
   `apps/game.megameal` architecture.
2. Keep old `apps/game` reference-only.
3. Express runtime behavior through engine contracts, data schemas, manifests,
   components, resources, commands, events, systems, and adapters.
4. Keep levels as authored target-engine content, not runtime repairs.
5. Preserve reusable systems as shared contracts instead of level-local
   one-offs.

## Shared Contract Boundaries

The following files and contracts are integration points. Do not treat them as
private to one level agent:

| Shared area | Owner rule |
| --- | --- |
| `src/engine/data/schemas/index.ts` | Schema changes must be contract changes, not level hacks. Update validation and docs in the same packet. |
| `src/engine/data/manifests/index.ts` | Readiness behavior must stay generic. No level-ID branches or silent repair of missing authored data. |
| `src/game/levels/runtimeSceneManifests.ts` | Runtime scenes can list level-owned requirements, but the catalog must remain the single checked-in runtime scene map. |
| `src/game/prefabs/index.ts` and `src/game/assets/index.ts` | Only export durable shared owners. Do not add dead exports or temporary staging modules. |
| `src/game/runtime/index.ts` | Runtime composition owns system registration and manifest scene loading. Do not move scene logic into UI or app shell code. |
| `scripts/test-runtime-scene-contract.ts` | This is a focused contract test owner, but new assertions must stay readable. If it grows beyond clear ownership, split by contract rather than turning it into a catch-all. |
| `ENGINE_CONTRACT_REGISTER.md` | Update before or with any contract behavior change. Status must distinguish implemented foundation from future work. |
| `GAME_ENGINE_DESIGN_DOCUMENT.md` | Use for architectural intent and data-flow decisions, not packet progress logs. |

## Level Workstream Rules

Miranda packets should:

- Keep migrating one small slice at a time.
- Use old `apps/game` only as read-only evidence.
- Add checked-in target-engine prefabs, level instances, assets, and manifest
  readiness for each migrated behavior.
- Require explicit `walkable/worldStatic` collision before expanding movement
  bounds.
- Keep broader terrain/cooked collision, editor tooling, and generated import
  pipelines marked as future unless they are implemented and validated.

Observatory packets should:

- Keep Observatory visual content, collision proxies, water, lights, and portal
  reachability expressed through the same shared target-engine contracts.
- Use `WaterSurfaceContract`, `SkyboxEnvironmentContract`,
  `AuthoredLightContract`, `PlayerCarriedLightContract`,
  `ObservatoryCollisionContract`, and `RuntimeSceneManifest` instead of
  Observatory-only runtime shortcuts.
- Keep the GLB visual scene separate from authored walkable and boundary
  collision.
- Keep full terrain chunks, dynamic water behavior, reflections,
  post-processing, scene music, and population tooling marked as future unless
  they are implemented and validated.

## Integration Rules

When both streams are active:

1. Each agent must list the exact files they own before editing shared files.
2. Only one agent should edit shared contract files at a time unless the change
   is explicitly coordinated in this document or a newer alignment note.
3. A level agent may validate their own packet, but must label that as
   packet-scoped validation if the dirty tree contains another agent's work.
4. The combined branch is not validated until the full shared gate passes after
   all active streams stop changing files.
5. Docs must not claim the whole migration or combined branch is complete
   because one packet validated.
6. New reusable assets or prefabs must be named and placed by ownership:
   shared systems in shared owner files, level-only content in level owner
   files.
7. Validation failures in shared tests belong to the shared integration state,
   not automatically to the last agent who touched a level file.

## Combined Validation Gate

Run this only after both active streams have stopped changing files:

```bash
pnpm --dir apps/game.megameal lint
pnpm --dir apps/game.megameal test:input-contract
pnpm --dir apps/game.megameal test:charged-action-contract
pnpm --dir apps/game.megameal test:story-note-contract
pnpm --dir apps/game.megameal test:scene-environment-contract
pnpm --dir apps/game.megameal test:runtime-scene-contract
pnpm --dir apps/game.megameal test:audio-contract
pnpm --dir apps/game.megameal test:audio-spatial-contract
pnpm --dir apps/game.megameal test:light-contract
pnpm --dir apps/game.megameal test:water-firefly-contract
pnpm --dir apps/game.megameal test:level-authoring-contract
pnpm --dir apps/game.megameal test:generated-glb-import-contract
pnpm --dir apps/game.megameal test:terrain-import-pipeline-contract
pnpm --dir apps/game.megameal test:terrain-cook-contract
pnpm --dir apps/game.megameal test:kinematic-character-contract
pnpm --dir apps/game.megameal test:collision-overlay-view-model
pnpm --dir apps/game.megameal test:level-editor-aaa-plan-contract
pnpm --dir apps/game.megameal test:level-editor-collision-cook-contract
pnpm --dir apps/game.megameal test:live-preview-protocol-contract
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal build
pnpm audit:legacy-game-references
git diff --check -- apps/game.megameal pnpm-lock.yaml
```

If a `test:*` package script hits a sandbox-only `tsx` pipe error, rerun the
same script through the direct `pnpm --dir apps/game.megameal exec tsx ...`
form and report both the initial failure and the direct rerun result.

Do not run a dev server, browser smoke check, or full app smoke harness unless
the user explicitly asks.

## Immediate Alignment Checklist

Decision for the current dirty tree:

- The current dirty tree is being integrated as **one combined engine packet**.
- Miranda and Observatory are not separate architectures. They are level content
  streams consuming the same shared runtime-scene, collision, readiness, asset,
  prefab, render, audio, and cleanup contracts.
- The earlier split-vs-combined language was source-control coordination only,
  not an endorsement of separate level systems.

Before either agent expands scope:

- [x] Decide that the current dirty tree is being integrated as one combined
      engine packet.
- [x] Confirm the Miranda handoff lists only Miranda-owned files, or update it
      to say the branch also contains Observatory work.
- [x] Confirm Observatory docs and runtime-scene tests agree on whether
      `observatory:walkable-mesh` is `walkable/worldStatic` and whether
      boundary blockers are required readiness data.
- [x] Fix formatting and contract-test failures before adding new content.
- [x] Confirm every untracked file is intentional and referenced by source,
      docs, or validation.
- [x] Rerun the combined validation gate only after the dirty tree is stable.

## Completion Standard

The aligned migration state is acceptable only when:

- Each stream has an honest packet status.
- Shared contracts have one documented owner and one validation path.
- The combined dirty tree passes the full validation gate.
- No temporary probes, one-off scripts, dead exports, stale docs, duplicate
  docs, generated scratch files, or unexplained untracked files remain.
- Remaining work is recorded as future work, not implied to be already
  implemented.
