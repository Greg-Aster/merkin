# Agent 05 - Yggdrasil Collision Review

## Mission

Bring Yggdrasil into the final collision-authoring workflow after Agents 01-04
define the system-level contract.

## Current State

Measured from `src/threlte/editor/scenes/yggdrasil.scene.json`:

- Total nodes: 173
- Enabled collision nodes: 87
- No-collision nodes: 86
- Collision intents:
  - walkable: 5
  - blocker: 79
  - trigger: 3
- Explicit visual-only actors: 17
- Ground actors:
  - `yggdrasil-ground`
  - `yggdrasil-island-shelf`
  - `yggdrasil-dais`
  - `yggdrasil-bifrost-path`
  - `yggdrasil-spawn-pad`

The level currently uses:

- `settings.level.ground.mode: "scene-authored"`
- `settings.level.ground.collisionSource: "scene-colliders"`
- `settings.level.collision.terrain.source: "scene-authored"`
- `settings.level.collision.defaults.primitiveCollisionByDefault: true`

## Required Content Pass

Classify every visible no-collision geometry node as one of:

- intentional visual-only
- missing blocker
- missing walkable
- missing trigger
- detail mesh candidate
- collision-only proxy not meant to render

Then update the scene so the classification is explicit in data.

## Authoring Rules

- Keep large decorative merged meshes visual-only unless a baked collider is
  truly needed.
- Prefer simple primitive proxy colliders for traversal and blockers.
- Use baked mesh colliders only for shapes that simple primitives cannot
  represent.
- Do not make the world tree or merged vista assets automatic physics bodies.
- Keep spawn supported by authored walkable collision.
- Keep ground ownership explicit in both `collision.roles.groundActorIds` and
  `ground.groundActorIds` until the system contract says otherwise.

## Verification

- Run direct Yggdrasil build report and confirm no errors/warnings.
- Run `pnpm --dir apps/game audit:collision`.
- Run `pnpm --dir apps/game cook:runtime-assets`.
- Run `pnpm --dir apps/game check:generated-drift`.
- Playtest Yggdrasil spawn and primary traversal path.
- In edit mode, enable collision overlay and verify:
  - spawn pad is visible
  - ground actors are visible
  - blockers are visible
  - visual-only objects are distinguishable from missing collision

## Out Of Scope

- Do not modify generic engine code in this content pass.
- Do not add level-id branches.
- Do not use invisible support colliders as undocumented fixes. Name and
  classify them as collision proxies.
