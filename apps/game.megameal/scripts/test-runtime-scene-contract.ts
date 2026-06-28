import {
	type BrowserAudioBufferSourceNodeLike,
	type BrowserAudioContextLike,
	BrowserAudioManager,
	type BrowserAudioNodeLike,
} from "../src/engine/adapters/browser/index.js";
import {
	AUDIO_MANAGER_RESOURCE,
	type AssetKind,
	AssetManager,
	EngineRuntime,
	LevelLoader,
	LightSyncSystem,
	type RuntimeSceneLoadReport,
	type RuntimeSceneManifestData,
	SceneManager,
	createAudioEventSystem,
	evaluateRuntimeSceneReadiness,
	loadRuntimeSceneManifest,
	musicStateFromAudioContentManifest,
	parseAudioContentManifest,
	sceneMusicTrackIds,
} from "../src/engine/index.js";
import { PrefabRegistry } from "../src/game/prefabs/index.js";
import { createGameScene } from "../src/game/scenes/index.js";
import {
	ACTIVE_INTERACTION_TARGET_RESOURCE,
	PLAYER_ENTITY_RESOURCE,
} from "../src/game/systems/index.js";
import fireflyArchetype from "../src/levels/global/npcs/firefly/archetype.json";
import {
	audioContentManifestForRuntimeScene,
	defaultRuntimeSceneManifests,
	getRuntimeSceneManifest,
	mirandaDeckRuntimeSceneManifest,
	observatoryRuntimeSceneManifest,
	portalArenaRuntimeSceneManifest,
} from "../src/levels/index.js";
import observatoryFireflies from "../src/levels/observatory/npcs/fireflies.json";

const fireflyPreloadAssetIds = fireflyArchetype.assets?.preload ?? [];
const fireflyVisualPartSuffixes =
	fireflyArchetype.visualParts?.map((part) => part.idSuffix) ?? [];
const observatoryFireflyStableIds = observatoryFireflies.instances.map(
	(instance) => instance.stableId,
);

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

type FakeAudioSource = BrowserAudioBufferSourceNodeLike & {
	started: boolean;
	stopped: boolean;
};

function createFakeAudioContext(): {
	readonly context: BrowserAudioContextLike;
	readonly sources: readonly FakeAudioSource[];
} {
	const sources: FakeAudioSource[] = [];
	const destination = createFakeAudioNode();
	const context: BrowserAudioContextLike = {
		destination,
		currentTime: 0,
		state: "running",
		createGain() {
			return {
				...createFakeAudioNode(),
				gain: {
					value: 1,
					setValueAtTime(value) {
						this.value = value;
					},
				},
			};
		},
		createBufferSource() {
			const source: FakeAudioSource = {
				...createFakeAudioNode(),
				buffer: null,
				loop: false,
				onended: null,
				started: false,
				stopped: false,
				start() {
					this.started = true;
				},
				stop() {
					this.stopped = true;
					this.onended?.();
				},
			};

			sources.push(source);
			return source;
		},
		async decodeAudioData() {
			return { duration: 1 };
		},
		async resume() {},
		async close() {},
	};

	return { context, sources };
}

function createFakeAudioNode(): BrowserAudioNodeLike {
	return {
		connect() {
			return undefined;
		},
		disconnect() {},
	};
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

function firstRequired(
	values: readonly string[] | undefined,
	label: string,
): string {
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
	const floorPrefab = manifest.prefabs.find(
		(prefab) => prefab.id === "portal_arena_floor",
	);
	const floorComponents = floorPrefab?.components as
		| Record<string, Record<string, unknown>>
		| undefined;
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

	assertIncludes(manifest.readiness.requiredLightStableIds ?? [], "player");
	assertRecord(floorComponents?.Renderable, "Portal arena floor renderable");
	assertEqual(collider?.intent, "solid");
	assertEqual(collider?.channel, "world");
	assertEqual(colliderShape?.type, "box");
	assertDeepEqual(colliderShape?.halfExtents, [2600, 0.05, 2600]);
	assertEqual(bounds?.minX, -360);
	assertEqual(bounds?.maxX, 360);
	assertEqual(bounds?.minZ, -360);
	assertEqual(bounds?.maxZ, 360);
	assertRecord(playerLight, "Portal arena player light");
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
	const manifest = loadRuntimeSceneManifest(observatoryRuntimeSceneManifest);
	const requiredLightStableIds = ["player", ...observatoryFireflyStableIds];
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
	const terrainRenderable = componentForStableId(
		manifest,
		"observatory:terrain",
		"Renderable",
	);
	const walkableCollider = componentForStableId(
		manifest,
		"observatory:walkable-proxy",
		"Collider",
	);
	const walkableShape = assertRecord(
		walkableCollider.shape,
		"Observatory walkable proxy collider shape",
	);
	const bounds = assertRecord(
		manifest.level.resources?.["game:characterBounds"],
		"Observatory character bounds",
	);
	const playerLight = componentForStableId(manifest, "player", "Light");

	for (const assetId of fireflyPreloadAssetIds) {
		assertIncludes(
			manifest.readiness.requiredAssetIds ?? [],
			assetId,
			`Observatory readiness must include firefly archetype preload asset "${assetId}".`,
		);
	}
	assertRecord(playerLight, "Observatory player light");

	assertRecord(terrainRenderable, "Observatory terrain renderable");
	assertEqual(
		componentsForStableId(manifest, "observatory:terrain").Collider,
		undefined,
		"Observatory render GLB should not be treated as implicit collision.",
	);
	assertIncludes(
		manifest.readiness.requiredCollisionPrefabIds ?? [],
		"observatory_walkable_proxy",
	);
	assertIncludes(
		manifest.readiness.requiredCollisionPrefabIds ?? [],
		"observatory_boundary_blocker",
	);
	assertIncludes(
		manifest.readiness.requiredWalkableStableIds ?? [],
		"observatory:walkable-proxy",
	);
	assertIncludes(
		manifest.readiness.requiredCollisionStableIds ?? [],
		"observatory:walkable-proxy",
	);
	assertEqual(walkableCollider.intent, "walkable");
	assertEqual(walkableCollider.channel, "worldStatic");
	assertEqual(walkableShape.type, "box");
	assertDeepEqual(walkableShape.halfExtents, [320, 0.05, 320]);
	assertDeepEqual(
		transformPropertyForStableId(
			manifest,
			"observatory:walkable-proxy",
			"position",
		),
		[0, 1.75, 0],
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
	assertRecord(
		componentsForStableId(manifest, "observatory:water").Renderable,
		"Observatory water renderable",
	);
	assertEqual(
		componentsForStableId(manifest, "observatory:water").Collider,
		undefined,
		"Observatory water should stay visual-only in the foundation slice.",
	);

	for (const stableId of requiredLightStableIds) {
		assertIncludes(manifest.readiness.requiredLightStableIds ?? [], stableId);
	}

	for (const fireflyStableId of requiredLightStableIds.slice(1)) {
		const fireflyComponents = componentsForStableId(manifest, fireflyStableId);
		const fireflyLight = componentForStableId(
			manifest,
			fireflyStableId,
			"Light",
		);

		assertRecord(fireflyComponents.Npc, `${fireflyStableId}.Npc`);
		assertRecord(
			fireflyComponents.MovementBehavior,
			`${fireflyStableId}.MovementBehavior`,
		);
		assertRecord(
			fireflyComponents.LightModulation,
			`${fireflyStableId}.LightModulation`,
		);
		assertEqual(fireflyComponents.Renderable, undefined);

		for (const suffix of fireflyVisualPartSuffixes) {
			assertRecord(
				componentForStableId(
					manifest,
					`${fireflyStableId}:${suffix}`,
					"Renderable",
				),
				`${fireflyStableId}:${suffix}.Renderable`,
			);
			assertRecord(
				componentForStableId(
					manifest,
					`${fireflyStableId}:${suffix}`,
					"FollowTarget",
				),
				`${fireflyStableId}:${suffix}.FollowTarget`,
			);
		}

		assertEqual(fireflyLight.kind, "point");
		for (const field of ["intensity", "distance", "decay"]) {
			const value = fireflyLight[field];
			if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
				throw new Error(
					`${fireflyStableId}.Light.${field} must be non-negative.`,
				);
			}
		}
		if (typeof fireflyLight.color !== "string") {
			throw new Error(`${fireflyStableId}.Light.color must be a string.`);
		}
		if (typeof fireflyLight.visible !== "boolean") {
			throw new Error(`${fireflyStableId}.Light.visible must be a boolean.`);
		}
	}

	for (const fireflyStableId of requiredLightStableIds.slice(1)) {
		const position = transformPropertyForStableId(
			manifest,
			fireflyStableId,
			"position",
		);

		if (
			!Array.isArray(position) ||
			position.length !== 3 ||
			position.some(
				(value) => typeof value !== "number" || !Number.isFinite(value),
			)
		) {
			throw new Error(
				`${fireflyStableId}.transform.position must be a numeric vec3.`,
			);
		}
	}

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
	const returnPortalCollider = componentForStableId(
		manifest,
		"miranda:airlock:return-portal",
		"Collider",
	);

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
	const cubemap = manifest.assets.assets.find(
		(asset) => asset.id === environmentAssetId,
	);

	if (!cubemap?.faces) {
		throw new Error("Expected portal arena to declare a cubemap environment.");
	}

	const brokenFaces = {
		px: cubemap.faces.px,
		py: cubemap.faces.py,
		ny: cubemap.faces.ny,
		pz: cubemap.faces.pz,
		nz: cubemap.faces.nz,
	};
	const brokenManifest = {
		...manifest,
		assets: {
			...manifest.assets,
			assets: manifest.assets.assets.map((asset) =>
				asset.id === cubemap.id
					? {
							...asset,
							faces: brokenFaces,
						}
					: asset,
			),
		},
	};

	assertErrorIncludes(
		() => loadRuntimeSceneManifest(brokenManifest),
		"assetManifest.assets.",
	);
	assertErrorIncludes(
		() => loadRuntimeSceneManifest(brokenManifest),
		".faces.nx",
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
	const missingStableId = "observatory:walkable-proxy";
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

{
	const world = new EngineRuntime().world;
	const entity = world.createEntity();
	const calls: string[] = [];
	const lightSync = new LightSyncSystem({
		renderer: {
			attachLight(attachedEntity) {
				calls.push(`attach:${attachedEntity}`);
			},
			updateLight(updatedEntity) {
				calls.push(`update:${updatedEntity}`);
			},
			detachLight(detachedEntity) {
				calls.push(`detach:${detachedEntity}`);
			},
		},
	});

	world.addComponent(entity, "Transform", {
		position: { x: 0, y: 1, z: 2 },
		rotation: { x: 0, y: 0, z: 0, w: 1 },
		scale: { x: 1, y: 1, z: 1 },
	});
	world.addComponent(entity, "Light", {
		kind: "point",
		color: "#7dc8ff",
		intensity: 5,
		distance: 16,
		decay: 2,
	});

	lightSync.update({ world });
	lightSync.update({ world });

	world.addComponent(entity, "Light", {
		kind: "point",
		color: "#7dc8ff",
		intensity: 8,
		distance: 20,
		decay: 2,
	});
	lightSync.update({ world });

	assertDeepEqual(calls, [
		`attach:${entity}`,
		`update:${entity}`,
		`update:${entity}`,
	]);

	lightSync.detachAll();

	assertDeepEqual(calls, [
		`attach:${entity}`,
		`update:${entity}`,
		`update:${entity}`,
		`detach:${entity}`,
	]);
}

for (const manifest of defaultRuntimeSceneManifests) {
	const audioContent = parseAudioContentManifest(
		audioContentManifestForRuntimeScene(manifest.id),
		{
			assetManifest: manifest.assets,
		},
	);
	const preloadedAssetIds = new Set(manifest.level.preload);
	const requiredAssetIds = new Set(manifest.readiness.requiredAssetIds ?? []);
	const audioAssetIds = [
		...audioContent.eventMappings.map((mapping) => mapping.soundId),
		...sceneMusicTrackIds(audioContent.sceneMusic),
	];

	for (const audioAssetId of audioAssetIds) {
		assertEqual(
			preloadedAssetIds.has(audioAssetId),
			true,
			`${manifest.id} must preload audio asset "${audioAssetId}".`,
		);
		assertEqual(
			requiredAssetIds.has(audioAssetId),
			true,
			`${manifest.id} must require audio asset "${audioAssetId}" for readiness.`,
		);
	}
}

{
	const manifest = loadRuntimeSceneManifest(observatoryRuntimeSceneManifest);
	const audioContent = parseAudioContentManifest(
		audioContentManifestForRuntimeScene(manifest.id),
		{
			assetManifest: manifest.assets,
		},
	);

	assertEqual(
		audioContent.sceneMusic,
		undefined,
		"Observatory foundation should not add scene music before a target asset is verified.",
	);
	assertEqual(
		audioContent.eventMappings.some(
			(mapping) =>
				mapping.sceneId === "observatory_game" &&
				mapping.eventType === "EntityJumpRequested" &&
				mapping.soundId === "audio_player_jump",
		),
		true,
	);
	assertEqual(
		audioContent.eventMappings.some(
			(mapping) =>
				mapping.sceneId === "observatory_game" &&
				mapping.eventType === "ChargeActionReleased" &&
				mapping.soundId === "audio_player_charge_release",
		),
		true,
	);
}

{
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const readiness = evaluateRuntimeSceneReadiness(manifest, {
		...validLoadReport(manifest),
		preloadedAssetIds: validLoadReport(manifest).preloadedAssetIds.filter(
			(assetId) => assetId !== "audio_ambient_portal_deck",
		),
	});

	assertEqual(readiness.ok, false);
	assertIncludes(
		readiness.ok ? [] : readiness.errors,
		'Required asset "audio_ambient_portal_deck" was not preloaded.',
	);
}

{
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const audioContent = cloneValue(
		audioContentManifestForRuntimeScene(manifest.id),
	);
	const mapping = audioContent.eventMappings[0];

	if (!mapping) {
		throw new Error(
			"Expected portal arena audio content to include a mapping.",
		);
	}

	assertErrorIncludes(
		() =>
			parseAudioContentManifest(
				{
					eventMappings: [
						{
							...mapping,
							soundId: "missing_audio_asset",
						},
					],
				},
				{
					assetManifest: manifest.assets,
				},
			),
		'unknown audio asset "missing_audio_asset"',
	);
}

{
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const audioContent = cloneValue(
		audioContentManifestForRuntimeScene(manifest.id),
	);

	if (!audioContent.sceneMusic) {
		throw new Error(
			"Expected portal arena audio content to declare scene music.",
		);
	}

	assertDeepEqual(sceneMusicTrackIds(audioContent.sceneMusic), [
		"audio_ambient_portal_deck",
		"audio_ambient_shadow_waltz",
		"audio_ambient_whistling_dreams",
	]);
	assertEqual(
		musicStateFromAudioContentManifest(audioContent, { selectionIndex: 0 })
			?.trackId,
		"audio_ambient_portal_deck",
	);
	assertEqual(
		musicStateFromAudioContentManifest(audioContent, { selectionIndex: 1 })
			?.trackId,
		"audio_ambient_shadow_waltz",
	);
	assertEqual(
		musicStateFromAudioContentManifest(audioContent, { selectionIndex: 2 })
			?.trackId,
		"audio_ambient_whistling_dreams",
	);
	assertEqual(
		musicStateFromAudioContentManifest(audioContent, { selectionIndex: 3 })
			?.trackId,
		"audio_ambient_portal_deck",
	);

	assertErrorIncludes(
		() =>
			parseAudioContentManifest(
				{
					...audioContent,
					sceneMusic: {
						...audioContent.sceneMusic,
						trackIds: ["missing_music_asset"],
					},
				},
				{
					assetManifest: manifest.assets,
				},
			),
		'unknown audio asset "missing_music_asset"',
	);
}

{
	const fakeAudio = createFakeAudioContext();
	const manager = new BrowserAudioManager({
		context: fakeAudio.context,
	});

	manager.registerSound("audio_ambient_portal_deck", { duration: 10 });
	manager.setMusic({
		trackId: "audio_ambient_portal_deck",
		playing: true,
		volume: 0.18,
		sceneId: "portal_arena_game",
	});

	assertEqual(fakeAudio.sources.length, 1);
	assertEqual(fakeAudio.sources[0]?.started, true);
	assertEqual(fakeAudio.sources[0]?.loop, true);
	assertEqual(manager.stats().activeSounds, 1);
	assertEqual(manager.stats().musicTrackId, "audio_ambient_portal_deck");

	manager.setMusic({
		trackId: "audio_ambient_portal_deck",
		playing: true,
		volume: 0.08,
		sceneId: "portal_arena_game",
	});

	assertEqual(fakeAudio.sources.length, 1);

	manager.stopScene("portal_arena_game");

	assertEqual(fakeAudio.sources[0]?.stopped, true);
	assertEqual(manager.stats().activeSounds, 0);
	manager.dispose();
}

{
	const playedSounds: string[] = [];
	const audioEvents = createAudioEventSystem({
		activeSceneId: () => "scene:b",
		audio: {
			async unlock() {
				return "unlocked";
			},
			registerSound() {},
			unregisterSound() {},
			hasSound() {
				return true;
			},
			play(event) {
				playedSounds.push(`${event.soundId}:${event.sceneId ?? "global"}`);
				return undefined;
			},
			stop() {},
			stopScene() {},
			stopAll() {},
			setMusic() {},
			stats() {
				return {
					unlocked: true,
					loadedSounds: 0,
					activeSounds: 0,
				};
			},
			dispose() {},
		},
		mappings: [
			{
				eventType: "EntityJumpRequested",
				soundId: "jump-a",
				sceneId: "scene:a",
			},
			{
				eventType: "EntityJumpRequested",
				soundId: "jump-b",
				sceneId: "scene:b",
			},
		],
	});

	audioEvents.handle({ type: "EntityJumpRequested", entity: 1 });

	assertDeepEqual(playedSounds, ["jump-b:scene:b"]);
}

{
	const playedSounds: string[] = [];
	const audioEvents = createAudioEventSystem({
		audio: {
			async unlock() {
				return "unlocked";
			},
			registerSound() {},
			unregisterSound() {},
			hasSound() {
				return true;
			},
			play(event) {
				playedSounds.push(`${event.soundId}:${event.sceneId ?? "global"}`);
				return undefined;
			},
			stop() {},
			stopScene() {},
			stopAll() {},
			setMusic() {},
			stats() {
				return {
					unlocked: true,
					loadedSounds: 0,
					activeSounds: 0,
				};
			},
			dispose() {},
		},
		mappings: [
			{
				eventType: "EntityJumpRequested",
				soundId: "jump-a",
				sceneId: "scene:a",
			},
		],
	});

	audioEvents.handle({ type: "EntityJumpRequested", entity: 1 });
	audioEvents.handle({
		type: "EntityJumpRequested",
		entity: 1,
		sceneId: "scene:a",
	});

	assertDeepEqual(playedSounds, ["jump-a:scene:a"]);
}

{
	const runtime = new EngineRuntime();
	const sceneManager = new SceneManager();
	const manifest = loadRuntimeSceneManifest(portalArenaRuntimeSceneManifest);
	const assets = new AssetManager(manifest.assets);
	const loadedAssetIds: string[] = [];
	const disposedAssetIds: string[] = [];
	const stoppedSceneAudioIds: string[] = [];
	const assetKinds = new Set(
		manifest.assets.assets.map((asset) => asset.kind),
	) as ReadonlySet<AssetKind>;

	for (const kind of assetKinds) {
		assets.registerLoader(kind, async (entry) => {
			loadedAssetIds.push(entry.id);
			return { id: entry.id, kind: entry.kind };
		});
		assets.registerDisposer(kind, (_asset, entry) => {
			disposedAssetIds.push(entry.id);
		});
	}

	runtime.world.setResource(AUDIO_MANAGER_RESOURCE, {
		stopScene(sceneId: string) {
			stoppedSceneAudioIds.push(sceneId);
		},
	});

	const levelLoader = new LevelLoader({
		prefabs: new PrefabRegistry(manifest.prefabs),
		assets,
	});

	await sceneManager.load(
		createGameScene({
			levelLoader,
			runtimeManifest: manifest,
			physicsReady: () => true,
		}),
		runtime.services,
	);

	assertEqual(sceneManager.status, "active");
	assertEqual(runtime.world.entities().length, manifest.level.instances.length);
	assertEqual(runtime.world.hasResource(PLAYER_ENTITY_RESOURCE), true);
	runtime.world.setResource(ACTIVE_INTERACTION_TARGET_RESOURCE, {
		kind: "portal",
		entity: -1,
		id: "stale-portal",
		label: "Stale Portal",
		prompt: "This target should be removed on unload",
		targetRuntimeSceneId: "prototype_arena_runtime",
		canTravel: true,
		distanceSquared: 0,
	});

	const expectedPreloadedAssets = [...(manifest.level.preload ?? [])].sort();

	for (const assetId of expectedPreloadedAssets) {
		assertEqual(assets.refCount(assetId), 1);
	}

	assertEqual(assets.listLoaded().length, expectedPreloadedAssets.length);

	await sceneManager.unload(runtime.services);

	assertEqual(sceneManager.status, "disposed");
	assertEqual(sceneManager.activeScene, undefined);
	assertEqual(runtime.world.entities().length, 0);
	assertEqual(runtime.world.hasResource(PLAYER_ENTITY_RESOURCE), false);
	assertEqual(
		runtime.world.hasResource(ACTIVE_INTERACTION_TARGET_RESOURCE),
		false,
	);
	assertEqual(assets.listLoaded().length, 0);
	assertIncludes(stoppedSceneAudioIds, "portal_arena_game");

	for (const assetId of expectedPreloadedAssets) {
		assertEqual(assets.refCount(assetId), 0);
		assertIncludes(loadedAssetIds, assetId);
		assertIncludes(disposedAssetIds, assetId);
	}

	runtime.dispose();
}

console.log("Runtime scene contract validation passed.");
