# Agent 20: Workspace Composition Deepening

## Goal

Reduce workspace density by composing task-specific panels instead of mounting
whole legacy hosts inside each workspace. The current navigation model is much
better than the old `Workflow` tab, but several workspaces still expose too many
controls and inherited responsibilities.

## Evidence

Focused Playwright audit measured visible controls after switching workspaces:

| Workspace | Visible controls | Visible buttons | Main issue |
| --- | ---: | ---: | --- |
| `Scene` initial | 41 | 21 | acceptable direction, still near the default budget |
| `Create` | 79 | 60 | too many asset/browser/action buttons at once |
| `World` | 93 | 22 | mounts full scene tools plus environment and player tools |
| `Collision` | 53 | 33 | collision policy, terrain, bake, and side-stack controls compete |
| `Build` | 61 | 33 | save, snapshots, diagnostics, AI job output, and registry actions mix |
| `AI Lab` | 39 | 21 | closer, but still depends on service-heavy legacy panels |

Relevant source:

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorSceneTabHost.svelte`
- `apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte`
- `apps/game/src/threlte/editor/EditorCreateTabHost.svelte`
- `apps/game/src/threlte/editor/EditorCreatePanel.svelte`
- `apps/game/src/threlte/editor/EditorCollisionTabHost.svelte`
- `apps/game/src/threlte/editor/EditorSaveTabHost.svelte`
- `apps/game/src/threlte/editor/EditorSavePanel.svelte`
- `apps/game/src/threlte/editor/EditorOutputTabHost.svelte`
- `apps/game/src/threlte/editor/EditorAiTabHost.svelte`

## Required Work

1. Stop mounting whole legacy hosts when a workspace needs only a slice.
   Example: `World` should not render the full `Scene` tool host just to reach
   level/world controls. Split or route the specific level, terrain, environment,
   and player sections.

2. Keep one clear owner for each job.
   - Scene owns selection, hierarchy guidance, transforms, grouping, and scene
     organization.
   - Create owns primitive/prefab/imported/generated asset placement.
   - World owns environment, terrain setup, player spawn, and world partition.
   - Collision owns collision policy, overlay review, per-level bake readiness,
     and terrain collision outputs.
   - Build owns save, validate, package/cook/publish, and runtime diagnostics.
   - AI Lab owns ComfyUI/Hunyuan/style experiments and service health.

3. Move duplicated controls to one primary location.
   Do not keep the same save, selection, transform, collision overlay, or asset
   action as a first-class button in multiple workspaces.

4. Convert deep tool piles into focused subflows.
   Prefer tabs, accordions, or mode-local sections inside a workspace when a
   user must choose between different jobs. Do not show every advanced action
   at once.

5. Keep the viewport dominant.
   Reducing density must not create larger docks or taller default panels. The
   point is less cognitive load, not just more scrolling.

## Suggested Targets

These are product targets, not hard technical limits:

- Initial `Scene`: no more than 35 visible controls.
- `Create`: no more than 45 visible controls on first entry.
- `World`: no more than 45 visible controls on first entry.
- `Collision`: no more than 45 visible controls on first entry.
- `Build`: no more than 45 visible controls on first entry.
- `AI Lab`: no more than 45 visible controls on first entry and clearly labeled
  as experimental/offline-service dependent.

If a workspace legitimately needs more, hide advanced sections behind explicit
subflow selection and document why.

## Acceptance Criteria

- No workspace renders a full unrelated legacy host just to access one section.
- `World` no longer duplicates general scene selection/organization controls.
- `Build` separates normal save/publish from diagnostics and AI job output.
- `Create` has an obvious first action path without exposing the entire asset
  filesystem as first-screen button noise.
- The command palette remains the discovery surface for secondary commands.
- The direct editor UX smoke still passes at `1440x900`, `1280x800`, and
  `900x700`.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

Also capture and report visible control/button counts per workspace after the
change. Use Playwright, not manual eyeballing.

## Handoff Notes

Report:

- Which workspace was reduced.
- Which duplicated controls were removed or demoted.
- Which components were split or newly introduced.
- Any new CSS surface area.
- Updated visible control/button counts for every workspace touched.
