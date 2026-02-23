/**
 * NovaNet – Feed Page
 *
 * Supports two feed modes:
 *  - Chronological: posts ordered by creation date (anti-algorithm)
 *  - Algorithmic: posts from followed users + trending
 *
 * This is a Server Component; real-time updates are handled
 * client-side by FeedClient.
 */

import { createServerClient } from '@/lib/supabase-server';
import FeedClient from '@/components/feed/FeedClient';
import StoriesList from '@/components/stories/StoriesList';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feed',
};

export default async function FeedPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user settings to determine feed mode
  const { data: settings } = await supabase
    .from('user_settings')
    .select('feed_mode, show_likes')
    .eq('user_id', user!.id)
    .single();

  // Fetch initial posts (SSR for performance + SEO)
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles(*)
    `)
    .eq('visibility', 'public')
    .eq('is_removed', false)
    .is('expires_at', null)
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch liked post IDs for the current user
  const { data: userLikes } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', user!.id)
    .not('post_id', 'is', null);

  const likedPostIds = new Set((userLikes ?? []).map((l) => l.post_id));

  // Merge is_liked into posts
  const postsWithLikes = (posts ?? []).map((post) => ({
    ...post,
    is_liked: likedPostIds.has(post.id),
  }));

  // Fetch active stories (non-expired)
  const { data: stories } = await supabase
    .from('posts')
    .select('*, author:profiles(*)')
    .eq('post_type', 'story')
    .eq('is_removed', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6 pb-20 md:pb-4">
      {/* Stories bar */}
      <StoriesList stories={stories ?? []} currentUserId={user!.id} />

      {/* Feed */}
      <FeedClient
        initialPosts={postsWithLikes}
        currentUserId={user!.id}
        feedMode={settings?.feed_mode ?? 'chronological'}
        showLikes={settings?.show_likes ?? true}
      />
    </div>
  );
}
