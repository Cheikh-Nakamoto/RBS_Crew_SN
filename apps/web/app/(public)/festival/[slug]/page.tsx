import { api } from '@/lib/api';
import type { ApiResponse } from '@rbs/types';
import { ErrorState } from '@/components/ui/error-state';
import { MapPin, Calendar, ArrowLeft, ExternalLink, Play, Building2, Users } from 'lucide-react';
import Link from 'next/link';
import { FestivalGallery } from '@/components/composite/festival-gallery';

interface FestivalArtist {
  artistId: string;
  artistName: string;
  artistSlug: string;
  artistAvatarUrl?: string;
  role: string;
  stageOrder: number;
}

interface FestivalEditionItem {
  id: string;
  slug: string;
  editionNumber: number;
  year: number;
  city?: string;
  country: string;
  mainImage?: string;
  heroImage?: string;
  gallery?: string[];
  typography?: string[];
  startDate?: string;
  endDate?: string;
  venue?: string;
  venueAddress?: string;
  ticketUrl?: string;
  videoUrl?: string;
  artists?: FestivalArtist[];
  translations: Array<{ locale: string; themeName: string; summary?: string; content?: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: 'Détails Édition — Last Wall Tour' };
}

export const dynamic = 'force-dynamic';

export default async function FestivalEditionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Pause artificielle pour garantir l'affichage esthétique du loader
  await new Promise(resolve => setTimeout(resolve, 800));

  let edition: FestivalEditionItem | null = null;
  let fetchError = false;

  try {
    const data = await api
      .get(`festival/${slug}`, { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 3600 } })
      .json<FestivalEditionItem>();
    edition = data ?? null;
  } catch (err) {
    console.error('Fetch error:', err);
    fetchError = true;
  }

  if (fetchError || !edition) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-16">
        <Link href="/festival" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Retour aux éditions
        </Link>
        <ErrorState message="Édition introuvable ou erreur de chargement." />
      </div>
    );
  }

  const t = edition.translations.find((x) => x.locale === 'fr') ?? edition.translations[0];
  const bgImage = edition.heroImage || edition.mainImage;

  return (
    <article className="min-h-screen pb-24">
      {/* Hero Banner Component */}
      <section className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] flex items-end justify-start overflow-hidden">
        {/* Background Image */}
        {bgImage ? (
          <>
            <div className="absolute inset-0 z-0">
              <img src={bgImage} alt={t?.themeName} className="w-full h-full object-cover object-center" />
            </div>
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent z-10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-white/5 z-0" />
        )}

        <div className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-12 sm:pb-16 md:pb-24">
          <Link href="/festival" className="inline-flex items-center gap-2 text-white/70 hover:text-[oklch(0.72_0.19_48)] transition-colors mb-6 text-sm font-medium tracking-wide tag-graffiti px-4 py-2 border border-white/10 rounded-full bg-black/30 backdrop-blur-sm">
            <ArrowLeft className="w-4 h-4" />
            Retour à l&apos;Historique
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-[oklch(0.72_0.19_48)] text-black font-semibold text-xs rounded-full uppercase tracking-widest">
              Édition {edition.editionNumber}
            </span>
            <span className="px-3 py-1 bg-white/10 text-white font-mono text-xs rounded-full flex items-center gap-1 backdrop-blur-sm border border-white/10">
              <Calendar className="w-3.5 h-3.5" />
              {edition.year}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display text-white italic drop-shadow-2xl mb-4 leading-[1.1]">
            {t?.themeName}
          </h1>

          {edition.city && (
            <p className="flex items-center gap-2 text-lg text-white/80 font-medium">
              <MapPin className="w-5 h-5 text-[oklch(0.72_0.19_48)]" />
              {edition.city}, {edition.country}
            </p>
          )}
        </div>
      </section>

      {/* Main Content Component */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 -mt-8 sm:-mt-12 relative z-30">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Biography Column */}
          <div className="lg:col-span-8 bg-[#0a0a0a] rounded-t-3xl sm:rounded-3xl pt-8 sm:p-8 md:p-10 border-t border-x-0 sm:border border-white/10 shadow-2xl">
            <style dangerouslySetInnerHTML={{__html: `
              .rich-text-content * { color: rgba(255, 255, 255, 0.8) !important; }
              .rich-text-content strong, .rich-text-content strong *,
              .rich-text-content h1, .rich-text-content h2, .rich-text-content h3, 
              .rich-text-content h4, .rich-text-content h5, .rich-text-content h6 { color: white !important; }
              .rich-text-content a, .rich-text-content a * { color: oklch(0.72 0.19 48) !important; }
            `}} />
            <div className="rich-text-content prose prose-invert prose-lg max-w-none prose-p:leading-relaxed">
              {t?.content ? (
                // Safe basic split formatting for standard paragraphs
                t.content.split('\n\n').map((paragraph, i) => {
                  if (!paragraph.trim()) return null;
                  return <p key={i} dangerouslySetInnerHTML={{ __html: paragraph.replace(/\n/g, '<br />') }} />;
                })
              ) : (
                <p>{t?.summary || "Aucune description détaillée n'est disponible pour cette édition."}</p>
              )}
            </div>
          </div>
          
          {/* Metadata Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="font-display text-xl text-white mb-4 border-b border-white/10 pb-4">À propos de l&apos;édition</h3>
              <ul className="space-y-4">
                <li className="flex justify-between items-center text-sm">
                  <span className="text-white/50">Année</span>
                  <span className="font-mono text-white">{edition.year}</span>
                </li>
                <li className="flex justify-between items-center text-sm">
                  <span className="text-white/50">Numéro</span>
                  <span className="text-white font-medium">#{edition.editionNumber}</span>
                </li>
                {edition.city && (
                  <li className="flex justify-between items-center text-sm">
                    <span className="text-white/50">Localisation</span>
                    <span className="text-white font-medium">{edition.city}</span>
                  </li>
                )}
                {(edition.startDate || edition.endDate) && (
                  <li className="flex flex-col gap-1 text-sm">
                    <span className="text-white/50">Dates</span>
                    <span className="text-white font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[oklch(0.72_0.19_48)]" />
                      {edition.startDate ? new Date(edition.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                      {edition.endDate && edition.startDate !== edition.endDate && ` → ${new Date(edition.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                    </span>
                  </li>
                )}
                {edition.venue && (
                  <li className="flex flex-col gap-1 text-sm">
                    <span className="text-white/50">Lieu</span>
                    <span className="text-white font-medium flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[oklch(0.72_0.19_48)]" />
                      {edition.venue}
                    </span>
                    {edition.venueAddress && <span className="text-white/40 text-xs pl-5">{edition.venueAddress}</span>}
                  </li>
                )}
              </ul>

              {edition.ticketUrl && (
                <div className="mt-6">
                  <a
                    href={edition.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[oklch(0.72_0.19_48)] text-black font-semibold text-sm rounded-xl hover:brightness-110 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Billetterie
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Video Section */}
        {edition.videoUrl && (
          <div className="mt-16 sm:mt-20">
            <div className="flex items-end justify-between border-b border-white/10 pb-4 mb-8">
              <div>
                <h2 className="text-3xl sm:text-4xl font-display text-white mb-2 flex items-center gap-3">
                  <Play className="w-7 h-7 text-[oklch(0.72_0.19_48)]" />
                  Vidéo
                </h2>
              </div>
            </div>
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10">
              <iframe
                src={edition.videoUrl.replace('watch?v=', 'embed/')}
                title="Festival video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        {/* Lineup Section */}
        {edition.artists && edition.artists.length > 0 && (
          <div className="mt-16 sm:mt-20">
            <div className="flex items-end justify-between border-b border-white/10 pb-4 mb-8">
              <div>
                <h2 className="text-3xl sm:text-4xl font-display text-white mb-2 flex items-center gap-3">
                  <Users className="w-7 h-7 text-[oklch(0.72_0.19_48)]" />
                  Lineup
                </h2>
                <p className="text-white/50 text-sm">Les artistes de cette édition.</p>
              </div>
              <span className="hidden sm:inline-flex px-3 py-1 bg-white/5 border border-white/10 rounded-full font-mono text-xs text-white/50">
                {edition.artists.length} artistes
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {edition.artists.map((artist) => (
                <Link
                  key={artist.artistId}
                  href={`/crew/${artist.artistSlug}`}
                  className="group flex flex-col items-center gap-3 text-center p-4 rounded-2xl bg-white/3 border border-white/8 hover:border-[oklch(0.72_0.19_48/40%)] hover:bg-white/6 transition-all duration-300"
                >
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-[oklch(0.72_0.19_48)] transition-colors">
                    {artist.artistAvatarUrl ? (
                      <img src={artist.artistAvatarUrl} alt={artist.artistName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center">
                        <span className="text-white/40 text-xl font-display">{artist.artistName?.[0]}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold leading-tight group-hover:text-[oklch(0.72_0.19_48)] transition-colors">{artist.artistName}</p>
                    {artist.role !== 'performer' && (
                      <p className="text-white/40 text-xs mt-0.5 capitalize">{artist.role}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Gallery Section Component */}
        {edition.gallery && edition.gallery.length > 0 && (
          <div className="mt-16 sm:mt-24">
            <div className="flex items-end justify-between border-b border-white/10 pb-4 mb-8">
              <div>
                <h2 className="text-3xl sm:text-4xl font-display text-white mb-2">Galerie de l&apos;Édition</h2>
                <p className="text-white/50 text-sm">Découvrez les œuvres, murs et moments du festival.</p>
              </div>
              <span className="hidden sm:inline-flex px-3 py-1 bg-white/5 border border-white/10 rounded-full font-mono text-xs text-white/50">
                {edition.gallery.length} photos
              </span>
            </div>
            
            <FestivalGallery images={edition.gallery} />
          </div>
        )}
      </section>
    </article>
  );
}
