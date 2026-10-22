import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// AZ-14 (DESIGN.md §5, Alertas): listra lateral de 3px na cor do estado e
// fundo de superfície; nunca preenchido, para não competir com o ouro.
const alertVariants = cva(
  "relative w-full rounded-r-lg border border-border border-l-[3px] bg-card p-4 text-foreground [&>svg~div]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
  {
    variants: {
      variant: {
        default: "border-l-border-strong [&>svg]:text-muted-foreground",
        destructive: "border-l-outflow [&>svg]:text-outflow",
        warning: "border-l-warn [&>svg]:text-warn",
        info: "border-l-info [&>svg]:text-info",
        success: "border-l-inflow [&>svg]:text-inflow",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

// Um parágrafo em negrito, não um título: o aviso aparece em qualquer nível
// da página e um <h5> fixo pulava a hierarquia (AZ-36)
const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("mb-1 text-sm font-semibold leading-none", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-fg-secondary [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
