# Agent 24: Final Editor UX Gate

## Goal

Create the final verification handoff for this refactor wave. The editor should
not be accepted based on eyeballing. This agent owns objective pass/fail output
for smoke, command palette interaction, and workspace density.

## Required Work

1. Verify type-check.

```bash
pnpm --dir apps/game type-check
```

2. Verify direct smoke.

```bash
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

3. Verify package smoke after Agent 21.

```bash
pnpm --dir apps/game smoke:editor-ux --no-server
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

4. Verify command palette interaction.
   Confirm:
   - `Ctrl+K` opens the palette
   - search `asset library`
   - hit-test target is inside `.palette-command`
   - click `Open Asset Library`
   - palette closes
   - active section is `create`

5. Verify workspace density after Agent 22.
   Collect:
   - visible control count
   - visible button count
   - active section id
   - workspace heading
   - whether legacy `Workflow` tab is visible
   - whether initial load shows ComfyUI/Hunyuan controls

6. Decide whether to encode density in automation.
   Preferred outcome: add a reusable verification mode or script that reports
   workspace counts and can fail when thresholds are exceeded.

   Acceptable locations:
   - extend `editor-ux-smoke-browser.mjs` with a density assertion
   - add a separate `editor-workspace-density-check.mjs`
   - add a documented one-off Playwright script only if there is a strong reason
     not to automate it yet

   Do not make the smoke brittle by counting hidden controls or closed advanced
   sections as visible. Use the same visibility logic as prior audits:
   visible means nonzero rect and not `display: none` or `visibility: hidden`.

## Acceptance Criteria

- Type-check passes.
- Direct smoke passes.
- Both package smoke forms pass.
- Command palette click path passes without `force: true`.
- All workspaces meet density targets:
  - Initial `Scene` <= 35 visible controls.
  - `Create` <= 45 visible controls.
  - `World` <= 45 visible controls.
  - `Collision` <= 45 visible controls.
  - `Build` <= 45 visible controls.
  - `AI Lab` <= 45 visible controls.
- No visible legacy `Workflow` tab.
- Initial load does not expose ComfyUI/Hunyuan controls.

## Handoff Template

Use this exact shape in the final handoff:

```md
## Commands

- `pnpm --dir apps/game type-check`: pass/fail
- `pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server`: pass/fail
- `pnpm --dir apps/game smoke:editor-ux --no-server`: pass/fail
- `pnpm --dir apps/game smoke:editor-ux -- --no-server`: pass/fail

## Command Palette

- Opens with Ctrl+K: yes/no
- Search filters to Open Asset Library: yes/no
- Hit target inside palette command: yes/no
- Click switches to Create: yes/no

## Workspace Density

| Workspace | Controls | Buttons | Target | Pass |
| --- | ---: | ---: | ---: | --- |
| Initial Scene |  |  | 35 |  |
| Create |  |  | 45 |  |
| World |  |  | 45 |  |
| Collision |  |  | 45 |  |
| Build |  |  | 45 |  |
| AI Lab |  |  | 45 |  |

## Remaining Risks

- ...
```

## Handoff Notes

Report:

- Whether verification was automated or manual.
- If any target is not met, link the exact file/component likely responsible.
- Any server/process instability observed while running smoke.
- Any new CSS surface area added by verification UI changes, if any.
