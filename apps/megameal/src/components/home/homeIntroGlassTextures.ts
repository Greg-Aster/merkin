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

export function createFrostedScrimTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) return null

  context.clearRect(0, 0, canvas.width, canvas.height)

  const base = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  base.addColorStop(0, 'rgb(219 234 254 / 0.16)')
  base.addColorStop(0.42, 'rgb(125 211 252 / 0.08)')
  base.addColorStop(0.72, 'rgb(167 139 250 / 0.06)')
  base.addColorStop(1, 'rgb(255 255 255 / 0.02)')
  context.fillStyle = base
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.save()
  context.filter = 'blur(18px)'
  context.globalCompositeOperation = 'lighter'

  for (let index = 0; index < 14; index += 1) {
    const x = 28 + ((index * 79) % 520)
    const y = 18 + ((index * 47) % 250)
    const radiusX = 72 + (index % 5) * 22
    const radiusY = 22 + (index % 4) * 13
    const alpha = 0.045 + (index % 3) * 0.016
    const glow = context.createRadialGradient(x, y, 0, x, y, radiusX)
    glow.addColorStop(0, `rgb(255 255 255 / ${alpha})`)
    glow.addColorStop(0.54, `rgb(125 211 252 / ${alpha * 0.52})`)
    glow.addColorStop(1, 'rgb(255 255 255 / 0)')

    context.save()
    context.translate(x, y)
    context.rotate((index % 6 - 2.5) * 0.18)
    context.scale(1, radiusY / radiusX)
    context.fillStyle = glow
    context.beginPath()
    context.arc(0, 0, radiusX, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }

  context.restore()
  context.globalCompositeOperation = 'source-over'

  for (let index = 0; index < 900; index += 1) {
    const x = (index * 131) % canvas.width
    const y = (index * 197) % canvas.height
    const alpha = 0.012 + ((index * 17) % 7) * 0.002
    context.fillStyle = `rgb(255 255 255 / ${alpha})`
    context.fillRect(x, y, 1, 1)
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(1.04, 1.18)
  texture.needsUpdate = true

  return texture
}
