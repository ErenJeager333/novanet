'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Profile, Post } from '@/types';
import { formatCount, getAvatarFallback, cn } from '@/lib/utils';
import PostCard from '@/components/feed/PostCard';
import FollowButton from '@/components/profile/FollowButton';
import { createBrowserClient } from '@/lib/supabase-client';
import {
  MapPin,
  Link as LinkIcon,
  Briefcase,
  Building,
  Edit,
  Grid3x3,
  List,
  Calendar,
  Users,
} from 'lucide-react';

interface ProfileClientProps {
  profile: Profile;
  posts: Post[];
  currentUserId: string | null;
  isFollowing: boolean;
}

export default function ProfileClient({
  profile,
  posts: initialPosts,
  currentUserId,
  isFollowing: initialFollowing,
}: ProfileClientProps) {
  const supabase = createBrowserClient();

  const [followerCount, setFollowerCount] = useState(profile.followers_count ?? 0);
  const [followingCount] = useState(profile.following_count ?? 0);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState<Profile[]>([]);
  const [followingList, setFollowingList] = useState<Profile[]>([]);

  const isOwnProfile = currentUserId === profile.id;

  async function loadFollowers() {
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', profile.id)
    .limit(50);
  
  if (data && data.length > 0) {
    const ids = data.map((d: { follower_id: string }) => d.follower_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids);
    if (profiles) setFollowersList(profiles as Profile[]);
  }
  setShowFollowers(true);
  }

  async function loadFollowing() {
  const { data } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', profile.id)
    .limit(50);
  
  if (data && data.length > 0) {
    const ids = data.map((d: { following_id: string }) => d.following_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids);
    if (profiles) setFollowingList(profiles as Profile[]);
  }
  setShowFollowing(true);
  }

  async function toggleLike(postId: string, isLiked: boolean) {
    if (!currentUserId) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_liked: !isLiked, likes_count: p.likes_count + (isLiked ? -1 : 1) }
          : p
      )
    );
    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', postId);
    } else {
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: postId });
    }
  }

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      {/* Carte profil */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        {/* Cover */}
        <div className="relative h-40 sm:h-52 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400">
          {profile.cover_url && (
            <Image src={profile.cover_url} alt="Cover" fill className="object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        <div className="px-4 sm:px-6 pb-5">
          {/* Avatar + boutons */}
          <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-4">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white dark:border-gray-900 bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-lg">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.display_name ?? profile.username} width={96} height={96} className="object-cover w-full h-full" />
                ) : (
                  getAvatarFallback(profile.display_name ?? profile.username)
                )}
              </div>
              {profile.role === 'admin' && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-[10px] font-bold">A</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-1">
              {isOwnProfile ? (
                <Link href="/settings" className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-all">
                  <Edit size={14} /> Modifier
                </Link>
              ) : (
                <>
                  {currentUserId && (
                    <Link href="/messages" className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-all">
                      Message
                    </Link>
                  )}
                  {currentUserId && (
                    <FollowButton
                      currentUserId={currentUserId}
                      targetUserId={profile.id}
                      initialFollowing={initialFollowing}
                      onFollowChange={(isFollowing) => {
                        setFollowerCount(c => isFollowing ? c + 1 : Math.max(c - 1, 0));
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Nom */}
          <div className="mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-black text-xl">{profile.display_name ?? profile.username}</h1>
              {profile.role === 'admin' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold">Admin</span>
              )}
            </div>
            <p className="text-gray-400 text-sm">@{profile.username}</p>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mb-3">{profile.bio}</p>
          )}

          {/* Métadonnées */}
          <div className="flex flex-wrap gap-3 mb-4 text-sm text-gray-500">
            {profile.job_title && (
              <span className="flex items-center gap-1.5"><Briefcase size={14} className="text-indigo-400" />{profile.job_title}</span>
            )}
            {profile.company && (
              <span className="flex items-center gap-1.5"><Building size={14} className="text-indigo-400" />{profile.company}</span>
            )}
            {profile.location && (
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-indigo-400" />{profile.location}</span>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-indigo-500 hover:text-indigo-600 transition-colors">
                <LinkIcon size={14} />{profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-400" />
              Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Stats cliquables */}
          <div className="flex gap-1">
            <div className="flex-1 text-center py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer">
              <p className="font-black text-lg">{formatCount(posts.length)}</p>
              <p className="text-xs text-gray-500">Posts</p>
            </div>
            <button
              onClick={loadFollowers}
              className="flex-1 text-center py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
            >
              <p className="font-black text-lg">{formatCount(followerCount)}</p>
              <p className="text-xs text-gray-500">Abonnés</p>
            </button>
            <button
              onClick={loadFollowing}
              className="flex-1 text-center py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
            >
              <p className="font-black text-lg">{formatCount(followingCount)}</p>
              <p className="text-xs text-gray-500">Abonnements</p>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Abonnés */}
      {showFollowers && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={() => setShowFollowers(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl w-full md:max-w-sm p-5 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Abonnés</h3>
              <button onClick={() => setShowFollowers(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {followersList.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-40" />
                  <p>Aucun abonné</p>
                </div>
              ) : followersList.map(f => (
                <Link key={f.id} href={`/profile/${f.username}`} onClick={() => setShowFollowers(false)} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 overflow-hidden shrink-0">
                    {f.avatar_url
                      ? <Image src={f.avatar_url} alt="" width={40} height={40} className="object-cover w-full h-full" />
                      : <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">{getAvatarFallback(f.display_name ?? f.username)}</div>
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{f.display_name ?? f.username}</p>
                    <p className="text-xs text-gray-400">@{f.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Abonnements */}
      {showFollowing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={() => setShowFollowing(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl w-full md:max-w-sm p-5 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Abonnements</h3>
              <button onClick={() => setShowFollowing(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {followingList.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-40" />
                  <p>Aucun abonnement</p>
                </div>
              ) : followingList.map(f => (
                <Link key={f.id} href={`/profile/${f.username}`} onClick={() => setShowFollowing(false)} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 overflow-hidden shrink-0">
                    {f.avatar_url
                      ? <Image src={f.avatar_url} alt="" width={40} height={40} className="object-cover w-full h-full" />
                      : <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">{getAvatarFallback(f.display_name ?? f.username)}</div>
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{f.display_name ?? f.username}</p>
                    <p className="text-xs text-gray-400">@{f.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toggle vue */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm text-gray-500">{posts.length} post{posts.length > 1 ? 's' : ''}</h2>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          <button onClick={() => setViewMode('list')} className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-white dark:bg-gray-700 text-indigo-500 shadow-sm' : 'text-gray-400')}>
            <List size={16} />
          </button>
          <button onClick={() => setViewMode('grid')} className={cn('p-2 rounded-lg transition-all', viewMode === 'grid' ? 'bg-white dark:bg-gray-700 text-indigo-500 shadow-sm' : 'text-gray-400')}>
            <Grid3x3 size={16} />
          </button>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Grid3x3 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun post pour l'instant</p>
          {isOwnProfile && <p className="text-sm mt-1">Partage ta première publication !</p>}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden">
          {posts.map((post) => (
            <div key={post.id} className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden group cursor-pointer">
              {post.media_url?.[0] ? (
                <Image src={post.media_url[0]} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center p-2">
                  <p className="text-white text-xs font-medium text-center line-clamp-4">{post.content}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white text-xs font-bold">❤️ {post.likes_count}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId ?? ''} showLikes onLikeToggle={toggleLike} />
          ))}
        </div>
      )}
    </div>
  );
}
