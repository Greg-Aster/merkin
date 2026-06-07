import { BasicSceneScope } from "../src/engine/modules/scene/index.js";

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message?: string,
) {
	if (actual !== expected) {
		throw new Error(
			message ?? `Expected ${String(expected)}, received ${String(actual)}.`,
		);
	}
}

function assertDeepEqual(actual: unknown, expected: unknown, message?: string) {
	const actualJson = JSON.stringify(actual);
	const expectedJson = JSON.stringify(expected);

	if (actualJson !== expectedJson) {
		throw new Error(
			message ?? `Expected ${expectedJson}, received ${actualJson}.`,
		);
	}
}

function assertAggregateError(error: unknown): asserts error is AggregateError {
	if (!(error instanceof AggregateError)) {
		throw new Error(`Expected AggregateError, received ${String(error)}.`);
	}
}

{
	const scope = new BasicSceneScope("test_scene");
	const calls: string[] = [];
	const firstFailure = new Error("first failure");
	const secondFailure = new Error("second failure");

	scope.registerCleanup(() => {
		calls.push("entity");
	});
	scope.registerCleanup(async () => {
		calls.push("render");
		throw firstFailure;
	});
	scope.registerCleanup(() => {
		calls.push("physics");
		throw secondFailure;
	});
	scope.registerCleanup(() => {
		calls.push("audio");
	});

	let cleanupError: unknown;

	try {
		await scope.cleanup();
	} catch (error) {
		cleanupError = error;
	}

	assertAggregateError(cleanupError);
	assertEqual(
		cleanupError.message,
		'Scene "test_scene" cleanup failed for 2 resource(s).',
	);
	assertDeepEqual(cleanupError.errors, [secondFailure, firstFailure]);
	assertDeepEqual(calls, ["audio", "physics", "render", "entity"]);

	await scope.cleanup();
	assertDeepEqual(calls, ["audio", "physics", "render", "entity"]);
}

{
	const scope = new BasicSceneScope("clean_scene");
	const calls: string[] = [];

	scope.registerCleanup(() => {
		calls.push("listener");
	});
	scope.registerCleanup(async () => {
		calls.push("timer");
	});

	await scope.cleanup();
	assertDeepEqual(calls, ["timer", "listener"]);
}

console.log("Scene lifecycle contract validation passed.");
