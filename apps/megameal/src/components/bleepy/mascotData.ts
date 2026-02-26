// --- TypeScript Interfaces for Animation Data ---
export interface BaseAnimation {
  id: string
  animationClass: string
}

export interface PretzelPeteSurrealAnimation extends BaseAnimation {
  originalBodyId: string
  unravelledPathIds: string[]
  saltSelector: string
  step1Duration: number
  step2Duration: number
  swayDuration: number
  saltFallDuration: number
  reverseStep1Duration: number
  reverseStep2Duration: number
}

export interface SushiSamSurrealAnimation extends BaseAnimation {
  flapSelector: string
  openDuration: number
  closeDuration: number
  revealDuration: number
}

export type SurrealAnimationData =
  | PretzelPeteSurrealAnimation
  | SushiSamSurrealAnimation

// --- Active Mascot Data ---
export const mascots = [
  // No active mascots - configuration moved to bleepyConfig.ts
]

// --- Persona Strings ---
export const personaStrings = {
  // Persona configurations moved to bleepyConfig.ts
}

export type MascotName = keyof typeof personaStrings

// --- Dialogue Content ---
// Bleepy-specific dialogues moved to src/config/bleepyConfig.ts
// If other mascots need these, they should be defined here or in their respective configs.