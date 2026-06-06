# Player Controls Migration Plan

Status: desktop control foundation implemented and validated
Source engine: `/home/greggles/Merkin/apps/game`
Target engine: `/home/greggles/Merkin/apps/game.megameal`

This plan covers the clean migration of runtime player controls from the old
game into the new contract-first engine. It is intentionally a plan document
only. Runtime implementation must start by updating `ENGINE_CONTRACT_REGISTER.md`
for any changed input, interaction, or charged-action contract.

## Purpose

The old player controller proves the required behavior, but it is also a
coupled Svelte/Threlte/Three/Rapier/audio/VFX component. The new engine must
reuse the behavior, not the implementation.

Migration rule:

```text
Use apps/game as behavior evidence.
Build input contracts, commands, events, and systems in apps/game.megameal.
Do not copy the old Player.svelte control implementation.
```

## Behavior To Preserve

Required player-control behavior:

- Desktop mouse look is active only while the player is clicking and holding
  the look button on the game canvas. Moving the mouse across the game canvas
  without holding must not rotate the player or camera.
- Releasing the look button exits look mode immediately.
- When the player is not holding the look button, the mouse is available for
  selecting, inspecting, or interacting with world objects.
- A press/release with minimal movement is a click interaction, not a look drag.
- WASD and arrow keys drive forward/back/left/right movement.
- Space requests a jump.
- Shift requests run/sprint while held.
- A light-pulse style action charges while held and releases an effect on
  button/key release.
- Gamepad support should remain compatible with movement, look, jump,
  run/sprint, inspect/select, and charge/release actions.
- Mobile requires custom touch controls rather than relying on desktop pointer
  or keyboard assumptions.
- UI focus, page visibility, window blur, and scene readiness must gate gameplay
  input.

Old-engine behavior evidence:

- `apps/game/src/threlte/features/player/Player.svelte` keeps `isMouseDown`,
  starts look on mouse down, stops look on mouse up, and only applies mouse
  movement while the button is held.
- The old mouse-up path treats small motion as a click interaction.
- `apps/game/src/threlte/engine/runtimeInputBindings.ts` defines movement,
  jump, sprint, and light-pulse actions with keyboard binding metadata.
- The old charge path uses a held `lightPulse` action, accumulates charge over
  time, and emits a release effect after the action is released.

These are behavior requirements only. The target implementation must not copy
old Svelte-local state, direct Three math, direct Rapier control, audio store
calls, shockwave arrays, or UI store coupling.

## Current Target-State Evidence

The new engine already has useful foundations:

- `InputActionMap` exists in `src/engine/modules/input`.
- `BrowserInputAdapter` owns browser input listeners.
- `InputSnapshot` carries action phases, focus state, and pointer delta.
- `PlayerInputSystem` writes a `PlayerInput` component and dispatches movement
  and jump commands.
- `FirstPersonLookSystem` consumes `PlayerInput.lookDelta` and writes
  `FirstPersonController` and `Transform`.
- Sprint and jump already flow through engine/game systems rather than Svelte
  component state.

Current problem to fix:

```text
BrowserInputAdapter records mousemove deltas into InputManager whenever the
canvas receives mouse movement. PlayerInputSystem passes those deltas directly
to FirstPersonLookSystem. That makes the camera follow normal cursor movement.
```

This is an input contract problem, not a camera-system problem. The camera
system should continue consuming a clean `lookDelta`; the browser/input layer
must decide whether pointer motion is allowed to become look motion.

## Target Contracts

### `InputActionMap`

The gameplay action map should explicitly own these actions:

- `move.forward`
- `move.back`
- `move.left`
- `move.right`
- `jump`
- `sprint` for the run/sprint function
- `look.hold`
- `look.left`
- `look.right`
- `look.up`
- `look.down`
- `interact.primary`
- `charge.light`

The existing `primary` mouse action should be split by meaning before runtime
logic grows around it. Mouse button 0 feeds `look.hold` and desktop click
candidate tracking; a verified click emits `InteractAtScreenPoint`. Touch and
gamepad controls feed `interact.primary` for active-target interaction so
desktop mouse-down does not activate proximity targets before the click/drag
threshold is known.

Desktop defaults:

- Hold mouse button 0 to look.
- Release mouse button 0 to stop looking.
- Use mouse button 0 press/release without drag for select, inspect, or
  interaction.
- Use WASD or arrow keys for movement.
- Use Space for jump.
- Use Shift for run/sprint.
- Use `charge.light` for charge/release, currently mapped from the old
  light-pulse behavior.

### `LookActivationContract`

Add an explicit look activation state to the input contract.

Target rules:

- Pointer delta is reported as look input only while `lookActive` is true.
- Desktop `lookActive` begins only after valid gameplay pointer movement over
  the canvas crosses the click/drag threshold; touch look begins from the
  explicit mobile look control.
- `lookActive` ends on pointer up, pointer cancel, blur, visibility loss, UI
  capture, scene unload, or adapter disposal.
- Pointer movement before look activation is discarded.
- Pointer movement after release is discarded.
- Pointer movement accumulated during a disabled-input frame is cleared instead
  of replayed later.
- The app/HUD may display look state, but it does not own look state.

Default browser mode for this packet should be hold-drag look using pointer
capture or equivalent adapter-owned pointer tracking. Persistent pointer lock
should not be requested from `GameClient.svelte` as the default control path.
Pointer lock may remain a browser platform capability for a later explicit
mode, but release must still exit look if that mode is enabled.

### `ClickInteractionContract`

Click interaction should be a command derived from the input contract, not a
direct Svelte event.

Target command:

```ts
type InteractAtScreenPoint = {
  readonly type: "InteractAtScreenPoint";
  readonly pointerId: number;
  readonly button: number;
  readonly position: readonly [number, number];
};
```

Target rules:

- Pointer down starts a click candidate.
- Pointer movement beyond a small threshold converts the candidate into look
  drag only.
- Pointer up within movement/time thresholds dispatches
  `InteractAtScreenPoint`.
- Interaction systems decide what the click means through engine queries,
  interaction registry data, raycast/query ports, or future selection services.
- Select and inspect are gameplay meanings resolved by interaction systems, not
  by the UI component that receives pointer input.
- UI components do not mutate inventory, portals, NPCs, or gameplay state
  directly.

### `ChargedActionContract`

Charge/release must be separated from movement and rendering.

Target action:

```text
charge.light
```

Target flow:

```text
InputSnapshot action phase
-> PlayerInputSystem
-> ChargeActionStarted / ChargeActionHeld / ChargeActionReleased events
-> ChargedAbilitySystem
-> semantic gameplay/audio/VFX events
-> renderer/audio adapters project the result
```

Target rules:

- Charge duration and normalized charge live in engine/game state, not in a
  Svelte player component.
- Release emits a semantic event with normalized charge.
- The run/sprint, jump, and charge/release functions are independent gameplay
  actions; none should be implemented as renderer or UI side effects.
- Visual shockwaves, player avatar glow, and audio charge/release are consumers
  of events or selected state.
- No gameplay system should call Web Audio, Three, Rapier, DOM, or Svelte
  stores directly.
- Existing old constants may be used as tuning evidence only after being
  rewritten into target-owned game data.

### `MobileControlsContract`

Mobile must use explicit touch controls instead of inheriting desktop mouse and
keyboard assumptions.

Target controls:

- A touch movement control for forward/back/left/right movement.
- A touch look control or touch-and-hold look region that maps to the same
  sanitized look input contract as desktop held look.
- Dedicated touch controls for jump, run/sprint, select/inspect/interact, and
  charge/release.
- A clear cancellation path when the player lifts a finger, loses focus, opens
  UI, changes visibility, or the scene unloads.

Target rules:

- Mobile controls may be rendered by UI components, but they must dispatch
  actions or commands through engine-facing input contracts.
- UI components must not own player transform, camera rotation, run/sprint
  state, charge state, physics state, or interaction results.
- Touch controls should feed the same `InputSnapshot`, command, and event
  contracts as keyboard, mouse, and gamepad controls wherever practical.
- Mobile layout, hit targets, and gesture tuning are product/UI concerns, but
  gameplay meaning remains in game systems.

## Implementation Packets

## Implementation Progress

Desktop implementation packet started: 2026-06-05.
Last verified: 2026-06-06.

- Contract register updated for `LookActivationContract`,
  `ClickInteractionContract`, and `ChargedActionContract`.
- Desktop/runtime foundation is implemented for held-look input, explicit
  action IDs, click interaction commands, nearest active target arbitration,
  portal click activation, story-note reader activation, light charge
  state/events, held-charge player-light feedback, HUD projection, and stale
  input clearing when gameplay input is disabled.
- Mobile runtime foundation is implemented for `MobileInputControlsPort`, touch
  action IDs, touch movement, touch look, jump, sprint, active-target use, light
  charge, and touch-state cleanup.
- Packet 1 held-look foundation is implemented.
- Packet 2 action-map cleanup is implemented.
- Packet 3 click interaction command foundation is implemented.
- Packet 4 charge/release foundation is implemented, including held-charge
  player-light feedback through ECS `Light` state.
- Packet 5 mobile custom controls foundation is implemented.
- Packet 6 cleanup is partially complete for pointer-lock default ownership and
  stale docs; keep applying it after each new controls packet.
- Focused validation: `test:input-contract` covers held-look gating, release
  clearing, UI/focus disabled input clearing, click packets, required gameplay
  action IDs, mouse action split, mobile touch action mappings, analog touch
  movement, touch look, touch/gamepad active interaction, and light charge
  action phases.
- Focused validation: `test:story-note-contract` covers story-note activation,
  nearest portal/story-note target arbitration, and story-note close behavior.
- Focused validation: `test:charged-action-contract` covers charge start, hold,
  release, full-charge burst, cancel events, held-charge player-light boost,
  and player-light reset when charge ends.
- Full validation for this packet passed:
  `audit:engine-boundaries`, `type-check`, `lint`, `test:input-contract`,
  `test:charged-action-contract`, `build`, and
  `git diff --check -- apps/game.megameal pnpm-lock.yaml`.
- Known remaining work: screen-space/raycast inspect selection, release
  shockwave/avatar glow, held-charge procedural audio, expanded gamepad/input
  settings, and mobile layout/tuning.

### Packet 1: Held-Look Input Contract

Owner contract rows:

- `InputActionMap`
- add or update `LookActivationContract`

Implementation shape:

1. Update `ENGINE_CONTRACT_REGISTER.md` for held-look ownership, writers,
   consumers, validation, and forbidden shortcuts.
2. Extend `InputFocusState` or add a narrow `PointerLookState` to expose
   `lookActive` separately from `pointerLocked`.
3. Update `InputManager` so `pointerDelta` is emitted only when gameplay input
   is enabled and look is active.
4. Update `BrowserInputAdapter` to begin/end look hold through adapter-owned
   pointer events and to clear stale deltas on release/blur/visibility changes.
5. Remove default pointer-lock request ownership from `GameClient.svelte`.
6. Keep `FirstPersonLookSystem` mostly unchanged; it should keep consuming
   sanitized `lookDelta`.
7. Update HUD state naming if needed so it reflects `lookActive`, not only
   persistent pointer lock.

Validation:

- `audit:engine-boundaries`
- `type-check`
- `lint`
- `test:input-contract`
- `test:charged-action-contract`
- Focused input contract validation covering:
  - mouse move without hold produces zero look delta,
  - mouse move while held produces look delta,
  - release clears look state and future deltas,
  - blur/visibility loss clears look state,
  - UI capture disables and clears gameplay input.

### Packet 2: Action Map Cleanup

Owner contract rows:

- `InputActionMap`
- `InteractionRegistry`

Implementation shape:

1. Replace ambiguous `primary` runtime usage with explicit
   `look.hold`, `interact.primary`, and `charge.light` actions.
2. Keep keyboard movement mappings already present in the target engine.
3. Add clean `charge.light` default keyboard mapping based on old behavior
   evidence, likely `KeyF`.
4. Add gamepad mappings for run/sprint, look, inspect/select, and
   charge/release that match old behavior evidence unless product direction
   changes them.
5. Keep input binding data in game/input configuration, not Svelte component
   state.

Validation:

- Action map validation rejects duplicate or missing required gameplay-critical
  bindings when a validation owner exists.
- Focused input validation checks required action IDs and touch/gamepad
  bindings; `InputActionId` remains a string contract, so type-check alone does
  not prove action-map completeness.

### Packet 3: Click Interaction Command

Owner contract rows:

- `InteractionRegistry`
- `CommandBus`

Implementation shape:

1. Add `InteractAtScreenPoint` command type in game-owned command definitions.
2. Have `PlayerInputSystem` dispatch it on click-candidate release.
3. Route the command to a focused interaction system.
4. Let the interaction system query registered interaction targets or future
   raycast/query ports. Nearest proximity target arbitration between active
   portals and story notes is implemented through `ActiveInteractionTarget`;
   screen-space/raycast target resolution remains future work.
5. Keep portals, collectibles, NPCs, and future object interactions as
   consumers of the interaction registry rather than direct UI click handlers.

Validation:

- Click command dispatch is covered at the input-contract boundary.
- `test:story-note-contract` covers nearest active target arbitration for
  current portal/story-note consumers.

### Packet 4: Charge And Release Ability

Owner contract rows:

- add `ChargedActionContract`
- `AudioManifestAndEvents`
- `InteractionRegistry` only if charged release affects interactable targets

Implementation shape:

1. Add a game-owned charged-action component/resource for the player.
2. Accumulate charge in a gameplay system during fixed simulation ticks.
3. Emit release events with duration and normalized charge.
4. Add audio event mappings through manifest-backed audio content only.
5. Add VFX/render projection through renderer-owned components or future VFX
   module contracts. Held-charge player-light feedback is implemented through
   `PlayerLightFeedback`, updated ECS `Light` state, `LightSyncSystem`, and
   in-place Three adapter light-property updates.
6. Do not place shockwave lifecycle arrays, audio calls, or Three-specific
   object creation in player input or movement systems.

Validation:

- `test:charged-action-contract`
- Charge starts on action press.
- Charge accumulates while held.
- Release emits exactly one release event.
- Release below threshold emits a low-charge event if needed.
- Release above threshold emits a burst event.
- Held charge boosts the player-carried light through ECS component state.
- Charge end restores the authored player-carried light base values.
- Disabled input cancels or releases according to a documented rule.

### Packet 5: Mobile Custom Controls

Owner contract rows:

- add `MobileControlsContract`
- `InputActionMap`
- `ClickInteractionContract`
- `ChargedActionContract`

Implementation shape:

1. Keep the `MobileControlsContract` row in `ENGINE_CONTRACT_REGISTER.md`
   aligned with the runtime/UI foundation as mobile controls expand.
2. Add touch input controls for analog movement, look, jump, run/sprint,
   select/inspect/interact, and charge/release.
3. Keep touch UI as an input surface only; it dispatches actions or commands and
   observes selected state.
4. Reuse the same action IDs and command/event contracts used by desktop and
   gamepad whenever practical.
5. Extend focused validation for touch cancellation, multi-touch separation,
   disabled input clearing, and no stale touch state after scene unload as the
   mobile UI surface grows.

Validation:

- Touch movement produces movement intent without directly mutating player
  transforms.
- Touch look produces sanitized look deltas only while the touch-look control is
  active.
- Touch select/inspect/use produces active-target interaction commands rather
  than direct UI mutation.
- Touch charge emits the same semantic charge/release events as desktop.
- Focus, visibility, UI capture, and scene unload clear active touch state.

### Packet 6: Cleanup And Debt Retirement

Implementation shape:

1. Remove superseded pointer-lock default code after held-look is verified.
2. Remove any temporary compatibility branch added during the migration.
3. Keep old-engine references in docs only.
4. Update `ARCHITECTURE.md`, `GAME_ENGINE_DESIGN_DOCUMENT.md`, and
   `ENGINE_CONTRACT_REGISTER.md` if the shipped control contract differs from
   this plan.

Validation:

- No direct imports from sibling `apps/game`.
- No browser globals outside app/UI/browser adapters.
- No Svelte ownership of player/camera/movement/charge state.
- No new broad catch-all tests or scripts.

## Forbidden Shortcuts

- Do not copy `apps/game/src/threlte/features/player/Player.svelte`.
- Do not move old `runtimeInputBindingsStore` into the new runtime.
- Do not put `isMouseDown`, charge amount, shockwaves, or audio calls inside a
  Svelte player component.
- Do not fix camera follow by clamping mouse sensitivity or by editing the
  camera system only.
- Do not make pointer lock the default owner of gameplay look unless the
  contract explicitly says release exits lock.
- Do not dispatch gameplay interactions directly from `GameClient.svelte`.
- Do not implement mobile controls as a parallel gameplay state machine in UI.
- Do not let renderer or physics objects become the canonical player-control
  state.
- Do not add generated artifacts for this packet.

## Definition Of Done

The player-control migration is complete when:

- Moving the cursor over the canvas without holding the look button does not
  rotate the camera.
- Holding the look button rotates the camera through engine input state.
- Releasing the look button stops camera rotation immediately.
- Small press/release motion produces a click interaction command.
- Mouse select/inspect works when the player is not holding the look button.
- WASD/arrow movement, Space jump, and Shift run/sprint still work.
- Charge/release is represented as a game-owned contract and emits semantic
  release events.
- Mobile custom controls have an explicit contract and do not own runtime
  gameplay state in UI.
- Audio and VFX are consumers of semantic events or selected state, not direct
  input-system side effects.
- Boundary audit, type-check, lint, focused input validation, and focused
  charged-action validation pass.
- Documentation and `ENGINE_CONTRACT_REGISTER.md` match the implemented
  contract.
