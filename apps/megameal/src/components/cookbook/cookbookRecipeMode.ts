const storageKey = 'megameal-cookbook-recipe-mode-v2'

let cleanupCookbookRecipeMode: (() => void) | null = null

export function initCookbookRecipeMode() {
  cleanupCookbookRecipeMode?.()

  const reader = document.querySelector('#cookbook-reader')
  if (!(reader instanceof HTMLElement)) return

  const controls = Array.from(
    reader.querySelectorAll<HTMLElement>('[data-recipe-mode-control]'),
  )
  const downloads = Array.from(
    document.querySelectorAll<HTMLElement>('[data-recipe-download-mode]'),
  )
  const abortController = new AbortController()

  const setMode = (mode: string | null) => {
    const nextMode = mode === 'terrestrial' ? 'terrestrial' : 'original'
    reader.dataset.recipeMode = nextMode
    window.localStorage?.setItem(storageKey, nextMode)

    controls.forEach(control => {
      const isActive =
        control.getAttribute('data-recipe-mode-control') === nextMode
      control.setAttribute('aria-pressed', String(isActive))
      control.classList.toggle('bg-white', isActive)
      control.classList.toggle('text-black', isActive)
      control.classList.toggle('shadow-sm', isActive)
      control.classList.toggle('dark:bg-black/50', isActive)
      control.classList.toggle('dark:text-white', isActive)
    })

    downloads.forEach(download => {
      const isActive =
        download.getAttribute('data-recipe-download-mode') === nextMode
      download.setAttribute('aria-current', isActive ? 'true' : 'false')
    })
  }

  controls.forEach(control => {
    control.addEventListener(
      'click',
      () => {
        setMode(control.getAttribute('data-recipe-mode-control'))
      },
      { signal: abortController.signal },
    )
  })

  setMode(window.localStorage?.getItem(storageKey))
  cleanupCookbookRecipeMode = () => abortController.abort()
}
