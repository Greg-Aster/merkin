export const COLLISION_CHANNELS: readonly string[]

export function isCollisionChannel(value: string | null | undefined): boolean

export function getDefaultCollisionChannel(input: {
  intent: string
  bodyType?: string | null
}): string

export function resolveCollisionChannel(input: {
  intent: string
  bodyType?: string | null
  authoredChannel?: string | null
}): string
