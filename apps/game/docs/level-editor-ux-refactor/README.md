# Level Editor UX Refactor Packet

This packet converts the May 2026 level editor UX audit into agent-sized refactor briefs.
The goal is to move the editor from a grown-over overlay tool into a web-native
authoring workspace comparable in information architecture to Unity, Unreal, and
Blender.

No document in this packet asks agents to change runtime scene contracts, level
data, collision semantics, or generated runtime assets unless explicitly called
out by that brief.

## Current Completion Packet

Start active work from `WAVE_06_LAYOUT_SYSTEM_README.md`. Wave 06 is still the
active layout-system packet until the final verification gate has a clean
passing run. Wave 05 remains useful background for command-palette status,
package smoke history, workspace density, and completion context.

Current known state:

- Command palette execution is fixed and verified through focused Playwright.
- Direct editor UX smoke is the current final gate and now includes layout
  metrics from Agent 29.
- The top chrome and visible workspace navigation work has landed in source;
  the old clipped desktop `Section` select is historical.
- Dock resize state, persistence, reset behavior, and layout presets have
  landed in source; the final gate still needs a clean passing smoke run before
  the packet is marked complete.
- Latest layout metrics and known remaining drift are tracked in
  `EDITOR_FEATURE_INVENTORY.md`.

## Original Audit Classification

The original audit classified the editor as a strong internal-tool capability
that was not yet a AAA-class authoring surface. The main issue was workspace
architecture:

- The viewport is treated as a background behind floating panels instead of the
  primary editing region.
- Outliner, inspector, workflow tools, and controls compete as independent overlays.
- The old default `Workflow` tab mixed selection, AI generation, save/load,
  asset library, and job controls. That visible tab has since been removed.
- Responsive behavior collapses panels into off-screen content at laptop/tablet
  widths.
- Tool controls are duplicated across the header, HUD, and scene tabs.

## External UX Targets

Use these engine patterns as the target, adapted for this web game editor:

- Unity: persistent toolbar, scene/game viewport, hierarchy, inspector, project
  window, layout menu, play controls.
- Unreal: dominant level viewport, world outliner, details panel, content browser,
  modes/tools, output/status feedback.
- Blender: main region, header, toolbar, sidebar, tool settings, status/footer,
  resizable/hideable regions.

The target is not to clone one product. It is to adopt the same classification of
clear regions, durable tools, and predictable editor mental model.

## Refactor Principles

1. Keep the viewport dominant.
2. Make persistent regions stable: viewport, outliner, inspector, asset browser,
   toolbar, status/output.
3. Treat tool modes separately from task workflows.
4. Put AI, bake, publish, and long-running jobs behind explicit workflow surfaces.
5. Preserve existing editor behavior while moving it into better regions.
6. Refactor one boundary at a time and keep generated level/runtime data stable.
7. Verify with Playwright screenshots at desktop and laptop/tablet breakpoints.

## Suggested Agent Order

1. `AGENT_00_COORDINATION.md`
2. `AGENT_01_WORKSPACE_SHELL.md`
3. `AGENT_02_TOOL_MODES_AND_COMMANDS.md`
4. `AGENT_03_ASSET_BROWSER_AND_CREATE_FLOW.md`
5. `AGENT_04_INSPECTOR_AND_PROPERTIES.md`
6. `AGENT_05_PIPELINES_STATUS_AND_OUTPUT.md`
7. `AGENT_06_VERIFICATION_AND_AUDIT.md`

Later waves continue from the first implementation pass:

- `WAVE_02_POST_AUDIT_README.md`
- `WAVE_03_DEEP_EDITOR_REDESIGN_README.md`
- `WAVE_04_VERIFICATION_REPAIR_README.md`
- `WAVE_05_COMPLETION_README.md`
- `WAVE_06_LAYOUT_SYSTEM_README.md`

For the current state, start with Wave 06. It is the active layout-system packet
and documents the latest Playwright layout findings, the second-pass layout
briefs, and the remaining final gate:

1. `AGENT_25_UNIFIED_TOP_CHROME.md`
2. `AGENT_26_VISIBLE_WORKSPACE_NAVIGATION.md`
3. `AGENT_27_RESIZABLE_DOCK_LAYOUT.md`
4. `AGENT_28_RESPONSIVE_LAYOUT_PRESETS.md`
5. `AGENT_29_LAYOUT_VERIFICATION_GATE.md`
6. `AGENT_30_LAYOUT_DOC_SYNC.md`

Do not mark Wave 06 complete until the final gate passes:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

Agent 29 extended the existing editor UX smoke rather than adding a separate
`smoke:editor-layout` command. If a future agent adds a dedicated layout smoke
command, document it here and in `EDITOR_FEATURE_INVENTORY.md`.

Wave 05 remains useful for package smoke, density, and final gate context:

1. `AGENT_21_PACKAGE_SMOKE_RELIABILITY.md`
2. `AGENT_22_REMAINING_WORKSPACE_DENSITY.md`
3. `AGENT_23_INVENTORY_AND_PACKET_SYNC.md`
4. `AGENT_24_FINAL_EDITOR_UX_GATE.md`

Wave 04 remains useful historical context for the earlier repair pass. Do not
use Wave 04 blocker text as current state when it conflicts with Wave 05 or
Wave 06:

1. `AGENT_17_COMMAND_PALETTE_INTERACTION_FIX.md`
2. `AGENT_18_EDITOR_UX_SMOKE_CLI_FIX.md`
3. `AGENT_19_FEATURE_INVENTORY_REFRESH.md`
4. `AGENT_20_WORKSPACE_COMPOSITION_DEEPENING.md`

Agents may work in parallel only when their write sets are disjoint. The safest
parallel split is:

- Agent 01 owns shell/docking components.
- Agent 02 owns toolbar, tabs, tool-mode components, and command routing.
- Agent 03 owns create/assets components.
- Agent 04 owns inspector/properties components.
- Agent 05 owns workflow/status/pipeline components.
- Agent 06 owns tests/scripts/docs only.

## Baseline Evidence From Audit

Playwright audit URL: `http://127.0.0.1:4332/?editor=1`

Observed viewport cases:

- `1440x900`: viewport is covered by a large HUD, properties shelf, outliner,
  and tools dock.
- `1920x1080`: same right-heavy layout, but tolerable due to width.
- `1280x800`: tool panel becomes `896x1060`, outliner starts below the visible
  canvas, properties panel starts further below.
- `900x700`: same off-screen stacking issue with a narrower right-side stack.

Worst tab density:

- `AI Mesh`: 2747px scroll height in a 598px panel.
- `Collision`: 1700px scroll height.
- `Create`: 40 visible buttons, 1520px scroll height.
- `Environment`: 42 input controls.
- `Workflow`: default tab, 29 buttons, mixed responsibilities.

## Definition Of Done For The Packet

Each implementation PR should report:

- Which brief was implemented.
- Files changed.
- Commands run.
- Playwright screenshots or visual smoke coverage used.
- Whether runtime payload size, collision, and required assets were considered.
- Any CSS surface area added or moved.

For game code changes, run at least:

```bash
pnpm --dir apps/game type-check
```

For editor UI changes, also run a Playwright viewport check across at least:

- `1440x900`
- `1280x800`
- `1024x768`
- `900x700`
