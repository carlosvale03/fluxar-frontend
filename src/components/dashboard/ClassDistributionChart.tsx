"use client"

import { useRouter } from "next/navigation"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"
import { Layers } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartEmptyState } from "@/components/dashboard/ChartEmptyState"
import { cn } from "@/lib/utils"
import { deCentavos, formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { COR_SEM_CLASSE, VALOR_SEM_CLASSE } from "@/lib/classes"
import { ExpenseByClass } from "@/types/reports"

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
  // O Recharts precisa de número: a conversão é só para plotar
  const dadosDoGrafico = itens.map((item) => ({ ...item, valor: item.centavos / 100 }))

  // CLASSE-33: a lista filtrada pela classe e pelo mesmo período
  const abrirTransacoes = (item: ExpenseByClass) => {
    const params = new URLSearchParams()
    params.append("classId", item.class_id ?? VALOR_SEM_CLASSE)
    if (startDate) params.append("startDate", startDate)
    if (endDate) params.append("endDate", endDate)
    router.push(`/transacoes?${params.toString()}`)
  }

  return (
    <Card
      className={cn(
        "border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 transition-all rounded-[32px] overflow-hidden",
        className,
      )}
    >
      <CardHeader className="pb-0 pt-6">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-500" />
          Despesas por Classe
        </CardTitle>
        <CardDescription>Quanto das despesas foi para cada classe</CardDescription>
      </CardHeader>
      <CardContent className="h-auto min-h-[320px] flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 lg:p-6 gap-2 sm:gap-4 lg:gap-8">
        {isLoading ? (
          <Skeleton className="w-full h-[300px] rounded-2xl" />
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
          <>
            <div className="w-full h-[220px] sm:h-[250px] lg:h-[280px] relative sm:flex-1" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={dadosDoGrafico}
                    cx="50%"
                    cy="50%"
                    innerRadius="65%"
                    outerRadius="90%"
                    paddingAngle={4}
                    dataKey="valor"
                    nameKey="class_name"
                    stroke="none"
                  >
                    {itens.map((item, index) => (
                      <Cell
                        key={`classe-${index}`}
                        fill={item.cor}
                        className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                        style={{ filter: `drop-shadow(0 4px 6px ${item.cor}22)` }}
                        onClick={() => abrirTransacoes(item)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ zIndex: 100 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as (typeof dadosDoGrafico)[number]
                        return (
                          <div className="z-50 bg-background/95 backdrop-blur-2xl border border-border/50 p-3 rounded-2xl shadow-2xl ring-1 ring-black/5">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.cor }} />
                              <span className="text-sm font-black">{item.class_name}</span>
                            </div>
                            <p className="text-xs font-bold text-muted-foreground">
                              {formatarMoeda(item.amount)} · {porcentagemDaClasse(item.centavos, totalEmCentavos)}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0">
                <span className="block text-[8px] font-black uppercase tracking-tighter text-muted-foreground opacity-50">
                  Total
                </span>
                <span className="block text-xs sm:text-base lg:text-lg font-black">
                  {formatarMoeda(deCentavos(totalEmCentavos))}
                </span>
              </div>
            </div>
            <ul className="w-full sm:w-[170px] md:w-[160px] lg:w-[230px] xl:w-[250px] space-y-0.5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar mt-4 sm:mt-0 shrink-0">
              {itens.map((item) => (
                <li key={item.class_id ?? VALOR_SEM_CLASSE}>
                  <button
                    type="button"
                    onClick={() => abrirTransacoes(item)}
                    aria-label={`Ver as transações de ${item.class_name}`}
                    className="w-full flex items-center justify-between py-1 px-2 rounded-xl hover:bg-muted/30 transition-colors group text-left"
                  >
                    <span className="flex items-center gap-2 overflow-hidden">
                      <span
                        data-testid="cor-da-classe"
                        className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: item.cor }}
                      />
                      <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors truncate">
                        {item.class_name}
                      </span>
                    </span>
                    <span className="flex flex-col items-end shrink-0 ml-2">
                      <span className="text-[10px] sm:text-[11px] font-black">{formatarMoeda(item.amount)}</span>
                      <span className="text-[9px] font-bold text-muted-foreground">
                        {porcentagemDaClasse(item.centavos, totalEmCentavos)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
