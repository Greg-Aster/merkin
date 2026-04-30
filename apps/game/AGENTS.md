# Game Agent Instructions

These rules apply inside `apps/game`. The game also uses runtime assets from
`apps/megameal/public`, so apply these rules when changing game-facing assets,
manifests, terrain, collision, or level data there.

## Architecture Standard

Use AAA-style game-engine practices adapted for the web. Treat levels as
compiled runtime products, not loose collections of components and raw assets.

The expected pipeline is:

```txt
authoring assets
  -> bake / optimize / validate
  -> runtime manifests
  -> staged loading / streaming
  -> verified render + collision + spawn state
  -> player activation
```

Do not add systems that depend on runtime hope, implicit ordering, hidden side
effects, or components directly doing unrelated engine work.

## Non-Negotiable Rules

- Separate source assets from runtime assets. Large `.blend`, raw captures, and
  oversized GLBs are authoring inputs, not web runtime payloads.
- Do not introduce or rely on giant single-file levels. Split large levels into
  chunks with explicit manifests, LODs, and optional/required asset groups.
- Render meshes and collision meshes are separate assets. Never assume the
  visible mesh is also a correct player collider.
- Every level must have explicit spawn points, required assets, collision data,
  and readiness criteria.
- Player input and gameplay activation must wait for the level-ready gate:
  manifest loaded, required render assets loaded, required collision loaded,
  spawn validated, and critical systems registered.
- Missing required assets, missing colliders, invalid spawn points, and manifest
  mismatches must fail loudly or surface clear diagnostics.
- Avoid fragile component ownership. Components may render views, but engine
  contracts belong in services, managers, stores, typed adapters, or validated
  data.

## Runtime Systems

Keep these concerns separated:

- asset loading and cache ownership
- level manifest parsing and validation
- scene adaptation from manifest data to Three/Threlte objects
- collision and physics proxy creation
- player controller and movement policy
- interaction registration
- streaming / world partition
- save state and game state
- editor-only state and tooling
- performance and quality scaling

If a change crosses several of these boundaries, define the contract first and
keep the implementation staged.

## Asset Budgets And Performance

All new levels and major assets need explicit budgets. For web runtime, prefer:

- initial playable payload under 60 MB whenever possible
- individual runtime GLB chunks under 20-40 MB
- texture sizes capped by device tier; avoid 4K unless justified for a hero
  asset
- separate mobile / low / high quality tiers when a scene is expensive
- measurable draw-call, triangle, texture-memory, light, and collider counts

If a level exceeds budget, do not mask the issue in code. Propose or implement
chunking, compression, LODs, impostors, texture reduction, or streaming.

## Collision Discipline

- Author simple collision proxies for walkable surfaces, blockers, ramps, and
  interaction volumes.
- Keep collision layers explicit: player, world, trigger, interaction, camera,
  editor-only.
- Add or maintain debug views that show actual runtime colliders.
- Treat invisible walls and walk-through visible objects as validation failures,
  not isolated bugs.

## Manifests As Contracts

Level manifests should be typed and validated. They should describe:

- level id and version
- required and optional chunks
- render assets and LODs
- collision assets and collision layers
- spawn points
- interaction volumes
- streaming cells or zones
- budget metadata
- diagnostics metadata for editor/build reports

Do not bypass manifests by hard-coding level-specific asset loading in random
components unless the file is explicitly an adapter being retired.

## Checks And Handoff

For game code changes, run the most relevant checks available, usually:

```bash
pnpm --dir apps/game type-check
```

For asset, level, collision, or manifest changes, also run or update the
relevant audit/bake/validation script. If no validation script exists for the
changed surface, call that out and consider adding one.

Every handoff for game work must state:

- whether runtime payload size, collision, and required assets were considered
- which checks or validation scripts were run
- whether any level or asset remains over budget
- any known missing collision, streaming, LOD, or manifest validation gaps
