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
		const npcLightStableIds = new Set(
			runtimeSceneManifest.level.instances
				.filter((instance) => Boolean(instance.components?.Npc))
				.filter((instance) => Boolean(instance.components?.Light))
				.map((instance) => instance.stableId),
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
	/npcPackage:\s*workspace\.npcPackage/,
	"level editor saves must include edited NPC package data",
);
assert.match(
	levelEditorWorkspaceSource,
	/savedNpcPackage/,
	"level editor dirty state must include editable NPC package changes",
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
	"updateNpcInstanceField",
	"updateNpcInstanceRecordField",
	"updateNpcInstanceTransformVector",
	"Movement Radius",
	"Light Phase",
	"Activation Radius",
	"Conversation Body",
]) {
	assert.match(
		levelEditorWorkspaceSource,
		new RegExp(editorHandle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
		`level editor NPC tab must expose ${editorHandle} controls for level-owned NPC data`,
	);
}
assert.match(
	editorDevApiSource,
	/validateWritableNpcPackage/,
	"editor dev API must validate writable level-owned NPC group payloads",
);
assert.match(
	editorDevApiSource,
	/writeLevelNpcGroupFiles/,
	"editor dev API must persist edited level-owned NPC group files",
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
