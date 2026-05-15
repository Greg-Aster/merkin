export const SKYBOX_PRESETS = {
  observatory: {
    path: '/assets/hdri/skywip4-cubemap/',
    files: [
      'px.webp',
      'nx.webp',
      'py.webp',
      'ny.webp',
      'pz.webp',
      'nz.webp',
    ] as [string, string, string, string, string, string],
  },
  classic: {
    path: '/assets/skyboxes/',
    files: [
      'px.webp',
      'nx.webp',
      'py.webp',
      'ny.webp',
      'pz.webp',
      'nz.webp',
    ] as [string, string, string, string, string, string],
  },
} as const

export type SkyboxPresetId = keyof typeof SKYBOX_PRESETS

export function resolveSkyboxPreset(preset: unknown) {
  return SKYBOX_PRESETS[preset as SkyboxPresetId] ?? SKYBOX_PRESETS.observatory
}
