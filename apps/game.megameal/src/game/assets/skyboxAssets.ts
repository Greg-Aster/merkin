import type { AssetManifestEntry } from "../../engine/modules/assets/index.js";

const skyboxFaces = {
	px: "px.webp",
	nx: "nx.webp",
	py: "py.webp",
	ny: "ny.webp",
	pz: "pz.webp",
	nz: "nz.webp",
} as const;

export const cubemapClassicSky = {
	id: "cubemap_classic_sky",
	kind: "cubemap",
	url: "/assets/skyboxes/",
	faces: skyboxFaces,
	colorSpace: "srgb",
	tags: ["skybox", "environment"],
} satisfies AssetManifestEntry;

export const cubemapObservatorySky = {
	id: "cubemap_observatory_sky",
	kind: "cubemap",
	url: "/assets/hdri/skywip4-cubemap/",
	faces: skyboxFaces,
	colorSpace: "srgb",
	tags: ["skybox", "environment"],
} satisfies AssetManifestEntry;

export const sampleEquirectangularSky = {
	id: "texture_sample_equirectangular_sky",
	kind: "texture",
	url: "/assets/environment/samples/sample-equirectangular-sky.png",
	projection: "equirectangular",
	colorSpace: "srgb",
	tags: ["skybox", "environment", "sample"],
} satisfies AssetManifestEntry;

export const sampleVideoSky = {
	id: "video_sample_equirectangular_sky",
	kind: "video",
	url: "/assets/environment/samples/sample-video-sky.webm",
	video: {
		loop: true,
		muted: true,
		playsInline: true,
		preload: "auto",
	},
	tags: ["skybox", "environment", "sample", "video"],
} satisfies AssetManifestEntry;
