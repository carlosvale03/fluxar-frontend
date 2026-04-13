"use client"

import { useState, useEffect } from "react"
import { getDashboardSummary, getSimpleCharts, getMonthlyComparison } from "@/services/reports"
import { DashboardReport, SimpleChartsReport, MonthlyComparisonData } from "@/types/reports"
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs"
import { MonthlyComparisonChart } from "@/components/dashboard/MonthlyComparisonChart"
import { BudgetSummary } from "@/components/dashboard/BudgetSummary"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
    AlertCircle, 
    ChevronLeft, 
    ChevronRight, 
    CreditCard as CreditCardIcon, 
    Calendar, 
    LayoutDashboard, 
    PieChart as PieChartIcon, 
    Settings2, 
    Sparkles, 
    TrendingUp as TrendingUpIcon,
    TrendingDown,
    Target,
    Plus,
    ArrowUpCircle,
    ArrowDownCircle,
    ArrowRightLeft
} from "lucide-react"
import { MonthPicker } from "@/components/ui/month-picker"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HelpInfo } from "@/components/ui/help-info"
import { DashboardCustomizer, DashboardModuleConfig, getInitialConfig } from "@/components/dashboard/dashboard-customizer"
import { ChartEmptyState } from "@/components/dashboard/ChartEmptyState"
import { BarChart3, PieChart as PieIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import { TransferFormDialog } from "@/components/transactions/transfer-form-dialog"
import { CardExpenseFormDialog } from "@/components/transactions/card-expense-form-dialog"
import { InvoicePaymentDialog } from "@/components/transactions/invoice-payment-dialog"

const LARGE_MODULES = ["DAILY_CASH_FLOW", "BALANCE_EVOLUTION", "CREDIT_MANAGEMENT", "GOALS_JOURNEY"]
const MEDIUM_MODULES = ["EXPENSE_DISTRIBUTION", "INCOME_SOURCE"]
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

export default function DashboardPage() {
    const currentDate = new Date()
    const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())
    
    const [report, setReport] = useState<DashboardReport | null>(null)
    const [charts, setCharts] = useState<SimpleChartsReport | null>(null)
    const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparisonData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
    const [layoutConfig, setLayoutConfig] = useState<DashboardModuleConfig[]>([])
    const { toast } = useToast()

    // Transaction Dialog States
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isTransferOpen, setIsTransferOpen] = useState(false)
    const [isCardExpenseOpen, setIsCardExpenseOpen] = useState(false)
    const [isInvoicePaymentOpen, setIsInvoicePaymentOpen] = useState(false)
    const [formType, setFormType] = useState<"INCOME" | "EXPENSE">("INCOME")

    const handleOpenForm = (type: "INCOME" | "EXPENSE") => {
        setFormType(type)
        setIsFormOpen(true)
    }

    const handleFormSuccess = () => {
        fetchData()
    }

    useEffect(() => {
        setLayoutConfig(getInitialConfig())
    }, [])
    
    const fetchData = async () => {
        try {
            setIsLoading(true)
            const [reportData, chartsData, comparisonData] = await Promise.all([
                getDashboardSummary(selectedMonth, selectedYear),
                getSimpleCharts(undefined, selectedMonth, selectedYear),
                getMonthlyComparison(6, selectedMonth, selectedYear)
            ])
            
            const normalizedCharts = {
                income_vs_expense: chartsData?.income_vs_expense || [],
                expense_by_category: chartsData?.expense_by_category || [],
                income_by_category: chartsData?.income_by_category || []
            }
            
            setReport(reportData)
            setCharts(normalizedCharts)
            setMonthlyComparison(comparisonData)
        } catch (error) {
            console.error("Failed to fetch dashboard data", error)
            toast({
                title: "Erro ao carregar dashboard",
                description: "Não foi possível sincronizar seus dados financeiros agora.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleLayoutChange = (newConfig: DashboardModuleConfig[]) => {
        setLayoutConfig(newConfig)
        localStorage.setItem("dashboard_layout_config", JSON.stringify(newConfig))
        toast({
            title: "Layout atualizado",
            description: "Suas preferências foram salvas localmente."
        })
    }

    useEffect(() => {
        fetchData()
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

    if (isLoading) {
        return (
            <div className="container mx-auto py-10 px-4 space-y-8 max-w-7xl">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-[400px] lg:col-span-2 rounded-2xl" />
                    <Skeleton className="h-[400px] rounded-2xl" />
                </div>
            </div>
        )
    }

    if (!report) {
        return (
             <div className="container mx-auto py-20 px-4 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-bold">Ops! Algo deu errado.</h2>
                <p className="text-muted-foreground mt-2">Não conseguimos carregar as informações do seu painel.</p>
             </div>
        )
    }

    return (
        <div className="container mx-auto py-6 sm:py-10 px-2 sm:px-4 space-y-8 sm:space-y-10 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header com Contexto */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
                        Dashboard
                    </h1>
                    <p className="text-sm font-bold text-muted-foreground/60 mt-1 uppercase tracking-widest">
                        Resumo Financeiro • {selectedMonth}/{selectedYear}
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 md:ml-auto w-full md:w-auto justify-end">
                    <div className="flex items-center gap-1 sm:gap-2 bg-card p-1 sm:p-1.5 rounded-2xl sm:rounded-2xl border border-border/60 shadow-sm shrink-0">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl hover:bg-primary/10 transition-all active:scale-90"
                            onClick={handlePrevMonth}
                        >
                            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        
                        <div className="px-1 sm:px-2">
                            <MonthPicker 
                                currentMonth={selectedMonth}
                                currentYear={selectedYear}
                                onSelect={(month: number, year: number) => {
                                    setSelectedMonth(month)
                                    setSelectedYear(year)
                                }}
                            />
                        </div>

                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl hover:bg-primary/10 transition-all active:scale-90"
                            onClick={handleNextMonth}
                        >
                            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center p-0 shrink-0"
                            >
                                <Plus className="h-6 w-6" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-border/40 bg-background/95 backdrop-blur-xl">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-3 py-2">Nova Transação</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenForm("INCOME")} className="rounded-xl flex items-center gap-3 p-3 cursor-pointer group hover:bg-emerald-500/10 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                                </div>
                                <span className="font-bold text-sm">Receita</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenForm("EXPENSE")} className="rounded-xl flex items-center gap-3 p-3 cursor-pointer group hover:bg-rose-500/10 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <ArrowDownCircle className="h-4 w-4 text-rose-500" />
                                </div>
                                <span className="font-bold text-sm">Despesa</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsTransferOpen(true)} className="rounded-xl flex items-center gap-3 p-3 cursor-pointer group hover:bg-blue-500/10 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                                </div>
                                <span className="font-bold text-sm">Transferência</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsCardExpenseOpen(true)} className="rounded-xl flex items-center gap-3 p-3 cursor-pointer group hover:bg-amber-500/10 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <CreditCardIcon className="h-4 w-4 text-amber-500" />
                                </div>
                                <span className="font-bold text-sm">Gasto no Cartão</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button 
                        variant="outline" 
                        size="icon"
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl border-dashed border-2 bg-card border-border/60 hover:bg-muted/30 hover:border-primary/20 hover:text-primary transition-all duration-300 shadow-sm shrink-0"
                        onClick={() => setIsCustomizerOpen(true)}
                    >
                        <Settings2 className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                </div>
            </div>

            {/* KPIs de Balanço */}
            <DashboardKPIs data={report.summary} />

            {/* SEÇÃO DINÂMICA: Módulos Personalizáveis */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {getAdaptiveLayout(layoutConfig.filter(m => m.visible)).map(({ module, span }) => {
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
                                <Card key={module.id} className={cn(spanClass, "border border-border/60 bg-card hover:bg-muted/30 hover:border-primary/20 transition-all shadow-md hover:shadow-lg rounded-[32px] overflow-hidden")}>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2 text-wrap">
                                        <div className="min-w-0">
                                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
                                                <TrendingUpIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                                                <span className="truncate">Fluxo de Caixa Diário</span>
                                                <HelpInfo topic="DAILY_CASH_FLOW" />
                                            </CardTitle>
                                            <p className="text-[10px] font-medium text-muted-foreground mt-0.5 truncate uppercase tracking-widest opacity-50">Entradas e saídas acumuladas</p>
                                        </div>
                                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--finance-income)' }} />
                                                <span className="text-[8px] font-bold uppercase tracking-wider opacity-60 hidden xs:inline">Receita</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--finance-expense)' }} />
                                                <span className="text-[8px] font-bold uppercase tracking-wider opacity-60 hidden xs:inline">Despesa</span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="h-[300px] sm:h-[400px] pt-6 px-2 sm:px-6">
                                        {(!charts?.income_vs_expense || charts.income_vs_expense.length === 0 || charts.income_vs_expense.every(d => d.income === 0 && d.expense === 0)) ? (
                                            <ChartEmptyState 
                                                type="bar" 
                                                height="100%" 
                                                title="Fluxo de Caixa Diário"
                                                description="Suas entradas e saídas diárias aparecerão aqui."
                                                icon={BarChart3}
                                            />
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart 
                                                    data={charts?.income_vs_expense || []} 
                                                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                                                    barGap={8}
                                                >
                                                    <defs>
                                                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="var(--finance-income)" stopOpacity={0.8}/>
                                                            <stop offset="100%" stopColor="var(--finance-income)" stopOpacity={0.1}/>
                                                        </linearGradient>
                                                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="var(--finance-expense)" stopOpacity={0.8}/>
                                                            <stop offset="100%" stopColor="var(--finance-expense)" stopOpacity={0.1}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                                                    <XAxis 
                                                        dataKey="label" 
                                                        axisLine={false} 
                                                        tickLine={false} 
                                                        fontSize={10} 
                                                        fontWeight={800}
                                                        tick={{ fill: 'currentColor', opacity: 0.4 }}
                                                        dy={10}
                                                    />
                                                    <YAxis hide />
                                                    <Tooltip 
                                                        cursor={{ fill: 'currentColor', opacity: 0.05, radius: 12 }}
                                                        content={({ active, payload, label }) => {
                                                            if (active && payload && payload.length) {
                                                                return (
                                                                    <div className="z-50 bg-background/90 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 border-b border-border/50 pb-2">Dia {label}</p>
                                                                        <div className="space-y-3">
                                                                            {payload.map((entry: any, index: number) => (
                                                                                <div key={index} className="flex items-center justify-between gap-8">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                                        <span className="text-xs font-bold text-muted-foreground">{entry.name}</span>
                                                                                    </div>
                                                                                    <span className="text-xs font-black">
                                                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value)}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            }
                                                            return null
                                                        }}
                                                    />
                                                    <Bar dataKey="income" name="Receita" fill="url(#incomeGradient)" radius={[6, 6, 0, 0]} barSize={span < 12 ? 8 : 12} />
                                                    <Bar dataKey="expense" name="Despesa" fill="url(#expenseGradient)" radius={[6, 6, 0, 0]} barSize={span < 12 ? 8 : 12} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        case "MONTHLY_BALANCE":
                            return (
                                <MonthlyComparisonChart 
                                    key={module.id}
                                    data={monthlyComparison.length > 0 ? [monthlyComparison[monthlyComparison.length - 1]] : []} 
                                    title="Balanço Mensal"
                                    description="Resumo Ganhos vs Gastos"
                                    showNumericalLabels={span >= 6}
                                    height="100%"
                                    className={cn(spanClass, "h-full border border-border/60 bg-card hover:bg-muted/30 hover:border-primary/20 transition-all shadow-md hover:shadow-lg rounded-[32px] overflow-hidden")}
                                />
                            )
                        case "BALANCE_EVOLUTION":
                            return (
                                <MonthlyComparisonChart 
                                    key={module.id}
                                    data={monthlyComparison} 
                                    title="Evolução de Saldo"
                                    description={`Acompanhamento dos ${monthlyComparison.length} meses`}
                                    variant="line"
                                    height="100%"
                                    className={cn(spanClass, "h-full border border-border/60 bg-card hover:bg-muted/30 hover:border-primary/20 transition-all shadow-md hover:shadow-lg rounded-[32px] overflow-hidden")}
                                />
                            )
                        case "BUDGET_SUMMARY":
                            return (
                                <div key={module.id} className={spanClass}>
                                    <BudgetSummary data={report.budgets} />
                                </div>
                            )
                        case "EXPENSE_DISTRIBUTION":
                            return (
                                <Card key={module.id} className={cn(spanClass, "border border-border/60 bg-card hover:bg-muted/30 hover:border-primary/20 transition-all shadow-md hover:shadow-lg rounded-[32px] overflow-hidden")}>
                                    <CardHeader className="pb-0 pt-6">
                                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
                                            <TrendingDown className="h-4 w-4 text-rose-500" />
                                            Distribuição de Despesas
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-8 gap-8">
                                        <div className="w-full h-[250px] sm:w-[50%] relative">
                                            {(!charts?.expense_by_category || charts.expense_by_category.length === 0 || charts.expense_by_category.every(d => Number(d.amount) === 0)) ? (
                                                <ChartEmptyState 
                                                    type="pie" 
                                                    height="100%" 
                                                    title="Distribuição de Despesas"
                                                    description="Seus gastos por categoria aparecerão aqui."
                                                    icon={PieIcon}
                                                />
                                            ) : (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={charts?.expense_by_category || []}
                                                            cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8}
                                                            dataKey="amount" nameKey="category_name" stroke="none"
                                                        >
                                                            {charts?.expense_by_category?.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color || '#CBD5E1'} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip content={<CustomPieTooltip />} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            )}
                                            {charts?.expense_by_category && charts.expense_by_category.length > 0 && charts.expense_by_category.some(d => Number(d.amount) > 0) && (
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none animate-in fade-in duration-500">
                                                    <span className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Gasto Total</span>
                                                    <span className="block text-xl font-black text-foreground">{formatCurrencyShort(charts?.expense_by_category?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-full sm:w-[45%] space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                            {(!charts?.expense_by_category || charts.expense_by_category.length === 0 || charts.expense_by_category.every(d => Number(d.amount) === 0)) ? (
                                                Array.from({ length: 5 }).map((_, i) => (
                                                    <div key={`ghost-exp-${i}`} className="flex items-center justify-between p-2 rounded-xl opacity-20 select-none pointer-events-none">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted-foreground/40" />
                                                            <div className="h-2 w-20 bg-muted-foreground/20 rounded-full" />
                                                        </div>
                                                        <div className="h-2 w-12 bg-muted-foreground/20 rounded-full" />
                                                    </div>
                                                ))
                                            ) : (
                                                charts?.expense_by_category?.slice(0, 6).map((item, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                            <span className="text-xs font-bold text-muted-foreground truncate max-w-[100px]">{item.category_name}</span>
                                                        </div>
                                                        <span className="text-xs font-black text-foreground">{formatCurrencyShort(Number(item.amount))}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        case "INCOME_SOURCE":
                            return (
                                <Card key={module.id} className={cn(spanClass, "border border-border/60 bg-card hover:bg-muted/30 hover:border-primary/20 transition-all shadow-md hover:shadow-lg rounded-[32px] overflow-hidden")}>
                                    <CardHeader className="pb-0 pt-6">
                                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
                                            <TrendingUpIcon className="h-4 w-4 text-emerald-500" />
                                            Origem dos Ganhos
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-8 gap-8">
                                        <div className="w-full h-[250px] sm:w-[50%] relative">
                                            {(!charts?.income_by_category || charts.income_by_category.length === 0 || charts.income_by_category.every(d => Number(d.amount) === 0)) ? (
                                                <ChartEmptyState 
                                                    type="pie" 
                                                    height="100%" 
                                                    title="Origem dos Ganhos"
                                                    description="Suas fontes de receita aparecerão aqui."
                                                    icon={PieIcon}
                                                />
                                            ) : (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={charts?.income_by_category || []}
                                                            cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8}
                                                            dataKey="amount" nameKey="category_name" stroke="none"
                                                        >
                                                            {charts?.income_by_category?.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color || '#CBD5E1'} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip content={<CustomPieTooltip />} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            )}
                                            {charts?.income_by_category && charts.income_by_category.length > 0 && charts.income_by_category.some(d => Number(d.amount) > 0) && (
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none animate-in fade-in duration-500">
                                                    <span className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Receita Total</span>
                                                    <span className="block text-xl font-black text-foreground">{formatCurrencyShort(charts?.income_by_category?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-full sm:w-[45%] space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                            {(!charts?.income_by_category || charts.income_by_category.length === 0 || charts.income_by_category.every(d => Number(d.amount) === 0)) ? (
                                                Array.from({ length: 5 }).map((_, i) => (
                                                    <div key={`ghost-inc-${i}`} className="flex items-center justify-between p-2 rounded-xl opacity-20 select-none pointer-events-none">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted-foreground/40" />
                                                            <div className="h-2 w-20 bg-muted-foreground/20 rounded-full" />
                                                        </div>
                                                        <div className="h-2 w-12 bg-muted-foreground/20 rounded-full" />
                                                    </div>
                                                ))
                                            ) : (
                                                charts?.income_by_category?.slice(0, 6).map((item, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                            <span className="text-xs font-bold text-muted-foreground truncate max-w-[100px]">{item.category_name}</span>
                                                        </div>
                                                        <span className="text-xs font-black text-foreground">{formatCurrencyShort(Number(item.amount))}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        case "CREDIT_MANAGEMENT":
                            return (
                                <div key={module.id} className={cn(spanClass, "space-y-6")}>
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                            <CreditCardIcon className="h-5 w-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-xl font-black tracking-tight uppercase">Gestão de Crédito</h2>
                                                <HelpInfo topic="CREDIT_MANAGEMENT" iconClassName="h-4 w-4" />
                                            </div>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Faturas e limites</p>
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "grid grid-cols-1 gap-6",
                                        span >= 12 ? "md:grid-cols-2 lg:grid-cols-3" : (span >= 8 ? "md:grid-cols-2" : "md:grid-cols-1")
                                    )}>
                                        {report.credit_cards?.map((card) => {
                                            const usagePercentage = Math.min((Number(card.current_invoice) / Number(card.limit)) * 100, 100)
                                            const isNearLimit = usagePercentage > 80
                                            
                                            return (
                                                <Card key={card.id} className="border border-border/60 bg-card shadow-md hover:shadow-lg rounded-2xl overflow-hidden group hover:border-amber-500/30 transition-all duration-500 py-2">
                                                    <CardContent className="p-6 space-y-6">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
                                                                    <CreditCardIcon className="h-5 w-5" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-base font-black tracking-tight truncate max-w-[120px]">{card.name}</h3>
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">{card.institution}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-muted-foreground/60 shrink-0">
                                                                <Calendar className="h-3 w-3" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest">vence {card.due_day}</span>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <p className="text-lg font-black text-amber-500">{formatCurrencyShort(card.current_invoice)}</p>
                                                            </div>
                                                            <div className="space-y-1 text-right">
                                                                <p className="text-lg font-black text-emerald-500">{formatCurrencyShort(card.available_limit)}</p>
                                                            </div>
                                                        </div>

                                                        <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
                                                            <div className={cn("h-full transition-all duration-1000", isNearLimit ? "bg-rose-500" : "bg-amber-500")} style={{ width: `${usagePercentage}%` }} />
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        case "GOALS_JOURNEY":
                            return report.goals ? (
                                <Card key={module.id} className={cn(spanClass, "border border-border/60 bg-card hover:bg-muted/30 hover:border-primary/20 transition-all shadow-md hover:shadow-lg rounded-[32px] overflow-hidden p-8")}>
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-14 h-14 rounded-[20px] bg-primary/10 flex items-center justify-center">
                                            <Target className="h-7 w-7 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tight uppercase">Metas</h2>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-50">Objetivos financeiros</p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "grid grid-cols-1 gap-8 p-6 bg-primary/5 rounded-[28px] border border-primary/10",
                                        span >= 12 ? "lg:grid-cols-4" : (span >= 8 ? "md:grid-cols-2 lg:grid-cols-2" : "grid-cols-1")
                                    )}>
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 border-b border-primary/20 pb-1 block">Ativas</span>
                                            <p className="text-4xl font-black pt-2 text-foreground">{report.goals?.active_count ?? 0}</p>
                                        </div>
                                        <div className={cn("space-y-2", span >= 12 ? "lg:col-span-2" : "")}>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 border-b border-primary/20 pb-1 block">Progresso</span>
                                            <div className="pt-3">
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-2xl font-black text-primary">{(report.goals?.average_progress ?? 0).toFixed(1)}%</span>
                                                </div>
                                                <div className="h-3 w-full bg-primary/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${report.goals?.average_progress ?? 0}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <Button className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground">
                                                Ver metas
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ) : null
                        default:
                            return null
                    }
                })}
            </div>

            {/* Footer de Respiro */}
            <div className="py-10 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30 flex items-center justify-center gap-2">
                    <Sparkles className="h-3 w-3" />
                    Fluxar IA • Seu parceiro financeiro
                </p>
            </div>

            <DashboardCustomizer 
                open={isCustomizerOpen}
                onOpenChange={setIsCustomizerOpen}
                config={layoutConfig}
                onConfigChange={handleLayoutChange}
            />

            {/* Diálogos de Transação */}
            <TransactionFormDialog 
                open={isFormOpen} 
                onOpenChange={setIsFormOpen}
                type={formType}
                onSuccess={handleFormSuccess}
            />

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
        </div>
    )
}

// Helpers Compactos
function formatCurrencyShort(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

function CustomPieTooltip({ active, payload }: any) {
    if (active && payload && payload.length) {
        const data = payload[0].payload
        return (
            <div className="z-50 bg-background/95 backdrop-blur-2xl border border-border/50 p-3 rounded-2xl shadow-2xl ring-1 ring-black/5">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                    <span className="text-sm font-black uppercase tracking-tight">{data.category_name}</span>
                </div>
                <p className="text-xs font-bold text-muted-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.amount)}
                </p>
            </div>
        )
    }
    return null
}
