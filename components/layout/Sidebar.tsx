'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-client';
import { cn, getAvatarFallback } from '@/lib/utils';
import type { Profile } from '@/types';
import Image from 'next/image';
import {
  Home, Search, Bell, MessageCircle, Users,
  Settings, LogOut, Shield, User, Film, BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '@/components/layout/ThemeToggle';

interface SidebarProps {
  profile: Profile | null;
}

const navItems = [
  { href: '/feed',          label: 'Accueil',       icon: Home },
  { href: '/explore',       label: 'Explorer',      icon: Search },
  { href: '/reels',         label: 'Reels',         icon: Film },
  { href: '/stories',       label: 'Stories',       icon: BookOpen },
  { href: '/messages',      label: 'Messages',      icon: MessageCircle },
  { href: '/groups',        label: 'Groupes',       icon: Users },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserClient();

  async function signOut() {
    await supabase.auth.signOut();
    toast.success('Déconnecté !');
    router.push('/');
    router.refresh();
  }

  return (
    
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-5 gap-1 shrink-0">
      {/* Logo */}
      <Link href="/feed" className="flex items-center gap-3 px-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-nova-gradient flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
          N
        </div>
        <span className="font-bold text-xl text-gradient">NovaNet</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-nova-gradient text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}

        {/* Admin link si admin */}
        {profile?.role === 'admin' && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              pathname.startsWith('/admin')
                ? 'bg-nova-gradient text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            )}
          >
            <Shield size={18} />
            Admin
          </Link>
        )}
      </nav>

      {/* Profil + actions bas */}
      <div className="space-y-1 pt-3 border-t border-gray-100 dark:border-gray-800">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            pathname.startsWith('/settings')
              ? 'bg-nova-gradient text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          )}
        >
          <Settings size={18} />
          Paramètres
        </Link>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
        >
          <LogOut size={18} />
          Déconnexion
        </button>

        {/* Carte profil */}
        {profile && (
          <Link
            href={`/profile/${profile.username}`}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all mt-2"
          >
            <div className="w-9 h-9 rounded-full bg-nova-gradient flex items-center justify-center text-white text-sm font-bold overflow-hidden shrink-0">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt="" width={36} height={36} className="object-cover w-full h-full" />
              ) : (
                getAvatarFallback(profile.display_name ?? profile.username)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">
                {profile.display_name ?? profile.username}
              </p>
              <p className="text-xs text-gray-400 truncate">@{profile.username}</p>
            </div>
          </Link>
        )}
      </div>
      {/* Theme toggle */}
        <div className="pt-2">
          <ThemeToggle />
        </div>
    </aside>
  );
}