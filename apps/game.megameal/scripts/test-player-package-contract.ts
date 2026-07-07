import { existsSync, readFileSync } from "node:fs";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import mirandaData from "../src/levels/miranda-deck/data.json";
import { mirandaDeckLevelPackage } from "../src/levels/miranda-deck/package.js";
import observatoryData from "../src/levels/observatory/data.json";
import { observatoryLevelPackage } from "../src/levels/observatory/package.js";
import {
	PLAYER_AVATAR_AINEKIO_SESAME_CHASSIS_MESH_ASSET_ID,
	PLAYER_AVATAR_AINEKIO_SESAME_MESH_ASSET_IDS,
	PLAYER_AVATAR_LIGHT_SPRITE_ASSET_ID,
	PLAYER_PREFAB_ID,
	PLAYER_REQUIRED_ASSET_IDS,
	PLAYER_STABLE_ID,
	playerAssets,
	playerAvatarAssets,
	playerAvatarPhysicsRigs,
	playerAvatars,
	playerPackageConfig,
	playerPrefab,
	selectedPlayerAvatar,
	selectedPlayerAvatarPhysicsRig,
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
const editorDevApiSource = readFileSync(
	new URL("./editor-dev-api.mjs", import.meta.url),
	"utf8",
);
const masterControlMapSource = readFileSync(
	new URL("../src/editor/MasterControlMap.svelte", import.meta.url),
	"utf8",
);
const gltfLoader = new GLTFLoader();

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
		readonly firstPersonController?: {
			readonly yawRadians?: number;
			readonly pitchRadians?: number;
		};
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

function assertSourceIncludes(
	source: string,
	expected: string,
	message?: string,
): void {
	if (!source.includes(expected)) {
		throw new Error(
			message ?? `Expected source to include ${JSON.stringify(expected)}.`,
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

async function materialColorsForPublicGlb(
	url: string | undefined,
): Promise<readonly string[]> {
	if (!url) {
		throw new Error("Expected a public GLB URL for material validation.");
	}

	const source = readFileSync(new URL(`../public${url}`, import.meta.url));
	const gltf = await gltfLoader.parseAsync(
		source.buffer.slice(
			source.byteOffset,
			source.byteOffset + source.byteLength,
		),
		"",
	);
	const colors = new Set<string>();

	gltf.scene.traverse((node) => {
		if (!("isMesh" in node) || node.isMesh !== true || !("material" in node)) {
			return;
		}

		const materials = Array.isArray(node.material)
			? node.material
			: [node.material];

		for (const material of materials) {
			if (material && "color" in material && material.color) {
				colors.add(material.color.getHexString());
			}
		}
	});

	return [...colors];
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
assertIncludes(
	playerAvatarAssets.map((asset) => asset.id),
	PLAYER_AVATAR_LIGHT_SPRITE_ASSET_ID,
	"Default player avatar sprite asset must come from src/levels/player/avatars.",
);
assertIncludes(
	playerAssets.map((asset) => asset.id),
	PLAYER_AVATAR_LIGHT_SPRITE_ASSET_ID,
	"Player package assets must include the selected avatar sprite asset.",
);
for (const meshAssetId of PLAYER_AVATAR_AINEKIO_SESAME_MESH_ASSET_IDS) {
	const meshAsset = playerAvatarAssets.find(
		(asset) => asset.id === meshAssetId,
	);
	assertIncludes(
		playerAvatarAssets.map((asset) => asset.id),
		meshAssetId,
		"Ainekio/Sesame robot mesh assets must come from src/levels/player/avatars.",
	);
	assertIncludes(
		playerAssets.map((asset) => asset.id),
		meshAssetId,
		"Player package assets must include Ainekio/Sesame robot mesh assets.",
	);
	assertIncludes(
		PLAYER_REQUIRED_ASSET_IDS,
		meshAssetId,
		"Player required assets must include selected Ainekio/Sesame robot mesh assets.",
	);
	assertEqual(
		meshAsset?.kind,
		"mesh",
		"Ainekio/Sesame robot avatar assets must be mesh assets.",
	);
	assertEqual(
		typeof meshAsset?.url === "string" && meshAsset.url.endsWith(".glb"),
		true,
		"Ainekio/Sesame robot avatar assets must point at runtime GLB files.",
	);
	assertEqual(
		existsSync(new URL(`../public${meshAsset?.url ?? ""}`, import.meta.url)),
		true,
		"Ainekio/Sesame robot avatar GLB files must exist under public assets.",
	);
}
const sesameChassisAsset = playerAvatarAssets.find(
	(asset) => asset.id === PLAYER_AVATAR_AINEKIO_SESAME_CHASSIS_MESH_ASSET_ID,
);
const sesameChassisMaterialColors = await materialColorsForPublicGlb(
	sesameChassisAsset?.url,
);
assertIncludes(
	sesameChassisMaterialColors,
	"ffb74d",
	"Ainekio/Sesame chassis GLB must preserve the simulator orange material.",
);
assertIncludes(
	sesameChassisMaterialColors,
	"979797",
	"Ainekio/Sesame chassis GLB must preserve the simulator gray frame material.",
);
assertIncludes(
	sesameChassisMaterialColors,
	"515151",
	"Ainekio/Sesame chassis GLB must preserve the simulator dark OLED material.",
);
assertIncludes(
	PLAYER_REQUIRED_ASSET_IDS,
	PLAYER_AVATAR_LIGHT_SPRITE_ASSET_ID,
	"Player required assets must include the selected avatar sprite asset.",
);
assertEqual(
	selectedPlayerAvatar.id,
	"player_avatar_ainekio_sesame",
	"Selected player avatar must come from src/levels/player/avatars.",
);
assertEqual(
	selectedPlayerAvatar.renderable.kind ?? "mesh",
	"mesh",
	"Selected Ainekio/Sesame avatar must use robot mesh renderable data.",
);
if (selectedPlayerAvatar.renderable.kind !== "sprite") {
	assertEqual(
		selectedPlayerAvatar.renderable.meshId,
		PLAYER_AVATAR_AINEKIO_SESAME_CHASSIS_MESH_ASSET_ID,
		"Selected Ainekio/Sesame avatar preview must use the robot chassis mesh.",
	);
	assertEqual(
		selectedPlayerAvatar.renderable.meshId === "mesh_player",
		false,
		"Selected Ainekio/Sesame avatar must not fall back to the generic player mesh.",
	);
}
const ballOfLightAvatar = playerAvatars.find(
	(avatar) => avatar.id === "player_avatar_light",
);
assertEqual(
	ballOfLightAvatar?.renderable.kind,
	"sprite",
	"Ball of Light avatar must remain a sprite-backed editable avatar option.",
);
if (ballOfLightAvatar?.renderable.kind === "sprite") {
	assertEqual(
		ballOfLightAvatar.renderable.spriteId,
		PLAYER_AVATAR_LIGHT_SPRITE_ASSET_ID,
		"Ball of Light avatar must use the player-owned light sprite asset.",
	);
	assertEqual(
		ballOfLightAvatar.renderable.spriteId.includes("npc"),
		false,
		"Ball of Light avatar must not point at NPC-owned sprite assets.",
	);
}
assertEqual(
	playerAvatars.some((avatar) => avatar.id === selectedPlayerAvatar.id),
	true,
	"Selected player avatar must exist in the player avatar catalog.",
);
assertEqual(
	selectedPlayerAvatarPhysicsRig?.id,
	"ainekio-sesame",
	"Selected Ainekio/Sesame avatar must activate the Ainekio/Sesame physics rig.",
);
assertEqual(
	playerAvatars.some(
		(avatar) =>
			avatar.id === "player_avatar_ainekio_sesame" &&
			avatar.physicsRig?.rigId === "ainekio-sesame",
	),
	true,
	"Ainekio/Sesame physics rig avatar must live in the player avatar catalog.",
);
assertEqual(
	playerAvatarPhysicsRigs.some((rig) => rig.id === "ainekio-sesame"),
	true,
	"Ainekio/Sesame physics rig definition must be exported from the player avatar package.",
);
assertSourceIncludes(
	editorDevApiSource,
	"/__megameal-editor-api/player-avatar-package",
	"Editor dev API must expose a dedicated player avatar package endpoint.",
);
assertSourceIncludes(
	editorDevApiSource,
	"../src/levels/player/avatars/data.json",
	"Editor avatar endpoint must write the player avatar package file, not src/levels/player/data.json.",
);
assertSourceIncludes(
	editorDevApiSource,
	"validatePlayerAvatarPackageConfig",
	"Editor avatar endpoint must validate selected avatar data before saving.",
);
assertSourceIncludes(
	masterControlMapSource,
	"PLAYER_AVATAR_PACKAGE_API_PATH",
	"Master Control Player Package panel must load the player avatar package endpoint.",
);
assertSourceIncludes(
	masterControlMapSource,
	"updateSelectedPlayerAvatar",
	"Master Control Player Package panel must expose selected avatar updates.",
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
	if (entry.raw.player?.firstPersonController) {
		const firstPersonController = playerInstances[0]?.components
			?.FirstPersonController as
			| { readonly yawRadians?: number; readonly pitchRadians?: number }
			| undefined;
		assertEqual(
			firstPersonController?.yawRadians,
			entry.raw.player.firstPersonController.yawRadians,
			`Resolved level package "${entry.raw.id}" must compose level-owned player yaw into FirstPersonController.`,
		);
		assertEqual(
			firstPersonController?.pitchRadians,
			entry.raw.player.firstPersonController.pitchRadians,
			`Resolved level package "${entry.raw.id}" must compose level-owned player pitch into FirstPersonController.`,
		);
	}

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
