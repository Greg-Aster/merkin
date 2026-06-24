import type { RenderProfileData } from "../../engine/index.js";

export const starterRenderProfile = {
	id: "starter_minimal_daylight",
	renderer: {
		clearColor: "#121917",
		clearAlpha: 1,
		antialias: true,
		maxPixelRatio: 2,
		fallbackMaterialColor: "#50a8ff",
	},
	lighting: {
		lights: [
			{
				kind: "ambient",
				color: "#d8f5e4",
				intensity: 0.85,
			},
			{
				kind: "directional",
				color: "#fff2d5",
				intensity: 2.1,
				position: [3, 6, 4],
			},
		],
		budget: {
			maxTotal: 4,
			maxAmbient: 1,
			maxDirectional: 2,
			maxPoint: 1,
			maxSpot: 0,
			maxShadowCasting: 0,
		},
	},
	environment: {
		kind: "cubemap-skybox",
		assetId: "cubemap_classic_sky",
		backgroundIntensity: 1,
		backgroundBlurriness: 0,
		environmentIntensity: 0.85,
		requiredForReadiness: true,
	},
} satisfies RenderProfileData;

export const prototypeRenderProfile = {
	id: "prototype_minimal_daylight",
	renderer: {
		clearColor: "#121917",
		clearAlpha: 1,
		antialias: true,
		maxPixelRatio: 2,
		fallbackMaterialColor: "#50a8ff",
	},
	lighting: {
		lights: [
			{
				kind: "ambient",
				color: "#d8f5e4",
				intensity: 0.85,
			},
			{
				kind: "directional",
				color: "#fff2d5",
				intensity: 2.1,
				position: [3, 6, 4],
			},
		],
		budget: {
			maxTotal: 4,
			maxAmbient: 1,
			maxDirectional: 2,
			maxPoint: 1,
			maxSpot: 0,
			maxShadowCasting: 0,
		},
	},
	environment: {
		kind: "cubemap-skybox",
		assetId: "cubemap_classic_sky",
		backgroundIntensity: 1,
		backgroundBlurriness: 0,
		environmentIntensity: 0.85,
		requiredForReadiness: true,
	},
} satisfies RenderProfileData;

export const mirandaDeckRenderProfile = {
	id: "miranda_deck_minimal",
	renderer: {
		clearColor: "#080b12",
		clearAlpha: 1,
		antialias: true,
		maxPixelRatio: 2,
		fallbackMaterialColor: "#9eb6d6",
	},
	lighting: {
		lights: [
			{
				kind: "ambient",
				color: "#9eb6d6",
				intensity: 0.38,
			},
			{
				kind: "directional",
				color: "#f4f7ff",
				intensity: 1.15,
				position: [11, 18, -9],
			},
			{
				kind: "directional",
				color: "#6f8fb8",
				intensity: 0.42,
				position: [-16, 8, 14],
			},
		],
		budget: {
			maxTotal: 8,
			maxAmbient: 1,
			maxDirectional: 2,
			maxPoint: 4,
			maxSpot: 2,
			maxShadowCasting: 1,
		},
	},
	environment: {
		kind: "cubemap-skybox",
		assetId: "cubemap_observatory_sky",
		backgroundIntensity: 0.82,
		backgroundBlurriness: 0.12,
		environmentIntensity: 0.55,
		requiredForReadiness: true,
	},
} satisfies RenderProfileData;

export const portalArenaRenderProfile = {
	id: "portal_arena_navigation_room",
	renderer: {
		clearColor: "#05070c",
		clearAlpha: 1,
		antialias: true,
		maxPixelRatio: 2,
		fallbackMaterialColor: "#223326",
	},
	lighting: {
		lights: [
			{
				kind: "ambient",
				color: "#8da4c7",
				intensity: 0.32,
			},
			{
				kind: "directional",
				color: "#b8c8ff",
				intensity: 0.88,
				position: [-7, 12, 5],
			},
			{
				kind: "directional",
				color: "#355d74",
				intensity: 0.28,
				position: [8, 4, -7],
			},
		],
		budget: {
			maxTotal: 6,
			maxAmbient: 1,
			maxDirectional: 2,
			maxPoint: 2,
			maxSpot: 2,
			maxShadowCasting: 1,
		},
	},
	environment: {
		kind: "equirectangular-environment",
		assetId: "texture_portal_arena_equirectangular_sky",
		backgroundIntensity: 1,
		backgroundBlurriness: 0,
		environmentIntensity: 0.8,
		requiredForReadiness: true,
	},
} satisfies RenderProfileData;

export const observatoryRenderProfile = {
	id: "observatory_moon_archive",
	renderer: {
		clearColor: "#020711",
		clearAlpha: 1,
		antialias: true,
		maxPixelRatio: 2,
		fallbackMaterialColor: "#273043",
	},
	lighting: {
		lights: [
			{
				kind: "ambient",
				color: "#c9d8f2",
				intensity: 0.08,
			},
		],
		budget: {
			maxTotal: 8,
			maxAmbient: 1,
			maxDirectional: 0,
			maxPoint: 6,
			maxSpot: 1,
			maxShadowCasting: 1,
		},
	},
	environment: {
		kind: "cubemap-skybox",
		assetId: "cubemap_observatory_sky",
		backgroundIntensity: 0.85,
		backgroundBlurriness: 0.12,
		environmentIntensity: 1.1,
		requiredForReadiness: true,
	},
	postProcessing: {
		enabled: false,
		quality: "off",
		effects: [],
	},
} satisfies RenderProfileData;

export const sciFiRoomRenderProfile = {
	id: "sci_fi_room_interior_courtyard",
	renderer: {
		clearColor: "#061018",
		clearAlpha: 1,
		antialias: true,
		maxPixelRatio: 2,
		fallbackMaterialColor: "#7ecfff",
	},
	lighting: {
		lights: [
			{
				kind: "ambient",
				color: "#bfe8ff",
				intensity: 0.42,
			},
			{
				kind: "directional",
				color: "#e8f7ff",
				intensity: 1.1,
				position: [10, 16, -8],
			},
			{
				kind: "directional",
				color: "#79d2ff",
				intensity: 0.36,
				position: [-12, 8, 14],
			},
		],
		budget: {
			maxTotal: 6,
			maxAmbient: 1,
			maxDirectional: 2,
			maxPoint: 2,
			maxSpot: 1,
			maxArea: 0,
			maxShadowCasting: 0,
		},
	},
	environment: {
		kind: "cubemap-skybox",
		assetId: "cubemap_observatory_sky",
		backgroundIntensity: 0.92,
		backgroundBlurriness: 0.08,
		environmentIntensity: 0.85,
		requiredForReadiness: true,
	},
	postProcessing: {
		enabled: false,
		quality: "off",
		effects: [],
	},
} satisfies RenderProfileData;

export const solitudeRenderProfile = {
	id: "solitude_abyssal_neon_ground",
	renderer: {
		clearColor: "#05020d",
		clearAlpha: 1,
		antialias: true,
		maxPixelRatio: 2,
		fallbackMaterialColor: "#58e6ff",
	},
	lighting: {
		lights: [
			{
				kind: "ambient",
				color: "#7e7bff",
				intensity: 0.46,
			},
			{
				kind: "directional",
				color: "#ff58d2",
				intensity: 0.96,
				position: [12, 18, -18],
				shadow: {
					enabled: true,
					mapSize: 1024,
					bias: -0.0001,
					normalBias: 0.02,
				},
			},
			{
				kind: "directional",
				color: "#4ce6ff",
				intensity: 0.34,
				position: [-18, 9, 14],
			},
		],
		budget: {
			maxTotal: 6,
			maxAmbient: 1,
			maxDirectional: 2,
			maxPoint: 2,
			maxSpot: 1,
			maxArea: 0,
			maxShadowCasting: 1,
		},
	},
	environment: {
		kind: "cubemap-skybox",
		assetId: "cubemap_observatory_sky",
		backgroundIntensity: 0.9,
		backgroundBlurriness: 0.18,
		environmentIntensity: 0.85,
		requiredForReadiness: true,
	},
	postProcessing: {
		enabled: false,
		quality: "off",
		effects: [],
	},
} satisfies RenderProfileData;

export const yggdrasilRenderProfile = {
	id: "yggdrasil_foundation_basin",
	renderer: {
		clearColor: "#07110c",
		clearAlpha: 1,
		antialias: true,
		maxPixelRatio: 2,
		fallbackMaterialColor: "#76d489",
	},
	lighting: {
		lights: [
			{
				kind: "ambient",
				color: "#b7f0c8",
				intensity: 0.4,
			},
			{
				kind: "directional",
				color: "#e7ffd8",
				intensity: 1.05,
				position: [10, 18, -12],
			},
			{
				kind: "directional",
				color: "#7fd7ff",
				intensity: 0.32,
				position: [-12, 8, 10],
			},
		],
		budget: {
			maxTotal: 9,
			maxAmbient: 1,
			maxDirectional: 2,
			maxPoint: 6,
			maxSpot: 1,
			maxArea: 0,
			maxShadowCasting: 0,
		},
	},
	environment: {
		kind: "cubemap-skybox",
		assetId: "cubemap_observatory_sky",
		backgroundIntensity: 0.88,
		backgroundBlurriness: 0.1,
		environmentIntensity: 0.8,
		requiredForReadiness: true,
	},
	postProcessing: {
		enabled: false,
		quality: "off",
		effects: [],
	},
} satisfies RenderProfileData;
