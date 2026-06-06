import type {
	Command,
	CommandBus,
	ComponentName,
	ComponentValue,
	EngineEvent,
	Entity,
	EventBus,
	Scheduler,
	SchedulerStage,
	System,
} from "../../core/index.js";
import type { AssetId, AssetKind, AssetManifest } from "../assets/index.js";

export type DebugMetric = {
	readonly name: string;
	readonly value: number;
	readonly unit?: string;
};

export type DebugProbe = {
	readonly id: string;
	sample(): DebugMetric | readonly DebugMetric[];
};

export type DebugValue =
	| null
	| boolean
	| number
	| string
	| readonly DebugValue[]
	| { readonly [key: string]: DebugValue };

export type EntityComponentInspection = {
	readonly name: ComponentName;
	readonly present: boolean;
	readonly value?: ComponentValue;
};

export type EntityInspection = {
	readonly entity: Entity;
	readonly alive: boolean;
	readonly components: readonly EntityComponentInspection[];
};

export type EntityInspectionWorld = {
	isAlive(entity: Entity): boolean;
	entities(): Entity[];
	getComponent<TComponent = ComponentValue>(
		entity: Entity,
		componentName: ComponentName,
	): TComponent | undefined;
};

export function inspectEntity(
	world: EntityInspectionWorld,
	entity: Entity,
	componentNames: readonly ComponentName[] = [],
): EntityInspection {
	return {
		entity,
		alive: world.isAlive(entity),
		components: componentNames.map((name) => {
			const value = world.getComponent(entity, name);

			return {
				name,
				present: value !== undefined,
				value,
			};
		}),
	};
}

export function inspectEntities(
	world: EntityInspectionWorld,
	componentNames: readonly ComponentName[] = [],
): readonly EntityInspection[] {
	return world
		.entities()
		.map((entity) => inspectEntity(world, entity, componentNames));
}

export type ComponentInspection = {
	readonly name: ComponentName;
	readonly size: number;
	readonly entries: readonly {
		readonly entity: Entity;
		readonly value: ComponentValue;
	}[];
};

export type ComponentInspectionWorld = {
	getStorage<TComponent = ComponentValue>(
		componentName: ComponentName,
	):
		| {
				readonly size: number;
				entries(): Array<[Entity, TComponent]>;
		  }
		| undefined;
};

export function inspectComponent(
	world: ComponentInspectionWorld,
	componentName: ComponentName,
): ComponentInspection {
	const storage = world.getStorage(componentName);

	return {
		name: componentName,
		size: storage?.size ?? 0,
		entries:
			storage?.entries().map(([entity, value]) => ({
				entity,
				value,
			})) ?? [],
	};
}

export type SchedulerSystemInspection = {
	readonly id: string;
	readonly order: number;
	readonly reads: readonly string[];
	readonly writes: readonly string[];
};

export type SchedulerStageInspection = {
	readonly stage: SchedulerStage;
	readonly systemCount: number;
	readonly systems: readonly SchedulerSystemInspection[];
};

export type SchedulerInspection = {
	readonly stages: readonly SchedulerStageInspection[];
};

export function inspectScheduler<TContext>(
	scheduler: Scheduler<TContext>,
): SchedulerInspection {
	return {
		stages: scheduler.stages().map((stage) => {
			const systems = scheduler.systems(stage).map((system) => ({
				id: system.id,
				order: system.order ?? 0,
				reads: system.reads ?? [],
				writes: system.writes ?? [],
			}));

			return {
				stage,
				systemCount: systems.length,
				systems,
			};
		}),
	};
}

export type TimeSource = () => number;

export type SystemTimingSample = {
	readonly sequence: number;
	readonly stage: SchedulerStage;
	readonly systemId: string;
	readonly durationMs: number;
	readonly startedAtMs: number;
	readonly endedAtMs: number;
};

export type SystemTimingSummary = {
	readonly stage: SchedulerStage;
	readonly systemCount: number;
	readonly totalDurationMs: number;
	readonly maxDurationMs: number;
	readonly systems: readonly {
		readonly systemId: string;
		readonly samples: number;
		readonly totalDurationMs: number;
		readonly maxDurationMs: number;
	}[];
};

export class SystemTimingProfiler {
	readonly #now: TimeSource;
	#sequence = 0;
	#samples: SystemTimingSample[] = [];

	constructor(now: TimeSource = () => Date.now()) {
		this.#now = now;
	}

	measure<TValue>(
		stage: SchedulerStage,
		systemId: string,
		run: () => TValue,
	): TValue {
		const startedAtMs = this.#now();

		try {
			return run();
		} finally {
			const endedAtMs = this.#now();
			this.record({
				stage,
				systemId,
				startedAtMs,
				endedAtMs,
			});
		}
	}

	record(sample: {
		readonly stage: SchedulerStage;
		readonly systemId: string;
		readonly startedAtMs: number;
		readonly endedAtMs: number;
	}): SystemTimingSample {
		const timingSample = {
			sequence: this.#sequence,
			stage: sample.stage,
			systemId: sample.systemId,
			startedAtMs: sample.startedAtMs,
			endedAtMs: sample.endedAtMs,
			durationMs: Math.max(0, sample.endedAtMs - sample.startedAtMs),
		};

		this.#sequence += 1;
		this.#samples.push(timingSample);
		return timingSample;
	}

	samples(): readonly SystemTimingSample[] {
		return [...this.#samples];
	}

	summaries(): readonly SystemTimingSummary[] {
		const byStage = new Map<SchedulerStage, SystemTimingSample[]>();

		for (const sample of this.#samples) {
			const samples = byStage.get(sample.stage) ?? [];
			samples.push(sample);
			byStage.set(sample.stage, samples);
		}

		return [...byStage.entries()].map(([stage, samples]) => {
			const bySystem = new Map<string, SystemTimingSample[]>();

			for (const sample of samples) {
				const systemSamples = bySystem.get(sample.systemId) ?? [];
				systemSamples.push(sample);
				bySystem.set(sample.systemId, systemSamples);
			}

			const systems = [...bySystem.entries()].map(
				([systemId, systemSamples]) => {
					const durations = systemSamples.map((sample) => sample.durationMs);
					const totalDurationMs = sum(durations);

					return {
						systemId,
						samples: systemSamples.length,
						totalDurationMs,
						maxDurationMs: max(durations),
					};
				},
			);
			const stageDurations = samples.map((sample) => sample.durationMs);

			return {
				stage,
				systemCount: systems.length,
				totalDurationMs: sum(stageDurations),
				maxDurationMs: max(stageDurations),
				systems,
			};
		});
	}

	clear(): void {
		this.#samples = [];
	}
}

export function runProfiledSchedulerStage<TContext>(
	scheduler: Scheduler<TContext>,
	stage: SchedulerStage,
	context: TContext,
	profiler: SystemTimingProfiler,
): void {
	for (const system of scheduler.systems(stage)) {
		profiler.measure(stage, system.id, () => system.update(context));
	}
}

export function createProfiledSystem<TContext>(
	stage: SchedulerStage,
	system: System<TContext>,
	profiler: SystemTimingProfiler,
): System<TContext> {
	return {
		...system,
		update(context) {
			profiler.measure(stage, system.id, () => system.update(context));
		},
	};
}

export type AssetRegistryEntryInspection = {
	readonly id: AssetId;
	readonly kind: AssetKind;
	readonly url: string;
	readonly tags: readonly string[];
	readonly state: "registered" | "loading" | "loaded" | "retained" | "error";
	readonly refCount?: number;
};

export type AssetRegistryInspection = {
	readonly total: number;
	readonly byKind: Readonly<Record<AssetKind, number>>;
	readonly entries: readonly AssetRegistryEntryInspection[];
};

export type AssetRuntimeState = {
	readonly state?: AssetRegistryEntryInspection["state"];
	readonly refCount?: number;
};

export type AssetRuntimeStateProvider = (
	assetId: AssetId,
) => AssetRuntimeState | undefined;

export function inspectAssetRegistry(
	manifest: AssetManifest,
	getRuntimeState: AssetRuntimeStateProvider = () => undefined,
): AssetRegistryInspection {
	const byKind = {
		mesh: 0,
		material: 0,
		texture: 0,
		cubemap: 0,
		video: 0,
		audio: 0,
		animation: 0,
		prefab: 0,
		scene: 0,
		data: 0,
	} satisfies Record<AssetKind, number>;
	const entries = manifest.assets.map((entry) => {
		byKind[entry.kind] += 1;
		const runtimeState = getRuntimeState(entry.id);
		const inspectedEntry = {
			id: entry.id,
			kind: entry.kind,
			url: entry.url,
			...(entry.material ? { material: entry.material } : {}),
			tags: entry.tags ?? [],
			state: runtimeState?.state ?? "registered",
		};

		return runtimeState?.refCount === undefined
			? inspectedEntry
			: {
					...inspectedEntry,
					refCount: runtimeState.refCount,
				};
	});

	return {
		total: entries.length,
		byKind,
		entries,
	};
}

export type TraceKind = "command" | "event";

export type TraceRecord = {
	readonly sequence: number;
	readonly kind: TraceKind;
	readonly type: string;
	readonly tick?: number;
	readonly payload: Command | EngineEvent;
};

export class EventCommandTrace {
	#sequence = 0;
	#records: TraceRecord[] = [];

	recordCommand(command: Command, tick?: number): TraceRecord {
		return this.record("command", command, tick);
	}

	recordEvent(event: EngineEvent, tick?: number): TraceRecord {
		return this.record("event", event, tick);
	}

	records(): readonly TraceRecord[] {
		return [...this.#records];
	}

	clear(): void {
		this.#records = [];
	}

	private record(
		kind: TraceKind,
		payload: Command | EngineEvent,
		tick?: number,
	): TraceRecord {
		const record =
			tick === undefined
				? {
						sequence: this.#sequence,
						kind,
						type: payload.type,
						payload,
					}
				: {
						sequence: this.#sequence,
						kind,
						type: payload.type,
						tick,
						payload,
					};

		this.#sequence += 1;
		this.#records.push(record);
		return record;
	}
}

export function dispatchTracedCommand<TCommand extends Command>(
	commands: CommandBus<TCommand>,
	trace: EventCommandTrace,
	command: TCommand,
	tick?: number,
): void {
	trace.recordCommand(command, tick);
	commands.dispatch(command);
}

export function emitTracedEvent<TEvent extends EngineEvent>(
	events: EventBus<TEvent>,
	trace: EventCommandTrace,
	event: TEvent,
	tick?: number,
): void {
	trace.recordEvent(event, tick);
	events.emit(event);
}

export function traceQueuedCommands(
	commands: CommandBus,
	trace: EventCommandTrace,
	tick?: number,
): readonly TraceRecord[] {
	return commands.peek().map((command) => trace.recordCommand(command, tick));
}

export function traceQueuedEvents(
	events: EventBus,
	trace: EventCommandTrace,
	tick?: number,
): readonly TraceRecord[] {
	return events.peek().map((event) => trace.recordEvent(event, tick));
}

export type SceneResourceKind =
	| "entity"
	| "asset"
	| "listener"
	| "timer"
	| "worker"
	| "render-object"
	| "physics-body"
	| "audio-node";

export type SceneResourceKey = {
	readonly kind: SceneResourceKind;
	readonly id: string;
};

export type SceneLeak = SceneResourceKey & {
	readonly retainedCount: number;
};

export type SceneLeakReport = {
	readonly sceneId: string;
	readonly leaked: boolean;
	readonly ownedCount: number;
	readonly releasedCount: number;
	readonly leaks: readonly SceneLeak[];
};

export class SceneLeakTracker {
	readonly sceneId: string;
	#owned = new Map<string, SceneLeak>();
	#ownedCount = 0;
	#releasedCount = 0;

	constructor(sceneId: string) {
		this.sceneId = sceneId;
	}

	own(resource: SceneResourceKey): void {
		this.#ownedCount += 1;
		const key = resourceKey(resource);
		const existing = this.#owned.get(key);

		this.#owned.set(key, {
			...resource,
			retainedCount: (existing?.retainedCount ?? 0) + 1,
		});
	}

	release(resource: SceneResourceKey): void {
		const key = resourceKey(resource);
		const existing = this.#owned.get(key);

		if (!existing) {
			return;
		}

		this.#releasedCount += 1;

		if (existing.retainedCount <= 1) {
			this.#owned.delete(key);
			return;
		}

		this.#owned.set(key, {
			...existing,
			retainedCount: existing.retainedCount - 1,
		});
	}

	report(): SceneLeakReport {
		const leaks = [...this.#owned.values()].sort((left, right) => {
			const kindOrder = left.kind.localeCompare(right.kind);
			return kindOrder || left.id.localeCompare(right.id);
		});

		return {
			sceneId: this.sceneId,
			leaked: leaks.length > 0,
			ownedCount: this.#ownedCount,
			releasedCount: this.#releasedCount,
			leaks,
		};
	}

	clear(): void {
		this.#owned.clear();
		this.#ownedCount = 0;
		this.#releasedCount = 0;
	}
}

export type ReplaySnapshot = {
	readonly tick: number;
	readonly state: unknown;
};

export type ReplaySnapshotComparison = {
	readonly tick: number;
	readonly matched: boolean;
	readonly expectedHash: string;
	readonly actualHash: string;
};

export type ReplayCheckResult = {
	readonly deterministic: boolean;
	readonly comparisons: readonly ReplaySnapshotComparison[];
};

export function stableSerialize(value: unknown): string {
	return JSON.stringify(normalizeForStableSerialization(value));
}

export function stableHash(value: unknown): string {
	const text = stableSerialize(value);
	let hash = 0x811c9dc5;

	for (let i = 0; i < text.length; i += 1) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}

	return (hash >>> 0).toString(16).padStart(8, "0");
}

export class DeterministicReplayChecker {
	compare(
		expectedSnapshots: readonly ReplaySnapshot[],
		actualSnapshots: readonly ReplaySnapshot[],
	): ReplayCheckResult {
		const actualByTick = new Map(
			actualSnapshots.map((snapshot) => [snapshot.tick, snapshot]),
		);
		const comparisons = expectedSnapshots.map((expected) => {
			const actual = actualByTick.get(expected.tick);
			const expectedHash = stableHash(expected.state);
			const actualHash =
				actual === undefined ? "missing" : stableHash(actual.state);

			return {
				tick: expected.tick,
				matched: expectedHash === actualHash,
				expectedHash,
				actualHash,
			};
		});

		return {
			deterministic: comparisons.every((comparison) => comparison.matched),
			comparisons,
		};
	}
}

function resourceKey(resource: SceneResourceKey): string {
	return `${resource.kind}:${resource.id}`;
}

function sum(values: readonly number[]): number {
	return values.reduce((total, value) => total + value, 0);
}

function max(values: readonly number[]): number {
	return values.length === 0 ? 0 : Math.max(...values);
}

function normalizeForStableSerialization(
	value: unknown,
	seen = new WeakSet<object>(),
): DebugValue {
	if (
		value === null ||
		typeof value === "boolean" ||
		typeof value === "number" ||
		typeof value === "string"
	) {
		return value;
	}

	if (typeof value === "bigint") {
		return value.toString();
	}

	if (Array.isArray(value)) {
		return value.map((item) => normalizeForStableSerialization(item, seen));
	}

	if (typeof value !== "object") {
		return String(value);
	}

	if (seen.has(value)) {
		return "[Circular]";
	}

	seen.add(value);

	const entries = Object.entries(value as Record<string, unknown>)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, entryValue]) => [
			key,
			normalizeForStableSerialization(entryValue, seen),
		]);

	seen.delete(value);
	return Object.fromEntries(entries) as { readonly [key: string]: DebugValue };
}
