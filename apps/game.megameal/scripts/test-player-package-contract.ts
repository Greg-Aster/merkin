import mirandaData from "../src/levels/miranda-deck/data.json";
import { mirandaDeckLevelPackage } from "../src/levels/miranda-deck/package.js";
import observatoryData from "../src/levels/observatory/data.json";
import { observatoryLevelPackage } from "../src/levels/observatory/package.js";
import {
	PLAYER_PREFAB_ID,
	PLAYER_REQUIRED_ASSET_IDS,
	PLAYER_STABLE_ID,
	playerAssets,
	playerPackageConfig,
	playerPrefab,
} from "../src/levels/player/index.js";
import portalArenaData from "../src/levels/portal-arena/data.json";
import { portalArenaLevelPackage } from "../src/levels/portal-arena/package.js";
import prototypeData from "../src/levels/prototype-arena/data.json";
import { prototypeArenaLevelPackage } from "../src/levels/prototype-arena/package.js";

const playerAssetIds = new Set<string>(PLAYER_REQUIRED_ASSET_IDS);
const playerAudioAssetIds = new Set<string>([
	"audio_player_jump",
	"audio_player_charge_release",
]);

type RawLevelPackageData = {
	readonly id: string;
	readonly assets: {
		readonly local: readonly { readonly id: string }[];
		readonly preloadGroups?: Record<string, readonly string[]>;
	};
	readonly prefabs: {
		readonly shared?: readonly string[];
		readonly local: readonly { readonly id: string }[];
	};
	readonly level: {
		readonly instances: readonly {
			readonly id: string;
			readonly prefabId: string;
			readonly stableId: string;
		}[];
	};
	readonly audio: {
		readonly eventMappings: readonly {
			readonly id: string;
			readonly soundId: string;
		}[];
	};
	readonly player?: {
		readonly light?: unknown;
	};
};

const packages = [
	{
		raw: prototypeData as RawLevelPackageData,
		resolved: prototypeArenaLevelPackage,
	},
	{
		raw: portalArenaData as RawLevelPackageData,
		resolved: portalArenaLevelPackage,
	},
	{
		raw: observatoryData as RawLevelPackageData,
		resolved: observatoryLevelPackage,
	},
	{
		raw: mirandaData as RawLevelPackageData,
		resolved: mirandaDeckLevelPackage,
	},
] as const;

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message?: string,
) {
	if (actual !== expected) {
		throw new Error(
			message ?? `Expected ${String(expected)}, received ${String(actual)}.`,
		);
	}
}

function assertIncludes(
	values: readonly string[] | undefined,
	expected: string,
	message?: string,
): void {
	if (!values?.includes(expected)) {
		throw new Error(
			message ??
				`Expected ${JSON.stringify(values)} to include ${JSON.stringify(expected)}.`,
		);
	}
}

function assertNotIncludes(
	values: readonly string[] | undefined,
	unexpected: string,
	message?: string,
): void {
	if (values?.includes(unexpected)) {
		throw new Error(
			message ??
				`Expected ${JSON.stringify(values)} not to include ${JSON.stringify(unexpected)}.`,
		);
	}
}

function assertDeepEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message?: string,
): void {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(
			message ??
				`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
		);
	}
}

function assertRawPackageHasNoCopiedPlayerData(
	data: RawLevelPackageData,
): void {
	for (const asset of data.assets.local) {
		if (playerAssetIds.has(asset.id)) {
			throw new Error(
				`Raw level package "${data.id}" must not define player asset "${asset.id}".`,
			);
		}
	}

	for (const [groupId, assetIds] of Object.entries(
		data.assets.preloadGroups ?? {},
	)) {
		for (const assetId of assetIds) {
			if (playerAssetIds.has(assetId)) {
				throw new Error(
					`Raw level package "${data.id}" preload group "${groupId}" must not copy player asset "${assetId}".`,
				);
			}
		}
	}

	for (const instance of data.level.instances) {
		if (
			instance.id === PLAYER_STABLE_ID ||
			instance.prefabId === PLAYER_PREFAB_ID ||
			instance.stableId === PLAYER_STABLE_ID
		) {
			throw new Error(
				`Raw level package "${data.id}" must configure the player through data.player, not level.instances.`,
			);
		}
	}

	assertNotIncludes(data.prefabs.shared, PLAYER_PREFAB_ID);

	for (const prefab of data.prefabs.local) {
		assertEqual(
			prefab.id === PLAYER_PREFAB_ID,
			false,
			`Raw level package "${data.id}" must not define the player prefab locally.`,
		);
	}

	for (const mapping of data.audio.eventMappings) {
		if (playerAudioAssetIds.has(mapping.soundId)) {
			throw new Error(
				`Raw level package "${data.id}" must not copy player audio mapping "${mapping.id}".`,
			);
		}
	}
}

assertDeepEqual(
	playerPrefab.components.Transform.position,
	playerPackageConfig.transform.position,
	"Player prefab transform position must come from src/levels/player/data.json.",
);
assertDeepEqual(
	playerPrefab.components.Transform.rotation,
	playerPackageConfig.transform.rotation,
	"Player prefab transform rotation must come from src/levels/player/data.json.",
);
assertDeepEqual(
	playerPrefab.components.Transform.scale,
	playerPackageConfig.transform.scale,
	"Player prefab transform scale must come from src/levels/player/data.json.",
);
assertEqual(
	playerPrefab.components.CharacterController.speed,
	playerPackageConfig.characterController.speed,
	"Player speed must come from src/levels/player/data.json.",
);
assertEqual(
	playerPrefab.components.CharacterController.jumpForce,
	playerPackageConfig.characterController.jumpForce,
	"Player jump force must come from src/levels/player/data.json.",
);
assertEqual(
	playerPrefab.components.FirstPersonController.fovDegrees,
	playerPackageConfig.firstPersonController.fovDegrees,
	"Player FOV must come from src/levels/player/data.json.",
);
assertEqual(
	playerPrefab.components.Collider.shape.radius,
	playerPackageConfig.collider.radius,
	"Player capsule radius must come from src/levels/player/data.json.",
);
assertEqual(
	playerPrefab.components.Health.max,
	playerPackageConfig.health.max,
	"Player max health must come from src/levels/player/data.json.",
);
assertIncludes(
	playerAssets.map((asset) => asset.url),
	playerPackageConfig.assets.meshUrl,
	"Player mesh asset URL must come from src/levels/player/data.json.",
);
assertIncludes(
	playerAssets.map((asset) => asset.url),
	playerPackageConfig.assets.chargeReleaseAudioUrl,
	"Player charge audio URL must come from src/levels/player/data.json.",
);

for (const entry of packages) {
	assertRawPackageHasNoCopiedPlayerData(entry.raw);

	const playerInstances = entry.resolved.level.instances.filter(
		(instance) => instance.stableId === PLAYER_STABLE_ID,
	);
	assertEqual(
		playerInstances.length,
		1,
		`Resolved level package "${entry.raw.id}" must contain exactly one composed player instance.`,
	);
	assertEqual(playerInstances[0]?.prefabId, PLAYER_PREFAB_ID);

	const playerPrefabs = entry.resolved.prefabs.filter(
		(prefab) => prefab.id === PLAYER_PREFAB_ID,
	);
	assertEqual(
		playerPrefabs.length,
		1,
		`Resolved level package "${entry.raw.id}" must contain exactly one imported player prefab.`,
	);

	for (const assetId of PLAYER_REQUIRED_ASSET_IDS) {
		assertIncludes(
			entry.resolved.assetManifest.assets.map((asset) => asset.id),
			assetId,
			`Resolved level package "${entry.raw.id}" must import player asset "${assetId}".`,
		);
		assertIncludes(
			entry.resolved.runtimeSceneManifest.readiness.requiredAssetIds,
			assetId,
			`Resolved level package "${entry.raw.id}" must require player asset "${assetId}".`,
		);
	}

	assertIncludes(
		entry.resolved.runtimeSceneManifest.readiness.requiredCollisionPrefabIds,
		PLAYER_PREFAB_ID,
		`Resolved level package "${entry.raw.id}" must require player collision prefab readiness.`,
	);

	if (entry.raw.player?.light) {
		assertIncludes(
			entry.resolved.runtimeSceneManifest.readiness.requiredLightStableIds,
			PLAYER_STABLE_ID,
			`Resolved level package "${entry.raw.id}" must require player light readiness when configured.`,
		);
	}
}
