"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, AlertTriangle, XCircle, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { HelpInfo } from "@/components/ui/help-info"

interface BudgetSummaryProps {
    data: {
        ok_count: number
        near_limit_count: number
        over_limit_count: number
    }
}

export function BudgetSummary({ data }: BudgetSummaryProps) {
    const total = (data?.ok_count ?? 0) + (data?.near_limit_count ?? 0) + (data?.over_limit_count ?? 0)

    return (
        <Card className="border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 transition-all rounded-[24px] sm:rounded-[32px] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-1.5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                        Controle de Gastos
                    </CardTitle>
                    <HelpInfo topic="BUDGETS" />
                </div>
                <Target className="h-5 w-5 text-muted-foreground/30" />
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
                <div className="flex flex-col gap-0.5">
                    <span className="text-3xl font-black tracking-tighter">{total}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Orçamentos Ativos</span>
                </div>

                {total === 0 ? (
                    <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center border border-border/40">
                            <Target className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nenhum Orçamento</p>
                            <p className="text-xs font-medium text-muted-foreground/40 leading-relaxed italic px-4">
                                "Defina limites de gastos para suas categorias na aba Orçamentos."
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/80">Monitorados</span>
                            </div>
                            <span className="text-sm font-black text-emerald-500">{data?.ok_count ?? 0}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/80">Em Alerta</span>
                            </div>
                            <span className="text-sm font-black text-amber-500">{data?.near_limit_count ?? 0}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
                                    <XCircle className="h-4 w-4 text-rose-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-600/80">Críticos</span>
                            </div>
                            <span className="text-sm font-black text-rose-500">{data?.over_limit_count ?? 0}</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
