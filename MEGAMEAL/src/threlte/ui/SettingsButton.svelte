<script lang="ts">
  import { isSettingsMenuOpen } from '../stores/uiStore';

  function toggleSettings() {
    isSettingsMenuOpen.update(open => !open);
  }
</script>

<button class="settings-button" on:click={toggleSettings}>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L19 6.25L18.5 5L19 3.75L21 3V1L19 1.75L18.5 1L19 0.25L21 0H19L18 1L16 1L15 0H13V2L15.25 3L15 3.5L15.25 4L13 5V7L15 7.75L15.5 9L15.25 10.25L13 11V13H15L16 12L18 12L19 13H21V11L19.25 10.25L19.5 9L19.25 7.75L21 7V9Z"/>
  </svg>
</button>

<style>
  .settings-button {
    position: fixed;
    top: 10px;
    right: 10px;
    width: 48px;
    height: 48px;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    transition: background-color 0.2s ease;
  }
  
  .settings-button:hover {
    background: rgba(0, 0, 0, 0.7);
  }
  
  .settings-button:active {
    transform: scale(0.95);
  }
</style>