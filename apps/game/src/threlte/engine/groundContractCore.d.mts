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

export function classifyTerrainAuthority(
  input:
    | {
        level?: { id?: string; settings?: unknown } | null | undefined
        manifest?: unknown
        manifestUrl?: string | null | undefined
        enforceFinalAuthority?: boolean | null | undefined
      }
    | { id?: string; settings?: unknown }
    | null
    | undefined,
): {
  levelId: string
  hasGroundContract: boolean
  mode: string
  visualSource: string
  collisionSource: string | undefined
  fallbackSurfacePolicy: string
  configuredVisualSources: string[]
  manifestUrlMismatch: string[]
  mixedAuthority: boolean
}

export function getTerrainAuthorityDiagnostics(
  input:
    | {
        level?: { id?: string; settings?: unknown } | null | undefined
        manifest?: unknown
        manifestUrl?: string | null | undefined
        enforceFinalAuthority?: boolean | null | undefined
      }
    | { id?: string; settings?: unknown }
    | null
    | undefined,
): {
  errors: string[]
  warnings: string[]
}

export function validateLevelGroundContract(
  level: { id?: string; settings?: unknown } | null | undefined,
  actorsById: Map<string, any>,
): string[]
