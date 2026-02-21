import {
  type MascotName,
  cuppyDismissDialogues,
  cuppyMascotData,
  cuppyPersonaString,
  cuppyRandomDialogues,
  currentAiProvider,
  // bleepyGreetingMessages is also available in bleepyConfig.ts if needed later.
} from '../../config/bleepyConfig.ts'

export function setupBleepy(
  mascotContextPropValue?: string,
  instanceId?: string,
) {
  console.log(
    `Client (${instanceId || 'UNKNOWN'}): mascotContextPropValue received by script:`,
    mascotContextPropValue,
  )
  // General types like SurrealAnimationData, CuppyCakeSurrealAnimation, etc.,
  // are removed as Bleepy is an image-set mascot and does not use them.
  // If mascotData.ts still holds other universally needed types (e.g. BaseAnimation),
  // and they weren't part of Bleepy's specific data, they would need a separate import if used.
  // For this refactor, focusing on Bleepy's data migration.

  // --- DOM Elements ---
  const mascotContainer = document.getElementById('mascot-container')
  const mascotVisualArea = document.getElementById('mascot-visual-area')
  // const mascotDialogue = document.getElementById('mascot-dialogue'); // Old dialogue
  // const mascotEphemeralSpeech = document.getElementById('mascot-ephemeral-speech'); // Old ephemeral
  const mascotSpeechBubble = document.getElementById('mascot-speech-bubble')
  const mascotSpeechText = document.getElementById('mascot-speech-text')
  const dismissButton = document.getElementById('dismiss-mascot-button')
  const bringBackButton = document.getElementById('bring-back-mascot-button')
  const mascotChatInput = document.getElementById(
    'mascot-chat-input',
  ) as HTMLInputElement
  console.log('Mascot chat input (desktop):', mascotChatInput) // Verify element
  const mascotChatSendButton = document.getElementById('mascot-chat-send')

  // Mobile Function Card Elements
  const mobileMascotFunctionCard = document.getElementById(
    'mobile-mascot-function-card',
  )
  const mascotChatInputMobile = document.getElementById(
    'mascot-chat-input-mobile',
  ) as HTMLInputElement
  console.log('Mascot chat input (mobile):', mascotChatInputMobile) // Verify element
  const mascotChatSendMobile = document.getElementById(
    'mascot-chat-send-mobile',
  )
  const dismissMascotButtonMobile = document.getElementById(
    'dismiss-mascot-button-mobile',
  )
  const bringBackMascotButtonMobile = document.getElementById(
    'bring-back-mascot-button-mobile',
  )
  // const chatHistoryWindow = document.getElementById('chat-history-window'); // Removed as it's banner-specific

  // --- State Variables ---
  let activeMascot: any = cuppyMascotData // Bleepy is now the only mascot, sourced from correct import
  // let currentMascotIndex = 0; // No longer needed
  let inactivityTimer: NodeJS.Timeout | undefined
  let hoverTimeout: NodeJS.Timeout | undefined
  let dialogueCycleInterval: NodeJS.Timeout | number | undefined // setInterval returns a number in browsers
  let specialAnimationInterval: NodeJS.Timeout | number | undefined
  // let surrealAnimationInterval: NodeJS.Timeout | number | undefined; // Removed, Bleepy is image-set
  let proactiveDialogueTimer: NodeJS.Timeout | undefined
  let mouthOpenTimeout: NodeJS.Timeout | undefined
  let randomExpressionTimeout: NodeJS.Timeout | undefined

  interface HistoryMessage {
    role: 'user' | 'assistant'
    content: string
  }
  let conversationHistory: HistoryMessage[] = []
  let originalPlaceholder = '' // To store the original placeholder

  // --- Core Functions ---
  function loadMascot() {
    // Index no longer needed
    if (!mascotVisualArea) return
    activeMascot = cuppyMascotData // Always Bleepy, sourced from correct import
    // currentMascotIndex = 0; // Implicitly Bleepy
    conversationHistory = [] // Reset conversation history

    // Store original placeholder
    if (mascotChatInput) {
      originalPlaceholder = mascotChatInput.placeholder
    } else if (mascotChatInputMobile) {
      // Fallback for mobile if desktop isn't primary
      originalPlaceholder = mascotChatInputMobile.placeholder
    }

    const mascotImageDisplay = document.getElementById(
      'mascot-image-display',
    ) as HTMLImageElement | null
    mascotVisualArea.innerHTML = '' // Clear previous content (SVG or old image if structure changes)

    if (activeMascot.type === 'image-set') {
      if (mascotImageDisplay) {
        mascotImageDisplay.src = activeMascot.images.standard
        mascotImageDisplay.style.display = 'block'
        mascotVisualArea.appendChild(mascotImageDisplay) // Ensure it's in the visual area
      }
    } else {
      // SVG type
      if (mascotImageDisplay) {
        mascotImageDisplay.style.display = 'none' // Hide the static img tag
      }
      mascotVisualArea.innerHTML = activeMascot.svgHTML // Inject SVG
    }

    // Apply/remove specific CSS classes to mascotVisualArea itself
    mascotVisualArea.className = '' // Clear previous classes from the container
    if (activeMascot.cssClasses) {
      mascotVisualArea.classList.add(activeMascot.cssClasses)
    }

    // Clear previous animation intervals
    clearInterval(specialAnimationInterval as number)
    // clearInterval(surrealAnimationInterval as number); // Removed

    // Conditionally set up animation intervals
    // Bleepy is image-set, so only image-set logic applies.
    // The random image expression is now tied to tryPlayRandomVisualEffect
    specialAnimationInterval = setInterval(
      tryPlayRandomVisualEffect,
      18000 + Math.random() * 5000,
    )

    restartAnimationsAndDialogue()
  }

  function showMascot() {
    if (!mascotContainer || !bringBackButton || !mascotVisualArea) return
    ;(mascotContainer as HTMLElement).style.display = 'flex' // Make sure it's flex before animation
    ;(mascotVisualArea as HTMLElement).style.opacity = '1' // Reset visual opacity
    mascotVisualArea.classList.remove('visual-fading-out') // Ensure animation class is removed

    setTimeout(() => {
      mascotContainer.classList.add('visible')
      startProactiveDialogueTimer() // MOVED HERE: Restart proactive dialogue when mascot is shown
    }, 50) // Delay for CSS transition
    ;(bringBackButton as HTMLElement).style.display = 'none' // Hide original bring back button
    sessionStorage.removeItem('cuppyDismissed')
    sessionStorage.removeItem('lastSelectedMascot') // Clear any old session storage for this
    conversationHistory = [] // Reset conversation history when mascot is shown

    // Load Bleepy
    loadMascot() // This function now correctly uses the imported cuppyMascotData

    // Mobile card state
    if (mobileMascotFunctionCard) {
      mobileMascotFunctionCard.classList.remove('mascot-dismissed-state')
    }
    // showRandomCharacterSelectionUI(); // Removed: No character selection UI logic

    // Initial dialogue after being brought back
    // displayNewDialogue(false, "I'm back! Ready for more fun?");
    // startProactiveDialogueTimer(); // OLD POSITION
  }

  function hideMascot(isDismissal = true) {
    if (!mascotContainer || !bringBackButton || !mascotVisualArea) return

    if (isDismissal) {
      sessionStorage.setItem('cuppyDismissed', 'true')
      ;(bringBackButton as HTMLElement).style.display = 'flex' // Show original spoon (will be hidden on mobile by CSS)

      // Mobile card state
      if (mobileMascotFunctionCard) {
        mobileMascotFunctionCard.classList.add('mascot-dismissed-state')
      }

      if (
        mascotSpeechBubble &&
        mascotSpeechText &&
        (mascotSpeechText as HTMLElement).textContent
      ) {
        // Speech handling
      }

      // Start fade-out animation for the visual element
      mascotVisualArea.classList.add('visual-fading-out')

      const onVisualFadeEnd = () => {
        ;(mascotVisualArea as HTMLElement).style.opacity = '0'
        setTimeout(() => {
          if (sessionStorage.getItem('cuppyDismissed') === 'true') {
            ;(mascotContainer as HTMLElement).style.display = 'none'
          }
          mascotContainer.classList.remove('visible')
          mascotVisualArea.classList.remove('visual-fading-out')
        }, 1500)
      }
      mascotVisualArea.addEventListener('animationend', onVisualFadeEnd, {
        once: true,
      })
    } else {
      // Not a dismissal (e.g., initial load dismissed)
      ;(mascotContainer as HTMLElement).style.display = 'none'
      mascotContainer.classList.remove('visible')
      ;(mascotVisualArea as HTMLElement).style.opacity = '0'
      if (mobileMascotFunctionCard) {
        mobileMascotFunctionCard.classList.add('mascot-dismissed-state')
      }
    }
    clearTimers()
  }

  function clearTimers() {
    clearTimeout(inactivityTimer)
    clearTimeout(hoverTimeout)
    clearInterval(dialogueCycleInterval as number)
    clearInterval(specialAnimationInterval as number)
    clearTimeout(proactiveDialogueTimer)
  }

  function restartAnimationsAndDialogue() {
    if (!mascotContainer) return
    mascotContainer.classList.remove('jiggle')
    void (mascotContainer as HTMLElement).offsetWidth // Trigger reflow
    mascotContainer.classList.add('jiggle')
  }

  let speechLingerTimeout: NodeJS.Timeout | undefined
  let speechFadeCleanupListener: ((event: AnimationEvent) => void) | undefined

  function displayEphemeralSpeech(text: string) {
    const mascotImageDisplay = document.getElementById(
      'mascot-image-display',
    ) as HTMLImageElement | null
    if (activeMascot && mascotImageDisplay) {
      if (activeMascot.type === 'image-set') {
        if (activeMascot.images.openmouth) {
          clearTimeout(mouthOpenTimeout)
          mascotImageDisplay.src = activeMascot.images.openmouth
          mouthOpenTimeout = setTimeout(() => {
            if (
              activeMascot &&
              activeMascot.images.standard &&
              mascotImageDisplay
            ) {
              mascotImageDisplay.src = activeMascot.images.standard
            }
          }, 700)
        }
        if (!mascotImageDisplay.classList.contains('wiggling')) {
          mascotImageDisplay.classList.remove('jiggle')
          void mascotImageDisplay.offsetWidth
          mascotImageDisplay.classList.add('jiggle')
          setTimeout(() => {
            if (mascotImageDisplay)
              mascotImageDisplay.classList.remove('jiggle')
          }, 500)
        }
      } else {
        const svgElement = mascotVisualArea?.querySelector('svg')
        if (svgElement) {
          svgElement.classList.remove('jiggle')
          void (svgElement as unknown as HTMLElement).offsetWidth
          svgElement.classList.add('jiggle')
          setTimeout(() => {
            svgElement.classList.remove('jiggle')
          }, 500)
        }
      }
    }

    if (!mascotSpeechBubble || !mascotSpeechText) return

    clearTimeout(speechLingerTimeout)
    speechLingerTimeout = undefined
    if (speechFadeCleanupListener) {
      mascotSpeechBubble.removeEventListener(
        'animationend',
        speechFadeCleanupListener,
      )
      speechFadeCleanupListener = undefined
    }
    mascotSpeechBubble.className = ''
    ;(mascotSpeechBubble as HTMLElement).style.opacity = '0'
    ;(mascotSpeechBubble as HTMLElement).style.transform = 'translateY(0)'
    ;(mascotSpeechBubble as HTMLElement).style.pointerEvents = 'none'
    ;(mascotSpeechText as HTMLElement).textContent = ''

    ;(mascotSpeechText as HTMLElement).textContent = text
    void (mascotSpeechBubble as HTMLElement).offsetWidth
    mascotSpeechBubble.classList.add('appearing')

    const onAppearAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName !== 'speech-appear') return
      const words = text.split(/\s+/).length
      let currentLingerDuration = (words / 2.5) * 1000 + 2000
      currentLingerDuration = Math.max(
        3000,
        Math.min(currentLingerDuration, 17000),
      )
      speechLingerTimeout = setTimeout(() => {
        if (!mascotSpeechBubble || !mascotSpeechText) return
        mascotSpeechBubble.classList.remove('appearing')
        mascotSpeechBubble.classList.add('fading')
        speechFadeCleanupListener = (fadeEvent: AnimationEvent) => {
          if (fadeEvent.animationName !== 'speech-fade') return
          if (!mascotSpeechBubble || !mascotSpeechText) return
          mascotSpeechBubble.classList.remove('fading')
          ;(mascotSpeechText as HTMLElement).textContent = ''
          ;(mascotSpeechBubble as HTMLElement).style.opacity = '0'
          ;(mascotSpeechBubble as HTMLElement).style.pointerEvents = 'none'
          speechFadeCleanupListener = undefined
        }
        mascotSpeechBubble.addEventListener(
          'animationend',
          speechFadeCleanupListener as EventListener,
          { once: true },
        )
      }, currentLingerDuration)
    }
    mascotSpeechBubble.addEventListener(
      'animationend',
      onAppearAnimationEnd as EventListener,
      { once: true },
    )
  }

  function resetInactivityBasedDialogueTimer() {
    // Placeholder
  }

  async function handleSendMessage() {
    let currentInput: HTMLInputElement | null = null
    let userMessage = ''
    const isMobileView =
      mobileMascotFunctionCard &&
      getComputedStyle(mobileMascotFunctionCard).display !== 'none'

    if (isMobileView && mascotChatInputMobile) {
      currentInput = mascotChatInputMobile
    } else if (mascotChatInput) {
      currentInput = mascotChatInput
    }

    if (!currentInput) {
      console.warn(
        `Client (${instanceId || 'UNKNOWN'}): handleSendMessage: No valid input field found.`,
      )
      return
    }
    userMessage = currentInput.value.trim()
    if (!userMessage) return

    currentInput.value = '' // Clear input first
    currentInput.placeholder = 'Thinking...' // Then set placeholder
    currentInput.disabled = true // Then disable

    if (!mascotSpeechBubble || !mascotSpeechText) {
      console.warn(
        `Client (${instanceId || 'UNKNOWN'}): handleSendMessage: Speech bubble elements not found for overlay mode.`,
      )
    }

    const currentMascot = cuppyMascotData
    const currentMascotName = currentMascot.name as MascotName
    const currentMascotPersonaString = cuppyPersonaString

    const historyForWorker = [...conversationHistory]
    const messageForWorker = userMessage

    // Store original placeholder if not already stored (e.g. if loadMascot didn't run for some reason or for mobile specific)
    if (!originalPlaceholder && currentInput) {
      originalPlaceholder = currentInput.placeholder
    }

    // The lines for setting placeholder and disabling input have been moved up.
    // The line `currentInput.value = '';` is now handled before the fetch call.
    resetProactiveDialogueTimer()

    const workerUrl = 'https://my-mascot-worker-service.greggles.workers.dev'
    try {
      const pageContextForPayload =
        mascotContextPropValue && mascotContextPropValue.trim() !== ''
          ? mascotContextPropValue
          : 'Default context: No specific page information available.'

      console.log(
        `Client (${instanceId || 'UNKNOWN'}): pageContextForPayload being used:`,
        pageContextForPayload,
      )

      const payload: {
        message: string
        persona: string
        history: HistoryMessage[]
        provider: string
        pageContext: string // Changed from string | null
      } = {
        message: messageForWorker,
        persona: currentMascotPersonaString,
        history: historyForWorker,
        provider: currentAiProvider,
        pageContext: pageContextForPayload,
      }

      // console.log('Client: mascotContextPropValue before fetch:', mascotContextPropValue); // Redundant with the one at the start of setupCuppy
      console.log(
        `Client (${instanceId || 'UNKNOWN'}): payload being sent:`,
        payload,
      )

      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      conversationHistory.push({ role: 'user', content: userMessage })

      const data = await response.json()
      if (response.ok && data.reply) {
        conversationHistory.push({ role: 'assistant', content: data.reply })
        displayEphemeralSpeech(data.reply)
      } else {
        const errorMessage = data.error || 'Failed to get a response.'
        conversationHistory.push({ role: 'assistant', content: errorMessage })
        displayEphemeralSpeech(errorMessage)
      }
    } catch (error) {
      conversationHistory.push({ role: 'user', content: userMessage }) // Log user message even on fetch error
      const connectErrorMessage = 'Could not connect to the mascot.'
      conversationHistory.push({
        role: 'assistant',
        content: connectErrorMessage,
      })
      displayEphemeralSpeech(connectErrorMessage)
      console.error(
        `Client (${instanceId || 'UNKNOWN'}): Error calling mascot worker:`,
        error,
      )
    } finally {
      if (currentInput) {
        currentInput.placeholder = originalPlaceholder || 'Talk to me...' // Fallback if original wasn't captured
        currentInput.disabled = false
        // currentInput.value = ""; // Now cleared before fetch
        currentInput.focus()
      }
    }
  }

  function triggerProactiveDialogue() {
    if (!mascotContainer?.classList.contains('visible')) {
      return
    }
    if (cuppyRandomDialogues && cuppyRandomDialogues.length > 0) {
      const randomIndex = Math.floor(
        Math.random() * cuppyRandomDialogues.length,
      )
      const selectedDialogue = cuppyRandomDialogues[randomIndex]
      displayEphemeralSpeech(selectedDialogue)
    } else {
      displayEphemeralSpeech('...')
    }
    startProactiveDialogueTimer()
  }

  function startProactiveDialogueTimer() {
    clearTimeout(proactiveDialogueTimer)
    if (!mascotContainer?.classList.contains('visible')) {
      return
    }
    const randomDelay = Math.random() * (60000 - 45000) + 45000 // 45-60 seconds
    proactiveDialogueTimer = setTimeout(triggerProactiveDialogue, randomDelay)
  }

  function resetProactiveDialogueTimer() {
    startProactiveDialogueTimer()
  }

  function playRandomImageExpression() {
    const mascotImageDisplay = document.getElementById(
      'mascot-image-display',
    ) as HTMLImageElement | null
    if (
      !activeMascot ||
      activeMascot.type !== 'image-set' ||
      !mascotImageDisplay ||
      !activeMascot.images
    ) {
      return
    }
    const expressionKeys = Object.keys(activeMascot.images).filter(
      key => key !== 'standard' && key !== 'openmouth',
    )
    if (expressionKeys.length === 0) return
    const randomKey =
      expressionKeys[Math.floor(Math.random() * expressionKeys.length)]
    mascotImageDisplay.src = activeMascot.images[randomKey]
    clearTimeout(randomExpressionTimeout)
    randomExpressionTimeout = setTimeout(
      () => {
        if (
          activeMascot &&
          activeMascot.images.standard &&
          mascotImageDisplay
        ) {
          mascotImageDisplay.src = activeMascot.images.standard
        }
      },
      Math.random() * 500 + 1000,
    )
  }

  function playRandomMascotAnimation() {
    if (!mascotVisualArea || !mascotContainer?.classList.contains('visible'))
      return
    if (!activeMascot || activeMascot.type === 'image-set') return
    const mascotData = activeMascot
    if (
      !mascotData.uniqueAnimations ||
      mascotData.uniqueAnimations.length === 0
    )
      return
    const availableAnimations = mascotData.uniqueAnimations
    const animToPlay =
      availableAnimations[
        Math.floor(Math.random() * availableAnimations.length)
      ]
    const targetElement = mascotVisualArea.querySelector(
      animToPlay.targetSelector,
    ) as SVGElement | null
    if (
      targetElement &&
      !targetElement.classList.contains(animToPlay.animationClass)
    ) {
      let alreadyAnimating = false
      if (targetElement.classList) {
        for (const anim of availableAnimations) {
          if (targetElement.classList.contains(anim.animationClass)) {
            alreadyAnimating = true
            break
          }
        }
      }
      if (alreadyAnimating) return
      targetElement.classList.add(animToPlay.animationClass)
      const onAnimationEnd = (event: Event) => {
        const currentTarget = event.currentTarget as HTMLElement
        if (
          animToPlay.cssAnimationName &&
          (event as AnimationEvent).animationName ===
            animToPlay.cssAnimationName &&
          currentTarget.classList.contains(animToPlay.animationClass)
        ) {
          currentTarget.classList.remove(animToPlay.animationClass)
        }
        currentTarget.removeEventListener('animationcancel', onAnimationCancel)
      }
      const onAnimationCancel = (event: Event) => {
        const currentTarget = event.currentTarget as HTMLElement
        if (
          animToPlay.cssAnimationName &&
          (event as AnimationEvent).animationName ===
            animToPlay.cssAnimationName &&
          currentTarget.classList.contains(animToPlay.animationClass)
        ) {
          currentTarget.classList.remove(animToPlay.animationClass)
        }
        currentTarget.removeEventListener('animationend', onAnimationEnd)
      }
      targetElement.addEventListener(
        'animationend',
        onAnimationEnd as EventListener,
        { once: true },
      )
      targetElement.addEventListener(
        'animationcancel',
        onAnimationCancel as EventListener,
        { once: true },
      )
    }
  }

  function tryPlayRandomVisualEffect() {
    if (!activeMascot || !mascotContainer?.classList.contains('visible')) return
    if (activeMascot.type === 'image-set') {
      const mascotImageEl = document.getElementById(
        'mascot-image-display',
      ) as HTMLImageElement | null
      if (!mascotImageEl) return
      const randomNumber = Math.random()
      if (randomNumber < 0.4) {
        mascotImageEl.classList.add('wiggling')
        mascotImageEl.addEventListener(
          'animationend',
          () => {
            mascotImageEl.classList.remove('wiggling')
          },
          { once: true },
        )
      } else if (randomNumber < 0.8) {
        playRandomImageExpression()
      }
    } else {
      if (
        activeMascot.uniqueAnimations &&
        activeMascot.uniqueAnimations.length > 0
      ) {
        if (Math.random() < 0.4) {
          playRandomMascotAnimation()
        }
      }
    }
  }

  function setupEventListeners() {
    if (
      !dismissButton ||
      !bringBackButton ||
      !mascotContainer ||
      !mascotChatSendButton ||
      !mascotChatInput
    )
      return
    dismissButton.addEventListener('click', () => {
      clearTimeout(proactiveDialogueTimer)
      if (cuppyDismissDialogues && cuppyDismissDialogues.length > 0) {
        const dismissalMessage =
          cuppyDismissDialogues[
            Math.floor(Math.random() * cuppyDismissDialogues.length)
          ]
        displayEphemeralSpeech(dismissalMessage)
      }
      hideMascot(true)
    })
    bringBackButton.addEventListener('click', () => {
      showMascot()
    })
    mascotChatSendButton.addEventListener('click', handleSendMessage)
    mascotChatInput.addEventListener('keypress', event => {
      if (event.key === 'Enter') {
        handleSendMessage()
      }
    })
    if (mascotChatInputMobile) {
      mascotChatInputMobile.addEventListener('keypress', event => {
        if (event.key === 'Enter') {
          handleSendMessage()
        }
      })
      // Pass instanceId to setupCuppy in Bleepy.astro
      // The script tag in Bleepy.astro should be:
      // <script define:vars={{ mascotContextPropValue: mascotContext, instanceId: instanceIdentifier }}>
      //   async function init() {
      //     const { setupCuppy } = await import('/src/components/bleepy/bleepy-client-setup.ts');
      //     setupCuppy(mascotContextPropValue, instanceId); // Pass instanceId here
      //   }
      //   // ... rest of init logic
      // </script>
    }
    if (mascotChatSendMobile) {
      mascotChatSendMobile.addEventListener('click', handleSendMessage)
    }
    if (dismissMascotButtonMobile) {
      dismissMascotButtonMobile.addEventListener('click', () => {
        clearTimeout(proactiveDialogueTimer)
        if (cuppyDismissDialogues && cuppyDismissDialogues.length > 0) {
          const dismissalMessage =
            cuppyDismissDialogues[
              Math.floor(Math.random() * cuppyDismissDialogues.length)
            ]
          displayEphemeralSpeech(dismissalMessage)
        }
        hideMascot(true)
      })
    }
    if (bringBackMascotButtonMobile) {
      bringBackMascotButtonMobile.addEventListener('click', showMascot)
    }
  }

  // This is the main initialization logic, formerly initializeMascotSystem
  const mainMascotContainer = document.getElementById(
    'mascot-container',
  ) as HTMLElement // Renamed to avoid conflict
  if (!mainMascotContainer) return

  const backgroundUrlFromDataAttr =
    mainMascotContainer.dataset.backgroundImageUrl
  if (backgroundUrlFromDataAttr && backgroundUrlFromDataAttr.trim() !== '') {
    mainMascotContainer.style.setProperty(
      '--mascot-background-image',
      `url('${backgroundUrlFromDataAttr}')`,
    )
  } else {
    mainMascotContainer.style.setProperty('--mascot-background-image', 'none')
  }

  if (sessionStorage.getItem('cuppyDismissed') === 'true') {
    hideMascot(false) // Pass false for initial hide without dismissal message
    if (bringBackButton) (bringBackButton as HTMLElement).style.display = 'flex' // Show spoon
    if (mainMascotContainer) mainMascotContainer.style.display = 'none' // Hide container
  } else {
    showMascot()
  }
  setupEventListeners()

  // astro:page-load listener for logging (original lines 1167-1179)
  // This can be part of the setup if desired, or kept separate in Astro component
  // For simplicity, including it here to run once when setupCuppy is called.
  document.addEventListener('astro:page-load', () => {
    const mobileCard = document.getElementById('mobile-mascot-function-card')
    if (mobileCard) {
      // console.log("Mobile card #mobile-mascot-function-card FOUND in DOM for logging.");
    } else {
      console.error(
        `Client (${instanceId || 'UNKNOWN'}): Mobile card #mobile-mascot-function-card NOT FOUND in DOM for logging.`,
      )
    }

    const desktopChatUi = document.getElementById('mascot-chat-ui')
    if (desktopChatUi) {
      // console.log("Desktop #mascot-chat-ui FOUND in DOM for logging.");
    } else {
      console.error(
        `Client (${instanceId || 'UNKNOWN'}): Desktop #mascot-chat-ui NOT FOUND in DOM for logging.`,
      )
    }
  })
}
