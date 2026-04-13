"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area } from 'recharts'
import { MonthlyComparisonData } from "@/types/reports"
import { cn } from "@/lib/utils"

import { ChartEmptyState } from "./ChartEmptyState"
import { BarChart3, TrendingUp } from "lucide-react"

interface MonthlyComparisonChartProps {
    data: MonthlyComparisonData[]
    title?: string
    description?: string
    variant?: "bars" | "line"
    showNumericalLabels?: boolean
    height?: number | string
    className?: string
}

export function MonthlyComparisonChart({ 
    data, 
    title, 
    description,
    variant = "bars",
    showNumericalLabels = false,
    height = 300,
    className
}: MonthlyComparisonChartProps) {
    
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0
        }).format(value)
    }

    const isEmpty = !data || data.length === 0 || data.every(d => Number(d.income) === 0 && Number(d.expense) === 0)

    if (isEmpty) {
        return (
            <Card className={cn("h-full border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 transition-all rounded-none sm:rounded-[32px] overflow-hidden flex flex-col", className)}>
                <CardHeader>
                    {title && <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70">{title}</CardTitle>}
                </CardHeader>
                <CardContent className="flex-1 p-6 sm:p-8">
                    <ChartEmptyState 
                        type={variant === 'bars' ? 'bar' : 'area'} 
                        height="100%"
                        icon={variant === 'bars' ? BarChart3 : TrendingUp}
                        title={title}
                        description={description || "Aguardando registros para este período."}
                    />
                </CardContent>
            </Card>
        )
    }

    const currentEntry = data[data.length - 1]

    return (
        <Card className={cn(
            "h-full w-full border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 rounded-none sm:rounded-[32px] overflow-hidden transition-all duration-300 flex flex-col", 
            className
        )}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4 sm:px-6">
                <div>
                    {title && (
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                            {title}
                        </CardTitle>
                    )}
                    {description && (
                        <CardDescription className="text-[10px] mt-1 uppercase font-bold tracking-widest opacity-50">
                            {description}
                        </CardDescription>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 sm:p-5 flex flex-col">
                <div className={cn("flex flex-col gap-4 flex-1", showNumericalLabels ? "lg:flex-row lg:items-center lg:gap-8" : "")}>
                    
                    {showNumericalLabels && (
                        <div className="flex flex-row lg:flex-col justify-between lg:justify-start gap-4 lg:gap-6 min-w-full lg:min-w-[140px] shrink-0 border-b lg:border-b-0 lg:border-r border-border/10 pb-4 lg:pb-0 lg:pr-6 mb-2 lg:mb-0">
                            <div className="space-y-0.5 group">
                                <span className="text-[9px] font-black uppercase tracking-widest block" style={{ color: 'var(--finance-income)', opacity: 0.7 }}>Ganhos</span>
                                <p className="text-xl sm:text-2xl font-black tabular-nums tracking-tighter">{formatCurrency(currentEntry.income)}</p>
                            </div>
                            <div className="space-y-0.5 group">
                                <span className="text-[9px] font-black uppercase tracking-widest block" style={{ color: 'var(--finance-expense)', opacity: 0.7 }}>Gastos</span>
                                <p className="text-xl sm:text-2xl font-black tabular-nums tracking-tighter">{formatCurrency(currentEntry.expense)}</p>
                            </div>
                            <div className="space-y-0.5 group hidden sm:block lg:block lg:pt-2 lg:border-t lg:border-border/10">
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary/70 block">Resultado</span>
                                <p 
                                    className="text-xl sm:text-2xl font-black tabular-nums tracking-tighter"
                                    style={{ color: currentEntry.balance >= 0 ? 'var(--finance-income)' : 'var(--finance-expense)' }}
                                >
                                    {formatCurrency(currentEntry.balance)}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 w-full transition-opacity duration-500" style={{ height: typeof height === 'number' ? `${height}px` : height, minHeight: '250px', minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {variant === "bars" ? (
                                <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="incomeGradientBars" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--finance-income)" stopOpacity={0.8}/>
                                            <stop offset="100%" stopColor="var(--finance-income)" stopOpacity={0.1}/>
                                        </linearGradient>
                                        <linearGradient id="expenseGradientBars" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--finance-expense)" stopOpacity={0.8}/>
                                            <stop offset="100%" stopColor="var(--finance-expense)" stopOpacity={0.1}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                                    <XAxis 
                                        dataKey="month" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        fontSize={10} 
                                        fontWeight={800}
                                        tick={{ fill: 'currentColor', opacity: 0.4 }}
                                        dy={10}
                                    />
                                    <YAxis hide />
                                    <Tooltip 
                                        cursor={{ fill: 'currentColor', opacity: 0.05, radius: 8 }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="z-50 bg-background/90 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 border-b border-border/50 pb-2">
                                                            {label}
                                                        </p>
                                                        <div className="space-y-2">
                                                            {payload.map((entry: any, index: number) => (
                                                                <div key={index} className="flex items-center justify-between gap-8">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                        <span className="text-xs font-bold text-muted-foreground">{entry.name}</span>
                                                                    </div>
                                                                    <span className="text-xs font-black">
                                                                        {formatCurrency(entry.value)}
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
                                    <Bar dataKey="income" name="Ganhos" fill="url(#incomeGradientBars)" radius={[4, 4, 0, 0]} barSize={showNumericalLabels ? 30 : 20} />
                                    <Bar dataKey="expense" name="Gastos" fill="url(#expenseGradientBars)" radius={[4, 4, 0, 0]} barSize={showNumericalLabels ? 30 : 20} />
                                </BarChart>
                            ) : (
                                <AreaChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="balanceGradientPremium" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                                    <XAxis 
                                        dataKey="month" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        fontSize={10} 
                                        fontWeight={800}
                                        tick={{ fill: 'currentColor', opacity: 0.4 }}
                                        dy={10}
                                    />
                                    <YAxis hide />
                                    <Tooltip 
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const val = payload[0].value as number
                                                return (
                                                    <div className="z-50 bg-background/95 backdrop-blur-xl border border-border/50 p-3 rounded-2xl shadow-2xl">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                            <p 
                                                                className="text-sm font-black"
                                                                style={{ color: val >= 0 ? '#10b981' : '#ef4444' }}
                                                            >
                                                                {formatCurrency(val)}
                                                            </p>
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
                                        stroke="#2563eb" 
                                        strokeWidth={4} 
                                        fillOpacity={1} 
                                        fill="url(#balanceGradientPremium)"
                                        connectNulls={true}
                                        dot={{ fill: 'white', strokeWidth: 3, r: 4, stroke: '#2563eb' }}
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }}
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
