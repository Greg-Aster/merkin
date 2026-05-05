import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import Compress from "astro-compress";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";
import { AdmonitionComponent } from "./src/plugins/rehype-component-admonition.mjs";
import { GithubCardComponent } from "./src/plugins/rehype-component-github-card.mjs";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";
import mdx from "@astrojs/mdx";
import { createDevRuntimePlugin } from "../../scripts/dev-runtime.mjs";

// CORS middleware for friend content sharing
const corsMiddleware = () => {
  return {
    name: 'cors-middleware',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          if (req.url.includes('/rss.xml') ||
              req.url.includes('/feed.xml') ||
              req.url.includes('/feed') ||
              req.url.includes('/rss') ||
              req.url.includes('/atom.xml') ||
              req.url.includes('/api/') ||
              req.url.includes('/friend-content.json')) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              return res.end();
            }
          }
          next();
        });
      },
    }
  };
};

const site = process.env.SITE_URL || 'https://megameal.org';
const base = process.env.SITE_BASE || '/';
const isDev = process.env.NODE_ENV !== 'production';
const siteDevHost = process.env.SITE_DEV_HOST || '127.0.0.1';
const siteDevPort = Number.parseInt(process.env.SITE_DEV_PORT || '4321', 10);

function manualClientChunks(id) {
  const normalizedId = id.replaceAll('\\', '/');

  if (normalizedId.includes('node_modules')) {
    if (normalizedId.includes('photoswipe')) return 'vendor-photoswipe';
    if (normalizedId.includes('marked') || normalizedId.includes('markdown-it')) return 'vendor-markdown';
    if (normalizedId.includes('katex')) return 'vendor-katex';
    if (normalizedId.includes('mammoth')) return 'vendor-mammoth';
    if (normalizedId.includes('overlayscrollbars')) return 'vendor-overlayscrollbars';
    if (normalizedId.includes('howler')) return 'vendor-audio';
    if (normalizedId.includes('chart.js')) return 'vendor-chart';
    if (normalizedId.includes('peerjs')) return 'vendor-realtime';
    if (normalizedId.includes('three/examples')) return 'vendor-3d-extras';
    if (normalizedId.includes('/node_modules/three/')) return 'vendor-3d-core';
    if (normalizedId.includes('@threlte')) return 'vendor-3d-extras';
    return 'vendor';
  }

  if (normalizedId.includes('/src/utils/megamealRouteTransitions')) {
    return 'feature-route-transitions';
  }

  if (
    normalizedId.includes('/src/stores/cartStore') ||
    normalizedId.includes('/src/components/store/')
  ) {
    return 'feature-store';
  }

  if (normalizedId.includes('/src/components/banner-stage/')) {
    return 'feature-banner-stage';
  }

  if (
    normalizedId.includes('/src/components/home/featured-product/') ||
    normalizedId.includes('/src/components/home/FeaturedProduct') ||
    normalizedId.includes('/src/components/home/Procedural') ||
    normalizedId.includes('/src/utils/flagship-product-showcase') ||
    normalizedId.includes('/src/utils/product-banner-quirks')
  ) {
    return 'feature-featured-product';
  }

  if (
    normalizedId.includes('/src/components/home/HomeIntroEnvironmentLoader.svelte')
  ) {
    return 'feature-home-intro-loader';
  }

  if (
    normalizedId.includes('/src/components/home/HomeIntro') ||
    normalizedId.includes('/src/components/home/homeIntro')
  ) {
    return 'feature-home-intro';
  }

  if (normalizedId.includes('/src/components/home/PortalHeroBackgroundSlide.astro')) {
    return 'feature-portal-background';
  }

  if (normalizedId.includes('/src/components/home/UniverseHeroSlide.astro')) {
    return 'feature-universe-hero';
  }

  if (normalizedId.includes('/src/components/home/')) {
    return 'feature-home-content';
  }

  if (
    normalizedId.includes('/src/utils/site-audio') ||
    normalizedId.includes('/src/utils/site-sfx') ||
    normalizedId.includes('/src/components/client/SiteAudioControl.svelte')
  ) {
    return 'feature-audio';
  }

  return undefined;
}

export default defineConfig({
  site,
  base,
  trailingSlash: "always",
  server: {
    host: siteDevHost,
    port: siteDevPort,
  },
  integrations: [
    corsMiddleware(),
    tailwind(),
    icon({
      include: {
        "fa6-brands": ["*"],
        "fa6-regular": ["*"],
        "fa6-solid": ["*"],
      },
    }),
    svelte(),
    sitemap({
      filter: (page) =>
        !page.includes('/feed') &&
        !page.includes('/rss') &&
        !page.includes('/atom') &&
        page !== '/new-post/' &&
        page !== '/configs/' &&
        page !== '/friends/' &&
        page !== '/feed.xml' &&
        page !== '/rss.xml' &&
        page !== '/atom.xml',
    }),
    Compress({
      CSS: false,
      Image: false,
      Action: {
        Passed: async () => true,
      },
    }),
    mdx(),
  ],
  markdown: {
    remarkPlugins: [
      remarkMath,
      remarkReadingTime,
      remarkExcerpt,
      remarkGithubAdmonitionsToDirectives,
      remarkDirective,
      remarkSectionize,
      parseDirectiveNode,
    ],
    rehypePlugins: [
      rehypeKatex,
      rehypeSlug,
      [
        rehypeComponents,
        {
          components: {
            github: GithubCardComponent,
            note: (x, y) => AdmonitionComponent(x, y, "note"),
            tip: (x, y) => AdmonitionComponent(x, y, "tip"),
            important: (x, y) => AdmonitionComponent(x, y, "important"),
            caution: (x, y) => AdmonitionComponent(x, y, "caution"),
            warning: (x, y) => AdmonitionComponent(x, y, "warning"),
          },
        },
      ],
      [
        rehypeAutolinkHeadings,
        {
          behavior: "append",
          properties: { className: ["anchor"] },
          content: {
            type: "element",
            tagName: "span",
            properties: {
              className: ["anchor-icon"],
              "data-pagefind-ignore": true,
            },
            children: [{ type: "text", value: "#" }],
          },
        },
      ],
    ],
  },
  vite: {
    ssr: {
      noExternal: [/^@fontsource/, 'katex'],
    },
    optimizeDeps: {
      include: ['mammoth'],
      force: isDev,
    },
    server: {
      host: siteDevHost,
      port: siteDevPort,
      cors: {
        origin: '*',
        methods: ['GET', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
      },
    },
    plugins: [createDevRuntimePlugin('megameal', siteDevHost)],
    build: {
      chunkSizeWarningLimit: 550,
      rollupOptions: {
        output: {
          manualChunks: manualClientChunks,
        },
        onwarn(warning, warn) {
          if (
            warning.message.includes("is dynamically imported by") &&
            warning.message.includes("but also statically imported by")
          ) {
            return;
          }
          warn(warning);
        },
      },
    },
  },
});
