# AAA Next 08: Runtime Rendering Architecture

## Goal

Make the runtime renderer explicit, staged, and auditable so rendering behavior is owned by engine systems instead of scattered component side effects.

## Coordination

Before starting, read `AAA_NEXT_AGENT_COORDINATION.md`. This agent owns render-stage architecture and runtime bundle boundaries. Coordinate with lighting/postFX, performance certification, and runtime/authoring separation agents.

## Agent Assignment

Make the render lifecycle explicit enough to debug and certify. Your job is to clarify ownership of render phases, diagnostics, and runtime/editor bundle boundaries without creating a second rendering framework inside the app.

Priority target: one lifecycle/diagnostic improvement that helps lighting, performance, and streaming agents reason about the same runtime state.

## Current Baseline

- Threlte/Three runtime is functional.
- Post-processing is centralized in `SimplePostProcessing.svelte`.
- Manual chunk ownership exists and is audited.
- Runtime still has component-level rendering responsibilities that should become explicit contracts.

## Target Architecture

Rendering should be staged:

1. Runtime manifest load.
2. Asset preload/readiness.
3. Scene graph creation.
4. Lighting/profile application.
5. Post-processing setup.
6. Diagnostics and telemetry.
7. Player activation.

Each stage should be observable and have clear ownership.

## Work Packages

1. Define render lifecycle phases.
   - Add a typed runtime render lifecycle model if needed.
   - Avoid duplicating existing readiness gates.

2. Clarify component responsibilities.
   - Components render views.
   - Stores/managers own readiness, profile selection, and asset state.
   - Runtime manifest adapters own data conversion.

3. Tighten bundle boundaries.
   - Ensure editor chunks do not leak into gameplay boot.
   - Watch large vendor/editor chunks.
   - Keep chunk ownership audit strict.

4. Add render diagnostics.
   - Active render profile.
   - Required actors rendered.
   - Missing actors.
   - PostFX enabled/disabled.
   - Renderer draw calls and triangle count.

5. Add shader/material feature registry if needed.
   - Keep this narrow.
   - Do not invent a custom material system unless audits require it.

## Key Files

- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/game/src/threlte/levels/RuntimeActorNode.svelte`
- `apps/game/src/threlte/levels/RuntimeGameplayRenderer.svelte`
- `apps/game/src/threlte/systems/SimplePostProcessing.svelte`
- `apps/game/src/threlte/stores/runtimeRenderRegistry.ts`
- `apps/game/src/threlte/stores/runtimeRenderProfileStore.ts`
- `apps/game/scripts/lib/chunkOwnership.mjs`
- `apps/game/astro.config.mjs`

## Validation

Run:

```bash
pnpm --dir apps/game audit:chunks
pnpm --dir apps/game audit:engine
pnpm --dir apps/game smoke:engine
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
pnpm --dir apps/game smoke:visual
pnpm --dir apps/game type-check
```

## Do Not

- Do not move editor code into gameplay runtime.
- Do not add level-specific rendering branches as shortcuts.
- Do not let components silently bypass readiness gates.
- Do not add a broad abstraction before measuring actual duplication.

## Done Means

- Runtime render phases are explicit enough to debug.
- Bundle ownership remains clean.
- Required actor rendering diagnostics remain strict.
- Visual and boot smoke pass.
