// Simple friendly name generator
const adjectives = [
  'Swift', 'Bright', 'Bold', 'Clever', 'Brave', 'Quick', 'Mighty', 'Cosmic', 
  'Stellar', 'Lunar', 'Solar', 'Galactic', 'Nova', 'Neon', 'Electric', 'Digital',
  'Cyber', 'Quantum', 'Turbo', 'Mega', 'Ultra', 'Hyper', 'Alpha', 'Beta',
  'Prime', 'Epic', 'Legendary', 'Mystic', 'Phantom', 'Shadow', 'Blazing', 'Flying'
];

const animals = [
  'Wolf', 'Eagle', 'Tiger', 'Dragon', 'Phoenix', 'Shark', 'Falcon', 'Lion',
  'Panther', 'Raven', 'Hawk', 'Bear', 'Fox', 'Lynx', 'Jaguar', 'Viper',
  'Cobra', 'Mantis', 'Spider', 'Wasp', 'Scorpion', 'Rhino', 'Dolphin', 'Orca',
  'Octopus', 'Firefly', 'Butterfly', 'Hummingbird', 'Penguin', 'Seal', 'Otter', 'Panda'
];

// Hash function to get consistent names for the same peer ID
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function generateFriendlyName(peerId: string): string {
  const hash = simpleHash(peerId);
  const adjIndex = hash % adjectives.length;
  const animalIndex = Math.floor(hash / adjectives.length) % animals.length;
  
  return `${adjectives[adjIndex]} ${animals[animalIndex]}`;
}

// Alternative: Just use animal names with numbers
export function generateSimpleName(peerId: string): string {
  const hash = simpleHash(peerId);
  const animalIndex = hash % animals.length;
  const number = (hash % 99) + 1; // 1-99
  
  return `${animals[animalIndex]}${number}`;
}