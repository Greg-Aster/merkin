import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const textExtensions = new Set([
	"",
	".astro",
	".cjs",
	".css",
	".html",
	".js",
	".json",
	".jsonc",
	".md",
	".mjs",
	".py",
	".sh",
	".svelte",
	".ts",
	".tsx",
	".txt",
	".yaml",
	".yml",
]);
const maxTextFileBytes = 2 * 1024 * 1024;
const activeReferencePatterns = [
	{
		name: "old app path",
		pattern: /(^|[^A-Za-z0-9_.-])(?:\/home\/greggles\/Merkin\/)?apps\/game(?:[\/\s"'`):]|$)/g,
	},
	{
		name: "old package name",
		pattern: /@merkin\/game(?!-megameal|[A-Za-z0-9_-])/g,
	},
	{
		name: "old deploy dist",
		pattern: /apps\/game\/dist/g,
	},
	{
		name: "old package command",
		pattern: /pnpm\s+--dir\s+apps\/game(?:\s|$)/g,
	},
	{
		name: "legacy root script",
		pattern: /game:legacy/g,
	},
];

const files = listRepositoryFiles();
const violations = [];
const allowedHistorical = [];

for (const file of files) {
	if (!shouldScanFile(file)) {
		continue;
	}

	const absolutePath = path.join(repoRoot, file);
	const source = readFileSync(absolutePath, "utf8");

	for (const match of findMatches(source)) {
		if (isAllowedHistoricalReference(file)) {
			allowedHistorical.push(`${file}: ${match.name}`);
			continue;
		}

		violations.push(`${file}: active legacy reference (${match.name})`);
	}
}

if (violations.length > 0) {
	console.error("Legacy game reference audit failed:");
	for (const violation of violations) {
		console.error(`- ${violation}`);
	}
	process.exitCode = 1;
} else {
	console.log(
		`Legacy game reference audit passed for ${files.length} repository files.`,
	);
	console.log(
		`Allowed historical/provenance legacy references: ${allowedHistorical.length}`,
	);
}

function listRepositoryFiles() {
	const output = gitLsFilesOutput();

	return output
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.filter((file) => !pathStartsWith(file, "apps/game"));
}

function gitLsFilesOutput() {
	try {
		return execFileSync(
			"git",
			["ls-files", "--cached", "--others", "--exclude-standard"],
			{
				cwd: repoRoot,
				encoding: "utf8",
			},
		);
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"stdout" in error &&
			typeof error.stdout === "string" &&
			error.stdout.trim().length > 0
		) {
			return error.stdout;
		}

		throw error;
	}
}

function shouldScanFile(file) {
	const extension = path.extname(file);

	if (!textExtensions.has(extension)) {
		return false;
	}

	try {
		return statSync(path.join(repoRoot, file)).size <= maxTextFileBytes;
	} catch {
		return false;
	}
}

function findMatches(source) {
	const matches = [];

	for (const referencePattern of activeReferencePatterns) {
		referencePattern.pattern.lastIndex = 0;

		if (referencePattern.pattern.test(source)) {
			matches.push(referencePattern);
		}
	}

	return matches;
}

function isAllowedHistoricalReference(file) {
	if (
		file === "scripts/audit-legacy-game-references.mjs" ||
		file === "AGENTS.md" ||
		file === ".gitignore" ||
		file === "apps/game.megameal/scripts/audit-engine-boundaries.mjs" ||
		file === "apps/megameal/public/audio/README.md"
	) {
		return true;
	}

	if (
		file === "apps/game.megameal/AGENTS.md" ||
		file === "apps/game.megameal/ARCHITECTURE.md" ||
		file === "apps/game.megameal/GAME_ENGINE_DESIGN_DOCUMENT.md" ||
		file === "apps/game.megameal/ENGINE_CONTRACT_REGISTER.md" ||
		pathStartsWith(file, "apps/game.megameal/docs")
	) {
		return true;
	}

	if (pathStartsWith(file, "apps/megameal/public/generated")) {
		return true;
	}

	if (pathStartsWith(file, "apps/blender/scene-packages")) {
		return true;
	}

	return false;
}

function pathStartsWith(file, prefix) {
	return file === prefix || file.startsWith(`${prefix}/`);
}
