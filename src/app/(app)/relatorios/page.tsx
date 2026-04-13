"use client"

import { useState, useEffect } from "react"
import { format, getDaysInMonth, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getSimpleCharts, getAdvancedCharts, getMonthlyComparison, getDashboardSummary } from "@/services/reports"
import { SimpleChartsReport, AdvancedChartsReport, MonthlyComparisonData, DashboardReport } from "@/types/reports"
import { MonthlyComparisonChart } from "@/components/dashboard/MonthlyComparisonChart"
import { useAuth } from "@/contexts/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartEmptyState } from "@/components/dashboard/ChartEmptyState"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import { AccountType } from "@/types/accounts"
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    LineChart, Line, AreaChart, Area,
    PieChart, Pie, Cell,
    ScatterChart, Scatter, ZAxis
} from 'recharts'
import { Lock, Sparkles, TrendingUp, Wallet, Calendar, Filter, Zap, Brain, ShieldCheck, Target, Activity, Clock, ArrowUpRight, ArrowDownRight, BarChart3, PieChart as PieIcon, Eye, Plus, Search, Trash2, Tag as TagIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FocusSelectionModal } from "@/components/reports/focus-selection-modal"
import { deleteFocusedMonitor } from "@/services/focused-monitors"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { LucideIcon } from "@/components/ui/icon-picker"
import { HelpInfo } from "@/components/ui/help-info"

export default function ReportsPage() {
    const { user } = useAuth()
    const [simpleData, setSimpleData] = useState<SimpleChartsReport | null>(null)
    const [advancedData, setAdvancedData] = useState<AdvancedChartsReport | null>(null)
    const [summaryData, setSummaryData] = useState<DashboardReport | null>(null)
    const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparisonData[]>([])
    const [isLoadingSimple, setIsLoadingSimple] = useState(true)
    const [isLoadingAdvanced, setIsLoadingAdvanced] = useState(false)
    const [isLoadingSummary, setIsLoadingSummary] = useState(true)
    const [isLoadingComparison, setIsLoadingComparison] = useState(true)
    const [period, setPeriod] = useState("this_month")
    const [activeTab, setActiveTab] = useState("simple")
    const [activePieIndex, setActivePieIndex] = useState<number | null>(null)
    const [selectedDailyMonth, setSelectedDailyMonth] = useState<string | null>(null)
    const [completeDailyData, setCompleteDailyData] = useState<any[]>([])

    // New states for modals
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false)

    // TODO: Reverter para checks reais (user?.plan === "premium"...) após os testes
    const isPremium = user?.plan === "PREMIUM" || user?.plan === "PREMIUM_PLUS"

    // Fetch simple data on mount

    useEffect(() => {
        const fetchSimple = async () => {
            setIsLoadingSimple(true)
            try {
                const data = await getSimpleCharts(period)
                console.log("DEBUG: simpleCharts data:", data)
                setSimpleData(data)
            } catch (error) {
                console.error("Failed to fetch simple charts", error)
            } finally {
                setIsLoadingSimple(false)
            }
        }
        
        const fetchComparison = async () => {
            setIsLoadingComparison(true)
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
                console.error("Failed to fetch monthly comparison", error)
            } finally {
                setIsLoadingComparison(false)
            }
        }

        const fetchSummary = async () => {
            setIsLoadingSummary(true)
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
                console.error("Failed to fetch dashboard summary", error)
            } finally {
                setIsLoadingSummary(false)
            }
        }

        fetchSimple()
        fetchComparison()
        fetchSummary()
    }, [period])

    // Reset seletor diário quando os dados mudarem
    useEffect(() => {
        if (simpleData?.income_vs_expense && simpleData.income_vs_expense.length > 0) {
            // Pegar o último mês disponível por padrão
            const lastDate = (simpleData.income_vs_expense as any[])
                .filter(d => d.full_date)
                .map(d => d.full_date)
                .sort()
                .pop();
            
            if (lastDate) {
                const monthStr = lastDate.substring(0, 7); // YYYY-MM
                setSelectedDailyMonth(monthStr);
            }
        }
    }, [simpleData])

    const availableDailyMonths = Array.from(new Set(
        (simpleData?.income_vs_expense as any[])?.filter(d => d.full_date).map(d => d.full_date.substring(0, 7)) || []
    )).sort();

    const filteredDailyData = simpleData?.income_vs_expense?.filter((d: any) => 
        !selectedDailyMonth || (d.full_date && d.full_date.startsWith(selectedDailyMonth))
    ) || [];

    // Gerar dados completos para todos os dias do mês
    useEffect(() => {
        if (!selectedDailyMonth) {
            setCompleteDailyData([]);
            return;
        }

        try {
            const [year, month] = selectedDailyMonth.split('-').map(Number);
            const daysInMonth = getDaysInMonth(new Date(year, month - 1));
            
            const fullMonth = Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${selectedDailyMonth}-${day.toString().padStart(2, '0')}`;
                
                // Encontrar dado existente para este dia
                const existingDayData = filteredDailyData.find((d: any) => d.full_date === dateStr);
                
                return {
                    label: day.toString(),
                    income: existingDayData?.income || 0,
                    expense: existingDayData?.expense || 0,
                    full_date: dateStr
                };
            });

            setCompleteDailyData(fullMonth);
        } catch (error) {
            console.error("Erro ao gerar dados mensais completos:", error);
            setCompleteDailyData(filteredDailyData);
        }
    }, [selectedDailyMonth, simpleData?.income_vs_expense]);

    const fetchAdvanced = async () => {
        if (!isPremium) return
        setIsLoadingAdvanced(true)
        try {
            const data = await getAdvancedCharts(period)
            console.log("Relatórios Avançados - Resposta:", data)
            setAdvancedData(data)
        } catch (error) {
            console.error("Failed to fetch advanced charts", error)
        } finally {
            setIsLoadingAdvanced(false)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

    return (
        <div className="container mx-auto py-6 sm:py-10 px-0 sm:px-4 max-w-7xl space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="px-4 sm:px-0">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
                        Relatórios e Gráficos
                        {isPremium && <Badge className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-200 dark:border-amber-900/50 rounded-full text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 h-auto">Premium</Badge>}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1 text-balance">Análise detalhada do seu comportamento financeiro.</p>
                </div>

                <div className="mx-4 sm:mx-0 relative flex items-center p-1 bg-card border border-border/60 rounded-full shadow-md group/filter transition-all duration-300 hover:border-primary/20 overflow-x-auto no-scrollbar scroll-smooth">
                    <div className="absolute inset-1 z-0 pointer-events-none">
                        <div 
                            className="h-full bg-primary shadow-lg shadow-primary/20 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                            style={{
                                width: `${100 / 5}%`,
                                transform: `translateX(${["this_month", "last_30_days", "last_90_days", "last_6_months", "this_year"].indexOf(period) * 100}%)`,
                            }}
                        />
                    </div>
                    {[
                        { label: "Mês", mobileLabel: "Mês", value: "this_month" },
                        { label: "30 Dias", mobileLabel: "30D", value: "last_30_days" },
                        { label: "90 Dias", mobileLabel: "90D", value: "last_90_days" },
                        { label: "6 Meses", mobileLabel: "6M", value: "last_6_months" },
                        { label: "Ano", mobileLabel: "Ano", value: "this_year" },
                    ].map((p) => (
                        <button 
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={cn(
                                "relative z-10 flex-1 px-3 sm:px-4 py-2.5 text-[9px] sm:text-xs font-black uppercase tracking-[0.1em] transition-all duration-500 rounded-[20px] whitespace-nowrap cursor-pointer min-w-[60px] sm:min-w-fit",
                                period === p.value 
                                    ? "text-primary-foreground scale-105" 
                                    : "text-muted-foreground hover:text-primary opacity-60 hover:opacity-100"
                            )}
                        >
                            <span className="hidden sm:inline">{p.label}</span>
                            <span className="sm:hidden">{p.mobileLabel}</span>
                        </button>
                    ))}
                </div>
            </div>

            <Tabs value={activeTab} className="w-full" onValueChange={(val) => {
                setActiveTab(val)
                if (val === 'advanced') fetchAdvanced()
            }}>
                <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-muted/30 p-1 rounded-2xl h-12">
                    <TabsTrigger value="simple" className="rounded-xl font-bold text-sm data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
                        Fundamentais
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="rounded-xl font-bold text-sm data-[state=active]:bg-background data-[state=active]:shadow-md transition-all flex items-center gap-2">
                        Avançados {/* TODO: Reverter cadeado após testes - {!isPremium && <Lock className="h-3 w-3 opacity-50" />} */}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="simple" className="mt-8 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Restore Daily Cash Flow */}
                        <Card className="border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 transition-all rounded-[32px] overflow-hidden">
                            <CardHeader>
                                <div className="flex items-center justify-between w-full pr-4">
                                    <CardTitle className="text-base font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" style={{ color: 'var(--finance-income)' }} />
                                        Fluxo de Caixa Diário
                                    </CardTitle>
                                    
                                    {availableDailyMonths.length > 1 && (
                                        <div className="flex items-center gap-2 bg-background/50 backdrop-blur-md p-1 rounded-xl border border-border/50">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7 rounded-lg"
                                                disabled={availableDailyMonths.indexOf(selectedDailyMonth || '') === 0}
                                                onClick={() => {
                                                    const idx = availableDailyMonths.indexOf(selectedDailyMonth || '');
                                                    if (idx > 0) setSelectedDailyMonth(availableDailyMonths[idx - 1]);
                                                }}
                                            >
                                                <ArrowUpRight className="h-4 w-4 rotate-[-135deg]" />
                                            </Button>
                                            
                                            <span className="text-[10px] font-black uppercase tracking-tighter px-2 min-w-[70px] text-center">
                                                {selectedDailyMonth ? format(new Date(selectedDailyMonth + "-01T00:00:00"), "MMM/yy", { locale: ptBR }) : '-'}
                                            </span>

                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7 rounded-lg"
                                                disabled={availableDailyMonths.indexOf(selectedDailyMonth || '') === availableDailyMonths.length - 1}
                                                onClick={() => {
                                                    const idx = availableDailyMonths.indexOf(selectedDailyMonth || '');
                                                    if (idx < availableDailyMonths.length - 1) setSelectedDailyMonth(availableDailyMonths[idx + 1]);
                                                }}
                                            >
                                                <ArrowUpRight className="h-4 w-4 rotate-[45deg]" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <CardDescription>Movimentação detalhada dia por dia</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] sm:h-[350px] pt-4 px-2 sm:px-6" style={{ minWidth: 0 }}>
                                {isLoadingSimple ? <Skeleton className="w-full h-full rounded-2xl" /> : (
                                    (!completeDailyData || completeDailyData.length === 0 || completeDailyData.every((d: any) => d.income === 0 && d.expense === 0)) ? (
                                        <ChartEmptyState 
                                            type="bar" 
                                            height="100%" 
                                            title="Fluxo de Caixa Diário"
                                            description="As movimentações diárias para este mês aparecerão aqui."
                                            icon={BarChart3}
                                        />
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <BarChart 
                                            data={completeDailyData}
                                            margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
                                            barGap={4}
                                        >
                                            <defs>
                                                <linearGradient id="incomeGradientDaily" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="var(--finance-income)" stopOpacity={0.8}/>
                                                    <stop offset="100%" stopColor="var(--finance-income)" stopOpacity={0.1}/>
                                                </linearGradient>
                                                <linearGradient id="expenseGradientDaily" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="var(--finance-expense)" stopOpacity={0.8}/>
                                                    <stop offset="100%" stopColor="var(--finance-expense)" stopOpacity={0.1}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: 'currentColor', opacity: 0.4 }} dy={10} />
                                            <YAxis hide />
                                            <Tooltip 
                                                cursor={{ fill: 'currentColor', opacity: 0.05, radius: 8 }}
                                                content={({ active, payload, label }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="z-50 bg-background/90 backdrop-blur-xl border border-border/50 p-3 rounded-xl shadow-2xl">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Dia {label}</p>
                                                                <div className="space-y-1">
                                                                    {payload.map((entry: any, index: number) => (
                                                                        <div key={index} className="flex items-center justify-between gap-4">
                                                                            <span className="text-[10px] font-bold text-muted-foreground">{entry.name}:</span>
                                                                            <span className="text-[10px] font-black">{formatCurrency(entry.value)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )
                                                    }
                                                    return null
                                                }}
                                            />
                                            <Bar dataKey="income" name="Receitas" fill="url(#incomeGradientDaily)" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="expense" name="Despesas" fill="url(#expenseGradientDaily)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                        </ResponsiveContainer>
                                    )
                                )}
                            </CardContent>
                        </Card>



                        {/* Restoration: Monthly Comparison */}
                        <MonthlyComparisonChart 
                            data={monthlyComparison} 
                            title="Balanço por Mês"
                            description="Ganhos vs Gastos Histórico"
                            variant="bars"
                            height={350}
                        />

                        {/* Balance Evolution Line */}
                        <MonthlyComparisonChart 
                            data={monthlyComparison} 
                            title="Evolução de Saldo"
                            description="Receita - Despesa acumulada"
                            variant="line"
                            height={350}
                            className="lg:col-span-2"
                        />

                        <Card className="border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 transition-all rounded-[32px] overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-base font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Wallet className="h-4 w-4 text-blue-500" />
                                    Distribuição de Gastos
                                </CardTitle>
                                <CardDescription>Percentual por categoria</CardDescription>
                            </CardHeader>
                            <CardContent className="h-auto min-h-[450px] sm:h-[400px] pt-4 flex flex-col sm:flex-row items-center">
                                {isLoadingSimple ? <Skeleton className="w-full h-full rounded-2xl" /> : (
                                    (!simpleData?.expense_by_category || simpleData.expense_by_category.length === 0 || simpleData.expense_by_category.every((d: any) => Number(d.amount) === 0)) ? (
                                        <ChartEmptyState 
                                            type="pie" 
                                            height="100%" 
                                            title="Distribuição de Gastos"
                                            description="Seus gastos por categoria aparecerão aqui."
                                            icon={PieIcon}
                                        />
                                    ) : (
                                        <>
                                            <div className="w-full h-[300px] sm:h-full relative" style={{ minWidth: 0 }}>
                                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                                <PieChart>
                                                    <Pie
                                                        data={simpleData?.expense_by_category || []}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={70}
                                                        outerRadius={100}
                                                        paddingAngle={8}
                                                        dataKey="amount"
                                                        nameKey="category_name"
                                                        stroke="none"
                                                    >
                                                        {simpleData?.expense_by_category?.map((entry: any, index: number) => (
                                                            <Cell 
                                                                key={`cell-${index}`} 
                                                                fill={entry.color || COLORS[index % COLORS.length]} 
                                                                className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                                                                style={{ filter: `drop-shadow(0 4px 6px ${entry.color || COLORS[index % COLORS.length]}22)` }}
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        wrapperStyle={{ zIndex: 100 }}
                                                        content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                const data = payload[0].payload
                                                                return (
                                                                    <div className="z-50 bg-background/95 backdrop-blur-2xl border border-border/50 p-3 rounded-2xl shadow-2xl ring-1 ring-black/5">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color || COLORS[payload[0].index % COLORS.length] }} />
                                                                            <span className="text-sm font-black">{data.category_name}</span>
                                                                        </div>
                                                                        <p className="text-xs font-bold text-muted-foreground">
                                                                            {formatCurrency(data.amount)}
                                                                        </p>
                                                                    </div>
                                                                )
                                                            }
                                                            return null
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0">
                                                <span className="block text-[10px] font-black uppercase tracking-tighter text-muted-foreground opacity-50">Total</span>
                                                <span className="block text-xl font-black">{formatCurrency(simpleData?.expense_by_category?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0)}</span>
                                            </div>
                                        </div>
                                        <div className="w-full sm:w-[300px] space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar mt-4 sm:mt-0">
                                            {simpleData?.expense_by_category?.map((item: any, index: number) => (
                                                <div key={index} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors group cursor-default">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }} />
                                                        <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[120px]">
                                                            {item.category_name}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-black">{formatCurrency(item.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                    )
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 transition-all rounded-[32px] overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-base font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-emerald-500" />
                                    Distribuição de Ganhos
                                </CardTitle>
                                <CardDescription>Origem das receitas por categoria</CardDescription>
                            </CardHeader>
                            <CardContent className="h-auto min-h-[450px] sm:h-[400px] pt-4 flex flex-col sm:flex-row items-center">
                                {isLoadingSimple ? <Skeleton className="w-full h-full rounded-2xl" /> : (
                                    (!simpleData?.income_by_category || simpleData.income_by_category.length === 0 || simpleData.income_by_category.every((d: any) => Number(d.amount) === 0)) ? (
                                        <ChartEmptyState 
                                            type="pie" 
                                            height="100%" 
                                            title="Distribuição de Ganhos"
                                            description="Sua origem de receitas aparecerão aqui."
                                            icon={PieIcon}
                                        />
                                    ) : (
                                        <>
                                            <div className="w-full h-[300px] sm:h-full relative" style={{ minWidth: 0 }}>
                                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                                <PieChart>
                                                    <Pie
                                                        data={simpleData?.income_by_category || []}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={70}
                                                        outerRadius={100}
                                                        paddingAngle={8}
                                                        dataKey="amount"
                                                        nameKey="category_name"
                                                        stroke="none"
                                                    >
                                                        {simpleData?.income_by_category?.map((entry: any, index: number) => (
                                                            <Cell 
                                                                key={`cell-${index}`} 
                                                                fill={entry.color || COLORS[index % COLORS.length]} 
                                                                className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                                                                style={{ filter: `drop-shadow(0 4px 6px ${entry.color || COLORS[index % COLORS.length]}22)` }}
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        wrapperStyle={{ zIndex: 100 }}
                                                        content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                const data = payload[0].payload
                                                                return (
                                                                    <div className="z-50 bg-background/95 backdrop-blur-2xl border border-border/50 p-3 rounded-2xl shadow-2xl ring-1 ring-black/5">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color || COLORS[payload[0].index % COLORS.length] }} />
                                                                            <span className="text-sm font-black">{data.category_name}</span>
                                                                        </div>
                                                                        <p className="text-xs font-bold text-muted-foreground">
                                                                            {formatCurrency(data.amount)}
                                                                        </p>
                                                                    </div>
                                                                )
                                                            }
                                                            return null
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0">
                                                <span className="block text-[10px] font-black uppercase tracking-tighter text-muted-foreground opacity-50">Total</span>
                                                <span className="block text-xl font-black">{formatCurrency(simpleData?.income_by_category?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0)}</span>
                                            </div>
                                        </div>
                                        <div className="w-full sm:w-[300px] space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar mt-4 sm:mt-0">
                                            {simpleData?.income_by_category?.map((item: any, index: number) => (
                                                <div key={index} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors group cursor-default">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }} />
                                                        <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[120px]">
                                                            {item.category_name}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-black">{formatCurrency(item.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                    )
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="advanced" className="mt-8 space-y-8">
                    {/* TODO: Reverter condicional de bloqueio após os testes */}
                    {false && !isPremium ? (
                        <Card className="border-none shadow-2xl rounded-[40px] overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 text-white">
                            <CardContent className="p-12 sm:p-20 text-center flex flex-col items-center gap-8">
                                <div className="w-24 h-24 rounded-[32px] bg-white/20 backdrop-blur-md flex items-center justify-center animate-pulse">
                                    <Sparkles className="h-12 w-12 text-amber-300" />
                                </div>
                                <div className="space-y-3 max-w-xl">
                                    <h2 className="text-4xl font-black tracking-tight">Desbloqueie o Poder dos Dados</h2>
                                    <p className="text-indigo-100 text-lg">
                                        Gráficos de evolução de patrimônio, análise de frequência e tendências avançadas estão disponíveis apenas para assinantes **Premium**.
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                                    <Button className="h-14 px-10 rounded-2xl bg-white text-indigo-600 hover:bg-white/90 font-black text-lg shadow-xl shadow-black/20 transition-all hover:scale-105 active:scale-95">
                                        Assinar Premium Agora
                                    </Button>
                                    <Button variant="ghost" className="h-14 px-8 rounded-2xl text-white hover:bg-white/10 font-bold border border-white/20">
                                        Ver Benefícios
                                    </Button>
                                </div>
                                <p className="text-xs text-indigo-200 mt-2 opacity-70">Cancele quando quiser. Planos a partir de R$ 19,90/mês.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-8">
                            {/* ELITE KPI ROW */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-card border border-border/60 p-6 rounded-2xl shadow-md flex flex-col justify-between group hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Poder de Aporte</p>
                                            <HelpInfo topic="SAVINGS_RATE" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-2xl font-black">
                                                {isLoadingSummary ? "..." : `${summaryData?.summary.savings_rate ?? 0}%`}
                                            </h3>
                                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-900/50 rounded-full text-[10px] font-black uppercase tracking-widest px-2 h-auto py-0.5">Saudável</Badge>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-border/10 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-muted-foreground">vs média anual</span>
                                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                                    </div>
                                </div>

                                <div className="bg-card border border-border/60 p-6 rounded-2xl shadow-md flex flex-col justify-between group hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Liquidez Imediata</p>
                                            <HelpInfo topic="LIQUIDITY_RATIO" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-2xl font-black">
                                                {isLoadingSummary ? "..." : formatCurrency(summaryData?.summary.total_liquid_balance ?? 0)}
                                            </h3>
                                            <span className="text-[10px] bg-blue-500/10 text-blue-600 border border-blue-200 dark:border-blue-900/50 rounded-full px-2 py-0.5 font-black uppercase tracking-widest">Reserva OK</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-border/10">
                                        <div className="w-full bg-muted/30 h-1 rounded-full overflow-hidden">
                                            <div 
                                                className="bg-blue-500 h-full transition-all duration-1000" 
                                                style={{ width: `${Math.min(((summaryData?.summary.liquidity_ratio ?? 0) / 6) * 100, 100)}%` }} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-card border border-border/60 p-6 rounded-2xl shadow-md flex flex-col justify-between group hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Score de Saúde</p>
                                            <HelpInfo topic="FINANCIAL_SCORE" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-2xl font-black text-emerald-500">
                                                {isLoadingSummary ? "..." : `${summaryData?.summary.financial_score ?? 0}/100`}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-border/10">
                                        <span className="text-[10px] font-black uppercase text-emerald-500/60 tracking-wider">
                                            { (summaryData?.summary.financial_score ?? 0) > 80 ? "Perfil Investidor Alpha" : "Em Evolução" }
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-card border border-border/60 p-6 rounded-2xl shadow-md flex flex-col justify-between group hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Próximo Grande Gasto</p>
                                            <HelpInfo topic="NEXT_BIG_EXPENSE" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-2xl font-black text-amber-500">
                                                {advancedData?.next_big_expense ? formatCurrency(advancedData.next_big_expense.amount) : "---"}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-border/10">
                                        <span className="text-[10px] font-bold text-muted-foreground">
                                            {advancedData?.next_big_expense 
                                                ? `Previsão: ${format(new Date(advancedData.next_big_expense.date), 'dd/MM/yyyy')}`
                                                : "Nenhuma previsão de alto valor"
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* INVESTMENTS SECTION */}
                            <div className="grid grid-cols-1 gap-8 pt-4">
                                <Card className="border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 transition-all rounded-[40px] overflow-hidden">
                                    <CardHeader className="p-8 pb-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                                                    <Target className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <CardTitle className="text-2xl font-black tracking-tight">Análise Patrimonial</CardTitle>
                                                        <HelpInfo topic="INVESTMENT_ANALYSIS" iconClassName="h-4 w-4" />
                                                    </div>
                                                    <CardDescription>
                                                        Consolidação automática de contas do tipo 
                                                        <Badge variant="secondary" className="font-mono text-[10px] ml-1">investimento</Badge>
                                                        {advancedData?.investment_analysis?.has_investments_account && (
                                                            <span className="text-emerald-500 ml-2 font-bold flex items-center gap-1 inline-flex">
                                                                <ShieldCheck className="h-3 w-3" /> Monitorando {advancedData.investment_analysis.asset_allocation.length} contas
                                                            </span>
                                                        )}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            {!advancedData?.investment_analysis?.has_investments_account && (
                                                <AccountFormDialog 
                                                    defaultType={AccountType.INVESTMENT}
                                                    onSuccess={() => {
                                                        setIsLoadingAdvanced(true);
                                                        getAdvancedCharts(period).then(setAdvancedData).finally(() => setIsLoadingAdvanced(false));
                                                        getDashboardSummary(new Date().getMonth() + 1, new Date().getFullYear()).then(setSummaryData);
                                                    }}
                                                    trigger={
                                                        <Button size="sm" className="rounded-xl font-black text-xs gap-2">
                                                            <Plus className="h-4 w-4" /> Criar Conta de Investimento
                                                        </Button>
                                                    }
                                                />
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8">
                                        {!advancedData?.investment_analysis?.has_investments_account ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-muted/5 rounded-[32px] border border-dashed border-border/40">
                                                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground/40">
                                                    <Search className="h-8 w-8" />
                                                </div>
                                                <div className="max-w-md px-6">
                                                    <h4 className="text-lg font-black">Nenhuma conta de investimento ativa</h4>
                                                    <p className="text-sm text-muted-foreground mt-2">
                                                        Cadastre suas contas da corretora ou banco (tipo **Investimento**) para separar seus aportes patrimoniais do seu fluxo de caixa mensal.
                                                    </p>
                                                    <AccountFormDialog 
                                                        defaultType={AccountType.INVESTMENT}
                                                        onSuccess={() => {
                                                            setIsLoadingAdvanced(true);
                                                            getAdvancedCharts(period).then(setAdvancedData).finally(() => setIsLoadingAdvanced(false));
                                                            getDashboardSummary(new Date().getMonth() + 1, new Date().getFullYear()).then(setSummaryData);
                                                        }}
                                                        trigger={
                                                            <Button variant="outline" className="rounded-xl font-bold mt-4">Configurar Contas Agora</Button>
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                                {/* PIE ALLOCATION */}
                                                <div className="lg:col-span-1 space-y-6">
                                                    <div className="h-[250px] relative" style={{ minWidth: 0 }}>
                                                        {(!advancedData.investment_analysis.asset_allocation || advancedData.investment_analysis.asset_allocation.length === 0) ? (
                                                            <ChartEmptyState 
                                                                type="pie" 
                                                                height="100%" 
                                                                title="Alocação"
                                                                description="Dados de ativos."
                                                                icon={PieIcon}
                                                            />
                                                        ) : (
                                                            <>
                                                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                                                    <PieChart>
                                                                            <Pie
                                                                                data={advancedData.investment_analysis.asset_allocation}
                                                                                innerRadius={70}
                                                                                outerRadius={activePieIndex !== null ? 95 : 90}
                                                                                paddingAngle={8}
                                                                                dataKey="value"
                                                                                onMouseEnter={(_, index) => setActivePieIndex(index)}
                                                                                onMouseLeave={() => setActivePieIndex(null)}
                                                                                animationBegin={0}
                                                                                animationDuration={800}
                                                                            >
                                                                                {advancedData.investment_analysis.asset_allocation.map((entry, index) => (
                                                                                    <Cell 
                                                                                        key={`cell-${index}`} 
                                                                                        fill={entry.color} 
                                                                                        stroke="none" 
                                                                                        style={{ 
                                                                                            filter: activePieIndex === index ? `drop-shadow(0 0 12px ${entry.color}44)` : 'none',
                                                                                            transition: 'all 0.3s ease'
                                                                                        }}
                                                                                    />
                                                                                ))}
                                                                            </Pie>
                                                                            <Tooltip content={() => null} />
                                                                    </PieChart>
                                                                </ResponsiveContainer>
                                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none w-[120px]">
                                                                    <div className="flex flex-col animate-in fade-in zoom-in duration-300">
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 transition-all">
                                                                            {activePieIndex !== null 
                                                                                ? advancedData.investment_analysis.asset_allocation[activePieIndex].name 
                                                                                : "Total Investido"
                                                                            }
                                                                        </span>
                                                                        <span className={cn(
                                                                            "text-lg font-black transition-all",
                                                                            activePieIndex !== null ? "text-foreground scale-110" : "text-primary"
                                                                        )}>
                                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', compactDisplay: 'short' }).format(
                                                                                activePieIndex !== null 
                                                                                    ? advancedData.investment_analysis.asset_allocation[activePieIndex].value 
                                                                                    : (advancedData?.investment_analysis?.total_invested || 0)
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="space-y-3">
                                                        {advancedData.investment_analysis.asset_allocation.map((item, i) => (
                                                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/10">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                                                    <span className="text-xs font-bold">{item.name}</span>
                                                                </div>
                                                                <span className="text-xs font-black">{formatCurrency(item.value)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* EVOLUTION LINE */}
                                                <div className="lg:col-span-2 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Aportes vs Performance</h4>
                                                    </div>
                                                    <div className="h-[350px] bg-card border border-border/60 rounded-[32px] p-6 shadow-sm overflow-hidden" style={{ minWidth: 0 }}>
                                                        {(!advancedData.investment_analysis.monthly_history || advancedData.investment_analysis.monthly_history.length === 0) ? (
                                                            <ChartEmptyState 
                                                                type="bar" 
                                                                height="100%" 
                                                                title="Histórico de Patrimônio"
                                                                description="Seus aportes e resgates aparecerão aqui."
                                                                icon={TrendingUp}
                                                            />
                                                        ) : (
                                                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                                            <BarChart data={advancedData.investment_analysis.monthly_history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                                                                <XAxis 
                                                                    dataKey="month" 
                                                                    axisLine={false} 
                                                                    tickLine={false} 
                                                                    fontSize={10} 
                                                                    dy={10} 
                                                                    tick={{ fill: 'currentColor', opacity: 0.5 }}
                                                                />
                                                                <YAxis hide />
                                                                <Tooltip 
                                                                    cursor={{ fill: 'currentColor', opacity: 0.05 }}
                                                                    content={({ active, payload, label }) => {
                                                                        if (active && payload && payload.length) {
                                                                            return (
                                                                                <div className="z-50 bg-background/95 backdrop-blur-xl border border-border/50 p-2 sm:p-3 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">{label}</p>
                                                                                    <div className="space-y-1">
                                                                                        <div className="flex items-center justify-between gap-6">
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                                                                <span className="text-[10px] font-bold text-blue-500">Aporte:</span>
                                                                                            </div>
                                                                                            <span className="text-[10px] font-black">{formatCurrency(payload[0].value)}</span>
                                                                                        </div>
                                                                                        <div className="flex items-center justify-between gap-6">
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                                                <span className="text-[10px] font-bold text-amber-500">Resgate:</span>
                                                                                            </div>
                                                                                            <span className="text-[10px] font-black">{formatCurrency(payload[1].value)}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        }
                                                                        return null
                                                                    }}
                                                                />
                                                                <Bar 
                                                                    dataKey="contribution" 
                                                                    name="Aportes" 
                                                                    fill="var(--finance-income)" 
                                                                    radius={[6, 6, 0, 0]} 
                                                                    barSize={12}
                                                                />
                                                                <Bar 
                                                                    dataKey="returns" 
                                                                    name="Resgates" 
                                                                    fill="var(--finance-expense)" 
                                                                    radius={[6, 6, 0, 0]} 
                                                                    barSize={12}
                                                                />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* CUSTOM MONITORING GRID */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-8">
                                    <Card className="border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 transition-all rounded-[40px] overflow-hidden">
                                        <CardHeader className="p-8">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                                                        <Eye className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <CardTitle className="text-xl font-black">Monitor de Foco</CardTitle>
                                                            <HelpInfo topic="FOCUSED_MONITOR" iconClassName="h-4 w-4" />
                                                        </div>
                                                        <CardDescription>Rastreamento técnico de itens selecionados</CardDescription>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="rounded-xl">
                                                    <Filter className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-8 pt-0 space-y-6">
                                            {advancedData?.custom_monitoring?.map((monitor, i) => (
                                                <div key={i} className="p-6 rounded-2xl bg-card border border-border/60 shadow-sm space-y-4 group transition-all hover:shadow-md">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div 
                                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                                                                style={{ backgroundColor: monitor.color || (monitor.type === 'category' ? '#3b82f6' : '#8b5cf6') }}
                                                            >
                                                                {monitor.type === 'category' ? (
                                                                    <LucideIcon name={monitor.icon || 'PieChart'} className="h-5 w-5" />
                                                                ) : (
                                                                    <TagIcon className="h-5 w-5" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h5 className="text-sm font-black">{monitor.name}</h5>
                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{monitor.type === 'category' ? 'Categoria' : 'Tag'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-right">
                                                                <span className={cn(
                                                                    "text-xs font-black",
                                                                    monitor.status === 'success' ? "text-emerald-500" : monitor.status === 'warning' ? "text-amber-500" : "text-destructive"
                                                                )}>
                                                                    {monitor.status === 'success' ? "Econômico" : monitor.status === 'warning' ? "Atenção" : "Crítico"}
                                                                </span>
                                                                <p className="text-[10px] font-bold text-muted-foreground">Status Mensal</p>
                                                            </div>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                                onClick={async () => {
                                                                    try {
                                                                        await deleteFocusedMonitor(monitor.id)
                                                                        toast.success("Item removido do monitor")
                                                                        fetchAdvanced()
                                                                    } catch (error) {
                                                                        toast.error("Erro ao remover item")
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-background/40 p-4 rounded-2xl border border-border/5">
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mês Atual</p>
                                                            <p className="text-lg font-black mt-1">{formatCurrency(monitor.current_month)}</p>
                                                        </div>
                                                        <div className="bg-background/40 p-4 rounded-2xl border border-border/5">
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Média Histórica</p>
                                                            <p className="text-lg font-black mt-1">{formatCurrency(monitor.average_month)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="relative pt-2">
                                                        <div className="flex items-center justify-between text-[10px] font-black uppercase mb-1.5 px-1">
                                                            <span>Progressão</span>
                                                            <span>{Math.round((monitor.current_month / monitor.average_month) * 100)}%</span>
                                                        </div>
                                                        <div className="w-full bg-muted/40 h-2.5 rounded-full overflow-hidden">
                                                            <div 
                                                                className={cn(
                                                                    "h-full transition-all duration-1000",
                                                                    monitor.status === 'success' ? "bg-emerald-500" : monitor.status === 'warning' ? "bg-amber-500" : "bg-destructive"
                                                                )} 
                                                                style={{ width: `${Math.min((monitor.current_month / monitor.average_month) * 100, 100)}%` }} 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <Button 
                                                variant="outline" 
                                                className="w-full h-14 rounded-2xl border-dashed border-2 hover:bg-muted/30 font-black text-sm"
                                                onClick={() => setIsSelectionModalOpen(true)}
                                            >
                                                <Plus className="mr-2 h-4 w-4" /> Monitorar Nova Categoria/Tag
                                            </Button>
                                        </CardContent>
                                    </Card>

                                </div>

                                <div className="space-y-8">
                                    <Card className="border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 transition-all rounded-[40px] overflow-hidden">
                                        <CardHeader className="p-8 pb-4">
                                            <CardTitle className="text-lg font-black flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                    <Activity className="h-5 w-5" />
                                                </div>
                                                Insights de Saúde Financeira
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-8 pt-0 space-y-6">
                                            {/* Note for future: technical activity flow (spending_frequency) 
                                                can be used here to trigger smart reminders. */}
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="flex items-center justify-between bg-background/40 p-5 rounded-3xl border border-border/5">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gasto Diário Seguro</p>
                                                            <HelpInfo topic="SAFE_DAILY_SPEND" />
                                                        </div>
                                                        <p className="text-2xl font-black text-primary">
                                                            {formatCurrency(advancedData?.daily_spending_report?.safe_daily_spend || 0)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right bg-primary/5 p-3 rounded-2xl border border-primary/10">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Restam</p>
                                                        <p className="text-xl font-black text-primary">{advancedData?.daily_spending_report?.remaining_days || 0} dias</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-background/20 p-4 rounded-2xl border border-border/5">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Score de Saúde</p>
                                                        <p className="text-lg font-black mt-1 text-foreground">{summaryData?.summary?.financial_score || 0}<span className="text-[10px] opacity-40 ml-1">/100</span></p>
                                                    </div>
                                                    <div className="bg-background/20 p-4 rounded-2xl border border-border/5">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Poder de Aporte</p>
                                                        <p className="text-lg font-black mt-1 text-emerald-500">{summaryData?.summary?.savings_rate || 0}%</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-1">
                                                    <div className="flex items-center gap-2">
                                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Análise de Compromissamento</h5>
                                                        <HelpInfo topic="FIXED_VS_VARIABLE" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-muted-foreground/40 italic">Fixo vs Variável</span>
                                                </div>
                                                <div className="w-full bg-muted/20 h-4 rounded-full overflow-hidden flex shadow-inner">
                                                    <div 
                                                        className="h-full bg-blue-500/80 transition-all duration-1000" 
                                                        style={{ width: `${(advancedData?.fixed_vs_variable?.fixed || 0) / (advancedData?.fixed_vs_variable?.total || 1) * 100}%` }}
                                                    />
                                                    <div 
                                                        className="h-full bg-amber-500/80 transition-all duration-1000" 
                                                        style={{ width: `${(advancedData?.fixed_vs_variable?.variable || 0) / (advancedData?.fixed_vs_variable?.total || 1) * 100}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] font-bold px-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        <span>Fixos: {formatCurrency(advancedData?.fixed_vs_variable?.fixed || 0)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-right">
                                                        <span>Variáveis: {formatCurrency(advancedData?.fixed_vs_variable?.variable || 0)}</span>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm ring-1 ring-black/5">
                                                        <ShieldCheck className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">Reserva de Emergência</span>
                                                </div>
                                                <div className="flex items-end justify-between">
                                                    <div>
                                                        <p className="text-sm font-bold opacity-80">Você possui capital para manter seu padrão por:</p>
                                                        <p className="text-xl font-black mt-1">{(summaryData?.summary?.liquidity_ratio || 0).toFixed(1)} meses</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge variant="outline" className="rounded-lg border-emerald-500/30 text-emerald-500 bg-emerald-500/5 font-bold">
                                                            Seguro
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">Recomendações Proativas</h5>
                                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3 italic text-xs font-medium leading-relaxed">
                                                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                                                    {summaryData?.summary?.financial_score && summaryData.summary.financial_score > 80 
                                                        ? "Sua saúde financeira está excelente! Considere diversificar aportes em novos ativos de longo prazo."
                                                        : "Foco total em reduzir gastos variáveis para elevar seu poder de aporte acima de 20% ainda este mês."}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Gastos por Dia da Semana Migrados para a direita */}
                                    <Card className="border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 transition-all rounded-[40px] overflow-hidden">
                                        <CardHeader className="p-8 pb-4">
                                            <CardTitle className="text-lg font-black flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                                                    <Clock className="h-5 w-5" />
                                                </div>
                                                Hábitos Semanais
                                            </CardTitle>
                                            <CardDescription className="text-xs font-bold leading-relaxed px-1">Distribuição de gastos por dia da semana</CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[300px] p-8 pt-4">
                                            {isLoadingAdvanced ? <Skeleton className="w-full h-full rounded-2xl" /> : (
                                                (!advancedData?.spend_by_weekday || advancedData.spend_by_weekday.length === 0 || advancedData.spend_by_weekday.every((d: any) => d.amount === 0)) ? (
                                                    <ChartEmptyState 
                                                        type="bar" 
                                                        height="100%" 
                                                        title="Hábitos Semanais"
                                                        description="Seu comportamento semanal aparecerá aqui."
                                                        icon={Clock}
                                                    />
                                                ) : (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart 
                                                        data={advancedData?.spend_by_weekday || []}
                                                        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                                                    >
                                                        <defs>
                                                            <linearGradient id="habitGradientPremium" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                                                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                                                        <XAxis 
                                                            dataKey="label" 
                                                            axisLine={false} 
                                                            tickLine={false} 
                                                            fontSize={10}
                                                            tick={{ fill: 'currentColor', opacity: 0.4 }}
                                                            dy={10}
                                                        />
                                                        <YAxis hide />
                                                        <Tooltip 
                                                            cursor={{ fill: 'currentColor', opacity: 0.05, radius: 8 }}
                                                            content={({ active, payload }) => {
                                                                if (active && payload && payload.length) {
                                                                    return (
                                                                        <div className="bg-background/95 backdrop-blur-xl border border-border/50 p-3 rounded-2xl shadow-2xl">
                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                                                                {payload[0].payload.label}
                                                                            </p>
                                                                            <p className="text-sm font-black text-purple-500">
                                                                                {formatCurrency(payload[0].value as number)}
                                                                            </p>
                                                                        </div>
                                                                    )
                                                                }
                                                                return null;
                                                            }}
                                                        />
                                                        <Bar 
                                                            dataKey="amount" 
                                                            fill="url(#habitGradientPremium)" 
                                                            radius={[8, 8, 0, 0]} 
                                                            barSize={32}
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                                )
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* FINANCIAL FREEDOM SIMULATOR - LARGURA TOTAL */}
                                <Card className="lg:col-span-2 border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 transition-all rounded-[40px] overflow-hidden">
                                    <CardHeader className="p-8 pb-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg font-black flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                    <TrendingUp className="h-5 w-5" />
                                                </div>
                                                Simulador de Liberdade
                                            </CardTitle>
                                            <HelpInfo topic="PROJECTION" />
                                        </div>
                                        <CardDescription className="text-xs font-bold leading-relaxed px-1">
                                            Projeção baseada em seu aporte médio mensal e retorno estimado de 8% a.a.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[250px] p-8 pt-0 outline-none" style={{ minWidth: 0 }}>
                                        {(!advancedData?.financial_freedom_projection || advancedData.financial_freedom_projection.length === 0) ? (
                                            <ChartEmptyState 
                                                type="area" 
                                                height="100%" 
                                                title="Simulador de Liberdade"
                                                description="Sua projeção de longo prazo aparecerá aqui."
                                                icon={TrendingUp}
                                            />
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                            <AreaChart data={advancedData?.financial_freedom_projection || []} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                                <defs>
                                                    <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                                                <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: 'currentColor', opacity: 0.5 }} />
                                                <YAxis hide />
                                                <Tooltip 
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="z-50 bg-background/95 backdrop-blur-xl border border-border/50 p-3 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{payload[0].payload.label}</p>
                                                                    <p className="text-sm font-black text-emerald-500">{formatCurrency(payload[0].value)}</p>
                                                                    <p className="text-[9px] font-bold opacity-60 italic">Estimado</p>
                                                                </div>
                                                            )
                                                        }
                                                        return null
                                                    }}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="value" 
                                                    stroke="#10b981" 
                                                    strokeWidth={3} 
                                                    fillOpacity={1} 
                                                    fill="url(#projGradient)" 
                                                    animationDuration={2000}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Analise de Risco como último item */}
                                <div className={cn(
                                    "lg:col-span-2 p-8 rounded-none sm:rounded-[40px] shadow-2xl text-primary-foreground relative overflow-hidden group transition-all duration-500",
                                    advancedData?.risk_analysis?.level === 'Baixa' ? "bg-blue-500" : 
                                    advancedData?.risk_analysis?.level === 'Média' ? "bg-amber-500" : "bg-destructive"
                                )}>
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                        <ShieldCheck className="h-32 w-32" />
                                    </div>
                                    <div className="relative z-10 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xl font-black tracking-tight">Análise de Risco</h4>
                                            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none font-black text-[10px] uppercase tracking-widest px-2">
                                                Nível {advancedData?.risk_analysis?.level || '...'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm opacity-90 font-bold leading-relaxed max-w-2xl">
                                            {advancedData?.risk_analysis?.recommendation || "Analisando seu padrão de volatilidade..."}
                                            {advancedData?.risk_analysis?.sensitive_category && (
                                                <span className="block mt-2 text-[10px] opacity-70 uppercase tracking-widest">
                                                    Fator de sensibilidade: {advancedData.risk_analysis.sensitive_category}
                                                </span>
                                            )}
                                        </p>
                                        <div className="flex justify-end pt-2">
                                            <Button 
                                                disabled 
                                                variant="secondary" 
                                                className="w-full sm:w-auto px-10 h-12 rounded-2xl font-black text-sm text-primary bg-white/80 hover:bg-white/90 shadow-lg cursor-not-allowed"
                                            >
                                                Relatório Detalhado (Em Breve)
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-center p-4 bg-muted/10 rounded-2xl border border-border/10 text-[10px] text-muted-foreground font-medium italic">
                                Os dados técnicos acima são baseados em projeções de mercado e análise de fluxo histórico. 
                                Nenhuma informação constitui recomendação direta de investimento.
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
            <FocusSelectionModal 
                open={isSelectionModalOpen} 
                onOpenChange={setIsSelectionModalOpen}
                onSuccess={fetchAdvanced}
            />
        </div>
    )
}

