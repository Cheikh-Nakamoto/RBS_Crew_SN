import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import type { VariantProps } from 'class-variance-authority';

interface ButtonLinkProps extends VariantProps<typeof buttonVariants> {
  href: string;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
}

export function ButtonLink({ href, className, variant, size, children, external }: ButtonLinkProps) {
  const cls = cn(buttonVariants({ variant, size }), className);

  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
