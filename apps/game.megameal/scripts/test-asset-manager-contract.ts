import { AssetManager } from "../src/engine/modules/assets/index.js";

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

function assertRejected(
	result: PromiseSettledResult<unknown>,
): asserts result is PromiseRejectedResult {
	if (result.status !== "rejected") {
		throw new Error(`Expected rejected promise, received ${result.status}.`);
	}
}

function createAssetManager(): AssetManager {
	return new AssetManager({
		assets: [
			{
				id: "mesh:shared",
				kind: "mesh",
				url: "/assets/shared.glb",
			},
		],
	});
}

{
	const manager = createAssetManager();
	let loadCount = 0;
	let resolveLoad: ((asset: unknown) => void) | undefined;
	const loadStarted = new Promise<void>((resolve) => {
		manager.registerLoader("mesh", async (entry) => {
			loadCount += 1;
			resolve();

			return new Promise((loadResolve) => {
				resolveLoad = loadResolve;
			}).then((asset) => ({
				asset,
				id: entry.id,
			}));
		});
	});

	const firstLoad = manager.load("mesh:shared");
	const secondLoad = manager.load("mesh:shared");

	await loadStarted;
	assertEqual(loadCount, 1);

	resolveLoad?.({ version: 1 });
	const [firstAsset, secondAsset] = await Promise.all([firstLoad, secondLoad]);

	assertEqual(firstAsset, secondAsset);
	assertDeepEqual(manager.listLoaded(), ["mesh:shared"]);

	const thirdAsset = await manager.load("mesh:shared");
	assertEqual(thirdAsset, firstAsset);
	assertEqual(loadCount, 1);
}

{
	const manager = createAssetManager();
	const failedLoad = new Error("load failed");
	let loadCount = 0;

	manager.registerLoader("mesh", async (entry) => {
		loadCount += 1;

		if (loadCount === 1) {
			throw failedLoad;
		}

		return {
			id: entry.id,
			version: loadCount,
		};
	});

	const [firstResult, secondResult] = await Promise.allSettled([
		manager.load("mesh:shared"),
		manager.load("mesh:shared"),
	]);

	assertRejected(firstResult);
	assertRejected(secondResult);
	assertEqual(firstResult.reason, failedLoad);
	assertEqual(secondResult.reason, failedLoad);
	assertEqual(loadCount, 1);
	assertDeepEqual(manager.listLoaded(), []);

	const retriedAsset = await manager.load("mesh:shared");

	assertDeepEqual(retriedAsset, {
		id: "mesh:shared",
		version: 2,
	});
	assertEqual(loadCount, 2);
	assertDeepEqual(manager.listLoaded(), ["mesh:shared"]);
}

console.log("Asset manager contract validation passed.");
