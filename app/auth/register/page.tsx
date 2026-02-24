'use client';

export const dynamic = 'force-dynamic';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-client';
import toast from 'react-hot-toast';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient();

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleRegister() {
    if (!form.email || !form.password || !form.username || !form.displayName) {
      toast.error('Remplis tous les champs');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (form.password.length < 8) {
      toast.error('Le mot de passe doit faire au moins 8 caractères');
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(form.username.toLowerCase())) {
      toast.error('Username : 3–20 caractères, lettres minuscules, chiffres, underscore uniquement');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          username: form.username.toLowerCase(),
          display_name: form.displayName || form.username,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success('Compte créé ! Vérifie ton email pour confirmer.');
    router.push('/feed');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-nova-gradient flex items-center justify-center text-white font-bold shadow-md">
              N
            </div>
            <span className="text-2xl font-bold text-gradient">NovaNet</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Crée ton compte</h1>
          <p className="text-gray-500 text-sm mt-1">Gratuit pour toujours. Sans carte bancaire.</p>
        </div>

        {/* Form */}
        <div className="card p-8">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nom affiché</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => update('displayName', e.target.value)}
                  className="input"
                  placeholder="Jean Dupont"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => update('username', e.target.value.toLowerCase())}
                  className="input"
                  placeholder="jeandupont"
                  autoComplete="username"
                  minLength={3}
                  maxLength={20}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="input"
                placeholder="toi@exemple.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  className="input pr-10"
                  placeholder="Min. 8 caractères"
                  autoComplete="new-password"
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Confirmer le mot de passe</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                className="input"
                placeholder="Répète ton mot de passe"
                autoComplete="new-password"
              />
            </div>

            {/* Indicateur de force du mot de passe */}
            {form.password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        form.password.length >= level * 3
                          ? level <= 1 ? 'bg-red-400'
                          : level <= 2 ? 'bg-yellow-400'
                          : level <= 3 ? 'bg-blue-400'
                          : 'bg-green-400'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  {form.password.length < 6 ? '⚠️ Trop court'
                  : form.password.length < 10 ? '🔑 Acceptable'
                  : form.password.length < 14 ? '🔒 Bon'
                  : '🛡️ Excellent'}
                </p>
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={loading}
              className="btn-nova w-full py-3 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Création du compte…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus size={16} />
                  Créer mon compte
                </span>
              )}
            </button>

            <p className="text-xs text-center text-gray-400">
              En t'inscrivant, tu acceptes nos{' '}
              <button type="button" className="underline hover:text-nova-500">Conditions</button>
              {' '}et notre{' '}
              <button type="button" className="underline hover:text-nova-500">Politique de confidentialité</button>.
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{' '}
          <Link href="/auth/login" className="text-nova-500 font-semibold hover:text-nova-600">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}