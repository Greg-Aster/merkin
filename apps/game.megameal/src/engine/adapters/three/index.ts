import type { Entity } from "../../core/index.js";
import type {
	RenderProfileData,
	RenderProfileLightData,
} from "../../data/index.js";
import type { Vec3 } from "../../math/index.js";
import type {
	AssetDisposer,
	AssetKind,
	AssetLoader,
	AssetManagerPort,
	AssetManifestEntry,
} from "../../modules/assets/index.js";
import type { CameraPose, CameraPosePort } from "../../modules/camera/index.js";
import type {
	LightComponent,
	LightRendererPort,
	LightShadowSettings,
	ReflectionProbeComponent,
	ReflectionProbeRendererPort,
	RenderTransform,
	RenderableComponent,
	RendererPort,
	SceneEnvironment,
	SceneEnvironmentAssetResolver,
	SceneEnvironmentRendererPort,
	WaterSurfaceRendererPort,
	WaterSurfaceRendererState,
} from "../../modules/rendering/index.js";

export type ThreeAdapterBoundary = {
	readonly kind: "three";
};

export type ThreeVectorLike = {
	set(x: number, y: number, z: number): void;
	readonly x?: number;
	readonly y?: number;
	readonly z?: number;
};

export type ThreeVector2Like = {
	x: number;
	y: number;
	set?(x: number, y: number): void;
};

export type ThreeVector3Like = {
	x: number;
	y: number;
	z: number;
	project?(camera: ThreeCameraLike): ThreeVector3Like;
};

export type ThreeBox3Like = {
	readonly min: ThreeVector3Like;
	readonly max: ThreeVector3Like;
	setFromObject?(object: ThreeObject3DLike): ThreeBox3Like;
};

export type ThreeQuaternionLike = {
	set(x: number, y: number, z: number, w: number): void;
};

export type ThreeDisposableLike = {
	dispose(): void;
};

export type ThreeTextureLike = ThreeDisposableLike & {
	readonly isTexture?: boolean;
	mapping?: unknown;
	colorSpace?: unknown;
	encoding?: unknown;
	needsUpdate?: boolean;
};

export type ThreeCubeTextureLoaderLike = {
	load(
		urls: readonly string[],
		onLoad?: (texture: ThreeTextureLike) => void,
		onProgress?: (event: unknown) => void,
		onError?: (error: unknown) => void,
	): ThreeTextureLike;
};

export type ThreeTextureLoaderLike = {
	load(
		url: string,
		onLoad?: (texture: ThreeTextureLike) => void,
		onProgress?: (event: unknown) => void,
		onError?: (error: unknown) => void,
	): ThreeTextureLike;
};

export type ThreeVideoTextureConstructor = new (
	video: HTMLVideoElement,
) => ThreeTextureLike;

export type ThreePmremRenderTargetLike = ThreeDisposableLike & {
	readonly texture: ThreeTextureLike;
};

export type ThreePmremGeneratorLike = ThreeDisposableLike & {
	compileEquirectangularShader?(): void;
	fromEquirectangular(texture: ThreeTextureLike): ThreePmremRenderTargetLike;
	fromScene?(
		scene: ThreeSceneLike,
		sigma?: number,
		near?: number,
		far?: number,
	): ThreePmremRenderTargetLike;
};

export type ThreeWebGLCubeRenderTargetLike = ThreeDisposableLike & {
	readonly texture: ThreeTextureLike;
};

export type ThreeCubeCameraLike = ThreeObject3DLike & {
	update(renderer: ThreeRendererLike, scene: ThreeSceneLike): void;
};

export type ThreeGeometryLike = ThreeDisposableLike;
type ThreePlaneGeometryLike = ThreeGeometryLike & {
	rotateX?(radians: number): unknown;
};

export type ThreeMaterialLike = {
	dispose?(): void;
	readonly isMaterial?: boolean;
	readonly map?: ThreeTextureLike | null;
	readonly alphaMap?: ThreeTextureLike | null;
	readonly aoMap?: ThreeTextureLike | null;
	readonly bumpMap?: ThreeTextureLike | null;
	readonly displacementMap?: ThreeTextureLike | null;
	readonly emissiveMap?: ThreeTextureLike | null;
	envMap?: ThreeTextureLike | null | undefined;
	needsUpdate?: boolean;
	uniforms?: Record<string, unknown>;
	readonly lightMap?: ThreeTextureLike | null;
	readonly metalnessMap?: ThreeTextureLike | null;
	readonly normalMap?: ThreeTextureLike | null;
	readonly roughnessMap?: ThreeTextureLike | null;
	readonly specularMap?: ThreeTextureLike | null;
};

export type ThreeShaderMaterialParameters = {
	readonly uniforms?: Record<string, { value: unknown }>;
	readonly vertexShader?: string;
	readonly fragmentShader?: string;
	readonly transparent?: boolean;
	readonly depthWrite?: boolean;
	readonly side?: unknown;
};

export type ThreeObject3DLike = {
	userData: Record<string, unknown>;
	visible: boolean;
	position: ThreeVectorLike;
	quaternion: ThreeQuaternionLike;
	scale: ThreeVectorLike;
	parent?: { remove(object: ThreeObject3DLike): void } | null;
	children?: readonly ThreeObject3DLike[];
	renderOrder?: number;
	add?(object: ThreeObject3DLike): void;
	remove?(object: ThreeObject3DLike): void;
	traverse?(callback: (object: ThreeObject3DLike) => void): void;
	updateMatrixWorld?(force?: boolean): void;
	updateWorldMatrix?(updateParents?: boolean, updateChildren?: boolean): void;
	clone?(recursive?: boolean): ThreeObject3DLike;
	geometry?: ThreeGeometryLike | null;
	material?: ThreeMaterialLike | readonly ThreeMaterialLike[] | null;
	skeleton?: ThreeDisposableLike | null;
};

type ThreeLightObjectLike = ThreeObject3DLike & {
	color?: {
		set(color: string | number): void;
	};
	castShadow?: boolean;
	intensity?: number;
	distance?: number;
	decay?: number;
	angle?: number;
	penumbra?: number;
	width?: number;
	height?: number;
	shadow?: {
		mapSize?: {
			set?(width: number, height: number): void;
			width?: number;
			height?: number;
		};
		bias?: number;
		normalBias?: number;
		radius?: number;
		camera?: {
			near?: number;
			far?: number;
			updateProjectionMatrix?(): void;
		};
	};
};

export type ThreeSceneLike = ThreeObject3DLike & {
	background?: ThreeTextureLike | null;
	backgroundIntensity?: number;
	backgroundBlurriness?: number;
	environment?: ThreeTextureLike | null;
	environmentIntensity?: number;
	add(object: ThreeObject3DLike): void;
	remove(object: ThreeObject3DLike): void;
};

export type ThreeCameraLike = ThreeObject3DLike & {
	aspect?: number;
	fov?: number;
	near?: number;
	far?: number;
	lookAt?(x: number, y: number, z: number): void;
	updateProjectionMatrix?(): void;
};

export type ThreeRendererLike = ThreeDisposableLike & {
	render(scene: ThreeSceneLike, camera: ThreeCameraLike): void;
	setClearColor?(color: string | number, alpha?: number): void;
	setPixelRatio?(pixelRatio: number): void;
	setSize?(width: number, height: number, updateStyle?: boolean): void;
	shadowMap?: {
		enabled?: boolean;
		type?: unknown;
	};
	toneMappingExposure?: number;
};

export type ThreeRaycasterIntersectionLike = {
	readonly distance?: number;
	readonly object?: ThreeObject3DLike;
	readonly point?: {
		readonly x: number;
		readonly y: number;
		readonly z: number;
	};
	readonly face?: {
		readonly normal?: {
			readonly x: number;
			readonly y: number;
			readonly z: number;
		};
	};
};

export type ThreeRaycasterLike = {
	setFromCamera(point: ThreeVector2Like, camera: ThreeCameraLike): void;
	intersectObjects(
		objects: readonly ThreeObject3DLike[],
		recursive?: boolean,
	): ThreeRaycasterIntersectionLike[];
};

export type ThreeMeshStandardMaterialParameters = {
	color?: string | number;
	emissive?: string | number;
	emissiveIntensity?: number;
	metalness?: number;
	roughness?: number;
	opacity?: number;
	transparent?: boolean;
};

export type ThreeRuntime = {
	readonly Scene: new () => ThreeSceneLike;
	readonly PerspectiveCamera: new (
		fieldOfView: number,
		aspect: number,
		near: number,
		far: number,
	) => ThreeCameraLike;
	readonly WebGLRenderer: new (options?: {
		readonly canvas?: unknown;
		readonly antialias?: boolean;
		readonly alpha?: boolean;
	}) => ThreeRendererLike;
	readonly BoxGeometry: new (
		width: number,
		height: number,
		depth: number,
	) => ThreeGeometryLike;
	readonly PlaneGeometry?: new (
		width: number,
		height: number,
		widthSegments?: number,
		heightSegments?: number,
	) => ThreePlaneGeometryLike;
	readonly CylinderGeometry?: new (
		radiusTop: number,
		radiusBottom: number,
		height: number,
		radialSegments?: number,
	) => ThreeGeometryLike;
	readonly TorusGeometry?: new (
		radius: number,
		tube: number,
		radialSegments?: number,
		tubularSegments?: number,
	) => ThreeGeometryLike;
	readonly IcosahedronGeometry?: new (
		radius: number,
		detail?: number,
	) => ThreeGeometryLike;
	readonly DodecahedronGeometry?: new (
		radius: number,
		detail?: number,
	) => ThreeGeometryLike;
	readonly MeshStandardMaterial: new (
		parameters?: ThreeMeshStandardMaterialParameters,
	) => ThreeMaterialLike;
	readonly ShaderMaterial?: new (
		parameters?: ThreeShaderMaterialParameters,
	) => ThreeMaterialLike;
	readonly Color?: new (color: string | number) => unknown;
	readonly Vector2?: new (x: number, y: number) => ThreeVector2Like;
	readonly Vector3?: new (x: number, y: number, z: number) => ThreeVector3Like;
	readonly Box3?: new () => ThreeBox3Like;
	readonly Raycaster?: new () => ThreeRaycasterLike;
	readonly AmbientLight?: new (
		color: string | number,
		intensity: number,
	) => ThreeObject3DLike;
	readonly DirectionalLight?: new (
		color: string | number,
		intensity: number,
	) => ThreeObject3DLike;
	readonly PointLight?: new (
		color: string | number,
		intensity: number,
		distance?: number,
		decay?: number,
	) => ThreeObject3DLike;
	readonly SpotLight?: new (
		color: string | number,
		intensity: number,
		distance?: number,
		angle?: number,
		penumbra?: number,
		decay?: number,
	) => ThreeObject3DLike;
	readonly RectAreaLight?: new (
		color: string | number,
		intensity: number,
		width?: number,
		height?: number,
	) => ThreeObject3DLike;
	readonly CubeTextureLoader?: new () => ThreeCubeTextureLoaderLike;
	readonly TextureLoader?: new () => ThreeTextureLoaderLike;
	readonly VideoTexture?: ThreeVideoTextureConstructor;
	readonly PMREMGenerator?: new (
		renderer: ThreeRendererLike,
	) => ThreePmremGeneratorLike;
	readonly WebGLCubeRenderTarget?: new (
		resolution: number,
	) => ThreeWebGLCubeRenderTargetLike;
	readonly CubeCamera?: new (
		near: number,
		far: number,
		renderTarget: ThreeWebGLCubeRenderTargetLike,
	) => ThreeCubeCameraLike;
	readonly Sky?: new () => ThreeObject3DLike;
	readonly DoubleSide?: unknown;
	readonly EquirectangularReflectionMapping?: unknown;
	readonly SRGBColorSpace?: unknown;
	readonly LinearSRGBColorSpace?: unknown;
	readonly sRGBEncoding?: unknown;
	readonly LinearEncoding?: unknown;
	readonly Mesh: new (
		geometry: ThreeGeometryLike,
		material: ThreeMaterialLike,
	) => ThreeObject3DLike;
};

export type ThreeGltfLike = {
	readonly scene: ThreeObject3DLike;
	readonly animations?: readonly unknown[];
};

export type ThreeGltfLoaderLike = {
	loadAsync(url: string): Promise<ThreeGltfLike>;
};

export type ThreeObjectCloner = (
	object: ThreeObject3DLike,
) => ThreeObject3DLike;

export type ThreeBuiltinMeshAsset = {
	readonly kind: "three:builtin-mesh";
	readonly entry: AssetManifestEntry;
	createGeometry(): ThreeGeometryLike;
};

export type ThreeMaterialFactoryAsset = {
	readonly kind: "three:material-factory";
	readonly entry: AssetManifestEntry;
	createMaterial(): ThreeMaterialLike;
};

export type ThreeGltfAsset = {
	readonly kind: "three:gltf";
	readonly entry: AssetManifestEntry;
	readonly scene: ThreeObject3DLike;
	readonly animations: readonly unknown[];
	clone(): ThreeObject3DLike;
};

export type ThreeCubemapAsset = {
	readonly kind: "three:cubemap";
	readonly entry: AssetManifestEntry;
	readonly texture: ThreeTextureLike;
};

export type ThreeTextureAsset = {
	readonly kind: "three:texture";
	readonly entry: AssetManifestEntry;
	readonly texture: ThreeTextureLike;
};

export type ThreeVideoAsset = {
	readonly kind: "three:video";
	readonly entry: AssetManifestEntry;
	readonly texture: ThreeTextureLike;
	readonly video: HTMLVideoElement;
	readonly ready: Promise<void>;
	play(): Promise<void>;
	pause(): void;
};

export type ThreeRenderableAsset =
	| ThreeBuiltinMeshAsset
	| ThreeMaterialFactoryAsset
	| ThreeGltfAsset
	| ThreeCubemapAsset
	| ThreeTextureAsset
	| ThreeVideoAsset;

export type ThreeAssetLoaderRegistrationTarget = {
	registerLoader(kind: AssetKind, loader: AssetLoader): void;
	registerDisposer(kind: AssetKind, disposer: AssetDisposer): void;
};

export type ThreeAssetLoaderOptions = {
	readonly three: ThreeRuntime;
	readonly createGltfLoader?: () =>
		| ThreeGltfLoaderLike
		| Promise<ThreeGltfLoaderLike>;
	readonly cloneObject?: ThreeObjectCloner;
	readonly createVideoElement?: () => HTMLVideoElement;
	readonly resolveUrl?: (entry: AssetManifestEntry) => string;
};

export type ThreeDynamicCaptureMode = "on-load" | "interval" | "manual";

export type ThreeDynamicEnvironmentCapture = {
	readonly enabled?: boolean;
	readonly mode?: ThreeDynamicCaptureMode;
	readonly resolution?: number;
	readonly intervalMs?: number;
	readonly intervalSeconds?: number;
	readonly near?: number;
	readonly far?: number;
};

export type ThreeSolidColorSceneEnvironment = {
	readonly kind: "solid-color";
	readonly color: string | number;
};

export type ThreeEquirectangularSceneEnvironment = {
	readonly kind: "equirectangular-environment";
	readonly assetId: string;
	readonly backgroundIntensity: number;
	readonly backgroundBlurriness?: number;
	readonly environmentIntensity?: number;
	readonly requiredForReadiness?: boolean;
};

export type ThreeVideoSkyboxSceneEnvironment = {
	readonly kind: "video-skybox";
	readonly assetId: string;
	readonly mapping: "equirectangular-360";
	readonly backgroundIntensity: number;
	readonly backgroundBlurriness?: number;
	readonly environmentIntensity?: number;
	readonly dynamicCapture?: ThreeDynamicEnvironmentCapture;
	readonly requiredForReadiness?: boolean;
	readonly autoplay?: boolean;
};

export type ThreeProceduralAtmosphereSceneEnvironment = {
	readonly kind: "procedural-atmosphere";
	readonly sunDirection: Vec3 | readonly [number, number, number];
	readonly turbidity?: number;
	readonly rayleigh?: number;
	readonly mieCoefficient?: number;
	readonly mieDirectionalG?: number;
	readonly exposure?: number;
	readonly backgroundIntensity?: number;
	readonly environmentIntensity?: number;
	readonly dynamicCapture?: ThreeDynamicEnvironmentCapture;
	readonly requiredForReadiness?: boolean;
};

export type ThreeSupportedSceneEnvironment =
	| SceneEnvironment
	| ThreeSolidColorSceneEnvironment
	| ThreeEquirectangularSceneEnvironment
	| ThreeVideoSkyboxSceneEnvironment
	| ThreeProceduralAtmosphereSceneEnvironment;

export type ThreeReflectionProbeComponent = ReflectionProbeComponent & {
	readonly updateIntervalMs?: number;
	readonly near?: number;
	readonly far?: number;
};

export type ThreeAssetResolverOptions = {
	readonly assets: Pick<AssetManagerPort, "get" | "has">;
	readonly three: ThreeRuntime;
	readonly fallbackColor?: string | number;
};

export type ThreeResolvedObject =
	| ThreeObject3DLike
	| {
			readonly object: ThreeObject3DLike;
			readonly disposeOnDetach?: boolean;
	  };

export type ThreeObjectResolver = (
	renderable: RenderableComponent,
) => ThreeResolvedObject | undefined;

export type ThreeRenderedSceneHitTestRequest = {
	readonly viewport: {
		readonly width: number;
		readonly height: number;
	};
	readonly screenPoint: {
		readonly x: number;
		readonly y: number;
	};
	readonly entityFilter?: ReadonlySet<Entity>;
};

export type ThreeRenderedSceneBoxSelectRequest = {
	readonly viewport: {
		readonly width: number;
		readonly height: number;
	};
	readonly rect: {
		readonly x: number;
		readonly y: number;
		readonly width: number;
		readonly height: number;
	};
	readonly entityFilter?: ReadonlySet<Entity>;
};

export type ThreeRenderedSceneHitTestResult =
	| {
			readonly status: "hit";
			readonly entity: Entity;
			readonly distance: number;
			readonly worldPosition: readonly [number, number, number];
			readonly worldNormal?: readonly [number, number, number];
	  }
	| {
			readonly status: "miss";
	  }
	| {
			readonly status: "unavailable";
			readonly reason: "rendered-hit-test-unavailable";
	  };

export type ThreeRenderedSceneBoxSelectResult =
	| {
			readonly status: "hit";
			readonly hits: readonly {
				readonly entity: Entity;
				readonly distance: number;
				readonly worldPosition: readonly [number, number, number];
			}[];
	  }
	| {
			readonly status: "miss";
	  }
	| {
			readonly status: "unavailable";
			readonly reason: "rendered-hit-test-unavailable";
	  };

export type ThreeRendererAdapterOptions = {
	readonly three: ThreeRuntime;
	readonly canvas?: unknown;
	readonly width?: number;
	readonly height?: number;
	readonly pixelRatio?: number;
	readonly clearColor?: string | number;
	readonly clearAlpha?: number;
	readonly antialias?: boolean;
	readonly alpha?: boolean;
	readonly fallbackColor?: string | number;
	readonly defaultLights?: boolean;
	readonly renderProfile?: RenderProfileData;
	readonly scene?: ThreeSceneLike;
	readonly camera?: ThreeCameraLike;
	readonly renderer?: ThreeRendererLike;
	readonly resolveObject?: ThreeObjectResolver;
};

export async function loadDefaultThreeRuntime(): Promise<ThreeRuntime> {
	return (await import("three")) as unknown as ThreeRuntime;
}

export function registerThreeAssetLoaders(
	target: ThreeAssetLoaderRegistrationTarget,
	options: ThreeAssetLoaderOptions,
): void {
	const meshLoader = createThreeMeshLoader(options);
	const materialLoader = createThreeMaterialLoader(options.three);
	const cubemapLoader = createThreeCubemapLoader(options);
	const textureLoader = createThreeTextureLoader(options);
	const videoLoader = createThreeVideoLoader(options);
	const disposer = createThreeAssetDisposer();

	target.registerLoader("mesh", meshLoader);
	target.registerLoader("material", materialLoader);
	target.registerLoader("cubemap", cubemapLoader);
	target.registerLoader("texture", textureLoader);
	target.registerLoader("video", videoLoader);
	target.registerDisposer("mesh", disposer);
	target.registerDisposer("material", disposer);
	target.registerDisposer("cubemap", disposer);
	target.registerDisposer("texture", disposer);
	target.registerDisposer("video", disposer);
}

export function createThreeAssetObjectResolver(
	options: ThreeAssetResolverOptions,
): ThreeObjectResolver {
	return (renderable) => {
		if (!options.assets.has(renderable.meshId)) {
			throw new Error(
				`Renderable mesh asset "${renderable.meshId}" is not registered.`,
			);
		}

		const meshAsset = options.assets.get(renderable.meshId);

		if (isThreeGltfAsset(meshAsset)) {
			return {
				object: meshAsset.clone(),
				disposeOnDetach: false,
			};
		}

		if (!isThreeBuiltinMeshAsset(meshAsset)) {
			throw new Error(
				`Renderable mesh asset "${renderable.meshId}" is not loaded as a Three renderable asset.`,
			);
		}

		if (renderable.materialId && !options.assets.has(renderable.materialId)) {
			throw new Error(
				`Renderable material asset "${renderable.materialId}" is not registered.`,
			);
		}

		const materialAsset = renderable.materialId
			? options.assets.get(renderable.materialId)
			: undefined;
		const material = isThreeMaterialFactoryAsset(materialAsset)
			? materialAsset.createMaterial()
			: createFallbackMaterial(options, renderable.materialId);

		return {
			object: new options.three.Mesh(meshAsset.createGeometry(), material),
			disposeOnDetach: true,
		};
	};
}

function createFallbackMaterial(
	options: ThreeAssetResolverOptions,
	materialId: string | undefined,
): ThreeMaterialLike {
	if (materialId !== undefined) {
		throw new Error(
			`Renderable material asset "${materialId}" is not loaded as a Three material asset.`,
		);
	}

	return new options.three.MeshStandardMaterial({
		color: options.fallbackColor ?? "#9ca3af",
	});
}

export function isThreeGltfAsset(asset: unknown): asset is ThreeGltfAsset {
	return (
		isRecord(asset) &&
		asset.kind === "three:gltf" &&
		isThreeObject3DLike(asset.scene) &&
		typeof asset.clone === "function"
	);
}

export function isThreeBuiltinMeshAsset(
	asset: unknown,
): asset is ThreeBuiltinMeshAsset {
	return (
		isRecord(asset) &&
		asset.kind === "three:builtin-mesh" &&
		typeof asset.createGeometry === "function"
	);
}

export function isThreeMaterialFactoryAsset(
	asset: unknown,
): asset is ThreeMaterialFactoryAsset {
	return (
		isRecord(asset) &&
		asset.kind === "three:material-factory" &&
		typeof asset.createMaterial === "function"
	);
}

export function isThreeCubemapAsset(
	asset: unknown,
): asset is ThreeCubemapAsset {
	return (
		isRecord(asset) &&
		asset.kind === "three:cubemap" &&
		isTextureLike(asset.texture)
	);
}

export function isThreeTextureAsset(
	asset: unknown,
): asset is ThreeTextureAsset {
	return (
		isRecord(asset) &&
		asset.kind === "three:texture" &&
		isTextureLike(asset.texture)
	);
}

export function isThreeVideoAsset(asset: unknown): asset is ThreeVideoAsset {
	return (
		isRecord(asset) &&
		asset.kind === "three:video" &&
		isTextureLike(asset.texture) &&
		isVideoElementLike(asset.video) &&
		typeof asset.play === "function" &&
		typeof asset.pause === "function"
	);
}

function isVideoElementLike(value: unknown): value is HTMLVideoElement {
	return (
		isRecord(value) &&
		typeof value.play === "function" &&
		typeof value.pause === "function" &&
		typeof value.addEventListener === "function" &&
		typeof value.removeEventListener === "function"
	);
}

type AttachedObject = {
	readonly object: ThreeObject3DLike;
	readonly disposeOnDetach: boolean;
};

type NormalizedDynamicCapture = {
	readonly mode: ThreeDynamicCaptureMode;
	readonly resolution: 64 | 128 | 256;
	readonly intervalMs: number;
	readonly near: number;
	readonly far: number;
};

type ActiveCubeCapture = {
	readonly camera: ThreeCubeCameraLike;
	readonly renderTarget: ThreeWebGLCubeRenderTargetLike;
	readonly config: NormalizedDynamicCapture;
	lastCaptureMs: number;
};

type AttachedReflectionProbe = {
	readonly component: ThreeReflectionProbeComponent;
	readonly transform: RenderTransform;
	readonly capture: ActiveCubeCapture;
};

export class ThreeRendererAdapter
	implements
		RendererPort,
		LightRendererPort,
		ReflectionProbeRendererPort,
		WaterSurfaceRendererPort,
		CameraPosePort,
		SceneEnvironmentRendererPort
{
	readonly scene: ThreeSceneLike;
	readonly camera: ThreeCameraLike;
	readonly renderer: ThreeRendererLike;

	readonly #three: ThreeRuntime;
	readonly #fallbackColor: string | number;
	#maxPixelRatio: number | undefined;
	readonly #resolveObject: ThreeObjectResolver | undefined;
	readonly #objects = new Map<Entity, AttachedObject>();
	readonly #lights = new Map<Entity, ThreeObject3DLike>();
	readonly #profileLights = new Set<ThreeObject3DLike>();
	#environmentObject: ThreeObject3DLike | undefined;
	#environmentCapture: ActiveCubeCapture | undefined;
	readonly #environmentDisposables = new Set<ThreeDisposableLike>();
	readonly #reflectionProbes = new Map<Entity, AttachedReflectionProbe>();
	readonly #waterSurfaces = new Set<Entity>();
	readonly #materialEnvMapOriginals = new WeakMap<
		ThreeMaterialLike,
		ThreeTextureLike | null | undefined
	>();

	constructor(options: ThreeRendererAdapterOptions) {
		const renderProfile = options.renderProfile;
		this.#three = options.three;
		this.#fallbackColor =
			options.fallbackColor ??
			renderProfile?.renderer.fallbackMaterialColor ??
			"#9ca3af";
		this.#maxPixelRatio = renderProfile?.renderer.maxPixelRatio;
		this.#resolveObject = options.resolveObject;
		this.scene = options.scene ?? new options.three.Scene();

		if (
			options.scene === undefined &&
			renderProfile === undefined &&
			options.defaultLights !== false
		) {
			addDefaultLighting(this.scene, options.three);
		}

		this.camera =
			options.camera ??
			new options.three.PerspectiveCamera(
				60,
				aspectFromSize(options.width, options.height),
				0.1,
				2000,
			);

		if (options.camera === undefined) {
			this.camera.position.set(0, 1.5, 6);
			this.camera.lookAt?.(0, 0, 0);
		}

		const rendererOptions = rendererOptionsFrom(options, renderProfile);
		this.renderer =
			options.renderer ?? new options.three.WebGLRenderer(rendererOptions);

		if (renderProfile !== undefined && options.scene === undefined) {
			this.applyRenderProfile(renderProfile);
		} else {
			const clearColor =
				options.clearColor ?? renderProfile?.renderer.clearColor;

			if (clearColor !== undefined) {
				this.renderer.setClearColor?.(
					clearColor,
					options.clearAlpha ?? renderProfile?.renderer.clearAlpha ?? 1,
				);
			}
		}

		const pixelRatio = this.#clampPixelRatio(options.pixelRatio);

		if (pixelRatio !== undefined) {
			this.renderer.setPixelRatio?.(pixelRatio);
		}

		if (options.width !== undefined && options.height !== undefined) {
			this.setSize(options.width, options.height);
		}
	}

	get objectCount(): number {
		return this.#objects.size;
	}

	applyRenderProfile(profile: RenderProfileData): void {
		this.#maxPixelRatio = profile.renderer.maxPixelRatio;
		this.renderer.setClearColor?.(
			profile.renderer.clearColor,
			profile.renderer.clearAlpha,
		);

		for (const light of this.#profileLights) {
			this.scene.remove(light);
			light.parent?.remove(light);
		}

		this.#profileLights.clear();

		for (const light of createRenderProfileLights(this.#three, profile)) {
			this.scene.add(light);
			this.#profileLights.add(light);
		}
	}

	async applySceneEnvironment(
		environment: SceneEnvironment | null,
		assets?: SceneEnvironmentAssetResolver,
	): Promise<void> {
		if (environment === null) {
			this.clearSceneEnvironment();
			return;
		}

		this.clearSceneEnvironment();

		const supportedEnvironment =
			environment as unknown as ThreeSupportedSceneEnvironment;

		switch (supportedEnvironment.kind) {
			case "solid-color":
				this.#projectSolidColorEnvironment(supportedEnvironment);
				return;
			case "cubemap-skybox": {
				const cubemapAsset = resolveCubemapEnvironmentAsset(
					supportedEnvironment,
					assets,
				);
				this.#projectCubemapEnvironment(
					supportedEnvironment,
					cubemapAsset.texture,
				);
				return;
			}
			case "equirectangular-environment": {
				const textureAsset = resolveEquirectangularEnvironmentAsset(
					supportedEnvironment,
					assets,
				);
				this.#projectEquirectangularEnvironment(
					supportedEnvironment,
					textureAsset.texture,
				);
				return;
			}
			case "video-skybox": {
				if (!isThreeVideoSkyboxSceneEnvironment(supportedEnvironment)) {
					throw new Error(
						`Video skybox "${supportedEnvironment.assetId}" uses mapping "${supportedEnvironment.mapping}", but the Three renderer adapter currently supports only equirectangular video skies.`,
					);
				}

				const videoAsset = resolveVideoEnvironmentAsset(
					supportedEnvironment,
					assets,
				);
				await this.#projectVideoSkyboxEnvironment(
					supportedEnvironment,
					videoAsset,
				);
				return;
			}
			case "procedural-atmosphere":
				await this.#projectProceduralAtmosphereEnvironment(
					supportedEnvironment,
				);
				return;
			default:
				throw new Error(
					`Scene environment kind "${String(
						(supportedEnvironment as { readonly kind?: unknown }).kind,
					)}" is not supported by the Three renderer adapter.`,
				);
		}
	}

	clearSceneEnvironment(): void {
		this.#disposeEnvironmentCapture();
		this.#disposeEnvironmentObject();
		this.#disposeEnvironmentDisposables();

		this.scene.background = null;
		this.scene.environment = null;

		if (this.scene.backgroundBlurriness !== undefined) {
			this.scene.backgroundBlurriness = 0;
		}

		if (this.scene.backgroundIntensity !== undefined) {
			this.scene.backgroundIntensity = 1;
		}

		if (this.scene.environmentIntensity !== undefined) {
			this.scene.environmentIntensity = 1;
		}
	}

	attachReflectionProbe(
		entity: Entity,
		probe: ThreeReflectionProbeComponent,
		transform: RenderTransform,
	): void {
		if (this.#reflectionProbes.has(entity)) {
			this.detachReflectionProbe(entity);
		}

		const config = dynamicCaptureConfigFromProbe(probe);
		const capture = this.#createCubeCapture(
			`Reflection probe "${entity}"`,
			config,
			transform,
		);

		this.#reflectionProbes.set(entity, {
			component: probe,
			transform,
			capture,
		});

		if (probe.mode !== "manual") {
			this.#updateCubeCapture(capture);
		}

		this.#applyReflectionProbesToObjects();
	}

	updateReflectionProbe(
		entity: Entity,
		probe: ThreeReflectionProbeComponent,
		transform: RenderTransform,
	): void {
		const attached = this.#reflectionProbes.get(entity);

		if (
			!attached ||
			reflectionProbeCaptureKey(attached.component) !==
				reflectionProbeCaptureKey(probe)
		) {
			this.attachReflectionProbe(entity, probe, transform);
			return;
		}

		applyTransform(attached.capture.camera, transform);
		this.#reflectionProbes.set(entity, {
			component: probe,
			transform,
			capture: attached.capture,
		});

		if (probe.mode === "static") {
			this.#updateCubeCapture(attached.capture);
		}

		this.#applyReflectionProbesToObjects();
	}

	detachReflectionProbe(entity: Entity): void {
		const attached = this.#reflectionProbes.get(entity);

		if (!attached) {
			return;
		}

		this.#disposeCubeCapture(attached.capture);
		this.#reflectionProbes.delete(entity);
		this.#applyReflectionProbesToObjects();
	}

	refreshReflectionProbe(entity: Entity): void {
		const attached = this.#reflectionProbes.get(entity);

		if (!attached) {
			throw new Error(`Reflection probe "${entity}" is not attached.`);
		}

		this.#updateCubeCapture(attached.capture);
		this.#applyReflectionProbesToObjects();
	}

	refreshSceneEnvironmentCapture(): void {
		if (!this.#environmentCapture) {
			throw new Error("No dynamic scene environment capture is active.");
		}

		this.#updateCubeCapture(this.#environmentCapture);
	}

	attachLight(
		entity: Entity,
		light: LightComponent,
		transform: RenderTransform,
	): void {
		if (this.#lights.has(entity)) {
			this.detachLight(entity);
		}

		const object = createLightObject(this.#three, light);

		sanitizeUserData(object, entity);
		applyTransform(object, transform);
		applyLightProperties(this.renderer, object, light);

		this.scene.add(object);
		this.#lights.set(entity, object);
	}

	updateLight(
		entity: Entity,
		light: LightComponent,
		transform: RenderTransform,
	): void {
		const object = this.#lights.get(entity);

		if (!object) {
			return;
		}

		applyTransform(object, transform);
		applyLightProperties(this.renderer, object, light);
	}

	detachLight(entity: Entity): void {
		const object = this.#lights.get(entity);

		if (!object) {
			return;
		}

		this.scene.remove(object);
		object.parent?.remove(object);
		this.#lights.delete(entity);
	}

	attach(
		entity: Entity,
		renderable: RenderableComponent,
		transform: RenderTransform,
	): void {
		if (this.#objects.has(entity)) {
			this.detach(entity);
		}

		const attached = this.#createObject(renderable);

		sanitizeUserData(attached.object, entity);
		applyTransform(attached.object, transform);
		attached.object.visible = renderable.visible !== false;

		this.scene.add(attached.object);
		this.#objects.set(entity, attached);
		this.#applyReflectionProbesToObject(attached.object);
	}

	updateTransform(entity: Entity, transform: RenderTransform): void {
		const attached = this.#objects.get(entity);

		if (!attached) {
			return;
		}

		applyTransform(attached.object, transform);
	}

	updateWaterSurface(
		entity: Entity,
		water: WaterSurfaceRendererState,
		transform: RenderTransform,
		elapsedSeconds: number,
	): void {
		const attached = this.#objects.get(entity);

		if (!attached) {
			return;
		}

		applyTransform(attached.object, transform);
		attached.object.visible = water.visible;
		setObjectRenderOrder(attached.object, water.renderOrder);
		updateWaterMaterialState(
			attached.object,
			water,
			elapsedSeconds,
			this.scene.environment,
		);
		this.#waterSurfaces.add(entity);
	}

	detachWaterSurface(entity: Entity): void {
		this.#waterSurfaces.delete(entity);
	}

	detach(entity: Entity): void {
		const attached = this.#objects.get(entity);

		if (!attached) {
			return;
		}

		this.scene.remove(attached.object);
		attached.object.parent?.remove(attached.object);
		this.#restoreObjectProbeMaterials(attached.object);

		if (attached.disposeOnDetach) {
			disposeObject3D(attached.object);
		}

		this.#objects.delete(entity);
		this.#waterSurfaces.delete(entity);
	}

	render(interpolation: number): void {
		void interpolation;
		this.#updateDynamicCaptures();
		this.renderer.render(this.scene, this.camera);
	}

	setCameraPose(pose: CameraPose): void {
		this.camera.position.set(pose.position.x, pose.position.y, pose.position.z);
		this.camera.quaternion.set(
			pose.rotation.x,
			pose.rotation.y,
			pose.rotation.z,
			pose.rotation.w,
		);

		let projectionChanged = false;

		if (this.camera.fov !== undefined && this.camera.fov !== pose.fovDegrees) {
			this.camera.fov = pose.fovDegrees;
			projectionChanged = true;
		}

		if (this.camera.near !== undefined && this.camera.near !== pose.near) {
			this.camera.near = pose.near;
			projectionChanged = true;
		}

		if (this.camera.far !== undefined && this.camera.far !== pose.far) {
			this.camera.far = pose.far;
			projectionChanged = true;
		}

		if (projectionChanged) {
			this.camera.updateProjectionMatrix?.();
		}
	}

	dispose(): void {
		for (const entity of [...this.#objects.keys()]) {
			this.detach(entity);
		}

		for (const entity of [...this.#lights.keys()]) {
			this.detachLight(entity);
		}

		for (const entity of [...this.#reflectionProbes.keys()]) {
			this.detachReflectionProbe(entity);
		}

		this.clearSceneEnvironment();
		this.renderer.dispose();
	}

	getObject(entity: Entity): ThreeObject3DLike | undefined {
		return this.#objects.get(entity)?.object;
	}

	hasObject(entity: Entity): boolean {
		return this.#objects.has(entity);
	}

	hitTestRenderedScene(
		request: ThreeRenderedSceneHitTestRequest,
	): ThreeRenderedSceneHitTestResult {
		if (
			this.#three.Raycaster === undefined ||
			this.#three.Vector2 === undefined ||
			request.viewport.width <= 0 ||
			request.viewport.height <= 0
		) {
			return {
				status: "unavailable",
				reason: "rendered-hit-test-unavailable",
			};
		}

		const candidates: ThreeObject3DLike[] = [];

		for (const [entity, attached] of this.#objects) {
			if (
				request.entityFilter !== undefined &&
				!request.entityFilter.has(entity)
			) {
				continue;
			}

			if (attached.object.visible === false) {
				continue;
			}

			candidates.push(attached.object);
		}

		if (candidates.length === 0) {
			return { status: "miss" };
		}

		const raycaster = new this.#three.Raycaster();
		const normalizedPoint = new this.#three.Vector2(
			(request.screenPoint.x / request.viewport.width) * 2 - 1,
			-(request.screenPoint.y / request.viewport.height) * 2 + 1,
		);

		raycaster.setFromCamera(normalizedPoint, this.camera);

		for (const intersection of raycaster.intersectObjects(candidates, true)) {
			const hitObject = intersection.object;

			if (!hitObject) {
				continue;
			}

			const entity = entityFromObjectUserData(hitObject);

			if (entity === undefined) {
				continue;
			}

			if (
				request.entityFilter !== undefined &&
				!request.entityFilter.has(entity)
			) {
				continue;
			}

			const point = intersection.point;

			if (!isFiniteVector3Like(point)) {
				continue;
			}

			const normal = intersection.face?.normal;

			return {
				status: "hit",
				entity,
				distance:
					typeof intersection.distance === "number" &&
					Number.isFinite(intersection.distance)
						? intersection.distance
						: 0,
				worldPosition: [point.x, point.y, point.z],
				...(isFiniteVector3Like(normal)
					? { worldNormal: [normal.x, normal.y, normal.z] as const }
					: {}),
			};
		}

		return { status: "miss" };
	}

	boxSelectRenderedScene(
		request: ThreeRenderedSceneBoxSelectRequest,
	): ThreeRenderedSceneBoxSelectResult {
		if (
			this.#three.Vector3 === undefined ||
			this.#three.Box3 === undefined ||
			request.viewport.width <= 0 ||
			request.viewport.height <= 0 ||
			request.rect.width <= 0 ||
			request.rect.height <= 0
		) {
			return {
				status: "unavailable",
				reason: "rendered-hit-test-unavailable",
			};
		}

		const minX = request.rect.x;
		const minY = request.rect.y;
		const maxX = request.rect.x + request.rect.width;
		const maxY = request.rect.y + request.rect.height;
		const Vector3 = this.#three.Vector3;
		const Box3 = this.#three.Box3;
		const hits: {
			readonly entity: Entity;
			readonly distance: number;
			readonly worldPosition: readonly [number, number, number];
		}[] = [];

		for (const [entity, attached] of this.#objects) {
			if (
				request.entityFilter !== undefined &&
				!request.entityFilter.has(entity)
			) {
				continue;
			}

			if (attached.object.visible === false) {
				continue;
			}

			attached.object.updateWorldMatrix?.(true, true);
			attached.object.updateMatrixWorld?.(true);

			const bounds = new Box3();
			bounds.setFromObject?.(attached.object);

			if (!isFiniteBox3Like(bounds)) {
				continue;
			}

			const projectedBounds = projectWorldBoundsToViewport(
				Vector3,
				this.camera,
				request.viewport,
				bounds,
			);

			if (
				projectedBounds === undefined ||
				projectedBounds.maxX < minX ||
				projectedBounds.minX > maxX ||
				projectedBounds.maxY < minY ||
				projectedBounds.minY > maxY
			) {
				continue;
			}

			const center = centerOfBox(bounds);

			hits.push({
				entity,
				distance: distanceBetweenVectors(center, this.camera.position),
				worldPosition: [center.x, center.y, center.z],
			});
		}

		if (hits.length === 0) {
			return { status: "miss" };
		}

		return {
			status: "hit",
			hits: hits.sort(
				(left, right) =>
					left.distance - right.distance || left.entity - right.entity,
			),
		};
	}

	setSize(width: number, height: number, pixelRatio?: number): void {
		const effectivePixelRatio = this.#clampPixelRatio(pixelRatio);

		if (effectivePixelRatio !== undefined) {
			this.renderer.setPixelRatio?.(effectivePixelRatio);
		}

		if (height > 0 && this.camera.aspect !== undefined) {
			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix?.();
		}

		this.renderer.setSize?.(width, height, false);
	}

	#clampPixelRatio(pixelRatio: number | undefined): number | undefined {
		if (pixelRatio === undefined) {
			return undefined;
		}

		return this.#maxPixelRatio === undefined
			? pixelRatio
			: Math.min(pixelRatio, this.#maxPixelRatio);
	}

	#createObject(renderable: RenderableComponent): AttachedObject {
		const resolved = this.#resolveObject?.(renderable);

		if (resolved !== undefined) {
			return normalizeResolvedObject(resolved);
		}

		const geometry = new this.#three.BoxGeometry(1, 1, 1);
		const material = new this.#three.MeshStandardMaterial({
			color: this.#fallbackColor,
		});
		const object = new this.#three.Mesh(geometry, material);

		return {
			object,
			disposeOnDetach: true,
		};
	}

	#projectCubemapEnvironment(
		environment: Extract<SceneEnvironment, { readonly kind: "cubemap-skybox" }>,
		texture: ThreeTextureLike,
	): void {
		const environmentIntensity = environment.environmentIntensity ?? 0;
		const backgroundBlurriness = environment.backgroundBlurriness ?? 0;

		this.scene.background =
			environment.backgroundIntensity > 0 ? texture : null;
		this.scene.environment = environmentIntensity > 0 ? texture : null;

		if (this.scene.backgroundIntensity !== undefined) {
			this.scene.backgroundIntensity = environment.backgroundIntensity;
		}

		if (this.scene.backgroundBlurriness !== undefined) {
			this.scene.backgroundBlurriness = backgroundBlurriness;
		}

		if (this.scene.environmentIntensity !== undefined) {
			this.scene.environmentIntensity = environmentIntensity;
		}
	}

	#projectSolidColorEnvironment(
		environment: ThreeSolidColorSceneEnvironment,
	): void {
		this.scene.background = null;
		this.scene.environment = null;
		this.renderer.setClearColor?.(environment.color, 1);
	}

	#projectEquirectangularEnvironment(
		environment: ThreeEquirectangularSceneEnvironment,
		texture: ThreeTextureLike,
	): void {
		const environmentIntensity = environment.environmentIntensity ?? 0;

		setEquirectangularTextureMapping(
			this.#three,
			texture,
			`Scene environment "${environment.assetId}"`,
		);

		this.scene.background =
			environment.backgroundIntensity > 0 ? texture : null;

		if (environmentIntensity > 0) {
			this.scene.environment = this.#createPmremEnvironmentTexture(
				texture,
				`Scene environment "${environment.assetId}"`,
			);
		} else {
			this.scene.environment = null;
		}

		if (this.scene.backgroundIntensity !== undefined) {
			this.scene.backgroundIntensity = environment.backgroundIntensity;
		}

		if (this.scene.backgroundBlurriness !== undefined) {
			this.scene.backgroundBlurriness = environment.backgroundBlurriness ?? 0;
		}

		if (this.scene.environmentIntensity !== undefined) {
			this.scene.environmentIntensity = environmentIntensity;
		}
	}

	async #projectVideoSkyboxEnvironment(
		environment: ThreeVideoSkyboxSceneEnvironment,
		asset: ThreeVideoAsset,
	): Promise<void> {
		if (environment.mapping !== "equirectangular-360") {
			throw new Error(
				`Video skybox "${environment.assetId}" uses mapping "${environment.mapping}", but the Three adapter currently supports only equirectangular-360 video skies.`,
			);
		}

		setEquirectangularTextureMapping(
			this.#three,
			asset.texture,
			`Video skybox "${environment.assetId}"`,
		);
		setTextureColorSpace(asset.texture, "srgb", this.#three);

		await asset.ready;

		if (environment.autoplay !== false) {
			await asset.play();
		}

		this.scene.background =
			environment.backgroundIntensity > 0 ? asset.texture : null;
		this.#applyOptionalDynamicEnvironmentCapture(
			environment.dynamicCapture,
			environment.environmentIntensity ?? 0,
			`Video skybox "${environment.assetId}"`,
		);

		if (this.scene.backgroundIntensity !== undefined) {
			this.scene.backgroundIntensity = environment.backgroundIntensity;
		}
	}

	async #projectProceduralAtmosphereEnvironment(
		environment: ThreeProceduralAtmosphereSceneEnvironment,
	): Promise<void> {
		const sky = await createProceduralSkyObject(this.#three, environment);
		this.#environmentObject = sky;
		this.scene.add(sky);
		sky.visible = (environment.backgroundIntensity ?? 1) > 0;

		if (this.renderer.toneMappingExposure !== undefined) {
			this.renderer.toneMappingExposure = environment.exposure ?? 1;
		}

		this.#applyOptionalDynamicEnvironmentCapture(
			environment.dynamicCapture,
			environment.environmentIntensity ?? 0,
			"Procedural atmosphere",
		);
	}

	#applyOptionalDynamicEnvironmentCapture(
		capture: ThreeDynamicEnvironmentCapture | undefined,
		environmentIntensity: number,
		label: string,
	): void {
		if (environmentIntensity <= 0) {
			this.scene.environment = null;
			return;
		}

		if (!capture || capture.enabled === false) {
			throw new Error(
				`${label} requires explicit dynamicCapture settings when it contributes environment lighting.`,
			);
		}

		const config = normalizeDynamicCapture(capture, label);
		this.#environmentCapture = this.#createCubeCapture(label, config);
		this.#updateCubeCapture(this.#environmentCapture);
		this.scene.environment = this.#environmentCapture.renderTarget.texture;

		if (this.scene.environmentIntensity !== undefined) {
			this.scene.environmentIntensity = environmentIntensity;
		}
	}

	#createPmremEnvironmentTexture(
		texture: ThreeTextureLike,
		label: string,
	): ThreeTextureLike {
		if (!this.#three.PMREMGenerator) {
			throw new Error(`${label} requires Three.PMREMGenerator.`);
		}

		const pmrem = new this.#three.PMREMGenerator(this.renderer);
		pmrem.compileEquirectangularShader?.();
		const target = pmrem.fromEquirectangular(texture);
		pmrem.dispose();
		this.#environmentDisposables.add(target);
		return target.texture;
	}

	#createCubeCapture(
		label: string,
		config: NormalizedDynamicCapture,
		transform?: RenderTransform,
	): ActiveCubeCapture {
		if (!this.#three.WebGLCubeRenderTarget || !this.#three.CubeCamera) {
			throw new Error(
				`${label} requires Three.WebGLCubeRenderTarget and Three.CubeCamera.`,
			);
		}

		const renderTarget = new this.#three.WebGLCubeRenderTarget(
			config.resolution,
		);
		const camera = new this.#three.CubeCamera(
			config.near,
			config.far,
			renderTarget,
		);

		if (transform) {
			applyTransform(camera, transform);
		}

		this.scene.add(camera);
		return {
			camera,
			renderTarget,
			config,
			lastCaptureMs: 0,
		};
	}

	#updateCubeCapture(capture: ActiveCubeCapture): void {
		const previousEnvironment = this.scene.environment ?? null;
		const previousVisibility = capture.camera.visible;

		if (previousEnvironment === capture.renderTarget.texture) {
			this.scene.environment = null;
		}

		capture.camera.visible = false;
		capture.camera.update(this.renderer, this.scene);
		capture.camera.visible = previousVisibility;
		this.scene.environment = previousEnvironment;
		capture.lastCaptureMs = nowMs();
	}

	#updateDynamicCaptures(): void {
		const environmentCapture = this.#environmentCapture;

		if (environmentCapture && shouldUpdateCapture(environmentCapture)) {
			this.#updateCubeCapture(environmentCapture);
		}

		for (const probe of this.#reflectionProbes.values()) {
			if (
				probe.component.mode === "dynamic" &&
				shouldUpdateCapture(probe.capture)
			) {
				this.#updateCubeCapture(probe.capture);
				this.#applyReflectionProbesToObjects();
			}
		}
	}

	#disposeEnvironmentCapture(): void {
		if (!this.#environmentCapture) {
			return;
		}

		this.#disposeCubeCapture(this.#environmentCapture);
		this.#environmentCapture = undefined;
	}

	#disposeCubeCapture(capture: ActiveCubeCapture): void {
		this.scene.remove(capture.camera);
		capture.camera.parent?.remove(capture.camera);
		capture.renderTarget.dispose();
	}

	#disposeEnvironmentObject(): void {
		if (!this.#environmentObject) {
			return;
		}

		this.scene.remove(this.#environmentObject);
		this.#environmentObject.parent?.remove(this.#environmentObject);
		disposeObject3D(this.#environmentObject);
		this.#environmentObject = undefined;
	}

	#disposeEnvironmentDisposables(): void {
		for (const disposable of this.#environmentDisposables) {
			disposable.dispose();
		}

		this.#environmentDisposables.clear();
	}

	#applyReflectionProbesToObjects(): void {
		for (const attached of this.#objects.values()) {
			this.#applyReflectionProbesToObject(attached.object);
		}
	}

	#applyReflectionProbesToObject(object: ThreeObject3DLike): void {
		const probe = this.#selectReflectionProbeForObject(object);

		if (!probe) {
			this.#restoreObjectProbeMaterials(object);
			return;
		}

		traverseObject(object, (node) => {
			forEachMaterial(node.material, (material) => {
				if (!this.#materialEnvMapOriginals.has(material)) {
					this.#materialEnvMapOriginals.set(material, material.envMap);
				}

				material.envMap = probe.capture.renderTarget.texture;
				material.needsUpdate = true;
			});
		});
	}

	#restoreObjectProbeMaterials(object: ThreeObject3DLike): void {
		traverseObject(object, (node) => {
			forEachMaterial(node.material, (material) => {
				if (!this.#materialEnvMapOriginals.has(material)) {
					return;
				}

				const original = this.#materialEnvMapOriginals.get(material);

				if (original === undefined) {
					material.envMap = undefined;
				} else {
					material.envMap = original;
				}

				material.needsUpdate = true;
				this.#materialEnvMapOriginals.delete(material);
			});
		});
	}

	#selectReflectionProbeForObject(
		object: ThreeObject3DLike,
	): AttachedReflectionProbe | undefined {
		let selected: AttachedReflectionProbe | undefined;
		let selectedDistance = Number.POSITIVE_INFINITY;

		for (const probe of this.#reflectionProbes.values()) {
			const distance = distanceSquared(
				object.position,
				probe.transform.position,
			);

			if (!isObjectInsideProbe(object, probe)) {
				continue;
			}

			if (!selected) {
				selected = probe;
				selectedDistance = distance;
				continue;
			}

			const priority = probe.component.priority ?? 0;
			const selectedPriority = selected.component.priority ?? 0;

			if (priority > selectedPriority) {
				selected = probe;
				selectedDistance = distance;
				continue;
			}

			if (priority === selectedPriority && distance < selectedDistance) {
				selected = probe;
				selectedDistance = distance;
			}
		}

		return selected;
	}
}

function addDefaultLighting(scene: ThreeSceneLike, three: ThreeRuntime): void {
	if (three.AmbientLight) {
		scene.add(new three.AmbientLight("#d8f5e4", 0.85));
	}

	if (three.DirectionalLight) {
		const light = new three.DirectionalLight("#fff2d5", 2.1);
		light.position.set(3, 6, 4);
		scene.add(light);
	}
}

function createRenderProfileLights(
	three: ThreeRuntime,
	profile: RenderProfileData,
): readonly ThreeObject3DLike[] {
	return profile.lighting.lights.map((light) =>
		createRenderProfileLight(three, light, profile.id),
	);
}

function createRenderProfileLight(
	three: ThreeRuntime,
	light: RenderProfileLightData,
	profileId: string,
): ThreeObject3DLike {
	if (light.kind === "ambient") {
		if (!three.AmbientLight) {
			throw new Error(
				`Render profile "${profileId}" requires an ambient light, but the Three runtime does not provide AmbientLight.`,
			);
		}

		return new three.AmbientLight(light.color, light.intensity);
	}

	if (!three.DirectionalLight) {
		throw new Error(
			`Render profile "${profileId}" requires a directional light, but the Three runtime does not provide DirectionalLight.`,
		);
	}

	const directional = new three.DirectionalLight(light.color, light.intensity);
	directional.position.set(
		light.position[0],
		light.position[1],
		light.position[2],
	);
	return directional;
}

function createLightObject(
	three: ThreeRuntime,
	light: LightComponent,
): ThreeObject3DLike {
	switch (light.kind) {
		case "ambient": {
			if (!three.AmbientLight) {
				throw new Error(
					"Authored Light component requires Three.AmbientLight.",
				);
			}

			return new three.AmbientLight(light.color, light.intensity);
		}
		case "directional": {
			if (!three.DirectionalLight) {
				throw new Error(
					"Authored Light component requires Three.DirectionalLight.",
				);
			}

			return new three.DirectionalLight(light.color, light.intensity);
		}
		case "point": {
			if (!three.PointLight) {
				throw new Error("Authored Light component requires Three.PointLight.");
			}

			return new three.PointLight(
				light.color,
				light.intensity,
				light.distance,
				light.decay,
			);
		}
		case "spot": {
			if (!three.SpotLight) {
				throw new Error("Authored Light component requires Three.SpotLight.");
			}

			return new three.SpotLight(
				light.color,
				light.intensity,
				light.distance,
				light.angle,
				light.penumbra,
				light.decay,
			);
		}
		case "area": {
			if (!three.RectAreaLight) {
				throw new Error(
					"Authored area Light component requires Three.RectAreaLight.",
				);
			}

			return new three.RectAreaLight(
				light.color,
				light.intensity,
				light.width,
				light.height,
			);
		}
	}
}

function applyLightProperties(
	renderer: ThreeRendererLike,
	object: ThreeObject3DLike,
	light: LightComponent,
): void {
	const target = object as ThreeLightObjectLike;

	target.color?.set(light.color);
	target.intensity = light.intensity;
	target.visible = light.visible !== false;

	if (light.kind === "point" || light.kind === "spot") {
		target.distance = light.distance;
		target.decay = light.decay;
	}

	if (light.kind === "spot") {
		target.angle = light.angle;
		target.penumbra = light.penumbra;
	}

	if (light.kind === "area") {
		target.width = light.width;
		target.height = light.height;
	}

	if (light.kind === "ambient" || light.kind === "area") {
		return;
	}

	applyLightShadowProperties(renderer, target, light.shadow);
}

function applyLightShadowProperties(
	renderer: ThreeRendererLike,
	target: ThreeLightObjectLike,
	shadow: LightShadowSettings | undefined,
): void {
	target.castShadow = shadow?.enabled === true;

	if (shadow?.enabled !== true) {
		return;
	}

	if (renderer.shadowMap) {
		renderer.shadowMap.enabled = true;
	}

	if (!target.shadow) {
		return;
	}

	if (shadow.mapSize !== undefined) {
		if (target.shadow.mapSize?.set) {
			target.shadow.mapSize.set(shadow.mapSize, shadow.mapSize);
		} else if (target.shadow.mapSize) {
			target.shadow.mapSize.width = shadow.mapSize;
			target.shadow.mapSize.height = shadow.mapSize;
		}
	}

	if (shadow.bias !== undefined) {
		target.shadow.bias = shadow.bias;
	}

	if (shadow.normalBias !== undefined) {
		target.shadow.normalBias = shadow.normalBias;
	}

	if (shadow.radius !== undefined) {
		target.shadow.radius = shadow.radius;
	}

	if (target.shadow.camera) {
		if (shadow.cameraNear !== undefined) {
			target.shadow.camera.near = shadow.cameraNear;
		}

		if (shadow.cameraFar !== undefined) {
			target.shadow.camera.far = shadow.cameraFar;
		}

		target.shadow.camera.updateProjectionMatrix?.();
	}
}

function resolveCubemapEnvironmentAsset(
	environment: { readonly assetId: string },
	assets: SceneEnvironmentAssetResolver | undefined,
): ThreeCubemapAsset {
	if (!assets) {
		throw new Error(
			`Scene environment "${environment.assetId}" requires a loaded asset resolver.`,
		);
	}

	if (!assets.has(environment.assetId)) {
		throw new Error(
			`Scene environment cubemap asset "${environment.assetId}" is not registered.`,
		);
	}

	const asset = assets.get(environment.assetId);

	if (!isThreeCubemapAsset(asset)) {
		throw new Error(
			`Scene environment cubemap asset "${environment.assetId}" is not loaded as a Three cubemap asset.`,
		);
	}

	return asset;
}

function isThreeVideoSkyboxSceneEnvironment(
	environment: ThreeSupportedSceneEnvironment,
): environment is ThreeVideoSkyboxSceneEnvironment {
	return (
		environment.kind === "video-skybox" &&
		environment.mapping === "equirectangular-360"
	);
}

function resolveEquirectangularEnvironmentAsset(
	environment: ThreeEquirectangularSceneEnvironment,
	assets: SceneEnvironmentAssetResolver | undefined,
): ThreeTextureAsset {
	if (!assets) {
		throw new Error(
			`Scene environment "${environment.assetId}" requires a loaded asset resolver.`,
		);
	}

	if (!assets.has(environment.assetId)) {
		throw new Error(
			`Scene environment equirectangular asset "${environment.assetId}" is not registered.`,
		);
	}

	const asset = assets.get(environment.assetId);

	if (!isThreeTextureAsset(asset)) {
		throw new Error(
			`Scene environment equirectangular asset "${environment.assetId}" is not loaded as a Three texture asset.`,
		);
	}

	if (textureProjection(asset.entry) !== "equirectangular") {
		throw new Error(
			`Scene environment equirectangular asset "${environment.assetId}" must declare projection "equirectangular".`,
		);
	}

	return asset;
}

function resolveVideoEnvironmentAsset(
	environment: ThreeVideoSkyboxSceneEnvironment,
	assets: SceneEnvironmentAssetResolver | undefined,
): ThreeVideoAsset {
	if (!assets) {
		throw new Error(
			`Video skybox "${environment.assetId}" requires a loaded asset resolver.`,
		);
	}

	if (!assets.has(environment.assetId)) {
		throw new Error(
			`Video skybox asset "${environment.assetId}" is not registered.`,
		);
	}

	const asset = assets.get(environment.assetId);

	if (!isThreeVideoAsset(asset)) {
		throw new Error(
			`Video skybox asset "${environment.assetId}" is not loaded as a Three video asset.`,
		);
	}

	return asset;
}

function createThreeMeshLoader(options: ThreeAssetLoaderOptions): AssetLoader {
	let loaderPromise: Promise<ThreeGltfLoaderLike> | undefined;
	let clonerPromise: Promise<ThreeObjectCloner> | undefined;

	const getLoader = () => {
		loaderPromise ??= Promise.resolve(
			options.createGltfLoader?.() ?? createDefaultThreeGltfLoader(),
		);
		return loaderPromise;
	};
	const getCloner = () => {
		clonerPromise ??= Promise.resolve(
			options.cloneObject ?? createDefaultThreeObjectCloner(),
		);
		return clonerPromise;
	};

	return async (entry) => {
		if (isBuiltinUrl(entry.url)) {
			return createBuiltinMeshAsset(entry, options.three);
		}

		if (!isGltfUrl(entry.url)) {
			throw new Error(
				`Mesh asset "${entry.id}" must use builtin://, .glb, or .gltf URL.`,
			);
		}

		const [loader, cloneObject] = await Promise.all([getLoader(), getCloner()]);
		const gltf = await loader.loadAsync(
			options.resolveUrl?.(entry) ?? entry.url,
		);

		return {
			kind: "three:gltf",
			entry,
			scene: gltf.scene,
			animations: gltf.animations ?? [],
			clone() {
				return cloneObject(gltf.scene);
			},
		} satisfies ThreeGltfAsset;
	};
}

function createThreeMaterialLoader(three: ThreeRuntime): AssetLoader {
	return async (entry) => {
		if (!isBuiltinUrl(entry.url)) {
			throw new Error(
				`Material asset "${entry.id}" must use builtin:// until JSON material loading is added.`,
			);
		}

		return {
			kind: "three:material-factory",
			entry,
			createMaterial() {
				if (isWaterMaterialEntry(entry)) {
					return createWaterShaderMaterial(three, entry);
				}

				return new three.MeshStandardMaterial(
					meshStandardMaterialParametersFrom(entry),
				);
			},
		} satisfies ThreeMaterialFactoryAsset;
	};
}

function meshStandardMaterialParametersFrom(
	entry: AssetManifestEntry,
): ThreeMeshStandardMaterialParameters {
	const authored = entry.material;
	const parameters: ThreeMeshStandardMaterialParameters = {
		color: authored?.color ?? builtinMaterialColor(entry.url),
	};

	if (authored?.emissive !== undefined) {
		parameters.emissive = authored.emissive;
	}

	if (authored?.emissiveIntensity !== undefined) {
		parameters.emissiveIntensity = authored.emissiveIntensity;
	}

	if (authored?.metalness !== undefined) {
		parameters.metalness = authored.metalness;
	}

	if (authored?.roughness !== undefined) {
		parameters.roughness = authored.roughness;
	}

	if (authored?.opacity !== undefined) {
		parameters.opacity = authored.opacity;
	}

	if (authored?.transparent !== undefined) {
		parameters.transparent = authored.transparent;
	}

	return parameters;
}

function isWaterMaterialEntry(entry: AssetManifestEntry): boolean {
	return (
		builtinIdFromUrl(entry.url).startsWith("water-") ||
		(entry.tags ?? []).includes("water")
	);
}

function createWaterShaderMaterial(
	three: ThreeRuntime,
	entry: AssetManifestEntry,
): ThreeMaterialLike {
	const fallbackParameters = meshStandardMaterialParametersFrom(entry);

	if (!three.ShaderMaterial) {
		return new three.MeshStandardMaterial(fallbackParameters);
	}

	const color = fallbackParameters.color ?? "#052033";
	const emissive = fallbackParameters.emissive ?? "#01111c";
	const opacity = fallbackParameters.opacity ?? 0.88;

	return new three.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
			uBaseColor: { value: threeColorValue(three, color) },
			uDeepColor: { value: threeColorValue(three, emissive) },
			uWaveAmplitude: { value: 0 },
			uWaveLength: { value: 1 },
			uWaveSpeed: { value: 0 },
			uWaveDirection: { value: threeVector2Value(three, 1, 0) },
			uReflectionIntensity: { value: 0 },
			uRefractionIntensity: { value: 0 },
			uOpacity: { value: opacity },
		},
		vertexShader: WATER_VERTEX_SHADER,
		fragmentShader: WATER_FRAGMENT_SHADER,
		transparent: fallbackParameters.transparent ?? opacity < 1,
		depthWrite: false,
		side: three.DoubleSide,
	});
}

function threeColorValue(three: ThreeRuntime, color: string | number): unknown {
	return three.Color ? new three.Color(color) : color;
}

function threeVector2Value(three: ThreeRuntime, x: number, y: number): unknown {
	return three.Vector2 ? new three.Vector2(x, y) : [x, y];
}

const WATER_VERTEX_SHADER = `
uniform float uTime;
uniform float uWaveAmplitude;
uniform float uWaveLength;
uniform float uWaveSpeed;
uniform vec2 uWaveDirection;
varying vec2 vUv;
varying float vWave;

void main() {
	vec3 transformed = position;
	vec2 waveDirection = normalize(uWaveDirection);
	float wavelength = max(uWaveLength, 0.001);
	float primary = sin(dot(transformed.xz, waveDirection) / wavelength + uTime * uWaveSpeed);
	float secondary = sin((transformed.x - transformed.z) / (wavelength * 0.63) + uTime * uWaveSpeed * 0.73);
	vWave = primary * 0.65 + secondary * 0.35;
	transformed.y += vWave * uWaveAmplitude;
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

const WATER_FRAGMENT_SHADER = `
uniform vec3 uBaseColor;
uniform vec3 uDeepColor;
uniform float uReflectionIntensity;
uniform float uRefractionIntensity;
uniform float uOpacity;
varying vec2 vUv;
varying float vWave;

void main() {
	float shoreMix = smoothstep(0.0, 1.0, vUv.y);
	float shimmer = 0.5 + 0.5 * vWave;
	vec3 color = mix(uDeepColor, uBaseColor, 0.28 + shoreMix * 0.22);
	color += vec3(0.16, 0.22, 0.26) * shimmer * uReflectionIntensity;
	color += vec3(0.03, 0.08, 0.12) * uRefractionIntensity;
	gl_FragColor = vec4(color, uOpacity);
}
`;

function setObjectRenderOrder(
	object: ThreeObject3DLike,
	renderOrder: number | undefined,
): void {
	object.renderOrder = renderOrder ?? 0;
	object.traverse?.((node) => {
		node.renderOrder = renderOrder ?? 0;
	});
}

function updateWaterMaterialState(
	object: ThreeObject3DLike,
	water: WaterSurfaceRendererState,
	elapsedSeconds: number,
	environmentTexture: ThreeTextureLike | null | undefined,
): void {
	object.traverse?.((node) => {
		updateWaterMaterial(
			node.material,
			water,
			elapsedSeconds,
			environmentTexture,
		);
	});
	updateWaterMaterial(
		object.material,
		water,
		elapsedSeconds,
		environmentTexture,
	);
}

function updateWaterMaterial(
	material: ThreeMaterialLike | readonly ThreeMaterialLike[] | null | undefined,
	water: WaterSurfaceRendererState,
	elapsedSeconds: number,
	environmentTexture: ThreeTextureLike | null | undefined,
): void {
	forEachMaterial(material, (entry) => {
		setWaterUniform(entry, "uTime", elapsedSeconds);
		setWaterUniform(entry, "uWaveAmplitude", water.animation.waveAmplitude);
		setWaterUniform(entry, "uWaveLength", water.animation.waveLength);
		setWaterUniform(
			entry,
			"uWaveSpeed",
			water.animation.mode === "scrolling" ? water.animation.speed : 0,
		);
		setWaterVector2Uniform(entry, "uWaveDirection", water.animation.direction);
		setWaterUniform(entry, "uReflectionIntensity", water.reflection.intensity);
		setWaterUniform(
			entry,
			"uRefractionIntensity",
			water.refraction?.intensity ?? 0,
		);

		if (water.reflection.mode === "environment" && environmentTexture) {
			entry.envMap = environmentTexture;
		}

		entry.needsUpdate = true;
	});
}

function setWaterUniform(
	material: ThreeMaterialLike,
	name: string,
	value: unknown,
): void {
	const uniform = isRecord(material.uniforms)
		? material.uniforms[name]
		: undefined;

	if (isRecord(uniform)) {
		uniform.value = value;
	}
}

function setWaterVector2Uniform(
	material: ThreeMaterialLike,
	name: string,
	value: readonly [number, number],
): void {
	const uniform = isRecord(material.uniforms)
		? material.uniforms[name]
		: undefined;

	if (!isRecord(uniform)) {
		return;
	}

	const current = uniform.value;

	if (isRecord(current) && typeof current.set === "function") {
		current.set(value[0], value[1]);
		return;
	}

	uniform.value = [value[0], value[1]];
}

function createThreeCubemapLoader(
	options: ThreeAssetLoaderOptions,
): AssetLoader {
	return async (entry) => {
		if (!entry.faces) {
			throw new Error(`Cubemap asset "${entry.id}" must declare six faces.`);
		}

		if (!options.three.CubeTextureLoader) {
			throw new Error(
				`Cubemap asset "${entry.id}" requires Three.CubeTextureLoader.`,
			);
		}

		const loader = new options.three.CubeTextureLoader();
		const faces = entry.faces;
		const texture = await new Promise<ThreeTextureLike>((resolve, reject) => {
			loader.load(
				[
					resolveCubemapFaceUrl(entry.url, faces.px),
					resolveCubemapFaceUrl(entry.url, faces.nx),
					resolveCubemapFaceUrl(entry.url, faces.py),
					resolveCubemapFaceUrl(entry.url, faces.ny),
					resolveCubemapFaceUrl(entry.url, faces.pz),
					resolveCubemapFaceUrl(entry.url, faces.nz),
				],
				resolve,
				undefined,
				reject,
			);
		});

		return {
			kind: "three:cubemap",
			entry,
			texture,
		} satisfies ThreeCubemapAsset;
	};
}

function createThreeTextureLoader(
	options: ThreeAssetLoaderOptions,
): AssetLoader {
	return async (entry) => {
		if (!options.three.TextureLoader) {
			throw new Error(
				`Texture asset "${entry.id}" requires Three.TextureLoader.`,
			);
		}

		const loader = new options.three.TextureLoader();
		const texture = await new Promise<ThreeTextureLike>((resolve, reject) => {
			loader.load(
				options.resolveUrl?.(entry) ?? entry.url,
				resolve,
				undefined,
				reject,
			);
		});

		setTextureColorSpace(texture, entry.colorSpace, options.three);

		return {
			kind: "three:texture",
			entry,
			texture,
		} satisfies ThreeTextureAsset;
	};
}

function createThreeVideoLoader(options: ThreeAssetLoaderOptions): AssetLoader {
	return async (entry) => {
		if (!options.three.VideoTexture) {
			throw new Error(`Video asset "${entry.id}" requires Three.VideoTexture.`);
		}

		const video = createVideoElement(options, entry.id);
		configureVideoElement(
			video,
			entry,
			options.resolveUrl?.(entry) ?? entry.url,
		);
		const ready = waitForVideoReady(video, entry.id);
		const texture = new options.three.VideoTexture(video);
		setTextureColorSpace(texture, entry.colorSpace ?? "srgb", options.three);

		await ready;

		return {
			kind: "three:video",
			entry,
			texture,
			video,
			ready,
			async play() {
				try {
					await video.play();
				} catch (error) {
					throw new Error(
						`Video asset "${entry.id}" could not start playback: ${errorMessage(error)}`,
					);
				}
			},
			pause() {
				video.pause();
			},
		} satisfies ThreeVideoAsset;
	};
}

function createThreeAssetDisposer(): AssetDisposer {
	return (asset) => {
		if (isThreeGltfAsset(asset)) {
			disposeObject3D(asset.scene);
		}

		if (isThreeCubemapAsset(asset)) {
			disposeDisposable(asset.texture, new Set());
		}

		if (isThreeTextureAsset(asset)) {
			disposeDisposable(asset.texture, new Set());
		}

		if (isThreeVideoAsset(asset)) {
			asset.pause();
			asset.video.removeAttribute("src");
			asset.video.load();
			disposeDisposable(asset.texture, new Set());
		}
	};
}

async function createDefaultThreeGltfLoader(): Promise<ThreeGltfLoaderLike> {
	const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
	return new GLTFLoader() as ThreeGltfLoaderLike;
}

async function createDefaultThreeObjectCloner(): Promise<ThreeObjectCloner> {
	const { clone } = await import("three/addons/utils/SkeletonUtils.js");
	return (object) => clone(object as never) as ThreeObject3DLike;
}

async function createDefaultThreeSky(): Promise<new () => ThreeObject3DLike> {
	const module = (await import("three/addons/objects/Sky.js")) as {
		readonly Sky?: unknown;
	};

	if (typeof module.Sky !== "function") {
		throw new Error("Three Sky addon did not export a Sky constructor.");
	}

	return module.Sky as new () => ThreeObject3DLike;
}

function createBuiltinMeshAsset(
	entry: AssetManifestEntry,
	three: ThreeRuntime,
): ThreeBuiltinMeshAsset {
	const builtinId = builtinIdFromUrl(entry.url);

	return {
		kind: "three:builtin-mesh",
		entry,
		createGeometry() {
			switch (builtinId) {
				case "player":
					return new three.BoxGeometry(0.75, 1.25, 0.75);
				case "box":
				case "arena-floor":
					return new three.BoxGeometry(1, 1, 1);
				case "plane": {
					if (!three.PlaneGeometry) {
						throw new Error(
							'Builtin mesh "plane" requires Three.PlaneGeometry.',
						);
					}

					const geometry = new three.PlaneGeometry(
						builtinNumberParam(entry.url, "width", 1),
						builtinNumberParam(entry.url, "height", 1),
						builtinIntegerParam(entry.url, "widthSegments", 1),
						builtinIntegerParam(entry.url, "heightSegments", 1),
					);
					geometry.rotateX?.(-Math.PI / 2);
					return geometry;
				}
				case "cylinder":
					if (!three.CylinderGeometry) {
						throw new Error(
							'Builtin mesh "cylinder" requires Three.CylinderGeometry.',
						);
					}

					return new three.CylinderGeometry(
						builtinNumberParam(entry.url, "radiusTop", 0.5),
						builtinNumberParam(entry.url, "radiusBottom", 0.5),
						builtinNumberParam(entry.url, "height", 1),
						builtinIntegerParam(entry.url, "radialSegments", 18),
					);
				case "torus":
					if (!three.TorusGeometry) {
						throw new Error(
							'Builtin mesh "torus" requires Three.TorusGeometry.',
						);
					}

					return new three.TorusGeometry(
						builtinNumberParam(entry.url, "radius", 1),
						builtinNumberParam(entry.url, "tube", 0.25),
						builtinIntegerParam(entry.url, "radialSegments", 12),
						builtinIntegerParam(entry.url, "tubularSegments", 24),
					);
				case "icosahedron":
					if (!three.IcosahedronGeometry) {
						throw new Error(
							'Builtin mesh "icosahedron" requires Three.IcosahedronGeometry.',
						);
					}

					return new three.IcosahedronGeometry(
						builtinNumberParam(entry.url, "radius", 1),
						builtinNonNegativeIntegerParam(entry.url, "detail", 0),
					);
				case "dodecahedron":
					if (!three.DodecahedronGeometry) {
						throw new Error(
							'Builtin mesh "dodecahedron" requires Three.DodecahedronGeometry.',
						);
					}

					return new three.DodecahedronGeometry(
						builtinNumberParam(entry.url, "radius", 1),
						builtinNonNegativeIntegerParam(entry.url, "detail", 0),
					);
				case "ingredient":
					return new three.BoxGeometry(0.8, 0.8, 0.8);
				default:
					return new three.BoxGeometry(1, 1, 1);
			}
		},
	};
}

function builtinMaterialColor(url: string): string | number {
	switch (builtinIdFromUrl(url)) {
		case "player-blue":
			return "#4fa3ff";
		case "tile-green":
			return "#355e3b";
		case "ingredient-gold":
			return "#eab308";
		default:
			return "#9ca3af";
	}
}

function isBuiltinUrl(url: string): boolean {
	return url.startsWith("builtin://");
}

function builtinIdFromUrl(url: string): string {
	const source = url.slice("builtin://".length);
	const queryStart = source.indexOf("?");
	return queryStart === -1 ? source : source.slice(0, queryStart);
}

function builtinNumberParam(
	url: string,
	key: string,
	fallback: number,
): number {
	const params = builtinQueryParams(url);
	const raw = params.get(key);
	const value = raw === null ? Number.NaN : Number(raw);
	return Number.isFinite(value) && value > 0 ? value : fallback;
}

function builtinIntegerParam(
	url: string,
	key: string,
	fallback: number,
): number {
	return Math.max(3, Math.round(builtinNumberParam(url, key, fallback)));
}

function builtinNonNegativeIntegerParam(
	url: string,
	key: string,
	fallback: number,
): number {
	const params = builtinQueryParams(url);
	const raw = params.get(key);
	const value = raw === null ? Number.NaN : Number(raw);
	return Number.isFinite(value) && value >= 0
		? Math.round(value)
		: Math.max(0, Math.round(fallback));
}

function builtinQueryParams(url: string): URLSearchParams {
	const queryStart = url.indexOf("?");
	return new URLSearchParams(
		queryStart === -1 ? "" : url.slice(queryStart + 1),
	);
}

function isGltfUrl(url: string): boolean {
	return /\.(glb|gltf)(?:[?#].*)?$/i.test(url);
}

function resolveCubemapFaceUrl(baseUrl: string, faceUrl: string): string {
	if (/^(?:https?:)?\/\//.test(faceUrl) || faceUrl.startsWith("/")) {
		return faceUrl;
	}

	if (baseUrl.endsWith("/")) {
		return `${baseUrl}${faceUrl}`;
	}

	return `${baseUrl}/${faceUrl}`;
}

function textureProjection(entry: AssetManifestEntry): string | undefined {
	const value = (entry as unknown as { readonly projection?: unknown })
		.projection;
	return typeof value === "string" ? value : undefined;
}

function setEquirectangularTextureMapping(
	three: ThreeRuntime,
	texture: ThreeTextureLike,
	label: string,
): void {
	if (three.EquirectangularReflectionMapping === undefined) {
		throw new Error(
			`${label} requires Three.EquirectangularReflectionMapping.`,
		);
	}

	texture.mapping = three.EquirectangularReflectionMapping;
	texture.needsUpdate = true;
}

function setTextureColorSpace(
	texture: ThreeTextureLike,
	colorSpace: AssetManifestEntry["colorSpace"] | undefined,
	three: ThreeRuntime,
): void {
	if (colorSpace === undefined) {
		return;
	}

	if (colorSpace === "srgb") {
		if (three.SRGBColorSpace !== undefined) {
			texture.colorSpace = three.SRGBColorSpace;
			return;
		}

		if (three.sRGBEncoding !== undefined) {
			texture.encoding = three.sRGBEncoding;
			return;
		}

		throw new Error("sRGB texture color space requires Three.SRGBColorSpace.");
	}

	if (three.LinearSRGBColorSpace !== undefined) {
		texture.colorSpace = three.LinearSRGBColorSpace;
		return;
	}

	if (three.LinearEncoding !== undefined) {
		texture.encoding = three.LinearEncoding;
	}
}

function createVideoElement(
	options: ThreeAssetLoaderOptions,
	assetId: string,
): HTMLVideoElement {
	if (options.createVideoElement) {
		return options.createVideoElement();
	}

	throw new Error(
		`Video asset "${assetId}" requires createVideoElement in the Three asset loader options.`,
	);
}

function configureVideoElement(
	video: HTMLVideoElement,
	entry: AssetManifestEntry,
	url: string,
): void {
	video.src = url;
	video.crossOrigin = entry.video?.crossOrigin ?? "anonymous";
	video.loop = entry.video?.loop ?? true;
	video.muted = entry.video?.muted ?? true;
	video.playsInline = entry.video?.playsInline ?? true;
	video.preload = entry.video?.preload ?? "auto";
}

function waitForVideoReady(
	video: HTMLVideoElement,
	assetId: string,
): Promise<void> {
	if (video.readyState >= 2) {
		return Promise.resolve();
	}

	return new Promise((resolve, reject) => {
		const cleanup = () => {
			video.removeEventListener("loadeddata", onLoaded);
			video.removeEventListener("error", onError);
		};
		const onLoaded = () => {
			cleanup();
			resolve();
		};
		const onError = () => {
			cleanup();
			reject(new Error(`Video asset "${assetId}" failed to load.`));
		};

		video.addEventListener("loadeddata", onLoaded, { once: true });
		video.addEventListener("error", onError, { once: true });
		video.load();
	});
}

async function createProceduralSkyObject(
	three: ThreeRuntime,
	environment: ThreeProceduralAtmosphereSceneEnvironment,
): Promise<ThreeObject3DLike> {
	const Sky = three.Sky ?? (await createDefaultThreeSky());
	const sky = new Sky();
	sky.scale.set(450000, 450000, 450000);
	setSkyUniform(sky, "turbidity", environment.turbidity);
	setSkyUniform(sky, "rayleigh", environment.rayleigh ?? 2);
	setSkyUniform(sky, "mieCoefficient", environment.mieCoefficient ?? 0.005);
	setSkyUniform(sky, "mieDirectionalG", environment.mieDirectionalG ?? 0.8);
	setSkyUniform(sky, "sunPosition", vec3LikeFrom(environment.sunDirection));
	return sky;
}

function setSkyUniform(
	sky: ThreeObject3DLike,
	key: string,
	value: unknown,
): void {
	const material = sky.material;

	if (Array.isArray(material) || !isRecord(material)) {
		throw new Error(
			"Procedural atmosphere Sky object must expose material uniforms.",
		);
	}

	const uniforms = material.uniforms;

	if (!isRecord(uniforms) || !isRecord(uniforms[key])) {
		throw new Error(
			`Procedural atmosphere Sky object is missing "${key}" uniform.`,
		);
	}

	(uniforms[key] as { value: unknown }).value = value;
}

function normalizeDynamicCapture(
	capture: ThreeDynamicEnvironmentCapture,
	label: string,
): NormalizedDynamicCapture {
	const resolution = capture.resolution ?? 128;

	if (resolution !== 64 && resolution !== 128 && resolution !== 256) {
		throw new Error(
			`${label} dynamic capture resolution must be 64, 128, or 256.`,
		);
	}

	const mode = capture.mode ?? "on-load";

	if (mode !== "on-load" && mode !== "interval" && mode !== "manual") {
		throw new Error(
			`${label} dynamic capture mode must be on-load, interval, or manual.`,
		);
	}

	return {
		mode,
		resolution,
		intervalMs: positiveNumber(
			capture.intervalMs ??
				(capture.intervalSeconds === undefined
					? undefined
					: capture.intervalSeconds * 1000),
			1000,
		),
		near: positiveNumber(capture.near, 0.1),
		far: positiveNumber(capture.far, 2000),
	};
}

function dynamicCaptureConfigFromProbe(
	probe: ThreeReflectionProbeComponent,
): NormalizedDynamicCapture {
	const capture: ThreeDynamicEnvironmentCapture = {
		mode:
			probe.mode === "dynamic"
				? "interval"
				: probe.mode === "manual"
					? "manual"
					: "on-load",
		...(probe.resolution !== undefined ? { resolution: probe.resolution } : {}),
		...(probe.updateIntervalMs !== undefined
			? { intervalMs: probe.updateIntervalMs }
			: {}),
		...(probe.updateIntervalSeconds !== undefined
			? { intervalSeconds: probe.updateIntervalSeconds }
			: {}),
		...(probe.near !== undefined ? { near: probe.near } : {}),
		...(probe.far !== undefined ? { far: probe.far } : {}),
	};

	return normalizeDynamicCapture(capture, "Reflection probe");
}

function shouldUpdateCapture(capture: ActiveCubeCapture | undefined): boolean {
	if (!capture || capture.config.mode !== "interval") {
		return false;
	}

	return nowMs() - capture.lastCaptureMs >= capture.config.intervalMs;
}

function reflectionProbeCaptureKey(
	probe: ThreeReflectionProbeComponent,
): string {
	return JSON.stringify({
		mode: probe.mode,
		resolution: probe.resolution ?? 128,
		updateIntervalMs:
			probe.updateIntervalMs ??
			(probe.updateIntervalSeconds === undefined
				? null
				: probe.updateIntervalSeconds * 1000),
		near: probe.near ?? null,
		far: probe.far ?? null,
	});
}

function isObjectInsideProbe(
	object: ThreeObject3DLike,
	probe: AttachedReflectionProbe,
): boolean {
	if (probe.component.shape.type === "sphere") {
		return (
			distanceSquared(object.position, probe.transform.position) <=
			probe.component.shape.radius * probe.component.shape.radius
		);
	}

	const halfExtents = vec3LikeFrom(probe.component.shape.halfExtents);
	const delta = {
		x: Math.abs(
			numberProperty(object.position, "x") - probe.transform.position.x,
		),
		y: Math.abs(
			numberProperty(object.position, "y") - probe.transform.position.y,
		),
		z: Math.abs(
			numberProperty(object.position, "z") - probe.transform.position.z,
		),
	};

	return (
		delta.x <= halfExtents.x &&
		delta.y <= halfExtents.y &&
		delta.z <= halfExtents.z
	);
}

function distanceSquared(a: ThreeVectorLike, b: Vec3): number {
	const dx = numberProperty(a, "x") - b.x;
	const dy = numberProperty(a, "y") - b.y;
	const dz = numberProperty(a, "z") - b.z;
	return dx * dx + dy * dy + dz * dz;
}

function vec3LikeFrom(value: Vec3 | readonly [number, number, number]): Vec3 {
	if (
		typeof (value as Vec3).x === "number" &&
		typeof (value as Vec3).y === "number" &&
		typeof (value as Vec3).z === "number"
	) {
		const vector = value as Vec3;
		return { x: vector.x, y: vector.y, z: vector.z };
	}

	const [x, y, z] = value as readonly [number, number, number];
	return { x, y, z };
}

function positiveNumber(value: number | undefined, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) && value > 0
		? value
		: fallback;
}

function numberProperty(value: unknown, key: string): number {
	if (!isRecord(value)) {
		return 0;
	}

	const property = value[key];
	return typeof property === "number" && Number.isFinite(property)
		? property
		: 0;
}

function nowMs(): number {
	return typeof performance === "undefined" ? Date.now() : performance.now();
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function applyTransform(
	object: ThreeObject3DLike,
	transform: RenderTransform,
): void {
	object.position.set(
		transform.position.x,
		transform.position.y,
		transform.position.z,
	);
	object.quaternion.set(
		transform.rotation.x,
		transform.rotation.y,
		transform.rotation.z,
		transform.rotation.w,
	);
	object.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
}

export function sanitizeUserData(
	object: ThreeObject3DLike,
	entity: Entity,
): void {
	const visit = (node: ThreeObject3DLike) => {
		node.userData = { entityId: entity };
	};

	traverseObject(object, visit);
}

export function disposeObject3D(object: ThreeObject3DLike): void {
	const visited = new Set<unknown>();

	traverseObject(object, (node) => {
		disposeGeometry(node.geometry, visited);
		disposeMaterial(node.material, visited);
		disposeDisposable(node.skeleton, visited);
	});
}

export function disposeGeometry(
	geometry: ThreeGeometryLike | null | undefined,
	visited = new Set<unknown>(),
): void {
	disposeDisposable(geometry, visited);
}

export function disposeMaterial(
	material: ThreeMaterialLike | readonly ThreeMaterialLike[] | null | undefined,
	visited = new Set<unknown>(),
): void {
	if (material === null || material === undefined) {
		return;
	}

	if (Array.isArray(material)) {
		for (const entry of material) {
			disposeMaterial(entry, visited);
		}
		return;
	}

	const singleMaterial = material as ThreeMaterialLike;

	for (const texture of textureValues(singleMaterial)) {
		disposeDisposable(texture, visited);
	}

	disposeDisposable(singleMaterial, visited);
}

function forEachMaterial(
	material: ThreeMaterialLike | readonly ThreeMaterialLike[] | null | undefined,
	callback: (material: ThreeMaterialLike) => void,
): void {
	if (material === null || material === undefined) {
		return;
	}

	if (Array.isArray(material)) {
		for (const entry of material) {
			forEachMaterial(entry, callback);
		}
		return;
	}

	callback(material as ThreeMaterialLike);
}

function rendererOptionsFrom(
	options: ThreeRendererAdapterOptions,
	renderProfile?: RenderProfileData,
): {
	readonly canvas?: unknown;
	readonly antialias?: boolean;
	readonly alpha?: boolean;
} {
	const rendererOptions: {
		canvas?: unknown;
		antialias?: boolean;
		alpha?: boolean;
	} = {};

	if (options.canvas !== undefined) {
		rendererOptions.canvas = options.canvas;
	}

	const antialias = options.antialias ?? renderProfile?.renderer.antialias;

	if (antialias !== undefined) {
		rendererOptions.antialias = antialias;
	}

	if (options.alpha !== undefined) {
		rendererOptions.alpha = options.alpha;
	}

	return rendererOptions;
}

function aspectFromSize(width: number | undefined, height: number | undefined) {
	if (width === undefined || height === undefined || height === 0) {
		return 1;
	}

	return width / height;
}

function normalizeResolvedObject(
	resolved: ThreeResolvedObject,
): AttachedObject {
	if ("object" in resolved) {
		return {
			object: resolved.object,
			disposeOnDetach: resolved.disposeOnDetach ?? false,
		};
	}

	return {
		object: resolved,
		disposeOnDetach: false,
	};
}

function traverseObject(
	object: ThreeObject3DLike,
	visitor: (object: ThreeObject3DLike) => void,
): void {
	if (object.traverse) {
		object.traverse(visitor);
		return;
	}

	visitor(object);

	for (const child of object.children ?? []) {
		traverseObject(child, visitor);
	}
}

function textureValues(material: ThreeMaterialLike): ThreeTextureLike[] {
	const textures: ThreeTextureLike[] = [];

	for (const value of Object.values(material as Record<string, unknown>)) {
		if (isTextureLike(value)) {
			textures.push(value);
		}
	}

	return textures;
}

function isTextureLike(value: unknown): value is ThreeTextureLike {
	return (
		typeof value === "object" &&
		value !== null &&
		"isTexture" in value &&
		(value as { readonly isTexture?: unknown }).isTexture === true &&
		isDisposable(value)
	);
}

function isDisposable(value: unknown): value is ThreeDisposableLike {
	return (
		typeof value === "object" &&
		value !== null &&
		"dispose" in value &&
		typeof (value as { readonly dispose?: unknown }).dispose === "function"
	);
}

function disposeDisposable(value: unknown, visited: Set<unknown>): void {
	if (!isDisposable(value) || visited.has(value)) {
		return;
	}

	visited.add(value);
	value.dispose();
}

function isThreeObject3DLike(value: unknown): value is ThreeObject3DLike {
	return (
		isRecord(value) &&
		isRecord(value.userData) &&
		typeof value.visible === "boolean" &&
		isRecord(value.position) &&
		typeof value.position.set === "function" &&
		isRecord(value.quaternion) &&
		typeof value.quaternion.set === "function" &&
		isRecord(value.scale) &&
		typeof value.scale.set === "function"
	);
}

function entityFromObjectUserData(
	object: ThreeObject3DLike,
): Entity | undefined {
	const entityId = object.userData.entityId;

	return typeof entityId === "number" && Number.isSafeInteger(entityId)
		? entityId
		: undefined;
}

function isFiniteVector3Like(
	value: unknown,
): value is { readonly x: number; readonly y: number; readonly z: number } {
	return (
		isRecord(value) &&
		typeof value.x === "number" &&
		Number.isFinite(value.x) &&
		typeof value.y === "number" &&
		Number.isFinite(value.y) &&
		typeof value.z === "number" &&
		Number.isFinite(value.z)
	);
}

function isFiniteBox3Like(value: unknown): value is ThreeBox3Like {
	return (
		isRecord(value) &&
		isFiniteVector3Like(value.min) &&
		isFiniteVector3Like(value.max) &&
		value.min.x <= value.max.x &&
		value.min.y <= value.max.y &&
		value.min.z <= value.max.z
	);
}

function centerOfBox(box: ThreeBox3Like): ThreeVector3Like {
	return {
		x: (box.min.x + box.max.x) / 2,
		y: (box.min.y + box.max.y) / 2,
		z: (box.min.z + box.max.z) / 2,
	};
}

function projectWorldBoundsToViewport(
	Vector3: new (x: number, y: number, z: number) => ThreeVector3Like,
	camera: ThreeCameraLike,
	viewport: { readonly width: number; readonly height: number },
	box: ThreeBox3Like,
):
	| {
			readonly minX: number;
			readonly minY: number;
			readonly maxX: number;
			readonly maxY: number;
	  }
	| undefined {
	const boundsCorners: readonly (readonly [number, number, number])[] = [
		[box.min.x, box.min.y, box.min.z],
		[box.min.x, box.min.y, box.max.z],
		[box.min.x, box.max.y, box.min.z],
		[box.min.x, box.max.y, box.max.z],
		[box.max.x, box.min.y, box.min.z],
		[box.max.x, box.min.y, box.max.z],
		[box.max.x, box.max.y, box.min.z],
		[box.max.x, box.max.y, box.max.z],
	];
	const projectedPoints = boundsCorners
		.map(([x, y, z]) => {
			const projected = new Vector3(x, y, z);
			projected.project?.(camera);
			return projected;
		})
		.filter(
			(point) => isFiniteVector3Like(point) && point.z >= -1 && point.z <= 1,
		)
		.map((point) => ({
			x: ((point.x + 1) / 2) * viewport.width,
			y: ((1 - point.y) / 2) * viewport.height,
		}));

	if (projectedPoints.length === 0) {
		return undefined;
	}

	return {
		minX: Math.min(...projectedPoints.map((point) => point.x)),
		minY: Math.min(...projectedPoints.map((point) => point.y)),
		maxX: Math.max(...projectedPoints.map((point) => point.x)),
		maxY: Math.max(...projectedPoints.map((point) => point.y)),
	};
}

function distanceBetweenVectors(
	left: { readonly x: number; readonly y: number; readonly z: number },
	right: unknown,
): number {
	if (!isFiniteVector3Like(right)) {
		return 0;
	}

	const dx = left.x - right.x;
	const dy = left.y - right.y;
	const dz = left.z - right.z;

	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
