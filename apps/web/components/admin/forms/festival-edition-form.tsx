'use client';

import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
 
import type { Resolver, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useTransition } from 'react';
import { ArrowLeft, Globe, Save, CalendarDays, MapPin, Hash, Image as ImageIcon, Ticket, Video, Building2 } from 'lucide-react';
import Link from 'next/link';

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { LocalizedFormTabs, LOCALES } from './localized-form-tabs';
import { LocaleTabPanel } from './locale-tab-panel';
import { MediaUpload } from './media-upload';
import { GalleryUpload } from './gallery-upload';

import { festivalEditionSchema, type FestivalEditionFormValues } from '@/lib/admin/schemas';
import type { ActionResult } from '@/lib/admin/errors';

const DEFAULT_TRANSLATIONS = LOCALES.map(({ code }) => ({
  locale: code,
  title: '',
  slug: '',
  description: '',
  shortDescription: '',
  content: '',
  metaTitle: '',
  metaDescription: '',
}));

export interface FestivalEditionFormProps {
  mode: 'create' | 'edit';
  backHref: string;
  initialData?: {
    id?: string;
    editionNumber?: number;
    year?: number;
    city?: string;
    country?: string;
    featuredImageUrl?: string;
    heroImage?: string;
    gallery?: string[];
    isPublished?: boolean;
    translations?: Array<{
      locale: string;
      title: string;
      slug: string;
      description?: string;
      shortDescription?: string;
      content?: string;
      metaTitle?: string;
      metaDescription?: string;
    }>;
    [key: string]: unknown;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreate?: (data: any) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate?: (id: string, data: any) => Promise<unknown>;
}

export function FestivalEditionForm({
  mode,
  backHref,
  initialData,
  onCreate,
  onUpdate,
}: FestivalEditionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FestivalEditionFormValues>({
    resolver: zodResolver(festivalEditionSchema) as Resolver<FestivalEditionFormValues>,
    defaultValues: {
      editionNumber: initialData?.editionNumber ?? 1,
      year: initialData?.year ?? new Date().getFullYear(),
      city: initialData?.city ?? '',
      country: initialData?.country ?? 'SN',
      featuredImageUrl: initialData?.featuredImageUrl ?? '',
      heroImage: initialData?.heroImage ?? '',
      gallery: initialData?.gallery ?? [],
      isPublished: initialData?.isPublished ?? false,
      startDate: (initialData as Record<string, unknown>)?.startDate as string ?? '',
      endDate: (initialData as Record<string, unknown>)?.endDate as string ?? '',
      venue: (initialData as Record<string, unknown>)?.venue as string ?? '',
      venueAddress: (initialData as Record<string, unknown>)?.venueAddress as string ?? '',
      ticketUrl: (initialData as Record<string, unknown>)?.ticketUrl as string ?? '',
      videoUrl: (initialData as Record<string, unknown>)?.videoUrl as string ?? '',
      translations: initialData?.translations?.length
        ? LOCALES.map(({ code }) => {
            const existing = initialData.translations!.find((t) => t.locale === code);
            return {
              locale: code,
              title: existing?.title ?? '',
              slug: existing?.slug ?? '',
              description: existing?.description ?? '',
              shortDescription: existing?.shortDescription ?? '',
              content: existing?.content ?? '',
              metaTitle: existing?.metaTitle ?? '',
              metaDescription: existing?.metaDescription ?? '',
            };
          })
        : DEFAULT_TRANSLATIONS,
    },
  });

  useFieldArray({ control: form.control, name: 'translations' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const control = form.control as unknown as Control<any>;

  const onSubmit = (data: FestivalEditionFormValues) => {
    const payload = {
      ...data,
      translations: data.translations.filter(
        (t) => t.title.trim() !== '' && t.slug.trim() !== '',
      ),
    };
    startTransition(async () => {
      try {
        if (mode === 'create') {
          const result = await onCreate?.(payload);
          if (result && typeof result === 'object' && 'success' in result && !(result as ActionResult).success) {
            toast.error((result as { success: false; error: string }).error);
            return;
          }
          toast.success('Édition créée avec succès');
        } else {
          const result = await onUpdate?.(initialData!.id as string, payload);
          if (result && typeof result === 'object' && 'success' in result && !(result as ActionResult).success) {
            toast.error((result as { success: false; error: string }).error);
            return;
          }
          toast.success('Édition mise à jour');
        }
        router.push(backHref);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-12">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 sticky top-0 z-10 -mx-6 px-6 py-4 bg-[#080808]/90 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="text-white/60 hover:text-white">
              <Link href={backHref}><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <h1 className="text-lg font-black text-white">
              {mode === 'create' ? 'Nouvelle édition du festival' : 'Modifier l\'édition'}
            </h1>
          </div>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90 text-white gap-2"
          >
            {isPending
              ? <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              : <Save className="h-4 w-4" />
            }
            Enregistrer
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Translations */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[var(--rbs-red)]" />
                <p className="text-sm font-semibold text-white">Traductions</p>
              </div>
              <LocalizedFormTabs
                control={control}
                renderFields={(index) => (
                  <LocaleTabPanel
                    control={control}
                    index={index}
                    showContent={true}
                    showMeta={false}
                  />
                )}
              />
            </div>

            {/* Gallery */}
            <div className="mt-6 rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
              <p className="text-sm font-semibold text-white">Galerie d&apos;images</p>
              <FormField
                control={control}
                name="gallery"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <GalleryUpload value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Edition info */}
            <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
              <p className="text-sm font-semibold text-white">Informations de l&apos;édition</p>

              {/* Edition number */}
              <FormField
                control={control}
                name="editionNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-white/60 flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5 text-[var(--rbs-red)]" />
                      Numéro d&apos;édition <span className="text-[var(--rbs-red)]">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min={1}
                        placeholder="8"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              {/* Year */}
              <FormField
                control={control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-white/60 flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-[var(--rbs-red)]" />
                      Année <span className="text-[var(--rbs-red)]">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min={2000}
                        max={2100}
                        placeholder="2025"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              {/* City */}
              <FormField
                control={control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-white/60 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[var(--rbs-red)]" />
                      Ville
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Dakar"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              {/* Country */}
              <FormField
                control={control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-white/60 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[var(--rbs-red)]" />
                      Pays
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? 'SN'}
                        placeholder="SN"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Section Dates */}
            <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[var(--rbs-red)]" />
                Dates du festival
              </p>
              <FormField
                control={control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-white/60">Date de début</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        value={field.value ?? ''}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-white/60">Date de fin</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        value={field.value ?? ''}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Section Lieu */}
            <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[var(--rbs-red)]" />
                Lieu
              </p>
              <FormField
                control={control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-white/60">Nom du lieu</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Galerie Nationale, Terrou-Bi..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="venueAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-white/60 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      Adresse
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Dakar, Sénégal"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Section Liens */}
            <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <Ticket className="h-4 w-4 text-[var(--rbs-red)]" />
                Liens
              </p>
              <FormField
                control={control}
                name="ticketUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-white/60 flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5" />
                      Billetterie
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="https://..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-white/60 flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5" />
                      Vidéo (YouTube / Vimeo)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="https://youtube.com/..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Hero image */}
            <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-3">
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[var(--rbs-red)]" />
                Image hero (principale)
              </p>
              <FormField
                control={control}
                name="heroImage"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <MediaUpload value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <p className="text-xs text-white/30">Ou entrez une URL :</p>
              <FormField
                control={control}
                name="heroImage"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="https://..."
                        className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Featured image (fallback) */}
            <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-3">
              <p className="text-sm font-semibold text-white">Image vedette (fallback)</p>
              <FormField
                control={control}
                name="featuredImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <MediaUpload value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <p className="text-xs text-white/30">Ou entrez une URL :</p>
              <FormField
                control={control}
                name="featuredImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="https://..."
                        className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Publish toggle */}
            <div className="rounded-xl border border-white/10 bg-white/3 p-5">
              <FormField
                control={control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <FormLabel className="text-sm font-semibold text-white cursor-pointer">
                          Publier
                        </FormLabel>
                        <p className="text-xs text-white/40 mt-0.5">
                          {field.value ? 'Visible sur le site' : 'Brouillon — non visible'}
                        </p>
                      </div>
                      <FormControl>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!!field.value}
                          onClick={() => field.onChange(!field.value)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${
                            field.value ? 'bg-[var(--rbs-red)]' : 'bg-white/20'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                              field.value ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
