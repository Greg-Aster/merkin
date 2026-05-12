# AAA Next 06: Editor Production UX

## Goal

Make the level editor the production front door for baking, cooking, validating, and publishing levels without hand-editing JSON or guessing which command to run.

## Coordination

Before starting, read `AAA_NEXT_AGENT_COORDINATION.md`. This agent owns editor UX and publish workflow. Coordinate with asset import, material, streaming, and CI agents so the editor displays the same validation contract used by command-line audits.

## Agent Assignment

Make the editor reflect the real pipeline instead of inventing parallel status. Your job is to expose one production workflow slice in the editor using existing readiness/audit data, while reducing overlap in the editor refactor queue.

Priority target: publish readiness and one actionable blocker group, not a cosmetic dashboard.

## Current Baseline

- Editor boot smoke passes for `?editor=1` and `?editor=1/`.
- Scene tools include publish-readiness plumbing.
- Editor still has several refactor queue files in `CRUFT_TODO.md`.
- Normal creators can still fall back to hand-editing scene JSON.

## Target Architecture

The editor should expose a single clear pipeline:

```txt
edit scene
  -> validate authoring state
  -> bake terrain/collision/prefabs
  -> cook runtime assets
  -> run audits
  -> publish runtime manifests
```

The UI should show blockers, warnings, measured budgets, and exact commands only when needed.

## Work Packages

1. Consolidate readiness sources.
   - Avoid duplicate readiness calculations.
   - Use cooked runtime manifests and audit summaries.
   - Show stale generated output clearly.

2. Add publish action model.
   - Define command sequence and expected outputs.
   - Start with command preview if full execution from editor is too risky.
   - Keep dangerous/generated writes explicit.

3. Add authoring panels.
   - Asset import status.
   - Material compliance status.
   - LOD/impostor status.
   - Collision/render parity status.
   - Streaming/world partition status.

4. Reduce editor cruft.
   - Tackle `CRUFT_TODO.md` editor refactor queue one slice at a time.
   - Remove overlapping inspector/properties logic.
   - Keep panel boundaries clear.

5. Add editor smoke coverage.
   - Verify publish-readiness panel renders.
   - Verify level switch and selected actor UI remain stable.

## Key Files

- `apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/src/threlte/editor/EditorInspectorForm.svelte`
- `apps/game/src/threlte/editor/EditorPropertiesShelf.svelte`
- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/editorAssetController.ts`
- `apps/game/src/threlte/editor/editorBakeSource.ts`
- `apps/game/CRUFT_TODO.md`

## Validation

Run:

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
pnpm --dir apps/game audit:engine
```

If editor style or panel CSS changes, report the CSS surface area in handoff.

## Do Not

- Do not add another readiness system parallel to `editorPublishReadiness.ts`.
- Do not run generated writes silently from a UI button.
- Do not duplicate inspector/properties controls.
- Do not bury blockers behind friendly text.

## Done Means

- Editor shows actionable publish readiness from runtime/audit data.
- One publish workflow slice is usable without hand-editing JSON.
- Editor boot smoke passes.
- Refactor queue is reduced, not expanded.
