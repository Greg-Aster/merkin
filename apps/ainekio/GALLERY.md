# Gallery publishing

`src/data/gallery-source.json` owns the selection, captions and provenance of
the gallery. `scripts/prepare-gallery.mjs` creates the public derivatives and
`src/data/gallery.json`, which supplies the gallery page and homepage previews.
Ordinary builds use these checked-in outputs and do not require FFmpeg.

The newly supplied full-resolution originals are preserved, unchanged, under
`media-originals/photos/` in this checkout. That local archive is ignored by Git
and is **not a remote backup**. Keep it with the project's original-media backups.
Older tracked photos remain at their historical `public/photos/` URLs so existing
articles keep working. The imported standalone CAD HTML and capture metadata
remain in the archive; `/gallery/` is the public gallery owner.

To prepare a new set:

1. Put originals outside `public` and update the source catalog with accurate
   descriptions and dates. Identify physical footage versus rendered studies.
2. Run `pnpm prepare:gallery` with the existing Sharp dependency and system
   `ffmpeg`/`ffprobe`. It writes 480/960/1600-width WebP variants (without enlargement)
   and H.264/yuv420p MP4, retaining audio as AAC when present. MP4 output uses
   faststart; posters are extracted separately. Camera metadata is stripped.
3. Review the exports, then run `pnpm build` and `pnpm check:gallery`.
4. Commit the catalog, generated manifest and public derivatives together.
   Do not put originals back into `public`: Astro copies every public asset,
   even files that no page references.

The output manifest records source hashes, byte counts, output dimensions and
video duration. Videos use native controls, no autoplay and `preload="none"`.
Images have responsive sources and lazy loading; the homepage hero is eager.
Full-size images remain ordinary links, usable without JavaScript.

References: [Cloudflare Pages asset limits](https://developers.cloudflare.com/pages/platform/limits/)
and [MDN video performance](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/video).
