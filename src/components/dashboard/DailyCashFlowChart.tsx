"use client"

import { useMemo } from "react"
import { format, getDaysInMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChartEmptyState } from "./ChartEmptyState"
import { formatarMoeda, formatarMoedaDoEixo, paraCentavos } from "@/lib/dinheiro"
import { COR_DE_ENTRADA, COR_DE_SAIDA, PROPS_DA_GRADE, PROPS_DO_EIXO } from "@/lib/graficos"
import { CaixaDoTooltip, Granularidade, ItemDaLegenda, LinhaDoTooltip } from "./partes-do-grafico"

// CONTRATO-16: os valores chegam como texto ("1234.56")
interface DailyCashFlowData {
    label: string
    income: string
    expense: string
    full_date?: string
}

// O Recharts precisa de número: a conversão é só para plotar
const paraGrafico = (d: DailyCashFlowData) => ({
    ...d,
    income: paraCentavos(d.income) / 100,
    expense: paraCentavos(d.expense) / 100,
})

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

        if (!targetMonthStr) return data.map(paraGrafico);

        try {
            const [year, month] = targetMonthStr.split('-').map(Number);
            if (isNaN(year) || isNaN(month)) return data.map(paraGrafico);
            
            const daysInMonth = getDaysInMonth(new Date(year, month - 1));
            if (isNaN(daysInMonth)) return data.map(paraGrafico);
            
            return Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${targetMonthStr}-${day.toString().padStart(2, '0')}`;
                
                // Encontrar dado existente para este dia
                const existingDayData = data.find((d) => d.full_date === dateStr);
                
                return {
                    label: day.toString(),
                    income: paraCentavos(existingDayData?.income) / 100,
                    expense: paraCentavos(existingDayData?.expense) / 100,
                    full_date: dateStr
                };
            });
        } catch (error) {
            console.error("Erro ao gerar dados mensais completos:", error);
            return data.map(paraGrafico);
        }
    }, [data, isLoading, selectedMonth, selectedYear, activeMonthStr]);

    // AZ-36: resumo do gráfico em texto, com os totais do mês
    const somaEmCentavos = (chave: "income" | "expense") =>
        completeDailyData.reduce((soma, d) => soma + paraCentavos(d[chave]), 0)
    const resumo = `Gráfico de barras das entradas e saídas por dia. Entradas no mês: ${formatarMoeda(somaEmCentavos("income") / 100)}. Saídas no mês: ${formatarMoeda(somaEmCentavos("expense") / 100)}.`

    const isEmpty = !isLoading && (!completeDailyData || completeDailyData.length === 0 || completeDailyData.every(d => d.income === 0 && d.expense === 0));

    return (
        <Card className={cn("flex flex-col", className)}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
                <div className="min-w-0 space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        <h3 className="truncate">Fluxo de caixa diário</h3>
                        <Granularidade>por dia</Granularidade>
                    </CardTitle>
                    <CardDescription>Entradas e saídas de cada dia</CardDescription>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3">
                    {/* Seletor de mês interno (Cartas) */}
                    {showMonthSelector && availableMonths.length > 1 && activeMonthStr && (
                        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Mês anterior do fluxo diário"
                                disabled={availableMonths.indexOf(activeMonthStr) === 0}
                                onClick={() => {
                                    const idx = availableMonths.indexOf(activeMonthStr);
                                    if (idx > 0 && onMonthChange) onMonthChange(availableMonths[idx - 1]);
                                }}
                            >
                                <ChevronLeft aria-hidden="true" />
                            </Button>

                            <span className="label min-w-[72px] px-1 text-center text-foreground">
                                {format(new Date(activeMonthStr + "-01T00:00:00"), "MMM/yy", { locale: ptBR })}
                            </span>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Próximo mês do fluxo diário"
                                disabled={availableMonths.indexOf(activeMonthStr) === availableMonths.length - 1}
                                onClick={() => {
                                    const idx = availableMonths.indexOf(activeMonthStr);
                                    if (idx < availableMonths.length - 1 && onMonthChange) onMonthChange(availableMonths[idx + 1]);
                                }}
                            >
                                <ChevronRight aria-hidden="true" />
                            </Button>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <ItemDaLegenda cor={COR_DE_ENTRADA} rotulo="Entradas" />
                        <ItemDaLegenda cor={COR_DE_SAIDA} rotulo="Saídas" />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="h-[300px] px-2 pt-4 sm:h-[400px] sm:px-6">
                {isLoading ? <Skeleton className="h-full w-full" /> : (
                    isEmpty ? (
                        <ChartEmptyState
                            type="bar"
                            height="100%"
                            title="Nada registrado neste mês."
                            description="As entradas e saídas de cada dia aparecem aqui."
                            icon={BarChart3}
                        />
                    ) : (
                        <div role="img" aria-label={resumo} className="custom-scrollbar h-full w-full overflow-x-auto overflow-y-hidden pb-2">
                            <div className="h-full min-w-[700px] pr-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={completeDailyData}
                                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                                        barGap={4}
                                    >
                                        <CartesianGrid {...PROPS_DA_GRADE} />
                                        <XAxis
                                            dataKey="label"
                                            {...PROPS_DO_EIXO}
                                            dy={10}
                                            interval={0}
                                            padding={{ left: 15, right: 15 }}
                                        />
                                        <YAxis
                                            {...PROPS_DO_EIXO}
                                            tickFormatter={formatarMoedaDoEixo}
                                            width={45}
                                        />
                                        <Tooltip
                                            cursor={{ fill: "var(--az-elevated)" }}
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <CaixaDoTooltip titulo={`Dia ${label}`}>
                                                            {payload.map((entry, index) => (
                                                                <LinhaDoTooltip
                                                                    key={index}
                                                                    cor={entry.dataKey === "income" ? COR_DE_ENTRADA : COR_DE_SAIDA}
                                                                    nome={entry.dataKey === "income" ? "Entrada" : "Saída"}
                                                                    valor={formatarMoeda(entry.value as number)}
                                                                />
                                                            ))}
                                                        </CaixaDoTooltip>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <Bar dataKey="income" name="Entradas" fill={COR_DE_ENTRADA} radius={[2, 2, 0, 0]} />
                                        <Bar dataKey="expense" name="Saídas" fill={COR_DE_SAIDA} radius={[2, 2, 0, 0]} />
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
