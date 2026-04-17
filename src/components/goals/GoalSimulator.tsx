"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { 
  TrendingUp, 
  Rocket, 
  Target, 
  X, 
  Zap, 
  Calendar as CalendarIcon,
  ArrowRight,
  Sparkles,
  Info
} from "lucide-react"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from "recharts"
import { Goal } from "@/types/goals"
import { cn, formatCurrency } from "@/lib/utils"
import { differenceInMonths, addMonths, format, differenceInDays } from "date-fns"
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
    const dailyAvg = goal.current_amount / daysSinceStart
    return {
      dailyAvg,
      monthlyAvg: dailyAvg * 30 || 1 // Fallback para 1 para evitar divisão por zero se for nova
    }
  }, [goal])

  // Simulação
  const simulation = useMemo(() => {
    if (!goal) return null

    const today = new Date()
    const remainingAmount = Number(goal.target_amount) - Number(goal.current_amount)
    
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
    const progressIncrease = (initialLumpSum / Number(goal.target_amount)) * 100

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
        Number(goal.target_amount),
        Number(goal.current_amount) + (baseMetrics.monthlyAvg * i)
      )

      // Cálculo simulado
      const simulatedVal = Math.min(
        Number(goal.target_amount),
        Number(goal.current_amount) + initialLumpSum + ((baseMetrics.monthlyAvg + extraMonthly) * i)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background/95 backdrop-blur-3xl border-border/40 rounded-[32px] md:rounded-[40px] shadow-2xl">
        <ScrollArea className="max-h-[90vh]">
          <div className="flex flex-col md:flex-row h-full">
            
            {/* Lado Esquerdo: Ajustes e Sliders */}
            <div className="w-full md:w-[45%] p-6 md:p-10 border-b md:border-b-0 md:border-r border-border/20 space-y-10">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest text-[10px]">
                    Simulador Turbo
                  </Badge>
                </div>
                <DialogTitle className="text-3xl font-black uppercase tracking-tight">
                  Acelere seus <span className="text-primary italic">Sonhos</span>
                </DialogTitle>
                <DialogDescription className="text-sm font-medium opacity-60">
                  Descubra como pequenos ajustes mudam tudo.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-12">
                {/* Slider 1: Mensal Extra */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Esforço Mensal Extra</label>
                      <p className="text-xs font-medium text-muted-foreground/60 italic">"Economizar um pouco mais por mês"</p>
                    </div>
                    <div className="bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20">
                      <span className="text-sm font-black text-primary">+{formatCurrency(extraMonthly)}</span>
                    </div>
                  </div>
                  <Slider
                    value={[extraMonthly]}
                    onValueChange={(vals) => setExtraMonthly(vals[0])}
                    max={Number(goal.target_amount) * 0.5}
                    step={Math.max(1, Math.round(Number(goal.target_amount) * 0.01))}
                    className="py-4"
                  />
                  <div className="flex justify-between px-1 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    <span>R$ 0</span>
                    <span>Modo Foguete</span>
                    <span>Max {formatCurrency(Number(goal.target_amount) * 0.5)}</span>
                  </div>
                </div>

                {/* Slider 2: Aporte Único */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Aporte Inicial Extra</label>
                      <p className="text-xs font-medium text-muted-foreground/60 italic">"Aproveitar um dinheiro que sobrou"</p>
                    </div>
                    <div className="bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20">
                      <span className="text-sm font-black text-emerald-600">+{formatCurrency(initialLumpSum)}</span>
                    </div>
                  </div>
                  <Slider
                    value={[initialLumpSum]}
                    onValueChange={(vals) => setInitialLumpSum(vals[0])}
                    max={Number(goal.target_amount)}
                    step={Math.max(1, Math.round(Number(goal.target_amount) * 0.02))}
                    className="py-4"
                  />
                  <div className="flex justify-between px-1 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    <span>R$ 0</span>
                    <span>Salto no Progresso</span>
                    <span>Max {formatCurrency(Number(goal.target_amount))}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                 <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-start gap-3">
                    <Info className="h-4 w-4 text-primary mt-0.5" />
                    <p className="text-[10px] font-medium leading-relaxed opacity-60">
                      Baseamos os cálculos na sua velocidade média histórica de <strong>{formatCurrency(baseMetrics.monthlyAvg)}/mês</strong>. 
                      Os lucros sobre investimentos não estão inclusos nesta simulação simples.
                    </p>
                 </div>
              </div>
            </div>

            {/* Lado Direito: Dashboard de Impacto */}
            <div className="flex-1 p-6 md:p-10 bg-primary/[0.02] space-y-8">
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-black uppercase tracking-tight">O Impacto</h3>
              </div>

              {/* Impact Badges */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-[28px] bg-emerald-500/10 border border-emerald-500/20 space-y-1 relative overflow-hidden group">
                  <Rocket className="absolute -right-2 -top-2 h-12 w-12 text-emerald-500/10 group-hover:rotate-12 transition-transform" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60">Tempo Economizado</p>
                  <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                    {simulation?.monthsSaved} <span className="text-sm uppercase tracking-normal">meses</span>
                  </p>
                </div>
                <div className="p-5 rounded-[28px] bg-primary/10 border border-primary/20 space-y-1 relative overflow-hidden group">
                  <Target className="absolute -right-2 -top-2 h-12 w-12 text-primary/10 group-hover:scale-110 transition-transform" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Nova Previsão</p>
                  <p className="text-xl font-black text-primary uppercase tracking-tighter pt-1">
                    {simulation ? format(simulation.simulatedTargetDate, "MMM yy", { locale: ptBR }) : '---'}
                  </p>
                </div>
              </div>

              {/* Comparação Gráfica */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">Projeção de Evolução</h4>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 shadow-sm">
                       <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                       <span className="text-[9px] font-bold uppercase tracking-tighter opacity-60">Atual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <div className="w-2 h-2 rounded-full bg-primary" />
                       <span className="text-[9px] font-bold uppercase tracking-tighter">Simulado</span>
                    </div>
                  </div>
                </div>

                <div className="h-[250px] w-full bg-card/40 rounded-[32px] p-6 border border-border/40 relative">
                  {(open && isChartReady) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="simulatedGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00A8E8" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#00A8E8" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#00A8E8" />
                            <stop offset="100%" stopColor="#2DD4BF" />
                          </linearGradient>
                          <filter id="shadow" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                            <feOffset in="blur" dx="0" dy="4" result="offsetBlur" />
                            <feFlood floodColor="#00A8E8" floodOpacity="0.3" result="offsetColor" />
                            <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur" />
                            <feMerge>
                              <feMergeNode />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CBD5E1" opacity={0.1} />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fontSize: 9, fontWeight: 700, fill: '#64748B', opacity: 0.5}} 
                          dy={10}
                          interval="preserveStartEnd"
                        />
                        <YAxis hide domain={[0, goal.target_amount]} />
                        <Tooltip 
                          cursor={{ stroke: '#00A8E8', strokeWidth: 1, strokeDasharray: '4 4' }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-background/90 backdrop-blur-md border border-border/40 p-3 rounded-2xl shadow-xl space-y-2 min-w-[120px]">
                                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{label}</p>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">Atual</span>
                                      <span className="text-[11px] font-black text-muted-foreground/80">{formatCurrency(payload[0].value as number)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-[9px] font-black text-primary uppercase">Simulado</span>
                                      <span className="text-[11px] font-black text-primary">{formatCurrency(payload[1].value as number)}</span>
                                    </div>
                                  </div>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <ReferenceLine 
                          y={goal.target_amount} 
                          stroke="#00A8E8" 
                          strokeDasharray="5 5" 
                          opacity={0.15}
                          label={{ position: 'top', value: 'ALVO', fontSize: 9, fontWeight: 900, opacity: 0.3, fill: '#00A8E8' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="atual" 
                          stroke="#94A3B8" 
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          fill="none"
                          animationDuration={1000}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="simulado" 
                          stroke="url(#strokeGradient)" 
                          strokeWidth={3}
                          fill="url(#simulatedGradient)" 
                          animationDuration={1500}
                          style={{ filter: 'url(#shadow)' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 opacity-20">
                      <Sparkles className="h-10 w-10 animate-spin-slow text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-center">Cruzando dados...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Call to Action */}
              <div className="p-6 rounded-[28px] bg-primary text-primary-foreground space-y-4 shadow-xl shadow-primary/20 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform active:scale-100">
                <Zap className="absolute -right-4 -bottom-4 h-24 w-24 text-white/10" />
                <div className="space-y-1 relative z-10">
                  <h4 className="text-lg font-black uppercase tracking-tighter leading-none">Você está pronto!</h4>
                  <p className="text-[11px] font-medium opacity-80 max-w-[80%] leading-relaxed">
                    Com esses ajustes, você alcança sua meta <strong>{simulation?.monthsSaved} meses</strong> antes. 
                    Deseja transformar essa simulação em sua meta real?
                  </p>
                </div>
                <Button 
                  className="w-full bg-white text-primary hover:bg-white/90 rounded-2xl font-black uppercase tracking-widest text-[10px] h-11 relative z-10"
                  onClick={() => onOpenChange(false)}
                >
                  Confirmar Novo Plano <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function Badge({ children, className, variant = "default" }: any) {
  return (
    <div className={cn(
      "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
      variant === "outline" ? "border" : "bg-primary text-primary-foreground",
      className
    )}>
      {children}
    </div>
  )
}
