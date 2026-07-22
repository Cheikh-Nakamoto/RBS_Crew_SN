import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { API_BASE } from '@/lib/api-base';

export const metadata = { title: 'Vérification de l’adresse e-mail' };

/**
 * Page atterrissage du lien reçu par e-mail.
 *
 * Server Component : la vérification est faite côté serveur, sans JavaScript
 * client — un lien cliqué depuis n'importe quel client mail fonctionne donc.
 * Le backend n'expose qu'un POST (`/auth/verify-email`), alors qu'un lien produit
 * un GET : c'est cette page qui fait la conversion.
 */
export default async function VerifierEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let ok = false;
  let message = "Ce lien de vérification est incomplet. Utilisez le lien reçu par e-mail.";

  if (token) {
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        cache: 'no-store',
      });
      if (res.ok) {
        ok = true;
      } else {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        message = body?.message ?? 'Ce lien est invalide ou a expiré.';
      }
    } catch {
      message = 'Le service de vérification est momentanément indisponible. Réessayez.';
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md glass rounded-2xl border border-white/10 p-8 space-y-5 text-center">
        {ok ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
            <h1 className="font-display text-2xl text-white">Adresse vérifiée</h1>
            <p className="text-sm text-white/50">
              Merci ! Votre adresse e-mail est confirmée : vous pouvez désormais passer commande.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/shop"
                className="px-5 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Aller à la boutique
              </Link>
              <Link
                href="/profile"
                className="px-5 py-3 rounded-xl bg-white/6 border border-white/10 text-white/80 text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                Mon profil
              </Link>
            </div>
          </>
        ) : (
          <>
            <XCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h1 className="font-display text-2xl text-white">Vérification impossible</h1>
            <p className="text-sm text-white/50">{message}</p>
            <p className="text-xs text-white/35">
              Depuis votre profil, vous pouvez demander l&apos;envoi d&apos;un nouveau lien.
            </p>
            <div className="pt-2">
              <Link
                href="/profile"
                className="inline-block px-5 py-3 rounded-xl bg-white/6 border border-white/10 text-white/80 text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                Aller à mon profil
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
