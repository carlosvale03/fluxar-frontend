"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Plus, PlusCircle, Repeat, ArrowUpCircle, ArrowDownCircle, AlertCircle, Sparkles, DollarSign, Tag, CalendarDays, Wallet, AlignLeft, CornerDownRight, Search } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import { api } from "@/services/apiClient"
import { PrincipalDoVinculo, Transaction, TransactionType } from "@/types/transactions"
import { textoDaPrincipal } from "@/services/vinculos"
import { Category } from "@/types/categories"
import { Account, AccountTypeLabels } from "@/types/accounts"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import { TagSelector } from "@/components/tags/TagSelector"
import { usePlan } from "@/hooks/use-plan"
import { AvisoCompacto } from "@/components/planos/recurso-bloqueado"
import { LucideIcon } from "@/components/ui/icon-picker"
import { MoneyInput } from "@/components/ui/money-input"
import { maiorQueZero } from "@/lib/dinheiro"
import { CategoryForm } from "@/components/categories/CategoryForm"
import { tratarErro } from "@/lib/erros"
import { SeloDeSugerida } from "@/components/transactions/selo-de-sugerida"

const formSchema = z.object({
  description: z.string().min(3, "A descrição deve ter pelo menos 3 caracteres."),
  // CONTRATO-17: o valor vai à API como texto decimal ("1234.56")
  amount: z.string().refine(maiorQueZero, "O valor precisa ser maior que zero."),
  date: z.date(),
  category_id: z.string().min(1, "Selecione uma categoria."),
  account_id: z.string().min(1, "Selecione uma conta."),
  type: z.enum(["INCOME", "EXPENSE"]),
  is_recurring: z.boolean().default(false).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  tags: z.array(z.string()).default([]),
}).refine((data) => {
  if (data.is_recurring && !data.frequency) {
    return false;
  }
  return true;
}, {
  message: "Selecione a frequência da recorrência.",
  path: ["frequency"],
})

type FormValues = z.infer<typeof formSchema>

interface TransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // A transação criada, ou a editada que passou de pendente a efetivada (nas
  // demais edições, nada): o aviso do salário confere se é um salário
  // recebido (SALARIO-19)
  onSuccess: (criada?: Transaction) => void
  type: "INCOME" | "EXPENSE"
  initialData?: any 
  // VINCULO-01: o gasto relacionado nasce já como dependente desta principal
  principal?: PrincipalDoVinculo | null
}

export function TransactionFormDialog({ open, onOpenChange, onSuccess, type, initialData, principal }: TransactionFormDialogProps) {
  // A principal só vale na criação de uma despesa
  const principalDoNovo = !initialData && type === "EXPENSE" ? principal ?? null : null
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [updateScope, setUpdateScope] = useState<"SINGLE" | "ALL">("SINGLE")
  // PERM-19: a opção recorrente e a edição da série dependem de
  // `transacoes_recorrentes`; o campo de tags, de `tags`
  const { podeUsar } = usePlan()
  const recorrentesLiberadas = podeUsar("transacoes_recorrentes") === true
  const tagsLiberadas = podeUsar("tags") === true
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      description: "",
      amount: "",
      type: type,
      category_id: "",
    },
  })

  const isIncome = type === "INCOME"

  const fetchDependencies = async () => {
      try {
          const [catRes, accRes] = await Promise.all([
              api.get(`/categories/?type=${type}`),
              api.get("/accounts/")
          ])
          
          let rawCats: Category[] = catRes.data
          const organized: any[] = []
          rawCats.forEach(parent => {
              organized.push({ ...parent, isSubcategory: false })
              if (parent.subcategories) {
                  parent.subcategories.forEach(child => {
                      organized.push({
                          ...child,
                          isSubcategory: true,
                          parentIcon: parent.icon,
                          parentColor: parent.color
                      })
                  })
              }
          })
          
          setCategories(organized)
          setAccounts(accRes.data)
      } catch (error) {
          console.error("Failed to fetch dependencies", error)
          toast.error("Não foi possível carregar as categorias e as contas. Feche o formulário e abra de novo.")
      }
  }

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    try {
      const payload = {
          ...data,
          date: format(data.date, "yyyy-MM-dd"),
      }
      
      const isEdit = !!initialData
      const endpoint = isEdit ? `/transactions/${initialData.id}/` : "/transactions/"
      
      const finalPayload = {
          ...payload,
          account: payload.account_id,
          category: payload.category_id,
          tags: payload.tags,
          ...(principalDoNovo ? { principal: principalDoNovo.id } : {}),
      }
      delete (finalPayload as any).account_id
      delete (finalPayload as any).category_id
      // PERM-21: com `tags` fechada, editar a transação segue liberado; o
      // campo some do corpo para manter as tags que ela já tem
      if (isEdit && !tagsLiberadas) {
          Reflect.deleteProperty(finalPayload, "tags")
      }

      let response;
      let criada: Transaction | undefined
      if (isEdit) {
          if (updateScope === 'ALL' && initialData.recurring_source) {
               const bulkPayload = {
                   recurring_source: initialData.recurring_source,
                   description: finalPayload.description,
                   amount: finalPayload.amount,
                   category: finalPayload.category,
                   account: finalPayload.account,
                   type: finalPayload.type
               }
               response = await api.patch('/transactions/bulk-update/', bulkPayload)
               toast.success("Série recorrente atualizada.")
          } else {
               response = await api.put<Transaction>(endpoint, finalPayload)
               toast.success("Lançamento atualizado.")
               // SALARIO-19: a entrada pendente que voltou efetivada da edição
               // também vai ao aviso do salário
               if (initialData.status === "PENDING" && response.data?.status === "COMPLETED") {
                   criada = response.data
               }
          }
      } else {
          response = await api.post<Transaction>(endpoint, finalPayload)
          criada = response.data
          toast.success("Lançamento registrado.")
      }

      onSuccess(criada)
      onOpenChange(false)
    } catch (error) {
      // CONTRATO-30: o erro de cada campo vai para o campo; o resto, ao Sonner
      tratarErro(error, {
        form,
        campos: {
          description: "description",
          amount: "amount",
          date: "date",
          category: "category_id",
          account: "account_id",
          type: "type",
          tags: "tags",
          frequency: "frequency",
        },
        mensagemPadrao: "Não foi possível salvar o lançamento. Confira os campos e tente de novo.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const watchDescription = form.watch("description")
  
  useEffect(() => {
     // Fetch suggestions only when user types the first character
     if (open && watchDescription && watchDescription.length === 1 && recentTransactions.length === 0) {
         const fetchSuggestions = async () => {
             try {
                 // CONTRATO-03 e CONTRATO-14: o tamanho da página é page_size (limit é recusado)
                 const res = await api.get("/transactions/", { params: { page_size: 50, type } })
                 const records = res.data.results
                 setRecentTransactions(records)
             } catch (error) {
                 // CONTRATO-33: nenhuma falha silenciosa
                 tratarErro(error, { mensagemPadrao: "Não foi possível carregar as sugestões. Continue digitando a descrição." })
             }
         }
         fetchSuggestions()
     }
  }, [open, watchDescription, type, recentTransactions.length])

  // Filter unique suggestions based on description and STRICT matching of type
  const suggestions = recentTransactions
    .filter(t => 
        t.type === type && // Force client side filtering to be absolutely sure
        watchDescription && watchDescription.length >= 1 && 
        t.description.toLowerCase().includes(watchDescription.toLowerCase()) &&
        t.description.toLowerCase() !== watchDescription.toLowerCase()
    )
    .reduce((acc: any[], current) => {
        const x = acc.find(item => item.description === current.description);
        if (!x) return acc.concat([current]);
        return acc;
    }, [])
    .slice(0, 5)

  const handleSelectSuggestion = (suggestion: any) => {
      form.setValue("description", suggestion.description)
      
      // Auto-select category if available in local state
      if (suggestion.category) {
          const catId = typeof suggestion.category === 'object' ? suggestion.category.id : suggestion.category
          form.setValue("category_id", catId)
      }
      
      // Auto-select account if available in local state
      if (suggestion.account) {
          const accId = typeof suggestion.account === 'object' ? suggestion.account.id : suggestion.account
          form.setValue("account_id", accId)
      }

      setShowSuggestions(false)
      toast.success("Categoria e conta preenchidas pelo histórico.", {
          icon: <Sparkles className="h-4 w-4" />,
          duration: 2000
      })
  }

  useEffect(() => {
    if (open) {
        setRecentTransactions([]) // Reset suggestions when form opens
        if (initialData && initialData.date) {
            const [year, month, day] = initialData.date.split('-').map(Number);
            form.reset({
                description: initialData.description,
                amount: initialData.amount,
                date: new Date(year, month - 1, day),
                type: initialData.type,
                // Mapeamento robusto para IDs, aceitando string ou objeto (nested)
                category_id: (typeof initialData.category === 'object' ? (initialData.category as any).id : initialData.category) || initialData.category_detail?.id || "",
                account_id: (typeof initialData.account === 'object' ? (initialData.account as any).id : initialData.account) || initialData.account_detail?.id || "",
                tags: initialData.tags?.map((t: any) => typeof t === 'string' ? t : t.id) || [],
                is_recurring: false, // Sempre falso no edit para evitar conflito com recorrências já existentes
                frequency: undefined,
            })
        } else {
            form.reset({
                description: "",
                amount: "",
                date: new Date(),
                type: type,
                category_id: "",
                account_id: "",
                is_recurring: false,
                frequency: undefined,
                tags: [],
            })
        }
        fetchDependencies()
    }
  }, [open, type, initialData, form])


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
                <DialogHeader className="mb-6">
                    <div className="flex items-center gap-3">
                    <div aria-hidden="true" className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-elevated",
                        isIncome ? "text-inflow" : "text-outflow"
                    )}>
                        {isIncome ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <DialogTitle>
                            {initialData ? "Editar lançamento" : (isIncome ? "Nova entrada" : "Nova saída")}
                        </DialogTitle>
                        <DialogDescription>
                            {initialData ? "Ajuste os detalhes deste lançamento." : (isIncome ? "Registre um valor que entrou numa conta." : "Registre um valor que saiu de uma conta.")}
                        </DialogDescription>
                    </div>
                    </div>
                </DialogHeader>
                
                {/* VINCULO-01 */}
                {principalDoNovo && (
                    <div role="note" className="mb-6 rounded-sm border border-l-[3px] border-border border-l-info bg-card px-4 py-2 text-sm text-fg-secondary">
                        {textoDaPrincipal(principalDoNovo)}
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.error("Form Validation Errors:", errors))} className="space-y-6">
                        
                        {/* Seção 1: Geral */}
                        <div className="space-y-5">
                            <div className="flex items-center gap-2">
                                <h3 className="label text-muted-foreground">Descrição e valor</h3>
                            </div>

                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                        <FormLabel>Descrição</FormLabel>
                                            <div className="relative">
                                                <AlignLeft aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <FormControl>
                                                <Input
                                                    placeholder="Ex.: Salário, Mercado, Aluguel"
                                                    {...field}
                                                    onChange={(e) => {
                                                        field.onChange(e)
                                                        setShowSuggestions(true)
                                                    }}
                                                    autoComplete="off"
                                                    onFocus={() => setShowSuggestions(true)}
                                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                                    className="pl-9"
                                                />
                                                </FormControl>

                                                {/* Popover de Sugestões Inteligentes */}
                                                {showSuggestions && suggestions.length > 0 && (
                                                    <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-full overflow-hidden rounded-lg border border-border-strong bg-popover animate-in fade-in zoom-in-95 duration-fast">
                                                        <div className="border-b border-border p-2">
                                                            <div className="flex items-center gap-2 px-2 py-1">
                                                                <Search className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                                                                <span className="label text-muted-foreground">Lançamentos anteriores</span>
                                                            </div>
                                                        </div>
                                                        <div className="p-1">
                                                            {suggestions.map((s) => (
                                                                <button
                                                                    key={s.id}
                                                                    type="button"
                                                                    onClick={() => handleSelectSuggestion(s)}
                                                                    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-2 text-left transition-colors duration-fast hover:bg-elevated focus-visible:bg-elevated focus-visible:outline-none"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <Repeat className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                                                        <div>
                                                                            <p className="text-sm font-medium">{s.description}</p>
                                                                            <p className="text-xs text-muted-foreground">Preencher categoria e conta</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                                                        {/* Cores da categoria e da conta: dados do usuário */}
                                                                        <span className="inline-flex items-center gap-1.5">
                                                                            <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", !s.category_color && "bg-muted-foreground")} style={s.category_color ? { backgroundColor: s.category_color } : undefined} />
                                                                            {s.category_name || 'Categoria'}
                                                                        </span>
                                                                        <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", !s.account_color && "bg-muted-foreground")} style={s.account_color ? { backgroundColor: s.account_color } : undefined} />
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                            <FormLabel>Valor</FormLabel>
                                            <FormControl>
                                                <MoneyInput
                                                    value={field.value ?? ""}
                                                    onValueChange={(valor) => field.onChange(valor ?? "")}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col space-y-2">
                                            <FormLabel>Data</FormLabel>
                                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                                <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full justify-start font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                        {field.value ? (
                                                            format(field.value, "dd 'de' MMMM", { locale: ptBR })
                                                        ) : (
                                                            <span>Selecione a data</span>
                                                        )}
                                                    </Button>
                                                </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={(date) => {
                                                            field.onChange(date)
                                                            setIsCalendarOpen(false)
                                                        }}
                                                        disabled={(date) => date > new Date("2100-01-01") || date < new Date("1900-01-01")}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seção 2: Classificação */}
                        <div className="space-y-5">
                            <div className="flex items-center gap-2">
                                <h3 className="label text-muted-foreground">Categoria, conta e marcadores</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="category_id"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                        <FormLabel>Categoria</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="[&_.trigger-hidden]:hidden [&_.show-in-trigger]:flex">
                                                    <SelectValue placeholder="Selecione a categoria" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="max-h-[450px] p-2">
                                                <div className="flex flex-col">
                                                    <Button 
                                                        type="button"
                                                        variant="ghost" 
                                                        className="mb-1 w-full justify-start gap-2"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            setIsCategoryDialogOpen(true)
                                                        }}
                                                    >
                                                        <PlusCircle aria-hidden="true" />
                                                        Criar categoria
                                                    </Button>
                                                    
                                                    <div className="px-2 mb-2">
                                                        <Separator />
                                                    </div>

                                                    {categories.map((cat: any, index: number) => {
                                                        const isMaster = !cat.isSubcategory;
                                                        const isFirstMaster = isMaster && !categories.slice(0, index).some((c: any) => !c.isSubcategory);
                                                        const showSeparator = isMaster && !isFirstMaster;
                                                            
                                                            return (
                                                                <div key={cat.id}>
                                                                    {showSeparator && (
                                                                        <div className="px-2 my-2">
                                                                            <Separator />
                                                                        </div>
                                                                    )}
                                                                    <SelectItem 
                                                                        value={cat.id} 
                                                                        className={cn(
                                                                            "group",
                                                                            cat.isSubcategory ? "py-1.5" : "py-2"
                                                                        )}
                                                                    >
                                                                    <div className={cn(
                                                                        "flex items-center gap-3",
                                                                        cat.isSubcategory && "pl-8"
                                                                    )}>
                                                                        {cat.isSubcategory && (
                                                                            <div className="flex items-center shrink-0 trigger-hidden">
                                                                                <CornerDownRight className="h-3 w-3 text-muted-foreground mr-2" />
                                                                            </div>
                                                                        )}
                                                                        
                                                                        <div 
                                                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                                                                            style={{ 
                                                                                backgroundColor: `${cat.color}15`, 
                                                                                color: cat.color 
                                                                            }}
                                                                        >
                                                                            <LucideIcon name={cat.icon || "Tag"} className="h-4 w-4" />
                                                                        </div>

                                                                        <div className="flex flex-col">
                                                                            <span className={cn(
                                                                                "transition-colors duration-fast",
                                                                                cat.isSubcategory 
                                                                                    ? "text-sm text-fg-secondary group-data-[highlighted]:text-foreground" 
                                                                                    : "text-sm font-medium"
                                                                            )}>
                                                                                {cat.name}
                                                                            </span>
                                                                            {!cat.isSubcategory && (
                                                                                <span className="text-xs text-muted-foreground trigger-hidden">Categoria principal</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </SelectItem>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </SelectContent>
                                        </Select>
                                        {/* IMPORT-46: a categoria veio do histórico do usuário */}
                                        {initialData?.category_suggested && field.value === initialData.category_detail?.id && (
                                            <SeloDeSugerida />
                                        )}
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="account_id"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                        <FormLabel>Conta</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <div className="flex items-center gap-2">
                                                        <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                        <SelectValue placeholder="Selecione a conta" />
                                                    </div>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="max-h-[450px] p-2">
                                                <div className="flex flex-col">
                                                    <AccountFormDialog 
                                                        onSuccess={() => fetchDependencies()}
                                                        trigger={
                                                            <Button 
                                                                type="button"
                                                                variant="ghost" 
                                                                className="mb-1 w-full justify-start gap-2"
                                                            >
                                                                <PlusCircle aria-hidden="true" />
                                                                Criar conta
                                                            </Button>
                                                        }
                                                    />

                                                    <div className="px-2 mb-2">
                                                        <Separator />
                                                    </div>

                                                    {["WALLET", "CHECKING", "SAVINGS", "PIGGY_BANK", "INVESTMENT"].map((type, typeIndex) => {
                                                        const groupAccounts = accounts.filter(acc => acc.is_active && acc.type === type);
                                                        if (groupAccounts.length === 0) return null;

                                                        return (
                                                            <div key={type}>
                                                                {typeIndex > 0 && accounts.some(acc => acc.is_active && ["WALLET", "CHECKING", "SAVINGS", "PIGGY_BANK", "INVESTMENT"].slice(0, typeIndex).includes(acc.type)) && (
                                                                    <div className="px-2 my-2">
                                                                        <Separator />
                                                                    </div>
                                                                )}
                                                                <div className="px-3 py-1 mb-1">
                                                                    <span className="label text-muted-foreground">
                                                                        {AccountTypeLabels[type as keyof typeof AccountTypeLabels]}
                                                                    </span>
                                                                </div>
                                                                {groupAccounts.map((acc) => (
                                                                    <SelectItem 
                                                                        key={acc.id} 
                                                                        value={acc.id} 
                                                                        className="group py-2"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div 
                                                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                                                                                style={{ 
                                                                                    backgroundColor: `${acc.color}15`, 
                                                                                    color: acc.color 
                                                                                }}
                                                                            >
                                                                                <Wallet className="h-4 w-4" />
                                                                            </div>

                                                                            <div className="flex flex-col text-left">
                                                                                <span className="text-sm font-medium">
                                                                                    {acc.name}
                                                                                </span>
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    {AccountTypeLabels[acc.type] || "Conta"}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {tagsLiberadas && (
                            <FormField
                                control={form.control}
                                name="tags"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                    <FormLabel>Marcadores</FormLabel>
                                    <FormControl>
                                        <TagSelector
                                            selectedTagIds={field.value}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            )}
                        </div>

                        {/* Seção 3: Planejamento / Recorrência */}
                        <div className="space-y-5">
                            <div className="flex items-center gap-2">
                                <h3 className="label text-muted-foreground">Recorrência</h3>
                            </div>

                            {/* PERM-19: sem transacoes_recorrentes, a série não nasce nem muda inteira */}
                            {!recorrentesLiberadas && <AvisoCompacto />}

                            {/* Recurring Update Scope - only show when editing a recurring transaction */}
                            {initialData?.recurring_source && recorrentesLiberadas && (
                                <div className="space-y-3 rounded-sm border border-l-[3px] border-border border-l-warn bg-card p-4">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <AlertCircle className="h-4 w-4 text-warn" aria-hidden="true" />
                                        Alcance da edição
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <Label htmlFor="escopo-da-edicao">Aplicar a</Label>
                                        <Select value={updateScope} onValueChange={(val: any) => setUpdateScope(val)}>
                                            <SelectTrigger id="escopo-da-edicao" className="w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SINGLE">Só este lançamento</SelectItem>
                                                <SelectItem value="ALL">Toda a série</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {!initialData?.recurring_source && recorrentesLiberadas && (
                                <div className={cn(
                                    "flex flex-col gap-4 rounded-lg border p-4 transition-colors duration-base",
                                    form.watch("is_recurring") ? "border-border-strong bg-elevated" : "border-border"
                                )}>
                                    <FormField
                                        control={form.control}
                                        name="is_recurring"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Repeat className={cn("h-5 w-5 shrink-0", field.value ? "text-foreground" : "text-muted-foreground")} aria-hidden="true" />
                                                        <div className="flex flex-col gap-0.5">
                                                            <FormLabel>Repetir lançamento</FormLabel>
                                                            <p className="text-xs text-muted-foreground">Cria este lançamento de novo a cada período.</p>
                                                        </div>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    
                                    {form.watch("is_recurring") && (
                                        <FormField
                                            control={form.control}
                                            name="frequency"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <FormLabel>Frequência</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecione a frequência" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="DAILY">Diariamente</SelectItem>
                                                            <SelectItem value="WEEKLY">Semanalmente</SelectItem>
                                                            <SelectItem value="MONTHLY">Mensalmente</SelectItem>
                                                            <SelectItem value="YEARLY">Anualmente</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" loading={isLoading}>
                                {initialData ? "Salvar lançamento" : `Registrar ${isIncome ? "entrada" : "saída"}`}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </div>
        </ScrollArea>
      </DialogContent>

      {/* Modal secundário: nova categoria */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
          <ScrollArea className="max-h-[85vh]">
            <div className="p-6">
                <DialogHeader className="mb-6">
                    <DialogTitle>Nova categoria</DialogTitle>
                    <DialogDescription>Crie uma categoria sem sair do lançamento.</DialogDescription>
                </DialogHeader>

                <CategoryForm 
                    defaultType={type}
                    onSuccess={() => {
                        setIsCategoryDialogOpen(false)
                        fetchDependencies()
                    }}
                    onCancel={() => setIsCategoryDialogOpen(false)}
                />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
