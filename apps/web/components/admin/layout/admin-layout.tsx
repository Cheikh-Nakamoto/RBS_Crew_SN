'use client';

import { useState } from 'react';
import type { Session } from 'next-auth';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface AdminLayoutProps {
  session: Session;
  children: React.ReactNode;
}

export function AdminLayout({ session, children }: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = (session.user as { role?: string })?.role ?? '';

  return (
    <div className="flex h-screen overflow-hidden bg-[#080808]">
      {/* Desktop sidebar */}
      <AdminSidebar role={role} className="hidden lg:flex" />

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 border-white/10 bg-transparent">
          <AdminSidebar role={role} className="flex" />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader onMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
