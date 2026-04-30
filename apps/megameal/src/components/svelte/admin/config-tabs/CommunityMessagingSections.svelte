<script lang="ts">
import type { CommunityConfig } from '../types/communityconfig'

export let activeSection = 'contact'
export let communityConfig: CommunityConfig
export let notifyChanges = () => {}
export let editFeatureItem = (_section: string, _index: number) => {}
</script>

  <!-- Contact Section -->
{#if activeSection === 'contact'}
    <div class="contact-section space-y-6">
      <div class="card bg-white dark:bg-neutral-800 p-5 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-medium text-lg text-black/80 dark:text-white/80">Contact Section</h3>
          <label class="flex items-center">
            <input 
              type="checkbox" 
              bind:checked={communityConfig.contact.enabled} 
              on:change={notifyChanges}
              class="mr-2 h-4 w-4"
            />
            <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enabled</span>
          </label>
        </div>
        
        <div class="mb-4">
          <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Section Title</div>
          <input 
            type="text" 
            bind:value={communityConfig.contact.title} 
            on:input={notifyChanges}
              class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          />
        </div>
        
        <div class="mb-4">
          <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Description</div>
          <textarea 
            bind:value={communityConfig.contact.description} 
            on:input={notifyChanges}
            rows="3" 
              class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          ></textarea>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Form Action URL</div>
            <input 
              type="text" 
              bind:value={communityConfig.contact.formActionUrl} 
              on:input={notifyChanges}
                class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
            />
            <p class="text-xs text-neutral-500 mt-1">e.g., Formspree endpoint</p>
          </div>
          
          <div>
            <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Button Text</div>
            <input 
              type="text" 
              bind:value={communityConfig.contact.buttonText} 
              on:input={notifyChanges}
                class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
            />
          </div>
        </div>
        
        <h4 class="font-medium text-base mb-3 mt-6 text-neutral-800 dark:text-neutral-200">

Contact Features</h4>
        
        <div class="space-y-3 mb-6">
          {#each communityConfig.contact.features as feature, index}
            <div class="flex justify-between items-start p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div>
                <h5 class="font-medium text-neutral-800 dark:text-neutral-200">{feature.title}</h5>
                <p class="text-sm text-neutral-500 dark:text-neutral-400">{feature.description}</p>
                <div class="text-xs text-neutral-400 mt-1">Icon: {feature.icon}</div>
              </div>
              <button 
                class="p-1.5 text-neutral-500 hover:text-[var(--primary)] rounded-full"
                on:click={() => editFeatureItem('contact', index)}
                aria-label={`Edit ${feature.title}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          {/each}
        </div>
        
        <h4 class="font-medium text-base mb-3 mt-6 text-neutral-800 dark:text-neutral-200">

Form Field Settings</h4>
        
        <!-- Name Field -->
        <div class="mb-4 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <h5 class="font-medium mb-2 text-neutral-800 dark:text-neutral-200">Name Field</h5>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Label</div>
              <input 
                type="text" 
                bind:value={communityConfig.contact.formFields.name.label} 
                on:input={notifyChanges}
                  class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
              />
            </div>
            <div>
              <div class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Placeholder</div>
              <input 
                type="text" 
                bind:value={communityConfig.contact.formFields.name.placeholder} 
                on:input={notifyChanges}
                  class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
              />
            </div>
          </div>
          <div class="mt-2">
            <label class="flex items-center text-xs font-medium text-neutral-700 dark:text-neutral-300">
              <input 
                type="checkbox" 
                bind:checked={communityConfig.contact.formFields.name.required} 
                on:change={notifyChanges}
                class="mr-2 h-4 w-4"
              />
              Required Field
            </label>
          </div>
        </div>
        
        <!-- Email Field -->
        <div class="mb-4 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <h5 class="font-medium mb-2 text-neutral-800 dark:text-neutral-200">Email Field</h5>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Label</div>
              <input 
                type="text" 
                bind:value={communityConfig.contact.formFields.email.label} 
                on:input={notifyChanges}
                  class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
              />
            </div>
            <div>
              <div class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Placeholder</div>
              <input 
                type="text" 
                bind:value={communityConfig.contact.formFields.email.placeholder} 
                on:input={notifyChanges}
                  class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
              />
            </div>
          </div>
          <div class="mt-2">
            <label class="flex items-center text-xs font-medium text-neutral-700 dark:text-neutral-300">
              <input 
                type="checkbox" 
                bind:checked={communityConfig.contact.formFields.email.required} 
                on:change={notifyChanges}
                class="mr-2 h-4 w-4"
              />
              Required Field
            </label>
          </div>
        </div>
        
        <!-- Subject Field -->
        <div class="mb-4 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <h5 class="font-medium mb-2 text-neutral-800 dark:text-neutral-200">Subject Field</h5>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Label</div>
              <input 
                type="text" 
                bind:value={communityConfig.contact.formFields.subject.label} 
                on:input={notifyChanges}
                  class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
              />
            </div>
            <div>
              <div class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Placeholder</div>
              <input 
                type="text" 
                bind:value={communityConfig.contact.formFields.subject.placeholder} 
                on:input={notifyChanges}
                  class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
              />
            </div>
          </div>
          <div class="mt-2">
            <label class="flex items-center text-xs font-medium text-neutral-700 dark:text-neutral-300">
              <input 
                type="checkbox" 
                bind:checked={communityConfig.contact.formFields.subject.required} 
                on:change={notifyChanges}
                class="mr-2 h-4 w-4"
              />
              Required Field
            </label>
          </div>
        </div>
        
        <!-- Message Field -->
        <div class="mb-4 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <h5 class="font-medium mb-2 text-neutral-800 dark:text-neutral-200">Message Field</h5>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Label</div>
              <input 
                type="text" 
                bind:value={communityConfig.contact.formFields.message.label} 
                on:input={notifyChanges}
                  class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
              />
            </div>
            <div>
              <div class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Placeholder</div>
              <input 
                type="text" 
                bind:value={communityConfig.contact.formFields.message.placeholder} 
                on:input={notifyChanges}
                  class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
              />
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <div class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Rows</div>
              <input 
                type="number" 
                bind:value={communityConfig.contact.formFields.message.rows} 
                on:input={notifyChanges}
                min="2" 
                max="10" 
                  class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
              />
            </div>
            <div class="flex items-center">
              <label class="flex items-center text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <input 
                  type="checkbox" 
                  bind:checked={communityConfig.contact.formFields.message.required} 
                  on:change={notifyChanges}
                  class="mr-2 h-4 w-4"
                />
                Required Field
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  
  <!-- Newsletter Section -->
{:else if activeSection === 'newsletter'}
    <div class="newsletter-section space-y-6">
      <div class="card bg-white dark:bg-neutral-800 p-5 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-medium text-lg text-black/80 dark:text-white/80">Newsletter Section</h3>
          <label class="flex items-center">
            <input 
              type="checkbox" 
              bind:checked={communityConfig.newsletter.enabled} 
              on:change={notifyChanges}
              class="mr-2 h-4 w-4"
            />
            <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enabled</span>
          </label>
        </div>
        
        <div class="mb-4">
          <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Section Title</div>
          <input 
            type="text" 
            bind:value={communityConfig.newsletter.title} 
            on:input={notifyChanges}
              class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          />
        </div>
        
        <div class="mb-4">
          <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Description</div>
          <textarea 
            bind:value={communityConfig.newsletter.description} 
            on:input={notifyChanges}
            rows="3" 
              class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          ></textarea>
        </div>
        
        <div class="mb-4">
          <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Button Text</div>
          <input 
            type="text" 
            bind:value={communityConfig.newsletter.buttonText} 
            on:input={notifyChanges}
              class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          />
        </div>
        
        <div class="mb-4">
          <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Consent Text</div>
          <textarea 
            bind:value={communityConfig.newsletter.consentText} 
            on:input={notifyChanges}
            rows="2" 
              class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          ></textarea>
        </div>
        
        <h4 class="font-medium text-base mb-3 mt-6 text-neutral-800 dark:text-neutral-200">

Newsletter Features</h4>
        
        <div class="space-y-3 mb-6">
          {#each communityConfig.newsletter.features as feature, index}
            <div class="flex justify-between items-start p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div>
                <h5 class="font-medium text-neutral-800 dark:text-neutral-200">{feature.title}</h5>
                <p class="text-sm text-neutral-500 dark:text-neutral-400">{feature.description}</p>
                <div class="text-xs text-neutral-400 mt-1">Icon: {feature.icon}</div>
              </div>
              <button 
                class="p-1.5 text-neutral-500 hover:text-[var(--primary)] rounded-full"
                on:click={() => editFeatureItem('newsletter', index)}
                aria-label={`Edit ${feature.title}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          {/each}
        </div>
      </div>
    </div>
  
  <!-- Events Section -->
{:else if activeSection === 'events'}
    <div class="events-section space-y-6">
      <div class="card bg-white dark:bg-neutral-800 p-5 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-medium text-lg text-black/80 dark:text-white/80">Events Section</h3>
          <label class="flex items-center">
            <input 
              type="checkbox" 
              bind:checked={communityConfig.events.enabled} 
              on:change={notifyChanges}
              class="mr-2 h-4 w-4"
            />
            <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enabled</span>
          </label>
        </div>
        
        <div class="mb-4">
          <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Section Title</div>
          <input 
            type="text" 
            bind:value={communityConfig.events.title} 
            on:input={notifyChanges}
              class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          />
        </div>
        
        <div class="mb-4">
          <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Description</div>
          <textarea 
            bind:value={communityConfig.events.description} 
            on:input={notifyChanges}
            rows="3" 
              class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
          ></textarea>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Calendar URL</div>
            <input 
              type="text" 
              bind:value={communityConfig.events.calendarUrl} 
              on:input={notifyChanges}
                class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
            />
          </div>
          
          <div>
            <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Calendar Button Text</div>
            <input 
              type="text" 
              bind:value={communityConfig.events.calendarButtonText} 
              on:input={notifyChanges}
                class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
            />
          </div>
        </div>
        
        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-md p-3 text-amber-800 dark:text-amber-200 text-sm mt-6">
          <div class="flex">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p class="font-medium">Note about Events</p>
              <p class="mt-1">The events feature requires additional implementation to manage event listings. This section currently only controls the display of the events section and its content.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  
{/if}