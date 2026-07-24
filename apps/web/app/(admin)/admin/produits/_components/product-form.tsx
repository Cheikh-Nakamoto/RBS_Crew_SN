'use client';

import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
 
import type { Resolver, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useTransition } from 'react';
import { ArrowLeft, Save, Globe } from 'lucide-react';
import Link from 'next/link';

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import { LocalizedFormTabs, LOCALES } from '@/components/admin/forms/localized-form-tabs';
import { LocaleTabPanel } from '@/components/admin/forms/locale-tab-panel';
import { MediaUpload } from '@/components/admin/forms/media-upload';
import { GalleryUpload } from '@/components/admin/forms/gallery-upload';
import { VariantBuilder } from '@/components/admin/forms/variant-builder';
import { EntityCombobox } from '@/components/admin/forms/entity-combobox';

import { productSchema, type ProductFormValues } from '@/lib/admin/schemas';
import { createProduct, updateProduct } from '../actions';

import type { AdminProduct } from '@/types/admin';
import type { AdminOption } from '@/lib/admin/queries';

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

interface ProductFormProps {
  mode: 'create' | 'edit';
  initialData?: AdminProduct;
  /** Options `{id, name}` servies par `/admin/categories/options`. */
  categories: AdminOption[];
  /** Options `{id, name}` servies par `/admin/tags/options`. */
  tags: AdminOption[];
}

export function ProductForm({ mode, initialData, categories, tags }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
    defaultValues: {
      sku: initialData?.sku ?? '',
      price: initialData?.price ?? 0,
      compareAtPrice: initialData?.compareAtPrice ?? undefined,
      stock: initialData?.stock ?? 0,
      status: (initialData?.status as ProductFormValues['status']) ?? 'DRAFT',
      featuredImageUrl: initialData?.featuredImageUrl ?? '',
      gallery: initialData?.images?.map((i) => i.imageUrl) ?? [],
      categoryIds: initialData?.categories?.map((c: { id: string }) => c.id) ?? [],
      tagIds: initialData?.tags.map((t) => t.id) ?? [],
      translations: initialData?.translations.length
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
      variants: (initialData?.variants ?? []).map((v) => ({
        ...v,
        attributes: Object.entries(v.attributes ?? {}).map(([key, value]) => ({ key, value })),
      })),
    },
  });

  // useFieldArray for translations (keeps array stable)
  useFieldArray({ control: form.control, name: 'translations' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const control = form.control as unknown as Control<any>;

  const onSubmit = (data: ProductFormValues, publish = false) => {
    const filledTranslations = data.translations.filter(
      (t) => t.title.trim() !== '' && t.slug.trim() !== '',
    );
    const payload = publish
      ? { ...data, translations: filledTranslations, status: 'PUBLISHED' as const }
      : { ...data, translations: filledTranslations };
    startTransition(async () => {
      try {
        if (mode === 'create') {
          const result = await createProduct(payload);
          if (!result.success) { toast.error(result.error); return; }
          toast.success('Produit créé avec succès');
        } else {
          const result = await updateProduct(initialData!.id, payload);
          if (!result.success) { toast.error(result.error); return; }
          toast.success('Produit mis à jour');
        }
        router.push('/admin/produits');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Une erreur est survenue');
        console.error(err);
      }
    });
  };

  const categoryOptions = categories;
  const tagOptions = tags;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => onSubmit(d))} className="space-y-8 pb-16">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 sticky top-0 z-10 -mx-6 px-6 py-4 bg-[#080808]/90 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="text-white/60 hover:text-white">
              <Link href="/admin/produits"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-lg font-black text-white">
                {mode === 'create' ? 'Nouveau produit' : 'Modifier le produit'}
              </h1>
              <p className="text-xs text-white/40">
                {mode === 'create' ? 'Remplissez les informations ci-dessous' : `ID: ${initialData?.id}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => form.handleSubmit((d) => onSubmit(d, false))()}
              className="border-white/20 text-white/70 hover:bg-white/5 gap-2"
            >
              <Save className="h-4 w-4" />
              Brouillon
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => form.handleSubmit((d) => onSubmit(d, true))()}
              className="bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90 text-white gap-2"
            >
              {isPending ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              Publier
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: main content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Informations générales */}
            <FormSection title="Informations générales">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">SKU</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="SKU-001" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50 font-mono" />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Stock <span className="text-[var(--rbs-red)]">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={0} placeholder="0" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50" />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Prix (FCFA) <span className="text-[var(--rbs-red)]">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={0} placeholder="0" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50" />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="compareAtPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Prix barré</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} type="number" min={0} placeholder="—" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50" />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            {/* Traductions */}
            <FormSection title="Traductions" description="Contenu multilingue — remplissez au moins le français">
              <LocalizedFormTabs
                control={control}
                renderFields={(index, _locale) => (
                  <LocaleTabPanel
                    control={control}
                    index={index}
                    showContent={true}
                    showMeta={true}
                  />
                )}
              />
            </FormSection>

            {/* Variantes */}
            <Collapsible>
              <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
                <CollapsibleTrigger className="flex w-full items-center justify-between p-5 hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-white">Variantes</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      Tailles, couleurs, options...
                    </p>
                  </div>
                  <span className="text-xs text-white/30">
                    {form.watch('variants')?.length ?? 0} variante(s)
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-5 pb-5 border-t border-white/10 pt-4">
                    <VariantBuilder control={control} />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>

          {/* Right column: meta */}
          <div className="space-y-6">
            {/* Status */}
            <FormSection title="Statut">
              <FormField
                control={control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-[var(--rbs-red)]/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-black/90 backdrop-blur-xl text-white">
                          <SelectItem value="DRAFT" className="focus:bg-white/10 focus:text-white">Brouillon</SelectItem>
                          <SelectItem value="PUBLISHED" className="focus:bg-white/10 focus:text-white">Publié</SelectItem>
                          <SelectItem value="ARCHIVED" className="focus:bg-white/10 focus:text-white">Archivé</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </FormSection>

            {/* Image principale */}
            <FormSection title="Image principale">
              <FormField
                control={control}
                name="featuredImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <MediaUpload
                        value={field.value}
                        onChange={field.onChange}
                        label="featured"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </FormSection>

            {/* Galerie d'images */}
            <FormSection title="Galerie d'images">
              <FormField
                control={control}
                name="gallery"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <GalleryUpload
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </FormSection>

            {/* Catégories */}
            <FormSection title="Catégories">
              <FormField
                control={control}
                name="categoryIds"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <EntityCombobox
                        options={categoryOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Sélectionner des catégories"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </FormSection>

            {/* Tags */}
            <FormSection title="Tags">
              <FormField
                control={control}
                name="tagIds"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <EntityCombobox
                        options={tagOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Sélectionner des tags"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </FormSection>
          </div>
        </div>
      </form>
    </Form>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        {description && <p className="text-xs text-white/40 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}
