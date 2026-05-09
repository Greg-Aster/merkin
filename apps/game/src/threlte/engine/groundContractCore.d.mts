export function getLevelGroundContract(
  settings: unknown,
): Record<string, unknown> | null

export function getRuntimeGroundContract(
  levelDefinition: { settings?: unknown } | null | undefined,
): Record<string, unknown> | undefined

export function hasAuthoredGroundVisuals(settings: unknown): boolean

export function shouldRenderTerrainVisualChunks(
  levelId: string,
  settings: unknown,
): boolean

export function validateLevelGroundContract(
  level: { id?: string; settings?: unknown } | null | undefined,
  actorsById: Map<string, any>,
): string[]
