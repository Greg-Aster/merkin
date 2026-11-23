import type { PerformanceConfig } from "../types.js";

export const STREAMING_POLICY_MODES = ["off", "diagnostic", "plan"] as const;
export const STREAMING_ACTIVE_POLICY_MODES = ["plan"] as const;
export const STREAMING_CHUNK_ROLES = [
	"startup",
	"resident",
	"streamable",
] as const;

export type StreamingPolicyMode = (typeof STREAMING_POLICY_MODES)[number];
export type StreamingActivePolicyMode =
	(typeof STREAMING_ACTIVE_POLICY_MODES)[number];
export type StreamingChunkRole = (typeof STREAMING_CHUNK_ROLES)[number];
export type StreamingVector3 = readonly [number, number, number];
export type StreamingDistanceSource = "player" | "camera" | "nearest";

export type StreamingPerformanceConfigLike =
	| Pick<PerformanceConfig, "systems">
	| {
			readonly systems?: {
				readonly streaming?: {
					readonly mode?: unknown;
				};
			};
	  };

export type StreamingChunkContent = {
	readonly assetIds?: readonly string[];
	readonly renderStableIds?: readonly string[];
	readonly lightStableIds?: readonly string[];
	readonly colliderStableIds?: readonly string[];
};

export type StreamingChunkDefinition = {
	readonly id: string;
	readonly role: StreamingChunkRole;
	readonly content?: StreamingChunkContent;
	readonly center?: StreamingVector3;
	readonly loadRadius?: number;
	readonly unloadRadius?: number;
	readonly priority?: number;
};

export type StreamingFocus = {
	readonly playerPosition?: StreamingVector3;
	readonly cameraPosition?: StreamingVector3;
};

export type StreamingResidencyState = {
	readonly loadedChunkIds?: readonly string[];
	readonly loadingChunkIds?: readonly string[];
	readonly unloadingChunkIds?: readonly string[];
};

export type StreamingPlanInput = {
	readonly mode?: StreamingPolicyMode | string;
	readonly performanceConfig?: StreamingPerformanceConfigLike;
	readonly chunks: readonly StreamingChunkDefinition[];
	readonly residency?: StreamingResidencyState;
	readonly focus?: StreamingFocus;
	readonly defaultLoadRadius?: number;
	readonly defaultUnloadRadius?: number;
	readonly distanceSource?: StreamingDistanceSource;
};

export type StreamingChunkDecisionReason =
	| "startup-required"
	| "resident-required"
	| "within-load-radius"
	| "retained-by-hysteresis"
	| "outside-load-radius"
	| "outside-unload-radius"
	| "missing-focus"
	| "inactive-mode"
	| "invalid-plan";

export type StreamingChunkDecision = {
	readonly chunkId: string;
	readonly role: StreamingChunkRole;
	readonly desired: boolean;
	readonly loaded: boolean;
	readonly loading: boolean;
	readonly unloading: boolean;
	readonly reason: StreamingChunkDecisionReason;
	readonly distance?: number;
	readonly loadRadius?: number;
	readonly unloadRadius?: number;
};

export type StreamingPlanOperationKind = "load-chunk" | "unload-chunk";

export type StreamingPlanOperation = {
	readonly kind: StreamingPlanOperationKind;
	readonly chunkId: string;
	readonly role: StreamingChunkRole;
	readonly reason: StreamingChunkDecisionReason;
	readonly priority: number;
	readonly content: Required<StreamingChunkContent>;
};

export type StreamingPlan = {
	readonly mode: StreamingPolicyMode | "unsupported";
	readonly active: boolean;
	readonly startupChunkIds: readonly string[];
	readonly residentChunkIds: readonly string[];
	readonly streamableChunkIds: readonly string[];
	readonly readinessRequiredChunkIds: readonly string[];
	readonly desiredLoadedChunkIds: readonly string[];
	readonly loadChunkIds: readonly string[];
	readonly unloadChunkIds: readonly string[];
	readonly decisions: readonly StreamingChunkDecision[];
	readonly operations: readonly StreamingPlanOperation[];
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
};

const DEFAULT_STREAMING_LOAD_RADIUS = 24;
const DEFAULT_STREAMING_UNLOAD_RADIUS = 32;

export function createStreamingPlan(input: StreamingPlanInput): StreamingPlan {
	const modeResult = resolveStreamingPolicyMode(input);
	const validation = validateStreamingPlanInput(input);
	const errors = [...modeResult.errors, ...validation.errors];
	const warnings = [...validation.warnings];
	const sortedChunks = sortChunks(input.chunks);
	const startupChunkIds = sortedChunkIdsByRole(sortedChunks, "startup");
	const residentChunkIds = sortedChunkIdsByRole(sortedChunks, "resident");
	const streamableChunkIds = sortedChunkIdsByRole(sortedChunks, "streamable");
	const active =
		modeResult.mode === "plan" &&
		errors.length === 0 &&
		STREAMING_ACTIVE_POLICY_MODES.includes(modeResult.mode);
	const loadedChunkIds = new Set(input.residency?.loadedChunkIds ?? []);
	const loadingChunkIds = new Set(input.residency?.loadingChunkIds ?? []);
	const unloadingChunkIds = new Set(input.residency?.unloadingChunkIds ?? []);
	const decisions = sortedChunks.map((chunk) =>
		createChunkDecision({
			active,
			chunk,
			distanceSource: input.distanceSource ?? "nearest",
			focus: input.focus,
			loadedChunkIds,
			loadingChunkIds,
			unloadingChunkIds,
			defaultLoadRadius:
				input.defaultLoadRadius ?? DEFAULT_STREAMING_LOAD_RADIUS,
			defaultUnloadRadius:
				input.defaultUnloadRadius ?? DEFAULT_STREAMING_UNLOAD_RADIUS,
		}),
	);
	const desiredLoadedChunkIds = active
		? decisions
				.filter((decision) => decision.desired)
				.map((decision) => decision.chunkId)
		: [];
	const loadChunkIds = active
		? decisions
				.filter(
					(decision) =>
						decision.desired && !decision.loaded && !decision.loading,
				)
				.map((decision) => decision.chunkId)
		: [];
	const unloadChunkIds = active
		? decisions
				.filter(
					(decision) =>
						!decision.desired && decision.loaded && !decision.unloading,
				)
				.map((decision) => decision.chunkId)
		: [];
	const operations = active
		? createStreamingOperations({
				chunks: sortedChunks,
				decisions,
				loadChunkIds,
				unloadChunkIds,
			})
		: [];

	if (
		active &&
		streamableChunkIds.length > 0 &&
		!input.focus?.playerPosition &&
		!input.focus?.cameraPosition
	) {
		warnings.push(
			"streaming focus is missing; loaded streamable chunks are retained and unloaded streamable chunks stay unloaded.",
		);
	}

	return {
		mode: modeResult.mode,
		active,
		startupChunkIds,
		residentChunkIds,
		streamableChunkIds,
		readinessRequiredChunkIds: startupChunkIds,
		desiredLoadedChunkIds,
		loadChunkIds,
		unloadChunkIds,
		decisions,
		operations,
		errors,
		warnings,
	};
}

export function validateStreamingPlanInput(
	input: Pick<
		StreamingPlanInput,
		"chunks" | "defaultLoadRadius" | "defaultUnloadRadius" | "focus"
	>,
): {
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];
	const chunkIds = new Set<string>();
	const defaultLoadRadius =
		input.defaultLoadRadius ?? DEFAULT_STREAMING_LOAD_RADIUS;
	const defaultUnloadRadius =
		input.defaultUnloadRadius ?? DEFAULT_STREAMING_UNLOAD_RADIUS;

	validateRadius(defaultLoadRadius, "defaultLoadRadius", errors);
	validateRadius(defaultUnloadRadius, "defaultUnloadRadius", errors);
	if (
		Number.isFinite(defaultLoadRadius) &&
		Number.isFinite(defaultUnloadRadius) &&
		defaultUnloadRadius < defaultLoadRadius
	) {
		errors.push(
			"defaultUnloadRadius must be greater than or equal to defaultLoadRadius.",
		);
	}

	validateOptionalVector(
		input.focus?.playerPosition,
		"focus.playerPosition",
		errors,
	);
	validateOptionalVector(
		input.focus?.cameraPosition,
		"focus.cameraPosition",
		errors,
	);

	for (const chunk of input.chunks) {
		if (typeof chunk.id !== "string" || chunk.id.trim().length === 0) {
			errors.push("streaming chunk id must be a non-empty string.");
		} else if (chunkIds.has(chunk.id)) {
			errors.push(`streaming chunk id "${chunk.id}" must be unique.`);
		} else {
			chunkIds.add(chunk.id);
		}

		if (!STREAMING_CHUNK_ROLES.includes(chunk.role)) {
			errors.push(
				`streaming chunk "${chunk.id}" has unsupported role "${chunk.role}".`,
			);
		}

		validateChunkContent(chunk, errors);
		validateOptionalRadius(chunk.loadRadius, `${chunk.id}.loadRadius`, errors);
		validateOptionalRadius(
			chunk.unloadRadius,
			`${chunk.id}.unloadRadius`,
			errors,
		);

		if (chunk.priority !== undefined && !Number.isFinite(chunk.priority)) {
			errors.push(`streaming chunk "${chunk.id}" priority must be finite.`);
		}

		if (chunk.role === "streamable") {
			validateOptionalVector(chunk.center, `${chunk.id}.center`, errors);
			if (!chunk.center) {
				errors.push(`streamable chunk "${chunk.id}" must declare a center.`);
			}
			const loadRadius = chunk.loadRadius ?? defaultLoadRadius;
			const unloadRadius = chunk.unloadRadius ?? defaultUnloadRadius;
			if (
				Number.isFinite(loadRadius) &&
				Number.isFinite(unloadRadius) &&
				unloadRadius < loadRadius
			) {
				errors.push(
					`streamable chunk "${chunk.id}" unloadRadius must be greater than or equal to loadRadius.`,
				);
			}
		} else if (chunk.center) {
			warnings.push(
				`non-streamable chunk "${chunk.id}" declares a center; startup and resident chunks ignore distance.`,
			);
		}
	}

	return { errors, warnings };
}

function resolveStreamingPolicyMode(
	input: Pick<StreamingPlanInput, "mode" | "performanceConfig">,
): {
	readonly mode: StreamingPolicyMode | "unsupported";
	readonly errors: readonly string[];
} {
	const rawMode =
		input.mode ?? input.performanceConfig?.systems?.streaming?.mode ?? "off";

	if (typeof rawMode !== "string") {
		return {
			mode: "unsupported",
			errors: ["streaming mode must be a string."],
		};
	}

	if (STREAMING_POLICY_MODES.includes(rawMode as StreamingPolicyMode)) {
		return {
			mode: rawMode as StreamingPolicyMode,
			errors: [],
		};
	}

	return {
		mode: "unsupported",
		errors: [`streaming mode "${rawMode}" is not supported.`],
	};
}

function createChunkDecision(input: {
	readonly active: boolean;
	readonly chunk: StreamingChunkDefinition;
	readonly distanceSource: StreamingDistanceSource;
	readonly focus: StreamingFocus | undefined;
	readonly loadedChunkIds: ReadonlySet<string>;
	readonly loadingChunkIds: ReadonlySet<string>;
	readonly unloadingChunkIds: ReadonlySet<string>;
	readonly defaultLoadRadius: number;
	readonly defaultUnloadRadius: number;
}): StreamingChunkDecision {
	const loaded = input.loadedChunkIds.has(input.chunk.id);
	const loading = input.loadingChunkIds.has(input.chunk.id);
	const unloading = input.unloadingChunkIds.has(input.chunk.id);

	if (!input.active) {
		return {
			chunkId: input.chunk.id,
			role: input.chunk.role,
			desired: false,
			loaded,
			loading,
			unloading,
			reason: "inactive-mode",
		};
	}

	if (input.chunk.role === "startup") {
		return {
			chunkId: input.chunk.id,
			role: input.chunk.role,
			desired: true,
			loaded,
			loading,
			unloading,
			reason: "startup-required",
		};
	}

	if (input.chunk.role === "resident") {
		return {
			chunkId: input.chunk.id,
			role: input.chunk.role,
			desired: true,
			loaded,
			loading,
			unloading,
			reason: "resident-required",
		};
	}

	const loadRadius = input.chunk.loadRadius ?? input.defaultLoadRadius;
	const unloadRadius = input.chunk.unloadRadius ?? input.defaultUnloadRadius;
	const distance = input.chunk.center
		? distanceToStreamingFocus(
				input.chunk.center,
				input.focus,
				input.distanceSource,
			)
		: undefined;

	if (distance === undefined) {
		return {
			chunkId: input.chunk.id,
			role: input.chunk.role,
			desired: loaded || loading,
			loaded,
			loading,
			unloading,
			reason: "missing-focus",
			loadRadius,
			unloadRadius,
		};
	}

	if (loaded || loading) {
		const desired = distance <= unloadRadius;
		return {
			chunkId: input.chunk.id,
			role: input.chunk.role,
			desired,
			loaded,
			loading,
			unloading,
			reason: desired ? "retained-by-hysteresis" : "outside-unload-radius",
			distance,
			loadRadius,
			unloadRadius,
		};
	}

	const desired = distance <= loadRadius;
	return {
		chunkId: input.chunk.id,
		role: input.chunk.role,
		desired,
		loaded,
		loading,
		unloading,
		reason: desired ? "within-load-radius" : "outside-load-radius",
		distance,
		loadRadius,
		unloadRadius,
	};
}

function createStreamingOperations(input: {
	readonly chunks: readonly StreamingChunkDefinition[];
	readonly decisions: readonly StreamingChunkDecision[];
	readonly loadChunkIds: readonly string[];
	readonly unloadChunkIds: readonly string[];
}): readonly StreamingPlanOperation[] {
	const chunksById = new Map(input.chunks.map((chunk) => [chunk.id, chunk]));
	const decisionsById = new Map(
		input.decisions.map((decision) => [decision.chunkId, decision]),
	);
	const operations: StreamingPlanOperation[] = [];

	for (const chunkId of input.loadChunkIds) {
		const chunk = chunksById.get(chunkId);
		const decision = decisionsById.get(chunkId);
		if (chunk && decision) {
			operations.push(createStreamingOperation("load-chunk", chunk, decision));
		}
	}

	for (const chunkId of input.unloadChunkIds) {
		const chunk = chunksById.get(chunkId);
		const decision = decisionsById.get(chunkId);
		if (chunk && decision) {
			operations.push(
				createStreamingOperation("unload-chunk", chunk, decision),
			);
		}
	}

	return operations.sort(compareStreamingOperations);
}

function createStreamingOperation(
	kind: StreamingPlanOperationKind,
	chunk: StreamingChunkDefinition,
	decision: StreamingChunkDecision,
): StreamingPlanOperation {
	return {
		kind,
		chunkId: chunk.id,
		role: chunk.role,
		reason: decision.reason,
		priority: operationPriority(chunk),
		content: normalizeChunkContent(chunk.content),
	};
}

function operationPriority(chunk: StreamingChunkDefinition): number {
	const basePriority =
		chunk.role === "startup"
			? 300_000
			: chunk.role === "resident"
				? 200_000
				: 100_000;

	return basePriority + (chunk.priority ?? 0);
}

function compareStreamingOperations(
	left: StreamingPlanOperation,
	right: StreamingPlanOperation,
): number {
	if (left.kind !== right.kind) {
		return left.kind === "load-chunk" ? -1 : 1;
	}

	if (left.priority !== right.priority) {
		return right.priority - left.priority;
	}

	return left.chunkId.localeCompare(right.chunkId);
}

function distanceToStreamingFocus(
	center: StreamingVector3,
	focus: StreamingFocus | undefined,
	distanceSource: StreamingDistanceSource,
): number | undefined {
	const playerDistance = focus?.playerPosition
		? distanceBetween(center, focus.playerPosition)
		: undefined;
	const cameraDistance = focus?.cameraPosition
		? distanceBetween(center, focus.cameraPosition)
		: undefined;

	if (distanceSource === "player") {
		return playerDistance;
	}

	if (distanceSource === "camera") {
		return cameraDistance;
	}

	if (playerDistance === undefined) {
		return cameraDistance;
	}

	if (cameraDistance === undefined) {
		return playerDistance;
	}

	return Math.min(playerDistance, cameraDistance);
}

function distanceBetween(
	left: StreamingVector3,
	right: StreamingVector3,
): number {
	const dx = left[0] - right[0];
	const dy = left[1] - right[1];
	const dz = left[2] - right[2];

	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function sortedChunkIdsByRole(
	chunks: readonly StreamingChunkDefinition[],
	role: StreamingChunkRole,
): readonly string[] {
	return chunks.filter((chunk) => chunk.role === role).map((chunk) => chunk.id);
}

function sortChunks(
	chunks: readonly StreamingChunkDefinition[],
): readonly StreamingChunkDefinition[] {
	return [...chunks].sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeChunkContent(
	content: StreamingChunkContent | undefined,
): Required<StreamingChunkContent> {
	return {
		assetIds: uniqueSorted(content?.assetIds ?? []),
		renderStableIds: uniqueSorted(content?.renderStableIds ?? []),
		lightStableIds: uniqueSorted(content?.lightStableIds ?? []),
		colliderStableIds: uniqueSorted(content?.colliderStableIds ?? []),
	};
}

function uniqueSorted(values: readonly string[]): readonly string[] {
	return Array.from(new Set(values)).sort((left, right) =>
		left.localeCompare(right),
	);
}

function validateChunkContent(
	chunk: StreamingChunkDefinition,
	errors: string[],
): void {
	for (const [field, values] of Object.entries(chunk.content ?? {})) {
		if (!Array.isArray(values)) {
			errors.push(
				`streaming chunk "${chunk.id}" content.${field} must be an array.`,
			);
			continue;
		}

		for (const value of values) {
			if (typeof value !== "string" || value.trim().length === 0) {
				errors.push(
					`streaming chunk "${chunk.id}" content.${field} values must be non-empty strings.`,
				);
			}
		}
	}
}

function validateOptionalVector(
	value: StreamingVector3 | undefined,
	label: string,
	errors: string[],
): void {
	if (value === undefined) {
		return;
	}

	if (value.length !== 3 || value.some((part) => !Number.isFinite(part))) {
		errors.push(`${label} must be a finite [x, y, z] vector.`);
	}
}

function validateOptionalRadius(
	value: number | undefined,
	label: string,
	errors: string[],
): void {
	if (value === undefined) {
		return;
	}

	validateRadius(value, label, errors);
}

function validateRadius(value: number, label: string, errors: string[]): void {
	if (!Number.isFinite(value) || value < 0) {
		errors.push(`${label} must be a finite non-negative number.`);
	}
}
