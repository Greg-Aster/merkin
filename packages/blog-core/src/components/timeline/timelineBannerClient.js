import { getTimelineCore } from './TimelineViewModes/timelineViewClient.js'

export function initTimelineBannerControls() {
  const wrappers = document.querySelectorAll(
    '[data-timeline-banner-wrapper="true"]',
  )

  for (const wrapper of wrappers) {
    if (!(wrapper instanceof HTMLElement)) continue
    if (wrapper.dataset.timelineBannerInitialized === 'true') continue
    if (wrapper.dataset.timelineBannerInitializing === 'true') continue

    const timelineId = wrapper.dataset.timelineId
    if (!timelineId) continue

    const zoomButtons = wrapper.querySelectorAll('[data-action]')
    const eraOptions = wrapper.querySelectorAll('[data-era-option]')
    const initialEra = wrapper.dataset.initialEra || ''

    const setActiveEra = eraKey => {
      for (const option of eraOptions) {
        option.classList.toggle(
          'is-active',
          option.getAttribute('data-era-option') === eraKey,
        )
      }
    }

    const finalizePendingInit = () => {
      delete wrapper.dataset.timelineBannerInitializing
    }

    const syncTimelineCore = timelineCore => {
      if (!timelineCore) {
        return
      }

      wrapper.dataset.timelineBannerInitialized = 'true'
      finalizePendingInit()

      if (initialEra && typeof timelineCore.selectEra === 'function') {
        timelineCore.selectEra(initialEra)
        setActiveEra(initialEra)
      }

      for (const button of zoomButtons) {
        button.addEventListener('click', () => {
          const action = button.getAttribute('data-action')
          if (
            action === 'zoom-in' &&
            typeof timelineCore.zoomIn === 'function'
          ) {
            timelineCore.zoomIn()
          }
          if (
            action === 'zoom-out' &&
            typeof timelineCore.zoomOut === 'function'
          ) {
            timelineCore.zoomOut()
          }
          if (
            action === 'reset-view' &&
            typeof timelineCore.resetView === 'function'
          ) {
            timelineCore.resetView()
          }
        })
      }

      for (const option of eraOptions) {
        option.addEventListener('click', () => {
          const nextEra = option.getAttribute('data-era-option')
          if (!nextEra || typeof timelineCore.selectEra !== 'function') return
          timelineCore.selectEra(nextEra)
          setActiveEra(nextEra)
        })
      }

      wrapper.addEventListener('timeline:eraChange', event => {
        const nextEra = event.detail?.era
        if (nextEra) setActiveEra(nextEra)
      })

    }

    const handleCoreReady = event => {
      if (event.detail?.timelineId !== timelineId) return
      document.removeEventListener('timeline:core-ready', handleCoreReady)
      syncTimelineCore(event.detail.instance)
    }

    wrapper.dataset.timelineBannerInitializing = 'true'
    const existingCore = getTimelineCore(timelineId)
    if (existingCore) {
      syncTimelineCore(existingCore)
    } else {
      document.addEventListener('timeline:core-ready', handleCoreReady)
    }
  }
}
