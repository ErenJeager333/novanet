import { createServerClient } from '@/lib/supabase-server';
import StoriesPageClient from '@/components/stories/StoriesPageClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Stories' };

export default async function StoriesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: stories } = await supabase
    .from('posts')
    .select('*, author:profiles(*)')
    .eq('post_type', 'story')
    .eq('is_removed', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <StoriesPageClient
      stories={stories ?? []}
      currentUserId={user!.id}
    />
  );
}