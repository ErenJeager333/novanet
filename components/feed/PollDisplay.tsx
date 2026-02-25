'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import { BarChart2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PollOption {
  id: string;
  text: string;
  votes_count: number;
}

interface Poll {
  id: string;
  question: string;
  ends_at: string | null;
  poll_options: PollOption[];
}

interface PollDisplayProps {
  postId: string;
  currentUserId: string;
}

export default function PollDisplay({ postId, currentUserId }: PollDisplayProps) {
  const supabase = createBrowserClient();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    async function loadPoll() {
      const { data: pollData } = await supabase
        .from('polls')
        .select('*, poll_options(*)')
        .eq('post_id', postId)
        .single();

      if (pollData) {
        setPoll(pollData as Poll);

        // Check if user already voted
        const { data: vote } = await supabase
          .from('poll_votes')
          .select('option_id')
          .eq('poll_id', pollData.id)
          .eq('user_id', currentUserId)
          .single();

        if (vote) setVotedOptionId(vote.option_id);
      }
      setLoading(false);
    }
    loadPoll();
  }, [postId, currentUserId]);

  async function vote(optionId: string) {
    if (!poll || votedOptionId || voting) return;
    setVoting(true);

    await supabase.from('poll_votes').insert({
      poll_id: poll.id,
      option_id: optionId,
      user_id: currentUserId,
    });

    await supabase.from('poll_options')
      .update({ votes_count: (poll.poll_options.find(o => o.id === optionId)?.votes_count ?? 0) + 1 })
      .eq('id', optionId);

    setPoll(prev => prev ? {
      ...prev,
      poll_options: prev.poll_options.map(o =>
        o.id === optionId ? { ...o, votes_count: o.votes_count + 1 } : o
      )
    } : null);

    setVotedOptionId(optionId);
    setVoting(false);
  }

  if (loading || !poll) return null;

  const totalVotes = poll.poll_options.reduce((sum, o) => sum + o.votes_count, 0);
  const hasVoted = !!votedOptionId;
  const isExpired = poll.ends_at ? new Date(poll.ends_at) < new Date() : false;
  const showResults = hasVoted || isExpired;

  return (
    <div className="mx-4 mb-3 border border-indigo-100 dark:border-indigo-900 rounded-xl p-3 space-y-2 bg-indigo-50/30 dark:bg-indigo-950/10">
      <div className="flex items-center gap-2">
        <BarChart2 size={15} className="text-indigo-500 shrink-0" />
        <p className="font-semibold text-sm">{poll.question}</p>
      </div>

      <div className="space-y-2">
        {poll.poll_options.map(option => {
          const pct = totalVotes > 0 ? Math.round((option.votes_count / totalVotes) * 100) : 0;
          const isVoted = votedOptionId === option.id;

          return (
            <button
              key={option.id}
              onClick={() => vote(option.id)}
              disabled={showResults || voting}
              className={cn(
                'w-full relative rounded-lg overflow-hidden text-left transition-all',
                !showResults ? 'hover:border-indigo-400 cursor-pointer' : 'cursor-default',
                isVoted ? 'border-2 border-indigo-500' : 'border border-gray-200 dark:border-gray-700'
              )}
            >
              {/* Progress bar */}
              {showResults && (
                <div
                  className={cn('absolute inset-y-0 left-0 transition-all duration-700', isVoted ? 'bg-indigo-200 dark:bg-indigo-800/60' : 'bg-gray-100 dark:bg-gray-800')}
                  style={{ width: `${pct}%` }}
                />
              )}

              <div className="relative flex items-center justify-between px-3 py-2">
                <span className={cn('text-sm font-medium', isVoted ? 'text-indigo-700 dark:text-indigo-300' : '')}>
                  {option.text}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {showResults && (
                    <span className="text-xs text-gray-500 font-medium">{pct}%</span>
                  )}
                  {isVoted && <Check size={14} className="text-indigo-500" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        {totalVotes} vote{totalVotes > 1 ? 's' : ''}
        {isExpired ? ' · Sondage terminé' : hasVoted ? ' · Vous avez voté' : ' · Cliquez pour voter'}
      </p>
    </div>
  );
}