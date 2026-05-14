# AAA Collision System Agent 01 - Runtime Collision Contract

## Goal

Decouple runtime physics from render visibility and support first-class
collision-only proxies without creating special cases for individual levels.

Professional game editors must allow an object to be:

- visible with collision
- visible without collision
- invisible with collision
- invisible without collision

The current runtime blocks the third case, which makes hidden proxy authoring
impossible and contributes to confusing walk-through or invisible-wall behavior.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/AAA_COLLISION_SYSTEM_AGENT_COORDINATION.md`
- `apps/game/src/threlte/levels/RuntimeActorNode.svelte`
- `apps/game/src/threlte/editor/EditorNodePhysicsBody.svelte`
- `apps/game/src/threlte/engine/sceneAdapter.ts`
- `apps/game/src/threlte/engine/collisionPolicy.ts`

## Primary Ownership

- `apps/game/src/threlte/levels/RuntimeActorNode.svelte`
- `apps/game/src/threlte/editor/EditorNodePhysicsBody.svelte`
- Runtime/editor helper functions needed to express render/collision presence

Avoid owning collision group mapping. That belongs to Agent 02.

## Current Problem

Runtime actor collision is mounted only when the actor is visible. In
`RuntimeActorNode.svelte`, the conditions are effectively:

```txt
collision && visible -> mount collider
visible -> render visual
```

That means an authored collision proxy cannot be hidden while remaining active.
Editor preview has a similar pattern in `EditorNodePhysicsBody.svelte`.

## Work Steps

1. Define a small runtime helper for actor presence:
   - `shouldRenderActorVisual(actor)`
   - `shouldMountActorCollision(actor)`
   - `shouldRenderVisualInsideCollider(actor)`
2. Make `shouldMountActorCollision` depend on authored/resolved collision, not
   render visibility.
3. Preserve visual visibility behavior for rendering only.
4. Support collision-only actors cleanly:
   - no visual mesh in player runtime
   - physics body still mounted
   - overlay/debug can still show collider if enabled
5. Keep gameplay renderer behavior intentional. Gameplay visuals should not
   accidentally disappear because a collision proxy is hidden.
6. Update editor preview behavior so hidden collision proxies can be inspected
   when collision overlay is enabled.
7. Add or update validation so a hidden actor with active collision is allowed
   and no longer treated as impossible.

## Guardrails

- Do not turn every invisible actor into physics. Only actors with resolved
  collision should mount physics.
- Do not introduce level-id branches.
- Do not make collision-only actors render placeholder meshes in the player.
- Do not break `physicsAttachment: outside-collider`.
- Do not change terrain collider behavior unless needed by the shared contract.

## Acceptance Criteria

- Hidden authored collision proxies work in player runtime.
- Hidden authored collision proxies can be seen in collision overlay/editor
  diagnostics.
- Visible meshes with collision still behave as before.
- Visual-only meshes remain non-colliding.
- Runtime code clearly separates render presence from physics presence.

## Validation

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

## Handoff

Report:

- files changed
- new helper names and contract
- how collision-only actors are represented
- any follow-up needed from Agent 03 or Agent 06
