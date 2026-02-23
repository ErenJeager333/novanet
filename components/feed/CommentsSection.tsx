'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import type { Comment } from '@/types';
import { formatDate, getAvatarFallback } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { Send, Heart, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface CommentsSectionProps {
  postId: string;
  currentUserId: string;
}

export default function CommentsSection({ postId, currentUserId }: CommentsSectionProps) {
  const supabase = createBrowserClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchComments() {
      const { data } = await supabase
        .from('comments')
        .select('*, author:profiles(*)')
        .eq('post_id', postId)
        .eq('is_removed', false)
        .order('created_at', { ascending: true })
        .limit(30);
      setComments(data ?? []);
      setFetching(false);
    }
    fetchComments();
    inputRef.current?.focus();
  }, [postId, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: currentUserId,
        content: newComment.trim(),
      })
      .select('*, author:profiles(*)')
      .single();

    if (error) {
      toast.error('Échec de l\'envoi du commentaire');
    } else if (data) {
      setComments(prev => [...prev, data]);
      setNewComment('');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      {/* Chargement */}
      {fetching && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Aucun commentaire */}
      {!fetching && comments.length === 0 && (
        <div className="text-center py-4">
          <MessageCircle size={24} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">Aucun commentaire. Sois le premier !</p>
        </div>
      )}

      {/* Liste des commentaires */}
      <div className="space-y-2.5">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2.5 animate-fade-in">
            <Link href={`/profile/${comment.author?.username}`} className="shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {comment.author?.avatar_url ? (
                  <Image
                    src={comment.author.avatar_url}
                    alt={comment.author.display_name ?? ''}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  getAvatarFallback(comment.author?.display_name ?? comment.author?.username)
                )}
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                <Link
                  href={`/profile/${comment.author?.username}`}
                  className="font-bold text-xs hover:text-indigo-500 transition-colors"
                >
                  {comment.author?.display_name ?? comment.author?.username}
                </Link>
                <p className="text-sm mt-0.5 text-gray-700 dark:text-gray-300 leading-relaxed">
                  {comment.content}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-1 pl-1">
                <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                <button className="text-xs text-gray-400 hover:text-indigo-500 font-medium transition-colors">
                  J'aime
                </button>
                <button className="text-xs text-gray-400 hover:text-indigo-500 font-medium transition-colors">
                  Répondre
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nouveau commentaire */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-1">
        <input
          ref={inputRef}
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Ajoute un commentaire…"
          className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-2xl text-sm border-none outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-400 transition-all"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={loading || !newComment.trim()}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send size={15} />
          )}
        </button>
      </form>
    </div>
  );
}