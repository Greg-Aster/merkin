<script lang="ts">
import { T, useTask } from "@threlte/core";
import type * as THREE from "three";
import HomeIntroParticle from "./HomeIntroParticle.svelte";
import HomeIntroScreenPanel from "./HomeIntroScreenPanel.svelte";

type IntroInputState = {
	x: number;
	y: number;
	dragX: number;
	dragY: number;
	wheel: number;
	active: boolean;
};

export let input: IntroInputState;
// biome-ignore lint/style/useConst: Parent component passes this as a prop.
export let titleImageSrc = "";

// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let world: THREE.Group | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let emblem: THREE.Group | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let ringA: THREE.Mesh | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let ringB: THREE.Mesh | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let ringC: THREE.Mesh | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let starColumn: THREE.Group | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let screenRail: THREE.Group | null = null;
const screenNodes: THREE.Group[] = [];

const particleCount = 320;
const particleBands = 160;
const particleClusterCount = 8;
const primaryScreenIndex = 3;
const screenCount = 7;
const screenOrbitRadius = 3.15;
const screenOrbitDepth = 1.86;
const screenOrbitCenterZ = -0.34;
const screenOrbitStartAngle = Math.PI;

function hash01(seed: number) {
	return (Math.sin(seed * 12.9898) * 43758.5453) % 1;
}

const particles = Array.from({ length: particleCount }, (_, index) => {
	const coneT = (index % particleBands) / (particleBands - 1);
	const band = Math.floor(index / particleBands);
	const cluster = index % particleClusterCount;
	const randomA = Math.abs(hash01(index + 1));
	const randomB = Math.abs(hash01(index + 17));
	const radialT = randomA ** 2.35;
	const waist = Math.sin(coneT * Math.PI);
	const clusterAngle =
		(cluster / particleClusterCount) * Math.PI * 2 + coneT * 1.15 + band * 0.34;
	const radius =
		0.2 + radialT * 1.55 + waist * 0.12 + Math.sin(index * 1.73) * 0.035;
	const angle = clusterAngle + (randomB - 0.5) * (0.16 + radialT * 0.42);
	const height = -1.82 + coneT * 3.85 + band * 0.08;

	return {
		angle,
		cluster,
		clusterStrength: 1 - radialT,
		height,
		radius,
		phase: randomB * Math.PI * 2,
		radialT,
		speed: 0.08 + radialT * 0.08 + band * 0.018,
		size: 0.012 + (1 - radialT) * 0.016 + (index % 4) * 0.002,
		hueOffset: index * 0.0037,
		coneT,
	};
});

const screens = Array.from({ length: screenCount }, (_, index) => {
	return {
		position: [0, 0, 0] as [number, number, number],
		rotation: [0, 0, 0] as [number, number, number],
		primary: index === primaryScreenIndex,
	};
});

function centeredOrbitProgress(value: number) {
	const wrapped = ((value % 1) + 1) % 1;
	return wrapped > 0.5 ? wrapped - 1 : wrapped;
}

function updateScreenOrbit(wheel: number, ease: number) {
	const selectedIndex = primaryScreenIndex + wheel * 0.92;

	for (let index = 0; index < screenCount; index += 1) {
		const screen = screenNodes[index];
		if (!screen) continue;

		const orbitProgress = centeredOrbitProgress(
			(index - selectedIndex) / screenCount,
		);
		const angle = orbitProgress * Math.PI * 2 + screenOrbitStartAngle;
		const frontWeight = Math.max(0, 1 - Math.abs(orbitProgress) * 3.2);
		const x = Math.sin(angle) * screenOrbitRadius;
		const z = screenOrbitCenterZ + Math.cos(angle) * screenOrbitDepth;
		const y = orbitProgress * 2.25 + wheel * 0.5;
		const targetScale = 0.72 + frontWeight * 0.34;

		screen.position.x += (x - screen.position.x) * ease;
		screen.position.y += (y - screen.position.y) * ease;
		screen.position.z += (z - screen.position.z) * ease;
		screen.rotation.x +=
			(0.02 - orbitProgress * 0.08 - screen.rotation.x) * ease;
		screen.rotation.y += (angle - screen.rotation.y) * ease;
		screen.rotation.z += (orbitProgress * 0.1 - screen.rotation.z) * ease;
		screen.scale.x += (targetScale - screen.scale.x) * ease;
		screen.scale.y += (targetScale - screen.scale.y) * ease;
		screen.scale.z += (targetScale - screen.scale.z) * ease;
	}
}

useTask((delta) => {
	const time = performance.now() * 0.001;
	const ease = Math.min(1, delta * 4.8);
	const pointerX = Number.isFinite(input.x) ? input.x : 0;
	const pointerY = Number.isFinite(input.y) ? input.y : 0;
	const wheel = Number.isFinite(input.wheel) ? input.wheel : 0;
	const wheelLift = wheel * 0.32;
	const wheelSpin = wheel * 1.4;

	if (world) {
		world.rotation.x +=
			(-pointerY * 0.12 - wheel * 0.035 - world.rotation.x) * ease;
		world.rotation.y +=
			(pointerX * 0.18 + wheelSpin * 0.18 - world.rotation.y) * ease;
		world.position.x += (pointerX * 0.18 - world.position.x) * ease;
		world.position.y +=
			(-pointerY * 0.08 + wheelLift - world.position.y) * ease;
	}

	if (emblem) {
		emblem.rotation.x = Math.sin(time * 0.56) * 0.08 + input.dragY * 1.8;
		emblem.rotation.y = time * 0.18 + input.dragX * 2.6;
		emblem.rotation.z = Math.sin(time * 0.32) * 0.045;
		emblem.position.y = Math.sin(time * 0.82) * 0.08;
	}

	if (ringA) ringA.rotation.z += delta * 0.34;
	if (ringB) ringB.rotation.x -= delta * 0.2;
	if (ringC) ringC.rotation.y += delta * 0.26;

	if (starColumn) {
		starColumn.rotation.y = time * 0.12 - input.dragX * 0.8 + wheelSpin;
		starColumn.rotation.z = Math.sin(time * 0.18) * 0.035;
	}

	if (screenRail) {
		screenRail.rotation.y = time * 0.035 - input.dragX * 0.42;
		screenRail.position.y = Math.sin(time * 0.45) * 0.055;
	}

	updateScreenOrbit(wheel, ease);
});
</script>

<T.PerspectiveCamera makeDefault position={[0, 0.08, 6.8]} fov={44} />

<T.AmbientLight intensity={0.56} color="#dbeafe" />
<T.PointLight position={[-3.2, 2.6, 2.4]} intensity={18} color="#60a5fa" distance={10} />
<T.PointLight position={[3.4, -1.2, 3.2]} intensity={12} color="#8b5cf6" distance={10} />
<T.SpotLight
	position={[0, 4.2, 4.8]}
	angle={0.52}
	penumbra={0.6}
	intensity={34}
	distance={16}
	color="#ffffff"
/>

<T.Group bind:ref={world} position={[0, 0, 0]}>
	<T.Group bind:ref={screenRail} position={[0, 0, -0.34]}>
		{#each screens as screen, index}
			<T.Group bind:ref={screenNodes[index]} position={screen.position} rotation={screen.rotation}>
				<HomeIntroScreenPanel
					{index}
					imageSrc={screen.primary ? titleImageSrc : ""}
					primary={screen.primary}
				/>
			</T.Group>
		{/each}
	</T.Group>

	<T.Group bind:ref={starColumn} position={[0, 0, -0.34]}>
		{#each particles as particle, index}
			<HomeIntroParticle {particle} {index} {input} />
		{/each}
	</T.Group>

	<T.Group bind:ref={emblem} position={[0, -0.02, 0.18]}>
		<T.Mesh bind:ref={ringA} rotation={[Math.PI / 2, 0, 0]}>
			<T.TorusGeometry args={[1.18, 0.01, 12, 128]} />
			<T.MeshBasicMaterial color="#67e8f9" transparent={true} opacity={0.48} />
		</T.Mesh>

		<T.Mesh bind:ref={ringB} rotation={[0.32, Math.PI / 2, 0.26]}>
			<T.TorusGeometry args={[1.48, 0.008, 12, 128]} />
			<T.MeshBasicMaterial color="#8b5cf6" transparent={true} opacity={0.44} />
		</T.Mesh>

		<T.Mesh bind:ref={ringC} rotation={[0.76, 0.28, Math.PI / 2]}>
			<T.TorusGeometry args={[1.78, 0.006, 10, 128]} />
			<T.MeshBasicMaterial color="#a78bfa" transparent={true} opacity={0.36} />
		</T.Mesh>

		<T.Group position={[0, 0.02, 0.78]}>
			<T.Mesh position={[-0.52, 0, 0]} rotation={[0, 0, -0.22]}>
				<T.BoxGeometry args={[0.16, 1.06, 0.16]} />
				<T.MeshStandardMaterial color="#fff7ed" emissive="#f97316" emissiveIntensity={0.22} />
			</T.Mesh>
			<T.Mesh position={[-0.28, 0, 0]} rotation={[0, 0, 0.24]}>
				<T.BoxGeometry args={[0.14, 0.78, 0.16]} />
				<T.MeshStandardMaterial color="#fde68a" emissive="#eab308" emissiveIntensity={0.2} />
			</T.Mesh>
			<T.Mesh position={[-0.04, 0, 0]} rotation={[0, 0, -0.24]}>
				<T.BoxGeometry args={[0.14, 0.78, 0.16]} />
				<T.MeshStandardMaterial color="#fde68a" emissive="#eab308" emissiveIntensity={0.2} />
			</T.Mesh>
			<T.Mesh position={[0.2, 0, 0]} rotation={[0, 0, 0.22]}>
				<T.BoxGeometry args={[0.16, 1.06, 0.16]} />
				<T.MeshStandardMaterial color="#fff7ed" emissive="#f97316" emissiveIntensity={0.22} />
			</T.Mesh>
			<T.Mesh position={[0.54, 0, 0]} rotation={[0, 0, -0.18]}>
				<T.BoxGeometry args={[0.16, 1.06, 0.16]} />
				<T.MeshStandardMaterial color="#fff7ed" emissive="#22d3ee" emissiveIntensity={0.2} />
			</T.Mesh>
			<T.Mesh position={[0.8, 0, 0]} rotation={[0, 0, 0.22]}>
				<T.BoxGeometry args={[0.14, 0.78, 0.16]} />
				<T.MeshStandardMaterial color="#bae6fd" emissive="#0284c7" emissiveIntensity={0.22} />
			</T.Mesh>
			<T.Mesh position={[1.04, 0, 0]} rotation={[0, 0, -0.22]}>
				<T.BoxGeometry args={[0.14, 0.78, 0.16]} />
				<T.MeshStandardMaterial color="#bae6fd" emissive="#0284c7" emissiveIntensity={0.22} />
			</T.Mesh>
			<T.Mesh position={[1.3, 0, 0]} rotation={[0, 0, 0.18]}>
				<T.BoxGeometry args={[0.16, 1.06, 0.16]} />
				<T.MeshStandardMaterial color="#fff7ed" emissive="#22d3ee" emissiveIntensity={0.2} />
			</T.Mesh>
		</T.Group>
	</T.Group>
</T.Group>
