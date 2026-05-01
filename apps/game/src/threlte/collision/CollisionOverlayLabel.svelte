<script lang="ts">
import { T } from '@threlte/core'
import { onDestroy } from 'svelte'
import * as THREE from 'three'

export let lines: string[] = []
export let position: [number, number, number] = [0, 1.2, 0]

let texture: THREE.CanvasTexture | null = null
let material: THREE.SpriteMaterial | null = null
let signature = ''

function disposeLabel() {
  texture?.dispose()
  material?.dispose()
  texture = null
  material = null
}

function rebuildLabel() {
  const nextSignature = JSON.stringify(lines)
  if (nextSignature === signature && texture && material) return
  signature = nextSignature
  disposeLabel()

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return

  const fontSize = 26
  const paddingX = 16
  const paddingY = 12
  const lineHeight = 32
  context.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Consolas, monospace`
  const width = Math.ceil(
    Math.max(160, ...lines.map(line => context.measureText(line).width)) +
      paddingX * 2,
  )
  const height = Math.ceil(lines.length * lineHeight + paddingY * 2)
  canvas.width = width
  canvas.height = height

  context.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Consolas, monospace`
  context.fillStyle = 'rgba(10, 12, 18, 0.78)'
  context.fillRect(0, 0, width, height)
  context.strokeStyle = 'rgba(255, 210, 122, 0.88)'
  context.lineWidth = 3
  context.strokeRect(1.5, 1.5, width - 3, height - 3)
  context.fillStyle = '#fff4cc'
  context.textBaseline = 'top'
  lines.forEach((line, index) => {
    context.fillText(line, paddingX, paddingY + index * lineHeight)
  })

  texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
}

$: if (typeof document !== 'undefined') {
  rebuildLabel()
}

onDestroy(disposeLabel)
</script>

{#if material}
  <T.Sprite
    {position}
    scale={[2.8, Math.max(0.7, lines.length * 0.38), 1]}
    {material}
    renderOrder={30}
    frustumCulled={false}
  />
{/if}
