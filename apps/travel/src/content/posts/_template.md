---
# =============================================================================
# TRAIL LOG — POST TEMPLATE
# For AI agents: read the guide in the body of this file before filling in
# frontmatter. Replace ALL placeholder values and delete comments when done.
# File naming: use lowercase-hyphenated slugs, e.g. "day-14-big-bear.md"
# =============================================================================

# ── REQUIRED ─────────────────────────────────────────────────────────────────
title: "Your Post Title Here"
published: 2026-03-01        # YYYY-MM-DD — must be exact date format

# ── STRONGLY RECOMMENDED ─────────────────────────────────────────────────────
description: "One sentence summary shown in post listings and link previews."
tags:
  - pacific-crest-trail      # lowercase-hyphenated; first tag = primary
  - trail-notes              # add as many as relevant
category: "Trail Notes"      # see valid categories in the guide below

# ── DATES (optional) ─────────────────────────────────────────────────────────
# updated: 2026-03-15        # YYYY-MM-DD — date this post was last revised

# ── THUMBNAIL / COVER IMAGE (optional) ───────────────────────────────────────
# image: "https://example.com/cover.jpg"   # shown as thumbnail in post list
# showImageOnPost: true                    # also render image inside the post body

# ── AUTHOR CARD (optional) ───────────────────────────────────────────────────
# Shows a small card under the post title. Omit the block entirely if unused.
# avatarImage: "/avatar/avatar1.jpg"          # your photo (stored in public/avatar/)
# authorName: "Greg Aster"
# authorBio: "PCT Class of 2026 — Campo to Canada"
# authorLink: "https://dndiy.org"              # URL when author name is clicked

# ── HERO BANNER (optional) ───────────────────────────────────────────────────
# Renders a full-width banner at the top of the post.
# bannerType: "image"        # "image" | "video" | "timeline" | "assistant"
# bannerLink: "https://example.com"   # makes the entire banner clickable
# bannerData:
#   # For bannerType: "image"
#   imageUrl: "https://example.com/hero.jpg"
#
#   # For bannerType: "video"
#   videoId: "YouTubeVideoID"         # 11-char YouTube ID only — not the full URL
#
#   # For bannerType: "timeline" — renders the full trail timeline as banner
#   category: "pct-2026"             # filters timeline to this era
#   startYear: 2026                  # timeline window start
#   endYear: 2027                    # timeline window end
#   background: "https://example.com/timeline-bg.jpg"  # backdrop image
#   title: "PCT 2026"                # optional title overlay
#
#   # Shared bannerData options
#   height: "50vh"                   # CSS height value, e.g. "400px" or "60vh"
#   compact: false                   # true = shorter/minimal banner variant

# ── PAGE BACKGROUND (optional) ───────────────────────────────────────────────
# backgroundImage: "https://example.com/bg.jpg"   # full-page background image

# ── TIMELINE PLACEMENT (optional) ────────────────────────────────────────────
# Adds this post as a node on the trail timeline visualization.
# timelineYear: 2026
# timelineEra: "pct-2026"           # groups posts into a visual era band
# timelineLocation: "Campo, California"
# isKeyEvent: false                 # true = highlighted node on timeline
# yIndex: 0                         # vertical offset for this node (fine-tuning)

# ── LAYOUT FLAGS (optional) ──────────────────────────────────────────────────
# oneColumn: false    # true = full-width layout, no sidebar
# draft: false        # true = hidden from production, visible in dev preview only
# lang: "en"          # language code; omit for default

# ── MANUAL NAVIGATION (optional) ─────────────────────────────────────────────
# Overrides auto-generated prev/next links at the bottom of the post.
# prevTitle: "Previous Post Title"
# prevSlug: "previous-post-slug"
# nextTitle: "Next Post Title"
# nextSlug: "next-post-slug"
---

Write your post content here. Plain Markdown. A blank line between paragraphs is all you need.

You can use:

- **Bold**, *italic*, `inline code`
- Bullet lists and numbered lists
- `## Section headers` to organize longer posts
- `![Alt text](image-url)` for images
- `> Blockquote` for memorable moments or quotes

---

<!-- =========================================================================
AI AGENT GUIDE — HOW TO FORMAT RAW CONTENT INTO THIS TEMPLATE
=============================================================================

This is a travel blog for a PCT (Pacific Crest Trail) thru-hike. Posts are
written on mobile, often in raw note form, and formatted into this template
before publishing. Your job is to fill in the frontmatter and clean up the
body. Here is everything you need to know.

── REQUIRED FIELDS ──────────────────────────────────────────────────────────

  title       Required. A concise, human-readable title. Sentence case.
              Examples: "Day 14 — Big Bear Lake" / "Zero Day in Agua Dulce"

  published   Required. The date the content was written or the event occurred.
              Format: YYYY-MM-DD (e.g. 2026-04-15). Never use a future date.

── OPTIONAL FIELDS — QUICK REFERENCE ────────────────────────────────────────

  updated         YYYY-MM-DD. Use when a previously published post is revised.
                  Displayed as "Updated on [date]" in the post header.

  description     One sentence. Shown in post listing cards and link previews.
                  Write it as a complete sentence, not a headline fragment.

  tags            Array of lowercase-hyphenated strings. 3–6 tags is ideal.
                  First tag is the primary tag used in some list views.

  category        Single string. Pick from the valid list below.

  image           URL or repo-local path. Used as the thumbnail in post lists.
                  Does NOT appear in the post body unless showImageOnPost: true.

  showImageOnPost Set true to also embed the image field inside the post body
                  (in addition to using it as a list thumbnail).

  draft           true = post is built but hidden from production feeds.
                  Use for in-progress posts or posts not yet ready to publish.
                  Default: false (live). Omit entirely if publishing live.

  lang            Language code string, e.g. "en". Omit if not multilingual.

  oneColumn       true = removes sidebar, post renders full-width.
                  Useful for long reference posts or image-heavy layouts.

── AUTHOR CARD ───────────────────────────────────────────────────────────────

  avatarImage     Path to your author avatar. Stored in apps/travel/public/avatar/.
                  Always use: /avatar/avatar1.jpg  (your actual photo)
                  Do NOT use /content/avatar/... — that path is not a public URL.

  authorName      Display name shown on the author card.

  authorBio       Short bio shown on the author card (one line).

  authorLink      URL — wraps the author name in a clickable link.

  Standard block for this blog:
    avatarImage: "/avatar/avatar1.jpg"
    authorName: "Greg Aster"
    authorBio: "PCT Class of 2026 — Campo to Canada"

── HERO BANNER ───────────────────────────────────────────────────────────────

  Use bannerType + bannerData when you have a strong header image or video.
  If there is no good image, omit the banner entirely — do not force it.

  bannerLink      Optional URL that makes the entire banner a clickable link.

  bannerData.height    CSS height value for the banner, e.g. "400px" or "50vh".
                       Omit to use the default height.
  bannerData.compact   true = renders a shorter/minimal banner variant.

  Image banner (most common):
    bannerType: "image"
    bannerData:
      imageUrl: "/posts/your-post-slug/hero.jpg"   # must be a local file (see IMAGE PATHS)

  YouTube video banner:
    bannerType: "video"
    bannerData:
      videoId: "dQw4w9WgXcQ"    # 11-character YouTube ID only, not the full URL

  Timeline banner (renders the trail timeline as the hero — use sparingly):
    bannerType: "timeline"
    bannerData:
      category: "pct-2026"      # filters the timeline to this era group
      startYear: 2026
      endYear: 2027
      background: "https://example.com/map.jpg"   # optional backdrop image
      title: "PCT 2026"                           # optional text overlay

  Assistant banner:
    bannerType: "assistant"
    (renders an interactive assistant panel — only use if explicitly requested)

── PAGE BACKGROUND ───────────────────────────────────────────────────────────

  backgroundImage   URL or path to an image used as the full-page backdrop.
                    Keep subtle — high-contrast backgrounds hurt readability.

── TIMELINE PLACEMENT ────────────────────────────────────────────────────────

  timelineYear        The year the event occurred (usually 2026 for PCT posts).
  timelineEra         Use "pct-2026" for all PCT hike posts. This groups posts
                      into a labeled band on the timeline visualization.
  timelineLocation    Trail location string, e.g. "Mile 265, Big Bear Lake".
  isKeyEvent          true = rendered as a highlighted/larger node on timeline.
                      Reserve for major milestones: trail start, halfway, finish,
                      significant injuries, major resupply towns, gear changes.
  yIndex              Integer offset for the node's vertical position on the
                      timeline. Use only for fine-tuning layout collisions.
                      Default 0. Positive = up, negative = down.

── MANUAL NAVIGATION ────────────────────────────────────────────────────────

  prevTitle / prevSlug    Override the auto-generated "previous post" link.
  nextTitle / nextSlug    Override the auto-generated "next post" link.
  Omit these entirely to let the system generate links by published date.

── CATEGORY — PICK ONE ──────────────────────────────────────────────────────

  "Trail Notes"       Day-in-the-life posts, daily logs, short field updates
  "Trail Guides"      How-to, reference, or educational content
  "Gear"              Equipment reviews, base weight breakdowns, gear decisions
  "Food & Nutrition"  Meal planning, resupply boxes, calorie math, recipes
  "Town Reports"      Notes from resupply towns — hostels, restaurants, stores
  "Reflections"       Personal essays, mental health, big-picture thinking

── TAGS — USE LOWERCASE-HYPHENATED ──────────────────────────────────────────

  Common tags for this blog:
    pacific-crest-trail, thru-hiking, trail-notes, gear, foot-care,
    resupply, town-stop, sierra-nevada, desert, water, injury, food,
    preparation, weather, wildlife, zero-day, big-miles, night-hiking,
    mental-health, navigation, camping, blisters, snow, permit, safety

  First tag = primary tag shown in some list views. Put the most specific
  or relevant tag first.

── HANDLING RAW MOBILE NOTES ─────────────────────────────────────────────────

  When given raw/unformatted content from a mobile note:
  1. Infer a meaningful title — do not use a placeholder.
  2. Set published to the date in the content, or today's date if unknown.
  3. Write a one-sentence description that summarizes the post.
  4. Choose the correct category from the list above.
  5. Pick 3–6 relevant tags; most specific tag first.
  6. Clean up the body: fix obvious typos, add paragraph breaks, add ##
     section headers for longer posts. Do NOT change the author's voice,
     remove content, or add information that was not in the original.
  7. Include only frontmatter fields that are actually relevant to this post.
     Do not pad the frontmatter with empty or placeholder values.

── IMAGE PATHS ───────────────────────────────────────────────────────────────

  RULE: Always use locally stored images. External URLs (https://...) are
  unreliable — they can disappear, rate-limit, or break CI builds.
  The ONE exception is YouTube video banners (bannerType: "video").

  ── WHERE TO PUT IMAGE FILES ──────────────────────────────────────────────

  Store images in:
    apps/travel/public/posts/your-post-slug/

  Example — for a post named "day-14-big-bear.md":
    apps/travel/public/posts/day-14-big-bear/campsite.jpg
    apps/travel/public/posts/day-14-big-bear/sunrise.jpg

  ── HOW TO REFERENCE IMAGES ───────────────────────────────────────────────

  Always use an absolute path starting with / (not a relative path):
    /posts/your-post-slug/filename.jpg

  This format works everywhere:
    • Frontmatter:   image: "/posts/day-14-big-bear/campsite.jpg"
    •                bannerData:
    •                  imageUrl: "/posts/day-14-big-bear/campsite.jpg"
    •                backgroundImage: "/posts/day-14-big-bear/bg.jpg"
    • Body markdown: ![Alt text](/posts/day-14-big-bear/campsite.jpg)

  DO NOT use relative paths like ../../posts/... — they break the Astro build.
  DO NOT use /content/... paths for public images — that is for Astro content
  collections (source files), not public-facing assets.

  ── FILE SIZE GUIDELINES ──────────────────────────────────────────────────

  Keep images under 1MB if possible. 200–500KB is ideal for web.
  Photos straight from a phone camera are often 5–10MB — too large.
  Resize or compress photos before uploading when you can.
  Files over 25MB are removed automatically during deployment.

  ── HOW TO UPLOAD IMAGES ──────────────────────────────────────────────────

  Via GitHub mobile app or web browser (github.com/Greg-Aster/merkin):

    1. Navigate to:  apps/travel/public/posts/
    2. If your post-slug folder doesn't exist yet:
         Tap "Add file" → "Upload files" — GitHub creates the folder
         automatically when you upload the first file into a new path.
         Type the folder name before the filename: "day-14-big-bear/image.jpg"
    3. Select your photo and commit directly to the dev branch.
    4. The image is now available at /posts/day-14-big-bear/image.jpg

  After uploading, reference it in the frontmatter or body as shown above.

  ── HOW BOTH DEPLOYMENTS HANDLE PATHS ────────────────────────────────────

  Cloudflare Pages (production — travel.dndiy.org):
    Base path = /   →  /posts/your-slug/image.jpg resolves correctly as-is.

  GitHub Pages (dev preview — greg-aster.github.io/merkin/travel/):
    Base path = /merkin/travel/
    A build plugin (remark-rebase-images) automatically rewrites body image
    paths at build time, so /posts/... expands to /merkin/travel/posts/...
    No manual action needed — use /posts/your-slug/... and it works on both.

  Frontmatter fields (image:, bannerData.imageUrl:, backgroundImage:) are
  also handled automatically by the site's ImageWrapper component.

  ── MISSING PHOTO PLACEHOLDER ─────────────────────────────────────────────

  If you mention a photo but haven't uploaded it yet, add a comment:
    <!-- photo: [description of intended image, e.g. "view from scout peak"] -->

======================================================================== -->
