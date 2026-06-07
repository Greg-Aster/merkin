import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const productionChunkDirectory = join(appRoot, "dist", "_astro");
const forbiddenEditorChunkPatterns: readonly RegExp[] = [
	/^LevelEditorPreviewControls\..*\.js$/u,
	/^editor\..*\.css$/u,
];

const chunkFileNames = await readProductionChunkFileNames();
const forbiddenEditorChunks = chunkFileNames.filter((fileName) =>
	forbiddenEditorChunkPatterns.some((pattern) => pattern.test(fileName)),
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

console.log(
	"Production editor bundle contract passed: no dev-only level editor controls or CSS chunks were emitted.",
);

async function readProductionChunkFileNames(): Promise<readonly string[]> {
	try {
		const entries = await readdir(productionChunkDirectory, {
			withFileTypes: true,
		});

		return entries
			.filter((entry) => entry.isFile())
			.map((entry) => entry.name)
			.sort((left, right) => left.localeCompare(right));
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

function formatErrorCause(error: unknown): string {
	return error instanceof Error ? `Cause: ${error.message}` : String(error);
}
