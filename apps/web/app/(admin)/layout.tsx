import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AdminLayout } from '@/components/admin/layout/admin-layout';
import { Toaster } from '@/components/ui/sonner';

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect('/login');

  // Le middleware a déjà filtré, mais on garde cette garde SSR au cas où.
  // Toute erreur de session, pas seulement l'expiration : un accessToken absent
  // ferait échouer chaque requête de la page sans explication.
  if (session.error === 'SessionMaxAgeError') redirect('/login?reason=session_max_age');
  if (session.error) redirect('/login?reason=session_expired');

  const role = session.user?.role;
  if (role !== 'ADMIN' && role !== 'EDITOR') redirect('/profile?reason=role_pending');

  return (
    <>
      <AdminLayout session={session}>{children}</AdminLayout>
      <Toaster position="bottom-right" theme="dark" richColors />
    </>
  );
}
