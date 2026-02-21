# MEGAMEAL Project: Gemini Assistant Guide

This document provides a comprehensive guide for the Gemini AI assistant to effectively understand and contribute to the MEGAMEAL project.

## Project Overview

MEGAMEAL is an immersive storytelling universe that combines an interactive narrative, a 3D web game, and rich multimedia content. The project is built on a modern web stack, leveraging Astro for static site generation, Svelte for reactive UI components, and Threlte (a Three.js wrapper for Svelte) for the 3D game engine.

The narrative explores themes of consciousness, time, and culinary adventures across the cosmos, presented through an interactive timeline, character profiles, and a variety of media formats.

**Key Technologies:**

*   **Frontend Framework:** [Astro](https://astro.build/)
*   **UI Components:** [Svelte](https://svelte.dev/)
*   **3D Game Engine:** [Threlte](https://threlte.xyz/) (using Three.js and Rapier3D for physics)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Content:** [MDX](https://mdxjs.com/) (Markdown with JSX)

## Building and Running the Project

The project uses `pnpm` as the package manager. The following scripts are available in `package.json`:

*   **`pnpm dev`**: Starts the development server.
*   **`pnpm build`**: Builds the project for production. This also runs `pagefind` to create a search index.
*   **`pnpm preview`**: Previews the production build locally.
*   **`pnpm format`**: Formats the code in the `src` directory using Biome.
*   **`pnpm lint`**: Lints and applies fixes to the code in the `src` directory using Biome.
*   **`pnpm type-check`**: Runs the TypeScript compiler to check for type errors.

## Development Conventions

*   **Content Management:** All content is managed in the `src/content` directory. The structure and schema for each content type are defined in `src/content/config.ts`.
*   **Styling:** The project uses Tailwind CSS for utility-first styling. Global styles and PostCSS are configured in `svelte.config.js`. The theme and design tokens are defined in `tailwind.config.cjs`.
*   **Components:** Reusable UI components are located in `src/components`. Svelte is the primary component framework.
*   **Layouts:** Page layouts are defined in the `src/layouts` directory. The main layout is `Layout.astro`, which includes the global styles, scripts, and SEO metadata.
*   **3D Game:** The 3D game is built with Threlte and is located in the `src/threlte` directory. Game-specific configurations and aliases are defined in `astro.config.mjs`.

## Key Files for Context

*   **`README.md`**: Provides a high-level overview of the project, its features, and the technical stack.
*   **`package.json`**: Defines the project's dependencies, scripts, and metadata.
*   **`astro.config.mjs`**: The main configuration file for the Astro framework. It includes integrations, Markdown settings, and Vite configurations.
*   **`svelte.config.js`**: Configuration file for Svelte, including preprocessing and global styles.
*   **`tailwind.config.cjs`**: Configuration file for Tailwind CSS, including theme, plugins, and content paths.
*   **`src/config/config.ts`**: Defines the site-wide configuration, including the title, theme, and navigation links.
*   **`src/content/config.ts`**: Defines the schemas for all content collections, including posts, characters, and products.
*   **`src/layouts/Layout.astro`**: The main layout for the site, which includes the global head, body, and scripts.
