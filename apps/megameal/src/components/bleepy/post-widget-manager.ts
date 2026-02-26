// Extended Chat Manager for BleepyPostWidget with chat history display
import { SharedChatManager, type ChatMessage, type MascotChatConfig } from './shared-chat-manager.ts';

export interface PostWidgetConfig extends MascotChatConfig {
  chatHistoryId: string;
  showChatHistory?: boolean;
}

export class PostWidgetManager {
  private chatManager: SharedChatManager;
  private chatHistoryElement: HTMLElement | null = null;
  private messagesContainer: HTMLElement | null = null;
  private initialMascotDisplay: HTMLElement | null = null;
  private speechBubbleTemplate: HTMLTemplateElement | null = null;
  private showHistory: boolean;
  private config: PostWidgetConfig;
  private conversationStarted: boolean = false;

  constructor(config: PostWidgetConfig) {
    this.config = config;
    this.showHistory = config.showChatHistory !== false;

    // Create the base chat manager and override the render method
    this.chatManager = new SharedChatManager(config);
    (this.chatManager as any).renderMessage = this.renderMessage.bind(this);
  }

  public initialize(): boolean {
    this.chatHistoryElement = document.getElementById(this.config.chatHistoryId);
    this.messagesContainer = document.getElementById('widget-messages-container');
    this.initialMascotDisplay = document.getElementById('widget-initial-mascot');
    this.speechBubbleTemplate = document.getElementById('speech-bubble-template') as HTMLTemplateElement;

    if (!this.chatHistoryElement && this.showHistory) {
      console.warn('PostWidgetManager: Chat history element not found');
    }

    // Override handleSendMessage to manage the initial screen UI
    this.overrideHandleSendMessage();

    return this.chatManager.initialize();
  }

  private overrideHandleSendMessage() {
    const originalHandleSendMessage = (this.chatManager as any).handleSendMessage.bind(this.chatManager);

    (this.chatManager as any).handleSendMessage = async () => {
      if (!this.conversationStarted) {
        this.startConversationMode();
      }
      await originalHandleSendMessage();
    };
  }

  private startConversationMode() {
    this.conversationStarted = true;
    if (this.initialMascotDisplay) {
      this.initialMascotDisplay.style.display = 'none';
    }
    if (this.messagesContainer) {
      this.messagesContainer.style.display = 'block';
    }
  }

  private renderMessage(message: ChatMessage) {
    if (!this.messagesContainer) return;

    if (message.role === 'user') {
      this.renderUserMessage(message.content);
    } else if (message.role === 'assistant') {
      this.renderAssistantMessage(message.content);
    }

    // Scroll to bottom
    if (this.chatHistoryElement) {
      this.chatHistoryElement.scrollTop = this.chatHistoryElement.scrollHeight;
    }
  }

  private renderUserMessage(content: string) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user mb-3 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 ml-8 mr-2';

    const roleSpan = document.createElement('span');
    roleSpan.className = 'font-semibold text-xs uppercase tracking-wide mb-1 block text-blue-700 dark:text-blue-300';
    roleSpan.textContent = 'You';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'text-sm text-gray-800 dark:text-gray-200';
    contentDiv.textContent = content;

    messageDiv.appendChild(roleSpan);
    messageDiv.appendChild(contentDiv);
    this.messagesContainer?.appendChild(messageDiv);
  }

  private renderAssistantMessage(content: string) {
    if (!this.speechBubbleTemplate) return;

    const bubbleClone = this.speechBubbleTemplate.content.cloneNode(true) as DocumentFragment;
    const avatarImg = bubbleClone.querySelector('.speech-bubble-avatar') as HTMLImageElement;
    const contentDiv = bubbleClone.querySelector('.speech-bubble-content');

    const mainMascotImg = document.getElementById('widget-mascot-image-display') as HTMLImageElement;
    if (avatarImg && mainMascotImg?.src) {
      avatarImg.src = mainMascotImg.src;
    }

    if (contentDiv) {
      contentDiv.textContent = content;
    }

    this.messagesContainer?.appendChild(bubbleClone);
  }

  public cleanup() {
    this.chatManager.cleanup();
  }
}