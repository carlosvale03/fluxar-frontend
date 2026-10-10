"use client"

import { Info } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { avisoDosMeses } from "@/lib/salario"
import { cn } from "@/lib/utils"
import type { ReferenciasDoSalario } from "@/types/salario"

interface ReferenciasProps {
  referencias: ReferenciasDoSalario | null
}

function Linha({ rotulo, valor, destaque, className }: { rotulo: string; valor: string; destaque?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-2 text-sm", className)}>
      <span className={destaque ? "font-semibold" : "text-muted-foreground"}>{rotulo}</span>
      <span className={cn("whitespace-nowrap tabular-nums", destaque ? "font-semibold" : "font-medium")}>{formatarMoeda(valor)}</span>
    </div>
  )
}

function Painel({ id, titulo, subtitulo, children }: { id: string; titulo: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="space-y-1">
        <h2 id={id} className="text-base font-semibold">
          {titulo}
        </h2>
        <p className="text-xs text-muted-foreground">{subtitulo}</p>
      </div>
      {children}
    </section>
  )
}

const Carregando = () => (
  <div className="space-y-2">
    <Skeleton className="h-5 w-full rounded-md" />
    <Skeleton className="h-5 w-full rounded-md" />
    <Skeleton className="h-5 w-2/3 rounded-md" />
  </div>
)

// SALARIO-52: o que já está comprometido no mês
export function ComprometidoNoMes({ referencias }: ReferenciasProps) {
  return (
    <Painel id="comprometido-titulo" titulo="Comprometido no mês" subtitulo="Contas que você já sabe que vai pagar">
      {!referencias ? (
        <Carregando />
      ) : (
        <div className="divide-y divide-border">
          <Linha rotulo="Despesas recorrentes pendentes" valor={referencias.committed.recurring_pending} />
          <Linha rotulo="Faturas que vencem no mês" valor={referencias.committed.invoices_due} />
          <Linha rotulo="Total comprometido" valor={referencias.committed.total} destaque />
        </div>
      )}
    </Painel>
  )
}

// SALARIO-53 e SALARIO-56: as médias dos últimos meses completos, com o aviso
// de quantos entraram. Sem nenhum mês completo, só uma linha.
export function SeuHistorico({ referencias }: ReferenciasProps) {
  const history = referencias?.history
  const aviso = history ? avisoDosMeses(history.months_used) : null
  const diferencaNegativa = history ? paraCentavos(history.difference_average) < 0 : false

  return (
    <Painel id="historico-titulo" titulo="Seu histórico" subtitulo="Média mensal dos últimos 3 meses completos">
      {!history ? (
        <Carregando />
      ) : history.months_used <= 0 ? (
        <p className="text-sm text-muted-foreground">Ainda sem um mês completo de histórico.</p>
      ) : (
        <>
          {aviso && (
            <p role="note" className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
              <Info aria-hidden className="h-3.5 w-3.5 shrink-0" />
              {aviso}
            </p>
          )}
          <div className="divide-y divide-border">
            <Linha rotulo="Salário" valor={history.salary_average} />
            {history.by_class.map((classe) => (
              <Linha key={classe.class_id ?? "sem-classe"} rotulo={`Gastos: ${classe.class_name}`} valor={classe.average} />
            ))}
            <Linha rotulo="Total de despesas" valor={history.expense_average} />
            <Linha
              rotulo="Salário menos despesas"
              valor={history.difference_average}
              destaque
              className={cn(diferencaNegativa && "text-rose-600 dark:text-rose-400")}
            />
          </div>
        </>
      )}
    </Painel>
  )
}
