<script>
export let authenticated = false
</script>

{#if authenticated}
  <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-md p-4 text-green-800 dark:text-green-200 mb-4">
    <div class="flex">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <div>
        <p class="font-medium">Connected to GitHub</p>
        <p class="mt-1">You can now push your changes directly to your repository.</p>
      </div>
    </div>
  </div>
{:else}
  <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-md p-4 text-blue-800 dark:text-blue-200 mb-4">
    <div class="flex">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p class="font-medium">Connect to GitHub</p>
        <p class="mt-1">Authenticate with GitHub to save your changes directly to your repository.</p>
      </div>
    </div>
  </div>
{/if}

<div class="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
  <p>This integration automatically commits your configuration changes to your GitHub repository and can trigger a site rebuild.</p>
</div>
