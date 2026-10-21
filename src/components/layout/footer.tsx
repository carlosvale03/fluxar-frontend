"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { semCasca } from "@/components/layout/navegacao"

export function Footer() {
  const pathname = usePathname()
  if (semCasca(pathname)) return null

  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-border bg-background py-6">
      <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 md:flex-row">
        <p className="text-xs text-muted-foreground">
          © {currentYear} Azimute. Todos os direitos reservados.
        </p>
        <nav aria-label="Institucional" className="flex items-center gap-6">
          <Link href="/sobre" className="text-xs text-muted-foreground transition-colors duration-fast hover:text-foreground">
            Sobre
          </Link>
          <Link href="/termos" className="text-xs text-muted-foreground transition-colors duration-fast hover:text-foreground">
            Termos e privacidade
          </Link>
        </nav>
      </div>
    </footer>
  )
}
