import { api } from '@/lib/api';
import { ErrorState } from '@/components/ui/error-state';
import { FestivalGallery } from '@/components/composite/festival-gallery';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Props {
  params: Promise<{ slug: string }>;
}

interface ProjectDetail {
  id: string;
  slug: string;
  clientName?: string;
  completedAt?: string;
  featuredImageUrl?: string;
  gallery?: string[];
  translations: Array<{
    locale: string;
    title: string;
    slug: string;
    summary?: string;
    description?: string;
    content?: string;
  }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const project = await api
      .get(`projects/${slug}`, { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 3600 } })
      .json<ProjectDetail>();
    const t = project.translations.find((x) => x.locale === 'fr') ?? project.translations[0];
    return { title: `${t?.title ?? slug} — Projets` };
  } catch {
    return { title: 'Projet — RBS Crew' };
  }
}

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;

  // Pause artificielle pour garantir l'affichage esthétique du loader
  await new Promise(resolve => setTimeout(resolve, 800));

  let project: ProjectDetail | null = null;
  let fetchError = false;

  try {
    project = await api
      .get(`projects/${slug}`, { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 3600 } })
      .json<ProjectDetail>();
  } catch (err) {
    console.error('Fetch error:', err);
    fetchError = true;
  }

  if (fetchError || !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-16">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux projets
        </Link>
        <ErrorState message="Projet introuvable ou erreur de chargement." />
      </div>
    );
  }

  const t = project.translations.find((x) => x.locale === 'fr') ?? project.translations[0];

  const completedYear = project.completedAt
    ? new Date(project.completedAt).getFullYear()
    : null;

  return (
    <article className="min-h-screen pb-24">
      {/* Hero */}
      <section className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] flex items-end justify-start overflow-hidden">
        {project.featuredImageUrl ? (
          <>
            <div className="absolute inset-0 z-0">
              <Image
                src={project.featuredImageUrl}
                alt={t?.title ?? ''}
                fill
                preload
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent z-10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-white/5 z-0" />
        )}

        <div className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-12 sm:pb-16 md:pb-24">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-white/70 hover:text-[oklch(0.72_0.19_48)] transition-colors mb-6 text-sm font-medium tracking-wide tag-graffiti px-4 py-2 border border-white/10 rounded-full bg-black/30 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux projets
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-[oklch(0.72_0.19_48)] text-black font-semibold text-xs rounded-full uppercase tracking-widest">
              Projet
            </span>
            {completedYear && (
              <span className="px-3 py-1 bg-white/10 text-white font-mono text-xs rounded-full flex items-center gap-1 backdrop-blur-sm border border-white/10">
                <Calendar className="w-3.5 h-3.5" />
                {completedYear}
              </span>
            )}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display text-white italic drop-shadow-2xl mb-4 leading-[1.1]">
            {t?.title}
          </h1>

          {project.clientName && (
            <p className="flex items-center gap-2 text-lg text-white/80 font-medium">
              <User className="w-5 h-5 text-[oklch(0.72_0.19_48)]" />
              {project.clientName}
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 -mt-8 sm:-mt-12 relative z-30">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main content */}
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
                <div dangerouslySetInnerHTML={{ __html: t.content }} />
              ) : t?.description ? (
                t.description.split('\n\n').map((paragraph, i) => {
                  if (!paragraph.trim()) return null;
                  return (
                    <p key={i} dangerouslySetInnerHTML={{ __html: paragraph.replace(/\n/g, '<br />') }} />
                  );
                })
              ) : (
                <p>{t?.summary ?? "Aucune description disponible pour ce projet."}</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="font-display text-xl text-white mb-4 border-b border-white/10 pb-4">
                À propos du projet
              </h3>
              <ul className="space-y-4">
                {project.clientName && (
                  <li className="flex justify-between items-center text-sm">
                    <span className="text-white/50">Client</span>
                    <span className="text-white font-medium">{project.clientName}</span>
                  </li>
                )}
                {completedYear && (
                  <li className="flex justify-between items-center text-sm">
                    <span className="text-white/50">Année</span>
                    <span className="font-mono text-white">{completedYear}</span>
                  </li>
                )}
                {project.gallery && project.gallery.length > 0 && (
                  <li className="flex justify-between items-center text-sm">
                    <span className="text-white/50">Photos</span>
                    <span className="font-mono text-white">{project.gallery.length}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Gallery */}
        {project.gallery && project.gallery.length > 0 && (
          <div className="mt-16 sm:mt-24">
            <div className="flex items-end justify-between border-b border-white/10 pb-4 mb-8">
              <div>
                <h2 className="text-3xl sm:text-4xl font-display text-white mb-2">Galerie du Projet</h2>
                <p className="text-white/50 text-sm">Photos et réalisations de ce projet.</p>
              </div>
              <span className="hidden sm:inline-flex px-3 py-1 bg-white/5 border border-white/10 rounded-full font-mono text-xs text-white/50">
                {project.gallery.length} photos
              </span>
            </div>

            <FestivalGallery images={project.gallery} />
          </div>
        )}
      </section>
    </article>
  );
}
