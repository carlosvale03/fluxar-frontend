import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// AZ-10 (DESIGN.md §5, Botões): primária em ouro, uma por área; secundária
// (outline) com contorno; fantasma só texto; destrutiva com contorno e texto
// em outflow, separada da primária.
const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold cursor-pointer transition-[color,background-color,border-color,transform] duration-fast ease-az-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gold text-gold-ink hover:bg-gold-hover",
        destructive: "border border-outflow bg-transparent text-outflow hover:bg-outflow/10",
        outline: "border border-border-strong bg-transparent text-foreground hover:bg-elevated",
        secondary: "bg-elevated text-foreground hover:bg-border-subtle",
        ghost: "text-fg-secondary hover:bg-elevated hover:text-foreground",
        link: "text-gold-line underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild || !loading ? children : (
          <>
            {/* Carregando: o indicador fica no lugar do rótulo e a largura do botão não muda */}
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin" aria-hidden="true" />
            </span>
            <span className="inline-flex items-center justify-center gap-2 opacity-0">{children}</span>
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
