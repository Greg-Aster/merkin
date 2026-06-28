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
const runtimeSceneIdPattern = /["'`]([a-z0-9]+(?:_[a-z0-9]+)*_runtime)["'`]/g;
const literalPattern = /["'`]([^"'`\n]+)["'`]/g;

const files = await collectFiles(join(rootPath, "src"));
const violations = [];

for (const file of files) {
	const source = await readFile(file, "utf8");
	const rel = relative(rootPath, file).replaceAll(sep, "/");
	const imports = extractImportSpecifiers(source).map((specifier) =>
		resolveSpecifier(rel, specifier),
	);

	for (const match of oldEngineReferenceMatches(rel, source, imports)) {
		violations.push(
			`${rel}: sibling apps/game is read-only reference material (${match})`,
		);
	}

	if (pathStartsWith(rel, "src/game/assets")) {
		violations.push(
			`${rel}: product asset manifests belong in a level folder under src/levels or in src/levels/global for shared package data`,
		);
	}

	if (
		pathStartsWith(rel, "src/game/prefabs") &&
		rel !== "src/game/prefabs/index.ts"
	) {
		violations.push(
			`${rel}: product prefab definitions belong in a level folder under src/levels or in src/levels/global for shared package data`,
		);
	}

	if (!isLevelPackageFile(rel)) {
		for (const runtimeSceneId of runtimeSceneIdMatches(source)) {
			violations.push(
				`${rel}: runtime scene ID "${runtimeSceneId}" belongs in src/levels`,
			);
		}
	}

	if (!isLevelPackageImportAllowed(rel)) {
		for (const match of importsPath(imports, "src/levels")) {
			violations.push(
				`${rel}: only level-package code may statically import src/levels (${match.specifier})`,
			);
		}
	}

	if (pathStartsWith(rel, "src/engine")) {
		for (const forbiddenPath of [
			"src/app",
			"src/ui",
			"src/game",
			"src/levels",
			"src/editor",
		]) {
			for (const match of importsPath(imports, forbiddenPath)) {
				violations.push(
					`${rel}: engine code must not import ${forbiddenPath} (${match.specifier})`,
				);
			}
		}
	}

	if (!isEditorImportAllowed(rel)) {
		for (const match of importsPath(imports, "src/editor")) {
			violations.push(
				`${rel}: only the editor route may import src/editor (${match.specifier})`,
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
		pathStartsWith(rel, "src/editor") ||
		pathStartsWith(rel, "src/engine/adapters/browser") ||
		rel.endsWith(".astro") ||
		rel.endsWith(".svelte")
	);
}

function isEditorImportAllowed(rel) {
	return (
		pathStartsWith(rel, "src/editor") ||
		rel === "src/pages/editor.astro" ||
		pathStartsWith(rel, "src/pages/editor")
	);
}

function isLevelPackageFile(rel) {
	return pathStartsWith(rel, "src/levels");
}

function isLevelPackageImportAllowed(rel) {
	return pathStartsWith(rel, "src/levels");
}

function browserGlobalMatches(source) {
	return [
		...new Set([...source.matchAll(browserGlobalPattern)].map((m) => m[1])),
	].sort();
}

function runtimeSceneIdMatches(source) {
	return [
		...new Set([...source.matchAll(runtimeSceneIdPattern)].map((m) => m[1])),
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
