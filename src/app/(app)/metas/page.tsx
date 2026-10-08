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
import { RecursoBloqueado } from "@/components/planos/recurso-bloqueado"
import { AvisoDeLimite } from "@/components/planos/aviso-de-limite"
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

import { Cofrinho, Goal } from "@/types/goals"
import { goalsService } from "@/services/goals"
import { accountsService } from "@/services/accounts"
import { cn, getAbsoluteUrl } from "@/lib/utils"
import { lerData } from "@/lib/datas"
import { GoalForm } from "@/components/goals/GoalForm"
import { GoalDepositForm } from "@/components/goals/GoalDepositForm"
import { GoalHistory } from "@/components/goals/GoalHistory"
import { GoalSimulator } from "@/components/goals/GoalSimulator"
import { SpareChangeBank } from "@/components/goals/SpareChangeBank"
import { GoalDetails } from "@/components/goals/GoalDetails"
import { GoalWithdrawForm } from "@/components/goals/GoalWithdrawForm"
import { PageHelp } from "@/components/ui/page-help"
import { deCentavos, formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"

// PERM-19: com `metas` fechado, a tela mostra o aviso do plano e /goals/ não é chamado
export default function GoalsPage() {
  return (
    <RecursoBloqueado chave="metas" titulo="Metas" className="container mx-auto my-10 max-w-3xl">
      <TelaDeMetas />
    </RecursoBloqueado>
  )
}

function TelaDeMetas() {
  const { user, isLoading: isAuthLoading } = useAuth()
  // PERM-20: no limite de metas do plano, a criação fica desabilitada
  const { limiteAtingido, atualizarUso } = usePlan()
  const metasNoLimite = limiteAtingido("limite_metas")
  const [goals, setGoals] = useState<Goal[]>([])
  const [cofrinhos, setCofrinhos] = useState<Cofrinho[]>([])
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
    
    try {
      setIsLoading(true)
      // META-04: as metas e, de cada cofrinho, o saldo, a soma e o saldo livre
      const [data, dosCofrinhos] = await Promise.all([goalsService.getGoals(), goalsService.getPiggyBanks()])
      setGoals(data)
      setCofrinhos(dosCofrinhos)
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao carregar metas.", tentarDeNovo: fetchGoals })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [isAuthLoading])

  // META-30: o cofrinho ficou sem metas e com saldo zero; o usuário decide
  // se ele sai da lista de contas também
  const perguntarPeloCofrinho = async (goal: Goal) => {
    const nome = cofrinhos.find((c) => c.account_id === goal.account)?.name ?? "da meta"
    if (!confirm(`O cofrinho ${nome} ficou vazio e sem metas. Deseja excluir o cofrinho também?`)) return
    try {
      await accountsService.deleteAccount(goal.account)
      toast.success("Cofrinho excluído com sucesso!")
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao excluir o cofrinho." })
    }
  }

  const handleDelete = async (goal: Goal) => {
    // META-29: a meta com valor é recusada pelo backend, com a mensagem dele
    if (!confirm(`Tem certeza que deseja excluir a meta "${goal.name}"?`)) return
    
    try {
      const resposta = await goalsService.deleteGoal(goal.id)
      toast.success("Meta excluída com sucesso!")
      // PERM-20: o item excluído sai do uso dos limites do /auth/me
      void atualizarUso()
      if (resposta?.piggy_bank_empty && goal.account) {
        await perguntarPeloCofrinho(goal)
      }
      fetchGoals()
    } catch (error) {
      // CONTRATO-31: a API não usa mais a chave error; o detail vai ao Sonner
      tratarErro(error, { mensagemPadrao: "Erro ao excluir meta." })
    }
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
                  title: "Saldo Livre",
                  content: "O valor de cada meta é o que você aportou menos o que resgatou. O que entra ou sai do cofrinho por fora dos aportes e resgates fica no saldo livre, que você pode usar para aportar em qualquer meta do cofrinho.",
                  icon: <Zap className="h-4 w-4" />
                },
                {
                  title: "Simulação de Cenários",
                  content: "Use o simulador (no menu da meta) para ver como diferentes valores de aporte mensal afetam o tempo para atingir seu objetivo.",
                  icon: <TrendingUp className="h-4 w-4" />
                },
                {
                  title: "Troco Solidário",
                  content: "Ative o cofrinho de trocos no topo da página: o troco de cada despesa até o próximo real fica guardado, e você deposita na meta quando quiser.",
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
          disabled={metasNoLimite}
          onClick={() => {
            setSelectedGoal(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova Meta
        </Button>
      </div>

      <div className="mb-8">
        <AvisoDeLimite chave="limite_metas" rotulo="metas" />
      </div>

      <SpareChangeBank goals={goals} onSuccess={fetchGoals} />

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
                    {formatarMoeda(deCentavos(goals.reduce((acc, g) => acc + paraCentavos(g.current_amount), 0)))}
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
                    {formatarMoeda(deCentavos(goals.reduce((acc, g) => acc + paraCentavos(g.target_amount), 0)))}
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

      {/* META-05: cofrinho com menos dinheiro do que as metas somam */}
      {!isLoading && cofrinhos.some((c) => paraCentavos(c.free_balance) < 0) && (
        <div className="space-y-2 mb-8">
          {cofrinhos.filter((c) => paraCentavos(c.free_balance) < 0).map((c) => (
            <div
              key={c.account_id}
              role="alert"
              className="flex items-center gap-3 p-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 text-orange-600"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-xs font-bold">
                {`O cofrinho ${c.name} tem ${formatarMoeda(deCentavos(-paraCentavos(c.free_balance)))} a menos do que as metas somam.`}
              </p>
            </div>
          ))}
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
            disabled={metasNoLimite}
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

        // META-04: um grupo por cofrinho, na ordem da API; meta sem cofrinho
        // conhecido fica num grupo à parte
        const grupos = [
          ...cofrinhos.map((c) => ({ id: c.account_id, nome: c.name, cofrinho: c as Cofrinho | null })),
          { id: "sem-cofrinho", nome: "Sem cofrinho", cofrinho: null as Cofrinho | null },
        ]
          .map((grupo) => ({
            ...grupo,
            metas: filteredGoals.filter((goal) =>
              grupo.cofrinho ? goal.account === grupo.id : !cofrinhos.some((c) => c.account_id === goal.account),
            ),
          }))
          .filter((grupo) => grupo.metas.length > 0)

        return (
          <div className="space-y-10">
          {grupos.map((grupo) => (
          <section key={grupo.id} aria-label={grupo.nome} className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 px-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <PiggyBank className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-black uppercase tracking-tight">{grupo.nome}</h2>
              </div>
              {grupo.cofrinho && (
                <div className="grid grid-cols-3 gap-4 md:gap-8 text-right">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Saldo</span>
                    <p aria-label="Saldo do cofrinho" className="font-black text-sm">{formatarMoeda(grupo.cofrinho.balance)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Metas</span>
                    <p aria-label="Soma das metas" className="font-black text-sm">{formatarMoeda(grupo.cofrinho.goals_total)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Livre</span>
                    <p
                      aria-label="Saldo livre"
                      className={cn(
                        "font-black text-sm",
                        paraCentavos(grupo.cofrinho.free_balance) < 0 ? "text-orange-600" : "text-emerald-600",
                      )}
                    >
                      {formatarMoeda(grupo.cofrinho.free_balance)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {grupo.metas.map((goal) => (
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
                      {formatarMoeda(goal.current_amount)}
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
                      {formatarMoeda(goal.target_amount)}
                    </p>
                  </div>
                </div>

                {goal.target_date && goal.status !== 'COMPLETED' && (() => {
                  // CONTRATO-24: data sem hora no dia gravado, em qualquer fuso
                  const targetDate = lerData(goal.target_date)
                  const now = new Date()
                  
                  // Calculate months remaining if not provided by backend
                  let months = goal.months_remaining
                  if (months === undefined || months === null) {
                    const diffYears = targetDate.getFullYear() - now.getFullYear()
                    const diffMonths = targetDate.getMonth() - now.getMonth()
                    months = Math.max(1, diffYears * 12 + diffMonths)
                  }

                  // Calculate suggested saving if not provided or zero
                  // CONTRATO-16: os valores chegam como texto; a conta é feita em centavos
                  let suggested = goal.suggested_monthly_saving
                  if (!suggested || paraCentavos(suggested) === 0) {
                    const remaining = paraCentavos(goal.target_amount) - paraCentavos(goal.current_amount)
                    suggested = deCentavos(Math.max(0, Math.round(remaining / months)))
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
                        Você precisa guardar <span className={cn("font-black text-xs md:text-sm border-b-2", goal.image ? "text-white border-emerald-500/50" : "text-primary border-primary/30")}>{formatarMoeda(suggested)}/mês</span> para atingir sua meta em {format(targetDate, "MMMM 'de' yyyy", { locale: ptBR })}.
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
          </section>
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
        cofrinho={cofrinhos.find((c) => c.account_id === selectedGoal?.account) ?? null}
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
        onCorrectionDismissed={fetchGoals}
      />

      <GoalWithdrawForm 
        open={isWithdrawOpen}
        onOpenChange={setIsWithdrawOpen}
        goal={selectedGoal}
        cofrinho={cofrinhos.find((c) => c.account_id === selectedGoal?.account) ?? null}
        onSuccess={fetchGoals}
      />
    </div>
  )
}
