# Website Banner System - Maintenance Guide

## Quick Reference - Common Changes

### 🔄 **SWITCHING BANNER TYPES (NEW - CENTRALIZED CONTROL)**
**This is now the ONLY place to change banner types!**

In `banner.config.ts`, change this ONE line:
```typescript
defaultBannerType: 'timeline',  // Options: 'standard', 'timeline', 'video', 'image', 'assistant', 'none'
```

The system automatically uses the correct configuration for each type:
- **standard**: Uses `standardBannerConfig` (cycles through bannerList images)
- **timeline**: Uses `timelineBannerConfig` (interactive timeline)
- **video**: Uses `videoBannerConfig` (YouTube embed)
- **image**: Uses `imageBannerConfig` (single static image)
- **assistant**: Uses `assistantBannerConfig` (Bleepy AI assistant)
- **none**: No banner displayed

### 🎛️ **CONFIGURING EACH BANNER TYPE**
Edit the type-specific configs in `banner.config.ts`:

**Timeline Banner:**
```typescript
timelineBannerConfig: {
  category: "MEGA MEAL",     // Required - timeline category
  title: "Site Timeline",    // Optional display title
  startYear: 1,             // Optional start year
  endYear: 50000,           // Optional end year
  background: "/posts/timeline/universe.png", // Background image
  compact: false,           // Compact display mode
  height: "70vh"            // Custom height
},
```

**Video Banner:**
```typescript
videoBannerConfig: {
  videoId: "YOUR_YOUTUBE_VIDEO_ID_HERE" // YouTube video ID
},
```

**Image Banner:**
```typescript
imageBannerConfig: {
  imageUrl: "/path/to/your/image.jpg" // Image URL
},
```

### 🖼️ Adding New Banner Images
1. **Add image files** to `src/assets/banner/` (name them 0009.png, 0010.png, etc.)
2. **Import in banner.config.ts**:
   ```typescript
   import banner9 from 'src/assets/banner/0009.png'
   ```
3. **Add to bannerList array**:
   ```typescript
   bannerList: [
     banner1, banner2, banner3, banner4, 
     banner5, banner6, banner7, banner8,
     banner9  // Add new images here
   ]
   ```
4. **Add corresponding link to bannerLinks array**:
   ```typescript
   bannerLinks: [
     '/posts/my-first-post', '/about', '/projects', null,
     '/contact', '/blog', '', '/portfolio',
     '/new-page'  // Add link for banner9 (or null if not clickable)
   ]
   ```

### 🔗 **NEW: Making Banner Images Clickable**
Each banner image can now be clickable! Configure links in `banner.config.ts`:

```typescript
bannerLinks: [
  '/posts/my-first-post',      // banner1 links to this page
  '/about',                    // banner2 links to about page  
  '/projects',                 // banner3 links to projects
  null,                        // banner4 is not clickable
  '/contact',                  // banner5 links to contact
  '/blog',                     // banner6 links to blog
  '',                          // banner7 is not clickable (empty string)
  '/portfolio'                 // banner8 links to portfolio
]
```

**Rules for bannerLinks:**
- **Same length as bannerList**: Must have same number of entries as bannerList
- **null or empty string**: Makes image non-clickable  
- **Valid URL string**: Makes image clickable with hover effects
- **Supports internal links**: `/about`, `/posts/my-post`
- **Supports external links**: `https://example.com`

**Visual Effects:**
- ✨ **Hover zoom**: Clickable images scale slightly on hover
- 🔗 **Link icon**: External link icon appears on hover
- 🎯 **Hover overlay**: Subtle dark overlay indicates clickability

### ⚡ Changing Animation Speed
In `banner.config.ts`, modify the `animation` section:
```typescript
animation: {
  enabled: true,
  interval: 3000,        // Change this: 3000 = 3 seconds between images
  transitionDuration: 500, // Change this: 500 = 0.5 second fade time
  direction: 'forward'
}
```

### 📏 Changing Banner Size and Spacing
In `banner.config.ts`, modify the `layout` section:
```typescript
layout: {
  height: {
    desktop: '50vh',     // Change this: 50vh = 50% of screen height
    mobile: '30vh'       // Change this: 30vh = 30% of screen height  
  },
  overlap: {
    desktop: '2rem',     // How much content overlaps banner
    mobile: '1rem'       // Mobile overlap amount
  },
  mainContentOffset: {
    desktop: '1.5rem',   // NEW: Space between banner and main content
    mobile: '1rem'       // NEW: Mobile spacing to main content
  }
}
```

**What each setting does:**
- `height`: How tall the banner appears
- `overlap`: How much the main content overlaps the banner (negative values push content down)
- `mainContentOffset`: Space between banner and main content (NEW - was hardcoded before)

### 🎯 Switching Banner Types Site-Wide
In `banner.config.ts`, change the `defaultBannerType`:
```typescript
defaultBannerType: 'standard',  // Options: 'standard', 'timeline', 'video', 'image', 'assistant', 'none'
```

## File Structure Overview

```
src/
├── config/
│   └── banner.config.ts          # 🎛️ MAIN CONFIGURATION - Change banner behavior here
├── layouts/
│   └── MainGridLayout.astro       # 🏗️ LAYOUT LOGIC - Handles banner display
├── assets/
│   └── banner/                    # 🖼️ BANNER IMAGES - Add new images here
│       ├── 0001.png
│       ├── 0002.png
│       └── ...
└── styles/
    └── main.css                   # 🎨 STYLES - Visual effects and animations
```

## Troubleshooting Guide

### 🔄 **Banner Type Not Changing**
**NEW FIX:** The banner type is now controlled by ONE setting in `banner.config.ts`:

1. **Check defaultBannerType** is set correctly:
   ```typescript
   defaultBannerType: 'timeline',  // Make sure this matches what you want
   ```

2. **Verify type-specific config** has required data:
   - Timeline needs: `category` field (required)
   - Video needs: `videoId` field  
   - Image needs: `imageUrl` field

3. **Clear browser cache** and reload the page

4. **Check browser console** for error messages

**The system automatically sets defaultBannerData based on defaultBannerType - you don't need to manually change defaultBannerData anymore!**

### 🚫 Banner Animation Not Working
1. **Check browser console** for error messages
2. **Verify image files exist** in `src/assets/banner/`
3. **Check imports** in `banner.config.ts` match actual file names
4. **Ensure defaultBannerType** is set to `'standard'`
5. **Verify bannerLinks array length** matches bannerList array length

Expected console messages:
- ✅ `"Banner animation: Found X banner images and Y banner links"` 
- ✅ `"Banner animation: Started with 4000ms interval"`
- ❌ `"Banner animation: No standard banner container found"` = Issue with layout
- ❌ `"Banner animation: Not enough images"` = Need at least 2 images

### 🔗 **NEW: Banner Links Not Working**
1. **Check bannerLinks array length** matches bannerList length:
   ```typescript
   bannerList: [banner1, banner2, banner3],     // 3 images
   bannerLinks: ['/page1', null, '/page3']      // Must also have 3 entries
   ```
2. **Verify URL format** - use `/page` for internal links, full URLs for external
3. **Check browser console** for "Found X banner images and Y banner links"
4. **Test hover effects** - clickable images should show zoom and link icon
5. **Use null or empty string** for non-clickable images

### 🐌 Performance Issues
1. **Reduce number of banner images** (remove some from bannerList)
2. **Increase interval** in animation config (e.g., 6000 for 6 seconds)
3. **Optimize image file sizes** (compress PNGs, use WebP format)

### 📱 Mobile Display Issues
1. **Adjust mobile banner height** in `layout.height.mobile`
2. **Check mobile navbar spacing** in `navbarSpacing` section
3. **Test on actual mobile devices**, not just browser dev tools

## Performance Optimization Tips

### 🖼️ Image Optimization
- **Use WebP format** for smaller file sizes (rename imports in config)
- **Keep images under 500KB** each for fast loading
- **Use consistent aspect ratios** (16:9 recommended)

### ⚡ Animation Performance
- **Don't exceed 10 banner images** (too many can cause memory issues)
- **Keep transition duration between 500-1000ms** (too fast/slow feels jarring)
- **Use interval of 3000ms or higher** (too fast is distracting)

## Code Organization Notes

### 🧩 Helper Functions (banner.config.ts)
- `getResponsiveBannerDimensions()` - Gets mobile/desktop sizes
- `getBannerAnimationSettings()` - Gets animation config  
- `getPanelTopPosition()` - Calculates content positioning
- `getMainContentOffset()` - **NEW**: Gets main content spacing from config
- Type guards (`isVideoBannerData()`, etc.) - Safe type checking

### 🎛️ **NEW: Centralized Configuration System**
- `defaultBannerType` - **MAIN CONTROL**: Change this to switch banner types
- `standardBannerConfig` - Configuration for standard animated banners
- `timelineBannerConfig` - Configuration for timeline banners  
- `videoBannerConfig` - Configuration for video banners
- `imageBannerConfig` - Configuration for image banners
- `assistantBannerConfig` - Configuration for assistant banners
- **Automatic setup**: `defaultBannerData` is set automatically based on `defaultBannerType`

### 🏗️ Layout Structure (MainGridLayout.astro)
- `getBannerDataFromPost()` - Extracts post banner info
- `determineBannerType()` - Decides which banner to show
- `getBannerData()` - Gets banner configuration data

### 🎨 CSS Classes
- `.has-standard-banner` - Applied when standard banner is active
- `.banner-image` - Individual banner images with optimization
- `.onload-animation` - Page load animation effects

## Advanced Customization

### 🎨 Adding Visual Effects
To add new visual effects to banners, modify `banner.config.ts`:
```typescript
visual: {
  objectFit: 'cover',
  objectPosition: 'center',
  applyGradientOverlay: true,      // Enable/disable overlay
  gradientOverlay: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5))',
  borderRadius: '1rem'             // Increase for more rounded corners
}
```

### 🎯 **Configuration Preservation**
**ALL banner type configurations are preserved even when not in use!**

This means you can:
1. Set up timeline configuration once in `timelineBannerConfig`
2. Switch to standard banners by changing `defaultBannerType: 'standard'`  
3. Later switch back to timeline by changing `defaultBannerType: 'timeline'`
4. **Your timeline configuration is still there and will work immediately!**

This makes it easy to experiment with different banner types without losing your settings.

### 🔄 Adding New Banner Types
1. **Add type** to `BannerType` union in banner.config.ts
2. **Create interface** for the new banner data
3. **Add navbar spacing** in `navbarSpacing` object
4. **Add panel positioning** in `panel.top` object
5. **Add banner content** in MainGridLayout.astro
6. **Add CSS classes** for the new banner type

### 🎯 Post-Specific Banners
In any post's frontmatter, you can override the default banner:
```yaml
---
title: "My Post"
bannerType: "timeline"           # Override default banner type
bannerData:
  category: "TECHNOLOGY"         # Timeline-specific data
  startYear: 2020
  endYear: 2024
---
```

## Regular Maintenance Tasks

### 📅 Monthly
- **Review banner image file sizes** (compress if needed)
- **Check console for errors** on live site
- **Test animation on different devices**

### 📅 Quarterly  
- **Update banner images** (keep content fresh)
- **Review animation timing** (adjust if user feedback suggests)
- **Check mobile performance** (test on actual devices)

### 📅 Yearly
- **Optimize image formats** (migrate to newer formats like AVIF)
- **Review banner configuration** (update sizes for new design trends)
- **Performance audit** (measure impact on page load times)

## Emergency Fixes

### 🚨 Banner Completely Broken
Set `defaultBannerType: 'none'` in banner.config.ts to disable banners temporarily.

### 🚨 Animation Causing Performance Issues
Set `animation.enabled: false` in banner.config.ts to stop animation.

### 🚨 Mobile Layout Broken
Set mobile height to a safe value:
```typescript
layout: {
  height: {
    desktop: '60vh',
    mobile: '25vh'  // Safe small value
  }
}
```

## Contact Points for Issues

- **Configuration issues**: Check `banner.config.ts`
- **Layout issues**: Check `MainGridLayout.astro`
- **Styling issues**: Check `main.css`
- **Image issues**: Check `src/assets/banner/` directory

Remember: Always test changes on a development environment before deploying to production!

## Testing Your Configuration Changes

### 🧪 **Quick Test Procedure**
1. **Change defaultBannerType** in `banner.config.ts`
2. **Save the file** 
3. **Reload your browser** (Ctrl+F5 to clear cache)
4. **Check browser console** for any error messages
5. **Verify the correct banner type** is displayed

### 🔗 **Test Clickable Banner Links**
1. **Hover over banner images** - should see zoom effect and link icon for clickable ones
2. **Click banner images** - should navigate to configured URL
3. **Check console message** - should show "Found X banner images and Y banner links"
4. **Try both clickable and non-clickable images** - only linked ones should have hover effects

### 🔍 **Banner Type Verification**
- **Standard**: Should see cycling images every 4 seconds (with click functionality if links configured)
- **Timeline**: Should see interactive timeline interface
- **Video**: Should see YouTube video embed
- **Image**: Should see single static image
- **Assistant**: Should see Bleepy AI assistant interface
- **None**: Should see no banner, content starts near navbar

### 🚨 **If Something Goes Wrong**
Set `defaultBannerType: 'none'` temporarily to disable banners and debug the issue.