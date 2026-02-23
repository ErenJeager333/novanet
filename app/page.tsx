'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Sparkles, Shield, Clock, Heart, MessageCircle,
  Users, Video, Globe, ArrowRight, Star, Zap,
  BookOpen, Film, Search, Bell, Check
} from 'lucide-react';

const features = [
  {
    icon: Clock,
    title: 'Anti-Addiction',
    desc: 'Limites de temps, rappels de pause. Tu restes maître de ton attention.',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Shield,
    title: 'Sans Toxicité',
    desc: 'Modération intelligente et signalement communautaire.',
    color: 'text-green-500',
    bg: 'bg-green-50',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Heart,
    title: 'Sans Pression',
    desc: 'Cache les likes, choisis ton fil chronologique. Poste pour toi.',
    color: 'text-pink-500',
    bg: 'bg-pink-50',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: Globe,
    title: 'Vie Privée',
    desc: 'Contrôle total : public, amis seulement, ou privé.',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    gradient: 'from-purple-500 to-violet-500',
  },
  {
    icon: MessageCircle,
    title: 'Messages Réels',
    desc: 'DMs en temps réel avec messages éphémères.',
    color: 'text-yellow-500',
    bg: 'bg-yellow-50',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Users,
    title: 'Communautés',
    desc: 'Crée ou rejoins des groupes autour de tes passions.',
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: Film,
    title: 'Reels & Stories',
    desc: 'Tous les formats : posts, stories, reels, threads.',
    color: 'text-red-500',
    bg: 'bg-red-50',
    gradient: 'from-red-500 to-pink-500',
  },
  {
    icon: Sparkles,
    title: 'Zéro Pub',
    desc: 'Ton attention t\'appartient. NovaNet est 100% sans publicité.',
    color: 'text-nova-500',
    bg: 'bg-indigo-50',
    gradient: 'from-indigo-500 to-purple-500',
  },
];

const stats = [
  { value: '100%', label: 'Sans publicité' },
  { value: '0€', label: 'Gratuit pour toujours' },
  { value: '∞', label: 'Connexions réelles' },
];

const navItems = [
  { href: '/feed', icon: Heart, label: 'Feed' },
  { href: '/explore', icon: Search, label: 'Explore' },
  { href: '/reels', icon: Film, label: 'Reels' },
  { href: '/stories', icon: BookOpen, label: 'Stories' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/groups', icon: Users, label: 'Groupes' },
  { href: '/notifications', icon: Bell, label: 'Notifs' },
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % navItems.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-white overflow-hidden">

      {/* ─── Header ─── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
              N
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">
              NovaNet
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-xl hover:bg-gray-100"
            >
              Se connecter
            </Link>
            <Link
              href="/auth/register"
              className="text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-pink-500 px-5 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              Commencer gratuitement
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6">
        {/* Fond gradient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-50 rounded-full blur-3xl opacity-40" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50 to-pink-50 border border-indigo-100 text-indigo-600 text-sm font-medium mb-8 shadow-sm">
            <Sparkles size={14} className="text-pink-500" />
            Le réseau social conçu pour les humains
            <Star size={12} className="text-yellow-500 fill-yellow-500" />
          </div>

          {/* Titre */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.1] mb-6 tracking-tight">
            Le réseau social{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                enfin parfait
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path d="M2 8C50 4 100 2 150 6C200 10 250 8 298 4" stroke="url(#grad)" strokeWidth="3" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="300" y2="0">
                    <stop offset="0%" stopColor="#6366f1"/>
                    <stop offset="100%" stopColor="#ec4899"/>
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>

          {/* Sous-titre */}
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            NovaNet réunit le meilleur de chaque réseau social —
            <span className="text-gray-700 font-medium"> sans la pub, sans l'addiction, sans la toxicité.</span>
            {' '}Connecte-toi vraiment.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/auth/register"
              className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold px-8 py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl active:scale-95 text-base"
            >
              Rejoindre gratuitement
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-2xl hover:border-indigo-300 hover:text-indigo-600 transition-all text-base"
            >
              Se connecter
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mb-16">
            {stats.map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-black bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* App Preview */}
          <div className="relative max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-indigo-500 to-pink-500 rounded-3xl p-1 shadow-2xl">
              <div className="bg-gray-50 rounded-[22px] overflow-hidden">
                {/* Fausse barre du navigateur */}
                <div className="bg-white px-4 py-3 flex items-center gap-2 border-b border-gray-100">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-lg px-3 py-1 text-xs text-gray-400 text-center">
                    novanet.app/feed
                  </div>
                </div>

                {/* Fausse interface */}
                <div className="flex h-64">
                  {/* Sidebar */}
                  <div className="w-40 bg-white border-r border-gray-100 p-3 space-y-1 hidden sm:block">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-xs font-medium">
                      <div className="w-3 h-3 rounded bg-white/30" />
                      <span>NovaNet</span>
                    </div>
                    {navItems.map((item, i) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                          i === activeFeature
                            ? 'bg-indigo-50 text-indigo-600 font-medium'
                            : 'text-gray-400'
                        }`}
                      >
                        <item.icon size={12} />
                        {item.label}
                      </div>
                    ))}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 p-4 space-y-3 overflow-hidden">
                    {[1, 2].map(i => (
                      <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400" />
                          <div className="space-y-1">
                            <div className="w-20 h-2 bg-gray-200 rounded-full" />
                            <div className="w-14 h-1.5 bg-gray-100 rounded-full" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="w-full h-2 bg-gray-100 rounded-full" />
                          <div className="w-3/4 h-2 bg-gray-100 rounded-full" />
                        </div>
                        <div className="flex gap-3 mt-3">
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Heart size={12} className="text-pink-400 fill-pink-400" />
                            <span>24</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <MessageCircle size={12} />
                            <span>8</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Badges flottants */}
            <div className="absolute -left-4 top-1/3 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2 animate-bounce">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Check size={16} className="text-green-500" />
              </div>
              <div>
                <p className="text-xs font-bold">Sans pub !</p>
                <p className="text-xs text-gray-400">100% gratuit</p>
              </div>
            </div>

            <div className="absolute -right-4 bottom-1/3 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <Zap size={16} className="text-indigo-500" />
              </div>
              <div>
                <p className="text-xs font-bold">Temps réel</p>
                <p className="text-xs text-gray-400">Instant</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              Tout ce que tu aimes.{' '}
              <span className="bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
                Rien de ce que tu détestes.
              </span>
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              On a étudié chaque réseau social, gardé ce qui marche, et corrigé ce qui ne marche pas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:-translate-y-1 cursor-default"
              >
                <div className={`w-12 h-12 rounded-2xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className={f.color} size={22} />
                </div>
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Comparaison ─── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">
              Pourquoi NovaNet ?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Les autres */}
            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200">
              <h3 className="font-bold text-lg mb-6 text-gray-500">Les autres réseaux</h3>
              <ul className="space-y-4">
                {[
                  'Publicités partout',
                  'Algorithme addictif',
                  'Données vendues',
                  'Toxicité omniprésente',
                  'Pression sociale des likes',
                  'Contenu imposé',
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-gray-500">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <span className="text-red-500 text-xs font-bold">✕</span>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* NovaNet */}
            <div className="bg-gradient-to-br from-indigo-500 to-pink-500 rounded-3xl p-8 text-white shadow-xl">
              <h3 className="font-bold text-lg mb-6 text-white/90">NovaNet</h3>
              <ul className="space-y-4">
                {[
                  'Zéro publicité, pour toujours',
                  'Fil chronologique ou algorithmique',
                  'Tes données t\'appartiennent',
                  'Modération communautaire',
                  'Likes masquables',
                  'Tu choisis ce que tu vois',
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-white">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-white" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Final ─── */}
      <section className="py-24 px-4 sm:px-6 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            Prêt à rejoindre la révolution ?
          </h2>
          <p className="text-white/80 text-lg mb-10">
            Gratuit pour toujours. Sans carte bancaire. Sans publicité.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="group inline-flex items-center justify-center gap-2 bg-white text-indigo-600 font-bold px-10 py-4 rounded-2xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl active:scale-95 text-base"
            >
              Créer mon compte gratuit
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 bg-white/20 text-white font-bold px-10 py-4 rounded-2xl hover:bg-white/30 transition-all text-base border border-white/30"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-100 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
              N
            </div>
            <span className="font-bold text-gray-700">NovaNet</span>
          </div>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} NovaNet. Fait avec ♥ pour les humains.
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <button className="hover:text-gray-600 transition-colors">Conditions</button>
            <button className="hover:text-gray-600 transition-colors">Confidentialité</button>
            <button className="hover:text-gray-600 transition-colors">Contact</button>
          </div>
        </div>
      </footer>
    </main>
  );
}