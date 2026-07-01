import type {
	PerformanceConfig,
	PerformanceCullingSystemMode,
} from "../types.js";

export const CULLING_POLICY_RESULT_COMPONENT = "PerformanceCullingPolicyResult";

export type CullingVector3 = {
	readonly x: number;
	readonly y: number;
	readonly z: number;
};

export type CullingPlane = {
	readonly normal: CullingVector3;
	readonly constant: number;
};

export type CullingFrustumInput =
	| {
			readonly kind: "planes";
			readonly planes: readonly CullingPlane[];
	  }
	| {
			readonly kind: "visibility-state";
			readonly state: CullingFrustumRelation;
	  };

export type CullingFrustumRelation =
	| "inside"
	| "intersecting"
	| "outside"
	| "unknown";

export type CullingPolicyMode = Extract<
	PerformanceCullingSystemMode,
	"off" | "diagnostic" | "distance"
>;

export type CullingHysteresisPolicy = {
	readonly distance: number;
	readonly frustum: number;
};

export type CullingPolicy = {
	readonly mode: CullingPolicyMode;
	readonly observerPosition: CullingVector3;
	readonly frustum?: CullingFrustumInput;
	readonly defaultRelevanceRadius?: number;
	readonly defaultUpdateRelevanceRadius?: number;
	readonly defaultRenderRelevanceRadius?: number;
	readonly hysteresis?: Partial<CullingHysteresisPolicy>;
	readonly applyFrustumToUpdates?: boolean;
};

export type CullingSubject = {
	readonly id: string;
	readonly position: CullingVector3;
	readonly boundsRadius?: number;
	readonly relevanceRadius?: number;
	readonly updateRelevanceRadius?: number;
	readonly renderRelevanceRadius?: number;
	readonly alwaysInclude?: boolean;
};

export type PreviousCullingDecision = {
	readonly updateIncluded: boolean;
	readonly renderIncluded: boolean;
};

export type CullingDistanceDecision = {
	readonly included: boolean;
	readonly reason:
		| "always-include"
		| "no-relevance-radius"
		| "within-relevance-radius"
		| "outside-relevance-radius";
	readonly distance: number;
	readonly relevanceRadius?: number;
	readonly thresholdRadius?: number;
};

export type CullingFrustumDecision = {
	readonly included: boolean;
	readonly relation: CullingFrustumRelation;
	readonly reason:
		| "always-include"
		| "no-frustum"
		| "visibility-state"
		| "sphere-inside-frustum"
		| "sphere-intersects-frustum"
		| "sphere-outside-frustum";
	readonly boundsRadius: number;
	readonly thresholdRadius: number;
};

export type CullingSubjectDecision = {
	readonly id: string;
	readonly mode: CullingPolicyMode;
	readonly active: boolean;
	readonly updateIncluded: boolean;
	readonly renderIncluded: boolean;
	readonly distanceToObserver: number;
	readonly updateDistance: CullingDistanceDecision;
	readonly renderDistance: CullingDistanceDecision;
	readonly frustum: CullingFrustumDecision;
	readonly reasons: readonly string[];
};

export type CullingPolicyOptions = Omit<CullingPolicy, "mode">;

export function cullingModeFromPerformanceConfig(
	config: Pick<PerformanceConfig, "systems"> | undefined,
): CullingPolicyMode {
	const mode = config?.systems.culling.mode ?? "off";

	if (mode === "off" || mode === "diagnostic" || mode === "distance") {
		return mode;
	}

	throw new Error(`Unsupported culling performance mode "${String(mode)}".`);
}

export function createCullingPolicyFromPerformanceConfig(
	config: Pick<PerformanceConfig, "systems"> | undefined,
	options: CullingPolicyOptions,
): CullingPolicy {
	return {
		...options,
		mode: cullingModeFromPerformanceConfig(config),
	};
}

export function evaluateCullingBatch(
	policy: CullingPolicy,
	subjects: readonly CullingSubject[],
	previousDecisions: ReadonlyMap<string, PreviousCullingDecision> = new Map(),
): readonly CullingSubjectDecision[] {
	return subjects.map((subject) =>
		evaluateCullingSubject(policy, subject, previousDecisions.get(subject.id)),
	);
}

export function evaluateCullingSubject(
	policy: CullingPolicy,
	subject: CullingSubject,
	previous?: PreviousCullingDecision,
): CullingSubjectDecision {
	validatePolicy(policy);
	validateSubject(subject);

	const distanceToObserver = distance(
		policy.observerPosition,
		subject.position,
	);
	const alwaysInclude = subject.alwaysInclude === true || policy.mode === "off";
	const updateRelevanceRadius = resolveUpdateRadius(policy, subject);
	const updateDistance = evaluateDistanceInclusion({
		alwaysInclude,
		distance: distanceToObserver,
		...(updateRelevanceRadius !== undefined
			? { relevanceRadius: updateRelevanceRadius }
			: {}),
		hysteresisRadius: resolveDistanceHysteresis(policy),
		previousIncluded: previous?.updateIncluded ?? false,
	});
	const renderRelevanceRadius = resolveRenderRadius(policy, subject);
	const renderDistance = evaluateDistanceInclusion({
		alwaysInclude,
		distance: distanceToObserver,
		...(renderRelevanceRadius !== undefined
			? { relevanceRadius: renderRelevanceRadius }
			: {}),
		hysteresisRadius: resolveDistanceHysteresis(policy),
		previousIncluded: previous?.renderIncluded ?? false,
	});
	const frustum = evaluateFrustumInclusion({
		alwaysInclude,
		center: subject.position,
		boundsRadius: subject.boundsRadius ?? 0,
		...(policy.frustum ? { frustum: policy.frustum } : {}),
		hysteresisRadius: resolveFrustumHysteresis(policy),
		previousIncluded: previous?.renderIncluded ?? false,
	});

	const renderIncluded = renderDistance.included && frustum.included;
	const updateIncluded =
		updateDistance.included &&
		(policy.applyFrustumToUpdates === true ? frustum.included : true);

	return {
		id: subject.id,
		mode: policy.mode,
		active: policy.mode !== "off",
		updateIncluded,
		renderIncluded,
		distanceToObserver,
		updateDistance,
		renderDistance,
		frustum,
		reasons: cullingReasons({
			mode: policy.mode,
			alwaysInclude: subject.alwaysInclude === true,
			updateIncluded,
			renderIncluded,
			updateDistance,
			renderDistance,
			frustum,
			applyFrustumToUpdates: policy.applyFrustumToUpdates === true,
		}),
	};
}

export function evaluateDistanceInclusion(options: {
	readonly alwaysInclude?: boolean;
	readonly distance: number;
	readonly relevanceRadius?: number;
	readonly hysteresisRadius?: number;
	readonly previousIncluded?: boolean;
}): CullingDistanceDecision {
	assertFiniteNonNegative(options.distance, "distance");

	if (options.alwaysInclude === true) {
		return {
			included: true,
			reason: "always-include",
			distance: options.distance,
		};
	}

	if (options.relevanceRadius === undefined) {
		return {
			included: true,
			reason: "no-relevance-radius",
			distance: options.distance,
		};
	}

	assertFiniteNonNegative(options.relevanceRadius, "relevanceRadius");

	const hysteresisRadius = options.hysteresisRadius ?? 0;
	assertFiniteNonNegative(hysteresisRadius, "hysteresisRadius");

	const thresholdRadius =
		options.relevanceRadius +
		(options.previousIncluded === true ? hysteresisRadius : 0);
	const included = options.distance <= thresholdRadius;

	return {
		included,
		reason: included ? "within-relevance-radius" : "outside-relevance-radius",
		distance: options.distance,
		relevanceRadius: options.relevanceRadius,
		thresholdRadius,
	};
}

export function evaluateFrustumInclusion(options: {
	readonly alwaysInclude?: boolean;
	readonly center: CullingVector3;
	readonly boundsRadius?: number;
	readonly frustum?: CullingFrustumInput;
	readonly hysteresisRadius?: number;
	readonly previousIncluded?: boolean;
}): CullingFrustumDecision {
	validateVector3(options.center, "center");

	const boundsRadius = options.boundsRadius ?? 0;
	assertFiniteNonNegative(boundsRadius, "boundsRadius");

	const hysteresisRadius = options.hysteresisRadius ?? 0;
	assertFiniteNonNegative(hysteresisRadius, "hysteresisRadius");

	const thresholdRadius =
		boundsRadius + (options.previousIncluded === true ? hysteresisRadius : 0);

	if (options.alwaysInclude === true) {
		return {
			included: true,
			relation: "unknown",
			reason: "always-include",
			boundsRadius,
			thresholdRadius,
		};
	}

	if (!options.frustum) {
		return {
			included: true,
			relation: "unknown",
			reason: "no-frustum",
			boundsRadius,
			thresholdRadius,
		};
	}

	if (options.frustum.kind === "visibility-state") {
		return {
			included: options.frustum.state !== "outside",
			relation: options.frustum.state,
			reason: "visibility-state",
			boundsRadius,
			thresholdRadius,
		};
	}

	const relation = classifySphereAgainstPlanes(
		options.center,
		thresholdRadius,
		options.frustum.planes,
	);

	return {
		included: relation !== "outside",
		relation,
		reason:
			relation === "inside"
				? "sphere-inside-frustum"
				: relation === "intersecting"
					? "sphere-intersects-frustum"
					: "sphere-outside-frustum",
		boundsRadius,
		thresholdRadius,
	};
}

export function classifySphereAgainstPlanes(
	center: CullingVector3,
	radius: number,
	planes: readonly CullingPlane[],
): Exclude<CullingFrustumRelation, "unknown"> {
	validateVector3(center, "center");
	assertFiniteNonNegative(radius, "radius");

	let intersectsPlane = false;

	for (const [index, plane] of planes.entries()) {
		validatePlane(plane, `planes[${index}]`);
		const signedDistance = dot(plane.normal, center) + plane.constant;

		if (signedDistance < -radius) {
			return "outside";
		}

		if (signedDistance < radius) {
			intersectsPlane = true;
		}
	}

	return intersectsPlane ? "intersecting" : "inside";
}

export function distance(a: CullingVector3, b: CullingVector3): number {
	return Math.sqrt(distanceSquared(a, b));
}

export function distanceSquared(a: CullingVector3, b: CullingVector3): number {
	validateVector3(a, "a");
	validateVector3(b, "b");

	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;

	return dx * dx + dy * dy + dz * dz;
}

function resolveUpdateRadius(
	policy: CullingPolicy,
	subject: CullingSubject,
): number | undefined {
	return (
		subject.updateRelevanceRadius ??
		subject.relevanceRadius ??
		policy.defaultUpdateRelevanceRadius ??
		policy.defaultRelevanceRadius
	);
}

function resolveRenderRadius(
	policy: CullingPolicy,
	subject: CullingSubject,
): number | undefined {
	return (
		subject.renderRelevanceRadius ??
		subject.relevanceRadius ??
		policy.defaultRenderRelevanceRadius ??
		policy.defaultRelevanceRadius
	);
}

function resolveDistanceHysteresis(policy: CullingPolicy): number {
	return policy.hysteresis?.distance ?? 0;
}

function resolveFrustumHysteresis(policy: CullingPolicy): number {
	return policy.hysteresis?.frustum ?? 0;
}

function cullingReasons(options: {
	readonly mode: CullingPolicyMode;
	readonly alwaysInclude: boolean;
	readonly updateIncluded: boolean;
	readonly renderIncluded: boolean;
	readonly updateDistance: CullingDistanceDecision;
	readonly renderDistance: CullingDistanceDecision;
	readonly frustum: CullingFrustumDecision;
	readonly applyFrustumToUpdates: boolean;
}): readonly string[] {
	if (options.mode === "off") {
		return ["mode-off"];
	}

	if (options.alwaysInclude) {
		return ["always-include"];
	}

	const reasons = new Set<string>();

	if (!options.updateDistance.included) {
		reasons.add("update-distance");
	}

	if (!options.renderDistance.included) {
		reasons.add("render-distance");
	}

	if (!options.frustum.included) {
		reasons.add("frustum");
	}

	if (options.applyFrustumToUpdates && !options.frustum.included) {
		reasons.add("update-frustum");
	}

	if (options.updateIncluded && options.renderIncluded) {
		reasons.add("included");
	}

	return [...reasons];
}

function validatePolicy(policy: CullingPolicy): void {
	if (
		policy.mode !== "off" &&
		policy.mode !== "diagnostic" &&
		policy.mode !== "distance"
	) {
		throw new Error(
			`Unsupported culling policy mode "${String(policy.mode)}".`,
		);
	}

	validateVector3(policy.observerPosition, "observerPosition");

	validateOptionalRadius(
		policy.defaultRelevanceRadius,
		"defaultRelevanceRadius",
	);
	validateOptionalRadius(
		policy.defaultUpdateRelevanceRadius,
		"defaultUpdateRelevanceRadius",
	);
	validateOptionalRadius(
		policy.defaultRenderRelevanceRadius,
		"defaultRenderRelevanceRadius",
	);

	if (policy.hysteresis) {
		validateOptionalRadius(policy.hysteresis.distance, "hysteresis.distance");
		validateOptionalRadius(policy.hysteresis.frustum, "hysteresis.frustum");
	}
}

function validateSubject(subject: CullingSubject): void {
	if (subject.id.length === 0) {
		throw new Error("Culling subject id is required.");
	}

	validateVector3(subject.position, `subject ${subject.id} position`);
	validateOptionalRadius(
		subject.boundsRadius,
		`subject ${subject.id} boundsRadius`,
	);
	validateOptionalRadius(
		subject.relevanceRadius,
		`subject ${subject.id} relevanceRadius`,
	);
	validateOptionalRadius(
		subject.updateRelevanceRadius,
		`subject ${subject.id} updateRelevanceRadius`,
	);
	validateOptionalRadius(
		subject.renderRelevanceRadius,
		`subject ${subject.id} renderRelevanceRadius`,
	);
}

function validateOptionalRadius(
	value: number | undefined,
	label: string,
): void {
	if (value !== undefined) {
		assertFiniteNonNegative(value, label);
	}
}

function validatePlane(plane: CullingPlane, label: string): void {
	validateVector3(plane.normal, `${label}.normal`);
	assertFiniteNumber(plane.constant, `${label}.constant`);
}

function validateVector3(value: CullingVector3, label: string): void {
	assertFiniteNumber(value.x, `${label}.x`);
	assertFiniteNumber(value.y, `${label}.y`);
	assertFiniteNumber(value.z, `${label}.z`);
}

function assertFiniteNonNegative(value: number, label: string): void {
	assertFiniteNumber(value, label);

	if (value < 0) {
		throw new Error(`${label} must be non-negative.`);
	}
}

function assertFiniteNumber(value: number, label: string): void {
	if (!Number.isFinite(value)) {
		throw new Error(`${label} must be finite.`);
	}
}

function dot(a: CullingVector3, b: CullingVector3): number {
	return a.x * b.x + a.y * b.y + a.z * b.z;
}
