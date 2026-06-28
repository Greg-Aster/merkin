import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const GLOBAL_SETTINGS_API_PATH = "/__megameal-editor-api/global-settings";
const LEVELS_API_PATH = "/__megameal-editor-api/levels";
const PLAYER_PACKAGE_API_PATH = "/__megameal-editor-api/player-package";
const APP_ROOT_PATH = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_DIR_PATH = fileURLToPath(new URL("../public", import.meta.url));
const GLOBAL_SETTINGS_FILE_PATH = fileURLToPath(
	new URL("../src/levels/global/settings.ts", import.meta.url),
);
const GLOBAL_SETTINGS_DISPLAY_PATH = "src/levels/global/settings.ts";
const PLAYER_PACKAGE_FILE_PATH = fileURLToPath(
	new URL("../src/levels/player/data.json", import.meta.url),
);
const PLAYER_PACKAGE_DISPLAY_PATH = "src/levels/player/data.json";
const LEVELS_DIR_PATH = fileURLToPath(
	new URL("../src/levels", import.meta.url),
);
const PUBLIC_LEVEL_ASSETS_DIR_PATH = fileURLToPath(
	new URL("../public/assets/game/levels", import.meta.url),
);
const LEVEL_FILE_NAMES = [
	"data.json",
	"skybox.json",
	"package.ts",
	"level.ts",
	"manifest.ts",
	"assets.ts",
	"prefabs.ts",
	"renderProfile.ts",
	"index.ts",
];
const LEVEL_NPC_DIR_NAME = "npcs";
const LEVEL_COLLISION_DIR_NAME = "collision";
const LEVEL_COLLISION_FILE_NAMES = ["source.json", "generated.json"];
const SHARED_ASSET_IDS = new Set([
	"mesh_player",
	"material_player",
	"audio_player_jump",
	"audio_player_charge_release",
	"cubemap_classic_sky",
	"cubemap_observatory_sky",
	"texture_sample_equirectangular_sky",
	"video_sample_equirectangular_sky",
	"audio_ambient_dark_shadows_of_delight",
	"audio_ambient_shadow_waltz",
	"audio_ambient_whistling_dreams",
	"audio_portal_activate",
	"mesh_portal_gate",
	"mesh_water_plane",
	"material_water_dark_still",
]);
const SHARED_PREFAB_IDS = new Set([
	"player",
	"portal_gate",
	"water_surface_plane",
]);
const ALLOWED_UPLOAD_EXTENSIONS = new Set([
	".glb",
	".gltf",
	".png",
	".jpg",
	".jpeg",
	".webp",
	".mp3",
	".wav",
	".ogg",
	".webm",
	".json",
]);
const SUPPORTED_ASSET_KINDS = new Set([
	"mesh",
	"material",
	"sprite",
	"texture",
	"cubemap",
	"video",
	"audio",
	"animation",
	"prefab",
	"scene",
	"data",
]);
const SUPPORTED_SPRITE_STAR_TYPES = new Set([
	"point",
	"sparkle",
	"halo",
	"classic",
]);

export function megamealEditorDevApi() {
	return {
		name: "megameal-editor-dev-api",
		apply: "serve",
		configureServer(server) {
			server.middlewares.use(GLOBAL_SETTINGS_API_PATH, async (req, res) => {
				try {
					await handleGlobalSettingsRequest(req, res);
				} catch (error) {
					sendJson(res, 500, { error: errorMessage(error) });
				}
			});
			server.middlewares.use(LEVELS_API_PATH, async (req, res) => {
				try {
					await handleLevelsRequest(req, res);
				} catch (error) {
					sendJson(res, 500, { error: errorMessage(error) });
				}
			});
			server.middlewares.use(PLAYER_PACKAGE_API_PATH, async (req, res) => {
				try {
					await handlePlayerPackageRequest(req, res);
				} catch (error) {
					sendJson(res, 500, { error: errorMessage(error) });
				}
			});
		},
	};
}

async function handleGlobalSettingsRequest(req, res) {
	if (req.method === "GET") {
		const source = await readFile(GLOBAL_SETTINGS_FILE_PATH, "utf8");
		sendJson(res, 200, {
			settings: readGlobalSettings(source),
			filePath: GLOBAL_SETTINGS_DISPLAY_PATH,
			absoluteFilePath: relative(process.cwd(), GLOBAL_SETTINGS_FILE_PATH),
		});
		return;
	}

	if (req.method === "POST") {
		const body = await readJsonBody(req);
		const nextSettings = validateGlobalSettings(body);
		const source = await readFile(GLOBAL_SETTINGS_FILE_PATH, "utf8");
		const nextSource = writeGlobalSettingsSource(source, nextSettings);
		await writeFile(GLOBAL_SETTINGS_FILE_PATH, nextSource, "utf8");
		sendJson(res, 200, {
			settings: nextSettings,
			filePath: GLOBAL_SETTINGS_DISPLAY_PATH,
			absoluteFilePath: relative(process.cwd(), GLOBAL_SETTINGS_FILE_PATH),
		});
		return;
	}

	if (req.method === "OPTIONS") {
		res.statusCode = 204;
		res.end();
		return;
	}

	sendJson(res, 405, { error: `Unsupported method ${req.method}.` });
}

async function handlePlayerPackageRequest(req, res) {
	if (req.method === "GET") {
		const playerPackage = validatePlayerPackageConfig(
			JSON.parse(await readFile(PLAYER_PACKAGE_FILE_PATH, "utf8")),
		);
		sendJson(res, 200, {
			playerPackage,
			filePath: PLAYER_PACKAGE_DISPLAY_PATH,
			absoluteFilePath: relative(process.cwd(), PLAYER_PACKAGE_FILE_PATH),
		});
		return;
	}

	if (req.method === "POST") {
		const body = await readJsonBody(req);
		const playerPackage = validatePlayerPackageConfig(
			body.playerPackage ?? body,
		);
		await writeFile(
			PLAYER_PACKAGE_FILE_PATH,
			serializeJson(playerPackage),
			"utf8",
		);
		sendJson(res, 200, {
			playerPackage,
			filePath: PLAYER_PACKAGE_DISPLAY_PATH,
			absoluteFilePath: relative(process.cwd(), PLAYER_PACKAGE_FILE_PATH),
		});
		return;
	}

	if (req.method === "OPTIONS") {
		res.statusCode = 204;
		res.end();
		return;
	}

	sendJson(res, 405, { error: `Unsupported method ${req.method}.` });
}

async function handleLevelsRequest(req, res) {
	const pathParts = requestPathname(req).split("/").filter(Boolean);
	const runtimeSceneId = pathParts[0];
	const action = pathParts.slice(1).join("/");

	if (req.method === "GET" && !runtimeSceneId) {
		sendJson(res, 200, { levels: await listLevelSummaries() });
		return;
	}

	if (req.method === "GET" && runtimeSceneId) {
		sendJson(res, 200, await readLevelWorkspace(runtimeSceneId));
		return;
	}

	if (req.method === "POST" && runtimeSceneId && action === "assets/upload") {
		const workspace = await readLevelWorkspace(runtimeSceneId);
		const upload = validateAssetUpload(await readJsonBody(req));
		const uploadFolder = join(
			PUBLIC_LEVEL_ASSETS_DIR_PATH,
			workspace.folderName,
		);
		await mkdir(uploadFolder, { recursive: true });
		const filePath = join(uploadFolder, upload.fileName);
		await writeFile(filePath, Buffer.from(upload.contentBase64, "base64"));
		sendJson(res, 200, {
			fileName: upload.fileName,
			url: `/assets/game/levels/${workspace.folderName}/${upload.fileName}`,
			path: relative(process.cwd(), filePath),
		});
		return;
	}

	if (
		req.method === "POST" &&
		runtimeSceneId &&
		(action === "collision/check" || action === "collision/cook")
	) {
		const workspace = await readLevelWorkspace(runtimeSceneId);
		const result = runStaticEnvironmentCollisionCook({
			level: workspace.folderName,
			check: action === "collision/check",
		});

		if (action === "collision/check") {
			sendJson(res, 200, {
				status: result.ok ? "current" : "stale",
				output: result.output,
				error: result.error,
				workspace: await readLevelWorkspace(runtimeSceneId),
			});
			return;
		}

		if (!result.ok) {
			throw new Error(
				result.error || "Static environment collision cook failed.",
			);
		}

		sendJson(res, 200, {
			status: "cooked",
			output: result.output,
			workspace: await readLevelWorkspace(runtimeSceneId),
		});
		return;
	}

	if (req.method === "POST" && runtimeSceneId) {
		const workspace = await readLevelWorkspace(runtimeSceneId);
		const body = await readJsonBody(req);
		const nextNpcPackage =
			body.npcPackage === undefined
				? workspace.npcPackage
				: validateWritableNpcPackage(body.npcPackage, workspace.npcPackage);
		const nextData = validateLevelPackageData(
			body.document ?? body,
			nextNpcPackage,
		);
		await assertUniqueLevelPackageData(workspace.runtimeSceneId, nextData);
		const { skybox, ...levelData } = nextData;
		await writeFile(
			join(workspace.absoluteFolderPath, "data.json"),
			serializeJson(levelData),
			"utf8",
		);
		await writeFile(
			join(workspace.absoluteFolderPath, "skybox.json"),
			serializeJson(skybox),
			"utf8",
		);
		await writeLevelNpcGroupFiles(nextNpcPackage);
		sendJson(res, 200, await readLevelWorkspace(nextData.runtimeScene.id));
		return;
	}

	if (req.method === "OPTIONS") {
		res.statusCode = 204;
		res.end();
		return;
	}

	sendJson(res, 405, { error: `Unsupported method ${req.method}.` });
}

async function listLevelSummaries() {
	const folders = await levelFolders();
	const summaries = [];

	for (const folderPath of folders) {
		try {
			summaries.push(await readLevelSummary(folderPath));
		} catch {
			// Skip non-level package folders; detailed reads report exact failures.
		}
	}

	return summaries.sort((left, right) =>
		left.levelId.localeCompare(right.levelId),
	);
}

async function readLevelWorkspace(runtimeSceneId) {
	const summaries = await listLevelSummaries();
	const summary = summaries.find(
		(level) => level.runtimeSceneId === runtimeSceneId,
	);

	if (!summary) {
		throw new Error(`Unknown runtime scene "${runtimeSceneId}".`);
	}

	const files = await readLevelSourceFiles(
		summary.absoluteFolderPath,
		summary.npcPackage,
		summary.collisionPackage,
	);

	return {
		...summary,
		files,
		npcPackage: summary.npcPackage,
		collisionPackage: summary.collisionPackage,
		document: summary.document,
		editable: editableOverview(summary.document),
		diagnostics: validateLevelPackageDocument(
			summary.document,
			summary.npcPackage,
		),
	};
}

async function readLevelSummary(folderPath) {
	const levelData = JSON.parse(
		await readFile(join(folderPath, "data.json"), "utf8"),
	);
	const skybox = JSON.parse(
		await readFile(join(folderPath, "skybox.json"), "utf8"),
	);
	const npcPackage = await readLevelNpcPackage(folderPath);
	const collisionPackage = await readLevelCollisionPackage(folderPath);
	const document = validateLevelPackageData(
		{ ...levelData, skybox },
		npcPackage,
	);

	return {
		folderName: basename(folderPath),
		folderPath: relative(process.cwd(), folderPath),
		absoluteFolderPath: folderPath,
		levelId: document.level.id,
		sceneId: document.level.sceneId ?? "",
		runtimeSceneId: document.runtimeScene.id,
		sourceId: document.runtimeScene.source.id,
		skyboxAssetId: environmentAssetId(document.skybox.environment) ?? "",
		skyboxBlur: document.skybox.environment.backgroundBlurriness ?? 0,
		npcPackage,
		collisionPackage,
		document,
	};
}

async function readLevelSourceFiles(folderPath, npcPackage, collisionPackage) {
	const files = [];

	for (const name of LEVEL_FILE_NAMES) {
		const path = join(folderPath, name);
		files.push({
			name,
			path: relative(process.cwd(), path),
			source: await readFile(path, "utf8"),
		});
	}

	for (const group of npcPackage.groups) {
		files.push({
			name: group.name,
			path: group.path,
			source: await readFile(group.absolutePath, "utf8"),
		});
	}

	for (const archetype of npcPackage.archetypes) {
		files.push({
			name: archetype.name,
			path: archetype.path,
			source: await readFile(archetype.absolutePath, "utf8"),
		});
	}

	for (const collisionFile of collisionPackage.files) {
		files.push({
			name: collisionFile.name,
			path: collisionFile.path,
			source: await readFile(collisionFile.absolutePath, "utf8"),
		});
	}

	return files;
}

async function readLevelCollisionPackage(folderPath) {
	const collisionDir = join(folderPath, LEVEL_COLLISION_DIR_NAME);
	const files = [];

	for (const fileName of LEVEL_COLLISION_FILE_NAMES) {
		const absolutePath = join(collisionDir, fileName);

		if (!existsSync(absolutePath)) {
			continue;
		}

		files.push({
			name: `${LEVEL_COLLISION_DIR_NAME}/${fileName}`,
			path: relative(process.cwd(), absolutePath),
			absolutePath,
			data: JSON.parse(await readFile(absolutePath, "utf8")),
		});
	}

	return {
		files,
		diagnostics: await readStaticEnvironmentCollisionDiagnostics(files),
	};
}

async function readStaticEnvironmentCollisionDiagnostics(files) {
	const sourceFile = files.find((file) => file.name.endsWith("source.json"));
	const generatedFile = files.find((file) =>
		file.name.endsWith("generated.json"),
	);

	if (!sourceFile) {
		return {
			status: "missing-source",
			message: "No collision/source.json file exists for this level.",
		};
	}

	if (!generatedFile) {
		return {
			status: "missing-generated",
			message: "No collision/generated.json file exists for this level.",
		};
	}

	try {
		const source = sourceFile.data;
		const generated = generatedFile.data;
		const sourceAssetUrl =
			source.mode === "manual-collision-glb" && source.collisionAssetUrl
				? source.collisionAssetUrl
				: source.visualAssetUrl;

		if (typeof sourceAssetUrl !== "string" || !sourceAssetUrl.startsWith("/")) {
			throw new Error("collision source asset URL must be root-relative.");
		}

		const sourceAssetPath = join(PUBLIC_DIR_PATH, sourceAssetUrl.slice(1));
		if (!existsSync(sourceAssetPath)) {
			return {
				status: "missing-source-asset",
				message: `Collision source asset does not exist: ${sourceAssetUrl}`,
				sourceAssetUrl,
				generatedSourceHash: generated.source?.sourceHash,
			};
		}

		const currentSourceHash = `sha256:${sha256(await readFile(sourceAssetPath))}`;
		const generatedSourceHash = generated.source?.sourceHash;

		return {
			status: currentSourceHash === generatedSourceHash ? "current" : "stale",
			message:
				currentSourceHash === generatedSourceHash
					? "Generated collision matches the current source asset hash."
					: "Generated collision is stale for the current source asset hash.",
			sourceAssetUrl,
			currentSourceHash,
			generatedSourceHash,
			generatedAt: generated.generatedAt,
			chunkCount: generated.summary?.chunkCount,
			triangleCount: generated.summary?.triangleCount,
		};
	} catch (error) {
		return {
			status: "invalid",
			message: errorMessage(error),
		};
	}
}

function runStaticEnvironmentCollisionCook({ level, check }) {
	const args = [
		"--dir",
		APP_ROOT_PATH,
		"cook:static-environment-collision",
		"--",
		`--level=${level}`,
		...(check ? ["--check"] : []),
	];

	try {
		const output = execFileSync("pnpm", args, {
			cwd: APP_ROOT_PATH,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
		return { ok: true, output };
	} catch (error) {
		const stdout = typeof error.stdout === "string" ? error.stdout : "";
		const stderr = typeof error.stderr === "string" ? error.stderr : "";
		return {
			ok: false,
			output: `${stdout}${stderr}`.trim(),
			error: errorMessage(error),
		};
	}
}

async function readLevelNpcPackage(folderPath) {
	const groups = await readLevelNpcGroups(folderPath);
	const archetypeIds = unique(
		groups
			.map((group) => group.data.archetype)
			.filter((id) => typeof id === "string" && id.length > 0),
	);
	const archetypes = [];

	for (const archetypeId of archetypeIds) {
		archetypes.push(await readGlobalNpcArchetype(archetypeId));
	}

	return {
		groups,
		archetypes,
	};
}

async function readLevelNpcGroups(folderPath) {
	try {
		const npcDir = join(folderPath, LEVEL_NPC_DIR_NAME);
		const entries = await readdir(npcDir, { withFileTypes: true });
		const groups = [];

		for (const entry of entries) {
			if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".json") {
				continue;
			}

			const absolutePath = join(npcDir, entry.name);
			groups.push({
				name: `${LEVEL_NPC_DIR_NAME}/${entry.name}`,
				path: relative(process.cwd(), absolutePath),
				absolutePath,
				data: JSON.parse(await readFile(absolutePath, "utf8")),
			});
		}

		return groups.sort((left, right) => left.name.localeCompare(right.name));
	} catch {
		return [];
	}
}

async function readGlobalNpcArchetype(archetypeId) {
	const absolutePath = join(
		LEVELS_DIR_PATH,
		"global",
		LEVEL_NPC_DIR_NAME,
		archetypeId,
		"archetype.json",
	);

	return {
		name: `global/${LEVEL_NPC_DIR_NAME}/${archetypeId}/archetype.json`,
		path: relative(process.cwd(), absolutePath),
		absolutePath,
		data: JSON.parse(await readFile(absolutePath, "utf8")),
	};
}

async function levelFolders() {
	const entries = await readdir(LEVELS_DIR_PATH, { withFileTypes: true });

	return entries
		.filter(
			(entry) =>
				entry.isDirectory() &&
				entry.name !== "global" &&
				entry.name !== "player",
		)
		.map((entry) => join(LEVELS_DIR_PATH, entry.name));
}

function editableOverview(document) {
	return {
		levelId: document.level.id,
		sceneId: document.level.sceneId ?? "",
		runtimeSceneId: document.runtimeScene.id,
		sourceId: document.runtimeScene.source.id,
		skyboxAssetId: environmentAssetId(document.skybox.environment),
		skyboxBlur: document.skybox.environment.backgroundBlurriness ?? 0,
		playerStableId: document.runtimeScene.readiness.playerStableId,
		characterBounds: document.level.resources?.["game:characterBounds"],
	};
}

function validateLevelPackageData(value, npcPackage = emptyNpcPackage()) {
	const diagnostics = validateLevelPackageDocument(value, npcPackage);

	if (diagnostics.length > 0) {
		throw new Error(diagnostics.join("; "));
	}

	return value;
}

function validateWritableNpcPackage(value, currentNpcPackage) {
	if (!isObject(value) || !Array.isArray(value.groups)) {
		throw new Error("npcPackage.groups must be an array.");
	}
	const submittedGroupsByName = new Map(
		value.groups
			.filter((group) => isObject(group) && typeof group.name === "string")
			.map((group) => [group.name, group]),
	);
	const nextGroups = currentNpcPackage.groups.map((currentGroup) => {
		const submittedGroup = submittedGroupsByName.get(currentGroup.name);
		if (!submittedGroup) {
			throw new Error(`npcPackage.groups is missing ${currentGroup.name}.`);
		}
		if (submittedGroup.path !== currentGroup.path) {
			throw new Error(
				`npcPackage.groups.${currentGroup.name} path does not match the level-owned NPC file.`,
			);
		}
		return {
			...currentGroup,
			data: submittedGroup.data,
		};
	});
	if (nextGroups.length !== value.groups.length) {
		throw new Error("npcPackage.groups contains an unknown NPC group file.");
	}

	const nextNpcPackage = {
		groups: nextGroups,
		archetypes: currentNpcPackage.archetypes,
	};
	const errors = [];
	validateNpcPackage(nextNpcPackage, errors);
	if (errors.length > 0) {
		throw new Error(errors.join("; "));
	}

	return nextNpcPackage;
}

async function writeLevelNpcGroupFiles(npcPackage) {
	for (const group of npcPackage.groups) {
		await writeFile(group.absolutePath, serializeJson(group.data), "utf8");
	}
}

function validateLevelPackageDocument(value, npcPackage = emptyNpcPackage()) {
	const errors = [];

	if (!isObject(value)) {
		return ["Level document must be an object."];
	}

	validateSnakeId(value.id, "document.id", errors);
	validateRuntimeScene(value.runtimeScene, errors);
	validateLevel(value.level, errors);
	validateAssets(value.assets, errors);
	validatePrefabs(value.prefabs, errors);
	validateAudio(value.audio, errors);
	validateSkybox(value.skybox, errors);
	validateRenderProfile(value.renderProfile, errors);
	validateLevelPlayer(value.player, errors);
	validateNpcPackage(npcPackage, errors);

	if (errors.length === 0) {
		validateCrossReferences(value, errors, npcPackage);
	}

	return errors;
}

function emptyNpcPackage() {
	return {
		groups: [],
		archetypes: [],
	};
}

function validateRuntimeScene(value, errors) {
	if (!isObject(value)) {
		errors.push("runtimeScene must be an object.");
		return;
	}

	if (value.schemaVersion !== 1) {
		errors.push("runtimeScene.schemaVersion must be 1.");
	}

	validateRuntimeSceneId(value.id, "runtimeScene.id", errors);
	if (typeof value.generatedAt !== "string" || !value.generatedAt) {
		errors.push("runtimeScene.generatedAt must be a non-empty string.");
	}

	if (!isObject(value.source)) {
		errors.push("runtimeScene.source must be an object.");
	} else {
		if (
			value.source.kind !== "prototype" &&
			value.source.kind !== "authored" &&
			value.source.kind !== "cook"
		) {
			errors.push(
				"runtimeScene.source.kind must be prototype, authored, or cook.",
			);
		}
		if (typeof value.source.id !== "string" || !value.source.id) {
			errors.push("runtimeScene.source.id must be a non-empty string.");
		}
	}

	if (!isObject(value.readiness)) {
		errors.push("runtimeScene.readiness must be an object.");
		return;
	}

	validateStableId(
		value.readiness.playerStableId,
		"runtimeScene.readiness.playerStableId",
		errors,
	);
	for (const key of [
		"requiredAssetIds",
		"requiredCollisionPrefabIds",
		"requiredCollisionStableIds",
		"requiredWalkableStableIds",
		"requiredLightStableIds",
	]) {
		validateOptionalStringArray(
			value.readiness[key],
			`runtimeScene.readiness.${key}`,
			errors,
		);
	}
}

function validateLevel(value, errors) {
	if (!isObject(value)) {
		errors.push("level must be an object.");
		return;
	}

	validateSnakeId(value.id, "level.id", errors);
	if (value.sceneId !== undefined) {
		validateSnakeId(value.sceneId, "level.sceneId", errors);
	}
	validateOptionalStringArray(value.preload, "level.preload", errors);
	validateOptionalStringArray(
		value.preloadGroups,
		"level.preloadGroups",
		errors,
	);
	if (value.resources !== undefined && !isObject(value.resources)) {
		errors.push("level.resources must be an object.");
	}
	if (!Array.isArray(value.instances)) {
		errors.push("level.instances must be an array.");
		return;
	}
	validateUniqueIds(
		value.instances.map((instance) => instance?.id),
		"level.instances.id",
		errors,
	);
	validateUniqueIds(
		value.instances.map((instance) => instance?.stableId),
		"level.instances.stableId",
		errors,
	);
	for (const [index, instance] of value.instances.entries()) {
		validateInstance(instance, `level.instances.${index}`, errors);
	}
}

function validateInstance(value, path, errors) {
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	validateId(value.id, `${path}.id`, errors);
	validateId(value.prefabId, `${path}.prefabId`, errors);
	validateStableId(value.stableId, `${path}.stableId`, errors);
	if (value.transform !== undefined) {
		validateTransform(value.transform, `${path}.transform`, errors);
	}
	if (value.components !== undefined && !isObject(value.components)) {
		errors.push(`${path}.components must be an object.`);
	} else if (value.components !== undefined) {
		validateLightComponent(
			value.components.Light,
			`${path}.components.Light`,
			errors,
		);
	}
}

function validateAssets(value, errors) {
	if (!isObject(value)) {
		errors.push("assets must be an object.");
		return;
	}
	validateOptionalStringArray(value.shared, "assets.shared", errors);
	if (!Array.isArray(value.local)) {
		errors.push("assets.local must be an array.");
		return;
	}
	validateUniqueIds(
		value.local.map((asset) => asset?.id),
		"assets.local.id",
		errors,
	);
	for (const [index, asset] of value.local.entries()) {
		validateAsset(asset, `assets.local.${index}`, errors);
	}
	if (value.preloadGroups !== undefined && !isObject(value.preloadGroups)) {
		errors.push("assets.preloadGroups must be an object.");
	}
}

function validateAsset(value, path, errors) {
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	validateId(value.id, `${path}.id`, errors);
	if (!SUPPORTED_ASSET_KINDS.has(value.kind)) {
		errors.push(`${path}.kind is not a supported asset kind.`);
	}
	if (typeof value.url !== "string" || !value.url) {
		errors.push(`${path}.url must be a non-empty string.`);
	}
	validateOptionalStringArray(value.tags, `${path}.tags`, errors);
	if (value.kind === "sprite") {
		validateSpriteAssetParameters(value.sprite, `${path}.sprite`, errors);
	} else if (value.sprite !== undefined) {
		errors.push(`${path}.sprite is only supported for sprite assets.`);
	}
}

function validateSpriteAssetParameters(value, path, errors) {
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateHexColor(value.color, `${path}.color`, errors);
	validatePositiveNumber(value.size, `${path}.size`, errors);

	if (value.opacity !== undefined) {
		validateAlpha(value.opacity, `${path}.opacity`, errors);
	}
	for (const key of ["intensity", "glow"]) {
		if (value[key] !== undefined) {
			validateNonNegativeNumber(value[key], `${path}.${key}`, errors);
		}
	}
	if (
		value.starType !== undefined &&
		!SUPPORTED_SPRITE_STAR_TYPES.has(value.starType)
	) {
		errors.push(`${path}.starType must be point, sparkle, halo, or classic.`);
	}
	if (value.depthTest !== undefined && typeof value.depthTest !== "boolean") {
		errors.push(`${path}.depthTest must be a boolean when provided.`);
	}
	if (value.renderOrder !== undefined) {
		validateFiniteNumber(value.renderOrder, `${path}.renderOrder`, errors);
	}
}

function validatePrefabs(value, errors) {
	if (!isObject(value)) {
		errors.push("prefabs must be an object.");
		return;
	}
	validateOptionalStringArray(value.shared, "prefabs.shared", errors);
	if (!Array.isArray(value.local)) {
		errors.push("prefabs.local must be an array.");
		return;
	}
	validateUniqueIds(
		value.local.map((prefab) => prefab?.id),
		"prefabs.local.id",
		errors,
	);
	for (const [index, prefab] of value.local.entries()) {
		validatePrefab(prefab, `prefabs.local.${index}`, errors);
	}
}

function validatePrefab(value, path, errors) {
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	validateId(value.id, `${path}.id`, errors);
	validateOptionalStringArray(value.assetIds, `${path}.assetIds`, errors);
	validateOptionalStringArray(value.tags, `${path}.tags`, errors);
	if (!isObject(value.components)) {
		errors.push(`${path}.components must be an object.`);
	} else {
		validateLightComponent(
			value.components.Light,
			`${path}.components.Light`,
			errors,
		);
	}
}

function validateAudio(value, errors) {
	if (!isObject(value)) {
		errors.push("audio must be an object.");
		return;
	}
	if (!Array.isArray(value.eventMappings)) {
		errors.push("audio.eventMappings must be an array.");
	} else {
		validateUniqueIds(
			value.eventMappings.map((mapping) => mapping?.id),
			"audio.eventMappings.id",
			errors,
		);
		for (const [index, mapping] of value.eventMappings.entries()) {
			validateAudioEventMapping(
				mapping,
				`audio.eventMappings.${index}`,
				errors,
			);
		}
	}
	if (value.sceneMusic !== undefined && !isObject(value.sceneMusic)) {
		errors.push("audio.sceneMusic must be an object.");
	}
}

function validateAudioEventMapping(value, path, errors) {
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	validateId(value.id, `${path}.id`, errors);
	if (typeof value.eventType !== "string" || !value.eventType) {
		errors.push(`${path}.eventType must be a non-empty string.`);
	}
	validateId(value.soundId, `${path}.soundId`, errors);
	if (value.sceneId !== undefined) {
		validateSnakeId(value.sceneId, `${path}.sceneId`, errors);
	}
	if (value.volume !== undefined) {
		validateNonNegativeNumber(value.volume, `${path}.volume`, errors);
	}
	if (value.loop !== undefined && typeof value.loop !== "boolean") {
		errors.push(`${path}.loop must be a boolean.`);
	}
}

function validateRenderProfile(value, errors) {
	if (!isObject(value)) {
		errors.push("renderProfile must be an object.");
		return;
	}
	validateId(value.id, "renderProfile.id", errors);
	if (!isObject(value.renderer)) {
		errors.push("renderProfile.renderer must be an object.");
	}
	if (!isObject(value.lighting) || !Array.isArray(value.lighting.lights)) {
		errors.push("renderProfile.lighting.lights must be an array.");
	} else {
		for (const [index, light] of value.lighting.lights.entries()) {
			validateRenderProfileLight(
				light,
				`renderProfile.lighting.lights.${index}`,
				errors,
			);
		}
	}
	if (value.environment !== undefined) {
		errors.push(
			"renderProfile.environment must be omitted from data.json and owned by skybox.json.",
		);
	}
}

function validateRenderProfileLight(value, path, errors) {
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	if (value.kind !== "ambient" && value.kind !== "directional") {
		errors.push(`${path}.kind must be ambient or directional.`);
		return;
	}
	validateHexColor(value.color, `${path}.color`, errors);
	validateNonNegativeNumber(value.intensity, `${path}.intensity`, errors);
	if (value.kind === "directional") {
		validateNumberTuple(value.position, 3, `${path}.position`, errors);
	}
}

function validateLevelPlayer(value, errors) {
	if (value === undefined) {
		return;
	}
	if (!isObject(value)) {
		errors.push("player must be an object.");
		return;
	}

	if (value.transform !== undefined) {
		validateTransform(value.transform, "player.transform", errors);
	}

	if (value.groundY !== undefined) {
		validateFiniteNumber(value.groundY, "player.groundY", errors);
	}

	if (value.firstPersonController !== undefined) {
		validateLevelPlayerFirstPersonController(
			value.firstPersonController,
			errors,
		);
	}

	if (value.light !== undefined && value.light !== false) {
		validateLightComponent(value.light, "player.light", errors, {
			allowedKinds: ["point"],
		});
	}
}

function validateLevelPlayerFirstPersonController(value, errors) {
	if (!isObject(value)) {
		errors.push("player.firstPersonController must be an object.");
		return;
	}

	for (const key of ["yawRadians", "pitchRadians"]) {
		if (value[key] !== undefined) {
			validateFiniteNumber(
				value[key],
				`player.firstPersonController.${key}`,
				errors,
			);
		}
	}
}

function validateLightComponent(value, path, errors, options = {}) {
	if (value === undefined) {
		return;
	}
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	const allowedKinds = options.allowedKinds ?? [
		"ambient",
		"directional",
		"point",
		"spot",
	];
	if (!allowedKinds.includes(value.kind)) {
		errors.push(`${path}.kind must be ${allowedKinds.join(", ")}.`);
		return;
	}
	validateHexColor(value.color, `${path}.color`, errors);
	validateNonNegativeNumber(value.intensity, `${path}.intensity`, errors);
	if (value.visible !== undefined && typeof value.visible !== "boolean") {
		errors.push(`${path}.visible must be a boolean.`);
	}
	if (value.kind === "point" || value.kind === "spot") {
		validateNonNegativeNumber(value.distance, `${path}.distance`, errors);
		validateNonNegativeNumber(value.decay, `${path}.decay`, errors);
	}
	if (value.kind === "spot") {
		validateNonNegativeNumber(value.angle, `${path}.angle`, errors);
		validateNonNegativeNumber(value.penumbra, `${path}.penumbra`, errors);
	}
}

function validateSkybox(value, errors) {
	if (!isObject(value)) {
		errors.push("skybox must be an object.");
		return;
	}
	if (value.schemaVersion !== 1) {
		errors.push("skybox.schemaVersion must be 1.");
	}
	if (!isObject(value.environment)) {
		errors.push("skybox.environment must be an object.");
	} else {
		validateSkyboxEnvironment(value.environment, errors);
	}
	if (value.assets !== undefined) {
		if (!isObject(value.assets)) {
			errors.push("skybox.assets must be an object.");
		} else {
			validateOptionalStringArray(
				value.assets.shared,
				"skybox.assets.shared",
				errors,
			);
			validateOptionalStringArray(
				value.assets.preload,
				"skybox.assets.preload",
				errors,
			);
			if (value.assets.local !== undefined) {
				if (!Array.isArray(value.assets.local)) {
					errors.push("skybox.assets.local must be an array.");
				} else {
					validateUniqueIds(
						value.assets.local.map((asset) => asset?.id),
						"skybox.assets.local.id",
						errors,
					);
					for (const [index, asset] of value.assets.local.entries()) {
						validateAsset(asset, `skybox.assets.local.${index}`, errors);
					}
				}
			}
			if (
				value.assets.preloadGroups !== undefined &&
				!isObject(value.assets.preloadGroups)
			) {
				errors.push("skybox.assets.preloadGroups must be an object.");
			}
		}
	}
	if (isObject(value.planned)) {
		for (const [featureName, feature] of Object.entries(value.planned)) {
			if (isObject(feature) && feature.enabled !== false) {
				errors.push(
					`skybox.planned.${featureName}.enabled must remain false until runtime support is implemented.`,
				);
			}
		}
	}
}

function validateSkyboxEnvironment(value, errors) {
	if (
		![
			"solid-color",
			"cubemap-skybox",
			"equirectangular-environment",
			"video-skybox",
			"procedural-atmosphere",
		].includes(value.kind)
	) {
		errors.push("skybox.environment.kind is not supported.");
	}
	if (environmentAssetId(value) !== undefined) {
		validateId(value.assetId, "skybox.environment.assetId", errors);
	}
	for (const key of [
		"backgroundIntensity",
		"backgroundBlurriness",
		"environmentIntensity",
	]) {
		if (value[key] !== undefined) {
			validateNonNegativeNumber(
				value[key],
				`skybox.environment.${key}`,
				errors,
			);
		}
	}
	if (
		value.requiredForReadiness !== undefined &&
		typeof value.requiredForReadiness !== "boolean"
	) {
		errors.push("skybox.environment.requiredForReadiness must be a boolean.");
	}
}

function validateNpcPackage(npcPackage, errors) {
	if (!Array.isArray(npcPackage.groups)) {
		errors.push("npcPackage.groups must be an array.");
		return;
	}
	if (!Array.isArray(npcPackage.archetypes)) {
		errors.push("npcPackage.archetypes must be an array.");
		return;
	}

	validateUniqueIds(
		npcPackage.archetypes.map((archetype) => archetype.data?.id),
		"npcPackage.archetypes.id",
		errors,
	);

	for (const [index, archetypeFile] of npcPackage.archetypes.entries()) {
		validateNpcArchetype(
			archetypeFile.data,
			`npcPackage.archetypes.${index}`,
			errors,
		);
	}

	for (const [index, groupFile] of npcPackage.groups.entries()) {
		validateNpcGroup(groupFile.data, `npcPackage.groups.${index}`, errors);
	}
}

function validateNpcArchetype(value, path, errors) {
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	if (value.schemaVersion !== 1) {
		errors.push(`${path}.schemaVersion must be 1.`);
	}
	validateId(value.id, `${path}.id`, errors);
	if (value.assets !== undefined) {
		if (!isObject(value.assets)) {
			errors.push(`${path}.assets must be an object.`);
		} else {
			validateOptionalStringArray(
				value.assets.preload,
				`${path}.assets.preload`,
				errors,
			);
			if (value.assets.local !== undefined) {
				if (!Array.isArray(value.assets.local)) {
					errors.push(`${path}.assets.local must be an array.`);
				} else {
					validateUniqueIds(
						value.assets.local.map((asset) => asset?.id),
						`${path}.assets.local.id`,
						errors,
					);
					for (const [index, asset] of value.assets.local.entries()) {
						validateAsset(asset, `${path}.assets.local.${index}`, errors);
					}
				}
			}
			if (
				value.assets.preloadGroups !== undefined &&
				!isObject(value.assets.preloadGroups)
			) {
				errors.push(`${path}.assets.preloadGroups must be an object.`);
			}
		}
	}
	validatePrefab(value.prefab, `${path}.prefab`, errors);
	if (value.visualParts !== undefined) {
		if (!Array.isArray(value.visualParts)) {
			errors.push(`${path}.visualParts must be an array.`);
		} else {
			for (const [index, visualPart] of value.visualParts.entries()) {
				validateNpcVisualPart(
					visualPart,
					`${path}.visualParts.${index}`,
					errors,
				);
			}
		}
	}
	if (!isObject(value.defaults)) {
		errors.push(`${path}.defaults must be an object.`);
	}
}

function validateNpcVisualPart(value, path, errors) {
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	validateId(value.idSuffix, `${path}.idSuffix`, errors);
	validatePrefab(value.prefab, `${path}.prefab`, errors);
	if (value.transform !== undefined) {
		validateTransform(value.transform, `${path}.transform`, errors);
	}
}

function validateNpcGroup(value, path, errors) {
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	if (value.schemaVersion !== 1) {
		errors.push(`${path}.schemaVersion must be 1.`);
	}
	validateId(value.archetype, `${path}.archetype`, errors);
	if (!Array.isArray(value.instances)) {
		errors.push(`${path}.instances must be an array.`);
		return;
	}
	validateNpcGroupDefaults(value.defaults, `${path}.defaults`, errors);
	validateUniqueIds(
		value.instances.map((instance) => instance?.id),
		`${path}.instances.id`,
		errors,
	);
	validateUniqueIds(
		value.instances.map((instance) => instance?.stableId),
		`${path}.instances.stableId`,
		errors,
	);
	for (const [index, instance] of value.instances.entries()) {
		validateNpcInstance(instance, `${path}.instances.${index}`, errors);
	}
}

function validateNpcGroupDefaults(value, path, errors) {
	if (value === undefined) {
		return;
	}
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	validateNpcMovementOverride(value.movement, `${path}.movement`, errors);
	validateNpcLightOverride(value.light, `${path}.light`, errors);
	validateNpcLightModulationOverride(
		value.lightModulation,
		`${path}.lightModulation`,
		errors,
	);
	validateNpcInteractionOverride(
		value.interaction,
		`${path}.interaction`,
		errors,
	);
}

function validateNpcInstance(value, path, errors) {
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	validateId(value.id, `${path}.id`, errors);
	validateStableId(value.stableId, `${path}.stableId`, errors);
	if (typeof value.displayName !== "string" || !value.displayName) {
		errors.push(`${path}.displayName must be a non-empty string.`);
	}
	validateTransform(value.transform, `${path}.transform`, errors);
	validateNpcMovementOverride(value.movement, `${path}.movement`, errors);
	validateNpcLightOverride(value.light, `${path}.light`, errors);
	validateNpcLightModulationOverride(
		value.lightModulation,
		`${path}.lightModulation`,
		errors,
	);
	validateNpcInteractionOverride(
		value.interaction,
		`${path}.interaction`,
		errors,
	);
	if (!isObject(value.conversation)) {
		errors.push(`${path}.conversation must be an object.`);
	} else {
		validateNpcConversation(value.conversation, `${path}.conversation`, errors);
	}
}

function validateNpcMovementOverride(value, path, errors) {
	if (value === undefined) {
		return;
	}
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	for (const key of ["radius", "speed", "bobAmplitude", "bobSpeed", "phase"]) {
		if (value[key] !== undefined) {
			validateNonNegativeNumber(value[key], `${path}.${key}`, errors);
		}
	}
	if (value.hoverHeight !== undefined) {
		validateFiniteNumber(value.hoverHeight, `${path}.hoverHeight`, errors);
	}
}

function validateNpcLightOverride(value, path, errors) {
	if (value === undefined) {
		return;
	}
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	if (
		value.kind !== undefined &&
		value.kind !== "point" &&
		value.kind !== "spot"
	) {
		errors.push(`${path}.kind must be point or spot.`);
	}
	if (value.color !== undefined) {
		validateHexColor(value.color, `${path}.color`, errors);
	}
	for (const key of ["intensity", "distance", "decay", "angle", "penumbra"]) {
		if (value[key] !== undefined) {
			validateNonNegativeNumber(value[key], `${path}.${key}`, errors);
		}
	}
	if (value.visible !== undefined && typeof value.visible !== "boolean") {
		errors.push(`${path}.visible must be a boolean.`);
	}
}

function validateNpcLightModulationOverride(value, path, errors) {
	if (value === undefined) {
		return;
	}
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	for (const key of [
		"phase",
		"pulseSpeed",
		"baseIntensity",
		"baseDistance",
		"maxActiveLights",
		"blinkFadeSeconds",
		"nearDistance",
		"farDistance",
	]) {
		if (value[key] !== undefined) {
			validateNonNegativeNumber(value[key], `${path}.${key}`, errors);
		}
	}
	for (const key of [
		"pulseSoftness",
		"activeLightPercent",
		"minimumIntensityScale",
		"midIntensityScale",
	]) {
		if (value[key] !== undefined) {
			validateAlpha(value[key], `${path}.${key}`, errors);
		}
	}
	if (value.blinkPeriodSeconds !== undefined) {
		validateNumberTuple(
			value.blinkPeriodSeconds,
			2,
			`${path}.blinkPeriodSeconds`,
			errors,
		);
		if (Array.isArray(value.blinkPeriodSeconds)) {
			for (const [index, entry] of value.blinkPeriodSeconds.entries()) {
				validateNonNegativeNumber(
					entry,
					`${path}.blinkPeriodSeconds.${index}`,
					errors,
				);
			}
		}
	}
}

function validateNpcInteractionOverride(value, path, errors) {
	if (value === undefined) {
		return;
	}
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	if (value.prompt !== undefined && typeof value.prompt !== "string") {
		errors.push(`${path}.prompt must be a string.`);
	}
	if (value.activationRadius !== undefined) {
		validateNonNegativeNumber(
			value.activationRadius,
			`${path}.activationRadius`,
			errors,
		);
	}
}

function validateNpcConversation(value, path, errors) {
	if (value.mode !== "read-only") {
		errors.push(`${path}.mode must be read-only.`);
	}
	for (const key of ["title", "excerpt", "body"]) {
		if (typeof value[key] !== "string" || !value[key]) {
			errors.push(`${path}.${key} must be a non-empty string.`);
		}
	}
	if (value.durationMs !== undefined) {
		validateNonNegativeNumber(value.durationMs, `${path}.durationMs`, errors);
	}
}

function validateCrossReferences(document, errors, npcPackage) {
	const assetIds = new Set([
		...(document.assets.shared ?? []),
		...(document.skybox.assets?.shared ?? []),
		"mesh_player",
		"material_player",
		"audio_player_jump",
		"audio_player_charge_release",
		...document.assets.local.map((asset) => asset.id),
		...(document.skybox.assets?.local ?? []).map((asset) => asset.id),
		...npcAssetIds(npcPackage),
	]);
	const prefabIds = new Set([
		...(document.prefabs.shared ?? []),
		"player",
		...document.prefabs.local.map((prefab) => prefab.id),
		...npcPrefabIds(npcPackage),
	]);
	const stableIds = new Set([
		"player",
		...document.level.instances.map((instance) => instance.stableId),
		...npcStableIds(npcPackage),
	]);

	for (const id of document.assets.shared ?? []) {
		if (!SHARED_ASSET_IDS.has(id)) {
			errors.push(`assets.shared references unknown shared asset "${id}".`);
		}
	}
	for (const id of document.skybox.assets?.shared ?? []) {
		if (!SHARED_ASSET_IDS.has(id)) {
			errors.push(
				`skybox.assets.shared references unknown shared asset "${id}".`,
			);
		}
	}
	for (const id of document.prefabs.shared ?? []) {
		if (!SHARED_PREFAB_IDS.has(id)) {
			errors.push(`prefabs.shared references unknown shared prefab "${id}".`);
		}
	}
	for (const id of document.level.preload ?? []) {
		if (!assetIds.has(id)) {
			errors.push(`level.preload references unknown asset "${id}".`);
		}
	}
	for (const id of document.runtimeScene.readiness.requiredAssetIds ?? []) {
		if (!assetIds.has(id)) {
			errors.push(
				`readiness.requiredAssetIds references unknown asset "${id}".`,
			);
		}
	}
	for (const id of document.runtimeScene.readiness.requiredCollisionPrefabIds ??
		[]) {
		if (!prefabIds.has(id)) {
			errors.push(
				`readiness.requiredCollisionPrefabIds references unknown prefab "${id}".`,
			);
		}
	}
	for (const key of [
		"requiredCollisionStableIds",
		"requiredWalkableStableIds",
		"requiredLightStableIds",
	]) {
		for (const id of document.runtimeScene.readiness[key] ?? []) {
			if (!stableIds.has(id)) {
				errors.push(`readiness.${key} references unknown stable ID "${id}".`);
			}
		}
	}
	for (const instance of document.level.instances) {
		if (!prefabIds.has(instance.prefabId)) {
			errors.push(
				`instance "${instance.id}" references unknown prefab "${instance.prefabId}".`,
			);
		}
	}
	for (const prefab of [...document.prefabs.local, ...npcPrefabs(npcPackage)]) {
		for (const assetId of prefab.assetIds ?? []) {
			if (!assetIds.has(assetId)) {
				errors.push(
					`prefab "${prefab.id}" references unknown asset "${assetId}".`,
				);
			}
		}
	}
	const skyboxEnvironmentAssetId = environmentAssetId(
		document.skybox.environment,
	);
	if (skyboxEnvironmentAssetId && !assetIds.has(skyboxEnvironmentAssetId)) {
		errors.push(
			`skybox.environment references unknown asset "${skyboxEnvironmentAssetId}".`,
		);
	}
	for (const id of document.skybox.assets?.preload ?? []) {
		if (!assetIds.has(id)) {
			errors.push(`skybox.assets.preload references unknown asset "${id}".`);
		}
	}
	for (const mapping of document.audio.eventMappings) {
		if (!assetIds.has(mapping.soundId)) {
			errors.push(
				`audio mapping "${mapping.id}" references unknown sound "${mapping.soundId}".`,
			);
		}
	}
	for (const trackId of musicTrackIds(document.audio.sceneMusic)) {
		if (!assetIds.has(trackId)) {
			errors.push(`audio.sceneMusic references unknown track "${trackId}".`);
		}
	}
	for (const [groupId, groupAssetIds] of Object.entries(
		document.assets.preloadGroups ?? {},
	)) {
		validatePreloadGroupAssetIds(
			assetIds,
			`assets.preloadGroups.${groupId}`,
			groupAssetIds,
			errors,
		);
	}
	for (const [groupId, groupAssetIds] of Object.entries(
		document.skybox.assets?.preloadGroups ?? {},
	)) {
		validatePreloadGroupAssetIds(
			assetIds,
			`skybox.assets.preloadGroups.${groupId}`,
			groupAssetIds,
			errors,
		);
	}
}

function npcArchetypes(npcPackage) {
	return npcPackage.archetypes
		.map((archetype) => archetype.data)
		.filter(isObject);
}

function npcGroups(npcPackage) {
	return npcPackage.groups.map((group) => group.data).filter(isObject);
}

function npcAssetIds(npcPackage) {
	return unique(
		npcArchetypes(npcPackage).flatMap((archetype) =>
			(archetype.assets?.local ?? [])
				.map((asset) => asset.id)
				.filter((id) => typeof id === "string"),
		),
	);
}

function npcPrefabs(npcPackage) {
	return npcArchetypes(npcPackage).flatMap((archetype) => [
		archetype.prefab,
		...(archetype.visualParts ?? []).map((part) => part.prefab),
	]);
}

function npcPrefabIds(npcPackage) {
	return unique(
		npcPrefabs(npcPackage)
			.map((prefab) => prefab?.id)
			.filter((id) => typeof id === "string"),
	);
}

function npcStableIds(npcPackage) {
	const visualPartsByArchetype = new Map(
		npcArchetypes(npcPackage).map((archetype) => [
			archetype.id,
			archetype.visualParts ?? [],
		]),
	);
	const stableIds = [];

	for (const group of npcGroups(npcPackage)) {
		for (const instance of group.instances ?? []) {
			if (!isObject(instance) || typeof instance.stableId !== "string") {
				continue;
			}
			stableIds.push(instance.stableId);
			for (const visualPart of visualPartsByArchetype.get(group.archetype) ??
				[]) {
				if (typeof visualPart.idSuffix === "string") {
					stableIds.push(`${instance.stableId}:${visualPart.idSuffix}`);
				}
			}
		}
	}

	return unique(stableIds);
}

function validatePreloadGroupAssetIds(assetIds, path, groupAssetIds, errors) {
	if (!Array.isArray(groupAssetIds)) {
		errors.push(`${path} must be an array.`);
		return;
	}
	for (const assetId of groupAssetIds) {
		if (!assetIds.has(assetId)) {
			errors.push(`${path} references unknown asset "${assetId}".`);
		}
	}
}

function environmentAssetId(environment) {
	return isObject(environment) && typeof environment.assetId === "string"
		? environment.assetId
		: undefined;
}

function musicTrackIds(sceneMusic) {
	if (!isObject(sceneMusic)) {
		return [];
	}
	if (typeof sceneMusic.trackId === "string") {
		return [sceneMusic.trackId];
	}
	if (Array.isArray(sceneMusic.trackIds)) {
		return sceneMusic.trackIds.filter((id) => typeof id === "string");
	}
	return [];
}

async function assertUniqueLevelPackageData(currentRuntimeSceneId, document) {
	const summaries = await listLevelSummaries();

	for (const summary of summaries) {
		if (summary.runtimeSceneId === currentRuntimeSceneId) {
			continue;
		}
		if (summary.levelId === document.level.id) {
			throw new Error(`level.id "${document.level.id}" is already used.`);
		}
		if (summary.sceneId === document.level.sceneId) {
			throw new Error(
				`level.sceneId "${document.level.sceneId}" is already used.`,
			);
		}
		if (summary.runtimeSceneId === document.runtimeScene.id) {
			throw new Error(
				`runtimeScene.id "${document.runtimeScene.id}" is already used.`,
			);
		}
	}
}

function validateGlobalSettings(value) {
	if (!isObject(value)) {
		throw new Error("Global settings payload must be an object.");
	}

	const packageId = validatePackageId(value.packageId);
	const defaultRuntimeSceneId = validateRuntimeSceneId(
		value.defaultRuntimeSceneId,
		"defaultRuntimeSceneId",
	);

	return { packageId, defaultRuntimeSceneId };
}

function validatePlayerPackageConfig(value) {
	if (!isObject(value)) {
		throw new Error("Player package payload must be an object.");
	}

	const errors = [];
	const playerPackage = {
		assets: validatePlayerAssets(value.assets, errors),
		transform: validateRequiredTransform(value.transform, "transform", errors),
		renderable: {
			visible: readRequiredBoolean(
				value.renderable?.visible,
				"renderable.visible",
				errors,
			),
		},
		rigidBody: {
			mass: readRequiredNumber(value.rigidBody?.mass, "rigidBody.mass", errors),
		},
		collider: {
			halfHeight: readRequiredNumber(
				value.collider?.halfHeight,
				"collider.halfHeight",
				errors,
			),
			radius: readRequiredNumber(
				value.collider?.radius,
				"collider.radius",
				errors,
			),
		},
		characterController: {
			speed: readRequiredNumber(
				value.characterController?.speed,
				"characterController.speed",
				errors,
			),
			sprintMultiplier: readRequiredNumber(
				value.characterController?.sprintMultiplier,
				"characterController.sprintMultiplier",
				errors,
			),
			jumpForce: readRequiredNumber(
				value.characterController?.jumpForce,
				"characterController.jumpForce",
				errors,
			),
			gravity: readRequiredNumber(
				value.characterController?.gravity,
				"characterController.gravity",
				errors,
			),
			groundY: readRequiredNumber(
				value.characterController?.groundY,
				"characterController.groundY",
				errors,
			),
		},
		firstPersonController: {
			mouseSensitivity: readRequiredNumber(
				value.firstPersonController?.mouseSensitivity,
				"firstPersonController.mouseSensitivity",
				errors,
			),
			minPitchRadians: readRequiredNumber(
				value.firstPersonController?.minPitchRadians,
				"firstPersonController.minPitchRadians",
				errors,
			),
			maxPitchRadians: readRequiredNumber(
				value.firstPersonController?.maxPitchRadians,
				"firstPersonController.maxPitchRadians",
				errors,
			),
			eyeHeight: readRequiredNumber(
				value.firstPersonController?.eyeHeight,
				"firstPersonController.eyeHeight",
				errors,
			),
			fovDegrees: readRequiredNumber(
				value.firstPersonController?.fovDegrees,
				"firstPersonController.fovDegrees",
				errors,
			),
			near: readRequiredNumber(
				value.firstPersonController?.near,
				"firstPersonController.near",
				errors,
			),
			far: readRequiredNumber(
				value.firstPersonController?.far,
				"firstPersonController.far",
				errors,
			),
		},
		health: {
			current: readRequiredNumber(
				value.health?.current,
				"health.current",
				errors,
			),
			max: readRequiredNumber(value.health?.max, "health.max", errors),
		},
		audio: {
			jumpVolume: readRequiredNumber(
				value.audio?.jumpVolume,
				"audio.jumpVolume",
				errors,
			),
			chargeReleaseVolume: readRequiredNumber(
				value.audio?.chargeReleaseVolume,
				"audio.chargeReleaseVolume",
				errors,
			),
		},
		light: validatePlayerLight(value.light, "light", errors),
	};

	if (errors.length > 0) {
		throw new Error(errors.join("; "));
	}

	return playerPackage;
}

function validatePlayerAssets(value, errors) {
	if (!isObject(value)) {
		errors.push("assets must be an object.");
		return {
			meshUrl: "",
			materialUrl: "",
			jumpAudioUrl: "",
			chargeReleaseAudioUrl: "",
		};
	}
	return {
		meshUrl: readRequiredString(value.meshUrl, "assets.meshUrl", errors),
		materialUrl: readRequiredString(
			value.materialUrl,
			"assets.materialUrl",
			errors,
		),
		jumpAudioUrl: readRequiredString(
			value.jumpAudioUrl,
			"assets.jumpAudioUrl",
			errors,
		),
		chargeReleaseAudioUrl: readRequiredString(
			value.chargeReleaseAudioUrl,
			"assets.chargeReleaseAudioUrl",
			errors,
		),
	};
}

function validateRequiredTransform(value, path, errors) {
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		};
	}
	return {
		position: readRequiredNumberTuple(
			value.position,
			3,
			`${path}.position`,
			errors,
		),
		rotation: readRequiredNumberTuple(
			value.rotation,
			4,
			`${path}.rotation`,
			errors,
		),
		scale: readRequiredNumberTuple(value.scale, 3, `${path}.scale`, errors),
	};
}

function validatePlayerLight(value, path, errors) {
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return {
			kind: "point",
			color: "",
			intensity: 0,
			distance: 0,
			decay: 0,
			visible: true,
		};
	}
	if (value.kind !== "point") {
		errors.push(`${path}.kind must be point.`);
	}
	return {
		kind: "point",
		color: readRequiredString(value.color, `${path}.color`, errors),
		intensity: readRequiredNonNegativeNumber(
			value.intensity,
			`${path}.intensity`,
			errors,
		),
		distance: readRequiredNonNegativeNumber(
			value.distance,
			`${path}.distance`,
			errors,
		),
		decay: readRequiredNonNegativeNumber(value.decay, `${path}.decay`, errors),
		visible: readRequiredBoolean(value.visible, `${path}.visible`, errors),
	};
}

function readGlobalSettings(source) {
	return {
		packageId: readStringProperty(source, "packageId"),
		defaultRuntimeSceneId: readStringProperty(source, "defaultRuntimeSceneId"),
	};
}

function writeGlobalSettingsSource(source, settings) {
	let nextSource = replaceStringProperty(
		source,
		"packageId",
		settings.packageId,
	);
	nextSource = replaceStringProperty(
		nextSource,
		"defaultRuntimeSceneId",
		settings.defaultRuntimeSceneId,
	);
	return nextSource;
}

function readStringProperty(source, propertyName) {
	const match = stringPropertyPattern(propertyName).exec(source);

	if (!match?.[2]) {
		throw new Error(
			`Could not read "${propertyName}" from ${GLOBAL_SETTINGS_DISPLAY_PATH}.`,
		);
	}

	return match[2];
}

function replaceStringProperty(source, propertyName, value) {
	const pattern = stringPropertyPattern(propertyName);

	if (!pattern.test(source)) {
		throw new Error(
			`Could not update "${propertyName}" in ${GLOBAL_SETTINGS_DISPLAY_PATH}.`,
		);
	}

	return source.replace(pattern, `${propertyName}: ${JSON.stringify(value)}`);
}

function stringPropertyPattern(propertyName) {
	return new RegExp(`${propertyName}\\s*:\\s*(["'])([^"']*)\\1`);
}

function validateAssetUpload(value) {
	if (!isObject(value)) {
		throw new Error("Upload payload must be an object.");
	}
	if (
		typeof value.fileName !== "string" ||
		value.fileName.includes("/") ||
		value.fileName.includes("\\")
	) {
		throw new Error("Upload fileName must be a single file name.");
	}
	const extension = extname(value.fileName).toLowerCase();
	if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
		throw new Error(`Upload file type "${extension}" is not supported.`);
	}
	if (typeof value.contentBase64 !== "string" || !value.contentBase64) {
		throw new Error("Upload contentBase64 must be a non-empty string.");
	}
	return {
		fileName: value.fileName,
		contentBase64: value.contentBase64,
	};
}

function validatePackageId(value) {
	if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(value)) {
		throw new Error(
			"packageId must be lowercase letters, numbers, or hyphens.",
		);
	}
	return value;
}

function validateRuntimeSceneId(value, path, errors) {
	if (
		typeof value !== "string" ||
		!/^[a-z0-9]+(?:_[a-z0-9]+)*_runtime$/.test(value)
	) {
		const message = `${path} must be a runtime scene ID ending in _runtime.`;
		if (errors) {
			errors.push(message);
			return value;
		}
		throw new Error(message);
	}
	return value;
}

function validateSnakeId(value, path, errors) {
	if (typeof value !== "string" || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(value)) {
		errors.push(`${path} must be a lowercase snake_case ID.`);
	}
}

function validateStableId(value, path, errors) {
	if (
		typeof value !== "string" ||
		!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(value)
	) {
		errors.push(`${path} must be a non-empty stable ID.`);
	}
}

function validateId(value, path, errors) {
	if (
		typeof value !== "string" ||
		!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(value)
	) {
		errors.push(`${path} must be a non-empty ID.`);
	}
}

function validateOptionalStringArray(value, path, errors) {
	if (value === undefined) {
		return;
	}
	if (
		!Array.isArray(value) ||
		value.some((entry) => typeof entry !== "string" || !entry)
	) {
		errors.push(`${path} must be an array of non-empty strings.`);
	}
}

function validateUniqueIds(values, path, errors) {
	const seen = new Set();
	for (const value of values) {
		if (typeof value !== "string") {
			continue;
		}
		if (seen.has(value)) {
			errors.push(`${path} contains duplicate "${value}".`);
		}
		seen.add(value);
	}
}

function validateTransform(value, path, errors) {
	if (!isObject(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}
	if (value.position !== undefined) {
		validateNumberTuple(value.position, 3, `${path}.position`, errors);
	}
	if (value.rotation !== undefined) {
		validateNumberTuple(value.rotation, 4, `${path}.rotation`, errors);
	}
	if (value.scale !== undefined) {
		validateNumberTuple(value.scale, 3, `${path}.scale`, errors);
	}
}

function validateNumberTuple(value, size, path, errors) {
	if (
		!Array.isArray(value) ||
		value.length !== size ||
		value.some((entry) => typeof entry !== "number" || !Number.isFinite(entry))
	) {
		errors.push(`${path} must be a ${size}-number tuple.`);
	}
}

function readRequiredNumberTuple(value, size, path, errors) {
	validateNumberTuple(value, size, path, errors);
	if (!Array.isArray(value) || value.length !== size) {
		return Array.from({ length: size }, () => 0);
	}
	return value.map((entry) =>
		typeof entry === "number" && Number.isFinite(entry) ? entry : 0,
	);
}

function readRequiredNumber(value, path, errors) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		errors.push(`${path} must be a finite number.`);
		return 0;
	}
	return value;
}

function readRequiredNonNegativeNumber(value, path, errors) {
	const numberValue = readRequiredNumber(value, path, errors);
	if (numberValue < 0) {
		errors.push(`${path} must be a non-negative number.`);
		return 0;
	}
	return numberValue;
}

function readRequiredString(value, path, errors) {
	if (typeof value !== "string" || !value) {
		errors.push(`${path} must be a non-empty string.`);
		return "";
	}
	return value;
}

function readRequiredBoolean(value, path, errors) {
	if (typeof value !== "boolean") {
		errors.push(`${path} must be a boolean.`);
		return false;
	}
	return value;
}

function validateNonNegativeNumber(value, path, errors) {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		errors.push(`${path} must be a non-negative number.`);
	}
}

function validatePositiveNumber(value, path, errors) {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		errors.push(`${path} must be a positive finite number.`);
	}
}

function validateFiniteNumber(value, path, errors) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		errors.push(`${path} must be a finite number.`);
	}
}

function validateAlpha(value, path, errors) {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < 0 ||
		value > 1
	) {
		errors.push(`${path} must be a finite number from 0 to 1.`);
	}
}

function validateHexColor(value, path, errors) {
	if (
		typeof value !== "string" ||
		!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
	) {
		errors.push(`${path} must be a #rgb or #rrggbb color string.`);
	}
}

async function readJsonBody(req) {
	const chunks = [];
	for await (const chunk of req) {
		chunks.push(Buffer.from(chunk));
	}
	const rawBody = Buffer.concat(chunks).toString("utf8");
	return rawBody.trim() ? JSON.parse(rawBody) : {};
}

function serializeJson(value) {
	return `${JSON.stringify(value, null, "\t")}\n`;
}

function unique(values) {
	return [...new Set(values)];
}

function isObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sendJson(res, statusCode, payload) {
	res.statusCode = statusCode;
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.setHeader("Cache-Control", "no-store");
	res.end(JSON.stringify(payload));
}

function requestPathname(req) {
	const url = new URL(req.url ?? "/", "http://localhost");
	return url.pathname;
}

function errorMessage(error) {
	return error instanceof Error
		? error.message
		: "Editor dev API request failed.";
}
