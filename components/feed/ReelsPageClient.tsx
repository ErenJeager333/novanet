'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import type { Post, Comment } from '@/types';
import { getAvatarFallback } from '@/lib/utils';
import {
  Plus, X, Upload, Heart, MessageCircle,
  Play, Volume2, VolumeX, Share2, Bookmark,
  MoreHorizontal, Music2, ChevronUp, ChevronDown,
  Send, Trash2, Flag, Link, Check
} from 'lucide-react';
import Image from 'next/image';
import NextLink from 'next/link';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  reels: Post[];
  currentUserId: string;
}

export default function ReelsPageClient({ reels: initialReels, currentUserId }: Props) {
  const supabase = createBrowserClient();
  const [reels, setReels] = useState<Post[]>(initialReels);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [reelText, setReelText] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [savedReels, setSavedReels] = useState<Set<string>>(new Set());
  const [showMore, setShowMore] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const touchStartY = useRef(0);

  useEffect(() => {
    async function loadSaved() {
      const { data } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', currentUserId);
      if (data) setSavedReels(new Set(data.map((s: { post_id: string }) => s.post_id)));
    }
    loadSaved();
  }, [currentUserId]);

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === currentIndex) { video.play().catch(() => {}); setPlaying(true); }
      else { video.pause(); video.currentTime = 0; }
    });
    setShowComments(false);
    setShowMore(false);
  }, [currentIndex]);

  useEffect(() => {
    videoRefs.current.forEach(video => { if (video) video.muted = muted; });
  }, [muted]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowUp') goPrev();
      if (e.key === 'Escape') { setShowComments(false); setShowMore(false); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, reels.length]);

  function goNext() { if (currentIndex < reels.length - 1) setCurrentIndex(i => i + 1); }
  function goPrev() { if (currentIndex > 0) setCurrentIndex(i => i - 1); }

  function onTouchStart(e: React.TouchEvent) { touchStartY.current = e.touches[0].clientY; }
  function onTouchEnd(e: React.TouchEvent) {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (diff > 50) goNext();
    else if (diff < -50) goPrev();
  }

  function togglePlay(index: number) {
    const video = videoRefs.current[index];
    if (!video) return;
    if (video.paused) { video.play(); setPlaying(true); }
    else { video.pause(); setPlaying(false); }
  }

  async function toggleLike(postId: string, isLiked: boolean) {
    setReels(prev => prev.map(p =>
      p.id === postId ? { ...p, is_liked: !isLiked, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p
    ));
    if (isLiked) await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', postId);
    else await supabase.from('likes').insert({ user_id: currentUserId, post_id: postId });
  }

  async function toggleSave(postId: string) {
    const isSaved = savedReels.has(postId);
    if (isSaved) {
      setSavedReels(prev => { const s = new Set(prev); s.delete(postId); return s; });
      await supabase.from('saved_posts').delete().eq('user_id', currentUserId).eq('post_id', postId);
      toast('Retiré des favoris');
    } else {
      setSavedReels(prev => new Set(prev).add(postId));
      await supabase.from('saved_posts').insert({ user_id: currentUserId, post_id: postId });
      toast.success('Sauvegardé ! 🔖');
    }
  }

  async function shareReel(postId: string) {
    const url = `${window.location.origin}/reels?id=${postId}`;
    try {
      if (navigator.share) await navigator.share({ title: 'NovaNet Reel', url });
      else { await navigator.clipboard.writeText(url); toast.success('Lien copié ! 🔗'); }
    } catch { toast.error('Impossible de partager'); }
  }

  async function copyLink(postId: string) {
    const url = `${window.location.origin}/reels?id=${postId}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success('Lien copié !');
  }

  async function deleteReel(postId: string) {
    const { error } = await supabase.from('posts').update({ is_removed: true }).eq('id', postId);
    if (error) { toast.error('Erreur'); return; }
    setReels(prev => prev.filter(r => r.id !== postId));
    setShowMore(false);
    toast.success('Reel supprimé');
    if (currentIndex >= reels.length - 1) setCurrentIndex(Math.max(0, currentIndex - 1));
  }

  async function reportReel(postId: string) {
    await supabase.from('reports').insert({
      reporter_id: currentUserId,
      post_id: postId,
      reason: 'Contenu inapproprié signalé depuis les Reels',
    });
    setShowMore(false);
    toast.success('Signalement envoyé');
  }

  async function loadComments(postId: string) {
    setLoadingComments(true);
    const { data } = await supabase
      .from('comments')
      .select('*, author:profiles(*)')
      .eq('post_id', postId)
      .eq('is_removed', false)
      .order('created_at', { ascending: true })
      .limit(50);
    setComments((data as Comment[]) ?? []);
    setLoadingComments(false);
  }

  async function submitComment(postId: string) {
    if (!newComment.trim()) return;
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: currentUserId, content: newComment.trim() })
      .select('*, author:profiles(*)')
      .single();
    if (error) { toast.error('Erreur'); return; }
    setComments(prev => [...prev, data as unknown as Comment]);
    setReels(prev => prev.map(r => r.id === postId ? { ...r, comments_count: (r.comments_count ?? 0) + 1 } : r));
    setNewComment('');
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  }

  async function publishReel() {
    if (!mediaFile) { toast.error('Ajoute une vidéo !'); return; }
    setPosting(true);
    try {
      const ext = mediaFile.name.split('.').pop();
      const path = `reels/${currentUserId}/${uuidv4()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('media').upload(path, mediaFile);
      if (uploadError) throw new Error(uploadError.message);
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
      const { data: reel, error } = await supabase
        .from('posts')
        .insert({ author_id: currentUserId, content: reelText.trim(), media_url: [urlData.publicUrl], post_type: 'reel', visibility: 'public' })
        .select('*, author:profiles(*)')
        .single();
      if (error) throw new Error(error.message);
      toast.success('Reel publié ! 🎬');
      setReels(prev => [{ ...reel, is_liked: false }, ...prev]);
      setShowCreate(false); setReelText(''); setMediaFile(null); setMediaPreview(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Échec');
    } finally { setPosting(false); }
  }

  const currentReel = reels[currentIndex];

  type CommentWithAuthor = Comment & { author?: { avatar_url?: string; display_name?: string; username?: string } };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">

      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 pt-12 pb-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <h1 className="text-white font-bold text-lg">Reels</h1>
        <button onClick={() => setShowCreate(true)} className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition-all pointer-events-auto">
          <Plus size={20} />
        </button>
      </div>

      {/* Nav desktop */}
      <button onClick={goPrev} disabled={currentIndex === 0} className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-20 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur items-center justify-center text-white hover:bg-white/30 transition-all disabled:opacity-30">
        <ChevronUp size={22} />
      </button>
      <button onClick={goNext} disabled={currentIndex === reels.length - 1} className="hidden md:flex absolute left-1/2 -translate-x-1/2 bottom-8 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur items-center justify-center text-white hover:bg-white/30 transition-all disabled:opacity-30">
        <ChevronDown size={22} />
      </button>

      {reels.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white gap-4">
          <Play size={48} className="opacity-40" />
          <p className="text-lg opacity-60">Aucun reel pour le moment</p>
          <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-white text-black font-semibold rounded-full">Créer le premier reel</button>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {reels.map((reel, index) => (
            <div key={reel.id} className="absolute inset-0 transition-transform duration-300 ease-in-out" style={{ transform: `translateY(${(index - currentIndex) * 100}%)` }}>

              {reel.media_url?.[0] && (
                <video ref={el => { videoRefs.current[index] = el; }} src={reel.media_url[0]} className="w-full h-full object-cover" loop muted={muted} playsInline onClick={() => togglePlay(index)} />
              )}

              {!playing && index === currentIndex && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
                    <Play size={32} className="text-white fill-white ml-1" />
                  </div>
                </div>
              )}

              {/* Bottom info */}
              <div className="absolute bottom-0 inset-x-0 pb-24 md:pb-8 px-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                <div className="max-w-[75%]">
                  <NextLink href={`/profile/${reel.author?.username}`} className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shrink-0">
                      {reel.author?.avatar_url
                        ? <Image src={reel.author.avatar_url} alt="" width={36} height={36} className="object-cover w-full h-full" />
                        : <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">{getAvatarFallback(reel.author?.display_name ?? reel.author?.username)}</div>
                      }
                    </div>
                    <span className="text-white font-semibold text-sm">{reel.author?.display_name ?? reel.author?.username}</span>
                    <span className="text-white/70 text-xs border border-white/40 rounded px-1.5 py-0.5">Suivre</span>
                  </NextLink>
                  {reel.content && <p className="text-white text-sm line-clamp-2">{reel.content}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <Music2 size={12} className="text-white/70" />
                    <p className="text-white/70 text-xs truncate">Son original · {reel.author?.username}</p>
                  </div>
                </div>
              </div>

              {/* Right actions */}
              <div className="absolute right-3 bottom-28 md:bottom-16 flex flex-col items-center gap-5">
                <button onClick={() => toggleLike(reel.id, reel.is_liked ?? false)} className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-full bg-black/20 backdrop-blur flex items-center justify-center">
                    <Heart size={26} className={reel.is_liked ? 'fill-red-500 text-red-500' : 'text-white'} />
                  </div>
                  <span className="text-white text-xs font-medium">{reel.likes_count}</span>
                </button>

                <button onClick={() => { setShowComments(true); loadComments(reel.id); }} className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-full bg-black/20 backdrop-blur flex items-center justify-center">
                    <MessageCircle size={26} className="text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">{reel.comments_count ?? 0}</span>
                </button>

                <button onClick={() => shareReel(reel.id)} className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-full bg-black/20 backdrop-blur flex items-center justify-center">
                    <Share2 size={24} className="text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">Partager</span>
                </button>

                <button onClick={() => toggleSave(reel.id)} className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-full bg-black/20 backdrop-blur flex items-center justify-center">
                    <Bookmark size={24} className={savedReels.has(reel.id) ? 'fill-white text-white' : 'text-white'} />
                  </div>
                </button>

                <button onClick={() => setShowMore(true)} className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-full bg-black/20 backdrop-blur flex items-center justify-center">
                    <MoreHorizontal size={24} className="text-white" />
                  </div>
                </button>

                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white mt-1 animate-spin" style={{ animationDuration: '8s' }}>
                  {reel.author?.avatar_url
                    ? <Image src={reel.author.avatar_url} alt="" width={44} height={44} className="object-cover w-full h-full" />
                    : <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-pink-400" />
                  }
                </div>
              </div>

              <button onClick={() => setMuted(!muted)} className="absolute top-16 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white">
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <div className="absolute top-16 left-1/2 -translate-x-1/2 flex gap-1">
                {reels.map((_, i) => (
                  <button key={i} onClick={() => setCurrentIndex(i)} className={`h-0.5 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comments Panel */}
      {showComments && currentReel && (
        <div className="absolute inset-x-0 bottom-0 z-40 bg-white dark:bg-gray-900 rounded-t-3xl flex flex-col" style={{ height: '70%' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-bold">Commentaires</h3>
            <button onClick={() => setShowComments(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {loadingComments ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-40" />
                <p>Aucun commentaire. Sois le premier !</p>
              </div>
            ) : (
              comments.map((comment) => {
                const c = comment as CommentWithAuthor;
                return (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                      {c.author?.avatar_url
                        ? <Image src={c.author.avatar_url} alt="" width={32} height={32} className="object-cover w-full h-full" />
                        : getAvatarFallback(c.author?.display_name ?? c.author?.username)
                      }
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold">{c.author?.display_name ?? c.author?.username}</p>
                      <p className="text-sm mt-0.5">{c.content}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <input
              value={newComment}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') submitComment(currentReel.id); }}
              placeholder="Ajouter un commentaire…"
              className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm border-none outline-none"
            />
            <button onClick={() => submitComment(currentReel.id)} disabled={!newComment.trim()} className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center text-white disabled:opacity-40 transition-all">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* More Menu */}
      {showMore && currentReel && (
        <div className="absolute inset-0 z-40 flex items-end" onClick={() => setShowMore(false)}>
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-3xl p-2 pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

            <button onClick={() => copyLink(currentReel.id)} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all">
              {copiedLink ? <Check size={20} className="text-green-500" /> : <Link size={20} className="text-gray-600 dark:text-gray-300" />}
              <span className="text-sm font-medium">{copiedLink ? 'Lien copié !' : 'Copier le lien'}</span>
            </button>

            <button onClick={() => shareReel(currentReel.id)} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all">
              <Share2 size={20} className="text-gray-600 dark:text-gray-300" />
              <span className="text-sm font-medium">Partager</span>
            </button>

            <button onClick={() => toggleSave(currentReel.id)} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all">
              <Bookmark size={20} className={savedReels.has(currentReel.id) ? 'fill-indigo-500 text-indigo-500' : 'text-gray-600 dark:text-gray-300'} />
              <span className="text-sm font-medium">{savedReels.has(currentReel.id) ? 'Retirer des favoris' : 'Sauvegarder'}</span>
            </button>

            <button onClick={() => reportReel(currentReel.id)} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all">
              <Flag size={20} className="text-orange-500" />
              <span className="text-sm font-medium text-orange-500">Signaler</span>
            </button>

            {currentReel.author_id === currentUserId && (
              <button onClick={() => deleteReel(currentReel.id)} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all">
                <Trash2 size={20} className="text-red-500" />
                <span className="text-sm font-medium text-red-500">Supprimer</span>
              </button>
            )}

            <button onClick={() => setShowMore(false)} className="w-full flex items-center justify-center px-4 py-3.5 mt-1 bg-gray-100 dark:bg-gray-800 rounded-xl font-medium text-sm">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur flex items-end md:items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Nouveau Reel</h2>
              <button onClick={() => { setShowCreate(false); setMediaPreview(null); setReelText(''); }} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            {mediaPreview ? (
              <div className="relative w-full aspect-[9/16] max-h-72 rounded-2xl overflow-hidden bg-black">
                <video src={mediaPreview} className="w-full h-full object-cover" controls />
                <button onClick={() => { setMediaFile(null); setMediaPreview(null); }} className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-all">
                <Upload size={28} />
                <span className="text-sm font-medium">Ajoute une vidéo</span>
                <span className="text-xs opacity-60">MP4, MOV jusqu'à 60 secondes</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
            <input value={reelText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReelText(e.target.value)} placeholder="Ajoute une description…" className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-indigo-400" maxLength={300} />
            <button onClick={publishReel} disabled={posting || !mediaFile} className="w-full py-3 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-40">
              {posting ? 'Publication…' : 'Publier le Reel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
