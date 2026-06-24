import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

type PackageJson = {
	readonly scripts?: Record<string, string>;
};

type FileBudget = {
	readonly path: string;
	readonly maxLines: number;
	readonly extractionOwner: string;
};

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const packageJson = JSON.parse(
	await readProjectFile("package.json"),
) as PackageJson;
const packageScripts = packageJson.scripts ?? {};
const docs = {
	cleanup: await readProjectFile("docs/CLEANUP_REMINDER.md"),
	contractRegister: await readProjectFile("ENGINE_CONTRACT_REGISTER.md"),
	progress: await readProjectFile(
		"docs/LEVEL_EDITOR_WORKBENCH_IMPLEMENTATION_PROGRESS.md",
	),
	workspaceAlignment: await readProjectFile(
		"docs/LEVEL_EDITOR_WORKSPACE_ALIGNMENT.md",
	),
};

const budgets: readonly FileBudget[] = [
	{
		path: "src/app/editor/LevelEditorWorkspace.svelte",
		maxLines: 3800,
		extractionOwner:
			"focused workbench panel/component or editor model before adding more integration code",
	},
	{
		path: "src/app/editor/levelEditorWorkspaceModel.ts",
		maxLines: 2550,
		extractionOwner:
			"focused workspace model helper, feature-family model, or owner-specific contract module",
	},
	{
		path: "src/app/editor/levelEditorViewportBridgeModel.ts",
		maxLines: 1600,
		extractionOwner:
			"focused viewport interaction, projection, or transform helper model",
	},
	{
		path: "src/app/editor/LevelEditorObjectLibraryPanel.svelte",
		maxLines: 900,
		extractionOwner: "focused object-library panel section or model helper",
	},
	{
		path: "src/styles/editor.css",
		maxLines: 2050,
		extractionOwner:
			"feature-owned editor style section or component-scoped style with a documented owner",
	},
];

assertPackageScriptRegistration();
assertContractDocsOwnMaintainabilityBudget();
await assertEditorBudgets();
await assertRuntimeDoesNotImportEditorUi();

console.log(
	"Level editor maintainability contract passed: central editor file budgets are extraction triggers, docs and package scripts are wired, and runtime/editor import separation is guarded.",
);

async function readProjectFile(path: string): Promise<string> {
	return readFile(join(appRoot, path), "utf8");
}

function assertPackageScriptRegistration(): void {
	assertEqual(
		packageScripts["test:level-editor-maintainability-contract"],
		"tsx ./scripts/test-level-editor-maintainability-contract.ts",
		"Expected focused maintainability contract package script to be registered.",
	);
	assertIncludes(
		packageScripts["test:contracts"] ?? "",
		"pnpm test:level-editor-maintainability-contract",
		"Expected aggregate test:contracts gate to include the maintainability contract.",
	);
}

function assertContractDocsOwnMaintainabilityBudget(): void {
	const requiredRegisterSnippets = [
		"LevelEditorMaintainabilityContract",
		"scripts/test-level-editor-maintainability-contract.ts",
		"no new feature logic directly in `LevelEditorWorkspace.svelte` unless it extracts",
		"central editor file budget",
	];

	for (const snippet of requiredRegisterSnippets) {
		assertIncludes(
			docs.contractRegister,
			snippet,
			`Expected contract register to include maintainability snippet ${JSON.stringify(snippet)}.`,
		);
	}

	const requiredWorkspaceSnippets = [
		"## Maintainability Budget",
		"`LevelEditorWorkspace.svelte` is an integration shell",
		"stay inside a focused owner file or reduce central complexity",
		"not capability ceilings",
		"test:level-editor-maintainability-contract",
	];

	for (const snippet of requiredWorkspaceSnippets) {
		assertIncludes(
			docs.workspaceAlignment,
			snippet,
			`Expected workspace alignment doc to include maintainability snippet ${JSON.stringify(snippet)}.`,
		);
	}

	const requiredProgressSnippets = [
		"Maintainability ratchet",
		"test:level-editor-maintainability-contract",
		"central file budgets",
	];

	for (const snippet of requiredProgressSnippets) {
		assertIncludes(
			docs.progress,
			snippet,
			`Expected progress doc to include maintainability snippet ${JSON.stringify(snippet)}.`,
		);
	}

	const requiredCleanupSnippets = [
		"Level-editor maintainability",
		"central file budgets",
		"focused owner component/model/test",
	];

	for (const snippet of requiredCleanupSnippets) {
		assertIncludes(
			docs.cleanup,
			snippet,
			`Expected cleanup reminder to include maintainability snippet ${JSON.stringify(snippet)}.`,
		);
	}
}

async function assertEditorBudgets(): Promise<void> {
	const violations: string[] = [];

	for (const budget of budgets) {
		const source = await readProjectFile(budget.path);
		const lines = lineCount(source);

		if (lines > budget.maxLines) {
			violations.push(
				`${budget.path} has ${lines} lines, budget is ${budget.maxLines}; extract to ${budget.extractionOwner}.`,
			);
		}
	}

	if (violations.length > 0) {
		throw new Error(
			`Level editor maintainability budget failed:\n${violations.map((violation) => `- ${violation}`).join("\n")}`,
		);
	}
}

async function assertRuntimeDoesNotImportEditorUi(): Promise<void> {
	const sourceFiles = await collectFiles(join(appRoot, "src"));
	const violations: string[] = [];

	for (const filePath of sourceFiles) {
		const rel = relative(appRoot, filePath).replaceAll(sep, "/");

		if (editorOwnedFileCanImportEditorUi(rel)) {
			continue;
		}

		const source = await readFile(filePath, "utf8");
		for (const specifier of extractImportSpecifiers(source)) {
			if (specifier.includes("app/editor")) {
				violations.push(
					`${rel} imports editor UI surface through ${JSON.stringify(specifier)}.`,
				);
			}
		}
	}

	if (violations.length > 0) {
		throw new Error(
			`Normal runtime code must not import level-editor UI modules:\n${violations.map((violation) => `- ${violation}`).join("\n")}`,
		);
	}
}

async function collectFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const path = join(dir, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await collectFiles(path)));
			continue;
		}

		if (/\.(astro|svelte|ts)$/.test(entry.name)) {
			files.push(path);
		}
	}

	return files;
}

function editorOwnedFileCanImportEditorUi(rel: string): boolean {
	return (
		rel.startsWith("src/app/editor/") ||
		rel.startsWith("src/pages/editor.") ||
		rel.startsWith("src/pages/api/editor/")
	);
}

function extractImportSpecifiers(source: string): readonly string[] {
	const specifiers = new Set<string>();
	const patterns = [
		/\bfrom\s*["']([^"']+)["']/g,
		/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
		/^\s*import\s*["']([^"']+)["']/gm,
	];

	for (const pattern of patterns) {
		for (const match of source.matchAll(pattern)) {
			const specifier = match[1];

			if (specifier) {
				specifiers.add(specifier);
			}
		}
	}

	return [...specifiers];
}

function lineCount(source: string): number {
	if (source.length === 0) {
		return 0;
	}

	return source.match(/\n/g)?.length ?? 0;
}

function assertIncludes(
	value: string,
	expected: string,
	message: string,
): void {
	if (!value.includes(expected)) {
		throw new Error(message);
	}
}

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message: string,
): void {
	if (actual !== expected) {
		throw new Error(`${message} Expected ${expected}, received ${actual}.`);
	}
}
