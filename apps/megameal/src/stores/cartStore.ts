import { derived, writable } from 'svelte/store'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  sku?: string
  href?: string
  image?: string
  kind?: string
  description?: string
  options?: CartItemOption[]
  quantityLocked?: boolean
}

export interface CartItemOption {
  label: string
  value: string
}

const CART_STORAGE_KEY = 'megameal-cart'

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false

  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    Number.isFinite(item.price) &&
    typeof item.quantity === 'number' &&
    Number.isFinite(item.quantity)
  )
}

function normalizeCartItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return []

  return items.filter(isCartItem).map(item => {
    const quantityLocked = item.quantityLocked === true
    return {
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: quantityLocked ? 1 : Math.max(1, Math.floor(item.quantity)),
      sku: item.sku,
      href: item.href,
      image: item.image,
      kind: item.kind,
      description: item.description,
      options: Array.isArray(item.options)
        ? item.options.filter(
            option =>
              option &&
              typeof option === 'object' &&
              typeof (option as CartItemOption).label === 'string' &&
              typeof (option as CartItemOption).value === 'string',
          )
        : undefined,
      quantityLocked,
    }
  })
}

function loadFromStorage(): CartItem[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return normalizeCartItems(parsed)
  } catch {
    return []
  }
}

function saveToStorage(items: CartItem[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

function createCartStore() {
  const { subscribe, set, update } = writable<CartItem[]>([])
  let isInitialized = false
  let hasStorageListener = false

  return {
    subscribe,

    /** Must be called from onMount — not safe at module level (SSR) */
    init() {
      if (typeof window === 'undefined') return

      set(loadFromStorage())
      isInitialized = true

      if (!hasStorageListener) {
        window.addEventListener('storage', event => {
          if (event.key === CART_STORAGE_KEY) {
            set(loadFromStorage())
          }
        })
        hasStorageListener = true
      }
    },

    add(item: Omit<CartItem, 'quantity'> & { quantity?: number }) {
      update(items => {
        const quantityToAdd = item.quantityLocked
          ? 1
          : Math.max(1, Math.floor(item.quantity ?? 1))
        const existing = items.find(i => i.id === item.id)
        let next: CartItem[]
        if (existing) {
          next = items.map(i => {
            if (i.id !== item.id) return i

            const quantityLocked =
              i.quantityLocked || item.quantityLocked === true
            return {
              ...i,
              quantity: quantityLocked ? 1 : i.quantity + quantityToAdd,
              sku: item.sku ?? i.sku,
              href: item.href ?? i.href,
              image: item.image ?? i.image,
              kind: item.kind ?? i.kind,
              description: item.description ?? i.description,
              options: item.options ?? i.options,
              quantityLocked,
            }
          })
        } else {
          next = [...items, { ...item, quantity: quantityToAdd }]
        }
        saveToStorage(next)
        return next
      })
    },

    remove(id: string) {
      update(items => {
        const next = items.filter(i => i.id !== id)
        saveToStorage(next)
        return next
      })
    },

    updateQuantity(id: string, quantity: number) {
      update(items => {
        const next =
          quantity <= 0
            ? items.filter(i => i.id !== id)
            : items.map(i =>
                i.id === id
                  ? { ...i, quantity: i.quantityLocked ? 1 : quantity }
                  : i,
              )
        saveToStorage(next)
        return next
      })
    },

    clear() {
      set([])
      saveToStorage([])
    },

    isInitialized() {
      return isInitialized
    },
  }
}

export const cart = createCartStore()

/** Total number of individual items (sum of quantities) */
export const cartCount = derived(cart, $cart =>
  $cart.reduce((sum, item) => sum + item.quantity, 0),
)

/** Total price */
export const cartTotal = derived(cart, $cart =>
  $cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
)
