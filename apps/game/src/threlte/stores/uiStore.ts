import { writable } from 'svelte/store';

const createUiStore = () => {
  const { subscribe, update } = writable({
    isInputFocused: false,
  });

  return {
    subscribe,
    setInputFocus: (isFocused: boolean) => {
      update(s => ({ ...s, isInputFocused: isFocused }));
    }
  };
};

export const uiStore = createUiStore();
export const setInputFocus = uiStore.setInputFocus;
// Settings menu visibility
export const isSettingsMenuOpen = writable<boolean>(false);

function createPersistentStore(key: string, initialValue: boolean | number) {
  const store = writable(initialValue);

  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(key);
    if (stored !== null) {
      if (typeof initialValue === 'boolean') {
        store.set(stored === 'true');
      } else {
        const parsed = Number(stored);
        if (Number.isFinite(parsed)) {
          store.set(Math.min(1, Math.max(0, parsed)));
        }
      }
    }

    store.subscribe((value) => {
      window.localStorage.setItem(key, String(value));
    });
  }

  return store;
}

// Audio settings
export const isSoundEnabled = createPersistentStore('megameal-game-audio-enabled', true);
export const masterVolumeSetting = createPersistentStore('megameal-game-master-volume', 0.7);
export const ambienceVolumeSetting = createPersistentStore('megameal-game-ambience-volume', 0.42);
export const sfxVolumeSetting = createPersistentStore('megameal-game-sfx-volume', 0.48);
