'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import type { Message, Profile } from '@/types';
import { getAvatarFallback, cn } from '@/lib/utils';
import Image from 'next/image';
import {
  Send, Plus, Timer, Check, CheckCheck,
  X, ArrowLeft, Search, MoreVertical,
  Phone, Video, File, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import CallModal from '@/components/messages/CallModal';
import FileUpload from '@/components/messages/FileUpload';
import VoiceRecorder from '@/components/messages/VoiceRecorder';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface Conversation {
  id: string;
  is_group: boolean;
  name: string | null;
  participants: { user: Profile }[];
}

interface CallState {
  mode: 'audio' | 'video';
  isIncoming: boolean;
  remoteUserId: string;
  remoteName: string;
  remoteAvatar: string | null;
}

interface MessagesClientProps {
  currentUserId: string;
  initialConversations: Conversation[];
}

export default function MessagesClient({ currentUserId, initialConversations }: MessagesClientProps) {
  const supabaseRef = useRef(createBrowserClient());
  const supabase = supabaseRef.current;

  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [ephemeral, setEphemeral] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newConvUsername, setNewConvUsername] = useState('');
  const [showNewConv, setShowNewConv] = useState(false);
  const [search, setSearch] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [activeCall, setActiveCall] = useState<CallState | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedConv) return;

    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('conversation_id', selectedConv!.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100);

      setMessages((data as Message[]) ?? []);

      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', selectedConv!.id)
        .neq('sender_id', currentUserId)
        .eq('is_read', false);
    }

    loadMessages();

    const msgChannel = supabase
      .channel(`messages:${selectedConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, async (payload: { new: Record<string, unknown> }) => {
        const { data: sender } = await supabase
          .from('profiles').select('*')
          .eq('id', payload.new.sender_id as string).single();
        setMessages((prev: Message[]) => [...prev, { ...payload.new, sender } as unknown as Message]);
        if (payload.new.sender_id !== currentUserId) {
          await supabase.from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', payload.new.id as string);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload: { new: Record<string, unknown> }) => {
        setMessages((prev: Message[]) => prev.map((m: Message) =>
          m.id === (payload.new.id as string)
            ? { ...m, is_read: payload.new.is_read as boolean, read_at: payload.new.read_at as string | null }
            : m
        ));
      })
      .subscribe();

    const callChannel = supabase
      .channel(`incoming-call:${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'call_signals',
        filter: `receiver_id=eq.${currentUserId}`,
      }, async (payload: { new: Record<string, unknown> }) => {
        if (payload.new.type === 'offer') {
          const { data: caller } = await supabase
            .from('profiles').select('*')
            .eq('id', payload.new.sender_id as string).single();
          if (caller) {
            setActiveCall({
              mode: 'audio',
              isIncoming: true,
              remoteUserId: caller.id,
              remoteName: caller.display_name ?? caller.username,
              remoteAvatar: caller.avatar_url,
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(callChannel);
    };
  }, [selectedConv, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!newMsg.trim() || !selectedConv) return;
    setLoading(true);
    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: currentUserId,
      content: newMsg.trim(),
      expires_at: ephemeral ? new Date(Date.now() + 60000).toISOString() : null,
      is_read: false,
    });
    if (error) toast.error("Échec de l'envoi");
    else setNewMsg('');
    setLoading(false);
  }

  async function sendFile(url: string, type: 'image' | 'video' | 'file', name: string) {
    if (!selectedConv) return;
    await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: currentUserId,
      content: '',
      file_url: url,
      file_type: type,
      file_name: name,
      is_read: false,
    });
  }

  async function sendVoice(url: string) {
    if (!selectedConv) return;
    await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: currentUserId,
      content: '',
      voice_url: url,
      is_read: false,
    });
  }

  function startCall(mode: 'audio' | 'video') {
    if (!selectedConv) return;
    const other = selectedConv.participants?.find(p => p.user.id !== currentUserId);
    if (!other) return;
    setActiveCall({
      mode,
      isIncoming: false,
      remoteUserId: other.user.id,
      remoteName: other.user.display_name ?? other.user.username,
      remoteAvatar: other.user.avatar_url ?? null,
    });
  }

  async function startNewConversation() {
    if (!newConvUsername.trim()) return;
    const { data: targetUser } = await supabase
      .from('profiles').select('id')
      .eq('username', newConvUsername.trim().toLowerCase()).single();

    if (!targetUser) { toast.error('Utilisateur introuvable'); return; }

    const { data: conv } = await supabase
      .from('conversations').insert({ is_group: false }).select('*').single();

    if (!conv) { toast.error('Échec de la création'); return; }

    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: currentUserId },
      { conversation_id: conv.id, user_id: targetUser.id },
    ]);

    const { data } = await supabase
      .from('conversations')
      .select('*, participants:conversation_participants(user:profiles(*))')
      .eq('id', conv.id).single();

    if (data) {
      const newConv = data as unknown as Conversation;
      setConversations((prev: Conversation[]) => [newConv, ...prev]);
      selectConv(newConv);
    }
    toast.success('Conversation démarrée !');
    setShowNewConv(false);
    setNewConvUsername('');
  }

  function selectConv(conv: Conversation) {
    setSelectedConv(conv);
    setShowMobileChat(true);
    setShowEmojiPicker(false);
  }

  function goBack() {
    setShowMobileChat(false);
    setSelectedConv(null);
    setShowEmojiPicker(false);
  }

  function getConvName(conv: Conversation): string {
    if (conv.name) return conv.name;
    const other = conv.participants?.find(p => p.user.id !== currentUserId);
    return other?.user.display_name ?? other?.user.username ?? 'Inconnu';
  }

  function getConvAvatar(conv: Conversation): string | null {
    const other = conv.participants?.find(p => p.user.id !== currentUserId);
    return other?.user.avatar_url ?? null;
  }

  const filteredConvs = conversations.filter(c =>
    getConvName(c).toLowerCase().includes(search.toLowerCase())
  );

  function renderMessageContent(msg: Message) {
    // Message vocal
    if (msg.voice_url) {
      return (
        <div className="flex items-center gap-2 py-1">
          <audio controls src={msg.voice_url} className="h-8 w-40 sm:w-48" />
        </div>
      );
    }
    if (msg.file_url && msg.file_type === 'image') {
      return (
        <div className="relative w-48 h-48 rounded-xl overflow-hidden mt-1">
          <Image src={msg.file_url} alt={msg.file_name ?? 'image'} fill className="object-cover" />
        </div>
      );
    }
    if (msg.file_url && msg.file_type === 'video') {
      return (
        <video src={msg.file_url} controls className="w-48 rounded-xl mt-1 max-h-40" />
      );
    }
    if (msg.file_url && msg.file_type === 'file') {
      return (
        <a
          href={msg.file_url}
          target="_blank"
          rel="noreferrer"
          download={msg.file_name ?? 'fichier'}
          className="flex items-center gap-2 mt-1 px-3 py-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all"
        >
          <File size={18} />
          <span className="text-sm truncate max-w-[140px]">{msg.file_name ?? 'Fichier'}</span>
          <Download size={14} className="shrink-0" />
        </a>
      );
    }
    const isExpired = msg.expires_at && new Date(msg.expires_at) < new Date();
    return (
      <>
        <p className={cn('text-sm leading-relaxed break-words', isExpired ? 'italic opacity-50' : '')}>
          {isExpired ? 'Message expiré ⏱' : msg.content}
        </p>
        {msg.expires_at && !isExpired && (
          <p className="text-[10px] opacity-60 mt-0.5">⏱ Éphémère</p>
        )}
      </>
    );
  }

  const ConvList = (
    <div className="flex flex-col h-full bg-white dark:bg-[#111b21]">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#202c33]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold">
            M
          </div>
          <span className="font-bold text-base dark:text-white">Messages</span>
        </div>
        <button
          onClick={() => setShowNewConv(!showNewConv)}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a3942] transition-all"
        >
          {showNewConv ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>

      {showNewConv && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-[#202c33] border-b border-gray-200 dark:border-[#2a3942] flex gap-2">
          <input
            value={newConvUsername}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewConvUsername(e.target.value)}
            placeholder="Entrer un username…"
            className="flex-1 px-3 py-2 bg-white dark:bg-[#2a3942] rounded-lg text-sm border-none outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && startNewConversation()}
            autoFocus
          />
          <button onClick={startNewConversation} className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 transition-all">
            OK
          </button>
        </div>
      )}

      <div className="px-3 py-2 bg-white dark:bg-[#111b21]">
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#202c33] rounded-lg px-3 py-2">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Rechercher une conversation"
            className="flex-1 bg-transparent text-sm border-none outline-none dark:text-gray-200 placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConvs.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">{search ? 'Aucun résultat' : 'Aucune conversation.'}</p>
            {!search && (
              <button onClick={() => setShowNewConv(true)} className="text-sm text-indigo-500 mt-2 font-medium">
                Commencer une conversation
              </button>
            )}
          </div>
        )}
        {filteredConvs.map((conv: Conversation) => {
          const name = getConvName(conv);
          const avatar = getConvAvatar(conv);
          const isSelected = selectedConv?.id === conv.id;
          return (
            <button
              key={conv.id}
              onClick={() => selectConv(conv)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#202c33] transition-all text-left border-b border-gray-50 dark:border-[#202c33]',
                isSelected ? 'bg-gray-100 dark:bg-[#2a3942]' : ''
              )}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-base font-bold overflow-hidden shrink-0">
                {avatar
                  ? <Image src={avatar} alt={name} width={48} height={48} className="object-cover w-full h-full" />
                  : getAvatarFallback(name)
                }
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold truncate dark:text-white">{name}</p>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">maintenant</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">Cliquer pour ouvrir</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const ChatArea = selectedConv ? (
    <div className="flex-1 flex flex-col min-w-0 bg-[#efeae2] dark:bg-[#0b141a]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-[#202c33] shadow-sm">
        <button onClick={goBack} className="md:hidden p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#2a3942] transition-all mr-1">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold overflow-hidden shrink-0">
          {getConvAvatar(selectedConv)
            ? <Image src={getConvAvatar(selectedConv) as string} alt="" width={40} height={40} className="object-cover" />
            : getAvatarFallback(getConvName(selectedConv))
          }
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm dark:text-white truncate">{getConvName(selectedConv)}</h3>
          <p className="text-xs text-green-500">en ligne</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => startCall('audio')}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a3942] transition-all"
            title="Appel audio"
          >
            <Phone size={20} />
          </button>
          <button
            onClick={() => startCall('video')}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a3942] transition-all"
            title="Appel vidéo"
          >
            <Video size={20} />
          </button>
          <button className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a3942] transition-all">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" onClick={() => setShowEmojiPicker(false)}>
        {messages.map((msg: Message) => {
          const isMine = msg.sender_id === currentUserId;
          const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          return (
            <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'relative max-w-[75%] sm:max-w-[60%] px-3 py-2 rounded-lg shadow-sm',
                isMine ? 'bg-[#d9fdd3] dark:bg-[#005c4b] rounded-br-none' : 'bg-white dark:bg-[#202c33] rounded-bl-none'
              )}>
                <div className={cn(
                  'absolute top-0 w-0 h-0',
                  isMine
                    ? 'right-[-8px] border-t-[8px] border-l-[8px] border-t-[#d9fdd3] border-l-transparent dark:border-t-[#005c4b]'
                    : 'left-[-8px] border-t-[8px] border-r-[8px] border-t-white border-r-transparent dark:border-t-[#202c33]'
                )} />
                <div className="text-gray-800 dark:text-gray-100">
                  {renderMessageContent(msg)}
                </div>
                <div className="flex items-center gap-1 mt-1 float-right ml-4">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">{time}</span>
                  {isMine && (
                    msg.is_read
                      ? <CheckCheck size={14} className="text-blue-500" />
                      : <Check size={14} className="text-gray-400" />
                  )}
                </div>
                <div className="clear-both" />
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-[#202c33] relative">
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-3 z-50 shadow-2xl rounded-xl overflow-hidden">
            <EmojiPicker
              onEmojiClick={(emojiData: EmojiClickData) => {
                setNewMsg(prev => prev + emojiData.emoji);
                setShowEmojiPicker(false);
              }}
              height={350}
              width={300}
            />
          </div>
        )}

        {/* Bouton emoji */}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a3942] transition-all text-xl"
          title="Emojis"
        >
          😊
        </button>

        <FileUpload
          currentUserId={currentUserId}
          conversationId={selectedConv.id}
          onFileSent={sendFile}
        />

        <div className="flex-1 flex items-center bg-white dark:bg-[#2a3942] rounded-full px-4 py-2 gap-2">
          <input
            value={newMsg}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMsg(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(); }}
            placeholder="Tapez un message"
            className="flex-1 bg-transparent text-sm border-none outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
          />
          <button
            onClick={() => setEphemeral(!ephemeral)}
            className={cn('p-1 rounded-full transition-all', ephemeral ? 'text-indigo-500' : 'text-gray-400 hover:text-gray-600')}
            title="Message éphémère"
          >
            <Timer size={16} />
          </button>
        </div>

        {/* Vocal ou Envoyer */}
        {newMsg.trim() ? (
          <button
            onClick={sendMessage}
            disabled={loading}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-500 hover:bg-indigo-600 text-white transition-all disabled:opacity-40 shadow-md active:scale-95"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send size={18} />
            }
          </button>
        ) : (
          <VoiceRecorder
            currentUserId={currentUserId}
            conversationId={selectedConv.id}
            onVoiceSent={sendVoice}
          />
        )}
      </div>
    </div>
  ) : (
    <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#222e35] gap-4">
      <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[#2a3942] flex items-center justify-center">
        <Send size={40} className="text-gray-400 dark:text-gray-500" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-light text-gray-600 dark:text-gray-300 mb-2">NovaNet Messages</h2>
        <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
          Sélectionne une conversation ou commence une nouvelle discussion
        </p>
      </div>
      <button onClick={() => setShowNewConv(true)} className="px-6 py-2.5 bg-indigo-500 text-white text-sm font-semibold rounded-full hover:bg-indigo-600 transition-all shadow-md">
        Nouvelle conversation
      </button>
    </div>
  );

  return (
    <>
      <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-40px)] rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-[#2a3942]">
        <div className={cn(
          'w-full md:w-80 md:border-r border-gray-200 dark:border-[#2a3942] shrink-0',
          showMobileChat ? 'hidden md:flex md:flex-col' : 'flex flex-col'
        )}>
          {ConvList}
        </div>
        <div className={cn(
          'flex-1 min-w-0',
          showMobileChat ? 'flex flex-col' : 'hidden md:flex md:flex-col'
        )}>
          {ChatArea}
        </div>
      </div>

      {activeCall && selectedConv && (
        <CallModal
          conversationId={selectedConv.id}
          currentUserId={currentUserId}
          remoteUserId={activeCall.remoteUserId}
          remoteName={activeCall.remoteName}
          remoteAvatar={activeCall.remoteAvatar}
          mode={activeCall.mode}
          isIncoming={activeCall.isIncoming}
          onClose={() => setActiveCall(null)}
        />
      )}
    </>
  );
}
