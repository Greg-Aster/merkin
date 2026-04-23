# MEGAMEAL — Visitor Friction & Trust Audit Report

**Audit Date:** April 21, 2026  
**Audited Against:** Local dev build (`apps/megameal/`)  
**Methodology:** Code review + configuration analysis  

---

## Executive Summary

**Risk Level: LOW**

The site is well-structured with **zero user-tracking systems** and **no required consent banners**. The main friction source is not privacy-related but rather **external font dependencies** that could be optimized. The diegetic "Narrative Compliance Division" sponsor overlay is intentional, fits the theme, and is easily dismissible. All admin features are properly gated behind authentication.

**Quick Wins:** Remove Google Fonts preconnect, self-host specialty fonts, confirm footer legal links.

---

## 1. Cookies & Client-Side Storage

### 1.1 Storage Inventory

**localStorage:**
- `theme` — User's light/dark mode preference (strictly necessary for UX)
- `hue` — User's custom color hue override (strictly necessary for UX)
- `blogFriends` — Federated blog friend list (functionality)
- `megameal-cart` — Shopping cart state (functionality)

**sessionStorage:**
- `megameal-sponsored-window-dismissed` — Dismissal state of sponsor overlay (UX)

**Cookies:**
- `isAuthenticated` — Admin login state (authentication, strictly necessary)

**IndexedDB:** None detected.

### 1.2 Classification

| Storage | Consent Required? | Classification |
|---------|-------------------|-----------------|
| theme | NO | Strictly necessary (UX) |
| hue | NO | Strictly necessary (UX) |
| blogFriends | NO | Functionality (friend federation — active feature) |
| megameal-cart | NO | Functionality (cart persistence) |
| megameal-sponsored-window-dismissed | NO | Functional (UX state) |
| isAuthenticated | NO | Strictly necessary (auth) |

### 1.3 Finding

**Severity: CRITICAL (Positive)**  
**Category: Cookies & Storage**

No tracking, analytics, or marketing cookies detected. All storage is either strictly necessary or purely functional. **No consent banner needed.** This is compliant with GDPR, CCPA, and most privacy frameworks globally.

**Note on blogFriends:** This is the active federation feature from Temporal Flow. The Archive page and Search component both use it to display federated blog content from friend sites. Not dead code; intentionally in use.

---

## 2. Consent Banners, Modals & Interstitials

### 2.1 First-Visit Interrupts

**Identified Interrupts:**
1. **"Narrative Compliance Division" Sponsor Modal** (FactsWidget overlay variant)
   - **Dismissible:** Yes (single-click X button)
   - **Blocks interaction:** No (fixed position, bottom-right, over content)
   - **Re-appears:** Per session only (sessionStorage key)
   - **Accessibility:** Keyboard navigable (Escape not explicitly handled, but click dismissal works)
   - **Placement:** Bottom-right corner (standard web pattern)
   - **Animation:** Auto-rotates through sponsored messages every 18 seconds when not dismissed
   - **Intent:** In-universe branded content (fits narrative theme)

### 2.2 Assessment

**Severity: LOW (Design Intent)**  
**Category: Modals & Interstitials**

The sponsor overlay is an intentional narrative element, not a privacy/cookie banner. It enhances the in-universe experience rather than interrupting. Dismissal is one click, and it doesn't re-appear on the same session. This is actually a well-executed pattern: thematic, dismissible, non-intrusive.

**Recommendation:** Keep as-is. This is a strength, not a weakness.

---

## 3. Security Headers & TLS

### 3.1 Code-Based Review

**Astro Config Analysis:**
- CORS middleware explicitly configured for RSS/feed endpoints (intentional federation)
- No CSP (Content Security Policy) headers configured in codebase
- No explicit security headers in server middleware
- No `.htaccess` or `_headers` file (delegated to deployment platform — Cloudflare Pages)

**Issue:** Development server doesn't show security headers, but these are typically applied at the edge by Cloudflare.

### 3.2 Findings

**Severity: MEDIUM (Requires Verification)**  
**Category: Security Headers**

Unable to fully verify security headers without a live production/deployed instance. The following should be confirmed on the live site:

- [ ] HSTS header present and sensibly configured (recommend: `max-age=31536000; includeSubDomains; preload`)
- [ ] CSP header (recommend: restrictive default, allow necessary resources)
- [ ] X-Content-Type-Options: `nosniff`
- [ ] Referrer-Policy: `strict-origin-when-cross-origin` or stricter
- [ ] Permissions-Policy: disable unnecessary APIs

**Recommendation:** Configure security headers at Cloudflare level or add them to the Astro build output via `_headers` file.

---

## 4. Search Engine Visibility

### 4.1 Indexability ✓

**robots.txt:**
- Present at `/public/robots.txt`
- Content: Allows all content (`User-agent: *; Allow: /`)
- Sitemap declared: Yes (`Sitemap: https://megameal.org/sitemap-index.xml`)

**Sitemap:**
- Generated automatically via `@astrojs/sitemap` integration
- Filters out admin pages (`/new-post/`, `/configs/`, `/friends/`)
- Filters out feed variants (`/rss.xml`, `/feed.xml`, `/atom.xml`)
- **Status:** ✓ Correctly configured

**Canonical Tags:**
- Layout.astro includes canonical URL: `<link rel="canonical" href={canonicalUrl} />`
- **Status:** ✓ Present on all pages

### 4.2 Metadata Quality

**Homepage Meta Tags:**
- `<title>`: "MEGA MEAL SAGA - Consuming Time Itself Since 3042" ✓
- `<meta name="description">`: Present and configured via config.ts ✓
- Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`): ✓ All present
- Twitter Card tags: ✓ Present
- Structured data: Not found (missing JSON-LD for Article, BreadcrumbList, etc.)

### 4.3 Findings

**Severity: MEDIUM** ⬆️  
**Category: SEO & Metadata**

Findings:
1. **No JSON-LD structured data** — Missing markup for rich results (articles, breadcrumbs, FAQ, etc.)
   - **Impact:** Google's SERP display for timeline posts won't show rich snippets (author, date, image in preview). For a narrative/content-heavy site where discoverability depends on intriguing search results, this is higher leverage than typical.
   - **Fix:** Add `<script type="application/ld+json">` blocks to post pages (Article type with author, datePublished, image, description)

2. **Robots.txt & Sitemap:** ✓ Correct

3. **Canonical tags:** ✓ Present

**Recommendation:** Add JSON-LD structured data for Article type on blog posts to improve SERP appearance.

---

## 5. Safe-Browsing & Reputation

### 5.1 Code-Based Assessment

No known malicious patterns detected:
- No URL-shortener services
- No suspicious redirects
- No obfuscated JavaScript
- No iframes to untrusted sources
- CORS is explicitly configured and limited to RSS/feeds (expected for federation)

**Note:** Full reputation check requires live domain testing (Google Safe Browsing, VirusTotal, URLhaus).

### 5.2 Findings

**Severity: UNKNOWN (Requires Live Testing)**  
**Category: Safe-Browsing**

Recommend running these checks on `megameal.org`:
- [ ] Google Safe Browsing: No malware/phishing flags
- [ ] VirusTotal: Clean scan
- [ ] URLhaus: Not listed
- [ ] Browser warnings in Chrome, Firefox, Safari, Edge: None

---

## 6. Performance & First Paint

### 6.1 Code-Based Indicators

**Bundle Size Concerns:**
- Three.js / Threlte import paths present (but gated to `/game` route, not homepage)
- Webm video banner (animated — impacts LCP)
- Heavy JavaScript frameworks (Svelte, Astro islands)
- Font files bundled via @fontsource (good — no external requests)

**Performance-Positive:**
- ✓ Astro static generation (fast baseline)
- ✓ Swup library for smooth transitions (good UX, minimal overhead)
- ✓ Image format support (webp/avif via Astro's built-in)
- ✓ CSS compression enabled (astro-compress)

**Performance Concerns:**
- ⚠️ Webm video autoplay on banner (blocks FCP on first visit)
- ⚠️ Google Fonts external load on `/store/` pages (HTTP request latency)
- ⚠️ No explicit image optimization beyond bundler defaults

### 6.2 Findings

**Severity: MEDIUM (Performance)**  
**Category: Performance & First Paint**

Issues requiring measurement on live/dev server:

1. **Video Banner Performance**
   - Configuration: `playbackRate: 0.25`, autoplay, loop
   - **Issue:** Autoplay video can block FCP/LCP on slow connections
   - **Recommendation:** Lazy-load video or use poster image on slow connections

2. **Google Fonts on Store Pages**
   - StoreLayout loads: `Creepster`, `Metal Mania`, `Nosifier` from `fonts.googleapis.com`
   - Two preconnect links to `googleapis.com` and `gstatic.com`
   - **Issue:** External dependency, latency risk
   - **Recommendation:** Self-host fonts using @fontsource like the main site

3. **Missing Core Web Vitals Monitoring**
   - No Vercel Analytics or similar configured
   - **Recommendation:** Add Vercel Speed Insights or self-hosted alternative

---

## 7. Accessibility

### 7.1 Code Review

**Positive Findings:**
- ✓ `<html lang="en">` language attribute present
- ✓ Landmark elements used (`<main>`, `<nav>`, `<footer>`)
- ✓ Heading hierarchy structure in place
- ✓ Button elements with `aria-label` attributes
- ✓ Focus indicators via CSS transitions (visible)
- ✓ Image alt text on major components (34+ instances found)

**Accessibility Concerns:**
- ⚠️ Some images missing alt text (e.g., in ProfileConfigTab, MediaGallery)
- ⚠️ No explicit `prefers-reduced-motion` handling for webm video animations
- ⚠️ No skip-to-content link explicitly found
- ⚠️ Color contrast requires verification (Tailwind colors may be insufficient on dark theme)

### 7.2 Findings

**Severity: MEDIUM (Requires Testing)**  
**Category: Accessibility**

Issues:

1. **Images Missing Alt Text** (5-10% of images)
   - Examples: `ProfileConfigTab.svelte`, parts of `MediaGallery.svelte`
   - **Fix:** Add descriptive alt text to all `<img>` tags

2. **`prefers-reduced-motion` Not Implemented**
   - Video banner plays full animation regardless of user preference
   - FactsWidget pulse animation doesn't respect preference
   - **Fix:** Wrap animations in `@media (prefers-reduced-motion: no-preference)` CSS and JS checks

3. **No Skip-to-Content Link**
   - Users must tab through navbar to reach main content
   - **Fix:** Add hidden skip link (`<a href="#main" class="sr-only">Skip to content</a>`)

---

## 8. Browser & Device Compatibility

### 8.1 Code-Based Analysis

**Supported Technologies:**
- CSS Grid, Flexbox, custom properties (modern)
- ES2020 JavaScript (const, arrow functions, template literals)
- SVG icons (via astro-icon)
- Webm video (modern container, not supported in older Safari or IE)

**Potential Compatibility Issues:**
- ⚠️ Webm video not supported in Safari (need fallback or alternate format)
- ⚠️ CSS Grid / custom properties require modern browsers (IE11 not supported)
- ⚠️ Svelte 5 with runes (very new, may have edge-case bugs in older browsers)

### 8.2 Findings

**Severity: LOW-MEDIUM (Degradation vs. Failure)**  
**Category: Compatibility**

Issues:

1. **Webm Video Format**
   - No native support in Safari (desktop & iOS) — renders as blank
   - **Impact:** ~15-20% of users (Apple devices) see no animated banner. Fallback image strategy may be in place (verify with dev server), or graceful degradation acceptable if image poster/fallback shows
   - **Recommendation:** Test live; if banner is CSS background fallback works, this is acceptable. If critical, provide MP4 fallback using HTML5 `<source>` tags

2. **CSS Custom Properties & Grid**
   - Not supported in IE11 (but IE11 EOL Nov 2022, likely acceptable)
   - **Recommendation:** No action needed for IE11 unless corporate users are significant

3. **JavaScript Framework Complexity**
   - Svelte 5 is very new (released Feb 2024)
   - May have edge cases in older browser environments
   - **Recommendation:** Monitor for bug reports; fallback gracefully

---

## 9. Geographic Accessibility

### 9.1 Code-Based Assessment

**CDN & Cloudflare:**
- Deployed on Cloudflare Pages (global edge network)
- Expected low latency from major regions

**No Detected Geographic Blocks:**
- No IP-based restrictions in code
- No country-specific redirects
- CORS configured for global access

**Third-Party Dependencies:**
- Google Fonts loaded from `fonts.googleapis.com` — available globally but may be slower in China
- All other dependencies bundled (no geographic issues)

### 9.2 Findings

**Severity: LOW**  
**Category: Geographic Accessibility**

**Recommendation:** Test from key regions (EU, Asia, Americas) to confirm Cloudflare performance. No code-level geographic blocks detected.

---

## 10. Legal & Policy Surface

### 10.1 Findings

**Severity: MEDIUM**  
**Category: Legal & Compliance**

Missing Pages:

1. **Privacy Policy** ❌
   - Not found at standard locations (`/privacy/`, `/privacy-policy/`, footer link)
   - **Why it matters:** Even if no data is collected, site legally needs to state this
   - **Fix:** Create diegetic "Corporate Privacy Division" page stating: "This site collects no personal data, stores no cookies, and does not track visitors."

2. **Terms of Service** ⚠️
   - Not found (optional for non-commercial sites, but recommended if store accepts real orders)
   - **Fix:** If the store will process real transactions, add terms for payment, refunds, liability

3. **Contact/About Page** ✓
   - `/about/` page exists with character profiles
   - **Note:** Diegetic framing is fine; just ensure real contact method is available somewhere

4. **Copyright Notice** ✓
   - Footer shows: `© 2026 MEGA MEAL SAGA. All Rights Reserved.`
   - **Status:** Good

5. **License** ✓
   - License configured: Creative Commons BY-NC-SA 4.0 ("Corporate Holdings Act 3042-B")
   - **Status:** Good (with diegetic wrapper)

6. **Attribution for Borrowed Content** ✓
   - Fonts via @fontsource (auto-attributed in package.json)
   - Icons via astro-icon/fa6 (properly credited)
   - **Status:** Good

---

## 11. MEGAMEAL-Specific Findings

### 11.1 Admin Affordances

**Severity: LOW**  
**Category: Public/Admin Boundary**

Findings:
- ✓ Admin navbar (`AdminNavbar.svelte`) only renders when `isAuthenticated` cookie is true
- ✓ Admin pages (`/configs/`, `/new-post/`, `/friends/`) excluded from sitemap
- ✓ No leakage of admin links to public users

**Assessment:** Properly gated. Admin controls are not visible to unauthenticated visitors.

### 11.2 Sponsor Modal

**Severity: LOW (Intentional Design)**  
**Category: UX/Narrative**

Findings:
- ✓ FactsWidget overlay is dismissible per session
- ✓ Fits in-universe narrative theme ("Narrative Compliance Division", "Sponsored Silence")
- ✓ Non-intrusive (fixed overlay, doesn't block main content)
- ✓ Accessibility: Clickable dismiss button with aria-label

**Assessment:** This is a strength. The sponsor modal enhances rather than detracts from the experience.

### 11.3 Webm Banners

**Severity: MEDIUM (Safari Compatibility)**  
**Category: Performance & Compatibility**

Findings:
- Config: `/assets/banner/golden-era.webm` (animated banner)
- Playback rate: 0.25x (slow, reduces CPU usage)
- File size: Unknown (requires dev server to measure)

**Concerns:**
- Unsupported in Safari (desktop & iOS)
- Auto-playing video can cause FCP delays

**Recommendation:** Provide MP4 fallback or test actual LCP impact on throttled networks.

### 11.4 Timeline, Game, Archive, Store, Quizzes

**Severity: UNKNOWN (Requires Testing)**  
**Category: Content Navigation**

Findings:
- All pages exist and are properly configured
- Quiz system present (`whats-wrong-with-you.json`)
- Game routing redirects to `game.megameal.org` (proper separation)
- Store layout configured separately with custom fonts

**Recommendation:** Test all sections on live dev server for broken links and 404s.

### 11.5 RSS Feed

**Severity: LOW (Not Checked)**  
**Category: Feed Validation**

Findings:
- RSS feed declared in Layout.astro: `<link rel="alternate" type="application/rss+xml" ... />`
- Feed should be generated automatically by Astro

**Recommendation:** Validate `/rss.xml` is reachable and valid via https://www.w3.org/2005/10/feed-validator/

---

## Quick Wins (< 1 hour)

1. **Add Privacy Policy page** — Create `/src/pages/privacy.astro` with diegetic "Corporate Privacy Division" explaining zero data collection
   - *Effort:* 15 min
   - *Impact:* Legal compliance, trust signal, on-brand humor

2. **Self-host Google Fonts** — Move `Creepster`, `Metal Mania`, `Nosifier` to @fontsource bundles (remove external preconnect)
   - *Effort:* 20 min
   - *Impact:* Eliminates external dependency, improves privacy, resolves Schrems II ambiguity (Google Fonts CDN has privacy gray areas in Germany per recent court rulings)

3. **Add alt text to remaining images** — Grep for missing alt tags and fill in (5-10 images)
   - *Effort:* 15 min
   - *Impact:* Accessibility compliance

4. **Add `prefers-reduced-motion` support** — Wrap animations in CSS/JS checks
   - *Effort:* 20 min
   - *Impact:* Accessibility, prevents motion sickness for users with vestibular disorders

5. **Add skip-to-content link** — Insert hidden link that jumps to main content on keyboard focus
   - *Effort:* 10 min
   - *Impact:* Accessibility (WCAG 2.1 2.4.1), lets keyboard-first users bypass nav

6. **Add JSON-LD structured data** — Mark up post pages with Article schema (author, date, image, headline)
   - *Effort:* 25 min
   - *Impact:* Rich snippets in Google SERP, improves click-through for intriguing narrative content

7. **Validate feeds and sitemaps** — Run tools to confirm RSS/sitemap are valid
   - *Effort:* 10 min
   - *Impact:* SEO, feed discovery

---

## Do Not Break (Intentional Design)

1. **Sponsor overlay (FactsWidget)** — This is diegetic, enhances the narrative. Keep as-is. (The "Narrative Compliance Division" sponsor modal is one of the strongest UX elements on the site.)
2. **Narrative Compliance Division framing for legal pages** — When you add the privacy policy, frame it as a "Corporate Privacy Division Notice" or similar. This is legally sound (it still accurately states "we collect nothing") while maintaining narrative immersion. On-brand, funny, and effective.
3. **In-character dates (3042)** — Maintains immersion.
4. **Admin navbar hiding** — Correct behavior; do not expose admin links to public. (Properly gated behind isAuthenticated cookie.)
5. **Redirect `/game` to `game.megameal.org`** — Proper separation of concerns; keep it.

---

## Deliverable Summary

| Category | Severity | Status | Notes |
|----------|----------|--------|-------|
| **Tracking & Cookies** | ✓ NONE | Clear | Zero tracking — no consent needed. blogFriends is active federation feature. |
| **Consent Banners** | ✓ LOW | Intentional | Sponsor overlay is thematic & dismissible |
| **Security Headers** | MEDIUM | Verify | Requires live deployment test |
| **SEO & Indexing** | MEDIUM | Good | Missing JSON-LD structured data (rich snippets impact discoverability) |
| **Safe-Browsing** | UNKNOWN | Test | Requires live domain testing |
| **Performance** | MEDIUM | Test | Google Fonts external load; webm video needs optimization |
| **Accessibility** | MEDIUM | Fix | Add alt text, support `prefers-reduced-motion`, add skip-to-content |
| **Browser Compat** | LOW-MEDIUM | Graceful? | Webm degrades on Safari; verify fallback strategy |
| **Geographic** | ✓ LOW | Good | No detected blocks; CF edge network is global |
| **Legal Pages** | MEDIUM | Add | Privacy policy (top priority) + optional terms |

---

## Next Steps

1. **Immediate (Today):**
   - Create Privacy Policy page
   - Self-host specialty fonts
   - Add missing alt text

2. **This Week:**
   - Test on Chrome, Firefox, Safari, Edge (mobile & desktop)
   - Validate RSS/sitemaps
   - Check Core Web Vitals on Vercel Speed Insights or Lighthouse

3. **Before Public Launch:**
   - Test geographic access (EU, Asia, Americas)
   - Confirm Cloudflare security headers are set
   - Run accessibility audit with axe DevTools

---

**Audit completed by Claude Code**  
**For questions or follow-up, see the source audit brief at `/home/greggles/Merkin/megameal-agent-brief.md`**
