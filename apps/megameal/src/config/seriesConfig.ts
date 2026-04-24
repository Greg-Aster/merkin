// seriesConfig.ts — Story arc / series definitions for MEGAMEAL Saga
// Each entry defines a named arc that groups related posts into a readable sequence.

export interface SeriesConfig {
  title: string
  description: string
  color: string // Hex color for visual accent
  startSlug: string // Slug of the first post (used for "Begin Reading" CTA)
  featuredImage?: string
  featured?: boolean // Whether to show in FeaturedArc on homepage
}

export const SERIES_CONFIG: Record<string, SeriesConfig> = {
  'first-contact-manual': {
    title: "The Interstellar Traveler's First Contact Manual",
    description:
      'A statistically-validated guide to the horrifying realities of alien life. 47,829 documented encounters across 12 galactic sectors. Survival not guaranteed.',
    color: '#8b5cf6',
    startSlug: 'timelines/first-contact-index',
    featuredImage: '/posts/timeline/chronos.png',
    featured: true,
  },
  'miranda-incident': {
    title: 'The Miranda Incident',
    description:
      'The Perfect Miranda Bloody Mary. A recipe that cracked time itself. Follow the investigation into the cocktail that broke causality.',
    color: '#ef4444',
    startSlug: 'timelines/The Miranda Incident',
    featuredImage: '/posts/timeline/golden-era.png',
  },
  'snuggloid-emergence': {
    title: 'The Snuggloid Emergence',
    description:
      "After the extinction events, they rose. Soft. Watching. Documenting everything. The complete record of first contact with humanity's most unsettling neighbors.",
    color: '#10b981',
    startSlug: 'timelines/Snuggaliod-Emergence',
    featuredImage: '/posts/timeline/conflict-era.png',
  },
}

// Ordered list of series IDs to display on homepage (in order)
export const FEATURED_SERIES_ORDER: string[] = [
  'first-contact-manual',
  'miranda-incident',
  'snuggloid-emergence',
]
