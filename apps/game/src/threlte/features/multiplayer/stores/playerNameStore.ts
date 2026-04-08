import { writable } from 'svelte/store';
import { generateFriendlyName } from '../../../utils/nameGenerator';

// Store to cache player names
const playerNames = writable<Record<string, string>>({});

export const playerNameStore = {
  subscribe: playerNames.subscribe,
  
  // Get a friendly name for a peer ID (generates and caches if not exists)
  getName: (peerId: string): string => {
    let names: Record<string, string> = {};
    playerNames.subscribe(n => names = n)(); // Get current value
    
    if (!names[peerId]) {
      const friendlyName = generateFriendlyName(peerId);
      playerNames.update(n => ({ ...n, [peerId]: friendlyName }));
      return friendlyName;
    }
    
    return names[peerId];
  },
  
  // Manually set a custom name for a peer
  setName: (peerId: string, name: string) => {
    playerNames.update(n => ({ ...n, [peerId]: name }));
  },
  
  // Clear all names (useful for new sessions)
  clear: () => {
    playerNames.set({});
  }
};