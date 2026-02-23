import { createServerClient } from '@/lib/supabase-server';
import ExploreClient from '@/components/explore/ExploreClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Explorer' };

export default async function ExplorePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <ExploreClient currentUserId={user!.id} />
  );
}