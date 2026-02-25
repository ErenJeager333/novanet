'use client';

import { useState, useCallback, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import { Search, Users, FileText, X, TrendingUp, Hash } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getAvatarFallback, formatCount } from '@/lib/utils';
import type { Profile, Post } from '@/types';
import PostCard from '@/components/feed/PostCard';
import FollowButton from '@/components/profile/FollowButton';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';

type Tab = 'users' | 'posts' | 'hashtags';

interface Hashtag {
  id: string;
  name: string;
  posts_count: number;
}

export default function ExploreClient({ currentUserId }: { currentUserId: string }) {
  const supabase = createBrowserClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get('tag') ? `#${searchParams.get('tag')}` : '');
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [trending, setTrending] = useState<Hashtag[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);

  // Load trending hashtags and suggested users on mount
  useEffect(() => {
    async function loadTrending() {
      const { data } = await supabase
        .from('hashtags')
        .select('*')
        .order('posts_count', { ascending: false })
        .limit(10);
      if (data) setTrending(data as Hashtag[]);
    }

    async function loadSuggested() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId)
        .order('followers_count', { ascending: false })
        .limit(6);
      if (data) setSuggestedUsers(data as Profile[]);
    }

    loadTrending();
    loadSuggested();
  }, [currentUserId]);

  // Auto-search if tag param present
  useEffect(() => {
    const tag = searchParams.get('tag');
    if (tag) {
      setQuery(`#${tag}`);
      search(`#${tag}`);
      setTab('posts');
    }
  }, [searchParams]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setUsers([]); setPosts([]); setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);

    // Hashtag search
    if (q.startsWith('#')) {
      const tag = q.slice(1).toLowerCase();
      const { data: hashtagData } = await supabase
        .from('hashtags')
        .select('id')
        .eq('name', tag)
        .single();

      if (hashtagData) {
        const { data: postIds } = await supabase
          .from('post_hashtags')
          .select('post_id')
          .eq('hashtag_id', hashtagData.id);

        if (postIds && postIds.length > 0) {
          const ids = postIds.map((p: { post_id: string }) => p.post_id);
          const { data: foundPosts } = await supabase
            .from('posts')
            .select('*, author:profiles(*)')
            .in('id', ids)
            .eq('is_removed', false)
            .order('created_at', { ascending: false });
          setPosts((foundPosts ?? []).map(p => ({ ...p, is_liked: false })));
        } else {
          setPosts([]);
        }
      } else {
        setPosts([]);
      }
      setUsers([]);
      setTab('posts');
    } else {
      const [{ data: foundUsers }, { data: foundPosts }] = await Promise.all([
        supabase.from('profiles').select('*')
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
          .neq('id', currentUserId).limit(20),
        supabase.from('posts').select('*, author:profiles(*)')
          .ilike('content', `%${q}%`)
          .eq('visibility', 'public').eq('is_removed', false)
          .is('expires_at', null)
          .order('created_at', { ascending: false }).limit(20),
      ]);
      setUsers(foundUsers ?? []);
      setPosts((foundPosts ?? []).map(p => ({ ...p, is_liked: false })));
    }
    setLoading(false);
  }, [supabase, currentUserId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (val.length >= 2) search(val);
    else { setUsers([]); setPosts([]); setSearched(false); }
  }

  function clearSearch() {
    setQuery(''); setUsers([]); setPosts([]); setSearched(false);
    router.push('/explore');
  }

  async function toggleLike(postId: string, isLiked: boolean) {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, is_liked: !isLiked, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p
    ));
    if (isLiked) await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', postId);
    else await supabase.from('likes').insert({ user_id: currentUserId, post_id: postId });
  }

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <h1 className="font-bold text-xl">Explorer</h1>

      {/* Search bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={handleChange}
          placeholder="Rechercher des utilisateurs, posts, #hashtags…"
          className="input pl-10 pr-10 w-full"
          autoFocus
        />
        {query && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Tabs */}
      {searched && (
        <div className="card p-1 flex gap-1">
          <button onClick={() => setTab('users')} className={cn('flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition-all', tab === 'users' ? 'bg-nova-gradient text-white' : 'text-gray-500 hover:text-gray-700')}>
            <Users size={15} /> Utilisateurs ({users.length})
          </button>
          <button onClick={() => setTab('posts')} className={cn('flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition-all', tab === 'posts' ? 'bg-nova-gradient text-white' : 'text-gray-500 hover:text-gray-700')}>
            <FileText size={15} /> Posts ({posts.length})
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-nova-300 border-t-nova-500 rounded-full animate-spin" />
        </div>
      )}

      {/* No results */}
      {!loading && searched && users.length === 0 && posts.length === 0 && (
        <div className="card p-10 text-center text-gray-400">
          <Search size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Aucun résultat pour "{query}"</p>
        </div>
      )}

      {/* Empty state — Trending + Suggestions */}
      {!searched && (
        <div className="space-y-4">

          {/* Trending hashtags */}
          {trending.length > 0 && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-500" />
                <h2 className="font-bold">Tendances</h2>
              </div>
              <div className="space-y-1">
                {trending.map((tag, i) => (
                  <button
                    key={tag.id}
                    onClick={() => { setQuery(`#${tag.name}`); search(`#${tag.name}`); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-400 w-5">#{i + 1}</span>
                      <div>
                        <p className="font-semibold text-sm text-indigo-500">#{tag.name}</p>
                        <p className="text-xs text-gray-400">{formatCount(tag.posts_count)} posts</p>
                      </div>
                    </div>
                    <Hash size={16} className="text-gray-300" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested users */}
          {suggestedUsers.length > 0 && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-indigo-500" />
                <h2 className="font-bold">Suggestions</h2>
              </div>
              <div className="space-y-3">
                {suggestedUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-3">
                    <Link href={`/profile/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold overflow-hidden shrink-0">
                        {user.avatar_url
                          ? <Image src={user.avatar_url} alt="" width={40} height={40} className="object-cover w-full h-full" />
                          : getAvatarFallback(user.display_name ?? user.username)
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{user.display_name ?? user.username}</p>
                        <p className="text-xs text-gray-400">{formatCount(user.followers_count)} abonnés</p>
                      </div>
                    </Link>
                    <FollowButton currentUserId={currentUserId} targetUserId={user.id} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {trending.length === 0 && suggestedUsers.length === 0 && (
            <div className="card p-10 text-center text-gray-400">
              <Search size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">Recherche des utilisateurs, posts ou #hashtags</p>
            </div>
          )}
        </div>
      )}

      {/* Users results */}
      {!loading && searched && tab === 'users' && users.length > 0 && (
        <div className="card divide-y divide-gray-100 dark:divide-gray-800">
          {users.map(user => (
            <div key={user.id} className="flex items-center gap-3 p-4">
              <Link href={`/profile/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full bg-nova-gradient flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                  {user.avatar_url
                    ? <Image src={user.avatar_url} alt={user.username} width={48} height={48} className="object-cover w-full h-full" />
                    : getAvatarFallback(user.display_name ?? user.username)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{user.display_name ?? user.username}</p>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  {user.bio && <p className="text-xs text-gray-400 truncate mt-0.5">{user.bio}</p>}
                </div>
              </Link>
              <FollowButton currentUserId={currentUserId} targetUserId={user.id} />
            </div>
          ))}
        </div>
      )}

      {/* Posts results */}
      {!loading && searched && tab === 'posts' && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} showLikes={true} onLikeToggle={toggleLike} />
          ))}
        </div>
      )}
    </div>
  );
}