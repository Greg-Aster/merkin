import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(appRoot, '..', '..')

const failures = []

function readRequiredFile(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath)
  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath} is missing`)
    return ''
  }

  return readFileSync(absolutePath, 'utf8')
}

function assertIncludes(relativePath, expected, note) {
  const text = readRequiredFile(relativePath)
  if (!text.includes(expected)) {
    failures.push(`${relativePath} must retain ${note}: ${expected}`)
  }
}

function assertExcludes(relativePath, forbidden, note) {
  const text = readRequiredFile(relativePath)
  if (text.includes(forbidden)) {
    failures.push(`${relativePath} must not contain ${note}: ${forbidden}`)
  }
}

const protectedContracts = [
  [
    'apps/megameal/src/contracts/homePortal.ts',
    [
      ['merkin:portal-advance', 'portal advance event string'],
      ['merkin:banner-select-scene', 'banner scene-select event string'],
      ['megameal:portal-intro-ready', 'portal intro ready event string'],
      ['megameal:audio-suspend', 'audio suspend event string'],
      ['megameal:audio-resume', 'audio resume event string'],
      ['megameal:audio-config-change', 'audio config-change event string'],
      ['__megamealPortalDemoPlayerCleanup', 'portal demo cleanup window key'],
      ['__megamealPortalDemoPlayerBound', 'portal demo bound window key'],
      [
        '__megamealPortalSponsoredBloomCleanup',
        'sponsored bloom cleanup window key',
      ],
      ['megameal-portal-demo-last-index', 'portal demo localStorage key'],
      ['megameal-portal-demo-active', 'portal demo active class'],
      ['portal-demo', 'portal demo audio suspension reason'],
    ],
  ],
  [
    'apps/megameal/src/pages/[...page].astro',
    [
      ['PortalHeroSlide', 'home portal hero component'],
      ['PortalHeroBackgroundSlide', 'home portal background slide component'],
      ['PortalDemoVideoPlayer', 'home portal demo player component'],
      ['PortalSponsoredBloom', 'home portal sponsored bloom component'],
      ['slot="banner-overlay-content"', 'banner overlay slot'],
      ['slot="banner-slide-content"', 'banner slide slot'],
      ['slot="portal-demo-content"', 'portal demo slot'],
    ],
  ],
  [
    'apps/megameal/src/components/home/PortalHeroSlide.astro',
    [
      ['megameal-home-intro__screen-reader-copy', 'screen-reader copy'],
      ['megameal-home-intro__scroll-cue', 'joystick scroll cue'],
      ['data-joystick-direction="idle"', 'joystick data attribute'],
      ['HomeIntroEnvironment', 'interactive environment owner'],
      ['client:only="svelte"', 'client-only activation boundary'],
      ['homePortalEvents.portalAdvance', 'centralized portal advance dispatch'],
      ['keydown', 'keyboard support'],
    ],
  ],
  [
    'apps/megameal/src/components/home/PortalHeroBackgroundSlide.astro',
    [
      ['/assets/banner/tunnel.webm', 'background video path'],
      ['src={portalIntroBackgroundVideo}', 'component-owned background source'],
      ['autoplay', 'immediate muted playback policy'],
      ['preload="auto"', 'primary background preload policy'],
    ],
  ],
  [
    'apps/megameal/src/components/home/HomeIntroEnvironment.svelte',
    [
      ['renderMode="manual"', 'explicit portal render scheduling'],
      [
        'portalVisible={portalEffectsVisible}',
        'full portal render visibility ownership',
      ],
      [
        'effectsEnabled={logoEffectsVisible}',
        'logo-only post-processing range',
      ],
      [
        'const mobileTouchDragSensitivity = 0.36',
        'one-destination-per-swipe mobile touch sensitivity',
      ],
      [
        'mobileTouchDragSensitivity,',
        'mobile-only touch sensitivity application',
      ],
    ],
  ],
  [
    'apps/megameal/src/components/home/HomeIntroTentacleSprite.svelte',
    [
      [
        '/assets/sprites/tentacle/tiles/manifest.json',
        'single generated tentacle tile manifest',
      ],
      ['getVisibleTileIndexes', 'camera-frustum tile admission'],
      ['disposeTileTextures', 'GPU texture cleanup'],
      ['<T.Mesh', 'single-plane tile geometry'],
      ['depthWrite={true}', 'tentacle depth participation'],
    ],
  ],
  [
    'apps/megameal/src/components/home/HomeIntroEnvironmentScene.svelte',
    [
      [
        'tentacleContinuationScreens',
        'below-viewport tentacle continuation reserve',
      ],
      ['tentacleWidthCompensation', 'continuation width-preservation geometry'],
      ['homeIntroMotionStageKey', 'shared fixed portal motion stage'],
      [
        '{ stage: motionStage, autoInvalidate: false }',
        'fixed-stage scene motion task',
      ],
    ],
  ],
  [
    'apps/megameal/src/components/home/homeIntroMotionCadence.ts',
    [
      ['homeIntroMotionFps = 15', '15 fps stop-motion pose cadence'],
      ['homeIntroActiveRenderFps = 30', 'active render cadence'],
      ['homeIntroIdleRenderFps = 15', 'idle render cadence'],
      ['createHomeIntroRenderCadence', 'single render cadence owner'],
      ['homeIntroInteractionRenderHoldMs', 'active interaction render hold'],
      ['runTasks(motionDelta)', 'single shared fixed-stage advancement'],
    ],
  ],
  [
    'apps/megameal/src/components/home/HomeIntroPostProcessing.svelte',
    [
      ['advance()', 'manual render advancement'],
      ['renderCadence.shouldAdvance', 'manual render admission'],
      ['effectsEnabled', 'logo effect range separation'],
      ['useTask(renderScheduledFrame', 'single manually admitted render task'],
      ['stage: renderStage', 'render-stage ownership'],
    ],
  ],
  [
    'apps/megameal/src/components/client/SiteAudioRuntime.svelte',
    [
      ['loadSiteAudioManager()', 'muted audio-manager initialization'],
      ['addSiteAudioActivationListeners', 'browser audio unlock path'],
      ['readSiteAudioEnabledPreference()', 'persisted audio preference check'],
    ],
  ],
  [
    'apps/megameal/src/components/client/SiteAudioControl.svelte',
    [
      ['data-site-audio-prompt', 'first-visit audio prompt'],
      ['MEGA MEAL is best experienced with audio', 'audio prompt guidance'],
      ['Enable audio', 'audio opt-in action'],
      ['Keep muted', 'muted preference action'],
      ['readStoredSiteAudioPreference', 'existing preference ownership'],
    ],
  ],
  [
    'apps/megameal/src/components/home/PortalDemoVideoPlayer.astro',
    [
      ['data-portal-demo-player', 'demo player root data attribute'],
      ['data-portal-demo-video', 'demo video data attribute'],
      ['/assets/portal-demo/portal-overlay.webp', 'demo overlay media path'],
      ['portalDemoStorageKeys.lastIndex', 'centralized demo localStorage key'],
      ['homePortalEvents.audioSuspend', 'centralized audio suspend event'],
      ['homePortalEvents.audioResume', 'centralized audio resume event'],
      [
        'homePortalEvents.bannerSelectScene',
        'centralized banner scene-select listener',
      ],
      ['astro:page-load', 'Astro page-load lifecycle binding'],
      ['astro:before-preparation', 'Astro cleanup lifecycle binding'],
    ],
  ],
  [
    'apps/megameal/src/components/home/PortalSponsoredBloom.astro',
    [
      ['data-portal-sponsored-bloom', 'sponsored bloom root data attribute'],
      ['homePortalEvents.portalAdvance', 'centralized portal advance listener'],
      [
        'homePortalEvents.portalIntroReady',
        'centralized portal intro listener',
      ],
      [
        'homePortalWindowKeys.portalSponsoredBloomCleanup',
        'centralized sponsored bloom cleanup key',
      ],
      ['astro:before-preparation', 'Astro cleanup lifecycle binding'],
      ['pagehide', 'pagehide cleanup binding'],
    ],
  ],
  [
    'apps/megameal/src/components/home/homeIntroScreens.ts',
    [
      ["href: '/videos/'", 'videos CTA href'],
      ["href: '/timeline/'", 'timeline CTA href'],
      ["href: '/cookbook/'", 'cookbook CTA href'],
      ["href: '/archive/'", 'archive CTA href'],
      ["href: 'https://game.megameal.org/'", 'game CTA href'],
      ["href: '/store/'", 'store CTA href'],
      ["href: '/community/'", 'community CTA href'],
      ["href: '/reader/first-contact-manual/'", 'reader CTA href'],
      ["videoSrc: '/videos/title.webm'", 'home intro video path'],
      ['/assets/banner/universbg0001-0121.webm', 'universe video path'],
    ],
  ],
  [
    'apps/megameal/src/layouts/MainGridLayout.astro',
    [
      ['slot="portal-demo-content"', 'Megameal portal demo slot forwarding'],
      [
        'slot="banner-overlay-content"',
        'Megameal banner overlay slot forwarding',
      ],
      ['slot="banner-slide-content"', 'Megameal banner slide slot forwarding'],
      ['SiteAudioRuntime', 'site audio runtime mount'],
      ['SiteSfxBridge', 'site SFX bridge mount'],
    ],
  ],
  [
    'packages/blog-core/src/layouts/MainGridLayout.astro',
    [
      ['<Navbar></Navbar>', 'shared nav/search owner'],
      ['slot="portal-demo-content"', 'shared portal demo slot forwarding'],
      ['slot="banner-slide-content"', 'shared banner slide slot forwarding'],
      [
        'slot="banner-overlay-content"',
        'shared banner overlay slot forwarding',
      ],
      ['data-home-layout', 'home layout data contract'],
      ['data-content-mode', 'content mode data contract'],
    ],
  ],
]

for (const [relativePath, checks] of protectedContracts) {
  for (const [expected, note] of checks) {
    assertIncludes(relativePath, expected, note)
  }
}

const removedPortalStillPath =
  '/assets/banner/home-intro-stills/home-intro.webp'
const removedBackgroundShadeClass = 'megameal-portal-background-slide__shade'
assertExcludes(
  'apps/megameal/src/components/home/PortalHeroSlide.astro',
  removedPortalStillPath,
  'the removed full-screen portal still',
)
assertExcludes(
  'apps/megameal/src/components/home/homeIntroScreens.ts',
  removedPortalStillPath,
  'the removed primary-screen portal still',
)
assertExcludes(
  'apps/megameal/src/components/home/PortalHeroBackgroundSlide.astro',
  removedBackgroundShadeClass,
  'the removed tunnel background shade element',
)
assertExcludes(
  'apps/megameal/src/styles/features/home/portal-hero-slide.css',
  removedBackgroundShadeClass,
  'the removed tunnel background shade styles',
)
assertExcludes(
  'apps/megameal/src/components/home/PortalHeroBackgroundSlide.astro',
  'data-portal-background-src',
  'the interaction-gated background source',
)
assertExcludes(
  'apps/megameal/src/components/home/PortalHeroBackgroundSlide.astro',
  'data-src={portalIntroBackgroundVideo}',
  'the shared banner loader attribute that bypasses component admission',
)
assertExcludes(
  'apps/megameal/src/components/home/PortalHeroBackgroundSlide.astro',
  'getRichMediaCapabilities',
  'compact-viewport background loading restrictions',
)
assertExcludes(
  'apps/megameal/src/components/home/HomeIntroTentacleSprite.svelte',
  'atlas-24-',
  'the superseded full-frame tentacle atlases',
)
assertExcludes(
  'apps/megameal/src/components/home/HomeIntroTentacleSprite.svelte',
  '<T.Sprite',
  'independently billboarding tentacle tiles',
)

const tentacleManifestPath = path.join(
  repoRoot,
  'apps/megameal/public/assets/sprites/tentacle/tiles/manifest.json',
)
if (!existsSync(tentacleManifestPath)) {
  failures.push(
    'apps/megameal/public/assets/sprites/tentacle/tiles/manifest.json is missing',
  )
} else {
  try {
    const manifest = JSON.parse(readFileSync(tentacleManifestPath, 'utf8'))
    const expectedTileCount = manifest.frameCount * manifest.tileCount
    let existingTileCount = 0
    for (let frame = 0; frame < manifest.frameCount; frame += 1) {
      for (let tile = 0; tile < manifest.tileCount; tile += 1) {
        const tilePath = path.join(
          path.dirname(tentacleManifestPath),
          `frame-${String(frame).padStart(2, '0')}-tile-${tile}.webp`,
        )
        if (existsSync(tilePath)) existingTileCount += 1
      }
    }
    if (existingTileCount !== expectedTileCount) {
      failures.push(
        `tentacle tile manifest expects ${expectedTileCount} files but found ${existingTileCount}`,
      )
    }
  } catch (error) {
    failures.push(`tentacle tile manifest is invalid JSON: ${error}`)
  }
}

const removedActivationOwner =
  'apps/megameal/src/components/home/HomeIntroActivation.svelte'
if (existsSync(path.join(repoRoot, removedActivationOwner))) {
  failures.push(`${removedActivationOwner} must remain removed`)
}

const routeStyleBundles = readRequiredFile(
  'apps/megameal/src/styles/routeStyleBundles.server.ts',
)
const homeBundleStart = routeStyleBundles.indexOf('  home: {')
const listingBundleStart = routeStyleBundles.indexOf(
  '  listing:',
  homeBundleStart,
)
const homeBundle = routeStyleBundles.slice(homeBundleStart, listingBundleStart)
if (!homeBundle.includes("appStyle('features/facts-widget/core.css')")) {
  failures.push(
    'apps/megameal/src/styles/routeStyleBundles.server.ts must include the facts-widget core styles in the home bundle',
  )
}

if (failures.length > 0) {
  console.error('[home-portal-contracts] Contract audit failed:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(
  `[home-portal-contracts] Verified ${protectedContracts.length} protected portal source surfaces.`,
)
