import type { CommandBus, EventBus, Scheduler, World } from "../core/index.js";

export type RuntimeLifecycleState =
	| "created"
	| "started"
	| "paused"
	| "stopped"
	| "disposed";

export type RuntimeSnapshot = {
	readonly lifecycle: RuntimeLifecycleState;
	readonly tick: number;
	readonly interpolation: number;
};

export type RuntimeObserver<T> = (value: T) => void;

export type RuntimeServices = {
	readonly world: World;
	readonly scheduler: Scheduler<RuntimeUpdateContext>;
	readonly commands: CommandBus;
	readonly events: EventBus;
};

export type RuntimeUpdateContext = {
	readonly deltaSeconds: number;
	readonly tick: number;
	readonly interpolation?: number;
	readonly world: World;
	readonly commands: CommandBus;
	readonly events: EventBus;
};
