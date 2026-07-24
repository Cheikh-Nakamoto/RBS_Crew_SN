import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact — Collaborer avec RBS Crew',
  description:
    'Contacte le RBS Crew SN pour une fresque, un atelier, un événement ou un partenariat.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
