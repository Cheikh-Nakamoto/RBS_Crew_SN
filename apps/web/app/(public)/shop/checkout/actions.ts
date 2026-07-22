'use server';

import { redirect } from 'next/navigation';
import { checkoutSchema, type CheckoutFormValues } from '@/lib/checkout-schema';
import { auth } from '@/lib/auth';
import type { CartItem } from '@/lib/cart-store';
import { API_BASE } from '@/lib/api-base';

const API_URL = API_BASE;

export async function createNabooCheckout(
  values: CheckoutFormValues,
  items: CartItem[],
  shippingMethodId: string | null,
) {
  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) {
    return { error: 'Formulaire invalide, vérifiez les champs.' };
  }
  if (!shippingMethodId) {
    return { error: 'Sélectionnez un mode de livraison.' };
  }

  const session = await auth();
  if (!session || !session.accessToken) {
    return { error: 'Vous devez être connecté pour procéder au paiement.' };
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  let redirectUrl = '';

  try {
    // 1. Create order
    const orderRes = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        customerFirstName: parsed.data.customerFirstName,
        customerLastName: parsed.data.customerLastName,
        customerPhone: parsed.data.customerPhone,
        shippingAddress: parsed.data.shippingAddress,
        // Le backend recalcule les frais depuis ces deux champs — le montant
        // affiché au client n'est jamais celui qui est facturé.
        shippingMethodId,
        shippingCountry: parsed.data.shippingAddress.country,
      }),
    });

    if (!orderRes.ok) {
      const body = await orderRes.json().catch(() => null);
      return { error: body?.message || "Erreur lors de la création de la commande." };
    }

    const order = await orderRes.json();

    // 2. Create Naboo checkout
    const checkoutRes = await fetch(`${API_URL}/payments/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        orderId: order.id,
        paymentMethod: 'NABOO',
        successUrl: `${origin}/shop/checkout/success?orderId=${order.id}`,
        cancelUrl: `${origin}/shop/checkout/cancel?orderId=${order.id}`,
      }),
    });

    if (!checkoutRes.ok) {
      const body = await checkoutRes.json().catch(() => null);
      return { error: body?.message || "Impossible d'initier le paiement. Réessayez." };
    }

    const { url } = await checkoutRes.json();
    if (!url) {
      return { error: "URL de paiement non reçue du fournisseur." };
    }
    
    redirectUrl = url;
  } catch (err) {
    console.error('Checkout error:', err);
    return { error: 'Une erreur est survenue lors de la transaction.' };
  }

  redirect(redirectUrl);
}
