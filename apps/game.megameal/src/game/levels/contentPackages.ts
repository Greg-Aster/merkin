export type LevelContentPackId = "engine-starter" | "merkin";

export type LevelContentPackageMigrationStatus =
	| "packaged-owner"
	| "mixed-owner"
	| "isolated-owner";

export type LevelContentPackageOwnerModule = {
	readonly ownerName: string;
	readonly ownerExport: string;
	readonly targetFile: string;
	readonly packageTargetFile: string;
	readonly migrationStatus: LevelContentPackageMigrationStatus;
};

export type LevelContentPackageGeneratedOwnerKind =
	| "collision-runtime"
	| "published-transforms"
	| "terrain-runtime";

export type LevelContentPackageGeneratedOwnerModule =
	LevelContentPackageOwnerModule & {
		readonly generatedOwnerKind: LevelContentPackageGeneratedOwnerKind;
	};

export type LevelContentPackage = {
	readonly schemaVersion: 1;
	readonly packId: LevelContentPackId;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly packageRoot: string;
	readonly targetPackageRoot: string;
	readonly canonicalRuntimeSource: "RuntimeSceneManifest";
	readonly removableWithPack: boolean;
	readonly packageStatus: LevelContentPackageMigrationStatus;
	readonly owners: {
		readonly runtimeManifest: LevelContentPackageOwnerModule;
		readonly level: LevelContentPackageOwnerModule;
		readonly prefabs: LevelContentPackageOwnerModule;
		readonly assets: LevelContentPackageOwnerModule;
		readonly renderProfile: LevelContentPackageOwnerModule;
		readonly audioContent?: LevelContentPackageOwnerModule;
		readonly terrainRuntime?: LevelContentPackageOwnerModule;
		readonly collisionDraft?: LevelContentPackageOwnerModule;
		readonly lightDraft?: LevelContentPackageOwnerModule;
		readonly primitiveContent?: readonly LevelContentPackageOwnerModule[];
		readonly populations?: readonly LevelContentPackageOwnerModule[];
		readonly generatedModules: readonly LevelContentPackageGeneratedOwnerModule[];
		readonly publicAssetRoots: readonly string[];
	};
	readonly sharedDependencies: readonly string[];
	readonly migrationNotes: readonly string[];
};

const publishedTransformsOwner = generatedOwner({
	ownerName: "Generated published level transform overrides",
	ownerExport: "publishedLevelInstanceTransformOverrides",
	targetFile: "src/game/generated/publishedLevelTransforms.ts",
	packageTargetFile: "src/game/generated/publishedLevelTransforms.ts",
	generatedOwnerKind: "published-transforms",
	migrationStatus: "packaged-owner",
});

const terrainRuntimeOwner = generatedOwner({
	ownerName: "Generated terrain runtime module",
	ownerExport: "terrainRuntimeModule",
	targetFile: "src/game/generated/terrainRuntime.ts",
	packageTargetFile: "src/game/generated/terrainRuntime.ts",
	generatedOwnerKind: "terrain-runtime",
	migrationStatus: "packaged-owner",
});

export const levelContentPackages = [
	packageRecord({
		packId: "engine-starter",
		runtimeSceneId: "starter_runtime",
		levelId: "starter_level",
		packageRoot: "src/game/levels/engine-starter/starter_runtime",
		targetPackageRoot: "src/game/levels/engine-starter/starter_runtime",
		removableWithPack: false,
		packageStatus: "mixed-owner",
		runtimeManifest: owner(
			"Starter runtime scene manifest",
			"starterRuntimeSceneManifest",
			"src/game/levels/runtimeSceneManifests.ts",
			"src/game/levels/engine-starter/starter_runtime/manifest.ts",
			"mixed-owner",
		),
		level: owner(
			"Starter level",
			"starterLevel",
			"src/game/levels/defaultLevels.ts",
			"src/game/levels/engine-starter/starter_runtime/level.ts",
			"mixed-owner",
		),
		prefabs: owner(
			"Starter prefab catalog",
			"starterPrefabs",
			"src/game/prefabs/defaultPrefabs.ts",
			"src/game/levels/engine-starter/starter_runtime/prefabs.ts",
			"mixed-owner",
		),
		assets: owner(
			"Starter asset manifest",
			"starterAssetManifest",
			"src/game/assets/defaultAssets.ts",
			"src/game/levels/engine-starter/starter_runtime/assets.ts",
			"mixed-owner",
		),
		renderProfile: owner(
			"Starter render profile",
			"starterRenderProfile",
			"src/game/levels/renderProfiles.ts",
			"src/game/levels/engine-starter/starter_runtime/renderProfile.ts",
			"mixed-owner",
		),
		generatedModules: [publishedTransformsOwner],
		sharedDependencies: ["player prefab", "built-in starter meshes/materials"],
		migrationNotes: [
			"Clean-install default; keep outside removable Merkin content.",
			"Mixed default owner files must be split before this package is physically consolidated.",
		],
	}),
	packageRecord({
		packId: "merkin",
		runtimeSceneId: "portal_arena_runtime",
		levelId: "portal_arena",
		packageRoot: "src/game/levels/merkin/portal_arena_runtime",
		targetPackageRoot: "src/game/levels/merkin/portal_arena_runtime",
		removableWithPack: true,
		packageStatus: "isolated-owner",
		runtimeManifest: owner(
			"Portal arena runtime scene manifest",
			"portalArenaRuntimeSceneManifest",
			"src/game/levels/runtimeSceneManifests.ts",
			"src/game/levels/merkin/portal_arena_runtime/manifest.ts",
			"mixed-owner",
		),
		level: owner(
			"Portal arena level",
			"portalArenaLevel",
			"src/game/levels/portalArenaLevel.ts",
			"src/game/levels/merkin/portal_arena_runtime/level.ts",
			"isolated-owner",
		),
		prefabs: owner(
			"Portal arena prefab catalog",
			"portalArenaPrefabs",
			"src/game/prefabs/portalPrefabs.ts",
			"src/game/levels/merkin/portal_arena_runtime/prefabs.ts",
			"isolated-owner",
		),
		assets: owner(
			"Portal arena asset manifest",
			"portalArenaAssetManifest",
			"src/game/assets/portalArenaAssets.ts",
			"src/game/levels/merkin/portal_arena_runtime/assets.ts",
			"isolated-owner",
		),
		renderProfile: owner(
			"Portal arena render profile",
			"portalArenaRenderProfile",
			"src/game/levels/renderProfiles.ts",
			"src/game/levels/merkin/portal_arena_runtime/renderProfile.ts",
			"mixed-owner",
		),
		audioContent: owner(
			"Portal arena audio content manifest",
			"portalArenaAudioContentManifest",
			"src/game/assets/portalArenaAssets.ts",
			"src/game/levels/merkin/portal_arena_runtime/audio.ts",
			"isolated-owner",
		),
		terrainRuntime: owner(
			"Portal arena terrain runtime data",
			"portal_arena_runtime",
			"src/game/terrain/terrainRuntimeCatalog.ts",
			"src/game/levels/merkin/portal_arena_runtime/terrain.ts",
			"mixed-owner",
		),
		generatedModules: [terrainRuntimeOwner, publishedTransformsOwner],
		publicAssetRoots: [
			"public/assets/environment/portal-arena",
			"public/assets/game/terrain",
		],
		sharedDependencies: ["shared portal assets", "shared player prefab"],
		migrationNotes: [
			"Merkin hub scene; removal must also remove or retarget portal links from other Merkin scenes.",
		],
	}),
	packageRecord({
		packId: "merkin",
		runtimeSceneId: "prototype_arena_runtime",
		levelId: "prototype_arena",
		packageRoot: "src/game/levels/merkin/prototype_arena_runtime",
		targetPackageRoot: "src/game/levels/merkin/prototype_arena_runtime",
		removableWithPack: true,
		packageStatus: "mixed-owner",
		runtimeManifest: owner(
			"Prototype arena runtime scene manifest",
			"prototypeRuntimeSceneManifest",
			"src/game/levels/runtimeSceneManifests.ts",
			"src/game/levels/merkin/prototype_arena_runtime/manifest.ts",
			"mixed-owner",
		),
		level: owner(
			"Prototype arena level",
			"prototypeLevel",
			"src/game/levels/defaultLevels.ts",
			"src/game/levels/merkin/prototype_arena_runtime/level.ts",
			"mixed-owner",
		),
		prefabs: owner(
			"Prototype prefab catalog",
			"prototypePrefabs",
			"src/game/prefabs/defaultPrefabs.ts",
			"src/game/levels/merkin/prototype_arena_runtime/prefabs.ts",
			"mixed-owner",
		),
		assets: owner(
			"Prototype asset manifest",
			"prototypeAssetManifest",
			"src/game/assets/defaultAssets.ts",
			"src/game/levels/merkin/prototype_arena_runtime/assets.ts",
			"mixed-owner",
		),
		renderProfile: owner(
			"Prototype render profile",
			"prototypeRenderProfile",
			"src/game/levels/renderProfiles.ts",
			"src/game/levels/merkin/prototype_arena_runtime/renderProfile.ts",
			"mixed-owner",
		),
		audioContent: owner(
			"Prototype arena audio content manifest",
			"prototypeAudioContentManifest",
			"src/game/assets/defaultAssets.ts",
			"src/game/levels/merkin/prototype_arena_runtime/audio.ts",
			"mixed-owner",
		),
		terrainRuntime: owner(
			"Prototype arena terrain runtime data",
			"prototype_arena_runtime",
			"src/game/terrain/terrainRuntimeCatalog.ts",
			"src/game/levels/merkin/prototype_arena_runtime/terrain.ts",
			"mixed-owner",
		),
		generatedModules: [terrainRuntimeOwner, publishedTransformsOwner],
		sharedDependencies: ["shared player prefab", "starter primitive assets"],
		migrationNotes: [
			"Mixed with starter and Miranda default owner files; split after package registry validation is in place.",
		],
	}),
	packageRecord({
		packId: "merkin",
		runtimeSceneId: "miranda_deck_runtime",
		levelId: "miranda_deck",
		packageRoot: "src/game/levels/merkin/miranda_deck_runtime",
		targetPackageRoot: "src/game/levels/merkin/miranda_deck_runtime",
		removableWithPack: true,
		packageStatus: "mixed-owner",
		runtimeManifest: owner(
			"Miranda deck runtime scene manifest",
			"mirandaDeckRuntimeSceneManifest",
			"src/game/levels/runtimeSceneManifests.ts",
			"src/game/levels/merkin/miranda_deck_runtime/manifest.ts",
			"mixed-owner",
		),
		level: owner(
			"Miranda deck level",
			"mirandaDeckLevel",
			"src/game/levels/defaultLevels.ts",
			"src/game/levels/merkin/miranda_deck_runtime/level.ts",
			"mixed-owner",
		),
		prefabs: owner(
			"Miranda deck prefab catalog",
			"mirandaDeckPrefabs",
			"src/game/prefabs/defaultPrefabs.ts",
			"src/game/levels/merkin/miranda_deck_runtime/prefabs.ts",
			"mixed-owner",
		),
		assets: owner(
			"Miranda deck asset manifest",
			"mirandaDeckAssetManifest",
			"src/game/assets/defaultAssets.ts",
			"src/game/levels/merkin/miranda_deck_runtime/assets.ts",
			"mixed-owner",
		),
		renderProfile: owner(
			"Miranda deck render profile",
			"mirandaDeckRenderProfile",
			"src/game/levels/renderProfiles.ts",
			"src/game/levels/merkin/miranda_deck_runtime/renderProfile.ts",
			"mixed-owner",
		),
		audioContent: owner(
			"Miranda deck audio content manifest",
			"mirandaDeckAudioContentManifest",
			"src/game/assets/defaultAssets.ts",
			"src/game/levels/merkin/miranda_deck_runtime/audio.ts",
			"mixed-owner",
		),
		terrainRuntime: owner(
			"Miranda deck terrain runtime data",
			"miranda_deck_runtime",
			"src/game/terrain/terrainRuntimeCatalog.ts",
			"src/game/levels/merkin/miranda_deck_runtime/terrain.ts",
			"mixed-owner",
		),
		collisionDraft: owner(
			"Miranda collision cook draft",
			"mirandaCollisionCookDraft",
			"src/game/editor/collisionDrafts/mirandaCollisionDraft.ts",
			"src/game/levels/merkin/miranda_deck_runtime/collisionDraft.ts",
			"isolated-owner",
		),
		lightDraft: owner(
			"Miranda light authoring draft",
			"mirandaLightAuthoringDraft",
			"src/game/editor/lightDrafts/mirandaLightDraft.ts",
			"src/game/levels/merkin/miranda_deck_runtime/lightDraft.ts",
			"isolated-owner",
		),
		generatedModules: [terrainRuntimeOwner, publishedTransformsOwner],
		sharedDependencies: ["shared portal assets", "primitive scene helpers"],
		migrationNotes: [
			"Mixed default owner files plus draft owners; do not physically move until tests cover draft registry relocation.",
		],
	}),
	packageRecord({
		packId: "merkin",
		runtimeSceneId: "observatory_runtime",
		levelId: "observatory",
		packageRoot: "src/game/levels/merkin/observatory_runtime",
		targetPackageRoot: "src/game/levels/merkin/observatory_runtime",
		removableWithPack: true,
		packageStatus: "isolated-owner",
		runtimeManifest: owner(
			"Observatory runtime scene manifest",
			"observatoryRuntimeSceneManifest",
			"src/game/levels/runtimeSceneManifests.ts",
			"src/game/levels/merkin/observatory_runtime/manifest.ts",
			"mixed-owner",
		),
		level: owner(
			"Observatory level",
			"observatoryLevel",
			"src/game/levels/observatoryLevel.ts",
			"src/game/levels/merkin/observatory_runtime/level.ts",
			"isolated-owner",
		),
		prefabs: owner(
			"Observatory prefab catalog",
			"observatoryPrefabs",
			"src/game/prefabs/observatoryPrefabs.ts",
			"src/game/levels/merkin/observatory_runtime/prefabs.ts",
			"isolated-owner",
		),
		assets: owner(
			"Observatory asset manifest",
			"observatoryAssetManifest",
			"src/game/assets/observatoryAssets.ts",
			"src/game/levels/merkin/observatory_runtime/assets.ts",
			"isolated-owner",
		),
		renderProfile: owner(
			"Observatory render profile",
			"observatoryRenderProfile",
			"src/game/levels/renderProfiles.ts",
			"src/game/levels/merkin/observatory_runtime/renderProfile.ts",
			"mixed-owner",
		),
		audioContent: owner(
			"Observatory audio content manifest",
			"observatoryAudioContentManifest",
			"src/game/assets/observatoryAssets.ts",
			"src/game/levels/merkin/observatory_runtime/audio.ts",
			"isolated-owner",
		),
		terrainRuntime: owner(
			"Observatory terrain runtime data",
			"observatory_runtime",
			"src/game/terrain/terrainRuntimeCatalog.ts",
			"src/game/levels/merkin/observatory_runtime/terrain.ts",
			"mixed-owner",
		),
		collisionDraft: owner(
			"Observatory collision cook draft",
			"observatoryCollisionCookDraft",
			"src/game/editor/collisionDrafts/observatoryCollisionDraft.ts",
			"src/game/levels/merkin/observatory_runtime/collisionDraft.ts",
			"isolated-owner",
		),
		populations: [
			owner(
				"Observatory firefly population",
				"observatoryFireflyPopulation",
				"src/game/populations/observatoryFireflyPopulation.ts",
				"src/game/levels/merkin/observatory_runtime/populations.ts",
				"isolated-owner",
			),
		],
		generatedModules: [
			terrainRuntimeOwner,
			publishedTransformsOwner,
			generatedOwner({
				ownerName: "Observatory generated collision runtime",
				ownerExport: "observatoryCollisionRuntime",
				targetFile: "src/game/generated/observatoryCollisionRuntime.ts",
				packageTargetFile:
					"src/game/levels/merkin/observatory_runtime/generatedCollision.ts",
				generatedOwnerKind: "collision-runtime",
				migrationStatus: "isolated-owner",
			}),
		],
		publicAssetRoots: [
			"public/assets/game/observatory",
			"public/assets/generated/game/observatory",
		],
		sharedDependencies: ["shared water prefabs/assets", "shared portal assets"],
		migrationNotes: [
			"Generated collision runtime remains a shared generated module until the terrain runtime fully replaces legacy collision data.",
		],
	}),
	packageRecord({
		packId: "merkin",
		runtimeSceneId: "sci_fi_room_runtime",
		levelId: "sci_fi_room",
		packageRoot: "src/game/levels/merkin/sci_fi_room_runtime",
		targetPackageRoot: "src/game/levels/merkin/sci_fi_room_runtime",
		removableWithPack: true,
		packageStatus: "isolated-owner",
		runtimeManifest: owner(
			"Sci Fi Room runtime scene manifest",
			"sciFiRoomRuntimeSceneManifest",
			"src/game/levels/runtimeSceneManifests.ts",
			"src/game/levels/merkin/sci_fi_room_runtime/manifest.ts",
			"mixed-owner",
		),
		level: owner(
			"Sci Fi Room level",
			"sciFiRoomLevel",
			"src/game/levels/sciFiRoomLevel.ts",
			"src/game/levels/merkin/sci_fi_room_runtime/level.ts",
			"isolated-owner",
		),
		prefabs: owner(
			"Sci Fi Room prefab catalog",
			"sciFiRoomPrefabs",
			"src/game/prefabs/sciFiRoomPrefabs.ts",
			"src/game/levels/merkin/sci_fi_room_runtime/prefabs.ts",
			"isolated-owner",
		),
		assets: owner(
			"Sci Fi Room asset manifest",
			"sciFiRoomAssetManifest",
			"src/game/assets/sciFiRoomAssets.ts",
			"src/game/levels/merkin/sci_fi_room_runtime/assets.ts",
			"isolated-owner",
		),
		renderProfile: owner(
			"Sci Fi Room render profile",
			"sciFiRoomRenderProfile",
			"src/game/levels/renderProfiles.ts",
			"src/game/levels/merkin/sci_fi_room_runtime/renderProfile.ts",
			"mixed-owner",
		),
		audioContent: owner(
			"Sci Fi Room audio content manifest",
			"sciFiRoomAudioContentManifest",
			"src/game/assets/sciFiRoomAssets.ts",
			"src/game/levels/merkin/sci_fi_room_runtime/audio.ts",
			"isolated-owner",
		),
		terrainRuntime: owner(
			"Sci Fi Room terrain runtime data",
			"sci_fi_room_runtime",
			"src/game/terrain/terrainRuntimeCatalog.ts",
			"src/game/levels/merkin/sci_fi_room_runtime/terrain.ts",
			"mixed-owner",
		),
		generatedModules: [terrainRuntimeOwner, publishedTransformsOwner],
		sharedDependencies: ["shared portal assets", "shared player prefab"],
		migrationNotes: [
			"Already isolated across level/prefab/asset modules; manifest, render profile, and terrain catalog still need package extraction.",
		],
	}),
	packageRecord({
		packId: "merkin",
		runtimeSceneId: "solitude_runtime",
		levelId: "solitude",
		packageRoot: "src/game/levels/merkin/solitude_runtime",
		targetPackageRoot: "src/game/levels/merkin/solitude_runtime",
		removableWithPack: true,
		packageStatus: "isolated-owner",
		runtimeManifest: owner(
			"Solitude runtime scene manifest",
			"solitudeRuntimeSceneManifest",
			"src/game/levels/runtimeSceneManifests.ts",
			"src/game/levels/merkin/solitude_runtime/manifest.ts",
			"mixed-owner",
		),
		level: owner(
			"Solitude level",
			"solitudeLevel",
			"src/game/levels/solitudeLevel.ts",
			"src/game/levels/merkin/solitude_runtime/level.ts",
			"isolated-owner",
		),
		prefabs: owner(
			"Solitude prefab catalog",
			"solitudePrefabs",
			"src/game/prefabs/solitudePrefabs.ts",
			"src/game/levels/merkin/solitude_runtime/prefabs.ts",
			"isolated-owner",
		),
		assets: owner(
			"Solitude asset manifest",
			"solitudeAssetManifest",
			"src/game/assets/solitudeAssets.ts",
			"src/game/levels/merkin/solitude_runtime/assets.ts",
			"isolated-owner",
		),
		renderProfile: owner(
			"Solitude render profile",
			"solitudeRenderProfile",
			"src/game/levels/renderProfiles.ts",
			"src/game/levels/merkin/solitude_runtime/renderProfile.ts",
			"mixed-owner",
		),
		audioContent: owner(
			"Solitude audio content manifest",
			"solitudeAudioContentManifest",
			"src/game/assets/solitudeAssets.ts",
			"src/game/levels/merkin/solitude_runtime/audio.ts",
			"isolated-owner",
		),
		terrainRuntime: owner(
			"Solitude terrain runtime data",
			"solitude_runtime",
			"src/game/terrain/terrainRuntimeCatalog.ts",
			"src/game/levels/merkin/solitude_runtime/terrain.ts",
			"mixed-owner",
		),
		generatedModules: [terrainRuntimeOwner, publishedTransformsOwner],
		sharedDependencies: ["shared portal assets", "shared player prefab"],
		migrationNotes: [
			"Already isolated across level/prefab/asset modules; expected-import constants move with level.ts.",
		],
	}),
	packageRecord({
		packId: "merkin",
		runtimeSceneId: "yggdrasil_runtime",
		levelId: "yggdrasil",
		packageRoot: "src/game/levels/merkin/yggdrasil_runtime",
		targetPackageRoot: "src/game/levels/merkin/yggdrasil_runtime",
		removableWithPack: true,
		packageStatus: "isolated-owner",
		runtimeManifest: owner(
			"Yggdrasil runtime scene manifest",
			"yggdrasilRuntimeSceneManifest",
			"src/game/levels/runtimeSceneManifests.ts",
			"src/game/levels/merkin/yggdrasil_runtime/manifest.ts",
			"mixed-owner",
		),
		level: owner(
			"Yggdrasil level",
			"yggdrasilLevel",
			"src/game/levels/yggdrasilLevel.ts",
			"src/game/levels/merkin/yggdrasil_runtime/level.ts",
			"isolated-owner",
		),
		prefabs: owner(
			"Yggdrasil prefab catalog",
			"yggdrasilPrefabs",
			"src/game/prefabs/yggdrasilPrefabs.ts",
			"src/game/levels/merkin/yggdrasil_runtime/prefabs.ts",
			"isolated-owner",
		),
		assets: owner(
			"Yggdrasil asset manifest",
			"yggdrasilAssetManifest",
			"src/game/assets/yggdrasilAssets.ts",
			"src/game/levels/merkin/yggdrasil_runtime/assets.ts",
			"isolated-owner",
		),
		renderProfile: owner(
			"Yggdrasil render profile",
			"yggdrasilRenderProfile",
			"src/game/levels/renderProfiles.ts",
			"src/game/levels/merkin/yggdrasil_runtime/renderProfile.ts",
			"mixed-owner",
		),
		audioContent: owner(
			"Yggdrasil audio content manifest",
			"yggdrasilAudioContentManifest",
			"src/game/assets/yggdrasilAssets.ts",
			"src/game/levels/merkin/yggdrasil_runtime/audio.ts",
			"isolated-owner",
		),
		terrainRuntime: owner(
			"Yggdrasil terrain runtime data",
			"yggdrasil_runtime",
			"src/game/terrain/terrainRuntimeCatalog.ts",
			"src/game/levels/merkin/yggdrasil_runtime/terrain.ts",
			"mixed-owner",
		),
		primitiveContent: [
			owner(
				"Yggdrasil primitive parity source",
				"yggdrasilPrimitiveNodes",
				"src/game/content/yggdrasilPrimitiveParity.ts",
				"src/game/levels/merkin/yggdrasil_runtime/primitiveContent.ts",
				"isolated-owner",
			),
			owner(
				"Yggdrasil primitive parity generated data",
				"yggdrasilPrimitiveParityGenerated",
				"src/game/content/yggdrasilPrimitiveParity.generated.json",
				"src/game/levels/merkin/yggdrasil_runtime/primitiveParity.generated.json",
				"isolated-owner",
			),
		],
		generatedModules: [terrainRuntimeOwner, publishedTransformsOwner],
		sharedDependencies: ["primitive scene helpers", "shared portal assets"],
		migrationNotes: [
			"Primitive generated JSON is package-owned content data; keep it out of TypeScript source dumps.",
		],
	}),
] as const satisfies readonly LevelContentPackage[];

export function listLevelContentPackages(): readonly LevelContentPackage[] {
	return levelContentPackages;
}

export function listLevelContentPackagesForPack(
	packId: LevelContentPackId,
): readonly LevelContentPackage[] {
	return levelContentPackages.filter((contentPackage) => contentPackage.packId === packId);
}

export function getLevelContentPackage(
	runtimeSceneId: string,
): LevelContentPackage | undefined {
	return levelContentPackages.find(
		(contentPackage) => contentPackage.runtimeSceneId === runtimeSceneId,
	);
}

function packageRecord(
	options: Omit<
		LevelContentPackage,
		"schemaVersion" | "canonicalRuntimeSource" | "owners"
	> & {
		readonly runtimeManifest: LevelContentPackageOwnerModule;
		readonly level: LevelContentPackageOwnerModule;
		readonly prefabs: LevelContentPackageOwnerModule;
		readonly assets: LevelContentPackageOwnerModule;
		readonly renderProfile: LevelContentPackageOwnerModule;
		readonly audioContent?: LevelContentPackageOwnerModule;
		readonly terrainRuntime?: LevelContentPackageOwnerModule;
		readonly collisionDraft?: LevelContentPackageOwnerModule;
		readonly lightDraft?: LevelContentPackageOwnerModule;
		readonly primitiveContent?: readonly LevelContentPackageOwnerModule[];
		readonly populations?: readonly LevelContentPackageOwnerModule[];
		readonly generatedModules?: readonly LevelContentPackageGeneratedOwnerModule[];
		readonly publicAssetRoots?: readonly string[];
	},
): LevelContentPackage {
	return {
		schemaVersion: 1,
		packId: options.packId,
		runtimeSceneId: options.runtimeSceneId,
		levelId: options.levelId,
		packageRoot: options.packageRoot,
		targetPackageRoot: options.targetPackageRoot,
		canonicalRuntimeSource: "RuntimeSceneManifest",
		removableWithPack: options.removableWithPack,
		packageStatus: options.packageStatus,
		owners: {
			runtimeManifest: options.runtimeManifest,
			level: options.level,
			prefabs: options.prefabs,
			assets: options.assets,
			renderProfile: options.renderProfile,
			...(options.audioContent ? { audioContent: options.audioContent } : {}),
			...(options.terrainRuntime
				? { terrainRuntime: options.terrainRuntime }
				: {}),
			...(options.collisionDraft
				? { collisionDraft: options.collisionDraft }
				: {}),
			...(options.lightDraft ? { lightDraft: options.lightDraft } : {}),
			...(options.primitiveContent
				? { primitiveContent: options.primitiveContent }
				: {}),
			...(options.populations ? { populations: options.populations } : {}),
			generatedModules: options.generatedModules ?? [],
			publicAssetRoots: options.publicAssetRoots ?? [],
		},
		sharedDependencies: options.sharedDependencies,
		migrationNotes: options.migrationNotes,
	};
}

function owner(
	ownerName: string,
	ownerExport: string,
	targetFile: string,
	packageTargetFile: string,
	migrationStatus: LevelContentPackageMigrationStatus,
): LevelContentPackageOwnerModule {
	return {
		ownerName,
		ownerExport,
		targetFile,
		packageTargetFile,
		migrationStatus,
	};
}

function generatedOwner(
	options: Omit<LevelContentPackageGeneratedOwnerModule, "schemaVersion">,
): LevelContentPackageGeneratedOwnerModule {
	return {
		ownerName: options.ownerName,
		ownerExport: options.ownerExport,
		targetFile: options.targetFile,
		packageTargetFile: options.packageTargetFile,
		migrationStatus: options.migrationStatus,
		generatedOwnerKind: options.generatedOwnerKind,
	};
}
