'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate, formatCount, getAvatarFallback, cn } from '@/lib/utils';
import type { Post } from '@/types';
import CommentsSection from '@/components/feed/CommentsSection';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Flag,
  Trash2,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase-client';
import toast from 'react-hot-toast';

interface PostCardProps {
  post: Post;
  currentUserId: string;
  showLikes: boolean;
  onLikeToggle: (postId: string, isLiked: boolean) => void;
}

export default function PostCard({
  post,
  currentUserId,
  showLikes,
  onLikeToggle,
}: PostCardProps) {
  const supabase = createBrowserClient();
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeAnimation, setLikeAnimation] = useState(false);

  const isOwner = post.author_id === currentUserId;
  const author = post.author;
  const mediaUrls = post.media_url ?? [];

  function handleLike() {
    setLikeAnimation(true);
    setTimeout(() => setLikeAnimation(false), 600);
    onLikeToggle(post.id, post.is_liked ?? false);
  }

  async function handleReport() {
    setShowMenu(false);
    const reason = prompt('Raison du signalement ?');
    if (!reason) return;
    const { error } = await supabase.from('reports').insert({
      reporter_id: currentUserId,
      post_id: post.id,
      reason,
    });
    if (error) toast.error('Échec du signalement');
    else toast.success('Signalement envoyé. Merci !');
  }

  async function handleDelete() {
    setShowMenu(false);
    if (!confirm('Supprimer ce post ?')) return;
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id)
      .eq('author_id', currentUserId);
    if (error) toast.error('Échec de la suppression');
    else toast.success('Post supprimé');
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: `Post de ${author?.display_name ?? author?.username}`,
        url: `${window.location.origin}/posts/${post.id}`,
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`);
      toast.success('Lien copié !');
    }
  }

  return (
    <article className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-all duration-300 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${author?.username}`} className="shrink-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold overflow-hidden ring-2 ring-white dark:ring-gray-800 shadow-sm">
              {author?.avatar_url ? (
                <Image
                  src={author.avatar_url}
                  alt={author.display_name ?? author.username}
                  width={44}
                  height={44}
                  className="object-cover w-full h-full"
                />
              ) : (
                getAvatarFallback(author?.display_name ?? author?.username)
              )}
            </div>
          </Link>

          <div>
            <Link
              href={`/profile/${author?.username}`}
              className="font-bold text-sm hover:text-indigo-500 transition-colors"
            >
              {author?.display_name ?? author?.username}
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
              <span>@{author?.username}</span>
              <span>·</span>
              <span>{formatDate(post.created_at)}</span>
              {post.visibility !== 'public' && (
                <>
                  <span>·</span>
                  <span className="capitalize bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full text-[10px]">
                    {post.visibility}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Menu contextuel */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <MoreHorizontal size={18} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-9 z-20 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 animate-scale-in">
                {!isOwner && (
                  <button
                    onClick={handleReport}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Flag size={15} />
                    Signaler
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 size={15} />
                    Supprimer
                  </button>
                )}
                <button
                  onClick={() => { handleShare(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Share2 size={15} />
                  Partager
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Contenu texte ── */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {post.content}
          </p>
        </div>
      )}

      {/* ── Médias ── */}
      {mediaUrls.length > 0 && (
        <div className={cn('grid gap-0.5', mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
          {mediaUrls.map((url, i) =>
            url.match(/\.(mp4|webm|ogg)(\?|$)/i) ? (
              <video
                key={i}
                src={url}
                controls
                className="w-full max-h-[500px] object-cover bg-black"
                preload="metadata"
              />
            ) : (
              <div
                key={i}
                className={cn(
                  'relative overflow-hidden bg-gray-100',
                  mediaUrls.length === 1 ? 'aspect-[16/10]' : 'aspect-square',
                  mediaUrls.length === 3 && i === 0 ? 'row-span-2' : ''
                )}
              >
                <Image
                  src={url}
                  alt={`Media ${i + 1}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            )
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-gray-50 dark:border-gray-800">
        {/* Like */}
        <button
          onClick={handleLike}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
            post.is_liked
              ? 'text-red-500 bg-red-50 dark:bg-red-950/30'
              : 'text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
          )}
        >
          <Heart
            size={18}
            className={cn(
              'transition-all duration-300',
              post.is_liked ? 'fill-current' : '',
              likeAnimation ? 'scale-125' : 'scale-100'
            )}
          />
          {showLikes && <span>{formatCount(post.likes_count)}</span>}
        </button>

        {/* Commentaires */}
        <button
          onClick={() => setShowComments(!showComments)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
            showComments
              ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
              : 'text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
          )}
        >
          <MessageCircle size={18} />
          <span>{formatCount(post.comments_count)}</span>
        </button>

        {/* Partager */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
        >
          <Share2 size={18} />
        </button>

        {/* Sauvegarder */}
        <button
          onClick={() => {
            setSaved(!saved);
            toast.success(saved ? 'Retiré des favoris' : 'Sauvegardé !');
          }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ml-auto',
            saved
              ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
              : 'text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
          )}
        >
          {saved
            ? <BookmarkCheck size={18} className="fill-current opacity-80" />
            : <Bookmark size={18} />
          }
        </button>
      </div>

      {/* ── Section commentaires ── */}
      {showComments && (
        <div className="border-t border-gray-50 dark:border-gray-800 px-4 py-3">
          <CommentsSection postId={post.id} currentUserId={currentUserId} />
        </div>
      )}
    </article>
  );
}