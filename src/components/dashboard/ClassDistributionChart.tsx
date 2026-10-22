"use client"

import { useRouter } from "next/navigation"
import { Layers } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartEmptyState } from "@/components/dashboard/ChartEmptyState"
import { cn } from "@/lib/utils"
import { deCentavos, formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { COR_SEM_CLASSE, VALOR_SEM_CLASSE } from "@/lib/classes"
import { ExpenseByClass } from "@/types/reports"

import { RoscaDeDistribuicao } from "./rosca-de-distribuicao"

export const MENSAGEM_SEM_DESPESAS = "Nenhuma despesa no período."

// CLASSE-31: a porcentagem sobre o total, com uma casa, calculada em
// centavos inteiros (AD-041): "60,0%"
export function porcentagemDaClasse(centavos: number, totalEmCentavos: number): string {
  if (totalEmCentavos <= 0) return "0,0%"
  const decimos = Math.round((centavos * 1000) / totalEmCentavos)
  return `${Math.floor(decimos / 10)},${decimos % 10}%`
}

interface ClassDistributionChartProps {
  data: ExpenseByClass[]
  isLoading?: boolean
  // Período devolvido pelos gráficos simples, levado à lista (CLASSE-33)
  startDate?: string
  endDate?: string
  className?: string
}

export function ClassDistributionChart({ data, isLoading, startDate, endDate, className }: ClassDistributionChartProps) {
  const router = useRouter()

  // "Sem classe" sempre em cinza (CLASSE-31)
  const itens = data.map((item) => {
    const centavos = paraCentavos(item.amount)
    return {
      ...item,
      centavos,
      cor: item.class_id ? item.color || COR_SEM_CLASSE : COR_SEM_CLASSE,
    }
  })
  const totalEmCentavos = itens.reduce((soma, item) => soma + item.centavos, 0)
  const temDespesas = itens.some((item) => item.centavos > 0)

  // CLASSE-33: a lista filtrada pela classe e pelo mesmo período
  const abrirTransacoes = (item: ExpenseByClass) => {
    const params = new URLSearchParams()
    params.append("classId", item.class_id ?? VALOR_SEM_CLASSE)
    if (startDate) params.append("startDate", startDate)
    if (endDate) params.append("endDate", endDate)
    router.push(`/transacoes?${params.toString()}`)
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span>Despesas por Classe</span>
        </CardTitle>
        <CardDescription>Quanto das despesas foi para cada classe</CardDescription>
      </CardHeader>
      <CardContent className="flex h-auto min-h-[320px] flex-col items-center justify-between gap-2 p-4 sm:flex-row sm:gap-4 sm:p-5 lg:gap-8 lg:p-6">
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !temDespesas ? (
          // CLASSE-32
          <ChartEmptyState
            type="pie"
            height="300px"
            title="Despesas por classe"
            description={MENSAGEM_SEM_DESPESAS}
            icon={Layers}
          />
        ) : (
          <RoscaDeDistribuicao
            total={formatarMoeda(deCentavos(totalEmCentavos))}
            fatias={itens.map((item) => ({
              chave: item.class_id ?? VALOR_SEM_CLASSE,
              nome: item.class_name,
              valor: item.amount,
              centavos: item.centavos,
              cor: item.cor,
              extra: porcentagemDaClasse(item.centavos, totalEmCentavos),
              rotulo: `Ver as transações de ${item.class_name}`,
              testIdDaCor: "cor-da-classe",
              aoClicar: () => abrirTransacoes(item),
            }))}
          />
        )}
      </CardContent>
    </Card>
  )
}
