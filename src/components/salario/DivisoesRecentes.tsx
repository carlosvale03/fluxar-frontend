"use client"

import { format } from "date-fns"
import { History, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { lerData } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
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
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm rounded-[32px] overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Divisões recentes</h2>
            <p className="text-xs text-muted-foreground font-medium">Você tem 7 dias para desfazer uma divisão</p>
          </div>
        </div>

        <ul className="space-y-2" aria-label="Divisões recentes">
          {divisoes.map((divisao) => {
            const recebido = divisao.receipt.date
              ? `Salário de ${formatarMoeda(divisao.receipt.amount)} recebido em ${dataCurta(divisao.receipt.date)}`
              : `Salário de ${formatarMoeda(divisao.receipt.amount)}`
            return (
              <li
                key={divisao.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-border/40 bg-background/60"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{recebido}</p>
                  <p className="text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-2">
                    <span>Dividido em {dataCurta(divisao.date)}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span>Total dividido: {formatarMoeda(divisao.total)}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Você pode desfazer até {dataCurta(divisao.can_undo_until)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-2xl font-bold text-xs h-10 px-5"
                  onClick={() => onDesfazer(divisao)}
                  aria-label={`Desfazer divisão: ${recebido}`}
                >
                  <Undo2 className="mr-2 h-4 w-4" /> Desfazer divisão
                </Button>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
