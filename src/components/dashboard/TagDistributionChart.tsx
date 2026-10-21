"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartEmptyState } from "@/components/dashboard/ChartEmptyState"
import { Tag as TagIcon, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { deCentavos, formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { corDaSerie } from "@/lib/graficos"
import { RoscaDeDistribuicao } from "./rosca-de-distribuicao"

interface DistributionData {
    id: string
    name: string
    amount: number | string
    color?: string
}

interface TagDistributionChartProps {
    title: string
    description?: string
    data: DistributionData[]
    isLoading?: boolean
    icon?: LucideIcon
    iconColor?: string
    className?: string
    month?: number
    year?: number
    startDate?: string
    endDate?: string
}

export function TagDistributionChart({
    title,
    description,
    data,
    isLoading,
    icon: Icon = TagIcon,
    iconColor = "text-muted-foreground",
    className,
    month,
    year,
    startDate,
    endDate
}: TagDistributionChartProps) {
    const router = useRouter()
    // CONTRATO-16: os valores chegam como texto; a soma é feita em centavos
    const totalAmount = deCentavos(data.reduce((acc, curr) => acc + paraCentavos(curr.amount), 0))

    const handleTagClick = (item: DistributionData) => {
        const params = new URLSearchParams()
        
        if (item.id === 'others') {
            params.append('has_tags', 'false')
        } else {
            params.append('tag', item.id)
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
                    <span>{title}</span>
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
                        title={title}
                        description={`Nenhum dado de ${title.toLowerCase()} encontrado no período.`}
                        icon={TagIcon}
                    />
                ) : (
                    <RoscaDeDistribuicao
                        total={formatarMoeda(totalAmount)}
                        rotuloDoTotal="Total Tag"
                        fatias={data.map((item, index) => ({
                            chave: item.id ?? `${item.name}-${index}`,
                            nome: item.name,
                            valor: item.amount,
                            centavos: paraCentavos(item.amount),
                            cor: item.color || corDaSerie(index),
                            aoClicar: () => handleTagClick(item),
                        }))}
                    />
                )}
            </CardContent>
        </Card>
    )
}
