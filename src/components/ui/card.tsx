import * as React from "react"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  // Card que leva a outro lugar: hover, cursor e a seta no canto (DESIGN.md §5, Cards)
  interativo?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, interativo = false, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // AZ-11: superfície sem sombra; no escuro, um brilho de 1px no topo (token --az-sheen, transparente no claro)
      "rounded-lg border border-border bg-card text-card-foreground bg-[image:linear-gradient(90deg,transparent,var(--az-sheen),transparent)] bg-no-repeat bg-[length:100%_1px]",
      interativo &&
        "relative cursor-pointer transition-colors duration-fast ease-az-out hover:bg-elevated focus-within:ring-2 focus-within:ring-ring",
      className
    )}
    {...props}
  >
    {children}
    {interativo && (
      <ArrowUpRight aria-hidden="true" className="pointer-events-none absolute right-4 top-4 h-4 w-4 text-muted-foreground" />
    )}
  </div>
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("display-s text-foreground", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
