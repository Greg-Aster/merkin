import type { Entity } from "../../core/index.js";
import type { RuntimeServices } from "../../runtime/index.js";

export type SceneStatus =
	| "created"
	| "loading"
	| "active"
	| "paused"
	| "unloading"
	| "disposed";

export type Scene = {
	readonly id: string;
	load(services: RuntimeServices): Promise<void> | void;
	activate(services: RuntimeServices): Promise<void> | void;
	deactivate(services: RuntimeServices): Promise<void> | void;
	unload(services: RuntimeServices): Promise<void> | void;
};

export type SceneScope = {
	readonly sceneId: string;
	registerCleanup(cleanup: () => void | Promise<void>): void;
	registerEntity(entity: Entity, destroy: (entity: Entity) => void): void;
	registerAsset(assetId: string, release: (assetId: string) => void): void;
	registerListener(remove: () => void): void;
	registerTimer(timerId: number, clearTimer: (timerId: number) => void): void;
	registerWorker(worker: { terminate(): void }): void;
	registerRenderObject(dispose: () => void): void;
	registerPhysicsBody(dispose: () => void): void;
	registerAudioNode(dispose: () => void): void;
	cleanup(): Promise<void>;
};

export class BasicSceneScope implements SceneScope {
	readonly sceneId: string;

	#cleanups: Array<() => void | Promise<void>> = [];

	constructor(sceneId: string) {
		this.sceneId = sceneId;
	}

	registerCleanup(cleanup: () => void | Promise<void>): void {
		this.#cleanups.push(cleanup);
	}

	registerEntity(entity: Entity, destroy: (entity: Entity) => void): void {
		this.registerCleanup(() => destroy(entity));
	}

	registerAsset(assetId: string, release: (assetId: string) => void): void {
		this.registerCleanup(() => release(assetId));
	}

	registerListener(remove: () => void): void {
		this.registerCleanup(remove);
	}

	registerTimer(timerId: number, clearTimer: (timerId: number) => void): void {
		this.registerCleanup(() => clearTimer(timerId));
	}

	registerWorker(worker: { terminate(): void }): void {
		this.registerCleanup(() => worker.terminate());
	}

	registerRenderObject(dispose: () => void): void {
		this.registerCleanup(dispose);
	}

	registerPhysicsBody(dispose: () => void): void {
		this.registerCleanup(dispose);
	}

	registerAudioNode(dispose: () => void): void {
		this.registerCleanup(dispose);
	}

	async cleanup(): Promise<void> {
		const cleanups = this.#cleanups.splice(0).reverse();
		const errors: unknown[] = [];

		for (const cleanup of cleanups) {
			try {
				await cleanup();
			} catch (error) {
				errors.push(error);
			}
		}

		if (errors.length > 0) {
			throw new AggregateError(
				errors,
				`Scene "${this.sceneId}" cleanup failed for ${errors.length} resource(s).`,
			);
		}
	}
}

export class SceneManager {
	#activeScene: Scene | undefined;
	#activeScope: BasicSceneScope | undefined;
	#status: SceneStatus = "created";

	get activeScene(): Scene | undefined {
		return this.#activeScene;
	}

	get activeScope(): SceneScope | undefined {
		return this.#activeScope;
	}

	get status(): SceneStatus {
		return this.#status;
	}

	async load(scene: Scene, services: RuntimeServices): Promise<void> {
		await this.unload(services);

		this.#status = "loading";
		this.#activeScene = scene;
		this.#activeScope = new BasicSceneScope(scene.id);

		services.world.setResource(`scene:${scene.id}:scope`, this.#activeScope);

		try {
			await scene.load(services);
			await scene.activate(services);
			this.#status = "active";
		} catch (error) {
			await this.cleanupActiveScene(services, { unloadScene: true });
			throw error;
		}
	}

	async deactivate(services: RuntimeServices): Promise<void> {
		if (!this.#activeScene || this.#status !== "active") {
			return;
		}

		await this.#activeScene.deactivate(services);
		this.#status = "paused";
	}

	async activate(services: RuntimeServices): Promise<void> {
		if (!this.#activeScene || this.#status !== "paused") {
			return;
		}

		await this.#activeScene.activate(services);
		this.#status = "active";
	}

	async unload(services: RuntimeServices): Promise<void> {
		if (!this.#activeScene) {
			return;
		}

		const shouldDeactivate = this.#status === "active";
		this.#status = "unloading";
		await this.cleanupActiveScene(services, {
			deactivateScene: shouldDeactivate,
			unloadScene: true,
		});
	}

	private async cleanupActiveScene(
		services: RuntimeServices,
		options: {
			readonly deactivateScene?: boolean;
			readonly unloadScene?: boolean;
		} = {},
	): Promise<void> {
		const scene = this.#activeScene;
		const scope = this.#activeScope;

		if (!scene) {
			return;
		}

		try {
			if (options.deactivateScene) {
				await scene.deactivate(services);
			}

			if (options.unloadScene) {
				await scene.unload(services);
			}

			await scope?.cleanup();
		} finally {
			services.world.removeResource(`scene:${scene.id}:scope`);
			this.#activeScene = undefined;
			this.#activeScope = undefined;
			this.#status = "disposed";
		}
	}
}
