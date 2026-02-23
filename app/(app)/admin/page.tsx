import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import AdminClient from '@/components/admin/AdminClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin Panel' };

export default async function AdminPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/feed');

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: reports } = await supabase
    .from('reports')
    .select('*, reporter:profiles!reporter_id(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  const [postsCount, usersCount] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('is_removed', false),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);

  return (
    <AdminClient
      users={users ?? []}
      reports={reports ?? []}
      stats={{
        posts: postsCount.count ?? 0,
        users: usersCount.count ?? 0,
        reports: reports?.length ?? 0,
      }}
    />
  );
}