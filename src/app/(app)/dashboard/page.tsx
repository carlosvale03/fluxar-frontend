"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getDashboardSummary, getSimpleCharts, getMonthlyComparison, getTagDistribution } from "@/services/reports"
import { DashboardReport, SimpleChartsReport, MonthlyComparisonData, TagDistributionReport } from "@/types/reports"
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs"
import { NetWorthBreakdown } from "@/components/dashboard/NetWorthBreakdown"
import { MonthlyComparisonChart } from "@/components/dashboard/MonthlyComparisonChart"
import { DailyCashFlowChart } from "@/components/dashboard/DailyCashFlowChart"
import { BudgetSummary } from "@/components/dashboard/BudgetSummary"
import { toast } from "sonner"
import { tratarErro, ROTULO_TENTAR_DE_NOVO } from "@/lib/erros"
import { usePlan } from "@/hooks/use-plan"
import { RecursoBloqueado } from "@/components/planos/recurso-bloqueado"
import { Skeleton } from "@/components/ui/skeleton"
import { CategoryDistributionChart } from "@/components/dashboard/CategoryDistributionChart"
import { ClassDistributionChart } from "@/components/dashboard/ClassDistributionChart"
import { TagDistributionChart } from "@/components/dashboard/TagDistributionChart"
import {
    AlertCircle,
    AlertTriangle,
    ArrowDownCircle,
    ArrowRight,
    ArrowRightLeft,
    ArrowUpCircle,
    ChevronLeft,
    ChevronRight,
    CreditCard as CreditCardIcon,
    Plus,
    Receipt,
    RotateCw,
    Settings2,
    Sparkles,
    Tag,
    Target,
    Wallet,
} from "lucide-react"
import { MonthPicker } from "@/components/ui/month-picker"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatarMoeda } from "@/lib/dinheiro"
import { HelpInfo } from "@/components/ui/help-info"
import { Valor } from "@/components/ui/valor"
import { AnelDeProgresso } from "@/components/ui/medicao"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"
import { NAVEGACAO_PRINCIPAL } from "@/components/layout/navegacao"
import { DashboardCustomizer, DashboardModuleConfig, DEFAULT_CONFIG, getInitialConfig } from "@/components/dashboard/dashboard-customizer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCardItem } from "@/components/cards/credit-card-item"
import type { CreditCard } from "@/types/cards"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import { useAvisoDoSalario } from "@/components/salario/AvisoDoSalario"
import { TransferFormDialog } from "@/components/transactions/transfer-form-dialog"
import { CardExpenseFormDialog } from "@/components/transactions/card-expense-form-dialog"
import { InvoicePaymentDialog } from "@/components/transactions/invoice-payment-dialog"
import { CreditCardFormDialog } from "@/components/cards/credit-card-form-dialog"

// Título e linha de apoio da página vêm da navegação (PRODUCT.md §3)
const PAGINA = NAVEGACAO_PRINCIPAL.find((item) => item.href === "/dashboard")!

const LARGE_MODULES = ["DAILY_CASH_FLOW", "BALANCE_EVOLUTION", "CREDIT_MANAGEMENT", "GOALS_JOURNEY"]
const MEDIUM_MODULES = ["EXPENSE_DISTRIBUTION", "CLASS_DISTRIBUTION", "INCOME_SOURCE", "TAG_EXPENSE_DISTRIBUTION", "TAG_INCOME_SOURCE"]
const SMALL_MODULES = ["MONTHLY_BALANCE", "BUDGET_SUMMARY"]

function getAdaptiveLayout(modules: DashboardModuleConfig[]) {
    const result: { module: DashboardModuleConfig; span: number }[] = []
    let i = 0

    while (i < modules.length) {
        const current = modules[i]
        const next = modules[i + 1]
        const nextNext = modules[i + 2]

        // 3 Pequenos -> 4 + 4 + 4
        if (next && nextNext &&
            SMALL_MODULES.includes(current.id) &&
            SMALL_MODULES.includes(next.id) &&
            SMALL_MODULES.includes(nextNext.id)
        ) {
            result.push({ module: current, span: 4 }, { module: next, span: 4 }, { module: nextNext, span: 4 })
            i += 3; continue
        }

        if (next) {
            // Grande + Pequeno -> 8 + 4
            if (LARGE_MODULES.includes(current.id) && SMALL_MODULES.includes(next.id)) {
                result.push({ module: current, span: 8 }, { module: next, span: 4 })
                i += 2; continue
            }
            // Pequeno + Grande -> 4 + 8
            if (SMALL_MODULES.includes(current.id) && LARGE_MODULES.includes(next.id)) {
                result.push({ module: current, span: 4 }, { module: next, span: 8 })
                i += 2; continue
            }
            // Médio/Pequeno + Médio/Pequeno -> 6 + 6
            if ((MEDIUM_MODULES.includes(current.id) || SMALL_MODULES.includes(current.id)) &&
                (MEDIUM_MODULES.includes(next.id) || SMALL_MODULES.includes(next.id))) {
                result.push({ module: current, span: 6 }, { module: next, span: 6 })
                i += 2; continue
            }
            // Grande + Médio -> 6 + 6
            if (LARGE_MODULES.includes(current.id) && MEDIUM_MODULES.includes(next.id)) {
                result.push({ module: current, span: 6 }, { module: next, span: 6 })
                i += 2; continue
            }
        }

        // Sozinho ou fallback
        result.push({ module: current, span: 12 })
        i++
    }
    return result
}

// "1 rota" / "3 rotas"
const rotas = (n: number) => `${n} ${n === 1 ? "rota" : "rotas"}`

export default function DashboardPage() {
    const currentDate = new Date()
    const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())

    const [report, setReport] = useState<DashboardReport | null>(null)
    const [charts, setCharts] = useState<SimpleChartsReport | null>(null)
    const [tagCharts, setTagCharts] = useState<TagDistributionReport | null>(null)
    const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparisonData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
    const [layoutConfig, setLayoutConfig] = useState<DashboardModuleConfig[]>([])

    // Transaction Dialog States
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isTransferOpen, setIsTransferOpen] = useState(false)
    const [isCardExpenseOpen, setIsCardExpenseOpen] = useState(false)
    const [isInvoicePaymentOpen, setIsInvoicePaymentOpen] = useState(false)
    const [formType, setFormType] = useState<"INCOME" | "EXPENSE">("INCOME")

    const [isCardFormOpen, setIsCardFormOpen] = useState(false)

    // PERM-19 e PERM-26: comparação mensal, análise por tag e personalização
    // seguem o acesso do /auth/me; a rota travada não é chamada
    const { podeUsar } = usePlan()
    const comparacaoMensal = podeUsar("comparacao_mensal")
    const analisePorTag = podeUsar("analise_por_tag")
    const personalizar = podeUsar("personalizar_dashboard")

    const handleOpenForm = (type: "INCOME" | "EXPENSE") => {
        setFormType(type)
        setIsFormOpen(true)
    }

    const handleFormSuccess = () => {
        fetchData()
    }

    // SALARIO-19: lançar um salário recebido abre o aviso da divisão
    const { conferirSalario, avisoDoSalario } = useAvisoDoSalario()

    useEffect(() => {
        setLayoutConfig(getInitialConfig())
    }, [])

    const fetchData = async () => {
        // Sem o acesso carregado, espera (PERM-18)
        if (comparacaoMensal === null || analisePorTag === null) return
        try {
            setIsLoading(true)
            const [reportData, chartsData, comparisonData, tagDistributionData] = await Promise.all([
                getDashboardSummary(selectedMonth, selectedYear),
                getSimpleCharts(undefined, selectedMonth, selectedYear),
                comparacaoMensal ? getMonthlyComparison(6, selectedMonth, selectedYear) : Promise.resolve([]),
                analisePorTag ? getTagDistribution(selectedMonth, selectedYear) : Promise.resolve(null)
            ])

            const normalizedCharts = {
                income_vs_expense: chartsData?.income_vs_expense || [],
                expense_by_category: chartsData?.expense_by_category || [],
                income_by_category: chartsData?.income_by_category || [],
                expense_by_class: chartsData?.expense_by_class || [],
                period: chartsData?.period
            }

            setReport(reportData)
            setCharts(normalizedCharts)
            setMonthlyComparison(comparisonData)
            setTagCharts(tagDistributionData)
        } catch (error) {
            console.error("Failed to fetch dashboard data", error)
            tratarErro(error, {
                mensagemPadrao: "Não foi possível carregar a visão geral do mês. Verifique a conexão e tente de novo.",
                tentarDeNovo: fetchData,
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleLayoutChange = (newConfig: DashboardModuleConfig[]) => {
        setLayoutConfig(newConfig)
        localStorage.setItem("dashboard_layout_config", JSON.stringify(newConfig))
        toast.success("Blocos atualizados.", {
            description: "A ordem e os blocos visíveis ficam salvos neste navegador."
        })
    }

    useEffect(() => {
        fetchData()
    }, [selectedMonth, selectedYear, comparacaoMensal, analisePorTag])

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

    // O período fica sempre à vista no cabeçalho (DESIGN.md §2, princípio 5)
    const periodo = (
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Mês anterior" title="Mês anterior" onClick={handlePrevMonth}>
                <ChevronLeft aria-hidden="true" />
            </Button>
            <MonthPicker
                currentMonth={selectedMonth}
                currentYear={selectedYear}
                onSelect={(month: number, year: number) => {
                    setSelectedMonth(month)
                    setSelectedYear(year)
                }}
            />
            <Button variant="ghost" size="icon" aria-label="Próximo mês" title="Próximo mês" onClick={handleNextMonth}>
                <ChevronRight aria-hidden="true" />
            </Button>
        </div>
    )

    // A única ação primária da página: o menu Registrar com os quatro formulários
    const acoes = (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button>
                        <Plus aria-hidden="true" /> Registrar
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel className="label text-muted-foreground">Novo lançamento</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleOpenForm("INCOME")} className="gap-3">
                        <ArrowUpCircle className="h-4 w-4 text-inflow" aria-hidden="true" />
                        Entrada
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenForm("EXPENSE")} className="gap-3">
                        <ArrowDownCircle className="h-4 w-4 text-outflow" aria-hidden="true" />
                        Saída
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsTransferOpen(true)} className="gap-3">
                        <ArrowRightLeft className="h-4 w-4 text-fg-secondary" aria-hidden="true" />
                        Transferência
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsCardExpenseOpen(true)} className="gap-3">
                        <CreditCardIcon className="h-4 w-4 text-fg-secondary" aria-hidden="true" />
                        Gasto no cartão
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsInvoicePaymentOpen(true)} className="gap-3">
                        <Receipt className="h-4 w-4 text-fg-secondary" aria-hidden="true" />
                        Pagamento de fatura
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <RecursoBloqueado chave="personalizar_dashboard" compacto>
                <Button
                    variant="outline"
                    size="icon"
                    aria-label="Personalizar a Ponte de Comando"
                    title="Personalizar blocos"
                    onClick={() => setIsCustomizerOpen(true)}
                >
                    <Settings2 aria-hidden="true" />
                </Button>
            </RecursoBloqueado>
        </>
    )

    const cabecalho = (
        <CabecalhoDePagina titulo={PAGINA.nome} apoio={PAGINA.apoio} periodo={periodo} acoes={acoes} />
    )

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-[1240px] space-y-6 px-4 py-6 md:px-6 md:py-8" aria-busy="true">
                <p className="sr-only" role="status">Carregando a visão geral do mês.</p>
                <div className="space-y-2">
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-4 w-40" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-12 w-72" />
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Skeleton className="h-[400px] lg:col-span-2" />
                    <Skeleton className="h-[400px]" />
                </div>
            </div>
        )
    }

    if (!report) {
        return (
            <div className="mx-auto w-full max-w-[1240px] px-4 py-6 md:px-6 md:py-8">
                {cabecalho}
                <Card>
                    <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
                        <AlertCircle className="h-5 w-5 text-outflow" aria-hidden="true" />
                        <div className="space-y-1">
                            <h2 className="display-s">Não foi possível carregar a visão geral do mês.</h2>
                            <p className="text-sm text-muted-foreground">Verifique a conexão e tente de novo.</p>
                        </div>
                        <Button variant="outline" onClick={fetchData}>
                            <RotateCw aria-hidden="true" /> {ROTULO_TENTAR_DE_NOVO}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const resumo = report.summary
    const acimaDoLimite = report.budgets?.over_limit_count ?? 0
    const pertoDoLimite = report.budgets?.near_limit_count ?? 0

    return (
        <div className="mx-auto w-full max-w-[1240px] space-y-6 px-4 py-6 md:px-6 md:py-8">
            {cabecalho}

            {/* 1. Posição: o número mais importante da tela (DESIGN.md §7) */}
            <section aria-labelledby="titulo-posicao" className="space-y-1">
                <div className="flex items-center gap-1.5">
                    <h2 id="titulo-posicao" className="label text-muted-foreground">Posição</h2>
                    <HelpInfo topic="TOTAL_BALANCE" />
                </div>
                <p className="display-xl text-foreground">
                    {formatarMoeda(resumo.total_liquid_balance ?? resumo.total_balance ?? "0.00")}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <span>Saldo em contas</span>
                    <span aria-hidden="true">·</span>
                    <span>Resultado do mês</span>
                    <Valor valor={resumo.net_result ?? "0.00"} />
                    <HelpInfo topic="NET_RESULT" />
                </p>
            </section>

            {/* 2. Indicadores do mês */}
            <DashboardKPIs data={resumo} />

            {/* 3. Alertas: o mais grave e a contagem dos demais */}
            {(acimaDoLimite > 0 || pertoDoLimite > 0) && (
                <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <AlertTitle>
                                {acimaDoLimite > 0
                                    ? `${rotas(acimaDoLimite)} acima do limite neste mês.`
                                    : `${rotas(pertoDoLimite)} perto do limite neste mês.`}
                            </AlertTitle>
                            {acimaDoLimite > 0 && pertoDoLimite > 0 && (
                                <AlertDescription>Mais {rotas(pertoDoLimite)} perto do limite.</AlertDescription>
                            )}
                        </div>
                        <Link
                            href="/orcamentos"
                            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-fg-secondary transition-colors duration-fast hover:text-foreground"
                        >
                            Ver rotas <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                </Alert>
            )}

            {/* Patrimônio separado em disponível, reservas, investimentos e faturas (REL-15) */}
            <NetWorthBreakdown total={resumo.net_worth} partes={resumo.net_worth_breakdown} />

            {/* 4 e 5. Blocos personalizáveis (DESIGN.md §7, Personalização). O
                título da seção é só para leitor de tela; cada bloco é um card
                com título h3 (AZ-36) */}
            <section aria-labelledby="titulo-blocos">
            <h2 id="titulo-blocos" className="sr-only">Blocos do mês</h2>
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
                {getAdaptiveLayout((personalizar === false ? DEFAULT_CONFIG : layoutConfig).filter(m => m.visible)).map(({ module, span }) => {
                    const spanClass = {
                        4: "md:col-span-6 lg:col-span-4",
                        6: "md:col-span-6",
                        8: "md:col-span-8",
                        9: "md:col-span-9",
                        12: "md:col-span-12"
                    }[span] || "md:col-span-12"

                    switch (module.id) {
                        case "DAILY_CASH_FLOW":
                            return (
                                <DailyCashFlowChart
                                    key={module.id}
                                    data={charts?.income_vs_expense || []}
                                    selectedMonth={selectedMonth}
                                    selectedYear={selectedYear}
                                    isLoading={isLoading}
                                    className={spanClass}
                                />
                            )
                        case "MONTHLY_BALANCE":
                            return (
                                <RecursoBloqueado key={module.id} chave="comparacao_mensal" titulo="Comparação mensal" className={spanClass}>
                                <MonthlyComparisonChart
                                    data={monthlyComparison.length > 0 ? [monthlyComparison[monthlyComparison.length - 1]] : []}
                                    title="Balanço do mês"
                                    description="Entradas e saídas do mês"
                                    granularidade="no mês"
                                    showNumericalLabels={span >= 6}
                                    height="100%"
                                    className={cn(spanClass, "h-full")}
                                />
                                </RecursoBloqueado>
                            )
                        case "BALANCE_EVOLUTION":
                            return (
                                <RecursoBloqueado key={module.id} chave="comparacao_mensal" titulo="Comparação mensal" className={spanClass}>
                                <MonthlyComparisonChart
                                    data={monthlyComparison}
                                    title="Evolução do saldo"
                                    description={`Saldo dos últimos ${monthlyComparison.length} meses`}
                                    variant="line"
                                    height="100%"
                                    className={cn(spanClass, "h-full")}
                                />
                                </RecursoBloqueado>
                            )
                        case "BUDGET_SUMMARY":
                            return (
                                <div key={module.id} className={spanClass}>
                                    <BudgetSummary data={report.budgets} />
                                </div>
                            )
                        case "EXPENSE_DISTRIBUTION":
                            return (
                                <CategoryDistributionChart
                                    key={module.id}
                                    title="Saídas por categoria"
                                    description="Quanto saiu em cada categoria"
                                    data={charts?.expense_by_category || []}
                                    isLoading={isLoading}
                                    icon={Wallet}
                                    className={spanClass}
                                    month={selectedMonth}
                                    year={selectedYear}
                                    acaoVazia={
                                        <Button variant="outline" size="sm" onClick={() => handleOpenForm("EXPENSE")}>
                                            <Plus aria-hidden="true" /> Registrar saída
                                        </Button>
                                    }
                                />
                            )
                        case "CLASS_DISTRIBUTION":
                            // CLASSE-31 a CLASSE-33: o clique leva o período dos gráficos
                            return (
                                <ClassDistributionChart
                                    key={module.id}
                                    data={charts?.expense_by_class || []}
                                    isLoading={isLoading}
                                    className={spanClass}
                                    startDate={charts?.period?.start_date}
                                    endDate={charts?.period?.end_date}
                                />
                            )
                        case "INCOME_SOURCE":
                            return (
                                <CategoryDistributionChart
                                    key={module.id}
                                    title="Entradas por categoria"
                                    description="De onde veio o dinheiro, por categoria"
                                    data={charts?.income_by_category || []}
                                    isLoading={isLoading}
                                    icon={Sparkles}
                                    className={spanClass}
                                    month={selectedMonth}
                                    year={selectedYear}
                                    acaoVazia={
                                        <Button variant="outline" size="sm" onClick={() => handleOpenForm("INCOME")}>
                                            <Plus aria-hidden="true" /> Registrar entrada
                                        </Button>
                                    }
                                />
                            )
                        case "TAG_EXPENSE_DISTRIBUTION":
                            return (
                                <RecursoBloqueado key={module.id} chave="analise_por_tag" titulo="Análise por marcador" className={spanClass}>
                                <TagDistributionChart
                                    title="Saídas por marcador"
                                    description="Quanto saiu em cada marcador"
                                    data={tagCharts?.expense_by_tag || []}
                                    isLoading={isLoading}
                                    icon={Tag}
                                    className={spanClass}
                                    month={selectedMonth}
                                    year={selectedYear}
                                />
                                </RecursoBloqueado>
                            )
                        case "TAG_INCOME_SOURCE":
                            return (
                                <RecursoBloqueado key={module.id} chave="analise_por_tag" titulo="Análise por marcador" className={spanClass}>
                                <TagDistributionChart
                                    title="Entradas por marcador"
                                    description="Quanto entrou em cada marcador"
                                    data={tagCharts?.income_by_tag || []}
                                    isLoading={isLoading}
                                    icon={Tag}
                                    className={spanClass}
                                    month={selectedMonth}
                                    year={selectedYear}
                                />
                                </RecursoBloqueado>
                            )

                        case "CREDIT_MANAGEMENT":
                            return (
                                <section key={module.id} aria-labelledby="titulo-credito" className={cn(spanClass, "space-y-4")}>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 id="titulo-credito" className="display-m">Gestão de crédito</h3>
                                                <HelpInfo topic="CREDIT_MANAGEMENT" />
                                            </div>
                                            <p className="text-sm text-muted-foreground">Controle de limites e faturas</p>
                                        </div>

                                        {report.credit_cards && report.credit_cards.length > 0 && (
                                            <Button variant="outline" onClick={() => setIsCardFormOpen(true)}>
                                                <Plus aria-hidden="true" /> Cadastrar cartão
                                            </Button>
                                        )}
                                    </div>

                                    {!report.credit_cards || report.credit_cards.length === 0 ? (
                                        <Card>
                                            <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
                                                <CreditCardIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                                                <div className="space-y-1">
                                                    <h4 className="display-s">Nenhum cartão cadastrado.</h4>
                                                    <p className="max-w-sm text-sm text-muted-foreground">
                                                        Cadastre seus cartões de crédito para acompanhar faturas e limites num só lugar.
                                                    </p>
                                                </div>
                                                <Button variant="outline" onClick={() => setIsCardFormOpen(true)}>
                                                    <Plus aria-hidden="true" /> Cadastrar cartão
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <div className={cn(
                                            "grid grid-cols-1 gap-4",
                                            span >= 12 ? "md:grid-cols-2 lg:grid-cols-3" : (span >= 8 ? "md:grid-cols-2" : "md:grid-cols-1")
                                        )}>
                                            {report.credit_cards?.map((card) => {
                                                const mappedCard = {
                                                    ...card,
                                                    current_invoice_total: card.current_invoice,
                                                    account_id: "",
                                                    closing_day: 0,
                                                    created_at: "",
                                                    updated_at: ""
                                                } as CreditCard

                                                return (
                                                    <div key={card.id} className="w-full">
                                                        <CreditCardItem
                                                            card={mappedCard}
                                                            onEdit={() => {}}
                                                            onDelete={() => {}}
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </section>
                            )
                        case "GOALS_JOURNEY": {
                            if (!report.goals) return null
                            const progresso = report.goals.average_progress ?? 0
                            return (
                                <Card key={module.id} className={spanClass}>
                                    <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                                        <div className="space-y-1">
                                            <CardTitle className="flex items-center gap-2">
                                                <Target className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                <h3>Destinos</h3>
                                            </CardTitle>
                                            <p className="text-sm text-muted-foreground">Metas de economia</p>
                                        </div>
                                        <Link
                                            href="/metas"
                                            className="inline-flex shrink-0 items-center gap-1 text-sm text-fg-secondary transition-colors duration-fast hover:text-foreground"
                                        >
                                            Ver destinos <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                        </Link>
                                    </CardHeader>
                                    <CardContent>
                                        {(report.goals.active_count ?? 0) === 0 ? (
                                            <div className="flex flex-col items-center gap-3 py-8 text-center">
                                                <Target className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-semibold">Nenhum destino ativo.</h4>
                                                    <p className="max-w-sm text-sm text-muted-foreground">
                                                        Defina um destino para medir a distância até ele.
                                                    </p>
                                                </div>
                                                <Button variant="outline" asChild>
                                                    <Link href="/metas">
                                                        <Plus aria-hidden="true" /> Definir destino
                                                    </Link>
                                                </Button>
                                            </div>
                                        ) : (
                                        <dl className="flex flex-wrap items-center gap-x-10 gap-y-4">
                                            <div className="space-y-1">
                                                <dt className="label text-muted-foreground">Ativos</dt>
                                                <dd className="value-l">{report.goals.active_count ?? 0}</dd>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <AnelDeProgresso percentual={progresso} nome="Progresso médio dos destinos" />
                                                <div className="space-y-1">
                                                    <dt className="label text-muted-foreground">Progresso médio</dt>
                                                    <dd className="value-l">{progresso.toFixed(1).replace(".", ",")}%</dd>
                                                </div>
                                            </div>
                                        </dl>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        }
                        default:
                            return null
                    }
                })}
            </div>
            </section>

            {personalizar && (
                <DashboardCustomizer
                    open={isCustomizerOpen}
                    onOpenChange={setIsCustomizerOpen}
                    config={layoutConfig}
                    onConfigChange={handleLayoutChange}
                />
            )}

            {/* Diálogos de lançamento */}
            <TransactionFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                type={formType}
                onSuccess={(criada) => {
                    handleFormSuccess()
                    void conferirSalario(criada)
                }}
            />
            {avisoDoSalario}

            <TransferFormDialog
                open={isTransferOpen}
                onOpenChange={setIsTransferOpen}
                onSuccess={handleFormSuccess}
            />

            <CardExpenseFormDialog
                open={isCardExpenseOpen}
                onOpenChange={setIsCardExpenseOpen}
                onSuccess={handleFormSuccess}
            />

            <InvoicePaymentDialog
                open={isInvoicePaymentOpen}
                onOpenChange={setIsInvoicePaymentOpen}
                onSuccess={handleFormSuccess}
            />

            <CreditCardFormDialog
                open={isCardFormOpen}
                onOpenChange={setIsCardFormOpen}
                onSuccess={handleFormSuccess}
            />
        </div>
    )
}
