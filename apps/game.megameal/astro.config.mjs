import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";
import { megamealEditorDevApi } from "./scripts/editor-dev-api.mjs";

const site = process.env.SITE_URL || "https://game.megameal.org";
const base = process.env.SITE_BASE || "/";

export default defineConfig({
	site,
	base,
	trailingSlash: "always",
	integrations: [svelte()],
	vite: {
		plugins: [megamealEditorDevApi()],
	},
});
