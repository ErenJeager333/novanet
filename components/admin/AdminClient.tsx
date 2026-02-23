'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import type { Profile, Report } from '@/types';
import { formatDate, getAvatarFallback, cn } from '@/lib/utils';
import {
  Shield, Users, FileText, Flag, CheckCircle,
  XCircle, Trash2, TrendingUp, Eye, UserX,
  BarChart2, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface AdminClientProps {
  users: Profile[];
  reports: (Report & { reporter: Profile })[];
  stats: { posts: number; users: number; reports: number };
}

type Tab = 'overview' | 'users' | 'reports';

export default function AdminClient({ users: initialUsers, reports: initialReports, stats }: AdminClientProps) {
  const supabase = createBrowserClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [reports, setReports] = useState(initialReports);
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  async function promoteToAdmin(userId: string) {
    if (!confirm('Promouvoir cet utilisateur en admin ?')) return;
    const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
    if (error) toast.error('Échec');
    else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: 'admin' } : u));
      toast.success('Utilisateur promu admin !');
    }
  }

  async function demoteUser(userId: string) {
    if (!confirm('Rétrograder cet utilisateur ?')) return;
    const { error } = await supabase.from('profiles').update({ role: 'user' }).eq('id', userId);
    if (error) toast.error('Échec');
    else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: 'user' } : u));
      toast.success('Utilisateur rétrogradé');
    }
  }

  async function resolveReport(reportId: string, action: 'resolved' | 'dismissed') {
    const { error } = await supabase.from('reports').update({ status: action }).eq('id', reportId);
    if (error) {
      toast.error('Échec');
    } else {
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast.success(action === 'resolved' ? '✅ Signalement résolu' : '🚫 Signalement ignoré');
    }
  }

  async function deletePost(postId: string) {
    const { error } = await supabase.from('posts').update({ is_removed: true }).eq('id', postId);
    if (error) toast.error('Échec');
    else {
      toast.success('Post supprimé');
      setReports(prev => prev.filter(r => r.post_id !== postId));
    }
  }

  const adminCount = users.filter(u => u.role === 'admin').length;
  const modCount = users.filter(u => u.role === 'moderator').length;

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-nova-gradient flex items-center justify-center">
          <Shield className="text-white" size={20} />
        </div>
        <div>
          <h1 className="font-bold text-xl">Panneau Admin</h1>
          <p className="text-xs text-gray-500">Gestion de NovaNet</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card p-1 flex gap-1">
        {([
          { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart2 },
          { id: 'users', label: 'Utilisateurs', icon: Users },
          { id: 'reports', label: `Signalements${reports.length > 0 ? ` (${reports.length})` : ''}`, icon: Flag },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition-all',
              tab === id ? 'bg-nova-gradient text-white' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ─── Vue d'ensemble ─── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Stats principales */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="card p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-nova-50 dark:bg-nova-950/30 flex items-center justify-center mx-auto mb-3">
                <Users size={22} className="text-nova-500" />
              </div>
              <p className="text-3xl font-bold">{stats.users}</p>
              <p className="text-xs text-gray-500 mt-1">Utilisateurs</p>
            </div>
            <div className="card p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-3">
                <FileText size={22} className="text-blue-500" />
              </div>
              <p className="text-3xl font-bold">{stats.posts}</p>
              <p className="text-xs text-gray-500 mt-1">Posts</p>
            </div>
            <div className="card p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-3">
                <Flag size={22} className="text-red-500" />
              </div>
              <p className="text-3xl font-bold">{stats.reports}</p>
              <p className="text-xs text-gray-500 mt-1">Signalements</p>
            </div>
          </div>

          {/* Stats secondaires */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center shrink-0">
                <Shield size={18} className="text-purple-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{adminCount}</p>
                <p className="text-xs text-gray-500">Admins</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center shrink-0">
                <Activity size={18} className="text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.users - adminCount}</p>
                <p className="text-xs text-gray-500">Membres actifs</p>
              </div>
            </div>
          </div>

          {/* Derniers utilisateurs */}
          <div className="card p-4 space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp size={16} className="text-nova-500" />
              Derniers inscrits
            </h2>
            <div className="space-y-2">
              {users.slice(0, 5).map(user => (
                <div key={user.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-nova-gradient flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                    {user.avatar_url ? (
                      <Image src={user.avatar_url} alt="" width={32} height={32} className="object-cover" />
                    ) : (
                      getAvatarFallback(user.display_name ?? user.username)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.display_name ?? user.username}</p>
                    <p className="text-xs text-gray-400">@{user.username}</p>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    user.role === 'admin' ? 'bg-nova-100 text-nova-700 dark:bg-nova-950 dark:text-nova-300' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  )}>
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Utilisateurs ─── */}
      {tab === 'users' && (
        <div className="space-y-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur…"
            className="input"
          />
          <div className="card divide-y divide-gray-100 dark:divide-gray-800">
            {filteredUsers.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">Aucun utilisateur trouvé</p>
            )}
            {filteredUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-nova-gradient flex items-center justify-center text-white text-sm font-bold overflow-hidden shrink-0">
                  {user.avatar_url ? (
                    <Image src={user.avatar_url} alt="" width={40} height={40} className="object-cover" />
                  ) : (
                    getAvatarFallback(user.display_name ?? user.username)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{user.display_name ?? user.username}</p>
                  <p className="text-xs text-gray-400">
                    @{user.username} · {formatDate(user.created_at)}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span>{user.posts_count} posts</span>
                    <span>{user.followers_count} abonnés</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium mr-1',
                    user.role === 'admin' ? 'bg-nova-100 text-nova-700' :
                    user.role === 'moderator' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {user.role}
                  </span>
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => promoteToAdmin(user.id)}
                      className="p-1.5 rounded-lg text-nova-400 hover:text-nova-500 hover:bg-nova-50 transition-all"
                      title="Promouvoir admin"
                    >
                      <Shield size={14} />
                    </button>
                  )}
                  {user.role === 'admin' && (
                    <button
                      onClick={() => demoteUser(user.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      title="Rétrograder"
                    >
                      <UserX size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Signalements ─── */}
      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 && (
            <div className="card p-10 text-center text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">Aucun signalement en attente</p>
              <p className="text-sm mt-1">La communauté est saine ! 🎉</p>
            </div>
          )}
          {reports.map(report => (
            <div key={report.id} className="card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                  <Flag size={14} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    Signalé par @{report.reporter?.username}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(report.created_at)} · {report.post_id ? 'Post' : 'Commentaire'}
                  </p>
                  <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      "{report.reason}"
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {report.post_id && (
                  <button
                    onClick={() => deletePost(report.post_id!)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 text-sm font-medium hover:bg-red-100 transition-all"
                  >
                    <Trash2 size={14} />
                    Supprimer le post
                  </button>
                )}
                <button
                  onClick={() => resolveReport(report.id, 'resolved')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-950/30 text-green-500 text-sm font-medium hover:bg-green-100 transition-all"
                >
                  <CheckCircle size={14} />
                  Résoudre
                </button>
                <button
                  onClick={() => resolveReport(report.id, 'dismissed')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 text-sm font-medium hover:bg-gray-100 transition-all"
                >
                  <XCircle size={14} />
                  Ignorer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}