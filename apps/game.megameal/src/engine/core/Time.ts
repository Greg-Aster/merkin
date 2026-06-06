export type FixedStepOptions = {
	fixedDelta?: number;
	maxFrameDelta?: number;
	maxTicksPerFrame?: number;
};

export type FixedStepAdvance = {
	frameDelta: number;
	clampedDelta: number;
	fixedDelta: number;
	ticks: number;
	interpolation: number;
	accumulated: number;
	droppedTime: number;
};

export class FixedStep {
	readonly fixedDelta: number;
	readonly maxFrameDelta: number;
	readonly maxTicksPerFrame: number;

	private accumulator = 0;

	constructor(options: FixedStepOptions = {}) {
		this.fixedDelta = options.fixedDelta ?? 1 / 60;
		this.maxFrameDelta = options.maxFrameDelta ?? 0.25;
		this.maxTicksPerFrame = options.maxTicksPerFrame ?? 5;

		if (this.fixedDelta <= 0) {
			throw new Error("FixedStep fixedDelta must be greater than zero.");
		}

		if (this.maxFrameDelta <= 0) {
			throw new Error("FixedStep maxFrameDelta must be greater than zero.");
		}

		if (!Number.isInteger(this.maxTicksPerFrame) || this.maxTicksPerFrame < 1) {
			throw new Error("FixedStep maxTicksPerFrame must be a positive integer.");
		}
	}

	get accumulated(): number {
		return this.accumulator;
	}

	advance(frameDelta: number): FixedStepAdvance {
		const safeFrameDelta = Number.isFinite(frameDelta)
			? Math.max(0, frameDelta)
			: 0;
		const clampedDelta = Math.min(safeFrameDelta, this.maxFrameDelta);

		this.accumulator += clampedDelta;

		const availableTicks = Math.floor(this.accumulator / this.fixedDelta);
		const ticks = Math.min(availableTicks, this.maxTicksPerFrame);

		this.accumulator -= ticks * this.fixedDelta;

		const excessTicks = Math.max(0, availableTicks - ticks);
		const droppedTime = excessTicks * this.fixedDelta;

		if (droppedTime > 0) {
			this.accumulator -= droppedTime;
		}

		// Floating-point drift near zero should not leak into render interpolation.
		if (Math.abs(this.accumulator) < Number.EPSILON) {
			this.accumulator = 0;
		}

		return {
			frameDelta: safeFrameDelta,
			clampedDelta,
			fixedDelta: this.fixedDelta,
			ticks,
			interpolation: this.accumulator / this.fixedDelta,
			accumulated: this.accumulator,
			droppedTime,
		};
	}

	reset(accumulated = 0): void {
		this.accumulator = Math.max(0, accumulated);
	}
}
