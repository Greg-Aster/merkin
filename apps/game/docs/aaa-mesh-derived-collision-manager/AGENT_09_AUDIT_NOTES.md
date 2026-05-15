# Agent 09 Audit Notes

Date: 2026-05-14

## Required Search

```bash
rg "originalCollision|preserveCollisionForVisualReplacement|collision\\.size|colliderUrl|sourceAssetFingerprint|proxy collision|EditorCollisionOverlay|CollisionBodyOverlay|MeshColliderHelper|PrimitiveTrimeshHelper" apps/game/src apps/game/scripts apps/game/docs
```

Initial hit count: 368

Post-modernization hit count excluding this audit note: 295

Final hit count including this audit note: 306

## Deleted Or Modernized

- Modernized `editorCollisionLifecycle` so render-source changes carry only
  collision policy. It no longer emits `collision.size`, `shape`, `enabled`,
  `generationStatus`, or `generation.originalCollision`.
- Modernized mesh collider bake output so generated payloads and written scene
  nodes do not preserve `generation.originalCollision`.
- Updated lifecycle and mesh bake tests to assert that legacy source geometry is
  stripped or rejected rather than preserved.
- Removed active `generation.originalCollision` source data from the Yggdrasil
  scene document.

## Remaining Hit Classification

- Generated artifact contract owned by Agent 05: `colliderUrl`,
  `sourceAssetFingerprint`, metadata provenance, mesh collision product
  validation, bake scripts, and publish pipeline tests.
- Runtime adapter compatibility owned by Agent 03/05:
  `runtimeSceneManifest`, readiness, level validation, runtime actor collision,
  and Rapier product adapter still read baked collider URLs or legacy runtime
  collision sizes.
- Terrain generated product contract: terrain bake/cook/editor pipeline
  references to `colliderUrl` and `sourceAssetFingerprint`.
- Tests that reject legacy input: editor scene validation and collision policy
  contract tests containing `originalCollision`, proxy metadata, and legacy
  authored collider fields.
- Archived or obsolete docs: archive, scratchpad, and older agent docs still
  describe removed overlay/helper names or old authored collider fields.
- Coordination docs: required search strings and migration checklists.

## Blockers For Other Agents

- Agent 05 needs to finish moving active publish/runtime manifests from scene
  `collision.colliderUrl` to manager/publish generated products.
- Agent 03/05 need to remove runtime adapter dependence on
  `actor.physics.collision.size` once Rapier consumes manager live products
  end to end.
- Agent 08 needs to finish active scene/terrain data migration so scene source
  documents contain only policy plus level terrain contracts.
- Agent 07 should rerun the required search after those owners finish and
  certify only generated-product, rejection-test, or archived-doc hits remain.
