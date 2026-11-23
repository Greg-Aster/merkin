export type ProductCustomizerVariant = 'standard' | 'mutation'

export type ProductCustomizerOption = {
  id: string
  label: string
  description?: string
  priceDelta?: number
  cartLabel?: string
  cartValue?: string
}

export type ProductCustomizerStep = {
  id: string
  kicker?: string
  title: string
  prompt: string
  options: ProductCustomizerOption[]
}

export type ProductCustomizerBaseItem = {
  id: string
  name: string
  price: number
  sku?: string
  href?: string
  image?: string
  description?: string
}

export type ProductCustomizerConfig = {
  eyebrow?: string
  title: string
  description?: string
  variant?: ProductCustomizerVariant
  cartKind?: string
  baseItem: ProductCustomizerBaseItem
  steps: ProductCustomizerStep[]
  submitLabel?: string
  resetLabel?: string
  summaryTitle?: string
  priceLabel?: string
}
