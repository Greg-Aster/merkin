# Game Engine Smoke Test Matrix

Run this matrix before pushing major engine changes.

## Required Command

```bash
pnpm --dir apps/game build
pnpm --dir apps/game smoke:engine
pnpm --dir apps/game smoke:boot
pnpm --dir apps/game profile:three-runtime
```

Expected result:

- build succeeds
- smoke build-path validation succeeds
- browser boot check passes on clean ports
- Three runtime profile is generated successfully
- no missing import/export runtime failures
- no Svelte warning clusters beyond accepted known limitations

## Manual Smoke Tests

### 1. Boot Game

Path:

- `http://localhost:4322/`

Checks:

- loading screen appears, then clears
- no console errors
- runtime diagnostics report engine, terrain, physics, and player readiness

### 2. Boot Editor

Path:

- `http://localhost:4322/?editor=1`

Checks:

- editor panel loads
- scene content loads
- no console errors
- runtime diagnostics report editor mode, tools bridge status, and scene persistence status

### 3. Switch Levels

Checks:

- transition from observatory to at least one level and back
- no stuck loading state
- no stale scene state from previous level

### 4. Spawn Player

Checks:

- player spawns in normal gameplay mode
- no spawn-system console errors
- player diagnostics become ready

### 5. Open Settings

Checks:

- settings button opens settings
- settings overlay closes cleanly
- no pointer/input lock regressions

### 6. Run AI Mesh Generate

Path:

- editor mode, select one prefab or mesh-backed asset

Checks:

- ComfyUI can be started or refreshed from the editor
- backend reports status clearly
- generate action enters queued/running state
- final generated asset replaces or adds correctly

### 7. Toggle Neural Stylization

Checks:

- can enable and disable neural stylization
- no import/runtime crash
- settings still remain responsive

## Failure Policy

If any smoke test fails:

1. capture the failing subsystem
2. record the diagnostics panel state
3. fix the subsystem before pushing

Do not treat “it mostly worked” as a pass for engine work.
