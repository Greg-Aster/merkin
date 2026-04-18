import type {
  NeuralStylizationOutputRangeMode,
  NeuralStylizationRangeMode,
} from '../../threlte/stores/uiStore'

export interface BundledNeuralStyleModel {
  id: string
  label: string
  description: string
  modelPath: string
  thumbnailPath: string
  inputRangeMode: NeuralStylizationRangeMode
  outputRangeMode: NeuralStylizationOutputRangeMode
}

export const bundledNeuralStyleModels: BundledNeuralStyleModel[] = [
  {
    id: 'candy-9',
    label: 'Candy',
    description: 'Bold brush textures with warm, painterly color blocks.',
    modelPath: 'models/neural-style/candy-9.onnx',
    thumbnailPath: 'images/neural-style-thumbnails/candy.svg',
    inputRangeMode: 'zeroTo255',
    outputRangeMode: 'zeroTo255',
  },
  {
    id: 'mosaic-9',
    label: 'Mosaic',
    description: 'Chunkier tile-like stylization with strong contrast edges.',
    modelPath: 'models/neural-style/mosaic-9.onnx',
    thumbnailPath: 'images/neural-style-thumbnails/mosaic.svg',
    inputRangeMode: 'zeroTo255',
    outputRangeMode: 'zeroTo255',
  },
  {
    id: 'rain-princess-9',
    label: 'Rain Princess',
    description: 'Fluid neon strokes that push the scene toward dreamlike color.',
    modelPath: 'models/neural-style/rain-princess-9.onnx',
    thumbnailPath: 'images/neural-style-thumbnails/rain-princess.svg',
    inputRangeMode: 'zeroTo255',
    outputRangeMode: 'zeroTo255',
  },
  {
    id: 'udnie-9',
    label: 'Udnie',
    description: 'Swirling surrealist abstraction with high texture energy.',
    modelPath: 'models/neural-style/udnie-9.onnx',
    thumbnailPath: 'images/neural-style-thumbnails/udnie.svg',
    inputRangeMode: 'zeroTo255',
    outputRangeMode: 'zeroTo255',
  },
  {
    id: 'pointilism-9',
    label: 'Pointillism',
    description: 'Fine stippled dots and broken color patches for surface detail.',
    modelPath: 'models/neural-style/pointilism-9.onnx',
    thumbnailPath: 'images/neural-style-thumbnails/pointilism.svg',
    inputRangeMode: 'zeroTo255',
    outputRangeMode: 'zeroTo255',
  },
]

export const defaultBundledNeuralStyleModelId = bundledNeuralStyleModels[0]?.id ?? 'candy-9'

export function getBundledNeuralStyleModel(id: string) {
  return (
    bundledNeuralStyleModels.find(model => model.id === id) ??
    bundledNeuralStyleModels[0]
  )
}
