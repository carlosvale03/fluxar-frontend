import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// AZ-13 (DESIGN.md §5, Pílulas): mono, caixa alta, contorno; a cor fica no
// texto e sempre acompanha uma palavra. Preenchida (default) só para contagens.
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs font-normal uppercase tracking-[0.06em] whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gold text-gold-ink",
        secondary: "border-border-strong text-fg-secondary",
        outline: "border-border-strong text-foreground",
        destructive: "border-border-strong text-outflow",
        success: "border-border-strong text-inflow",
        warning: "border-border-strong text-warn",
        info: "border-border-strong text-info",
        destino: "border-border-strong text-gold-line",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
