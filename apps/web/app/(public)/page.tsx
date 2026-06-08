import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import type { ApiResponse } from '@rbs/types';
import { formatXOF } from '@/lib/format';
import { HeroBackground } from '@/components/hero-background';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { Button } from '@/components/ui/button';
import { AnimatedTitle } from '@/components/ui/animated-title';
import { InteractiveTransition } from '@/components/ui/interactive-transition';
import { EditionHero } from '@/components/composite/last-wall-tour-hero';
import type { EditionHeroStat } from '@/components/composite/last-wall-tour-hero';
import { ProjectCarousel, type CarouselProject } from '@/components/composite/project-carousel';
import { AkademyaCTA } from '@/components/composite/akademya-cta';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProjectItem {
  id: string;
  slug: string;
  clientName?: string;
  featuredImageUrl?: string;
  translations: Array<{ locale: string; title: string; summary?: string }>;
}

interface ProductItem {
  id: string;
  slug: string;
  price: number;
  featuredImageUrl?: string;
  translations: Array<{ locale: string; name: string; slug: string }>;
}

interface ArtistItem {
  id: string;
  slug: string;
  city?: string;
  country?: string;
  featuredImageUrl?: string;
  translations: Array<{ locale: string; name: string }>;
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

const FALLBACK_THUMB = [
  { title: 'Murales Dakar', image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&q=80', tag: 'Graffiti' },
  { title: 'Sérigraphie RBS', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', tag: 'Sérigraphie' },
  { title: 'Festival Last Wall', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80', tag: 'Festival' },
];

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Pause artificielle pour montrer le loader
  await new Promise(resolve => setTimeout(resolve, 800));

  const [projectsData, productsData, artistsData, latestFestivalData] = await Promise.allSettled([
    api.get('projects?limit=10', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 3600 } }).json<ApiResponse<ProjectItem[]>>(),
    api.get('products?limit=4&status=PUBLISHED', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 1800 } }).json<ApiResponse<ProductItem[]>>(),
    api.get('artists?limit=10', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 3600 } }).json<ApiResponse<ArtistItem[]>>(),
    api.get('festival/latest/gallery', { next: { revalidate: 3600 } }).json<LatestFestivalGallery>(),
  ]);

  const projects = projectsData.status === 'fulfilled' ? projectsData.value.data : [];
  const products = productsData.status === 'fulfilled' ? productsData.value.data : [];
  const artists = artistsData.status === 'fulfilled' ? artistsData.value.data : [];
  const latestFestival = latestFestivalData.status === 'fulfilled' ? latestFestivalData.value : null;
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
    FALLBACK_IMAGES[0],
    FALLBACK_IMAGES[1],
    FALLBACK_IMAGES[2],
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

  const thematicCols = [
    {
      tag: artists[0]?.city ?? 'Dakar',
      title: projects[0]?.translations.find(t => t.locale === 'fr')?.title ?? 'Murales',
      image: projects[0]?.featuredImageUrl ?? FALLBACK_THUMB[0].image,
    },
    {
      tag: artists[1]?.city ?? 'Thiès',
      title: projects[1]?.translations.find(t => t.locale === 'fr')?.title ?? 'Sérigraphie',
      image: projects[1]?.featuredImageUrl ?? FALLBACK_THUMB[1].image,
    },
    {
      tag: artists[2]?.city ?? 'Saint-Louis',
      title: projects[2]?.translations.find(t => t.locale === 'fr')?.title ?? 'Last Wall',
      image: projects[2]?.featuredImageUrl ?? FALLBACK_THUMB[2].image,
    },
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

            <h1 className="font-display text-[3.25rem] sm:text-7xl md:text-8xl lg:text-[7rem] xl:text-[8.5rem] font-bold leading-[0.85] tracking-tighter text-white uppercase text-balance drop-shadow-[0_4px_30px_rgba(0,0,0,0.55)]">
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

      {/* ── Last Wall Tour Festival ───────────────────────────────────────────── */}
      <EditionHero
        editionNumber={latestFestival?.editionNumber ?? 9}
        year={latestFestival?.year ?? 2024}
        themeName={latestFestival?.themeName || 'TRANSMISSION'}
        description={
          latestFestival?.description ||
          "Depuis la première édition à Thiès en 2014, le RBS Crew organise chaque année ce festival, parcourant différentes villes du Sénégal. Durant cette décennie, le collectif a défendu et partagé sa vision à travers des thématiques variées, accueillant chaque année un invité différent. Ce festival a permis au RBS Crew de s'étendre au-delà de Dakar, renforçant ainsi sa notoriété et son expérience."
        }
        galleryImages={(() => {
          // const real = latestFestival?.gallery ?? [];
          // Use real images first, fill remaining slots with fallbacks
          const merged = [
            ...FALLBACK_IMAGES.slice(0, 6),
          ];
          return merged;
        })()}
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

      {/* ── RBS Akademya CTA ───────────────────────────────────────── */}
      <AkademyaCTA
        title="RBS AKADEMYA"
        description={'"La première école de graffiti d\'Afrique. Ateliers, formations et masterclass pour la nouvelle génération d\'artistes urbains."'}
        images={AKADEMYA_IMAGES}
        logoUrl="/LWT_logo.png"
        cta={{ label: "Découvrir l'Akademya", href: '/labz' }}
      />

      {/* ── Merch & Shop ────────────────────────────────────────────── */}
      {products.length > 0 && (
        <section className="border-t border-white/10 py-12 px-6">
          <ScrollReveal>
            <div className="max-w-[90rem] mx-auto flex flex-col md:flex-row items-center justify-between gap-8 pt-8">
              <h3 className="text-white/40 text-xs uppercase tracking-[0.3em] font-bold flex-shrink-0">
                // Merch &amp; Shop
              </h3>
              <div className="flex flex-wrap gap-6 justify-end items-center">
                {products.map(p => {
                  const t = p.translations.find((x) => x.locale === 'fr') ?? p.translations[0];
                  return (
                    <Link
                      key={p.id}
                      href={`/shop/${t?.slug || p.slug}`}
                      className="group flex items-center gap-3 min-h-[44px] px-1"
                    >
                      <span className="text-white/80 group-hover:text-[var(--rbs-red)] font-semibold uppercase tracking-wider text-xs transition-colors">
                        {t?.name}
                      </span>
                      <span className="text-white/30 text-xs">[{formatXOF(p.price)}]</span>
                    </Link>
                  );
                })}
                <Link
                  href="/shop"
                  className="flex items-center gap-2 text-[var(--rbs-red)] text-xs font-bold uppercase tracking-wider hover:text-[var(--rbs-red-light)] transition-colors ml-4 min-h-[44px]"
                >
                  Voir tout <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>
      )}
    </div>
  );
}
