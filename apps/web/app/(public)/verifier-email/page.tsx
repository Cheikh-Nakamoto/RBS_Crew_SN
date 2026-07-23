import { VerifyForm } from './verify-form';

export const metadata = { title: 'Vérification de l’adresse e-mail' };

/**
 * Page d'atterrissage du lien reçu par e-mail.
 *
 * Le rendu ne consomme RIEN : le jeton n'est échangé qu'au clic, via une Server
 * Action. Les scanners de liens des messageries (Microsoft Safe Links, antivirus
 * de passerelle) visitent en GET les URL contenues dans un e-mail avant de le
 * livrer ; consommer le jeton au rendu le grillerait avant même que le
 * destinataire n'ouvre son message.
 *
 * Le backend n'expose qu'un POST (`/auth/verify-email`) alors qu'un lien produit
 * un GET : c'est la Server Action qui fait la conversion.
 */
export default async function VerifierEmailPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md glass rounded-2xl border border-white/10 p-8 space-y-5 text-center">
        <VerifyForm token={token} />
      </div>
    </div>
  );
}
