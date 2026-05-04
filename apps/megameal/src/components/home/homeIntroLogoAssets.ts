const qualityLogoModelSrc = '/assets/3D/Hy3D_textured_00005_quality.glb'
const optimizedLogoModelSrc = '/assets/3D/Hy3D_textured_00005_optimized.glb'

export function getHomeIntroLogoModelSrc(
  sceneQuality: 'high' | 'balanced' | 'lean',
) {
  return sceneQuality === 'high' ? qualityLogoModelSrc : optimizedLogoModelSrc
}
