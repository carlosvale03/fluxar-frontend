"use client"

import { useState, useEffect, useMemo } from "react"
import { TrendingUp, History, PiggyBank, ExternalLink, Zap, Clock, AlertTriangle, RefreshCw } from "lucide-react"
import { format, differenceInDays, differenceInCalendarDays, addDays, isAfter } from "date-fns"
import { lerData } from "@/lib/datas"
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
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AnelDeProgresso } from "@/components/ui/medicao"
import { Goal, GoalTransaction } from "@/types/goals"
import { goalsService } from "@/services/goals"
import { cn, getAbsoluteUrl } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/hooks/use-auth"
import { formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { COR_DO_PREVISTO, COR_DO_REAL, CURSOR_DO_TOOLTIP, PROPS_DA_GRADE, PROPS_DO_EIXO } from "@/lib/graficos"
import { tratarErro } from "@/lib/erros"

interface GoalDetailsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal | null
  onOpenHistory: () => void
  onOpenDeposit: () => void
  onOpenSimulator: () => void
  onOpenWithdraw: () => void
  // META-11: depois de o usuário confirmar o aviso da correção
  onCorrectionDismissed?: () => void
}

export function GoalDetails({ 
  open, 
  onOpenChange, 
  goal, 
  onOpenHistory, 
  onOpenDeposit, 
  onOpenSimulator,
  onOpenWithdraw,
  onCorrectionDismissed
}: GoalDetailsProps) {
  const [history, setHistory] = useState<GoalTransaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isChartReady, setIsChartReady] = useState(false)
  const [authError, setAuthError] = useState(false)
  // META-11: o aviso da correção some depois do "Entendi"
  const [correcaoVista, setCorrecaoVista] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    setCorrecaoVista(false)
  }, [goal?.id])

  const confirmarCorrecao = async () => {
    if (!goal) return
    try {
      await goalsService.dismissCorrection(goal.id)
      setCorrecaoVista(true)
      onCorrectionDismissed?.()
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível confirmar o aviso da correção. Tente de novo." })
    }
  }

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
      // O gráfico usa a maior página do histórico (CONTRATO-03)
      const data = await goalsService.getHistory(goal.id, 1, 100)
      setHistory(data.results)
    } catch (error) {
      if ((error as { response?: { status?: number } }).response?.status === 401) {
        setAuthError(true)
      } else {
        // CONTRATO-33: nenhuma falha silenciosa
        tratarErro(error, { mensagemPadrao: "Não foi possível carregar o histórico. Tente de novo.", tentarDeNovo: fetchHistory })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const chartData = useMemo(() => {
    if (!goal || !goal.created_at) return []

    // 1. Definir Intervalo: Desde a criação ou primeira transação até hoje
    // CONTRATO-24: a data do aporte não tem hora; lida no dia gravado
    const historyDates = history.map(tx => lerData(tx.date).getTime())
    const firstTxDate = historyDates.length > 0 ? new Date(Math.min(...historyDates)) : new Date()
    const goalCreationDate = new Date(goal.created_at)
    
    // Começamos do que for mais antigo (normalmente a criação, mas por segurança...)
    const startDate = new Date(Math.min(goalCreationDate.getTime(), firstTxDate.getTime()))
    const today = new Date()
    
    // Usar calendar days para evitar problemas com horas/fuso horários
    const diffDays = Math.max(0, differenceInCalendarDays(today, startDate))
    
    // 2. Agrupar transações por data (YYYY-MM-DD), em centavos (CONTRATO-16:
    // os valores chegam como texto)
    const txByDate: Record<string, number> = {}
    history.forEach(tx => {
      const dateStr = format(lerData(tx.date), 'yyyy-MM-dd')
      const amount = paraCentavos(tx.amount) * (tx.type === 'WITHDRAWAL' ? -1 : 1)
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
            // O Recharts precisa de número: a conversão é só para plotar
            balance: Math.max(0, currentAccumulatedBalance) / 100,
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
    const dailyAvg = paraCentavos(goal.current_amount) / 100 / daysSinceStart
    const monthlyAvg = dailyAvg * 30

    // Projeção real de data de término
    const remaining = (paraCentavos(goal.target_amount) - paraCentavos(goal.current_amount)) / 100
    let estimatedEndDate = null
    let status = 'neutral' // 'positive' | 'negative' | 'neutral'

    if (dailyAvg > 0) {
      const daysToFinish = Math.ceil(remaining / dailyAvg)
      estimatedEndDate = addDays(today, daysToFinish)
      
      if (goal.target_date) {
        const targetDate = lerData(goal.target_date)
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

  const concluida = goal.status === 'COMPLETED'
  const percentual = goal.progress_percentage || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        <ScrollArea className="max-h-[90vh]">
          {goal.image && (
            <div
              aria-hidden="true"
              className="h-32 w-full border-b border-border bg-cover bg-center"
              style={{ backgroundImage: `url(${getAbsoluteUrl(goal.image)})` }}
            />
          )}

          <div className="space-y-6 p-6">
            <DialogHeader className="space-y-2 pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={concluida ? "success" : "destino"}>{concluida ? 'Alcançado' : 'Em andamento'}</Badge>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Criado em {format(new Date(goal.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                </span>
              </div>
              <DialogTitle>{goal.name}</DialogTitle>
              <DialogDescription>{goal.description || 'Sem descrição.'}</DialogDescription>
            </DialogHeader>

            {goal.correction && !correcaoVista && (
              <Alert variant="warning" role="status" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  <p>{`O valor deste destino foi corrigido de ${formatarMoeda(goal.correction.before)} para ${formatarMoeda(goal.correction.after)}.`}</p>
                </AlertDescription>
                <Button size="sm" variant="outline" className="shrink-0" onClick={confirmarCorrecao}>
                  Entendi
                </Button>
              </Alert>
            )}

            {/* Posição do destino: anel, percentual e valores */}
            <div className="grid gap-4 sm:grid-cols-[auto_1fr_1fr] sm:items-center">
              <div className="flex items-center gap-4">
                <AnelDeProgresso percentual={percentual} nome={goal.name} tamanho={64} />
                <div>
                  <p className={cn("value-l", concluida && "text-inflow")}>{formatarPercentual(Math.min(percentual, 100))}</p>
                  <p className="text-sm text-muted-foreground">Faltam {formatarMoeda(goal.amount_remaining)}</p>
                </div>
              </div>
              <div className="rounded-md border border-border p-4">
                <p className="label text-muted-foreground">Objetivo</p>
                <p className="value-l mt-1">{formatarMoeda(goal.target_amount)}</p>
              </div>
              <div className="rounded-md border border-border p-4">
                <p className="label text-muted-foreground">Já guardado</p>
                <p className="value-l mt-1">{formatarMoeda(goal.current_amount)}</p>
              </div>
            </div>

            {/* Evolução do saldo */}
            <section className="space-y-3" aria-labelledby="evolucao-da-meta">
              <div className="flex items-center justify-between">
                <h3 id="evolucao-da-meta" className="display-s">Evolução do saldo <span className="text-sm font-normal text-muted-foreground">· por dia</span></h3>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-gold-line" /> Real
                </span>
              </div>
              <div
                className="flex h-[220px] min-h-[220px] w-full items-center justify-center rounded-lg border border-border p-4"
                role="img"
                aria-label={`Evolução do saldo do destino ${goal.name}: ${formatarMoeda(goal.current_amount)} de ${formatarMoeda(goal.target_amount)}`}
              >
                {(open && isChartReady) ? (
                  history.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid {...PROPS_DA_GRADE} />
                        <XAxis dataKey="date" {...PROPS_DO_EIXO} dy={8} interval="preserveStartEnd" />
                        <YAxis hide />
                        <Tooltip
                          cursor={CURSOR_DO_TOOLTIP}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="min-w-[120px] rounded-md border border-border-strong bg-elevated p-3">
                                  <p className="label mb-1 text-muted-foreground">{label}</p>
                                  <p className="value-m">{formatarMoeda(payload[0].value as number)}</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="balance"
                          stroke={COR_DO_REAL}
                          strokeWidth={2.5}
                          fill={COR_DO_REAL}
                          fillOpacity={0.08}
                          animationDuration={400}
                        />
                        {/* Linha do alvo se houver data alvo */}
                        {goal.target_date && (
                          <ReferenceLine
                            y={goal.target_amount}
                            stroke={COR_DO_PREVISTO}
                            strokeDasharray="5 5"
                            label={{ position: 'top', value: 'Alvo', fontSize: 12, fill: COR_DO_PREVISTO }}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                      <History className="h-5 w-5" aria-hidden="true" />
                      <span className="text-sm">
                        {authError ? "Não foi possível carregar o histórico." : "Sem histórico suficiente para o gráfico."}
                      </span>
                      {authError && (
                        <Button variant="outline" size="sm" onClick={fetchHistory}>
                          <RefreshCw aria-hidden="true" /> Tentar de novo
                        </Button>
                      )}
                    </div>
                  )
                ) : (
                  <Skeleton className="h-full w-full" aria-busy="true" />
                )}
              </div>
            </section>

            {/* Ritmo e previsão */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1 rounded-md border border-border p-4">
                <p className="label flex items-center gap-1.5 text-muted-foreground">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Velocidade
                </p>
                <p className="text-sm text-muted-foreground">Economia média</p>
                <p className="value-l">{formatarMoeda(insights?.monthlyAvg || 0)}/mês</p>
              </div>

              <div className="space-y-1 rounded-md border border-border p-4">
                <p className="label flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> Previsão real
                </p>
                <p className="text-sm text-muted-foreground">Término estimado</p>
                <p className="value-l">
                  {insights?.estimatedEndDate ? format(insights.estimatedEndDate, "MMM 'de' yyyy", { locale: ptBR }) : 'Sem ritmo para estimar'}
                </p>
                {insights?.status === 'positive' && <p className="text-sm text-inflow">Antes do prazo</p>}
                {insights?.status === 'negative' && (
                  <p className="flex items-center gap-1.5 text-sm text-warn">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Depois do prazo
                  </p>
                )}
              </div>
            </div>

            {/* Ações: a primária é guardar; as outras ficam em contorno */}
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button className="flex-1" onClick={onOpenDeposit} disabled={concluida}>
                <PiggyBank aria-hidden="true" /> Guardar
              </Button>
              <Button variant="outline" className="flex-1" onClick={onOpenWithdraw}>
                <ExternalLink aria-hidden="true" /> Resgatar
              </Button>
              <Button variant="outline" onClick={onOpenHistory}>
                <History aria-hidden="true" /> Histórico
              </Button>
              <Button variant="ghost" onClick={onOpenSimulator}>
                <TrendingUp aria-hidden="true" /> Projetar trajetória
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
