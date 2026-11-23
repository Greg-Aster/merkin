# LOD Performance

This folder owns game-owned level-of-detail policy for runtime performance
systems.

- `index.ts` defines generic LOD groups and ordered tier definitions.
- `evaluateLodTier()` is a pure distance/significance evaluator.
- `createLodPolicyConfigFromPerformanceConfig()` maps the current
  `game:performanceConfig` resource into the LOD policy consumed by
  `runtime.ts`.

## Modes

- `off` keeps the group's default tier selected.
- `diagnostic` keeps the default tier selected while reporting the tier the
  evaluator would recommend.
- `distance` is the active runtime mode for selecting configured tiers.

The current runtime reports LOD tier selection and can swap authored
`PerformanceLod` renderable payloads through ECS when level/prefab data defines
alternate tier payloads. Entities without authored payloads remain
evaluation-only.
Unknown LOD policy modes are rejected by `parseLodPolicyConfig()`.

## Boundaries

LOD policy code is generic game-runtime code. It must not import Svelte, Astro,
Three, Rapier, browser globals, `src/editor`, or `src/levels`. Level-owned LOD
thresholds arrive through composed performance resources, while alternate
renderable payloads arrive as level/prefab `PerformanceLod` component data.
