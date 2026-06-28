# Agent Operating Contract

Status: current work-order authority
Last verified: 2026-06-27

This file resolves authority when agents work in `apps/game.megameal`.

## Authority Order

1. Direct user instruction for the current turn.
2. `AGENTS.md` for repo and project operating rules.
3. `ENGINE_CONTRACT_REGISTER.md` for current owner/status contracts.
4. `ARCHITECTURE.md` for target architecture.
5. `GAME_ENGINE_DESIGN_DOCUMENT.md` for intended product design.
6. Focused migration, cleanup, or future-feature docs for packet context only.

Do not edit `ARCHITECTURE.md`, `GAME_ENGINE_DESIGN_DOCUMENT.md`, `AGENTS.md`,
or this operating contract unless the user explicitly asks for
architecture/design/agent-instruction reconciliation or explicitly names those
files as part of the work.

`pnpm --dir apps/game.megameal audit:protected-docs` enforces this guard. If
the current user request explicitly authorizes protected-doc reconciliation,
validate with `ALLOW_PROTECTED_DOC_EDITS=explicit-user-request`; otherwise
report the conflict instead of editing protected docs.

## Current Product Boundaries

- `src/engine` owns reusable engine core, modules, adapters, runtime services,
  and data/schema contracts.
- `src/game` owns Merkin gameplay meaning, gameplay systems, runtime
  composition, and generic prefab spawning/registry mechanics.
- `src/levels` owns the installed product level package. Each
  `src/levels/<level>` folder owns that level's level data, asset manifest,
  product prefab definitions, audio content mapping, base render profile,
  skybox/environment data, runtime scene manifest, and bundle entrypoint.
- `src/levels/global` owns package settings, shared package assets/prefabs, and
  the runtime-scene router/default selection policy for the installed level
  package.
- `src/editor` owns optional external tooling surfaces such as the
  master-control architecture map.
- `src/app`, `src/pages`, and `src/ui` host browser routes and presentation.

## Current Editor Scope

The editor is optional local development tooling. The `/editor` master-control
map visualizes architecture ownership and live game state, while dedicated
editor workspaces may author approved checked-in level package data through
DEV-only file-owner APIs. These editor writes are source edits under
`src/levels`, not runtime state ownership, and they must remain removable
without breaking the normal game route, engine runtime, runtime scene loading,
adapters, or validation.

## Forbidden Shortcuts

- Do not add editor write surfaces without an explicit source owner, DEV-only
  API boundary, and focused validation.
- Do not hide level catalogs inside `src/game`.
- Do not import `src/editor` from normal runtime, game systems, or engine code.
- Do not add level-id branches to engine core or adapters.
- Do not make architecture/design docs claim implementation completeness that
  current code and focused validation have not proven.
- Do not use design or architecture documents as migration logs, implementation
  status ledgers, or justification for implementation drift.
