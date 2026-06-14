function syncCategoryControls(activeCategory: string) {
  document
    .querySelectorAll<HTMLButtonElement>('.category-filter')
    .forEach(candidate => {
      candidate.dataset.active =
        candidate.dataset.category === activeCategory ? 'true' : 'false'
    })

  document
    .querySelectorAll<HTMLSelectElement>('.category-select-control')
    .forEach(select => {
      select.value = activeCategory
    })
}

export function initStorefrontMarketplace() {
  const items = Array.from(
    document.querySelectorAll<HTMLElement>('.product-grid-item'),
  )
  const grid = document.getElementById('product-grid')
  const noResults = document.getElementById('no-results')
  const countEls = Array.from(
    document.querySelectorAll<HTMLElement>('.product-count'),
  )
  const sortSelects = Array.from(
    document.querySelectorAll<HTMLSelectElement>('.sort-select-control'),
  )
  const categorySelects = Array.from(
    document.querySelectorAll<HTMLSelectElement>('.category-select-control'),
  )
  const searchInputs = Array.from(
    document.querySelectorAll<HTMLInputElement>('.product-search-control'),
  )

  let activeCategory = 'all'
  let activeSearch = ''

  function applyFilter() {
    let visible = 0
    for (const item of items) {
      const category = item.dataset.category ?? ''
      const search = item.dataset.search ?? ''
      const matchesCategory =
        activeCategory === 'all' || category === activeCategory
      const matchesSearch = !activeSearch || search.includes(activeSearch)
      const show = matchesCategory && matchesSearch
      item.classList.toggle('hidden', !show)
      if (show) visible += 1
    }

    for (const countEl of countEls) {
      countEl.textContent = `${visible} product${visible !== 1 ? 's' : ''}`
    }
    noResults?.classList.toggle('hidden', visible > 0)
    grid?.classList.toggle('hidden', visible === 0)
  }

  function applySort(value: string) {
    if (!grid) return

    const sorted = [...items].sort((left, right) => {
      switch (value) {
        case 'rating':
          return (
            Number.parseFloat(right.dataset.rating ?? '0') -
            Number.parseFloat(left.dataset.rating ?? '0')
          )
        case 'price-asc':
          return (
            Number.parseFloat(left.dataset.price ?? '0') -
            Number.parseFloat(right.dataset.price ?? '0')
          )
        case 'price-desc':
          return (
            Number.parseFloat(right.dataset.price ?? '0') -
            Number.parseFloat(left.dataset.price ?? '0')
          )
        case 'available':
          return (
            (left.dataset.availability === 'available' ? 0 : 1) -
            (right.dataset.availability === 'available' ? 0 : 1)
          )
        default:
          return (
            Number.parseInt(right.dataset.featured ?? '0', 10) -
            Number.parseInt(left.dataset.featured ?? '0', 10)
          )
      }
    })

    for (const item of sorted) grid.appendChild(item)
  }

  document
    .querySelectorAll<HTMLButtonElement>('.category-filter')
    .forEach(button => {
      button.addEventListener('click', () => {
        activeCategory = button.dataset.category ?? 'all'
        syncCategoryControls(activeCategory)
        applyFilter()
      })
    })

  categorySelects.forEach(select => {
    select.addEventListener('change', () => {
      activeCategory = select.value
      syncCategoryControls(activeCategory)
      applyFilter()
    })
  })

  searchInputs.forEach(input => {
    input.addEventListener('input', () => {
      activeSearch = input.value.trim().toLowerCase()
      searchInputs.forEach(candidate => {
        if (candidate !== input) candidate.value = input.value
      })
      applyFilter()
    })
  })

  sortSelects.forEach(sortSelect => {
    sortSelect.addEventListener('change', () => {
      sortSelects.forEach(candidate => {
        if (candidate !== sortSelect) candidate.value = sortSelect.value
      })
      applySort(sortSelect.value)
    })
  })
}

export function initProductDetailTabs() {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.detail-tab')
  const panels = document.querySelectorAll<HTMLElement>('.detail-panel')

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab
      tabs.forEach(candidate => {
        const active = candidate.dataset.tab === target
        candidate.classList.toggle('border-[var(--primary)]', active)
        candidate.classList.toggle('text-[var(--primary)]', active)
        candidate.classList.toggle('border-transparent', !active)
        candidate.classList.toggle('text-slate-400', !active)
        candidate.setAttribute('aria-selected', active ? 'true' : 'false')
      })
      panels.forEach(panel =>
        panel.classList.toggle('hidden', panel.id !== `panel-${target}`),
      )
    })
  })
}

export function initProductCardExpansion() {
  const productCards = document.querySelectorAll<HTMLElement>(
    '.product-card-wrapper',
  )
  let currentlySelectedCard: HTMLElement | null = null

  productCards.forEach(card => {
    if (card.dataset.productCardExpansionBound === 'true') return
    card.dataset.productCardExpansionBound = 'true'

    const clickableAreas = card.querySelectorAll<HTMLElement>(
      '.product-clickable-area',
    )

    clickableAreas.forEach(area => {
      area.addEventListener('click', event => {
        if ((event.target as HTMLElement).closest('.product-cart-button')) {
          return
        }

        const clickedCard = card
        if (currentlySelectedCard && currentlySelectedCard !== clickedCard) {
          currentlySelectedCard.classList.remove('selected', 'expanded')
        }

        if (clickedCard.classList.contains('selected')) {
          clickedCard.classList.remove('selected', 'expanded')
          currentlySelectedCard = null
          return
        }

        clickedCard.classList.add('selected', 'expanded')
        currentlySelectedCard = clickedCard
      })
    })
  })
}
