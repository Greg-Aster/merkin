import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
	type LevelEditorAuthoringPersistenceResult,
	type LevelEditorAuthoringSaveTransactionData,
	type LevelEditorPublishedTransformPersistenceResult,
	PUBLISHED_LEVEL_TRANSFORMS_TARGET_FILE,
	buildLevelEditorOwnerRegistry,
	commitLevelEditorPublishChangeset,
	hashLevelEditorAuthoringFileContent,
	publishLevelEditorTransformTransaction,
	rollbackLevelEditorPublishChangeset,
	saveLevelEditorAuthoringTransaction,
	stagePublishedLevelTransformChangeset,
} from "../../../../game/editor/authoring/index.js";

export type LevelEditorAuthoringPersistenceApiMode = "dry-run" | "save";
export type LevelEditorAuthoringOwnerWriteApiMode = "dry-run" | "save-level";
export type LevelEditorAuthoringPublishApiMode = "dry-run" | "publish-local";

export type LevelEditorPublishValidationGateResult = {
	readonly scriptName: string;
	readonly ok: boolean;
	readonly output: string;
};

export type LevelEditorAuthoringPersistenceApiResult = {
	readonly ok: true;
	readonly mode:
		| LevelEditorAuthoringPersistenceApiMode
		| LevelEditorAuthoringOwnerWriteApiMode
		| LevelEditorAuthoringPublishApiMode;
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
		readonly changedStableIds?: readonly string[];
	}[];
	readonly validationGates?: readonly LevelEditorPublishValidationGateResult[];
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
const execFileAsync = promisify(execFile);
const publishValidationGateScripts = [
	"test:level-editor-save-contract",
	"test:runtime-scene-contract",
	"test:production-editor-bundle-contract",
	"type-check",
	"build",
] as const;
const authoringTargetKinds = new Set([
	"authoring-save",
	"level",
	"published-transforms",
] as const);
type LevelEditorAuthoringStatusTargetKind =
	| "authoring-save"
	| "level"
	| "published-transforms";

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
	targetKind: LevelEditorAuthoringStatusTargetKind = "authoring-save",
	statusAppRoot: string | URL = appRoot,
): Promise<LevelEditorAuthoringTargetStatus> {
	const registry = buildLevelEditorOwnerRegistry();
	const target = registry.targets.find(
		(candidate) =>
			candidate.runtimeSceneId === runtimeSceneId &&
			(targetKind === "authoring-save"
				? candidate.generatedOwnerKind === "authoring-save" &&
					candidate.writableByAuthoringSave
				: targetKind === "published-transforms"
					? candidate.generatedOwnerKind === "published-transforms"
					: candidate.ownerKind === "level"),
	);

	if (!target) {
		throw new Error(
			`Runtime scene "${runtimeSceneId}" does not have a "${targetKind}" authoring target.`,
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

export function parseAuthoringTargetKind(
	value: string | null,
): LevelEditorAuthoringStatusTargetKind {
	if (value === null || value === "") {
		return "authoring-save";
	}

	if (authoringTargetKinds.has(value as LevelEditorAuthoringStatusTargetKind)) {
		return value as LevelEditorAuthoringStatusTargetKind;
	}

	throw new Error(
		'target must be "authoring-save", "level", or "published-transforms".',
	);
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

export async function handleLevelEditorLevelOwnerWriteRequest(options: {
	readonly request: Request;
	readonly appRoot?: string | URL;
}): Promise<Response> {
	if (!isLevelEditorAuthoringApiEnabled()) {
		return levelEditorAuthoringApiDisabledResponse();
	}

	try {
		const body = await readJsonBody(options.request);
		const mode = ownerWriteModeFromBody(body);
		const transaction = parseSaveTransactionBody(body);
		const baseHash = parseBaseHashBody(body);
		const result = await publishLevelEditorTransformTransaction({
			appRoot: options.appRoot ?? appRoot,
			transaction,
			baseHash,
			dryRun: mode === "dry-run",
		});

		return jsonResponse(toPublishedTransformApiResult(result, mode), {
			status: mode === "dry-run" ? 200 : 201,
		});
	} catch (error) {
		return jsonErrorResponse(formatError(error), errorStatus(error));
	}
}

export async function handleLevelEditorLocalPublishRequest(options: {
	readonly request: Request;
	readonly appRoot?: string | URL;
	readonly runValidationGate?: (
		scriptName: string,
	) => Promise<LevelEditorPublishValidationGateResult>;
}): Promise<Response> {
	if (!isLevelEditorAuthoringApiEnabled()) {
		return levelEditorAuthoringApiDisabledResponse();
	}

	try {
		const body = await readJsonBody(options.request);
		const mode = publishModeFromBody(body);
		const transaction = parseSaveTransactionBody(body);
		const baseHash = parseBaseHashBody(body);
		const publishRoot = options.appRoot ?? appRoot;

		if (mode === "dry-run") {
			const result = await publishLevelEditorTransformTransaction({
				appRoot: publishRoot,
				transaction,
				baseHash,
				dryRun: true,
			});

			return jsonResponse(toPublishedTransformApiResult(result, "dry-run"), {
				status: 200,
			});
		}

		const staged = await stagePublishedLevelTransformChangeset({
			appRoot: publishRoot,
			transaction,
			baseHash,
		});
		const wroteFile = await commitLevelEditorPublishChangeset(staged.changeset);
		const gates: LevelEditorPublishValidationGateResult[] = [];

		try {
			for (const scriptName of publishValidationGateScripts) {
				const gate = options.runValidationGate
					? await options.runValidationGate(scriptName)
					: await runPackageScriptValidationGate(scriptName);
				gates.push(gate);

				if (!gate.ok) {
					throw new Error(
						`Publish validation gate "${scriptName}" failed:\n${gate.output}`,
					);
				}
			}
		} catch (error) {
			await rollbackLevelEditorPublishChangeset(staged.changeset);
			throw error;
		}

		return jsonResponse(
			toPublishedTransformApiResult(
				{
					dryRun: false,
					targetFile: PUBLISHED_LEVEL_TRANSFORMS_TARGET_FILE,
					absolutePath: staged.absolutePath,
					baseHash,
					currentHash: staged.changeset.entries[0]?.priorHash ?? baseHash,
					contentHash:
						staged.changeset.entries[0]?.currentHash ??
						hashLevelEditorAuthoringFileContent(undefined),
					wroteFile,
					changeset: staged.changeset,
					overrides: staged.overrides,
					publishedStableIds: staged.publishedStableIds,
				},
				"publish-local",
				gates,
			),
			{ status: 201 },
		);
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

function ownerWriteModeFromBody(
	body: unknown,
): LevelEditorAuthoringOwnerWriteApiMode {
	if (!isRecord(body) || body.mode === undefined) {
		return "save-level";
	}

	if (body.mode === "dry-run" || body.mode === "save-level") {
		return body.mode;
	}

	throw new Error('Request body mode must be "dry-run" or "save-level".');
}

function publishModeFromBody(
	body: unknown,
): LevelEditorAuthoringPublishApiMode {
	if (!isRecord(body) || body.mode === undefined) {
		return "publish-local";
	}

	if (body.mode === "dry-run" || body.mode === "publish-local") {
		return body.mode;
	}

	throw new Error('Request body mode must be "dry-run" or "publish-local".');
}

function parseBaseHashBody(body: unknown): string {
	if (!isRecord(body) || typeof body.baseHash !== "string") {
		throw new Error("Request body must include baseHash for owner writes.");
	}

	return body.baseHash;
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

function toPublishedTransformApiResult(
	result: LevelEditorPublishedTransformPersistenceResult,
	mode:
		| LevelEditorAuthoringOwnerWriteApiMode
		| LevelEditorAuthoringPublishApiMode,
	validationGates: readonly LevelEditorPublishValidationGateResult[] = [],
): LevelEditorAuthoringPersistenceApiResult {
	return {
		ok: true,
		mode,
		dryRun: result.dryRun,
		message:
			mode === "dry-run"
				? "Level editor Save Level dry run completed."
				: mode === "publish-local"
					? "Level editor Publish completed."
					: "Level editor Save Level completed.",
		writePlanContentHash: result.contentHash,
		artifacts: [
			{
				targetId: "generated:published-transforms",
				targetFile: result.targetFile,
				baseHash: result.baseHash,
				currentHash: result.currentHash,
				contentHash: result.contentHash,
				wroteFile: result.wroteFile,
				changedStableIds: result.publishedStableIds,
			},
		],
		...(validationGates.length === 0 ? {} : { validationGates }),
	};
}

async function runPackageScriptValidationGate(
	scriptName: string,
): Promise<LevelEditorPublishValidationGateResult> {
	try {
		const result = await execFileAsync("pnpm", ["--dir", appRoot, scriptName]);

		return {
			scriptName,
			ok: true,
			output: `${result.stdout}${result.stderr}`.slice(0, 4000),
		};
	} catch (error) {
		const output =
			typeof error === "object" && error !== null
				? `${"stdout" in error ? String(error.stdout) : ""}${
						"stderr" in error ? String(error.stderr) : ""
					}`
				: String(error);

		return {
			scriptName,
			ok: false,
			output: output.slice(0, 4000),
		};
	}
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
