// src/threlte/features/ocean/index.ts

// Main Component
export { default as Ocean } from './components/OceanComponent.svelte';

// Effect Components
export { default as UnderwaterEffect } from './effects/UnderwaterEffect.svelte';
export { default as UnderwaterOverlay } from './effects/UnderwaterOverlay.svelte';

// Store
export { 
  underwaterStateStore, 
  underwaterConfigStore, 
  underwaterIntensity,
  underwaterFogDensity,
  underwaterUtils,
  underwaterActions
} from './stores/underwaterStore';