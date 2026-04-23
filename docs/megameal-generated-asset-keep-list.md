# MEGAMEAL Generated Asset Keep-List

Date: 2026-04-22

Purpose:

- identify currently referenced generated/model assets before any deletion or relocation work
- separate concrete runtime/editor asset URLs from generic placeholders and package-export aliases

## Scope Notes

This keep-list was built from code search across `apps/megameal`, `apps/game`, and `packages`, excluding files inside `public/generated` itself.

Important distinctions:

- `apps/game/public/style-engine-ref` currently has no direct live code references from this search pass
- `/generated/posts.json`, `/generated/timeline.json`, and `/generated/game-stars.json` are package-export paths from `packages/shared-data`, not concrete files inside `apps/megameal/public/generated/hunyuan3d`
- generic placeholders like `/generated/.../reference.png` and `/generated/hunyuan3d` should block blind deletion of those roots, but they are not concrete asset winners

## Referencing Source Clusters

Concrete generated asset URLs are referenced from:

- `apps/game/src/threlte/editor/defaultScenes.ts`
- `apps/game/src/threlte/editor/scenes/sci-fi-room.scene.json`
- `apps/game/src/threlte/editor/scenes/yggdrasil.scene.json`
- `apps/game/src/threlte/editor/scenes/solitude.scene.json`
- `apps/megameal/src/content/products/snuggaloids.md`

## Concrete Keep-List

These are the exact concrete asset paths currently referenced from source:

```text
/generated/hunyuan3d/bifrost-approach/bifrost-approach-generated-2026-04-19T16-47-32-023Z.glb
/generated/hunyuan3d/biomechanical-growth-planter/biomechanical-growth-planter-generated-2026-04-18T02-10-29-603Z.glb
/generated/hunyuan3d/biomechanical-growth-planter/biomechanical-growth-planter-generated-2026-04-18T02-38-02-192Z.glb
/generated/hunyuan3d/biomechanical-growth-planter/biomechanical-growth-planter-generated-2026-04-18T02-42-42-855Z.glb
/generated/hunyuan3d/branch-east/branch-east-generated-2026-04-19T17-28-01-226Z.glb
/generated/hunyuan3d/branch-ne/branch-ne-generated-2026-04-19T17-33-36-110Z.glb
/generated/hunyuan3d/branch-north/branch-north-generated-2026-04-19T17-22-30-105Z.glb
/generated/hunyuan3d/branch-nw/branch-nw-generated-2026-04-19T17-36-13-707Z.glb
/generated/hunyuan3d/branch-se/branch-se-generated-2026-04-19T17-39-02-154Z.glb
/generated/hunyuan3d/branch-south/branch-south-generated-2026-04-19T17-25-13-766Z.glb
/generated/hunyuan3d/branch-sw/branch-sw-generated-2026-04-19T17-41-49-573Z.glb
/generated/hunyuan3d/branch-west/branch-west-generated-2026-04-19T17-30-56-202Z.glb
/generated/hunyuan3d/canopy-1/canopy-1-generated-2026-04-19T17-45-32-578Z.glb
/generated/hunyuan3d/growth-planter-b-generated-2026-04-18t01-36-15-986z/growth-planter-b-generated-2026-04-18t01-36-15-986z-texture-wrap-2026-04-18T01-38-19-536Z.glb
/generated/hunyuan3d/growth-planter-b/growth-planter-b-generated-2026-04-18T01-36-15-986Z.glb
/generated/hunyuan3d/island-shelf/island-shelf-generated-2026-04-19T16-35-28-683Z.glb
/generated/hunyuan3d/references/example.png
/generated/hunyuan3d/ring-fragment-east/ring-fragment-east-generated-2026-04-20T00-01-43-946Z.glb
/generated/hunyuan3d/ring-fragment-west/ring-fragment-west-generated-2026-04-20T00-06-05-730Z.glb
/generated/hunyuan3d/root-east/root-east-generated-2026-04-19T17-05-01-813Z.glb
/generated/hunyuan3d/root-mound/root-mound-generated-2026-04-19T16-41-26-944Z.glb
/generated/hunyuan3d/root-north/root-north-generated-2026-04-19T16-59-20-463Z.glb
/generated/hunyuan3d/root-northeast/root-northeast-generated-2026-04-19T17-10-26-920Z.glb
/generated/hunyuan3d/root-northwest/root-northwest-generated-2026-04-19T17-13-41-911Z.glb
/generated/hunyuan3d/root-south/root-south-generated-2026-04-19T17-02-12-977Z.glb
/generated/hunyuan3d/root-southeast/root-southeast-generated-2026-04-19T17-16-26-636Z.glb
/generated/hunyuan3d/root-southwest/root-southwest-generated-2026-04-19T17-19-22-220Z.glb
/generated/hunyuan3d/root-west/root-west-generated-2026-04-19T17-07-48-681Z.glb
/generated/hunyuan3d/ruin-dais/ruin-dais-generated-2026-04-19T23-21-06-179Z.glb
/generated/hunyuan3d/shore-ring/shore-ring-generated-2026-04-19T16-32-21-479Z.glb
/generated/hunyuan3d/solitude-pillar-11/solitude-pillar-11-generated-2026-04-19T23-54-22-571Z.glb
/generated/hunyuan3d/solitude-pillar-12/solitude-pillar-12-generated-2026-04-19T23-57-40-585Z.glb
/generated/hunyuan3d/solitude-plateau/solitude-plateau-generated-2026-04-19T18-12-34-007Z.glb
/generated/hunyuan3d/trunk-lower/trunk-lower-generated-2026-04-19T16-50-31-183Z.glb
/generated/hunyuan3d/trunk-mid/trunk-mid-generated-2026-04-19T16-53-29-448Z.glb
/generated/hunyuan3d/trunk-upper/trunk-upper-generated-2026-04-19T16-56-26-375Z.glb
/generated/hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z-generated-2026-04-18T22-29-37-524Z.glb
/generated/hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z-generated-2026-04-18T22-42-43-915Z.glb
/generated/hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z-generated-2026-04-19T00-23-01-827Z.glb
/generated/hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z-generated-2026-04-19T00-35-29-989Z.glb
/generated/hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z-generated-2026-04-19T00-42-38-513Z.glb
/generated/hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z-texture-wrap-2026-04-18T22-48-19-209Z.glb
/generated/hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z-texture-wrap-2026-04-18T23-14-30-195Z.glb
/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-18T22-01-36-007Z.glb
/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-24-06-758Z.glb
/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-27-04-251Z.glb
/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-30-13-924Z.glb
/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-33-28-476Z.glb
/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-36-30-619Z.glb
/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-39-39-599Z.glb
/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-42-40-008Z.glb
/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-45-16-485Z.glb
/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-48-08-244Z.glb
/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-51-13-313Z.glb
/generated/hunyuan3d/well-dais/well-dais-generated-2026-04-19T16-44-36-480Z.glb
/generated/hunyuan3d/world-root-basin/world-root-basin-generated-2026-04-19T16-38-34-252Z.glb
/models/snuggaliod/Fur.glb
```

## Generic References That Are Not Concrete Asset Winners

These should not be treated as direct keep-list entries for individual generated files:

```text
/generated/.../reference.png
/generated/*
/generated/*.json
/generated/hunyuan3d
/generated/game-stars.json
/generated/posts.json
/generated/timeline.json
style-engine-ref
```

Interpretation:

- `/generated/game-stars.json`, `/generated/posts.json`, and `/generated/timeline.json` point at `packages/shared-data/generated/*`
- `/generated/hunyuan3d` and `/generated/.../reference.png` are editor workflow references and placeholders
- `style-engine-ref` did not appear as a concrete runtime asset path in source

## Current Cleanup Rule

Until the generated-asset cleanup pass begins:

- do not delete any asset listed in the concrete keep-list
- do not delete the containing directories for those assets
- do not assume `style-engine-ref` is needed at runtime, but also do not delete it yet without a deliberate archival decision
