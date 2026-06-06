import type { LightAuthoringDraftData } from "../../../engine/data/index.js";

export const mirandaLightAuthoringDraft = {
	schemaVersion: 1,
	id: "miranda_light_authoring_draft_v1",
	runtimeSceneId: "miranda_deck_runtime",
	levelId: "miranda_deck",
	targetFiles: {
		prefabModule: "src/game/prefabs/defaultPrefabs.ts",
		levelModule: "src/game/levels/defaultLevels.ts",
		runtimeSceneManifestModule: "src/game/levels/runtimeSceneManifests.ts",
	},
	entries: [
		{
			id: "miranda-command-gallery-beacon-light",
			stableId: "miranda:command-gallery:beacon-light",
			prefabId: "miranda_command_gallery_beacon_light",
			lightTarget: "prefab",
			transform: {
				position: [0, 7.7, -24.1],
			},
			light: {
				kind: "point",
				color: "#e76949",
				intensity: 8,
				distance: 20,
				decay: 2,
				visible: true,
			},
			readiness: {
				requiredLight: true,
			},
			notes:
				"Migrated Command Gallery Beacon as a stable authored point light.",
		},
		{
			id: "miranda-observation-light",
			stableId: "miranda:observation-gallery:light",
			prefabId: "miranda_observation_light",
			lightTarget: "prefab",
			transform: {
				position: [-10.8, 7.2, 8.4],
			},
			light: {
				kind: "point",
				color: "#8adff5",
				intensity: 4.6,
				distance: 15,
				decay: 2,
				visible: true,
			},
			readiness: {
				requiredLight: true,
			},
			notes:
				"Migrated Observation Gallery light as checked target-engine data.",
		},
		{
			id: "miranda-archive-light",
			stableId: "miranda:archive-gallery:light",
			prefabId: "miranda_archive_light",
			lightTarget: "prefab",
			transform: {
				position: [10.8, 7, 10.8],
			},
			light: {
				kind: "point",
				color: "#7dc8ff",
				intensity: 5,
				distance: 16,
				decay: 2,
				visible: true,
			},
			readiness: {
				requiredLight: true,
			},
			notes: "Migrated Archive Gallery light as a required authored light.",
		},
	],
} satisfies LightAuthoringDraftData;
