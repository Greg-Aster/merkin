export const RUNTIME_INPUT_BINDING_VERSION = 1

export type RuntimeInputDevice = 'keyboard' | 'gamepad' | 'touch'

export type RuntimeInputActionId =
  | 'moveForward'
  | 'moveBackward'
  | 'moveLeft'
  | 'moveRight'
  | 'jump'
  | 'sprint'
  | 'lightPulse'

export interface RuntimeInputActionDescriptor {
  id: RuntimeInputActionId
  label: string
  category: 'movement' | 'action'
  defaultKeyboardCodes: readonly string[]
  gameplayCritical: boolean
  rebindable: boolean
  devices: readonly RuntimeInputDevice[]
}

export type RuntimeInputBindingMap = Record<RuntimeInputActionId, string[]>

export interface RuntimeInputBindingSnapshot {
  version: typeof RUNTIME_INPUT_BINDING_VERSION
  keyboard: RuntimeInputBindingMap
}

export const RUNTIME_INPUT_ACTIONS = [
  {
    id: 'moveForward',
    label: 'Forward',
    category: 'movement',
    defaultKeyboardCodes: ['KeyW', 'ArrowUp'],
    gameplayCritical: true,
    rebindable: true,
    devices: ['keyboard', 'gamepad', 'touch'],
  },
  {
    id: 'moveBackward',
    label: 'Backward',
    category: 'movement',
    defaultKeyboardCodes: ['KeyS', 'ArrowDown'],
    gameplayCritical: true,
    rebindable: true,
    devices: ['keyboard', 'gamepad', 'touch'],
  },
  {
    id: 'moveLeft',
    label: 'Left',
    category: 'movement',
    defaultKeyboardCodes: ['KeyA', 'ArrowLeft'],
    gameplayCritical: true,
    rebindable: true,
    devices: ['keyboard', 'gamepad', 'touch'],
  },
  {
    id: 'moveRight',
    label: 'Right',
    category: 'movement',
    defaultKeyboardCodes: ['KeyD', 'ArrowRight'],
    gameplayCritical: true,
    rebindable: true,
    devices: ['keyboard', 'gamepad', 'touch'],
  },
  {
    id: 'jump',
    label: 'Jump',
    category: 'action',
    defaultKeyboardCodes: ['Space'],
    gameplayCritical: true,
    rebindable: true,
    devices: ['keyboard', 'gamepad', 'touch'],
  },
  {
    id: 'sprint',
    label: 'Sprint',
    category: 'movement',
    defaultKeyboardCodes: ['ShiftLeft', 'ShiftRight'],
    gameplayCritical: false,
    rebindable: true,
    devices: ['keyboard', 'gamepad'],
  },
  {
    id: 'lightPulse',
    label: 'Light Pulse',
    category: 'action',
    defaultKeyboardCodes: ['KeyF'],
    gameplayCritical: false,
    rebindable: true,
    devices: ['keyboard', 'gamepad', 'touch'],
  },
] as const satisfies readonly RuntimeInputActionDescriptor[]

export const RUNTIME_INPUT_ACTION_IDS = RUNTIME_INPUT_ACTIONS.map(
  action => action.id,
) as RuntimeInputActionId[]

export const RESERVED_RUNTIME_INPUT_CODES = new Set([
  'Escape',
  'Tab',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'ContextMenu',
])

export function createDefaultRuntimeInputBindings(): RuntimeInputBindingMap {
  return RUNTIME_INPUT_ACTIONS.reduce((bindings, action) => {
    bindings[action.id] = [...action.defaultKeyboardCodes]
    return bindings
  }, {} as RuntimeInputBindingMap)
}

export const DEFAULT_RUNTIME_INPUT_BINDINGS =
  createDefaultRuntimeInputBindings()

export function getRuntimeInputActionDescriptor(
  actionId: RuntimeInputActionId,
) {
  return RUNTIME_INPUT_ACTIONS.find(action => action.id === actionId) ?? null
}

export function isRuntimeInputActionId(
  value: unknown,
): value is RuntimeInputActionId {
  return (
    typeof value === 'string' &&
    RUNTIME_INPUT_ACTION_IDS.includes(value as RuntimeInputActionId)
  )
}

export function isRuntimeInputCodeAllowed(code: string) {
  return code.length > 0 && !RESERVED_RUNTIME_INPUT_CODES.has(code)
}

function normalizeKeyboardCodes(value: unknown, fallback: readonly string[]) {
  const inputCodes = Array.isArray(value) ? value : fallback
  const normalized: string[] = []

  for (const code of inputCodes) {
    if (typeof code !== 'string' || !isRuntimeInputCodeAllowed(code)) continue
    if (!normalized.includes(code)) normalized.push(code)
  }

  return normalized.length > 0 ? normalized : [...fallback]
}

export function normalizeRuntimeInputBindings(
  value: unknown,
): RuntimeInputBindingMap {
  const source =
    value && typeof value === 'object'
      ? (value as Partial<Record<RuntimeInputActionId, unknown>>)
      : {}

  return RUNTIME_INPUT_ACTIONS.reduce((bindings, action) => {
    bindings[action.id] = normalizeKeyboardCodes(
      source[action.id],
      action.defaultKeyboardCodes,
    )
    return bindings
  }, {} as RuntimeInputBindingMap)
}

export function createRuntimeInputBindingSnapshot(
  keyboard: unknown,
): RuntimeInputBindingSnapshot {
  return {
    version: RUNTIME_INPUT_BINDING_VERSION,
    keyboard: normalizeRuntimeInputBindings(keyboard),
  }
}

export function normalizeRuntimeInputBindingSnapshot(
  value: unknown,
): RuntimeInputBindingSnapshot {
  const source =
    value && typeof value === 'object'
      ? (value as Partial<RuntimeInputBindingSnapshot>)
      : {}

  return createRuntimeInputBindingSnapshot(source.keyboard)
}

export function rebindRuntimeInputCode(
  current: RuntimeInputBindingMap,
  actionId: RuntimeInputActionId,
  code: string,
): RuntimeInputBindingMap {
  if (!isRuntimeInputCodeAllowed(code)) {
    return normalizeRuntimeInputBindings(current)
  }

  const action = getRuntimeInputActionDescriptor(actionId)
  if (!action?.rebindable) return normalizeRuntimeInputBindings(current)

  const normalized = normalizeRuntimeInputBindings(current)
  const next = RUNTIME_INPUT_ACTIONS.reduce((bindings, candidate) => {
    bindings[candidate.id] = normalized[candidate.id].filter(
      existingCode => existingCode !== code,
    )
    return bindings
  }, {} as RuntimeInputBindingMap)
  const previousActionCodes = normalized[actionId]
  const secondaryCodes = previousActionCodes
    .filter(existingCode => existingCode !== code)
    .slice(1)

  next[actionId] = [code, ...secondaryCodes]
  return normalizeRuntimeInputBindings(next)
}

export function isRuntimeInputActionActive(
  actionId: RuntimeInputActionId,
  activeCodes: Readonly<Record<string, boolean>>,
  bindings: RuntimeInputBindingMap,
) {
  const codes = bindings[actionId] ?? DEFAULT_RUNTIME_INPUT_BINDINGS[actionId]
  return codes.some(code => activeCodes[code])
}

export function shouldPreventDefaultForRuntimeInputCode(
  code: string,
  bindings: RuntimeInputBindingMap,
) {
  return RUNTIME_INPUT_ACTIONS.some(action =>
    (bindings[action.id] ?? DEFAULT_RUNTIME_INPUT_BINDINGS[action.id]).includes(
      code,
    ),
  )
}

export function formatRuntimeInputCodeLabel(code: string) {
  if (code === 'Space') return 'Space'
  if (code.startsWith('Key') && code.length === 4) return code.slice(3)
  if (code.startsWith('Digit') && code.length === 6) return code.slice(5)
  if (code.startsWith('Arrow')) return code.replace('Arrow', 'Arrow ')
  if (code.startsWith('Shift')) return code.replace('Shift', 'Shift ')
  if (code.startsWith('Control')) return code.replace('Control', 'Control ')
  return code
}
