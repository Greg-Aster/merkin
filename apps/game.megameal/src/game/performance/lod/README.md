# LOD Performance

This folder is reserved for game-owned level-of-detail policy and runtime
systems. Stage one provides only configuration and diagnostics; active LOD
selection is future work.

Stage two adds a framework-free policy foundation:

- `index.ts` defines generic LOD groups and ordered tier definitions.
- `evaluateLodTier()` is a pure distance/significance evaluator.
- `createLodPolicyConfigFromPerformanceConfig()` maps the current
  `game:performanceConfig` resource into an inert LOD policy.

## Modes

- `off` keeps the group's default tier selected.
- `diagnostic` keeps the default tier selected while reporting the tier the
  evaluator would recommend.
- `distance` is the explicit active mode for future runtime integration.

The current shared performance config contract accepts only `off` and
`diagnostic`, so checked-in level package performance files cannot silently
enable active LOD behavior yet. Unknown LOD policy modes are rejected by
`parseLodPolicyConfig()`.

## Boundaries

LOD policy code is generic game-runtime code. It must not import Svelte, Astro,
Three, Rapier, browser globals, `src/editor`, or `src/levels`. Level-owned LOD
groups and tier values should arrive through composed performance resources or
future runtime scene data, not direct imports from level packages.
