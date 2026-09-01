import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import postcss from 'postcss'
import postcssImport from 'postcss-import'
import postcssNesting from 'postcss-nesting'
import tailwindcss from 'tailwindcss'
import type { APIRoute } from 'astro'
import type { RouteStyleBundleName } from './routeStyleBundles'

const require = createRequire(import.meta.url)
const tailwindConfig = require('../../tailwind.config.cjs')

type RouteStyleBundle = {
  sources: string[]
  tailwind?: boolean
}

const appRoot = process.cwd()
const repositoryRoot = path.resolve(appRoot, '../..')
const appStyle = (relativePath: string) =>
  path.join(appRoot, 'src/styles', relativePath)
const blogCoreStyle = (relativePath: string) =>
  path.join(repositoryRoot, 'packages/blog-core/src/styles', relativePath)

const bundles: Record<RouteStyleBundleName, RouteStyleBundle> = {
  about: { sources: [appStyle('pages/about-detail.css')] },
  archive: {
    sources: [
      appStyle('features/archive/story-map-nodes.css'),
      appStyle('features/archive/story-map-records.css'),
      appStyle('features/archive/story-map-responsive.css'),
      appStyle('features/archive/story-map-shell.css'),
      appStyle('pages/archive-index.css'),
    ],
  },
  banner: { sources: [appStyle('features/banner/index.css')] },
  community: { sources: [appStyle('pages/community.css')] },
  'facts-widget': {
    sources: [
      appStyle('features/facts-widget/core.css'),
      appStyle('features/facts-widget/overlay.css'),
      appStyle('features/facts-widget/motion-responsive.css'),
    ],
  },
  'featured-product-lab': {
    sources: [
      appStyle('features/store/featured-product/featured-product-commerce.css'),
      appStyle('features/store/featured-product/featured-product-hero-slide.css'),
      appStyle('features/store/featured-product/featured-product-panels.css'),
      appStyle('features/store/featured-product/featured-product-related-modal.css'),
      appStyle('features/store/featured-product/featured-product-shell.css'),
      appStyle('features/store/featured-product/procedural-model-viewer.css'),
    ],
  },
  home: {
    sources: [
      appStyle('features/extracted/home-intro-environment.css'),
      appStyle('features/facts-widget/core.css'),
      appStyle('features/home/portal-hero-scroll-cue.css'),
      appStyle('features/home/portal-hero-slide.css'),
      appStyle('features/home/portal-sponsored-bloom.css'),
      appStyle('pages/dynamic-page.css'),
    ],
  },
  listing: { sources: [appStyle('pages/dynamic-page.css')] },
  post: { sources: [appStyle('pages/post-detail.css')] },
  privacy: { sources: [appStyle('pages/privacy.css')] },
  quiz: {
    sources: [blogCoreStyle('quiz/quiz.css')],
    tailwind: true,
  },
  reader: {
    sources: [
      appStyle('reader/first-contact-manual.css'),
      appStyle('reader/first-contact-manual-flow.css'),
    ],
  },
  site: {
    sources: [appStyle('foundation/index.css')],
    tailwind: true,
  },
  snuggaloids: {
    sources: [appStyle('features/store/product-customizer.css')],
    tailwind: true,
  },
  store: { sources: [appStyle('layouts/store.css')] },
  'store-product': {
    sources: [
      appStyle('features/store/featured-product/featured-product-commerce.css'),
      appStyle('features/store/featured-product/featured-product-panels.css'),
      appStyle('features/store/featured-product/featured-product-shell.css'),
      appStyle('features/store/featured-product/featured-product-related-modal.css'),
      appStyle('features/store/featured-product/procedural-model-viewer.css'),
    ],
  },
  timeline: {
    sources: [
      appStyle('features/extracted/home-intro-environment.css'),
      appStyle('features/timeline/timeline-flight.css'),
      appStyle('features/timeline/timeline-selected-record.css'),
    ],
  },
  video: {
    sources: [
      appStyle('features/extracted/review-brief.css'),
      appStyle('features/extracted/review-cosmic-constellation.css'),
      appStyle('features/extracted/review-cosmic-void.css'),
      appStyle('features/extracted/review-cosmic.css'),
      appStyle('features/extracted/review-essay-evidence.css'),
      appStyle('features/extracted/review-essay-montage.css'),
      appStyle('features/extracted/review-essay.css'),
      appStyle('features/extracted/review-mode-slider.css'),
      appStyle('pages/megameal-explained-horror-rupture.css'),
      appStyle('pages/megameal-movie-trailer-explained-horror.css'),
    ],
  },
  'videos-index': { sources: [appStyle('pages/videos-index.css')] },
}

export function isRouteStyleBundleName(
  value: string | undefined,
): value is RouteStyleBundleName {
  return Boolean(value && Object.hasOwn(bundles, value))
}

export function getRouteStyleBundleNames(): RouteStyleBundleName[] {
  return Object.keys(bundles) as RouteStyleBundleName[]
}

export async function compileRouteStyleBundle(
  bundleName: RouteStyleBundleName,
): Promise<string> {
  const bundle = bundles[bundleName]
  await Promise.all(bundle.sources.map(source => fs.access(source)))

  const entryCss = bundle.sources
    .map(source => `@import ${JSON.stringify(source)};`)
    .join('\n')
  const plugins: unknown[] = [postcssImport(), postcssNesting()]
  if (bundle.tailwind) plugins.push(tailwindcss(tailwindConfig as any))

  // Some workspace packages resolve a newer compatible PostCSS patch release,
  // so keep the compiler boundary version-neutral instead of comparing two
  // copies of PostCSS's recursive plugin types.
  const result = await postcss(plugins as any).process(entryCss, {
    from: path.join(appRoot, `.route-style-${bundleName}.css`),
    map: false,
  })

  return result.css
}

export function createRouteStyleEndpoint(
  bundleName: RouteStyleBundleName,
): APIRoute {
  return async () => {
    const css = await compileRouteStyleBundle(bundleName)
    return new Response(css, {
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  }
}
