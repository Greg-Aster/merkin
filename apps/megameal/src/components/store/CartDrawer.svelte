<script lang="ts">
import { onMount } from 'svelte'
import {
  type CartItem,
  cart,
  cartCount,
  cartTotal,
} from '../../stores/cartStore'
import { url } from '../../utils/url-utils'

let isOpen = $state(false)

// Expose open/close to vanilla JS (called from Add to Cart buttons and nav icon)
onMount(() => {
  cart.init()

  const open = () => {
    isOpen = true
  }
  const close = () => {
    isOpen = false
  }
  const toggle = () => {
    isOpen = !isOpen
  }
  const handleAdd = (e: Event) => {
    const detail = (e as CustomEvent<CartItem>).detail
    if (detail) {
      cart.add(detail)
      isOpen = true
      document.dispatchEvent(
        new CustomEvent('megameal:sfx', { detail: { id: 'cart-add' } }),
      )
    }
  }

  document.addEventListener('megameal:cart:open', open)
  document.addEventListener('megameal:cart:close', close)
  document.addEventListener('megameal:cart:toggle', toggle)
  document.addEventListener('megameal:cart:add', handleAdd)

  return () => {
    document.removeEventListener('megameal:cart:open', open)
    document.removeEventListener('megameal:cart:close', close)
    document.removeEventListener('megameal:cart:toggle', toggle)
    document.removeEventListener('megameal:cart:add', handleAdd)
  }
})

function closeDrawer() {
  isOpen = false
}

function handleBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).id === 'cart-backdrop') {
    closeDrawer()
    document.dispatchEvent(
      new CustomEvent('megameal:sfx', { detail: { id: 'panel-close' } }),
    )
  }
}

const emptyMessages = [
  'Your cart is as empty as the void. Which is, technically, full of void.',
  'Nothing here. The products have noted your reluctance.',
  'Cart currently unoccupied. The shelf space is available. The shelf space is judging you.',
  'You have committed to nothing. The corporation respects this. For now.',
]
const emptyMessage =
  emptyMessages[Math.floor(Math.random() * emptyMessages.length)]
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    id="cart-backdrop"
    role="presentation"
    class="fixed inset-0 bg-black/60 z-40 transition-opacity"
    onclick={handleBackdropClick}
  ></div>

  <!-- Drawer -->
  <div
    role="dialog"
    aria-label="Shopping Cart"
    aria-modal="true"
    class="fixed top-0 right-0 h-full w-full max-w-md bg-[var(--card-bg,#1e1e2e)] border-l border-slate-700 z-50 flex flex-col shadow-2xl"
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-slate-700/60 px-4 py-4 sm:px-6">
      <h2 class="text-lg font-bold text-slate-100">
        Your Commitments
        {#if $cartCount > 0}
          <span class="ml-2 text-sm font-normal text-slate-400">({$cartCount} {$cartCount === 1 ? 'item' : 'items'})</span>
        {/if}
      </h2>
      <button
        onclick={closeDrawer}
        aria-label="Close cart"
        data-sfx-hover="hover-soft"
        data-sfx-click="panel-close"
        class="text-slate-400 hover:text-slate-100 transition p-1 rounded hover:bg-slate-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>

    <!-- Items -->
    <div class="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
      {#if $cart.length === 0}
        <div class="flex flex-col items-center justify-center h-full gap-4 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12 text-slate-600">
            <path d="M17 18a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2c0-1.11.89-2 2-2M1 2h3.27l.94 2H20a1 1 0 0 1 1 1c0 .17-.05.34-.12.5l-3.58 6.47c-.37.63-1.04 1.03-1.8 1.03H8.1l-.9 1.63-.03.12a.25.25 0 0 0 .25.25H19v2H7a2 2 0 0 1-2-2c0-.35.09-.68.24-.96L6.6 14 3 6H1V2m6 16a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2c0-1.11.89-2 2-2z"/>
          </svg>
          <p class="text-slate-400 text-sm italic max-w-xs">{emptyMessage}</p>
          <button
            onclick={closeDrawer}
            data-sfx-hover="hover-soft"
            data-sfx-click="panel-close"
            class="text-xs text-[var(--primary)] hover:underline"
          >
            Return to the catalog
          </button>
        </div>
      {:else}
        <ul class="space-y-4">
          {#each $cart as item (item.id)}
            <li class="flex flex-col gap-3 border-b border-slate-700/40 pb-4 sm:flex-row sm:items-start sm:gap-4">
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-slate-200 text-sm truncate">{item.name}</p>
                {#if item.href}
                  <a
                    href={item.href}
                    data-sfx-hover="hover-soft"
                    data-sfx-click="soft"
                    class="mt-1 inline-block text-xs text-cyan-300 transition hover:text-cyan-200"
                  >
                    View item
                  </a>
                {/if}
                {#if item.sku}
                  <p class="text-xs text-slate-500">SKU: {item.sku}</p>
                {/if}
                {#if item.description}
                  <p class="mt-2 text-xs leading-5 text-slate-400">{item.description}</p>
                {/if}
                {#if item.options?.length}
                  <dl class="mt-2 grid gap-1 text-xs text-slate-400">
                    {#each item.options as option}
                      <div class="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
                        <dt class="truncate uppercase tracking-[0.14em] text-slate-500">
                          {option.label}
                        </dt>
                        <dd class="text-slate-300">{option.value}</dd>
                      </div>
                    {/each}
                  </dl>
                {/if}
                <p class="text-emerald-400 text-sm font-semibold mt-1">${item.price.toFixed(2)} each</p>
              </div>
              <div class="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
                {#if item.quantityLocked}
                  <span class="rounded bg-slate-800 px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    One-off
                  </span>
                {:else}
                  <button
                    onclick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                    aria-label="Decrease quantity"
                    data-sfx-hover="hover-soft"
                    data-sfx-click="soft"
                    class="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center transition text-sm font-bold"
                  >−</button>
                  <span class="w-6 text-center text-slate-200 text-sm">{item.quantity}</span>
                  <button
                    onclick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                    aria-label="Increase quantity"
                    data-sfx-hover="hover-soft"
                    data-sfx-click="select"
                    class="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center transition text-sm font-bold"
                  >+</button>
                {/if}
                <button
                  onclick={() => cart.remove(item.id)}
                  aria-label="Remove item"
                  data-sfx-hover="hover-soft"
                  data-sfx-click="warning"
                  class="w-7 h-7 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-500 hover:text-rose-400 flex items-center justify-center transition ml-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- Footer -->
    {#if $cart.length > 0}
      <div class="space-y-3 border-t border-slate-700/60 px-4 py-4 sm:px-6">
        <div class="flex justify-between items-center">
          <span class="text-slate-400 text-sm">Total</span>
          <span class="text-xl font-bold text-emerald-400">${$cartTotal.toFixed(2)}</span>
        </div>
        <p class="text-xs text-slate-500 italic">
          Proceeding to checkout constitutes acknowledgment that you have read, understood, and accepted the Terms and Conditions, which do not yet exist but will be binding retroactively.
        </p>
        <a
          class="block w-full text-center btn-primary text-white font-semibold py-3 px-4 rounded-[var(--radius-medium,8px)] transition-all hover:bg-[var(--primary-hover)] active:scale-95"
          href={url('/store/checkout/')}
          data-sfx-hover="hover-emphasis"
          data-sfx-click="confirm"
        >
          Proceed to Checkout
        </a>
        <button
          onclick={() => { cart.clear() }}
          data-sfx-hover="hover-soft"
          data-sfx-click="panel-back"
          class="w-full text-xs text-slate-500 hover:text-rose-400 transition py-1"
        >
          Abandon cart (the items will remember)
        </button>
      </div>
    {/if}
  </div>
{/if}
