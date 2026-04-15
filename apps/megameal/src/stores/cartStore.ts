import { writable, derived, get } from 'svelte/store'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  sku?: string
}

const CART_STORAGE_KEY = 'megameal-cart'

function loadFromStorage(): CartItem[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
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

  return {
    subscribe,

    /** Must be called from onMount — not safe at module level (SSR) */
    init() {
      set(loadFromStorage())
    },

    add(item: Omit<CartItem, 'quantity'>) {
      update(items => {
        const existing = items.find(i => i.id === item.id)
        let next: CartItem[]
        if (existing) {
          next = items.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        } else {
          next = [...items, { ...item, quantity: 1 }]
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
        const next = quantity <= 0
          ? items.filter(i => i.id !== id)
          : items.map(i => i.id === id ? { ...i, quantity } : i)
        saveToStorage(next)
        return next
      })
    },

    clear() {
      set([])
      saveToStorage([])
    },
  }
}

export const cart = createCartStore()

/** Total number of individual items (sum of quantities) */
export const cartCount = derived(cart, $cart =>
  $cart.reduce((sum, item) => sum + item.quantity, 0)
)

/** Total price */
export const cartTotal = derived(cart, $cart =>
  $cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
)
