"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Budget } from "@/types/budgets"
import { getBudgets, bulkImportBudgets } from "@/services/budgets"
import { toast } from "sonner"
import { tratarErro } from "@/lib/erros"
import { Loader2, Calendar, Search, Filter, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MonthRangePicker } from "@/components/ui/month-range-picker"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatarMoeda } from "@/lib/dinheiro"

interface ImportBudgetsDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  targetMonth: number
  targetYear: number
}

export function ImportBudgetsDialog({ 
  isOpen, 
  onClose, 
  onSuccess, 
  targetMonth, 
  targetYear 
}: ImportBudgetsDialogProps) {
  const [range, setRange] = useState<{
    start: { month: number; year: number }
    end: { month: number; year: number }
  }>({
    start: { 
        month: targetMonth === 1 ? 12 : targetMonth - 1, 
        year: targetMonth === 1 ? targetYear - 1 : targetYear 
    },
    end: { 
        month: targetMonth === 1 ? 12 : targetMonth - 1, 
        year: targetMonth === 1 ? targetYear - 1 : targetYear 
    }
  })
  
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]

  const fetchSourceBudgets = async () => {
    setIsLoading(true)
    try {
      const data = await getBudgets({ 
        start_month: range.start.month,
        start_year: range.start.year,
        end_month: range.end.month,
        end_year: range.end.year
      })
      
      const filteredData = data.filter(b => !(b.month === targetMonth && b.year === targetYear))
      setBudgets(filteredData)
      setSelectedIds([]) 
    } catch (error) {
      console.error(error)
      tratarErro(error, {
        mensagemPadrao: "Não foi possível carregar os orçamentos do período selecionado.",
        tentarDeNovo: fetchSourceBudgets,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchSourceBudgets()
    }
  }, [isOpen, range])

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSelectMonth = (periodBudgets: Budget[], checked: boolean) => {
    const periodIds = periodBudgets.map(b => b.id)
    if (checked) {
      setSelectedIds(prev => [...new Set([...prev, ...periodIds])])
    } else {
      setSelectedIds(prev => prev.filter(id => !periodIds.includes(id)))
    }
  }

  const handleImport = async () => {
    if (selectedIds.length === 0) return

    setIsImporting(true)
    try {
      const response = await bulkImportBudgets(selectedIds, targetMonth, targetYear)
      toast.success("Importação concluída.", { description: response.message })
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error(error)
      tratarErro(error, { mensagemPadrao: "Erro na importação. Ocorreu um erro inesperado." })
    } finally {
      setIsImporting(false)
    }
  }

  const groupedBudgets = useMemo(() => {
    const filtered = budgets.filter(b => 
        b.category_detail.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.category_detail.parent_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const groups: Record<string, { label: string, budgets: Budget[] }> = {}
    
    filtered.forEach(b => {
      const key = `${b.year}-${b.month}`
      if (!groups[key]) {
        groups[key] = {
          label: `${months[b.month - 1]} ${b.year}`,
          budgets: []
        }
      }
      groups[key].budgets.push(b)
    })

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [budgets, searchTerm])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[95vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:h-[85vh] sm:max-w-[850px]">
        <div className="border-b border-border p-6 pr-12">
            <DialogHeader>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1">
                    <DialogTitle>
                        Importar Orçamentos
                    </DialogTitle>
                    <DialogDescription>
                        Copie orçamentos de meses anteriores para o período atual.
                    </DialogDescription>
                </div>
                <Badge variant="info" className="w-fit">
                    Destino: {months[targetMonth - 1]} {targetYear}
                </Badge>
            </div>
            </DialogHeader>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
          {/* Sidebar: Period Selection */}
          <div className="max-h-[40vh] w-full space-y-4 overflow-y-auto p-4 sm:max-h-full sm:w-[320px] sm:border-r sm:border-border sm:p-5">
            <div className="space-y-3">
                <p className="label flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    Período de origem
                </p>
                <MonthRangePicker
                    initialStart={range.start}
                    initialEnd={range.end}
                    excludedPeriod={{ month: targetMonth, year: targetYear }}
                    onRangeChange={(start, end) => setRange({ start, end })}
                />
            </div>

            <p className="hidden text-xs text-muted-foreground sm:block">
                Clique no mês de início e depois no fim para selecionar um intervalo.
            </p>
          </div>

          {/* Main Content: Budget Selection */}
          <div className="flex flex-1 flex-col overflow-hidden border-t border-border sm:border-t-0">
            <div className="sticky top-0 z-sticky flex items-center gap-3 border-b border-border bg-popover p-3 sm:p-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                        aria-label="Filtrar categorias"
                        placeholder="Filtrar categorias..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <span className="whitespace-nowrap text-sm text-fg-secondary">
                    <span className="value-m">{selectedIds.length}</span> selecionados
                </span>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 sm:py-20" role="status">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                        <span className="text-sm text-muted-foreground">Buscando...</span>
                    </div>
                ) : budgets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-10 text-center sm:py-20">
                        <Filter className="mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />
                        <h4 className="text-sm font-semibold">Sem resultados</h4>
                        <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
                            Selecione outro período ou verifique se há orçamentos salvos.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6 p-3 pb-10 sm:p-4">
                        {groupedBudgets.map(([key, group]) => {
                            const allMonthSelected = group.budgets.every(b => selectedIds.includes(b.id))
                            const someMonthSelected = group.budgets.some(b => selectedIds.includes(b.id)) && !allMonthSelected

                            return (
                                <div key={key} className="space-y-2">
                                    <div className="flex items-center justify-between rounded-md border border-border bg-elevated px-3 py-2">
                                        <span className="text-sm font-semibold">{group.label}</span>
                                        <label className="flex cursor-pointer items-center gap-2 text-xs text-fg-secondary">
                                            Marcar tudo
                                            <Checkbox
                                                checked={allMonthSelected}
                                                aria-label={`Marcar todos de ${group.label}`}
                                                className={cn(someMonthSelected && "border-gold-line")}
                                                onCheckedChange={(checked) => handleSelectMonth(group.budgets, !!checked)}
                                            />
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-1 gap-1">
                                        {group.budgets.map((budget) => {
                                            const marcado = selectedIds.includes(budget.id)
                                            return (
                                            <label
                                                key={budget.id}
                                                htmlFor={`importar-${budget.id}`}
                                                className={cn(
                                                    "flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 transition-colors duration-fast",
                                                    marcado ? "border-gold-line bg-elevated" : "border-border hover:bg-elevated"
                                                )}
                                            >
                                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                                    <Checkbox
                                                        id={`importar-${budget.id}`}
                                                        checked={marcado}
                                                        onCheckedChange={() => handleToggleSelect(budget.id)}
                                                    />
                                                    <div className="flex min-w-0 flex-col gap-1.5">
                                                        <span className="truncate text-sm">
                                                            {budget.category_detail.parent_name && (
                                                                <span className="mr-1 text-xs text-muted-foreground">
                                                                    {budget.category_detail.parent_name} <ChevronRight className="inline h-3 w-3" aria-hidden="true" />
                                                                </span>
                                                            )}
                                                            {budget.category_detail.name}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-elevated">
                                                                <div
                                                                    className="h-full rounded-full bg-fg-secondary"
                                                                    style={{ width: `${Math.min(budget.percentage_used, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="value-m text-xs text-muted-foreground">
                                                                {budget.percentage_used.toFixed(0)}% usado
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="ml-2 text-right">
                                                    <div className="value-m">{formatarMoeda(budget.amount_limit)}</div>
                                                    <div className="text-xs text-muted-foreground">Limite</div>
                                                </div>
                                            </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border p-4 sm:flex-row">
            <p className="self-start text-sm text-fg-secondary sm:self-auto">
                <span className="value-m text-foreground">{selectedIds.length}</span> {selectedIds.length === 1 ? "orçamento pronto" : "orçamentos prontos"} para importar
            </p>

            <div className="flex w-full items-center gap-2 sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={onClose}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleImport}
                    disabled={selectedIds.length === 0}
                    loading={isImporting}
                    className="flex-1 sm:flex-none"
                >
                    Finalizar Importação
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
