# Collision Performance

This folder is reserved for game-owned collision performance policy, including
future spatial lookup and broadphase-friendly walkable queries. Stage one
provides only configuration and diagnostics; active collision optimization is
future work.

Stage two adds a pure TypeScript foundation for collision-performance planning:

- chunk and walkable mesh triangle summaries;
- spatial bucket summaries and query candidate planning;
- warning-only budget diagnostics; and
- compatibility helpers for the existing `game:performanceConfig` modes.

The current supported modes are still `off` and `diagnostic`. `diagnostic`
allows summaries, metrics, and warnings. It does not enable an active runtime
broadphase, collision streaming, physics adapter mutation, or triangle-budget
gate. Unsupported modes are inert here and remain rejected by the shared
performance config parser.

This folder must stay level-agnostic. It must not import `src/levels`,
`src/editor`, Svelte, Astro, Three, Rapier, browser globals, or collision cook
scripts. Level-owned config and generated collision products remain outside this
folder.
