import { writable } from 'svelte/store'
import type { StylePreset } from './StylePalettes'

export type RuntimeParticleDistribution = 'volume' | 'ground'
export type RuntimeParticleBlendMode = 'normal' | 'additive'

export interface RuntimeColorGradingSettings {
  saturation: number
  contrast: number
  brightness: number
  warmth: number
}

export interface RuntimeScreenFxSettings {
  vignetteStrength: number
  grainOpacity: number
  accentGlowIntensity: number
  accentGlowColor: string
  secondaryAccentGlowColor: string
  bloomIntensity: number
  bloomThreshold: number
}

export interface RuntimeHeightFogSettings {
  color: string
  density: number
  floor: number
  ceiling: number
  colorInfluence: number
  mistOpacity: number
  mistLayers: number
  mistHeight: number
  mistSpacing: number
  mistScale: number
  mistDriftSpeed: number
}

export interface RuntimeTerrainStyleSettings {
  baseColor: string
  midColor: string
  peakColor: string
  ridgeColor: string
  shadowColor: string
  normalStrength: number
  roughness: number
  envMapIntensity: number
  bumpScale: number
}

export interface RuntimeParticleStyleSettings {
  distribution: RuntimeParticleDistribution
  blendMode: RuntimeParticleBlendMode
  groundBandStrength: number
  sizeMultiplier: number
  opacityMultiplier: number
}

export interface RuntimeVisualStyleSettings {
  id: string
  palettePreset: StylePreset
  toneMappingExposure: number
  colorGrading: RuntimeColorGradingSettings
  screenFx: RuntimeScreenFxSettings
  heightFog: RuntimeHeightFogSettings
  terrain: RuntimeTerrainStyleSettings
  particles: RuntimeParticleStyleSettings
}

export type RuntimeVisualStylePatch = Partial<
  Omit<
    RuntimeVisualStyleSettings,
    'colorGrading' | 'screenFx' | 'heightFog' | 'terrain' | 'particles'
  >
> & {
  colorGrading?: Partial<RuntimeColorGradingSettings>
  screenFx?: Partial<RuntimeScreenFxSettings>
  heightFog?: Partial<RuntimeHeightFogSettings>
  terrain?: Partial<RuntimeTerrainStyleSettings>
  particles?: Partial<RuntimeParticleStyleSettings>
}

export const DEFAULT_RUNTIME_VISUAL_STYLE: RuntimeVisualStyleSettings = {
  id: 'default-site',
  palettePreset: 'site',
  toneMappingExposure: 1,
  colorGrading: {
    saturation: 1,
    contrast: 1,
    brightness: 1,
    warmth: 1,
  },
  screenFx: {
    vignetteStrength: 0.34,
    grainOpacity: 0.04,
    accentGlowIntensity: 0.12,
    accentGlowColor: '#2de2ff',
    secondaryAccentGlowColor: '#ff4dd2',
    bloomIntensity: 0.16,
    bloomThreshold: 0.86,
  },
  heightFog: {
    color: '#1a2340',
    density: 0.00024,
    floor: 0.6,
    ceiling: 13,
    colorInfluence: 0.28,
    mistOpacity: 0.12,
    mistLayers: 3,
    mistHeight: 0.5,
    mistSpacing: 0.44,
    mistScale: 320,
    mistDriftSpeed: 0.035,
  },
  terrain: {
    baseColor: '#0d1327',
    midColor: '#162448',
    peakColor: '#27406f',
    ridgeColor: '#6fd8ff',
    shadowColor: '#03050b',
    normalStrength: 0.55,
    roughness: 0.92,
    envMapIntensity: 0.42,
    bumpScale: 0.04,
  },
  particles: {
    distribution: 'volume',
    blendMode: 'additive',
    groundBandStrength: 0.35,
    sizeMultiplier: 1,
    opacityMultiplier: 1,
  },
}

function mergeRuntimeVisualStyle(
  base: RuntimeVisualStyleSettings,
  overrides: RuntimeVisualStylePatch,
): RuntimeVisualStyleSettings {
  return {
    ...base,
    ...overrides,
    colorGrading: {
      ...base.colorGrading,
      ...(overrides.colorGrading ?? {}),
    },
    screenFx: {
      ...base.screenFx,
      ...(overrides.screenFx ?? {}),
    },
    heightFog: {
      ...base.heightFog,
      ...(overrides.heightFog ?? {}),
    },
    terrain: {
      ...base.terrain,
      ...(overrides.terrain ?? {}),
    },
    particles: {
      ...base.particles,
      ...(overrides.particles ?? {}),
    },
  }
}

function createRuntimeVisualStyleStore() {
  const { subscribe, set, update } = writable(DEFAULT_RUNTIME_VISUAL_STYLE)

  return {
    subscribe,
    replace: (next: RuntimeVisualStyleSettings) => set(next),
    merge: (next: RuntimeVisualStylePatch) => {
      update(current => mergeRuntimeVisualStyle(current, next))
    },
    reset: () => set(DEFAULT_RUNTIME_VISUAL_STYLE),
  }
}

export const runtimeVisualStyleStore = createRuntimeVisualStyleStore()

export function replaceRuntimeVisualStyle(next: RuntimeVisualStyleSettings) {
  runtimeVisualStyleStore.replace(next)
}

export function mergeRuntimeVisualStyleSettings(next: RuntimeVisualStylePatch) {
  runtimeVisualStyleStore.merge(next)
}

export function resetRuntimeVisualStyle() {
  runtimeVisualStyleStore.reset()
}

export { mergeRuntimeVisualStyle }
