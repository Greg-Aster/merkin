<script lang="ts">
import { T, useTask } from "@threlte/core";
import type * as THREE from "three";

type IntroInputState = {
	x: number;
	y: number;
	dragX: number;
	dragY: number;
	active: boolean;
};

type ParticleConfig = {
	angle: number;
	height: number;
	radius: number;
	speed: number;
	size: number;
	hueOffset: number;
};

export let index: number;
export let input: IntroInputState;
export let particle: ParticleConfig;

// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let mesh: THREE.Mesh | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let material: THREE.MeshStandardMaterial | null = null;

useTask(() => {
	const time = performance.now() * 0.001;
	const pointerX = Number.isFinite(input.x) ? input.x : 0;
	const spin = particle.angle + time * particle.speed + input.dragX * 1.1;
	const pulse = Math.sin(time * 1.7 + index) * 0.38 + 0.62;
	const reactiveRadius =
		particle.radius +
		(input.active ? 0.42 : 0.14) * Math.sin(time * 2.4 + index);

	if (mesh) {
		mesh.position.x = Math.cos(spin) * reactiveRadius;
		mesh.position.y =
			particle.height + Math.sin(time * 1.2 + index * 0.37) * 0.18;
		mesh.position.z = Math.sin(spin) * reactiveRadius - 0.2;
		mesh.scale.setScalar(particle.size * (1.8 + pulse));
	}

	if (material) {
		const hue = (time * 0.045 + particle.hueOffset + pointerX * 0.06 + 1) % 1;
		material.color.setHSL(hue, 0.92, 0.66);
		material.emissive.setHSL(hue, 0.95, 0.32);
		material.emissiveIntensity = input.active ? 1.15 : 0.72;
		material.opacity = 0.66 + pulse * 0.22;
	}
});
</script>

<T.Mesh bind:ref={mesh}>
	<T.SphereGeometry args={[1, 14, 10]} />
	<T.MeshStandardMaterial
		bind:ref={material}
		color="#67e8f9"
		emissive="#155e75"
		emissiveIntensity={0.75}
		roughness={0.22}
		metalness={0.08}
		transparent={true}
		opacity={0.78}
	/>
</T.Mesh>
