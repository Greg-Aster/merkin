import type { PrototypePreset } from './types'

export const prototypePresets: PrototypePreset[] = [
  {
    id: 'glitch-noir',
    label: 'Glitch Noir',
    description:
      'High edge contrast, restrained palette, and unstable chromatic offsets.',
    stylizeEvery: 2,
    palette: {
      shadow: '#07070c',
      midtone: '#5532ff',
      highlight: '#f4eaff',
    },
    settings: {
      posterizeLevels: 5,
      edgeStrength: 1.65,
      aberration: 0.005,
      glitchAmount: 0.02,
      grainAmount: 0.04,
      paletteMix: 0.88,
    },
  },
  {
    id: 'toon-sunset',
    label: 'Toon Sunset',
    description:
      'A softer proof-of-concept preset closer to painterly cel shading.',
    stylizeEvery: 1,
    palette: {
      shadow: '#1f2a44',
      midtone: '#ff9051',
      highlight: '#fff2bf',
    },
    settings: {
      posterizeLevels: 6,
      edgeStrength: 1.15,
      aberration: 0.0015,
      glitchAmount: 0.006,
      grainAmount: 0.02,
      paletteMix: 0.72,
    },
  },
  {
    id: 'neon-drift',
    label: 'Neon Drift',
    description:
      'Aggressive palette remapping with visible RGB split for synthetic motion.',
    stylizeEvery: 3,
    palette: {
      shadow: '#08131e',
      midtone: '#00d9ff',
      highlight: '#ff5cc8',
    },
    settings: {
      posterizeLevels: 4,
      edgeStrength: 1.8,
      aberration: 0.008,
      glitchAmount: 0.026,
      grainAmount: 0.055,
      paletteMix: 0.93,
    },
  },
]

export const defaultPrototypePreset = prototypePresets[0]
