import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ExternalLink, Zap, Globe, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import type { ApiResponse } from '@rbs/types';
import { formatXOF } from '@/lib/format';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectItem {
  id: string;
  slug: string;
  clientName?: string;
  featuredImage?: { url: string; altText?: string };
  translations: Array<{ locale: string; title: string; summary?: string }>;
}

interface ProductItem {
  id: string;
  slug: string;
  price: number;
  featuredImage?: { url: string; altText?: string };
  translations: Array<{ locale: string; name: string; slug: string }>;
}

interface ArtistItem {
  id: string;
  slug: string;
  city?: string;
  country?: string;
  featuredImage?: { url: string; altText?: string };
  translations: Array<{ locale: string; name: string }>;
}

// ── Stat Item ──────────────────────────────────────────────────────────────────

function StatCard({ value, label, icon: Icon }: { value: string; label: string; icon: typeof Zap }) {
  return (
    <div className="glass rounded-2xl p-6 flex flex-col items-center text-center card-hover border border-white/8">
      <div className="w-10 h-10 rounded-xl bg-[oklch(0.72_0.19_48/15%)] border border-[oklch(0.72_0.19_48/30%)] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-[oklch(0.72_0.19_48)]" />
      </div>
      <span className="font-display text-4xl text-white mb-1">{value}</span>
      <span className="text-sm text-white/45">{label}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default async function HomePage() {
  // Fetch data from NestJS API (server-side)
  const [projectsData, productsData, artistsData] = await Promise.allSettled([
    api
      .get('projects?limit=3', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 3600 } })
      .json<ApiResponse<ProjectItem[]>>(),
    api
      .get('products?limit=4&status=PUBLISHED', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 1800 } })
      .json<ApiResponse<ProductItem[]>>(),
    api
      .get('artists?limit=6', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 3600 } })
      .json<ApiResponse<ArtistItem[]>>(),
  ]);

  const projects =
    projectsData.status === 'fulfilled' ? projectsData.value.data : [];
  const products =
    productsData.status === 'fulfilled' ? productsData.value.data : [];
  const artists =
    artistsData.status === 'fulfilled' ? artistsData.value.data : [];

  return (
    <div className="overflow-hidden">
      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 py-24 overflow-hidden">
        {/* Background gradient blobs */}
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-20"
          style={{
            background:
              'radial-gradient(ellipse at center, oklch(0.72 0.19 48 / 40%) 0%, transparent 70%)',
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-10"
          style={{
            background:
              'radial-gradient(ellipse at center, oklch(0.60 0.25 345 / 60%) 0%, transparent 70%)',
          }}
        />
        <div
          className="pointer-events-none absolute top-1/3 left-0 w-[300px] h-[300px] rounded-full opacity-10"
          style={{
            background:
              'radial-gradient(ellipse at center, oklch(0.72 0.15 200 / 60%) 0%, transparent 70%)',
          }}
        />

        {/* Decorative corner elements */}
        <div className="absolute top-10 left-6 md:left-12 opacity-30 font-display text-xs tracking-widest text-white/40 uppercase rotate-90 origin-left">
          Since 2012
        </div>
        <div className="absolute top-10 right-6 md:right-12 opacity-30 font-display text-xs tracking-widest text-white/40 uppercase -rotate-90 origin-right">
          Dakar · SN
        </div>

        {/* Main content */}
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 mb-2">
            <span className="w-2 h-2 rounded-full bg-[oklch(0.65_0.20_140)] animate-pulse" />
            <span className="text-xs font-medium text-white/60 uppercase tracking-widest">
              Graffiti · Art Urbain · Sérigraphie
            </span>
          </div>

          <h1 className="font-display text-7xl sm:text-8xl md:text-[9rem] lg:text-[11rem] leading-none tracking-tight">
            <span className="block text-white">RBS</span>
            <span
              className="block text-shimmer"
              style={{
                background:
                  'linear-gradient(90deg, #fff 0%, oklch(0.72 0.19 48) 25%, #fff 50%, oklch(0.60 0.25 345) 75%, #fff 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 4s linear infinite',
              }}
            >
              CREW
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
            Collectif fondé en{' '}
            <span className="text-white/80 font-medium">2012 à Dakar</span>. Plus de{' '}
            <span className="text-white/80 font-medium">30 artistes</span> à travers le monde.
            Graffiti, fresques murales, sérigraphie et la 1ère école de graffiti d&apos;Afrique.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/crew"
              className="group flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[oklch(0.72_0.19_48)] text-black font-semibold text-sm hover:bg-[oklch(0.80_0.19_48)] transition-all duration-200 shadow-lg shadow-[oklch(0.72_0.19_48/30%)] hover:shadow-[oklch(0.72_0.19_48/50%)] hover:scale-[1.02]"
            >
              Découvrir le Crew
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/shop"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/15 text-white/80 font-semibold text-sm hover:border-white/30 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              Voir le Shop
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="text-xs text-white/50 uppercase tracking-widest">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* ── Stats Section ──────────────────────────────────────────────── */}
      <section className="section-padding px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard value="12+" label="Années d'existence" icon={Trophy} />
            <StatCard value="30+" label="Membres du crew" icon={Globe} />
            <StatCard value="5"   label="Éditions du festival" icon={Zap} />
          </div>
        </div>
      </section>

      {/* ── À Propos Section ───────────────────────────────────────────── */}
      <section className="section-padding px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 display-number select-none pointer-events-none">
          RBS
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="accent-line">
                <span className="text-xs font-semibold uppercase tracking-widest text-[oklch(0.72_0.19_48)]">
                  Qui sommes-nous
                </span>
              </div>
              <h2 className="font-display text-4xl sm:text-5xl text-white leading-tight">
                RBS CREW — <br />
                <span className="text-gradient">Art & Culture</span>
              </h2>
              <p className="text-white/50 leading-relaxed">
                Le RBS Crew est un collectif fondé en{' '}
                <strong className="text-white/80">2012 à Dakar, Sénégal</strong>. Durant plus d&apos;une
                décennie, ce collectif n&apos;a cessé de croître, comptant aujourd&apos;hui plus de 30 membres à
                travers le monde.
              </p>
              <p className="text-white/50 leading-relaxed">
                Grâce à ses diverses initiatives, événements et collaborations, le RBS Crew est
                désormais une figure marquante du{' '}
                <span className="text-white/80">graffiti et des arts urbains</span>. En 2021, le
                collectif a fondé la{' '}
                <span className="text-white/80">première école de graffiti d&apos;Afrique</span>.
              </p>
              <Link
                href="/crew"
                className="inline-flex items-center gap-2 text-sm font-medium text-[oklch(0.72_0.19_48)] hover:text-[oklch(0.88_0.18_90)] transition-colors duration-200 group"
              >
                Voir les membres du crew
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Artists preview grid */}
            {artists.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {artists.slice(0, 6).map((artist, i) => {
                  const t = artist.translations.find((x) => x.locale === 'fr') ?? artist.translations[0];
                  return (
                    <Link
                      key={artist.id}
                      href={`/crew/${artist.slug}`}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/8 hover:border-[oklch(0.72_0.19_48/40%)] transition-all duration-300"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      {artist.featuredImage ? (
                        <Image
                          src={artist.featuredImage.url}
                          alt={t?.name ?? ''}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 20vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-display text-2xl text-white/20">
                          {t?.name?.[0] ?? '?'}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                        <span className="text-xs font-medium text-white truncate">{t?.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Derniers Projets ───────────────────────────────────────────── */}
      {projects.length > 0 && (
        <section className="section-padding px-4 sm:px-6">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <div className="accent-line mb-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[oklch(0.72_0.19_48)]">
                    Portfolio
                  </span>
                </div>
                <h2 className="font-display text-4xl sm:text-5xl text-white">Derniers Projets</h2>
              </div>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 text-sm font-medium text-white/50 hover:text-white transition-colors duration-200 group"
              >
                Voir tous les projets
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {projects.map((project, i) => {
                const t =
                  project.translations.find((x) => x.locale === 'fr') ?? project.translations[0];
                return (
                  <div
                    key={project.id}
                    className="group bg-white/4 rounded-2xl overflow-hidden border border-white/8 hover:border-[oklch(0.72_0.19_48/35%)] transition-all duration-300 card-hover"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    {project.featuredImage ? (
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={project.featuredImage.url}
                          alt={project.featuredImage.altText ?? t?.title ?? ''}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      </div>
                    ) : (
                      <div className="aspect-video bg-white/4 flex items-center justify-center">
                        <span className="font-display text-6xl text-white/10">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                    )}
                    <div className="p-5 space-y-2">
                      <h3 className="font-semibold text-white line-clamp-2 group-hover:text-[oklch(0.72_0.19_48)] transition-colors duration-200">
                        {t?.title}
                      </h3>
                      {project.clientName && (
                        <p className="text-xs text-white/40 uppercase tracking-wider">
                          Client : {project.clientName}
                        </p>
                      )}
                      {t?.summary && (
                        <p className="text-sm text-white/45 line-clamp-2 leading-relaxed">{t.summary}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Shop CTA Section ───────────────────────────────────────────── */}
      {products.length > 0 && (
        <section className="section-padding px-4 sm:px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[oklch(0.72_0.19_48/5%)] to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto relative z-10 space-y-12">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <div className="accent-line mb-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[oklch(0.72_0.19_48)]">
                    Merch & Produits
                  </span>
                </div>
                <h2 className="font-display text-4xl sm:text-5xl text-white">Le Shop</h2>
              </div>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 text-sm font-medium text-white/50 hover:text-white transition-colors duration-200 group"
              >
                Voir tout le shop
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.map((product, i) => {
                const t = product.translations.find((x) => x.locale === 'fr') ?? product.translations[0];
                return (
                  <Link
                    key={product.id}
                    href={`/shop/${t?.slug ?? product.slug}`}
                    className="group bg-white/4 rounded-2xl overflow-hidden border border-white/8 hover:border-[oklch(0.72_0.19_48/40%)] transition-all duration-300 card-hover"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    {product.featuredImage ? (
                      <div className="relative aspect-square overflow-hidden">
                        <Image
                          src={product.featuredImage.url}
                          alt={product.featuredImage.altText ?? t?.name ?? ''}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-white/4 flex items-center justify-center">
                        <span className="font-display text-4xl text-white/10">RBS</span>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-sm font-medium text-white line-clamp-1 mb-1">{t?.name}</p>
                      <p className="text-sm font-bold text-[oklch(0.72_0.19_48)]">
                        {formatXOF(product.price)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Festival CTA ───────────────────────────────────────────────── */}
      <section className="section-padding px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden glass border border-white/10 p-10 md:p-16 text-center">
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at 30% 50%, oklch(0.72 0.19 48 / 60%) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, oklch(0.60 0.25 345 / 40%) 0%, transparent 60%)',
              }}
            />
            <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
              <div className="tag-graffiti mx-auto w-fit">Last Wall Tour</div>
              <h2 className="font-display text-5xl sm:text-6xl text-white leading-tight">
                Festival de Graffiti
              </h2>
              <p className="text-white/50 text-lg leading-relaxed">
                Découvrez les éditions du festival international de graffiti organisé par le RBS Crew,
                réunissant des artistes de toute l&apos;Afrique et du monde.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Link
                  href="/festival"
                  className="group flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[oklch(0.72_0.19_48)] text-black font-semibold text-sm hover:bg-[oklch(0.80_0.19_48)] transition-all duration-200 shadow-lg shadow-[oklch(0.72_0.19_48/25%)]"
                >
                  Voir les éditions
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="https://rbsakademya.com/last-wall/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/15 text-white/70 font-semibold text-sm hover:border-white/30 hover:text-white transition-all duration-200"
                >
                  Site officiel
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Labz CTA ───────────────────────────────────────────────────── */}
      <section className="section-padding px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-5">
              <div className="accent-line">
                <span className="text-xs font-semibold uppercase tracking-widest text-[oklch(0.72_0.19_48)]">
                  Collaboration B2B
                </span>
              </div>
              <h2 className="font-display text-4xl sm:text-5xl text-white leading-tight">
                RBS <span className="text-gradient">Labz</span>
              </h2>
              <p className="text-white/50 leading-relaxed">
                Sérigraphie, fresques murales, graffiti live, formation artistique — faites appel au
                savoir-faire du RBS Crew pour vos projets professionnels.
              </p>
              <Link
                href="/labz"
                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[oklch(0.72_0.19_48)] text-black font-semibold text-sm hover:bg-[oklch(0.80_0.19_48)] transition-all duration-200 shadow-lg shadow-[oklch(0.72_0.19_48/25%)]"
              >
                Demander un devis
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['Sérigraphie', 'Fresque murale', 'Graffiti live', 'Formation'].map((service, i) => (
                <div
                  key={service}
                  className="glass rounded-xl p-4 border border-white/8 text-sm font-medium text-white/60"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span className="block text-[oklch(0.72_0.19_48)] font-display text-xs uppercase tracking-wider mb-2">
                    0{i + 1}
                  </span>
                  {service}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
