'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Profile, Post } from '@/types';
import { formatCount, getAvatarFallback, cn } from '@/lib/utils';
import PostCard from '@/components/feed/PostCard';
import { createBrowserClient } from '@/lib/supabase-client';
import {
  MapPin,
  Link as LinkIcon,
  Briefcase,
  Building,
  UserPlus,
  UserCheck,
  Edit,
  Grid3x3,
  List,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(
    profile.followers_count
  );
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const isOwnProfile = currentUserId === profile.id;

  async function toggleFollow() {
    if (!currentUserId) {
      toast.error('Connecte-toi pour suivre des utilisateurs');
      return;
    }

    if (isFollowing) {
      await supabase
        .from('relationships')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id);

      setIsFollowing(false);
      setFollowerCount((c) => Math.max(c - 1, 0));
    } else {
      await supabase.from('relationships').insert({
        follower_id: currentUserId,
        following_id: profile.id,
      });

      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
  }

  async function toggleLike(postId: string, isLiked: boolean) {
    if (!currentUserId) return;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_liked: !isLiked,
              likes_count:
                p.likes_count + (isLiked ? -1 : 1),
            }
          : p
      )
    );

    if (isLiked) {
      await supabase
        .from('likes')
        .delete()
        .eq('user_id', currentUserId)
        .eq('post_id', postId);
    } else {
      await supabase.from('likes').insert({
        user_id: currentUserId,
        post_id: postId,
      });
    }
  }

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      {/* ───── Carte profil ───── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        {/* Cover */}
        <div className="relative h-40 sm:h-52 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400">
          {profile.cover_url && (
            <Image
              src={profile.cover_url}
              alt="Cover"
              fill
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        {/* Infos profil */}
        <div className="px-4 sm:px-6 pb-5">
          {/* Avatar + boutons */}
          <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-4">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white dark:border-gray-900 bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-lg">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={
                      profile.display_name ??
                      profile.username
                    }
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  getAvatarFallback(
                    profile.display_name ??
                      profile.username
                  )
                )}
              </div>

              {profile.role === 'admin' && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-[10px] font-bold">
                    A
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-1">
              {isOwnProfile ? (
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-all"
                >
                  <Edit size={14} />
                  Modifier
                </Link>
              ) : (
                <>
                  {currentUserId && (
                    <Link
                      href="/messages"
                      className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-all"
                    >
                      Message
                    </Link>
                  )}

                  <button
                    onClick={toggleFollow}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                      isFollowing
                        ? 'border-2 border-gray-200 dark:border-gray-700 hover:border-red-300 hover:text-red-500'
                        : 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white hover:opacity-90 shadow-md'
                    )}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck size={14} /> Abonné
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} /> Suivre
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Nom */}
          <div className="mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-black text-xl">
                {profile.display_name ??
                  profile.username}
              </h1>

              {profile.role === 'admin' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold">
                  Admin
                </span>
              )}
            </div>

            <p className="text-gray-400 text-sm">
              @{profile.username}
            </p>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mb-3">
              {profile.bio}
            </p>
          )}

          {/* Métadonnées */}
          <div className="flex flex-wrap gap-3 mb-4 text-sm text-gray-500">
            {profile.job_title && (
              <span className="flex items-center gap-1.5">
                <Briefcase
                  size={14}
                  className="text-indigo-400"
                />
                {profile.job_title}
              </span>
            )}

            {profile.company && (
              <span className="flex items-center gap-1.5">
                <Building
                  size={14}
                  className="text-indigo-400"
                />
                {profile.company}
              </span>
            )}

            {profile.location && (
              <span className="flex items-center gap-1.5">
                <MapPin
                  size={14}
                  className="text-indigo-400"
                />
                {profile.location}
              </span>
            )}

            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-indigo-500 hover:text-indigo-600 transition-colors"
              >
                <LinkIcon size={14} />
                {profile.website.replace(
                  /^https?:\/\//,
                  ''
                )}
              </a>
            )}

            <span className="flex items-center gap-1.5">
              <Calendar
                size={14}
                className="text-indigo-400"
              />
              Membre depuis{' '}
              {new Date(
                profile.created_at
              ).toLocaleDateString('fr-FR', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* Stats */}
          <div className="flex gap-1">
            {[
              {
                value: profile.posts_count,
                label: 'Posts',
              },
              {
                value: followerCount,
                label: 'Abonnés',
              },
              {
                value: profile.following_count,
                label: 'Abonnements',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex-1 text-center py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
              >
                <p className="font-black text-lg">
                  {formatCount(stat.value)}
                </p>
                <p className="text-xs text-gray-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───── Toggle vue ───── */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm text-gray-500">
          {posts.length} post
          {posts.length > 1 ? 's' : ''}
        </h2>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-lg transition-all',
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 text-indigo-500 shadow-sm'
                : 'text-gray-400'
            )}
          >
            <List size={16} />
          </button>

          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg transition-all',
              viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 text-indigo-500 shadow-sm'
                : 'text-gray-400'
            )}
          >
            <Grid3x3 size={16} />
          </button>
        </div>
      </div>

      {/* ───── Posts ───── */}
      {posts.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Grid3x3
            size={32}
            className="mx-auto mb-3 opacity-30"
          />
          <p className="font-medium">
            Aucun post pour l'instant
          </p>
          {isOwnProfile && (
            <p className="text-sm mt-1">
              Partage ta première publication !
            </p>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden">
          {posts.map((post) => (
            <div
              key={post.id}
              className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden group cursor-pointer"
            >
              {post.media_url?.[0] ? (
                <Image
                  src={post.media_url[0]}
                  alt=""
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center p-2">
                  <p className="text-white text-xs font-medium text-center line-clamp-4">
                    {post.content}
                  </p>
                </div>
              )}

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white text-xs font-bold">
                  ❤️ {post.likes_count}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId ?? ''}
              showLikes
              onLikeToggle={toggleLike}
            />
          ))}
        </div>
      )}
    </div>
  );
}