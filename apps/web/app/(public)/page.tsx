import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MapPin, PlayCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { ApiResponse } from '@rbs/types';
import { formatXOF } from '@/lib/format';
import { HeroBackground } from '@/components/hero-background';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Fallback images ────────────────────────────────────────────────────────────

const FALLBACK_IMAGES: string[] = [
  'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=1200&q=80',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
  'https://images.unsplash.com/photo-1519638399535-1b036603ac77?w=1200&q=80',
  'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1200&q=80',
  'https://images.unsplash.com/photo-1481487196290-c152efe083f5?w=1200&q=80',
];

const FALLBACK_THUMB: { title: string; image: string; tag: string }[] = [
  { title: 'Murales Dakar',      image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&q=80', tag: 'Graffiti' },
  { title: 'Sérigraphie RBS',    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', tag: 'Sérigraphie' },
  { title: 'Festival Last Wall', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80', tag: 'Festival' },
];

export default async function HomePage() {
  const [projectsData, productsData, artistsData] = await Promise.allSettled([
    api.get('projects?limit=10', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 3600 } }).json<ApiResponse<ProjectItem[]>>(),
    api.get('products?limit=4&status=PUBLISHED', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 1800 } }).json<ApiResponse<ProductItem[]>>(),
    api.get('artists?limit=10', { headers: { 'Accept-Language': 'fr' }, next: { revalidate: 3600 } }).json<ApiResponse<ArtistItem[]>>(),
  ]);

  const projects = projectsData.status === 'fulfilled' ? projectsData.value.data : [];
  const products = productsData.status === 'fulfilled' ? productsData.value.data : [];
  const artists = artistsData.status === 'fulfilled' ? artistsData.value.data : [];

  const heroImages = (() => {
    const imgs: string[] = [];
    const pImgs = projects.map(p => p.featuredImageUrl).filter(Boolean) as string[];
    const aImgs = artists.map(a => a.featuredImageUrl).filter(Boolean) as string[];
    const max = Math.max(pImgs.length, aImgs.length);
    for (let i = 0; i < max; i++) {
      if (pImgs[i]) imgs.push(pImgs[i]);
      if (aImgs[i]) imgs.push(aImgs[i]);
    }
    return imgs.length >= 2 ? imgs : FALLBACK_IMAGES;
  })();

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

  const collectionItems = (() => {
    const out: { title: string; image: string; tag: string; href: string; wide?: boolean }[] = [];
    const pList = projects.slice(0, 6);
    const aList = artists.slice(0, 6);
    const max = Math.max(pList.length, aList.length);
    for (let i = 0; i < max; i++) {
      if (pList[i]) {
        const t = pList[i].translations.find(x => x.locale === 'fr') ?? pList[i].translations[0];
        out.push({ title: t?.title ?? 'Projet', image: pList[i].featuredImageUrl ?? FALLBACK_IMAGES[i % FALLBACK_IMAGES.length], tag: 'Projet', href: '/projects', wide: i === 0 });
      }
      if (aList[i]) {
        const t = aList[i].translations.find(x => x.locale === 'fr') ?? aList[i].translations[0];
        out.push({ title: t?.name ?? 'Artiste', image: aList[i].featuredImageUrl ?? FALLBACK_IMAGES[(i + 3) % FALLBACK_IMAGES.length], tag: aList[i].city ?? 'Crew', href: `/crew/${aList[i].slug}` });
      }
    }
    return out.slice(0, 8);
  })();

  return (
    <div className="overflow-hidden bg-[#111111]">

      {/* ── Hero — images dynamiques plein écran + style maquette_hero ── */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20">
        <HeroBackground images={heroImages} interval={5000} />
        {/* Assombrissement plus léger pour ce style épuré */}
        <div className="absolute inset-0 bg-black/40 z-[2]" />

        <div className="relative z-[10] w-full max-w-[90rem] mx-auto px-6 grid grid-cols-12 gap-6 items-center">
          {/* Ligne verticale + 03 à gauche */}
          <div className="col-span-2 hidden md:flex flex-col items-start gap-4">
            <span className="font-display text-4xl font-bold text-white tracking-wider">03</span>
            <div className="w-[2px] h-32 bg-white/40 ml-4"></div>
          </div>

          <div className="col-span-12 md:col-span-9 flex flex-col gap-4">
             <div className="flex flex-col gap-1 text-white/70 text-xs font-semibold tracking-widest uppercase mb-4">
               <span>#rbscrew #graffitiafrica #dakar</span>
               <span>@rbscrewsn @dakar @lastwall</span>
             </div>
             
             <p className="text-white/60 text-xs font-semibold uppercase tracking-[0.4em] mb-2">
               E V E N T   A R C H I V E
             </p>

             <h1 className="font-display text-7xl md:text-8xl lg:text-[7rem] leading-[0.9] tracking-tight text-white mb-6 uppercase">
               Graffiti <br/>
               <span className="text-white">From Dakar</span>
             </h1>

             <p className="text-white/80 max-w-md text-sm leading-relaxed mb-8 mix-blend-screen bg-black/20 p-4 rounded backdrop-blur-sm md:bg-transparent md:p-0 md:backdrop-blur-none">
               Fondé en 2012, ce crew rassemble plus de 30 artistes. Entre fresques murales, sérigraphie et la 1ère école de graffiti d'Afrique, le RBS Crew redessine l'espace urbain.
             </p>
          </div>
          
          <div className="col-span-1 hidden md:flex flex-col items-end">
             {/* Small visual arrow/chevron */}
             <div className="w-6 h-6 border-b border-r border-white/50 rotate-45 mt-10"></div>
          </div>
        </div>

        {/* Bottom bar in hero */}
        <div className="absolute bottom-10 inset-x-0 z-[10]">
          <div className="max-w-[90rem] mx-auto px-6 flex flex-col gap-4">
             <div className="w-full h-px bg-white/20 mb-4 hidden md:block"></div>
             <div className="grid grid-cols-12 gap-6 items-end">
                <div className="col-span-12 md:col-span-4 hidden md:block">
                   <h3 className="text-white text-xs font-bold uppercase mb-2">Graffiti Challenge</h3>
                   <p className="text-white/50 text-xs leading-relaxed max-w-xs">Le Last Wall Tour est un festival international réunissant des créateurs talentueux pour transformer l'espace public.</p>
                </div>
                <div className="col-span-12 md:col-span-5 hidden md:block">
                   <h3 className="text-white text-xs font-bold uppercase mb-2">About Our Art</h3>
                   <p className="text-white/50 text-xs leading-relaxed max-w-xs">Une approche unique mêlant identité africaine et codes du graffiti contemporain dans chaque fresque et sérigraphie.</p>
                </div>
                <div className="col-span-12 md:col-span-3 flex items-center justify-start md:justify-end gap-4">
                   <span className="text-white font-bold text-xl">27</span>
                   <div className="flex-1 md:max-w-[100px] h-[2px] bg-white relative">
                      <div className="absolute inset-y-0 right-0 w-1/2 bg-white/30"></div>
                   </div>
                   <span className="text-white/60 font-bold text-xl">06</span>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* ── Potret Moments (Maquette) / L'Art & la Rue ────────────────────── */}
      <section className="bg-[#111111] py-24 px-6 relative border-t border-white/10">
        <div className="max-w-[90rem] mx-auto grid grid-cols-12 gap-6 relative">
          
          <div className="col-span-12 md:col-span-7 flex flex-col justify-start">
            <h2 className="font-display text-5xl sm:text-7xl md:text-[6rem] uppercase text-white font-black leading-[0.9] tracking-tight mb-8">
               L'ART <br/> & LA RUE
            </h2>
            <p className="text-white/60 text-sm max-w-xs leading-relaxed mb-12">
               L'art urbain n'est pas toujours parfait. Comme la rue, il a ses aspérités, ses hauts et ses bas, mais c'est bien là que réside sa véritable beauté.
            </p>
          </div>
          
          {/* Vertical numbers */}
          <div className="col-span-12 md:col-span-5 hidden md:flex flex-col items-end relative">
             <div className="flex flex-col items-end justify-between font-display text-white/40 text-xl font-bold pr-10 border-r border-white/10 h-64 relative">
                <span>05</span>
                <span>06</span>
                <span className="text-white relative">
                   07
                   {/* horizontal line across like in maquette */}
                   <span className="absolute left-full top-1/2 w-48 h-px bg-white/30 ml-4 hidden lg:block"></span>
                </span>
                <span>08</span>
                <span>09</span>
             </div>
          </div>

          {/* Map pins - locations based on projects / artists */}
          <div className="col-span-12 mt-12 md:mt-24">
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 border-b border-white/20 pb-8 relative">
               {/* Underline progress for the first one */}
               <div className="absolute bottom-0 left-0 w-1/3 h-[2px] bg-red-600"></div>

               {(thematicCols || []).map((col, idx) => (
                 <div key={idx} className="flex gap-4 items-center md:items-start group cursor-pointer">
                    <MapPin className="text-red-600 w-8 h-8 group-hover:-translate-y-1 transition-transform" />
                    <div className="flex flex-col">
                       <span className="text-white font-bold text-lg mb-1">{col.tag}</span>
                       <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">{col.title}</span>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </section>

      {/* ── Collection Grid (Relaxing Place style) ─────────────── */}
      <section className="bg-[#111111] py-20 px-6">
        <div className="max-w-[90rem] mx-auto flex flex-col items-center">
            <h3 className="font-display text-white text-2xl font-bold uppercase tracking-widest mb-3">Moments Créatifs</h3>
            <p className="text-white/60 mb-20 text-sm font-medium tracking-wide">Découvrez nos espaces de sérigraphie et d'expression</p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-6xl">
              {/* 3 staggered images */}
              <div className="w-full md:w-1/3 flex flex-col gap-4 md:mt-16 group">
                 <div className="relative aspect-[3/4] w-full overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors">
                    <Image src={collectionItems[0]?.image || FALLBACK_IMAGES[0]} alt={collectionItems[0]?.title} fill className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                 </div>
                 <span className="text-white/70 text-sm font-semibold text-center uppercase tracking-widest group-hover:text-white transition-colors">{collectionItems[0]?.title}</span>
              </div>
              
              <div className="w-full md:w-1/3 flex flex-col gap-4 group">
                 <div className="relative aspect-[3/4] w-full overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors">
                    <Image src={collectionItems[1]?.image || FALLBACK_IMAGES[1]} alt={collectionItems[1]?.title} fill className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                 </div>
                 <span className="text-white/70 text-sm font-semibold text-center uppercase tracking-widest group-hover:text-white transition-colors">{collectionItems[1]?.title}</span>
              </div>
              
              <div className="w-full md:w-1/3 flex flex-col gap-4 md:mt-32 group">
                 <div className="relative aspect-[3/4] w-full overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors">
                    <Image src={collectionItems[2]?.image || FALLBACK_IMAGES[2]} alt={collectionItems[2]?.title} fill className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                 </div>
                 <span className="text-white/70 text-sm font-semibold text-center uppercase tracking-widest group-hover:text-white transition-colors">{collectionItems[2]?.title}</span>
              </div>
            </div>
        </div>
      </section>

      {/* ── Last Wall Tour Festival CTA ───────────────────────────────────────────── */}
      <section className="relative h-[80vh] min-h-[600px] flex flex-col justify-end overflow-hidden border-t border-white/10">
        <Image src={FALLBACK_IMAGES[3]} fill className="object-cover opacity-50 brightness-50" alt="Last Wall Tour Background" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#111111]/90 via-[#111111]/40 to-transparent z-[2]" />
        
        <div className="relative z-[10] w-full max-w-[90rem] mx-auto px-6 grid grid-cols-12 gap-6 pb-20 items-end">
          {/* left bottom small thumbnail for Festival */}
          <div className="col-span-12 md:col-span-4 hidden md:flex items-end mb-6">
             <Link href="/festival" className="relative w-64 aspect-[4/3] border border-white/20 p-2 bg-[#111]/40 backdrop-blur-sm group cursor-pointer block">
                <div className="relative w-full h-full overflow-hidden">
                    <Image src={FALLBACK_IMAGES[4]} fill className="object-cover group-hover:scale-110 transition-transform duration-700 grayscale group-hover:grayscale-0" alt="Festival Edition Thumbnail" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-transparent transition-colors">
                  <ArrowRight className="text-white w-10 h-10 -rotate-45 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
             </Link>
          </div>
          
          <div className="col-span-12 md:col-span-8 flex flex-col items-center md:items-end text-center md:text-right">
            <h2 className="font-display text-5xl sm:text-7xl md:text-[6.5rem] text-white font-black uppercase tracking-tight leading-[0.9] mb-8">
              LAST WALL <br/> TOUR
            </h2>
            <Link href="/festival" className="flex items-center gap-3 mb-8 cursor-pointer group">
               <span className="w-10 h-10 flex items-center justify-center border border-white/30 rounded-full group-hover:bg-white transition-colors duration-300">
                  <ArrowRight className="w-5 h-5 text-white group-hover:text-black transition-colors" />
               </span>
               <span className="text-white/80 text-sm uppercase tracking-[0.2em] font-semibold group-hover:text-white transition-colors">Découvrir le Festival</span>
            </Link>
            <p className="text-white/60 text-sm max-w-lg leading-relaxed mb-6">
              "Le Last Wall Tour est un festival international réunissant des créateurs de classe mondiale pour transformer l'espace public au Sénégal. Une odyssée de couleurs, de respect et de transmission."
            </p>
            <p className="text-white/30 text-xs font-bold uppercase tracking-widest">
              Initiative RBS Akademya
            </p>
          </div>
        </div>
      </section>

      {/* Shop CTA (just list top products flatly at bottom) */}
      {products.length > 0 && (
        <section className="bg-black py-12 px-6">
          <div className="max-w-[90rem] mx-auto flex flex-col md:flex-row items-center justify-between gap-8 pt-8">
            <h3 className="text-white/40 text-xs uppercase tracking-[0.3em] font-bold flex-shrink-0">
               // Merch & Shop
            </h3>
            <div className="flex flex-wrap gap-8 justify-end items-center">
               {products.map(p => {
                 const t = p.translations.find((x) => x.locale === 'fr') ?? p.translations[0];
                 return (
                   <Link key={p.id} href={`/shop/${t?.slug || p.slug}`} className="group flex items-center gap-3">
                     <span className="text-white/80 group-hover:text-red-500 font-semibold uppercase tracking-wider text-xs transition-colors">
                       {t?.name}
                     </span>
                     <span className="text-white/30 text-xs">[{formatXOF(p.price)}]</span>
                   </Link>
                 )
               })}
               <Link href="/shop" className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase tracking-wider hover:text-white transition-colors ml-4">
                 Voir tout <ArrowRight className="w-3 h-3" />
               </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
