"use client"

import { useEffect, useState, Fragment } from "react"
import { useSearchParams } from "next/navigation"
import { 
    Plus, Download, ArrowUpCircle, ArrowDownCircle, ArrowRightCircle, ArrowRightLeft,
    CreditCard, AlertCircle, Edit, Trash, MoreHorizontal, Filter,
    ChevronLeft, ChevronRight, Calendar, CheckCircle, Repeat
} from "lucide-react"
import { 
    startOfDay, endOfDay, isAfter, isBefore, parseISO,
    startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
    addWeeks, subWeeks, addMonths, subMonths, addYears, subYears,
    format
} from "date-fns"
import { toast } from "sonner"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import { TransferFormDialog } from "@/components/transactions/transfer-form-dialog"
import { CardExpenseFormDialog } from "@/components/transactions/card-expense-form-dialog"
import { InvoicePaymentDialog } from "@/components/transactions/invoice-payment-dialog"
import { TransactionDeleteDialog } from "@/components/transactions/transaction-delete-dialog"
import { TransactionFilters, FilterState } from "@/components/transactions/transaction-filters"

import { api } from "@/services/apiClient"
import { Transaction, TransactionType, TransactionStatus } from "@/types/transactions"
import { cn } from "@/lib/utils"

type ViewMode = 'WEEK' | 'MONTH' | 'YEAR'

export default function TransactionsPage() {
  const [allData, setAllData] = useState<Transaction[]>([])
  const [data, setData] = useState<Transaction[]>([]) // Displayed data (page)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Period View State
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH')
  const [currentDate, setCurrentDate] = useState(new Date())


  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isCardExpenseOpen, setIsCardExpenseOpen] = useState(false)
  const [isInvoicePaymentOpen, setIsInvoicePaymentOpen] = useState(false)
  const [formType, setFormType] = useState<"INCOME" | "EXPENSE">("INCOME")

  // Edit/Delete state
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)

  const handleOpenForm = (type: "INCOME" | "EXPENSE") => {
      setFormType(type)
      setIsFormOpen(true)
  }

  const handleFormSuccess = () => {
      fetchTransactions()
  }

  const handleEdit = (transaction: Transaction) => {
      setTransactionToEdit(transaction)
      
      if (transaction.type === "INCOME" || transaction.type === "EXPENSE") {
          setFormType(transaction.type)
          setIsFormOpen(true)
      } else if (transaction.type === "TRANSFER" || transaction.type === "TRANSFER_OUT" || transaction.type === "TRANSFER_IN") {
          setIsTransferOpen(true)
      } else if (transaction.type === "CREDIT_CARD_EXPENSE" || transaction.type === "CREDIT_CARD") {
          setIsCardExpenseOpen(true)
      } else {
          toast.info("Edição para este tipo de transação via tabela será implementada em breve.")
      }
  }

  const handleDelete = (transaction: Transaction) => {
      setTransactionToDelete(transaction)
  }

  // Filters state
  const [search, setSearch] = useState("")
  // Initialize filters based on default Period (Month)
  const [filters, setFilters] = useState<FilterState>({
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date()),
      type: "ALL",
      categoryId: "ALL",
      accountId: "ALL"
  })
  
  // Update dates when viewMode or currentDate changes
  useEffect(() => {
      const newFilters = { ...filters }
      const now = currentDate

      if (viewMode === 'WEEK') {
          newFilters.startDate = startOfWeek(now, { locale: ptBR })
          newFilters.endDate = endOfWeek(now, { locale: ptBR })
      } else if (viewMode === 'MONTH') {
          newFilters.startDate = startOfMonth(now)
          newFilters.endDate = endOfMonth(now)
      } else if (viewMode === 'YEAR') {
          newFilters.startDate = startOfYear(now)
          newFilters.endDate = endOfYear(now)
      }

      if (newFilters.startDate?.getTime() !== filters.startDate?.getTime() || 
          newFilters.endDate?.getTime() !== filters.endDate?.getTime()) {
          setFilters(newFilters)
      }
  }, [viewMode, currentDate])

  const navigatePeriod = (direction: 'PREV' | 'NEXT') => {
      if (viewMode === 'WEEK') {
          setCurrentDate(prev => direction === 'PREV' ? subWeeks(prev, 1) : addWeeks(prev, 1))
      } else if (viewMode === 'MONTH') {
          setCurrentDate(prev => direction === 'PREV' ? subMonths(prev, 1) : addMonths(prev, 1))
      } else if (viewMode === 'YEAR') {
          setCurrentDate(prev => direction === 'PREV' ? subYears(prev, 1) : addYears(prev, 1))
      }
  }

  const getPeriodLabel = () => {
      if (viewMode === 'WEEK') {
          const start = startOfWeek(currentDate, { locale: ptBR })
          const end = endOfWeek(currentDate, { locale: ptBR })
          if (start.getMonth() === end.getMonth()) {
              return `${format(start, "dd")} - ${format(end, "dd 'de' MMMM", { locale: ptBR })}`
          }
          return `${format(start, "dd/MM")} - ${format(end, "dd/MM")}`
      } else if (viewMode === 'MONTH') {
          const str = format(currentDate, "MMMM yyyy", { locale: ptBR })
          return str.charAt(0).toUpperCase() + str.slice(1)
      } else {
          return format(currentDate, "yyyy")
      }
  }

  const searchParams = useSearchParams()
  
  // Initialize from URL params if present
  useEffect(() => {
      const categoryParam = searchParams.get("category")
      const monthParam = searchParams.get("month")
      const yearParam = searchParams.get("year")

      if (monthParam && yearParam) {
          const m = parseInt(monthParam)
          const y = parseInt(yearParam)
          if (!isNaN(m) && !isNaN(y)) {
              setViewMode('MONTH')
              setCurrentDate(new Date(y, m - 1, 1))
          }
      }

      if (categoryParam) {
          setFilters(prev => ({
              ...prev,
              categoryId: categoryParam
          }))
      }
  }, [searchParams])


  const handleConfirm = async (transaction: Transaction) => {
      try {
          await api.patch(`/transactions/${transaction.id}/`, { status: "COMPLETED" })
          toast.success("Transação efetivada com sucesso!")
          fetchTransactions()
      } catch (error) {
          console.error("Failed to confirm transaction", error)
          toast.error("Erro ao efetivar transação.")
      }
  }

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      // Backend removed pagination (returning all items).
      const response = await api.get(`/transactions/`)
      
      let transactions: Transaction[] = []
      
      // Handle both array (no pagination) and object (if they kept a wrapper like { results: ... })
      if (Array.isArray(response.data)) {
         transactions = response.data
      } else if (response.data.results) {
        transactions = response.data.results
      }

      setAllData(transactions)
    } catch (error: any) {
      console.error("Failed to fetch transactions", error)
      toast.error("Erro ao carregar transações.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // Apply filters and pagination client-side
  useEffect(() => {
    let filtered = [...allData]

    // Type filter
    if (filters.type !== "ALL") {
        if (filters.type === 'EXPENSE') {
             // Include Credit Card expenses and Invoice Payments in "Despesas" view if desired, 
             // but user specifically asked for Card Expenses.
             filtered = filtered.filter(t => ['EXPENSE', 'CREDIT_CARD', 'CREDIT_CARD_EXPENSE', 'INVOICE_PAYMENT'].includes(t.type))
        } else if (filters.type === 'TRANSFER') {
             filtered = filtered.filter(t => ['TRANSFER', 'TRANSFER_OUT', 'TRANSFER_IN'].includes(t.type))
        } else {
             filtered = filtered.filter(t => t.type === filters.type)
        }
    }

    // Category Filter
    if (filters.categoryId !== "ALL") {
        filtered = filtered.filter(t => {
            // Check both category ID (if flat) or category_detail.id
            return t.category === filters.categoryId || t.category_detail?.id === filters.categoryId
        })
    }

    // Account Filter
    if (filters.accountId !== "ALL") {
        filtered = filtered.filter(t => {
            return t.account === filters.accountId
        })
    }

    // Date Range Filter
    if (filters.startDate) {
        const start = startOfDay(filters.startDate)
        filtered = filtered.filter(t => {
            const date = parseISO(t.date)
            return isAfter(date, start) || date.getTime() === start.getTime()
        })
    }

    if (filters.endDate) {
        const end = endOfDay(filters.endDate)
        filtered = filtered.filter(t => {
             const date = parseISO(t.date)
             return isBefore(date, end) || date.getTime() === end.getTime()
        })
    }

    // Search filter
    if (search) {
        const lowerSearch = search.toLowerCase()
        filtered = filtered.filter(t => 
            t.description.toLowerCase().includes(lowerSearch) ||
            t.amount.toString().includes(search)
        )
    }

    setTotal(filtered.length)

    // Pagination (Client-side)
    const pageSize = 10 // Fixed page size for now
    const start = (page - 1) * pageSize
    const end = start + pageSize
    setData(filtered.slice(start, end))
    
    // Reset to page 1 if search/filter changes
    // But we need to distinguish between page change and filter change.
    // For simplicity, we won't auto-reset page here to avoid infinite loops unless we track deps carefully.
    // Actually, if filter changes, usually we want to go to page 1.
    // We can handle that in the setters of filters.
  }, [allData, page, filters, search])
  
  // Reset page when filters change
  useEffect(() => {
      setPage(1)
  }, [filters, search])

  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value)
  }

  // Helper for type icons/colors
  const getTypeConfig = (type: TransactionType) => {
      switch (type) {
          case "INCOME":
              return { icon: ArrowUpCircle, color: "text-emerald-500", label: "Receita" }
          case "EXPENSE":
              return { icon: ArrowDownCircle, color: "text-red-500", label: "Despesa" }
          case "CREDIT_CARD":
          case "CREDIT_CARD_EXPENSE": // Fallback for frontend-only type if used
              return { icon: CreditCard, color: "text-blue-500", label: "Despesa Cartão" }
          case "TRANSFER":
          case "TRANSFER_OUT":
          case "TRANSFER_IN":
              return { icon: ArrowRightLeft, color: "text-blue-500", label: "Transferência" }
          case "INVOICE_PAYMENT":
              return { icon: AlertCircle, color: "text-purple-500", label: "Pagar Fatura" }
          default:
              return { icon: ArrowRightCircle, color: "text-gray-500", label: "Outro" }
      }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
          <p className="text-muted-foreground mt-1">
            Histórico completo de suas movimentações financeiras.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" /> Exportar
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                     <Button className="cursor-pointer">
                        <Plus className="mr-2 h-4 w-4" /> Nova Transação
                     </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Selecione o tipo</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleOpenForm("INCOME")}>
                       <ArrowUpCircle className="mr-2 h-4 w-4 text-emerald-500" /> Nova Receita
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleOpenForm("EXPENSE")}>
                       <ArrowDownCircle className="mr-2 h-4 w-4 text-red-500" /> Nova Despesa
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsCardExpenseOpen(true)}>
                       <CreditCard className="mr-2 h-4 w-4 text-blue-500" /> Nova Despesa (Cartão)
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsInvoicePaymentOpen(true)}>
                       <ArrowRightCircle className="mr-2 h-4 w-4 text-purple-500" /> Pagar Fatura
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsTransferOpen(true)}>
                        <ArrowRightLeft className="mr-2 h-4 w-4 text-blue-500" /> Transferência
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {/* Period Layout Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 bg-muted/40 p-1 rounded-lg">
             <Button variant="ghost" size="icon" onClick={() => navigatePeriod('PREV')} className="cursor-pointer">
                 <ChevronLeft className="h-4 w-4" />
             </Button>
             <div className="min-w-[140px] text-center font-medium">
                 {getPeriodLabel()}
             </div>
             <Button variant="ghost" size="icon" onClick={() => navigatePeriod('NEXT')} className="cursor-pointer">
                 <ChevronRight className="h-4 w-4" />
             </Button>
          </div>

          <Tabs value={viewMode} onValueChange={(v: string) => { setViewMode(v as ViewMode); setCurrentDate(new Date()) }}>
              <TabsList className="bg-muted/50">
                  <TabsTrigger value="WEEK" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">Semana</TabsTrigger>
                  <TabsTrigger value="MONTH" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">Mês</TabsTrigger>
                  <TabsTrigger value="YEAR" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">Ano</TabsTrigger>
              </TabsList>
          </Tabs>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Input 
                placeholder="Buscar por descrição..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
            />
        </div>
        <div className="flex items-center gap-2">
             <TransactionFilters 
                currentFilters={filters}
                onApplyFilters={setFilters}
             />
        </div>
      </div>

      <TransferFormDialog 
        open={isTransferOpen}
        onOpenChange={(open) => {
            setIsTransferOpen(open)
            if (!open) setTransactionToEdit(null)
        }}
        onSuccess={handleFormSuccess}
        initialData={transactionToEdit}
      />
      <CardExpenseFormDialog 
        open={isCardExpenseOpen}
        onOpenChange={(open) => {
            setIsCardExpenseOpen(open)
            if (!open) setTransactionToEdit(null)
        }}
        onSuccess={handleFormSuccess}
        initialData={transactionToEdit}
      />
      <InvoicePaymentDialog 
        open={isInvoicePaymentOpen}
        onOpenChange={setIsInvoicePaymentOpen}
        onSuccess={handleFormSuccess}
      />

      <TransactionDeleteDialog
        open={!!transactionToDelete}
        onOpenChange={(open) => !open && setTransactionToDelete(null)}
        onSuccess={handleFormSuccess}
        transaction={transactionToDelete}
      />

      <TransactionFormDialog 
        open={isFormOpen}
        onOpenChange={(open) => {
            setIsFormOpen(open)
            if (!open) setTransactionToEdit(null) // Clear edit state on close
        }}
        onSuccess={handleFormSuccess}
        type={formType}
        initialData={transactionToEdit}
      />

      <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                            <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                        </TableRow>
                    ))
                ) : data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Nenhuma transação encontrada.
                        </TableCell>
                    </TableRow>
                ) : (
                    (() => {
                        // Group transactions by date
                        const grouped = data.reduce((groups, transaction) => {
                            const date = transaction.date
                            if (!groups[date]) {
                                groups[date] = { transactions: [], total: 0 }
                            }
                            groups[date].transactions.push(transaction)
                            
                            // Calculate daily total
                            const amount = Number(transaction.amount)
                            if (transaction.type === 'INCOME' || transaction.type === 'TRANSFER_IN') {
                                groups[date].total += amount
                            } else {
                                groups[date].total -= amount
                            }
                            return groups
                        }, {} as Record<string, { transactions: Transaction[], total: number }>)

                        // Sort dates descending
                        const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

                        return sortedDates.map((date) => (
                            <Fragment key={date}>
                                {/* Group Header */}
                                <TableRow className="bg-muted/20 hover:bg-muted/20 border-b">
                                    <TableCell colSpan={7} className="py-2.5">
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-foreground">
                                                    {(() => {
                                                        const [year, month, day] = date.split('-').map(Number);
                                                        const localDate = new Date(year, month - 1, day);
                                                        return format(localDate, "dd 'de' MMMM", { locale: ptBR });
                                                    })()}
                                                </span>
                                                <span className="text-xs text-muted-foreground capitalize">
                                                    {(() => {
                                                        const [year, month, day] = date.split('-').map(Number);
                                                        const localDate = new Date(year, month - 1, day);
                                                        return format(localDate, "EEEE", { locale: ptBR });
                                                    })()}
                                                </span>
                                            </div>
                                            <div className={cn(
                                                "text-xs font-bold whitespace-nowrap", 
                                                grouped[date].total >= 0 ? "text-emerald-500" : "text-red-500"
                                            )}>
                                                {grouped[date].total >= 0 ? "+" : ""} {formatCurrency(grouped[date].total)}
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>

                                {/* Transactions for this date */}
                                {grouped[date].transactions.map((transaction) => {
                                    const { icon: Icon, color, label } = getTypeConfig(transaction.type)
                                    const isNegative = 
                                        transaction.type === 'EXPENSE' || 
                                        transaction.type === 'CREDIT_CARD' || 
                                        transaction.type === 'CREDIT_CARD_EXPENSE' ||
                                        transaction.type === 'TRANSFER_OUT' ||
                                        transaction.type === 'INVOICE_PAYMENT' ||
                                        (transaction.type === 'TRANSFER' && true)

                                    const isPending = transaction.status === 'PENDING'

                                    return (
                                        <TableRow 
                                            key={transaction.id} 
                                            className={cn(
                                                "group cursor-default hover:bg-muted/50 dark:hover:bg-zinc-900/50",
                                                isPending && "opacity-60 bg-muted/20"
                                            )}
                                        >
                                            <TableCell className="font-medium text-muted-foreground text-xs pl-8">
                                                <div className="text-[10px] opacity-70">
                                                     {/* Show only time since date is in header */}
                                                     {transaction.created_at ? format(new Date(transaction.created_at), "HH:mm") : "-"}
                                                </div>
                                                {isPending && (
                                                    <Badge variant="secondary" className="mt-1 h-4 text-[9px] px-1 py-0">
                                                        Pendente
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("p-2 rounded-full bg-muted/50", color.replace('text-', 'bg-').replace('500', '100'), "dark:bg-opacity-10")}>
                                                        <Icon className={cn("h-4 w-4", color)} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium flex items-center gap-1">
                                                            {transaction.description}
                                                            {(transaction.is_recurring || transaction.recurring_source) && (
                                                                <Repeat className="h-3 w-3 text-muted-foreground" />
                                                            )}
                                                        </span>
                                                        {transaction.tags_detail && transaction.tags_detail.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {transaction.tags_detail.map(tag => (
                                                                    <div 
                                                                        key={tag.id}
                                                                        className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-sm"
                                                                        style={{ backgroundColor: tag.color }}
                                                                    >
                                                                        {tag.name}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <Badge variant="outline" className="font-normal text-muted-foreground">
                                                    {label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {transaction.category_detail ? (
                                                    <Badge variant="outline" className="font-normal" style={{ 
                                                        borderColor: transaction.category_detail.color,
                                                        color: transaction.category_detail.color 
                                                    }}>
                                                        {transaction.category_detail.name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">{transaction.description === 'Transferência' ? '-' : 'Sem categoria'}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <div className="text-sm">
                                                    <span className="text-xs font-mono text-muted-foreground">
                                                        {transaction.account_detail?.name || (transaction.credit_card ? 'Cartão' : 'Conta')}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn("text-right font-bold whitespace-nowrap", isNegative ? "text-red-500" : "text-emerald-500")}>
                                                {isNegative ? "- " : "+ "}
                                                {formatCurrency(Number(transaction.amount))}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                                            <span className="sr-only">Opções</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {isPending && transaction.recurring_source && (
                                                            <DropdownMenuItem className="cursor-pointer text-emerald-600 focus:text-emerald-600" onClick={() => handleConfirm(transaction)}>
                                                                <CheckCircle className="mr-2 h-4 w-4" /> Efetivar
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit(transaction)}>
                                                            <Edit className="mr-2 h-4 w-4" /> Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={() => handleDelete(transaction)}>
                                                            <Trash className="mr-2 h-4 w-4" /> Excluir
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </Fragment>
                        ))
                    })()
                )}
            </TableBody>
          </Table>
      </Card>
      
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1 || isLoading}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
             Página {page} de {Math.max(1, Math.ceil(total / 10))}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.min(Math.ceil(total / 10), p + 1))}
          disabled={page >= Math.ceil(total / 10) || isLoading}
        >
          Próximo
        </Button>
      </div>
    </div>
  )
}
