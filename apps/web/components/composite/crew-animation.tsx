'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';

interface ArtistItem {
  id: string;
  slug: string;
  city?: string;
  country?: string;
  featuredImageUrl?: string;
  avatarUrl?: string;
  translations: Array<{ locale: string; name: string; bio?: string }>;
}

interface CrewAnimationProps {
  artists: ArtistItem[];
}

/* ═══════════ Splash peinture ═══════════ */

const SPLATTER_COLORS = [
  'oklch(0.72 0.19 48 / 45%)',
  'oklch(0.52 0.20 18 / 40%)',
  'oklch(0.45 0.14 145 / 35%)',
  'oklch(1 0 0 / 30%)',
  'oklch(0.65 0.18 18 / 35%)',
];

interface Splat {
  id: number;
  left: number;
  top: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  rx: number;
  ry: number;
}

function generateSplats(seed: number): Splat[] {
  const pseudoRandom = (n: number) => {
    const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  return Array.from({ length: 9 }, (_, i) => ({
    id: i,
    left: 10 + pseudoRandom(i * 3 + 1) * 80,
    top: 5 + pseudoRandom(i * 3 + 2) * 90,
    size: 18 + pseudoRandom(i * 3 + 3) * 55,
    color: SPLATTER_COLORS[Math.floor(pseudoRandom(i * 7) * SPLATTER_COLORS.length)],
    delay: pseudoRandom(i * 5) * 0.6,
    duration: 0.8 + pseudoRandom(i * 11) * 1.2,
    rx: 30 + pseudoRandom(i * 13) * 60,
    ry: 30 + pseudoRandom(i * 17) * 60,
  }));
}

function PaintSplash({ seed }: { seed: number }) {
  const splats = useMemo(() => generateSplats(seed), [seed]);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {splats.map((s) => (
        <span
          key={`${seed}-${s.id}`}
          className="absolute animate-paint-drop"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size * (0.5 + s.ry / 100),
            backgroundColor: s.color,
            borderRadius: `${s.rx}% ${100 - s.rx}% ${s.ry}% ${100 - s.ry}% / ${s.ry}% ${s.rx}% ${100 - s.ry}% ${100 - s.rx}%`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            filter: 'blur(1px)',
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════ Portrait ═══════════ */

function ArtistPortrait({ src, alt }: { src: string | undefined; alt: string }) {
  if (!src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-surface)]">
        <span className="font-display text-7xl text-white/10">{alt?.[0] ?? '?'}</span>
      </div>
    );
  }
  return <Image src={src} alt={alt} fill sizes="320px" className="object-cover" />;
}

/* ═══════════ COMPOSANT PRINCIPAL ═══════════ */

const NAMES_PER_VIEW = 4;

const VALUES_LIST = [
  {
    term: 'Liberté expressive',
    desc: 'Nous travaillons hors des carcans, avec la main, l&apos;œil et le cœur.',
  },
  {
    term: 'Autonomie artistique',
    desc: 'Nous décidons de ce que nous disons, de comment nous le disons, et avec qui.',
  },
  {
    term: 'Transmission',
    desc: 'Nous enseignons ce que nous avons appris, pour que d&apos;autres puissent prendre le relais.',
  },
  {
    term: 'Mémoire urbaine',
    desc: 'Nos œuvres ancrent l&apos;histoire de nos villes, la vie de nos quartiers, la voix des oubliés.',
  },
  {
    term: 'Panafricanisme créatif',
    desc: 'Nos racines sont africaines, notre regard global.',
  },
];

const REACH_LIST = [
  "s&apos;impose comme une figure marquante du graffiti et des arts urbains en Afrique.",
  "réalise des projets nationaux et internationaux : collaborations, festivals, écoles, interventions publiques.",
  "a fondé en 2021 la RBS Akademy, première école de graffiti en Afrique, pour assurer la relève.",
];

export function CrewAnimation({ artists }: CrewAnimationProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [nameOffset, setNameOffset] = useState(0);

  const activeIndex = hoveredIndex ?? 0;
  const activeArtist = artists[activeIndex];
  const activeT =
    activeArtist?.translations.find((x) => x.locale === 'fr') ??
    activeArtist?.translations[0];
  const activeImg = activeArtist?.avatarUrl || activeArtist?.featuredImageUrl;

  // 4 noms visibles avec wrap-around circulaire
  const visibleNames = useMemo(() => {
    const result = [];
    for (let i = 0; i < NAMES_PER_VIEW; i++) {
      const idx = (nameOffset + i) % artists.length;
      result.push({ artist: artists[idx], index: idx });
    }
    return result;
  }, [nameOffset, artists]);

  const scrollNames = (dir: 'left' | 'right') => {
    setNameOffset((prev) => {
      const next = dir === 'right' ? prev + 1 : prev - 1;
      // Wrap-around circulaire
      if (next >= artists.length) return 0;
      if (next < 0) return artists.length - 1;
      return next;
    });
  };

  return (
    <div className="flex gap-0 min-h-screen">
      {/* ── COLONNE GAUCHE (40%) — Sticky ── */}
      <div className="w-[40%] flex-shrink-0 sticky top-0 h-screen flex flex-col bg-[var(--bg-page)] border-r border-white/5">
        {/* Zone image */}
        <div className="flex-1 relative flex items-center justify-center p-6">
          {/* Background flouté */}
          {activeImg && (
            <Image
              src={activeImg}
              alt=""
              fill
              sizes="40vw"
              className="object-cover blur-2xl scale-110 opacity-15"
              aria-hidden="true"
            />
          )}

          {/* Conteneur portrait */}
          <div className="relative w-full max-w-xs aspect-[3/4]">
            {/* Rectangle déphasé */}
            <div
              className="absolute border-2 border-[var(--rbs-gold)]/25 rounded-2xl -translate-x-4 translate-y-4 rotate-[2deg]"
              style={{ width: '100%', height: '100%' }}
              aria-hidden="true"
            />
            <div
              className="absolute border border-[var(--rbs-red)]/20 rounded-2xl translate-x-2 -translate-y-3 -rotate-1"
              style={{ width: '100%', height: '100%' }}
              aria-hidden="true"
            />

            {/* Splash */}
            <PaintSplash seed={activeIndex} />

            {/* Image avec slide */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                className="absolute inset-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60"
                initial={{ x: '80%', opacity: 0, scale: 0.95 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: '80%', opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <ArtistPortrait src={activeImg} alt={activeT?.name ?? ''} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" aria-hidden="true" />

                {/* Badge index */}
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10">
                  <span className="text-[0.65rem] font-mono font-bold tracking-widest text-white/85">
                    {String(activeIndex + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Nom + ville */}
                <div className="absolute inset-x-0 bottom-0 p-5 pointer-events-none">
                  <h2 className="font-display text-lg uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                    {activeT?.name}
                  </h2>
                  {activeArtist?.city && (
                    <p className="text-xs font-bold tracking-[0.15em] text-[var(--rbs-gold)] uppercase mt-1">
                      {activeArtist.city}
                      {activeArtist.country ? `, ${activeArtist.country}` : ''}
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Carrousel noms horizontal ── */}
        <div className="flex-shrink-0 border-t border-white/5 bg-black/30 backdrop-blur-sm px-4 py-4">
          <div className="flex items-center gap-2">
            {/* Bouton gauche */}
            <button
              onClick={() => scrollNames('left')}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all duration-200"
              aria-label="Noms précédents"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Noms visibles */}
            <div className="flex-1 flex items-center justify-center gap-5 overflow-hidden">
              {visibleNames.map(({ artist, index }) => {
                const t =
                  artist.translations.find((x) => x.locale === 'fr') ??
                  artist.translations[0];
                const isActive = index === activeIndex;

                return (
                  <Link
                    key={artist.id}
                    href={`/crew/${artist.slug}`}
                    className="flex-shrink-0 group text-center transition-all duration-300"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    aria-label={t?.name ?? 'Artiste'}
                  >
                    <span
                      className={`
                        block font-display text-xs sm:text-sm uppercase tracking-wide leading-tight
                        transition-all duration-300 whitespace-nowrap
                        ${isActive
                          ? 'text-[var(--rbs-gold)] drop-shadow-[0_0_8px_var(--rbs-gold)]'
                          : 'text-outline text-white/25 group-hover:text-[var(--rbs-gold)] group-hover:drop-shadow-[0_0_6px_var(--rbs-gold)]'
                        }
                      `}
                    >
                      {t?.name ?? 'Sans nom'}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Bouton droit */}
            <button
              onClick={() => scrollNames('right')}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all duration-200"
              aria-label="Noms suivants"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Indicateur de page (dots) */}
          <div className="flex justify-center gap-1.5 mt-3">
            {Array.from({ length: Math.ceil(artists.length / NAMES_PER_VIEW) }).map(
              (_, i) => (
                <span
                  key={i}
                  className={`block w-1 h-1 rounded-full transition-all duration-300 ${
                    Math.floor(nameOffset / NAMES_PER_VIEW) === i
                      ? 'bg-[var(--rbs-gold)] w-3'
                      : 'bg-white/15'
                  }`}
                />
              ),
            )}
          </div>
        </div>
      </div>

      {/* ── COLONNE DROITE (60%) — Texte scrollable ── */}
      <div className="w-[60%] flex-shrink-0 overflow-y-auto px-10 sm:px-16 py-24 md:py-32 space-y-24 md:space-y-32">
        {/* NOTRE MISSION */}
        <section className="max-w-xl">
          <SectionHeader eyebrow="Engagement" title="Notre Mission" className="mb-8" />
          <p className="text-white/70 text-base md:text-lg leading-relaxed">
            Nous produisons des œuvres, des murs, des performances, des projets
            communautaires et des interventions urbaines engagées, mais notre mission
            va bien au-delà : former, transmettre, libérer.
          </p>
          <p className="text-white/70 text-base md:text-lg leading-relaxed mt-4">
            Chaque fresque, chaque atelier, chaque collaboration est une occasion de
            remettre la main à l&apos;œuvre, de réécrire l&apos;espace public, de
            reconnecter l&apos;art urbain à la souveraineté, à la jeunesse, à
            l&apos;Afrique qui crée.
          </p>
        </section>

        {/* NOS VALEURS */}
        <section className="max-w-xl">
          <SectionHeader eyebrow="Éthique" title="Nos Valeurs" className="mb-8" />
          <dl className="space-y-8">
            {VALUES_LIST.map(({ term, desc }) => (
              <div key={term} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="mt-1.5 w-2 h-2 flex-shrink-0 rounded-full bg-[var(--rbs-gold)]"
                />
                <div>
                  <dt className="font-display text-base md:text-lg uppercase text-white tracking-wide">
                    {term}
                  </dt>
                  <dd className="mt-1.5 text-white/60 text-sm md:text-base leading-relaxed">
                    {desc}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        {/* LE COLLECTIF */}
        <section className="max-w-xl">
          <SectionHeader eyebrow="Qui sommes-nous" title="Le Collectif" className="mb-8" />
          <p className="text-white/70 text-base md:text-lg leading-relaxed">
            Le RBS Crew rassemble aujourd&apos;hui plus de 30 artistes actifs, réunis
            par leur engagement, leur style, leur vision, leur constance et leur esprit
            communautaire.
          </p>
          <p className="text-white/70 text-base md:text-lg leading-relaxed mt-4">
            Créateurs polyvalents, ils évoluent dans une large diversité de pratiques :
            arts visuels, arts plastiques, graffiti et muralisme, illustration,
            photographie, vidéo, réalisation 3D, digital art, motion design, sérigraphie
            et autres formes contemporaines de création.
          </p>
          <p className="text-white/70 text-base md:text-lg leading-relaxed mt-4">
            Basés à Dakar, en Afrique de l&apos;Ouest, en Europe ou aux États-Unis,
            leurs parcours et leurs territoires multiples enrichissent la palette
            visuelle, humaine et symbolique du collectif, faisant du RBS Crew un
            mouvement profondément ancré et résolument ouvert sur le monde.
          </p>
        </section>

        {/* Notre portée */}
        <section className="max-w-xl">
          <SectionHeader eyebrow="Impact" title="Notre portée" className="mb-8" />
          <ul className="space-y-5">
            {REACH_LIST.map((text, i) => (
              <li key={i} className="flex gap-4">
                <span className="mt-1 font-mono text-xs text-[var(--rbs-gold)] tracking-widest flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-white/65 text-sm md:text-base leading-relaxed">
                  Depuis plus d&apos;une décennie, le RBS Crew {text}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
