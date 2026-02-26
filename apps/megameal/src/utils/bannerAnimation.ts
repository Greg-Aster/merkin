/**
 * ===================================================================
 * REFACTORED BANNER ANIMATION CONTROLLER - SIMPLIFIED AND DRY
 * ===================================================================
 *
 * This is a significantly simplified version of the original bannerAnimation.ts
 * that uses modular components and eliminates redundancy.
 *
 * REDUCED FROM ~1000+ LINES TO ~400 LINES by:
 * - Extracting preview card management to BannerPreviewCards
 * - Extracting video management to BannerVideoManager
 * - Consolidating redundant functions
 * - Using composition over inheritance
 *
 * RESPONSIBILITIES (FOCUSED):
 * - Animation timing and transitions
 * - Navigation coordination
 * - Event handling coordination
 * - Public API exposure
 * ===================================================================
 */

import type {
  BannerAnimationConfig,
  BannerItemPreviewDetails,
} from '@/config/banners/types'
// TEMPORARY: Import these modules from the same directory as bannerAnimation.ts
// Adjust the paths based on where you place the new files
import {
  BannerPreviewCards,
  type PreviewCardConfig,
} from './BannerPreviewCards'
import {
  BannerVideoManager,
  VideoLoadingState,
  type VideoManagerConfig,
} from './BannerVideoManager'

export interface BannerControllerConfig {
  containerId: string
  animationConfig: BannerAnimationConfig
  getBannerItemPreviewDetails: (
    index: number,
  ) => BannerItemPreviewDetails | null
  isVideoBannerItem?: (item: any) => boolean
  isImageBannerItem?: (item: any) => boolean
}

export class BannerAnimationController {
  private config: BannerControllerConfig
  private bannerContainer: HTMLElement | null = null
  private bannerSlides: NodeListOf<Element> | null = null

  // Core state
  private currentIndex = 0
  private animationTimeout = 0
  private isAnimating = false
  private isPaused = false
  private pauseReason = ''

  // Manual navigation
  private isManualNavigation = false
  private manualNavigationTimeout = 0
  private manualNavigationDelay = 5000

  // Modular components - COMPOSITION OVER INHERITANCE
  private previewCards: BannerPreviewCards
  private videoManager: BannerVideoManager

  constructor(config: BannerControllerConfig) {
    this.config = config

    // Initialize modular components
    this.previewCards = new BannerPreviewCards({
      getBannerItemPreviewDetails: config.getBannerItemPreviewDetails,
      onPreviewShow: index => this.handlePreviewShow(index),
      onPreviewHide: index => this.handlePreviewHide(index),
    })

    this.videoManager = new BannerVideoManager({
      onLoadingStateChange: (index, state) =>
        this.handleVideoStateChange(index, state),
      onVideoError: (index, error) => this.handleVideoError(index, error),
    })
  }

  /**
   * ===================================================================
   * INITIALIZATION - SIMPLIFIED
   * ===================================================================
   */

  public initialize(): boolean {
    if (!this.findBannerElements()) return false
    if (!this.validateBannerSetup()) return false

    /*     console.log('Banner Controller: Starting with modular architecture');
     */
    // Initialize in proper order
    this.initializeSlideStates()
    this.initializeModules()
    this.setupEventHandlers()
    this.start() // Fixed: was calling this.startAnimation() which doesn't exist
    this.exposeGlobalAPI()

    return true
  }

  private findBannerElements(): boolean {
    this.bannerContainer = document.getElementById(this.config.containerId)
    if (!this.bannerContainer) {
      /*       console.log('Banner Controller: No banner container found');
       */ return false
    }

    this.bannerSlides = this.bannerContainer.querySelectorAll('.banner-slide')
    /*     console.log(`Banner Controller: Found ${this.bannerSlides.length} banner slides`);
     */
    return true
  }

  private validateBannerSetup(): boolean {
    if (!this.bannerSlides || this.bannerSlides.length <= 1) {
      /*       console.log('Banner Controller: Not enough slides for animation (need at least 2)');
       */ return false
    }
    return true
  }

  private initializeSlideStates(): void {
    if (!this.bannerSlides) return

    this.bannerSlides.forEach((slide, index) => {
      const slideElement = slide as HTMLElement
      slideElement.style.opacity = index === 0 ? '1' : '0'
    })

    this.updateInteractionStates()
  }

  private initializeModules(): void {
    if (!this.bannerSlides) return

    // Initialize modular components
    this.previewCards.initialize(this.bannerSlides)
    this.videoManager.initialize(this.bannerSlides)

    // Load current video and preload next
    this.videoManager.loadVideo(this.currentIndex)
    this.videoManager.preloadAroundIndex(this.currentIndex)
  }

  private setupEventHandlers(): void {
    this.setupKeyboardNavigation()
    this.setupVisibilityHandling()
    this.setupNavigationEvents()
  }

  /**
   * ===================================================================
   * ANIMATION CONTROL - CORE LOGIC ONLY
   * ===================================================================
   */

  public async animateToNextSlide(): Promise<void> {
    if (this.isAnimating || this.isPaused || !this.bannerSlides) return

    this.isAnimating = true
    this.previewCards.hideAllPreviewCards()

    const nextIndex = (this.currentIndex + 1) % this.bannerSlides.length
    await this.transitionToSlide(nextIndex)
  }

  private async transitionToSlide(targetIndex: number): Promise<void> {
    if (!this.bannerSlides || targetIndex === this.currentIndex) return

    // console.log(`Banner Controller: Transitioning from ${this.currentIndex} to ${targetIndex}`);

    try {
      // Wait for target content to be ready
      await this.videoManager.waitForVideoReady(targetIndex)

      // Execute transition
      this.executeTransition(targetIndex)

      // Post-transition cleanup
      this.videoManager.preloadAroundIndex(targetIndex)
      this.videoManager.cleanupDistantVideos(targetIndex)
    } catch (error) {
      // console.error('Banner Controller: Transition failed, continuing anyway:', error);
      this.executeTransition(targetIndex)
    }
  }

  private executeTransition(targetIndex: number): void {
    if (!this.bannerSlides) return

    const currentSlide = this.bannerSlides[this.currentIndex] as HTMLElement
    const targetSlide = this.bannerSlides[targetIndex] as HTMLElement

    // Update states
    currentSlide.classList.remove('banner-paused', 'banner-interactive')
    currentSlide.classList.add('banner-non-interactive')

    // Crossfade transition
    currentSlide.style.opacity = '0'
    targetSlide.style.opacity = '1'

    // Play video if applicable
    this.videoManager.playVideo(targetIndex)

    // Update after transition completes
    setTimeout(() => {
      this.currentIndex = targetIndex
      this.updateInteractionStates()
      this.previewCards.updatePositionIndicators(targetIndex)
      this.isAnimating = false
    }, this.config.animationConfig.transitionDuration)
  }

  private updateInteractionStates(): void {
    if (!this.bannerSlides) return

    this.bannerSlides.forEach((slide, index) => {
      const slideElement = slide as HTMLElement
      slideElement.classList.toggle(
        'banner-interactive',
        index === this.currentIndex,
      )
      slideElement.classList.toggle(
        'banner-non-interactive',
        index !== this.currentIndex,
      )
    })
  }

  /**
   * ===================================================================
   * PAUSE/RESUME SYSTEM - SIMPLIFIED
   * ===================================================================
   */

  public pauseAnimation(reason: string): void {
    if (this.isPaused) return

    this.isPaused = true
    this.pauseReason = reason

    if (this.animationTimeout) {
      clearInterval(this.animationTimeout)
      this.animationTimeout = 0
    }

    // console.log(`Banner Controller: Paused (${reason})`);
  }

  public resumeAnimation(reason: string): void {
    if (!this.isPaused || this.pauseReason !== reason) return

    this.isPaused = false
    this.pauseReason = ''

    if (this.config.animationConfig.enabled) {
      this.startAnimationTimer()
    }

    // console.log(`Banner Controller: Resumed (${reason})`);
  }

  private startAnimationTimer(): void {
    this.animationTimeout = window.setInterval(
      () => this.animateToNextSlide(),
      this.config.animationConfig.interval,
    )
  }

  /**
   * ===================================================================
   * NAVIGATION - CONSOLIDATED WITH CONSOLE LOGS
   * ===================================================================
   */

  public async navigateToIndex(targetIndex: number): Promise<void> {
    if (
      !this.bannerSlides ||
      targetIndex < 0 ||
      targetIndex >= this.bannerSlides.length ||
      targetIndex === this.currentIndex
    ) {
      return
    }

    // console.log(`Banner Controller: Manual navigation to ${targetIndex}`);

    this.previewCards.hideAllPreviewCards()
    this.isManualNavigation = true
    this.pauseAnimation('manual-navigation')

    await this.transitionToSlide(targetIndex)
    this.scheduleAutomaticResume()
  }

  public navigateToPrevious(): void {
    if (!this.bannerSlides) return
    console.log('Previous button clicked') // ADDED: User requested console log
    const prevIndex =
      this.currentIndex > 0
        ? this.currentIndex - 1
        : this.bannerSlides.length - 1
    this.navigateToIndex(prevIndex)
  }

  public navigateToNext(): void {
    if (!this.bannerSlides) return
    console.log('Next button clicked') // ADDED: User requested console log
    const nextIndex = (this.currentIndex + 1) % this.bannerSlides.length
    this.navigateToIndex(nextIndex)
  }

  private scheduleAutomaticResume(): void {
    if (this.manualNavigationTimeout) {
      clearTimeout(this.manualNavigationTimeout)
    }

    this.manualNavigationTimeout = window.setTimeout(() => {
      this.isManualNavigation = false
      this.resumeAnimation('manual-navigation')
    }, this.manualNavigationDelay)
  }

  /**
   * ===================================================================
   * EVENT HANDLING - IMPROVED WITH BETTER DELEGATION
   * ===================================================================
   */

  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', e => {
      const focusedBanner = document.querySelector(
        '.banner-slide.banner-selected, .banner-slide:focus-within',
      )
      if (!focusedBanner) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          this.navigateToPrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          this.navigateToNext()
          break
        case 'Home':
          e.preventDefault()
          this.navigateToIndex(0)
          break
        case 'End':
          e.preventDefault()
          this.navigateToIndex(
            this.bannerSlides ? this.bannerSlides.length - 1 : 0,
          )
          break
      }
    })
  }

  private setupVisibilityHandling(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop()
      } else if (!this.isPaused) {
        this.start()
      }
    })
  }

  private setupNavigationEvents(): void {
    // IMPROVED: More robust event delegation for navigation
    document.addEventListener(
      'click',
      e => {
        const target = e.target as HTMLElement

        // Handle navigation button clicks - improved targeting
        const prevButton = target.closest('.banner-nav-prev')
        const nextButton = target.closest('.banner-nav-next')
        const positionDot = target.closest('.banner-position-dot')

        if (prevButton) {
          e.preventDefault()
          e.stopPropagation()
          this.navigateToPrevious()
          return
        }

        if (nextButton) {
          e.preventDefault()
          e.stopPropagation()
          this.navigateToNext()
          return
        }

        if (positionDot) {
          e.preventDefault()
          e.stopPropagation()
          const index = Number.parseInt(
            positionDot.getAttribute('data-index') || '0',
          )
          this.navigateToIndex(index)
          return
        }
      },
      true,
    ) // Use capture phase for better event handling
  }

  /**
   * ===================================================================
   * MODULE EVENT HANDLERS
   * ===================================================================
   */

  private handlePreviewShow(index: number): void {
    this.pauseAnimation('preview-shown')

    if (this.bannerSlides) {
      const currentSlide = this.bannerSlides[this.currentIndex] as HTMLElement
      currentSlide.classList.add('banner-paused')
    }
  }

  private handlePreviewHide(index: number): void {
    this.resumeAnimation('preview-shown')

    if (this.bannerSlides) {
      const currentSlide = this.bannerSlides[this.currentIndex] as HTMLElement
      currentSlide.classList.remove('banner-paused')
    }
  }

  private handleVideoStateChange(
    index: number,
    state: VideoLoadingState,
  ): void {
    // Handle loading indicators through the video manager
    if (state === VideoLoadingState.LOADING) {
      this.showLoadingIndicator(index)
    } else if (
      state === VideoLoadingState.LOADED ||
      state === VideoLoadingState.ERROR
    ) {
      this.hideLoadingIndicator(index)
    }
  }

  private handleVideoError(index: number, error: Error): void {
    // console.warn(`Banner Controller: Video error for slide ${index}:`, error);
    // Error handling is done by the video manager
  }

  /**
   * ===================================================================
   * UTILITY METHODS - SIMPLIFIED
   * ===================================================================
   */

  private showLoadingIndicator(index: number): void {
    if (!this.bannerSlides) return
    const slide = this.bannerSlides[index] as HTMLElement
    const indicator = slide.querySelector(
      '.banner-loading-indicator',
    ) as HTMLElement
    if (indicator) indicator.style.display = 'flex'
  }

  private hideLoadingIndicator(index: number): void {
    if (!this.bannerSlides) return
    const slide = this.bannerSlides[index] as HTMLElement
    const indicator = slide.querySelector(
      '.banner-loading-indicator',
    ) as HTMLElement
    if (indicator) indicator.style.display = 'none'
  }

  /**
   * ===================================================================
   * PUBLIC API - STREAMLINED
   * ===================================================================
   */

  public start(): void {
    if (!this.config.animationConfig.enabled) return
    this.stop()
    if (!this.isPaused) this.startAnimationTimer()
  }

  public stop(): void {
    if (this.animationTimeout) {
      clearInterval(this.animationTimeout)
      this.animationTimeout = 0
    }
    if (this.manualNavigationTimeout) {
      clearTimeout(this.manualNavigationTimeout)
      this.manualNavigationTimeout = 0
    }
  }

  // Getters
  public getCurrentIndex(): number {
    return this.currentIndex
  }
  public isPausedState(): boolean {
    return this.isPaused
  }
  public getTotalSlides(): number {
    return this.bannerSlides?.length || 0
  }
  public isManuallyNavigating(): boolean {
    return this.isManualNavigation
  }

  // Compatibility methods for existing code
  public startAnimation(): void {
    this.start()
  }
  public stopAnimation(): void {
    this.stop()
  }
  public next(): void {
    this.animateToNextSlide()
  }

  // Delegated methods
  public isVideoSlide(index: number): boolean {
    return this.videoManager.isVideoSlide(index)
  }
  public getVideoLoadingState(index: number): VideoLoadingState {
    return this.videoManager.getVideoLoadingState(index)
  }
  public showPreview(index: number): void {
    this.previewCards.showPreviewCard(index)
  }
  public hidePreview(index: number): void {
    /* Handled by preview cards module */
  }
  public hideAllPreviews(): void {
    this.previewCards.hideAllPreviewCards()
  }

  /**
   * ===================================================================
   * GLOBAL API EXPOSURE - REDUCED
   * ===================================================================
   */

  private exposeGlobalAPI(): void {
    window.bannerAnimation = {
      // Core controls
      start: () => this.start(),
      stop: () => this.stop(),
      next: () => this.animateToNextSlide(),
      pause: (reason = 'external') => this.pauseAnimation(reason),
      resume: (reason = 'external') => this.resumeAnimation(reason),

      // Navigation
      navigateToIndex: (index: number) => this.navigateToIndex(index),
      navigateToPrevious: () => this.navigateToPrevious(),
      navigateToNext: () => this.navigateToNext(),

      // State getters
      getCurrentIndex: () => this.getCurrentIndex(),
      isPaused: () => this.isPausedState(),
      getTotalSlides: () => this.getTotalSlides(),
      isManuallyNavigating: () => this.isManuallyNavigating(), // Added

      // Module delegations
      isVideoSlide: (index: number) => this.isVideoSlide(index),
      getVideoLoadingState: (index: number) => this.getVideoLoadingState(index), // Added
      getVideoStats: () => this.videoManager.getVideoStats(),
      showPreview: (index: number) => this.showPreview(index),
      hidePreview: (index: number) => this.hidePreview(index), // Added
      hideAllPreviews: () => this.hideAllPreviews(),

      // Debug helpers
      getStatus: () => ({
        isPaused: this.isPaused,
        pauseReason: this.pauseReason,
        currentIndex: this.currentIndex,
        isAnimating: this.isAnimating,
        hasTimeout: this.animationTimeout !== 0,
      }),
    }
  }
}

/**
 * ===================================================================
 * FACTORY FUNCTION - SIMPLIFIED
 * ===================================================================
 */

export function createBannerAnimation(
  config: BannerControllerConfig,
): BannerAnimationController {
  return new BannerAnimationController(config)
}

// Re-export types and enums for convenience
export { VideoLoadingState } from './BannerVideoManager'

// Unified Global API type declaration
interface BannerAnimationAPI {
  start: () => void
  stop: () => void
  next: () => void
  pause: (reason?: string) => void
  resume: (reason?: string) => void
  navigateToIndex: (index: number) => void
  navigateToPrevious: () => void
  navigateToNext: () => void
  getCurrentIndex: () => number
  isPaused: () => boolean
  getTotalSlides: () => number
  isManuallyNavigating: () => boolean
  isVideoSlide: (index: number) => boolean
  getVideoLoadingState: (index: number) => VideoLoadingState
  getVideoStats: () => {
    totalVideos: number
    loadedCount: number
    loadingCount: number
    errorCount: number
    unloadedCount: number
  }
  showPreview: (index: number) => void
  hidePreview: (index: number) => void
  hideAllPreviews: () => void
  getStatus: () => {
    isPaused: boolean
    pauseReason: string
    currentIndex: number
    isAnimating: boolean
    hasTimeout: boolean
  }
}

declare global {
  interface Window {
    bannerAnimation?: BannerAnimationAPI
  }
}
