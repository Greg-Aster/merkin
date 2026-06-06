import type { Command, ComponentName, World } from "../../core/index.js";
import {
	type WorldSnapshot,
	serializeWorld,
	stableStringify,
} from "../serializers/index.js";

export type ReplayCommandFrame<TCommand extends Command = Command> = {
	readonly tick: number;
	readonly commands: readonly TCommand[];
};

export type ReplaySnapshotCheckpoint = {
	readonly tick: number;
	readonly fingerprint: string;
	readonly snapshot: WorldSnapshot;
};

export type ReplayLog<TCommand extends Command = Command> = {
	readonly schemaVersion: 1;
	readonly seed: string;
	readonly fixedDeltaSeconds: number;
	readonly initialSnapshot?: WorldSnapshot;
	readonly frames: readonly ReplayCommandFrame<TCommand>[];
	readonly checkpoints?: readonly ReplaySnapshotCheckpoint[];
};

export type ReplaySnapshotOptions = {
	readonly componentNames: readonly ComponentName[];
	readonly sceneId?: string;
	readonly tick?: number;
};

export class ReplayRecorder<TCommand extends Command = Command> {
	readonly seed: string;
	readonly fixedDeltaSeconds: number;

	#frames = new Map<number, TCommand[]>();
	#initialSnapshot: WorldSnapshot | undefined;
	#checkpoints: ReplaySnapshotCheckpoint[] = [];

	constructor(options: {
		readonly seed: string;
		readonly fixedDeltaSeconds: number;
		readonly initialSnapshot?: WorldSnapshot;
	}) {
		if (options.seed.length === 0) {
			throw new Error("Replay seed must be a non-empty string.");
		}

		if (
			!Number.isFinite(options.fixedDeltaSeconds) ||
			options.fixedDeltaSeconds <= 0
		) {
			throw new Error("Replay fixedDeltaSeconds must be a positive number.");
		}

		this.seed = options.seed;
		this.fixedDeltaSeconds = options.fixedDeltaSeconds;
		this.#initialSnapshot = options.initialSnapshot;
	}

	recordCommands(tick: number, commands: readonly TCommand[]): void {
		assertReplayTick(tick);

		if (commands.length === 0) {
			return;
		}

		const existing = this.#frames.get(tick) ?? [];
		existing.push(...cloneCommands(commands));
		this.#frames.set(tick, existing);
	}

	recordCheckpoint(
		tick: number,
		world: World,
		options: ReplaySnapshotOptions,
	): void {
		assertReplayTick(tick);

		const snapshot = createReplaySnapshot(world, {
			...options,
			tick,
		});

		this.#checkpoints.push({
			tick,
			fingerprint: fingerprintSnapshot(snapshot),
			snapshot,
		});
	}

	toLog(): ReplayLog<TCommand> {
		const frames = [...this.#frames.entries()]
			.sort(([left], [right]) => left - right)
			.map(([tick, commands]) => ({
				tick,
				commands: cloneCommands(commands),
			}));

		return {
			schemaVersion: 1,
			seed: this.seed,
			fixedDeltaSeconds: this.fixedDeltaSeconds,
			...(this.#initialSnapshot
				? { initialSnapshot: this.#initialSnapshot }
				: {}),
			frames,
			...(this.#checkpoints.length > 0
				? { checkpoints: [...this.#checkpoints] }
				: {}),
		};
	}
}

export function commandsForTick<TCommand extends Command>(
	replay: ReplayLog<TCommand>,
	tick: number,
): readonly TCommand[] {
	assertReplayTick(tick);
	return replay.frames.find((frame) => frame.tick === tick)?.commands ?? [];
}

export function createReplaySnapshot(
	world: World,
	options: ReplaySnapshotOptions,
): WorldSnapshot {
	return serializeWorld(world, {
		componentNames: options.componentNames,
		...(options.sceneId ? { sceneId: options.sceneId } : {}),
		...(options.tick !== undefined ? { tick: options.tick } : {}),
	});
}

export function fingerprintSnapshot(snapshot: WorldSnapshot): string {
	return stableStringify(snapshot);
}

export function compareReplaySnapshots(
	expected: WorldSnapshot,
	actual: WorldSnapshot,
): {
	readonly ok: boolean;
	readonly expectedFingerprint: string;
	readonly actualFingerprint: string;
} {
	const expectedFingerprint = fingerprintSnapshot(expected);
	const actualFingerprint = fingerprintSnapshot(actual);

	return {
		ok: expectedFingerprint === actualFingerprint,
		expectedFingerprint,
		actualFingerprint,
	};
}

export function validateReplayLog(replay: ReplayLog): readonly string[] {
	const errors: string[] = [];

	if (replay.schemaVersion !== 1) {
		errors.push("replay.schemaVersion must be 1.");
	}

	if (replay.seed.length === 0) {
		errors.push("replay.seed must be a non-empty string.");
	}

	if (
		!Number.isFinite(replay.fixedDeltaSeconds) ||
		replay.fixedDeltaSeconds <= 0
	) {
		errors.push("replay.fixedDeltaSeconds must be a positive number.");
	}

	let previousTick = -1;

	for (const frame of replay.frames) {
		if (!Number.isSafeInteger(frame.tick) || frame.tick < 0) {
			errors.push(`replay frame tick ${frame.tick} is invalid.`);
		}

		if (frame.tick <= previousTick) {
			errors.push("replay frames must be sorted by ascending unique tick.");
		}

		previousTick = frame.tick;
	}

	return errors;
}

function assertReplayTick(tick: number): void {
	if (!Number.isSafeInteger(tick) || tick < 0) {
		throw new Error(
			`Replay tick must be a non-negative safe integer: ${tick}.`,
		);
	}
}

function cloneCommands<TCommand extends Command>(
	commands: readonly TCommand[],
): TCommand[] {
	return JSON.parse(JSON.stringify(commands)) as TCommand[];
}
