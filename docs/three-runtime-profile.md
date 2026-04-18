# Three Runtime Profile

Generated from:

```bash
pnpm --dir apps/game profile:three-runtime
```

This is a source-level profile of which application modules in the normal game boot path
directly import `three` or `three/examples`.

## Static Shell Graph

These files are in the static shell/runtime graph rooted at `src/threlte/Game.svelte`.

- `src/threlte/systems/InteractionSystem.svelte`
- `src/threlte/features/performance/utils/lodUtils.ts`
- `src/threlte/systems/AssetLoader.svelte`
- `src/threlte/features/performance/systems/LOD.svelte`
- `src/threlte/systems/Renderer.svelte`

Implication:

- the base shell still pulls Three into runtime before the gameplay level graph loads
- the heaviest shell-side pressure is interaction, LOD/performance utilities, asset loading, and renderer setup

## Initial Gameplay Boot Graph

These files are in the initial gameplay boot graph currently rooted at:

- `src/threlte/systems/Physics.svelte`
- `src/threlte/features/player/Player.svelte`
- `src/threlte/levels/HybridObservatory.svelte`

Direct Three importers in that graph:

- `src/threlte/components/HybridFireflyComponent.svelte`
- `src/threlte/systems/StarMap.svelte`
- `src/threlte/features/player/Player.svelte`
- `src/threlte/core/ECSIntegration.ts`
- `src/threlte/features/lighting/LightingManager.ts`
- `src/threlte/core/LevelSystem.ts`
- `src/threlte/components/StarSprite.svelte`
- `src/threlte/features/multiplayer/components/PlayerAvatar.svelte`
- `src/threlte/systems/Skybox.svelte`

Implication:

- the biggest gameplay-side Three pressure is not editor code
- it is the observatory boot stack:
  - fireflies
  - star map
  - player
  - ECS/lighting support

## Refactor Order

If we want to reduce `three-vendor` pressure without blind churn, the next best targets are:

1. Keep shell-side Three users minimal
- `InteractionSystem.svelte`
- `AssetLoader.svelte`
- `LOD.svelte`
- `lodUtils.ts`
- `Renderer.svelte`

2. Make observatory-heavy systems more optional or more isolated
- `HybridFireflyComponent.svelte`
- `StarMap.svelte`
- `Skybox.svelte`

3. Avoid spending time on editor chunking for this specific problem
- editor chunking is improving, but it is not the main reason `three-vendor` is large in gameplay boot

## Current Conclusion

Do not refactor Three blindly.

The source profile says the next meaningful runtime reductions should focus on:

- gameplay boot systems using Three directly
- especially observatory-specific scene systems
- and the small set of shell systems that still import Three before gameplay fully initializes
