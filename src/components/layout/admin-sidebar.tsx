"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, ShieldCheck } from "lucide-react"

import { NAVEGACAO_ADMIN, itemAtivo } from "@/components/layout/navegacao"
import { cn } from "@/lib/utils"

// AZ-21.9: menu lateral do admin com os tokens do Azimute
export function AdminSidebar() {
  const pathname = usePathname()
  const ativo = itemAtivo(pathname, NAVEGACAO_ADMIN)

  return (
    <aside className="hidden min-h-[calc(100vh-64px)] w-64 flex-col gap-4 border-r border-border bg-card p-5 lg:flex">
      <div className="mb-4 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-elevated">
          <ShieldCheck className="h-4 w-4 text-gold-line" aria-hidden="true" />
        </div>
        <div>
          <h2 className="display-s">Azimute Admin</h2>
          <p className="text-xs text-muted-foreground">Gestão do sistema</p>
        </div>
      </div>

      <nav aria-label="Administração" className="flex-1 space-y-1">
        {NAVEGACAO_ADMIN.map((item) => {
          const Icone = item.icone
          const estaAtivo = ativo === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={estaAtivo ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-fast",
                estaAtivo
                  ? "bg-elevated text-foreground shadow-[inset_2px_0_0_var(--az-gold)]"
                  : "text-fg-secondary hover:bg-elevated hover:text-foreground"
              )}
            >
              <Icone className={cn("h-4 w-4", estaAtivo ? "text-gold-line" : "text-muted-foreground")} aria-hidden="true" />
              {item.nome}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border pt-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-fg-secondary transition-colors duration-fast hover:bg-elevated hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar à aplicação
        </Link>
      </div>
    </aside>
  )
}
