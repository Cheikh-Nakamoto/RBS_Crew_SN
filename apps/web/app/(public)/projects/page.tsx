import { api } from '@/lib/api';
import type { ApiResponse } from '@rbs/types';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

interface ProjectItem {
  id: string;
  slug: string;
  clientName?: string;
  completedAt?: string;
  featuredImageUrl?: string;
  translations: Array<{ locale: string; title: string; summary?: string }>;
}

export const metadata = { title: 'Projets' };

export default async function ProjectsPage() {
  let projects: ProjectItem[] = [];
  let fetchError = false;
console.log('Fetching projects data...');
  try {
    console.log('Making API request to /projects with Accept-Language: fr');
    const data = await api
      .get('projects', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 3600 } })
      .json<ApiResponse<ProjectItem[]>>();
    console.log('Fetched projects:', data);
    projects = data.data;
  } catch {
    fetchError = true;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <SectionHeader
        eyebrow="Portfolio"
        title="Nos Projets"
        subtitle="Fresques murales, collaborations artistiques et interventions urbaines à travers le Sénégal et le monde."
        className="mb-14"
      />

      {fetchError && <ErrorState />}
      {!fetchError && projects.length === 0 && <EmptyState title="Aucun projet disponible" />}

      {!fetchError && projects.length > 0 && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {projects.map((project, i) => {
            const t =
              project.translations.find((x) => x.locale === 'fr') ?? project.translations[0];
            const isLarge = i % 5 === 0 || i % 5 === 3; // alternating large items

            return (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className={`group break-inside-avoid bg-white/4 rounded-2xl overflow-hidden border border-white/8 hover:border-[oklch(0.72_0.19_48/40%)] transition-all duration-300 card-hover block`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {project.featuredImageUrl ? (
                  <div
                    className={`relative overflow-hidden ${
                      isLarge ? 'aspect-[4/3]' : 'aspect-video'
                    }`}
                  >
                    <Image
                      src={project.featuredImageUrl}
                      alt={t?.title ?? ''}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute inset-0 bg-[oklch(0.72_0.19_48/0%)] group-hover:bg-[oklch(0.72_0.19_48/8%)] transition-colors duration-300" />
                    {/* Index number */}
                    <div className="absolute top-3 left-3 font-display text-xs text-white/40 bg-black/40 backdrop-blur-sm rounded-md px-2 py-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-white/4 flex items-center justify-center">
                    <span className="font-display text-5xl text-white/10">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                )}

                <div className="p-5 space-y-2">
                  <h3 className="font-semibold text-white group-hover:text-[oklch(0.72_0.19_48)] transition-colors duration-200 line-clamp-2">
                    {t?.title}
                  </h3>
                  {project.clientName && (
                    <p className="text-xs text-[oklch(0.72_0.19_48)] uppercase tracking-wider">
                      {project.clientName}
                    </p>
                  )}
                  {t?.summary && (
                    <p className="text-sm text-white/40 line-clamp-2 leading-relaxed">{t.summary}</p>
                  )}
                  <div className="flex items-center gap-1.5 pt-1 text-xs text-white/30 group-hover:text-[oklch(0.72_0.19_48)] transition-colors duration-200">
                    <span>Voir le projet</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
