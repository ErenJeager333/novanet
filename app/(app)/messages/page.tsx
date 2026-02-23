/**
 * NovaNet – Messages Page (Server Component)
 */

import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import MessagesClient from '@/components/messages/MessagesClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Messages' };

export default async function MessagesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Fetch conversations the user is part of
  const { data: participations } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id);

  const convIds = (participations ?? []).map((p) => p.conversation_id);

  let conversations: unknown[] = [];
  if (convIds.length > 0) {
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          user:profiles(*)
        )
      `)
      .in('id', convIds)
      .order('created_at', { ascending: false });

    conversations = data ?? [];
  }

  return (
    <MessagesClient
      currentUserId={user.id}
      initialConversations={conversations as any[]}
    />
  );
}
