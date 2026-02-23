'use client';

import { useState, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import { Search, Users, FileText, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getAvatarFallback, formatCount } from '@/lib/utils';
import type { Profile, Post } from '@/types';
import PostCard from '@/components/feed/PostCard';
import { cn } from '@/lib/utils';

type Tab = 'users' | 'posts';

export default function ExploreClient({ currentUserId }: { currentUserId: string }) {
  const supabase = createBrowserClient();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setUsers([]);
      setPosts([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    const [{ data: foundUsers }, { data: foundPosts }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq('id', currentUserId)
        .limit(20),
      supabase
        .from('posts')
        .select('*, author:profiles(*)')
        .ilike('content', `%${q}%`)
        .eq('visibility', 'public')
        .eq('is_removed', false)
        .is('expires_at', null)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    setUsers(foundUsers ?? []);
    setPosts((foundPosts ?? []).map(p => ({ ...p, is_liked: false })));
    setLoading(false);
  }, [supabase, currentUserId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (val.length >= 2) search(val);
    else { setUsers([]); setPosts([]); setSearched(false); }
  }

  function clearSearch() {
    setQuery('');
    setUsers([]);
    setPosts([]);
    setSearched(false);
  }

  async function toggleLike(postId: string, isLiked: boolean) {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, is_liked: !isLiked, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p
    ));
    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', postId);
    } else {
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: postId });
    }
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
          placeholder="Rechercher des utilisateurs ou des posts…"
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
          <button
            onClick={() => setTab('users')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition-all',
              tab === 'users' ? 'bg-nova-gradient text-white' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Users size={15} />
            Utilisateurs ({users.length})
          </button>
          <button
            onClick={() => setTab('posts')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition-all',
              tab === 'posts' ? 'bg-nova-gradient text-white' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <FileText size={15} />
            Posts ({posts.length})
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
          <p className="text-sm mt-1">Essaie un autre mot-clé.</p>
        </div>
      )}

      {/* Empty state */}
      {!searched && (
        <div className="card p-10 text-center text-gray-400">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">Recherche des utilisateurs ou des posts</p>
          <p className="text-sm mt-1">Tape au moins 2 caractères pour commencer.</p>
        </div>
      )}

      {/* Users results */}
      {!loading && searched && tab === 'users' && users.length > 0 && (
        <div className="card divide-y divide-gray-100 dark:divide-gray-800">
          {users.map(user => (
            <Link
              key={user.id}
              href={`/profile/${user.username}`}
              className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-nova-gradient flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                {user.avatar_url ? (
                  <Image src={user.avatar_url} alt={user.username} width={48} height={48} className="object-cover w-full h-full" />
                ) : (
                  getAvatarFallback(user.display_name ?? user.username)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user.display_name ?? user.username}</p>
                <p className="text-sm text-gray-500">@{user.username}</p>
                {user.bio && <p className="text-xs text-gray-400 truncate mt-0.5">{user.bio}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{formatCount(user.followers_count)}</p>
                <p className="text-xs text-gray-400">abonnés</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Posts results */}
      {!loading && searched && tab === 'posts' && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              showLikes={true}
              onLikeToggle={toggleLike}
            />
          ))}
        </div>
      )}
    </div>
  );
}