import { readFile, readdir } from "node:fs/promises";
import { dirname, join, normalize, relative, sep } from "node:path";

const appRoot = new URL("..", import.meta.url);
const rootPath = appRoot.pathname;
const sourceExtensions = new Set([".astro", ".svelte", ".ts"]);
const forbiddenFrameworkPackages = [
	"astro",
	"svelte",
	"three",
	"@threlte/",
	"@dimforge/rapier",
];
const browserGlobalPattern =
	/\b(document|window|localStorage|sessionStorage|indexedDB|requestAnimationFrame|cancelAnimationFrame|navigator|HTMLElement|HTMLCanvasElement|Worker)\b/g;
const oldEnginePathPattern = /(^|[^A-Za-z0-9_.-])\/?apps\/game(?:\/|$)/;
const oldEnginePathGlobalPattern = /(^|[^A-Za-z0-9_.-])\/?apps\/game(?:\/|$)/g;
const literalPattern = /["'`]([^"'`\n]+)["'`]/g;
const perLevelCollisionDraftImportPattern =
	/src\/game\/editor\/collisionDrafts\/[^/]+CollisionDraft$/;
const runtimeSceneIdLiteralPattern = /^[a-z][a-z0-9_]*_runtime$/;
const engineContentTokenPattern =
	/(^|[^a-z0-9])(?:miranda|observatory|sci[-_]?fi|yggdrasil|solitude|portal[-_]arena)(?:[^a-z0-9]|$)/i;

const files = await collectFiles(join(rootPath, "src"));
const violations = [];

for (const file of files) {
	const source = await readFile(file, "utf8");
	const rel = relative(rootPath, file).replaceAll(sep, "/");
	const imports = extractImportSpecifiers(source).map((specifier) =>
		resolveSpecifier(rel, specifier),
	);

	if (isOversizedPrimitiveParitySource(rel, source)) {
		violations.push(
			`${rel}: primitive parity owner files must stay small; move bulk imported scene data to generated JSON plus validation`,
		);
	}

	for (const match of oldEngineReferenceMatches(rel, source, imports)) {
		violations.push(
			`${rel}: sibling apps/game is read-only reference material (${match})`,
		);
	}

	for (const match of browserGameClientDevPreviewStaticImportMatches(
		rel,
		source,
	)) {
		violations.push(
			`${rel}: browser game client must lazy-load dev-preview code through the dev-only dynamic bridge (${match})`,
		);
	}

	if (pathStartsWith(rel, "src/engine")) {
		for (const forbiddenPath of ["src/app", "src/ui", "src/game"]) {
			for (const match of importsPath(imports, forbiddenPath)) {
				violations.push(
					`${rel}: engine code must not import ${forbiddenPath} (${match.specifier})`,
				);
			}
		}

		for (const match of engineContentLiteralMatches(source)) {
			violations.push(
				`${rel}: engine implementation must not embed level/content-specific IDs (${match})`,
			);
		}
	}

	if (pathStartsWith(rel, "src/engine/core")) {
		for (const specifier of importsPackage(
			imports,
			forbiddenFrameworkPackages,
		)) {
			violations.push(
				`${rel}: engine core must not import framework package "${specifier}"`,
			);
		}
	}

	if (pathStartsWith(rel, "src/engine/modules")) {
		for (const specifier of importsPackage(
			imports,
			forbiddenFrameworkPackages,
		)) {
			violations.push(
				`${rel}: engine modules must not import framework package "${specifier}"`,
			);
		}
	}

	if (pathStartsWith(rel, "src/game")) {
		for (const specifier of importsPackage(
			imports,
			forbiddenFrameworkPackages,
		)) {
			violations.push(
				`${rel}: game code must not import framework package "${specifier}"`,
			);
		}
	}

	if (isNormalRuntimeOwner(rel)) {
		for (const match of imports.filter(
			(entry) =>
				entry.kind === "relative" && isEditorModulePath(entry.resolved),
		)) {
			violations.push(
				`${rel}: normal runtime code must not import editor modules (${match.specifier})`,
			);
		}
	}

	if (isGenericAppEditorModule(rel)) {
		for (const match of levelSpecificEditorDefaultMatches(
			rel,
			source,
			imports,
		)) {
			violations.push(
				`${rel}: generic app/editor tooling must resolve editor content through the manifest/draft catalog (${match})`,
			);
		}
	}

	if (pathStartsWith(rel, "src/app/editor")) {
		for (const match of imports.filter(
			(entry) =>
				entry.kind === "relative" &&
				entry.resolved === "src/game/editor/authoring/index",
		)) {
			violations.push(
				`${rel}: browser editor modules must import browser-safe authoring submodules instead of the server persistence barrel (${match.specifier})`,
			);
		}
	}

	if (!isBrowserGlobalAllowed(rel)) {
		const globals = browserGlobalMatches(source);

		if (globals.length > 0) {
			violations.push(
				`${rel}: browser globals must stay in app, UI, or browser adapters (${globals.join(", ")})`,
			);
		}
	}
}

if (violations.length > 0) {
	console.error("Engine boundary audit failed:");
	for (const violation of violations) {
		console.error(`- ${violation}`);
	}
	process.exitCode = 1;
} else {
	console.log(`Engine boundary audit passed for ${files.length} source files.`);
}

async function collectFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const path = join(dir, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await collectFiles(path)));
			continue;
		}

		if (sourceExtensions.has(extensionOf(entry.name))) {
			files.push(path);
		}
	}

	return files;
}

function extensionOf(path) {
	return path.match(/\.[^.]+$/)?.[0] ?? "";
}

function extractImportSpecifiers(source) {
	const specifiers = new Set();
	const patterns = [
		/\bfrom\s*["']([^"']+)["']/g,
		/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
		/^\s*import\s*["']([^"']+)["']/gm,
	];

	for (const pattern of patterns) {
		for (const match of source.matchAll(pattern)) {
			specifiers.add(match[1]);
		}
	}

	return [...specifiers];
}

function extractStaticImportSpecifiers(source) {
	const specifiers = new Set();
	const patterns = [
		/\b(?:import|export)\s+(?:type\s+)?[\s\S]*?\bfrom\s*["']([^"']+)["']/g,
		/^\s*import\s*["']([^"']+)["']/gm,
	];

	for (const pattern of patterns) {
		for (const match of source.matchAll(pattern)) {
			specifiers.add(match[1]);
		}
	}

	return [...specifiers];
}

function resolveSpecifier(relFile, specifier) {
	if (!specifier.startsWith(".")) {
		return { kind: "package", specifier };
	}

	return {
		kind: "relative",
		specifier,
		resolved: stripSourceSuffix(
			normalize(join(dirname(relFile), specifier)).replaceAll(sep, "/"),
		),
	};
}

function stripSourceSuffix(path) {
	return path.replace(/\.(astro|svelte|ts|js|mjs|mts)$/, "");
}

function pathStartsWith(path, prefix) {
	return path === prefix || path.startsWith(`${prefix}/`);
}

function isNormalRuntimeOwner(rel) {
	return (
		pathStartsWith(rel, "src/engine") ||
		(pathStartsWith(rel, "src/game") &&
			!pathStartsWith(rel, "src/game/editor")) ||
		(pathStartsWith(rel, "src/app") &&
			!pathStartsWith(rel, "src/app/editor")) ||
		rel === "src/pages/index.astro"
	);
}

function isEditorModulePath(path) {
	return (
		pathStartsWith(path, "src/app/editor") ||
		pathStartsWith(path, "src/game/editor")
	);
}

function isGenericAppEditorModule(rel) {
	return pathStartsWith(rel, "src/app") || rel === "src/pages/editor.astro";
}

function importsPath(imports, pathPrefix) {
	return imports
		.filter((entry) => entry.kind === "relative")
		.filter((entry) => pathStartsWith(entry.resolved, pathPrefix));
}

function importsPackage(imports, packagePrefixes) {
	return imports
		.filter((entry) => entry.kind === "package")
		.map((entry) => entry.specifier)
		.filter((specifier) =>
			packagePrefixes.some(
				(prefix) =>
					specifier === prefix ||
					specifier.startsWith(`${prefix}/`) ||
					specifier.startsWith(prefix),
			),
		);
}

function isBrowserGlobalAllowed(rel) {
	return (
		pathStartsWith(rel, "src/app") ||
		pathStartsWith(rel, "src/ui") ||
		pathStartsWith(rel, "src/engine/adapters/browser") ||
		rel.endsWith(".astro") ||
		rel.endsWith(".svelte")
	);
}

function browserGlobalMatches(source) {
	return [
		...new Set([...source.matchAll(browserGlobalPattern)].map((m) => m[1])),
	].sort();
}

function oldEngineReferenceMatches(rel, source, imports) {
	const matches = new Set();

	for (const entry of imports) {
		if (
			entry.kind === "relative" &&
			pathStartsWith(entry.resolved, "../game")
		) {
			matches.add(`import ${entry.specifier}`);
		}

		if (
			entry.kind === "package" &&
			oldEnginePathPattern.test(entry.specifier)
		) {
			matches.add(`import ${entry.specifier}`);
		}
	}

	for (const match of source.matchAll(oldEnginePathGlobalPattern)) {
		matches.add(`reference ${match[0].trim()}`);
	}

	for (const match of source.matchAll(literalPattern)) {
		const literal = match[1].replaceAll("\\", "/");

		if (oldEnginePathPattern.test(literal)) {
			matches.add(`reference ${match[1]}`);
			continue;
		}

		if (
			literal.startsWith(".") &&
			pathStartsWith(
				stripSourceSuffix(
					normalize(join(dirname(rel), literal)).replaceAll(sep, "/"),
				),
				"../game",
			)
		) {
			matches.add(`reference ${match[1]}`);
		}
	}

	return [...matches].sort();
}

function browserGameClientDevPreviewStaticImportMatches(rel, source) {
	if (rel !== "src/app/browserGameClient.ts") {
		return [];
	}

	return extractStaticImportSpecifiers(source)
		.map((specifier) => resolveSpecifier(rel, specifier))
		.filter(
			(entry) =>
				entry.kind === "relative" &&
				pathStartsWith(entry.resolved, "src/app/devPreview"),
		)
		.map((entry) => `static import ${entry.specifier}`)
		.sort();
}

function engineContentLiteralMatches(source) {
	const matches = new Set();

	for (const match of source.matchAll(literalPattern)) {
		const literal = match[1].replaceAll("\\", "/");

		if (engineContentTokenPattern.test(literal)) {
			matches.add(match[1]);
		}
	}

	return [...matches].sort();
}

function levelSpecificEditorDefaultMatches(rel, source, imports) {
	const matches = new Set();

	for (const entry of imports) {
		if (
			entry.kind === "relative" &&
			perLevelCollisionDraftImportPattern.test(entry.resolved)
		) {
			matches.add(`direct per-level collision draft import ${entry.specifier}`);
		}
	}

	for (const match of source.matchAll(literalPattern)) {
		if (runtimeSceneIdLiteralPattern.test(match[1])) {
			matches.add(`runtime scene literal "${match[1]}"`);
		}
	}

	return [...matches].sort();
}

function isOversizedPrimitiveParitySource(rel, source) {
	return (
		pathStartsWith(rel, "src/game/content") &&
		rel.endsWith("PrimitiveParity.ts") &&
		source.split("\n").length > 250
	);
}
