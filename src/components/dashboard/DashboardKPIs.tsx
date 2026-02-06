"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Wallet, TrendingUp, TrendingDown, CircleDollarSign, CreditCard } from "lucide-react"
import { HelpInfo } from "@/components/ui/help-info"
import { HelpTopic } from "@/constants/help-texts"

interface KPIProps {
    title: string
    value: number
    icon: React.ReactNode
    colorClass: string
    bgClass: string
    style?: React.CSSProperties
    helpTopic?: HelpTopic
}

function KPICard({ title, value, icon, colorClass, bgClass, style, helpTopic }: KPIProps) {
    const formattedValue = new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
    }).format(value)

    return (
        <Card className="overflow-hidden border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:border-primary/30 transition-all duration-500 group rounded-[32px]">
            <CardContent className="p-7">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                                {title}
                            </span>
                            {helpTopic && <HelpInfo topic={helpTopic} />}
                        </div>
                        <h3 
                            className={cn("text-2xl font-black tracking-tight transition-transform group-hover:scale-105 origin-left duration-300", colorClass)}
                            style={{ 
                                color: colorClass === "" && bgClass.includes('var') ? bgClass.replace('-light', '') : undefined,
                                ...style 
                            }}
                        >
                            {formattedValue}
                        </h3>
                    </div>
                    <div className={cn("w-14 h-14 rounded-[20px] flex items-center justify-center shadow-lg transition-all duration-300 group-hover:rotate-6 group-hover:scale-110")} style={{ backgroundColor: bgClass.includes('var') ? bgClass : undefined }}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

interface DashboardKPIsProps {
    data: {
        total_balance: number
        monthly_income: number
        monthly_expense: number
        net_result: number
        total_credit_limit: number
        total_current_invoices: number
    }
}

export function DashboardKPIs({ data }: DashboardKPIsProps) {
    const isPositive = (data?.net_result ?? 0) >= 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6">
            <KPICard 
                title="Saldo em Contas" 
                value={data?.total_balance ?? 0} 
                icon={<Wallet className="h-7 w-7 text-primary" />}
                colorClass="text-foreground"
                bgClass="bg-primary/10"
                helpTopic="TOTAL_BALANCE"
            />
            <KPICard 
                title="Receitas do Mês" 
                value={data?.monthly_income ?? 0} 
                icon={<TrendingUp className="h-7 w-7" style={{ color: 'var(--finance-income)' }} />}
                colorClass=""
                bgClass="var(--finance-income-light)"
            />
            <KPICard 
                title="Despesas do Mês" 
                value={data?.monthly_expense ?? 0} 
                icon={<TrendingDown className="h-7 w-7" style={{ color: 'var(--finance-expense)' }} />}
                colorClass=""
                bgClass="var(--finance-expense-light)"
            />
            <KPICard 
                title="Resultado Líquido" 
                value={data?.net_result ?? 0} 
                icon={<CircleDollarSign className="h-7 w-7 text-orange-500" />}
                colorClass=""
                bgClass="bg-orange-500/10"
                helpTopic="NET_RESULT"
                {...({ style: { color: isPositive ? 'var(--finance-income)' : 'var(--finance-expense)' } } as any)}
            />
            <KPICard 
                title="Gasto em Cartões" 
                value={data?.total_current_invoices ?? 0} 
                icon={<CreditCard className="h-7 w-7 text-amber-500" />}
                colorClass="text-amber-500"
                bgClass="bg-amber-500/10"
            />
        </div>
    )
}
