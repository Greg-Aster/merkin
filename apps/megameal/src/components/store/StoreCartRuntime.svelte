<script lang="ts">
import { onMount } from 'svelte'
import { type CartItem, cart } from '../../stores/cartStore'
import { url } from '../../utils/url-utils'

function extractCartItem(
  button: HTMLElement,
): Omit<CartItem, 'quantity'> | null {
  const id = button.dataset.productId || ''
  const name = button.dataset.productName || ''
  const price = Number(button.dataset.productPrice || '0')

  if (!id || !name || !Number.isFinite(price)) return null

  return {
    id,
    name,
    price,
    sku: button.dataset.productSku || undefined,
    href: button.dataset.productHref || undefined,
    image: button.dataset.productImage || undefined,
  }
}

onMount(() => {
  cart.init()

  const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return

    const button = target.closest('[data-add-to-cart]')
    if (!(button instanceof HTMLElement)) return

    const item = extractCartItem(button)
    if (!item) return

    event.preventDefault()
    event.stopPropagation()

    document.dispatchEvent(
      new CustomEvent('megameal:cart:add', {
        detail: item,
      }),
    )
  }

  const handleCheckout = () => {
    window.location.href = url('/store/checkout/')
  }

  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('megameal:cart:checkout', handleCheckout)

  return () => {
    document.removeEventListener('click', handleDocumentClick)
    document.removeEventListener('megameal:cart:checkout', handleCheckout)
  }
})
</script>
