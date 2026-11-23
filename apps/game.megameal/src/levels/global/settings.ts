export const levelPackageSettings = {
	packageId: "megameal",
	defaultRuntimeSceneId: "observatory_runtime",
	hudVisible: false,
	audioMasterVolume: 0.6,
	devBridge: {
		enabled: true,
		broadcastLocation: "megameal:game-dev-bridge:v1",
		channels: {
			text: true,
			location: true,
			state: true,
			snapshots: false,
			levelMap: false,
		},
	},
} as const;
