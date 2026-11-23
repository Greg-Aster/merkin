import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const failures = []

function readSource(relativePath) {
  return readFileSync(path.resolve(appRoot, relativePath), 'utf8')
}

const carousel = readSource('src/components/timeline/TimelinePortalCarousel.svelte')
const scene = readSource('src/components/timeline/TimelinePortalCarouselScene.svelte')
const flightHud = readSource('src/components/timeline/TimelineFlightHud.svelte')
const temporalEffects = readSource('src/components/timeline/TimelineTemporalEffects.svelte')
const flight = readSource('src/components/timeline/timelinePortalFlight.ts')
const presentation = readSource('src/components/timeline/timelinePortalPresentation.ts')
const progress = readSource('src/components/timeline/timelinePortalProgress.ts')
const selectedRecord = readSource('src/components/timeline/TimelineSelectedRecord.svelte')
const constellationOverlay = readSource('src/components/timeline/TimelineConstellationOverlay.svelte')
const carouselModel = readSource('src/components/timeline/timelinePortalCarouselModel.ts')
const motionControls = readSource('src/components/timeline/TimelineMotionControls.svelte')
const selectedRecordStyles = readSource(
  'src/styles/features/timeline/timeline-selected-record.css',
)
const flightStyles = readSource(
  'src/styles/features/timeline/timeline-flight.css',
)
const routeStyleBundles = readSource('src/styles/routeStyleBundles.server.ts')
const viewModeButton = readSource('src/components/timeline/TimelineViewModeButton.svelte')
const mainGridLayout = readSource('src/layouts/MainGridLayout.astro')
const timelinePageLayout = readSource('src/layouts/TimelinePageLayout.astro')
const timelineBannerAdapter = readSource('src/components/timeline/TimelineBanner.astro')
const legacyMapRoute = readSource('src/pages/timeline/2d.astro')
const timelineBannerConfig = readSource('src/config/banners/timeline.ts')
const sharedBannerStage = readSource(
  '../../packages/blog-core/src/components/banner-stage/BannerStage.astro',
)

if (
  !mainGridLayout.includes("layoutPost?.data?.bannerType === 'timeline'") ||
  !mainGridLayout.includes("await import('@components/timeline/TimelineBanner.astro')") ||
  !mainGridLayout.includes('renderTimelineBannerSlot: rendersTimelineBanner')
) {
  failures.push('timeline posts must render the Megameal-owned timeline adapter')
}

if (
  !timelineBannerAdapter.includes('TimelinePortalCarousel') ||
  !timelineBannerAdapter.includes('isPublishedManifestRecord') ||
  !timelineBannerAdapter.includes('initialViewMode="map"') ||
  !timelineBannerAdapter.includes('presentation="banner"') ||
  timelineBannerAdapter.includes('SharedTimelineBanner')
) {
  failures.push('article banners must use the canonical portal in overview presentation')
}

if (
  !timelinePageLayout.includes('isPublishedManifestRecord') ||
  !timelinePageLayout.includes('initialViewMode="travel"') ||
  !timelinePageLayout.includes('presentation="full"')
) {
  failures.push('the full route must use published records and begin in first-person mode')
}

if (
  !viewModeButton.includes('<button') ||
  !viewModeButton.includes("dispatch('change', nextViewMode)") ||
  viewModeButton.includes('/timeline/2d')
) {
  failures.push('view changes must happen in place rather than navigating to a second route')
}

if (
  !carousel.includes('virtualWheel = 0') ||
  !carousel.includes('input.wheel = 0') ||
  !carousel.includes('if (!prefersReducedMotion && !isMapMode) timelineFlight.enableAutopilot()') ||
  !motionControls.includes('Disable timeline autopilot') ||
  carousel.includes('getDefaultTimelinePosition')
) {
  failures.push('first-person chronology must start at the beginning, enable autopilot, and expose manual mode')
}

if (
  !flight.includes('advanceTimelineTargetFlight({') ||
  !flight.includes('const autopilotDwellDuration = 20_000') ||
  !flight.includes('getRandomTargetIndex()') ||
  !flight.includes("autopilotPhase: 'dwell'") ||
  !flight.includes('options.selectTarget(targetIndex)') ||
  !flight.includes('advanceAutopilotFocus(') ||
  !flight.includes('options.getTargetScreenPosition(targetIndex)') ||
  !flight.includes('nextFlight.arrived && focusCentered') ||
  !carousel.includes('getTargetScreenPosition: getAutopilotTargetScreenPosition') ||
  !carousel.includes('data-timeline-autopilot-phase={autopilotPhase}') ||
  flightHud.includes('data-timeline-waypoint') ||
  carouselModel.includes('advanceTimelineAutoplay')
) {
  failures.push('autopilot must choose destinations, center each target through one controller, dwell for 20 seconds, and retire linear autoplay')
}

if (
  !flight.includes('boostedAutopilotMaximumSpeed') ||
  !flight.includes('boostKeyHeld') ||
  !flight.includes('!current.autopilotEnabled || current.autopilotPhase ===') ||
  !carousel.includes('travelEffectStrength') ||
  !carousel.includes('const manualBoostMultiplier = 2.15') ||
  !carousel.includes('pauseAutopilot({ preserveBoost: true })') ||
  !scene.includes('currentTravelEffectStrength * 8') ||
  !scene.includes('currentTravelEffectStrength * 1.45') ||
  !motionControls.includes('data-timeline-boost') ||
  !motionControls.includes("<span>Autopilot {autopilotEnabled ? 'On' : 'Off'}</span>") ||
  !motionControls.includes("<span>{isBoosting ? 'Boosting' : 'Boost'}</span>") ||
  flightHud.includes('data-timeline-boost')
) {
  failures.push('boost must live in the motion dock and drive the canonical camera and starfield feedback')
}

if (
  !scene.includes('TimelineTemporalEffects') ||
  !scene.includes('motionEnabled={ambientOrbitEnabled}') ||
  !temporalEffects.includes('<T.RingGeometry') ||
  !temporalEffects.includes('getWarpRing(') ||
  !temporalEffects.includes('getArrivalPulse()') ||
  !temporalEffects.includes('getEraRift(') ||
  !temporalEffects.includes('getTimeEcho(') ||
  !temporalEffects.includes('getBackgroundFlare(') ||
  !temporalEffects.includes("autopilotPhase === 'dwell'") ||
  !temporalEffects.includes('eraAccent !== observedEraAccent') ||
  temporalEffects.includes('requestAnimationFrame') ||
  temporalEffects.includes('setTimeout') ||
  !flightHud.includes('data-timeline-temporal-lens') ||
  !flightStyles.includes('@keyframes timeline-temporal-lens-drift')
) {
  failures.push('time travel feedback must remain one render-only layer driven by canonical flight and era state')
}

if (
  !progress.includes("'megameal:timeline:visited-records:v1'") ||
  !carousel.includes('markTimelineRecordVisited(index)') ||
  !carousel.includes('on:open={() => markTimelineRecordVisited(displayedScreenIndex)}') ||
  !selectedRecord.includes("dispatch('open')") ||
  !scene.includes('visitedScreenIndexSet.has(index)') ||
  !flightHud.includes('data-timeline-discovery') ||
  !flightStyles.includes('opacity: 0.58')
) {
  failures.push('visited-record progress must have one persisted slug owner and subdued star and HUD feedback')
}

if (
  !flight.includes('eraTransitionSequence: current.eraTransitionSequence + 1') ||
  !carousel.includes('getEraMarkerColor(') ||
  !flightHud.includes('data-timeline-era-transition') ||
  !flightStyles.includes('@keyframes timeline-era-arrival')
) {
  failures.push('era changes must update the timeline atmosphere and announce boundary transitions')
}

if (
  !flightHud.includes('data-timeline-lock-on') ||
  !flightStyles.includes('[data-timeline-shell] .timeline-flight-hud__lock') ||
  !routeStyleBundles.includes("appStyle('features/timeline/timeline-flight.css')")
) {
  failures.push('the lock-on HUD must remain scoped to the timeline route style bundle')
}

if (
  !scene.includes('defaultCamera.set(camera)') ||
  !scene.includes('size: canvasSize') ||
  !scene.includes('manual={true}') ||
  !scene.includes("viewMode === 'map' ? mapCamera : travelCamera") ||
  !scene.includes('getTimelineStarTarget(index, input.wheel, viewMode, portraitMobile)')
) {
  failures.push('the scene must own camera switching, canvas framing, and responsive target updates')
}

if (
  !presentation.includes('export function applyTimelineCameraDrag(') ||
  presentation.includes('applyTimelineCameraPanDrag') ||
  !carousel.includes('ambientOrbitEnabled={!prefersReducedMotion && runtimeActive}') ||
  !scene.includes("viewMode === 'map' && ambientOrbitEnabled") ||
  !scene.includes('shouldAdvanceAmbientOrbit = ambientOrbitAvailable && !input.active') ||
  !scene.includes('Math.sin(ambientMapOrbitTime * 0.12 + 0.55)')
) {
  failures.push('overview drag and ambient motion must use the canonical 3D orbit path')
}

if (!legacyMapRoute.includes("Astro.redirect('/timeline/', 301)")) {
  failures.push('the legacy map URL must permanently redirect to the canonical timeline')
}

if (
  timelineBannerConfig.includes('timelineBannerViewConfig') ||
  timelineBannerConfig.includes('timelineBannerInteraction') ||
  timelineBannerConfig.includes('timelineBannerEraConfig')
) {
  failures.push('banner registration must not retain a second timeline engine configuration')
}

if (
  sharedBannerStage.includes('TimelineController') ||
  sharedBannerStage.includes('timeline-mobile-inactive') ||
  !sharedBannerStage.includes('<slot name="timeline-banner-content" />')
) {
  failures.push('the shared banner stage must be a neutral slot host without a timeline fallback')
}

if (!carousel.includes('isTimelineInteractiveTarget(event.target)')) {
  failures.push('timeline scene input must exempt interactive targets from pointer capture')
}

if (
  !/function handleWheel[^]*?if \(\s*isBannerPresentation \|\|/.test(carousel) ||
  !/function handleKeyboardScroll[^]*?if \(\s*isBannerPresentation \|\|/.test(carousel) ||
  !carousel.includes('isBannerPresentation && event.touches.length < 2') ||
  carousel.split("isBannerPresentation ? 'touch-pan-y' : 'touch-none'").length - 1 < 2
) {
  failures.push('embedded timeline banners must preserve document wheel, keyboard, and touch scrolling')
}

if (
  carousel.includes('isTimelineSceneDragBlockedTarget') ||
  presentation.includes('isTimelineSceneDragBlockedTarget')
) {
  failures.push('timeline input must not retain a second map-only drag-blocking path')
}

if (!carousel.includes('absolute inset-0 z-[5]')) {
  failures.push('timeline star-control hit layer must retain its declared stacking level')
}

const selectedLayer = selectedRecordStyles.match(
  /\.home-intro-copy--timeline-selected\s*\{[^}]*\bz-index:\s*(\d+)/s,
)
if (!selectedLayer || Number(selectedLayer[1]) <= 5) {
  failures.push('selected timeline record must stack above the star-control hit layer')
}

if (
  !selectedRecord.includes('{#if selectedHref}') ||
  !selectedRecord.includes('<a') ||
  !selectedRecord.includes('<aside') ||
  !selectedRecord.includes('href={selectedHref}') ||
  !selectedRecord.includes('getTimelineRecordHref(selectedScreen?.url)') ||
  !carousel.includes('window.location.href = getTimelineRecordHref(url)') ||
  !carouselModel.includes("return `${url.split('#', 1)[0]}#post-container`")
) {
  failures.push('timeline records must remain native links and post links must target article content')
}

if (
  !carousel.includes('displayedScreenIndex = selectedScreenIndex >= 0 || isMapMode') ||
  !carousel.includes('selectedScreenIndex={displayedScreenIndex}')
) {
  failures.push('travel mode must preview the current record without overriding manual selection')
}

if (
  !carousel.includes('isOverview={isMapMode}') ||
  !constellationOverlay.includes('isOverview ? 0.34 : 0.18') ||
  !constellationOverlay.includes('isOverview ? 0.16 : 0.08')
) {
  failures.push('overview mode must render its constellation lines with stronger visibility')
}

if (failures.length > 0) {
  console.error('[timeline-interactions] Contract audit failed:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(
  '[timeline-interactions] Verified one portal owner, travel suggestions, overview lines, article targeting, destination autopilot, gameplay feedback, and banner scrolling.',
)
