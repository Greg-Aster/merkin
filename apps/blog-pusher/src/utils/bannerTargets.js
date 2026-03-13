function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function splitFilename(name = '') {
  const match = String(name || '').trim().match(/^(.*?)(\.[^.]+)?$/)
  return {
    stem: match?.[1] || 'banner',
    extension: (match?.[2] || '.jpg').toLowerCase(),
  }
}

function sanitizeFilename(name = '', fallback = 'banner') {
  const { stem, extension } = splitFilename(name)
  const safeStem = slugify(stem) || fallback
  const safeExtension = /^\.[a-z0-9]+$/i.test(extension) ? extension : '.jpg'
  return `${safeStem}${safeExtension}`
}

function buildTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, '')
    .toLowerCase()
}

export const BANNER_SITE_TARGETS = {
  temporal: {
    siteId: 'temporal',
    siteConfigPath: 'Temporal-Flow/src/config/config.ts',
    bannerConfigPath: 'Temporal-Flow/src/config/banner.config.ts',
    publicBannerDir: 'Temporal-Flow/public/assets/banner',
    sequenceAssetDir: 'Temporal-Flow/src/assets/banner',
    supportsSequence: false,
  },
  dndiy: {
    siteId: 'dndiy',
    siteConfigPath: 'DNDIY.github.io/src/config/config.ts',
    bannerConfigPath: 'DNDIY.github.io/src/config/banner.config.ts',
    publicBannerDir: 'DNDIY.github.io/public/assets/banner',
    sequenceAssetDir: 'DNDIY.github.io/src/assets/banner',
    supportsSequence: false,
  },
  megameal: {
    siteId: 'megameal',
    siteConfigPath: 'apps/megameal/src/config/config.ts',
    bannerConfigPath: 'apps/megameal/src/config/banner.config.ts',
    publicBannerDir: 'apps/megameal/public/assets/banner',
    sequenceAssetDir: 'apps/megameal/src/assets/banner',
    supportsSequence: false,
  },
  travel: {
    siteId: 'travel',
    siteConfigPath: 'apps/travel/src/config/config.ts',
    bannerConfigPath: 'apps/travel/src/config/banner.config.ts',
    publicBannerDir: 'apps/travel/public/assets/banner',
    sequenceAssetDir: 'apps/travel/src/assets/banner',
    supportsSequence: true,
  },
}

export function getBannerTarget(siteId) {
  return BANNER_SITE_TARGETS[siteId] || null
}

export function buildPublicBannerFilename(name = '', slot = 'main') {
  const clean = sanitizeFilename(name, `banner-${slot}`)
  const { stem, extension } = splitFilename(clean)
  return `${stem}-${buildTimestamp()}${extension}`
}

export function buildSequenceBannerFilename(name = '', slotIndex = 0) {
  const clean = sanitizeFilename(name, `banner-slot-${slotIndex + 1}`)
  const { stem, extension } = splitFilename(clean)
  return `${stem}-${buildTimestamp()}${extension}`
}

export function toPublicBannerUrl(filename = '') {
  return `/assets/banner/${String(filename || '').replace(/^\/+/, '')}`
}
