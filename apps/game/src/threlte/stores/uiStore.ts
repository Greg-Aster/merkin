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

// Audio settings
export const isSoundEnabled = writable<boolean>(true);