/**
 * Modern OptimizationManager for Threlte-based systems
 * Clean, focused implementation for device-aware performance optimization
 */

import { runtimeDebugLog } from '../../utils/runtimeLog'

export enum OptimizationLevel {
  ULTRA_LOW = 'ultra_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

export interface DeviceCapabilities {
  isMobile: boolean
  isLowEnd: boolean
  screenSize: { width: number; height: number }
  pixelRatio: number
  estimatedGPUTier: 'low' | 'medium' | 'high' | 'ultra'
  supportsWebGL2: boolean
  deviceMemory?: number
  hardwareConcurrency: number
  maxTextureSize: number
  deviceType: 'phone' | 'tablet' | 'desktop' | 'unknown'
}

export interface QualitySettings {
  // Rendering
  canvasScale: number
  enablePostProcessing: boolean
  enableShadows: boolean
  enableDynamicLighting: boolean
  shadowMapSize: number // 0 = shadows disabled; otherwise shadow map resolution in px

  // Textures
  textureResolution: number
  enableProceduralTextures: boolean
  enableNormalMaps: boolean

  // Effects
  enableReflections: boolean
  enableRefractions: boolean
  enableVegetation: boolean

  // Performance limits
  maxFireflyLights: number
  maxVegetationInstances: number
}

export interface RuntimeProfileOverride {
  id?: string | null
  targetClass?: string | null
  platformProfile?: string | null
  expectedRuntimeTier?: string | null
  runtimeAssetTier?: string | null
}

declare global {
  interface Window {
    __gameRuntimeProfile?: RuntimeProfileOverride
  }
}

export class OptimizationManager {
  private static instance: OptimizationManager | null = null

  private deviceCapabilities: DeviceCapabilities | null = null
  private currentOptimizationLevel: OptimizationLevel = OptimizationLevel.MEDIUM
  private currentQualitySettings: QualitySettings

  // Base quality profiles - minimal settings only
  private readonly baseQualityProfiles: Record<
    OptimizationLevel,
    Partial<QualitySettings>
  > = {
    [OptimizationLevel.ULTRA_LOW]: {
      canvasScale: 0.55,
      enablePostProcessing: false,
      enableShadows: false,
      shadowMapSize: 0,
      enableDynamicLighting: false,
      textureResolution: 256,
      enableProceduralTextures: false,
      enableNormalMaps: false,
      enableReflections: false,
      enableRefractions: false,
      enableVegetation: false,
      maxFireflyLights: 5,
      maxVegetationInstances: 0,
    },
    [OptimizationLevel.LOW]: {
      canvasScale: 0.65,
      enablePostProcessing: false,
      enableShadows: false,
      shadowMapSize: 0,
      enableDynamicLighting: false,
      textureResolution: 256,
      enableProceduralTextures: false,
      enableNormalMaps: false,
      enableReflections: false,
      enableRefractions: false,
      enableVegetation: true,
      maxFireflyLights: 6,
      maxVegetationInstances: 2,
    },
    [OptimizationLevel.MEDIUM]: {
      canvasScale: 0.85,
      enablePostProcessing: true,
      enableShadows: true,
      shadowMapSize: 512,
      enableDynamicLighting: true,
      textureResolution: 1024,
      enableProceduralTextures: true,
      enableNormalMaps: true,
      enableReflections: true,
      enableRefractions: false,
      enableVegetation: true,
      maxFireflyLights: 12,
      maxVegetationInstances: 5,
    },
    [OptimizationLevel.HIGH]: {
      canvasScale: 1.0,
      enablePostProcessing: true,
      enableShadows: true,
      shadowMapSize: 1024,
      enableDynamicLighting: true,
      textureResolution: 2048,
      enableProceduralTextures: true,
      enableNormalMaps: true,
      enableReflections: true,
      enableRefractions: false,
      enableVegetation: true,
      maxFireflyLights: 24,
      maxVegetationInstances: 10,
    },
    [OptimizationLevel.ULTRA]: {
      canvasScale: 1.0,
      enablePostProcessing: true,
      enableShadows: true,
      shadowMapSize: 2048,
      enableDynamicLighting: true,
      textureResolution: 2048,
      enableProceduralTextures: true,
      enableNormalMaps: true,
      enableReflections: true,
      enableRefractions: true,
      enableVegetation: true,
      maxFireflyLights: 40,
      maxVegetationInstances: 18,
    },
  }

  private constructor() {
    this.currentQualitySettings = this.buildQualitySettings(
      OptimizationLevel.MEDIUM,
    )
    this.detectDeviceCapabilities()
    this.autoSetOptimizationLevel()
    runtimeDebugLog(
      'OptimizationManager initialized with level:',
      this.currentOptimizationLevel,
    )
  }

  public static getInstance(): OptimizationManager {
    if (!OptimizationManager.instance) {
      OptimizationManager.instance = new OptimizationManager()
    }
    return OptimizationManager.instance
  }

  private detectDeviceCapabilities(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      // SSR fallback
      this.deviceCapabilities = {
        isMobile: false,
        isLowEnd: false,
        screenSize: { width: 1920, height: 1080 },
        pixelRatio: 1,
        estimatedGPUTier: 'medium',
        supportsWebGL2: true,
        hardwareConcurrency: 4,
        maxTextureSize: 4096,
        deviceType: 'desktop',
      }
      return
    }

    const userAgent = navigator.userAgent
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent,
      )
    const isTablet =
      /iPad|Tablet|PlayBook/i.test(userAgent) ||
      (window.innerWidth > 768 && isMobile)
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    const pixelRatio = window.devicePixelRatio || 1
    const hardwareConcurrency = navigator.hardwareConcurrency || 4

    let deviceType: 'phone' | 'tablet' | 'desktop' | 'unknown' = 'unknown'
    if (!isMobile) {
      deviceType = 'desktop'
    } else if (isTablet) {
      deviceType = 'tablet'
    } else {
      deviceType = 'phone'
    }

    // WebGL capabilities
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    const supportsWebGL2 = !!canvas.getContext('webgl2')
    const maxTextureSize = gl
      ? (gl as WebGLRenderingContext).getParameter(
          (gl as WebGLRenderingContext).MAX_TEXTURE_SIZE,
        )
      : 2048

    // Device memory (if available)
    const deviceMemory =
      'deviceMemory' in navigator ? (navigator as any).deviceMemory : undefined

    // GPU tier estimation
    let estimatedGPUTier: 'low' | 'medium' | 'high' | 'ultra' = 'medium'

    if (isMobile) {
      const totalPixels = screenWidth * screenHeight * pixelRatio
      const deviceYear = this.estimateDeviceYear(userAgent)

      if (
        totalPixels > 6000000 &&
        deviceYear >= 2022 &&
        hardwareConcurrency >= 8
      ) {
        estimatedGPUTier = 'ultra'
      } else if (
        totalPixels > 4000000 &&
        deviceYear >= 2020 &&
        hardwareConcurrency >= 6
      ) {
        estimatedGPUTier = 'high'
      } else if (totalPixels > 2000000 && deviceYear >= 2019) {
        estimatedGPUTier = 'medium'
      } else {
        estimatedGPUTier = 'low'
      }
    } else {
      // Desktop GPU estimation
      if (
        maxTextureSize >= 16384 &&
        hardwareConcurrency >= 16 &&
        deviceMemory &&
        deviceMemory >= 16
      ) {
        estimatedGPUTier = 'ultra'
      } else if (maxTextureSize >= 8192 && hardwareConcurrency >= 8) {
        estimatedGPUTier = 'high'
      } else if (maxTextureSize >= 4096) {
        estimatedGPUTier = 'medium'
      } else {
        estimatedGPUTier = 'low'
      }
    }

    const isLowEnd =
      estimatedGPUTier === 'low' ||
      hardwareConcurrency < 4 ||
      (deviceMemory && deviceMemory < 4) ||
      maxTextureSize < 4096

    this.deviceCapabilities = {
      isMobile,
      isLowEnd,
      screenSize: { width: screenWidth, height: screenHeight },
      pixelRatio,
      estimatedGPUTier,
      supportsWebGL2,
      deviceMemory,
      hardwareConcurrency,
      maxTextureSize,
      deviceType,
    }

    runtimeDebugLog('Device detection:', {
      deviceType,
      estimatedGPUTier,
      hardwareConcurrency,
      maxTextureSize,
      totalPixels: screenWidth * screenHeight * pixelRatio,
    })
  }

  private estimateDeviceYear(userAgent: string): number {
    const currentYear = new Date().getFullYear()

    // iPhone patterns
    if (/iPhone/.test(userAgent)) {
      if (/iPhone1[5-9]|iPhone[2-9][0-9]/.test(userAgent)) return currentYear
      if (/iPhone1[2-4]/.test(userAgent)) return 2022
      if (/iPhone1[0-1]/.test(userAgent)) return 2019
      return 2018
    }

    // Android patterns
    if (/Android/.test(userAgent)) {
      const androidMatch = userAgent.match(/Android (\d+)/)
      if (androidMatch) {
        const version = Number.parseInt(androidMatch[1])
        if (version >= 14) return 2023
        if (version >= 13) return 2022
        if (version >= 12) return 2021
        if (version >= 11) return 2020
        if (version >= 10) return 2019
        return 2018
      }
    }

    return currentYear - 2
  }

  private autoSetOptimizationLevel(): void {
    if (!this.deviceCapabilities) return

    const profileLevel = this.getProfileOptimizationLevel()
    if (profileLevel) {
      this.setOptimizationLevel(profileLevel)
      return
    }

    const {
      isMobile,
      isLowEnd,
      estimatedGPUTier,
      pixelRatio,
      hardwareConcurrency,
      deviceMemory,
    } = this.deviceCapabilities
    let level: OptimizationLevel

    if (isMobile) {
      if (isLowEnd || estimatedGPUTier === 'low') {
        level = OptimizationLevel.LOW
      } else if (estimatedGPUTier === 'high' || estimatedGPUTier === 'ultra') {
        level = OptimizationLevel.HIGH
      } else {
        level = OptimizationLevel.MEDIUM
      }
    } else {
      if (estimatedGPUTier === 'ultra') {
        level = OptimizationLevel.ULTRA
      } else if (estimatedGPUTier === 'high') {
        level = OptimizationLevel.HIGH
      } else if (estimatedGPUTier === 'low') {
        level = OptimizationLevel.LOW
      } else {
        const veryHighDensityDisplay = pixelRatio > 1.75
        const constrainedCpu = hardwareConcurrency <= 4
        const limitedMemory = (deviceMemory ?? 8) <= 4
        level =
          veryHighDensityDisplay && (constrainedCpu || limitedMemory)
            ? OptimizationLevel.LOW
            : OptimizationLevel.MEDIUM
      }
    }

    this.setOptimizationLevel(level)
  }

  private normalizeOptimizationLevel(
    value: string | null | undefined,
  ): OptimizationLevel | null {
    if (!value) return null
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[-\s]+/g, '_')

    if (
      normalized === OptimizationLevel.ULTRA_LOW ||
      normalized === OptimizationLevel.LOW ||
      normalized === OptimizationLevel.MEDIUM ||
      normalized === OptimizationLevel.HIGH ||
      normalized === OptimizationLevel.ULTRA
    ) {
      return normalized as OptimizationLevel
    }

    return null
  }

  private getRuntimeProfileOverride(): RuntimeProfileOverride | null {
    if (typeof window === 'undefined') return null
    return window.__gameRuntimeProfile ?? null
  }

  private getProfileOptimizationLevel(): OptimizationLevel | null {
    const profile = this.getRuntimeProfileOverride()
    if (!profile) return null

    const explicitTier = this.normalizeOptimizationLevel(
      profile.expectedRuntimeTier,
    )
    if (explicitTier) return explicitTier

    switch (profile.platformProfile) {
      case 'mobile':
        return OptimizationLevel.LOW
      case 'desktop':
        return OptimizationLevel.HIGH
      case 'tv':
        return OptimizationLevel.MEDIUM
      default:
        break
    }

    if (profile.targetClass?.startsWith('mobile-low')) {
      return OptimizationLevel.LOW
    }
    if (profile.targetClass?.startsWith('desktop-high')) {
      return OptimizationLevel.HIGH
    }
    if (profile.targetClass?.startsWith('tv-medium')) {
      return OptimizationLevel.MEDIUM
    }

    return null
  }

  public setOptimizationLevel(level: OptimizationLevel): void {
    this.currentOptimizationLevel = level
    this.currentQualitySettings = this.buildQualitySettings(level)

    runtimeDebugLog(`Optimization level set to: ${level}`, {
      qualitySettings: this.currentQualitySettings,
    })

    // Dispatch event for other systems to react
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent('optimizationLevelChanged', {
          detail: {
            level,
            qualitySettings: this.currentQualitySettings,
            deviceCapabilities: this.deviceCapabilities,
          },
        }),
      )
    }
  }

  public getOptimizationLevel(): OptimizationLevel {
    return this.currentOptimizationLevel
  }

  public getQualitySettings(): QualitySettings {
    return this.currentQualitySettings
  }

  public getDeviceCapabilities(): DeviceCapabilities | null {
    return this.deviceCapabilities
  }

  public getRuntimeProfile(): RuntimeProfileOverride | null {
    return this.getRuntimeProfileOverride()
  }

  private buildQualitySettings(level: OptimizationLevel): QualitySettings {
    const baseSettings = this.baseQualityProfiles[level]
    return { ...baseSettings } as QualitySettings
  }
}

// Export singleton instance
export const optimizationManager = OptimizationManager.getInstance()
