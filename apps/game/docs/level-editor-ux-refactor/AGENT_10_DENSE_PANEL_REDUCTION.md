# Agent 10: Dense Panel Reduction

## Mission

Continue the information architecture cleanup inside dense panels. The first wave
split major workflows into separate tabs, but several panels remain too long or
too control-heavy for AAA-class editor UX.

## Current Evidence

Latest Playwright tab metrics at `1440x900`:

- `Create`: 39 buttons, `1351px` scroll height in a `729px` panel.
- `Output`: `2160px` scroll height in a `729px` panel.
- `Environment`: 42 inputs.
- `Collision`: `1700px` scroll height.
- `Save / Publish`: `1089px` scroll height.

Do not split these further blindly. The goal is clearer progressive disclosure:
surface the common path, collapse or relocate advanced details.

## Primary Files

Own only the panel files needed for the chosen slice:

- Create/content:
  - `src/threlte/editor/EditorCreateTabHost.svelte`
  - `src/threlte/editor/EditorCreatePanel.svelte`
  - `src/threlte/editor/EditorAssetPreview.svelte`
- Output/status:
  - `src/threlte/editor/EditorOutputTabHost.svelte`
  - runtime diagnostic presentation used by that tab
- Environment:
  - `src/threlte/editor/EditorEnvironmentTabHost.svelte`
  - `src/threlte/editor/EditorEnvironmentPanel.svelte`
- Collision:
  - `src/threlte/editor/EditorCollisionTabHost.svelte`
  - collision review/readiness presentation files
- Save/publish:
  - `src/threlte/editor/EditorSaveTabHost.svelte`
  - `src/threlte/editor/EditorSavePanel.svelte`
  - `src/threlte/editor/EditorPublishReadinessPanel.svelte`

Do not work all of these at once unless explicitly assigned as an integration
pass. Prefer one dense panel per agent.

## Required UX Outcomes

### Create

Create should have:

- compact Quick Add
- searchable Content Browser
- selected asset preview/actions
- AI entry point, not a large AI form

Reduce visible buttons on first open. Keep prefab/library depth available through
filtering, groups, or collapsed sections.

### Output

Output should show:

- recent operation
- concise errors/warnings summary
- expandable diagnostics
- job list with filters or collapsed details

Avoid dumping every runtime diagnostic line expanded by default.

### Environment

Environment should group controls:

- Feature toggles
- Atmosphere/Fog
- Lighting
- Water
- Particles
- Level-specific presets

Use collapsed advanced groups for less common numeric tuning.

### Collision

Collision should separate:

- viewport/debug overlay controls
- collision policy/budget
- review summary
- terrain source/bake pipeline
- advanced details

Keep the most important blocker/warning summary visible.

### Save / Publish

Save / Publish should prioritize:

- metadata summary
- publish readiness
- primary save/publish actions
- recovery/import/export as advanced section

## Implementation Guidance

1. Use existing shared editor styles where possible.
2. Prefer semantic sections and collapsible details over more tabs.
3. Keep common actions above the fold.
4. Keep expensive/destructive actions grouped with status/preconditions.
5. Do not change data contracts just to reduce UI density.
6. Preserve all current actions somewhere reachable.

## Acceptance Criteria

For whichever panel this agent owns:

- The first visible area communicates the common workflow.
- Advanced controls are collapsed, filtered, or moved into a focused subregion.
- The panel remains usable at `1280x800`.
- The panel does not require scanning a long undifferentiated list of controls.
- Existing commands remain reachable.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

Use a Playwright tab-density check to report:

- visible button count
- input count
- scroll height/client height
- first 600 characters of panel text

Include before/after metrics in the handoff.
