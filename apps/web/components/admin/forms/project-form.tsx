'use client';

import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import type { Resolver, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useTransition } from 'react';
import { ArrowLeft, Globe, Save, CalendarDays, Briefcase, MapPin } from 'lucide-react';
import Link from 'next/link';

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { LocalizedFormTabs, LOCALES } from './localized-form-tabs';
import { LocaleTabPanel } from './locale-tab-panel';
import { MediaUpload } from './media-upload';
import { GalleryUpload } from './gallery-upload';

import { projectSchema, type ProjectFormValues } from '@/lib/admin/schemas';
import type { ActionResult } from '@/lib/admin/errors';
import type { AdminProject } from '@/types/admin';

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

export interface ProjectFormProps {
  mode: 'create' | 'edit';
  backHref: string;
  initialData?: AdminProject;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreate?: (data: any) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate?: (id: string, data: any) => Promise<unknown>;
}

export function ProjectForm({ mode, backHref, initialData, onCreate, onUpdate }: ProjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema) as Resolver<ProjectFormValues>,
    defaultValues: {
      featuredImageUrl: initialData?.featuredImageUrl ?? '',
      gallery: initialData?.gallery ?? [],
      completedAt: initialData?.completedAt ?? '',
      clientName: initialData?.clientName ?? '',
      country: initialData?.country ?? '',
      isPublished: initialData?.isPublished ?? false,
      translations: initialData?.translations?.length
        ? LOCALES.map(({ code }) => {
            const existing = initialData.translations.find((t) => t.locale === code);
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

  const onSubmit = (data: ProjectFormValues) => {
    const payload = {
      ...data,
      completedAt: data.completedAt || undefined,
      clientName: data.clientName || undefined,
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
          toast.success('Projet créé avec succès');
        } else {
          const result = await onUpdate?.(initialData!.id, payload);
          if (result && typeof result === 'object' && 'success' in result && !(result as ActionResult).success) {
            toast.error((result as { success: false; error: string }).error);
            return;
          }
          toast.success('Projet mis à jour');
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
              {mode === 'create' ? 'Nouveau projet' : 'Modifier le projet'}
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
                    showMeta={true}
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
            {/* Project info */}
            <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
              <p className="text-sm font-semibold text-white">Informations du projet</p>

              <FormField
                control={control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-white/60 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-[var(--rbs-red)]" />
                      Client / Commanditaire
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Nom du client"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="completedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-white/60 flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-[var(--rbs-red)]" />
                      Date de réalisation
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        type="date"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

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
                        value={field.value ?? ''}
                        placeholder="Sénégal"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Featured image */}
            <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-3">
              <p className="text-sm font-semibold text-white">Image vedette</p>
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
