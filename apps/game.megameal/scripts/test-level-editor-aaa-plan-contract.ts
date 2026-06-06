import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

type PackageJson = {
	readonly scripts?: Record<string, string>;
};

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const docs = {
	architecture: await readProjectFile("ARCHITECTURE.md"),
	contractRegister: await readProjectFile("ENGINE_CONTRACT_REGISTER.md"),
	designDocument: await readProjectFile("GAME_ENGINE_DESIGN_DOCUMENT.md"),
	observatoryFindings: await readProjectFile(
		"docs/OBSERVATORY_COLLISION_SYSTEM_FINDINGS.md",
	),
	plan: await readProjectFile("docs/LEVEL_EDITOR_COLLISION_COOK_PLAN.md"),
};
const packageJson = JSON.parse(
	await readProjectFile("package.json"),
) as PackageJson;
const packageScripts = packageJson.scripts ?? {};

assertRequiredPackageScripts();
await assertNoOrphanTestScripts();
assertPlanValidationMatrix();
assertArchitectureDocsStayHonest();
assertObservatoryCollisionFindingsAreCurrent();

console.log(
	"Level editor AAA plan contract passed: remaining items are documented as planned, validation commands are registered, and test scripts are owned.",
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
		"test:observatory-visual-terrain-contract":
			"tsx ./scripts/test-observatory-visual-terrain-contract.ts",
		"test:level-editor-aaa-plan-contract":
			"tsx ./scripts/test-level-editor-aaa-plan-contract.ts",
		"test:level-editor-collision-cook-contract":
			"tsx ./scripts/test-level-editor-collision-cook-contract.ts",
		"test:live-preview-protocol-contract":
			"tsx ./scripts/test-live-preview-protocol-contract.ts",
		"ci:observatory-collision-drift":
			"tsx ./scripts/check-observatory-collision-drift.ts",
		"cook:observatory-collision": "tsx ./scripts/cook-observatory-collision.ts",
		"generate:observatory-field-terrain":
			"tsx ./scripts/generate-observatory-field-terrain.ts",
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
				"--write-runtime-collision",
				"ci:observatory-collision-drift",
				"cook:observatory-collision",
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
				"implemented foundation",
				"test:observatory-visual-terrain-contract",
				"generate:observatory-field-terrain",
				"test:generated-glb-import-contract",
				"future `test:terrain-visual-import-pipeline-contract`",
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
		"visual terrain displacement/import foundation is implemented",
		"full visual terrain import pipeline remains planned",
	];
	const forbiddenOverclaims = [
		"arbitrary typescript owner objects are rewritten",
		"hand-authored typescript owner objects are rewritten",
		"full visual terrain import pipeline is implemented",
		"true terrain visual displacement/import pipeline is complete",
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

function assertObservatoryCollisionFindingsAreCurrent(): void {
	assertIncludes(
		docs.observatoryFindings,
		"17x17",
		"Expected Observatory collision findings to document the current mesh resolution.",
	);
	assertIncludes(
		docs.observatoryFindings,
		"289 vertices and 512 triangles",
		"Expected Observatory collision findings to document the current vertex/triangle counts.",
	);
	assertIncludes(
		docs.observatoryFindings,
		"does not change the rendered GLB surface",
		"Expected Observatory collision findings to separate collision from visual terrain displacement.",
	);
	assertNotIncludes(
		docs.observatoryFindings,
		"25 vertices and 32 triangles",
		"Expected Observatory collision findings not to cite stale V1 mesh counts.",
	);
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
