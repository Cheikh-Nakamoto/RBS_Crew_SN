import { api } from '@/lib/api';
import type { ApiResponse } from '@rbs/types';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

interface ProjectItem {
  id: string;
  slug: string;
  clientName?: string;
  country?: string;
  completedAt?: string;
  featuredImageUrl?: string;
  translations: Array<{ locale: string; title: string; summary?: string }>;
}

export const metadata = { title: 'Projets' };

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  // Pause artificielle pour montrer le loader
  await new Promise(resolve => setTimeout(resolve, 800));

  let projects: ProjectItem[] = [];
  let fetchError = false;

  try {
    const data = await api
      .get('projects', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 3600 } })
      .json<ApiResponse<ProjectItem[]>>();
    projects = data.data;
  } catch {
    fetchError = true;
  }

  return (
    <div id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      <SectionHeader
        eyebrow="Portfolio"
        title="Nos Projets"
        subtitle="Fresques murales, collaborations artistiques et interventions urbaines à travers le Sénégal et le monde."
        className="mb-14"
      />

      {fetchError && <ErrorState />}
      {!fetchError && projects.length === 0 && <EmptyState title="Aucun projet disponible" />}

      {!fetchError && projects.length > 0 && (
        <ul className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {projects.map((project, i) => {
            const t =
              project.translations.find((x) => x.locale === 'fr') ?? project.translations[0];
            const isLarge = i % 5 === 0 || i % 5 === 3;

            return (
              <li key={project.id} className="break-inside-avoid">
                <Link
                  href={`/projects/${project.slug}`}
                  aria-label={`${t?.title ?? 'Projet'}${project.clientName ? ` — ${project.clientName}` : ''}`}
                  className="group relative block overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10 hover:ring-[var(--rbs-gold)]/50 transition-all duration-500 hover:shadow-[var(--shadow-glow-gold)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rbs-gold)]/70 focus-visible:ring-offset-4 focus-visible:ring-offset-black"
                >
                  {/* Brand stripe — top-right gold accent */}
                  <span
                    aria-hidden="true"
                    className="absolute top-0 right-0 w-1 h-14 z-[3] bg-gradient-to-b from-[var(--rbs-gold)] via-[var(--rbs-red)] to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                  />

                  {project.featuredImageUrl ? (
                    <div className={`relative overflow-hidden ${isLarge ? 'aspect-[4/3]' : 'aspect-video'}`}>
                      <Image
                        src={project.featuredImageUrl}
                        alt={t?.title ?? ''}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover grayscale-[0.2] transition-all duration-700 group-hover:grayscale-0 group-hover:scale-[1.06]"
                      />
                      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-[var(--rbs-gold)]/0 group-hover:bg-[var(--rbs-gold)]/10 mix-blend-overlay transition-colors duration-500"
                      />

                      {/* Index badge — editorial mono */}
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10">
                        <span className="text-[0.65rem] font-mono font-bold tracking-widest text-white/85">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className={`relative ${isLarge ? 'aspect-[4/3]' : 'aspect-video'} bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-surface)] flex items-center justify-center`}>
                      <span className="font-display text-7xl text-white/15">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                  )}

                  <div className="p-5 space-y-2">
                    <h3 className="font-display uppercase tracking-tight text-lg leading-tight text-white group-hover:text-[var(--rbs-gold)] transition-colors duration-300 line-clamp-2">
                      {t?.title}
                    </h3>
                    {project.clientName && (
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--rbs-gold)]">
                        {project.clientName}
                      </p>
                    )}
                    {project.country && (
                      <p className="flex items-center gap-1.5 text-xs text-white/65">
                        <MapPin className="w-3 h-3 shrink-0 text-[var(--rbs-red)]" aria-hidden="true" />
                        {project.country}
                      </p>
                    )}
                    {t?.summary && (
                      <p className="text-sm text-white/65 line-clamp-2 leading-relaxed">{t.summary}</p>
                    )}
                    <div className="flex items-center gap-1.5 pt-1 text-xs font-bold uppercase tracking-[0.1em] text-white/55 group-hover:text-[var(--rbs-gold)] transition-colors duration-300">
                      <span>Voir le projet</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
