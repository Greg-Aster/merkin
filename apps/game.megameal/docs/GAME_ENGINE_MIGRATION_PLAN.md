# Game Engine Migration Plan

Source engine: `/home/greggles/Merkin/apps/game`
Target engine: `/home/greggles/Merkin/apps/game.megameal`

Current status: initial framework packet complete, normal root game scripts cut over to `@merkin/game-megameal`, portal arena navigation room implemented as the default runtime scene with manifest-owned portal-deck scene music, portal activation SFX, charge-release SFX, generated GLB field terrain, and a required player-carried point light with held-charge feedback, manifest-backed cubemap sky environments implemented for the current runtime scenes, scene-environment foundation implemented in `docs/Done/SCENE_ENVIRONMENT_FEATURE_PLAN.md` for equirectangular textures, muted video skies, procedural atmosphere, bounded dynamic capture, and authored reflection probes, Miranda deck/cockpit/crew-quarters/Captain's Office/Engine Room/Medbay/Mess Hall/Chapel altar/Brig/Cargo Hold/Archive primitive foundation plus three authored Miranda point lights, checked-in Miranda primitive material parameters, Miranda scene music, shared charge-release SFX, nine Miranda story notes, and the StoryNote reader foundation migrated, Observatory playable foundation migrated as `observatory_runtime` with target-owned GLB art, explicit walkable collision, shared static visual water through `WaterSurfaceContract`, player/firefly lights, and portal transition by manifest ID, and runtime scene negative-case validation added in `apps/game.megameal`. The old `@merkin/game` app remains reference-only behind explicit `:legacy` root aliases. Player controls have a verified desktop/mobile runtime foundation with remaining consumer polish tracked in `docs/PLAYER_CONTROLS_MIGRATION_PLAN.md`. Future skybox and scene-environment packets are tracked in `docs/SKYBOX_FUTURE_FEATURES_IMPLEMENTATION_PLAN.md`; future shared water behavior packets are tracked in `docs/WATER_SURFACE_SYSTEM_PLAN.md`. Authored Miranda point-light migration is implemented through `AuthoredLightContract`; portal player lighting is implemented through `PlayerCarriedLightContract`; Miranda primitive material parameter migration is implemented through `MaterialParameterContract`; curated scene music and SFX are implemented through `AudioManifestAndEvents`; Observatory playable foundation is implemented through `ObservatoryLevelContract` with static water owned by `WaterSurfaceContract`. The current implementation register and verification gate are in `ENGINE_CONTRACT_REGISTER.md`.

## Purpose

`apps/game.megameal` is the new engine foundation. `apps/game` is a reference implementation only. The migration must extract proven contracts, data shapes, and validation ideas without copying the old engine's accumulated framework coupling, editor repair paths, compatibility branches, or generated-output sprawl.

The migration rule is:

```text
Use apps/game for evidence.
Build new contracts in apps/game.megameal.
Do not import runtime code from apps/game.
```

## Non-Negotiable Guardrails

- No runtime imports from `apps/game` into `apps/game.megameal`.
- No direct Three, Threlte, Rapier, Svelte, Astro, or browser API use in `engine/core`, `engine/math`, `engine/modules`, `engine/data`, or `game`.
- No level-id special cases in generic engine code.
- No normal-path runtime repair of missing authored data.
- No normal-path editor repair or default hydration without an explicit migration command.
- No generated runtime JSON hand edits.
- No copying old Svelte/Threlte components wholesale.
- Every migrated system needs a contract, durable validation, and a defined owner. Add focused tests only when there is a reusable test owner; do not create one-off harnesses.

## Phase 0: Freeze The Old Engine As Reference

Treat `apps/game` as read-only source material.

Allowed:

- Inspect architecture docs.
- Inspect source data shapes.
- Inspect validation behavior.
- Copy small constants or schema ideas only after rewriting them into the new target architecture.

Forbidden:

- Import from `apps/game`.
- Move old components into the new runtime.
- Preserve compatibility branches without a removal condition.
- Port old editor behavior before the runtime contract exists.

Definition of done:

- New plan exists in `apps/game.megameal`.
- Agents understand `apps/game` is reference-only.
- Migration work starts in the new contract layer, not UI or renderer code.

## Completed Work Packet: Legacy Runtime Cutover

Intent: stop the normal game website/deploy path from loading the polluted
legacy `apps/game` runtime while keeping the old app available as reference
evidence for future contract migrations.

Status: root-script cutover implemented on 2026-06-06.

Implemented behavior:

- Root `dev:game`, `build:game`, `build:game:full`, `deploy:game:static`,
  `deploy:game`, and `dev:stack` now select `@merkin/game-megameal`.
- Root `deploy:game:static` deploys `apps/game.megameal/dist` to the existing
  game Pages target.
- The old `@merkin/game` app is available only through explicit
  `dev:game:legacy`, `build:game:legacy`, `build:game:legacy:full`,
  `deploy:game:legacy:static`, and `deploy:game:legacy` aliases.
- No source import, component copy, or runtime bridge was added between
  `apps/game` and `apps/game.megameal`.

Remaining future work:

- Archive or remove `apps/game` after any useful content is migrated into
  target-engine contracts.
- Migrate old starmap/timeline behavior only as new manifest-owned game data,
  not as the old `ThreltGame` shell.

## Phase 1: Maintain The Contract Register

Maintain `ENGINE_CONTRACT_REGISTER.md` in `apps/game.megameal`.

The register should track:

- Contract name.
- Source of truth.
- Allowed writers.
- Runtime consumers.
- Editor or authoring consumers.
- Generated outputs.
- Validation.
- Forbidden shortcut.
- Debt or compatibility removal condition.

Initial contract rows:

- `LevelDefinition`
- `RuntimeSceneManifest`
- `AssetManifest`
- `PrefabDefinition`
- `CollisionPolicy`
- `LevelReadinessContract`
- `SpawnPoint`
- `RenderProfile`
- `PhysicsAdapter`
- `RenderAdapter`
- `InteractionRegistry`
- `SaveReplayContract`

Definition of done:

- Contract register exists.
- New work packets name the contract row they touch.
- Compatibility exceptions have owners and removal conditions.

## Phase 2: Migrate Data Shapes First

Build framework-neutral contracts before runtime behavior.

Target locations:

- `src/engine/data/schemas`
- `src/engine/data/manifests`
- `src/engine/modules/assets`
- `src/engine/modules/scene`
- `src/engine/modules/physics`
- `src/engine/modules/rendering`
- `src/game/levels`
- `src/game/prefabs`

Priority order:

1. `LevelDefinition`
2. `PrefabDefinition`
3. `AssetManifest`
4. `RuntimeSceneManifest`
5. `CollisionIntent`
6. `CollisionChannel`
7. `SpawnPoint`
8. `LevelReadinessContract`
9. `RenderProfile`

Rules:

- Schemas must validate plain data.
- Runtime systems consume validated data only.
- Missing required fields fail loudly.
- Optional defaults must be documented and deterministic.
- Authored colliders must declare collision intent and channel; trigger intent must match explicit sensor data instead of being inferred from render or runtime repair.

Definition of done:

- Schemas exist.
- Invalid data fails durable validation.
- Valid examples load into engine-neutral structures.
- No renderer, physics, DOM, Svelte, or Astro imports appear in data contracts.

## Phase 3: Build One Vertical Slice

Migrate one tiny level through the new engine path.

Target flow:

```text
source data
-> runtime scene manifest
-> validation
-> asset preload
-> entity spawn
-> render sync
-> physics sync
-> player spawn
-> playable gate
```

The first level should be intentionally small:

- One floor.
- One player spawn.
- One player entity.
- One collectible or interaction target.
- One static collider.
- One renderable mesh or built-in primitive.

Do not include:

- World partition.
- Terrain streaming.
- Full editor.
- NPC/firefly system.
- Ocean.
- Post-processing.
- Multiplayer.

Definition of done:

- The level reaches playable state only after manifest, required assets, collision, spawn, physics, and player are ready.
- Removing a required asset fails validation.
- Removing spawn fails validation.
- Removing required collision fails validation.
- Missing authored collision intent/channel fails validation.
- Durable validation covers success and failure cases.

## Phase 4: Port Runtime Systems By Contract

Migrate systems in this order:

1. Asset loading and reference counting.
2. Prefab spawning.
3. Level loading.
4. Collision intent and channel validation.
5. Readiness and playable gate.
6. Player input and player controller.
7. Interaction registry.
8. Render profile and lighting policy.
9. Audio.
10. Scene environment / skybox contract.
11. Save and replay.

Porting rules:

- Extract behavior into engine-neutral systems first.
- Put third-party implementation behind adapters.
- Keep UI observational.
- Do not add old compatibility behavior unless the contract register names its removal condition.
- Delete dead migration code after each phase.

Definition of done:

- Each migrated system has a contract row.
- Each migrated system has durable validation at the owning contract boundary.
- Boundary audit still passes.
- No direct framework or renderer imports leak into core/data/modules/game.

## Phase 5: Add Guardrails As Systems Arrive

Every migrated contract must add or extend validation.

Required guardrails:

- Dependency boundary audit.
- Schema validation coverage.
- Level manifest validation coverage.
- Scene load/unload leak coverage.
- Generated-output drift checks only when a durable generated-output owner exists.
- Collision policy validation.
- Asset manifest completeness validation.
- Playable gate validation.

Specific rules to audit:

- No level-id branches in generic engine code.
- No direct Three/Rapier/Svelte/Astro imports outside allowed layers.
- No browser globals outside app, UI, or browser adapter.
- No generated runtime asset edits outside owning scripts.
- No render mesh treated as collision without explicit collision intent.

Definition of done:

- A bad migration fails a repeatable command.
- The validation command is documented in `package.json`.
- Validation checks are narrow enough for regular agent use.

## Phase 6: Migrate Content After Runtime Contracts

Only migrate old content after the new manifest and validation paths exist.

Current durable content slice:

- `portal_arena_runtime` is the default navigation room. It has eight authored portal slots on a generated GLB moor field, a centered player spawn, a required player-carried point light on the stable `player` entity, a content-owned GLB portal gate asset, explicit solid/world terrain collision data, a manifest-owned portal-deck scene music asset, portal activation SFX, charge-release SFX, nearest active target HUD prompt selection through world state, and manifest-ID transitions to connected runtime scenes.
- `observatory_runtime` implements the playable foundation from `docs/OBSERVATORY_PLAYABLE_FOUNDATION_PLAN.md`. It recreates the old Observatory from source art and scene evidence only, with target-owned runtime scene data, `mesh_observatory_environment`, an explicit flat `observatory:walkable-proxy` collision entity, static visual `observatory:water` through the shared `water_surface_plane` prefab, `cubemap_observatory_sky`, a player-carried light, three authored firefly lights, and portal transition by manifest ID. The current Observatory water is visual-only with no collider and uses shared `WaterSurfaceContract` assets/prefabs (`mesh_water_plane`, `material_water_dark_still`, and `water_surface_plane`). The aligned packet does not import old runtime code, load old generated runtime scene JSON, restore the old terrain chunk runtime, use generated collision binaries, copy old lighting budget/controller systems, or make Observatory-specific water mesh/material IDs the reusable water owner. Terrain chunks, dynamic water behavior, water volumes, reflections/post-processing, scene music, and procedural firefly population tooling remain future contracts.
- `miranda_deck_runtime` migrates the old Miranda spawn, the two authored deck floor actors, the three cockpit glow panel actors, the four crew bunks, the locker bank, Captain's Desk, Captain's Chair, Recipe Safe, Engine Core, four engine columns, four Medbay pods, three Mess Hall blockers, Chapel Altar, four Brig cells, Brig Desk, four Cargo Hold stacks, five Archive server banks, three authored point lights, and nine story notes as checked-in target-engine data.
- Source evidence is the old Miranda scene's player spawn and ground contract in `apps/game/src/threlte/editor/scenes/miranda.scene.json` lines 7-18, deck floors on lines 229-287, command gallery light on lines 298-310, cockpit parent on lines 314-319, cockpit panels on lines 382-473, cockpit story note on lines 474-496, crew-quarters primitive blockers on lines 557-719, crew story note on lines 720-742, Captain's Office primitive blockers on lines 803-903, Captain's Office story notes on lines 904-1008, Engine Core on lines 1156-1184, Engine Room equal-radius column blockers on lines 1187-1305, Engine Room story note on lines 1310-1332, Medbay primitive blockers on lines 1393-1532, Medbay story note on lines 1533-1555, Mess Hall primitive blockers on lines 1616-1716, Mess Hall story note on lines 1717-1739, Chapel Altar on lines 1935-1964, Brig primitive blockers on lines 1966-2128, Brig story note on lines 2129-2151, Cargo Hold primitive blockers on lines 2212-2343, Observation Light on lines 2354-2366, Archive server-bank primitive blockers on lines 2370-2532, Archive Light on lines 2534-2546, and Archive story note on lines 2549-2571.
- App-level runtime manifest selection can load checked-in manifests such as `miranda_deck_runtime` without importing old runtime code or adding an editor.
- Checked-in runtime manifests carry narrow asset/prefab sets. The runtime registers the selected manifest's assets, validates renderable references against the owning manifest and preload set, and has no hidden boot preload or all-default asset-registry path.
- The cockpit, crew-quarters, Captain's Office, Medbay, Mess Hall, Chapel, Brig, Cargo Hold, and Archive parent transforms are flattened into level-instance transforms; prefab definitions own archetype geometry/collider/material, and level instances own authored placement and stable IDs.
- Cylinder primitive support exists in the render/physics/data contracts for authored old-game cylinder blockers. The tapered Engine Core uses a parameterized Three cylinder/frustum render mesh plus an explicit authored mesh collider, without generated GLB/collider files.
- The story-note migration preserves old note title, author, location, excerpt, body, marker color, and marker size as authored `StoryNote` component data. Reusable target-engine marker prefabs own the trigger collider and marker material, gameplay systems own open/close reader state, and the HUD observes selected/open interaction world state instead of hardcoding story text or choosing targets in UI.
- Authored point-light migration is implemented for the old Miranda Command Gallery Beacon, Observation Light, and Archive Light. Light data lives in `Light` components on checked-in level/prefab data, syncs through `LightSyncSystem` and the renderer adapter, and is required by Miranda runtime-scene readiness through stable light IDs. Portal player-carried lighting is implemented through `PlayerCarriedLightContract` as a steady `Light` on the moving stable `player` entity, with portal readiness requiring that stable light ID. Held charge now boosts and restores that player light through game-owned `ChargedAction` and `PlayerLightFeedback` state, while `LightSyncSystem` and the Three adapter project mutable light updates in place. The old Svelte runtime lighting controller, point-light budget system, hidden player-radius culling, shockwave arrays, and renderer-local light mutation remain excluded.
- Material parameter migration preserves old primitive base color, emissive color/intensity, metalness, roughness, and Medbay transparent opacity through schema-owned material asset data. The cockpit center panel and wide Archive server bank use split material IDs because their old authored values differ from their sibling prefabs.
- Audio migration preserves the old/shared portal-deck ambience path from `packages/shared-audio/src/game-audio-profile.ts` lines 22-31 and `apps/game/public/audio/ambient/portal-deck.mp3` as a checked-in target audio asset at `public/audio/ambient/portal-deck.mp3`. Current target-only curated additions include `audio_ambient_wicked_shadows_whisper` at `public/audio/ambient/Wicked Shadows Whisper.mp3`, `audio_player_charge_release` at `public/audio/sfx/22-kenney-forceField_001.mp3`, and `audio_portal_activate` at `public/audio/sfx/portal-activate.mp3`. Runtime scene transitions stop previous scene music, apply the selected scene's manifest music after readiness succeeds, and scene cleanup stops scene-scoped music through `SceneScope`.
- `public/audio/sfx/audition/` is source/audition material only. Runtime manifests must reference only curated production audio assets through stable manifest IDs.
- The slice deliberately does not import old runtime JSON, generated collision products, generated story-marker GLBs, generated GLB actors, old Svelte-owned note state, old Three raycast interaction architecture, the old Svelte runtime lighting controller, point-light budget system, old Svelte/Howler audio systems, old held-charge oscillator code, post-processing, reflections, old runtime material mutation/repair, or editor behavior.
- The source Cargo Hold includes Cargo Stack C beyond the current floor/bounds extent. The target preserves the authored primitive as data, but full playable Cargo Hold readiness remains future terrain/floor/bounds work.
- Full Miranda is not ready: the old runtime readiness report in `apps/megameal/public/generated/runtime-game-assets/scenes/miranda.runtime-scene.json` lines 7320-7429 blocks publish on a missing terrain runtime collision manifest for `miranda-floor-main`.

Content migration order:

1. Static assets.
2. Authored level data.
3. Runtime scene manifests.
4. Collision products.
5. Spawn metadata.
6. Render profiles.
7. Additional lighting budgets, shadows, and non-point light types.
8. Audio regions.
9. Interactions.

Rules:

- Source assets and runtime assets stay separate.
- Collision assets are separate from visible render assets.
- Audio event mappings must be manifest data that references explicit audio assets.
- Sky/environment assets must be manifest data that references explicit cubemap/environment assets.
- Required runtime data must be declared, not discovered by failed rendering.
- Asset budgets must be explicit.
- Content migration must run through an owned import/generation pipeline once generation exists.

Definition of done:

- One migrated level runs without old engine imports.
- Any generated files are reproducible and owned by the import/generation pipeline.
- Missing required content fails validation before runtime.

## Phase 7: Delay Editor Migration

The old editor is high-risk. Do not port it wholesale.

Allowed early editor work:

- Minimal manifest viewer.
- Validation error display.
- Simple level selection.
- Simple spawn/collider/debug overlays.

Forbidden early editor work:

- Normal-path auto-repair.
- Legacy default hydration.
- Silent scene upgrades.
- Full old panel migration.
- Old editor stores as runtime dependencies.

Definition of done:

- Runtime can load validated data without the editor.
- Editor tools write only documented contracts.
- Editor repair actions are explicit commands with visible diffs.

## First Work Packet

Status: prototype runtime manifest load gate complete for the current prototype framework. Keep this section as the historical packet definition; use `ENGINE_CONTRACT_REGISTER.md` for current status.

Start with a small, enforceable packet:

1. Add `ENGINE_CONTRACT_REGISTER.md`. Done.
2. Add `LevelDefinition` schema. Done.
3. Add `RuntimeSceneManifest` schema. Done for prototype runtime loading; cooked manifest generation remains future work.
4. Add `AssetManifest` schema. Done.
5. Add a manifest validator. Done for asset and runtime scene manifests.
6. Add one tiny sample level manifest. Prototype runtime scene manifest data exists; durable generated manifest files remain future work.
7. Load that manifest through `SceneManager` and `LevelLoader`. Done for the prototype manifest path.
8. Add prototype audio content manifest data. Done for current event-to-sound mappings, portal arena scene music, Miranda scene music, portal activation SFX, and charge-release SFX; spatial emitters, expanded authored audio content, and cooked audio manifests remain future work.
9. Register runtime manifest assets and prefabs before scene load. Done; runtime construction now uses the selected manifest as the asset/prefab source of truth.
10. Add Miranda primitive foundation. Done for the player spawn, two static deck collision/render prefabs, three cockpit panel collision/render instances, four crew bunk instances, the locker bank instance, Captain's Desk, Captain's Chair, Recipe Safe, Engine Core, four engine column instances, four Medbay pods, three Mess Hall blockers, Chapel Altar, four Brig cells, Brig Desk, four Cargo Hold stacks, five Archive server banks, three authored point-light instances, StoryNote proximity/reader foundation, and nine Miranda story-note instances; full Miranda remains future work.
11. Add app-level runtime manifest selection. Done for checked-in manifests; no in-engine level-id branches or editor dependency were added.
12. Narrow checked-in runtime manifests. Done; prototype and Miranda carry only their own asset/prefab sets, and runtime startup no longer preloads a hidden `boot` group.
13. Add durable negative-case validation. Done through `test:runtime-scene-contract`, a focused runtime-scene contract owner. Covered cases:
   - valid manifest validates,
   - missing required asset fails,
   - missing spawn fails,
   - missing required collision prefab fails,
   - missing required collision stable ID fails,
   - missing required light stable ID fails,
   - invalid `Light` component data fails,
   - invalid material asset parameters fail,
   - audio event mappings reference explicit audio assets,
   - cubemap environment missing preload fails,
   - cubemap environment missing readiness asset fails,
   - malformed cubemap faces fail,
   - Observatory foundation requires target-owned assets, explicit collision, player/firefly lights, shared visual-only water, and portal transition by manifest ID,
   - scene cleanup releases entities/assets through the existing level-loader path.
14. Add manifest-backed skybox environment contract. Done for the current cubemap foundation: `cubemap_classic_sky` and `cubemap_observatory_sky` are checked-in target-engine cubemap assets, render profiles declare required cubemap environments, scene preload/readiness includes those assets, and the Three adapter applies loaded cubemap assets without Svelte/Threlte ownership.

## Completed Work Packet: Material Parameters

Intent: migrate the old Miranda primitive material parameters into the new
asset-manifest material contract without copying old renderer/runtime repair
code.

Status: implemented foundation on 2026-06-06.

Owner contract rows:

- `MaterialParameterContract`
- `AssetManifest`
- `RenderAdapter`
- `RuntimeSceneManifest`

Implemented behavior:

- Material asset entries may carry structured `material` parameters for base
  color, emissive color/intensity, metalness, roughness, opacity, and
  transparent mode.
- The material schema validates those values before scene load. Invalid
  colors, non-finite values, out-of-range unit values, opacity without
  transparent mode, and unknown material parameter keys fail validation.
- The Three adapter projects loaded material asset parameters into
  `MeshStandardMaterial`; gameplay and UI code do not mutate renderer material
  state.
- Existing migrated Miranda primitive prefabs preserve authored material
  differences from the old source, including the distinct cockpit center panel
  and wide archive server-bank material values.

Definition of done:

- The already-migrated Miranda primitive material assets encode old source
  emissive, emissive intensity, metalness, roughness, and Medbay opacity values.
- Split material IDs exist only where old authored values differ for already
  migrated primitive prefabs.
- Focused runtime-scene validation covers bad material parameters.
- No generated material files, URL-query material hacks, renderer-side repair,
  old Svelte/Threlte material mutation, or broad new test script is added.

## Completed Work Packet: Scene Music And SFX

Intent: migrate curated track and SFX content into the new manifest audio
contract without copying old Svelte/Threlte audio components, old held-charge
oscillator code, or editor audio-region behavior.

Status: implemented foundation on 2026-06-06.

Owner contract rows:

- `AudioManifestAndEvents`
- `AssetManifest`
- `RuntimeSceneManifest`
- `SceneScope`

Implemented behavior:

- Scene music and one-shot SFX are declared in an `AudioContentManifest`,
  reference explicit manifest-owned audio assets, and validate before runtime
  use.
- Scene-scoped event-to-sound mappings are filtered by the active runtime scene
  so shared semantic events do not trigger inactive scene mappings.
- The browser audio adapter actually starts/stops looped music from the
  selected audio asset when `setMusic` is called.
- Runtime scene transitions stop previous scene music and apply the selected
  scene music after the new scene and its preload assets are ready.
- Implemented content includes the old/shared `portal-deck.mp3` ambient track
  for `portal_arena_runtime`, the target Miranda ambient track
  `Wicked Shadows Whisper.mp3`, charge-release SFX, and portal activation SFX.

Definition of done:

- `portal_arena_runtime` owns and preloads the portal-deck, portal activation,
  and charge-release audio assets.
- `miranda_deck_runtime` owns and preloads the Wicked Shadows ambient track and
  charge-release audio asset.
- The audio content manifest validates scene music and event-mapping references
  against the owning asset manifest.
- Runtime-scene validation covers missing scene-music asset references.
- Runtime-scene validation covers active-scene filtering for scene-scoped audio
  event mappings.
- Runtime-scene validation covers mapped audio assets being preload-listed and
  readiness-required for the owning runtime scene.
- Spatial audio regions, falloff, listener/emitter sync, music crossfades, and
  durable audio import/generation remain future work.

Validation commands for this packet:

```bash
pnpm --dir apps/game.megameal lint
pnpm --dir apps/game.megameal test:input-contract
pnpm --dir apps/game.megameal test:charged-action-contract
pnpm --dir apps/game.megameal test:story-note-contract
pnpm --dir apps/game.megameal test:runtime-scene-contract
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal build
git diff --check -- apps/game.megameal pnpm-lock.yaml
```

## Active Work Packet: Player Controls

Intent: implement the first-person player-control contract from `docs/PLAYER_CONTROLS_MIGRATION_PLAN.md` without copying old `apps/game` runtime code.

Status: desktop/mobile runtime foundation implemented and verified on 2026-06-06. Charge-release SFX now consumes the semantic `ChargeActionReleased` event through `AudioManifestAndEvents`, held charge boosts the player-carried point light through ECS `Light` state, and nearest active target arbitration selects between active portals and story notes before HUD/activation consume the interaction. Screen-space/raycast inspect targeting, release-pulse/avatar VFX, held-charge procedural audio, and expanded input settings remain future work under `docs/PLAYER_CONTROLS_MIGRATION_PLAN.md`.

Owner contract rows:

- `InputActionMap`
- `LookActivationContract`
- `ClickInteractionContract`
- `ChargedActionContract`
- `MobileControlsContract`
- `InteractionRegistry`

Current target behavior:

- Cursor movement over the canvas does not rotate the player/camera unless held-look is active.
- Holding the look button produces sanitized look delta through the engine input contract.
- Releasing the look button, losing focus, page visibility loss, or input disablement clears look state and stale pointer deltas.
- Small press/release motion produces an `InteractAtScreenPoint` command instead of a look drag.
- Runtime interaction systems consume interaction commands, proximity candidates, and selected-target state; Svelte does not mutate portals, collectibles, NPCs, or gameplay state directly.
- `primary` runtime usage is retired in favor of explicit `look.hold`, `interact.primary`, and `charge.light` actions.
- Charge/release is represented as game-owned state and semantic events, not Svelte-local state or direct renderer/audio side effects.
- Mobile touch controls feed the same engine input, command, and event contracts as desktop/gamepad controls.

Implementation order:

1. Extend the input snapshot/action-map contract for held-look state, pointer click packets, explicit interaction, and charge action IDs.
2. Update the browser input adapter to own pointer hold/click candidate tracking and to discard pointer deltas outside active look.
3. Update player input and interaction systems to consume sanitized input and dispatch commands/events.
4. Add focused durable validation under the input contract owner; do not add a broad catch-all harness.
5. Reconcile `ENGINE_CONTRACT_REGISTER.md`, `ARCHITECTURE.md`, and this plan with the shipped behavior.

Definition of done:

- The desktop/mobile runtime foundation in `docs/PLAYER_CONTROLS_MIGRATION_PLAN.md` is satisfied, and future consumer work remains explicitly marked.
- `ENGINE_CONTRACT_REGISTER.md` does not overstate implementation status.
- `audit:engine-boundaries`, `type-check`, `lint`, `test:input-contract`, `test:charged-action-contract`, and `test:story-note-contract` pass.
- No temporary probes, broad one-off scripts, copied old player code, or stale pointer-lock compatibility paths remain.

## Completed Work Packet: Scene Environment Foundation

Intent: migrate the useful parts of the old six-face cubemap skybox system into
the new scene-environment architecture without copying the old Svelte/Threlte
runtime component.

Status: cubemap foundation implemented on 2026-06-06; expanded
scene-environment foundation implemented on 2026-06-06.

Owner contract rows:

- `SkyboxEnvironmentContract`
- `AssetManifest`
- `RenderProfile`
- `RuntimeSceneManifest`
- `LevelReadinessContract`

Implemented behavior:

- Runtime render profiles declare `environment.kind: "cubemap-skybox"` and a
  stable cubemap asset ID.
- Cubemap assets live in selected scene asset manifests and declare exactly six
  WebP face URLs.
- Environment schema now accepts solid color, cubemap, equirectangular texture,
  muted video, and procedural atmosphere modes.
- Asset manifests support equirectangular texture projection metadata and muted
  video metadata for sky media.
- The Three adapter projects equirectangular textures, video skies, procedural
  atmosphere, bounded cube capture, and authored reflection probes through
  renderer-owned APIs.
- `src/game/assets/skyboxAssets.ts` declares small checked-in sample
  equirectangular and video sky assets under `public/assets/environment/samples/`.
- `portal_arena_runtime`, `prototype_arena_runtime`, `miranda_deck_runtime`,
  and `observatory_runtime` preload and require their cubemap environment
  assets.
- The game runtime clears old renderer environment references before scene
  unload releases the previous scene's assets.
- The Three adapter loads cubemap assets through `AssetManager` and applies
  loaded cubemap assets to `Scene.background` and `Scene.environment`.
- `test:runtime-scene-contract` covers missing preload, missing readiness, and
  malformed cubemap-face failures.
- `test:scene-environment-contract` covers accepted environment variants,
  invalid projection/video/dynamic-capture data, and reflection-probe validation.

Future work:

- Editor/import controls for sky, atmosphere, and reflection probes.
- Richer probe blending/debug visualization.
- Fog, cloud, weather, and fuller physical atmosphere integration.
- Environment quality tiers and generated/cooked environment pipelines.
- Production content authoring that opts default scenes into non-cubemap modes.

## Completed Work Packet: Scene Environment Expansion

Intent: implement the saved plan in
`docs/Done/SCENE_ENVIRONMENT_FEATURE_PLAN.md` without weakening the existing
cubemap contract or introducing renderer-side fallbacks.

Status: implemented foundation on 2026-06-06.

- Framework-neutral rendering-module types exist for `solid-color`,
  `cubemap-skybox`, `equirectangular-environment`, `video-skybox`, and
  `procedural-atmosphere`.
- Rendering-module types define bounded dynamic capture settings and a
  `ReflectionProbe` component/sync system contract.
- `src/engine/data/schemas` validates environment variants, required asset
  preload/readiness, texture projection, muted video metadata, dynamic capture
  settings, and authored reflection probe components.
- The Three adapter projects cubemap, equirectangular, muted
  `equirectangular-360` video, and procedural atmosphere environments, owns
  bounded dynamic cube capture, and restores local probe material mutations.
- Checked-in sample equirectangular and video sky media are registered through
  game asset data.
- `test:scene-environment-contract` covers accepted environment variants and
  rejected projection/video/dynamic-capture/probe failures.

Remaining future work:

- Editor/import controls for authoring sky media and reflection probes.
- Higher quality probe blending/debug visualization, 180/strip video sky
  mappings, fog/cloud/weather integration, generated/cooked environment
  pipelines, and production content using the new non-cubemap modes.
- Planned follow-on packets are tracked in
  `docs/SKYBOX_FUTURE_FEATURES_IMPLEMENTATION_PLAN.md`.

## Explicitly Rejected From Migration

Do not migrate these patterns from `apps/game`:

- Broad Svelte/Threlte runtime ownership.
- Component-local canvas listeners or physics ownership.
- Level-specific branches in generic systems.
- Runtime quality overrides that invent unauthored policy.
- Hidden point-light or post-processing defaults without contract data.
- Runtime GLB material/light mutation as a generic repair.
- Editor load/save repairs in normal paths.
- Generated-output writes after hard validation failures.
- Large all-purpose audit scripts that are not locally runnable.
- Empty subsystem barrels, placeholder types, fake asset rows, or dependency entries for systems that do not exist yet.
- Compatibility debt without owner, reason, guardrail, and removal condition.

## Migration Principle

The old engine proves what problems are real. The new engine decides how those problems are allowed to exist.

When in doubt, migrate the contract, not the implementation.
