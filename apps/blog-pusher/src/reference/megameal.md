# MEGAMEAL — Post Format Reference

## Site Info
- **URL:** megameal.org
- **Repo path:** `apps/megameal/src/content/posts/your-slug.md` (or `.mdx`)
- **File format:** `.md` or `.mdx` (MDX allows JSX/Svelte components inside markdown)
- **Images:** Place in `apps/megameal/public/blog-images/` — reference as `/blog-images/filename.jpg`

## Schema Notes
- `bannerType` can be: `image`, `video`, or `timeline`
- For video banners use `bannerData.videoId` (YouTube video ID)
- For image banners use `bannerData.imageUrl` (**NOT** `image` — different from other sites!)
- `oneColumn: true` for wide full-width layout
- `authorLink` should be `/about/slug/` if the author has a profile page
- Valid `timelineEra` values: `awakening-era`, `golden-age`, `conflict-epoch`, `singularity-wars`
- `tags` must be an array: `[Tag1, Tag2]`
- `draft: false` to publish, `draft: true` to hide
- If using `.mdx` you can embed Svelte/JSX components in the content

## Frontmatter Template

```yaml
---
title: "Post Title"
published: 2026-03-15
description: "Brief description of the post."
image: "/blog-images/my-image.jpg"
avatarImage: "/posts/generic/avatar.png"
authorName: "Character Name"
authorBio: "Character description or role"
authorLink: "/about/character-slug/"
oneColumn: false
bannerType: "image"
bannerData:
  imageUrl: "/blog-images/my-image.jpg"
timelineYear: 33900
timelineEra: "golden-age"
timelineLocation: "Location in the MEGA MEAL universe"
isKeyEvent: false
showImageOnPost: false
tags: [Tag1, Tag2]
category: "MEGA MEAL"
draft: false
lang: ""
---

Post content here. MDX supported — you can use JSX components.
```

---

## AI Editing Prompt

Copy everything below this line and paste into Claude or ChatGPT, then add your draft at the bottom.

---

You are editing a blog post for my MEGAMEAL multimedia website. Please:

1. Review my draft for clarity, fix grammar and spelling errors
2. Rewrite or improve the content if needed — keep my voice and intent, and the in-universe tone if applicable
3. Generate correct frontmatter using the schema below
4. Return the complete, corrected post as a single markdown code block, ready to save and publish
5. The filename should be a lowercase hyphenated slug of the title (e.g. `my-post-title.md`)

**SITE:** MEGAMEAL (megameal.org)
**FILE FORMAT:** .md or .mdx (MDX allows JSX/Svelte components inside markdown)
**FILE LOCATION IN REPO:** `apps/megameal/src/content/posts/your-slug.md` (or .mdx)
**IMAGES:** Place in `apps/megameal/public/blog-images/` — reference as `/blog-images/filename.jpg`

**SCHEMA NOTES:**
- bannerType can be: "image", "video", or "timeline"
- For video banners use bannerData.videoId (YouTube ID)
- For image banners use bannerData.imageUrl (NOT image — different from other sites!)
- oneColumn: true for wide full-width layout
- authorLink should be /about/slug/ if the author has a profile page
- Valid timelineEra values: "awakening-era", "golden-age", "conflict-epoch", "singularity-wars"
- tags must be an array: [Tag1, Tag2]
- draft: false to publish, true to hide
- MDX: if using .mdx you can embed Svelte/JSX components

**FRONTMATTER TEMPLATE:**
```yaml
---
title: "Post Title"
published: 2026-03-15
description: "Brief description of the post."
image: "/blog-images/my-image.jpg"
avatarImage: "/posts/generic/avatar.png"
authorName: "Character Name"
authorBio: "Character description or role"
authorLink: "/about/character-slug/"
oneColumn: false
bannerType: "image"
bannerData:
  imageUrl: "/blog-images/my-image.jpg"
timelineYear: 33900
timelineEra: "golden-age"
timelineLocation: "Location in the MEGA MEAL universe"
isKeyEvent: false
showImageOnPost: false
tags: [Tag1, Tag2]
category: "MEGA MEAL"
draft: false
lang: ""
---
```

--- MY DRAFT POST BELOW ---

[Paste your draft here]
