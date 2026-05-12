# AAA Gap 06: Editor Pipeline UX And Publish Readiness

## Goal

Make the editor clearly show what is authored, what is cooked, what is over budget, and what must be fixed before a level or asset can be considered production-ready.

## Parallel Coordination

Before starting or handing off work, read `AAA_PARALLEL_AGENT_COORDINATION.md`. Follow its file ownership map, merge order, and handoff requirements. Do not edit `AAA_GRAPHICS_REFACTOR_TRACKER.md`, `CRUFT_TODO.md`, or generated manifests unless your assigned task explicitly requires it; otherwise, include proposed tracker/TODO text in your handoff for the integration lead.

## Current State

The underlying systems now exist:

- Runtime asset manifest.
- Runtime scene manifests.
- Prefab bake manifest.
- Ground and collision contracts.
- Publish-readiness panel pieces.
- Diagnostics and telemetry.

The UX still needs cleanup so agents and humans do not confuse authoring data, cooked runtime data, legacy systems, and temporary contracts.

## Target Architecture

The editor should act like a production pipeline dashboard:

- Authoring scene status.
- Cooked runtime manifest status.
- Required assets status.
- Collision and spawn readiness.
- Graphics budget status.
- Material backlog status.
- LOD/impostor status.
- Prefab contract status.
- Clear publish blocker list.

No one should need to inspect raw JSON to know why a level is not production-ready.

## Key Files

- `apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte`
- `apps/game/src/threlte/editor/EditorInspectorForm.svelte`
- `apps/game/src/threlte/editor/EditorPropertiesShelf.svelte`
- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/editorAssetController.ts`
- `apps/game/src/threlte/editor/editorBakeSource.ts`
- `apps/game/src/threlte/editor/editorInspectorController.ts`
- `apps/game/src/threlte/editor/editorStyleController.ts`
- `apps/game/src/threlte/ui/RuntimeDiagnosticsPanel.svelte`
- `apps/game/CRUFT_TODO.md`

## Implementation Steps

1. Map current editor surfaces.
   - Identify duplicate inspector/properties controls.
   - Identify where publish readiness appears.
   - Identify where cooked manifest data is already loaded.

2. Define one publish-readiness view model.
   - Inputs: scene document, cooked scene manifest, runtime asset manifest, prefab manifest, terrain manifest.
   - Output: blockers, warnings, current budget numbers, commands to run.

3. Use the view model in UI.
   - Scene tools panel should summarize readiness.
   - Inspector/properties panels should show local actor issues only.
   - Runtime diagnostics should remain runtime-focused.

4. Remove confusing old layers.
   - No duplicate budget calculations in Svelte components.
   - No legacy terrain/collision workflow labels.
   - No hidden editor-only fallback path that gameplay does not use.

5. Add audit coverage for UX data dependencies.
   - If the editor claims publish-ready, `audit:engine` should agree.

## Validation

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
GAME_DEV_PORT=4324 pnpm --dir apps/game smoke:boot
```

If the change touches editor styling or layout, also run:

```bash
pnpm --dir apps/game smoke:engine
```

Passing conditions:

- Editor opens at `/?editor=1` and `/?editor=1/`.
- Publish-readiness data matches cooked manifest/audit data.
- No stale labels for retired systems.
- No duplicated source of truth for budgets or ground/collision contracts.

## Do Not

- Do not add more independent dashboard calculations inside Svelte files.
- Do not make the editor depend on gameplay-only runtime globals.
- Do not hide blockers as warnings.
- Do not add broad CSS blocks as a default fix.

## Done Means

The editor tells an agent exactly what to bake, cook, fix, or ignore before publish, using the same contracts that gameplay and `audit:engine` enforce.
