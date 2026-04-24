<script lang="ts">
import { T, useTask } from "@threlte/core";
import type * as THREE from "three";
import HomeIntroParticle from "./HomeIntroParticle.svelte";

type IntroInputState = {
	x: number;
	y: number;
	dragX: number;
	dragY: number;
	active: boolean;
};

export let input: IntroInputState;

// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let world: THREE.Group | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let emblem: THREE.Group | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let core: THREE.Mesh | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let ringA: THREE.Mesh | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let ringB: THREE.Mesh | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let ringC: THREE.Mesh | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let starColumn: THREE.Group | null = null;

const particles = Array.from({ length: 72 }, (_, index) => {
	const lane = index % 6;
	const radius = 1.7 + lane * 0.34 + Math.sin(index * 1.9) * 0.18;
	const angle = index * 2.399963 + lane * 0.22;
	const height = ((index % 18) - 8.5) * 0.22;

	return {
		angle,
		height,
		radius,
		speed: 0.2 + lane * 0.035,
		size: 0.035 + (index % 5) * 0.012,
		hueOffset: index * 0.019,
	};
});

useTask((delta) => {
	const time = performance.now() * 0.001;
	const ease = Math.min(1, delta * 4.8);
	const pointerX = Number.isFinite(input.x) ? input.x : 0;
	const pointerY = Number.isFinite(input.y) ? input.y : 0;

	if (world) {
		world.rotation.x += (-pointerY * 0.12 - world.rotation.x) * ease;
		world.rotation.y += (pointerX * 0.18 - world.rotation.y) * ease;
		world.position.x += (pointerX * 0.18 - world.position.x) * ease;
		world.position.y += (-pointerY * 0.08 - world.position.y) * ease;
	}

	if (emblem) {
		emblem.rotation.x = Math.sin(time * 0.56) * 0.08 + input.dragY * 1.8;
		emblem.rotation.y = time * 0.18 + input.dragX * 2.6;
		emblem.rotation.z = Math.sin(time * 0.32) * 0.045;
		emblem.position.y = Math.sin(time * 0.82) * 0.08;
	}

	if (core) {
		core.rotation.x += delta * 0.12;
		core.rotation.y -= delta * 0.16;
	}

	if (ringA) ringA.rotation.z += delta * 0.34;
	if (ringB) ringB.rotation.x -= delta * 0.2;
	if (ringC) ringC.rotation.y += delta * 0.26;

	if (starColumn) {
		starColumn.rotation.y = time * 0.09 - input.dragX * 0.8;
	}
});
</script>

<T.PerspectiveCamera makeDefault position={[0, 0.08, 6.4]} fov={42} />

<T.AmbientLight intensity={0.75} color="#dbeafe" />
<T.PointLight position={[-3.2, 2.6, 2.4]} intensity={18} color="#22d3ee" distance={10} />
<T.PointLight position={[3.4, -1.2, 3.2]} intensity={16} color="#facc15" distance={10} />
<T.SpotLight
	position={[0, 4.2, 4.8]}
	angle={0.52}
	penumbra={0.6}
	intensity={34}
	distance={16}
	color="#ffffff"
/>

<T.Group bind:ref={world} position={[0, 0, 0]}>
	<T.Group bind:ref={starColumn} position={[0, 0, -0.34]}>
		{#each particles as particle, index}
			<HomeIntroParticle {particle} {index} {input} />
		{/each}
	</T.Group>

	<T.Group bind:ref={emblem} position={[0, -0.02, 0.18]}>
		<T.Mesh bind:ref={core} rotation={[0.15, 0.2, 0]}>
			<T.IcosahedronGeometry args={[1.04, 2]} />
			<T.MeshStandardMaterial
				color="#ffb703"
				emissive="#fb5607"
				emissiveIntensity={0.32}
				roughness={0.34}
				metalness={0.28}
				transparent={true}
				opacity={0.88}
			/>
		</T.Mesh>

		<T.Mesh bind:ref={ringA} rotation={[Math.PI / 2, 0, 0]}>
			<T.TorusGeometry args={[1.42, 0.018, 16, 128]} />
			<T.MeshBasicMaterial color="#67e8f9" transparent={true} opacity={0.82} />
		</T.Mesh>

		<T.Mesh bind:ref={ringB} rotation={[0.32, Math.PI / 2, 0.26]}>
			<T.TorusGeometry args={[1.72, 0.014, 16, 128]} />
			<T.MeshBasicMaterial color="#f472b6" transparent={true} opacity={0.62} />
		</T.Mesh>

		<T.Mesh bind:ref={ringC} rotation={[0.76, 0.28, Math.PI / 2]}>
			<T.TorusGeometry args={[2.06, 0.01, 12, 128]} />
			<T.MeshBasicMaterial color="#facc15" transparent={true} opacity={0.48} />
		</T.Mesh>

		<T.Group position={[0, 0.02, 1.04]}>
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
