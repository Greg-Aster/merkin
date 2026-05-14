# Agent 05: Editor Terrain UX And Publish Flow

## Mission

Make the level editor expose the terrain pipeline clearly:

```txt
Import Source
  -> Bake Render Chunks
  -> Bake Collision
  -> Validate
  -> Publish
```

The editor should make it obvious whether a level is using scene-authored
terrain, heightfield terrain, or GLB chunk terrain.

## Context

The current editor already has controls and routes for terrain heightmap
generation, terrain collision bake, chunk cooking, save, and publish. The issue
is that these actions are spread across panels and do not present a single
terrain product contract.

## Ownership

Primary files:

- `apps/game/src/threlte/editor/EditorCollisionTabHost.svelte`
- `apps/game/src/threlte/editor/EditorWorldTabHost.svelte`
- `apps/game/src/threlte/editor/EditorWorkflowPanel.svelte`
- `apps/game/src/threlte/editor/EditorPublishReadinessPanel.svelte`
- `apps/game/src/threlte/editor/editorPublishBakePlan.ts`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/scripts/editor-tools/terrainRoutes.cjs`

Secondary files if needed:

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/editorLevelController.ts`
- `apps/game/src/threlte/editor/EditorSavePanel.svelte`

## Requirements

Create or refine editor UX so authors can see:

- terrain mode
- authoritative visual source
- source GLB/GLTF URL
- source hash/provenance if available
- render chunk status
- collision status
- fallback surface status
- dirty/stale/published state
- publish blockers

The UX must avoid ambiguous labels like "bake terrain" when the action only
does heightmap generation or only cooks visual chunks.

Use explicit commands:

- `Generate Heightmap`
- `Cook Heightfield Chunks`
- `Cook GLB Chunks`
- `Bake Terrain Collision`
- `Validate Terrain Contract`
- `Publish Level`

Only show commands valid for the selected terrain mode.

## Publish Behavior

Publish should run the terrain steps required by the mode:

```txt
scene-authored:
  save scene
  cook runtime scene/assets
  validate scene actors/collision

heightfield-terrain:
  generate heightmap when dirty
  bake heightfield collision
  cook heightfield visual chunks when enabled
  cook runtime scene/assets
  validate

glb-chunk-terrain:
  cook GLB render chunks
  bake/source terrain collision
  cook runtime scene/assets
  validate
```

Do not silently publish stale terrain products.

## Non-Goals

- Do not implement the GLB chunk cooker.
- Do not rewrite the entire editor shell.
- Do not hide publish failures behind generic save messages.
- Do not special-case observatory.

## Acceptance Criteria

- Editor shows one coherent terrain pipeline state.
- Invalid commands are disabled or explained.
- Save and publish messages say exactly which terrain products were refreshed.
- Playtest/runtime diagnostics reveal when fallback terrain is visible.
- Publish readiness identifies terrain visual ownership conflicts.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
```

If editor smoke is stable in the current branch, run:

```bash
pnpm --dir apps/game editor-ux-smoke
```

If that command is unavailable or unstable, report the blocker and manually
describe the editor workflow exercised.

No Megameal CSS audit is required unless this task touches
`apps/megameal` styles.
