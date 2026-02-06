"use client"

import { useState, useEffect } from "react"
import { getCalendarReport } from "@/services/reports"
import { CalendarReport } from "@/types/reports"
import { FinancialCalendar } from "@/components/calendar/FinancialCalendar"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, Info } from "lucide-react"
import { MonthPicker } from "@/components/ui/month-picker"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

export default function CalendarPage() {
    const currentDate = new Date()
    const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())
    const [report, setReport] = useState<CalendarReport | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { toast } = useToast()

    const fetchCalendar = async () => {
        setIsLoading(true)
        try {
            const data = await getCalendarReport(selectedMonth, selectedYear)
            setReport(data)
        } catch (error) {
            console.error("Failed to fetch calendar report", error)
            toast({
                title: "Erro ao carregar calendário",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchCalendar()
    }, [selectedMonth, selectedYear])

    const handlePrevMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12)
            setSelectedYear(prev => prev - 1)
        } else {
            setSelectedMonth(prev => prev - 1)
        }
    }

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1)
            setSelectedYear(prev => prev + 1)
        } else {
            setSelectedMonth(prev => prev + 1)
        }
    }

    return (
        <div className="container mx-auto py-10 px-4 max-w-7xl space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                   <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
                       Calendário
                   </h1>
                   <p className="text-sm font-bold text-muted-foreground/60 mt-1 uppercase tracking-widest">
                       Fluxo Financeiro • {selectedMonth}/{selectedYear}
                   </p>
                </div>

                <div className="flex items-center gap-2 bg-card/30 backdrop-blur-md p-1.5 rounded-[20px] border border-border/40 shadow-xl self-start md:self-auto ml-auto">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-2xl hover:bg-primary/10 transition-all active:scale-90"
                        onClick={handlePrevMonth}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    
                    <div className="px-2">
                        <MonthPicker 
                            currentMonth={selectedMonth}
                            currentYear={selectedYear}
                            onSelect={(month: number, year: number) => {
                                setSelectedMonth(month)
                                setSelectedYear(year)
                            }}
                        />
                    </div>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-2xl hover:bg-primary/10 transition-all active:scale-90"
                        onClick={handleNextMonth}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="bg-primary/5 border border-primary/10 p-4 rounded-[24px] flex items-start gap-4 backdrop-blur-sm animate-in fade-in slide-in-from-left-4 duration-1000">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Info className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Dica de Navegação</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                        Os valores exibidos representam a soma de todas as receitas e despesas do dia. 
                        Este calendário ajuda você a prever dias de maior saída de caixa e planejar seus pagamentos.
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-[600px] w-full rounded-[32px]" />
                </div>
            ) : (
                <FinancialCalendar 
                    month={selectedMonth} 
                    year={selectedYear} 
                    daysData={report?.days || []} 
                />
            )}
        </div>
    )
}
