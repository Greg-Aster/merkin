/**
 * ===================================================================
 * BANNER VIDEO LOADING MANAGER - EXTRACTED FROM BANNERANIMATION.TS
 * ===================================================================
 *
 * This module handles all video-related functionality for banner slides.
 * Extracted to reduce complexity in the main animation controller.
 *
 * RESPONSIBILITIES:
 * - Video lazy loading and preloading
 * - Video state management
 * - Video error handling and fallbacks
 * - Memory management for loaded videos
 * ===================================================================
 */

/**
 * Video loading states for tracking video readiness
 */
export enum VideoLoadingState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
}

/**
 * Video loading info for tracking individual video states
 */
interface VideoLoadingInfo {
  state: VideoLoadingState
  element?: HTMLVideoElement
  loadPromise?: Promise<void>
  lastAccessed?: number
}

export interface VideoManagerConfig {
  preloadDistance?: number // How many videos ahead to preload (default: 1)
  maxLoadedVideos?: number // Maximum videos to keep in memory (default: 3)
  videoLoadTimeout?: number // Timeout for video loading in ms (default: 10000)
  onLoadingStateChange?: (index: number, state: VideoLoadingState) => void
  onVideoError?: (index: number, error: Error) => void
}

export class BannerVideoManager {
  private config: VideoManagerConfig
  private bannerSlides: NodeListOf<Element> | null = null
  private videoLoadingInfo: Map<number, VideoLoadingInfo> = new Map()

  // Configuration with defaults
  private preloadDistance: number
  private maxLoadedVideos: number
  private videoLoadTimeout: number

  constructor(config: VideoManagerConfig = {}) {
    this.config = config
    this.preloadDistance = config.preloadDistance ?? 1
    this.maxLoadedVideos = config.maxLoadedVideos ?? 3
    this.videoLoadTimeout = config.videoLoadTimeout ?? 10000
  }

  /**
   * Initialize video manager with banner slides
   */
  public initialize(bannerSlides: NodeListOf<Element>): void {
    this.bannerSlides = bannerSlides
    this.initializeVideoStates()
    /*     console.log('Video Manager: Initialized for', bannerSlides.length, 'slides');
     */
  }

  /**
   * Initialize loading state for all slides
   */
  private initializeVideoStates(): void {
    if (!this.bannerSlides) return

    this.bannerSlides.forEach((_, index) => {
      this.videoLoadingInfo.set(index, {
        state: VideoLoadingState.UNLOADED,
        lastAccessed: Date.now(),
      })
    })
  }

  /**
   * Check if slide contains a video element
   */
  public isVideoSlide(index: number): boolean {
    if (!this.bannerSlides || index < 0 || index >= this.bannerSlides.length) {
      return false
    }

    const slide = this.bannerSlides[index] as HTMLElement
    return !!slide.querySelector('.banner-video')
  }

  /**
   * Get current loading state for a video
   */
  public getVideoLoadingState(index: number): VideoLoadingState {
    const info = this.videoLoadingInfo.get(index)
    return info ? info.state : VideoLoadingState.UNLOADED
  }

  /**
   * Load video at specific index with proper error handling
   */
  public async loadVideo(index: number): Promise<void> {
    if (!this.bannerSlides || index < 0 || index >= this.bannerSlides.length) {
      return Promise.reject(new Error(`Invalid video index: ${index}`))
    }

    const videoInfo = this.videoLoadingInfo.get(index)
    if (
      !videoInfo ||
      videoInfo.state === VideoLoadingState.LOADED ||
      videoInfo.state === VideoLoadingState.LOADING
    ) {
      return Promise.resolve()
    }

    const slide = this.bannerSlides[index] as HTMLElement
    const videoElement = slide.querySelector(
      '.banner-video',
    ) as HTMLVideoElement

    if (!videoElement) {
      // Not a video slide, mark as loaded
      this.updateVideoState(index, VideoLoadingState.LOADED)
      return Promise.resolve()
    }

    /*     console.log(`Video Manager: Starting load for video ${index}`);
     */
    // Update state to loading
    this.updateVideoState(index, VideoLoadingState.LOADING, videoElement)

    // Create loading promise with timeout
    const loadPromise = this.createVideoLoadPromise(videoElement, index)

    // Store the promise for potential cancellation
    this.videoLoadingInfo.set(index, {
      ...this.videoLoadingInfo.get(index)!,
      loadPromise,
    })

    return loadPromise
  }

  /**
   * Create a promise for video loading with timeout and error handling
   */
  private createVideoLoadPromise(
    videoElement: HTMLVideoElement,
    index: number,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        /*         console.warn(`Video Manager: Timeout loading video ${index}`);
         */ this.handleVideoError(
          index,
          new Error(`Video load timeout for index ${index}`),
        )
        reject(new Error(`Video load timeout for index ${index}`))
      }, this.videoLoadTimeout)

      const onCanPlay = () => {
        clearTimeout(timeout)
        videoElement.removeEventListener('canplay', onCanPlay)
        videoElement.removeEventListener('error', onError)

        /*         console.log(`Video Manager: Successfully loaded video ${index}`);
         */ this.updateVideoState(index, VideoLoadingState.LOADED)
        resolve()
      }

      const onError = (event: Event) => {
        clearTimeout(timeout)
        videoElement.removeEventListener('canplay', onCanPlay)
        videoElement.removeEventListener('error', onError)

        const error = new Error(`Video load error for index ${index}`)
        /*         console.error(`Video Manager: Failed to load video ${index}`, event);
         */ this.handleVideoError(index, error)
        reject(error)
      }

      videoElement.addEventListener('canplay', onCanPlay, { once: true })
      videoElement.addEventListener('error', onError, { once: true })

      // Start loading the video
      if (videoElement.readyState >= 3) {
        // HAVE_FUTURE_DATA
        onCanPlay()
      } else {
        videoElement.load()
      }
    })
  }

  /**
   * Handle video loading error by falling back to image
   */
  private handleVideoError(index: number, error: Error): void {
    if (!this.bannerSlides) return

    const slide = this.bannerSlides[index] as HTMLElement
    const videoElement = slide.querySelector(
      '.banner-video',
    ) as HTMLVideoElement
    const imageElement = slide.querySelector(
      '.banner-image',
    ) as HTMLImageElement

    if (videoElement && imageElement) {
      // Hide video and show fallback image
      videoElement.style.display = 'none'
      imageElement.style.display = 'block'

      /*       console.log(`Video Manager: Fallback to image for slide ${index}`);
       */
    }

    // Update loading state
    this.updateVideoState(index, VideoLoadingState.ERROR)

    // Notify parent if callback provided
    if (this.config.onVideoError) {
      this.config.onVideoError(index, error)
    }
  }

  /**
   * Update video loading state and notify if callback provided
   */
  private updateVideoState(
    index: number,
    state: VideoLoadingState,
    element?: HTMLVideoElement,
  ): void {
    const currentInfo = this.videoLoadingInfo.get(index)

    if (!currentInfo) {
      // This case should ideally not happen if initializeVideoStates has run for all slides
      // and index is valid. For robustness, create a new entry.
      this.videoLoadingInfo.set(index, {
        state,
        element: element, // 'element' is the parameter from the function signature
        loadPromise: undefined, // Ensure all VideoLoadingInfo fields are considered
        lastAccessed: Date.now(),
      })
    } else {
      // currentInfo is guaranteed to be VideoLoadingInfo
      this.videoLoadingInfo.set(index, {
        ...currentInfo, // Spread all existing properties from currentInfo
        state, // Override state with the new state
        // If the 'element' parameter is explicitly passed, update element.
        // Otherwise, keep currentInfo.element (which might be undefined or an HTMLVideoElement).
        element: element !== undefined ? element : currentInfo.element,
        lastAccessed: Date.now(), // Update lastAccessed
      })
    }

    // Notify parent if callback provided
    if (this.config.onLoadingStateChange) {
      this.config.onLoadingStateChange(index, state)
    }
  }

  /**
   * Preload videos around current index
   */
  public async preloadAroundIndex(currentIndex: number): Promise<void> {
    if (!this.bannerSlides) return

    const totalSlides = this.bannerSlides.length
    const preloadPromises: Promise<void>[] = []

    // Preload next videos within preload distance
    for (let offset = 1; offset <= this.preloadDistance; offset++) {
      const nextIndex = (currentIndex + offset) % totalSlides

      if (this.isVideoSlide(nextIndex)) {
        const videoInfo = this.videoLoadingInfo.get(nextIndex)
        if (videoInfo && videoInfo.state === VideoLoadingState.UNLOADED) {
          /*           console.log(`Video Manager: Preloading video ${nextIndex}`);
           */ preloadPromises.push(
            this.loadVideo(nextIndex).catch(err => {
              /*               console.warn(`Video Manager: Failed to preload video ${nextIndex}:`, err);
               */
            }),
          )
        }
      }
    }

    // Wait for all preload operations
    await Promise.allSettled(preloadPromises)
  }

  /**
   * Wait for video at index to be ready for playback
   */
  public async waitForVideoReady(index: number): Promise<void> {
    if (!this.isVideoSlide(index)) return Promise.resolve()

    const videoInfo = this.videoLoadingInfo.get(index)
    if (!videoInfo) return Promise.reject(new Error('No video info found'))

    if (videoInfo.state === VideoLoadingState.LOADED) {
      return Promise.resolve()
    }

    if (videoInfo.state === VideoLoadingState.ERROR) {
      return Promise.reject(new Error('Video failed to load'))
    }

    if (
      videoInfo.state === VideoLoadingState.LOADING &&
      videoInfo.loadPromise
    ) {
      return videoInfo.loadPromise
    }

    // Start loading if not already started
    if (videoInfo.state === VideoLoadingState.UNLOADED) {
      return this.loadVideo(index)
    }

    return Promise.reject(new Error('Unknown video state'))
  }

  /**
   * Play video at specified index
   */
  public async playVideo(index: number): Promise<void> {
    if (!this.isVideoSlide(index)) return

    const videoInfo = this.videoLoadingInfo.get(index)
    if (!videoInfo?.element || videoInfo.state !== VideoLoadingState.LOADED) {
      /*       console.warn(`Video Manager: Cannot play video ${index} - not loaded`);
       */ return
    }

    try {
      videoInfo.element.currentTime = 0
      await videoInfo.element.play()
      /*       console.log(`Video Manager: Playing video ${index}`);
       */
    } catch (error) {
      /*       console.warn(`Video Manager: Failed to play video ${index}:`, error);
       */
    }
  }

  /**
   * Pause video at specified index
   */
  public pauseVideo(index: number): void {
    if (!this.isVideoSlide(index)) return

    const videoInfo = this.videoLoadingInfo.get(index)
    if (videoInfo?.element) {
      videoInfo.element.pause()
      /*       console.log(`Video Manager: Paused video ${index}`);
       */
    }
  }

  /**
   * Cleanup distant videos to manage memory usage
   */
  public cleanupDistantVideos(currentIndex: number): void {
    if (!this.bannerSlides) return

    const now = Date.now()
    const cleanupThreshold = 30000 // 30 seconds

    this.videoLoadingInfo.forEach((info, index) => {
      // Don't cleanup current video or nearby videos
      const distance = Math.min(
        Math.abs(index - currentIndex),
        this.bannerSlides!.length - Math.abs(index - currentIndex),
      )

      if (distance <= this.preloadDistance) return

      // Don't cleanup if recently accessed
      if (info.lastAccessed && now - info.lastAccessed < cleanupThreshold)
        return

      // Count loaded videos
      const loadedCount = Array.from(this.videoLoadingInfo.values()).filter(
        v => v.state === VideoLoadingState.LOADED,
      ).length

      if (
        loadedCount > this.maxLoadedVideos &&
        info.state === VideoLoadingState.LOADED &&
        info.element
      ) {
        /*         console.log(`Video Manager: Cleaning up distant video ${index}`);
         */
        // Reset video element
        info.element.pause()
        info.element.currentTime = 0
        info.element.src = ''

        // Update state
        this.updateVideoState(index, VideoLoadingState.UNLOADED)
      }
    })
  }

  /**
   * Get statistics about loaded videos
   */
  public getVideoStats(): {
    totalVideos: number
    loadedCount: number
    loadingCount: number
    errorCount: number
    unloadedCount: number
  } {
    const states = Array.from(this.videoLoadingInfo.values()).map(
      info => info.state,
    )

    return {
      totalVideos: states.length,
      loadedCount: states.filter(s => s === VideoLoadingState.LOADED).length,
      loadingCount: states.filter(s => s === VideoLoadingState.LOADING).length,
      errorCount: states.filter(s => s === VideoLoadingState.ERROR).length,
      unloadedCount: states.filter(s => s === VideoLoadingState.UNLOADED)
        .length,
    }
  }

  /**
   * Force cleanup all videos (useful for component unmounting)
   */
  public cleanup(): void {
    this.videoLoadingInfo.forEach((info, index) => {
      if (info.element) {
        info.element.pause()
        info.element.currentTime = 0
        info.element.src = ''
      }
    })

    this.videoLoadingInfo.clear()
    /*     console.log('Video Manager: Cleaned up all videos');
     */
  }
}
