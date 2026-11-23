import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	BufferAttribute,
	BufferGeometry,
	Color,
	DoubleSide,
	Mesh,
	MeshStandardMaterial,
	Scene,
} from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const OUTPUT_PATH = "public/assets/game/terrain/portal_field_moor.glb";
const OUTER_HALF_EXTENT = 2600;
const INNER_HALF_EXTENT = 224;

globalThis.FileReader ??= class NodeFileReader {
	result = null;
	onloadend = null;
	onerror = null;

	readAsArrayBuffer(blob) {
		blob
			.arrayBuffer()
			.then((buffer) => {
				setTimeout(() => {
					this.result = buffer;
					this.onloadend?.();
				}, 0);
			})
			.catch((error) => {
				setTimeout(() => {
					if (this.onerror) {
						this.onerror(error);
					} else {
						throw error;
					}
				}, 0);
			});
	}
};

const terrainMaterial = new MeshStandardMaterial({
	name: "Night Moor Grass",
	color: "#1b2b20",
	roughness: 0.96,
	metalness: 0,
	vertexColors: true,
	side: DoubleSide,
});

const scene = new Scene();
scene.name = "Portal Field Moor";

addTerrainPatch("portal-field-inner-microdisplacement", {
	xMin: -INNER_HALF_EXTENT,
	xMax: INNER_HALF_EXTENT,
	zMin: -INNER_HALF_EXTENT,
	zMax: INNER_HALF_EXTENT,
	segmentsX: 224,
	segmentsZ: 224,
});

addTerrainPatch("portal-field-north-horizon", {
	xMin: -OUTER_HALF_EXTENT,
	xMax: OUTER_HALF_EXTENT,
	zMin: INNER_HALF_EXTENT,
	zMax: OUTER_HALF_EXTENT,
	segmentsX: 160,
	segmentsZ: 80,
});

addTerrainPatch("portal-field-south-horizon", {
	xMin: -OUTER_HALF_EXTENT,
	xMax: OUTER_HALF_EXTENT,
	zMin: -OUTER_HALF_EXTENT,
	zMax: -INNER_HALF_EXTENT,
	segmentsX: 160,
	segmentsZ: 80,
});

addTerrainPatch("portal-field-east-horizon", {
	xMin: INNER_HALF_EXTENT,
	xMax: OUTER_HALF_EXTENT,
	zMin: -INNER_HALF_EXTENT,
	zMax: INNER_HALF_EXTENT,
	segmentsX: 80,
	segmentsZ: 48,
});

addTerrainPatch("portal-field-west-horizon", {
	xMin: -OUTER_HALF_EXTENT,
	xMax: -INNER_HALF_EXTENT,
	zMin: -INNER_HALF_EXTENT,
	zMax: INNER_HALF_EXTENT,
	segmentsX: 80,
	segmentsZ: 48,
});

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
const glb = await exportBinaryGlb(scene);
await writeFile(OUTPUT_PATH, Buffer.from(glb));

console.log(`Generated ${OUTPUT_PATH}`);

function addTerrainPatch(name, options) {
	const geometry = createTerrainPatchGeometry(options);
	const mesh = new Mesh(geometry, terrainMaterial);

	mesh.name = name;
	mesh.receiveShadow = true;
	scene.add(mesh);
}

function createTerrainPatchGeometry(options) {
	const positions = [];
	const colors = [];
	const uvs = [];
	const indices = [];
	const { xMin, xMax, zMin, zMax, segmentsX, segmentsZ } = options;
	const wetPeat = new Color("#101613");
	const grass = new Color("#1d3022");
	const moss = new Color("#2f432d");
	const heather = new Color("#282438");

	for (let zIndex = 0; zIndex <= segmentsZ; zIndex += 1) {
		const zRatio = zIndex / segmentsZ;
		const z = lerp(zMin, zMax, zRatio);

		for (let xIndex = 0; xIndex <= segmentsX; xIndex += 1) {
			const xRatio = xIndex / segmentsX;
			const x = lerp(xMin, xMax, xRatio);
			const y = fieldHeightAt(x, z);
			const moisture = normalizedWave(x * 0.009 + z * 0.013);
			const heatherPatch = normalizedWave(x * 0.017 - z * 0.011 + 2.1);
			const tuft = normalizedWave(x * 0.19 + z * 0.23);
			const color = wetPeat
				.clone()
				.lerp(grass, 0.42 + moisture * 0.28)
				.lerp(moss, tuft * 0.16)
				.lerp(heather, Math.max(0, heatherPatch - 0.72) * 0.35);

			positions.push(x, y, z);
			colors.push(color.r, color.g, color.b);
			uvs.push(xRatio, zRatio);
		}
	}

	const stride = segmentsX + 1;

	for (let zIndex = 0; zIndex < segmentsZ; zIndex += 1) {
		for (let xIndex = 0; xIndex < segmentsX; xIndex += 1) {
			const a = zIndex * stride + xIndex;
			const b = a + 1;
			const d = (zIndex + 1) * stride + xIndex;
			const c = d + 1;

			indices.push(a, d, b, b, d, c);
		}
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute(
		"position",
		new BufferAttribute(new Float32Array(positions), 3),
	);
	geometry.setAttribute(
		"color",
		new BufferAttribute(new Float32Array(colors), 3),
	);
	geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	geometry.computeBoundingBox();
	geometry.computeBoundingSphere();
	return geometry;
}

function fieldHeightAt(x, z) {
	const rolling = Math.sin(x * 0.0045 + z * 0.002) * 0.18;
	const crossRoll = Math.sin(x * -0.003 + z * 0.0055 + 1.7) * 0.11;
	const peatHummock = normalizedWave(x * 0.034 + z * 0.041) * 0.12;
	const tuft = Math.sin(x * 0.31) * Math.sin(z * 0.27) * 0.035;
	const ripple = Math.sin(x * 0.79 + z * 0.37) * 0.012;

	return 0.05 + rolling + crossRoll + peatHummock + tuft + ripple;
}

function normalizedWave(value) {
	return (Math.sin(value) + Math.sin(value * 1.91 + 0.37) * 0.5 + 1.5) / 3;
}

function lerp(a, b, t) {
	return a + (b - a) * t;
}

async function exportBinaryGlb(object) {
	const exporter = new GLTFExporter();

	return new Promise((resolve, reject) => {
		exporter.parse(object, resolve, reject, {
			binary: true,
			onlyVisible: true,
			trs: false,
		});
	});
}
