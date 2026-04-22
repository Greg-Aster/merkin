<script lang="ts">
import { T, useTask } from "@threlte/core";
import type * as THREE from "three";

export let variant: "snuggaloid" | "generic" = "generic";
export let targetRotationX = -0.12;
export let targetRotationY = 0.42;

let root: THREE.Group | null = null;
let accentCube: THREE.Mesh | null = null;

const palette =
	variant === "snuggaloid"
		? {
				shell: "#f472b6",
				shellDark: "#be185d",
				glow: "#f9a8d4",
				accent: "#fde68a",
				stage: "#0f172a",
			}
		: {
				shell: "#60a5fa",
				shellDark: "#1d4ed8",
				glow: "#bfdbfe",
				accent: "#f8fafc",
				stage: "#0f172a",
			};

useTask((delta) => {
	const time = performance.now() * 0.001;

	if (root) {
		root.position.y = Math.sin(time * 1.1) * 0.06;
		root.rotation.x +=
			(targetRotationX - root.rotation.x) * Math.min(1, delta * 5.5);
		root.rotation.y +=
			(targetRotationY - root.rotation.y) * Math.min(1, delta * 5.5);
		root.rotation.z = Math.sin(time * 0.8) * 0.03;
	}

	if (accentCube) {
		accentCube.rotation.x += delta * 0.18;
		accentCube.rotation.y += delta * 0.28;
	}
});
</script>

<T.PerspectiveCamera makeDefault position={[0, 0.9, 6.2]} fov={28} />

<T.Color attach="background" args={["#020617"]} />
<T.Fog color="#020617" near={8} far={18} />

<T.AmbientLight intensity={0.38} color="#ffffff" />
<T.SpotLight
	position={[3.8, 5.6, 4.2]}
	angle={0.42}
	penumbra={0.5}
	intensity={26}
	distance={18}
	color={palette.accent}
/>

<T.Group rotation={[-0.16, 0, 0]}>
	<T.Mesh position={[0, -1.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
		<T.CircleGeometry args={[4.5, 64]} />
		<T.MeshStandardMaterial color={palette.stage} roughness={0.96} metalness={0.02} />
	</T.Mesh>

	<T.Mesh position={[0, -1.81, 0]} rotation={[-Math.PI / 2, 0, 0]}>
		<T.RingGeometry args={[1.55, 1.95, 72]} />
		<T.MeshBasicMaterial color={palette.glow} transparent={true} opacity={0.58} />
	</T.Mesh>
</T.Group>

<T.Group bind:ref={root} position={[0, -0.05, 0]}>
	<T.Mesh position={[0, -0.15, 0]}>
		<T.BoxGeometry args={[2.25, 2.25, 2.25]} />
		<T.MeshStandardMaterial
			color={palette.shell}
			metalness={0.22}
			roughness={0.44}
			emissive={palette.shellDark}
			emissiveIntensity={0.16}
		/>
	</T.Mesh>

	<T.Mesh bind:ref={accentCube} position={[0, 0.82, 0]} rotation={[0.55, 0.45, 0.2]}>
		<T.BoxGeometry args={[0.92, 0.92, 0.92]} />
		<T.MeshStandardMaterial
			color={palette.accent}
			metalness={0.12}
			roughness={0.22}
			emissive={palette.glow}
			emissiveIntensity={0.22}
		/>
	</T.Mesh>

	<T.Mesh position={[-0.98, -1.18, 0.98]} rotation={[0.25, 0.2, 0.12]}>
		<T.BoxGeometry args={[0.35, 0.35, 0.35]} />
		<T.MeshStandardMaterial color={palette.glow} metalness={0.08} roughness={0.36} />
	</T.Mesh>

	<T.Mesh position={[0.98, -1.18, -0.98]} rotation={[-0.22, -0.28, 0.08]}>
		<T.BoxGeometry args={[0.35, 0.35, 0.35]} />
		<T.MeshStandardMaterial color={palette.glow} metalness={0.08} roughness={0.36} />
	</T.Mesh>
</T.Group>
