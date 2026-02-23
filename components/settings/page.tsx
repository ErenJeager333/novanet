import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import SettingsClient from '@/components/settings/SettingsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  let { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Si pas de settings, on en crée un par défaut
  if (!settings) {
    await supabase.from('user_settings').insert({ user_id: user.id });
    const { data: newSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    settings = newSettings;
  }

  return (
    <SettingsClient
      profile={profile!}
      settings={settings!}
      currentUserId={user.id}
    />
  );
}