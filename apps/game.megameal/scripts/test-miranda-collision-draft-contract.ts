import {
	type CollisionCookDraftData,
	type CollisionCookPlan,
	buildCollisionCookPlan,
	buildCollisionCookPreviewPatch,
	buildCollisionCookWritePlan,
	parseCollisionCookPreviewPatch,
	validateCollisionCookPlanAgainstRuntimeScene,
} from "../src/engine/index.js";
import { mirandaCollisionCookDraft } from "../src/game/editor/collisionDrafts/mirandaCollisionDraft.js";
import { mirandaDeckRuntimeSceneManifest } from "../src/game/levels/index.js";

type CharacterBounds = {
	readonly minX: number;
	readonly maxX: number;
	readonly minZ: number;
	readonly maxZ: number;
};

type WalkableSpan = {
	readonly stableId: string;
	readonly minX: number;
	readonly maxX: number;
	readonly minZ: number;
	readonly maxZ: number;
};

const plan = buildCollisionCookPlan(mirandaCollisionCookDraft);
const runtimeResult = validateCollisionCookPlanAgainstRuntimeScene({
	plan,
	manifest: mirandaDeckRuntimeSceneManifest,
});

if (!runtimeResult.ok) {
	throw new Error(
		`Expected Miranda collision draft to match runtime data:\n${runtimeResult.errors.join("\n")}`,
	);
}

assertMirandaWalkableDraft(plan);
assertDryRunWritePlan(plan);
assertPreviewPatch(plan);
assertInvalidDriftCases();

console.log(
	`Miranda collision draft contract passed for ${plan.entries.length} walkable floor entries.`,
);

function assertMirandaWalkableDraft(cookPlan: CollisionCookPlan): void {
	const expectedWalkableStableIds = [
		"miranda:floor:cargo-hold",
		"miranda:floor:main",
		"miranda:floor:upper",
	];

	assertDeepEqual(
		cookPlan.requiredWalkableStableIds,
		expectedWalkableStableIds,
		"Expected Miranda draft to own the current readiness-required walkable floor footprint.",
	);
	assertDeepEqual(
		cookPlan.requiredWalkableStableIds,
		[
			...(mirandaDeckRuntimeSceneManifest.readiness.requiredWalkableStableIds ??
				[]),
		].sort(),
		"Expected Miranda draft walkable IDs to match runtime readiness.",
	);

	const coverageErrors = getWalkableCoverageErrors({
		plan: cookPlan,
		bounds: getMirandaCharacterBounds(),
	});

	if (coverageErrors.length > 0) {
		throw new Error(
			`Expected Miranda walkable draft to cover authored character bounds:\n${coverageErrors.join("\n")}`,
		);
	}
}

function assertDryRunWritePlan(cookPlan: CollisionCookPlan): void {
	const writePlan = buildCollisionCookWritePlan(cookPlan);

	if (writePlan.writesFiles !== false || writePlan.writeMode !== "dry-run") {
		throw new Error(
			"Expected Miranda collision write plan to be dry-run only.",
		);
	}

	if (
		writePlan.artifacts.some(
			(artifact) => artifact.purpose === "runtime-collision-module",
		)
	) {
		throw new Error(
			"Miranda collision draft must not create a generated runtime module until that output owner exists.",
		);
	}

	assertDeepEqual(
		writePlan.artifacts.map((artifact) => artifact.targetFile).sort(),
		[
			"src/game/levels/defaultLevels.ts",
			"src/game/levels/runtimeSceneManifests.ts",
			"src/game/prefabs/defaultPrefabs.ts",
		],
		"Expected Miranda write plan to target only existing Miranda owner files.",
	);
}

function assertPreviewPatch(cookPlan: CollisionCookPlan): void {
	const previewPatch = buildCollisionCookPreviewPatch(cookPlan);

	parseCollisionCookPreviewPatch(previewPatch);

	assertDeepEqual(
		previewPatch.requiredWalkableStableIds,
		cookPlan.requiredWalkableStableIds,
		"Expected preview patch walkable IDs to match the plan.",
	);

	if (previewPatch.mode !== "temporary-preview") {
		throw new Error("Expected Miranda preview patch to remain temporary only.");
	}
}

function assertInvalidDriftCases(): void {
	const missingCargoDraft = {
		...mirandaCollisionCookDraft,
		entries: mirandaCollisionCookDraft.entries.filter(
			(entry) => entry.stableId !== "miranda:floor:cargo-hold",
		),
	} satisfies CollisionCookDraftData;
	const missingCargoPlan = buildCollisionCookPlan(missingCargoDraft);
	const missingCargoCoverageErrors = getWalkableCoverageErrors({
		plan: missingCargoPlan,
		bounds: getMirandaCharacterBounds(),
	});

	if (
		!missingCargoCoverageErrors.some((error) =>
			error.includes("missing continuous walkable z coverage"),
		)
	) {
		throw new Error(
			"Expected Miranda draft coverage to fail when the Cargo Hold walkable extension is removed.",
		);
	}

	const shiftedRuntimeManifest = {
		...mirandaDeckRuntimeSceneManifest,
		level: {
			...mirandaDeckRuntimeSceneManifest.level,
			instances: mirandaDeckRuntimeSceneManifest.level.instances.map(
				(instance) =>
					instance.stableId === "miranda:floor:cargo-hold"
						? {
								...instance,
								transform: {
									...instance.transform,
									position: [0, 3.35, 46] as const,
								},
							}
						: instance,
			),
		},
	};
	const shiftedResult = validateCollisionCookPlanAgainstRuntimeScene({
		plan,
		manifest: shiftedRuntimeManifest,
	});

	if (
		shiftedResult.ok ||
		!shiftedResult.errors.some((error) =>
			error.includes("runtime transform does not match the authored draft"),
		)
	) {
		throw new Error(
			"Expected Miranda collision draft validation to catch runtime transform drift.",
		);
	}
}

function getWalkableCoverageErrors(options: {
	readonly plan: CollisionCookPlan;
	readonly bounds: CharacterBounds;
}): readonly string[] {
	const spans = options.plan.entries
		.filter((entry) => entry.readiness.requiredWalkable === true)
		.map((entry) => walkableSpanFromEntry(entry));
	const xCoveringSpans = spans
		.filter(
			(span) =>
				span.minX <= options.bounds.minX && span.maxX >= options.bounds.maxX,
		)
		.sort((left, right) => left.minZ - right.minZ);
	const errors: string[] = [];

	if (xCoveringSpans.length === 0) {
		errors.push(
			`missing walkable span covering x bounds ${options.bounds.minX}..${options.bounds.maxX}.`,
		);
		return errors;
	}

	let coveredTo = options.bounds.minZ;

	for (const span of xCoveringSpans) {
		if (span.maxZ < coveredTo) {
			continue;
		}

		if (span.minZ > coveredTo) {
			errors.push(
				`missing continuous walkable z coverage from ${coveredTo} to ${span.minZ} before ${span.stableId}.`,
			);
			return errors;
		}

		coveredTo = Math.max(coveredTo, span.maxZ);

		if (coveredTo >= options.bounds.maxZ) {
			return errors;
		}
	}

	errors.push(
		`missing continuous walkable z coverage from ${coveredTo} to ${options.bounds.maxZ}.`,
	);
	return errors;
}

function walkableSpanFromEntry(
	entry: CollisionCookPlan["entries"][number],
): WalkableSpan {
	const shape = entry.colliderComponent.shape;

	if (shape.type !== "box") {
		throw new Error(
			`Miranda walkable draft entry "${entry.id}" must use a box collider until full cooked terrain exists.`,
		);
	}

	const position = entry.transform?.position ?? [0, 0, 0];
	const [positionX, , positionZ] = position;
	const [halfX, , halfZ] = shape.halfExtents;

	return {
		stableId: entry.stableId,
		minX: positionX - halfX,
		maxX: positionX + halfX,
		minZ: positionZ - halfZ,
		maxZ: positionZ + halfZ,
	};
}

function getMirandaCharacterBounds(): CharacterBounds {
	const value =
		mirandaDeckRuntimeSceneManifest.level.resources?.["game:characterBounds"];

	if (!isCharacterBounds(value)) {
		throw new Error(
			"Miranda level must author game:characterBounds before collision coverage can be validated.",
		);
	}

	return value;
}

function isCharacterBounds(value: unknown): value is CharacterBounds {
	return (
		typeof value === "object" &&
		value !== null &&
		"minX" in value &&
		"maxX" in value &&
		"minZ" in value &&
		"maxZ" in value &&
		typeof value.minX === "number" &&
		typeof value.maxX === "number" &&
		typeof value.minZ === "number" &&
		typeof value.maxZ === "number"
	);
}

function assertDeepEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message: string,
): void {
	const actualJson = JSON.stringify(actual);
	const expectedJson = JSON.stringify(expected);

	if (actualJson !== expectedJson) {
		throw new Error(
			`${message} Expected ${expectedJson}, received ${actualJson}.`,
		);
	}
}
