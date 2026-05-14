export interface RuntimePlayerSettings {
  moveSpeed: number
  sprintMultiplier: number
  jumpForce: number
  lightIntensityScale: number
}

export const DEFAULT_RUNTIME_PLAYER_SETTINGS: RuntimePlayerSettings = {
  moveSpeed: 5,
  sprintMultiplier: 2,
  jumpForce: 10,
  lightIntensityScale: 60,
}

function finiteNumberOrDefault(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function finiteMinNumberOrDefault(
  value: unknown,
  fallback: number,
  min: number,
) {
  return Math.max(min, finiteNumberOrDefault(value, fallback))
}

export function resolveRuntimePlayerSettings(
  value: unknown,
): RuntimePlayerSettings {
  const source =
    value && typeof value === 'object'
      ? (value as Partial<RuntimePlayerSettings>)
      : {}

  return {
    moveSpeed: finiteNumberOrDefault(
      source.moveSpeed,
      DEFAULT_RUNTIME_PLAYER_SETTINGS.moveSpeed,
    ),
    sprintMultiplier: finiteMinNumberOrDefault(
      source.sprintMultiplier,
      DEFAULT_RUNTIME_PLAYER_SETTINGS.sprintMultiplier,
      1,
    ),
    jumpForce: finiteNumberOrDefault(
      source.jumpForce,
      DEFAULT_RUNTIME_PLAYER_SETTINGS.jumpForce,
    ),
    lightIntensityScale: finiteNumberOrDefault(
      source.lightIntensityScale,
      DEFAULT_RUNTIME_PLAYER_SETTINGS.lightIntensityScale,
    ),
  }
}
