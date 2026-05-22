import { CanvasTexture } from 'three'
import { configureGeneratedCanvasTexture } from '@/utils/threeTextureUtils'

type ScreenTextTextureOptions = {
  kicker?: string
  title?: string
  stat?: string
  ctaLabel?: string
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) {
  const words = value.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  words.forEach(word => {
    const nextLine = line ? `${line} ${word}` : word
    if (context.measureText(nextLine).width <= maxWidth || !line) {
      line = nextLine
      return
    }

    lines.push(line)
    line = word
  })

  if (line) lines.push(line)
  return lines
}

export function createScreenTextTexture({
  kicker = '',
  title = '',
  stat = '',
  ctaLabel = '',
}: ScreenTextTextureOptions) {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) return null

  context.clearRect(0, 0, canvas.width, canvas.height)

  const maxWidth = 820
  const x = 92
  let y = 120

  const textPlateGradient = context.createLinearGradient(48, 0, 928, 0)
  textPlateGradient.addColorStop(0, 'rgba(2, 6, 23, 0.86)')
  textPlateGradient.addColorStop(0.56, 'rgba(2, 6, 23, 0.72)')
  textPlateGradient.addColorStop(0.84, 'rgba(2, 6, 23, 0.22)')
  textPlateGradient.addColorStop(1, 'rgba(2, 6, 23, 0)')
  context.fillStyle = textPlateGradient
  context.fillRect(56, 84, 900, 330)
  context.fillStyle = 'rgba(8, 47, 73, 0.34)'
  context.fillRect(56, 174, 840, 112)

  context.textBaseline = 'top'
  context.lineJoin = 'round'
  context.fillStyle = 'rgb(103 232 249 / 0.86)'
  context.strokeStyle = 'rgb(2 6 23 / 0.92)'
  context.lineWidth = 5
  context.font = '700 28px "JetBrains Mono", ui-monospace, monospace'
  const kickerText = (kicker || stat || 'PORTAL').toUpperCase()
  context.strokeText(kickerText, x, y)
  context.fillText(kickerText, x, y)

  y += 54
  context.fillStyle = 'rgb(248 250 252 / 0.96)'
  context.strokeStyle = 'rgb(2 6 23 / 0.96)'
  context.lineWidth = 9
  context.shadowColor = 'rgb(2 6 23 / 0.82)'
  context.shadowBlur = 24
  context.font = '800 76px Inter, ui-sans-serif, system-ui, sans-serif'

  wrapCanvasText(context, title || 'MEGA MEAL SAGA', maxWidth)
    .slice(0, 2)
    .forEach(line => {
      context.strokeText(line, x, y)
      context.fillText(line, x, y)
      y += 82
    })

  context.shadowBlur = 0
  context.fillStyle = 'rgb(226 232 240 / 0.78)'
  context.strokeStyle = 'rgb(2 6 23 / 0.92)'
  context.lineWidth = 5
  context.font = '600 24px "JetBrains Mono", ui-monospace, monospace'
  const detail = stat || ctaLabel
  if (detail) {
    const detailText = detail.toUpperCase()
    context.strokeText(detailText, x, 372)
    context.fillText(detailText, x, 372)
  }

  if (ctaLabel) {
    const label = ctaLabel.toUpperCase()
    const buttonWidth = Math.min(420, context.measureText(label).width + 66)
    context.fillStyle = 'rgb(15 23 42 / 0.78)'
    context.fillRect(x, 420, buttonWidth, 52)
    context.strokeStyle = 'rgb(103 232 249 / 0.72)'
    context.lineWidth = 2
    context.strokeRect(x, 420, buttonWidth, 52)
    context.fillStyle = 'rgb(224 242 254 / 0.94)'
    context.strokeStyle = 'rgb(2 6 23 / 0.86)'
    context.lineWidth = 4
    context.font = '800 24px "JetBrains Mono", ui-monospace, monospace'
    context.strokeText(label, x + 28, 434)
    context.fillText(label, x + 28, 434)
  }

  const texture = configureGeneratedCanvasTexture(new CanvasTexture(canvas))

  return texture
}

export function createTextMediaBlurTextureController(frameInterval = 1 / 24) {
  let canvas: HTMLCanvasElement | null = null
  let context: CanvasRenderingContext2D | null = null
  let texture: CanvasTexture | null = null
  let lastUpdateAt = 0

  function ensureTexture() {
    if (texture || typeof document === 'undefined') return

    canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 288
    context = canvas.getContext('2d', {
      alpha: true,
      willReadFrequently: false,
    })

    if (!context) {
      canvas = null
      return
    }

    texture = configureGeneratedCanvasTexture(new CanvasTexture(canvas))
  }

  function update(time: number, video: HTMLVideoElement | null, opacity: number, enabled: boolean) {
    if (
      !enabled ||
      opacity <= 0.01 ||
      !video ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      return texture
    }

    if (time - lastUpdateAt < frameInterval) return texture
    ensureTexture()
    if (!canvas || !context || !texture) return texture

    const { width, height } = canvas
    const blurOverscanX = 34
    const blurOverscanY = 22

    context.clearRect(0, 0, width, height)
    context.save()
    context.filter = 'blur(12px) saturate(0.9) brightness(0.74) contrast(1.04)'

    try {
      context.drawImage(
        video,
        -blurOverscanX,
        -blurOverscanY,
        width + blurOverscanX * 2,
        height + blurOverscanY * 2,
      )
    } catch {
      context.restore()
      return texture
    }

    context.restore()

    const shadowGradient = context.createLinearGradient(0, 0, width, 0)
    shadowGradient.addColorStop(0, 'rgb(2 6 23 / 0.62)')
    shadowGradient.addColorStop(0.64, 'rgb(2 6 23 / 0.42)')
    shadowGradient.addColorStop(1, 'rgb(2 6 23 / 0.16)')
    context.fillStyle = shadowGradient
    context.fillRect(0, 0, width, height)

    texture.needsUpdate = true
    lastUpdateAt = time
    return texture
  }

  function dispose() {
    texture?.dispose()
    texture = null
    canvas = null
    context = null
    lastUpdateAt = 0
  }

  return {
    dispose,
    update,
  }
}
