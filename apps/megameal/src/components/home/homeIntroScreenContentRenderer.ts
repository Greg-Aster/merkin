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
  mediaWidth: number
  mediaHeight: number
  textWidth: number
  textHeight: number
  renderWidth?: number
  renderHeight?: number
}

type HomeIntroScreenContentRendererState = {
  fallbackColor: string
  fallbackOpacity: number
  mediaTexture: Texture | null
  mediaTint: string
  screenTextTexture: Texture | null
  textOpacity: number
  textScrimOpacity: number
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
  private readonly scrimMaterial = new MeshBasicMaterial({
    color: '#020617',
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  })
  private readonly textMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  })
  private readonly previousClearColor = new Color()

  constructor({
    mediaWidth,
    mediaHeight,
    textWidth,
    textHeight,
    renderWidth = 1024,
    renderHeight = 576,
  }: HomeIntroScreenContentRendererOptions) {
    this.target = new WebGLRenderTarget(renderWidth, renderHeight, {
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
    })
    this.target.texture.colorSpace = SRGBColorSpace
    this.texture = this.target.texture

    const fullSurfaceGeometry = new PlaneGeometry(2, 2)
    const textSurfaceGeometry = new PlaneGeometry(
      (textWidth / mediaWidth) * 2,
      (textHeight / mediaHeight) * 2,
    )

    const mediaMesh = new Mesh(fullSurfaceGeometry, this.mediaMaterial)
    mediaMesh.position.z = -0.04
    this.scene.add(mediaMesh)

    const videoMesh = new Mesh(fullSurfaceGeometry.clone(), this.videoMaterial)
    videoMesh.position.z = -0.03
    this.scene.add(videoMesh)

    const scrimMesh = new Mesh(fullSurfaceGeometry.clone(), this.scrimMaterial)
    scrimMesh.position.z = -0.02
    this.scene.add(scrimMesh)

    const textMesh = new Mesh(textSurfaceGeometry, this.textMaterial)
    textMesh.position.set(0, 0.02, -0.01)
    this.scene.add(textMesh)
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
    screenTextTexture,
    textOpacity,
    textScrimOpacity,
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

    this.scrimMaterial.opacity = screenTextTexture ? textScrimOpacity : 0

    this.textMaterial.map = screenTextTexture
    this.textMaterial.opacity = screenTextTexture ? textOpacity : 0
    this.textMaterial.needsUpdate = true
  }
}
