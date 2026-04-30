<script>
export let tabs = []
export let activeTab = 'general'
export let setActiveTab = () => {}
</script>

<h1 class="text-3xl font-bold text-black/90 dark:text-white/90 mb-6">Site Configuration</h1>

<div class="border-b border-neutral-200 dark:border-neutral-700 mb-6">
  <nav class="flex flex-wrap space-x-1 md:space-x-8" aria-label="Configuration Tabs">
    {#each tabs as tab}
      <button
        id={`tab-${tab.id}`}
        data-sfx-hover="hover-soft"
        data-sfx-click="soft"
        class="tab-button relative py-4 px-3 border-b-2 transition-colors font-medium flex items-center whitespace-nowrap
               {activeTab === tab.id ?
                 'border-[var(--primary)] text-[var(--primary)]' :
                 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}"
        on:click={() => setActiveTab(tab.id)}
      >
        <span class="hidden md:inline mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
            {#if tab.icon === 'mdi:cog-outline'}
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            {:else if tab.icon === 'mdi:navigation'}
              <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            {:else if tab.icon === 'mdi:account'}
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            {:else if tab.icon === 'mdi:palette-outline'}
              <circle cx="13.5" cy="6.5" r="2.5"></circle>
              <circle cx="19" cy="13" r="2.5"></circle>
              <circle cx="6" cy="12" r="2.5"></circle>
              <circle cx="14" cy="19.5" r="2.5"></circle>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
            {:else if tab.icon === 'mdi:timeline'}
              <line x1="12" y1="22" x2="12" y2="15"></line>
              <path d="M6 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"></path>
              <path d="M22 12H2"></path>
              <path d="M12 7V2"></path>
              <path d="M14 3l-2 2-2-2"></path>
              <path d="M18 15v7"></path>
              <path d="M18 22l-2-2"></path>
              <path d="M18 22l2-2"></path>
              <path d="M6 15v7"></path>
              <path d="M6 22l-2-2"></path>
              <path d="M6 22l2-2"></path>
            {:else if tab.icon === 'mdi:account-group'}
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            {:else if tab.icon === 'mdi:information-outline'}
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            {:else if tab.icon === 'mdi:shield-outline'}
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            {:else if tab.icon === 'mdi:code-json'}
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            {:else if tab.icon === 'mdi:puzzle-outline'}
              <path d="M22 9h-4v6h4v6h-4v-6h-4v6h-4v-6H6v6H2v-6h4v-6H2V3h4v6h4V3h4v6h4V3h4v6z"></path>
            {/if}
          </svg>
        </span>
        {tab.label}
      </button>
    {/each}
  </nav>
</div>
