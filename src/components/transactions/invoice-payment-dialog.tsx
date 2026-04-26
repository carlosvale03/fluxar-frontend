"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Loader2, Receipt, AlertCircle, Sparkles, CreditCard as CardIcon, ArrowRight, Wallet, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MoneyInput } from "@/components/ui/money-input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

import { Button } from "@/components/ui/button"
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

import { api } from "@/services/apiClient"
import { Account } from "@/types/accounts"
import { CreditCard, Invoice } from "@/types/cards"

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que 0."),
  date: z.date(),
  account_id: z.string().min(1, "Selecione a conta de pagamento."),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface InvoicePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  // New props for handling specific invoice payment
  invoiceId?: string
  initialAmount?: number
}

export function InvoicePaymentDialog({ open, onOpenChange, onSuccess, invoiceId: propInvoiceId, initialAmount }: InvoicePaymentDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cards, setCards] = useState<CreditCard[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  
  const [selectedCardId, setSelectedCardId] = useState<string>("")
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("")
  const [selectedCardObject, setSelectedCardObject] = useState<CreditCard | null>(null)
  const [selectedInvoiceObject, setSelectedInvoiceObject] = useState<Invoice | null>(null)
  
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      amount: 0,
      date: new Date(),
      account_id: "",
      description: "Pagamento de Fatura",
    },
  })
  
  // Refactored initialization to avoid race conditions
  useEffect(() => {
    if (open) {
        const initialize = async () => {
            setIsLoading(true)
            try {
                // 1. Fetch accounts first
                const accountsResponse = await api.get("/accounts/")
                const accountsData = accountsResponse.data.results || accountsResponse.data || []
                setAccounts(accountsData)
                
                // 2. Reset form to defaults
                form.reset({
                    amount: initialAmount || 0,
                    date: new Date(),
                    account_id: "",
                    description: "Pagamento de Fatura",
                })
                setSelectedCardId("")
                setSelectedInvoiceId("")
                setSelectedInvoiceObject(null)
                setInvoices([])

                // 3. Handle specific invoice or general cards
                if (propInvoiceId) {
                    const invoiceRes = await api.get(`/invoices/${propInvoiceId}/`)
                    const invoice = invoiceRes.data
                    setSelectedInvoiceObject(invoice)
                    
                    if (invoice.credit_card_id) {
                        const cardRes = await api.get(`/credit-cards/${invoice.credit_card_id}/`)
                        const cardData = cardRes.data
                        if (cardData.account_id) {
                            form.setValue('account_id', cardData.account_id)
                        }
                    }
                } else {
                    const cardsResponse = await api.get("/credit-cards/")
                    setCards(cardsResponse.data.results || cardsResponse.data || [])
                }
            } catch (error) {
                console.error("Initialization failed", error)
                toast.error("Erro ao carregar dados do pagamento.")
            } finally {
                setIsLoading(false)
            }
        }
        
        initialize()
    }
  }, [open, propInvoiceId, initialAmount, form])

  // Keeps account synced when manually choosing a card
  useEffect(() => {
      if (selectedCardId && cards.length > 0) {
          const card = cards.find(c => c.id === selectedCardId)
          if (card) {
              setSelectedCardObject(card)
              if (card.account_id) {
                  form.setValue('account_id', card.account_id)
              }
              fetchInvoices(card.id)
          }
      }
  }, [selectedCardId, cards, form])

  const fetchInvoices = async (cardId: string) => {
      try {
          // Fetch invoices for the specific card
          const response = await api.get(`/credit-cards/${cardId}/invoices/`)
          const allInvoices = response.data.results || response.data || []
          
          // Client-side filtering to ensure PAID invoices are excluded
          // We only want OPEN, OVERDUE, or CLOSED (if not fully paid)
          const payableInvoices = allInvoices.filter((inv: any) => inv.status !== 'PAID')
          
          setInvoices(payableInvoices)
      } catch (error) {
          console.error("Failed to fetch invoices", error)
      }
  }

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    try {
      const payload = {
          amount: data.amount,
          account_id: data.account_id,
          date: format(data.date, "yyyy-MM-dd"),
      }
      
      const targetInvoiceId = propInvoiceId || selectedInvoiceId
      
      let response
      if (targetInvoiceId) {
          response = await api.post(`/invoices/${targetInvoiceId}/pay/`, payload)
      } else {
           // Fallback generic payment
           response = await api.post("/transactions/", {
              ...payload, 
              description: data.description,
              type: "INVOICE_PAYMENT"
           })
      }

      toast.success("Pagamento registrado!")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error submitting invoice payment:", error)
      toast.error("Erro ao registrar pagamento.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px] bg-background">
        <ScrollArea className="max-h-[95vh]">
            <div className="p-8">
                <DialogHeader className="mb-10">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-[24px] flex items-center justify-center bg-purple-500 text-white shadow-xl shadow-purple-500/20 ring-4 ring-black/5 dark:ring-white/5 animate-in zoom-in-50 duration-500">
                            <Receipt className="h-8 w-8" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <DialogTitle className="text-3xl font-black tracking-tighter bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                                Liquidar Fatura
                            </DialogTitle>
                            <DialogDescription className="text-xs font-bold text-muted-foreground/60 uppercase tracking-[0.1em]">
                                Baixa financeira de cartão de crédito
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                
                <Form {...form}>
                    <form 
                        onSubmit={form.handleSubmit(onSubmit, (err) => console.error("Invoice Payment Validation Errors:", err))} 
                        className="space-y-8"
                    >
                        {/* Seção 1: Origem e Valor */}
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Fluxo de Saída</h3>
                                </div>
                                <div className="px-3 py-1 rounded-full bg-purple-500/10 text-[9px] font-black text-purple-600 uppercase tracking-widest">
                                    Pagamento Direto
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 p-6 rounded-[28px] bg-muted/5 border border-border/40 backdrop-blur-sm">
                                <FormField
                                    control={form.control}
                                    name="account_id"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Pagar com a Conta</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-12 rounded-2xl bg-card border-border/40 font-bold focus:ring-primary/20">
                                                        <SelectValue placeholder="Selecione a conta..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                                                    {accounts.map((acc) => (
                                                        <SelectItem key={acc.id} value={acc.id} className="rounded-xl">
                                                            <div className="flex items-center gap-2">
                                                                <div 
                                                                    className="w-2.5 h-2.5 rounded-full ring-2 ring-black/5" 
                                                                    style={{ backgroundColor: acc.color || "#ccc" }} 
                                                                />
                                                                <span className="font-black tracking-tight">{acc.name}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-[10px] font-bold" />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Valor do Pagamento</FormLabel>
                                                <FormControl>
                                                    <div className="relative group">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground/30 group-focus-within:text-purple-500 transition-colors">R$</span>
                                                        <MoneyInput 
                                                            value={field.value}
                                                            onValueChange={field.onChange}
                                                            className="h-14 pl-10 bg-card border-border/40 rounded-2xl focus-visible:ring-purple-500/20 font-black text-xl tracking-tighter"
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
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Data Efetivada</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    "h-14 w-full pl-4 text-left font-black text-sm rounded-2xl border-border/40 bg-card hover:bg-muted/50 transition-all",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? format(field.value, "dd/MM/yyyy") : "Selecionar..."}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-40" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden shadow-2xl border-border/40" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            initialFocus
                                                            locale={ptBR}
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

                        {/* Seção 2: Detalhes da Fatura */}
                        <div className="space-y-5">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Destino do Pagamento</h3>
                            </div>

                            {selectedInvoiceObject && propInvoiceId ? (
                                <div className="p-6 rounded-[28px] border border-purple-500/20 bg-purple-500/[0.02] space-y-4 animate-in zoom-in-95 duration-500">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                                                    <Receipt className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Fatura de Referência</p>
                                                    <p className="text-xs font-black tracking-tight">
                                                        {format(new Date(selectedInvoiceObject.due_date), "MMMM 'de' yyyy", { locale: ptBR })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {selectedInvoiceObject.status === 'OVERDUE' ? (
                                                <Badge variant="destructive" className="rounded-full px-3 py-0 text-[9px] font-black uppercase">Vencida</Badge>
                                            ) : selectedInvoiceObject.status === 'CLOSED' ? (
                                                <Badge className="rounded-full px-3 py-0 text-[9px] font-black uppercase bg-amber-500/10 text-amber-600 border-none">Fechada</Badge>
                                            ) : (
                                                <Badge className="rounded-full px-3 py-0 text-[9px] font-black uppercase text-blue-600 bg-blue-500/5 border-none">Aberta</Badge>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-purple-500/5">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Vencimento</p>
                                            <p className="text-xs font-black tracking-tight">{format(new Date(selectedInvoiceObject.due_date), "dd/MM/yyyy")}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Total Previsto</p>
                                            <p className="text-sm font-black text-purple-600">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(selectedInvoiceObject.total_amount))}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : propInvoiceId ? (
                                <div className="h-24 w-full rounded-[28px] bg-muted/5 animate-pulse border border-border/20 flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/20" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 p-6 rounded-[28px] bg-muted/5 border border-border/20 group hover:border-purple-500/20 transition-all duration-500 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                            <CardIcon className="h-24 w-24 -rotate-12 translate-x-8 translate-y-4" />
                                        </div>
                                        
                                        <div className="space-y-4 relative z-10">
                                            <div className="space-y-2">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Cartão de Origem</FormLabel>
                                                <Select onValueChange={setSelectedCardId} value={selectedCardId}>
                                                    <SelectTrigger className="h-12 rounded-2xl bg-card border-border/40 font-black tracking-tight focus:ring-purple-500/20">
                                                        <SelectValue placeholder="Escolher cartão..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                                                        {cards.map((card) => (
                                                            <SelectItem key={card.id} value={card.id} className="rounded-xl font-bold">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color || "#6366f1" }} />
                                                                    {card.name}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {selectedCardId && (
                                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Fatura de Referência</FormLabel>
                                                    <Select onValueChange={(val) => {
                                                        setSelectedInvoiceId(val)
                                                        const inv = invoices.find(i => i.id === val)
                                                        if (inv) {
                                                            setSelectedInvoiceObject(inv)
                                                            form.setValue('amount', Number(inv.total_amount))
                                                            const monthName = format(new Date(inv.due_date), "MMMM", { locale: ptBR })
                                                            const formattedDate = monthName.charAt(0).toUpperCase() + monthName.slice(1) + format(new Date(inv.due_date), "/yyyy")
                                                            form.setValue('description', `Fatura ${formattedDate}`)
                                                        }
                                                    }} value={selectedInvoiceId}>
                                                        <SelectTrigger className="h-12 rounded-2xl bg-card border-border/40 font-black tracking-tight focus:ring-purple-500/20">
                                                            <SelectValue placeholder="Selecionar mês..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-border/40 shadow-2xl max-h-[250px]">
                                                            {invoices.length === 0 ? (
                                                                <SelectItem value="none" disabled className="text-xs opacity-50 italic">Nenhuma fatura disponível</SelectItem>
                                                            ) : (
                                                                invoices.map((inv) => {
                                                                    const date = new Date(inv.due_date)
                                                                    const month = format(date, "MMMM", { locale: ptBR })
                                                                    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
                                                                    const year = format(date, "yyyy")
                                                                    
                                                                    return (
                                                                        <SelectItem key={inv.id} value={inv.id} className="rounded-xl">
                                                                            <div className="flex items-center justify-between w-full min-w-[200px]">
                                                                                <span className="font-black tracking-tight">{capitalizedMonth} {year}</span>
                                                                                <span className="text-[10px] font-black text-purple-600 ml-4 bg-purple-500/5 px-2 py-1 rounded-lg">
                                                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(inv.total_amount))}
                                                                                </span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    )
                                                                })
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {selectedInvoiceObject && (
                                        <div className="p-6 rounded-[28px] border border-border/40 bg-card/50 shadow-sm space-y-6 animate-in zoom-in-95 duration-500">
                                            <div className="flex items-center justify-between border-b border-border/10 pb-4">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Fatura de Referência</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                                                            <Receipt className="h-4 w-4" />
                                                        </div>
                                                        <p className="text-sm font-black tracking-tight">
                                                            {format(new Date(selectedInvoiceObject.due_date), "MMMM 'de' yyyy", { locale: ptBR })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pr-1">Situação</p>
                                                    {selectedInvoiceObject.status === 'OVERDUE' ? (
                                                        <Badge variant="destructive" className="rounded-full px-3 py-0 text-[9px] font-black uppercase tracking-tighter">Vencida</Badge>
                                                    ) : selectedInvoiceObject.status === 'CLOSED' ? (
                                                        <Badge variant="secondary" className="rounded-full px-3 py-0 text-[9px] font-black uppercase tracking-tighter bg-amber-500/10 text-amber-600 border-none">Fechada</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="rounded-full px-3 py-0 text-[9px] font-black uppercase tracking-tighter text-blue-600 bg-blue-500/5 border-none">Aberta</Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Vencimento</p>
                                                    <span className="text-xs font-black tracking-tight">{format(new Date(selectedInvoiceObject.due_date), "dd/MM/yyyy")}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Total Devido</p>
                                                    <p className="text-xl font-black tracking-tighter text-purple-600">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(selectedInvoiceObject.total_amount))}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="pt-2">
                                                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5 px-1">
                                                    <span>Progresso de Quitação</span>
                                                    <span>{Math.round((form.watch('amount') / Number(selectedInvoiceObject.total_amount)) * 100)}%</span>
                                                </div>
                                                <Progress value={(form.watch('amount') / Number(selectedInvoiceObject.total_amount)) * 100} className="h-1.5 bg-muted/50 rounded-full overflow-hidden [&>div]:bg-purple-500" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Memo / Descrição Opcional</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="Ex: Quitação parcial da fatura..." 
                                            {...field} 
                                            className="h-12 px-4 bg-muted/5 border-border/40 rounded-2xl focus-visible:ring-primary/20 transition-all font-bold tracking-tight"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-bold" />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-6 border-t border-border/10">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => onOpenChange(false)}
                                className="h-14 px-8 rounded-full font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground hover:bg-muted/50 transition-all"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={isLoading}
                                className="h-14 px-12 rounded-full bg-purple-600 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-purple-500/20 hover:shadow-2xl hover:shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="mr-2 h-4 w-4" />
                                )}
                                Confirmar Baixa
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
