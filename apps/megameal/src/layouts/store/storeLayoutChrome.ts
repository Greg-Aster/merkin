type StoreLayoutCleanup = () => void

type StoreLayoutWindow = Window &
  typeof globalThis & {
    __megamealStoreLayoutParallaxCleanup?: StoreLayoutCleanup
  }

export function initStoreLayoutChrome() {
  if (typeof window === 'undefined') return
  const storeWindow = window as StoreLayoutWindow

  const existingCleanup = storeWindow.__megamealStoreLayoutParallaxCleanup
  if (typeof existingCleanup === 'function') {
    existingCleanup()
  }

  const parallaxBanner = document.getElementById('parallax-banner')
  if (parallaxBanner) {
    setTimeout(() => {
      parallaxBanner.classList.add('loaded')
    }, 100)
  }

  const elementsToAnimate = document.querySelectorAll('.onload-animation')
  elementsToAnimate.forEach(element => {
    element.classList.add('loaded')
  })

  const parallaxImage = document.getElementById('parallax-image')
  if (!parallaxImage) {
    storeWindow.__megamealStoreLayoutParallaxCleanup = () => {}
    return
  }
  const parallaxImageElement = parallaxImage

  const scrollFactor = -0.1
  let ticking = false

  function updateParallax() {
    const scrollY = window.scrollY
    const offset = scrollY * scrollFactor
    parallaxImageElement.style.transform = `translate3d(0, ${offset}px, 0)`
    ticking = false
  }

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax)
      ticking = true
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
  updateParallax()

  storeWindow.__megamealStoreLayoutParallaxCleanup = () => {
    window.removeEventListener('scroll', handleScroll)
  }
}
