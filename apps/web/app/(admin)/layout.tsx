import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
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

  // Le middleware a déjà filtré, mais on garde cette garde SSR au cas où
  if (session.error === 'RefreshTokenError') redirect('/login?reason=session_expired');

  const role = session.user?.role;
  if (role !== 'ADMIN' && role !== 'EDITOR') redirect('/');

  return (
    <SessionProvider session={session}>
      <AdminLayout session={session}>{children}</AdminLayout>
      <Toaster position="bottom-right" theme="dark" richColors />
    </SessionProvider>
  );
}
