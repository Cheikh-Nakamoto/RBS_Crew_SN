'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Session } from 'next-auth';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface AdminLayoutProps {
  session: Session;
  children: React.ReactNode;
}

export function AdminLayout({ session, children }: AdminLayoutProps) {
  const pathname = usePathname();
  const role = (session.user as { role?: string })?.role ?? '';

  // On mémorise la route sur laquelle le tiroir a été ouvert plutôt qu'un
  // simple booléen : dès que `pathname` change, l'égalité tombe et le tiroir se
  // referme de lui-même, sans effet ni setState en cascade.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const mobileOpen = openedAt === pathname;

  return (
    <div className="flex h-screen overflow-hidden bg-[#080808]">
      {/* Desktop sidebar */}
      <AdminSidebar role={role} className="hidden lg:flex" />

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={(open) => setOpenedAt(open ? pathname : null)}>
        <SheetContent side="left" className="w-64 p-0 border-white/10 bg-transparent">
          <AdminSidebar role={role} className="flex" />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader onMenuToggle={() => setOpenedAt(pathname)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
