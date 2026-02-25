'use client';

import React, { useState, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getAvatarFallback } from '@/lib/utils';
import type { Profile } from '@/types';
import {
  Camera, ChevronRight, ChevronLeft,
  Check, Sparkles, Users, UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import FollowButton from '@/components/profile/FollowButton';

interface OnboardingModalProps {
  profile: Profile;
  suggestedUsers: Profile[];
}

const STEPS = ['Bienvenue', 'Photo', 'Bio', 'Suggestions', 'Terminé'];

export default function OnboardingModal({ profile, suggestedUsers }: OnboardingModalProps) {
  const supabase = createBrowserClient();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile) return avatarPreview;
    setUploading(true);
    const ext = avatarFile.name.split('.').pop();
    const path = `avatars/${profile.id}/${uuidv4()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, avatarFile);
    if (error) { toast.error('Erreur upload avatar'); setUploading(false); return null; }
    const { data } = supabase.storage.from('media').getPublicUrl(path);
    setUploading(false);
    return data.publicUrl;
  }

  async function finish() {
    setSaving(true);
    const avatarUrl = await uploadAvatar();
    await supabase.from('profiles').update({
      display_name: displayName.trim() || profile.username,
      bio: bio.trim(),
      avatar_url: avatarUrl,
      onboarding_completed: true,
    }).eq('id', profile.id);
    setSaving(false);
    router.refresh();
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  }

  function prev() {
    if (step > 0) setStep(s => s - 1);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-300 ${i === step ? 'w-6 h-2 bg-indigo-500' : i < step ? 'w-2 h-2 bg-indigo-300' : 'w-2 h-2 bg-gray-200 dark:bg-gray-700'}`} />
            ))}
          </div>

          {/* Step 0 — Bienvenue */}
          {step === 0 && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center mx-auto shadow-lg">
                <Sparkles size={36} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black">Bienvenue sur NovaNet ! 🎉</h2>
                <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                  Salut <span className="font-semibold text-indigo-500">@{profile.username}</span> ! Prenons 2 minutes pour configurer ton profil et te connecter avec la communauté.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { emoji: '📸', label: 'Photo de profil' },
                  { emoji: '✏️', label: 'Ta bio' },
                  { emoji: '👥', label: 'Des amis' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 text-center">
                    <span className="text-2xl">{item.emoji}</span>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Photo */}
          {step === 1 && (
            <div className="text-center space-y-4">
              <div>
                <h2 className="text-xl font-black">Ajoute ta photo 📸</h2>
                <p className="text-gray-500 text-sm mt-1">Les profils avec photo reçoivent 5x plus d'abonnés</p>
              </div>
              <div className="relative w-32 h-32 mx-auto">
                <div className="w-32 h-32 rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                  {avatarPreview
                    ? <Image src={avatarPreview} alt="" width={128} height={128} className="object-cover w-full h-full" />
                    : getAvatarFallback(displayName || profile.username)
                  }
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-lg transition-all active:scale-95"
                >
                  <Camera size={18} />
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              <button onClick={() => fileInputRef.current?.click()} className="text-sm text-indigo-500 hover:text-indigo-600 font-medium transition-colors">
                {avatarFile ? 'Changer la photo' : 'Choisir une photo'}
              </button>
            </div>
          )}

          {/* Step 2 — Bio */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-black">Parle-nous de toi ✏️</h2>
                <p className="text-gray-500 text-sm mt-1">Une bonne bio attire plus d'abonnés</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom affiché</label>
                  <input
                    value={displayName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                    placeholder={profile.username}
                    className="w-full mt-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-sm border-none outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBio(e.target.value)}
                    placeholder="Décris-toi en quelques mots… 🌟"
                    rows={3}
                    className="w-full mt-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-sm border-none outline-none focus:ring-2 focus:ring-indigo-400 transition-all resize-none"
                    maxLength={160}
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">{bio.length}/160</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Suggestions */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-black">Suis des personnes 👥</h2>
                <p className="text-gray-500 text-sm mt-1">Commence à voir du contenu dans ton feed</p>
              </div>
              {suggestedUsers.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Pas de suggestions pour l'instant</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {suggestedUsers.map(user => (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-indigo-400 to-pink-400 shrink-0">
                        {user.avatar_url
                          ? <Image src={user.avatar_url} alt="" width={44} height={44} className="object-cover w-full h-full" />
                          : <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">{getAvatarFallback(user.display_name ?? user.username)}</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{user.display_name ?? user.username}</p>
                        <p className="text-xs text-gray-400">@{user.username} · {user.followers_count} abonnés</p>
                      </div>
                      <FollowButton currentUserId={profile.id} targetUserId={user.id} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Terminé */}
          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto shadow-lg">
                <Check size={36} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black">Tout est prêt ! 🚀</h2>
                <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                  Ton profil est configuré. Bienvenue dans la communauté NovaNet !
                </p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl p-4 text-left space-y-2">
                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Que faire maintenant ?</p>
                <p className="text-xs text-gray-500">📝 Publie ton premier post</p>
                <p className="text-xs text-gray-500">🎬 Regarde les Reels</p>
                <p className="text-xs text-gray-500">💬 Envoie un message</p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6 gap-3">
            {step > 0 ? (
              <button onClick={prev} className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                <ChevronLeft size={16} /> Retour
              </button>
            ) : <div />}

            <button
              onClick={next}
              disabled={saving || uploading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-pink-500 text-white hover:opacity-90 transition-all active:scale-95 shadow-md disabled:opacity-60 ml-auto"
            >
              {saving || uploading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : step === STEPS.length - 1
                  ? <><Check size={16} /> C'est parti !</>
                  : <>Continuer <ChevronRight size={16} /></>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}