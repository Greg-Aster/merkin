import { spawnSync } from "node:child_process";
import { relative, sep } from "node:path";

const appRoot = new URL("..", import.meta.url);
const rootPath = appRoot.pathname;
const gitRoot = runGit(["rev-parse", "--show-toplevel"], rootPath);
const appRelativeRoot = relative(gitRoot, rootPath).replaceAll(sep, "/");
const allowProtectedDocEdits =
	process.env.ALLOW_PROTECTED_DOC_EDITS === "explicit-user-request";

const protectedDocs = [
	"AGENTS.md",
	"ARCHITECTURE.md",
	"GAME_ENGINE_DESIGN_DOCUMENT.md",
	"docs/AGENT_OPERATING_CONTRACT.md",
];
const protectedDocPaths = protectedDocs.map(
	(doc) => `${appRelativeRoot}/${doc}`,
);

const changedDocs = new Set([
	...gitChanged(["diff", "--name-only", "--", ...protectedDocPaths]),
	...gitChanged([
		"diff",
		"--cached",
		"--name-only",
		"--",
		...protectedDocPaths,
	]),
	...gitChanged([
		"ls-files",
		"--others",
		"--exclude-standard",
		"--",
		...protectedDocPaths,
	]),
]);

if (changedDocs.size === 0) {
	console.log("Protected document audit passed.");
} else if (allowProtectedDocEdits) {
	console.log(
		`Protected document audit allowed by explicit request: ${[...changedDocs].join(", ")}`,
	);
} else {
	console.error("Protected document audit failed.");
	console.error(
		"These files define target design, architecture, or agent operating authority:",
	);
	for (const doc of changedDocs) {
		console.error(`- ${doc}`);
	}
	console.error(
		"Do not change them to justify implementation drift. Only edit them when the user explicitly asks for design/architecture/agent-instruction reconciliation.",
	);
	console.error(
		"For an explicitly requested reconciliation, rerun with ALLOW_PROTECTED_DOC_EDITS=explicit-user-request.",
	);
	process.exitCode = 1;
}

function gitChanged(args) {
	return runGit(args, gitRoot)
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}

function runGit(args, cwd) {
	const result = spawnSync("git", ["-C", cwd, ...args], {
		encoding: "utf8",
	});

	if (result.status !== 0) {
		throw result.error ?? new Error(result.stderr || "git diff failed");
	}

	return result.stdout.trim();
}
