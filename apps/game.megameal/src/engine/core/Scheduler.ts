import type { System, SystemId, SystemUpdate } from "./System";

export const DEFAULT_SCHEDULER_STAGES = [
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
	"render-sync",
	"render",
	"debug",
] as const;

export type DefaultSchedulerStage = (typeof DEFAULT_SCHEDULER_STAGES)[number];
export type SchedulerStage = DefaultSchedulerStage | string;

export type RegisterStageOptions = {
	before?: SchedulerStage;
	after?: SchedulerStage;
};

export type RegisterSystemOptions = {
	id?: SystemId;
	order?: number;
};

type ScheduledSystem<TContext> = System<TContext> & {
	order: number;
};

export class Scheduler<TContext = unknown> {
	private readonly stageOrder: SchedulerStage[] = [];
	private readonly systemsByStage = new Map<
		SchedulerStage,
		ScheduledSystem<TContext>[]
	>();

	constructor(stages: readonly SchedulerStage[] = DEFAULT_SCHEDULER_STAGES) {
		for (const stage of stages) {
			this.registerStage(stage);
		}
	}

	stages(): SchedulerStage[] {
		return [...this.stageOrder];
	}

	hasStage(stage: SchedulerStage): boolean {
		return this.systemsByStage.has(stage);
	}

	registerStage(
		stage: SchedulerStage,
		options: RegisterStageOptions = {},
	): this {
		if (this.systemsByStage.has(stage)) {
			return this;
		}

		if (options.before && options.after) {
			throw new Error(
				`Scheduler stage "${stage}" cannot specify both before and after.`,
			);
		}

		let index = this.stageOrder.length;

		if (options.before) {
			index = this.getStageIndex(options.before);
		} else if (options.after) {
			index = this.getStageIndex(options.after) + 1;
		}

		this.stageOrder.splice(index, 0, stage);
		this.systemsByStage.set(stage, []);
		return this;
	}

	registerSystem(
		stage: SchedulerStage,
		system: System<TContext> | SystemUpdate<TContext>,
		options: RegisterSystemOptions = {},
	): this {
		if (!this.systemsByStage.has(stage)) {
			throw new Error(`Scheduler stage "${stage}" is not registered.`);
		}

		const scheduledSystem = this.toScheduledSystem(system, options);
		const systems = this.systemsByStage.get(stage);

		if (!systems) {
			throw new Error(`Scheduler stage "${stage}" is not registered.`);
		}

		if (
			systems.some((existingSystem) => existingSystem.id === scheduledSystem.id)
		) {
			throw new Error(
				`System "${scheduledSystem.id}" is already registered in stage "${stage}".`,
			);
		}

		systems.push(scheduledSystem);
		systems.sort(compareSystems);
		return this;
	}

	unregisterSystem(stage: SchedulerStage, systemId: SystemId): boolean {
		const systems = this.systemsByStage.get(stage);

		if (!systems) {
			return false;
		}

		const index = systems.findIndex((system) => system.id === systemId);

		if (index === -1) {
			return false;
		}

		systems.splice(index, 1);
		return true;
	}

	systems(stage: SchedulerStage): readonly System<TContext>[] {
		return [...(this.systemsByStage.get(stage) ?? [])];
	}

	run(stage: SchedulerStage, context: TContext): void {
		const systems = this.systemsByStage.get(stage);

		if (!systems) {
			throw new Error(`Scheduler stage "${stage}" is not registered.`);
		}

		for (const system of [...systems]) {
			system.update(context);
		}
	}

	clearSystems(stage?: SchedulerStage): void {
		if (stage) {
			const systems = this.systemsByStage.get(stage);

			if (!systems) {
				throw new Error(`Scheduler stage "${stage}" is not registered.`);
			}

			systems.length = 0;
			return;
		}

		for (const systems of this.systemsByStage.values()) {
			systems.length = 0;
		}
	}

	private getStageIndex(stage: SchedulerStage): number {
		const index = this.stageOrder.indexOf(stage);

		if (index === -1) {
			throw new Error(`Scheduler stage "${stage}" is not registered.`);
		}

		return index;
	}

	private toScheduledSystem(
		system: System<TContext> | SystemUpdate<TContext>,
		options: RegisterSystemOptions,
	): ScheduledSystem<TContext> {
		if (typeof system === "function") {
			if (!options.id) {
				throw new Error("Function systems require an explicit id.");
			}

			return {
				id: options.id,
				order: options.order ?? 0,
				update: system,
			};
		}

		return {
			...system,
			order: options.order ?? system.order ?? 0,
		};
	}
}

function compareSystems<TContext>(
	left: ScheduledSystem<TContext>,
	right: ScheduledSystem<TContext>,
): number {
	return left.order - right.order || left.id.localeCompare(right.id);
}
