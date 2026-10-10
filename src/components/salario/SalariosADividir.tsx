"use client"

import { format } from "date-fns"
import { Banknote, Scissors } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { lerData } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import type { RecebimentoDoSalario } from "@/types/salario"

interface SalariosADividirProps {
  recebimentos: RecebimentoDoSalario[] | null
  onDividir: (recebimento: RecebimentoDoSalario) => void
}

// SALARIO-24: os salários efetivados do mês atual e do anterior que ainda
// não foram divididos, cada um com o botão de dividir
export function SalariosADividir({ recebimentos, onDividir }: SalariosADividirProps) {
  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm rounded-[32px] overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Salários a dividir</h2>
            <p className="text-xs text-muted-foreground font-medium">Recebidos neste mês e no anterior</p>
          </div>
        </div>

        {recebimentos === null ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : recebimentos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center bg-muted/10 rounded-2xl border border-dashed border-border/40">
            Nenhum salário a dividir. Quando você lançar um salário recebido, ele aparece aqui.
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Salários a dividir">
            {recebimentos.map((recebimento) => (
              <li
                key={recebimento.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-border/40 bg-background/60"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{recebimento.description}</p>
                  <p className="text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-2">
                    <span>{format(lerData(recebimento.date), "dd/MM/yyyy")}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span>{recebimento.account_name}</span>
                    {recebimento.category_name && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                        <span>{recebimento.category_name}</span>
                      </>
                    )}
                    {recebimento.imported && (
                      <Badge variant="outline" className="text-[10px] rounded-full">
                        Importado
                      </Badge>
                    )}
                  </p>
                </div>
                <p className="text-lg font-black text-emerald-600 whitespace-nowrap">{formatarMoeda(recebimento.amount)}</p>
                <Button
                  className="rounded-2xl font-black uppercase tracking-widest text-[10px] h-10 px-5"
                  onClick={() => onDividir(recebimento)}
                  aria-label={`Dividir ${recebimento.description} de ${formatarMoeda(recebimento.amount)}`}
                >
                  <Scissors className="mr-2 h-4 w-4" /> Dividir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
