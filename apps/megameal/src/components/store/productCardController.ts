export interface ProductCardPayload {
  descriptionData?: string
  formActionUrl?: string
  preWrittenReviewsData?: Array<{
    author?: string
    date?: string
    rating?: number
    comment?: string
  }>
  productId: string
  productName: string
  qandaData?: Array<{ question?: string; answer?: string }>
  realDescriptionData?: string
  shippingNoteData?: string
  specificationsData?: Array<{ label?: string; value?: string }>
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function createReviewFormHTML(
  currentProductId: string,
  currentProductName: string,
  safeProdId: string,
): string {
  const escapedProductName = currentProductName
    ? escapeHtmlAttr(currentProductName)
    : ''
  return `
    <form class="leave-review-form mt-8 pt-6 border-t border-slate-700/30 dark:border-slate-600/50">
      <h4 class="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">Leave Your Review</h4>
      <input type="hidden" name="productId" value="${escapeHtmlAttr(currentProductId)}">
      <input type="hidden" name="productName" value="${escapedProductName}">

      <div class="mb-4">
        <label for="reviewerName-${safeProdId}" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name (Optional)</label>
        <input type="text" name="reviewerName" id="reviewerName-${safeProdId}" class="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors duration-150 ease-in-out" placeholder="Your Name">
      </div>

      <div class="mb-4">
        <label for="reviewerRating-${safeProdId}" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rating (1-5)</label>
        <input type="number" name="reviewerRating" id="reviewerRating-${safeProdId}" min="1" max="5" required class="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors duration-150 ease-in-out" placeholder="5">
      </div>

      <div class="mb-4">
        <label for="reviewerComment-${safeProdId}" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Comment (Required)</label>
        <textarea name="reviewerComment" id="reviewerComment-${safeProdId}" rows="4" required class="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors duration-150 ease-in-out" placeholder="Your insightful review..."></textarea>
      </div>

      <button type="submit" data-sfx-click="select" class="w-full sm:w-auto btn-primary text-white font-semibold py-2.5 px-5 rounded-[var(--radius-medium)] transition-all duration-200 ease-in-out hover:bg-[var(--primary-hover)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800">Submit Review</button>
      <div id="review-form-message-${safeProdId}" class="review-form-message mt-3 text-sm"></div>
    </form>
  `
}

const STAR_FULL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>'
const STAR_HALF_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon"><path d="M12 15.4V6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4zM20 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-2-1.74z"/></svg>'
const STAR_EMPTY_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon"><path d="M12 17.27l6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27zm0-2.54l-4.57 2.77 1.18-5.08L4.36 9.8l5.21-.45L12 4.6l2.43 4.75 5.21.45-4.25 3.64 1.18 5.08L12 14.73z"/></svg>'

export function mountProductCard(
  cardElement: HTMLElement,
  payload: ProductCardPayload,
): void {
  if (cardElement.dataset.productCardBound === 'true') return
  cardElement.dataset.productCardBound = 'true'

  const {
    descriptionData,
    formActionUrl,
    preWrittenReviewsData,
    productId,
    productName,
    qandaData,
    realDescriptionData,
    shippingNoteData,
    specificationsData,
  } = payload

  const trigger = cardElement.querySelector<HTMLElement>(
    '.card-expansion-trigger',
  )
  if (trigger) {
    trigger.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        cardElement.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true }),
        )
      }
    })
  }

  const mainImageEl = cardElement.querySelector<HTMLImageElement>(
    '.product-main-image',
  )
  const prevButton = cardElement.querySelector<HTMLElement>('.gallery-prev')
  const nextButton = cardElement.querySelector<HTMLElement>('.gallery-next')

  const hideGalleryNav = () => {
    if (prevButton) prevButton.style.display = 'none'
    if (nextButton) nextButton.style.display = 'none'
  }

  if (mainImageEl?.dataset.allImages) {
    try {
      const images = JSON.parse(mainImageEl.dataset.allImages) as string[]
      let currentImageIndex = 0

      const updateImage = () => {
        if (images.length > 0) {
          mainImageEl.src = images[currentImageIndex]
          mainImageEl.alt = `Product image ${currentImageIndex + 1} of ${images.length}`
        }
        const display = images.length > 1 ? 'block' : 'none'
        if (prevButton) prevButton.style.display = display
        if (nextButton) nextButton.style.display = display
      }

      if (images.length <= 1) {
        hideGalleryNav()
      } else {
        prevButton?.addEventListener('click', event => {
          event.stopPropagation()
          currentImageIndex =
            (currentImageIndex - 1 + images.length) % images.length
          updateImage()
        })
        nextButton?.addEventListener('click', event => {
          event.stopPropagation()
          currentImageIndex = (currentImageIndex + 1) % images.length
          updateImage()
        })
      }
      updateImage()
    } catch (error) {
      console.error(
        `[ProductCard ${productId}] Failed to parse images for gallery:`,
        error,
      )
      hideGalleryNav()
    }
  } else {
    hideGalleryNav()
  }

  const tabSection = cardElement.querySelector<HTMLElement>(
    '.expandable-details .details-content',
  )
  if (!tabSection) return

  const tabLinks = Array.from(
    tabSection.querySelectorAll<HTMLElement>('.tab-link[role="tab"]'),
  )
  const tabPanels = Array.from(
    tabSection.querySelectorAll<HTMLElement>('.tab-panel[role="tabpanel"]'),
  )

  const activateTab = (linkToActivate: HTMLElement) => {
    const panelType = linkToActivate.dataset.tabType
    if (!panelType || !productId) return

    tabLinks.forEach(link => {
      link.dataset.active = 'false'
      link.setAttribute('aria-selected', 'false')
    })
    tabPanels.forEach(panel => {
      panel.style.display = 'none'
      panel.dataset.active = 'false'
    })

    linkToActivate.dataset.active = 'true'
    linkToActivate.setAttribute('aria-selected', 'true')

    const safeProductId = productId.replace(/\./g, '-')
    const targetPanelId = `tab-${panelType}-${safeProductId}`
    const targetPanel = tabSection.querySelector<HTMLElement>(
      `#${targetPanelId}`,
    )
    if (!targetPanel) return

    targetPanel.innerHTML = ''

    if (panelType === 'description') {
      targetPanel.innerHTML = descriptionData || 'No description available.'
      if (realDescriptionData) {
        const realDiv = document.createElement('div')
        realDiv.className =
          'mt-4 pt-4 border-t border-slate-600/40 text-xs text-slate-400 italic'
        realDiv.innerHTML = `<span class="font-semibold not-italic text-slate-300 uppercase tracking-wider text-[10px]">Reality Layer</span><br>${realDescriptionData}`
        if (shippingNoteData) {
          const shipP = document.createElement('p')
          shipP.className = 'mt-2'
          shipP.textContent = `Shipping: ${shippingNoteData}`
          realDiv.appendChild(shipP)
        }
        targetPanel.appendChild(realDiv)
      }
    } else if (panelType === 'specifications') {
      if (Array.isArray(specificationsData) && specificationsData.length > 0) {
        const dlElement = document.createElement('dl')
        dlElement.classList.add(
          'grid',
          'grid-cols-1',
          'sm:grid-cols-2',
          'gap-x-4',
          'gap-y-2',
          'text-sm',
        )
        specificationsData.forEach(spec => {
          if (
            spec &&
            typeof spec.label !== 'undefined' &&
            typeof spec.value !== 'undefined'
          ) {
            const dt = document.createElement('dt')
            dt.classList.add(
              'font-semibold',
              'text-slate-800',
              'dark:text-slate-200',
            )
            dt.textContent = spec.label
            const dd = document.createElement('dd')
            dd.classList.add(
              'text-slate-600',
              'dark:text-slate-300',
              'sm:col-start-2',
            )
            dd.textContent = spec.value
            dlElement.appendChild(dt)
            dlElement.appendChild(dd)
          }
        })
        targetPanel.appendChild(dlElement)
      } else {
        targetPanel.innerHTML =
          '<p class="text-slate-500 dark:text-slate-400 italic">No specifications available.</p>'
      }
    } else if (panelType === 'qanda') {
      if (Array.isArray(qandaData) && qandaData.length > 0) {
        qandaData.forEach(item => {
          if (
            item &&
            typeof item.question !== 'undefined' &&
            typeof item.answer !== 'undefined'
          ) {
            const qDiv = document.createElement('div')
            qDiv.classList.add(
              'qna-item',
              'mb-4',
              'pb-4',
              'border-b',
              'border-slate-200',
              'dark:border-slate-700',
              'last:border-b-0',
              'last:pb-0',
              'last:mb-0',
            )
            qDiv.innerHTML = `<h3 class="text-md font-semibold text-slate-800 dark:text-slate-100 mb-1">${item.question}</h3><p class="text-sm text-slate-600 dark:text-slate-300">${item.answer}</p>`
            targetPanel.appendChild(qDiv)
          }
        })
      } else {
        targetPanel.innerHTML =
          '<p class="text-slate-500 dark:text-slate-400 italic">No questions and answers available.</p>'
      }
    } else if (panelType === 'reviews') {
      if (
        Array.isArray(preWrittenReviewsData) &&
        preWrittenReviewsData.length > 0
      ) {
        preWrittenReviewsData.forEach(review => {
          const reviewDiv = document.createElement('div')
          reviewDiv.classList.add('review-item')

          const authorP = document.createElement('p')
          authorP.classList.add(
            'review-author',
            'text-slate-800',
            'dark:text-slate-200',
          )
          authorP.textContent = review.author || 'Anonymous'
          reviewDiv.appendChild(authorP)

          if (review.date) {
            const dateP = document.createElement('p')
            dateP.classList.add('review-date', 'text-xs', 'mb-1')
            try {
              dateP.textContent = new Date(review.date).toLocaleDateString(
                undefined,
                { year: 'numeric', month: 'long', day: 'numeric' },
              )
            } catch {
              dateP.textContent = review.date
            }
            reviewDiv.appendChild(dateP)
          }

          if (
            typeof review.rating === 'number' &&
            review.rating >= 0 &&
            review.rating <= 5
          ) {
            const ratingDiv = document.createElement('div')
            ratingDiv.classList.add(
              'review-rating',
              'flex',
              'items-center',
              'mb-1',
            )
            ratingDiv.setAttribute(
              'aria-label',
              `Rating: ${review.rating} out of 5 stars`,
            )

            const fullStars = Math.floor(review.rating)
            const halfStar = review.rating % 1 >= 0.5
            const emptyStars = 5 - fullStars - (halfStar ? 1 : 0)

            const appendStar = (svg: string) => {
              const starIcon = document.createElement('span')
              starIcon.innerHTML = svg
              ratingDiv.appendChild(starIcon)
            }
            for (let i = 0; i < fullStars; i++) appendStar(STAR_FULL_SVG)
            if (halfStar) appendStar(STAR_HALF_SVG)
            for (let i = 0; i < emptyStars; i++) appendStar(STAR_EMPTY_SVG)

            reviewDiv.appendChild(ratingDiv)
          }

          const commentP = document.createElement('p')
          commentP.classList.add(
            'review-comment',
            'text-slate-600',
            'dark:text-slate-300',
            'text-sm',
          )
          commentP.textContent = review.comment || 'No comment provided.'
          reviewDiv.appendChild(commentP)

          targetPanel.appendChild(reviewDiv)
        })
      } else {
        targetPanel.textContent = 'No reviews yet.'
      }

      const safeId = safeProductId
      const leaveReviewButton = document.createElement('button')
      leaveReviewButton.id = `leave-review-btn-${safeId}`
      leaveReviewButton.textContent = 'Leave a Review'
      leaveReviewButton.className =
        'leave-review-toggle-button mt-6 mb-4 px-4 py-2 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] focus:ring-offset-slate-50 dark:focus:ring-offset-slate-800 transition-colors duration-150'
      targetPanel.appendChild(leaveReviewButton)

      const reviewFormId = `review-form-instance-${safeId}`
      const formWrapper = document.createElement('div')
      formWrapper.innerHTML = createReviewFormHTML(
        productId,
        productName,
        safeId,
      )
      const reviewFormInstance = formWrapper.firstElementChild as
        | HTMLFormElement
        | null

      if (reviewFormInstance) {
        reviewFormInstance.id = reviewFormId
        reviewFormInstance.style.display = 'none'
        targetPanel.insertBefore(
          reviewFormInstance,
          leaveReviewButton.nextSibling,
        )

        reviewFormInstance.addEventListener('click', event => {
          event.stopPropagation()
        })
        reviewFormInstance
          .querySelectorAll('input, textarea, button[type="submit"]')
          .forEach(element => {
            element.addEventListener('focus', event => {
              event.stopPropagation()
            })
          })

        reviewFormInstance.addEventListener('submit', async event => {
          event.preventDefault()
          const messageDiv = reviewFormInstance.querySelector<HTMLElement>(
            `#review-form-message-${safeId}`,
          )
          if (!messageDiv) return

          messageDiv.textContent = 'Submitting...'
          messageDiv.className =
            'review-form-message mt-3 text-sm text-slate-500 dark:text-slate-400'

          const formData = new FormData(reviewFormInstance)
          const reviewData = {
            product_id: formData.get('productId'),
            product_name: formData.get('productName'),
            name: formData.get('reviewerName') || 'Anonymous',
            rating: formData.get('reviewerRating'),
            comment: formData.get('reviewerComment'),
            _subject: `New Product Review for ${formData.get('productName')}`,
          }

          if (!formActionUrl) {
            messageDiv.textContent =
              'Error: Review submission endpoint is not configured.'
            messageDiv.className =
              'review-form-message mt-3 text-sm text-red-600 dark:text-red-400'
            return
          }

          try {
            const response = await fetch(formActionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify(reviewData),
            })

            if (response.ok) {
              messageDiv.textContent =
                'Thank you! Your review has been submitted.'
              messageDiv.className =
                'review-form-message mt-3 text-sm text-green-600 dark:text-green-400'
              reviewFormInstance.reset()
              reviewFormInstance.style.display = 'none'
              leaveReviewButton.textContent = 'Leave a Review'
            } else {
              const errorData = (await response
                .json()
                .catch(() => ({}))) as { error?: string }
              messageDiv.textContent = `Submission failed: ${errorData.error || response.statusText || 'Please try again.'}`
              messageDiv.className =
                'review-form-message mt-3 text-sm text-red-600 dark:text-red-400'
            }
          } catch {
            messageDiv.textContent =
              'An error occurred while submitting your review. Please check your connection and try again.'
            messageDiv.className =
              'review-form-message mt-3 text-sm text-red-600 dark:text-red-400'
          }
        })
      }

      leaveReviewButton.addEventListener('click', event => {
        event.stopPropagation()
        const currentFormInPanel = targetPanel.querySelector<HTMLElement>(
          `#${reviewFormId}`,
        )
        if (!currentFormInPanel) return
        const isFormOpen = currentFormInPanel.style.display !== 'none'
        currentFormInPanel.style.display = isFormOpen ? 'none' : 'block'
        leaveReviewButton.textContent = isFormOpen
          ? 'Leave a Review'
          : 'Cancel Review'
      })
    }

    targetPanel.style.display = 'block'
    targetPanel.dataset.active = 'true'
  }

  const defaultActiveLink =
    tabLinks.find(
      link => link.dataset.active === 'true' && link.offsetParent !== null,
    ) ?? tabLinks.find(link => link.offsetParent !== null)

  if (defaultActiveLink) {
    defaultActiveLink.dataset.active = 'true'
    activateTab(defaultActiveLink)
  }

  tabLinks.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      activateTab(link)
    })
    link.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
        activateTab(link)
      }
    })
  })
}

export function mountAllProductCards(): void {
  document
    .querySelectorAll<HTMLScriptElement>('script[data-product-card-payload]')
    .forEach(scriptEl => {
      if (!scriptEl.textContent) return
      try {
        const payload = JSON.parse(scriptEl.textContent) as ProductCardPayload
        const cardElement = document.querySelector<HTMLElement>(
          `.product-card[data-product-id="${CSS.escape(payload.productId)}"]`,
        )
        if (cardElement) mountProductCard(cardElement, payload)
      } catch {
        // Ignore malformed payload.
      }
    })
}
