# NPC Moving Actor System Plan

Status: implementation packet reference

This packet introduces fireflies through a generic NPC moving-actor contract.
All fireflies are NPCs. There is no separate non-NPC ambient firefly field.

## Research Direction

Modern game-engine guidance points toward data-oriented actors and batched
processors:

- Unreal MassEntity uses data fragments and processors over entity queries.
- Unreal Significance Manager centralizes importance decisions so less important
  actors can update less often.
- Unity Entities keeps component data separate from systems that process entity
  queries.

The target pattern for this project is therefore:

```text
level NPC data
  -> package composition
  -> Npc / MovementBehavior / LightModulation / InteractionTarget / Conversation
  -> generic fixed-step game systems
  -> Transform / Light
  -> render and light sync
```

## Performance Rules

- V1 loads three authored Observatory firefly NPCs.
- V1 does not need lazy loading for this count.
- Future large moving-actor groups must use the same NPC contract and the same
  significance/light-budget path before shipping.
- Movement is deterministic math from stable data, time, and a phase value.
- Movement and light work runs in generic fixed-step systems, not per-actor
  timers, animation loops, Svelte effects, or Three object mutations.
- Distance/significance tiers reduce update cadence for far actors.
- `LightModulation` can disable or dim far/over-budget point lights before
  `LightSyncSystem` projects them to Three.

## Boundaries

- Firefly is a level/content archetype, not a runtime system.
- Moving non-player authored world objects are NPC moving actors.
- The player, camera, particles, shader animation, water/sky motion, physics
  debris, and pure VFX are not NPC moving actors.
- Engine code owns generic schema/runtime primitives only.
- Game code owns generic NPC/movement/interaction/dialog systems.
- Level code owns firefly data and placement.
