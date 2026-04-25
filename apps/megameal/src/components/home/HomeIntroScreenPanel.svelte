<script lang="ts">
import { T } from "@threlte/core";
import { onDestroy, onMount } from "svelte";
import {
	AdditiveBlending,
	DoubleSide,
	FrontSide,
	NormalBlending,
	SRGBColorSpace,
	type Texture,
	TextureLoader,
} from "three";

export let index: number;
// biome-ignore lint/style/useConst: Svelte receives this as a component prop.
export let primary = false;
// biome-ignore lint/style/useConst: Parent component passes this as a prop.
export let imageSrc = "";

let titleTexture: Texture | null = null;
let isDisposed = false;

const additiveBlending = AdditiveBlending;
const normalBlending = NormalBlending;
const doubleSide = DoubleSide;
const frontSide = FrontSide;

onMount(() => {
	isDisposed = false;

	if (primary && imageSrc) {
		const loader = new TextureLoader();
		titleTexture = loader.load(imageSrc, (texture) => {
			texture.colorSpace = SRGBColorSpace;
			texture.needsUpdate = true;
			titleTexture = texture;
		});

		return () => {
			titleTexture?.dispose();
		};
	}

	return () => {
		isDisposed = true;
		titleTexture?.dispose();
	};
});

onDestroy(() => {
	isDisposed = true;
	titleTexture?.dispose();
});
</script>

<T.Group>
	<T.Mesh position={[0, 0, -0.045]}>
		<T.PlaneGeometry args={[primary ? 5.64 : 3.44, primary ? 3.16 : 1.92]} />
		<T.MeshBasicMaterial
			color={primary ? "#030712" : "#020617"}
			side={doubleSide}
			transparent={true}
			opacity={primary ? 0.92 : 0.46}
			blending={normalBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[0, 0, -0.035]}>
		<T.PlaneGeometry args={[primary ? 5.84 : 3.64, primary ? 3.36 : 2.12]} />
		<T.MeshBasicMaterial
			color={primary ? "#1e1b4b" : "#172554"}
			side={doubleSide}
			transparent={true}
			opacity={primary ? 0.32 : 0.24}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	{#if primary && titleTexture}
		<T.Mesh position={[0, 0.02, 0.01]}>
			<T.PlaneGeometry args={[4.84, 2.08]} />
			<T.MeshBasicMaterial
				map={titleTexture}
				side={frontSide}
				transparent={true}
				opacity={0.98}
				blending={normalBlending}
				depthWrite={false}
			/>
		</T.Mesh>
	{:else}
		<T.Mesh position={[0, 0.02, 0.01]}>
			<T.PlaneGeometry args={[primary ? 4.68 : 2.76, primary ? 0.72 : 0.44]} />
			<T.MeshBasicMaterial
				color={primary ? "#67e8f9" : "#8b5cf6"}
				side={doubleSide}
				transparent={true}
				opacity={primary ? 0.32 : 0.16}
				blending={additiveBlending}
				depthWrite={false}
			/>
		</T.Mesh>
	{/if}

	<T.Mesh position={[0, 0, 0.02]}>
		<T.PlaneGeometry args={[primary ? 5.92 : 3.72, primary ? 3.44 : 2.2]} />
		<T.MeshBasicMaterial
			color={primary ? "#22d3ee" : "#6366f1"}
			wireframe={true}
			side={doubleSide}
			transparent={true}
			opacity={primary ? 0.16 : 0.1}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>
</T.Group>
