export type EditorBuildPublishPlanMode = "build" | "publish-local";

export type EditorBuildPublishPlanPhase =
	| "validate"
	| "cook"
	| "drift"
	| "build"
	| "reload"
	| "publish-gate";

export type EditorBuildPublishCommandStep = {
	readonly id: string;
	readonly label: string;
	readonly phase: EditorBuildPublishPlanPhase;
	readonly commandKind: "package-script";
	readonly scriptName: string;
	readonly command: readonly string[];
	readonly requiresExplicitInvocation: true;
	readonly hiddenProductionWork: false;
	readonly writesAuthoredSource: boolean;
	readonly productionBuildStep: boolean;
};

export type EditorBuildPublishManualStep = {
	readonly id: string;
	readonly label: string;
	readonly phase: EditorBuildPublishPlanPhase;
	readonly commandKind: "manual";
	readonly requiresExplicitInvocation: true;
	readonly hiddenProductionWork: false;
	readonly writesAuthoredSource: false;
	readonly productionBuildStep: false;
	readonly action:
		| "inspect-output"
		| "request-live-runtime-reload"
		| "mark-local-publish-ready";
};

export type EditorBuildPublishPlanStep =
	| EditorBuildPublishCommandStep
	| EditorBuildPublishManualStep;

export type EditorBuildPublishPlan = {
	readonly schemaVersion: 1;
	readonly mode: EditorBuildPublishPlanMode;
	readonly targetRuntimeSceneId?: string;
	readonly productionBuildHasHiddenCook: false;
	readonly localOnly: true;
	readonly steps: readonly EditorBuildPublishPlanStep[];
};

export function buildEditorBuildPublishPlan(
	options: {
		readonly mode?: EditorBuildPublishPlanMode;
		readonly targetRuntimeSceneId?: string;
		readonly includeLiveReload?: boolean;
	} = {},
): EditorBuildPublishPlan {
	const mode = options.mode ?? "build";
	const steps: EditorBuildPublishPlanStep[] = [
		packageScriptStep(
			"validate-feature-catalogs",
			"Validate feature catalogs",
			"validate",
			"test:level-editor-feature-catalog-contract",
		),
		packageScriptStep(
			"validate-level-authoring",
			"Validate level authoring content graph",
			"validate",
			"test:level-authoring-contract",
		),
		packageScriptStep(
			"validate-runtime-scenes",
			"Validate runtime scenes",
			"validate",
			"test:runtime-scene-contract",
		),
		packageScriptStep(
			"validate-editor-collision-cook",
			"Validate collision cook authoring",
			"validate",
			"test:level-editor-collision-cook-contract",
		),
		packageScriptStep(
			"validate-production-editor-exclusion",
			"Validate production editor exclusion",
			"validate",
			"test:production-editor-bundle-contract",
		),
		packageScriptStep(
			"cook-terrain",
			"Cook terrain through the explicit generic cook command",
			"cook",
			"cook:terrain",
			{ writesAuthoredSource: true },
		),
		packageScriptStep(
			"check-terrain-drift",
			"Check terrain cook drift",
			"drift",
			"ci:terrain-drift",
		),
		packageScriptStep(
			"audit-engine-boundaries",
			"Audit engine boundaries",
			"validate",
			"audit:engine-boundaries",
		),
		packageScriptStep("type-check", "Type-check", "validate", "type-check"),
		packageScriptStep("build", "Build production output", "build", "build", {
			productionBuildStep: true,
		}),
		manualStep(
			"inspect-output",
			"Inspect build output and command logs",
			"publish-gate",
			"inspect-output",
		),
	];

	if (options.includeLiveReload === true) {
		steps.push(
			manualStep(
				"request-live-runtime-reload",
				"Request live runtime reload after explicit save/build",
				"reload",
				"request-live-runtime-reload",
			),
		);
	}

	if (mode === "publish-local") {
		steps.push(
			manualStep(
				"mark-local-publish-ready",
				"Mark local publish gate ready",
				"publish-gate",
				"mark-local-publish-ready",
			),
		);
	}

	return {
		schemaVersion: 1,
		mode,
		...(options.targetRuntimeSceneId
			? { targetRuntimeSceneId: options.targetRuntimeSceneId }
			: {}),
		productionBuildHasHiddenCook: false,
		localOnly: true,
		steps,
	};
}

export function validateEditorBuildPublishPlan(
	plan: EditorBuildPublishPlan,
): readonly string[] {
	const errors: string[] = [];
	const stepIds = new Set<string>();
	const stepIdsInOrder = plan.steps.map((step) => step.id);

	if (plan.schemaVersion !== 1) {
		errors.push("buildPublishPlan.schemaVersion must be 1.");
	}

	if (plan.productionBuildHasHiddenCook !== false) {
		errors.push("production builds must not hide cook work.");
	}

	if (plan.localOnly !== true) {
		errors.push("editor publish is local-only until a deploy contract exists.");
	}

	for (const step of plan.steps) {
		if (stepIds.has(step.id)) {
			errors.push(`buildPublishPlan step "${step.id}" is duplicated.`);
		}

		stepIds.add(step.id);

		if (step.hiddenProductionWork !== false) {
			errors.push(`buildPublishPlan step "${step.id}" hides production work.`);
		}

		if (step.requiresExplicitInvocation !== true) {
			errors.push(
				`buildPublishPlan step "${step.id}" must require explicit invocation.`,
			);
		}

		if (step.commandKind === "package-script") {
			if (step.scriptName.startsWith("deploy")) {
				errors.push(
					`buildPublishPlan step "${step.id}" must not deploy from the editor publish gate.`,
				);
			}

			if (
				step.phase === "cook" &&
				(step.scriptName !== "cook:terrain" || !step.writesAuthoredSource)
			) {
				errors.push(
					`buildPublishPlan cook step "${step.id}" must be the explicit generic terrain cook command.`,
				);
			}

			if (step.productionBuildStep && step.phase !== "build") {
				errors.push(
					`buildPublishPlan step "${step.id}" marks productionBuildStep outside the build phase.`,
				);
			}
		}
	}

	assertBefore(stepIdsInOrder, "cook-terrain", "check-terrain-drift");
	assertBefore(stepIdsInOrder, "type-check", "build");

	function assertBefore(
		ids: readonly string[],
		left: string,
		right: string,
	): void {
		const leftIndex = ids.indexOf(left);
		const rightIndex = ids.indexOf(right);

		if (leftIndex === -1 || rightIndex === -1 || leftIndex > rightIndex) {
			errors.push(`buildPublishPlan must run "${left}" before "${right}".`);
		}
	}

	return errors;
}

function packageScriptStep(
	id: string,
	label: string,
	phase: EditorBuildPublishPlanPhase,
	scriptName: string,
	options: {
		readonly writesAuthoredSource?: boolean;
		readonly productionBuildStep?: boolean;
	} = {},
): EditorBuildPublishCommandStep {
	return {
		id,
		label,
		phase,
		commandKind: "package-script",
		scriptName,
		command: ["pnpm", "--dir", "apps/game.megameal", scriptName],
		requiresExplicitInvocation: true,
		hiddenProductionWork: false,
		writesAuthoredSource: options.writesAuthoredSource ?? false,
		productionBuildStep: options.productionBuildStep ?? false,
	};
}

function manualStep(
	id: string,
	label: string,
	phase: EditorBuildPublishPlanPhase,
	action: EditorBuildPublishManualStep["action"],
): EditorBuildPublishManualStep {
	return {
		id,
		label,
		phase,
		commandKind: "manual",
		action,
		requiresExplicitInvocation: true,
		hiddenProductionWork: false,
		writesAuthoredSource: false,
		productionBuildStep: false,
	};
}
