import { BannerStageRegistry, defineScene } from '../registry'

export const mockBannerStageRegistry = new BannerStageRegistry()

mockBannerStageRegistry.register(
  defineScene({
    id: 'mock-transmission-alpha',
    title: 'Mock Transmission Alpha',
    weight: 3,
    eligiblePages: ['/labs/banner-stage/'],
    minIntervalDays: 1,
    transition: 'fade',
    sceneProps: {
      headline: 'Transmission Alpha',
      copy: 'A benign scene used to validate the stage registry, context bridge, and random selection cookie without touching production banners.',
      ctaLabel: 'Queue Sample Cart Item',
      accent: '#38bdf8',
    },
    load: () => import('./MockSignalScene.svelte'),
  }),
)

mockBannerStageRegistry.register(
  defineScene({
    id: 'mock-transmission-beta',
    title: 'Mock Transmission Beta',
    weight: 2,
    eligiblePages: ['/labs/banner-stage/'],
    minIntervalDays: 2,
    transition: 'glitch',
    sceneProps: {
      headline: 'Transmission Beta',
      copy: 'This variant exists only to exercise weighted rotation and scene-selectable transitions during Milestone 1.',
      ctaLabel: 'Emit Alternate Event',
      accent: '#f59e0b',
    },
    load: () => import('./MockSignalScene.svelte'),
  }),
)

mockBannerStageRegistry.register(
  defineScene({
    id: 'mock-transmission-gamma',
    title: 'Mock Transmission Gamma',
    weight: 1,
    eligiblePages: ['/labs/banner-stage/'],
    minIntervalDays: 3,
    transition: 'cut',
    sceneProps: {
      headline: 'Transmission Gamma',
      copy: 'The scene pool can stay sparse for now. The point is the contract: registry entry in, mounted scene out.',
      ctaLabel: 'Signal Completion',
      accent: '#34d399',
    },
    load: () => import('./MockSignalScene.svelte'),
  }),
)
