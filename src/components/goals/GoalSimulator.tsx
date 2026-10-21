"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Info } from "lucide-react"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { Goal } from "@/types/goals"
import { formatCurrency } from "@/lib/utils"
import { paraCentavos } from "@/lib/dinheiro"
import { COR_DO_PREVISTO, COR_DO_REAL, CURSOR_DO_TOOLTIP, PROPS_DA_GRADE, PROPS_DO_EIXO } from "@/lib/graficos"
import { addMonths, format, differenceInDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"

interface GoalSimulatorProps {
  goal: Goal | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GoalSimulator({ goal, open, onOpenChange }: GoalSimulatorProps) {
  const [extraMonthly, setExtraMonthly] = useState(0)
  const [initialLumpSum, setInitialLumpSum] = useState(0)
  const [isChartReady, setIsChartReady] = useState(false)

  // Calcular métricas de base
  const baseMetrics = useMemo(() => {
    if (!goal) return { dailyAvg: 0, monthlyAvg: 0 }
    const today = new Date()
    const createdAt = new Date(goal.created_at)
    const daysSinceStart = Math.max(1, differenceInDays(today, createdAt))
    const dailyAvg = paraCentavos(goal.current_amount) / 100 / daysSinceStart
    return {
      dailyAvg,
      monthlyAvg: dailyAvg * 30 || 1 // Fallback para 1 para evitar divisão por zero se for nova
    }
  }, [goal])

  // Simulação
  const simulation = useMemo(() => {
    if (!goal) return null

    const today = new Date()
    const remainingAmount = (paraCentavos(goal.target_amount) / 100) - (paraCentavos(goal.current_amount) / 100)
    
    // Caminho Atual
    const currentMonthlyRate = baseMetrics.monthlyAvg
    const currentMonthsRemaining = Math.ceil(remainingAmount / Math.max(1, currentMonthlyRate))
    const currentTargetDate = addMonths(today, currentMonthsRemaining)

    // Caminho Simulado
    const simulatedMonthlyRate = currentMonthlyRate + extraMonthly
    const simulatedAmountAfterLumpSum = remainingAmount - initialLumpSum
    const simulatedMonthsRemaining = Math.ceil(Math.max(0, simulatedAmountAfterLumpSum / Math.max(1, simulatedMonthlyRate)))
    const simulatedTargetDate = addMonths(today, simulatedMonthsRemaining)

    const monthsSaved = Math.max(0, currentMonthsRemaining - simulatedMonthsRemaining)
    const progressIncrease = (initialLumpSum / (paraCentavos(goal.target_amount) / 100)) * 100

    return {
      currentMonthsRemaining,
      currentTargetDate,
      simulatedMonthsRemaining,
      simulatedTargetDate,
      monthsSaved,
      progressIncrease,
      remainingAmount
    }
  }, [goal, extraMonthly, initialLumpSum, baseMetrics])

  // Dados para o Gráfico de Comparação
  const chartData = useMemo(() => {
    if (!goal || !simulation) return []

    const data = []
    const totalSteps = Math.max(simulation.currentMonthsRemaining, simulation.simulatedMonthsRemaining, 12)
    const stepSize = Math.max(1, Math.ceil(totalSteps / 12)) // Mostrar ~12 pontos (um por mês em geral)

    for (let i = 0; i <= totalSteps; i += stepSize) {
      const date = addMonths(new Date(), i)
      
      // Cálculo atual
      const currentVal = Math.min(
        (paraCentavos(goal.target_amount) / 100),
        (paraCentavos(goal.current_amount) / 100) + (baseMetrics.monthlyAvg * i)
      )

      // Cálculo simulado
      const simulatedVal = Math.min(
        (paraCentavos(goal.target_amount) / 100),
        (paraCentavos(goal.current_amount) / 100) + initialLumpSum + ((baseMetrics.monthlyAvg + extraMonthly) * i)
      )

      data.push({
        name: format(date, 'MMM yy', { locale: ptBR }),
        atual: Math.round(currentVal),
        simulado: Math.round(simulatedVal)
      })
    }

    return data
  }, [goal, simulation, baseMetrics, extraMonthly, initialLumpSum])

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsChartReady(true), 400)
      return () => {
        clearTimeout(timer)
        setIsChartReady(false)
      }
    }
  }, [open])

  if (!goal) return null

  const alvo = paraCentavos(goal.target_amount) / 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="flex h-full flex-col md:flex-row">
            {/* Ajustes */}
            <div className="w-full space-y-8 border-b border-border p-6 md:w-[45%] md:border-b-0 md:border-r">
              <DialogHeader className="space-y-1 pr-8">
                <p className="label text-muted-foreground">Simulador</p>
                <DialogTitle>Projeção de Trajetória</DialogTitle>
                <DialogDescription>
                  Veja quando a meta <span className="font-medium text-foreground">{goal.name}</span> é alcançada com aportes extras.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-8">
                {/* Esforço mensal extra */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Esforço mensal extra</p>
                      <p className="text-xs text-muted-foreground">Guardar um pouco mais por mês</p>
                    </div>
                    <span className="value-m text-gold-line">+{formatCurrency(extraMonthly)}</span>
                  </div>
                  <Slider
                    value={[extraMonthly]}
                    onValueChange={(vals) => setExtraMonthly(vals[0])}
                    max={alvo * 0.5}
                    step={Math.max(1, Math.round(alvo * 0.01))}
                    className="py-3"
                  />
                  <div className="value-m flex justify-between text-xs text-muted-foreground">
                    <span>R$ 0</span>
                    <span>Máx. {formatCurrency(alvo * 0.5)}</span>
                  </div>
                </div>

                {/* Aporte único */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Aporte inicial extra</p>
                      <p className="text-xs text-muted-foreground">Usar um dinheiro que sobrou</p>
                    </div>
                    <span className="value-m text-gold-line">+{formatCurrency(initialLumpSum)}</span>
                  </div>
                  <Slider
                    value={[initialLumpSum]}
                    onValueChange={(vals) => setInitialLumpSum(vals[0])}
                    max={alvo}
                    step={Math.max(1, Math.round(alvo * 0.02))}
                    className="py-3"
                  />
                  <div className="value-m flex justify-between text-xs text-muted-foreground">
                    <span>R$ 0</span>
                    <span>Máx. {formatCurrency(alvo)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-md border border-border bg-elevated p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-fg-secondary">
                  O cálculo usa o seu ritmo médio de <span className="value-m text-foreground">{formatCurrency(baseMetrics.monthlyAvg)}/mês</span>.
                  Rendimentos de investimento não entram nesta simulação.
                </p>
              </div>
            </div>

            {/* Impacto */}
            <div className="flex-1 space-y-6 p-6">
              <h3 className="display-s">Impacto</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 rounded-md border border-border p-4">
                  <p className="label text-muted-foreground">Tempo economizado</p>
                  <p className="value-l">
                    {simulation?.monthsSaved} <span className="text-sm text-muted-foreground">meses</span>
                  </p>
                </div>
                <div className="space-y-1 rounded-md border border-border p-4">
                  <p className="label text-muted-foreground">Nova previsão</p>
                  <p className="value-l">
                    {simulation ? format(simulation.simulatedTargetDate, "MMM yy", { locale: ptBR }) : '—'}
                  </p>
                </div>
              </div>

              <section className="space-y-3" aria-labelledby="projecao-da-meta">
                <div className="flex items-center justify-between gap-3">
                  <h4 id="projecao-da-meta" className="text-sm font-medium">
                    Projeção <span className="text-muted-foreground">· por mês</span>
                  </h4>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="h-0 w-4 border-t-2 border-dashed border-fg-muted" /> Atual
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-gold-line" /> Simulado
                    </span>
                  </div>
                </div>

                <div
                  className="h-[250px] w-full rounded-lg border border-border p-4"
                  role="img"
                  aria-label={
                    simulation
                      ? `Projeção: no ritmo atual, a meta chega em ${format(simulation.currentTargetDate, "MMMM 'de' yyyy", { locale: ptBR })}; com os ajustes, em ${format(simulation.simulatedTargetDate, "MMMM 'de' yyyy", { locale: ptBR })}`
                      : "Projeção da meta"
                  }
                >
                  {(open && isChartReady) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid {...PROPS_DA_GRADE} />
                        <XAxis dataKey="name" {...PROPS_DO_EIXO} dy={8} interval="preserveStartEnd" />
                        <YAxis hide domain={[0, alvo]} />
                        <Tooltip
                          cursor={CURSOR_DO_TOOLTIP}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="min-w-[140px] space-y-1 rounded-md border border-border-strong bg-elevated p-3">
                                  <p className="label text-muted-foreground">{label}</p>
                                  <div className="flex items-center justify-between gap-4 text-xs">
                                    <span className="text-muted-foreground">Atual</span>
                                    <span className="value-m">{formatCurrency(payload[0].value as number)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 text-xs">
                                    <span className="text-gold-line">Simulado</span>
                                    <span className="value-m">{formatCurrency(payload[1].value as number)}</span>
                                  </div>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <ReferenceLine
                          y={alvo}
                          stroke={COR_DO_PREVISTO}
                          strokeDasharray="5 5"
                          label={{ position: 'top', value: 'Alvo', fontSize: 12, fill: COR_DO_PREVISTO }}
                        />
                        <Area
                          type="monotone"
                          dataKey="atual"
                          stroke={COR_DO_PREVISTO}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          fill="none"
                          animationDuration={400}
                        />
                        <Area
                          type="monotone"
                          dataKey="simulado"
                          stroke={COR_DO_REAL}
                          strokeWidth={2.5}
                          fill={COR_DO_REAL}
                          fillOpacity={0.08}
                          animationDuration={400}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full animate-pulse rounded-md bg-elevated" aria-busy="true" />
                  )}
                </div>
              </section>

              <div className="space-y-4 border-t border-border pt-4">
                <p className="text-sm text-fg-secondary">
                  Com esses ajustes, a meta é alcançada <span className="value-m text-foreground">{simulation?.monthsSaved} meses</span> antes.
                </p>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
