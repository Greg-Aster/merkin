# BleepyPostWidget Styling Documentation

This document outlines the styling approach and details for the `BleepyPostWidget.astro` component.

## Overall Styling Approach

The styling for the `BleepyPostWidget.astro` component primarily utilizes **Tailwind CSS** utility classes for layout, spacing, typography, and other visual properties. Global CSS variables, defined in `src/styles/main.css`, are used for theme-responsive colors (e.g., primary color, text color, background colors, border colors) to ensure consistency with the overall site theme.

## Main Widget Container (`#bleepy-post-widget`)

The main container that wraps the entire widget.

*   **Layout, Border, Rounding, Padding:**
    *   Tailwind CSS classes are used to define its structure, such as `p-4` for padding, `border` for a border, `rounded-lg` for rounded corners, and flex/grid utilities if applicable for internal layout.
*   **Theme-Responsive Styling:**
    *   The border color is typically applied using a global CSS variable like `border-[var(--border-color)]`.
    *   The background might inherit from the page or use a variable like `bg-[var(--surface-1)]` if a specific background distinct from the page is needed.
*   **Background Image:**
    *   The `backgroundImageUrl` prop, if provided, is applied dynamically to this container via JavaScript, setting the `background-image` CSS property.

## Mascot Visual Area (`#widget-mascot-visual-area`)

This area displays the mascot image or SVG.

*   **Sizing and Layout:**
    *   Tailwind classes like `w-full`, `h-32` (or `md:h-40` for responsive height), `mx-auto` for horizontal centering, `mb-4` for bottom margin, and `flex items-center justify-center` for centering the mascot image are used.
*   **Image/SVG Display:**
    *   Classes such as `max-w-full`, `max-h-full`, and `object-contain` ensure the mascot visual scales appropriately within the allocated space without distortion.
*   **Dynamic Mascot Classes:**
    *   If `activeMascot.cssClasses` is defined in `bleepyConfig.ts`, these classes are dynamically applied to this area to allow for mascot-specific styling.

## Chat Interface Area (`#widget-chat-interface-area`)

This container holds the chat history and chat input UI.

*   **Layout and Sizing:**
    *   Tailwind classes like `flex flex-col` are used to establish a vertical layout for its children (chat history and input).
    *   Sizing classes like `flex-grow` might be used if it's part of a larger flex container, allowing it to take available space.

## Chat History Window (`#widget-chat-history`)

Displays the conversation between the user and Bleepy.

*   **Sizing and Scrolling:**
    *   Tailwind classes like `h-64` (or a dynamic height calculation), `overflow-y-auto` for vertical scrolling, and `p-2` or `p-3` for padding are applied.
    *   Dynamic bottom padding might be applied via JavaScript to ensure the last message is not obscured by the input field, especially on mobile.
*   **Theme-Responsive Text:**
    *   The text color is set using `text-[var(--text-color)]` to adapt to the current theme.

## Chat Messages (`.widget-user-message`, `.widget-bleepy-message`)

Individual messages within the chat history.

*   **Common Styling:**
    *   **Padding:** `p-2` or `p-3`
    *   **Border Radius:** `rounded-lg`
    *   **Margin:** `mb-2` or `my-2`
    *   **Max Width:** `max-w-xs` or `max-w-sm` to prevent messages from becoming too wide.
    *   **Word Wrap:** `break-words` or `overflow-wrap-break-word` (implicitly handled by browsers, but `break-words` can be explicit).
    *   **Line Height:** `leading-snug` or `leading-normal`
    *   **Clear:** `clear-both` (if floats are used for alignment, though flexbox is more common).
    *   **Shadow:** `shadow-md` for a subtle lift.
*   **User Messages (`.widget-user-message`):**
    *   **Background:** `bg-[var(--primary)]`
    *   **Text Color:** `text-[var(--text-on-primary)]`
    *   **Alignment:** Typically `ml-auto` (margin-left: auto) or `self-end` (if in a flex container) to align to the right.
*   **Bleepy Messages (`.widget-bleepy-message`):**
    *   **Background:** `bg-[var(--surface-2)]`
    *   **Text Color:** `text-[var(--text-color)]`
    *   **Alignment:** Typically `mr-auto` (margin-right: auto) or `self-start` (if in a flex container) to align to the left.

## Sender Names (`<strong>` tags within messages)

Used to display "You" or Bleepy's name above their respective messages.

*   **Layout and Font:**
    *   `block` to take the full width.
    *   `mb-1` for a small margin below the name.
    *   `font-semibold` for bold text.
*   **Specific Text Colors:**
    *   Bleepy's name might use `text-[var(--primary)]` for emphasis, or inherit the message's text color. User's name ("You") typically inherits the message's text color.

## Chat Input UI (`#widget-chat-ui`)

The area containing the text input field and the send button.

*   **Layout and Styling:**
    *   Tailwind classes like `flex items-center p-2` (or similar padding) are used for layout.
    *   **Background:** `bg-[var(--surface-1)]`
    *   **Top Border:** `border-t border-[var(--border-color)]` to separate it from the chat history.

## Chat Input Field (`#widget-chat-input`)

The text area where the user types their message.

*   **Sizing and Appearance:**
    *   `flex-grow` to take available width, `p-2` for padding, `rounded-md` for border radius.
    *   **Background:** `bg-[var(--input-bg)]`
    *   **Text Color:** `text-[var(--text-color)]`
    *   **Border:** `border border-[var(--input-border-color)]`
    *   **Placeholder Text:** `placeholder:text-[var(--text-color-muted)]`
    *   **Focus States:** `focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent` or similar for visual feedback on focus.

## Send Button (`#widget-chat-send`)

The button to submit the user's message.

*   **Appearance and Interaction:**
    *   `p-2` or `px-4 py-2` for padding, `rounded-md` for border radius.
    *   **Background:** `bg-[var(--primary)]`
    *   **Text Color:** `text-[var(--text-on-primary)]`
    *   **Hover/Focus States:** `hover:bg-[var(--primary-dark)]` (assuming a `--primary-dark` variable exists or a Tailwind opacity/brightness utility), `focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)]`.

## Animations Import

*   **Purpose:** The line `@import './mascotAnimations.css';` (path may vary, e.g., `../components/bleepy/mascotAnimations.css` if imported from a different style block context) is typically found within a `<style is:global>` tag or a regular `<style>` tag in the Astro component.
*   **Functionality:** It imports CSS rules defined in `mascotAnimations.css`. These rules are responsible for the various animations applied to the mascot, such as idle movements, reactions to messages, or specific state changes (e.g., thinking, speaking). Using `is:global` ensures these animation keyframes and classes are available globally if needed, or they might be scoped if not global.