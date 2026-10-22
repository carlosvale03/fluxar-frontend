"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartEmptyState } from "@/components/dashboard/ChartEmptyState"
import { PieChart as PieIcon, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { deCentavos, formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { corDaSerie } from "@/lib/graficos"
import { RoscaDeDistribuicao } from "./rosca-de-distribuicao"

interface DistributionData {
    id?: string
    category_name: string
    amount: number | string
    color?: string
}

interface CategoryDistributionChartProps {
    title: string
    description?: string
    data: DistributionData[]
    isLoading?: boolean
    icon: LucideIcon
    iconColor?: string
    className?: string
    month?: number
    year?: number
    startDate?: string
    endDate?: string
    // Ação do estado vazio (AZ-34); sem ela, o link para o Diário de Bordo
    acaoVazia?: ReactNode
}

export function CategoryDistributionChart({
    title,
    description,
    data,
    isLoading,
    icon: Icon,
    iconColor = "text-muted-foreground",
    className,
    month,
    year,
    startDate,
    endDate,
    acaoVazia,
}: CategoryDistributionChartProps) {
    const router = useRouter()
    // CONTRATO-16: os valores chegam como texto; a soma é feita em centavos
    const totalAmount = deCentavos(data.reduce((acc, curr) => acc + paraCentavos(curr.amount), 0))

    const handleCategoryClick = (item: DistributionData & { categoryId?: string; category_id?: string; name?: string; label?: string }) => {
        const params = new URLSearchParams()
        
        // Try to find a valid ID in various possible fields
        const categoryId = item.id || item.categoryId || item.category_id
        const categoryName = item.category_name || item.name || item.label
        
        if (categoryId) {
            params.append('category', String(categoryId))
        } else if (categoryName) {
            // Fallback to name search only if ID is absolutely missing
            params.append('search', categoryName)
        }
        
        if (month) params.append('month', month.toString())
        if (year) params.append('year', year.toString())
        if (startDate) params.append('startDate', startDate)
        if (endDate) params.append('endDate', endDate)
        
        router.push(`/transacoes?${params.toString()}`)
    }

    const hasData = data && data.length > 0 && data.some(d => paraCentavos(d.amount) > 0)

    return (
        <Card className={cn(className)}>
            <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", iconColor)} aria-hidden="true" />
                    <h3>{title}</h3>
                </CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className="flex h-auto min-h-[320px] flex-col items-center justify-between gap-2 p-4 sm:flex-row sm:gap-4 sm:p-5 lg:gap-8 lg:p-6">
                {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                ) : !hasData ? (
                    <ChartEmptyState
                        type="pie"
                        height="300px"
                        title="Nada registrado neste período."
                        description="Registre um lançamento para ver a divisão por categoria."
                        icon={PieIcon}
                        {...(acaoVazia !== undefined && { acao: acaoVazia })}
                    />
                ) : (
                    <RoscaDeDistribuicao
                        total={formatarMoeda(totalAmount)}
                        fatias={data.map((item, index) => ({
                            chave: item.id ?? `${item.category_name}-${index}`,
                            nome: item.category_name,
                            valor: item.amount,
                            centavos: paraCentavos(item.amount),
                            cor: item.color || corDaSerie(index),
                            aoClicar: () => handleCategoryClick(item),
                        }))}
                    />
                )}
            </CardContent>
        </Card>
    )
}
