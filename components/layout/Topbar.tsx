'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types';
import { Home, MessageCircle, Users, Bell, User, Search, Film } from 'lucide-react';
import Image from 'next/image';

interface TopbarProps {
  profile: Profile | null;
}

const mobileNav = [
  { href: '/feed',          icon: Home,          label: 'Accueil' },
  { href: '/explore',       icon: Search,        label: 'Explorer' },
  { href: '/reels',         icon: Film,          label: 'Reels' },
  { href: '/messages',      icon: MessageCircle, label: 'Messages' },
  { href: '/notifications', icon: Bell,          label: 'Notifs' },
];

export default function Topbar({ profile }: TopbarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Top logo bar */}
      <header className="md:hidden sticky top-0 z-40 glass border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center justify-between">
        <Link href="/feed" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-nova-gradient flex items-center justify-center text-white font-bold text-sm shadow-sm">
            N
          </div>
          <span className="font-bold text-lg text-gradient">
            NovaNet
          </span>
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
      </header>

      {/* Bottom tab bar – mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-gray-100 dark:border-gray-800 flex pb-safe">
        {mobileNav.map(({ href, icon: Icon, label }) => {
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
              <div className={cn(
                'p-1.5 rounded-xl transition-all',
                active ? 'bg-nova-50 dark:bg-nova-950/30' : ''
              )}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span className={cn(
                'text-[10px] font-medium transition-all',
                active ? 'text-nova-500' : 'text-gray-400'
              )}>
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
          <div className={cn(
            'p-1.5 rounded-xl transition-all',
            pathname.startsWith('/profile') ? 'bg-nova-50 dark:bg-nova-950/30' : ''
          )}>
            {profile?.avatar_url ? (
              <div className="w-5 h-5 rounded-full overflow-hidden">
                <Image src={profile.avatar_url} alt="" width={20} height={20} className="object-cover" />
              </div>
            ) : (
              <User size={20} strokeWidth={pathname.startsWith('/profile') ? 2.5 : 1.8} />
            )}
          </div>
          <span className={cn(
            'text-[10px] font-medium',
            pathname.startsWith('/profile') ? 'text-nova-500' : 'text-gray-400'
          )}>
            Profil
          </span>
        </Link>
      </nav>
    </>
  );
}