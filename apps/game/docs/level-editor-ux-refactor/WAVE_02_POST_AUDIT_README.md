# Wave 02: Post-Refactor Playwright Audit Actions

This wave captures follow-up work from the Playwright audit after the first editor
UX refactor started landing.

## Current State

The first wave made real progress:

- `EditorMainToolbar.svelte` exists and tool modes are more visible.
- The default panel is now `Scene`, not the old mixed `Workflow` dashboard.
- `AI Jobs`, `Pipelines`, `Save / Publish`, and `Output` are split into separate
  surfaces.
- `pnpm --dir apps/game smoke:editor-ux -- --no-server` passes.
- At `1280x800`, outliner/details now remain inside the viewport.

The editor is still not done. The next problems are second-order workspace issues:

- At `900x700`, panels overlap and the tab rail overflows through sibling docks.
- The status HUD is still too large for the usable viewport.
- The center viewport is a background gap rather than an explicit protected region.
- Chrome coverage remains high: about `0.46` at desktop/laptop.
- The new smoke test passes despite visible tablet overlap.
- `Create`, `Output`, `Environment`, and `Collision` remain dense panels.

## Latest Playwright Evidence

Audit URL:

```txt
http://127.0.0.1:4322/?editor=1
```

Smoke results:

```txt
1440x900 buttons=53 chrome=0.458 tabScroll=396/396 detailsScroll=465/465
1280x800 buttons=53 chrome=0.465 tabScroll=396/396 detailsScroll=384/384
900x700  buttons=53 chrome=0.377 tabScroll=382/382 detailsScroll=118/118
```

Important manual metrics:

- `900x700` `.editor-tools-panel`: `416x247`, but its child `.editor-tab-rail`
  is `59x667`.
- `900x700` `.editor-side-stack`: starts at `y=445`, while the overflowing tab
  rail extends past it.
- `900x700` `EditorControlsOverlay`: `544x322` and overlaps the main editing area.
- `Output` tab: `2160px` scroll height in a `729px` panel.
- `Create` tab: 39 buttons and `1351px` scroll height.
- `Environment` tab: 42 inputs.
- `Collision` tab: `1700px` scroll height.

## Wave 02 Agent Briefs

Use these after the first-wave work is present:

1. `AGENT_07_TABLET_DOCKS_AND_TAB_RAIL.md`
2. `AGENT_08_STATUS_HUD_AND_VIEWPORT_PROTECTION.md`
3. `AGENT_09_EDITOR_UX_SMOKE_OVERLAP_ASSERTIONS.md`
4. `AGENT_10_DENSE_PANEL_REDUCTION.md`

Recommended order:

1. Agent 07 fixes the layout bug that allows tab rail overflow.
2. Agent 08 reduces persistent HUD/chrome and protects the center viewport.
3. Agent 09 tightens smoke tests so regressions fail.
4. Agent 10 continues information architecture cleanup inside dense panels.

Agents 07 and 08 both touch layout; do not run them in parallel unless their write
sets are coordinated. Agent 09 can run in parallel after Agent 07 has a known
target behavior. Agent 10 can run in parallel if it avoids shell CSS.

## Verification For Every Wave 02 Agent

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

Also capture or inspect viewports:

- `1440x900`
- `1280x800`
- `900x700`

No agent should edit generated runtime assets as part of this UX work.
