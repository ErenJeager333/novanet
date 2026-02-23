import { createServerClient } from '@/lib/supabase-server';
import ReelsPageClient from '@/components/feed/ReelsPageClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Reels' };

export default async function ReelsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: reels } = await supabase
    .from('posts')
    .select('*, author:profiles(*)')
    .eq('post_type', 'reel')
    .eq('is_removed', false)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: userLikes } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', user!.id);

  const likedPostIds = new Set((userLikes ?? []).map(l => l.post_id));

  return (
    <ReelsPageClient
      reels={(reels ?? []).map(r => ({ ...r, is_liked: likedPostIds.has(r.id) }))}
      currentUserId={user!.id}
    />
  );
}