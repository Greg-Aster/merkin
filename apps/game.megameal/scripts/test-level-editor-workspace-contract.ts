import { strict as assert } from "node:assert";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { levelPackageRouter } from "../src/levels/global/router.js";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const levelsRoot = join(appRoot, "src/levels");
const levelEditorWorkspaceSource = await readFile(
	join(appRoot, "src/editor/level/LevelEditorWorkspace.svelte"),
	"utf8",
);
const npcEditorPanelSource = await readFile(
	join(appRoot, "src/editor/level/NpcEditorPanel.svelte"),
	"utf8",
);
const npcEditorModelSource = await readFile(
	join(appRoot, "src/editor/level/npcEditorModel.ts"),
	"utf8",
);
const npcEditorSource = `${npcEditorPanelSource}\n${npcEditorModelSource}`;
const editorDevApiSource = await readFile(
	join(appRoot, "scripts/editor-dev-api.mjs"),
	"utf8",
);
const wrapperFiles = [
	"assets.ts",
	"level.ts",
	"manifest.ts",
	"prefabs.ts",
	"renderProfile.ts",
] as const;

const folders = (
	await Promise.all(
		(
			await readdir(levelsRoot, {
				withFileTypes: true,
			})
		)
			.filter((entry) => entry.isDirectory() && entry.name !== "global")
			.map(async (entry) => {
				try {
					await readFile(join(levelsRoot, entry.name, "data.json"), "utf8");
					await readFile(join(levelsRoot, entry.name, "skybox.json"), "utf8");
					return entry.name;
				} catch {
					return undefined;
				}
			}),
	)
)
	.filter((name): name is string => typeof name === "string")
	.sort();

assert.deepEqual(
	levelPackageRouter
		.listRuntimeScenes()
		.map((manifest) => manifest.id)
		.sort(),
	[
		"miranda_deck_runtime",
		"observatory_runtime",
		"portal_arena_runtime",
		"prototype_arena_runtime",
	],
	"router must expose the current checked-in runtime scenes",
);

for (const folder of folders) {
	const levelDir = join(levelsRoot, folder);
	const document = JSON.parse(
		await readFile(join(levelDir, "data.json"), "utf8"),
	);
	const skybox = JSON.parse(
		await readFile(join(levelDir, "skybox.json"), "utf8"),
	);
	const runtimeSceneManifest = levelPackageRouter.getRuntimeSceneManifest(
		document.runtimeScene.id,
	);
	assert.ok(
		runtimeSceneManifest,
		`${folder} runtime scene must be exposed through the level package router`,
	);
	const resolved = {
		assetManifest: runtimeSceneManifest.assets,
		prefabs: runtimeSceneManifest.prefabs,
		level: runtimeSceneManifest.level,
		runtimeSceneManifest,
	};
	const assetIds = new Set(
		resolved.assetManifest.assets.map((asset) => asset.id),
	);
	const prefabIds = new Set(resolved.prefabs.map((prefab) => prefab.id));
	const stableIds = new Set(
		resolved.level.instances.map((instance) => instance.stableId),
	);

	assert.equal(
		resolved.runtimeSceneManifest.id,
		document.runtimeScene.id,
		`${folder} runtime scene id must come from data.json`,
	);
	assert.equal(
		resolved.runtimeSceneManifest.level.id,
		document.level.id,
		`${folder} level id must come from data.json`,
	);
	assert.equal(
		environmentAssetId(resolved.runtimeSceneManifest.renderProfile.environment),
		environmentAssetId(skybox.environment),
		`${folder} runtime scene environment must come from skybox.json`,
	);
	assert.equal(
		document.renderProfile.environment,
		undefined,
		`${folder} data.json must not re-own renderProfile.environment`,
	);
	assert.equal(
		resolved.runtimeSceneManifest.assets.assets.length,
		assetIds.size,
		`${folder} asset IDs must be unique after shared resolution`,
	);
	assert.equal(
		resolved.runtimeSceneManifest.prefabs.length,
		prefabIds.size,
		`${folder} prefab IDs must be unique after shared resolution`,
	);

	for (const assetId of document.level.preload ?? []) {
		assert.ok(assetIds.has(assetId), `${folder} preload ${assetId} exists`);
	}
	for (const assetId of skybox.assets?.preload ?? []) {
		assert.ok(
			assetIds.has(assetId),
			`${folder} skybox preload ${assetId} exists`,
		);
	}
	for (const [groupId, groupAssetIds] of Object.entries(
		document.assets.preloadGroups ?? {},
	)) {
		for (const assetId of groupAssetIds as readonly string[]) {
			assert.ok(
				assetIds.has(assetId),
				`${folder} preload group ${groupId} asset ${assetId} exists`,
			);
		}
	}
	for (const [groupId, groupAssetIds] of Object.entries(
		skybox.assets?.preloadGroups ?? {},
	)) {
		for (const assetId of groupAssetIds as readonly string[]) {
			assert.ok(
				assetIds.has(assetId),
				`${folder} skybox preload group ${groupId} asset ${assetId} exists`,
			);
		}
	}
	for (const prefab of resolved.prefabs) {
		for (const assetId of prefab.assetIds ?? []) {
			assert.ok(
				assetIds.has(assetId),
				`${folder} prefab ${prefab.id} asset ${assetId} exists`,
			);
		}
	}
	for (const instance of resolved.level.instances) {
		assert.ok(
			prefabIds.has(instance.prefabId),
			`${folder} instance ${instance.id} prefab ${instance.prefabId} exists`,
		);
	}
	for (const stableId of [
		document.runtimeScene.readiness.playerStableId,
		...(document.runtimeScene.readiness.requiredCollisionStableIds ?? []),
		...(document.runtimeScene.readiness.requiredWalkableStableIds ?? []),
		...(document.runtimeScene.readiness.requiredLightStableIds ?? []),
	]) {
		assert.ok(
			stableIds.has(stableId),
			`${folder} readiness stable ID ${stableId} exists`,
		);
	}
	for (const assetId of document.runtimeScene.readiness.requiredAssetIds ??
		[]) {
		assert.ok(
			assetIds.has(assetId),
			`${folder} readiness asset ${assetId} exists`,
		);
	}
	const skyboxAssetId = environmentAssetId(skybox.environment);
	if (skybox.environment.requiredForReadiness && skyboxAssetId) {
		assert.ok(
			resolved.runtimeSceneManifest.readiness.requiredAssetIds?.includes(
				skyboxAssetId,
			),
			`${folder} required skybox asset must be composed into runtime readiness`,
		);
	}
	for (const prefabId of document.runtimeScene.readiness
		.requiredCollisionPrefabIds ?? []) {
		assert.ok(
			prefabIds.has(prefabId),
			`${folder} readiness prefab ${prefabId} exists`,
		);
	}

	const serialized = `${JSON.stringify(document, null, "\t")}\n`;
	const serializedSkybox = `${JSON.stringify(skybox, null, "\t")}\n`;
	JSON.parse(serialized);
	JSON.parse(serializedSkybox);

	for (const wrapperFile of wrapperFiles) {
		const source = await readFile(join(levelDir, wrapperFile), "utf8");
		assert.match(
			source,
			/package\.js/,
			`${folder}/${wrapperFile} must route through the data-first package wrapper`,
		);
		assert.doesNotMatch(
			source,
			/loadRuntimeSceneManifest\(\s*{/,
			`${folder}/${wrapperFile} must not rebuild runtime manifests directly`,
		);
		assert.doesNotMatch(
			source,
			/satisfies\s+(LevelDefinition|AssetManifest|PrefabDefinition|RenderProfileData)/,
			`${folder}/${wrapperFile} must not re-own editable level data`,
		);
	}

	const packageSource = await readFile(join(levelDir, "package.ts"), "utf8");
	assert.match(
		packageSource,
		/\.\/skybox\.json/,
		`${folder}/package.ts must compose skybox.json into the level package`,
	);
	if (folder === "observatory") {
		assert.match(
			packageSource,
			/\.\/npcs\/fireflies\.json/,
			"observatory/package.ts must compose local NPC group data into the level package",
		);
		assert.match(
			packageSource,
			/\.\.\/global\/npcs\/firefly\/archetype\.json/,
			"observatory/package.ts must compose the global firefly archetype into the level package",
		);
		assert.match(
			packageSource,
			/\.\/collision\/generated\.json/,
			"observatory/package.ts must compose generated static environment collision data into the level package",
		);
		const npcLightStableIds = new Set(
			runtimeSceneManifest.level.instances
				.filter((instance) => Boolean(instance.components?.Npc))
				.filter((instance) => Boolean(instance.components?.Light))
				.map((instance) => instance.stableId),
		);
		assert.ok(
			runtimeSceneManifest.level.instances.some(
				(instance) =>
					instance.stableId.startsWith(
						"static-environment:observatory_environment_collision:chunk:",
					) && Boolean(instance.components?.Collider),
			),
			"observatory generated static environment collision chunks must resolve as normal Collider instances",
		);
		for (const stableId of [
			"observatory:firefly:archive",
			"observatory:firefly:lantern",
			"observatory:firefly:tide",
		]) {
			assert.ok(
				npcLightStableIds.has(stableId),
				`observatory NPC light ${stableId} must be composed as a normal runtime Light component`,
			);
		}
	}
}

assert.match(
	levelEditorWorkspaceSource,
	/npcGroupLightRows\(\s*workspace\?\.npcPackage\.groups/,
	"level editor lighting workbench must derive object lights from level-owned NPC group data",
);
assert.match(
	levelEditorWorkspaceSource,
	/"Collision"/,
	"level editor must expose a Collision tab for static environment cook inspection",
);
for (const terrainEditorHandle of [
	"Terrain Layers",
	"updateTerrainMaterialField",
	"updateTerrainLayerField",
	"levelTextureAssetOptions",
	"splatTextureId",
	"sourceBaseStrength",
	"detailBlendStrength",
	"Source Base",
	"Detail Blend",
	"metersPerTile",
]) {
	assert.match(
		levelEditorWorkspaceSource,
		new RegExp(terrainEditorHandle),
		`level editor Assets tab must expose ${terrainEditorHandle} for level-owned terrain material data`,
	);
}
assert.match(
	levelEditorWorkspaceSource,
	/collisionPackage\.files/,
	"level editor must derive collision source and generated data from level-owned collision files",
);
assert.match(
	levelEditorWorkspaceSource,
	/checkCollisionCook/,
	"level editor must expose a static environment collision drift check action",
);
assert.match(
	levelEditorWorkspaceSource,
	/cookCollision/,
	"level editor must expose a static environment collision cook action",
);
assert.match(
	levelEditorWorkspaceSource,
	/collisionDiagnostics/,
	"level editor must show static environment collision diagnostics from level-owned files",
);
for (const collisionDiagnosticHandle of [
	"Walkable Triangles",
	"Collision Ratio",
	"Source Bounds",
	"Walkable Bounds",
	"Collision Bounds",
	"Bounds Coverage",
	"boundsCoverageLabel",
	"boundsLabel",
]) {
	assert.match(
		levelEditorWorkspaceSource,
		new RegExp(
			collisionDiagnosticHandle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
		),
		`level editor Collision tab must expose ${collisionDiagnosticHandle}`,
	);
}
assert.match(
	levelEditorWorkspaceSource,
	/dirtyNpcPackageForSave/,
	"level editor saves must include only dirty NPC package files",
);
assert.match(
	levelEditorWorkspaceSource,
	/sourceHashesForSave/,
	"level editor saves must include source hashes for edited source files",
);
assert.doesNotMatch(
	levelEditorWorkspaceSource,
	/npcPackage:\s*workspace\.npcPackage/,
	"level editor saves must not submit the entire NPC package for every save",
);
for (const playerHandle of [
	"Save Player",
	"Player Facing",
	"Initial Camera Direction",
	"Level-Owned Lighting",
	"data.json -> player.light",
	"updatePlayerFacingDegrees",
	"updatePlayerLightField",
	"firstPersonController",
	"yawRadians",
	"pitchRadians",
]) {
	assert.match(
		levelEditorWorkspaceSource,
		new RegExp(playerHandle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
		`level editor Player tab must expose ${playerHandle} as level-owned player direction data`,
	);
}
assert.doesNotMatch(
	levelEditorWorkspaceSource,
	/saveLevel\("player spawn"\)|saveLevel\("player light"\)|aria-label="Player light"/,
	"level editor Player tab must use one player save action and must not duplicate player light in the Lighting tab",
);
assert.doesNotMatch(
	levelEditorWorkspaceSource,
	/PLAYER_PACKAGE_API_PATH|playerPackage|src\/levels\/player\/data\.json/,
	"level editor workspace must not read or present global player package data inside the level editor",
);
assert.match(
	levelEditorWorkspaceSource,
	/NpcEditorPanel/,
	"level editor workspace must delegate the NPC tab to the focused NPC editor panel",
);
assert.match(
	levelEditorWorkspaceSource,
	/updateNpcInstanceLightField/,
	"level editor must route NPC light edits back to NPC instance light overrides",
);
assert.match(
	levelEditorWorkspaceSource,
	/row\.owner !== "npc-instance"/,
	"level editor NPC light rows must not offer light kinds rejected by NPC save validation",
);
for (const editorHandle of [
	"updateInstanceField",
	"updateInstanceRecordField",
	"updateInstanceTransformVector",
	"updateGroupDefaultRecordField",
	"updateGroupLightPeriodValue",
	"npcCollectionSections",
	"updateCollectionField",
	"Placement Mode",
	"Ground Height Offset",
	"Collection Label",
	"Movement Radius",
	"Light Phase",
	"Active Fraction",
	"Blink Min Seconds",
	"Blink Max Seconds",
	"Activation Radius",
	"Conversation Body",
]) {
	assert.match(
		npcEditorSource,
		new RegExp(editorHandle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
		`level editor NPC tab must expose ${editorHandle} controls for level-owned NPC data`,
	);
}
assert.match(
	editorDevApiSource,
	/validateNpcPackageWrite/,
	"editor dev API must validate writable level-owned NPC group payloads",
);
assert.match(
	editorDevApiSource,
	/validateNpcGroupDefaults/,
	"editor dev API must validate writable level-owned NPC group defaults",
);
assert.match(
	editorDevApiSource,
	/validateLevelPlayerFirstPersonController/,
	"editor dev API must validate level-owned player first-person direction overrides",
);
assert.match(
	editorDevApiSource,
	/LEVEL_COLLISION_FILE_NAMES/,
	"editor dev API must expose level-owned collision source files for read-only workspace inspection",
);
assert.match(
	editorDevApiSource,
	/collision\/check/,
	"editor dev API must expose a DEV-only static environment collision drift check action",
);
assert.match(
	editorDevApiSource,
	/collision\/cook/,
	"editor dev API must expose a DEV-only static environment collision cook action",
);
assert.match(
	editorDevApiSource,
	/readStaticEnvironmentCollisionDiagnostics/,
	"editor dev API must report hash-based static environment collision diagnostics",
);
assert.match(
	editorDevApiSource,
	/writeLevelNpcGroupFiles/,
	"editor dev API must persist edited level-owned NPC group files",
);
assert.match(
	editorDevApiSource,
	/validateNpcPackageWrite/,
	"editor dev API must validate partial NPC package writes",
);
assert.match(
	editorDevApiSource,
	/submittedGroup\.sourceHash !== currentGroup\.sourceHash/,
	"editor dev API must reject stale NPC group source writes",
);
assert.match(
	editorDevApiSource,
	/assertSourceFileCurrent\(body\.sourceHashes, workspace\.files, "data\.json"\)/,
	"editor dev API must reject stale data.json document writes",
);
assert.match(
	editorDevApiSource,
	/assertSourceFileCurrent\(\s*body\.sourceHashes,\s*workspace\.files,\s*"skybox\.json",?\s*\)/,
	"editor dev API must reject stale skybox.json document writes",
);
assert.match(
	editorDevApiSource,
	/validateNpcLightOverride/,
	"editor dev API must validate partial NPC light overrides without requiring duplicated archetype defaults",
);
assert.match(
	editorDevApiSource,
	/validateSpriteAssetParameters/,
	"editor dev API must accept engine-owned sprite assets when discovering level NPC packages",
);
assert.match(
	editorDevApiSource,
	/SUPPORTED_ASSET_KINDS[\s\S]*"sprite"/,
	"editor dev API supported asset kinds must include engine-owned sprite assets",
);
for (const materialValidatorHandle of [
	"validateMaterialParameters",
	"validateTerrainMaterialParameters",
	"validateMaterialTextureReferences",
	"SUPPORTED_TERRAIN_LAYER_CHANNELS",
	"sourceBaseStrength",
	"detailBlendStrength",
]) {
	assert.match(
		editorDevApiSource,
		new RegExp(materialValidatorHandle),
		`editor dev API must validate ${materialValidatorHandle} before saving level-owned material data`,
	);
}
for (const validatorHandle of [
	"validateNpcMovementOverride",
	"validateNpcLightModulationOverride",
	"validateNpcInteractionOverride",
	"validateNpcConversation",
]) {
	assert.match(
		editorDevApiSource,
		new RegExp(validatorHandle),
		`editor dev API must validate ${validatorHandle} before saving level-owned NPC data`,
	);
}

const portalArena = levelPackageRouter.getRuntimeSceneManifest(
	"portal_arena_runtime",
);
assert.ok(portalArena, "portal arena runtime scene must exist");
assert.equal(
	portalArena.level.instances.filter((instance) =>
		Boolean(instance.components?.Portal),
	).length,
	8,
	"portal arena portal slots must be flattened into editable instances",
);

const mirandaDeck = levelPackageRouter.getRuntimeSceneManifest(
	"miranda_deck_runtime",
);
assert.ok(mirandaDeck, "Miranda runtime scene must exist");
assert.ok(
	mirandaDeck.level.instances.some((instance) =>
		Boolean(instance.components?.StoryNote),
	),
	"Miranda story notes must be flattened into editable instance components",
);

console.log(
	`Level editor workspace contract passed for ${folders.length} level packages.`,
);

function environmentAssetId(environment: unknown): string | undefined {
	return typeof environment === "object" &&
		environment !== null &&
		"assetId" in environment &&
		typeof environment.assetId === "string"
		? environment.assetId
		: undefined;
}
