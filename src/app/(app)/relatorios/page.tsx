"use client"

import { useState, useEffect, type ReactNode } from "react"
import { format, parseISO, differenceInDays } from "date-fns"
import { lerData } from "@/lib/datas"
import { ptBR } from "date-fns/locale"
import { getSimpleCharts, getAdvancedCharts, getMonthlyComparison, getDashboardSummary, getTagDistribution } from "@/services/reports"
import { SimpleChartsReport, AdvancedChartsReport, MonthlyComparisonData, DashboardReport, TagDistributionReport } from "@/types/reports"
import { MonthlyComparisonChart } from "@/components/dashboard/MonthlyComparisonChart"
import { DailyCashFlowChart } from "@/components/dashboard/DailyCashFlowChart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartEmptyState } from "@/components/dashboard/ChartEmptyState"
import { CaixaDoTooltip, Granularidade, ItemDaLegenda, LinhaDoTooltip } from "@/components/dashboard/partes-do-grafico"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CategoryDistributionChart } from "@/components/dashboard/CategoryDistributionChart"
import { ClassDistributionChart } from "@/components/dashboard/ClassDistributionChart"
import { TagDistributionChart } from "@/components/dashboard/TagDistributionChart"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import { AccountType } from "@/types/accounts"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line,
    PieChart, Pie, Cell
} from 'recharts'
import { Lock, Sparkles, TrendingUp, Wallet, Calendar, ShieldCheck, Target, Activity, Clock, PieChart as PieIcon, Eye, Plus, Search, Trash2, Tag as TagIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FocusSelectionModal } from "@/components/reports/focus-selection-modal"
import { deleteFocusedMonitor } from "@/services/focused-monitors"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { LucideIcon } from "@/components/ui/icon-picker"
import { HelpInfo } from "@/components/ui/help-info"
import { HelpTopic } from "@/constants/help-texts"
import { formatarMoeda, formatarMoedaDoEixo, paraCentavos } from "@/lib/dinheiro"
import {
    COR_DE_ENTRADA,
    COR_DE_SAIDA,
    COR_DO_PREVISTO,
    CURSOR_DO_TOOLTIP,
    PONTO_ATUAL,
    PROPS_DA_GRADE,
    PROPS_DO_EIXO,
    corDaSerie,
} from "@/lib/graficos"
import { tratarErro } from "@/lib/erros"
import { formatarTaxa, percentualDaMedia, SEM_HISTORICO } from "@/lib/comparacoes"
import { seloDaReserva, seloDoPoderDeAporte } from "@/lib/saude-financeira"
import { usePlan } from "@/hooks/use-plan"
import { RecursoBloqueado } from "@/components/planos/recurso-bloqueado"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"
import { NAVEGACAO_PRINCIPAL } from "@/components/layout/navegacao"
import { ErroDoBloco } from "@/components/reports/erro-do-bloco"
import { GastosPuxados } from "@/components/reports/GastosPuxados"

// CONTRATO-16: os valores chegam como texto; o Recharts precisa de número, e
// a conversão é só para plotar
const numero = (valor: string | undefined) => paraCentavos(valor) / 100

// Título e linha de apoio da página vêm da navegação (PRODUCT.md §3)
const PAGINA = NAVEGACAO_PRINCIPAL.find((item) => item.href === "/relatorios")!

const PERIODOS = [
    { label: "Mês", value: "this_month" },
    { label: "30 dias", value: "last_30_days" },
    { label: "90 dias", value: "last_90_days" },
    { label: "6 meses", value: "last_6_months" },
    { label: "Ano", value: "this_year" },
]

// Séries de categoria (DESIGN.md §3.4), fora do ouro, que marca a ação
const COR_DOS_FIXOS = corDaSerie(1)
const COR_DOS_VARIAVEIS = corDaSerie(2)
const COR_DOS_HABITOS = corDaSerie(1)

// A situação do monitor em texto e cor; a cor nunca vem sozinha
const SITUACAO_DO_MONITOR: Record<string, { texto: string; cor: string; barra: string }> = {
    success: { texto: "Econômico", cor: "text-inflow", barra: "bg-inflow" },
    warning: { texto: "Atenção", cor: "text-warn", barra: "bg-warn" },
    error: { texto: "Crítico", cor: "text-outflow", barra: "bg-outflow" },
}

const VARIANTE_DO_RISCO: Record<string, "info" | "warning" | "destructive"> = {
    Baixa: "info",
    Média: "warning",
    Alta: "destructive",
}

interface IndicadorProps {
    titulo: string
    ajuda: HelpTopic
    rodape: ReactNode
    children: ReactNode
}

// Indicador estático dos avançados: rótulo, valor em mono e uma linha de apoio
function Indicador({ titulo, ajuda, rodape, children }: IndicadorProps) {
    return (
        <Card className="flex flex-col justify-between gap-4 p-5">
            <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                    <p className="label text-muted-foreground">{titulo}</p>
                    <HelpInfo topic={ajuda} />
                </div>
                <div className="flex flex-wrap items-baseline gap-2">{children}</div>
            </div>
            <div className="border-t border-border pt-3 text-xs text-muted-foreground">{rodape}</div>
        </Card>
    )
}

export default function ReportsPage() {
    const [simpleData, setSimpleData] = useState<SimpleChartsReport | null>(null)
    const [advancedData, setAdvancedData] = useState<AdvancedChartsReport | null>(null)
    const [summaryData, setSummaryData] = useState<DashboardReport | null>(null)
    const [tagData, setTagData] = useState<TagDistributionReport | null>(null)
    const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparisonData[]>([])
    const [isLoadingSimple, setIsLoadingSimple] = useState(true)
    const [isLoadingAdvanced, setIsLoadingAdvanced] = useState(false)
    const [isLoadingSummary, setIsLoadingSummary] = useState(true)
    const [isLoadingComparison, setIsLoadingComparison] = useState(true)
    const [period, setPeriod] = useState("this_month")
    const [activeTab, setActiveTab] = useState("simple")
    const [activePieIndex, setActivePieIndex] = useState<number | null>(null)
    const [selectedDailyMonth, setSelectedDailyMonth] = useState<string | null>(null)

    // New states for modals
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false)

    // PERM-19 e PERM-26: cada parte travada vem do acesso do /auth/me, e a
    // rota dela só é chamada com a trava aberta (null enquanto carrega)
    const { podeUsar } = usePlan()
    const avancados = podeUsar("relatorios_avancados")
    const comparacaoMensal = podeUsar("comparacao_mensal")
    const analisePorTag = podeUsar("analise_por_tag")

    // REL-24: cada bloco carrega com o próprio estado (carregando, erro,
    // dados). A falha de um bloco não tira os outros da tela, e o "Tentar de
    // novo" do bloco chama só a rota dele. O aviso continua indo ao Sonner
    // pelo tratarErro (CONTRATO-33).
    const [erroSimple, setErroSimple] = useState(false)
    const [erroSummary, setErroSummary] = useState(false)
    const [erroComparison, setErroComparison] = useState(false)
    const [erroTags, setErroTags] = useState(false)
    const [erroAdvanced, setErroAdvanced] = useState(false)
    const [isLoadingTags, setIsLoadingTags] = useState(true)

    const fetchAdvanced = async () => {
        if (avancados !== true) return
        setIsLoadingAdvanced(true)
        setErroAdvanced(false)
        try {
            const data = await getAdvancedCharts(period)
            setAdvancedData(data)
        } catch (error) {
            setErroAdvanced(true)
            tratarErro(error, { mensagemPadrao: "Não foi possível carregar as cartas avançadas.", tentarDeNovo: fetchAdvanced })
        } finally {
            setIsLoadingAdvanced(false)
        }
    }

    const fetchSimple = async () => {
        setIsLoadingSimple(true)
        setErroSimple(false)
        try {
            const data = await getSimpleCharts(period)
            setSimpleData(data)
        } catch (error) {
            setErroSimple(true)
            tratarErro(error, { mensagemPadrao: "Não foi possível carregar os gráficos.", tentarDeNovo: fetchSimple })
        } finally {
            setIsLoadingSimple(false)
        }
    }

    const fetchSummary = async () => {
        setIsLoadingSummary(true)
        setErroSummary(false)
        try {
            let days: number | string | undefined = undefined;
            if (period === "this_month") days = undefined; // Backend assumes current month if null
            else if (period === "last_30_days") days = 30;
            else if (period === "last_90_days") days = 90;
            else if (period === "last_6_months") days = 180;
            else if (period === "this_year") days = "year";

            const data = await getDashboardSummary(undefined, undefined, days)
            setSummaryData(data)
        } catch (error) {
            setErroSummary(true)
            tratarErro(error, { mensagemPadrao: "Não foi possível carregar o resumo.", tentarDeNovo: fetchSummary })
        } finally {
            setIsLoadingSummary(false)
        }
    }

    const fetchComparison = async () => {
        if (comparacaoMensal !== true) return
        setIsLoadingComparison(true)
        setErroComparison(false)
        try {
            let months = 6;
            if (period === "this_month") months = 1;
            else if (period === "last_30_days") months = 1;
            else if (period === "last_90_days") months = 3;
            else if (period === "last_6_months") months = 6;
            else if (period === "this_year") months = new Date().getMonth() + 1;
            
            // Garantir no mínimo 3 meses para ter contexto histórico na evolução
            const monthsToFetch = Math.max(3, months);
            
            const data = await getMonthlyComparison(monthsToFetch)
            setMonthlyComparison(data)
        } catch (error) {
            setErroComparison(true)
            tratarErro(error, { mensagemPadrao: "Não foi possível carregar a comparação mensal.", tentarDeNovo: fetchComparison })
        } finally {
            setIsLoadingComparison(false)
        }
    }

    const fetchTagDistribution = async () => {
        if (analisePorTag !== true) return
        setIsLoadingTags(true)
        setErroTags(false)
        try {
            // Nas Cartas, usamos o mapeamento de períodos para o backend
            const data = await getTagDistribution(undefined, undefined, period)
            setTagData(data)
        } catch (error) {
            setErroTags(true)
            tratarErro(error, { mensagemPadrao: "Não foi possível carregar a análise por marcador.", tentarDeNovo: fetchTagDistribution })
        } finally {
            setIsLoadingTags(false)
        }
    }

    // Depois de criar uma conta de investimento, recarrega os avançados e o
    // resumo, cada um no seu bloco
    const recarregarInvestimentos = () => {
        fetchAdvanced()
        fetchSummary()
    }

    useEffect(() => {
        fetchSimple()
        fetchSummary()
    }, [period])

    useEffect(() => {
        fetchComparison()
    }, [period, comparacaoMensal])

    useEffect(() => {
        fetchTagDistribution()
    }, [period, analisePorTag])

    useEffect(() => {
        if (activeTab === 'advanced') {
            fetchAdvanced()
        }
    }, [period, activeTab, avancados])

    // Reset seletor diário quando os dados mudarem
    useEffect(() => {
        if (simpleData?.income_vs_expense && simpleData.income_vs_expense.length > 0) {
            // Pegar o último mês disponível por padrão
            const lastDate = simpleData.income_vs_expense
                .filter(d => d.full_date)
                .map(d => d.full_date!)
                .sort()
                .pop();
            
            if (lastDate) {
                const monthStr = lastDate.substring(0, 7); // YYYY-MM
                setSelectedDailyMonth(monthStr);
            }
        }
    }, [simpleData])

    const availableDailyMonths = Array.from(new Set(
        simpleData?.income_vs_expense?.filter(d => d.full_date).map(d => d.full_date!.substring(0, 7)) || []
    )).sort();

    // O período fica sempre à vista no cabeçalho; cada botão diz se está ativo
    const seletorDePeriodo = (
        <div role="group" aria-label="Período" className="flex items-center gap-0.5 overflow-x-auto rounded-md border border-border bg-card p-0.5 no-scrollbar">
            {PERIODOS.map((p) => (
                <button
                    key={p.value}
                    type="button"
                    aria-pressed={period === p.value}
                    onClick={() => setPeriod(p.value)}
                    className={cn(
                        "h-8 shrink-0 cursor-pointer whitespace-nowrap rounded-sm px-3 text-sm transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        period === p.value
                            ? "bg-elevated font-semibold text-foreground shadow-[inset_0_-2px_0_var(--az-gold)]"
                            : "text-fg-secondary hover:bg-elevated hover:text-foreground"
                    )}
                >
                    {p.label}
                </button>
            ))}
        </div>
    )

    // P-16: os selos saem dos números do resumo; sem número, sem selo
    const seloDeAporte = seloDoPoderDeAporte(summaryData?.summary.savings_rate)
    const seloDeReserva = seloDaReserva(summaryData?.summary.liquidity_ratio)

    return (
        <div className="mx-auto w-full max-w-[1240px] space-y-6 px-4 py-6 md:px-6 md:py-8">
            <CabecalhoDePagina titulo={PAGINA.nome} apoio={PAGINA.apoio} periodo={seletorDePeriodo} />

            <Tabs value={activeTab} className="w-full" onValueChange={(val) => {
                setActiveTab(val)
            }}>
                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger value="simple">
                        Fundamentais
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="gap-2">
                        Avançados {avancados === false && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="simple" className="mt-6 space-y-6">
                    {/* AZ-36: título da aba para leitor de tela; cada card tem título h3 */}
                    <h2 className="sr-only">Fundamentais</h2>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {erroSimple ? (
                            <ErroDoBloco titulo="Fluxo e categorias" onTentarDeNovo={fetchSimple} />
                        ) : (
                        <DailyCashFlowChart
                            data={simpleData?.income_vs_expense || []}
                            isLoading={isLoadingSimple}
                            showMonthSelector={true}
                            availableMonths={availableDailyMonths}
                            activeMonthStr={selectedDailyMonth}
                            onMonthChange={setSelectedDailyMonth}
                        />
                        )}

                        <RecursoBloqueado chave="comparacao_mensal" titulo="Comparação mensal" className="lg:col-span-2">
                        {erroComparison ? (
                            <ErroDoBloco titulo="Comparação mensal" onTentarDeNovo={fetchComparison} />
                        ) : isLoadingComparison ? (
                            <>
                                <Skeleton className="h-[350px] w-full" />
                                <Skeleton className="h-[350px] w-full lg:col-span-2" />
                            </>
                        ) : (
                        <>
                        <MonthlyComparisonChart
                            data={monthlyComparison}
                            title="Balanço por mês"
                            description="Entradas e saídas de cada mês"
                            variant="bars"
                            height={350}
                        />

                        <MonthlyComparisonChart
                            data={monthlyComparison}
                            title="Evolução do saldo"
                            description="Entradas menos saídas, acumulado"
                            variant="line"
                            height={350}
                            className="lg:col-span-2"
                        />
                        </>
                        )}
                        </RecursoBloqueado>

                        {!erroSimple && (
                        <>
                        <CategoryDistributionChart
                            title="Saídas por categoria"
                            description="Quanto saiu em cada categoria"
                            data={simpleData?.expense_by_category || []}
                            isLoading={isLoadingSimple}
                            icon={Wallet}
                            startDate={advancedData?.period?.start_date}
                            endDate={advancedData?.period?.end_date}
                        />

                        {/* CLASSE-31 a CLASSE-33: ao lado das despesas por categoria; o
                            clique usa o período dos próprios gráficos simples, que
                            existem sem os relatórios avançados */}
                        <ClassDistributionChart
                            data={simpleData?.expense_by_class || []}
                            isLoading={isLoadingSimple}
                            startDate={simpleData?.period?.start_date}
                            endDate={simpleData?.period?.end_date}
                        />

                        <CategoryDistributionChart
                            title="Entradas por categoria"
                            description="De onde veio o dinheiro, por categoria"
                            data={simpleData?.income_by_category || []}
                            isLoading={isLoadingSimple}
                            icon={Sparkles}
                            className="lg:col-span-2"
                            startDate={advancedData?.period?.start_date}
                            endDate={advancedData?.period?.end_date}
                        />
                        </>
                        )}

                        <RecursoBloqueado chave="analise_por_tag" titulo="Análise por marcador" className="lg:col-span-2">
                        {erroTags ? (
                            <ErroDoBloco titulo="Análise por marcador" onTentarDeNovo={fetchTagDistribution} className="lg:col-span-2" />
                        ) : (
                        <>
                        <TagDistributionChart
                            title="Saídas por marcador"
                            description="Quanto saiu em cada marcador"
                            data={tagData?.expense_by_tag || []}
                            isLoading={isLoadingTags}
                            icon={TagIcon}
                            startDate={advancedData?.period?.start_date}
                            endDate={advancedData?.period?.end_date}
                        />

                        <TagDistributionChart
                            title="Entradas por marcador"
                            description="Quanto entrou em cada marcador"
                            data={tagData?.income_by_tag || []}
                            isLoading={isLoadingTags}
                            icon={TagIcon}
                            startDate={advancedData?.period?.start_date}
                            endDate={advancedData?.period?.end_date}
                        />
                        </>
                        )}
                        </RecursoBloqueado>

                        {/* VINCULO-36 e VINCULO-37: travado pelo plano (VINCULO-20) */}
                        <RecursoBloqueado chave="vinculos" titulo="Gastos puxados" className="lg:col-span-2">
                            <GastosPuxados period={period} className="lg:col-span-2" />
                        </RecursoBloqueado>
                    </div>
                </TabsContent>

                <TabsContent value="advanced" className="mt-6 space-y-6">
                    <h2 className="sr-only">Avançados</h2>
                    <RecursoBloqueado chave="relatorios_avancados" titulo="Cartas avançadas">
                        <div className="space-y-6">
                            {/* Indicadores dos avançados */}
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                                {erroSummary ? (
                                    <ErroDoBloco titulo="Saúde financeira" onTentarDeNovo={fetchSummary} className="lg:col-span-3" />
                                ) : (
                                <>
                                <Indicador titulo="Poder de aporte" ajuda="SAVINGS_RATE" rodape="vs média anual">
                                    {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : (
                                        <span className="value-l">{formatarTaxa(summaryData?.summary.savings_rate)}</span>
                                    )}
                                    {!isLoadingSummary && seloDeAporte && <Badge variant={seloDeAporte.variante}>{seloDeAporte.rotulo}</Badge>}
                                </Indicador>

                                <Indicador
                                    titulo="Liquidez imediata"
                                    ajuda="LIQUIDITY_RATIO"
                                    rodape={
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                                            <div
                                                className="h-full rounded-full bg-info"
                                                style={{ width: `${Math.min(((summaryData?.summary.liquidity_ratio ?? 0) / 6) * 100, 100)}%` }}
                                            />
                                        </div>
                                    }
                                >
                                    {isLoadingSummary ? <Skeleton className="h-8 w-28" /> : (
                                        <span className="value-l">{formatarMoeda(summaryData?.summary.total_liquid_balance)}</span>
                                    )}
                                    {!isLoadingSummary && seloDeReserva && <Badge variant={seloDeReserva.variante}>{seloDeReserva.rotulo}</Badge>}
                                </Indicador>

                                <Indicador
                                    titulo="Score de saúde"
                                    ajuda="FINANCIAL_SCORE"
                                    rodape={(summaryData?.summary.financial_score ?? 0) > 80 ? "Perfil investidor" : "Em evolução"}
                                >
                                    {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : (
                                        <span className="value-l">{`${summaryData?.summary.financial_score ?? 0}/100`}</span>
                                    )}
                                </Indicador>
                                </>
                                )}

                                <Indicador
                                    titulo="Próximo grande gasto"
                                    ajuda="NEXT_BIG_EXPENSE"
                                    rodape={advancedData?.next_big_expense
                                        ? `Previsão: ${format(lerData(advancedData.next_big_expense.date), 'dd/MM/yyyy')}`
                                        : "Nenhuma previsão de alto valor"}
                                >
                                    <span className="value-l">
                                        {advancedData?.next_big_expense ? formatarMoeda(advancedData.next_big_expense.amount) : "—"}
                                    </span>
                                </Indicador>
                            </div>

                            {erroAdvanced ? (
                                <ErroDoBloco titulo="Cartas avançadas" onTentarDeNovo={fetchAdvanced} />
                            ) : isLoadingAdvanced && !advancedData ? (
                                // AZ-34: skeleton com a forma dos blocos avançados
                                <div className="space-y-6" aria-busy="true">
                                    <p className="sr-only" role="status">Carregando as cartas avançadas.</p>
                                    <Skeleton className="h-[420px] w-full" />
                                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                        <Skeleton className="h-[360px] w-full" />
                                        <Skeleton className="h-[360px] w-full" />
                                    </div>
                                </div>
                            ) : (
                            <>
                            {/* Análise Patrimonial */}
                            <Card>
                                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Target className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                            <CardTitle><h3>Análise patrimonial</h3></CardTitle>
                                            <HelpInfo topic="INVESTMENT_ANALYSIS" />
                                        </div>
                                        <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            Consolidação automática de contas do tipo
                                            <Badge variant="secondary">investimento</Badge>
                                            {advancedData?.investment_analysis?.has_investments_account && (
                                                <span className="inline-flex items-center gap-1 text-inflow">
                                                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Monitorando {advancedData.investment_analysis.asset_allocation.length} contas
                                                </span>
                                            )}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {!advancedData?.investment_analysis?.has_investments_account ? (
                                        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border-strong px-6 py-12 text-center">
                                            <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                                            <div className="max-w-md space-y-1">
                                                <h4 className="display-s">Nenhuma conta de investimento ativa.</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Crie uma conta do tipo Investimento para separar os aportes do fluxo de caixa do mês.
                                                </p>
                                            </div>
                                            <AccountFormDialog
                                                defaultType={AccountType.INVESTMENT}
                                                onSuccess={recarregarInvestimentos}
                                                trigger={
                                                    <Button>
                                                        <Plus aria-hidden="true" /> Criar conta de investimento
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                                            {/* Alocação por conta */}
                                            <div className="space-y-4 lg:col-span-1">
                                                <div className="relative h-[250px]" style={{ minWidth: 0 }}>
                                                    {(!advancedData.investment_analysis.asset_allocation || advancedData.investment_analysis.asset_allocation.length === 0) ? (
                                                        <ChartEmptyState
                                                            type="pie"
                                                            height="100%"
                                                            title="Nenhum valor nas contas de investimento."
                                                            description="A divisão entre as contas aparece aqui."
                                                            icon={PieIcon}
                                                        />
                                                    ) : (
                                                        <>
                                                            <div
                                                                role="img"
                                                                aria-label={`Gráfico de rosca da alocação por conta. Total investido: ${formatarMoeda(advancedData.investment_analysis.total_invested)}, em ${advancedData.investment_analysis.asset_allocation.length} ${advancedData.investment_analysis.asset_allocation.length === 1 ? "conta" : "contas"}.`}
                                                                className="h-full w-full"
                                                            >
                                                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                                                <PieChart>
                                                                    <Pie
                                                                        data={advancedData.investment_analysis.asset_allocation.map(a => ({ ...a, value: numero(a.value) }))}
                                                                        innerRadius={70}
                                                                        outerRadius={90}
                                                                        paddingAngle={2}
                                                                        dataKey="value"
                                                                        stroke="var(--az-surface)"
                                                                        strokeWidth={2}
                                                                        onMouseEnter={(_: unknown, index: number) => setActivePieIndex(index)}
                                                                        onMouseLeave={() => setActivePieIndex(null)}
                                                                    >
                                                                        {advancedData.investment_analysis.asset_allocation.map((entry, index) => (
                                                                            <Cell
                                                                                key={`cell-${index}`}
                                                                                fill={entry.color}
                                                                                opacity={activePieIndex === null || activePieIndex === index ? 1 : 0.5}
                                                                            />
                                                                        ))}
                                                                    </Pie>
                                                                    <Tooltip content={() => null} />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                            </div>
                                                            <div className="pointer-events-none absolute left-1/2 top-1/2 w-[120px] -translate-x-1/2 -translate-y-1/2 text-center">
                                                                <span className="label block truncate text-muted-foreground">
                                                                    {activePieIndex !== null
                                                                        ? advancedData.investment_analysis.asset_allocation[activePieIndex].name
                                                                        : "Total investido"
                                                                    }
                                                                </span>
                                                                <span className="value-m block">
                                                                    {formatarMoeda(
                                                                        activePieIndex !== null
                                                                            ? advancedData.investment_analysis.asset_allocation[activePieIndex].value
                                                                            : advancedData?.investment_analysis?.total_invested
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <ul className="divide-y divide-border">
                                                    {advancedData.investment_analysis.asset_allocation.map((item, i) => (
                                                        <li key={i} className="flex items-center justify-between py-2">
                                                            <span className="flex items-center gap-2 text-sm">
                                                                <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                                {item.name}
                                                            </span>
                                                            <span className="value-m">{formatarMoeda(item.value)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Aportes e resgates por mês */}
                                            <div className="space-y-3 lg:col-span-2">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <h4 className="flex items-center gap-2 display-s">
                                                        Aportes e resgates
                                                        <Granularidade>por mês</Granularidade>
                                                    </h4>
                                                    <div className="flex items-center gap-3">
                                                        <ItemDaLegenda cor={COR_DE_ENTRADA} rotulo="Aportes" />
                                                        <ItemDaLegenda cor={COR_DE_SAIDA} rotulo="Resgates" />
                                                    </div>
                                                </div>
                                                <div className="h-[350px] overflow-hidden rounded-md border border-border p-4" style={{ minWidth: 0 }}>
                                                    {(!advancedData.investment_analysis.monthly_history || advancedData.investment_analysis.monthly_history.length === 0) ? (
                                                        <ChartEmptyState
                                                            type="bar"
                                                            height="100%"
                                                            title="Nenhum aporte neste período."
                                                            description="Os aportes e resgates de cada mês aparecem aqui."
                                                            icon={TrendingUp}
                                                        />
                                                    ) : (
                                                        <div role="img" aria-label={`Gráfico de barras dos aportes e resgates por mês, em ${advancedData.investment_analysis.monthly_history.length} ${advancedData.investment_analysis.monthly_history.length === 1 ? "mês" : "meses"}.`} className="h-full w-full">
                                                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                                        <BarChart data={advancedData.investment_analysis.monthly_history.map(m => ({ ...m, contribution: numero(m.contribution), returns: numero(m.returns) }))} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                                            <CartesianGrid {...PROPS_DA_GRADE} />
                                                            <XAxis dataKey="month" {...PROPS_DO_EIXO} dy={10} />
                                                            <YAxis {...PROPS_DO_EIXO} tickFormatter={formatarMoedaDoEixo} width={45} />
                                                            <Tooltip
                                                                cursor={{ fill: "var(--az-elevated)" }}
                                                                content={({ active, payload, label }) => {
                                                                    if (active && payload && payload.length) {
                                                                        return (
                                                                            <CaixaDoTooltip titulo={label}>
                                                                                <LinhaDoTooltip cor={COR_DE_ENTRADA} nome="Aporte" valor={formatarMoeda(payload[0]?.value as number)} />
                                                                                <LinhaDoTooltip cor={COR_DE_SAIDA} nome="Resgate" valor={formatarMoeda(payload[1]?.value as number)} />
                                                                            </CaixaDoTooltip>
                                                                        )
                                                                    }
                                                                    return null
                                                                }}
                                                            />
                                                            <Bar dataKey="contribution" name="Aportes" fill={COR_DE_ENTRADA} radius={[2, 2, 0, 0]} barSize={12} />
                                                            <Bar dataKey="returns" name="Resgates" fill={COR_DE_SAIDA} radius={[2, 2, 0, 0]} barSize={12} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                    </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                {/* Monitor de Foco */}
                                <div className="space-y-6">
                                    <RecursoBloqueado chave="monitor_de_foco" titulo="Monitor de foco">
                                    <Card>
                                        <CardHeader>
                                            <div className="flex items-center gap-2">
                                                <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                <CardTitle><h3>Monitor de foco</h3></CardTitle>
                                                <HelpInfo topic="FOCUSED_MONITOR" />
                                            </div>
                                            <CardDescription>O gasto do mês contra a média, por categoria ou marcador</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {(advancedData?.custom_monitoring?.length ?? 0) === 0 && (
                                                <div className="space-y-1 py-6 text-center">
                                                    <h4 className="text-sm font-semibold">Nenhum item monitorado.</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        Escolha uma categoria ou um marcador para comparar o mês com a média.
                                                    </p>
                                                </div>
                                            )}
                                            {advancedData?.custom_monitoring?.map((monitor, i) => {
                                                // REL-23: média zero não vira porcentagem
                                                const percentual = percentualDaMedia(monitor.current_month, monitor.average_month)
                                                const situacao = SITUACAO_DO_MONITOR[monitor.status] ?? SITUACAO_DO_MONITOR.error
                                                return (
                                                <div key={i} className="space-y-4 rounded-md border border-border p-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            {/* A cor é do usuário: fica no ícone, sobre a superfície */}
                                                            <span
                                                                aria-hidden="true"
                                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-elevated"
                                                                style={{ color: monitor.color || (monitor.type === 'category' ? 'var(--az-serie-2)' : 'var(--az-serie-3)') }}
                                                            >
                                                                {monitor.type === 'category' ? (
                                                                    <LucideIcon name={monitor.icon || 'PieChart'} className="h-4 w-4" />
                                                                ) : (
                                                                    <TagIcon className="h-4 w-4" />
                                                                )}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <h4 className="truncate text-sm font-semibold">{monitor.name}</h4>
                                                                <p className="text-xs text-muted-foreground">{monitor.type === 'category' ? 'Categoria' : 'Marcador'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-right">
                                                                <span className={cn("text-sm font-semibold", situacao.cor)}>{situacao.texto}</span>
                                                                <p className="text-xs text-muted-foreground">Situação no mês</p>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 hover:text-outflow"
                                                                aria-label={`Remover ${monitor.name} do monitor`}
                                                                title="Remover do monitor"
                                                                onClick={async () => {
                                                                    try {
                                                                        await deleteFocusedMonitor(monitor.id)
                                                                        toast.success("Item removido do monitor.")
                                                                        fetchAdvanced()
                                                                    } catch {
                                                                        toast.error("Não foi possível remover o item. Tente de novo.")
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 aria-hidden="true" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <dl className="grid grid-cols-2 gap-3">
                                                        <div className="rounded-md bg-elevated p-3">
                                                            <dt className="label text-muted-foreground">Mês atual</dt>
                                                            <dd className="value-m mt-1">{formatarMoeda(monitor.current_month)}</dd>
                                                        </div>
                                                        <div className="rounded-md bg-elevated p-3">
                                                            <dt className="label text-muted-foreground">Média histórica</dt>
                                                            <dd className="value-m mt-1">{formatarMoeda(monitor.average_month)}</dd>
                                                        </div>
                                                    </dl>

                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                            <span>Progressão</span>
                                                            <span className="value-m text-foreground">{percentual === null ? SEM_HISTORICO : `${Math.round(percentual)}%`}</span>
                                                        </div>
                                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                                                            <div
                                                                className={cn("h-full rounded-full", situacao.barra)}
                                                                style={{ width: `${percentual === null ? 0 : Math.min(percentual, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                )
                                            })}
                                            <Button
                                                variant="outline"
                                                className="h-11 w-full border-dashed"
                                                onClick={() => setIsSelectionModalOpen(true)}
                                            >
                                                <Plus aria-hidden="true" /> Monitorar categoria ou marcador
                                            </Button>
                                        </CardContent>
                                    </Card>
                                    </RecursoBloqueado>
                                </div>

                                <div className="space-y-6">
                                    {/* Insights de Saúde Financeira */}
                                    <Card>
                                        <CardHeader>
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                <CardTitle><h3>Saúde financeira</h3></CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {/* Note for future: technical activity flow (spending_frequency)
                                                can be used here to trigger smart reminders. */}
                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="flex items-center justify-between gap-4 rounded-md border border-border p-4">
                                                    <div>
                                                        <div className="mb-1 flex items-center gap-1.5">
                                                            <p className="label text-muted-foreground">Gasto diário seguro</p>
                                                            <HelpInfo topic="SAFE_DAILY_SPEND" />
                                                        </div>
                                                        <p className="value-l">
                                                            {formatarMoeda(advancedData?.daily_spending_report?.safe_daily_spend)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="label text-muted-foreground">Restam</p>
                                                        <p className="value-l">{advancedData?.daily_spending_report?.remaining_days || 0} dias</p>
                                                    </div>
                                                </div>

                                                <dl className="grid grid-cols-2 gap-3">
                                                    <div className="rounded-md bg-elevated p-3">
                                                        <dt className="label text-muted-foreground">Score de saúde</dt>
                                                        <dd className="value-m mt-1">{summaryData?.summary?.financial_score || 0}<span className="text-muted-foreground">/100</span></dd>
                                                    </div>
                                                    <div className="rounded-md bg-elevated p-3">
                                                        <dt className="label text-muted-foreground">Poder de aporte</dt>
                                                        <dd className="value-m mt-1">{formatarTaxa(summaryData?.summary?.savings_rate)}</dd>
                                                    </div>
                                                </dl>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <h4 className="label text-muted-foreground">Gastos fixos e variáveis</h4>
                                                        <HelpInfo topic="FIXED_VS_VARIABLE" />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">Fixo e variável</span>
                                                </div>
                                                <div
                                                    role="img"
                                                    aria-label={`Fixos: ${formatarMoeda(advancedData?.fixed_vs_variable?.fixed)}. Variáveis: ${formatarMoeda(advancedData?.fixed_vs_variable?.variable)}.`}
                                                    className="flex h-2 w-full overflow-hidden rounded-full bg-elevated"
                                                >
                                                    <div
                                                        className="h-full"
                                                        style={{ backgroundColor: COR_DOS_FIXOS, width: `${paraCentavos(advancedData?.fixed_vs_variable?.fixed) / (paraCentavos(advancedData?.fixed_vs_variable?.total) || 1) * 100}%` }}
                                                    />
                                                    <div
                                                        className="h-full"
                                                        style={{ backgroundColor: COR_DOS_VARIAVEIS, width: `${paraCentavos(advancedData?.fixed_vs_variable?.variable) / (paraCentavos(advancedData?.fixed_vs_variable?.total) || 1) * 100}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between gap-3 text-xs text-fg-secondary">
                                                    <ItemDaLegenda cor={COR_DOS_FIXOS} rotulo={`Fixos: ${formatarMoeda(advancedData?.fixed_vs_variable?.fixed)}`} />
                                                    <ItemDaLegenda cor={COR_DOS_VARIAVEIS} rotulo={`Variáveis: ${formatarMoeda(advancedData?.fixed_vs_variable?.variable)}`} />
                                                </div>
                                            </div>

                                            <div className="space-y-3 rounded-md border border-border p-4">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck className="h-4 w-4 text-inflow" aria-hidden="true" />
                                                    <h4 className="label text-muted-foreground">Reserva de emergência</h4>
                                                </div>
                                                <div className="flex items-end justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm text-fg-secondary">O saldo das contas mantém o seu padrão de gastos por</p>
                                                        <p className="value-l mt-1">{(summaryData?.summary?.liquidity_ratio || 0).toFixed(1)} meses</p>
                                                    </div>
                                                    <Badge variant="success">Seguro</Badge>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="label text-muted-foreground">Recomendações</h4>
                                                <p className="flex gap-3 rounded-md border border-border p-4 text-sm text-fg-secondary">
                                                    <Sparkles className="h-4 w-4 shrink-0 text-gold-line" aria-hidden="true" />
                                                    {summaryData?.summary?.financial_score && summaryData.summary.financial_score > 80
                                                        ? "Saúde financeira excelente. Considere diversificar os aportes em ativos de longo prazo."
                                                        : "Reduza os gastos variáveis para elevar o poder de aporte acima de 20% ainda este mês."}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Hábitos Semanais */}
                                    <Card>
                                        <CardHeader>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                <CardTitle><h3>Hábitos semanais</h3></CardTitle>
                                                <Granularidade>por dia da semana</Granularidade>
                                                <HelpInfo topic="WEEKDAY_HABITS" />
                                            </div>
                                            <CardDescription>
                                                {advancedData?.period ? (
                                                    <span className="flex flex-col gap-0.5">
                                                        <span>Média de gastos por dia da semana</span>
                                                        <span className="flex items-center gap-1.5 text-xs">
                                                            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                                                            Análise de {differenceInDays(parseISO(advancedData.period.end_date), parseISO(advancedData.period.start_date)) + 1} dias
                                                            ({format(parseISO(advancedData.period.start_date), 'dd/MM/yy', { locale: ptBR })} — hoje)
                                                        </span>
                                                    </span>
                                                ) : "Média de gastos por dia da semana"}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[300px]">
                                            {isLoadingAdvanced ? <Skeleton className="h-full w-full" /> : (
                                                (!advancedData?.spend_by_weekday || advancedData.spend_by_weekday.length === 0 || advancedData.spend_by_weekday.every((d) => paraCentavos(d.amount) === 0)) ? (
                                                    <ChartEmptyState
                                                        type="bar"
                                                        height="100%"
                                                        title="Nenhuma saída neste período."
                                                        description="A média de saídas de cada dia da semana aparece aqui."
                                                        icon={Clock}
                                                    />
                                                ) : (
                                                    <div role="img" aria-label="Gráfico de barras da média de gastos por dia da semana." className="h-full w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={(advancedData?.spend_by_weekday || []).map(d => ({ ...d, amount: numero(d.amount) }))}
                                                        margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
                                                    >
                                                        <CartesianGrid {...PROPS_DA_GRADE} />
                                                        <XAxis dataKey="label" {...PROPS_DO_EIXO} dy={10} />
                                                        <YAxis {...PROPS_DO_EIXO} tickFormatter={formatarMoedaDoEixo} width={45} />
                                                        <Tooltip
                                                            cursor={{ fill: "var(--az-elevated)" }}
                                                            content={({ active, payload }) => {
                                                                if (active && payload && payload.length) {
                                                                    return (
                                                                        <CaixaDoTooltip titulo={payload[0].payload.label}>
                                                                            <LinhaDoTooltip cor={COR_DOS_HABITOS} nome="Média diária" valor={formatarMoeda(payload[0].value as number)} />
                                                                        </CaixaDoTooltip>
                                                                    )
                                                                }
                                                                return null;
                                                            }}
                                                        />
                                                        <Bar dataKey="amount" name="Média diária" fill={COR_DOS_HABITOS} radius={[2, 2, 0, 0]} barSize={32} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                                </div>
                                                )
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Simulador de Liberdade: projeção, então linha tracejada (série prevista) */}
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                <CardTitle><h3>Simulador de liberdade</h3></CardTitle>
                                                <Granularidade>por ano</Granularidade>
                                                <HelpInfo topic="PROJECTION" />
                                            </div>
                                            <ItemDaLegenda cor={COR_DO_PREVISTO} rotulo="Estimado" tracejado />
                                        </div>
                                        <CardDescription>
                                            Projeção pelo aporte médio do mês e retorno estimado de 8% ao ano.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[250px]" style={{ minWidth: 0 }}>
                                        {(!advancedData?.financial_freedom_projection || advancedData.financial_freedom_projection.length === 0) ? (
                                            <ChartEmptyState
                                                type="area"
                                                height="100%"
                                                title="Nenhum aporte para projetar."
                                                description="Com aportes registrados, a projeção de longo prazo aparece aqui."
                                                icon={TrendingUp}
                                            />
                                        ) : (
                                            <div role="img" aria-label={`Gráfico de linha da projeção de patrimônio por ano, estimada. Último ponto: ${advancedData.financial_freedom_projection[advancedData.financial_freedom_projection.length - 1].label}, ${formatarMoeda(advancedData.financial_freedom_projection[advancedData.financial_freedom_projection.length - 1].value)}.`} className="h-full w-full">
                                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                            <LineChart data={(advancedData?.financial_freedom_projection || []).map(p => ({ ...p, value: numero(p.value) }))} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                                                <CartesianGrid {...PROPS_DA_GRADE} />
                                                <XAxis dataKey="label" {...PROPS_DO_EIXO} />
                                                <YAxis {...PROPS_DO_EIXO} tickFormatter={formatarMoedaDoEixo} width={45} />
                                                <Tooltip
                                                    cursor={CURSOR_DO_TOOLTIP}
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <CaixaDoTooltip titulo={payload[0].payload.label}>
                                                                    <LinhaDoTooltip cor={COR_DO_PREVISTO} nome="Estimado" valor={formatarMoeda(payload[0].value as number)} />
                                                                </CaixaDoTooltip>
                                                            )
                                                        }
                                                        return null
                                                    }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke={COR_DO_PREVISTO}
                                                    strokeWidth={2}
                                                    strokeDasharray="5 5"
                                                    dot={false}
                                                    activeDot={PONTO_ATUAL}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                        </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Análise de Risco: alerta com a listra na cor do nível, sem fundo colorido */}
                                <Alert variant={VARIANTE_DO_RISCO[advancedData?.risk_analysis?.level ?? "Alta"]} role="status" className="lg:col-span-2">
                                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <h3 className="display-s">Análise de risco</h3>
                                            <Badge variant={advancedData?.risk_analysis?.level === 'Baixa' ? "info" : advancedData?.risk_analysis?.level === 'Média' ? "warning" : "destructive"}>
                                                {advancedData?.risk_analysis?.level ? `Nível ${advancedData.risk_analysis.level}` : "Nível em cálculo"}
                                            </Badge>
                                        </div>
                                        <AlertDescription className="max-w-2xl">
                                            {advancedData?.risk_analysis?.recommendation || "A análise de risco aparece quando houver lançamentos suficientes no período."}
                                            {advancedData?.risk_analysis?.sensitive_category && (
                                                <span className="label mt-2 block text-muted-foreground">
                                                    Fator de sensibilidade: {advancedData.risk_analysis.sensitive_category}
                                                </span>
                                            )}
                                        </AlertDescription>
                                    </div>
                                </Alert>
                            </div>
                            </>
                            )}

                            <p className="rounded-md border border-border px-4 py-3 text-center text-xs text-muted-foreground">
                                Os dados técnicos acima são baseados em projeções de mercado e análise de fluxo histórico.
                                Nenhuma informação constitui recomendação direta de investimento.
                            </p>
                        </div>
                    </RecursoBloqueado>
                </TabsContent>
            </Tabs>
            <RecursoBloqueado chave="monitor_de_foco">
            <FocusSelectionModal
                open={isSelectionModalOpen}
                onOpenChange={setIsSelectionModalOpen}
                onSuccess={fetchAdvanced}
            />
            </RecursoBloqueado>
        </div>
    )
}
