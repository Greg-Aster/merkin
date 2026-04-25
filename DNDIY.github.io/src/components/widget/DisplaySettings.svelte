<script lang="ts">
import I18nKey from '@i18n/i18nKey'
import { i18n } from '@i18n/translation'
import SharedDisplaySettings from '@merkin/blog-core/components/widget/DisplaySettings.svelte'
</script>

<SharedDisplaySettings
  themeColorLabel={i18n(I18nKey.themeColor)}
  resetButtonLabel="Reset to Default"
/>
