"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { BarChart3, TrendingUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Valor } from "@/components/ui/valor"
import { MonthlyComparisonData } from "@/types/reports"
import { cn } from "@/lib/utils"
import { formatarMoeda, formatarMoedaDoEixo, paraCentavos } from "@/lib/dinheiro"
import {
    COR_DE_ENTRADA,
    COR_DE_SAIDA,
    COR_DO_REAL,
    CURSOR_DO_TOOLTIP,
    PONTO_ATUAL,
    PROPS_DA_GRADE,
    PROPS_DO_EIXO,
} from "@/lib/graficos"

import { ChartEmptyState } from "./ChartEmptyState"
import { CaixaDoTooltip, Granularidade, ItemDaLegenda, LinhaDoTooltip } from "./partes-do-grafico"

interface MonthlyComparisonChartProps {
    data: MonthlyComparisonData[]
    title?: string
    description?: string
    variant?: "bars" | "line"
    showNumericalLabels?: boolean
    height?: number | string
    // Granularidade sempre indicada no título (DESIGN.md §6)
    granularidade?: string
    className?: string
}

export function MonthlyComparisonChart({
    data,
    title,
    description,
    variant = "bars",
    showNumericalLabels = false,
    height = 300,
    granularidade = "por mês",
    className
}: MonthlyComparisonChartProps) {
    const isEmpty = !data || data.length === 0 || data.every(d => paraCentavos(d.income) === 0 && paraCentavos(d.expense) === 0)

    const cabecalho = (
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
            <div className="min-w-0 space-y-1">
                {title && (
                    <CardTitle className="flex items-center gap-2">
                        <span className="truncate">{title}</span>
                        <Granularidade>{granularidade}</Granularidade>
                    </CardTitle>
                )}
                {description && <CardDescription>{description}</CardDescription>}
            </div>
            {!isEmpty && (
                <div className="flex items-center gap-3">
                    {variant === "bars" ? (
                        <>
                            <ItemDaLegenda cor={COR_DE_ENTRADA} rotulo="Receitas" />
                            <ItemDaLegenda cor={COR_DE_SAIDA} rotulo="Despesas" />
                        </>
                    ) : (
                        <ItemDaLegenda cor={COR_DO_REAL} rotulo="Saldo" />
                    )}
                </div>
            )}
        </CardHeader>
    )

    if (isEmpty) {
        return (
            <Card className={cn("flex h-full flex-col", className)}>
                {cabecalho}
                <CardContent className="flex-1">
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

    // CONTRATO-16: os valores chegam como texto; o Recharts precisa de número,
    // e a conversão é só para plotar
    const dadosDoGrafico = data.map(d => ({
        ...d,
        income: paraCentavos(d.income) / 100,
        expense: paraCentavos(d.expense) / 100,
        balance: paraCentavos(d.balance) / 100,
    }))

    return (
        <Card className={cn("flex h-full w-full flex-col", className)}>
            {cabecalho}
            <CardContent className="flex flex-1 flex-col">
                <div className={cn("flex flex-1 flex-col gap-4", showNumericalLabels ? "lg:flex-row lg:items-center lg:gap-8" : "")}>

                    {showNumericalLabels && (
                        <dl className="flex shrink-0 flex-row justify-between gap-4 border-b border-border pb-4 lg:min-w-[160px] lg:flex-col lg:justify-start lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
                            <div className="space-y-1">
                                <dt className="label text-muted-foreground">Ganhos</dt>
                                <dd><Valor valor={currentEntry.income} direcao="entrada" tamanho="l" /></dd>
                            </div>
                            <div className="space-y-1">
                                <dt className="label text-muted-foreground">Gastos</dt>
                                <dd><Valor valor={currentEntry.expense} direcao="saida" tamanho="l" /></dd>
                            </div>
                            <div className="hidden space-y-1 sm:block lg:border-t lg:border-border lg:pt-3">
                                <dt className="label text-muted-foreground">Resultado</dt>
                                <dd><Valor valor={currentEntry.balance} tamanho="l" /></dd>
                            </div>
                        </dl>
                    )}

                    <div className="w-full flex-1" style={{ height: typeof height === 'number' ? `${height}px` : height, minHeight: '250px', minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {variant === "bars" ? (
                                <BarChart data={dadosDoGrafico} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid {...PROPS_DA_GRADE} />
                                    <XAxis
                                        dataKey="month"
                                        {...PROPS_DO_EIXO}
                                        dy={10}
                                        interval={0}
                                        padding={{ left: 20, right: 20 }}
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
                                                    <CaixaDoTooltip titulo={label}>
                                                        {payload.map((entry, index) => (
                                                            <LinhaDoTooltip
                                                                key={index}
                                                                cor={entry.color}
                                                                nome={entry.name}
                                                                valor={formatarMoeda(entry.value as number)}
                                                            />
                                                        ))}
                                                    </CaixaDoTooltip>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                    <Bar
                                        dataKey="income"
                                        name="Receitas"
                                        fill={COR_DE_ENTRADA}
                                        radius={[2, 2, 0, 0]}
                                        barSize={showNumericalLabels ? 32 : 24}
                                    />
                                    <Bar
                                        dataKey="expense"
                                        name="Despesas"
                                        fill={COR_DE_SAIDA}
                                        radius={[2, 2, 0, 0]}
                                        barSize={showNumericalLabels ? 32 : 24}
                                    />
                                </BarChart>
                            ) : (
                                <LineChart data={dadosDoGrafico} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid {...PROPS_DA_GRADE} />
                                    <XAxis
                                        dataKey="month"
                                        {...PROPS_DO_EIXO}
                                        dy={10}
                                        interval={0}
                                        padding={{ left: 30, right: 30 }}
                                    />
                                    <YAxis
                                        {...PROPS_DO_EIXO}
                                        tickFormatter={formatarMoedaDoEixo}
                                        width={45}
                                    />
                                    <Tooltip
                                        cursor={CURSOR_DO_TOOLTIP}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <CaixaDoTooltip titulo={label}>
                                                        <LinhaDoTooltip
                                                            cor={COR_DO_REAL}
                                                            nome="Saldo"
                                                            valor={<Valor valor={payload[0].value as number} />}
                                                        />
                                                    </CaixaDoTooltip>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="balance"
                                        stroke={COR_DO_REAL}
                                        strokeWidth={2.5}
                                        connectNulls={true}
                                        dot={false}
                                        activeDot={PONTO_ATUAL}
                                    />
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
