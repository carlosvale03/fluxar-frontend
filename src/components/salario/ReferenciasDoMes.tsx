"use client"

import { CalendarClock, History, Info } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { avisoDosMeses } from "@/lib/salario"
import { cn } from "@/lib/utils"
import type { ReferenciasDoSalario } from "@/types/salario"

interface ReferenciasDoMesProps {
  referencias: ReferenciasDoSalario | null
}

function Linha({ rotulo, valor, destaque, className }: { rotulo: string; valor: string; destaque?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-1.5", className)}>
      <span className={cn("text-sm", destaque ? "font-black" : "font-medium text-muted-foreground")}>{rotulo}</span>
      <span className={cn("text-sm whitespace-nowrap", destaque ? "font-black" : "font-bold")}>{formatarMoeda(valor)}</span>
    </div>
  )
}

// SALARIO-52: o que já está comprometido no mês. SALARIO-53 e SALARIO-56: as
// médias dos últimos meses completos, com o aviso de quantos entraram.
export function ReferenciasDoMes({ referencias }: ReferenciasDoMesProps) {
  if (!referencias) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-48 w-full rounded-[32px]" />
        <Skeleton className="h-48 w-full rounded-[32px]" />
      </div>
    )
  }

  const { committed, history } = referencias
  const aviso = avisoDosMeses(history.months_used)
  const diferencaNegativa = paraCentavos(history.difference_average) < 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm rounded-[32px] overflow-hidden" aria-label="Comprometido no mês">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-600">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Comprometido no mês</h2>
              <p className="text-xs text-muted-foreground font-medium">Contas que você já sabe que vai pagar</p>
            </div>
          </div>
          <div className="divide-y divide-border/40">
            <Linha rotulo="Despesas recorrentes pendentes" valor={committed.recurring_pending} />
            <Linha rotulo="Faturas que vencem no mês" valor={committed.invoices_due} />
            <Linha rotulo="Total comprometido" valor={committed.total} destaque className="pt-2" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/50 backdrop-blur-sm rounded-[32px] overflow-hidden" aria-label="Seu histórico">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Seu histórico</h2>
              <p className="text-xs text-muted-foreground font-medium">Média mensal dos últimos 3 meses completos</p>
            </div>
          </div>
          {aviso && (
            <p role="note" className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {aviso}
            </p>
          )}
          <div className="divide-y divide-border/40">
            <Linha rotulo="Salário" valor={history.salary_average} />
            {history.by_class.map((classe) => (
              <Linha key={classe.class_id ?? "sem-classe"} rotulo={`Gastos: ${classe.class_name}`} valor={classe.average} />
            ))}
            <Linha rotulo="Total de despesas" valor={history.expense_average} />
            <Linha
              rotulo="Salário menos despesas"
              valor={history.difference_average}
              destaque
              className={cn("pt-2", diferencaNegativa && "text-rose-600")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
