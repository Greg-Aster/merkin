import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const productionChunkDirectory = join(appRoot, "dist", "_astro");
const browserGameClientSourcePath = join(
	appRoot,
	"src",
	"app",
	"browserGameClient.ts",
);
const forbiddenEditorChunkPatterns: readonly RegExp[] = [
	/^LevelEditorPreviewControls\..*\.js$/u,
	/^browserGameDevPreviewBridge\..*\.js$/u,
	/^gameWindowPreviewProtocol\..*\.js$/u,
	/^levelEditorPreviewChannel\..*\.js$/u,
	/^editor\..*\.css$/u,
];
const forbiddenDevPreviewProductionMarkers: readonly {
	readonly label: string;
	readonly pattern: RegExp;
}[] = [
	{
		label: "dev-preview channel id",
		pattern: /level-editor-dev-preview/u,
	},
	{
		label: "dev-preview BroadcastChannel transport",
		pattern: /\bBroadcastChannel\b/u,
	},
	{
		label: "collision preview patch protocol",
		pattern: /collision-preview-patch/u,
	},
	{
		label: "core object preview protocol",
		pattern: /core-object-preview-patch/u,
	},
	{
		label: "object edit preview protocol",
		pattern: /object-edit-preview-patch/u,
	},
	{
		label: "camera live edit protocol",
		pattern: /camera-live-edit-mode/u,
	},
	{
		label: "runtime reload protocol",
		pattern: /reload-runtime-scene/u,
	},
	{
		label: "runtime reload ACK protocol",
		pattern: /runtime-reload-ack/u,
	},
	{
		label: "runtime telemetry protocol",
		pattern: /runtime-telemetry/u,
	},
];

await assertBrowserGameClientDevPreviewImportBoundary();

const productionChunks = await readProductionChunks();
const chunkFileNames = productionChunks.map((chunk) => chunk.fileName);
const forbiddenEditorChunks = chunkFileNames.filter((fileName) =>
	forbiddenEditorChunkPatterns.some((pattern) => pattern.test(fileName)),
);
const forbiddenDevPreviewMarkers = productionChunks.flatMap((chunk) =>
	forbiddenDevPreviewProductionMarkers
		.filter((marker) => marker.pattern.test(chunk.source))
		.map((marker) => `${chunk.fileName}: ${marker.label}`),
);

if (forbiddenEditorChunks.length > 0) {
	throw new Error(
		[
			"Expected production build output to exclude dev-only level editor chunks.",
			`Forbidden chunks: ${forbiddenEditorChunks.join(", ")}`,
			"Keep /editor/ controls behind a dev-only dynamic import boundary.",
		].join("\n"),
	);
}

if (forbiddenDevPreviewMarkers.length > 0) {
	throw new Error(
		[
			"Expected production build output to exclude dev-preview runtime code.",
			`Forbidden markers: ${forbiddenDevPreviewMarkers.join(", ")}`,
			"Keep browserGameClient dev-preview wiring behind an import.meta.env.DEV dynamic import boundary.",
		].join("\n"),
	);
}

console.log(
	"Production editor bundle contract passed: no dev-only level editor chunks, CSS, or dev-preview runtime markers were emitted.",
);

async function readProductionChunks(): Promise<
	readonly {
		readonly fileName: string;
		readonly source: string;
	}[]
> {
	try {
		const entries = await readdir(productionChunkDirectory, {
			withFileTypes: true,
		});

		const fileNames = entries
			.filter((entry) => entry.isFile())
			.map((entry) => entry.name)
			.sort((left, right) => left.localeCompare(right));

		return Promise.all(
			fileNames.map(async (fileName) => ({
				fileName,
				source: fileName.endsWith(".js")
					? await readFile(join(productionChunkDirectory, fileName), "utf8")
					: "",
			})),
		);
	} catch (error) {
		throw new Error(
			[
				`Expected production build chunks in ${relative(
					appRoot,
					productionChunkDirectory,
				)}.`,
				"Run `pnpm --dir apps/game.megameal build` before `pnpm --dir apps/game.megameal test:production-editor-bundle-contract`.",
				formatErrorCause(error),
			].join("\n"),
		);
	}
}

async function assertBrowserGameClientDevPreviewImportBoundary(): Promise<void> {
	const source = await readFile(browserGameClientSourcePath, "utf8");
	const staticDevPreviewImports = extractStaticImportSpecifiers(source).filter(
		(specifier) =>
			specifier === "./browserGameDevPreviewBridge.js" ||
			specifier.startsWith("./devPreview"),
	);

	if (staticDevPreviewImports.length > 0) {
		throw new Error(
			[
				"Expected browserGameClient to avoid static dev-preview imports.",
				`Forbidden imports: ${staticDevPreviewImports.join(", ")}`,
				"Keep browserGameClient dev-preview wiring behind an import.meta.env.DEV dynamic import boundary.",
			].join("\n"),
		);
	}

	if (
		!source.includes('await import("./browserGameDevPreviewBridge.js")') ||
		!source.includes("import.meta") ||
		!source.includes(".env.DEV")
	) {
		throw new Error(
			"Expected browserGameClient to keep the dev-preview bridge behind a DEV-only dynamic import.",
		);
	}
}

function extractStaticImportSpecifiers(source: string): readonly string[] {
	const specifiers = new Set<string>();
	const patterns = [
		/^\s*import\s+[^"']*?\sfrom\s*["']([^"']+)["']/gmu,
		/^\s*import\s*["']([^"']+)["']/gmu,
	];

	for (const pattern of patterns) {
		for (const match of source.matchAll(pattern)) {
			const specifier = match[1];

			if (specifier !== undefined) {
				specifiers.add(specifier);
			}
		}
	}

	return [...specifiers];
}

function formatErrorCause(error: unknown): string {
	return error instanceof Error ? `Cause: ${error.message}` : String(error);
}
