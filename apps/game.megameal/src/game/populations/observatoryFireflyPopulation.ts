import {
	type FireflyPopulationDefinition,
	createFireflyPopulationInstances,
} from "./fireflyPopulation.js";

export const observatoryFireflyPopulation = {
	id: "observatory_firefly_population",
	prefabId: "observatory_firefly_marker",
	stableIdPrefix: "observatory:firefly",
	members: [
		{
			id: "archive",
			position: [-108.5, 4.4, 68],
			scale: [1.25, 1.25, 1.25],
			seed: 4107,
			phase: 0.18,
			flicker: {
				frequencyHz: 0.72,
				amplitude: 0.22,
			},
		},
		{
			id: "lantern",
			position: [72, 5.2, -92],
			scale: [1.1, 1.1, 1.1],
			seed: 6184,
			phase: 0.46,
			flicker: {
				frequencyHz: 0.64,
				amplitude: 0.18,
			},
		},
		{
			id: "tide",
			position: [132, 3.6, 104],
			seed: 8291,
			phase: 0.73,
			flicker: {
				frequencyHz: 0.58,
				amplitude: 0.2,
			},
		},
	],
} satisfies FireflyPopulationDefinition;

export const observatoryFireflyInstances = createFireflyPopulationInstances(
	observatoryFireflyPopulation,
);
