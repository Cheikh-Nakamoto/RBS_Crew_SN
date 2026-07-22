'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { AlertCircle, Check, ExternalLink, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useAuthedFetch } from '@/lib/use-authed-fetch';

interface ArtistTranslation {
  locale: string;
  name: string;
  bio?: string | null;
}

interface ArtistProfile {
  id: string;
  slug: string;
  isPublished: boolean;
  city?: string | null;
  country?: string | null;
  genre?: string | null;
  nationality?: string | null;
  avatarUrl?: string | null;
  featuredImageUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  twitterUrl?: string | null;
  youtubeUrl?: string | null;
  tiktokUrl?: string | null;
  websiteUrl?: string | null;
  spotifyUrl?: string | null;
  soundcloudUrl?: string | null;
  videoUrl?: string | null;
  gallery: string[];
  translations: ArtistTranslation[];
}

const SOCIAL_FIELDS = [
  ['instagramUrl', 'Instagram'],
  ['facebookUrl', 'Facebook'],
  ['twitterUrl', 'X / Twitter'],
  ['youtubeUrl', 'YouTube'],
  ['tiktokUrl', 'TikTok'],
  ['spotifyUrl', 'Spotify'],
  ['soundcloudUrl', 'SoundCloud'],
  ['websiteUrl', 'Site web'],
  ['videoUrl', 'Vidéo de présentation'],
] as const;

const TABS = ['Profil', 'Réseaux sociaux', 'Portfolio'] as const;

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all duration-200';
const labelClass = 'block text-sm font-medium text-white/60 mb-1.5';

function translationFor(profile: ArtistProfile, locale: string): ArtistTranslation {
  return (
    profile.translations.find((t) => t.locale === locale) ?? { locale, name: '', bio: '' }
  );
}

export default function EspaceArtistePage() {
  const { status } = useSession();
  const { authedFetch } = useAuthedFetch();

  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<(typeof TABS)[number]>('Profil');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [newArtwork, setNewArtwork] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/artist/me');
      if (res.status === 404) {
        setLoadError("Aucune fiche artiste n'est rattachée à ce compte. Contactez un administrateur.");
        return;
      }
      if (!res.ok) throw new Error('Impossible de charger votre fiche');
      setProfile((await res.json()) as ArtistProfile);
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }, [authedFetch]);

  useEffect(() => {
    if (status === 'authenticated') void load();
  }, [status, load]);

  function patch<K extends keyof ArtistProfile>(key: K, value: ArtistProfile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
    setSaveState('idle');
  }

  function patchTranslation(locale: string, field: 'name' | 'bio', value: string) {
    setProfile((p) => {
      if (!p) return p;
      const others = p.translations.filter((t) => t.locale !== locale);
      const current = translationFor(p, locale);
      return { ...p, translations: [...others, { ...current, [field]: value }] };
    });
    setSaveState('idle');
  }

  async function handleSave() {
    if (!profile) return;
    setSaveState('saving');
    setSaveError('');
    try {
      // Seuls les champs éditables sont envoyés : le slug et le statut de
      // publication restent réservés à l'administration (le backend les ignore
      // de toute façon).
      const res = await authedFetch('/artist/me', {
        method: 'PATCH',
        body: JSON.stringify({
          city: profile.city || null,
          country: profile.country || null,
          genre: profile.genre || null,
          nationality: profile.nationality || null,
          avatarUrl: profile.avatarUrl || null,
          featuredImageUrl: profile.featuredImageUrl || null,
          ...Object.fromEntries(
            SOCIAL_FIELDS.map(([key]) => [key, profile[key] || null]),
          ),
          translations: ['fr', 'en']
            .map((locale) => translationFor(profile, locale))
            .filter((t) => t.name.trim() !== ''),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? 'Enregistrement impossible');
      }
      setProfile((await res.json()) as ArtistProfile);
      setSaveState('saved');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur inconnue');
      setSaveState('error');
    }
  }

  async function addArtwork() {
    if (!newArtwork.trim()) return;
    const res = await authedFetch('/artist/me/artworks', {
      method: 'POST',
      body: JSON.stringify({ imageUrl: newArtwork.trim() }),
    });
    if (res.ok) {
      setProfile((await res.json()) as ArtistProfile);
      setNewArtwork('');
    }
  }

  async function removeArtwork(index: number) {
    if (!profile) return;
    const res = await authedFetch('/artist/me/artworks', {
      method: 'PUT',
      body: JSON.stringify({ gallery: profile.gallery.filter((_, i) => i !== index) }),
    });
    if (res.ok) setProfile((await res.json()) as ArtistProfile);
  }

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="glass rounded-2xl border border-white/10 p-8 max-w-md text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto" />
          <p className="text-sm text-white/70">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  const fr = translationFor(profile, 'fr');
  const en = translationFor(profile, 'en');

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl text-white">Mon espace artiste</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/40">
          <span
            className={`px-2.5 py-1 rounded-full text-xs ${
              profile.isPublished
                ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                : 'bg-white/6 text-white/50 border border-white/10'
            }`}
          >
            {profile.isPublished ? 'Fiche publiée' : 'Fiche non publiée'}
          </span>
          {profile.isPublished && (
            <Link
              href={`/crew/${profile.slug}`}
              className="inline-flex items-center gap-1.5 hover:text-white/70 transition-colors"
            >
              Voir ma page publique <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        <p className="text-xs text-white/30">
          La publication de votre fiche et son adresse sont gérées par l&apos;équipe RBS.
        </p>
      </header>

      <nav className="flex gap-2 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'text-white border-red-600'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === 'Profil' && (
        <section className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name-fr" className={labelClass}>Nom affiché (FR)</label>
              <input id="name-fr" className={inputClass} value={fr.name}
                onChange={(e) => patchTranslation('fr', 'name', e.target.value)} />
            </div>
            <div>
              <label htmlFor="name-en" className={labelClass}>Nom affiché (EN)</label>
              <input id="name-en" className={inputClass} value={en.name}
                onChange={(e) => patchTranslation('en', 'name', e.target.value)} />
            </div>
          </div>

          <div>
            <label htmlFor="bio-fr" className={labelClass}>Biographie (FR)</label>
            <textarea id="bio-fr" rows={5} className={inputClass} value={fr.bio ?? ''}
              onChange={(e) => patchTranslation('fr', 'bio', e.target.value)} />
          </div>
          <div>
            <label htmlFor="bio-en" className={labelClass}>Biographie (EN)</label>
            <textarea id="bio-en" rows={5} className={inputClass} value={en.bio ?? ''}
              onChange={(e) => patchTranslation('en', 'bio', e.target.value)} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className={labelClass}>Ville</label>
              <input id="city" className={inputClass} value={profile.city ?? ''}
                onChange={(e) => patch('city', e.target.value)} />
            </div>
            <div>
              <label htmlFor="country" className={labelClass}>Pays</label>
              <input id="country" className={inputClass} value={profile.country ?? ''}
                onChange={(e) => patch('country', e.target.value)} />
            </div>
            <div>
              <label htmlFor="genre" className={labelClass}>Discipline / genre</label>
              <input id="genre" className={inputClass} value={profile.genre ?? ''}
                onChange={(e) => patch('genre', e.target.value)} />
            </div>
            <div>
              <label htmlFor="nationality" className={labelClass}>Nationalité</label>
              <input id="nationality" className={inputClass} value={profile.nationality ?? ''}
                onChange={(e) => patch('nationality', e.target.value)} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="avatarUrl" className={labelClass}>Photo de profil (URL)</label>
              <input id="avatarUrl" className={inputClass} value={profile.avatarUrl ?? ''}
                onChange={(e) => patch('avatarUrl', e.target.value)} />
            </div>
            <div>
              <label htmlFor="featuredImageUrl" className={labelClass}>Image de couverture (URL)</label>
              <input id="featuredImageUrl" className={inputClass} value={profile.featuredImageUrl ?? ''}
                onChange={(e) => patch('featuredImageUrl', e.target.value)} />
            </div>
          </div>
        </section>
      )}

      {tab === 'Réseaux sociaux' && (
        <section className="grid sm:grid-cols-2 gap-4">
          {SOCIAL_FIELDS.map(([key, label]) => (
            <div key={key}>
              <label htmlFor={key} className={labelClass}>{label}</label>
              <input
                id={key}
                className={inputClass}
                placeholder="https://…"
                value={(profile[key] as string | null) ?? ''}
                onChange={(e) => patch(key, e.target.value)}
              />
            </div>
          ))}
        </section>
      )}

      {tab === 'Portfolio' && (
        <section className="space-y-5">
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="URL d'une image de votre portfolio"
              value={newArtwork}
              onChange={(e) => setNewArtwork(e.target.value)}
            />
            <button
              type="button"
              onClick={addArtwork}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-sm text-white/80 hover:bg-white/10 transition-colors"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>

          {profile.gallery.length === 0 ? (
            <p className="text-sm text-white/30">Votre portfolio est vide.</p>
          ) : (
            <ul className="grid sm:grid-cols-3 gap-4">
              {profile.gallery.map((url, i) => (
                <li key={url} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full aspect-square object-cover rounded-xl border border-white/10" />
                  <button
                    type="button"
                    onClick={() => removeArtwork(i)}
                    aria-label="Retirer cette image"
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white/70 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <footer className="flex items-center gap-4 pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {saveState === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
        {saveState === 'saved' && (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-300">
            <Check className="w-4 h-4" /> Modifications enregistrées
          </span>
        )}
        {saveState === 'error' && (
          <span className="inline-flex items-center gap-1.5 text-sm text-red-300">
            <AlertCircle className="w-4 h-4" /> {saveError}
          </span>
        )}
      </footer>
    </div>
  );
}
