"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Valor } from "@/components/ui/valor"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"

interface FinancialCalendarProps {
    month: number
    year: number
    daysData: CalendarDayReport[]
    isLoading?: boolean
}

// AZ-29: grade do mês no estilo do Azimute. Cada dia é um botão; os valores
// usam o <Valor> (sinal e cor de entrada e saída), e o resumo para leitor de
// tela fica no rótulo do botão.
export function FinancialCalendar({ month, year, daysData }: FinancialCalendarProps) {
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

    const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"]
    const fullWeekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

    const selectedDayData = selectedDate ? getDayData(selectedDate) : null

    const rotuloDoDia = (date: Date, dayData?: CalendarDayReport) => {
        const dia = format(date, "d 'de' MMMM", { locale: ptBR })
        if (!dayData) return `${dia}: sem lançamentos`
        const partes: string[] = []
        if (paraCentavos(dayData.total_incomes) > 0) partes.push(`entradas ${formatarMoeda(dayData.total_incomes)}`)
        if (paraCentavos(dayData.total_expenses) > 0) partes.push(`saídas ${formatarMoeda(dayData.total_expenses)}`)
        return partes.length ? `${dia}: ${partes.join(", ")}` : `${dia}: sem lançamentos`
    }

    return (
        <div className="space-y-6">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
            {/* Dias da semana */}
            <div className="grid grid-cols-7 border-b border-border" aria-hidden="true">
                {fullWeekDays.map((day, i) => (
                    <div key={day} className="py-3 text-center">
                        <span className="label hidden text-muted-foreground sm:inline">
                            {day}
                        </span>
                        <span className="label text-muted-foreground sm:hidden">
                            {weekDays[i]}
                        </span>
                    </div>
                ))}
            </div>

            <div className="grid auto-rows-fr grid-cols-7">
                {calendarDays.map((date, i) => {
                    const dayData = getDayData(date)
                    const isCurrentMonth = isSameMonth(date, viewDate)
                    const isTodayBtn = isToday(date)
                    const isSelected = selectedDate && isSameDay(date, selectedDate)
                    const temEntrada = !!dayData && paraCentavos(dayData.total_incomes) > 0
                    const temSaida = !!dayData && paraCentavos(dayData.total_expenses) > 0
                    const classes = cn(
                        "relative flex min-h-[72px] flex-col justify-between gap-1 border-b border-r border-border p-1.5 text-left sm:min-h-[120px] sm:p-3",
                        i % 7 === 6 && "border-r-0"
                    )

                    // Dias de fora do mês só completam a grade
                    if (!isCurrentMonth) {
                        return (
                            <div key={date.toString()} aria-hidden="true" className={cn(classes, "text-muted-foreground opacity-40")}>
                                <span className="font-mono text-sm">{format(date, "d")}</span>
                            </div>
                        )
                    }

                    return (
                        <button
                            type="button"
                            key={date.toString()}
                            aria-label={rotuloDoDia(date, dayData)}
                            aria-current={isTodayBtn ? "date" : undefined}
                            onClick={() => {
                                setSelectedDate(date)
                                setIsDialogOpen(true)
                            }}
                            className={cn(
                                classes,
                                "cursor-pointer transition-colors duration-fast ease-az-out hover:bg-elevated focus-visible:z-sticky focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                                isSelected && "bg-elevated"
                            )}
                        >
                            <span className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full font-mono text-sm sm:h-8 sm:w-8",
                                isTodayBtn
                                    ? "border border-gold-line text-gold-line"
                                    : isSelected
                                        ? "text-foreground"
                                        : "text-fg-secondary"
                            )}>
                                {format(date, "d")}
                            </span>

                            {/* Celular: marcas de entrada e saída (o rótulo do botão diz os valores) */}
                            <span aria-hidden="true" className="flex justify-center gap-1 sm:hidden">
                                {temEntrada && <span className="h-1.5 w-1.5 rounded-full bg-inflow" />}
                                {temSaida && <span className="h-1.5 w-1.5 rounded-full bg-outflow" />}
                            </span>

                            {/* Desktop: os valores do dia */}
                            <span aria-hidden="true" className="mt-auto hidden flex-col items-end gap-0.5 sm:flex">
                                {temEntrada && <Valor valor={dayData?.total_incomes} direcao="entrada" semMoeda className="max-w-full truncate" />}
                                {temSaida && <Valor valor={dayData?.total_expenses} direcao="saida" semMoeda className="max-w-full truncate" />}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>

            {/* Diálogo do dia */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    {selectedDate && (
                        <>
                            <DialogHeader>
                                <DialogTitle>
                                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                                </DialogTitle>
                                <DialogDescription>Resumo do dia</DialogDescription>
                            </DialogHeader>

                            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-md border border-border p-4">
                                    <dt className="label mb-2 text-muted-foreground">Entradas</dt>
                                    <dd><Valor valor={selectedDayData?.total_incomes} direcao="entrada" tamanho="l" /></dd>
                                </div>
                                <div className="rounded-md border border-border p-4">
                                    <dt className="label mb-2 text-muted-foreground">Saídas</dt>
                                    <dd><Valor valor={selectedDayData?.total_expenses} direcao="saida" tamanho="l" /></dd>
                                </div>
                                <div className="rounded-md border border-border p-4">
                                    <dt className="label mb-2 text-muted-foreground">Saldo do dia</dt>
                                    <dd><Valor valor={selectedDayData?.net_amount} tamanho="l" /></dd>
                                </div>
                            </dl>

                            {(!selectedDayData || (paraCentavos(selectedDayData.total_incomes) === 0 && paraCentavos(selectedDayData.total_expenses) === 0)) && (
                                // AZ-34: estado vazio com uma linha e uma ação
                                <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border-strong px-4 py-8 text-center">
                                    <p className="text-sm text-muted-foreground">Nenhum lançamento neste dia.</p>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/transacoes">Abrir o Diário de Bordo</Link>
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
