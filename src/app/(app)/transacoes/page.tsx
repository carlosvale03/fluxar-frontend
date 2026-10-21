"use client"

import { useEffect, useRef, useState, Fragment } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
    Plus, Download, ArrowUpCircle, ArrowDownCircle, ArrowRightCircle, ArrowRightLeft,
    CreditCard, Receipt, Edit, Trash, ChevronLeft, ChevronRight, CheckCircle, Repeat, Search, X, Inbox
} from "lucide-react"
import {
    parseISO,
    startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
    addWeeks, subWeeks, addMonths, subMonths, addYears, subYears,
    format
} from "date-fns"
import { toast } from "sonner"
import { ptBR } from "date-fns/locale"
import type { LucideIcon as TipoDeIcone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LucideIcon } from "@/components/ui/icon-picker"
import { Card } from "@/components/ui/card"
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Valor } from "@/components/ui/valor"
import { Paginacao } from "@/components/ui/paginacao"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import { TransferFormDialog } from "@/components/transactions/transfer-form-dialog"
import { CardExpenseFormDialog } from "@/components/transactions/card-expense-form-dialog"
import { InvoicePaymentDialog } from "@/components/transactions/invoice-payment-dialog"
import { TransactionDeleteDialog } from "@/components/transactions/transaction-delete-dialog"
import { TransactionFilters, FilterState, FiltrosAtivos, ChipDeFiltro } from "@/components/transactions/transaction-filters"
import { SeloDeSugerida } from "@/components/transactions/selo-de-sugerida"
import { useAvisoDoSalario } from "@/components/salario/AvisoDoSalario"
import { MarcaDoVinculo } from "@/components/transactions/marca-do-vinculo"
import { AcoesDoVinculo, TipoDoGastoRelacionado, VincularTransacaoDialog } from "@/components/transactions/vincular-transacao"
import { usePlan } from "@/hooks/use-plan"
import { urlDaPrincipal } from "@/services/vinculos"
import Link from "next/link"

import { api } from "@/services/apiClient"
import { PrincipalDoVinculo, Transaction, TransactionType } from "@/types/transactions"
import { Account } from "@/types/accounts"
import { Category } from "@/types/categories"
import { cn } from "@/lib/utils"
import { lerData } from "@/lib/datas"
import { tratarErro } from "@/lib/erros"
import { ROTULO_SEM_CLASSE, VALOR_SEM_CLASSE } from "@/lib/classes"

type ViewMode = 'WEEK' | 'MONTH' | 'YEAR'
type Direcao = "entrada" | "saida" | "transferencia"

// O intervalo de datas de cada aba do período
const intervaloDoPeriodo = (viewMode: ViewMode, data: Date) => {
    if (viewMode === 'WEEK') return { inicio: startOfWeek(data, { locale: ptBR }), fim: endOfWeek(data, { locale: ptBR }) }
    if (viewMode === 'YEAR') return { inicio: startOfYear(data), fim: endOfYear(data) }
    return { inicio: startOfMonth(data), fim: endOfMonth(data) }
}

// "2026-10-01" vira uma data local, sem o deslocamento do fuso
const dataLocal = (dia: string) => {
    const [ano, mes, d] = dia.split('-').map(Number)
    return new Date(ano, mes - 1, d)
}

interface ConfiguracaoDoTipo {
    icone: TipoDeIcone
    // Cor do ícone quando a transação não tem categoria
    cor: string
    rotulo: string
    variante: "success" | "destructive" | "info" | "secondary"
}

// Ícone, cor e pílula de cada tipo; a cor sempre vem com o nome do tipo
const configuracaoDoTipo = (type: TransactionType): ConfiguracaoDoTipo => {
    switch (type) {
        case "INCOME":
            return { icone: ArrowUpCircle, cor: "text-inflow", rotulo: "Receita", variante: "success" }
        case "EXPENSE":
            return { icone: ArrowDownCircle, cor: "text-outflow", rotulo: "Despesa", variante: "destructive" }
        case "CREDIT_CARD":
        case "CREDIT_CARD_EXPENSE":
            return { icone: CreditCard, cor: "text-outflow", rotulo: "Despesa no cartão", variante: "destructive" }
        case "TRANSFER":
        case "TRANSFER_OUT":
        case "TRANSFER_IN":
            return { icone: ArrowRightLeft, cor: "text-info", rotulo: "Transferência", variante: "info" }
        case "INVOICE_PAYMENT":
            return { icone: Receipt, cor: "text-fg-secondary", rotulo: "Pagamento de fatura", variante: "secondary" }
        default:
            return { icone: ArrowRightCircle, cor: "text-muted-foreground", rotulo: "Outro", variante: "secondary" }
    }
}

// Sinal do valor: saídas com "−", entradas com "+" e transferência com "→"
const direcaoDe = (type: TransactionType): Direcao => {
    if (type === 'EXPENSE' || type === 'CREDIT_CARD' || type === 'CREDIT_CARD_EXPENSE' || type === 'TRANSFER_OUT' || type === 'INVOICE_PAYMENT') return "saida"
    if (type === 'TRANSFER') return "transferencia"
    return "entrada"
}

// Ícone da categoria (cor do usuário) ou, sem categoria, o ícone do tipo
function IconeDoLancamento({ transaction, tamanho }: { transaction: Transaction, tamanho: "sm" | "md" }) {
    const categoria = transaction.category_detail
    const caixa = tamanho === "md" ? "h-9 w-9" : "h-8 w-8"
    if (categoria) {
        return (
            <span
                aria-hidden="true"
                className={cn("flex shrink-0 items-center justify-center rounded-md", caixa)}
                style={{ backgroundColor: `${categoria.color}1f`, color: categoria.color }}
            >
                <LucideIcon name={categoria.icon || "Tag"} className="h-4 w-4" />
            </span>
        )
    }
    const tipo = configuracaoDoTipo(transaction.type)
    const Icone = tipo.icone
    return (
        <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-md bg-elevated", caixa, tipo.cor)}>
            <Icone className="h-4 w-4" />
        </span>
    )
}

// Ponto com a cor de uma conta, categoria ou tag (dado do usuário)
function PontoDeCor({ cor }: { cor?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn("h-2 w-2 shrink-0 rounded-full", !cor && "bg-muted-foreground")}
            style={cor ? { backgroundColor: cor } : undefined}
        />
    )
}

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
          toast.info("Este tipo de transação ainda não pode ser editado pela lista.")
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
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH')
  const [currentDate, setCurrentDate] = useState(initialDate)

  // Update dates when viewMode or currentDate changes
  useEffect(() => {
      // If we have custom start/end dates from URL, don't overwrite them on first load
      if (startDateParam && endDateParam && filters.startDate?.getTime() === parseISO(startDateParam).getTime()) {
          return
      }

      const { inicio, fim } = intervaloDoPeriodo(viewMode, currentDate)

      if (inicio.getTime() !== filters.startDate?.getTime() ||
          fim.getTime() !== filters.endDate?.getTime()) {
          // CONTRATO-06: filtro novo volta para a página 1 na mesma renderização
          setFilters({ ...filters, startDate: inicio, endDate: fim })
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
              return `${format(start, "dd")} a ${format(end, "dd 'de' MMMM", { locale: ptBR })}`
          }
          return `${format(start, "dd/MM")} a ${format(end, "dd/MM")}`
      } else if (viewMode === 'MONTH') {
          const str = format(currentDate, "MMMM yyyy", { locale: ptBR })
          return str.charAt(0).toUpperCase() + str.slice(1)
      } else {
          return format(currentDate, "yyyy")
      }
  }

  const rotuloAnterior = viewMode === "WEEK" ? "Semana anterior" : viewMode === "YEAR" ? "Ano anterior" : "Mês anterior"
  const rotuloSeguinte = viewMode === "WEEK" ? "Próxima semana" : viewMode === "YEAR" ? "Próximo ano" : "Próximo mês"

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
          toast.success("Transação efetivada.")
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

  // AZ-24: chips dos filtros ativos, cada um removível, e "Limpar filtros"
  const aplicarFiltros = (novos: FilterState) => {
      setFilters(novos)
      setPage(1)
  }

  const nomeDaCategoria = (id: string) => {
      for (const cat of categories) {
          if (String(cat.id) === id) return cat.name
          const sub = cat.subcategories?.find(s => String(s.id) === id)
          if (sub) return sub.name
      }
      return "Categoria"
  }

  const periodoDasAbas = intervaloDoPeriodo(viewMode, currentDate)
  const periodoPersonalizado = !lote && !principalId && (
      filters.startDate?.getTime() !== periodoDasAbas.inicio.getTime() ||
      filters.endDate?.getTime() !== periodoDasAbas.fim.getTime()
  )
  const textoDoPeriodo = () => {
      const inicio = filters.startDate ? format(filters.startDate, "dd/MM/yyyy") : null
      const fim = filters.endDate ? format(filters.endDate, "dd/MM/yyyy") : null
      if (inicio && fim) return `${inicio} a ${fim}`
      if (inicio) return `Desde ${inicio}`
      if (fim) return `Até ${fim}`
      return "Todo o histórico"
  }

  const chips: ChipDeFiltro[] = []
  if (periodoPersonalizado) {
      chips.push({ chave: "periodo", rotulo: textoDoPeriodo(), remover: () => aplicarFiltros({ ...filters, startDate: periodoDasAbas.inicio, endDate: periodoDasAbas.fim }) })
  }
  if (filters.type !== "ALL") {
      chips.push({ chave: "tipo", rotulo: filters.type === "INCOME" ? "Receitas" : filters.type === "EXPENSE" ? "Despesas" : configuracaoDoTipo(filters.type as TransactionType).rotulo, remover: () => aplicarFiltros({ ...filters, type: "ALL" }) })
  }
  for (const id of filters.categoryIds) {
      chips.push({ chave: `categoria-${id}`, rotulo: nomeDaCategoria(id), remover: () => aplicarFiltros({ ...filters, categoryIds: filters.categoryIds.filter(c => c !== id) }) })
  }
  if (filters.accountId !== "ALL") {
      const conta = accounts.find(a => a.id === filters.accountId)
      chips.push({ chave: "conta", rotulo: `Conta: ${conta?.name ?? "selecionada"}`, remover: () => aplicarFiltros({ ...filters, accountId: "ALL" }) })
  }
  const classes = filters.classIds ?? []
  if (classes.length > 0) {
      const rotulo = classes.length === 1
          ? (classes[0] === VALOR_SEM_CLASSE ? ROTULO_SEM_CLASSE : "1 classe")
          : `${classes.length} classes`
      chips.push({ chave: "classes", rotulo, remover: () => aplicarFiltros({ ...filters, classIds: [] }) })
  }
  const tags = filters.tagIds ?? []
  if (tags.length > 0) {
      chips.push({ chave: "tags", rotulo: tags.length === 1 ? "1 tag" : `${tags.length} tags`, remover: () => aplicarFiltros({ ...filters, tagIds: [] }) })
  }
  if (filters.linked) {
      chips.push({ chave: "vinculo", rotulo: "Com vínculo", remover: () => aplicarFiltros({ ...filters, linked: false }) })
  }

  const limparFiltros = () => aplicarFiltros({
      startDate: periodoDasAbas.inicio,
      endDate: periodoDasAbas.fim,
      type: "ALL",
      categoryIds: [],
      accountId: "ALL",
      tagIds: [],
      classIds: [],
      linked: false,
  })

  // Lançamentos agrupados por dia, do mais recente para o mais antigo
  const dias = (() => {
      const grupos: Record<string, Transaction[]> = {}
      for (const transacao of data) {
          (grupos[transacao.date] ??= []).push(transacao)
      }
      return Object.keys(grupos)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
          .map(dia => ({ dia, transacoes: grupos[dia] }))
  })()

  const contaDe = (transaction: Transaction) => {
      const accountId = transaction.account || transaction.account_detail?.id
      const account = accounts.find(a => a.id === accountId)
      return {
          // Cor da conta: dado do usuário
          cor: account?.color || transaction.account_detail?.color,
          nome: account?.name || transaction.account_detail?.name || (transaction.credit_card ? 'Cartão' : 'Conta'),
      }
  }

  const totalDoDia = (dia: string) => (
      // CONTRATO-09: o total do dia vem de day_totals, não da soma da página
      <span className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="total-do-dia">
          Saldo do dia
          <Valor valor={totaisDoDia[dia] ?? 0} />
      </span>
  )

  const filtrosAtivos = chips.length > 0 || !!buscaComEspera
  const vazio = (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
          <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-fg-secondary">
              {filtrosAtivos
                  ? "Nenhuma transação com estes filtros."
                  : "Nenhuma transação neste período. Registre a primeira ou importe um extrato."}
          </p>
      </div>
  )

  const seletorDePeriodo = (
      <div className="flex flex-wrap items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v: string) => { setViewMode(v as ViewMode); setCurrentDate(new Date()) }} className="w-auto">
              <TabsList aria-label="Agrupar o período por">
                  <TabsTrigger value="WEEK">Semana</TabsTrigger>
                  <TabsTrigger value="MONTH">Mês</TabsTrigger>
                  <TabsTrigger value="YEAR">Ano</TabsTrigger>
              </TabsList>
          </Tabs>
          <div className="flex items-center rounded-md border border-border-strong">
              <Button variant="ghost" size="icon" onClick={() => navigatePeriod('PREV')} aria-label={rotuloAnterior} className="h-8 w-8 rounded-r-none">
                  <ChevronLeft aria-hidden="true" />
              </Button>
              <span className="min-w-[9.5rem] px-2 text-center font-mono text-sm" aria-live="polite">
                  {getPeriodLabel()}
              </span>
              <Button variant="ghost" size="icon" onClick={() => navigatePeriod('NEXT')} aria-label={rotuloSeguinte} className="h-8 w-8 rounded-l-none">
                  <ChevronRight aria-hidden="true" />
              </Button>
          </div>
      </div>
  )

  const acoes = (
      <>
          <Button variant="outline" asChild>
              <Link href="/importar?tab=export">
                  <Download aria-hidden="true" /> Exportar
              </Link>
          </Button>
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button>
                      <Plus aria-hidden="true" /> Nova transação
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px]">
                  <DropdownMenuLabel className="label text-muted-foreground">Tipo de transação</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleOpenForm("INCOME")}>
                     <ArrowUpCircle className="mr-2 h-4 w-4 text-inflow" aria-hidden="true" /> Nova Receita
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenForm("EXPENSE")}>
                     <ArrowDownCircle className="mr-2 h-4 w-4 text-outflow" aria-hidden="true" /> Nova Despesa
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsCardExpenseOpen(true)}>
                     <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" /> Despesa no Cartão
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsInvoicePaymentOpen(true)}>
                     <Receipt className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" /> Pagar Fatura
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsTransferOpen(true)}>
                      <ArrowRightLeft className="mr-2 h-4 w-4 text-info" aria-hidden="true" /> Transferência
                  </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
      </>
  )

  // Filtro que vem de um atalho (importação ou principal), com a opção de limpar
  const filtroDoAtalho = (texto: string, limpar: () => void) => (
      <div role="status" className="flex items-center justify-between gap-3 rounded-md border border-l-[3px] border-border border-l-info bg-card px-4 py-2">
          <span className="text-sm text-fg-secondary">{texto}</span>
          <Button variant="ghost" size="sm" onClick={limpar}>
              <X aria-hidden="true" /> Limpar filtro
          </Button>
      </div>
  )

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 md:px-6 md:py-8">
      <CabecalhoDePagina
        titulo="Diário de Bordo"
        apoio="Entradas e saídas"
        periodo={seletorDePeriodo}
        acoes={acoes}
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
                type="search"
                aria-label="Buscar transações"
                placeholder="Buscar por descrição"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        setBuscaComEspera(search)
                        setPage(1)
                    }
                }}
                className="pl-9"
            />
        </div>
        <TransactionFilters
           currentFilters={filters}
           onApplyFilters={aplicarFiltros}
        />
      </div>

      <FiltrosAtivos chips={chips} onLimpar={limparFiltros} className="mb-4" />

      {/* IMPORT-45: o filtro do atalho da importação, com a opção de limpar */}
      {(lote || soSugeridas) && (
        <div className="mb-4">
          {filtroDoAtalho(
              soSugeridas
                  ? (lote ? "Categorias sugeridas nesta importação" : "Categorias sugeridas pelo seu histórico")
                  : "Transações desta importação",
              limparFiltroDoLote
          )}
        </div>
      )}

      {/* VINCULO-31: a lista da principal, com a opção de limpar */}
      {principalId && !lote && (
        <div className="mb-4">
          {filtroDoAtalho("Gasto principal e os gastos relacionados", limparFiltroDaPrincipal)}
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

      {/* Celular: lista de dois níveis (DESIGN.md §5, Tabelas) */}
      <div className="space-y-4 md:hidden">
        {isLoading ? (
            <Card className="divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <Skeleton className="h-9 w-9 rounded-md" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                    </div>
                ))}
            </Card>
        ) : data.length === 0 ? (
            <Card>{vazio}</Card>
        ) : dias.map(({ dia, transacoes }) => (
            <section key={dia} aria-label={format(dataLocal(dia), "dd 'de' MMMM", { locale: ptBR })} className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-1">
                    <span className="label text-fg-secondary">
                        {format(dataLocal(dia), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                    {totalDoDia(dia)}
                </div>

                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                    {transacoes.map((transaction) => {
                        const isPending = transaction.status === 'PENDING'
                        const conta = contaDe(transaction)

                        return (
                            <li
                                key={transaction.id}
                                data-testid="lancamento-no-celular"
                                onClick={() => handleEdit(transaction)}
                                className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-fast hover:bg-elevated"
                            >
                                <IconeDoLancamento transaction={transaction} tamanho="md" />

                                <div className="min-w-0 flex-1 space-y-1">
                                    <p className={cn("truncate text-sm font-medium", isPending && "text-fg-secondary")}>
                                        {transaction.description}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1.5">
                                            <PontoDeCor cor={conta.cor} />
                                            <span className="max-w-[120px] truncate">{conta.nome}</span>
                                        </span>

                                        {/* FATURA-16: a linha fica no vencimento; a data da compra aparece aqui */}
                                        {transaction.type === 'CREDIT_CARD' && transaction.purchase_date && (
                                            <span>
                                                Compra em {format(lerData(transaction.purchase_date), "dd/MM")}
                                            </span>
                                        )}

                                        {/* Tags */}
                                        {transaction.tags_detail && transaction.tags_detail.length > 0 && (
                                            <span className="inline-flex items-center gap-1">
                                                {transaction.tags_detail.slice(0, 1).map(tag => (
                                                    <span key={tag.id} className="inline-flex items-center gap-1">
                                                        <PontoDeCor cor={tag.color} />
                                                        {tag.name}
                                                    </span>
                                                ))}
                                                {transaction.tags_detail.length > 1 && (
                                                    <span>+{transaction.tags_detail.length - 1}</span>
                                                )}
                                            </span>
                                        )}

                                        {isPending && <Badge variant="warning">Pendente</Badge>}

                                        {/* IMPORT-46 */}
                                        {transaction.category_suggested && <SeloDeSugerida />}
                                    </div>

                                    {/* VINCULO-24 e VINCULO-25 */}
                                    <MarcaDoVinculo
                                        transacao={transaction}
                                        onAbrirPrincipal={vinculosLiberados ? abrirPrincipal : undefined}
                                    />
                                </div>

                                <Valor valor={transaction.amount} direcao={direcaoDe(transaction.type)} className="shrink-0" />

                                {/* VINCULO-01 a VINCULO-04 */}
                                <AcoesDoVinculo
                                    transacao={transaction}
                                    liberado={vinculosLiberados}
                                    onLancarRelacionado={lancarRelacionado}
                                    onVincular={setTransacaoAVincular}
                                    onAlterado={handleFormSuccess}
                                    className="-mr-2 shrink-0"
                                />
                            </li>
                        )
                    })}
                </ul>
            </section>
        ))}
      </div>

      {/* Desktop: tabela densa (DESIGN.md §5, Tabelas) */}
      <Card className="hidden overflow-hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[88px]">Hora</TableHead>
                <TableHead>Lançamento</TableHead>
                <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-px"><span className="sr-only">Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="hover:bg-transparent">
                            <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-8 w-8 rounded-md" />
                                    <Skeleton className="h-4 w-40" />
                                </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                            <TableCell />
                        </TableRow>
                    ))
                ) : data.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="p-0">{vazio}</TableCell>
                    </TableRow>
                ) : dias.map(({ dia, transacoes }) => (
                    <Fragment key={dia}>
                        {/* Cabeçalho do dia */}
                        <TableRow className="bg-background hover:bg-background">
                            <TableCell colSpan={7} className="py-2">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="label text-fg-secondary">
                                        {format(dataLocal(dia), "dd 'de' MMMM", { locale: ptBR })}
                                        <span className="text-muted-foreground"> · {format(dataLocal(dia), "EEEE", { locale: ptBR })}</span>
                                    </span>
                                    {totalDoDia(dia)}
                                </div>
                            </TableCell>
                        </TableRow>

                        {transacoes.map((transaction) => {
                            const tipo = configuracaoDoTipo(transaction.type)
                            const isPending = transaction.status === 'PENDING'
                            const conta = contaDe(transaction)

                            return (
                                <TableRow key={transaction.id} className="group">
                                    <TableCell className="align-top">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {transaction.created_at ? format(new Date(transaction.created_at), "HH:mm") : "–"}
                                            </span>
                                            {isPending && <Badge variant="warning">Pendente</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <IconeDoLancamento transaction={transaction} tamanho="sm" />
                                            <div className="flex min-w-0 flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-sm font-medium", isPending && "text-fg-secondary")}>
                                                        {transaction.description}
                                                    </span>
                                                    {(transaction.is_recurring || transaction.recurring_source) && (
                                                        <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Recorrente" />
                                                    )}
                                                </div>
                                                {/* FATURA-16: a linha fica no vencimento; a data da compra aparece aqui */}
                                                {transaction.type === 'CREDIT_CARD' && transaction.purchase_date && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Compra em {format(lerData(transaction.purchase_date), "dd/MM")}
                                                    </span>
                                                )}
                                                {transaction.tags_detail && transaction.tags_detail.length > 0 && (
                                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                        {transaction.tags_detail.map(tag => (
                                                            <span key={tag.id} className="inline-flex items-center gap-1">
                                                                <PontoDeCor cor={tag.color} />
                                                                {tag.name}
                                                            </span>
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
                                    <TableCell className="hidden lg:table-cell">
                                        <Badge variant={tipo.variante}>{tipo.rotulo}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col items-start gap-1">
                                            {transaction.category_detail ? (
                                                <span className="inline-flex items-center gap-1.5 text-sm text-fg-secondary">
                                                    <PontoDeCor cor={transaction.category_detail.color} />
                                                    {transaction.category_detail.name}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">Geral</span>
                                            )}
                                            {/* IMPORT-46 */}
                                            {transaction.category_suggested && <SeloDeSugerida />}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center gap-1.5 text-sm text-fg-secondary">
                                            <PontoDeCor cor={conta.cor} />
                                            <span className="max-w-[140px] truncate">{conta.nome}</span>
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Valor valor={transaction.amount} direcao={direcaoDe(transaction.type)} />
                                    </TableCell>
                                    <TableCell className="pr-2">
                                        {/* Ações da linha: no hover e também no foco do teclado */}
                                        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
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
                                                    className="h-8 w-8 text-inflow"
                                                    onClick={() => handleConfirm(transaction)}
                                                    title="Efetivar Transação"
                                                    aria-label="Efetivar Transação"
                                                >
                                                    <CheckCircle aria-hidden="true" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleEdit(transaction)}
                                                aria-label={`Editar ${transaction.description}`}
                                                title="Editar"
                                            >
                                                <Edit aria-hidden="true" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:text-outflow"
                                                onClick={() => handleDelete(transaction)}
                                                aria-label={`Excluir ${transaction.description}`}
                                                title="Excluir"
                                            >
                                                <Trash aria-hidden="true" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </Fragment>
                ))}
            </TableBody>
          </Table>
      </Card>

      <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <label htmlFor="itens-por-pagina">Itens por página</label>
            <select
                id="itens-por-pagina"
                value={pageSize}
                onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                }}
                className="h-8 cursor-pointer rounded-md border border-input bg-card px-2 font-mono text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
            </select>
        </div>
        <div className="w-full sm:w-auto [&>div]:border-t-0 [&>div]:p-0">
            <Paginacao
                pagina={page}
                totalDePaginas={totalPages}
                total={total}
                rotulo="transações"
                carregando={isLoading}
                onMudarPagina={setPage}
            />
        </div>
      </div>
    </div>
  )
}
