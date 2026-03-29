"use client"

import { useEffect, useState } from "react"
import { 
  Plus, 
  Target, 
  TrendingUp, 
  Wallet, 
  Calendar,
  AlertCircle,
  MoreHorizontal,
  Edit,
  Trash,
  PiggyBank,
  History,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  DollarSign,
  Activity,
  ArrowUpRight,
  HelpCircle,
  Zap,
  LayoutDashboard,
  Sparkles
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { usePlan } from "@/hooks/use-plan"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"

import { Goal } from "@/types/goals"
import { goalsService } from "@/services/goals"
import { cn, getAbsoluteUrl } from "@/lib/utils"
import { GoalForm } from "@/components/goals/GoalForm"
import { GoalDepositForm } from "@/components/goals/GoalDepositForm"
import { GoalHistory } from "@/components/goals/GoalHistory"
import { GoalSimulator } from "@/components/goals/GoalSimulator"
import { SpareChangeBank } from "@/components/goals/SpareChangeBank"
import { GoalDetails } from "@/components/goals/GoalDetails"
import { GoalWithdrawForm } from "@/components/goals/GoalWithdrawForm"
import { PageHelp } from "@/components/ui/page-help"

export default function GoalsPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const { isPremiumPlus } = usePlan()
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL')

  const fetchGoals = async () => {
    if (isAuthLoading) return

    if (!isPremiumPlus) {
      setIsLoading(false)
      return
    }
    
    try {
      setIsLoading(true)
      const data = await goalsService.getGoals()
      setGoals(data)
    } catch (error) {
      console.error("Failed to fetch goals", error)
      toast.error("Erro ao carregar metas.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [isPremiumPlus, isAuthLoading])

  const handleDelete = async (goal: Goal) => {
    if (Number(goal.current_amount) !== 0) {
      toast.error("Ops! Você não pode excluir uma meta que ainda tem saldo. Resgate o dinheiro primeiro para zerar a meta.")
      return
    }

    if (!confirm(`Tem certeza que deseja excluir a meta "${goal.name}"?`)) return
    
    try {
      await goalsService.deleteGoal(goal.id)
      toast.success("Meta excluída com sucesso!")
      fetchGoals()
    } catch (error: any) {
      const message = error.response?.data?.error || "Erro ao excluir meta."
      toast.error(message)
    }
  }

  const formatCurrencyLocal = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (!isAuthLoading && !isPremiumPlus && !isLoading) {
    return (
      <div className="container mx-auto py-20 px-4 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 bg-muted/20 rounded-[40px] border border-dashed border-border/40">
          <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/10 animate-pulse">
            <ShieldAlert className="h-12 w-12" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-3xl font-black uppercase tracking-tight">Recurso Exclusivo</h3>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              O módulo de **Metas Financeiras** e projeções automáticas está disponível apenas para assinantes do plano **Premium Plus**.
            </p>
          </div>
          <Button asChild className="rounded-2xl font-black uppercase tracking-widest text-xs px-10 h-14 bg-primary hover:bg-primary/90 border-0 shadow-lg shadow-primary/20 text-white transition-all hover:scale-105 active:scale-95">
            <Link href="/perfil">Fazer Upgrade Agora</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight uppercase">Metas Financeiras</h1>
            <PageHelp 
              title="Metas"
              description="Transforme seus sonhos em planos concretos com monitoramento inteligente."
              sections={[
                {
                  title: "Objetivo Central",
                  content: "Cada meta é um plano de economia. Você define quanto precisa e até quando, e nós ajudamos com a projeção mensal.",
                  icon: <Target className="h-4 w-4" />
                },
                {
                  title: "Cofrinhos Inteligentes",
                  content: "Suas metas são vinculadas a 'Cofrinhos' (contas). Você pode ter um cofrinho exclusivo para uma meta ou um cofrinho compartilhado para várias.",
                  icon: <PiggyBank className="h-4 w-4" />
                },
                {
                  title: "Divisão Proporcional",
                  content: "Em cofrinhos compartilhados, o saldo é dividido proporcionalmente aos seus aportes. Se você retirar dinheiro do cofrinho, o saldo de todas as metas vinculadas diminui de forma justa.",
                  icon: <Zap className="h-4 w-4" />
                },
                {
                  title: "Simulação de Cenários",
                  content: "Use o simulador (no menu da meta) para ver como diferentes valores de aporte mensal afetam o tempo para atingir seu objetivo.",
                  icon: <TrendingUp className="h-4 w-4" />
                },
                {
                  title: "Troco Solidário",
                  content: "Ative o 'Troco' no topo da página para arredondar transações e enviar o excesso automaticamente para suas metas.",
                  icon: <Sparkles className="h-4 w-4" />
                }
              ]}
            />
          </div>
          <p className="text-muted-foreground mt-1 font-medium">
            Planeje seu futuro e acompanhe suas conquistas.
          </p>
        </div>
        
        <Button 
          className="rounded-2xl font-black uppercase tracking-widest text-[10px] px-6 h-11 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
          onClick={() => {
            setSelectedGoal(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova Meta
        </Button>
      </div>

      {isPremiumPlus && <SpareChangeBank goals={goals} onSuccess={fetchGoals} />}

      {/* Resumo Geral - Desktop: 3 colunas, Mobile: Horizontal scroll ou stacked */}
      {!isLoading && goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-primary/5 border-primary/10 rounded-[32px] overflow-hidden group hover:bg-primary/10 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Total Guardado</p>
                  <p className="text-xl font-black text-primary truncate">
                    {formatCurrencyLocal(goals.reduce((acc, g) => acc + Number(g.current_amount || 0), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/5 border-emerald-500/10 rounded-[32px] overflow-hidden group hover:bg-emerald-500/10 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Objetivo Total</p>
                  <p className="text-xl font-black text-emerald-600 truncate">
                    {formatCurrencyLocal(goals.reduce((acc, g) => acc + Number(g.target_amount || 0), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/5 border-blue-500/10 rounded-[32px] overflow-hidden group hover:bg-blue-500/10 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Metas Ativas</p>
                  <p className="text-xl font-black text-blue-600 truncate">
                    {goals.filter(g => g.status !== 'COMPLETED').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/5 border-purple-500/10 rounded-[32px] overflow-hidden group hover:bg-purple-500/10 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Concluídas</p>
                  <p className="text-xl font-black text-purple-600 truncate">
                    {goals.filter(g => g.status === 'COMPLETED').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros e Tabs */}
      {!isLoading && goals.length > 0 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <Button 
            variant={activeFilter === 'ALL' ? 'default' : 'ghost'}
            className={cn(
              "rounded-full px-6 text-[10px] font-black uppercase tracking-widest h-9",
              activeFilter !== 'ALL' && "bg-muted/50 text-muted-foreground"
            )}
            onClick={() => setActiveFilter('ALL')}
          >
            Todas ({goals.length})
          </Button>
          <Button 
            variant={activeFilter === 'ACTIVE' ? 'default' : 'ghost'}
            className={cn(
              "rounded-full px-6 text-[10px] font-black uppercase tracking-widest h-9",
              activeFilter !== 'ACTIVE' && "bg-muted/50 text-muted-foreground"
            )}
            onClick={() => setActiveFilter('ACTIVE')}
          >
            Em Aberto ({goals.filter(g => g.status !== 'COMPLETED').length})
          </Button>
          <Button 
            variant={activeFilter === 'COMPLETED' ? 'default' : 'ghost'}
            className={cn(
              "rounded-full px-6 text-[10px] font-black uppercase tracking-widest h-9",
              activeFilter !== 'COMPLETED' && "bg-muted/50 text-muted-foreground"
            )}
            onClick={() => setActiveFilter('COMPLETED')}
          >
            Concluídas ({goals.filter(g => g.status === 'COMPLETED').length})
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/40 bg-card/50 backdrop-blur-sm shadow-sm animate-pulse h-64 md:rounded-[32px] overflow-hidden" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-muted/10 rounded-[40px] border border-dashed border-border/40">
          <div className="p-4 rounded-full bg-muted/50 text-muted-foreground">
            <Target className="h-12 w-12 opacity-20" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-lg">Nenhuma meta criada ainda.</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">Comece definindo um objetivo para o seu dinheiro e acompanhe seu progresso.</p>
          </div>
          <Button 
            variant="outline"
            className="rounded-xl font-bold text-xs"
            onClick={() => setIsFormOpen(true)}
          >
            Criar minha primeira meta
          </Button>
        </div>
      ) : (() => {
        const filteredGoals = goals.filter(goal => {
          if (activeFilter === 'ACTIVE') return goal.status !== 'COMPLETED'
          if (activeFilter === 'COMPLETED') return goal.status === 'COMPLETED'
          return true
        })

        if (filteredGoals.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-muted/5 rounded-[40px] border border-dashed border-border/40">
              <div className="p-4 rounded-full bg-muted/50 text-muted-foreground opacity-20">
                {activeFilter === 'COMPLETED' ? <CheckCircle2 className="h-12 w-12" /> : <Activity className="h-12 w-12" />}
              </div>
              <div className="space-y-1">
                <p className="font-bold text-lg">
                  {activeFilter === 'COMPLETED' ? "Nenhuma meta concluída ainda." : "Nenhuma meta ativa no momento."}
                </p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed px-4">
                  {activeFilter === 'COMPLETED' 
                    ? "Continue poupando para realizar seus sonhos e vê-los aqui em breve!" 
                    : "Que tal criar um novo objetivo para começar a poupar hoje?"}
                </p>
              </div>
            </div>
          )
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoals.map((goal) => (
            <Card 
              key={goal.id} 
              className={cn(
                "group border-border/40 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all duration-500 rounded-[32px] overflow-hidden flex flex-col border-t-4 relative isolate",
                goal.status === 'COMPLETED' ? "border-t-emerald-500" : "border-t-primary"
              )}
              style={{ maskImage: "radial-gradient(white, black)", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
            >
              {goal.image && (
                <div 
                  className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                  style={{ backgroundImage: `url(${getAbsoluteUrl(goal.image)})` }}
                >
                  {/* Robust dual overlay for maximum legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 backdrop-blur-[1px]" />
                </div>
              )}
              
              <div className="relative z-10 flex flex-col h-full bg-gradient-to-b from-transparent to-card/90">
                <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
                <div className="flex items-start justify-between">
                  <div className="p-2 md:p-3 rounded-2xl bg-muted/50 text-primary group-hover:scale-110 transition-transform duration-500">
                    <Target className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedGoal(goal)
                          setIsSimulatorOpen(true)
                        }}
                      >
                        <TrendingUp className="mr-2 h-4 w-4" /> Simular Cenários
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedGoal(goal)
                          setIsDetailsOpen(true)
                        }}
                      >
                        <TrendingUp className="mr-2 h-4 w-4" /> Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedGoal(goal)
                          setIsFormOpen(true)
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="cursor-pointer text-red-500 focus:text-red-500"
                        onClick={() => handleDelete(goal)}
                      >
                        <Trash className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className={cn(
                      "font-black uppercase tracking-tight text-xl truncate flex-1",
                      goal.image ? "text-white drop-shadow-md" : "text-foreground"
                    )}>
                      {goal.name}
                    </CardTitle>
                    {goal.status === 'COMPLETED' && (
                      <Badge className="bg-emerald-500 text-white border-0 text-[10px] font-black uppercase tracking-widest h-5 px-1.5 py-0 shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Concluída
                      </Badge>
                    )}
                  </div>
                  <CardDescription className={cn(
                    "text-xs font-semibold line-clamp-2",
                    goal.image ? "text-white/80 drop-shadow-sm" : "text-muted-foreground"
                  )}>
                    {goal.description || "Planeje este objetivo com clareza."}
                  </CardDescription>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-4 md:space-y-6 flex-1">
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-end justify-between">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      goal.image ? "text-white/60" : "text-muted-foreground/60"
                    )}>Progresso Atual</span>
                    <span className={cn(
                      "font-black text-lg leading-none",
                      goal.image ? "text-white drop-shadow-sm" : "text-primary"
                    )}>
                      {Math.round(goal.progress_percentage || 0)}%
                    </span>
                  </div>
                  <Progress 
                    value={goal.progress_percentage} 
                    className={cn(
                      "h-3 shadow-inner",
                      goal.image ? "bg-white/10" : "bg-primary/10"
                    )} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                      goal.image ? "text-white/40" : "text-muted-foreground/50"
                    )}>
                      <Wallet className="h-3 w-3" /> Atual
                    </span>
                    <p className={cn(
                      "font-black text-base truncate",
                      goal.image ? "text-emerald-400 drop-shadow-sm" : "text-emerald-600"
                    )}>
                      {formatCurrencyLocal(goal.current_amount)}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 justify-end",
                      goal.image ? "text-white/40" : "text-muted-foreground/50"
                    )}>
                      <Target className="h-3 w-3" /> Objetivo
                    </span>
                    <p className={cn(
                      "font-black text-base truncate",
                      goal.image ? "text-white drop-shadow-sm" : "text-foreground"
                    )}>
                      {formatCurrencyLocal(goal.target_amount)}
                    </p>
                  </div>
                </div>

                {goal.target_date && goal.status !== 'COMPLETED' && (() => {
                  const targetDate = new Date(goal.target_date)
                  const now = new Date()
                  
                  // Calculate months remaining if not provided by backend
                  let months = goal.months_remaining
                  if (months === undefined || months === null) {
                    const diffYears = targetDate.getFullYear() - now.getFullYear()
                    const diffMonths = targetDate.getMonth() - now.getMonth()
                    months = Math.max(1, diffYears * 12 + diffMonths)
                  }

                  // Calculate suggested saving if not provided or zero
                  let suggested = goal.suggested_monthly_saving
                  if (!suggested || suggested === 0) {
                    const remaining = goal.target_amount - goal.current_amount
                    suggested = Math.max(0, remaining / months)
                  }

                  return (
                    <div className={cn(
                      "p-3 md:p-4 rounded-[20px] md:rounded-[24px] border transition-all duration-500 overflow-hidden relative",
                      goal.image 
                        ? "bg-black/40 border-white/10 backdrop-blur-xl ring-1 ring-white/5" 
                        : "bg-primary/5 border-primary/10 shadow-inner"
                    )}>
                      <div className="flex items-center justify-between mb-1 md:mb-2">
                        <div className={cn(
                          "flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest",
                          goal.image ? "text-emerald-400" : "text-primary"
                        )}>
                            <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5" /> Projeção
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-[8px] md:text-[9px] font-black uppercase px-2 h-4 md:h-5 rounded-full border-2",
                          goal.image ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-primary/20 text-primary"
                        )}>
                            {months} meses
                        </Badge>
                      </div>
                      <p className={cn(
                        "text-[10px] md:text-xs font-semibold leading-relaxed",
                        goal.image ? "text-white/90" : "text-muted-foreground leading-snug"
                      )}>
                        Você precisa guardar <span className={cn("font-black text-xs md:text-sm border-b-2", goal.image ? "text-white border-emerald-500/50" : "text-primary border-primary/30")}>{formatCurrencyLocal(suggested || 0)}/mês</span> para atingir sua meta em {format(targetDate, "MMMM 'de' yyyy", { locale: ptBR })}.
                      </p>
                    </div>
                  )
                })()}

                <Button 
                  className={cn(
                    "w-full rounded-[16px] md:rounded-[20px] font-black uppercase tracking-widest text-[9px] md:text-[10px] h-10 md:h-12 transition-all group/btn shadow-lg",
                    goal.image 
                      ? "bg-white hover:bg-white/90 text-black border-0 shadow-white/10" 
                      : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
                  )}
                  onClick={() => {
                    setSelectedGoal(goal)
                    setIsDepositOpen(true)
                  }}
                  disabled={goal.status === 'COMPLETED'}
                >
                  <PiggyBank className="mr-2 h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                  Guardar Dinheiro
                </Button>
              </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )})()}

      <GoalForm 
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={selectedGoal}
        onSuccess={fetchGoals}
      />

      <GoalDepositForm 
        open={isDepositOpen}
        onOpenChange={setIsDepositOpen}
        goal={selectedGoal}
        onSuccess={fetchGoals}
      />

      <GoalHistory 
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        goal={selectedGoal}
      />

      <GoalSimulator 
        open={isSimulatorOpen}
        onOpenChange={setIsSimulatorOpen}
        goal={selectedGoal}
      />

      <GoalDetails 
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        goal={selectedGoal}
        onOpenHistory={() => {
          setIsDetailsOpen(false)
          setTimeout(() => setIsHistoryOpen(true), 300)
        }}
        onOpenDeposit={() => {
          setIsDetailsOpen(false)
          setTimeout(() => setIsDepositOpen(true), 300)
        }}
        onOpenSimulator={() => {
          setIsDetailsOpen(false)
          setTimeout(() => setIsSimulatorOpen(true), 300)
        }}
        onOpenWithdraw={() => {
          setIsDetailsOpen(false)
          setTimeout(() => setIsWithdrawOpen(true), 300)
        }}
      />

      <GoalWithdrawForm 
        open={isWithdrawOpen}
        onOpenChange={setIsWithdrawOpen}
        goal={selectedGoal}
        onSuccess={fetchGoals}
      />
    </div>
  )
}
