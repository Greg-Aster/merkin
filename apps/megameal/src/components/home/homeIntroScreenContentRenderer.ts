import {
  Color,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  type Texture,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three'

type HomeIntroScreenContentRendererOptions = {
  renderWidth?: number
  renderHeight?: number
}

type HomeIntroScreenContentRendererState = {
  fallbackColor: string
  fallbackOpacity: number
  mediaTexture: Texture | null
  mediaTint: string
  videoMediaOpacity: number
  videoReady: boolean
  videoTexture: Texture | null
}

export class HomeIntroScreenContentRenderer {
  readonly texture: Texture

  private readonly target: WebGLRenderTarget
  private readonly scene = new Scene()
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly mediaMaterial = new MeshBasicMaterial({
    color: '#ffffff',
    depthTest: false,
    depthWrite: false,
  })
  private readonly videoMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  })
  private readonly previousClearColor = new Color()
  private lastMediaTexture: Texture | null = null
  private lastVideoTexture: Texture | null = null
  private lastMediaTransparent = false

  constructor({
    renderWidth = 1024,
    renderHeight = 576,
  }: HomeIntroScreenContentRendererOptions = {}) {
    this.target = new WebGLRenderTarget(renderWidth, renderHeight, {
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
    })
    this.target.texture.colorSpace = SRGBColorSpace
    this.texture = this.target.texture

    const fullSurfaceGeometry = new PlaneGeometry(2, 2)

    const mediaMesh = new Mesh(fullSurfaceGeometry, this.mediaMaterial)
    mediaMesh.position.z = -0.04
    this.scene.add(mediaMesh)

    const videoMesh = new Mesh(fullSurfaceGeometry.clone(), this.videoMaterial)
    videoMesh.position.z = -0.03
    this.scene.add(videoMesh)
  }

  render(renderer: WebGLRenderer, state: HomeIntroScreenContentRendererState) {
    this.syncMaterials(state)

    const previousRenderTarget = renderer.getRenderTarget()
    const previousClearAlpha = renderer.getClearAlpha()
    renderer.getClearColor(this.previousClearColor)

    renderer.setRenderTarget(this.target)
    renderer.setClearColor(0x020617, 1)
    renderer.clear(true, true, true)
    renderer.render(this.scene, this.camera)
    renderer.setClearColor(this.previousClearColor, previousClearAlpha)
    renderer.setRenderTarget(previousRenderTarget)
  }

  dispose() {
    this.target.dispose()
    this.scene.traverse(item => {
      const mesh = item as Mesh
      if (!mesh.isMesh) return

      mesh.geometry?.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(material => material.dispose())
        return
      }

      mesh.material?.dispose()
    })
  }

  private syncMaterials({
    fallbackColor,
    fallbackOpacity,
    mediaTexture,
    mediaTint,
    videoMediaOpacity,
    videoReady,
    videoTexture,
  }: HomeIntroScreenContentRendererState) {
    const nextMediaTransparent = !mediaTexture
    const mediaMaterialNeedsUpdate =
      this.lastMediaTexture !== mediaTexture ||
      this.lastMediaTransparent !== nextMediaTransparent

    this.mediaMaterial.map = mediaTexture
    this.mediaMaterial.color.set(mediaTexture ? mediaTint : fallbackColor)
    this.mediaMaterial.transparent = nextMediaTransparent
    this.mediaMaterial.opacity = mediaTexture ? 1 : fallbackOpacity
    if (mediaMaterialNeedsUpdate) {
      this.mediaMaterial.needsUpdate = true
    }
    this.lastMediaTexture = mediaTexture
    this.lastMediaTransparent = nextMediaTransparent

    const videoMaterialNeedsUpdate = this.lastVideoTexture !== videoTexture
    this.videoMaterial.map = videoTexture
    this.videoMaterial.opacity =
      videoTexture && videoReady ? videoMediaOpacity : 0
    if (videoMaterialNeedsUpdate) {
      this.videoMaterial.needsUpdate = true
    }
    this.lastVideoTexture = videoTexture
  }
}
