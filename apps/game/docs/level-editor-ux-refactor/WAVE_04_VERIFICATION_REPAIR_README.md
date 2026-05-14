# Wave 04: Verification Repair And Deepening

Historical note: Wave 04 preserves the repair findings that led to Agents 17
through 20. Wave 05 is now the active completion packet. In particular, the
command palette blocker below was fixed by Agent 17, while package-script smoke
reliability continued into Wave 05 for Agent 21.

This wave follows the latest Playwright verification pass against the current
level editor implementation on May 12, 2026. The Wave 03 direction has partly
landed: the visible editor now has task workspaces, a main toolbar, a command
palette, and no visible legacy `Workflow` tab. The remaining work is not a
window rearrangement problem. It is about making the new model interactive,
verifiable, and smaller inside each workspace.

## Verified Current State

The direct browser smoke command passed:

```bash
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

Observed pass metrics:

- `1440x900`: 21 initial buttons, chrome coverage `0.363`, no warnings.
- `1280x800`: 21 initial buttons, chrome coverage `0.376`, no warnings.
- `900x700`: 21 initial buttons, chrome coverage `0.408`, no warnings.
- Visible workspace tabs: `Scene`, `Create`, `World`, `Collision`, `Build`,
  `AI Lab`.
- No visible legacy `Workflow` tab.
- Initial load no longer shows ComfyUI/Hunyuan controls.

## Blocking Findings

1. The command palette opens and filters but cannot be clicked.
   Hit testing on the filtered `Open Asset Library` command returns the Three.js
   canvas because the palette inherits `pointer-events: none` from the editor
   shell. This makes the main discoverability surface non-functional.

2. The package smoke command is unreliable.
   The direct node command passes, but both package-script forms timed out
   waiting for `http://127.0.0.1:4322/`:

```bash
pnpm --dir apps/game smoke:editor-ux -- --no-server
pnpm --dir apps/game smoke:editor-ux --no-server
```

3. The feature inventory is stale.
   It still says `smoke:editor-ux` is missing from `apps/game/package.json`,
   but the script now exists.

4. Several workspaces still mount whole legacy hosts.
   Playwright-visible control counts from the focused audit:

- Initial `Scene`: 41 visible controls, 21 buttons.
- `Create`: 79 visible controls, 60 buttons.
- `World`: 93 visible controls, 22 buttons.
- `Collision`: 53 visible controls, 33 buttons.
- `Build`: 61 visible controls, 33 buttons.
- `AI Lab`: 39 visible controls, 21 buttons.

The new navigation model is present, but several workspaces are still too dense
and include too much inherited surface area.

## Wave 04 Briefs

1. `AGENT_17_COMMAND_PALETTE_INTERACTION_FIX.md`
2. `AGENT_18_EDITOR_UX_SMOKE_CLI_FIX.md`
3. `AGENT_19_FEATURE_INVENTORY_REFRESH.md`
4. `AGENT_20_WORKSPACE_COMPOSITION_DEEPENING.md`

Recommended order:

1. Agent 17 fixes the command palette interaction blocker first.
2. Agent 18 makes the smoke command trustworthy and adds coverage for Agent 17.
3. Agent 19 refreshes the inventory so future agents stop working from stale
   facts.
4. Agent 20 reduces workspace density and removes whole-host composition where
   it hides unrelated controls.

Agents 17 and 18 may work in parallel only if their write sets are coordinated.
If both need `editor-ux-smoke-browser.mjs`, Agent 18 owns the harness and Agent
17 provides the behavior target.

## Non-Negotiable Outcomes

- Command palette commands must be clickable by pointer and executable by
  keyboard.
- `Open Asset Library` from the palette must switch to the `Create` workspace.
- The package smoke command must pass in no-server mode against a healthy dev
  server.
- The smoke output must fail on command palette regressions, not only layout.
- Inventory docs must describe the current implementation, not old blockers.
- Workspace control density must go down by removing unrelated surfaces, not by
  hiding labels or shrinking text.

## Required Verification

Run at minimum:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

After Agent 18, this must also pass:

```bash
pnpm --dir apps/game smoke:editor-ux --no-server
```

For Agent 17 and Agent 18, manually or automatically verify:

- Open command palette with `Ctrl+K`.
- Type `asset library`.
- Click `Open Asset Library`.
- Confirm the active workspace becomes `Create`.
- Reopen the palette.
- Press `Escape`.
- Confirm it closes and focus returns to the editor.
