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
            <Link2 className="h-3 w-3 shrink-0" />
            <span>{textoDoCustoTotal(transacao.total_cost!)}</span>
            <span className="opacity-60">· {textoDosDependentes(transacao.dependents_count ?? 0)}</span>
          </>
        )
        const classes = "inline-flex items-center gap-1.5 text-[10px] font-bold text-primary"
        return onAbrirPrincipal ? (
          <button
            type="button"
            onClick={(e) => {
              // No celular, o cartão inteiro abre a edição
              e.stopPropagation()
              onAbrirPrincipal(transacao.id)
            }}
            className={cn(classes, "rounded-full hover:underline underline-offset-2 cursor-pointer")}
            title="Ver a principal e os gastos relacionados"
          >
            {conteudo}
          </button>
        ) : (
          <span className={classes}>{conteudo}</span>
        )
      })()}
      {dependente && (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/70">
          <CornerDownRight className="h-3 w-3 shrink-0" />
          {textoDaPrincipal(transacao.principal_detail!)}
        </span>
      )}
    </div>
  )
}
