// src/utils/starUtils.ts
// Shared utilities between StarMapView and StarNode components

declare global {
  interface Window {
    THREE?: unknown
  }
}

export const ERA_COLORS = {
  'ancient-epoch': '#3b82f6',
  'awakening-era': '#8b5cf6',
  'golden-age': '#6366f1',
  'conflict-epoch': '#ec4899',
  'singularity-conflict': '#ef4444',
  'transcendent-age': '#14b8a6',
  'final-epoch': '#22c55e',
  unknown: '#6366f1',
} as const

export const COLOR_SPECTRUM = [
  '#ef4444',
  '#f43f5e',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#facc15',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
] as const

export const STAR_TYPES = [
  'point',
  'classic',
  'sparkle',
  'refraction',
  'halo',
  'subtle',
] as const

/**
 * Simple hash function for consistent randomization
 */
export function hashCode(str: string): number {
  if (!str) return 0
  return Math.abs(
    str.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0),
  )
}

/**
 * Get star color based on era or hash
 */
export function getStarColor(
  id: string,
  era?: string,
  useEraColors?: boolean,
): string {
  if (useEraColors && era && ERA_COLORS[era as keyof typeof ERA_COLORS]) {
    return ERA_COLORS[era as keyof typeof ERA_COLORS]
  }
  const hash = hashCode(id)
  return COLOR_SPECTRUM[hash % COLOR_SPECTRUM.length]
}

/**
 * Get star type based on hash and importance
 */
export function getStarType(id: string, isKeyEvent: boolean): string {
  const hash = hashCode(id)
  if (isKeyEvent) {
    return ['classic', 'sparkle', 'refraction', 'halo'][hash % 4]
  }
  return STAR_TYPES[hash % STAR_TYPES.length]
}

/**
 * Get size factor with variation
 */
export function getSizeFactor(isKeyEvent: boolean): number {
  return isKeyEvent ? 1.2 : 0.85 + Math.random() * 0.3
}

/**
 * Enhanced star texture generation for Three.js
 */
export function createEnhancedStarTexture(
  color: string,
  starType: string,
  isKeyEvent = false,
  size = 256,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!

  const center = size / 2
  const baseRadius = isKeyEvent ? size * 0.04 : size * 0.03
  const sizeFactor = getSizeFactor(isKeyEvent)
  const finalRadius = baseRadius * sizeFactor

  // Clear canvas
  ctx.clearRect(0, 0, size, size)

  // Enhanced multi-layer glow
  const glowLayers = [
    { radius: finalRadius * 15, opacity: 0.04, blur: 25 },
    { radius: finalRadius * 10, opacity: 0.08, blur: 20 },
    { radius: finalRadius * 6, opacity: 0.15, blur: 15 },
    { radius: finalRadius * 3, opacity: 0.25, blur: 8 },
  ]

  glowLayers.forEach(layer => {
    ctx.save()
    ctx.filter = `blur(${layer.blur}px)`

    const gradient = ctx.createRadialGradient(
      center,
      center,
      0,
      center,
      center,
      layer.radius,
    )
    const alpha = Math.floor(layer.opacity * 255)
      .toString(16)
      .padStart(2, '0')
    gradient.addColorStop(0, color + alpha)
    gradient.addColorStop(
      0.5,
      color +
        Math.floor(layer.opacity * 150)
          .toString(16)
          .padStart(2, '0'),
    )
    gradient.addColorStop(1, color + '00')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(center, center, layer.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })

  // Main star shape
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'

  switch (starType) {
    case 'point':
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(center, center, finalRadius * 1.2, 0, Math.PI * 2)
      ctx.fill()
      break

    case 'classic':
      drawStar(ctx, center, center, 5, finalRadius * 2, finalRadius * 1, color)
      break

    case 'sparkle':
      drawStar(
        ctx,
        center,
        center,
        4,
        finalRadius * 1.8,
        finalRadius * 0.8,
        color,
      )
      // Add cross lines
      ctx.strokeStyle = color + 'AA'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(center - finalRadius * 3, center)
      ctx.lineTo(center + finalRadius * 3, center)
      ctx.moveTo(center, center - finalRadius * 3)
      ctx.lineTo(center, center + finalRadius * 3)
      ctx.stroke()
      break

    case 'refraction':
      // Central core
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(center, center, finalRadius * 1.2, 0, Math.PI * 2)
      ctx.fill()

      // Refraction lines
      ctx.strokeStyle = color + '80'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(center - finalRadius * 4, center)
      ctx.lineTo(center + finalRadius * 4, center)
      ctx.moveTo(center, center - finalRadius * 4)
      ctx.lineTo(center, center + finalRadius * 4)
      ctx.stroke()
      break

    case 'halo': {
      // Multiple halos
      const haloRings = [
        { radius: finalRadius * 1.2, opacity: 1 },
        { radius: finalRadius * 2, opacity: 0.6 },
        { radius: finalRadius * 2.8, opacity: 0.3 },
      ]

      haloRings.forEach(ring => {
        ctx.fillStyle =
          color +
          Math.floor(ring.opacity * 255)
            .toString(16)
            .padStart(2, '0')
        ctx.beginPath()
        ctx.arc(center, center, ring.radius, 0, Math.PI * 2)
        ctx.fill()
      })
      break
    }

    default: // subtle
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(center, center, finalRadius * 1.1, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = color + '99'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(center - finalRadius * 2.5, center)
      ctx.lineTo(center + finalRadius * 2.5, center)
      ctx.moveTo(center, center - finalRadius * 2.5)
      ctx.lineTo(center, center + finalRadius * 2.5)
      ctx.stroke()
      break
  }

  ctx.restore()
  return canvas
}

/**
 * Helper function to draw star shapes
 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
  color: string,
) {
  let rot = (Math.PI / 2) * 3
  let x = cx
  let y = cy
  const step = Math.PI / spikes

  ctx.beginPath()
  ctx.moveTo(cx, cy - outerRadius)

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius
    y = cy + Math.sin(rot) * outerRadius
    ctx.lineTo(x, y)
    rot += step

    x = cx + Math.cos(rot) * innerRadius
    y = cy + Math.sin(rot) * innerRadius
    ctx.lineTo(x, y)
    rot += step
  }

  ctx.lineTo(cx, cy - outerRadius)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}
