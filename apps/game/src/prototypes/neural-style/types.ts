import type * as THREE from 'three'

export interface StylizerPalette {
  shadow: string
  midtone: string
  highlight: string
}

export interface StylizerSettings {
  posterizeLevels: number
  edgeStrength: number
  aberration: number
  glitchAmount: number
  grainAmount: number
  paletteMix: number
}

export interface PrototypePreset {
  id: string
  label: string
  description: string
  stylizeEvery: number
  palette: StylizerPalette
  settings: StylizerSettings
}

export type OnnxExecutionProvider = 'auto' | 'webgpu' | 'wasm'

export type InputRangeMode = 'zeroToOne' | 'minusOneToOne'

export type OutputRangeMode = 'auto' | 'zeroToOne' | 'minusOneToOne' | 'zeroTo255'

export type TensorLayout = 'nchw' | 'nhwc'

export interface StylizerRenderOptions {
  runInference?: boolean
}

export interface StylizerRenderResult {
  inferenceTriggered: boolean
}

export interface OnnxStylizerState {
  status: string
  modelName: string | null
  isReady: boolean
  isRunning: boolean
  executionProvider: OnnxExecutionProvider
  inputLayout: TensorLayout | null
  outputLayout: TensorLayout | null
  inputShape: readonly (number | string)[]
  outputShape: readonly (number | string)[]
  inputRangeMode: InputRangeMode
  outputRangeMode: OutputRangeMode
  lastInferenceMs: number | null
}

export interface OnnxStylizerLoadOptions {
  executionProvider: OnnxExecutionProvider
  inputRangeMode: InputRangeMode
  outputRangeMode: OutputRangeMode
}

export interface FrameStylizer {
  readonly name: string
  resize(width: number, height: number): void
  setPalette(palette: StylizerPalette): void
  setSettings(settings: Partial<StylizerSettings>): void
  render(
    renderer: THREE.WebGLRenderer,
    inputTarget: THREE.WebGLRenderTarget,
    outputTarget: THREE.WebGLRenderTarget | null,
    elapsed: number,
    options?: StylizerRenderOptions,
  ): StylizerRenderResult
  dispose(): void
}
