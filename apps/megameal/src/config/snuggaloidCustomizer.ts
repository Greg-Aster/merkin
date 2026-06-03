import type { ProductCustomizerConfig } from '../types/product-customizer'

type SnuggaloidCustomizerOptions = {
  basePrice?: number
  href?: string
  image?: string
}

export function buildSnuggaloidCustomizerConfig({
  basePrice = 104.99,
  href = '/store/snuggaloids/',
  image = '/store/snuggaloids/snug-ref-22.webp',
}: SnuggaloidCustomizerOptions = {}): ProductCustomizerConfig {
  return {
    eyebrow: 'Mutation Intake',
    title: 'Customize Your Own Snuggaloid',
    description:
      'Configure a one-off companion request through the Qarnivor gene-editing desk. The form records desired traits; final biology remains opinionated.',
    variant: 'mutation',
    cartKind: 'snuggaloid-custom',
    baseItem: {
      id: 'snuggaloid-custom',
      name: 'Custom Snuggaloid Mutation Request',
      price: basePrice,
      sku: 'SNG-CUSTOM',
      href,
      image,
      description:
        'Custom Snuggaloid request. Final unit is handmade, one-off, and subject to containment review.',
    },
    summaryTitle: 'Selected Mutation Chain',
    priceLabel: 'Estimated Adoption Fee',
    submitLabel: 'Add Mutation Request',
    resetLabel: 'Clear Gene Table',
    steps: [
      {
        id: 'fur',
        kicker: 'Exterior expression',
        title: 'Fur Signal',
        prompt: 'Select the surface treatment that should attempt to happen.',
        options: [
          {
            id: 'reactor-blue',
            label: 'Reactor Blue Bloom',
            description: 'Cool blue fur with faint containment-lab personality.',
            cartValue: 'Reactor blue bloom',
          },
          {
            id: 'hazard-carnival',
            label: 'Hazard Carnival',
            description: 'Aggressive multicolor fur suitable for warning labels.',
            priceDelta: 12,
            cartValue: 'Hazard carnival multicolor fur',
          },
          {
            id: 'night-fog',
            label: 'Night Fog Variant',
            description: 'Dark plush body with low-visibility hallway behavior.',
            priceDelta: 8,
            cartValue: 'Night fog dark fur',
          },
        ],
      },
      {
        id: 'ocular',
        kicker: 'Ocular committee',
        title: 'Eye Plan',
        prompt: 'Choose how the unit should look back.',
        options: [
          {
            id: 'standard-two',
            label: 'Two-Eye Domestic',
            description: 'Traditional companion gaze, almost explainable.',
            cartValue: 'Two-eye domestic gaze',
          },
          {
            id: 'many-watchful',
            label: 'Many Watchful Eyes',
            description: 'Extra ocular count for households with secrets.',
            priceDelta: 18,
            cartValue: 'Many watchful eyes',
          },
          {
            id: 'sonar',
            label: 'Sonar / Non-Ocular',
            description: 'No visible eyes. Still somehow attentive.',
            priceDelta: 15,
            cartValue: 'Sonar non-ocular sensing',
          },
        ],
      },
      {
        id: 'interior',
        kicker: 'Internal keepsake matrix',
        title: 'Embedded Interior',
        prompt: 'Pick the sealed payload the household will never fully verify.',
        options: [
          {
            id: 'memory-foam',
            label: 'Dense Memory Foam',
            description: 'Soft, holdable, and unlikely to answer questions.',
            cartValue: 'Dense memory foam fill',
          },
          {
            id: 'tiny-organs',
            label: 'Tiny Organ Set',
            description: 'Touch-detectable internal lore for brave hands.',
            priceDelta: 22,
            cartValue: 'Tiny sealed organ set',
          },
          {
            id: 'puzzle-cache',
            label: 'Puzzle Piece Cache',
            description: 'A small rattle of missing pieces and bad implications.',
            priceDelta: 10,
            cartValue: 'Puzzle piece cache',
          },
        ],
      },
      {
        id: 'temperament',
        kicker: 'Behavioral weather',
        title: 'Temperament',
        prompt: 'Select the domestic haunting profile.',
        options: [
          {
            id: 'hallway-sentinel',
            label: 'Hallway Sentinel',
            description: 'Stays where it can supervise thresholds.',
            cartValue: 'Hallway sentinel',
          },
          {
            id: 'vent-listener',
            label: 'Vent Listener',
            description: 'Calm, quiet, and interested in air movement.',
            cartValue: 'Vent listener',
          },
          {
            id: 'sleep-witness',
            label: 'Sleep Witness',
            description: 'A comforting presence for customers with curtains.',
            priceDelta: 9,
            cartValue: 'Sleep witness',
          },
        ],
      },
      {
        id: 'mutation',
        kicker: 'Optional abnormality',
        title: 'Mutation Addendum',
        prompt: 'Choose the mutation most likely to pass inspection.',
        options: [
          {
            id: 'none-declared',
            label: 'No Mutation Declared',
            description: 'A conservative answer that fools no one.',
            cartValue: 'No mutation declared',
          },
          {
            id: 'scent-glands',
            label: 'Mystery Scent Glands',
            description: 'Subtle environmental storytelling with no refund path.',
            priceDelta: 16,
            cartValue: 'Mystery scent glands',
          },
          {
            id: 'extra-limbs',
            label: 'Extra Limb Probability',
            description: 'Not a promise. More of a statistical invitation.',
            priceDelta: 24,
            cartValue: 'Extra limb probability',
          },
        ],
      },
    ],
  }
}
