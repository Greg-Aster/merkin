# Cuppy Frontend Components Overview

This document provides instructions on how to configure the AI provider for the Cuppy mascot and related components within the MegaMeal frontend.

## Configuring the AI Provider

The AI provider for both the main Cuppy mascot (`Bleepy.astro`) and the `BleepyPostWidget.astro` is now configured centrally in the [`../MegaMeal/src/config/bleepyConfig.ts`](../MegaMeal/src/config/bleepyConfig.ts:1) file.

To change the AI provider:

1.  Open the file: [`../MegaMeal/src/config/bleepyConfig.ts`](../MegaMeal/src/config/bleepyConfig.ts:1)
2.  Locate the `currentAiProvider` constant.
3.  Modify the value of this constant to either `"google"` or `"deepseek"`.

    **Example:**
    ```typescript
    // In ../MegaMeal/src/config/bleepyConfig.ts:
    export type AiProvider = "google" | "deepseek";
    export const currentAiProvider: AiProvider = "deepseek"; // Change to "google" to use Google Gemini
    ```

4.  The `bleepy-client-setup.ts` (for `Bleepy.astro`) and the inline script in `BleepyPostWidget.astro` now import and use this `currentAiProvider` constant. You no longer need to edit these files directly to change the provider. The persona string, now `cuppyPersonaString`, is also managed in `bleepyConfig.ts`.

5.  After making changes to [`bleepyConfig.ts`](../MegaMeal/src/config/bleepyConfig.ts:1), you will need to rebuild and redeploy the application, or restart the development server for the changes to take effect.

## Important Note: API Keys

Regardless of which component you are configuring, ensure that the corresponding API key for the selected AI provider is correctly set up in the Cloudflare Worker environment variables.

*   For Google Gemini, the `GEMINI_API_KEY` must be configured.
*   For Deepseek, the `DEEPSEEK_API_KEY` must be configured.

Please refer to the `README.md` file in the `my-mascot-worker-service` directory for detailed instructions on setting up these environment variables.