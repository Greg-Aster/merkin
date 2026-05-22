import {
  LinearFilter,
  SRGBColorSpace,
  type Texture,
} from 'three'

export function configureGeneratedCanvasTexture<TTexture extends Texture>(
  texture: TTexture,
) {
  texture.colorSpace = SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true

  return texture
}
