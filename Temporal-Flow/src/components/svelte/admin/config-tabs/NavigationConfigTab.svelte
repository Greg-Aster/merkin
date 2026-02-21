<script>
  import SharedNavigationConfigTab from '@merkin/blog-core/components/svelte/admin/config-tabs/NavigationConfigTab.svelte'

  export let navBarConfig
</script>

<SharedNavigationConfigTab {navBarConfig} on:change />
