'use client';

import { useState, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import { containsBlockedWords, getStoryExpiryDate, cn } from '@/lib/utils';
import type { Post, Visibility, PostType } from '@/types';
import {
  Image as ImageIcon, Globe, Users, Lock,
  X, Timer, Smile, MapPin, Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface PostComposerProps {
  currentUserId: string;
  groupId?: string;
  onPostCreated: (post: Post) => void;
}

const MAX_CHARS = 500;

const visibilityOptions: { value: Visibility; label: string; icon: typeof Globe }[] = [
  { value: 'public',  label: 'Public',  icon: Globe  },
  { value: 'friends', label: 'Amis',    icon: Users  },
  { value: 'private', label: 'Privé',   icon: Lock   },
];

export default function PostComposer({ currentUserId, groupId, onPostCreated }: PostComposerProps) {
  const supabase = createBrowserClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [isStory, setIsStory] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const charsLeft = MAX_CHARS - content.length;
  const progress = (content.length / MAX_CHARS) * 100;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setMediaFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      setMediaPreviews(prev => [...prev, URL.createObjectURL(file)]);
    });
  }

  function removeMedia(index: number) {
    URL.revokeObjectURL(mediaPreviews[index]);
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function uploadMedia(file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `posts/${currentUserId}/${uuidv4()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit() {
    if (!content.trim() && mediaFiles.length === 0) {
      toast.error('Écris quelque chose ou ajoute une image !');
      return;
    }
    if (content.length > MAX_CHARS) {
      toast.error(`Post trop long (max ${MAX_CHARS} caractères)`);
      return;
    }

    const { data: blockedWordsData } = await supabase.from('blocked_words').select('word');
    const blockedList = (blockedWordsData ?? []).map(r => r.word);
    if (containsBlockedWords(content, blockedList)) {
      toast.error('Ton post contient des mots qui violent nos règles communautaires.');
      return;
    }

    setLoading(true);
    try {
      const mediaUrls: string[] = [];
      for (const file of mediaFiles) {
        mediaUrls.push(await uploadMedia(file));
      }

      let postType: PostType = 'text';
      if (isStory) postType = 'story';
      else if (mediaFiles.some(f => f.type.startsWith('video'))) postType = 'video';
      else if (mediaFiles.length > 0) postType = 'image';

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          author_id: currentUserId,
          content: content.trim(),
          media_url: mediaUrls.length > 0 ? mediaUrls : null,
          post_type: postType,
          visibility,
          group_id: groupId ?? null,
          expires_at: isStory ? getStoryExpiryDate() : null,
        })
        .select('*, author:profiles(*)')
        .single();

      if (error) throw new Error(error.message);

      toast.success(isStory ? '📖 Story publiée !' : '✅ Post publié !');
      onPostCreated({ ...post, is_liked: false });
      setContent('');
      setMediaFiles([]);
      setMediaPreviews([]);
      setIsStory(false);
      setFocused(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Échec de la publication');
    } finally {
      setLoading(false);
    }
  }

  const VisIcon = visibilityOptions.find(v => v.value === visibility)!.icon;

  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 rounded-2xl border transition-all duration-300',
      focused
        ? 'border-indigo-300 dark:border-indigo-700 shadow-lg shadow-indigo-50 dark:shadow-none'
        : 'border-gray-100 dark:border-gray-800 shadow-sm'
    )}>
      {/* Zone de texte */}
      <div className="p-4 pb-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Quoi de neuf ? Partage quelque chose..."
          rows={focused ? 4 : 2}
          className="w-full resize-none border-none outline-none bg-transparent text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-all duration-300 leading-relaxed"
        />
      </div>

      {/* Aperçu des médias */}
      {mediaPreviews.length > 0 && (
        <div className={cn(
          'px-4 pb-3 grid gap-2',
          mediaPreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
        )}>
          {mediaPreviews.map((url, i) => (
            <div key={i} className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group">
              {mediaFiles[i]?.type.startsWith('video') ? (
                <video src={url} className="w-full h-full object-cover" />
              ) : (
                <img src={url} alt="" className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => removeMedia(i)}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Barre de progression caractères */}
      {content.length > 0 && (
        <div className="px-4 pb-1">
          <div className="h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                charsLeft < 50 ? 'bg-red-400' : charsLeft < 100 ? 'bg-yellow-400' : 'bg-indigo-400'
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-1 px-3 py-2.5 border-t border-gray-50 dark:border-gray-800">
        {/* Image */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
          title="Ajouter une image ou vidéo"
        >
          <ImageIcon size={18} />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />

        {/* Story toggle */}
        <button
          onClick={() => setIsStory(!isStory)}
          className={cn(
            'p-2 rounded-xl transition-all',
            isStory
              ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
              : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
          )}
          title="Publier en story (disparaît dans 24h)"
        >
          <Timer size={18} />
        </button>

        {/* Visibilité */}
        <div className="relative flex items-center">
          <VisIcon size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
          <select
            value={visibility}
            onChange={e => setVisibility(e.target.value as Visibility)}
            className="pl-7 pr-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none cursor-pointer"
          >
            {visibilityOptions.map(v => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Compteur */}
        {content.length > 0 && (
          <span className={cn(
            'ml-auto text-xs font-medium tabular-nums',
            charsLeft < 50 ? 'text-red-400' : 'text-gray-400'
          )}>
            {charsLeft}
          </span>
        )}

        {/* Publier */}
        <button
          onClick={handleSubmit}
          disabled={loading || (content.trim().length === 0 && mediaFiles.length === 0)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
            content.length === 0 && mediaFiles.length === 0
              ? 'ml-auto bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed'
              : 'ml-auto bg-gradient-to-r from-indigo-500 to-pink-500 text-white hover:opacity-90 active:scale-95 shadow-sm hover:shadow-md'
          )}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send size={15} />
              {isStory ? 'Story' : 'Publier'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}