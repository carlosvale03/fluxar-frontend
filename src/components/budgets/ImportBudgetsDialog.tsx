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
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Calendar, Search, Filter, CheckCircle2, ChevronRight, Copy } from "lucide-react"
import { MonthRangePicker } from "@/components/ui/month-range-picker"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

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
  const { toast } = useToast()

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
      toast({
        title: "Erro ao buscar orçamentos",
        description: "Não foi possível carregar os orçamentos do período selecionado.",
        variant: "destructive"
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
      toast({
        title: "Importação concluída",
        description: response.message,
      })
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Erro na importação",
        description: error.response?.data?.error || "Ocorreu um erro inesperado.",
        variant: "destructive"
      })
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
      <DialogContent className="sm:max-w-[850px] w-[95vw] h-[95vh] sm:h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
        <div className="h-2 w-full bg-blue-600" />
        
        <div className="p-6 sm:p-8 pb-4 bg-background">
            <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-500/10 shrink-0">
                        <Copy className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <DialogTitle className="text-2xl font-bold tracking-tight">
                            Importar Orçamentos
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium opacity-70">
                            Reclique orçamentos de meses anteriores para o período atual.
                        </DialogDescription>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 shadow-sm w-fit">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-bold whitespace-nowrap">Destino: {months[targetMonth - 1]} {targetYear}</span>
                </div>
            </div>
            </DialogHeader>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Sidebar: Period Selection */}
          <div className="w-full sm:w-[320px] p-4 sm:p-5 space-y-4 sm:y-6 sm:border-r border-border/50 bg-background/20 overflow-y-auto max-h-[40vh] sm:max-h-full">
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary dark:text-primary-foreground font-black text-[10px] sm:text-[11px] uppercase tracking-widest px-1">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Período de Origem
                </div>
                <MonthRangePicker 
                    initialStart={range.start}
                    initialEnd={range.end}
                    excludedPeriod={{ month: targetMonth, year: targetYear }}
                    onRangeChange={(start, end) => setRange({ start, end })}
                />
            </div>
            
            <div className="hidden sm:block space-y-3 pt-2">
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
                    <h5 className="text-[10px] font-bold uppercase text-primary/70">Seleção Inteligente</h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                        Clique no mês de início e depois no fim para selecionar um intervalo.
                    </p>
                </div>
            </div>
          </div>

          {/* Main Content: Budget Selection */}
          <div className="flex-1 flex flex-col bg-background/10 overflow-hidden border-t sm:border-t-0 border-border/50">
            <div className="p-3 sm:p-4 border-b border-border/30 flex items-center gap-3 sm:gap-4 bg-background/30 backdrop-blur-sm sticky top-0 z-10">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/60 group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Filtrar categorias..." 
                        className="pl-9 h-9 sm:h-10 rounded-full border-border/60 bg-background/50 focus-visible:ring-primary/40 placeholder:text-foreground/40 placeholder:font-bold text-xs"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 pr-2 border-l border-border/40 pl-3 sm:pl-4">
                    <span className="text-[10px] font-black text-foreground uppercase whitespace-nowrap tracking-tight">
                        {selectedIds.length} <span className="hidden xs:inline">selecionados</span>
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 sm:py-20 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Buscando...</span>
                    </div>
                ) : budgets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 sm:py-20 text-center px-6">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4 border border-border/30">
                            <Filter className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground/30" />
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground">Sem resultados</h4>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 max-w-[220px]">
                            Selecione outro período ou verifique se há orçamentos salvos.
                        </p>
                    </div>
                ) : (
                    <div className="p-3 sm:p-4 space-y-6 sm:space-y-8 pb-10">
                        {groupedBudgets.map(([key, group]) => {
                            const allMonthSelected = group.budgets.every(b => selectedIds.includes(b.id))
                            const someMonthSelected = group.budgets.some(b => selectedIds.includes(b.id)) && !allMonthSelected

                            return (
                                <div key={key} className="space-y-3">
                                    <div className="flex items-center justify-between sticky top-0 z-20 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl bg-background/95 backdrop-blur-xl border border-border/60 shadow-md">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" />
                                            <span className="text-xs sm:text-sm font-black text-foreground">{group.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <span className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-tight">Marcar tudo</span>
                                            <Checkbox 
                                                checked={allMonthSelected} 
                                                onCheckedChange={(checked) => handleSelectMonth(group.budgets, !!checked)}
                                                className={cn("border-border/60", someMonthSelected && "data-[state=checked]:opacity-60")}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-1.5 pl-1">
                                        {group.budgets.map((budget) => (
                                            <div 
                                                key={budget.id} 
                                                onClick={() => handleToggleSelect(budget.id)}
                                                className={cn(
                                                    "group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 cursor-pointer",
                                                    selectedIds.includes(budget.id) 
                                                        ? "bg-primary/5 border-primary/20 shadow-sm translate-x-1" 
                                                        : "bg-background/20 border-border/30 hover:border-border/60 hover:bg-background/40"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                                                    <div className={cn(
                                                        "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                                                        selectedIds.includes(budget.id) 
                                                            ? "bg-primary text-primary-foreground rotate-0" 
                                                            : "bg-background/40 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                    )}>
                                                        <Checkbox 
                                                            checked={selectedIds.includes(budget.id)}
                                                            className="border-none bg-transparent data-[state=checked]:bg-transparent data-[state=checked]:text-current h-4 w-4 sm:h-5 sm:w-5 pointer-events-none"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[12px] sm:text-[14px] font-black text-foreground leading-none truncate">
                                                            {budget.category_detail.parent_name && (
                                                                <span className="text-muted-foreground/70 text-[9px] sm:text-[10px] uppercase font-black mr-1 hidden xs:inline">
                                                                    {budget.category_detail.parent_name} <ChevronRight className="inline h-2 w-2 mb-0.5" />
                                                                </span>
                                                            )}
                                                            {budget.category_detail.name}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-1.5 sm:mt-2">
                                                            <div className="h-1 sm:h-1.5 w-20 sm:w-28 bg-muted/60 rounded-full overflow-hidden border border-border/20">
                                                                <div 
                                                                    className="h-full bg-primary/50 rounded-full transition-all duration-1000" 
                                                                    style={{ width: `${Math.min(budget.percentage_used, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[8px] sm:text-[10px] font-black text-foreground/70 uppercase tracking-widest">
                                                                {budget.percentage_used.toFixed(0)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right ml-2">
                                                    <div className="text-[11px] sm:text-[13px] font-black text-foreground">R$ {Number(budget.amount_limit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                                    <div className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase opacity-80 tracking-tighter whitespace-nowrap">Teto Limite</div>
                                                </div>

                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-background/50 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="relative">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 transition-all duration-500">
                        {isImporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="text-base sm:text-lg font-black">{selectedIds.length}</span>}
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] sm:text-xs font-black text-foreground uppercase tracking-tight">Pronto para importar</span>
                    <span className="text-[9px] sm:text-[10px] text-foreground/60 font-black uppercase tracking-widest">Confirme para finalizar</span>
                </div>

            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button variant="ghost" className="flex-1 sm:flex-none rounded-2xl h-10 sm:h-12 px-4 sm:px-8 font-black text-[11px] sm:text-xs border border-transparent hover:border-border/40" onClick={onClose}>
                    Cancelar
                </Button>
                <Button 
                    onClick={handleImport} 
                    disabled={selectedIds.length === 0 || isImporting}
                    className="flex-1 sm:flex-none rounded-2xl h-10 sm:h-12 px-6 sm:px-14 font-black text-[11px] sm:text-[13px] uppercase tracking-wider shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
                >
                    {isImporting ? "..." : "Finalizar Importação"}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
