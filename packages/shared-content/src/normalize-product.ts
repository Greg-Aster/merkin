import type { SharedProduct } from './types.ts'

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export function normalizeProduct(input: {
  slug: string
  data: Record<string, unknown>
}): SharedProduct {
  const { slug, data } = input

  return {
    id: slug,
    slug,
    title: asString(data.title) ?? slug,
    description: asString(data.description),
    price: asNumber(data.price),
    currency: asString(data.currency),
    image: asString(data.image),
    active: data.active === undefined ? true : data.active === true,
    ...data,
  }
}
