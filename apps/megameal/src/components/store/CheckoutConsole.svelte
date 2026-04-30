<script lang="ts">
import { onMount } from 'svelte'
import { cart, cartCount, cartTotal } from '../../stores/cartStore'

let isConfirmed = $state(false)

onMount(() => {
  cart.init()
})

function completeCheckout() {
  isConfirmed = true
  cart.clear()
}
</script>

<section class="mx-auto max-w-5xl px-3 py-5 sm:px-4 md:py-8">
  <header class="mb-6 max-w-3xl md:mb-8">
    <p class="text-xs uppercase tracking-[0.28em] text-amber-300/80">
      Acquisition Terminal
    </p>
    <h1 class="mt-3 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
      Checkout Processing
    </h1>
    <p class="mt-4 text-base leading-7 text-slate-300">
      Payments remain fictional. The transaction surface is real enough to make
      the fiction uncomfortable.
    </p>
  </header>

  {#if isConfirmed}
    <div class="rounded-2xl border border-emerald-400/20 bg-emerald-950/30 p-5 shadow-2xl shadow-emerald-950/20 sm:p-8 md:rounded-3xl">
      <p class="text-xs uppercase tracking-[0.24em] text-emerald-300/70">
        Confirmation Archive
      </p>
      <h2 class="mt-3 text-2xl font-bold text-white sm:text-3xl">
        Acquisition Accepted
      </h2>
      <p class="mt-4 max-w-2xl text-slate-300">
        Your order has been entered into the fulfillment lattice. A receipt will
        arrive when your timeline stabilizes enough to remember it.
      </p>
      <div class="mt-6">
        <a
          href="/store/"
          data-sfx-hover="hover-soft"
          data-sfx-click="sweep"
          class="inline-flex items-center rounded-xl bg-[var(--primary)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--primary-hover)]"
        >
          Return to Catalog
        </a>
      </div>
    </div>
  {:else if $cartCount === 0}
    <div class="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-center shadow-2xl sm:p-8 md:rounded-3xl">
      <p class="text-lg italic text-slate-400">
        No items are awaiting commitment.
      </p>
      <p class="mt-3 text-sm text-slate-500">
        The terminal remains open in case your resolve weakens.
      </p>
      <div class="mt-6">
        <a
          href="/store/"
          data-sfx-hover="hover-soft"
          data-sfx-click="sweep"
          class="inline-flex items-center rounded-xl border border-white/10 bg-slate-900 px-5 py-3 font-semibold text-slate-100 transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
        >
          Browse the catalog
        </a>
      </div>
    </div>
  {:else}
    <div class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div class="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl sm:p-6 md:rounded-3xl">
        <h2 class="text-xl font-bold text-white">
          Pending Commitments
        </h2>
        <ul class="mt-5 space-y-4">
          {#each $cart as item (item.id)}
            <li class="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div>
                  <p class="font-semibold text-slate-100">{item.name}</p>
                  {#if item.sku}
                    <p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {item.sku}
                    </p>
                  {/if}
                  {#if item.href}
                    <a
                      href={item.href}
                      data-sfx-hover="hover-soft"
                      data-sfx-click="soft"
                      class="mt-2 inline-block text-sm text-cyan-300 transition hover:text-cyan-200"
                    >
                      Review item dossier
                    </a>
                  {/if}
                </div>
                <div class="text-left sm:text-right">
                  <p class="text-sm text-slate-400">Qty {item.quantity}</p>
                  <p class="mt-1 font-semibold text-emerald-400">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            </li>
          {/each}
        </ul>
      </div>

      <aside class="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl sm:p-6 md:rounded-3xl">
        <p class="text-xs uppercase tracking-[0.24em] text-slate-500">
          Transaction Summary
        </p>
        <div class="mt-5 space-y-3 text-sm text-slate-300">
          <div class="flex items-center justify-between">
            <span>Items</span>
            <span>{$cartCount}</span>
          </div>
          <div class="flex items-center justify-between">
            <span>Subtotal</span>
            <span>${$cartTotal.toFixed(2)}</span>
          </div>
          <div class="flex items-center justify-between">
            <span>Temporal handling</span>
            <span>$0.00</span>
          </div>
          <div class="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold text-white">
            <span>Total obligation</span>
            <span>${$cartTotal.toFixed(2)}</span>
          </div>
        </div>

        <p class="mt-6 text-sm leading-6 text-slate-400">
          By completing checkout, you acknowledge that shipment windows,
          causality, and emotional aftereffects may vary by region.
        </p>

        <button
          data-sfx-hover="hover-emphasis"
          data-sfx-click="success"
          class="mt-6 w-full rounded-xl bg-[var(--primary)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--primary-hover)]"
          onclick={completeCheckout}
        >
          Finalize Acquisition
        </button>

        <button
          data-sfx-hover="hover-soft"
          data-sfx-click="warning"
          class="mt-3 w-full rounded-xl border border-white/10 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-rose-400/40 hover:text-rose-300"
          onclick={() => cart.clear()}
        >
          Void entire order
        </button>
      </aside>
    </div>
  {/if}
</section>
