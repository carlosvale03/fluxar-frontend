import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface CabecalhoDePaginaProps {
  // Termo do glossário ("Diário de Bordo")
  titulo: string
  // Linha de apoio em linguagem comum, sempre visível (D-03): "Entradas e saídas"
  apoio: string
  // Seletor de período (MonthPicker etc.): fica sempre à vista (DESIGN.md §2, princípio 5)
  periodo?: ReactNode
  // Ações da página; no máximo uma primária (DESIGN.md §5)
  acoes?: ReactNode
  // Ajuda da página (PageHelp), ao lado do título
  ajuda?: ReactNode
  className?: string
}

// AZ-22: o cabeçalho padrão de todas as páginas do app
export function CabecalhoDePagina({ titulo, apoio, periodo, acoes, ajuda, className }: CabecalhoDePaginaProps) {
  return (
    <header className={cn("flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="display-l">{titulo}</h1>
          {ajuda}
        </div>
        <p className="text-sm text-muted-foreground">{apoio}</p>
      </div>
      {(periodo || acoes) && (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {periodo}
          {acoes}
        </div>
      )}
    </header>
  )
}
