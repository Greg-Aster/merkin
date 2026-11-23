const scrollEdgeTolerance = 6

let cleanupVideosArchiveRail: (() => void) | null = null

export function initVideosArchiveRail() {
  cleanupVideosArchiveRail?.()

  const videoRailControls = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-video-rail-control]'),
  )
  const videoRails = Array.from(
    document.querySelectorAll<HTMLElement>('[data-video-rail]'),
  )
  const videoRailAffordances = Array.from(
    document.querySelectorAll<HTMLElement>('[data-video-rail-affordance]'),
  )
  const abortController = new AbortController()

  function getRailControls(rail: HTMLElement) {
    const target = rail.dataset.videoRail

    return videoRailControls.filter(control => {
      return control.dataset.videoRailTarget === target
    })
  }

  function getRailAffordances(rail: HTMLElement) {
    const target = rail.dataset.videoRail

    return videoRailAffordances.filter(affordance => {
      return affordance.dataset.videoRailAffordance === target
    })
  }

  function updateRailControls(rail: HTMLElement) {
    const maxScroll = rail.scrollWidth - rail.clientWidth
    const hasOverflow = maxScroll > scrollEdgeTolerance
    const railBounds = rail.getBoundingClientRect()
    const firstItemBounds = rail.firstElementChild?.getBoundingClientRect()
    const lastItemBounds = rail.lastElementChild?.getBoundingClientRect()
    const firstItemVisible =
      firstItemBounds &&
      firstItemBounds.left >= railBounds.left - scrollEdgeTolerance
    const lastItemVisible =
      lastItemBounds &&
      lastItemBounds.right <= railBounds.right + scrollEdgeTolerance
    const atStart = firstItemVisible || rail.scrollLeft <= scrollEdgeTolerance
    const atEnd =
      lastItemVisible || rail.scrollLeft >= maxScroll - scrollEdgeTolerance

    getRailControls(rail).forEach(control => {
      const direction = Number(control.dataset.videoRailDirection || '1')

      const shouldHide =
        !hasOverflow || (direction < 0 && atStart) || (direction > 0 && atEnd)
      control.hidden = shouldHide
      control.disabled = shouldHide
    })

    getRailAffordances(rail).forEach(affordance => {
      affordance.hidden = !hasOverflow || atEnd
    })
  }

  function watchRailAfterScroll(rail: HTMLElement) {
    const startedAt = performance.now()

    function tick() {
      updateRailControls(rail)

      if (performance.now() - startedAt < 900) {
        requestAnimationFrame(tick)
      }
    }

    requestAnimationFrame(tick)
  }

  function updateAllRailControls() {
    videoRails.forEach(updateRailControls)
  }

  videoRailControls.forEach(control => {
    control.addEventListener(
      'click',
      () => {
        const target = control.dataset.videoRailTarget
        const direction = Number(control.dataset.videoRailDirection || '1')
        if (!target) return

        const rail = document.querySelector<HTMLElement>(
          `[data-video-rail="${target}"]`,
        )
        if (!rail) return

        rail.scrollBy({
          left: direction * rail.clientWidth * 0.82,
          behavior: 'smooth',
        })
        watchRailAfterScroll(rail)
      },
      { signal: abortController.signal },
    )
  })

  videoRails.forEach(rail => {
    rail.addEventListener('scroll', () => updateRailControls(rail), {
      passive: true,
      signal: abortController.signal,
    })
    rail.addEventListener('scrollend', () => updateRailControls(rail), {
      signal: abortController.signal,
    })
  })

  window.addEventListener('resize', updateAllRailControls, {
    signal: abortController.signal,
  })
  window.addEventListener('load', updateAllRailControls, {
    signal: abortController.signal,
  })
  updateAllRailControls()

  cleanupVideosArchiveRail = () => abortController.abort()
}
