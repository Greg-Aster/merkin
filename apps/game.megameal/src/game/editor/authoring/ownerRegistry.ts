import { defaultRuntimeSceneManifests } from "../../levels/index.js";
import { cloneValue, hashStableValue } from "./stableValue.js";

export type LevelEditorOwnerKind =
	| "level"
	| "prefab"
	| "asset"
	| "render-profile"
	| "generated-module";

export type LevelEditorGeneratedOwnerKind =
	| "authoring-save"
	| "collision-runtime"
	| "terrain-runtime";

export type LevelEditorOwnerWriteStrategy =
	| "planned-owner-module"
	| "existing-generated-module"
	| "replace-generated-module";

export type LevelEditorOwnerTarget = {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly runtimeSceneId: string;
	readonly ownerKind: LevelEditorOwnerKind;
	readonly ownerName: string;
	readonly ownerExport: string;
	readonly targetFile: string;
	readonly writeStrategy: LevelEditorOwnerWriteStrategy;
	readonly writableByAuthoringSave: boolean;
	readonly generatedOwnerKind?: LevelEditorGeneratedOwnerKind;
	readonly runtimeCatalogEvidence: {
		readonly sourceKind: string;
		readonly sourceId: string;
		readonly levelId: string;
		readonly renderProfileId: string;
	};
};

export type LevelEditorOwnerRegistry = {
	readonly schemaVersion: 1;
	readonly generator: "levelEditor.ownerRegistry.v1";
	readonly runtimeSceneIds: readonly string[];
	readonly targets: readonly LevelEditorOwnerTarget[];
	readonly contentHash: string;
};

type RuntimeSceneOwnerModules = {
	readonly level: {
		readonly ownerName: string;
		readonly ownerExport: string;
		readonly targetFile: string;
	};
	readonly prefabs: {
		readonly ownerName: string;
		readonly ownerExport: string;
		readonly targetFile: string;
	};
	readonly assets: {
		readonly ownerName: string;
		readonly ownerExport: string;
		readonly targetFile: string;
	};
	readonly renderProfile: {
		readonly ownerName: string;
		readonly ownerExport: string;
		readonly targetFile: string;
	};
	readonly generatedModules?: readonly {
		readonly ownerName: string;
		readonly ownerExport: string;
		readonly targetFile: string;
		readonly generatedOwnerKind: Exclude<
			LevelEditorGeneratedOwnerKind,
			"authoring-save"
		>;
	}[];
};

const runtimeSceneOwnerModules: Record<string, RuntimeSceneOwnerModules> = {
	portal_arena_runtime: {
		level: ownerModule(
			"Portal arena level",
			"portalArenaLevel",
			"src/game/levels/portalArenaLevel.ts",
		),
		prefabs: ownerModule(
			"Portal arena prefab catalog",
			"portalArenaPrefabs",
			"src/game/prefabs/portalPrefabs.ts",
		),
		assets: ownerModule(
			"Portal arena asset manifest",
			"portalArenaAssetManifest",
			"src/game/assets/portalArenaAssets.ts",
		),
		renderProfile: ownerModule(
			"Portal arena render profile",
			"portalArenaRenderProfile",
			"src/game/levels/renderProfiles.ts",
		),
		generatedModules: [terrainRuntimeModule()],
	},
	prototype_arena_runtime: {
		level: ownerModule(
			"Prototype arena level",
			"prototypeLevel",
			"src/game/levels/defaultLevels.ts",
		),
		prefabs: ownerModule(
			"Prototype prefab catalog",
			"prototypePrefabs",
			"src/game/prefabs/defaultPrefabs.ts",
		),
		assets: ownerModule(
			"Prototype asset manifest",
			"prototypeAssetManifest",
			"src/game/assets/defaultAssets.ts",
		),
		renderProfile: ownerModule(
			"Prototype render profile",
			"prototypeRenderProfile",
			"src/game/levels/renderProfiles.ts",
		),
		generatedModules: [terrainRuntimeModule()],
	},
	miranda_deck_runtime: {
		level: ownerModule(
			"Miranda deck level",
			"mirandaDeckLevel",
			"src/game/levels/defaultLevels.ts",
		),
		prefabs: ownerModule(
			"Miranda deck prefab catalog",
			"mirandaDeckPrefabs",
			"src/game/prefabs/defaultPrefabs.ts",
		),
		assets: ownerModule(
			"Miranda deck asset manifest",
			"mirandaDeckAssetManifest",
			"src/game/assets/defaultAssets.ts",
		),
		renderProfile: ownerModule(
			"Miranda deck render profile",
			"mirandaDeckRenderProfile",
			"src/game/levels/renderProfiles.ts",
		),
		generatedModules: [terrainRuntimeModule()],
	},
	observatory_runtime: {
		level: ownerModule(
			"Observatory level",
			"observatoryLevel",
			"src/game/levels/observatoryLevel.ts",
		),
		prefabs: ownerModule(
			"Observatory prefab catalog",
			"observatoryPrefabs",
			"src/game/prefabs/observatoryPrefabs.ts",
		),
		assets: ownerModule(
			"Observatory asset manifest",
			"observatoryAssetManifest",
			"src/game/assets/observatoryAssets.ts",
		),
		renderProfile: ownerModule(
			"Observatory render profile",
			"observatoryRenderProfile",
			"src/game/levels/renderProfiles.ts",
		),
		generatedModules: [
			terrainRuntimeModule(),
			{
				ownerName: "Observatory generated collision runtime",
				ownerExport: "observatoryCollisionRuntime",
				targetFile: "src/game/generated/observatoryCollisionRuntime.ts",
				generatedOwnerKind: "collision-runtime",
			},
		],
	},
	sci_fi_room_runtime: {
		level: ownerModule(
			"Sci Fi Room level",
			"sciFiRoomLevel",
			"src/game/levels/sciFiRoomLevel.ts",
		),
		prefabs: ownerModule(
			"Sci Fi Room prefab catalog",
			"sciFiRoomPrefabs",
			"src/game/prefabs/sciFiRoomPrefabs.ts",
		),
		assets: ownerModule(
			"Sci Fi Room asset manifest",
			"sciFiRoomAssetManifest",
			"src/game/assets/sciFiRoomAssets.ts",
		),
		renderProfile: ownerModule(
			"Sci Fi Room render profile",
			"sciFiRoomRenderProfile",
			"src/game/levels/renderProfiles.ts",
		),
		generatedModules: [terrainRuntimeModule()],
	},
	solitude_runtime: {
		level: ownerModule(
			"Solitude level",
			"solitudeLevel",
			"src/game/levels/solitudeLevel.ts",
		),
		prefabs: ownerModule(
			"Solitude prefab catalog",
			"solitudePrefabs",
			"src/game/prefabs/solitudePrefabs.ts",
		),
		assets: ownerModule(
			"Solitude asset manifest",
			"solitudeAssetManifest",
			"src/game/assets/solitudeAssets.ts",
		),
		renderProfile: ownerModule(
			"Solitude render profile",
			"solitudeRenderProfile",
			"src/game/levels/renderProfiles.ts",
		),
		generatedModules: [terrainRuntimeModule()],
	},
	yggdrasil_runtime: {
		level: ownerModule(
			"Yggdrasil level",
			"yggdrasilLevel",
			"src/game/levels/yggdrasilLevel.ts",
		),
		prefabs: ownerModule(
			"Yggdrasil prefab catalog",
			"yggdrasilPrefabs",
			"src/game/prefabs/yggdrasilPrefabs.ts",
		),
		assets: ownerModule(
			"Yggdrasil asset manifest",
			"yggdrasilAssetManifest",
			"src/game/assets/yggdrasilAssets.ts",
		),
		renderProfile: ownerModule(
			"Yggdrasil render profile",
			"yggdrasilRenderProfile",
			"src/game/levels/renderProfiles.ts",
		),
		generatedModules: [terrainRuntimeModule()],
	},
};

export function buildLevelEditorOwnerRegistry(): LevelEditorOwnerRegistry {
	const runtimeSceneIds = defaultRuntimeSceneManifests.map(
		(manifest) => manifest.id,
	);
	const targets = defaultRuntimeSceneManifests.flatMap((manifest) => {
		const ownerModules = runtimeSceneOwnerModules[manifest.id];

		if (!ownerModules) {
			throw new Error(
				`Runtime scene "${manifest.id}" is missing level editor owner metadata.`,
			);
		}

		const evidence = {
			sourceKind: manifest.source.kind,
			sourceId: manifest.source.id,
			levelId: manifest.level.id,
			renderProfileId: manifest.renderProfile.id,
		};

		return [
			ownerTarget({
				id: `${manifest.id}:level`,
				runtimeSceneId: manifest.id,
				ownerKind: "level",
				writeStrategy: "planned-owner-module",
				writableByAuthoringSave: false,
				module: ownerModules.level,
				evidence,
			}),
			ownerTarget({
				id: `${manifest.id}:prefabs`,
				runtimeSceneId: manifest.id,
				ownerKind: "prefab",
				writeStrategy: "planned-owner-module",
				writableByAuthoringSave: false,
				module: ownerModules.prefabs,
				evidence,
			}),
			ownerTarget({
				id: `${manifest.id}:assets`,
				runtimeSceneId: manifest.id,
				ownerKind: "asset",
				writeStrategy: "planned-owner-module",
				writableByAuthoringSave: false,
				module: ownerModules.assets,
				evidence,
			}),
			ownerTarget({
				id: `${manifest.id}:render-profile`,
				runtimeSceneId: manifest.id,
				ownerKind: "render-profile",
				writeStrategy: "planned-owner-module",
				writableByAuthoringSave: false,
				module: ownerModules.renderProfile,
				evidence,
			}),
			...generatedOwnerTargets(manifest.id, ownerModules, evidence),
			ownerTarget({
				id: `${manifest.id}:generated:authoring-save`,
				runtimeSceneId: manifest.id,
				ownerKind: "generated-module",
				generatedOwnerKind: "authoring-save",
				writeStrategy: "replace-generated-module",
				writableByAuthoringSave: true,
				module: {
					ownerName: "Level editor saved authoring transaction module",
					ownerExport: "levelEditorAuthoringSaveModule",
					targetFile: `src/game/editor/authoring/generated/${manifest.id}.authoringSave.ts`,
				},
				evidence,
			}),
		];
	});
	const registryBase = {
		schemaVersion: 1,
		generator: "levelEditor.ownerRegistry.v1",
		runtimeSceneIds,
		targets,
	} satisfies Omit<LevelEditorOwnerRegistry, "contentHash">;

	return {
		...registryBase,
		contentHash: hashStableValue(registryBase),
	};
}

export function listLevelEditorOwnerTargets(): readonly LevelEditorOwnerTarget[] {
	return buildLevelEditorOwnerRegistry().targets;
}

export function listWritableLevelEditorOwnerTargets(): readonly LevelEditorOwnerTarget[] {
	return listLevelEditorOwnerTargets().filter(
		(target) => target.writableByAuthoringSave,
	);
}

export function getLevelEditorOwnerTarget(
	targetId: string,
): LevelEditorOwnerTarget | undefined {
	return listLevelEditorOwnerTargets().find((target) => target.id === targetId);
}

function ownerModule(
	ownerName: string,
	ownerExport: string,
	targetFile: string,
): RuntimeSceneOwnerModules["level"] {
	return {
		ownerName,
		ownerExport,
		targetFile,
	};
}

function terrainRuntimeModule(): NonNullable<
	RuntimeSceneOwnerModules["generatedModules"]
>[number] {
	return {
		ownerName: "Generated terrain runtime module",
		ownerExport: "terrainRuntimeModule",
		targetFile: "src/game/generated/terrainRuntime.ts",
		generatedOwnerKind: "terrain-runtime",
	};
}

function generatedOwnerTargets(
	runtimeSceneId: string,
	ownerModules: RuntimeSceneOwnerModules,
	evidence: LevelEditorOwnerTarget["runtimeCatalogEvidence"],
): readonly LevelEditorOwnerTarget[] {
	return (ownerModules.generatedModules ?? []).map((module) =>
		ownerTarget({
			id: `${runtimeSceneId}:generated:${module.generatedOwnerKind}`,
			runtimeSceneId,
			ownerKind: "generated-module",
			generatedOwnerKind: module.generatedOwnerKind,
			writeStrategy: "existing-generated-module",
			writableByAuthoringSave: false,
			module,
			evidence,
		}),
	);
}

function ownerTarget(options: {
	readonly id: string;
	readonly runtimeSceneId: string;
	readonly ownerKind: LevelEditorOwnerKind;
	readonly generatedOwnerKind?: LevelEditorGeneratedOwnerKind;
	readonly writeStrategy: LevelEditorOwnerWriteStrategy;
	readonly writableByAuthoringSave: boolean;
	readonly module: {
		readonly ownerName: string;
		readonly ownerExport: string;
		readonly targetFile: string;
	};
	readonly evidence: LevelEditorOwnerTarget["runtimeCatalogEvidence"];
}): LevelEditorOwnerTarget {
	return cloneValue({
		schemaVersion: 1,
		id: options.id,
		runtimeSceneId: options.runtimeSceneId,
		ownerKind: options.ownerKind,
		ownerName: options.module.ownerName,
		ownerExport: options.module.ownerExport,
		targetFile: options.module.targetFile,
		writeStrategy: options.writeStrategy,
		writableByAuthoringSave: options.writableByAuthoringSave,
		...(options.generatedOwnerKind
			? { generatedOwnerKind: options.generatedOwnerKind }
			: {}),
		runtimeCatalogEvidence: options.evidence,
	});
}
