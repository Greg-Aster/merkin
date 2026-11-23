---
title: "Installing Temporal Flow"
published: 2025-04-03
description: "A step-by-step guide to setting up your own Temporal Flow website on GitHub Pages."
image: "/posts/generic/sunset.png"
avatarImage: "/posts/generic/avatar2.png"
authorName: "Temporal Flow"
authorBio: "Decentralized content sharing platform"
bannerType: "image"
bannerData:
  image: "/posts/guides/installation-banner.jpg"
timelineYear: 2025
timelineEra: "documentation"
timelineLocation: "Temporal Flow Docs"
isKeyEvent: true
showImageOnPost: false
tags: [Installation, Setup, GitHub Pages, Getting Started]
category: "Guides"
draft: true
lang: "en"
---

[Temporal Flow Starter Template](https://github.com/dndiy/Temporal-Flow) 

# Installing Temporal Flow

*"Your journey to decentralized content sharing begins with a simple setup." — Temporal Flow*

## Prerequisites

**Before You Begin**

Make sure you have the following ready:

* A GitHub account (free)
* Basic knowledge of Git (helpful but not required)
* Node.js installed (if using local development)
* PNPM package manager (recommended)

## Installation Methods

Temporal Flow offers two primary installation methods:

**Quick Setup (Recommended)**

Use our template repository to get started in minutes with minimal technical knowledge required.

**Developer Setup**

Clone the repository and customize locally for more control and advanced configurations.

## Method 1: Quick Setup

**Using the Template Repository**

1. **Create your repository**
   
   Go to the [Temporal Flow Starter Template](https://github.com/dndiy/Temporal-Flow) and click "Use this template" to create your own copy.

2. **Name your repository**
   
   For GitHub Pages, name your repository `username.github.io` (replace "username" with your GitHub username) for the main site, or any name for a project site.

3. **Configure GitHub Pages**
   
   In your new repository, go to Settings → Pages and set the source to "GitHub Actions".

4. **Wait for deployment**
   
   GitHub will automatically build and deploy your site (this may take a few minutes for the first build).

5. **Access your site**
   
   Once deployed, your site will be available at `https://username.github.io` or your custom domain if configured.

> **Quick Tip**: The starter template comes with sample content to help you get started. You can edit or delete these files directly from GitHub's web interface.

## Method 2: Developer Setup

**Local Development Setup**

1. **Clone the repository**
   
   Open your terminal and run:
   ```
   git clone https://github.com/temporal-flow/temporal-flow.git
   cd temporal-flow
   ```

2. **Install dependencies**
   
   Install the required packages:
   ```
   pnpm install
   ```

3. **Start development server**
   
   Run the local development server:
   ```
   pnpm run astro dev
   ```
   
   Your site will be available at `http://localhost:4321`

4. **Build for production**
   
   When ready to deploy:
   ```
   pnpm build
   ```

5. **Deploy to GitHub Pages**
   
   Push your changes to GitHub and configure GitHub Pages as in Method 1.

## Setting Up GitHub Integration

**Connect the Admin Panel to GitHub**

To enable the full admin experience with GitHub integration:

1. **Create a GitHub Personal Access Token**
   
   Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
   
   Create a new token with access to your repository.

2. **Access your admin panel**
   
   Navigate to your site's `/admin` path and log in with the default password (found in your repository's README).

3. **Connect to GitHub**
   
   In the admin panel, navigate to any configuration tab and find the GitHub Integration section.
   
   Enter your repository details and personal access token.

4. **Test the connection**
   
   Make a small configuration change and commit it to GitHub to ensure everything is working properly.

> **Security Note**: Your GitHub token is stored securely in your browser's localStorage and is never sent to any server other than GitHub's API.

## Enabling Friend Content Sharing

**CORS Setup for Friend Sharing**

For cross-domain friend connections to work, you need to set up proper CORS headers:

1. **Create a `_headers` file**
   
   Add a file named `_headers` in your repository's root with the following content:
   ```
   # Set CORS headers for the friend-content.json file
   /friend-content.json
     Access-Control-Allow-Origin: *
     Access-Control-Allow-Methods: GET
     Access-Control-Allow-Headers: Content-Type
   ```

2. **Commit and push the file**
   
   Add this file to your repository to enable cross-domain connections.

## Custom Domain Setup

**Using Your Own Domain**

1. **Add a CNAME file**
   
   Create a file named `CNAME` in your repository with your domain name:
   ```
   yourdomain.com
   ```

2. **Configure DNS settings**
   
   At your domain registrar, add:
   * An A record pointing to `185.199.108.153` (GitHub's IP)
   * A CNAME record for www pointing to `username.github.io`

3. **Enable HTTPS**
   
   In your repository settings, under Pages, check "Enforce HTTPS".

## Verifying Your Installation

**Final Checklist**

Ensure everything is working properly:

* Visit your site to confirm it's loading correctly
* Test the admin panel by logging in at `/admin`
* Verify GitHub integration by making a small change
* Check that light/dark mode switching works properly
* Test the responsive design on mobile devices
* Confirm search functionality is working

## Troubleshooting

**Common Issues**

**Site not deploying?**
* Check your repository's Actions tab to see if the workflow is running
* Verify that GitHub Pages is enabled and set to deploy from GitHub Actions
* Make sure your repository is public or that you have GitHub Pro for private repositories

**Admin panel not working?**
* Ensure you're using the correct password
* Try clearing your browser cache and cookies
* Check that JavaScript is enabled in your browser

**GitHub integration issues?**
* Verify your personal access token has the required permissions
* Ensure the token hasn't expired
* Check the repository name and owner are entered correctly

## Next Steps

Now that you have Temporal Flow installed and running, here are some recommended next steps:

1. **Customize your site** using the admin panel
2. **Create your first post** to populate your blog
3. **Set up your author profile** with custom avatar and bio
4. **Connect with other Temporal Flow users** through the Friend Content Sharing system
5. **Explore the timeline feature** for chronological content organization

Check out our other guides for detailed instructions on each of these steps!

---

*If you need help with installation, join our community Discord server or open an issue on GitHub.*
