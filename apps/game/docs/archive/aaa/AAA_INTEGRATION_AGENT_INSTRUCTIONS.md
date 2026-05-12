# AAA Integration Agent Instructions

Use this document when the six AAA gap agents have produced work that needs to be cleaned up, unified, validated, and handed back as one coherent engine update.

This is not a new feature brief. This is an integration brief.

## First Rule

Do not start by rewriting code. Start by reading and measuring.

Read these files first:

- `AGENTS.md`
- `apps/game/AGENTS.md`
- `apps/game/AAA_PARALLEL_AGENT_COORDINATION.md`
- `apps/game/AAA_GRAPHICS_REFACTOR_TRACKER.md`
- `apps/game/CRUFT_TODO.md`
- All six `apps/game/AAA_GAP_*.md` briefs

Then inspect the worktree:

```bash
git status --short apps/game apps/megameal/public/generated/runtime-game-assets
git diff --stat -- apps/game apps/megameal/public/generated/runtime-game-assets
```

Assume the worktree is dirty because multiple agents have been working. Do not revert unrelated changes. Do not run destructive git commands.

## Current Integration Context

Last known monitor snapshot on 2026-05-10:

- `pnpm --dir apps/game type-check`: passing
- `pnpm --dir apps/game audit:runtime-prefabs`: passing with `prefabs=20`, `proceduralContracts=2`, `assetAnimations=4`, `assetVfx=1`, `payload=785.6KB`
- `pnpm --dir apps/game audit:engine`: passing with `lodTargetMisses=0`, `missingRecommendedSlots=416`, `unapprovedRecommendedSlots=0`, and render profiles present

Known process issue:

- Several agents touched shared tracker/TODO files and generated runtime manifests. Treat those outputs as provisional until you regenerate them once from the final integrated source state.

## Integration Goals

Produce one coherent state where:

- Runtime prefab contracts are unified.
- VFX descriptor plumbing is consistent.
- Material and LOD manifest changes are regenerated from source, not stitched together by hand.
- Render profile changes use one schema and one validation path.
- Editor publish-readiness uses cooked manifest/audit data, not duplicate calculations.
- `AAA_GRAPHICS_REFACTOR_TRACKER.md` and `CRUFT_TODO.md` reflect the final state.
- The final validation suite passes.

## Worktree Hygiene

Before editing:

1. Capture the current status and diff stat.
2. Identify which files are shared across agents.
3. Identify generated files.
4. Identify files that are unrelated to the AAA graphics integration.

High-risk shared files include:

- `apps/game/src/threlte/engine/runtimePrefabTypes.ts`
- `apps/game/src/threlte/engine/runtimePrefabCatalog.json`
- `apps/game/src/threlte/engine/runtimePrefabCatalog.ts`
- `apps/game/src/threlte/engine/runtimePrefabVfxController.ts`
- `apps/game/src/threlte/levels/RuntimePrefabNode.svelte`
- `apps/game/scripts/bake-runtime-prefabs.mjs`
- `apps/game/scripts/cook-runtime-assets.mjs`
- `apps/game/scripts/lib/runtimeAssetCookManifest.mjs`
- `apps/game/scripts/lib/runtimeAssetManifestAudit.mjs`
- `apps/game/scripts/lib/runtimeSceneManifest.mjs`
- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`

Generated/provisional files include:

- `apps/megameal/public/generated/runtime-game-assets/manifest.json`
- `apps/megameal/public/generated/runtime-game-assets/manifest.previous.json`
- `apps/megameal/public/generated/runtime-game-assets/scenes/*.runtime-scene.json`
- `apps/megameal/public/generated/runtime-game-assets/prefabs/**`
- `apps/megameal/public/generated/runtime-game-assets/impostors/**`
- `apps/game/AAA_GRAPHICS_CONTENT_BACKLOG.md`

Do not manually edit generated JSON or GLBs unless you are fixing the generator itself and then regenerating.

## Required Review Passes

### 1. Prefab And VFX Contract Review

Check:

- `runtimePrefabCatalog.json` has no prefab both in `assetUrls` and `proceduralRuntime`.
- Remaining procedural contracts are only the intended temporary ones.
- `assetAnimations` and `assetVfx` target baked assets.
- Node and VFX targets are validated against baked prefab mesh/node names.
- `RuntimePrefabNode.svelte` is only an adapter, not a pile of prefab-specific branches.
- `runtimePrefabVfxController.ts` owns reusable VFX logic.

Run:

```bash
pnpm --dir apps/game audit:runtime-prefabs
```

Expected direction:

- `proceduralContracts` should reach `0`, or any remaining entries must be explicitly documented as temporary with migration target and validation coverage.

### 2. Runtime Asset And Content Backlog Review

Check:

- Material backlog changes are generated from the manifest.
- LOD fixes did not loosen audit thresholds just to pass.
- Runtime payloads remain within budgets.
- Generated GLB churn is explained by cooker or source-art changes.

Regenerate once after source integration:

```bash
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game report:graphics-backlog:write
```

Expected direction:

- `lodTargetMisses=0`
- `unapprovedRecommendedSlots=0`
- `missingRecommendedSlots` should be lower than the old `503`, or any increase must be explained by newly tracked assets.

### 3. Render Profile Review

Check:

- Render profile schema appears in a single shared type/manifest path.
- Level scene JSON files use the same profile shape.
- Runtime systems consume the profile through a store or typed adapter.
- Post-processing, lighting, shadows, and quality tier behavior are budgeted.
- Visual smoke baselines are updated only when the rendered output intentionally changes.

Run when render/profile work changed:

```bash
pnpm --dir apps/game smoke:visual
```

If visual smoke cannot run, document why and run `smoke:engine` and `smoke:boot`.

### 4. Editor Publish-Readiness Review

Check:

- Publish readiness has one view model.
- Editor UI does not duplicate budget/material/LOD calculations that already exist in manifest/audit code.
- Editor blockers match `audit:engine`.
- The editor still opens at both `/?editor=1` and `/?editor=1/`.

Run:

```bash
GAME_DEV_PORT=4324 pnpm --dir apps/game smoke:boot
```

### 5. Tracker And TODO Review

Only after source and generated output are stable:

- Update `AAA_GRAPHICS_REFACTOR_TRACKER.md`.
- Update `CRUFT_TODO.md`.
- Update `AAA_PARALLEL_AGENT_COORDINATION.md` final status.
- Keep dated log entries factual and metric-based.

Do not mark a gap complete because code exists. Mark it complete only if audits and smoke checks prove it.

## Final Regeneration Sequence

After integrating source changes and resolving conflicts, regenerate generated output once:

```bash
pnpm --dir apps/game bake:runtime-prefabs
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game report:graphics-backlog:write
```

Then run final checks:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:runtime-prefabs
pnpm --dir apps/game audit:engine
pnpm --dir apps/game smoke:engine
GAME_DEV_PORT=4324 pnpm --dir apps/game smoke:boot
```

If render/profile work landed:

```bash
pnpm --dir apps/game smoke:visual
```

Before handoff:

```bash
git diff --check
ss -ltnp | rg '432[0-9]' || true
```

Do not leave temporary dev servers running unless they predated your work and are not yours.

## Rejection Criteria

Reject or revise a patch if it:

- Reintroduces packaged scene fallback or runtime-level settings fallback.
- Hides errors by loosening audits without a replacement validation path.
- Raises a budget without a measured audit line.
- Adds one-off level branches for lighting, VFX, prefab behavior, or editor readiness.
- Treats render meshes as collision meshes without an explicit collision contract.
- Adds generated artifacts that cannot be reproduced by the documented commands.
- Adds broad CSS or UI styling unrelated to the editor readiness task.
- Makes the editor say publish-ready while `audit:engine` fails.

## Handoff Format

Final handoff should include:

- Integrated areas.
- Remaining procedural prefab contracts, if any.
- Runtime payload/material/LOD metrics.
- Collision/readiness impact.
- Generated files regenerated.
- Commands run and results.
- Commands not run and why.
- New CSS surface area, if any.
- Remaining risks and next recommended engine step.

## Expected End State

The integration is complete when the repo has one coherent AAA graphics pipeline state:

- Runtime scenes load cooked manifests.
- Runtime prefabs are asset-backed or explicitly validated by VFX descriptors.
- LOD, material, render profile, streaming, and readiness data are manifest-backed.
- Editor readiness reflects the same source of truth as the audits.
- Trackers describe the actual integrated state, not partial parallel-agent notes.
