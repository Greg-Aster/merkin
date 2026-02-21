import { vitePreprocess } from "@astrojs/svelte";
import sveltePreprocess from "svelte-preprocess";

export default {
  // Enable runtime checks when not in production
  dev: process.env.NODE_ENV !== 'production',

  // Combine both preprocess configurations
  preprocess: [
    vitePreprocess(),
    sveltePreprocess({
      // Make PostCSS available to svelte-preprocess
      postcss: true,
      // Prepend global styles to all Svelte components
      prependData: `@import 'src/styles/main.css';`
    })
  ],

  // Additional configuration options
  vitePlugin: {
    experimental: {
      // Use SvelteKit's browser-only build
      useVitePreprocess: true
    }
  }
};