'use client';

import { useState, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import type { Post } from '@/types';
import { getAvatarFallback, getStoryExpiryDate } from '@/lib/utils';
import { Plus, X, Camera, Type, Upload } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  stories: Post[];
  currentUserId: string;
}

export default function StoriesPageClient({ stories: initialStories, currentUserId }: Props) {
  const supabase = createBrowserClient();
  const [stories, setStories] = useState<Post[]>(initialStories);
  const [activeStory, setActiveStory] = useState<Post | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [storyText, setStoryText] = useState('');
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

  async function publishStory() {
    if (!storyText.trim() && !mediaFile) {
      toast.error('Ajoute du texte ou une image !');
      return;
    }
    setPosting(true);

    try {
      let mediaUrl: string | null = null;

      if (mediaFile) {
        const ext = mediaFile.name.split('.').pop();
        const path = `stories/${currentUserId}/${uuidv4()}.${ext}`;
        const { error } = await supabase.storage.from('media').upload(path, mediaFile);
        if (error) throw new Error(error.message);
        const { data } = supabase.storage.from('media').getPublicUrl(path);
        mediaUrl = data.publicUrl;
      }

      const { data: story, error } = await supabase
        .from('posts')
        .insert({
          author_id: currentUserId,
          content: storyText.trim(),
          media_url: mediaUrl ? [mediaUrl] : null,
          post_type: 'story',
          visibility: 'public',
          expires_at: getStoryExpiryDate(),
        })
        .select('*, author:profiles(*)')
        .single();

      if (error) throw new Error(error.message);

      toast.success('Story publiée ! 📖');
      setStories(prev => [{ ...story, is_liked: false }, ...prev]);
      setShowCreate(false);
      setStoryText('');
      setMediaFile(null);
      setMediaPreview(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Échec de la publication');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl">Stories</h1>
        <button onClick={() => setShowCreate(true)} className="btn-nova text-sm">
          <Plus size={16} />
          Créer une story
        </button>
      </div>

      {/* Formulaire de création */}
      {showCreate && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Nouvelle story</h2>
            <button onClick={() => { setShowCreate(false); setMediaPreview(null); setStoryText(''); }} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          {/* Aperçu de la story */}
          <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-nova-gradient flex items-center justify-center">
            {mediaPreview ? (
              <>
                <Image src={mediaPreview} alt="Preview" fill className="object-cover" />
                <button
                  onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <p className="text-white text-xl font-bold text-center px-6 leading-relaxed">
                {storyText || 'Aperçu de ta story'}
              </p>
            )}
          </div>

          {/* Texte */}
          <div className="flex items-center gap-2">
            <Type size={16} className="text-gray-400 shrink-0" />
            <input
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder="Ajoute du texte à ta story…"
              className="input flex-1"
              maxLength={200}
            />
          </div>

          {/* Upload image */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 hover:border-nova-400 hover:text-nova-500 transition-colors"
          >
            <Upload size={16} />
            {mediaFile ? mediaFile.name : 'Ajouter une image ou vidéo'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

          <button onClick={publishStory} disabled={posting} className="btn-nova w-full">
            {posting ? 'Publication…' : 'Publier la story'}
          </button>
        </div>
      )}

      {/* Grille des stories */}
      {stories.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <Camera size={32} className="mx-auto mb-3 opacity-40" />
          <p>Aucune story pour le moment.</p>
          <p className="text-sm mt-1">Sois le premier à en publier une !</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stories.map(story => (
            <button
              key={story.id}
              onClick={() => setActiveStory(story)}
              className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-nova-gradient group"
            >
              {story.media_url?.[0] ? (
                <Image src={story.media_url[0]} alt="Story" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <p className="text-white text-sm font-bold text-center line-clamp-4">{story.content}</p>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/20 overflow-hidden shrink-0">
                    {story.author?.avatar_url ? (
                      <Image src={story.author.avatar_url} alt="" width={28} height={28} className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                        {getAvatarFallback(story.author?.display_name ?? story.author?.username)}
                      </div>
                    )}
                  </div>
                  <p className="text-white text-xs font-medium truncate">
                    {story.author?.display_name ?? story.author?.username}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Visionneur de story */}
      {activeStory && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <button onClick={() => setActiveStory(null)} className="absolute top-4 right-4 z-10 text-white p-2">
            <X size={28} />
          </button>
          <div className="relative w-full max-w-sm h-[80vh] rounded-2xl overflow-hidden">
            <div className="absolute top-3 inset-x-3 z-10 h-0.5 bg-white/30 rounded-full">
              <div className="h-full bg-white rounded-full animate-[progress_5s_linear_forwards]" />
            </div>
            {activeStory.media_url?.[0] ? (
              <Image src={activeStory.media_url[0]} alt="Story" fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-nova-gradient flex items-center justify-center p-8">
                <p className="text-white text-xl font-bold text-center leading-relaxed">{activeStory.content}</p>
              </div>
            )}
            <div className="absolute bottom-4 inset-x-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 overflow-hidden">
                {activeStory.author?.avatar_url && (
                  <Image src={activeStory.author.avatar_url} alt="" width={36} height={36} className="object-cover" />
                )}
              </div>
              <p className="text-white text-sm font-semibold">
                {activeStory.author?.display_name ?? activeStory.author?.username}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}