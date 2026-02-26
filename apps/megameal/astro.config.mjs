import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import swup from "@swup/astro";
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

export default defineConfig({
  site,
  base,
  trailingSlash: "always",
  integrations: [
    corsMiddleware(),
    tailwind({ nesting: true }),
    swup({
      theme: false,
      animationClass: "transition-swup-",
      containers: ["main", "#toc", "#banner-wrapper", "#swup-featured-content"],
      smoothScrolling: true,
      cache: true,
      preload: true,
      accessibility: true,
      updateHead: true,
      updateBodyClass: false,
      globalInstance: true,
    }),
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
    },
    server: {
      cors: {
        origin: '*',
        methods: ['GET', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
      },
    },
    build: {
      rollupOptions: {
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
