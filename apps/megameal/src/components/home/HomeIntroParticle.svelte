<script lang="ts">
import { T, useTask } from "@threlte/core";
import { AdditiveBlending, NormalBlending } from "three";
import type { Mesh, MeshBasicMaterial } from "three";

type IntroInputState = {
	x: number;
	y: number;
	dragX: number;
	dragY: number;
	wheel: number;
	active: boolean;
};

type ParticleConfig = {
	angle: number;
	cluster: number;
	clusterStrength: number;
	height: number;
	radius: number;
	phase: number;
	radialT: number;
	speed: number;
	size: number;
	hueOffset: number;
	coneT: number;
};

export let index: number;
export let input: IntroInputState;
export let particle: ParticleConfig;

// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let mesh: Mesh | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let material: MeshBasicMaterial | null = null;
// biome-ignore lint/style/useConst: Svelte bind:ref assigns this ref at runtime.
let outlineMaterial: MeshBasicMaterial | null = null;

const additiveBlending = AdditiveBlending;
const normalBlending = NormalBlending;

useTask(() => {
	const time = performance.now() * 0.001;
	const pointerX = Number.isFinite(input.x) ? input.x : 0;
	const wheel = Number.isFinite(input.wheel) ? input.wheel : 0;
	const spin = particle.angle + time * particle.speed + input.dragX * 1.1;
	const pulse = Math.sin(time * 1.9 + index) * 0.26 + 0.74;
	const centerWeight = 1 - particle.radialT;
	const clusterPulse = Math.sin(
		time * 0.72 + particle.phase + particle.cluster,
	);
	const clusterOrbit =
		Math.sin(time * 0.36 + particle.cluster * 1.7) *
		particle.clusterStrength *
		0.12;
	const reactiveRadius =
		particle.radius * (1 + clusterPulse * particle.clusterStrength * 0.1) +
		clusterOrbit +
		(input.active ? 0.16 : 0.055) * Math.sin(time * 2.8 + index);
	const groupedSpin =
		spin +
		Math.sin(time * 0.5 + particle.phase) * particle.clusterStrength * 0.11;

	if (mesh) {
		mesh.position.x = Math.cos(groupedSpin) * reactiveRadius;
		mesh.position.y =
			particle.height +
			wheel * 0.22 +
			Math.sin(time * 1.1 + particle.phase) *
				(0.03 + particle.clusterStrength * 0.07);
		mesh.position.z = Math.sin(groupedSpin) * reactiveRadius - 0.32;
		mesh.scale.setScalar(particle.size * (1.12 + pulse * 0.42));
	}

	if (material) {
		const hue =
			0.63 + ((time * 0.018 + particle.hueOffset + pointerX * 0.025) % 0.14);
		material.color.setHSL(hue, 0.98, 0.18 + centerWeight * 0.14);
		material.opacity = Math.min(0.9, 0.32 + centerWeight * 0.44 + pulse * 0.04);
	}

	if (outlineMaterial) {
		const hue = 0.66 + ((time * 0.024 + particle.hueOffset) % 0.12);
		outlineMaterial.color.setHSL(hue, 1, 0.5);
		outlineMaterial.opacity = 0.18 + centerWeight * 0.28;
	}
});
</script>

<T.Mesh bind:ref={mesh}>
	<T.SphereGeometry args={[1, 8, 6]} />
	<T.MeshBasicMaterial
		bind:ref={material}
		color="#312e81"
		transparent={true}
		opacity={0.76}
		blending={normalBlending}
		depthWrite={false}
	/>
	<T.Mesh scale={[1.92, 1.92, 1.92]}>
		<T.SphereGeometry args={[1, 8, 6]} />
		<T.MeshBasicMaterial
			bind:ref={outlineMaterial}
			color="#2563eb"
			transparent={true}
			opacity={0.28}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>
</T.Mesh>
