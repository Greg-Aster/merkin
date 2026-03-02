/**
 * remark-rebase-images.mjs
 *
 * Rewrites absolute image paths in markdown to include the Astro `base` URL.
 * This makes images work on both Cloudflare Pages (base = '/') and
 * GitHub Pages dev preview (base = '/merkin/travel/').
 *
 * Only rewrites paths that start with '/' and are not protocol-relative ('//')
 * or external URLs. Paths that already start with the base are left alone.
 */

import { visit } from 'unist-util-visit';

export function remarkRebaseImages(options = {}) {
  const base = (options.base || '/').replace(/\/$/, ''); // strip trailing slash

  return function (tree) {
    if (!base) return; // base is '' (root), nothing to prefix

    visit(tree, 'image', function (node) {
      if (
        node.url &&
        node.url.startsWith('/') &&
        !node.url.startsWith('//') &&
        !node.url.startsWith(base + '/')
      ) {
        node.url = base + node.url;
      }
    });
  };
}
