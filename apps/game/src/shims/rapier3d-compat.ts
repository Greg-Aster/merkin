import RAPIER from '@dimforge/rapier3d'

export * from '@dimforge/rapier3d'

// The non-compat Rapier package eagerly wires up its wasm on import.
// Threlte expects the compat package shape, so expose a no-op async init.
export const init = async () => {}

export default {
  ...RAPIER,
  init,
}
