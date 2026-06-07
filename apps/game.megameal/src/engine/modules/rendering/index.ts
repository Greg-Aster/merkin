import type { Entity, System, World } from "../../core/index.js";
import type { Quat, Vec3 } from "../../math/index.js";

export const TRANSFORM_COMPONENT = "Transform";
export const PREVIOUS_TRANSFORM_COMPONENT = "PreviousTransform";
export const RENDERABLE_COMPONENT = "Renderable";
export const LIGHT_COMPONENT = "Light";
export const REFLECTION_PROBE_COMPONENT = "ReflectionProbe";
export const WATER_SURFACE_COMPONENT = "WaterSurface";

export type LightShadowSettings = {
	readonly enabled: boolean;
	readonly mapSize?: 256 | 512 | 1024 | 2048;
	readonly bias?: number;
	readonly normalBias?: number;
	readonly radius?: number;
	readonly cameraNear?: number;
	readonly cameraFar?: number;
};

export type RenderableComponent = {
	readonly meshId: string;
	readonly materialId?: string;
	readonly visible?: boolean;
};

export type AmbientLightComponent = {
	readonly kind: "ambient";
	readonly color: string;
	readonly intensity: number;
	readonly visible?: boolean;
};

export type DirectionalLightComponent = {
	readonly kind: "directional";
	readonly color: string;
	readonly intensity: number;
	readonly visible?: boolean;
	readonly shadow?: LightShadowSettings;
};

export type PointLightComponent = {
	readonly kind: "point";
	readonly color: string;
	readonly intensity: number;
	readonly distance: number;
	readonly decay: number;
	readonly visible?: boolean;
	readonly shadow?: LightShadowSettings;
};

export type SpotLightComponent = {
	readonly kind: "spot";
	readonly color: string;
	readonly intensity: number;
	readonly distance: number;
	readonly decay: number;
	readonly angle: number;
	readonly penumbra: number;
	readonly visible?: boolean;
	readonly shadow?: LightShadowSettings;
};

export type AreaLightComponent = {
	readonly kind: "area";
	readonly shape: "rectangle";
	readonly color: string;
	readonly intensity: number;
	readonly width: number;
	readonly height: number;
	readonly visible?: boolean;
};

export type LightComponent =
	| AmbientLightComponent
	| DirectionalLightComponent
	| PointLightComponent
	| SpotLightComponent
	| AreaLightComponent;

export type VisibilityComponent = {
	readonly visible: boolean;
	readonly layer?: string;
};

export type RenderTransform = {
	readonly position: Vec3;
	readonly rotation: Quat;
	readonly scale: Vec3;
};

export type CubemapFaceUrls = {
	readonly px: string;
	readonly nx: string;
	readonly py: string;
	readonly ny: string;
	readonly pz: string;
	readonly nz: string;
};

export const DYNAMIC_ENVIRONMENT_CAPTURE_RESOLUTIONS = [64, 128, 256] as const;
export const DEFAULT_DYNAMIC_ENVIRONMENT_CAPTURE_RESOLUTION = 128;
export const DEFAULT_DYNAMIC_ENVIRONMENT_CAPTURE_MODE = "on-load";

export type DynamicEnvironmentCaptureResolution =
	(typeof DYNAMIC_ENVIRONMENT_CAPTURE_RESOLUTIONS)[number];

export type DynamicEnvironmentCaptureMode = "on-load" | "interval" | "manual";

export type DynamicEnvironmentCapture = {
	readonly mode: DynamicEnvironmentCaptureMode;
	readonly resolution: DynamicEnvironmentCaptureResolution;
	readonly intervalSeconds?: number;
};

export type SceneEnvironmentLighting = {
	readonly intensity: number;
	readonly source: "asset" | "dynamic-capture";
	readonly prefiltered?: boolean;
	readonly dynamicCapture?: DynamicEnvironmentCapture;
};

export type BaseSceneEnvironment = {
	readonly backgroundIntensity: number;
	readonly backgroundBlurriness?: number;
	readonly environmentIntensity?: number;
	readonly requiredForReadiness?: boolean;
	readonly lighting?: SceneEnvironmentLighting;
};

export type SolidColorSceneEnvironment = BaseSceneEnvironment & {
	readonly kind: "solid-color";
	readonly color: string;
};

export type CubemapSceneEnvironment = BaseSceneEnvironment & {
	readonly kind: "cubemap-skybox";
	readonly assetId: string;
};

export type EquirectangularSceneEnvironment = BaseSceneEnvironment & {
	readonly kind: "equirectangular-environment";
	readonly assetId: string;
};

export type VideoSkyboxMapping = "equirectangular-360";

export type VideoSkyboxSceneEnvironment = BaseSceneEnvironment & {
	readonly kind: "video-skybox";
	readonly assetId: string;
	readonly mapping: VideoSkyboxMapping;
	readonly dynamicCapture?: DynamicEnvironmentCapture;
};

export type ProceduralAtmosphereSceneEnvironment = BaseSceneEnvironment & {
	readonly kind: "procedural-atmosphere";
	readonly skyColor: string;
	readonly horizonColor: string;
	readonly groundColor: string;
	readonly sunDirection: Vec3 | readonly [number, number, number];
	readonly sunColor: string;
	readonly sunIntensity: number;
	readonly dynamicCapture?: DynamicEnvironmentCapture;
};

export type SceneEnvironment =
	| SolidColorSceneEnvironment
	| CubemapSceneEnvironment
	| EquirectangularSceneEnvironment
	| VideoSkyboxSceneEnvironment
	| ProceduralAtmosphereSceneEnvironment;

export type SceneEnvironmentAssetResolver = {
	has(assetId: string): boolean;
	get(assetId: string): unknown;
};

export type SceneEnvironmentRendererPort = {
	applySceneEnvironment(
		environment: SceneEnvironment | null,
		assets?: SceneEnvironmentAssetResolver,
	): void | Promise<void>;
	clearSceneEnvironment(): void;
};

export type RendererPort = {
	attach(
		entity: Entity,
		renderable: RenderableComponent,
		transform: RenderTransform,
	): void;
	updateTransform(entity: Entity, transform: RenderTransform): void;
	detach(entity: Entity): void;
	render(interpolation: number): void;
	dispose(): void;
};

export type LightRendererPort = {
	attachLight(
		entity: Entity,
		light: LightComponent,
		transform: RenderTransform,
	): void;
	updateLight(
		entity: Entity,
		light: LightComponent,
		transform: RenderTransform,
	): void;
	detachLight(entity: Entity): void;
};

export type ReflectionProbeShape =
	| {
			readonly type: "sphere";
			readonly radius: number;
	  }
	| {
			readonly type: "box";
			readonly halfExtents: readonly [number, number, number];
	  };

export type ReflectionProbeMode = "static" | "dynamic" | "manual";

export type ReflectionProbeComponent = {
	readonly shape: ReflectionProbeShape;
	readonly mode: ReflectionProbeMode;
	readonly resolution: DynamicEnvironmentCaptureResolution;
	readonly intensity?: number;
	readonly priority?: number;
	readonly updateIntervalSeconds?: number;
	readonly visible?: boolean;
};

export type ReflectionProbeRendererPort = {
	attachReflectionProbe(
		entity: Entity,
		probe: ReflectionProbeComponent,
		transform: RenderTransform,
	): void;
	updateReflectionProbe(
		entity: Entity,
		probe: ReflectionProbeComponent,
		transform: RenderTransform,
	): void;
	detachReflectionProbe(entity: Entity): void;
};

export type WaterSurfaceAnimationMode = "static" | "scrolling";
export type WaterSurfaceReflectionMode =
	| "none"
	| "environment"
	| "reflection-probe";

export type WaterSurfaceAnimation = {
	readonly mode: WaterSurfaceAnimationMode;
	readonly speed: number;
	readonly direction: readonly [number, number];
	readonly waveAmplitude: number;
	readonly waveLength: number;
};

export type WaterSurfaceReflection = {
	readonly mode: WaterSurfaceReflectionMode;
	readonly intensity: number;
	readonly probeStableId?: string;
};

export type WaterSurfaceRefraction = {
	readonly enabled: boolean;
	readonly intensity: number;
};

export type WaterSurfaceGameplayVolume = {
	readonly enabled: false;
};

export type WaterSurfaceComponent = {
	readonly surfaceType: "plane";
	readonly bodyType?: "ocean" | "lake" | "river" | "custom";
	readonly normalMapAssetIds?: readonly string[];
	readonly animation: WaterSurfaceAnimation;
	readonly reflection: WaterSurfaceReflection;
	readonly refraction?: WaterSurfaceRefraction;
	readonly gameplayVolume?: WaterSurfaceGameplayVolume;
	readonly renderOrder?: number;
	readonly visible?: boolean;
};

export type WaterSurfaceRendererState = {
	readonly bodyType?: "ocean" | "lake" | "river" | "custom";
	readonly normalMapAssetIds?: readonly string[];
	readonly animation: WaterSurfaceAnimation;
	readonly reflection: WaterSurfaceReflection;
	readonly refraction?: WaterSurfaceRefraction;
	readonly renderOrder?: number;
	readonly visible: boolean;
};

export type WaterSurfaceRendererPort = {
	updateWaterSurface(
		entity: Entity,
		water: WaterSurfaceRendererState,
		transform: RenderTransform,
		elapsedSeconds: number,
	): void;
	detachWaterSurface(entity: Entity): void;
};

export function waterSurfaceRendererStateFromComponent(
	water: WaterSurfaceComponent,
): WaterSurfaceRendererState {
	return {
		...(water.bodyType ? { bodyType: water.bodyType } : {}),
		...(water.normalMapAssetIds
			? { normalMapAssetIds: [...water.normalMapAssetIds] }
			: {}),
		animation: { ...water.animation },
		reflection: { ...water.reflection },
		...(water.refraction ? { refraction: { ...water.refraction } } : {}),
		...(water.renderOrder !== undefined
			? { renderOrder: water.renderOrder }
			: {}),
		visible: water.visible !== false,
	};
}

export type RenderQueueItem = {
	readonly entity: Entity;
	readonly renderable: RenderableComponent;
	readonly transform: RenderTransform;
};

export type RenderSyncContext = {
	readonly world: World;
	readonly deltaSeconds?: number;
	readonly tick?: number;
	readonly interpolation?: number;
};

export type RenderSyncSystemOptions = {
	readonly renderer: RendererPort;
	readonly transformComponent?: string;
	readonly previousTransformComponent?: string;
	readonly renderableComponent?: string;
};

export type LightSyncSystemOptions = {
	readonly renderer: LightRendererPort;
	readonly transformComponent?: string;
	readonly previousTransformComponent?: string;
	readonly lightComponent?: string;
};

export type ReflectionProbeSyncSystemOptions = {
	readonly renderer: ReflectionProbeRendererPort;
	readonly transformComponent?: string;
	readonly previousTransformComponent?: string;
	readonly reflectionProbeComponent?: string;
};

export type WaterSurfaceSyncSystemOptions = {
	readonly renderer: WaterSurfaceRendererPort;
	readonly transformComponent?: string;
	readonly previousTransformComponent?: string;
	readonly waterSurfaceComponent?: string;
};

export type TransformHistorySystemOptions = {
	readonly transformComponent?: string;
	readonly previousTransformComponent?: string;
};

export type RenderSyncSystemHandle<TContext extends RenderSyncContext> =
	System<TContext> & {
		detach(entity: Entity): void;
		detachAll(): void;
		hasEntity(entity: Entity): boolean;
	};

export type LightSyncSystemHandle<TContext extends RenderSyncContext> =
	System<TContext> & {
		detach(entity: Entity): void;
		detachAll(): void;
		hasEntity(entity: Entity): boolean;
	};

export type ReflectionProbeSyncSystemHandle<
	TContext extends RenderSyncContext,
> = System<TContext> & {
	detach(entity: Entity): void;
	detachAll(): void;
	hasEntity(entity: Entity): boolean;
};

export type WaterSurfaceSyncSystemHandle<TContext extends RenderSyncContext> =
	System<TContext> & {
		detach(entity: Entity): void;
		detachAll(): void;
		hasEntity(entity: Entity): boolean;
	};

export class RenderSyncSystem {
	readonly renderer: RendererPort;
	readonly transformComponent: string;
	readonly previousTransformComponent: string;
	readonly renderableComponent: string;

	readonly #attachedEntities = new Set<Entity>();
	readonly #renderableKeys = new Map<Entity, string>();

	constructor(options: RenderSyncSystemOptions) {
		this.renderer = options.renderer;
		this.transformComponent = options.transformComponent ?? TRANSFORM_COMPONENT;
		this.previousTransformComponent =
			options.previousTransformComponent ?? PREVIOUS_TRANSFORM_COMPONENT;
		this.renderableComponent =
			options.renderableComponent ?? RENDERABLE_COMPONENT;
	}

	update(context: RenderSyncContext): void {
		const activeEntities = new Set(
			context.world.query([this.transformComponent, this.renderableComponent]),
		);

		for (const entity of activeEntities) {
			const renderable = context.world.requireComponent<RenderableComponent>(
				entity,
				this.renderableComponent,
			);

			if (renderable.visible === false) {
				this.detach(entity);
				continue;
			}

			const transform = context.world.requireComponent<RenderTransform>(
				entity,
				this.transformComponent,
			);
			const previousTransform = context.world.getComponent<RenderTransform>(
				entity,
				this.previousTransformComponent,
			);
			const renderedTransform =
				previousTransform && context.interpolation !== undefined
					? interpolateTransform(
							previousTransform,
							transform,
							context.interpolation,
						)
					: transform;
			const key = renderableKey(renderable);
			const previousKey = this.#renderableKeys.get(entity);

			if (!this.#attachedEntities.has(entity)) {
				this.renderer.attach(entity, renderable, renderedTransform);
				this.#attachedEntities.add(entity);
				this.#renderableKeys.set(entity, key);
				continue;
			}

			if (previousKey !== key) {
				this.renderer.detach(entity);
				this.renderer.attach(entity, renderable, renderedTransform);
				this.#renderableKeys.set(entity, key);
				continue;
			}

			this.renderer.updateTransform(entity, renderedTransform);
		}

		for (const entity of [...this.#attachedEntities]) {
			if (!activeEntities.has(entity)) {
				this.detach(entity);
			}
		}
	}

	detach(entity: Entity): void {
		if (!this.#attachedEntities.delete(entity)) {
			return;
		}

		this.#renderableKeys.delete(entity);
		this.renderer.detach(entity);
	}

	detachAll(): void {
		for (const entity of [...this.#attachedEntities]) {
			this.detach(entity);
		}
	}

	hasEntity(entity: Entity): boolean {
		return this.#attachedEntities.has(entity);
	}
}

export class LightSyncSystem {
	readonly renderer: LightRendererPort;
	readonly transformComponent: string;
	readonly previousTransformComponent: string;
	readonly lightComponent: string;

	readonly #attachedEntities = new Set<Entity>();
	readonly #lightKeys = new Map<Entity, string>();

	constructor(options: LightSyncSystemOptions) {
		this.renderer = options.renderer;
		this.transformComponent = options.transformComponent ?? TRANSFORM_COMPONENT;
		this.previousTransformComponent =
			options.previousTransformComponent ?? PREVIOUS_TRANSFORM_COMPONENT;
		this.lightComponent = options.lightComponent ?? LIGHT_COMPONENT;
	}

	update(context: RenderSyncContext): void {
		const activeEntities = new Set(
			context.world.query([this.transformComponent, this.lightComponent]),
		);

		for (const entity of activeEntities) {
			const light = context.world.requireComponent<LightComponent>(
				entity,
				this.lightComponent,
			);

			if (light.visible === false) {
				this.detach(entity);
				continue;
			}

			const transform = context.world.requireComponent<RenderTransform>(
				entity,
				this.transformComponent,
			);
			const previousTransform = context.world.getComponent<RenderTransform>(
				entity,
				this.previousTransformComponent,
			);
			const renderedTransform =
				previousTransform && context.interpolation !== undefined
					? interpolateTransform(
							previousTransform,
							transform,
							context.interpolation,
						)
					: transform;
			const key = lightKey(light);
			const previousKey = this.#lightKeys.get(entity);

			if (!this.#attachedEntities.has(entity)) {
				this.renderer.attachLight(entity, light, renderedTransform);
				this.#attachedEntities.add(entity);
				this.#lightKeys.set(entity, key);
				continue;
			}

			if (previousKey !== key) {
				this.renderer.detachLight(entity);
				this.renderer.attachLight(entity, light, renderedTransform);
				this.#lightKeys.set(entity, key);
				continue;
			}

			this.renderer.updateLight(entity, light, renderedTransform);
		}

		for (const entity of [...this.#attachedEntities]) {
			if (!activeEntities.has(entity)) {
				this.detach(entity);
			}
		}
	}

	detach(entity: Entity): void {
		if (!this.#attachedEntities.delete(entity)) {
			return;
		}

		this.#lightKeys.delete(entity);
		this.renderer.detachLight(entity);
	}

	detachAll(): void {
		for (const entity of [...this.#attachedEntities]) {
			this.detach(entity);
		}
	}

	hasEntity(entity: Entity): boolean {
		return this.#attachedEntities.has(entity);
	}
}

export class ReflectionProbeSyncSystem {
	readonly renderer: ReflectionProbeRendererPort;
	readonly transformComponent: string;
	readonly previousTransformComponent: string;
	readonly reflectionProbeComponent: string;

	readonly #attachedEntities = new Set<Entity>();
	readonly #probeKeys = new Map<Entity, string>();

	constructor(options: ReflectionProbeSyncSystemOptions) {
		this.renderer = options.renderer;
		this.transformComponent = options.transformComponent ?? TRANSFORM_COMPONENT;
		this.previousTransformComponent =
			options.previousTransformComponent ?? PREVIOUS_TRANSFORM_COMPONENT;
		this.reflectionProbeComponent =
			options.reflectionProbeComponent ?? REFLECTION_PROBE_COMPONENT;
	}

	update(context: RenderSyncContext): void {
		const activeEntities = new Set(
			context.world.query([
				this.transformComponent,
				this.reflectionProbeComponent,
			]),
		);

		for (const entity of activeEntities) {
			const probe = context.world.requireComponent<ReflectionProbeComponent>(
				entity,
				this.reflectionProbeComponent,
			);

			if (probe.visible === false) {
				this.detach(entity);
				continue;
			}

			const transform = context.world.requireComponent<RenderTransform>(
				entity,
				this.transformComponent,
			);
			const previousTransform = context.world.getComponent<RenderTransform>(
				entity,
				this.previousTransformComponent,
			);
			const renderedTransform =
				previousTransform && context.interpolation !== undefined
					? interpolateTransform(
							previousTransform,
							transform,
							context.interpolation,
						)
					: transform;
			const key = reflectionProbeKey(probe);
			const previousKey = this.#probeKeys.get(entity);

			if (!this.#attachedEntities.has(entity)) {
				this.renderer.attachReflectionProbe(entity, probe, renderedTransform);
				this.#attachedEntities.add(entity);
				this.#probeKeys.set(entity, key);
				continue;
			}

			if (previousKey !== key) {
				this.renderer.detachReflectionProbe(entity);
				this.renderer.attachReflectionProbe(entity, probe, renderedTransform);
				this.#probeKeys.set(entity, key);
				continue;
			}

			this.renderer.updateReflectionProbe(entity, probe, renderedTransform);
		}

		for (const entity of [...this.#attachedEntities]) {
			if (!activeEntities.has(entity)) {
				this.detach(entity);
			}
		}
	}

	detach(entity: Entity): void {
		if (!this.#attachedEntities.delete(entity)) {
			return;
		}

		this.#probeKeys.delete(entity);
		this.renderer.detachReflectionProbe(entity);
	}

	detachAll(): void {
		for (const entity of [...this.#attachedEntities]) {
			this.detach(entity);
		}
	}

	hasEntity(entity: Entity): boolean {
		return this.#attachedEntities.has(entity);
	}
}

export class WaterSurfaceSyncSystem {
	readonly renderer: WaterSurfaceRendererPort;
	readonly transformComponent: string;
	readonly previousTransformComponent: string;
	readonly waterSurfaceComponent: string;

	readonly #attachedEntities = new Set<Entity>();

	constructor(options: WaterSurfaceSyncSystemOptions) {
		this.renderer = options.renderer;
		this.transformComponent = options.transformComponent ?? TRANSFORM_COMPONENT;
		this.previousTransformComponent =
			options.previousTransformComponent ?? PREVIOUS_TRANSFORM_COMPONENT;
		this.waterSurfaceComponent =
			options.waterSurfaceComponent ?? WATER_SURFACE_COMPONENT;
	}

	update(context: RenderSyncContext): void {
		const activeEntities = new Set(
			context.world.query([
				this.transformComponent,
				this.waterSurfaceComponent,
			]),
		);

		for (const entity of activeEntities) {
			const water = context.world.requireComponent<WaterSurfaceComponent>(
				entity,
				this.waterSurfaceComponent,
			);

			if (water.visible === false) {
				this.detach(entity);
				continue;
			}

			const transform = context.world.requireComponent<RenderTransform>(
				entity,
				this.transformComponent,
			);
			const previousTransform = context.world.getComponent<RenderTransform>(
				entity,
				this.previousTransformComponent,
			);
			const renderedTransform =
				previousTransform && context.interpolation !== undefined
					? interpolateTransform(
							previousTransform,
							transform,
							context.interpolation,
						)
					: transform;
			const elapsedSeconds = renderElapsedSeconds(context);

			this.renderer.updateWaterSurface(
				entity,
				waterSurfaceRendererStateFromComponent(water),
				renderedTransform,
				elapsedSeconds,
			);
			this.#attachedEntities.add(entity);
		}

		for (const entity of [...this.#attachedEntities]) {
			if (!activeEntities.has(entity)) {
				this.detach(entity);
			}
		}
	}

	detach(entity: Entity): void {
		if (!this.#attachedEntities.delete(entity)) {
			return;
		}

		this.renderer.detachWaterSurface(entity);
	}

	detachAll(): void {
		for (const entity of [...this.#attachedEntities]) {
			this.detach(entity);
		}
	}

	hasEntity(entity: Entity): boolean {
		return this.#attachedEntities.has(entity);
	}
}

export function createRenderSyncSystem<TContext extends RenderSyncContext>(
	options: RenderSyncSystemOptions,
): RenderSyncSystemHandle<TContext> {
	const sync = new RenderSyncSystem(options);

	return {
		id: "render-sync",
		reads: [sync.transformComponent, sync.renderableComponent],
		update(context) {
			sync.update(context);
		},
		detach(entity) {
			sync.detach(entity);
		},
		detachAll() {
			sync.detachAll();
		},
		hasEntity(entity) {
			return sync.hasEntity(entity);
		},
	};
}

export function createLightSyncSystem<TContext extends RenderSyncContext>(
	options: LightSyncSystemOptions,
): LightSyncSystemHandle<TContext> {
	const sync = new LightSyncSystem(options);

	return {
		id: "light-sync",
		reads: [sync.transformComponent, sync.lightComponent],
		update(context) {
			sync.update(context);
		},
		detach(entity) {
			sync.detach(entity);
		},
		detachAll() {
			sync.detachAll();
		},
		hasEntity(entity) {
			return sync.hasEntity(entity);
		},
	};
}

export function createReflectionProbeSyncSystem<
	TContext extends RenderSyncContext,
>(
	options: ReflectionProbeSyncSystemOptions,
): ReflectionProbeSyncSystemHandle<TContext> {
	const sync = new ReflectionProbeSyncSystem(options);

	return {
		id: "reflection-probe-sync",
		reads: [sync.transformComponent, sync.reflectionProbeComponent],
		update(context) {
			sync.update(context);
		},
		detach(entity) {
			sync.detach(entity);
		},
		detachAll() {
			sync.detachAll();
		},
		hasEntity(entity) {
			return sync.hasEntity(entity);
		},
	};
}

export function createWaterSurfaceSyncSystem<
	TContext extends RenderSyncContext,
>(
	options: WaterSurfaceSyncSystemOptions,
): WaterSurfaceSyncSystemHandle<TContext> {
	const sync = new WaterSurfaceSyncSystem(options);

	return {
		id: "water-surface-sync",
		reads: [sync.transformComponent, sync.waterSurfaceComponent],
		update(context) {
			sync.update(context);
		},
		detach(entity) {
			sync.detach(entity);
		},
		detachAll() {
			sync.detachAll();
		},
		hasEntity(entity) {
			return sync.hasEntity(entity);
		},
	};
}

export function createTransformHistorySystem<
	TContext extends { readonly world: World },
>(options: TransformHistorySystemOptions = {}): System<TContext> {
	const transformComponent = options.transformComponent ?? TRANSFORM_COMPONENT;
	const previousTransformComponent =
		options.previousTransformComponent ?? PREVIOUS_TRANSFORM_COMPONENT;

	return {
		id: "transform-history",
		order: -1000,
		reads: [transformComponent],
		writes: [previousTransformComponent],
		update(context) {
			for (const entity of context.world.query([transformComponent])) {
				const transform = context.world.requireComponent<RenderTransform>(
					entity,
					transformComponent,
				);
				context.world.addComponent(
					entity,
					previousTransformComponent,
					cloneTransform(transform),
				);
			}
		},
	};
}

function renderElapsedSeconds(context: RenderSyncContext): number {
	const tick = context.tick ?? 0;
	const deltaSeconds = context.deltaSeconds ?? 0;
	const interpolation = context.interpolation ?? 0;

	return (tick + interpolation) * deltaSeconds;
}

function renderableKey(renderable: RenderableComponent): string {
	return `${renderable.meshId}\u0000${renderable.materialId ?? ""}`;
}

function lightKey(light: LightComponent): string {
	return light.kind;
}

function reflectionProbeKey(probe: ReflectionProbeComponent): string {
	const shape =
		probe.shape.type === "sphere"
			? ["sphere", probe.shape.radius]
			: ["box", ...probe.shape.halfExtents];

	return [
		...shape,
		probe.mode,
		probe.resolution,
		probe.intensity ?? 1,
		probe.priority ?? 0,
		probe.updateIntervalSeconds ?? "",
		probe.visible ?? true,
	].join("\u0000");
}

function interpolateTransform(
	previous: RenderTransform,
	current: RenderTransform,
	alpha: number,
): RenderTransform {
	const t = Math.max(0, Math.min(1, alpha));

	return {
		position: lerpVec3(previous.position, current.position, t),
		rotation: normalizeQuat(lerpQuat(previous.rotation, current.rotation, t)),
		scale: lerpVec3(previous.scale, current.scale, t),
	};
}

function cloneTransform(transform: RenderTransform): RenderTransform {
	return {
		position: { ...transform.position },
		rotation: { ...transform.rotation },
		scale: { ...transform.scale },
	};
}

function lerpVec3(previous: Vec3, current: Vec3, alpha: number): Vec3 {
	return {
		x: previous.x + (current.x - previous.x) * alpha,
		y: previous.y + (current.y - previous.y) * alpha,
		z: previous.z + (current.z - previous.z) * alpha,
	};
}

function lerpQuat(previous: Quat, current: Quat, alpha: number): Quat {
	const sign = dotQuat(previous, current) < 0 ? -1 : 1;

	return {
		x: previous.x + (current.x * sign - previous.x) * alpha,
		y: previous.y + (current.y * sign - previous.y) * alpha,
		z: previous.z + (current.z * sign - previous.z) * alpha,
		w: previous.w + (current.w * sign - previous.w) * alpha,
	};
}

function dotQuat(left: Quat, right: Quat): number {
	return (
		left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w
	);
}

function normalizeQuat(value: Quat): Quat {
	const length = Math.hypot(value.x, value.y, value.z, value.w);

	if (length === 0) {
		return { x: 0, y: 0, z: 0, w: 1 };
	}

	return {
		x: value.x / length,
		y: value.y / length,
		z: value.z / length,
		w: value.w / length,
	};
}
