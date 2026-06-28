export const staticEnvironmentCollisionDefaults = {
	profile: "mobile",
	chunkSizeMeters: 64,
	sampleSpacingMeters: 4,
	walkableSlopeDegrees: 52,
	maxTrianglesPerChunk: 1024,
	maxTotalTriangles: 16384,
} as const;

export const staticEnvironmentCollisionProfiles = {
	mobile: {
		sampleSpacingMeters: 4,
		maxTrianglesPerChunk: 1024,
		maxTotalTriangles: 16384,
	},
	"mobile-dense": {
		sampleSpacingMeters: 2,
		maxTrianglesPerChunk: 4096,
		maxTotalTriangles: 16384,
	},
	desktop: {
		sampleSpacingMeters: 2,
		maxTrianglesPerChunk: 4096,
		maxTotalTriangles: 65536,
	},
} as const;
