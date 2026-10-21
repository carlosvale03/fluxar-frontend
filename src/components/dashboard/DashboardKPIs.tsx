"use client"

import type { ReactNode } from "react"

import { HelpInfo } from "@/components/ui/help-info"
import { Valor } from "@/components/ui/valor"
import { HelpTopic } from "@/constants/help-texts"
import { formatarMoeda } from "@/lib/dinheiro"

interface IndicadorProps {
    titulo: string
    children: ReactNode
    apoio?: string
    ajuda?: HelpTopic
}

// AZ-23 (DESIGN.md §7): indicador estático, sem hover nem seta; o rótulo em
// caixa alta e o valor em mono
function Indicador({ titulo, children, apoio, ajuda }: IndicadorProps) {
    return (
        <div role="group" aria-label={titulo} className="flex min-w-0 flex-col gap-2 bg-card p-5">
            <div className="flex items-center gap-1.5">
                <span className="label truncate text-muted-foreground">{titulo}</span>
                {ajuda && <HelpInfo topic={ajuda} />}
            </div>
            <p className="value-l truncate">{children}</p>
            {apoio && <p className="text-xs text-muted-foreground">{apoio}</p>}
        </div>
    )
}

interface DashboardKPIsProps {
    data: {
        // CONTRATO-16: valores em texto ("1234.56")
        monthly_income: string
        monthly_expense: string
        total_current_invoices: string
        payable?: string
    }
}

// Os quatro indicadores do mês, abaixo da Posição. Entradas e saídas levam
// o sinal (+ e −) junto da cor; A pagar e as faturas são compromissos, sem sinal.
export function DashboardKPIs({ data }: DashboardKPIsProps) {
    return (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
            <Indicador titulo="Receitas do Mês">
                <Valor valor={data?.monthly_income ?? "0.00"} direcao="entrada" tamanho="l" />
            </Indicador>
            <Indicador titulo="Despesas do Mês">
                <Valor valor={data?.monthly_expense ?? "0.00"} direcao="saida" tamanho="l" />
            </Indicador>
            {/* REL-04: despesas pendentes, à parte das despesas do mês */}
            <Indicador titulo="A pagar" apoio="Despesas pendentes do período">
                {formatarMoeda(data?.payable ?? "0.00")}
            </Indicador>
            {/* REL-18: valor em aberto das faturas que vencem no mês */}
            <Indicador titulo="Faturas do Mês" apoio="Em aberto, com vencimento no mês">
                {formatarMoeda(data?.total_current_invoices ?? "0.00")}
            </Indicador>
        </div>
    )
}
