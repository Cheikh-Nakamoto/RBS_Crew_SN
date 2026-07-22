'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { checkoutSchema, type CheckoutFormValues } from '@/lib/checkout-schema';
import { createNabooCheckout } from './actions';
import type { CartItem } from '@/lib/cart-store';
import { formatXOF } from '@/lib/format';
import { Lock, ArrowRight, Truck } from 'lucide-react';
import { apiUrl } from '@/lib/api-base';

interface ShippingOption {
  methodId: string;
  methodCode: string;
  name: Record<string, string>;
  flatFee: number;
  currency: string;
  isFree: boolean;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
}

export function CheckoutForm({
  items,
  total,
  shippingFee,
  sessionExists,
  onShippingChange,
}: {
  items: CartItem[];
  total: number;
  shippingFee: number;
  sessionExists: boolean;
  onShippingChange: (methodId: string | null, fee: number) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { customerPhone: '+221', shippingAddress: { country: 'SN' } },
  });

  const country = watch('shippingAddress.country');

  const select = useCallback(
    (opt: ShippingOption | null) => {
      setMethodId(opt?.methodId ?? null);
      onShippingChange(opt?.methodId ?? null, opt ? (opt.isFree ? 0 : opt.flatFee) : 0);
    },
    [onShippingChange],
  );

  // Les frais de port sont recalculés côté serveur à la création de la commande :
  // ce devis ne sert qu'à afficher les options et le montant attendu.
  useEffect(() => {
    if (!country || total <= 0) return;
    let cancelled = false;
    setLoadingOptions(true);

    fetch(apiUrl('/shipping/quote'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, orderTotal: total }),
    })
      .then((res) => (res.ok ? (res.json() as Promise<ShippingOption[]>) : []))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setOptions(list);
        select(list[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setOptions([]);
          select(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [country, total, select]);

  const onSubmit = (values: CheckoutFormValues) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createNabooCheckout(values, items, methodId);
      if (result?.error) setServerError(result.error);
    });
  };

  const noShippingAvailable = !loadingOptions && options.length === 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
        Vos informations
      </h2>

      {!sessionExists && (
        <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 mb-4">
          <p className="text-sm text-yellow-200/80">
            Vous devez être connecté pour finaliser votre commande.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-1">
          <input
            id="customerFirstName"
            type="text"
            placeholder="Prénom *"
            {...register('customerFirstName')}
            className={`w-full px-4 py-3 rounded-xl bg-white/6 border ${errors.customerFirstName ? 'border-red-500' : 'border-white/10'} text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all`}
          />
          {errors.customerFirstName && <p role="alert" className="text-xs text-red-500 mt-1">{errors.customerFirstName.message}</p>}
        </div>

        <div className="col-span-1">
          <input
            id="customerLastName"
            type="text"
            placeholder="Nom *"
            {...register('customerLastName')}
            className={`w-full px-4 py-3 rounded-xl bg-white/6 border ${errors.customerLastName ? 'border-red-500' : 'border-white/10'} text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all`}
          />
          {errors.customerLastName && <p role="alert" className="text-xs text-red-500 mt-1">{errors.customerLastName.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="customerPhone" className="sr-only">Téléphone (Wave / Orange Money)</label>
        <Controller
          name="customerPhone"
          control={control}
          render={({ field }) => (
            <PhoneInput
              {...field}
              id="customerPhone"
              defaultCountry="SN"
              international
              countryCallingCodeEditable={false}
              className={`w-full px-4 py-3 rounded-xl bg-white/6 border ${errors.customerPhone ? 'border-red-500' : 'border-white/10'} text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all phone-input-custom`}
            />
          )}
        />
        {errors.customerPhone && <p role="alert" className="text-xs text-red-500 mt-1">{errors.customerPhone.message}</p>}
      </div>

      <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mt-8 mb-4">
        Adresse de livraison
      </h2>

      <div>
        <input
          type="text"
          placeholder="Adresse ligne 1 *"
          {...register('shippingAddress.line1')}
          className={`w-full px-4 py-3 rounded-xl bg-white/6 border ${errors.shippingAddress?.line1 ? 'border-red-500' : 'border-white/10'} text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all`}
        />
        {errors.shippingAddress?.line1 && <p role="alert" className="text-xs text-red-500 mt-1">{errors.shippingAddress.line1.message}</p>}
      </div>

      <div>
        <input
          type="text"
          placeholder="Adresse ligne 2 (optionnel)"
          {...register('shippingAddress.line2')}
          className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-1">
          <input
            type="text"
            placeholder="Ville *"
            {...register('shippingAddress.city')}
            className={`w-full px-4 py-3 rounded-xl bg-white/6 border ${errors.shippingAddress?.city ? 'border-red-500' : 'border-white/10'} text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all`}
          />
          {errors.shippingAddress?.city && <p role="alert" className="text-xs text-red-500 mt-1">{errors.shippingAddress.city.message}</p>}
        </div>
        <div className="col-span-1">
          <input
            type="text"
            placeholder="Code postal"
            {...register('shippingAddress.postalCode')}
            className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all"
          />
        </div>
      </div>

      <div>
        <select
          {...register('shippingAddress.country')}
          className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/30 transition-all appearance-none"
        >
          <option value="SN" className="bg-[#111]">Sénégal</option>
          <option value="FR" className="bg-[#111]">France</option>
          <option value="CI" className="bg-[#111]">Côte d&apos;Ivoire</option>
          <option value="ML" className="bg-[#111]">Mali</option>
          <option value="GM" className="bg-[#111]">Gambie</option>
          <option value="MR" className="bg-[#111]">Mauritanie</option>
          <option value="MA" className="bg-[#111]">Maroc</option>
          <option value="BE" className="bg-[#111]">Belgique</option>
          <option value="CH" className="bg-[#111]">Suisse</option>
          <option value="US" className="bg-[#111]">États-Unis</option>
        </select>
      </div>

      {/* ── Mode de livraison ─────────────────────────────────────── */}
      <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
          <Truck className="w-3.5 h-3.5" /> Livraison
        </h2>

        {loadingOptions && (
          <p className="text-xs text-white/40">Calcul des frais de livraison…</p>
        )}

        {noShippingAvailable && (
          <p role="alert" className="text-xs text-red-300">
            Aucun mode de livraison n&apos;est disponible pour ce pays. Contactez-nous pour
            organiser l&apos;expédition.
          </p>
        )}

        {options.map((opt) => (
          <label
            key={opt.methodId}
            className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
              methodId === opt.methodId
                ? 'bg-white/8 border-red-600/40'
                : 'bg-white/4 border-white/10 hover:bg-white/6'
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="shippingMethod"
                value={opt.methodId}
                checked={methodId === opt.methodId}
                onChange={() => select(opt)}
                className="accent-red-600"
              />
              <span>
                <span className="block text-sm text-white">
                  {opt.name.fr ?? opt.name.en ?? opt.methodCode}
                </span>
                {opt.estimatedDaysMin != null && (
                  <span className="block text-[11px] text-white/40">
                    Livraison estimée : {opt.estimatedDaysMin}
                    {opt.estimatedDaysMax != null && opt.estimatedDaysMax !== opt.estimatedDaysMin
                      ? `–${opt.estimatedDaysMax}`
                      : ''}{' '}
                    jours
                  </span>
                )}
              </span>
            </span>
            <span className="text-sm font-semibold text-white shrink-0">
              {opt.isFree ? 'Gratuite' : formatXOF(opt.flatFee)}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-white/10">
        {serverError && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <p role="alert" className="text-xs text-red-300">{serverError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !sessionExists || !methodId}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-600/25"
        >
          {isPending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : !sessionExists ? (
            <>
              <Lock className="w-4 h-4" />
              Se connecter pour payer
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Payer {formatXOF(total + shippingFee)} avec NabooPay
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
        <p className="text-[10px] text-white/40 text-center leading-relaxed mt-4">
          Vous choisirez votre moyen de paiement sur la page sécurisée de NabooPay.
        </p>
      </div>
    </form>
  );
}
