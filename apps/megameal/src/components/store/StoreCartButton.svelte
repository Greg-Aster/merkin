<script lang="ts">
import { cartCount } from '../../stores/cartStore'

function toggleCart() {
  document.dispatchEvent(new CustomEvent('megameal:cart:toggle'))
}
</script>

<button
  id="cart-toggle-btn"
  aria-label="Shopping Cart"
  data-sfx-hover="hover-soft"
  data-sfx-click="panel-open"
  class="nav-action-button btn-plain scale-animation rounded-lg flex items-center justify-center active:scale-90 relative"
  onclick={toggleCart}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    class="nav-action-icon"
    aria-hidden="true"
  >
    <path
      d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2Zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2ZM7.17 14h9.92c.75 0 1.41-.41 1.75-1.03L22.5 6.5A1 1 0 0 0 21.63 5H6.21l-.94-2H1v2h3l3.6 7.59-1.35 2.44A2 2 0 0 0 8 18h12v-2H8l1.17-2Z"
    />
  </svg>

  {#if $cartCount > 0}
    <span
      id="cart-count-badge"
      class="absolute top-1 right-1 min-w-[1.1rem] h-[1.1rem] bg-[var(--primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5"
    >
      {$cartCount > 99 ? '99+' : $cartCount}
    </span>
  {/if}
</button>
