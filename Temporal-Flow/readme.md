# Temporal Flow

<p align="center">
  <img src="https://temporalflow/public/posts/generic/avatar.png" alt="Temporal Flow Logo" width="150" height="150">
</p>

<p align="center">
  A decentralized content sharing platform built with Astro, Svelte and Tailwind CSS
</p>

<p align="center">
  <a href="https://temporalflow.org">Live Demo</a>
</p>

Temporal Flow is a decentralized content sharing platform designed for creators. It's an all-in-one hub for hosting and sharing creative content in a central location while making it easy to discover and connect with other creators.

Unlike traditional platforms that control your content on centralized servers, Temporal Flow gives you full ownership of your work with the benefits of a connected community.


# Installation Guide

This guide will help you set up your site using this template and deploy it to GitHub Pages.

## Quick Start

<div align="center">

| Step | Instructions | Reference |
|:---:|---|:---:|
| **1** | **Create from Template** <br> Click "Use this template" → "Create a new repository" → Name it → Click "Create repository" | [<img src="https://img.shields.io/badge/View_Image-Repository_Setup-2ea44f" alt="View Template Setup Image">](public/assets/installpng/repository.png) <br> [<img src="https://img.shields.io/badge/View_Image-Create_Repository-2ea44f" alt="View Create Repository Image">](public/assets/installpng/use-template.png) |
| **2** | **Enable GitHub Pages** <br> Go to repository **Settings** → **Pages** → Under **Build and deployment** > **Source**, select **GitHub Actions** <br><br> *Note: You will NOT need to select between Jekyll or static HTML when using GitHub Actions.* | [<img src="https://img.shields.io/badge/View_Image-Settings_Tab-2ea44f" alt="View Settings Tab Image">](public/assets/installpng/settings.png) <br> [<img src="https://img.shields.io/badge/View_Image-Pages_Settings-2ea44f" alt="View Pages Settings Image">](public/assets/installpng/not-jekyll.png) |
| **3** | **Deploy Your Site** <br> Go to the **Actions** tab → Click on the workflow run → Click **Re-run all jobs** to trigger a deployment <br><br> Your site will be live at: `https://[username].github.io/[repository-name]/` | [<img src="https://img.shields.io/badge/View_Image-Deployment_Actions-2ea44f" alt="View Actions Tab Image">](public/assets/installpng/deploy.png) |
| **4** | **Access Your Site** <br> After successful deployment, go to **Settings** > **Pages** → Find the green banner at the top with your site URL <br><br> Alternatively, click "Environments" on your repository home page, then "github-pages" to find your deployment URL. | [<img src="https://img.shields.io/badge/View_Image-Deployment_Actions-2ea44f" alt="Website Live Url">](public/assets/installpng/live.png) |

</div>

## Troubleshooting

If you're experiencing issues with your deployment:

- ✅ **Verify deployment completion**: Ensure your first deployment has fully completed
- 🔄 **Check repository name**: Confirm your repository name matches the URL path exactly
- 🌐 **Browser cache**: Try clearing your browser cache or opening in an incognito window
- 🔍 **Path issues**: If encountering 404 errors or missing assets, check relative paths in your code

## Custom Domain Setup

For setting up a custom domain, please refer to [GitHub's official documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Important Configuration Notes
When deploying to GitHub Pages, your site will be available at <code>https://[username].github.io/[repository-name]/</code>. The template should automatically configure the correct base path during deployment.

If you're having path-related issues (404 errors, missing styles/images):
1. Ensure your site's first deployment has completed successfully
2. Check that your repository name exactly matches the URL path
3. Try clearing your browser cache or opening in an incognito window
4. For custom domain setup, see [GitHub's documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

# Roadmap

Temporal Flow is under active development. Here's what we're working on:

## Coming Soon
- Enhanced media management in admin panel
- Post editor in the admin panel
- Extended banner animation options
- Enhanced friend content discovery

## Future Plans
- Multi-user support with permission levels
- Enhanced analytics integration
- Comment system options
- ActivityPub protocol support for Fediverse integration

# Contributing

Contributions to Temporal Flow are welcome! Here's how you can contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the project's style guidelines and includes appropriate tests.

# License

This project is licensed under the CC BY-NC-SA 4.0 License - see the [LICENSE](https://creativecommons.org/licenses/by-nc-sa/4.0/) file for details.

# Acknowledgments

- Built with [Astro](https://astro.build)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- Interactive components powered by [Svelte](https://svelte.dev)
- Admin panel inspired by modern CMS systems

---

<p align="center">
  Made with ❤️ by the Temporal Flow community
</p>