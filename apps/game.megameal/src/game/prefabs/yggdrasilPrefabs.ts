import { createPrimitivePrefabs } from "../content/primitiveSceneContent.js";
import {
	yggdrasilPrimitiveContentOptions,
	yggdrasilPrimitiveNodes,
} from "../content/yggdrasilPrimitiveParity.js";
import { playerPrefab } from "./defaultPrefabs.js";
import type { PrefabDefinition } from "./index.js";
import { portalGatePrefab } from "./navigationPrefabs.js";
import { terrainChunkCellPrefab } from "./terrainPrefabs.js";
import { oceanWaterSurfacePrefab } from "./waterPrefabs.js";

export const yggdrasilPrimitivePrefabs = createPrimitivePrefabs(
	yggdrasilPrimitiveNodes,
	yggdrasilPrimitiveContentOptions,
);

export const yggdrasilAmbientEmitterPrefab = {
	id: "yggdrasil_ambient_emitter",
	assetIds: ["audio_ambient_whistling_dreams"],
	tags: ["world", "audio", "yggdrasil", "ambient"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		SoundEmitter: {
			soundId: "audio_ambient_whistling_dreams",
			volume: 0.18,
			busId: "spatial",
			loop: true,
			autoplay: true,
			refDistance: 18,
			maxDistance: 180,
			rolloffFactor: 0.85,
			distanceModel: "inverse",
		},
	},
} satisfies PrefabDefinition;

export const yggdrasilPrefabs = [
	playerPrefab,
	portalGatePrefab,
	terrainChunkCellPrefab,
	oceanWaterSurfacePrefab,
	...yggdrasilPrimitivePrefabs,
	yggdrasilAmbientEmitterPrefab,
] as const;
