"use client"

import { useEffect, useState } from "react"
import {
  Plus,
  Target,
  TrendingUp,
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Trash,
  PiggyBank,
  Eye,
  Zap,
  Sparkles,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { RecursoBloqueado } from "@/components/planos/recurso-bloqueado"
import { AvisoDeLimite } from "@/components/planos/aviso-de-limite"
import { usePlan } from "@/hooks/use-plan"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { AnelDeProgresso } from "@/components/ui/medicao"
import { ConfirmacaoDestrutiva } from "@/components/ui/confirmacao-destrutiva"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { deCentavos, formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"

type Filtro = "ALL" | "ACTIVE" | "COMPLETED"

// PERM-19: com `metas` fechado, a tela mostra o aviso do plano e /goals/ não é chamado
export default function GoalsPage() {
  return (
    <RecursoBloqueado chave="metas" titulo="Destinos" className="container mx-auto my-10 max-w-3xl">
      <TelaDeMetas />
    </RecursoBloqueado>
  )
}

function TelaDeMetas() {
  const { isLoading: isAuthLoading } = useAuth()
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
  const [activeFilter, setActiveFilter] = useState<Filtro>("ALL")
  // AZ-27: as duas exclusões passam pela confirmação padrão, com o impacto
  const [metaAExcluir, setMetaAExcluir] = useState<Goal | null>(null)
  const [cofrinhoAExcluir, setCofrinhoAExcluir] = useState<{ id: string; nome: string } | null>(null)

  const fetchGoals = async () => {
    if (isAuthLoading) return

    try {
      setIsLoading(true)
      // META-04: as metas e, de cada cofrinho, o saldo, a soma e o saldo livre
      const [data, dosCofrinhos] = await Promise.all([goalsService.getGoals(), goalsService.getPiggyBanks()])
      setGoals(data)
      setCofrinhos(dosCofrinhos)
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar os destinos. Tente de novo.", tentarDeNovo: fetchGoals })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [isAuthLoading])

  // META-30: o cofrinho ficou sem metas e com saldo zero; o usuário decide
  // se ele sai da lista de contas também
  const excluirCofrinho = async () => {
    if (!cofrinhoAExcluir) return
    try {
      await accountsService.deleteAccount(cofrinhoAExcluir.id)
      toast.success("Cofrinho excluído.")
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível excluir o cofrinho. Tente de novo." })
    }
  }

  const excluirMeta = async () => {
    const goal = metaAExcluir
    if (!goal) return
    // META-29: a meta com valor é recusada pelo backend, com a mensagem dele
    try {
      const resposta = await goalsService.deleteGoal(goal.id)
      toast.success("Destino excluído.")
      // PERM-20: o item excluído sai do uso dos limites do /auth/me
      void atualizarUso()
      if (resposta?.piggy_bank_empty && goal.account) {
        const nome = cofrinhos.find((c) => c.account_id === goal.account)?.name ?? "do destino"
        setCofrinhoAExcluir({ id: goal.account, nome })
      }
      fetchGoals()
    } catch (error) {
      // CONTRATO-31: a API não usa mais a chave error; o detail vai ao Sonner
      tratarErro(error, { mensagemPadrao: "Não foi possível excluir o destino. Tente de novo." })
    }
  }

  const contagem = {
    ALL: goals.length,
    ACTIVE: goals.filter((g) => g.status !== "COMPLETED").length,
    COMPLETED: goals.filter((g) => g.status === "COMPLETED").length,
  }

  const filtros: { valor: Filtro; rotulo: string }[] = [
    { valor: "ALL", rotulo: "Todos" },
    { valor: "ACTIVE", rotulo: "Em aberto" },
    { valor: "COMPLETED", rotulo: "Concluídos" },
  ]

  const indicadores = [
    { rotulo: "Total guardado", valor: formatarMoeda(deCentavos(goals.reduce((acc, g) => acc + paraCentavos(g.current_amount), 0))) },
    { rotulo: "Objetivo total", valor: formatarMoeda(deCentavos(goals.reduce((acc, g) => acc + paraCentavos(g.target_amount), 0))) },
    { rotulo: "Destinos ativos", valor: String(contagem.ACTIVE) },
    { rotulo: "Concluídos", valor: String(contagem.COMPLETED) },
  ]

  const abrir = (goal: Goal, abrirDialogo: (aberto: boolean) => void) => {
    setSelectedGoal(goal)
    abrirDialogo(true)
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <CabecalhoDePagina
        titulo="Destinos"
        apoio="Metas de economia"
        ajuda={
          <PageHelp
            title="Destinos"
            description="Cada destino é um valor a juntar, com prazo opcional e um cofrinho, a conta onde o dinheiro fica."
            sections={[
              {
                title: "Objetivo Central",
                content: "Cada destino é um plano de economia. Você define quanto precisa e até quando, e a tela mostra quanto guardar por mês.",
                icon: <Target className="h-4 w-4" />,
              },
              {
                title: "Cofrinhos",
                content: "Os destinos ficam vinculados a cofrinhos, as contas onde o dinheiro fica guardado. Um cofrinho pode ser exclusivo de um destino ou compartilhado por vários.",
                icon: <PiggyBank className="h-4 w-4" />,
              },
              {
                title: "Saldo Livre",
                content: "O valor de cada destino é o que você aportou menos o que resgatou. O que entra ou sai do cofrinho por fora dos aportes e resgates fica no saldo livre, que você pode usar para aportar em qualquer destino do lastro.",
                icon: <Zap className="h-4 w-4" />,
              },
              {
                title: "Projeção de Trajetória",
                content: "Abra a Projeção de Trajetória no menu do destino para ver como o valor do aporte mensal muda o tempo até alcançá-lo.",
                icon: <TrendingUp className="h-4 w-4" />,
              },
              {
                title: "Lastro",
                content: "Ative o Lastro (o cofrinho do troco) no topo da página: o troco de cada saída até o próximo real fica guardado, e você deposita no destino quando quiser.",
                icon: <Sparkles className="h-4 w-4" />,
              },
            ]}
          />
        }
        acoes={
          <Button
            disabled={metasNoLimite}
            onClick={() => {
              setSelectedGoal(null)
              setIsFormOpen(true)
            }}
          >
            <Plus aria-hidden="true" /> Novo destino
          </Button>
        }
      />

      <div className="mb-6">
        <AvisoDeLimite chave="limite_metas" rotulo="destinos" />
      </div>

      <SpareChangeBank goals={goals} onSuccess={fetchGoals} />

      {!isLoading && goals.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {indicadores.map((indicador) => (
            <Card key={indicador.rotulo} className="p-5">
              <p className="label text-muted-foreground">{indicador.rotulo}</p>
              <p className="value-l mt-1 truncate">{indicador.valor}</p>
            </Card>
          ))}
        </div>
      )}

      {/* META-05: cofrinho com menos dinheiro do que as metas somam */}
      {!isLoading && cofrinhos.some((c) => paraCentavos(c.free_balance) < 0) && (
        <div className="mb-6 space-y-2">
          {cofrinhos
            .filter((c) => paraCentavos(c.free_balance) < 0)
            .map((c) => (
              <Alert key={c.account_id} variant="warning">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  <p>{`O cofrinho ${c.name} tem ${formatarMoeda(deCentavos(-paraCentavos(c.free_balance)))} a menos do que os destinos somam.`}</p>
                </AlertDescription>
              </Alert>
            ))}
        </div>
      )}

      {!isLoading && goals.length > 0 && (
        <div role="group" aria-label="Filtrar destinos" className="no-scrollbar mb-6 flex items-center gap-2 overflow-x-auto pb-1">
          {filtros.map((filtro) => (
            <Button
              key={filtro.valor}
              size="sm"
              variant={activeFilter === filtro.valor ? "secondary" : "ghost"}
              aria-pressed={activeFilter === filtro.valor}
              className={cn("rounded-full", activeFilter === filtro.valor && "shadow-[inset_0_-2px_0_var(--az-gold)]")}
              onClick={() => setActiveFilter(filtro.valor)}
            >
              {filtro.rotulo} <span className="value-m">({contagem[filtro.valor]})</span>
            </Button>
          ))}
        </div>
      )}

      {isLoading ? (
        // AZ-34: o esqueleto tem a forma do cartão do destino
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Carregando destinos">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="flex flex-col gap-5 p-5">
              <div className="space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-[52px] w-[52px] rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-9 w-full" />
            </Card>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed border-border-strong px-6 py-16 text-center">
          <Target className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="display-s">Nenhum destino ainda</h2>
            <p className="mx-auto max-w-xs text-sm text-muted-foreground">Defina um destino para medir a distância até ele.</p>
          </div>
          <Button variant="outline" disabled={metasNoLimite} onClick={() => setIsFormOpen(true)}>
            Criar o primeiro destino
          </Button>
        </div>
      ) : (
        (() => {
          const filteredGoals = goals.filter((goal) => {
            if (activeFilter === "ACTIVE") return goal.status !== "COMPLETED"
            if (activeFilter === "COMPLETED") return goal.status === "COMPLETED"
            return true
          })

          if (filteredGoals.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border border-dashed border-border-strong px-6 py-16 text-center">
                <h2 className="display-s">
                  {activeFilter === "COMPLETED" ? "Nenhum destino concluído" : "Nenhum destino em aberto"}
                </h2>
                <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                  {activeFilter === "COMPLETED"
                    ? "Os destinos alcançados aparecem aqui."
                    : "Crie um destino para voltar a juntar dinheiro."}
                </p>
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
                  <div className="flex flex-col justify-between gap-3 border-b border-border pb-3 md:flex-row md:items-end">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <h2 className="display-s">{grupo.nome}</h2>
                    </div>
                    {grupo.cofrinho && (
                      <dl className="grid grid-cols-3 gap-4 text-right md:gap-8">
                        <div>
                          <dt className="label text-muted-foreground">Saldo</dt>
                          <dd aria-label="Saldo do cofrinho" className="value-m">
                            {formatarMoeda(grupo.cofrinho.balance)}
                          </dd>
                        </div>
                        <div>
                          <dt className="label text-muted-foreground">Destinos</dt>
                          <dd aria-label="Soma dos destinos" className="value-m">
                            {formatarMoeda(grupo.cofrinho.goals_total)}
                          </dd>
                        </div>
                        <div>
                          <dt className="label text-muted-foreground">Livre</dt>
                          <dd
                            aria-label="Saldo livre"
                            className={cn("value-m", paraCentavos(grupo.cofrinho.free_balance) < 0 ? "text-warn" : "text-foreground")}
                          >
                            {formatarMoeda(grupo.cofrinho.free_balance)}
                          </dd>
                        </div>
                      </dl>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {grupo.metas.map((goal) => (
                      <CartaoDaMeta
                        key={goal.id}
                        goal={goal}
                        onSimular={() => abrir(goal, setIsSimulatorOpen)}
                        onDetalhes={() => abrir(goal, setIsDetailsOpen)}
                        onEditar={() => abrir(goal, setIsFormOpen)}
                        onExcluir={() => setMetaAExcluir(goal)}
                        onGuardar={() => abrir(goal, setIsDepositOpen)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        })()
      )}

      <ConfirmacaoDestrutiva
        aberta={metaAExcluir !== null}
        onAbertaChange={(aberta) => !aberta && setMetaAExcluir(null)}
        titulo={`Excluir o destino ${metaAExcluir?.name ?? ""}?`}
        descricao="O histórico de aportes e resgates deste destino será excluído. Um destino com valor guardado precisa ser resgatado antes. Isso não pode ser desfeito."
        rotuloConfirmar="Excluir destino"
        onConfirmar={excluirMeta}
      />

      <ConfirmacaoDestrutiva
        aberta={cofrinhoAExcluir !== null}
        onAbertaChange={(aberta) => !aberta && setCofrinhoAExcluir(null)}
        titulo={`Excluir também o cofrinho ${cofrinhoAExcluir?.nome ?? ""}?`}
        descricao="O cofrinho ficou vazio e sem destinos. Ele sai da lista de contas. Isso não pode ser desfeito."
        rotuloConfirmar="Excluir cofrinho"
        onConfirmar={excluirCofrinho}
      />

      <GoalForm open={isFormOpen} onOpenChange={setIsFormOpen} initialData={selectedGoal} onSuccess={fetchGoals} />

      <GoalDepositForm
        open={isDepositOpen}
        onOpenChange={setIsDepositOpen}
        goal={selectedGoal}
        cofrinho={cofrinhos.find((c) => c.account_id === selectedGoal?.account) ?? null}
        onSuccess={fetchGoals}
      />

      <GoalHistory open={isHistoryOpen} onOpenChange={setIsHistoryOpen} goal={selectedGoal} />

      <GoalSimulator open={isSimulatorOpen} onOpenChange={setIsSimulatorOpen} goal={selectedGoal} />

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

interface CartaoDaMetaProps {
  goal: Goal
  onSimular: () => void
  onDetalhes: () => void
  onEditar: () => void
  onExcluir: () => void
  onGuardar: () => void
}

// AZ-27 (DESIGN.md §5, Anel de progresso): o anel com o percentual e a data
// prevista ao lado; a cor nunca é a única pista
function CartaoDaMeta({ goal, onSimular, onDetalhes, onEditar, onExcluir, onGuardar }: CartaoDaMetaProps) {
  const concluida = goal.status === "COMPLETED"
  const percentual = goal.progress_percentage || 0

  // CONTRATO-24: data sem hora no dia gravado, em qualquer fuso
  const targetDate = goal.target_date ? lerData(goal.target_date) : null

  let projecao: { months: number; suggested: string } | null = null
  if (targetDate && !concluida) {
    const now = new Date()
    // Meses restantes quando o backend não manda
    let months = goal.months_remaining
    if (months === undefined || months === null) {
      const diffYears = targetDate.getFullYear() - now.getFullYear()
      const diffMonths = targetDate.getMonth() - now.getMonth()
      months = Math.max(1, diffYears * 12 + diffMonths)
    }
    // Aporte sugerido quando o backend não manda ou manda zero
    // CONTRATO-16: os valores chegam como texto; a conta é feita em centavos
    let suggested = goal.suggested_monthly_saving
    if (!suggested || paraCentavos(suggested) === 0) {
      const remaining = paraCentavos(goal.target_amount) - paraCentavos(goal.current_amount)
      suggested = deCentavos(Math.max(0, Math.round(remaining / months)))
    }
    projecao = { months, suggested }
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      {goal.image && (
        <div
          aria-hidden="true"
          className="h-24 w-full border-b border-border bg-cover bg-center"
          style={{ backgroundImage: `url(${getAbsoluteUrl(goal.image)})` }}
        />
      )}

      <CardContent className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="display-s truncate">{goal.name}</h3>
              {concluida && <Badge variant="success">Concluído</Badge>}
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">{goal.description || "Sem descrição."}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Ações do destino ${goal.name}`}>
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSimular}>
                <TrendingUp className="mr-2 h-4 w-4" aria-hidden="true" /> Projeção de Trajetória
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDetalhes}>
                <Eye className="mr-2 h-4 w-4" aria-hidden="true" /> Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEditar}>
                <Edit className="mr-2 h-4 w-4" aria-hidden="true" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-outflow focus:text-outflow" onClick={onExcluir}>
                <Trash className="mr-2 h-4 w-4" aria-hidden="true" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4">
          <AnelDeProgresso percentual={percentual} nome={goal.name} />
          <div className="min-w-0">
            <p className={cn("value-l", concluida && "text-inflow")}>{formatarPercentual(Math.min(percentual, 100))}</p>
            <p className="text-sm text-muted-foreground">
              {concluida
                ? "Destino alcançado"
                : targetDate
                  ? `Prazo: ${format(targetDate, "MMM 'de' yyyy", { locale: ptBR })}`
                  : "Sem prazo definido"}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <dt className="label text-muted-foreground">Atual</dt>
            <dd className="value-m truncate">{formatarMoeda(goal.current_amount)}</dd>
          </div>
          <div className="space-y-1 text-right">
            <dt className="label text-muted-foreground">Objetivo</dt>
            <dd className="value-m truncate">{formatarMoeda(goal.target_amount)}</dd>
          </div>
        </dl>

        {projecao && targetDate && (
          <div className="space-y-2 rounded-md border border-border bg-elevated p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="label flex items-center gap-1.5 text-gold-line">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> Projeção
              </span>
              <Badge variant="secondary">{projecao.months} meses</Badge>
            </div>
            <p className="text-sm text-fg-secondary">
              Você precisa guardar <span className="value-m text-foreground">{formatarMoeda(projecao.suggested)}/mês</span> para chegar ao destino em {format(targetDate, "MMMM 'de' yyyy", { locale: ptBR })}.
            </p>
          </div>
        )}

        <Button variant="outline" className="mt-auto w-full" onClick={onGuardar} disabled={concluida}>
          <PiggyBank aria-hidden="true" />
          Guardar dinheiro
        </Button>
      </CardContent>
    </Card>
  )
}
