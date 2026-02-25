'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import type { Post } from '@/types';
import { getAvatarFallback } from '@/lib/utils';
import {
  Plus, X, Upload, Heart, MessageCircle,
  Play, Volume2, VolumeX, Share2, Bookmark,
  MoreHorizontal, Music2, ChevronUp, ChevronDown
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-play/pause based on current index
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === currentIndex) {
        video.play().catch(() => {});
        setPlaying(true);
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex]);

  // Mute/unmute all videos
  useEffect(() => {
    videoRefs.current.forEach(video => {
      if (video) video.muted = muted;
    });
  }, [muted]);

  function goNext() {
    if (currentIndex < reels.length - 1) setCurrentIndex(i => i + 1);
  }

  function goPrev() {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowUp') goPrev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, reels.length]);

  // Touch swipe
  const touchStartY = useRef(0);
  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }
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
        .insert({
          author_id: currentUserId,
          content: reelText.trim(),
          media_url: [urlData.publicUrl],
          post_type: 'reel',
          visibility: 'public',
        })
        .select('*, author:profiles(*)')
        .single();
      if (error) throw new Error(error.message);
      toast.success('Reel publié ! 🎬');
      setReels(prev => [{ ...reel, is_liked: false }, ...prev]);
      setShowCreate(false);
      setReelText('');
      setMediaFile(null);
      setMediaPreview(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Échec');
    } finally {
      setPosting(false);
    }
  }

  const currentReel = reels[currentIndex];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">

      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 pt-12 pb-4 bg-gradient-to-b from-black/60 to-transparent">
        <h1 className="text-white font-bold text-lg">Reels</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition-all"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Navigation arrows (desktop) */}
      <button
        onClick={goPrev}
        disabled={currentIndex === 0}
        className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-20 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur items-center justify-center text-white hover:bg-white/30 transition-all disabled:opacity-30"
      >
        <ChevronUp size={22} />
      </button>
      <button
        onClick={goNext}
        disabled={currentIndex === reels.length - 1}
        className="hidden md:flex absolute left-1/2 -translate-x-1/2 bottom-8 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur items-center justify-center text-white hover:bg-white/30 transition-all disabled:opacity-30"
      >
        <ChevronDown size={22} />
      </button>

      {/* Reels container */}
      {reels.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white gap-4">
          <Play size={48} className="opacity-40" />
          <p className="text-lg opacity-60">Aucun reel pour le moment</p>
          <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-all">
            Créer le premier reel
          </button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {reels.map((reel, index) => (
            <div
              key={reel.id}
              className="absolute inset-0 transition-transform duration-300 ease-in-out"
              style={{ transform: `translateY(${(index - currentIndex) * 100}%)` }}
            >
              {/* Video */}
              {reel.media_url?.[0] && (
                <video
                  ref={el => { videoRefs.current[index] = el; }}
                  src={reel.media_url[0]}
                  className="w-full h-full object-cover"
                  loop
                  muted={muted}
                  playsInline
                  onClick={() => togglePlay(index)}
                />
              )}

              {/* Play indicator */}
              {!playing && index === currentIndex && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
                    <Play size={32} className="text-white fill-white ml-1" />
                  </div>
                </div>
              )}

              {/* Bottom info */}
              <div className="absolute bottom-0 inset-x-0 pb-24 md:pb-8 px-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                <div className="max-w-[75%]">
                  {/* Author */}
                  <Link href={`/profile/${reel.author?.username}`} className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shrink-0">
                      {reel.author?.avatar_url ? (
                        <Image src={reel.author.avatar_url} alt="" width={36} height={36} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
                          {getAvatarFallback(reel.author?.display_name ?? reel.author?.username)}
                        </div>
                      )}
                    </div>
                    <span className="text-white font-semibold text-sm">
                      {reel.author?.display_name ?? reel.author?.username}
                    </span>
                    <span className="text-white/60 text-xs border border-white/40 rounded px-1.5 py-0.5">
                      Suivre
                    </span>
                  </Link>

                  {/* Caption */}
                  {reel.content && (
                    <p className="text-white text-sm leading-relaxed line-clamp-2">{reel.content}</p>
                  )}

                  {/* Music */}
                  <div className="flex items-center gap-2 mt-2">
                    <Music2 size={12} className="text-white/70" />
                    <p className="text-white/70 text-xs truncate">Son original · {reel.author?.username}</p>
                  </div>
                </div>
              </div>

              {/* Right actions */}
              <div className="absolute right-3 bottom-28 md:bottom-16 flex flex-col items-center gap-5">
                {/* Like */}
                <button
                  onClick={() => toggleLike(reel.id, reel.is_liked ?? false)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-11 h-11 rounded-full bg-black/20 backdrop-blur flex items-center justify-center">
                    <Heart
                      size={26}
                      className={reel.is_liked ? 'fill-red-500 text-red-500' : 'text-white'}
                    />
                  </div>
                  <span className="text-white text-xs font-medium">{reel.likes_count}</span>
                </button>

                {/* Comments */}
                <button
                  onClick={() => setShowComments(true)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-11 h-11 rounded-full bg-black/20 backdrop-blur flex items-center justify-center">
                    <MessageCircle size={26} className="text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">{reel.comments_count ?? 0}</span>
                </button>

                {/* Share */}
                <button className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-full bg-black/20 backdrop-blur flex items-center justify-center">
                    <Share2 size={24} className="text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">Partager</span>
                </button>

                {/* Save */}
                <button className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-full bg-black/20 backdrop-blur flex items-center justify-center">
                    <Bookmark size={24} className="text-white" />
                  </div>
                </button>

                {/* More */}
                <button className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-full bg-black/20 backdrop-blur flex items-center justify-center">
                    <MoreHorizontal size={24} className="text-white" />
                  </div>
                </button>

                {/* Author avatar (rotating) */}
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white mt-1 animate-spin" style={{ animationDuration: '8s' }}>
                  {reel.author?.avatar_url ? (
                    <Image src={reel.author.avatar_url} alt="" width={44} height={44} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-pink-400" />
                  )}
                </div>
              </div>

              {/* Mute button */}
              <button
                onClick={() => setMuted(!muted)}
                className="absolute top-16 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-all"
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              {/* Progress dots */}
              <div className="absolute top-16 left-1/2 -translate-x-1/2 flex gap-1">
                {reels.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`h-0.5 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal création */}
      {showCreate && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur flex items-end md:items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Nouveau Reel</h2>
              <button onClick={() => { setShowCreate(false); setMediaPreview(null); setReelText(''); }}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>

            {mediaPreview ? (
              <div className="relative w-full aspect-[9/16] max-h-72 rounded-2xl overflow-hidden bg-black">
                <video src={mediaPreview} className="w-full h-full object-cover" controls />
                <button
                  onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-all"
              >
                <Upload size={28} />
                <span className="text-sm font-medium">Ajoute une vidéo</span>
                <span className="text-xs opacity-60">MP4, MOV jusqu'à 60 secondes</span>
              </button>
            )}

            <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />

            <input
              value={reelText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReelText(e.target.value)}
              placeholder="Ajoute une description…"
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-indigo-400"
              maxLength={300}
            />

            <button
              onClick={publishReel}
              disabled={posting || !mediaFile}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-40"
            >
              {posting ? 'Publication…' : 'Publier le Reel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}