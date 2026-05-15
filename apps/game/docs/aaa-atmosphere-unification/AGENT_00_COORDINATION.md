# Agent 00 Coordination: Atmosphere Unification

## Mission

Coordinate a replacement of fragmented fog/sky/ocean/mist rendering with one
runtime atmosphere system. The finished system must not be a chain of local
patches around `SceneFogExp2`.

## Shared Target

```txt
scene settings
  -> RuntimeAtmosphereDefinition
  -> SceneAtmosphereSystem
  -> shared render uniforms / shader chunks / postfx inputs
  -> all participating render paths
```

## Required Impact Map For Every Agent

Each agent must start its handoff with:

```txt
Core contract:
Runtime consumers:
Editor / authoring consumers:
Manifest / generated data:
Validation and audits:
Compatibility code to delete:
Compatibility code intentionally retained:
Out of scope:
```

`Compatibility code intentionally retained` should normally be `none`. If not,
the agent must name the owner and deletion condition.

## Current Provisional Code

The following files may contain temporary bridge work from the initial
investigation. Agents should either replace it with the unified architecture or
state why it is intentionally retained:

- `apps/game/src/threlte/components/SceneFogExp2.svelte`
- `apps/game/src/threlte/systems/sceneFogMaterialPatch.ts`
- `apps/game/src/threlte/systems/Skybox.svelte`
- `apps/game/src/threlte/features/ocean/components/OceanComponent.svelte`
- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`

Do not treat these patches as architecture. Treat them as evidence of the
fragmentation that needs to be removed.

## Workstream Ownership

### Agent 01: Contract And Store

Owns:

- `RuntimeAtmosphereDefinition` type
- scene settings mapping
- runtime atmosphere store/service
- migration from `style.fog`, `style.haze`, `style.bloom`, and
  `style.colorGrading`

Avoids:

- skybox implementation
- ocean implementation
- editor layout redesign

### Agent 02: Scene Atmosphere System And Material Integration

Owns:

- `SceneAtmosphereSystem` runtime component/service
- shared atmosphere uniforms
- standard material participation
- terrain/GLTF/prop fog integration
- deletion or replacement of provisional material patch code

Avoids:

- editor panel UI
- ocean-specific shader work except shared adapter hooks

### Agent 03: Sky And Aerial Perspective

Owns:

- skybox/background participation
- aerial perspective against the same atmosphere contract
- matching prior cubemap orientation, intensity, blurriness, tone mapping, and
  environment behavior
- diagnostics proving sky consumes atmosphere

Avoids:

- screen overlays or skybox veil hacks
- level-specific skybox branches

### Agent 04: Ocean, Reflections, And Underwater

Owns:

- ocean surface participation in unified atmosphere
- planar reflector path participation or documented limitation
- reflection/environment behavior under atmosphere
- underwater fog transition alignment with runtime atmosphere

Avoids:

- replacing the whole ocean system unless required by the contract
- adding independent ocean-only fog controls

### Agent 05: Editor Authoring And Diagnostics

Owns:

- Atmosphere FX editor controls
- live viewport preview wiring
- diagnostics panel/status for participating render paths
- warning when a material/render path bypasses atmosphere

Avoids:

- defining a second editor-only atmosphere structure
- broad editor layout rewrite

### Agent 06: Validation, Visual Smoke, And Deletion

Owns:

- final integration proof
- visual smoke scenarios
- code search for removed bridge paths
- docs update
- deletion of superseded provisional code

Avoids:

- new feature behavior except fixing integration blockers

## Merge Order

1. Agent 01 contract/store.
2. Agent 02 scene atmosphere/material integration.
3. Agent 03 sky/aerial perspective and Agent 04 ocean/underwater in parallel
   after Agent 01 contract stabilizes.
4. Agent 05 editor/diagnostics after Agent 01 and enough of Agent 02 exist.
5. Agent 06 certification last.

Agents may work in parallel only with disjoint write sets. If two agents must
touch the same file, the owner listed above goes first and the second agent
rebases onto that work.

## Shared Definitions

`Unified atmosphere` means all render paths consume the same runtime definition,
not that all paths use identical shader code.

`Mist` is not the source of truth. Mist planes or particles are optional visible
volumes that reinforce the height fog band.

`Sky fog` must be aerial perspective or background atmosphere, not a flat screen
overlay.

`Ocean fog` must be part of ocean material/reflection rendering, not a separate
transparent object above the water.

## Coordination Log Template

Each agent updates this section or copies it into their final handoff.

```txt
Agent:
Branch/worktree:
Status: not-started | in-progress | blocked | ready-for-review | integrated
Owned files:
Files touched outside ownership:
Contract changes made:
Compatibility code deleted:
Compatibility code retained:
Generated files changed:
Commands run:
Known blockers:
Next handoff needed:
```

## Open Coordination Risks

- Native Three.js `scene.background` does not participate in scene fog. The sky
  owner must provide a renderer-owned sky/aerial perspective path without
  changing cubemap appearance unintentionally.
- Ocean may use `MeshStandardMaterial` or `Reflector`; both must be handled or
  limitations must be surfaced in diagnostics.
- Transparent materials and custom shader materials can bypass shared fog.
  Diagnostics must detect and report this.
- Existing performance policy may disable bloom/AO/post effects by tier. Agents
  must distinguish "not wired" from "disabled by quality policy."
- Existing dirty worktree changes are broad. Agents must not revert unrelated
  files.
