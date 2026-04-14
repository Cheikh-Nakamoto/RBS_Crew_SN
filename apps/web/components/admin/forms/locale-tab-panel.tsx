'use client';

import type { Control } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from './rich-text-editor';

interface LocaleTabPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  index: number;
  showContent?: boolean;
  showMeta?: boolean;
  contentRows?: number;
}

export function LocaleTabPanel({
  control,
  index,
  showContent = true,
  showMeta = true,
  contentRows = 8,
}: LocaleTabPanelProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <FormField
        control={control}
        name={`translations.${index}.title`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white/70">Titre <span className="text-[var(--rbs-red)]">*</span></FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="Titre..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50"
                onChange={(e) => {
                  field.onChange(e);
                }}
              />
            </FormControl>
            <FormMessage className="text-red-400 text-xs" />
          </FormItem>
        )}
      />

      {/* Slug */}
      <FormField
        control={control}
        name={`translations.${index}.slug`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white/70">Slug <span className="text-[var(--rbs-red)]">*</span></FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="slug-url..."
                className="bg-white/5 border-white/10 text-white/80 placeholder:text-white/30 focus:border-[var(--rbs-red)]/50 font-mono text-sm"
              />
            </FormControl>
            <FormMessage className="text-red-400 text-xs" />
          </FormItem>
        )}
      />

      {/* Short description */}
      <FormField
        control={control}
        name={`translations.${index}.shortDescription`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white/70">Description courte</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                rows={2}
                placeholder="Courte description..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50 resize-none"
              />
            </FormControl>
            <FormMessage className="text-red-400 text-xs" />
          </FormItem>
        )}
      />

      {/* Content */}
      {showContent && (
        <FormField
          control={control}
          name={`translations.${index}.content`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white/70">Contenu</FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage className="text-red-400 text-xs" />
            </FormItem>
          )}
        />
      )}

      {/* SEO */}
      {showMeta && (
        <div className="space-y-3 pt-2 border-t border-white/10">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">SEO</p>
          <FormField
            control={control}
            name={`translations.${index}.metaTitle`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/60 text-xs">Meta titre</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Meta titre (60 caractères max)..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50 text-sm"
                  />
                </FormControl>
                <FormMessage className="text-red-400 text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`translations.${index}.metaDescription`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/60 text-xs">Meta description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={2}
                    placeholder="Meta description (160 caractères max)..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--rbs-red)]/50 resize-none text-sm"
                  />
                </FormControl>
                <FormMessage className="text-red-400 text-xs" />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
