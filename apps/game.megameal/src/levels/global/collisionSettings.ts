export const staticEnvironmentCollisionDefaults = {
	profile: "mobile",
	chunkSizeMeters: 64,
	sampleSpacingMeters: 4,
	walkableSlopeDegrees: 52,
} as const;

export const staticEnvironmentCollisionProfiles = {
	mobile: {
		sampleSpacingMeters: 4,
	},
	"mobile-dense": {
		sampleSpacingMeters: 2,
	},
	desktop: {
		sampleSpacingMeters: 2,
	},
} as const;
