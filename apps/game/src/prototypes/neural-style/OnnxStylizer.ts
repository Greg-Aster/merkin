import * as THREE from 'three'
import type * as ort from 'onnxruntime-web'

import type {
  FrameStylizer,
  InputRangeMode,
  OnnxExecutionProvider,
  OnnxStylizerLoadOptions,
  OnnxStylizerState,
  OutputRangeMode,
  StylizerPalette,
  StylizerRenderOptions,
  StylizerRenderResult,
  StylizerSettings,
  TensorLayout,
} from './types'

type OnnxRuntimeModule = typeof import('onnxruntime-web')

function getPublicAssetUrl(relativePath: string) {
  if (typeof window === 'undefined') {
    return `${import.meta.env.BASE_URL}${relativePath}`
  }

  return new URL(`${import.meta.env.BASE_URL}${relativePath}`, window.location.origin).href
}

const externalRuntimeModulePath = getPublicAssetUrl(
  'vendor/onnxruntime/ort.webgpu.min.mjs',
)
const externalRuntimeJsepModulePath = getPublicAssetUrl(
  'vendor/onnxruntime/ort-wasm-simd-threaded.jsep.mjs',
)
const externalRuntimeJsepWasmPath = getPublicAssetUrl(
  'vendor/onnxruntime/ort-wasm-simd-threaded.jsep.wasm',
)

const initialState: OnnxStylizerState = {
  status: 'Load an ONNX style-transfer model to begin.',
  modelName: null,
  isReady: false,
  isRunning: false,
  executionProvider: 'auto',
  inputLayout: null,
  outputLayout: null,
  inputShape: [],
  outputShape: [],
  inputRangeMode: 'zeroToOne',
  outputRangeMode: 'auto',
  lastInferenceMs: null,
}

export class OnnxStylizer implements FrameStylizer {
  readonly name = 'onnx-runtime-web'

  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly geometry = new THREE.PlaneGeometry(2, 2)
  private readonly material = new THREE.MeshBasicMaterial()
  private readonly quad = new THREE.Mesh(this.geometry, this.material)

  private runtime: OnnxRuntimeModule | null = null
  private session: ort.InferenceSession | null = null
  private sourceBuffer: Uint8Array | null = null
  private outputTexture: THREE.DataTexture | null = null
  private lastModelBytes: Uint8Array | null = null
  private state: OnnxStylizerState = { ...initialState }
  private inputName: string | null = null
  private outputName: string | null = null
  private inputWidth = 0
  private inputHeight = 0

  constructor(
    private readonly onStateChange?: (state: OnnxStylizerState) => void,
  ) {
    this.scene.add(this.quad)
  }

  resize(_width: number, _height: number) {}

  setPalette(_palette: StylizerPalette) {}

  setSettings(_settings: Partial<StylizerSettings>) {}

  getState() {
    return { ...this.state }
  }

  setPrePostProcessOptions(options: {
    inputRangeMode: InputRangeMode
    outputRangeMode: OutputRangeMode
  }) {
    this.updateState({
      inputRangeMode: options.inputRangeMode,
      outputRangeMode: options.outputRangeMode,
    })
  }

  async loadModel(file: File, options: OnnxStylizerLoadOptions) {
    const buffer = new Uint8Array(await file.arrayBuffer())
    this.lastModelBytes = buffer
    await this.createSession(buffer, file.name, options)
  }

  async reloadModel(options: OnnxStylizerLoadOptions) {
    if (!this.lastModelBytes || !this.state.modelName) {
      this.updateState({
        status: 'Load a model before reloading the session.',
      })
      return
    }

    await this.createSession(this.lastModelBytes, this.state.modelName, options)
  }

  render(
    renderer: THREE.WebGLRenderer,
    inputTarget: THREE.WebGLRenderTarget,
    outputTarget: THREE.WebGLRenderTarget | null,
    _elapsed: number,
    options?: StylizerRenderOptions,
  ): StylizerRenderResult {
    this.material.map = this.outputTexture ?? inputTarget.texture
    this.material.needsUpdate = true

    renderer.setRenderTarget(outputTarget)
    renderer.render(this.scene, this.camera)

    const shouldInfer = options?.runInference === true

    if (!shouldInfer || !this.session || this.state.isRunning) {
      return { inferenceTriggered: false }
    }

    this.runInference(renderer, inputTarget)

    return { inferenceTriggered: true }
  }

  dispose() {
    this.outputTexture?.dispose()
    this.material.dispose()
    this.geometry.dispose()
    void this.session?.release()
  }

  private async ensureRuntime() {
    if (this.runtime) {
      return this.runtime
    }

    const runtime = (await import(
      /* @vite-ignore */ externalRuntimeModulePath
    )) as OnnxRuntimeModule
    runtime.env.wasm.proxy = false
    runtime.env.wasm.wasmPaths = {
      mjs: externalRuntimeJsepModulePath,
      wasm: externalRuntimeJsepWasmPath,
    }
    this.runtime = runtime
    return runtime
  }

  private async createSession(
    modelBytes: Uint8Array,
    modelName: string,
    options: OnnxStylizerLoadOptions,
  ) {
    this.updateState({
      status: `Loading ${modelName}…`,
      modelName,
      isReady: false,
      executionProvider: options.executionProvider,
      inputRangeMode: options.inputRangeMode,
      outputRangeMode: options.outputRangeMode,
    })

    const runtime = await this.ensureRuntime()

    try {
      await this.session?.release()

      const session = await runtime.InferenceSession.create(
        modelBytes.slice(),
        this.getSessionOptions(options.executionProvider),
      )

      this.finishSessionSetup(session, options.executionProvider)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown ONNX loading error.'

      if (options.executionProvider === 'auto') {
        try {
          const session = await runtime.InferenceSession.create(
            modelBytes.slice(),
            this.getSessionOptions('wasm'),
          )

          this.finishSessionSetup(session, 'wasm')
          this.updateState({
            status: 'WebGPU failed, but the model loaded with WASM fallback.',
          })
          return
        } catch {
          this.session = null
        }
      }

      this.session = null
      this.updateState({
        status: `Model load failed: ${message}`,
        isReady: false,
        inputLayout: null,
        outputLayout: null,
        inputShape: [],
        outputShape: [],
      })
    }
  }

  private finishSessionSetup(
    session: ort.InferenceSession,
    executionProvider: OnnxExecutionProvider,
  ) {
    this.session = session
    this.inputName = session.inputNames[0] ?? null
    this.outputName = session.outputNames[0] ?? null

    const inputMetadata = session.inputMetadata[0]
    const outputMetadata = session.outputMetadata[0]

    if (!this.inputName || !this.outputName) {
      throw new Error('Model must expose at least one input and one output tensor.')
    }

    if (!inputMetadata?.isTensor || !outputMetadata?.isTensor) {
      throw new Error('Prototype currently supports tensor input/output models only.')
    }

    const inputLayout = this.detectLayout(inputMetadata.shape)
    const outputLayout = this.detectLayout(outputMetadata.shape)

    if (!inputLayout || !outputLayout) {
      throw new Error('Only 4D NCHW or NHWC tensor layouts are supported.')
    }

    const inputSize = this.extractSpatialShape(inputMetadata.shape, inputLayout)

    this.inputWidth = inputSize.width
    this.inputHeight = inputSize.height

    this.updateState({
      status: `Model ready via ${this.describeProvider(executionProvider)}.`,
      isReady: true,
      executionProvider,
      inputLayout,
      outputLayout,
      inputShape: inputMetadata.shape,
      outputShape: outputMetadata.shape,
      lastInferenceMs: null,
    })
  }

  private getSessionOptions(
    provider: OnnxExecutionProvider,
  ): ort.InferenceSession.SessionOptions {
    if (provider === 'webgpu') {
      return {
        executionProviders: [{ name: 'webgpu', preferredLayout: 'NCHW' }],
        graphOptimizationLevel: 'all',
      }
    }

    if (provider === 'wasm') {
      return {
        executionProviders: [{ name: 'wasm' }],
        graphOptimizationLevel: 'all',
      }
    }

    return {
      executionProviders: [{ name: 'webgpu', preferredLayout: 'NCHW' }, { name: 'wasm' }],
      graphOptimizationLevel: 'all',
    }
  }

  private runInference(
    renderer: THREE.WebGLRenderer,
    inputTarget: THREE.WebGLRenderTarget,
  ) {
    if (!this.runtime || !this.session || !this.inputName || !this.outputName) {
      return
    }

    const sourceWidth = inputTarget.width
    const sourceHeight = inputTarget.height
    const requiredBytes = sourceWidth * sourceHeight * 4

    if (!this.sourceBuffer || this.sourceBuffer.length !== requiredBytes) {
      this.sourceBuffer = new Uint8Array(requiredBytes)
    }

    renderer.readRenderTargetPixels(
      inputTarget,
      0,
      0,
      sourceWidth,
      sourceHeight,
      this.sourceBuffer,
    )

    const inputTensor = this.createInputTensor(this.sourceBuffer, sourceWidth, sourceHeight)
    const feeds: ort.InferenceSession.FeedsType = {
      [this.inputName]: inputTensor,
    }
    const startedAt = performance.now()

    this.updateState({
      isRunning: true,
      status: `Running ${this.state.modelName ?? 'model'}…`,
    })

    void this.session
      .run(feeds)
      .then(async outputs => {
        const outputValue = outputs[this.outputName ?? ''] as ort.Tensor | undefined

        if (!outputValue) {
          throw new Error('Model ran without returning the expected output tensor.')
        }

        const data =
          outputValue.location === 'cpu'
            ? outputValue.data
            : await outputValue.getData()

        this.updateOutputTexture(outputValue.dims, data)
        this.updateState({
          isRunning: false,
          lastInferenceMs: Number((performance.now() - startedAt).toFixed(1)),
          status: `Model ready via ${this.describeProvider(this.state.executionProvider)}.`,
        })
      })
      .catch(error => {
        const message = error instanceof Error ? error.message : 'Unknown ONNX inference error.'
        this.updateState({
          isRunning: false,
          status: `Inference failed: ${message}`,
        })
      })
  }

  private createInputTensor(
    sourceBuffer: Uint8Array,
    sourceWidth: number,
    sourceHeight: number,
  ) {
    if (!this.runtime || !this.state.inputLayout) {
      throw new Error('Cannot create an input tensor before the model is ready.')
    }

    const targetWidth = this.inputWidth || sourceWidth
    const targetHeight = this.inputHeight || sourceHeight
    const channels = 3
    const tensorData = new Float32Array(targetWidth * targetHeight * channels)

    for (let y = 0; y < targetHeight; y += 1) {
      const sourceY = Math.min(
        sourceHeight - 1,
        Math.floor((y / targetHeight) * sourceHeight),
      )

      for (let x = 0; x < targetWidth; x += 1) {
        const sourceX = Math.min(
          sourceWidth - 1,
          Math.floor((x / targetWidth) * sourceWidth),
        )
        const flippedSourceY = sourceHeight - 1 - sourceY
        const sourceIndex = (flippedSourceY * sourceWidth + sourceX) * 4
        const red = this.normalizeInputValue(sourceBuffer[sourceIndex])
        const green = this.normalizeInputValue(sourceBuffer[sourceIndex + 1])
        const blue = this.normalizeInputValue(sourceBuffer[sourceIndex + 2])

        if (this.state.inputLayout === 'nchw') {
          const planeIndex = y * targetWidth + x
          tensorData[planeIndex] = red
          tensorData[targetWidth * targetHeight + planeIndex] = green
          tensorData[targetWidth * targetHeight * 2 + planeIndex] = blue
        } else {
          const interleavedIndex = (y * targetWidth + x) * channels
          tensorData[interleavedIndex] = red
          tensorData[interleavedIndex + 1] = green
          tensorData[interleavedIndex + 2] = blue
        }
      }
    }

    const dims =
      this.state.inputLayout === 'nchw'
        ? [1, channels, targetHeight, targetWidth]
        : [1, targetHeight, targetWidth, channels]

    return new this.runtime.Tensor('float32', tensorData, dims)
  }

  private updateOutputTexture(
    dims: readonly number[],
    data: Float32Array | Uint8Array,
  ) {
    if (!this.state.outputLayout || !(data instanceof Float32Array || data instanceof Uint8Array)) {
      throw new Error('Prototype expects numeric tensor output.')
    }

    const { width, height } = this.extractSpatialShape(dims, this.state.outputLayout)
    const pixelData = new Uint8Array(width * height * 4)

    for (let y = 0; y < height; y += 1) {
      const targetRow = height - 1 - y

      for (let x = 0; x < width; x += 1) {
        let red = 0
        let green = 0
        let blue = 0

        if (this.state.outputLayout === 'nchw') {
          const planeIndex = y * width + x
          red = Number(data[planeIndex] ?? 0)
          green = Number(data[width * height + planeIndex] ?? red)
          blue = Number(data[width * height * 2 + planeIndex] ?? red)
        } else {
          const interleavedIndex = (y * width + x) * 3
          red = Number(data[interleavedIndex] ?? 0)
          green = Number(data[interleavedIndex + 1] ?? red)
          blue = Number(data[interleavedIndex + 2] ?? red)
        }

        const targetIndex = (targetRow * width + x) * 4
        pixelData[targetIndex] = this.denormalizeOutputValue(red)
        pixelData[targetIndex + 1] = this.denormalizeOutputValue(green)
        pixelData[targetIndex + 2] = this.denormalizeOutputValue(blue)
        pixelData[targetIndex + 3] = 255
      }
    }

    if (
      !this.outputTexture ||
      this.outputTexture.image.width !== width ||
      this.outputTexture.image.height !== height
    ) {
      this.outputTexture?.dispose()
      this.outputTexture = new THREE.DataTexture(
        pixelData,
        width,
        height,
        THREE.RGBAFormat,
      )
      this.outputTexture.colorSpace = THREE.SRGBColorSpace
      this.outputTexture.minFilter = THREE.LinearFilter
      this.outputTexture.magFilter = THREE.LinearFilter
    } else {
      this.outputTexture.image.data.set(pixelData)
    }

    this.outputTexture.needsUpdate = true
  }

  private normalizeInputValue(value: number) {
    if (this.state.inputRangeMode === 'minusOneToOne') {
      return value / 127.5 - 1
    }

    return value / 255
  }

  private denormalizeOutputValue(value: number) {
    const mode =
      this.state.outputRangeMode === 'auto'
        ? this.inferOutputMode(value)
        : this.state.outputRangeMode

    if (mode === 'minusOneToOne') {
      return this.clampToByte((value + 1) * 127.5)
    }

    if (mode === 'zeroTo255') {
      return this.clampToByte(value)
    }

    return this.clampToByte(value * 255)
  }

  private inferOutputMode(value: number): Exclude<OutputRangeMode, 'auto'> {
    if (value < 0) {
      return 'minusOneToOne'
    }

    if (value > 1.5) {
      return 'zeroTo255'
    }

    return 'zeroToOne'
  }

  private clampToByte(value: number) {
    return Math.max(0, Math.min(255, Math.round(value)))
  }

  private extractSpatialShape(
    shape: readonly (number | string)[],
    layout: TensorLayout,
  ) {
    if (shape.length !== 4) {
      throw new Error('Expected a 4D tensor shape.')
    }

    const heightIndex = layout === 'nchw' ? 2 : 1
    const widthIndex = layout === 'nchw' ? 3 : 2
    const rawHeight = shape[heightIndex]
    const rawWidth = shape[widthIndex]

    return {
      width: typeof rawWidth === 'number' && rawWidth > 0 ? rawWidth : 256,
      height: typeof rawHeight === 'number' && rawHeight > 0 ? rawHeight : 256,
    }
  }

  private detectLayout(shape: readonly (number | string)[]): TensorLayout | null {
    if (shape.length !== 4) {
      return null
    }

    if (shape[1] === 3) {
      return 'nchw'
    }

    if (shape[3] === 3) {
      return 'nhwc'
    }

    return null
  }

  private describeProvider(provider: OnnxExecutionProvider) {
    if (provider === 'webgpu') return 'WebGPU'
    if (provider === 'wasm') return 'WASM'
    return 'auto provider selection'
  }

  private updateState(next: Partial<OnnxStylizerState>) {
    this.state = { ...this.state, ...next }
    this.onStateChange?.(this.getState())
  }
}
