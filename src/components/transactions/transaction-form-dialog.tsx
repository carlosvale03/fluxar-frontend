"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Loader2, Plus, PlusCircle, Repeat, ArrowUpCircle, ArrowDownCircle, AlertCircle, Sparkles, DollarSign, Tag, CalendarDays, Wallet, AlignLeft, CornerDownRight, Search } from "lucide-react"
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
import { TransactionType } from "@/types/transactions"
import { Category } from "@/types/categories"
import { Account, AccountTypeLabels } from "@/types/accounts"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import { TagSelector } from "@/components/tags/TagSelector"
import { LucideIcon } from "@/components/ui/icon-picker"
import { MoneyInput } from "@/components/ui/money-input"
import { CategoryForm } from "@/components/categories/CategoryForm"

const formSchema = z.object({
  description: z.string().min(3, "A descrição deve ter pelo menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que 0."),
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
  message: "Selecione uma frequência de repetição.",
  path: ["frequency"],
})

type FormValues = z.infer<typeof formSchema>

interface TransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  type: "INCOME" | "EXPENSE"
  initialData?: any 
}

export function TransactionFormDialog({ open, onOpenChange, onSuccess, type, initialData }: TransactionFormDialogProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [updateScope, setUpdateScope] = useState<"SINGLE" | "ALL">("SINGLE")
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      description: "",
      amount: 0,
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
          
          let rawCats: Category[] = catRes.data.results || catRes.data || []
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
          setAccounts(accRes.data.results || accRes.data || [])
      } catch (error) {
          console.error("Failed to fetch dependencies", error)
          toast.error("Erro ao carregar categorias ou contas.")
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
      }
      delete (finalPayload as any).account_id
      delete (finalPayload as any).category_id
 
      let response;
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
               toast.success("Série recorrente atualizada!")
          } else {
               response = await api.put(endpoint, finalPayload)
               toast.success(`${type === "INCOME" ? "Receita" : "Despesa"} atualizada!`)
          }
      } else {
          response = await api.post(endpoint, finalPayload)
          toast.success(`${type === "INCOME" ? "Receita" : "Despesa"} registrada!`)
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error submitting transaction:", error)
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || "Erro ao salvar transação. Verifique os dados."
      toast.error(errorMessage)
      
      if (error.response?.data) {
        console.error("Server validation errors:", error.response.data)
      }
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
                 const res = await api.get(`/transactions/?limit=50&type=${type}`)
                 const records = res.data.results || res.data || []
                 setRecentTransactions(records)
             } catch (error) {
                 console.error("Failed to fetch suggestions", error)
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
      toast.success("Preenchimento automático master aplicado!", {
          icon: <Sparkles className="h-4 w-4 text-primary" />,
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
                amount: Number(initialData.amount),
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
                amount: 0,
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
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px] bg-background">
        <ScrollArea className="max-h-[90vh]">
            <div className="p-8">
                <DialogHeader className="mb-10">
                    <div className="flex items-center gap-5">
                    <div className={cn(
                        "w-16 h-16 rounded-[24px] flex items-center justify-center shadow-xl transition-all duration-500 ring-4 ring-black/5 dark:ring-white/5",
                        isIncome 
                            ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                            : "bg-rose-500 text-white shadow-rose-500/20"
                    )}>
                        {isIncome ? <ArrowUpCircle className="h-8 w-8 animate-in zoom-in-50" /> : <ArrowDownCircle className="h-8 w-8 animate-in zoom-in-50" />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <DialogTitle className="text-3xl font-black tracking-tight">
                            {initialData ? "Editar Lançamento" : (isIncome ? "Nova Receita" : "Nova Despesa")}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-semibold opacity-50 tracking-tight">
                            {initialData ? "Ajuste os detalhes deste lançamento." : "Mantenha seu fluxo de caixa sempre em dia."}
                        </DialogDescription>
                    </div>
                    </div>
                </DialogHeader>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.error("Form Validation Errors:", errors))} className="space-y-8">
                        
                        {/* Seção 1: Geral */}
                        <div className="space-y-5">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-4 rounded-full", isIncome ? "bg-emerald-500" : "bg-rose-500")} />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">O que e Quanto?</h3>
                            </div>

                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1 underline decoration-muted-foreground/20 underline-offset-4">Descrição Principal</FormLabel>
                                        <FormControl>
                                            <div className="relative group">
                                                <AlignLeft className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                                <Input 
                                                    placeholder="Ex: Salário, Mercado, Aluguel..." 
                                                    {...field} 
                                                    onChange={(e) => {
                                                        field.onChange(e)
                                                        setShowSuggestions(true)
                                                    }}
                                                    autoComplete="off"
                                                    onFocus={() => setShowSuggestions(true)}
                                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                                    className="h-12 pl-10 bg-muted/5 border-border/40 rounded-2xl focus-visible:ring-primary/20 transition-all font-bold tracking-tight text-base"
                                                />

                                                {/* Popover de Sugestões Inteligentes */}
                                                {showSuggestions && suggestions.length > 0 && (
                                                    <div className="absolute top-[calc(100%+8px)] left-0 w-full z-50 bg-card/80 backdrop-blur-xl border border-border/40 rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="p-2 border-b border-border/20 bg-muted/20">
                                                            <div className="flex items-center gap-2 px-2 py-1">
                                                                <Search className="h-3 w-3 text-muted-foreground/40" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Lançamentos Sugeridos</span>
                                                            </div>
                                                        </div>
                                                        <div className="p-1">
                                                            {suggestions.map((s) => (
                                                                <button
                                                                    key={s.id}
                                                                    type="button"
                                                                    onClick={() => handleSelectSuggestion(s)}
                                                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-all text-left group/item"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover/item:scale-110 transition-transform">
                                                                            <Repeat className="h-4 w-4" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-bold tracking-tight">{s.description}</p>
                                                                            <p className="text-[10px] font-black uppercase opacity-40">Usar padrões anteriores</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 opacity-60 group-hover/item:opacity-100 transition-opacity">
                                                                        <div 
                                                                            className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter"
                                                                            style={{ backgroundColor: `${s.category_color || '#888'}15`, color: s.category_color || '#888' }}
                                                                        >
                                                                            {s.category_name || 'Categoria'}
                                                                        </div>
                                                                        <div 
                                                                            className="w-2 h-2 rounded-full ring-2 ring-black/5" 
                                                                            style={{ backgroundColor: s.account_color || '#888' }} 
                                                                        />
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-[10px] font-bold" />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Valor Total</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <div className={cn(
                                                        "absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-lg font-black text-[11px] transition-colors",
                                                        isIncome ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                                    )}>
                                                        R$
                                                    </div>
                                                    <MoneyInput 
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                        className="h-12 pl-12 bg-muted/5 border-border/40 rounded-2xl focus-visible:ring-primary/20 transition-all font-black tracking-tight text-lg"
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[10px] font-bold" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col space-y-2">
                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Data Fixada</FormLabel>
                                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                                <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "h-12 px-4 rounded-2xl border-border/40 bg-muted/5 hover:bg-muted/10 font-bold transition-all text-left",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarDays className="mr-3 h-4 w-4 text-muted-foreground/40" />
                                                        {field.value ? (
                                                            format(field.value, "dd 'de' MMMM", { locale: ptBR })
                                                        ) : (
                                                            <span>Selecione...</span>
                                                        )}
                                                    </Button>
                                                </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden shadow-2xl border-border/40" align="start">
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
                                            <FormMessage className="text-[10px] font-bold" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seção 2: Classificação */}
                        <div className="space-y-5">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-4 rounded-full", isIncome ? "bg-emerald-500" : "bg-rose-500")} />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Classificação e Marcação</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="category_id"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Categoria</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-12 rounded-2xl bg-muted/5 border-border/40 font-bold focus:ring-primary/20 [&_.trigger-hidden]:hidden [&_.show-in-trigger]:flex">
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-[32px] border-border/60 shadow-2xl max-h-[450px] p-2 bg-card">
                                                <div className="flex flex-col">
                                                    <Button 
                                                        type="button"
                                                        variant="ghost" 
                                                        className="w-full justify-start gap-3 h-14 rounded-2xl text-primary hover:bg-primary/10 hover:text-primary transition-all font-black text-[10px] uppercase tracking-[0.1em] mb-2 group"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            setIsCategoryDialogOpen(true)
                                                        }}
                                                    >
                                                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-primary/20 group-hover:scale-110 transition-transform">
                                                            <PlusCircle className="h-5 w-5" />
                                                        </div>
                                                        Nova Categoria
                                                    </Button>
                                                    
                                                    <div className="px-2 mb-2">
                                                        <Separator className="bg-muted/20" />
                                                    </div>

                                                    {categories.map((cat: any, index: number) => {
                                                        const isMaster = !cat.isSubcategory;
                                                        const isFirstMaster = isMaster && !categories.slice(0, index).some((c: any) => !c.isSubcategory);
                                                        const showSeparator = isMaster && !isFirstMaster;
                                                            
                                                            return (
                                                                <div key={cat.id}>
                                                                    {showSeparator && (
                                                                        <div className="px-2 my-2">
                                                                            <Separator className="bg-muted/20" />
                                                                        </div>
                                                                    )}
                                                                    <SelectItem 
                                                                        value={cat.id} 
                                                                        className={cn(
                                                                            "group rounded-2xl transition-all duration-300 cursor-pointer mb-1 hover:bg-muted/30",
                                                                            cat.isSubcategory ? "pl-2 py-2" : "py-3"
                                                                        )}
                                                                    >
                                                                    <div className={cn(
                                                                        "flex items-center gap-3",
                                                                        cat.isSubcategory && "pl-8"
                                                                    )}>
                                                                        {cat.isSubcategory && (
                                                                            <div className="flex items-center shrink-0 trigger-hidden">
                                                                                <CornerDownRight className="h-3 w-3 text-muted-foreground/30 mr-2" />
                                                                            </div>
                                                                        )}
                                                                        
                                                                        <div 
                                                                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 group-data-[highlighted]:scale-110"
                                                                            style={{ 
                                                                                backgroundColor: `${cat.color}15`, 
                                                                                color: cat.color 
                                                                            }}
                                                                        >
                                                                            <div className="absolute inset-0 rounded-xl bg-current opacity-0 group-data-[highlighted]:opacity-10 transition-opacity" />
                                                                            <LucideIcon name={cat.icon || "Tag"} className="h-5 w-5 relative z-10" />
                                                                        </div>

                                                                        <div className="flex flex-col">
                                                                            <span className={cn(
                                                                                "tracking-tight transition-colors",
                                                                                cat.isSubcategory 
                                                                                    ? "font-black text-[10px] uppercase text-muted-foreground/50 group-data-[highlighted]:text-slate-900" 
                                                                                    : "font-black text-sm uppercase group-data-[highlighted]:text-slate-950"
                                                                            )}>
                                                                                {cat.name}
                                                                            </span>
                                                                            {!cat.isSubcategory && (
                                                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 group-data-[highlighted]:text-slate-800 -mt-0.5 trigger-hidden">Categoria Master</span>
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
                                        <FormMessage className="text-[10px] font-bold" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="account_id"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Carteira / Conta</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-12 rounded-2xl bg-muted/5 border-border/40 font-bold focus:ring-primary/20">
                                                    <div className="flex items-center gap-2">
                                                        <Wallet className="h-4 w-4 text-muted-foreground/40" />
                                                        <SelectValue placeholder="Selecione..." />
                                                    </div>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-[32px] border-border/60 shadow-2xl max-h-[450px] p-2 bg-card">
                                                <div className="flex flex-col">
                                                    <AccountFormDialog 
                                                        onSuccess={() => fetchDependencies()}
                                                        trigger={
                                                            <Button 
                                                                type="button"
                                                                variant="ghost" 
                                                                className="w-full justify-start gap-3 h-14 rounded-2xl text-primary hover:bg-primary/10 hover:text-primary transition-all font-black text-[10px] uppercase tracking-[0.1em] mb-2 group"
                                                            >
                                                                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-primary/20 group-hover:scale-110 transition-transform">
                                                                    <PlusCircle className="h-5 w-5" />
                                                                </div>
                                                                Nova Conta
                                                            </Button>
                                                        }
                                                    />

                                                    <div className="px-2 mb-2">
                                                        <Separator className="bg-muted/20" />
                                                    </div>

                                                    {["WALLET", "CHECKING", "SAVINGS", "PIGGY_BANK", "INVESTMENT"].map((type, typeIndex) => {
                                                        const groupAccounts = accounts.filter(acc => acc.is_active && acc.type === type);
                                                        if (groupAccounts.length === 0) return null;

                                                        return (
                                                            <div key={type}>
                                                                {typeIndex > 0 && accounts.some(acc => acc.is_active && ["WALLET", "CHECKING", "SAVINGS", "PIGGY_BANK", "INVESTMENT"].slice(0, typeIndex).includes(acc.type)) && (
                                                                    <div className="px-2 my-2">
                                                                        <Separator className="bg-muted/20" />
                                                                    </div>
                                                                )}
                                                                <div className="px-3 py-1 mb-1">
                                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">
                                                                        {AccountTypeLabels[type as keyof typeof AccountTypeLabels]}
                                                                    </span>
                                                                </div>
                                                                {groupAccounts.map((acc) => (
                                                                    <SelectItem 
                                                                        key={acc.id} 
                                                                        value={acc.id} 
                                                                        className="group rounded-2xl transition-all duration-300 cursor-pointer mb-1 hover:bg-muted/30 py-3"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div 
                                                                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 group-data-[highlighted]:scale-110"
                                                                                style={{ 
                                                                                    backgroundColor: `${acc.color}15`, 
                                                                                    color: acc.color 
                                                                                }}
                                                                            >
                                                                                <div className="absolute inset-0 rounded-xl bg-current opacity-0 group-data-[highlighted]:opacity-10 transition-opacity" />
                                                                                <Wallet className="h-5 w-5 relative z-10" />
                                                                            </div>

                                                                            <div className="flex flex-col text-left">
                                                                                <span className="font-black text-sm uppercase tracking-tight group-data-[highlighted]:text-slate-950 transition-colors">
                                                                                    {acc.name}
                                                                                </span>
                                                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 group-data-[highlighted]:text-slate-800 -mt-0.5">
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
                                        <FormMessage className="text-[10px] font-bold" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="tags"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Tags Interativas</FormLabel>
                                    <FormControl>
                                        <TagSelector 
                                            selectedTagIds={field.value} 
                                            onChange={field.onChange} 
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-bold" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Seção 3: Planejamento / Recorrência */}
                        <div className="space-y-5">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-4 rounded-full", isIncome ? "bg-emerald-500" : "bg-rose-500")} />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Fluxo e Recorrência</h3>
                            </div>

                            {/* Recurring Update Scope - only show when editing a recurring transaction */}
                            {initialData?.recurring_source && (
                                <div className="space-y-3 p-5 rounded-[28px] bg-amber-500/10 border border-amber-500/20 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-amber-500" />
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-amber-600">Impacto da Edição</Label>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 bg-background/50 p-3 rounded-2xl border border-amber-500/10">
                                        <Label className="text-xs font-bold opacity-70">Série recorrente:</Label>
                                        <Select value={updateScope} onValueChange={(val: any) => setUpdateScope(val)}>
                                            <SelectTrigger className="h-9 w-[160px] rounded-xl bg-background border-none shadow-sm font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl shadow-xl border-border/40">
                                                <SelectItem value="SINGLE" className="rounded-xl text-xs font-bold">Lançamento único</SelectItem>
                                                <SelectItem value="ALL" className="rounded-xl text-xs font-bold">Toda a série</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {!initialData?.recurring_source && (
                                <div className={cn(
                                    "flex flex-col gap-5 p-6 rounded-[32px] transition-all duration-500 border",
                                    form.watch("is_recurring") 
                                        ? "bg-violet-600/5 border-violet-500/20 shadow-lg shadow-violet-500/5 ring-4 ring-violet-500/5" 
                                        : "bg-muted/5 border-border/20"
                                )}>
                                    <FormField
                                        control={form.control}
                                        name="is_recurring"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border",
                                                            field.value 
                                                                ? "bg-violet-600 text-white shadow-xl shadow-violet-500/40 border-violet-400/20" 
                                                                : "bg-muted-foreground/5 text-muted-foreground/70 border-muted-foreground/10"
                                                        )}>
                                                            <Repeat className={cn("h-5 w-5", field.value && "animate-spin-slow")} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <FormLabel className="font-black tracking-tight text-sm cursor-pointer">Planejamento Recorrente</FormLabel>
                                                            <p className="text-[10px] text-muted-foreground/50 font-medium">Repita este lançamento automaticamente.</p>
                                                        </div>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                            className="data-[state=checked]:bg-violet-600 data-[state=unchecked]:bg-slate-900/50 border border-transparent data-[state=unchecked]:border-white/5 shadow-inner transition-all duration-300"
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
                                                <FormItem className="animate-in slide-in-from-top-4 duration-500 pt-1">
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-11 rounded-2xl bg-background border-violet-500/10 font-bold focus:ring-violet-500/20">
                                                                <SelectValue placeholder="Qual a periodicidade?" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="rounded-2xl border-violet-500/10 shadow-2xl">
                                                            <SelectItem value="DAILY" className="rounded-xl font-bold">Diariamente</SelectItem>
                                                            <SelectItem value="WEEKLY" className="rounded-xl font-bold">Semanalmente</SelectItem>
                                                            <SelectItem value="MONTHLY" className="rounded-xl font-bold">Mensalmente</SelectItem>
                                                            <SelectItem value="YEARLY" className="rounded-xl font-bold">Anualmente</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-8">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => onOpenChange(false)}
                                className="h-14 px-8 rounded-full font-bold text-muted-foreground hover:bg-muted"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={isLoading}
                                className={cn(
                                    "h-14 px-12 rounded-full font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all group overflow-hidden relative",
                                    isIncome ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-rose-500 text-white shadow-rose-500/20"
                                )}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <Sparkles className="mr-2 h-5 w-5" />
                                )}
                                {initialData ? "Salvar Lançamento" : `Adicionar ${isIncome ? "Receita" : "Despesa"}`}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </div>
        </ScrollArea>
      </DialogContent>

      {/* Modal Secundário: Nova Categoria */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
          <ScrollArea className="max-h-[85vh]">
            <div className="p-8">
                <DialogHeader className="mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm ring-1 ring-primary/20">
                            <PlusCircle className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col">
                            <DialogTitle className="text-2xl font-black tracking-tight">Nova Categoria</DialogTitle>
                            <DialogDescription className="text-xs font-bold opacity-50 tracking-tight">Crie uma categoria personalizada agora mesmo.</DialogDescription>
                        </div>
                    </div>
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
