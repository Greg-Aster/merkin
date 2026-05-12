# AAA Remaining Agent Coordination

Use this file to coordinate the next eight-agent pass toward a production-grade browser game engine. This pass is about closing verified code gaps, not producing more planning-only documents.

## Source Docs

| Area | Document | Primary Agent |
| --- | --- | --- |
| Runtime authoring cruft purge | `AAA_REMAINING_01_RUNTIME_AUTHORING_CRUFT.md` | Runtime boundary agent |
| Strict performance certification | `AAA_REMAINING_02_STRICT_PERFORMANCE_CERTIFICATION.md` | Performance agent |
| PBR material backlog closure | `AAA_REMAINING_03_PBR_BACKLOG_CLOSURE.md` | Material/content agent |
| Streaming architecture maturity | `AAA_REMAINING_04_STREAMING_RUNTIME_ARCHITECTURE.md` | Streaming agent |
| Lighting and post-processing upgrade | `AAA_REMAINING_05_LIGHTING_POSTFX_UPGRADE.md` | Rendering agent |
| Editor cruft reduction | `AAA_REMAINING_06_EDITOR_CRUFT_REDUCTION.md` | Editor agent |
| Missing engine pillars | `AAA_REMAINING_07_ENGINE_PILLARS.md` | Gameplay systems agent |
| CI and release enforcement | `AAA_REMAINING_08_CI_RELEASE_ENFORCEMENT.md` | CI/release agent |

## Verified Baseline

The code currently supports these claims:

- Gameplay loads cooked runtime scene manifests and fails if a cooked manifest is missing.
- Release, engine, prefab, visual smoke, world partition, generated drift, resource profile, and performance scripts exist.
- Runtime prefab audit has reached `proceduralContracts=0`.
- Runtime asset audits report `lodTargetMisses=0`, `missingRecommendedSlots=355`, `unapprovedRecommendedSlots=0`.
- Performance capture exists, but strict certification is not complete.
- Runtime scene payloads still include `editor` metadata such as `legacyKind`, so runtime/authoring separation is not finished.
- Editor and gameplay shell files still have large refactor surfaces.

Agents must verify the current value in code before changing behavior. Do not rely only on this baseline if files have moved.

## Shared Rules

- Read `apps/game/AGENTS.md` before editing.
- Keep runtime code and editor/build tooling separate.
- Do not add level-specific runtime branches unless the branch is an explicit temporary adapter with a removal task.
- Do not hand-edit generated count files. Regenerate them from the source pipeline.
- Do not weaken an audit without adding an equivalent or stronger replacement validation.
- Do not update `AAA_GRAPHICS_REFACTOR_TRACKER.md` or `CRUFT_TODO.md` unless assigned integration ownership. Propose tracker text in the handoff instead.
- If a change touches `apps/megameal/public/generated/runtime-game-assets`, include the command that regenerated it and the audit that validates it.

## Recommended Merge Order

1. Runtime authoring cruft purge.
2. Streaming architecture maturity.
3. Lighting and post-processing upgrade.
4. PBR backlog closure.
5. Editor cruft reduction.
6. Missing engine pillars, limited to contracts and thin vertical slices.
7. Strict performance certification.
8. CI and release enforcement.

Performance and CI should hard-fail only after the underlying runtime behavior is stable. If another agent needs a schema change, nominate one owner and avoid competing schema edits.

## Conflict Rules

- Runtime schema conflicts belong to the runtime boundary agent.
- Asset manifest and generated output conflicts require one final regeneration from integrated sources.
- Render cost conflicts require the rendering and performance agents to agree on tier-specific budgets.
- Streaming and collision readiness conflicts must keep player activation gated until required render, collision, and spawn state are valid.
- Editor UI must display audit/readiness data from shared contracts, not duplicate the logic in Svelte panels.

## Validation Commands

Small code changes:

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
```

Engine, manifest, asset, prefab, collision, or level changes:

```bash
pnpm --dir apps/game audit:runtime-prefabs
pnpm --dir apps/game audit:engine
pnpm --dir apps/game smoke:engine
```

Browser runtime changes:

```bash
pnpm --dir apps/game release:gate
```

Rendering, lighting, camera, material, or post-processing changes:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:visual
```

Performance changes:

```bash
pnpm --dir apps/game profile:resources
pnpm --dir apps/game baseline:performance
pnpm --dir apps/game certify:performance
```

Strict gates should be introduced only when stable:

```bash
pnpm --dir apps/game profile:resources:strict
pnpm --dir apps/game baseline:performance:strict
pnpm --dir apps/game certify:performance:strict
```

## Handoff Template

Every agent must report:

- Files changed.
- Generated files changed.
- Commands run.
- Commands not run and why.
- Runtime/editor separation impact.
- Runtime payload impact.
- Collision/readiness impact.
- Material/LOD/render budget impact.
- Performance impact.
- CSS surface area if Svelte or UI styling changed.
- Remaining risks.
- Proposed tracker/TODO text if status changed.

## Done For This Pass

This pass is done when:

- Runtime scene actors ship without editor-only metadata.
- At least one vertical slice is strict performance certified.
- PBR fallback slots are materially reduced and hero-visible fallback use is gated.
- Streaming state, prefetch, activation, and eviction are observable and validated.
- Lighting/postFX has production-grade features behind tiered render profiles.
- Editor workflow uses shared bake/readiness contracts and reduces large panel ownership.
- Missing engine pillars have typed contracts and at least one narrow runtime slice where practical.
- CI enforces the stable gates without relying on flaky or non-strict warning passes.
