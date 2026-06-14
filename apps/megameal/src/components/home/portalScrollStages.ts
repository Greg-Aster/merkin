const portalScrollCleanupKey = '__megamealPortalScrollCleanup'
const portalScrollInitKey = '__megamealPortalScrollInit'
const portalScrollResetKey = '__megamealPortalScrollReset'
const portalScrollBoundKey = '__megamealPortalScrollBound'

type PortalScrollWindow = Window &
  typeof globalThis & {
    [portalScrollCleanupKey]?: (() => void) | null
    [portalScrollInitKey]?: () => void
    [portalScrollResetKey]?: () => void
    [portalScrollBoundKey]?: boolean
  }

function resetPortalScrollStages() {
  const portalWindow = window as PortalScrollWindow
  portalWindow[portalScrollCleanupKey]?.()
  portalWindow[portalScrollCleanupKey] = null
  document.documentElement.classList.remove(
    'megameal-home-snap',
    'megameal-home-stage-ready',
  )
}

function initPortalScrollStages() {
  const portalWindow = window as PortalScrollWindow

  resetPortalScrollStages()

  const hasPortal = Boolean(document.querySelector('.portal-snap-section'))
  document.documentElement.classList.toggle('megameal-home-snap', hasPortal)
  if (!hasPortal) return

  const revealTargets = Array.from(
    document.querySelectorAll<HTMLElement>('.appear-on-scroll'),
  )
  revealTargets.forEach(target => target.classList.remove('is-visible'))

  const revealObserver = new IntersectionObserver(
    entries =>
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        revealObserver.unobserve(entry.target)
      }),
    { threshold: 0.02, rootMargin: '0px 0px -8% 0px' },
  )
  revealTargets.forEach(element => revealObserver.observe(element))

  const revealVisibleTargets = () => {
    revealTargets.forEach(target => {
      const rect = target.getBoundingClientRect()
      const isVisible =
        rect.bottom > window.innerHeight * 0.08 &&
        rect.top < window.innerHeight * 0.92

      if (isVisible) {
        target.classList.add('is-visible')
        revealObserver.unobserve(target)
      }
    })
  }

  const bannerStage = document.getElementById('banner-container')
  bannerStage?.classList.add('portal-snap-stage', 'portal-snap-stage--hero')

  const stages = Array.from(
    new Set([
      ...(bannerStage ? [bannerStage] : []),
      ...document.querySelectorAll('.portal-snap-stage, .portal-snap-section'),
    ]),
  )

  if (stages.length === 0) return

  const setCurrentStage = () => {
    const viewportCenter = window.innerHeight * 0.5
    let currentStage: Element | null = null
    let currentDistance = Number.POSITIVE_INFINITY
    let anyVisible = false

    stages.forEach(stage => {
      const rect = stage.getBoundingClientRect()
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return
      anyVisible = true
      const stageCenter = rect.top + rect.height * 0.5
      const distance = Math.abs(stageCenter - viewportCenter)
      if (distance < currentDistance) {
        currentDistance = distance
        currentStage = stage
      }
    })

    document.documentElement.classList.toggle(
      'megameal-home-stage-ready',
      anyVisible,
    )

    stages.forEach(stage => {
      const rect = stage.getBoundingClientRect()
      const isApproaching =
        rect.bottom > window.innerHeight * 0.16 &&
        rect.top < window.innerHeight * 0.84

      stage.classList.toggle(
        'is-current',
        anyVisible && stage === currentStage,
      )
      stage.classList.toggle(
        'is-approaching',
        anyVisible && stage !== currentStage && isApproaching,
      )
    })
  }

  let frameRequest = 0

  const scheduleCurrentStage = () => {
    if (frameRequest) return
    frameRequest = window.requestAnimationFrame(() => {
      frameRequest = 0
      setCurrentStage()
    })
  }

  const handleScroll = () => {
    scheduleCurrentStage()
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', scheduleCurrentStage)

  const runStageMeasurements = () => {
    revealVisibleTargets()
    setCurrentStage()
  }

  const initialMeasureRaf = window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      runStageMeasurements()
    })
  })

  const delayedMeasure = window.setTimeout(runStageMeasurements, 250)
  const settledMeasure = window.setTimeout(runStageMeasurements, 700)

  portalWindow[portalScrollCleanupKey] = () => {
    revealObserver.disconnect()
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('resize', scheduleCurrentStage)
    window.cancelAnimationFrame(initialMeasureRaf)
    window.clearTimeout(delayedMeasure)
    window.clearTimeout(settledMeasure)
    if (frameRequest) {
      window.cancelAnimationFrame(frameRequest)
    }
    document.documentElement.classList.remove('megameal-home-stage-ready')
    stages.forEach(stage =>
      stage.classList.remove('is-current', 'is-approaching'),
    )
  }
}

export function initPortalScrollController() {
  const portalWindow = window as PortalScrollWindow

  portalWindow[portalScrollInitKey] = initPortalScrollStages
  portalWindow[portalScrollResetKey] = resetPortalScrollStages

  initPortalScrollStages()
  if (portalWindow[portalScrollBoundKey]) return

  const rerunPortalStages = () => portalWindow[portalScrollInitKey]?.()
  const clearPortalStages = () => portalWindow[portalScrollResetKey]?.()

  document.addEventListener('astro:page-load', rerunPortalStages)
  document.addEventListener('astro:before-preparation', clearPortalStages)
  window.addEventListener('pageshow', rerunPortalStages)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      window.setTimeout(rerunPortalStages, 0)
    }
  })

  portalWindow[portalScrollBoundKey] = true
}
