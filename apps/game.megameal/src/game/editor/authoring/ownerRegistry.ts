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
	| "published-transforms"
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

export type LevelEditorFeatureFamilyPublishStatus =
	| "bounded-owner-write"
	| "registered-owner-draft-only"
	| "cook-contract"
	| "preview-only"
	| "read-only"
	| "unsupported-for-publish";

export type LevelEditorFeatureFamilyStoragePolicy =
	| "runtime-owner-publish"
	| "save-draft-only-non-runtime"
	| "cook-generated-owner"
	| "live-preview-only"
	| "read-only-no-save"
	| "blocked-no-save";

export type LevelEditorFeatureFamilySource =
	| "workspace"
	| "object-library"
	| "npc-authoring"
	| "environment-authoring"
	| "ai-asset-lab"
	| "collision-authoring"
	| "camera-authoring"
	| "build-publish";

export type LevelEditorFeatureFamilyCoverage = {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly label: string;
	readonly source: LevelEditorFeatureFamilySource;
	readonly publishStatus: LevelEditorFeatureFamilyPublishStatus;
	readonly storagePolicy: LevelEditorFeatureFamilyStoragePolicy;
	readonly requiredOwnerKinds: readonly LevelEditorOwnerKind[];
	readonly optionalGeneratedOwnerKinds: readonly LevelEditorGeneratedOwnerKind[];
	readonly operationKinds: readonly string[];
	readonly fieldPaths: readonly string[];
	readonly ownerTargetIds: readonly string[];
	readonly unsupportedReason?: string;
};

export type LevelEditorFeatureCoverageRegistry = {
	readonly schemaVersion: 1;
	readonly generator: "levelEditor.featureCoverage.v1";
	readonly runtimeSceneIds: readonly string[];
	readonly families: readonly LevelEditorFeatureFamilyCoverage[];
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

type LevelEditorFeatureFamilyDefinition = Omit<
	LevelEditorFeatureFamilyCoverage,
	"schemaVersion" | "ownerTargetIds"
>;

const featureFamilyDefinitions: readonly LevelEditorFeatureFamilyDefinition[] =
	[
		{
			id: "runtime-scene-selection",
			label: "Runtime Scene Selection And Manifest Inspection",
			source: "workspace",
			publishStatus: "read-only",
			storagePolicy: "read-only-no-save",
			requiredOwnerKinds: [],
			optionalGeneratedOwnerKinds: [],
			operationKinds: [],
			fieldPaths: ["runtimeSceneManifest", "levelBrowser"],
			unsupportedReason:
				"scene registration and manifest-reference editing are inspect-only until a manifest owner writer exists",
		},
		{
			id: "level-instance-transform",
			label: "Level Instance Transform",
			source: "workspace",
			publishStatus: "bounded-owner-write",
			storagePolicy: "runtime-owner-publish",
			requiredOwnerKinds: ["level"],
			optionalGeneratedOwnerKinds: ["published-transforms"],
			operationKinds: ["set-transform"],
			fieldPaths: [
				"Transform.position",
				"Transform.rotation",
				"Transform.scale",
			],
		},
		{
			id: "level-instance-structure",
			label: "Level Instance Structure",
			source: "workspace",
			publishStatus: "registered-owner-draft-only",
			storagePolicy: "save-draft-only-non-runtime",
			requiredOwnerKinds: ["level", "prefab"],
			optionalGeneratedOwnerKinds: [],
			operationKinds: ["insert-instance", "stable-id-management", "grouping"],
			fieldPaths: ["level.instances", "level.instances.*.prefabId"],
			unsupportedReason:
				"drafts can record broader level instance structure edits, but no bounded level/prefab owner writer exists for raw insert, grouping, or stable-ID changes",
		},
		{
			id: "level-instance-removal",
			label: "Level Instance Removal",
			source: "workspace",
			publishStatus: "bounded-owner-write",
			storagePolicy: "runtime-owner-publish",
			requiredOwnerKinds: ["level"],
			optionalGeneratedOwnerKinds: ["published-transforms"],
			operationKinds: ["remove-instance", "remove-level-instance"],
			fieldPaths: ["level.instances.*"],
			unsupportedReason:
				"readiness-required instance removal remains blocked until a matching manifest/readiness owner writer exists",
		},
		{
			id: "level-instance-duplication",
			label: "Level Instance Duplication",
			source: "workspace",
			publishStatus: "bounded-owner-write",
			storagePolicy: "runtime-owner-publish",
			requiredOwnerKinds: ["level", "prefab"],
			optionalGeneratedOwnerKinds: ["published-transforms"],
			operationKinds: ["insert-instance", "insert-level-instance"],
			fieldPaths: ["level.instances.*", "prefabs.*"],
			unsupportedReason:
				"duplication is bounded to generated level-instance insertions; broader stable-ID management, grouping, replacement, and readiness owner updates remain draft-only",
		},
		{
			id: "level-instance-prefab-replacement",
			label: "Level Instance Prefab Replacement",
			source: "object-library",
			publishStatus: "bounded-owner-write",
			storagePolicy: "runtime-owner-publish",
			requiredOwnerKinds: ["level", "prefab"],
			optionalGeneratedOwnerKinds: ["published-transforms"],
			operationKinds: ["replace-prefab", "replace-level-instance"],
			fieldPaths: ["level.instances.*.prefabId", "prefabs.*"],
			unsupportedReason:
				"replacement is bounded to level-instance prefab ID overrides; readiness-required stable IDs and broader asset/component replacement remain draft-only until matching owner writers exist",
		},
		{
			id: "component-editing",
			label: "Schema-Backed Component Editing",
			source: "workspace",
			publishStatus: "bounded-owner-write",
			storagePolicy: "runtime-owner-publish",
			requiredOwnerKinds: ["level"],
			optionalGeneratedOwnerKinds: ["published-transforms"],
			operationKinds: ["set-component", "remove-component"],
			fieldPaths: ["components.*"],
			unsupportedReason:
				"prefab-owned component edits remain draft-only until a prefab owner writer exists",
		},
		{
			id: "object-library-placement",
			label: "Object Library Prefab Placement",
			source: "object-library",
			publishStatus: "bounded-owner-write",
			storagePolicy: "runtime-owner-publish",
			requiredOwnerKinds: ["level", "prefab"],
			optionalGeneratedOwnerKinds: ["published-transforms"],
			operationKinds: ["insert-level-instance"],
			fieldPaths: ["level.instances.*", "prefabs.*"],
		},
		{
			id: "object-library-replacement",
			label: "Object Library Replacement",
			source: "object-library",
			publishStatus: "registered-owner-draft-only",
			storagePolicy: "save-draft-only-non-runtime",
			requiredOwnerKinds: ["level", "prefab", "asset"],
			optionalGeneratedOwnerKinds: [],
			operationKinds: [
				"replace-level-instance",
				"replace-component-asset-reference",
			],
			fieldPaths: [
				"level.instances.*.prefabId",
				"Renderable.meshId",
				"Renderable.materialId",
				"SoundEmitter.soundId",
			],
			unsupportedReason:
				"object replacement is draft-only until bounded level, prefab, and asset reference writers exist",
		},
		{
			id: "portal-interaction-targets",
			label: "Portal Targets And Interaction Triggers",
			source: "workspace",
			publishStatus: "registered-owner-draft-only",
			storagePolicy: "save-draft-only-non-runtime",
			requiredOwnerKinds: ["level"],
			optionalGeneratedOwnerKinds: [],
			operationKinds: ["set-portal-target", "set-component"],
			fieldPaths: [
				"Portal.targetRuntimeSceneId",
				"Portal.activationRadius",
				"Portal.prompt",
			],
			unsupportedReason:
				"portal component edits are draft-only until a bounded level component owner writer exists",
		},
		{
			id: "story-notes-and-gameplay-markers",
			label: "Story Notes And Gameplay Markers",
			source: "workspace",
			publishStatus: "read-only",
			storagePolicy: "read-only-no-save",
			requiredOwnerKinds: [],
			optionalGeneratedOwnerKinds: [],
			operationKinds: [],
			fieldPaths: ["StoryNote", "gameplayMarkers", "questHooks"],
			unsupportedReason:
				"current story/gameplay marker surfaces are inspect-only until typed owner writers exist",
		},
		{
			id: "environment-render-profile",
			label: "Environment And Render Profile",
			source: "environment-authoring",
			publishStatus: "registered-owner-draft-only",
			storagePolicy: "save-draft-only-non-runtime",
			requiredOwnerKinds: ["render-profile", "asset"],
			optionalGeneratedOwnerKinds: [],
			operationKinds: ["set-render-profile-environment"],
			fieldPaths: ["renderProfile.environment.*"],
			unsupportedReason:
				"environment edits are draft-only until bounded render-profile and asset owner writers exist",
		},
		{
			id: "authored-lighting",
			label: "Authored Lighting",
			source: "environment-authoring",
			publishStatus: "registered-owner-draft-only",
			storagePolicy: "save-draft-only-non-runtime",
			requiredOwnerKinds: ["level", "prefab", "render-profile"],
			optionalGeneratedOwnerKinds: [],
			operationKinds: ["set-authored-light-field", "set-component"],
			fieldPaths: ["Light.*", "renderProfile.lighting.*"],
			unsupportedReason:
				"lighting edits are draft-only until bounded light component and render-profile owner writers exist",
		},
		{
			id: "audio-authoring",
			label: "Audio Emitters And Scene Music",
			source: "environment-authoring",
			publishStatus: "registered-owner-draft-only",
			storagePolicy: "save-draft-only-non-runtime",
			requiredOwnerKinds: ["level", "asset"],
			optionalGeneratedOwnerKinds: [],
			operationKinds: ["set-audio-track-id", "set-component"],
			fieldPaths: ["SoundEmitter.*", "audioContentManifest.sceneMusic"],
			unsupportedReason:
				"audio edits are draft-only until bounded audio manifest and level component owner writers exist",
		},
		{
			id: "terrain-packages",
			label: "Terrain Packages",
			source: "workspace",
			publishStatus: "cook-contract",
			storagePolicy: "cook-generated-owner",
			requiredOwnerKinds: ["generated-module"],
			optionalGeneratedOwnerKinds: ["terrain-runtime"],
			operationKinds: ["cook-terrain"],
			fieldPaths: ["terrainPackages.*", "TerrainChunkCell", "TerrainSurface"],
			unsupportedReason:
				"terrain changes must publish through the terrain cook/drift contract, not the current Save Level/Publish Level transform slice",
		},
		{
			id: "collision-authoring",
			label: "Collision Authoring",
			source: "collision-authoring",
			publishStatus: "cook-contract",
			storagePolicy: "cook-generated-owner",
			requiredOwnerKinds: ["level", "prefab"],
			optionalGeneratedOwnerKinds: ["collision-runtime"],
			operationKinds: ["stage-collision-preview-entry", "cook-collision"],
			fieldPaths: ["Collider.*", "RigidBody.*"],
			unsupportedReason:
				"collision changes must publish through the collision cook contract, not the current Save Level/Publish Level transform slice",
		},
		{
			id: "npc-firefly-authoring",
			label: "NPC And Firefly Authoring",
			source: "npc-authoring",
			publishStatus: "registered-owner-draft-only",
			storagePolicy: "save-draft-only-non-runtime",
			requiredOwnerKinds: ["level", "prefab"],
			optionalGeneratedOwnerKinds: [],
			operationKinds: ["insert-firefly-npc", "remove-npc", "duplicate-npc"],
			fieldPaths: ["FireflyPopulationMember.*", "Light.*"],
			unsupportedReason:
				"NPC/firefly edits are draft-only until bounded level/prefab owner writers and runtime AI support exist",
		},
		{
			id: "ai-generated-assets",
			label: "AI Generated Assets",
			source: "ai-asset-lab",
			publishStatus: "registered-owner-draft-only",
			storagePolicy: "save-draft-only-non-runtime",
			requiredOwnerKinds: ["level", "asset"],
			optionalGeneratedOwnerKinds: [],
			operationKinds: [
				"insert-generated-asset",
				"replace-selection-renderable",
				"assign-generated-material",
			],
			fieldPaths: ["assetManifest.generated.*", "Renderable.*"],
			unsupportedReason:
				"AI asset edits are draft-only until bounded asset manifest and renderable reference owner writers exist",
		},
		{
			id: "camera-live-preview",
			label: "Camera Live Preview",
			source: "camera-authoring",
			publishStatus: "preview-only",
			storagePolicy: "live-preview-only",
			requiredOwnerKinds: [],
			optionalGeneratedOwnerKinds: [],
			operationKinds: ["camera-live-edit-mode"],
			fieldPaths: ["camera.previewPose"],
			unsupportedReason:
				"camera live/edit mode is a dev-preview command and has no runtime owner file",
		},
		{
			id: "build-publish-plan",
			label: "Build And Publish Plan",
			source: "build-publish",
			publishStatus: "read-only",
			storagePolicy: "read-only-no-save",
			requiredOwnerKinds: [],
			optionalGeneratedOwnerKinds: [],
			operationKinds: ["build-plan", "publish-plan"],
			fieldPaths: ["editor.buildPublish.steps"],
			unsupportedReason:
				"the current publish panel displays local gates and does not mutate checked-in owner data",
		},
	];

const runtimeSceneOwnerModules: Record<string, RuntimeSceneOwnerModules> = {
	starter_runtime: {
		level: ownerModule(
			"Starter level",
			"starterLevel",
			"src/game/levels/defaultLevels.ts",
		),
		prefabs: ownerModule(
			"Starter prefab catalog",
			"starterPrefabs",
			"src/game/prefabs/defaultPrefabs.ts",
		),
		assets: ownerModule(
			"Starter asset manifest",
			"starterAssetManifest",
			"src/game/assets/defaultAssets.ts",
		),
		renderProfile: ownerModule(
			"Starter render profile",
			"starterRenderProfile",
			"src/game/levels/renderProfiles.ts",
		),
		generatedModules: [publishedTransformsModule()],
	},
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
		generatedModules: [terrainRuntimeModule(), publishedTransformsModule()],
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
		generatedModules: [terrainRuntimeModule(), publishedTransformsModule()],
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
		generatedModules: [terrainRuntimeModule(), publishedTransformsModule()],
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
			publishedTransformsModule(),
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
		generatedModules: [terrainRuntimeModule(), publishedTransformsModule()],
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
		generatedModules: [terrainRuntimeModule(), publishedTransformsModule()],
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
		generatedModules: [terrainRuntimeModule(), publishedTransformsModule()],
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

function featureFamilyCoverage(
	definition: LevelEditorFeatureFamilyDefinition,
	ownerRegistry: LevelEditorOwnerRegistry,
): LevelEditorFeatureFamilyCoverage {
	return cloneValue({
		schemaVersion: 1,
		...definition,
		ownerTargetIds: ownerTargetsForFeatureFamily(definition, ownerRegistry),
	});
}

export function buildLevelEditorFeatureCoverageRegistry(
	ownerRegistry: LevelEditorOwnerRegistry = buildLevelEditorOwnerRegistry(),
): LevelEditorFeatureCoverageRegistry {
	const families = featureFamilyDefinitions.map((definition) =>
		featureFamilyCoverage(definition, ownerRegistry),
	);
	const registryBase = {
		schemaVersion: 1,
		generator: "levelEditor.featureCoverage.v1",
		runtimeSceneIds: ownerRegistry.runtimeSceneIds,
		families,
	} satisfies Omit<LevelEditorFeatureCoverageRegistry, "contentHash">;

	return {
		...registryBase,
		contentHash: hashStableValue(registryBase),
	};
}

export function validateLevelEditorFeatureCoverageRegistry(
	registry: LevelEditorFeatureCoverageRegistry,
	ownerRegistry: LevelEditorOwnerRegistry = buildLevelEditorOwnerRegistry(),
): readonly string[] {
	const errors: string[] = [];
	const familyIds = new Set<string>();
	const ownerTargetIds = new Set(
		ownerRegistry.targets.map((target) => target.id),
	);

	if (registry.schemaVersion !== 1) {
		errors.push("featureCoverage.schemaVersion must be 1.");
	}

	if (registry.generator !== "levelEditor.featureCoverage.v1") {
		errors.push(
			"featureCoverage.generator must be levelEditor.featureCoverage.v1.",
		);
	}

	for (const runtimeSceneId of ownerRegistry.runtimeSceneIds) {
		if (!registry.runtimeSceneIds.includes(runtimeSceneId)) {
			errors.push(
				`featureCoverage is missing runtime scene "${runtimeSceneId}" from the owner registry.`,
			);
		}
	}

	for (const family of registry.families) {
		if (familyIds.has(family.id)) {
			errors.push(`feature family "${family.id}" is duplicated.`);
		}
		familyIds.add(family.id);

		for (const ownerTargetId of family.ownerTargetIds) {
			if (!ownerTargetIds.has(ownerTargetId)) {
				errors.push(
					`feature family "${family.id}" references unknown owner target "${ownerTargetId}".`,
				);
			}
		}

		if (
			family.storagePolicy === "save-draft-only-non-runtime" ||
			family.storagePolicy === "runtime-owner-publish" ||
			family.storagePolicy === "cook-generated-owner"
		) {
			if (family.ownerTargetIds.length === 0) {
				errors.push(
					`feature family "${family.id}" requires owner targets for storage policy "${family.storagePolicy}".`,
				);
			}
		}

		if (family.publishStatus !== "bounded-owner-write") {
			if (family.storagePolicy === "save-draft-only-non-runtime") {
				if (family.publishStatus !== "registered-owner-draft-only") {
					errors.push(
						`feature family "${family.id}" cannot save editor drafts while publish status is "${family.publishStatus}".`,
					);
				}
			}
			if (!family.unsupportedReason) {
				errors.push(
					`feature family "${family.id}" must explain why Publish Level does not support it.`,
				);
			}
		}

		if (
			family.publishStatus === "bounded-owner-write" &&
			family.storagePolicy !== "runtime-owner-publish"
		) {
			errors.push(
				`feature family "${family.id}" has bounded owner writes but storage policy "${family.storagePolicy}".`,
			);
		}

		if (
			family.publishStatus === "registered-owner-draft-only" &&
			family.storagePolicy !== "save-draft-only-non-runtime"
		) {
			errors.push(
				`feature family "${family.id}" must be explicit save-draft-only storage until a publish writer exists.`,
			);
		}
	}

	return errors;
}

export function getLevelEditorFeatureFamilyForOperationKind(
	operationKind: string,
	registry: LevelEditorFeatureCoverageRegistry = buildLevelEditorFeatureCoverageRegistry(),
): LevelEditorFeatureFamilyCoverage | undefined {
	return registry.families.find((family) =>
		family.operationKinds.includes(operationKind),
	);
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

function publishedTransformsModule(): NonNullable<
	RuntimeSceneOwnerModules["generatedModules"]
>[number] {
	return {
		ownerName: "Generated published level transform overrides",
		ownerExport: "publishedLevelInstanceTransformOverrides",
		targetFile: "src/game/generated/publishedLevelTransforms.ts",
		generatedOwnerKind: "published-transforms",
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

function ownerTargetsForFeatureFamily(
	definition: LevelEditorFeatureFamilyDefinition,
	ownerRegistry: LevelEditorOwnerRegistry,
): readonly string[] {
	const requiredOwnerKinds = new Set(definition.requiredOwnerKinds);
	const optionalGeneratedOwnerKinds = new Set(
		definition.optionalGeneratedOwnerKinds,
	);

	return ownerRegistry.targets
		.filter((target) => {
			if (requiredOwnerKinds.has(target.ownerKind)) {
				if (
					target.ownerKind === "generated-module" &&
					optionalGeneratedOwnerKinds.size > 0
				) {
					return (
						target.generatedOwnerKind !== undefined &&
						optionalGeneratedOwnerKinds.has(target.generatedOwnerKind)
					);
				}

				return true;
			}

			return (
				target.generatedOwnerKind !== undefined &&
				optionalGeneratedOwnerKinds.has(target.generatedOwnerKind)
			);
		})
		.map((target) => target.id)
		.sort();
}
