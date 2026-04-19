import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        /** RBS red: graffiti / rap / street genre tag */
        rbsRed:
          "border-[var(--rbs-red)]/40 bg-[var(--rbs-red)]/10 text-[var(--rbs-red-light)] uppercase tracking-[0.1em] font-bold [a]:hover:bg-[var(--rbs-red)]/20 [a]:hover:border-[var(--rbs-red)]/70",
        /** RBS gold: akademya / education / premium editorial tag */
        rbsGold:
          "border-[var(--rbs-gold)]/45 bg-[var(--rbs-gold)]/10 text-[var(--rbs-gold)] uppercase tracking-[0.1em] font-bold [a]:hover:bg-[var(--rbs-gold)]/20 [a]:hover:border-[var(--rbs-gold)]/80",
        /** RBS green: afrobeat / wellness / community tag */
        rbsGreen:
          "border-[var(--rbs-green)]/45 bg-[var(--rbs-green)]/10 text-[var(--rbs-green-light)] uppercase tracking-[0.1em] font-bold [a]:hover:bg-[var(--rbs-green)]/20 [a]:hover:border-[var(--rbs-green)]/75",
        /** Role badge — crew member / founder / artist */
        role:
          "border-white/15 bg-white/5 text-white/85 uppercase tracking-[0.12em] font-mono font-bold backdrop-blur-sm [a]:hover:bg-white/10 [a]:hover:border-white/30",
        /** Genre badge — neutral base with gold accent underline-like border */
        genre:
          "border-b-2 border-b-[var(--rbs-gold)]/60 border-x-0 border-t-0 rounded-none bg-transparent text-white uppercase tracking-[0.15em] font-bold px-0.5 [a]:hover:border-b-[var(--rbs-gold)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
