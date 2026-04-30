<script>
import { createEventDispatcher, onMount } from 'svelte'
import AboutConfigTab from './config-tabs/AboutConfigTab.svelte'
import AddonsConfigTab from './config-tabs/AddonsConfigTab.svelte'
import AdvancedConfigTab from './config-tabs/AdvancedConfigTab.svelte'
import AppearanceConfigTab from './config-tabs/AppearanceConfigTab.svelte'
import CommunityConfigTab from './config-tabs/CommunityConfigTab.svelte'
// config tabs
import GeneralConfigTab from './config-tabs/GeneralConfigTab.svelte'
import NavigationConfigTab from './config-tabs/NavigationConfigTab.svelte'
import ProfileConfigTab from './config-tabs/ProfileConfigTab.svelte'
import SecurityConfigTab from './config-tabs/SecurityConfigTab.svelte'
import TimelineConfigTab from './config-tabs/TimelineConfigTab.svelte'

import AboutConfigExporter from './AboutConfigExporter.svelte'
import BannerConfigExporter from './BannerConfigExporter.svelte'
import AdminConfigTabs from './AdminConfigTabs.svelte'
import CommunityConfigExporter from './CommunityConfigExporter.svelte'
// exporters
import ConfigExporter from './ConfigExporter.svelte'
import GitHubIntegration from './GitHubIntegration.svelte'
import PostCardConfigExporter from './PostCardConfigExporter.svelte'

// Props for configuration objects
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
export let addonsConfig

// State management
let activeTab = 'general'
const saveStatus = { saving: false, success: false, error: null }
let hasChanges = false

// Original config values for comparison
let originalConfigValues = {
  siteConfig: null,
  navBarConfig: null,
  profileConfig: null,
  licenseConfig: null,
  timelineConfig: null,
  avatarConfig: null,
  communityConfig: null,
  aboutConfig: null,
  postCardConfig: null,
  bannerConfig: null,
  addonsConfig: null,
}

// Event dispatcher for notifying parent components
const dispatch = createEventDispatcher()

// GitHub integration component reference
let githubIntegration

// Tabs configuration
const tabs = [
  { id: 'general', label: 'General', icon: 'mdi:cog-outline' },
  { id: 'navigation', label: 'Navigation', icon: 'mdi:navigation' },
  { id: 'profile', label: 'Profile', icon: 'mdi:account' },
  { id: 'appearance', label: 'Appearance', icon: 'mdi:palette-outline' },
  { id: 'timeline', label: 'Timeline', icon: 'mdi:timeline' },
  { id: 'community', label: 'Community', icon: 'mdi:account-group' },
  { id: 'about', label: 'About', icon: 'mdi:information-outline' },
  { id: 'security', label: 'Security', icon: 'mdi:shield-outline' },
  { id: 'advanced', label: 'Advanced', icon: 'mdi:code-json' },
  { id: 'addons', label: 'Add-ons', icon: 'mdi:puzzle-outline' },
]

// Tab switching
function setActiveTab(tabId) {
  activeTab = tabId
}

// State for config exporters
let showConfigExporter = false
let showCommunityConfigExporter = false
let showAboutConfigExporter = false
let showPostCardConfigExporter = false
let showBannerConfigExporter = false

// Function to handle saving all configuration
async function saveAllConfiguration() {
  try {
    saveStatus.saving = true
    saveStatus.error = null

    // Store in localStorage for demonstration/temporary savings
    localStorage.setItem('siteConfig', JSON.stringify(siteConfig))
    localStorage.setItem('navBarConfig', JSON.stringify(navBarConfig))
    localStorage.setItem('profileConfig', JSON.stringify(profileConfig))
    localStorage.setItem('licenseConfig', JSON.stringify(licenseConfig))
    localStorage.setItem('timelineConfig', JSON.stringify(timelineConfig))
    localStorage.setItem('avatarConfig', JSON.stringify(avatarConfig))
    localStorage.setItem('communityConfig', JSON.stringify(communityConfig))
    localStorage.setItem('aboutConfig', JSON.stringify(aboutConfig))
    localStorage.setItem('postCardConfig', JSON.stringify(postCardConfig))
    localStorage.setItem('bannerConfig', JSON.stringify(bannerConfig))
    localStorage.setItem('addonsConfig', JSON.stringify(addonsConfig))

    // Update original values to reflect saved state
    originalConfigValues = {
      siteConfig: JSON.stringify(siteConfig),
      navBarConfig: JSON.stringify(navBarConfig),
      profileConfig: JSON.stringify(profileConfig),
      licenseConfig: JSON.stringify(licenseConfig),
      timelineConfig: JSON.stringify(timelineConfig),
      avatarConfig: JSON.stringify(avatarConfig),
      communityConfig: JSON.stringify(communityConfig),
      aboutConfig: JSON.stringify(aboutConfig),
      postCardConfig: JSON.stringify(postCardConfig),
      bannerConfig: JSON.stringify(bannerConfig),
      addonsConfig: JSON.stringify(addonsConfig),
    }

    // Reset hasChanges flag
    hasChanges = false

    // Show success message
    saveStatus.success = true

    // Show the appropriate exporter based on active tab
    if (activeTab === 'community') {
      showCommunityConfigExporter = true
    } else if (activeTab === 'about') {
      showAboutConfigExporter = true
    } else if (activeTab === 'appearance') {
      // We want to offer the user the choice of which appearance config to export
      // If banner settings were modified, show banner exporter, otherwise show post card exporter
      const bannerChanged =
        JSON.stringify(bannerConfig) !== originalConfigValues.bannerConfig
      const postCardChanged =
        JSON.stringify(postCardConfig) !== originalConfigValues.postCardConfig

      if (bannerChanged) {
        showBannerConfigExporter = true
      } else {
        showPostCardConfigExporter = true
      }
    } else {
      showConfigExporter = true
    }

    // Notify parent component
    dispatch('saved', {
      siteConfig,
      navBarConfig,
      profileConfig,
      licenseConfig,
      timelineConfig,
      avatarConfig,
      communityConfig,
      aboutConfig,
      postCardConfig,
      bannerConfig,
    })

    // Reset success message after a delay
    setTimeout(() => {
      saveStatus.success = false
    }, 3000)
  } catch (error) {
    console.error('Error saving configuration:', error)
    saveStatus.error = 'Failed to save configuration. Please try again.'
  } finally {
    saveStatus.saving = false
  }
}

// Handle GitHub events
function handleGitHubConfigSaved(event) {
  const { success, error } = event.detail

  if (success) {
    // Update original values to reflect saved state
    originalConfigValues = {
      siteConfig: JSON.stringify(siteConfig),
      navBarConfig: JSON.stringify(navBarConfig),
      profileConfig: JSON.stringify(profileConfig),
      licenseConfig: JSON.stringify(licenseConfig),
      timelineConfig: JSON.stringify(timelineConfig),
      avatarConfig: JSON.stringify(avatarConfig),
      communityConfig: JSON.stringify(communityConfig),
      aboutConfig: JSON.stringify(aboutConfig),
      postCardConfig: JSON.stringify(postCardConfig),
      bannerConfig: JSON.stringify(bannerConfig),
    }

    // Reset hasChanges flag
    hasChanges = false

    // Show success notification
    saveStatus.success = true
    saveStatus.error = null

    // Reset success message after a delay
    setTimeout(() => {
      saveStatus.success = false
    }, 3000)
  } else if (error) {
    console.error('GitHub save error:', error)
    saveStatus.error = `GitHub save error: ${error}`
    saveStatus.success = false

    // Reset error message after a delay
    setTimeout(() => {
      saveStatus.error = null
    }, 5000)
  }
}

// Handle GitHub deployment events
function handleGitHubDeploy(event) {
  const { success, error } = event.detail

  if (success) {
    saveStatus.success = true
    saveStatus.error = null

    // Reset success message after a delay
    setTimeout(() => {
      saveStatus.success = false
    }, 3000)
  } else if (error) {
    console.error('GitHub deploy error:', error)
    saveStatus.error = `GitHub deploy error: ${error}`
    saveStatus.success = false

    // Reset error message after a delay
    setTimeout(() => {
      saveStatus.error = null
    }, 5000)
  }
}

// On component mount
onMount(() => {
  // Check for saved config in localStorage (for demo/persistence)
  try {
    // Initialize configs if they're undefined
    if (!avatarConfig) {
      avatarConfig = {
        avatarList: [],
        homeAvatar: '',
        animationInterval: 3500,
      }
    }

    if (!communityConfig) {
      communityConfig = {
        hero: {
          title: 'Join Our Community',
          description:
            'Connect with other members, share ideas, get help, and stay updated on the latest developments.',
          showGraphic: false,
          options: [],
        },
        discord: {
          enabled: true,
          title: 'Discord Community',
          description: '',
          inviteUrl: '',
          buttonText: '',
          features: [],
          channels: [],
        },
        contact: {
          enabled: true,
          title: 'Get in Touch',
          description: '',
          formActionUrl: '',
          buttonText: '',
          features: [],
          formFields: { name: {}, email: {}, subject: {}, message: {} },
        },
        newsletter: {
          enabled: false,
          title: 'Newsletter',
          description: '',
          buttonText: '',
          features: [],
          consentText: '',
        },
        events: {
          enabled: false,
          title: 'Events',
          description: '',
          calendarButtonText: '',
          calendarUrl: '',
        },
        guidelines: {
          enabled: true,
          title: 'Community Guidelines',
          description: '',
          items: [],
        },
      }
    }

    if (!aboutConfig) {
      aboutConfig = {
        team: {
          enabled: true,
          title: 'Our Team',
          description: 'Meet the people behind the project',
          layout: 'grid',
          columns: {
            mobile: 1,
            tablet: 2,
            desktop: 3,
          },
          showEmail: true,
          showRole: true,
          avatarShape: 'rounded',
        },
        content: {
          enabled: true,
          defaultTitle: 'About The Project',
          showTableOfContents: true,
        },
        contact: {
          enabled: true,
          title: 'Get In Touch',
          description:
            "Have questions, ideas, or want to collaborate? We'd love to hear from you!",
          contactInfo: {
            email: 'contact@example.com',
          },
          displayOrder: ['description', 'email'],
        },
      }
    }

    if (!postCardConfig) {
      postCardConfig = {
        localPosts: {
          layout: {
            imagePosition: 'right',
            imageSizePercentage: 28,
            cardBorderRadius: 'rounded-[var(--radius-large)]',
            showEnterButton: true,
          },
          styling: {
            titleSize: 'text-3xl',
            descriptionLines: 2,
            animationEnabled: true,
          },
          content: {
            showCategory: true,
            showTags: true,
            showUpdateDate: true,
            showWordCount: true,
            showReadTime: true,
            hideTagsOnMobile: true,
          },
        },
        friendPosts: {
          layout: {
            imagePosition: 'right',
            imageSizePercentage: 28,
            cardBorderRadius: 'rounded-[var(--radius-large)]',
            showEnterButton: true,
          },
          styling: {
            titleSize: 'text-3xl',
            descriptionLines: 2,
            animationEnabled: true,
          },
          content: {
            showCategory: true,
            showTags: true,
            showUpdateDate: true,
            showWordCount: true,
            showReadTime: true,
            hideTagsOnMobile: true,
          },
          friendStyling: {
            indicatorType: 'border',
            indicatorColor: 'var(--primary)',
            showFriendAvatar: true,
            avatarSize: 'w-5 h-5',
          },
          attribution: {
            showAttribution: true,
            attributionText: 'Shared from [friendName]',
            linkToFriendSite: true,
          },
          behavior: {
            sortingMethod: 'date',
            mergeWithLocalPosts: true,
          },
        },
      }
    }

    // Initialize banner config if it doesn't exist
    if (!bannerConfig) {
      bannerConfig = {
        bannerList: [
          'src/assets/banner/0001.png',
          'src/assets/banner/0002.png',
          'src/assets/banner/0003.png',
          'src/assets/banner/0004.png',
          'src/assets/banner/0005.png',
          'src/assets/banner/0006.png',
          'src/assets/banner/0007.png',
          'src/assets/banner/0008.png',
        ],
        defaultBanner: 'src/assets/banner/0001.png',
        animation: {
          enabled: true,
          interval: 5000,
          transitionDuration: 1000,
          direction: 'alternate',
        },
        layout: {
          height: {
            desktop: '50vh',
            mobile: '30vh',
          },
          overlap: {
            desktop: '3.5rem',
            mobile: '2rem',
          },
          maxWidth: 3840,
        },
        visual: {
          objectFit: 'cover',
          objectPosition: 'center',
          applyGradientOverlay: false,
          gradientOverlay:
            'linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)',
          borderRadius: '0',
        },
        fallback: {
          enabled: true,
          type: 'gradient',
          value:
            'linear-gradient(to bottom, var(--color-primary-light), var(--color-primary))',
        },
      }
    }

    // Initialize addons config if it doesn't exist
    if (!addonsConfig) {
      addonsConfig = {
        enabled: false,
        availableAddons: [],
        installedAddons: [],
      }
    }

    // Load saved configs from localStorage if they exist
    const savedSiteConfig = localStorage.getItem('siteConfig')
    if (savedSiteConfig && savedSiteConfig !== 'undefined') {
      siteConfig = { ...siteConfig, ...JSON.parse(savedSiteConfig) }
    }

    const savedNavConfig = localStorage.getItem('navBarConfig')
    if (savedNavConfig && savedNavConfig !== 'undefined') {
      navBarConfig = { ...navBarConfig, ...JSON.parse(savedNavConfig) }
    }

    const savedProfileConfig = localStorage.getItem('profileConfig')
    if (savedProfileConfig && savedProfileConfig !== 'undefined') {
      profileConfig = { ...profileConfig, ...JSON.parse(savedProfileConfig) }
    }

    const savedLicenseConfig = localStorage.getItem('licenseConfig')
    if (savedLicenseConfig && savedLicenseConfig !== 'undefined') {
      licenseConfig = { ...licenseConfig, ...JSON.parse(savedLicenseConfig) }
    }

    const savedTimelineConfig = localStorage.getItem('timelineConfig')
    if (savedTimelineConfig && savedTimelineConfig !== 'undefined') {
      timelineConfig = { ...timelineConfig, ...JSON.parse(savedTimelineConfig) }
    }

    const savedAvatarConfig = localStorage.getItem('avatarConfig')
    if (savedAvatarConfig && savedAvatarConfig !== 'undefined') {
      avatarConfig = { ...avatarConfig, ...JSON.parse(savedAvatarConfig) }
    }

    const savedCommunityConfig = localStorage.getItem('communityConfig')
    if (savedCommunityConfig && savedCommunityConfig !== 'undefined') {
      communityConfig = {
        ...communityConfig,
        ...JSON.parse(savedCommunityConfig),
      }
    }

    const savedAboutConfig = localStorage.getItem('aboutConfig')
    if (savedAboutConfig && savedAboutConfig !== 'undefined') {
      aboutConfig = { ...aboutConfig, ...JSON.parse(savedAboutConfig) }
    }

    const savedPostCardConfig = localStorage.getItem('postCardConfig')
    if (savedPostCardConfig && savedPostCardConfig !== 'undefined') {
      postCardConfig = { ...postCardConfig, ...JSON.parse(savedPostCardConfig) }
    }

    const savedBannerConfig = localStorage.getItem('bannerConfig')
    if (savedBannerConfig && savedBannerConfig !== 'undefined') {
      bannerConfig = { ...bannerConfig, ...JSON.parse(savedBannerConfig) }
    }

    const savedAddonsConfig = localStorage.getItem('addonsConfig')
    if (savedAddonsConfig && savedAddonsConfig !== 'undefined') {
      addonsConfig = { ...addonsConfig, ...JSON.parse(savedAddonsConfig) }
    }

    // Store original values for change detection
    originalConfigValues = {
      siteConfig: JSON.stringify(siteConfig),
      navBarConfig: JSON.stringify(navBarConfig),
      profileConfig: JSON.stringify(profileConfig),
      licenseConfig: JSON.stringify(licenseConfig),
      timelineConfig: JSON.stringify(timelineConfig),
      avatarConfig: JSON.stringify(avatarConfig),
      communityConfig: JSON.stringify(communityConfig),
      aboutConfig: JSON.stringify(aboutConfig),
      postCardConfig: JSON.stringify(postCardConfig),
      bannerConfig: JSON.stringify(bannerConfig),
      addonsConfig: JSON.stringify(addonsConfig),
    }

    // Initialize GitHub integration
    if (githubIntegration) {
      githubIntegration.initialize()
    }
  } catch (error) {
    console.error('Error loading saved configuration:', error)
  }
})

// Check for changes in any config to enable/disable the save button
$: {
  if (
    originalConfigValues.siteConfig &&
    originalConfigValues.navBarConfig &&
    originalConfigValues.profileConfig &&
    originalConfigValues.licenseConfig &&
    originalConfigValues.timelineConfig &&
    originalConfigValues.avatarConfig &&
    originalConfigValues.communityConfig &&
    originalConfigValues.aboutConfig &&
    originalConfigValues.postCardConfig &&
    originalConfigValues.bannerConfig
  ) {
    try {
      const currentValues = {
        siteConfig: JSON.stringify(siteConfig),
        navBarConfig: JSON.stringify(navBarConfig),
        profileConfig: JSON.stringify(profileConfig),
        licenseConfig: JSON.stringify(licenseConfig),
        timelineConfig: JSON.stringify(timelineConfig),
        avatarConfig: JSON.stringify(avatarConfig),
        communityConfig: JSON.stringify(communityConfig),
        aboutConfig: JSON.stringify(aboutConfig),
        postCardConfig: JSON.stringify(postCardConfig),
        bannerConfig: JSON.stringify(bannerConfig),
        addonsConfig: JSON.stringify(addonsConfig),
      }

      hasChanges =
        currentValues.siteConfig !== originalConfigValues.siteConfig ||
        currentValues.navBarConfig !== originalConfigValues.navBarConfig ||
        currentValues.profileConfig !== originalConfigValues.profileConfig ||
        currentValues.licenseConfig !== originalConfigValues.licenseConfig ||
        currentValues.timelineConfig !== originalConfigValues.timelineConfig ||
        currentValues.avatarConfig !== originalConfigValues.avatarConfig ||
        currentValues.communityConfig !==
          originalConfigValues.communityConfig ||
        currentValues.aboutConfig !== originalConfigValues.aboutConfig ||
        currentValues.postCardConfig !== originalConfigValues.postCardConfig ||
        currentValues.bannerConfig !== originalConfigValues.bannerConfig ||
        currentValues.addonsConfig !== originalConfigValues.addonsConfig
    } catch (error) {
      console.error('Error checking for changes:', error)
      // If there's an error comparing, assume changes were made
      hasChanges = true
    }
  }
}
</script>
  
<!-- Main Configuration Panel -->
<div class="config-panel">
  <!-- Config Tabs Header -->
  <div class="card-base w-full rounded-[var(--radius-large)] overflow-hidden relative mb-4">
    <div class="p-6 md:p-9">
      <AdminConfigTabs {tabs} {activeTab} {setActiveTab} />
      
      <!-- Tab Panels -->
      <div class="tab-panels">
        {#if activeTab === 'general'}
          <GeneralConfigTab 
            bind:siteConfig 
            bind:licenseConfig 
            on:change={() => hasChanges = true} 
          />
        {:else if activeTab === 'navigation'}
          <NavigationConfigTab 
            bind:navBarConfig 
            on:change={() => hasChanges = true} 
          />
        {:else if activeTab === 'profile'}
          <ProfileConfigTab 
            bind:profileConfig 
            bind:avatarConfig
            on:change={() => hasChanges = true}
            on:avatarChange={() => hasChanges = true}
          />
        {:else if activeTab === 'appearance'}
          <AppearanceConfigTab 
            bind:siteConfig 
            bind:postCardConfig
            bind:bannerConfig
            on:change={() => hasChanges = true} 
          />
        {:else if activeTab === 'timeline'}
          <TimelineConfigTab 
            bind:timelineConfig 
            on:change={() => hasChanges = true} 
          />
        {:else if activeTab === 'community'}
          <CommunityConfigTab 
            bind:communityConfig 
            on:change={() => hasChanges = true} 
          />
        {:else if activeTab === 'about'}
          <AboutConfigTab 
            bind:aboutConfig 
            on:change={() => hasChanges = true} 
          />
          {:else if activeTab === 'security'}
          <SecurityConfigTab
            on:change={() => hasChanges = true}
          />
          {:else if activeTab === 'addons'}
          <AddonsConfigTab 
            bind:addonsConfig
            on:change={() => hasChanges = true} 
          />
        {:else if activeTab === 'advanced'}
          <AdvancedConfigTab 
            {siteConfig} 
            {navBarConfig} 
            {profileConfig} 
            {licenseConfig}
            {timelineConfig}
            {avatarConfig}
            {communityConfig}
            {aboutConfig}
            {postCardConfig}
            {bannerConfig}
            on:update={(e) => {
              // Handle updates from the advanced editor
              const { configType, newValue } = e.detail;
              if (configType === 'siteConfig') siteConfig = newValue;
              else if (configType === 'navBarConfig') navBarConfig = newValue;
              else if (configType === 'profileConfig') profileConfig = newValue;
              else if (configType === 'licenseConfig') licenseConfig = newValue;
              else if (configType === 'timelineConfig') timelineConfig = newValue;
              else if (configType === 'avatarConfig') avatarConfig = newValue;
              else if (configType === 'communityConfig') communityConfig = newValue;
              else if (configType === 'aboutConfig') aboutConfig = newValue;
              else if (configType === 'postCardConfig') postCardConfig = newValue;
              else if (configType === 'bannerConfig') bannerConfig = newValue;
              
              // Mark that changes have been made
              hasChanges = true;
            }}
          />
        {/if}
      </div>
      
      <!-- Save Button -->
      <div class="mt-8 border-t border-neutral-200 dark:border-neutral-700 pt-6">
        <div class="flex justify-between items-center">
          <!-- Status message -->
          <div class="text-sm">
            {#if saveStatus.saving}
              <span class="text-neutral-500 dark:text-neutral-400 flex items-center">
                <svg class="animate-spin mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving changes...
              </span>
            {:else if saveStatus.success}
              <span class="text-green-600 dark:text-green-400 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Configuration saved successfully!
              </span>
            {:else if saveStatus.error}
              <span class="text-red-600 dark:text-red-400 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                {saveStatus.error}
              </span>
            {/if}
          </div>
          
          <button 
            on:click={saveAllConfiguration}
            disabled={saveStatus.saving || !hasChanges}
            data-sfx-hover="hover-emphasis"
            data-sfx-click="success"
            class="py-2 px-6 bg-[var(--primary)] hover:opacity-90 text-white font-medium rounded-md transition-opacity flex items-center disabled:opacity-60"
            title={!hasChanges ? "No changes to save" : "Save your changes"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {saveStatus.saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
          </button>
        </div>
      </div>
      
      <!-- GitHub Integration Component -->
      <div class="mt-4">
        <GitHubIntegration
          bind:this={githubIntegration}
          {siteConfig}
          {navBarConfig}
          {profileConfig}
          {licenseConfig}
          {timelineConfig}
          {avatarConfig}
          {communityConfig}
          {aboutConfig}
          {postCardConfig}
          {bannerConfig}
          {originalConfigValues}
          {hasChanges}
          on:configsaved={handleGitHubConfigSaved}
          on:deploy={handleGitHubDeploy}
        />
      </div>
    </div>
  </div>
</div>

<!-- General Config Exporter Dialog -->
<ConfigExporter
  bind:show={showConfigExporter}
  {siteConfig}
  {navBarConfig}
  {profileConfig}
  {licenseConfig}
  {timelineConfig}
  {avatarConfig}
  {communityConfig}
  {aboutConfig}
  on:close={() => showConfigExporter = false}
/>

<!-- Community Config Exporter Dialog -->
<CommunityConfigExporter
  bind:show={showCommunityConfigExporter}
  {communityConfig}
  on:close={() => showCommunityConfigExporter = false}
/>

<!-- About Config Exporter Dialog -->
<AboutConfigExporter
  bind:show={showAboutConfigExporter}
  {aboutConfig}
  on:close={() => showAboutConfigExporter = false}
/>

<!-- PostCard Config Exporter Dialog -->
<PostCardConfigExporter
  bind:show={showPostCardConfigExporter}
  {postCardConfig}
  on:close={() => showPostCardConfigExporter = false}
/>

<!-- Banner Config Exporter Dialog -->
<BannerConfigExporter
  bind:show={showBannerConfigExporter}
  {bannerConfig}
  on:close={() => showBannerConfigExporter = false}
/>
