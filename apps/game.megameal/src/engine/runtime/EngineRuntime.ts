import {
	CommandBus,
	EventBus,
	FixedStep,
	Scheduler,
	World,
} from "../core/index.js";
import type {
	RuntimeLifecycleState,
	RuntimeObserver,
	RuntimeServices,
	RuntimeSnapshot,
	RuntimeUpdateContext,
} from "./RuntimeTypes.js";

const FIXED_STAGES = [
	"input",
	"commands",
	"gameplay",
	"ai",
	"character",
	"physics-pre-sync",
	"physics-step",
	"physics-post-sync",
	"animation",
	"audio",
	"camera",
] as const;

const RENDER_STAGES = ["render-sync", "render", "debug"] as const;

export type EngineRuntimeOptions = {
	readonly fixedDeltaSeconds?: number;
	readonly maxFrameDeltaSeconds?: number;
	readonly maxSubSteps?: number;
};

export class EngineRuntime {
	readonly world: World;
	readonly scheduler: Scheduler<RuntimeUpdateContext>;
	readonly commands: CommandBus;
	readonly events: EventBus;

	#clock: FixedStep;
	#lifecycle: RuntimeLifecycleState = "created";
	#tick = 0;
	#interpolation = 0;
	#observers = new Set<RuntimeObserver<RuntimeSnapshot>>();

	constructor(options: EngineRuntimeOptions = {}) {
		this.world = new World();
		this.scheduler = new Scheduler<RuntimeUpdateContext>();
		this.commands = new CommandBus();
		this.events = new EventBus();

		const fixedStepOptions: {
			fixedDelta?: number;
			maxFrameDelta?: number;
			maxTicksPerFrame?: number;
		} = {};

		if (options.fixedDeltaSeconds !== undefined) {
			fixedStepOptions.fixedDelta = options.fixedDeltaSeconds;
		}

		if (options.maxFrameDeltaSeconds !== undefined) {
			fixedStepOptions.maxFrameDelta = options.maxFrameDeltaSeconds;
		}

		if (options.maxSubSteps !== undefined) {
			fixedStepOptions.maxTicksPerFrame = options.maxSubSteps;
		}

		this.#clock = new FixedStep(fixedStepOptions);
	}

	get lifecycle(): RuntimeLifecycleState {
		return this.#lifecycle;
	}

	get services(): RuntimeServices {
		return {
			world: this.world,
			scheduler: this.scheduler,
			commands: this.commands,
			events: this.events,
		};
	}

	snapshot(): RuntimeSnapshot {
		return {
			lifecycle: this.#lifecycle,
			tick: this.#tick,
			interpolation: this.#interpolation,
		};
	}

	observe(observer: RuntimeObserver<RuntimeSnapshot>): () => void {
		this.#observers.add(observer);
		observer(this.snapshot());

		return () => {
			this.#observers.delete(observer);
		};
	}

	start(): void {
		if (this.#lifecycle === "disposed") {
			throw new Error("Cannot start a disposed EngineRuntime.");
		}

		this.#lifecycle = "started";
		this.#notify();
	}

	pause(): void {
		if (this.#lifecycle === "started") {
			this.#lifecycle = "paused";
			this.#notify();
		}
	}

	stop(): void {
		if (this.#lifecycle !== "disposed") {
			this.#lifecycle = "stopped";
			this.#clock.reset();
			this.#notify();
		}
	}

	update(frameDeltaSeconds: number): RuntimeSnapshot {
		if (this.#lifecycle !== "started") {
			return this.snapshot();
		}

		const step = this.#clock.advance(frameDeltaSeconds);

		for (let i = 0; i < step.ticks; i += 1) {
			const context = {
				deltaSeconds: step.fixedDelta,
				tick: this.#tick,
				world: this.world,
				commands: this.commands,
				events: this.events,
			};
			let drainableEventCount = 0;

			for (const stage of FIXED_STAGES) {
				if (stage === "audio") {
					drainableEventCount = this.events.size;
				}

				this.scheduler.run(stage, context);
			}

			// Keep events emitted after the audio stage queued for the next fixed tick.
			this.events.drain(drainableEventCount);
			this.#tick += 1;
		}

		this.#interpolation = step.interpolation;
		const renderContext = {
			deltaSeconds: step.fixedDelta,
			interpolation: this.#interpolation,
			tick: this.#tick,
			world: this.world,
			commands: this.commands,
			events: this.events,
		};

		for (const stage of RENDER_STAGES) {
			this.scheduler.run(stage, renderContext);
		}

		this.#notify();

		return this.snapshot();
	}

	dispose(): void {
		this.#lifecycle = "disposed";
		this.#clock.reset();
		this.scheduler.clearSystems();
		this.commands.clear();
		this.events.clear();
		this.world.clear();
		this.#observers.clear();
	}

	#notify(): void {
		const snapshot = this.snapshot();

		for (const observer of this.#observers) {
			observer(snapshot);
		}
	}
}
