/**
 * Visual Style Palettes for MEGAMEAL
 * 
 * Curated color palettes inspired by various visual aesthetics
 * for creating cohesive, stylized game visuals.
 */

import * as THREE from 'three'

export type StylePreset = 'site' | 'surreal-site' | 'ghibli' | 'alto' | 'monument' | 'retro'

export interface ColorPalette {
  // Environment colors
  sky: THREE.Color
  skyGradient: THREE.Color
  water: THREE.Color
  grass: THREE.Color
  earth: THREE.Color
  trees: THREE.Color
  flowers: THREE.Color
  
  // Dynamic elements
  fireflies: THREE.Color[]
  
  // Lighting
  ambient: THREE.Color
  sun: THREE.Color
  shadow: THREE.Color
  fog: THREE.Color
  
  // UI/Effects
  outline: THREE.Color
}

/**
 * Studio Ghibli inspired palette
 * Features warm, natural colors with high saturation
 */
export const ghibliPalette: ColorPalette = {
  sky: new THREE.Color('#87CEEB'),           // Sky blue
  skyGradient: new THREE.Color('#FFE5B4'),  // Peach sunset
  water: new THREE.Color('#4682B4'),        // Steel blue water
  grass: new THREE.Color('#9ACD32'),        // Yellow green grass
  earth: new THREE.Color('#D2B48C'),        // Tan earth
  trees: new THREE.Color('#228B22'),        // Forest green
  flowers: new THREE.Color('#FF69B4'),      // Hot pink flowers
  fireflies: [
    new THREE.Color('#FFD700'),             // Gold
    new THREE.Color('#FFAC33'),             // Orange gold
    new THREE.Color('#FF6347')              // Tomato red
  ],
  ambient: new THREE.Color('#E6E6FA'),      // Lavender ambient
  sun: new THREE.Color('#FFA500'),          // Orange sun
  shadow: new THREE.Color('#483D8B'),       // Dark slate blue shadows
  fog: new THREE.Color('#B0C4DE'),          // Light steel blue fog
  outline: new THREE.Color('#2F4F4F')       // Dark slate gray outlines
}

/**
 * Alto's Adventure inspired palette
 * Minimalist with soft, muted tones and gradient transitions
 */
export const altoPalette: ColorPalette = {
  sky: new THREE.Color('#F0E68C'),          // Khaki sky
  skyGradient: new THREE.Color('#DDA0DD'),  // Plum gradient
  water: new THREE.Color('#87CEEB'),        // Sky blue water
  grass: new THREE.Color('#98FB98'),        // Pale green grass
  earth: new THREE.Color('#F5DEB3'),        // Wheat earth
  trees: new THREE.Color('#8FBC8F'),        // Dark sea green trees
  flowers: new THREE.Color('#FFB6C1'),      // Light pink flowers
  fireflies: [
    new THREE.Color('#FFFF00'),             // Bright yellow
    new THREE.Color('#FFA500')              // Orange
  ],
  ambient: new THREE.Color('#FFF8DC'),      // Cornsilk ambient
  sun: new THREE.Color('#FFD700'),          // Gold sun
  shadow: new THREE.Color('#708090'),       // Slate gray shadows
  fog: new THREE.Color('#E0E0E0'),          // Light gray fog
  outline: new THREE.Color('#696969')       // Dim gray outlines
}

/**
 * Monument Valley inspired palette
 * Pastel, dreamlike colors with architectural feeling
 */
export const monumentPalette: ColorPalette = {
  sky: new THREE.Color('#E6E6FA'),          // Lavender sky
  skyGradient: new THREE.Color('#F0E68C'),  // Khaki gradient
  water: new THREE.Color('#B0E0E6'),        // Powder blue water
  grass: new THREE.Color('#90EE90'),        // Light green grass
  earth: new THREE.Color('#F5F5DC'),        // Beige earth
  trees: new THREE.Color('#8FBC8F'),        // Dark sea green trees
  flowers: new THREE.Color('#DDA0DD'),      // Plum flowers
  fireflies: [
    new THREE.Color('#FFFACD'),             // Lemon chiffon
    new THREE.Color('#F0E68C')              // Khaki
  ],
  ambient: new THREE.Color('#F8F8FF'),      // Ghost white ambient
  sun: new THREE.Color('#FFFACD'),          // Lemon chiffon sun
  shadow: new THREE.Color('#D3D3D3'),       // Light gray shadows
  fog: new THREE.Color('#F0F8FF'),          // Alice blue fog
  outline: new THREE.Color('#A9A9A9')       // Dark gray outlines
}

/**
 * Retro/Synthwave inspired palette
 * Bold, vibrant colors with 80s aesthetic
 */
export const retroPalette: ColorPalette = {
  sky: new THREE.Color('#FF6B6B'),          // Coral red sky
  skyGradient: new THREE.Color('#4ECDC4'),  // Medium turquoise gradient
  water: new THREE.Color('#45B7D1'),        // Bright blue water
  grass: new THREE.Color('#96CEB4'),        // Medium aquamarine grass
  earth: new THREE.Color('#FFEAA7'),        // Peach earth
  trees: new THREE.Color('#6C5CE7'),        // Medium slate blue trees
  flowers: new THREE.Color('#FD79A8'),      // Hot pink flowers
  fireflies: [
    new THREE.Color('#FDCB6E'),             // Orange yellow
    new THREE.Color('#E17055')              // Burnt orange
  ],
  ambient: new THREE.Color('#DDA0DD'),      // Plum ambient
  sun: new THREE.Color('#FDCB6E'),          // Orange yellow sun
  shadow: new THREE.Color('#2D3436'),       // Dark gray shadows
  fog: new THREE.Color('#B2BEC3'),          // Blue gray fog
  outline: new THREE.Color('#2D3436')       // Dark gray outlines
}

function blendColors(colorA: THREE.Color, colorB: THREE.Color, amount: number) {
  return colorA.clone().lerp(colorB, amount)
}

/**
 * Collection of all available palettes
 */
export const staticStylePalettes: Record<Exclude<StylePreset, 'site' | 'surreal-site'>, ColorPalette> = {
  ghibli: ghibliPalette,
  alto: altoPalette,
  monument: monumentPalette,
  retro: retroPalette
}

function cloneColor(color: THREE.Color) {
  return color.clone()
}

function clonePalette(palette: ColorPalette): ColorPalette {
  return {
    sky: cloneColor(palette.sky),
    skyGradient: cloneColor(palette.skyGradient),
    water: cloneColor(palette.water),
    grass: cloneColor(palette.grass),
    earth: cloneColor(palette.earth),
    trees: cloneColor(palette.trees),
    flowers: cloneColor(palette.flowers),
    fireflies: palette.fireflies.map(cloneColor),
    ambient: cloneColor(palette.ambient),
    sun: cloneColor(palette.sun),
    shadow: cloneColor(palette.shadow),
    fog: cloneColor(palette.fog),
    outline: cloneColor(palette.outline),
  }
}

function resolveCssColorValue(cssValue: string, fallback: THREE.Color): THREE.Color {
  if (typeof document === 'undefined') {
    return fallback.clone()
  }

  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      return fallback.clone()
    }

    context.clearRect(0, 0, 1, 1)
    context.fillStyle = cssValue
    context.fillRect(0, 0, 1, 1)

    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
    if (alpha === 0) {
      return fallback.clone()
    }

    return new THREE.Color(red / 255, green / 255, blue / 255)
  } catch (error) {
    console.warn('Failed to resolve CSS color value for palette:', cssValue, error)
    return fallback.clone()
  }
}

function getRootHue() {
  if (typeof document === 'undefined') return 210

  const rootStyles = getComputedStyle(document.documentElement)
  const parsedHue = Number.parseFloat(rootStyles.getPropertyValue('--hue').trim())
  return Number.isFinite(parsedHue) ? parsedHue : 210
}

export function createSitePalette(): ColorPalette {
  const hue = getRootHue()
  const darkMode =
    typeof document !== 'undefined'
    && (
      document.documentElement.classList.contains('dark')
      || window.matchMedia('(prefers-color-scheme: dark)').matches
    )

  const fallback = darkMode ? ghibliPalette : monumentPalette
  const backgroundL = darkMode ? 0.16 : 0.95
  const surfaceL = darkMode ? 0.23 : 0.98
  const accentL = darkMode ? 0.75 : 0.7

  return {
    sky: resolveCssColorValue(`oklch(${backgroundL} 0.018 ${hue})`, fallback.sky),
    skyGradient: resolveCssColorValue(`oklch(${darkMode ? 0.28 : 0.9} 0.035 ${hue})`, fallback.skyGradient),
    water: resolveCssColorValue(`oklch(${darkMode ? 0.42 : 0.68} 0.08 ${hue + 30})`, fallback.water),
    grass: resolveCssColorValue(`oklch(${darkMode ? 0.48 : 0.78} 0.07 ${hue + 55})`, fallback.grass),
    earth: resolveCssColorValue(`oklch(${surfaceL} 0.02 ${hue})`, fallback.earth),
    trees: resolveCssColorValue(`oklch(${darkMode ? 0.38 : 0.58} 0.06 ${hue + 38})`, fallback.trees),
    flowers: resolveCssColorValue(`oklch(${accentL} 0.12 ${hue + 12})`, fallback.flowers),
    fireflies: [
      resolveCssColorValue(`oklch(${darkMode ? 0.82 : 0.76} 0.16 ${hue + 58})`, fallback.fireflies[0]),
      resolveCssColorValue(`oklch(${darkMode ? 0.8 : 0.74} 0.14 ${hue + 35})`, fallback.fireflies[1]),
      resolveCssColorValue(`oklch(${darkMode ? 0.78 : 0.72} 0.13 ${hue + 20})`, fallback.fireflies[2] ?? fallback.fireflies[0]),
    ],
    ambient: resolveCssColorValue(`oklch(${darkMode ? 0.34 : 0.86} 0.03 ${hue})`, fallback.ambient),
    sun: resolveCssColorValue(`oklch(${darkMode ? 0.88 : 0.8} 0.1 ${hue + 30})`, fallback.sun),
    shadow: resolveCssColorValue(`oklch(${darkMode ? 0.12 : 0.42} 0.03 ${hue})`, fallback.shadow),
    fog: resolveCssColorValue(`oklch(${darkMode ? 0.28 : 0.9} 0.018 ${hue})`, fallback.fog),
    outline: resolveCssColorValue(`oklch(${darkMode ? 0.06 : 0.28} 0.015 ${hue})`, fallback.outline),
  }
}

export function createSurrealSitePalette(): ColorPalette {
  const sitePalette = createSitePalette()

  return {
    sky: blendColors(sitePalette.sky, new THREE.Color('#040817'), 0.82),
    skyGradient: blendColors(sitePalette.skyGradient, new THREE.Color('#22125f'), 0.72),
    water: blendColors(sitePalette.water, new THREE.Color('#1b5cae'), 0.55),
    grass: blendColors(sitePalette.grass, new THREE.Color('#30226d'), 0.66),
    earth: blendColors(sitePalette.earth, new THREE.Color('#0b1027'), 0.88),
    trees: blendColors(sitePalette.trees, new THREE.Color('#4d2dd2'), 0.58),
    flowers: blendColors(sitePalette.flowers, new THREE.Color('#ff4fd1'), 0.7),
    fireflies: [
      new THREE.Color('#64ecff'),
      new THREE.Color('#ff53d4'),
      new THREE.Color('#ffd76a'),
    ],
    ambient: blendColors(sitePalette.ambient, new THREE.Color('#4d39a6'), 0.64),
    sun: blendColors(sitePalette.sun, new THREE.Color('#5ce0ff'), 0.45),
    shadow: blendColors(sitePalette.shadow, new THREE.Color('#03040a'), 0.75),
    fog: blendColors(sitePalette.fog, new THREE.Color('#2b195a'), 0.68),
    outline: new THREE.Color('#02030a'),
  }
}

/**
 * Get palette by name
 */
export function getPalette(preset: StylePreset): ColorPalette {
  if (preset === 'site') {
    return createSitePalette()
  }

  if (preset === 'surreal-site') {
    return createSurrealSitePalette()
  }

  return clonePalette(staticStylePalettes[preset] || ghibliPalette)
}

/**
 * Convert hex color to THREE.Color
 */
export function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

/**
 * Create gradient texture from two colors
 */
export function createGradientTexture(
  color1: THREE.Color, 
  color2: THREE.Color, 
  width = 256, 
  height = 1
): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  
  const context = canvas.getContext('2d')!
  const gradient = context.createLinearGradient(0, 0, width, 0)
  
  gradient.addColorStop(0, `#${color1.getHexString()}`)
  gradient.addColorStop(1, `#${color2.getHexString()}`)
  
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  
  return texture
}

/**
 * Create toon shading gradient map
 */
export function createToonGradientMap(shadowColor: THREE.Color, lightColor: THREE.Color): THREE.Texture {
  const colors = new Uint8Array([
    // Dark shadow
    Math.floor(shadowColor.r * 255),
    Math.floor(shadowColor.g * 255),
    Math.floor(shadowColor.b * 255),
    // Mid tone
    Math.floor((shadowColor.r + lightColor.r) * 0.5 * 255),
    Math.floor((shadowColor.g + lightColor.g) * 0.5 * 255),
    Math.floor((shadowColor.b + lightColor.b) * 0.5 * 255),
    // Bright light
    Math.floor(lightColor.r * 255),
    Math.floor(lightColor.g * 255),
    Math.floor(lightColor.b * 255)
  ])
  
  const gradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RGBFormat)
  gradientMap.needsUpdate = true
  gradientMap.magFilter = THREE.NearestFilter
  gradientMap.minFilter = THREE.NearestFilter
  
  return gradientMap
}

/**
 * Material configuration for different object types
 */
export interface MaterialConfig {
  roughness?: number
  metalness?: number
  transparent?: boolean
  opacity?: number
  gradientSteps?: number
}

export const materialConfigs: Record<string, MaterialConfig> = {
  vegetation: {
    roughness: 0.8,
    metalness: 0.0,
    transparent: false,
    gradientSteps: 3
  },
  water: {
    roughness: 0.1,
    metalness: 0.0,
    transparent: true,
    opacity: 0.8,
    gradientSteps: 4
  },
  terrain: {
    roughness: 0.9,
    metalness: 0.0,
    transparent: false,
    gradientSteps: 3
  },
  particles: {
    roughness: 0.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.9,
    gradientSteps: 2
  }
}

/**
 * Get material config by type
 */
export function getMaterialConfig(type: string): MaterialConfig {
  return materialConfigs[type] || materialConfigs.terrain
}

/**
 * Calculate color distance using RGB values
 */
function calculateColorDistance(color1: THREE.Color, color2: THREE.Color): number {
  const deltaR = color1.r - color2.r
  const deltaG = color1.g - color2.g
  const deltaB = color1.b - color2.b
  return Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB)
}

/**
 * Find closest palette color to a given color
 */
export function findClosestPaletteColor(targetColor: THREE.Color | any, palette: ColorPalette): THREE.Color {
  // Ensure we have a valid target color - convert if needed
  let validTargetColor: THREE.Color
  
  if (!targetColor) {
    return palette.earth
  }
  
  if (targetColor instanceof THREE.Color) {
    validTargetColor = targetColor
  } else {
    // Try to convert to THREE.Color
    try {
      validTargetColor = new THREE.Color(targetColor)
    } catch (error) {
      console.warn('Could not convert target color to THREE.Color:', targetColor, error)
      return palette.earth
    }
  }
  
  let closestColor = palette.earth
  let minDistance = Infinity
  
  // Check all single colors in palette
  const paletteColors = [
    palette.sky, palette.skyGradient, palette.water, palette.grass,
    palette.earth, palette.trees, palette.flowers, palette.ambient,
    palette.sun, palette.shadow, palette.fog, palette.outline
  ]
  
  paletteColors.forEach(paletteColor => {
    if (paletteColor && paletteColor instanceof THREE.Color) {
      try {
        const distance = calculateColorDistance(validTargetColor, paletteColor)
        if (distance < minDistance) {
          minDistance = distance
          closestColor = paletteColor
        }
      } catch (error) {
        console.warn('Error calculating color distance:', error)
      }
    }
  })
  
  // Also check firefly colors
  if (palette.fireflies && Array.isArray(palette.fireflies)) {
    palette.fireflies.forEach(fireflyColor => {
      if (fireflyColor && fireflyColor instanceof THREE.Color) {
        try {
          const distance = calculateColorDistance(validTargetColor, fireflyColor)
          if (distance < minDistance) {
            minDistance = distance
            closestColor = fireflyColor
          }
        } catch (error) {
          console.warn('Error calculating firefly color distance:', error)
        }
      }
    })
  }
  
  return closestColor
}
