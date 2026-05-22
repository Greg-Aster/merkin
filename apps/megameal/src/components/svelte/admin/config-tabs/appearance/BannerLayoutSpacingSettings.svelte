<script>
import {
  ensureCurrentBannerLayoutConfig,
  syncLegacyLayoutFields,
} from './bannerLayoutAdmin'

export let bannerConfig
export let handleChange = () => {}

ensureCurrentBannerLayoutConfig(bannerConfig)

function handleLayoutChange() {
  syncLegacyLayoutFields(bannerConfig)
  handleChange()
}
</script>

<div class="space-y-4 pt-6 mt-6 border-t border-neutral-200 dark:border-neutral-700">
  <h4 class="text-md font-medium text-black/80 dark:text-white/80 mb-3">Banner Layout Profiles</h4>

  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="banner-height-desktop" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Standard Desktop Height
        </label>
        <input
          type="text"
          id="banner-height-desktop"
          bind:value={bannerConfig.layoutProfiles.standard.stageHeight.desktop}
          on:input={handleLayoutChange}
          class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          placeholder="e.g., 90vh"
        />
      </div>
      <div>
        <label for="banner-height-mobile" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Standard Mobile Height
        </label>
        <input
          type="text"
          id="banner-height-mobile"
          bind:value={bannerConfig.layoutProfiles.standard.stageHeight.mobile}
          on:input={handleLayoutChange}
          class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          placeholder="e.g., clamp(32rem, 76svh, 40rem)"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="content-gap-desktop" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Desktop Content Gap
        </label>
        <input
          type="text"
          id="content-gap-desktop"
          bind:value={bannerConfig.layoutProfiles.standard.contentTop.desktop}
          on:input={handleLayoutChange}
          class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          placeholder="e.g., 1rem"
        />
      </div>
      <div>
        <label for="content-gap-mobile" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Mobile Content Gap
        </label>
        <input
          type="text"
          id="content-gap-mobile"
          bind:value={bannerConfig.layoutProfiles.standard.contentTop.mobile}
          on:input={handleLayoutChange}
          class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          placeholder="e.g., 1rem"
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
        on:input={handleLayoutChange}
        class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
        placeholder="e.g., 3840"
      />
    </div>
  </div>
</div>

<div class="space-y-4 pt-6 mt-6 border-t border-neutral-200 dark:border-neutral-700">
  <h4 class="text-md font-medium text-black/80 dark:text-white/80 mb-3">Stage Top Gap</h4>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label for="stage-top-standard" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Standard Desktop
      </label>
      <input
        type="text"
        id="stage-top-standard"
        bind:value={bannerConfig.layoutProfiles.standard.stageTop.desktop}
        on:input={handleLayoutChange}
        class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
      />
    </div>
    <div>
      <label for="stage-top-standard-mobile" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Standard Mobile
      </label>
      <input
        type="text"
        id="stage-top-standard-mobile"
        bind:value={bannerConfig.layoutProfiles.standard.stageTop.mobile}
        on:input={handleLayoutChange}
        class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
      />
    </div>
    <div>
      <label for="stage-top-image" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Image Desktop
      </label>
      <input
        type="text"
        id="stage-top-image"
        bind:value={bannerConfig.layoutProfiles.image.stageTop.desktop}
        on:input={handleLayoutChange}
        class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
      />
    </div>
    <div>
      <label for="stage-top-video-mobile" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Video Mobile
      </label>
      <input
        type="text"
        id="stage-top-video-mobile"
        bind:value={bannerConfig.layoutProfiles.video.stageTop.mobile}
        on:input={handleLayoutChange}
        class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
      />
    </div>
    <div>
      <label for="stage-top-none" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        None Desktop
      </label>
      <input
        type="text"
        id="stage-top-none"
        bind:value={bannerConfig.layoutProfiles.none.stageTop.desktop}
        on:input={handleLayoutChange}
        class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
      />
    </div>
    <div>
      <label for="stage-top-none-mobile" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        None Mobile
      </label>
      <input
        type="text"
        id="stage-top-none-mobile"
        bind:value={bannerConfig.layoutProfiles.none.stageTop.mobile}
        on:input={handleLayoutChange}
        class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
      />
    </div>
  </div>
</div>

<div class="space-y-4 pt-6 mt-6 border-t border-neutral-200 dark:border-neutral-700">
  <h4 class="text-md font-medium text-black/80 dark:text-white/80 mb-3">Panel Top Offset</h4>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label for="panel-top-standard" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Standard Desktop
      </label>
      <input
        type="text"
        id="panel-top-standard"
        bind:value={bannerConfig.layoutProfiles.standard.panelTop.desktop}
        on:input={handleLayoutChange}
        class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
      />
    </div>
    <div>
      <label for="panel-top-standard-mobile" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Standard Mobile
      </label>
      <input
        type="text"
        id="panel-top-standard-mobile"
        bind:value={bannerConfig.layoutProfiles.standard.panelTop.mobile}
        on:input={handleLayoutChange}
        class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
      />
    </div>
    <div>
      <label for="panel-top-none" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        None Desktop
      </label>
      <input
        type="text"
        id="panel-top-none"
        bind:value={bannerConfig.layoutProfiles.none.panelTop.desktop}
        on:input={handleLayoutChange}
        class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
      />
    </div>
    <div>
      <label for="panel-top-none-mobile" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        None Mobile
      </label>
      <input
        type="text"
        id="panel-top-none-mobile"
        bind:value={bannerConfig.layoutProfiles.none.panelTop.mobile}
        on:input={handleLayoutChange}
        class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
      />
    </div>
  </div>
</div>
