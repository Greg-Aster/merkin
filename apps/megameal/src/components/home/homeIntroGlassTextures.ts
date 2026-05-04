import {
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

export function createCausticTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) return null

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.globalCompositeOperation = 'lighter'

  const wash = context.createRadialGradient(112, 86, 8, 128, 128, 178)
  wash.addColorStop(0, 'rgb(255 255 255 / 0.18)')
  wash.addColorStop(0.32, 'rgb(125 211 252 / 0.09)')
  wash.addColorStop(0.68, 'rgb(167 139 250 / 0.045)')
  wash.addColorStop(1, 'rgb(255 255 255 / 0)')
  context.fillStyle = wash
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let index = 0; index < 18; index += 1) {
    const y = 24 + index * 12
    const alpha = 0.035 + (index % 4) * 0.012
    context.beginPath()
    context.moveTo(-24, y)
    context.bezierCurveTo(
      48 + (index % 3) * 18,
      y - 34,
      154 - (index % 5) * 12,
      y + 42,
      286,
      y + (index % 2 ? -22 : 18),
    )
    context.lineWidth = 1.2 + (index % 3) * 0.8
    context.strokeStyle = `rgb(255 255 255 / ${alpha})`
    context.stroke()
  }

  for (let index = 0; index < 9; index += 1) {
    const x = 22 + index * 28
    const gradient = context.createLinearGradient(x - 26, 0, x + 24, canvas.height)
    gradient.addColorStop(0, 'rgb(103 232 249 / 0)')
    gradient.addColorStop(0.5, 'rgb(255 255 255 / 0.08)')
    gradient.addColorStop(1, 'rgb(216 180 254 / 0)')
    context.fillStyle = gradient
    context.fillRect(x - 18, 0, 36, canvas.height)
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(1.2, 0.84)
  texture.needsUpdate = true

  return texture
}

export function createSheenTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (!context) return null

  const gradient = context.createLinearGradient(0, 0, canvas.width, 0)
  gradient.addColorStop(0, 'rgb(255 255 255 / 0)')
  gradient.addColorStop(0.34, 'rgb(103 232 249 / 0.04)')
  gradient.addColorStop(0.5, 'rgb(255 255 255 / 0.34)')
  gradient.addColorStop(0.66, 'rgb(167 139 250 / 0.07)')
  gradient.addColorStop(1, 'rgb(255 255 255 / 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true

  return texture
}
