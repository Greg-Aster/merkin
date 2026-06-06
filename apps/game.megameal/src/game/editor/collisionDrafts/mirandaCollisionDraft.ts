import type { CollisionCookDraftData } from "../../../engine/data/index.js";

export const mirandaCollisionCookDraft = {
	schemaVersion: 1,
	id: "miranda_collision_draft_v1",
	runtimeSceneId: "miranda_deck_runtime",
	levelId: "miranda_deck",
	targetFiles: {
		prefabModule: "src/game/prefabs/defaultPrefabs.ts",
		levelModule: "src/game/levels/defaultLevels.ts",
		runtimeSceneManifestModule: "src/game/levels/runtimeSceneManifests.ts",
	},
	entries: [
		{
			id: "miranda-floor-main",
			stableId: "miranda:floor:main",
			prefabId: "miranda_floor_main",
			colliderTarget: "prefab",
			transform: {
				position: [0, 3.35, -4],
			},
			collider: {
				intent: "walkable",
				channel: "worldStatic",
				shape: {
					type: "box",
					halfExtents: [20, 0.6, 46],
				},
			},
			readiness: {
				requiredCollision: true,
				requiredWalkable: true,
			},
			notes:
				"Current migrated Miranda main-deck walkable footprint; full terrain/cooked collision remains future.",
		},
		{
			id: "miranda-floor-upper",
			stableId: "miranda:floor:upper",
			prefabId: "miranda_floor_upper",
			colliderTarget: "prefab",
			transform: {
				position: [0, 4.7, -27.5],
			},
			collider: {
				intent: "walkable",
				channel: "worldStatic",
				shape: {
					type: "box",
					halfExtents: [9, 0.45, 9],
				},
			},
			readiness: {
				requiredCollision: true,
				requiredWalkable: true,
			},
			notes:
				"Current migrated Miranda upper-gallery walkable footprint; full terrain/cooked collision remains future.",
		},
		{
			id: "miranda-floor-cargo-hold",
			stableId: "miranda:floor:cargo-hold",
			prefabId: "miranda_floor_cargo_hold",
			colliderTarget: "prefab",
			transform: {
				position: [0, 3.35, 45],
			},
			collider: {
				intent: "walkable",
				channel: "worldStatic",
				shape: {
					type: "box",
					halfExtents: [20, 0.6, 3],
				},
			},
			readiness: {
				requiredCollision: true,
				requiredWalkable: true,
			},
			notes:
				"Current migrated Miranda Cargo Hold walkable extension; full terrain/cooked collision remains future.",
		},
	],
} satisfies CollisionCookDraftData;
