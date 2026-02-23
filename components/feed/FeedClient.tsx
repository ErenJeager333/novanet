'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import type { Post } from '@/types';
import PostCard from '@/components/feed/PostCard';
import PostComposer from '@/components/feed/PostComposer';
import { ArrowUp, Sparkles, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FeedClientProps {
  initialPosts: Post[];
  currentUserId: string;
  feedMode: 'chronological' | 'algorithmic';
  showLikes: boolean;
}

export default function FeedClient({
  initialPosts,
  currentUserId,
  feedMode: initialFeedMode,
  showLikes,
}: FeedClientProps) {
  const supabase = createBrowserClient();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [feedMode, setFeedMode] = useState(initialFeedMode);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialPosts.length === 20);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Realtime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: 'visibility=eq.public' },
        (payload) => {
          if (payload.new.author_id !== currentUserId) {
            setNewPostsCount(prev => prev + 1);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, currentUserId]);

  // ─── Charger plus de posts ──────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const { data } = await supabase
      .from('posts')
      .select('*, author:profiles(*)')
      .eq('visibility', 'public')
      .eq('is_removed', false)
      .is('group_id', null)
      .is('expires_at', null)
      .order('created_at', { ascending: false })
      .range(page * 20, page * 20 + 19);

    if (data && data.length > 0) {
      const likedIds = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', data.map(p => p.id));

      const likedSet = new Set((likedIds.data ?? []).map(l => l.post_id));
      setPosts(prev => [...prev, ...data.map(p => ({ ...p, is_liked: likedSet.has(p.id) }))]);
      setPage(prev => prev + 1);
      setHasMore(data.length === 20);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  }, [loading, hasMore, page, supabase, currentUserId]);

  // ─── Infinite scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    function handleScroll() {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 800) {
        loadMore();
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  // ─── Rafraîchir le feed ─────────────────────────────────────────────────────
  async function refreshFeed() {
    setRefreshing(true);
    const { data } = await supabase
      .from('posts')
      .select('*, author:profiles(*)')
      .eq('visibility', 'public')
      .eq('is_removed', false)
      .is('group_id', null)
      .is('expires_at', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      const likedIds = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', data.map(p => p.id));

      const likedSet = new Set((likedIds.data ?? []).map(l => l.post_id));
      setPosts(data.map(p => ({ ...p, is_liked: likedSet.has(p.id) })));
      setPage(1);
      setHasMore(data.length === 20);
      setNewPostsCount(0);
    }
    setRefreshing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Like toggle ────────────────────────────────────────────────────────────
  async function handleLikeToggle(postId: string, isLiked: boolean) {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, is_liked: !isLiked, likes_count: p.likes_count + (isLiked ? -1 : 1) }
        : p
    ));
    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', postId);
    } else {
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: postId });
    }
  }

  return (
    <div className="space-y-4 pb-20 md:pb-6">

      {/* ── Header du feed ── */}
      <div className="flex items-center justify-between">
        <h1 className="font-black text-xl">Fil d'actualité</h1>
        <div className="flex items-center gap-2">
          {/* Toggle chronologique / algorithmique */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setFeedMode('chronological')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                feedMode === 'chronological'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Clock size={13} />
              Récent
            </button>
            <button
              onClick={() => setFeedMode('algorithmic')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                feedMode === 'algorithmic'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Sparkles size={13} />
              Pour toi
            </button>
          </div>

          {/* Rafraîchir */}
          <button
            onClick={refreshFeed}
            disabled={refreshing}
            className="p-2 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Compositeur de post ── */}
      <PostComposer
        currentUserId={currentUserId}
        onPostCreated={(post) => setPosts(prev => [post, ...prev])}
      />

      {/* ── Bouton nouveaux posts ── */}
      {newPostsCount > 0 && (
        <button
          onClick={refreshFeed}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-sm font-semibold rounded-2xl hover:opacity-90 transition-all animate-fade-in shadow-md"
        >
          <ArrowUp size={16} />
          {newPostsCount} nouveau{newPostsCount > 1 ? 'x' : ''} post{newPostsCount > 1 ? 's' : ''}
        </button>
      )}

      {/* ── Posts ── */}
      <div className="space-y-4">
        {posts.length === 0 && !loading && (
          <div className="card p-16 text-center text-gray-400">
            <Sparkles size={40} className="mx-auto mb-4 opacity-30" />
            <p className="font-semibold text-gray-500 text-lg">Aucun post pour l'instant</p>
            <p className="text-sm mt-2">Sois le premier à partager quelque chose !</p>
          </div>
        )}
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            showLikes={showLikes}
            onLikeToggle={handleLikeToggle}
          />
        ))}
      </div>

      {/* ── Chargement ── */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {/* ── Fin du feed ── */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-gray-400">
          <div className="w-12 h-0.5 bg-gray-200 mx-auto mb-4" />
          <p className="text-sm">Tu as tout vu ! 🎉</p>
        </div>
      )}
    </div>
  );
}