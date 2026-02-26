import { vitePreprocess } from "@astrojs/svelte";
import sveltePreprocess from "svelte-preprocess";

export default {
  dev: process.env.NODE_ENV !== 'production',
  preprocess: [
    vitePreprocess(),
    sveltePreprocess({
      postcss: true,
      prependData: `@import 'src/styles/main.css';`
    })
  ],
  vitePlugin: {
    experimental: {
      useVitePreprocess: true
    }
  }
};
