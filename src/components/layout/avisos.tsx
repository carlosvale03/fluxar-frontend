"use client"

import type { CSSProperties } from "react"
import { Toaster } from "sonner"
import { useTheme } from "next-themes"

// AZ-19 (DESIGN.md §5, Avisos temporários): canto inferior direito, superfície
// elevada e ícone na cor do estado. O sonner já anuncia em aria-live="polite"
// e não rouba o foco.
const CORES = {
  "--normal-bg": "var(--az-elevated)",
  "--normal-border": "var(--az-border-strong)",
  "--normal-text": "var(--az-text-primary)",
} as CSSProperties

export function Avisos() {
  const { resolvedTheme } = useTheme()

  return (
    <Toaster
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="bottom-right"
      closeButton
      duration={4000}
      style={CORES}
      toastOptions={{
        classNames: {
          toast: "font-sans",
          success: "[&_[data-icon]]:text-inflow",
          error: "[&_[data-icon]]:text-outflow",
          warning: "[&_[data-icon]]:text-warn",
          info: "[&_[data-icon]]:text-info",
          actionButton: "!bg-gold !text-gold-ink !font-semibold",
        },
      }}
    />
  )
}
