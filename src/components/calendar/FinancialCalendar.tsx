"use client"

import { useState, useMemo } from "react"
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameMonth, 
    isToday,
    isSameDay
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarDayReport } from "@/types/reports"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, ArrowUpCircle, ArrowDownCircle, Wallet, X, Sparkles } from "lucide-react"

interface FinancialCalendarProps {
    month: number
    year: number
    daysData: CalendarDayReport[]
    isLoading?: boolean
}

export function FinancialCalendar({ month, year, daysData, isLoading }: FinancialCalendarProps) {
    const viewDate = new Date(year, month - 1, 1)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    
    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 })
        const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 0 })
        
        return eachDayOfInterval({ start, end })
    }, [viewDate])

    const getDayData = (date: Date) => {
        const dateStr = format(date, "yyyy-MM-dd")
        return daysData.find(d => d.date === dateStr)
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL',
            maximumFractionDigits: 0
        }).format(value)
    }

    const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"]
    const fullWeekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

    const selectedDayData = selectedDate ? getDayData(selectedDate) : null

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="bg-card/40 backdrop-blur-xl rounded-[32px] border border-border/40 shadow-2xl overflow-hidden">
                {/* Weekdays Header */}
                <div className="grid grid-cols-7 border-b border-border/40 bg-muted/10">
                    {fullWeekDays.map((day, i) => (
                        <div key={day} className="py-4 text-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 hidden sm:inline">
                                {day}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 sm:hidden">
                                {weekDays[i]}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 auto-rows-fr">
                    {calendarDays.map((date, i) => {
                        const dayData = getDayData(date)
                        const isCurrentMonth = isSameMonth(date, viewDate)
                        const isTodayBtn = isToday(date)
                        const isSelected = selectedDate && isSameDay(date, selectedDate)
                        
                        return (
                            <div 
                                key={date.toString()}
                                onClick={() => {
                                    if (isCurrentMonth) {
                                        setSelectedDate(date)
                                        setIsDialogOpen(true)
                                    }
                                }}
                                className={cn(
                                    "min-h-[70px] sm:min-h-[120px] p-2 sm:p-4 border-r border-b border-border/20 transition-all duration-300 relative group flex flex-col justify-between cursor-pointer",
                                    isCurrentMonth ? "bg-card/5 hover:bg-primary/5" : "bg-muted/5 opacity-10 grayscale cursor-default",
                                    isSelected && "bg-primary/[0.08] ring-1 ring-inset ring-primary/30",
                                    i % 7 === 6 && "border-r-0"
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={cn(
                                        "text-xs sm:text-2xl font-black w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-all duration-300",
                                        isTodayBtn 
                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105 ring-2 ring-primary/20" 
                                            : isSelected
                                                ? "text-primary"
                                                : "text-muted-foreground/40 group-hover:text-foreground"
                                    )}>
                                        {format(date, "d")}
                                    </span>
                                    
                                    {/* Desktop Indicator (Dot) */}
                                    {dayData && (dayData.total_incomes > 0 || dayData.total_expenses > 0) && (
                                         <div className={cn(
                                             "w-2 sm:w-3 h-2 sm:h-3 rounded-full blur-[0.5px] mt-1 hidden sm:block",
                                             dayData.net_amount >= 0 ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" : "bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.7)]"
                                         )} />
                                    )}
                                </div>

                                {/* Mobile Strategy: Compact Dots */}
                                <div className="flex sm:hidden justify-center gap-1 mb-1">
                                    {dayData && dayData.total_incomes > 0 && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    )}
                                    {dayData && dayData.total_expenses > 0 && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    )}
                                </div>

                                {/* Desktop Strategy: Pills with values */}
                                <div className="hidden sm:flex flex-col gap-1.5 mt-auto">
                                    {dayData && dayData.total_incomes > 0 && (
                                        <div className="flex items-center justify-between gap-1 text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg truncate transition-all group-hover:bg-emerald-500/20">
                                            <TrendingUp className="h-4 w-4 shrink-0" />
                                            <span>{formatCurrency(dayData.total_incomes)}</span>
                                        </div>
                                    )}
                                    {dayData && dayData.total_expenses > 0 && (
                                        <div className="flex items-center justify-between gap-1 text-xs font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg truncate transition-all group-hover:bg-rose-500/20">
                                            <TrendingDown className="h-4 w-4 shrink-0" />
                                            <span>{formatCurrency(dayData.total_expenses)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Hover Highlight Overlay */}
                                <div className={cn(
                                    "absolute inset-x-0 bottom-0 h-1 transition-transform duration-500 origin-left",
                                    isSelected ? "bg-primary scale-x-100" : "bg-primary/40 scale-x-0 group-hover:scale-x-100"
                                )} />
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* MODAL DE DETALHES (Dialog View) */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl bg-card/60 backdrop-blur-3xl border-border/40 p-0 overflow-hidden rounded-[32px] sm:rounded-[40px] shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-300">
                    {selectedDate && (
                        <div className="flex flex-col">
                            {/* Header do Modal */}
                            <div className="bg-primary/10 border-b border-primary/10 p-8 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-[24px] bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                                        <CalendarIcon className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                                            {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                                        </DialogTitle>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mt-1">
                                            Detalhamento Financeiro Diário
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Conteúdo do Modal */}
                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Ganhos */}
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[24px] p-6 flex flex-col justify-between group hover:bg-emerald-500/15 transition-all duration-300">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70">Receitas</span>
                                            <ArrowUpCircle className="h-5 w-5 text-emerald-500/40" />
                                        </div>
                                        <p className="text-2xl font-black text-emerald-500 tabular-nums">
                                            {formatCurrency(selectedDayData?.total_incomes || 0)}
                                        </p>
                                    </div>

                                    {/* Gastos */}
                                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-[24px] p-6 flex flex-col justify-between group hover:bg-rose-500/15 transition-all duration-300">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500/70">Despesas</span>
                                            <ArrowDownCircle className="h-5 w-5 text-rose-500/40" />
                                        </div>
                                        <p className="text-2xl font-black text-rose-500 tabular-nums">
                                            {formatCurrency(selectedDayData?.total_expenses || 0)}
                                        </p>
                                    </div>

                                    {/* Saldo */}
                                    <div className="bg-primary/10 border border-primary/20 rounded-[24px] p-6 flex flex-col justify-between group hover:bg-primary/15 transition-all duration-300">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Saldo</span>
                                            <Wallet className="h-5 w-5 text-primary/40" />
                                        </div>
                                        <p className={cn(
                                            "text-2xl font-black tabular-nums",
                                            (selectedDayData?.net_amount || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                                        )}>
                                            {formatCurrency(selectedDayData?.net_amount || 0)}
                                        </p>
                                    </div>
                                </div>

                                {!selectedDayData || (selectedDayData.total_incomes === 0 && selectedDayData.total_expenses === 0) ? (
                                    <div className="py-12 text-center border-2 border-dashed border-border/20 rounded-[32px] bg-muted/5">
                                        <Sparkles className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                                        <p className="text-sm font-bold text-muted-foreground/40 uppercase tracking-widest">Nenhuma movimentação para este dia</p>
                                    </div>
                                ) : (
                                    <div className="pt-4 border-t border-border/10">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center italic">
                                            Valores consolidados em {format(selectedDate, "dd/MM/yyyy")}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
