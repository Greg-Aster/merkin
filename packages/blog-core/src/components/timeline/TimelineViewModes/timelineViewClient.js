function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function allFinite(value) {
  return Number.isFinite(value)
}

function applyVideoPlaybackRate(videoElement, rate) {
  if (!videoElement) return
  const parsedRate = Number(rate)
  videoElement.playbackRate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : 1
}

function revealCard(cardElement) {
  if (!cardElement) return
  window.requestAnimationFrame(() => {
    cardElement.classList.add('is-visible')
  })
}

function parseJsonById(id, fallback) {
  const node = id ? document.getElementById(id) : null
  if (!node || !node.textContent) return fallback

  try {
    return JSON.parse(node.textContent)
  } catch {
    return fallback
  }
}

class TimelineCore {
  constructor(container) {
    this.container = container
    this.stage = container.querySelector('.timeline-stage')
    this.backgroundImage = container.querySelector('.timeline-background-image')
    this.backgroundImageWrapper = container.querySelector('.timeline-background-image-wrapper')
    this.backgroundVideo = container.querySelector('.timeline-background-video')
    this.nebulaLayer = container.querySelector('.timeline-depth-layer--nebula')
    this.dustLayer = container.querySelector('.timeline-depth-layer--dust')
    this.foregroundLayer = container.querySelector('.timeline-depth-layer--foreground')
    this.activeCard = container.querySelector('.timeline-active-card')
    this.eventEntries = parseJsonById(container.dataset.eventsId, [])
    this.eraConfig = parseJsonById(container.dataset.eraConfigId, {})
    this.eventMap = new Map(this.eventEntries.map((entry) => [entry.event.slug, entry]))
    this.initialBackground = container.dataset.initialBackground || ''
    this.initialBackgroundVideo = container.dataset.initialBackgroundVideo || ''
    this.initialBackgroundVideoPlaybackRate = Number(
      container.dataset.initialBackgroundVideoPlaybackRate || '1',
    )
    this.minZoom = Number(container.dataset.minZoom || '1')
    this.maxZoom = Number(container.dataset.maxZoom || '4')
    this.zoomStep = Number(container.dataset.zoomStep || '0.2')
    this.scale = Number(this.stage?.dataset.initialScale || 1)
    this.offsetX = Number(this.stage?.dataset.initialOffsetX || 0)
    this.offsetY = Number(this.stage?.dataset.initialOffsetY || 0)
    this.currentEra = 'all-eras'
    this.selectedSlug = null
    this.hoveredSlug = null
    this.highlightTimer = null
    this.dragPointerId = null
    this.dragStartX = 0
    this.dragStartY = 0
    this.dragBaseX = 0
    this.dragBaseY = 0

    this.bindEvents()
    this.updateTransform(false)
    this.startRandomHighlight()
    this.syncBackgroundMedia(false)
    this.bindBackgroundFallback()
  }

  bindEvents() {
    this.container.querySelectorAll('.timeline-event-button').forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        event.stopPropagation()
      })

      button.addEventListener('click', () => {
        const slug = button.getAttribute('data-slug')
        if (!slug) return
        this.selectEvent(slug, true)
      })

      button.addEventListener('mouseenter', () => {
        const slug = button.getAttribute('data-slug')
        if (!slug || this.isMobile()) return
        this.setHovered(slug)
        if (!this.selectedSlug) this.showCard(slug, false)
      })

      button.addEventListener('mouseleave', () => {
        const slug = button.getAttribute('data-slug')
        if (!slug || this.isMobile()) return
        this.clearHovered(slug)
        if (!this.selectedSlug) this.hideCard()
      })
    })

    this.container.addEventListener('click', (event) => {
      if (event.target.closest('.timeline-event-button') || event.target.closest('.timeline-active-card')) return
      this.clearSelection()
    })

    this.container.addEventListener('pointerdown', (event) => {
      if (!this.stage) return
      if (event.target.closest('.timeline-event-button') || event.target.closest('.timeline-active-card')) return
      this.dragPointerId = event.pointerId
      this.dragStartX = event.clientX
      this.dragStartY = event.clientY
      this.dragBaseX = this.offsetX
      this.dragBaseY = this.offsetY
      this.stage.classList.add('is-dragging')
      this.container.setPointerCapture?.(event.pointerId)
    })

    this.container.addEventListener('pointermove', (event) => {
      if (this.dragPointerId !== event.pointerId) return
      this.offsetX = this.dragBaseX + (event.clientX - this.dragStartX)
      this.offsetY = this.dragBaseY + (event.clientY - this.dragStartY)
      this.updateTransform(false)
    })

    const endDrag = (event) => {
      if (this.dragPointerId !== event.pointerId) return
      this.dragPointerId = null
      this.stage?.classList.remove('is-dragging')
      this.container.releasePointerCapture?.(event.pointerId)
    }

    this.container.addEventListener('pointerup', endDrag)
    this.container.addEventListener('pointercancel', endDrag)

    this.container.addEventListener(
      'wheel',
      (event) => {
        if (!event.ctrlKey && !event.metaKey) return
        if (Math.abs(event.deltaY) < 4) return
        event.preventDefault()
        if (event.deltaY > 0) this.zoomOut(event.clientX, event.clientY)
        else this.zoomIn(event.clientX, event.clientY)
      },
      { passive: false },
    )

    window.addEventListener('resize', () => {
      if (this.currentEra) this.focusVisibleEvents(false)
    })
  }

  bindBackgroundFallback() {
    if (!this.backgroundVideo || !this.backgroundImageWrapper) return
    this.backgroundVideo.addEventListener('error', () => {
      this.backgroundVideo.classList.add('is-background-hidden')
      this.backgroundImageWrapper.classList.remove('is-background-hidden')
    })
  }

  isMobile() {
    return window.matchMedia('(max-width: 767px)').matches
  }

  updateTransform(animate = true) {
    if (!this.stage) return
    this.scale = Math.max(this.minZoom, Math.min(this.maxZoom, this.scale))
    this.stage.style.transition = animate ? 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
    this.stage.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`
    this.updateParallax(animate)
  }

  updateParallax(animate = true) {
    const transition = animate ? 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
    const bgX = this.offsetX * -0.045
    const bgY = this.offsetY * -0.032
    const bgScale = 1.05 + Math.max(0, this.scale - 1) * 0.035

    if (this.backgroundImage) {
      this.backgroundImage.style.transition = transition
      this.backgroundImage.style.transform = `translate3d(${bgX}px, ${bgY}px, 0) scale(${bgScale})`
    }

    if (this.backgroundVideo) {
      this.backgroundVideo.style.transition = transition
      this.backgroundVideo.style.transform = `translate3d(${bgX}px, ${bgY}px, 0) scale(${bgScale})`
    }

    if (this.nebulaLayer) {
      this.nebulaLayer.style.transition = transition
      this.nebulaLayer.style.transform = `translate3d(${bgX * 0.72}px, ${bgY * 0.66}px, 0) scale(1.08)`
    }

    if (this.dustLayer) {
      this.dustLayer.style.transition = transition
      this.dustLayer.style.transform = `translate3d(${bgX * 0.4}px, ${bgY * 0.34}px, 0) scale(1.04)`
    }

    if (this.foregroundLayer) {
      this.foregroundLayer.style.transition = transition
      this.foregroundLayer.style.transform = `translate3d(${bgX * 0.16}px, ${bgY * 0.12}px, 0)`
    }
  }

  zoomTo(nextScale, clientX = null, clientY = null) {
    const rect = this.container.getBoundingClientRect()
    const previousScale = this.scale
    const clampedScale = Math.max(this.minZoom, Math.min(this.maxZoom, nextScale))
    const localX = clientX === null ? rect.width / 2 : clientX - rect.left
    const localY = clientY === null ? rect.height / 2 : clientY - rect.top
    const contentX = (localX - this.offsetX) / previousScale
    const contentY = (localY - this.offsetY) / previousScale

    this.scale = clampedScale
    this.offsetX = localX - contentX * clampedScale
    this.offsetY = localY - contentY * clampedScale
    this.updateTransform()
  }

  zoomIn(clientX = null, clientY = null) {
    this.zoomTo(this.scale + this.zoomStep, clientX, clientY)
  }

  zoomOut(clientX = null, clientY = null) {
    this.zoomTo(this.scale - this.zoomStep, clientX, clientY)
  }

  resetView() {
    this.scale = Number(this.stage?.dataset.initialScale || 1)
    this.offsetX = Number(this.stage?.dataset.initialOffsetX || 0)
    this.offsetY = Number(this.stage?.dataset.initialOffsetY || 0)
    this.updateTransform()
    if (this.currentEra && this.currentEra !== 'all-eras') this.focusVisibleEvents()
  }

  selectEra(eraKey) {
    this.currentEra = eraKey || 'all-eras'
    this.updateVisibleEvents()
    this.updateBackground()
    this.focusVisibleEvents()
    this.container.dispatchEvent(
      new CustomEvent('timeline:eraChange', {
        detail: { era: this.currentEra },
        bubbles: true,
      }),
    )
  }

  getVisibleEntries() {
    if (!this.currentEra || this.currentEra === 'all-eras') return this.eventEntries
    return this.eventEntries.filter((entry) => entry.event.era === this.currentEra)
  }

  updateVisibleEvents() {
    const allVisible = !this.currentEra || this.currentEra === 'all-eras'

    this.container.querySelectorAll('.timeline-event').forEach((eventEl) => {
      const isVisible = allVisible || eventEl.dataset.era === this.currentEra
      eventEl.classList.toggle('is-hidden-event', !isVisible)
    })

    this.container.querySelectorAll('.timeline-constellation-line').forEach((lineEl) => {
      const isVisible = allVisible || lineEl.dataset.era === this.currentEra
      lineEl.classList.toggle('is-hidden-line', !isVisible)
    })

    if (this.selectedSlug) {
      const selectedEntry = this.eventMap.get(this.selectedSlug)
      if (!selectedEntry || (!allVisible && selectedEntry.event.era !== this.currentEra)) {
        this.clearSelection()
      }
    }
  }

  updateBackground() {
    const activeEraConfig =
      (this.currentEra && this.eraConfig?.[this.currentEra]) ||
      this.eraConfig?.['all-eras'] ||
      null
    const nextBackground =
      activeEraConfig?.backgroundImage ||
      this.eraConfig?.['all-eras']?.backgroundImage ||
      this.initialBackground
    const nextBackgroundVideo =
      activeEraConfig?.backgroundVideo ||
      this.eraConfig?.['all-eras']?.backgroundVideo ||
      this.initialBackgroundVideo ||
      ''
    const nextBackgroundVideoPlaybackRate =
      activeEraConfig?.backgroundVideoPlaybackRate ||
      this.eraConfig?.['all-eras']?.backgroundVideoPlaybackRate ||
      this.initialBackgroundVideoPlaybackRate ||
      1

    if (nextBackground) {
      this.syncBackgroundMedia(false, nextBackground, nextBackgroundVideo, nextBackgroundVideoPlaybackRate)
    }
  }

  syncBackgroundMedia(
    animate = false,
    nextImage = this.initialBackground,
    nextVideo = this.initialBackgroundVideo,
    nextVideoPlaybackRate = this.initialBackgroundVideoPlaybackRate,
  ) {
    const hasVideo = typeof nextVideo === 'string' && nextVideo.trim().length > 0

    if (this.backgroundImage && nextImage) {
      this.backgroundImage.removeAttribute('srcset')
      this.backgroundImage.setAttribute('src', nextImage)
    }

    if (this.backgroundVideo) {
      if (hasVideo) {
        if (this.backgroundVideo.getAttribute('src') !== nextVideo) {
          this.backgroundVideo.setAttribute('src', nextVideo)
          this.backgroundVideo.load()
        }
        if (!hasVideo && nextImage) {
          this.backgroundVideo.setAttribute('poster', nextImage)
        }
        applyVideoPlaybackRate(this.backgroundVideo, nextVideoPlaybackRate)
        this.backgroundVideo.classList.remove('is-background-hidden')
        const playPromise = this.backgroundVideo.play()
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {})
        }
      } else {
        this.backgroundVideo.pause()
        this.backgroundVideo.classList.add('is-background-hidden')
      }
    }

    if (this.backgroundImageWrapper) {
      this.backgroundImageWrapper.classList.toggle('is-background-hidden', hasVideo)
    }

    this.updateParallax(animate)
  }

  focusVisibleEvents(animate = true) {
    const visibleEntries = this.getVisibleEntries()
    if (!visibleEntries.length) return

    const width = this.container.clientWidth
    const height = this.container.clientHeight
    const activeEraConfig =
      (this.currentEra && this.eraConfig?.[this.currentEra]) ||
      this.eraConfig?.['all-eras'] ||
      null

    if (activeEraConfig?.zoomLevel || activeEraConfig?.panToYear) {
      const targetScale = allFinite(activeEraConfig.zoomLevel)
        ? Math.max(this.minZoom, Math.min(this.maxZoom, Number(activeEraConfig.zoomLevel)))
        : this.scale
      const averageYPercent =
        visibleEntries.reduce((sum, entry) => sum + entry.y, 0) / visibleEntries.length
      const targetYPercent = Number.isFinite(averageYPercent) ? averageYPercent : 50
      const targetXPercent = Number.isFinite(activeEraConfig.panToYear)
        ? visibleEntries.reduce((closest, entry) => {
            const closestDistance = Math.abs(closest.event.year - activeEraConfig.panToYear)
            const entryDistance = Math.abs(entry.event.year - activeEraConfig.panToYear)
            return entryDistance < closestDistance ? entry : closest
          }, visibleEntries[0]).x
        : visibleEntries.reduce((sum, entry) => sum + entry.x, 0) / visibleEntries.length

      this.scale = targetScale
      this.offsetX = width / 2 - (targetXPercent / 100) * width * this.scale
      this.offsetY = height / 2 - (targetYPercent / 100) * height * this.scale
      this.updateTransform(animate)
      return
    }

    const xs = visibleEntries.map((entry) => (entry.x / 100) * width)
    const ys = visibleEntries.map((entry) => (entry.y / 100) * height)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const spreadX = Math.max(220, maxX - minX + 180)
    const spreadY = Math.max(180, maxY - minY + 180)
    const nextScale = Math.max(this.minZoom, Math.min(this.maxZoom, Math.min(width / spreadX, height / spreadY)))
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    this.scale = allFinite(nextScale) ? nextScale : this.scale
    this.offsetX = width / 2 - centerX * this.scale
    this.offsetY = height / 2 - centerY * this.scale
    this.updateTransform(animate)
  }

  selectEvent(slug, persistent) {
    this.selectedSlug = slug
    this.setHovered(slug)
    this.container.querySelectorAll('.timeline-event').forEach((eventEl) => {
      eventEl.classList.toggle('has-active-card', eventEl.dataset.eventSlug === slug)
      eventEl.classList.toggle('is-selected-event', eventEl.dataset.eventSlug === slug)
    })
    this.showCard(slug, persistent)
  }

  clearSelection() {
    this.selectedSlug = null
    this.container.querySelectorAll('.timeline-event').forEach((eventEl) => {
      eventEl.classList.remove('has-active-card', 'is-selected-event')
      eventEl.classList.remove('is-hovered-event')
    })
    this.hideCard()
  }

  setHovered(slug) {
    this.hoveredSlug = slug
    this.container.querySelectorAll('.timeline-event').forEach((eventEl) => {
      eventEl.classList.toggle('is-hovered-event', eventEl.dataset.eventSlug === slug)
    })
  }

  clearHovered(slug) {
    if (this.hoveredSlug === slug) this.hoveredSlug = null
    this.container.querySelectorAll('.timeline-event').forEach((eventEl) => {
      if (eventEl.dataset.eventSlug === slug) eventEl.classList.remove('is-hovered-event')
    })
  }

  showCard(slug, persistent) {
    const entry = this.eventMap.get(slug)
    if (!entry || !this.activeCard) return
    const target = this.container.querySelector(`.timeline-event-button[data-slug="${slug}"]`)
    if (!target) return

    const eventRect = target.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()
    const left = clampValue(
      eventRect.left - containerRect.left + eventRect.width * 0.5,
      110,
      containerRect.width - 110,
    )
    const top = clampValue(
      eventRect.top - containerRect.top - 20,
      90,
      containerRect.height - 90,
    )

    this.activeCard.innerHTML = this.renderCard(entry.event, persistent)
    this.activeCard.style.left = `${left}px`
    this.activeCard.style.top = `${top}px`
    this.activeCard.dataset.slug = slug
    this.activeCard.classList.remove('is-visible')
    revealCard(this.activeCard)
  }

  hideCard() {
    if (!this.activeCard) return
    this.activeCard.classList.remove('is-visible')
    this.activeCard.innerHTML = ''
    delete this.activeCard.dataset.slug
  }

  renderCard(event, persistent) {
    const yearLabel = Number.isFinite(event.year)
      ? `<div class="timeline-card-meta">${this.escapeHtml(String(event.year))}</div>`
      : ''
    const eraLabel = event.era
      ? `<div class="timeline-card-kicker">${this.escapeHtml(event.era.replaceAll('-', ' '))}</div>`
      : ''
    return `
      <article class="timeline-event-card ${persistent ? 'is-persistent-card' : ''}">
        ${eraLabel}
        <h3>${this.escapeHtml(event.title)}</h3>
        ${yearLabel}
        <p>${this.escapeHtml(event.description || '')}</p>
        <a href="/posts/${this.escapeHtml(event.slug)}/#post-container">View Event</a>
      </article>
    `
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  startRandomHighlight() {
    window.setInterval(() => {
      const visibleEntries = this.getVisibleEntries()
      if (!visibleEntries.length) return
      const targetEntry = visibleEntries[Math.floor(Math.random() * visibleEntries.length)]
      const target = this.container.querySelector(
        `[data-event-slug="${targetEntry.event.slug}"] .star-wrapper`,
      )
      if (!target) return
      target.setAttribute('data-trigger-highlight', 'true')
      window.setTimeout(() => {
        target.setAttribute('data-trigger-highlight', 'false')
      }, 1800)
    }, 3600)
  }
}

export function initTimelineViews() {
  document
    .querySelectorAll('[data-timeline-shell="true"]')
    .forEach((container) => {
      if (!(container instanceof HTMLElement)) return
      if (container.dataset.timelineInitialized === 'true') return

      container.dataset.timelineInitialized = 'true'
      const instance = new TimelineCore(container)
      const instanceKey = container.id.replace(/-container$/, '')
      window[`timelineCore_${instanceKey}`] = instance
    })
}
