<!--
  Reusable Skybox Component
  Handles loading a 6-sided cubemap for efficient, high-quality backgrounds.
-->
<script lang="ts">
  import { useThrelte } from '@threlte/core'
  import { onMount } from 'svelte'
  import * as THREE from 'three'

  // The path to the FOLDER containing your 6 cubemap images
  export let path: string = '/assets/hdri/skywip4-cubemap/' // Example path

  // The 6 image files, in order: +X, -X, +Y, -Y, +Z, -Z
  export let files: [string, string, string, string, string, string] = [
    'px.png', 'nx.png',
    'py.png', 'ny.png',
    'pz.png', 'nz.png'
  ]

  const { scene } = useThrelte()

  onMount(() => {
    const loader = new THREE.CubeTextureLoader()
    loader.setPath(path)
    loader.load(
      files,
      (cubeTexture) => {
        // A cubemap texture is the ideal format for scene environments.
        scene.environment = cubeTexture
        scene.background = cubeTexture
        console.log('✅ Cubemap skybox loaded successfully.')
      },
      undefined,
      (error) => {
        console.error('❌ Failed to load cubemap texture:', error)
      }
    )
  })
</script>

<!-- 
  This component no longer needs to render a mesh.
  It just configures the scene's background directly.
-->