import type { GeneratedGlbImportManifest } from "../../engine/data/index.js";

export const mirandaGeneratedGlbImportParityManifest = {
	id: "miranda-generated-glb-import-parity",
	generatedAt: "2026-06-06T00:00:00.000Z",
	entries: [
		{
			id: "miranda-command-console-glb",
			sourceUrl:
				"/generated/runtime-game-assets/prefabs/command-console/command-console.glb",
			runtimeSceneId: "miranda_deck_runtime",
			status: "substituted",
			owner: "Miranda content migration",
			evidence: [
				"apps/megameal/public/generated/runtime-game-assets/manifest.json",
				"docs/GAME_ENGINE_MIGRATION_PLAN.md",
				"docs/MIGRATION_HANDOFF_2026-06-06.md",
			],
			target: {
				assetIds: ["mesh_box", "material_miranda_cockpit_console"],
				prefabIds: ["miranda_cockpit_console"],
				stableIds: ["miranda:cockpit:console"],
				notes:
					"Legacy generated command-console GLB parity is rebuilt as checked-in target-engine box geometry, material parameters, collision, and a stable Miranda level instance.",
			},
		},
		{
			id: "miranda-wasteland-monolith-glb",
			sourceUrl:
				"/generated/runtime-game-assets/prefabs/wasteland-monolith/wasteland-monolith.glb",
			runtimeSceneId: "miranda_deck_runtime",
			status: "substituted",
			owner: "Miranda content migration",
			evidence: [
				"apps/megameal/public/generated/runtime-game-assets/manifest.json",
				"docs/GAME_ENGINE_MIGRATION_PLAN.md",
				"docs/MIGRATION_HANDOFF_2026-06-06.md",
			],
			target: {
				assetIds: ["mesh_box", "material_miranda_chapel_monolith"],
				prefabIds: ["miranda_chapel_monolith"],
				stableIds: ["miranda:chapel:monolith:a", "miranda:chapel:monolith:b"],
				notes:
					"Legacy monolith GLB parity is rebuilt as the checked-in Chapel monolith prefab and two stable Miranda level instances.",
			},
		},
		{
			id: "miranda-story-marker-amber-glb",
			sourceUrl:
				"/generated/runtime-game-assets/prefabs/story-marker/story-marker-amber.glb",
			runtimeSceneId: "miranda_deck_runtime",
			status: "substituted",
			owner: "StoryNote migration",
			evidence: [
				"apps/megameal/public/generated/runtime-game-assets/manifest.json",
				"GAME_ENGINE_DESIGN_DOCUMENT.md",
				"docs/GAME_ENGINE_MIGRATION_PLAN.md",
			],
			target: {
				assetIds: ["mesh_cylinder", "material_miranda_story_marker_amber"],
				prefabIds: ["miranda_story_marker_amber"],
				stableIds: [
					"miranda:captain:story-note:first-officer",
					"miranda:engine:story-note:engineering-memo",
					"miranda:mess:story-note:ledger",
				],
				notes:
					"Legacy marker GLB visual parity is intentionally substituted with a checked-in target marker prefab while StoryNote data owns interaction text and reader state.",
			},
		},
		{
			id: "miranda-story-marker-cyan-glb",
			sourceUrl:
				"/generated/runtime-game-assets/prefabs/story-marker/story-marker-cyan.glb",
			runtimeSceneId: "miranda_deck_runtime",
			status: "substituted",
			owner: "StoryNote migration",
			evidence: [
				"apps/megameal/public/generated/runtime-game-assets/manifest.json",
				"GAME_ENGINE_DESIGN_DOCUMENT.md",
				"docs/GAME_ENGINE_MIGRATION_PLAN.md",
			],
			target: {
				assetIds: ["mesh_cylinder", "material_miranda_story_marker_cyan"],
				prefabIds: ["miranda_story_marker_cyan"],
				stableIds: [
					"miranda:cockpit:story-note:captain-log",
					"miranda:medbay:story-note:quarantine",
				],
				notes:
					"Legacy marker GLB visual parity is intentionally substituted with a checked-in target marker prefab while StoryNote data owns interaction text and reader state.",
			},
		},
		{
			id: "miranda-story-marker-magenta-glb",
			sourceUrl:
				"/generated/runtime-game-assets/prefabs/story-marker/story-marker-magenta.glb",
			runtimeSceneId: "miranda_deck_runtime",
			status: "substituted",
			owner: "StoryNote migration",
			evidence: [
				"apps/megameal/public/generated/runtime-game-assets/manifest.json",
				"GAME_ENGINE_DESIGN_DOCUMENT.md",
				"docs/GAME_ENGINE_MIGRATION_PLAN.md",
			],
			target: {
				assetIds: ["mesh_cylinder", "material_miranda_story_marker_magenta"],
				prefabIds: ["miranda_story_marker_magenta"],
				stableIds: ["miranda:archive:story-note:index"],
				notes:
					"Legacy marker GLB visual parity is intentionally substituted with a checked-in target marker prefab while StoryNote data owns interaction text and reader state.",
			},
		},
		{
			id: "miranda-story-marker-red-glb",
			sourceUrl:
				"/generated/runtime-game-assets/prefabs/story-marker/story-marker-red.glb",
			runtimeSceneId: "miranda_deck_runtime",
			status: "substituted",
			owner: "StoryNote migration",
			evidence: [
				"apps/megameal/public/generated/runtime-game-assets/manifest.json",
				"GAME_ENGINE_DESIGN_DOCUMENT.md",
				"docs/GAME_ENGINE_MIGRATION_PLAN.md",
			],
			target: {
				assetIds: ["mesh_cylinder", "material_miranda_story_marker_red"],
				prefabIds: ["miranda_story_marker_red"],
				stableIds: [
					"miranda:crew:story-note:medical-watch",
					"miranda:captain:story-note:vault-fragment",
					"miranda:brig:story-note:confession",
				],
				notes:
					"Legacy marker GLB visual parity is intentionally substituted with a checked-in target marker prefab while StoryNote data owns interaction text and reader state.",
			},
		},
		{
			id: "miranda-story-marker-green-glb",
			sourceUrl:
				"/generated/runtime-game-assets/prefabs/story-marker/story-marker-green.glb",
			runtimeSceneId: "miranda_deck_runtime",
			status: "planned",
			owner: "StoryNote migration",
			evidence: [
				"apps/megameal/public/generated/runtime-game-assets/manifest.json",
			],
			planned: {
				contractId: "GeneratedGlbImportParityContract",
				reason:
					"The old generated green marker exists in the generated prefab library, but the current Miranda target slice has no green StoryNote marker instance.",
				removalCondition:
					"Add a target material/prefab/stable instance when a migrated level needs a green marker, or remove this candidate after source evidence confirms it is unused.",
			},
		},
		{
			id: "miranda-portal-apparatus-glb",
			sourceUrl:
				"/generated/runtime-game-assets/prefabs/portal-apparatus/portal-apparatus.glb",
			runtimeSceneId: "miranda_deck_runtime",
			status: "planned",
			owner: "Portal content migration",
			evidence: [
				"apps/megameal/public/generated/runtime-game-assets/manifest.json",
				"GAME_ENGINE_DESIGN_DOCUMENT.md",
				"docs/GAME_ENGINE_MIGRATION_PLAN.md",
				"docs/MIGRATION_HANDOFF_2026-06-06.md",
			],
			planned: {
				contractId: "GeneratedGlbImportParityContract",
				reason:
					"The target runtime has a functional shared portal gate and manifest-ID transition, but the old generated portal apparatus visual/collider product is intentionally not loaded yet.",
				removalCondition:
					"Either import or rebuild the apparatus through an owned asset/collision cook path, or record an art-direction decision that the shared portal gate fully replaces it.",
			},
		},
	],
} satisfies GeneratedGlbImportManifest;

export const observatoryGeneratedVisualTerrainImportManifest = {
	id: "observatory-generated-visual-terrain-import",
	generatedAt: "2026-06-06T00:00:00.000Z",
	entries: [
		{
			id: "observatory-field-micro-displacement-glb",
			sourceUrl:
				"/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.glb",
			runtimeSceneId: "observatory_runtime",
			status: "imported",
			owner: "Observatory visual terrain generation",
			evidence: [
				"scripts/generate-observatory-field-terrain.ts",
				"public/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.json",
				"docs/LEVEL_EDITOR_COLLISION_COOK_PLAN.md",
			],
			artifact: {
				generatorScript: "scripts/generate-observatory-field-terrain.ts",
				metadataPath:
					"public/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.json",
				glbSha256:
					"326df726413d05e1139efe355d3e65bb0b78d120ecd05e615cc5ed1e37dd0d92",
			},
			target: {
				assetIds: ["mesh_observatory_field_micro_displacement"],
				prefabIds: ["observatory_field_visual_terrain"],
				stableIds: ["observatory:terrain:visual-field"],
				notes:
					"Generated target-engine visual terrain aligns to observatory:walkable-mesh collision draft heights while collision stays explicit and non-render-derived.",
			},
		},
	],
} satisfies GeneratedGlbImportManifest;

export const generatedGlbImportParityManifests = [
	mirandaGeneratedGlbImportParityManifest,
	observatoryGeneratedVisualTerrainImportManifest,
] as const;
