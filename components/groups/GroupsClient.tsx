'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import type { Group, Post } from '@/types';
import { formatCount, getAvatarFallback } from '@/lib/utils';
import { Users, Plus, X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import PostCard from '@/components/feed/PostCard';
import PostComposer from '@/components/feed/PostComposer';

interface GroupsClientProps {
  groups: Group[];
  currentUserId: string;
}

export default function GroupsClient({ groups: initialGroups, currentUserId }: GroupsClientProps) {
  const supabase = createBrowserClient();
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupPosts, setGroupPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  async function openGroup(group: Group) {
    setSelectedGroup(group);
    setLoadingPosts(true);
    const { data } = await supabase
      .from('posts')
      .select('*, author:profiles(*)')
      .eq('group_id', group.id)
      .eq('is_removed', false)
      .order('created_at', { ascending: false })
      .limit(20);
    setGroupPosts((data ?? []).map(p => ({ ...p, is_liked: false })));
    setLoadingPosts(false);
  }

  async function joinGroup(groupId: string) {
    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: currentUserId,
    });
    if (error) {
      toast.error('Échec pour rejoindre le groupe');
    } else {
      toast.success('Groupe rejoint !');
      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, is_member: true, members_count: g.members_count + 1 } : g
      ));
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(prev => prev ? { ...prev, is_member: true } : null);
      }
    }
  }

  async function leaveGroup(groupId: string) {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', currentUserId);
    if (error) {
      toast.error('Échec pour quitter le groupe');
    } else {
      toast.success('Groupe quitté');
      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, is_member: false, members_count: Math.max(g.members_count - 1, 0) } : g
      ));
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(prev => prev ? { ...prev, is_member: false } : null);
      }
    }
  }

  async function createGroup() {
    if (!newGroup.name.trim()) {
      toast.error('Le nom du groupe est requis');
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from('groups')
      .insert({
        name: newGroup.name.trim(),
        description: newGroup.description.trim(),
        creator_id: currentUserId,
        visibility: 'public',
      })
      .select('*')
      .single();

    if (error) {
      toast.error('Échec de la création du groupe');
    } else {
      await supabase.from('group_members').insert({
        group_id: data.id,
        user_id: currentUserId,
        role: 'admin',
      });
      setGroups(prev => [{ ...data, is_member: true }, ...prev]);
      setShowCreate(false);
      setNewGroup({ name: '', description: '' });
      toast.success('Groupe créé !');
    }
    setCreating(false);
  }

  async function toggleLike(postId: string, isLiked: boolean) {
    setGroupPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, is_liked: !isLiked, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p
    ));
    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', postId);
    } else {
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: postId });
    }
  }

  // ─── Vue d'un groupe ───────────────────────────────────────────────────────
  if (selectedGroup) {
    return (
      <div className="space-y-4 pb-20 md:pb-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedGroup(null)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-nova-gradient flex items-center justify-center text-white font-bold shrink-0">
              {selectedGroup.name[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg truncate">{selectedGroup.name}</h1>
              <p className="text-xs text-gray-500">
                <Users size={11} className="inline mr-1" />
                {formatCount(selectedGroup.members_count)} membres
              </p>
            </div>
          </div>
          <button
            onClick={() => selectedGroup.is_member ? leaveGroup(selectedGroup.id) : joinGroup(selectedGroup.id)}
            className={selectedGroup.is_member ? 'btn-outline text-sm' : 'btn-nova text-sm'}
          >
            {selectedGroup.is_member ? 'Quitter' : 'Rejoindre'}
          </button>
        </div>

        {/* Description */}
        {selectedGroup.description && (
          <div className="card p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedGroup.description}</p>
          </div>
        )}

        {/* Composer — seulement si membre */}
        {selectedGroup.is_member && (
          <PostComposer
            currentUserId={currentUserId}
            groupId={selectedGroup.id}
            onPostCreated={(post) => setGroupPosts(prev => [post, ...prev])}
          />
        )}

        {/* Posts */}
        {loadingPosts ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-nova-300 border-t-nova-500 rounded-full animate-spin" />
          </div>
        ) : groupPosts.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">
            <Users size={32} className="mx-auto mb-3 opacity-40" />
            <p>Aucun post dans ce groupe pour l'instant.</p>
            {selectedGroup.is_member && <p className="text-sm mt-1">Sois le premier à poster !</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {groupPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                showLikes={true}
                onLikeToggle={toggleLike}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Liste des groupes ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl">Groupes</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-nova text-sm">
          <Plus size={16} />
          Créer un groupe
        </button>
      </div>

      {/* Formulaire de création */}
      {showCreate && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Nouveau groupe</h2>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nom du groupe *</label>
            <input
              value={newGroup.name}
              onChange={(e) => setNewGroup(g => ({ ...g, name: e.target.value }))}
              className="input"
              placeholder="ex: Amateurs de photo"
              maxLength={80}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={newGroup.description}
              onChange={(e) => setNewGroup(g => ({ ...g, description: e.target.value }))}
              className="input h-20 resize-none"
              placeholder="De quoi parle ce groupe ?"
              maxLength={300}
            />
          </div>
          <button onClick={createGroup} disabled={creating} className="btn-nova w-full">
            {creating ? 'Création…' : 'Créer le groupe'}
          </button>
        </div>
      )}

      {/* Grille des groupes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {groups.map(group => (
          <div key={group.id} className="card p-4 space-y-3 hover:shadow-md transition-shadow">
            <button
              onClick={() => openGroup(group)}
              className="flex items-center gap-3 w-full text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-nova-gradient flex items-center justify-center text-white font-bold text-lg shrink-0">
                {group.name[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">{group.name}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users size={12} />
                  {formatCount(group.members_count)} membres
                </div>
              </div>
            </button>

            {group.description && (
              <p className="text-xs text-gray-500 line-clamp-2">{group.description}</p>
            )}

            <button
              onClick={() => group.is_member ? leaveGroup(group.id) : joinGroup(group.id)}
              className={group.is_member ? 'btn-outline text-sm w-full' : 'btn-nova text-sm w-full'}
            >
              {group.is_member ? 'Quitter' : 'Rejoindre'}
            </button>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="card p-10 text-center text-gray-400">
          <Users size={32} className="mx-auto mb-3 opacity-40" />
          <p>Aucun groupe pour l'instant. Crée le premier !</p>
        </div>
      )}
    </div>
  );
}