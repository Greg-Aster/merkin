/**
 * Three.js adapter for the articulated Ainekio V2 GLB robot actor.
 *
 * Loads ainekio-v2.glb (with MeshoptDecoder), solves the exact 35/20/28/38 mm
 * four-bar leg linkages from 12 live MuJoCo servo angles, binds the 320x170
 * ST7789 face CanvasTexture onto Ext_Tex_RobotRoot_01, and mounts a virtual
 * OV5647 chin PerspectiveCamera for live JPEG capture.
 *
 * Boundary rule: no direct DOM globals live here; canvas creation & JPEG
 * encoding are injected by the app layer.
 */

import * as THREE from "three";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const DEG2RAD = Math.PI / 180;

// Exact V2 35-20-28-38 four-bar linkage constants matching Blender Wireless CAD.
const V2_A0 = -2.589563330529253;
const V2_T0 = -3.7982594562326515;
const V2_DX0 = 32.78664016723633;
const V2_DZ0 = 51.35725402832031;
const V2_BETA0 = 2.615800380706787;
const V2_PX0 = 34.24711227416992;
const V2_PZ0 = 93.42145538330078;
const V2_PHI0 = -2.312775135040283;

// Neutral torso height in MuJoCo when the robot sits at rest above Z = 0.
const V2_GLB_BASE_HEIGHT_M = 0.065;

// joints_v2.py canonical indices: RL(0..2), RR(3..5), FL(6..8), FR(9..11).
const V2_LEG_JOINT_ORDER: readonly (readonly [
	"FL" | "FR" | "RL" | "RR",
	number,
])[] = [
	["RL", 0],
	["RR", 3],
	["FL", 6],
	["FR", 9],
];

export type VirtualRobotCanvasLike = {
	width: number;
	height: number;
	getContext(contextId: "2d"): CanvasRenderingContext2D | null;
};

export type VirtualRobotRigPoseInput = {
	/** MuJoCo root position [x, y, z] in meters (+X fwd, +Y left, +Z up). */
	readonly rootPosMj: readonly [number, number, number];
	/** MuJoCo root quaternion [w, x, y, z]. */
	readonly rootQuatMjWxyz: readonly [number, number, number, number];
	/** 12 joint angles in degrees in canonical joints_v2 order. */
	readonly jointsDeg: readonly number[];
};

export type VirtualRobotThreeRigOptions = {
	readonly scene: THREE.Scene;
	readonly renderer: THREE.WebGLRenderer;
	readonly modelUrl: string;
	readonly createCanvas: (
		width: number,
		height: number,
	) => VirtualRobotCanvasLike;
	readonly encodeCanvasToJpeg: (
		canvas: VirtualRobotCanvasLike,
		quality: number,
	) => Promise<{ readonly jpeg: Uint8Array; readonly dataUrl: string }>;
	readonly worldScale?: number;
};

type V2LegNodes = {
	readonly shoulder: THREE.Object3D;
	readonly primary: THREE.Object3D;
	readonly input: THREE.Object3D;
	readonly rod: THREE.Object3D;
	readonly foot: THREE.Object3D;
	readonly restRodPos: THREE.Vector3;
	readonly restFootPos: THREE.Vector3;
	readonly rollSign: 1 | -1;
};

export class ThreeVirtualRobotV2Rig {
	readonly #scene: THREE.Scene;
	readonly #renderer: THREE.WebGLRenderer;
	readonly #createCanvas: VirtualRobotThreeRigOptions["createCanvas"];
	readonly #encodeCanvasToJpeg: VirtualRobotThreeRigOptions["encodeCanvasToJpeg"];
	readonly #worldScale: number;

	readonly #container = new THREE.Group();
	#model?: THREE.Group;
	#robotRoot?: THREE.Object3D;
	#restRootPos = new THREE.Vector3();
	#legs?: Record<"FL" | "FR" | "RL" | "RR", V2LegNodes>;

	// Live 320x170 ST7789 face display CanvasTexture
	#faceCanvas: VirtualRobotCanvasLike;
	#faceCtx: CanvasRenderingContext2D | null;
	#faceTexture: THREE.CanvasTexture;

	// Virtual OV5647 chin camera (65 deg HFOV mounted below the LCD bezel)
	readonly #chinCamera: THREE.PerspectiveCamera;
	#captureTarget?: THREE.WebGLRenderTarget;
	#captureCanvas?: VirtualRobotCanvasLike;
	#capturePixels?: Uint8Array;
	#captureWidth = 0;
	#captureHeight = 0;
	#disposed = false;
	#loaded = false;

	constructor(options: VirtualRobotThreeRigOptions) {
		this.#scene = options.scene;
		this.#renderer = options.renderer;
		this.#createCanvas = options.createCanvas;
		this.#encodeCanvasToJpeg = options.encodeCanvasToJpeg;
		this.#worldScale = options.worldScale ?? 1;

		this.#container.name = "AinekioV2VirtualRobot";
		this.#container.scale.setScalar(this.#worldScale);
		this.#scene.add(this.#container);

		// Create 320x170 ST7789 face canvas & texture
		this.#faceCanvas = this.#createCanvas(320, 170);
		this.#faceCtx = this.#faceCanvas.getContext("2d");
		this.#paintStandbyFace();
		this.#faceTexture = new THREE.CanvasTexture(
			this.#faceCanvas as unknown as ConstructorParameters<
				typeof THREE.CanvasTexture
			>[0],
		);
		this.#faceTexture.colorSpace = THREE.SRGBColorSpace;
		this.#faceTexture.flipY = false;

		// OV5647 chin camera: ~50 deg VFOV (~65 deg HFOV at 4:3), mounted at front chin
		// looking forward (+Z in ainekio-v2.glb local space).
		this.#chinCamera = new THREE.PerspectiveCamera(50, 4 / 3, 0.02, 40);
		this.#chinCamera.position.set(0, 0.055, 0.115);
		// Three.js camera looks down -Z, so rotate 180 deg around Y to look down +Z (robot forward)
		this.#chinCamera.rotation.set(-0.08, Math.PI, 0, "YXZ");
	}

	get loaded(): boolean {
		return this.#loaded;
	}

	async load(modelUrl: string): Promise<void> {
		const loader = new GLTFLoader();
		loader.setMeshoptDecoder(MeshoptDecoder);
		const gltf = await loader.loadAsync(modelUrl);
		if (this.#disposed) {
			return;
		}
		const group = gltf.scene;
		const root = group.getObjectByName("RobotRoot");
		if (!root) {
			throw new Error(`RobotRoot node missing in ${modelUrl}.`);
		}

		const legs = {} as Record<"FL" | "FR" | "RL" | "RR", V2LegNodes>;
		for (const legKey of ["FL", "FR", "RL", "RR"] as const) {
			const shoulder = group.getObjectByName(`${legKey}_Shoulder`);
			const primary = group.getObjectByName(`${legKey}_Primary`);
			const input = group.getObjectByName(`${legKey}_Input`);
			const rod = group.getObjectByName(`${legKey}_Rod`);
			const foot = group.getObjectByName(`${legKey}_Foot`);
			if (!shoulder || !primary || !input || !rod || !foot) {
				throw new Error(`Missing V2 leg nodes for ${legKey} in ${modelUrl}.`);
			}
			legs[legKey] = {
				shoulder,
				primary,
				input,
				rod,
				foot,
				restRodPos: rod.position.clone(),
				restFootPos: foot.position.clone(),
				rollSign: legKey === "FL" || legKey === "RL" ? -1 : 1,
			};
		}

		// Bind live ST7789 face texture onto Ext_Tex_RobotRoot_01 (Mat_Tex_001)
		group.traverse((obj) => {
			if (!(obj instanceof THREE.Mesh)) {
				return;
			}
			obj.castShadow = true;
			obj.receiveShadow = true;
			const isFaceMesh =
				obj.name === "Ext_Tex_RobotRoot_01" ||
				(obj.material &&
					!Array.isArray(obj.material) &&
					obj.material.name === "Mat_Tex_001");
			if (isFaceMesh) {
				const mat = new THREE.MeshBasicMaterial({
					map: this.#faceTexture,
					toneMapped: false,
				});
				obj.material = mat;
			}
		});

		root.add(this.#chinCamera);
		this.#container.add(group);
		this.#model = group;
		this.#robotRoot = root;
		this.#restRootPos.copy(root.position);
		this.#legs = legs;
		this.#loaded = true;
	}

	applyPose(pose: VirtualRobotRigPoseInput): void {
		if (!this.#robotRoot || !this.#legs || pose.jointsDeg.length < 12) {
			return;
		}
		// Convert MuJoCo (+X fwd, +Y left, +Z up) -> Three.js (+Z fwd, +X left, +Y up)
		const [mx, my, mz] = pose.rootPosMj;
		this.#robotRoot.position.set(
			this.#restRootPos.x + my,
			this.#restRootPos.y + (mz - V2_GLB_BASE_HEIGHT_M),
			this.#restRootPos.z + mx,
		);
		const [qw, qx, qy, qz] = pose.rootQuatMjWxyz;
		this.#robotRoot.quaternion.set(qy, qz, qx, qw);

		for (const [legKey, base] of V2_LEG_JOINT_ORDER) {
			const leg = this.#legs[legKey];
			const hDeg = pose.jointsDeg[base] ?? 0;
			const aDeg = pose.jointsDeg[base + 1] ?? 0;
			const tDeg = pose.jointsDeg[base + 2] ?? 0;

			leg.shoulder.rotation.set(0, 0, leg.rollSign * hDeg * DEG2RAD);

			const a = V2_A0 + aDeg * DEG2RAD;
			const t = V2_T0 + tDeg * DEG2RAD;
			const dx = 62.58781342006688 + 35 * Math.cos(a);
			const dz = 69.71182170125783 + 35 * Math.sin(a);
			const px = 50.08774121717073 + 20 * Math.cos(t);
			const pz = 81.2118481681196 + 20 * Math.sin(t);
			const wx = px - dx;
			const wz = pz - dz;
			const d = Math.max(1e-9, Math.hypot(wx, wz));
			const along = Math.min(28, Math.max(-28, (784 - 1444 + d * d) / (2 * d)));
			const height = Math.sqrt(Math.max(0, 784 - along * along));
			const ex = dx + (along * wx - height * wz) / d;
			const ez = dz + (along * wz + height * wx) / d;
			const beta = Math.atan2(ez - dz, ex - dx);
			const phi = Math.atan2(ez - pz, ex - px);

			leg.primary.rotation.set(-(a - V2_A0), 0, 0);
			leg.input.rotation.set(-(t - V2_T0), 0, 0);
			leg.rod.position.set(
				leg.restRodPos.x,
				leg.restRodPos.y + 0.001 * (pz - V2_PZ0),
				leg.restRodPos.z + 0.001 * (px - V2_PX0),
			);
			leg.rod.rotation.set(-(phi - V2_PHI0), 0, 0);
			leg.foot.position.set(
				leg.restFootPos.x,
				leg.restFootPos.y + 0.001 * (dz - V2_DZ0),
				leg.restFootPos.z + 0.001 * (dx - V2_DX0),
			);
			leg.foot.rotation.set(-(beta - V2_BETA0), 0, 0);
		}
	}

	updateFaceRgba(width: number, height: number, rgba: Uint8Array): void {
		if (!this.#faceCtx || width !== 320 || height !== 170) {
			return;
		}
		const imageData = this.#faceCtx.createImageData(width, height);
		imageData.data.set(rgba);
		this.#faceCtx.putImageData(imageData, 0, 0);
		this.#faceTexture.needsUpdate = true;
	}

	getWorldPosition(): readonly [number, number, number] {
		const target = new THREE.Vector3();
		if (this.#robotRoot) {
			this.#robotRoot.getWorldPosition(target);
		}
		return [target.x, target.y, target.z];
	}

	getChinCameraPose(): {
		readonly position: readonly [number, number, number];
		readonly quaternion: readonly [number, number, number, number];
	} {
		const pos = new THREE.Vector3();
		const quat = new THREE.Quaternion();
		this.#chinCamera.updateMatrixWorld(true);
		this.#chinCamera.getWorldPosition(pos);
		this.#chinCamera.getWorldQuaternion(quat);
		return {
			position: [pos.x, pos.y, pos.z],
			quaternion: [quat.x, quat.y, quat.z, quat.w],
		};
	}

	async captureChinCameraJpeg(
		width: number,
		height: number,
		quality = 0.78,
	): Promise<
		{ readonly jpeg: Uint8Array; readonly dataUrl: string } | undefined
	> {
		if (this.#disposed || !this.#loaded) {
			return undefined;
		}
		if (
			!this.#captureTarget ||
			this.#captureWidth !== width ||
			this.#captureHeight !== height
		) {
			this.#captureTarget?.dispose();
			this.#captureTarget = new THREE.WebGLRenderTarget(width, height, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
				type: THREE.UnsignedByteType,
			});
			this.#captureCanvas = this.#createCanvas(width, height);
			this.#capturePixels = new Uint8Array(width * height * 4);
			this.#captureWidth = width;
			this.#captureHeight = height;
		}

		const captureTarget = this.#captureTarget;
		const captureCanvas = this.#captureCanvas;
		const capturePixels = this.#capturePixels;
		if (!captureTarget || !captureCanvas || !capturePixels) {
			return undefined;
		}

		this.#chinCamera.aspect = width / height;
		this.#chinCamera.updateProjectionMatrix();
		this.#chinCamera.updateMatrixWorld(true);

		const previousTarget = this.#renderer.getRenderTarget();
		this.#renderer.setRenderTarget(captureTarget);
		this.#renderer.render(this.#scene, this.#chinCamera);
		this.#renderer.readRenderTargetPixels(
			captureTarget,
			0,
			0,
			width,
			height,
			capturePixels,
		);
		this.#renderer.setRenderTarget(previousTarget);

		const ctx = captureCanvas.getContext("2d");
		if (!ctx) {
			return undefined;
		}
		const imageData = ctx.createImageData(width, height);
		const rowBytes = width * 4;
		// Flip vertically from WebGL bottom-left origin to top-left JPEG image
		for (let y = 0; y < height; y += 1) {
			const srcOffset = (height - 1 - y) * rowBytes;
			const dstOffset = y * rowBytes;
			imageData.data.set(
				capturePixels.subarray(srcOffset, srcOffset + rowBytes),
				dstOffset,
			);
		}
		ctx.putImageData(imageData, 0, 0);
		return this.#encodeCanvasToJpeg(captureCanvas, quality);
	}

	dispose(): void {
		if (this.#disposed) {
			return;
		}
		this.#disposed = true;
		this.#captureTarget?.dispose();
		this.#faceTexture.dispose();
		if (this.#model) {
			this.#container.remove(this.#model);
		}
		this.#scene.remove(this.#container);
	}

	#paintStandbyFace(): void {
		const ctx = this.#faceCtx;
		if (!ctx) {
			return;
		}
		ctx.fillStyle = "#04080e";
		ctx.fillRect(0, 0, 320, 170);
		ctx.fillStyle = "#20cfff";
		ctx.beginPath();
		ctx.arc(108, 92, 12, 0, Math.PI * 2);
		ctx.arc(212, 92, 12, 0, Math.PI * 2);
		ctx.fill();
	}
}
