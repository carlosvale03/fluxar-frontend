"use client"

import { useMemo, useState, useEffect } from "react"
import { format, getDaysInMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { TrendingUp, ArrowUpRight, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChartEmptyState } from "./ChartEmptyState"

interface DailyCashFlowData {
    label: string
    income: number
    expense: number
    full_date?: string
}

interface DailyCashFlowChartProps {
    data: DailyCashFlowData[]
    selectedMonth?: number
    selectedYear?: number
    isLoading?: boolean
    className?: string
    showMonthSelector?: boolean
    availableMonths?: string[]
    onMonthChange?: (monthStr: string) => void
    activeMonthStr?: string | null
}

export function DailyCashFlowChart({
    data,
    selectedMonth,
    selectedYear,
    isLoading = false,
    className,
    showMonthSelector = false,
    availableMonths = [],
    onMonthChange,
    activeMonthStr
}: DailyCashFlowChartProps) {

    // Processar dados para garantir que todos os dias do mês estejam presentes (mesmo com zero)
    const completeDailyData = useMemo(() => {
        if (isLoading || !data) return [];

        // Determinar qual mês/ano usar para gerar os dias
        let targetMonthStr = activeMonthStr;

        if (!targetMonthStr) {
            if (selectedMonth && selectedYear) {
                targetMonthStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
            } else {
                // Tentar inferir do dado mais recente se não houver contexto global
                const lastDate = [...data]
                    .filter(d => d.full_date)
                    .map(d => d.full_date!)
                    .sort()
                    .pop();
                if (lastDate) targetMonthStr = lastDate.substring(0, 7);
            }
        }

        if (!targetMonthStr) return data;

        try {
            const [year, month] = targetMonthStr.split('-').map(Number);
            if (isNaN(year) || isNaN(month)) return data;
            
            const daysInMonth = getDaysInMonth(new Date(year, month - 1));
            if (isNaN(daysInMonth)) return data;
            
            return Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${targetMonthStr}-${day.toString().padStart(2, '0')}`;
                
                // Encontrar dado existente para este dia
                const existingDayData = data.find((d: any) => d.full_date === dateStr);
                
                return {
                    label: day.toString(),
                    income: existingDayData?.income || 0,
                    expense: existingDayData?.expense || 0,
                    full_date: dateStr
                };
            });
        } catch (error) {
            console.error("Erro ao gerar dados mensais completos:", error);
            return data;
        }
    }, [data, isLoading, selectedMonth, selectedYear, activeMonthStr]);

    const isEmpty = !isLoading && (!completeDailyData || completeDailyData.length === 0 || completeDailyData.every(d => d.income === 0 && d.expense === 0));

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    return (
        <Card className={cn("border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 transition-all rounded-[32px] overflow-hidden flex flex-col", className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 text-wrap">
                <div className="min-w-0">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" style={{ color: 'var(--finance-income)' }} />
                        <span className="truncate">Fluxo de Caixa Diário</span>
                    </CardTitle>
                    <CardDescription className="text-[10px] font-medium text-muted-foreground mt-0.5 truncate uppercase tracking-widest opacity-50">Movimentação detalhada dia por dia</CardDescription>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Seletor de Mês Interno (estilo Relatórios) */}
                    {showMonthSelector && availableMonths.length > 1 && activeMonthStr && (
                        <div className="flex items-center gap-2 bg-background/50 backdrop-blur-md p-1 rounded-xl border border-border/50 mr-2">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-lg"
                                disabled={availableMonths.indexOf(activeMonthStr) === 0}
                                onClick={() => {
                                    const idx = availableMonths.indexOf(activeMonthStr);
                                    if (idx > 0 && onMonthChange) onMonthChange(availableMonths[idx - 1]);
                                }}
                            >
                                <ArrowUpRight className="h-4 w-4 rotate-[-135deg]" />
                            </Button>
                            
                            <span className="text-[10px] font-black uppercase tracking-tighter px-2 min-w-[70px] text-center">
                                {format(new Date(activeMonthStr + "-01T00:00:00"), "MMM/yy", { locale: ptBR })}
                            </span>

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-lg"
                                disabled={availableMonths.indexOf(activeMonthStr) === availableMonths.length - 1}
                                onClick={() => {
                                    const idx = availableMonths.indexOf(activeMonthStr);
                                    if (idx < availableMonths.length - 1 && onMonthChange) onMonthChange(availableMonths[idx + 1]);
                                }}
                            >
                                <ArrowUpRight className="h-4 w-4 rotate-[45deg]" />
                            </Button>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--finance-income)' }} />
                            <span className="text-[8px] font-bold uppercase tracking-wider opacity-60">Receita</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--finance-expense)' }} />
                            <span className="text-[8px] font-bold uppercase tracking-wider opacity-60">Despesa</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="h-[300px] sm:h-[400px] pt-4 px-2 sm:px-6">
                {isLoading ? <Skeleton className="w-full h-full rounded-2xl" /> : (
                    isEmpty ? (
                        <ChartEmptyState 
                            type="bar" 
                            height="100%" 
                            title="Fluxo de Caixa Diário"
                            description="As movimentações diárias aparecerão aqui."
                            icon={BarChart3}
                        />
                    ) : (
                        <div className="w-full h-full overflow-x-auto overflow-y-hidden custom-scrollbar pb-2">
                            <div className="min-w-[700px] h-full pr-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        data={completeDailyData}
                                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                                        barGap={4}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                                        <XAxis 
                                            dataKey="label" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            fontSize={10} 
                                            fontWeight={800}
                                            tick={{ fill: 'currentColor', opacity: 0.4 }}
                                            dy={10}
                                            interval={0}
                                            padding={{ left: 15, right: 15 }}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            fontSize={10}
                                            tick={{ fill: 'currentColor', opacity: 0.4 }}
                                            tickFormatter={(value) => value >= 1000 ? `R$ ${(value/1000).toFixed(1)}k` : `R$ ${value}`}
                                            width={45}
                                        />
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
                                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || (index === 0 ? 'var(--finance-income)' : 'var(--finance-expense)') }} />
                                                                            <span className="text-xs font-bold text-muted-foreground">{entry.name === 'income' ? 'Receita' : entry.name === 'expense' ? 'Despesa' : entry.name}</span>
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
                                        <Bar 
                                            dataKey="income" 
                                            name="Receitas" 
                                            fill="var(--finance-income)" 
                                            fillOpacity={0.75}
                                            stroke="var(--finance-income)"
                                            strokeWidth={1.5}
                                            radius={[4, 4, 0, 0]} 
                                        />
                                        <Bar 
                                            dataKey="expense" 
                                            name="Despesas" 
                                            fill="var(--finance-expense)" 
                                            fillOpacity={0.75}
                                            stroke="var(--finance-expense)"
                                            strokeWidth={1.5}
                                            radius={[4, 4, 0, 0]} 
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )
                )}
            </CardContent>
        </Card>
    )
}
