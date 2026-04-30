"use client"

import { useRouter } from "next/navigation"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartEmptyState } from "@/components/dashboard/ChartEmptyState"
import { PieChart as PieIcon, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

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
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL',
        maximumFractionDigits: 0
    }).format(value)
}

const formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL'
    }).format(value)
}

export function CategoryDistributionChart({
    title,
    description,
    data,
    isLoading,
    icon: Icon,
    iconColor = "text-primary",
    className,
    month,
    year,
    startDate,
    endDate
}: CategoryDistributionChartProps) {
    const router = useRouter()
    const totalAmount = data.reduce((acc, curr) => acc + Number(curr.amount), 0)

    const handleCategoryClick = (item: any) => {
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

    const hasData = data && data.length > 0 && data.some(d => Number(d.amount) > 0)

    return (
        <Card className={cn(
            "border border-border/60 bg-card shadow-md hover:shadow-lg hover:border-primary/20 transition-all rounded-[32px] overflow-hidden",
            className
        )}>
            <CardHeader className="pb-0 pt-6">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", iconColor)} />
                    {title}
                </CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className="h-auto min-h-[320px] flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 lg:p-6 gap-2 sm:gap-4 lg:gap-8">
                {isLoading ? (
                    <Skeleton className="w-full h-[300px] rounded-2xl" />
                ) : !hasData ? (
                    <ChartEmptyState 
                        type="pie" 
                        height="300px" 
                        title={title}
                        description={`Seus dados de ${title.toLowerCase()} aparecerão aqui.`}
                        icon={PieIcon}
                    />
                ) : (
                    <>
                        <div className="w-full h-[220px] sm:h-[250px] lg:h-[280px] relative sm:flex-1" style={{ minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="65%"
                                        outerRadius="90%"
                                        paddingAngle={4}
                                        dataKey="amount"
                                        nameKey="category_name"
                                        stroke="none"
                                    >
                                        {data.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.color || COLORS[index % COLORS.length]} 
                                                className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                                                style={{ filter: `drop-shadow(0 4px 6px ${entry.color || COLORS[index % COLORS.length]}22)` }}
                                                onClick={() => handleCategoryClick(data[index])}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        wrapperStyle={{ zIndex: 100 }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const item = payload[0].payload
                                                return (
                                                    <div className="z-50 bg-background/95 backdrop-blur-2xl border border-border/50 p-3 rounded-2xl shadow-2xl ring-1 ring-black/5">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || COLORS[payload[0].index % COLORS.length] }} />
                                                            <span className="text-sm font-black">{item.category_name}</span>
                                                        </div>
                                                        <p className="text-xs font-bold text-muted-foreground">
                                                            {formatCurrencyFull(Number(item.amount))}
                                                        </p>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0">
                                <span className="block text-[8px] font-black uppercase tracking-tighter text-muted-foreground opacity-50">Total</span>
                                <span className="block text-xs sm:text-base lg:text-lg font-black">{formatCurrency(totalAmount)}</span>
                            </div>
                        </div>
                        <div className="w-full sm:w-[160px] md:w-[150px] lg:w-[220px] xl:w-[240px] space-y-0.5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar mt-4 sm:mt-0 shrink-0">
                            {data.map((item, index) => (
                                <div 
                                    key={index} 
                                    onClick={() => handleCategoryClick(item)}
                                    className="flex items-center justify-between py-1 px-2 rounded-xl hover:bg-muted/30 transition-colors group cursor-pointer"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }} />
                                        <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors truncate">
                                            {item.category_name}
                                        </span>
                                    </div>
                                    <span className="text-[10px] sm:text-[11px] font-black shrink-0 ml-2">{formatCurrency(Number(item.amount))}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
