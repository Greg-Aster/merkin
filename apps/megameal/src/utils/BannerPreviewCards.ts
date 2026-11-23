/**
 * ===================================================================
 * BANNER PREVIEW CARDS COMPONENT - EXTRACTED FROM BANNERANIMATION.TS
 * ===================================================================
 *
 * This module handles the creation and management of PostCard-style
 * preview overlays for banner items. Extracted to reduce complexity
 * in the main animation controller.
 *
 * RESPONSIBILITIES:
 * - Create preview card DOM elements
 * - Handle preview card visibility
 * - Manage click interactions for preview cards
 * - Generate position indicators
 * ===================================================================
 */

import type { BannerItemPreviewDetails } from '@/config/banners/types'

export interface PreviewCardConfig {
  getBannerItemPreviewDetails: (
    index: number,
  ) => BannerItemPreviewDetails | null
  onPreviewShow?: (index: number) => void
  onPreviewHide?: (index: number) => void
}

export class BannerPreviewCards {
  private config: PreviewCardConfig
  private bannerSlides: NodeListOf<Element> | null = null
  private activePreviewIndex = -1 // Track which preview is currently active

  constructor(config: PreviewCardConfig) {
    this.config = config
  }

  /**
   * Initialize preview cards for all banner slides
   */
  public initialize(bannerSlides: NodeListOf<Element>): void {
    this.bannerSlides = bannerSlides
    this.createAllPreviewCards()
    this.setupGlobalClickHandler() // ADDED: Global click handler for click-outside
  }

  /**
   * Create preview cards for all slides - CONSOLIDATED from bannerAnimation.ts
   */
  private createAllPreviewCards(): void {
    if (!this.bannerSlides) return

    this.bannerSlides.forEach((slide, index) => {
      this.createPreviewCardForSlide(slide as HTMLElement, index)
    })

    // console.log(`Preview Cards: Created ${this.bannerSlides.length} preview cards`);
  }

  /**
   * Create preview card for a single slide - EXTRACTED and CONSOLIDATED
   */
  private createPreviewCardForSlide(
    slideElement: HTMLElement,
    index: number,
  ): void {
    const bannerLinkElement = slideElement.querySelector(
      '.banner-link',
    ) as HTMLElement

    if (!bannerLinkElement) {
      // console.warn(`Preview Cards: No .banner-link element found for slide ${index}`);
      return
    }

    const previewDetails = this.config.getBannerItemPreviewDetails(index)
    if (!previewDetails) {
      // console.warn(`Preview Cards: No preview details found for slide ${index}`);
      return
    }

    // Create the preview overlay
    const previewOverlay = this.createPreviewOverlay(previewDetails, index)

    // Create supporting elements
    const hoverOverlay = this.createHoverOverlay()
    const pauseIndicator = this.createPauseIndicator()
    const clickIndicator = this.createClickIndicator(
      previewDetails.hasValidLink,
    )

    // Assemble the DOM structure
    bannerLinkElement.appendChild(hoverOverlay)
    bannerLinkElement.appendChild(previewOverlay)
    slideElement.appendChild(pauseIndicator)
    slideElement.appendChild(clickIndicator)

    // Setup event listeners
    this.setupPreviewCardEvents(bannerLinkElement, previewOverlay, index)

    // console.log(`Preview Cards: Setup complete for slide ${index}. HasValidLink: ${previewDetails.hasValidLink}`);
  }

  /**
   * Create the main preview overlay - EXTRACTED template generation
   */
  private createPreviewOverlay(
    previewDetails: BannerItemPreviewDetails,
    index: number,
  ): HTMLElement {
    const {
      hasValidLink,
      originalHref,
      urlForDisplay,
      previewTitle,
      previewDescription,
      previewIconSVG,
      isVideoButton,
    } = previewDetails

    const previewOverlay = document.createElement('div')
    previewOverlay.className = 'banner-postcard-preview banner-preview-hidden'

    // Use template for maintainability
    previewOverlay.innerHTML = this.getPreviewCardTemplate({
      hasValidLink,
      originalHref,
      urlForDisplay,
      previewTitle,
      previewDescription,
      previewIconSVG,
      isVideoButton,
      index,
    })

    return previewOverlay
  }

  /**
   * Preview card HTML template - EXTRACTED and CONSOLIDATED
   */
  private getPreviewCardTemplate(
    data: BannerItemPreviewDetails & { index: number },
  ): string {
    const {
      hasValidLink,
      originalHref,
      urlForDisplay,
      previewTitle,
      previewDescription,
      previewIconSVG,
      isVideoButton,
      index,
    } = data

    const contentWrapperStart = hasValidLink
      ? `<a href="${originalHref}" class="card-base banner-preview-card banner-preview-link">`
      : `<div class="card-base banner-preview-card banner-info-only">`

    const contentWrapperEnd = hasValidLink ? `</a>` : `</div>`

    return `
      <!-- Navigation Controls -->
      <div class="banner-navigation-controls">
        ${this.getNavigationButtonsTemplate()}
      </div>

      <!-- Video Loading Indicator -->
      <div class="banner-loading-indicator" style="display: none;">
        <div class="loading-spinner"></div>
        <span class="loading-text">Loading video...</span>
      </div>

      <!-- PostCard-style content -->
      ${contentWrapperStart}
        <div class="relative pt-4 pb-4 px-4 w-full">
          ${this.getPreviewContentTemplate(previewTitle, previewIconSVG, urlForDisplay, previewDescription, isVideoButton, hasValidLink)}
        </div>
      ${contentWrapperEnd}

      <!-- Position Indicator -->
      <div class="banner-position-indicator">
        ${this.createPositionIndicators(index)}
      </div>

      <!-- Close button -->
      ${this.getCloseButtonTemplate()}
    `
  }

  /**
   * Navigation buttons template - EXTRACTED
   */
  private getNavigationButtonsTemplate(): string {
    return `
      <button class="banner-nav-btn banner-nav-prev" data-direction="prev" aria-label="Previous banner item" title="Previous">
        <svg class="banner-nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>
      
      <button class="banner-nav-btn banner-nav-next" data-direction="next" aria-label="Next banner item" title="Next">
        <svg class="banner-nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    `
  }

  /**
   * Preview content template - EXTRACTED
   */
  private getPreviewContentTemplate(
    title: string,
    iconSVG: string,
    urlForDisplay: string,
    description: string,
    isVideo: boolean,
    hasValidLink: boolean,
  ): string {
    return `
      <div class="transition group w-full block font-bold mb-3 text-90 hover:text-[var(--primary)] dark:hover:text-[var(--primary)] active:text-[var(--title-active)] dark:active:text-[var(--title-active)] text-xl flex items-center">
        <div class="meta-icon mr-3">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            ${iconSVG}
          </svg>
        </div>
        ${title}
      </div>

      ${
        urlForDisplay
          ? `<div class="text-black/30 dark:text-white/30 text-sm transition mb-4 flex items-center">
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
        </svg>
        <span class="font-mono">${urlForDisplay}</span>
      </div>`
          : ''
      }

      <div class="transition text-75 mb-3.5 pr-4">
        ${description}
        ${isVideo ? '<br><small class="text-sm opacity-60">Video Content</small>' : ''}
      </div>

      <div class="text-sm text-black/30 dark:text-white/30 transition">
        ${hasValidLink ? 'Click here to visit this page' : 'Banner item information'}
      </div>
    `
  }

  /**
   * Close button template - EXTRACTED
   */
  private getCloseButtonTemplate(): string {
    return `
      <button class="banner-preview-close" aria-label="Close preview">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    `
  }

  /**
   * Create supporting DOM elements - EXTRACTED
   */
  private createHoverOverlay(): HTMLElement {
    const hoverOverlay = document.createElement('div')
    hoverOverlay.className = 'banner-hover-overlay'
    return hoverOverlay
  }

  private createPauseIndicator(): HTMLElement {
    const pauseIndicator = document.createElement('div')
    pauseIndicator.className = 'banner-pause-indicator btn-regular'
    pauseIndicator.innerHTML = `
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
      </svg>
    `
    return pauseIndicator
  }

  private createClickIndicator(hasValidLink: boolean): HTMLElement {
    const clickIndicator = document.createElement('div')
    clickIndicator.className = 'banner-click-indicator btn-regular'
    clickIndicator.innerHTML = `
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      <span class="ml-1 text-xs">${hasValidLink ? 'Click for link' : 'Click for info'}</span>
    `
    return clickIndicator
  }

  /**
   * Create position indicators - EXTRACTED
   */
  private createPositionIndicators(currentIndex: number): string {
    if (!this.bannerSlides) return ''

    return Array.from(
      { length: this.bannerSlides.length },
      (_, i) =>
        `<div class="banner-position-dot ${i === currentIndex ? 'active' : ''}" data-index="${i}"></div>`,
    ).join('')
  }

  /**
   * IMPROVED: Global click handler for click-outside functionality
   */
  private setupGlobalClickHandler(): void {
    document.addEventListener(
      'click',
      e => {
        const clickedElement = e.target as HTMLElement

        // If no preview is active, do nothing
        if (this.activePreviewIndex === -1) return

        const activeSlide = this.bannerSlides?.[
          this.activePreviewIndex
        ] as HTMLElement
        if (!activeSlide) return

        const activePreview = activeSlide.querySelector(
          '.banner-postcard-preview',
        ) as HTMLElement
        const bannerLink = activeSlide.querySelector(
          '.banner-link',
        ) as HTMLElement

        if (!activePreview) return

        // Check if click is inside preview overlay or on the banner toggle
        const isClickInsidePreview = activePreview.contains(clickedElement)
        const isClickOnToggler =
          bannerLink && bannerLink.contains(clickedElement)

        // Check if click is on navigation buttons (these should not close the preview)
        const isNavigationClick = clickedElement.closest(
          '.banner-nav-prev, .banner-nav-next, .banner-position-dot',
        )

        if (!isClickInsidePreview && !isClickOnToggler && !isNavigationClick) {
          console.log('Clicked outside preview, closing') // ADDED: User requested console log
          this.hidePreviewCard(activePreview, this.activePreviewIndex)
        }
      },
      true,
    ) // Use capture phase for better event handling
  }

  /**
   * Setup event listeners for preview cards - IMPROVED
   */
  private setupPreviewCardEvents(
    bannerLinkElement: HTMLElement,
    previewOverlay: HTMLElement,
    index: number,
  ): void {
    // Banner click shows/hides preview
    bannerLinkElement.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      console.log('Banner clicked, toggling preview') // ADDED: User requested console log
      this.togglePreviewCard(previewOverlay, index)
    })

    // Preview card close button
    const closeButton = previewOverlay.querySelector('.banner-preview-close')
    if (closeButton) {
      closeButton.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        this.hidePreviewCard(previewOverlay, index)
      })
    }

    // Handle clicks within preview overlay
    previewOverlay.addEventListener('click', e => {
      const clickedElement = e.target as HTMLElement
      const isPreviewLink = clickedElement.closest('.banner-preview-link')
      const isInfoOnly = clickedElement.closest('.banner-info-only')

      if (isInfoOnly) {
        e.preventDefault()
        e.stopPropagation()
      } else if (isPreviewLink) {
        e.stopPropagation()
      } else {
        e.stopPropagation()
      }
    })
  }

  /**
   * Public methods for preview card control - IMPROVED WITH TRACKING
   */
  public showPreviewCard(index: number): void {
    if (!this.bannerSlides || index < 0 || index >= this.bannerSlides.length)
      return

    const slide = this.bannerSlides[index] as HTMLElement
    const previewOverlay = slide.querySelector(
      '.banner-postcard-preview',
    ) as HTMLElement

    if (!previewOverlay) return

    this.hideAllPreviewCards()

    previewOverlay.classList.remove('banner-preview-hidden')
    previewOverlay.classList.add('banner-preview-visible')

    // IMPROVED: Track active preview
    this.activePreviewIndex = index

    // Notify parent controller
    if (this.config.onPreviewShow) {
      this.config.onPreviewShow(index)
    }

    // console.log(`Preview Cards: Showing preview for slide ${index}`);
  }

  public hidePreviewCard(previewOverlay: HTMLElement, index: number): void {
    previewOverlay.classList.remove('banner-preview-visible')
    previewOverlay.classList.add('banner-preview-hidden')

    // IMPROVED: Clear active preview tracking
    if (this.activePreviewIndex === index) {
      this.activePreviewIndex = -1
    }

    // Notify parent controller
    if (this.config.onPreviewHide) {
      this.config.onPreviewHide(index)
    }

    // console.log(`Preview Cards: Hiding preview for slide ${index}`);
  }

  public hideAllPreviewCards(): void {
    if (!this.bannerSlides) return

    this.bannerSlides.forEach((slide, index) => {
      const previewOverlay = slide.querySelector(
        '.banner-postcard-preview',
      ) as HTMLElement

      if (
        previewOverlay &&
        !previewOverlay.classList.contains('banner-preview-hidden')
      ) {
        this.hidePreviewCard(previewOverlay, index)
      }
    })

    // IMPROVED: Clear active preview tracking
    this.activePreviewIndex = -1
  }

  public togglePreviewCard(previewOverlay: HTMLElement, index: number): void {
    const isHidden = previewOverlay.classList.contains('banner-preview-hidden')

    if (isHidden) {
      this.showPreviewCard(index)
    } else {
      this.hidePreviewCard(previewOverlay, index)
    }
  }

  /**
   * Update position indicators across all slides
   */
  public updatePositionIndicators(currentIndex: number): void {
    if (!this.bannerSlides) return

    this.bannerSlides.forEach(slide => {
      const indicators = slide.querySelectorAll('.banner-position-dot')
      indicators.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentIndex)
      })
    })
  }

  /**
   * ADDED: Get active preview index for debugging
   */
  public getActivePreviewIndex(): number {
    return this.activePreviewIndex
  }

  /**
   * ADDED: Check if any preview is currently active
   */
  public hasActivePreview(): boolean {
    return this.activePreviewIndex !== -1
  }
}
