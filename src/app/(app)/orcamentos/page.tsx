"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Budget } from "@/types/budgets"
import { getBudgets, deleteBudget } from "@/services/budgets"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BarraDeRota } from "@/components/ui/medicao"
import { ConfirmacaoDestrutiva } from "@/components/ui/confirmacao-destrutiva"
import { PlusCircle, Pencil, Trash2, AlertTriangle, CheckCircle, AlertCircle, Search, Eye, Copy, ChevronLeft, ChevronRight, Info } from "lucide-react"
import { BudgetForm } from "@/components/budgets/BudgetForm"
import { ImportBudgetsDialog } from "@/components/budgets/ImportBudgetsDialog"
import { AvisoDoPlano } from "@/components/planos/recurso-bloqueado"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"
import { LucideIcon } from "@/components/ui/icon-picker"
import { Input } from "@/components/ui/input"
import { MonthPicker } from "@/components/ui/month-picker"
import { usePlan } from "@/hooks/use-plan"

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { tratarErro } from "@/lib/erros"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { deCentavos, formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"

const TITULO = "Rotas"
const APOIO = "Limites de gasto por categoria"

// AZ-26: o orçamento ainda não tem tolerância nos dados da API; a barra e o
// texto usam 0% até o backend mandar o campo
const TOLERANCIA_PADRAO = 0

// PERM-19: com `orcamentos` fechado, a tela mostra o aviso do plano e /budgets/ não é chamado
export default function BudgetsPage() {
  const { podeUsar } = usePlan()
  const liberado = podeUsar("orcamentos")

  if (liberado === null) return null
  if (liberado) return <TelaDeOrcamentos />

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-6">
      <CabecalhoDePagina titulo={TITULO} apoio={APOIO} className="pb-0" />
      <AvisoDoPlano />
    </div>
  )
}

function TelaDeOrcamentos() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined)
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)


  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())
  const [searchTerm, setSearchTerm] = useState("")

  const fetchBudgets = async () => {
    setIsLoading(true)
    try {
      const data = await getBudgets({ month: selectedMonth, year: selectedYear })
      setBudgets(data)
    } catch (error) {
      console.error(error)
      tratarErro(error, { mensagemPadrao: "Erro ao carregar orçamentos", tentarDeNovo: fetchBudgets })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBudgets()
  }, [selectedMonth, selectedYear])

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(prev => prev - 1)
    } else {
      setSelectedMonth(prev => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(prev => prev + 1)
    } else {
      setSelectedMonth(prev => prev + 1)
    }
  }


  const handleDelete = async () => {
    if (!deletingBudget) return

    try {
      await deleteBudget(deletingBudget.id)
    } catch (error) {
       console.error(error)
       tratarErro(error, { mensagemPadrao: "Não foi possível excluir o orçamento." })
       // A confirmação continua aberta
       throw error
    }
    toast.success("Orçamento excluído.")
    fetchBudgets()
  }


  // A cor do status fica no texto da pílula e sempre vem com a palavra e o ícone
  const getStatusInfo = (status: string): { label: string; variant: BadgeProps["variant"]; icon: React.ReactNode } => {
      switch(status) {
          case 'OK':
            return { label: 'Dentro do Limite', variant: 'success', icon: <CheckCircle className="h-3 w-3" aria-hidden="true" /> }
          case 'NEAR_LIMIT':
            return { label: 'Alerta de Gastos', variant: 'warning', icon: <AlertTriangle className="h-3 w-3" aria-hidden="true" /> }
          case 'OVER_LIMIT':
            return { label: 'Limite Estourado', variant: 'warning', icon: <AlertCircle className="h-3 w-3" aria-hidden="true" /> }
          default:
            return { label: 'Processando', variant: 'secondary', icon: null }
      }
  }


  const CATEGORY_ICON_MAP: Record<string, string> = {
    "moradia": "Home",
    "alimentação": "Utensils",
    "transporte": "Car",
    "saúde": "HeartPulse",
    "educação": "GraduationCap",
    "lazer": "Gamepad2",
    "salário": "Banknote",
    "outros": "Tag",
    "investimentos": "TrendingUp",
    "presentes": "Gift",
    "mercado": "ShoppingBasket",
    "restaurante": "Coffee",
    "assinaturas": "Tv",
    "internet": "Wifi",
    "telefone": "Smartphone",
    "luz": "Zap",
    "água": "Droplets",
  }

  const getCategoryIcon = (name: string, icon?: string) => {
    if (icon && icon !== "Tag" && icon !== "circle" && icon !== "") {
      return icon
    }
    return CATEGORY_ICON_MAP[name.toLowerCase()] || "Tag"
  }

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ]

  const filteredBudgets = budgets.filter(budget =>
    budget.category_detail.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    budget.category_detail.parent_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const nomeDoPeriodo = (budget: Budget) => `${months.find(m => m.value === budget.month)?.label} de ${budget.year}`

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:px-6">
      <CabecalhoDePagina
        titulo={TITULO}
        apoio={APOIO}
        periodo={
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth} aria-label="Mês anterior" title="Mês anterior">
                  <ChevronLeft aria-hidden="true" />
              </Button>

              <MonthPicker
                  currentMonth={selectedMonth}
                  currentYear={selectedYear}
                  onSelect={(month, year) => {
                      setSelectedMonth(month)
                      setSelectedYear(year)
                  }}
              />

              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth} aria-label="Próximo mês" title="Próximo mês">
                  <ChevronRight aria-hidden="true" />
              </Button>
          </div>
        }
        acoes={
          <>
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Copy aria-hidden="true" />
              Importar de meses anteriores
            </Button>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                      <PlusCircle aria-hidden="true" />
                      Novo Orçamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <BudgetForm
                      onSuccess={() => {
                          setIsCreateOpen(false)
                          fetchBudgets()
                      }}
                      onCancel={() => setIsCreateOpen(false)}
                      defaultMonth={selectedMonth}
                      defaultYear={selectedYear}
                  />
                </DialogContent>
            </Dialog>
          </>
        }
      />

        <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                    aria-label="Filtrar por nome"
                    placeholder="Filtrar por nome..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={budgets.length === 0}
                />
            </div>
            <div className="hidden text-sm text-muted-foreground md:block">
                {filteredBudgets.length} {filteredBudgets.length === 1 ? 'orçamento definido' : 'orçamentos definidos'}
            </div>
        </div>

        {/* Alerta informativo com a listra lateral (DESIGN.md §5, Alertas) */}
        <div className="mb-6 flex items-start gap-3 rounded-r-lg border border-border border-l-[3px] border-l-info bg-card p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Controle informativo</h2>
            <p className="max-w-2xl text-sm text-fg-secondary">
              O limite é uma ferramenta de planejamento: definir um limite <strong className="font-semibold text-foreground">não bloqueia</strong> novas despesas, só ajuda a acompanhar o gasto de cada categoria.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBudgets.map((budget) => {
              const statusInfo = getStatusInfo(budget.status)
              const limite = paraCentavos(budget.amount_limit)
              const desvio = limite > 0 ? ((paraCentavos(budget.total_spent) - limite) / limite) * 100 : 0
              const foraDaTolerancia = desvio > TOLERANCIA_PADRAO
              const sinal = desvio > 0 ? "+" : desvio < 0 ? "−" : ""

              return (
                <Card key={budget.id} className="flex h-full flex-col gap-5 p-5">
                  <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                          {/* A cor da categoria é dado do usuário (P-08) */}
                          <span
                              aria-hidden="true"
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-elevated"
                              style={{ color: budget.category_detail.color }}
                          >
                              <LucideIcon name={getCategoryIcon(budget.category_detail.name, budget.category_detail.icon)} className="h-5 w-5" />
                          </span>
                          <div className="flex min-w-0 flex-col">
                              {budget.category_detail.parent_name && (
                                <span className="truncate text-xs text-muted-foreground">{budget.category_detail.parent_name}</span>
                              )}
                              <h3 className="display-s truncate">{budget.category_detail.name}</h3>
                              <span className="mt-0.5 text-xs text-muted-foreground">
                                {nomeDoPeriodo(budget)}
                              </span>
                          </div>
                      </div>
                      <Badge variant={statusInfo.variant} className="shrink-0">
                          {statusInfo.icon}
                          {statusInfo.label}
                      </Badge>
                  </div>

                  <div className="space-y-2">
                      <BarraDeRota
                        nome="Gasto do mês"
                        gasto={budget.total_spent}
                        limite={budget.amount_limit}
                        tolerancia={TOLERANCIA_PADRAO}
                      />
                      <p className="text-xs text-muted-foreground">
                        Desvio{" "}
                        <span className={cn("value-m text-xs", foraDaTolerancia ? "text-warn" : "text-fg-secondary")}>
                          {sinal}{formatarPercentual(desvio)}
                        </span>
                        {" "}· tolerância {formatarPercentual(TOLERANCIA_PADRAO)}
                      </p>

                      {budget.status === 'OVER_LIMIT' && (
                          <p className="flex items-center gap-2 text-sm text-warn">
                              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                              Orçamento excedido em {formatarMoeda(deCentavos(Math.max(0, paraCentavos(budget.total_spent) - paraCentavos(budget.amount_limit))))}
                          </p>
                      )}
                  </div>

                  <div className="-mb-2 -mr-2 mt-auto flex justify-end gap-0.5 border-t border-border pt-2">
                     <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                         <Link
                            href={`/transacoes?category=${budget.category_detail.id}&month=${budget.month}&year=${budget.year}`}
                            title="Ver Transações"
                            aria-label={`Ver transações de ${budget.category_detail.name}`}
                         >
                             <Eye aria-hidden="true" />
                         </Link>
                     </Button>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar orçamento"
                        aria-label={`Editar orçamento de ${budget.category_detail.name}`}
                        onClick={() => setEditingBudget(budget)}
                     >
                         <Pencil aria-hidden="true" />
                     </Button>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-outflow"
                        title="Excluir orçamento"
                        aria-label={`Excluir orçamento de ${budget.category_detail.name}`}
                        onClick={() => setDeletingBudget(budget)}
                     >
                         <Trash2 aria-hidden="true" />
                     </Button>
                  </div>
                </Card>
              )
          })}

          {!isLoading && filteredBudgets.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong px-6 py-16 text-center">
                  <Search className="mb-4 h-8 w-8 text-muted-foreground" aria-hidden="true" />
                  <h3 className="display-s">
                    {searchTerm ? "Nenhum orçamento encontrado" : "Sem orçamentos definidos"}
                  </h3>
                  <p className="mx-auto mb-6 mt-2 max-w-sm text-sm text-muted-foreground">
                    {searchTerm
                      ? `Nenhum orçamento para "${searchTerm}".`
                      : "Nenhum limite de gasto neste período. Defina um limite para cada categoria e acompanhe o desvio."
                    }
                  </p>
                  {!searchTerm && (
                    <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
                      <PlusCircle aria-hidden="true" />
                      Definir orçamento
                    </Button>
                  )}
              </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingBudget} onOpenChange={(open) => !open && setEditingBudget(undefined)}>
            <DialogContent className="sm:max-w-[500px]">
                {editingBudget && (
                    <BudgetForm
                      budget={editingBudget}
                      onSuccess={() => {
                          setEditingBudget(undefined)
                          fetchBudgets()
                      }}
                      onCancel={() => setEditingBudget(undefined)}
                    />
                )}
            </DialogContent>
        </Dialog>

        {/* AZ-26: confirmação destrutiva padrão, com o impacto */}
        <ConfirmacaoDestrutiva
          aberta={!!deletingBudget}
          onAbertaChange={(aberta) => !aberta && setDeletingBudget(null)}
          titulo={`Excluir o orçamento de ${deletingBudget?.category_detail.name ?? ""}?`}
          descricao={
            deletingBudget
              ? `O limite de ${formatarMoeda(deletingBudget.amount_limit)} em ${nomeDoPeriodo(deletingBudget)} será excluído. As transações da categoria não são afetadas. Isso não pode ser desfeito.`
              : ""
          }
          rotuloConfirmar="Excluir orçamento"
          onConfirmar={handleDelete}
        />

        <ImportBudgetsDialog
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onSuccess={fetchBudgets}
          targetMonth={selectedMonth}
          targetYear={selectedYear}
        />

    </div>
  )
}
