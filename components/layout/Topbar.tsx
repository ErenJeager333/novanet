'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types';
import { Home, MessageCircle, Users, Bell, User, Search, Film } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';

interface TopbarProps {
  profile: Profile | null;
}

const mobileNav = [
  { href: '/feed',          icon: Home,          label: 'Accueil' },
  { href: '/explore',       icon: Search,        label: 'Explorer' },
  { href: '/reels',         icon: Film,          label: 'Reels' },
  { href: '/messages',      icon: MessageCircle, label: 'Messages' },
  { href: '/notifications', icon: Bell,          label: 'Notifs', badge: true },
];

export default function Topbar({ profile }: TopbarProps) {
  const pathname = usePathname();
  const supabase = createBrowserClient();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;

    async function loadUnread() {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', profile!.id)
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    }

    loadUnread();

    // Reset badge when on notifications page
    if (pathname === '/notifications') {
      setUnreadCount(0);
    }

    // Realtime subscription
    const channel = supabase
      .channel(`notif-badge:${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${profile.id}`,
      }, () => {
        if (pathname !== '/notifications') {
          setUnreadCount(c => c + 1);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${profile.id}`,
      }, () => {
        loadUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, pathname]);

  return (
    <>
      {/* Top logo bar */}
      <header className="lg:hidden sticky top-0 z-40 glass border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center justify-between">
        <Link href="/feed" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-nova-gradient flex items-center justify-center text-white font-bold text-sm shadow-sm">
            N
          </div>
          <span className="font-bold text-lg text-gradient">NovaNet</span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Notification bell in header */}
          <Link href="/notifications" className="relative p-2">
            <Bell size={22} className="text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          {profile && (
            <Link href={`/profile/${profile.username}`}>
              <div className="w-9 h-9 rounded-full bg-nova-gradient flex items-center justify-center text-white text-xs font-bold overflow-hidden ring-2 ring-nova-200 dark:ring-nova-800">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt="" width={36} height={36} className="object-cover w-full h-full" />
                ) : (
                  (profile.display_name ?? profile.username).slice(0, 2).toUpperCase()
                )}
              </div>
            </Link>
          )}
        </div>
      </header>

      {/* Bottom tab bar — mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-gray-100 dark:border-gray-800 flex pb-safe">
        {mobileNav.map(({ href, icon: Icon, label, badge }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all',
                active ? 'text-nova-500' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <div className={cn('relative p-1.5 rounded-xl transition-all', active ? 'bg-nova-50 dark:bg-nova-950/30' : '')}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {badge && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] font-medium transition-all', active ? 'text-nova-500' : 'text-gray-400')}>
                {label}
              </span>
            </Link>
          );
        })}
        <Link
          href={`/profile/${profile?.username}`}
          className={cn(
            'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all',
            pathname.startsWith('/profile') ? 'text-nova-500' : 'text-gray-400'
          )}
        >
          <div className={cn('p-1.5 rounded-xl transition-all', pathname.startsWith('/profile') ? 'bg-nova-50 dark:bg-nova-950/30' : '')}>
            {profile?.avatar_url ? (
              <div className="w-5 h-5 rounded-full overflow-hidden">
                <Image src={profile.avatar_url} alt="" width={20} height={20} className="object-cover" />
              </div>
            ) : (
              <User size={20} strokeWidth={pathname.startsWith('/profile') ? 2.5 : 1.8} />
            )}
          </div>
          <span className={cn('text-[10px] font-medium', pathname.startsWith('/profile') ? 'text-nova-500' : 'text-gray-400')}>
            Profil
          </span>
        </Link>
      </nav>
    </>
  );
}