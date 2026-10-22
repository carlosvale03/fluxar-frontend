"use client"

import { CornerDownRight, Link2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { ehPrincipal, textoDaPrincipal, textoDoCustoTotal, textoDosDependentes } from "@/services/vinculos"
import type { Transaction } from "@/types/transactions"

interface MarcaDoVinculoProps {
  transacao: Transaction
  // Abre a lista filtrada pela principal; sem ela (recurso travado), o custo
  // aparece só como texto (VINCULO-20)
  onAbrirPrincipal?: (id: string) => void
  className?: string
}

// VINCULO-24 e VINCULO-25: a principal mostra o custo total com a quantidade
// de dependentes; a dependente, a principal dela com a descrição e a data
export function MarcaDoVinculo({ transacao, onAbrirPrincipal, className }: MarcaDoVinculoProps) {
  const principal = ehPrincipal(transacao)
  const dependente = !!transacao.principal_detail
  if (!principal && !dependente) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {principal && (() => {
        const conteudo = (
          <>
            <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{textoDoCustoTotal(transacao.total_cost!)}</span>
            <span className="text-muted-foreground">· {textoDosDependentes(transacao.dependents_count ?? 0)}</span>
          </>
        )
        const classes = "inline-flex items-center gap-1.5 text-xs font-medium text-fg-secondary"
        return onAbrirPrincipal ? (
          <button
            type="button"
            onClick={(e) => {
              // No celular, o cartão inteiro abre a edição
              e.stopPropagation()
              onAbrirPrincipal(transacao.id)
            }}
            className={cn(classes, "rounded-sm underline-offset-2 transition-colors duration-fast hover:text-foreground hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
            title="Ver a principal e os gastos relacionados"
          >
            {conteudo}
          </button>
        ) : (
          <span className={classes}>{conteudo}</span>
        )
      })()}
      {dependente && (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CornerDownRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          {textoDaPrincipal(transacao.principal_detail!)}
        </span>
      )}
    </div>
  )
}
