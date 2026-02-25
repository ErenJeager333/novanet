'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FollowButtonProps {
  currentUserId: string;
  targetUserId: string;
  initialFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ currentUserId, targetUserId, initialFollowing = false, onFollowChange }: FollowButtonProps) {
  const supabase = createBrowserClient();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (currentUserId === targetUserId) return;
    async function checkFollow() {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
        .single();
      setIsFollowing(!!data);
      setChecked(true);
    }
    checkFollow();
  }, [currentUserId, targetUserId]);

  if (currentUserId === targetUserId) return null;

  async function toggleFollow() {
    setLoading(true);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId);
        setIsFollowing(false);
        onFollowChange?.(false);
        toast('Abonnement retiré');
      } else {
        await supabase.from('follows').insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        });
        // Notification
        await supabase.from('notifications').insert({
          recipient_id: targetUserId,
          sender_id: currentUserId,
          type: 'follow',
          post_id: null,
        });
        setIsFollowing(true);
        onFollowChange?.(true);
        toast.success('Abonné ! 🎉');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setLoading(false);
    }
  }

  if (!checked) return (
    <div className="w-28 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
  );

  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
        isFollowing
          ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20'
          : 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white hover:opacity-90 shadow-md'
      )}
    >
      {loading
        ? <Loader2 size={16} className="animate-spin" />
        : isFollowing
          ? <><UserCheck size={16} /> Abonné</>
          : <><UserPlus size={16} /> Suivre</>
      }
    </button>
  );
}