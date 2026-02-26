# Styling Documentation for BleepyBanner.astro

This document details the styling applied to the `BleepyBanner.astro` component. Styling primarily utilizes Tailwind CSS utility classes and global CSS variables defined in `src/styles/main.css`.

## Overall Styling Approach

The component's styling is achieved through a combination of:

*   **Tailwind CSS Utility Classes:** For most layout, spacing, typography, and visual properties.
*   **Global CSS Variables:** Sourced from [`src/styles/main.css`](src/styles/main.css:0) to ensure theme consistency (e.g., `var(--primary)`, `var(--text-color)`).
*   **Custom CSS:** A minimal amount of custom CSS is used for specific effects like `box-shadow` replication and importing animations.

## Main Container (`#mascot-container.is-banner-feature`)

The main container wraps the entire banner content.

*   **Layout & Spacing (Tailwind):**
    *   `flex`: Enables flexbox layout.
    *   `gap-4`: Sets a gap of 1rem between flex items.
    *   `p-4` or `p-6`: Applies padding around the container.
    *   `items-stretch`: Stretches flex items to fill the container's cross-axis.
*   **`.card-base` Equivalent Styling (Tailwind):**
    *   `bg-opacity-50`: Sets the background opacity to 50%.
    *   `dark:bg-opacity-50`: Sets background opacity to 50% in dark mode.
    *   `bg-[var(--surface-1)]`: Sets the background color using a global CSS variable.
    *   `rounded-lg`: Applies large rounded corners.
    *   `overflow-hidden`: Clips content that overflows the rounded corners.
    *   `transition-all duration-300 ease-in-out`: Smooth transition for property changes.
    *   `backdrop-blur-sm`: Applies a small backdrop blur effect.
*   **Custom CSS Class (`.banner-card-style`):**
    *   This class (if implemented and approved) replicates the `box-shadow` from the `.card-base` style found in [`src/styles/main.css`](src/styles/main.css:0). This is typically `0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)`.
*   **Background Image:**
    *   The `backgroundImageUrl` prop is applied dynamically to this container via JavaScript, setting its `background-image` style.

## Mascot Visual Area (`#mascot-visual-area`)

This area displays the mascot image or SVG.

*   **Layout & Sizing (Tailwind):**
    *   `flex-none`: Prevents the item from growing or shrinking in the flex layout.
    *   `md:w-1/3 lg:w-1/4`: Sets responsive width (1/3 on medium screens, 1/4 on large screens).
    *   `flex items-center justify-center`: Centers the mascot image within this area.
*   **Image/SVG Display (Tailwind):**
    *   `max-w-full`: Ensures the image does not exceed the width of its container.
    *   `max-h-full`: Ensures the image does not exceed the height of its container.
    *   `object-contain`: Scales the image to fit within its container while maintaining aspect ratio.

## Chat Interface Area (`#chat-interface-area`)

This area contains the chat history and input field.

*   **Layout & Sizing (Tailwind):**
    *   `flex-grow`: Allows this area to take up available space in the flex container.
    *   `flex flex-col`: Arranges its children (chat history, input) in a column.
    *   `min-h-[300px]` or similar: Sets a minimum height for the chat interface.

## Chat History Window (`#chat-history-window`)

Displays the conversation messages.

*   **Sizing & Scrolling (Tailwind):**
    *   `flex-grow`: Allows the history window to expand and fill available vertical space.
    *   `overflow-y-auto`: Enables vertical scrolling if content exceeds the height.
    *   `h-64` or similar: Sets a fixed or minimum height.
*   **Padding (Tailwind):**
    *   `p-2` or `p-4`: Applies padding inside the window.
    *   `pb-16` or similar dynamic padding: Ensures content at the bottom is not obscured by the chat input area, often adjusted via JavaScript.
*   **Text Color (Tailwind):**
    *   `text-[var(--text-color)]`: Uses a global CSS variable for theme-responsive text color.

## Chat Messages (`.chat-message`, `.user-message`, `.bleepy-message`)

Styling for individual messages within the chat history.

*   **Common Styling (Tailwind):**
    *   `p-2` or `px-3 py-2`: Padding within each message bubble.
    *   `rounded-lg`: Rounded corners for message bubbles.
    *   `mb-2`: Margin below each message.
    *   `max-w-[80%]` or `max-w-xs/sm/md`: Limits the maximum width of messages.
    *   `break-words`: Allows long words to break and wrap.
    *   `leading-snug`: Sets a comfortable line height.
    *   `clear-both`: Ensures messages don't overlap due to floats.
    *   `shadow-sm`: Applies a small box shadow.
*   **User Messages (`.user-message`) (Tailwind):**
    *   `bg-[var(--primary)]`: Background color using the primary theme color.
    *   `text-[var(--text-on-primary)]`: Text color suitable for display on the primary background.
    *   `float-right`: Aligns the message to the right.
    *   `ml-auto`: Pushes the message to the right in a flex or grid container.
    *   `text-left`: Ensures text within the bubble is left-aligned.
*   **Bleepy Messages (`.bleepy-message`) (Tailwind):**
    *   `bg-[var(--surface-2)]`: Background color using a secondary surface color.
    *   `text-[var(--text-color)]`: Standard text color.
    *   `float-left`: Aligns the message to the left.
    *   `mr-auto`: Pushes the message to the left in a flex or grid container.
    *   `text-left`: Ensures text within the bubble is left-aligned.

## Sender Names (`.chat-message strong`)

Styling for the "You" or "Bleepy" labels above messages.

*   **Common Styling (Tailwind):**
    *   `block`: Makes the `<strong>` element a block-level element.
    *   `mb-1`: Adds a small margin below the name.
    *   `font-semibold`: Makes the text bold.
*   **Bleepy's Name (`.bleepy-message strong`) Specific Styling (Tailwind):**
    *   `text-[var(--primary)]`: Sets the text color to the primary theme color.

## Chat Input UI (`#mascot-chat-ui`)

The area containing the text input field and send button.

*   **Positioning & Layout (Tailwind):**
    *   `relative` or `absolute bottom-0 left-0 right-0`: Positions the UI at the bottom of its container.
    *   `flex items-center gap-2`: Arranges input field and button in a row with a gap and aligns them vertically.
    *   `p-2` or `p-4`: Padding around the input elements.
*   **Background & Border (Tailwind):**
    *   `bg-[var(--surface-1)]`: Background color using a surface theme color.
    *   `border-t border-[var(--border-color)]`: Adds a top border using the theme's border color.

## Chat Input Field (`#mascot-chat-input`)

The text field where users type their messages.

*   **Sizing & Appearance (Tailwind):**
    *   `flex-grow`: Allows the input field to take up available horizontal space.
    *   `p-2` or `px-3 py-2`: Padding inside the input field.
    *   `rounded-md`: Medium rounded corners.
    *   `bg-[var(--input-bg)]`: Background color for the input field.
    *   `text-[var(--text-color)]`: Text color for typed input.
    *   `border border-[var(--input-border-color)]`: Adds a border with a specific input border color.
    *   `placeholder:text-[var(--text-color-muted)]`: Styles the placeholder text color.
*   **Focus States (Tailwind):**
    *   `focus:outline-none`: Removes the default browser focus outline.
    *   `focus:ring-2 focus:ring-[var(--primary)]`: Adds a ring effect using the primary color on focus.
    *   `focus:border-transparent` or `focus:border-[var(--primary)]`: Adjusts border on focus.

## Send Button (`#mascot-chat-send`)

The button to submit the chat message.

*   **Appearance & Spacing (Tailwind):**
    *   `p-2` or `px-4 py-2`: Padding inside the button.
    *   `rounded-md`: Medium rounded corners.
    *   `bg-[var(--primary)]`: Background color using the primary theme color.
    *   `text-[var(--text-on-primary)]`: Text color suitable for the primary background.
*   **Hover/Focus States (Tailwind):**
    *   `hover:bg-[var(--primary-dark)]` or similar: Darkens the background on hover (assuming `--primary-dark` variable exists).
    *   `focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)]`: Custom focus styling.

## Animations Import

The line `@import '../bleepy/mascotAnimations.css';` within the `<style is:global>` tag in [`BleepyBanner.astro`](src/components/bleepy/BleepyBanner.astro:0) is used to:

*   Import external CSS rules defined in [`mascotAnimations.css`](src/components/bleepy/mascotAnimations.css:0).
*   These imported styles typically define keyframe animations and associated classes used for the mascot's dynamic behaviors (e.g., idle animations, reactions).
*   The `is:global` directive ensures these styles are applied globally and not scoped to the component, which is necessary for animations that might be triggered by JavaScript adding/removing classes on elements.