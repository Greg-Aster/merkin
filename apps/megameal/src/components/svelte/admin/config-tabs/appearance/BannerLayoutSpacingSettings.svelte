<script>
export let bannerConfig
export let handleChange = () => {}
</script>

<div class="space-y-4 pt-6 mt-6 border-t border-neutral-200 dark:border-neutral-700">
  <h4 class="text-md font-medium text-black/80 dark:text-white/80 mb-3">Layout Settings</h4>

  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="banner-height-desktop" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Desktop Height
        </label>
        <input
          type="text"
          id="banner-height-desktop"
          bind:value={bannerConfig.layout.height.desktop}
          on:input={handleChange}
          class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          placeholder="e.g., 50vh"
        />
      </div>
      <div>
        <label for="banner-height-mobile" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Mobile Height
        </label>
        <input
          type="text"
          id="banner-height-mobile"
          bind:value={bannerConfig.layout.height.mobile}
          on:input={handleChange}
          class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          placeholder="e.g., 30vh"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="banner-overlap-desktop" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Desktop Content Overlap
        </label>
        <input
          type="text"
          id="banner-overlap-desktop"
          bind:value={bannerConfig.layout.overlap.desktop}
          on:input={handleChange}
          class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          placeholder="e.g., 3.5rem"
        />
      </div>
      <div>
        <label for="banner-overlap-mobile" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Mobile Content Overlap
        </label>
        <input
          type="text"
          id="banner-overlap-mobile"
          bind:value={bannerConfig.layout.overlap.mobile}
          on:input={handleChange}
          class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          placeholder="e.g., 2rem"
        />
      </div>
    </div>

    <div>
      <label for="banner-max-width" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Maximum Width (px)
      </label>
      <input
        type="number"
        id="banner-max-width"
        bind:value={bannerConfig.layout.maxWidth}
        on:input={handleChange}
        class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
        placeholder="e.g., 1920"
      />
    </div>
  </div>
</div>

<div class="space-y-4 pt-6 mt-6 border-t border-neutral-200 dark:border-neutral-700">
  <h4 class="text-md font-medium text-black/80 dark:text-white/80 mb-3">Navbar Spacing</h4>

  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="navbar-spacing-standard" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Standard Banner Spacing
        </label>
        <input
          type="text"
          id="navbar-spacing-standard"
          bind:value={bannerConfig.navbarSpacing.standard}
          on:input={handleChange}
          class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          placeholder="e.g., 0"
        />
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Space between navbar and standard banner
        </p>
      </div>
      <div>
        <label for="navbar-spacing-timeline" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Timeline Banner Spacing
        </label>
        <input
          type="text"
          id="navbar-spacing-timeline"
          bind:value={bannerConfig.navbarSpacing.timeline}
          on:input={handleChange}
          class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          placeholder="e.g., 4.5rem"
        />
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Space between navbar and timeline banner
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="navbar-spacing-video" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Video Banner Spacing
        </label>
        <input
          type="text"
          id="navbar-spacing-video"
          bind:value={bannerConfig.navbarSpacing.video}
          on:input={handleChange}
          class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          placeholder="e.g., 4.5rem"
        />
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Space between navbar and video banner
        </p>
      </div>
      <div>
        <label for="navbar-spacing-image" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Image Banner Spacing
        </label>
        <input
          type="text"
          id="navbar-spacing-image"
          bind:value={bannerConfig.navbarSpacing.image}
          on:input={handleChange}
          class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          placeholder="e.g., 4.5rem"
        />
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Space between navbar and image banner
        </p>
      </div>
    </div>

    <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm text-blue-800 dark:text-blue-200">
      <p>These settings control the space between your navbar and different banner types. Increase values to add more space below the navbar.</p>
    </div>
  </div>
</div>
