import { Providers } from '@/components/providers';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { GraffitiCursorLazy } from '@/components/ui/graffiti-cursor-lazy';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <GraffitiCursorLazy />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </Providers>
  );
}
