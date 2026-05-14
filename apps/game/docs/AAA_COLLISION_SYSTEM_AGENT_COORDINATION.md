# AAA Collision System Agent Coordination

## Goal

Bring collision authoring, runtime physics, terrain heightmaps, and editor
diagnostics closer to a professional game-engine workflow for a static
Threlte/Three.js browser game.

This is not a targeted level fix. The work must improve the engine contract so
new and changing levels can author collision reliably without hard-coded level
branches, brittle per-level exceptions, or hidden runtime behavior.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/ENGINE_ARCHITECTURE.md`
- `apps/game/AAA_GRAPHICS_REFACTOR_TRACKER.md`
- `apps/game/AAA_WEB_ENGINE_AGENT_COORDINATION.md`

## Current Problems To Solve

- Collision is coupled to render visibility, so hidden collision proxies do not
  work.
- Collision channels exist in authored data but are not consistently mapped to
  actual Rapier collision groups.
- The level editor exposes low-level collision fields but not production-grade
  authoring actions such as visual-only, blocker, walkable, trigger, proxy, fit,
  or bake.
- Asset collider sizing falls back to transform scale when mesh bounds metadata
  is missing.
- Mesh-to-collider authoring is manual and URL-driven instead of a guided
  pipeline.
- Terrain heightmap, ground plane, baked collider, and visual chunks are present
  but difficult to understand and validate from the editor.
- Existing audits pass even when gameplay collision authoring is confusing or
  physically wrong.

## Agent Work Packets

1. `AAA_COLLISION_SYSTEM_AGENT_01_RUNTIME_CONTRACT.md`
   - Owns render/collision decoupling and collision-only runtime proxies.

2. `AAA_COLLISION_SYSTEM_AGENT_02_LAYER_MAPPING.md`
   - Owns collision channel to Rapier collision group mapping.

3. `AAA_COLLISION_SYSTEM_AGENT_03_EDITOR_AUTHORING_UX.md`
   - Owns production-grade inspector controls and collision authoring actions.

4. `AAA_COLLISION_SYSTEM_AGENT_04_MESH_COLLIDER_BAKE_PIPELINE.md`
   - Owns selected mesh to collider asset generation and metadata.

5. `AAA_COLLISION_SYSTEM_AGENT_05_TERRAIN_HEIGHTMAP_WORKFLOW.md`
   - Owns terrain source selection, heightmap, bake, cook, and publish UX.

6. `AAA_COLLISION_SYSTEM_AGENT_06_DIAGNOSTICS_AND_AUDITS.md`
   - Owns collision review reports, editor diagnostics, and validation gates.

7. `AAA_COLLISION_SYSTEM_AGENT_07_SCENE_MIGRATION_AND_CLEANUP.md`
   - Owns migrating authored scenes after the shared systems are ready.

## Suggested Order

Agents 01, 02, and 06 can start first. They define the runtime truth and
validation surface.

Agents 03, 04, and 05 can work in parallel after reading the contracts from 01
and 02. If they need shared types, coordinate before editing the same type file.

Agent 07 should run last or near-last. Scene edits should validate the generic
pipeline, not compensate for missing engine behavior.

## Shared Guardrails

- Follow `AAA_ENGINE_UPDATE_PROTOCOL.md` when changing shared collision,
  physics, terrain, readiness, or scene-document contracts. Keep an impact map
  and update affected runtime, editor, generated data, diagnostics, and audits
  in a staged change set.
- Do not add `if (levelId === 'yggdrasil')` or similar branches to generic
  runtime, editor, loading, or validation code.
- Do not assume visible render meshes are correct collision meshes.
- Do not make render visibility control physics presence.
- Do not silently generate player-blocking colliders for visual detail meshes.
- Do not add new orphan scripts. Every script must be wired to a package command,
  editor route, audit, or documented manual workflow.
- Do not hide validation failures by weakening budgets or removing checks.
- Keep static Astro deployment working. No server-only runtime dependency may be
  required for the shipped player.
- Use Yggdrasil, Solitude, and Sci-Fi Room as validation fixtures only.

## Shared Terms

- `visual-only`: renders but never blocks player physics.
- `collision-only`: has physics but no render mesh in player runtime.
- `walkable`: player-supporting world collision.
- `blocker`: player-blocking non-walkable world collision.
- `trigger`: sensor volume for gameplay or editor tooling.
- `detail`: non-player collision or diagnostic-only geometry that must not block
  player movement.
- `baked terrain`: heightfield/trimesh terrain collision loaded from a terrain
  manifest, separate from visual terrain chunks.

## Required Validation

Each agent should run the narrowest relevant checks and report them. For most
code changes, run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
```

For broader runtime/editor changes, also run:

```bash
pnpm --dir apps/game release:gate:quick
```

For terrain or generated asset pipeline changes, also run the relevant bake or
cook command and the generated drift check:

```bash
pnpm --dir apps/game check:generated-drift
```

## Final Handoff Requirements

Each agent must report:

- impact map for any shared contract changed
- files changed
- exact behavior changed
- how render, collision, spawn, terrain, and readiness were considered
- commands run
- any validation gaps that remain
- any files intentionally left for another agent
