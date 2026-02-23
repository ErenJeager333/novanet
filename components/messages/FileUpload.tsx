'use client';

import React, { useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import { Paperclip, Image as ImageIcon, File, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface FileUploadProps {
  currentUserId: string;
  conversationId: string;
  onFileSent: (url: string, type: 'image' | 'video' | 'file', name: string) => void;
}

export default function FileUpload({ currentUserId, conversationId, onFileSent }: FileUploadProps) {
  const supabase = createBrowserClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleUpload(file: File, type: 'image' | 'video' | 'file') {
    setLoading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `messages/${currentUserId}/${uuidv4()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(path, file);
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('media').getPublicUrl(path);
      onFileSent(data.publicUrl, type, file.name);
      toast.success('Fichier envoyé !');
    } catch {
      toast.error('Échec de l\'envoi du fichier');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative group">
      <button
        className={cn(
          'p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a3942] transition-all',
          loading ? 'opacity-50 cursor-not-allowed' : ''
        )}
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        title="Envoyer un fichier"
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-gray-400 border-t-indigo-500 rounded-full animate-spin block" />
        ) : (
          <Paperclip size={22} />
        )}
      </button>

      {/* Menu */}
      <div className="absolute bottom-12 left-0 bg-white dark:bg-[#233138] rounded-2xl shadow-xl border border-gray-100 dark:border-[#2a3942] py-2 w-44 hidden group-hover:block z-20">
        <button
          onClick={() => imageRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-[#2a3942] transition-colors text-gray-700 dark:text-gray-200"
        >
          <ImageIcon size={16} className="text-indigo-500" />
          Image / Photo
        </button>
        <button
          onClick={() => videoRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-[#2a3942] transition-colors text-gray-700 dark:text-gray-200"
        >
          <Film size={16} className="text-pink-500" />
          Vidéo
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-[#2a3942] transition-colors text-gray-700 dark:text-gray-200"
        >
          <File size={16} className="text-green-500" />
          Document
        </button>
      </div>

      {/* Inputs cachés */}
      <input ref={imageRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'image')} />
      <input ref={videoRef} type="file" accept="video/*" className="hidden"
        onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'video')} />
      <input ref={fileRef} type="file" className="hidden"
        onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'file')} />
    </div>
  );
}