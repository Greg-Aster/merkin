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
  type WebGLRenderer,
  WebGLRenderTarget,
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
    this.mediaMaterial.map = mediaTexture
    this.mediaMaterial.color.set(mediaTexture ? mediaTint : fallbackColor)
    this.mediaMaterial.transparent = !mediaTexture
    this.mediaMaterial.opacity = mediaTexture ? 1 : fallbackOpacity
    this.mediaMaterial.needsUpdate = true

    this.videoMaterial.map = videoTexture
    this.videoMaterial.opacity = videoTexture && videoReady ? videoMediaOpacity : 0
    this.videoMaterial.needsUpdate = true
  }
}
