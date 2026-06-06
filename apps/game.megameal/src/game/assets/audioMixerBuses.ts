import type { AudioMixerBusData } from "../../engine/modules/audio/index.js";

export const defaultAudioMixerBuses = [
	{
		id: "music",
		volume: 1,
	},
	{
		id: "sfx",
		volume: 1,
	},
	{
		id: "spatial",
		volume: 1,
	},
] satisfies readonly AudioMixerBusData[];
