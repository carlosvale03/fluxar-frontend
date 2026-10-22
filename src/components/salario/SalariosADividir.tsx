"use client"

import { format } from "date-fns"
import { Banknote, Scissors } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { lerData } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import type { RecebimentoDoSalario } from "@/types/salario"

interface SalariosADividirProps {
  recebimentos: RecebimentoDoSalario[] | null
  onDividir: (recebimento: RecebimentoDoSalario) => void
  // Leva ao painel Receitas de salário
  onEscolherReceitas?: () => void
}

const Ponto = () => <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />

function Detalhes({ recebimento }: { recebimento: RecebimentoDoSalario }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="tabular-nums">{format(lerData(recebimento.date), "dd/MM/yyyy")}</span>
      <Ponto />
      <span>{recebimento.account_name}</span>
      {recebimento.category_name && (
        <>
          <Ponto />
          <span>{recebimento.category_name}</span>
        </>
      )}
      {recebimento.imported && (
        <Badge variant="outline" className="rounded-full px-2 py-0 text-xs font-medium text-muted-foreground cursor-default">
          Importado
        </Badge>
      )}
    </div>
  )
}

// SALARIO-24: os salários efetivados do mês atual e do anterior que ainda
// não foram divididos. O mais recente fica em destaque com a ação principal;
// os outros vêm abaixo, compactos.
export function SalariosADividir({ recebimentos, onDividir, onEscolherReceitas }: SalariosADividirProps) {
  const ordenados = recebimentos ? [...recebimentos].sort((a, b) => b.date.localeCompare(a.date)) : null

  return (
    <section aria-labelledby="salario-recebido-titulo" className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="salario-recebido-titulo" className="display-s flex items-center gap-2">
          <Banknote aria-hidden className="h-4 w-4 text-inflow" />
          Salário recebido
        </h2>
        <p className="text-xs text-muted-foreground">Neste mês e no anterior, ainda não dividido</p>
      </div>

      {ordenados === null ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      ) : ordenados.length === 0 ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Nenhum salário a dividir neste mês ou no anterior.</p>
            <p className="text-sm text-muted-foreground">Suas receitas estão em outra categoria?</p>
          </div>
          {onEscolherReceitas && (
            <Button variant="outline" className="h-10 rounded-md px-4 self-start sm:self-auto" onClick={onEscolherReceitas}>
              Escolher receitas de salário
            </Button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border" aria-label="Salários a dividir">
          {ordenados.map((recebimento, indice) =>
            indice === 0 ? (
              <li key={recebimento.id} className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium">{recebimento.description}</p>
                  <p className="value-l text-inflow">
                    {formatarMoeda(recebimento.amount)}
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <Detalhes recebimento={recebimento} />
                  </div>
                </div>
                <Button
                  className="h-11 w-full px-5 sm:w-auto"
                  onClick={() => onDividir(recebimento)}
                  aria-label={`Dividir ${recebimento.description} de ${formatarMoeda(recebimento.amount)}`}
                >
                  <Scissors aria-hidden /> Dividir agora
                </Button>
              </li>
            ) : (
              <li key={recebimento.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{recebimento.description}</p>
                  <div className="text-xs text-muted-foreground">
                    <Detalhes recebimento={recebimento} />
                  </div>
                </div>
                <span className="value-m">{formatarMoeda(recebimento.amount)}</span>
                <Button
                  variant="outline"
                  className="h-10 rounded-md px-4"
                  onClick={() => onDividir(recebimento)}
                  aria-label={`Dividir ${recebimento.description} de ${formatarMoeda(recebimento.amount)}`}
                >
                  Dividir
                </Button>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  )
}
