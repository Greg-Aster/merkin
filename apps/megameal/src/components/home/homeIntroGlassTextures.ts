import {
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

export function createFrostTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const context = canvas.getContext('2d')
  if (!context) return null

  const imageData = context.createImageData(canvas.width, canvas.height)
  for (let index = 0; index < imageData.data.length; index += 4) {
    const grain = 138 + Math.random() * 92
    const veil = Math.random() > 0.72 ? 255 : grain
    imageData.data[index] = veil
    imageData.data[index + 1] = Math.min(255, veil + 10)
    imageData.data[index + 2] = Math.min(255, veil + 18)
    imageData.data[index + 3] = 68 + Math.random() * 76
  }
  context.putImageData(imageData, 0, 0)

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, 'rgb(255 255 255 / 0.22)')
  gradient.addColorStop(0.48, 'rgb(255 255 255 / 0.035)')
  gradient.addColorStop(1, 'rgb(255 255 255 / 0.14)')
  context.globalCompositeOperation = 'screen'
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(2.5, 1.6)
  texture.needsUpdate = true

  return texture
}
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

export function createGrimeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) return null

  context.clearRect(0, 0, canvas.width, canvas.height)

  for (let index = 0; index < 520; index += 1) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const radius = 0.35 + Math.random() * 1.8
    const alpha = 0.018 + Math.random() * 0.075

    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fillStyle = `rgb(15 23 42 / ${alpha})`
    context.fill()
  }

  for (let index = 0; index < 28; index += 1) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const length = 18 + Math.random() * 92
    const angle = -0.75 + Math.random() * 1.5
    const alpha = 0.026 + Math.random() * 0.052

    context.save()
    context.translate(x, y)
    context.rotate(angle)
    context.beginPath()
    context.moveTo(-length * 0.5, 0)
    context.lineTo(length * 0.5, Math.random() * 2 - 1)
    context.lineWidth = 0.45 + Math.random() * 0.7
    context.strokeStyle = `rgb(226 232 240 / ${alpha})`
    context.stroke()
    context.restore()
  }

  for (let index = 0; index < 12; index += 1) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const radius = 18 + Math.random() * 54
    const smudge = context.createRadialGradient(x, y, 0, x, y, radius)
    smudge.addColorStop(0, 'rgb(15 23 42 / 0.055)')
    smudge.addColorStop(0.58, 'rgb(15 23 42 / 0.018)')
    smudge.addColorStop(1, 'rgb(15 23 42 / 0)')
    context.fillStyle = smudge
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(1.35, 0.9)
  texture.needsUpdate = true

  return texture
}
