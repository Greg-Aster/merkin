import { terrainLevelInstancesForRuntimeScene } from "../generated/terrainRuntime.js";
import type { LevelDefinition } from "./index.js";

const columnInstances = [
	{ id: "a", position: [-3.5, 1.44, -2] },
	{ id: "b", position: [3.5, 1.44, 2] },
	{ id: "c", position: [-3.5, 1.44, 2] },
	{ id: "d", position: [3.5, 1.44, -2] },
] as const satisfies readonly {
	readonly id: string;
	readonly position: readonly [number, number, number];
}[];

export const sciFiRoomLevel = {
	id: "sci_fi_room",
	sceneId: "sci_fi_room_game",
	preloadGroups: ["sci_fi_room"],
	resources: {
		"game:collectedCount": 0,
		"game:totalCollectibles": 0,
		"game:characterBounds": {
			minX: -48,
			maxX: 48,
			minZ: -18,
			maxZ: 64,
		},
	},
	preload: [
		"mesh_player",
		"mesh_portal_gate",
		"mesh_sci_fi_room_floor_slab",
		"mesh_sci_fi_room_column",
		"mesh_sci_fi_room_console",
		"mesh_sci_fi_room_anomaly_marker",
		"mesh_sci_fi_room_story_marker",
		"cubemap_observatory_sky",
		"material_player",
		"material_sci_fi_room_interior_floor",
		"material_sci_fi_room_courtyard_floor",
		"material_sci_fi_room_wasteland_floor",
		"material_sci_fi_room_wall_panel",
		"material_sci_fi_room_console",
		"material_sci_fi_room_anomaly",
		"material_sci_fi_room_story_marker",
		"audio_player_jump",
		"audio_player_charge_release",
		"audio_portal_activate",
		"audio_portal_cycle",
	],
	instances: [
		...terrainLevelInstancesForRuntimeScene("sci_fi_room_runtime"),
		{
			id: "sci-fi-room-console",
			prefabId: "sci_fi_room_console",
			stableId: "sci-fi-room:console:command",
			transform: {
				position: [0, 0.05, -3.6],
			},
		},
		...columnInstances.map((column) => ({
			id: `sci-fi-room-column-${column.id}`,
			prefabId: "sci_fi_room_column",
			stableId: `sci-fi-room:column:${column.id}`,
			transform: {
				position: column.position,
			},
		})),
		{
			id: "sci-fi-room-fountain",
			prefabId: "sci_fi_room_anomaly_marker",
			stableId: "sci-fi-room:set-dressing:fountain",
			transform: {
				position: [0, 0.15, 21.52],
				scale: [1.8, 0.6, 1.8],
			},
		},
		{
			id: "sci-fi-room-plant-spiral",
			prefabId: "sci_fi_room_anomaly_marker",
			stableId: "sci-fi-room:set-dressing:plant-spiral",
			transform: {
				position: [3, 0.42, 25.52],
				scale: [0.85, 0.85, 0.85],
			},
		},
		{
			id: "sci-fi-room-debris-memory",
			prefabId: "sci_fi_room_anomaly_marker",
			stableId: "sci-fi-room:set-dressing:debris-memory",
			transform: {
				position: [-3.6, 0.34, 52.44],
				scale: [1.35, 0.7, 1.35],
			},
		},
		{
			id: "sci-fi-room-observatory-portal",
			prefabId: "portal_gate",
			stableId: "sci-fi-room:portal:observatory",
			transform: {
				position: [-9.98, -0.32, -8.26],
			},
			components: {
				Portal: {
					id: "sci-fi-room.observatory",
					label: "Observatory",
					prompt: "Click to enter Observatory",
					targetRuntimeSceneId: "observatory_runtime",
					activationRadius: 2.35,
				},
			},
		},
		{
			id: "sci-fi-room-story-pillar",
			prefabId: "sci_fi_room_story_marker",
			stableId: "sci-fi-room:story:pillar",
			transform: {
				position: [3, 1.18, -2],
			},
			components: storyNote({
				id: "sci-fi-room.note.pillar",
				title: "Pillar Whisper",
				author: "Architectural Residue",
				location: "Command Center",
				excerpt:
					"The pillar hums first, like a machine trying to remember the language of prayer.",
				body: "The pillar hums first, like a machine trying to remember the language of prayer.\n\nIts glow is not decorative. It pulses in measured intervals, as if syncing itself to some vanished crew protocol.\n\nEven here, the room seems to prefer ritual to utility.",
				markerColor: "#ff00ff",
				markerSize: 0.62,
			}),
		},
		{
			id: "sci-fi-room-story-bench",
			prefabId: "sci_fi_room_story_marker",
			stableId: "sci-fi-room:story:bench",
			transform: {
				position: [0, 0.38, 19.52],
			},
			components: storyNote({
				id: "sci-fi-room.note.bench",
				title: "Bench Note",
				author: "Unknown Visitor",
				location: "Courtyard Threshold",
				excerpt:
					"The bench offers a pause before the open sky, its carved warning almost tender: look up before you go farther.",
				body: "The bench offers a pause before the open sky, its carved warning almost tender: look up before you go farther.\n\nWhatever was built here expected hesitation.\n\nIt wanted people to stop, adjust to the stars, and only then continue.",
				markerColor: "#ffaa00",
				markerSize: 0.58,
			}),
		},
		{
			id: "sci-fi-room-story-fountain",
			prefabId: "sci_fi_room_story_marker",
			stableId: "sci-fi-room:story:fountain",
			transform: {
				position: [0, 0.6, 21.52],
			},
			components: storyNote({
				id: "sci-fi-room.note.fountain",
				title: "Fountain Inscription",
				author: "Central Basin Archive",
				location: "Courtyard Core",
				excerpt:
					"At the courtyard heart, the fountain mirrors the constellations, as if the room is learning to become an observatory.",
				body: "At the courtyard heart, the fountain mirrors the constellations, as if the room is learning to become an observatory.\n\nThe basin does not reflect what is above so much as rehearse it.\n\nThis place is less a room than a machine for becoming sky-aware.",
				markerColor: "#00ccff",
				markerSize: 0.64,
			}),
		},
		{
			id: "sci-fi-room-story-plant",
			prefabId: "sci_fi_room_story_marker",
			stableId: "sci-fi-room:story:plant",
			transform: {
				position: [3, 1.88, 25.52],
			},
			components: storyNote({
				id: "sci-fi-room.note.plant",
				title: "Plant Spiral",
				author: "Botanical Subsystem",
				location: "Courtyard Growth Ring",
				excerpt:
					"The spiral plants lean toward one particular star cluster, suggesting the garden knows the route better than you do.",
				body: "The spiral plants lean toward one particular star cluster, suggesting the garden knows the route better than you do.\n\nTheir motion is too deliberate for weather and too patient for machinery.\n\nSomething in this level still tracks the sky with devotion.",
				markerColor: "#5edeb9",
				markerSize: 0.56,
			}),
		},
		{
			id: "sci-fi-room-story-junk",
			prefabId: "sci_fi_room_story_marker",
			stableId: "sci-fi-room:story:junk",
			transform: {
				position: [-3.6, 1.48, 52.44],
			},
			components: storyNote({
				id: "sci-fi-room.note.junk",
				title: "Junk Memory",
				author: "Debris Field Echo",
				location: "Deep Wasteland",
				excerpt:
					"Deep in the wasteland, the debris resolves into intent: this ruin was not abandoned, it was aimed at the heavens and left mid-sentence.",
				body: "Deep in the wasteland, the debris resolves into intent: this ruin was not abandoned, it was aimed at the heavens and left mid-sentence.\n\nThe broken shapes form vectors, not rubble.\n\nWhatever failed here was trying to point beyond the room.",
				markerColor: "#ff6666",
				markerSize: 0.7,
			}),
		},
		{
			id: "player",
			prefabId: "player",
			stableId: "player",
			transform: {
				position: [0, 1.5, 0],
			},
			components: {
				CharacterController: {
					groundY: 1.5,
					kinematicCollision: {
						enabled: true,
						offset: 0.04,
						slide: true,
						obstacleChannels: ["worldStatic"],
						snapToGroundDistance: 0.7,
						maxSlopeClimbAngle: 0.7853981633974483,
						minSlopeSlideAngle: 0.8726646259971648,
						autostep: {
							maxHeight: 0.45,
							minWidth: 0.35,
							includeDynamicBodies: false,
						},
					},
				},
				Light: {
					kind: "point",
					color: "#ffd6a3",
					intensity: 5.5,
					distance: 16,
					decay: 2,
					visible: true,
				},
			},
		},
	],
} satisfies LevelDefinition;

function storyNote(options: {
	readonly id: string;
	readonly title: string;
	readonly author: string;
	readonly location: string;
	readonly excerpt: string;
	readonly body: string;
	readonly markerColor: string;
	readonly markerSize: number;
}) {
	return {
		StoryNote: {
			...options,
			activationRadius: 2.35,
		},
	};
}
