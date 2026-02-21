<script>
    import { createEventDispatcher } from 'svelte';
    
    // Props
    export let show = false;
    export let avatarConfig;
    export let isSequence = false;
    
    // Generate unique filename based on timestamp
    const timestamp = new Date().getTime().toString().substring(6);
    const filePrefix = `avatar_${timestamp}`;
    
    // State
    let saving = false;
    let error = null;
    let success = false;
    let fileNames = [];
    
    // Create file names for display
    if (isSequence && avatarConfig && avatarConfig.avatarList) {
      for (let i = 0; i < avatarConfig.avatarList.length; i++) {
        fileNames.push(i === 0 ? `${filePrefix}.png` : `${filePrefix}${i+1}.png`);
      }
    } else {
      fileNames.push(`${filePrefix}.png`);
    }
    
    // Event dispatcher
    const dispatch = createEventDispatcher();
    
    // Function to close the dialog
    function closeDialog() {
      dispatch('close');
    }
    
    // Function to download the actual image files
    function downloadImageFiles() {
      try {
        saving = true;
        error = null;
        
        // For each image in the avatar list
        if (avatarConfig && avatarConfig.avatarList) {
          avatarConfig.avatarList.forEach((avatar, index) => {
            if (typeof avatar === 'string' && avatar.startsWith('data:')) {
              // Create filename based on index
              const filename = index === 0 ? `${filePrefix}.png` : `${filePrefix}${index+1}.png`;
              
              // Create downloadable link
              const link = document.createElement('a');
              link.href = avatar;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          });
        }
        
        success = true;
        
        // Notify parent with the generated file names
        dispatch('saved', { 
          success: true, 
          fileNames,
          filePrefix
        });
        
        // Auto close after a delay
        setTimeout(() => {
          if (success) closeDialog();
        }, 2000);
        
      } catch (err) {
        console.error('Error saving images:', err);
        error = 'Failed to save images. Please try again.';
      } finally {
        saving = false;
      }
    }
  </script>
  
  {#if show}
    <div class="fixed inset-0 bg-black/50 dark:bg-black/60 z-50 flex items-center justify-center">
      <div class="bg-white dark:bg-neutral-800 rounded-lg max-w-md w-full overflow-auto shadow-lg">
        <div class="p-5">
          <h3 class="text-xl font-semibold text-black/80 dark:text-white/80 mb-4">
            Download Avatar Images
          </h3>
          
          <p class="text-neutral-600 dark:text-neutral-400 mb-4">
            {#if isSequence}
              The following images will be downloaded to your computer. Save them to your <code class="font-mono text-sm bg-neutral-100 dark:bg-neutral-700 px-1 py-0.5 rounded">src/content/avatar/</code> folder:
              <ul class="mt-2 ml-4 list-disc space-y-1">
                {#each fileNames as fileName, idx}
                  <li class="text-sm">
                    {fileName}
                    {#if avatarConfig.homeAvatar === avatarConfig.avatarList[idx]}
                      <span class="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Home</span>
                    {/if}
                  </li>
                {/each}
              </ul>
            {:else}
              The image will be downloaded as <span class="font-mono bg-neutral-100 dark:bg-neutral-700 px-1 py-0.5 rounded">{fileNames[0]}</span>. Save it to your <code class="font-mono text-sm bg-neutral-100 dark:bg-neutral-700 px-1 py-0.5 rounded">src/content/avatar/</code> folder.
            {/if}
          </p>
          
          <div class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            <strong>Important:</strong> After downloading, make sure to also download and save the avatar.config.ts file from the configuration panel.
          </div>
          
          {#if saving}
            <div class="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-md mb-4 flex items-center">
              <svg class="animate-spin mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving avatar images...
            </div>
          {/if}
          
          {#if error}
            <div class="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-md mb-4">
              {error}
            </div>
          {/if}
          
          {#if success}
            <div class="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-4 rounded-md mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              Avatar images saved successfully!
            </div>
          {/if}
          
          <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            {#if success}
              <button 
                type="button"
                class="px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                on:click={closeDialog}
              >
                Close
              </button>
            {:else}
              <button 
                type="button"
                class="px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                on:click={closeDialog}
                disabled={saving}
              >
                Cancel
              </button>
              
              <button 
                type="button"
                class="px-4 py-2 bg-[var(--primary)] hover:opacity-90 text-white font-medium rounded-md transition-opacity flex items-center disabled:opacity-60"
                on:click={downloadImageFiles}
                disabled={saving}
              >
                {#if saving}
                  <svg class="animate-spin mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Images
                {/if}
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}