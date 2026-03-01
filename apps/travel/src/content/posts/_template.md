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

# ── AUTHOR CARD (optional) ───────────────────────────────────────────────────
# Shows a small card under the post title. Omit the block entirely if unused.
# avatarImage: "/content/avatar/avatar.png"   # pick any from /content/avatar/
# authorName: "Greg Aster"
# authorBio: "PCT Class of 2026 — Campo to Canada"

# ── HERO BANNER (optional) ───────────────────────────────────────────────────
# Renders a full-width banner at the top of the post.
# bannerType: "image"                  # "image" | "video" | "timeline"
# bannerData:
#   imageUrl: "https://example.com/hero.jpg"   # for bannerType: image
#   # videoId: "YouTubeVideoID"                # for bannerType: video (no URL, just the ID)

# ── TIMELINE PLACEMENT (optional) ────────────────────────────────────────────
# Adds this post as a node on the trail timeline visualization.
# timelineYear: 2026
# timelineEra: "pct-2026"             # groups posts into a visual era band
# timelineLocation: "Campo, California"
# isKeyEvent: false                   # true = highlighted node on timeline

# ── IMAGE / THUMBNAIL (optional) ─────────────────────────────────────────────
# image: "https://example.com/cover.jpg"   # shown as thumbnail in post list
# showImageOnPost: true                    # also embed image inside the post

# ── NAVIGATION LINKS (optional) ──────────────────────────────────────────────
# Manual prev/next post links. Leave empty if not needed.
# prevTitle: ""
# prevSlug: ""
# nextTitle: ""
# nextSlug: ""

# ── MISC FLAGS (optional) ────────────────────────────────────────────────────
# draft: false          # true = hidden from production, visible in dev only
# lang: "en"
# oneColumn: false      # true = full-width layout with no sidebar
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
============================================================================

This is a travel blog for a PCT (Pacific Crest Trail) thru-hike. Posts are
written on mobile, often in raw note form, and formatted into this template
before publishing. Your job is to fill in the frontmatter and clean up the
body. Here is everything you need to know.

── REQUIRED FIELDS ──────────────────────────────────────────────────────────

  title       Required. A concise, human-readable title. Sentence case.
              Examples: "Day 14 — Big Bear Lake" / "Zero Day in Agua Dulce"

  published   Required. The date the content was written or the event occurred.
              Format: YYYY-MM-DD (e.g. 2026-04-15). Never use a future date.

── CATEGORY — pick one ──────────────────────────────────────────────────────

  "Trail Notes"      Day-in-the-life posts, daily logs, short updates
  "Trail Guides"     How-to, reference, or educational content
  "Gear"             Equipment reviews, base weight breakdowns, gear decisions
  "Food & Nutrition" Meal planning, resupply boxes, calorie math, recipes
  "Town Reports"     Notes from resupply towns — hostels, restaurants, stores
  "Reflections"      Personal essays, mental health, big-picture thinking

── TAGS — use lowercase-hyphenated ──────────────────────────────────────────

  Common tags for this blog:
    pacific-crest-trail, thru-hiking, trail-notes, gear, foot-care,
    resupply, town-stop, sierra-nevada, desert, water, injury, food,
    preparation, weather, wildlife, zero-day, big-miles, night-hiking,
    mental-health, navigation, camping

  The first tag is treated as the primary tag in some views. Put the most
  specific/relevant tag first.

── BANNER SYSTEM ─────────────────────────────────────────────────────────────

  Use bannerType + bannerData when you have a good header image or video.
  If there's no good image, omit the banner entirely — don't force it.

  Image banner (most common):
    bannerType: "image"
    bannerData:
      imageUrl: "https://full-url-to-image.jpg"

  YouTube video banner:
    bannerType: "video"
    bannerData:
      videoId: "dQw4w9WgXcQ"      # just the 11-character YouTube ID, not the full URL

  Timeline banner (shows the full trail timeline — use sparingly):
    bannerType: "timeline"
    bannerData:
      category: "pct-2026"
      startYear: 2026
      endYear: 2027

── AUTHOR CARD ───────────────────────────────────────────────────────────────

  Available avatar images (reference by path):
    /content/avatar/avatar.png
    /content/avatar/avatar2.png  through  /content/avatar/avatar8.png
    /content/avatar/ComfyUI_0001.png
    /content/avatar/ComfyUI_0009.png
    /content/avatar/ComfyUI_0014.png

  Standard author block for this blog:
    avatarImage: "/content/avatar/avatar.png"
    authorName: "Greg Aster"
    authorBio: "PCT Class of 2026 — Campo to Canada"

── TIMELINE PLACEMENT ────────────────────────────────────────────────────────

  timelineYear       The year the event happened (usually 2026)
  timelineEra        Use "pct-2026" for all PCT hike posts
  timelineLocation   Trail location at time of writing (e.g. "Mile 265, Big Bear Lake")
  isKeyEvent         Set true only for major milestones (start, halfway, finish,
                     significant injuries, major resupply towns)

── HANDLING RAW MOBILE NOTES ─────────────────────────────────────────────────

  When given raw/unformatted content from a mobile note:
  1. Infer a title from the subject matter — don't use a generic placeholder
  2. Set published to the date in the content, or today if unknown
  3. Write a one-sentence description summarizing the post
  4. Choose the correct category from the list above
  5. Pick 3–6 relevant tags
  6. Clean up the body: fix obvious typos, add paragraph breaks, add headers
     for longer posts. Do NOT change the author's voice, remove content, or
     add content that wasn't in the original.
  7. Omit any optional frontmatter fields that aren't relevant to this post.
     Don't pad with empty fields.

── DRAFT FLAG ────────────────────────────────────────────────────────────────

  draft: true   → post is built but hidden from the public listing and feed.
                  Use when content is incomplete or not ready for publishing.
  draft: false  → (default) post is live. You can omit this field entirely.

── IMAGE PATHS ───────────────────────────────────────────────────────────────

  External URLs: use the full https:// URL directly — preferred for mobile
  posts where photos aren't uploaded to the repo.

  Repo-local images: place files in apps/travel/public/posts/your-post-slug/
  and reference as /posts/your-post-slug/image.jpg

  If the author mentions a photo but doesn't provide one, leave an image
  comment in the body: <!-- photo: [description of intended image] -->

======================================================================== -->
