'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useTransition } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MediaUpload } from '@/components/admin/forms/media-upload';
import { pressMentionSchema, type PressMentionFormValues } from '@/lib/admin/schemas';
import { updatePresse } from '../../../presse/actions';
import type { AdminPressMention } from '@/types/admin';

export function PresseEditForm({ initialData }: { initialData: AdminPressMention }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<PressMentionFormValues>({
    resolver: zodResolver(pressMentionSchema),
    defaultValues: {
      source: initialData.source,
      title: initialData.title,
      url: initialData.url ?? '',
      publishedAt: initialData.publishedAt ?? '',
      imageUrl: initialData.imageUrl ?? '',
    },
  });

  const onSubmit = (data: PressMentionFormValues) => {
    startTransition(async () => {
      try {
        const result = await updatePresse(initialData.id, data);
        if (!result.success) { toast.error(result.error); return; }
        toast.success('Mention mise à jour');
        router.push('/admin/presse');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" asChild className="text-white/60 hover:text-white">
            <Link href="/admin/presse"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-xl font-black text-white">Modifier la mention presse</h1>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
          {[
            { name: 'source' as const, label: 'Source' },
            { name: 'title' as const, label: 'Titre' },
            { name: 'url' as const, label: 'URL' },
            { name: 'publishedAt' as const, label: 'Date de publication' },
          ].map(({ name, label }) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">{label}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} className="bg-white/5 border-white/10 text-white focus:border-[var(--rbs-red)]/50" />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />
          ))}

          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/70">Image</FormLabel>
                <FormControl>
                  <MediaUpload value={field.value ?? undefined} onChange={(url) => field.onChange(url ?? '')} />
                </FormControl>
                <FormMessage className="text-red-400 text-xs" />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending} className="bg-[var(--rbs-red)] hover:bg-[var(--rbs-red)]/90 text-white gap-2">
          {isPending ? <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </form>
    </Form>
  );
}
