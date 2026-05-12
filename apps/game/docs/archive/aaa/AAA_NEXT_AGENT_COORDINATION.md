# AAA Next Agent Coordination

Use this file for the next-stage AAA engine work. The completed six-gap phase established a functional pipeline. This phase turns it into a production-grade browser game engine.

## Source Docs

| Area | Document | Owner |
| --- | --- | --- |
| Authored PBR material pass | `AAA_NEXT_01_AUTHORED_PBR_MATERIALS.md` | Material agent |
| Runtime/authoring separation | `AAA_NEXT_02_RUNTIME_AUTHORING_SEPARATION.md` | Runtime boundary agent |
| Asset import pipeline | `AAA_NEXT_03_ASSET_IMPORT_PIPELINE.md` | Import/build agent |
| Lighting/reflection/art direction | `AAA_NEXT_04_LIGHTING_REFLECTION_ART_DIRECTION.md` | Rendering art agent |
| Performance certification | `AAA_NEXT_05_PERFORMANCE_CERTIFICATION.md` | Performance agent |
| Editor production UX | `AAA_NEXT_06_EDITOR_PRODUCTION_UX.md` | Editor agent |
| Streaming/world partition | `AAA_NEXT_07_STREAMING_WORLD_PARTITION.md` | Streaming agent |
| Runtime rendering architecture | `AAA_NEXT_08_RUNTIME_RENDERING_ARCHITECTURE.md` | Runtime rendering agent |
| Physics/collision authoring | `AAA_NEXT_09_PHYSICS_COLLISION_AUTHORING.md` | Physics agent |
| CI/release pipeline | `AAA_NEXT_10_CI_RELEASE_PIPELINE.md` | CI/release agent |

## Current Verified Baseline

Last known integrated baseline:

- `pnpm --dir apps/game lint`: passing
- `pnpm --dir apps/game type-check`: passing
- `pnpm --dir apps/game audit:runtime-prefabs`: passing with `proceduralContracts=0`
- `pnpm --dir apps/game audit:engine`: passing with `lodTargetMisses=0`, `missingRecommendedSlots=355`, `unapprovedRecommendedSlots=0`
- `pnpm --dir apps/game smoke:engine`: passing
- `GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot`: passing
- `GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:visual`: passing
- `GAME_DEV_PORT=4322 GAME_RELEASE_GATE_PORT=4330 pnpm --dir apps/game release:gate`: passing
- `pnpm --dir apps/game baseline:performance`: passing with warnings; not strict-certified
- `pnpm --dir apps/game profile:resources`: passing with warnings

If an agent changes files after this baseline, that agent must report which checks were rerun.

## Integration Lead Rules

One integration lead should own:

- Merge order.
- Cross-agent conflict decisions.
- Generated manifest regeneration.
- Final `AAA_GRAPHICS_REFACTOR_TRACKER.md` updates.
- Final `CRUFT_TODO.md` updates.
- Final verification command run.

Individual agents should not edit shared tracker docs unless explicitly assigned. Prefer handing proposed tracker text to the integration lead.

## Recommended Work Order

1. Runtime/authoring separation.
   - Reduces shipping cruft before more systems depend on current file layout.

2. Asset import pipeline.
   - Gives material, collision, and performance work stable source metadata.

3. Authored PBR material vertical slice.
   - Reduces the biggest visible quality gap.

4. Lighting/reflection/art direction vertical slice.
   - Uses improved material data and creates visual baseline targets.

5. Runtime rendering architecture.
   - Clarifies render phases before larger performance and streaming gates.

6. Streaming/world partition maturity.
   - Depends on clearer asset and render lifecycle contracts.

7. Physics/collision authoring.
   - Can proceed in parallel with streaming if collision readiness gates are coordinated.

8. Editor production UX.
   - Should display the mature validation contracts, not invent its own.

9. Performance certification.
   - Should use stable render/material/streaming behavior for real baselines.

10. CI/release pipeline.
   - Should make approved checks required after they are stable locally.

This order can change for narrow fixes, but schema changes and generated-output changes must be coordinated.

## File Ownership Rules

| File Area | Primary Owner | Notes |
| --- | --- | --- |
| `runtimePrefab*` runtime modules | Runtime boundary agent | Material/VFX agents should avoid runtime branching here unless assigned. |
| `scripts/cook-runtime-assets.mjs` and runtime asset manifest libs | Import/build agent | Material/performance agents can propose fields but should not create competing manifests. |
| `AAA_GRAPHICS_CONTENT_BACKLOG.md` | Material agent or integration lead | Regenerate from manifest; do not hand-edit counts. |
| `SimplePostProcessing.svelte`, render profiles, visual smoke | Rendering art agent | Coordinate with performance before raising effect cost. |
| `performance-baselines.json`, runtime telemetry | Performance agent | Coordinate with rendering and streaming. |
| Editor Svelte panels and publish readiness | Editor agent | Do not duplicate audit logic in UI components. |
| World partition, GLTF cache, preloader | Streaming agent | Do not bypass required readiness gates. |
| Collision policy, collision overlay, terrain/collider bake | Physics agent | Render mesh must not become default collider. |
| Package scripts, CI workflow files, release gate docs | CI/release agent | Do not turn flaky checks into hard gates prematurely. |
| `AAA_GRAPHICS_REFACTOR_TRACKER.md`, `CRUFT_TODO.md` | Integration lead | Agents propose updates in handoff unless told otherwise. |

## Conflict Rules

- If two agents change the same schema, stop and nominate one schema owner.
- If two agents regenerate manifests, discard partial generated outputs and regenerate once from the integrated source state.
- If an agent raises a budget, require the measured audit line and a note explaining why optimization was not enough.
- If an agent weakens an audit, require a replacement validation path.
- If an agent adds level-specific runtime branches, reject unless it is a temporary adapter with a removal task.
- If a change touches `apps/megameal/public/generated/runtime-game-assets`, require generated-output rationale and audit results.

## Handoff Requirements

Every agent handoff must include:

- Files changed.
- Generated files changed.
- Commands run.
- Commands not run and why.
- Runtime payload impact.
- Collision/readiness impact.
- Material/LOD/render budget impact.
- CSS surface area if any Svelte/UI styling changed.
- Remaining risks.
- Proposed tracker/TODO text if status changed.

## Shared Validation Commands

Small code-only changes:

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
```

Engine, manifest, asset, terrain, collision, prefab, or level changes:

```bash
pnpm --dir apps/game audit:runtime-prefabs
pnpm --dir apps/game audit:engine
pnpm --dir apps/game smoke:engine
```

Browser runtime changes:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

Rendering, lighting, material, camera, or post-processing changes:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:visual
```

Release-gate browser checks:

```bash
pnpm --dir apps/game release:gate
```

`release:gate` owns its browser smoke port and defaults to `4330` through
`GAME_RELEASE_GATE_PORT`. Use `GAME_DEV_PORT=4322` only for manual smoke checks
against a deliberately reused local server.

Generated asset changes:

```bash
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game report:graphics-backlog:write
pnpm --dir apps/game audit:engine
```

## Final Done For This Phase

This next phase is complete when:

- Runtime bundles do not include authoring/bake-only systems.
- Material backlog is reduced and grouped by real art tasks.
- Source asset import is reproducible and validated.
- Visual profiles have stable baselines.
- At least one level is performance-certified per platform profile.
- Editor publish readiness drives the normal workflow.
- Streaming and collision readiness are observable at runtime.
- CI/release gates prevent accidental regression.
