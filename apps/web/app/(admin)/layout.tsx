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

  // Handle expired refresh token
  const tokenError = (session as { error?: string }).error;
  if (tokenError === 'RefreshTokenError') redirect('/login');

  const role = (session.user as { role?: string })?.role;
  if (role !== 'ADMIN' && role !== 'EDITOR') redirect('/');

  return (
    <SessionProvider session={session}>
      <AdminLayout session={session}>{children}</AdminLayout>
      <Toaster position="bottom-right" theme="dark" richColors />
    </SessionProvider>
  );
}
