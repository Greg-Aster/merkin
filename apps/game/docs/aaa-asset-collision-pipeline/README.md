# AAA Asset And Collision Pipeline Packet

This packet turns the Yggdrasil render/collision drift into a coordinated
implementation plan. The immediate symptom is that assets such as Root Mound
can show collision below the visual mesh even when the actor transform is shared.
The underlying problem is broader: render assets and collision assets are
separate runtime products, but the engine does not yet enforce one shared
asset-local transform contract across import, bake, runtime mounting, debug
helpers, and publish validation.

## Read Order

1. `AGENT_00_COORDINATION.md`
2. `AGENT_01_ASSET_LOCAL_TRANSFORM_CONTRACT.md`
3. `AGENT_02_IMPORT_BAKE_PROVENANCE.md`
4. `AGENT_03_RUNTIME_RENDER_COLLISION_ADAPTER.md`
5. `AGENT_04_VALIDATION_AND_EDITOR_DIAGNOSTICS.md`
6. `AGENT_05_YGGDRASIL_CONTENT_REPAIR.md`
7. `AGENT_06_INTEGRATION_GATE.md`

## Target Outcome

- Render mesh, collision mesh, bounds, sockets, and metadata agree on an
  explicit asset-local coordinate system.
- Collider bakes record source provenance and transform metadata.
- Runtime visual mounting and runtime collider mounting use the same contract.
- Editor overlays show actual runtime collision, not an approximation with a
  different transform path.
- Publish/readiness validation catches render/collision bounds drift.
- Yggdrasil Root Mound and other affected assets are repaired through the
  pipeline, not with one-off scene offsets.

## Current Root Cause

For `yggdrasil-mound`, the runtime actor group applies the same actor transform
to both visual and collision. The visual path mounts the source GLB through
`HeroProp`. The collision path loads a baked collider GLB through
`AssetTrimeshCollider` and converts its mesh vertices directly into Rapier
trimesh patches. The collider bake copies or simplifies the source asset but
does not store or apply an explicit asset-local transform contract.

That means any GLB root offset, source export quirk, render normalization, or
changed asset origin can make the visual and collision siblings disagree inside
the same actor group.

## Non-Goals

- Do not solve this with per-level special cases.
- Do not add hidden render-only offsets to make one object look correct.
- Do not use visual meshes as gameplay colliders by default.
- Do not hand-edit generated runtime outputs unless the assigned brief explicitly
  owns generated artifact regeneration.
- Do not weaken publish validation to get a broken level through the gate.

## Shared Verification

Every code-changing agent should run:

```bash
pnpm --dir apps/game type-check
```

Agents touching collision, generated assets, scene manifests, or runtime payloads
must also run the most relevant bake/audit command available and state what is
still missing if no command exists.
