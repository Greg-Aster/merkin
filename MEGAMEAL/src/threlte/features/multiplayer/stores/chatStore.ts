import { writable } from 'svelte/store';

export interface ChatMessage {
  senderId: string;
  text: string;
  timestamp: string;
}

// Chat store to hold all chat messages
export const chatStore = writable<ChatMessage[]>([]);

// Add a new message to the chat store
export function addMessage(message: ChatMessage) {
  chatStore.update(messages => [...messages, message]);
}