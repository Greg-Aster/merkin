import { configureGeneratedCanvasTexture } from '@/utils/threeTextureUtils'
import { CanvasTexture } from 'three'
import type { Texture } from 'three'

export type TimelineStarTextureVariant = 0 | 1 | 2 | 3

const timelineStarTextureVariants = [
  {
    points: 4,
    rayRadius: 54,
    secondaryRadius: 34,
    rayWidth: 2.4,
    secondaryWidth: 1.45,
  },
  {
    points: 5,
    rayRadius: 50,
    secondaryRadius: 25,
    rayWidth: 2.05,
    secondaryWidth: 1.25,
  },
  {
    points: 6,
    rayRadius: 52,
    secondaryRadius: 30,
    rayWidth: 2.2,
    secondaryWidth: 1.3,
  },
  {
    points: 8,
    rayRadius: 48,
    secondaryRadius: 22,
    rayWidth: 1.85,
    secondaryWidth: 1.05,
  },
] as const
const sharedStarTextures = new Map<TimelineStarTextureVariant, Texture>()
let sharedOrbitTexture: Texture | null = null

export const timelineStarTextureVariantCount =
  timelineStarTextureVariants.length

export function getTimelineStarTexture(
  variant: TimelineStarTextureVariant = 0,
) {
  const cachedTexture = sharedStarTextures.get(variant)
  if (cachedTexture) return cachedTexture
  if (typeof document === 'undefined') return null

  const textureVariant =
    timelineStarTextureVariants[variant] ?? timelineStarTextureVariants[0]
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) return null

  const center = canvas.width / 2
  const gradient = context.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center,
  )
  gradient.addColorStop(0, 'rgb(255 255 255 / 1)')
  gradient.addColorStop(0.08, 'rgb(255 255 255 / 1)')
  gradient.addColorStop(0.18, 'rgb(236 254 255 / 0.82)')
  gradient.addColorStop(0.36, 'rgb(103 232 249 / 0.36)')
  gradient.addColorStop(0.72, 'rgb(59 130 246 / 0.11)')
  gradient.addColorStop(1, 'rgb(59 130 246 / 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.save()
  context.translate(center, center)
  context.globalCompositeOperation = 'screen'
  context.lineCap = 'round'
  context.strokeStyle = 'rgb(255 255 255 / 0.92)'
  context.lineWidth = textureVariant.rayWidth
  context.beginPath()
  for (let index = 0; index < textureVariant.points; index += 1) {
    const angle = (index / textureVariant.points) * Math.PI * 2
    context.moveTo(0, 0)
    context.lineTo(
      Math.cos(angle) * textureVariant.rayRadius,
      Math.sin(angle) * textureVariant.rayRadius,
    )
  }
  context.stroke()
  context.strokeStyle = 'rgb(165 243 252 / 0.58)'
  context.lineWidth = textureVariant.secondaryWidth
  context.beginPath()
  for (let index = 0; index < textureVariant.points; index += 1) {
    const angle = ((index + 0.5) / textureVariant.points) * Math.PI * 2
    context.moveTo(0, 0)
    context.lineTo(
      Math.cos(angle) * textureVariant.secondaryRadius,
      Math.sin(angle) * textureVariant.secondaryRadius,
    )
  }
  context.stroke()
  context.fillStyle = 'rgb(255 255 255 / 0.96)'
  context.beginPath()
  context.arc(0, 0, 6.5, 0, Math.PI * 2)
  context.fill()
  context.restore()

  const texture = configureGeneratedCanvasTexture(new CanvasTexture(canvas))
  sharedStarTextures.set(variant, texture)
  return texture
}

export function getTimelineOrbitTexture() {
  if (sharedOrbitTexture) return sharedOrbitTexture
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) return null

  const center = canvas.width / 2
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.save()
  context.translate(center, center)
  context.globalCompositeOperation = 'screen'
  const glow = context.createRadialGradient(0, 0, 12, 0, 0, 56)
  glow.addColorStop(0, 'rgb(125 211 252 / 0)')
  glow.addColorStop(0.54, 'rgb(125 211 252 / 0.16)')
  glow.addColorStop(0.72, 'rgb(125 211 252 / 0.06)')
  glow.addColorStop(1, 'rgb(125 211 252 / 0)')
  context.fillStyle = glow
  context.beginPath()
  context.arc(0, 0, 58, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = 'rgb(186 230 253 / 0.54)'
  context.lineWidth = 1.35
  context.setLineDash([4, 7])
  context.beginPath()
  context.arc(0, 0, 38, 0, Math.PI * 2)
  context.stroke()
  context.setLineDash([])
  context.strokeStyle = 'rgb(255 255 255 / 0.2)'
  context.lineWidth = 0.9
  context.beginPath()
  context.arc(0, 0, 25, 0, Math.PI * 2)
  context.stroke()
  context.restore()

  sharedOrbitTexture = configureGeneratedCanvasTexture(
    new CanvasTexture(canvas),
  )
  return sharedOrbitTexture
}
