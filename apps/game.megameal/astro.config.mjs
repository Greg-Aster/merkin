import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";

const site = process.env.SITE_URL || "https://game.megameal.org";
const base = process.env.SITE_BASE || "/";

export default defineConfig({
	site,
	base,
	trailingSlash: "always",
	integrations: [svelte()],
});
