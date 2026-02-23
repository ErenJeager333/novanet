/**
 * NovaNet – /profile redirect
 * Redirects /profile to the current user's profile.
 */

import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function ProfileRedirectPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  if (profile?.username) {
    redirect(`/profile/${profile.username}`);
  }

  redirect('/feed');
}
