import assert from "node:assert/strict";

import {
	AssetManager,
	type CharacterControllerComponent,
	InputManager,
	type LightComponent,
	type PhysicsAdapterPort,
	type RenderableComponent,
	type RuntimeSceneManifestData,
	quat,
	runtimeSceneManifestValidator,
	vec3,
} from "../src/engine/index.js";
import {
	COLLISION_SPATIAL_INDEX_RESOURCE,
	type CollisionSpatialIndexResource,
	PERFORMANCE_CONFIG_RESOURCE,
	PERFORMANCE_RUNTIME_STATE_RESOURCE,
	type PerformanceConfig,
	type PerformanceRuntimeState,
} from "../src/game/performance/index.js";
import { STABLE_ID_COMPONENT } from "../src/game/prefabs/index.js";
import {
	type GameRendererPort,
	createMegamealGameRuntime,
} from "../src/game/runtime/index.js";

const performanceConfig: PerformanceConfig = {
	schemaVersion: 1,
	systems: {
		lod: {
			mode: "distance",
			tiers: [
				{ id: "near", minDistance: 0, maxDistance: 8, qualityRatio: 1 },
				{ id: "far", minDistance: 8, qualityRatio: 0.5 },
			],
		},
		culling: {
			mode: "distance",
			visibility: {
				distance: {
					maxDistance: 5,
					hysteresis: 0,
				},
			},
		},
		streaming: {
			mode: "plan",
			residency: {
				assets: {
					loadDistance: 1,
					unloadDistance: 2,
				},
			},
		},
		collision: {
			mode: "spatial",
		},
	},
};

const manifest: RuntimeSceneManifestData = {
	schemaVersion: 1,
	id: "performance_runtime_contract",
	generatedAt: "2026-06-30T00:00:00.000Z",
	source: {
		kind: "prototype",
		id: "performance-runtime-contract",
	},
	assets: {
		assets: [
			{
				id: "mesh_contract_player",
				kind: "mesh",
				url: "/assets/performance/contract-player.glb",
			},
			{
				id: "mesh_contract_far_crate",
				kind: "mesh",
				url: "/assets/performance/contract-far-crate.glb",
			},
			{
				id: "mesh_contract_far_crate_lod",
				kind: "mesh",
				url: "/assets/performance/contract-far-crate-lod.glb",
			},
			{
				id: "mesh_contract_streamed_visual",
				kind: "mesh",
				url: "/assets/performance/contract-streamed-visual.glb",
			},
		],
	},
	prefabs: [
		{
			id: "contract_player",
			assetIds: ["mesh_contract_player"],
			components: {
				CharacterController: {
					speed: 0,
					jumpForce: 0,
					grounded: true,
					groundY: -100,
				},
				Transform: {
					position: [0, 0, 0],
					rotation: [0, 0, 0, 1],
					scale: [1, 1, 1],
				},
				Renderable: {
					meshId: "mesh_contract_player",
				},
			},
		},
		{
			id: "contract_far_crate",
			assetIds: ["mesh_contract_far_crate", "mesh_contract_far_crate_lod"],
			components: {
				Transform: {
					position: [20, 0, 0],
					rotation: [0, 0, 0, 1],
					scale: [1, 1, 1],
				},
				Renderable: {
					meshId: "mesh_contract_far_crate",
				},
				PerformanceLod: {
					tiers: [
						{
							id: "far",
							renderable: {
								meshId: "mesh_contract_far_crate_lod",
							},
						},
					],
				},
			},
		},
		{
			id: "contract_walkable_floor",
			components: {
				Transform: {
					position: [0, 0, 0],
					rotation: [0, 0, 0, 1],
					scale: [1, 1, 1],
				},
				Collider: {
					intent: "walkable",
					channel: "worldStatic",
					sensor: false,
					shape: {
						type: "mesh",
						vertices: [
							[-2, 0, -2],
							[2, 0, -2],
							[2, 0, 2],
							[-2, 0, 2],
						],
						indices: [0, 1, 2, 0, 2, 3],
					},
				},
			},
		},
		{
			id: "contract_far_light",
			components: {
				Transform: {
					position: [20, 0, 0],
					rotation: [0, 0, 0, 1],
					scale: [1, 1, 1],
				},
				Light: {
					kind: "point",
					color: "#ffffff",
					intensity: 1,
					distance: 10,
					decay: 2,
				},
			},
		},
		{
			id: "contract_streamed_visual",
			assetIds: ["mesh_contract_streamed_visual"],
			components: {
				Transform: {
					position: [3, 0, 0],
					rotation: [0, 0, 0, 1],
					scale: [1, 1, 1],
				},
				Renderable: {
					meshId: "mesh_contract_streamed_visual",
				},
				Light: {
					kind: "point",
					color: "#ffffff",
					intensity: 1,
					distance: 10,
					decay: 2,
				},
				Collider: {
					intent: "solid",
					channel: "worldStatic",
					sensor: false,
					shape: {
						type: "box",
						halfExtents: [0.5, 0.5, 0.5],
					},
				},
				StreamingChunk: {
					role: "streamable",
					loadRadius: 1,
					unloadRadius: 2,
					assetIds: ["mesh_contract_streamed_visual"],
					includeCollider: true,
				},
			},
		},
	],
	level: {
		id: "performance_runtime_contract_level",
		preload: [
			"mesh_contract_far_crate",
			"mesh_contract_far_crate_lod",
			"mesh_contract_player",
		],
		resources: {
			[PERFORMANCE_CONFIG_RESOURCE]: performanceConfig,
		},
		instances: [
			{
				id: "contract-player",
				prefabId: "contract_player",
				stableId: "contract:player",
			},
			{
				id: "contract-far-crate",
				prefabId: "contract_far_crate",
				stableId: "contract:far-crate",
			},
			{
				id: "contract-walkable-floor",
				prefabId: "contract_walkable_floor",
				stableId: "contract:walkable-floor",
			},
			{
				id: "contract-far-light",
				prefabId: "contract_far_light",
				stableId: "contract:far-light",
			},
			{
				id: "contract-streamed-visual",
				prefabId: "contract_streamed_visual",
				stableId: "contract:streamed-visual",
			},
		],
	},
	renderProfile: {
		id: "performance-runtime-contract-render-profile",
		renderer: {
			clearColor: "#000000",
			clearAlpha: 1,
			antialias: false,
			maxPixelRatio: 1,
			fallbackMaterialColor: "#ffffff",
		},
		lighting: {
			lights: [],
		},
		environment: {
			kind: "solid-color",
			color: "#000000",
			backgroundIntensity: 0,
		},
	},
	readiness: {
		playerStableId: "contract:player",
	},
};

const assets = createContractAssetManager();
const runtime = await createMegamealGameRuntime({
	assets,
	renderer: createRendererPort(),
	input: new InputManager(),
	physics: createPhysicsPort(),
	runtimeManifest: manifest,
});

try {
	assert.equal(
		runtime.runtime.scheduler
			.systems("camera")
			.some((system) => system.id === "performance-runtime"),
		true,
		"game runtime must schedule the performance runtime system",
	);
	assert.equal(
		runtime.runtime.scheduler
			.systems("character")
			.some((system) => system.id === "collision-spatial-index"),
		true,
		"game runtime must schedule the collision spatial index before character grounding",
	);

	runtime.runtime.update(1 / 60);

	const state = runtime.runtime.world.requireResource<PerformanceRuntimeState>(
		PERFORMANCE_RUNTIME_STATE_RESOURCE,
	);

	assert.equal(
		state.config.systems.culling.mode,
		"distance",
		"scheduled performance runtime must consume game:performanceConfig from the level resource",
	);
	assert.equal(state.domains.lod.runtimeStatus, "active");
	assert.equal(state.domains.culling.runtimeStatus, "active");
	assert.equal(state.domains.streaming.runtimeStatus, "active");
	assert.equal(state.domains.collision.runtimeStatus, "active");
	assert.equal(
		state.domains.culling.hiddenRenderables.includes("contract:far-crate"),
		true,
		"distance culling must classify far renderables from runtime transforms",
	);
	assert.equal(
		state.domains.culling.hiddenLights.includes("contract:far-light"),
		true,
		"distance culling must classify far lights from runtime transforms",
	);
	assert.equal(state.domains.collision.summary.walkableChunkCount, 1);
	assert.deepEqual(state.domains.streaming.hiddenRenderables, [
		"contract:streamed-visual",
	]);
	assert.deepEqual(state.domains.streaming.hiddenLights, [
		"contract:streamed-visual",
	]);
	assert.ok(
		state.domains.collision.spatialBucketPlan,
		"collision spatial mode must publish a runtime bucket plan",
	);

	const farCrate = entityByStableId("contract:far-crate");
	assert.equal(
		runtime.runtime.world.getComponent<RenderableComponent>(
			farCrate,
			"Renderable",
		)?.visible,
		false,
		"active culling must apply through Renderable.visible instead of renderer mutation",
	);
	assert.equal(
		renderableMeshId(farCrate),
		"mesh_contract_far_crate_lod",
		"active LOD must swap authored Renderable payloads through ECS",
	);
	assert.deepEqual(state.domains.lod.swappedRenderables, [
		"contract:far-crate",
	]);
	const farLight = entityByStableId("contract:far-light");
	assert.equal(
		runtime.runtime.world.getComponent<LightComponent>(farLight, "Light")
			?.visible,
		false,
		"active culling must apply through Light.visible instead of renderer mutation",
	);
	const streamedVisual = entityByStableId("contract:streamed-visual");
	assert.equal(
		runtime.runtime.world.getComponent<RenderableComponent>(
			streamedVisual,
			"Renderable",
		)?.visible,
		false,
		"active streaming must apply visual residency through Renderable.visible",
	);
	assert.equal(
		runtime.runtime.world.getComponent<LightComponent>(streamedVisual, "Light")
			?.visible,
		false,
		"active streaming must apply visual residency through Light.visible",
	);
	assert.equal(
		runtime.runtime.world.hasComponent(streamedVisual, "Collider"),
		false,
		"active streaming must remove opt-in colliders while their chunk is unloaded",
	);
	assert.deepEqual(state.domains.streaming.removedColliders, [
		"contract:streamed-visual",
	]);
	assert.deepEqual(state.domains.streaming.assetResidency.loadedChunkIds, [
		"startup:performance_runtime_contract:preload",
	]);
	assert.equal(
		assets.listLoaded().includes("mesh_contract_streamed_visual"),
		false,
		"streamable renderable assets must not be preloaded when owned by StreamingChunk.assetIds",
	);
	const player = entityByStableId("contract:player");
	assert.equal(
		runtime.runtime.world.getComponent<CharacterControllerComponent>(
			player,
			"CharacterController",
		)?.groundY,
		0,
		"walkable grounding must consume the spatial index without breaking mesh ground sampling",
	);

	runtime.runtime.world.addComponent(streamedVisual, "Transform", {
		position: vec3(0.5, 0, 0),
		rotation: quat(),
		scale: vec3(1, 1, 1),
	});
	runtime.runtime.update(1 / 60);
	const loadingState =
		runtime.runtime.world.requireResource<PerformanceRuntimeState>(
			PERFORMANCE_RUNTIME_STATE_RESOURCE,
		);
	assert.deepEqual(
		loadingState.domains.streaming.assetResidency.loadingChunkIds,
		["contract:streamed-visual"],
	);
	assert.equal(
		runtime.runtime.world.hasComponent(streamedVisual, "Collider"),
		false,
		"streaming colliders stay removed until chunk assets finish loading",
	);

	await flushStreamingAssetLoads();
	runtime.runtime.update(1 / 60);
	const loadedState =
		runtime.runtime.world.requireResource<PerformanceRuntimeState>(
			PERFORMANCE_RUNTIME_STATE_RESOURCE,
		);
	assert.equal(
		assets.listLoaded().includes("mesh_contract_streamed_visual"),
		true,
		"streaming must load chunk-owned assets when the chunk enters range",
	);
	assert.equal(
		assets.refCount("mesh_contract_streamed_visual"),
		1,
		"streaming must retain only the assets it owns",
	);
	assert.deepEqual(
		loadedState.domains.streaming.assetResidency.loadedChunkIds,
		[
			"contract:streamed-visual",
			"startup:performance_runtime_contract:preload",
		],
	);
	assert.equal(
		runtime.runtime.world.getComponent<RenderableComponent>(
			streamedVisual,
			"Renderable",
		)?.visible,
		undefined,
		"streaming must restore renderable visibility after chunk assets load",
	);
	assert.equal(
		runtime.runtime.world.hasComponent(streamedVisual, "Collider"),
		true,
		"streaming must restore opt-in colliders after chunk assets load",
	);

	runtime.runtime.world.addComponent(streamedVisual, "Transform", {
		position: vec3(10, 0, 0),
		rotation: quat(),
		scale: vec3(1, 1, 1),
	});
	runtime.runtime.update(1 / 60);
	const unloadedState =
		runtime.runtime.world.requireResource<PerformanceRuntimeState>(
			PERFORMANCE_RUNTIME_STATE_RESOURCE,
		);
	assert.equal(
		assets.listLoaded().includes("mesh_contract_streamed_visual"),
		false,
		"streaming must release chunk-owned assets after leaving the unload radius",
	);
	assert.equal(
		assets.refCount("mesh_contract_streamed_visual"),
		0,
		"streaming release must return owned asset refs to zero",
	);
	assert.deepEqual(unloadedState.domains.streaming.removedColliders, [
		"contract:streamed-visual",
	]);

	const firstSpatialIndex =
		runtime.runtime.world.requireResource<CollisionSpatialIndexResource>(
			COLLISION_SPATIAL_INDEX_RESOURCE,
		);

	runtime.runtime.update(1 / 60);

	const secondSpatialIndex =
		runtime.runtime.world.requireResource<CollisionSpatialIndexResource>(
			COLLISION_SPATIAL_INDEX_RESOURCE,
		);
	assert.equal(
		secondSpatialIndex.summary,
		firstSpatialIndex.summary,
		"unchanged collision meshes must reuse the spatial summary instead of rebuilding from vertices every tick",
	);
	assert.equal(
		secondSpatialIndex.plan,
		firstSpatialIndex.plan,
		"unchanged collision meshes must reuse the spatial bucket plan between ticks",
	);
	runtime.runtime.world.setResource<PerformanceConfig>(
		PERFORMANCE_CONFIG_RESOURCE,
		{
			...performanceConfig,
			systems: {
				...performanceConfig.systems,
				lod: { mode: "off" },
			},
		},
	);
	runtime.runtime.update(1 / 60);
	assert.equal(
		renderableMeshId(farCrate),
		"mesh_contract_far_crate",
		"turning LOD off must restore the authored Renderable payload",
	);

	assert.equal(
		runtime.runtimeDiagnostics().performance.domains.culling.runtimeStatus,
		"active",
		"runtime diagnostics must read scheduled performance runtime state",
	);
	assert.deepEqual(
		runtime.runtimeDiagnostics().performance.domains.streaming.subjects,
		[
			{
				id: "loaded-assets",
				label: "Loaded asset candidates",
				count: 3,
			},
			{
				id: "streaming-chunks",
				label: "Streaming chunks",
				count: 2,
			},
			{
				id: "loaded-streaming-chunks",
				label: "Loaded streaming chunks",
				count: 1,
			},
			{
				id: "loading-streaming-chunks",
				label: "Loading streaming chunks",
				count: 0,
			},
			{
				id: "retained-streaming-assets",
				label: "Retained streaming assets",
				count: 0,
			},
			{
				id: "removed-streaming-colliders",
				label: "Removed streaming colliders",
				count: 1,
			},
		],
		"runtime diagnostics must expose streaming chunk, asset, and collider residency counts",
	);
} finally {
	await runtime.dispose();
}

console.log("Performance runtime contract passed.");

assert.throws(
	() =>
		runtimeSceneManifestValidator.parse(
			manifestWithPrefabComponents("invalid_lod_missing_renderable", {
				PerformanceLod: {
					tiers: [
						{ id: "far", renderable: { meshId: "mesh_contract_player" } },
					],
				},
			}),
		),
	/PerformanceLod requires a Renderable component/,
	"PerformanceLod must be attached to authored renderables only",
);

assert.throws(
	() =>
		runtimeSceneManifestValidator.parse(
			manifestWithPrefabComponents("invalid_lod_duplicate_tier", {
				Transform: {
					position: [0, 0, 0],
					rotation: [0, 0, 0, 1],
					scale: [1, 1, 1],
				},
				Renderable: { meshId: "mesh_contract_player" },
				PerformanceLod: {
					tiers: [
						{ id: "far", renderable: { meshId: "mesh_contract_player" } },
						{ id: "far", renderable: { meshId: "mesh_contract_player" } },
					],
				},
			}),
		),
	/PerformanceLod\.tiers\[1\]\.id duplicates far/,
	"PerformanceLod tier ids must be unique per entity",
);

assert.throws(
	() =>
		runtimeSceneManifestValidator.parse(
			manifestWithPrefabComponents("invalid_lod_asset_kind", {
				Transform: {
					position: [0, 0, 0],
					rotation: [0, 0, 0, 1],
					scale: [1, 1, 1],
				},
				Renderable: { meshId: "mesh_contract_player" },
				PerformanceLod: {
					tiers: [
						{ id: "far", renderable: { meshId: "audio_contract_invalid" } },
					],
				},
			}),
		),
	/references audio asset "audio_contract_invalid", expected mesh/,
	"PerformanceLod renderable payloads must reference the correct asset kind",
);

assert.throws(
	() =>
		runtimeSceneManifestValidator.parse(
			manifestWithPrefabComponents("invalid_lod_missing_preload", {
				Transform: {
					position: [0, 0, 0],
					rotation: [0, 0, 0, 1],
					scale: [1, 1, 1],
				},
				Renderable: { meshId: "mesh_contract_player" },
				PerformanceLod: {
					tiers: [
						{
							id: "far",
							renderable: { meshId: "mesh_contract_unpreloaded_lod" },
						},
					],
				},
			}),
		),
	/not declared in the level preload set/,
	"PerformanceLod renderable payload assets must be declared in level preload data",
);

assert.throws(
	() =>
		runtimeSceneManifestValidator.parse(
			manifestWithPrefabComponents("invalid_streaming_missing_center", {
				StreamingChunk: {
					role: "streamable",
				},
			}),
		),
	/StreamingChunk with role streamable requires center or Transform/,
	"streamable chunks must declare a center or use Transform for distance checks",
);

assert.throws(
	() =>
		runtimeSceneManifestValidator.parse(
			manifestWithPrefabComponents("invalid_streaming_boolean", {
				Transform: {
					position: [0, 0, 0],
					rotation: [0, 0, 0, 1],
					scale: [1, 1, 1],
				},
				StreamingChunk: {
					role: "streamable",
					includeRenderable: "yes",
				},
			}),
		),
	/StreamingChunk\.includeRenderable must be a boolean/,
	"streaming visual ownership flags must be booleans",
);

assert.throws(
	() =>
		runtimeSceneManifestValidator.parse(
			manifestWithPrefabComponents("invalid_streaming_asset_ids", {
				Transform: {
					position: [0, 0, 0],
					rotation: [0, 0, 0, 1],
					scale: [1, 1, 1],
				},
				StreamingChunk: {
					role: "resident",
					assetIds: ["mesh_contract_player", 42],
				},
			}),
		),
	/StreamingChunk\.assetIds\.1 must be a non-empty string/,
	"streaming chunk asset ids must be explicit strings",
);

console.log("Performance runtime schema guards passed.");

function entityByStableId(stableId: string): number {
	for (const entity of runtime.runtime.world.query([STABLE_ID_COMPONENT])) {
		const component = runtime.runtime.world.getComponent<{
			readonly id?: unknown;
		}>(entity, STABLE_ID_COMPONENT);

		if (component?.id === stableId) {
			return entity;
		}
	}

	throw new Error(`Stable ID ${stableId} was not spawned.`);
}

function renderableMeshId(entity: number): string | undefined {
	const renderable = runtime.runtime.world.getComponent<RenderableComponent>(
		entity,
		"Renderable",
	);

	return renderable && renderable.kind !== "sprite"
		? renderable.meshId
		: undefined;
}

function manifestWithPrefabComponents(
	id: string,
	components: Record<string, unknown>,
): RuntimeSceneManifestData {
	return {
		...manifest,
		id,
		assets: {
			assets: [
				...manifest.assets.assets,
				{
					id: "audio_contract_invalid",
					kind: "audio",
					url: "/assets/performance/invalid.mp3",
				},
				{
					id: "mesh_contract_unpreloaded_lod",
					kind: "mesh",
					url: "/assets/performance/unpreloaded-lod.glb",
				},
			],
		},
		prefabs: [
			{
				id: `${id}_prefab`,
				assetIds: [
					"mesh_contract_player",
					"audio_contract_invalid",
					"mesh_contract_unpreloaded_lod",
				],
				components,
			},
		],
		level: {
			...manifest.level,
			preload: ["mesh_contract_player"],
			instances: [
				{
					id: `${id}-instance`,
					prefabId: `${id}_prefab`,
					stableId: `${id}:instance`,
				},
			],
		},
		readiness: {
			playerStableId: `${id}:instance`,
		},
	};
}

function createContractAssetManager(): AssetManager {
	const assets = new AssetManager();

	for (const kind of [
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
	] as const) {
		assets.registerLoader(kind, async (entry) => ({
			id: entry.id,
			kind: entry.kind,
		}));
	}

	return assets;
}

function createRendererPort(): GameRendererPort {
	return {
		attach() {},
		updateTransform() {},
		detach() {},
		attachLight() {},
		updateLight() {},
		detachLight() {},
		attachReflectionProbe() {},
		updateReflectionProbe() {},
		detachReflectionProbe() {},
		applySceneEnvironment() {},
		clearSceneEnvironment() {},
		setCollisionOverlay() {},
		clearCollisionOverlay() {},
		setCameraPose() {},
		applyRenderProfile() {},
		render() {},
		dispose() {},
	} satisfies GameRendererPort;
}

function createPhysicsPort(): PhysicsAdapterPort {
	let nextHandle = 1;

	return {
		createRigidBody() {
			const handle = nextHandle;
			nextHandle += 1;
			return handle;
		},
		createCollider() {
			const handle = nextHandle;
			nextHandle += 1;
			return handle;
		},
		destroyCollider() {},
		destroyRigidBody() {},
		syncBodyFromTransform() {},
		syncTransformFromBody() {
			return {
				position: vec3(),
				rotation: quat(),
			};
		},
		applyImpulse() {},
		step() {},
		drainEvents() {
			return [];
		},
		dispose() {},
	};
}

function flushStreamingAssetLoads(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}
