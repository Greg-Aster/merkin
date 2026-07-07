import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	Box3,
	Color,
	Group,
	Matrix4,
	Mesh,
	MeshStandardMaterial,
	Object3D,
	Quaternion,
	Vector3,
} from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

const APP_ROOT_PATH = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_OUTPUT_DIR = path.join(
	APP_ROOT_PATH,
	"public/assets/player/avatars/ainekio-sesame",
);
const ROBOT_SCALE = 7.0;
const BODY_LINKS = {
	chassis: "internal_frame",
	right_front_leg: "femur_joint_r1",
	right_front_foot: "foot_joint_r3",
	right_rear_leg: "femur_joint_r2",
	right_rear_foot: "foot_joint_r4",
	left_front_leg: "femur_joint_l1",
	left_front_foot: "foot_joint_l3",
	left_rear_leg: "femur_joint_l2",
	left_rear_foot: "foot_joint_l4",
};

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

const options = parseArgs(process.argv.slice(2));

if (!options.source) {
	throw new Error(
		"Usage: pnpm prepare:ainekio-sesame-assets -- --source=/path/to/sesame-robot-sim-current",
	);
}

const sourceRoot = path.resolve(options.source);
const urdfPath = path.join(sourceRoot, "docs/robot.urdf");
const meshDir = path.join(sourceRoot, "onshape/assets");
const outputDir = path.resolve(options.output ?? DEFAULT_OUTPUT_DIR);
const urdf = await readFile(urdfPath, "utf8");
const links = parseUrdfLinks(urdf);
const joints = parseUrdfJoints(urdf);
const linkTransforms = computeLinkTransforms(joints);
const loader = new STLLoader();

await mkdir(outputDir, { recursive: true });

for (const [bodyId, linkName] of Object.entries(BODY_LINKS)) {
	const link = links.get(linkName);

	if (!link) {
		throw new Error(`URDF link "${linkName}" for body "${bodyId}" is missing.`);
	}

	const group = new Group();
	group.name = `ainekio-sesame-${bodyId}`;

	for (const visual of link.visuals) {
		const meshPath = path.join(meshDir, visual.meshFile);
		const source = await readFile(meshPath);
		const geometry = loader.parse(
			source.buffer.slice(
				source.byteOffset,
				source.byteOffset + source.byteLength,
			),
		);
		geometry.computeVertexNormals();

		const material = new MeshStandardMaterial({
			name: visual.materialName,
			color: visual.color,
			metalness: 0.05,
			roughness: 0.82,
		});
		const mesh = new Mesh(geometry, material);
		mesh.name = visual.partName;
		const visualTransform = new Matrix4().compose(
			visual.position,
			visual.rotation,
			new Vector3(1, 1, 1),
		);
		const worldTransform = (linkTransforms.get(linkName) ?? new Matrix4())
			.clone()
			.multiply(visualTransform);
		const scale = new Vector3();
		worldTransform.decompose(mesh.position, mesh.quaternion, scale);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		group.add(mesh);
	}

	bakeNeutralWorldToBodyLocalYUp(group);
	group.scale.setScalar(ROBOT_SCALE);
	group.updateMatrixWorld(true);

	const glb = await exportBinaryGlb(group);
	const outputPath = path.join(outputDir, `${bodyId}.glb`);
	await writeFile(outputPath, Buffer.from(glb));
	console.log(`Generated ${path.relative(APP_ROOT_PATH, outputPath)}`);
}

function parseArgs(args) {
	const parsed = {};

	for (const arg of args) {
		if (!arg.startsWith("--")) {
			continue;
		}
		const [key, ...valueParts] = arg.slice(2).split("=");
		parsed[key] = valueParts.join("=");
	}

	return parsed;
}

function parseUrdfLinks(urdfSource) {
	const links = new Map();
	const linkPattern = /<link name="([^"]+)">([\s\S]*?)<\/link>/g;

	for (const match of urdfSource.matchAll(linkPattern)) {
		const [, name, body] = match;
		links.set(name, {
			name,
			visuals: parseVisuals(body),
		});
	}

	return links;
}

function parseUrdfJoints(urdfSource) {
	const joints = [];
	const jointPattern =
		/<joint name="([^"]+)" type="([^"]+)">([\s\S]*?)<\/joint>/g;

	for (const match of urdfSource.matchAll(jointPattern)) {
		const [, name, type, body] = match;
		const origin = body.match(/<origin xyz="([^"]+)" rpy="([^"]+)"\/>/);
		const parent = body.match(/<parent link="([^"]+)"\/>/);
		const child = body.match(/<child link="([^"]+)"\/>/);

		if (!origin || !parent || !child) {
			throw new Error(`Unsupported URDF joint block for "${name}".`);
		}

		joints.push({
			name,
			type,
			parentLink: parent[1],
			childLink: child[1],
			position: vectorFromText(origin[1]),
			rotation: quaternionFromRpy(origin[2]),
		});
	}

	return joints;
}

function computeLinkTransforms(joints) {
	const childJointsByParent = new Map();

	for (const joint of joints) {
		const entries = childJointsByParent.get(joint.parentLink) ?? [];
		entries.push(joint);
		childJointsByParent.set(joint.parentLink, entries);
	}

	const transforms = new Map([["internal_frame", new Matrix4().identity()]]);
	const visit = (linkName) => {
		const parentTransform = transforms.get(linkName);

		if (!parentTransform) {
			throw new Error(`URDF link "${linkName}" is missing a transform.`);
		}

		for (const joint of childJointsByParent.get(linkName) ?? []) {
			const jointTransform = new Matrix4().compose(
				joint.position,
				joint.rotation,
				new Vector3(1, 1, 1),
			);
			transforms.set(
				joint.childLink,
				parentTransform.clone().multiply(jointTransform),
			);
			visit(joint.childLink);
		}
	};

	visit("internal_frame");
	return transforms;
}

function parseVisuals(linkBody) {
	const visuals = [];
	const visualPattern = /<!-- Part ([^>]+) -->\s*<visual>([\s\S]*?)<\/visual>/g;

	for (const match of linkBody.matchAll(visualPattern)) {
		const [, partName, visualBody] = match;
		const origin = visualBody.match(/<origin xyz="([^"]+)" rpy="([^"]+)"\/>/);
		const mesh = visualBody.match(
			/<mesh filename="package:\/\/assets\/([^"]+)"/,
		);
		const material = visualBody.match(/<material name="([^"]+)">/);
		const color = visualBody.match(/<color rgba="([^"]+)"/);

		if (!origin || !mesh || !material || !color) {
			throw new Error(`Unsupported URDF visual block for part "${partName}".`);
		}

		visuals.push({
			partName,
			meshFile: mesh[1],
			materialName: material[1],
			position: vectorFromText(origin[1]),
			rotation: quaternionFromRpy(origin[2]),
			color: colorFromRgba(color[1]),
		});
	}

	return visuals;
}

function bakeNeutralWorldToBodyLocalYUp(group) {
	group.updateMatrixWorld(true);
	const box = new Box3().setFromObject(group);
	const center = new Vector3();
	box.getCenter(center);

	for (const child of group.children) {
		child.position.sub(center);
	}

	const zUpToYUp = new Matrix4().makeRotationX(-Math.PI / 2);

	for (const child of group.children) {
		child.applyMatrix4(zUpToYUp);
	}
}

function vectorFromText(text) {
	const values = text.split(/\s+/).map(Number);
	return new Vector3(values[0], values[1], values[2]);
}

function quaternionFromRpy(text) {
	const [roll, pitch, yaw] = text.split(/\s+/).map(Number);
	const object = new Object3D();
	object.rotation.set(roll, pitch, yaw, "XYZ");
	return new Quaternion().copy(object.quaternion);
}

function colorFromRgba(text) {
	const [r, g, b] = text.split(/\s+/).map(Number);
	return new Color(r, g, b);
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
