# Culling Performance

This folder is reserved for game-owned visibility and culling policy. Stage one
provides only configuration and diagnostics; active culling is future work.

## Stage-Two Foundation

`index.ts` defines framework-neutral culling policy types and pure evaluators
for distance, frustum-like visibility inputs, relevance radii, hysteresis, and
update/render inclusion decisions.

The culling policy consumes the existing performance config mode for
`systems.culling`. Current supported modes are:

- `off`: return inclusive policy results and do not perform active culling.
- `diagnostic`: compute policy decisions for diagnostics or future runtime
  state, without mutating renderer, physics, UI, editor, or level data.

Unsupported modes are rejected by the culling policy resolver. Runtime adapter
integration remains future work and must keep renderer-specific object mutation
outside this folder.
