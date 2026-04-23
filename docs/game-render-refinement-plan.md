# Game Render Refinement Plan

## Goal

Move the game toward a cleaner, higher-end visual baseline by removing low-fidelity stylization hacks and replacing them only with centralized, maintainable rendering systems.

## Principles

- Prefer global engine and renderer systems over per-object tricks.
- Avoid additive fake atmosphere planes, outline shells, and palette overrides on imported assets.
- Keep authored level content separate from render policy.
- Only add effects that scale across the whole game and can be tuned centrally.

## Current Low-Quality / High-Maintenance Systems

- `apps/game/src/threlte/styles/RenderStyleSystem.svelte`
  - Toon material replacement.
  - Outline shell generation.
  - Palette-driven restyling of imported assets.
- `apps/game/src/threlte/components/ProceduralMesh.svelte`
  - Used heavily for placeholder environment forms in some levels.
- `apps/game/src/threlte/components/AmbientParticleField.svelte`
  - Can read as decorative FX rather than grounded atmosphere if overused.
- `apps/game/src/threlte/features/ocean/effects/UnderwaterEffect.svelte`
  - Needs separate quality review for particle-heavy underwater look.
- Procedural / placeholder geometry concentrated in:
  - `apps/game/src/threlte/levels/SciFiRoom.svelte`
  - `apps/game/src/threlte/levels/MirandaShip.svelte`
  - parts of `apps/game/src/threlte/levels/HybridObservatory.svelte`

## A+ Replacement Targets

- Native distance fog plus centralized height fog.
- Better sky and horizon participation in atmosphere.
- Stronger physically plausible lighting and reflection balance.
- Improved material calibration on imported assets.
- Higher quality terrain shading and surface breakup.
- Volumetric systems only if implemented globally and maintainably.

## Execution Order

1. Disable stylized render overrides in runtime levels.
2. Audit each level for placeholder and procedural environment art.
3. Replace placeholder geometry with authored assets or cleaner materials.
4. Improve core lighting, fog, and sky interaction globally.
5. Revisit particles, bloom, and post-processing with strict quality gates.
6. Remove dead legacy render code once replacement paths are stable.

## First Completed Step

- Runtime stylized render path disabled in the main styled levels.
- Settings UI no longer exposes the toon and outline controls as a supported look path.
