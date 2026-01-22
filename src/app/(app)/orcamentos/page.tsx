"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Budget } from "@/types/budgets"
import { getBudgets, deleteBudget } from "@/services/budgets"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PlusCircle, Pencil, Trash2, AlertTriangle, CheckCircle, AlertCircle, Search, Eye, Copy, Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { BudgetForm } from "@/components/budgets/BudgetForm"
import { ImportBudgetsDialog } from "@/components/budgets/ImportBudgetsDialog"
import { LucideIcon } from "@/components/ui/icon-picker"
import { Input } from "@/components/ui/input"
import { MonthPicker } from "@/components/ui/month-picker"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined)
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)

  
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCardId, setActiveCardId] = useState<string | null>(null)


  const { toast } = useToast()

  const fetchBudgets = async () => {
    setIsLoading(true)
    try {
      const data = await getBudgets({ month: selectedMonth, year: selectedYear })
      setBudgets(data)
    } catch (error) {
      console.error(error)
      toast({
        title: "Erro ao carregar orçamentos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBudgets()
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


  const handleDelete = async () => {
    if (!deletingBudget) return

    try {
      await deleteBudget(deletingBudget.id)
      toast({
        title: "Sucesso",
        description: "Orçamento excluído com sucesso.",
      })
      fetchBudgets()
    } catch (error) {
       console.error(error)
       toast({
        title: "Erro",
        description: "Não foi possível excluir o orçamento.",
        variant: "destructive",
       })
    } finally {
      setDeletingBudget(null)
    }
  }


  const getStatusInfo = (status: string, percentage: number) => {
      switch(status) {
          case 'OK': 
            return {
                label: 'Dentro do Limite',
                variant: 'outline' as const,
                bg: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-900/50',
                icon: <CheckCircle className="h-3.5 w-3.5" />
            }
          case 'NEAR_LIMIT': 
            return {
                label: 'Alerta de Gastos',
                variant: 'outline' as const,
                bg: 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-900/50',
                icon: <AlertTriangle className="h-3.5 w-3.5" />
            }
          case 'OVER_LIMIT': 
            return {
                label: 'Limite Estourado',
                variant: 'destructive' as const,
                bg: 'bg-red-500 text-white border-red-200',
                icon: <AlertCircle className="h-3.5 w-3.5" />
            }
          default: 
            return {
                label: 'Processando',
                variant: 'secondary' as const,
                bg: 'bg-muted',
                icon: null
            }
      }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage < 50) return "bg-green-500"
    if (percentage < 90) return "bg-yellow-500"
    if (percentage < 100) return "bg-orange-500"
    return "bg-red-500"
  }

  const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const CATEGORY_ICON_MAP: Record<string, string> = {
    "moradia": "Home",
    "alimentação": "Utensils",
    "transporte": "Car",
    "saúde": "HeartPulse",
    "educação": "GraduationCap",
    "lazer": "Gamepad2",
    "salário": "Banknote",
    "outros": "Tag",
    "investimentos": "TrendingUp",
    "presentes": "Gift",
    "mercado": "ShoppingBasket",
    "restaurante": "Coffee",
    "assinaturas": "Tv",
    "internet": "Wifi",
    "telefone": "Smartphone",
    "luz": "Zap",
    "água": "Droplets",
  }

  const getCategoryIcon = (name: string, icon?: string) => {
    if (icon && icon !== "Tag" && icon !== "circle" && icon !== "") {
      return icon
    }
    return CATEGORY_ICON_MAP[name.toLowerCase()] || "Tag"
  }

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ]
  
  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 1 + i)

  const filteredBudgets = budgets.filter(budget => 
    budget.category_detail.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    budget.category_detail.parent_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container mx-auto py-10 px-4 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Orçamentos</h1>
           <p className="text-muted-foreground mt-1">
             Defina limites e controle seus gastos mensais.
           </p>
        </div>
        
          <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-1 bg-background/40 p-1 rounded-2xl border border-border/40 shadow-sm">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl hover:bg-primary/10 transition-colors"
                    onClick={handlePrevMonth}
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <MonthPicker 
                    currentMonth={selectedMonth}
                    currentYear={selectedYear}
                    onSelect={(month, year) => {
                        setSelectedMonth(month)
                        setSelectedYear(year)
                    }}
                />

                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl hover:bg-primary/10 transition-colors"
                    onClick={handleNextMonth}
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setIsImportOpen(true)}
                className="w-full sm:w-auto rounded-full border-primary/20 hover:border-primary/50 text-primary transition-all duration-300"
              >
                <Copy className="mr-2 h-4 w-4" />
                Importar de meses anteriores
              </Button>


              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto rounded-full shadow-sm hover:shadow-md transition-all">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Novo Orçamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
                    <div className="h-2 w-full bg-blue-600" />
                    <div className="p-8 pt-6">
                      <BudgetForm 
                          onSuccess={() => {
                              setIsCreateOpen(false)
                              fetchBudgets()
                          }}
                          onCancel={() => setIsCreateOpen(false)}
                          defaultMonth={selectedMonth}
                          defaultYear={selectedYear}
                      />
                    </div>
                  </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

        <div className="flex items-center justify-between gap-4 py-2 mb-6">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Filtrar por nome..."
                    className="pl-9 rounded-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={budgets.length === 0}
                />
            </div>
            <div className="text-sm text-muted-foreground hidden md:block">
                {filteredBudgets.length} {filteredBudgets.length === 1 ? 'orçamento definido' : 'orçamentos definidos'}
            </div>
        </div>

        <Separator className="my-6 opacity-0" />

        <div className="mb-8 p-4 rounded-3xl bg-primary/5 border border-primary/10 text-primary/80 animate-in slide-in-from-bottom-2 duration-700 flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="font-bold text-sm text-primary">Controle Informativo</h4>
            <p className="text-xs leading-relaxed max-w-2xl">
              O sistema de orçamentos é uma ferramenta de planejamento. Definir um limite <span className="font-bold">não bloqueia</span> a criação de novas despesas, apenas ajuda você a monitorar seu progresso e saúde financeira de forma visual.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBudgets.map((budget) => {
              const statusInfo = getStatusInfo(budget.status, budget.percentage_used)
              const progressColor = getProgressColor(budget.percentage_used)
              
              return (
                <div 
                  key={budget.id} 
                  onClick={() => setActiveCardId(activeCardId === budget.id ? null : budget.id)}
                  className={cn(
                    "group relative flex flex-col p-5 rounded-2xl border transition-all cursor-pointer overflow-hidden",
                    activeCardId === budget.id 
                      ? "bg-muted/50 border-primary shadow-lg scale-[1.02] z-10" 
                      : "border-border/60 bg-card hover:bg-muted/30 hover:border-primary/20 hover:shadow-md h-full"
                  )}
                >

                  {/* Status Indicator Bar at the very top (subtle) */}
                  <div className={cn("absolute top-0 left-0 w-full h-1 opacity-60", progressColor)} />

                  <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4 min-w-0">
                          <div 
                              className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10 shrink-0"
                              style={{ backgroundColor: budget.category_detail.color }}
                          >
                              <LucideIcon name={getCategoryIcon(budget.category_detail.name, budget.category_detail.icon)} className="h-6 w-6" />
                          </div>
                          <div className="flex flex-col min-w-0">
                              <h3 className="font-bold text-lg leading-tight truncate">
                                {budget.category_detail.parent_name ? (
                                  <span className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-wider">{budget.category_detail.parent_name}</span>
                                    <span>{budget.category_detail.name}</span>
                                  </span>
                                ) : (
                                  budget.category_detail.name
                                )}
                              </h3>
                               <span className="text-[10px] text-primary font-black uppercase tracking-widest flex items-center gap-1.5 mt-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                <CalendarIcon className="h-3 w-3" />
                                {months.find(m => m.value === budget.month)?.label} • {budget.year}
                              </span>
                          </div>
                      </div>
                      <Badge 
                        variant={statusInfo.variant} 
                        className={cn("flex gap-1.5 items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all duration-300", 
                          statusInfo.bg,
                          activeCardId === budget.id && "scale-110 shadow-sm"
                        )}
                      >
                          {statusInfo.icon}
                          {statusInfo.label}
                      </Badge>
                  </div>


                  <div className="space-y-4">
                      <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-end mb-1">
                              <span className="text-sm text-muted-foreground">Gastos acumulados</span>
                              <span className="text-sm font-semibold">{formatCurrency(budget.total_spent)}</span>
                          </div>
                          <Progress value={Math.min(budget.percentage_used, 100)} className="h-2.5" indicatorColor={progressColor} />
                          <div className="flex justify-between items-start mt-1">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Limite: {formatCurrency(budget.amount_limit)}</span>
                              <span className={cn("text-[10px] font-bold", budget.percentage_used > 100 ? "text-destructive" : "text-muted-foreground")}>
                                {budget.percentage_used.toFixed(1)}%
                              </span>
                          </div>
                      </div>

                      {budget.status === 'OVER_LIMIT' && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 text-red-600 border border-red-200/50">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              <p className="text-[11px] font-medium leading-tight">
                                Orçamento excedido em {formatCurrency(Math.max(0, budget.total_spent - budget.amount_limit))}
                              </p>
                          </div>
                      )}
                  </div>

                  {/* Hover/Tap Actions */}
                  <div className={cn(
                    "flex gap-1.5 absolute top-3 right-3 p-1.5 rounded-2xl transition-all duration-300",
                    "bg-background/80 backdrop-blur-md shadow-lg border border-border/40",
                    activeCardId === budget.id 
                      ? "opacity-100 translate-y-0 scale-100" 
                      : "opacity-0 sm:opacity-0 group-hover:opacity-100 -translate-y-2 scale-90"
                  )}>
                     <Link href={`/transacoes?category=${budget.category_detail.id}&month=${budget.month}&year=${budget.year}`} onClick={(e) => e.stopPropagation()}>
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all rounded-xl" 
                            title="Ver Transações"
                         >
                             <Eye className="h-4 w-4" />
                         </Button>
                     </Link>
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all rounded-xl" 
                        onClick={(e) => { e.stopPropagation(); setEditingBudget(budget) }}
                     >
                         <Pencil className="h-4 w-4" />
                     </Button>
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-all rounded-xl" 
                        onClick={(e) => { e.stopPropagation(); setDeletingBudget(budget) }}
                     >
                         <Trash2 className="h-4 w-4" />
                     </Button>
                  </div>

                </div>
              )
          })}

          {filteredBudgets.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed border-muted rounded-2xl bg-muted/5 animate-in zoom-in-95 duration-500">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 opacity-20" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {searchTerm ? "Nenhum orçamento encontrado" : "Sem orçamentos definidos"}
                  </h3>
                  <p className="max-w-xs mx-auto mt-2 mb-6">
                    {searchTerm 
                      ? `Não encontramos nenhum orçamento para "${searchTerm}".`
                      : "Você ainda não definiu limites de gastos para este período. Comece agora!"
                    }
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsCreateOpen(true)} className="rounded-full px-8">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Criar meu primeiro orçamento
                    </Button>
                  )}
              </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingBudget} onOpenChange={(open) => !open && setEditingBudget(undefined)}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
              <div className="h-2 w-full bg-blue-600" />
              <div className="p-8 pt-6">
                {editingBudget && (
                    <BudgetForm 
                      budget={editingBudget}
                      onSuccess={() => {
                          setEditingBudget(undefined)
                          fetchBudgets()
                      }}
                      onCancel={() => setEditingBudget(undefined)}
                    />
                )}
              </div>
            </DialogContent>
        </Dialog>

        {/* Delete Alert */}
        <AlertDialog open={!!deletingBudget} onOpenChange={(open) => !open && setDeletingBudget(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Orçamento?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Deseja realmente excluir este orçamento? O histórico de transações não será afetado.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <ImportBudgetsDialog 
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onSuccess={fetchBudgets}
          targetMonth={selectedMonth}
          targetYear={selectedYear}
        />
        
    </div>
  )
}

