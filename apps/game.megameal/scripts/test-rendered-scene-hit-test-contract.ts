import {
	type RenderedSceneBoxSelectPort,
	type RenderedSceneHitTestPort,
	buildRenderedSceneBoxSelectResultPayload,
	buildRenderedSceneHitTestResultPayload,
} from "../src/app/devPreview/renderedSceneHitTestResult.js";
import {
	type ThreeBox3Like,
	type ThreeCameraLike,
	type ThreeGeometryLike,
	type ThreeMaterialLike,
	type ThreeObject3DLike,
	type ThreeRaycasterIntersectionLike,
	type ThreeRaycasterLike,
	ThreeRendererAdapter,
	type ThreeRendererLike,
	type ThreeRuntime,
	type ThreeSceneLike,
	type ThreeVector2Like,
} from "../src/engine/adapters/three/index.js";
import {
	EngineRuntime,
	type RenderTransform,
	type RenderableComponent,
	quat,
	vec3,
} from "../src/engine/index.js";
import {
	PREFAB_COMPONENT,
	STABLE_ID_COMPONENT,
} from "../src/game/prefabs/index.js";
import { PORTAL_COMPONENT } from "../src/game/systems/index.js";

const renderable: RenderableComponent = {
	meshId: "mesh_portal_gate",
	materialId: "material_portal_gate",
};
const transform: RenderTransform = {
	position: vec3(1, 2, 3),
	rotation: quat(),
	scale: vec3(1, 1, 1),
};

function assertThreeAdapterHitTestUsesAdapterRaycaster(): void {
	const child = new FakeObject3D();
	const root = new FakeObject3D();
	root.add(child);
	const adapter = createAdapter({
		resolveObject: () => root,
	});

	adapter.attach(42, renderable, transform);
	FakeRaycaster.nextIntersections = [
		{
			object: child,
			distance: 12.5,
			point: { x: 4, y: 5, z: 6 },
			face: {
				normal: { x: 0, y: 1, z: 0 },
			},
		},
	];

	const result = adapter.hitTestRenderedScene({
		viewport: { width: 200, height: 100 },
		screenPoint: { x: 100, y: 50 },
	});

	assertEqual(result.status, "hit", "Expected adapter raycast to hit.");

	if (result.status !== "hit") {
		throw new Error("Expected hit result.");
	}

	assertEqual(
		result.entity,
		42,
		"Expected child hit to resolve sanitized entity.",
	);
	assertDeepEqual(
		result.worldPosition,
		[4, 5, 6],
		"Expected adapter hit to return a plain world-position tuple.",
	);
	assertDeepEqual(
		result.worldNormal,
		[0, 1, 0],
		"Expected adapter hit to return a plain optional world-normal tuple.",
	);
	assertDeepEqual(
		FakeRaycaster.lastPoint,
		{ x: 0, y: 0 },
		"Expected CSS-pixel center point to convert to normalized device coordinates.",
	);
	assertEqual(
		FakeRaycaster.lastRecursive,
		true,
		"Expected adapter raycast to recurse through attached render objects.",
	);
}

function assertThreeAdapterHitTestRespectsEntityFilter(): void {
	const adapter = createAdapter();

	adapter.attach(7, renderable, transform);

	const result = adapter.hitTestRenderedScene({
		viewport: { width: 100, height: 100 },
		screenPoint: { x: 50, y: 50 },
		entityFilter: new Set([99]),
	});

	assertEqual(
		result.status,
		"miss",
		"Expected adapter hit-test to miss when entity filter excludes all objects.",
	);
}

function assertThreeAdapterHitTestReportsUnavailableWithoutRaycaster(): void {
	const runtimeWithoutRaycaster = createFakeThreeRuntime();
	(runtimeWithoutRaycaster as { Raycaster?: unknown }).Raycaster = undefined;
	const adapter = new ThreeRendererAdapter({
		three: runtimeWithoutRaycaster,
		renderer: new FakeRenderer(),
		defaultLights: false,
	});
	const result = adapter.hitTestRenderedScene({
		viewport: { width: 100, height: 100 },
		screenPoint: { x: 50, y: 50 },
	});

	assertEqual(
		result.status,
		"unavailable",
		"Expected adapter hit-test to report unavailable when the runtime lacks Raycaster.",
	);
}

function assertThreeAdapterBoxSelectProjectsAttachedBounds(): void {
	const adapter = createAdapter();

	adapter.attach(7, renderable, {
		...transform,
		position: vec3(0.35, 0, 0),
	});
	adapter.attach(9, renderable, {
		...transform,
		position: vec3(0.9, 0, 0),
	});
	adapter.getObject(7)?.position.set(0.35, 0, 0);
	adapter.getObject(9)?.position.set(0.9, 0, 0);
	setFakeBoundsHalfExtents(adapter.getObject(7), 0.3, 0.1, 0.1);
	setFakeBoundsHalfExtents(adapter.getObject(9), 0.05, 0.1, 0.1);

	const result = adapter.boxSelectRenderedScene({
		viewport: { width: 100, height: 100 },
		rect: { x: 40, y: 40, width: 20, height: 20 },
		entityFilter: new Set([7, 9]),
	});

	assertEqual(
		result.status,
		"hit",
		"Expected adapter box selection to hit projected object bounds intersecting the CSS-pixel rectangle.",
	);

	if (result.status !== "hit") {
		throw new Error("Expected box-select hit result.");
	}

	assertDeepEqual(
		result.hits.map((hit) => hit.entity),
		[7],
		"Expected box selection to include only the entity whose projected bounds intersect the rectangle.",
	);
}

function assertResultPayloadMapsEntityHitsToStableIds(): void {
	const runtime = new EngineRuntime();
	const portal = runtime.world.createEntity();
	const port = createHitTestPort({
		status: "hit",
		entity: portal,
		distance: 3.25,
		worldPosition: [1, 2, 3],
		worldNormal: [0, 0, 1],
	});

	runtime.world.addComponent(portal, STABLE_ID_COMPONENT, {
		id: "portal-arena:portal:test",
	});
	runtime.world.addComponent(portal, PREFAB_COMPONENT, {
		prefabId: "prefab_portal_gate",
	});
	runtime.world.addComponent(portal, PORTAL_COMPONENT, {
		id: "portal",
		label: "Portal",
		targetRuntimeSceneId: "observatory_runtime",
		activationRadius: 2,
	});

	const payload = buildRenderedSceneHitTestResultPayload({
		runtime,
		hitTestPort: port,
		activeRuntimeSceneId: "portal_arena_runtime",
		request: {
			runtimeSceneId: "portal_arena_runtime",
			coordinateSpace: "viewport-css-pixels",
			viewport: { width: 1280, height: 720 },
			screenPoint: { x: 640, y: 360 },
			pickableStableIds: ["portal-arena:portal:test"],
			objectViewStateGate: "visible-and-pickable-only",
			writesRuntimeData: false,
		},
	});

	assertEqual(payload.status, "hit", "Expected stable runtime hit payload.");

	if (payload.status !== "hit") {
		throw new Error("Expected hit payload.");
	}

	assertEqual(
		payload.hit?.stableId,
		"portal-arena:portal:test",
		"Expected hit payload to report stable ID, not renderer object identity.",
	);
	assertEqual(
		payload.hit?.objectKind,
		"portal",
		"Expected hit payload to derive object kind from runtime components.",
	);
	assertEqual(
		payload.hit?.renderableId,
		"prefab_portal_gate",
		"Expected hit payload to include prefab-backed renderable context.",
	);
	assertEqual(
		payload.writesRuntimeData,
		false,
		"Expected rendered-scene hit-test result not to write runtime data.",
	);
	assertSetEqual(
		port.lastEntityFilter,
		new Set([portal]),
		"Expected request pickableStableIds to become an entity filter.",
	);
}

function assertBoxSelectPayloadMapsEntityHitsToStableIds(): void {
	const runtime = new EngineRuntime();
	const portalA = runtime.world.createEntity();
	const portalB = runtime.world.createEntity();
	const port = createBoxSelectPort({
		status: "hit",
		hits: [
			{
				entity: portalB,
				distance: 4,
				worldPosition: [4, 5, 6],
			},
			{
				entity: portalA,
				distance: 2,
				worldPosition: [1, 2, 3],
			},
		],
	});

	runtime.world.addComponent(portalA, STABLE_ID_COMPONENT, {
		id: "portal-arena:portal:a",
	});
	runtime.world.addComponent(portalB, STABLE_ID_COMPONENT, {
		id: "portal-arena:portal:b",
	});
	runtime.world.addComponent(portalA, PREFAB_COMPONENT, {
		prefabId: "prefab_portal_gate",
	});
	runtime.world.addComponent(portalB, PREFAB_COMPONENT, {
		prefabId: "prefab_portal_gate",
	});
	runtime.world.addComponent(portalA, PORTAL_COMPONENT, {
		id: "portal-a",
		label: "Portal A",
		targetRuntimeSceneId: "observatory_runtime",
		activationRadius: 2,
	});
	runtime.world.addComponent(portalB, PORTAL_COMPONENT, {
		id: "portal-b",
		label: "Portal B",
		targetRuntimeSceneId: "prototype_arena_runtime",
		activationRadius: 2,
	});

	const payload = buildRenderedSceneBoxSelectResultPayload({
		runtime,
		boxSelectPort: port,
		activeRuntimeSceneId: "portal_arena_runtime",
		request: {
			runtimeSceneId: "portal_arena_runtime",
			coordinateSpace: "viewport-css-pixels",
			viewport: { width: 1280, height: 720 },
			rect: { x: 320, y: 180, width: 640, height: 360 },
			pickableStableIds: ["portal-arena:portal:a", "portal-arena:portal:b"],
			objectViewStateGate: "visible-and-pickable-only",
			writesRuntimeData: false,
		},
	});

	assertEqual(payload.status, "hit", "Expected stable box-select payload.");

	if (payload.status !== "hit") {
		throw new Error("Expected box-select hit payload.");
	}

	assertDeepEqual(
		payload.hits?.map((hit) => hit.stableId),
		["portal-arena:portal:b", "portal-arena:portal:a"],
		"Expected box-select payload to preserve adapter hit order while mapping entities to stable IDs.",
	);
	assertEqual(
		payload.source,
		"runtime-rendered-scene-box-select",
		"Expected box-select payload source to distinguish marquee selection from point hit-testing.",
	);
	assertEqual(
		payload.writesRuntimeData,
		false,
		"Expected rendered-scene box selection not to write runtime data.",
	);
	assertSetEqual(
		port.lastEntityFilter,
		new Set([portalA, portalB]),
		"Expected box-select pickableStableIds to become an entity filter.",
	);
}

function assertResultPayloadReportsInactiveMissAndStaleOutcomes(): void {
	const runtime = new EngineRuntime();
	const entity = runtime.world.createEntity();
	runtime.world.addComponent(entity, STABLE_ID_COMPONENT, { id: "known" });

	const inactive = buildRenderedSceneHitTestResultPayload({
		runtime,
		hitTestPort: createHitTestPort({ status: "miss" }),
		activeRuntimeSceneId: "observatory_runtime",
		request: hitTestRequest(["known"]),
	});

	assertEqual(
		inactive.status,
		"ignored",
		"Expected inactive runtime scene hit-test to be ignored.",
	);
	assertEqual(
		inactive.reason,
		"runtime-scene-not-active",
		"Expected inactive runtime scene reason.",
	);

	const stale = buildRenderedSceneHitTestResultPayload({
		runtime,
		hitTestPort: createHitTestPort({ status: "miss" }),
		activeRuntimeSceneId: "portal_arena_runtime",
		request: hitTestRequest(["missing"]),
	});

	assertEqual(
		stale.status,
		"ignored",
		"Expected unknown pickable stable IDs to be treated as stale.",
	);
	assertEqual(stale.reason, "stale-request", "Expected stale request reason.");

	const miss = buildRenderedSceneHitTestResultPayload({
		runtime,
		hitTestPort: createHitTestPort({ status: "miss" }),
		activeRuntimeSceneId: "portal_arena_runtime",
		request: hitTestRequest(["known"]),
	});

	assertEqual(miss.status, "miss", "Expected adapter miss to become miss.");
	assertEqual(miss.reason, "no-rendered-hit", "Expected miss reason.");

	const unavailable = buildRenderedSceneHitTestResultPayload({
		runtime,
		hitTestPort: createHitTestPort({
			status: "unavailable",
			reason: "rendered-hit-test-unavailable",
		}),
		activeRuntimeSceneId: "portal_arena_runtime",
		request: hitTestRequest(["known"]),
	});

	assertEqual(
		unavailable.status,
		"ignored",
		"Expected unavailable adapter result to become ignored.",
	);
	assertEqual(
		unavailable.reason,
		"rendered-hit-test-unavailable",
		"Expected unavailable reason.",
	);
}

function assertBoxSelectPayloadReportsInactiveMissAndStaleOutcomes(): void {
	const runtime = new EngineRuntime();
	const entity = runtime.world.createEntity();
	runtime.world.addComponent(entity, STABLE_ID_COMPONENT, { id: "known" });

	const inactive = buildRenderedSceneBoxSelectResultPayload({
		runtime,
		boxSelectPort: createBoxSelectPort({ status: "miss" }),
		activeRuntimeSceneId: "observatory_runtime",
		request: boxSelectRequest(["known"]),
	});

	assertEqual(
		inactive.status,
		"ignored",
		"Expected inactive runtime scene box selection to be ignored.",
	);
	assertEqual(
		inactive.reason,
		"runtime-scene-not-active",
		"Expected inactive box selection reason.",
	);

	const stale = buildRenderedSceneBoxSelectResultPayload({
		runtime,
		boxSelectPort: createBoxSelectPort({ status: "miss" }),
		activeRuntimeSceneId: "portal_arena_runtime",
		request: boxSelectRequest(["missing"]),
	});

	assertEqual(
		stale.status,
		"ignored",
		"Expected unknown box-select pickable stable IDs to be treated as stale.",
	);
	assertEqual(
		stale.reason,
		"stale-request",
		"Expected stale box request reason.",
	);

	const miss = buildRenderedSceneBoxSelectResultPayload({
		runtime,
		boxSelectPort: createBoxSelectPort({ status: "miss" }),
		activeRuntimeSceneId: "portal_arena_runtime",
		request: boxSelectRequest(["known"]),
	});

	assertEqual(miss.status, "miss", "Expected adapter box miss to become miss.");
	assertEqual(miss.reason, "no-rendered-hit", "Expected box miss reason.");

	const unavailable = buildRenderedSceneBoxSelectResultPayload({
		runtime,
		boxSelectPort: createBoxSelectPort({
			status: "unavailable",
			reason: "rendered-hit-test-unavailable",
		}),
		activeRuntimeSceneId: "portal_arena_runtime",
		request: boxSelectRequest(["known"]),
	});

	assertEqual(
		unavailable.status,
		"ignored",
		"Expected unavailable adapter box result to become ignored.",
	);
	assertEqual(
		unavailable.reason,
		"rendered-hit-test-unavailable",
		"Expected unavailable box-selection reason.",
	);
}

function hitTestRequest(pickableStableIds: readonly string[]) {
	return {
		runtimeSceneId: "portal_arena_runtime",
		coordinateSpace: "viewport-css-pixels" as const,
		viewport: { width: 1280, height: 720 },
		screenPoint: { x: 640, y: 360 },
		pickableStableIds,
		objectViewStateGate: "visible-and-pickable-only" as const,
		writesRuntimeData: false as const,
	};
}

function boxSelectRequest(pickableStableIds: readonly string[]) {
	return {
		runtimeSceneId: "portal_arena_runtime",
		coordinateSpace: "viewport-css-pixels" as const,
		viewport: { width: 1280, height: 720 },
		rect: { x: 320, y: 180, width: 640, height: 360 },
		pickableStableIds,
		objectViewStateGate: "visible-and-pickable-only" as const,
		writesRuntimeData: false as const,
	};
}

function createAdapter(
	options: {
		readonly resolveObject?: () => ThreeObject3DLike;
	} = {},
): ThreeRendererAdapter {
	FakeRaycaster.nextIntersections = [];
	FakeRaycaster.lastPoint = undefined;
	FakeRaycaster.lastRecursive = undefined;

	return new ThreeRendererAdapter({
		three: createFakeThreeRuntime(),
		renderer: new FakeRenderer(),
		defaultLights: false,
		...(options.resolveObject === undefined
			? {}
			: { resolveObject: options.resolveObject }),
	});
}

function createHitTestPort(
	result: ReturnType<RenderedSceneHitTestPort["hitTestRenderedScene"]>,
): RenderedSceneHitTestPort & {
	lastEntityFilter: ReadonlySet<number> | undefined;
} {
	let lastEntityFilter: ReadonlySet<number> | undefined;

	return {
		get lastEntityFilter() {
			return lastEntityFilter;
		},
		hitTestRenderedScene(request) {
			lastEntityFilter = request.entityFilter;
			return result;
		},
	};
}

function createBoxSelectPort(
	result: ReturnType<RenderedSceneBoxSelectPort["boxSelectRenderedScene"]>,
): RenderedSceneBoxSelectPort & {
	lastEntityFilter: ReadonlySet<number> | undefined;
} {
	let lastEntityFilter: ReadonlySet<number> | undefined;

	return {
		get lastEntityFilter() {
			return lastEntityFilter;
		},
		boxSelectRenderedScene(request) {
			lastEntityFilter = request.entityFilter;
			return result;
		},
	};
}

function createFakeThreeRuntime(): ThreeRuntime {
	return {
		Scene: FakeScene,
		PerspectiveCamera: FakeCamera,
		WebGLRenderer: FakeRenderer,
		BoxGeometry: FakeGeometry,
		MeshStandardMaterial: FakeMaterial,
		Vector2: FakeVector2,
		Vector3: FakeVector3,
		Box3: FakeBox3,
		Raycaster: FakeRaycaster,
		Mesh: FakeMesh,
	} as unknown as ThreeRuntime;
}

function setFakeBoundsHalfExtents(
	object: ThreeObject3DLike | undefined,
	x: number,
	y: number,
	z: number,
): void {
	if (!(object instanceof FakeObject3D)) {
		throw new Error("Expected a fake object to set test bounds.");
	}

	object.boundsHalfExtents.set(x, y, z);
}

class FakeVector2 implements ThreeVector2Like {
	constructor(
		public x: number,
		public y: number,
	) {}
}

class FakeVector3 {
	constructor(
		public x = 0,
		public y = 0,
		public z = 0,
	) {}

	set(x: number, y: number, z: number): void {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	project(): FakeVector3 {
		return this;
	}
}

class FakeBox3 implements ThreeBox3Like {
	min = new FakeVector3(
		Number.POSITIVE_INFINITY,
		Number.POSITIVE_INFINITY,
		Number.POSITIVE_INFINITY,
	);
	max = new FakeVector3(
		Number.NEGATIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
	);

	setFromObject(object: ThreeObject3DLike): FakeBox3 {
		this.includeObject(object);
		return this;
	}

	private includeObject(object: ThreeObject3DLike): void {
		if (object instanceof FakeObject3D) {
			const halfExtents = object.boundsHalfExtents;
			this.includePoint(
				object.position.x - halfExtents.x,
				object.position.y - halfExtents.y,
				object.position.z - halfExtents.z,
			);
			this.includePoint(
				object.position.x + halfExtents.x,
				object.position.y + halfExtents.y,
				object.position.z + halfExtents.z,
			);
		}

		for (const child of object.children ?? []) {
			this.includeObject(child);
		}
	}

	private includePoint(x: number, y: number, z: number): void {
		this.min.x = Math.min(this.min.x, x);
		this.min.y = Math.min(this.min.y, y);
		this.min.z = Math.min(this.min.z, z);
		this.max.x = Math.max(this.max.x, x);
		this.max.y = Math.max(this.max.y, y);
		this.max.z = Math.max(this.max.z, z);
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
	position = new FakeVector3();
	quaternion = new FakeQuaternion();
	scale = new FakeVector3();
	boundsHalfExtents = new FakeVector3();
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
	render(): void {}
	dispose(): void {}
	setClearColor(): void {}
	setPixelRatio(): void {}
	setSize(): void {}
}

class FakeGeometry implements ThreeGeometryLike {
	dispose(): void {}
}

class FakeMaterial implements ThreeMaterialLike {
	dispose(): void {}
}

class FakeMesh extends FakeObject3D {
	constructor(
		readonly geometry: ThreeGeometryLike,
		readonly material: ThreeMaterialLike,
	) {
		super();
	}
}

class FakeRaycaster implements ThreeRaycasterLike {
	static nextIntersections: ThreeRaycasterIntersectionLike[] = [];
	static lastPoint: { x: number; y: number } | undefined;
	static lastRecursive: boolean | undefined;

	setFromCamera(point: ThreeVector2Like): void {
		FakeRaycaster.lastPoint = { x: point.x, y: point.y };
	}

	intersectObjects(
		_objects: readonly ThreeObject3DLike[],
		recursive?: boolean,
	): ThreeRaycasterIntersectionLike[] {
		FakeRaycaster.lastRecursive = recursive;
		return FakeRaycaster.nextIntersections;
	}
}

assertThreeAdapterHitTestUsesAdapterRaycaster();
assertThreeAdapterHitTestRespectsEntityFilter();
assertThreeAdapterHitTestReportsUnavailableWithoutRaycaster();
assertThreeAdapterBoxSelectProjectsAttachedBounds();
assertResultPayloadMapsEntityHitsToStableIds();
assertBoxSelectPayloadMapsEntityHitsToStableIds();
assertResultPayloadReportsInactiveMissAndStaleOutcomes();
assertBoxSelectPayloadReportsInactiveMissAndStaleOutcomes();

console.log(
	"Rendered-scene hit-test contract passed: adapter raycast and box-selection results map to stable-ID protocol payloads without runtime writes.",
);

function assertEqual<T>(actual: T, expected: T, message: string): void {
	if (!Object.is(actual, expected)) {
		throw new Error(
			`${message} Expected ${String(expected)}, got ${String(actual)}.`,
		);
	}
}

function assertSetEqual<T>(
	actual: ReadonlySet<T> | undefined,
	expected: ReadonlySet<T>,
	message: string,
): void {
	if (actual === undefined) {
		throw new Error(`${message} Expected a set, got undefined.`);
	}

	if (actual.size !== expected.size) {
		throw new Error(
			`${message} Expected set size ${expected.size}, got ${actual.size}.`,
		);
	}

	for (const value of expected) {
		if (!actual.has(value)) {
			throw new Error(
				`${message} Missing expected set value ${String(value)}.`,
			);
		}
	}
}

function assertDeepEqual(
	actual: unknown,
	expected: unknown,
	message: string,
): void {
	const actualJson = JSON.stringify(actual);
	const expectedJson = JSON.stringify(expected);

	if (actualJson !== expectedJson) {
		throw new Error(`${message} Expected ${expectedJson}, got ${actualJson}.`);
	}
}
