'use client';

import React, { useState, useRef } from 'react';
import { Mic, Square, Send, X } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface VoiceRecorderProps {
  currentUserId: string;
  conversationId: string;
  onVoiceSent: (url: string) => void;
}

export default function VoiceRecorder({ currentUserId, conversationId, onVoiceSent }: VoiceRecorderProps) {
  const supabase = createBrowserClient();
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } catch {
      toast.error('Impossible d\'accéder au microphone');
    }
  }

  function stopRecording(send: boolean) {
    if (!mediaRecorderRef.current) return;

    if (timerRef.current) clearInterval(timerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      if (send && chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadVoice(blob);
      }
      chunksRef.current = [];
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    setRecording(false);
    setSeconds(0);
  }

  async function uploadVoice(blob: Blob) {
    setUploading(true);
    try {
      const path = `voices/${currentUserId}/${uuidv4()}.webm`;
      const { error } = await supabase.storage.from('media').upload(path, blob);
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('media').getPublicUrl(path);
      onVoiceSent(data.publicUrl);
      toast.success('Message vocal envoyé !');
    } catch {
      toast.error('Échec de l\'envoi');
    } finally {
      setUploading(false);
    }
  }

  if (uploading) {
    return (
      <div className="flex items-center gap-2 px-3 text-indigo-500">
        <span className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-xs">Envoi...</span>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        {/* Timer + onde animée */}
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-mono text-red-500">{formatTime(seconds)}</span>
        </div>
        {/* Annuler */}
        <button
          onClick={() => stopRecording(false)}
          className="p-2 rounded-full bg-gray-200 dark:bg-[#2a3942] text-gray-500 hover:bg-gray-300 transition-all"
          title="Annuler"
        >
          <X size={18} />
        </button>
        {/* Envoyer */}
        <button
          onClick={() => stopRecording(true)}
          className="p-2 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white transition-all active:scale-95"
          title="Envoyer"
        >
          <Send size={18} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a3942] transition-all"
      title="Message vocal"
    >
      <Mic size={22} />
    </button>
  );
}