/**
 * NovaNet – Notifications Page
 */

import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import NotificationsClient from '@/components/notifications/NotificationsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*, sender:profiles!sender_id(*)')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <NotificationsClient
      notifications={notifications ?? []}
      currentUserId={user.id}
    />
  );
}
