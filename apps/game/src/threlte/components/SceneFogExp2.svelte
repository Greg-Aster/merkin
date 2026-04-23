<script lang="ts">
  import { onDestroy } from 'svelte'
  import { useThrelte } from '@threlte/core'
  import * as THREE from 'three'
  import { setRuntimeDiagnostic } from '../stores/runtimeDiagnosticsStore'

  export let color = '#7b8797'
  export let density = 0.001

  const { scene, invalidate } = useThrelte()

  let fog: THREE.FogExp2 | null = null

  function refreshSceneFogMaterials() {
    if (!scene) return

    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.material) return

      const refreshMaterial = (material: THREE.Material) => {
        const candidate = material as THREE.Material & { fog?: boolean }
        if ('fog' in candidate) {
          candidate.fog = true
        }
        candidate.needsUpdate = true
      }

      if (Array.isArray(object.material)) {
        object.material.forEach(refreshMaterial)
      } else {
        refreshMaterial(object.material)
      }
    })
  }

  function reportFogDiagnostic() {
    if (!scene || !fog) return

    let meshCount = 0
    let fogCapableMaterialCount = 0
    let fogEnabledMaterialCount = 0

    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.material) return
      meshCount += 1

      const inspectMaterial = (material: THREE.Material) => {
        const candidate = material as THREE.Material & { fog?: boolean }
        if ('fog' in candidate) {
          fogCapableMaterialCount += 1
          if (candidate.fog !== false) {
            fogEnabledMaterialCount += 1
          }
        }
      }

      if (Array.isArray(object.material)) {
        object.material.forEach(inspectMaterial)
      } else {
        inspectMaterial(object.material)
      }
    })

    setRuntimeDiagnostic('fog', {
      label: 'Scene Fog',
      level: fogEnabledMaterialCount > 0 ? 'ready' : 'warning',
      message: `FogExp2 ${fog.color.getStyle()} @ ${fog.density.toFixed(5)} • ${fogEnabledMaterialCount}/${Math.max(fogCapableMaterialCount, 1)} fog-capable materials across ${meshCount} meshes`,
      meta: {
        color: fog.color.getHexString(),
        density: fog.density,
        meshCount,
        fogCapableMaterialCount,
        fogEnabledMaterialCount,
      },
    })
  }

  function applyFog() {
    if (!scene) return

    if (!fog) {
      fog = new THREE.FogExp2(color, density)
    }

    fog.color = new THREE.Color(color)
    fog.density = density
    scene.fog = fog
    refreshSceneFogMaterials()
    reportFogDiagnostic()
    invalidate()
  }

  $: applyFog()

  onDestroy(() => {
    if (scene?.fog === fog) {
      scene.fog = null
      refreshSceneFogMaterials()
      setRuntimeDiagnostic('fog', {
        label: 'Scene Fog',
        level: 'idle',
        message: 'Scene fog disabled.',
      })
      invalidate()
    }
    fog = null
  })
</script>
