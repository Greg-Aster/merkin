# Game Engine Stabilization Checklist

This checklist defines the minimum bar for considering the engine "stable" during active development.

## Runtime Baseline

- `pnpm --dir apps/game build` passes consistently.
- `pnpm --dir apps/game dev` starts both the game app and tools bridge without manual intervention.
- `?editor=1` loads without hydration failures.
- No missing import/export errors at runtime.
- No repeated console errors during idle editor usage.

## Editor Baseline

- Selecting, moving, duplicating, grouping, and deleting objects works without console errors.
- Editor-only systems lazy-load only when editor mode is enabled.
- AI Mesh actions surface actionable job status instead of silent failure.
- Right-panel/editor tabs remain scrollable at all viewport heights.
- Hierarchy, asset browser, and inspector controls are keyboard reachable.

## Gameplay Baseline

- Player spawn waits for physics, terrain, and player component readiness.
- Level transitions reset runtime state cleanly.
- Settings, audio, and multiplayer UI open without loading unrelated heavy systems upfront.
- Neural stylization and other optional systems degrade gracefully when unavailable.

## Build Cleanliness

- Known warnings are tracked by subsystem, not ignored globally.
- Accessibility warnings are reduced over time and fixed in touched files.
- Main game bundle stays focused on default play path.
- Editor, neural stylization, and other experimental systems are code-split.

## Current Priorities

1. Zero repeated console errors in editor mode.
2. Zero missing imports/exports.
3. Build passes with only known, triaged warnings.
4. Editor UI accessibility cleanup.
5. Bundle splitting for editor and optional systems.
6. Spawn/lifecycle coupling cleanup between `Game`, `SpawnSystem`, and `Player`.
