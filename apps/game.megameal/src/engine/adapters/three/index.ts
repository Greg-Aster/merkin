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
	CollisionOverlayItem,
	CollisionOverlayRendererPort,
	LightComponent,
	LightRendererPort,
	ReflectionProbeComponent,
	ReflectionProbeRendererPort,
	RenderTransform,
	RenderableComponent,
	RendererPort,
	SceneEnvironment,
	SceneEnvironmentAssetResolver,
	SceneEnvironmentRendererPort,
	SpriteRenderableComponent,
} from "../../modules/rendering/index.js";

export type ThreeAdapterBoundary = {
	readonly kind: "three";
};

export type ThreeVectorLike = {
	set(x: number, y: number, z: number): void;
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

export type ThreeCanvasLike = {
	width: number;
	height: number;
	getContext(contextId: "2d"): CanvasRenderingContext2D | null;
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

export type ThreeBufferGeometryLike = ThreeGeometryLike & {
	setAttribute(name: string, attribute: unknown): void;
	setIndex(index: readonly number[] | Uint32Array): void;
	computeVertexNormals?(): void;
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
	toneMapped?: boolean;
	uniforms?: Record<string, unknown>;
	readonly lightMap?: ThreeTextureLike | null;
	readonly metalnessMap?: ThreeTextureLike | null;
	readonly normalMap?: ThreeTextureLike | null;
	readonly roughnessMap?: ThreeTextureLike | null;
	readonly specularMap?: ThreeTextureLike | null;
};

export type ThreeSpriteMaterialParameters = {
	readonly map?: ThreeTextureLike;
	readonly color?: string | number;
	readonly transparent?: boolean;
	readonly opacity?: number;
	readonly alphaTest?: number;
	readonly blending?: unknown;
	readonly depthWrite?: boolean;
	readonly depthTest?: boolean;
};

export type ThreeObject3DLike = {
	userData: Record<string, unknown>;
	visible: boolean;
	position: ThreeVectorLike;
	quaternion: ThreeQuaternionLike;
	scale: ThreeVectorLike;
	renderOrder?: number;
	parent?: { remove(object: ThreeObject3DLike): void } | null;
	children?: readonly ThreeObject3DLike[];
	add?(object: ThreeObject3DLike): void;
	remove?(object: ThreeObject3DLike): void;
	traverse?(callback: (object: ThreeObject3DLike) => void): void;
	clone?(recursive?: boolean): ThreeObject3DLike;
	geometry?: ThreeGeometryLike | null;
	material?: ThreeMaterialLike | readonly ThreeMaterialLike[] | null;
	skeleton?: ThreeDisposableLike | null;
};

type ThreeLightObjectLike = ThreeObject3DLike & {
	color?: {
		set(color: string | number): void;
	};
	intensity?: number;
	distance?: number;
	decay?: number;
	angle?: number;
	penumbra?: number;
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
	toneMappingExposure?: number;
};

export type ThreeMeshStandardMaterialParameters = {
	color?: string | number;
	emissive?: string | number;
	emissiveIntensity?: number;
	metalness?: number;
	roughness?: number;
	opacity?: number;
	transparent?: boolean;
	wireframe?: boolean;
	depthWrite?: boolean;
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
	readonly CylinderGeometry?: new (
		radiusTop: number,
		radiusBottom: number,
		height: number,
		radialSegments?: number,
	) => ThreeGeometryLike;
	readonly SphereGeometry?: new (
		radius: number,
		widthSegments?: number,
		heightSegments?: number,
	) => ThreeGeometryLike;
	readonly CapsuleGeometry?: new (
		radius: number,
		length: number,
		capSegments?: number,
		radialSegments?: number,
	) => ThreeGeometryLike;
	readonly BufferGeometry?: new () => ThreeBufferGeometryLike;
	readonly Float32BufferAttribute?: new (
		array: readonly number[] | Float32Array,
		itemSize: number,
	) => unknown;
	readonly MeshStandardMaterial: new (
		parameters?: ThreeMeshStandardMaterialParameters,
	) => ThreeMaterialLike;
	readonly SpriteMaterial?: new (
		parameters?: ThreeSpriteMaterialParameters,
	) => ThreeMaterialLike;
	readonly Sprite?: new (material: ThreeMaterialLike) => ThreeObject3DLike;
	readonly CanvasTexture?: new (canvas: ThreeCanvasLike) => ThreeTextureLike;
	readonly AdditiveBlending?: unknown;
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

export type ThreeSpriteAsset = {
	readonly kind: "three:sprite";
	readonly entry: AssetManifestEntry;
	readonly color: string;
	readonly size: number;
	readonly opacity: number;
	readonly intensity: number;
	readonly glow: number;
	readonly starType: "point" | "sparkle" | "halo" | "classic";
	readonly depthTest: boolean;
	readonly renderOrder: number;
};

type StarSpriteTexture = {
	readonly canvas: ThreeCanvasLike;
	readonly scaleMultiplier: number;
};

export type ThreeRenderableAsset =
	| ThreeBuiltinMeshAsset
	| ThreeMaterialFactoryAsset
	| ThreeGltfAsset
	| ThreeCubemapAsset
	| ThreeTextureAsset
	| ThreeVideoAsset
	| ThreeSpriteAsset;

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
	readonly createCanvas: (size: number) => ThreeCanvasLike;
};

export type ThreeResolvedObject =
	| ThreeObject3DLike
	| {
			readonly object: ThreeObject3DLike;
			readonly disposeOnDetach?: boolean;
			readonly scaleMultiplier?: Vec3;
	  };

export type ThreeObjectResolver = (
	renderable: RenderableComponent,
) => ThreeResolvedObject | undefined;

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

export async function createDefaultThreeRendererAdapter(
	options: Omit<ThreeRendererAdapterOptions, "three"> = {},
): Promise<ThreeRendererAdapter> {
	const three = await loadDefaultThreeRuntime();
	return new ThreeRendererAdapter({
		...options,
		three,
	});
}

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
	const spriteLoader = createThreeSpriteLoader();
	const disposer = createThreeAssetDisposer();

	target.registerLoader("mesh", meshLoader);
	target.registerLoader("material", materialLoader);
	target.registerLoader("sprite", spriteLoader);
	target.registerLoader("cubemap", cubemapLoader);
	target.registerLoader("texture", textureLoader);
	target.registerLoader("video", videoLoader);
	target.registerDisposer("mesh", disposer);
	target.registerDisposer("material", disposer);
	target.registerDisposer("sprite", disposer);
	target.registerDisposer("cubemap", disposer);
	target.registerDisposer("texture", disposer);
	target.registerDisposer("video", disposer);
}

export function createThreeAssetObjectResolver(
	options: ThreeAssetResolverOptions,
): ThreeObjectResolver {
	return (renderable) => {
		if (renderable.kind === "sprite") {
			return createSpriteObject(renderable, options);
		}

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

function createSpriteObject(
	renderable: SpriteRenderableComponent,
	options: ThreeAssetResolverOptions,
): {
	readonly object: ThreeObject3DLike;
	readonly disposeOnDetach: boolean;
	readonly scaleMultiplier: Vec3;
} {
	if (!options.three.Sprite || !options.three.SpriteMaterial) {
		throw new Error("Three runtime does not provide sprite rendering support.");
	}

	if (!options.three.CanvasTexture) {
		throw new Error("Three runtime does not provide canvas texture support.");
	}

	if (!options.assets.has(renderable.spriteId)) {
		throw new Error(
			`Renderable sprite asset "${renderable.spriteId}" is not registered.`,
		);
	}

	const spriteAsset = options.assets.get(renderable.spriteId);

	if (!isThreeSpriteAsset(spriteAsset)) {
		throw new Error(
			`Renderable sprite asset "${renderable.spriteId}" is not loaded as a Three sprite asset.`,
		);
	}

	const spriteTexture = createStarSpriteTexture(
		spriteAsset,
		options.createCanvas,
	);
	const texture = new options.three.CanvasTexture(spriteTexture.canvas);
	setTextureColorSpace(texture, "srgb", options.three);
	texture.needsUpdate = true;

	const material = new options.three.SpriteMaterial({
		map: texture,
		color: "#ffffff",
		transparent: true,
		alphaTest: 0.001,
		opacity: clampUnit(
			spriteAsset.opacity * spriteAsset.intensity * spriteAsset.glow,
		),
		...(options.three.AdditiveBlending
			? { blending: options.three.AdditiveBlending }
			: {}),
		depthWrite: false,
		depthTest: spriteAsset.depthTest,
	});
	material.toneMapped = false;

	const sprite = new options.three.Sprite(material);
	sprite.renderOrder = spriteAsset.renderOrder;

	return {
		object: sprite,
		disposeOnDetach: true,
		scaleMultiplier: {
			x: spriteAsset.size * spriteTexture.scaleMultiplier,
			y: spriteAsset.size * spriteTexture.scaleMultiplier,
			z: 1,
		},
	};
}

function createStarSpriteTexture(
	asset: ThreeSpriteAsset,
	createCanvas: (size: number) => ThreeCanvasLike,
): StarSpriteTexture {
	const size = 256;
	const padding = 8;
	const baseRadius = size * 0.03;
	const shapeExtentMultiplier = starShapeExtentMultiplier(asset.starType);
	const glowLayers = [
		{ radiusMultiplier: 15 * asset.glow, opacity: 0.04, blur: 25 },
		{ radiusMultiplier: 10 * asset.glow, opacity: 0.08, blur: 20 },
		{ radiusMultiplier: 6 * asset.glow, opacity: 0.15, blur: 15 },
		{ radiusMultiplier: 3 * asset.glow, opacity: 0.25, blur: 8 },
	] as const;
	const drawableExtent = Math.max(1, size / 2 - padding);
	const scaleLimits = [
		drawableExtent / Math.max(1, baseRadius * shapeExtentMultiplier),
		...glowLayers.map((layer) => {
			const radiusBudget = drawableExtent - layer.blur;
			if (radiusBudget <= 0) {
				return 0;
			}
			return radiusBudget / Math.max(1, baseRadius * layer.radiusMultiplier);
		}),
	];
	const radiusScale = Math.max(0.01, Math.min(1, ...scaleLimits));
	const radius = baseRadius * radiusScale;
	const canvas = createCanvas(size);
	const context = canvas.getContext("2d");

	if (!context) {
		throw new Error("Sprite canvas did not provide a 2D rendering context.");
	}

	const center = size / 2;
	context.clearRect(0, 0, size, size);

	for (const layer of glowLayers) {
		const layerRadius = radius * layer.radiusMultiplier;
		context.save();
		context.filter = `blur(${layer.blur}px)`;

		const gradient = context.createRadialGradient(
			center,
			center,
			0,
			center,
			center,
			layerRadius,
		);
		gradient.addColorStop(0, colorWithAlpha(asset.color, layer.opacity));
		gradient.addColorStop(
			0.5,
			colorWithAlpha(asset.color, layer.opacity * 0.59),
		);
		gradient.addColorStop(1, colorWithAlpha(asset.color, 0));

		context.fillStyle = gradient;
		context.beginPath();
		context.arc(center, center, layerRadius, 0, Math.PI * 2);
		context.fill();
		context.restore();
	}

	drawStarSpriteShape(context, asset.starType, asset.color, center, radius);

	return {
		canvas,
		scaleMultiplier: 1 / radiusScale,
	};
}

function drawStarSpriteShape(
	context: CanvasRenderingContext2D,
	starType: ThreeSpriteAsset["starType"],
	color: string,
	center: number,
	radius: number,
): void {
	context.save();
	context.globalCompositeOperation = "source-over";

	switch (starType) {
		case "point":
			context.fillStyle = color;
			context.beginPath();
			context.arc(center, center, radius * 1.2, 0, Math.PI * 2);
			context.fill();
			break;
		case "classic":
			drawStarPath(context, center, center, 5, radius * 2, radius, color);
			break;
		case "sparkle":
			drawStarPath(
				context,
				center,
				center,
				4,
				radius * 1.8,
				radius * 0.8,
				color,
			);
			context.strokeStyle = colorWithAlpha(color, 0.67);
			context.lineWidth = 2;
			context.beginPath();
			context.moveTo(center - radius * 3, center);
			context.lineTo(center + radius * 3, center);
			context.moveTo(center, center - radius * 3);
			context.lineTo(center, center + radius * 3);
			context.stroke();
			break;
		case "halo":
			for (const ring of [
				{ radius: radius * 1.2, opacity: 1 },
				{ radius: radius * 2, opacity: 0.6 },
				{ radius: radius * 2.8, opacity: 0.3 },
			]) {
				context.fillStyle = colorWithAlpha(color, ring.opacity);
				context.beginPath();
				context.arc(center, center, ring.radius, 0, Math.PI * 2);
				context.fill();
			}
			break;
	}

	context.restore();
}

function drawStarPath(
	context: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	spikes: number,
	outerRadius: number,
	innerRadius: number,
	color: string,
): void {
	let rotation = (Math.PI / 2) * 3;
	const step = Math.PI / spikes;

	context.beginPath();
	context.moveTo(cx, cy - outerRadius);

	for (let index = 0; index < spikes; index += 1) {
		context.lineTo(
			cx + Math.cos(rotation) * outerRadius,
			cy + Math.sin(rotation) * outerRadius,
		);
		rotation += step;
		context.lineTo(
			cx + Math.cos(rotation) * innerRadius,
			cy + Math.sin(rotation) * innerRadius,
		);
		rotation += step;
	}

	context.lineTo(cx, cy - outerRadius);
	context.closePath();
	context.fillStyle = color;
	context.fill();
}

function starShapeExtentMultiplier(
	starType: ThreeSpriteAsset["starType"],
): number {
	switch (starType) {
		case "classic":
			return 2;
		case "sparkle":
			return 3;
		case "halo":
			return 2.8;
		case "point":
			return 1.2;
	}
}

function colorWithAlpha(color: string, alpha: number): string {
	const alphaHex = Math.round(clampUnit(alpha) * 255)
		.toString(16)
		.padStart(2, "0");
	return `${color}${alphaHex}`;
}

function clampUnit(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.min(1, Math.max(0, value));
}

export function isThreeSpriteAsset(asset: unknown): asset is ThreeSpriteAsset {
	return isRecord(asset) && asset.kind === "three:sprite";
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
	readonly scaleMultiplier?: Vec3;
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

function collisionOverlayColor(item: CollisionOverlayItem): string {
	if (!item.synced) {
		return "#94a3b8";
	}

	switch (item.intent) {
		case "walkable":
			return "#4ade80";
		case "trigger":
			return "#38bdf8";
		case "solid":
			return "#f59e0b";
	}
}

function overlayMeshBounds(vertices: readonly Vec3[]): {
	readonly halfExtents: Vec3;
	readonly center: Vec3;
} {
	if (vertices.length === 0) {
		return {
			halfExtents: { x: 0.5, y: 0.5, z: 0.5 },
			center: { x: 0, y: 0, z: 0 },
		};
	}

	const bounds = vertices.reduce(
		(accumulator, vertex) => ({
			minX: Math.min(accumulator.minX, vertex.x),
			minY: Math.min(accumulator.minY, vertex.y),
			minZ: Math.min(accumulator.minZ, vertex.z),
			maxX: Math.max(accumulator.maxX, vertex.x),
			maxY: Math.max(accumulator.maxY, vertex.y),
			maxZ: Math.max(accumulator.maxZ, vertex.z),
		}),
		{
			minX: Number.POSITIVE_INFINITY,
			minY: Number.POSITIVE_INFINITY,
			minZ: Number.POSITIVE_INFINITY,
			maxX: Number.NEGATIVE_INFINITY,
			maxY: Number.NEGATIVE_INFINITY,
			maxZ: Number.NEGATIVE_INFINITY,
		},
	);

	return {
		halfExtents: {
			x: Math.max((bounds.maxX - bounds.minX) / 2, 0.05),
			y: Math.max((bounds.maxY - bounds.minY) / 2, 0.05),
			z: Math.max((bounds.maxZ - bounds.minZ) / 2, 0.05),
		},
		center: {
			x: (bounds.minX + bounds.maxX) / 2,
			y: (bounds.minY + bounds.maxY) / 2,
			z: (bounds.minZ + bounds.maxZ) / 2,
		},
	};
}

export class ThreeRendererAdapter
	implements
		RendererPort,
		LightRendererPort,
		ReflectionProbeRendererPort,
		CollisionOverlayRendererPort,
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
	readonly #collisionOverlayObjects = new Set<ThreeObject3DLike>();
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
		applyLightProperties(object, light);

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
		applyLightProperties(object, light);
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
		applyTransform(attached.object, transform, attached.scaleMultiplier);
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

		applyTransform(attached.object, transform, attached.scaleMultiplier);
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
	}

	render(interpolation: number): void {
		void interpolation;
		this.#updateDynamicCaptures();
		this.renderer.render(this.scene, this.camera);
	}

	setCollisionOverlay(items: readonly CollisionOverlayItem[]): void {
		this.clearCollisionOverlay();

		for (const item of items) {
			const object = this.#createCollisionOverlayObject(item);
			this.#collisionOverlayObjects.add(object);
			this.scene.add(object);
		}
	}

	clearCollisionOverlay(): void {
		for (const object of this.#collisionOverlayObjects) {
			this.scene.remove(object);
			object.parent?.remove(object);
			disposeObject3D(object);
		}

		this.#collisionOverlayObjects.clear();
	}

	#createCollisionOverlayObject(item: CollisionOverlayItem): ThreeObject3DLike {
		const { geometry, center } = this.#createCollisionOverlayGeometry(item);
		const material = new this.#three.MeshStandardMaterial({
			color: collisionOverlayColor(item),
			emissive: collisionOverlayColor(item),
			emissiveIntensity: 0.32,
			opacity: item.synced ? 0.42 : 0.24,
			transparent: true,
			wireframe: true,
			depthWrite: false,
		});
		const object = new this.#three.Mesh(geometry, material);
		const position = item.transform.position;
		const rotation = item.transform.rotation;
		const scale = item.transform.scale;

		object.userData = {
			...object.userData,
			megamealCollisionOverlay: true,
			entity: item.entity,
			stableId: item.stableId,
			intent: item.intent,
			channel: item.channel,
			synced: item.synced,
		};
		object.position.set(
			position.x + center.x * scale.x,
			position.y + center.y * scale.y,
			position.z + center.z * scale.z,
		);
		object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
		object.scale.set(scale.x, scale.y, scale.z);

		return object;
	}

	#createCollisionOverlayGeometry(item: CollisionOverlayItem): {
		readonly geometry: ThreeGeometryLike;
		readonly center: Vec3;
	} {
		const zero = { x: 0, y: 0, z: 0 };

		switch (item.shape.type) {
			case "box":
				return {
					geometry: new this.#three.BoxGeometry(
						item.shape.halfExtents.x * 2,
						item.shape.halfExtents.y * 2,
						item.shape.halfExtents.z * 2,
					),
					center: zero,
				};
			case "sphere":
				return {
					geometry: this.#three.SphereGeometry
						? new this.#three.SphereGeometry(item.shape.radius, 18, 10)
						: new this.#three.BoxGeometry(
								item.shape.radius * 2,
								item.shape.radius * 2,
								item.shape.radius * 2,
							),
					center: zero,
				};
			case "capsule":
				return {
					geometry: this.#three.CapsuleGeometry
						? new this.#three.CapsuleGeometry(
								item.shape.radius,
								item.shape.halfHeight * 2,
								6,
								12,
							)
						: new this.#three.BoxGeometry(
								item.shape.radius * 2,
								item.shape.halfHeight * 2 + item.shape.radius * 2,
								item.shape.radius * 2,
							),
					center: zero,
				};
			case "cylinder":
				return {
					geometry: this.#three.CylinderGeometry
						? new this.#three.CylinderGeometry(
								item.shape.radius,
								item.shape.radius,
								item.shape.halfHeight * 2,
								18,
							)
						: new this.#three.BoxGeometry(
								item.shape.radius * 2,
								item.shape.halfHeight * 2,
								item.shape.radius * 2,
							),
					center: zero,
				};
			case "mesh": {
				if (this.#three.BufferGeometry && this.#three.Float32BufferAttribute) {
					return {
						geometry: this.#createCollisionOverlayMeshGeometry(item.shape),
						center: zero,
					};
				}

				const bounds = overlayMeshBounds(item.shape.vertices);
				return {
					geometry: new this.#three.BoxGeometry(
						bounds.halfExtents.x * 2,
						bounds.halfExtents.y * 2,
						bounds.halfExtents.z * 2,
					),
					center: bounds.center,
				};
			}
		}
	}

	#createCollisionOverlayMeshGeometry(
		shape: Extract<CollisionOverlayItem["shape"], { readonly type: "mesh" }>,
	): ThreeGeometryLike {
		if (!this.#three.BufferGeometry || !this.#three.Float32BufferAttribute) {
			throw new Error(
				"Collision mesh overlay requires Three BufferGeometry support.",
			);
		}

		const geometry = new this.#three.BufferGeometry();
		geometry.setAttribute(
			"position",
			new this.#three.Float32BufferAttribute(
				shape.vertices.flatMap((vertex) => [vertex.x, vertex.y, vertex.z]),
				3,
			),
		);
		geometry.setIndex(shape.indices);
		geometry.computeVertexNormals?.();
		return geometry;
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

		this.clearCollisionOverlay();
		this.clearSceneEnvironment();
		this.renderer.dispose();
	}

	getObject(entity: Entity): ThreeObject3DLike | undefined {
		return this.#objects.get(entity)?.object;
	}

	hasObject(entity: Entity): boolean {
		return this.#objects.has(entity);
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
	}
}

function applyLightProperties(
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
				return new three.MeshStandardMaterial(
					meshStandardMaterialParametersFrom(entry),
				);
			},
		} satisfies ThreeMaterialFactoryAsset;
	};
}

function createThreeSpriteLoader(): AssetLoader {
	return async (entry) => {
		if (!isBuiltinUrl(entry.url)) {
			throw new Error(
				`Sprite asset "${entry.id}" must use builtin:// until sprite texture loading is added.`,
			);
		}

		if (!entry.sprite) {
			throw new Error(`Sprite asset "${entry.id}" must declare sprite data.`);
		}

		return {
			kind: "three:sprite",
			entry,
			color: entry.sprite.color,
			size: Math.max(0.001, entry.sprite.size),
			opacity: entry.sprite.opacity ?? 1,
			intensity: entry.sprite.intensity ?? 1,
			glow: entry.sprite.glow ?? 1,
			starType: entry.sprite.starType ?? "sparkle",
			depthTest: entry.sprite.depthTest ?? true,
			renderOrder: entry.sprite.renderOrder ?? 1,
		} satisfies ThreeSpriteAsset;
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
				case "sphere":
					if (!three.SphereGeometry) {
						return new three.BoxGeometry(
							builtinNumberParam(entry.url, "radius", 0.5) * 2,
							builtinNumberParam(entry.url, "radius", 0.5) * 2,
							builtinNumberParam(entry.url, "radius", 0.5) * 2,
						);
					}

					return new three.SphereGeometry(
						builtinNumberParam(entry.url, "radius", 0.5),
						builtinIntegerParam(entry.url, "widthSegments", 18),
						builtinIntegerParam(entry.url, "heightSegments", 12),
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
		case "miranda-floor-main":
			return "#252d37";
		case "miranda-floor-upper":
			return "#2e3844";
		case "miranda-cockpit-panel":
			return "#1e2e3f";
		case "miranda-cockpit-panel-center":
			return "#1e2e3f";
		case "miranda-crew-bunk":
			return "#2b3341";
		case "miranda-locker-bank":
			return "#29323d";
		case "miranda-captains-desk":
			return "#5a3c2b";
		case "miranda-captains-chair":
			return "#3b2f36";
		case "miranda-recipe-safe":
			return "#2b3138";
		case "miranda-engine-column":
			return "#46313a";
		case "miranda-engine-core":
			return "#5a2d24";
		case "miranda-med-pod":
			return "#6da8bf";
		case "miranda-mess-table":
			return "#5d4638";
		case "miranda-mess-counter":
			return "#3f2d29";
		case "miranda-chapel-altar":
			return "#332934";
		case "miranda-brig-cell":
			return "#3f3034";
		case "miranda-brig-desk":
			return "#4a3732";
		case "miranda-cargo-stack-a":
			return "#564136";
		case "miranda-cargo-stack":
			return "#5a4334";
		case "miranda-server-bank":
			return "#202634";
		case "miranda-server-bank-wide":
			return "#202634";
		case "miranda-story-marker-cyan":
			return "#8de0ff";
		case "miranda-story-marker-amber":
			return "#ffc584";
		case "miranda-story-marker-red":
			return "#ff8ea6";
		case "miranda-story-marker-magenta":
			return "#cba7ff";
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
	scaleMultiplier?: Vec3,
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
	object.scale.set(
		transform.scale.x * (scaleMultiplier?.x ?? 1),
		transform.scale.y * (scaleMultiplier?.y ?? 1),
		transform.scale.z * (scaleMultiplier?.z ?? 1),
	);
}

export function sanitizeUserData(
	object: ThreeObject3DLike,
	entity: Entity,
): void {
	const visit = (node: ThreeObject3DLike) => {
		node.userData = { ...node.userData, entityId: entity };
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
		const attached: AttachedObject = {
			object: resolved.object,
			disposeOnDetach: resolved.disposeOnDetach ?? false,
		};

		if (resolved.scaleMultiplier !== undefined) {
			return {
				...attached,
				scaleMultiplier: resolved.scaleMultiplier,
			};
		}

		return attached;
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
