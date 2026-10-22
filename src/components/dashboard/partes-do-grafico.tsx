import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

// AZ-23 e AZ-29 (DESIGN.md §6): peças comuns dos gráficos da Ponte de Comando
// e das Cartas, para todos terem o mesmo tooltip, a mesma legenda e o mesmo
// cabeçalho com a granularidade.

// Tooltip: fundo elevated, borda forte, valores em mono; no claro, sombra suave
export function CaixaDoTooltip({ titulo, children, className }: { titulo?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "min-w-[160px] rounded-md border border-border-strong bg-elevated p-3 text-sm text-foreground shadow-[0_8px_24px_rgba(11,18,32,0.08)] dark:shadow-none",
        className,
      )}
    >
      {titulo && <p className="label mb-2 text-muted-foreground">{titulo}</p>}
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

// Uma linha do tooltip: marca da cor, nome e valor
export function LinhaDoTooltip({ cor, nome, valor }: { cor?: string; nome: ReactNode; valor: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-2 text-fg-secondary">
        {cor && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} />}
        {nome}
      </span>
      <span className="value-m text-foreground">{valor}</span>
    </div>
  )
}

// Item da legenda, acima do gráfico e à direita do título
export function ItemDaLegenda({ cor, rotulo, tracejado = false }: { cor: string; rotulo: string; tracejado?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn("shrink-0", tracejado ? "h-0 w-3 border-t-2 border-dashed" : "h-2 w-2 rounded-full")}
        style={tracejado ? { borderColor: cor } : { backgroundColor: cor }}
      />
      {rotulo}
    </span>
  )
}

// Granularidade sempre indicada no título ("por dia", "por mês")
export function Granularidade({ children }: { children: ReactNode }) {
  return <span className="label shrink-0 text-muted-foreground">{children}</span>
}
