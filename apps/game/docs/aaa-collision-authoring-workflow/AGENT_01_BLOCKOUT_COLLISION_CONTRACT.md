# Agent 01 - Blockout Collision Contract

## Mission

Make primitive blockout authoring produce explicit collision data by default,
without depending on runtime inference or legacy fields.

## Current State

- `editorDocumentStore.ts` normalizes scenes through
  `materializeEditorNodeCollision(...)`.
- `materializeEditorNodeCollision(...)` creates collision only for primitives.
- The old `isDefaultSolidNode(...)` helper has been replaced by
  `shouldAuthorPrimitiveCollisionByDefault(...)`.
- `normalizeLevelSceneSettings(...)` writes
  `primitiveCollisionByDefault: true` into default settings.
- Runtime policy does not create implicit collision for missing authored
  geometry.

## Required Decisions

1. `solidObjectsByDefault` is removed from the active contract.
2. `primitiveCollisionByDefault` is the supported replacement:
   - It controls whether new primitive geometry gets authored collision.
   - It must not make complex assets implicitly physical at runtime.

Do not leave a setting that appears important but is not used by the active
policy.

## Implementation Scope

- Update primitive creation paths so newly authored primitives receive explicit:
  - `physics.bodyType: "fixed"`
  - `collision.shape`
  - `collision.intent`
  - `collision.channel`
  - `collision.enabled`
  - simple collider size derived from primitive geometry
- Keep asset and prefab collision explicit. Do not infer collision for them from
  render meshes.
- Update naming if `shouldAuthorPrimitiveCollisionByDefault(...)` is no longer
  accurate.
- Remove unused or misleading default-solid logic.

## Tests

Add or update tests that prove:

- Creating a primitive creates explicit collision.
- Loading a primitive-only scene materializes explicit collision if the authoring
  contract says it should.
- Assets without authored collision remain non-physical unless collision is
  explicitly added.
- Disabling collision survives reload/normalization.
- Visual-only role wins over default primitive collision.

## Out Of Scope

- Do not repair Yggdrasil content here except through generic tests or fixtures.
- Do not add runtime fallback collision for assets.
- Do not add compatibility with `requiredAssetActorIds` or `authored-ground`.
