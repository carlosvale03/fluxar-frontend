import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base transition-colors duration-fast placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-gold-line focus-visible:ring-2 focus-visible:ring-ring/30 aria-[invalid=true]:border-outflow disabled:cursor-not-allowed disabled:opacity-45 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
