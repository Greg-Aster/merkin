<script>
import { createEventDispatcher } from 'svelte'
import { createGitHubService } from '../../../lib/github-service'
import GithubAuthForm from './GithubAuthForm.svelte'
import GitHubIntegrationStatus from './GitHubIntegrationStatus.svelte'
import {
  updateMainConfigFile,
  updateStandaloneConfigFile,
} from './github-config-writer'

export let siteConfig
export let navBarConfig
export let profileConfig
export let licenseConfig
export let timelineConfig
export let avatarConfig
export let communityConfig
export let aboutConfig
export let postCardConfig
export let bannerConfig
export let originalConfigValues
export const hasChanges = false

let githubService = createGitHubService()
let isGitHubAuthenticated = false
let showGitHubAuthForm = false
let isCommitting = false
let commitStatus = { success: false, error: null }
let showDeployOptions = false
let githubToken = ''

const dispatch = createEventDispatcher()

// Initialize on component mount
export function initialize() {
  // Check GitHub authentication status
  isGitHubAuthenticated = githubService.isAuthenticated()

  // Set GitHub repository settings if needed
  if (!githubService.config) {
    githubService = createGitHubService({
      // These should match your GitHub repository details
      owner: 'your-github-username', // Update with your GitHub username
      repo: 'your-repo-name', // Update with your repository name
      branch: 'main', // Update with your branch name
      configPath: 'src/config',
      postsPath: 'src/content',
    })
  }
}

// Show GitHub auth form
function showGitHubAuth() {
  showGitHubAuthForm = true
}

// Handle GitHub authentication
async function handleGitHubAuth(event) {
  // Get token from event if provided, otherwise use the bound value
  const token = event && event.detail ? event.detail : githubToken

  if (!token) {
    commitStatus.error = 'Please enter a valid token'
    return
  }

  try {
    isCommitting = true
    commitStatus.error = null

    // Authenticate with GitHub
    const success = githubService.authenticate(token)

    if (success) {
      // Test the token with a simple API call
      try {
        await githubService.getFile('README.md')
        isGitHubAuthenticated = true
        showGitHubAuthForm = false
        commitStatus.success = true

        // Show success message
        setTimeout(() => {
          commitStatus.success = false
        }, 3000)
      } catch (error) {
        console.error('Token validation error:', error)
        if (error.message.includes('401')) {
          commitStatus.error =
            'Authentication failed. Please check your token permissions.'
        } else if (error.message.includes('404')) {
          commitStatus.error =
            'Repository or README.md not found. Check your repository settings.'
        } else {
          commitStatus.error = `Token validation error: ${error.message}`
        }
        githubService.logout() // Clear the invalid token
      }
    } else {
      commitStatus.error = 'Failed to authenticate'
    }
  } catch (error) {
    console.error('Authentication error:', error)
    commitStatus.error = error.message || 'Failed to authenticate'
  } finally {
    isCommitting = false
  }
}

// Handle GitHub logout
function handleGitHubLogout() {
  githubService.logout()
  isGitHubAuthenticated = false
  showDeployOptions = false
}

// Save configs to GitHub
async function saveConfigsToGitHub() {
  if (!isGitHubAuthenticated) {
    commitStatus.error = 'Please authenticate with GitHub first'
    return
  }

  try {
    isCommitting = true
    commitStatus.error = null

    // Track which configs have changed
    const mainConfigChanges = []
    const standaloneConfigChanges = []

    // Check which configs in the main file have changed
    if (JSON.stringify(siteConfig) !== originalConfigValues.siteConfig) {
      mainConfigChanges.push({
        name: 'siteConfig',
        obj: siteConfig,
        typeName: 'SiteConfig',
      })
    }

    if (JSON.stringify(navBarConfig) !== originalConfigValues.navBarConfig) {
      mainConfigChanges.push({
        name: 'navBarConfig',
        obj: navBarConfig,
        typeName: 'NavBarConfig',
      })
    }

    if (JSON.stringify(profileConfig) !== originalConfigValues.profileConfig) {
      mainConfigChanges.push({
        name: 'profileConfig',
        obj: profileConfig,
        typeName: 'ProfileConfig',
      })
    }

    if (JSON.stringify(licenseConfig) !== originalConfigValues.licenseConfig) {
      mainConfigChanges.push({
        name: 'licenseConfig',
        obj: licenseConfig,
        typeName: 'LicenseConfig',
      })
    }

    // Check which standalone config files have changed
    if (
      JSON.stringify(timelineConfig) !== originalConfigValues.timelineConfig
    ) {
      standaloneConfigChanges.push({
        name: 'timelineConfig',
        obj: timelineConfig,
        filename: 'timelineconfig.ts',
      })
    }

    if (JSON.stringify(avatarConfig) !== originalConfigValues.avatarConfig) {
      standaloneConfigChanges.push({
        name: 'avatarConfig',
        obj: avatarConfig,
        filename: 'avatar.config.ts',
      })
    }

    if (
      JSON.stringify(communityConfig) !== originalConfigValues.communityConfig
    ) {
      standaloneConfigChanges.push({
        name: 'communityConfig',
        obj: communityConfig,
        filename: 'community.config.ts',
      })
    }

    if (JSON.stringify(aboutConfig) !== originalConfigValues.aboutConfig) {
      standaloneConfigChanges.push({
        name: 'aboutConfig',
        obj: aboutConfig,
        filename: 'about.config.ts',
      })
    }

    if (
      JSON.stringify(postCardConfig) !== originalConfigValues.postCardConfig
    ) {
      standaloneConfigChanges.push({
        name: 'postCardConfig',
        obj: postCardConfig,
        filename: 'postcard.config.ts',
      })
    }

    if (JSON.stringify(bannerConfig) !== originalConfigValues.bannerConfig) {
      standaloneConfigChanges.push({
        name: 'bannerConfig',
        obj: bannerConfig,
        filename: 'banner.config.ts',
      })
    }

    // If no configs have changed, inform the user
    if (
      mainConfigChanges.length === 0 &&
      standaloneConfigChanges.length === 0
    ) {
      commitStatus.error = 'No configuration changes detected to commit'
      isCommitting = false
      return
    }

    console.log(`Saving configuration changes...`)

    // Update the main config.ts file if needed
    if (mainConfigChanges.length > 0) {
      await updateMainConfigFile(githubService, mainConfigChanges)
      console.log(
        `Updated ${mainConfigChanges.length} configs in main config.ts file`,
      )
    }

    // Update standalone config files if needed
    for (const config of standaloneConfigChanges) {
      await updateStandaloneConfigFile(githubService, config)
      console.log(`Saved ${config.filename}`)
    }

    // Notify parent that changes were saved and values should be updated
    dispatch('configsaved', {
      success: true,
      message: 'Configurations saved successfully to GitHub',
    })

    // Reset hasChanges flag (this is also done in the parent)
    // hasChanges = false;

    // Show success and deploy options
    commitStatus.success = true
    showDeployOptions = true

    // Show success message
    setTimeout(() => {
      commitStatus.success = false
    }, 3000)
  } catch (error) {
    console.error('Error saving configs to GitHub:', error)

    // Provide more detailed error messages
    if (error.message.includes('401')) {
      commitStatus.error =
        'Authentication failed. Please refresh your GitHub token.'
    } else if (error.message.includes('404')) {
      commitStatus.error =
        'Repository or file not found. Check your repository settings.'
    } else {
      commitStatus.error = `Failed to save to GitHub: ${error.message}`
    }

    // Notify parent of error
    dispatch('configsaved', {
      success: false,
      error: error.message,
    })
  } finally {
    isCommitting = false
  }
}

// Trigger site rebuild
async function triggerSiteRebuild() {
  if (!isGitHubAuthenticated) {
    commitStatus.error = 'Please authenticate with GitHub first'
    return
  }

  try {
    isCommitting = true
    commitStatus.error = null

    // Add a small delay to ensure all commits are processed
    // This prevents triggering a rebuild while commits are still being processed
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Trigger the GitHub Action workflow for rebuilding the site
    // Make sure this matches your actual workflow filename
    await githubService.triggerWorkflow('deploy.yml')

    // Update UI status
    commitStatus.success = true
    showDeployOptions = false

    // Notify parent that site rebuild was triggered
    dispatch('deploy', {
      success: true,
      message: 'Site rebuild triggered successfully',
    })

    // Show success message
    setTimeout(() => {
      commitStatus.success = false
    }, 3000)
  } catch (error) {
    console.error('Error triggering rebuild:', error)

    if (error.message.includes('404')) {
      commitStatus.error = `Failed to trigger rebuild: Workflow file not found. Make sure 'deploy.yml' exists in your repository's .github/workflows directory.`
    } else {
      commitStatus.error = `Failed to trigger rebuild: ${error.message}`
    }

    // Notify parent of error
    dispatch('deploy', {
      success: false,
      error: error.message,
    })
  } finally {
    isCommitting = false
  }
}
</script>

<!-- GitHub Integration Panel -->
<div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-5">
  <h3 class="text-lg font-medium text-black/80 dark:text-white/80 mb-4">GitHub Integration</h3>
  
  {#if !isGitHubAuthenticated}
    <GitHubIntegrationStatus authenticated={false} />
    
    {#if showGitHubAuthForm}
      <GithubAuthForm 
        isAuthenticating={isCommitting}
        errorMessage={commitStatus.error}
        bind:token={githubToken}
        on:authenticate={handleGitHubAuth}
        on:cancel={() => showGitHubAuthForm = false}
        on:error={(e) => commitStatus.error = e.detail}
      />
    {:else}
      <button 
        on:click={showGitHubAuth}
        data-sfx-hover="hover-emphasis"
        data-sfx-click="confirm"
        class="py-2 px-4 bg-neutral-800 dark:bg-neutral-200 hover:bg-neutral-900 dark:hover:bg-neutral-300 text-white dark:text-neutral-800 font-medium rounded-md transition-colors flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
        Connect to GitHub
      </button>
    {/if}
  {:else}
    <GitHubIntegrationStatus authenticated={true} />
    
    <div class="flex flex-col sm:flex-row gap-3">
      <button 
        on:click={saveConfigsToGitHub}
        disabled={isCommitting || !hasChanges}
        data-sfx-hover="hover-soft"
        data-sfx-click="confirm"
        class="py-2 px-4 bg-neutral-800 dark:bg-neutral-200 hover:bg-neutral-900 dark:hover:bg-neutral-300 text-white dark:text-neutral-800 font-medium rounded-md transition-colors flex items-center justify-center disabled:opacity-50"
      >
        {#if isCommitting && !showDeployOptions}
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Committing to GitHub...
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          {hasChanges ? 'Commit to GitHub' : 'No Changes to Commit'}
        {/if}
      </button>
      
      {#if showDeployOptions}
        <button 
          on:click={triggerSiteRebuild}
          disabled={isCommitting}
          data-sfx-hover="hover-emphasis"
          data-sfx-click="success"
          class="py-2 px-4 bg-[var(--primary)] hover:opacity-90 text-white font-medium rounded-md transition-opacity flex items-center justify-center disabled:opacity-50"
        >
          {#if isCommitting}
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Triggering Rebuild...
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Deploy Changes
          {/if}
        </button>
      {/if}
      
      <button 
        on:click={handleGitHubLogout}
        data-sfx-hover="hover-soft"
        data-sfx-click="warning"
        class="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Disconnect
      </button>
    </div>
    
    {#if commitStatus.success}
      <div class="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        {showDeployOptions ? 'Changes committed successfully!' : 'Site rebuild triggered successfully!'}
      </div>
    {/if}
    
    {#if commitStatus.error}
      <div class="mt-3 text-sm text-red-600 dark:text-red-400">
        {commitStatus.error}
      </div>
    {/if}
  {/if}
  
</div>
