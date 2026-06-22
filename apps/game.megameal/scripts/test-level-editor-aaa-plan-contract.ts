import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

type PackageJson = {
	readonly scripts?: Record<string, string>;
};

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const legacyThrelteEditorPath = [
	"Do not import or copy old `apps",
	"game/src/threlte/editor/**` code",
].join("/");
const docs = {
	architecture: await readProjectFile("ARCHITECTURE.md"),
	contractRegister: await readProjectFile("ENGINE_CONTRACT_REGISTER.md"),
	designDocument: await readProjectFile("GAME_ENGINE_DESIGN_DOCUMENT.md"),
	observatoryFindings: await readProjectFile(
		"docs/Done/OBSERVATORY_COLLISION_SYSTEM_FINDINGS.md",
	),
	plan: await readProjectFile("docs/LEVEL_EDITOR_COLLISION_COOK_PLAN.md"),
	researchGap: await readProjectFile(
		"docs/LEVEL_EDITOR_AAA_RESEARCH_AND_GAP_ANALYSIS.md",
	),
	savePublishPlan: await readProjectFile(
		"docs/LEVEL_EDITOR_SAVE_PUBLISH_COMPLETION_PLAN.md",
	),
	workbenchProgress: await readProjectFile(
		"docs/LEVEL_EDITOR_WORKBENCH_IMPLEMENTATION_PROGRESS.md",
	),
	workspaceAlignment: await readProjectFile(
		"docs/LEVEL_EDITOR_WORKSPACE_ALIGNMENT.md",
	),
};
const workspaceComponent = await readProjectFile(
	"src/app/editor/LevelEditorWorkspace.svelte",
);
const objectLibraryPanel = await readProjectFile(
	"src/app/editor/LevelEditorObjectLibraryPanel.svelte",
);
const objectLibraryModel = await readProjectFile(
	"src/app/editor/levelEditorObjectLibrary.ts",
);
const viewportBridgePanel = await readProjectFile(
	"src/app/editor/LevelEditorViewportBridgePanel.svelte",
);
const editorStyles = await readProjectFile("src/styles/editor.css");
const auditScript = await readProjectFile(
	"scripts/audit-engine-boundaries.mjs",
);
const packageJson = JSON.parse(
	await readProjectFile("package.json"),
) as PackageJson;
const packageScripts = packageJson.scripts ?? {};

assertRequiredPackageScripts();
await assertNoOrphanTestScripts();
assertPlanValidationMatrix();
assertArchitectureDocsStayHonest();
assertWorkspaceAlignmentHasExternalProof();
assertResearchGapAnalysisIsActionable();
assertWorkbenchContractIsRegistered();
assertWorkbenchSourceUsesConnectedRegions();
assertSavePublishPlanStaysFirstSliceHonest();
assertGenericEditorCatalogGuardrails();
assertObservatoryCollisionFindingsAreCurrent();
assertGeneralizedTerrainContractsAreHonest();

console.log(
	"Level editor AAA plan contract passed: implemented terrain/chunk contracts and remaining editor gaps are documented, validation commands are registered, and test scripts are owned.",
);

async function readProjectFile(path: string): Promise<string> {
	return readFile(join(appRoot, path), "utf8");
}

function assertRequiredPackageScripts(): void {
	const requiredScripts: Record<string, string> = {
		"test:collision-overlay-view-model":
			"tsx ./scripts/test-collision-overlay-view-model.ts",
		"test:generated-glb-import-contract":
			"tsx ./scripts/test-generated-glb-import-contract.ts",
		"test:terrain-import-pipeline-contract":
			"tsx ./scripts/test-terrain-import-pipeline-contract.ts",
		"test:terrain-cook-contract": "tsx ./scripts/test-terrain-cook-contract.ts",
		"test:level-editor-aaa-plan-contract":
			"tsx ./scripts/test-level-editor-aaa-plan-contract.ts",
		"test:level-editor-workspace-model-contract":
			"tsx ./scripts/test-level-editor-workspace-model-contract.ts",
		"test:level-editor-workbench-model-contract":
			"tsx ./scripts/test-level-editor-workbench-model-contract.ts",
		"test:level-editor-viewport-bridge-model-contract":
			"tsx ./scripts/test-level-editor-viewport-bridge-model-contract.ts",
		"test:level-editor-collision-cook-contract":
			"tsx ./scripts/test-level-editor-collision-cook-contract.ts",
		"test:live-preview-protocol-contract":
			"tsx ./scripts/test-live-preview-protocol-contract.ts",
	};

	for (const [scriptName, expectedCommand] of Object.entries(requiredScripts)) {
		assertEqual(
			packageScripts[scriptName],
			expectedCommand,
			`Expected package script ${scriptName} to be registered.`,
		);
	}
}

async function assertNoOrphanTestScripts(): Promise<void> {
	const scriptFileNames = await readdir(join(appRoot, "scripts"));
	const packageScriptCommands = Object.values(packageScripts);
	const testScriptFileNames = scriptFileNames
		.filter((fileName) => /^test-.*\.ts$/.test(fileName))
		.sort((left, right) => left.localeCompare(right));
	const orphanTests = testScriptFileNames.filter(
		(fileName) =>
			!packageScriptCommands.some((command) =>
				command.includes(`./scripts/${fileName}`),
			),
	);

	if (orphanTests.length > 0) {
		throw new Error(
			`Expected every focused test script to have a package script. Missing scripts for: ${orphanTests.join(", ")}.`,
		);
	}
}

function assertPlanValidationMatrix(): void {
	const requiredRows: readonly {
		readonly item: string;
		readonly requiredSnippets: readonly string[];
	}[] = [
		{
			item: "Editable collision gizmo UI",
			requiredSnippets: [
				"first control slice implemented",
				"test:collision-overlay-view-model",
				"test:level-editor-collision-cook-contract",
				"spatial gizmo validation",
			],
		},
		{
			item: "Live game-window preview application/reload",
			requiredSnippets: [
				"implemented protocol/callback slice with temporary runtime component application",
				"preview reversal and richer reload lifecycle remain future",
				"test:live-preview-protocol-contract",
				"test:level-editor-collision-cook-contract",
				"future `test:level-editor-preview-reload-contract`",
			],
		},
		{
			item: "Generated runtime collision bake",
			requiredSnippets: [
				"implemented",
				"arbitrary TS owner-object rewrite is intentionally avoided",
				"former Observatory-only cook/drift commands are retired",
				"test:level-editor-collision-cook-contract",
				"future broader bake tooling",
			],
		},
		{
			item: "Direct runtime owner-file rewrite bake",
			requiredSnippets: [
				"planned",
				"owned generated runtime collision module",
				"does not rewrite arbitrary TypeScript owner files",
				"future `test:level-editor-runtime-bake-writer-contract`",
			],
		},
		{
			item: "True terrain visual displacement/import pipeline",
			requiredSnippets: [
				"implemented generalized terrain import/cook contract",
				"render terrain and collision terrain are separate products",
				"test:terrain-import-pipeline-contract",
				"test:generated-glb-import-contract",
				"production editor import UI",
			],
		},
		{
			item: "Richer cooked terrain chunks",
			requiredSnippets: [
				"implemented foundation",
				"16 deterministic Observatory GLB-footprint walkable terrain chunks",
				"test:terrain-cook-contract",
				"test:level-editor-collision-cook-contract",
				"generic terrain package/readiness/streaming ownership",
			],
		},
	];

	assertIncludes(
		docs.plan,
		"## Remaining AAA-Plan Validation Matrix",
		"Expected the collision cook plan to include the remaining-item validation matrix.",
	);

	for (const row of requiredRows) {
		const line = lineContaining(docs.plan, `| ${row.item} |`);

		if (!line) {
			throw new Error(`Expected plan validation matrix row for ${row.item}.`);
		}

		for (const snippet of row.requiredSnippets) {
			assertIncludes(
				line,
				snippet,
				`Expected ${row.item} plan row to include ${JSON.stringify(snippet)}.`,
			);
		}
	}
}

function assertArchitectureDocsStayHonest(): void {
	const combinedDocs = [
		docs.architecture,
		docs.contractRegister,
		docs.designDocument,
		docs.observatoryFindings,
		docs.plan,
	]
		.join("\n")
		.toLowerCase()
		.replace(/\s+/g, " ");
	const requiredHonestStatusSnippets = [
		"editable collision controls",
		"game-window preview/reload",
		"generated runtime collision module",
		"generalized terrain import/cook contract is implemented",
		"16 deterministic observatory glb-footprint walkable terrain chunks",
		"cooked terrain chunks are implemented as a foundation",
		"render terrain and collision terrain are separate products",
	];
	const forbiddenOverclaims = [
		"arbitrary typescript owner objects are rewritten",
		"hand-authored typescript owner objects are rewritten",
		"true terrain visual displacement/import pipeline is complete",
		"production terrain editor ui is complete",
		"terrain lod streaming is complete",
	];

	for (const snippet of requiredHonestStatusSnippets) {
		assertIncludes(
			combinedDocs,
			snippet.toLowerCase(),
			`Expected docs to state ${JSON.stringify(snippet)}.`,
		);
	}

	for (const forbidden of forbiddenOverclaims) {
		assertNotIncludes(
			combinedDocs,
			forbidden.toLowerCase(),
			`Docs must not overclaim ${JSON.stringify(forbidden)}.`,
		);
	}
}

function assertWorkspaceAlignmentHasExternalProof(): void {
	const requiredSnippets = [
		"RuntimeSceneManifestData",
		"level browser source",
		"of truth",
		"Spawn, Terrain, Collision, Lights, Portals, Audio Emitters, Story, and Props",
		"runtime catalog default",
		"not a generic editor default or fallback",
		"category-first and component-driven",
		"docs/LEVEL_EDITOR_AAA_RESEARCH_AND_GAP_ANALYSIS.md",
		"top toolbar, scene",
		"central viewport or live-game viewport bridge",
		"category rail, spatial pins, and",
		"selected-object summaries",
		"scene-specific portal lists",
		"collisionDraftRegistry.ts",
		"Browser-side preview edits are preview-only",
		"Explicit dev-only authoring API routes",
		"LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL",
		"per-level collision",
		"hardcode `*_runtime`",
		legacyThrelteEditorPath,
		"https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-editor-interface",
		"https://dev.epicgames.com/documentation/en-us/unreal-engine/levels-in-unreal-engine",
		"https://dev.epicgames.com/documentation/en-us/unreal-engine/actors-in-unreal-engine",
		"https://docs.unity3d.com/Manual/CreatingScenes.html",
		"https://docs.unity3d.com/Manual/GameObjects.html",
		"https://docs.godotengine.org/en/stable/getting_started/step_by_step/nodes_and_scenes.html",
		"test:level-editor-workspace-model-contract",
		"test:production-editor-bundle-contract",
	];

	for (const snippet of requiredSnippets) {
		assertIncludes(
			docs.workspaceAlignment,
			snippet,
			`Expected workspace alignment doc to include ${JSON.stringify(snippet)}.`,
		);
	}
}

function assertResearchGapAnalysisIsActionable(): void {
	const requiredSnippets = [
		"Status: active research and contract gap report",
		"External Editor Research",
		"Current Megameal Contract Truth",
		"UX Gap Matrix",
		"Architecture Gap Matrix",
		"Required Workbench Contract",
		"No-Victory Criteria",
		"First Implementation Gate",
		"central scene viewport",
		"scene hierarchy or outliner",
		"details/inspector panel",
		"asset/content browser",
		"Save Draft writes generated authoring transaction modules",
		"bounded generated-owner",
		"Central 3D scene viewport",
		"Missing as an editor-owned workbench surface",
		"Transform gizmos",
		"Missing",
		"Publish gates reflect the exact current supported operation set",
		"https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-editor-interface",
		"https://docs.unity3d.com/Manual/editor-windows-views-reference.html",
		"https://docs.godotengine.org/en/stable/getting_started/introduction/first_look_at_the_editor.html",
		"https://www.docs.o3de.org/docs/user-guide/editor/",
	];

	for (const snippet of requiredSnippets) {
		assertIncludes(
			docs.researchGap,
			snippet,
			`Expected research/gap analysis to include ${JSON.stringify(snippet)}.`,
		);
	}

	assertIncludesOneOf(
		docs.researchGap,
		[
			"generated level-instance transform overrides",
			"generated level-instance transform and component overrides",
			"generated level-instance `set-transform` and `set-component` overrides",
			"generated level-instance set-transform and set-component overrides",
			"generated level-instance set-transform, set-component, and remove-component overrides",
			"generated level-instance transform overrides, object-library generated placements, level-instance prefab ID replacements, level-instance component set/removal records, and bounded level-instance removals",
			"slices for level-instance transform overrides, object-library generated",
		],
		"Expected research/gap analysis to describe the bounded generated-owner publish path for level-instance overrides.",
	);
}

function assertWorkbenchContractIsRegistered(): void {
	const row = lineContaining(
		docs.contractRegister,
		"| `LevelEditorWorkbenchContract` |",
	);

	if (!row) {
		throw new Error("Expected LevelEditorWorkbenchContract to be registered.");
	}

	for (const snippet of [
		"docs/LEVEL_EDITOR_AAA_RESEARCH_AND_GAP_ANALYSIS.md",
		"top toolbar",
		"scene hierarchy/outliner",
		"future central viewport or live-game viewport bridge",
		"content browser/object library",
		"test:level-editor-aaa-plan-contract",
		"treating a stack of diagnostic cards as the final level editor",
		"Research and gap analysis implemented",
		"A true AAA-tier workbench remains future",
	]) {
		assertIncludes(
			row,
			snippet,
			`Expected workbench contract row to include ${JSON.stringify(snippet)}.`,
		);
	}
}

function assertWorkbenchSourceUsesConnectedRegions(): void {
	const requiredProgressSnippets = [
		"Level Editor Workbench Implementation Progress",
		"The current editor is a foundation, not a finished AAA-tier editor.",
		"that reads as a professional editor",
		"instead of stacked diagnostic panels",
		"Implementation Checkpoint",
		"Viewport bridge",
		"Content browser",
		"normalized object-library drop placement exist",
		"Needs real gizmos, arbitrary drag placement",
		"draft-ready drag metadata exist",
		"guarded selected-instance duplicate/removal action pair",
		"Level Instance Duplicate Owner Writes",
		"Stage Removal",
		"Do Not Declare Done Until",
		"Persistent owner writes exist for the feature families advertised as",
	];
	const requiredComponentSnippets = [
		'<section class="editor-workbench-main" aria-label="Level editor workbench">',
		'class="editor-panel editor-outliner" aria-label="Scene outliner"',
		"<LevelEditorViewportBridgePanel",
		"buildLevelEditorViewportBridgeModel",
		"viewportBridgeViewMode",
		"viewportTransformMode",
		"viewportTranslateSnapStep",
		"viewportScaleSnapStep",
		"enabledViewportOverlayIds",
		"toggleViewportBridgeOverlay",
		"selectViewportTransformMode",
		"selectViewportTransformSnapStep",
		'class="editor-panel editor-graph-panel" aria-label="Engine graph"',
		'class="editor-panel editor-inspector" aria-label="Inspector"',
		'class="editor-panel editor-live-runtime"',
		"<LevelEditorObjectLibraryPanel",
		'class="editor-panel editor-command-plan" aria-label="Command plan"',
		'class="editor-panel editor-staged-operations"',
		"removeQueuedAuthoringOperationEntry",
		"removeLevelEditorAuthoringOperationEntry",
		"onRemoveAuthoringOperations={removeQueuedAuthoringOperationEntry}",
		"removeStagedFieldEdit",
		"removeLevelEditorStagedFieldEdit",
		"queuedAuthoringOperationEntries",
		"stagedFieldEdits",
		"Staged Operations",
		"Staged field edits",
		"Revert",
		'class="editor-panel editor-output-log" aria-label="Output log"',
		'class="editor-panel editor-object-focus"',
		'aria-label="Selection summary"',
		'class="editor-workflow-summary"',
		"data-workflow-publishability={selectedWorkspaceObject.workflow.publishability}",
		"selectedWorkspaceObject.workflow.labels",
		"field.workflow.reason",
		"field.workflow.publishability",
		"function readFieldValue(",
		"return fieldDisplayValueFromEdits(edits, object, field);",
		"stagedPublishReadiness",
		"buildStagedPublishReadiness",
		"queuedEntryPublishability",
		"Save Level/Publish currently accepts only level-owned set-transform, insert-level-instance, replace-prefab, remove-level-instance, set-component, and remove-component operations.",
		"Owner Write",
		"liveCoreObjectPreviewStableIds",
		"reconcileCoreObjectPreviewAfterStagedFieldRemoval",
		"revert-refresh-preview",
		"revert-clear-preview",
		"discardStagedEdits",
		"Discard Staged",
		"buildSelectedInstanceRemovalReadiness",
		"buildSelectedInstanceDuplicationReadiness",
		"readinessRequiredStableIdReason",
		"stageSelectedInstanceRemoval",
		"stageSelectedInstanceDuplicate",
		"nextDuplicateStableId",
		"Selected level instance duplicate staged from the workbench.",
		"data-selected-instance-duplicate-ready={selectedInstanceDuplicationReadiness.canStage}",
		"Selected level instance removal staged from the workbench.",
		"data-selected-instance-removal-ready={selectedInstanceRemovalReadiness.canStage}",
		"placementTarget={viewportPlacementTarget}",
		"onStagePlacementAtTarget={stageViewportPlacementAtTarget}",
		"onDropPlacementEntry={stageDroppedObjectLibraryPlacement}",
		"object-library-viewport-placements",
	];
	const requiredViewportBridgeSnippets = [
		'class="editor-panel editor-viewport-bridge" aria-label="Viewport bridge"',
		"data-viewport-mode={model.view.mode}",
		"data-gizmo-status={model.gizmo.status}",
		"onViewModeChange",
		"onOverlayToggle",
		"onSelectObject",
		"onTransformNudge",
		"onTransformModeChange",
		"onTransformSnapStepChange",
		"model.projection.objects",
		'class="editor-viewport-pin"',
		"placementProjectionTarget",
		"stagePlacementFromGhost",
		'class="editor-viewport-placement-ghost"',
		"data-placement-ready={placementTarget.canStage}",
		"application/x-megameal-object-library-entry",
		"data-placement-drop-ready={placementTarget?.canStage ?? false}",
		"ondrop={handlePlacementDrop}",
		'class="editor-viewport-transform-controls"',
		'class="editor-transform-mode-switcher"',
		'class="editor-transform-snap-control"',
		"model.transformControls.activeMode",
		"model.transformControls.activeSnapStep",
		'class="editor-viewport-placement-target"',
		"model.transformControls.stagesAuthoringEdits",
		"model.transformControls.writesRuntimeData",
		"model.bridge.writesRuntimeData",
		"model.gizmo.directManipulationEnabled",
		"model.view.activeOverlayIds",
	];
	const requiredObjectLibrarySnippets = [
		"objectLibrarySearchQuery",
		"objectLibraryKindFilter",
		"objectLibraryPlacementFilter",
		"filteredObjectLibraryGroups",
		"filteredObjectLibraryEntries",
		"matchesObjectLibraryFilters",
		"No library entries match",
		"placementTransformEditor",
		"function authoredPlacementTransform()",
		"function resetPlacementTransformEditor()",
		"function removeStagedPlacement(",
		"function objectLibraryPlacementQueueEntryId()",
		"onRemoveAuthoringOperations",
		"Placement Transform",
		"bind:value={placementTransformEditor.positionX}",
		"bind:value={placementTransformEditor.yawDegrees}",
		"formatPlacementTransform",
		"activePlacementDraft",
		"function stagePlacement()",
		"function startPlacementDrag(",
		"draggable={entry.placementReadiness.canStagePlacementDraft}",
		"data-placement-drag-ready={entry.placementReadiness.canStagePlacementDraft}",
		"object-library-placements",
		"Stage Placement Draft",
		"onSelectEntry",
		"activeEntry.placementReadiness.status",
		"activeEntry.placementReadiness.canStagePlacementDraft",
		"model.summary.placeableDraftEntryCount",
		"model.summary.publishablePlacementEntryCount",
		"Publish-ready",
		"Not publishable",
		"No file writes",
	];
	const requiredObjectLibraryModelSnippets = [
		"createObjectLibraryStagedPlacement",
		"insert-level-instance",
		"viewport-placement-target",
		"placementSource",
		"LevelEditorObjectLibraryStagedPlacement",
	];
	const requiredStyleSnippets = [
		".editor-workbench-main",
		".editor-workbench-center",
		".editor-viewport-bridge",
		".editor-viewport-placement-ghost",
		'.editor-viewport-frame[data-placement-drop-ready="true"]',
		".editor-viewport-frame.editor-viewport-placement-drop-active",
		".editor-workflow-summary",
		".editor-workflow-badges",
		".editor-staged-operations",
		".editor-staged-operation-list",
		".editor-library-browser-controls",
		".editor-library-empty-state",
		".editor-placement-composer",
		".editor-placement-transform-grid",
		".editor-staged-placement-list",
		".editor-transform-mode-switcher",
		".editor-transform-snap-control",
		'.editor-field[data-workflow-publishability="publishable"] input',
		"grid-template-columns: minmax(15rem, 18rem) minmax(28rem, 1fr) minmax(",
		".editor-bottom-grid",
		".editor-object-focus-grid",
	];

	for (const snippet of requiredProgressSnippets) {
		assertIncludes(
			docs.workbenchProgress,
			snippet,
			`Expected workbench progress doc to include ${JSON.stringify(snippet)}.`,
		);
	}

	for (const snippet of requiredComponentSnippets) {
		assertIncludes(
			workspaceComponent,
			snippet,
			`Expected LevelEditorWorkspace to keep the connected workbench region ${JSON.stringify(snippet)}.`,
		);
	}

	for (const forbiddenSnippet of [
		"document.querySelector<HTMLInputElement>",
		"cssEscape(field.path)",
	]) {
		assertNotIncludes(
			workspaceComponent,
			forbiddenSnippet,
			`Expected preview construction to avoid DOM-scraped inspector state via ${JSON.stringify(forbiddenSnippet)}.`,
		);
	}

	for (const snippet of requiredViewportBridgeSnippets) {
		assertIncludes(
			viewportBridgePanel,
			snippet,
			`Expected viewport bridge panel to expose the contract surface ${JSON.stringify(snippet)}.`,
		);
	}

	for (const snippet of requiredObjectLibrarySnippets) {
		assertIncludes(
			objectLibraryPanel,
			snippet,
			`Expected object library panel to expose placement workflow source ${JSON.stringify(snippet)}.`,
		);
	}

	for (const snippet of requiredObjectLibraryModelSnippets) {
		assertIncludes(
			objectLibraryModel,
			snippet,
			`Expected object library model to own placement operation source ${JSON.stringify(snippet)}.`,
		);
	}

	for (const snippet of requiredStyleSnippets) {
		assertIncludes(
			editorStyles,
			snippet,
			`Expected editor styles to keep the connected workbench layout rule ${JSON.stringify(snippet)}.`,
		);
	}
}

function assertSavePublishPlanStaysFirstSliceHonest(): void {
	const normalizedSavePublishPlan = docs.savePublishPlan.replace(/\s+/g, " ");
	const requiredSnippets = [
		"current configured Publish Level gates are the first-slice gates",
		"test:level-editor-save-contract",
		"test:runtime-scene-contract",
		"test:production-editor-bundle-contract",
		"type-check",
		"build",
		"Broader cook/drift, terrain, collision, audio, prefab, render-profile, asset, NPC, and environment gates must be added",
		"Publish must not imply full-feature save/publish coverage",
	];

	for (const snippet of requiredSnippets) {
		assertIncludes(
			normalizedSavePublishPlan,
			snippet,
			`Expected save/publish plan to include ${JSON.stringify(snippet)}.`,
		);
	}

	assertIncludesOneOf(
		normalizedSavePublishPlan,
		[
			"supports level-owned `set-transform` operations and generated object-library `insert-level-instance` placement operations",
			"supports level-owned `set-transform` operations, generated object-library `insert-level-instance` placement operations, and bounded level-instance `set-component` overrides",
			"supports level-owned set-transform operations, generated object-library insert-level-instance placement operations, and bounded level-instance set-component overrides",
			"supports level-owned set-transform operations, generated object-library insert-level-instance placement operations, and bounded level-instance set-component and remove-component overrides",
			"supports level-owned set-transform operations, generated object-library insert-level-instance placement operations, bounded level-instance set-component and remove-component overrides, and bounded remove-level-instance owner writes",
			"supports level-owned set-transform operations, generated object-library insert-level-instance placement operations, bounded level-instance replace-prefab overrides, bounded level-instance set-component and remove-component overrides, and bounded remove-level-instance owner writes",
		],
		"Expected save/publish plan to describe the bounded first-slice generated-owner publish families.",
	);
}

function assertGenericEditorCatalogGuardrails(): void {
	const combinedDocs = [
		docs.architecture,
		docs.contractRegister,
		docs.designDocument,
		docs.plan,
		docs.workspaceAlignment,
	]
		.join("\n")
		.toLowerCase()
		.replace(/\s+/g, " ");
	const requiredDocSnippets = [
		"runtime scene catalog default",
		"draft registry",
		"missing-draft",
		"not as app/editor fallback/default behavior",
		"must not directly import per-level collision draft modules",
		"hardcode `*_runtime`",
	];
	const requiredAuditSnippets = [
		"isGenericAppEditorModule",
		"levelSpecificEditorDefaultMatches",
		"perLevelCollisionDraftImportPattern",
		"runtimeSceneIdLiteralPattern",
		"manifest/draft catalog",
	];

	for (const snippet of requiredDocSnippets) {
		assertIncludes(
			combinedDocs,
			snippet.toLowerCase(),
			`Expected docs to enforce generic editor catalog guardrail ${JSON.stringify(snippet)}.`,
		);
	}

	for (const snippet of requiredAuditSnippets) {
		assertIncludes(
			auditScript,
			snippet,
			`Expected audit script to include guardrail snippet ${JSON.stringify(snippet)}.`,
		);
	}
}

function assertObservatoryCollisionFindingsAreCurrent(): void {
	const normalizedFindings = docs.observatoryFindings.replace(/\s+/g, " ");

	assertIncludes(
		normalizedFindings,
		"33x33",
		"Expected Observatory collision findings to document the current mesh resolution.",
	);
	assertIncludes(
		normalizedFindings,
		"665 unique emitted vertices and 1182 triangles",
		"Expected Observatory collision findings to document the current vertex/triangle counts.",
	);
	assertIncludes(
		normalizedFindings,
		"does not change the rendered GLB surface",
		"Expected Observatory collision findings to separate collision from visual terrain displacement.",
	);
	assertNotIncludes(
		normalizedFindings,
		"17x17",
		"Expected Observatory collision findings not to cite stale V1 mesh counts.",
	);
}

function assertGeneralizedTerrainContractsAreHonest(): void {
	const combinedDocs = [
		docs.architecture,
		docs.contractRegister,
		docs.designDocument,
		docs.plan,
	]
		.join("\n")
		.toLowerCase()
		.replace(/\s+/g, " ");
	const hasGeneralizedTerrainPipelineContract =
		packageScripts["test:terrain-import-pipeline-contract"] !== undefined;
	const hasCookedTerrainChunkContract =
		packageScripts["test:terrain-cook-contract"] !== undefined;

	assertIncludes(
		combinedDocs,
		"terrainvisualimportpipelinecontract",
		"Expected docs/register to name the generalized terrain visual import contract.",
	);
	assertIncludes(
		combinedDocs,
		"cookedterrainchunkcontract",
		"Expected docs/register to name the cooked terrain chunk contract.",
	);
	assertIncludes(
		combinedDocs,
		"render terrain and collision terrain are separate products",
		"Expected docs to keep render terrain separate from collision terrain.",
	);
	assertIncludes(
		combinedDocs,
		"render mesh geometry is not implicit collision",
		"Expected docs to forbid using rendered terrain geometry as collision.",
	);

	assertEqual(
		hasGeneralizedTerrainPipelineContract,
		true,
		"Expected package script test:terrain-import-pipeline-contract to guard implemented terrain import/cook docs.",
	);
	assertEqual(
		hasCookedTerrainChunkContract,
		true,
		"Expected package script test:terrain-cook-contract to guard implemented cooked terrain chunk docs.",
	);
	assertIncludes(
		combinedDocs,
		"generalized terrain import/cook contract is implemented",
		"Expected docs to state the implemented terrain import/cook contract foundation.",
	);
	assertIncludes(
		combinedDocs,
		"16 deterministic observatory glb-footprint walkable terrain chunks",
		"Expected docs to state the implemented Observatory cooked chunk foundation.",
	);
	assertIncludes(
		combinedDocs,
		"production editor import ui",
		"Expected docs to keep production terrain editor UI as future work.",
	);

	const forbiddenRenderCollisionClaims = [
		"render terrain is the collision source",
		"render glb is the collision source",
		"observatory terrain glb owns collider",
		"terrain collision chunks are complete",
	];

	for (const forbidden of forbiddenRenderCollisionClaims) {
		assertNotIncludes(
			combinedDocs,
			forbidden,
			`Docs must not overclaim render terrain as collision with ${JSON.stringify(forbidden)}.`,
		);
	}
}

function lineContaining(text: string, snippet: string): string | undefined {
	return text.split("\n").find((line) => line.includes(snippet));
}

function assertIncludes(text: string, snippet: string, message: string): void {
	if (!text.includes(snippet)) {
		throw new Error(`${message} Missing snippet: ${JSON.stringify(snippet)}.`);
	}
}

function assertIncludesOneOf(
	text: string,
	snippets: readonly string[],
	message: string,
): void {
	if (!snippets.some((snippet) => text.includes(snippet))) {
		throw new Error(
			`${message} Missing one of: ${snippets
				.map((snippet) => JSON.stringify(snippet))
				.join(", ")}.`,
		);
	}
}

function assertNotIncludes(
	text: string,
	snippet: string,
	message: string,
): void {
	if (text.includes(snippet)) {
		throw new Error(`${message} Forbidden snippet was present.`);
	}
}

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message: string,
): void {
	if (actual !== expected) {
		throw new Error(
			`${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
		);
	}
}
