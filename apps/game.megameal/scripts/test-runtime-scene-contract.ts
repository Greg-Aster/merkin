import {
	EngineRuntime,
	type PhysicsAdapterPort,
	PhysicsSyncSystem,
	type RuntimeSceneLoadReport,
	type RuntimeSceneManifestData,
	evaluateRuntimeSceneReadiness,
	loadRuntimeSceneManifest,
	parseAudioContentManifest,
	validateRuntimeSceneContentGraph,
} from "../src/engine/index.js";
import { audioContentManifestForRuntimeScene } from "../src/game/assets/index.js";
import {
	LevelLoader,
	defaultRuntimeSceneManifests,
	getRuntimeSceneManifest,
	mirandaDeckRuntimeSceneManifest,
	observatoryRuntimeSceneManifest,
	portalArenaRuntimeSceneManifest,
	sciFiRoomRuntimeSceneManifest,
	solitudeExpectedRuntimeImports,
	solitudeRuntimeSceneManifest,
	yggdrasilExpectedRuntimeImports,
} from "../src/game/levels/index.js";
import { PrefabRegistry } from "../src/game/prefabs/index.js";

const observatoryWalkableChunkStableIds = [0, 1, 2, 3].flatMap((xChunk) =>
	[0, 1, 2, 3].map(
		(zChunk) => `observatory:walkable-mesh:chunk:x${xChunk}-z${zChunk}`,
	),
);
const firstObservatoryWalkableChunkStableId =
	"observatory:walkable-mesh:chunk:x0-z0";
const centerObservatoryWalkableChunkStableId =
	"observatory:walkable-mesh:chunk:x2-z2";
const solitudeRuntimeSceneId = "solitude_runtime";
const solitudePortalStableId = "portal-arena:portal:solitude";
const solitudeExpectedWalkableStableIds = [
	"solitude:ground:plateau",
	"solitude:ground:dais",
] as const;
const solitudeExpectedCollisionStableIds =
	solitudeExpectedRuntimeImports.readiness.requiredCollisionStableIds;
const solitudeOldPathMarkers = [
	"/generated/runtime-game-assets/",
	"/runtime-world-partitions/",
	".collider.",
] as const;
const yggdrasilRuntimeSceneId = "yggdrasil_runtime";
const yggdrasilExpectedWalkableStableIds =
	yggdrasilExpectedRuntimeImports.readiness.requiredWalkableStableIds;

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

function assertDeepEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message?: string,
) {
	const actualJson = JSON.stringify(actual);
	const expectedJson = JSON.stringify(expected);

	if (actualJson !== expectedJson) {
		throw new Error(
			message ?? `Expected ${expectedJson}, received ${actualJson}.`,
		);
	}
}

function assertSameStringSet(
	actual: readonly string[] | undefined,
	expected: readonly string[],
	message: string,
): void {
	assertDeepEqual([...(actual ?? [])].sort(), [...expected].sort(), message);
}

function assertMeshVertexHeight(
	vertices: readonly unknown[],
	x: number,
	z: number,
	expectedHeight: number,
	label: string,
): void {
	assertEqual(
		meshVertexHeight(vertices, x, z, label),
		expectedHeight,
		`${label} height at ${x},${z}`,
	);
}

function meshVertexHeight(
	vertices: readonly unknown[],
	x: number,
	z: number,
	label: string,
): number {
	for (const vertex of vertices) {
		if (!Array.isArray(vertex) || vertex.length !== 3) {
			continue;
		}

		const [vertexX, vertexY, vertexZ] = vertex;

		if (vertexX === x && vertexZ === z) {
			if (typeof vertexY !== "number") {
				throw new Error(`${label} vertex ${x},${z} has no numeric height.`);
			}

			return vertexY;
		}
	}

	throw new Error(`${label} has no vertex at ${x},${z}.`);
}

function assertIncludes(
	values: readonly string[],
	expected: string,
	message?: string,
): void {
	if (!values.includes(expected)) {
		throw new Error(
			message ??
				`Expected ${JSON.stringify(values)} to include ${JSON.stringify(expected)}.`,
		);
	}
}

function assertErrorIncludes(action: () => void, expected: string): void {
	try {
		action();
	} catch (error) {
		const message =
			error instanceof Error ? error.message : JSON.stringify(error);

		if (!message.includes(expected)) {
			throw new Error(
				`Expected error to include ${JSON.stringify(expected)}, received ${JSON.stringify(message)}.`,
			);
		}

		return;
	}

	throw new Error(`Expected error including ${JSON.stringify(expected)}.`);
}

function cloneValue<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}

function validLoadReport(
	manifest: RuntimeSceneManifestData,
): RuntimeSceneLoadReport {
	return {
		levelId: manifest.level.id,
		...(manifest.level.sceneId ? { sceneId: manifest.level.sceneId } : {}),
		preloadedAssetIds: manifest.readiness.requiredAssetIds ?? [],
		spawned: manifest.level.instances.map((instance) => ({
			prefabId: instance.prefabId,
			stableId: instance.stableId,
		})),
		activatedTerrainPackageIds:
			manifest.readiness.requiredTerrainPackageIds ?? [],
		physicsReady: true,
		playerReady: true,
	};
}

function assetBackedEnvironmentAssetId(
	manifest: RuntimeSceneManifestData,
): string {
	const environment = manifest.renderProfile.environment;

	if (!("assetId" in environment)) {
		throw new Error(
			`Expected runtime scene "${manifest.id}" to use an asset-backed environment.`,
		);
	}

	return environment.assetId;
}

function firstRequired<TValue>(
	values: readonly TValue[] | undefined,
	label: string,
): TValue {
	const value = values?.[0];

	if (value === undefined) {
		throw new Error(`Expected ${label} to contain at least one entry.`);
	}

	return value;
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
	if (!isRecord(value)) {
		throw new Error(`Expected ${label} to be an object.`);
	}

	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function instanceForStableId(
	manifest: RuntimeSceneManifestData,
	stableId: string,
) {
	const instance = manifest.level.instances.find(
		(candidate) => candidate.stableId === stableId,
	);

	if (!instance) {
		throw new Error(
			`Expected runtime scene "${manifest.id}" to include stable instance "${stableId}".`,
		);
	}

	return instance;
}

function componentsForStableId(
	manifest: RuntimeSceneManifestData,
	stableId: string,
): Record<string, unknown> {
	const instance = instanceForStableId(manifest, stableId);
	const prefab = manifest.prefabs.find(
		(candidate) => candidate.id === instance.prefabId,
	);

	if (!prefab) {
		throw new Error(
			`Expected runtime scene "${manifest.id}" to include prefab "${instance.prefabId}".`,
		);
	}

	return {
		...prefab.components,
		...(instance.components ?? {}),
	};
}

function componentForStableId(
	manifest: RuntimeSceneManifestData,
	stableId: string,
	componentName: string,
): Record<string, unknown> {
	const component = componentsForStableId(manifest, stableId)[componentName];

	return assertRecord(
		component,
		`${manifest.id} ${stableId} ${componentName} component`,
	);
}

function transformPropertyForStableId(
	manifest: RuntimeSceneManifestData,
	stableId: string,
	propertyName: "position" | "rotation" | "scale",
): unknown {
	const instance = instanceForStableId(manifest, stableId);
	const transform = componentForStableId(manifest, stableId, "Transform");

	return instance.transform?.[propertyName] ?? transform[propertyName];
}

function allAssetStrings(
	manifest: RuntimeSceneManifestData,
): readonly string[] {
	const strings: string[] = [];

	for (const asset of manifest.assets.assets) {
		if ("id" in asset && typeof asset.id === "string") {
			strings.push(asset.id);
		}

		if ("url" in asset && typeof asset.url === "string") {
			strings.push(asset.url);
		}

		if ("faces" in asset && isRecord(asset.faces)) {
			for (const faceUrl of Object.values(asset.faces)) {
				if (typeof faceUrl === "string") {
					strings.push(faceUrl);
				}
			}
		}
	}

	return strings;
}

function requiredYggdrasilRuntimeSceneManifest(): RuntimeSceneManifestData {
	const manifest = defaultRuntimeSceneManifests.find(
		(candidate) => candidate.id === yggdrasilRuntimeSceneId,
	);

	if (!manifest) {
		throw new Error(
			`Expected Yggdrasil runtime scene manifest "${yggdrasilRuntimeSceneId}" to be registered in defaultRuntimeSceneManifests.`,
		);
	}

	return manifest;
}

function stableIdsWithComponent(
	manifest: RuntimeSceneManifestData,
	componentName: string,
): readonly string[] {
	return manifest.level.instances
		.filter((instance) =>
			isRecord(
				componentsForStableId(manifest, instance.stableId)[componentName],
			),
		)
		.map((instance) => instance.stableId);
}

function assertNonEmpty(values: readonly unknown[], message: string): void {
	if (values.length === 0) {
		throw new Error(message);
	}
}

{
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const readiness = evaluateRuntimeSceneReadiness(
		manifest,
		validLoadReport(manifest),
	);

	if (!readiness.ok) {
		throw new Error(
			`Expected portal arena manifest to be ready, received ${readiness.errors.join("; ")}.`,
		);
	}

	assertEqual(readiness.manifestId, "portal_arena_runtime");
}

{
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const environment = manifest.renderProfile.environment;
	const environmentAssetId = assetBackedEnvironmentAssetId(manifest);
	const environmentAsset = manifest.assets.assets.find(
		(asset) => asset.id === environmentAssetId,
	);

	assertEqual(environment.kind, "equirectangular-environment");
	assertEqual(environmentAssetId, "texture_portal_arena_equirectangular_sky");
	assertEqual(environmentAsset?.kind, "texture");
	assertEqual(environmentAsset?.projection, "equirectangular");
	assertIncludes(manifest.level.preload ?? [], environmentAssetId);
	assertIncludes(
		manifest.assets.preloadGroups?.portal_arena ?? [],
		environmentAssetId,
	);
	assertIncludes(manifest.readiness.requiredAssetIds ?? [], environmentAssetId);
}

{
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const fieldAsset = manifest.assets.assets.find(
		(asset) => asset.id === "mesh_portal_field",
	);
	const floorPrefab = manifest.prefabs.find(
		(prefab) => prefab.id === "portal_arena_floor",
	);
	const floorComponents = floorPrefab?.components as
		| Record<string, Record<string, unknown>>
		| undefined;
	const renderable = floorComponents?.Renderable;
	const collider = floorComponents?.Collider;
	const colliderShape = collider?.shape as Record<string, unknown> | undefined;
	const bounds = manifest.level.resources?.["game:characterBounds"] as
		| Record<string, unknown>
		| undefined;
	const playerInstance = manifest.level.instances.find(
		(instance) => instance.stableId === "player",
	);
	const playerLight = playerInstance?.components?.Light as
		| Record<string, unknown>
		| undefined;

	assertIncludes(
		manifest.readiness.requiredAssetIds ?? [],
		"mesh_portal_field",
	);
	assertIncludes(manifest.readiness.requiredLightStableIds ?? [], "player");
	assertEqual(
		manifest.readiness.requiredAssetIds?.includes("material_arena_floor"),
		false,
		"Portal field GLB should own its material instead of requiring the old built-in floor material.",
	);
	assertEqual(fieldAsset?.url, "/assets/game/terrain/portal_field_moor.glb");
	assertEqual(renderable?.meshId, "mesh_portal_field");
	assertEqual(
		Object.prototype.hasOwnProperty.call(renderable ?? {}, "materialId"),
		false,
		"Portal field renderable should not reference a built-in material.",
	);
	assertEqual(collider?.intent, "solid");
	assertEqual(collider?.channel, "world");
	assertEqual(colliderShape?.type, "box");
	assertDeepEqual(colliderShape?.halfExtents, [2600, 0.05, 2600]);
	assertEqual(bounds?.minX, -360);
	assertEqual(bounds?.maxX, 360);
	assertEqual(bounds?.minZ, -360);
	assertEqual(bounds?.maxZ, 360);
	assertEqual(playerLight?.kind, "point");
	assertEqual(playerLight?.color, "#ffd6a3");
	assertEqual(playerLight?.intensity, 5.5);
	assertEqual(playerLight?.distance, 16);
	assertEqual(playerLight?.decay, 2);
	assertEqual(playerLight?.visible, true);
}

{
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const runtime = new EngineRuntime();
	const levelLoader = new LevelLoader({
		prefabs: new PrefabRegistry(manifest.prefabs),
	});
	const loadResult = await levelLoader.loadDefinition(
		runtime.world,
		manifest.level,
	);
	const player = loadResult.spawned.find(
		(spawned) => spawned.stableId === "player",
	);

	if (!player) {
		throw new Error("Expected portal arena player to spawn.");
	}

	const playerColliderBeforeSync = runtime.world.requireComponent<
		Record<string, unknown>
	>(player.entity, "Collider");
	const normalizedOffset = assertRecord(
		playerColliderBeforeSync.offset,
		"Portal arena runtime player Collider.offset",
	);
	let createdColliderOffset: unknown;
	const fakePhysics: PhysicsAdapterPort = {
		createRigidBody() {
			return 1;
		},
		createCollider(entity, _bodyHandle, collider) {
			if (entity === player.entity) {
				createdColliderOffset = collider.offset;
			}
			return 2;
		},
		destroyCollider() {},
		destroyRigidBody() {},
		syncBodyFromTransform() {},
		syncTransformFromBody() {
			return {
				position: { x: 0, y: 0.65, z: 0 },
				rotation: { x: 0, y: 0, z: 0, w: 1 },
			};
		},
		applyImpulse() {},
		step() {},
		drainEvents() {
			return [];
		},
		dispose() {},
	};
	const physicsSync = new PhysicsSyncSystem({ adapter: fakePhysics });

	assertEqual(normalizedOffset.x, 0);
	assertEqual(normalizedOffset.y, 0.9);
	assertEqual(normalizedOffset.z, 0);

	physicsSync.preSync(runtime.services);

	const createdOffset = assertRecord(
		createdColliderOffset,
		"Portal arena physics adapter Collider.offset",
	);
	const playerColliderAfterSync = runtime.world.requireComponent<
		Record<string, unknown>
	>(player.entity, "Collider");
	const preservedOffset = assertRecord(
		playerColliderAfterSync.offset,
		"Portal arena synced player Collider.offset",
	);

	assertEqual(createdOffset.x, 0);
	assertEqual(createdOffset.y, 0.9);
	assertEqual(createdOffset.z, 0);
	assertEqual(playerColliderAfterSync.colliderHandle, 2);
	assertEqual(preservedOffset.x, 0);
	assertEqual(preservedOffset.y, 0.9);
	assertEqual(preservedOffset.z, 0);

	runtime.dispose();
}

{
	const manifest = loadRuntimeSceneManifest(observatoryRuntimeSceneManifest);
	const readiness = evaluateRuntimeSceneReadiness(
		manifest,
		validLoadReport(manifest),
	);

	if (!readiness.ok) {
		throw new Error(
			`Expected Observatory manifest to be ready, received ${readiness.errors.join("; ")}.`,
		);
	}

	assertEqual(readiness.manifestId, "observatory_runtime");
	assertEqual(manifest.level.id, "observatory");
	assertEqual(manifest.level.sceneId, "observatory_game");
	assertEqual(
		defaultRuntimeSceneManifests.includes(observatoryRuntimeSceneManifest),
		true,
		"Observatory runtime scene must be registered in the default catalog.",
	);
	assertEqual(
		getRuntimeSceneManifest("observatory_runtime")?.id,
		"observatory_runtime",
	);
}

{
	const manifest = loadRuntimeSceneManifest(
		requiredYggdrasilRuntimeSceneManifest(),
	);
	const readiness = evaluateRuntimeSceneReadiness(
		manifest,
		validLoadReport(manifest),
	);
	const audioContent = parseAudioContentManifest(
		audioContentManifestForRuntimeScene(manifest.id),
		{ assetManifest: manifest.assets },
	);
	const result = validateRuntimeSceneContentGraph({
		manifest,
		runtimeSceneIds: defaultRuntimeSceneManifests.map(
			(candidate) => candidate.id,
		),
		audioContent,
	});
	const returnPortalTargets = stableIdsWithComponent(manifest, "Portal").map(
		(stableId) =>
			componentsForStableId(manifest, stableId).Portal as
				| Record<string, unknown>
				| undefined,
	);
	const storyNoteStableIds = stableIdsWithComponent(manifest, "StoryNote");
	const oceanRenderable = componentForStableId(
		manifest,
		"yggdrasil:water:ocean",
		"Renderable",
	);
	const oceanWaterSurface = componentForStableId(
		manifest,
		"yggdrasil:water:ocean",
		"WaterSurface",
	);

	if (!readiness.ok) {
		throw new Error(
			`Expected Yggdrasil manifest to be ready, received ${readiness.errors.join("; ")}.`,
		);
	}

	if (!result.ok) {
		throw new Error(
			`Expected Yggdrasil content graph to validate:\n${result.errors.join("\n")}`,
		);
	}

	assertEqual(readiness.manifestId, yggdrasilRuntimeSceneId);
	assertEqual(manifest.level.id, "yggdrasil");
	assertEqual(manifest.level.sceneId, "yggdrasil_game");
	assertEqual(
		defaultRuntimeSceneManifests.some(
			(candidate) => candidate.id === yggdrasilRuntimeSceneId,
		),
		true,
		"Yggdrasil runtime scene must be registered in the default catalog.",
	);
	assertEqual(
		getRuntimeSceneManifest(yggdrasilRuntimeSceneId)?.id,
		yggdrasilRuntimeSceneId,
	);
	assertSameStringSet(
		manifest.readiness.requiredWalkableStableIds,
		yggdrasilExpectedWalkableStableIds,
		"Yggdrasil readiness.requiredWalkableStableIds must exactly match authored primitive walkables.",
	);
	assertSameStringSet(
		manifest.readiness.requiredCollisionStableIds,
		result.graph.collisionStableIds,
		"Yggdrasil readiness.requiredCollisionStableIds must exactly match authored collision stable IDs.",
	);
	assertSameStringSet(
		manifest.readiness.requiredLightStableIds,
		result.graph.lightStableIds,
		"Yggdrasil readiness.requiredLightStableIds must exactly match authored light stable IDs.",
	);
	assertNonEmpty(
		result.graph.authoredAssetIds.filter((assetId) =>
			assetId.includes("yggdrasil"),
		),
		"Yggdrasil runtime scene must include target-owned Yggdrasil assets.",
	);
	assertNonEmpty(
		result.graph.prefabIds.filter((prefabId) => prefabId.includes("yggdrasil")),
		"Yggdrasil runtime scene must include target-owned Yggdrasil prefabs.",
	);
	assertEqual(
		manifest.level.instances.filter((instance) =>
			instance.stableId.startsWith("yggdrasil:primitive:"),
		).length,
		yggdrasilExpectedRuntimeImports.primitiveParity.primitiveNodeCount,
		"Yggdrasil runtime scene must instantiate every primitive node from the target-owned parity data.",
	);
	assertEqual(
		(manifest.readiness.requiredCollisionStableIds ?? []).filter((stableId) =>
			stableId.startsWith("yggdrasil:primitive:"),
		).length,
		yggdrasilExpectedRuntimeImports.primitiveParity.collisionNodeCount,
		"Yggdrasil runtime scene readiness must include every primitive collision node.",
	);
	assertIncludes(
		result.graph.portalTargetRuntimeSceneIds,
		"portal_arena_runtime",
		"Yggdrasil runtime scene must include a return portal to the portal arena.",
	);
	assertEqual(
		returnPortalTargets.some(
			(portal) => portal?.targetRuntimeSceneId === "portal_arena_runtime",
		),
		true,
		"Yggdrasil runtime scene must author a portal component back to the portal arena.",
	);
	assertNonEmpty(
		storyNoteStableIds,
		"Yggdrasil runtime scene must include at least one authored story note.",
	);
	assertIncludes(
		manifest.readiness.requiredAssetIds ?? [],
		"mesh_water_plane",
		"Yggdrasil ocean must preload the shared water mesh through the manifest.",
	);
	assertIncludes(
		manifest.readiness.requiredAssetIds ?? [],
		"material_water_surface",
		"Yggdrasil ocean must preload the shared water material through the manifest.",
	);
	assertDeepEqual(
		transformPropertyForStableId(manifest, "yggdrasil:water:ocean", "position"),
		[0, -3.35, 0],
	);
	assertDeepEqual(
		transformPropertyForStableId(manifest, "yggdrasil:water:ocean", "scale"),
		[920, 0.02, 920],
	);
	assertEqual(oceanRenderable.meshId, "mesh_water_plane");
	assertEqual(oceanRenderable.materialId, "material_water_surface");
	assertEqual(oceanWaterSurface.surfaceType, "plane");
	assertEqual(oceanWaterSurface.bodyType, "ocean");
	assertDeepEqual(oceanWaterSurface.refraction, {
		enabled: true,
		intensity: 0.08,
	});
	assertDeepEqual(oceanWaterSurface.gameplayVolume, {
		enabled: false,
	});
	assertEqual(
		componentsForStableId(manifest, "yggdrasil:water:ocean").Collider,
		undefined,
		"Yggdrasil ocean must stay visual-only until WaterSurface gameplay volumes exist.",
	);

	for (const stableId of yggdrasilExpectedWalkableStableIds) {
		const collider = componentForStableId(manifest, stableId, "Collider");
		const shape = assertRecord(
			collider.shape,
			`${stableId} Yggdrasil primitive collider shape`,
		);

		assertEqual(collider.intent, "walkable");
		assertEqual(collider.channel, "worldStatic");
		assertEqual(
			shape.type,
			"box",
			"Yggdrasil primitive collision must honor explicit cuboid source data instead of deriving collider type from render geometry.",
		);
		assertIncludes(
			manifest.readiness.requiredCollisionStableIds ?? [],
			stableId,
			`Yggdrasil walkable stable ID ${stableId} must also be collision-required.`,
		);
	}
}

{
	const manifest = loadRuntimeSceneManifest(sciFiRoomRuntimeSceneManifest);
	const readiness = evaluateRuntimeSceneReadiness(
		manifest,
		validLoadReport(manifest),
	);

	if (!readiness.ok) {
		throw new Error(
			`Expected Sci Fi Room manifest to be ready, received ${readiness.errors.join("; ")}.`,
		);
	}

	assertEqual(readiness.manifestId, "sci_fi_room_runtime");
	assertEqual(manifest.level.id, "sci_fi_room");
	assertEqual(manifest.level.sceneId, "sci_fi_room_game");
	assertEqual(
		defaultRuntimeSceneManifests.includes(sciFiRoomRuntimeSceneManifest),
		true,
		"Sci Fi Room runtime scene must be registered in the default catalog.",
	);
	assertEqual(
		getRuntimeSceneManifest("sci_fi_room_runtime")?.id,
		"sci_fi_room_runtime",
	);
}

{
	const manifest = loadRuntimeSceneManifest(sciFiRoomRuntimeSceneManifest);
	const floorExpectations = [
		{
			stableId: "sci-fi-room:floor:interior",
			position: [0, -0.56, 0],
			materialId: "material_sci_fi_room_interior_floor",
			halfExtents: [10.78, 0.24, 9.26],
		},
		{
			stableId: "sci-fi-room:floor:courtyard",
			position: [0, -0.56, 21.52],
			materialId: "material_sci_fi_room_courtyard_floor",
			halfExtents: [12.936, 0.24, 12.936],
		},
		{
			stableId: "sci-fi-room:floor:wasteland",
			position: [0.063, -0.806, 1.736],
			materialId: "material_sci_fi_room_wasteland_floor",
			halfExtents: [100.9975, 0.192, 102.2675],
		},
	] as const;
	const environment = manifest.renderProfile.environment;
	const environmentAssetId = assetBackedEnvironmentAssetId(manifest);
	const portal = componentForStableId(
		manifest,
		"sci-fi-room:portal:observatory",
		"Portal",
	);
	const portalCollider = componentForStableId(
		manifest,
		"sci-fi-room:portal:observatory",
		"Collider",
	);
	const portalSoundEmitter = componentForStableId(
		manifest,
		"sci-fi-room:portal:observatory",
		"SoundEmitter",
	);
	const playerLight = componentForStableId(manifest, "player", "Light");
	const playerController = componentForStableId(
		manifest,
		"player",
		"CharacterController",
	);
	const playerKinematicCollision = assertRecord(
		playerController.kinematicCollision,
		"Sci Fi Room player kinematic collision settings",
	);
	const bounds = assertRecord(
		manifest.level.resources?.["game:characterBounds"],
		"Sci Fi Room character bounds",
	);

	assertEqual(manifest.renderProfile.id, "sci_fi_room_interior_courtyard");
	assertEqual(environmentAssetId, "cubemap_observatory_sky");
	assertEqual(environment.kind, "cubemap-skybox");
	assertIncludes(
		manifest.readiness.requiredAssetIds ?? [],
		"cubemap_observatory_sky",
	);
	assertIncludes(
		manifest.readiness.requiredAssetIds ?? [],
		"audio_portal_activate",
	);
	assertIncludes(
		manifest.readiness.requiredAssetIds ?? [],
		"audio_portal_cycle",
	);
	assertEqual(bounds.minX, -48);
	assertEqual(bounds.maxX, 48);
	assertEqual(bounds.minZ, -18);
	assertEqual(bounds.maxZ, 64);
	assertDeepEqual(
		transformPropertyForStableId(manifest, "player", "position"),
		[0, 1.5, 0],
	);
	assertEqual(playerController.groundY, 1.5);
	assertDeepEqual(playerKinematicCollision.obstacleChannels, ["worldStatic"]);
	assertEqual(playerLight.kind, "point");
	assertEqual(playerLight.color, "#ffd6a3");
	assertEqual(playerLight.intensity, 5.5);
	assertEqual(playerLight.distance, 16);
	assertEqual(portal.id, "sci-fi-room.observatory");
	assertEqual(portal.label, "Observatory");
	assertEqual(portal.targetRuntimeSceneId, "observatory_runtime");
	assertEqual(portalCollider.intent, "trigger");
	assertEqual(portalCollider.channel, "interaction");
	assertEqual(portalCollider.sensor, true);
	assertEqual(portalSoundEmitter.soundId, "audio_portal_cycle");

	for (const expectation of floorExpectations) {
		const renderable = componentForStableId(
			manifest,
			expectation.stableId,
			"Renderable",
		);
		const collider = componentForStableId(
			manifest,
			expectation.stableId,
			"Collider",
		);
		const shape = assertRecord(
			collider.shape,
			`${expectation.stableId} collider shape`,
		);

		assertIncludes(
			manifest.readiness.requiredCollisionStableIds ?? [],
			expectation.stableId,
		);
		assertIncludes(
			manifest.readiness.requiredWalkableStableIds ?? [],
			expectation.stableId,
		);
		assertEqual(renderable.meshId, "mesh_sci_fi_room_floor_slab");
		assertEqual(renderable.materialId, expectation.materialId);
		assertEqual(collider.intent, "walkable");
		assertEqual(collider.channel, "worldStatic");
		assertEqual(shape.type, "box");
		assertDeepEqual(shape.halfExtents, expectation.halfExtents);
		assertDeepEqual(
			transformPropertyForStableId(manifest, expectation.stableId, "position"),
			expectation.position,
		);
	}

	for (const [stableId, title] of [
		["sci-fi-room:story:pillar", "Pillar Whisper"],
		["sci-fi-room:story:bench", "Bench Note"],
		["sci-fi-room:story:fountain", "Fountain Inscription"],
		["sci-fi-room:story:plant", "Plant Spiral"],
		["sci-fi-room:story:junk", "Junk Memory"],
	] as const) {
		const storyNote = componentForStableId(manifest, stableId, "StoryNote");
		const collider = componentForStableId(manifest, stableId, "Collider");

		assertEqual(storyNote.title, title);
		assertEqual(storyNote.activationRadius, 2.35);
		assertEqual(collider.intent, "trigger");
		assertEqual(collider.channel, "interaction");
		assertEqual(collider.sensor, true);
	}

	for (const assetString of allAssetStrings(manifest)) {
		assertEqual(
			assetString.includes("/generated/runtime-game-assets/"),
			false,
			`Sci Fi Room target manifest must not reference old generated runtime asset paths: ${assetString}`,
		);
		assertEqual(
			assetString.includes(".collider."),
			false,
			`Sci Fi Room target manifest must not reference old generated collider binaries: ${assetString}`,
		);
	}
}

{
	const manifest = loadRuntimeSceneManifest(observatoryRuntimeSceneManifest);
	const requiredLightStableIds = [
		"player",
		"observatory:firefly:archive",
		"observatory:firefly:lantern",
		"observatory:firefly:tide",
	] as const;
	const boundaryCollisionExpectations = [
		{
			stableId: "observatory:collision:boundary:north",
			position: [0, 5.8, -304],
			halfExtents: [320, 4, 4],
		},
		{
			stableId: "observatory:collision:boundary:south",
			position: [0, 5.8, 304],
			halfExtents: [320, 4, 4],
		},
		{
			stableId: "observatory:collision:boundary:east",
			position: [304, 5.8, 0],
			halfExtents: [4, 4, 320],
		},
		{
			stableId: "observatory:collision:boundary:west",
			position: [-304, 5.8, 0],
			halfExtents: [4, 4, 320],
		},
	] as const;
	const environmentAssetId = assetBackedEnvironmentAssetId(manifest);
	const environment = manifest.renderProfile.environment;
	const environmentAsset = manifest.assets.assets.find(
		(asset) => asset.id === "mesh_observatory_environment",
	);
	const renderLights = manifest.renderProfile.lighting.lights;
	const ambientLight = renderLights.find((light) => light.kind === "ambient");
	const terrainRenderable = componentForStableId(
		manifest,
		"observatory:terrain",
		"Renderable",
	);
	const walkableCollider = componentForStableId(
		manifest,
		firstObservatoryWalkableChunkStableId,
		"Collider",
	);
	const centerWalkableCollider = componentForStableId(
		manifest,
		centerObservatoryWalkableChunkStableId,
		"Collider",
	);
	const walkableShape = assertRecord(
		walkableCollider.shape,
		"Observatory walkable mesh chunk collider shape",
	);
	const centerWalkableShape = assertRecord(
		centerWalkableCollider.shape,
		"Observatory center walkable mesh chunk collider shape",
	);
	const waterRenderable = componentForStableId(
		manifest,
		"observatory:water",
		"Renderable",
	);
	const waterMaterialAsset = manifest.assets.assets.find(
		(asset) => asset.id === "material_water_surface",
	);
	const waterMaterial = assertRecord(
		waterMaterialAsset?.material,
		"Observatory water material",
	);
	const bounds = assertRecord(
		manifest.level.resources?.["game:characterBounds"],
		"Observatory character bounds",
	);
	const playerLight = componentForStableId(manifest, "player", "Light");
	const playerCollider = componentForStableId(manifest, "player", "Collider");
	const playerCharacterController = componentForStableId(
		manifest,
		"player",
		"CharacterController",
	);
	const playerKinematicCollision = assertRecord(
		playerCharacterController.kinematicCollision,
		"Observatory player kinematic collision settings",
	);

	assertIncludes(
		manifest.readiness.requiredAssetIds ?? [],
		"mesh_observatory_environment",
	);
	assertIncludes(
		manifest.readiness.requiredAssetIds ?? [],
		"cubemap_observatory_sky",
	);
	assertEqual(environmentAssetId, "cubemap_observatory_sky");
	assertEqual(environment.kind, "cubemap-skybox");

	if (environment.kind !== "cubemap-skybox") {
		throw new Error("Observatory render profile must use a cubemap skybox.");
	}

	assertEqual(
		environmentAsset?.url,
		"/assets/game/observatory/observatory-environment.glb",
	);
	if (environment.kind !== "cubemap-skybox") {
		throw new Error("Observatory render profile must use a cubemap skybox.");
	}
	assertEqual(manifest.renderProfile.id, "observatory_moon_archive");
	assertEqual(environment.backgroundIntensity, 0.85);
	assertEqual(environment.environmentIntensity, 1.1);
	assertEqual(environment.backgroundBlurriness, 0.12);
	assertEqual(ambientLight?.color, "#c9d8f2");
	assertEqual(ambientLight?.intensity, 0.08);
	assertEqual(
		renderLights.some((light) => light.kind === "directional"),
		false,
		"Observatory v1 should not add daylight-style directional key/fill lights.",
	);

	assertDeepEqual(
		transformPropertyForStableId(manifest, "player", "position"),
		[-137.2, 1.8, -49.5],
	);
	assertEqual(playerCharacterController.groundY, 1.8);
	assertDeepEqual(playerCollider.offset, [0, 0.9, 0]);
	assertEqual(playerLight.kind, "point");
	assertEqual(playerLight.color, "#ffd6a3");
	assertEqual(playerLight.intensity, 5.5);
	assertEqual(playerLight.distance, 16);
	assertEqual(playerLight.decay, 2);
	assertEqual(playerLight.visible, true);

	assertEqual(terrainRenderable.meshId, "mesh_observatory_environment");
	assertEqual(
		componentsForStableId(manifest, "observatory:terrain").Collider,
		undefined,
		"Observatory render GLB should not be treated as implicit collision.",
	);
	assertDeepEqual(
		transformPropertyForStableId(manifest, "observatory:terrain", "scale"),
		[1, 1, 1],
	);
	assertIncludes(
		manifest.readiness.requiredCollisionPrefabIds ?? [],
		"observatory_walkable_mesh",
	);
	assertIncludes(
		manifest.readiness.requiredCollisionPrefabIds ?? [],
		"observatory_boundary_blocker",
	);
	for (const stableId of observatoryWalkableChunkStableIds) {
		assertIncludes(
			manifest.readiness.requiredWalkableStableIds ?? [],
			stableId,
		);
		assertIncludes(
			manifest.readiness.requiredCollisionStableIds ?? [],
			stableId,
		);
	}
	assertEqual(walkableCollider.intent, "walkable");
	assertEqual(walkableCollider.channel, "worldStatic");
	assertEqual(walkableShape.type, "mesh");
	assertEqual(centerWalkableCollider.intent, "walkable");
	assertEqual(centerWalkableCollider.channel, "worldStatic");
	assertEqual(centerWalkableShape.type, "mesh");
	if (
		!Array.isArray(walkableShape.vertices) ||
		!Array.isArray(walkableShape.indices) ||
		!Array.isArray(centerWalkableShape.vertices) ||
		!Array.isArray(centerWalkableShape.indices)
	) {
		throw new Error(
			"Observatory walkable mesh chunks must use mesh vertices/indices.",
		);
	}
	assertEqual(walkableShape.vertices.length, 25);
	assertEqual(walkableShape.indices.length, 96);
	assertEqual(walkableShape.indices.length / 3, 32);
	assertEqual(centerWalkableShape.vertices.length, 25);
	assertEqual(centerWalkableShape.indices.length, 96);
	assertEqual(centerWalkableShape.indices.length / 3, 32);
	assertDeepEqual(walkableShape.vertices[0], [-320, 1.43, -320]);
	assertDeepEqual(walkableShape.vertices[24], [-160, 1.67, -160]);
	assertDeepEqual(walkableShape.indices.slice(0, 6), [0, 5, 1, 1, 5, 6]);
	assertDeepEqual(centerWalkableShape.vertices[0], [0, 2.25, 0]);
	assertDeepEqual(centerWalkableShape.vertices[24], [160, 2.09, 160]);
	assertDeepEqual(centerWalkableShape.indices.slice(0, 6), [0, 5, 1, 1, 5, 6]);
	assertMeshVertexHeight(
		walkableShape.vertices,
		-160,
		-160,
		1.67,
		"Observatory first walkable mesh chunk",
	);
	assertMeshVertexHeight(
		centerWalkableShape.vertices,
		120,
		120,
		2.24,
		"Observatory center walkable mesh chunk",
	);
	assertEqual(playerKinematicCollision.enabled, true);
	assertEqual(playerKinematicCollision.offset, 0.04);
	assertEqual(playerKinematicCollision.slide, true);
	assertDeepEqual(playerKinematicCollision.obstacleChannels, ["worldStatic"]);
	assertEqual(playerKinematicCollision.snapToGroundDistance, 0.7);
	assertEqual(playerKinematicCollision.maxSlopeClimbAngle, 0.7853981633974483);
	assertEqual(playerKinematicCollision.minSlopeSlideAngle, 0.8726646259971648);
	assertDeepEqual(playerKinematicCollision.autostep, {
		maxHeight: 0.45,
		minWidth: 0.35,
		includeDynamicBodies: false,
	});
	assertDeepEqual(
		transformPropertyForStableId(
			manifest,
			firstObservatoryWalkableChunkStableId,
			"position",
		),
		[0, 0, 0],
	);
	for (const expectation of boundaryCollisionExpectations) {
		const boundaryCollider = componentForStableId(
			manifest,
			expectation.stableId,
			"Collider",
		);
		const boundaryShape = assertRecord(
			boundaryCollider.shape,
			`${expectation.stableId} collider shape`,
		);

		assertIncludes(
			manifest.readiness.requiredCollisionStableIds ?? [],
			expectation.stableId,
		);
		assertEqual(boundaryCollider.intent, "solid");
		assertEqual(boundaryCollider.channel, "worldStatic");
		assertEqual(boundaryShape.type, "box");
		assertDeepEqual(boundaryShape.halfExtents, expectation.halfExtents);
		assertDeepEqual(
			transformPropertyForStableId(manifest, expectation.stableId, "position"),
			expectation.position,
		);
	}
	assertEqual(bounds.minX, -300);
	assertEqual(bounds.maxX, 300);
	assertEqual(bounds.minZ, -300);
	assertEqual(bounds.maxZ, 300);
	assertDeepEqual(
		transformPropertyForStableId(manifest, "observatory:water", "position"),
		[0, -2, 0],
	);
	assertDeepEqual(
		transformPropertyForStableId(manifest, "observatory:water", "scale"),
		[4000, 0.02, 4000],
	);
	assertEqual(waterRenderable.meshId, "mesh_water_plane");
	assertEqual(waterRenderable.materialId, "material_water_surface");
	assertEqual(waterMaterial.color, "#06324a");
	assertEqual(waterMaterial.emissive, "#01111c");
	assertEqual(waterMaterial.emissiveIntensity, 0.05);
	assertEqual(waterMaterial.metalness, 0);
	assertEqual(waterMaterial.roughness, 0.18);
	assertEqual(waterMaterial.opacity, 0.88);
	assertEqual(waterMaterial.transparent, true);
	assertEqual(
		componentsForStableId(manifest, "observatory:water").Collider,
		undefined,
		"Observatory water should stay visual-only in the foundation slice.",
	);

	for (const stableId of requiredLightStableIds) {
		assertIncludes(manifest.readiness.requiredLightStableIds ?? [], stableId);
	}

	for (const fireflyStableId of requiredLightStableIds.slice(1)) {
		const fireflyRenderable = componentForStableId(
			manifest,
			fireflyStableId,
			"Renderable",
		);
		const fireflyLight = componentForStableId(
			manifest,
			fireflyStableId,
			"Light",
		);

		assertEqual(fireflyRenderable.meshId, "mesh_observatory_firefly_marker");
		assertEqual(fireflyRenderable.materialId, "material_observatory_firefly");
		assertEqual(fireflyLight.kind, "point");
		assertEqual(fireflyLight.color, "#f4ffb8");
		assertEqual(fireflyLight.intensity, 8);
		assertEqual(fireflyLight.distance, 34);
		assertEqual(fireflyLight.decay, 1.6);
		assertEqual(fireflyLight.visible, true);
	}

	assertDeepEqual(
		transformPropertyForStableId(
			manifest,
			"observatory:firefly:archive",
			"position",
		),
		[-108.5, 4.4, 68],
	);
	assertDeepEqual(
		transformPropertyForStableId(
			manifest,
			"observatory:firefly:lantern",
			"position",
		),
		[72, 5.2, -92],
	);
	assertDeepEqual(
		transformPropertyForStableId(
			manifest,
			"observatory:firefly:tide",
			"position",
		),
		[132, 3.6, 104],
	);

	for (const assetString of allAssetStrings(manifest)) {
		assertEqual(
			assetString.includes("/generated/runtime-game-assets/"),
			false,
			`Observatory target manifest must not reference old generated runtime asset paths: ${assetString}`,
		);
		assertEqual(
			assetString.includes("terrain-chunk") ||
				assetString.includes("terrain_chunk") ||
				assetString.includes("/terrain/chunks/") ||
				assetString.includes("/terrain/levels/observatory-environment/"),
			false,
			`Observatory target manifest must not reference old terrain chunks: ${assetString}`,
		);
		assertEqual(
			assetString.includes("/terrain/observatory-environment.manifest.json"),
			false,
			`Observatory target manifest must not reference old terrain manifests: ${assetString}`,
		);
		assertEqual(
			assetString.includes(".collider."),
			false,
			`Observatory target manifest must not reference old generated collider binaries: ${assetString}`,
		);
	}
}

{
	const manifest = loadRuntimeSceneManifest(observatoryRuntimeSceneManifest);

	for (const missingStableId of manifest.readiness.requiredLightStableIds ??
		[]) {
		const readiness = evaluateRuntimeSceneReadiness(manifest, {
			...validLoadReport(manifest),
			spawned: manifest.level.instances
				.filter((instance) => instance.stableId !== missingStableId)
				.map((instance) => ({
					prefabId: instance.prefabId,
					stableId: instance.stableId,
				})),
		});

		assertEqual(readiness.ok, false);
		assertIncludes(
			readiness.ok ? [] : readiness.errors,
			`Required light instance "${missingStableId}" was not spawned.`,
		);
	}
}

{
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const observatoryPortal = componentForStableId(
		manifest,
		"portal-arena:portal:observatory",
		"Portal",
	);

	assertEqual(observatoryPortal.targetRuntimeSceneId, "observatory_runtime");
}

{
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const sciFiRoomPortal = componentForStableId(
		manifest,
		"portal-arena:portal:sci-fi-room",
		"Portal",
	);

	assertIncludes(
		manifest.readiness.requiredCollisionStableIds ?? [],
		"portal-arena:portal:sci-fi-room",
	);
	assertEqual(sciFiRoomPortal.label, "Sci Fi Room");
	assertEqual(sciFiRoomPortal.targetRuntimeSceneId, "sci_fi_room_runtime");
}

{
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const solitudePortal = componentForStableId(
		manifest,
		solitudePortalStableId,
		"Portal",
	);

	assertEqual(solitudePortal.label, "Solitude");
	assertIncludes(
		manifest.readiness.requiredCollisionStableIds ?? [],
		solitudePortalStableId,
	);
	assertEqual(solitudePortal.targetRuntimeSceneId, solitudeRuntimeSceneId);
	assertIncludes(
		defaultRuntimeSceneManifests.map((runtimeManifest) => runtimeManifest.id),
		solitudeRuntimeSceneId,
	);
}

{
	const manifest = loadRuntimeSceneManifest(solitudeRuntimeSceneManifest);
	const readiness = evaluateRuntimeSceneReadiness(
		manifest,
		validLoadReport(manifest),
	);
	const audioContent = parseAudioContentManifest(
		audioContentManifestForRuntimeScene(manifest.id),
		{ assetManifest: manifest.assets },
	);
	const contentGraph = validateRuntimeSceneContentGraph({
		manifest,
		runtimeSceneIds: defaultRuntimeSceneManifests.map(
			(runtimeManifest) => runtimeManifest.id,
		),
		audioContent,
	});
	const requiredWalkableStableIds =
		manifest.readiness.requiredWalkableStableIds ?? [];

	if (!readiness.ok) {
		throw new Error(
			`Expected Solitude manifest to be ready, received ${readiness.errors.join("; ")}.`,
		);
	}

	if (!contentGraph.ok) {
		throw new Error(
			`Expected Solitude content graph to validate, received ${contentGraph.errors.join("; ")}.`,
		);
	}

	assertEqual(readiness.manifestId, solitudeRuntimeSceneId);
	assertEqual(manifest.level.id, "solitude");
	assertEqual(manifest.level.sceneId, "solitude_game");
	assertEqual(
		defaultRuntimeSceneManifests.includes(solitudeRuntimeSceneManifest),
		true,
		"Solitude runtime scene must be registered in the default catalog.",
	);
	assertEqual(
		getRuntimeSceneManifest(solitudeRuntimeSceneId)?.id,
		solitudeRuntimeSceneId,
	);
	assertSameStringSet(
		contentGraph.graph.walkableStableIds,
		solitudeExpectedWalkableStableIds,
		"Solitude content graph must expose exactly the two authored walkable surfaces.",
	);
	assertSameStringSet(
		requiredWalkableStableIds,
		solitudeExpectedWalkableStableIds,
		"Solitude readiness.requiredWalkableStableIds must exactly match the two authored walkable surfaces.",
	);
	assertSameStringSet(
		manifest.readiness.requiredCollisionStableIds,
		solitudeExpectedCollisionStableIds,
		"Solitude readiness.requiredCollisionStableIds must exactly match the Solitude contract.",
	);
	assertSameStringSet(
		manifest.readiness.requiredCollisionStableIds,
		contentGraph.graph.collisionStableIds,
		"Solitude readiness.requiredCollisionStableIds must exactly match authored collision stable IDs.",
	);
	assertSameStringSet(
		manifest.readiness.requiredAssetIds,
		solitudeExpectedRuntimeImports.assetIds,
		"Solitude readiness.requiredAssetIds must exactly match the Solitude contract.",
	);
	assertSameStringSet(
		manifest.readiness.requiredAssetIds,
		contentGraph.graph.authoredAssetIds,
		"Solitude readiness.requiredAssetIds must exactly match authored content assets.",
	);

	for (const stableId of requiredWalkableStableIds) {
		const collider = componentForStableId(manifest, stableId, "Collider");

		assertIncludes(
			manifest.readiness.requiredCollisionStableIds ?? [],
			stableId,
		);
		assertEqual(collider.intent, "walkable");
		assertEqual(collider.channel, "worldStatic");
	}

	for (const assetString of allAssetStrings(manifest)) {
		for (const marker of solitudeOldPathMarkers) {
			assertEqual(
				assetString.includes(marker),
				false,
				`Solitude target manifest must not reference old generated/provenance-only paths: ${assetString}`,
			);
		}
	}
}

{
	const manifest = loadRuntimeSceneManifest(mirandaDeckRuntimeSceneManifest);
	const mainFloorCollider = componentForStableId(
		manifest,
		"miranda:floor:main",
		"Collider",
	);
	const upperFloorCollider = componentForStableId(
		manifest,
		"miranda:floor:upper",
		"Collider",
	);
	const cargoFloorCollider = componentForStableId(
		manifest,
		"miranda:floor:cargo-hold",
		"Collider",
	);
	const mainFloorShape = assertRecord(
		mainFloorCollider.shape,
		"Miranda main floor collider shape",
	);
	const upperFloorShape = assertRecord(
		upperFloorCollider.shape,
		"Miranda upper floor collider shape",
	);
	const cargoFloorShape = assertRecord(
		cargoFloorCollider.shape,
		"Miranda cargo-hold floor collider shape",
	);
	const bounds = assertRecord(
		manifest.level.resources?.["game:characterBounds"],
		"Miranda character bounds",
	);
	const playerController = componentForStableId(
		manifest,
		"player",
		"CharacterController",
	);

	assertIncludes(
		manifest.readiness.requiredWalkableStableIds ?? [],
		"miranda:floor:main",
	);
	assertIncludes(
		manifest.readiness.requiredWalkableStableIds ?? [],
		"miranda:floor:upper",
	);
	assertIncludes(
		manifest.readiness.requiredWalkableStableIds ?? [],
		"miranda:floor:cargo-hold",
	);
	assertEqual(mainFloorCollider.intent, "walkable");
	assertEqual(mainFloorCollider.channel, "worldStatic");
	assertEqual(upperFloorCollider.intent, "walkable");
	assertEqual(upperFloorCollider.channel, "worldStatic");
	assertEqual(cargoFloorCollider.intent, "walkable");
	assertEqual(cargoFloorCollider.channel, "worldStatic");
	assertEqual(mainFloorShape.type, "box");
	assertDeepEqual(mainFloorShape.halfExtents, [20, 0.6, 46]);
	assertEqual(upperFloorShape.type, "box");
	assertDeepEqual(upperFloorShape.halfExtents, [9, 0.45, 9]);
	assertEqual(cargoFloorShape.type, "box");
	assertDeepEqual(cargoFloorShape.halfExtents, [20, 0.6, 3]);
	assertEqual(bounds.minX, -20);
	assertEqual(bounds.maxX, 20);
	assertEqual(bounds.minZ, -50);
	assertEqual(bounds.maxZ, 48);
	assertEqual(playerController.groundY, 4.25);
}

{
	const manifest = loadRuntimeSceneManifest(mirandaDeckRuntimeSceneManifest);
	const returnPortal = componentForStableId(
		manifest,
		"miranda:airlock:return-portal",
		"Portal",
	);
	const returnPortalRenderable = componentForStableId(
		manifest,
		"miranda:airlock:return-portal",
		"Renderable",
	);
	const returnPortalCollider = componentForStableId(
		manifest,
		"miranda:airlock:return-portal",
		"Collider",
	);

	assertIncludes(manifest.readiness.requiredAssetIds ?? [], "mesh_portal_gate");
	assertIncludes(
		manifest.readiness.requiredAssetIds ?? [],
		"audio_portal_activate",
	);
	assertIncludes(
		manifest.readiness.requiredCollisionPrefabIds ?? [],
		"portal_gate",
	);
	assertIncludes(
		manifest.readiness.requiredCollisionStableIds ?? [],
		"miranda:airlock:return-portal",
	);
	assertDeepEqual(
		transformPropertyForStableId(
			manifest,
			"miranda:airlock:return-portal",
			"position",
		),
		[0, 1, 6.6],
	);
	assertDeepEqual(
		transformPropertyForStableId(
			manifest,
			"miranda:airlock:return-portal",
			"scale",
		),
		[0.95, 0.95, 0.95],
	);
	assertEqual(returnPortal.id, "miranda.return.observatory");
	assertEqual(returnPortal.label, "Return to Observatory");
	assertEqual(returnPortal.targetRuntimeSceneId, "observatory_runtime");
	assertEqual(returnPortalRenderable.meshId, "mesh_portal_gate");
	assertEqual(returnPortalCollider.intent, "trigger");
	assertEqual(returnPortalCollider.channel, "interaction");
	assertEqual(returnPortalCollider.sensor, true);
}

{
	const manifest = cloneValue(portalArenaRuntimeSceneManifest);
	const brokenManifest = {
		...manifest,
		level: {
			...manifest.level,
			instances: manifest.level.instances.map((instance) =>
				instance.stableId === "player"
					? {
							...instance,
							components: Object.fromEntries(
								Object.entries(instance.components ?? {}).filter(
									([name]) => name !== "Light",
								),
							),
						}
					: instance,
			),
		},
	};

	assertErrorIncludes(
		() => loadRuntimeSceneManifest(brokenManifest),
		`runtimeSceneManifest.readiness.requiredLightStableIds "player" resolves to prefab "player" with no Light component.`,
	);
}

{
	const manifest = cloneValue(portalArenaRuntimeSceneManifest);
	const environmentAssetId = assetBackedEnvironmentAssetId(manifest);
	const brokenManifest = {
		...manifest,
		assets: {
			...manifest.assets,
			assets: manifest.assets.assets.filter(
				(asset) => asset.id !== environmentAssetId,
			),
			preloadGroups: Object.fromEntries(
				Object.entries(manifest.assets.preloadGroups ?? {}).map(
					([groupId, assetIds]) => [
						groupId,
						assetIds.filter((assetId) => assetId !== environmentAssetId),
					],
				),
			),
		},
	};

	assertErrorIncludes(
		() => loadRuntimeSceneManifest(brokenManifest),
		`runtimeSceneManifest.renderProfile.environment.assetId references unknown asset "${environmentAssetId}"`,
	);
}

{
	const manifest = cloneValue(portalArenaRuntimeSceneManifest);
	const environmentAssetId = assetBackedEnvironmentAssetId(manifest);
	const brokenManifest = {
		...manifest,
		level: {
			...manifest.level,
			preload: manifest.level.preload?.filter(
				(assetId) => assetId !== environmentAssetId,
			),
		},
		assets: {
			...manifest.assets,
			preloadGroups: Object.fromEntries(
				Object.entries(manifest.assets.preloadGroups ?? {}).map(
					([groupId, assetIds]) => [
						groupId,
						assetIds.filter((assetId) => assetId !== environmentAssetId),
					],
				),
			),
		},
	};

	assertErrorIncludes(
		() => loadRuntimeSceneManifest(brokenManifest),
		`renderProfile.environment.assetId references asset "${environmentAssetId}" that is not declared in the level preload set`,
	);
}

{
	const manifest = cloneValue(portalArenaRuntimeSceneManifest);
	const environmentAssetId = assetBackedEnvironmentAssetId(manifest);
	const brokenManifest = {
		...manifest,
		readiness: {
			...manifest.readiness,
			requiredAssetIds: manifest.readiness.requiredAssetIds?.filter(
				(assetId) => assetId !== environmentAssetId,
			),
		},
	};

	assertErrorIncludes(
		() => loadRuntimeSceneManifest(brokenManifest),
		`renderProfile.environment.assetId "${environmentAssetId}" is required for readiness but is missing from runtimeSceneManifest.readiness.requiredAssetIds`,
	);
}

{
	const manifest = cloneValue(portalArenaRuntimeSceneManifest);
	const environmentAssetId = assetBackedEnvironmentAssetId(manifest);
	const brokenManifest = {
		...manifest,
		assets: {
			...manifest.assets,
			assets: manifest.assets.assets.map((asset) =>
				asset.id === environmentAssetId
					? {
							...asset,
							projection: "uv" as const,
						}
					: asset,
			),
		},
	};

	assertErrorIncludes(
		() => loadRuntimeSceneManifest(brokenManifest),
		`runtimeSceneManifest.renderProfile.environment.assetId "${environmentAssetId}" must reference a texture asset with projection "equirectangular"`,
	);
}

{
	const manifest = cloneValue(mirandaDeckRuntimeSceneManifest);
	const material = manifest.assets.assets.find(
		(asset) => asset.id === "material_miranda_med_pod",
	);

	if (!material?.material) {
		throw new Error("Expected Miranda med pod material parameters to exist.");
	}

	(material.material as Record<string, unknown>).transparent = false;

	assertErrorIncludes(
		() => loadRuntimeSceneManifest(manifest),
		"material.transparent must be true when opacity is below 1",
	);
}

{
	const manifest = cloneValue(mirandaDeckRuntimeSceneManifest);
	const material = manifest.assets.assets.find(
		(asset) => asset.id === "material_miranda_cockpit_panel_center",
	);

	if (!material?.material) {
		throw new Error(
			"Expected Miranda cockpit center material parameters to exist.",
		);
	}

	(material.material as Record<string, unknown>).metalness = 1.5;

	assertErrorIncludes(
		() => loadRuntimeSceneManifest(manifest),
		"material.metalness must be a finite number from 0 to 1",
	);
}

{
	const manifest = cloneValue(mirandaDeckRuntimeSceneManifest);
	const material = manifest.assets.assets.find(
		(asset) => asset.id === "material_miranda_server_bank_wide",
	);

	if (!material?.material) {
		throw new Error(
			"Expected Miranda server bank material parameters to exist.",
		);
	}

	(material.material as Record<string, unknown>).sparkle = 1;

	assertErrorIncludes(
		() => loadRuntimeSceneManifest(manifest),
		"material.sparkle is not a supported material parameter",
	);
}

{
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const missingAssetId = firstRequired(
		manifest.readiness.requiredAssetIds,
		"portal arena required assets",
	);
	const report = validLoadReport(manifest);
	const readiness = evaluateRuntimeSceneReadiness(manifest, {
		...report,
		preloadedAssetIds: report.preloadedAssetIds.filter(
			(assetId) => assetId !== missingAssetId,
		),
	});

	assertEqual(readiness.ok, false);
	assertIncludes(
		readiness.ok ? [] : readiness.errors,
		`Required asset "${missingAssetId}" was not preloaded.`,
	);
}

{
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const readiness = evaluateRuntimeSceneReadiness(manifest, {
		...validLoadReport(manifest),
		spawned: manifest.level.instances
			.filter(
				(instance) => instance.stableId !== manifest.readiness.playerStableId,
			)
			.map((instance) => ({
				prefabId: instance.prefabId,
				stableId: instance.stableId,
			})),
		playerReady: false,
	});

	assertEqual(readiness.ok, false);
	assertIncludes(
		readiness.ok ? [] : readiness.errors,
		`Required player spawn "${manifest.readiness.playerStableId}" was not spawned.`,
	);
}

{
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const missingPrefabId = firstRequired(
		manifest.readiness.requiredCollisionPrefabIds,
		"portal arena required collision prefabs",
	);
	const readiness = evaluateRuntimeSceneReadiness(manifest, {
		...validLoadReport(manifest),
		spawned: manifest.level.instances
			.filter((instance) => instance.prefabId !== missingPrefabId)
			.map((instance) => ({
				prefabId: instance.prefabId,
				stableId: instance.stableId,
			})),
	});

	assertEqual(readiness.ok, false);
	assertIncludes(
		readiness.ok ? [] : readiness.errors,
		`Required collision prefab "${missingPrefabId}" was not spawned.`,
	);
}

{
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const missingStableId = "portal-arena:portal:prototype-arena";
	const readiness = evaluateRuntimeSceneReadiness(manifest, {
		...validLoadReport(manifest),
		spawned: manifest.level.instances
			.filter((instance) => instance.stableId !== missingStableId)
			.map((instance) => ({
				prefabId: instance.prefabId,
				stableId: instance.stableId,
			})),
	});

	assertEqual(readiness.ok, false);
	assertIncludes(
		readiness.ok ? [] : readiness.errors,
		`Required collision instance "${missingStableId}" was not spawned.`,
	);
}

{
	const manifest = loadRuntimeSceneManifest(observatoryRuntimeSceneManifest);
	const missingStableId = "observatory:collision:boundary:north";
	const readiness = evaluateRuntimeSceneReadiness(manifest, {
		...validLoadReport(manifest),
		spawned: manifest.level.instances
			.filter((instance) => instance.stableId !== missingStableId)
			.map((instance) => ({
				prefabId: instance.prefabId,
				stableId: instance.stableId,
			})),
	});

	assertEqual(readiness.ok, false);
	assertIncludes(
		readiness.ok ? [] : readiness.errors,
		`Required collision instance "${missingStableId}" was not spawned.`,
	);
}

{
	const manifest = loadRuntimeSceneManifest(observatoryRuntimeSceneManifest);
	const missingStableId = firstObservatoryWalkableChunkStableId;
	const readiness = evaluateRuntimeSceneReadiness(manifest, {
		...validLoadReport(manifest),
		spawned: manifest.level.instances
			.filter((instance) => instance.stableId !== missingStableId)
			.map((instance) => ({
				prefabId: instance.prefabId,
				stableId: instance.stableId,
			})),
	});

	assertEqual(readiness.ok, false);
	assertIncludes(
		readiness.ok ? [] : readiness.errors,
		`Required walkable collision instance "${missingStableId}" was not spawned.`,
	);
}

{
	const manifest = loadRuntimeSceneManifest(mirandaDeckRuntimeSceneManifest);
	const missingStableId = "miranda:floor:main";
	const readiness = evaluateRuntimeSceneReadiness(manifest, {
		...validLoadReport(manifest),
		spawned: manifest.level.instances
			.filter((instance) => instance.stableId !== missingStableId)
			.map((instance) => ({
				prefabId: instance.prefabId,
				stableId: instance.stableId,
			})),
	});

	assertEqual(readiness.ok, false);
	assertIncludes(
		readiness.ok ? [] : readiness.errors,
		`Required walkable collision instance "${missingStableId}" was not spawned.`,
	);
}

{
	const manifest = loadRuntimeSceneManifest(sciFiRoomRuntimeSceneManifest);
	const missingStableId = "sci-fi-room:floor:interior";
	const readiness = evaluateRuntimeSceneReadiness(manifest, {
		...validLoadReport(manifest),
		spawned: manifest.level.instances
			.filter((instance) => instance.stableId !== missingStableId)
			.map((instance) => ({
				prefabId: instance.prefabId,
				stableId: instance.stableId,
			})),
	});

	assertEqual(readiness.ok, false);
	assertIncludes(
		readiness.ok ? [] : readiness.errors,
		`Required walkable collision instance "${missingStableId}" was not spawned.`,
	);
}

{
	const manifest = loadRuntimeSceneManifest(solitudeRuntimeSceneManifest);
	const missingStableId = firstRequired(
		manifest.readiness.requiredWalkableStableIds,
		"Solitude required walkable stable IDs",
	);
	const readiness = evaluateRuntimeSceneReadiness(manifest, {
		...validLoadReport(manifest),
		spawned: manifest.level.instances
			.filter((instance) => instance.stableId !== missingStableId)
			.map((instance) => ({
				prefabId: instance.prefabId,
				stableId: instance.stableId,
			})),
	});

	assertEqual(readiness.ok, false);
	assertIncludes(
		readiness.ok ? [] : readiness.errors,
		`Required walkable collision instance "${missingStableId}" was not spawned.`,
	);
}

{
	const manifest = loadRuntimeSceneManifest(mirandaDeckRuntimeSceneManifest);
	const missingStableId = "miranda:archive-gallery:light";
	const readiness = evaluateRuntimeSceneReadiness(manifest, {
		...validLoadReport(manifest),
		spawned: manifest.level.instances
			.filter((instance) => instance.stableId !== missingStableId)
			.map((instance) => ({
				prefabId: instance.prefabId,
				stableId: instance.stableId,
			})),
	});

	assertEqual(readiness.ok, false);
	assertIncludes(
		readiness.ok ? [] : readiness.errors,
		`Required light instance "${missingStableId}" was not spawned.`,
	);
}

{
	const manifest = cloneValue(mirandaDeckRuntimeSceneManifest);
	const lightPrefab = manifest.prefabs.find(
		(prefab) => prefab.id === "miranda_archive_light",
	);
	const light = lightPrefab?.components.Light;

	if (!light || typeof light !== "object") {
		throw new Error("Expected Miranda archive light component to exist.");
	}

	(light as Record<string, unknown>).distance = -1;

	assertErrorIncludes(
		() => loadRuntimeSceneManifest(manifest),
		"Light.distance must be a non-negative finite number",
	);
}

console.log("Runtime scene contract validation passed.");
