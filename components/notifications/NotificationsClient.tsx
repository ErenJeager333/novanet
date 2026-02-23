'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import type { Notification } from '@/types';
import { formatRelative, getAvatarFallback, cn } from '@/lib/utils';
import { Bell, Heart, MessageCircle, UserPlus, Mail } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface NotificationsClientProps {
  notifications: Notification[];
  currentUserId: string;
}

function NotifIcon({ type }: { type: Notification['type'] }) {
  switch (type) {
    case 'like':    return <Heart size={14} className="text-red-500" />;
    case 'comment': return <MessageCircle size={14} className="text-blue-500" />;
    case 'follow':  return <UserPlus size={14} className="text-green-500" />;
    case 'message': return <Mail size={14} className="text-purple-500" />;
    default:        return <Bell size={14} className="text-nova-500" />;
  }
}

function notifMessage(n: Notification): string {
  const name = n.sender?.display_name ?? n.sender?.username ?? 'Quelqu\'un';
  switch (n.type) {
    case 'like':    return `${name} a aimé ton post`;
    case 'comment': return `${name} a commenté ton post`;
    case 'follow':  return `${name} a commencé à te suivre`;
    case 'message': return `${name} t'a envoyé un message`;
    default:        return n.message ?? 'Nouvelle notification';
  }
}

export default function NotificationsClient({
  notifications: initialNotifs,
  currentUserId,
}: NotificationsClientProps) {
  const supabase = createBrowserClient();
  const [notifs, setNotifs] = useState<Notification[]>(initialNotifs);

  // ─── Temps réel ───────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('notifications:' + currentUserId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        async (payload) => {
          // Récupère le profil de l'expéditeur
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single();

          const newNotif = { ...payload.new, sender } as Notification;
          setNotifs(prev => [newNotif, ...prev]);

          // Toast de notification
          const name = sender?.display_name ?? sender?.username ?? 'Quelqu\'un';
          switch (payload.new.type) {
            case 'like':    toast('❤️ ' + name + ' a aimé ton post'); break;
            case 'comment': toast('💬 ' + name + ' a commenté ton post'); break;
            case 'follow':  toast('👤 ' + name + ' te suit maintenant'); break;
            case 'message': toast('✉️ ' + name + ' t\'a envoyé un message'); break;
            default:        toast('🔔 Nouvelle notification');
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, currentUserId]);

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', currentUserId);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl">
          Notifications
          {unread > 0 && (
            <span className="ml-2 text-sm font-normal text-nova-500">
              {unread} nouvelle{unread > 1 ? 's' : ''}
            </span>
          )}
        </h1>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-nova-500 hover:text-nova-600 font-medium"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {notifs.length === 0 && (
        <div className="card p-10 text-center text-gray-400">
          <Bell size={32} className="mx-auto mb-3 opacity-40" />
          <p>Aucune notification pour l'instant.</p>
          <p className="text-sm mt-1">Interagis avec d'autres utilisateurs pour en recevoir !</p>
        </div>
      )}

      {notifs.length > 0 && (
        <div className="card divide-y divide-gray-100 dark:divide-gray-800">
          {notifs.map(notif => (
            <button
              key={notif.id}
              onClick={() => markRead(notif.id)}
              className={cn(
                'w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-all',
                !notif.is_read && 'bg-nova-50/50 dark:bg-nova-950/20'
              )}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-nova-gradient flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                  {notif.sender?.avatar_url ? (
                    <Image
                      src={notif.sender.avatar_url}
                      alt={notif.sender.display_name ?? ''}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    getAvatarFallback(notif.sender?.display_name ?? notif.sender?.username)
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center">
                  <NotifIcon type={notif.type} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm">{notifMessage(notif)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatRelative(notif.created_at)}
                </p>
              </div>

              {!notif.is_read && (
                <div className="w-2 h-2 rounded-full bg-nova-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}