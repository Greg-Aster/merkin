// Extended Chat Manager for BleepyBanner with large banner-style chat interface
import { SharedChatManager, type ChatMessage, type MascotChatConfig } from './shared-chat-manager.ts';

export interface BannerConfig extends MascotChatConfig {
  chatHistoryWindowId: string;
  showChatWindow?: boolean;
}

export class BannerManager {
  private chatManager: SharedChatManager;
  private chatHistoryWindow: HTMLElement | null = null;
  private showChatWindow: boolean;
  private config: BannerConfig;

  constructor(config: BannerConfig) {
    this.config = config;
    this.showChatWindow = config.showChatWindow !== false;
    
    // Create the base chat manager
    this.chatManager = new SharedChatManager(config);
  }

  public initialize(): boolean {
    // Get additional elements specific to banner
    this.chatHistoryWindow = document.getElementById(this.config.chatHistoryWindowId);
    if (!this.chatHistoryWindow && this.showChatWindow) {
      console.warn('BannerManager: Chat history window not found');
    }

    // Override methods for banner-specific behavior
    this.overrideChatManagerMethods();

    const success = this.chatManager.initialize();
    return success;
  }

  private overrideChatManagerMethods() {
    // Store reference to original method
    const originalHandleSendMessage = (this.chatManager as any).handleSendMessage.bind(this.chatManager);
    
    // Override with our custom logic
    (this.chatManager as any).handleSendMessage = async () => {
      const chatInputElement = (this.chatManager as any).chatInputElement;
      if (!chatInputElement || !chatInputElement.value.trim()) return;

      const userMessage = chatInputElement.value.trim();

      // Add user message to chat history window
      if (this.showChatWindow && this.chatHistoryWindow) {
        this.addMessageToChatWindow('user', userMessage);
      }

      // Call original handler
      await originalHandleSendMessage();

      // Add assistant response to chat history window
      const conversationHistory = this.chatManager.getConversationHistory();
      if (this.showChatWindow && this.chatHistoryWindow && conversationHistory.length > 0) {
        const lastMessage = conversationHistory[conversationHistory.length - 1];
        if (lastMessage.role === 'assistant') {
          this.addMessageToChatWindow('assistant', lastMessage.content);
        }
      }
    };

    // Banner can use both speech bubbles AND chat window, so keep original speech display
    // No need to override displayEphemeralSpeech
  }

  private addMessageToChatWindow(role: 'user' | 'assistant', content: string) {
    if (!this.chatHistoryWindow) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `banner-chat-message ${role} mb-3 p-3 rounded-lg ${
      role === 'user' 
        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 ml-6' 
        : 'bg-gray-50 dark:bg-gray-800/30 border-l-4 border-gray-400 mr-6'
    }`;

    const roleSpan = document.createElement('div');
    roleSpan.className = `font-bold text-sm uppercase tracking-wide mb-2 ${
      role === 'user' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
    }`;
    roleSpan.textContent = role === 'user' ? 'You' : 'Bleepy';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'text-base text-gray-800 dark:text-gray-200 leading-relaxed';
    contentDiv.textContent = content;

    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'text-xs text-gray-500 dark:text-gray-400 mt-2';
    timestampDiv.textContent = new Date().toLocaleTimeString();

    messageDiv.appendChild(roleSpan);
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timestampDiv);
    this.chatHistoryWindow.appendChild(messageDiv);

    // Scroll to bottom with smooth animation
    this.chatHistoryWindow.scrollTo({
      top: this.chatHistoryWindow.scrollHeight,
      behavior: 'smooth'
    });
  }

  // Public delegation methods
  public speak(message: string) {
    this.chatManager.speak(message);
  }

  public getConversationHistory() {
    return this.chatManager.getConversationHistory();
  }

  public clearConversationHistory() {
    this.chatManager.clearConversationHistory();
  }

  public clearChatWindow() {
    if (this.chatHistoryWindow) {
      this.chatHistoryWindow.innerHTML = '';
    }
    this.clearConversationHistory();
  }

  public cleanup() {
    this.chatManager.cleanup();
  }
}