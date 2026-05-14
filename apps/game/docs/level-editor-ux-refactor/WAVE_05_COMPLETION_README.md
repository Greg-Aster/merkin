# Wave 05: Completion Pass

This wave follows the latest verification pass after Wave 04 work landed. The
core editor redesign is now real enough to validate: the command palette works
through direct Playwright, the old visible `Workflow` tab is gone, and the
direct smoke runner passes. The remaining work is to make the official package
smoke command reliable, finish density reduction in the remaining crowded
workspaces, and refresh the docs so the next agent does not repeat stale facts.

## Verified Current State

Verified on May 12, 2026 against `http://127.0.0.1:4322/?editor=1`.

Passing:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

Command palette behavior now passes a focused Playwright check:

- `Ctrl+K` opens the palette.
- Searching `asset library` finds `Open Asset Library`.
- Pointer hit-testing returns palette content, not the Three.js canvas.
- Clicking the command succeeds without `force: true`.
- The palette closes.
- The active workspace becomes `Create`.

Still failing:

```bash
pnpm --dir apps/game smoke:editor-ux --no-server
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

Both package-script forms still time out at readiness:

```txt
Timed out waiting for http://127.0.0.1:4322/ (last fetch error: fetch failed)
```

Immediately after those failures, both of these succeed:

```bash
curl -I http://127.0.0.1:4322/
pnpm --dir apps/game exec node -e "const r=await fetch('http://127.0.0.1:4322/'); console.log(r.status, r.ok)"
```

## Latest Workspace Density

Focused Playwright counts after Wave 04:

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

## Wave 05 Briefs

1. `AGENT_21_PACKAGE_SMOKE_RELIABILITY.md`
2. `AGENT_22_REMAINING_WORKSPACE_DENSITY.md`
3. `AGENT_23_INVENTORY_AND_PACKET_SYNC.md`
4. `AGENT_24_FINAL_EDITOR_UX_GATE.md`

Recommended order:

1. Agent 21 fixes the package command path first.
2. Agent 22 finishes Scene/Create/Collision/Build density reductions.
3. Agent 24 hardens the final verification gate and reports objective metrics.
4. Agent 23 updates inventory/docs last, after code behavior is stable.

Agent 21 owns smoke runner/harness files. Agent 22 owns editor UI composition.
Agent 23 owns docs. Agent 24 owns verification scripts and final reporting. Do
not let Agent 21 and Agent 24 edit the same smoke file in parallel without
coordination.

## Definition Of Done

- Package-script smoke passes in no-server mode.
- Direct smoke still passes.
- Command palette click coverage remains in the smoke path.
- Initial `Scene`, `Create`, `World`, `Collision`, `Build`, and `AI Lab` are all
  at or below their visible-control targets.
- Inventory docs describe the current state after all fixes.
- Handoff includes commands run and visible control/button counts.
