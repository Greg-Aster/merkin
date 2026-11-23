# Megameal Site Map

This is a working map of the Astro routes in `apps/megameal/src/pages`.

## Primary Pages

| Route | Purpose | Source |
| --- | --- | --- |
| `/` | Home page, production portal | `src/pages/[...page].astro` |
| `/timeline/` | 3D Timeline experience | `src/pages/timeline.astro` |
| `/game/` | Redirect to `https://game.megameal.org/` | `src/pages/game.astro` |
| `/archive/` | Story archive index | `src/pages/archive/index.astro` |
| `/store/` | Store/catalog landing page | `src/pages/store.astro` |
| `/videos/` | Video archive index | `src/pages/videos/index.astro` |
| `/cookbook/` | Cookbook index | `src/pages/cookbook/index.astro` |
| `/reader/` | Interactive reader & First Contact Manual | `src/pages/reader/index.astro` |
| `/snuggaloids/` | Snuggaloids customizer | `src/pages/snuggaloids/index.astro` |
| `/merkin/` | Merkin archive | `src/pages/merkin/index.astro` |
| `/community/` | Community page | `src/pages/community.astro` |
| `/about/` | About page | `src/pages/about.astro` |
| `/privacy/` | Privacy page | `src/pages/privacy.astro` |
| `/host/` | Redirect to `https://game.megameal.org/host` | `src/pages/host.astro` |

## Content Routes

| Route Pattern | Purpose | Source |
| --- | --- | --- |
| `/posts/[slug]/` | Blog/story post detail pages | `src/pages/posts/[...slug].astro` |
| `/about/[slug]/` | Extended about/team/content detail pages | `src/pages/about/[...slug].astro` |
| `/archive/category/[category]/` | Archive category pages | `src/pages/archive/category/[category].astro` |
| `/archive/category/uncategorized/` | Uncategorized archive category page | `src/pages/archive/category/uncategorized.astro` |
| `/archive/tag/[tag]/` | Archive tag pages | `src/pages/archive/tag/[tag].astro` |
| `/[page]/` | Paginated home/post listing pages | `src/pages/[...page].astro` |

## Store Routes

| Route Pattern | Purpose | Source |
| --- | --- | --- |
| `/store/[slug]/` | Product detail pages | `src/pages/store/[slug].astro` |
| `/store/page/[page]/` | Store pagination | `src/pages/store/page/[page].astro` |
| `/store/checkout/` | Checkout page | `src/pages/store/checkout.astro` |
| `/store-placeholder/` | Store placeholder page | `src/pages/store-placeholder.astro` |

## Quiz Routes

| Route Pattern | Purpose | Source |
| --- | --- | --- |
| `/quiz/` | Quiz index | `src/pages/quiz/index.astro` |
| `/quiz/[slug]/` | Quiz detail pages | `src/pages/quiz/[slug].astro` |

## Retired Route Redirects

| Route | Redirects To | Source |
| --- | --- | --- |
| `/test-portal/` | `/` | `src/pages/test-portal.astro` |
| `/login/` | `/` | `src/pages/login.astro` |
| `/configs/` | `/` | `src/pages/configs.astro` |
| `/friends/` | `/community/` | `src/pages/friends.astro` |
| `/store-placeholder/` | `/store/` | `src/pages/store-placeholder.astro` |
| `/timeline/2d/` | `/timeline/` | `src/pages/timeline/2d.astro` |

## Feeds And Generated Files

| Route | Purpose | Source |
| --- | --- | --- |
| `/sitemap.xml` | XML sitemap | `src/pages/sitemap.xml.ts` |
| `/robots.txt` | Robots file | `src/pages/robots.txt.ts` |
| `/rss.xml` | RSS feed | `src/pages/rss.xml.ts` |
| `/rss/` | RSS index feed route | `src/pages/rss/index.xml.ts` |
| `/feed.xml` | Feed XML | `src/pages/feed.xml.ts` |
| `/feed/` | Feed index route | `src/pages/feed/index.xml.ts` |
| `/atom.xml` | Atom feed | `src/pages/atom.xml.ts` |
| `/pdf/posts/[slug]/` | Printable/PDF post route | `src/pages/pdf/posts/[...slug].astro` |

## Error Pages

| Route | Purpose | Source |
| --- | --- | --- |
| `/404/` | Not found page | `src/pages/404.astro` |

## Notes

- The production homepage is `/`.
- The experimental 3D portal is `/test-portal/`.
- Dynamic route names in brackets, like `[slug]`, are generated from content or data.
- Astro is configured with trailing slashes, so local URLs usually look like `http://127.0.0.1:4321/test-portal/`.
