import type { RenderProfileData } from "../../engine/index.js";

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
		kind: "cubemap-skybox",
		assetId: "cubemap_classic_sky",
		backgroundIntensity: 1,
		backgroundBlurriness: 0,
		environmentIntensity: 0.9,
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
