import * as THREE from 'three'

type RepeatTuple = [number, number]

export interface ProceduralTextureBundle {
  map: THREE.DataTexture
  roughnessMap: THREE.DataTexture
  bumpMap: THREE.DataTexture
}

interface BaseTextureOptions {
  size?: number
  seed?: number
  repeat?: RepeatTuple
}

interface ColorTextureOptions extends BaseTextureOptions {
  baseColor: string
  detailColor?: string
  accentColor?: string
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function applyTextureSettings(texture: THREE.DataTexture, repeat: RepeatTuple, isColorTexture: boolean) {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat[0], repeat[1])
  texture.type = THREE.UnsignedByteType
  texture.needsUpdate = true

  if (isColorTexture) {
    texture.colorSpace = THREE.SRGBColorSpace
  }

  return texture
}

function createRgbaTexture(size: number, fillPixel: (x: number, y: number, index: number, data: Uint8Array) => void) {
  const data = new Uint8Array(size * size * 4)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4
      fillPixel(x, y, index, data)
    }
  }

  return new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
}

function paintColor(data: Uint8Array, index: number, color: THREE.Color, brightness = 1) {
  data[index] = clampByte(color.r * 255 * brightness)
  data[index + 1] = clampByte(color.g * 255 * brightness)
  data[index + 2] = clampByte(color.b * 255 * brightness)
  data[index + 3] = 255
}

function paintGray(data: Uint8Array, index: number, value: number) {
  const byte = clampByte(value)
  data[index] = byte
  data[index + 1] = byte
  data[index + 2] = byte
  data[index + 3] = 255
}

export function createTechPanelTextureBundle(options: ColorTextureOptions): ProceduralTextureBundle {
  const size = options.size ?? 256
  const repeat = options.repeat ?? [2, 2]
  const random = createSeededRandom(options.seed ?? 7)
  const baseColor = new THREE.Color(options.baseColor)
  const detailColor = new THREE.Color(options.detailColor ?? '#0f1f2b')
  const accentColor = new THREE.Color(options.accentColor ?? '#3e8db1')

  const map = createRgbaTexture(size, (x, y, index, data) => {
    const largePanel = x % 64 === 0 || y % 64 === 0
    const mediumPanel = x % 32 === 0 || y % 32 === 0
    const ventBand = y % 64 > 10 && y % 64 < 16 && x % 48 > 8 && x % 48 < 40
    const accentBand = x % 64 > 50 && x % 64 < 55
    const noise = (random() - 0.5) * 0.08

    let color = baseColor.clone().offsetHSL(0, 0, noise)

    if (largePanel) color.lerp(detailColor, 0.75)
    else if (mediumPanel) color.lerp(detailColor, 0.35)
    else if (ventBand) color.lerp(detailColor, 0.55)
    else if (accentBand) color.lerp(accentColor, 0.55)

    paintColor(data, index, color)
  })

  const roughnessMap = createRgbaTexture(size, (x, y, index, data) => {
    const seam = x % 64 < 2 || y % 64 < 2
    const plate = x % 32 < 2 || y % 32 < 2
    const ventBand = y % 64 > 10 && y % 64 < 16 && x % 48 > 8 && x % 48 < 40
    const noise = (random() - 0.5) * 18
    let value = 184 + noise

    if (seam) value = 120 + noise
    else if (plate) value = 150 + noise
    else if (ventBand) value = 215 + noise

    paintGray(data, index, value)
  })

  const bumpMap = createRgbaTexture(size, (x, y, index, data) => {
    const seam = x % 64 < 2 || y % 64 < 2
    const plate = x % 32 < 2 || y % 32 < 2
    const ventBand = y % 64 > 10 && y % 64 < 16 && x % 48 > 8 && x % 48 < 40
    const accentBand = x % 64 > 50 && x % 64 < 55
    let value = 118

    if (seam) value = 72
    else if (plate) value = 104
    else if (ventBand) value = 150
    else if (accentBand) value = 136

    paintGray(data, index, value)
  })

  return {
    map: applyTextureSettings(map, repeat, true),
    roughnessMap: applyTextureSettings(roughnessMap, repeat, false),
    bumpMap: applyTextureSettings(bumpMap, repeat, false)
  }
}

export function createFloorTileTextureBundle(options: ColorTextureOptions): ProceduralTextureBundle {
  const size = options.size ?? 256
  const repeat = options.repeat ?? [4, 4]
  const random = createSeededRandom(options.seed ?? 11)
  const baseColor = new THREE.Color(options.baseColor)
  const groutColor = new THREE.Color(options.detailColor ?? '#16222d')
  const accentColor = new THREE.Color(options.accentColor ?? '#6fb9d1')

  const map = createRgbaTexture(size, (x, y, index, data) => {
    const tile = x % 48 === 0 || y % 48 === 0
    const smallTile = x % 24 === 0 || y % 24 === 0
    const cautionInset = x % 96 > 60 && x % 96 < 72 && y % 96 > 12 && y % 96 < 36
    const noise = (random() - 0.5) * 0.1

    let color = baseColor.clone().offsetHSL(0, 0, noise)

    if (tile) color.lerp(groutColor, 0.7)
    else if (smallTile) color.lerp(groutColor, 0.25)
    if (cautionInset) color.lerp(accentColor, 0.35)

    paintColor(data, index, color)
  })

  const roughnessMap = createRgbaTexture(size, (x, y, index, data) => {
    const tile = x % 48 < 2 || y % 48 < 2
    const smallTile = x % 24 < 1 || y % 24 < 1
    const noise = (random() - 0.5) * 12
    let value = 178 + noise
    if (tile) value = 220 + noise
    else if (smallTile) value = 196 + noise
    paintGray(data, index, value)
  })

  const bumpMap = createRgbaTexture(size, (x, y, index, data) => {
    const tile = x % 48 < 2 || y % 48 < 2
    const smallTile = x % 24 < 1 || y % 24 < 1
    let value = 124
    if (tile) value = 72
    else if (smallTile) value = 96
    paintGray(data, index, value)
  })

  return {
    map: applyTextureSettings(map, repeat, true),
    roughnessMap: applyTextureSettings(roughnessMap, repeat, false),
    bumpMap: applyTextureSettings(bumpMap, repeat, false)
  }
}

export function createStoneTextureBundle(options: ColorTextureOptions): ProceduralTextureBundle {
  const size = options.size ?? 256
  const repeat = options.repeat ?? [2, 2]
  const random = createSeededRandom(options.seed ?? 17)
  const baseColor = new THREE.Color(options.baseColor)
  const crackColor = new THREE.Color(options.detailColor ?? '#1b2430')
  const weatherColor = new THREE.Color(options.accentColor ?? '#7a8e9f')

  const map = createRgbaTexture(size, (x, y, index, data) => {
    const block = x % 72 < 3 || y % 72 < 3
    const fracture = (x + y) % 53 < 2 || (x - y + size) % 67 < 2
    const noise = (random() - 0.5) * 0.14

    let color = baseColor.clone().offsetHSL(0, 0, noise)
    if (block) color.lerp(crackColor, 0.42)
    else if (fracture) color.lerp(weatherColor, 0.35)

    paintColor(data, index, color)
  })

  const roughnessMap = createRgbaTexture(size, (x, y, index, data) => {
    const fracture = (x + y) % 53 < 2 || (x - y + size) % 67 < 2
    const noise = (random() - 0.5) * 20
    let value = 208 + noise
    if (fracture) value = 238 + noise
    paintGray(data, index, value)
  })

  const bumpMap = createRgbaTexture(size, (x, y, index, data) => {
    const block = x % 72 < 3 || y % 72 < 3
    const fracture = (x + y) % 53 < 2 || (x - y + size) % 67 < 2
    let value = 128
    if (block) value = 84
    else if (fracture) value = 154
    paintGray(data, index, value)
  })

  return {
    map: applyTextureSettings(map, repeat, true),
    roughnessMap: applyTextureSettings(roughnessMap, repeat, false),
    bumpMap: applyTextureSettings(bumpMap, repeat, false)
  }
}

export function createWoodTextureBundle(options: ColorTextureOptions): ProceduralTextureBundle {
  const size = options.size ?? 256
  const repeat = options.repeat ?? [3, 2]
  const random = createSeededRandom(options.seed ?? 23)
  const baseColor = new THREE.Color(options.baseColor)
  const grainColor = new THREE.Color(options.detailColor ?? '#2f2316')
  const highlightColor = new THREE.Color(options.accentColor ?? '#7d5a34')

  const map = createRgbaTexture(size, (x, y, index, data) => {
    const grain = Math.sin((x / size) * Math.PI * 18 + y * 0.02) * 0.08
    const plank = x % 86 < 3
    const knot = ((x - 60) ** 2 + (y - 120) ** 2) < 180
    let color = baseColor.clone().offsetHSL(0, 0, grain + (random() - 0.5) * 0.05)

    if (plank) color.lerp(grainColor, 0.6)
    else if (knot) color.lerp(highlightColor, 0.4)

    paintColor(data, index, color)
  })

  const roughnessMap = createRgbaTexture(size, (x, y, index, data) => {
    const grain = Math.sin((x / size) * Math.PI * 18 + y * 0.02) * 12
    let value = 196 + grain
    if (x % 86 < 3) value = 228
    paintGray(data, index, value)
  })

  const bumpMap = createRgbaTexture(size, (x, y, index, data) => {
    const grain = Math.sin((x / size) * Math.PI * 20 + y * 0.025) * 24
    paintGray(data, index, 124 + grain)
  })

  return {
    map: applyTextureSettings(map, repeat, true),
    roughnessMap: applyTextureSettings(roughnessMap, repeat, false),
    bumpMap: applyTextureSettings(bumpMap, repeat, false)
  }
}

export function createRustTextureBundle(options: ColorTextureOptions): ProceduralTextureBundle {
  const size = options.size ?? 256
  const repeat = options.repeat ?? [2, 2]
  const random = createSeededRandom(options.seed ?? 31)
  const baseColor = new THREE.Color(options.baseColor)
  const oxideColor = new THREE.Color(options.detailColor ?? '#463225')
  const dustColor = new THREE.Color(options.accentColor ?? '#86755f')

  const map = createRgbaTexture(size, (x, y, index, data) => {
    const patch = ((x - 96) ** 2 + (y - 120) ** 2) < 2200 || ((x - 180) ** 2 + (y - 56) ** 2) < 1500
    const streak = (x + y) % 51 < 2
    let color = baseColor.clone().offsetHSL(0, 0, (random() - 0.5) * 0.12)

    if (patch) color.lerp(oxideColor, 0.55)
    if (streak) color.lerp(dustColor, 0.3)

    paintColor(data, index, color)
  })

  const roughnessMap = createRgbaTexture(size, (x, y, index, data) => {
    const patch = ((x - 96) ** 2 + (y - 120) ** 2) < 2200 || ((x - 180) ** 2 + (y - 56) ** 2) < 1500
    let value = 214 + (random() - 0.5) * 16
    if (patch) value = 236 + (random() - 0.5) * 12
    paintGray(data, index, value)
  })

  const bumpMap = createRgbaTexture(size, (x, y, index, data) => {
    const patch = ((x - 96) ** 2 + (y - 120) ** 2) < 2200 || ((x - 180) ** 2 + (y - 56) ** 2) < 1500
    const streak = (x + y) % 51 < 2
    let value = 124
    if (patch) value = 154
    if (streak) value = 98
    paintGray(data, index, value)
  })

  return {
    map: applyTextureSettings(map, repeat, true),
    roughnessMap: applyTextureSettings(roughnessMap, repeat, false),
    bumpMap: applyTextureSettings(bumpMap, repeat, false)
  }
}

export function createScreenTexture(options: ColorTextureOptions & { repeat?: RepeatTuple }) {
  const size = options.size ?? 256
  const repeat = options.repeat ?? [1, 1]
  const random = createSeededRandom(options.seed ?? 41)
  const baseColor = new THREE.Color(options.baseColor)
  const accentColor = new THREE.Color(options.accentColor ?? '#76d8ff')
  const detailColor = new THREE.Color(options.detailColor ?? '#09263f')

  const map = createRgbaTexture(size, (x, y, index, data) => {
    const scanline = y % 6 === 0
    const graphBand = y > 56 && y < 80 && x % 22 < 12
    const hudBand = y > 142 && y < 154
    let color = baseColor.clone().lerp(accentColor, 0.2 + Math.sin(x * 0.05) * 0.08)

    if (scanline) color.lerp(detailColor, 0.32)
    if (graphBand || hudBand) color.lerp(accentColor, 0.5)
    color.offsetHSL(0, 0, (random() - 0.5) * 0.04)

    paintColor(data, index, color)
  })

  return applyTextureSettings(map, repeat, true)
}

export function disposeProceduralTextureBundle(bundle: ProceduralTextureBundle) {
  bundle.map.dispose()
  bundle.roughnessMap.dispose()
  bundle.bumpMap.dispose()
}
