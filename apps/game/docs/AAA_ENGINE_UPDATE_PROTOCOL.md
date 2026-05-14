# AAA Engine Update Protocol

## Purpose

Use this protocol when an agent changes a core game-engine contract and the
peripheral systems must move with it. The goal is to prevent half-migrations,
compatibility bloat, broad patch drift, and regressions caused by agents fixing
only the file in front of them.

Core engine contracts include runtime manifests, level readiness, asset loading,
streaming, collision, player activation, editor scene documents, generated
runtime assets, performance budgets, and validation gates.

## Required Impact Map

Every core update starts with an impact map in the agent notes or final handoff:

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

An agent may edit a peripheral system only when it appears in the impact map.
If a peripheral dependency is discovered mid-task, update the map before editing
that surface.

## Allowed Peripheral Work

Peripheral changes are expected when they keep the contract coherent:

- runtime adapters and loaders that consume the changed contract
- editor inspectors, scene document tools, and authoring actions
- manifest schemas, registry data, generated asset metadata, and bake scripts
- diagnostics, audits, release gates, fixtures, and smoke checks
- docs that explain the new ownership boundary

Peripheral changes are not a license for drive-by refactors. Avoid unrelated
renames, style churn, folder reshuffles, dependency swaps, visual redesigns,
and broad compatibility layers unless the contract change requires them.

## Staging Order

1. Contract: update the shared type, schema, service boundary, or manifest
   definition.
2. Runtime: update the narrow player/runtime path that consumes the contract.
3. Authoring: update editor and content pipeline tools that create or modify the
   contract.
4. Validation: update audits, tests, fixtures, and release gates so regressions
   fail loudly.
5. Data: regenerate generated outputs through the owning command, never by hand.
6. Cleanup: delete superseded compatibility code after proving no live import,
   manifest reference, or fixture still uses it.

Do not start with cleanup. Cleanup is last, and it must be tied directly to the
changed contract.

## Anti-Bloat Rules

- Prefer one contract migration over parallel old/new paths.
- Add a compatibility shim only when existing authored content cannot migrate in
  the same change.
- Every shim must name the removal condition in a nearby comment or handoff.
- Do not silence validation to make a migration pass.
- Do not add new scripts unless they are wired to a package command, editor
  action, audit, or documented manual workflow.
- Do not add level-id branches to generic systems.
- Do not hand-edit generated runtime JSON as the fix.

## Handoff Requirements

The final handoff must state:

- the completed impact map
- files changed by ownership area
- source-of-truth data changed
- generated files changed and the command used
- compatibility code deleted or retained
- validation commands run
- remaining peripheral systems intentionally left for a follow-up owner
