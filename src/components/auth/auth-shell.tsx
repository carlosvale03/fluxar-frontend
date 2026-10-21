"use client"

import { ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Logo } from "@/components/layout/logo"

interface AuthShellProps {
  children: ReactNode
  className?: string
  title?: string
  description?: string
  showLogo?: boolean
}

// AZ-31: casca das telas de acesso. Fundo liso, card de superfície com o
// brilho de 1px do tema e uma entrada curta (desligada com reduced-motion).
export function AuthShell({ children, className, title, description, showLogo = true }: AuthShellProps) {
  const reduzirMovimento = useReducedMotion()

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={reduzirMovimento ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
        className={cn("w-full max-w-md space-y-6", className)}
      >
        {showLogo && (
          <div className="flex justify-center">
            <Link href="/" aria-label="Azimute, página inicial" className="flex items-center gap-2 rounded-md">
              <Logo tamanho={36} />
            </Link>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card bg-[image:linear-gradient(90deg,transparent,var(--az-sheen),transparent)] bg-[length:100%_1px] bg-no-repeat">
          <div className="p-6 sm:p-8">
            {(title || description) && (
              <div className="mb-6 space-y-1">
                {title && <h1 className="display-l text-foreground">{title}</h1>}
                {description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
              </div>
            )}

            {children}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
