import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { ApiResponse } from '@rbs/types';
import { HeroBackground } from '@/components/hero-background';
import { Button } from '@/components/ui/button';
import { AnimatedTitle } from '@/components/ui/animated-title';
import { InteractiveTransition } from '@/components/ui/interactive-transition';
import { EditionHero } from '@/components/composite/last-wall-tour-hero';
import type { EditionHeroStat } from '@/components/composite/last-wall-tour-hero';
import { ProjectCarousel, type CarouselProject } from '@/components/composite/project-carousel';
import { AkademyaCTA } from '@/components/composite/akademya-cta';
import { CrewHero, type CrewMember } from '@/components/composite/crew-hero';
import { SponsorsMarquee } from '@/components/composite/sponsors-marquee';
import {
  UpcomingFestivalHero,
  type UpcomingFestival,
} from '@/components/composite/upcoming-festival-hero';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProjectItem {
  id: string;
  slug: string;
  clientName?: string;
  featuredImageUrl?: string;
  translations: Array<{ locale: string; title: string; summary?: string }>;
}

interface LatestFestivalGallery {
  editionNumber: number;
  year: number;
  themeName: string;
  description: string;
  gallery: string[];
}

// ── Fallback images ────────────────────────────────────────────────────────────

const FALLBACK_IMAGES: string[] = [
  '/9th_edition_1.png',
  '/9th_edition_2.png',
  '/9th_edition_3.png',
  '/9th_edition_4.png',
  '/9th_edition_5.png',
  '/9th_edition_6.png',
];

export default async function HomePage() {
  const [projectsData, latestFestivalData, upcomingFestivalData] = await Promise.allSettled([
    api.get('projects?limit=10', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 3600 } }).json<ApiResponse<ProjectItem[]>>(),
    api.get('festival/latest/gallery', { next: { revalidate: 3600 } }).json<LatestFestivalGallery>(),
    api.get('festival/upcoming', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 300 } }).json<{ data: UpcomingFestival | null }>(),
  ]);

  const projects = projectsData.status === 'fulfilled' ? projectsData.value.data : [];
  const latestFestival = latestFestivalData.status === 'fulfilled' ? latestFestivalData.value : null;
  const upcomingFestival =
    upcomingFestivalData.status === 'fulfilled' ? (upcomingFestivalData.value?.data ?? null) : null;
  const fetchError = projectsData.status === 'rejected';

  // ── Carousel projects from API ──────────────────
  const carouselProjects: CarouselProject[] = (() => {
    if (projects.length === 0) return [];
    return projects.slice(0, 10).map((p) => {
      const t = p.translations.find((x) => x.locale === 'fr') ?? p.translations[0];
      return {
        id: p.id,
        slug: p.slug,
        title: t?.title ?? 'Projet',
        summary: t?.summary ?? '',
        images: p.featuredImageUrl ? [p.featuredImageUrl] : [],
        clientName: p.clientName,
      };
    });
  })();

  // ── Akademya fallback images ──────────────────
  const AKADEMYA_IMAGES = [
    "/akademya_left.png",
    "/ATELIERS-RBS_CENTRAL.png",
    "/akademya_right.png"
  ];

  // ── Fallback for carousel ──────────────────────
  const carouselFallback: CarouselProject[] = [
    {
      id: 'fallback-1',
      slug: 'grands-moulins',
      title: 'Les Grands Moulin',
      summary: 'En décembre 2024, le RBS Crew a été invité à intervenir sur les murs des Grands Moulins de Dakar, dans le cadre d\'un projet artistique et patrimonial inédit. À travers cette fresque, le collectif a proposé une lecture visuelle de l\'histoire industrielle, sociale et humaine de ce site emblématique, au cœur de la capitale sénégalaise.',
      images: [FALLBACK_IMAGES[3], FALLBACK_IMAGES[4], FALLBACK_IMAGES[5]],
      clientName: 'Grands Moulins de Dakar',
    },
    {
      id: 'fallback-2',
      slug: 'murales-dakar',
      title: 'Murales Dakar',
      summary: 'Une série d\'interventions murales à travers les quartiers de Dakar, mêlant portraits, motifs géométriques et calligraphies.',
      images: [FALLBACK_IMAGES[0], FALLBACK_IMAGES[1]],
      clientName: 'Ville de Dakar',
    },
    {
      id: 'fallback-3',
      slug: 'serigraphie-rbs',
      title: 'Sérigraphie RBS',
      summary: 'Atelier de sérigraphie produisant des éditions limitées sur textile et papier, alliant techniques artisanales et design contemporain.',
      images: [FALLBACK_IMAGES[2], FALLBACK_IMAGES[1]],
      clientName: 'RBS Akademya',
    },
  ];

  // ── Crew members ───────────────────────────────
  const crewMembers: CrewMember[] = [
    { name: 'Diablo', role: 'Visual Artist', imageUrl: '/DIABLO.png', slug: 'diablo' },
    { name: 'Madzoo', role: 'Visual Artist', imageUrl: '/MADZO.png', slug: 'mad-zoo' },
    { name: 'Mane', role: 'Calligrapher', imageUrl: '/MANE.png', slug: 'mane' },
    { name: 'Elmemf', role: 'Graffiti Artist', imageUrl: '/ELMEMF.png', slug: 'elmemf' },
  ];

  return (
    <div className="overflow-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section
        id="main-content"
        className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden pt-20 pb-24 md:pb-28 noise-texture"
      >
        <HeroBackground images={[]} interval={5000} />

        {/* Layered overlays — vignette + brand gradient wash */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/90 z-[2] pointer-events-none" />
        <div
          className="absolute inset-0 z-[3] pointer-events-none mix-blend-overlay opacity-60"
          style={{ background: 'var(--gradient-rbs-soft)' }}
        />
        {/* Decorative ghost number — pinned to section (not grid) */}
        <span
          aria-hidden="true"
          className="display-number absolute top-24 right-6 md:right-12 hidden md:block select-none z-[4]"
        >
          012
        </span>

        <div className="relative z-[10] w-full max-w-[90rem] mx-auto px-6 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-11 lg:col-span-10 flex flex-col gap-7 items-start justify-center">
            {/* Eyebrow — meta tag */}

              <h1 className="font-display text-[2.5rem] sm:text-[3.25rem] md:text-8xl lg:text-[7rem] xl:text-[8.5rem] font-bold leading-[0.85] tracking-tighter text-white uppercase text-balance drop-shadow-[0_4px_30px_rgba(0,0,0,0.55)]">
                <AnimatedTitle className="block text-white" />
              </h1>


            <p className="relative max-w-xl text-base leading-relaxed text-white/85 rounded-xl px-4 py-3.5 md:px-0 md:py-0 bg-black/35 md:bg-transparent border border-white/5 md:border-0 backdrop-blur-md md:backdrop-blur-none">
              Fondé en 2012, ce crew rassemble plus de 30 artistes. Entre fresques murales,
              sérigraphie et la 1ère école de graffiti d&apos;Afrique, le RBS Crew redessine l&apos;espace urbain.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="solid-premium" size="xl" className="group/cta tracking-[0.15em] uppercase">
                <Link
                  href="/crew"
                  className="focus-visible:ring-2 focus-visible:ring-[var(--rbs-gold)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Découvrir le Crew
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline-neon" size="xl" className="group/cta tracking-[0.15em] uppercase">
                <Link
                  href="/festival"
                  className="focus-visible:ring-2 focus-visible:ring-[var(--rbs-gold)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Festival
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

      </section>

      {/* Bottom marquee strip — kinetic detail with interactive hover */}
      <InteractiveTransition />

      {/* ── Prochaine édition du festival ─────────────────────────────── */}
      {upcomingFestival && (
        <UpcomingFestivalHero edition={upcomingFestival} variant="home" />
      )}

      {/* ── Last Wall Tour Festival ───────────────────────────────────────────── */}
      <EditionHero
        editionNumber={latestFestival?.editionNumber ?? 9}
        year={latestFestival?.year ?? 2024}
        themeName={latestFestival?.themeName || 'TRANSMISSION'}
        description={
          latestFestival?.description ||
          "Depuis la première édition à Thiès en 2014, le RBS Crew organise chaque année ce festival, parcourant différentes villes du Sénégal. Durant cette décennie, le collectif a défendu et partagé sa vision à travers des thématiques variées, accueillant chaque année un invité différent. Ce festival a permis au RBS Crew de s'étendre au-delà de Dakar, renforçant ainsi sa notoriété et son expérience."
        }
        galleryImages={
          latestFestival?.gallery?.length ? latestFestival.gallery.slice(0, 6) : FALLBACK_IMAGES
        }
        stats={[
          { value: '10+', label: 'Editions' },
          { value: '15+', label: 'villes' },
          { value: '50+', label: 'Artistes' },
          { value: '100+', label: 'Œuvres' },
        ] as EditionHeroStat[]}
        logoUrl="/LWT_logo.png"
      />

      {/* ── Projet Phare — Carousel de projets ─────────────────────────── */}
      <ProjectCarousel
        projects={fetchError || carouselProjects.length === 0 ? carouselFallback : carouselProjects}
        primaryCta={{ label: 'collaborer', href: '/contact' }}
        secondaryCta={{ label: 'voir tous les projets', href: '/projects' }}
      />

      {/* ── Wrapped Section 4 & 5 (Akademya CTA + Crew Hero) with Section 4 background ── */}
      <div
        className="relative w-full bg-cover bg-center bg-no-repeat noise-texture"
        style={{ backgroundImage: "url('/section4_background.png')" }}
      >
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none z-0" />

        <div className="relative z-10">
          {/* ── RBS Akademya CTA ───────────────────────────────────────── */}
          <AkademyaCTA
            title="RBS AKADEMYA"
            description={'"La première école de graffiti d\'Afrique. Ateliers, formations et masterclass pour la nouvelle génération d\'artistes urbains."'}
            images={AKADEMYA_IMAGES}
            logoUrl="/LWT_logo.png"
            cta={{ label: "Découvrir l'Akademya", href: '/labz' }}
          />

          {/* ── Crew Hero ─────────────────────────────────────────────── */}
          <CrewHero
            members={crewMembers}
            cta={{ label: 'Voir le crew', href: '/crew' }}
          />
        </div>
      </div>

      {/* ── Sponsors Marquee ──────────────────────────────────────── */}
      <SponsorsMarquee />

    </div>
  );
}
