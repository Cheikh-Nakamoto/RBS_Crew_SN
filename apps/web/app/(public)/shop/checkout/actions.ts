'use server';

import { redirect } from 'next/navigation';
import { checkoutSchema, type CheckoutFormValues } from '@/lib/checkout-schema';
import { auth } from '@/lib/auth';
import type { CartItem } from '@/lib/cart-store';

const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function createNabooCheckout(values: CheckoutFormValues, items: CartItem[]) {
  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) {
    return { error: 'Formulaire invalide, vérifiez les champs.' };
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
        // Envoi des infos de livraison (si géré par le backend)
        shippingAddress: parsed.data.shippingAddress,
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
