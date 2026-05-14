# Agent 21: Package Smoke Reliability

## Goal

Make the official package-script editor UX smoke command pass reliably in
no-server mode. The direct node invocation passes, but the `pnpm` package script
still times out during readiness preflight.

## Current Evidence

Passing:

```bash
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

Failing:

```bash
pnpm --dir apps/game smoke:editor-ux --no-server
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

Observed failure:

```txt
Timed out waiting for http://127.0.0.1:4322/ (last fetch error: fetch failed)
```

The server is healthy immediately after the failure:

```bash
curl -I http://127.0.0.1:4322/
pnpm --dir apps/game exec node -e "const r=await fetch('http://127.0.0.1:4322/'); console.log(r.status, r.ok)"
```

Relevant files:

- `apps/game/package.json`
- `apps/game/scripts/editor-ux-smoke.mjs`
- `apps/game/scripts/editor-ux-smoke-browser.mjs`
- `apps/game/scripts/lib/browserHarness.mjs`

## Required Work

1. Reproduce both package-script failures before editing.
   Capture the exact command output.

2. Identify why `waitForUrl()` fails only through the package script.
   Compare at least:
   - `process.argv`
   - relevant `npm_config_*` variables
   - `GAME_DEV_PORT`
   - `PUBLIC_EDITOR_API_BASE`
   - `EDITOR_API_BASE`
   - fetch error `cause`, not just `error.message`

3. Make readiness robust.
   Acceptable approaches:
   - fix the argument/env parsing if it is choosing the wrong mode or URL
   - replace the preflight fetch with a lower-level `node:http`/`node:https`
     readiness probe
   - add a fetch fallback that uses `http.request()` when undici reports
     `fetch failed`

   Do not remove the readiness check entirely. In no-server mode the script
   should still fail clearly if no healthy server is available.

4. Preserve both supported no-server forms:

```bash
pnpm --dir apps/game smoke:editor-ux --no-server
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

5. Preserve direct invocation:

```bash
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
```

6. Preserve command-palette coverage.
   Do not remove or weaken the `Open Asset Library` click check in
   `editor-ux-smoke-browser.mjs`.

## Acceptance Criteria

- Both package-script forms pass against a healthy server.
- Direct node smoke still passes.
- Failure output for an unhealthy server includes the URL and actionable detail.
- No-server mode does not spawn a dev server.
- Browser smoke still fails if the command palette is visible but canvas
  intercepts command clicks.

## Verification Commands

With a healthy game dev server on port 4322:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec node ./scripts/editor-ux-smoke.mjs --no-server
pnpm --dir apps/game smoke:editor-ux --no-server
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

Also verify the negative case:

```txt
Stop the dev server, run one no-server smoke command, and confirm it fails fast
with a clear "server unavailable" style message.
```

## Handoff Notes

Report:

- Root cause found.
- Files changed.
- Final supported command syntax.
- Commands run.
- Whether direct and package smoke both passed.
- Any remaining flake risk.
