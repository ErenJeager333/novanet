'use client';

import { useState, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import type { Post } from '@/types';
import { getAvatarFallback } from '@/lib/utils';
import { Plus, X, Upload, Heart, MessageCircle, Play } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  reels: Post[];
  currentUserId: string;
}

export default function ReelsPageClient({ reels: initialReels, currentUserId }: Props) {
  const supabase = createBrowserClient();
  const [reels, setReels] = useState<Post[]>(initialReels);
  const [showCreate, setShowCreate] = useState(false);
  const [reelText, setReelText] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  }

  async function publishReel() {
    if (!mediaFile) {
      toast.error('Ajoute une vidéo pour créer un reel !');
      return;
    }
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
      toast.error(err instanceof Error ? err.message : 'Échec de la publication');
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(postId: string, isLiked: boolean) {
    setReels(prev => prev.map(p =>
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
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl">Reels</h1>
        <button onClick={() => setShowCreate(true)} className="btn-nova text-sm">
          <Plus size={16} />
          Créer un reel
        </button>
      </div>

      {/* Formulaire de création */}
      {showCreate && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Nouveau reel</h2>
            <button onClick={() => { setShowCreate(false); setMediaPreview(null); setReelText(''); }} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          {/* Aperçu vidéo */}
          {mediaPreview && (
            <div className="relative w-full aspect-[9/16] max-h-64 rounded-2xl overflow-hidden bg-black">
              <video src={mediaPreview} className="w-full h-full object-cover" controls />
              <button
                onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Upload vidéo */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 hover:border-nova-400 hover:text-nova-500 transition-colors"
          >
            <Upload size={18} />
            {mediaFile ? mediaFile.name : 'Ajoute une vidéo (obligatoire)'}
          </button>
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />

          {/* Description */}
          <input
            value={reelText}
            onChange={(e) => setReelText(e.target.value)}
            placeholder="Ajoute une description…"
            className="input w-full"
            maxLength={300}
          />

          <button onClick={publishReel} disabled={posting || !mediaFile} className="btn-nova w-full">
            {posting ? 'Publication…' : 'Publier le reel'}
          </button>
        </div>
      )}

      {/* Grille des reels */}
      {reels.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <Play size={32} className="mx-auto mb-3 opacity-40" />
          <p>Aucun reel pour le moment.</p>
          <p className="text-sm mt-1">Sois le premier à en publier un !</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {reels.map(reel => (
            <div key={reel.id} className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black group">
              {reel.media_url?.[0] && (
                <video
                  src={reel.media_url[0]}
                  className="w-full h-full object-cover"
                  loop
                  muted
                  onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                  onMouseLeave={e => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
                />
              )}

              {/* Overlay infos */}
              <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-white/20 overflow-hidden shrink-0">
                      {reel.author?.avatar_url ? (
                        <Image src={reel.author.avatar_url} alt="" width={28} height={28} className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                          {getAvatarFallback(reel.author?.display_name ?? reel.author?.username)}
                        </div>
                      )}
                    </div>
                    <p className="text-white text-xs truncate">
                      {reel.author?.display_name ?? reel.author?.username}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleLike(reel.id, reel.is_liked ?? false)}
                    className="flex items-center gap-1 text-white"
                  >
                    <Heart
                      size={16}
                      className={reel.is_liked ? 'fill-red-500 text-red-500' : ''}
                    />
                    <span className="text-xs">{reel.likes_count}</span>
                  </button>
                </div>
                {reel.content && (
                  <p className="text-white text-xs mt-1 line-clamp-2">{reel.content}</p>
                )}
              </div>

              {/* Icône Play au centre */}
              <div className="absolute inset-0 flex items-center justify-center opacity-60 group-hover:opacity-0 transition-opacity">
                <Play size={32} className="text-white" fill="white" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}