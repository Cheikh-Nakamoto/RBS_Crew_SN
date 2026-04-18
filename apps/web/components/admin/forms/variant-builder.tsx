'use client';

import { useFieldArray, type Control } from 'react-hook-form';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import type { ProductFormValues } from '@/lib/admin/schemas';

interface VariantBuilderProps {
  control: Control<ProductFormValues>;
}

export function VariantBuilder({ control }: VariantBuilderProps) {
  const { fields: variants, append, remove } = useFieldArray({
    control,
    name: 'variants',
  });

  return (
    <div className="space-y-3">
      {variants.length === 0 && (
        <p className="text-sm text-white/30 text-center py-4 rounded-lg border border-dashed border-white/10">
          Aucune variante. Cliquez sur &quot;Ajouter&quot; pour en créer.
        </p>
      )}

      {variants.map((variant, variantIndex) => (
        <VariantRow
          key={variant.id}
          control={control}
          variantIndex={variantIndex}
          onRemove={() => remove(variantIndex)}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ sku: '', price: 0, stock: 0, attributes: [] })}
        className="border-white/20 text-white/70 hover:text-white hover:bg-white/5 hover:border-white/40 gap-2"
      >
        <Plus className="h-4 w-4" />
        Ajouter une variante
      </Button>
    </div>
  );
}

interface VariantRowProps {
  control: Control<ProductFormValues>;
  variantIndex: number;
  onRemove: () => void;
}

function VariantRow({ control, variantIndex, onRemove }: VariantRowProps) {
  const { fields: attrs, append: appendAttr, remove: removeAttr } = useFieldArray({
    control,
    name: `variants.${variantIndex}.attributes`,
  });

  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          Variante {variantIndex + 1}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* SKU, Price, Stock */}
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={control}
          name={`variants.${variantIndex}.sku`}
          render={({ field }) => (
            <FormItem>
              <p className="text-xs text-white/40 mb-1">SKU</p>
              <FormControl>
                <Input
                  {...field}
                  placeholder="SKU..."
                  className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20 focus:border-[var(--rbs-red)]/50 h-9"
                />
              </FormControl>
              <FormMessage className="text-red-400 text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`variants.${variantIndex}.price`}
          render={({ field }) => (
            <FormItem>
              <p className="text-xs text-white/40 mb-1">Prix (FCFA)</p>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min={0}
                  placeholder="0"
                  className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20 focus:border-[var(--rbs-red)]/50 h-9"
                />
              </FormControl>
              <FormMessage className="text-red-400 text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`variants.${variantIndex}.stock`}
          render={({ field }) => (
            <FormItem>
              <p className="text-xs text-white/40 mb-1">Stock</p>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min={0}
                  placeholder="0"
                  className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20 focus:border-[var(--rbs-red)]/50 h-9"
                />
              </FormControl>
              <FormMessage className="text-red-400 text-xs" />
            </FormItem>
          )}
        />
      </div>

      {/* Attributes */}
      <div className="space-y-2">
        <p className="text-xs text-white/40">Attributs</p>
        {attrs.map((attr, attrIndex) => (
          <div key={attr.id} className="flex items-center gap-2">
            <FormField
              control={control}
              name={`variants.${variantIndex}.attributes.${attrIndex}.key`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Clé (ex: Taille)"
                      className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/20 focus:border-[var(--rbs-red)]/50 h-8"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <span className="text-white/20 text-sm">:</span>
            <FormField
              control={control}
              name={`variants.${variantIndex}.attributes.${attrIndex}.value`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Valeur (ex: L)"
                      className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/20 focus:border-[var(--rbs-red)]/50 h-8"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeAttr(attrIndex)}
              className="h-8 w-8 text-white/30 hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => appendAttr({ key: '', value: '' })}
          className="text-xs text-white/40 hover:text-white/70 h-7 gap-1 px-2"
        >
          <Plus className="h-3 w-3" />
          Attribut
        </Button>
      </div>
    </div>
  );
}
