import { Providers } from '@/components/providers';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { GraffitiCursor } from '@/components/ui/graffiti-cursor';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <GraffitiCursor />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </Providers>
  );
}
