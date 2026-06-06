import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
	type LevelEditorPreviewChannelMessageHandler,
	type LevelEditorPreviewChannelPort,
	applyCollisionPreviewPatchToRuntime,
	clearCollisionPreviewPatchFromRuntime,
	connectGameWindowDevPreviewChannel,
	handleGameWindowDevPreviewMessage,
	postLevelEditorDevPreviewMessage,
} from "../src/app/devPreview/index.js";
import {
	type CollisionCookPreviewPatch,
	LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
	type LevelEditorCollisionPreviewClearRequest,
	type LevelEditorRuntimeReloadRequest,
	createCollisionPreviewClearRequestMessage,
	createCollisionPreviewPatchMessage,
	createRuntimeSceneReloadRequestMessage,
	parseLevelEditorDevPreviewMessage,
} from "../src/engine/data/index.js";
import {
	COLLIDER_COMPONENT,
	EngineRuntime,
	PHYSICS_TRANSFORM_COMPONENT,
} from "../src/engine/index.js";
import { STABLE_ID_COMPONENT } from "../src/game/prefabs/index.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = normalize(join(scriptDirectory, ".."));
const validPreviewPatch = createValidPreviewPatch();
const validPreviewMessage = createCollisionPreviewPatchMessage({
	requestId: "test-preview:valid",
	patch: validPreviewPatch,
});

function createValidPreviewPatch(): CollisionCookPreviewPatch {
	return {
		schemaVersion: 1,
		channel: "level-editor-collision-preview",
		mode: "temporary-preview",
		draftId: "test_collision_preview_draft",
		runtimeSceneId: "observatory_runtime",
		levelId: "observatory",
		sourcePlanHash: "fnv1a32:test0001",
		entries: [
			{
				id: "test-preview-collider",
				stableId: "observatory:collision:boundary:north",
				prefabId: "observatory_boundary_blocker",
				colliderTarget: "level-instance",
				transform: {
					position: [0, 5.8, -304],
				},
				colliderComponent: {
					intent: "solid",
					channel: "worldStatic",
					shape: {
						type: "box",
						halfExtents: [320, 4, 4],
					},
				},
				readiness: {
					requiredCollision: true,
				},
			},
		],
		requiredCollisionStableIds: ["observatory:collision:boundary:north"],
		requiredWalkableStableIds: [],
	};
}

function assertProtocolMessageValidation(): void {
	const parsed = parseLevelEditorDevPreviewMessage(validPreviewMessage);

	assertEqual(
		parsed.protocol,
		LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		"Expected preview message protocol to be explicit.",
	);
	assertEqual(
		parsed.type,
		"collision-preview-patch",
		"Expected preview message type to identify collision patches.",
	);

	if (parsed.type !== "collision-preview-patch") {
		throw new Error("Expected parsed preview message to be a collision patch.");
	}

	assertEqual(
		parsed.payload.channel,
		"level-editor-collision-preview",
		"Expected message payload to carry the collision cook preview channel.",
	);
	assertEqual(
		parsed.payload.entries.length,
		1,
		"Expected fixture preview patch to include 1 entry.",
	);

	createCollisionPreviewPatchMessage({
		requestId: "test-preview:explicit-create",
		patch: parsed.payload,
	});
}

function assertInvalidPreviewPatchRejection(): void {
	const invalidPreviewMessage = {
		...validPreviewMessage,
		payload: {
			...validPreviewMessage.payload,
			channel: "invalid-preview-channel",
		},
	};
	const fakeChannel = new InMemoryPreviewChannel();

	expectInvalidMessage(invalidPreviewMessage, "collisionPreviewPatch.channel");
	expectInvalidSend(
		fakeChannel,
		invalidPreviewMessage,
		"collisionPreviewPatch.channel",
	);
	expectInvalidPreviewApplication(
		invalidPreviewMessage.payload as CollisionCookPreviewPatch,
		"collisionPreviewPatch.channel",
	);

	let appliedPreview: CollisionCookPreviewPatch | undefined;
	let reloaded: LevelEditorRuntimeReloadRequest | undefined;
	const result = handleGameWindowDevPreviewMessage(invalidPreviewMessage, {
		applyPreview(patch) {
			appliedPreview = patch;
		},
		reload(request) {
			reloaded = request;
		},
	});

	if (result.ok) {
		throw new Error("Expected invalid preview message to be rejected.");
	}

	if (
		!result.errors.some((error) =>
			error.includes("collisionPreviewPatch.channel"),
		)
	) {
		throw new Error(
			`Expected invalid preview rejection to mention collisionPreviewPatch.channel, received:\n${result.errors.join("\n")}`,
		);
	}

	if (appliedPreview !== undefined || reloaded !== undefined) {
		throw new Error("Expected invalid preview message to avoid callbacks.");
	}
}

function assertReloadRequestShape(): void {
	const reloadMessage = createRuntimeSceneReloadRequestMessage({
		requestId: "test-reload:valid",
		runtimeSceneId: "observatory_runtime",
		reason: "collision-bake-applied",
		sourcePlanHash: validPreviewMessage.payload.sourcePlanHash,
	});
	const parsed = parseLevelEditorDevPreviewMessage(reloadMessage);

	assertEqual(
		parsed.type,
		"reload-runtime-scene",
		"Expected reload request message type.",
	);

	if (parsed.type !== "reload-runtime-scene") {
		throw new Error("Expected parsed reload message to be a reload request.");
	}

	assertEqual(
		parsed.request.runtimeSceneId,
		"observatory_runtime",
		"Expected reload request to target Observatory.",
	);
	assertEqual(
		parsed.request.reason,
		"collision-bake-applied",
		"Expected reload request to record bake-applied reason.",
	);

	expectInvalidMessage(
		{
			...reloadMessage,
			request: {
				...reloadMessage.request,
				runtimeSceneId: undefined,
			},
		},
		"runtimeSceneId must be a non-empty string",
	);
}

function assertClearPreviewRequestShape(): void {
	const clearMessage = createCollisionPreviewClearRequestMessage({
		requestId: "test-clear:valid",
		runtimeSceneId: "observatory_runtime",
		sourcePlanHash: validPreviewMessage.payload.sourcePlanHash,
		stableIds: validPreviewMessage.payload.entries.map(
			(entry) => entry.stableId,
		),
	});
	const parsed = parseLevelEditorDevPreviewMessage(clearMessage);

	assertEqual(
		parsed.type,
		"clear-collision-preview",
		"Expected clear-preview request message type.",
	);

	if (parsed.type !== "clear-collision-preview") {
		throw new Error(
			"Expected parsed clear-preview message to be a clear request.",
		);
	}

	assertEqual(
		parsed.request.runtimeSceneId,
		"observatory_runtime",
		"Expected clear-preview request to target Observatory.",
	);
	assertEqual(
		parsed.request.stableIds?.length,
		1,
		"Expected clear-preview request to target one stable ID.",
	);

	expectInvalidMessage(
		{
			...clearMessage,
			request: {
				...clearMessage.request,
				stableIds: ["valid-id", ""],
			},
		},
		"stableIds.1 must be a non-empty string",
	);
}

function assertChannelSenderReceiverFlow(): void {
	const channel = new InMemoryPreviewChannel();
	let appliedPreview: CollisionCookPreviewPatch | undefined;
	let reloadRequest: LevelEditorRuntimeReloadRequest | undefined;
	let clearRequest: LevelEditorCollisionPreviewClearRequest | undefined;
	let rejectedCount = 0;
	const connection = connectGameWindowDevPreviewChannel({
		channel,
		applyPreview(patch) {
			appliedPreview = patch;
		},
		clearPreview(request) {
			clearRequest = request;
		},
		reload(request) {
			reloadRequest = request;
		},
		onRejected() {
			rejectedCount += 1;
		},
	});

	if (!connection.connected) {
		throw new Error("Expected injected preview channel to connect.");
	}

	postLevelEditorDevPreviewMessage(
		channel,
		createCollisionPreviewPatchMessage({
			requestId: "test-preview:through-channel",
			patch: validPreviewPatch,
		}),
	);

	if (!appliedPreview) {
		throw new Error("Expected channel receiver to apply preview callback.");
	}

	assertEqual(
		appliedPreview.sourcePlanHash,
		validPreviewMessage.payload.sourcePlanHash,
		"Expected receiver to apply the validated preview patch.",
	);

	postLevelEditorDevPreviewMessage(
		channel,
		createRuntimeSceneReloadRequestMessage({
			requestId: "test-reload:through-channel",
			runtimeSceneId: "observatory_runtime",
			reason: "collision-bake-applied",
			sourcePlanHash: validPreviewPatch.sourcePlanHash,
		}),
	);

	if (!reloadRequest) {
		throw new Error("Expected channel receiver to call reload callback.");
	}

	assertEqual(
		reloadRequest.runtimeSceneId,
		"observatory_runtime",
		"Expected reload callback to receive Observatory runtime scene ID.",
	);

	postLevelEditorDevPreviewMessage(
		channel,
		createCollisionPreviewClearRequestMessage({
			requestId: "test-clear:through-channel",
			runtimeSceneId: "observatory_runtime",
			sourcePlanHash: validPreviewPatch.sourcePlanHash,
			stableIds: validPreviewPatch.entries.map((entry) => entry.stableId),
		}),
	);

	if (!clearRequest) {
		throw new Error(
			"Expected channel receiver to call clear-preview callback.",
		);
	}

	assertEqual(
		clearRequest.runtimeSceneId,
		"observatory_runtime",
		"Expected clear-preview callback to receive Observatory runtime scene ID.",
	);

	channel.post({ type: "invalid" });

	assertEqual(
		rejectedCount,
		1,
		"Expected invalid channel message to be reported once.",
	);

	connection.dispose();
	const messagesBeforeDisposedPost = channel.messages.length;
	postLevelEditorDevPreviewMessage(
		channel,
		createCollisionPreviewPatchMessage({
			requestId: "test-preview:after-dispose",
			patch: validPreviewPatch,
		}),
	);

	assertEqual(
		channel.messages.length,
		messagesBeforeDisposedPost + 1,
		"Expected disposed connection to leave sender posting behavior unchanged.",
	);
	assertEqual(
		appliedPreview.sourcePlanHash,
		validPreviewMessage.payload.sourcePlanHash,
		"Expected disposed connection to stop receiving later preview messages.",
	);
}

function assertRuntimePreviewPatchApplication(): void {
	const runtime = new EngineRuntime();
	const entity = runtime.world.createEntity();
	const sourceEntry = validPreviewPatch.entries[0];

	if (!sourceEntry || sourceEntry.colliderComponent.shape.type !== "box") {
		throw new Error("Expected test preview patch to include a box entry.");
	}

	const patch: CollisionCookPreviewPatch = {
		...validPreviewPatch,
		entries: [
			{
				...sourceEntry,
				transform: {
					position: [1, 2, 3],
					scale: [1, 1, 1],
				},
				colliderComponent: {
					...sourceEntry.colliderComponent,
					shape: {
						type: "box",
						halfExtents: [7, 8, 9],
					},
				},
			},
		],
	};
	const entry = patch.entries[0];

	if (!entry) {
		throw new Error("Expected test preview patch to keep one entry.");
	}

	runtime.world.addComponent(entity, STABLE_ID_COMPONENT, {
		id: entry.stableId,
	});
	runtime.world.addComponent(entity, PHYSICS_TRANSFORM_COMPONENT, {
		position: { x: 0, y: 0, z: 0 },
		rotation: { x: 0, y: 0, z: 0, w: 1 },
		scale: { x: 1, y: 1, z: 1 },
	});
	runtime.world.addComponent(entity, COLLIDER_COMPONENT, {
		intent: "solid",
		channel: "worldStatic",
		shape: {
			type: "box",
			halfExtents: { x: 1, y: 2, z: 3 },
		},
	});

	const result = applyCollisionPreviewPatchToRuntime(runtime, patch);

	if (!result.ok) {
		throw new Error(
			`Expected preview patch application to succeed, missing ${result.missingStableIds.join(", ")}.`,
		);
	}

	assertEqual(
		result.appliedStableIds.length,
		1,
		"Expected preview application to update one preview entry.",
	);

	const collider = runtime.world.requireComponent<{
		readonly shape: { readonly type: string; readonly halfExtents?: unknown };
	}>(entity, COLLIDER_COMPONENT);
	const transform = runtime.world.requireComponent<{
		readonly position: {
			readonly x: number;
			readonly y: number;
			readonly z: number;
		};
	}>(entity, PHYSICS_TRANSFORM_COMPONENT);

	assertEqual(
		collider.shape.type,
		"box",
		"Expected box collider after preview.",
	);
	assertDeepEqual(
		collider.shape.halfExtents,
		{ x: 7, y: 8, z: 9 },
		"Expected preview to convert box half extents into runtime Vec3 data.",
	);
	assertDeepEqual(
		transform.position,
		{ x: 1, y: 2, z: 3 },
		"Expected preview to update runtime transform position.",
	);

	const clearResult = clearCollisionPreviewPatchFromRuntime(runtime, {
		runtimeSceneId: patch.runtimeSceneId,
		sourcePlanHash: patch.sourcePlanHash,
		stableIds: [entry.stableId],
	});

	assertEqual(
		clearResult.clearedStableIds.length,
		1,
		"Expected clear-preview request to restore one preview snapshot.",
	);

	const restoredCollider = runtime.world.requireComponent<{
		readonly shape: { readonly type: string; readonly halfExtents?: unknown };
	}>(entity, COLLIDER_COMPONENT);
	const restoredTransform = runtime.world.requireComponent<{
		readonly position: {
			readonly x: number;
			readonly y: number;
			readonly z: number;
		};
	}>(entity, PHYSICS_TRANSFORM_COMPONENT);

	assertDeepEqual(
		restoredCollider.shape.halfExtents,
		{ x: 1, y: 2, z: 3 },
		"Expected clear preview to restore original collider half extents.",
	);
	assertDeepEqual(
		restoredTransform.position,
		{ x: 0, y: 0, z: 0 },
		"Expected clear preview to restore original transform position.",
	);

	const missingRuntime = new EngineRuntime();
	const missingResult = applyCollisionPreviewPatchToRuntime(
		missingRuntime,
		patch,
	);

	if (missingResult.ok) {
		throw new Error("Expected preview application to report missing entities.");
	}

	assertEqual(
		missingResult.missingStableIds.length,
		1,
		"Expected missing runtime preview application to report missing stable ID.",
	);
}

async function assertNoEditorModuleLeak(): Promise<void> {
	const scanRoots = [
		"src/app/devPreview",
		"src/app/GameClient.svelte",
		"src/app/browserGameClient.ts",
		"src/app/mountGameClient.ts",
	];
	const files = (
		await Promise.all(
			scanRoots.map((path) => collectSourceFiles(join(appRoot, path))),
		)
	).flat();
	const violations: string[] = [];

	for (const file of files) {
		const source = await readFile(file, "utf8");
		const rel = relative(appRoot, file).replaceAll(sep, "/");

		for (const specifier of extractImportSpecifiers(source)) {
			const resolved = resolveImportSpecifier(rel, specifier);

			if (
				resolved !== undefined &&
				(isEditorModulePath(resolved) || isGameEditorModulePath(resolved))
			) {
				violations.push(`${rel} imports editor module ${specifier}`);
			}
		}
	}

	if (violations.length > 0) {
		throw new Error(
			`Expected game-window preview modules to avoid editor imports:\n${violations.join("\n")}`,
		);
	}
}

function expectInvalidMessage(message: unknown, expectedError: string): void {
	try {
		parseLevelEditorDevPreviewMessage(message);
	} catch (error) {
		const errors = extractSchemaErrors(error);

		if (errors.some((item) => item.includes(expectedError))) {
			return;
		}

		throw new Error(
			`Expected preview protocol errors to include ${JSON.stringify(expectedError)}, received:\n${errors.join("\n")}`,
		);
	}

	throw new Error(
		`Expected preview protocol message to fail with ${JSON.stringify(expectedError)}.`,
	);
}

function expectInvalidSend(
	channel: LevelEditorPreviewChannelPort,
	message: unknown,
	expectedError: string,
): void {
	const messageCount =
		channel instanceof InMemoryPreviewChannel ? channel.messages.length : 0;

	try {
		postLevelEditorDevPreviewMessage(channel, message);
	} catch (error) {
		const errors = extractSchemaErrors(error);

		if (!errors.some((item) => item.includes(expectedError))) {
			throw new Error(
				`Expected sender validation errors to include ${JSON.stringify(expectedError)}, received:\n${errors.join("\n")}`,
			);
		}

		if (
			channel instanceof InMemoryPreviewChannel &&
			channel.messages.length !== messageCount
		) {
			throw new Error("Expected invalid preview send to avoid posting.");
		}

		return;
	}

	throw new Error(
		`Expected invalid preview send to fail with ${JSON.stringify(expectedError)}.`,
	);
}

function expectInvalidPreviewApplication(
	patch: CollisionCookPreviewPatch,
	expectedError: string,
): void {
	try {
		applyCollisionPreviewPatchToRuntime(new EngineRuntime(), patch);
	} catch (error) {
		const errors = extractSchemaErrors(error);

		if (errors.some((item) => item.includes(expectedError))) {
			return;
		}

		throw new Error(
			`Expected preview application errors to include ${JSON.stringify(expectedError)}, received:\n${errors.join("\n")}`,
		);
	}

	throw new Error(
		`Expected invalid preview application to fail with ${JSON.stringify(expectedError)}.`,
	);
}

async function collectSourceFiles(path: string): Promise<readonly string[]> {
	const pathStat = await stat(path);

	if (!pathStat.isDirectory()) {
		return isSourceFile(path) ? [path] : [];
	}

	const entries = await readdir(path, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const entryPath = join(path, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await collectSourceFiles(entryPath)));
			continue;
		}

		if (isSourceFile(entry.name)) {
			files.push(entryPath);
		}
	}

	return files;
}

function isSourceFile(path: string): boolean {
	return /\.(astro|svelte|ts)$/.test(path);
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

			if (specifier !== undefined) {
				specifiers.add(specifier);
			}
		}
	}

	return [...specifiers];
}

function resolveImportSpecifier(
	relativeFile: string,
	specifier: string,
): string | undefined {
	if (!specifier.startsWith(".")) {
		return undefined;
	}

	return stripSourceSuffix(
		normalize(join(dirname(relativeFile), specifier)).replaceAll(sep, "/"),
	);
}

function stripSourceSuffix(path: string): string {
	return path.replace(/\.(astro|svelte|ts|js|mjs|mts)$/, "");
}

function isEditorModulePath(path: string): boolean {
	return path === "src/app/editor" || path.startsWith("src/app/editor/");
}

function isGameEditorModulePath(path: string): boolean {
	return path === "src/game/editor" || path.startsWith("src/game/editor/");
}

function extractSchemaErrors(error: unknown): readonly string[] {
	if (error instanceof Error && "errors" in error) {
		const errors = (error as Error & { readonly errors?: readonly string[] })
			.errors;

		if (Array.isArray(errors)) {
			return errors;
		}
	}

	return [error instanceof Error ? error.message : "Invalid preview message."];
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
	if (actual !== expected) {
		throw new Error(`${message} Expected ${expected}, received ${actual}.`);
	}
}

function assertDeepEqual<T>(actual: T, expected: T, message: string): void {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(
			`${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
		);
	}
}

class InMemoryPreviewChannel implements LevelEditorPreviewChannelPort {
	readonly name = "test-preview-channel";
	readonly messages: unknown[] = [];
	private readonly handlers =
		new Set<LevelEditorPreviewChannelMessageHandler>();
	private closed = false;

	post(message: unknown): void {
		if (this.closed) {
			throw new Error("Cannot post to a closed preview channel.");
		}

		this.messages.push(message);

		for (const handler of this.handlers) {
			handler(message);
		}
	}

	subscribe(handler: LevelEditorPreviewChannelMessageHandler): () => void {
		if (this.closed) {
			throw new Error("Cannot subscribe to a closed preview channel.");
		}

		this.handlers.add(handler);

		return () => {
			this.handlers.delete(handler);
		};
	}

	close(): void {
		this.handlers.clear();
	}
}

assertProtocolMessageValidation();
assertInvalidPreviewPatchRejection();
assertReloadRequestShape();
assertClearPreviewRequestShape();
assertChannelSenderReceiverFlow();
assertRuntimePreviewPatchApplication();
await assertNoEditorModuleLeak();

console.log("Live preview protocol contract passed.");
