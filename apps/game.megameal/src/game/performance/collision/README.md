# Collision Performance

This folder is reserved for game-owned collision performance policy, including
spatial lookup and broadphase-friendly walkable queries.

The current runtime foundation includes pure TypeScript collision-performance
planning:

- chunk and walkable mesh triangle summaries;
- spatial bucket summaries and query candidate planning;
- warning-only budget diagnostics; and
- compatibility helpers for the existing `game:performanceConfig` modes.

The current supported modes are `off`, `diagnostic`, and `spatial`. `diagnostic`
allows summaries, metrics, and warnings. `spatial` builds a cached runtime
spatial bucket index from current mesh colliders, exposes query diagnostics, and
lets walkable grounding query candidate mesh chunks before sampling ground
height. It does not remove colliders, mutate the physics adapter, stream
collision chunks, or add triangle-budget gates. Unsupported modes are inert here
and remain rejected by the shared performance config parser.

This folder must stay level-agnostic. It must not import `src/levels`,
`src/editor`, Svelte, Astro, Three, Rapier, browser globals, or collision cook
scripts. Level-owned config and generated collision products remain outside this
folder.
