import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // AZ-12: borda de campo, foco em ouro, erro em outflow; no celular, alvo de 44px
          "flex h-9 max-md:min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base transition-colors duration-fast file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-gold-line focus-visible:ring-2 focus-visible:ring-ring/30 aria-[invalid=true]:border-outflow disabled:cursor-not-allowed disabled:opacity-45 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
