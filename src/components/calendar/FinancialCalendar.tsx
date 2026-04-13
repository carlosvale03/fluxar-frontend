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
        <div className="bg-card border border-border/60 rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            {/* Weekdays Header - Premium Style */}
            <div className="grid grid-cols-7 border-b border-border/40 bg-muted/20">
                {fullWeekDays.map((day, i) => (
                    <div key={day} className="py-4 text-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 hidden sm:inline">
                            {day}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 sm:hidden">
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
                                "min-h-[80px] sm:min-h-[140px] p-2 sm:p-4 border-r border-b border-border/10 transition-all duration-300 relative group flex flex-col justify-between cursor-pointer",
                                isCurrentMonth ? "bg-card hover:bg-muted/30" : "bg-muted/5 opacity-20 grayscale-[0.5] cursor-default",
                                isSelected && "bg-primary/[0.04] z-10",
                                i % 7 === 6 && "border-r-0"
                            )}
                        >
                            <div className="flex justify-between items-start">
                                <span className={cn(
                                    "text-sm sm:text-lg font-black w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl transition-all duration-500",
                                    isTodayBtn 
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105 ring-2 ring-primary/20" 
                                        : isSelected
                                            ? "bg-primary/10 text-primary border border-primary/20 ring-2 ring-primary/10"
                                            : "text-muted-foreground/50 group-hover:text-foreground group-hover:bg-muted/50"
                                )}>
                                    {format(date, "d")}
                                </span>
                                
                                {/* Desktop Indicator (Neon Glow) */}
                                {dayData && (dayData.total_incomes > 0 || dayData.total_expenses > 0) && (
                                     <div className={cn(
                                         "w-2 h-2 rounded-full mt-1 hidden sm:block",
                                         dayData.net_amount >= 0 
                                            ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" 
                                            : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"
                                     )} />
                                )}
                            </div>

                            {/* Mobile Indicators */}
                            <div className="flex sm:hidden justify-center gap-1.5 mt-2">
                                {dayData && dayData.total_incomes > 0 && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                )}
                                {dayData && dayData.total_expenses > 0 && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]" />
                                )}
                            </div>

                            {/* Desktop Strategy: Premium Soft Pills */}
                            <div className="hidden sm:flex flex-col gap-1.5 mt-auto">
                                {dayData && dayData.total_incomes > 0 && (
                                    <div className="flex items-center justify-between gap-1 text-[9px] font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1.5 rounded-full uppercase tracking-wider transition-all group-hover:bg-emerald-500/20">
                                        <div className="flex items-center gap-1 min-w-0">
                                            <TrendingUp className="h-3 w-3 shrink-0" />
                                            <span className="truncate">Receitas</span>
                                        </div>
                                        <span className="tabular-nums">{formatCurrency(dayData.total_incomes)}</span>
                                    </div>
                                )}
                                {dayData && dayData.total_expenses > 0 && (
                                    <div className="flex items-center justify-between gap-1 text-[9px] font-black text-rose-600 bg-rose-500/10 border border-rose-500/20 px-2 py-1.5 rounded-full uppercase tracking-wider transition-all group-hover:bg-rose-500/20">
                                        <div className="flex items-center gap-1 min-w-0">
                                            <TrendingDown className="h-3 w-3 shrink-0" />
                                            <span className="truncate">Despesas</span>
                                        </div>
                                        <span className="tabular-nums">{formatCurrency(dayData.total_expenses)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Border Highlight Effect on Hover */}
                            <div className={cn(
                                "absolute inset-0 border-2 border-primary/40 rounded-sm opacity-0 transition-opacity duration-300 pointer-events-none",
                                isSelected ? "opacity-100" : "group-hover:opacity-100"
                            )} />
                        </div>
                    )
                })}
            </div>
        </div>

            {/* MODAL DE DETALHES (Dialog View) */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl bg-card border-none p-0 overflow-hidden rounded-[32px] shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-300">
                    {selectedDate && (
                        <div className="flex flex-col">
                            {/* Modal Header - Premium Pattern */}
                            <div className="bg-primary/5 border-b border-border/40 p-8 flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm ring-1 ring-primary/20 shrink-0">
                                        <CalendarIcon className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-2xl font-black tracking-tight text-foreground/90">
                                            {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                                        </DialogTitle>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mt-1.5 flex items-center gap-2">
                                            <Sparkles className="h-3 w-3 text-primary/60" />
                                            Detalhamento Diário
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Content - Premium Cards */}
                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    {/* Incomes Card */}
                                    <div className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-3xl p-6 flex flex-col justify-between group hover:bg-emerald-500/[0.06] transition-all duration-500">
                                        <div className="flex items-center justify-between mb-5">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-sm ring-1 ring-emerald-500/20">
                                                <TrendingUp className="h-5 w-5" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60">Receitas</span>
                                        </div>
                                        <p className="text-2xl font-black text-emerald-600 tabular-nums">
                                            {formatCurrency(selectedDayData?.total_incomes || 0)}
                                        </p>
                                    </div>

                                    {/* Expenses Card */}
                                    <div className="bg-rose-500/[0.03] border border-rose-500/10 rounded-3xl p-6 flex flex-col justify-between group hover:bg-rose-500/[0.06] transition-all duration-500">
                                        <div className="flex items-center justify-between mb-5">
                                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-sm ring-1 ring-rose-500/20">
                                                <TrendingDown className="h-5 w-5" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-500/60">Despesas</span>
                                        </div>
                                        <p className="text-2xl font-black text-rose-600 tabular-nums">
                                            {formatCurrency(selectedDayData?.total_expenses || 0)}
                                        </p>
                                    </div>

                                    {/* Balance Card */}
                                    <div className="bg-primary/[0.03] border border-primary/10 rounded-3xl p-6 flex flex-col justify-between group hover:bg-primary/[0.06] transition-all duration-500">
                                        <div className="flex items-center justify-between mb-5">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm ring-1 ring-primary/20">
                                                <Wallet className="h-5 w-5" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">Saldo</span>
                                        </div>
                                        <p className={cn(
                                            "text-2xl font-black tabular-nums",
                                            (selectedDayData?.net_amount || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {formatCurrency(selectedDayData?.net_amount || 0)}
                                        </p>
                                    </div>
                                </div>

                                {!selectedDayData || (selectedDayData.total_incomes === 0 && selectedDayData.total_expenses === 0) ? (
                                    <div className="py-14 text-center border-2 border-dashed border-border/20 rounded-[32px] bg-muted/5 group">
                                        <div className="w-12 h-12 rounded-full bg-muted/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500">
                                            <Sparkles className="h-6 w-6 text-muted-foreground/30" />
                                        </div>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Sem movimentações no período</p>
                                    </div>
                                ) : (
                                    <div className="pt-6 border-t border-border/10">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 text-center italic">
                                            Dados consolidados do fluxo financeiro
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
