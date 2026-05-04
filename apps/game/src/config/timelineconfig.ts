// Runtime star-map configuration. Broader timeline service configuration lives
// outside the game runtime; this file only exposes data consumed by StarMap.

export type ConstellationPatternPoint = {
  azOffset: number
  elOffset: number
}

export type ConstellationConfig = {
  centerAzimuth: number
  centerElevation: number
  spread: number
  pattern: string
}

export const eraColorMap: Record<string, string> = {
  'ancient-epoch': '#3b82f6',
  'awakening-era': '#8b5cf6',
  'golden-age': '#6366f1',
  'conflict-epoch': '#ec4899',
  'singularity-conflict': '#ef4444',
  'transcendent-age': '#14b8a6',
  'final-epoch': '#22c55e',
  'cosmic-origin': '#ffffff',
  unknown: '#6366f1',
}

export const colorSpectrum: string[] = [
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
]

export const starTypes: string[] = [
  'point',
  'classic',
  'sparkle',
  'refraction',
  'halo',
  'subtle',
]

export const constellationConfig: Record<string, ConstellationConfig> = {
  'ancient-epoch': {
    centerAzimuth: 0,
    centerElevation: 45,
    spread: 40,
    pattern: 'ancient_wisdom',
  },
  'awakening-era': {
    centerAzimuth: 60,
    centerElevation: 50,
    spread: 35,
    pattern: 'rising_dawn',
  },
  'golden-age': {
    centerAzimuth: 120,
    centerElevation: 55,
    spread: 45,
    pattern: 'crown',
  },
  'conflict-epoch': {
    centerAzimuth: 180,
    centerElevation: 40,
    spread: 40,
    pattern: 'crossed_swords',
  },
  'singularity-conflict': {
    centerAzimuth: 240,
    centerElevation: 45,
    spread: 35,
    pattern: 'supernova',
  },
  'transcendent-age': {
    centerAzimuth: 300,
    centerElevation: 60,
    spread: 40,
    pattern: 'ascension',
  },
  'final-epoch': {
    centerAzimuth: 340,
    centerElevation: 65,
    spread: 30,
    pattern: 'omega',
  },
  'cosmic-origin': {
    centerAzimuth: 30,
    centerElevation: 70,
    spread: 25,
    pattern: 'scattered',
  },
  'level-portals': {
    centerAzimuth: 30,
    centerElevation: 35,
    spread: 25,
    pattern: 'level_gate',
  },
  wip: {
    centerAzimuth: 90,
    centerElevation: 45,
    spread: 30,
    pattern: 'scattered',
  },
  'the-dark-between': {
    centerAzimuth: 210,
    centerElevation: 35,
    spread: 35,
    pattern: 'scattered',
  },
  'preservation-era': {
    centerAzimuth: 270,
    centerElevation: 50,
    spread: 40,
    pattern: 'crown',
  },
  unknown: {
    centerAzimuth: 30,
    centerElevation: 35,
    spread: 25,
    pattern: 'scattered',
  },
}

export const constellationPatterns: Record<string, ConstellationPatternPoint[]> = {
  ancient_wisdom: [
    { azOffset: 0, elOffset: 0 },
    { azOffset: -15, elOffset: 10 },
    { azOffset: 15, elOffset: 8 },
    { azOffset: -8, elOffset: -12 },
    { azOffset: 12, elOffset: -10 },
    { azOffset: 0, elOffset: 20 },
    { azOffset: -20, elOffset: -5 },
    { azOffset: 25, elOffset: -8 },
  ],
  rising_dawn: [
    { azOffset: -10, elOffset: -15 },
    { azOffset: 0, elOffset: 0 },
    { azOffset: 10, elOffset: 15 },
    { azOffset: -5, elOffset: 8 },
    { azOffset: 5, elOffset: 8 },
    { azOffset: 15, elOffset: 25 },
    { azOffset: -15, elOffset: 20 },
  ],
  crown: [
    { azOffset: 0, elOffset: 15 },
    { azOffset: -12, elOffset: 8 },
    { azOffset: 12, elOffset: 8 },
    { azOffset: -6, elOffset: 0 },
    { azOffset: 6, elOffset: 0 },
    { azOffset: -20, elOffset: -5 },
    { azOffset: 20, elOffset: -5 },
    { azOffset: 0, elOffset: -10 },
  ],
  crossed_swords: [
    { azOffset: -15, elOffset: 15 },
    { azOffset: 15, elOffset: -15 },
    { azOffset: 15, elOffset: 15 },
    { azOffset: -15, elOffset: -15 },
    { azOffset: 0, elOffset: 0 },
    { azOffset: -25, elOffset: 10 },
    { azOffset: 25, elOffset: -10 },
  ],
  supernova: [
    { azOffset: 0, elOffset: 0 },
    { azOffset: 0, elOffset: 20 },
    { azOffset: 17, elOffset: 10 },
    { azOffset: 20, elOffset: 0 },
    { azOffset: 17, elOffset: -10 },
    { azOffset: 0, elOffset: -20 },
    { azOffset: -17, elOffset: -10 },
    { azOffset: -20, elOffset: 0 },
    { azOffset: -17, elOffset: 10 },
  ],
  ascension: [
    { azOffset: 0, elOffset: 25 },
    { azOffset: -8, elOffset: 15 },
    { azOffset: 8, elOffset: 15 },
    { azOffset: -15, elOffset: 5 },
    { azOffset: 15, elOffset: 5 },
    { azOffset: -20, elOffset: -10 },
    { azOffset: 20, elOffset: -10 },
    { azOffset: 0, elOffset: -5 },
  ],
  omega: [
    { azOffset: -10, elOffset: 10 },
    { azOffset: 10, elOffset: 10 },
    { azOffset: -15, elOffset: 0 },
    { azOffset: 15, elOffset: 0 },
    { azOffset: -8, elOffset: -10 },
    { azOffset: 8, elOffset: -10 },
    { azOffset: 0, elOffset: 5 },
  ],
  level_gate: [
    { azOffset: 0, elOffset: 14 },
    { azOffset: -16, elOffset: 6 },
    { azOffset: 16, elOffset: 6 },
    { azOffset: -10, elOffset: -10 },
    { azOffset: 10, elOffset: -10 },
    { azOffset: 0, elOffset: -18 },
  ],
  scattered: [
    { azOffset: 5, elOffset: 8 },
    { azOffset: -12, elOffset: -5 },
    { azOffset: 18, elOffset: 12 },
    { azOffset: -8, elOffset: 15 },
    { azOffset: 10, elOffset: -10 },
    { azOffset: -15, elOffset: 3 },
  ],
}

export const connectionPatterns: Record<string, Array<[number, number]>> = {
  ancient_wisdom: [
    [0, 1],
    [0, 2],
    [1, 5],
    [2, 5],
    [0, 3],
    [0, 4],
  ],
  rising_dawn: [
    [0, 1],
    [1, 2],
    [1, 3],
    [1, 4],
    [2, 5],
    [2, 6],
  ],
  crown: [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [3, 7],
    [4, 7],
    [5, 6],
  ],
  crossed_swords: [
    [0, 1],
    [2, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
  ],
  supernova: [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [0, 6],
    [0, 7],
    [0, 8],
  ],
  ascension: [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [3, 5],
    [4, 6],
    [7, 1],
    [7, 2],
  ],
  omega: [
    [0, 1],
    [2, 3],
    [4, 5],
    [0, 6],
    [1, 6],
    [2, 4],
    [3, 5],
  ],
  level_gate: [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [3, 5],
    [4, 5],
    [1, 2],
    [3, 4],
  ],
  scattered: [
    [0, 1],
    [1, 2],
    [2, 3],
  ],
}
