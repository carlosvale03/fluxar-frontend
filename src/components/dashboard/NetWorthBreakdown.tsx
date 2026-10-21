"use client"

import * as React from "react"
import { CreditCard, Landmark, PiggyBank, TrendingUp, Wallet } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Valor } from "@/components/ui/valor"
import { formatarMoeda } from "@/lib/dinheiro"
import type { NetWorthBreakdown as Partes } from "@/types/reports"

interface NetWorthBreakdownProps {
    // CONTRATO-16: valores em texto ("1234.56")
    total?: string
    partes?: Partes
}

interface ParteProps {
    titulo: string
    icone: React.ReactNode
    children: React.ReactNode
}

function Parte({ titulo, icone, children }: ParteProps) {
    return (
        <div role="group" aria-label={titulo} className="flex min-w-0 items-center gap-3 rounded-md border border-border p-4">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-elevated text-muted-foreground">
                {icone}
            </span>
            <div className="min-w-0">
                <p className="label truncate text-muted-foreground">{titulo}</p>
                <p className="value-m truncate">{children}</p>
            </div>
        </div>
    )
}

// REL-15: o patrimônio separado em disponível, reservas (cofrinhos),
// investimentos e faturas em aberto, que saem do total (REL-13)
export function NetWorthBreakdown({ total, partes }: NetWorthBreakdownProps) {
    return (
        <section aria-labelledby="titulo-patrimonio">
            <Card className="space-y-5 p-5">
                <div className="flex items-center gap-3">
                    <Landmark className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <h2 id="titulo-patrimonio" className="display-s">
                        Patrimônio
                    </h2>
                    <p className="value-l ml-auto">{formatarMoeda(total ?? "0.00")}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Parte titulo="Disponível" icone={<Wallet className="h-4 w-4" />}>
                        {formatarMoeda(partes?.available ?? "0.00")}
                    </Parte>
                    <Parte titulo="Reservas" icone={<PiggyBank className="h-4 w-4" />}>
                        {formatarMoeda(partes?.reserves ?? "0.00")}
                    </Parte>
                    <Parte titulo="Investimentos" icone={<TrendingUp className="h-4 w-4" />}>
                        {formatarMoeda(partes?.investments ?? "0.00")}
                    </Parte>
                    {/* As faturas em aberto saem do total: sinal de menos e cor de saída */}
                    <Parte titulo="Faturas em aberto" icone={<CreditCard className="h-4 w-4" />}>
                        <Valor valor={partes?.open_invoices ?? "0.00"} direcao="saida" />
                    </Parte>
                </div>
            </Card>
        </section>
    )
}
