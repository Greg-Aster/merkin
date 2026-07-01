# Culling Performance

This folder owns game-owned visibility and culling policy.

`index.ts` defines framework-neutral culling policy types and pure evaluators
for distance, frustum-like visibility inputs, relevance radii, hysteresis, and
update/render inclusion decisions.

The culling policy consumes the existing performance config mode for
`systems.culling`. Current supported modes are:

- `off`: return inclusive policy results and do not perform active culling.
- `diagnostic`: compute policy decisions for diagnostics or future runtime
  state, without mutating renderer, physics, UI, editor, or level data.
- `distance`: active runtime mode. `runtime.ts` applies render/light visibility
  by replacing ECS `Renderable` and `Light` components before render sync.

Unsupported modes are rejected by the culling policy resolver. Renderer-specific
object mutation must stay outside this folder; active culling uses engine ECS
state that render/light sync systems already consume.
