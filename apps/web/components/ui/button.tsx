import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent',
    'bg-clip-padding text-sm font-medium whitespace-nowrap select-none outline-none',
    'transition-all duration-150 ease-out',
    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.97]',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_oklch(0.52_0.20_18/0.3)]',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20',
        link:
          'text-primary underline-offset-4 hover:underline',
        /** Brand gradient: rbs-red → rbs-red-dark with glow on hover */
        gradient: [
          'border-0 text-white font-semibold',
          'bg-gradient-to-r from-[var(--rbs-red)] via-[var(--rbs-red-light)] to-[var(--rbs-red)]',
          'bg-[length:200%_100%] bg-[position:0%_0%]',
          'hover:bg-[position:100%_0%]',
          'hover:shadow-[0_0_24px_oklch(0.52_0.20_18/0.45),0_4px_12px_oklch(0_0_0/0.3)]',
          'transition-[background-position,box-shadow] duration-300',
        ].join(' '),
        /** Glow: outlined with animated glow on hover */
        glow: [
          'border border-[var(--rbs-red)]/40 bg-[var(--rbs-red)]/8 text-white',
          'hover:border-[var(--rbs-red)]/70 hover:bg-[var(--rbs-red)]/15',
          'hover:shadow-[0_0_20px_oklch(0.52_0.20_18/0.35),0_0_40px_oklch(0.52_0.20_18/0.15)]',
        ].join(' '),
        /** Green accent variant */
        accent: [
          'bg-[var(--rbs-green)] text-white',
          'hover:bg-[var(--rbs-green-light)]',
          'hover:shadow-[0_0_20px_oklch(0.45_0.14_145/0.35)]',
        ].join(' '),
      },
      size: {
        default: 'h-10 gap-1.5 px-4',
        xs:      'h-7 gap-1 rounded-md px-2.5 text-xs',
        sm:      'h-9 gap-1 rounded-md px-3 text-[0.8rem]',
        lg:      'h-12 gap-2 px-5 text-base',
        xl:      'h-14 gap-2 px-7 text-base font-semibold rounded-xl',
        icon:    'size-10',
        'icon-xs': 'size-7 rounded-md',
        'icon-sm': 'size-9 rounded-md',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    if (asChild) {
      return (
        <Comp
          data-slot="button"
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={disabled}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <button
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="size-4 animate-spin-slow"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
