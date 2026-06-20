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
	workspaceAlignment: await readProjectFile(
		"docs/LEVEL_EDITOR_WORKSPACE_ALIGNMENT.md",
	),
};
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
		"collisionDraftRegistry.ts",
		"preview-only",
		"LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL",
		"per-level collision",
		"hardcode `*_runtime`",
		legacyThrelteEditorPath,
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
