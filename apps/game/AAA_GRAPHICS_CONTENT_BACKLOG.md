# AAA Graphics Content Backlog

This file tracks source-art work that cannot be honestly completed by engine code alone. The runtime pipeline now validates these issues; this backlog is the art-production queue required to move from engine-grade plumbing toward AAA-quality content.

Generated from `apps/megameal/public/generated/runtime-game-assets/manifest.json`.

## LOD / Retopology Required

Current audit count: `lodTargetMisses=9`. Tiny meshes below the LOD policy threshold and variants within the absolute/ratio tolerance are recorded in the runtime manifest as explicit validation exceptions. The remaining misses are real source-art work and need source retopology, manual LOD authoring, or replacement source meshes.

| Asset | Tier | Source Tris | Variant Tris | Target Tris | Actual Ratio | Target Ratio |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `/generated/runtime-game-assets/prefabs/story-marker/story-marker-amber.glb` | high | 604 | 604 | 496 | 1 | 0.82 |
| `/generated/runtime-game-assets/prefabs/story-marker/story-marker-amber.glb` | low | 604 | 267 | 170 | 0.4421 | 0.28 |
| `/generated/runtime-game-assets/prefabs/story-marker/story-marker-amber.glb` | medium | 604 | 604 | 315 | 1 | 0.52 |
| `/generated/runtime-game-assets/prefabs/story-marker/story-marker-cyan.glb` | high | 604 | 604 | 496 | 1 | 0.82 |
| `/generated/runtime-game-assets/prefabs/story-marker/story-marker-cyan.glb` | low | 604 | 267 | 170 | 0.4421 | 0.28 |
| `/generated/runtime-game-assets/prefabs/story-marker/story-marker-cyan.glb` | medium | 604 | 604 | 315 | 1 | 0.52 |
| `/generated/runtime-game-assets/prefabs/story-marker/story-marker-magenta.glb` | high | 604 | 604 | 496 | 1 | 0.82 |
| `/generated/runtime-game-assets/prefabs/story-marker/story-marker-magenta.glb` | low | 604 | 267 | 170 | 0.4421 | 0.28 |
| `/generated/runtime-game-assets/prefabs/story-marker/story-marker-magenta.glb` | medium | 604 | 604 | 315 | 1 | 0.52 |

## Authored PBR Material Pass Required

Current audit count: `missingRecommendedSlots=262`, with `unapprovedRecommendedSlots=0`. The missing slots are explicitly approved fallbacks for generated assets, but AAA-quality content should replace them with authored material maps over time.

### Remaining Fallbacks By Family

| Family | Assets | Approved Missing Slots |
| --- | ---: | ---: |
| hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z | 4 | 32 |
| hunyuan3d/biomechanical-growth-planter | 3 | 24 |
| prefab/courtyard-fountain | 1 | 21 |
| prefab/command-console | 1 | 15 |
| prefab/growth-planter | 1 | 15 |
| prefab/bench-growth | 1 | 12 |
| prefab/portal-apparatus | 1 | 12 |
| style-lab/root-mound-2026-04-26T01-47-59-418Z | 1 | 12 |
| hunyuan3d/growth-planter-b | 1 | 8 |
| hunyuan3d/growth-planter-b-generated-2026-04-18t01-36-15-986z | 1 | 8 |
| hunyuan3d/lower-root-arch | 1 | 8 |
| hunyuan3d/ring-fragment-east | 1 | 8 |
| hunyuan3d/ring-fragment-west | 1 | 8 |
| hunyuan3d/ruin-dais | 1 | 8 |
| hunyuan3d/solitude-pillar-11 | 1 | 8 |
| hunyuan3d/solitude-pillar-12 | 1 | 8 |
| hunyuan3d/solitude-plateau | 1 | 8 |
| hunyuan3d/yggdrasil-world-tree-merged-2026-04-25t02-07-36-925z | 1 | 8 |
| prefab/courtyard-pylon | 1 | 6 |
| prefab/interior-archway | 1 | 6 |
| prefab/support-column | 1 | 6 |
| prefab/wasteland-archway | 1 | 6 |
| prefab/wasteland-monolith | 1 | 6 |
| prefab/broken-ring | 1 | 3 |
| prefab/observation-rig | 1 | 3 |
| style-lab/well-dais-2026-05-11T23-09-54-411Z | 1 | 3 |

### Remaining Fallbacks By Level

| Level | Assets | Approved Missing Slots |
| --- | ---: | ---: |
| yggdrasil | 18 | 144 |
| sci-fi-room | 15 | 128 |
| solitude | 6 | 48 |
| miranda | 3 | 33 |

### Authored Material Slices

| Asset | Family | Levels | Texture Size | Workflow |
| --- | --- | --- | ---: | --- |
| `/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-18T22-01-36-007Z.glb` | hunyuan3d/weathered-monolith-pillar | yggdrasil | 64 | apps/game/scripts/author-weathered-monolith-pbr.mjs |
| `/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-24-06-758Z.glb` | hunyuan3d/weathered-monolith-pillar | solitude | 64 | apps/game/scripts/author-weathered-monolith-pbr.mjs |
| `/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-27-04-251Z.glb` | hunyuan3d/weathered-monolith-pillar | solitude | 64 | apps/game/scripts/author-weathered-monolith-pbr.mjs |
| `/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-30-13-924Z.glb` | hunyuan3d/weathered-monolith-pillar | solitude | 64 | apps/game/scripts/author-weathered-monolith-pbr.mjs |
| `/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-33-28-476Z.glb` | hunyuan3d/weathered-monolith-pillar | solitude | 64 | apps/game/scripts/author-weathered-monolith-pbr.mjs |
| `/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-36-30-619Z.glb` | hunyuan3d/weathered-monolith-pillar | solitude | 64 | apps/game/scripts/author-weathered-monolith-pbr.mjs |
| `/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-39-39-599Z.glb` | hunyuan3d/weathered-monolith-pillar | solitude | 64 | apps/game/scripts/author-weathered-monolith-pbr.mjs |
| `/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-42-40-008Z.glb` | hunyuan3d/weathered-monolith-pillar | solitude | 64 | apps/game/scripts/author-weathered-monolith-pbr.mjs |
| `/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-45-16-485Z.glb` | hunyuan3d/weathered-monolith-pillar | solitude | 64 | apps/game/scripts/author-weathered-monolith-pbr.mjs |
| `/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-48-08-244Z.glb` | hunyuan3d/weathered-monolith-pillar | solitude | 64 | apps/game/scripts/author-weathered-monolith-pbr.mjs |
| `/generated/hunyuan3d/weathered-monolith-pillar/weathered-monolith-pillar-generated-2026-04-19T23-51-13-313Z.glb` | hunyuan3d/weathered-monolith-pillar | solitude | 64 | apps/game/scripts/author-weathered-monolith-pbr.mjs |
| `/generated/hunyuan3d/yggdrasil-bifrost-ribbon/yggdrasil-bifrost-ribbon-merged-2026-04-25T02-17-02-006Z.glb` | hunyuan3d/yggdrasil-bifrost-ribbon | yggdrasil | 64 | apps/game/scripts/author-yggdrasil-bifrost-ribbon-pbr.mjs |
| `/generated/hunyuan3d/yggdrasil-crown-ascent/yggdrasil-crown-ascent-merged-2026-04-25T02-12-58-163Z.glb` | hunyuan3d/yggdrasil-crown-ascent | yggdrasil | 64 | apps/game/scripts/author-yggdrasil-crown-pbr.mjs |
| `/generated/runtime-game-assets/prefabs/anomaly-cluster/anomaly-cluster-cyan.glb` | prefab/anomaly-cluster | sci-fi-room | 64 | apps/game/scripts/bake-runtime-prefabs.mjs#anomaly-cluster-pbr |
| `/generated/runtime-game-assets/prefabs/anomaly-cluster/anomaly-cluster-green.glb` | prefab/anomaly-cluster | sci-fi-room | 64 | apps/game/scripts/bake-runtime-prefabs.mjs#anomaly-cluster-pbr |
| `/generated/runtime-game-assets/prefabs/anomaly-cluster/anomaly-cluster-magenta.glb` | prefab/anomaly-cluster | sci-fi-room | 64 | apps/game/scripts/bake-runtime-prefabs.mjs#anomaly-cluster-pbr |
| `/generated/runtime-game-assets/prefabs/anomaly-cluster/anomaly-cluster-rose.glb` | prefab/anomaly-cluster | sci-fi-room | 64 | apps/game/scripts/bake-runtime-prefabs.mjs#anomaly-cluster-pbr |
| `/generated/runtime-game-assets/prefabs/command-fin/command-fin.glb` | prefab/command-fin | sci-fi-room | 64 | apps/game/scripts/bake-runtime-prefabs.mjs#command-fin-pbr |
| `/generated/runtime-game-assets/prefabs/story-marker/story-marker-amber.glb` | prefab/story-marker | miranda, sci-fi-room, yggdrasil | 64 | apps/game/scripts/bake-runtime-prefabs.mjs#story-marker-pbr |
| `/generated/runtime-game-assets/prefabs/story-marker/story-marker-cyan.glb` | prefab/story-marker | miranda, sci-fi-room, yggdrasil | 64 | apps/game/scripts/bake-runtime-prefabs.mjs#story-marker-pbr |
| `/generated/runtime-game-assets/prefabs/story-marker/story-marker-green.glb` | prefab/story-marker | sci-fi-room | 64 | apps/game/scripts/bake-runtime-prefabs.mjs#story-marker-pbr |
| `/generated/runtime-game-assets/prefabs/story-marker/story-marker-magenta.glb` | prefab/story-marker | miranda, sci-fi-room, yggdrasil | 64 | apps/game/scripts/bake-runtime-prefabs.mjs#story-marker-pbr |
| `/generated/runtime-game-assets/prefabs/story-marker/story-marker-red.glb` | prefab/story-marker | miranda, sci-fi-room | 64 | apps/game/scripts/bake-runtime-prefabs.mjs#story-marker-pbr |

### Remaining Fallback Assets

| Asset | Family | Levels | Approved Missing Slots |
| --- | --- | --- | ---: |
| `/generated/runtime-game-assets/prefabs/courtyard-fountain/courtyard-fountain.glb` | prefab/courtyard-fountain | sci-fi-room | 21 |
| `/generated/runtime-game-assets/prefabs/command-console/command-console.glb` | prefab/command-console | miranda, sci-fi-room | 15 |
| `/generated/runtime-game-assets/prefabs/growth-planter/growth-planter.glb` | prefab/growth-planter | yggdrasil | 15 |
| `/generated/runtime-game-assets/prefabs/bench-growth/bench-growth.glb` | prefab/bench-growth | sci-fi-room, yggdrasil | 12 |
| `/generated/runtime-game-assets/prefabs/portal-apparatus/portal-apparatus.glb` | prefab/portal-apparatus | miranda, sci-fi-room, yggdrasil | 12 |
| `/generated/style-lab/sources/root-mound-2026-04-26T01-47-59-418Z/root-mound.glb` | style-lab/root-mound-2026-04-26T01-47-59-418Z | yggdrasil | 12 |
| `/generated/hunyuan3d/biomechanical-growth-planter/biomechanical-growth-planter-generated-2026-04-18T02-10-29-603Z.glb` | hunyuan3d/biomechanical-growth-planter | sci-fi-room | 8 |
| `/generated/hunyuan3d/biomechanical-growth-planter/biomechanical-growth-planter-generated-2026-04-18T02-38-02-192Z.glb` | hunyuan3d/biomechanical-growth-planter | sci-fi-room | 8 |
| `/generated/hunyuan3d/biomechanical-growth-planter/biomechanical-growth-planter-generated-2026-04-18T02-42-42-855Z.glb` | hunyuan3d/biomechanical-growth-planter | sci-fi-room, yggdrasil | 8 |
| `/generated/hunyuan3d/growth-planter-b-generated-2026-04-18t01-36-15-986z/growth-planter-b-generated-2026-04-18t01-36-15-986z-texture-wrap-2026-04-18T01-38-19-536Z.glb` | hunyuan3d/growth-planter-b-generated-2026-04-18t01-36-15-986z | sci-fi-room, yggdrasil | 8 |
| `/generated/hunyuan3d/growth-planter-b/growth-planter-b-generated-2026-04-18T01-36-15-986Z.glb` | hunyuan3d/growth-planter-b | yggdrasil | 8 |
| `/generated/hunyuan3d/lower-root-arch/lower-root-arch-generated-2026-04-26T02-38-26-370Z.glb` | hunyuan3d/lower-root-arch | yggdrasil | 8 |
| `/generated/hunyuan3d/ring-fragment-east/ring-fragment-east-generated-2026-04-20T00-01-43-946Z.glb` | hunyuan3d/ring-fragment-east | solitude | 8 |
| `/generated/hunyuan3d/ring-fragment-west/ring-fragment-west-generated-2026-04-20T00-06-05-730Z.glb` | hunyuan3d/ring-fragment-west | solitude | 8 |
| `/generated/hunyuan3d/ruin-dais/ruin-dais-generated-2026-04-19T23-21-06-179Z.glb` | hunyuan3d/ruin-dais | solitude | 8 |
| `/generated/hunyuan3d/solitude-pillar-11/solitude-pillar-11-generated-2026-04-19T23-54-22-571Z.glb` | hunyuan3d/solitude-pillar-11 | solitude | 8 |
| `/generated/hunyuan3d/solitude-pillar-12/solitude-pillar-12-generated-2026-04-19T23-57-40-585Z.glb` | hunyuan3d/solitude-pillar-12 | solitude | 8 |
| `/generated/hunyuan3d/solitude-plateau/solitude-plateau-generated-2026-04-19T18-12-34-007Z.glb` | hunyuan3d/solitude-plateau | solitude | 8 |
| `/generated/hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z-generated-2026-04-19T00-35-29-989Z.glb` | hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z | yggdrasil | 8 |
| `/generated/hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z-generated-2026-04-19T00-42-38-513Z.glb` | hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z | yggdrasil | 8 |
| `/generated/hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z-texture-wrap-2026-04-18T22-48-19-209Z.glb` | hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z | yggdrasil | 8 |
| `/generated/hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z-texture-wrap-2026-04-18T23-14-30-195Z.glb` | hunyuan3d/weathered-monolith-pillar-generated-2026-04-18t22-01-36-007z | yggdrasil | 8 |
| `/generated/hunyuan3d/yggdrasil-world-tree-merged-2026-04-25t02-07-36-925z/yggdrasil-world-tree-merged-2026-04-25t02-07-36-925z-generated-2026-04-25T02-24-40-321Z.glb` | hunyuan3d/yggdrasil-world-tree-merged-2026-04-25t02-07-36-925z | yggdrasil | 8 |
| `/generated/runtime-game-assets/prefabs/courtyard-pylon/courtyard-pylon.glb` | prefab/courtyard-pylon | sci-fi-room | 6 |
| `/generated/runtime-game-assets/prefabs/interior-archway/interior-archway.glb` | prefab/interior-archway | sci-fi-room | 6 |
| `/generated/runtime-game-assets/prefabs/support-column/support-column.glb` | prefab/support-column | sci-fi-room, yggdrasil | 6 |
| `/generated/runtime-game-assets/prefabs/wasteland-archway/wasteland-archway.glb` | prefab/wasteland-archway | sci-fi-room, yggdrasil | 6 |
| `/generated/runtime-game-assets/prefabs/wasteland-monolith/wasteland-monolith.glb` | prefab/wasteland-monolith | miranda, sci-fi-room | 6 |
| `/generated/runtime-game-assets/prefabs/broken-ring/broken-ring.glb` | prefab/broken-ring | sci-fi-room, yggdrasil | 3 |
| `/generated/runtime-game-assets/prefabs/observation-rig/observation-rig.glb` | prefab/observation-rig | sci-fi-room, yggdrasil | 3 |
| `/generated/style-lab/sources/well-dais-2026-05-11T23-09-54-411Z/well-dais.glb` | style-lab/well-dais-2026-05-11T23-09-54-411Z | yggdrasil | 3 |
