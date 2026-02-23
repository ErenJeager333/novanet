/**
 * NovaNet – Wellbeing API Route
 * GET  /api/wellbeing – get user's session stats
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get today's sessions
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: sessions } = await supabase
    .from('wellbeing_sessions')
    .select('duration_s, started_at')
    .eq('user_id', user.id)
    .gte('started_at', today.toISOString());

  const totalSeconds = (sessions ?? []).reduce(
    (acc, s) => acc + (s.duration_s ?? 0),
    0
  );

  return NextResponse.json({
    sessions: sessions ?? [],
    totalSecondsToday: totalSeconds,
    sessionCount: (sessions ?? []).length,
  });
}
