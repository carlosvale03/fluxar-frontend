"use client"

import { useState, useEffect } from "react"
import { getCalendarReport } from "@/services/reports"
import { CalendarReport } from "@/types/reports"
import { FinancialCalendar } from "@/components/calendar/FinancialCalendar"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Info } from "lucide-react"
import { MonthPicker } from "@/components/ui/month-picker"
import { tratarErro } from "@/lib/erros"
import { Skeleton } from "@/components/ui/skeleton"
import { AvisoDoPlano } from "@/components/planos/recurso-bloqueado"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"
import { usePlan } from "@/hooks/use-plan"

const TITULO = "Calendário"
const APOIO = "Vencimentos e fechamentos"

// PERM-19: com `calendario` fechado, a tela mostra o aviso do plano e o
// calendário nem é montado, então /reports/calendar/ não é chamado
export default function CalendarPage() {
    const { podeUsar } = usePlan()
    const liberado = podeUsar("calendario")

    if (liberado === null) return null
    if (liberado) return <CalendarioDoMes />

    return (
        <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-6">
            <CabecalhoDePagina titulo={TITULO} apoio={APOIO} className="pb-0" />
            <AvisoDoPlano />
        </div>
    )
}

function CalendarioDoMes() {
    const currentDate = new Date()
    const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())
    const [report, setReport] = useState<CalendarReport | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const fetchCalendar = async () => {
        setIsLoading(true)
        try {
            const data = await getCalendarReport(selectedMonth, selectedYear)
            setReport(data)
        } catch (error) {
            console.error("Failed to fetch calendar report", error)
            tratarErro(error, { mensagemPadrao: "Não foi possível carregar o calendário.", tentarDeNovo: fetchCalendar })
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
        <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-6">
            <CabecalhoDePagina
                titulo={TITULO}
                apoio={APOIO}
                className="pb-0"
                periodo={
                    <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth} aria-label="Mês anterior" title="Mês anterior">
                            <ChevronLeft aria-hidden="true" />
                        </Button>

                        <MonthPicker
                            currentMonth={selectedMonth}
                            currentYear={selectedYear}
                            onSelect={(month: number, year: number) => {
                                setSelectedMonth(month)
                                setSelectedYear(year)
                            }}
                        />

                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth} aria-label="Próximo mês" title="Próximo mês">
                            <ChevronRight aria-hidden="true" />
                        </Button>
                    </div>
                }
            />

            {/* Alerta informativo com a listra lateral (DESIGN.md §5, Alertas) */}
            <div className="flex items-start gap-3 rounded-r-lg border border-border border-l-[3px] border-l-info bg-card p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                <div className="space-y-1">
                    <h2 className="text-sm font-semibold">Como ler o calendário</h2>
                    <p className="max-w-3xl text-sm text-fg-secondary">
                        Cada dia mostra a soma das entradas (+) e das saídas (−), em reais.
                        Escolha um dia para ver o resumo dele.
                    </p>
                </div>
            </div>

            {isLoading ? (
                // AZ-34: o esqueleto tem a forma da grade do mês (semana e 35 dias)
                <div className="overflow-hidden rounded-lg border border-border" aria-busy="true" aria-label="Carregando o calendário">
                    <div className="grid grid-cols-7 border-b border-border">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="flex justify-center py-3">
                                <Skeleton className="h-3 w-8" />
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {Array.from({ length: 35 }).map((_, i) => (
                            <div key={i} className="flex min-h-[72px] flex-col justify-between border-b border-r border-border p-1.5 sm:min-h-[120px] sm:p-3">
                                <Skeleton className="h-6 w-6 rounded-full" />
                                <Skeleton className="ml-auto hidden h-3 w-14 sm:block" />
                            </div>
                        ))}
                    </div>
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
