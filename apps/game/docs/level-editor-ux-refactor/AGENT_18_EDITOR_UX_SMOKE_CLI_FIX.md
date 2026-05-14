# Agent 18: Editor UX Smoke CLI Fix

## Goal

Make the official editor UX smoke command trustworthy. The direct node command
currently passes, but the package script invocation times out during readiness
checks even when the server is healthy.

## Evidence

Passing command:

```bash
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

Failing commands observed on a healthy dev server:

```bash
pnpm --dir apps/game smoke:editor-ux -- --no-server
pnpm --dir apps/game smoke:editor-ux --no-server
```

Failure:

```txt
Error: Timed out waiting for http://127.0.0.1:4322/
```

Relevant source:

- `apps/game/package.json`
- `apps/game/scripts/editor-ux-smoke.mjs`
- `apps/game/scripts/editor-ux-smoke-browser.mjs`
- `apps/game/scripts/lib/browserHarness.mjs`

## Required Fix

1. Normalize package-script arguments.
   The smoke runner must handle both of these forms:

```bash
pnpm --dir apps/game smoke:editor-ux --no-server
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

2. Make readiness failures actionable.
   If `waitForUrl()` times out, include the last fetch error/status and the URL
   being probed. The current error is too opaque for agent handoff.

3. Keep no-server mode honest.
   `--no-server` should not spawn a dev server, but it should still verify that
   the provided server is healthy before launching Playwright.

4. Add command-palette regression coverage.
   Extend the editor UX browser smoke so it verifies the command palette can:
   - open with `Ctrl+K`
   - filter to `Open Asset Library`
   - click the command without forced pointer events
   - switch to the `Create` workspace
   - close after command execution

5. Keep layout checks intact.
   Do not weaken the existing viewport, canvas, overlap, button-count, or chrome
   coverage checks to make the command pass.

## Acceptance Criteria

- `pnpm --dir apps/game smoke:editor-ux --no-server` passes against a healthy
  server on port 4322.
- `pnpm --dir apps/game smoke:editor-ux -- --no-server` either passes or prints
  a clear documented usage error. Prefer passing both forms.
- The direct node command still passes.
- The smoke fails if the command palette is visible but canvas intercepts
  command clicks.
- Failure output identifies which viewport or interaction failed.

## Verification Commands

Start or reuse a healthy game dev server, then run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
pnpm --dir apps/game smoke:editor-ux --no-server
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

If one package-script form is intentionally unsupported, update this packet and
the package README-style handoff notes with the canonical command.

## Handoff Notes

Report:

- The final supported smoke command syntax.
- Any changed argument parsing behavior.
- Any new Playwright assertions.
- Whether the command-palette click check passes without `force: true`.
- Any known flaky readiness behavior that remains.
