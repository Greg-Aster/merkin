---
title: "Creating Content with Temporal Flow"
published: 2025-04-03
description: "Learn how to create and publish engaging content on your Temporal Flow site with this comprehensive guide to post creation."
image: "/posts/generic/0008.png"
avatarImage: "/posts/generic/avatar2.png"
authorName: "Temporal Flow"
authorBio: "Decentralized content sharing platform"
bannerType: "image"
bannerData:
  image: "/posts/guides/content-creation-banner.jpg"
timelineYear: 2025
timelineEra: "documentation"
timelineLocation: "Temporal Flow Docs"
isKeyEvent: true
showImageOnPost: true
tags: [Content Creation, Posts, Markdown, MDX, Publishing]
category: "Guides"
draft: true
lang: "en"
---

# Creating Content with Temporal Flow

*"Content is the heart of your Temporal Flow site - here's how to make it shine."*

## Content Creation Overview

**The Basics**

Temporal Flow uses a content-first approach where your posts are simply text files stored in a specific folder. The platform automatically processes these files and displays them on your site without any manual publishing steps.

All posts are written in either Markdown (.md) or MDX (.mdx) format, giving you powerful formatting options while keeping the content creation process simple and focused.

## Two Ways to Create Content

**Choose Your Workflow**

Temporal Flow offers two approaches to content creation:

**Admin Panel Approach**

Create and manage posts directly through the browser-based admin interface with GitHub integration for easy publishing. Perfect for creators who prefer a visual interface.

**Developer Approach**

Create markdown files directly in your code editor and manage them through traditional git workflows. Ideal for developers and those who prefer working with text files.

## Method 1: Creating Posts with the Admin Panel

**Using the Browser-Based Admin**

The admin panel provides a convenient interface for creating posts without having to directly edit files:

1. **Access the admin panel** by navigating to your site's `/admin` path and logging in
2. **Navigate to the Content tab** and click "Create New Post"
3. **Fill in the metadata form** with title, description, publication date, etc.
4. **Write your content** using the Markdown editor
5. **Preview your post** to see how it will look on your site
6. **Save and commit** directly to your GitHub repository
7. **Trigger a deployment** to publish your changes

> **GitHub Integration Advantage**: With GitHub integration enabled, your post will be automatically committed to your repository when you save it, and you can trigger a rebuild directly from the admin panel to publish it.

## Method 2: Creating Posts with File Editing

### Step 1: Create Your File

**File Creation**

Start by creating a new text file in the `content/posts/` directory of your Temporal Flow installation. You can organize files in subdirectories if you wish.

```
content/posts/my-first-post.mdx
```

You can use either the .md extension for standard Markdown or .mdx if you want to include React/Svelte components in your content.

### Step 2: Add Frontmatter

Every post begins with "frontmatter" - a YAML section at the top of the file that defines metadata about your post. This is enclosed between triple dashes `---`.

**Required Frontmatter**

At minimum, you need to include:

```yaml
---
title: "My First Post"
published: 2025-04-03
description: "A brief description of what this post is about."
---
```

The `title` will be displayed as the main heading, `published` is the publication date (YYYY-MM-DD format), and `description` is used for SEO and preview snippets.

**Optional Frontmatter**

For more control, you can add these optional fields:

```yaml
---
# Basic metadata
image: "/posts/my-post/feature.jpg"  # Featured image
tags: [Tutorial, Guides, Beginners]   # Related topics
category: "Documentation"             # Primary category
draft: false                          # Set to true to hide from production
lang: "en"                            # Content language

# Custom author (override site defaults)
avatarImage: "/authors/my-avatar.png"
authorName: "Your Name"
authorBio: "Brief author description"

# Banner configuration options
bannerType: "image"                   # "image", "video", or "timeline"
bannerData:
  image: "/posts/banners/my-banner.jpg"

# Timeline integration (if your post is also a timeline event)
timelineYear: 2025
timelineEra: "documentation"
timelineLocation: "Temporal Flow"
isKeyEvent: false                     # Highlight as a key event?
---
```

### Step 3: Write Your Content

After the frontmatter, add your post content using Markdown syntax:

**Markdown Formatting**

**Markdown Code:**
```markdown
# Main Heading

## Secondary Heading

Normal paragraph text with **bold** and *italic* formatting.

- List item one
- List item two
- List item three

[Link text](https://example.com)

![Image alt text](/path/to/image.jpg)

> Blockquote text for important notes
```

**Rendered Result:**
- A top-level heading "Main Heading"
- A second-level heading "Secondary Heading"
- Normal paragraph text with bold and italic formatting
- A bulleted list with three items
- A link to example.com
- An image with alt text
- A blockquote for important notes

### Advanced Markdown Features

**Extended Syntax**

Temporal Flow supports these advanced Markdown features:

**Code Blocks with Syntax Highlighting**
```javascript
function greet(name) {
  return "Hello, " + name + "!";
}

console.log(greet("World"));
```

**Tables**
```
| Name  | Age | Role     |
|-------|-----|----------|
| Alice | 28  | Designer |
| Bob   | 34  | Engineer |
| Carol | 42  | Manager  |
```

**Task Lists**
```
- [x] Completed task
- [ ] Incomplete task
- [ ] Another task
```

**Footnotes**
```
Here's a statement with a footnote.[^1]

[^1]: This is the footnote content.
```

### MDX Enhanced Features

**MDX Components**

When using .mdx files, you can include special Temporal Flow components.

These components enhance your content with interactive elements:

* **Card containers**: Create styled boxes for content grouping
* **Alert components**: Display important notices or warnings
* **Tab Groups**: Organize content in tabbed interfaces
* **Collapsible sections**: Create expandable content blocks

These components are automatically available in .mdx files without needing to import them first.

**Styling in MDX**

You can use Tailwind CSS classes directly in your MDX content to style elements. This gives you precise control over your content's appearance.

Common styling options include:

* **Text colors**: Apply brand colors or create contrast
* **Background colors**: Create colored sections or highlights
* **Spacing and padding**: Control whitespace around content
* **Rounded corners**: Create card-like components
* **Responsive layouts**: Apply different styles at different screen sizes

## Step 4: Publishing Your Post

**Publishing Workflow**

**Admin Panel Publishing**
1. Click "Save" to store your post
2. Click "Commit to GitHub" to push changes to your repository
3. Click "Deploy Changes" to trigger a site rebuild
4. Wait for the deployment to complete (usually 1-2 minutes)
5. Your post is now live on your site

**Developer Workflow Publishing**
1. Save your file in the `content/posts/` directory
2. Add the file to git: `git add .`
3. Commit your changes: `git commit -m "Add new post"`
4. Push to GitHub: `git push`
5. Wait for CI/CD to rebuild your site (if configured)

## Working with Images

**Image Handling in Posts**

Temporal Flow offers several ways to include images in your posts:

**Featured Images**

Include a featured image in your post's frontmatter:
```yaml
image: "/posts/my-post/featured-image.jpg"
```

**Inline Images**

Add images directly in your Markdown content:
```markdown
![Alt text for the image](/posts/my-post/image.jpg)
```

**Image Components**

For MDX files, you can use image components for more control.

> **Image Optimization**: Temporal Flow automatically optimizes your images, creating responsive versions and converting them to modern formats like WebP for better performance.

## Using Banner Types

**Post Banner Options**

Customize how your post appears with different banner types:

**Image Banner**

Display a featured image at the top of your post.

**Video Banner**

Embed a YouTube video as your post header.

**Timeline Banner**

Show an interactive timeline related to your post content.

## Organizing Your Content

**Content Organization**

**Categories**

Assign a primary category to your post in the frontmatter:
```yaml
category: "Tutorials"
```

Categories are used for primary classification and navigation.

**Tags**

Add multiple tags to help with content discovery:
```yaml
tags: [JavaScript, Web Development, Tutorial]
```

Tags provide more granular classification and cross-referencing.

**Series**

Group related posts into a series:
```yaml
series: "JavaScript Fundamentals"
seriesPart: 2
```

Series help readers navigate through multi-part content.

**Directory Structure**

Organize files in subdirectories for better management:
```
content/posts/tutorials/javascript/
content/posts/reviews/
content/posts/news/
```

Subdirectories help organize the file system but don't affect URLs.

## Timeline Integration

**Adding Posts to the Timeline**

To make your post appear on the interactive timeline, add these fields to your frontmatter:

```yaml
timelineYear: 2025              # The year for timeline placement
timelineEra: "documentation"    # The era classification 
timelineLocation: "GitHub"      # Location for map view
isKeyEvent: true                # Highlight as a key event
```

With these properties, your post will automatically appear as an event in your site's timeline visualization, creating connections between related content based on chronology.

## Draft Mode

**Working with Drafts**

To keep a post in draft mode (hidden from production but visible in development):

```yaml
draft: true
```

In development mode, you'll see a clear "DRAFT" indicator on draft posts. When you're ready to publish, simply change this to `draft: false` or remove the property entirely.

## Post Management

**Managing Existing Posts**

**Updating Content**
1. Navigate to the post in the admin panel or find the file in your repository
2. Make your changes to the content or metadata
3. Save the changes and deploy as with a new post
4. Consider adding an "Updated: YYYY-MM-DD" note for significant updates

**Unpublishing Posts**
1. To temporarily unpublish: Set `draft: true` in frontmatter
2. To permanently remove: Delete the file from your repository
3. To archive: Move to an `archived` folder and set `draft: true`

## Troubleshooting

**Common Content Issues**

**Post not appearing?**
* Check that the file is in the correct location (`content/posts/`)
* Verify your frontmatter has the required fields (title, published, description)
* Make sure `draft: true` isn't set if you want it published
* Rebuild your site if you're in production

**Formatting issues?**
* Check your Markdown syntax for errors
* Ensure proper spacing after headings and between paragraphs
* Make sure your frontmatter YAML is properly formatted

**Images not loading?**
* Verify the image path is correct (should be relative to `public/`)
* Check that the image file exists in the specified location
* Ensure the image format is supported (.jpg, .png, .webp, .svg)

## Best Practices

**Content Creation Tips**

**Structure**
* Use headings hierarchically (h1 → h2 → h3)
* Keep paragraphs focused and concise
* Include a clear introduction and conclusion
* Use lists and tables for structured information

**Media**
* Optimize images before uploading (compress, appropriate size)
* Always include descriptive alt text for accessibility
* Consider the mobile experience when placing large media
* Use a consistent style for images across posts

**Metadata**
* Write compelling, accurate descriptions
* Choose relevant tags that aid discovery
* Select appropriate featured images
* Use consistent categories across your site

**Readability**
* Break up long content with subheadings
* Use formatting to highlight important points
* Consider adding a table of contents for long posts
* Preview your content on both desktop and mobile

## Next Steps

Now that you understand how to create and publish content on Temporal Flow, explore these advanced features:

1. **Connect with other creators** using the Friend Content Sharing system
2. **Create a dedicated timeline** to visualize your chronological content
3. **Customize your author profile** to personalize your posts
4. **Experiment with different banner types** for visual variety
5. **Set up content series** for multi-part articles

Happy creating!

---

*If you have questions about content creation, check out our community forum where you can connect with other Temporal Flow users.*
