import * as THREE from 'three'
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js'
import copyFragmentShader from './shaders/kuwaharaCopy.frag.glsl?raw'
import depthMaskFragmentShader from './shaders/kuwaharaDepthMask.frag.glsl?raw'
import filterFragmentShader from './shaders/kuwaharaFilter.frag.glsl?raw'
import fullscreenVertexShader from './shaders/kuwaharaFullscreen.vert.glsl?raw'
import structureTensorFragmentShader from './shaders/kuwaharaStructureTensor.frag.glsl?raw'
import tensorBlurFragmentShader from './shaders/kuwaharaTensorBlur.frag.glsl?raw'

export type KuwaharaPassOptions = {
  radius?: number
  mix?: number
  resolutionScale?: number
  type?: THREE.TextureDataType
  depthMask?: THREE.Texture | null
  depthAware?: boolean
}

const DEFAULT_RADIUS = 2
const DEFAULT_MIX = 0.55
const DEFAULT_RESOLUTION_SCALE = 0.75
const MIN_RADIUS = 1
const MAX_RADIUS = 4
const MIN_RESOLUTION_SCALE = 0.35
const MAX_RESOLUTION_SCALE = 1

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function finiteNumberOrDefault(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback
}

function createRenderTarget(
  width: number,
  height: number,
  type: THREE.TextureDataType,
) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    depthBuffer: false,
    stencilBuffer: false,
    format: THREE.RGBAFormat,
    type,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  })
  target.texture.colorSpace = THREE.LinearSRGBColorSpace
  target.texture.generateMipmaps = false
  target.texture.wrapS = THREE.ClampToEdgeWrapping
  target.texture.wrapT = THREE.ClampToEdgeWrapping
  return target
}

export class KuwaharaDepthMaskPass extends Pass {
  private readonly depthMaskMaterial: THREE.ShaderMaterial
  private readonly fullscreenQuad: FullScreenQuad
  private readonly depthMaskTarget: THREE.WebGLRenderTarget

  constructor(type: THREE.TextureDataType = THREE.HalfFloatType) {
    super()
    this.needsSwap = false
    this.depthMaskTarget = createRenderTarget(1, 1, type)
    this.depthMaskMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        sceneDepth: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 1000 },
        isOrthographic: { value: false },
      },
      vertexShader: fullscreenVertexShader,
      fragmentShader: depthMaskFragmentShader,
      depthWrite: false,
      depthTest: false,
    })
    this.fullscreenQuad = new FullScreenQuad(this.depthMaskMaterial)
  }

  get texture() {
    return this.depthMaskTarget.texture
  }

  setCamera(camera: THREE.Camera | null) {
    const depthCamera = camera as
      | (THREE.Camera & {
          near?: number
          far?: number
          isOrthographicCamera?: boolean
        })
      | null
    this.depthMaskMaterial.uniforms.cameraNear.value = depthCamera?.near ?? 0.1
    this.depthMaskMaterial.uniforms.cameraFar.value = depthCamera?.far ?? 1000
    this.depthMaskMaterial.uniforms.isOrthographic.value = Boolean(
      depthCamera?.isOrthographicCamera,
    )
  }

  setSize(width: number, height: number) {
    const nextWidth = Math.max(1, Math.floor(width))
    const nextHeight = Math.max(1, Math.floor(height))
    this.depthMaskTarget.setSize(nextWidth, nextHeight)
    this.depthMaskMaterial.uniforms.texelSize.value.set(
      1 / nextWidth,
      1 / nextHeight,
    )
  }

  render(
    renderer: THREE.WebGLRenderer,
    _writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ) {
    const depthTexture = readBuffer.depthTexture
    if (!depthTexture) return

    const previousRenderTarget = renderer.getRenderTarget()
    const previousAutoClear = renderer.autoClear
    renderer.autoClear = false

    this.depthMaskMaterial.uniforms.sceneDepth.value = depthTexture
    this.fullscreenQuad.material = this.depthMaskMaterial
    renderer.setRenderTarget(this.depthMaskTarget)
    renderer.clear()
    this.fullscreenQuad.render(renderer)

    renderer.autoClear = previousAutoClear
    renderer.setRenderTarget(previousRenderTarget)
  }

  dispose() {
    this.depthMaskTarget.dispose()
    this.depthMaskMaterial.dispose()
    this.fullscreenQuad.dispose()
  }
}

export class KuwaharaPass extends Pass {
  private readonly structureTensorMaterial: THREE.ShaderMaterial
  private readonly tensorBlurMaterial: THREE.ShaderMaterial
  private readonly kuwaharaMaterial: THREE.ShaderMaterial
  private readonly copyMaterial: THREE.ShaderMaterial
  private readonly fullscreenQuad: FullScreenQuad
  private readonly renderTargetType: THREE.TextureDataType
  private structureTensorTarget: THREE.WebGLRenderTarget
  private tensorBlurTarget: THREE.WebGLRenderTarget
  private smoothedTensorTarget: THREE.WebGLRenderTarget
  private kuwaharaTarget: THREE.WebGLRenderTarget
  private width = 1
  private height = 1
  private passResolutionScale = DEFAULT_RESOLUTION_SCALE

  constructor(
    width: number,
    height: number,
    options: KuwaharaPassOptions = {},
  ) {
    super()
    this.renderTargetType = options.type ?? THREE.HalfFloatType
    this.passResolutionScale = clampNumber(
      finiteNumberOrDefault(options.resolutionScale, DEFAULT_RESOLUTION_SCALE),
      MIN_RESOLUTION_SCALE,
      MAX_RESOLUTION_SCALE,
    )
    this.structureTensorTarget = createRenderTarget(1, 1, this.renderTargetType)
    this.tensorBlurTarget = createRenderTarget(1, 1, this.renderTargetType)
    this.smoothedTensorTarget = createRenderTarget(1, 1, this.renderTargetType)
    this.kuwaharaTarget = createRenderTarget(1, 1, this.renderTargetType)
    this.structureTensorMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        inputBuffer: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: fullscreenVertexShader,
      fragmentShader: structureTensorFragmentShader,
      depthWrite: false,
      depthTest: false,
    })
    this.tensorBlurMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        inputBuffer: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        direction: { value: new THREE.Vector2(1, 0) },
      },
      vertexShader: fullscreenVertexShader,
      fragmentShader: tensorBlurFragmentShader,
      depthWrite: false,
      depthTest: false,
    })
    this.kuwaharaMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        inputBuffer: { value: null },
        structureTensor: { value: null },
        depthMask: { value: options.depthMask ?? null },
        inputTexelSize: { value: new THREE.Vector2(1, 1) },
        radius: { value: DEFAULT_RADIUS },
        mixAmount: { value: DEFAULT_MIX },
        depthAwareEnabled: {
          value: options.depthAware === false || !options.depthMask ? 0 : 1,
        },
        nearDepthMix: { value: 1 },
        farDepthMix: { value: 0.45 },
        edgePreserveStrength: { value: 0.82 },
        distanceFadeStart: { value: 0.18 },
        distanceFadeEnd: { value: 0.78 },
        farRadiusScale: { value: 0.55 },
        edgeRadiusScale: { value: 0.45 },
      },
      vertexShader: fullscreenVertexShader,
      fragmentShader: filterFragmentShader,
      depthWrite: false,
      depthTest: false,
    })
    this.copyMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        inputBuffer: { value: null },
      },
      vertexShader: fullscreenVertexShader,
      fragmentShader: copyFragmentShader,
      depthWrite: false,
      depthTest: false,
    })
    this.fullscreenQuad = new FullScreenQuad(this.copyMaterial)
    this.radius = options.radius ?? DEFAULT_RADIUS
    this.mix = options.mix ?? DEFAULT_MIX
    this.setSize(width, height)
  }

  setDepthMask(texture: THREE.Texture | null) {
    this.kuwaharaMaterial.uniforms.depthMask.value = texture
    this.kuwaharaMaterial.uniforms.depthAwareEnabled.value = texture ? 1 : 0
  }

  get radius() {
    return this.kuwaharaMaterial.uniforms.radius.value as number
  }

  set radius(value: number) {
    this.kuwaharaMaterial.uniforms.radius.value = Math.round(
      clampNumber(
        finiteNumberOrDefault(value, DEFAULT_RADIUS),
        MIN_RADIUS,
        MAX_RADIUS,
      ),
    )
  }

  get mix() {
    return this.kuwaharaMaterial.uniforms.mixAmount.value as number
  }

  set mix(value: number) {
    this.kuwaharaMaterial.uniforms.mixAmount.value = clampNumber(
      finiteNumberOrDefault(value, DEFAULT_MIX),
      0,
      1,
    )
  }

  get resolutionScale() {
    return this.passResolutionScale
  }

  set resolutionScale(value: number) {
    const nextScale = clampNumber(
      finiteNumberOrDefault(value, DEFAULT_RESOLUTION_SCALE),
      MIN_RESOLUTION_SCALE,
      MAX_RESOLUTION_SCALE,
    )
    if (nextScale === this.passResolutionScale) return
    this.passResolutionScale = nextScale
    this.setSize(this.width, this.height)
  }

  setSize(width: number, height: number) {
    this.width = Math.max(1, Math.floor(width))
    this.height = Math.max(1, Math.floor(height))
    const scaledWidth = Math.max(
      1,
      Math.floor(this.width * this.passResolutionScale),
    )
    const scaledHeight = Math.max(
      1,
      Math.floor(this.height * this.passResolutionScale),
    )

    this.structureTensorTarget.setSize(scaledWidth, scaledHeight)
    this.tensorBlurTarget.setSize(scaledWidth, scaledHeight)
    this.smoothedTensorTarget.setSize(scaledWidth, scaledHeight)
    this.kuwaharaTarget.setSize(scaledWidth, scaledHeight)
    this.tensorBlurMaterial.uniforms.texelSize.value.set(
      1 / scaledWidth,
      1 / scaledHeight,
    )
    this.structureTensorMaterial.uniforms.texelSize.value.set(
      1 / this.width,
      1 / this.height,
    )
    this.kuwaharaMaterial.uniforms.inputTexelSize.value.set(
      1 / this.width,
      1 / this.height,
    )
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ) {
    const previousRenderTarget = renderer.getRenderTarget()
    const previousAutoClear = renderer.autoClear
    renderer.autoClear = false

    this.structureTensorMaterial.uniforms.inputBuffer.value = readBuffer.texture
    this.structureTensorMaterial.uniforms.texelSize.value.set(
      1 / readBuffer.width,
      1 / readBuffer.height,
    )
    this.fullscreenQuad.material = this.structureTensorMaterial
    renderer.setRenderTarget(this.structureTensorTarget)
    renderer.clear()
    this.fullscreenQuad.render(renderer)

    this.tensorBlurMaterial.uniforms.inputBuffer.value =
      this.structureTensorTarget.texture
    this.tensorBlurMaterial.uniforms.texelSize.value.set(
      1 / this.structureTensorTarget.width,
      1 / this.structureTensorTarget.height,
    )
    this.tensorBlurMaterial.uniforms.direction.value.set(1, 0)
    this.fullscreenQuad.material = this.tensorBlurMaterial
    renderer.setRenderTarget(this.tensorBlurTarget)
    renderer.clear()
    this.fullscreenQuad.render(renderer)

    this.tensorBlurMaterial.uniforms.inputBuffer.value =
      this.tensorBlurTarget.texture
    this.tensorBlurMaterial.uniforms.direction.value.set(0, 1)
    renderer.setRenderTarget(this.smoothedTensorTarget)
    renderer.clear()
    this.fullscreenQuad.render(renderer)

    this.kuwaharaMaterial.uniforms.inputBuffer.value = readBuffer.texture
    this.kuwaharaMaterial.uniforms.structureTensor.value =
      this.smoothedTensorTarget.texture
    this.kuwaharaMaterial.uniforms.inputTexelSize.value.set(
      1 / readBuffer.width,
      1 / readBuffer.height,
    )
    this.fullscreenQuad.material = this.kuwaharaMaterial
    renderer.setRenderTarget(this.kuwaharaTarget)
    renderer.clear()
    this.fullscreenQuad.render(renderer)

    this.copyMaterial.uniforms.inputBuffer.value = this.kuwaharaTarget.texture
    this.fullscreenQuad.material = this.copyMaterial
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer)
    if (this.clear) renderer.clear()
    this.fullscreenQuad.render(renderer)

    renderer.autoClear = previousAutoClear
    renderer.setRenderTarget(previousRenderTarget)
  }

  dispose() {
    this.structureTensorTarget.dispose()
    this.tensorBlurTarget.dispose()
    this.smoothedTensorTarget.dispose()
    this.kuwaharaTarget.dispose()
    this.structureTensorMaterial.dispose()
    this.tensorBlurMaterial.dispose()
    this.kuwaharaMaterial.dispose()
    this.copyMaterial.dispose()
    this.fullscreenQuad.dispose()
  }
}
