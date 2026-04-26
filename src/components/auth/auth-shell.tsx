"use client"

import { ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"

interface AuthShellProps {
  children: ReactNode
  className?: string
  title?: string
  description?: string
  showLogo?: boolean
}

export function AuthShell({ children, className, title, description, showLogo = true }: AuthShellProps) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background p-4 sm:p-6 lg:p-8">
      {/* Background Animated Elements */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 -right-4 w-72 h-72 bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative z-10 w-full max-w-md space-y-8",
          className
        )}
      >
        {showLogo && (
          <div className="flex flex-col items-center justify-center space-y-2 mb-2">
             <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 duration-300">
                <div className="relative h-12 w-48 hidden dark:block">
                  <Image 
                    src="/logo/logo-dark-clean-1630x700.png" 
                    alt="Fluxar Logo" 
                    fill
                    sizes="200px"
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="relative h-12 w-48 dark:hidden">
                  <Image 
                    src="/logo/logo-light-clean-1630x700.png" 
                    alt="Fluxar Logo" 
                    fill
                    sizes="200px"
                    className="object-contain"
                    priority
                  />
                </div>
              </Link>
          </div>
        )}

        <div className="bg-card/40 backdrop-blur-xl rounded-[32px] border border-border/60 shadow-2xl overflow-hidden relative group">
          {/* Subtle light streak */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="p-8 sm:p-10">
            {(title || description) && (
              <div className="space-y-2 mb-8">
                {title && <h1 className="text-3xl font-black tracking-tight text-foreground">{title}</h1>}
                {description && <p className="text-muted-foreground text-sm font-medium leading-relaxed">{description}</p>}
              </div>
            )}
            
            {children}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
