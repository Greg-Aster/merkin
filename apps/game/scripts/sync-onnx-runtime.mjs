import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");

const sourceDir = path.join(appRoot, "node_modules/onnxruntime-web/dist");

const targetDirs = [path.join(repoRoot, "apps/megameal/public/vendor/onnxruntime")];

const filesToCopy = [
	"ort.all.min.mjs",
	...readdirSync(sourceDir).filter((fileName) =>
		fileName.startsWith("ort-wasm-simd-threaded"),
	),
];

if (!existsSync(sourceDir)) {
	throw new Error(`ONNX Runtime dist directory not found: ${sourceDir}`);
}

for (const targetDir of targetDirs) {
	rmSync(targetDir, { force: true, recursive: true });
	mkdirSync(targetDir, { recursive: true });

	for (const fileName of filesToCopy) {
		cpSync(path.join(sourceDir, fileName), path.join(targetDir, fileName));
	}
}

console.log(`Synced ONNX runtime assets to ${targetDirs.join(", ")}`);
