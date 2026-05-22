# Megameal Site Audit Agent Briefs

These briefs split the Megameal site crawl into separate read-only audit tracks. Each agent should produce a report first, not a fix, unless the user explicitly assigns implementation work.

## Shared Context

- Repo: `/home/greggles/Merkin`
- App: `apps/megameal`
- Existing audit report: `apps/megameal/reports/2026-05-21-link-and-build-audit.md`
- Existing link audit command: `pnpm --dir apps/megameal audit:links`
- Existing CSS audit command: `pnpm --dir apps/megameal audit:css`
- Existing type check command: `pnpm --dir apps/megameal type-check`

## Required First Steps

1. Read `/home/greggles/Merkin/AGENTS.md`.
2. Read `/home/greggles/Merkin/apps/megameal/AGENTS.md`.
3. Run `git status --short` and treat existing dirty files as user work unless the assignment says otherwise.
4. Review the existing link/build report before duplicating findings.

## Build Notes

The normal build command is:

```bash
pnpm --dir apps/megameal build
```

At the time these briefs were written, build generation completed but the command failed afterward in `scripts/audit-built-html.mjs` because `dist/audio/sfx/audition/index.html` lacked an `<html>` element. Agents may still inspect the generated `apps/megameal/dist/` output if it exists, but must report the build failure clearly.

## Handoff Format

Write findings to a Markdown file under `apps/megameal/reports/`.

Use this structure:

```md
# <Audit Name> - <Date>

## Commands

- `<command>`: passed/failed/not run, with reason

## Summary

- Highest-impact finding
- Next highest-impact finding

## Findings

### <Severity>: <Short Title>

- Source: `<file or route>`
- Evidence: `<exact selector, route, output, or snippet summary>`
- Impact: `<what breaks for users or maintainers>`
- Suggested owner/fix path: `<route, component, content collection, config, or script>`

## Deferred

- Anything not checked and why
```

## Scope Rules

- Stay read-only unless explicitly asked to fix.
- Do not revert unrelated dirty files.
- Do not add CSS as part of an audit.
- Do not run browser/dev-server smoke checks unless assigned the browser-runtime brief or explicitly asked by the user.
- Prefer deterministic `dist/` inspection before runtime/browser checks.

