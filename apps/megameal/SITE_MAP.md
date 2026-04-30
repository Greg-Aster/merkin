# Megameal Site Map

This is a working map of the Astro routes in `apps/megameal/src/pages`.

## Primary Pages

| Route | Purpose | Source |
| --- | --- | --- |
| `/` | Home page, production portal | `src/pages/[...page].astro` |
| `/test-portal/` | Development/test version of the portal with the 3D overlay work | `src/pages/test-portal.astro` |
| `/timeline/` | Timeline experience | `src/pages/timeline.astro` |
| `/game/` | Game/observatory entry point | `src/pages/game.astro` |
| `/archive/` | Story archive index | `src/pages/archive/index.astro` |
| `/store/` | Store/catalog landing page | `src/pages/store.astro` |
| `/snuggaloid-concept/` | Physical Snuggaloid commission concept and artist brief | `src/pages/snuggaloid-concept.astro` |
| `/community/` | Community page | `src/pages/community.astro` |
| `/about/` | About page | `src/pages/about.astro` |
| `/privacy/` | Privacy page | `src/pages/privacy.astro` |
| `/host/` | Host page | `src/pages/host.astro` |

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

## Admin And Local Tools

| Route | Purpose | Source |
| --- | --- | --- |
| `/login/` | Login page | `src/pages/login.astro` |
| `/configs/` | Site configuration/admin page | `src/pages/configs.astro` |
| `/new-post/` | New post/editor page | `src/pages/new-post.astro` |
| `/friends/` | Friends/admin content page | `src/pages/friends.astro` |

## Labs

| Route | Purpose | Source |
| --- | --- | --- |
| `/labs/banner-stage/` | Banner stage lab | `src/pages/labs/banner-stage.astro` |
| `/labs/featured-product-banner/` | Featured product banner lab | `src/pages/labs/featured-product-banner.astro` |
| `/labs/store-scene-data/` | Store scene data lab | `src/pages/labs/store-scene-data.astro` |

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
| `/friend-content-json/` | Friend content JSON endpoint | `src/pages/friend-content-json.ts` |
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
