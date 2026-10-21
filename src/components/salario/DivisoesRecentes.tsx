"use client"

import { format } from "date-fns"
import { AlertTriangle, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { lerData } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { avisoDasSaidasMudadas, resumoDoDesconto } from "@/lib/salario"
import type { DivisaoDoSalario } from "@/types/salario"

interface DivisoesRecentesProps {
  divisoes: DivisaoDoSalario[] | null
  onDesfazer: (divisao: DivisaoDoSalario) => void
}

const dataCurta = (data: string) => format(lerData(data), "dd/MM/yyyy")

// SALARIO-45 e SALARIO-49: as divisões que ainda podem ser desfeitas, para o
// desfazer continuar disponível depois de fechado o resultado da geração.
// Sem nenhuma, a seção não aparece.
export function DivisoesRecentes({ divisoes, onDesfazer }: DivisoesRecentesProps) {
  if (!divisoes || divisoes.length === 0) return null

  return (
    <section aria-labelledby="divisoes-recentes-titulo" className="space-y-3 rounded-lg border border-border bg-card p-5">
      <div className="space-y-1">
        <h2 id="divisoes-recentes-titulo" className="display-s">
          Divisões recentes
        </h2>
        <p className="text-xs text-muted-foreground">Você tem 7 dias para desfazer uma divisão</p>
      </div>

      <ul className="divide-y divide-border" aria-label="Divisões recentes">
        {divisoes.map((divisao) => {
          const recebido = divisao.receipt.date
            ? `Salário de ${formatarMoeda(divisao.receipt.amount)} recebido em ${dataCurta(divisao.receipt.date)}`
            : `Salário de ${formatarMoeda(divisao.receipt.amount)}`
          // SALARIO-68: o que a divisão descontou das saídas da conta
          const desconto = resumoDoDesconto(divisao.outflows)
          const mudaram = avisoDasSaidasMudadas(divisao.outflows_changed)
          return (
            <li key={divisao.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium tabular-nums">{recebido}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Dividido em {dataCurta(divisao.date)} · Total dividido: {formatarMoeda(divisao.total)}
                </p>
                {desconto && <p className="text-xs text-muted-foreground tabular-nums">{desconto}</p>}
                {mudaram && (
                  <p role="status" className="flex items-start gap-1.5 text-xs font-medium text-warn">
                    <AlertTriangle aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
                    {mudaram}
                  </p>
                )}
                <p className="text-xs text-muted-foreground tabular-nums">
                  Você pode desfazer até {dataCurta(divisao.can_undo_until)}
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => onDesfazer(divisao)}
                aria-label={`Desfazer divisão: ${recebido}`}
              >
                <Undo2 aria-hidden /> Desfazer
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
