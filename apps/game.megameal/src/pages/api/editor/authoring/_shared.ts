import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
	type LevelEditorAuthoringPersistenceResult,
	type LevelEditorAuthoringSaveTransactionData,
	buildLevelEditorOwnerRegistry,
	hashLevelEditorAuthoringFileContent,
	saveLevelEditorAuthoringTransaction,
} from "../../../../game/editor/authoring/index.js";

export type LevelEditorAuthoringPersistenceApiMode = "dry-run" | "save";

export type LevelEditorAuthoringPersistenceApiResult = {
	readonly ok: true;
	readonly mode: LevelEditorAuthoringPersistenceApiMode;
	readonly dryRun: boolean;
	readonly message: string;
	readonly writePlanContentHash: string;
	readonly artifacts: readonly {
		readonly targetId: string;
		readonly targetFile: string;
		readonly baseHash: string;
		readonly currentHash: string;
		readonly contentHash: string;
		readonly wroteFile: boolean;
	}[];
};

export type LevelEditorAuthoringPersistenceApiError = {
	readonly ok: false;
	readonly message: string;
	readonly errors: readonly string[];
	readonly error: {
		readonly code: string;
		readonly message: string;
	};
};

export type LevelEditorAuthoringTargetStatus = {
	readonly runtimeSceneId: string;
	readonly targetId: string;
	readonly targetFile: string;
	readonly baseHash: string;
	readonly exists: boolean;
};

const appRoot = fileURLToPath(new URL("../../../../../", import.meta.url));

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
	const headers = new Headers(init.headers);
	headers.set("content-type", "application/json; charset=utf-8");

	return new Response(JSON.stringify(body, null, 2), {
		...init,
		headers,
	});
}

export function jsonErrorResponse(
	message: string,
	status: number,
	code = "LEVEL_EDITOR_AUTHORING_API_ERROR",
): Response {
	return jsonResponse(
		{
			ok: false,
			message,
			errors: [message],
			error: {
				code,
				message,
			},
		} satisfies LevelEditorAuthoringPersistenceApiError,
		{ status },
	);
}

export function levelEditorAuthoringApiDisabledResponse(): Response {
	return jsonErrorResponse(
		"Level editor authoring API routes are available only in development mode.",
		403,
		"LEVEL_EDITOR_AUTHORING_API_DISABLED",
	);
}

export function disabledResponse(): Response {
	return levelEditorAuthoringApiDisabledResponse();
}

export function isLevelEditorAuthoringApiEnabled(): boolean {
	return process.env.NODE_ENV !== "production";
}

export async function authoringTargetStatus(
	runtimeSceneId: string,
	statusAppRoot: string | URL = appRoot,
): Promise<LevelEditorAuthoringTargetStatus> {
	const registry = buildLevelEditorOwnerRegistry();
	const target = registry.targets.find(
		(candidate) =>
			candidate.runtimeSceneId === runtimeSceneId &&
			candidate.generatedOwnerKind === "authoring-save" &&
			candidate.writableByAuthoringSave,
	);

	if (!target) {
		throw new Error(
			`Runtime scene "${runtimeSceneId}" does not have a writable authoring-save target.`,
		);
	}

	const absolutePath = resolveTargetPath({
		appRoot: normalizeAppRoot(statusAppRoot),
		targetFile: target.targetFile,
	});
	const currentSource = await readOptionalFile(absolutePath);

	return {
		runtimeSceneId,
		targetId: target.id,
		targetFile: target.targetFile,
		baseHash: hashLevelEditorAuthoringFileContent(currentSource),
		exists: currentSource !== undefined,
	};
}

export async function handleLevelEditorAuthoringPersistenceRequest(options: {
	readonly request: Request;
	readonly mode: LevelEditorAuthoringPersistenceApiMode;
	readonly appRoot?: string | URL;
}): Promise<Response> {
	if (!isLevelEditorAuthoringApiEnabled()) {
		return levelEditorAuthoringApiDisabledResponse();
	}

	try {
		const body = await readJsonBody(options.request);
		const mode = persistenceModeFromBody(body, options.mode);
		const transaction = parseSaveTransactionBody(body);
		const result = await saveLevelEditorAuthoringTransaction({
			appRoot: options.appRoot ?? appRoot,
			transaction,
			dryRun: mode === "dry-run",
		});

		return jsonResponse(toApiResult(result, mode), {
			status: mode === "dry-run" ? 200 : 201,
		});
	} catch (error) {
		return jsonErrorResponse(formatError(error), errorStatus(error));
	}
}

async function readJsonBody(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		throw new Error("Request body must be valid JSON.");
	}
}

function parseSaveTransactionBody(
	body: unknown,
): LevelEditorAuthoringSaveTransactionData {
	const transaction =
		isRecord(body) && isRecord(body.transaction) ? body.transaction : body;

	if (!isRecord(transaction)) {
		throw new Error(
			"Request body must be a LevelEditorAuthoringSaveTransactionData object or { transaction }.",
		);
	}

	return transaction as LevelEditorAuthoringSaveTransactionData;
}

function persistenceModeFromBody(
	body: unknown,
	defaultMode: LevelEditorAuthoringPersistenceApiMode,
): LevelEditorAuthoringPersistenceApiMode {
	if (defaultMode === "dry-run") {
		return "dry-run";
	}

	if (!isRecord(body) || body.mode === undefined) {
		return defaultMode;
	}

	if (body.mode === "dry-run" || body.mode === "save") {
		return body.mode;
	}

	throw new Error('Request body mode must be "dry-run" or "save".');
}

function toApiResult(
	result: LevelEditorAuthoringPersistenceResult,
	mode: LevelEditorAuthoringPersistenceApiMode,
): LevelEditorAuthoringPersistenceApiResult {
	return {
		ok: true,
		mode,
		dryRun: result.dryRun,
		message:
			mode === "dry-run"
				? "Level editor authoring dry run completed."
				: "Level editor authoring save completed.",
		writePlanContentHash: result.writePlanContentHash,
		artifacts: result.artifacts.map((artifact) => ({
			targetId: artifact.targetId,
			targetFile: artifact.targetFile,
			baseHash: artifact.baseHash,
			currentHash: artifact.currentHash,
			contentHash: artifact.contentHash,
			wroteFile: artifact.wroteFile,
		})),
	};
}

function errorStatus(error: unknown): number {
	const message = formatError(error);

	if (message.includes("base hash mismatch")) {
		return 409;
	}

	return 400;
}

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function normalizeAppRoot(root: string | URL): string {
	return root instanceof URL ? resolve(fileURLToPath(root)) : resolve(root);
}

function resolveTargetPath(options: {
	readonly appRoot: string;
	readonly targetFile: string;
}): string {
	if (isAbsolute(options.targetFile)) {
		throw new Error(
			`Refusing absolute level editor authoring target "${options.targetFile}".`,
		);
	}

	const absolutePath = resolve(options.appRoot, options.targetFile);
	const relativePath = relative(options.appRoot, absolutePath);

	if (
		relativePath === "" ||
		relativePath.startsWith("..") ||
		isAbsolute(relativePath) ||
		relativePath.split(sep).includes("..")
	) {
		throw new Error(
			`Refusing level editor authoring target outside app root: "${options.targetFile}".`,
		);
	}

	return absolutePath;
}

async function readOptionalFile(path: string): Promise<string | undefined> {
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") {
			return undefined;
		}

		throw error;
	}
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
