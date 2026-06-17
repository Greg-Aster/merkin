import { configureGeneratedCanvasTexture } from '@/utils/threeTextureUtils'
import { CanvasTexture } from 'three'

type ScreenTextTextureOptions = {
  kicker?: string
  title?: string
  stat?: string
  ctaLabel?: string
}

type ScreenInfoTickerOptions = ScreenTextTextureOptions & {
  description?: string
  time: number
}

const retroComputerTextOpacity = 0.74
const retroComputerTextScale = 2

const retroComputerGlyphs: Record<string, readonly string[]> = {
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
  '!': ['010', '010', '010', '010', '010', '000', '010'],
  '"': ['101', '101', '101', '000', '000', '000', '000'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  "'": ['010', '010', '010', '000', '000', '000', '000'],
  '(': ['001', '010', '100', '100', '100', '010', '001'],
  ')': ['100', '010', '001', '001', '001', '010', '100'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  ',': ['000', '000', '000', '000', '000', '010', '100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['000', '000', '000', '000', '000', '000', '010'],
  '/': ['00001', '00010', '00100', '01000', '10000', '00000', '00000'],
  ':': ['000', '010', '000', '000', '000', '010', '000'],
  ';': ['000', '010', '000', '000', '000', '010', '100'],
  '>': ['10000', '01000', '00100', '00010', '00100', '01000', '10000'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  _: ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
}

function wrapMeasuredText(
  value: string,
  maxWidth: number,
  measureText: (line: string) => number,
) {
  const words = value.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  words.forEach(word => {
    const nextLine = line ? `${line} ${word}` : word
    if (measureText(nextLine) <= maxWidth || !line) {
      line = nextLine
      return
    }

    lines.push(line)
    line = word
  })

  if (line) lines.push(line)
  return lines
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) {
  return wrapMeasuredText(
    value,
    maxWidth,
    line => context.measureText(line).width,
  )
}

function measureRetroComputerText(
  value: string,
  scale = retroComputerTextScale,
) {
  return Array.from(value.toUpperCase()).reduce((width, character, index) => {
    const glyph = retroComputerGlyphs[character] ?? retroComputerGlyphs['?']
    const glyphWidth = glyph[0]?.length ?? 5
    const spacing = index === 0 ? 0 : scale

    return width + spacing + glyphWidth * scale
  }, 0)
}

function wrapRetroComputerText(
  value: string,
  maxWidth: number,
  scale = retroComputerTextScale,
) {
  return wrapMeasuredText(
    value,
    maxWidth,
    line => measureRetroComputerText(line, scale),
  )
}

function drawRetroComputerText(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  scale = retroComputerTextScale,
) {
  let cursorX = x

  context.fillStyle = color
  Array.from(value.toUpperCase()).forEach(character => {
    const glyph = retroComputerGlyphs[character] ?? retroComputerGlyphs['?']
    glyph.forEach((row, rowIndex) => {
      Array.from(row).forEach((pixel, columnIndex) => {
        if (pixel !== '1') return

        context.fillRect(
          Math.round(cursorX + columnIndex * scale),
          Math.round(y + rowIndex * scale),
          scale,
          scale,
        )
      })
    })

    cursorX += ((glyph[0]?.length ?? 5) + 1) * scale
  })
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

export function createScreenInfoTickerTextureController(
  frameInterval = 1 / 24,
) {
  let canvas: HTMLCanvasElement | null = null
  let context: CanvasRenderingContext2D | null = null
  let texture: CanvasTexture | null = null
  let lastUpdateAt = 0

  function ensureTexture() {
    if (texture || typeof document === 'undefined') return

    canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    context = canvas.getContext('2d', {
      alpha: true,
      willReadFrequently: false,
    })

    if (!context) {
      canvas = null
      return
    }

    context.imageSmoothingEnabled = false
    texture = configureGeneratedCanvasTexture(new CanvasTexture(canvas))
  }

  function drawTerminalLine(
    value: string,
    x: number,
    y: number,
    color = 'rgba(224, 242, 254, 0.9)',
  ) {
    if (!context) return

    context.save()
    context.globalAlpha = retroComputerTextOpacity
    context.shadowColor = 'rgba(34, 211, 238, 0.4)'
    context.shadowBlur = 8
    drawRetroComputerText(context, value, x, y, color)
    context.shadowBlur = 0
    context.restore()
  }

  function update({
    ctaLabel = '',
    description = '',
    kicker = '',
    stat = '',
    time,
    title = '',
  }: ScreenInfoTickerOptions) {
    ensureTexture()
    if (!canvas || !context || !texture) return texture
    if (time - lastUpdateAt < frameInterval) return texture

    const ctx = context
    const { width, height } = canvas
    const header = (kicker || 'PORTAL NODE').toUpperCase()
    const sectionTitle = (title || 'MEGA MEAL SAGA').toUpperCase()
    const status = (stat || 'Signal available').toUpperCase()
    const route = (ctaLabel || 'Inspect section').toUpperCase()
    const brief =
      description ||
      'Supplemental section information is available from this portal destination.'

    ctx.clearRect(0, 0, width, height)

    ctx.textBaseline = 'top'
    drawTerminalLine(`// ${header}`, 48, 54, 'rgba(103, 232, 249, 0.92)')

    const briefLines = wrapRetroComputerText(brief.toUpperCase(), 850).slice(
      0,
      5,
    )
    const terminalLines = [
      `> CONNECT ${sectionTitle}`,
      `> LOAD SECTION_BRIEF`,
      `  STATUS: ${status}`,
      `  ROUTE: ${route}`,
      ...briefLines.map(line => `  ${line}`),
      '> INDEX READY',
      '> AWAITING USER INPUT_',
    ]

    const terminalTop = 104
    const lineHeight = 46
    const terminalHeight = 344
    const feedSpan = terminalLines.length * lineHeight
    const scrollOffset = (time * 42) % feedSpan

    ctx.save()
    ctx.beginPath()
    ctx.rect(48, terminalTop, 928, terminalHeight)
    ctx.clip()
    for (
      let blockY = terminalTop - scrollOffset;
      blockY < terminalTop + terminalHeight;
      blockY += feedSpan
    ) {
      terminalLines.forEach((line, index) => {
        const lineY = blockY + index * lineHeight
        if (
          lineY < terminalTop - lineHeight ||
          lineY > terminalTop + terminalHeight
        ) {
          return
        }

        const isCommand = line.startsWith('>')
        const isMeta =
          line.trim().startsWith('STATUS') || line.trim().startsWith('ROUTE')
        const color = isCommand
          ? 'rgba(103, 232, 249, 0.92)'
          : isMeta
            ? 'rgba(251, 191, 36, 0.82)'
            : 'rgba(224, 242, 254, 0.88)'
        drawTerminalLine(line, 56, lineY, color)
      })
    }
    ctx.restore()

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
