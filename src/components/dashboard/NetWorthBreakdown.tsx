"use client"

import * as React from "react"
import { Landmark, PiggyBank, TrendingUp, Wallet, CreditCard } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { formatarMoeda } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"
import type { NetWorthBreakdown as Partes } from "@/types/reports"

interface NetWorthBreakdownProps {
    // CONTRATO-16: valores em texto ("1234.56")
    total?: string
    partes?: Partes
}

interface ParteProps {
    titulo: string
    valor: string
    icone: React.ReactNode
    corDoValor: string
}

function Parte({ titulo, valor, icone, corDoValor }: ParteProps) {
    return (
        <div role="group" aria-label={titulo} className="flex items-center gap-3 bg-background/40 p-4 rounded-2xl border border-border/40 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                {icone}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 truncate">{titulo}</p>
                <p className={cn("text-lg font-black tracking-tight truncate", corDoValor)}>{valor}</p>
            </div>
        </div>
    )
}

// REL-15: o patrimônio separado em disponível, reservas (cofrinhos),
// investimentos e faturas em aberto, que saem do total (REL-13)
export function NetWorthBreakdown({ total, partes }: NetWorthBreakdownProps) {
    return (
        <section aria-labelledby="titulo-patrimonio">
            <Card className="border border-border/60 bg-card hover:bg-muted/30 hover:border-primary/20 transition-all shadow-md hover:shadow-lg rounded-[32px] overflow-hidden p-5 sm:p-6">
                <CardContent className="p-0 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                                <Landmark className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h2 id="titulo-patrimonio" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                                    Patrimônio
                                </h2>
                                <p className="text-2xl font-black tracking-tight text-foreground">{formatarMoeda(total ?? "0.00")}</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Parte
                            titulo="Disponível"
                            valor={formatarMoeda(partes?.available ?? "0.00")}
                            icone={<Wallet className="h-5 w-5 text-primary" />}
                            corDoValor="text-foreground"
                        />
                        <Parte
                            titulo="Reservas"
                            valor={formatarMoeda(partes?.reserves ?? "0.00")}
                            icone={<PiggyBank className="h-5 w-5 text-emerald-500" />}
                            corDoValor="text-foreground"
                        />
                        <Parte
                            titulo="Investimentos"
                            valor={formatarMoeda(partes?.investments ?? "0.00")}
                            icone={<TrendingUp className="h-5 w-5 text-blue-500" />}
                            corDoValor="text-foreground"
                        />
                        <Parte
                            titulo="Faturas em aberto"
                            valor={`- ${formatarMoeda(partes?.open_invoices ?? "0.00")}`}
                            icone={<CreditCard className="h-5 w-5 text-amber-500" />}
                            corDoValor="text-amber-500"
                        />
                    </div>
                </CardContent>
            </Card>
        </section>
    )
}
