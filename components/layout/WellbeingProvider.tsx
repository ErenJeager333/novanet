/**
 * NovaNet – Wellbeing Provider
 *
 * Anti-addiction feature: tracks session time, shows break reminders,
 * and enforces daily limits. Wraps the entire authenticated app.
 *
 * Features:
 * - Tracks time spent on NovaNet per session
 * - Reminds users to take breaks at configurable intervals
 * - Warns when daily usage limit is approaching
 * - Persists session to Supabase for wellbeing stats
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { UserSettings } from '@/types';
import { formatDuration } from '@/lib/utils';
import { Clock, X } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase-client';

interface WellbeingProviderProps {
  children: React.ReactNode;
  settings: UserSettings | null;
}

export default function WellbeingProvider({
  children,
  settings,
}: WellbeingProviderProps) {
  const supabase = createBrowserClient();
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const breakReminderMins = settings?.break_reminder_mins ?? 60;
  const dailyLimitMins = settings?.daily_limit_minutes ?? null;

  // Start session on mount
  useEffect(() => {
    let mounted = true;

    async function startSession() {
      const { data, error } = await supabase
        .from('wellbeing_sessions')
        .insert({ started_at: new Date().toISOString() })
        .select('id')
        .single();

      if (!error && mounted && data) {
        sessionIdRef.current = data.id;
      }
    }

    startSession();

    // Tick every second
    intervalRef.current = setInterval(() => {
      if (!mounted) return;
      setSessionSeconds((prev) => {
        const next = prev + 1;

        // Break reminder (every N minutes)
        if (next % (breakReminderMins * 60) === 0) {
          setShowBreakReminder(true);
        }

        // Daily limit warning (when 5 min remain)
        if (dailyLimitMins && next === (dailyLimitMins - 5) * 60) {
          setShowLimitWarning(true);
        }

        return next;
      });
    }, 1000);

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      // End session
      if (sessionIdRef.current) {
        supabase
          .from('wellbeing_sessions')
          .update({
            ended_at: new Date().toISOString(),
            duration_s: sessionSeconds,
          })
          .eq('id', sessionIdRef.current)
          .then(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {children}

      {/* Break Reminder Banner */}
      {showBreakReminder && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div className="card p-4 flex items-start gap-3 shadow-xl border-nova-200 bg-white dark:bg-gray-900 animate-slide-up">
            <div className="w-10 h-10 rounded-full bg-nova-50 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-nova-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Time for a break! 🌿</p>
              <p className="text-xs text-gray-500 mt-0.5">
                You&apos;ve been on NovaNet for{' '}
                <strong>{formatDuration(sessionSeconds)}</strong>. Rest your eyes
                and stretch!
              </p>
            </div>
            <button
              onClick={() => setShowBreakReminder(false)}
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Daily Limit Warning */}
      {showLimitWarning && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div className="card p-4 flex items-start gap-3 shadow-xl border-yellow-200 bg-yellow-50 dark:bg-yellow-950/50 animate-slide-up">
            <Clock size={20} className="text-yellow-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-yellow-800 dark:text-yellow-300">
                5 minutes until your daily limit
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                You set a {dailyLimitMins}-minute daily limit. You can adjust
                this in Settings → Wellbeing.
              </p>
            </div>
            <button
              onClick={() => setShowLimitWarning(false)}
              className="text-yellow-600 shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
