"use client"

import Link from "next/link"
import { AlertTriangle, CheckCircle2, Target, XCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HelpInfo } from "@/components/ui/help-info"

interface BudgetSummaryProps {
    data: {
        ok_count: number
        near_limit_count: number
        over_limit_count: number
    }
}

// AZ-23: o resumo dos orçamentos é um card clicável (seta no canto) que leva
// à tela deles. A API do resumo traz só as contagens; as barras por rota
// (BarraDeRota) dependem do gasto e do limite de cada uma.
export function BudgetSummary({ data }: BudgetSummaryProps) {
    const ok = data?.ok_count ?? 0
    const perto = data?.near_limit_count ?? 0
    const acima = data?.over_limit_count ?? 0
    const total = ok + perto + acima

    const linhas = [
        { rotulo: "Monitorados", valor: ok, icone: CheckCircle2, cor: "text-inflow" },
        { rotulo: "Em Alerta", valor: perto, icone: AlertTriangle, cor: "text-warn" },
        { rotulo: "Críticos", valor: acima, icone: XCircle, cor: "text-outflow" },
    ]

    return (
        <Card interativo className="h-full">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-1.5 pr-6">
                    <CardTitle>
                        {/* O link cobre o card inteiro; a ajuda fica acima dele */}
                        <Link href="/orcamentos" className="after:absolute after:inset-0 focus-visible:outline-none">
                            Controle de Gastos
                        </Link>
                    </CardTitle>
                    <span className="relative">
                        <HelpInfo topic="BUDGETS" />
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
                <div className="flex items-baseline gap-2">
                    <span className="value-l">{total}</span>
                    <span className="text-sm text-muted-foreground">Orçamentos Ativos</span>
                </div>

                {total === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                        <Target className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">Nenhum orçamento</p>
                            <p className="text-sm text-muted-foreground">Defina limites de gastos para suas categorias na aba Orçamentos.</p>
                        </div>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {linhas.map(({ rotulo, valor, icone: Icone, cor }) => (
                            <li key={rotulo} className="flex items-center justify-between py-2.5">
                                <span className="flex items-center gap-2 text-sm text-fg-secondary">
                                    <Icone className={`h-4 w-4 ${cor}`} aria-hidden="true" />
                                    {rotulo}
                                </span>
                                <span className={`value-m ${cor}`}>{valor}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    )
}
