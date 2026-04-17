"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Target, 
  TrendingUp, 
  Wallet, 
  Calendar,
  History,
  PiggyBank,
  CheckCircle2,
  X,
  ArrowUpRight,
  ExternalLink,
  Zap,
  Clock,
  ChevronRight
} from "lucide-react"
import { format, differenceInDays, differenceInCalendarDays, addDays, isAfter, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts"

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Goal, GoalTransaction } from "@/types/goals"
import { goalsService } from "@/services/goals"
import { cn, getAbsoluteUrl } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/hooks/use-auth"
import { AlertCircle, RefreshCw } from "lucide-react"

interface GoalDetailsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal | null
  onOpenHistory: () => void
  onOpenDeposit: () => void
  onOpenSimulator: () => void
  onOpenWithdraw: () => void
}

export function GoalDetails({ 
  open, 
  onOpenChange, 
  goal, 
  onOpenHistory, 
  onOpenDeposit, 
  onOpenSimulator,
  onOpenWithdraw
}: GoalDetailsProps) {
  const [history, setHistory] = useState<GoalTransaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isChartReady, setIsChartReady] = useState(false)
  const [authError, setAuthError] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (open && goal && user) {
      fetchHistory()
      // Pequeno atraso para permitir que a animação do modal termine e o layout se estabilize
      const timer = setTimeout(() => {
        setIsChartReady(true)
      }, 500) // Aumentado para 500ms para garantir
      return () => {
        clearTimeout(timer)
        setIsChartReady(false)
      }
    }
  }, [open, goal, user])

  const fetchHistory = async () => {
    if (!goal || !user) return
    try {
      setIsLoading(true)
      setAuthError(false)
      const data = await goalsService.getHistory(goal.id)
      setHistory(data)
    } catch (error: any) {
      console.error("Failed to fetch history", error)
      if (error.response?.status === 401) {
        setAuthError(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const chartData = useMemo(() => {
    if (!goal || !goal.created_at) return []

    // 1. Definir Intervalo: Desde a criação ou primeira transação até hoje
    const historyDates = history.map(tx => new Date(tx.datetime).getTime())
    const firstTxDate = historyDates.length > 0 ? new Date(Math.min(...historyDates)) : new Date()
    const goalCreationDate = new Date(goal.created_at)
    
    // Começamos do que for mais antigo (normalmente a criação, mas por segurança...)
    const startDate = new Date(Math.min(goalCreationDate.getTime(), firstTxDate.getTime()))
    const today = new Date()
    
    // Usar calendar days para evitar problemas com horas/fuso horários
    const diffDays = Math.max(0, differenceInCalendarDays(today, startDate))
    
    // 2. Agrupar transações por data (YYYY-MM-DD) coercindo para Number
    const txByDate: Record<string, number> = {}
    history.forEach(tx => {
      const dateStr = format(new Date(tx.datetime), 'yyyy-MM-dd')
      const amount = Number(tx.amount) * (tx.type === 'WITHDRAWAL' ? -1 : 1)
      txByDate[dateStr] = (txByDate[dateStr] || 0) + amount
    })

    // 3. Gerar pontos diários preenchendo as lacunas
    const points = []
    let currentAccumulatedBalance = 0

    for (let i = 0; i <= diffDays; i++) {
        const currentDate = addDays(startDate, i)
        const dateStr = format(currentDate, 'yyyy-MM-dd')
        
        // Acumular transações do dia
        if (txByDate[dateStr]) {
            currentAccumulatedBalance += txByDate[dateStr]
        }

        points.push({
            date: format(currentDate, 'dd/MM'),
            fullDate: currentDate,
            balance: Number(Math.max(0, currentAccumulatedBalance).toFixed(2)),
        })
    }

    // Filtro de densidade inteligente (máximo ~60 pontos para clareza)
    if (points.length > 60) {
        const step = Math.ceil(points.length / 60)
        return points.filter((_, idx) => idx % step === 0 || idx === points.length - 1)
    }

    return points
  }, [goal, history])

  const insights = useMemo(() => {
    if (!goal) return null

    const today = new Date()
    const createdAt = new Date(goal.created_at)
    const daysSinceStart = Math.max(1, differenceInDays(today, createdAt))
    
    // Média de economia diária real
    const dailyAvg = goal.current_amount / daysSinceStart
    const monthlyAvg = dailyAvg * 30

    // Projeção real de data de término
    const remaining = goal.target_amount - goal.current_amount
    let estimatedEndDate = null
    let status = 'neutral' // 'positive' | 'negative' | 'neutral'

    if (dailyAvg > 0) {
      const daysToFinish = Math.ceil(remaining / dailyAvg)
      estimatedEndDate = addDays(today, daysToFinish)
      
      if (goal.target_date) {
        const targetDate = new Date(goal.target_date)
        status = isAfter(targetDate, estimatedEndDate) ? 'positive' : 'negative'
      }
    }

    return {
      monthlyAvg,
      estimatedEndDate,
      status,
      daysSinceStart
    }
  }, [goal])

  if (!goal) return null

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background/80 backdrop-blur-3xl border-border/40 rounded-[32px] md:rounded-[40px] shadow-2xl">
        <ScrollArea className="max-h-[90vh]">
          <div className="flex flex-col md:flex-row h-full">
            {/* Lado Esquerdo: Imagem/Visual */}
            <div className="relative w-full md:w-[40%] h-64 md:h-auto min-h-[300px] bg-muted/20 overflow-hidden">
              {goal.image ? (
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] hover:scale-110"
                  style={{ backgroundImage: `url(${getAbsoluteUrl(goal.image)})` }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-background flex items-center justify-center">
                  <Target className="h-24 w-24 text-primary/20 animate-pulse" />
                </div>
              )}
              
              {/* Overlay Glassmorphic */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
                <Badge className="w-fit mb-4 bg-primary/20 backdrop-blur-md text-primary-foreground border-white/10 font-black uppercase tracking-widest text-[10px]">
                  {goal.status === 'COMPLETED' ? 'Finalizada' : 'Em Andamento'}
                </Badge>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2 drop-shadow-lg">
                  {goal.name}
                </h2>
                <p className="text-white/70 text-sm font-medium line-clamp-2 pr-4 italic">
                  "{goal.description || 'Nenhuma descrição adicionada.'}"
                </p>
              </div>
            </div>

            {/* Lado Direito: Conteúdo */}
            <div className="flex-1 p-6 md:p-10 space-y-8">
              <DialogHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Criada em {format(new Date(goal.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </p>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                    Panorama Geral
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Visão detalhada e evolução da meta {goal.name}
                  </DialogDescription>
                </div>
              </DialogHeader>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-[28px] bg-primary/5 border border-primary/10 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Objetivo</p>
                  <p className="text-2xl font-black text-primary">{formatCurrency(goal.target_amount)}</p>
                </div>
                <div className="p-5 rounded-[28px] bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60">Já Guardado</p>
                  <p className="text-2xl font-black text-emerald-600">{formatCurrency(goal.current_amount)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Progresso</p>
                    <p className="text-sm font-bold">{Math.round(goal.progress_percentage)}% Concluído</p>
                  </div>
                  <p className="text-sm font-black text-primary">Faltam {formatCurrency(goal.amount_remaining)}</p>
                </div>
                <Progress value={goal.progress_percentage} className="h-4 rounded-full bg-muted/50 shadow-inner" />
              </div>

              {/* Gráfico de Evolução */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Evolução do Saldo</h4>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[9px] font-bold border-emerald-500/20 text-emerald-600 bg-emerald-500/5 rounded-full">
                      Real
                    </Badge>
                  </div>
                </div>
                <div className="h-[200px] w-full bg-muted/10 rounded-[32px] p-4 border border-border/20 min-h-[200px] flex items-center justify-center">
                  {(open && isChartReady) ? (
                    history.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00A8E8" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#00A8E8" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="strokeGradientDetails" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#00A8E8" />
                              <stop offset="100%" stopColor="#2DD4BF" />
                            </linearGradient>
                            <filter id="shadowDetails" height="200%">
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
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 9, fontWeight: 700, fill: '#64748B', opacity: 0.5}} 
                            dy={10}
                            interval="preserveStartEnd"
                          />
                          <YAxis hide />
                          <Tooltip 
                            cursor={{ stroke: '#00A8E8', strokeWidth: 1, strokeDasharray: '4 4' }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background/90 backdrop-blur-md border border-border/40 p-3 rounded-2xl shadow-xl min-w-[120px]">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">{label}</p>
                                    <div className="flex items-center gap-4">
                                      <span className="text-[11px] font-black text-primary">{formatCurrency(payload[0].value as number)}</span>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="balance" 
                            stroke="url(#strokeGradientDetails)" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorBalance)" 
                            animationDuration={1500}
                            style={{ filter: 'url(#shadowDetails)' }}
                          />
                          {/* Linha "Ideal" se houver data alvo */}
                          {goal.target_date && (
                            <ReferenceLine 
                              y={goal.target_amount} 
                              stroke="#94A3B8" 
                              strokeDasharray="5 5"
                              opacity={0.3}
                              label={{ position: 'top', value: 'Alvo', fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} 
                            />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center gap-2 opacity-40">
                        <History className="h-8 w-8" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-center">
                          {authError ? "Erro de Autenticação" : "Sem histórico suficiente para o gráfico"}
                        </span>
                        {authError && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[9px] font-black uppercase tracking-tighter"
                            onClick={fetchHistory}
                          >
                            <RefreshCw className="mr-1 h-3 w-3" /> Tentar Novamente
                          </Button>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <TrendingUp className="h-8 w-8 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Calculando Evolução...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-[28px] border border-border/40 bg-card/40 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Zap className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none mt-0.5">Velocidade</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Economia Média</p>
                    <p className="text-lg font-black">{formatCurrency(insights?.monthlyAvg || 0)}/mês</p>
                  </div>
                </div>

                <div className={cn(
                  "p-5 rounded-[28px] border space-y-3 transition-colors",
                  insights?.status === 'positive' ? "bg-emerald-500/5 border-emerald-500/20" : 
                  insights?.status === 'negative' ? "bg-orange-500/5 border-orange-500/20" : 
                  "bg-card/40 border-border/40"
                )}>
                  <div className={cn(
                    "flex items-center gap-2",
                    insights?.status === 'positive' ? "text-emerald-600" : 
                    insights?.status === 'negative' ? "text-orange-600" : "text-muted-foreground"
                  )}>
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none mt-0.5">Previsão Real</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Término Estimado</p>
                    <p className="text-lg font-black uppercase tracking-tight">
                      {insights?.estimatedEndDate ? format(insights.estimatedEndDate, "MMM 'de' yyyy", { locale: ptBR }) : 'Calculando...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-border/40 flex flex-wrap gap-3">
                <Button 
                  className="rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 px-6 flex-1 shadow-lg shadow-primary/20"
                  onClick={onOpenDeposit}
                  disabled={goal.status === 'COMPLETED'}
                >
                  <PiggyBank className="mr-2 h-4 w-4" /> Guardar
                </Button>
                <Button 
                  variant="outline"
                  className="rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 px-6 flex-1 text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-500/20 dark:hover:bg-orange-500/5 transition-all"
                  onClick={onOpenWithdraw}
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> Resgatar
                </Button>
                <Button 
                  variant="outline"
                  className="rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 px-6"
                  onClick={onOpenHistory}
                >
                  <History className="mr-2 h-4 w-4" /> Histórico
                </Button>
                <Button 
                  variant="ghost" 
                  className="rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 w-12"
                  onClick={onOpenSimulator}
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
