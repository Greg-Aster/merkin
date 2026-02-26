// Centralized Chat Manager for all Bleepy components
// This eliminates code duplication across Bleepy.astro, BleepyBanner.astro, and BleepyPostWidget.astro

import {
  cuppyMascotData,
  cuppyPersonaString,
  cuppyRandomDialogues,
  cuppyGreetingMessages,
  currentAiProvider
} from '../../config/bleepyConfig.ts';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MascotChatConfig {
  containerId: string;
  mascotVisualId: string;
  speechBubbleId?: string;
  speechTextId?: string;
  chatInputId: string;
  chatSendButtonId: string;
  pageContext?: string;
  customGreetingMessages?: string[];
  customRandomDialogues?: string[];
  enableProactiveDialogue?: boolean;
  enableGreeting?: boolean;
}

export class SharedChatManager {
  // DOM Elements
  private containerElement: HTMLElement | null = null;
  private mascotVisualArea: HTMLElement | null = null;
  private mascotImageDisplay: HTMLImageElement | null = null;
  private speechBubble: HTMLElement | null = null;
  private speechText: HTMLElement | null = null;
  private chatInputElement: HTMLInputElement | null = null;
  private chatSendButton: HTMLElement | null = null;

  // Chat State
  private conversationHistory: ChatMessage[] = [];
  private pageContext: string = '';
  private originalPlaceholder: string = '';

  // Speech Management
  private speechQueue: string[] = [];
  private isSpeaking: boolean = false;
  private readonly speechChunkDelay: number = 600;

  // Timers
  private proactiveDialogueTimer: ReturnType<typeof setTimeout> | undefined;
  private randomExpressionTimeout: ReturnType<typeof setTimeout> | undefined;
  private mouthOpenTimeout: ReturnType<typeof setTimeout> | undefined;
  private speechLingerTimeout: ReturnType<typeof setTimeout> | undefined;
  private speechFadeCleanupListener: ((event: AnimationEvent) => void) | undefined;

  // Configuration
  private config: MascotChatConfig;
  private greetingMessages: string[];
  private randomDialogues: string[];
  private enableProactive: boolean;
  private enableGreeting: boolean;

  constructor(config: MascotChatConfig) {
    this.config = config;
    this.pageContext = config.pageContext || '';
    this.greetingMessages = config.customGreetingMessages || cuppyGreetingMessages || [];
    this.randomDialogues = config.customRandomDialogues || cuppyRandomDialogues || [];
    this.enableProactive = config.enableProactiveDialogue !== false;
    this.enableGreeting = config.enableGreeting !== false;
  }

  public initialize(): boolean {
    // Get DOM elements
    this.containerElement = document.getElementById(this.config.containerId);
    this.mascotVisualArea = document.getElementById(this.config.mascotVisualId);
    this.speechBubble = document.getElementById(this.config.speechBubbleId);
    this.speechText = document.getElementById(this.config.speechTextId);
    this.chatInputElement = document.getElementById(this.config.chatInputId) as HTMLInputElement;
    this.chatSendButton = document.getElementById(this.config.chatSendButtonId);

    // Core required elements: container, mascot area, input, and send button
    if (!this.containerElement || !this.mascotVisualArea || !this.chatInputElement || !this.chatSendButton) {
      console.error('SharedChatManager: Required elements not found');
      return false;
    }

    // Speech bubble elements are optional (some components may not use them)
    if (!this.speechBubble || !this.speechText) {
      console.warn('SharedChatManager: Speech bubble elements not found - speech functionality will be disabled');
    }

    // Store original placeholder
    this.originalPlaceholder = this.chatInputElement.placeholder;

    // Load mascot
    this.loadMascot();

    // Setup event listeners
    this.setupEventListeners();

    // Enable interactions
    this.enableWidget();

    // Show initial greeting
    if (this.enableGreeting) {
      this.showInitialGreeting();
    }

    // Start proactive dialogue
    if (this.enableProactive) {
      this.startProactiveDialogueTimer();
    }

    return true;
  }

  private loadMascot() {
    if (!this.mascotVisualArea) return;

    // Try to find existing img element first
    this.mascotImageDisplay = this.mascotVisualArea.querySelector('img') as HTMLImageElement;
    
    if (cuppyMascotData.type === "image-set") {
      if (cuppyMascotData.images && cuppyMascotData.images.standard) {
        if (!this.mascotImageDisplay) {
          // Create new img element if none exists
          this.mascotImageDisplay = document.createElement('img');
          this.mascotImageDisplay.alt = "Bleepy Assistant";
          this.mascotImageDisplay.style.maxWidth = '100%';
          this.mascotImageDisplay.style.maxHeight = '100%';
          this.mascotImageDisplay.style.objectFit = 'contain';
          this.mascotVisualArea.appendChild(this.mascotImageDisplay);
        }
        this.mascotImageDisplay.src = cuppyMascotData.images.standard;
        this.mascotImageDisplay.style.display = 'block';
      }
    } else if (cuppyMascotData.type === "svg") {
      if (this.mascotImageDisplay) {
        this.mascotImageDisplay.style.display = 'none';
      }
      if (cuppyMascotData.svgHTML) {
        this.mascotVisualArea.innerHTML = cuppyMascotData.svgHTML;
      }
    }
  }

  private setupEventListeners() {
    // Mascot click to activate
    this.mascotVisualArea?.addEventListener('click', () => {
      this.chatInputElement?.focus();
      this.playMascotAnimation();
    });

    // Send button
    this.chatSendButton?.addEventListener('click', () => {
      this.handleSendMessage();
    });

    // Enter key in input
    this.chatInputElement?.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.handleSendMessage();
      }
    });

    // Input focus/blur for better UX
    this.chatInputElement?.addEventListener('focus', () => {
      this.resetProactiveDialogueTimer();
    });
  }

  private enableWidget() {
    if (this.chatInputElement && this.chatSendButton) {
      this.chatInputElement.disabled = false;
      this.chatSendButton.removeAttribute('disabled');
    }
  }

  private showInitialGreeting() {
    setTimeout(() => {
      if (this.greetingMessages && this.greetingMessages.length > 0) {
        const randomGreeting = this.greetingMessages[Math.floor(Math.random() * this.greetingMessages.length)];
        this.startMultipartSpeech(randomGreeting);
      } else {
        this.startMultipartSpeech("Hi! Click me and ask me anything!");
      }
    }, 1000);
  }

  private displayEphemeralSpeech(textChunk: string, isLastChunk: boolean = true) {
    // Mascot animation
    if (this.mascotImageDisplay && cuppyMascotData.type === "image-set") {
      if (cuppyMascotData.images.openmouth) {
        clearTimeout(this.mouthOpenTimeout);
        this.mascotImageDisplay.src = cuppyMascotData.images.openmouth;
        this.mouthOpenTimeout = setTimeout(() => {
          if (cuppyMascotData.images.standard && this.mascotImageDisplay) {
            this.mascotImageDisplay.src = cuppyMascotData.images.standard;
          }
        }, 700);
      }
      this.playImageAnimation();
    } else if (cuppyMascotData.type === "svg") {
      const svgElement = this.mascotVisualArea?.querySelector('svg');
      if (svgElement) {
        this.playSvgAnimation(svgElement);
      }
    }

    // If no speech bubble elements, skip speech display
    if (!this.speechBubble || !this.speechText) {
      // Just mark speech as complete and continue
      if (!isLastChunk) {
        setTimeout(() => {
          this.speakNextChunk();
        }, this.speechChunkDelay);
      } else {
        this.isSpeaking = false;
      }
      return;
    }

    // Clear previous speech and animations
    clearTimeout(this.speechLingerTimeout);
    this.speechLingerTimeout = undefined;
    if (this.speechFadeCleanupListener) {
      this.speechBubble.removeEventListener('animationend', this.speechFadeCleanupListener);
      this.speechFadeCleanupListener = undefined;
    }
    
    // Reset bubble state
    this.speechBubble.className = this.speechBubble.className.replace(/appearing|fading/g, '').trim();
    this.speechBubble.style.opacity = '0';
    this.speechBubble.style.pointerEvents = 'none';
    this.speechText.textContent = textChunk;
    
    // Force reflow
    void this.speechBubble.offsetWidth;
    
    // Start appear animation
    this.speechBubble.classList.add('appearing');

    const onAppearAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName !== 'speech-appear') return;
      
      const words = textChunk.split(/\s+/).length;
      let currentLingerDuration = (words / 3.5) * 1000 + 1500;
      currentLingerDuration = Math.max(3000, Math.min(currentLingerDuration, 4500));
      
      this.speechLingerTimeout = setTimeout(() => {
        if (!this.speechBubble || !this.speechText) return;
        
        this.speechBubble.classList.remove('appearing');
        this.speechBubble.classList.add('fading');
        
        this.speechFadeCleanupListener = (fadeEvent: AnimationEvent) => {
          if (fadeEvent.animationName !== 'speech-fade') return;
          if (!this.speechBubble || !this.speechText) return;
          this.speechBubble.classList.remove('fading');
          this.speechText.textContent = '';
          this.speechBubble.style.opacity = '0';
          this.speechBubble.style.pointerEvents = 'none';
          this.speechFadeCleanupListener = undefined;

          if (!isLastChunk) {
            setTimeout(() => {
              this.speakNextChunk();
            }, this.speechChunkDelay);
          } else {
            this.isSpeaking = false;
          }
        };
        this.speechBubble.addEventListener('animationend', this.speechFadeCleanupListener as EventListener, { once: true });
      }, currentLingerDuration);
    };
    
    this.speechBubble.addEventListener('animationend', onAppearAnimationEnd as EventListener, { once: true });
  }

  private async handleSendMessage() {
    if (!this.chatInputElement || !this.chatInputElement.value.trim()) return;

    const userMessage = this.chatInputElement.value.trim();

    // Clear input and show thinking state
    this.chatInputElement.value = '';
    this.chatInputElement.placeholder = 'Thinking...';
    this.chatInputElement.disabled = true;
    this.chatSendButton?.setAttribute('disabled', '');

    // Reset proactive timer
    this.resetProactiveDialogueTimer();

    // Render the user's message immediately
    this.renderMessage({ role: 'user', content: userMessage });

    try {
      const pageContextForPayload = this.pageContext && this.pageContext.trim() !== ''
        ? this.pageContext
        : "Default context: No specific page information available.";

      const payload = {
        message: userMessage,
        persona: cuppyPersonaString,
        history: [...this.conversationHistory],
        provider: currentAiProvider,
        pageContext: pageContextForPayload
      };

      this.conversationHistory.push({ role: 'user', content: userMessage });

      const response = await fetch('https://my-mascot-worker-service.greggles.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.reply || "I'm not sure how to respond to that.";

        this.conversationHistory.push({ role: 'assistant', content: reply });
        // Render the assistant's response
        this.renderMessage({ role: 'assistant', content: reply });
      } else {
        console.error('API response not ok:', response.status, response.statusText);
        const errorMessage = 'Sorry, I encountered an error. Please try again.';
        this.conversationHistory.push({ role: 'assistant', content: errorMessage });
        this.renderMessage({ role: 'assistant', content: errorMessage });
      }
    } catch (error) {
      console.error('Chat Manager Error:', error);
      const connectErrorMessage = 'Could not connect to the assistant.';
      // Do not push user message again on error, it's already in history
      this.conversationHistory.push({ role: 'assistant', content: connectErrorMessage });
      this.renderMessage({ role: 'assistant', content: connectErrorMessage });
    } finally {
      // Re-enable input
      if (this.chatInputElement) {
        this.chatInputElement.placeholder = this.originalPlaceholder;
        this.chatInputElement.disabled = false;
        this.chatInputElement.focus();
      }
      this.chatSendButton?.removeAttribute('disabled');
    }
  }

  private playMascotAnimation() {
    if (cuppyMascotData.type === "image-set" && this.mascotImageDisplay) {
      this.playImageAnimation();
    }
  }

  private playImageAnimation() {
    if (!this.mascotImageDisplay) return;
    this.mascotImageDisplay.classList.add('wiggling');
    setTimeout(() => {
      this.mascotImageDisplay?.classList.remove('wiggling');
    }, 600);
  }

  private playSvgAnimation(svgElement: SVGElement) {
    svgElement.classList.remove('jiggle');
    void (svgElement as unknown as HTMLElement).offsetWidth;
    svgElement.classList.add('jiggle');
    setTimeout(() => { svgElement.classList.remove('jiggle'); }, 500);
  }

  private triggerProactiveDialogue() {
    if (this.conversationHistory.length > 0) return; // Don't interrupt active conversations

    if (this.randomDialogues && this.randomDialogues.length > 0) {
      const randomDialogue = this.randomDialogues[Math.floor(Math.random() * this.randomDialogues.length)];
      this.startMultipartSpeech(randomDialogue);
    } else {
      this.startMultipartSpeech("...");
    }

    this.startProactiveDialogueTimer();
  }

  private startProactiveDialogueTimer() {
    if (!this.enableProactive) return;
    clearTimeout(this.proactiveDialogueTimer);
    const randomDelay = Math.random() * (30000 - 20000) + 20000; // 20-30 seconds
    this.proactiveDialogueTimer = setTimeout(() => {
      this.triggerProactiveDialogue();
    }, randomDelay);
  }

  private resetProactiveDialogueTimer() {
    this.startProactiveDialogueTimer();
  }

  private chunkText(fullText: string, wordsPerChunk: number = 15): string[] {
    const words = fullText.split(/\s+/);
    const chunks: string[] = [];
    if (words.length === 0) return [""];

    for (let i = 0; i < words.length; i += wordsPerChunk) {
      chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
    }
    return chunks;
  }

  private speakNextChunk(): void {
    if (this.speechQueue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    const chunk = this.speechQueue.shift()!;
    const isLastChunk = this.speechQueue.length === 0;
    
    this.displayEphemeralSpeech(chunk, isLastChunk);
  }

  private startMultipartSpeech(fullText: string): void {
    if (this.isSpeaking) {
      clearTimeout(this.speechLingerTimeout);
      this.speechQueue = [];
      if (this.speechBubble) {
        this.speechBubble.classList.remove('appearing', 'fading');
        this.speechBubble.style.opacity = '0';
        this.speechBubble.style.pointerEvents = 'none';
        if(this.speechText) this.speechText.textContent = '';
      }
    }

    this.isSpeaking = true;
    this.speechQueue = this.chunkText(fullText);
    this.speakNextChunk();
  }

  // Add this new method to the SharedChatManager class
  protected renderMessage(message: ChatMessage) {
    // This method is intended to be overridden by child classes
    // to provide specific UI rendering for chat messages.
    // By default, it does nothing.
  }

  // Public methods for external control
  public speak(message: string) {
    this.startMultipartSpeech(message);
  }

  public getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  public clearConversationHistory() {
    this.conversationHistory = [];
  }

  public cleanup() {
    clearTimeout(this.proactiveDialogueTimer);
    clearTimeout(this.randomExpressionTimeout);
    clearTimeout(this.mouthOpenTimeout);
    clearTimeout(this.speechLingerTimeout);
    
    if (this.speechFadeCleanupListener && this.speechBubble) {
      this.speechBubble.removeEventListener('animationend', this.speechFadeCleanupListener);
    }
  }
}