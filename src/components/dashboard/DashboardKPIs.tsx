"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Wallet, TrendingUp, TrendingDown, CircleDollarSign, CreditCard, Clock } from "lucide-react"
import { HelpInfo } from "@/components/ui/help-info"
import { HelpTopic } from "@/constants/help-texts"

interface KPIProps {
    title: string
    value: string
    icon: React.ReactNode
    colorClass: string
    bgClass: string
    style?: React.CSSProperties
    helpTopic?: HelpTopic
}

function KPICard({ title, value, icon, colorClass, bgClass, style, helpTopic }: KPIProps) {
    const formattedValue = formatarMoeda(value)

    return (
        <Card role="group" aria-label={title} className="group relative flex flex-col p-5 rounded-[32px] border transition-all cursor-pointer overflow-hidden border-border/60 bg-card hover:bg-muted/30 hover:border-primary/20 hover:shadow-md">
            <CardContent className="p-0">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 truncate">
                                {title}
                            </span>
                            {helpTopic && <HelpInfo topic={helpTopic} />}
                        </div>
                        <h3 
                            className={cn("text-2xl font-black tracking-tight transition-transform group-hover:scale-105 origin-left duration-300 truncate", colorClass)}
                            style={{ 
                                color: colorClass === "" && bgClass.includes('var') ? bgClass.replace('-light', '') : undefined,
                                ...style 
                            }}
                        >
                            {formattedValue}
                        </h3>
                    </div>
                    <div 
                        className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 group-hover:scale-105 group-hover:rotate-6")} 
                        style={{ backgroundColor: bgClass.includes('var') ? bgClass : undefined }}
                    >
                        {!!icon && React.cloneElement(icon as React.ReactElement, {
                          className: cn((icon as any)?.props?.className, "h-6 w-6")
                        } as any)}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

interface DashboardKPIsProps {
    data: {
        // CONTRATO-16: valores em texto ("1234.56")
        total_balance: string
        total_liquid_balance?: string
        monthly_income: string
        monthly_expense: string
        net_result: string
        total_credit_limit: string
        total_current_invoices: string
        payable?: string
    }
}

export function DashboardKPIs({ data }: DashboardKPIsProps) {
    const isPositive = paraCentavos(data?.net_result) >= 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            <KPICard 
                title="Saldo em Contas" 
                value={data?.total_liquid_balance ?? data?.total_balance ?? "0.00"} 
                icon={<Wallet className="h-7 w-7 text-primary" />}
                colorClass="text-foreground"
                bgClass="bg-primary/10"
                helpTopic="TOTAL_BALANCE"
            />
            <KPICard 
                title="Receitas do Mês" 
                value={data?.monthly_income ?? "0.00"} 
                icon={<TrendingUp style={{ color: 'var(--finance-income)' }} />}
                colorClass=""
                bgClass="var(--finance-income-light)"
            />
            <KPICard 
                title="Despesas do Mês" 
                value={data?.monthly_expense ?? "0.00"} 
                icon={<TrendingDown style={{ color: 'var(--finance-expense)' }} />}
                colorClass=""
                bgClass="var(--finance-expense-light)"
            />
            {/* REL-04: despesas pendentes, à parte das despesas do mês */}
            <KPICard
                title="A pagar"
                value={data?.payable ?? "0.00"}
                icon={<Clock className="h-7 w-7 text-rose-500" />}
                colorClass="text-rose-500"
                bgClass="bg-rose-500/10"
            />
            <KPICard
                title="Resultado Líquido"
                value={data?.net_result ?? "0.00"} 
                icon={<CircleDollarSign className="h-7 w-7 text-orange-500" />}
                colorClass=""
                bgClass="bg-orange-500/10"
                helpTopic="NET_RESULT"
                {...({ style: { color: isPositive ? 'var(--finance-income)' : 'var(--finance-expense)' } } as any)}
            />
            {/* REL-18: valor em aberto das faturas que vencem no mês */}
            <KPICard
                title="Faturas do Mês"
                value={data?.total_current_invoices ?? "0.00"} 
                icon={<CreditCard className="h-7 w-7 text-amber-500" />}
                colorClass="text-amber-500"
                bgClass="bg-amber-500/10"
            />
        </div>
    )
}
