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
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10 shrink-0">
                <CalendarIcon className="h-8 w-8 text-primary" />
            </div>
            <div>
                 <h1 className="text-3xl font-black tracking-tight text-foreground/90">Calendário</h1>
                 <p className="text-muted-foreground mt-1.5 font-medium flex items-center gap-2">
                   Fluxo Financeiro Mensal
                   <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                   <span className="text-primary font-bold">{selectedMonth}/{selectedYear}</span>
                 </p>
            </div>
        </div>

        <div className="flex items-center gap-1 bg-background/40 backdrop-blur-md p-1 rounded-full border border-border/40 shadow-xl self-start md:self-auto ml-auto">
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                onClick={handlePrevMonth}
            >
                <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="px-1">
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
                className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                onClick={handleNextMonth}
            >
                <ChevronRight className="h-5 w-5" />
            </Button>
        </div>
      </div>

      {/* Information Banner (Premium Pattern) */}
      <div className="mb-8 p-5 rounded-3xl bg-primary/5 border border-primary/10 text-primary/80 animate-in slide-in-from-bottom-2 duration-700 flex items-start gap-5">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-primary/20">
              <Info className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
              <h4 className="font-bold text-sm text-foreground/80 tracking-tight">Dica de Navegação</h4>
              <p className="text-xs leading-relaxed max-w-3xl text-muted-foreground font-medium">
                  Os valores exibidos representam a soma de todas as receitas e despesas do dia. 
                  Este calendário permite visualizar rapidamente os dias de maior movimentação e planejar seu fluxo de caixa mensal.
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
