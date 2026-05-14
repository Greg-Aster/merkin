# Editor Feature Inventory

## Current State For Wave 06 Layout Work

- Current source-of-truth workspace routing lives in [EditorPanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPanel.svelte) and prop wiring in [editorPanelPropBuilders.ts](/home/greggles/Merkin/apps/game/src/threlte/editor/editorPanelPropBuilders.ts).
- The visible workspaces are `Scene`, `Create`, `World`, `Collision`,
  `Build`, and `AI Lab`.
- The old visible `Workflow` tab is gone. Legacy workflow components may still
  exist in the tree, but future agents should not treat them as current visible
  locations unless they are intentionally reintroduced.
- The tiny clipped desktop `Section` select is no longer current. Workspace
  navigation is now an icon + label button rail in [EditorPanelTabRail.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPanelTabRail.svelte), with a horizontal rail at narrower widths.
- The top shell uses one `.editor-top-chrome` row containing
  [EditorPanelHeader.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPanelHeader.svelte) and [EditorMainToolbar.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorMainToolbar.svelte), rather than the older stacked header and toolbar strips.
- Dock sizing is stored as editor user preference state in
  [editorSessionStore.ts](/home/greggles/Merkin/apps/game/src/threlte/editor/editorSessionStore.ts) under `merkin:editor-layout:v1`. Defaults are `320px` for tools and side docks, with responsive clamps of `220px` or `240px` minimum, `min(420px, 32vw)` maximum, and a combined dock clamp intended to protect viewport width.
- Docks are user-resizable from the tools/viewport and viewport/details edges.
  Dragging updates persisted `toolsDockWidth` or `sideDockWidth`; `Window >
  Reset Dock Layout` and the `reset-dock-layout` command restore default dock
  widths.
- Layout presets are implemented as editor preferences, not scene data:
  `Default`, `Create`, `Collision`, `Build`, and `Minimal Viewport`. They are
  available through the visible `Layout` picker, `Window > Layout Presets`, and
  command palette commands named `layout-default`, `layout-create`,
  `layout-collision`, `layout-build`, `layout-minimal-viewport`, and
  `layout-reset`.
- Workspace navigation on desktop/laptop uses the readable tab rail. At
  tablet-ish widths the same rail scrolls horizontally as needed. At
  `<= 1024px`, the default responsive behavior shows only one right-side group
  at a time unless `Window > Pin Split Layout` is enabled.
- Command palette status: fixed by Agent 17. Focused Playwright verified
  `Ctrl+K`, filtering for `asset library`, pointer hit-testing against palette
  content rather than the Three.js canvas, clicking `Open Asset Library`
  without `force: true`, palette close after execution, and active workspace
  switching to `Create`.
- Final direct editor UX smoke command for the current layout gate:

```bash
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

- Package-script smoke status: the package script exists and routes through the
  same smoke runner. Verify through the final Wave 06 gate before treating the
  packet as complete:

```bash
pnpm --dir apps/game smoke:editor-ux --no-server
```

Agents should treat Wave 06 as the active layout-system packet until the final
layout gate passes. Wave 05 remains historical context for package smoke,
workspace density, and command-palette repair work.

## Current Layout Metrics

Measured with a focused local Playwright rectangle probe on May 13, 2026, at
`http://127.0.0.1:4322/?editor=1` after clearing local/session storage. The
full editor UX smoke was also attempted during this doc sync but was interrupted
by concurrent source edits and did not produce a stable passing run.

| Viewport | Top chrome stack | Body starts | Left dock | Right dock | Combined side chrome | Workspace nav |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `1440x900` | `46px` | `58px` | `22.2%` | `22.2%` | `44.4%` | no overflow or clipped labels |
| `1280x800` | `46px` | `55px` | `25.0%` | `25.0%` | `50.0%` | no overflow or clipped labels |
| `1024x768` | `46px` | `55px` | `23.7%` | `23.7%` | `47.5%` | no overflow or clipped labels |
| `900x700` | `46px` | `54px` | `24.4%` | `24.4%` | `48.9%` | no overflow or clipped labels |

Current interpretation:

- The Wave 06 top-chrome and workspace-nav goals are reflected in current
  metrics; body top is well under `120px`, and the old clipped Section select is
  historical only.
- Default dock sizing is resizable and persisted, but current measured default
  side chrome still exceeds the strict `1024x768 <= 45%` target at `47.5%` and
  should remain a final-gate item.
- Agent 29 extended the existing editor UX smoke instead of creating a separate
  layout smoke package command. It now measures `bodyTop`, `chromeTop`,
  left/right/combined dock percentages, nav overflow, and `1024x768` coverage in
  [editor-ux-smoke-browser.mjs](/home/greggles/Merkin/apps/game/scripts/editor-ux-smoke-browser.mjs).

Final verification commands for the layout packet:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

## Latest Workspace Counts From Wave 05

Focused Playwright counts carried forward from Wave 05:

| Workspace | Visible controls | Visible buttons | Status |
| --- | ---: | ---: | --- |
| Initial `Scene` | 41 | 21 | Above target |
| `Create` | 46 | 28 | One control above target |
| `World` | 42 | 24 | Meets target |
| `Collision` | 53 | 33 | Above target |
| `Build` | 61 | 33 | Above target |
| `AI Lab` | 39 | 21 | Meets target |

Targets from Wave 04 remain:

- Initial `Scene`: no more than 35 visible controls.
- `Create`: no more than 45 visible controls.
- `World`: no more than 45 visible controls.
- `Collision`: no more than 45 visible controls.
- `Build`: no more than 45 visible controls.
- `AI Lab`: no more than 45 visible controls.

## Remaining UX Backlog

- The final Wave 06 layout gate needs a clean run, including the `1024x768`
  side-chrome threshold.
- Initial `Scene`, `Create`, `Collision`, and `Build` remain above target or
  near target and need composition reductions, not smaller text or hidden
  labels.
- Duplicated primary actions still need consolidation: save/reload, level
  switching, selection commands, transform controls, collision overlay, and
  generated-asset reuse.
- Offline-service features are correctly isolated in `AI Lab`, but service/job
  status hierarchy still needs clearer product treatment.
- World partition cook remains a manually risky advanced workflow until deeper
  verification proves the route and produced runtime contracts.

## Audit Basis

- This inventory preserves the useful Wave 03 capability audit while refreshing
  locations and blockers against the current Wave 06 editor model.
- Historical sections below explain why the redesign happened. Do not use old
  Wave 03, Wave 04, Wave 05, or pre-Wave-06 blocker language as current state
  when it conflicts with the current-state section above.

## Wave 03 Audit Facts

These facts describe the pre-Wave-04 state and explain why the redesign happened:

- The editor loaded into a workflow-first surface that mixed selection, AI,
  save/load, asset reuse, visibility, and job controls.
- The visible `Workflow` tab was the default tab.
- The initial editor load exposed too many controls and showed experimental AI
  tooling too early.
- `AI Mesh`, `Collision`, `Create`, `Environment`, and `Workflow` had high scroll
  density and poor task separation.

## Wave 04 Historical Verified State

- The task workspace model has landed: `Scene`, `Create`, `World`, `Collision`,
  `Build`, and `AI Lab`.
- The visible legacy `Workflow` tab is removed.
- Initial load no longer shows ComfyUI/Hunyuan controls.
- `apps/game/package.json` includes `smoke:editor-ux`.
- Direct node smoke had passed in that Wave 04 verification pass:

```bash
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

The following blockers were Wave 04 findings before Agents 17, 18, 21, and 22
were assigned. They are retained as historical evidence, not current status.

## Historical Wave 04 Blockers

- Pre-Agent-17: the command palette opened and filtered, but pointer
  interaction was blocked by inherited `pointer-events: none`. Agent 17 later
  fixed and verified this path.
- Pre-Agent-18/21: the package script existed, but package-script smoke
  reliability remained a blocker. As of the Wave 05 packet, this is still the
  active package-smoke issue until Agent 21 completes.

```bash
pnpm --dir apps/game smoke:editor-ux --no-server
```

- Workspace density remains a product/UX backlog. The navigation model is
  present, but several workspaces still mount whole legacy hosts or unrelated
  controls.

## Historical Wave 04 Density Snapshot

These counts are retained only to preserve the Wave 04 audit trail. Use
`Latest Workspace Counts` above for current planning.

| Workspace | Visible controls | Buttons | Interpretation |
| --- | ---: | ---: | --- |
| Initial `Scene` | 41 | 21 | Passes smoke, still needs UX-density reduction |
| `Create` | 79 | 60 | Too dense; asset/create flow needs deeper composition |
| `World` | 93 | 22 | Too dense; environment/player/terrain controls need clearer grouping |
| `Collision` | 53 | 33 | Functional surface, but authoring and bake controls need reduction |
| `Build` | 61 | 33 | Readiness/output flow exists, but persistence/publish/recovery remain crowded |
| `AI Lab` | 39 | 21 | Correctly separated as experimental, still needs clearer service/job hierarchy |

These counts are a UX-density backlog, not a smoke failure. Smoke should fail on
layout, reachability, command-palette, and canvas regressions; product work
should reduce the counts by removing duplicate or unrelated controls from each
workspace.

## Historical Wave 05 State

Wave 05 moved the packet from command-palette repair toward completion
hardening. These facts remain useful context but are not the full current layout
state:

- Command palette execution was verified after Agent 17.
- Direct editor UX smoke passed through the direct node runner.
- Package-script reliability and workspace density were still tracked as active
  completion work.
- The Wave 05 counts above remain the latest recorded density snapshot in this
  packet unless a newer full smoke run replaces them.

## Historical Pre-Wave-06 Layout Audit

These facts are retained from the Wave 06 layout-system audit to show why the
current layout exists. They describe the pre-Wave-06 problem shape, not the
current UI:

| Viewport | Top chrome stack | Body starts | Left dock | Right dock | Combined side chrome | Section select |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `1920x1080` | `95px` | `115px` | `17.5%` | `17.5%` | `35.0%` | clipped |
| `1440x900` | `144px` | `164px` | `23.3%` | `23.3%` | `46.7%` | clipped |
| `1280x800` | `144px` | `162px` | `23.8%` | `23.8%` | `47.5%` | clipped |
| `1024x768` | `144px` | `162px` | `29.7%` | `29.7%` | `59.4%` | clipped |
| `900x700` | `139px` | `153px` | `46.2%` | `46.2%` | `92.4%` | visible but cramped |

The old findings were:

- top chrome stacked into inefficient rows at common laptop widths
- docks were effectively fixed and could not be resized by the user
- the desktop section select was squeezed into a tiny rail and clipped labels
- at tablet widths, tools, outliner, and details competed with the viewport
- responsive behavior stacked dock groups instead of adapting to user intent

## Status Legend

- `core-ready`: should remain visible by default
- `works-needs-ux`: function exists but presentation, placement, or clarity is
  not trustworthy
- `experimental`: user-facing but separated from core editing
- `offline-service`: depends on a local service/process outside the editor
- `blocked`: surfaced action without reliable verification or dependable path
- `duplicate`: same job appears in more than one current place
- `retire-candidate`: visible or retained surface should likely be removed or
  folded into another surface

## Inventory

| Feature | Current location | Source component/file | Owner workspace target | User job | Status | Required selection/context | Backend/API dependency | Verification path | Recommended UI treatment |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Level switching | `Scene` workspace, header `File > Load Level` | [EditorSceneToolsPanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte), [EditorPanelHeader.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPanelHeader.svelte) | `AGENT_11`, `AGENT_16` | Change active level | `duplicate` | Valid level option | local scene/registry load | Manual click, header menu path | Keep one primary entry in default flow; demote menu duplicate |
| New level creation | `World`/scene setup flow, header `File > New Level...` | [EditorSceneToolsPanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte), [EditorPanelHeader.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPanelHeader.svelte) | `AGENT_11`, `AGENT_14`, `AGENT_16` | Create a new scene-backed level | `works-needs-ux` | Title/id/template | editor level controller, registry write | Create from current scene and switch | Keep in one task-oriented setup flow; explain template/source result |
| Save level | `Build` workspace, header `File > Save` | [EditorSavePanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorSavePanel.svelte), [EditorPanelHeader.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPanelHeader.svelte) | `AGENT_05`, `AGENT_11`, `AGENT_16` | Persist authoritative scene file | `duplicate` | Active level | editor file routes | Overwrite level and reload | Keep one primary save button; secondary entries should be shortcuts only |
| Save local recovery | `Build` workspace persistence section | [EditorSavePanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorSavePanel.svelte) | `AGENT_05`, `AGENT_16` | Create local fallback snapshot | `core-ready` | Active scene | browser/local storage | Save, reload editor session | Keep visible but label as recovery, not primary save |
| Load current level | `Build` workspace, header `File > Reload Current Level` | [EditorSavePanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorSavePanel.svelte), [EditorPanelHeader.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPanelHeader.svelte) | `AGENT_05`, `AGENT_16` | Discard edits and reload disk | `duplicate` | Active level | editor file routes | Reload after local dirty state | Keep one destructive reload entry with warning copy |
| Load packaged/original/backup snapshot | `Build` workspace advanced recovery | [EditorSavePanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorSavePanel.svelte) | `AGENT_05`, `AGENT_14` | Compare or restore authored scene state | `works-needs-ux` | Snapshot or packaged scene exists | snapshot/file routes | Load each source on a known edited level | Keep in advanced recovery; require clear destructive state copy |
| Copy JSON / Import JSON | `Build` workspace file tools, header copy path | [EditorSavePanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorSavePanel.svelte), [EditorPanelHeader.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPanelHeader.svelte) | `AGENT_05`, `AGENT_16` | Export or apply scene document JSON | `works-needs-ux` | Active scene or valid pasted JSON | clipboard, import parser/controller | Copy, paste valid and invalid JSON | Keep advanced; add validation summary before apply |
| Command palette | Header command button, `Ctrl+K` | [EditorCommandPalette.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorCommandPalette.svelte), [editorCommandRegistry.ts](/home/greggles/Merkin/apps/game/src/threlte/editor/editorCommandRegistry.ts) | `AGENT_12`, `AGENT_17`, `AGENT_18` | Discover and run commands | `core-ready` | Editor open | editor command registry | Open, filter `asset library`, click/press Enter, confirm `Create` workspace | Keep as discoverability surface; preserve Agent 17 hit-test coverage so pointer regressions fail visibly |
| Select similar / clear selection | `Scene` workspace hierarchy/outliner, command palette, header `Edit` | [EditorHierarchyTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorHierarchyTabHost.svelte), [EditorPanelHeader.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPanelHeader.svelte) | `AGENT_12`, `AGENT_16` | Expand or reset selection | `duplicate` | Selection for similar; any selection for clear | editor selection logic | Select node then trigger each path | Keep as commands discoverable everywhere; avoid first-class duplicate buttons |
| Hide/isolate/show all | `Scene` workspace hierarchy/outliner, command palette | [EditorHierarchyTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorHierarchyTabHost.svelte), [EditorOutlinerDock.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorOutlinerDock.svelte) | `AGENT_02`, `AGENT_12`, `AGENT_16` | Control viewport clutter | `works-needs-ux` | Selection or hidden nodes | editor viewport state | Hide/unhide/isolate nodes and confirm outliner state | Consolidate into one visibility command model with clear terminology |
| Group / ungroup | `Scene` workspace hierarchy, right outliner | [EditorHierarchyTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorHierarchyTabHost.svelte), [EditorOutlinerDock.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorOutlinerDock.svelte) | `AGENT_02`, `AGENT_04`, `AGENT_16` | Organize nodes into authored groups | `core-ready` | Compatible multi-selection | scene document edit | Group in hierarchy and outliner | Keep, but one surface should be primary |
| Transform mode / space / axis / snapping | Main toolbar; some scene/world tool settings | [EditorMainToolbar.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorMainToolbar.svelte), [EditorSceneToolsPanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte) | `AGENT_02`, `AGENT_16`, `AGENT_20` | Manipulate selected objects | `duplicate` | Object mode, selection for effect | editor store only | Click toolbar, use gizmo and hotkeys | Keep main toolbar as primary; retire workspace duplicates |
| Outliner visibility/selectability/isolation | Right outliner and `Scene` hierarchy row actions | [EditorOutlinerDock.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorOutlinerDock.svelte), [EditorHierarchyTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorHierarchyTabHost.svelte) | `AGENT_04`, `AGENT_11`, `AGENT_20` | Inspect and manage node state | `works-needs-ux` | Any outliner row | editor viewport state | Toggle eye/lock/isolate in both surfaces | Keep outliner as source of truth; slim hierarchy duplicate |
| Object inspector / details | Right properties shelf; `Scene` edit-details workflow | [EditorPropertiesShelf.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPropertiesShelf.svelte), [EditorInspectTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorInspectTabHost.svelte) | `AGENT_04`, `AGENT_14`, `AGENT_16` | Edit selected node properties | `duplicate` | Single or multi-selection | inspector controller | Select asset, prefab, primitive, gameplay node | Make right shelf primary; deeper host should be focused or retired |
| Quick create primitives and markers | `Create` workspace quick create | [EditorCreatePanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorCreatePanel.svelte) | `AGENT_03`, `AGENT_14` | Add basic nodes and gameplay helpers | `core-ready` | Active scene | create controller | Add box/light/marker/firefly and inspect result | Keep visible in create-first workflow |
| Prefab library | `Create` workspace prefab library | [EditorCreatePanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorCreatePanel.svelte) | `AGENT_03`, `AGENT_20` | Place authored prefab content | `works-needs-ux` | Active scene | create controller, prefab registry | Add several prefab variants | Keep, but improve categorization/search and reduce button density |
| Imported models browser | `Create` workspace asset library; selected-object asset picker | [EditorCreatePanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorCreatePanel.svelte), [EditorPropertiesShelf.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPropertiesShelf.svelte) | `AGENT_03`, `AGENT_04`, `AGENT_16` | Browse and place imported meshes | `works-needs-ux` | Models root available | asset browser routes | Browse directories, select, add | Keep one browser surface; treat inspector picker as a subflow |
| Generated assets browser | `Create` workspace generated assets; `AI Lab` latest output shortcuts | [EditorCreatePanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorCreatePanel.svelte), [EditorAIMeshStudio.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorAIMeshStudio.svelte) | `AGENT_03`, `AGENT_05`, `AGENT_16` | Reuse generated assets | `duplicate` | Generated assets exist | generated asset library | Open latest generated, add to scene | Centralize in asset browser; keep latest-output shortcut only |
| AI generate/retexture selection | `AI Lab`; selected-object experimental action | [EditorAIMeshStudio.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorAIMeshStudio.svelte), [EditorPropertiesShelf.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPropertiesShelf.svelte) | `AGENT_03`, `AGENT_04`, `AGENT_11`, `AGENT_16` | Generate replacement or texture-wrapped variants | `experimental` | Supported single asset/prefab/primitive selection | Hunyuan backend, ComfyUI workflow | Manual only; smoke does not cover local AI services | Keep out of core editing and label as experimental |
| ComfyUI workflow selection/editing | `AI Lab` workflow browser/templates | [EditorAIMeshStudio.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorAIMeshStudio.svelte) | `AGENT_03`, `AGENT_12`, `AGENT_20` | Choose/edit AI pipeline graph | `offline-service` | Local workflow files | ComfyUI local service, local workflow folders | Open template browser and editor | Hide behind advanced/experimental framing |
| Hunyuan service status/jobs | `AI Lab` service and recent-job panels; `Build` output diagnostics | [EditorAIMeshStudio.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorAIMeshStudio.svelte), [EditorOutputTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorOutputTabHost.svelte) | `AGENT_05`, `AGENT_11`, `AGENT_20` | Start backend and inspect queue health | `offline-service` | Local backend installed | Hunyuan local service, job polling | Start service, refresh jobs | Keep in diagnostics/AI surface only |
| Style Studio | `AI Lab` style section | [EditorStyleTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorStyleTabHost.svelte) | `AGENT_05`, `AGENT_11`, `AGENT_20` | Retexture/reimagine one asset or a batch | `experimental` | Style-compatible selection or batch candidates | ComfyUI, Hunyuan, workspace prep/export | Manual only; no reliable smoke for local services | Separate from core editing with strong experimental framing |
| Environment settings | `World` workspace environment section | [EditorEnvironmentTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorEnvironmentTabHost.svelte) | `AGENT_04`, `AGENT_10`, `AGENT_20` | Tune world features, fog, lighting, water, ambience | `works-needs-ux` | Active level profile | scene settings only | Edit values and reload runtime | Reduce density and split shared vs level-specific controls |
| Player spawn settings | `World` workspace player section | [EditorPlayerTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPlayerTabHost.svelte) | `AGENT_04`, `AGENT_14`, `AGENT_20` | Tune spawn and movement defaults | `core-ready` | Active level | scene settings only | Edit spawn, frame spawn | Keep visible in readiness path |
| Collision overlay | Main toolbar and `Collision` workspace | [EditorMainToolbar.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorMainToolbar.svelte), [EditorCollisionTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorCollisionTabHost.svelte) | `AGENT_02`, `AGENT_16` | Inspect collision proxies in viewport | `duplicate` | Any loaded level | editor collision overlay | Toggle on/off and inspect nodes | Keep toolbar toggle; demote duplicate checkbox |
| Collision policy / budget | `Collision` workspace workflow card and collision view | [EditorCollisionTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorCollisionTabHost.svelte) | `AGENT_04`, `AGENT_05`, `AGENT_14` | Control default collision contract | `works-needs-ux` | Active level | level collision workflow | Switch policy and budget | Keep, but add plain-language consequences before publish |
| Mesh collider bake and node collision authoring | Right properties shelf, `Collision` workflow summary | [EditorPropertiesShelf.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPropertiesShelf.svelte), [EditorCollisionTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorCollisionTabHost.svelte) | `AGENT_04`, `AGENT_05`, `AGENT_14` | Author per-node collision and bake mesh colliders | `works-needs-ux` | Selected geometry node | collider bake routes | Select node, edit collision, bake | Keep authoring in inspector; summarize state in Collision workspace |
| Terrain heightmap generation | `Collision` workspace terrain heightmap section | [EditorCollisionTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorCollisionTabHost.svelte) | `AGENT_05`, `AGENT_14`, `AGENT_20` | Derive terrain runtime from selected scene sources | `works-needs-ux` | Valid terrain source selection | terrain bake/editor API routes | Select source nodes, generate heightmap | Gate behind explicit prerequisites summary |
| Terrain collision bake / chunk cook | `Collision` workspace terrain collision section; `Build` readiness | [EditorCollisionTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorCollisionTabHost.svelte), [EditorPublishReadinessPanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPublishReadinessPanel.svelte) | `AGENT_05`, `AGENT_14`, `AGENT_20` | Build terrain collision and visual chunks | `works-needs-ux` | Baked terrain workflow active | terrain bake/editor API routes | Bake collision, cook chunks, inspect files | Keep in pipeline surface, not general scene tools |
| World partition cook | `World` workspace advanced world/partition section; `Build` readiness | [EditorSceneToolsPanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte), [EditorPublishReadinessPanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPublishReadinessPanel.svelte) | `AGENT_05`, `AGENT_14`, `AGENT_20` | Cook actor partition runtime cells | `blocked` | Authored scene with actor roots | world partition cook route | Command exists; deeper manual verification still needed | Keep behind publish/readiness workflow until verified |
| Publish readiness / publish build | `Build` workspace readiness panel, header `Publish Level...` | [EditorPublishReadinessPanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPublishReadinessPanel.svelte), [EditorSavePanel.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorSavePanel.svelte), [EditorPanelHeader.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorPanelHeader.svelte) | `AGENT_05`, `AGENT_14`, `AGENT_16` | See blockers and publish a level | `works-needs-ux` | Active level, publish pipeline state | publish/readiness services and audits | Inspect readiness panel and run publish | Keep as single primary publish workflow with advanced details collapsible |
| Runtime diagnostics and output | `Build` workspace output/diagnostics, `AI Lab` service diagnostics | [EditorOutputTabHost.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorOutputTabHost.svelte), [EditorAIMeshStudio.svelte](/home/greggles/Merkin/apps/game/src/threlte/editor/EditorAIMeshStudio.svelte) | `AGENT_05`, `AGENT_11`, `AGENT_16` | Inspect runtime/editor failures | `works-needs-ux` | Error state or advanced debugging need | runtime diagnostics store | Inspect failures after bad asset load | Keep compact diagnostics cards; avoid another standalone dumping ground |

## Cross-Cutting Findings

1. The task workspace model is now correct, but composition is still too dense.
   Agent 20 should reduce workspace control counts by moving unrelated controls
   out of whole-host mounts, not by hiding labels or shrinking text.

2. Duplicates remain a trust problem.
   Save/reload, level switching, selection commands, transform controls,
   collision overlay, and generated-asset reuse still appear in more than one
   current path. Keep command palette/header paths as shortcuts, not competing
   primary workflows.

3. Offline-service features are correctly separated into `AI Lab`, but still
   need stronger service-state hierarchy.
   ComfyUI, Hunyuan, AI generate/retexture, style workspace prep, and batch
   styling should stay `experimental` or `offline-service`.

4. Verification now includes layout-gate metrics in the existing editor UX
   smoke, but the final Wave 06 gate still needs a clean run. The direct node
   command and package command both route to `editor-ux-smoke.mjs`; the final
   handoff should include the measured `bodyTop`, `chromeTop`, dock percentage,
   and nav-overflow output from a passing run.

5. Command discoverability is usable but needs regression coverage.
   Keep focused coverage for `Ctrl+K`, filtering `asset library`, clicking
   `Open Asset Library`, and confirming the active workspace becomes `Create`.
