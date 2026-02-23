'use client';

import { useState, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import type { Profile, UserSettings, Visibility, FeedMode } from '@/types';
import { User, Shield, Clock, Bell, Camera, MapPin, Link as LinkIcon, Briefcase, Building } from 'lucide-react';
import { cn, getAvatarFallback } from '@/lib/utils';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  profile: Profile;
  settings: UserSettings;
  currentUserId: string;
}

type Tab = 'profile' | 'privacy' | 'wellbeing' | 'notifications';

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile',       label: 'Profil',         icon: User  },
  { id: 'privacy',       label: 'Confidentialité', icon: Shield },
  { id: 'wellbeing',     label: 'Bien-être',       icon: Clock  },
  { id: 'notifications', label: 'Notifications',   icon: Bell   },
];

export default function SettingsClient({ profile, settings, currentUserId }: Props) {
  const supabase = createBrowserClient();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url ?? null);
  const [coverPreview, setCoverPreview] = useState<string | null>(profile.cover_url ?? null);

  const [profileForm, setProfileForm] = useState({
    display_name: profile.display_name ?? '',
    bio: profile.bio ?? '',
    website: profile.website ?? '',
    location: profile.location ?? '',
    job_title: profile.job_title ?? '',
    company: profile.company ?? '',
  });

  const [settingsForm, setSettingsForm] = useState({
    default_visibility: settings.default_visibility as Visibility,
    show_likes: settings.show_likes,
    daily_limit_minutes: settings.daily_limit_minutes ?? '',
    break_reminder_mins: settings.break_reminder_mins,
    feed_mode: settings.feed_mode as FeedMode,
    notif_likes: settings.notif_likes,
    notif_comments: settings.notif_comments,
    notif_follows: settings.notif_follows,
    notif_messages: settings.notif_messages,
  });

  async function uploadImage(file: File, folder: string): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${currentUserId}/${uuidv4()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    try {
      const url = await uploadImage(file, 'avatars');
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', currentUserId);
      toast.success('Photo de profil mise à jour !');
    } catch {
      toast.error('Échec du téléchargement');
    }
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
    try {
      const url = await uploadImage(file, 'covers');
      await supabase.from('profiles').update({ cover_url: url }).eq('id', currentUserId);
      toast.success('Photo de couverture mise à jour !');
    } catch {
      toast.error('Échec du téléchargement');
    }
  }

  async function saveProfile() {
    setSaving(true);
    const { error } = await supabase.from('profiles').update(profileForm).eq('id', currentUserId);
    if (error) toast.error('Échec de la sauvegarde');
    else toast.success('Profil sauvegardé !');
    setSaving(false);
  }

  async function saveSettings() {
    setSaving(true);
    const { error } = await supabase.from('user_settings').update({
      ...settingsForm,
      daily_limit_minutes: settingsForm.daily_limit_minutes === '' ? null : Number(settingsForm.daily_limit_minutes),
    }).eq('user_id', currentUserId);
    if (error) toast.error('Échec de la sauvegarde');
    else toast.success('Paramètres sauvegardés !');
    setSaving(false);
  }

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <h1 className="font-bold text-xl">Paramètres</h1>

      {/* Tabs */}
      <div className="card p-1 flex gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition-all',
              activeTab === id ? 'bg-nova-gradient text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ─── Profile Tab ─── */}
      {activeTab === 'profile' && (
        <div className="card overflow-hidden space-y-0">

          {/* Cover photo */}
          <div className="relative h-40 bg-nova-gradient cursor-pointer group" onClick={() => coverInputRef.current?.click()}>
            {coverPreview && (
              <Image src={coverPreview} alt="Cover" fill className="object-cover" />
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="flex items-center gap-2 text-white text-sm font-medium bg-black/50 px-4 py-2 rounded-full">
                <Camera size={16} />
                Changer la photo de couverture
              </div>
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          </div>

          {/* Avatar */}
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-10 mb-6">
              <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 bg-nova-gradient flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {avatarPreview ? (
                    <Image src={avatarPreview} alt="Avatar" width={96} height={96} className="object-cover w-full h-full" />
                  ) : (
                    getAvatarFallback(profile.display_name ?? profile.username)
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={20} className="text-white" />
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div>
                <p className="font-bold text-lg">{profile.display_name ?? profile.username}</p>
                <p className="text-gray-500 text-sm">@{profile.username}</p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom affiché</label>
                  <input
                    value={profileForm.display_name}
                    onChange={(e) => setProfileForm(p => ({ ...p, display_name: e.target.value }))}
                    className="input"
                    placeholder="Ton nom complet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1"><MapPin size={13} /> Localisation</label>
                  <input
                    value={profileForm.location}
                    onChange={(e) => setProfileForm(p => ({ ...p, location: e.target.value }))}
                    className="input"
                    placeholder="Paris, France"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Briefcase size={13} /> Poste</label>
                  <input
                    value={profileForm.job_title}
                    onChange={(e) => setProfileForm(p => ({ ...p, job_title: e.target.value }))}
                    className="input"
                    placeholder="Développeur Web"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Building size={13} /> Entreprise</label>
                  <input
                    value={profileForm.company}
                    onChange={(e) => setProfileForm(p => ({ ...p, company: e.target.value }))}
                    className="input"
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1"><LinkIcon size={13} /> Site web</label>
                  <input
                    value={profileForm.website}
                    onChange={(e) => setProfileForm(p => ({ ...p, website: e.target.value }))}
                    className="input"
                    placeholder="https://tonsite.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Bio</label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                    className="input h-24 resize-none"
                    maxLength={300}
                    placeholder="Parle-nous de toi…"
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">{profileForm.bio.length}/300</p>
                </div>
              </div>

              <button onClick={saveProfile} disabled={saving} className="btn-nova w-full">
                {saving ? 'Sauvegarde…' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Privacy Tab ─── */}
      {activeTab === 'privacy' && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold">Confidentialité</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Visibilité par défaut</label>
            <select value={settingsForm.default_visibility} onChange={(e) => setSettingsForm(s => ({ ...s, default_visibility: e.target.value as Visibility }))} className="input">
              <option value="public">🌍 Public</option>
              <option value="friends">👥 Amis seulement</option>
              <option value="private">🔒 Privé</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mode du fil</label>
            <select value={settingsForm.feed_mode} onChange={(e) => setSettingsForm(s => ({ ...s, feed_mode: e.target.value as FeedMode }))} className="input">
              <option value="chronological">📅 Chronologique</option>
              <option value="algorithmic">✨ Algorithmique</option>
            </select>
          </div>
          <button onClick={saveSettings} disabled={saving} className="btn-nova w-full">{saving ? 'Sauvegarde…' : 'Enregistrer'}</button>
        </div>
      )}

      {/* ─── Wellbeing Tab ─── */}
      {activeTab === 'wellbeing' && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold">Bien-être & Anti-addiction</h2>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Masquer les likes</p>
              <p className="text-xs text-gray-400 mt-0.5">Réduit la pression sociale.</p>
            </div>
            <button onClick={() => setSettingsForm(s => ({ ...s, show_likes: !s.show_likes }))} className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0', !settingsForm.show_likes ? 'bg-nova-500' : 'bg-gray-200 dark:bg-gray-700')}>
              <span className={cn('block w-4 h-4 bg-white rounded-full absolute top-1 transition-transform', !settingsForm.show_likes ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>
          <div>
            <label className="block font-medium text-sm mb-1">Limite quotidienne (minutes)</label>
            <input type="number" value={settingsForm.daily_limit_minutes} onChange={(e) => setSettingsForm(s => ({ ...s, daily_limit_minutes: e.target.value }))} className="input w-32" placeholder="ex: 60" min={5} max={720} />
          </div>
          <button onClick={saveSettings} disabled={saving} className="btn-nova w-full">{saving ? 'Sauvegarde…' : 'Enregistrer'}</button>
        </div>
      )}

      {/* ─── Notifications Tab ─── */}
      {activeTab === 'notifications' && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold">Notifications</h2>
          {([
            { key: 'notif_likes',    label: 'Likes sur tes posts' },
            { key: 'notif_comments', label: 'Commentaires sur tes posts' },
            { key: 'notif_follows',  label: 'Nouveaux abonnés' },
            { key: 'notif_messages', label: 'Messages directs' },
          ] as const).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <button onClick={() => setSettingsForm(s => ({ ...s, [key]: !s[key] }))} className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0', settingsForm[key] ? 'bg-nova-500' : 'bg-gray-200 dark:bg-gray-700')}>
                <span className={cn('block w-4 h-4 bg-white rounded-full absolute top-1 transition-transform', settingsForm[key] ? 'translate-x-6' : 'translate-x-1')} />
              </button>
            </div>
          ))}
          <button onClick={saveSettings} disabled={saving} className="btn-nova w-full">{saving ? 'Sauvegarde…' : 'Enregistrer'}</button>
        </div>
      )}
    </div>
  );
}