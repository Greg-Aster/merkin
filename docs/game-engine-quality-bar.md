# Game Engine Quality Bar

This is the minimum quality bar for the MEGAMEAL engine before feature work should be considered stable.

## Runtime Stability

- Zero console `error` output during a normal gameplay boot.
- Zero console `error` output during editor boot at `?editor=1`.
- Zero missing import/export runtime failures.
- Zero dead-end editor actions for core workflows.
- All asset/load failures surface through runtime diagnostics with a clear message.

## Build Stability

- `pnpm --dir apps/game build` passes.
- Build warnings are either fixed or explicitly accepted.
- Current accepted warning:
  - `three-vendor` bundle size warning, pending deeper Three.js profiling/refactor work.

## Editor Stability

- Editor scene loads from disk when the tools bridge is available.
- Editor falls back to local scene storage cleanly when the tools bridge is unavailable.
- AI Mesh workflow reports:
  - ComfyUI status
  - backend readiness
  - queue/running state
  - final asset output
- Selection state is visible and understandable.

## Gameplay Stability

- Level transitions do not leave stale runtime state behind.
- Spawn system waits for valid player readiness before issuing spawn work.
- Terrain readiness gates removal of the loading screen.
- Player runtime is disabled intentionally in editor mode.

## Diagnostics Standard

The engine should explain:

- engine boot phase
- current mode
- terrain readiness
- physics readiness
- player readiness
- editor readiness
- tools bridge status
- ComfyUI status
- AI mesh backend status
- recent asset failures

If a subsystem fails silently, it does not meet the quality bar.
