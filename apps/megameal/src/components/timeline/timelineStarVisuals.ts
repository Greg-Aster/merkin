import { Color } from 'three'
import { hashHomeIntroUnit } from '../home/homeIntroSceneMath'
import type { TimelineCarouselScreen } from './timelinePortalCarouselModel'
import {
  getTimelineStarTexture,
  timelineStarTextureVariantCount,
  type TimelineStarTextureVariant,
} from './timelineStarTextures'

const starColor = '#67c7d6'
const activeStarColor = '#dffbff'
const starGlowColor = '#0891b2'
const visitedStarColor = '#5eead4'
const visitedStarGlowColor = '#22d3ee'
const mixedStarColor = new Color()
const mixedStarBaseColor = new Color()
const mixedStarActiveColor = new Color(activeStarColor)

export function getTimelineStarHash(index: number, salt: number) {
  return Math.abs(hashHomeIntroUnit(index + salt))
}

function getTimelineStarColor(
  index: number,
  eraKey: string,
  isActive: boolean,
  isKeyEvent: boolean,
) {
  if (isActive) return activeStarColor
  if (isKeyEvent) {
    const keyPalette = ['#fef08a', '#fde68a', '#facc15', '#fdba74', '#f9a8d4', '#ddd6fe']
    return keyPalette[Math.min(
      keyPalette.length - 1,
      Math.floor(getTimelineStarHash(index, 2971) * keyPalette.length),
    )]
  }

  const palettes: Record<string, string[]> = {
    'ancient-epoch': ['#67e8f9', '#bae6fd', '#93c5fd', '#a7f3d0', '#fde68a', '#f8fafc'],
    'awakening-era': ['#38bdf8', '#22d3ee', '#5eead4', '#bfdbfe', '#c4b5fd', '#f0fdfa'],
    'golden-age': ['#fde68a', '#facc15', '#fdba74', '#fef3c7', '#f9a8d4', '#93c5fd'],
    'conflict-epoch': ['#fb7185', '#fda4af', '#f97316', '#fecdd3', '#c4b5fd', '#fef08a'],
    'transcendent-age': ['#c4b5fd', '#ddd6fe', '#f0abfc', '#bfdbfe', '#67e8f9', '#f8fafc'],
    'final-epoch': ['#e2e8f0', '#f8fafc', '#cbd5e1', '#bae6fd', '#ddd6fe', '#f0fdfa'],
    'singularity-conflict': ['#f0abfc', '#c4b5fd', '#f9a8d4', '#e879f9', '#67e8f9', '#fef08a'],
  }
  const palette = palettes[eraKey] ?? [starColor, '#bae6fd', '#f8fafc']
  const paletteIndex = Math.min(
    palette.length - 1,
    Math.floor(getTimelineStarHash(index, 3001) * palette.length),
  )

  return palette[paletteIndex]
}

function getTimelineStarGlowColor(
  index: number,
  screen: TimelineCarouselScreen,
  isActive: boolean,
) {
  if (isActive) return activeStarColor
  if (screen.isKeyEvent) {
    return getTimelineStarColor(index, screen.eraKey, false, true)
  }

  const glowPalettes: Record<string, string[]> = {
    'ancient-epoch': ['#22d3ee', '#38bdf8', '#5eead4', '#60a5fa', '#facc15'],
    'awakening-era': ['#06b6d4', '#14b8a6', '#38bdf8', '#818cf8', '#93c5fd'],
    'golden-age': ['#f59e0b', '#facc15', '#fb7185', '#38bdf8', '#fde68a'],
    'conflict-epoch': ['#e11d48', '#fb7185', '#f97316', '#c084fc', '#facc15'],
    'transcendent-age': ['#8b5cf6', '#c084fc', '#e879f9', '#38bdf8', '#f8fafc'],
    'final-epoch': ['#94a3b8', '#e2e8f0', '#60a5fa', '#a78bfa', '#67e8f9'],
    'singularity-conflict': ['#d946ef', '#a78bfa', '#fb7185', '#22d3ee', '#facc15'],
  }
  const palette = glowPalettes[screen.eraKey] ?? [starGlowColor, '#38bdf8', '#a78bfa']
  const paletteIndex = Math.min(
    palette.length - 1,
    Math.floor(getTimelineStarHash(index, 3187) * palette.length),
  )

  return palette[paletteIndex]
}

function mixStarColor(baseColor: string, activeAmount: number) {
  if (activeAmount <= 0.01) return baseColor
  if (activeAmount >= 0.99) return activeStarColor

  mixedStarBaseColor.set(baseColor)
  mixedStarColor.copy(mixedStarBaseColor).lerp(mixedStarActiveColor, activeAmount)
  return `#${mixedStarColor.getHexString()}`
}

function getTimelineStarSize(index: number, isKeyEvent: boolean) {
  const baseSize = 0.78 + getTimelineStarHash(index, 3319) * 0.58
  return isKeyEvent ? baseSize * 1.18 : baseSize
}

export function getTimelineStarVisual(
  index: number,
  screen: TimelineCarouselScreen,
  activeAmount: number,
  isVisited: boolean,
  animationTime: number,
) {
  const size = getTimelineStarSize(index, screen.isKeyEvent)
  const variant = Math.min(
    timelineStarTextureVariantCount - 1,
    Math.floor(getTimelineStarHash(index, 3571) * timelineStarTextureVariantCount),
  ) as TimelineStarTextureVariant
  const visitedScale = isVisited ? 1.08 : 1
  const activeScale = 1 + activeAmount * 0.42
  const keyScale = screen.isKeyEvent ? 1.12 : 1
  const rotation = getTimelineStarHash(index, 3907) * Math.PI
  const phase = getTimelineStarHash(index, 4211) * Math.PI * 2
  const slowPulse = Math.sin(animationTime * 1.05 + phase) * (0.055 + activeAmount * 0.105)
  const glowPulse = Math.sin(animationTime * 0.82 + phase) * (0.09 + activeAmount * 0.15)
  const pulse = 1 + slowPulse
  const drift = 1 + glowPulse
  const baseColor = isVisited
    ? visitedStarColor
    : getTimelineStarColor(index, screen.eraKey, false, screen.isKeyEvent)
  const baseGlowColor = isVisited
    ? visitedStarGlowColor
    : getTimelineStarGlowColor(index, screen, false)

  return {
    color: mixStarColor(baseColor, activeAmount),
    glowColor: mixStarColor(baseGlowColor, activeAmount),
    texture: getTimelineStarTexture(variant),
    coreScale: [
      0.58 * size * activeScale * keyScale * visitedScale * pulse,
      0.58 * size * activeScale * keyScale * visitedScale * pulse,
      0.58 * size * activeScale * keyScale * visitedScale * pulse,
    ] as [number, number, number],
    glowScale: [
      1.08 * size * activeScale * keyScale * (1 + activeAmount * 0.18) * drift,
      1.08 * size * activeScale * keyScale * (1 + activeAmount * 0.18) * drift,
      1.08 * size * activeScale * keyScale * (1 + activeAmount * 0.18) * drift,
    ] as [number, number, number],
    glintScale: [
      0.22 * size * activeScale,
      0.22 * size * activeScale,
      0.22 * size * activeScale,
    ] as [number, number, number],
    orbitScale: [
      1.78 * size * (1 + activeAmount * 0.28 + glowPulse * (0.32 + activeAmount * 0.1)) * keyScale,
      1.78 * size * (1 + activeAmount * 0.28 + glowPulse * (0.32 + activeAmount * 0.1)) * keyScale,
      1.78 * size * (1 + activeAmount * 0.28 + glowPulse * (0.32 + activeAmount * 0.1)) * keyScale,
    ] as [number, number, number],
    orbitOpacity:
      (screen.isKeyEvent ? 0.32 : 0.16) +
      (isVisited ? 0.16 : 0) +
      activeAmount * 0.4,
    rotation,
    glintRotation: rotation + Math.PI / 4,
    orbitRotation: -rotation * 0.45 + animationTime * (0.08 + activeAmount * 0.1),
  }
}

export function getTimelineStarHitScale(index: number, isKeyEvent: boolean) {
  return getTimelineStarSize(index, isKeyEvent) * (isKeyEvent ? 1.08 : 1)
}
