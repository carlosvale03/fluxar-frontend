"use client"

import { useEffect, useRef, useState, Fragment } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { 
    Plus, Download, ArrowUpCircle, ArrowDownCircle, ArrowRightCircle, ArrowRightLeft,
    CreditCard, AlertCircle, Edit, Trash, MoreHorizontal, Filter,
    ChevronLeft, ChevronRight, Calendar, CheckCircle, Repeat, Wallet, Search, X
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
import { LucideIcon } from "@/components/ui/icon-picker"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import { TransferFormDialog } from "@/components/transactions/transfer-form-dialog"
import { CardExpenseFormDialog } from "@/components/transactions/card-expense-form-dialog"
import { InvoicePaymentDialog } from "@/components/transactions/invoice-payment-dialog"
import { TransactionDeleteDialog } from "@/components/transactions/transaction-delete-dialog"
import { TransactionFilters, FilterState } from "@/components/transactions/transaction-filters"
import { SeloDeSugerida } from "@/components/transactions/selo-de-sugerida"
import { useAvisoDoSalario } from "@/components/salario/AvisoDoSalario"
import { MarcaDoVinculo } from "@/components/transactions/marca-do-vinculo"
import { AcoesDoVinculo, TipoDoGastoRelacionado, VincularTransacaoDialog } from "@/components/transactions/vincular-transacao"
import { usePlan } from "@/hooks/use-plan"
import { urlDaPrincipal } from "@/services/vinculos"
import Link from "next/link"

import { api } from "@/services/apiClient"
import { PrincipalDoVinculo, Transaction, TransactionType, TransactionStatus } from "@/types/transactions"
import { Account } from "@/types/accounts"
import { Category } from "@/types/categories"
import { cn } from "@/lib/utils"
import { lerData } from "@/lib/datas"
import { tratarErro } from "@/lib/erros"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"

type ViewMode = 'WEEK' | 'MONTH' | 'YEAR'

export default function TransactionsPage() {
  const [data, setData] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  // CONTRATO-09: total de cada dia, sobre o filtro inteiro, calculado pela API
  const [totaisDoDia, setTotaisDoDia] = useState<Record<string, string>>({})
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])

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

  // SALARIO-19: lançar ou efetivar um salário recebido abre o aviso da divisão
  const { conferirSalario, avisoDoSalario } = useAvisoDoSalario()

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

  // VINCULO-01 e VINCULO-02: o gasto relacionado nasce com a principal; a
  // transação existente é ligada pela busca
  const [principalDoNovo, setPrincipalDoNovo] = useState<PrincipalDoVinculo | null>(null)
  const [transacaoAVincular, setTransacaoAVincular] = useState<Transaction | null>(null)

  const lancarRelacionado = (principal: Transaction, tipo: TipoDoGastoRelacionado) => {
      setTransactionToEdit(null)
      setPrincipalDoNovo({ id: principal.id, description: principal.description, date: principal.purchase_date || principal.date })
      if (tipo === "EXPENSE") {
          setFormType("EXPENSE")
          setIsFormOpen(true)
      } else {
          setIsCardExpenseOpen(true)
      }
  }

  const handleDelete = (transaction: Transaction) => {
      setTransactionToDelete(transaction)
  }

  const fetchCategories = async () => {
      try {
          const response = await api.get("/categories/")
          // O backend pode retornar { results: [...] } ou direto o array
          const catData = response.data
          setCategories(catData)
      } catch (error) {
          // CONTRATO-33: nenhuma falha silenciosa
          tratarErro(error, { mensagemPadrao: "Erro ao carregar categorias.", tentarDeNovo: fetchCategories })
      }
  }

  useEffect(() => {
      fetchCategories()
  }, [])

  const searchParams = useSearchParams()
  const searchParam = searchParams.get("search")
  const categoryParam = searchParams.get("category")
  const monthParam = searchParams.get("month")
  const yearParam = searchParams.get("year")
  const startDateParam = searchParams.get("startDate")
  const endDateParam = searchParams.get("endDate")
  const router = useRouter()

  // IMPORT-45: o atalho do resultado da importação abre a lista com o lote e
  // só as sugeridas. Com o lote, o período não vale: o extrato pode ser de
  // outros meses.
  const loteParam = searchParams.get("import_batch")
  const sugeridasParam = searchParams.get("suggested_category") === "true"
  const [lote, setLote] = useState<string | null>(loteParam)
  const [soSugeridas, setSoSugeridas] = useState(sugeridasParam)

  useEffect(() => {
      setLote(loteParam)
      setSoSugeridas(sugeridasParam)
      setPage(1)
  }, [loteParam, sugeridasParam])

  // VINCULO-31: o custo total de uma principal abre a lista com a principal
  // e as dependentes. As dependentes podem ter outra data: com a principal,
  // o período não vale.
  const principalParam = searchParams.get("principalId")
  const [principalId, setPrincipalId] = useState<string | null>(principalParam)

  useEffect(() => {
      setPrincipalId(principalParam)
      setPage(1)
  }, [principalParam])

  // VINCULO-20: com o recurso travado, o filtro da principal não abre
  const vinculosLiberados = usePlan().podeUsar("vinculos") === true
  const abrirPrincipal = (id: string) => router.push(urlDaPrincipal(id))

  const limparFiltroDaPrincipal = () => {
      setPrincipalId(null)
      setPage(1)
      router.replace("/transacoes")
  }

  const limparFiltroDoLote = () => {
      setLote(null)
      setSoSugeridas(false)
      setPage(1)
      router.replace("/transacoes")
  }

  // Determine initial date from URL or default to current month
  const getInitialDate = () => {
      if (monthParam && yearParam) {
          const m = parseInt(monthParam)
          const y = parseInt(yearParam)
          if (!isNaN(m) && !isNaN(y)) {
              return new Date(y, m - 1, 1)
          }
      }
      return new Date()
  }

  const initialDate = getInitialDate()

  // Filters state
  const [search, setSearch] = useState(searchParam || "")
  // CONTRATO-08: o texto que vai para a API, 300 ms depois da última tecla
  const [buscaComEspera, setBuscaComEspera] = useState(searchParam || "")
  // Initialize filters based on default Period (Month) or URL params
  const [filters, setFilters] = useState<FilterState>({
      startDate: startDateParam ? parseISO(startDateParam) : startOfMonth(initialDate),
      endDate: endDateParam ? parseISO(endDateParam) : endOfMonth(initialDate),
      type: "ALL",
      categoryIds: categoryParam ? [categoryParam] : [],
      accountId: "ALL",
      // CLASSE-33: o clique no gráfico por classe abre a lista com classId
      classIds: searchParams.getAll("classId")
  })

  // Period View State
  const [viewMode, setViewMode] = useState<ViewMode>(monthParam && yearParam ? 'MONTH' : 'MONTH')
  const [currentDate, setCurrentDate] = useState(initialDate)
  
  // Update dates when viewMode or currentDate changes
  useEffect(() => {
      // If we have custom start/end dates from URL, don't overwrite them on first load
      if (startDateParam && endDateParam && filters.startDate?.getTime() === parseISO(startDateParam).getTime()) {
          return
      }

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
          // CONTRATO-06: filtro novo volta para a página 1 na mesma renderização
          setFilters(newFilters)
          setPage(1)
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



  // Handle URL parameter changes after initial mount
  useEffect(() => {
      const category = searchParams.get("category")
      const searchVal = searchParams.get("search")
      
      if (category && categories.length > 0) {
          setFilters(prev => ({
              ...prev,
              categoryIds: [category]
          }))
          setPage(1)
          if (!searchVal) {
              setSearch("")
          }
      } else if (searchVal && categories.length > 0) {
          // Fallback: Se não temos ID mas temos busca, tentamos ver se a busca é o nome de uma categoria
          let categoryByName: Category | undefined = undefined
          
          // Procurar em categorias principais e subcategorias
          for (const cat of categories) {
              if (cat.name.toLowerCase() === searchVal.toLowerCase()) {
                  categoryByName = cat
                  break
              }
              if (cat.subcategories) {
                  const sub = cat.subcategories.find(s => s.name.toLowerCase() === searchVal.toLowerCase())
                  if (sub) {
                      categoryByName = sub
                      break
                  }
              }
          }

          if (categoryByName) {
              setFilters(prev => ({
                  ...prev,
                  categoryIds: [String(categoryByName.id)]
              }))
              setPage(1)
              setSearch("")
          } else {
              setSearch(searchVal)
          }
      } else if (searchVal) {
          setSearch(searchVal)
      }
  }, [searchParams, categories]) // Adicionado categories como dependência para o fallback funcionar

  const handleConfirm = async (transaction: Transaction) => {
      try {
          const resposta = await api.patch<Transaction>(`/transactions/${transaction.id}/`, { status: "COMPLETED" })
          toast.success("Transação efetivada com sucesso!")
          fetchTransactions()
          void conferirSalario(resposta.data)
      } catch (error) {
          // CONTRATO-33: nenhuma falha silenciosa
          tratarErro(error, { mensagemPadrao: "Erro ao efetivar transação." })
      }
  }

  // CONTRATO-07: cada busca cancela a anterior, e a resposta dela é descartada
  const buscaAtual = useRef<AbortController | null>(null)

  const fetchTransactions = async () => {
    buscaAtual.current?.abort()
    const controlador = new AbortController()
    buscaAtual.current = controlador
    try {
      setIsLoading(true)
      
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('page_size', pageSize.toString())
      
      if (lote) {
          params.append('import_batch', lote)
      } else if (principalId) {
          params.append('principalId', principalId)
      } else {
          if (filters.startDate) params.append('startDate', format(filters.startDate, 'yyyy-MM-dd'))
          if (filters.endDate) params.append('endDate', format(filters.endDate, 'yyyy-MM-dd'))
      }
      if (soSugeridas) params.append('suggested_category', 'true')
if (filters.type && filters.type !== 'ALL') params.append('type', filters.type)
      // CONTRATO-10 a CONTRATO-12: as categorias escolhidas vão repetidas
      // (categoryId=a&categoryId=b); o backend inclui as subcategorias
      filters.categoryIds.forEach(id => params.append('categoryId', id))
      // CLASSE-34 e CLASSE-35: as classes vão repetidas, com sem_classe
      for (const id of filters.classIds ?? []) params.append('classId', id)
      if (filters.accountId && filters.accountId !== 'ALL') params.append('accountId', filters.accountId)
      // VINCULO-30: só as principais e as dependentes
      if (filters.linked) params.append('linked', 'true')
      
      if (filters.tagIds && filters.tagIds.length > 0) {
        filters.tagIds.forEach(tagId => {
          params.append('tagIds', tagId)
        })
      }

      if (buscaComEspera) params.append('search', buscaComEspera)

      const response = await api.get(`/transactions/?${params.toString()}`, { signal: controlador.signal })
      if (controlador.signal.aborted) return

      // CONTRATO-02: as transações vêm paginadas
      setData(response.data.results)
      setTotal(response.data.count)
      setTotalPages(response.data.total_pages)
      setTotaisDoDia(response.data.day_totals ?? {})
    } catch (error) {
      if (controlador.signal.aborted) return
      tratarErro(error, { mensagemPadrao: "Erro ao carregar transações.", tentarDeNovo: fetchTransactions })
    } finally {
      if (buscaAtual.current === controlador) setIsLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
        const response = await api.get("/accounts/")
        setAccounts(response.data)
    } catch (error) {
        tratarErro(error, { mensagemPadrao: "Erro ao carregar contas.", tentarDeNovo: fetchAccounts })
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  // CONTRATO-06 e CONTRATO-08: a busca vai 300 ms depois da última tecla,
  // já na página 1
  useEffect(() => {
    if (search === buscaComEspera) return
    const espera = setTimeout(() => {
      setBuscaComEspera(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(espera)
  }, [search])

  // CONTRATO-05 a CONTRATO-07: um efeito só busca as transações
  useEffect(() => {
    fetchTransactions()
  }, [page, pageSize, filters, buscaComEspera, lote, soSugeridas, principalId])

  useEffect(() => () => buscaAtual.current?.abort(), [])


  // Helper for type icons/colors
  const getTypeConfig = (type: TransactionType) => {
      switch (type) {
          case "INCOME":
              return { icon: ArrowUpCircle, color: "text-emerald-500", hex: "#10b981", label: "Receita" }
          case "EXPENSE":
              return { icon: ArrowDownCircle, color: "text-red-500", hex: "#ef4444", label: "Despesa" }
          case "CREDIT_CARD":
          case "CREDIT_CARD_EXPENSE":
              return { icon: CreditCard, color: "text-blue-500", hex: "#3b82f6", label: "Despesa Cartão" }
          case "TRANSFER":
          case "TRANSFER_OUT":
          case "TRANSFER_IN":
              return { icon: ArrowRightLeft, color: "text-blue-500", hex: "#3b82f6", label: "Transferência" }
          case "INVOICE_PAYMENT":
              return { icon: AlertCircle, color: "text-purple-500", hex: "#a855f7", label: "Pagar Fatura" }
          default:
              return { icon: ArrowRightCircle, color: "text-gray-500", hex: "#6b7280", label: "Outro" }
      }
  }

  return (
    <div className="container mx-auto py-6 sm:py-10 px-4 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground/90">Transações</h1>
          <p className="text-sm font-medium text-muted-foreground/60 mt-1 max-w-md">
            Histórico completo e detalhado de suas movimentações financeiras.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            <Button variant="outline" size="sm" className="flex-1 md:flex-none h-11 rounded-full border-border/60 font-bold px-6 hover:bg-muted/50 transition-all cursor-pointer" asChild>
                <Link href="/importar?tab=export">
                    <Download className="mr-2 h-4 w-4 opacity-70" /> Exportar
                </Link>
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                     <Button className="flex-1 md:flex-none h-11 rounded-full px-6 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all cursor-pointer">
                        <Plus className="mr-2 h-4 w-4" /> Nova Transação
                     </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[220px] shadow-2xl border-border/40">
                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 px-3 py-2">Selecione o tipo</DropdownMenuLabel>
                    <DropdownMenuSeparator className="mx-2 opacity-50" />
                    <DropdownMenuItem className="rounded-xl px-3 py-2.5 cursor-pointer font-bold transition-all focus:bg-emerald-500/10 focus:text-emerald-600" onClick={() => handleOpenForm("INCOME")}>
                       <ArrowUpCircle className="mr-2 h-4 w-4 text-emerald-500" /> Nova Receita
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl px-3 py-2.5 cursor-pointer font-bold transition-all focus:bg-red-500/10 focus:text-red-600" onClick={() => handleOpenForm("EXPENSE")}>
                       <ArrowDownCircle className="mr-2 h-4 w-4 text-red-500" /> Nova Despesa
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl px-3 py-2.5 cursor-pointer font-bold transition-all focus:bg-blue-500/10 focus:text-blue-600" onClick={() => setIsCardExpenseOpen(true)}>
                       <CreditCard className="mr-2 h-4 w-4 text-blue-500" /> Despesa no Cartão
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl px-3 py-2.5 cursor-pointer font-bold transition-all focus:bg-purple-500/10 focus:text-purple-600" onClick={() => setIsInvoicePaymentOpen(true)}>
                       <ArrowRightCircle className="mr-2 h-4 w-4 text-purple-500" /> Pagar Fatura
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl px-3 py-2.5 cursor-pointer font-bold transition-all focus:bg-blue-500/10 focus:text-blue-600" onClick={() => setIsTransferOpen(true)}>
                        <ArrowRightLeft className="mr-2 h-4 w-4 text-blue-500" /> Transferência
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {/* Period Layout Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 mb-8 p-1.5 bg-card/60 border border-border/40 rounded-[28px] md:rounded-full shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between md:justify-start gap-1 bg-background/50 p-1 rounded-full border border-border/40 w-full md:w-auto max-w-[280px] md:max-w-none mx-auto md:mx-0">
             <Button variant="ghost" size="icon" onClick={() => navigatePeriod('PREV')} className="h-9 w-9 rounded-full transition-all hover:bg-primary/10 hover:text-primary cursor-pointer shrink-0">
                 <ChevronLeft className="h-4 w-4" />
             </Button>
             <div className="flex-1 text-center font-black uppercase tracking-widest text-[11px] text-foreground/70 px-4">
                 {getPeriodLabel()}
             </div>
             <Button variant="ghost" size="icon" onClick={() => navigatePeriod('NEXT')} className="h-9 w-9 rounded-full transition-all hover:bg-primary/10 hover:text-primary cursor-pointer shrink-0">
                 <ChevronRight className="h-4 w-4" />
             </Button>
          </div>

          <Tabs value={viewMode} onValueChange={(v: string) => { setViewMode(v as ViewMode); setCurrentDate(new Date()) }} className="w-full md:w-auto">
              <TabsList className="bg-muted/40 p-1 h-11 rounded-full w-full">
                  <TabsTrigger value="WEEK" className="flex-1 md:flex-none h-9 rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-bold text-[11px] uppercase tracking-wider cursor-pointer">Semana</TabsTrigger>
                  <TabsTrigger value="MONTH" className="flex-1 md:flex-none h-9 rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-bold text-[11px] uppercase tracking-wider cursor-pointer">Mês</TabsTrigger>
                  <TabsTrigger value="YEAR" className="flex-1 md:flex-none h-9 rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-bold text-[11px] uppercase tracking-wider cursor-pointer">Ano</TabsTrigger>
              </TabsList>
          </Tabs>
      </div>

      <div className="flex items-center gap-3 mb-8 w-full md:max-w-none">
        <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
            <Input 
                placeholder="Busca..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        setBuscaComEspera(search)
                        setPage(1)
                    }
                }}
                className="h-12 pl-11 rounded-2xl border-border/60 bg-card shadow-sm focus:ring-primary/20 transition-all font-bold text-xs"
            />
        </div>
        <div className="shrink-0">
             <TransactionFilters 
                currentFilters={filters}
                onApplyFilters={(novos) => {
                    setFilters(novos)
                    setPage(1)
                }}
             />
        </div>
      </div>

      {/* IMPORT-45: o filtro do atalho da importação, com a opção de limpar */}
      {(lote || soSugeridas) && (
        <div role="status" className="flex items-center justify-between gap-3 mb-6 px-5 py-3 rounded-2xl bg-primary/5 border border-primary/15">
            <span className="text-xs font-bold text-primary">
                {soSugeridas
                    ? (lote ? "Categorias sugeridas nesta importação" : "Categorias sugeridas pelo seu histórico")
                    : "Transações desta importação"}
            </span>
            <Button variant="ghost" size="sm" onClick={limparFiltroDoLote} className="h-8 rounded-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 cursor-pointer">
                <X className="h-3.5 w-3.5 mr-1" /> Limpar filtro
            </Button>
        </div>
      )}

      {/* VINCULO-31: a lista da principal, com a opção de limpar */}
      {principalId && !lote && (
        <div role="status" className="flex items-center justify-between gap-3 mb-6 px-5 py-3 rounded-2xl bg-primary/5 border border-primary/15">
            <span className="text-xs font-bold text-primary">
                Gasto principal e os gastos relacionados
            </span>
            <Button variant="ghost" size="sm" onClick={limparFiltroDaPrincipal} className="h-8 rounded-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 cursor-pointer">
                <X className="h-3.5 w-3.5 mr-1" /> Limpar filtro
            </Button>
        </div>
      )}

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
            if (!open) {
                setTransactionToEdit(null)
                setPrincipalDoNovo(null)
            }
        }}
        onSuccess={handleFormSuccess}
        initialData={transactionToEdit}
        principal={principalDoNovo}
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
            if (!open) {
                setTransactionToEdit(null) // Clear edit state on close
                setPrincipalDoNovo(null)
            }
        }}
        onSuccess={(criada) => {
            handleFormSuccess()
            void conferirSalario(criada)
        }}
        type={formType}
        initialData={transactionToEdit}
        principal={principalDoNovo}
      />
      {avisoDoSalario}

      <VincularTransacaoDialog
        transacao={transacaoAVincular}
        onOpenChange={(open) => !open && setTransacaoAVincular(null)}
        onVinculada={handleFormSuccess}
      />

      {/* Mobile-Friendly Transaction List */}
      <div className="md:hidden space-y-6">
        {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-card/40 p-5 rounded-[24px] border border-border/20 space-y-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-2xl" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-5 w-24" />
                    </div>
                </div>
            ))
        ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <AlertCircle className="h-12 w-12 mb-4" />
                <p className="font-black uppercase tracking-widest text-[11px]">Nenhuma transação encontrada</p>
            </div>
        ) : (() => {
            const grouped = data.reduce((groups, transaction) => {
                const date = transaction.date
                if (!groups[date]) {
                    // CONTRATO-09: o total do dia vem de day_totals, não da soma da página
                    groups[date] = { transactions: [], total: paraCentavos(totaisDoDia[date]) / 100 }
                }
                groups[date].transactions.push(transaction)
                return groups
            }, {} as Record<string, { transactions: Transaction[], total: number }>)

            const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

            return sortedDates.map((date) => (
                <div key={date} className="space-y-4">
                    {/* Compact Date Header */}
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-foreground/80">
                                {(() => {
                                    const [year, month, day] = date.split('-').map(Number);
                                    const localDate = new Date(year, month - 1, day);
                                    return format(localDate, "dd 'de' MMMM", { locale: ptBR });
                                })()}
                            </span>
                        </div>
                        <div className={cn(
                            "text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full",
                            grouped[date].total >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                        )}>
                            {formatarMoeda(grouped[date].total)}
                        </div>
                    </div>

                    {/* Transaction Cards */}
                    <div className="space-y-3">
                        {grouped[date].transactions.map((transaction) => {
                            const { icon: TypeIcon, hex: typeHex, label } = getTypeConfig(transaction.type)
                            const isNegative = 
                                transaction.type === 'EXPENSE' || 
                                transaction.type === 'CREDIT_CARD' || 
                                transaction.type === 'CREDIT_CARD_EXPENSE' ||
                                transaction.type === 'TRANSFER_OUT' ||
                                transaction.type === 'INVOICE_PAYMENT'
                            const isPending = transaction.status === 'PENDING'

                            // Determine main icon and color
                            const hasCategory = !!transaction.category_detail
                            const mainColor = hasCategory ? transaction.category_detail?.color : typeHex

                            return (
                                <div 
                                    key={transaction.id}
                                    onClick={() => handleEdit(transaction)}
                                    className={cn(
                                        "p-4 bg-card hover:bg-muted/10 active:scale-[0.98] transition-all border border-border/40 rounded-[28px] shadow-sm flex items-center gap-4",
                                        isPending && "opacity-60 bg-muted/5 grayscale-[50%]"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-500",
                                        "ring-1 ring-black/5 dark:ring-white/10"
                                    )}
                                    style={{ 
                                        backgroundColor: `${mainColor}15`,
                                        color: mainColor
                                    }}
                                    >
                                        {hasCategory ? (
                                            <LucideIcon name={transaction.category_detail?.icon || "Tag"} className="h-6 w-6" />
                                        ) : (
                                            <TypeIcon className="h-6 w-6" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className="font-extrabold text-sm text-foreground/90 leading-tight truncate">
                                                {transaction.description}
                                            </h4>
                                            {isPending && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-3">
                                            {/* Account Origin */}
                                            {(() => {
                                                const accountId = transaction.account || transaction.account_detail?.id
                                                const account = accounts.find(a => a.id === accountId)
                                                const aColor = account?.color || transaction.account_detail?.color || '#888888'
                                                const aName = account?.name || transaction.account_detail?.name || 'Conta'

                                                return (
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: aColor }} />
                                                        <span className="truncate max-w-[80px]">{aName}</span>
                                                    </div>
                                                )
                                            })()}

                                            {/* FATURA-16: a linha fica no vencimento; a data da compra aparece aqui */}
                                            {transaction.type === 'CREDIT_CARD' && transaction.purchase_date && (
                                                <span className="text-[10px] font-bold text-muted-foreground/60">
                                                    Compra em {format(lerData(transaction.purchase_date), "dd/MM")}
                                                </span>
                                            )}

                                            {/* Tags */}
                                            {transaction.tags_detail && transaction.tags_detail.length > 0 && (
                                                <div className="flex gap-1">
                                                    {transaction.tags_detail.slice(0, 1).map(tag => (
                                                        <span key={tag.id} className="text-[9px] font-black uppercase tracking-tight text-primary/60">
                                                            #{tag.name}
                                                        </span>
                                                    ))}
                                                    {transaction.tags_detail.length > 1 && (
                                                        <span className="text-[9px] font-black opacity-30">+{transaction.tags_detail.length - 1}</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* IMPORT-46 */}
                                            {transaction.category_suggested && <SeloDeSugerida />}
                                        </div>

                                        {/* VINCULO-24 e VINCULO-25 */}
                                        <MarcaDoVinculo
                                            transacao={transaction}
                                            onAbrirPrincipal={vinculosLiberados ? abrirPrincipal : undefined}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div className={cn(
                                        "text-sm font-black tabular-nums tracking-tighter shrink-0",
                                        isNegative ? "text-red-500" : "text-emerald-500"
                                    )}>
                                        {isNegative ? "- " : "+ "}
                                        {formatarMoeda(transaction.amount)}
                                    </div>

                                    {/* VINCULO-01 a VINCULO-04 */}
                                    <AcoesDoVinculo
                                        transacao={transaction}
                                        liberado={vinculosLiberados}
                                        onLancarRelacionado={lancarRelacionado}
                                        onVincular={setTransacaoAVincular}
                                        onAlterado={handleFormSuccess}
                                        className="-mr-1 shrink-0"
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))
        })()}
      </div>

      <Card className="hidden md:block border border-border/60 bg-card shadow-xl shadow-black/5 rounded-[32px] overflow-hidden transition-all duration-500">
          <Table>
            <TableHeader className="bg-muted/60 dark:bg-zinc-800/50 backdrop-blur-sm">
              <TableRow className="hover:bg-transparent border-b border-border/60">
                <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80 pl-8">Data/Hora</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">Transação</TableHead>
                <TableHead className="hidden md:table-cell text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80 text-center">Tipo</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80 text-center">Categoria</TableHead>
                <TableHead className="hidden md:table-cell text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">Origem</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80 pr-8">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell className="pl-8"><Skeleton className="h-4 w-12" /></TableCell>
                            <TableCell>
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-11 w-11 rounded-xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-24 rounded-full mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24 rounded-full mx-auto" /></TableCell>
                            <TableCell className="hidden md:table-cell"><Skeleton className="h-8 w-32 rounded-xl" /></TableCell>
                            <TableCell className="pr-8 text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 opacity-40">
                                <AlertCircle className="h-10 w-10" />
                                <p className="font-black uppercase tracking-widest text-[10px]">Nenhuma transação encontrada</p>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    (() => {
                        // Group transactions by date
                        const grouped = data.reduce((groups, transaction) => {
                            const date = transaction.date
                            if (!groups[date]) {
                                // CONTRATO-09: o total do dia vem de day_totals, não da soma da página
                                groups[date] = { transactions: [], total: paraCentavos(totaisDoDia[date]) / 100 }
                            }
                            groups[date].transactions.push(transaction)
                            return groups
                        }, {} as Record<string, { transactions: Transaction[], total: number }>)

                        // Sort dates descending
                        const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

                        return sortedDates.map((date) => (
                            <Fragment key={date}>
                                {/* Group Header */}
                                <TableRow className="bg-transparent hover:bg-transparent border-t border-b-2 border-border/80">
                                    <TableCell colSpan={6} className="py-2">
                                        <div className="flex items-center justify-between px-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary ring-4 ring-primary/5" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                                                        {(() => {
                                                            const [year, month, day] = date.split('-').map(Number);
                                                            const localDate = new Date(year, month - 1, day);
                                                            return format(localDate, "dd 'de' MMMM", { locale: ptBR });
                                                        })()}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                                                        {(() => {
                                                            const [year, month, day] = date.split('-').map(Number);
                                                            const localDate = new Date(year, month - 1, day);
                                                            return format(localDate, "EEEE", { locale: ptBR });
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full", 
                                                grouped[date].total >= 0 
                                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                                                    : "bg-red-500/10 text-red-600 border border-red-500/20"
                                            )}>
                                                {grouped[date].total >= 0 ? "Saldo do Dia: +" : "Saldo do Dia: "} {formatarMoeda(grouped[date].total)}
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>

                                {/* Transactions for this date */}
                                {grouped[date].transactions.map((transaction) => {
                                    const { icon: TypeIcon, hex: typeHex, label } = getTypeConfig(transaction.type)
                                    const isNegative = 
                                        transaction.type === 'EXPENSE' || 
                                        transaction.type === 'CREDIT_CARD' || 
                                        transaction.type === 'CREDIT_CARD_EXPENSE' ||
                                        transaction.type === 'TRANSFER_OUT' ||
                                        transaction.type === 'INVOICE_PAYMENT'

                                    const isPending = transaction.status === 'PENDING'

                                    // Determine primary icon and color for desktop as well
                                    const hasCategory = !!transaction.category_detail
                                    const mainColor = hasCategory ? transaction.category_detail?.color : typeHex

                                    return (
                                        <TableRow 
                                            key={transaction.id} 
                                            className={cn(
                                                "group relative h-20 border-b border-border/40 transition-all duration-300",
                                                "hover:bg-muted/40 dark:hover:bg-zinc-900/40",
                                                isPending && "opacity-60 bg-muted/20 italic"
                                            )}
                                        >
                                            <TableCell className="pl-8">
                                                <div className="flex flex-col gap-1">
                                                     <span className="text-[10px] font-black tracking-tighter text-muted-foreground/60">
                                                        {transaction.created_at ? format(new Date(transaction.created_at), "HH:mm") : "-"}
                                                     </span>
                                                     {isPending && (
                                                        <div className="flex">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                                                                Pendente
                                                            </span>
                                                        </div>
                                                     )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-500",
                                                        "shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                                    )}
                                                    style={{ 
                                                        backgroundColor: `${mainColor}15`,
                                                        color: mainColor
                                                    }}
                                                    >
                                                        {hasCategory ? (
                                                            <LucideIcon name={transaction.category_detail?.icon || "Tag"} className="h-5 w-5" />
                                                        ) : (
                                                            <TypeIcon className="h-5 w-5" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-extrabold text-sm text-foreground/90 leading-tight">
                                                                {transaction.description}
                                                            </span>
                                                            {(transaction.is_recurring || transaction.recurring_source) && (
                                                                <Repeat className="h-3 w-3 text-primary/40 animate-pulse" />
                                                            )}
                                                        </div>
                                                        {/* FATURA-16: a linha fica no vencimento; a data da compra aparece aqui */}
                                                        {transaction.type === 'CREDIT_CARD' && transaction.purchase_date && (
                                                            <span className="text-[10px] font-bold text-muted-foreground/60">
                                                                Compra em {format(lerData(transaction.purchase_date), "dd/MM")}
                                                            </span>
                                                        )}
                                                        {transaction.tags_detail && transaction.tags_detail.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {transaction.tags_detail.map(tag => (
                                                                    <div 
                                                                        key={tag.id}
                                                                        className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-white shadow-sm"
                                                                        style={{ backgroundColor: tag.color }}
                                                                    >
                                                                        {tag.name}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {/* VINCULO-24 e VINCULO-25 */}
                                                        <MarcaDoVinculo
                                                            transacao={transaction}
                                                            onAbrirPrincipal={vinculosLiberados ? abrirPrincipal : undefined}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-center">
                                                <div className={cn(
                                                    "inline-flex items-center px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest",
                                                    transaction.type === 'INCOME' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : 
                                                    transaction.type === 'EXPENSE' ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                                    "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                                )}>
                                                    {label}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {transaction.category_detail ? (
                                                    <div 
                                                        className="inline-flex items-center px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest transition-transform hover:scale-105" 
                                                        style={{ 
                                                            backgroundColor: `${transaction.category_detail.color}15`,
                                                            borderColor: `${transaction.category_detail.color}30`,
                                                            color: transaction.category_detail.color 
                                                        }}
                                                    >
                                                        {transaction.category_detail.name}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground/30 text-[10px] font-black uppercase tracking-widest">Geral</span>
                                                )}
                                                {/* IMPORT-46 */}
                                                {transaction.category_suggested && (
                                                    <div className="mt-1.5"><SeloDeSugerida /></div>
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {(() => {
                                                    const accountId = transaction.account || transaction.account_detail?.id
                                                    const account = accounts.find(a => a.id === accountId)
                                                    const color = account?.color || transaction.account_detail?.color || '#888888'
                                                    const name = account?.name || transaction.account_detail?.name || (transaction.credit_card ? 'Cartão' : 'Conta')

                                                    return (
                                                        <div 
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm transition-all hover:scale-105"
                                                            style={{ 
                                                                backgroundColor: `${color}15`,
                                                                borderColor: `${color}30`,
                                                                color: color
                                                            }}
                                                        >
                                                            <Wallet className="h-3 w-3 opacity-70" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[120px]">
                                                                {name}
                                                            </span>
                                                        </div>
                                                    )
                                                })()}
                                            </TableCell>
                                            <TableCell className="pr-8 text-right relative">
                                                <div className={cn(
                                                    "text-base font-black tabular-nums tracking-tighter transition-all group-hover:pr-4",
                                                    isNegative ? "text-red-500" : "text-emerald-500"
                                                )}>
                                                    {isNegative ? "- " : "+ "}
                                                    {formatarMoeda(transaction.amount)}
                                                </div>

                                                {/* Floating Action Button (FAB) - Hover Only */}
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
                                                    <div className="flex items-center gap-1.5 p-1.5 bg-background shadow-xl border border-border/40 rounded-2xl">
                                                        {/* VINCULO-01 a VINCULO-04 */}
                                                        <AcoesDoVinculo
                                                            transacao={transaction}
                                                            liberado={vinculosLiberados}
                                                            onLancarRelacionado={lancarRelacionado}
                                                            onVincular={setTransacaoAVincular}
                                                            onAlterado={handleFormSuccess}
                                                        />
                                                        {isPending && transaction.recurring_source && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 rounded-xl text-emerald-600 hover:bg-emerald-500/10 transition-all" 
                                                                onClick={() => handleConfirm(transaction)}
                                                                title="Efetivar Transação"
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 rounded-xl text-primary hover:bg-primary/10 transition-all" 
                                                            onClick={() => handleEdit(transaction)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 rounded-xl text-red-600 hover:bg-red-500/10 transition-all" 
                                                            onClick={() => handleDelete(transaction)}
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
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
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8">
        <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Exibir</span>
            <select 
                value={pageSize} 
                onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                }}
                className="bg-card border border-border/40 rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
            >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
            </select>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">de {total} transações</span>
        </div>

        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="rounded-xl h-9 font-bold text-xs px-4"
            >
                Anterior
            </Button>
            <div className="flex items-center gap-1 px-4 h-9 bg-muted/30 rounded-xl border border-border/20">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Página</span>
                <span className="text-xs font-black tabular-nums">{page}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mx-1">de</span>
                <span className="text-xs font-black tabular-nums">{Math.max(1, totalPages)}</span>
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="rounded-xl h-9 font-bold text-xs px-4"
            >
                Próximo
            </Button>
        </div>
      </div>
    </div>
  )
}
