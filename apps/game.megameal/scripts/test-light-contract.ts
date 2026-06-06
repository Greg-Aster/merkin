import {
	type ThreeCameraLike,
	type ThreeObject3DLike,
	ThreeRendererAdapter,
	type ThreeRendererLike,
	type ThreeRuntime,
	type ThreeSceneLike,
} from "../src/engine/adapters/three/index.js";
import {
	type LightAuthoringDraftData,
	type RenderProfileData,
	type RenderTransform,
	type RuntimeSceneManifestData,
	buildLightAuthoringPlan,
	parseAudioContentManifest,
	parseLightAuthoringDraft,
	quat,
	validateLightAuthoringPlanAgainstRuntimeScene,
	validateLightComponentData,
	validateRuntimeSceneContentGraph,
	vec3,
} from "../src/engine/index.js";
import { audioContentManifestForRuntimeScene } from "../src/game/assets/index.js";
import { mirandaLightAuthoringDraft } from "../src/game/editor/lightDrafts/mirandaLightDraft.js";
import {
	defaultRuntimeSceneManifests,
	mirandaDeckRuntimeSceneManifest,
	portalArenaRuntimeSceneManifest,
} from "../src/game/levels/index.js";

for (const manifest of defaultRuntimeSceneManifests) {
	const result = validateContentGraph(manifest);

	if (!result.ok) {
		throw new Error(
			`Expected ${manifest.id} lighting budget to validate:\n${result.errors.join("\n")}`,
		);
	}
}

{
	const result = validateContentGraph(mirandaDeckRuntimeSceneManifest);

	if (!result.ok) {
		throw new Error(
			`Expected Miranda light budget to validate:\n${result.errors.join("\n")}`,
		);
	}

	assertEqual(result.graph.lightBudgetCounts.ambient, 1);
	assertEqual(result.graph.lightBudgetCounts.directional, 2);
	assertEqual(result.graph.lightBudgetCounts.point, 3);
	assertEqual(result.graph.lightBudgetCounts.spot, 0);
	assertEqual(result.graph.lightBudgetCounts.area, 0);
	assertEqual(result.graph.lightBudgetCounts.shadowCasting, 0);
	assertEqual(result.graph.lightBudgetCounts.total, 6);
}

expectInvalidContentGraph(
	{
		...cloneManifest(mirandaDeckRuntimeSceneManifest),
		renderProfile: {
			...mirandaDeckRuntimeSceneManifest.renderProfile,
			lighting: {
				...mirandaDeckRuntimeSceneManifest.renderProfile.lighting,
				budget: {
					...mirandaDeckRuntimeSceneManifest.renderProfile.lighting.budget,
					maxPoint: 2,
				},
			},
		},
	},
	"exceeds renderProfile.lighting.budget.maxPoint",
);

expectInvalidContentGraph(
	{
		...cloneManifest(portalArenaRuntimeSceneManifest),
		level: {
			...portalArenaRuntimeSceneManifest.level,
			instances: portalArenaRuntimeSceneManifest.level.instances.map(
				(instance) =>
					instance.stableId === "player"
						? {
								...instance,
								components: {
									...instance.components,
									Light: {
										...asRecord(instance.components?.Light),
										shadow: {
											enabled: true,
											mapSize: 1024,
										},
									},
								},
							}
						: instance,
			),
		},
		renderProfile: {
			...portalArenaRuntimeSceneManifest.renderProfile,
			lighting: {
				...portalArenaRuntimeSceneManifest.renderProfile.lighting,
				budget: {
					...portalArenaRuntimeSceneManifest.renderProfile.lighting.budget,
					maxShadowCasting: 0,
				},
			},
		},
	},
	"exceeds renderProfile.lighting.budget.maxShadowCasting",
);

expectInvalidContentGraph(
	{
		...cloneManifest(mirandaDeckRuntimeSceneManifest),
		prefabs: mirandaDeckRuntimeSceneManifest.prefabs.map((prefab) =>
			prefab.id === "miranda_command_gallery_beacon_light"
				? {
						...prefab,
						components: {
							...prefab.components,
							Light: {
								kind: "area",
								shape: "rectangle",
								color: "#e76949",
								intensity: 6,
								width: 4,
								height: 2,
								visible: true,
							},
						},
					}
				: prefab,
		),
		renderProfile: {
			...mirandaDeckRuntimeSceneManifest.renderProfile,
			lighting: {
				...mirandaDeckRuntimeSceneManifest.renderProfile.lighting,
				budget: {
					...mirandaDeckRuntimeSceneManifest.renderProfile.lighting.budget,
					maxArea: 0,
				},
			},
		},
	},
	"exceeds renderProfile.lighting.budget.maxArea",
);

expectLightErrors(
	{
		kind: "ambient",
		color: "#ffffff",
		intensity: 1,
		shadow: { enabled: true },
	},
	"Light.shadow is not supported for ambient lights.",
);

expectLightErrors(
	{
		kind: "spot",
		color: "#ffffff",
		intensity: 1,
		distance: 10,
		decay: 2,
		angle: 0.5,
		penumbra: 0.25,
		shadow: {
			enabled: true,
			mapSize: 300,
		},
	},
	"Light.shadow.mapSize must be 256, 512, 1024, or 2048.",
);

expectLightErrors(
	{
		kind: "area",
		shape: "rectangle",
		color: "#ffffff",
		intensity: 1,
		width: 3,
		height: 2,
		shadow: { enabled: true },
	},
	"Light.shadow is not supported for area lights.",
);

{
	const plan = buildLightAuthoringPlan(mirandaLightAuthoringDraft);
	const result = validateLightAuthoringPlanAgainstRuntimeScene(
		plan,
		mirandaDeckRuntimeSceneManifest,
	);

	if (!result.ok) {
		throw new Error(
			`Expected Miranda light authoring draft to match runtime scene:\n${result.errors.join("\n")}`,
		);
	}

	assertEqual(plan.entries.length, 3);
}

const firstMirandaLightEntry = mirandaLightAuthoringDraft.entries[0];

if (!firstMirandaLightEntry) {
	throw new Error("Expected Miranda light authoring draft to contain entries.");
}

expectInvalidLightDraft(
	{
		...mirandaLightAuthoringDraft,
		entries: [
			{
				...firstMirandaLightEntry,
				light: {
					kind: "point",
					color: "#e76949",
					intensity: 8,
					distance: -1,
					decay: 2,
					visible: true,
				},
			},
		],
	},
	"lightAuthoringDraft.entries.0.light.distance must be a non-negative finite number.",
);

{
	const plan = buildLightAuthoringPlan(mirandaLightAuthoringDraft);
	const manifest = {
		...cloneManifest(mirandaDeckRuntimeSceneManifest),
		readiness: {
			...mirandaDeckRuntimeSceneManifest.readiness,
			requiredLightStableIds: [],
		},
	};
	const result = validateLightAuthoringPlanAgainstRuntimeScene(plan, manifest);

	if (result.ok) {
		throw new Error("Expected light authoring runtime validation to fail.");
	}

	assertIncludes(
		result.errors,
		'light authoring entry "miranda-command-gallery-beacon-light" stableId "miranda:command-gallery:beacon-light" is missing from readiness.requiredLightStableIds.',
	);
}

function validateContentGraph(manifest: RuntimeSceneManifestData) {
	const audioContent = parseAudioContentManifest(
		audioContentManifestForRuntimeScene(manifest.id),
		{ assetManifest: manifest.assets },
	);

	return validateRuntimeSceneContentGraph({
		manifest,
		runtimeSceneIds: defaultRuntimeSceneManifests.map((scene) => scene.id),
		audioContent,
	});
}

function expectInvalidContentGraph(
	manifest: RuntimeSceneManifestData,
	expectedError: string,
): void {
	const result = validateContentGraph(manifest);

	if (result.ok) {
		throw new Error(
			`Expected ${manifest.id} content graph to fail with ${JSON.stringify(expectedError)}.`,
		);
	}

	assertIncludes(result.errors, expectedError);
}

function expectLightErrors(light: unknown, expectedError: string): void {
	const errors = validateLightComponentData(light);

	assertIncludes(errors, expectedError);
}

function expectInvalidLightDraft(
	draft: LightAuthoringDraftData,
	expectedError: string,
): void {
	try {
		parseLightAuthoringDraft(draft);
	} catch (error) {
		if (error instanceof Error && error.message.includes(expectedError)) {
			return;
		}

		throw error;
	}

	throw new Error(
		`Expected light authoring draft to fail with ${JSON.stringify(expectedError)}.`,
	);
}

function createFakeRendererAdapter(): {
	readonly adapter: ThreeRendererAdapter;
	readonly renderer: FakeRenderer;
} {
	const renderer = new FakeRenderer();
	const adapter = new ThreeRendererAdapter({
		three: createFakeThreeRuntime(),
		renderer,
		defaultLights: false,
		renderProfile: fakeRenderProfile,
	});

	return { adapter, renderer };
}

function createFakeThreeRuntime(): ThreeRuntime {
	return {
		Scene: FakeScene,
		PerspectiveCamera: FakeCamera,
		WebGLRenderer: FakeRenderer,
		BoxGeometry: FakeGeometry,
		MeshStandardMaterial: FakeMaterial,
		AmbientLight: FakeAmbientLight,
		DirectionalLight: FakeDirectionalLight,
		PointLight: FakePointLight,
		SpotLight: FakeSpotLight,
		RectAreaLight: FakeRectAreaLight,
	} as unknown as ThreeRuntime;
}

const fakeRenderProfile: RenderProfileData = {
	id: "fake_light_contract",
	renderer: {
		clearColor: "#000000",
		clearAlpha: 1,
		antialias: false,
		maxPixelRatio: 1,
		fallbackMaterialColor: "#ffffff",
	},
	lighting: {
		lights: [],
		budget: {
			maxTotal: 4,
			maxSpot: 1,
			maxArea: 1,
			maxShadowCasting: 1,
		},
	},
	environment: {
		kind: "solid-color",
		color: "#000000",
		backgroundIntensity: 1,
	},
};

class FakeVector {
	x = 0;
	y = 0;
	z = 0;

	set(x: number, y: number, z: number): void {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}

class FakeQuaternion {
	x = 0;
	y = 0;
	z = 0;
	w = 1;

	set(x: number, y: number, z: number, w: number): void {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
	}
}

class FakeObject3D implements ThreeObject3DLike {
	userData: Record<string, unknown> = {};
	visible = true;
	position = new FakeVector();
	quaternion = new FakeQuaternion();
	scale = new FakeVector();
	parent: { remove(object: ThreeObject3DLike): void } | null = null;
	children: ThreeObject3DLike[] = [];

	add(object: ThreeObject3DLike): void {
		this.children.push(object);
		object.parent = this;
	}

	remove(object: ThreeObject3DLike): void {
		this.children = this.children.filter((child) => child !== object);
		object.parent = null;
	}
}

class FakeScene extends FakeObject3D implements ThreeSceneLike {
	background = null;
	environment = null;
}

class FakeCamera extends FakeObject3D implements ThreeCameraLike {
	constructor(
		readonly fov: number,
		readonly aspect: number,
		readonly near: number,
		readonly far: number,
	) {
		super();
	}

	lookAt(): void {}
	updateProjectionMatrix(): void {}
}

class FakeRenderer implements ThreeRendererLike {
	shadowMap = { enabled: false };

	render(): void {}
	dispose(): void {}
	setClearColor(): void {}
	setPixelRatio(): void {}
	setSize(): void {}
}

class FakeGeometry {
	dispose(): void {}
}

class FakeMaterial {
	dispose(): void {}
}

class FakeAmbientLight extends FakeObject3D {
	color = new FakeColor();

	constructor(
		_color: string | number,
		readonly intensity: number,
	) {
		super();
	}
}

class FakeDirectionalLight extends FakeAmbientLight {
	castShadow = false;
	shadow = createFakeShadow();
}

class FakePointLight extends FakeAmbientLight {
	castShadow = false;
	shadow = createFakeShadow();

	constructor(
		color: string | number,
		intensity: number,
		readonly distance: number,
		readonly decay: number,
	) {
		super(color, intensity);
	}
}

class FakeSpotLight extends FakePointLight {
	constructor(
		color: string | number,
		intensity: number,
		distance: number,
		readonly angle: number,
		readonly penumbra: number,
		decay: number,
	) {
		super(color, intensity, distance, decay);
	}
}

class FakeRectAreaLight extends FakeAmbientLight {
	width: number;
	height: number;

	constructor(
		color: string | number,
		intensity: number,
		width = 0,
		height = 0,
	) {
		super(color, intensity);
		this.width = width;
		this.height = height;
	}
}

class FakeColor {
	value: string | number = "#ffffff";

	set(color: string | number): void {
		this.value = color;
	}
}

function createFakeShadow() {
	return {
		mapSize: {
			width: 0,
			height: 0,
			set(width: number, height: number): void {
				this.width = width;
				this.height = height;
			},
		},
		bias: 0,
		normalBias: 0,
		radius: 0,
		camera: {
			near: 0,
			far: 0,
			updateCount: 0,
			updateProjectionMatrix(): void {
				this.updateCount += 1;
			},
		},
	};
}

function assertFakeRendererLightShadowProjection(): void {
	const { adapter, renderer } = createFakeRendererAdapter();
	const transform: RenderTransform = {
		position: vec3(1, 2, 3),
		rotation: quat(0, 0, 0, 1),
		scale: vec3(1, 1, 1),
	};

	adapter.attachLight(
		42,
		{
			kind: "spot",
			color: "#ffffff",
			intensity: 3,
			distance: 18,
			decay: 2,
			angle: 0.6,
			penumbra: 0.35,
			shadow: {
				enabled: true,
				mapSize: 512,
				bias: -0.0002,
				normalBias: 0.03,
				radius: 2,
				cameraNear: 0.5,
				cameraFar: 80,
			},
		},
		transform,
	);

	const light = adapter.scene.children?.[0] as FakeSpotLight | undefined;

	if (!light) {
		throw new Error("Expected fake Three scene to receive an authored light.");
	}

	assertEqual(renderer.shadowMap.enabled, true);
	assertEqual(light.castShadow, true);
	assertEqual(light.shadow.mapSize.width, 512);
	assertEqual(light.shadow.mapSize.height, 512);
	assertEqual(light.shadow.bias, -0.0002);
	assertEqual(light.shadow.normalBias, 0.03);
	assertEqual(light.shadow.radius, 2);
	assertEqual(light.shadow.camera.near, 0.5);
	assertEqual(light.shadow.camera.far, 80);
	assertEqual(light.shadow.camera.updateCount, 1);

	adapter.updateLight(
		42,
		{
			kind: "spot",
			color: "#ffffff",
			intensity: 2,
			distance: 12,
			decay: 2,
			angle: 0.4,
			penumbra: 0.2,
			shadow: {
				enabled: false,
			},
		},
		transform,
	);

	assertEqual(light.castShadow, false);
}

function assertFakeRendererAreaLightProjection(): void {
	const { adapter, renderer } = createFakeRendererAdapter();
	const transform: RenderTransform = {
		position: vec3(1, 2, 3),
		rotation: quat(0, 0, 0, 1),
		scale: vec3(1, 1, 1),
	};

	adapter.attachLight(
		43,
		{
			kind: "area",
			shape: "rectangle",
			color: "#ffe3b0",
			intensity: 5,
			width: 4,
			height: 2,
		},
		transform,
	);

	const light = adapter.scene.children?.[0] as FakeRectAreaLight | undefined;

	if (!light) {
		throw new Error("Expected fake Three scene to receive an area light.");
	}

	assertEqual(renderer.shadowMap.enabled, false);
	assertEqual(light.width, 4);
	assertEqual(light.height, 2);

	adapter.updateLight(
		43,
		{
			kind: "area",
			shape: "rectangle",
			color: "#ffe3b0",
			intensity: 3,
			width: 6,
			height: 1.5,
			visible: false,
		},
		transform,
	);

	assertEqual(light.width, 6);
	assertEqual(light.height, 1.5);
	assertEqual(light.visible, false);
}

function cloneManifest(
	manifest: RuntimeSceneManifestData,
): RuntimeSceneManifestData {
	return JSON.parse(JSON.stringify(manifest)) as RuntimeSceneManifestData;
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function assertIncludes(values: readonly string[], expected: string): void {
	if (!values.some((value) => value.includes(expected))) {
		throw new Error(
			`Expected values to include ${JSON.stringify(expected)}, received:\n${values.join("\n")}`,
		);
	}
}

function assertEqual<T>(actual: T, expected: T): void {
	if (actual !== expected) {
		throw new Error(
			`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
		);
	}
}

assertFakeRendererLightShadowProjection();
assertFakeRendererAreaLightProjection();

console.log("Light contract passed.");
