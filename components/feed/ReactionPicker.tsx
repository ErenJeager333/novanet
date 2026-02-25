'use client';

import React, { useState, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const REACTIONS = [
  { type: 'love', emoji: '❤️', label: 'J\'aime' },
  { type: 'haha', emoji: '😂', label: 'Haha' },
  { type: 'wow',  emoji: '😮', label: 'Wow' },
  { type: 'sad',  emoji: '😢', label: 'Triste' },
  { type: 'angry',emoji: '😡', label: 'Grrr' },
  { type: 'fire', emoji: '🔥', label: 'Feu' },
];

interface ReactionPickerProps {
  postId: string;
  currentUserId: string;
  initialReaction?: string | null;
  reactionsCount?: Record<string, number>;
  onReactionChange?: (type: string | null, counts: Record<string, number>) => void;
}

export default function ReactionPicker({
  postId,
  currentUserId,
  initialReaction = null,
  reactionsCount = {},
  onReactionChange,
}: ReactionPickerProps) {
  const supabase = createBrowserClient();
  const [currentReaction, setCurrentReaction] = useState<string | null>(initialReaction);
  const [counts, setCounts] = useState<Record<string, number>>(reactionsCount);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const totalReactions = Object.values(counts).reduce((a, b) => a + b, 0);

  function getCurrentEmoji() {
    if (!currentReaction) return null;
    return REACTIONS.find(r => r.type === currentReaction)?.emoji;
  }

  function handlePressStart() {
    longPressTimer.current = setTimeout(() => {
      setShowPicker(true);
    }, 400);
  }

  function handlePressEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  async function handleQuickClick() {
    if (showPicker) return;
    if (currentReaction) {
      await removeReaction();
    } else {
      await applyReaction('love');
    }
  }

  async function applyReaction(type: string) {
    if (loading) return;
    setLoading(true);
    setShowPicker(false);

    const prevReaction = currentReaction;
    const newCounts = { ...counts };

    // Remove previous reaction count
    if (prevReaction) {
      newCounts[prevReaction] = Math.max((newCounts[prevReaction] ?? 1) - 1, 0);
    }

    if (prevReaction === type) {
      // Toggle off
      setCurrentReaction(null);
      await supabase.from('reactions').delete()
        .eq('user_id', currentUserId).eq('post_id', postId);
      onReactionChange?.(null, newCounts);
    } else {
      // Apply new reaction
      newCounts[type] = (newCounts[type] ?? 0) + 1;
      setCurrentReaction(type);
      await supabase.from('reactions').upsert({
        user_id: currentUserId,
        post_id: postId,
        type,
      }, { onConflict: 'user_id,post_id' });
      onReactionChange?.(type, newCounts);
    }

    setCounts(newCounts);
    setLoading(false);
  }

  async function removeReaction() {
    if (loading || !currentReaction) return;
    setLoading(true);
    const newCounts = { ...counts };
    newCounts[currentReaction] = Math.max((newCounts[currentReaction] ?? 1) - 1, 0);
    setCurrentReaction(null);
    setCounts(newCounts);
    await supabase.from('reactions').delete()
      .eq('user_id', currentUserId).eq('post_id', postId);
    onReactionChange?.(null, newCounts);
    setLoading(false);
  }

  const topReactions = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type]) => REACTIONS.find(r => r.type === type)?.emoji);

  return (
    <div className="relative">
      {/* Reaction Picker Popup */}
      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="absolute bottom-10 left-0 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-2 flex gap-1 animate-bounce-in">
            {REACTIONS.map(r => (
              <button
                key={r.type}
                onClick={() => applyReaction(r.type)}
                title={r.label}
                className={cn(
                  'w-10 h-10 text-xl flex items-center justify-center rounded-xl transition-all hover:scale-125 active:scale-95',
                  currentReaction === r.type ? 'bg-indigo-50 dark:bg-indigo-950/30 scale-110' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Button */}
      <button
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={(e) => { handlePressEnd(); if (!showPicker) handleQuickClick(); e.preventDefault(); }}
        onClick={handleQuickClick}
        disabled={loading}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-sm font-medium',
          currentReaction
            ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
        )}
      >
        {getCurrentEmoji() ? (
          <span className="text-base">{getCurrentEmoji()}</span>
        ) : (
          <Heart size={18} className={cn(loading && 'opacity-50')} />
        )}

        <div className="flex items-center gap-0.5">
          {topReactions.length > 0 && topReactions.map((emoji, i) => (
            <span key={i} className="text-xs">{emoji}</span>
          ))}
          {totalReactions > 0 && (
            <span className="ml-0.5">{totalReactions}</span>
          )}
        </div>
      </button>
    </div>
  );
}