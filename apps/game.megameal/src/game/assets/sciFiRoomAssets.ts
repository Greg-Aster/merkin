import type { AssetManifest } from "../../engine/modules/assets/index.js";
import type { AudioContentManifest } from "../../engine/modules/audio/index.js";
import { defaultAudioMixerBuses } from "./audioMixerBuses.js";
import {
	audioPortalActivate,
	audioPortalCycle,
	meshPortalGate,
} from "./portalAssets.js";
import { cubemapObservatorySky } from "./skyboxAssets.js";

const meshPlayer = {
	id: "mesh_player",
	kind: "mesh",
	url: "builtin://player",
} as const;
const meshSciFiRoomFloorSlab = {
	id: "mesh_sci_fi_room_floor_slab",
	kind: "mesh",
	url: "builtin://box",
	tags: ["sci-fi-room", "floor", "walkable", "primitive"],
} as const;
const meshSciFiRoomWallPanel = {
	id: "mesh_sci_fi_room_wall_panel",
	kind: "mesh",
	url: "builtin://box",
	tags: ["sci-fi-room", "wall", "primitive"],
} as const;
const meshSciFiRoomColumn = {
	id: "mesh_sci_fi_room_column",
	kind: "mesh",
	url: "builtin://cylinder?radiusTop=0.55&radiusBottom=0.65&height=4&radialSegments=18",
	tags: ["sci-fi-room", "support", "primitive"],
} as const;
const meshSciFiRoomConsole = {
	id: "mesh_sci_fi_room_console",
	kind: "mesh",
	url: "builtin://box",
	tags: ["sci-fi-room", "console", "primitive"],
} as const;
const meshSciFiRoomAnomalyMarker = {
	id: "mesh_sci_fi_room_anomaly_marker",
	kind: "mesh",
	url: "builtin://cylinder?radiusTop=0.32&radiusBottom=0.5&height=1.6&radialSegments=16",
	tags: ["sci-fi-room", "anomaly", "primitive"],
} as const;
const meshSciFiRoomStoryMarker = {
	id: "mesh_sci_fi_room_story_marker",
	kind: "mesh",
	url: "builtin://cylinder?radiusTop=0.28&radiusBottom=0.36&height=1.15&radialSegments=14",
	tags: ["sci-fi-room", "story-note", "primitive"],
} as const;
const materialPlayer = {
	id: "material_player",
	kind: "material",
	url: "builtin://player-blue",
} as const;
const materialSciFiRoomInteriorFloor = {
	id: "material_sci_fi_room_interior_floor",
	kind: "material",
	url: "builtin://sci-fi-room-interior-floor",
	material: {
		color: "#24313d",
		emissive: "#0a1824",
		emissiveIntensity: 0.08,
		metalness: 0.62,
		roughness: 0.42,
	},
} as const;
const materialSciFiRoomCourtyardFloor = {
	id: "material_sci_fi_room_courtyard_floor",
	kind: "material",
	url: "builtin://sci-fi-room-courtyard-floor",
	material: {
		color: "#2d4042",
		emissive: "#0b1e22",
		emissiveIntensity: 0.06,
		metalness: 0.42,
		roughness: 0.52,
	},
} as const;
const materialSciFiRoomWastelandFloor = {
	id: "material_sci_fi_room_wasteland_floor",
	kind: "material",
	url: "builtin://sci-fi-room-wasteland-floor",
	material: {
		color: "#3b322c",
		emissive: "#17110d",
		emissiveIntensity: 0.04,
		metalness: 0.18,
		roughness: 0.82,
	},
} as const;
const materialSciFiRoomWallPanel = {
	id: "material_sci_fi_room_wall_panel",
	kind: "material",
	url: "builtin://sci-fi-room-wall-panel",
	material: {
		color: "#1c2935",
		emissive: "#122436",
		emissiveIntensity: 0.12,
		metalness: 0.7,
		roughness: 0.32,
	},
} as const;
const materialSciFiRoomConsole = {
	id: "material_sci_fi_room_console",
	kind: "material",
	url: "builtin://sci-fi-room-console",
	material: {
		color: "#203345",
		emissive: "#63d7ff",
		emissiveIntensity: 0.8,
		metalness: 0.84,
		roughness: 0.22,
	},
} as const;
const materialSciFiRoomAnomaly = {
	id: "material_sci_fi_room_anomaly",
	kind: "material",
	url: "builtin://sci-fi-room-anomaly",
	material: {
		color: "#4a355c",
		emissive: "#d17cff",
		emissiveIntensity: 1.15,
		metalness: 0.26,
		roughness: 0.3,
	},
} as const;
const materialSciFiRoomStoryMarker = {
	id: "material_sci_fi_room_story_marker",
	kind: "material",
	url: "builtin://sci-fi-room-story-marker",
	material: {
		color: "#2a3a46",
		emissive: "#85eaff",
		emissiveIntensity: 0.55,
		metalness: 0.36,
		roughness: 0.38,
	},
} as const;
const audioPlayerJump = {
	id: "audio_player_jump",
	kind: "audio",
	url: "/audio/sfx/interface-sweep.mp3",
	tags: ["player", "jump", "sfx"],
} as const;
const audioPlayerChargeRelease = {
	id: "audio_player_charge_release",
	kind: "audio",
	url: "/audio/sfx/22-kenney-forceField_001.mp3",
	tags: ["player", "charge", "sfx"],
} as const;

export const sciFiRoomAssetManifest = {
	assets: [
		meshPlayer,
		meshPortalGate,
		meshSciFiRoomFloorSlab,
		meshSciFiRoomWallPanel,
		meshSciFiRoomColumn,
		meshSciFiRoomConsole,
		meshSciFiRoomAnomalyMarker,
		meshSciFiRoomStoryMarker,
		cubemapObservatorySky,
		materialPlayer,
		materialSciFiRoomInteriorFloor,
		materialSciFiRoomCourtyardFloor,
		materialSciFiRoomWastelandFloor,
		materialSciFiRoomWallPanel,
		materialSciFiRoomConsole,
		materialSciFiRoomAnomaly,
		materialSciFiRoomStoryMarker,
		audioPlayerJump,
		audioPlayerChargeRelease,
		audioPortalActivate,
		audioPortalCycle,
	],
	preloadGroups: {
		sci_fi_room: [
			"mesh_player",
			"mesh_portal_gate",
			"mesh_sci_fi_room_floor_slab",
			"mesh_sci_fi_room_wall_panel",
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
	},
} satisfies AssetManifest;

export const sciFiRoomAudioContentManifest = {
	mixerBuses: defaultAudioMixerBuses,
	eventMappings: [
		{
			id: "sci-fi-room.player.jump",
			eventType: "EntityJumpRequested",
			soundId: "audio_player_jump",
			volume: 0.2,
			busId: "sfx",
			sceneId: "sci_fi_room_game",
		},
		{
			id: "sci-fi-room.player.charge-release",
			eventType: "ChargeActionReleased",
			soundId: "audio_player_charge_release",
			volume: 0.28,
			busId: "sfx",
			sceneId: "sci_fi_room_game",
		},
		{
			id: "sci-fi-room.portal.activate",
			eventType: "PortalActivated",
			soundId: "audio_portal_activate",
			volume: 0.32,
			busId: "sfx",
			sceneId: "sci_fi_room_game",
		},
	],
} satisfies AudioContentManifest;
