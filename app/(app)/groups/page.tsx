/**
 * NovaNet – Groups Page
 */

import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import GroupsClient from '@/components/groups/GroupsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Groups' };

export default async function GroupsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Fetch public groups
  const { data: groups } = await supabase
    .from('groups')
    .select('*, creator:profiles(*)')
    .eq('visibility', 'public')
    .order('members_count', { ascending: false })
    .limit(30);

  // Fetch groups user is member of
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id);

  const memberGroupIds = new Set((memberships ?? []).map((m) => m.group_id));

  return (
    <GroupsClient
      groups={(groups ?? []).map((g) => ({
        ...g,
        is_member: memberGroupIds.has(g.id),
      }))}
      currentUserId={user.id}
    />
  );
}
