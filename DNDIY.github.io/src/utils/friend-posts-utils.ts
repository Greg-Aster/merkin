// src/utils/friend-posts-utils.ts
// Simple utility to get friend posts in a format compatible with PostCard.astro

import { isFriendContentEnabled, getFriendPostsAsEntries } from '../stores/friendStore';

// Check if friend content should be shown
export function shouldShowFriendContent(): boolean {
  // Only works in browser
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }
  
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated && isFriendContentEnabled();
}

// Get friend posts formatted to be compatible with PostCard.astro
export function getFormattedFriendPosts() {
  // Get raw friend posts
  const friendEntries = getFriendPostsAsEntries();
  
  // Format for PostCard.astro
  return friendEntries.map(entry => ({
    id: entry.id,
    slug: entry.slug,
    data: {
      title: entry.data.title,
      published: entry.data.published,
      updated: entry.data.updated,
      tags: entry.data.tags || [],
      category: entry.data.category || '',
      image: entry.data.image,
      description: entry.data.description,
      isFriendPost: true,
      friendName: entry.data.friendName,
      friendUrl: entry.data.friendUrl,
      friendAvatar: entry.data.friendAvatar,
      url: entry.data.sourceUrl || `/friend/${entry.slug}`
    },
    render: () => entry.render()
  }));
}