---
title: "Friend System & Content Sharing"
published: 2025-04-03
description: "Learn how to connect with other Temporal Flow creators and build a network through the decentralized Friend Content Sharing system."
image: "/posts/generic/tree.png"
avatarImage: "/posts/generic/avatar4.png"
authorName: "Temporal Flow"
authorBio: "Decentralized content sharing platform"
bannerType: "image"
bannerData:
  image: "/posts/guides/connections-banner.jpg"
timelineYear: 2025
timelineEra: "documentation"
timelineLocation: "Temporal Flow Docs"
isKeyEvent: true
showImageOnPost: false
tags: [Friend System, Content Sharing, Networking, Connections, Social]
category: "Guides"
draft: true
lang: "en"
---

# Friend System & Content Sharing

*"Connect with other creators while maintaining complete control of your platform and content."*

## Introduction to the Friend Content Sharing System

**Connect Without Compromise**

The Friend Content Sharing system is one of Temporal Flow's most powerful features, enabling you to build connections with other content creators while maintaining complete control of your platform and content.

Unlike traditional social networks that store everything on centralized servers, Temporal Flow's Friend system works directly between blogs, creating a decentralized network where you own your content and control your connections.

*Key Benefits of the Friend System:*

* 🔗 Connect with other Temporal Flow sites
* 👁️ Only you see friend content when logged in
* 🔒 Visitors to your site see only your content
* 🌐 No central server or algorithms
* 🤝 Direct connections between blogs

## How It Works: Behind the Scenes

**Technical Overview**

Before diving into the setup, let's understand how the Friend Content Sharing system works:

1. **Content Discovery File**: Each Temporal Flow site automatically generates a special file called `friend-content.json` that contains information about the blog and its recent posts.

2. **Connection Process**: When you add a friend, your site attempts to access their `friend-content.json` file to retrieve their content information.

3. **Local Storage**: Friend connections are stored as markdown files in your site's repository, giving you complete control over your connections.

4. **Private Viewing**: Friend content is only visible to you when logged in as an administrator. Regular visitors to your site see only your content.

5. **Manual Syncing**: Content from friends isn't automatically updated. You manually sync with their sites to fetch the latest posts.

> **Privacy by Design**: The Friend system is designed with privacy as the default. No information about your browsing or connections is shared with anyone, and no central server monitors the network.

## Setting Up Friend Sharing

### CORS Configuration

**Enabling Cross-Domain Connections**

For the friend system to work across different domains, you need to set up proper CORS (Cross-Origin Resource Sharing) headers:

1. **Create a headers file**
   
   Add a file named `_headers` to your repository root:
   ```
   # Set CORS headers for the friend-content.json file
   /friend-content.json
     Access-Control-Allow-Origin: *
     Access-Control-Allow-Methods: GET
     Access-Control-Allow-Headers: Content-Type
   ```

2. **Commit and deploy**
   
   Add this file to your GitHub repository and deploy your site to apply the CORS headers.

> **Important**: Without proper CORS headers, other Temporal Flow sites won't be able to access your content, and you won't be able to connect with them.

## Accessing Friend Management

**Logging In**

To access the admin features of your Temporal Flow site:

1. Look for the login link in the **top left corner** of your site's navigation bar
2. Click the login link to open the authentication dialog
3. Enter your administrator username and password
4. Click "Login" to authenticate

Upon successful login, you'll notice that the site's navigation changes slightly, with the home button transforming into a settings button, unlocking access to admin features.

**Before Login**

Navigation bar shows:
* Login link
* Home button
* Regular navigation items

**After Login**

Navigation bar shows:
* Logout link
* Settings button (replaces Home)
* Regular navigation items
* Admin indicator

## Adding Friends

**Step-by-Step Friend Addition**

1. **Navigate to the Friends page**
   
   Click on the Settings button in the navigation bar and select "Friends" from the dropdown menu.

2. **Add a new friend**
   
   On the Friends page, you'll see a form to add a new friend connection.
   
   Required information:
   * **Friend Name**: The name of the blog or site owner
   * **Site URL**: The complete URL to the friend's Temporal Flow site

3. **Click "Add Friend"**
   
   The system will validate the URL and attempt to establish a connection with the site.
   
   If successful, the site will be added to your temporary friends list, displayed below the form.

4. **Save the friend connection permanently**
   
   To make this connection permanent, click the "Save Friend" button next to the temporary friend entry.
   
   You'll be prompted to save a markdown file - this is your friend connection file.
   
   Save this file in the `content/friends/` folder of your site.

> **GitHub Integration**: If you have GitHub integration enabled in your admin panel, you can commit the friend connection file directly to your repository and deploy the changes without leaving your browser.

## Understanding Friend Connection Files

**Friend Connection Files**

When you save a friend connection, a markdown file is created with the following structure:

```markdown
---
friendName: "Example Blog"
siteUrl: "https://example-blog.com"
avatarUrl: "/friends/example-avatar.png"
bio: "A great blog about interesting topics"
addedOn: "2025-04-03"
---

# Connection to Example Blog

Added this connection on April 3, 2025. This blog focuses on technology tutorials.

## Notes

- Great resource for JavaScript content
- Updates weekly on Fridays
- Owner: Jane Smith
```

These files are stored in the `content/friends/` directory and will persist until manually deleted. Each file represents one friend connection.

You can edit these files to update information about your friend connections, such as adding notes or updating their bio.

## Managing Friend Content

**Viewing Friend Content**

Once you've added and saved friends:

1. Return to your main feed (homepage)
2. When logged in, you'll see content from your friends displayed in your feed
3. Friend content will be clearly labeled with the friend's name and site
4. You can click on friend content to view the full article

> **Important Privacy Note**: Friend content is only visible to you when logged in as an administrator. Regular visitors to your site will only see your own content.

### Friend Content Behavior

**When Logged In**
* Your content and friend content both appear in feed
* Friend content is labeled with source
* Access to friend management features
* Ability to sync with friend sites

**When Logged Out / For Visitors**
* Only your own content is displayed
* No indication of friend connections
* No access to friend management
* Standard visitor experience

## Syncing Friend Content

**Keeping Content Updated**

Friend content isn't updated automatically. To get the latest posts from your connections:

1. Navigate to the Friends page in your admin panel
2. Find the friend whose content you want to update
3. Click the "Sync" button next to their entry
4. The system will fetch the latest content from their site
5. Return to your feed to see their updated posts

> **Sync Frequency**: Consider syncing with active friends regularly to see their latest content. You can also set up a reminder or schedule to check for updates from your favorite connections.

## Removing Friend Connections

**Managing Connections**

If you need to remove a friend connection:

1. **Navigate to the Friends page** in your admin panel

2. **Method 1: Using the admin interface**
   * Find the friend you want to remove
   * Click the "Remove" button next to their entry
   * Confirm the deletion when prompted
   * Commit the changes to your repository

3. **Method 2: Manual file deletion**
   * Locate the friend's markdown file in the `content/friends/` directory
   * Delete the file from your repository
   * Commit and deploy the changes

After removing a friend connection, their content will no longer appear in your feed, and the connection will be completely removed from your site.

## Advanced Friend Management

**Advanced Features**

**Friend Categories**

You can organize friends into categories by adding a category field to their connection files:

```yaml
---
friendName: "Example Blog"
siteUrl: "https://example-blog.com"
category: "Tech Blogs"
---
```

This allows you to filter and organize friends by interest, topic, or relationship.

**Content Filters**

You can set up filters to customize which content you see from friends:

```yaml
---
friendName: "Example Blog"
siteUrl: "https://example-blog.com"
includeTags: ["JavaScript", "Tutorial"]
excludeTags: ["News", "Personal"]
---
```

This helps you focus on the content you're most interested in from each friend.

**Custom Notes**

Add personal notes about each friend in the markdown body of their connection file:

```markdown
# Connection to Example Blog

Met at the 2025 Developer Conference. 
Specializes in:
- Frontend development
- CSS animations
- Web accessibility
```

These notes are private and only visible to you in the admin interface.

**Sync Priorities**

Set priority levels for friends to help manage sync frequency:

```yaml
---
friendName: "Example Blog"
siteUrl: "https://example-blog.com"
priority: "high"
syncFrequency: "daily"
---
```

This helps you remember which connections to check more frequently.

## Content Interaction

**Interacting with Friend Content**

When viewing friend content in your feed, you have several ways to interact with it:

**Viewing Full Content**

Click on any friend post to view the full content. You'll be shown the complete article right in your admin interface, with proper attribution to the original source.

**Visiting Original Source**

Each friend post includes a link to the original article on their site. Click "View Original" to open the post on their Temporal Flow site in a new tab.

**Bookmarking**

You can bookmark friend content for easy access later. Bookmarked posts are saved to your local browser storage and remain accessible even if the original content changes.

**Content Notes**

Add private notes to friend content for your own reference. These notes are only visible to you and are stored in your local browser storage.

> **Content Respect**: While you can view and interact with friend content in your private feed, remember that the content belongs to its original creator. Respect their ownership by properly attributing any content you reference or share.

## Building Your Network

**Growing Your Connections**

Here are some strategies for building your Temporal Flow network:

**Finding Others**
* Join the Temporal Flow community forum
* Participate in related online communities
* Search for Temporal Flow sites on social media
* Network at relevant events and conferences

**Making Yourself Discoverable**
* Add a "Connect with me" section to your site
* Share your Temporal Flow URL in your online profiles
* Mention your site in related communities
* List your site in Temporal Flow directories

**Quality Over Quantity**
* Focus on meaningful connections
* Connect with sites that share your interests
* Prioritize active sites that update regularly
* Build relationships, not just technical connections

**Network Maintenance**
* Regularly sync with active connections
* Remove outdated or inactive connections
* Update friend information as needed
* Organize connections into meaningful categories

*Tips for Growing Your Connections:*

1. Share your Temporal Flow site URL with other content creators
2. Join the Temporal Flow community forums to find like-minded bloggers
3. Add a "Connect with me" link on your site to encourage other Temporal Flow users to add you
4. Focus on quality connections relevant to your content rather than quantity
5. Create content that encourages others to connect with your site

## Troubleshooting

**Common Connection Issues**

**Can't connect to friend site?**
* Verify the site is a Temporal Flow site
* Check that the URL is correct and includes the protocol (https://)
* Ensure the site has the proper CORS headers configured
* Confirm the site is accessible (not down for maintenance)

**Friend content not appearing?**
* Make sure you're logged in as an administrator
* Try syncing the content manually from the Friends page
* Check that the friend has published content recently
* Verify the friend connection file is in the correct location

**Connection fails with CORS error?**
* Ask the friend to check their CORS configuration
* Verify they have the proper `_headers` file in place
* Ensure their site is properly deployed with the CORS settings
* Try connecting with a different Temporal Flow site to test your setup

## Privacy Considerations

**Understanding Privacy**

The Friend Content Sharing system is designed with privacy in mind:

* Your visitors never see your friend connections or their content
* Friend connections are always one-way (adding a friend doesn't give them access to your content)
* Friend data is stored locally in your site files
* No personal data beyond what's publicly available is shared
* You control exactly which sites you connect with
* Your reading habits and preferences remain private

> **Control & Ownership**: Remember that you maintain complete control over your connections and can remove them at any time. Your content remains yours, and your site remains independent.

## Future of Friend Content Sharing

**Upcoming Features**

The Temporal Flow team is actively developing enhancements to the Friend Content Sharing system:

**Enhanced Discovery**

Improved tools for discovering new Temporal Flow sites based on your interests and existing connections, while maintaining privacy and decentralization.

**Automatic Syncing**

Optional background syncing to keep your friend content fresh without manual intervention, with customizable frequency and notification settings.

**Advanced Filtering**

More sophisticated content filtering options based on keywords, categories, and engagement patterns to help you focus on the most relevant content.

**ActivityPub Support**

Integration with the ActivityPub protocol to enable connections with Fediverse platforms like Mastodon, expanding the decentralized network beyond Temporal Flow.

## Conclusion

The Friend Content Sharing system transforms Temporal Flow from a standalone blog into a hub for connected content while maintaining your privacy and control. By building connections with other content creators, you create a personalized feed of content that's relevant to your interests and only visible to you.

As more Temporal Flow sites join the network, the value of this decentralized approach to content sharing will continue to grow, offering an alternative to centralized social platforms that puts creators in control.

---

*Have questions about Friend Content Sharing? Join the Temporal Flow community forum to connect with other users and get help from experienced members.*
