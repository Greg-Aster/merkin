import {
  LinearFilter,
  type Mesh,
  type MeshBasicMaterial,
  SRGBColorSpace,
  type Texture,
  type TextureLoader,
  type WebGLRenderer,
} from 'three'
import { getHomeIntroKtx2Loader } from './homeIntroKtx2Loader'
import { homeIntroReflectionOnlyUserDataKey } from './homeIntroReflectionOnly'

export const SCREEN_FRAME_WIDTH = 3.18
export const SCREEN_FRAME_HEIGHT = 1.78
export const SCREEN_PORTRAIT_ROTATION_Z = Math.PI / 2
export const SCREEN_MODEL_Z = -0.07
export const SCREEN_CONTENT_INSET = 0.9
export const SCREEN_MEDIA_WIDTH = SCREEN_FRAME_WIDTH * SCREEN_CONTENT_INSET
export const SCREEN_MEDIA_HEIGHT = SCREEN_MEDIA_WIDTH * (9 / 16)
export const SCREEN_FALLBACK_WIDTH = 2.76
export const SCREEN_FALLBACK_HEIGHT = 0.44
export const SCREEN_MEDIA_SURFACE_Z = SCREEN_MODEL_Z + 0.012
export const SCREEN_TEXT_WIDTH = 2.54
export const SCREEN_TEXT_HEIGHT = 1.24
export const SCREEN_TEXT_SURFACE_Z = SCREEN_MODEL_Z + 0.028
export const SCREEN_VIDEO_PLAYBACK_RATE = 0.33

export function getTextureTint(opacity: number): string {
  const channel = Math.round(Math.min(1, Math.max(0, opacity)) * 255)
    .toString(16)
    .padStart(2, '0')
  return `#${channel}${channel}${channel}`
}

export function resolveThrelteRenderer(
  renderer: WebGLRenderer | { current?: WebGLRenderer } | null,
): WebGLRenderer | null {
  if (!renderer) return null
  return 'domElement' in renderer ? renderer : renderer.current ?? null
}

export function loadConfiguredTexture(
  loader: TextureLoader,
  src: string,
  isMounted: () => boolean,
  onLoaded: (texture: Texture) => void,
): Texture {
  return loader.load(src, texture => {
    if (!isMounted()) {
      texture.dispose()
      return
    }
    configureMediaTexture(texture)
    onLoaded(texture)
  })
}

export function loadConfiguredKtx2Texture(params: {
  renderer: WebGLRenderer | null
  src: string
  isMounted: () => boolean
  onLoaded: (texture: Texture) => void
  onError: () => void
}): boolean {
  const ktx2Loader = getHomeIntroKtx2Loader(params.renderer)
  if (!ktx2Loader) return false

  ktx2Loader.load(
    params.src,
    texture => {
      if (!params.isMounted()) {
        texture.dispose()
        return
      }
      configureMediaTexture(texture, true)
      params.onLoaded(texture)
    },
    undefined,
    () => {
      if (!params.isMounted()) return
      params.onError()
    },
  )
  return true
}

export function configureMediaTexture(texture: Texture, invertY = false): void {
  texture.colorSpace = SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter

  if (invertY) {
    texture.repeat.y = -1
    texture.offset.y = 1
  }

  texture.needsUpdate = true
}

export function getScreenContentTextureKey(texture: Texture | null): string {
  return texture ? `${texture.uuid}@${texture.version}` : 'none'
}

export function buildScreenContentRenderKey(state: {
  fallbackColor: string
  fallbackOpacity: number
  mediaTexture: Texture | null
  mediaTint: string
  videoMediaOpacity: number
  videoReady: boolean
  videoTexture: Texture | null
}): string {
  return [
    state.fallbackColor,
    state.fallbackOpacity.toFixed(3),
    getScreenContentTextureKey(state.mediaTexture),
    state.mediaTint,
    state.videoMediaOpacity.toFixed(3),
    state.videoReady ? 'ready' : 'pending',
    getScreenContentTextureKey(state.videoTexture),
  ].join(':')
}

export function bindScreenContentGlitchMask(
  mesh: Mesh,
  material: MeshBasicMaterial,
  hasScreenModel: boolean,
): void {
  mesh.userData[homeIntroReflectionOnlyUserDataKey] = hasScreenModel
  mesh.visible = true
  material.colorWrite = true
  material.depthTest = true
  material.depthWrite = false
  mesh.onBeforeRender = renderer => {
    const renderTarget = renderer.getRenderTarget()
    const renderTargetName = renderTarget?.texture?.name ?? ''
    const isLogoGlitchPass =
      Boolean(renderTarget) && renderTargetName === 'HomeIntroLogoGlitch.logo'

    material.colorWrite = !isLogoGlitchPass
    material.depthTest = true
    material.depthWrite = false
  }
  mesh.onAfterRender = () => {
    material.colorWrite = true
    material.depthTest = true
    material.depthWrite = false
  }
}

export interface ScreenHoverMotionResult {
  hoverBlend: number
  videoMediaOpacity: number
  titleMediaOpacity: number
  mediaOpacity: number
  textOpacity: number
  infoTextOpacity: number
}

export function stepScreenHoverMotion(params: {
  hoverBlend: number
  hovered: boolean
  portraitLayout: boolean
  primary: boolean
  videoReady: boolean
  delta: number
  time: number
  index: number
  panelRoot: {
    position: { z: number }
    rotation: { x: number; y: number }
    scale: { set: (x: number, y: number, z: number) => void }
  } | null
}): ScreenHoverMotionResult {
  const ease = 1 - Math.exp(-params.delta * 8)
  const target = params.hovered && !params.portraitLayout ? 1 : 0
  const hoverBlend = params.hoverBlend + (target - params.hoverBlend) * ease
  const baseTitleOpacity = 0.94
  const baseMediaOpacity = params.primary ? 0.92 : 0.86
  const videoMediaOpacity = params.videoReady ? hoverBlend : 0
  const titleMediaOpacity =
    baseTitleOpacity +
    (1 - baseTitleOpacity) * hoverBlend -
    videoMediaOpacity * 0.18
  const mediaOpacity = baseMediaOpacity + (1 - baseMediaOpacity) * hoverBlend
  const baseTextOpacity = params.primary ? 0.96 : 0.88
  const textOpacity = baseTextOpacity * (1 - hoverBlend)
  const infoTextOpacity = Math.max(0, (hoverBlend - 0.34) / 0.66) * 0.92

  if (params.panelRoot) {
    params.panelRoot.position.z = hoverBlend * 0.045
    params.panelRoot.rotation.x = hoverBlend * -0.018
    params.panelRoot.rotation.y =
      Math.sin(params.time * 0.8 + params.index) * hoverBlend * 0.018
    const scale = 1 + hoverBlend * 0.028
    params.panelRoot.scale.set(scale, scale, scale)
  }

  return {
    hoverBlend,
    videoMediaOpacity,
    titleMediaOpacity,
    mediaOpacity,
    textOpacity,
    infoTextOpacity,
  }
}
