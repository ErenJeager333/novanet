import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import WellbeingProvider from '@/components/layout/WellbeingProvider';
import OnboardingModal from '@/components/onboarding/OnboardingModal';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  const { data: suggestedUsers } = await supabase
  .from('profiles')
  .select('*')
  .neq('id', user.id)
  .order('followers_count', { ascending: false })
  .limit(5);  

  let { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

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
    <WellbeingProvider settings={settings}>
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
        {profile && !profile.onboarding_completed && (
        <OnboardingModal profile={profile} suggestedUsers={suggestedUsers ?? []} />
        )}

        {/* Sidebar — desktop uniquement */}
        <Sidebar profile={profile} />

        {/* Contenu principal */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Topbar — mobile uniquement */}
          <Topbar profile={profile} />

          {/* Page */}
          <main className="flex-1 w-full overflow-hidden">
            {children}
          </main>

        </div>
      </div>
    </WellbeingProvider>
  );
}